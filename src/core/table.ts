/**
 * core/table.ts
 * ---------------------------------------------------------------------
 * M2 (Bảng biểu) — hàm THUẦN để sửa TableBlock trong trình sửa bảng,
 * đọc/ghi TSV/CSV (dán từ Excel/Google Sheets, nhập/xuất CSV), điều
 * hướng ô bằng Tab/Enter và cắt bảng thành thẻ thu nhỏ.
 *
 * Trình sửa bảng làm việc trên một BẢN NHÁP (TableDraft) — mọi hàm ở
 * đây trả về bản nháp MỚI, không sửa bản cũ. Chỉ khi bấm "Lưu" mới tạo
 * ĐÚNG MỘT UpdateTableCommand (core/cardCommands.ts), nên cả phiên sửa
 * là một bước hoàn tác — cùng tinh thần với ô ghi chú (P2.3).
 *
 * `colOrigin[i]` = cột i của bản nháp đến từ cột nào của bảng gốc (null
 * = cột mới chèn). UpdateTableCommand dùng nó để biểu đồ lấy số từ bảng
 * này vẫn trỏ đúng cột sau khi chèn/xoá cột.
 * ---------------------------------------------------------------------
 */
import type { ChartBlock, TableAlign, TableBlock } from "./types";
import { deepClone } from "./tree";

/** Giới hạn kích thước để một lần dán nhầm cả trang tính không làm đơ app. */
export const TABLE_MAX_ROWS = 1000;
export const TABLE_MAX_COLS = 100;

export interface TableDraft {
  table: TableBlock;
  colOrigin: (number | null)[];
}

export function createDraft(table: TableBlock): TableDraft {
  return { table: deepClone(table), colOrigin: table.align.map((_, i) => i) };
}

function withTable(d: TableDraft, patch: Partial<TableBlock>, colOrigin = d.colOrigin): TableDraft {
  return { table: { ...d.table, ...patch }, colOrigin };
}

const colCount = (t: TableBlock): number => t.align.length;
const clampIndex = (i: number, max: number): number => Math.max(0, Math.min(Math.floor(i), max));

export function setCell(d: TableDraft, r: number, c: number, value: string): TableDraft {
  if (d.table.cells[r]?.[c] === undefined || d.table.cells[r]![c] === value) return d;
  const cells = d.table.cells.map((row, i) => (i === r ? row.map((v, j) => (j === c ? value : v)) : row));
  return withTable(d, { cells });
}

export function setAlign(d: TableDraft, c: number, align: TableAlign): TableDraft {
  if (c < 0 || c >= colCount(d.table)) return d;
  return withTable(d, { align: d.table.align.map((a, i) => (i === c ? align : a)) });
}

export function setHeaderRow(d: TableDraft, headerRow: boolean): TableDraft {
  return withTable(d, { headerRow });
}

export function setTitle(d: TableDraft, title: string): TableDraft {
  return withTable(d, { title });
}

/** Chèn một hàng trống tại vị trí `at` (0 = trên cùng, rows = cuối). */
export function insertRow(d: TableDraft, at: number): TableDraft {
  if (d.table.cells.length >= TABLE_MAX_ROWS) return d;
  const cells = d.table.cells.slice();
  cells.splice(clampIndex(at, cells.length), 0, Array.from({ length: colCount(d.table) }, () => ""));
  return withTable(d, { cells });
}

/** Xoá hàng `at` — luôn giữ lại ít nhất 1 hàng. */
export function deleteRow(d: TableDraft, at: number): TableDraft {
  if (d.table.cells.length <= 1 || at < 0 || at >= d.table.cells.length) return d;
  return withTable(d, { cells: d.table.cells.filter((_, i) => i !== at) });
}

/** Chèn một cột trống tại vị trí `at` (0 = trái cùng, cols = cuối). */
export function insertColumn(d: TableDraft, at: number): TableDraft {
  const cols = colCount(d.table);
  if (cols >= TABLE_MAX_COLS) return d;
  const i = clampIndex(at, cols);
  const ins = <T>(arr: T[], v: T): T[] => [...arr.slice(0, i), v, ...arr.slice(i)];
  return withTable(
    d,
    { align: ins<TableAlign>(d.table.align, "left"), cells: d.table.cells.map((row) => ins(row, "")) },
    ins<number | null>(d.colOrigin, null)
  );
}

