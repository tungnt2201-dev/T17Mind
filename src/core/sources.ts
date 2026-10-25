/**
 * core/sources.ts
 * ---------------------------------------------------------------------
 * KW3 — nguồn tài liệu PDF và các vùng tô sáng. Phần THUẦN: chuẩn hoá hình chữ nhật theo trang, gộp hình chữ nhật
 * cùng dòng, dựng card từ vùng tô sáng, làm sạch dữ liệu khi đọc file, tra cứu.
 * ---------------------------------------------------------------------
 */
import type { Card, MindMap, PdfHighlight, PdfRect, Source } from "./types";
import { createCard, createImageBlock, createTextBlock } from "./cards";
import { generateId } from "./tree";
import { isHash, sameHash } from "./hash";

export const HIGHLIGHT_COLORS = ["#ffe066", "#8ce99a", "#74c0fc", "#ffa8a8", "#d0bfff"] as const;
/** Cảnh báo khi PDF lớn hơn mức này (byte) vì PDF nằm trong file map. */
export const PDF_WARN_BYTES = 20 * 1024 * 1024;
/** Giới hạn cứng, tránh làm phình map tới mức không lưu được. */
export const PDF_MAX_BYTES = 100 * 1024 * 1024;

export const generateSourceId = (): string => generateId("src");
export const generateHighlightId = (): string => generateId("hl");

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Hình chữ nhật pixel (trong khung trang `page`) → chuẩn hoá 0..1, kẹp vào trong trang; null nếu suy biến. */
export function normalizeRect(r: { left: number; top: number; width: number; height: number }, page: { width: number; height: number }): PdfRect | null {
  if (!(page.width > 0 && page.height > 0)) return null;
  const x = clamp01(r.left / page.width);
  const y = clamp01(r.top / page.height);
  const w = clamp01((r.left + r.width) / page.width) - x;
  const h = clamp01((r.top + r.height) / page.height) - y;
  if (!(w > 0.0005 && h > 0.0005)) return null;
  return { x, y, w, h };
}

/**
 * Gộp các hình chữ nhật của vùng chọn chữ: trình duyệt trả nhiều mảnh cho mỗi dòng (mỗi đoạn chữ một mảnh, có cái
 * trùng nhau). Gộp các mảnh CÙNG DÒNG (chồng dọc nhiều) và sát nhau theo chiều ngang thành một, bỏ mảnh nằm gọn trong mảnh khác.
 */
