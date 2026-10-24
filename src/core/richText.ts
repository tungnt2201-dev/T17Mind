/**
 * core/richText.ts
 * ---------------------------------------------------------------------
 * KW6 — "Markdown rút gọn" cho khối văn bản của card. Khối văn bản VẪN là
 * một chuỗi (`TextBlock.text`): chữ cũ không có ký hiệu nào thì hiện y
 * nguyên, token liên kết `[[card:…]]` giữ nguyên. Cú pháp hiểu được:
 *   Dòng:  `# `/`## `/`### ` tiêu đề · `- ` hoặc `* ` danh sách (thụt 2 dấu cách mỗi bậc)
 *          `1. ` danh sách số · `- [ ] ` / `- [x] ` việc cần làm · `> ` trích dẫn · hàng rào ``` khối mã
 *   Trong dòng:  **đậm** · *nghiêng* · ~~gạch ngang~~ · `mã`
 * Ký hiệu chỉ có tác dụng khi ôm sát chữ (không có dấu cách ngay sau ký hiệu mở / trước ký hiệu đóng) nên
 * "5 * 3 * 2" vẫn là chữ thường. Ký hiệu không đóng cặp được giữ nguyên là chữ.
 * Hàm THUẦN: dùng chung cho hiển thị, đoạn trích trên node, tìm kiếm, xuất Word/Markdown.
 * ---------------------------------------------------------------------
 */
import { parseSegments, resolveLinkLabel, type LinkType } from "./links";
import type { MindMap } from "./types";

export interface InlineStyle {
  bold?: true;
  italic?: true;
  strike?: true;
  code?: true;
}
export interface Inline extends InlineStyle {
  text: string;
  /** Có = đây là một liên kết (text = nhãn trong token, có thể rỗng). */
  link?: { type: LinkType; id: string; blockId: string | null; label: string };
}

interface Base {
  /** Chỉ số dòng nguồn đầu tiên của khối (để bật/tắt ô tick đúng dòng). */
  line: number;
}
export type RichBlock =
  | (Base & { kind: "paragraph"; inline: Inline[] })
  | (Base & { kind: "heading"; level: 1 | 2 | 3; inline: Inline[] })
  | (Base & { kind: "bullet"; depth: number; inline: Inline[] })
  | (Base & { kind: "number"; depth: number; n: number; inline: Inline[] })
  | (Base & { kind: "check"; depth: number; checked: boolean; inline: Inline[] })
  | (Base & { kind: "quote"; inline: Inline[] })
  | (Base & { kind: "code"; lines: string[] })
  | (Base & { kind: "blank" });

const MARKS: [string, keyof InlineStyle][] = [
  ["**", "bold"],
  ["~~", "strike"],
  ["*", "italic"],
];

function findClose(text: string, mark: string, from: number): number {
  for (let k = from + 1; k < text.length; k++) {
    if (text[k] === "`") {
      const j = text.indexOf("`", k + 1);
      if (j > 0) k = j; // bỏ qua nội dung mã
      continue;
    }
    if (!text.startsWith(mark, k) || /\s/.test(text[k - 1]!)) continue;
    if (mark === "*" && (text[k + 1] === "*" || text[k - 1] === "*")) continue;
    // "***x***": đóng bằng HAI dấu cuối của cụm, để dấu * còn lại thuộc về phần nghiêng bên trong.
    if (mark === "**" && text[k + 2] === "*") continue;
    return k;
  }
  return -1;
}

