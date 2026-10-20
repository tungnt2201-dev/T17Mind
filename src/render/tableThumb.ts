/**
 * render/tableThumb.ts
 * ---------------------------------------------------------------------
 * M2 — hình học "thẻ thu nhỏ" của bảng vẽ trên node (tối đa 5 cột × 4
 * hàng, phần còn lại hiện "…"). Hàm THUẦN, dùng chung cho cả 3 nơi phải
 * khớp nhau tuyệt đối: đo node (getMeasurer), vẽ (drawNode) và dò bấm
 * (hitTestTableThumb) — giống lý do hitTestLinkIcon phải khớp chỗ vẽ 🔗.
 *
 * VỀ HIỆU NĂNG: layout chạy lại sau MỖI thay đổi của store, nên kích
 * thước thẻ lúc ĐO cố tình chỉ phụ thuộc SỐ hàng/cột hiển thị (ô có bề
 * rộng cố định) — không phải đo chữ từng ô, không cần cache cho bước đo.
 * Lúc VẼ, thẻ lấp đầy khoảng trống thật của node (node được kéo to ra thì
 * hiện thêm hàng/cột, ô giãn rộng) — xem thumbLayoutForTable. Phần
 * tốn kém duy nhất (cắt chữ cho vừa ô bằng measureText) được
 * CanvasRenderer cache theo đúng đối tượng TableBlock (WeakMap) — mọi
 * Command sửa bảng đều thay bằng object mới, nên cache tự hết hạn đúng
 * lúc mà không cần xoá tay.
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode, TableBlock } from "../core/types";
import { tableThumbnail, TABLE_DEFAULT_COL_W, type TableThumbnail } from "../core/table";

export const THUMB_MAX_ROWS = 4;
export const THUMB_MAX_COLS = 5;
export const THUMB_CELL_W = 46;
export const THUMB_ROW_H = 15;
/** Cột/hàng "…" báo còn phần bị ẩn. */
export const THUMB_MORE_W = 14;
export const THUMB_MORE_H = 11;
/** Khoảng đệm giữa thẻ và mép node (trái/phải/dưới). */
export const THUMB_PAD = 8;
export const THUMB_FONT = "10px -apple-system, Segoe UI, sans-serif";

/** Bảng đầu tiên trong card của node (null nếu không có card/bảng). */
export function getNodeThumbTable(map: MindMap, node: MindNode): TableBlock | null {
  if (!node.cardId) return null;
  const card = map.cards[node.cardId];
  if (!card) return null;
  for (const b of card.blocks) if (b.type === "table") return b;
  return null;
}

export interface ThumbLayout {
  table: TableBlock;
  thumb: TableThumbnail;
  /** Bề rộng từng cột đang hiện — theo tỉ lệ `table.colWidths` (cột mặc
   *  định 130px trong trình sửa = THUMB_CELL_W trên thẻ), giãn thêm khi
   *  node rộng hơn cần thiết. */
  colW: number[];
  /** Kích thước phần lưới (không kể THUMB_PAD). */
  width: number;
  height: number;
}

/** Hệ số giãn tối đa của cột khi node rộng (cột mặc định tới ~140px). */
export const THUMB_CELL_W_MAX = 140;
const MAX_GROW = THUMB_CELL_W_MAX / THUMB_CELL_W;
/** Cột hẹp nhất trên thẻ (cột rất hẹp trong trình sửa vẫn bấm/đọc được). */
const THUMB_MIN_COL_W = 18;

const baseColW = (editorWidth: number): number =>
  Math.max(THUMB_MIN_COL_W, Math.round((editorWidth * THUMB_CELL_W) / TABLE_DEFAULT_COL_W));

/** Số hàng vừa với `space` px; chừa chỗ cho "…" nếu không hiện hết. */
function fitRows(total: number, space: number, cap: number): number {
  if (total <= cap && Math.floor(space / THUMB_ROW_H) >= total) return Math.max(1, total);
  return Math.max(1, Math.min(total, cap, Math.floor((space - THUMB_MORE_H) / THUMB_ROW_H)));
}

