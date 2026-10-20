/**
 * core/image.ts
 * ---------------------------------------------------------------------
 * M3 (Hình ảnh) — hàm THUẦN quyết định việc nén/thu nhỏ ảnh khi chèn và
 * đo dung lượng ảnh trong map. Phần giải mã/vẽ lại ảnh thật (cần DOM,
 * canvas) nằm ở ui/imageImport.ts; ở đây chỉ có con số để test được.
 * ---------------------------------------------------------------------
 */
import type { Card, ImageBlock, MindMap } from "./types";

/** Cạnh dài nhất tối đa của ảnh lưu trong map (đủ nét để xem lớn). */
export const IMAGE_MAX_SIDE = 1920;
/** Ảnh dưới ngưỡng này (byte) và không quá IMAGE_MAX_SIDE thì giữ nguyên. */
export const IMAGE_KEEP_BYTES = 600 * 1024;
/** Tổng dung lượng ảnh trong map vượt ngưỡng này thì cảnh báo người dùng. */
export const MAP_ASSETS_WARN_BYTES = 25 * 1024 * 1024;

/** Định dạng trình duyệt nào cũng vẽ lại được bằng canvas. GIF/SVG giữ
 *  nguyên (vẽ lại sẽ mất hoạt ảnh / mất tính vector). */
const REENCODABLE = new Set(["image/png", "image/jpeg", "image/webp", "image/bmp"]);

export interface ResizePlan {
  width: number;
  height: number;
  mimeType: "image/jpeg" | "image/png";
  quality: number;
}

/**
 * Có cần thu nhỏ/nén lại ảnh không, và nếu có thì thành cỡ/định dạng gì.
 * null = giữ nguyên file gốc. Ảnh có nền trong suốt (`hasAlpha`) giữ PNG
 * để không bị nền đen; còn lại đổi sang JPEG chất lượng 0.85.
 */
export function planImageResize(
  width: number,
  height: number,
  bytes: number,
  mimeType: string,
  hasAlpha: boolean
): ResizePlan | null {
  if (!REENCODABLE.has(mimeType)) return null;
  const longest = Math.max(width, height);
  if (longest <= IMAGE_MAX_SIDE && bytes <= IMAGE_KEEP_BYTES && mimeType !== "image/bmp") return null;
  const scale = longest > IMAGE_MAX_SIDE ? IMAGE_MAX_SIDE / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    mimeType: hasAlpha ? "image/png" : "image/jpeg",
    quality: 0.85,
  };
}

/** Số byte thật của một chuỗi base64 (không kể phần đệm "="). */
export function base64Bytes(dataBase64: string): number {
  const pad = dataBase64.endsWith("==") ? 2 : dataBase64.endsWith("=") ? 1 : 0;
  return Math.floor((dataBase64.length * 3) / 4) - pad;
}

/** Tổng dung lượng (byte) mọi ảnh trong map. */
export function totalAssetBytes(map: MindMap): number {
  let sum = 0;
  for (const a of Object.values(map.assets)) sum += base64Bytes(a.dataBase64);
  return sum;
}

/** Các khối ảnh của card, theo thứ tự. */
export function cardImageBlocks(card: Card): ImageBlock[] {
  return card.blocks.filter((b): b is ImageBlock => b.type === "image");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
