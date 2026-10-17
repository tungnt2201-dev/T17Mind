<script lang="ts">
  /**
   * ui/components/ExplorerNodeRow.svelte
   * -------------------------------------------------------------------
   * P2.8 — MỘT dòng trong cây Explorer, TỰ VẼ ĐỆ QUY con của nó (Svelte
   * cho phép 1 component .svelte tự import chính nó — xem cuối file).
   * Nhận `filterVisibleIds` (đã tính SẴN một lần ở ExplorerPanel — mỗi
   * dòng không tự tính lại bộ lọc) — null nghĩa là KHÔNG đang lọc gì.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore, selectionStore } from "../svelteBridge";
  import { explorerStore } from "../uiStores";

  export let nodeId: string;
  export let depth: number;
  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;
  export let filterVisibleIds: Set<string> | null;

  $: map = mapStore(store);
  $: sel = selectionStore(selection);
  $: node = $map.nodes[nodeId];
  $: hasChildren = (node?.children.length ?? 0) > 0;

  // Con nào THỰC SỰ nên vẽ — nếu đang lọc, chỉ những con nằm trong
  // filterVisibleIds (đã bao gồm cả tổ tiên trên đường dẫn của node
  // khớp, xem explorerLogic.ts).
  $: visibleChildIds = (node?.children ?? []).filter((c) => filterVisibleIds === null || filterVisibleIds.has(c));

  // Đang MỞ hay không: đang lọc thì LUÔN mở (đã tự bung để lộ node
  // khớp, không cần quan tâm collapsed/independent lúc này) — không
  // thì theo đúng chế độ đã chọn (đồng bộ canvas / độc lập riêng).
  $: isExpanded = filterVisibleIds !== null
    ? true
    : $explorerStore.syncMode === "sync"
      ? !(node?.collapsed ?? false)
      : $explorerStore.independentExpandedIds.has(nodeId);

  $: isPrimarySelected = $sel.selectedIds.size === 1 && $sel.primaryId === nodeId;

  function toggleExpand(): void {
    if ($explorerStore.syncMode === "sync") {
      controller.toggleNodeCollapsedSimple(nodeId);
    } else {
      const next = new Set($explorerStore.independentExpandedIds);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      explorerStore.update((s) => ({ ...s, independentExpandedIds: next }));
    }
  }
  function selectAndReveal(): void {
    controller.revealNode(nodeId);
  }
</script>

{#if node}
  <div class="explorer-row" style="padding-left:{depth * 16}px" class:selected={isPrimarySelected}>
    {#if hasChildren}
      <button type="button" class="explorer-toggle" on:click|stopPropagation={toggleExpand}>{isExpanded ? "▾" : "▸"}</button>
    {:else}
      <span class="explorer-toggle-spacer"></span>
    {/if}
    <button type="button" class="explorer-label" on:click={selectAndReveal} title={node.text}>
      {#if node.checked !== null}
        <span class="explorer-checkbox">{node.checked ? "☑" : "☐"}</span>
      {/if}
      <span class="explorer-text" class:done={node.checked === true}>{node.text || "(trống)"}</span>
      {#each node.tagIds as tagId (tagId)}
        {@const tag = $map.tags.find((t) => t.id === tagId)}
        {#if tag}
          <span class="explorer-tag-dot" style="background:{tag.color}" title={tag.name}></span>
        {/if}
      {/each}
    </button>
  </div>
  {#if hasChildren && isExpanded}
    {#each visibleChildIds as childId (childId)}
      <svelte:self nodeId={childId} depth={depth + 1} {store} {selection} {controller} {filterVisibleIds} />
    {/each}
  {/if}
{/if}

<style>
  .explorer-row {
    display: flex;
    align-items: center;
    gap: 2px;
    min-height: 24px;
  }
  .explorer-row.selected {
    background: var(--accent-soft);
    border-radius: 4px;
  }
  .explorer-toggle {
    flex: none;
    width: 16px;
    height: 20px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--muted);
    font-size: 10px;
    padding: 0;
  }
  .explorer-toggle-spacer {
    display: inline-block;
    width: 16px;
    flex: none;
  }
  .explorer-label {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 12.5px;
    color: var(--text);
  }
  .explorer-label:hover {
    background: var(--bg);
  }
  .explorer-checkbox {
    flex: none;
    font-size: 12px;
  }
  .explorer-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .explorer-text.done {
    text-decoration: line-through;
    color: var(--muted);
  }
  .explorer-tag-dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }
</style>
