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

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Độ dịch khung nhìn (px màn hình) để nội dung `content` (toạ độ thế giới) không bị đẩy ra ngoài canvas.
 *  - "contain": nội dung VỪA khung thì nằm trọn bên trong (chừa lề `margin`); LỚN hơn khung thì không để hở mép
 *    trống — mép nội dung không được lùi vào trong lề (giống cuộn một trang tài liệu). Dùng sau khi thu gọn/bung,
 *    đổi bố cục…: map luôn nằm trong khung nhìn.
 *  - "keep": nhẹ hơn, dùng khi người dùng tự kéo/zoom — chỉ chặn không cho nội dung trôi hẳn ra ngoài: luôn còn ít
 *    nhất `keep` px (hoặc cả nội dung nếu nhỏ hơn) nằm trong khung mỗi chiều.
 */
export function clampViewToContent(
  view: ViewTransformLike,
  content: WorldBounds | null,
  canvasW: number,
  canvasH: number,
  mode: "contain" | "keep",
  margin = 40,
  keep = 140
): { dx: number; dy: number } {
  if (!content || canvasW <= 0 || canvasH <= 0) return { dx: 0, dy: 0 };
  const axis = (lo: number, hi: number, size: number): number => {
    const a = lo * view.scale;
    const b = hi * view.scale;
    if (mode === "keep") {
      const need = Math.min(keep, b - a, size);
      if (b + 0 < need) return need - b; // trôi ra bên trái/trên
      if (a > size - need) return size - need - a; // trôi ra bên phải/dưới
      return 0;
    }
    const len = b - a;
    if (len <= size - 2 * margin) {
      if (a < margin) return margin - a;
      if (b > size - margin) return size - margin - b;
      return 0;
    }
    if (len <= size) return (size - len) / 2 - a; // vừa khít khung nhưng không đủ lề: canh giữa
    if (a > margin) return margin - a;
    if (b < size - margin) return size - margin - b;
    return 0;
  };
  return {
    dx: axis(content.minX + view.offsetX / view.scale, content.maxX + view.offsetX / view.scale, canvasW),
    dy: axis(content.minY + view.offsetY / view.scale, content.maxY + view.offsetY / view.scale, canvasH),
  };
}

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Kiểu "keep" theo TỪNG NODE (không theo khung bao — map có nhánh trôi, ghi chú dán nằm rải rác thì khung bao chứa
 * cả khoảng trống, nhìn vào đó vẫn là màn hình trắng): nếu không còn node nào lộ ra trong khung ít nhất
 * `minW`×`minH` px thì dịch để node GẦN khung nhất vào hẳn bên trong (chừa lề `margin`).
 */
export function keepSomeNodeVisible(
  view: ViewTransformLike,
  rects: WorldRect[],
  canvasW: number,
  canvasH: number,
  minW = 60,
  minH = 24,
  margin = 40
): { dx: number; dy: number } {
  if (rects.length === 0 || canvasW <= 0 || canvasH <= 0) return { dx: 0, dy: 0 };
  let best: { d: number; x1: number; y1: number; x2: number; y2: number } | null = null;
  for (const r of rects) {
    const x1 = r.x * view.scale + view.offsetX;
    const y1 = r.y * view.scale + view.offsetY;
    const x2 = x1 + r.width * view.scale;
    const y2 = y1 + r.height * view.scale;
    const ow = Math.min(x2, canvasW) - Math.max(x1, 0);
    const oh = Math.min(y2, canvasH) - Math.max(y1, 0);
    if (ow >= Math.min(minW, x2 - x1) && oh >= Math.min(minH, y2 - y1)) return { dx: 0, dy: 0 };
    const dxOut = x2 < 0 ? -x2 : x1 > canvasW ? x1 - canvasW : 0;
    const dyOut = y2 < 0 ? -y2 : y1 > canvasH ? y1 - canvasH : 0;
    const d = Math.hypot(dxOut, dyOut);
    if (!best || d < best.d) best = { d, x1, y1, x2, y2 };
  }
  if (!best) return { dx: 0, dy: 0 };
  const fit = (a: number, b: number, size: number): number => {
    if (b - a > size - 2 * margin) return (size - (b - a)) / 2 - a; // node to hơn khung: canh giữa
    if (a < margin) return margin - a;
    if (b > size - margin) return size - margin - b;
    return 0;
  };
  return { dx: fit(best.x1, best.x2, canvasW), dy: fit(best.y1, best.y2, canvasH) };
}
