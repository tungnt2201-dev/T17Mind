/**
 * core/links.ts
 * ---------------------------------------------------------------------
 * H2 (Liên kết hai chiều) — liên kết từ văn bản của card tới card/node
 * khác. Lưu NGAY TRONG chữ của khối văn bản dưới dạng token
 *     [[card:<id>|Nhãn]]   hoặc   [[node:<id>|Nhãn]]
 * → không đổi schema, xuất/nhập JSON/.t17m giữ nguyên. Nhãn chỉ là bản
 * chụp lúc chèn; khi hiển thị dùng tên HIỆN TẠI của đích (đổi tên card
 * không làm hỏng liên kết), đích đã bị xoá thì hiện là liên kết hỏng.
 * Gõ "@" hoặc "[[" trong ô văn bản để chọn đích (mentionQuery +
 * mentionCandidates). Liên kết ngược = mọi khối văn bản đang trỏ tới
 * một card/node (findBacklinks).
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "./types";
import { normalizeForSearch } from "./search";

export type LinkType = "card" | "node";
export interface LinkRef {
  type: LinkType;
  id: string;
}
export type Segment = { kind: "text"; text: string } | { kind: "link"; type: LinkType; id: string; label: string };

const TOKEN_RE = /\[\[(card|node):([A-Za-z0-9_-]+)(?:\|([^\]\n]*))?\]\]/g;

/** Token liên kết; nhãn bỏ ký tự làm vỡ cú pháp ("]", "|", xuống dòng). */
export function makeLinkToken(type: LinkType, id: string, label: string): string {
  const clean = label.replace(/[\]|\n]+/g, " ").trim();
  return `[[${type}:${id}${clean ? `|${clean}` : ""}]]`;
}

/** Tách chữ thành các đoạn chữ thường và liên kết. */
export function parseSegments(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ kind: "text", text: text.slice(last, at) });
    out.push({ kind: "link", type: m[1] as LinkType, id: m[2]!, label: m[3] ?? "" });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function linksIn(text: string): LinkRef[] {
  return parseSegments(text).flatMap((s) => (s.kind === "link" ? [{ type: s.type, id: s.id }] : []));
}

/** Tên hiện tại của đích liên kết (null nếu đích không còn). */
export function resolveLinkLabel(map: MindMap, type: LinkType, id: string): string | null {
  if (type === "card") {
    const c = map.cards[id];
    return c ? c.title || "(card chưa đặt tên)" : null;
  }
  const n = map.nodes[id];
  return n ? n.text || "(node trống)" : null;
}

/** Chữ thuần (thay token bằng nhãn) — dùng cho trích văn bản trên node,
 *  tìm kiếm, dòng trích trong Thư viện. Có `map` thì dùng tên hiện tại. */
export function plainText(text: string, map?: MindMap): string {
  if (!text.includes("[[")) return text;
  return parseSegments(text)
    .map((s) => (s.kind === "text" ? s.text : (map && resolveLinkLabel(map, s.type, s.id)) || s.label || "liên kết"))
    .join("");
}

/** Đổi id trong mọi token theo bảng ánh xạ (ghép map — MergeMapCommand). */
export function remapLinks(text: string, cardIds: Map<string, string>, nodeIds: Map<string, string>): string {
  if (!text.includes("[[")) return text;
  return text.replace(TOKEN_RE, (whole, type: LinkType, id: string, label?: string) => {
    const next = (type === "card" ? cardIds : nodeIds).get(id);
    return next ? makeLinkToken(type, next, label ?? "") : whole;
  });
}

export interface Backlink {
  cardId: string;
  blockId: string;
  /** Đoạn chữ quanh chỗ nhắc tới (chữ thuần). */
  snippet: string;
}

/** Mọi khối văn bản (trong mọi card) đang liên kết tới `target`. */
export function findBacklinks(map: MindMap, target: LinkRef): Backlink[] {
  const out: Backlink[] = [];
  const needle = `[[${target.type}:${target.id}`;
  for (const card of Object.values(map.cards)) {
    for (const b of card.blocks) {
      if (b.type !== "text" || !b.text.includes(needle)) continue;
      if (!linksIn(b.text).some((l) => l.type === target.type && l.id === target.id)) continue;
      const plain = plainText(b.text, map).replace(/\s+/g, " ").trim();
      out.push({ cardId: card.id, blockId: b.id, snippet: plain.length > 120 ? `${plain.slice(0, 117)}…` : plain });
    }
  }
  return out;
}

