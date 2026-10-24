/**
 * render/geometry.ts
 * ---------------------------------------------------------------------
 * Các phép tính hình học phục vụ việc VẼ (không phải việc XẾP VỊ TRÍ —
 * đó là việc của layout/). Ví dụ: đường liên kết chéo nối vào cạnh nào
 * của node, ngoặc tóm tắt cong ra sao. Tách riêng để renderer.ts đỡ dài
 * và để có thể viết test cho từng phép tính mà không cần dựng canvas.
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode, Summary, Boundary, BoundaryMode } from "../core/types";
import type { Pt, Region } from "./adaptiveBoundary";
import { isVerticalLayout } from "../core/types";
import { visibleRepresentativeId } from "../core/tree";
export { visibleRepresentativeId };
import { collectSubtreeIds, collectVisibleNodeIds, getRootIds, getNodeDepth } from "../core/tree";

export interface Point {
  x: number;
  y: number;
}

/** P2.7 (nâng cấp) — độ dày đường nối TỪ parentNode TỚI CÁC CON của
 *  nó. `edgeWidth` tự chỉnh tay (nếu có) LUÔN ưu tiên; không thì TỰ
 *  ĐỘNG mỏng dần theo độ sâu — cấp 0 (gốc) dày nhất, càng sâu càng
 *  mỏng, không bao giờ mỏng hơn EDGE_WIDTH_MIN (để không biến mất
 *  hẳn ở cây rất sâu). Tham khảo phong cách "cây tự nhiên" thường
 *  thấy ở các công cụ mindmap chuyên nghiệp — vẫn dùng nét vẽ ĐỀU một
 *  độ dày trên toàn bộ CHIỀU DÀI một đường nối (khác kiểu "thon dần
 *  NGAY TRONG một đường", đó là một tính năng RIÊNG, phức tạp hơn
 *  nhiều, đang cân nhắc làm sau — xem trao đổi thiết kế). */
const EDGE_WIDTH_BASE = 2.5;
const EDGE_WIDTH_DECREMENT = 0.4;
const EDGE_WIDTH_MIN = 0.75;

/**
 * P1.13 — khung chữ nhật (world-space) mà khung nhìn hiện tại đang bao
 * phủ, tính từ ViewTransform + kích thước canvas — dùng cho viewport
 * culling (chỉ vẽ node/đường nối thực sự nằm trong hoặc gần khung
 * nhìn, bỏ qua phần còn lại để tăng tốc với map lớn).
 *
 * LƯU Ý: công thức TRÙNG với `computeViewportWorldRect` trong
 * `ui/minimapLogic.ts` — CỐ Ý không tái dùng chéo (import ui/ vào
 * render/ sẽ VI PHẠM quy tắc kiến trúc một chiều `ui → render →
 * layout → core` của dự án). Trùng lặp vài dòng công thức đơn giản
 * này chấp nhận được hơn nhiều so với phá vỡ ranh giới kiến trúc.
 */
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

/**
 * P1.13 — một hình chữ nhật (world-space, ví dụ bounding box của một
 * node) có GIAO với khung nhìn hay không, kèm `margin` (world-space)
 * nới rộng khung nhìn một chút để tránh hiện tượng "chớp tắt" khi
 * node nằm sát mép — vừa lướt vào/ra khỏi khung nhìn đã vẽ/không vẽ
 * đột ngột.
 */
export function isRectVisibleInViewport(
  rect: { x: number; y: number; width: number; height: number },
  viewportRect: { left: number; top: number; right: number; bottom: number },
  margin: number
): boolean {
  return (
    rect.x + rect.width >= viewportRect.left - margin &&
    rect.x <= viewportRect.right + margin &&
    rect.y + rect.height >= viewportRect.top - margin &&
    rect.y <= viewportRect.bottom + margin
  );
}

