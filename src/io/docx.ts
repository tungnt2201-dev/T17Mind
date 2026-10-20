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
import { maxOutline, outlineIndentStep, type DocBlock, type DocModel } from "../core/docModel";
import type { TableAlign } from "../core/types";

/** Bề rộng vùng chữ trang A4/Letter lề 1 inch ≈ 6.5 inch = 9360 dxa (1/20 pt). */
const TEXT_WIDTH_DXA = 9360;
const MAX_IMAGE_W_PX = 600;
/** 1 px (96 dpi) = 15 dxa. */
const DXA_PER_PX = 15;
const INDENT_DXA = 360;
/** Khoảng treo của gạch đầu dòng (dấu • nằm ở mép thụt, chữ lùi vào ≈ 0,5 cm). */
const BULLET_HANG_DXA = 283;

/**
 * Lề trái (dxa) của từng khối. Thụt theo tầng (`outline` × bậc tự co theo
 * độ sâu tổng thể); tắt thì giữ cách cũ: chỉ nội dung dưới danh sách thụt.
 */
type IndentOf = (b: Exclude<DocBlock, { kind: "toc" }>) => number;
function indentPlan(doc: DocModel, byLevel: boolean): IndentOf {
  if (!byLevel) return (b) => (b.kind === "paragraph" || b.kind === "image" || b.kind === "table" ? b.indent * INDENT_DXA : 0);
  const step = outlineIndentStep(maxOutline(doc), TEXT_WIDTH_DXA);
  return (b) => b.outline * step;
}

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

function tableFor(b: Extract<DocBlock, { kind: "table" }>, left: number): Table {
  const total = b.colWidths.reduce((a, c) => a + c, 0) || 1;
  const avail = TEXT_WIDTH_DXA - left;
  const widths = b.colWidths.map((w) => Math.max(400, Math.round((w / total) * avail)));
  return new Table({
    indent: left ? { size: left, type: WidthType.DXA } : undefined,
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

function imageFor(b: Extract<DocBlock, { kind: "image" }>, left: number): Paragraph[] {
  const type = IMAGE_TYPE[b.mimeType];
  const indent = left ? { left } : undefined;
  if (!type) return [new Paragraph({ indent, children: [new TextRun({ text: `[Ảnh${b.caption ? `: ${b.caption}` : ""}]`, italics: true })] })];
  const w0 = b.width ?? 400;
  const h0 = b.height ?? 300;
  const maxW = Math.min(MAX_IMAGE_W_PX, Math.floor((TEXT_WIDTH_DXA - left) / DXA_PER_PX));
  const scale = Math.min(1, maxW / w0);
  const out = [
    new Paragraph({
      indent,
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ type, data: b64ToBytes(b.dataBase64), transformation: { width: Math.round(w0 * scale), height: Math.round(h0 * scale) } })],
    }),
  ];
  if (b.caption) out.push(new Paragraph({ indent, alignment: AlignmentType.CENTER, children: [new TextRun({ text: b.caption, italics: true, size: 18 })] }));
  return out;
}

/** Dựng đối tượng Document (tách riêng để test đọc được bằng Packer.toBuffer). */
export function buildDocxDocument(doc: DocModel, indentByLevel = true): Document {
  const children: (Paragraph | Table | TableOfContents)[] = [];
  const leftOf = indentPlan(doc, indentByLevel);
  for (const b of doc.blocks) {
    const left = b.kind === "toc" ? 0 : leftOf(b);
    switch (b.kind) {
      case "toc":
        children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Mục lục")] }));
        children.push(new TableOfContents("Mục lục", { hyperlink: true, headingStyleRange: "1-6" }));
        break;
      case "heading":
        children.push(new Paragraph({ heading: HEADINGS[Math.min(6, b.level) - 1], indent: left ? { left } : undefined, children: runs(b.text) }));
        break;
      case "listItem": {
        const box = b.checked === null ? "" : b.checked ? "☑ " : "☐ ";
        // Thụt theo tầng: lề riêng của đoạn ghi đè lề mặc định của mức danh sách.
        const indent = indentByLevel ? { left: left + BULLET_HANG_DXA, hanging: BULLET_HANG_DXA } : undefined;
        children.push(new Paragraph({ bullet: { level: Math.min(8, b.depth) }, indent, children: runs(box + b.text) }));
        break;
      }
      case "paragraph":
        children.push(new Paragraph({ indent: left ? { left } : undefined, children: runs(b.text) }));
        break;
      case "table":
        if (b.title) children.push(new Paragraph({ indent: left ? { left } : undefined, children: [new TextRun({ text: b.title, bold: true })] }));
        children.push(tableFor(b, left));
        children.push(new Paragraph({ children: [] }));
        break;
      case "image":
        children.push(...imageFor(b, left));
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

export function exportDocx(doc: DocModel, indentByLevel = true): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(doc, indentByLevel));
}
