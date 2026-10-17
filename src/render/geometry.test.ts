import { describe, it, expect } from "vitest";
import { computeViewportWorldRect, isRectVisibleInViewport, computeDropTarget } from "./geometry";
import { createEmptyMap, createNode } from "../core/tree";
import type { MindMap, MindNode } from "../core/types";

/** Dựng map với 3 node anh em (A, B, C) xếp dọc, vị trí Y CỤ THỂ để
 *  kiểm soát chính xác toạ độ các khe khi test. Mỗi node cao 40, đặt
 *  cách nhau 10 (khe A-B tại y=145, khe B-C tại y=195). */
function buildThreeSiblings(): { map: MindMap; a: MindNode; b: MindNode; c: MindNode } {
  const map = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;
  root.width = 100;
  root.height = 40;

  const a = createNode("A", root.id);
  a.width = 100;
  a.height = 40;
  a.baseY = 100;
  a.y = 100;
  map.nodes[a.id] = a;
  root.children.push(a.id);

  const b = createNode("B", root.id);
  b.width = 100;
  b.height = 40;
  b.baseY = 150;
  b.y = 150;
  map.nodes[b.id] = b;
  root.children.push(b.id);

  const c = createNode("C", root.id);
  c.width = 100;
  c.height = 40;
  c.baseY = 200;
  c.y = 200;
  map.nodes[c.id] = c;
  root.children.push(c.id);

  return { map, a, b, c };
}

describe("computeDropTarget — hysteresis (sửa lỗi 'kéo lệch một chút xíu là đổi hẳn vị trí')", () => {
  it("con trỏ THỰC SỰ SÁT khe (trong vùng ENTER hẹp) -> nhận diện khe dù CHƯA có khe nào đang active", () => {
    const { map, a } = buildThreeSiblings();
    // Khe A-B tại y = (140+150)/2 = 145. Cách tâm khe 5 đơn vị — trong
    // vùng ENTER (0.18*40=7.2) nên phải nhận diện dù currentTarget=null.
    const target = computeDropTarget(map, "khong-ton-tai", 50, 140, null);
    expect(target).toEqual({ kind: "gap", parentId: a.parentId, index: expect.any(Number) });
  });

  it("con trỏ CÁCH khe một khoảng VỪA PHẢI (ngoài ENTER, trong STAY) nhưng CHƯA có khe nào active -> KHÔNG nhận diện (đúng thiết kế: chưa 'vào' hẳn thì chưa tính)", () => {
    const { map } = buildThreeSiblings();
    // Cách tâm khe A-B (145) một khoảng 10 -> ngoài ENTER (7.2) nhưng
    // trong STAY (0.4*40=16). currentTarget=null nên phải dùng ngưỡng
    // HẸP (ENTER) -> không nhận diện được khe này.
    const target = computeDropTarget(map, "khong-ton-tai", 50, 135, null);
    expect(target?.kind).not.toBe("gap");
  });

  it("CÙNG một vị trí con trỏ như trên, nhưng khe A-B ĐANG được giữ (currentTarget) -> VẪN giữ nguyên, không rớt ra — đây chính là phần sửa lỗi chính", () => {
    const { map, a, b } = buildThreeSiblings();
    const indexOfB = (map.nodes[a.parentId as string] as MindNode).children.indexOf(b.id);
    const currentTarget = { kind: "gap" as const, parentId: a.parentId as string, index: indexOfB };
    // Y=135 giống hệt test trên (ngoài ENTER, trong STAY) — nhưng lần
    // này currentTarget ĐANG LÀ đúng khe A-B, nên phải dùng ngưỡng
    // RỘNG (STAY=16) và tiếp tục nhận diện đúng khe đó, KHÔNG đổi
    // sang trạng thái khác dù con trỏ đã lệch 10 đơn vị khỏi tâm khe.
    const target = computeDropTarget(map, "khong-ton-tai", 50, 135, currentTarget);
    expect(target).toEqual(currentTarget);
  });

  it("con trỏ RA HẲN KHỎI vùng STAY của khe đang giữ -> mới thực sự đổi sang trạng thái khác", () => {
    const { map, a, b } = buildThreeSiblings();
    const parentId = a.parentId as string;
    const indexOfB = (map.nodes[parentId] as MindNode).children.indexOf(b.id);
    const currentTarget = { kind: "gap" as const, parentId, index: indexOfB };
    // Y=125 — cách tâm khe A-B (145) những 20 đơn vị, VƯỢT QUÁ cả
    // STAY (16) — phải không còn là khe A-B nữa (đổi sang thân A, vì
    // 125 nằm trong thân A [100,140]... thực ra 125 nằm trong [100,140]
    // nên sẽ hit thân A làm con, không phải gap nào khác).
    const target = computeDropTarget(map, "khong-ton-tai", 50, 125, currentTarget);
    expect(target).not.toEqual(currentTarget);
  });

  it("node ĐANG KÉO (và con cháu nó) bị loại trừ hoàn toàn khỏi việc dò — không thể thả vào chính nó", () => {
    const { map, a, b } = buildThreeSiblings();
    // Kéo CHÍNH node A — dò tại đúng vị trí thân A phải KHÔNG trả về
    // { kind: "child", parentId: a.id } (không thể làm con của chính
    // mình) — nhưng CÓ THỂ trả về kết quả khác (ví dụ null hoặc thân
    // node khác), miễn không phải chính A.
    const target = computeDropTarget(map, a.id, 50, 120, null);
    expect(target).not.toEqual({ kind: "child", parentId: a.id });
    void b;
  });

  it("thân node (không phải khe) vẫn nhận diện đúng để làm con — không bị hysteresis ảnh hưởng", () => {
    const { map, a } = buildThreeSiblings();
    // Y=120 nằm giữa thân A [100,140], cách xa mọi khe — phải nhận
    // diện là muốn làm con của A.
    const target = computeDropTarget(map, "khong-ton-tai", 50, 120, null);
    expect(target).toEqual({ kind: "child", parentId: a.id });
  });
});

