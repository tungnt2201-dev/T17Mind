/**
 * io/nativeFs.ts
 * ---------------------------------------------------------------------
 * Bản exe (Neutralino, xem desktop/): hộp thoại Lưu/Mở của Windows và
 * đọc/ghi file thật theo đường dẫn. Trình duyệt thường không có
 * `window.Neutralino` → isDesktopApp() = false, nơi gọi dùng đường khác
 * (File System Access API hoặc tải file kiểu trình duyệt).
 *
 * Quyền tương ứng phải có trong desktop/neutralino.config.json →
 * nativeAllowList (os.showSaveDialog, os.showOpenDialog,
 * filesystem.writeBinaryFile, filesystem.readBinaryFile).
 * ---------------------------------------------------------------------
 */
import { FORMATS, type FileFormat } from "./fileFormats";

interface NeutralinoFilter {
  name: string;
  extensions: string[];
}
interface NeutralinoApi {
  os: {
    showSaveDialog(title?: string, options?: { defaultPath?: string; filters?: NeutralinoFilter[]; forceOverwrite?: boolean }): Promise<string>;
    showOpenDialog(title?: string, options?: { defaultPath?: string; filters?: NeutralinoFilter[]; multiSelections?: boolean }): Promise<string[]>;
  };
  filesystem: {
    writeBinaryFile(path: string, data: ArrayBuffer): Promise<void>;
    readBinaryFile(path: string): Promise<ArrayBuffer>;
  };
}

function api(): NeutralinoApi | null {
  if (typeof window === "undefined") return null;
  const n = (window as unknown as { Neutralino?: NeutralinoApi }).Neutralino;
  return n && typeof n.os?.showSaveDialog === "function" ? n : null;
}

export function isDesktopApp(): boolean {
  return typeof window !== "undefined" && api() !== null;
}

/** Thư mục chứa file exe (Neutralino đặt sẵn NL_PATH); "" nếu không biết. */
export function appDir(): string {
  const p = (window as unknown as { NL_PATH?: string }).NL_PATH;
  return typeof p === "string" ? p : "";
}

const filtersFor = (formats: FileFormat[]): NeutralinoFilter[] =>
  formats.map((f) => ({ name: FORMATS[f].label, extensions: [FORMATS[f].ext] }));

/** Hộp thoại Lưu; trả về đường dẫn đã chọn, hoặc null nếu bấm Huỷ. */
export async function nativeSaveDialog(title: string, defaultPath: string, formats: FileFormat[]): Promise<string | null> {
  const n = api();
  if (!n) return null;
  const path = await n.os.showSaveDialog(title, { defaultPath, filters: filtersFor(formats) });
  return path ? path : null;
}

/** Hộp thoại Mở (một file); null nếu bấm Huỷ. */
export async function nativeOpenDialog(title: string, defaultPath: string, formats: FileFormat[]): Promise<string | null> {
  const n = api();
  if (!n) return null;
  const allExt = formats.map((f) => FORMATS[f].ext);
  const filters = [{ name: "Mọi định dạng mở được", extensions: allExt }, ...filtersFor(formats)];
  const paths = await n.os.showOpenDialog(title, { defaultPath, filters });
  return paths[0] ?? null;
}

/**
 * Lưu một blob/chuỗi ra file qua hộp thoại Lưu của Windows (bản exe), với tên gợi ý `filename`; đuôi file lấy từ tên.
 * Dùng cho các nút "Tải/Xuất" lẻ (SVG, PNG, CSV, Excel, theme…) — trong WebView2, thẻ <a download> không đáng tin.
 * Trả về đường dẫn đã ghi, hoặc null nếu người dùng bấm Huỷ. Ném lỗi nếu không chạy trong bản exe hoặc ghi thất bại.
 */
export async function nativeSaveBlob(blob: Blob | string, filename: string): Promise<string | null> {
  const n = api();
  if (!n) throw new Error("Không chạy trong bản exe.");
  const ext = /\.([A-Za-z0-9]{1,8})$/.exec(filename)?.[1]?.toLowerCase();
  const filters: NeutralinoFilter[] = ext ? [{ name: `Tệp .${ext}`, extensions: [ext] }, { name: "Mọi tệp", extensions: ["*"] }] : [{ name: "Mọi tệp", extensions: ["*"] }];
  const path = await n.os.showSaveDialog("Lưu tệp", { defaultPath: filename, filters });
  if (!path) return null;
  await nativeWriteFile(path, blob);
  return path;
}

export async function nativeWriteFile(path: string, data: Blob | string): Promise<void> {
  const n = api();
  if (!n) throw new Error("Không chạy trong bản exe.");
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(await data.arrayBuffer());
  await n.filesystem.writeBinaryFile(path, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
}

export async function nativeReadFile(path: string): Promise<ArrayBuffer> {
  const n = api();
  if (!n) throw new Error("Không chạy trong bản exe.");
  return n.filesystem.readBinaryFile(path);
}
