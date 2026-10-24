/**
 * render/chartModel.ts
 * ---------------------------------------------------------------------
 * Bộ vẽ biểu đồ KW4 (cột / đường / tròn) — tự viết, không dùng thư viện.
 * `buildChartModel` là hàm THUẦN: nhận số liệu + kích thước, trả về danh
 * sách hình nguyên thủy (hình chữ nhật, đoạn thẳng, đường gấp khúc,
 * hình quạt, hình tròn, chữ). Hai "bộ xuất" dùng chung CÙNG mô hình nên
 * luôn khớp nhau: `chartToSvg` (trình sửa, xuất SVG/Word) và
 * `drawChartOnCanvas` (thẻ thu nhỏ trên node, vẽ bằng canvas).
 * Chế độ `compact` (thẻ trên node): bỏ tiêu đề/chú giải/nhãn trục.
 * ---------------------------------------------------------------------
 */
import type { ChartKind } from "../core/types";
import type { ChartData } from "../core/chartData";
import { formatNumber } from "../core/numberParse";

export const CHART_PALETTE = ["#2f6fed", "#e8590c", "#2b9348", "#9c36b5", "#e8b923", "#0ca5b0", "#d6336c", "#6c757d"] as const;
export const CHART_FONT = "-apple-system, Segoe UI, Roboto, sans-serif";
const INK = "#1f2933";
const MUTED = "#6b7480";
const GRID = "#e3e6ea";

export type Prim =
  | { t: "rect"; x: number; y: number; w: number; h: number; fill: string }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { t: "poly"; pts: [number, number][]; stroke: string; width: number }
  | { t: "dot"; x: number; y: number; r: number; fill: string }
  | { t: "wedge"; cx: number; cy: number; r: number; a0: number; a1: number; fill: string }
  | { t: "text"; x: number; y: number; text: string; size: number; anchor: "start" | "middle" | "end"; fill: string; bold?: boolean };

export interface ChartModel {
  width: number;
  height: number;
  items: Prim[];
  /** Không có số liệu để vẽ → mô hình chỉ có dòng chữ thông báo. */
  empty: boolean;
}

export interface ChartOptions {
  title?: string;
  compact?: boolean;
}

/** Thang chia "đẹp": min/max làm tròn theo bội số của 1/2/5×10^k. */
export function niceScale(lo: number, hi: number, ticks = 4): { min: number; max: number; step: number } {
  if (!(hi > lo)) {
    const base = lo === 0 ? 1 : Math.abs(lo) * 0.1 || 1;
    hi = lo + base;
  }
  const raw = (hi - lo) / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
  return { min: Math.floor(lo / step) * step, max: Math.ceil(hi / step) * step, step };
}

const textW = (s: string, size: number): number => s.length * size * 0.56;
function clip(s: string, maxPx: number, size: number): string {
  const max = Math.max(1, Math.floor(maxPx / (size * 0.56)));
  return s.length <= max ? s : max <= 1 ? s.slice(0, 1) : `${s.slice(0, max - 1)}…`;
}
const color = (i: number): string => CHART_PALETTE[i % CHART_PALETTE.length]!;
const fmt = (v: number): string => formatNumber(v, 2);

export function buildChartModel(data: ChartData, kind: ChartKind, width: number, height: number, opts: ChartOptions = {}): ChartModel {
  const compact = !!opts.compact;
  const items: Prim[] = [];
  const model: ChartModel = { width, height, items, empty: false };
  const hasData = data.series.some((s) => s.values.some((v) => v !== null));
  if (!hasData || data.labels.length === 0) {
    model.empty = true;
    items.push({ t: "text", x: width / 2, y: height / 2, text: "Chưa có số liệu", size: compact ? 10 : 13, anchor: "middle", fill: MUTED });
    return model;
  }
  let top = compact ? 4 : 8;
  if (opts.title && !compact) {
    items.push({ t: "text", x: width / 2, y: 16, text: clip(opts.title, width - 16, 14), size: 14, anchor: "middle", fill: INK, bold: true });
    top = 28;
  }
  if (kind === "pie") buildPie(data, items, width, height, top, compact);
  else buildAxes(data, kind, items, width, height, top, compact);
  return model;
}

function legend(items: Prim[], names: string[], colors: string[], width: number, y: number): void {
  const size = 11;
  const gap = 14;
  const widths = names.map((n) => 12 + textW(n, size) + gap);
  const total = widths.reduce((a, b) => a + b, 0) - gap;
  let x = Math.max(8, (width - total) / 2);
  names.forEach((n, i) => {
    items.push({ t: "rect", x, y: y - 8, w: 9, h: 9, fill: colors[i]! });
    items.push({ t: "text", x: x + 13, y, text: n, size, anchor: "start", fill: INK });
    x += widths[i]!;
  });
}

