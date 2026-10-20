/** ui/dom.ts — vài hàm tiện ích DOM nhỏ, dùng lặp lại nhiều nơi trong ui/. */

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Không tìm thấy phần tử #${id} trong DOM.`);
  return el as T;
}

export function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string, mime: string): void {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/** P2.10 — đọc một File (ví dụ ảnh người dùng chọn) thành chuỗi base64
 *  THUẦN (không kèm tiền tố "data:...;base64,") — dùng để lưu vào
 *  MindMap.assets, xem core/types.ts#ImageAsset. */
export function readFileAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // luôn là "data:<mime>;base64,<data>" vì đọc bằng readAsDataURL
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được file."));
    reader.readAsDataURL(file);
  });
}
