import { describe, expect, it } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import { AddTagCommand, ToggleNodeTagCommand } from "./commands";
import { AddTagFieldCommand, RemoveTagFieldCommand, SetFieldValueCommand, UpdateTagFieldCommand, makeOptions } from "./tagDbCommands";
import {
  NAME_KEY,
  aggregateForChart,
  applyFilters,
  displayValue,
  fieldsForNode,
  findField,
  groupByAny,
  groupByField,
  normalizeFieldValue,
  opsFor,
  rowsOfTag,
  rowsToGrid,
  sortRows,
  type DbRow,
} from "./tagDb";
import { parseJsonFile, exportFlatJson } from "../io/json";
import { migrateToLatest } from "./migrate";
import type { MindMap, TagField } from "./types";

/** Gốc → 5 việc; 4 việc mang Tag "Việc". Trả về store và id các thứ cần dùng. */
function setup() {
  const map = createEmptyMap("Dự án");
  const ids: string[] = [];
  for (const text of ["Thiết kế", "Code", "Test", "Họp", "Ghi chú riêng"]) {
    const n = createNode(text, map.rootId);
    map.nodes[n.id] = n;
    map.nodes[map.rootId]!.children.push(n.id);
    ids.push(n.id);
  }
  const store = new Store(map);
  const addTag = new AddTagCommand("Việc", "#2f6fed");
  store.dispatch(addTag);
  for (const id of ids.slice(0, 4)) store.dispatch(new ToggleNodeTagCommand(id, addTag.newTagId));
  const status = new AddTagFieldCommand(addTag.newTagId, "Trạng thái", "status");
  const hours = new AddTagFieldCommand(addTag.newTagId, "Giờ", "number");
  const due = new AddTagFieldCommand(addTag.newTagId, "Hạn", "date");
  const owner = new AddTagFieldCommand(addTag.newTagId, "Người làm", "text");
  [status, hours, due, owner].forEach((c) => store.dispatch(c));
  const field = (id: string): TagField => findField(store.getMap(), id)!.field;
  return { store, map, ids, tagId: addTag.newTagId, status: status.newFieldId, hours: hours.newFieldId, due: due.newFieldId, owner: owner.newFieldId, field };
}
const fieldsOf = (m: MindMap, tagId: string): TagField[] => m.tags.find((t) => t.id === tagId)!.fields ?? [];

describe("chuẩn hoá giá trị", () => {
  const f = (type: TagField["type"], options?: TagField["options"]): TagField => ({ id: "f", name: "F", type, options });
  it("số (nhận kiểu Việt/Anh), ngày, chữ, rỗng", () => {
    expect(normalizeFieldValue(f("number"), "1.234,5")).toBe("1234.5");
    expect(normalizeFieldValue(f("number"), "abc")).toBeNull();
    expect(normalizeFieldValue(f("number"), "  ")).toBe("");
    expect(normalizeFieldValue(f("date"), "2026-10-24")).toBe("2026-10-24");
    expect(normalizeFieldValue(f("date"), "24/10/2026")).toBeNull();
    expect(normalizeFieldValue(f("date"), "2026-13-45")).toBeNull();
    expect(normalizeFieldValue(f("text"), " giữ nguyên ")).toBe(" giữ nguyên ");
  });
  it("lựa chọn phải là id option có thật", () => {
    const sel = f("select", [{ id: "o1", label: "A", color: "#000" }]);
    expect(normalizeFieldValue(sel, "o1")).toBe("o1");
    expect(normalizeFieldValue(sel, "o9")).toBeNull();
  });
  it("hiển thị: nhãn option, số kiểu Việt, ngày dd/mm/yyyy", () => {
    expect(displayValue(f("number"), "1234.5")).toBe("1.234,5");
    expect(displayValue(f("date"), "2026-10-24")).toBe("24/10/2026");
    expect(displayValue(f("select", [{ id: "o1", label: "Nhãn", color: "#000" }]), "o1")).toBe("Nhãn");
    expect(displayValue(f("select", []), "ma")).toBe("");
  });
});