/** Số cột (theo bề rộng gốc từng cột) vừa với `space` px. */
function fitCols(base: number[], space: number, cap: number): number {
  const total = base.length;
  const sumAll = base.reduce((a, b) => a + b, 0);
  if (total <= cap && sumAll <= space) return Math.max(1, total);
  let n = 0;
  let used = 0;
  while (n < Math.min(total, cap) && used + base[n]! + THUMB_MORE_W <= space) used += base[n++]!;
  return Math.max(1, n);
}

/**
 * Bố cục thẻ của một bảng.
 * - Không truyền `box`: kích thước mặc định (tối đa 5×4 ô) — dùng khi ĐO
 *   node tự động.
 * - Có `box` (khoảng trống thật trong node lúc vẽ/dò bấm): hiện nhiều
 *   hàng/cột nhất vừa khung, cột giãn cho kín bề ngang. `capped` = true
 *   giữ trần 5×4 (node tự động — khung chỉ rộng vì chữ tiêu đề dài);
 *   false khi người dùng đã tự kéo node to ra (manualWidth/Height).
 * Cột luôn giữ ĐÚNG TỈ LỆ độ rộng đã chỉnh trong trình sửa bảng; hàng
 * trên thẻ cao đều nhau (thẻ chỉ để nhìn lướt).
 */
export function thumbLayoutForTable(
  table: TableBlock,
  box: { width: number; height: number } | null = null,
  capped = true
): ThumbLayout {
  const totalRows = table.cells.length;
  const maxRows = capped ? THUMB_MAX_ROWS : Number.POSITIVE_INFINITY;
  const maxCols = capped ? THUMB_MAX_COLS : Number.POSITIVE_INFINITY;
  const base = table.align.map((_, i) => baseColW(table.colWidths[i] ?? TABLE_DEFAULT_COL_W));
  const rows = box ? fitRows(totalRows, box.height, maxRows) : Math.min(totalRows, THUMB_MAX_ROWS);
  const cols = box ? fitCols(base, box.width, maxCols) : Math.min(base.length, THUMB_MAX_COLS);
  const thumb = tableThumbnail(table, rows, cols);
  const moreW = thumb.moreCols ? THUMB_MORE_W : 0;
  const shown = base.slice(0, cols);
  const sum = shown.reduce((a, b) => a + b, 0);
  const grow = box ? Math.max(1, Math.min(MAX_GROW, (box.width - moreW) / sum)) : 1;
  const colW = shown.map((w) => Math.floor(w * grow));
  return {
    table,
    thumb,
    colW,
    width: colW.reduce((a, b) => a + b, 0) + moreW,
    height: rows * THUMB_ROW_H + (thumb.moreRows ? THUMB_MORE_H : 0),
  };
}

/** Bố cục mặc định (dùng khi đo node). */
export function getThumbLayout(map: MindMap, node: MindNode): ThumbLayout | null {
  const table = getNodeThumbTable(map, node);
  return table ? thumbLayoutForTable(table) : null;
}

/** Phần chiều cao node dành cho thẻ (0 nếu không có) — measurer cộng
 *  thêm đúng phần này, drawNode trừ ra khỏi vùng chữ. */
export function thumbReservedHeight(layout: ThumbLayout | null): number {
  return layout ? layout.height + THUMB_PAD : 0;
}

/**
 * Toạ độ world của lưới thẻ trong node. Thẻ neo vào ĐÁY vùng nội dung
 * (ngay trên hàng Tag nếu có) và căn giữa theo chiều ngang.
 */
export function thumbRect(
  node: Pick<MindNode, "x" | "y" | "width" | "height">,
  layout: ThumbLayout,
  bottomReserved: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: node.x + (node.width - layout.width) / 2,
    y: node.y + node.height - bottomReserved - THUMB_PAD - layout.height,
    width: layout.width,
    height: layout.height,
  };
}
