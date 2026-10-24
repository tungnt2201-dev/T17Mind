<script lang="ts">
  /**
   * ui/components/RichText.svelte
   * -------------------------------------------------------------------
   * KW6 — hiển thị khối văn bản có định dạng (Markdown rút gọn, xem
   * core/richText.ts): tiêu đề, danh sách, danh sách số, việc cần làm
   * (bấm ô tick để đổi), trích dẫn, khối mã, đậm/nghiêng/gạch ngang/mã,
   * và liên kết [[card:…]] / [[node:…]] như LinkedText. Chữ thường không
   * có ký hiệu nào thì hiện y như trước (xuống dòng giữ nguyên).
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import type { MindMap } from "../../core/types";
  import type { LinkType } from "../../core/links";
  import { resolveLinkLabel } from "../../core/links";
  import { parseRich, type Inline } from "../../core/richText";
  import { cardSnippet, describeCounts, blockCounts } from "../../core/library";

  export let map: MindMap;
  export let text: string;
  /** Cho phép bấm ô tick (false = chỉ xem, ví dụ trong khối nhúng). */
  export let interactive = true;

  const dispatch = createEventDispatcher<{ open: { type: LinkType; id: string; blockId: string | null }; toggle: { line: number } }>();
  $: blocks = parseRich(text);

  function preview(type: LinkType, id: string, blockId: string | null): string {
    if (type === "card") {
      const c = map.cards[id];
      if (!c) return "Card này đã bị xoá";
      if (blockId) return c.blocks.some((x) => x.id === blockId) ? "Một khối trong card — bấm để mở đúng khối đó" : "Khối này đã bị xoá khỏi card";
      const snip = cardSnippet(c, 160);
      return `Card · ${describeCounts(blockCounts(c))}${snip ? `\n${snip}` : ""}`;
    }
    const n = map.nodes[id];
    if (!n) return "Node này đã bị xoá";
    const parent = n.parentId ? map.nodes[n.parentId] : null;
    return `Node${parent ? ` trong "${parent.text}"` : ""} — bấm để nhảy tới`;
  }
  const labelOf = (s: Inline): string | null => (s.link ? resolveLinkLabel(map, s.link.type, s.link.id, s.link.blockId) : null);
</script>

{#snippet inl(list: Inline[])}{#each list as s, i (i)}{#if s.link}{@const name = labelOf(s)}<button type="button" class="lk" class:lk-node={s.link.type === "node"} class:lk-broken={!name}
  title={preview(s.link.type, s.link.id, s.link.blockId)} on:click|stopPropagation={() => name && s.link && dispatch("open", { type: s.link.type, id: s.link.id, blockId: s.link.blockId })}>{name ?? (s.link.label || "liên kết hỏng")}</button>{:else if s.code}<code>{s.text}</code>{:else if s.bold || s.italic || s.strike}<span class:b={s.bold} class:i={s.italic} class:st={s.strike}>{s.text}</span>{:else}{s.text}{/if}{/each}{/snippet}

<div class="rt">
  {#each blocks as b (b.line)}
    {#if b.kind === "blank"}
      <div class="rt-gap"></div>
    {:else if b.kind === "heading"}
      <div class="rt-h rt-h{b.level}">{@render inl(b.inline)}</div>
    {:else if b.kind === "quote"}
      <blockquote class="rt-q">{@render inl(b.inline)}</blockquote>
    {:else if b.kind === "bullet"}
      <div class="rt-li" style="padding-left:{b.depth * 18}px"><span class="rt-mark">{b.depth % 2 ? "◦" : "•"}</span><span>{@render inl(b.inline)}</span></div>
    {:else if b.kind === "number"}
      <div class="rt-li" style="padding-left:{b.depth * 18}px"><span class="rt-mark rt-num">{b.n}.</span><span>{@render inl(b.inline)}</span></div>
    {:else if b.kind === "check"}
      <div class="rt-li" style="padding-left:{b.depth * 18}px">
        <input type="checkbox" class="rt-cb" checked={b.checked} disabled={!interactive} aria-label="Việc cần làm"
          on:click|stopPropagation on:change={() => dispatch("toggle", { line: b.line })} />
        <span class:rt-done={b.checked}>{@render inl(b.inline)}</span>
      </div>
    {:else if b.kind === "code"}
      <pre class="rt-code">{b.lines.join("\n")}</pre>
    {:else}
      <div class="rt-p">{@render inl(b.inline)}</div>
    {/if}
  {/each}
</div>

<style>
  .rt { white-space: normal; }
  .rt-p { white-space: pre-wrap; min-height: 1.7em; }
  .rt-gap { height: 0.9em; }
  .rt-h { font-weight: 700; line-height: 1.35; margin: 0.35em 0 0.15em; color: #111827; }
  .rt-h1 { font-size: 1.5em; }
  .rt-h2 { font-size: 1.25em; }
  .rt-h3 { font-size: 1.08em; }
  .rt-q { margin: 0.2em 0; padding: 2px 12px; border-left: 3px solid #cbd5e1; color: #4b5563; }
  .rt-li { display: flex; gap: 8px; align-items: baseline; }
  .rt-mark { width: 1.1em; text-align: center; color: #6b7280; flex-shrink: 0; }
  .rt-num { width: 1.6em; text-align: right; }
  .rt-cb { margin: 0 2px 0 0; flex-shrink: 0; align-self: center; }
  .rt-done { color: #9aa1ab; text-decoration: line-through; }
  .rt-code { margin: 0.3em 0; padding: 8px 10px; background: #f3f4f6; border-radius: 6px; font: 12.5px/1.5 Consolas, "Courier New", monospace; white-space: pre-wrap; overflow-x: auto; }
  code { background: #f3f4f6; border-radius: 4px; padding: 1px 5px; font: 0.9em Consolas, "Courier New", monospace; color: #9c2b2b; }
  .b { font-weight: 700; }
  .i { font-style: italic; }
  .st { text-decoration: line-through; }
  .lk {
    display: inline; border: none; padding: 0 5px; margin: 0 1px; border-radius: 4px; font: inherit; cursor: pointer;
    background: #eef3fe; color: #2f6fed; font-weight: 600; line-height: inherit;
  }
  .lk:hover { background: #dbe6fd; text-decoration: underline; }
  .lk.lk-node { background: #edf7ef; color: #2f8f46; }
  .lk.lk-node:hover { background: #d9efdd; }
  .lk.lk-broken { background: #f3f4f6; color: #9aa1ab; text-decoration: line-through; cursor: default; }
</style>
