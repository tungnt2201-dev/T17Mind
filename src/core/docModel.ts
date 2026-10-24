/**
 * core/docModel.ts
 * ---------------------------------------------------------------------
 * M5 — mô hình "tài liệu" dùng chung cho xuất Markdown và Word: đi theo
 * cây map (cả map hoặc một nhánh), node ở các cấp đầu thành TIÊU ĐỀ
 * (H1…H6), sâu hơn thành DANH SÁCH; dưới mỗi node là ghi chú và nội dung
 * card (đoạn văn, bảng, ảnh, biểu đồ) nếu được chọn. Hàm THUẦN, chỉ phụ
 * thuộc core — io/markdownDoc.ts và io/docx.ts chuyển mô hình này thành
 * file.
 * ---------------------------------------------------------------------
 */
import type { Block, Card, ChartKind, MindMap, MindNode, TableAlign, TableBlock } from "./types";
import { chartDataOf } from "./chartData";
import { displayCells } from "./formula";
import { formatNumber } from "./numberParse";
import { getRootIds } from "./tree";
import { displayText, hasRichSyntax, inlineText, parseRich, type Inline } from "./richText";
import { resolveLinkLabel } from "./links";

export interface DocOptions {
  /** "map" = cả map (kể cả nhánh trôi); "branch" = chỉ nhánh `branchRootId`. */
  scope: "map" | "branch";
  branchRootId?: string | null;
  /** Số cấp đầu thành tiêu đề (0–6); 0 = mọi node là danh sách. */
  headingDepth: number;
  includeNotes: boolean;
  includeCards: boolean;
  includeImages: boolean;
  toc: boolean;
  /** Word: thụt lề mỗi tầng một bậc, bậc tự co theo độ sâu tổng thể (xem outlineIndentStep). */
  indentByLevel: boolean;
}

export const DEFAULT_DOC_OPTIONS: DocOptions = {
  scope: "map",
  branchRootId: null,
  headingDepth: 3,
  includeNotes: true,
  includeCards: true,
  includeImages: true,
  toc: false,
  indentByLevel: true,
};

/**
 * `outline` = tầng của khối trong cây (node ở độ sâu d có outline d, nội dung
 * ghi chú/card của nó có outline d + 1) — Word dùng để thụt lề theo tầng;
 * `indent` = mức lồng trong danh sách (Markdown).
 */
/** Một đoạn chữ có kiểu (KW6 — khối văn bản có định dạng). */
export interface DocRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
  code?: boolean;
}

export type DocBlock =
  | { kind: "heading"; level: number; text: string; outline: number }
  | { kind: "listItem"; depth: number; text: string; checked: boolean | null; outline: number }
  | { kind: "paragraph"; text: string; indent: number; outline: number; runs?: DocRun[] }
  | { kind: "quote"; text: string; indent: number; outline: number; runs?: DocRun[] }
  | { kind: "code"; lines: string[]; indent: number; outline: number }
  /** Mục danh sách TRONG khối văn bản của card (khác `listItem` là node của cây). */
  | { kind: "cardItem"; marker: "bullet" | "number" | "check"; n: number; checked: boolean; depth: number; text: string; indent: number; outline: number; runs?: DocRun[] }
  | {
      kind: "table";
      indent: number;
      outline: number;
      title: string;
      headerRow: boolean;
      align: TableAlign[];
      colWidths: number[];
      cells: string[][];
    }
  | {
      kind: "chart";
      indent: number;
      outline: number;
      title: string;
      chartKind: ChartKind;
      labels: string[];
      series: { name: string; values: (number | null)[] }[];
      /** Ảnh PNG của biểu đồ — do tầng giao diện vẽ (canvas) rồi gắn vào trước khi xuất Word; không có thì xuất bảng số liệu. */
      png?: { dataBase64: string; width: number; height: number };
    }
  | { kind: "image"; indent: number; outline: number; assetId: string; mimeType: string; dataBase64: string; caption: string; width: number | null; height: number | null }
  | { kind: "toc" };

export interface DocModel {
  title: string;
  blocks: DocBlock[];
}

/** Tách ghi chú/văn bản thành các đoạn (ngăn bằng dòng trống), giữ xuống dòng trong đoạn. */
export function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/^\n+|\s+$/g, ""))
    .filter((p) => p.trim().length > 0);
}

