/**
 * ui/minimapLogic.ts
 * ---------------------------------------------------------------------
 * P2.8b — toàn bộ phép tính hình học THUẦN TUÝ cho Minimap (khung bao
 * nội dung, tỷ lệ thu nhỏ, quy đổi world <-> pixel-trên-minimap, khung
 * chữ nhật biểu diễn vùng đang xem) — tách khỏi component Svelte để
 * tự kiểm bằng script gọi thẳng, cùng tinh thần với explorerLogic.ts
 * và render/geometry.ts.
 * ---------------------------------------------------------------------
 */
import type { MindNode } from "../core/types";

export interface MinimapGeometry {
  /** Tỷ lệ world -> pixel trên Minimap (world càng lớn, minimap càng nhỏ). */
  scale: number;
  /** Toạ độ pixel-trên-minimap tương ứng với world (0, 0). */
  offsetX: number;
  offsetY: number;
}

/**
 * Tính tỷ lệ + gốc quy đổi để TOÀN BỘ node trong `nodes` vừa khít
 * khung Minimap (trừ padding), CĂN GIỮA theo cả 2 chiều. Nhận sẵn một
 * MẢNG node (không nhận cả MindMap) — để nơi gọi tự LỌC TRƯỚC theo
 * chế độ đồng bộ/độc lập (P2.8b) rồi mới tính hình học, tránh phải
 * viết 2 phiên bản khác nhau của hàm này. Mảng rỗng trả về tỷ lệ 1:1
 * để không chia cho 0.
 */
export function computeMinimapGeometry(nodes: MindNode[], minimapWidth: number, minimapHeight: number, padding = 10): MinimapGeometry {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
    found = true;
  }
  if (!found) return { scale: 1, offsetX: padding, offsetY: padding };

  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);
  const availableWidth = Math.max(1, minimapWidth - padding * 2);
  const availableHeight = Math.max(1, minimapHeight - padding * 2);
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight);

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;
  return {
    scale,
    offsetX: minimapWidth / 2 - contentCenterX * scale,
    offsetY: minimapHeight / 2 - contentCenterY * scale,
  };
}

export function worldToMinimap(geo: MinimapGeometry, worldX: number, worldY: number): { x: number; y: number } {
  return { x: worldX * geo.scale + geo.offsetX, y: worldY * geo.scale + geo.offsetY };
}

export function minimapToWorld(geo: MinimapGeometry, mmX: number, mmY: number): { x: number; y: number } {
  return { x: (mmX - geo.offsetX) / geo.scale, y: (mmY - geo.offsetY) / geo.scale };
}

/** Khung chữ nhật (world-space) mà khung nhìn CHÍNH đang bao phủ, tính
 *  từ ViewTransform hiện tại + kích thước canvas chính. */
export function computeViewportWorldRect(
  view: { scale: number; offsetX: number; offsetY: number },
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: -view.offsetX / view.scale,
    top: -view.offsetY / view.scale,
    right: (canvasWidth - view.offsetX) / view.scale,
    bottom: (canvasHeight - view.offsetY) / view.scale,
  };
}
