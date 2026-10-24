import { describe, expect, it } from "vitest";
import type { ChartData } from "../core/chartData";
import { buildChartModel, chartToSvg, niceScale, type Prim } from "./chartModel";

const data = (values: (number | null)[][], labels = values[0]!.map((_, i) => `L${i + 1}`)): ChartData => ({
  labels,
  series: values.map((v, i) => ({ name: `S${i + 1}`, column: i + 1, values: v })),
});
const count = (items: Prim[], t: Prim["t"]): number => items.filter((p) => p.t === t).length;

describe("niceScale", () => {
  it("làm tròn theo 1/2/5", () => {
    expect(niceScale(0, 97)).toEqual({ min: 0, max: 100, step: 50 });
    expect(niceScale(0, 7, 4)).toMatchObject({ min: 0, max: 8, step: 2 });
    expect(niceScale(-3, 12, 4).min).toBeLessThanOrEqual(-3);
  });
  it("khoảng suy biến vẫn có độ rộng", () => {
    const s = niceScale(5, 5);
    expect(s.max).toBeGreaterThan(s.min);
  });
});

describe("buildChartModel", () => {
  it("bar: mỗi giá trị số một cột, bỏ qua null, cột dương nằm trên đường 0", () => {
    const m = buildChartModel(data([[10, null, 30]]), "bar", 300, 200);
    const bars = m.items.filter((p): p is Extract<Prim, { t: "rect" }> => p.t === "rect");
    expect(bars).toHaveLength(2);
    expect(bars[1]!.h).toBeGreaterThan(bars[0]!.h);
    expect(m.empty).toBe(false);
  });
  it("bar có giá trị âm: cột âm nằm DƯỚI cột dương", () => {
    const m = buildChartModel(data([[10, -10]]), "bar", 300, 200);
    const [pos, neg] = m.items.filter((p): p is Extract<Prim, { t: "rect" }> => p.t === "rect");
    expect(neg!.y).toBeGreaterThanOrEqual(pos!.y + pos!.h - 0.01);
  });
  it("line: đường gấp khúc ngắt ở ô trống, mỗi điểm một chấm", () => {
    const m = buildChartModel(data([[1, 2, null, 4, 5]]), "line", 300, 200);
    expect(count(m.items, "poly")).toBe(2);
    expect(count(m.items, "dot")).toBe(4);
  });
  it("pie: góc các quạt cộng đủ 2π, bỏ giá trị ≤ 0", () => {
    const m = buildChartModel(data([[1, 2, 3, 0, -4]]), "pie", 300, 200);
    const w = m.items.filter((p): p is Extract<Prim, { t: "wedge" }> => p.t === "wedge");
    expect(w).toHaveLength(3);
    expect(w.reduce((a, p) => a + (p.a1 - p.a0), 0)).toBeCloseTo(Math.PI * 2, 6);
  });
  it("pie một lát vẫn là vòng tròn đầy", () => {
    const m = buildChartModel(data([[5]]), "pie", 200, 200);
    const w = m.items.find((p) => p.t === "wedge") as Extract<Prim, { t: "wedge" }>;
    expect(w.a1 - w.a0).toBeCloseTo(Math.PI * 2, 3);
  });
  it("nhiều chuỗi → có chú giải; compact → không có chữ trục/chú giải/tiêu đề", () => {
    const d = data([[1, 2], [3, 4]]);
    const full = buildChartModel(d, "bar", 300, 200, { title: "Tiêu đề" });
    expect(full.items.some((p) => p.t === "text" && p.text === "S2")).toBe(true);
    expect(full.items.some((p) => p.t === "text" && p.text === "Tiêu đề")).toBe(true);
    const compact = buildChartModel(d, "bar", 200, 90, { title: "Tiêu đề", compact: true });
    expect(count(compact.items, "text")).toBe(0);
  });
  it("không có số liệu → mô hình rỗng có dòng thông báo", () => {
    const m = buildChartModel(data([[null, null]]), "bar", 200, 100);
    expect(m.empty).toBe(true);
    expect(count(m.items, "text")).toBe(1);
  });
  it("mọi toạ độ nằm trong khung", () => {
    for (const kind of ["bar", "line", "pie"] as const) {
      const m = buildChartModel(data([[5, 80, 33, 12], [9, 1, 70, 40]], ["Một", "Hai", "Ba", "Bốn"]), kind, 320, 200, { title: "T" });
      for (const p of m.items) {
        if (p.t === "rect") expect(p.x + p.w).toBeLessThanOrEqual(320.01);
        if (p.t === "rect") expect(p.y + p.h).toBeLessThanOrEqual(200.01);
        if (p.t === "dot") expect(p.x).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("chartToSvg", () => {
  it("SVG hợp lệ, thoát ký tự đặc biệt trong nhãn", () => {
    const svg = chartToSvg(buildChartModel(data([[1, 2]], ["a<b", "c&d"]), "bar", 300, 200));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("a&lt;b");
    expect(svg).toContain("c&amp;d");
    expect(svg.endsWith("</svg>")).toBe(true);
  });
});
