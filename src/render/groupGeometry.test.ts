import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { defaultVisual } from "../core/boundaryVisual";
import { boundaryGeometry } from "./geometry";
import { computeGroupGeometry, hitTestGroup, FRAGMENTED_REGION_COUNT } from "./groupGeometry";
import { pointInPolygon } from "./adaptiveBoundary";
import type { Boundary, MindMap, MindNode } from "../core/types";

/** Dựng map với node đặt tay: mỗi mục [text, cha ("" = gốc), x, y]. */
function build(spec: [string, string, number, number][]): { map: MindMap; id: Record<string, string> } {
  const map = createEmptyMap("Gốc");
  const id: Record<string, string> = { "": map.rootId };
  const root = map.nodes[map.rootId] as MindNode;
  root.x = 0;
  root.y = 0;
  root.width = 100;
  root.height = 36;
  for (const [text, parent, x, y] of spec) {
    const n = createNode(text, id[parent] as string);
    n.x = x;
    n.y = y;
    n.width = 100;
    n.height = 36;
    map.nodes[n.id] = n;
    (map.nodes[id[parent] as string] as MindNode).children.push(n.id);
    id[text] = n.id;
  }
  return { map, id };
}
const group = (ids: string[], visual?: Boundary["visual"], label = "Nhóm"): Boundary => ({ id: "b1", nodeIds: ids, label, fillColor: null, borderColor: null, ...(visual ? { visual } : {}) });
const collapse = (map: MindMap, nodeId: string): void => {
  (map.nodes[nodeId] as MindNode).collapsed = true;
};

describe("Hình học nhóm — tương thích cũ (AB1/AB2)", () => {
  it("nhóm không có visual: đúng hình chữ nhật như boundaryGeometry cũ", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 200, 100]]);
    const b = group([id.A!, id.B!]);
    const g = computeGroupGeometry(map, b)!;
    const old = boundaryGeometry(map, b)!;
    expect(g.mode).toBe("rectangle");
    expect({ x: g.x, y: g.y, width: g.width, height: g.height, lx: g.labelX, ly: g.labelY }).toEqual({ x: old.x, y: old.y, width: old.width, height: old.height, lx: old.labelX, ly: old.labelY });
    expect(g.regions).toBeUndefined();
  });
});