export function computeEdgeWidth(map: MindMap, parentNode: MindNode): number {
  if (parentNode.edgeWidth !== null) return parentNode.edgeWidth;
  const depth = getNodeDepth(map, parentNode.id);
  return Math.max(EDGE_WIDTH_MIN, EDGE_WIDTH_BASE - depth * EDGE_WIDTH_DECREMENT);
}

/**
 * P2.7a/b/c — điểm neo bắt đầu/kết thúc của đường nối cha-con.
 * logicRight/Left/Both: nối theo TRỤC NGANG (mép trái/phải). treeDown:
 * nối theo TRỤC DỌC — mép DƯỚI cha tới mép TRÊN con, tại điểm GIỮA
 * theo chiều ngang (không phải giữa theo chiều dọc như trục ngang).
 */
export function parentChildEdgeAnchors(
  map: MindMap,
  parent: MindNode,
  child: MindNode
): { sx: number; sy: number; ex: number; ey: number } {
  if (isVerticalLayout(map.layoutType)) {
    if (map.layoutType === "treeUp") {
      // P2.7c — soi gương treeDown: nối từ ĐỈNH cha (mép "ra ngoài",
      // xa gốc hơn) tới ĐÁY con (mép "vào trong", gần gốc hơn) — con
      // nằm PHÍA TRÊN cha trong bố cục này.
      return {
        sx: parent.x + parent.width / 2,
        sy: parent.y,
        ex: child.x + child.width / 2,
        ey: child.y + child.height,
      };
    }
    return {
      sx: parent.x + parent.width / 2,
      sy: parent.y + parent.height,
      ex: child.x + child.width / 2,
      ey: child.y,
    };
  }

  const sy = parent.y + parent.height / 2;
  const ey = child.y + child.height / 2;

  let childIsLeft: boolean;
  if (map.layoutType === "logicBoth") {
    childIsLeft = child.x + child.width <= parent.x;
  } else {
    childIsLeft = map.layoutType === "logicLeft";
  }

  if (childIsLeft) {
    return { sx: parent.x, sy, ex: child.x + child.width, ey };
  }
  return { sx: parent.x + parent.width, sy, ex: child.x, ey };
}

/** Điểm trên biên hình chữ nhật của node, nằm theo hướng từ tâm node
 *  tới điểm (tx,ty) cho trước. Dùng để vẽ liên kết chéo chạm đúng
 *  cạnh node thay vì đâm xuyên qua giữa. */
export function rectAnchor(node: MindNode, tx: number, ty: number): Point {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const halfW = node.width / 2;
  const halfH = node.height / 2;
  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Điểm tại tham số t (0..1) trên đường cong Bezier bậc hai p0-cp-p3. */
export function quadraticPoint(p0: Point, cp: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * cp.x + t * t * p3.x,
    y: u * u * p0.y + 2 * u * t * cp.y + t * t * p3.y,
  };
}

/**
 * P2.6b-2 — điểm trên đường cong BẬC BA (4 điểm điều khiển), khác
 * quadraticPoint ở trên (bậc hai, 3 điểm) — đường nối cha-con vẽ bằng
 * `ctx.bezierCurveTo` (xem drawEdges trong CanvasRenderer.ts), không
 * phải `ctx.quadraticCurveTo` như liên kết chéo dùng, nên cần công
 * thức khác để tính đúng vị trí đặt nhãn dọc theo đường đó.
 */
export function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/**
 * P2.6b-3 — đạo hàm bậc nhất (vector tiếp tuyến) của đường cong bậc
 * ba tại tham số t. Công thức chuẩn: B'(t) = 3(1-t)²(P1-P0) +
 * 6(1-t)t(P2-P1) + 3t²(P3-P2). Dùng `Math.atan2(tangent.y, tangent.x)`
 * ở nơi gọi để ra góc xoay — không trả thẳng góc ở đây vì nơi gọi có
 * thể cần chính vector (ví dụ để chuẩn hoá độ dài) chứ không chỉ góc.
 */
export function cubicBezierTangent(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
}

