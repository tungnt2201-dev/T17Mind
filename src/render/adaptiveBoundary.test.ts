import { describe, it, expect } from "vitest";
import {
  clusterByLinks,
  computeAdaptiveRegions,
  computeLinks,
  distanceToRegionStroke,
  HYSTERESIS_RATIO,
  loopToPath,
  minimumSpanningSegments,
  pointInPolygon,
  rectDistance,
  signedArea,
  type Pt,
  type Rect,
  type Region,
} from "./adaptiveBoundary";

const R = (id: string, x: number, y: number, w = 100, h = 36): Rect => ({ id, x, y, width: w, height: h });
const OPTS = { padding: 24, connectionGap: 64, smoothness: 0.6 };

/** Mọi góc của mọi node nằm trong một vùng (và không nằm trong lỗ của vùng đó). */
function containsAll(regions: Region[], rects: Rect[]): boolean {
  return rects.every((r) => {
    const corners: Pt[] = [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y },
      { x: r.x, y: r.y + r.height },
      { x: r.x + r.width, y: r.y + r.height },
      { x: r.x + r.width / 2, y: r.y + r.height / 2 },
    ];
    return corners.every((c) => regions.some((g) => (pointInPolygon(c, g.outer) || distanceToRegionStroke(c, g) < 1e-6) && !g.holes.some((h) => pointInPolygon(c, h))));
  });
}
const allFinite = (regions: Region[]): boolean => regions.every((g) => !g.path.includes("NaN") && !g.path.includes("Infinity") && g.outer.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
const validLoops = (g: Region): boolean => signedArea(g.outer) > 0 && g.holes.every((h) => signedArea(h) < 0);

describe("Hình học cơ bản (AB2)", () => {
  it("khoảng cách mép–mép: 0 khi giao/chạm, dùng đường chéo khi lệch cả hai trục", () => {
    expect(rectDistance(R("a", 0, 0), R("b", 50, 10))).toBe(0);
    expect(rectDistance(R("a", 0, 0), R("b", 100, 0))).toBe(0);
    expect(rectDistance(R("a", 0, 0), R("b", 160, 0))).toBe(60);
    expect(rectDistance(R("a", 0, 0, 10, 10), R("b", 13, 14, 10, 10))).toBe(5);
  });

  it("liên kết theo ngưỡng, quét theo trục x cho kết quả giống vét cạn", () => {
    const rects: Rect[] = [];
    for (let i = 0; i < 60; i++) rects.push(R(`n${String(i).padStart(2, "0")}`, (i * 137) % 900, (i * 71) % 500, 60 + (i % 5) * 20, 30));
    const fast = computeLinks(rects, 80);
    const brute = new Set<string>();
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (rectDistance(rects[i]!, rects[j]!) <= 80) brute.add(rects[i]!.id < rects[j]!.id ? `${rects[i]!.id}|${rects[j]!.id}` : `${rects[j]!.id}|${rects[i]!.id}`);
    expect([...fast].sort()).toEqual([...brute].sort());
  });

  it("phân cụm ổn định theo id", () => {
    const rects = [R("c", 1000, 0), R("a", 0, 0), R("b", 120, 0)];
    const clusters = clusterByLinks(rects, computeLinks(rects, 64));
    expect(clusters.map((c) => c.map((r) => r.id).sort())).toEqual([["a", "b"], ["c"]]);
  });
});

describe("Số vùng và độ ôm (AB2 — ma trận §8.1–8.2)", () => {
  it("1 node: một vùng bo tròn quanh node với đệm tối thiểu", () => {
    const rects = [R("a", 200, 100)];
    const { regions } = computeAdaptiveRegions(rects, OPTS);
    expect(regions).toHaveLength(1);
    const g = regions[0]!;
    expect(g.bbox).toEqual({ x: 176, y: 76, width: 148, height: 84 });
    expect(g.path.startsWith("M")).toBe(true);
    expect(g.path).toContain("Q");
    expect(containsAll(regions, rects)).toBe(true);
    expect(g.memberIds).toEqual(["a"]);
  });

  it("2 node gần nhau: một vùng liền; 2 node xa: hai vùng riêng", () => {
    const near = [R("a", 0, 0), R("b", 140, 20)];
    const r1 = computeAdaptiveRegions(near, OPTS).regions;
    expect(r1).toHaveLength(1);
    expect(r1[0]!.memberIds.sort()).toEqual(["a", "b"]);
    expect(containsAll(r1, near)).toBe(true);
    const far = [R("a", 0, 0), R("b", 900, 400)];
    const r2 = computeAdaptiveRegions(far, OPTS).regions;
    expect(r2).toHaveLength(2);
    expect(containsAll(r2, far)).toBe(true);
    // không có vùng khổng lồ phủ khoảng trống giữa hai node
    expect(r2.every((g) => g.bbox.width < 200 && g.bbox.height < 120)).toBe(true);
  });

  it("5 node chia 2 cụm → 2 vùng; 8 node chia 3 cụm → 3 vùng; không cắt node", () => {
    const five = [R("a", 0, 0), R("b", 130, 10), R("c", 60, 70), R("d", 1200, 600), R("e", 1320, 640)];
    const r5 = computeAdaptiveRegions(five, OPTS).regions;
    expect(r5).toHaveLength(2);
    expect(containsAll(r5, five)).toBe(true);
    const eight = [R("a", 0, 0), R("b", 120, 0), R("c", 0, 60), R("d", 900, 0), R("e", 1020, 0), R("f", 900, 60), R("g", 450, 700), R("h", 570, 700)];
    const r8 = computeAdaptiveRegions(eight, OPTS).regions;
    expect(r8).toHaveLength(3);
    expect(containsAll(r8, eight)).toBe(true);
    expect(r8.map((g) => g.memberIds.length).sort()).toEqual([2, 3, 3]);
  });

  it("chữ U và chữ L: đường bao có lõm, không thành hộp bao khổng lồ; không NaN", () => {
    // chữ U: hai cột dọc + đáy
    const U = [R("l1", 0, 0, 80, 36), R("l2", 0, 60, 80, 36), R("l3", 0, 120, 80, 36), R("b", 100, 120, 80, 36), R("r3", 200, 120, 80, 36), R("r2", 200, 60, 80, 36), R("r1", 200, 0, 80, 36)];
    const { regions } = computeAdaptiveRegions(U, { padding: 14, connectionGap: 40, smoothness: 0.5 });
    expect(regions).toHaveLength(1);
    expect(containsAll(regions, U)).toBe(true);
    expect(allFinite(regions)).toBe(true);
    const bb = regions[0]!.bbox;
    const bboxArea = bb.width * bb.height;
    expect(regions[0]!.area).toBeLessThan(bboxArea * 0.85); // phần lõm giữa hai nhánh U bị bỏ ra
    // điểm giữa khoảng trống của chữ U không nằm trong vùng
    expect(pointInPolygon({ x: 140, y: 30 }, regions[0]!.outer)).toBe(false);
    // chữ L
    const L = [R("a", 0, 0, 80, 36), R("b", 0, 60, 80, 36), R("c", 0, 120, 80, 36), R("d", 100, 120, 80, 36), R("e", 200, 120, 80, 36)];
    const rl = computeAdaptiveRegions(L, { padding: 14, connectionGap: 40, smoothness: 0.5 }).regions;
    expect(rl).toHaveLength(1);
    expect(containsAll(rl, L)).toBe(true);
    expect(pointInPolygon({ x: 240, y: 20 }, rl[0]!.outer)).toBe(false); // góc phần tư trên-phải để trống
  });

  it("hình răng lược, node kích thước khác nhau: một vùng, không NaN, vòng hợp lệ", () => {
    const comb = [R("base", 0, 200, 400, 30)];
    for (let i = 0; i < 5; i++) comb.push(R(`t${i}`, i * 90, 20, 50 + i * 6, 30 + i * 12));
    const { regions } = computeAdaptiveRegions(comb, { padding: 12, connectionGap: 200, smoothness: 0.8 });
    expect(allFinite(regions)).toBe(true);
    expect(regions.every(validLoops)).toBe(true);
    expect(containsAll(regions, comb)).toBe(true);
  });

  it("node KHÁC nhóm nằm giữa hai thành viên: cầu nối bị bỏ, không ôm nhầm node ngoài", () => {
    const members = [R("a", 0, 0, 100, 36), R("b", 250, 0, 100, 36)];
    const stranger = [R("x", 140, -10, 70, 60)]; // chặn đúng đường nối giữa a và b
    const { regions } = computeAdaptiveRegions(members, { padding: 12, connectionGap: 200, smoothness: 0.3 }, stranger);
    const strangerCenter = { x: 175, y: 20 };
    expect(regions.some((g) => pointInPolygon(strangerCenter, g.outer) && !g.holes.some((h) => pointInPolygon(strangerCenter, h)))).toBe(false);
    expect(containsAll(regions, members)).toBe(true);
    expect(regions).toHaveLength(2);
    // đối chứng: không có chướng ngại thì nối thành một vùng
    expect(computeAdaptiveRegions(members, { padding: 12, connectionGap: 200, smoothness: 0.3 }).regions).toHaveLength(1);
  });

  it("vòng node bao quanh một node ngoài nhóm: có lỗ, node ngoài nằm trong lỗ", () => {
    const ring: Rect[] = [];
    const cx = 300, cy = 300;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ring.push(R(`r${i}`, cx + Math.cos(a) * 200 - 40, cy + Math.sin(a) * 200 - 15, 80, 30));
    }
    const center = [R("x", cx - 40, cy - 15, 80, 30)];
    const { regions } = computeAdaptiveRegions(ring, { padding: 16, connectionGap: 160, smoothness: 0.4 }, center);
    expect(regions).toHaveLength(1);
    expect(regions[0]!.holes.length).toBe(1);
    expect(pointInPolygon({ x: cx, y: cy }, regions[0]!.holes[0]!)).toBe(true);
    expect(containsAll(regions, ring)).toBe(true);
    expect(allFinite(regions)).toBe(true);
  });

  it("hai node chạm/giao nhau: vẫn một vùng hợp lệ, không dính hình số 8 khi chạm chéo", () => {
    const touch = [R("a", 0, 0, 100, 40), R("b", 100, 40, 100, 40)]; // chạm chéo tại một điểm
    const { regions } = computeAdaptiveRegions(touch, { padding: 10, connectionGap: 8, smoothness: 0 });
    expect(allFinite(regions)).toBe(true);
    expect(regions.every(validLoops)).toBe(true);
    expect(containsAll(regions, touch)).toBe(true);
  });

  it("dữ liệu hỏng (NaN/Infinity) bị bỏ qua; rỗng cho kết quả rỗng", () => {
    expect(computeAdaptiveRegions([], OPTS).regions).toEqual([]);
    const r = computeAdaptiveRegions([R("a", NaN, 0), R("b", 10, 10)], OPTS);
    expect(r.regions).toHaveLength(1);
    expect(allFinite(r.regions)).toBe(true);
  });

  it("smoothness 0 → góc vuông (không có đường cong); lớn hơn → có đường cong", () => {
    expect(computeAdaptiveRegions([R("a", 0, 0)], { ...OPTS, smoothness: 0 }).regions[0]!.path).not.toContain("Q");
    expect(computeAdaptiveRegions([R("a", 0, 0)], { ...OPTS, smoothness: 1 }).regions[0]!.path).toContain("Q");
    expect(loopToPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], 0)).toBe("M0 0 L10 0 L10 10 L0 10 Z");
  });

  it("kết quả xác định: cùng đầu vào (thứ tự khác) cho đường bao y hệt", () => {
    const rects = [R("a", 0, 0), R("b", 130, 30), R("c", 700, 0), R("d", 40, 90)];
    const a = computeAdaptiveRegions(rects, OPTS).regions.map((g) => g.path);
    const b = computeAdaptiveRegions([...rects].reverse(), OPTS).regions.map((g) => g.path);
    expect(b).toEqual(a);
  });
});

