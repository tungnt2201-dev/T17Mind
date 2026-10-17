/**
 * io/opml.ts
 * ---------------------------------------------------------------------
 * Xuất/nhập OPML (Outline Processor Markup Language) — định dạng
 * outline XML chuẩn, mở được bằng nhiều công cụ khác (Workflowy,
 * Dynalist, OmniOutliner...).
 *
 * PHẠM VI (cùng tinh thần với Markdown/SVG — cố tình giữ ở mức CỐT
 * LÕI): mỗi node thành một thẻ `<outline text="...">`, ghi chú thành
 * thuộc tính `_note` (quy ước phổ biến của nhiều outliner khi xuất
 * OPML), checkbox hoàn thành thành `_complete="true"/"false"` (quy
 * ước tương tự Workflowy). KHÔNG xuất: Tag, màu sắc, link, marker,
 * quan hệ chéo, tóm tắt, khoanh vùng, ghi chú dán — dùng "Xuất JSON"
 * khi cần đầy đủ mọi dữ liệu.
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode } from "../core/types";
import { createEmptyMap, createNode, getRootIds } from "../core/tree";
import { validateMindMap } from "../core/validate";
import type { ImportResult } from "./json";

function escapeXmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOutline(map: MindMap, node: MindNode, indent: string): string {
  const attrs = [`text="${escapeXmlAttr(node.text)}"`];
  if (node.notes) attrs.push(`_note="${escapeXmlAttr(node.notes)}"`);
  if (node.checked !== null) attrs.push(`_complete="${node.checked ? "true" : "false"}"`);

  if (node.children.length === 0) {
    return `${indent}<outline ${attrs.join(" ")}/>`;
  }
  const childLines = node.children
    .map((id) => buildOutline(map, map.nodes[id] as MindNode, indent + "  "))
    .join("\n");
  return `${indent}<outline ${attrs.join(" ")}>\n${childLines}\n${indent}</outline>`;
}

export function exportOpml(map: MindMap): string {
  const rootIds = getRootIds(map);
  const bodyLines = rootIds.map((id) => buildOutline(map, map.nodes[id] as MindNode, "    ")).join("\n");
  const title = escapeXmlAttr(map.mapTitle || map.nodes[map.rootId]?.text || "Mindmap");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<opml version="2.0">\n` +
    `  <head>\n    <title>${title}</title>\n  </head>\n` +
    `  <body>\n${bodyLines}\n  </body>\n` +
    `</opml>\n`
  );
}

export function parseOpmlFile(text: string): ImportResult {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, "application/xml");
  } catch (err) {
    return { ok: false, errors: [`Không đọc được file OPML: ${String((err as Error).message ?? err)}`] };
  }
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    return { ok: false, errors: [`File OPML không hợp lệ (lỗi cú pháp XML): ${parserError.textContent ?? ""}`] };
  }

  const body = doc.querySelector("body");
  if (!body) return { ok: false, errors: ["File OPML không có thẻ <body>."] };

  const topOutlines = Array.from(body.children).filter((el) => el.tagName === "outline");
  if (topOutlines.length === 0) return { ok: false, errors: ["File OPML không có outline (node) nào."] };

  const nodes: Record<string, MindNode> = {};

  function convertOutline(el: Element, parentId: string | null): MindNode {
    const text = el.getAttribute("text") ?? el.getAttribute("title") ?? "";
    const node = createNode(text, parentId);
    const note = el.getAttribute("_note");
    if (note) node.notes = note;
    const complete = el.getAttribute("_complete");
    if (complete === "true" || complete === "false") node.checked = complete === "true";

    const childEls = Array.from(el.children).filter((c) => c.tagName === "outline");
    node.children.push(...childEls.map((c) => convertOutline(c, node.id).id));
    nodes[node.id] = node;
    return node;
  }

  const firstRoot = convertOutline(topOutlines[0] as Element, null);
  // Outline thứ 2 trở đi ở cấp cao nhất -> nhánh trôi (giống cách "Ghép
  // thêm JSON"/XMind xử lý đa gốc) — không mất nội dung nếu file OPML
  // nguồn có nhiều outline gốc.
  for (const el of topOutlines.slice(1)) convertOutline(el, null);

  const titleEl = doc.querySelector("head > title");
  const map: MindMap = {
    ...createEmptyMap(firstRoot.text),
    mapTitle: titleEl?.textContent ?? null,
    rootId: firstRoot.id,
    nodes,
  };

  const errors = validateMindMap(map);
  if (errors.length > 0) {
    return { ok: false, errors: [`File nhập được nhưng dữ liệu sau khi chuyển đổi không hợp lệ: ${errors.join(", ")}`] };
  }
  return { ok: true, map };
}
