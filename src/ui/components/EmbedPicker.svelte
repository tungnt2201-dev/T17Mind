<script lang="ts">
  /**
   * ui/components/EmbedPicker.svelte
   * -------------------------------------------------------------------
   * KW6 — hộp chọn nguồn cho khối nhúng: tìm card theo tên, rồi nhúng
   * CẢ CARD hoặc MỘT KHỐI của card đó. Không cho nhúng chính card đang sửa.
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import type { MindMap } from "../../core/types";
  import { describeBlock } from "../../core/links";
  import { normalizeForSearch } from "../../core/search";
  import { cardSnippet } from "../../core/library";

  export let map: MindMap;
  export let excludeCardId: string;

  const dispatch = createEventDispatcher<{ pick: { cardId: string; blockId: string | null }; cancel: void }>();
  let query = "";
  let chosen: string | null = null;

  $: needle = normalizeForSearch(query);
  $: cards = Object.values(map.cards)
    .filter((c) => c.id !== excludeCardId && (needle === "" || normalizeForSearch(`${c.title} ${cardSnippet(c, 200)}`).includes(needle)))
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "vi"))
    .slice(0, 40);
  $: chosenCard = chosen ? map.cards[chosen] ?? null : null;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="ep-overlay" role="presentation" on:click={(e) => { if (e.target === e.currentTarget) dispatch("cancel"); }}
  on:keydown={(e) => { e.stopPropagation(); if (e.key === "Escape") dispatch("cancel"); }}>
  <div class="ep" role="dialog" aria-modal="true" aria-label="Nhúng card hoặc khối">
    {#if !chosenCard}
      <h3>Nhúng card</h3>
      <!-- svelte-ignore a11y_autofocus -->
      <input type="text" placeholder="Tìm card theo tên hoặc nội dung…" value={query} autofocus aria-label="Tìm card"
        on:input={(e) => (query = e.currentTarget.value)} />
      <ul>
        {#each cards as c (c.id)}
          <li><button type="button" on:click={() => (chosen = c.id)}>
            <b>{c.title || "(card chưa đặt tên)"}</b><span>{cardSnippet(c, 70)}</span></button></li>
        {/each}
        {#if cards.length === 0}<li class="ep-none">Không có card nào khớp.</li>{/if}
      </ul>
    {:else}
      <h3>{chosenCard.title || "(card chưa đặt tên)"}</h3>
      <button type="button" class="ep-all" on:click={() => dispatch("pick", { cardId: chosenCard.id, blockId: null })}>Nhúng cả card ({chosenCard.blocks.length} khối)</button>
      <p class="ep-sub">hoặc chọn một khối:</p>
      <ul>
        {#each chosenCard.blocks as b (b.id)}
          <li><button type="button" on:click={() => dispatch("pick", { cardId: chosenCard.id, blockId: b.id })}>{describeBlock(b)}</button></li>
        {/each}
      </ul>
      <button type="button" class="ep-back" on:click={() => (chosen = null)}>← Chọn card khác</button>
    {/if}
    <button type="button" class="ep-close" on:click={() => dispatch("cancel")}>Huỷ</button>
  </div>
</div>

<style>
  .ep-overlay { position: fixed; inset: 0; z-index: 2600; background: rgba(15, 23, 42, 0.35); display: flex; align-items: center; justify-content: center; }
  .ep { background: #fff; border-radius: 10px; width: min(460px, 92vw); max-height: 70vh; overflow: auto; padding: 16px 18px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); display: flex; flex-direction: column; gap: 8px; }
  .ep h3 { margin: 0; font-size: 15px; }
  .ep input[type="text"] { border: 1px solid #d8dce2; border-radius: 6px; padding: 6px 10px; font: inherit; font-size: 13px; }
  .ep ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 40vh; overflow: auto; }
  .ep li button { width: 100%; text-align: left; border: none; background: none; padding: 6px 8px; border-radius: 6px; cursor: pointer; font: inherit; font-size: 13px; display: flex; flex-direction: column; gap: 1px; }
  .ep li button:hover { background: #eef3fe; }
  .ep li span { color: #9aa1ab; font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ep-none { color: #9aa1ab; font-size: 13px; padding: 6px 8px; }
  .ep-all { border: 1px solid #2f6fed; background: #2f6fed; color: #fff; border-radius: 6px; padding: 7px 10px; cursor: pointer; font: inherit; font-size: 13px; }
  .ep-sub { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
  .ep-back, .ep-close { align-self: flex-start; border: none; background: none; color: #2f6fed; cursor: pointer; font: inherit; font-size: 12.5px; padding: 2px 0; }
  .ep-close { color: #6b7280; }
</style>