export interface SummaryGeometry {
  braceX: number;
  minY: number;
  maxY: number;
  tipX: number;
  tipY: number;
  labelX: number;
  labelY: number;
  labelW: number;
  labelH: number;
}

/** Tính hình học ngoặc + hộp nhãn cho một Summary, dựa trên vị trí
 *  HIỆN TẠI (đã qua layout) của các node thành viên. */
export function summaryGeometry(map: MindMap, s: Summary): SummaryGeometry | null {
  // Chỉ tính trên các thành viên ĐANG hiển thị (không bị ẩn bên trong
  // một nhánh đã thu gọn) — tránh vẽ ngoặc dựa trên vị trí cũ của node
  // đã ẩn, cùng gốc lỗi với đường liên kết chéo "trôi" (xem
  // visibleRepresentativeId ở dưới).
  const visibleIds = s.nodeIds.filter((id) => visibleRepresentativeId(map, id) === id);
  const nodes = visibleIds.map((id) => map.nodes[id]).filter((n): n is MindNode => Boolean(n));
  if (nodes.length < 2) return null;

  const maxRight = Math.max(...nodes.map((n) => n.x + n.width));
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const braceX = maxRight + 22;
  const mid = (minY + maxY) / 2;
  const tipX = braceX + 16;
  const tipY = mid;
  const labelW = Math.max(70, Math.min(220, (s.label || "Tóm tắt").length * 7.5 + 28));
  const labelH = 30;
  const labelX = tipX + 26;
  const labelY = tipY - labelH / 2;

  return { braceX, minY, maxY, tipX, tipY, labelX, labelY, labelW, labelH };
}

// ---------------------------------------------------------------------
// Node đại diện đang hiển thị — sửa lỗi liên kết chéo/tóm tắt "trôi"
// khi node đầu kia bị ẩn bên trong một nhánh đã thu gọn
// ---------------------------------------------------------------------


// ---------------------------------------------------------------------
// P1.8 — kéo thả đổi cấu trúc cây
// ---------------------------------------------------------------------

export type DropTarget =
  | { kind: "child"; parentId: string }
  | { kind: "gap"; parentId: string; index: number };

const GAP_SLACK = 8; // world units — vùng nhạy quanh mỗi khe, rộng hơn một chút cho dễ nhắm
/** Tỉ lệ (so với chiều cao/rộng node liền kề nhỏ hơn) của vùng nhạy để
 *  BẮT ĐẦU coi một khe là mục tiêu — HẸP, vì đây là khe CHƯA được
 *  chọn, phải kéo thực sự gần mới tính là muốn đổi sang khe đó. */
const ENTER_RATIO = 0.18;
/** Tỉ lệ của vùng nhạy để TIẾP TỤC giữ một khe ĐANG được chọn — RỘNG
 *  hơn hẳn ENTER_RATIO, để nhích nhẹ quanh vị trí đang kéo dở không
 *  làm "rớt" sang khe khác — đây chính là phần giải quyết "kéo lệch
 *  một chút xíu là đổi hẳn vị trí" mà ENTER_RATIO một mình không làm
 *  được (nếu chỉ có một ngưỡng duy nhất, ở giữa hai khe liền kề luôn
 *  có một ranh giới cứng khiến việc "nhích qua nhích lại" quanh ranh
 *  giới đó gây nhảy liên tục, bất kể ngưỡng đặt rộng hay hẹp). Nhỏ
 *  hơn 0.5 để hai vùng STAY của hai khe liền kề không chồng lấn nhau
 *  (tránh mơ hồ giữa 2 khe cùng lúc muốn "giữ" con trỏ). */
const STAY_RATIO = 0.4;

