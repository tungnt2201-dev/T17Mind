import { describe, it, expect } from "vitest";
import { computeViewportWorldRect, isRectVisibleInViewport, computeDropTarget, summaryGeometry, dropChangesStructure, describeDropTarget, gapIndicatorGeometry, dropBand, type DropTarget } from "./geometry";
import { MoveNodeCommand } from "../core/commands";
import { applyLayout } from "../layout";
import { createEmptyMap, createNode } from "../core/tree";
import type { MindMap, MindNode } from "../core/types";

/** Map có gốc + các con (mỗi con có thể có cháu), xếp bằng layout THẬT với node cỡ cố định 120x36. */
function buildMap(layout: MindMap["layoutType"], names: string[], grandkids: Record<string, string[]> = {}) {
  const map = createEmptyMap("Gốc");
  map.layoutType = layout;
  const root = map.nodes[map.rootId] as MindNode;
  const by: Record<string, MindNode> = {};
  const add = (text: string, parent: MindNode) => {
    const n = createNode(text, parent.id);
    map.nodes[n.id] = n;
    parent.children.push(n.id);
    by[text] = n;
    return n;
  };
  for (const t of names) {
    const n = add(t, root);
    for (const g of grandkids[t] ?? []) add(g, n);
  }
  const relayout = () => applyLayout(map, () => ({ width: 120, height: 36 }));
  relayout();
  return { map, root, by, relayout };
}
const order = (map: MindMap, parentId: string) => (map.nodes[parentId] as MindNode).children.map((id) => map.nodes[id]!.text).join(",");
/** Thả giống finishNodeDrag: chỉ dispatch khi đổi cấu trúc. */
function drop(map: MindMap, draggedId: string, t: DropTarget | null) {
  if (!t) return;
  if (!dropChangesStructure(map, draggedId, t)) return;
  const index = t.kind === "child" ? map.nodes[t.parentId]!.children.length : t.index;
  new MoveNodeCommand(draggedId, t.parentId, index).apply(map);
}
const midX = (n: MindNode) => n.x + n.width / 2;
const midY = (n: MindNode) => n.y + n.height / 2;

