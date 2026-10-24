/**
 * io/markdownImport.ts
 * ---------------------------------------------------------------------
 * M5 (tuỳ chọn) — nhập Markdown thành map, để đi HAI CHIỀU với xuất tài
 * liệu (io/markdownDoc.ts):
 * - Tiêu đề "#…######" → node; cấp tiêu đề quyết định cha (tiêu đề gần
 *   nhất có cấp nhỏ hơn). Tiêu đề đầu tiên thành gốc của map.
 * - Danh sách "-", "*", "+", "1." (lồng theo thụt lề) → node con của
 *   tiêu đề/mục danh sách đang mở; "[ ]"/"[x]" → checkbox hoàn thành.
 * - Đoạn văn → ghi chú (notes) của node đang mở (khi xuất, cả ghi chú
 *   lẫn văn bản của card đều thành đoạn văn — nhập lại thì về ghi chú).
 * - Bảng GFM → khối bảng trong card của node; ảnh nhúng base64
 *   ("![chú thích](data:image/…;base64,…)") → khối ảnh trong card.
 * - Mục lục (danh sách toàn liên kết "#neo" ngay sau "**Mục lục**") bị bỏ qua.
 * ---------------------------------------------------------------------
 */
import type { Card, MindNode, TableAlign } from "../core/types";
import { createEmptyMap, createNode, generateId, generateBlockId } from "../core/tree";
import { createCard, createImageBlock, createTextBlock } from "../core/cards";
import { hasRichSyntax } from "../core/richText";
import { tableFromGrid } from "../core/table";
import { validateMindMap } from "../core/validate";
import type { ImportResult } from "./json";

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const LIST = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;
const IMAGE = /^\s*!\[([^\]]*)\]\((data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=]+))\)\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  const t = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let cur = "";
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "\\" && t[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (t[i] === "|") {
      cells.push(cur);
      cur = "";
    } else cur += t[i];
  }
  cells.push(cur);
  return cells.map((c) => c.trim().replace(/<br\s*\/?>/gi, "\n"));
}

