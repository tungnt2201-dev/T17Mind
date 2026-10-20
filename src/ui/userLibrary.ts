/**
 * ui/userLibrary.ts
 * ---------------------------------------------------------------------
 * Biểu tượng ghim + theme riêng của NGƯỜI DÙNG (không thuộc một map):
 *  - có thư mục Workspace → lưu trong đó (workspace.json#pinnedMarkers,
 *    themes/<id>.json) — mang thư mục sang máy khác là mang theo;
 *  - chưa có → lưu trong IndexedDB (meta) của trình duyệt.
 * "Dùng gần đây" là thói quen của từng máy → localStorage.
 * Nạp lại mỗi khi đổi Workspace (ui/workspaceController.ts gọi).
 * ---------------------------------------------------------------------
 */
import { writable, get } from "svelte/store";
import { DEFAULT_PINNED_MARKERS, pushRecent } from "../core/emojiCatalog";
import { registerCustomThemes, sanitizeTheme, THEMES, type Theme } from "../core/theme";
import { isSafeId, sanitizePinnedMarkers } from "../core/workspace";
import { getMeta, getWorkspaceRepo, setMeta } from "../io/storage";

const META_PINNED = "pinnedMarkers";
const META_THEMES = "customThemes";
const LS_RECENT = "t17mind-recent-markers";

export const pinnedMarkersStore = writable<string[]>([...DEFAULT_PINNED_MARKERS]);
export const recentMarkersStore = writable<string[]>(readRecent());
export const customThemesStore = writable<Theme[]>([]);

function readRecent(): string[] {
  try {
    return sanitizePinnedMarkers(JSON.parse(localStorage.getItem(LS_RECENT) ?? "[]")) ?? [];
  } catch {
    return [];
  }
}

export function noteRecentMarker(e: string): void {
  const next = pushRecent(get(recentMarkersStore), e);
  recentMarkersStore.set(next);
  try {
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch {
    // bỏ qua (chế độ riêng tư…)
  }
}

/** Nạp bộ ghim + theme riêng từ nơi lưu hiện tại. Không ném lỗi. */
export async function loadUserLibrary(): Promise<void> {
  const repo = getWorkspaceRepo();
  let pinned: string[] | null = null;
  let themes: Theme[] = [];
  try {
    if (repo) {
      pinned = repo.pinnedMarkers;
      themes = await repo.listThemes();
    } else {
      pinned = sanitizePinnedMarkers(await getMeta<unknown>(META_PINNED));
      const raw = await getMeta<unknown[]>(META_THEMES);
      themes = (Array.isArray(raw) ? raw : []).map(sanitizeTheme).filter((t): t is Theme => t !== null);
    }
  } catch (err) {
    console.warn("Không nạp được biểu tượng ghim / theme riêng:", err);
  }
  pinnedMarkersStore.set(pinned ?? [...DEFAULT_PINNED_MARKERS]);
  registerCustomThemes(themes);
  customThemesStore.set(themes);
}

export async function setPinnedMarkers(list: string[] | null): Promise<void> {
  const clean = list === null ? null : sanitizePinnedMarkers(list);
  pinnedMarkersStore.set(clean ?? [...DEFAULT_PINNED_MARKERS]);
  const repo = getWorkspaceRepo();
  if (repo) await repo.setPinnedMarkers(clean);
  else await setMeta(META_PINNED, clean ?? undefined);
}

export async function togglePinnedMarker(e: string): Promise<void> {
  const cur = get(pinnedMarkersStore);
  await setPinnedMarkers(cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e]);
}

/** Lưu (tạo mới hoặc ghi đè) một theme riêng. */
export async function saveCustomTheme(theme: Theme): Promise<Theme> {
  const clean = sanitizeTheme(theme);
  if (!clean || !isSafeId(clean.id) || THEMES.some((t) => t.id === clean.id)) throw new Error("Theme không hợp lệ.");
  const repo = getWorkspaceRepo();
  if (repo) await repo.writeTheme(clean);
  else {
    const list = get(customThemesStore).filter((t) => t.id !== clean.id);
    await setMeta(META_THEMES, [...list, clean]);
  }
  await loadUserLibrary();
  return clean;
}

export async function deleteCustomTheme(id: string): Promise<void> {
  const repo = getWorkspaceRepo();
  if (repo) await repo.deleteTheme(id);
  else await setMeta(META_THEMES, get(customThemesStore).filter((t) => t.id !== id));
  await loadUserLibrary();
}

export function newCustomThemeId(): string {
  return `theme_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Đọc theme từ nội dung file .t17theme (JSON). Luôn cấp id mới để không
 *  ghi đè theme đang có. null nếu file không phải theme hợp lệ. */
export function parseThemeFile(text: string): Theme | null {
  try {
    const raw = JSON.parse(text) as Record<string, unknown>;
    const body = raw && typeof raw === "object" && raw.format === "t17mind-theme" ? raw.theme : raw;
    const t = sanitizeTheme(body);
    return t ? { ...t, id: newCustomThemeId() } : null;
  } catch {
    return null;
  }
}

export function themeFileContent(theme: Theme): string {
  const { custom: _custom, ...rest } = theme;
  return JSON.stringify({ format: "t17mind-theme", version: 1, theme: rest }, null, 2);
}
