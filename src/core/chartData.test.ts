import { describe, expect, it } from "vitest";
import { chartDataOf, chartHasData, defaultChartColumns } from "./chartData";
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

describe("chartDataOf với ô công thức", () => {
  it("biểu đồ đọc giá trị ĐÃ TÍNH; nhãn/tiêu đề cũng lấy kết quả", () => {
    const t = tableFromGrid("t", [
      ["Mục", "A", "B", "Tổng"],
      ["x", "1", "2", "=B2+C2"],
      ["y", "3", "4", "=SUM(B3:C3)"],
      ["z", "5", "oops", "=B4/0"],
    ]);
    const d = chartDataOf(t, { labelColumn: 0, seriesColumns: [3] });
    expect(d.series[0]!.values).toEqual([3, 7, null]); // ô lỗi → null, không vẽ
  });
  it("cột mặc định tính cả cột chỉ có công thức", () => {
    const t = tableFromGrid("t", [["a", "b"], ["x", "=1+1"]]);
    expect(defaultChartColumns(t).seriesColumns).toEqual([1]);
  });
});
