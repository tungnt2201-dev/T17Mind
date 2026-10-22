/**
 * core/knowledgeIndex.ts
 * ---------------------------------------------------------------------
 * KW2 — Chỉ mục tri thức toàn Workspace. Hàm THUẦN, không biết gì về
 * giao diện hay nơi lưu:
 *  - buildMapEntries(map): trải một map thành các mục tìm được — node
 *    (chữ + ghi chú), card (tên) và từng khối của card (đoạn văn, bảng,
 *    chú thích ảnh, tên biểu đồ). Khối là mục riêng để kết quả tìm kiếm
 *    nhảy được đúng khối (liên kết khối `[[card:id#blk]]`).
 *  - KnowledgeIndex: giữ mục của nhiều map; tìm không dấu, mọi từ phải có
 *    mặt (tên được ưu tiên hơn nội dung); card/khối dùng chung nhiều map
 *    chỉ hiện MỘT lần kèm danh sách map chứa nó; liên kết ngược xuyên map.
 * Chỉ mục nằm trong bộ nhớ, dựng lại khi mở bảng tìm (KW10 sẽ lưu bền).
 * ---------------------------------------------------------------------
 */
import type { Block, MindMap } from "./types";
import { describeBlock, linksIn, plainText, type LinkRef } from "./links";
import { normalizeForSearch } from "./search";
import { mapDisplayTitle } from "./workspace";

export type EntryKind = "node" | "card" | "block";

export interface IndexEntry {
  kind: EntryKind;
  mapId: string;
  mapTitle: string;
  /** node: id node · card: id card · block: id card (khối nằm trong cardId). */
  id: string;
  cardId: string | null;
  blockId: string | null;
  title: string;
  /** Chữ thuần của nội dung (ghi chú node, nội dung khối) — để hiện trích đoạn. */
  body: string;
  /** Dòng phụ: đường đi trong cây (node) hoặc tên card (khối). */
  context: string;
  /** Liên kết đi ra của khối văn bản (liên kết ngược xuyên map). */
  links: LinkRef[];
  titleN: string;
  bodyN: string;
}

export interface MapIndexData {
  mapId: string;
  title: string;
  /** Mốc cập nhật của map lúc dựng — khác mốc hiện tại thì dựng lại. */
  stamp: number;
  entries: IndexEntry[];
}

const BODY_MAX = 6000;
const CONTEXT_DEPTH = 3;

function clip(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function make(base: Omit<IndexEntry, "titleN" | "bodyN">): IndexEntry {
  return { ...base, titleN: normalizeForSearch(base.title), bodyN: normalizeForSearch(base.body) };
}

/** Chữ tìm được của một khối (đoạn văn, ô bảng, chú thích ảnh, tên biểu đồ). */
export function blockSearchText(map: MindMap, block: Block): string {
  switch (block.type) {
    case "text":
      return plainText(block.text, map);
    case "table":
      return [block.title, ...block.cells.map((row) => row.join(" · "))].filter(Boolean).join("\n");
    case "image":
      return block.caption;
    case "chart":
      return block.title;
  }
}

function nodeContext(map: MindMap, nodeId: string): string {
  const names: string[] = [];
  let cur = map.nodes[nodeId]?.parentId ?? null;
  while (cur && names.length < CONTEXT_DEPTH) {
    const n = map.nodes[cur];
    if (!n) break;
    names.unshift(n.text || "(trống)");
    cur = n.parentId;
  }
  return names.join(" › ");
}

/** Trải một map thành các mục tìm được. */
export function buildMapEntries(map: MindMap): IndexEntry[] {
  const mapId = map.mapId;
  const mapTitle = mapDisplayTitle(map);
  const out: IndexEntry[] = [];
  for (const node of Object.values(map.nodes)) {
    out.push(
      make({
        kind: "node", mapId, mapTitle, id: node.id, cardId: node.cardId, blockId: null,
        title: node.text, body: clip(node.notes ?? "", BODY_MAX), context: nodeContext(map, node.id), links: [],
      }),
    );
  }
  for (const card of Object.values(map.cards)) {
    const title = card.title || "(card chưa đặt tên)";
    out.push(make({ kind: "card", mapId, mapTitle, id: card.id, cardId: card.id, blockId: null, title, body: "", context: "", links: [] }));
    for (const b of card.blocks) {
      const body = blockSearchText(map, b).trim();
      const links = b.type === "text" ? linksIn(b.text) : [];
      if (!body && links.length === 0) continue;
      out.push(
        make({
          kind: "block", mapId, mapTitle, id: card.id, cardId: card.id, blockId: b.id,
          title: describeBlock(b), body: clip(body, BODY_MAX), context: title, links,
        }),
      );
    }
  }
  return out;
}

export function buildMapIndex(map: MindMap, stamp: number): MapIndexData {
  return { mapId: map.mapId, title: mapDisplayTitle(map), stamp, entries: buildMapEntries(map) };
}

// ------------------------------------------------------------- tìm kiếm

export interface HitMap {
  mapId: string;
  mapTitle: string;
}

export interface SearchHit {
  entry: IndexEntry;
  score: number;
  /** Mọi map chứa mục này (card/khối dùng chung nhiều map); node luôn một map. */
  maps: HitMap[];
}

export interface SearchOptions {
  limit?: number;
  kinds?: EntryKind[];
  /** Map đang mở: kết quả ở map này xếp trước, và là map "chủ" của card dùng chung. */
  currentMapId?: string | null;
}

export function queryTokens(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean);
}

