/**
 * io/storage.ts
 * ---------------------------------------------------------------------
 * P1.11 — Lưu trữ bền vững qua IndexedDB, thay cho localStorage tạm bợ
 * của P2.6d (giới hạn ~5MB, dễ mất khi người dùng dọn dữ liệu duyệt
 * web — comment cũ đã ghi rõ "P1.11 sẽ thay bằng IndexedDB", đây chính
 * là bước đó).
 *
 * GIỮ NGUYÊN chữ ký các hàm public (tên + tham số) so với bản cũ, CHỈ
 * đổi mọi hàm từ ĐỒNG BỘ sang BẤT ĐỒNG BỘ (trả về Promise) — vì
 * IndexedDB tự bản chất là API bất đồng bộ, không có cách nào dùng nó
 * kiểu đồng bộ như localStorage. Điều này buộc MỌI NƠI GỌI các hàm này
 * (main.ts, appController.ts, MapsModal.svelte) phải thêm `await` —
 * đã rà soát và cập nhật đủ cả 3 nơi, xem lịch sử commit cùng đợt.
 *
 * Ba "kho" (object store) trong IndexedDB, vai trò y hệt 3 khoá
 * localStorage cũ:
 *  - "maps"     : dữ liệu ĐẦY ĐỦ của từng map, khoá = mapId.
 *  - "mapIndex" : bảng NHẸ (chỉ id/tên/thời gian cập nhật) để hiện
 *                 "Map gần đây" NHANH, không phải tải hết dữ liệu từng
 *                 map chỉ để liệt kê chúng.
 *  - "meta"     : cặp key-value đơn giản, hiện chỉ dùng đúng 1 khoá
 *                 "lastActiveMapId" — map đang mở gần nhất.
 *
 * MỌI hàm public đều tự bọc lỗi (try/catch quanh Promise) và trả về
 * giá trị "an toàn" (null/[]/false) nếu IndexedDB bị chặn/lỗi — giữ
 * đúng triết lý "giải pháp lưu trữ không được phép làm SẬP app" của
 * bản cũ, chỉ lặng lẽ bỏ qua khi không lưu/đọc được.
 *
 * KW0 — khi đã gắn một THƯ MỤC Workspace (setWorkspaceRepo, xem
 * io/workspaceRepo.ts) thì thư mục đó là NƠI LƯU CHUẨN: danh sách map,
 * mở map, xoá, đổi tên đều đi qua nó. IndexedDB vẫn được ghi NGAY mỗi lần
 * lưu làm bản dự phòng; thư mục được ghi sau khi ngừng sửa WRITE_DELAY_MS
 * (ghi cả file .t17m mỗi phím gõ là quá nặng). Lúc mở map, bản nào mới
 * hơn (so updatedAt) thắng — app tắt đột ngột trước khi kịp ghi ra thư
 * mục thì lần sau vẫn lấy lại được từ IndexedDB rồi ghi bù.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { validateMindMap } from "../core/validate";
import { migrateToLatest } from "../core/migrate";
import { mapDisplayTitle } from "../core/workspace";
import type { WorkspaceRepo } from "./workspaceRepo";

const DB_NAME = "t17mind-db";
const DB_VERSION = 1;
const MAPS_STORE = "maps";
const INDEX_STORE = "mapIndex";
const META_STORE = "meta";
const LAST_ACTIVE_KEY = "lastActiveMapId";

export interface MapIndexEntry {
  mapId: string;
  title: string;
  updatedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

/** Mở (hoặc tạo mới nếu chưa có) database, tạo đủ 3 object store ở
 *  lần đầu tiên — CHỈ mở MỘT LẦN cho cả phiên làm việc (cache lại
 *  Promise, không mở lại mỗi lần gọi). */
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MAPS_STORE)) db.createObjectStore(MAPS_STORE, { keyPath: "mapId" });
      if (!db.objectStoreNames.contains(INDEX_STORE)) db.createObjectStore(INDEX_STORE, { keyPath: "mapId" });
      if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/** Chạy MỘT thao tác (get/put/delete/getAll...) trong đúng MỘT
 *  transaction, bọc thành Promise — dùng chung cho mọi hàm public bên
 *  dưới để không lặp lại code quản lý transaction. */
function runInStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

const effectiveTitle = mapDisplayTitle;

// ------------------------------------------------------- KW0: Workspace

/** Ghi ra thư mục Workspace sau khi ngừng sửa chừng này (ms). */
export const WRITE_DELAY_MS = 800;

export interface WorkspaceSaveStatus {
  /** Lần ghi ra thư mục thành công gần nhất (ms), 0 nếu chưa. */
  lastSavedAt: number;
  /** Còn thay đổi chưa ghi ra thư mục. */
  pending: boolean;
  /** Lỗi ghi gần nhất (null nếu lần ghi sau đó đã thành công). */
  error: string | null;
}

let repo: WorkspaceRepo | null = null;
const pendingWrites = new Map<string, { map: MindMap; updatedAt: number; timer: ReturnType<typeof setTimeout> }>();
let status: WorkspaceSaveStatus = { lastSavedAt: 0, pending: false, error: null };
let statusListener: ((s: WorkspaceSaveStatus) => void) | null = null;

function setStatus(patch: Partial<WorkspaceSaveStatus>): void {
  status = { ...status, ...patch };
  statusListener?.(status);
}

export function onWorkspaceSaveStatus(fn: ((s: WorkspaceSaveStatus) => void) | null): void {
  statusListener = fn;
  fn?.(status);
}

/** Gắn (hoặc bỏ — null) thư mục Workspace làm nơi lưu chuẩn. */
export function setWorkspaceRepo(next: WorkspaceRepo | null): void {
  for (const p of pendingWrites.values()) clearTimeout(p.timer);
  pendingWrites.clear();
  repo = next;
  setStatus({ pending: false, error: null });
}

export function getWorkspaceRepo(): WorkspaceRepo | null {
  return repo;
}

function scheduleWorkspaceWrite(map: MindMap, updatedAt: number): void {
  if (!repo) return;
  const old = pendingWrites.get(map.mapId);
  if (old) clearTimeout(old.timer);
  const timer = setTimeout(() => void writeOne(map.mapId), WRITE_DELAY_MS);
  pendingWrites.set(map.mapId, { map, updatedAt, timer });
  setStatus({ pending: true });
}

async function writeOne(mapId: string): Promise<void> {
  const job = pendingWrites.get(mapId);
  const target = repo;
  if (!job || !target) return;
  clearTimeout(job.timer);
  pendingWrites.delete(mapId);
  try {
    await target.writeMap(job.map, job.updatedAt);
    setStatus({ lastSavedAt: Date.now(), error: null, pending: pendingWrites.size > 0 });
  } catch (err) {
    console.warn(`Không ghi được map "${mapId}" ra thư mục Workspace:`, err);
    setStatus({ error: (err as Error)?.message ?? String(err), pending: pendingWrites.size > 0 });
  }
}

/** Ghi ngay mọi thay đổi đang chờ ra thư mục (gọi trước khi đóng app,
 *  khi đổi Workspace, khi tab bị ẩn). */
export async function flushWorkspaceWrites(): Promise<void> {
  await Promise.all([...pendingWrites.keys()].map((id) => writeOne(id)));
  await repo?.idle();
}

async function idbIndexEntry(mapId: string): Promise<MapIndexEntry | undefined> {
  try {
    return await runInStore<MapIndexEntry | undefined>(INDEX_STORE, "readonly", (s) => s.get(mapId));
  } catch {
    return undefined;
  }
}