function buildPie(data: ChartData, items: Prim[], width: number, height: number, top: number, compact: boolean): void {
  const s = data.series[0]!;
  const slices = s.values.map((v, i) => ({ v: v !== null && v > 0 ? v : 0, label: data.labels[i]!, i })).filter((x) => x.v > 0);
  const total = slices.reduce((a, b) => a + b.v, 0);
  if (total <= 0) {
    items.push({ t: "text", x: width / 2, y: height / 2, text: "Chưa có số liệu", size: compact ? 10 : 13, anchor: "middle", fill: MUTED });
    return;
  }
  const legendW = compact ? 0 : Math.min(width * 0.4, Math.max(...slices.map((x) => 14 + textW(`${x.label} ${fmt(x.v)}`, 11))) + 8);
  const areaW = width - legendW;
  const r = Math.max(8, Math.min(areaW - 16, height - top - 8) / 2);
  const cx = areaW / 2 + (compact ? 0 : 4);
  const cy = top + (height - top) / 2;
  let a = -Math.PI / 2;
  for (const sl of slices) {
    const da = (sl.v / total) * Math.PI * 2;
    items.push({ t: "wedge", cx, cy, r, a0: a, a1: slices.length === 1 ? a + Math.PI * 2 - 1e-6 : a + da, fill: color(sl.i) });
    a += da;
  }
  if (!compact) {
    const rowH = 16;
    let y = Math.max(top + 10, cy - (slices.length * rowH) / 2 + 10);
    for (const sl of slices) {
      if (y > height - 4) break;
      items.push({ t: "rect", x: areaW + 8, y: y - 8, w: 9, h: 9, fill: color(sl.i) });
      const pct = Math.round((sl.v / total) * 100);
      items.push({ t: "text", x: areaW + 22, y, text: clip(`${sl.label} · ${pct}%`, legendW - 24, 11), size: 11, anchor: "start", fill: INK });
      y += rowH;
    }
  }
}

function buildAxes(data: ChartData, kind: "bar" | "line", items: Prim[], width: number, height: number, top: number, compact: boolean): void {
  const all = data.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (kind === "bar" || lo > 0) lo = Math.min(0, lo);
  if (kind === "bar" || hi < 0) hi = Math.max(0, hi);
  const sc = niceScale(lo, hi, compact ? 3 : 4);
  const ticks: number[] = [];
  for (let v = sc.min; v <= sc.max + sc.step / 2; v += sc.step) ticks.push(Math.round(v / sc.step) * sc.step);

  const multi = data.series.length > 1;
  const labelSize = 10;
  const yLabelW = compact ? 0 : Math.max(...ticks.map((t) => textW(fmt(t), labelSize))) + 6;
  const left = (compact ? 4 : 8) + yLabelW;
  const right = compact ? 4 : 10;
  const bottomLegend = !compact && multi ? 22 : 0;
  const xLabelH = compact ? 0 : 16;
  const bottom = (compact ? 4 : 6) + xLabelH + bottomLegend;
  const pw = Math.max(10, width - left - right);
  const ph = Math.max(10, height - top - bottom);
  const yOf = (v: number): number => top + ph - ((v - sc.min) / (sc.max - sc.min)) * ph;

  for (const t of ticks) {
    const y = yOf(t);
    items.push({ t: "line", x1: left, y1: y, x2: left + pw, y2: y, stroke: t === 0 ? "#9aa3ad" : GRID, width: 1 });
    if (!compact) items.push({ t: "text", x: left - 5, y: y + 3.5, text: fmt(t), size: labelSize, anchor: "end", fill: MUTED });
  }
  const n = data.labels.length;
  const slot = pw / n;
  const zeroY = yOf(0 < sc.min ? sc.min : 0 > sc.max ? sc.max : 0);

  if (kind === "bar") {
    const k = data.series.length;
    const inner = slot * 0.72;
    const bw = inner / k;
    data.series.forEach((s, si) => {
      s.values.forEach((v, i) => {
        if (v === null) return;
        const x = left + i * slot + (slot - inner) / 2 + si * bw;
        const y = yOf(v);
        items.push({ t: "rect", x, y: Math.min(y, zeroY), w: Math.max(1, bw - (k > 1 ? 1 : 0)), h: Math.max(1, Math.abs(zeroY - y)), fill: color(si) });
      });
    });
  } else {
    data.series.forEach((s, si) => {
      let run: [number, number][] = [];
      const flush = (): void => {
        if (run.length > 1) items.push({ t: "poly", pts: run, stroke: color(si), width: compact ? 1.5 : 2 });
        run = [];
      };
      s.values.forEach((v, i) => {
        if (v === null) return flush();
        run.push([left + i * slot + slot / 2, yOf(v)]);
      });
      flush();
      s.values.forEach((v, i) => {
        if (v !== null) items.push({ t: "dot", x: left + i * slot + slot / 2, y: yOf(v), r: compact ? 2 : 3, fill: color(si) });
      });
    });
  }
  if (!compact) {
    // Nhãn trục X: thưa bớt khi quá chật.
    const every = Math.max(1, Math.ceil(textW("MMMM", labelSize) / slot));
    data.labels.forEach((l, i) => {
      if (i % every !== 0) return;
      items.push({ t: "text", x: left + i * slot + slot / 2, y: top + ph + 13, text: clip(l, slot * every - 2, labelSize), size: labelSize, anchor: "middle", fill: MUTED });
    });
    if (multi) legend(items, data.series.map((s) => clip(s.name, 90, 11)), data.series.map((_, i) => color(i)), width, height - 6);
  }
}