describe("Chế độ E — nhiều vùng thích nghi (AB2)", () => {
  it("hai cụm xa nhau → hai vùng, nhãn chính ở vùng lớn nhất, vùng phụ có chip cùng màu", () => {
    const { map, id } = build([["A1", "", 200, 0], ["A2", "", 330, 0], ["A3", "", 200, 60], ["B1", "", 1500, 800]]);
    const g = computeGroupGeometry(map, group([id.A1!, id.A2!, id.A3!, id.B1!], defaultVisual()))!;
    expect(g.mode).toBe("multiContour");
    expect(g.regions).toHaveLength(2);
    expect(g.regions![0]!.memberIds).toHaveLength(3); // vùng lớn nhất trước
    expect(g.chips!.filter((c) => c.kind === "region")).toHaveLength(1);
    // nhãn chính ngay mép trên của vùng lớn nhất, không che node
    const primary = g.regions![0]!;
    expect(g.labelY + g.labelH / 2).toBeCloseTo(primary.bbox.y);
    // hộp bao tổng gồm cả hai vùng
    expect(g.x).toBeLessThanOrEqual(primary.bbox.x);
    expect(g.x + g.width).toBeGreaterThanOrEqual(1600);
  });

  it("node ngoài nhóm nằm giữa bị tránh: cầu nối không ôm nó", () => {
    const { map, id } = build([["A", "", 200, 0], ["X", "", 350, 0], ["B", "", 500, 0]]);
    // A và B cách nhau 200 (mép-mép), X nằm đúng giữa
    const g = computeGroupGeometry(map, group([id.A!, id.B!], { ...defaultVisual(), connectionGap: 220, padding: 10 }))!;
    const xCenter = { x: 350 + 50, y: 18 };
    expect(g.regions!.some((r) => pointInPolygon(xCenter, r.outer))).toBe(false);
    expect(g.regions).toHaveLength(2);
  });

  it("phân mảnh: nhiều vùng → cờ fragmented (chỉ gợi ý, không đổi dữ liệu)", () => {
    const spec: [string, string, number, number][] = [];
    for (let i = 0; i < FRAGMENTED_REGION_COUNT + 1; i++) spec.push([`N${i}`, "", 300 + i * 700, (i % 2) * 500]);
    const { map, id } = build(spec);
    const b = group(spec.map((s) => id[s[0]]!), defaultVisual());
    const before = JSON.stringify(b);
    const g = computeGroupGeometry(map, b)!;
    expect(g.regions!.length).toBe(FRAGMENTED_REGION_COUNT + 1);
    expect(g.fragmented).toBe(true);
    expect(JSON.stringify(b)).toBe(before);
  });

  it("nét nối phụ chỉ có khi bật và có ≥ 2 vùng", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 1200, 0], ["C", "", 200, 700]]);
    const ids = [id.A!, id.B!, id.C!];
    expect(computeGroupGeometry(map, group(ids, defaultVisual()))!.connectors).toEqual([]);
    expect(computeGroupGeometry(map, group(ids, { ...defaultVisual(), showConnectors: true }))!.connectors).toHaveLength(2);
  });

  it("hysteresis qua prevLinks: vùng đệm giữ nguyên trạng thái nối", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 390, 0]]);
    const opts = { ...defaultVisual(), connectionGap: 100 };
    const b = group([id.A!, id.B!], opts);
    const g1 = computeGroupGeometry(map, b)!; // khoảng cách 90 ≤ 100 → nối
    expect(g1.regions).toHaveLength(1);
    (map.nodes[id.B!] as MindNode).x = 410; // khoảng cách 110: trong vùng đệm (100–125)
    const stay = computeGroupGeometry(map, b, { prevLinks: g1.links })!;
    expect(stay.regions).toHaveLength(1);
    expect(computeGroupGeometry(map, b)!.regions).toHaveLength(2); // không có trí nhớ → tách
    (map.nodes[id.B!] as MindNode).x = 440; // 140 ≥ 125 → tách dù có trí nhớ
    expect(computeGroupGeometry(map, b, { prevLinks: stay.links })!.regions).toHaveLength(2);
  });
});

