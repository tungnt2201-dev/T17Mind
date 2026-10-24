import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import {
  AddBoundaryCommand,
  AddChildCommand,
  DeleteNodeCommand,
  MergeMapCommand,
  ToggleCollapseCommand,
  UpdateBoundaryCommand,
} from "./commands";
import { BOUNDARY_LIMITS, defaultVisual, effectiveVisual, normalizeVisual, resolveBoundaryMembers } from "./boundaryVisual";
import { migrateToLatest } from "./migrate";
import { validateMindMap } from "./validate";
import type { MindMap } from "./types";

/** Gốc → A (A1, A2 (A2x)), B (B1). */
function setup() {
  const store = new Store(createEmptyMap("Gốc"));
  const m = store.getMap();
  const add = (parentId: string, text: string): string => {
    const c = new AddChildCommand(parentId, text);
    store.dispatch(c);
    return c.newNodeId;
  };
  const a = add(m.rootId, "A");
  const b = add(m.rootId, "B");
  const a1 = add(a, "A1");
  const a2 = add(a, "A2");
  const a2x = add(a2, "A2x");
  const b1 = add(b, "B1");
  return { store, m, a, b, a1, a2, a2x, b1 };
}

describe("Nhóm trực quan — tuỳ chọn hiển thị (AB1)", () => {
  it("mặc định theo chế độ; chuẩn hoá kẹp giá trị, bỏ giá trị sai", () => {
    expect(defaultVisual().mode).toBe("multiContour");
    expect(defaultVisual("rectangle").fillOpacity).toBe(1);
    expect(normalizeVisual(undefined)).toBeUndefined();
    expect(normalizeVisual("x")).toBeUndefined();
    const n = normalizeVisual({ mode: "distributed", padding: 1e6, connectionGap: -5, smoothness: 7, fillOpacity: NaN, showConnectors: "yes" })!;
    expect(n.mode).toBe("distributed");
    expect(n.padding).toBe(BOUNDARY_LIMITS.padding.max);
    expect(n.connectionGap).toBe(BOUNDARY_LIMITS.connectionGap.min);
    expect(n.smoothness).toBe(1);
    expect(n.fillOpacity).toBe(defaultVisual("distributed").fillOpacity);
    expect(n.showConnectors).toBe(false);
    expect(normalizeVisual({ mode: "lạ" })!.mode).toBe("rectangle");
  });

  it("nhóm cũ (không có visual) là hình chữ nhật như trước", () => {
    expect(effectiveVisual({}).mode).toBe("rectangle");
    expect(effectiveVisual({ visual: defaultVisual() }).mode).toBe("multiContour");
  });
});

