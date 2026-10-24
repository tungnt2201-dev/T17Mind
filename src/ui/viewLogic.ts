/**
 * ui/viewLogic.ts
 * ---------------------------------------------------------------------
 * Phép tính THUẦN cho khung nhìn (camera): "phóng vào vùng" — người dùng
 * giữ Alt rồi kéo một hình chữ nhật, khung nhìn zoom sao cho đúng vùng
 * đó vừa khít canvas và nằm giữa. Tách khỏi AppController để kiểm thử
 * được mà không cần canvas.
 * ---------------------------------------------------------------------
 */
export interface ViewTransformLike {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface ScreenRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Cạnh ngắn nhất (px) của hình chữ nhật kéo ra để tính là "cố ý" — nhỏ hơn thì bỏ qua (tránh zoom vọt vì lỡ tay). */
export const ZOOM_RECT_MIN_PX = 12;
/** Giới hạn zoom: trùng với phóng to bằng lăn chuột (tối đa 300%), và "Vừa khung" (tối thiểu 15%). */
export const ZOOM_MAX = 3;
export const ZOOM_MIN = 0.15;

/**
 * Khung nhìn mới để vùng `rect` (toạ độ màn hình, theo `view` hiện tại)
 * choán toàn bộ canvas `canvasW × canvasH`, canh giữa. Trả về null nếu vùng
 * quá nhỏ. Tỷ lệ khung hình của vùng khác canvas: cạnh dài hơn quyết định
 * mức zoom, phần dư chia đều hai bên. Zoom bị chặn trong [ZOOM_MIN, ZOOM_MAX]
 * — vùng quá nhỏ chỉ phóng tới mức tối đa, tâm vùng vẫn nằm giữa canvas.
 */
export function zoomToRectView(rect: ScreenRect, view: ViewTransformLike, canvasW: number, canvasH: number): ViewTransformLike | null {
  const sx1 = Math.min(rect.x1, rect.x2);
  const sx2 = Math.max(rect.x1, rect.x2);
  const sy1 = Math.min(rect.y1, rect.y2);
  const sy2 = Math.max(rect.y1, rect.y2);
  if (sx2 - sx1 < ZOOM_RECT_MIN_PX || sy2 - sy1 < ZOOM_RECT_MIN_PX) return null;
  if (!(canvasW > 0) || !(canvasH > 0) || !(view.scale > 0)) return null;

  // vùng trong toạ độ thế giới
  const wx1 = (sx1 - view.offsetX) / view.scale;
  const wx2 = (sx2 - view.offsetX) / view.scale;
  const wy1 = (sy1 - view.offsetY) / view.scale;
  const wy2 = (sy2 - view.offsetY) / view.scale;

  const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(canvasW / (wx2 - wx1), canvasH / (wy2 - wy1))));
  const cx = (wx1 + wx2) / 2;
  const cy = (wy1 + wy2) / 2;
  return { scale, offsetX: canvasW / 2 - cx * scale, offsetY: canvasH / 2 - cy * scale };
}