describe("Thu gọn / mở rộng (AB1 + AB2 — §4)", () => {
  const setup = () => build([["A", "", 200, 0], ["A1", "A", 400, 0], ["A2", "A", 400, 60], ["B", "", 200, 400], ["B1", "B", 400, 400]]);

  it("thu gọn nhánh chứa một phần thành viên: vùng chỉ ôm node đang hiện, chip ▣ N ở đại diện, không dùng toạ độ node ẩn", () => {
    const { map, id } = setup();
    collapse(map, id.A!);
    // node ẩn vẫn còn toạ độ cũ ở (400,0)/(400,60) — không được dùng
    const g = computeGroupGeometry(map, group([id.A1!, id.A2!, id.B1!], defaultVisual()))!;
    expect(g.regions).toHaveLength(1);
    expect(g.regions![0]!.memberIds).toEqual([id.B1!]);
    expect(g.regions![0]!.bbox.y).toBeGreaterThan(300); // không kéo lên tới toạ độ cũ của A1/A2
    const chip = g.chips!.find((c) => c.kind === "hidden")!;
    expect(chip.text).toBe("▣ 2");
    expect(chip.nodeId).toBe(id.A);
    expect(chip.x + chip.w).toBeCloseTo(200 + 100); // góc trên-phải node A
  });

  it("đại diện cũng là thành viên: vùng ôm node đại diện, chip '+N'", () => {
    const { map, id } = setup();
    collapse(map, id.A!);
    const g = computeGroupGeometry(map, group([id.A!, id.A1!], defaultVisual()))!;
    expect(g.regions![0]!.memberIds).toEqual([id.A!]);
    expect(g.chips!.find((c) => c.kind === "hidden")!.text).toBe("+1");
  });

  it("mọi thành viên đều ẩn: không có vùng nhưng nhóm vẫn có hình học (nhãn + chip) để chọn; dữ liệu còn nguyên", () => {
    const { map, id } = setup();
    collapse(map, id.A!);
    const b = group([id.A1!, id.A2!], defaultVisual());
    const g = computeGroupGeometry(map, b)!;
    expect(g.regions).toEqual([]);
    expect(g.chips).toHaveLength(1);
    expect(hitTestGroup(g, g.labelX + 5, g.labelY + 5, 6)).toBe(true);
    expect(hitTestGroup(g, g.chips![0]!.x + 3, g.chips![0]!.y + 3, 6)).toBe(true);
    expect(b.nodeIds).toEqual([id.A1!, id.A2!]);
    // chế độ F cũng vậy
    expect(computeGroupGeometry(map, group([id.A1!, id.A2!], defaultVisual("distributed")))!.chips).toHaveLength(1);
  });

  it("hai đại diện ở hai nhánh xa nhau: hai chip", () => {
    const { map, id } = setup();
    collapse(map, id.A!);
    collapse(map, id.B!);
    const g = computeGroupGeometry(map, group([id.A1!, id.B1!], defaultVisual()))!;
    expect(g.chips!.filter((c) => c.kind === "hidden").map((c) => c.nodeId).sort()).toEqual([id.A!, id.B!].sort());
  });

  it("mở lại nhánh: chip biến mất, vùng ôm lại node vừa hiện", () => {
    const { map, id } = setup();
    collapse(map, id.A!);
    (map.nodes[id.A!] as MindNode).collapsed = false;
    const g = computeGroupGeometry(map, group([id.A1!, id.A2!, id.B1!], defaultVisual()))!;
    expect(g.chips!.filter((c) => c.kind === "hidden")).toHaveLength(0);
    expect(g.regions!.flatMap((r) => r.memberIds).sort()).toEqual([id.A1!, id.A2!, id.B1!].sort());
  });

  it("id thành viên không còn tồn tại: bỏ qua, không lỗi; nhóm rỗng hẳn → null", () => {
    const { map, id } = setup();
    expect(computeGroupGeometry(map, group([id.A1!, "ma-ton-tai"], defaultVisual()))!.regions).toHaveLength(1);
    expect(computeGroupGeometry(map, group(["ma-ton-tai"], defaultVisual()))).toBeNull();
  });
});

describe("Chế độ F — phân tán (AB3)", () => {
  it("không có vùng nền khổng lồ: mỗi thành viên có viền riêng, nhãn ở thành viên đầu theo thứ tự đọc", () => {
    const { map, id } = build([["A", "", 200, 300], ["B", "", 1200, 0], ["C", "", 600, 800]]);
    const g = computeGroupGeometry(map, group([id.A!, id.B!, id.C!], defaultVisual("distributed")))!;
    expect(g.mode).toBe("distributed");
    expect(g.regions).toEqual([]);
    expect(g.memberOutlines).toHaveLength(3);
    expect(g.memberOutlines!.every((o) => o.width === 108 && o.height === 44)).toBe(true);
    expect(g.labelX).toBe(1200 - 4); // thành viên cao nhất (y nhỏ nhất)
  });

  it("nét nối phụ bằng cây khung nhỏ nhất (n−1 đoạn), mặc định tắt", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 900, 0], ["C", "", 200, 500]]);
    const ids = [id.A!, id.B!, id.C!];
    expect(computeGroupGeometry(map, group(ids, defaultVisual("distributed")))!.connectors).toEqual([]);
    expect(computeGroupGeometry(map, group(ids, { ...defaultVisual("distributed"), showConnectors: true }))!.connectors).toHaveLength(2);
  });

  it("Rectangle → E → F → E: thành viên/nhãn/màu không đổi, hình học đổi theo kiểu", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 330, 0]]);
    const b = group([id.A!, id.B!], undefined, "Giữ nguyên");
    const modes = [undefined, defaultVisual(), defaultVisual("distributed"), defaultVisual()].map((v) => {
      const bb = { ...b, ...(v ? { visual: v } : {}) };
      return computeGroupGeometry(map, bb)!.mode;
    });
    expect(modes).toEqual(["rectangle", "multiContour", "distributed", "multiContour"]);
    expect(b.nodeIds).toEqual([id.A, id.B]);
  });
});

