<script lang="ts">
  /**
   * ui/components/MapsModal.svelte
   * -------------------------------------------------------------------
   * P2.6d — "Map gần đây": liệt kê mọi map đã lưu trong localStorage
   * (đọc qua io/storage.ts, KHÔNG qua svelteBridge — dữ liệu này không
   * thuộc map ĐANG MỞ, mà là danh sách MỌI map khác nhau, nên không
   * hợp để bọc qua Store một-chiều như các component khác).
   *
   * Đọc lại danh sách MỖI LẦN modal mở (không tự động theo dõi thay
   * đổi liên tục) — đủ dùng vì đây không phải dữ liệu đổi liên tục
   * ngoài ý muốn người dùng, và tránh việc phải tự chế một cơ chế
   * "lắng nghe localStorage" phức tạp không cần thiết cho tính năng
   * này.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { mapsModalOpenStore } from "../uiStores";
  import { listMaps, renameMap, deleteMap, type MapIndexEntry } from "../../io/storage";
  import { createEmptyMap } from "../../core/tree";
  import { showConfirm } from "../dialog";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  let entries: MapIndexEntry[] = [];
  let editingMapId: string | null = null;
  let editingValue = "";

  async function refresh(): Promise<void> {
    entries = await listMaps();
  }

  $: if ($mapsModalOpenStore) refresh();

  function close(): void {
    mapsModalOpenStore.set(false);
    editingMapId = null;
  }
  function onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) close();
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return `Hôm nay ${time}`;
    return `${d.toLocaleDateString("vi-VN")} ${time}`;
  }

  async function open(mapId: string): Promise<void> {
    if (await controller.openMap(mapId)) close();
  }

  function startRename(entry: MapIndexEntry): void {
    editingMapId = entry.mapId;
    editingValue = entry.title;
  }
  async function commitRename(mapId: string): Promise<void> {
    const value = editingValue.trim();
    if (value) await renameMap(mapId, value);
    editingMapId = null;
    await refresh();
  }

  async function removeMap(entry: MapIndexEntry): Promise<void> {
    const ok = await showConfirm(`Xoá hẳn map "${entry.title}"? Không thể hoàn tác việc này.`, "Xoá", "Huỷ");
    if (!ok) return;

    const isCurrentlyOpen = entry.mapId === $map.mapId;
    await deleteMap(entry.mapId);

    if (isCurrentlyOpen) {
      // Đang xoá đúng map hiện đang mở — không thể để người dùng tiếp
      // tục sửa trên một map đã không còn tồn tại trong storage (sửa
      // tiếp sẽ vô tình "hồi sinh" nó dưới đúng mapId cũ). Thay bằng
      // một map trống mới hoàn toàn.
      const fresh = createEmptyMap("Chủ đề trung tâm");
      store.loadMap(fresh);
    }
    await refresh();
  }

  function focusOnMount(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }
</script>

{#if $mapsModalOpenStore}
  <div class="modal-overlay open" role="presentation" on:click={onOverlayClick}>
    <div class="modal maps-modal">
      <h2>Map gần đây</h2>
      {#if entries.length === 0}
        <p class="muted">Chưa có map nào được lưu.</p>
      {:else}
        <div class="maps-list">
          {#each entries as entry (entry.mapId)}
            <div class="maps-row" class:current={entry.mapId === $map.mapId}>
              <div class="maps-row-main">
                {#if editingMapId === entry.mapId}
                  <input
                    type="text"
                    bind:value={editingValue}
                    on:keydown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); commitRename(entry.mapId); }
                      else if (e.key === "Escape") { e.preventDefault(); editingMapId = null; }
                    }}
                    on:blur={() => commitRename(entry.mapId)}
                    use:focusOnMount
                  />
                {:else}
                  <span class="maps-title">
                    {entry.title}
                    {#if entry.mapId === $map.mapId}<span class="maps-current-badge">đang mở</span>{/if}
                  </span>
                  <span class="maps-time">{formatTime(entry.updatedAt)}</span>
                {/if}
              </div>
              <div class="maps-row-actions">
                <button type="button" class="btn small-btn" disabled={entry.mapId === $map.mapId} on:click={() => open(entry.mapId)}>Mở</button>
                <button type="button" class="btn small-btn" on:click={() => startRename(entry)}>Đổi tên</button>
                <button type="button" class="btn danger small-btn" on:click={() => removeMap(entry)}>Xoá</button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
      <div class="close-row"><button class="btn primary" on:click={close}>Đóng</button></div>
    </div>
  </div>
{/if}

<style>
  .maps-modal {
    width: 460px;
    max-width: calc(100vw - 40px);
  }
  .maps-list {
    max-height: 360px;
    overflow-y: auto;
    margin: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .maps-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .maps-row.current {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .maps-row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .maps-row-main input {
    font-size: 13px;
    padding: 3px 6px;
  }
  .maps-title {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .maps-current-badge {
    margin-left: 6px;
    font-size: 10px;
    font-weight: 500;
    color: var(--accent);
    text-transform: uppercase;
  }
  .maps-time {
    font-size: 11px;
    color: var(--muted);
  }
  .maps-row-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
</style>
