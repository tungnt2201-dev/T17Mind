/**
 * ui/pdf/pdfController.ts
 * ---------------------------------------------------------------------
 * KW3 — thêm PDF vào map làm nguồn (kiểm tra dung lượng, đọc số trang) và mở trình xem. Dùng chung cho menu Chèn,
 * Ctrl+K và nút trong trình xem.
 * ---------------------------------------------------------------------
 */
import type { Store } from "../../core/store";
import { AddSourceCommand } from "../../core/sourceCommands";
import { PDF_MAX_BYTES, PDF_WARN_BYTES, generateSourceId } from "../../core/sources";
import { generateId } from "../../core/tree";
import { pdfViewerStore, showNotice } from "../uiStores";
import { showAlert, showConfirm } from "../dialog";
import { bytesToBase64, openPdf } from "./pdfEngine";

const mb = (n: number): string => `${(n / 1024 / 1024).toFixed(1)} MB`;

/** Thêm một file PDF làm nguồn của map rồi mở trình xem. Trả id nguồn, hoặc null nếu bị từ chối/huỷ/lỗi. */
export async function addPdfFile(store: Store, file: File): Promise<string | null> {
  if (file.size > PDF_MAX_BYTES) {
    await showAlert(`File "${file.name}" nặng ${mb(file.size)}, vượt giới hạn ${mb(PDF_MAX_BYTES)}. PDF được lưu NGAY TRONG file map nên quá lớn sẽ không lưu nổi — hãy nén/cắt bớt trang rồi thử lại.`);
    return null;
  }
  if (file.size > PDF_WARN_BYTES && !(await showConfirm(`File "${file.name}" nặng ${mb(file.size)}. PDF được nhúng vào file map nên map sẽ nặng tương ứng và lưu/mở chậm hơn. Vẫn thêm?`, "Vẫn thêm"))) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  let pages = 1;
  try {
    const doc = await openPdf(bytes);
    pages = doc.numPages;
    void doc.destroy();
  } catch (err) {
    console.error("Không đọc được PDF:", err);
    await showAlert(`Không đọc được "${file.name}" — file không phải PDF hợp lệ, bị hỏng hoặc đặt mật khẩu.`);
    return null;
  }
  const assetId = generateId("img");
  const source = { id: generateSourceId(), kind: "pdf" as const, name: file.name.replace(/\.pdf$/i, "") || "PDF", assetId, pages, highlights: [] };
  store.dispatch(new AddSourceCommand(source, { mimeType: "application/pdf", dataBase64: bytesToBase64(bytes) }));
  showNotice(`Đã thêm nguồn "${source.name}" (${pages} trang, ${mb(file.size)}).`);
  pdfViewerStore.set({ sourceId: source.id });
  return source.id;
}

/** Mở trình xem PDF: nguồn cho trước, hoặc nguồn mới nhất của map (hoặc màn hình trống mời thêm PDF). */
export function openPdfViewer(store: Store, sourceId?: string | null, page?: number, highlightId?: string): void {
  const sources = Object.keys(store.getMap().sources ?? {});
  pdfViewerStore.set({ sourceId: sourceId ?? sources[sources.length - 1] ?? null, page, highlightId });
}