/** Điểm của một mục với các từ khoá; null nếu thiếu từ nào đó. Càng nhỏ càng khớp. */
export function scoreEntry(e: IndexEntry, tokens: string[]): number | null {
  if (tokens.length === 0) return null;
  let score = 0;
  for (const t of tokens) {
    const at = e.titleN.indexOf(t);
    if (at >= 0) {
      const wordStart = at === 0 || /[^a-z0-9]/.test(e.titleN[at - 1]!);
      score += at === 0 ? 0 : wordStart ? 1 : 2;
    } else if (e.bodyN.includes(t)) score += 4;
    else return null;
  }
  const joined = tokens.join(" ");
  if (e.titleN === joined) score -= 3; // khớp nguyên tên
  return score + (e.kind === "card" ? 0 : e.kind === "node" ? 0.2 : 0.5);
}

export class KnowledgeIndex {
  private readonly maps = new Map<string, MapIndexData>();

  set(data: MapIndexData): void {
    this.maps.set(data.mapId, data);
  }
  remove(mapId: string): void {
    this.maps.delete(mapId);
  }
  has(mapId: string): boolean {
    return this.maps.has(mapId);
  }
  stampOf(mapId: string): number | null {
    return this.maps.get(mapId)?.stamp ?? null;
  }
  mapIds(): string[] {
    return [...this.maps.keys()];
  }
  clear(): void {
    this.maps.clear();
  }
  get size(): number {
    let n = 0;
    for (const m of this.maps.values()) n += m.entries.length;
    return n;
  }

  /** Bỏ khỏi chỉ mục các map không còn trong danh sách (đã xoá). */
  retain(mapIds: Iterable<string>): void {
    const keep = new Set(mapIds);
    for (const id of [...this.maps.keys()]) if (!keep.has(id)) this.maps.delete(id);
  }

  search(query: string, opts: SearchOptions = {}): SearchHit[] {
    const tokens = queryTokens(query);
    if (tokens.length === 0) return [];
    const limit = opts.limit ?? 50;
    const current = opts.currentMapId ?? null;
    const kinds = opts.kinds ? new Set(opts.kinds) : null;
    // card/khối dùng chung nhiều map: gộp thành một kết quả, liệt kê các map
    const merged = new Map<string, SearchHit>();
    for (const data of this.maps.values()) {
      for (const e of data.entries) {
        if (kinds && !kinds.has(e.kind)) continue;
        const s = scoreEntry(e, tokens);
        if (s === null) continue;
        const key = e.kind === "node" ? `n/${e.mapId}/${e.id}` : `${e.kind}/${e.id}/${e.blockId ?? ""}`;
        const prev = merged.get(key);
        const hitMap = { mapId: e.mapId, mapTitle: e.mapTitle };
        if (!prev) merged.set(key, { entry: e, score: s - (e.mapId === current ? 0.05 : 0), maps: [hitMap] });
        else {
          prev.maps.push(hitMap);
          if (e.mapId === current) merged.set(key, { ...prev, entry: e, score: Math.min(prev.score, s - 0.05) });
        }
      }
    }
    return [...merged.values()]
      .sort((a, b) => a.score - b.score || a.entry.title.localeCompare(b.entry.title, "vi"))
      .slice(0, limit);
  }

