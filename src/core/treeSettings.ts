/**
 * core/treeSettings.ts
 * ---------------------------------------------------------------------
 * Schema 22 — bố cục, theme và "kiểu cây tự nhiên" áp dụng RIÊNG cho từng
 * cây: cây chính (map.rootId) và mỗi nhánh trôi (xem TreeSettings trong
 * core/types.ts).
 *
 *  - Cây chính lưu ngay trên map (layoutType, organicEdges, activeThemeId,
 *    customTheme) nên file cũ mở ra không đổi gì.
 *  - Nhánh trôi có thể có bản ghi riêng ở map.treeSettings[rootId]; chưa có
 *    thì dùng theo cây chính.
 *  - Để đổi cây chính KHÔNG kéo theo các nhánh trôi, mỗi lần ghi cài đặt cây
 *    chính, những nhánh trôi chưa có bản ghi riêng được "chốt" lại với giá trị
 *    cũ của cây chính (cùng một bước hoàn tác).
 * ---------------------------------------------------------------------
 */
import type { LayoutType, MindMap, TreeSettings } from "./types";
import { deepClone, getRootIds } from "./tree";
import { sanitizeTheme } from "./theme";

const LAYOUT_TYPES: readonly LayoutType[] = ["logicRight", "logicLeft", "logicBoth", "treeDown", "orgChart", "treeUp"];
export const isLayoutType = (v: unknown): v is LayoutType => typeof v === "string" && (LAYOUT_TYPES as readonly string[]).includes(v);

/** Id node gốc của cây chứa `nodeId` (đi ngược parentId; có vòng lặp/đứt thì trả chính node cuối cùng tìm được). */
export function rootIdOf(map: MindMap, nodeId: string): string {
  let cur = nodeId;
  const seen = new Set<string>();
  for (;;) {
    const node = map.nodes[cur];
    if (!node || node.parentId === null || seen.has(cur)) return cur;
    seen.add(cur);
    cur = node.parentId;
  }
}

/** Cài đặt của cây cây chính, đọc từ các trường trên map. */
export function mainTreeSettings(map: MindMap): TreeSettings {
  return { layoutType: map.layoutType, organicEdges: map.organicEdges, activeThemeId: map.activeThemeId, customTheme: map.customTheme };
}

/** Cài đặt đang có hiệu lực của cây có gốc `rootId` (nhánh trôi chưa có bản ghi riêng → theo cây chính). */
export function settingsOfRoot(map: MindMap, rootId: string): TreeSettings {
  if (rootId === map.rootId) return mainTreeSettings(map);
  return map.treeSettings?.[rootId] ?? mainTreeSettings(map);
}

export const settingsOfNode = (map: MindMap, nodeId: string): TreeSettings => settingsOfRoot(map, rootIdOf(map, nodeId));
export const layoutOfNode = (map: MindMap, nodeId: string): LayoutType => settingsOfNode(map, nodeId).layoutType;

/** Cây có bản ghi riêng (khác "đang theo cây chính")? Cây chính luôn là true. */
export function hasOwnSettings(map: MindMap, rootId: string): boolean {
  return rootId === map.rootId || !!map.treeSettings?.[rootId];
}

/** Ảnh chụp mọi cài đặt cây — để Command hoàn tác chính xác. */
export interface TreeSettingsSnapshot {
  main: TreeSettings;
  floating: Record<string, TreeSettings>;
}

export function snapshotTreeSettings(map: MindMap): TreeSettingsSnapshot {
  return { main: deepClone(mainTreeSettings(map)), floating: deepClone(map.treeSettings ?? {}) };
}

export function restoreTreeSettings(map: MindMap, snap: TreeSettingsSnapshot): void {
  map.layoutType = snap.main.layoutType;
  map.organicEdges = snap.main.organicEdges;
  map.activeThemeId = snap.main.activeThemeId;
  map.customTheme = deepClone(snap.main.customTheme);
  map.treeSettings = deepClone(snap.floating);
}

/**
 * Ghi một phần cài đặt cho cây có gốc `rootId`.
 *  - Cây chính: trước hết chốt các nhánh trôi chưa có bản ghi riêng (giữ nguyên
 *    diện mạo hiện tại của chúng), rồi mới đổi các trường trên map.
 *  - Nhánh trôi: tạo bản ghi riêng từ cài đặt hiệu lực rồi áp phần đổi.
 */
export function writeTreeSettings(map: MindMap, rootId: string, patch: Partial<TreeSettings>): void {
  if (!map.treeSettings) map.treeSettings = {};
  if (rootId === map.rootId) {
    const before = mainTreeSettings(map);
    for (const id of getRootIds(map)) {
      if (id !== map.rootId && !map.treeSettings[id]) map.treeSettings[id] = deepClone(before);
    }
    if (patch.layoutType !== undefined) map.layoutType = patch.layoutType;
    if (patch.organicEdges !== undefined) map.organicEdges = patch.organicEdges;
    if (patch.activeThemeId !== undefined) map.activeThemeId = patch.activeThemeId;
    if (patch.customTheme !== undefined) map.customTheme = patch.customTheme;
    return;
  }
  map.treeSettings[rootId] = { ...deepClone(settingsOfRoot(map, rootId)), ...deepClone(patch) };
}

/** Chuẩn hoá một bản ghi đọc từ file (null nếu hỏng). */
function sanitizeOne(raw: unknown): TreeSettings | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  return {
    layoutType: isLayoutType(r.layoutType) ? r.layoutType : "logicRight",
    organicEdges: r.organicEdges === true,
    activeThemeId: typeof r.activeThemeId === "string" && r.activeThemeId ? r.activeThemeId : null,
    customTheme: sanitizeTheme(r.customTheme),
  };
}

/** Chuẩn hoá `map.treeSettings` đọc từ file: bỏ bản ghi hỏng; giữ lại chỉ những id có trong `nodeIds`. */
export function sanitizeTreeSettings(raw: unknown, nodeIds?: ReadonlySet<string>): Record<string, TreeSettings> {
  const out: Record<string, TreeSettings> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (nodeIds && !nodeIds.has(id)) continue;
    const one = sanitizeOne(v);
    if (one) out[id] = one;
  }
  return out;
}

