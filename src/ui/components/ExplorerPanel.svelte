<script lang="ts">
  /**
   * ui/components/ExplorerPanel.svelte
   * -------------------------------------------------------------------
   * P2.8 — khung duyệt cây bên trái: lọc theo chữ/Tag (AND/OR), 2 chế
   * độ thu gọn (đồng bộ canvas / độc lập), kéo đổi kích thước, chỉnh
   * độ trong suốt. Toàn bộ trạng thái ở explorerStore (uiStores.ts) —
   * KHÔNG lưu vào map, không có trong lịch sử hoàn tác.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { explorerStore } from "../uiStores";
  import { getRootIds } from "../../core/tree";
  import { computeFilterVisibleIds } from "../explorerLogic";
  import ExplorerNodeRow from "./ExplorerNodeRow.svelte";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;

  $: map = mapStore(store);
  $: rootIds = getRootIds($map);
  $: filterVisibleIds = computeFilterVisibleIds(
    $map,
    $explorerStore.searchText,
    $explorerStore.selectedTagIds,
    $explorerStore.tagFilterMode
  );
  // Khi đang lọc, gốc nào KHÔNG nằm trong tập "nên hiện" thì bỏ hẳn
  // (không vẽ dòng gốc trống trơn không có gì bên dưới).
  $: visibleRootIds = rootIds.filter((id) => filterVisibleIds === null || filterVisibleIds.has(id));

  function toggleTagFilter(tagId: string): void {
    explorerStore.update((s) => {
      const next = new Set(s.selectedTagIds);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return { ...s, selectedTagIds: next };
    });
  }
  function setSyncMode(mode: "sync" | "independent"): void {
    explorerStore.update((s) => {
      if (s.syncMode === mode) return s;
      // Chuyển SANG "độc lập" lần đầu — khởi tạo bằng ĐÚNG trạng thái
      // mở/thu gọn hiện tại trên canvas, để màn hình không đột nhiên
      // trống trơn hay bung hết một cách bất ngờ ngay lúc vừa đổi chế
      // độ. Từ sau đó, 2 chế độ hoàn toàn tách biệt.
      if (mode === "independent") {
        const expanded = new Set<string>();
        for (const id of Object.keys(store.getMap().nodes)) {
          if (!store.getMap().nodes[id]?.collapsed) expanded.add(id);
        }
        return { ...s, syncMode: mode, independentExpandedIds: expanded };
      }
      return { ...s, syncMode: mode };
    });
  }
  function setTagFilterMode(mode: "and" | "or"): void {
    explorerStore.update((s) => ({ ...s, tagFilterMode: mode }));
  }
  function onSearchInput(e: Event): void {
    const value = (e.currentTarget as HTMLInputElement).value;
    explorerStore.update((s) => ({ ...s, searchText: value }));
  }
  function close(): void {
    explorerStore.update((s) => ({ ...s, open: false }));
  }

  // --- Kéo đổi kích thước — thao tác DOM thuần, không phải Svelte
  // reactive (giống cách appController xử lý kéo thả trên canvas). ---
  let resizing = false;
  let resizeStartX = 0;
  let resizeStartWidth = 0;
  function startResize(e: MouseEvent): void {
    resizing = true;
    resizeStartX = e.clientX;
    resizeStartWidth = $explorerStore.width;
    e.preventDefault();
  }
  function onWindowMouseMove(e: MouseEvent): void {
    if (!resizing) return;
    const next = Math.max(200, Math.min(560, resizeStartWidth + (e.clientX - resizeStartX)));
    explorerStore.update((s) => ({ ...s, width: next }));
  }
  function onWindowMouseUp(): void {
    resizing = false;
  }
</script>

<svelte:window on:mousemove={onWindowMouseMove} on:mouseup={onWindowMouseUp} />

{#if $explorerStore.open}
  <div
    id="explorer-panel"
    style="width:{$explorerStore.width}px; opacity:{$explorerStore.opacity / 100}"
  >
    <div class="explorer-header">
      <span class="title">🧭 Explorer</span>
      <button type="button" class="close-btn" on:click={close} title="Đóng Explorer">✕</button>
    </div>

    <div class="explorer-controls">
      <input
        type="text"
        class="explorer-search"
        placeholder="Tìm theo chữ…"
        value={$explorerStore.searchText}
        on:input={onSearchInput}
      />

      <div class="explorer-control-row">
        <span class="explorer-control-label">Thu gọn</span>
        <div class="explorer-seg">
          <button type="button" class:active={$explorerStore.syncMode === "sync"} on:click={() => setSyncMode("sync")}>Đồng bộ</button>
          <button type="button" class:active={$explorerStore.syncMode === "independent"} on:click={() => setSyncMode("independent")}>Độc lập</button>
        </div>
      </div>

      <div class="explorer-control-row">
        <span class="explorer-control-label">Trong suốt</span>
        <input
          type="range"
          min="30"
          max="100"
          value={$explorerStore.opacity}
          on:input={(e) => explorerStore.update((s) => ({ ...s, opacity: Number(e.currentTarget.value) }))}
        />
      </div>
    </div>

    <div class="explorer-tree">
      {#if visibleRootIds.length === 0}
        <p class="explorer-empty">Không có node nào khớp bộ lọc.</p>
      {:else}
        {#each visibleRootIds as rootId (rootId)}
          <ExplorerNodeRow nodeId={rootId} depth={0} {store} {selection} {controller} {filterVisibleIds} />
        {/each}
      {/if}
    </div>

    {#if $map.tags.length > 0}
      <div class="explorer-tag-section">
        <button
          type="button"
          class="section-header"
          on:click={() => explorerStore.update((s) => ({ ...s, tagSectionOpen: !s.tagSectionOpen }))}
        >
          <span class="chevron" class:collapsed={!$explorerStore.tagSectionOpen}>▾</span>
          Lọc theo Tag
          {#if $explorerStore.selectedTagIds.size > 0}
            <span class="tag-filter-count">{$explorerStore.selectedTagIds.size}</span>
          {/if}
        </button>
        {#if $explorerStore.tagSectionOpen}
          <div class="explorer-seg" style="margin-bottom:6px">
            <button type="button" class:active={$explorerStore.tagFilterMode === "or"} on:click={() => setTagFilterMode("or")}>Có 1 trong số</button>
            <button type="button" class:active={$explorerStore.tagFilterMode === "and"} on:click={() => setTagFilterMode("and")}>Có đủ tất cả</button>
          </div>
          <div class="explorer-tag-chips">
            {#each $map.tags as tag (tag.id)}
              <button
                type="button"
                class="explorer-tag-chip"
                class:active={$explorerStore.selectedTagIds.has(tag.id)}
                style="--tag-color:{tag.color}"
                on:click={() => toggleTagFilter(tag.id)}
              >{tag.name}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div
      class="explorer-resize-handle"
      role="slider"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng Explorer"
      aria-valuenow={$explorerStore.width}
      aria-valuemin={200}
      aria-valuemax={560}
      tabindex="0"
      on:mousedown={startResize}
    ></div>
  </div>
{/if}

<style>
  #explorer-panel {
    position: absolute;
    top: 12px;
    left: 12px;
    bottom: 12px;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(20, 22, 30, 0.08);
    display: flex;
    flex-direction: column;
    font-size: 12.5px;
    overflow: hidden;
  }
  .explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    flex: none;
  }
  .explorer-header .title {
    font-weight: 600;
    font-size: 13px;
  }
  .close-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    color: var(--muted);
    padding: 2px 6px;
  }
  .close-btn:hover {
    color: var(--text);
  }
  .explorer-controls {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: none;
  }
  .explorer-search {
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12.5px;
  }
  .explorer-control-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .explorer-control-label {
    flex: none;
    width: 64px;
    font-size: 11.5px;
    color: var(--muted);
  }
  .explorer-seg {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    flex: 1;
  }
  .explorer-seg button {
    flex: 1;
    border: none;
    background: #fff;
    padding: 4px 6px;
    font-size: 11px;
    cursor: pointer;
    color: var(--muted);
  }
  .explorer-seg button.active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .explorer-tag-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .explorer-tag-chip {
    border: 1px solid var(--tag-color, var(--border));
    color: var(--tag-color, var(--muted));
    background: #fff;
    border-radius: 999px;
    padding: 2px 9px;
    font-size: 11px;
    cursor: pointer;
  }
  .explorer-tag-chip.active {
    background: var(--tag-color, var(--accent));
    color: #fff;
  }
  .explorer-tree {
    flex: 1;
    min-height: 80px;
    overflow: auto;
    padding: 6px 8px;
  }
  .explorer-empty {
    color: var(--muted);
    font-size: 12px;
    text-align: center;
    margin-top: 20px;
  }
  .explorer-tag-section {
    flex: none;
    border-top: 1px solid var(--border);
    padding: 8px 12px;
    max-height: 45%;
    overflow-y: auto;
  }
  /* Cùng khuôn mẫu section-header/chevron đã có ở SidePanel.svelte —
   * CSS scoped riêng từng component trong Svelte nên khai báo lại ở
   * đây, không chia sẻ được giữa 2 file .svelte khác nhau. */
  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    padding: 0 0 8px;
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    cursor: pointer;
    text-align: left;
  }
  .section-header .chevron {
    display: inline-block;
    font-size: 10px;
    transition: transform 0.12s ease;
  }
  .section-header .chevron.collapsed {
    transform: rotate(-90deg);
  }
  .tag-filter-count {
    background: var(--accent);
    color: #fff;
    border-radius: 999px;
    font-size: 10px;
    padding: 1px 6px;
    text-transform: none;
    letter-spacing: normal;
  }
  .explorer-resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 100%;
    cursor: ew-resize;
  }
  .explorer-resize-handle:hover {
    background: var(--accent-soft);
  }
</style>
