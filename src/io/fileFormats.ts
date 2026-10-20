/**
 * io/fileFormats.ts
 * ---------------------------------------------------------------------
 * Các định dạng lưu/xuất/mở file và vài hàm THUẦN xử lý đường dẫn (cả
 * kiểu Windows "C:\a\b.json" lẫn "/a/b.json") — dùng cho hộp thoại lưu
 * file của bản exe (Neutralino) và File System Access API của trình
 * duyệt. Không đụng DOM nên test được.
 * ---------------------------------------------------------------------
 */

export type FileFormat = "t17m" | "json" | "xlsx" | "xmind" | "opml" | "docx" | "md" | "zip" | "svg" | "png";

export interface FormatInfo {
  format: FileFormat;
  /** Tên hiện trong ô "Save as type" của hộp thoại. */
  label: string;
  ext: string;
  mime: string;
  /** Mở lại được trong T17Mind (đọc vào thành map). */
  openable: boolean;
}

export const FORMATS: Record<FileFormat, FormatInfo> = {
  t17m: { format: "t17m", label: "T17Mind (.t17m — kèm ảnh)", ext: "t17m", mime: "application/zip", openable: true },
  json: { format: "json", label: "T17Mind JSON (.json)", ext: "json", mime: "application/json", openable: true },
  xlsx: {
    format: "xlsx",
    label: "Excel (.xlsx)",
    ext: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    openable: true,
  },
  xmind: { format: "xmind", label: "XMind (.xmind)", ext: "xmind", mime: "application/zip", openable: true },
  opml: { format: "opml", label: "OPML (.opml)", ext: "opml", mime: "text/x-opml", openable: true },
  docx: {
    format: "docx",
    label: "Word (.docx)",
    ext: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    openable: false,
  },
  md: { format: "md", label: "Markdown (.md)", ext: "md", mime: "text/markdown", openable: true },
  zip: { format: "zip", label: "Markdown + thư mục ảnh (.zip)", ext: "zip", mime: "application/zip", openable: false },
  svg: { format: "svg", label: "Ảnh vector SVG (.svg)", ext: "svg", mime: "image/svg+xml", openable: false },
  png: { format: "png", label: "Ảnh PNG (.png)", ext: "png", mime: "image/png", openable: false },
};

/** Thứ tự định dạng trong hộp thoại, `first` lên đầu (được chọn sẵn). */
export function formatOrder(first: FileFormat, onlyOpenable = false): FileFormat[] {
  const all = (Object.keys(FORMATS) as FileFormat[]).filter((f) => !onlyOpenable || FORMATS[f].openable);
  return [first, ...all.filter((f) => f !== first)].filter((f) => all.includes(f));
}

/** Định dạng theo đuôi file (không phân biệt hoa thường); null nếu không biết. */
export function formatFromPath(path: string): FileFormat | null {
  const m = /\.([a-z0-9]+)$/i.exec(baseName(path));
  if (!m) return null;
  const ext = m[1]!.toLowerCase();
  if (ext === "markdown") return "md";
  if (ext === "xml") return "opml";
  return (Object.keys(FORMATS) as FileFormat[]).find((f) => FORMATS[f].ext === ext) ?? null;
}

/** Thêm đuôi của `format` nếu tên file chưa có đuôi định dạng nào đã biết. */
export function ensureExtension(path: string, format: FileFormat): string {
  return formatFromPath(path) ? path : `${path}.${FORMATS[format].ext}`;
}

/** Thư mục chứa file ("" nếu chỉ là tên file). Giữ nguyên kiểu dấu gạch. */
export function dirOf(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (i < 0) return "";
  if (i === 0) return path[0]!; // "/file" → "/"
  if (/^[a-z]:$/i.test(path.slice(0, i))) return path.slice(0, i + 1); // "C:\file" → "C:\"
  return path.slice(0, i);
}

export function baseName(path: string): string {
  const i = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return i < 0 ? path : path.slice(i + 1);
}

/** Ghép thư mục + tên file, dùng đúng kiểu dấu gạch của thư mục. */
export function joinPath(dir: string, name: string): string {
  if (!dir) return name;
  const sep = dir.includes("\\") || /^[a-z]:/i.test(dir) ? "\\" : "/";
  return dir.endsWith("/") || dir.endsWith("\\") ? dir + name : dir + sep + name;
}

/** Tên file gợi ý từ chữ của node gốc: bỏ ký tự Windows cấm, gọn khoảng trắng,
 *  tối đa 80 ký tự; rỗng thì "T17Mind". */
export function suggestBaseName(rootText: string): string {
  const clean = rootText
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "")
    .slice(0, 80)
    .trim();
  return clean || "T17Mind";
}
