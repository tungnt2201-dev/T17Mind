/**
 * core/richEdit.ts
 * ---------------------------------------------------------------------
 * KW6 — các PHÉP SỬA văn bản cho thanh định dạng, phím tắt và menu "/".
 * Mỗi hàm nhận (chuỗi, vị trí chọn) và trả chuỗi mới + vị trí chọn mới —
 * thuần, kiểm thử được; ô nhập chỉ việc ghi kết quả vào textarea.
 * ---------------------------------------------------------------------
 */
export interface Edit {
  value: string;
  start: number;
  end: number;
}

/** Bao/bỏ bao vùng chọn bằng `mark` (** * ~~ `). Không chọn gì: chèn cặp ký hiệu và đặt con trỏ ở giữa. */
export function toggleInline(value: string, start: number, end: number, mark: string): Edit {
  const m = mark.length;
  const sel = value.slice(start, end);
  // Đang được bao ngay sát bên ngoài vùng chọn → bỏ.
  if (value.slice(start - m, start) === mark && value.slice(end, end + m) === mark && (mark !== "*" || (value[start - 2] !== "*" && value[end + 1] !== "*"))) {
    return { value: value.slice(0, start - m) + sel + value.slice(end + m), start: start - m, end: end - m };
  }
  // Vùng chọn đã gồm cả ký hiệu hai đầu → bỏ.
  if (sel.length >= 2 * m && sel.startsWith(mark) && sel.endsWith(mark) && (mark !== "*" || (!sel.startsWith("**") && !sel.endsWith("**")))) {
    const inner = sel.slice(m, sel.length - m);
    return { value: value.slice(0, start) + inner + value.slice(end), start, end: start + inner.length };
  }
  if (start === end) return { value: value.slice(0, start) + mark + mark + value.slice(end), start: start + m, end: start + m };
  // Giữ dấu cách ở hai đầu vùng chọn ngoài ký hiệu (Markdown không nhận "** chữ **").
  const lead = /^\s*/.exec(sel)![0].length;
  const trail = /\s*$/.exec(sel)![0].length;
  if (lead + trail >= sel.length) return { value, start, end };
  const s2 = start + lead;
  const e2 = end - trail;
  return { value: value.slice(0, s2) + mark + value.slice(s2, e2) + mark + value.slice(e2), start: s2 + m, end: e2 + m };
}

export type LineKind = "bullet" | "number" | "check" | "quote" | "h1" | "h2" | "h3";

const PREFIX_RE = /^(\s*)(?:[-*]\s+\[[ xX]\]\s+|[-*]\s+|\d+[.)]\s+|>\s?|#{1,3}\s+)/;

function prefixOf(kind: LineKind, i: number): string {
  switch (kind) {
    case "bullet": return "- ";
    case "number": return `${i + 1}. `;
    case "check": return "- [ ] ";
    case "quote": return "> ";
    case "h1": return "# ";
    case "h2": return "## ";
    case "h3": return "### ";
  }
}
function hasPrefix(line: string, kind: LineKind): boolean {
  switch (kind) {
    case "bullet": return /^\s*[-*]\s+(?!\[[ xX]\]\s)/.test(line);
    case "number": return /^\s*\d+[.)]\s+/.test(line);
    case "check": return /^\s*[-*]\s+\[[ xX]\]\s+/.test(line);
    case "quote": return /^>\s?/.test(line);
    case "h1": return /^#\s+/.test(line);
    case "h2": return /^##\s+/.test(line);
    case "h3": return /^###\s+/.test(line);
  }
}

/** Đặt/bỏ kiểu dòng (danh sách, tick, trích dẫn, tiêu đề) cho mọi dòng chạm vùng chọn. Mọi dòng đã đúng kiểu → bỏ kiểu. */
export function toggleLinePrefix(value: string, start: number, end: number, kind: LineKind): Edit {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nl = value.indexOf("\n", Math.max(end, start));
  const to = nl < 0 ? value.length : nl;
  const lines = value.slice(from, to).split("\n");
  const content = lines.map((l, i) => ({ l, i })).filter((x) => x.l.trim() !== "" || lines.length === 1);
  const allHave = content.length > 0 && content.every((x) => hasPrefix(x.l, kind));
  let n = 0;
  const out = lines.map((l) => {
    if (l.trim() === "" && lines.length > 1) return l;
    const indent = /^\s*/.exec(l)![0];
    const stripped = l.replace(PREFIX_RE, (_m, ind: string) => ind);
    if (allHave) return stripped;
    const keepIndent = kind === "bullet" || kind === "number" || kind === "check" ? indent : "";
    return keepIndent + prefixOf(kind, n++) + stripped.slice(indent.length);
  });
  const text = out.join("\n");
  const value2 = value.slice(0, from) + text + value.slice(to);
  // Không chọn gì (chỉ có con trỏ): đặt con trỏ ở CUỐI dòng để gõ tiếp ngay — không bôi đen cả dòng (gõ sẽ ghi đè mất ký hiệu).
  const caret = from + text.length;
  return { value: value2, start: start === end ? caret : from, end: caret };
}