describe("Command thuộc tính", () => {
  it("thêm thuộc tính: Trạng thái có sẵn 3 lựa chọn; undo/redo", () => {
    const s = setup();
    expect(s.field(s.status).options!.map((o) => o.label)).toEqual(["Chưa làm", "Đang làm", "Xong"]);
    expect(fieldsOf(s.store.getMap(), s.tagId)).toHaveLength(4);
    s.store.undo();
    s.store.undo();
    s.store.undo();
    s.store.undo();
    expect(s.store.getMap().tags.find((t) => t.id === s.tagId)!.fields).toBeUndefined();
    s.store.redo();
    expect(fieldsOf(s.store.getMap(), s.tagId)).toHaveLength(1);
  });
  it("đặt giá trị cho nhiều node là MỘT bước hoàn tác; giá trị sai bị từ chối", () => {
    const s = setup();
    const m = () => s.store.getMap();
    const done = s.field(s.status).options![2]!.id;
    s.store.dispatch(new SetFieldValueCommand(s.ids.slice(0, 3), s.status, done));
    expect(s.ids.slice(0, 3).every((id) => m().nodes[id]!.fieldValues![s.status] === done)).toBe(true);
    s.store.undo();
    expect(s.ids.every((id) => m().nodes[id]!.fieldValues === undefined)).toBe(true);
    s.store.redo();
    expect(m().nodes[s.ids[0]!]!.fieldValues![s.status]).toBe(done);
    expect(() => s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.hours, "abc"))).toThrow();
    expect(() => s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, "khong-co"))).toThrow();
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, ""));
    expect(m().nodes[s.ids[0]!]!.fieldValues?.[s.status]).toBeUndefined();
    s.store.undo();
    expect(m().nodes[s.ids[0]!]!.fieldValues![s.status]).toBe(done);
  });
  it("sửa tên/lựa chọn; xoá lựa chọn làm giá trị thành 'chưa đặt'; undo trả lại", () => {
    const s = setup();
    const opts = s.field(s.status).options!;
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, opts[1]!.id));
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.status, { name: "Tình trạng", options: opts.filter((o) => o.id !== opts[1]!.id) }));
    expect(s.field(s.status).name).toBe("Tình trạng");
    const rows = rowsOfTag(s.store.getMap(), s.tagId);
    expect(groupByField(rows, s.field(s.status)).find((g) => g.key === "")!.rows.map((r) => r.nodeId)).toContain(s.ids[0]);
    s.store.undo();
    expect(s.field(s.status).name).toBe("Trạng thái");
    expect(s.field(s.status).options).toHaveLength(3);
  });
  it("xoá thuộc tính xoá luôn giá trị trên node; undo khôi phục đúng vị trí và giá trị", () => {
    const s = setup();
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!, s.ids[1]!], s.hours, "5"));
    s.store.dispatch(new SetFieldValueCommand([s.ids[1]!], s.owner, "An"));
    s.store.dispatch(new RemoveTagFieldCommand(s.tagId, s.hours));
    const m = () => s.store.getMap();
    expect(m().nodes[s.ids[0]!]!.fieldValues).toBeUndefined();
    expect(m().nodes[s.ids[1]!]!.fieldValues).toEqual({ [s.owner]: "An" });
    s.store.undo();
    expect(fieldsOf(m(), s.tagId).map((f) => f.name)).toEqual(["Trạng thái", "Giờ", "Hạn", "Người làm"]);
    expect(m().nodes[s.ids[0]!]!.fieldValues).toEqual({ [s.hours]: "5" });
    expect(m().nodes[s.ids[1]!]!.fieldValues).toEqual({ [s.hours]: "5", [s.owner]: "An" });
  });
  it("giới hạn số thuộc tính mỗi Tag", () => {
    const s = setup();
    for (let i = 0; i < 16; i++) s.store.dispatch(new AddTagFieldCommand(s.tagId, `F${i}`, "text"));
    expect(() => s.store.dispatch(new AddTagFieldCommand(s.tagId, "thừa", "text"))).toThrow();
  });
  it("fieldsForNode theo Tag của node", () => {
    const s = setup();
    expect(fieldsForNode(s.store.getMap(), s.store.getMap().nodes[s.ids[0]!]!.tagIds)).toHaveLength(4);
    expect(fieldsForNode(s.store.getMap(), s.store.getMap().nodes[s.ids[4]!]!.tagIds)).toHaveLength(0);
  });
});

