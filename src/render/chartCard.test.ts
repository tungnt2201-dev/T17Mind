import { describe, expect, it } from "vitest";
import { createEmptyMap } from "../core/tree";
import { createCard, createChartBlock, createChartForCard, createTableBlock } from "../core/cards";
import { validateCard } from "../core/cards";
import { defaultChartColumns } from "../core/chartData";
import { tableFromGrid } from "../core/table";
import type { MindMap, MindNode } from "../core/types";
import { cardContentOf, hitCardPart, measureCard, placeCard, CHART_THUMB_H, CHART_THUMB_MIN_H, CHART_THUMB_W, type Wrap } from "./cardLayout";
import { THUMB_PAD } from "./tableThumb";

const wrap: Wrap = (t) => [t];

function mapWithChart(): { map: MindMap; node: MindNode } {
  const map = createEmptyMap("Gốc");
  const card = createCard("C");
  const t = tableFromGrid("tb", [["Tháng", "Thu", "Chi"], ["T1", "10", "5"], ["T2", "20", "8"]]);
  card.blocks = [t];
  const chart = createChartForCard(card)!;
  card.blocks.push(chart);
  map.cards[card.id] = card;
  const node = map.nodes[map.rootId]!;
  node.cardId = card.id;
  return { map, node };
}

describe("KW4 — biểu đồ mặc định theo bảng", () => {
  it("chọn các cột có số làm chuỗi, cột 0 làm nhãn", () => {
    const t = tableFromGrid("t", [["Tên", "SL", "Ghi chú", "Giá"], ["a", "1", "x", "2"], ["b", "3", "y", "4"]]);
    expect(defaultChartColumns(t)).toEqual({ labelColumn: 0, seriesColumns: [1, 3] });
  });
  it("không có cột số → cột 1; bảng một cột → cột 0; card không có bảng → null", () => {
    expect(defaultChartColumns(tableFromGrid("t", [["a", "b"], ["x", "y"]])).seriesColumns).toEqual([1]);
    expect(defaultChartColumns(tableFromGrid("t", [["a"], ["x"]])).seriesColumns).toEqual([0]);
    expect(createChartForCard(createCard("C"))).toBeNull();
  });
  it("biểu đồ sinh ra luôn hợp lệ với validateCard", () => {
    const { map } = mapWithChart();
    const card = Object.values(map.cards)[0]!;
    expect(validateCard(card, map.assets)).toEqual([]);
  });
});

describe("KW4 — thẻ biểu đồ trên node", () => {
  it("cardContentOf tìm được biểu đồ cùng bảng nguồn; bỏ qua biểu đồ mồ côi", () => {
    const { map, node } = mapWithChart();
    expect(cardContentOf(map, node)!.chart?.table.id).toBe("tb");
    const card = map.cards[node.cardId!]!;
    card.blocks = [createChartBlock("khong-co")];
    expect(cardContentOf(map, node)!.chart).toBeNull();
  });
  it("node tự động cao thêm đúng chiều cao thẻ biểu đồ, và rộng ra đủ chứa nó", () => {
    const { map, node } = mapWithChart();
    const c = cardContentOf(map, node)!;
    const noChart = { ...c, chart: null };
    const withChart = measureCard(c, wrap, null);
    expect(withChart.height - measureCard(noChart, wrap, null).height).toBe(CHART_THUMB_H + THUMB_PAD);
    expect(withChart.width).toBeGreaterThanOrEqual(CHART_THUMB_W + THUMB_PAD * 2);
  });
  it("placeCard đặt biểu đồ dưới bảng, trong node, và bấm trúng trả về 'chart'", () => {
    const { map, node } = mapWithChart();
    const c = cardContentOf(map, node)!;
    const m = measureCard(c, wrap, null);
    const n = { x: 0, y: 0, width: m.width, height: m.height + 30, manualWidth: null, manualHeight: null };
    const p = placeCard(c, n, 30, 0, wrap);
    expect(p.mode).toBe("full");
    expect(p.chart).not.toBeNull();
    const r = p.chart!.rect;
    expect(r.y + r.height).toBeLessThanOrEqual(n.height);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.height).toBe(CHART_THUMB_H);
    expect(p.table!.rect.y + p.table!.rect.height).toBeLessThanOrEqual(r.y + 0.01);
    expect(hitCardPart(p, r.x + r.width / 2, r.y + r.height / 2)).toMatchObject({ kind: "chart", blockId: p.chart!.block.id });
  });
  it("node kéo thấp: biểu đồ co lại nhưng không dưới mức tối thiểu; quá thấp thì chuyển sang biểu tượng", () => {
    const { map, node } = mapWithChart();
    const c = cardContentOf(map, node)!;
    const mid = placeCard(c, { x: 0, y: 0, width: 260, height: 190, manualWidth: 260, manualHeight: 190 }, 30, 0, wrap);
    if (mid.mode === "full" && mid.chart) {
      expect(mid.chart.rect.height).toBeGreaterThanOrEqual(CHART_THUMB_MIN_H);
      expect(mid.chart.rect.height).toBeLessThanOrEqual(CHART_THUMB_H);
    }
    const tiny = placeCard(c, { x: 0, y: 0, width: 260, height: 70, manualWidth: 260, manualHeight: 70 }, 30, 0, wrap);
    expect(tiny.mode).toBe("compact");
    expect(tiny.chips.some((ch) => ch.kind === "chart")).toBe(true);
  });
  it("khối bảng không đổi khi thêm biểu đồ (hồi quy)", () => {
    const map = createEmptyMap("G");
    const card = createCard("C");
    card.blocks = [createTableBlock(2, 2)];
    map.cards[card.id] = card;
    map.nodes[map.rootId]!.cardId = card.id;
    expect(cardContentOf(map, map.nodes[map.rootId]!)!.chart).toBeNull();
  });
});

describe("thẻ bảng trên node với ô công thức", () => {
  it("tableThumbnail hiện kết quả; ô lỗi hiện mã lỗi; dữ liệu gốc giữ nguyên", async () => {
    const { tableThumbnail } = await import("../core/table");
    const t = tableFromGrid("t", [["a", "b"], ["10", "=A2*2"], ["1", "=1/0"]]);
    const th = tableThumbnail(t);
    expect(th.cells[1]![1]).toBe("20");
    expect(th.cells[2]![1]).toBe("#DIV/0");
    expect(t.cells[1]![1]).toBe("=A2*2");
  });
});
