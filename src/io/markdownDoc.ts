/**
 * io/markdownDoc.ts
 * ---------------------------------------------------------------------
 * M5 — mô hình tài liệu (core/docModel.ts) → Markdown (GFM): tiêu đề
 * "#", danh sách lồng nhau (checkbox "[ ]"/"[x]"), đoạn văn, bảng GFM
 * (căn lề theo cột), ảnh. Ảnh có 3 cách: "embed" (nhúng base64 ngay
 * trong file .md — một file duy nhất), "files" (tách ra assets/… để đóng
 * zip cùng file .md), "none" (bỏ ảnh). Hàm THUẦN, không cần DOM/zip.
 * ---------------------------------------------------------------------
 */
import { inlineToMarkdown } from "../core/richText";
import { chartDocTable, type DocBlock, type DocModel } from "../core/docModel";

export type MarkdownImageMode = "embed" | "files" | "none";

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};
export const extForImage = (mime: string): string => MIME_EXT[mime] ?? "bin";

/** Neo của tiêu đề kiểu GitHub (giữ chữ có dấu, bỏ dấu câu, khoảng trắng → "-"). */
export function headingSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/** Chữ thường không bị hiểu nhầm thành cú pháp Markdown ở đầu dòng. */
function escapeLineStart(line: string): string {
  return line.replace(/^(\s*)([#>+-]|\d+[.)])(\s)/, "$1\\$2$3");
}
const escapeCell = (v: string): string => v.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");

function tableMarkdown(b: Extract<DocBlock, { kind: "table" }>, pad: string): string {
  const cols = b.align.length;
  const rows = b.cells.map((r) => `${pad}| ${r.map(escapeCell).join(" | ")} |`);
  const sep = `${pad}| ${b.align.map((a) => (a === "center" ? ":---:" : a === "right" ? "---:" : ":---")).join(" | ")} |`;
  const header = b.headerRow ? rows.shift()! : `${pad}| ${Array.from({ length: cols }, () => " ").join(" | ")} |`;
  const lines = [header, sep, ...rows];
  if (b.title) lines.unshift(`${pad}**${b.title}**`, "");
  return lines.join("\n");
}

export interface MarkdownResult {
  markdown: string;
  /** Ảnh cần ghi kèm (chế độ "files"): đường dẫn tương đối + dữ liệu base64. */
  files: { path: string; dataBase64: string }[];
}

export function renderMarkdown(doc: DocModel, imageMode: MarkdownImageMode = "files"): MarkdownResult {
  const files: MarkdownResult["files"] = [];
  const written = new Set<string>();
  const parts: { text: string; tight: boolean }[] = [];
  const slugCount = new Map<string, number>();
  const slugs: string[] = [];
  for (const b of doc.blocks) {
    if (b.kind !== "heading") continue;
    const base = headingSlug(b.text);
    const n = slugCount.get(base) ?? 0;
    slugCount.set(base, n + 1);
    slugs.push(n === 0 ? base : `${base}-${n}`);
  }

  for (const b of doc.blocks) {
    switch (b.kind) {
      case "toc": {
        const items = doc.blocks
          .filter((x): x is Extract<DocBlock, { kind: "heading" }> => x.kind === "heading")
          .map((h, i) => `${"  ".repeat(h.level - 1)}- [${h.text.replace(/[[\]]/g, "")}](#${slugs[i]})`);
        if (items.length) parts.push({ text: `**Mục lục**\n\n${items.join("\n")}`, tight: false });
        break;
      }
      case "heading":
        parts.push({ text: `${"#".repeat(Math.min(6, b.level))} ${b.text.replace(/\n/g, " ")}`, tight: false });
        break;
      case "listItem": {
        const pad = "  ".repeat(b.depth);
        const box = b.checked === null ? "" : b.checked ? "[x] " : "[ ] ";
        const [first, ...rest] = b.text.split("\n");
        const more = rest.map((l) => `\n${pad}  ${l}`).join("");
        parts.push({ text: `${pad}- ${box}${first}${more}`, tight: true });
        break;
      }
      case "paragraph": {
        const pad = "  ".repeat(b.indent);
        // Có đoạn chữ có kiểu (KW6): dựng lại ký hiệu **đậm**/*nghiêng*… thay vì chữ thuần.
        const body = b.runs ? inlineToMarkdown(b.runs) : b.text;
        parts.push({ text: body.split("\n").map((l) => `${pad}${escapeLineStart(l)}`).join("  \n"), tight: false });
        break;
      }
      case "quote": {
        const pad = "  ".repeat(b.indent);
        parts.push({ text: `${pad}> ${(b.runs ? inlineToMarkdown(b.runs) : b.text).replace(/\n/g, `\n${pad}> `)}`, tight: false });
        break;
      }
      case "code": {
        const pad = "  ".repeat(b.indent);
        const fence = b.lines.some((l) => l.includes("```")) ? "````" : "```";
        parts.push({ text: [`${pad}${fence}`, ...b.lines.map((l) => `${pad}${l}`), `${pad}${fence}`].join("\n"), tight: false });
        break;
      }
      case "cardItem": {
        const pad = "  ".repeat(b.indent + b.depth);
        const lead = b.marker === "number" ? `${b.n}. ` : b.marker === "check" ? `- [${b.checked ? "x" : " "}] ` : "- ";
        parts.push({ text: `${pad}${lead}${b.runs ? inlineToMarkdown(b.runs) : b.text}`, tight: true });
        break;
      }
      case "table":
        parts.push({ text: tableMarkdown(b, "  ".repeat(b.indent)), tight: false });
        break;
      case "chart":
        parts.push({ text: tableMarkdown(chartDocTable(b), "  ".repeat(b.indent)), tight: false });
        break;
      case "image": {
        if (imageMode === "none") break;
        const pad = "  ".repeat(b.indent);
        const alt = (b.caption || "ảnh").replace(/[[\]]/g, "");
        let src: string;
        if (imageMode === "embed") src = `data:${b.mimeType};base64,${b.dataBase64}`;
        else {
          src = `assets/${b.assetId}.${extForImage(b.mimeType)}`;
          if (!written.has(src)) {
            written.add(src);
            files.push({ path: src, dataBase64: b.dataBase64 });
          }
        }
        parts.push({ text: `${pad}![${alt}](${src})${b.caption ? `\n${pad}*${b.caption}*` : ""}`, tight: false });
        break;
      }
    }
  }
  // Mục danh sách liền nhau chỉ cách một dòng (danh sách "chặt"); còn lại cách một dòng trống.
  let md = "";
  parts.forEach((p, i) => {
    if (i > 0) md += p.tight && parts[i - 1]!.tight ? "\n" : "\n\n";
    md += p.text;
  });
  return { markdown: `${md}\n`, files };
}