describe("computeDropTarget — kéo thả đúng thứ tự (bố cục ngang)", () => {
  it("kéo B xuống khe giữa C và D → A,C,B,D (trước đây lệch thành A,C,D,B)", () => {
    const { map, root, by } = buildMap("logicRight", ["A", "B", "C", "D"]);
    const y = (by.C!.y + by.C!.height + by.D!.y) / 2;
    const t = computeDropTarget(map, by.B!.id, midX(by.C!), y);
    drop(map, by.B!.id, t);
    expect(order(map, root.id)).toBe("A,C,B,D");
  });

  it("kéo B lên trên A → B,A,C,D; xuống dưới D → A,C,D,B", () => {
    let m = buildMap("logicRight", ["A", "B", "C", "D"]);
    drop(m.map, m.by.B!.id, computeDropTarget(m.map, m.by.B!.id, midX(m.by.A!), m.by.A!.y - 10));
    expect(order(m.map, m.root.id)).toBe("B,A,C,D");
    m = buildMap("logicRight", ["A", "B", "C", "D"]);
    drop(m.map, m.by.B!.id, computeDropTarget(m.map, m.by.B!.id, midX(m.by.D!), m.by.D!.y + m.by.D!.height + 12));
    expect(order(m.map, m.root.id)).toBe("A,C,D,B");
  });

  it("thả B về đúng chỗ cũ: không đổi cấu trúc", () => {
    const { map, by } = buildMap("logicRight", ["A", "B", "C", "D"]);
    const t = computeDropTarget(map, by.B!.id, midX(by.A!), midY(by.B!))!;
    expect(t.kind).toBe("gap");
    expect(dropChangesStructure(map, by.B!.id, t)).toBe(false);
  });

  it("trên thân node: dải đầu = chèn trước, giữa = làm con, dải cuối = chèn sau", () => {
    const { map, by } = buildMap("logicRight", ["A", "B", "C", "D"]);
    const C = by.C!;
    const before = computeDropTarget(map, by.A!.id, midX(C), C.y + 3)!;
    expect(before).toMatchObject({ kind: "gap", refId: C.id, after: false });
    expect(computeDropTarget(map, by.A!.id, midX(C), midY(C))).toEqual({ kind: "child", parentId: C.id });
    expect(computeDropTarget(map, by.A!.id, midX(C), C.y + C.height - 3)).toMatchObject({ kind: "gap", refId: C.id, after: true });
    expect(describeDropTarget(map, before)).toBe("Chèn phía trên «C»");
    expect(describeDropTarget(map, { kind: "child", parentId: C.id })).toBe("Làm nhánh con của «C»");
  });

  it("ổn định ở ranh giới dải (hysteresis): đang 'làm con' thì nhích sát mép vẫn giữ", () => {
    const { map, by } = buildMap("logicRight", ["A", "B", "C"]);
    const C = by.C!;
    const edge = C.y + dropBand(C.height);
    const y = edge - 2;
    expect(computeDropTarget(map, by.A!.id, midX(C), y, null)?.kind).toBe("gap");
    expect(computeDropTarget(map, by.A!.id, midX(C), y, { kind: "child", parentId: C.id })).toEqual({ kind: "child", parentId: C.id });
  });

  it("thả hụt ra xa: bám về khe gần nhất trong nhóm anh em cũ (không bao giờ null với node có cha)", () => {
    const { map, root, by } = buildMap("logicRight", ["A", "B", "C", "D"]);
    const t = computeDropTarget(map, by.A!.id, by.D!.x + 3000, midY(by.D!) + 1);
    expect(t).toMatchObject({ kind: "gap", parentId: root.id });
    drop(map, by.A!.id, t);
    expect(order(map, root.id)).toBe("B,C,D,A");
  });

  it("nhánh trôi kéo ra chỗ trống: null (dời tự do)", () => {
    const { map, by } = buildMap("logicRight", ["A"]);
    const f = createNode("Trôi", null);
    f.x = 900; f.y = 900; f.width = 120; f.height = 36;
    map.nodes[f.id] = f;
    expect(computeDropTarget(map, f.id, 3000, 3000)).toBeNull();
    expect(computeDropTarget(map, f.id, midX(by.A!), midY(by.A!))).toEqual({ kind: "child", parentId: by.A!.id });
  });

  it("không thả được vào chính nhánh con của mình", () => {
    const { map, root, by } = buildMap("logicRight", ["A", "B"], { A: ["A1", "A2"] });
    const t = computeDropTarget(map, by.A!.id, midX(by.A1!), midY(by.A1!));
    expect(t?.parentId).toBe(root.id);
  });

  it("chỗ trống cạnh nhóm cháu: chèn vào nhóm đó theo vị trí", () => {
    const { map, by } = buildMap("logicRight", ["A", "B"], { A: ["A1", "A2"] });
    const y = (by.A1!.y + by.A1!.height + by.A2!.y) / 2;
    const t = computeDropTarget(map, by.B!.id, midX(by.A1!), y)!;
    expect(t).toMatchObject({ kind: "gap", parentId: by.A!.id, index: 1 });
  });

  it("cột anh em chồng nhau (cha tên dài): thả vào chỗ trống của chính node đang kéo vẫn thuộc nhóm của nó", () => {
    const map = createEmptyMap("Gốc");
    map.layoutType = "logicRight";
    const root = map.nodes[map.rootId] as MindNode;
    const p1 = createNode("Ngắn", root.id);
    const p2 = createNode("Một nhánh có tên rất rất dài", root.id);
    for (const p of [p1, p2]) { map.nodes[p.id] = p; root.children.push(p.id); }
    const kids = ["A", "B", "C"].map((t) => { const n = createNode(t, p1.id); map.nodes[n.id] = n; p1.children.push(n.id); return n; });
    applyLayout(map, (n) => ({ width: n.text.length > 20 ? 400 : 120, height: 36 }));
    const B = kids[1]!;
    expect(p2.x + p2.width).toBeGreaterThan(B.x); // hai cột chồng nhau theo trục X
    const t = computeDropTarget(map, B.id, B.x + B.width / 2, B.y + B.height / 2)!;
    expect(t.parentId).toBe(p1.id);
    expect(dropChangesStructure(map, B.id, t)).toBe(false);
  });

  it("theo VỊ TRÍ THẬT: node anh em bị kéo lệch lên đầu thì chèn 'trên nó' vẫn đúng chỗ nhìn thấy", () => {
    const { map, root, by, relayout } = buildMap("logicRight", ["A", "B", "C", "D"]);
    by.D!.offsetY = -400; // D bị kéo tay lên cao nhất
    relayout();
    const t = computeDropTarget(map, by.B!.id, midX(by.D!), by.D!.y + 3)!;
    expect(t).toMatchObject({ kind: "gap", refId: by.D!.id, after: false });
    drop(map, by.B!.id, t);
    expect(order(map, root.id)).toBe("A,C,B,D");
  });

  it("vạch chỉ chỗ chèn: trước node đầu nằm sát trên node đó; giữa hai node nằm giữa khe", () => {
    const { map, by } = buildMap("logicRight", ["A", "B", "C"]);
    const t1 = computeDropTarget(map, by.C!.id, midX(by.A!), by.A!.y - 10) as Extract<DropTarget, { kind: "gap" }>;
    expect(gapIndicatorGeometry(map, t1)!.y1).toBe(by.A!.y - 7);
    const t2 = computeDropTarget(map, by.C!.id, midX(by.A!), by.A!.y + by.A!.height - 2) as Extract<DropTarget, { kind: "gap" }>;
    expect(gapIndicatorGeometry(map, t2)!.y1).toBe((by.A!.y + by.A!.height + by.B!.y) / 2);
  });
});

