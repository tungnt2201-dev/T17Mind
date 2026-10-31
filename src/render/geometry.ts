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
import { layoutOfNode } from "../core/treeSettings";
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
  const layoutType = layoutOfNode(map, parent.id);
  if (isVerticalLayout(layoutType)) {
    if (layoutType === "treeUp") {
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
  if (layoutType === "logicBoth") {
    childIsLeft = child.x + child.width <= parent.x;
  } else {
    childIsLeft = layoutType === "logicLeft";
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
  /** Phía của ngoặc so với các node được tóm tắt: "right" (mặc định) hoặc "left"
   *  (node nằm bên trái cha — Logic Left, hoặc nửa trái của Logic Both Sides). */
  side: "right" | "left";
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

/** Node nằm hoàn toàn bên trái node cha (cùng quy ước với CanvasRenderer#isNodeLeftOriented). */
function isLeftOfParent(map: MindMap, n: MindNode): boolean {
  const parent = n.parentId ? map.nodes[n.parentId] : null;
  return parent ? n.x + n.width <= parent.x : false;
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

  // Node ở bên TRÁI cha của nó (cây trái / nửa trái của cây hai bên) thì ngoặc
  // và hộp nhãn phải ra phía NGOÀI, tức bên trái — không đè lên phía cha.
  const onLeft = nodes.filter((n) => isLeftOfParent(map, n)).length > nodes.length / 2;
  const side: "right" | "left" = onLeft ? "left" : "right";
  const minY = Math.min(...nodes.map((n) => n.y));
  const maxY = Math.max(...nodes.map((n) => n.y + n.height));
  const mid = (minY + maxY) / 2;
  const labelW = Math.max(70, Math.min(220, (s.label || "Tóm tắt").length * 7.5 + 28));
  const labelH = 30;
  const tipY = mid;
  const labelY = tipY - labelH / 2;
  if (onLeft) {
    const minLeft = Math.min(...nodes.map((n) => n.x));
    const braceX = minLeft - 22;
    const tipX = braceX - 16;
    return { side, braceX, minY, maxY, tipX, tipY, labelX: tipX - 26 - labelW, labelY, labelW, labelH };
  }
  const maxRight = Math.max(...nodes.map((n) => n.x + n.width));
  const braceX = maxRight + 22;
  const tipX = braceX + 16;
  return { side, braceX, minY, maxY, tipX, tipY, labelX: tipX + 26, labelY, labelW, labelH };
}

// ---------------------------------------------------------------------
// Node đại diện đang hiển thị — sửa lỗi liên kết chéo/tóm tắt "trôi"
// khi node đầu kia bị ẩn bên trong một nhánh đã thu gọn
// ---------------------------------------------------------------------


// ---------------------------------------------------------------------
// P1.8 — kéo thả đổi cấu trúc cây (viết lại: kéo thả mượt, đúng thứ tự)
// ---------------------------------------------------------------------

/**
 * Nơi sẽ thả node đang kéo.
 *  - "child": làm con CUỐI của `parentId`.
 *  - "gap": chèn vào danh sách con của `parentId` tại `index` — chỉ số tính trên danh sách con ĐÃ BỎ node đang kéo
 *    (đúng thứ tự MoveNodeCommand thao tác: gỡ node ra trước rồi mới chèn). Nhờ vậy kéo xuống không còn bị lệch một
 *    ô, và thả về chỗ cũ là giữ nguyên. `refId`/`after` = chèn trước/sau node nào (để vẽ vạch và ghi nhãn);
 *    `otherId` = node kề bên kia của khe (cùng phía), nếu có.
 */
export type DropTarget =
  | { kind: "child"; parentId: string; side?: Side }
  | { kind: "gap"; parentId: string; index: number; refId: string; after: boolean; otherId: string | null; side?: Side };
/** `side` (chỉ khi cha là gốc của cây HAI BÊN): thả xong nhánh được ghim ở bên này (node.side). */
type Side = "left" | "right";

/** Gốc của một cây bố cục hai bên (cây chính hoặc nhánh trôi). */
export function isBothSidesRoot(map: MindMap, id: string): boolean {
  const n = map.nodes[id];
  return !!n && n.parentId === null && layoutOfNode(map, id) === "logicBoth";
}
/** Bên hiện tại (nhìn thấy) của con `n` so với cha. */
const sideOfChild = (parent: MindNode, n: MindNode): Side => (n.x + n.width <= parent.x ? "left" : "right");

/** Khoảng (world) quanh một nhóm anh em mà con trỏ còn được coi là "đang nhắm vào nhóm đó". */
const GROUP_REACH = 56;
/** Bề dày (world) dải "chèn trước/sau" ở mép một node có kích thước `size` theo trục xếp anh em. */
export const dropBand = (size: number): number => Math.min(Math.max(size * 0.2, 6), 10);
/** Nới thêm (world) cho dải đang được chọn ở khung hình trước — "vào dễ, ra khó", tránh nhấp nháy ở ranh giới. */
const HYSTERESIS = 5;
/** Nới ở ranh giới dải trên thân node — nhỏ hơn, để dải giữa "làm con" luôn đủ rộng khi đi vào từ mép. */
const BAND_HYSTERESIS = 3;

interface Axis {
  /** Toạ độ / kích thước theo trục XẾP anh em (dọc với bố cục ngang, ngang với bố cục cây xuống/lên). */
  pos: (n: MindNode) => number;
  size: (n: MindNode) => number;
  /** Trục vuông góc (trục độ sâu). */
  cpos: (n: MindNode) => number;
  csize: (n: MindNode) => number;
  main: (x: number, y: number) => number;
  cross: (x: number, y: number) => number;
}
const H_AXIS: Axis = { pos: (n) => n.y, size: (n) => n.height, cpos: (n) => n.x, csize: (n) => n.width, main: (_x, y) => y, cross: (x) => x };
const V_AXIS: Axis = { pos: (n) => n.x, size: (n) => n.width, cpos: (n) => n.y, csize: (n) => n.height, main: (x) => x, cross: (_x, y) => y };
const axisOf = (map: MindMap, parentId: string): Axis => (isVerticalLayout(layoutOfNode(map, parentId)) ? V_AXIS : H_AXIS);

/** Các nhóm anh em đang hiển thị của `parentId` (bỏ node đang kéo), mỗi nhóm SẮP THEO VỊ TRÍ THẬT trên trục xếp.
 *  Cây hai bên: con của gốc tách thành nhóm trái và nhóm phải. */
function siblingGroups(map: MindMap, parentId: string, excluded: Set<string>): MindNode[][] {
  const parent = map.nodes[parentId];
  if (!parent || parent.collapsed) return [];
  const ax = axisOf(map, parentId);
  const kids = parent.children.filter((id) => !excluded.has(id)).map((id) => map.nodes[id]).filter((n): n is MindNode => Boolean(n));
  if (kids.length === 0) return [];
  const sortGroup = (g: MindNode[]): MindNode[] => [...g].sort((a, b) => ax.pos(a) + ax.size(a) / 2 - (ax.pos(b) + ax.size(b) / 2));
  if (ax === H_AXIS) {
    const left = kids.filter((n) => n.x + n.width <= parent.x);
    const right = kids.filter((n) => n.x + n.width > parent.x);
    return [left, right].filter((g) => g.length > 0).map(sortGroup);
  }
  return [sortGroup(kids)];
}

/** Khe trước/sau `ref` trong nhóm (đã sắp), quy ra chỉ số trên danh sách con đã bỏ node đang kéo. */
function gapAt(map: MindMap, parentId: string, group: MindNode[], refPos: number, after: boolean, excluded: Set<string>): DropTarget {
  const ref = group[refPos] as MindNode;
  const list = (map.nodes[parentId] as MindNode).children.filter((id) => !excluded.has(id));
  const other = group[after ? refPos + 1 : refPos - 1] ?? null;
  const t: DropTarget = { kind: "gap", parentId, index: list.indexOf(ref.id) + (after ? 1 : 0), refId: ref.id, after, otherId: other?.id ?? null };
  if (isBothSidesRoot(map, parentId)) t.side = sideOfChild(map.nodes[parentId] as MindNode, ref);
  return t;
}

/** Khe trong nhóm ứng với vị trí `m` trên trục xếp: trước node đầu tiên có tâm nằm sau `m`, hoặc sau node cuối. */
function gapByPosition(map: MindMap, parentId: string, group: MindNode[], m: number, ax: Axis, excluded: Set<string>): DropTarget {
  const i = group.findIndex((n) => ax.pos(n) + ax.size(n) / 2 > m);
  return i === -1 ? gapAt(map, parentId, group, group.length - 1, true, excluded) : gapAt(map, parentId, group, i, false, excluded);
}

const sameTarget = (a: DropTarget | null, b: DropTarget | null): boolean =>
  !!a && !!b && a.kind === b.kind && a.parentId === b.parentId && a.side === b.side && (a.kind === "child" || (b.kind === "gap" && a.index === b.index));

/**
 * Xác định nơi thả node `draggedId` khi con trỏ ở (worldX, worldY). Trả null = không có chỗ thả theo cấu trúc
 * (chỉ xảy ra với nhánh trôi — node có cha luôn bám về một khe; muốn dời tự do thì giữ Alt, do nơi gọi xử lý).
 *
 * Thứ tự ưu tiên:
 *  1. Con trỏ nằm TRÊN THÂN một node: chia thân theo trục xếp anh em thành 3 dải — dải đầu = chèn TRƯỚC node đó,
 *     dải giữa = làm CON của node đó, dải cuối = chèn SAU node đó (gốc của cây: cả thân là "làm con").
 *  2. Con trỏ ở khoảng trống GẦN một nhóm anh em (trong GROUP_REACH): chèn vào khe gần nhất của nhóm đó, kể cả
 *     trước node đầu và sau node cuối.
 *  3. Còn lại: bám về khe gần nhất trong NHÓM ANH EM CŨ của chính node đang kéo (thả hụt không làm mất thứ tự).
 * Mọi phép so dùng VỊ TRÍ THẬT sau layout (kể cả node từng bị kéo lệch), không dùng thứ tự mảng — nên vạch xanh
 * thấy ở đâu thì thả vào đúng đó.
 */
export function computeDropTarget(
  map: MindMap,
  draggedId: string,
  worldX: number,
  worldY: number,
  currentTarget: DropTarget | null = null
): DropTarget | null {
  const excluded = new Set(collectSubtreeIds(map, draggedId));

  // 1) Trên thân node.
  let body: MindNode | null = null;
  const visit = (id: string): void => {
    if (body || excluded.has(id)) return;
    const node = map.nodes[id];
    if (!node) return;
    if (worldX >= node.x && worldX <= node.x + node.width && worldY >= node.y && worldY <= node.y + node.height) body = node;
    if (!node.collapsed) for (const childId of node.children) visit(childId);
  };
  for (const rootId of getRootIds(map)) visit(rootId);
  if (body) {
    const node = body as MindNode;
    if (!node.parentId) return rootChildTarget(map, node, worldX);
    const ax = axisOf(map, node.parentId);
    const size = ax.size(node);
    // Dải chèn mỏng (khoảng trống giữa hai node cũng là vùng chèn — bước 2), để dải giữa "làm con" đủ rộng cả khi thu nhỏ.
    const band = dropBand(size);
    const rel = ax.main(worldX, worldY) - ax.pos(node);
    const cur = currentTarget;
    const curBefore = cur?.kind === "gap" && cur.refId === node.id && !cur.after;
    const curAfter = cur?.kind === "gap" && cur.refId === node.id && cur.after;
    const curChild = cur?.kind === "child" && cur.parentId === node.id;
    const beforeEdge = band + (curBefore ? BAND_HYSTERESIS : curChild ? -BAND_HYSTERESIS : 0);
    const afterEdge = size - band - (curAfter ? BAND_HYSTERESIS : curChild ? -BAND_HYSTERESIS : 0);
    if (rel > beforeEdge && rel < afterEdge) return { kind: "child", parentId: node.id };
    const group = siblingGroups(map, node.parentId, excluded).find((g) => g.includes(node));
    if (!group) return { kind: "child", parentId: node.id };
    return gapAt(map, node.parentId, group, group.indexOf(node), rel >= afterEdge, excluded);
  }

  // 2) Gần một nhóm anh em.
  let best: { d: number; t: DropTarget } | null = null;
  for (const parentId of Object.keys(map.nodes)) {
    if (excluded.has(parentId)) continue;
    if (visibleRepresentativeId(map, parentId) !== parentId) continue;
    const ax = axisOf(map, parentId);
    const m = ax.main(worldX, worldY);
    const c = ax.cross(worldX, worldY);
    for (const group of siblingGroups(map, parentId, excluded)) {
      // Khoảng cách tới node GẦN NHẤT của nhóm (không phải tới khung bao cả nhóm): các cột anh em của những cha khác
      // nhau có thể chồng lên nhau theo trục độ sâu (một cha có tên dài), khung bao sẽ "nuốt" con trỏ sai nhóm.
      let d = Infinity;
      for (const n of group) {
        const dc = Math.max(ax.cpos(n) - c, 0, c - (ax.cpos(n) + ax.csize(n)));
        const dm = Math.max(ax.pos(n) - m, 0, m - (ax.pos(n) + ax.size(n)));
        d = Math.min(d, Math.hypot(dc, dm));
      }
      if (d > GROUP_REACH) continue;
      const t = gapByPosition(map, parentId, group, m, ax, excluded);
      if (sameTarget(t, currentTarget)) d -= HYSTERESIS;
      if (!best || d < best.d) best = { d, t };
    }
  }
  // Cây hai bên mà một bên còn TRỐNG: con trỏ ở phía đó, ngang tầm gốc → làm con của gốc, ghim sang bên đó.
  for (const rootId of getRootIds(map)) {
    if (excluded.has(rootId) || !isBothSidesRoot(map, rootId)) continue;
    const root = map.nodes[rootId] as MindNode;
    if (root.collapsed) continue;
    const kids = root.children.filter((id) => !excluded.has(id)).map((id) => map.nodes[id]).filter((n): n is MindNode => Boolean(n));
    const cy = root.y + root.height / 2;
    if (Math.abs(worldY - cy) > 140) continue;
    for (const side of ["left", "right"] as const) {
      if (kids.some((n) => sideOfChild(root, n) === side)) continue;
      const beyond = side === "left" ? root.x - worldX : worldX - (root.x + root.width);
      if (beyond < 0 || beyond > 260) continue;
      const t: DropTarget = { kind: "child", parentId: rootId, side };
      const d = Math.max(0, beyond - GROUP_REACH) * 0.25 - (sameTarget(t, currentTarget) ? HYSTERESIS : 0);
      if (!best || d < best.d) best = { d, t };
    }
  }
  if (best) return best.t;

  // 3) Bám về nhóm anh em cũ.
  const dragged = map.nodes[draggedId];
  const parentId = dragged?.parentId;
  if (!parentId || !map.nodes[parentId]) return null;
  const groups = siblingGroups(map, parentId, excluded);
  if (groups.length === 0) return { kind: "child", parentId };
  const ax = axisOf(map, parentId);
  const c = ax.cross(worldX, worldY);
  const centerC = (g: MindNode[]): number => (Math.min(...g.map(ax.cpos)) + Math.max(...g.map((n) => ax.cpos(n) + ax.csize(n)))) / 2;
  const group = groups.reduce((a, b) => (Math.abs(centerC(b) - c) < Math.abs(centerC(a) - c) ? b : a));
  return gapByPosition(map, parentId, group, ax.main(worldX, worldY), ax, excluded);
}

/** Thả làm con của một gốc cây: với cây hai bên thì ghim theo phía con trỏ so với tâm gốc. */
function rootChildTarget(map: MindMap, root: MindNode, worldX: number): DropTarget {
  if (!isBothSidesRoot(map, root.id)) return { kind: "child", parentId: root.id };
  return { kind: "child", parentId: root.id, side: worldX < root.x + root.width / 2 ? "left" : "right" };
}

/** Thả vào `target` có làm thay đổi cấu trúc so với hiện tại không (thả về đúng chỗ cũ = không). */
export function dropChangesStructure(map: MindMap, draggedId: string, target: DropTarget): boolean {
  const node = map.nodes[draggedId];
  if (!node) return false;
  if (target.side && node.parentId === target.parentId) {
    const p = map.nodes[target.parentId] as MindNode;
    if ((node.side ?? sideOfChild(p, node)) !== target.side) return true;
  }
  if (target.kind === "child") {
    const p = map.nodes[target.parentId];
    return node.parentId !== target.parentId || !p || p.children[p.children.length - 1] !== draggedId;
  }
  if (node.parentId !== target.parentId) return true;
  return (map.nodes[target.parentId] as MindNode).children.indexOf(draggedId) !== target.index;
}

/** Vạch chỉ chỗ chèn: đoạn thẳng (world) giữa `refId` và node kề `otherId`, hoặc sát mép `refId` nếu ở đầu/cuối nhóm. */
export function gapIndicatorGeometry(map: MindMap, target: Extract<DropTarget, { kind: "gap" }>): { x1: number; y1: number; x2: number; y2: number } | null {
  const ref = map.nodes[target.refId];
  if (!ref) return null;
  const ax = axisOf(map, target.parentId);
  const other = target.otherId ? map.nodes[target.otherId] : undefined;
  const edge = target.after ? ax.pos(ref) + ax.size(ref) : ax.pos(ref);
  let at: number;
  if (other) at = target.after ? (edge + ax.pos(other)) / 2 : (edge + ax.pos(other) + ax.size(other)) / 2;
  else at = target.after ? edge + 7 : edge - 7;
  const nodes = other ? [ref, other] : [ref];
  const c0 = Math.min(...nodes.map(ax.cpos)) - 10;
  const c1 = Math.max(...nodes.map((n) => ax.cpos(n) + ax.csize(n))) + 10;
  return ax === H_AXIS ? { x1: c0, y1: at, x2: c1, y2: at } : { x1: at, y1: c0, x2: at, y2: c1 };
}

/** Nhãn ngắn mô tả nơi sẽ thả (hiện trong gợi ý lúc kéo). */
export function describeDropTarget(map: MindMap, target: DropTarget | null): string {
  const name = (id: string): string => {
    const t = (map.nodes[id]?.text ?? "").replace(/\s+/g, " ").trim() || "(không tên)";
    return `«${t.length > 28 ? `${t.slice(0, 27)}…` : t}»`;
  };
  if (!target) return "Dời tự do";
  if (target.kind === "child") return `Làm nhánh con của ${name(target.parentId)}${target.side ? (target.side === "left" ? ", bên trái" : ", bên phải") : ""}`;
  const vertical = axisOf(map, target.parentId) === V_AXIS;
  const where = vertical ? (target.after ? "bên phải" : "bên trái") : target.after ? "phía dưới" : "phía trên";
  return `Chèn ${where} ${name(target.refId)}`;
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
