import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode, getRootIds } from "../core/tree";
import { Store } from "../core/store";
import { MergeMapCommand, AddTagCommand, ToggleNodeTagCommand, SetNodeImageCommand } from "./commands";
import { validateMindMap } from "./validate";
import type { MindMap, MindNode } from "../core/types";

/** Dựng map NGUỒN dùng chung: 2 gốc (test đa gốc), Tag trùng tên khác
 *  hoa/thường với map đích (test gộp Tag theo tên). */
function buildSourceMap() {
  const mapB: MindMap = createEmptyMap("Map B - Nguồn");
  const rootB = mapB.nodes[mapB.rootId] as MindNode;
  const grandchildB = createNode("Cháu của B", rootB.id);
  mapB.nodes[grandchildB.id] = grandchildB;
  rootB.children.push(grandchildB.id);
  const floatB = createNode("Nhánh trôi của B", null);
  mapB.nodes[floatB.id] = floatB;

  const storeB = new Store(mapB);
  const tagTrungTen = new AddTagCommand("QUAN TRỌNG", "#0e9f6e");
  storeB.dispatch(tagTrungTen);
  storeB.dispatch(new ToggleNodeTagCommand(grandchildB.id, tagTrungTen.newTagId));
  const tagRieng = new AddTagCommand("Tag riêng của B", "#2f6fed");
  storeB.dispatch(tagRieng);
  storeB.dispatch(new ToggleNodeTagCommand(floatB.id, tagRieng.newTagId));

  return { map: storeB.getMap(), rootB: rootB.id, grandchildB: grandchildB.id, floatB: floatB.id };
}

function buildTargetMap() {
  const mapA: MindMap = createEmptyMap("Map A - Đích");
  const rootA = mapA.nodes[mapA.rootId] as MindNode;
  const childA = createNode("Con của A", rootA.id);
  mapA.nodes[childA.id] = childA;
  rootA.children.push(childA.id);
  const storeA = new Store(mapA);
  const tagQuanTrong = new AddTagCommand("Quan trọng", "#d64545");
  storeA.dispatch(tagQuanTrong);
  storeA.dispatch(new ToggleNodeTagCommand(childA.id, tagQuanTrong.newTagId));
  return { store: storeA, rootA: rootA.id, childA: childA.id };
}

