<script lang="ts">
  /**
   * ui/components/ChartBlockEditor.svelte
   * -------------------------------------------------------------------
   * KW4 — sửa MỘT khối biểu đồ: xem trước (SVG dựng từ CÙNG mô hình với
   * thẻ trên node và bản xuất), chọn loại (cột/đường/tròn), bảng nguồn,
   * cột nhãn, các cột số liệu, tiêu đề. Mọi thay đổi qua
   * ReplaceBlockCommand (hoàn tác được); input một chiều value+on:change.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import { ReplaceBlockCommand } from "../../core/cardCommands";
  import { chartDataOf, defaultChartColumns } from "../../core/chartData";
  import { buildChartModel, chartToSvg } from "../../render/chartModel";
  import { downloadText, downloadBlob } from "../dom";
  import { svgToPng, CHART_EXPORT_W, CHART_EXPORT_H } from "../../io/chartPng";
  import type { Card, ChartBlock, ChartKind, TableBlock } from "../../core/types";

  export let store: Store;
  export let card: Card;
  export let block: ChartBlock;
  /** Bề rộng xem trước (px). */
  export let width = 420;
  export let height = 240;

  const KIND_LABEL: Record<ChartKind, string> = { bar: "Cột", line: "Đường", pie: "Tròn" };

  $: tables = card.blocks.filter((b): b is TableBlock => b.type === "table");
  $: table = tables.find((t) => t.id === block.tableBlockId) ?? null;
  $: tableName = (t: TableBlock, i: number): string => t.title || `Bảng ${i + 1}`;
  $: svg = table
    ? chartToSvg(buildChartModel(chartDataOf(table, block), block.kind, width, height, { title: block.title }))
    : "";

  function colName(t: TableBlock, c: number): string {
    const head = t.headerRow ? (t.cells[0]?.[c] ?? "").trim() : "";
    return head ? `${c + 1}. ${head}` : `Cột ${c + 1}`;
  }
  function patch(p: Partial<ChartBlock>): void {
    store.dispatch(new ReplaceBlockCommand(card.id, { ...block, ...p }));
  }
  function setTable(id: string): void {
    const t = tables.find((x) => x.id === id);
    if (!t || id === block.tableBlockId) return;
    patch({ tableBlockId: id, ...defaultChartColumns(t) });
  }
  function fileBase(): string {
    return (block.title || card.title || "bieu-do").replace(/[\\/:*?"<>|]+/g, "_").trim() || "bieu-do";
  }
  function exportData() {
    if (!table) return null;
    return buildChartModel(chartDataOf(table, block), block.kind, CHART_EXPORT_W, CHART_EXPORT_H, { title: block.title });
  }
  function saveSvg(): void {
    const m = exportData();
    if (m) downloadText(chartToSvg(m), `${fileBase()}.svg`, "image/svg+xml;charset=utf-8");
  }
  async function savePng(): Promise<void> {
    const m = exportData();
    const png = m ? await svgToPng(chartToSvg(m), m.width, m.height) : null;
    if (png) downloadBlob(png, `${fileBase()}.png`);
  }
  function toggleSeries(c: number, on: boolean): void {
    const set = new Set(block.seriesColumns);
    if (on) set.add(c);
    else set.delete(c);
    if (set.size === 0) return;
    patch({ seriesColumns: [...set].sort((a, b) => a - b) });
  }
</script>

<div class="chart-ed" data-testid="chart-editor">
  {#if table}
    <div class="chart-preview" aria-label="Xem trước biểu đồ">{@html svg}</div>
    <div class="chart-fields">
      <input type="text" placeholder="Tiêu đề biểu đồ…" value={block.title} aria-label="Tiêu đề biểu đồ"
        on:change={(e) => { if (e.currentTarget.value !== block.title) patch({ title: e.currentTarget.value }); }} />
      <div class="chart-row">
        <select value={block.kind} aria-label="Loại biểu đồ" on:change={(e) => patch({ kind: e.currentTarget.value as ChartKind })}>
          {#each Object.entries(KIND_LABEL) as [v, label] (v)}<option value={v}>Biểu đồ {label}</option>{/each}
        </select>
        {#if tables.length > 1}
          <select value={block.tableBlockId} aria-label="Bảng nguồn" on:change={(e) => setTable(e.currentTarget.value)}>
            {#each tables as t, i (t.id)}<option value={t.id}>{tableName(t, i)}</option>{/each}
          </select>
        {/if}
      </div>
      <div class="chart-row">
        <label class="chart-lbl" for="chart-lc-{block.id}">Nhãn</label>
        <select id="chart-lc-{block.id}" value={block.labelColumn} on:change={(e) => patch({ labelColumn: Number(e.currentTarget.value) })}>
          {#each table.align as _, c}<option value={c}>{colName(table, c)}</option>{/each}
        </select>
      </div>
      <div class="chart-row">
        <button type="button" class="btn small-btn" title="Tải biểu đồ dạng SVG (vector)" on:click={saveSvg}>Tải SVG</button>
        <button type="button" class="btn small-btn" title="Tải biểu đồ dạng ảnh PNG" on:click={() => void savePng()}>Tải PNG</button>
      </div>
      <fieldset class="chart-series">
        <legend>{block.kind === "pie" ? "Số liệu (tròn chỉ dùng cột đầu)" : "Số liệu"}</legend>
        {#each table.align as _, c}
          <label><input type="checkbox" checked={block.seriesColumns.includes(c)}
            disabled={block.seriesColumns.length === 1 && block.seriesColumns.includes(c)}
            on:change={(e) => toggleSeries(c, e.currentTarget.checked)} /> {colName(table, c)}</label>
        {/each}
      </fieldset>
    </div>
  {:else}
    <p class="muted">Bảng nguồn của biểu đồ không còn.</p>
  {/if}
</div>

<style>
  .chart-ed { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
  .chart-preview { border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; line-height: 0; max-width: 100%; overflow: auto; }
  .chart-preview :global(svg) { max-width: 100%; height: auto; }
  .chart-fields { display: flex; flex-direction: column; gap: 6px; min-width: 180px; flex: 1; }
  .chart-row { display: flex; gap: 6px; align-items: center; }
  .chart-fields input[type="text"], .chart-fields select {
    border: 1px solid #d8dce2; border-radius: 6px; padding: 4px 8px; font: inherit; font-size: 13px; background: #fff; color: #1f2933; min-width: 0;
  }
  .chart-fields input[type="text"] { width: 100%; box-sizing: border-box; }
  .chart-lbl { font-size: 12px; color: #6b7280; }
  .chart-series { border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 8px; display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; }
  .chart-series legend { font-size: 11.5px; color: #6b7280; padding: 0 4px; }
  .chart-series label { display: flex; gap: 6px; align-items: center; }
</style>
