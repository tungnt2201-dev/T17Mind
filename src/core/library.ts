/**
 * core/library.ts
 * ---------------------------------------------------------------------
 * H1 (Thư viện Card) — hàm THUẦN cho khung Thư viện: card đang gắn ở
 * những node nào, tìm card theo nội dung (không phân biệt dấu), lọc
 * Tất cả / Inbox (chưa gắn node nào) / Đang dùng, lọc theo Tag của các
 * node đang gắn card. Thay đổi dữ liệu vẫn qua Command (cardCommands.ts).
 * ---------------------------------------------------------------------
 */
import type { Card, MindMap } from "./types";
import { normalizeForSearch } from "./search";

export type LibraryFilter = "all" | "inbox" | "used";

export interface LibraryEntry {
  card: Card;
  /** Id các node đang gắn card này (thứ tự ổn định theo map.nodes). */
  usages: string[];
  /** Hợp các Tag của những node đang gắn card. */
  tagIds: string[];
  counts: { text: number; table: number; image: number; chart: number };
}

/** Id các node đang gắn card `cardId`. */
export function cardUsages(map: MindMap, cardId: string): string[] {
  return Object.values(map.nodes)
    .filter((n) => n.cardId === cardId)
    .map((n) => n.id);
}

/** Toàn bộ chữ của card dùng để tìm: tên, khối văn bản, ô bảng, chú thích ảnh, tên bảng/biểu đồ. */
export function cardSearchText(card: Card): string {
  const parts: string[] = [card.title];
  for (const b of card.blocks) {
    if (b.type === "text") parts.push(b.text);
    else if (b.type === "table") parts.push(b.title, ...b.cells.flat());
    else if (b.type === "image") parts.push(b.caption);
    else if (b.type === "chart") parts.push(b.title);
  }
  return parts.join(" ");
}

export function blockCounts(card: Card): LibraryEntry["counts"] {
  const counts = { text: 0, table: 0, image: 0, chart: 0 };
  for (const b of card.blocks) counts[b.type]++;
  return counts;
}

/** Mô tả ngắn số khối của card, ví dụ "2 văn bản · 1 bảng". */
export function describeCounts(c: LibraryEntry["counts"]): string {
  const parts: string[] = [];
  if (c.text) parts.push(`${c.text} văn bản`);
  if (c.table) parts.push(`${c.table} bảng`);
  if (c.image) parts.push(`${c.image} ảnh`);
  if (c.chart) parts.push(`${c.chart} biểu đồ`);
  return parts.length > 0 ? parts.join(" · ") : "trống";
}

/**
 * Danh sách card cho khung Thư viện, đã tìm/lọc. Sắp xếp theo tên (card
 * chưa đặt tên xuống cuối). `query` khớp khi MỌI từ đều có trong nội
 * dung card. `tagId` = null: không lọc Tag; khác null: chỉ card có ít
 * nhất một node đang gắn mang Tag đó (card Inbox không có Tag nên bị
 * loại).
 */
export function listLibrary(
  map: MindMap,
  opts: { query?: string; filter?: LibraryFilter; tagId?: string | null } = {}
): LibraryEntry[] {
  const usageByCard = new Map<string, string[]>();
  const tagsByCard = new Map<string, Set<string>>();
  for (const n of Object.values(map.nodes)) {
    if (!n.cardId) continue;
    (usageByCard.get(n.cardId) ?? usageByCard.set(n.cardId, []).get(n.cardId)!).push(n.id);
    const tags = tagsByCard.get(n.cardId) ?? tagsByCard.set(n.cardId, new Set()).get(n.cardId)!;
    for (const t of n.tagIds) tags.add(t);
  }
  const words = normalizeForSearch(opts.query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const filter = opts.filter ?? "all";

  const entries: LibraryEntry[] = [];
  for (const card of Object.values(map.cards)) {
    const usages = usageByCard.get(card.id) ?? [];
    if (filter === "inbox" && usages.length > 0) continue;
    if (filter === "used" && usages.length === 0) continue;
    const tagIds = [...(tagsByCard.get(card.id) ?? [])];
    if (opts.tagId && !tagIds.includes(opts.tagId)) continue;
    if (words.length > 0) {
      const hay = normalizeForSearch(cardSearchText(card));
      if (!words.every((w) => hay.includes(w))) continue;
    }
    entries.push({ card, usages, tagIds, counts: blockCounts(card) });
  }
  return entries.sort((a, b) => {
    if (!a.card.title !== !b.card.title) return a.card.title ? -1 : 1;
    return a.card.title.localeCompare(b.card.title, "vi");
  });
}

/** Dòng trích ngắn của card (đoạn văn bản đầu tiên có chữ, gộp thành một
 *  dòng, tối đa `max` ký tự) — hiện trên thẻ card trong Thư viện. */
export function cardSnippet(card: Card, max = 90): string {
  const text = card.blocks.find((b) => b.type === "text" && b.text.trim());
  if (!text || text.type !== "text") return "";
  const one = text.text.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

/** Màu nhấn ổn định cho mỗi card (dải màu bên trái thẻ) — băm id ra sắc
 *  độ, để các card khác nhau dễ phân biệt khi xem lướt. */
export function cardAccentHue(cardId: string): number {
  let h = 0;
  for (let i = 0; i < cardId.length; i++) h = (h * 31 + cardId.charCodeAt(i)) >>> 0;
  return h % 360;
}