describe("Thành viên logic ↔ cách hiện khi thu gọn (AB1)", () => {
  it("chưa thu gọn: mọi thành viên đang hiện, không có đại diện; id không còn tồn tại bị bỏ qua", () => {
    const { m, a1, b1 } = setup();
    const r = resolveBoundaryMembers(m, { nodeIds: [a1, b1, "khong-co"] });
    expect(r.visible.map((n) => n.id)).toEqual([a1, b1]);
    expect(r.proxies).toEqual([]);
    expect(r.total).toBe(2);
  });

  it("thu gọn nhánh chứa MỘT PHẦN thành viên: phần ẩn quy về đại diện kèm số lượng, phần còn lại vẫn hiện", () => {
    const { store, m, a, a1, a2, b1 } = setup();
    store.dispatch(new ToggleCollapseCommand(a));
    const r = resolveBoundaryMembers(m, { nodeIds: [a1, a2, b1] });
    expect(r.visible.map((n) => n.id)).toEqual([b1]);
    expect(r.proxies).toEqual([{ representativeId: a, hiddenCount: 2, representativeIsMember: false }]);
    expect(r.total).toBe(3); // nodeIds không đổi — thành viên logic còn nguyên
  });

  it("đại diện cũng là thành viên: vừa hiện vừa có đại diện báo số ẩn", () => {
    const { store, m, a, a1 } = setup();
    store.dispatch(new ToggleCollapseCommand(a));
    const r = resolveBoundaryMembers(m, { nodeIds: [a, a1] });
    expect(r.visible.map((n) => n.id)).toEqual([a]);
    expect(r.proxies).toEqual([{ representativeId: a, hiddenCount: 1, representativeIsMember: true }]);
  });

  it("mọi thành viên đều ẩn: không còn vùng nhưng vẫn có đại diện (nhóm không biến mất)", () => {
    const { store, m, a, a1, a2, a2x } = setup();
    store.dispatch(new ToggleCollapseCommand(a));
    const r = resolveBoundaryMembers(m, { nodeIds: [a1, a2, a2x] });
    expect(r.visible).toEqual([]);
    expect(r.proxies).toEqual([{ representativeId: a, hiddenCount: 3, representativeIsMember: false }]);
  });

  it("thu gọn lồng nhau: đại diện là tổ tiên thu gọn CAO NHẤT; hai nhánh xa nhau cho hai đại diện", () => {
    const { store, m, a, a2, a2x, b, b1 } = setup();
    store.dispatch(new ToggleCollapseCommand(a2));
    expect(resolveBoundaryMembers(m, { nodeIds: [a2x] }).proxies[0]!.representativeId).toBe(a2);
    store.dispatch(new ToggleCollapseCommand(a));
    store.dispatch(new ToggleCollapseCommand(b));
    const r = resolveBoundaryMembers(m, { nodeIds: [a2x, b1] });
    expect(r.proxies.map((p) => [p.representativeId, p.hiddenCount]).sort()).toEqual([[a, 1], [b, 1]].sort());
  });

  it("mở lại (hoàn tác) thì thành viên hiện trở lại", () => {
    const { store, a, a1 } = setup();
    store.dispatch(new ToggleCollapseCommand(a));
    store.undo();
    const r = resolveBoundaryMembers(store.getMap(), { nodeIds: [a1] });
    expect(r.visible.map((n) => n.id)).toEqual([a1]);
    expect(r.proxies).toEqual([]);
  });
});

describe("Command nhóm trực quan (AB1)", () => {
  it("nhóm tạo mới có chế độ E; nhóm không truyền visual giữ dạng cũ", () => {
    const { store, m, a1, b1 } = setup();
    const withE = new AddBoundaryCommand([a1, b1], "E", defaultVisual());
    const legacy = new AddBoundaryCommand([a1], "Cũ");
    store.dispatch(withE);
    store.dispatch(legacy);
    expect(m.boundaries.find((b) => b.id === withE.newBoundaryId)!.visual!.mode).toBe("multiContour");
    expect(m.boundaries.find((b) => b.id === legacy.newBoundaryId)!.visual).toBeUndefined();
  });

  it("Rectangle → E → F → E: giữ nguyên id, thành viên, nhãn, màu; undo/redo từng bước", () => {
    const { store, m, a1, b1 } = setup();
    const add = new AddBoundaryCommand([a1, b1], "Nhóm");
    store.dispatch(add);
    const id = add.newBoundaryId;
    const snapshot = () => {
      const b = m.boundaries.find((x) => x.id === id)!;
      return { nodeIds: [...b.nodeIds], label: b.label, fill: b.fillColor, border: b.borderColor, mode: b.visual?.mode };
    };
    const start = snapshot();
    store.dispatch(new UpdateBoundaryCommand(id, { visual: defaultVisual("multiContour") }));
    store.dispatch(new UpdateBoundaryCommand(id, { visual: { ...defaultVisual("distributed"), padding: 30 } }));
    store.dispatch(new UpdateBoundaryCommand(id, { visual: defaultVisual("multiContour") }));
    const end = snapshot();
    expect({ ...end, mode: undefined }).toEqual({ ...start, mode: undefined });
    expect(end.mode).toBe("multiContour");
    store.undo();
    expect(snapshot().mode).toBe("distributed");
    expect(m.boundaries[0]!.visual!.padding).toBe(30);
    store.undo();
    store.undo();
    expect(snapshot()).toEqual(start); // visual trở lại "không có"
    expect("visual" in m.boundaries[0]!).toBe(false);
    store.redo();
    expect(snapshot().mode).toBe("multiContour");
  });

  it("sửa tuỳ chọn luôn bị kẹp vào khoảng hợp lệ", () => {
    const { store, m, a1 } = setup();
    const add = new AddBoundaryCommand([a1], "N", defaultVisual());
    store.dispatch(add);
    store.dispatch(new UpdateBoundaryCommand(add.newBoundaryId, { visual: { ...defaultVisual(), padding: 9999, fillOpacity: 0 } }));
    expect(m.boundaries[0]!.visual!.padding).toBe(BOUNDARY_LIMITS.padding.max);
    expect(m.boundaries[0]!.visual!.fillOpacity).toBe(BOUNDARY_LIMITS.fillOpacity.min);
  });

  it("xoá node thành viên: nhóm giữ visual, bỏ id đó; xoá hết thành viên thì nhóm biến mất; undo trả lại nguyên vẹn", () => {
    const { store, m, a1, b1 } = setup();
    const add = new AddBoundaryCommand([a1, b1], "N", defaultVisual("distributed"));
    store.dispatch(add);
    store.dispatch(new DeleteNodeCommand(a1));
    expect(m.boundaries[0]!.nodeIds).toEqual([b1]);
    expect(m.boundaries[0]!.visual!.mode).toBe("distributed");
    store.undo();
    expect(store.getMap().boundaries[0]!.nodeIds).toEqual([a1, b1]);
    expect(store.getMap().boundaries[0]!.visual!.mode).toBe("distributed");
  });

  it("ghép map: nhóm của map nhập vào mang theo visual, id thành viên được đổi theo", () => {
    const { store, m } = setup();
    const other = createEmptyMap("Khác");
    const c = createNode("Con", other.rootId);
    other.nodes[c.id] = c;
    other.nodes[other.rootId]!.children.push(c.id);
    other.boundaries.push({ id: "b_x", nodeIds: [c.id], label: "Nhóm khách", fillColor: null, borderColor: null, visual: defaultVisual("distributed") });
    store.dispatch(new MergeMapCommand(other));
    const merged = m.boundaries.find((b) => b.label === "Nhóm khách")!;
    expect(merged.visual!.mode).toBe("distributed");
    expect(merged.nodeIds[0]).not.toBe(c.id);
    expect(m.nodes[merged.nodeIds[0]!]!.text).toBe("Con");
  });
});

