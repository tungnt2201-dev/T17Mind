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
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { validateMindMap } from "../core/validate";
import { migrateToLatest } from "../core/migrate";

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

/** Tên hiển thị của một map: ưu tiên mapTitle đã đặt riêng, không thì
 *  lấy luôn chữ của node gốc — người dùng không cần đặt tên thủ công
 *  cho trường hợp thông thường. */
function effectiveTitle(map: MindMap): string {
  const custom = map.mapTitle?.trim();
  if (custom) return custom;
  const rootText = map.nodes[map.rootId]?.text?.trim();
  return rootText || "Chưa đặt tên";
}

/** Liệt kê mọi map đã lưu, mới cập nhật nhất lên đầu — dùng cho "Map
 *  gần đây". Đọc từ bảng chỉ mục NHẸ, không tải dữ liệu đầy đủ. */
export async function listMaps(): Promise<MapIndexEntry[]> {
  try {
    const all = await runInStore<MapIndexEntry[]>(INDEX_STORE, "readonly", (s) => s.getAll());
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Lưu một map: ghi dữ liệu đầy đủ, cập nhật bảng chỉ mục, và đánh dấu
 *  nó là map đang mở gần nhất. */
export async function saveMap(map: MindMap): Promise<void> {
  try {
    await runInStore(MAPS_STORE, "readwrite", (s) => s.put(map));
    const entry: MapIndexEntry = { mapId: map.mapId, title: effectiveTitle(map), updatedAt: Date.now() };
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
  try {
    const meta = await runInStore<{ key: string; value: string } | undefined>(META_STORE, "readonly", (s) => s.get(LAST_ACTIVE_KEY));
    if (!meta) return null;
    return await loadMap(meta.value);
  } catch {
    return null;
  }
}

/** Đánh dấu map đang mở gần nhất — gọi khi CHUYỂN SANG một map khác
 *  (không phải lúc sửa nội dung, lúc đó saveMap() đã tự làm việc này). */
export async function setLastActiveMapId(mapId: string): Promise<void> {
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