async function listIdbMaps(): Promise<MapIndexEntry[]> {
  try {
    const all = await runInStore<MapIndexEntry[]>(INDEX_STORE, "readonly", (s) => s.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Map chỉ có trong bộ nhớ trình duyệt mà Workspace chưa có (để đưa vào). */
export async function listBrowserOnlyMaps(): Promise<MapIndexEntry[]> {
  if (!repo) return [];
  const r = repo;
  return (await listIdbMaps()).filter((e) => !r.getEntry(e.mapId));
}

/** Chép các map (theo id) từ bộ nhớ trình duyệt vào thư mục Workspace. */
export async function copyBrowserMapsToWorkspace(mapIds: string[]): Promise<number> {
  if (!repo) return 0;
  let n = 0;
  for (const id of mapIds) {
    const map = await loadIdbMap(id);
    const entry = await idbIndexEntry(id);
    if (!map) continue;
    await repo.writeMap(map, entry?.updatedAt ?? Date.now());
    n++;
  }
  return n;
}

/** Liệt kê mọi map đã lưu, mới cập nhật nhất lên đầu — dùng cho "Map
 *  gần đây". Đọc từ bảng chỉ mục NHẸ, không tải dữ liệu đầy đủ. */
export async function listMaps(): Promise<MapIndexEntry[]> {
  if (repo) return repo.listMaps().map((e) => ({ mapId: e.mapId, title: e.title, updatedAt: e.updatedAt }));
  return listIdbMaps();
}

/** Lưu một map: ghi dữ liệu đầy đủ, cập nhật bảng chỉ mục, và đánh dấu
 *  nó là map đang mở gần nhất. */
export async function saveMap(map: MindMap): Promise<void> {
  const updatedAt = Date.now();
  scheduleWorkspaceWrite(map, updatedAt);
  if (repo && repo.lastOpenedMapId !== map.mapId) void repo.setLastOpened(map.mapId).catch(() => undefined);
  try {
    await runInStore(MAPS_STORE, "readwrite", (s) => s.put(map));
    const entry: MapIndexEntry = { mapId: map.mapId, title: effectiveTitle(map), updatedAt };
    await runInStore(INDEX_STORE, "readwrite", (s) => s.put(entry));
    await runInStore(META_STORE, "readwrite", (s) => s.put({ key: LAST_ACTIVE_KEY, value: map.mapId }));
  } catch {
    // IndexedDB đầy/bị chặn (ví dụ chế độ ẩn danh nghiêm ngặt) — im
    // lặng bỏ qua, giống triết lý bản localStorage cũ. Người dùng vẫn
    // luôn có thể tự "Xuất JSON" thủ công để không mất dữ liệu.
  }
}

/** Tải một map theo đúng mapId, tự di trú lên schema mới nhất và xác
 *  thực trước khi trả về — null nếu không tồn tại hoặc dữ liệu hỏng. */
export async function loadMap(mapId: string): Promise<MindMap | null> {
  if (!repo) return loadIdbMap(mapId);
  const pending = pendingWrites.get(mapId);
  if (pending) return structuredClone(pending.map);
  const entry = repo.getEntry(mapId);
  const idbEntry = await idbIndexEntry(mapId);
  // Bản trong IndexedDB mới hơn thư mục: lần trước app tắt trước khi kịp
  // ghi ra thư mục → dùng bản này và ghi bù.
  if (idbEntry && (!entry || idbEntry.updatedAt > entry.updatedAt)) {
    const fromIdb = await loadIdbMap(mapId);
    if (fromIdb) {
      if (entry) scheduleWorkspaceWrite(fromIdb, idbEntry.updatedAt);
      return fromIdb;
    }
  }
  return entry ? repo.readMap(mapId) : null;
}

async function loadIdbMap(mapId: string): Promise<MindMap | null> {
  try {
    const raw = await runInStore<MindMap | undefined>(MAPS_STORE, "readonly", (s) => s.get(mapId));
    if (!raw) return null;
    const migrated = migrateToLatest(raw as unknown as Record<string, unknown>);
    const errors = validateMindMap(migrated);
    if (errors.length > 0) {
      console.warn(`Bỏ qua map "${mapId}" vì dữ liệu không hợp lệ:`, errors);
      return null;
    }
    return migrated;
  } catch (err) {
    console.warn(`Không đọc được map "${mapId}":`, err);
    return null;
  }
}

/** Tải map đang mở gần nhất — dùng lúc khởi động app. null nếu chưa
 *  từng mở map nào, hoặc map đó đã bị xoá — KHÔNG tự ý rơi vào một map
 *  khác bất kỳ trong danh sách. */
export async function loadLastActiveMap(): Promise<MindMap | null> {
  let id: string | null = null;
  try {
    const meta = await runInStore<{ key: string; value: string } | undefined>(META_STORE, "readonly", (s) => s.get(LAST_ACTIVE_KEY));
    id = meta?.value ?? null;
  } catch {
    id = null;
  }
  if (repo) {
    // Thư mục mang sang máy khác: map mở gần nhất trên máy này có thể không
    // thuộc Workspace → dùng map mở gần nhất ghi trong workspace.json.
    if (!id || !repo.getEntry(id)) id = repo.lastOpenedMapId ?? repo.listMaps()[0]?.mapId ?? null;
  }
  return id ? loadMap(id) : null;
}

/** Đánh dấu map đang mở gần nhất — gọi khi CHUYỂN SANG một map khác
 *  (không phải lúc sửa nội dung, lúc đó saveMap() đã tự làm việc này). */
export async function setLastActiveMapId(mapId: string): Promise<void> {
  void repo?.setLastOpened(mapId).catch(() => undefined);
  try {
    await runInStore(META_STORE, "readwrite", (s) => s.put({ key: LAST_ACTIVE_KEY, value: mapId }));
  } catch {
    // bỏ qua
  }
}

/** Đổi tên hiển thị của một map trong "Map gần đây" — CHỈ đổi
 *  mapTitle lưu trong chính dữ liệu map đó (nguồn sự thật duy nhất),
 *  rồi lưu lại qua saveMap() để bảng chỉ mục tự cập nhật theo — không
 *  sửa trực tiếp bảng chỉ mục để tránh hai nơi lưu tên bị lệch nhau.
 *  Trả về false nếu không tìm thấy map đó. */
export async function renameMap(mapId: string, newTitle: string): Promise<boolean> {
  const map = await loadMap(mapId);
  if (!map) return false;
  map.mapTitle = newTitle.trim() || null;
  await saveMap(map);
  return true;
}

/** Xoá hẳn một map — cả dữ liệu đầy đủ lẫn mục trong bảng chỉ mục. Nếu
 *  đây đúng là map đang mở gần nhất, xoá luôn con trỏ đó (không để nó
 *  trỏ tới một map không còn tồn tại). */
export async function deleteMap(mapId: string): Promise<void> {
  const pending = pendingWrites.get(mapId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingWrites.delete(mapId);
  }
  if (repo) {
    try {
      await repo.deleteMap(mapId);
    } catch (err) {
      console.warn(`Không xoá được map "${mapId}" trong Workspace:`, err);
    }
  }
  try {
    await runInStore(MAPS_STORE, "readwrite", (s) => s.delete(mapId));
    await runInStore(INDEX_STORE, "readwrite", (s) => s.delete(mapId));
    const meta = await runInStore<{ key: string; value: string } | undefined>(META_STORE, "readonly", (s) => s.get(LAST_ACTIVE_KEY));
    if (meta?.value === mapId) {
      await runInStore(META_STORE, "readwrite", (s) => s.delete(LAST_ACTIVE_KEY));
    }
  } catch {
    // bỏ qua
  }
}

/** KW0 — cặp key/value bền trong IndexedDB (đường dẫn/handle thư mục
 *  Workspace…). Giá trị có thể là object (handle thư mục lưu được nhờ
 *  structured clone). undefined nếu chưa có hoặc lỗi. */
export async function getMeta<T>(key: string): Promise<T | undefined> {
  try {
    const row = await runInStore<{ key: string; value: T } | undefined>(META_STORE, "readonly", (s) => s.get(key));
    return row?.value;
  } catch {
    return undefined;
  }
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  try {
    if (value === undefined) await runInStore(META_STORE, "readwrite", (s) => s.delete(key));
    else await runInStore(META_STORE, "readwrite", (s) => s.put({ key, value }));
  } catch {
    // bỏ qua
  }
}
