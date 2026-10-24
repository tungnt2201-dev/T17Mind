import { describe, expect, it } from "vitest";
import { chartDataOf, chartHasData } from "./chartData";
import { tableFromGrid } from "./table";

const table = tableFromGrid("t", [
  ["Tháng", "Doanh thu", "Chi phí"],
  ["T1", "1.200", "800"],
  ["T2", "1.500,5", "abc"],
  ["", "", "700"],
]);

describe("chartDataOf", () => {
  it("nhãn từ cột nhãn, tên chuỗi từ hàng tiêu đề, ô không phải số = null", () => {
    const d = chartDataOf(table, { labelColumn: 0, seriesColumns: [1, 2] });
    expect(d.labels).toEqual(["T1", "T2", "3"]);
    expect(d.series.map((s) => s.name)).toEqual(["Doanh thu", "Chi phí"]);
    expect(d.series[0]!.values).toEqual([1200, 1500.5, null]);
    expect(d.series[1]!.values).toEqual([800, null, 700]);
    expect(chartHasData(d)).toBe(true);
  });
  it("không có hàng tiêu đề: dùng mọi hàng, tên 'Cột N'", () => {
    const t = { ...table, headerRow: false };
    const d = chartDataOf(t, { labelColumn: 0, seriesColumns: [1] });
    expect(d.labels).toHaveLength(4);
    expect(d.series[0]!.name).toBe("Cột 2");
    expect(d.series[0]!.values[0]).toBeNull();
  });
  it("bỏ cột ngoài phạm vi; thay được cách đọc ô", () => {
    const d = chartDataOf(table, { labelColumn: 0, seriesColumns: [1, 9] }, () => 7);
    expect(d.series).toHaveLength(1);
    expect(d.series[0]!.values).toEqual([7, 7, 7]);
  });
  it("toàn chữ → không có dữ liệu", () => {
    const d = chartDataOf(table, { labelColumn: 1, seriesColumns: [0] });
    expect(chartHasData(d)).toBe(false);
  });
});