describe("computeDropTarget — bố cục cây xuống và hai bên", () => {
  it("cây xuống: anh em xếp ngang, chèn bên phải node cuối", () => {
    const { map, root, by } = buildMap("treeDown", ["A", "B", "C"]);
    const t = computeDropTarget(map, by.A!.id, by.C!.x + by.C!.width + 15, midY(by.C!))!;
    expect(describeDropTarget(map, t)).toBe("Chèn bên phải «C»");
    drop(map, by.A!.id, t);
    expect(order(map, root.id)).toBe("B,C,A");
    const geo = gapIndicatorGeometry(map, t as Extract<DropTarget, { kind: "gap" }>)!;
    expect(geo.x1).toBe(geo.x2); // vạch dọc
  });

  it("hai bên: con của gốc tách nhóm trái/phải, chèn theo đúng nhóm phía con trỏ", () => {
    const { map, root, by } = buildMap("logicBoth", ["A", "B", "C", "D"]);
    const left = Object.values(by).filter((n) => n.x + n.width <= root.x);
    const right = Object.values(by).filter((n) => n.x > root.x);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    const L = [...left].sort((a, b) => a.y - b.y)[0]!;
    const mover = right[0]!;
    const t = computeDropTarget(map, mover.id, midX(L), L.y - 10)!;
    expect(t).toMatchObject({ kind: "gap", refId: L.id, after: false });
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

describe("summaryGeometry — ngoặc tóm tắt ra phía ngoài (cây hai bên)", () => {
  /** Gốc ở x=500; hai node con bên phải (x=700) và hai bên trái (x=200, rộng 100 → mép phải 300 <= 500). */
  function twoSided() {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    root.x = 500;
    root.width = 100;
    root.height = 40;
    const mk = (text: string, x: number, y: number) => {
      const n = createNode(text, root.id);
      n.x = x;
      n.y = y;
      n.width = 100;
      n.height = 40;
      map.nodes[n.id] = n;
      root.children.push(n.id);
      return n;
    };
    return { map, r1: mk("R1", 700, 0), r2: mk("R2", 720, 60), l1: mk("L1", 200, 0), l2: mk("L2", 180, 60) };
  }

  it("node bên phải: ngoặc và nhãn nằm bên phải, như trước", () => {
    const { map, r1, r2 } = twoSided();
    const g = summaryGeometry(map, { id: "s", nodeIds: [r1.id, r2.id], label: "Nhóm", color: null })!;
    expect(g.side).toBe("right");
    expect(g.braceX).toBe(820 + 22);
    expect(g.labelX).toBeGreaterThan(g.tipX);
    expect(g.tipX).toBeGreaterThan(g.braceX);
  });

  it("node bên trái cha: ngoặc và nhãn nằm bên TRÁI các node (ra ngoài), đối xứng với bên phải", () => {
    const { map, l1, l2 } = twoSided();
    const label = "Nhóm";
    const g = summaryGeometry(map, { id: "s", nodeIds: [l1.id, l2.id], label, color: null })!;
    expect(g.side).toBe("left");
    expect(g.braceX).toBe(180 - 22); // sau mép trái node trái nhất
    expect(g.tipX).toBe(g.braceX - 16);
    expect(g.labelX + g.labelW).toBe(g.tipX - 26); // hộp nhãn kết thúc trước mũi nhọn, nằm hẳn bên trái
    expect(g.labelX + g.labelW).toBeLessThan(180); // không đè lên node
    expect(g.minY).toBe(0);
    expect(g.maxY).toBe(100);
    expect(g.tipY).toBe(50);
  });

  it("lẫn hai phía: theo phía của đa số node; gốc/node không có cha coi là bên phải", () => {
    const { map, r1, l1, l2 } = twoSided();
    expect(summaryGeometry(map, { id: "s", nodeIds: [l1.id, l2.id, r1.id], label: "", color: null })!.side).toBe("left");
    const root = map.nodes[map.rootId] as MindNode;
    expect(summaryGeometry(map, { id: "s", nodeIds: [root.id, r1.id], label: "", color: null })!.side).toBe("right");
  });
});