/**
 * Xác định con trỏ (toạ độ world) đang chỉ vào đâu để quyết định thả
 * node đang kéo (draggedId) vào đó: làm CON của một node (thả lên
 * thân), hay CHÈN vào giữa hai node anh em (thả vào khe giữa chúng).
 *
 * Loại trừ hoàn toàn draggedId và mọi con cháu của nó khỏi việc dò —
 * không thể thả một node vào chính nó hay vào con cháu của nó.
 *
 * SỬA LỖI trải nghiệm (người dùng báo): "kéo lệch một chút xíu là đổi
 * hẳn vị trí với node trên/dưới" — nguyên nhân là vùng nhạy "chèn vào
 * khe" trước đó rộng tới ĐÚNG ĐIỂM GIỮA mỗi node liền kề (50% chiều
 * cao mỗi node) và được tính LẠI TỪ ĐẦU mỗi khung hình, không "nhớ"
 * gì từ khung hình trước — chỉ cần nhích qua MỘT ranh giới tĩnh là
 * nhảy ngay sang khe kế tiếp, dù còn cách rất xa khe đó về mặt cảm
 * nhận. Đây là lần sửa THỨ HAI theo hướng ngược lại lần sửa trước
 * (lần trước mở RỘNG vùng nhạy vì "quá hẹp, khó nhắm" — giờ hoá ra
 * rộng đến mức "quá nhạy, dễ đổi ngoài ý muốn") — bài học: vùng nhạy
 * KHÔNG THỂ giải quyết bằng một ngưỡng tĩnh duy nhất, cần HAI ngưỡng
 * khác nhau tuỳ NGỮ CẢNH (đây có phải khe đang được chọn hay không).
 *
 * Cách sửa — HYSTERESIS (độ trễ chuyển trạng thái), mẫu hình chuẩn
 * trong tương tác kéo-thả/nam châm (Figma, Illustrator...): "vào dễ,
 * ra khó" — hai ngưỡng cho mỗi khe, không phải một:
 *  - `currentTarget` (khe đang được ÁP DỤNG từ khung hình TRƯỚC, do
 *    nơi gọi lưu lại và truyền vào) dùng ngưỡng RỘNG (`STAY_RATIO`)
 *    để TIẾP TỤC giữ nguyên — khó "rớt ra" khỏi khe đang chọn.
 *  - Mọi khe KHÁC (chưa được chọn) dùng ngưỡng HẸP (`ENTER_RATIO`) để
 *    BẮT ĐẦU được chọn — phải kéo THỰC SỰ gần khe đó mới tính.
 * Nhờ vậy: nhích nhẹ quanh vị trí đang kéo dở sẽ tiếp tục giữ đúng
 * khe cũ (nằm trong vùng STAY rộng của chính nó); chỉ khi kéo đủ xa
 * (ra khỏi STAY của khe cũ, rồi vào ENTER của khe mới) mới thực sự
 * đổi — đúng "chỉ thay đổi trong một biên độ xác định".
 */