describe("Hysteresis chống nhấp nháy (AB2 — §8.4)", () => {
  it("cặp đang nối chỉ tách khi khoảng cách ≥ 1,25 × ngưỡng; cặp chưa nối chỉ nối khi ≤ ngưỡng", () => {
    const gap = 100;
    const at = (d: number): Rect[] => [R("a", 0, 0), R("b", 100 + d, 0)];
    // vùng đệm: d = 110 (giữa gap và 1,25 gap)
    const fresh = computeAdaptiveRegions(at(110), { ...OPTS, connectionGap: gap });
    expect(fresh.regions).toHaveLength(2); // chưa nối → vẫn tách
    const connected = computeAdaptiveRegions(at(90), { ...OPTS, connectionGap: gap });
    expect(connected.regions).toHaveLength(1);
    const stillJoined = computeAdaptiveRegions(at(110), { ...OPTS, connectionGap: gap }, [], connected.links);
    expect(stillJoined.links.size).toBe(1); // giữ liên kết trong vùng đệm
    const split = computeAdaptiveRegions(at(gap * HYSTERESIS_RATIO + 1), { ...OPTS, connectionGap: gap }, [], stillJoined.links);
    expect(split.links.size).toBe(0);
  });

  it("kéo node qua lại quanh ngưỡng nhiều lần: số lần đổi trạng thái nối/tách ít hơn không có hysteresis", () => {
    const gap = 100;
    const path = [90, 105, 95, 110, 98, 112, 99, 108, 97, 111, 96, 109];
    const flips = (useHysteresis: boolean): number => {
      let prev: Set<string> | undefined;
      let state: boolean | null = null;
      let flipCount = 0;
      for (const d of path) {
        const res = computeAdaptiveRegions([R("a", 0, 0), R("b", 100 + d, 0)], { ...OPTS, connectionGap: gap }, [], useHysteresis ? prev : undefined);
        const joined = res.links.size === 1;
        if (state !== null && joined !== state) flipCount++;
        state = joined;
        prev = res.links;
      }
      return flipCount;
    };
    expect(flips(false)).toBeGreaterThan(4);
    expect(flips(true)).toBeLessThanOrEqual(1);
  });
});

