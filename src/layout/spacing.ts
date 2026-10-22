/**
 * layout/spacing.ts
 * ---------------------------------------------------------------------
 * Khoảng trống phía TRÊN node dành cho hàng biểu tượng (markers — vẽ nổi
 * trên mép node, xem render/CanvasRenderer.ts#drawMarkers). Bố cục ngang
 * (logic phải/trái/hai bên) chừa thêm khoảng này để biểu tượng không đè
 * lên node anh em phía trên.
 */
import type { MindNode } from "../core/types";

export const MARKER_ROW_SPACE = 14;

export function markerSpace(node: MindNode): number {
  return node.markers.length > 0 ? MARKER_ROW_SPACE : 0;
}
