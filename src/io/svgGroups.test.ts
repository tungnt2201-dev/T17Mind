import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { defaultVisual } from "../core/boundaryVisual";
import { exportSvg } from "./svg";
import type { Boundary, MindMap, MindNode } from "../core/types";

function build(): { map: MindMap; ids: string[] } {
  const map = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;
  root.x = 0; root.y = 0; root.width = 100; root.height = 36;
  const ids: string[] = [];
  const at = (text: string, x: number, y: number): string => {
    const n = createNode(text, map.rootId);
    n.x = x; n.y = y; n.width = 100; n.height = 36;
    map.nodes[n.id] = n;
    root.children.push(n.id);
    ids.push(n.id);
    return n.id;
  };
  at("A", 200, 0); at("B", 330, 0); at("C", 1500, 700);
  return { map, ids };
}
const grp = (ids: string[], visual?: Boundary["visual"], label = "Nhóm & <thử>"): Boundary => ({ id: "b1", nodeIds: ids, label, fillColor: "#cfe3ff", borderColor: "#2f6fed", ...(visual ? { visual } : {}) });

describe("Xuất SVG có lớp nhóm trực quan (AB4)", () => {
  it("map không có nhóm: không có phần tử nhóm", () => {
    expect(exportSvg(build().map)).not.toContain("data-group");
  });

  it("E: mỗi vùng là một path evenodd (2 vùng khi hai cụm xa), có nhãn đã escape XML; nhóm nằm DƯỚI node", () => {
    const { map, ids } = build();
    map.boundaries.push(grp(ids, defaultVisual()));
    const svg = exportSvg(map);
    expect(svg).toContain('data-group="b1"');
    expect((svg.match(/fill-rule="evenodd"/g) ?? []).length).toBe(2);
    expect(svg).toContain("Nhóm &amp; &lt;thử&gt;");
    expect(svg).not.toContain("NaN");
    expect(svg.indexOf("data-group")).toBeLessThan(svg.indexOf(">A</text>")); // nhóm trước node
  });

  it("F: viền từng thành viên + nhãn, không có path vùng; nét nối khi bật", () => {
    const { map, ids } = build();
    map.boundaries.push(grp(ids, { ...defaultVisual("distributed"), showConnectors: true }));
    const svg = exportSvg(map);
    expect(svg).not.toContain("evenodd");
    expect((svg.match(/rx="11"/g) ?? []).length).toBe(3);
    expect((svg.match(/<line /g) ?? []).length).toBe(2);
  });

  it("nhóm cũ: vẫn là hình chữ nhật; chip thu gọn: thành viên ẩn thành chip ▣ N", () => {
    const { map, ids } = build();
    map.boundaries.push(grp([ids[0]!, ids[1]!]));
    expect(exportSvg(map)).toContain('rx="16"');
    const child = createNode("A1", ids[0]!);
    child.x = 400; child.y = 100; child.width = 100; child.height = 36;
    map.nodes[child.id] = child;
    (map.nodes[ids[0]!] as MindNode).children.push(child.id);
    (map.nodes[ids[0]!] as MindNode).collapsed = true;
    map.boundaries.push({ ...grp([child.id], defaultVisual(), "Ẩn"), id: "b2" });
    const svg = exportSvg(map);
    expect(svg).toContain('data-group="b2"');
    expect(svg).toContain("▣ 1");
  });

  it("khung SVG mở rộng cho vừa cả vùng/chip lòi ra ngoài node", () => {
    const { map, ids } = build();
    const without = exportSvg(map);
    map.boundaries.push(grp([ids[2]!], { ...defaultVisual(), padding: 80 }));
    const w = (s: string): number => Number(/width="(\d+)" height/.exec(s)![1]);
    expect(w(exportSvg(map))).toBeGreaterThanOrEqual(w(without));
  });
});
