/**
 * ui/pdf/pdfController.ts
 * ---------------------------------------------------------------------
 * KW3 — thêm PDF vào map làm nguồn và quản lý cách lưu của nguồn:
 *  - NHÚNG: chép nội dung vào map (đi theo file map). Có kiểm tra dung lượng và NHẬN PDF TRÙNG (cùng mã băm) trong map.
 *  - LIÊN KẾT (chỉ bản exe): chỉ nhớ đường dẫn, map nhẹ; trình xem báo ok / đã đổi / mất file và cho chọn lại.
 * Dùng chung cho menu Chèn, Ctrl+K và nút trong trình xem.
 * ---------------------------------------------------------------------
 */
import type { Store } from "../../core/store";
import { AddSourceCommand, ChangeSourceStorageCommand } from "../../core/sourceCommands";
import { PDF_MAX_BYTES, PDF_WARN_BYTES, generateSourceId } from "../../core/sources";
import { sha256Hex, sameHash } from "../../core/hash";
import { bytesToBase64 } from "../../core/bytes";
import { generateId } from "../../core/tree";
import type { Source } from "../../core/types";
import { isDesktopApp, nativeOpenAny, nativeReadFile, nativeSaveBlob } from "../../io/nativeFs";
import { pdfViewerStore, showNotice } from "../uiStores";
import { showAlert, showChoice, showConfirm } from "../dialog";
import { openPdf } from "./pdfEngine";
import { findDuplicateSource, type SourceIo } from "./sourceFiles";

const mb = (n: number): string => `${(n / 1024 / 1024).toFixed(1)} MB`;
/** Giới hạn đọc vào bộ nhớ cho file liên kết (không nhúng nên không lo phình map, nhưng pdf.js vẫn cần nạp cả file). */
const LINKED_MAX_BYTES = 500 * 1024 * 1024;

export const pdfIo: SourceIo = { readFile: (p) => nativeReadFile(p), hash: sha256Hex };

const baseName = (path: string): string => path.split(/[\\/]/).pop() ?? path;
const stripPdf = (name: string): string => name.replace(/\.pdf$/i, "") || "PDF";

/** Đọc số trang; ném lỗi (đã báo người dùng) nếu không phải PDF hợp lệ. */
async function pageCountOf(bytes: Uint8Array, name: string): Promise<number | null> {
  try {
    const doc = await openPdf(bytes);
    const n = doc.numPages;
    void doc.destroy();
    return n;
  } catch (err) {
    console.error("Không đọc được PDF:", err);
    await showAlert(`Không đọc được "${name}" — file không phải PDF hợp lệ, bị hỏng hoặc đặt mật khẩu.`);
    return null;
  }
}

/** Nếu map đã có PDF cùng nội dung: hỏi dùng lại hay vẫn thêm. Trả "reuse" (đã mở nguồn cũ), "add" (vẫn thêm), hoặc "cancel". */
async function resolveDuplicate(store: Store, sha256: string, size: number, name: string): Promise<"reuse" | "add" | "cancel"> {
  const dup = await findDuplicateSource(store.getMap(), { sha256, size }, sha256Hex);
  if (!dup) return "add";
  const where = dup.assetId === null ? "(liên kết tới file trên đĩa)" : "(đã nhúng trong map)";
  const pick = await showChoice(`"${name}" có cùng nội dung với nguồn "${dup.name}" ${where} đã có trong map này. Dùng lại nguồn đó để khỏi chép trùng và giữ chung các vùng tô sáng?`, [
    { label: "Dùng lại nguồn đã có", primary: true },
    { label: "Vẫn thêm bản mới" },
  ]);
  if (pick === null) return "cancel";
  if (pick === 0) {
    pdfViewerStore.set({ sourceId: dup.id });
    showNotice(`Đã mở nguồn "${dup.name}" (không thêm bản trùng).`);
    return "reuse";
  }
  return "add";
}