// ---------------------------------------------------------------- SVG

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r2 = (n: number): number => Math.round(n * 100) / 100;

function wedgePath(p: Extract<Prim, { t: "wedge" }>): string {
  const x0 = p.cx + p.r * Math.cos(p.a0);
  const y0 = p.cy + p.r * Math.sin(p.a0);
  const x1 = p.cx + p.r * Math.cos(p.a1);
  const y1 = p.cy + p.r * Math.sin(p.a1);
  const large = p.a1 - p.a0 > Math.PI ? 1 : 0;
  return `M ${r2(p.cx)} ${r2(p.cy)} L ${r2(x0)} ${r2(y0)} A ${r2(p.r)} ${r2(p.r)} 0 ${large} 1 ${r2(x1)} ${r2(y1)} Z`;
}

/** Nội dung bên trong thẻ <svg> (không gồm thẻ ngoài) — để lồng vào SVG khác. */
export function chartSvgBody(m: ChartModel): string {
  return m.items
    .map((p) => {
      switch (p.t) {
        case "rect":
          return `<rect x="${r2(p.x)}" y="${r2(p.y)}" width="${r2(p.w)}" height="${r2(p.h)}" fill="${p.fill}"/>`;
        case "line":
          return `<line x1="${r2(p.x1)}" y1="${r2(p.y1)}" x2="${r2(p.x2)}" y2="${r2(p.y2)}" stroke="${p.stroke}" stroke-width="${p.width}"/>`;
        case "poly":
          return `<polyline points="${p.pts.map(([x, y]) => `${r2(x)},${r2(y)}`).join(" ")}" fill="none" stroke="${p.stroke}" stroke-width="${p.width}" stroke-linejoin="round"/>`;
        case "dot":
          return `<circle cx="${r2(p.x)}" cy="${r2(p.y)}" r="${p.r}" fill="${p.fill}"/>`;
        case "wedge":
          return `<path d="${wedgePath(p)}" fill="${p.fill}" stroke="#ffffff" stroke-width="1"/>`;
        case "text":
          return `<text x="${r2(p.x)}" y="${r2(p.y)}" text-anchor="${p.anchor}" font-size="${p.size}" fill="${p.fill}"${p.bold ? ` font-weight="600"` : ""}>${esc(p.text)}</text>`;
      }
    })
    .join("");
}

export function chartToSvg(m: ChartModel, background = "#ffffff"): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}" font-family="${CHART_FONT}">` +
    `<rect width="${m.width}" height="${m.height}" fill="${background}"/>${chartSvgBody(m)}</svg>`
  );
}

// ---------------------------------------------------------------- Canvas

/** Vẽ mô hình lên canvas, gốc toạ độ dời tới (ox, oy). Không đổi trạng thái ctx sau khi vẽ. */
export function drawChartOnCanvas(ctx: CanvasRenderingContext2D, m: ChartModel, ox: number, oy: number): void {
  ctx.save();
  ctx.textBaseline = "alphabetic";
  for (const p of m.items) {
    switch (p.t) {
      case "rect":
        ctx.fillStyle = p.fill;
        ctx.fillRect(ox + p.x, oy + p.y, p.w, p.h);
        break;
      case "line":
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.width;
        ctx.beginPath();
        ctx.moveTo(ox + p.x1, oy + p.y1);
        ctx.lineTo(ox + p.x2, oy + p.y2);
        ctx.stroke();
        break;
      case "poly":
        ctx.strokeStyle = p.stroke;
        ctx.lineWidth = p.width;
        ctx.lineJoin = "round";
        ctx.beginPath();
        p.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(ox + x, oy + y) : ctx.lineTo(ox + x, oy + y)));
        ctx.stroke();
        break;
      case "dot":
        ctx.fillStyle = p.fill;
        ctx.beginPath();
        ctx.arc(ox + p.x, oy + p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "wedge":
        ctx.fillStyle = p.fill;
        ctx.beginPath();
        ctx.moveTo(ox + p.cx, oy + p.cy);
        ctx.arc(ox + p.cx, oy + p.cy, p.r, p.a0, p.a1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      case "text":
        ctx.fillStyle = p.fill;
        ctx.textAlign = p.anchor === "middle" ? "center" : p.anchor;
        ctx.font = `${p.bold ? "600 " : ""}${p.size}px ${CHART_FONT}`;
        ctx.fillText(p.text, ox + p.x, oy + p.y);
        break;
    }
  }
  ctx.restore();
}