/** Xoá cột `at` — luôn giữ lại ít nhất 1 cột. */
export function deleteColumn(d: TableDraft, at: number): TableDraft {
  const cols = colCount(d.table);
  if (cols <= 1 || at < 0 || at >= cols) return d;
  const del = <T>(arr: T[]): T[] => arr.filter((_, j) => j !== at);
  return withTable(d, { align: del(d.table.align), cells: d.table.cells.map(del) }, del(d.colOrigin));
}

/**
 * Dán một lưới chữ (từ Excel/Sheets) với ô trên-trái tại (r, c); bảng tự
 * nở thêm hàng/cột nếu lưới tràn ra ngoài (trong giới hạn TABLE_MAX_*).
 * `clipped` = true nếu một phần lưới bị cắt bỏ vì vượt giới hạn.
 */
export function pasteGrid(d: TableDraft, r: number, c: number, grid: string[][]): { draft: TableDraft; clipped: boolean } {
  if (grid.length === 0) return { draft: d, clipped: false };
  const gridCols = Math.max(...grid.map((row) => row.length));
  const needRows = Math.min(TABLE_MAX_ROWS, Math.max(d.table.cells.length, r + grid.length));
  const needCols = Math.min(TABLE_MAX_COLS, Math.max(colCount(d.table), c + gridCols));
  const clipped = r + grid.length > needRows || c + gridCols > needCols;

  let next = d;
  while (colCount(next.table) < needCols) next = insertColumn(next, colCount(next.table));
  while (next.table.cells.length < needRows) next = insertRow(next, next.table.cells.length);

  const cells = next.table.cells.map((row) => row.slice());
  grid.forEach((gRow, i) => {
    const target = cells[r + i];
    if (!target) return;
    gRow.forEach((v, j) => {
      if (c + j < needCols) target[c + j] = v;
    });
  });
  return { draft: withTable(next, { cells }), clipped };
}

/** Bảng mới từ một lưới chữ (nhập CSV) — tự đệm cho đủ hình chữ nhật. */
export function tableFromGrid(id: string, grid: string[][], title = ""): TableBlock {
  const rows = grid.slice(0, TABLE_MAX_ROWS);
  const widest = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const cols = Math.max(1, Math.min(TABLE_MAX_COLS, widest));
  const source = rows.length > 0 ? rows : [[]];
  return {
    id,
    type: "table",
    title,
    headerRow: true,
    align: Array.from({ length: cols }, (): TableAlign => "left"),
    cells: source.map((r) => Array.from({ length: cols }, (_, j) => r[j] ?? "")),
  };
}

/** Thay TOÀN BỘ nội dung bảng bằng lưới mới (nhập CSV trong trình sửa),
 *  giữ id/tiêu đề/hàng tiêu đề; cột i mới coi là nối tiếp cột i cũ (để
 *  biểu đồ vẫn trỏ cùng vị trí cột), căn lề cột cũ giữ nguyên. */
export function replaceWithGrid(d: TableDraft, grid: string[][]): TableDraft {
  const fresh = tableFromGrid(d.table.id, grid, d.table.title);
  const align = fresh.align.map((a, i) => d.table.align[i] ?? a);
  const colOrigin = fresh.align.map((_, i) => d.colOrigin[i] ?? null);
  return { table: { ...fresh, headerRow: d.table.headerRow, align }, colOrigin };
}

// ---------------------------------------------------------------------
// TSV / CSV
// ---------------------------------------------------------------------

/**
 * Tách chuỗi TSV/CSV thành lưới chữ. Hiểu dấu ngoặc kép kiểu Excel
 * ("a""b", ô có xuống dòng hoặc dấu phân cách bên trong), CRLF, và bỏ
 * dòng trống cuối cùng (Excel luôn thêm "\r\n" ở cuối khi copy).
 * `delimiter` không truyền = tự đoán (xem detectDelimiter).
 * Kết quả luôn hình chữ nhật (đệm "" cho hàng ngắn).
 */
export function parseDelimited(text: string, delimiter?: "\t" | "," | ";"): string[][] {
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let atCellStart = true;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && atCellStart) {
      inQuotes = true;
      atCellStart = false;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
      atCellStart = true;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      atCellStart = true;
    } else {
      cell += ch;
      atCellStart = false;
    }
  }
  if (!atCellStart || row.length > 0 || inQuotes) {
    row.push(cell);
    rows.push(row);
  }
  const cols = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => (r.length < cols ? [...r, ...Array.from({ length: cols - r.length }, () => "")] : r));
}

/** Đoán dấu phân cách: có Tab → TSV (dán từ Excel/Sheets); không thì so
 *  "," với ";" ở dòng đầu — Excel cài đặt vùng Việt Nam/châu Âu xuất CSV
 *  bằng ";" vì "," đã là dấu thập phân. */
