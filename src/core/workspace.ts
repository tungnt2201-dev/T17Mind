/**
 * core/workspace.ts
 * ---------------------------------------------------------------------
 * KW0 — Workspace = một THƯ MỤC trên ổ đĩa, là nơi lưu chuẩn của mọi map
 * (và sau này card dùng chung — KW1, nguồn PDF — KW3):
 *
 *   <Workspace>/
 *     workspace.json        danh mục (manifest) — file này
 *     maps/<mapId>.t17m     mỗi map một file (định dạng .t17m sẵn có)
 *     .trash/               map bị xoá được chuyển vào đây, không xoá hẳn
 *
 * Module này THUẦN (không đụng ổ đĩa): tạo/đọc/kiểm tra manifest, cập
 * nhật danh sách map, đối chiếu manifest với các file thật có trong
 * maps/ (manifest hỏng/thiếu vẫn dựng lại được từ file). Việc đọc/ghi
 * thật nằm ở io/workspaceFs.ts và io/workspaceRepo.ts.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "./types";

export const WORKSPACE_FORMAT = "t17mind-workspace";
export const WORKSPACE_FORMAT_VERSION = 1;
export const MANIFEST_FILE = "workspace.json";
export const MAPS_DIR = "maps";
export const TRASH_DIR = ".trash";
/** Tên thư mục Workspace mặc định cạnh file exe. */
export const DEFAULT_WORKSPACE_DIR_NAME = "T17Mind-Workspace";

export interface WorkspaceMapEntry {
  mapId: string;
  /** Đường dẫn tương đối trong Workspace, ví dụ "maps/m_abc.t17m". */
  file: string;
  title: string;
  updatedAt: number;
}

export interface WorkspaceManifest {
  format: typeof WORKSPACE_FORMAT;
  formatVersion: number;
  workspaceId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Map mở gần nhất trong Workspace này — để mang thư mục sang máy khác
   *  vẫn mở đúng map đang làm dở. */
  lastOpenedMapId: string | null;
  maps: WorkspaceMapEntry[];
}

export function mapFilePath(mapId: string): string {
  return `${MAPS_DIR}/${mapId}.t17m`;
}

/** mapId lấy từ tên file "maps/<mapId>.t17m" (hoặc chỉ "<mapId>.t17m"); null nếu không đúng dạng. */
export function mapIdFromFileName(name: string): string | null {
  const base = name.split("/").pop() ?? "";
  const m = /^([A-Za-z0-9_-]+)\.t17m$/.exec(base);
  return m ? m[1]! : null;
}

/** Tên hiển thị của map: mapTitle riêng, không thì chữ của node gốc. */
export function mapDisplayTitle(map: MindMap): string {
  const custom = map.mapTitle?.trim();
  if (custom) return custom;
  return map.nodes[map.rootId]?.text?.trim() || "Chưa đặt tên";
}

