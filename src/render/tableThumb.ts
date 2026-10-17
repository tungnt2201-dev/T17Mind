/**
 * render/tableThumb.ts
 * ---------------------------------------------------------------------
 * M2 — hình học "thẻ thu nhỏ" của bảng vẽ trên node (tối đa 5 cột × 4
 * hàng, phần còn lại hiện "…"). Hàm THUẦN, dùng chung cho cả 3 nơi phải
 * khớp nhau tuyệt đối: đo node (getMeasurer), vẽ (drawNode) và dò bấm
 * (hitTestTableThumb) — giống lý do hitTestLinkIcon phải khớp chỗ vẽ 🔗.
 *
 * VỀ HIỆU NĂNG: layout chạy lại sau MỖI thay đổi của store, nên kích
 * thước thẻ cố tình chỉ phụ thuộc SỐ hàng/cột hiển thị (ô có bề rộng cố
 * định) — không phải đo chữ từng ô, không cần cache cho bước đo. Phần
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
  /** Kích thước phần lưới (không kể THUMB_PAD). */
  width: number;
  height: number;
}

export function thumbLayoutForTable(table: TableBlock): ThumbLayout {
  const thumb = tableThumbnail(table, THUMB_MAX_ROWS, THUMB_MAX_COLS);
  const cols = thumb.align.length;
  const rows = thumb.cells.length;
  return {
    table,
    thumb,
    width: cols * THUMB_CELL_W + (thumb.moreCols ? THUMB_MORE_W : 0),
    height: rows * THUMB_ROW_H + (thumb.moreRows ? THUMB_MORE_H : 0),
  };
}

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