export function detectDelimiter(text: string): "\t" | "," | ";" {
  if (text.includes("\t")) return "\t";
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string): number => firstLine.split(ch).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

/** Ngược lại với parseDelimited: ô chứa dấu phân cách/ngoặc kép/xuống
 *  dòng được bọc ngoặc kép (Excel và Google Sheets đều đọc đúng). */
export function toDelimited(cells: string[][], delimiter: "\t" | "," | ";" = ","): string {
  const needsQuote = (v: string): boolean => v.includes(delimiter) || v.includes('"') || v.includes("\n") || v.includes("\r");
  return cells.map((row) => row.map((v) => (needsQuote(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(delimiter)).join("\r\n");
}

/** Chuỗi dán có phải là một lưới (nhiều ô) không — chỉ khi đó trình sửa
 *  bảng mới tự rải ra nhiều ô; dán một chữ đơn thì để ô nhập tự xử lý. */
export function isGridText(text: string): boolean {
  const body = text.replace(/[\r\n]+$/, "");
  return body.includes("\t") || body.includes("\n") || body.includes("\r");
}

// ---------------------------------------------------------------------
// Điều hướng ô (Tab / Enter)
// ---------------------------------------------------------------------

export type CellNavKey = "tab" | "shift-tab" | "enter" | "shift-enter";

/**
 * Ô kế tiếp khi bấm Tab/Enter trong trình sửa bảng (giống Excel/Word):
 * Tab sang phải, hết hàng thì xuống đầu hàng sau; Enter xuống dưới.
 * Tab ở ô cuối cùng / Enter ở hàng cuối → `addRow: true` (nơi gọi chèn
 * một hàng mới rồi mới chuyển tới ô trả về). Shift đi ngược lại và
 * dừng ở mép bảng.
 */
export function nextCell(r: number, c: number, rows: number, cols: number, key: CellNavKey): { r: number; c: number; addRow: boolean } {
  switch (key) {
    case "tab":
      if (c + 1 < cols) return { r, c: c + 1, addRow: false };
      return { r: r + 1, c: 0, addRow: r + 1 >= rows };
    case "shift-tab":
      if (c > 0) return { r, c: c - 1, addRow: false };
      return r > 0 ? { r: r - 1, c: cols - 1, addRow: false } : { r, c, addRow: false };
    case "enter":
      return { r: r + 1, c, addRow: r + 1 >= rows };
    case "shift-enter":
      return { r: Math.max(0, r - 1), c, addRow: false };
  }
}

// ---------------------------------------------------------------------
// Biểu đồ phụ thuộc + thẻ thu nhỏ
// ---------------------------------------------------------------------

/**
 * Sau khi cột của bảng nguồn bị chèn/xoá, đưa các cột biểu đồ đang dùng
 * về đúng vị trí mới theo `colOrigin` (xem đầu file). Cột số liệu đã bị
 * xoá thì bỏ; cột nhãn bị xoá thì về cột 0; nếu không còn cột số liệu
 * nào thì lấy cột đầu tiên khác cột nhãn (để biểu đồ luôn hợp lệ).
 */
export function remapChartColumns(chart: ChartBlock, colOrigin: (number | null)[]): ChartBlock {
  const cols = colOrigin.length;
  const toNew = (oldCol: number): number | null => {
    const i = colOrigin.indexOf(oldCol);
    return i < 0 ? null : i;
  };
  const labelColumn = toNew(chart.labelColumn) ?? 0;
  let seriesColumns = chart.seriesColumns.map(toNew).filter((c): c is number => c !== null);
  if (seriesColumns.length === 0) seriesColumns = [cols > 1 && labelColumn === 0 ? 1 : 0];
  return { ...chart, labelColumn, seriesColumns };
}

export interface TableThumbnail {
  cells: string[][];
  headerRow: boolean;
  align: TableAlign[];
  moreRows: boolean;
  moreCols: boolean;
}

/** Cắt bảng còn tối đa `maxRows` × `maxCols` ô để vẽ thẻ thu nhỏ trên
 *  node; `moreRows`/`moreCols` báo còn phần bị ẩn (vẽ "…"). */
export function tableThumbnail(t: TableBlock, maxRows = 4, maxCols = 5): TableThumbnail {
  return {
    cells: t.cells.slice(0, maxRows).map((row) => row.slice(0, maxCols)),
    headerRow: t.headerRow,
    align: t.align.slice(0, maxCols),
    moreRows: t.cells.length > maxRows,
    moreCols: t.align.length > maxCols,
  };
}