export function createManifest(workspaceId: string, name: string, now: number = Date.now()): WorkspaceManifest {
  return {
    format: WORKSPACE_FORMAT,
    formatVersion: WORKSPACE_FORMAT_VERSION,
    workspaceId,
    name,
    createdAt: now,
    updatedAt: now,
    lastOpenedMapId: null,
    maps: [],
  };
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Đọc manifest từ chuỗi JSON. Trả về null nếu không phải manifest của
 * T17Mind (khi đó Workspace sẽ được dựng lại từ các file trong maps/).
 * Ném lỗi nếu manifest do bản T17Mind MỚI HƠN tạo ra — không được ghi đè.
 * Các mục map sai dạng bị bỏ qua (không làm hỏng cả Workspace).
 */
export function parseManifest(text: string): WorkspaceManifest | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.format !== WORKSPACE_FORMAT || typeof r.workspaceId !== "string" || !r.workspaceId) return null;
  const version = isNum(r.formatVersion) ? r.formatVersion : 1;
  if (version > WORKSPACE_FORMAT_VERSION) {
    throw new Error(
      `Thư mục Workspace này được tạo bởi một bản T17Mind mới hơn (định dạng ${version}). Hãy cập nhật ứng dụng rồi mở lại.`
    );
  }
  const seen = new Set<string>();
  const maps: WorkspaceMapEntry[] = [];
  for (const e of Array.isArray(r.maps) ? r.maps : []) {
    if (typeof e !== "object" || e === null) continue;
    const m = e as Record<string, unknown>;
    if (typeof m.mapId !== "string" || !mapIdFromFileName(`${m.mapId}.t17m`) || seen.has(m.mapId)) continue;
    seen.add(m.mapId);
    maps.push({
      mapId: m.mapId,
      file: mapFilePath(m.mapId),
      title: typeof m.title === "string" && m.title.trim() ? m.title : "Chưa đặt tên",
      updatedAt: isNum(m.updatedAt) ? m.updatedAt : 0,
    });
  }
  const now = Date.now();
  return {
    format: WORKSPACE_FORMAT,
    formatVersion: WORKSPACE_FORMAT_VERSION,
    workspaceId: r.workspaceId,
    name: typeof r.name === "string" && r.name.trim() ? r.name : "Workspace",
    createdAt: isNum(r.createdAt) ? r.createdAt : now,
    updatedAt: isNum(r.updatedAt) ? r.updatedAt : now,
    lastOpenedMapId: typeof r.lastOpenedMapId === "string" && seen.has(r.lastOpenedMapId) ? r.lastOpenedMapId : null,
    maps,
  };
}

export function serializeManifest(m: WorkspaceManifest): string {
  return JSON.stringify(m, null, 2);
}

/** Thêm/cập nhật mục của một map (trả về manifest MỚI, không sửa bản cũ). */
export function upsertMapEntry(m: WorkspaceManifest, entry: Omit<WorkspaceMapEntry, "file">, now: number = Date.now()): WorkspaceManifest {
  const full: WorkspaceMapEntry = { ...entry, file: mapFilePath(entry.mapId) };
  const maps = m.maps.some((e) => e.mapId === entry.mapId)
    ? m.maps.map((e) => (e.mapId === entry.mapId ? full : e))
    : [...m.maps, full];
  return { ...m, maps, updatedAt: now };
}

export function removeMapEntry(m: WorkspaceManifest, mapId: string, now: number = Date.now()): WorkspaceManifest {
  return {
    ...m,
    maps: m.maps.filter((e) => e.mapId !== mapId),
    lastOpenedMapId: m.lastOpenedMapId === mapId ? null : m.lastOpenedMapId,
    updatedAt: now,
  };
}

/**
 * Đối chiếu manifest với danh sách file thật trong maps/:
 *  - mục trỏ tới file không còn → bỏ;
 *  - file có mà manifest chưa biết (chép tay vào, manifest cũ/hỏng) →
 *    trả về trong `unknownMapIds` để nơi gọi đọc file lấy tên rồi thêm.
 */
export function reconcileManifest(
  m: WorkspaceManifest,
  fileNames: string[]
): { manifest: WorkspaceManifest; unknownMapIds: string[]; changed: boolean } {
  const onDisk = new Set(fileNames.map(mapIdFromFileName).filter((x): x is string => x !== null));
  const kept = m.maps.filter((e) => onDisk.has(e.mapId));
  const known = new Set(kept.map((e) => e.mapId));
  const unknownMapIds = [...onDisk].filter((id) => !known.has(id)).sort();
  const changed = kept.length !== m.maps.length;
  const manifest = changed
    ? { ...m, maps: kept, lastOpenedMapId: m.lastOpenedMapId && known.has(m.lastOpenedMapId) ? m.lastOpenedMapId : null }
    : m;
  return { manifest, unknownMapIds, changed };
}

/** Danh sách map mới cập nhật nhất lên đầu (dùng cho "Map gần đây"). */
export function sortedMapEntries(m: WorkspaceManifest): WorkspaceMapEntry[] {
  return [...m.maps].sort((a, b) => b.updatedAt - a.updatedAt);
}
