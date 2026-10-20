<script lang="ts">
  /**
   * ui/components/WorkspaceCards.svelte
   * -------------------------------------------------------------------
   * KW1 — phạm vi "Toàn Workspace" của Thư viện: mọi card trong kho card
   * chung (cards/*.json), kèm map nào đang dùng. Kéo thả vào canvas hoặc
   * bấm "Thêm làm nhánh con" / "Gắn vào node đang chọn" để đưa card vào
   * map đang mở (giữ nguyên id: sửa ở map nào, map kia cũng cập nhật khi
   * mở lại). Mở map đang dùng card; xoá khỏi Workspace card không map nào dùng.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore, selectionStore } from "../svelteBridge";
  import { CARD_DRAG_TYPE, workspaceStore } from "../uiStores";
  import { getWorkspaceRepo, flushWorkspaceWrites } from "../../io/storage";
  import { cardSearchText, cardSnippet, blockCounts, describeCounts, cardAccentHue } from "../../core/library";
  import { normalizeForSearch } from "../../core/search";
  import type { RegistryCardFile } from "../../core/cardRegistry";
  import type { WorkspaceMapEntry } from "../../core/workspace";
  import { showAlert, showConfirm } from "../dialog";
  import CardGlyph from "./CardGlyph.svelte";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;
  export let query = "";

  const map = mapStore(store);
  const sel = selectionStore(selection);

  type Item = { file: RegistryCardFile; usedIn: WorkspaceMapEntry[] };
  let items: Item[] = [];
  let loading = false;
  type Filter = "all" | "notHere" | "unused";
  let filter: Filter = "all";
  let expanded: string | null = null;

  async function reload(): Promise<void> {
    const repo = getWorkspaceRepo();
    if (!repo) {
      items = [];
      return;
    }
    loading = true;
    try {
      await flushWorkspaceWrites(); // card vừa sửa ở map đang mở vào kho trước
      items = await repo.listRegistryCards();
    } finally {
      loading = false;
    }
  }
  // Nạp lại khi đổi Workspace hoặc đổi map đang mở.
  $: void ($workspaceStore.label, $map.mapId, reload());

  $: selectedNode = $sel.primaryId ? $map.nodes[$sel.primaryId] ?? null : null;
  $: q = normalizeForSearch(query.trim());
  $: shown = items.filter((it) => {
    if (filter === "notHere" && $map.cards[it.file.card.id]) return false;
    if (filter === "unused" && (it.usedIn.length > 0 || $map.cards[it.file.card.id])) return false;
    return !q || normalizeForSearch(cardSearchText(it.file.card)).includes(q);
  });

  const KINDS = ["text", "table", "image", "chart"] as const;
  const FILTERS: { v: Filter; label: string }[] = [
    { v: "all", label: "Tất cả" },
    { v: "notHere", label: "Chưa có ở map này" },
    { v: "unused", label: "Không map nào dùng" },
  ];

  function onDragStart(e: DragEvent, it: Item): void {
    e.dataTransfer?.setData(CARD_DRAG_TYPE, it.file.card.id);
    e.dataTransfer?.setData("text/plain", it.file.card.title);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "link";
  }
  async function add(it: Item, kind: "child" | "attach"): Promise<void> {
    if (await controller.importRegistryCard(it.file.card.id, { kind })) void reload();
  }
  async function openMap(entry: WorkspaceMapEntry): Promise<void> {
    if (!(await controller.openMap(entry.mapId))) void showAlert("Không mở được map này.");
  }
  async function removeFromWorkspace(it: Item): Promise<void> {
    const ok = await showConfirm(`Xoá card "${it.file.card.title || "(chưa đặt tên)"}" khỏi Workspace? File card được chuyển vào thư mục .trash.`, "Xoá");
    if (!ok) return;
    try {
      await getWorkspaceRepo()?.deleteRegistryCard(it.file.card.id);
    } catch (err) {
      void showAlert((err as Error)?.message ?? String(err));
    }
    await reload();
  }
  const otherMaps = (it: Item) => it.usedIn.filter((m) => m.mapId !== $map.mapId);
</script>

{#if $workspaceStore.kind === "idb"}
  <p class="wc-note">Card dùng chung giữa nhiều map cần một <strong>thư mục Workspace</strong>. Mở "Map gần đây" → "Chọn thư mục Workspace…" (bản exe đã có sẵn).</p>
{:else}
  <div class="wc-filters" role="group" aria-label="Lọc card Workspace">
    {#each FILTERS as f (f.v)}
      <button type="button" class:active={filter === f.v} on:click={() => (filter = f.v)}>{f.label}</button>
    {/each}
    <button type="button" class="wc-refresh" title="Tải lại kho card" disabled={loading} on:click={reload}>↻</button>
  </div>
  {#if !loading && shown.length === 0}
    <p class="wc-note">{items.length === 0 ? "Kho card chung trống — card ở mọi map trong Workspace sẽ xuất hiện ở đây sau khi lưu." : "Không có card nào khớp."}</p>
  {/if}
  <ul class="wc-list">
    {#each shown as it (it.file.card.id)}
      {@const card = it.file.card}
      {@const here = !!$map.cards[card.id]}
      {@const open = expanded === card.id}
      {@const counts = blockCounts(card)}
      <li class="wc-item" class:open style="--accent:hsl({cardAccentHue(card.id)} 62% 55%)">
        <div class="wc-row" draggable="true" role="button" tabindex="0" title="Bấm để xem · kéo thả vào map để thêm"
          on:dragstart={(e) => onDragStart(e, it)}
          on:click={() => (expanded = open ? null : card.id)}
          on:keydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); expanded = open ? null : card.id; } }}>
          <span class="wc-title-row">
            <span class="wc-title">{card.title || "(chưa đặt tên)"}</span>
            {#if here}<span class="wc-here">map này</span>{/if}
          </span>
          {#if cardSnippet(card)}<span class="wc-snippet">{cardSnippet(card)}</span>{/if}
          <span class="wc-kinds" title={describeCounts(counts)}>
            {#each KINDS as k (k)}{#if counts[k] > 0}<span class="wc-kind"><CardGlyph kind={k} size={12} />{#if counts[k] > 1}{counts[k]}{/if}</span>{/if}{/each}
          </span>
          <span class="wc-maps">
            {#if it.usedIn.length === 0}<span class="muted">Không map nào dùng</span>
            {:else}Dùng ở: {it.usedIn.map((m) => (m.mapId === $map.mapId ? "map này" : m.title)).join(", ")}{/if}
          </span>
        </div>
        {#if open}
          <div class="wc-detail">
            <div class="card-add">
              {#if here}
                <button type="button" class="btn small-btn" on:click={() => controller.openCardPage(card.id)}>⤢ Mở trang</button>
              {/if}
              <button type="button" class="btn small-btn" title="Tạo node con mang card này dưới node đang chọn (hoặc gốc)"
                on:click={() => add(it, "child")}>＋ Thêm làm nhánh con</button>
              <button type="button" class="btn small-btn" disabled={!selectedNode}
                title={selectedNode ? `Gắn vào "${selectedNode.text}"` : "Chọn một node trên map trước"}
                on:click={() => add(it, "attach")}>Gắn vào node đang chọn</button>
            </div>
            {#if otherMaps(it).length > 0}
              <div class="wc-open">
                <span class="muted">Mở map:</span>
                {#each otherMaps(it) as m (m.mapId)}
                  <button type="button" class="card-usage-link" on:click={() => openMap(m)}>{m.title}</button>
                {/each}
              </div>
            {/if}
            {#if it.usedIn.length === 0 && !here}
              <button type="button" class="btn danger small-btn" on:click={() => removeFromWorkspace(it)}>Xoá khỏi Workspace</button>
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .wc-note { color: #6b7280; margin: 4px 0; line-height: 1.45; }
  .wc-filters { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .wc-filters button { border: 1px solid var(--border, #e5e7eb); background: #fff; border-radius: 12px; padding: 2px 10px; cursor: pointer; font-size: 12px; }
  .wc-filters button.active { background: #2f6fed; color: #fff; border-color: #2f6fed; }
  .wc-filters .wc-refresh { margin-left: auto; padding: 2px 8px; }
  .wc-list { list-style: none; margin: 2px 0 6px; padding: 0 2px; display: flex; flex-direction: column; gap: 10px; }
  .wc-item {
    background: #fff; border-radius: 10px; border: 1px solid rgba(15, 23, 42, 0.06); border-left: 4px solid var(--accent);
    box-shadow: 0 1px 1px rgba(15, 23, 42, 0.05), 0 2px 4px rgba(15, 23, 42, 0.06), 0 6px 14px rgba(15, 23, 42, 0.07);
  }
  .wc-item.open { box-shadow: 0 0 0 2px #7ea6ff, 0 10px 24px rgba(15, 23, 42, 0.14); }
  .wc-row { display: flex; flex-direction: column; gap: 4px; padding: 9px 10px; cursor: grab; }
  .wc-title-row { display: flex; align-items: baseline; gap: 6px; }
  .wc-title { font-weight: 650; font-size: 13px; color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .wc-here { color: #2f6fed; font-size: 10.5px; font-weight: 600; text-transform: uppercase; }
  .wc-snippet { color: #4b5563; font-size: 11.5px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .wc-kinds { display: flex; gap: 8px; color: var(--accent); font-size: 11px; }
  .wc-kind { display: inline-flex; align-items: center; gap: 2px; font-weight: 600; }
  .wc-maps { font-size: 11px; color: #6b7280; }
  .wc-detail { border-top: 1px solid #eef0f3; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .wc-open { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .wc-detail :global(.btn) { width: auto; }
</style>
