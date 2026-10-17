import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode, getAutoArrangeTargetIds } from "./tree";
import type { MindMap, MindNode } from "./types";

/**
 * P2.14 — Nút "Sắp xếp lại" (auto-arrange). Dựng một map có:
 *  - Node gốc chính (map.rootId) — offsetX/Y luôn giả định = 0 (không
 *    ai kéo trực tiếp trong test này, chỉ test loại trừ nó khỏi kết quả).
 *  - child (con trực tiếp của gốc) — bị kéo lệch (offset khác 0).
 *  - grandchild (con của child) — bị kéo lệch.
 *  - untouchedChild (con khác của gốc) — KHÔNG bị kéo (offset = 0,0).
 *  - floatRoot (nhánh trôi độc lập) — offset khác 0,0 (vị trí neo trên
 *    canvas, KHÔNG được xem là "đã kéo lệch cần dọn").
 *  - floatChild (con của floatRoot) — bị kéo lệch.
 */
function buildMap() {
  const map: MindMap = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;

  const child = createNode("Con bị kéo lệch", root.id);
  child.offsetX = 40;
  child.offsetY = -10;
  map.nodes[child.id] = child;
  root.children.push(child.id);

  const grandchild = createNode("Cháu bị kéo lệch", child.id);
  grandchild.offsetX = 5;
  map.nodes[grandchild.id] = grandchild;
  child.children.push(grandchild.id);

  const untouchedChild = createNode("Con không đổi", root.id);
  map.nodes[untouchedChild.id] = untouchedChild;
  root.children.push(untouchedChild.id);

  const floatRoot = createNode("Nhánh trôi", null);
  floatRoot.offsetX = 300;
  floatRoot.offsetY = 300;
  map.nodes[floatRoot.id] = floatRoot;

  const floatChild = createNode("Con của nhánh trôi, bị kéo lệch", floatRoot.id);
  floatChild.offsetY = 22;
  map.nodes[floatChild.id] = floatChild;
  floatRoot.children.push(floatChild.id);

  return { map, root, child, grandchild, untouchedChild, floatRoot, floatChild };
}

describe("getAutoArrangeTargetIds (P2.14 — nút Sắp xếp lại)", () => {
  it("không chọn gì -> dọn TOÀN BỘ map (mọi cây, kể cả nhánh trôi), luôn loại trừ mọi node gốc", () => {
    const { map, child, grandchild, untouchedChild, floatRoot, floatChild } = buildMap();
    const result = getAutoArrangeTargetIds(map, []);
    expect(new Set(result)).toEqual(new Set([child.id, grandchild.id, floatChild.id]));
    // Node gốc (chính lẫn nhánh trôi) và node chưa từng bị kéo không nằm trong kết quả.
    expect(result).not.toContain(map.rootId);
    expect(result).not.toContain(floatRoot.id);
    expect(result).not.toContain(untouchedChild.id);
  });

  it("chỉ chọn đúng 1 mình node gốc chính (mặc định) -> coi như không chọn gì, dọn toàn bộ map", () => {
    const { map, child, grandchild, floatChild } = buildMap();
    const result = getAutoArrangeTargetIds(map, [map.rootId]);
    expect(new Set(result)).toEqual(new Set([child.id, grandchild.id, floatChild.id]));
  });

  it("chọn 1 node cụ thể (khác gốc chính) -> CHỈ dọn node đó + hậu duệ, không đụng nhánh khác", () => {
    const { map, child, grandchild, floatChild } = buildMap();
    const result = getAutoArrangeTargetIds(map, [child.id]);
    expect(new Set(result)).toEqual(new Set([child.id, grandchild.id]));
    expect(result).not.toContain(floatChild.id);
  });

  it("chọn đúng gốc của một nhánh trôi -> chỉ dọn BÊN TRONG nhánh đó, giữ nguyên vị trí neo của chính nó", () => {
    const { map, floatRoot, floatChild } = buildMap();
    const result = getAutoArrangeTargetIds(map, [floatRoot.id]);
    expect(result).toEqual([floatChild.id]);
    expect(result).not.toContain(floatRoot.id);
  });

  it("mọi node trong phạm vi đều offset 0,0 sẵn -> trả về mảng rỗng (nút tự vô hiệu hoá)", () => {
    const { map, untouchedChild } = buildMap();
    const result = getAutoArrangeTargetIds(map, [untouchedChild.id]);
    expect(result).toEqual([]);
  });
});
