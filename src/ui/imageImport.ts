/**
 * ui/imageImport.ts
 * ---------------------------------------------------------------------
 * M3 — biến một File ảnh (chọn file, dán Ctrl+V, kéo-thả) thành
 * ImageAsset sẵn sàng ghi vào map: đọc kích thước gốc, tự thu nhỏ/nén
 * khi ảnh quá lớn (quyết định ở core/image.ts#planImageResize), mã hoá
 * base64. Cần DOM (createImageBitmap, canvas) nên nằm ở ui/.
 * ---------------------------------------------------------------------
 */
import type { ImageAsset } from "../core/types";
import { planImageResize } from "../core/image";
import { readFileAsBase64 } from "./dom";

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/** Lấy các file ảnh từ một DataTransfer (dán hoặc kéo-thả). */
export function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter(isImageFile);
}

async function decode(file: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null; // SVG hoặc định dạng trình duyệt không giải mã được bằng cách này
  }
}

function canvasHasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) if (data[i]! < 255) return true;
  return false;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/** File ảnh → ImageAsset (đã thu nhỏ/nén nếu cần). Ném lỗi nếu không phải ảnh. */
export async function prepareImageFile(file: File): Promise<ImageAsset> {
  if (!isImageFile(file)) throw new Error(`"${file.name}" không phải file ảnh.`);
  const bitmap = await decode(file);
  if (!bitmap) {
    return { mimeType: file.type || "application/octet-stream", dataBase64: await readFileAsBase64(file) };
  }
  const { width, height } = bitmap;
  const plan = planImageResize(width, height, file.size, file.type, false);
  if (plan) {
    const canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, plan.width, plan.height);
      const mayHaveAlpha = file.type === "image/png" || file.type === "image/webp";
      const mime = mayHaveAlpha && canvasHasAlpha(ctx, plan.width, plan.height) ? "image/png" : "image/jpeg";
      const blob = await toBlob(canvas, mime, plan.quality);
      // Không thu nhỏ mà nén lại còn to hơn bản gốc → giữ bản gốc.
      const shrunk = plan.width < width;
      if (blob && (shrunk || blob.size < file.size)) {
        bitmap.close();
        return { mimeType: mime, dataBase64: await readFileAsBase64(blob), width: plan.width, height: plan.height };
      }
    }
  }
  bitmap.close();
  return { mimeType: file.type, dataBase64: await readFileAsBase64(file), width, height };
}