describe("Hit-test viền và cây khung (AB2)", () => {
  it("khoảng cách tới viền: 0 trên viền, đo được ở trong/ngoài", () => {
    const g = computeAdaptiveRegions([R("a", 100, 100)], { ...OPTS, smoothness: 0 }).regions[0]!;
    expect(distanceToRegionStroke({ x: g.bbox.x, y: g.bbox.y + 30 }, g)).toBeCloseTo(0);
    expect(distanceToRegionStroke({ x: g.bbox.x - 10, y: g.bbox.y + 30 }, g)).toBeCloseTo(10);
    expect(distanceToRegionStroke({ x: g.bbox.x + g.bbox.width / 2, y: g.bbox.y + 40 }, g)).toBeCloseTo(40);
  });

  it("cây khung nhỏ nhất nối n phần tử bằng n−1 đoạn, nối cặp gần nhất", () => {
    const items = [R("a", 0, 0), R("b", 300, 0), R("c", 150, 400)];
    const segs = minimumSpanningSegments(items);
    expect(segs).toHaveLength(2);
    expect(minimumSpanningSegments([R("a", 0, 0)])).toEqual([]);
  });
});

describe("Hiệu năng và rơi về hộp bao (AB2 — §8.13)", () => {
  it("150 node, nhiều cụm: dưới ngưỡng thực tế; vùng đúng; không mất node", () => {
    const rects: Rect[] = [];
    for (let c = 0; c < 6; c++) for (let i = 0; i < 25; i++) rects.push(R(`c${c}n${String(i).padStart(2, "0")}`, c * 1400 + (i % 5) * 130, Math.floor(i / 5) * 60 + (i % 3) * 7, 100 + (i % 4) * 10, 36));
    const t0 = performance.now();
    const res = computeAdaptiveRegions(rects, { padding: 24, connectionGap: 64, smoothness: 0.6 });
    const ms = performance.now() - t0;
    expect(res.regions.length).toBe(6);
    expect(containsAll(res.regions, rects)).toBe(true);
    expect(allFinite(res.regions)).toBe(true);
    expect(ms).toBeLessThan(1500); // ngưỡng rộng để không phụ thuộc máy; số đo thật ghi trong DEVLOG
  });

  it("quality = fast hoặc quá nhiều hình: rơi về hộp bao từng cụm, vẫn chứa đủ node", () => {
    const rects = [R("a", 0, 0), R("b", 130, 0), R("c", 1000, 0)];
    const fast = computeAdaptiveRegions(rects, { ...OPTS, quality: "fast" });
    expect(fast.approximate).toBe(true);
    expect(fast.regions).toHaveLength(2);
    expect(containsAll(fast.regions, rects)).toBe(true);
    const many: Rect[] = [];
    for (let i = 0; i < 800; i++) many.push(R(`m${String(i).padStart(4, "0")}`, (i % 40) * 120, Math.floor(i / 40) * 60));
    const big = computeAdaptiveRegions(many, OPTS);
    expect(big.approximate).toBe(true);
    expect(containsAll(big.regions, many)).toBe(true);
  });
});