/** Bao các dòng đang chọn bằng hàng rào ```; không chọn gì thì chèn khối mã rỗng và đặt con trỏ bên trong. */
export function insertCodeBlock(value: string, start: number, end: number): Edit {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nl = value.indexOf("\n", Math.max(end, start));
  const to = nl < 0 ? value.length : nl;
  const body = value.slice(from, to);
  const before = value.slice(0, from);
  const after = value.slice(to);
  if (body.trim() === "") {
    const pos = from + 4;
    return { value: `${before}\`\`\`\n\n\`\`\`${after}`, start: pos, end: pos };
  }
  const text = `\`\`\`\n${body}\n\`\`\``;
  return { value: before + text + after, start: from + 4, end: from + 4 + body.length };
}

/**
 * Enter trong danh sách: dòng có nội dung → xuống dòng và tiếp tục cùng kiểu (số tăng dần, tick luôn trống);
 * dòng chỉ có ký hiệu (rỗng) → bỏ ký hiệu, thoát danh sách. Trả null nếu con trỏ không ở dòng danh sách.
 */
export function continueList(value: string, caret: number): Edit | null {
  const from = value.lastIndexOf("\n", caret - 1) + 1;
  const nl = value.indexOf("\n", caret);
  const to = nl < 0 ? value.length : nl;
  const line = value.slice(from, to);
  const m = /^(\s*)(?:([-*])\s+(\[[ xX]\]\s+)?|(\d+)([.)])\s+)(.*)$/.exec(line);
  if (!m || caret < from + (line.length - m[6]!.length)) return null;
  const rest = m[6]!;
  if (rest.trim() === "") {
    const v = value.slice(0, from) + value.slice(to);
    return { value: v, start: from, end: from };
  }
  const prefix = m[4] !== undefined ? `${m[1]}${Number(m[4]) + 1}${m[5]} ` : `${m[1]}${m[2]} ${m[3] ? "[ ] " : ""}`;
  const before = value.slice(0, caret);
  const after = value.slice(caret);
  const pos = caret + 1 + prefix.length;
  return { value: `${before}\n${prefix}${after}`, start: pos, end: pos };
}

// ------------------------------------------------------------ Menu "/"

export type SlashAction = LineKind | "code" | "link" | "embed";
export interface SlashItem {
  id: SlashAction;
  label: string;
  hint: string;
  /** Từ khoá (không dấu) để lọc. */
  keys: string;
}
export const SLASH_ITEMS: SlashItem[] = [
  { id: "h1", label: "Tiêu đề lớn", hint: "#", keys: "tieu de h1 heading lon" },
  { id: "h2", label: "Tiêu đề vừa", hint: "##", keys: "tieu de h2 heading vua" },
  { id: "h3", label: "Tiêu đề nhỏ", hint: "###", keys: "tieu de h3 heading nho" },
  { id: "bullet", label: "Danh sách", hint: "-", keys: "danh sach bullet gach dau dong list" },
  { id: "number", label: "Danh sách số", hint: "1.", keys: "danh sach so number thu tu" },
  { id: "check", label: "Việc cần làm", hint: "[ ]", keys: "viec can lam todo checklist tick" },
  { id: "quote", label: "Trích dẫn", hint: ">", keys: "trich dan quote" },
  { id: "code", label: "Khối mã", hint: "```", keys: "khoi ma code" },
  { id: "link", label: "Liên kết card / node", hint: "@", keys: "lien ket link card node mention" },
  { id: "embed", label: "Nhúng card hoặc khối", hint: "▣", keys: "nhung embed card khoi" },
];

const strip = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

/** Gõ "/" ở đầu dòng (sau khoảng trắng) + vài chữ → { start: vị trí dấu "/", query }. Giữa dòng thì không mở. */
export function slashQuery(beforeCaret: string): { start: number; query: string } | null {
  const m = /(?:^|\n)([ \t]*)\/([^\s/]*)$/.exec(beforeCaret);
  if (!m) return null;
  return { start: beforeCaret.length - m[2]!.length - 1, query: m[2]! };
}
export function slashMatches(query: string): SlashItem[] {
  const q = strip(query);
  return q === "" ? SLASH_ITEMS : SLASH_ITEMS.filter((it) => strip(it.label).includes(q) || it.keys.includes(q));
}
