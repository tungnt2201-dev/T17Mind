import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { migrateToLatest } from "../core/migrate";
import { AddChildCommand, SetNodeSideCommand } from "../core/commands";
import { applyLayout } from "../layout";
import { computeDropTarget, describeDropTarget, dropChangesStructure, type DropTarget } from "../render/geometry";
import type { MindMap, MindNode } from "../core/types";
import { asOneCommand, buildDropCommands, previewDropPositions } from "./dragPreview";

const measure = () => ({ width: 120, height: 36 });
/** Cây hai bên: gốc + các nhánh cấp 1 (nhánh `tall` có 4 con để cao hơn). */
function both(names: string[], tall: string[] = []) {
  const map = createEmptyMap("Gốc");
  map.layoutType = "logicBoth";
  const root = map.nodes[map.rootId] as MindNode;
  const by: Record<string, MindNode> = {};
  for (const t of names) {
    const n = createNode(t, root.id);
    map.nodes[n.id] = n;
    root.children.push(n.id);
    by[t] = n;
    if (tall.includes(t)) for (let i = 0; i < 4; i++) { const c = createNode(`${t}${i}`, n.id); map.nodes[c.id] = c; n.children.push(c.id); }
  }
  const relayout = () => applyLayout(map, measure);
  relayout();
  return { map, root, by, relayout };
}
const sideOf = (map: MindMap, n: MindNode) => (n.x + n.width <= map.nodes[map.rootId]!.x ? "left" : "right");
const midX = (n: MindNode) => n.x + n.width / 2;
const midY = (n: MindNode) => n.y + n.height / 2;

describe("Cây hai bên — ghim bên trái/phải (node.side)", () => {
  it("nhánh ghim ở yên bên đã chọn; nhánh chưa ghim vẫn tự cân; thêm con làm nhánh cao lên cũng không đổi bên", () => {
    const { map, by, relayout } = both(["A", "B", "C", "D"]);
    const rightOne = Object.values(by).find((n) => sideOf(map, n) === "right")!;
    new SetNodeSideCommand(rightOne.id, "left").apply(map);
    relayout();
    expect(sideOf(map, rightOne)).toBe("left");
    for (let i = 0; i < 6; i++) new AddChildCommand(rightOne.id, `con ${i}`).apply(map);
    relayout();
    expect(sideOf(map, rightOne)).toBe("left");
    expect(Object.values(by).some((n) => sideOf(map, n) === "right")).toBe(true);
  });

  it("SetNodeSideCommand hoàn tác được; AddChildCommand nhận bên của nhánh cùng cấp", () => {
    const { map, by } = both(["A"]);
    const cmd = new SetNodeSideCommand(by.A!.id, "left");
    cmd.apply(map);
    expect(by.A!.side).toBe("left");
    cmd.revert(map);
    expect(by.A!.side).toBeUndefined();
    const add = new AddChildCommand(map.rootId, "Mới", "left");
    add.apply(map);
    expect(map.nodes[add.newNodeId]!.side).toBe("left");
  });

  it("mở file: side sai bị bỏ, side đúng được giữ", () => {
    const { map, by } = both(["A", "B"]);
    (by.A as unknown as Record<string, unknown>).side = "giữa";
    by.B!.side = "left";
    const loaded = migrateToLatest(JSON.parse(JSON.stringify(map)));
    expect("side" in loaded.nodes[by.A!.id]!).toBe(false);
    expect(loaded.nodes[by.B!.id]!.side).toBe("left");
  });

  it("kéo nhánh sang khe của bên kia: đích mang side, thả xong nhánh nằm và ở yên bên đó", () => {
    const { map, by, relayout } = both(["A", "B", "C", "D"]);
    const rights = Object.values(by).filter((n) => sideOf(map, n) === "right");
    const lefts = Object.values(by).filter((n) => sideOf(map, n) === "left").sort((a, b) => a.y - b.y);
    const mover = rights[0]!;
    const t = computeDropTarget(map, mover.id, midX(lefts[0]!), lefts[0]!.y - 10)!;
    expect(t).toMatchObject({ kind: "gap", side: "left", refId: lefts[0]!.id, after: false });
    expect(dropChangesStructure(map, mover.id, t)).toBe(true);
    asOneCommand(buildDropCommands(map, mover.id, t)).apply(map);
    relayout();
    expect(mover.side).toBe("left");
    expect(sideOf(map, mover)).toBe("left");
    expect([...lefts, mover].sort((a, b) => a.y - b.y)[0]).toBe(mover); // nằm trên cùng bên trái
  });

  it("chuyển một nhánh sang bên trống hoàn toàn", () => {
    const { map, root, by, relayout } = both(["A"]);
    const t = computeDropTarget(map, by.A!.id, root.x - 150, midY(root))!;
    expect(t).toEqual({ kind: "child", parentId: root.id, side: "left" });
    asOneCommand(buildDropCommands(map, by.A!.id, t)).apply(map);
    relayout();
    expect(sideOf(map, by.A!)).toBe("left");
    expect(describeDropTarget(map, t)).toBe("Làm nhánh con của «Gốc», bên trái");
  });

  it("đã chọn bên cho một nhánh thì các nhánh khác cũng đứng yên (ghim theo bên đang hiện), không tự cân lại", () => {
    const { map, by, relayout } = both(["A", "B", "C", "D", "E"], ["A"]);
    const before = new Map(Object.values(by).map((n) => [n.id, sideOf(map, n)]));
    expect(before.get(by.A!.id)).toBe("right"); // nhánh cao A một bên, B–E bên kia
    const mover = Object.values(by).find((n) => sideOf(map, n) === "left")!;
    const t = computeDropTarget(map, mover.id, midX(by.A!), by.A!.y - 10)!;
    expect(t.side).toBe("right");
    asOneCommand(buildDropCommands(map, mover.id, t)).apply(map);
    relayout();
    for (const n of Object.values(by)) if (n !== mover) expect(sideOf(map, n)).toBe(before.get(n.id));
  });
});

