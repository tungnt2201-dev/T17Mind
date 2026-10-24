/**
 * render/cardLayout.ts
 * ---------------------------------------------------------------------
 * Bố cục NỘI DUNG CARD bên trong node (thay cho việc tính rời từng thẻ ở
 * M2/M3). Từ trên xuống: chữ của node → trích văn bản (tối đa 3 dòng) →
 * thẻ ảnh → thẻ bảng → hàng Tag. Hàm THUẦN (đo chữ được tiêm vào qua
 * `wrap`), dùng chung cho đo node, vẽ và dò bấm.
 *
 * Hai chế độ:
 * - "full": hiện trích văn bản / ảnh / bảng như thẻ thu nhỏ.
 * - "compact": node bị kéo nhỏ tới mức không đủ chỗ cho các thẻ → chữ
 *   của node được ưu tiên, nội dung card thu thành HÀNG BIỂU TƯỢNG (văn
 *   bản / bảng / ảnh / biểu đồ, kèm số lượng); bấm biểu tượng mở card.
 * ---------------------------------------------------------------------
 */
import type { Card, ChartBlock, ImageAsset, MindMap, MindNode, TableBlock } from "../core/types";
import { THUMB_PAD, THUMB_ROW_H, thumbLayoutForTable, thumbReservedHeight, type ThumbLayout } from "./tableThumb";
import {
  assetDims,
  fitImageLayout,
  imageThumbLayout,
  IMAGE_THUMB_MIN_HEIGHT,
  type ImageDims,
  type ImageThumbLayout,
} from "./imageThumb";
import type { ImageBlock } from "../core/types";
import { plainText } from "../core/links";

export const PREVIEW_FONT = "11px -apple-system, Segoe UI, sans-serif";
export const PREVIEW_LINE_H = 15;
export const PREVIEW_MAX_LINES = 3;
/** Bề rộng vùng trích văn bản khi node tự động (node rộng ra ít nhất bằng này + đệm). */
export const PREVIEW_W = 200;
export const CHIP_H = 18;
export const CHIP_ICON_W = 22;
export const CHIP_GAP = 4;
/** Khung nội dung hẹp hơn mức này thì chuyển sang hàng biểu tượng. */
const MIN_FULL_WIDTH = 60;

/** KW4 — thẻ biểu đồ thu nhỏ trên node: kích thước cố định (vẽ ở chế độ compact, xem render/chartModel.ts). */
export const CHART_THUMB_W = 220;
export const CHART_THUMB_H = 100;
export const CHART_THUMB_MIN_H = 48;

export type CardContentKind = "text" | "table" | "image" | "chart";

export interface CardContent {
  card: Card;
  /** Văn bản để trích (khối văn bản đầu tiên có chữ), null nếu không có. */
  previewText: string | null;
  previewBlockId: string | null;
  table: TableBlock | null;
  /** Biểu đồ đầu tiên có bảng nguồn còn tồn tại (null nếu không có). */
  chart: { block: ChartBlock; table: TableBlock } | null;
  images: ImageBlock[];
  /** Kích thước gốc của ảnh đầu (null = chưa biết → 4:3). */
  imageDims: ImageDims | null;
  counts: Record<CardContentKind, number>;
  firstBlock: Partial<Record<CardContentKind, string>>;
}

/** Nội dung card của node (null nếu node không có card hoặc card trống). */
export function cardContentOf(
  map: MindMap,
  node: MindNode,
  dimsOf: (assetId: string, asset: ImageAsset | undefined) => ImageDims | null = (_, a) => assetDims(a)
): CardContent | null {
  const card = node.cardId ? map.cards[node.cardId] : undefined;
  if (!card || card.blocks.length === 0) return null;
  const counts: Record<CardContentKind, number> = { text: 0, table: 0, image: 0, chart: 0 };
  const firstBlock: Partial<Record<CardContentKind, string>> = {};
  let previewText: string | null = null;
  let previewBlockId: string | null = null;
  let table: TableBlock | null = null;
  let chart: { block: ChartBlock; table: TableBlock } | null = null;
  const images: ImageBlock[] = [];
  for (const b of card.blocks) {
    if (b.type === "image" && !map.assets[b.assetId]) continue;
    counts[b.type]++;
    firstBlock[b.type] ??= b.id;
    if (b.type === "text" && previewText === null && b.text.trim()) {
      previewText = plainText(b.text, map).trim();
      previewBlockId = b.id;
    } else if (b.type === "table") table ??= b;
    else if (b.type === "image") images.push(b);
    else if (b.type === "chart" && !chart) {
      const src = card.blocks.find((x): x is TableBlock => x.type === "table" && x.id === b.tableBlockId);
      if (src) chart = { block: b, table: src };
    }
  }
  const first = images[0];
  return {
    card,
    previewText,
    previewBlockId,
    table,
    chart,
    images,
    imageDims: first ? dimsOf(first.assetId, map.assets[first.assetId]) : null,
    counts,
    firstBlock,
  };
}