export function mergeLineRects(rects: PdfRect[]): PdfRect[] {
  // 1) Gom mảnh vào các DÒNG theo mức chồng nhau theo chiều dọc; 2) trong mỗi dòng sắp theo x rồi nối các mảnh sát nhau.
  const lines: PdfRect[][] = [];
  for (const r of [...rects].sort((a, b) => a.y - b.y)) {
    const line = lines.find((ln) => {
      const top = Math.min(...ln.map((q) => q.y));
      const bottom = Math.max(...ln.map((q) => q.y + q.h));
      const h = Math.min(bottom - top, r.h);
      return Math.min(bottom, r.y + r.h) - Math.max(top, r.y) > 0.5 * h;
    });
    if (line) line.push(r);
    else lines.push([r]);
  }
  const out: PdfRect[] = [];
  for (const ln of lines) {
    let cur: PdfRect | null = null;
    for (const r of [...ln].sort((a, b) => a.x - b.x)) {
      if (cur && r.x - (cur.x + cur.w) <= Math.max(cur.h, r.h) * 0.6) {
        const x = Math.min(cur.x, r.x);
        const y = Math.min(cur.y, r.y);
        cur = { x, y, w: Math.max(cur.x + cur.w, r.x + r.w) - x, h: Math.max(cur.y + cur.h, r.y + r.h) - y };
      } else {
        if (cur) out.push(cur);
        cur = { ...r };
      }
    }
    if (cur) out.push(cur);
  }
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Hộp bao của một nhóm hình chữ nhật (để cuộn tới vị trí tô sáng). */
export function boundsOf(rects: PdfRect[]): PdfRect | null {
  if (rects.length === 0) return null;
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

/** Làm gọn chữ trích: gộp xuống dòng/khoảng trắng, nối chữ bị gạch nối cuối dòng. */
export function cleanQuote(raw: string): string {
  return raw
    .replace(/­/g, "")
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Card sinh ra từ một vùng tô sáng chữ: tên = đầu đoạn trích; nội dung = trích dẫn kèm tên nguồn và trang. */
export function cardFromTextHighlight(source: Source, h: PdfHighlight): Card {
  const quote = cleanQuote(h.text);
  const card = createCard(clip(quote, 60) || `${source.name}, tr. ${h.page}`);
  card.blocks = [createTextBlock(`> ${quote}\n\n— *${source.name}*, tr. ${h.page}`)];
  card.source = { sourceId: source.id, highlightId: h.id };
  return card;
}

/** Card sinh ra từ vùng chọn thành ảnh (PDF scan không có lớp chữ). */
export function cardFromAreaHighlight(source: Source, h: PdfHighlight, imageAssetId: string): Card {
  const card = createCard(`${source.name}, tr. ${h.page}`);
  card.blocks = [createImageBlock(imageAssetId, `${source.name}, tr. ${h.page}`), createTextBlock(`— *${source.name}*, tr. ${h.page}`)];
  card.source = { sourceId: source.id, highlightId: h.id };
  return card;
}

export const isLinkedSource = (s: Pick<Source, "assetId">): boolean => s.assetId === null;

/** Trạng thái file của một nguồn: nhúng luôn "ok"; liên kết: "missing" nếu không đọc được, "changed" nếu mã băm khác lúc thêm. */
export type SourceFileState = "ok" | "missing" | "changed";
export function sourceFileState(s: Pick<Source, "assetId" | "sha256">, actual: { found: boolean; sha256?: string }): SourceFileState {
  if (s.assetId !== null) return "ok";
  if (!actual.found) return "missing";
  if (s.sha256 && actual.sha256 && !sameHash(s.sha256, actual.sha256)) return "changed";
  return "ok";
}

export function sourcesOf(map: Pick<MindMap, "sources">): Source[] {
  return Object.values(map.sources ?? {});
}

/** Tra cứu nguồn + vùng tô sáng mà một card trỏ tới (null nếu card không có nguồn hoặc nguồn/vùng đã xoá). */
export function sourceOfCard(map: Pick<MindMap, "sources">, card: Pick<Card, "source">): { source: Source; highlight: PdfHighlight } | null {
  const ref = card.source;
  if (!ref) return null;
  const source = map.sources?.[ref.sourceId];
  const highlight = source?.highlights.find((x) => x.id === ref.highlightId);
  return source && highlight ? { source, highlight } : null;
}

export function highlightsByPage(source: Source): Map<number, PdfHighlight[]> {
  const m = new Map<number, PdfHighlight[]>();
  for (const h of source.highlights) m.set(h.page, [...(m.get(h.page) ?? []), h]);
  return m;
}

/** Dung lượng PDF (byte) theo base64. */
export const base64Bytes = (b64: string): number => Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

// ------------------------------------------------------------ Làm sạch khi đọc file

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Làm sạch `map.sources` và `card.source` tại chỗ: nguồn thiếu dữ liệu PDF bị bỏ, vùng sai hình dạng bị bỏ, tham chiếu mồ côi bị xoá. */
export function sanitizeSources(map: Rec): void {
  const assets = isRec(map.assets) ? map.assets : {};
  const out: Record<string, Source> = {};
  if (isRec(map.sources)) {
    for (const [id, raw] of Object.entries(map.sources)) {
      if (!isRec(raw) || raw.id !== id || raw.kind !== "pdf" || typeof raw.name !== "string") continue;
      // Nhúng: có asset PDF thật. Liên kết: assetId null/thiếu và có đường dẫn.
      const embedded = typeof raw.assetId === "string";
      if (embedded) {
        const asset = assets[raw.assetId as string];
        if (!isRec(asset) || asset.mimeType !== "application/pdf") continue;
      } else if (typeof raw.path !== "string" || raw.path.trim() === "") continue;
      const seen = new Set<string>();
      const highlights: PdfHighlight[] = [];
      for (const hr of Array.isArray(raw.highlights) ? raw.highlights : []) {
        if (!isRec(hr) || typeof hr.id !== "string" || seen.has(hr.id)) continue;
        const page = num(hr.page);
        if (page === null || !Number.isInteger(page) || page < 1) continue;
        if (hr.kind !== "text" && hr.kind !== "area") continue;
        const rects: PdfRect[] = [];
        for (const rr of Array.isArray(hr.rects) ? hr.rects : []) {
          if (!isRec(rr)) continue;
          const [x, y, w, h] = [num(rr.x), num(rr.y), num(rr.w), num(rr.h)];
          if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) continue;
          const cx = clamp01(x);
          const cy = clamp01(y);
          rects.push({ x: cx, y: cy, w: Math.min(w, 1 - cx), h: Math.min(h, 1 - cy) });
        }
        if (rects.length === 0) continue;
        seen.add(hr.id);
        highlights.push({
          id: hr.id,
          page,
          kind: hr.kind,
          rects,
          text: typeof hr.text === "string" ? hr.text : "",
          color: typeof hr.color === "string" && /^#[0-9a-fA-F]{3,8}$/.test(hr.color) ? hr.color : HIGHLIGHT_COLORS[0],
          cardId: typeof hr.cardId === "string" ? hr.cardId : null,
          createdAt: num(hr.createdAt) ?? 0,
        });
      }
      const pages = num(raw.pages);
      const size = num(raw.size);
      out[id] = {
        id,
        kind: "pdf",
        name: raw.name,
        assetId: embedded ? (raw.assetId as string) : null,
        ...(!embedded ? { path: raw.path as string } : {}),
        ...(isHash(raw.sha256) ? { sha256: raw.sha256 } : {}),
        ...(size !== null && size >= 0 ? { size } : {}),
        pages: pages !== null && pages >= 1 ? Math.floor(pages) : 1,
        highlights,
      };
    }
  }
  if (Object.keys(out).length > 0) map.sources = out;
  else delete map.sources;
  const cards = isRec(map.cards) ? map.cards : {};
  for (const c of Object.values(cards)) {
    if (!isRec(c) || !("source" in c)) continue;
    const ref = c.source;
    const ok = isRec(ref) && typeof ref.sourceId === "string" && typeof ref.highlightId === "string" && out[ref.sourceId]?.highlights.some((h) => h.id === ref.highlightId);
    if (!ok) delete c.source;
  }
  // Vùng tô sáng trỏ tới card đã không còn → bỏ liên kết (giữ vùng tô sáng).
  for (const s of Object.values(out)) for (const h of s.highlights) if (h.cardId && !isRec(cards[h.cardId])) h.cardId = null;
}
