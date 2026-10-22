/**
 * io/workspaceFs.ts
 * ---------------------------------------------------------------------
 * KW0 — lớp đọc/ghi file tối thiểu cho thư mục Workspace, ba cách cài đặt:
 *  - "native"  : bản exe (Neutralino) — đường dẫn thật trên ổ đĩa.
 *  - "browser" : Chrome/Edge — thư mục người dùng chọn qua File System
 *                Access API (showDirectoryPicker), handle lưu trong IndexedDB.
 *  - "memory"  : trong bộ nhớ — dùng cho test.
 *
 * Đường dẫn luôn TƯƠNG ĐỐI so với gốc Workspace, ngăn cách bằng "/".
 * `write` phải an toàn khi mất điện giữa chừng: native ghi file tạm rồi
 * đổi tên; browser dùng createWritable (trình duyệt tự ghi ra file phụ,
 * chỉ thay file thật khi close()).
 *
 * Quyền Neutralino cần có trong desktop/neutralino.config.json →
 * nativeAllowList: filesystem.readBinaryFile, writeBinaryFile,
 * readDirectory, createDirectory, getStats, move, remove, os.showFolderDialog.
 * ---------------------------------------------------------------------
 */

export interface WorkspaceFs {
  readonly kind: "native" | "browser" | "memory";
  /** Đường dẫn (native) hoặc tên thư mục (browser) để hiện cho người dùng. */
  readonly label: string;
  /** null nếu file không tồn tại. */
  read(path: string): Promise<Uint8Array | null>;
  /** Ghi (tạo thư mục cha nếu thiếu), an toàn khi gián đoạn giữa chừng. */
  write(path: string, data: Uint8Array): Promise<void>;
  /** Tên các FILE (không gồm thư mục con) trong `dir`; [] nếu thư mục chưa có. */
  list(dir: string): Promise<string[]>;
  remove(path: string): Promise<void>;
  move(from: string, to: string): Promise<void>;
}

const parts = (path: string): string[] => path.split("/").filter((p) => p.length > 0 && p !== ".");
const parentOf = (path: string): string => parts(path).slice(0, -1).join("/");

export const textBytes = (s: string): Uint8Array => new TextEncoder().encode(s);
export const bytesText = (b: Uint8Array): string => new TextDecoder().decode(b);

// ------------------------------------------------------------------ memory

export function createMemoryFs(label = "(bộ nhớ)"): WorkspaceFs & { files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  const norm = (p: string) => parts(p).join("/");
  return {
    kind: "memory",
    label,
    files,
    async read(path) {
      const f = files.get(norm(path));
      return f ? new Uint8Array(f) : null;
    },
    async write(path, data) {
      files.set(norm(path), new Uint8Array(data));
    },
    async list(dir) {
      const prefix = norm(dir) ? norm(dir) + "/" : "";
      return [...files.keys()]
        .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
        .map((k) => k.slice(prefix.length))
        .sort();
    },
    async remove(path) {
      files.delete(norm(path));
    },
    async move(from, to) {
      const f = files.get(norm(from));
      if (!f) throw new Error(`Không có file: ${from}`);
      files.set(norm(to), f);
      files.delete(norm(from));
    },
  };
}

// ------------------------------------------------------------------ native

interface NeutralinoFsApi {
  filesystem: {
    readBinaryFile(path: string): Promise<ArrayBuffer>;
    writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
    readDirectory(path: string): Promise<{ entry: string; type: "FILE" | "DIRECTORY" }[]>;
    createDirectory(path: string): Promise<void>;
    getStats(path: string): Promise<{ isFile: boolean; isDirectory: boolean }>;
    move(source: string, destination: string): Promise<void>;
    remove(path: string): Promise<void>;
  };
}

function neutralino(): NeutralinoFsApi | null {
  const n = (globalThis as unknown as { Neutralino?: NeutralinoFsApi }).Neutralino;
  return n && typeof n.filesystem?.readDirectory === "function" ? n : null;
}

const toArrayBuffer = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

