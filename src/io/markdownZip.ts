/**
 * io/markdownZip.ts
 * ---------------------------------------------------------------------
 * M5 — Markdown kèm ảnh: một file .zip gồm "<tên>.md" và thư mục
 * assets/ chứa ảnh (io/markdownDoc.ts chế độ "files"). Dùng jszip nên
 * nạp lười như io/t17m.ts.
 * ---------------------------------------------------------------------
 */
import JSZip from "jszip";
import type { DocModel } from "../core/docModel";
import { renderMarkdown } from "./markdownDoc";

/** Dựng zip (tách riêng để test đọc lại được trong Node). */
export function buildMarkdownZip(doc: DocModel, mdName = "tai-lieu.md"): JSZip {
  const { markdown, files } = renderMarkdown(doc, "files");
  const zip = new JSZip();
  zip.file(mdName, markdown);
  for (const f of files) zip.file(f.path, f.dataBase64, { base64: true });
  return zip;
}

export function exportMarkdownZip(doc: DocModel, mdName = "tai-lieu.md"): Promise<Blob> {
  return buildMarkdownZip(doc, mdName).generateAsync({ type: "blob", compression: "DEFLATE" });
}