function marks(text: string, base: InlineStyle, out: Inline[]): void {
  let buf = "";
  const flush = (): void => {
    if (buf) out.push({ ...base, text: buf });
    buf = "";
  };
  let i = 0;
  outer: while (i < text.length) {
    if (text[i] === "`") {
      const j = text.indexOf("`", i + 1);
      if (j > i + 1) {
        flush();
        out.push({ ...base, code: true, text: text.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
    }
    for (const [mark, key] of MARKS) {
      if (!text.startsWith(mark, i)) continue;
      const next = text[i + mark.length];
      if (next === undefined || /\s/.test(next)) continue;
      const j = findClose(text, mark, i + mark.length);
      if (j < 0) continue;
      flush();
      marks(text.slice(i + mark.length, j), { ...base, [key]: true }, out);
      i = j + mark.length;
      continue outer;
    }
    buf += text[i];
    i++;
  }
  flush();
}

/**
 * Phân tích một dòng chữ thành các đoạn có kiểu; token liên kết thành đoạn `link`. Token được thay bằng ký tự giữ chỗ
 * TRƯỚC khi tìm ký hiệu, nên **[[card:…]]** (đậm bao quanh liên kết) vẫn được hiểu đúng.
 */
export function parseInline(text: string): Inline[] {
  const segs = parseSegments(text);
  if (!segs.some((x) => x.kind === "link")) {
    const out: Inline[] = [];
    marks(text, {}, out);
    return out;
  }
  const links: NonNullable<Inline["link"]>[] = [];
  let joined = "";
  for (const seg of segs) {
    if (seg.kind === "text") joined += seg.text.replace(/[\uE000\uE001]/g, "");
    else {
      joined += `\uE000${links.length}\uE001`;
      links.push({ type: seg.type, id: seg.id, blockId: seg.blockId, label: seg.label });
    }
  }
  const raw: Inline[] = [];
  marks(joined, {}, raw);
  const out: Inline[] = [];
  for (const piece of raw) {
    const { text: t, ...style } = piece;
    if (piece.code) {
      out.push(piece);
      continue;
    }
    let last = 0;
    for (const m of t.matchAll(/\uE000(\d+)\uE001/g)) {
      if (m.index! > last) out.push({ ...style, text: t.slice(last, m.index) });
      const l = links[Number(m[1])]!;
      out.push({ ...style, text: l.label, link: l });
      last = m.index! + m[0].length;
    }
    if (last < t.length) out.push({ ...style, text: t.slice(last) });
  }
  return out;
}

const LIST_RE = /^(\s*)(?:([-*])\s+(\[[ xX]\]\s+)?|(\d+)[.)]\s+)(.*)$/;

export function parseRich(text: string): RichBlock[] {
  const lines = text.split("\n");
  const out: RichBlock[] = [];
  let numCount: Record<number, number> = {};
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!.replace(/\r$/, "");
    if (/^```/.test(raw)) {
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && !/^```\s*$/.test(lines[j]!.replace(/\r$/, ""))) body.push(lines[j++]!);
      out.push({ kind: "code", line: i, lines: body });
      i = j; // bỏ dòng đóng (nếu thiếu thì ăn hết phần còn lại)
      numCount = {};
      continue;
    }
    if (raw.trim() === "") {
      out.push({ kind: "blank", line: i });
      numCount = {};
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(raw);
    if (h) {
      out.push({ kind: "heading", line: i, level: h[1]!.length as 1 | 2 | 3, inline: parseInline(h[2]!) });
      numCount = {};
      continue;
    }
    const q = /^>\s?(.*)$/.exec(raw);
    if (q) {
      out.push({ kind: "quote", line: i, inline: parseInline(q[1]!) });
      numCount = {};
      continue;
    }
    const l = LIST_RE.exec(raw);
    if (l) {
      const depth = Math.min(6, Math.floor(l[1]!.replace(/\t/g, "  ").length / 2));
      const body = parseInline(l[5]!);
      if (l[4] !== undefined) {
        numCount[depth] = (numCount[depth] ?? 0) + 1;
        for (const d of Object.keys(numCount)) if (Number(d) > depth) delete numCount[Number(d)];
        out.push({ kind: "number", line: i, depth, n: numCount[depth]!, inline: body });
      } else if (l[3]) {
        out.push({ kind: "check", line: i, depth, checked: /x/i.test(l[3]), inline: body });
        numCount = {};
      } else {
        out.push({ kind: "bullet", line: i, depth, inline: body });
        numCount = {};
      }
      continue;
    }
    out.push({ kind: "paragraph", line: i, inline: parseInline(raw) });
    numCount = {};
  }
  return out;
}

/** Chữ thuần của các đoạn (bỏ ký hiệu; liên kết lấy nhãn trong token hoặc `labelOf`). */
export function inlineText(inline: Inline[], labelOf?: (l: NonNullable<Inline["link"]>) => string | null): string {
  return inline.map((s) => (s.link ? (labelOf?.(s.link) ?? s.link.label) || "liên kết" : s.text)).join("");
}

/** Chữ thuần của cả khối văn bản (không ký hiệu Markdown, đầu dòng danh sách thành "• " / "☐ " / "☑ "). Dùng cho đoạn trích, tìm kiếm. */
export function richPlainText(text: string, labelOf?: (l: NonNullable<Inline["link"]>) => string | null): string {
  if (!/[*`~#>\-\d[]/.test(text) && !text.includes("[[")) return text;
  const lines: string[] = [];
  for (const b of parseRich(text)) {
    switch (b.kind) {
      case "blank":
        lines.push("");
        break;
      case "code":
        lines.push(...b.lines);
        break;
      case "bullet":
        lines.push(`${"  ".repeat(b.depth)}• ${inlineText(b.inline, labelOf)}`);
        break;
      case "number":
        lines.push(`${"  ".repeat(b.depth)}${b.n}. ${inlineText(b.inline, labelOf)}`);
        break;
      case "check":
        lines.push(`${"  ".repeat(b.depth)}${b.checked ? "☑" : "☐"} ${inlineText(b.inline, labelOf)}`);
        break;
      default:
        lines.push(inlineText(b.inline, labelOf));
    }
  }
  return lines.join("\n");
}

/** Có ký hiệu định dạng nào không (để bỏ qua việc dựng khi chỉ là chữ thường). */
export function hasRichSyntax(text: string): boolean {
  return /(^|\n)\s*(#{1,3}\s|[-*]\s|\d+[.)]\s|>\s?|```)|\*\*\S|~~\S|`[^`\n]+`|(^|[^*])\*\S/.test(text);
}

/** Bật/tắt ô tick ở dòng nguồn `line`; không phải dòng việc cần làm thì trả nguyên văn. */
export function toggleCheckLine(text: string, line: number): string {
  const lines = text.split("\n");
  const raw = lines[line];
  if (raw === undefined) return text;
  const m = /^(\s*[-*]\s+)\[([ xX])\](\s.*)?$/.exec(raw);
  if (!m) return text;
  lines[line] = `${m[1]}[${m[2] === " " ? "x" : " "}]${m[3] ?? ""}`;
  return lines.join("\n");
}

/** Chuỗi Markdown từ các đoạn có kiểu (xuất .md). Liên kết thành nhãn thường. */
export function inlineToMarkdown(inline: { text: string; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean }[]): string {
  // Gộp các đoạn liền nhau cùng kiểu (vd. hai liên kết trong một cặp *nghiêng*) để ký hiệu bao trọn cả cụm.
  const merged: typeof inline = [];
  for (const s of inline) {
    const last = merged[merged.length - 1];
    if (last && !s.code && !last.code && !!last.bold === !!s.bold && !!last.italic === !!s.italic && !!last.strike === !!s.strike) {
      merged[merged.length - 1] = { ...last, text: last.text + s.text };
    } else merged.push({ ...s });
  }
  return merged
    .map((s) => {
      if (s.code) return `\`${s.text}\``;
      let t = s.text;
      if (!t.trim()) return t;
      const lead = /^\s*/.exec(t)![0];
      const trail = /\s*$/.exec(t)![0];
      let core = t.slice(lead.length, t.length - trail.length);
      if (s.strike) core = `~~${core}~~`;
      if (s.italic) core = `*${core}*`;
      if (s.bold) core = `**${core}**`;
      return lead + core + trail;
    })
    .join("");
}

/** Chữ thuần để hiển thị/tìm kiếm của một khối văn bản: bỏ ký hiệu Markdown, liên kết lấy TÊN HIỆN TẠI của đích (nếu có `map`). */
export function displayText(text: string, map?: MindMap): string {
  return richPlainText(text, (l) => (map ? resolveLinkLabel(map, l.type, l.id, l.blockId) : null));
}