const unescapeMd = (s: string): string => s.replace(/\\([\\`*_{}[\]()#+\-.!|>])/g, "$1");
const stripInline = (s: string): string => unescapeMd(s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\W)[*_](.+?)[*_](?=\W|$)/g, "$1$2"));

export function parseMarkdownDoc(text: string, fallbackTitle = "Markdown"): ImportResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const map = createEmptyMap(fallbackTitle);
  let rootUsed = false;
  const headingStack: { level: number; id: string }[] = [{ level: 0, id: map.rootId }];
  let listStack: { indent: number; id: string }[] = [];
  let current: string = map.rootId;
  let para: string[] = [];
  /** "**Tên bảng**" đứng ngay trước một bảng (cách xuất của T17Mind) → tên bảng. */
  let pendingTableTitle = "";

  const node = (id: string): MindNode => map.nodes[id]!;
  const addChild = (parentId: string, textValue: string): string => {
    const n = createNode(textValue, parentId);
    map.nodes[n.id] = n;
    node(parentId).children.push(n.id);
    return n.id;
  };
  const cardOf = (id: string): Card => {
    const n = node(id);
    if (n.cardId && map.cards[n.cardId]) return map.cards[n.cardId]!;
    const c = createCard(n.text);
    map.cards[c.id] = c;
    n.cardId = c.id;
    return c;
  };
  const flushPara = (): void => {
    const raw = para.join("\n").trim();
    para = [];
    if (!raw) return;
    // KW6 — đoạn có định dạng (đậm/nghiêng/mã/trích dẫn…) thành khối VĂN BẢN của card (giữ nguyên ký hiệu
    // Markdown rút gọn); đoạn chữ thường vẫn là ghi chú của node như trước.
    if (hasRichSyntax(raw)) {
      cardOf(current).blocks.push(createTextBlock(raw));
      return;
    }
    const p = stripInline(raw);
    const n = node(current);
    n.notes = n.notes ? `${n.notes}\n\n${p}` : p;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) {
      flushPara();
      continue;
    }
    if (/^```/.test(line.trim())) {
      // Khối mã rào bằng ``` → khối văn bản của card (nội dung giữ nguyên, kể cả dòng trống bên trong).
      flushPara();
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^```\s*$/.test(lines[j]!.trim())) body.push(lines[j++]!);
      cardOf(current).blocks.push(createTextBlock(`\`\`\`\n${body.join("\n")}\n\`\`\``));
      i = j;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      flushPara();
      listStack = [];
      const level = h[1]!.length;
      const title = stripInline(h[2]!);
      if (!rootUsed) {
        node(map.rootId).text = title;
        rootUsed = true;
        headingStack.splice(1);
        headingStack[0] = { level, id: map.rootId };
        current = map.rootId;
        continue;
      }
      while (headingStack.length > 1 && headingStack[headingStack.length - 1]!.level >= level) headingStack.pop();
      const id = addChild(headingStack[headingStack.length - 1]!.id, title);
      headingStack.push({ level, id });
      current = id;
      continue;
    }
    // Mục lục do T17Mind xuất: "**Mục lục**" + danh sách liên kết neo → bỏ qua.
    if (/^\*\*Mục lục\*\*\s*$/.test(line.trim())) {
      flushPara();
      while (i + 1 < lines.length && (!lines[i + 1]!.trim() || /^\s*-\s+\[.*\]\(#.*\)\s*$/.test(lines[i + 1]!))) i++;
      continue;
    }
    if (line.trim().startsWith("|") && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1]!)) {
      flushPara();
      const header = splitRow(line);
      const align: TableAlign[] = splitRow(lines[i + 1]!).map((c) =>
        c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "left"
      );
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(splitRow(lines[i++]!));
      i--;
      const headerEmpty = header.every((c) => !c);
      const table = tableFromGrid(generateBlockId(), headerEmpty ? rows : [header, ...rows]);
      table.headerRow = !headerEmpty;
      table.align = table.align.map((a, k) => align[k] ?? a);
      table.title = pendingTableTitle;
      pendingTableTitle = "";
      cardOf(current).blocks.push(table);
      continue;
    }
    const img = IMAGE.exec(line);
    if (img) {
      flushPara();
      const assetId = generateId("img");
      map.assets[assetId] = { mimeType: img[3]!, dataBase64: img[4]! };
      cardOf(current).blocks.push(createImageBlock(assetId, img[1] === "ảnh" ? "" : img[1]!));
      // Dòng chú thích nghiêng ngay sau ảnh (do T17Mind xuất) → bỏ (đã có trong chú thích).
      if (i + 1 < lines.length && /^\s*\*[^*].*\*\s*$/.test(lines[i + 1]!)) i++;
      continue;
    }
    const li = LIST.exec(line);
    if (li) {
      flushPara();
      const indent = li[1]!.replace(/\t/g, "    ").length;
      while (listStack.length > 0 && listStack[listStack.length - 1]!.indent >= indent) listStack.pop();
      const parent = listStack.length > 0 ? listStack[listStack.length - 1]!.id : headingStack[headingStack.length - 1]!.id;
      const id = addChild(parent, stripInline(li[3]!));
      if (li[2]) node(id).checked = li[2].toLowerCase() === "x";
      listStack.push({ indent, id });
      current = id;
      continue;
    }
    const bold = /^\s*\*\*([^*]+)\*\*\s*$/.exec(line);
    if (bold) {
      let j = i + 1;
      while (j < lines.length && !lines[j]!.trim()) j++;
      if (j + 1 < lines.length && lines[j]!.trim().startsWith("|") && TABLE_SEP.test(lines[j + 1]!)) {
        flushPara();
        pendingTableTitle = bold[1]!.trim();
        continue;
      }
    }
    para.push(line.trim().replace(/ {2}$/, ""));
  }
  flushPara();

  const errors = validateMindMap(map);
  return errors.length ? { ok: false, errors } : { ok: true, map };
}
