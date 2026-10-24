<script lang="ts">
  /**
   * ui/components/EmbedBlockView.svelte
   * -------------------------------------------------------------------
   * KW6 — khung hiển thị một KHỐI NHÚNG: nội dung hiện tại của card (hoặc
   * một khối của card) được nhúng, kèm tên nguồn và nút mở card nguồn.
   * Nguồn bị xoá → thông báo thay vì lỗi.
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import type { EmbedBlock, MindMap } from "../../core/types";
  import type { LinkType } from "../../core/links";
  import BlockView from "./BlockView.svelte";

  export let map: MindMap;
  export let block: EmbedBlock;

  const dispatch = createEventDispatcher<{ open: { type: LinkType; id: string; blockId: string | null } }>();

  $: source = map.cards[block.cardId] ?? null;
  $: shown = source ? (block.blockId ? source.blocks.filter((b) => b.id === block.blockId) : source.blocks) : [];
  $: missing = !source || (block.blockId !== null && shown.length === 0);
</script>

<div class="eb" class:eb-missing={missing}>
  <div class="eb-head">
    <span class="eb-mark">▣ Nhúng</span>
    {#if source}
      <span class="eb-name">{source.title || "(card chưa đặt tên)"}</span>
      <button type="button" class="eb-open" title="Mở card nguồn" on:click={() => dispatch("open", { type: "card", id: source.id, blockId: block.blockId })}>Mở nguồn ↗</button>
    {:else}
      <span class="eb-name">card nguồn</span>
    {/if}
  </div>
  {#if missing}
    <p class="eb-gone">{source ? "Khối được nhúng đã bị xoá khỏi card nguồn." : "Card nguồn đã bị xoá."} Bạn có thể gỡ khối nhúng này.</p>
  {:else if source}
    {#if shown.length === 0}
      <p class="eb-gone">Card nguồn đang trống.</p>
    {/if}
    {#each shown as b (b.id)}
      <div class="eb-item"><BlockView {map} card={source} block={b} on:open /></div>
    {/each}
  {/if}
</div>

<style>
  .eb { border: 1px solid #dbe3f3; border-left: 4px solid #2f6fed; border-radius: 6px; background: #f8faff; padding: 8px 12px; }
  .eb-missing { border-color: #f1c0b8; border-left-color: #e0563b; background: #fff7f5; }
  .eb-head { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
  .eb-mark { color: #2f6fed; font-weight: 600; }
  .eb-name { font-weight: 600; color: #1f2933; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .eb-open { margin-left: auto; border: none; background: none; color: #2f6fed; cursor: pointer; font: inherit; }
  .eb-open:hover { text-decoration: underline; }
  .eb-item + .eb-item { margin-top: 8px; }
  .eb-gone { margin: 0; font-size: 13px; color: #9a4a3b; }
</style>