describe("dòng, lọc, sắp xếp, nhóm", () => {
  function filled() {
    const s = setup();
    const [todo, doing, done] = s.field(s.status).options!.map((o) => o.id);
    const set = (i: number, f: string, v: string) => s.store.dispatch(new SetFieldValueCommand([s.ids[i]!], f, v));
    set(0, s.status, doing!); set(0, s.hours, "8"); set(0, s.due, "2026-11-02"); set(0, s.owner, "An");
    set(1, s.status, done!); set(1, s.hours, "1.000"); set(1, s.due, "2026-10-30"); set(1, s.owner, "Bình");
    set(2, s.status, todo!); set(2, s.hours, "2,5");
    // ids[3] (Họp) để trống mọi thuộc tính
    const rows = rowsOfTag(s.store.getMap(), s.tagId);
    const fields = fieldsOf(s.store.getMap(), s.tagId);
    return { ...s, rows, fields, todo: todo!, doing: doing!, done: done! };
  }
  it("chỉ lấy node mang Tag, theo thứ tự cây", () => {
    const s = filled();
    expect(s.rows.map((r) => r.name)).toEqual(["Thiết kế", "Code", "Test", "Họp"]);
  });
  it("lọc: chứa / bằng / số lớn hơn / ngày / trống / nhiều điều kiện (AND)", () => {
    const s = filled();
    const names = (rows: DbRow[]) => rows.map((r) => r.name);
    expect(names(applyFilters(s.rows, [{ key: NAME_KEY, op: "contains", value: "t" }], s.fields))).toEqual(["Thiết kế", "Test"]);
    expect(names(applyFilters(s.rows, [{ key: s.status, op: "eq", value: s.done }], s.fields))).toEqual(["Code"]);
    expect(names(applyFilters(s.rows, [{ key: s.hours, op: "gt", value: "5" }], s.fields))).toEqual(["Thiết kế", "Code"]);
    expect(names(applyFilters(s.rows, [{ key: s.hours, op: "lt", value: "5" }], s.fields))).toEqual(["Test"]);
    expect(names(applyFilters(s.rows, [{ key: s.due, op: "lt", value: "2026-11-01" }], s.fields))).toEqual(["Code"]);
    expect(names(applyFilters(s.rows, [{ key: s.owner, op: "empty", value: "" }], s.fields))).toEqual(["Test", "Họp"]);
    expect(names(applyFilters(s.rows, [{ key: s.owner, op: "notEmpty", value: "" }, { key: s.hours, op: "gt", value: "100" }], s.fields))).toEqual(["Code"]);
    expect(names(applyFilters(s.rows, [{ key: s.owner, op: "contains", value: "" }], s.fields))).toHaveLength(4); // điều kiện chưa nhập → không lọc
    expect(names(applyFilters(s.rows, [{ key: s.hours, op: "gt", value: "abc" }], s.fields))).toHaveLength(4);
  });
  it("toán tử hợp lệ theo kiểu", () => {
    expect(opsFor("number")).toContain("gt");
    expect(opsFor("select")).not.toContain("contains");
    expect(opsFor("name")).toContain("contains");
  });
  it("sắp xếp: số, ngày, lựa chọn theo thứ tự option, tên; ô trống luôn cuối; ổn định", () => {
    const s = filled();
    const names = (rows: DbRow[]) => rows.map((r) => r.name);
    expect(names(sortRows(s.rows, { key: s.hours, dir: "asc" }, s.fields))).toEqual(["Test", "Thiết kế", "Code", "Họp"]);
    expect(names(sortRows(s.rows, { key: s.hours, dir: "desc" }, s.fields))).toEqual(["Code", "Thiết kế", "Test", "Họp"]);
    expect(names(sortRows(s.rows, { key: s.due, dir: "asc" }, s.fields))).toEqual(["Code", "Thiết kế", "Test", "Họp"]);
    expect(names(sortRows(s.rows, { key: s.status, dir: "asc" }, s.fields))).toEqual(["Test", "Thiết kế", "Code", "Họp"]);
    expect(names(sortRows(s.rows, { key: NAME_KEY, dir: "desc" }, s.fields))).toEqual(["Thiết kế", "Test", "Họp", "Code"]);
    expect(sortRows(s.rows, null, s.fields)).toBe(s.rows);
  });
  it("nhóm theo trạng thái: đủ cột cả cột rỗng, 'Chưa đặt' ở cuối", () => {
    const s = filled();
    const g = groupByField(s.rows, s.field(s.status));
    expect(g.map((x) => `${x.label}:${x.rows.length}`)).toEqual(["Chưa làm:1", "Đang làm:1", "Xong:1", "Chưa đặt:1"]);
    const noUnset = groupByField(s.rows.slice(0, 3), s.field(s.status), false);
    expect(noUnset.map((x) => x.label)).toEqual(["Chưa làm", "Đang làm", "Xong"]);
  });
  it("nhóm theo cột chữ/số: theo giá trị, 'Chưa đặt' cuối", () => {
    const s = filled();
    const g = groupByAny(s.rows, s.field(s.owner));
    expect(g.map((x) => x.label)).toEqual(["An", "Bình", "Chưa đặt"]);
    expect(g[2]!.rows.map((r) => r.name)).toEqual(["Test", "Họp"]);
  });
  it("gộp số liệu cho biểu đồ: đếm, tổng, trung bình theo nhóm", () => {
    const s = filled();
    const st = s.field(s.status);
    const c = aggregateForChart(s.rows, st, { kind: "count" }, s.fields);
    expect(c.labels).toEqual(["Chưa làm", "Đang làm", "Xong", "Chưa đặt"]); // dòng chưa đặt vẫn được đếm
    expect(c.series[0]!.values).toEqual([1, 1, 1, 1]);
    const sum = aggregateForChart(s.rows, st, { kind: "sum", fieldId: s.hours }, s.fields);
    expect(sum.series[0]!.values).toEqual([2.5, 8, 1000, 0]);
    expect(sum.series[0]!.name).toBe("Tổng Giờ");
    const avg = aggregateForChart(s.rows, st, { kind: "avg", fieldId: s.owner }, s.fields);
    expect(avg.series[0]!.values).toEqual([null, null, null, null]);
  });
  it("lưới xuất CSV/Excel: tiêu đề + giá trị hiển thị", () => {
    const s = filled();
    const grid = rowsToGrid(s.rows, s.fields);
    expect(grid[0]).toEqual(["Tên node", "Trạng thái", "Giờ", "Hạn", "Người làm"]);
    expect(grid[1]).toEqual(["Thiết kế", "Đang làm", "8", "02/11/2026", "An"]);
    expect(grid[2]).toEqual(["Code", "Xong", "1.000", "30/10/2026", "Bình"]);
    expect(grid[4]).toEqual(["Họp", "", "", "", ""]);
  });
});

