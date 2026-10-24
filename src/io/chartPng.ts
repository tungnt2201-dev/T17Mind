/**
 * io/chartPng.ts
 * ---------------------------------------------------------------------
 * KW4 — vẽ biểu đồ ra ẢNH PNG (cho file Word, nút "Tải PNG"). Chỉ chạy
 * trong trình duyệt/Neutralino (cần canvas + <img>): dựng SVG từ cùng mô
 * hình `buildChartModel`, nạp vào <img>, vẽ lên canvas ×`scale` cho nét.
 * Trả null khi môi trường không vẽ được (test Node) — nơi gọi tự rơi về
 * bảng số liệu.
 * ---------------------------------------------------------------------
 */
import { buildChartModel, chartToSvg } from "../render/chartModel";
import type { DocBlock, DocModel } from "../core/docModel";

export const CHART_EXPORT_W = 640;
export const CHART_EXPORT_H = 360;

type ChartDoc = Extract<DocBlock, { kind: "chart" }>;

export function chartBlockSvg(b: Pick<ChartDoc, "labels" | "series" | "chartKind" | "title">, w = CHART_EXPORT_W, h = CHART_EXPORT_H): string {
  const data = { labels: b.labels, series: b.series.map((s, i) => ({ name: s.name, column: i, values: s.values })) };
  return chartToSvg(buildChartModel(data, b.chartKind, w, h, { title: b.title }));
}

export async function svgToPng(svg: string, width: number, height: number, scale = 2): Promise<Blob | null> {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok();
      img.onerror = () => fail(new Error("Không nạp được SVG"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/png"));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Gắn ảnh PNG vào mọi khối biểu đồ của mô hình tài liệu (trả mô hình mới; khối nào không vẽ được giữ nguyên). */
export async function attachChartPngs(doc: DocModel): Promise<DocModel> {
  const blocks: DocBlock[] = [];
  for (const b of doc.blocks) {
    if (b.kind !== "chart") {
      blocks.push(b);
      continue;
    }
    const png = await svgToPng(chartBlockSvg(b), CHART_EXPORT_W, CHART_EXPORT_H);
    blocks.push(png ? { ...b, png: { dataBase64: await blobToBase64(png), width: CHART_EXPORT_W, height: CHART_EXPORT_H } } : b);
  }
  return { ...doc, blocks };
}
