<script lang="ts">
  /**
   * ui/components/BlockView.svelte
   * -------------------------------------------------------------------
   * KW6 — hiển thị CHỈ ĐỌC một khối của card (văn bản có định dạng, bảng
   * kèm công thức, ảnh, biểu đồ). Dùng bên trong khối nhúng. Khối nhúng
   * lồng khối nhúng chỉ hiện thẻ giữ chỗ (tránh vòng lặp và nội dung phình to).
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import type { Block, Card, MindMap } from "../../core/types";
  import type { LinkType } from "../../core/links";
  import { displayCells } from "../../core/formula";
  import { chartDataOf } from "../../core/chartData";
  import { buildChartModel, chartToSvg } from "../../render/chartModel";
  import RichText from "./RichText.svelte";

  export let map: MindMap;
  export let card: Card;
  export let block: Block;

  const dispatch = createEventDispatcher<{ open: { type: LinkType; id: string; blockId: string | null } }>();

  $: chartSvg = (() => {
    if (block.type !== "chart") return "";
    const bid = block.tableBlockId;
    const t = card.blocks.find((x) => x.type === "table" && x.id === bid);
    return t && t.type === "table" ? chartToSvg(buildChartModel(chartDataOf(t, block), block.kind, 440, 240, { title: block.title })) : "";
  })();
</script>

{#if block.type === "text"}
  <div class="bv-text"><RichText {map} text={block.text} interactive={false} on:open={(e) => dispatch("open", e.detail)} /></div>
{:else if block.type === "table"}
  <div class="bv-scroll">
    {#if block.title}<div class="bv-title">{block.title}</div>{/if}
    <table class="bv-table"><tbody>
      {#each displayCells(block) as row, r}
        <tr>{#each row as cell, c}{#if r === 0 && block.headerRow}<th style="text-align:{block.align[c]}">{cell}</th>{:else}<td style="text-align:{block.align[c]}">{cell}</td>{/if}{/each}</tr>
      {/each}
    </tbody></table>
  </div>
{:else if block.type === "image"}
  {@const a = map.assets[block.assetId]}
  {#if a}<figure class="bv-fig"><img src={`data:${a.mimeType};base64,${a.dataBase64}`} alt={block.caption || "Ảnh"} />{#if block.caption}<figcaption>{block.caption}</figcaption>{/if}</figure>{/if}
{:else if block.type === "chart"}
  <div class="bv-chart">{@html chartSvg}</div>
{:else}
  <p class="bv-muted">(khối nhúng lồng nhau không hiển thị — mở card nguồn để xem)</p>
{/if}

<style>
  .bv-text { font-size: 14px; line-height: 1.65; color: #1f2933; }
  .bv-scroll { overflow-x: auto; }
  .bv-title { font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 4px; }
  .bv-table { border-collapse: collapse; font-size: 13px; }
  .bv-table th, .bv-table td { border: 1px solid #e5e7eb; padding: 3px 8px; white-space: pre-wrap; }
  .bv-table th { background: #f3f6fb; font-weight: 600; }
  .bv-fig { margin: 4px 0; text-align: center; }
  .bv-fig img { max-width: 100%; max-height: 40vh; border-radius: 4px; }
  .bv-fig figcaption { font-size: 12px; color: #6b7280; font-style: italic; }
  .bv-chart { line-height: 0; } .bv-chart :global(svg) { max-width: 100%; height: auto; }
  .bv-muted { color: #9aa1ab; font-style: italic; font-size: 12.5px; }
</style>
