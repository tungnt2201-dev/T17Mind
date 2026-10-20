/**
 * ui/workspaceController.ts
 * ---------------------------------------------------------------------
 * KW0 — chọn/gắn thư mục Workspace làm nơi lưu chuẩn (xem io/storage.ts,
 * io/workspaceRepo.ts):
 *  - Bản exe: mặc định `<thư mục chứa exe>/T17Mind-Workspace` (mang cả
 *    thư mục exe sang máy khác là mang theo dữ liệu); đổi được sang thư
 *    mục khác, đường dẫn nhớ trong IndexedDB.
 *  - Chrome/Edge: người dùng chọn thư mục (File System Access API), handle
 *    nhớ trong IndexedDB; mỗi phiên trình duyệt có thể phải bấm cấp lại quyền.
 *  - Trình duyệt khác: chỉ bộ nhớ trình duyệt như trước.
 * Lần đầu gắn một thư mục TRỐNG: tự chép mọi map đang có trong bộ nhớ
 * trình duyệt vào đó (không mất map cũ).
 * ---------------------------------------------------------------------
 */
import { get } from "svelte/store";
import { DEFAULT_WORKSPACE_DIR_NAME } from "../core/workspace";
import { generateId } from "../core/tree";
import {
  copyBrowserMapsToWorkspace,
  flushWorkspaceWrites,
  getMeta,
  getWorkspaceRepo,
  listBrowserOnlyMaps,
  onWorkspaceSaveStatus,
  setMeta,
  setWorkspaceRepo,
} from "../io/storage";
import { WorkspaceRepo } from "../io/workspaceRepo";
import {
  browserFolderSupported,
  createBrowserFs,
  createNativeFs,
  ensureBrowserPermission,
  pickBrowserFolder,
  type DirHandle,
  type WorkspaceFs,
} from "../io/workspaceFs";
import { appDir, isDesktopApp } from "../io/nativeFs";
import { workspaceStore } from "./uiStores";
import { loadUserLibrary } from "./userLibrary";

const META_PATH = "workspacePath";
const META_HANDLE = "workspaceHandle";

interface NeutralinoUi {
  os: { showFolderDialog(title?: string, opts?: { defaultPath?: string }): Promise<string>; open(url: string): Promise<void> };
  app?: { exit(code?: number): Promise<void> };
  events?: { on(event: string, handler: () => void): Promise<unknown> };
}
const neu = (): NeutralinoUi | null => (globalThis as unknown as { Neutralino?: NeutralinoUi }).Neutralino ?? null;

export function defaultNativeWorkspacePath(): string {
  const dir = appDir().replace(/[\\/]+$/, "");
  return dir ? `${dir}/${DEFAULT_WORKSPACE_DIR_NAME}` : DEFAULT_WORKSPACE_DIR_NAME;
}

async function attach(fs: WorkspaceFs): Promise<WorkspaceRepo> {
  await flushWorkspaceWrites();
  const repo = await WorkspaceRepo.open(fs, { newId: () => generateId("m").replace(/^m_/, "ws_"), name: "T17Mind Workspace" });
  const wasEmpty = repo.listMaps().length === 0;
  setWorkspaceRepo(repo);
  if (wasEmpty) {
    const browserOnly = await listBrowserOnlyMaps();
    if (browserOnly.length > 0) await copyBrowserMapsToWorkspace(browserOnly.map((e) => e.mapId));
  }
  workspaceStore.update((s) => ({ ...s, kind: fs.kind === "native" ? "native" : "browser", label: fs.label, needsPermission: null, error: null }));
  await loadUserLibrary();
  return repo;
}

