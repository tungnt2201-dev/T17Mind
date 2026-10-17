/**
 * io/fileSystemAccess.ts
 * ---------------------------------------------------------------------
 * P1.12 — File System Access API: cho phép "Lưu"/"Mở" trực tiếp một
 * file JSON THẬT trên đĩa (giống Word/Excel), khác hẳn IndexedDB
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
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { exportFlatJson, parseJsonFile } from "./json";

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
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }
  interface Window {
    showSaveFilePicker(options?: {
      suggestedName?: string;
      types?: { description: string; accept: Record<string, string[]> }[];
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

/** Mở hộp thoại "Lưu file" (như Save As), ghi map hiện tại vào đó,
 *  trả về handle để các lần "Lưu" sau ghi thẳng không cần hỏi lại vị
 *  trí. Trả về `null` nếu người dùng bấm Huỷ (không phải lỗi thật —
 *  nơi gọi không nên báo lỗi cho trường hợp này). */
export async function pickAndSaveNewFile(map: MindMap): Promise<FileSystemFileHandle | null> {
  let handle: FileSystemFileHandle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: "t17mind-export.json",
      types: [{ description: "T17Mind JSON", accept: { "application/json": [".json"] } }],
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null; // người dùng bấm Huỷ
    throw err;
  }
  await writeToHandle(handle, map);
  return handle;
}

/** Ghi map hiện tại vào ĐÚNG handle đã có sẵn (không hỏi lại vị trí) —
 *  dùng cho "Lưu" (Ctrl+S) sau khi đã "Lưu file..." hoặc "Mở file..."
 *  ít nhất một lần trong phiên này. */
export async function writeToHandle(handle: FileSystemFileHandle, map: MindMap): Promise<void> {
  const writable = await handle.createWritable();
  try {
    await writable.write(exportFlatJson(map));
  } finally {
    await writable.close();
  }
}

export interface OpenFileResult {
  handle: FileSystemFileHandle;
  map: MindMap;
}

/** Mở hộp thoại "Mở file", đọc + di trú + xác thực nội dung JSON —
 *  TÁI DÙNG đúng `parseJsonFile` như "Nhập JSON" thường (không bỏ qua
 *  bước kiểm tra nào chỉ vì đây là luồng khác). Trả về `null` nếu
 *  người dùng bấm Huỷ; ném lỗi kèm danh sách nếu file không hợp lệ (để
 *  nơi gọi tự quyết định cách hiển thị, giống các luồng nhập khác). */
export async function pickAndOpenFile(): Promise<OpenFileResult | null> {
  let handles: FileSystemFileHandle[];
  try {
    handles = await window.showOpenFilePicker({
      types: [{ description: "T17Mind JSON", accept: { "application/json": [".json"] } }],
      multiple: false,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return null;
    throw err;
  }
  const handle = handles[0];
  if (!handle) return null;
  const file = await handle.getFile();
  const text = await file.text();
  const result = parseJsonFile(text);
  if (!result.ok) {
    throw new Error(result.errors.join("\n"));
  }
  return { handle, map: result.map };
}