  /**
   * Liên kết ngược xuyên map tới một card (kể cả liên kết khối): mọi khối
   * văn bản, ở BẤT KỲ map nào trong chỉ mục, đang trỏ tới card đó. Bỏ các
   * card có trong `excludeCardIds` (thường là card của map đang mở — chúng đã
   * hiện ở danh sách liên kết ngược của map).
   */
  backlinksToCard(cardId: string, excludeCardIds: ReadonlySet<string> = new Set()): CrossBacklink[] {
    const merged = new Map<string, CrossBacklink>();
    for (const data of this.maps.values()) {
      for (const e of data.entries) {
        if (e.kind !== "block" || !e.cardId || e.cardId === cardId || excludeCardIds.has(e.cardId)) continue;
        if (!e.links.some((l) => l.type === "card" && l.id === cardId)) continue;
        const key = `${e.cardId}/${e.blockId}`;
        const prev = merged.get(key);
        if (prev) prev.maps.push({ mapId: e.mapId, mapTitle: e.mapTitle });
        else
          merged.set(key, {
            cardId: e.cardId,
            blockId: e.blockId!,
            cardTitle: e.context,
            snippet: e.body.replace(/\s+/g, " ").trim().slice(0, 120),
            maps: [{ mapId: e.mapId, mapTitle: e.mapTitle }],
          });
      }
    }
    return [...merged.values()];
  }
}

export interface CrossBacklink {
  cardId: string;
  blockId: string;
  cardTitle: string;
  snippet: string;
  maps: HitMap[];
}

// -------------------------------------------------- tô sáng kết quả

export interface TextPart {
  text: string;
  hit: boolean;
}

/** Chuẩn hoá từng ký tự và nhớ vị trí gốc — để tô sáng đúng chỗ dù chuẩn hoá làm đổi độ dài (bỏ dấu). */
function normalizeWithMap(text: string): { norm: string; at: number[] } {
  let norm = "";
  const at: number[] = [];
  let i = 0;
  for (const ch of text) {
    const n = normalizeForSearch(ch);
    for (let k = 0; k < n.length; k++) at.push(i);
    norm += n;
    i += ch.length;
  }
  return { norm, at };
}

/** Tách `text` thành các đoạn, đánh dấu những chỗ khớp từ khoá (không dấu, không phân biệt hoa thường). */
export function highlightParts(text: string, tokens: string[]): TextPart[] {
  if (!text) return [];
  if (tokens.length === 0) return [{ text, hit: false }];
  const { norm, at } = normalizeWithMap(text);
  const hit = new Array<boolean>(text.length).fill(false);
  for (const t of tokens) {
    if (!t) continue;
    for (let from = norm.indexOf(t); from >= 0; from = norm.indexOf(t, from + t.length)) {
      const start = at[from]!;
      const lastNorm = at[from + t.length - 1]!;
      // phủ hết ký tự gốc tương ứng (ký tự có thể dài 2 đơn vị UTF-16)
      let end = lastNorm + 1;
      if (end < text.length && /[\ud800-\udbff]/.test(text[lastNorm]!)) end += 1;
      for (let k = start; k < end && k < text.length; k++) hit[k] = true;
    }
  }
  const parts: TextPart[] = [];
  let buf = "";
  let cur = hit[0]!;
  for (let k = 0; k < text.length; k++) {
    if (hit[k] !== cur) {
      parts.push({ text: buf, hit: cur });
      buf = "";
      cur = hit[k]!;
    }
    buf += text[k];
  }
  parts.push({ text: buf, hit: cur });
  return parts;
}

/** Trích một đoạn quanh chỗ khớp đầu tiên của nội dung (đã bỏ xuống dòng thừa). */
export function bodySnippet(body: string, tokens: string[], max = 110): string {
  const flat = body.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const { norm, at } = normalizeWithMap(flat);
  let first = -1;
  for (const t of tokens) {
    const i = norm.indexOf(t);
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  if (first < 0) return `${flat.slice(0, max - 1).trimEnd()}…`;
  const center = at[first]!;
  const start = Math.max(0, Math.min(center - Math.floor(max / 3), flat.length - max));
  const slice = flat.slice(start, start + max).trim();
  return `${start > 0 ? "…" : ""}${slice}${start + max < flat.length ? "…" : ""}`;
}