/** Thêm một file PDF làm nguồn NHÚNG rồi mở trình xem. Trả id nguồn (kể cả khi dùng lại nguồn trùng), hoặc null nếu bị từ chối/huỷ/lỗi. */
export async function addPdfFile(store: Store, file: File): Promise<string | null> {
  if (file.size > PDF_MAX_BYTES) {
    await showAlert(`File "${file.name}" nặng ${mb(file.size)}, vượt giới hạn ${mb(PDF_MAX_BYTES)}. PDF được lưu NGAY TRONG file map nên quá lớn sẽ không lưu nổi — hãy nén/cắt bớt trang, hoặc (bản exe) dùng "Liên kết PDF" để chỉ giữ đường dẫn.`);
    return null;
  }
  if (file.size > PDF_WARN_BYTES && !(await showConfirm(`File "${file.name}" nặng ${mb(file.size)}. PDF được nhúng vào file map nên map sẽ nặng tương ứng và lưu/mở chậm hơn${isDesktopApp() ? " (bản exe có thể dùng \"Liên kết PDF\" để chỉ giữ đường dẫn)" : ""}. Vẫn thêm?`, "Vẫn thêm"))) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pages = await pageCountOf(bytes, file.name);
  if (pages === null) return null;
  const sha256 = await sha256Hex(bytes);
  const dup = await resolveDuplicate(store, sha256, bytes.length, file.name);
  if (dup === "cancel") return null;
  if (dup === "reuse") return findDuplicateSource(store.getMap(), { sha256, size: bytes.length }, sha256Hex).then((s) => s?.id ?? null);
  const source: Source = { id: generateSourceId(), kind: "pdf", name: stripPdf(file.name), assetId: generateId("img"), sha256, size: bytes.length, pages, highlights: [] };
  store.dispatch(new AddSourceCommand(source, { mimeType: "application/pdf", dataBase64: bytesToBase64(bytes) }));
  showNotice(`Đã thêm nguồn "${source.name}" (${pages} trang, ${mb(bytes.length)}), nhúng trong map.`);
  pdfViewerStore.set({ sourceId: source.id });
  return source.id;
}