export type Wrap = (text: string, width: number) => string[];

/** Cắt còn tối đa `max` dòng; dòng cuối thêm "…" nếu còn chữ bị ẩn. */
export function previewLines(text: string, width: number, wrap: Wrap, max = PREVIEW_MAX_LINES): string[] {
  const all = wrap(text, width).filter((l, i, arr) => l !== "" || (i > 0 && i < arr.length - 1));
  if (all.length <= max) return all;
  const kept = all.slice(0, max);
  kept[max - 1] = `${kept[max - 1]!.replace(/\s*\S{0,3}$/, "")}…`;
  return kept;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Chip {
  kind: CardContentKind;
  count: number;
  blockId: string;
  rect: Rect;
}
export interface PlacedCard {
  mode: "full" | "compact";
  preview: { lines: string[]; blockId: string; rect: Rect } | null;
  image: { layout: ImageThumbLayout; rect: Rect } | null;
  table: { layout: ThumbLayout; rect: Rect } | null;
  chart: { block: ChartBlock; table: TableBlock; rect: Rect } | null;
  chips: Chip[];
  /** Tổng chiều cao nội dung card chiếm (tính cả đệm) — vùng chữ của node trừ phần này. */
  reserved: number;
}

const res = (h: number): number => (h > 0 ? h + THUMB_PAD : 0);

/** Phần node phải rộng/cao THÊM để chứa nội dung card (dùng khi đo node tự động). */
export function measureCard(c: CardContent, wrap: Wrap, manualWidth: number | null): { width: number; height: number } {
  const innerW = manualWidth != null ? manualWidth - THUMB_PAD * 2 : PREVIEW_W;
  let width = 0;
  let height = 0;
  if (c.previewText) {
    const lines = previewLines(c.previewText, innerW, wrap);
    height += res(lines.length * PREVIEW_LINE_H);
    width = Math.max(width, PREVIEW_W + THUMB_PAD * 2);
  }
  const base = imageThumbLayout(c.images, c.imageDims);
  if (base) {
    const img = manualWidth != null ? fitImageLayout(base, { width: innerW, height: Number.POSITIVE_INFINITY }, false) : base;
    height += res(img.height);
    width = Math.max(width, img.width + THUMB_PAD * 2);
  }
  if (c.table) {
    const t = thumbLayoutForTable(c.table);
    height += thumbReservedHeight(t);
    width = Math.max(width, t.width + THUMB_PAD * 2);
  }
  if (c.chart) {
    height += res(CHART_THUMB_H);
    width = Math.max(width, CHART_THUMB_W + THUMB_PAD * 2);
  }
  if (manualWidth != null) width = 0; // bề rộng do người dùng đặt
  return { width, height };
}

const CHIP_ORDER: CardContentKind[] = ["text", "table", "image", "chart"];

export function chipWidth(count: number): number {
  return count > 1 ? CHIP_ICON_W + 6 * String(count).length + 4 : CHIP_ICON_W;
}

/**
 * Vị trí từng phần nội dung card trong node đã có kích thước. `textHeight`
 * = chiều cao phần chữ của node (đo như lúc đo node), `tagRow` = chiều
 * cao hàng Tag (0 nếu không có).
 */
export function placeCard(
  c: CardContent,
  node: Pick<MindNode, "x" | "y" | "width" | "height" | "manualWidth" | "manualHeight">,
  textHeight: number,
  tagRow: number,
  wrap: Wrap
): PlacedCard {
  const innerW = node.width - THUMB_PAD * 2;
  const bottom = node.y + node.height - tagRow;
  const manual = node.manualWidth != null || node.manualHeight != null;
  const base = imageThumbLayout(c.images, c.imageDims);
  const previewW = node.manualHeight == null ? (node.manualWidth != null ? node.manualWidth - THUMB_PAD * 2 : PREVIEW_W) : innerW;
  const allLines = c.previewText ? previewLines(c.previewText, previewW, wrap) : [];

  // Node kéo cỡ tay theo cả chiều cao: đủ chỗ tối thiểu cho mọi thẻ không?
  const availR = node.height - tagRow - textHeight;
  const minNeed =
    (allLines.length ? res(PREVIEW_LINE_H) : 0) + (base ? res(IMAGE_THUMB_MIN_HEIGHT) : 0) + (c.table ? res(THUMB_ROW_H) : 0) + (c.chart ? res(CHART_THUMB_MIN_H) : 0);
  const compact = node.manualHeight != null && (availR < minNeed + THUMB_PAD || innerW < MIN_FULL_WIDTH);

  if (compact) return placeChips(c, node, bottom);

  // Chiều cao từng phần.
  let lines = allLines;
  let image: ImageThumbLayout | null = base;
  if (node.manualHeight != null) {
    const others = (base ? res(IMAGE_THUMB_MIN_HEIGHT) : 0) + (c.table ? res(THUMB_ROW_H) : 0) + (c.chart ? res(CHART_THUMB_MIN_H) : 0);
    const fit = Math.max(1, Math.floor((availR - others - THUMB_PAD * 2) / PREVIEW_LINE_H));
    lines = allLines.slice(0, fit);
    if (lines.length < allLines.length && lines.length > 0) lines[lines.length - 1] = `${lines[lines.length - 1]!.replace(/…$/, "")}…`;
    if (base) {
      const tableWant = c.table ? thumbReservedHeight(thumbLayoutForTable(c.table)) : 0;
      const boxH = Math.max(IMAGE_THUMB_MIN_HEIGHT, availR - res(lines.length * PREVIEW_LINE_H) - tableWant - THUMB_PAD);
      image = fitImageLayout(base, { width: innerW, height: boxH }, !c.table);
    }
  } else if (base && node.manualWidth != null) {
    image = fitImageLayout(base, { width: innerW, height: Number.POSITIVE_INFINITY }, false);
  }
  const previewRes = res(lines.length * PREVIEW_LINE_H);
  const imageRes = image ? res(image.height) : 0;
  let chartH = c.chart ? CHART_THUMB_H : 0;
  if (c.chart && node.manualHeight != null) {
    const tableMin = c.table ? res(THUMB_ROW_H) : 0;
    chartH = Math.min(CHART_THUMB_H, Math.max(CHART_THUMB_MIN_H, availR - previewRes - imageRes - tableMin - THUMB_PAD));
  }
  const chartRes = c.chart ? res(chartH) : 0;
  const table = c.table
    ? thumbLayoutForTable(
        c.table,
        { width: innerW, height: node.height - textHeight - tagRow - THUMB_PAD - previewRes - imageRes - chartRes },
        !manual
      )
    : null;
  const tableRes = table ? thumbReservedHeight(table) : 0;

  // Xếp từ dưới lên: bảng, ảnh, trích văn bản.
  let y = bottom;
  const out: PlacedCard = { mode: "full", preview: null, image: null, table: null, chips: [], chart: null, reserved: previewRes + imageRes + tableRes + chartRes };
  if (c.chart) {
    y -= chartRes;
    const w = Math.max(60, Math.min(innerW, CHART_THUMB_W));
    out.chart = { block: c.chart.block, table: c.chart.table, rect: { x: node.x + (node.width - w) / 2, y, width: w, height: chartH } };
  }
  if (table) {
    y -= tableRes;
    out.table = { layout: table, rect: { x: node.x + (node.width - table.width) / 2, y, width: table.width, height: table.height } };
  }
  if (image) {
    y -= imageRes;
    out.image = { layout: image, rect: { x: node.x + (node.width - image.width) / 2, y, width: image.width, height: image.height } };
  }
  if (lines.length > 0 && c.previewBlockId) {
    y -= previewRes;
    out.preview = {
      lines,
      blockId: c.previewBlockId,
      rect: { x: node.x + THUMB_PAD, y, width: innerW, height: lines.length * PREVIEW_LINE_H },
    };
  }
  return out;
}

function placeChips(c: CardContent, node: Pick<MindNode, "x" | "width">, bottom: number): PlacedCard {
  const kinds = CHIP_ORDER.filter((k) => c.counts[k] > 0);
  const widths = kinds.map((k) => chipWidth(c.counts[k]));
  const total = widths.reduce((a, b) => a + b, 0) + CHIP_GAP * Math.max(0, kinds.length - 1);
  let x = node.x + Math.max(THUMB_PAD / 2, (node.width - total) / 2);
  const y = bottom - THUMB_PAD / 2 - CHIP_H;
  const chips: Chip[] = kinds.map((kind, i) => {
    const rect = { x, y, width: widths[i]!, height: CHIP_H };
    x += widths[i]! + CHIP_GAP;
    return { kind, count: c.counts[kind], blockId: c.firstBlock[kind]!, rect };
  });
  return { mode: "compact", preview: null, image: null, table: null, chart: null, chips, reserved: CHIP_H + THUMB_PAD };
}

/** Phần nội dung card nằm dưới điểm (world) — dùng cho dò bấm. */
export function hitCardPart(
  p: PlacedCard,
  wx: number,
  wy: number
): { kind: "preview" | "image" | "table" | "chart" | "chip"; blockId: string; chipKind?: CardContentKind } | null {
  const inside = (r: Rect, slack = 2): boolean =>
    wx >= r.x - slack && wx <= r.x + r.width + slack && wy >= r.y - slack && wy <= r.y + r.height + slack;
  for (const chip of p.chips) if (inside(chip.rect)) return { kind: "chip", blockId: chip.blockId, chipKind: chip.kind };
  if (p.chart && inside(p.chart.rect)) return { kind: "chart", blockId: p.chart.block.id };
  if (p.table && inside(p.table.rect)) return { kind: "table", blockId: p.table.layout.table.id };
  if (p.image && inside(p.image.rect, 0)) return { kind: "image", blockId: p.image.layout.block.id };
  if (p.preview && inside(p.preview.rect)) return { kind: "preview", blockId: p.preview.blockId };
  return null;
}