/** Khối văn bản có định dạng → các DocBlock (đậm/nghiêng/…, danh sách, trích dẫn, khối mã). Chữ thường: trả null để dùng đường cũ. */
function richDocBlocks(text: string, map: MindMap, indent: number, outline: number): DocBlock[] | null {
  if (!hasRichSyntax(text)) return null;
  const labelOf = (l: NonNullable<Inline["link"]>): string | null => resolveLinkLabel(map, l.type, l.id, l.blockId);
  const runsOf = (inline: Inline[], force?: { bold?: boolean }): DocRun[] =>
    inline.map((s) => ({
      text: s.link ? (labelOf(s.link) ?? s.link.label) || "liên kết" : s.text,
      ...(s.bold || force?.bold ? { bold: true } : {}),
      ...(s.italic ? { italic: true } : {}),
      ...(s.strike ? { strike: true } : {}),
      ...(s.code ? { code: true } : {}),
    }));
  const out: DocBlock[] = [];
  for (const b of parseRich(text)) {
    switch (b.kind) {
      case "blank":
        break;
      case "paragraph":
        out.push({ kind: "paragraph", text: inlineText(b.inline, labelOf), runs: runsOf(b.inline), indent, outline });
        break;
      case "heading":
        out.push({ kind: "paragraph", text: inlineText(b.inline, labelOf), runs: runsOf(b.inline, { bold: true }), indent, outline });
        break;
      case "quote":
        out.push({ kind: "quote", text: inlineText(b.inline, labelOf), runs: runsOf(b.inline), indent, outline });
        break;
      case "code":
        out.push({ kind: "code", lines: b.lines, indent, outline });
        break;
      case "bullet":
      case "number":
      case "check":
        out.push({
          kind: "cardItem",
          marker: b.kind,
          n: b.kind === "number" ? b.n : 0,
          checked: b.kind === "check" ? b.checked : false,
          depth: b.depth,
          text: inlineText(b.inline, labelOf),
          runs: runsOf(b.inline),
          indent,
          outline,
        });
        break;
    }
  }
  return out;
}

export function buildDocModel(map: MindMap, opts: DocOptions): DocModel {
  const blocks: DocBlock[] = [];
  const depthLimit = Math.max(0, Math.min(6, Math.floor(opts.headingDepth)));
  const roots =
    opts.scope === "branch" && opts.branchRootId && map.nodes[opts.branchRootId] ? [opts.branchRootId] : getRootIds(map);
  const firstRoot = roots[0] ? map.nodes[roots[0]] : undefined;
  if (opts.toc && depthLimit > 0) blocks.push({ kind: "toc" });

  const emitContent = (node: MindNode, indent: number, outline: number): void => {
    if (opts.includeNotes && node.notes) {
      for (const p of splitParagraphs(node.notes)) blocks.push({ kind: "paragraph", text: p, indent, outline });
    }
    if (!opts.includeCards || !node.cardId) return;
    const card = map.cards[node.cardId];
    if (!card) return;
    if (card.title && card.title.trim() !== node.text.trim()) {
      blocks.push({ kind: "paragraph", text: card.title, indent, outline });
    }
    /** Một khối của card → DocBlock. `depth` > 0 = đang nằm trong khối nhúng (chỉ nhúng lồng tối đa một tầng). */
    const emitBlock = (b: Block, card: Card, depth: number): void => {
      if (b.type === "text") {
        const rich = richDocBlocks(b.text, map, indent, outline);
        if (rich) blocks.push(...rich);
        else for (const p of splitParagraphs(displayText(b.text, map))) blocks.push({ kind: "paragraph", text: p, indent, outline });
      } else if (b.type === "table") {
        blocks.push({
          kind: "table",
          indent,
          outline,
          title: b.title,
          headerRow: b.headerRow,
          align: [...b.align],
          colWidths: [...b.colWidths],
          cells: displayCells(b).map((r) => [...r]), // ô công thức xuất KẾT QUẢ đã tính
        });
      } else if (b.type === "image") {
        const asset = map.assets[b.assetId];
        if (!opts.includeImages || !asset) return;
        blocks.push({
          kind: "image",
          indent,
          outline,
          assetId: b.assetId,
          mimeType: asset.mimeType,
          dataBase64: asset.dataBase64,
          caption: b.caption,
          width: typeof asset.width === "number" ? asset.width : null,
          height: typeof asset.height === "number" ? asset.height : null,
        });
      } else if (b.type === "chart") {
        const src = card.blocks.find((x): x is TableBlock => x.type === "table" && x.id === b.tableBlockId);
        if (!src) {
          blocks.push({ kind: "paragraph", text: `[Biểu đồ${b.title ? `: ${b.title}` : ""}]`, indent, outline });
          return;
        }
        const d = chartDataOf(src, b);
        blocks.push({
          kind: "chart",
          indent,
          outline,
          title: b.title,
          chartKind: b.kind,
          labels: d.labels,
          series: d.series.map((x) => ({ name: x.name, values: x.values })),
        });
      } else if (b.type === "embed") {
        const target = map.cards[b.cardId];
        const picked = target && b.blockId ? target.blocks.filter((x) => x.id === b.blockId) : target?.blocks ?? [];
        if (!target || (b.blockId && picked.length === 0)) {
          blocks.push({ kind: "paragraph", text: "[Nội dung nhúng: nguồn đã bị xoá]", indent, outline });
        } else if (depth >= 1) {
          blocks.push({ kind: "paragraph", text: `[Nhúng lồng: ${target.title || "card"}]`, indent, outline });
        } else {
          if (!b.blockId) blocks.push({ kind: "paragraph", text: `Nhúng từ: ${target.title || "(card chưa đặt tên)"}`, runs: [{ text: `Nhúng từ: ${target.title || "(card chưa đặt tên)"}`, italic: true }], indent, outline });
          for (const x of picked) emitBlock(x, target, depth + 1);
        }
      }
    };
    for (const b of card.blocks) emitBlock(b, card, 0);
  };

  const walk = (id: string, depth: number): void => {
    const node = map.nodes[id];
    if (!node) return;
    if (depth < depthLimit) {
      blocks.push({ kind: "heading", level: depth + 1, text: node.text || "(không tên)", outline: depth });
      emitContent(node, 0, depth + 1);
    } else {
      const listDepth = depth - depthLimit;
      blocks.push({ kind: "listItem", depth: listDepth, text: node.text || "(không tên)", checked: node.checked, outline: depth });
      emitContent(node, listDepth + 1, depth + 1);
    }
    for (const c of node.children) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);

  return { title: firstRoot?.text || "T17Mind", blocks };
}