export function computeDropTarget(
  map: MindMap,
  draggedId: string,
  worldX: number,
  worldY: number,
  currentTarget: DropTarget | null = null
): DropTarget | null {
  const excluded = new Set(collectSubtreeIds(map, draggedId));
  // P2.7c — Tree Down xếp anh em THEO HÀNG NGANG (không phải dọc như
  // mọi layout khác), nên khe hở giữa 2 anh em liên tiếp cũng nằm
  // theo trục X, không phải trục Y — phải đảo hẳn cách dò so với logic
  // gốc (viết cho layout ngang, nơi anh em xếp CỘT DỌC).
  const isVertical = isVerticalLayout(map.layoutType);

  // 1) Khe giữa hai anh em liên tiếp — ưu tiên kiểm tra trước vì vùng
  //    nhạy của nó hẹp, nếu để hit-test thân node chạy trước sẽ nuốt mất.
  for (const parentId of Object.keys(map.nodes)) {
    if (excluded.has(parentId)) continue;
    const parent = map.nodes[parentId];
    if (!parent || parent.collapsed) continue;

    const visibleChildIds = parent.children.filter((id) => !excluded.has(id));
    const childNodes = visibleChildIds
      .map((id) => map.nodes[id])
      .filter((n): n is MindNode => Boolean(n));
    if (childNodes.length < 2) continue;

    if (isVertical) {
      // Anh em xếp ngang (trái->phải theo đúng thứ tự mảng, xem
      // layoutSubtreeDown) — kiểm dải Y CHUNG trước, rồi tìm khe theo X.
      const top = Math.min(...childNodes.map((n) => n.y)) - GAP_SLACK;
      const bottom = Math.max(...childNodes.map((n) => n.y + n.height)) + GAP_SLACK;
      if (worldY < top || worldY > bottom) continue;

      for (let i = 1; i < childNodes.length; i++) {
        const leftN = childNodes[i - 1] as MindNode;
        const rightN = childNodes[i] as MindNode;
        const rightIndexInFullList = parent.children.indexOf(rightN.id);
        const isCurrent =
          currentTarget?.kind === "gap" && currentTarget.parentId === parentId && currentTarget.index === rightIndexInFullList;
        // Tâm thật của khe (giữa mép phải leftN và mép trái rightN) —
        // không phải điểm giữa của node như ngưỡng cũ.
        const gapCenter = (leftN.x + leftN.width + rightN.x) / 2;
        const ratio = isCurrent ? STAY_RATIO : ENTER_RATIO;
        const halfWidth = Math.min(leftN.width, rightN.width) * ratio;
        if (worldX >= gapCenter - halfWidth && worldX <= gapCenter + halfWidth) {
          return { kind: "gap", parentId, index: rightIndexInFullList };
        }
      }
    } else {
      const left = Math.min(...childNodes.map((n) => n.x)) - GAP_SLACK;
      const right = Math.max(...childNodes.map((n) => n.x + n.width)) + GAP_SLACK;
      if (worldX < left || worldX > right) continue;

      for (let i = 1; i < childNodes.length; i++) {
        const above = childNodes[i - 1] as MindNode;
        const below = childNodes[i] as MindNode;
        // index tính trên parent.children GỐC (kể cả phần tử bị loại
        // trừ), vì lệnh MoveNodeCommand thao tác trên mảng gốc đó.
        const belowIndexInFullList = parent.children.indexOf(below.id);
        const isCurrent =
          currentTarget?.kind === "gap" && currentTarget.parentId === parentId && currentTarget.index === belowIndexInFullList;
        // Tâm thật của khe (giữa mép dưới above và mép trên below) —
        // không phải điểm giữa của node như ngưỡng cũ.
        const gapCenter = (above.y + above.height + below.y) / 2;
        const ratio = isCurrent ? STAY_RATIO : ENTER_RATIO;
        const halfHeight = Math.min(above.height, below.height) * ratio;
        if (worldY >= gapCenter - halfHeight && worldY <= gapCenter + halfHeight) {
          return { kind: "gap", parentId, index: belowIndexInFullList };
        }
      }
    }
  }

  // 2) Không rơi vào khe nào — kiểm tra thân node để làm con.
  let bodyHit: string | null = null;
  const visit = (id: string): void => {
    if (bodyHit) return;
    if (excluded.has(id)) return;
    const node = map.nodes[id];
    if (!node) return;
    if (worldX >= node.x && worldX <= node.x + node.width && worldY >= node.y && worldY <= node.y + node.height) {
      bodyHit = id;
    }
    if (!node.collapsed) for (const childId of node.children) visit(childId);
  };
  for (const rootId of getRootIds(map)) visit(rootId);

  return bodyHit ? { kind: "child", parentId: bodyHit } : null;
}

/** Toạ độ world của đường chỉ báo "khe" để renderer vẽ — tính lại từ
 *  parentId + index thay vì truyền kèm từ computeDropTarget, để
 *  DropTarget giữ tối giản (chỉ mô tả Ý ĐỊNH, không mô tả CÁCH VẼ). */
