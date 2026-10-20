/**
 * render/imageThumb.ts
 * ---------------------------------------------------------------------
 * M3 — hình học "thẻ ảnh" trên node: ẢNH ĐẦU TIÊN trong card, cao theo
 * cỡ hiển thị của khối (Nhỏ/Vừa/Lớn), rộng theo tỉ lệ ảnh; còn ảnh khác
 * thì vẽ thêm huy hiệu "+N". Dùng chung cho đo (getMeasurer), vẽ và dò
 * bấm — cùng lý do với render/tableThumb.ts. Thẻ ảnh nằm NGAY TRÊN thẻ
 * bảng (nếu có), cả hai nằm trên hàng Tag.
 *
 * Tỉ lệ ảnh lấy từ ImageAsset.width/height (ghi lúc chèn); ảnh cũ chưa
 * có thì CanvasRenderer truyền vào kích thước biết được sau khi giải mã,
 * trong lúc chờ dùng tạm 4:3.
 * ---------------------------------------------------------------------
 */
import type { ImageAsset, ImageBlock, ImageDisplaySize, MindMap, MindNode } from "../core/types";
import { THUMB_PAD } from "./tableThumb";

export const IMAGE_THUMB_HEIGHT: Record<ImageDisplaySize, number> = { small: 48, medium: 84, large: 140 };
const DEFAULT_ASPECT = 4 / 3;
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 3;

export function getNodeImageBlocks(map: MindMap, node: MindNode): ImageBlock[] {
  if (!node.cardId) return [];
  const card = map.cards[node.cardId];
  if (!card) return [];
  return card.blocks.filter((b): b is ImageBlock => b.type === "image" && !!map.assets[b.assetId]);
}

export interface ImageDims {
  width: number;
  height: number;
}

/** Kích thước gốc ghi trong asset, nếu hợp lệ (file từ ngoài có thể sai). */
export function assetDims(asset: ImageAsset | undefined): ImageDims | null {
  const w = asset?.width;
  const h = asset?.height;
  return typeof w === "number" && typeof h === "number" && w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h)
    ? { width: w, height: h }
    : null;
}

export interface ImageThumbLayout {
  block: ImageBlock;
  /** Số ảnh còn lại không hiện (vẽ "+N"). */
  more: number;
  width: number;
  height: number;
}

export function imageThumbLayout(images: ImageBlock[], dims: ImageDims | null): ImageThumbLayout | null {
  const block = images[0];
  if (!block) return null;
  const height = IMAGE_THUMB_HEIGHT[block.size] ?? IMAGE_THUMB_HEIGHT.medium;
  const aspect = dims ? Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, dims.width / dims.height)) : DEFAULT_ASPECT;
  return { block, more: images.length - 1, width: Math.round(height * aspect), height };
}

/** Phần chiều cao node dành cho thẻ ảnh (0 nếu không có). */
export function imageReservedHeight(layout: ImageThumbLayout | null): number {
  return layout ? layout.height + THUMB_PAD : 0;
}

/** Toạ độ world của thẻ ảnh: căn giữa ngang, đáy cách phần bên dưới
 *  (thẻ bảng + hàng Tag = `belowReserved`) một khoảng THUMB_PAD. */
export function imageThumbRect(
  node: Pick<MindNode, "x" | "y" | "width" | "height">,
  layout: ImageThumbLayout,
  belowReserved: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: node.x + (node.width - layout.width) / 2,
    y: node.y + node.height - belowReserved - THUMB_PAD - layout.height,
    width: layout.width,
    height: layout.height,
  };
}

/** Ảnh không nhỏ hơn cỡ này khi co theo node (vẫn nhìn ra, bấm được). */
export const IMAGE_THUMB_MIN_HEIGHT = 16;

/**
 * Co (và nếu `allowGrow` thì giãn) thẻ ảnh cho vừa khung `box`, giữ đúng
 * tỉ lệ — dùng khi người dùng đã tự kéo cỡ node (manualWidth/Height):
 * kéo node nhỏ lại thì ảnh co theo, kéo to ra thì ảnh to theo. Không
 * giãn khi node còn có thẻ bảng (để phần trống cho bảng).
 */
export function fitImageLayout(
  layout: ImageThumbLayout,
  box: { width: number; height: number },
  allowGrow: boolean
): ImageThumbLayout {
  const fit = Math.min(box.width / layout.width, box.height / layout.height);
  const minScale = IMAGE_THUMB_MIN_HEIGHT / layout.height;
  const scale = Math.max(minScale, allowGrow ? fit : Math.min(1, fit));
  if (!Number.isFinite(scale) || scale === 1) return layout;
  return { ...layout, width: Math.max(1, Math.floor(layout.width * scale)), height: Math.max(1, Math.floor(layout.height * scale)) };
}