describe("Xem trước khi kéo — vị trí sau khi thả (các node dạt ra nhường chỗ)", () => {
  function line() {
    const map = createEmptyMap("Gốc");
    map.layoutType = "logicRight";
    const root = map.nodes[map.rootId] as MindNode;
    const by: Record<string, MindNode> = {};
    for (const t of ["A", "B", "C", "D"]) { const n = createNode(t, root.id); map.nodes[n.id] = n; root.children.push(n.id); by[t] = n; }
    applyLayout(map, measure);
    return { map, root, by };
  }

  it("vị trí xem trước trùng khít vị trí sau khi thả thật (không có cú nhảy khi thả)", () => {
    const { map, by } = line();
    by.B!.offsetX = 30; // B từng bị kéo lệch: thả xong phải về đúng hàng
    applyLayout(map, measure);
    const t = computeDropTarget(map, by.B!.id, midX(by.D!), by.D!.y + by.D!.height + 10)!;
    const preview = previewDropPositions(map, by.B!.id, t, { x: 30, y: 0 }, measure)!;
    expect(preview.has(by.B!.id)).toBe(false); // node đang kéo đi theo chuột, không nằm trong xem trước
    // C và D dồn lên chỗ trống của B
    expect(preview.get(by.C!.id)!.y).toBeLessThan(by.C!.y);
    asOneCommand(buildDropCommands(map, by.B!.id, t)).apply(map);
    applyLayout(map, measure);
    for (const [id, p] of preview) {
      expect(map.nodes[id]!.x).toBeCloseTo(p.x);
      expect(map.nodes[id]!.y).toBeCloseTo(p.y);
    }
    expect(by.B!.offsetX).toBe(0);
  });

  it("bản sao xem trước không đụng tới map thật; thả về chỗ cũ (không đổi) → null", () => {
    const { map, root, by } = line();
    const before = JSON.stringify(map.nodes);
    const t: DropTarget = computeDropTarget(map, by.A!.id, midX(by.D!), by.D!.y + by.D!.height + 10)!;
    expect(previewDropPositions(map, by.A!.id, t, { x: 0, y: 0 }, measure)).not.toBeNull();
    expect(JSON.stringify(map.nodes)).toBe(before);
    expect(map.nodes[root.id]!.children[0]).toBe(by.A!.id);
    const same = computeDropTarget(map, by.B!.id, midX(by.B!), midY(by.B!))!;
    expect(previewDropPositions(map, by.B!.id, same, { x: 0, y: 0 }, measure)).toBeNull();
  });
});