export function gapIndicatorGeometry(
  map: MindMap,
  parentId: string,
  index: number
): { x1: number; x2: number; y: number } | null {
  const parent = map.nodes[parentId];
  if (!parent) return null;
  const childNodes = parent.children.map((id) => map.nodes[id]).filter((n): n is MindNode => Boolean(n));
  if (childNodes.length === 0) return null;

  const clamped = Math.max(0, Math.min(index, childNodes.length));
  const above = childNodes[clamped - 1];
  const below = childNodes[clamped];
  const y = above && below ? (above.y + above.height + below.y) / 2 : (above ?? below)?.y ?? 0;
  const left = Math.min(...childNodes.map((n) => n.x));
  const right = Math.max(...childNodes.map((n) => n.x + n.width));
  return { x1: left, x2: right, y };
}

// ---------------------------------------------------------------------
// P1.9 (sửa lỗi) — điều hướng Lên/Xuống theo VỊ TRÍ THẬT trên canvas
// ---------------------------------------------------------------------

/**
 * Tìm node đang hiển thị gần nhất theo chiều dọc (trên hoặc dưới),
 * tính theo TOẠ ĐỘ THẬT sau layout — KHÔNG theo quan hệ cha-con trong
 * cây. Lý do đổi từ bản đầu (đi theo thứ tự duyệt cây — depth-first):
 * với một nhánh dài dạng chuỗi (mỗi node chỉ có đúng 1 con), "node kế
 * tiếp trong thứ tự cây" luôn là chính con của nó, khiến phím Xuống
 * biến thành "lặn sâu vào nhánh hiện tại" — trùng hệt việc phím Phải
 * đã làm, và không bao giờ chạm sang nhánh khác cho tới khi lặn hết cả
 * nhánh đó. Phím Lên/Xuống phải giống việc "quét mắt" qua map theo
 * chiều dọc như nhìn thấy trên màn hình — kể cả khi việc đó nhảy sang
 * hẳn một nhánh khác vì nhánh đó tình cờ nằm ngay bên dưới.
 *
 * Cách chọn: trong số mọi node đang hiển thị nằm đúng phía cần tìm
 * (dy > 0 cho "xuống", dy < 0 cho "lên"), chọn node có điểm số
 * |dy| + |dx|*0.5 nhỏ nhất — ưu tiên gần theo chiều dọc, xê dịch ngang
 * chỉ đóng vai trò phá vỡ ràng buộc khi có nhiều node gần bằng nhau.
 */
/**
 * P2.7c — mở rộng thêm 2 hướng "left"/"right" (trước đây chỉ có
 * "up"/"down"). Cần cho Tree Down: với layout dọc, việc tìm "anh em
 * gần nhất theo hàng ngang" giờ là việc của Trái/Phải, không phải
 * Lên/Xuống nữa (Lên/Xuống ở Tree Down dùng cho cha/con — xem
 * appController.ts#navigateArrow). 4 hướng dùng chung một công thức
 * tính điểm, chỉ đổi vai trò trục nào là "chính" (bắt buộc đúng
 * hướng) và trục nào là "phụ" (chỉ để phá vỡ ràng buộc khi ngang điểm).
 */