describe("Hit-test nhóm (AB2/AB3 — §8.11)", () => {
  it("E: trúng nhãn, chip, sát viền; KHÔNG trúng vùng nền bên trong (để marquee/pan/chọn node hoạt động)", () => {
    const { map, id } = build([["A", "", 200, 100], ["B", "", 200, 220]]);
    const g = computeGroupGeometry(map, group([id.A!, id.B!], { ...defaultVisual(), connectionGap: 100 }))!;
    const r = g.regions![0]!;
    const tol = 8;
    expect(hitTestGroup(g, g.labelX + 5, g.labelY + 5, tol)).toBe(true);
    // giữa cạnh dài nhất của vòng ngoài (cạnh trái của node A: x = bbox.x), lệch 2px vào trong / 6px ra ngoài / 30px ra ngoài
    const topLeft = { x: r.bbox.x, y: 100 - 24 + 20 };
    expect(hitTestGroup(g, topLeft.x + 2, topLeft.y, tol)).toBe(true); // sát viền trái
    expect(hitTestGroup(g, topLeft.x - 6, topLeft.y, tol)).toBe(true); // ngoài viền trong dung sai
    expect(hitTestGroup(g, topLeft.x - 30, topLeft.y, tol)).toBe(false);
    expect(hitTestGroup(g, 250, 190, tol)).toBe(false); // khoảng trống giữa hai node, ở trong vùng
    expect(hitTestGroup(g, 250, 118, tol)).toBe(false); // ngay trên thân node (không phải viền nhóm)
  });

  it("dung sai theo màn hình: cùng điểm, zoom nhỏ (dung sai thế giới lớn) trúng, zoom lớn thì không", () => {
    const { map, id } = build([["A", "", 200, 100]]);
    const g = computeGroupGeometry(map, group([id.A!], defaultVisual()))!;
    const edge = g.regions![0]!.bbox;
    const p = { x: edge.x - 12, y: edge.y + edge.height / 2 };
    expect(hitTestGroup(g, p.x, p.y, 8 / 0.3)).toBe(true); // zoom 30%
    expect(hitTestGroup(g, p.x, p.y, 8 / 2)).toBe(false); // zoom 200%
  });

  it("F: trúng viền quanh thành viên và nhãn; không trúng khoảng trống giữa các thành viên xa", () => {
    const { map, id } = build([["A", "", 200, 100], ["B", "", 1000, 100]]);
    const g = computeGroupGeometry(map, group([id.A!, id.B!], defaultVisual("distributed")))!;
    const o = g.memberOutlines![0]!;
    expect(hitTestGroup(g, o.x + 3, o.y + o.height / 2, 8)).toBe(true);
    expect(hitTestGroup(g, g.labelX + 3, g.labelY + 3, 8)).toBe(true);
    expect(hitTestGroup(g, 600, 118, 8)).toBe(false);
  });

  it("nhóm cũ (hình chữ nhật): trúng sát viền và nhãn, không trúng giữa", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 200, 100]]);
    const g = computeGroupGeometry(map, group([id.A!, id.B!]))!;
    expect(hitTestGroup(g, g.x + 2, g.y + g.height / 2, 6)).toBe(true);
    expect(hitTestGroup(g, g.x + g.width / 2, g.y + g.height / 2, 6)).toBe(false);
  });
});

describe("Một node thuộc hai nhóm (AB1 — §8.7)", () => {
  it("hai nhóm cùng chứa node: mỗi nhóm có hình học riêng, không ảnh hưởng nhau", () => {
    const { map, id } = build([["A", "", 200, 0], ["B", "", 330, 0], ["C", "", 1200, 0]]);
    const g1 = computeGroupGeometry(map, { ...group([id.A!, id.B!], defaultVisual(), "Một"), id: "b1" })!;
    const g2 = computeGroupGeometry(map, { ...group([id.B!, id.C!], defaultVisual(), "Hai"), id: "b2" })!;
    expect(g1.regions).toHaveLength(1);
    expect(g2.regions).toHaveLength(2);
    expect(g1.regions![0]!.memberIds).toContain(id.B);
    expect(g2.regions!.flatMap((r) => r.memberIds)).toContain(id.B);
  });
});