/** Liên kết ngược của một node: trỏ thẳng tới node, hoặc tới card node đang gắn. */
export function nodeBacklinks(map: MindMap, nodeId: string): Backlink[] {
  const node = map.nodes[nodeId];
  if (!node) return [];
  const direct = findBacklinks(map, { type: "node", id: nodeId });
  const viaCard = node.cardId ? findBacklinks(map, { type: "card", id: node.cardId }) : [];
  const seen = new Set<string>();
  return [...direct, ...viaCard].filter((b) => {
    const k = `${b.cardId}/${b.blockId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Người dùng đang gõ liên kết? Xét chữ ngay trước con trỏ: "@từ" (sau
 * khoảng trắng/đầu dòng) hoặc "[[chữ có thể có khoảng trắng". Trả về vị
 * trí bắt đầu của "@"/"[[" và chuỗi đang gõ.
 */
export function mentionQuery(beforeCaret: string): { start: number; query: string } | null {
  const bracket = /\[\[([^\]|\n]{0,40})$/.exec(beforeCaret);
  if (bracket) return { start: bracket.index, query: bracket[1]! };
  const at = /(^|\s)@([^\s@]{0,40})$/.exec(beforeCaret);
  if (at) return { start: at.index + at[1]!.length, query: at[2]! };
  return null;
}

export interface MentionCandidate extends LinkRef {
  label: string;
  /** Dòng phụ: "Card" / "Node · cha …". */
  hint: string;
}

/** Card/node khớp chuỗi đang gõ (không phân biệt dấu); khớp đầu tên xếp trước, card trước node. */
export function mentionCandidates(map: MindMap, query: string, limit = 8, excludeCardId: string | null = null): MentionCandidate[] {
  const q = normalizeForSearch(query.trim());
  const scored: { c: MentionCandidate; score: number }[] = [];
  const consider = (c: MentionCandidate, base: number): void => {
    const name = normalizeForSearch(c.label);
    if (q && !name.includes(q)) return;
    scored.push({ c, score: base + (q && name.startsWith(q) ? 0 : 10) });
  };
  for (const card of Object.values(map.cards)) {
    if (card.id === excludeCardId) continue;
    consider({ type: "card", id: card.id, label: card.title || "(card chưa đặt tên)", hint: "Card" }, 0);
  }
  for (const node of Object.values(map.nodes)) {
    const parent = node.parentId ? map.nodes[node.parentId] : null;
    consider({ type: "node", id: node.id, label: node.text || "(node trống)", hint: parent ? `Node · trong "${parent.text}"` : "Node gốc" }, 1);
  }
  return scored
    .sort((a, b) => a.score - b.score || a.c.label.localeCompare(b.c.label, "vi"))
    .slice(0, limit)
    .map((s) => s.c);
}

/**
 * Node đích cho "vẽ đường liên kết từ các nhắc tới": mọi node mà card của
 * `nodeId` nhắc tới (liên kết node trực tiếp, hoặc liên kết card → các
 * node đang gắn card đó), bỏ chính nó và những cặp đã có đường liên kết
 * (bất kể chiều).
 */
export function relationshipTargetsFromLinks(map: MindMap, nodeId: string): string[] {
  const node = map.nodes[nodeId];
  const card = node?.cardId ? map.cards[node.cardId] : undefined;
  if (!card) return [];
  const targets = new Set<string>();
  for (const b of card.blocks) {
    if (b.type !== "text") continue;
    for (const l of linksIn(b.text)) {
      if (l.type === "node" && map.nodes[l.id]) targets.add(l.id);
      if (l.type === "card") for (const n of Object.values(map.nodes)) if (n.cardId === l.id) targets.add(n.id);
    }
  }
  targets.delete(nodeId);
  const linked = (a: string, b: string): boolean =>
    map.relationships.some((r) => (r.fromId === a && r.toId === b) || (r.fromId === b && r.toId === a));
  return [...targets].filter((t) => !linked(nodeId, t));
}
