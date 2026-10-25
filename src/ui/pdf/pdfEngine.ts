/**
 * ui/pdf/pdfEngine.ts
 * ---------------------------------------------------------------------
 * KW3 — lớp bọc mỏng quanh pdf.js. TẢI LƯỜI: pdf.js (~1,7 MB gồm worker) chỉ được nạp khi người dùng mở một PDF lần đầu,
 * không làm chậm lúc khởi động. Worker được nhúng thẳng vào bản build (`?worker&inline` → blob), nên bản một-file và bản
 * exe vẫn chạy OFFLINE, không cần file phụ hay mạng.
 * Chỉ chạy trong trình duyệt/WebView (cần canvas, Worker, DOM) — logic thuần nằm ở core/sources.ts.
 * ---------------------------------------------------------------------
 */
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

type PdfJs = typeof import("pdfjs-dist");
let lib: Promise<PdfJs> | null = null;
let WorkerCtor: (new () => Worker) | null = null;

export function loadPdfjs(): Promise<PdfJs> {
  lib ??= (async () => {
    const [pdfjs, workerMod] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?worker&inline")]);
    WorkerCtor = (workerMod as unknown as { default: new () => Worker }).default;
    return pdfjs;
  })().catch((e) => {
    lib = null; // cho phép thử lại lần sau
    throw e;
  });
  return lib;
}

export { base64ToBytes, bytesToBase64 } from "../../core/bytes";

/** Mở PDF từ byte (pdf.js sẽ lấy quyền sở hữu mảng → truyền bản sao). */
export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  // Mỗi tài liệu một worker riêng: huỷ tài liệu (doc.destroy) sẽ tắt đúng worker của nó, không làm chết worker dùng chung.
  const worker = new pdfjs.PDFWorker({ port: new WorkerCtor!() as unknown as null });
  return pdfjs.getDocument({ data: bytes.slice(), worker, isEvalSupported: false, useSystemFonts: true }).promise;
}

export interface PageRender {
  /** Kích thước trang theo px CSS ở mức phóng to đã dùng. */
  width: number;
  height: number;
  /** Trang có lớp chữ (có thể chọn chữ) hay là trang ảnh/scan. */
  hasText: boolean;
  /** Xong khi tác vụ vẽ (đã vẽ xong HOẶC đã bị huỷ) — phải chờ trước khi vẽ lại lên cùng canvas. */
  settled: Promise<void>;
  cancel(): void;
}

/**
 * Vẽ một trang lên `canvas` (nét theo devicePixelRatio) và dựng lớp chữ vào `textDiv`. Gọi `cancel()` khi cần vẽ lại sớm
 * (đổi trang/zoom) để khỏi vẽ chồng. Kích thước trả về đã sẵn sàng NGAY (trước khi vẽ xong) để dàn trang.
 */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  canvas: HTMLCanvasElement,
  textDiv: HTMLDivElement,
  onDone?: () => void
): Promise<PageRender> {
  const pdfjs = await loadPdfjs();
  const page: PDFPageProxy = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Không dựng được canvas.");
  const task: RenderTask = page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
  let cancelled = false;
  const result: PageRender = {
    width: viewport.width,
    height: viewport.height,
    hasText: false,
    settled: task.promise.then(
      () => undefined,
      () => undefined
    ),
    cancel: () => {
      cancelled = true;
      task.cancel();
    },
  };
  textDiv.replaceChildren();
  textDiv.style.setProperty("--scale-factor", String(viewport.scale));
  const content = await page.getTextContent();
  result.hasText = content.items.some((it) => "str" in it && it.str.trim() !== "");
  const textLayer = new pdfjs.TextLayer({ textContentSource: content, container: textDiv, viewport });
  void Promise.all([task.promise.catch(() => undefined), textLayer.render().catch(() => undefined)]).then(() => {
    if (!cancelled) onDone?.();
  });
  return result;
}
