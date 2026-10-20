/**
 * io/docx.ts
 * ---------------------------------------------------------------------
 * M5 — mô hình tài liệu (core/docModel.ts) → file Word (.docx) bằng thư
 * viện `docx`: kiểu tiêu đề chuẩn của Word (Heading 1…6 — dùng được
 * Navigation Pane / mục lục), danh sách gạch đầu dòng lồng nhau, đoạn
 * văn, BẢNG WORD THẬT (độ rộng cột theo tỉ lệ đã chỉnh, căn lề, hàng tiêu
 * đề tô nền), ảnh thật, mục lục (trường TOC — Word hỏi cập nhật khi mở).
 * Module này kéo theo thư viện `docx` nên chỉ được nạp lười (import động
 * từ AppController), giống io/xlsx.ts.
 * ---------------------------------------------------------------------
 */
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DocBlock, DocModel } from "../core/docModel";
import type { TableAlign } from "../core/types";

/** Bề rộng vùng chữ trang A4/Letter lề 1 inch ≈ 6.5 inch = 9360 dxa (1/20 pt). */
const TEXT_WIDTH_DXA = 9360;
const MAX_IMAGE_W_PX = 600;
const INDENT_DXA = 360;

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
] as const;

const ALIGN: Record<TableAlign, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Các dòng của một đoạn → TextRun, xuống dòng mềm giữa các dòng. */
// `bold` chỉ đặt khi true — đặt false sẽ ghi đè in đậm sẵn có của kiểu Heading.
const runs = (text: string, bold = false): TextRun[] =>
  text.split("\n").map((line, i) => new TextRun({ text: line, ...(bold ? { bold: true } : {}), ...(i > 0 ? { break: 1 } : {}) }));

const IMAGE_TYPE: Record<string, "png" | "jpg" | "gif" | "bmp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
};

function tableFor(b: Extract<DocBlock, { kind: "table" }>): Table {
  const total = b.colWidths.reduce((a, c) => a + c, 0) || 1;
  const widths = b.colWidths.map((w) => Math.max(400, Math.round((w / total) * TEXT_WIDTH_DXA)));
  return new Table({
    width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: b.cells.map(
      (row, r) =>
        new TableRow({
          tableHeader: r === 0 && b.headerRow,
          children: row.map((cell, c) => {
            const header = r === 0 && b.headerRow;
            return new TableCell({
              width: { size: widths[c] ?? 1000, type: WidthType.DXA },
              shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "E8EEF9" } : undefined,
              children: [new Paragraph({ alignment: ALIGN[b.align[c] ?? "left"], children: runs(cell, header) })],
            });
          }),
        })
    ),
  });
}

function imageFor(b: Extract<DocBlock, { kind: "image" }>): Paragraph[] {
  const type = IMAGE_TYPE[b.mimeType];
  const indent = b.indent ? { left: b.indent * INDENT_DXA } : undefined;
  if (!type) return [new Paragraph({ indent, children: [new TextRun({ text: `[Ảnh${b.caption ? `: ${b.caption}` : ""}]`, italics: true })] })];
  const w0 = b.width ?? 400;
  const h0 = b.height ?? 300;
  const scale = Math.min(1, MAX_IMAGE_W_PX / w0);
  const out = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type, data: b64ToBytes(b.dataBase64), transformation: { width: Math.round(w0 * scale), height: Math.round(h0 * scale) } })],
    }),
  ];
  if (b.caption) out.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: b.caption, italics: true, size: 18 })] }));
  return out;
}

/** Dựng đối tượng Document (tách riêng để test đọc được bằng Packer.toBuffer). */
export function buildDocxDocument(doc: DocModel): Document {
  const children: (Paragraph | Table | TableOfContents)[] = [];
  for (const b of doc.blocks) {
    switch (b.kind) {
      case "toc":
        children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Mục lục")] }));
        children.push(new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-6" }));
        break;
      case "heading":
        children.push(new Paragraph({ heading: HEADINGS[Math.min(6, b.level) - 1], children: runs(b.text) }));
        break;
      case "listItem": {
        const box = b.checked === null ? "" : b.checked ? "☑ " : "☐ ";
        children.push(new Paragraph({ bullet: { level: Math.min(8, b.depth) }, children: runs(box + b.text) }));
        break;
      }
      case "paragraph":
        children.push(new Paragraph({ indent: b.indent ? { left: b.indent * INDENT_DXA } : undefined, children: runs(b.text) }));
        break;
      case "table":
        if (b.title) children.push(new Paragraph({ children: [new TextRun({ text: b.title, bold: true })] }));
        children.push(tableFor(b));
        children.push(new Paragraph({ children: [] }));
        break;
      case "image":
        children.push(...imageFor(b));
        break;
    }
  }
  return new Document({
    creator: "T17Mind",
    title: doc.title,
    features: { updateFields: doc.blocks.some((b) => b.kind === "toc") },
    sections: [{ children }],
  });
}

export function exportDocx(doc: DocModel): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(doc));
}
