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
import type { MindMap, MindNode, TableAlign } from "./types";
import { getRootIds } from "./tree";
import { plainText } from "./links";

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
export type DocBlock =
  | { kind: "heading"; level: number; text: string; outline: number }
  | { kind: "listItem"; depth: number; text: string; checked: boolean | null; outline: number }
  | { kind: "paragraph"; text: string; indent: number; outline: number }
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
    for (const b of card.blocks) {
      if (b.type === "text") {
        for (const p of splitParagraphs(plainText(b.text, map))) blocks.push({ kind: "paragraph", text: p, indent, outline });
      } else if (b.type === "table") {
        blocks.push({
          kind: "table",
          indent,
          outline,
          title: b.title,
          headerRow: b.headerRow,
          align: [...b.align],
          colWidths: [...b.colWidths],
          cells: b.cells.map((r) => [...r]),
        });
      } else if (b.type === "image") {
        const asset = map.assets[b.assetId];
        if (!opts.includeImages || !asset) continue;
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
        blocks.push({ kind: "paragraph", text: `[Biểu đồ${b.title ? `: ${b.title}` : ""}]`, indent, outline });
      }
    }
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
