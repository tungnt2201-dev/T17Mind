<script lang="ts">
  /**
   * ui/components/BacklinksList.svelte
   * -------------------------------------------------------------------
   * H2 — danh sách liên kết ngược ("được nhắc tới ở"): mỗi dòng là card
   * có đoạn văn đang liên kết tới đây, kèm đoạn trích; bấm để mở trang
   * card đó, cuộn tới đúng đoạn văn.
   * -------------------------------------------------------------------
   */
  import type { MindMap } from "../../core/types";
  import type { Backlink } from "../../core/links";
  import type { CrossBacklink } from "../../core/knowledgeIndex";
  import type { AppController } from "../appController";

  export let map: MindMap;
  export let backlinks: Backlink[];
  export let controller: AppController;
  export let title = "Được nhắc tới ở";
  /** KW2 — liên kết ngược từ card ở các map KHÁC trong Workspace. */
  export let cross: CrossBacklink[] = [];

  function openCross(c: CrossBacklink): void {
    void controller.goToKnowledgeTarget({ mapId: c.maps[0]!.mapId, kind: "block", id: c.cardId, cardId: c.cardId, blockId: c.blockId });
  }
</script>

{#if cross.length > 0}
  <div class="bl">
    <div class="bl-title">↩ Được nhắc tới ở map khác ({cross.length})</div>
    {#each cross as c (c.cardId + c.blockId)}
      <button type="button" class="bl-item bl-cross" title="Mở map “{c.maps[0]!.mapTitle}” tại đoạn này" on:click={() => openCross(c)}>
        <span class="bl-card">{c.cardTitle || "(card chưa đặt tên)"} <span class="bl-map">· {c.maps.map((m) => m.mapTitle).join(", ")}</span></span>
        <span class="bl-snip">{c.snippet}</span>
      </button>
    {/each}
  </div>
{/if}

{#if backlinks.length > 0}
  <div class="bl">
    <div class="bl-title">↩ {title} ({backlinks.length})</div>
    {#each backlinks as b (b.cardId + b.blockId)}
      <button type="button" class="bl-item" on:click={() => controller.openCardPage(b.cardId, b.blockId)}>
        <span class="bl-card">{map.cards[b.cardId]?.title || "(card chưa đặt tên)"}</span>
        <span class="bl-snip">{b.snippet}</span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .bl { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
  .bl-title { font-size: 11.5px; font-weight: 600; color: #6b7280; }
  .bl-item {
    display: flex; flex-direction: column; gap: 1px; text-align: left; border: 1px solid #e5e7eb; background: #fff;
    border-left: 3px solid #2f6fed; border-radius: 6px; padding: 5px 8px; cursor: pointer; font: inherit;
  }
  .bl-item:hover { background: #f5f8ff; }
  .bl-cross { border-left-color: #b7791f; }
  .bl-map { font-weight: 400; color: #9aa1ab; }
  .bl-card { font-weight: 600; font-size: 12px; color: #1f2933; }
  .bl-snip { font-size: 11.5px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