/** Bậc thụt lề mong muốn mỗi tầng (≈ 1 cm, đơn vị dxa = 1/20 pt). */
export const OUTLINE_STEP_DXA = 567;
/** Bậc tối thiểu (≈ 0,25 cm) — cây rất sâu vẫn còn nhìn ra tầng. */
export const OUTLINE_STEP_MIN_DXA = 142;
/** Tổng thụt lề ở tầng sâu nhất không quá phần này của bề rộng vùng chữ. */
export const OUTLINE_MAX_SHARE = 0.3;

/** Tầng sâu nhất có trong tài liệu (0 nếu trống). */
export function maxOutline(doc: DocModel): number {
  let m = 0;
  for (const b of doc.blocks) if (b.kind !== "toc" && b.outline > m) m = b.outline;
  return m;
}

/**
 * Bậc thụt lề mỗi tầng cho Word: mặc định ≈ 1 cm; khi cây sâu, co lại sao
 * cho tầng sâu nhất thụt không quá OUTLINE_MAX_SHARE bề rộng vùng chữ (đỡ
 * phí giấy), nhưng không nhỏ hơn OUTLINE_STEP_MIN_DXA.
 */
export function outlineIndentStep(deepest: number, textWidthDxa: number): number {
  if (deepest <= 0) return OUTLINE_STEP_DXA;
  const fit = Math.floor((textWidthDxa * OUTLINE_MAX_SHARE) / deepest);
  return Math.max(OUTLINE_STEP_MIN_DXA, Math.min(OUTLINE_STEP_DXA, fit));
}

/** Đếm nhanh nội dung (dùng cho test tự kiểm chứng sau khi xuất). */
export function docStats(doc: DocModel): { headings: number; listItems: number; tables: number; tableRows: number; images: number } {
  let headings = 0,
    listItems = 0,
    tables = 0,
    tableRows = 0,
    images = 0;
  for (const b of doc.blocks) {
    if (b.kind === "heading") headings++;
    else if (b.kind === "listItem") listItems++;
    else if (b.kind === "table") {
      tables++;
      tableRows += b.cells.length;
    } else if (b.kind === "image") images++;
  }
  return { headings, listItems, tables, tableRows, images };
}


/** Bảng số liệu của một khối biểu đồ — dùng khi xuất không có ảnh (Markdown, Word thiếu ảnh). */
export function chartDocTable(b: Extract<DocBlock, { kind: "chart" }>): Extract<DocBlock, { kind: "table" }> {
  const cols = b.series.length + 1;
  const cells: string[][] = [["", ...b.series.map((s) => s.name)]];
  b.labels.forEach((l, i) => cells.push([l, ...b.series.map((s) => (s.values[i] === null || s.values[i] === undefined ? "" : formatNumber(s.values[i]!, 4, "en-US")))]));
  return {
    kind: "table",
    indent: b.indent,
    outline: b.outline,
    title: b.title ? `Biểu đồ: ${b.title}` : "Biểu đồ",
    headerRow: true,
    align: ["left", ...b.series.map((): TableAlign => "right")],
    colWidths: Array.from({ length: cols }, () => 100),
    cells,
  };
}