describe("lưu/đọc", () => {
  it("JSON round-trip giữ thuộc tính và giá trị", () => {
    const s = setup();
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.hours, "12"));
    const res = parseJsonFile(exportFlatJson(s.store.getMap()));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(fieldsOf(res.map, s.tagId)).toHaveLength(4);
    expect(res.map.nodes[s.ids[0]!]!.fieldValues).toEqual({ [s.hours]: "12" });
  });
  it("file không có thuộc tính vẫn mở như cũ (không thêm khoá lạ)", () => {
    const map = createEmptyMap("X");
    const out = migrateToLatest(JSON.parse(JSON.stringify(map)));
    expect(out.tags).toEqual([]);
    expect(Object.values(out.nodes).every((n) => n.fieldValues === undefined)).toBe(true);
  });
  it("dữ liệu hỏng bị làm sạch: thuộc tính sai kiểu/trùng id, giá trị mồ côi/sai kiểu", () => {
    const s = setup();
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.hours, "7"));
    const raw = JSON.parse(exportFlatJson(s.store.getMap()));
    const tag = raw.tags[0];
    tag.fields.push({ id: tag.fields[0].id, name: "trùng", type: "text" }); // trùng id
    tag.fields.push({ id: "x1", name: "sai kiểu", type: "bogus" });
    tag.fields.push("rác");
    raw.nodes[s.ids[0]!].fieldValues.mo_coi = "1";
    raw.nodes[s.ids[0]!].fieldValues[s.due] = "không phải ngày";
    raw.nodes[s.ids[1]!].fieldValues = "hỏng";
    const out = migrateToLatest(raw);
    expect(fieldsOf(out, tag.id)).toHaveLength(4);
    expect(out.nodes[s.ids[0]!]!.fieldValues).toEqual({ [s.hours]: "7" });
    expect(out.nodes[s.ids[1]!]!.fieldValues).toBeUndefined();
  });
  it("makeOptions gán màu xoay vòng và id riêng", () => {
    const o = makeOptions(["a", "b", "c"]);
    expect(new Set(o.map((x) => x.id)).size).toBe(3);
    expect(o[0]!.color).not.toBe(o[1]!.color);
  });
});

