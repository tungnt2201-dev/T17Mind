<script lang="ts">
  /**
   * ui/components/LibraryPanel.svelte
   * -------------------------------------------------------------------
   * H1 — khung "Thư viện Card" bên phải (bật/tắt từ thanh công cụ):
   * - Liệt kê mọi card của map, tìm theo nội dung (không phân biệt dấu),
   *   lọc Tất cả / Inbox (chưa gắn node nào) / Đang dùng, lọc theo Tag
   *   của các node đang gắn card (core/library.ts#listLibrary).
   * - Kéo một card thả vào canvas → thành node (thả lên node: nhánh con;
   *   vùng trống: nhánh trôi) — AppController.placeCardAt.
   * - Bấm một card để mở rộng: sửa nội dung (CardEditor), xem "đang xuất
   *   hiện ở" những node nào (bấm để nhảy tới), gắn vào node đang chọn,
   *   thêm làm nhánh con, xoá card.
   * - "+ Card nhanh" tạo card mới vào Inbox (AddCardCommand).
   * Trạng thái giao diện (đang mở, ô tìm, bộ lọc) nằm ở libraryStore —
   * không lưu vào map. Mọi thay đổi dữ liệu vẫn qua Command.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore, selectionStore } from "../svelteBridge";
  import { libraryStore, CARD_DRAG_TYPE } from "../uiStores";
  import { showConfirm } from "../dialog";
  import { listLibrary, describeCounts } from "../../core/library";
  import { createCard } from "../../core/cards";
  import { AddCardCommand, AttachCardToNodeCommand, DeleteCardCommand } from "../../core/cardCommands";
  import CardEditor from "./CardEditor.svelte";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;

  const map = mapStore(store);
  const sel = selectionStore(selection);

  $: lib = $libraryStore;
  $: entries = lib.open ? listLibrary($map, { query: lib.query, filter: lib.filter, tagId: lib.tagId }) : [];
  $: total = Object.keys($map.cards).length;
  $: inboxCount = lib.open ? listLibrary($map, { filter: "inbox" }).length : 0;
  $: selectedNode = $sel.primaryId ? $map.nodes[$sel.primaryId] ?? null : null;
  // Card đang mở rộng bị xoá (hoặc hoàn tác việc tạo) → thu lại.
  $: if (lib.expandedCardId && !$map.cards[lib.expandedCardId]) libraryStore.update((s) => ({ ...s, expandedCardId: null }));

  const FILTERS: { v: "all" | "inbox" | "used"; label: string }[] = [
    { v: "all", label: "Tất cả" },
    { v: "inbox", label: "Inbox" },
    { v: "used", label: "Đang dùng" },
  ];

  function patch(p: Partial<typeof lib>): void {
    libraryStore.update((s) => ({ ...s, ...p }));
  }
  function toggle(cardId: string): void {
    patch({ expandedCardId: lib.expandedCardId === cardId ? null : cardId });
  }
  function quickCard(): void {
    const card = createCard("");
    store.dispatch(new AddCardCommand(card));
    patch({ expandedCardId: card.id, filter: lib.filter === "used" ? "all" : lib.filter, query: "" });
  }
  function attachToSelected(cardId: string): void {
    if (selectedNode) store.dispatch(new AttachCardToNodeCommand(selectedNode.id, cardId));
  }
  async function remove(cardId: string, usages: number): Promise<void> {
    const ok = await showConfirm(
      `Xoá hẳn card này${usages > 0 ? ` (đang gắn với ${usages} node)` : ""}? Có thể hoàn tác bằng Ctrl+Z.`,
      "Xoá card"
    );
    if (ok) store.dispatch(new DeleteCardCommand(cardId));
  }
  function onDragStart(e: DragEvent, cardId: string): void {
    e.dataTransfer?.setData(CARD_DRAG_TYPE, cardId);
    e.dataTransfer?.setData("text/plain", $map.cards[cardId]?.title ?? "");
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "link";
  }
  function tagName(id: string): string {
    return $map.tags.find((t) => t.id === id)?.name ?? "?";
  }
  function tagColor(id: string): string {
    return $map.tags.find((t) => t.id === id)?.color ?? "#6b7280";
  }
</script>

{#if lib.open}
  <aside class="library-panel" aria-label="Thư viện card">
    <header class="lib-head">
      <strong>Thư viện card</strong>
      <span class="lib-count">{total}</span>
      <button type="button" class="lib-close" title="Đóng" on:click={() => patch({ open: false })}>×</button>
    </header>

    <input class="lib-search" type="search" placeholder="Tìm trong tên, văn bản, bảng, chú thích ảnh…" value={lib.query}
      on:input={(e) => patch({ query: e.currentTarget.value })} />
    <div class="lib-filters" role="group" aria-label="Lọc card">
      {#each FILTERS as f (f.v)}
        <button type="button" class:active={lib.filter === f.v} on:click={() => patch({ filter: f.v })}>
          {f.label}{#if f.v === "inbox" && inboxCount > 0}<span class="lib-badge">{inboxCount}</span>{/if}
        </button>
      {/each}
      {#if $map.tags.length > 0}
        <select aria-label="Lọc theo Tag" value={lib.tagId ?? ""} on:change={(e) => patch({ tagId: e.currentTarget.value || null })}>
          <option value="">Mọi Tag</option>
          {#each $map.tags as t (t.id)}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
      {/if}
    </div>
    <button type="button" class="btn small-btn lib-quick" on:click={quickCard}>+ Card nhanh (vào Inbox)</button>

    {#if entries.length === 0}
      <p class="lib-empty">
        {#if total === 0}Chưa có card nào. Tạo card ở mục Card của một node, hoặc bấm "+ Card nhanh".
        {:else}Không có card nào khớp.{/if}
      </p>
    {/if}

    <ul class="lib-list">
      {#each entries as e (e.card.id)}
        {@const open = lib.expandedCardId === e.card.id}
        <li class="lib-item" class:open>
          <div class="lib-row" draggable="true" role="button" tabindex="0"
            title="Bấm để xem/sửa · kéo thả vào map để thành node"
            on:dragstart={(ev) => onDragStart(ev, e.card.id)}
            on:click={() => toggle(e.card.id)}
            on:keydown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(e.card.id); } }}>
            <span class="lib-grip" aria-hidden="true">⋮⋮</span>
            <span class="lib-main">
              <span class="lib-title">{e.card.title || "(chưa đặt tên)"}</span>
              <span class="lib-meta">
                {describeCounts(e.counts)} ·
                {#if e.usages.length === 0}<span class="lib-inbox">Inbox</span>{:else}{e.usages.length} node{/if}
              </span>
              {#if e.tagIds.length > 0}
                <span class="lib-tags">
                  {#each e.tagIds as t (t)}<span class="lib-tag" style="color:{tagColor(t)};border-color:{tagColor(t)}">{tagName(t)}</span>{/each}
                </span>
              {/if}
            </span>
          </div>

          {#if open}
            <div class="lib-detail">
              <div class="lib-usages">
                {#if e.usages.length === 0}
                  <span class="muted">Chưa gắn vào node nào.</span>
                {:else}
                  <span class="muted">Đang xuất hiện ở:</span>
                  {#each e.usages as id (id)}
                    <button type="button" class="card-usage-link" on:click={() => controller.revealNode(id)}>{$map.nodes[id]?.text || "(node trống)"}</button>
                  {/each}
                {/if}
              </div>
              <div class="card-add">
                <button type="button" class="btn small-btn" disabled={!selectedNode}
                  title={selectedNode ? `Gắn card vào node "${selectedNode.text}"` : "Chọn một node trên map trước"}
                  on:click={() => attachToSelected(e.card.id)}>Gắn vào node đang chọn</button>
                <button type="button" class="btn small-btn"
                  title="Tạo node con mới mang card này, dưới node đang chọn (hoặc gốc)"
                  on:click={() => controller.addCardAsChildOfSelection(e.card.id)}>Thêm làm nhánh con</button>
                <button type="button" class="btn danger small-btn" on:click={() => remove(e.card.id, e.usages.length)}>Xoá</button>
              </div>
              <CardEditor {store} {controller} cardId={e.card.id} idPrefix="lib-card" />
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  </aside>
{/if}

<style>
  .library-panel {
    position: absolute; top: 12px; right: 294px; width: 300px; max-height: calc(100% - 24px); overflow: auto;
    background: #fff; border: 1px solid var(--border, #e5e7eb); border-radius: 12px; box-shadow: 0 8px 24px rgba(20, 22, 30, 0.1);
    padding: 12px 14px; font-size: 12.5px; z-index: 30; display: flex; flex-direction: column; gap: 8px;
  }
  .lib-head { display: flex; align-items: center; gap: 6px; font-size: 13.5px; }
  .lib-count { background: #f3f4f6; color: #6b7280; border-radius: 9px; padding: 0 7px; font-size: 11px; }
  .lib-close { margin-left: auto; border: none; background: transparent; font-size: 18px; line-height: 1; cursor: pointer; color: #6b7280; }
  .lib-search { width: 100%; box-sizing: border-box; padding: 6px 8px; }
  .lib-filters { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .lib-filters button { border: 1px solid var(--border, #e5e7eb); background: #fff; border-radius: 12px; padding: 2px 10px; cursor: pointer; font-size: 12px; }
  .lib-filters button.active { background: #2f6fed; color: #fff; border-color: #2f6fed; }
  .lib-filters select { margin-left: auto; font-size: 12px; }
  .lib-badge { margin-left: 4px; background: #e0563b; color: #fff; border-radius: 8px; padding: 0 5px; font-size: 10.5px; }
  .lib-quick { width: 100%; }
  .lib-empty { color: #6b7280; margin: 4px 0; }
  .lib-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .lib-item { border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
  .lib-item.open { border-color: #7ea6ff; }
  .lib-row { display: flex; gap: 6px; padding: 7px 8px; cursor: pointer; align-items: flex-start; }
  .lib-row:hover { background: #f8f9fb; }
  .lib-grip { color: #b0b6bf; cursor: grab; font-size: 11px; line-height: 18px; }
  .lib-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .lib-title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .lib-meta { color: #6b7280; font-size: 11.5px; }
  .lib-inbox { color: #e0563b; font-weight: 600; }
  .lib-tags { display: flex; flex-wrap: wrap; gap: 3px; }
  .lib-tag { border: 1px solid; border-radius: 8px; padding: 0 6px; font-size: 10.5px; }
  .lib-detail { border-top: 1px solid #eef0f3; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .lib-usages { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .lib-detail :global(.btn) { width: auto; }
</style>