/** Gọi MỘT lần lúc khởi động, TRƯỚC khi nạp map đầu tiên. Không bao giờ ném lỗi. */
export async function initWorkspace(): Promise<void> {
  onWorkspaceSaveStatus((st) => workspaceStore.update((s) => ({ ...s, ...st })));
  const desktop = isDesktopApp();
  workspaceStore.update((s) => ({ ...s, folderSupported: desktop || browserFolderSupported() }));
  // Gắn TRƯỚC khi mở Workspace: exe đã tắt exitProcessOnClose, nếu không có
  // bộ xử lý này thì nút ✕ không đóng được cửa sổ (kể cả khi mở Workspace lỗi).
  if (desktop) installCloseFlush();
  try {
    if (desktop) {
      const path = (await getMeta<string>(META_PATH)) || defaultNativeWorkspacePath();
      await attach(createNativeFs(path));
    } else if (browserFolderSupported()) {
      const handle = await getMeta<DirHandle>(META_HANDLE);
      if (handle) {
        if (await ensureBrowserPermission(handle, false)) await attach(createBrowserFs(handle));
        else workspaceStore.update((s) => ({ ...s, needsPermission: handle.name }));
      }
    }
  } catch (err) {
    console.warn("Không mở được thư mục Workspace, tạm dùng bộ nhớ trình duyệt:", err);
    setWorkspaceRepo(null);
    workspaceStore.update((s) => ({ ...s, kind: "idb", label: "", error: `Không mở được thư mục Workspace: ${(err as Error)?.message ?? err}` }));
  }
  if (!getWorkspaceRepo()) await loadUserLibrary();
  if (!desktop && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushWorkspaceWrites();
    });
    window.addEventListener("pagehide", () => void flushWorkspaceWrites());
  }
}

/** Bản exe: bấm đóng cửa sổ → ghi nốt thay đổi ra thư mục rồi mới thoát
 *  (cần exitProcessOnClose = false trong neutralino.config.json). */
let closeFlushInstalled = false;
function installCloseFlush(): void {
  const n = neu();
  if (closeFlushInstalled || !n?.events || !n.app) return;
  closeFlushInstalled = true;
  void n.events.on("windowClose", () => {
    const exit = () => void n.app!.exit();
    const timeout = new Promise((r) => setTimeout(r, 5000));
    void Promise.race([flushWorkspaceWrites(), timeout]).finally(exit);
  });
}

/**
 * Chọn thư mục Workspace khác (exe: hộp thoại thư mục; Chrome/Edge: chọn
 * thư mục). Trả về true nếu đã đổi. Phải gọi từ một cú bấm.
 */
export async function chooseWorkspaceFolder(): Promise<boolean> {
  try {
    if (isDesktopApp()) {
      const n = neu();
      const current = get(workspaceStore).label || defaultNativeWorkspacePath();
      const path = await n?.os.showFolderDialog("Chọn thư mục Workspace", { defaultPath: current });
      if (!path) return false;
      await attach(createNativeFs(path));
      await setMeta(META_PATH, path);
      return true;
    }
    const handle = await pickBrowserFolder();
    if (!handle) return false;
    if (!(await ensureBrowserPermission(handle, true))) return false;
    await attach(createBrowserFs(handle));
    await setMeta(META_HANDLE, handle);
    return true;
  } catch (err) {
    workspaceStore.update((s) => ({ ...s, error: `Không dùng được thư mục này: ${(err as Error)?.message ?? err}` }));
    return false;
  }
}

/** Chrome/Edge: cấp lại quyền cho thư mục đã nhớ (phải gọi từ một cú bấm). */
export async function reconnectWorkspaceFolder(): Promise<boolean> {
  const handle = await getMeta<DirHandle>(META_HANDLE);
  if (!handle || !(await ensureBrowserPermission(handle, true))) return false;
  await attach(createBrowserFs(handle));
  return true;
}

/** Bản exe: quay về thư mục mặc định cạnh file exe. */
export async function useDefaultNativeWorkspace(): Promise<void> {
  await attach(createNativeFs(defaultNativeWorkspacePath()));
  await setMeta(META_PATH, undefined);
}

/** Trình duyệt: thôi dùng thư mục, quay về bộ nhớ trình duyệt. */
export async function disconnectWorkspaceFolder(): Promise<void> {
  await flushWorkspaceWrites();
  setWorkspaceRepo(null);
  await setMeta(META_HANDLE, undefined);
  workspaceStore.update((s) => ({ ...s, kind: "idb", label: "", needsPermission: null }));
  await loadUserLibrary();
}

/** Bản exe: mở thư mục Workspace bằng Explorer. */
export async function revealWorkspaceFolder(): Promise<void> {
  const label = get(workspaceStore).label;
  if (label && isDesktopApp()) await neu()?.os.open(label);
}

export function workspaceRepoOrNull(): WorkspaceRepo | null {
  return getWorkspaceRepo();
}
