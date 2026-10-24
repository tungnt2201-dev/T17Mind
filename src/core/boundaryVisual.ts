/**
 * core/boundaryVisual.ts
 * ---------------------------------------------------------------------
 * Nhóm trực quan (Boundary nâng cấp) — phần dữ liệu THUẦN:
 *  - tuỳ chọn hiển thị mặc định / làm sạch (clamp) cho từng chế độ;
 *  - resolveBoundaryMembers: tách thành viên LOGIC (id người dùng chọn, lưu trong
 *    nodeIds) khỏi cách HIỆN TRÊN CANVAS. Thành viên đang thấy dùng chính hình chữ
 *    nhật của node; thành viên bị ẩn sau một nhánh thu gọn KHÔNG dùng toạ độ cũ của
 *    nó mà quy về node đại diện đang hiện (tổ tiên thu gọn cao nhất) kèm số lượng.
 * Không có Path2D/DOM/đường bao nào được lưu — mọi thứ dẫn xuất tính lại từ vị trí node.
 * ---------------------------------------------------------------------
 */
import type { Boundary, BoundaryMode, BoundaryVisualOptions, MindMap, MindNode } from "./types";
import { visibleRepresentativeId } from "./tree";

export const BOUNDARY_MODES: readonly BoundaryMode[] = ["rectangle", "multiContour", "distributed"];

export const BOUNDARY_LIMITS = {
  padding: { min: 8, max: 80 },
  connectionGap: { min: 16, max: 400 },
  smoothness: { min: 0, max: 1 },
  fillOpacity: { min: 0.02, max: 1 },
} as const;

export const BOUNDARY_MODE_LABEL: Record<BoundaryMode, string> = {
  rectangle: "Hình chữ nhật (cũ)",
  multiContour: "Nhiều vùng thích nghi (E)",
  distributed: "Phân tán (F)",
};

/** Tuỳ chọn mặc định của một chế độ. Nhóm tạo mới dùng `multiContour`. */
export function defaultVisual(mode: BoundaryMode = "multiContour"): BoundaryVisualOptions {
  return { mode, padding: 24, connectionGap: 64, smoothness: 0.6, fillOpacity: mode === "rectangle" ? 1 : 0.14, showConnectors: false };
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
const num = (v: unknown, fallback: number): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Làm sạch tuỳ chọn đọc từ file / từ giao diện: giá trị sai → mặc định, ngoài khoảng → kẹp lại. `undefined` nếu không có gì. */
export function normalizeVisual(raw: unknown): BoundaryVisualOptions | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  const mode = (BOUNDARY_MODES as readonly unknown[]).includes(r.mode) ? (r.mode as BoundaryMode) : "rectangle";
  const d = defaultVisual(mode);
  const L = BOUNDARY_LIMITS;
  return {
    mode,
    padding: clamp(num(r.padding, d.padding), L.padding.min, L.padding.max),
    connectionGap: clamp(num(r.connectionGap, d.connectionGap), L.connectionGap.min, L.connectionGap.max),
    smoothness: clamp(num(r.smoothness, d.smoothness), L.smoothness.min, L.smoothness.max),
    fillOpacity: clamp(num(r.fillOpacity, d.fillOpacity), L.fillOpacity.min, L.fillOpacity.max),
    showConnectors: r.showConnectors === true,
  };
}

/** Tuỳ chọn đang có hiệu lực: nhóm cũ (không có `visual`) = hình chữ nhật như trước. */
export function effectiveVisual(b: Pick<Boundary, "visual">): BoundaryVisualOptions {
  return normalizeVisual(b.visual) ?? defaultVisual("rectangle");
}

export interface HiddenProxy {
  /** Node đại diện đang hiện trên canvas thay cho các thành viên bị ẩn. */
  representativeId: string;
  /** Số thành viên của nhóm đang nằm ẩn bên trong đại diện này. */
  hiddenCount: number;
  /** Chính node đại diện cũng là thành viên của nhóm? */
  representativeIsMember: boolean;
}

export interface ResolvedMembers {
  /** Thành viên đang hiện (theo thứ tự nodeIds, bỏ id không còn tồn tại). */
  visible: MindNode[];
  /** Các đại diện của thành viên bị ẩn (sắp theo id đại diện để ổn định). */
  proxies: HiddenProxy[];
  /** Tổng số thành viên logic còn tồn tại (hiện + ẩn). */
  total: number;
}

/**
 * Thành viên logic → cách hiện. Ngữ nghĩa thu gọn:
 *  - thành viên đang thấy: dùng hình chữ nhật thật;
 *  - thành viên bị ẩn: không dùng toạ độ node ẩn; gom về `visibleRepresentativeId` kèm số lượng;
 *  - đại diện cũng là thành viên: nằm trong `visible` VÀ có proxy (`representativeIsMember`) để báo "+N";
 *  - mọi thành viên đều ẩn: `visible` rỗng nhưng `proxies` còn → nhóm vẫn chọn được, không biến mất.
 */
export function resolveBoundaryMembers(map: MindMap, b: Pick<Boundary, "nodeIds">): ResolvedMembers {
  const memberSet = new Set(b.nodeIds.filter((id) => map.nodes[id]));
  const visible: MindNode[] = [];
  const hiddenBy = new Map<string, number>();
  for (const id of b.nodeIds) {
    const node = map.nodes[id];
    if (!node) continue;
    const rep = visibleRepresentativeId(map, id);
    if (rep === id) visible.push(node);
    else hiddenBy.set(rep, (hiddenBy.get(rep) ?? 0) + 1);
  }
  const proxies: HiddenProxy[] = [...hiddenBy.keys()]
    .sort()
    .filter((rep) => !!map.nodes[rep])
    .map((rep) => ({ representativeId: rep, hiddenCount: hiddenBy.get(rep) as number, representativeIsMember: memberSet.has(rep) }));
  return { visible, proxies, total: memberSet.size };
}
