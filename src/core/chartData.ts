/**
 * core/chartData.ts
 * ---------------------------------------------------------------------
 * Lấy SỐ LIỆU của một khối biểu đồ từ bảng nó trỏ tới. Hàm thuần — mọi
 * nơi cần số liệu (vẽ trên node, trong trang card, xuất SVG/Word) đều đi
 * qua đây nên luôn khớp nhau. Ô không phải số → null (bỏ qua, không vẽ).
 * `valueOf` cho phép thay cách đọc ô (sau này: giá trị đã tính của ô công
 * thức) mà không phải sửa chỗ nào khác.
 * ---------------------------------------------------------------------
 */
import type { ChartBlock, TableBlock } from "./types";
import { parseNumber } from "./numberParse";

export interface ChartSeries {
  name: string;
  /** Cột nguồn trong bảng. */
  column: number;
  values: (number | null)[];
}
export interface ChartData {
  labels: string[];
  series: ChartSeries[];
}

export type CellValueOf = (table: TableBlock, row: number, col: number) => number | null;

export const rawCellNumber: CellValueOf = (t, r, c) => parseNumber(t.cells[r]?.[c] ?? "");

export function chartDataOf(table: TableBlock, chart: Pick<ChartBlock, "labelColumn" | "seriesColumns">, valueOf: CellValueOf = rawCellNumber): ChartData {
  const first = table.headerRow ? 1 : 0;
  const cols = table.align.length;
  const rows: number[] = [];
  for (let r = first; r < table.cells.length; r++) rows.push(r);
  const labels = rows.map((r) => {
    const t = (table.cells[r]?.[chart.labelColumn] ?? "").trim();
    return t === "" ? String(r - first + 1) : t;
  });
  const series: ChartSeries[] = chart.seriesColumns
    .filter((c) => Number.isInteger(c) && c >= 0 && c < cols)
    .map((column) => {
      const head = table.headerRow ? (table.cells[0]?.[column] ?? "").trim() : "";
      return { name: head || `Cột ${column + 1}`, column, values: rows.map((r) => valueOf(table, r, column)) };
    });
  return { labels, series };
}

/** Biểu đồ có thể vẽ được không (có ít nhất một giá trị số)? */
export function chartHasData(d: ChartData): boolean {
  return d.series.some((s) => s.values.some((v) => v !== null));
}

/** Cột nhãn/cột số liệu mặc định cho một bảng: nhãn = cột 0, số liệu = các cột sau có ít nhất một số
 *  (không có cột nào → cột 1, hoặc cột 0 nếu bảng chỉ có một cột). Luôn hợp lệ với `validateCard`. */
export function defaultChartColumns(table: TableBlock, valueOf: CellValueOf = rawCellNumber): { labelColumn: number; seriesColumns: number[] } {
  const cols = table.align.length;
  const first = table.headerRow ? 1 : 0;
  const numeric: number[] = [];
  for (let c = 1; c < cols; c++) {
    for (let r = first; r < table.cells.length; r++) {
      if (valueOf(table, r, c) !== null) {
        numeric.push(c);
        break;
      }
    }
  }
  if (numeric.length > 0) return { labelColumn: 0, seriesColumns: numeric.slice(0, 6) };
  return { labelColumn: 0, seriesColumns: [cols > 1 ? 1 : 0] };
}
