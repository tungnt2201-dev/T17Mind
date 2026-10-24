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
  import { toggleInline, toggleLinePrefix, insertCodeBlock, continueList, slashQuery, slashMatches, type Edit, type LineKind, type SlashAction, type SlashItem } from "../../core/richEdit";
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
  /** KW6 — hiện thanh định dạng (đậm/nghiêng/…), bật phím tắt Ctrl+B/I, Enter nối tiếp danh sách và menu "/". */
  export let toolbar = false;

  const dispatch = createEventDispatcher<{ commit: string; blur: void; embed: void }>();
  let slash: { start: number; query: string } | null = null;
  let slashItems: SlashItem[] = [];
  let slashActive = 0;
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
    if (toolbar && !query) {
      slash = slashQuery(ta.value.slice(0, ta.selectionStart));
      slashItems = slash ? slashMatches(slash.query) : [];
      slashActive = 0;
      if (slash && slashItems.length === 0) slash = null;
    } else {
      slash = null;
      slashItems = [];
    }
  }

  /** Ghi một phép sửa vào ô, giữ vùng chọn, rồi LƯU NGAY (mỗi lần định dạng là một bước hoàn tác). */
  function applyEdit(e: Edit, commitNow = true): void {
    ta.value = e.value;
    ta.setSelectionRange(e.start, e.end);
    fit();
    if (commitNow && e.value !== value) dispatch("commit", e.value);
    ta.focus();
  }
  const sel = (): [number, number] => [ta.selectionStart, ta.selectionEnd];
  function inline(mark: string): void {
    applyEdit(toggleInline(ta.value, ...sel(), mark));
  }
  function lines(kind: LineKind): void {
    applyEdit(toggleLinePrefix(ta.value, ...sel(), kind));
  }
  function codeBlock(): void {
    applyEdit(insertCodeBlock(ta.value, ...sel()));
  }
  function runSlash(it: SlashItem): void {
    if (!slash) return;
    const caret = ta.selectionStart;
    const cleaned = ta.value.slice(0, slash.start) + ta.value.slice(caret);
    ta.value = cleaned;
    ta.setSelectionRange(slash.start, slash.start);
    slash = null;
    slashItems = [];
    const act: SlashAction = it.id;
    if (act === "code") applyEdit(insertCodeBlock(ta.value, ta.selectionStart, ta.selectionStart));
    else if (act === "link") {
      const p = ta.selectionStart;
      ta.value = `${ta.value.slice(0, p)}@${ta.value.slice(p)}`;
      ta.setSelectionRange(p + 1, p + 1);
      ta.focus();
      refresh();
    } else if (act === "embed") {
      ta.focus();
      fit();
      if (ta.value !== value) dispatch("commit", ta.value);
      dispatch("embed");
    } else applyEdit(toggleLinePrefix(ta.value, ta.selectionStart, ta.selectionStart, act));
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
    if (toolbar && slashItems.length > 0) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        slashActive = (slashActive + (e.key === "ArrowDown" ? 1 : slashItems.length - 1)) % slashItems.length;
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        runSlash(slashItems[slashActive]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        slash = null;
        slashItems = [];
        return;
      }
    }
    if (toolbar && items.length === 0) {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        inline("**");
        return;
      }
      if (mod && !e.shiftKey && !e.altKey && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        inline("*");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && ta.selectionStart === ta.selectionEnd) {
        const ed = continueList(ta.value, ta.selectionStart);
        if (ed) {
          e.preventDefault();
          applyEdit(ed, false);
          return;
        }
      }
    }
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
  {#if toolbar}
    <div class="mt-bar" role="toolbar" aria-label="Định dạng văn bản">
      <button type="button" title="Đậm (Ctrl+B)" aria-label="Đậm" on:mousedown|preventDefault={() => inline("**")}><b>B</b></button>
      <button type="button" title="Nghiêng (Ctrl+I)" aria-label="Nghiêng" on:mousedown|preventDefault={() => inline("*")}><i>I</i></button>
      <button type="button" title="Gạch ngang" aria-label="Gạch ngang" on:mousedown|preventDefault={() => inline("~~")}><s>S</s></button>
      <button type="button" title="Mã trong dòng" aria-label="Mã" on:mousedown|preventDefault={() => inline("`")}>&lt;/&gt;</button>
      <span class="mt-sep"></span>
      <button type="button" title="Tiêu đề lớn" aria-label="Tiêu đề lớn" on:mousedown|preventDefault={() => lines("h1")}>H1</button>
      <button type="button" title="Tiêu đề vừa" aria-label="Tiêu đề vừa" on:mousedown|preventDefault={() => lines("h2")}>H2</button>
      <span class="mt-sep"></span>
      <button type="button" title="Danh sách" aria-label="Danh sách" on:mousedown|preventDefault={() => lines("bullet")}>•≡</button>
      <button type="button" title="Danh sách số" aria-label="Danh sách số" on:mousedown|preventDefault={() => lines("number")}>1.</button>
      <button type="button" title="Việc cần làm" aria-label="Việc cần làm" on:mousedown|preventDefault={() => lines("check")}>☐</button>
      <button type="button" title="Trích dẫn" aria-label="Trích dẫn" on:mousedown|preventDefault={() => lines("quote")}>❝</button>
      <button type="button" title="Khối mã" aria-label="Khối mã" on:mousedown|preventDefault={codeBlock}>{"{ }"}</button>
      <span class="mt-hintkey">gõ / để chèn khối</span>
    </div>
  {/if}
  <textarea bind:this={ta} class={cls} {rows} {placeholder} {value}
    on:input={() => { fit(); refresh(); }} on:click={refresh} on:keydown={onKeydown} on:blur={onBlur}></textarea>
  {#if slashItems.length > 0}
    <ul class="mt-pop" role="listbox" aria-label="Chèn khối">
      {#each slashItems as it, i (it.id)}
        <li role="option" aria-selected={i === slashActive} class:active={i === slashActive}
          on:mousedown|preventDefault={() => runSlash(it)} on:mouseenter={() => (slashActive = i)}>
          <span class="mt-ico">{it.hint}</span>
          <span class="mt-label">{it.label}</span>
        </li>
      {/each}
    </ul>
  {:else if items.length > 0}
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
  .mt-wrap textarea { width: 100%; box-sizing: border-box; }
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
  .mt-bar { display: flex; align-items: center; gap: 2px; flex-wrap: wrap; padding: 2px 0 4px; }
  .mt-bar button { min-width: 26px; height: 24px; border: 1px solid #e5e7eb; background: #fff; border-radius: 5px; cursor: pointer; font-size: 12px; color: #374151; padding: 0 5px; }
  .mt-bar button:hover { background: #eef3fe; border-color: #c7d7fb; color: #2f6fed; }
  .mt-sep { width: 1px; height: 16px; background: #e5e7eb; margin: 0 3px; }
  .mt-hintkey { margin-left: auto; font-size: 11px; color: #9aa1ab; }
  .mt-none { color: #9aa1ab; padding: 6px 10px; }
</style>
