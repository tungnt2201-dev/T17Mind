<script lang="ts">
  /**
   * ui/components/CardPageModal.svelte
   * -------------------------------------------------------------------
   * Mở một card thành TRANG TÀI LIỆU: tiêu đề lớn, rồi các khối nối tiếp
   * như một trang văn bản — đoạn văn, ảnh (kèm chú thích), bảng — trộn lẫn
   * theo đúng thứ tự trong card. Sửa trực tiếp trên trang: gõ đoạn văn,
   * chú thích ảnh, đổi thứ tự, xoá, chèn đoạn văn ngay dưới một khối, thêm
   * bảng/ảnh/CSV; dán (Ctrl+V) hoặc kéo-thả ảnh vào trang.
   * Mở qua cardPageStore: bấm trích văn bản / biểu tượng đính kèm trên
   * node, menu chuột phải "Mở trang card", nút trong mục Card và Thư viện.
   * Mọi thay đổi vẫn qua Command (hoàn tác được).
   * -------------------------------------------------------------------
   */
  import { onDestroy, tick } from "svelte";
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { cardPageStore, tableEditorStore, showNotice } from "../uiStores";
  import { showAlert } from "../dialog";
  import { imageFilesFrom } from "../imageImport";
  import { parseDelimited, tableFromGrid } from "../../core/table";
  import { generateBlockId } from "../../core/tree";
  import { cardUsages, blockCounts, describeCounts } from "../../core/library";
  import {
    RenameCardCommand,
    AddBlockCommand,
    ReplaceBlockCommand,
    RemoveBlockCommand,
    MoveBlockCommand,
  } from "../../core/cardCommands";
  import { createTextBlock, createTableBlock, summarizeBlock } from "../../core/cards";
  import CardGlyph from "./CardGlyph.svelte";
  import MentionTextarea from "./MentionTextarea.svelte";
  import LinkedText from "./LinkedText.svelte";
  import BacklinksList from "./BacklinksList.svelte";
  import { knowledgeIndex, refreshKnowledgeIndex } from "../knowledgeController";
  import { findBacklinks, makeLinkToken, describeBlock, type LinkType } from "../../core/links";
  import type { Block } from "../../core/types";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);
  let overlayEl: HTMLDivElement | undefined;
  let paperEl: HTMLDivElement | undefined;
  let imageInput: HTMLInputElement | undefined;
  let csvInput: HTMLInputElement | undefined;
  let pendingFocus: string | null = null;
  /** Đoạn văn đang ở chế độ sửa (các đoạn khác hiện chữ có liên kết bấm được). */
  let editingBlock: string | null = null;

  /** KW2 — chép liên kết tới đúng khối này; dán vào đoạn văn ở card khác (Ctrl+V) để tạo liên kết khối. */
  async function copyBlockLink(b: Block): Promise<void> {
    if (!card) return;
    const token = makeLinkToken("card", card.id, `${card.title || "Card"} › ${describeBlock(b)}`, b.id);
    try {
      await navigator.clipboard.writeText(token);
      showNotice("Đã chép liên kết khối — dán vào đoạn văn của card khác");
    } catch {
      void showAlert(`Không chép được vào bộ nhớ tạm. Tự chép đoạn này:\n${token}`);
    }
  }

  function followLink(type: LinkType, id: string, blockId: string | null): void {
    if (type === "card") controller.openCardPage(id, blockId);
    else goTo(id);
  }

  $: target = $cardPageStore;
  $: card = target ? $map.cards[target.cardId] ?? null : null;
  $: if (target && !card) cardPageStore.set(null); // card bị xoá / hoàn tác việc tạo
  $: usages = card ? cardUsages($map, card.id) : [];
  $: backlinks = card ? findBacklinks($map, { type: "card", id: card.id }).filter((b) => b.cardId !== card?.id) : [];
  // KW2 — liên kết ngược từ card ở map khác: lập (hoặc làm tươi) chỉ mục rồi tính lại.
  let indexVersion = 0;
  let indexedFor: string | null = null;
  $: if (card && indexedFor !== card.id) {
    indexedFor = card.id;
    void refreshKnowledgeIndex(() => store.getMap()).then(() => (indexVersion += 1));
  } else if (!card) indexedFor = null;
  $: cross = card ? crossBacklinks(card.id, $map, indexVersion) : [];
  function crossBacklinks(cardId: string, m: typeof $map, _v: number) {
    return knowledgeIndex.backlinksToCard(cardId, new Set(Object.keys(m.cards)));
  }
  $: if (card && target?.focusBlockId) void focusBlock(target.focusBlockId);

  async function focusBlock(id: string): Promise<void> {
    await tick();
    const el = paperEl?.querySelector<HTMLElement>(`[data-block="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ block: "center" });
    el.classList.add("pg-flash");
    setTimeout(() => el.classList.remove("pg-flash"), 1200);
    cardPageStore.update((s) => (s ? { ...s, focusBlockId: null } : s));
  }

  function close(): void {
    // Rời ô đang gõ trước để on:change kịp ghi nội dung vào card.
    (document.activeElement as HTMLElement | null)?.blur?.();
    cardPageStore.set(null);
  }

  async function addTextAt(index: number | null): Promise<void> {
    if (!card) return;
    const block = createTextBlock("");
    store.dispatch(new AddBlockCommand(card.id, block, index));
    pendingFocus = block.id;
    editingBlock = block.id;
    await tick();
    paperEl?.querySelector<HTMLTextAreaElement>(`[data-block="${block.id}"] textarea`)?.focus();
    pendingFocus = null;
  }
  function addTable(): void {
    if (card) store.dispatch(new AddBlockCommand(card.id, createTableBlock(3, 3)));
  }
  function addImages(e: Event): void {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (card && files.length > 0) void controller.addImagesToCard(card.id, files);
  }
  async function importCsv(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !card) return;
    const grid = parseDelimited((await file.text()).replace(/^﻿/, ""));
    if (grid.length === 0) {
      void showAlert("File CSV trống.");
      return;
    }
    store.dispatch(new AddBlockCommand(card.id, tableFromGrid(generateBlockId(), grid, file.name.replace(/\.[^.]+$/, ""))));
  }
  function onPaste(e: ClipboardEvent): void {
    const images = imageFilesFrom(e.clipboardData);
    if (!card || images.length === 0 || (e.clipboardData?.getData("text/plain") ?? "").trim()) return;
    e.preventDefault();
    void controller.addImagesToCard(card.id, images);
  }
  function onDrop(e: DragEvent): void {
    const images = imageFilesFrom(e.dataTransfer);
    if (!card || images.length === 0) return;
    e.preventDefault();
    void controller.addImagesToCard(card.id, images);
  }
  function imageSrc(assetId: string): string {
    const a = $map.assets[assetId];
    return a ? `data:${a.mimeType};base64,${a.dataBase64}` : "";
  }
  function goTo(nodeId: string): void {
    close();
    controller.revealNode(nodeId);
  }

  // Phím bấm trong trang không được lan ra canvas (Delete, Ctrl+Z… của map).
  function onKeydown(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }
  function onWindowKeyCapture(e: KeyboardEvent): void {
    if (!card || (e.target instanceof Node && overlayEl?.contains(e.target))) return;
    e.stopImmediatePropagation();
    onKeydown(e);
  }
  $: if (typeof window !== "undefined") {
    if (card) window.addEventListener("keydown", onWindowKeyCapture, true);
    else window.removeEventListener("keydown", onWindowKeyCapture, true);
  }
  onDestroy(() => window.removeEventListener("keydown", onWindowKeyCapture, true));
</script>

{#if card}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay open pg-overlay" role="presentation" bind:this={overlayEl}
    on:click={(e) => { if (e.target === e.currentTarget) close(); }} on:keydown={onKeydown}>
    <div class="pg-paper" role="dialog" aria-modal="true" aria-label="Trang card" tabindex="-1" bind:this={paperEl}
      on:paste={onPaste} on:dragover|preventDefault on:drop={onDrop}>
      <button type="button" class="pg-close" title="Đóng (Esc)" on:click={close}>×</button>

      <input class="pg-title" type="text" placeholder="Tiêu đề card" value={card.title}
        on:change={(e) => { if (card && e.currentTarget.value !== card.title) store.dispatch(new RenameCardCommand(card.id, e.currentTarget.value)); }} />
      <div class="pg-meta">
        <span>{describeCounts(blockCounts(card))}</span>
        {#if usages.length === 0}
          <span class="pg-inbox">· Inbox (chưa gắn node nào)</span>
        {:else}
          <span>· gắn ở</span>
          {#each usages as id (id)}
            <button type="button" class="card-usage-link" on:click={() => goTo(id)}>{$map.nodes[id]?.text || "(node trống)"}</button>
          {/each}
        {/if}
      </div>
      {#if backlinks.length > 0 || cross.length > 0}
        <div class="pg-backlinks"><BacklinksList map={$map} {backlinks} {cross} {controller} /></div>
      {/if}

      {#if card.blocks.length === 0}
        <p class="pg-empty">Trang trống — thêm đoạn văn, bảng hoặc ảnh ở thanh bên dưới, hoặc dán/kéo-thả ảnh vào đây.</p>
      {/if}

      {#each card.blocks as b, i (b.id)}
        <section class="pg-block" data-block={b.id} class:pg-focus={pendingFocus === b.id}>
          <div class="pg-tools">
            <button type="button" title="Lên" disabled={i === 0} on:click={() => card && store.dispatch(new MoveBlockCommand(card.id, b.id, i - 1))}>↑</button>
            <button type="button" title="Xuống" disabled={i === card.blocks.length - 1}
              on:click={() => card && store.dispatch(new MoveBlockCommand(card.id, b.id, i + 1))}>↓</button>
            <button type="button" title="Chép liên kết tới khối này (dán vào card khác)" on:click={() => void copyBlockLink(b)}>🔗</button>
            <button type="button" title="Chèn đoạn văn ngay dưới" on:click={() => void addTextAt(i + 1)}>＋</button>
            <button type="button" class="danger" title="Xoá khối" on:click={() => card && store.dispatch(new RemoveBlockCommand(card.id, b.id))}>✕</button>
          </div>

          {#if b.type === "text"}
            {#if editingBlock === b.id || !b.text.trim()}
              <MentionTextarea map={$map} cls="pg-text" rows={1} autogrow autofocus={editingBlock === b.id}
                placeholder="Viết gì đó… (gõ @ hoặc [[ để liên kết tới card/node khác)" value={b.text} excludeCardId={card.id}
                on:commit={(e) => card && store.dispatch(new ReplaceBlockCommand(card.id, { ...b, text: e.detail }))}
                on:blur={() => { if (editingBlock === b.id) editingBlock = null; }} />
            {:else}
              <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
              <div class="pg-text pg-text-view" title="Bấm để sửa" on:click={() => (editingBlock = b.id)}>
                <LinkedText map={$map} text={b.text} on:open={(e) => followLink(e.detail.type, e.detail.id, e.detail.blockId)} />
              </div>
            {/if}
          {:else if b.type === "image"}
            <figure class="pg-figure">
              <button type="button" class="pg-img-btn" title="Bấm để xem lớn" on:click={() => card && controller.openCardImages(card.id, b.id)}>
                <img src={imageSrc(b.assetId)} alt={b.caption || "Ảnh"} />
              </button>
              <input class="pg-caption" type="text" placeholder="Chú thích ảnh…" value={b.caption}
                on:change={(e) => { if (card && e.currentTarget.value !== b.caption) store.dispatch(new ReplaceBlockCommand(card.id, { ...b, caption: e.currentTarget.value })); }} />
            </figure>
          {:else if b.type === "table"}
            <div class="pg-table-wrap">
              {#if b.title}<div class="pg-table-title">{b.title}</div>{/if}
              <div class="pg-table-scroll">
                <table class="pg-table">
                  <colgroup>{#each b.colWidths as w}<col style="width:{w}px" />{/each}</colgroup>
                  <tbody>
                    {#each b.cells as row, r}
                      <tr style="height:{b.rowHeights[r]}px">
                        {#each row as cell, c}
                          {#if r === 0 && b.headerRow}
                            <th style="text-align:{b.align[c]}">{cell}</th>
                          {:else}
                            <td style="text-align:{b.align[c]}">{cell}</td>
                          {/if}
                        {/each}
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
              <button type="button" class="btn small-btn pg-edit-table" on:click={() => card && tableEditorStore.set({ cardId: card.id, blockId: b.id })}>
                Sửa bảng…</button>
            </div>
          {:else}
            <p class="pg-empty">{summarizeBlock(b)}</p>
          {/if}
        </section>
      {/each}

      <div class="pg-add">
        <button type="button" on:click={() => void addTextAt(null)}><CardGlyph kind="text" /> Đoạn văn</button>
        <button type="button" on:click={addTable}><CardGlyph kind="table" /> Bảng</button>
        <button type="button" on:click={() => csvInput?.click()}><CardGlyph kind="table" /> Nhập CSV…</button>
        <button type="button" on:click={() => imageInput?.click()}><CardGlyph kind="image" /> Ảnh…</button>
        <input bind:this={imageInput} type="file" accept="image/*" multiple hidden on:change={addImages} />
        <input bind:this={csvInput} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden on:change={importCsv} />
      </div>
    </div>
  </div>
{/if}

<style>
  .pg-overlay { z-index: 1500; align-items: flex-start; overflow-y: auto; padding: 32px 16px; box-sizing: border-box; }
  .pg-paper {
    position: relative; background: #fff; width: min(760px, 100%); margin: 0 auto; border-radius: 6px;
    padding: 44px 56px 28px; box-sizing: border-box; outline: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 12px 40px rgba(15, 23, 42, 0.25);
  }
  .pg-close { position: absolute; top: 10px; right: 14px; border: none; background: transparent; font-size: 24px; color: #9aa1ab; cursor: pointer; }
  .pg-title { width: 100%; border: none; outline: none; font-size: 28px; font-weight: 700; color: #111827; padding: 0; margin-bottom: 6px; font-family: inherit; }
  .pg-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; color: #6b7280; font-size: 12.5px; margin-bottom: 22px; }
  .pg-inbox { color: #e0563b; }
  .pg-empty { color: #9aa1ab; font-style: italic; }
  .pg-block { position: relative; margin: 0 -14px; padding: 4px 14px; border-radius: 6px; transition: background 0.2s; }
  .pg-block:hover, .pg-block:focus-within { background: #fafbfc; }
  .pg-block:global(.pg-flash) { background: #eef3fe; }
  .pg-tools { position: absolute; right: -44px; top: 4px; display: none; flex-direction: column; gap: 2px; }
  .pg-block:hover .pg-tools, .pg-block:focus-within .pg-tools { display: flex; }
  .pg-tools button { width: 26px; height: 24px; border: 1px solid #e5e7eb; background: #fff; border-radius: 5px; cursor: pointer; font-size: 12px; color: #4b5563; padding: 0; }
  .pg-tools button:disabled { opacity: 0.35; cursor: default; }
  .pg-tools button.danger { color: #c0392b; }
  .pg-text {
    width: 100%; border: none; outline: none; resize: none; overflow: hidden; background: transparent; padding: 2px 0;
    font: inherit; font-size: 15px; line-height: 1.7; color: #1f2933; display: block;
  }
  .pg-text-view { white-space: pre-wrap; cursor: text; min-height: 1.7em; }
  .pg-backlinks { margin: -12px 0 18px; }
  .pg-figure { margin: 6px 0; text-align: center; }
  .pg-img-btn { border: none; padding: 0; background: none; cursor: zoom-in; max-width: 100%; }
  .pg-img-btn img { max-width: 100%; max-height: 60vh; border-radius: 4px; display: block; margin: 0 auto; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12); }
  .pg-caption { width: 100%; border: none; outline: none; text-align: center; font-style: italic; color: #6b7280; font-size: 13px; margin-top: 6px; background: transparent; }
  .pg-table-wrap { margin: 8px 0; }
  .pg-table-title { font-weight: 600; font-size: 13px; color: #374151; margin-bottom: 4px; }
  .pg-table-scroll { overflow-x: auto; }
  .pg-table { border-collapse: collapse; font-size: 13.5px; table-layout: fixed; }
  .pg-table th, .pg-table td { border: 1px solid #e5e7eb; padding: 4px 8px; vertical-align: top; white-space: pre-wrap; word-break: break-word; }
  .pg-table th { background: #f3f6fb; font-weight: 600; }
  .pg-edit-table { width: auto; margin-top: 6px; }
  .pg-add { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #e5e7eb; }
  .pg-add button { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #e5e7eb; background: #fff; border-radius: 16px; padding: 4px 12px; cursor: pointer; color: #374151; font-size: 12.5px; }
  .pg-add button:hover { background: #eef3fe; border-color: #c7d7fb; color: #2f6fed; }
  @media (max-width: 860px) {
    .pg-paper { padding: 36px 22px 22px; }
    .pg-tools { right: 4px; top: -26px; flex-direction: row; }
  }
</style>