describe("computeViewportWorldRect / isRectVisibleInViewport (P1.13)", () => {
  it("tính đúng khung viewport world từ ViewTransform + kích thước canvas", () => {
    const view = { scale: 1.5, offsetX: 100, offsetY: 50 };
    const rect = computeViewportWorldRect(view, 800, 600);
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;
    // Quy đổi ngược: điểm giữa khung world phải map đúng về giữa canvas.
    expect(centerX * view.scale + view.offsetX).toBeCloseTo(400, 5);
    expect(centerY * view.scale + view.offsetY).toBeCloseTo(300, 5);
  });

  it("node NẰM HẲN TRONG khung nhìn -> visible", () => {
    const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
    expect(isRectVisibleInViewport({ x: 100, y: 100, width: 170, height: 46 }, viewport, 100)).toBe(true);
  });

  it("node NẰM HẲN NGOÀI khung nhìn, cách xa cả margin -> không visible", () => {
    const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
    expect(isRectVisibleInViewport({ x: 5000, y: 5000, width: 170, height: 46 }, viewport, 100)).toBe(false);
  });

  it("node ở NGAY SÁT MÉP (trong khoảng margin) -> vẫn visible, tránh chớp tắt", () => {
    const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
    // Node bắt đầu tại x=1050 (50px ngoài mép phải) — trong margin 100 nên vẫn tính là visible.
    expect(isRectVisibleInViewport({ x: 1050, y: 100, width: 170, height: 46 }, viewport, 100)).toBe(true);
  });

  it("node GIAO MỘT PHẦN với khung nhìn (không nằm hẳn trong) -> vẫn visible", () => {
    const viewport = { left: 0, top: 0, right: 1000, bottom: 800 };
    // Node bắt đầu TRƯỚC mép trái, kéo dài VÀO trong khung nhìn.
    expect(isRectVisibleInViewport({ x: -50, y: 100, width: 170, height: 46 }, viewport, 0)).toBe(true);
  });
});
