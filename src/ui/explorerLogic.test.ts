import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { Store } from "../core/store";
import { AddTagCommand, ToggleNodeTagCommand } from "../core/commands";
import { computeFilterVisibleIds, nodeMatchesFilter } from "./explorerLogic";
import type { MindMap, MindNode } from "../core/types";

/** Dựng cây dùng chung cho cả file:
 *  Gốc -> A (Tag "Gấp") -> A1 (không Tag)
 *      -> B (Tag "Quan trọng") -> B1 (CẢ 2 Tag)
 *      -> C (không Tag gì) */
function buildFixture() {
  const map: MindMap = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;
  const a = createNode("Việc A", root.id);
  map.nodes[a.id] = a;
  root.children.push(a.id);
  const a1 = createNode("Con của A", a.id);
  map.nodes[a1.id] = a1;
  a.children.push(a1.id);
  const b = createNode("Việc B", root.id);
  map.nodes[b.id] = b;
  root.children.push(b.id);
  const b1 = createNode("Con của B", b.id);
  map.nodes[b1.id] = b1;
  b.children.push(b1.id);
  const c = createNode("Việc C không liên quan", root.id);
  map.nodes[c.id] = c;
  root.children.push(c.id);

  const store = new Store(map);
  const tagGap = new AddTagCommand("Gấp", "#d64545");
  store.dispatch(tagGap);
  const tagQuanTrong = new AddTagCommand("Quan trọng", "#2f6fed");
  store.dispatch(tagQuanTrong);
  store.dispatch(new ToggleNodeTagCommand(a.id, tagGap.newTagId));
  store.dispatch(new ToggleNodeTagCommand(b.id, tagQuanTrong.newTagId));
  store.dispatch(new ToggleNodeTagCommand(b1.id, tagGap.newTagId));
  store.dispatch(new ToggleNodeTagCommand(b1.id, tagQuanTrong.newTagId));

  return { map: store.getMap(), ids: { root: root.id, a: a.id, a1: a1.id, b: b.id, b1: b1.id, c: c.id }, tagGap, tagQuanTrong };
}

describe("explorerLogic — computeFilterVisibleIds / nodeMatchesFilter (P1.14)", () => {
  it("không có bộ lọc nào -> trả về null", () => {
    const { map } = buildFixture();
    expect(computeFilterVisibleIds(map, "", new Set(), "or")).toBeNull();
  });

  it("lọc theo chữ giữ đúng đường dẫn tổ tiên, không mất ngữ cảnh cấu trúc", () => {
    const { map, ids } = buildFixture();
    const visible = computeFilterVisibleIds(map, "con của a", new Set(), "or")!;
    expect(visible.has(ids.a1)).toBe(true); // khớp trực tiếp
    expect(visible.has(ids.a)).toBe(true); // tổ tiên — giữ đường dẫn
    expect(visible.has(ids.root)).toBe(true); // tới tận gốc
    expect(visible.has(ids.b)).toBe(false);
    expect(visible.has(ids.c)).toBe(false);
  });

  it("lọc Tag OR — node có ÍT NHẤT MỘT trong các Tag đã chọn", () => {
    const { map, ids, tagGap, tagQuanTrong } = buildFixture();
    const visible = computeFilterVisibleIds(map, "", new Set([tagGap.newTagId, tagQuanTrong.newTagId]), "or")!;
    expect(visible.has(ids.a)).toBe(true); // chỉ có Gấp
    expect(visible.has(ids.b)).toBe(true); // chỉ có Quan trọng
    expect(visible.has(ids.c)).toBe(false); // không Tag nào
  });

  it("lọc Tag AND — node phải có ĐỦ TẤT CẢ Tag đã chọn", () => {
    const { map, ids, tagGap, tagQuanTrong } = buildFixture();
    const selected = new Set([tagGap.newTagId, tagQuanTrong.newTagId]);
    const bNode = map.nodes[ids.b] as MindNode;
    const b1Node = map.nodes[ids.b1] as MindNode;

    expect(nodeMatchesFilter(bNode, "", selected, "and")).toBe(false); // chỉ có 1 trong 2
    expect(nodeMatchesFilter(b1Node, "", selected, "and")).toBe(true); // có đủ cả 2

    const visible = computeFilterVisibleIds(map, "", selected, "and")!;
    expect(visible.has(ids.b1)).toBe(true);
    expect(visible.has(ids.b)).toBe(true); // tổ tiên của B1 — giữ đường dẫn dù CHÍNH B không đủ AND
    expect(visible.has(ids.a)).toBe(false); // không đủ AND, không có hậu duệ nào đủ AND
  });
});