describe("MergeMapCommand (P1.14)", () => {
  it("ghép đủ node, remap ID không trùng với dữ liệu đích", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    const nodeCountBefore = Object.keys(target.store.getMap().nodes).length;
    const sourceNodeCount = Object.keys(source.map.nodes).length;

    const cmd = new MergeMapCommand(source.map);
    target.store.dispatch(cmd);
    const merged = target.store.getMap();

    expect(Object.keys(merged.nodes).length).toBe(nodeCountBefore + sourceNodeCount);
    expect(cmd.newRootIds.every((id) => id !== source.rootB && id !== source.floatB)).toBe(true);
  });

  it("hỗ trợ nhiều gốc — mỗi gốc trong map nguồn thành một nhánh trôi riêng, không đè lên nhau", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    expect(getRootIds(source.map).length).toBe(2); // xác nhận fixture đúng có 2 gốc

    const cmd = new MergeMapCommand(source.map);
    target.store.dispatch(cmd);
    const merged = target.store.getMap();

    expect(cmd.newRootIds.length).toBe(2);
    const offsetYs = cmd.newRootIds.map((id) => (merged.nodes[id] as MindNode).offsetY);
    expect(Math.abs(offsetYs[0]! - offsetYs[1]!)).toBeGreaterThanOrEqual(300);
  });

  it("Tag gộp theo tên KHÔNG phân biệt hoa/thường — không tạo trùng lặp, giữ nguyên Tag đã có", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    const tagCountBefore = target.store.getMap().tags.length;

    target.store.dispatch(new MergeMapCommand(source.map));
    const merged = target.store.getMap();

    // "Quan trọng" (đích) và "QUAN TRỌNG" (nguồn) phải gộp thành ĐÚNG 1 Tag
    expect(merged.tags.length).toBe(tagCountBefore + 1); // +1 chỉ cho "Tag riêng của B"
    const quanTrongTag = merged.tags.find((t) => t.name === "Quan trọng");
    expect(quanTrongTag?.color).toBe("#d64545"); // giữ NGUYÊN màu gốc của đích, không bị nguồn ghi đè
  });

  it("node đã remap vẫn gắn ĐÚNG Tag đã gộp theo tên (không lạc mất liên kết)", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    const cmd = new MergeMapCommand(source.map);
    target.store.dispatch(cmd);
    const merged = target.store.getMap();

    const quanTrongTag = merged.tags.find((t) => t.name === "Quan trọng")!;
    const newRoot = merged.nodes[cmd.newRootIds[0] as string] as MindNode;
    const newGrandchild = merged.nodes[newRoot.children[0] as string] as MindNode;
    expect(newGrandchild.tagIds).toContain(quanTrongTag.id);
  });

  it("kết quả sau ghép luôn hợp lệ theo validateMindMap", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    target.store.dispatch(new MergeMapCommand(source.map));
    expect(validateMindMap(target.store.getMap())).toEqual([]);
  });

  it("hoàn tác đưa map đích về ĐÚNG trạng thái trước khi ghép (cả node lẫn Tag)", () => {
    const source = buildSourceMap();
    const target = buildTargetMap();
    const nodeCountBefore = Object.keys(target.store.getMap().nodes).length;
    const tagCountBefore = target.store.getMap().tags.length;

    target.store.dispatch(new MergeMapCommand(source.map));
    target.store.undo();

    const afterUndo = target.store.getMap();
    expect(Object.keys(afterUndo.nodes).length).toBe(nodeCountBefore);
    expect(afterUndo.tags.length).toBe(tagCountBefore);
    expect(afterUndo.tags.find((t) => t.name === "Quan trọng")?.color).toBe("#d64545");
  });

  // P2.10 — Ảnh nhúng: map nguồn có node gắn ảnh, map đích CŨNG đã có
  // sẵn một ảnh khác — phải remap id ảnh của nguồn để không đè lên ảnh
  // đã có ở đích (khác Tag, ảnh KHÔNG gộp theo tên vì không có tên).
  it("ghép map có ảnh nhúng: remap đúng imageAssetId, KHÔNG đè lên ảnh đã có sẵn ở đích", () => {
    const source = buildSourceMap();
    new SetNodeImageCommand(source.grandchildB, "img_shared_id", { mimeType: "image/png", dataBase64: "TU_NGUON" }).apply(
      source.map
    );

    const target = buildTargetMap();
    // Map đích TÌNH CỜ dùng CÙNG một id ảnh — trường hợp dễ đụng độ nhất.
    new SetNodeImageCommand(target.childA, "img_shared_id", { mimeType: "image/png", dataBase64: "CUA_DICH" }).apply(
      target.store.getMap()
    );

    const cmd = new MergeMapCommand(source.map);
    target.store.dispatch(cmd);
    const merged = target.store.getMap();

    // Ảnh của đích không bị ghi đè.
    expect(merged.nodes[target.childA]?.imageAssetId).toBe("img_shared_id");
    expect(merged.assets["img_shared_id"]?.dataBase64).toBe("CUA_DICH");

    // Node đã remap từ nguồn (cháu của B) vẫn còn ảnh, nhưng qua một id KHÁC.
    const newRoot = merged.nodes[cmd.newRootIds[0] as string] as MindNode;
    const newGrandchild = merged.nodes[newRoot.children[0] as string] as MindNode;
    expect(newGrandchild.imageAssetId).not.toBeNull();
    expect(newGrandchild.imageAssetId).not.toBe("img_shared_id");
    expect(merged.assets[newGrandchild.imageAssetId as string]?.dataBase64).toBe("TU_NGUON");

    expect(validateMindMap(merged)).toEqual([]);
  });

  it("hoàn tác việc ghép map có ảnh cũng xoá đúng ảnh vừa thêm khỏi map.assets, không để lại rác", () => {
    const source = buildSourceMap();
    new SetNodeImageCommand(source.grandchildB, "img_x", { mimeType: "image/png", dataBase64: "ABC" }).apply(source.map);
    const target = buildTargetMap();
    const assetCountBefore = Object.keys(target.store.getMap().assets).length;

    target.store.dispatch(new MergeMapCommand(source.map));
    target.store.undo();

    expect(Object.keys(target.store.getMap().assets).length).toBe(assetCountBefore);
  });
});
