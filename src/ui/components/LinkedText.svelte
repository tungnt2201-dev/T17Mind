<script lang="ts">
  /**
   * ui/components/LinkedText.svelte
   * -------------------------------------------------------------------
   * H2 — hiển thị chữ có liên kết: token [[card:…]] / [[node:…]] thành
   * "viên" bấm được, tên lấy theo đích HIỆN TẠI; rê chuột xem trước nội
   * dung đích; đích đã bị xoá thì hiện gạch ngang (liên kết hỏng).
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import type { MindMap } from "../../core/types";
  import { parseSegments, resolveLinkLabel, type LinkType } from "../../core/links";
  import { cardSnippet, describeCounts, blockCounts } from "../../core/library";

  export let map: MindMap;
  export let text: string;

  const dispatch = createEventDispatcher<{ open: { type: LinkType; id: string; blockId: string | null } }>();

  $: segments = parseSegments(text);

  function preview(type: LinkType, id: string, blockId: string | null): string {
    if (type === "card") {
      const c = map.cards[id];
      if (!c) return "Card này đã bị xoá";
      if (blockId) {
        const b = c.blocks.find((x) => x.id === blockId);
        return b ? "Một khối trong card — bấm để mở đúng khối đó" : "Khối này đã bị xoá khỏi card";
      }
      const snip = cardSnippet(c, 160);
      return `Card · ${describeCounts(blockCounts(c))}${snip ? `\n${snip}` : ""}`;
    }
    const n = map.nodes[id];
    if (!n) return "Node này đã bị xoá";
    const parent = n.parentId ? map.nodes[n.parentId] : null;
    return `Node${parent ? ` trong "${parent.text}"` : ""} — bấm để nhảy tới`;
  }
</script>

{#each segments as s, i (i)}{#if s.kind === "text"}{s.text}{:else}{@const name = resolveLinkLabel(map, s.type, s.id, s.blockId)}<button
  type="button" class="lk" class:lk-node={s.type === "node"} class:lk-broken={!name} title={preview(s.type, s.id, s.blockId)}
  on:click|stopPropagation={() => name && dispatch("open", { type: s.type, id: s.id, blockId: s.blockId })}>{name ?? (s.label || "liên kết hỏng")}</button>{/if}{/each}

<style>
  .lk {
    display: inline; border: none; padding: 0 5px; margin: 0 1px; border-radius: 4px; font: inherit; cursor: pointer;
    background: #eef3fe; color: #2f6fed; font-weight: 600; line-height: inherit;
  }
  .lk:hover { background: #dbe6fd; text-decoration: underline; }
  .lk.lk-node { background: #edf7ef; color: #2f8f46; }
  .lk.lk-node:hover { background: #d9efdd; }
  .lk.lk-broken { background: #f3f4f6; color: #9aa1ab; text-decoration: line-through; cursor: default; }
</style>
