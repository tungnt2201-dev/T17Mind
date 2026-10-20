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
import { tableThumbnail, type TableThumbnail } from "../core/table";

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
  /** Bề rộng mỗi ô — mặc định THUMB_CELL_W, giãn ra (tới THUMB_CELL_W_MAX)
   *  khi node rộng hơn cần thiết. */
  cellW: number;
  /** Kích thước phần lưới (không kể THUMB_PAD). */
  width: number;
  height: number;
}

/** Ô thẻ giãn ra tối đa bằng này khi node rộng (đủ cho chữ dài hơn). */
export const THUMB_CELL_W_MAX = 140;

/** Số mục (hàng/cột) vừa với `space` px, mỗi mục `unit` px; chừa chỗ
 *  cho dấu "…" (`more` px) nếu không hiện hết. Luôn ít nhất 1. */
function fitCount(total: number, space: number, unit: number, more: number, cap: number): number {
  const limit = Math.min(total, cap);
  const all = Math.floor(space / unit);
  if (all >= total && total <= cap) return Math.max(1, total);
  return Math.max(1, Math.min(limit, Math.floor((space - more) / unit)));
}

/**
 * Bố cục thẻ của một bảng.
 * - Không truyền `box`: kích thước mặc định (tối đa 5×4 ô bề rộng cố
 *   định) — dùng khi ĐO node tự động.
 * - Có `box` (khoảng trống thật trong node lúc vẽ/dò bấm): hiện nhiều
 *   hàng/cột nhất vừa khung, ô giãn rộng cho kín bề ngang. `capped` =
 *   true giữ trần 5×4 (node tự động — khung chỉ rộng vì chữ tiêu đề dài);
 *   false khi người dùng đã tự kéo node to ra (manualWidth/Height).
 */
export function thumbLayoutForTable(
  table: TableBlock,
  box: { width: number; height: number } | null = null,
  capped = true
): ThumbLayout {
  const totalRows = table.cells.length;
  const totalCols = table.align.length;
  const maxRows = capped ? THUMB_MAX_ROWS : Number.POSITIVE_INFINITY;
  const maxCols = capped ? THUMB_MAX_COLS : Number.POSITIVE_INFINITY;
  const rows = box ? fitCount(totalRows, box.height, THUMB_ROW_H, THUMB_MORE_H, maxRows) : Math.min(totalRows, THUMB_MAX_ROWS);
  const cols = box ? fitCount(totalCols, box.width, THUMB_CELL_W, THUMB_MORE_W, maxCols) : Math.min(totalCols, THUMB_MAX_COLS);
  const thumb = tableThumbnail(table, rows, cols);
  const moreW = thumb.moreCols ? THUMB_MORE_W : 0;
  const cellW = box
    ? Math.max(THUMB_CELL_W, Math.min(THUMB_CELL_W_MAX, Math.floor((box.width - moreW) / cols)))
    : THUMB_CELL_W;
  return {
    table,
    thumb,
    cellW,
    width: cols * cellW + moreW,
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