import { MAX_NODE_CHIPS, moveInOrder, nodeFieldChips, orderRows } from "./tagDb";
import { SetTagOrderCommand } from "./tagDbCommands";
import { CompositeCommand } from "./commands";

describe("thẻ giá trị trên node (showOnNode)", () => {
  it("chỉ hiện thuộc tính được bật và có giá trị; lựa chọn mang màu, giá trị khác thành 'Tên: giá trị'", () => {
    const s = setup();
    const done = s.field(s.status).options![2]!;
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, done.id));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.due, "2026-11-02"));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.owner, "An"));
    const node = () => s.store.getMap().nodes[s.ids[0]!]!;
    expect(nodeFieldChips(s.store.getMap(), node())).toEqual([]); // mặc định không hiện gì
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.status, { showOnNode: true }));
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.due, { showOnNode: true }));
    expect(nodeFieldChips(s.store.getMap(), node())).toEqual([
      { text: "Xong", color: done.color },
      { text: "Hạn: 02/11/2026", color: null },
    ]);
    s.store.undo();
    expect(nodeFieldChips(s.store.getMap(), node())).toHaveLength(1);
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.status, { showOnNode: false }));
    expect(s.field(s.status).showOnNode).toBeUndefined();
    expect(nodeFieldChips(s.store.getMap(), node())).toEqual([]);
  });
  it("node không có giá trị / không mang Tag thì không có thẻ; tối đa MAX_NODE_CHIPS", () => {
    const s = setup();
    for (const f of [s.status, s.hours, s.due, s.owner]) s.store.dispatch(new UpdateTagFieldCommand(s.tagId, f, { showOnNode: true }));
    expect(nodeFieldChips(s.store.getMap(), s.store.getMap().nodes[s.ids[0]!]!)).toEqual([]);
    expect(nodeFieldChips(s.store.getMap(), s.store.getMap().nodes[s.ids[4]!]!)).toEqual([]);
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.hours, "3"));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.owner, "An"));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.due, "2026-01-01"));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, s.field(s.status).options![0]!.id));
    expect(nodeFieldChips(s.store.getMap(), s.store.getMap().nodes[s.ids[0]!]!).length).toBeLessThanOrEqual(MAX_NODE_CHIPS);
  });
  it("showOnNode được giữ qua JSON và làm sạch giá trị lạ", () => {
    const s = setup();
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.hours, { showOnNode: true }));
    const raw = JSON.parse(exportFlatJson(s.store.getMap()));
    raw.tags[0].fields[0].showOnNode = "yes"; // không phải true → bỏ
    const out = migrateToLatest(raw);
    expect(fieldsOf(out, s.tagId)[0]!.showOnNode).toBeUndefined();
    expect(fieldsOf(out, s.tagId)[1]!.showOnNode).toBe(true);
  });
});