/** (Chỉ bản exe) chọn một file PDF bằng hộp thoại Windows và thêm làm nguồn LIÊN KẾT: chỉ nhớ đường dẫn, không chép nội dung vào map. */
export async function addPdfLinked(store: Store): Promise<string | null> {
  if (!isDesktopApp()) {
    await showAlert("Liên kết PDF theo đường dẫn chỉ dùng được ở bản exe (trình duyệt không cho biết đường dẫn file). Hãy dùng \"Thêm PDF\" để nhúng vào map.");
    return null;
  }
  const path = await nativeOpenAny("Chọn file PDF để liên kết", ["pdf"]);
  if (!path) return null;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await nativeReadFile(path));
  } catch (e) {
    await showAlert(`Không đọc được file "${path}": ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
  if (bytes.length > LINKED_MAX_BYTES) {
    await showAlert(`File nặng ${mb(bytes.length)}, vượt giới hạn ${mb(LINKED_MAX_BYTES)} của trình xem.`);
    return null;
  }
  const name = baseName(path);
  const pages = await pageCountOf(bytes, name);
  if (pages === null) return null;
  const sha256 = await sha256Hex(bytes);
  const dup = await resolveDuplicate(store, sha256, bytes.length, name);
  if (dup === "cancel") return null;
  if (dup === "reuse") return findDuplicateSource(store.getMap(), { sha256, size: bytes.length }, sha256Hex).then((s) => s?.id ?? null);
  const source: Source = { id: generateSourceId(), kind: "pdf", name: stripPdf(name), assetId: null, path, sha256, size: bytes.length, pages, highlights: [] };
  store.dispatch(new AddSourceCommand(source, null));
  showNotice(`Đã liên kết nguồn "${source.name}" (${pages} trang). Map chỉ nhớ đường dẫn: đừng đổi tên/di chuyển file.`);
  pdfViewerStore.set({ sourceId: source.id });
  return source.id;
}

/** Nguồn liên kết bị mất file: chọn lại file (hộp thoại Windows). Nếu nội dung khác bản đã thêm thì hỏi xác nhận vì vùng tô sáng có thể lệch. */
export async function relinkSource(store: Store, source: Source): Promise<boolean> {
  const path = await nativeOpenAny(`Chọn lại file cho nguồn "${source.name}"`, ["pdf"]);
  if (!path) return false;
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await nativeReadFile(path));
  } catch (e) {
    await showAlert(`Không đọc được file "${path}": ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
  const pages = await pageCountOf(bytes, baseName(path));
  if (pages === null) return false;
  const sha256 = await sha256Hex(bytes);
  if (source.sha256 && !sameHash(source.sha256, sha256)) {
    const ok = await showConfirm(`File này KHÁC bản đã thêm vào nguồn "${source.name}" (nội dung${pages !== source.pages ? ` và số trang: ${source.pages} → ${pages}` : ""} không giống). Các vùng tô sáng có thể lệch khỏi chữ. Vẫn dùng file này?`, "Vẫn dùng");
    if (!ok) return false;
  }
  store.dispatch(new ChangeSourceStorageCommand(source.id, { assetId: null, path, sha256, size: bytes.length, pages }));
  showNotice(`Đã trỏ lại nguồn "${source.name}" tới ${path}.`);
  return true;
}

/** Nguồn liên kết có file đã bị sửa: chấp nhận bản hiện tại (cập nhật mã băm, dung lượng, số trang; giữ vùng tô sáng). */
export function acceptChangedFile(store: Store, source: Source, bytes: Uint8Array, sha256: string, pages: number): void {
  store.dispatch(new ChangeSourceStorageCommand(source.id, { assetId: null, path: source.path ?? null, sha256, size: bytes.length, pages }));
  showNotice(`Đã chấp nhận bản hiện tại của "${source.name}". Kiểm tra lại các vùng tô sáng nếu nội dung có đổi.`);
}

/** Chuyển nguồn (liên kết) sang NHÚNG bằng chính byte đang đọc được: map tự chứa, không còn phụ thuộc file ngoài. */
export async function embedSource(store: Store, source: Source, bytes: Uint8Array, sha256: string, pages: number): Promise<boolean> {
  if (bytes.length > PDF_MAX_BYTES) {
    await showAlert(`File nặng ${mb(bytes.length)}, vượt giới hạn nhúng ${mb(PDF_MAX_BYTES)}.`);
    return false;
  }
  if (bytes.length > PDF_WARN_BYTES && !(await showConfirm(`File nặng ${mb(bytes.length)}; nhúng vào map sẽ làm map nặng tương ứng. Vẫn nhúng?`, "Vẫn nhúng"))) return false;
  store.dispatch(new ChangeSourceStorageCommand(source.id, { assetId: generateId("img"), path: null, sha256, size: bytes.length, pages }, { mimeType: "application/pdf", dataBase64: bytesToBase64(bytes) }));
  showNotice(`Đã nhúng "${source.name}" vào map.`);
  return true;
}

/** (Chỉ bản exe) Chuyển nguồn NHÚNG sang LIÊN KẾT: ghi PDF ra một file (hộp thoại Lưu) rồi gỡ bản nhúng khỏi map — map nhẹ đi. */
export async function linkSourceToFile(store: Store, source: Source, bytes: Uint8Array): Promise<boolean> {
  const sha256 = await sha256Hex(bytes);
  let path: string | null;
  try {
    path = await nativeSaveBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${source.name}.pdf`);
  } catch (e) {
    await showAlert(`Không ghi được file: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
  if (!path) return false;
  store.dispatch(new ChangeSourceStorageCommand(source.id, { assetId: null, path, sha256, size: bytes.length, pages: source.pages }));
  showNotice(`"${source.name}" nay chỉ liên kết tới ${path} (đã gỡ bản nhúng khỏi map). Đừng đổi tên/di chuyển file.`);
  return true;
}

/** Mở trình xem PDF: nguồn cho trước, hoặc nguồn mới nhất của map (hoặc màn hình trống mời thêm PDF). */
export function openPdfViewer(store: Store, sourceId?: string | null, page?: number, highlightId?: string): void {
  const sources = Object.keys(store.getMap().sources ?? {});
  pdfViewerStore.set({ sourceId: sourceId ?? sources[sources.length - 1] ?? null, page, highlightId });
}
