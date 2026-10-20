/**
 * io/fileSystemAccess.ts
 * ---------------------------------------------------------------------
 * P1.12 — File System Access API: cho phép "Lưu"/"Mở" trực tiếp một
 * file THẬT trên đĩa (mọi định dạng trong io/fileFormats.ts) (giống Word/Excel), khác hẳn IndexedDB
 * (P1.11 — tự động lưu NGẦM trong trình duyệt, người dùng không thấy
 * file nào) và khác "Xuất JSON" (luôn tải xuống một file MỚI, không
 * "nhớ" để ghi đè lại đúng file cũ).
 *
 * CHỈ Chrome/Edge (Chromium) hỗ trợ API này — Firefox/Safari KHÔNG hề
 * có `window.showSaveFilePicker`. Mọi nơi gọi PHẢI kiểm tra
 * `isFileSystemAccessSupported()` trước, ẩn hẳn UI liên quan nếu
 * không hỗ trợ thay vì hiện nút rồi báo lỗi khi bấm.
 *
 * Handle (FileSystemFileHandle) CHỈ tồn tại trong PHIÊN LÀM VIỆC HIỆN
 * TẠI (biến JS thường trong appController, không lưu vào IndexedDB) —
 * cố tình đơn giản hoá, không cố "nhớ" file đã liên kết qua các lần
 * tải lại trang (việc đó cần xin lại quyền truy cập mỗi lần, xử lý
 * handle không còn hợp lệ nếu file đã bị xoá/di chuyển — độ phức tạp
 * không tương xứng lợi ích cho một tính năng P1 chèn thêm). Mở lại
 * trang thì "Lưu" sẽ hỏi lại vị trí như lần đầu — người dùng vẫn luôn
 * có IndexedDB tự động lưu ngầm làm lưới an toàn phía sau.
 *
 * Bản exe dùng hộp thoại của Windows qua io/nativeFs.ts thay cho file
 * này (đặt được thư mục mặc định theo đường dẫn).
 * ---------------------------------------------------------------------
 */
import { FORMATS, type FileFormat } from "./fileFormats";

/**
 * Khai báo type TỐI THIỂU cho File System Access API — TypeScript's
 * `lib.dom.d.ts` (theo phiên bản đang dùng trong dự án) CHƯA có sẵn
 * các type này (API còn khá mới, chỉ Chromium hỗ trợ). Chỉ khai báo
 * ĐÚNG những gì file này thực sự dùng tới, không cố khai báo đầy đủ
 * toàn bộ API bề mặt.
 */
declare global {
  interface FileSystemFileHandle {
    createWritable(): Promise<FileSystemWritableFileStream>;
    getFile(): Promise<File>;
  }
  interface FileSystemWritableFileStream {
    write(data: string | Blob): Promise<void>;
    close(): Promise<void>;
  }
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
      excludeAcceptAllOption?: boolean;
    }): Promise<FileSystemFileHandle>;
    showOpenFilePicker(options?: {
      types?: { description: string; accept: Record<string, string[]> }[];
      multiple?: boolean;
    }): Promise<FileSystemFileHandle[]>;
  }
}

/** Kiểm tra trình duyệt có hỗ trợ File System Access API hay không —
 *  gọi hàm này TRƯỚC khi hiện bất kỳ nút/menu liên quan. */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

const typesFor = (formats: FileFormat[]) =>
  formats.map((f) => ({ description: FORMATS[f].label, accept: { [FORMATS[f].mime]: [`.${FORMATS[f].ext}`] } }));

const isAbort = (err: unknown): boolean => err instanceof DOMException && err.name === "AbortError";

/** Hộp thoại "Lưu" của trình duyệt (Chrome/Edge). Trả về handle, hoặc
 *  null nếu người dùng bấm Huỷ. Định dạng thật do nơi gọi suy ra từ tên
 *  file đã chọn (handle.name). Trình duyệt không cho đặt thư mục mặc
 *  định theo đường dẫn — nó tự nhớ thư mục lần trước. */
export async function pickSaveHandle(suggestedName: string, formats: FileFormat[]): Promise<FileSystemFileHandle | null> {
  try {
    return await window.showSaveFilePicker({ suggestedName, types: typesFor(formats) });
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
}

/** Ghi dữ liệu vào handle đã có (không hỏi lại vị trí). */
export async function writeToHandle(handle: FileSystemFileHandle, data: Blob | string): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
}

/** Hộp thoại "Mở" của trình duyệt; null nếu bấm Huỷ. */
export async function pickOpenHandle(formats: FileFormat[]): Promise<{ handle: FileSystemFileHandle; file: File } | null> {
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({ types: typesFor(formats), multiple: false });
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
  const handle = handles[0];
  return handle ? { handle, file: await handle.getFile() } : null;
}
