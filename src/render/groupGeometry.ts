/**
 * render/groupGeometry.ts
 * ---------------------------------------------------------------------
 * Nhóm trực quan — hình học của MỘT nhóm theo chế độ của nó (thuần, không Canvas):
 *   rectangle   → khung chữ nhật cũ (boundaryGeometry trong geometry.ts, không đổi);
 *   multiContour (E) → các vùng bao thích nghi (render/adaptiveBoundary.ts);
 *   distributed (F)  → viền quanh từng node thành viên + chip, không có vùng nền lớn.
 * Thành viên bị ẩn sau nhánh thu gọn KHÔNG dùng toạ độ cũ: chúng thành chip "▣ N" /
 * "+N" gắn ở node đại diện đang hiện (xem core/boundaryVisual.ts#resolveBoundaryMembers).
 * Mọi thứ ở đây là dữ liệu DẪN XUẤT từ vị trí node — không lưu vào file.
 * ---------------------------------------------------------------------
 */
import type { Boundary, MindMap, MindNode } from "../core/types";
import { collectVisibleNodeIds } from "../core/tree";
import { effectiveVisual, resolveBoundaryMembers } from "../core/boundaryVisual";
import { boundaryGeometry, type BoundaryGeometry, type GroupChip } from "./geometry";
import {
  computeAdaptiveRegions,
  distanceToRegionStroke,
  distToSegment,
  minimumSpanningSegments,
  type Pt,
  type Rect,
} from "./adaptiveBoundary";

/** E có từng này vùng trở lên thì coi là phân mảnh quá mức. */
export const FRAGMENTED_REGION_COUNT = 6;
const LABEL_H = 24;
const CHIP_H = 18;

export interface GroupComputeState {
  /** Liên kết lần trước (hysteresis). */
  prevLinks?: ReadonlySet<string>;
  quality?: "full" | "fast";
}

const labelWidth = (text: string): number => Math.max(60, Math.min(220, text.length * 7 + 24));
const chipWidth = (text: string, per = 6.5): number => Math.max(26, Math.min(160, text.length * per + 16));
const clipText = (text: string, n: number): string => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const rectOf = (n: MindNode): Rect => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height });

function hiddenChips(map: MindMap, proxies: ReturnType<typeof resolveBoundaryMembers>["proxies"]): GroupChip[] {
  const out: GroupChip[] = [];
  for (const p of proxies) {
    const rep = map.nodes[p.representativeId];
    if (!rep) continue;
    const text = p.representativeIsMember ? `+${p.hiddenCount}` : `▣ ${p.hiddenCount}`;
    const w = chipWidth(text, 7);
    out.push({ x: rep.x + rep.width - w, y: rep.y - CHIP_H - 2, w, h: CHIP_H, text, kind: "hidden", nodeId: rep.id });
  }
  return out;
}

function union(boxes: { x: number; y: number; width: number; height: number }[]): { x: number; y: number; width: number; height: number } {
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width));
  const y1 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Hình học của một nhóm. null nếu không còn gì để hiện (không thành viên hiện và không có đại diện).
 * Nhóm CŨ (không có `visual`) và chế độ "rectangle" dùng đúng hình chữ nhật như trước.
 */