export function findVisuallyNearestNode(
  map: MindMap,
  currentId: string,
  direction: "up" | "down" | "left" | "right"
): string | null {
  const current = map.nodes[currentId];
  if (!current) return null;
  const cx = current.x + current.width / 2;
  const cy = current.y + current.height / 2;

  let bestId: string | null = null;
  let bestScore = Infinity;

  for (const id of collectVisibleNodeIds(map)) {
    if (id === currentId) continue;
    const node = map.nodes[id];
    if (!node) continue;

    const dy = node.y + node.height / 2 - cy;
    const dx = node.x + node.width / 2 - cx;

    let inDirection: boolean;
    let score: number;
    if (direction === "down" || direction === "up") {
      inDirection = direction === "down" ? dy > 0.5 : dy < -0.5;
      score = Math.abs(dy) + Math.abs(dx) * 0.5;
    } else {
      inDirection = direction === "right" ? dx > 0.5 : dx < -0.5;
      // P2.7c — SỬA LỖI phát hiện qua tự kiểm: với "trái/phải" (tìm
      // ANH EM CÙNG HÀNG ở Tree Down), một node khác hàng (ví dụ
      // chính node CHA) đôi khi lại gần hơn thuần theo trục X so với
      // anh em thật sự — hạ trọng số nhẹ như "up/down" ở trên (0.5)
      // không đủ loại trừ. Phạt lệch trục Y nặng hơn hẳn khi tìm theo
      // trái/phải, để ưu tiên tuyệt đối "cùng hàng" trước "gần theo X".
      score = Math.abs(dx) + Math.abs(dy) * 3;
    }
    if (!inDirection) continue;

    if (score < bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}

// ---------------------------------------------------------------------
// P2.4 — Khoanh vùng (Boundary)
// ---------------------------------------------------------------------

/** Chip nhỏ của nhóm trực quan: nhãn các vùng phụ, số thành viên bị ẩn, nhãn nhóm ở chế độ phân tán. */
export interface GroupChip {
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  kind: "region" | "hidden" | "label";
  /** Với chip "hidden": node đại diện đang hiện. */
  nodeId?: string;
}

export interface BoundaryGeometry {
  /** Hộp bao toàn bộ (vùng + nhãn + chip); với nhóm cũ là chính khung chữ nhật. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Nhãn chính của nhóm. */
  labelX: number;
  labelY: number;
  labelW: number;
  labelH: number;
  /** Chế độ vẽ; thiếu = "rectangle" (nhóm cũ). */
  mode?: BoundaryMode;
  /** E: các vùng bao tách rời. */
  regions?: Region[];
  /** F: khung viền quanh từng node thành viên đang hiện. */
  memberOutlines?: { x: number; y: number; width: number; height: number }[];
  chips?: GroupChip[];
  /** Nét nối phụ (cây khung nhỏ nhất) giữa các vùng / thành viên. */
  connectors?: [Pt, Pt][];
  /** E quá phân mảnh (nhiều vùng) — nên gợi ý chuyển sang chế độ phân tán. */
  fragmented?: boolean;
  /** Đã rơi về hộp bao từng cụm (dữ liệu quá lớn / đang kéo). */
  approximate?: boolean;
  /** Kết quả liên kết gần-xa lần tính này — dùng làm hysteresis lần sau. */
  links?: Set<string>;
}

const BOUNDARY_PADDING = 24;

/**
 * Bounding box quanh mọi node thành viên ĐANG HIỂN THỊ của một
 * Boundary (lọc qua visibleRepresentativeId — cùng cơ chế đang bảo vệ
 * Summary khỏi "trôi" vị trí khi một thành viên bị ẩn trong nhánh thu
 * gọn, xem summaryGeometry ở trên). Khác Summary: Boundary không đòi
 * hỏi các node cùng cha, nên bounding box có thể trải rộng qua nhiều
 * nhánh khác hẳn nhau — đó chính là mục đích của tính năng này.
 */
export function boundaryGeometry(map: MindMap, b: Boundary): BoundaryGeometry | null {
  const visibleIds = b.nodeIds.filter((id) => visibleRepresentativeId(map, id) === id);
  const nodes = visibleIds.map((id) => map.nodes[id]).filter((n): n is MindNode => Boolean(n));
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map((n) => n.x)) - BOUNDARY_PADDING;
  const minY = Math.min(...nodes.map((n) => n.y)) - BOUNDARY_PADDING;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + BOUNDARY_PADDING;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + BOUNDARY_PADDING;

  const labelH = 24;
  const labelW = Math.max(60, Math.min(220, (b.label || "Khoanh vùng").length * 7 + 24));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    labelX: minX + 10,
    labelY: minY - labelH / 2,
    labelW,
    labelH,
  };
}
