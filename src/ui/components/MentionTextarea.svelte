<script lang="ts">
  /**
   * ui/components/MentionTextarea.svelte
   * -------------------------------------------------------------------
   * H2 — ô văn bản của card có gợi ý liên kết: gõ "@" hoặc "[[" rồi vài
   * chữ → danh sách card/node khớp (core/links.ts#mentionCandidates);
   * ↑/↓ + Enter/Tab (hoặc bấm) chèn token [[card:…|Tên]] / [[node:…|Tên]].
   * Giống các ô khác của dự án: một chiều — chỉ báo `commit` (giá trị
   * mới) khi rời ô, nơi dùng tự dispatch ReplaceBlockCommand.
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher, onMount } from "svelte";
  import type { MindMap } from "../../core/types";
  import { mentionQuery, mentionCandidates, makeLinkToken, type MentionCandidate } from "../../core/links";
  import CardGlyph from "./CardGlyph.svelte";

  export let map: MindMap;
  export let value: string;
  export let placeholder = "";
  export let rows = 3;
  export let cls = "";
  export let autogrow = false;
  export let autofocus = false;
  /** Card đang sửa — không gợi ý liên kết tới chính nó. */
  export let excludeCardId: string | null = null;

  const dispatch = createEventDispatcher<{ commit: string; blur: void }>();
  let ta: HTMLTextAreaElement;
  let query: { start: number; query: string } | null = null;
  let items: MentionCandidate[] = [];
  let active = 0;

  function fit(): void {
    if (!autogrow || !ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }
  onMount(() => {
    fit();
    if (autofocus) ta.focus();
  });

  function refresh(): void {
    query = mentionQuery(ta.value.slice(0, ta.selectionStart));
    items = query ? mentionCandidates(map, query.query, 8, excludeCardId) : [];
    active = 0;
  }
  function insert(c: MentionCandidate): void {
    if (!query) return;
    const caret = ta.selectionStart;
    const token = makeLinkToken(c.type, c.id, c.label);
    ta.value = `${ta.value.slice(0, query.start)}${token} ${ta.value.slice(caret)}`;
    const pos = query.start + token.length + 1;
    ta.setSelectionRange(pos, pos);
    query = null;
    items = [];
    fit();
  }
  function onKeydown(e: KeyboardEvent): void {
    if (items.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insert(items[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      items = [];
      query = null;
    }
  }
  function onBlur(): void {
    items = [];
    query = null;
    if (ta.value !== value) dispatch("commit", ta.value);
    dispatch("blur");
  }
</script>

<div class="mt-wrap">
  <textarea bind:this={ta} class={cls} {rows} {placeholder} {value}
    on:input={() => { fit(); refresh(); }} on:click={refresh} on:keydown={onKeydown} on:blur={onBlur}></textarea>
  {#if items.length > 0}
    <ul class="mt-pop" role="listbox" aria-label="Liên kết tới">
      {#each items as c, i (c.type + c.id)}
        <li role="option" aria-selected={i === active} class:active={i === active}
          on:mousedown|preventDefault={() => insert(c)} on:mouseenter={() => (active = i)}>
          <span class="mt-ico">{#if c.type === "card"}<CardGlyph kind="text" size={12} />{:else}●{/if}</span>
          <span class="mt-label">{c.label}</span>
          <span class="mt-hint">{c.hint}</span>
        </li>
      {/each}
    </ul>
  {:else if query}
    <div class="mt-pop mt-none">Không có card/node nào khớp "{query.query}"</div>
  {/if}
</div>

<style>
  .mt-wrap { position: relative; }
  .mt-pop {
    position: absolute; left: 0; top: 100%; z-index: 40; min-width: 240px; max-width: 360px; margin: 2px 0 0; padding: 4px;
    list-style: none; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.18);
    font-size: 12.5px;
  }
  .mt-pop li { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 5px; cursor: pointer; }
  .mt-pop li.active { background: #eef3fe; }
  .mt-ico { color: #2f6fed; width: 14px; text-align: center; font-size: 9px; }
  .mt-label { font-weight: 600; color: #1f2933; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .mt-hint { margin-left: auto; color: #9aa1ab; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 45%; }
  .mt-none { color: #9aa1ab; padding: 6px 10px; }
</style>