export function computeGroupGeometry(map: MindMap, b: Boundary, state: GroupComputeState = {}): BoundaryGeometry | null {
  const v = effectiveVisual(b);
  if (v.mode === "rectangle") {
    const g = boundaryGeometry(map, b);
    return g ? { ...g, mode: "rectangle" } : null;
  }

  const { visible, proxies } = resolveBoundaryMembers(map, b);
  const text = b.label || "Nhóm";
  const labelW = labelWidth(text);
  const chips = hiddenChips(map, proxies);

  // Mọi thành viên đều ẩn: chỉ còn chip ở đại diện, nhãn đặt cạnh chip đầu tiên → nhóm vẫn thấy và chọn được.
  if (visible.length === 0) {
    if (chips.length === 0) return null;
    const first = chips[0] as GroupChip;
    const lx = first.x - labelW - 4;
    const ly = first.y + (CHIP_H - LABEL_H) / 2;
    const box = union([...chips.map((c) => ({ x: c.x, y: c.y, width: c.w, height: c.h })), { x: lx, y: ly, width: labelW, height: LABEL_H }]);
    return { ...box, labelX: lx, labelY: ly, labelW, labelH: LABEL_H, mode: v.mode, regions: [], memberOutlines: [], chips, connectors: [], links: new Set() };
  }

  const rects = visible.map(rectOf);
  const memberIds = new Set(visible.map((n) => n.id));

  if (v.mode === "multiContour") {
    const obstacles = collectVisibleNodeIds(map)
      .filter((id) => !memberIds.has(id))
      .map((id) => map.nodes[id])
      .filter((n): n is MindNode => !!n)
      .map(rectOf);
    const res = computeAdaptiveRegions(rects, { padding: v.padding, connectionGap: v.connectionGap, smoothness: v.smoothness, quality: state.quality }, obstacles, state.prevLinks);
    const regions = res.regions;
    const primary = regions[0];
    // Nhãn chính nằm ở mép trên-trái của vùng lớn nhất, ôm đường viền (không che node).
    let anchor: Pt = primary ? (primary.outer.reduce((best, p) => (p.y < best.y || (p.y === best.y && p.x < best.x) ? p : best), primary.outer[0] as Pt)) : { x: rects[0]!.x, y: rects[0]!.y };
    anchor = { x: anchor.x + 10, y: anchor.y };
    const labelX = anchor.x;
    const labelY = anchor.y - LABEL_H / 2;
    const regionChips: GroupChip[] = regions.slice(1).map((g, i) => {
      const t = regions.length > 2 ? `${clipText(text, 8)} ${i + 2}` : clipText(text, 12);
      const top = g.outer.reduce((best, p) => (p.y < best.y || (p.y === best.y && p.x < best.x) ? p : best), g.outer[0] as Pt);
      return { x: top.x + 8, y: top.y - CHIP_H / 2, w: chipWidth(t), h: CHIP_H, text: t, kind: "region" };
    });
    const allChips = [...regionChips, ...chips];
    const connectors = v.showConnectors && regions.length > 1 ? minimumSpanningSegments(regions.map((g, i) => ({ id: String(i).padStart(4, "0"), ...g.bbox }))) : [];
    const box = union([...regions.map((g) => g.bbox), ...allChips.map((c) => ({ x: c.x, y: c.y, width: c.w, height: c.h })), { x: labelX, y: labelY, width: labelW, height: LABEL_H }]);
    return {
      ...box,
      labelX,
      labelY,
      labelW,
      labelH: LABEL_H,
      mode: v.mode,
      regions,
      chips: allChips,
      connectors,
      fragmented: regions.length >= FRAGMENTED_REGION_COUNT,
      approximate: res.approximate,
      links: res.links,
    };
  }

  // F — Distributed: viền quanh từng thành viên đang hiện + nhãn nhóm ở thành viên đầu theo thứ tự đọc.
  const outlines = rects.map((r) => ({ x: r.x - 4, y: r.y - 4, width: r.width + 8, height: r.height + 8 }));
  const first = [...rects].sort((a, c) => a.y - c.y || a.x - c.x || (a.id < c.id ? -1 : 1))[0] as Rect;
  const labelX = first.x - 4;
  const labelY = first.y - 4 - LABEL_H - 2;
  const connectors = v.showConnectors && rects.length > 1 ? minimumSpanningSegments(rects) : [];
  const box = union([...outlines, ...chips.map((c) => ({ x: c.x, y: c.y, width: c.w, height: c.h })), { x: labelX, y: labelY, width: labelW, height: LABEL_H }]);
  return { ...box, labelX, labelY, labelW, labelH: LABEL_H, mode: v.mode, regions: [], memberOutlines: outlines, chips, connectors, links: new Set() };
}

const inRect = (px: number, py: number, x: number, y: number, w: number, h: number): boolean => px >= x && px <= x + w && py >= y && py <= y + h;

/** Khoảng cách từ điểm tới viền một hình chữ nhật (0 trên viền). */
function distToRectStroke(p: Pt, r: { x: number; y: number; width: number; height: number }): number {
  const a = { x: r.x, y: r.y };
  const b = { x: r.x + r.width, y: r.y };
  const c = { x: r.x + r.width, y: r.y + r.height };
  const d = { x: r.x, y: r.y + r.height };
  return Math.min(distToSegment(p, a, b), distToSegment(p, b, c), distToSegment(p, c, d), distToSegment(p, d, a));
}

/**
 * Điểm (thế giới) có trúng nhóm không: CHỈ nhãn, chip, hoặc sát viền (trong `tol` đơn vị
 * thế giới — nơi gọi quy đổi từ ~8px màn hình). KHÔNG bắt vùng nền bên trong, để marquee,
 * kéo nền và chọn node vẫn hoạt động.
 */
export function hitTestGroup(g: BoundaryGeometry, wx: number, wy: number, tol: number): boolean {
  if (inRect(wx, wy, g.labelX, g.labelY, g.labelW, g.labelH)) return true;
  for (const c of g.chips ?? []) if (inRect(wx, wy, c.x, c.y, c.w, c.h)) return true;
  const p = { x: wx, y: wy };
  const mode = g.mode ?? "rectangle";
  if (mode === "multiContour") return (g.regions ?? []).some((r) => distanceToRegionStroke(p, r) <= tol);
  if (mode === "distributed") return (g.memberOutlines ?? []).some((o) => distToRectStroke(p, o) <= tol);
  const nearLR = (Math.abs(wx - g.x) < tol || Math.abs(wx - (g.x + g.width)) < tol) && wy >= g.y && wy <= g.y + g.height;
  const nearTB = (Math.abs(wy - g.y) < tol || Math.abs(wy - (g.y + g.height)) < tol) && wx >= g.x && wx <= g.x + g.width;
  return nearLR || nearTB;
}