describe("Nhóm trực quan — lưu/mở file (AB1)", () => {
  const roundTrip = (m: MindMap): MindMap => migrateToLatest(JSON.parse(JSON.stringify(m)) as Record<string, unknown>);

  it("mở file cũ không có visual: vẫn hợp lệ, vẫn hình chữ nhật", () => {
    const { m, a1 } = setup();
    m.boundaries.push({ id: "b1", nodeIds: [a1], label: "Cũ", fillColor: null, borderColor: null });
    const back = roundTrip(m);
    expect(validateMindMap(back)).toEqual([]);
    expect(effectiveVisual(back.boundaries[0]!).mode).toBe("rectangle");
    expect(back.boundaries[0]!.visual).toBeUndefined();
  });

  it("file mới đóng/mở lại giữ chế độ và thông số; thông số hỏng bị làm sạch, không làm hỏng file", () => {
    const { m, a1, b1 } = setup();
    m.boundaries.push({ id: "b1", nodeIds: [a1, b1], label: "Mới", fillColor: null, borderColor: null, visual: { ...defaultVisual(), padding: 40 } });
    m.boundaries.push({ id: "b2", nodeIds: [a1], label: "Hỏng", fillColor: null, borderColor: null, visual: { mode: "multiContour", padding: "rộng" } as never });
    m.boundaries.push({ id: "b3", nodeIds: [a1], label: "Rác", fillColor: null, borderColor: null, visual: 5 as never });
    const back = roundTrip(m);
    expect(validateMindMap(back)).toEqual([]);
    expect(back.boundaries[0]!.visual).toEqual({ ...defaultVisual(), padding: 40 });
    expect(back.boundaries[1]!.visual!.padding).toBe(24); // sai kiểu → mặc định
    expect(back.boundaries[2]!.visual).toBeUndefined();
    expect(back.nodes).toBeTruthy();
  });

  it("validate báo lỗi khi visual không hợp lệ (đưa thẳng vào bộ nhớ, không qua làm sạch)", () => {
    const { m, a1 } = setup();
    m.boundaries.push({ id: "b1", nodeIds: [a1], label: "x", fillColor: null, borderColor: null, visual: 7 as never });
    expect(validateMindMap(m).some((e) => e.includes("visual"))).toBe(true);
  });
});