/** Bản exe: Workspace ở thư mục `root` (đường dẫn tuyệt đối). */
export function createNativeFs(root: string): WorkspaceFs {
  const n = neutralino();
  if (!n) throw new Error("Không chạy trong bản exe.");
  const fs = n.filesystem;
  const base = root.replace(/[\\/]+$/, "");
  const abs = (p: string) => [base, ...parts(p)].join("/");
  const exists = async (p: string) => {
    try {
      await fs.getStats(p);
      return true;
    } catch {
      return false;
    }
  };
  const ensureDir = async (rel: string) => {
    let cur = base;
    if (!(await exists(cur))) await fs.createDirectory(cur);
    for (const seg of parts(rel)) {
      cur = `${cur}/${seg}`;
      if (!(await exists(cur))) await fs.createDirectory(cur);
    }
  };
  return {
    kind: "native",
    label: root,
    async read(path) {
      if (!(await exists(abs(path)))) return null;
      return new Uint8Array(await fs.readBinaryFile(abs(path)));
    },
    async write(path, data) {
      await ensureDir(parentOf(path));
      const target = abs(path);
      const tmp = `${target}.tmp`;
      await fs.writeBinaryFile(tmp, toArrayBuffer(data));
      try {
        await fs.move(tmp, target);
      } catch {
        // Một số hệ thống không cho đổi tên đè lên file có sẵn: xoá rồi đổi tên.
        if (await exists(target)) await fs.remove(target);
        await fs.move(tmp, target);
      }
    },
    async list(dir) {
      if (!(await exists(abs(dir)))) return [];
      const entries = await fs.readDirectory(abs(dir));
      return entries.filter((e) => e.type === "FILE").map((e) => e.entry).sort();
    },
    async remove(path) {
      if (await exists(abs(path))) await fs.remove(abs(path));
    },
    async move(from, to) {
      await ensureDir(parentOf(to));
      if (await exists(abs(to))) await fs.remove(abs(to));
      await fs.move(abs(from), abs(to));
    },
  };
}

// ----------------------------------------------------------------- browser

/** Phần File System Access API mà ta dùng (chưa có trong lib.dom chuẩn). */
export interface DirHandle {
  readonly kind: "directory";
  readonly name: string;
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<{
    getFile(): Promise<File>;
    createWritable(): Promise<{ write(data: BufferSource | Blob): Promise<void>; close(): Promise<void> }>;
  }>;
  removeEntry(name: string): Promise<void>;
  values(): AsyncIterable<{ kind: "file" | "directory"; name: string }>;
  queryPermission?(opts: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(opts: { mode: "readwrite" }): Promise<PermissionState>;
}

const isNotFound = (e: unknown) => (e as { name?: string })?.name === "NotFoundError" || (e as { name?: string })?.name === "TypeMismatchError";

export function createBrowserFs(root: DirHandle): WorkspaceFs {
  const dirOf = async (rel: string, create: boolean): Promise<DirHandle | null> => {
    let cur = root;
    for (const seg of parts(rel)) {
      try {
        cur = await cur.getDirectoryHandle(seg, { create });
      } catch (e) {
        if (!create && isNotFound(e)) return null;
        throw e;
      }
    }
    return cur;
  };
  const nameOf = (p: string) => parts(p).pop() ?? "";
  const fs: WorkspaceFs = {
    kind: "browser",
    label: root.name,
    async read(path) {
      const dir = await dirOf(parentOf(path), false);
      if (!dir) return null;
      try {
        const fh = await dir.getFileHandle(nameOf(path));
        return new Uint8Array(await (await fh.getFile()).arrayBuffer());
      } catch (e) {
        if (isNotFound(e)) return null;
        throw e;
      }
    },
    async write(path, data) {
      const dir = (await dirOf(parentOf(path), true))!;
      const fh = await dir.getFileHandle(nameOf(path), { create: true });
      const w = await fh.createWritable();
      await w.write(toArrayBuffer(data));
      await w.close();
    },
    async list(dir) {
      const d = await dirOf(dir, false);
      if (!d) return [];
      const out: string[] = [];
      for await (const e of d.values()) if (e.kind === "file") out.push(e.name);
      return out.sort();
    },
    async remove(path) {
      const dir = await dirOf(parentOf(path), false);
      if (!dir) return;
      try {
        await dir.removeEntry(nameOf(path));
      } catch (e) {
        if (!isNotFound(e)) throw e;
      }
    },
    async move(from, to) {
      const data = await fs.read(from);
      if (!data) throw new Error(`Không có file: ${from}`);
      await fs.write(to, data);
      await fs.remove(from);
    },
  };
  return fs;
}

/** Trình duyệt có cho chọn thư mục (Chrome/Edge) hay không. */
export function browserFolderSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === "function";
}

/** Hỏi người dùng chọn thư mục (phải gọi từ một cú bấm). null nếu bấm Huỷ. */
export async function pickBrowserFolder(): Promise<DirHandle | null> {
  const pick = (window as unknown as { showDirectoryPicker?: (o?: unknown) => Promise<DirHandle> }).showDirectoryPicker;
  if (!pick) return null;
  try {
    return await pick({ id: "t17mind-workspace", mode: "readwrite" });
  } catch {
    return null;
  }
}

/** Kiểm tra (và nếu `ask` = true thì xin) quyền đọc/ghi thư mục đã nhớ. */
export async function ensureBrowserPermission(handle: DirHandle, ask: boolean): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if (!handle.queryPermission) return true;
  if ((await handle.queryPermission(opts)) === "granted") return true;
  if (!ask || !handle.requestPermission) return false;
  return (await handle.requestPermission(opts)) === "granted";
}
