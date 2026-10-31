import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { SetVisibleDepthCommand, visibleDepth, subtreeDepth } from "./commands";
import type { MindMap, MindNode } from "./types";

/** Gốc → A (→ A1 → A1a), B (→ B1), C (lá): sâu nhất 3 tầng. */
function tree() {
  const map = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;
  const by: Record<string, MindNode> = {};
  const add = (t: string, p: MindNode) => { const n = createNode(t, p.id); map.nodes[n.id] = n; p.children.push(n.id); by[t] = n; return n; };
  const A = add("A", root); const A1 = add("A1", A); add("A1a", A1);
  const B = add("B", root); add("B1", B);
  add("C", root);
  return { map, root, by };
}
const visible = (map: MindMap) => {
  const out: string[] = [];
  const walk = (id: string) => { const n = map.nodes[id]!; out.push(n.text); if (!n.collapsed) n.children.forEach(walk); };
  walk(map.rootId);
  return out.join(",");
};

describe("Thu gọn / bung theo từng cấp (phím C)", () => {
  it("độ sâu đang hiện và độ sâu thật", () => {
    const { map, root, by } = tree();
    expect(subtreeDepth(map, root.id)).toBe(3);
    expect(visibleDepth(map, root.id)).toBe(3);
    by.A1!.collapsed = true;
    expect(visibleDepth(map, root.id)).toBe(2);
    root.collapsed = true;
    expect(visibleDepth(map, root.id)).toBe(0);
    expect(subtreeDepth(map, by.C!.id)).toBe(0);
  });

  it("rút lần lượt 3 → 2 → 1 → 0, mỗi lần một tầng", () => {
    const { map, root } = tree();
    const seen: string[] = [];
    for (let d = 2; d >= 0; d--) {
      new SetVisibleDepthCommand(root.id, d).apply(map);
      expect(visibleDepth(map, root.id)).toBe(d);
      seen.push(visible(map));
    }
    expect(seen).toEqual(["Gốc,A,A1,B,B1,C", "Gốc,A,B,C", "Gốc"]);
  });

  it("bung lần lượt 0 → 1 → 2 → 3 từ trạng thái thu gọn hẳn", () => {
    const { map, root } = tree();
    root.collapsed = true;
    const seen: string[] = [];
    for (let d = 1; d <= 3; d++) {
      new SetVisibleDepthCommand(root.id, d).apply(map);
      seen.push(visible(map));
    }
    expect(seen).toEqual(["Gốc,A,B,C", "Gốc,A,A1,B,B1,C", "Gốc,A,A1,A1a,B,B1,C"]);
  });

  it("hoàn tác trả lại đúng trạng thái thu gọn riêng của từng nhánh; không đụng tới lá", () => {
    const { map, root, by } = tree();
    by.B!.collapsed = true; // người dùng tự thu riêng B
    const before = JSON.stringify(Object.values(map.nodes).map((n) => [n.text, n.collapsed]));
    const cmd = new SetVisibleDepthCommand(root.id, 1);
    cmd.apply(map);
    expect(by.C!.collapsed).toBe(false); // lá giữ nguyên
    cmd.revert(map);
    expect(JSON.stringify(Object.values(map.nodes).map((n) => [n.text, n.collapsed]))).toBe(before);
  });
});