describe("thứ tự thẻ Kanban", () => {
  const rows = (...ids: string[]) => ids.map((nodeId) => ({ nodeId, name: nodeId, values: {} }));
  it("orderRows: dòng có trong order lên trước theo order, còn lại giữ thứ tự cây", () => {
    expect(orderRows(rows("a", "b", "c", "d"), ["c", "a"]).map((r) => r.nodeId)).toEqual(["c", "a", "b", "d"]);
    const same = rows("a", "b");
    expect(orderRows(same, undefined)).toBe(same);
    expect(orderRows(rows("a", "b"), ["zzz", "b"]).map((r) => r.nodeId)).toEqual(["b", "a"]);
  });
  it("moveInOrder: trước / sau một dòng / cuối", () => {
    const all = ["a", "b", "c", "d"];
    expect(moveInOrder(undefined, all, "d", { before: "b" })).toEqual(["a", "d", "b", "c"]);
    expect(moveInOrder(undefined, all, "a", { after: "c" })).toEqual(["b", "c", "a", "d"]);
    expect(moveInOrder(undefined, all, "a", null)).toEqual(["b", "c", "d", "a"]);
    expect(moveInOrder(["d", "c"], all, "a", { before: "c" })).toEqual(["d", "a", "c", "b"]);
    expect(moveInOrder(undefined, all, "b", { before: "khong-co" })).toEqual(["a", "c", "d", "b"]);
  });
  it("SetTagOrderCommand: undo trả lại, kể cả khi trước đó chưa có order; JSON giữ order, làm sạch trùng/rác", () => {
    const s = setup();
    const tag = () => s.store.getMap().tags.find((t) => t.id === s.tagId)!;
    expect(tag().order).toBeUndefined();
    s.store.dispatch(new SetTagOrderCommand(s.tagId, [s.ids[2]!, s.ids[0]!]));
    expect(tag().order).toEqual([s.ids[2], s.ids[0]]);
    s.store.dispatch(new SetTagOrderCommand(s.tagId, [s.ids[1]!]));
    s.store.undo();
    expect(tag().order).toEqual([s.ids[2], s.ids[0]]);
    s.store.undo();
    expect(tag().order).toBeUndefined();
    s.store.redo();
    const raw = JSON.parse(exportFlatJson(s.store.getMap()));
    raw.tags[0].order = [s.ids[2], s.ids[2], 5, "", s.ids[0]];
    expect(migrateToLatest(raw).tags[0]!.order).toEqual([s.ids[2], s.ids[0]]);
    raw.tags[0].order = "hỏng";
    expect(migrateToLatest(raw).tags[0]!.order).toBeUndefined();
  });
  it("kéo thẻ sang cột khác + đổi vị trí = MỘT bước hoàn tác", () => {
    const s = setup();
    const doing = s.field(s.status).options![1]!.id;
    const all = rowsOfTag(s.store.getMap(), s.tagId).map((r) => r.nodeId);
    s.store.dispatch(new SetFieldValueCommand([s.ids[1]!], s.status, doing));
    const order = moveInOrder(undefined, all, s.ids[3]!, { before: s.ids[1]! });
    s.store.dispatch(new CompositeCommand([new SetFieldValueCommand([s.ids[3]!], s.status, doing), new SetTagOrderCommand(s.tagId, order)], "Kéo thẻ Kanban"));
    const m = () => s.store.getMap();
    expect(m().nodes[s.ids[3]!]!.fieldValues![s.status]).toBe(doing);
    expect(m().tags.find((t) => t.id === s.tagId)!.order![1]).toBe(s.ids[3]);
    s.store.undo();
    expect(m().nodes[s.ids[3]!]!.fieldValues).toBeUndefined();
    expect(m().tags.find((t) => t.id === s.tagId)!.order).toBeUndefined();
    expect(m().nodes[s.ids[1]!]!.fieldValues![s.status]).toBe(doing); // bước trước đó vẫn còn
  });
});

describe("thẻ trên node theo từng Tag", () => {
  it("lọc theo tagId: mỗi thẻ thuộc đúng Tag của nó; Chọn một có tên thuộc tính, Trạng thái chỉ có giá trị", () => {
    const s = setup();
    const m = () => s.store.getMap();
    const second = new AddTagCommand("phương án", "#2bd44a");
    s.store.dispatch(second);
    s.store.dispatch(new ToggleNodeTagCommand(s.ids[0]!, second.newTagId));
    const pick = new AddTagFieldCommand(second.newTagId, "mức", "select", makeOptions(["A22", "B7"]));
    s.store.dispatch(pick);
    const done = s.field(s.status).options![2]!;
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], s.status, done.id));
    s.store.dispatch(new SetFieldValueCommand([s.ids[0]!], pick.newFieldId, m().tags.find((t) => t.id === second.newTagId)!.fields![0]!.options![0]!.id));
    s.store.dispatch(new UpdateTagFieldCommand(s.tagId, s.status, { showOnNode: true }));
    s.store.dispatch(new UpdateTagFieldCommand(second.newTagId, pick.newFieldId, { showOnNode: true }));
    const node = m().nodes[s.ids[0]!]!;
    expect(nodeFieldChips(m(), node, s.tagId).map((c) => c.text)).toEqual(["Xong"]);
    expect(nodeFieldChips(m(), node, second.newTagId).map((c) => c.text)).toEqual(["mức: A22"]);
    expect(nodeFieldChips(m(), node).map((c) => c.text)).toEqual(["Xong", "mức: A22"]);
    expect(nodeFieldChips(m(), node, "khong-co")).toEqual([]);
  });
});
