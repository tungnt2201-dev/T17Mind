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
  import { mapsModalOpenStore, workspaceStore } from "../uiStores";
  import {
    listMaps,
    renameMap,
    deleteMap,
    listBrowserOnlyMaps,
    copyBrowserMapsToWorkspace,
    getWorkspaceRepo,
    type MapIndexEntry,
  } from "../../io/storage";
  import {
    chooseWorkspaceFolder,
    reconnectWorkspaceFolder,
    disconnectWorkspaceFolder,
    useDefaultNativeWorkspace,
    revealWorkspaceFolder,
    defaultNativeWorkspacePath,
  } from "../workspaceController";
  import { createEmptyMap } from "../../core/tree";
  import { showConfirm } from "../dialog";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  let entries: MapIndexEntry[] = [];
  let editingMapId: string | null = null;
  let editingValue = "";

  let browserOnly: MapIndexEntry[] = [];
  let busy = false;

  async function refresh(): Promise<void> {
    entries = await listMaps();
    browserOnly = await listBrowserOnlyMaps();
  }

  /** KW0 — sau khi đổi nơi lưu: map đang mở không thuộc Workspace mới thì
   *  mở map gần nhất của Workspace đó (nếu có). */
  async function afterSwitch(changed: boolean): Promise<void> {
    if (!changed) return;
    const repo = getWorkspaceRepo();
    if (repo && !repo.getEntry($map.mapId)) {
      const target = repo.lastOpenedMapId ?? repo.listMaps()[0]?.mapId;
      if (target) await controller.openMap(target);
    }
    await refresh();
  }
  async function run(fn: () => Promise<boolean | void>): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      await afterSwitch((await fn()) !== false);
    } finally {
      busy = false;
    }
  }
  async function importBrowserMaps(): Promise<void> {
    await run(async () => {
      await copyBrowserMapsToWorkspace(browserOnly.map((e) => e.mapId));
    });
  }
  function savedText(ws: typeof $workspaceStore): string {
    if (ws.error) return `⚠ ${ws.error}`;
    if (ws.pending) return "Đang chờ ghi…";
    if (ws.lastSavedAt) return `Đã lưu ${formatTime(ws.lastSavedAt)}`;
    return "";
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
    const msg = getWorkspaceRepo()
      ? `Xoá map "${entry.title}"? File của map được chuyển vào thư mục .trash trong Workspace (lấy lại được bằng tay).`
      : `Xoá hẳn map "${entry.title}"? Không thể hoàn tác việc này.`;
    const ok = await showConfirm(msg, "Xoá", "Huỷ");
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
      <section class="ws" aria-label="Nơi lưu">
        {#if $workspaceStore.kind === "idb"}
          <div class="ws-line">
            <span class="ws-icon" aria-hidden="true">🗄️</span>
            <span class="ws-text"><strong>Bộ nhớ trình duyệt</strong>
              <span class="muted">— dữ liệu chỉ nằm trong trình duyệt này.</span></span>
          </div>
          {#if $workspaceStore.needsPermission}
            <div class="ws-actions">
              <span class="muted">Thư mục “{$workspaceStore.needsPermission}” cần cấp lại quyền.</span>
              <button type="button" class="btn small-btn primary" disabled={busy} on:click={() => run(reconnectWorkspaceFolder)}>Cấp quyền</button>
            </div>
          {/if}
          {#if $workspaceStore.folderSupported}
            <div class="ws-actions">
              <button type="button" class="btn small-btn" disabled={busy} on:click={() => run(chooseWorkspaceFolder)}>📁 Chọn thư mục Workspace…</button>
              <span class="muted">Lưu mỗi map thành file .t17m trong một thư mục trên máy.</span>
            </div>
          {:else}
            <p class="muted ws-note">Trình duyệt này không cho chọn thư mục — dùng Chrome/Edge hoặc bản exe để lưu vào thư mục.</p>
          {/if}
        {:else}
          <div class="ws-line">
            <span class="ws-icon" aria-hidden="true">📁</span>
            <span class="ws-text"><strong>Thư mục Workspace</strong>
              <span class="ws-path" title={$workspaceStore.label}>{$workspaceStore.label}</span></span>
          </div>
          <div class="ws-actions">
            {#if $workspaceStore.kind === "native"}
              <button type="button" class="btn small-btn" on:click={() => revealWorkspaceFolder()}>Mở thư mục</button>
            {/if}
            <button type="button" class="btn small-btn" disabled={busy} on:click={() => run(chooseWorkspaceFolder)}>Đổi thư mục…</button>
            {#if $workspaceStore.kind === "native" && $workspaceStore.label !== defaultNativeWorkspacePath()}
              <button type="button" class="btn small-btn" disabled={busy} title={defaultNativeWorkspacePath()} on:click={() => run(useDefaultNativeWorkspace)}>Về mặc định</button>
            {/if}
            {#if $workspaceStore.kind === "browser"}
              <button type="button" class="btn small-btn" disabled={busy} on:click={() => run(disconnectWorkspaceFolder)}>Thôi dùng thư mục</button>
            {/if}
            <span class="ws-status" class:err={!!$workspaceStore.error}>{savedText($workspaceStore)}</span>
          </div>
          {#if browserOnly.length > 0}
            <div class="ws-actions">
              <span class="muted">{browserOnly.length} map chỉ có trong bộ nhớ trình duyệt.</span>
              <button type="button" class="btn small-btn" disabled={busy} on:click={importBrowserMaps}>Đưa vào Workspace</button>
            </div>
          {/if}
        {/if}
        {#if $workspaceStore.error && $workspaceStore.kind === "idb"}
          <p class="ws-status err">⚠ {$workspaceStore.error}</p>
        {/if}
      </section>
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
  .ws {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    margin: 8px 0 4px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
  }
  .ws-line {
    display: flex;
    gap: 8px;
    align-items: baseline;
    min-width: 0;
  }
  .ws-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .ws-path {
    font-family: ui-monospace, Consolas, monospace;
    font-size: 11px;
    color: var(--muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ws-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .ws-note {
    margin: 0;
  }
  .ws-status {
    font-size: 11px;
    color: var(--muted);
    margin-left: auto;
  }
  .ws-status.err {
    color: #b91c1c;
    margin: 0;
  }
  .maps-modal {
    width: 520px;
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
