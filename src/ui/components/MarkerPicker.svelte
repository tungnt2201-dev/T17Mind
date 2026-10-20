<script lang="ts">
  /**
   * ui/components/MarkerPicker.svelte
   * -------------------------------------------------------------------
   * Chọn biểu tượng cho node: biểu tượng đang gắn (bấm để gỡ), hàng ghim
   * (bấm để bật/tắt), và kho biểu tượng mở rộng — tìm tiếng Việt không
   * dấu, "dùng gần đây", dán/gõ emoji bất kỳ, chế độ sửa hàng ghim.
   * Chỉ phát sự kiện `change` với danh sách mới; nơi dùng tự dispatch
   * Command (undo/redo) — xem SidePanel.svelte.
   * -------------------------------------------------------------------
   */
  import { createEventDispatcher } from "svelte";
  import { EMOJI_GROUPS, searchEmojis, normalizeEmoji, type EmojiEntry } from "../../core/emojiCatalog";
  import {
    pinnedMarkersStore,
    recentMarkersStore,
    noteRecentMarker,
    togglePinnedMarker,
    setPinnedMarkers,
  } from "../userLibrary";

  export let markers: string[];

  const dispatch = createEventDispatcher<{ change: string[] }>();

  let open = false;
  let editPins = false;
  let query = "";

  $: results = query.trim() ? searchEmojis(query) : [];
  $: typed = normalizeEmoji(query);
  $: titleOf = new Map<string, string>(EMOJI_GROUPS.flatMap((g) => g.items.map((i) => [i.e, i.k] as [string, string])));

  function toggle(e: string): void {
    if (editPins) {
      void togglePinnedMarker(e);
      return;
    }
    const has = markers.includes(e);
    dispatch("change", has ? markers.filter((m) => m !== e) : [...markers, e]);
    if (!has) noteRecentMarker(e);
  }
  function remove(e: string): void {
    dispatch("change", markers.filter((m) => m !== e));
  }
  function addTyped(): void {
    if (!typed) return;
    if (editPins) void togglePinnedMarker(typed);
    else if (!markers.includes(typed)) {
      dispatch("change", [...markers, typed]);
      noteRecentMarker(typed);
    }
    query = "";
  }
  const label = (e: EmojiEntry | string): string => {
    const em = typeof e === "string" ? e : e.e;
    const k = typeof e === "string" ? titleOf.get(e) : e.k;
    return k ? `${em} — ${k.split(" ").slice(0, 3).join(", ")}` : em;
  };
</script>

<div class="mp">
  <div class="mp-current" aria-label="Biểu tượng đang gắn">
    {#if markers.length === 0}
      <span class="muted">Chưa có biểu tượng</span>
    {:else}
      {#each markers as m (m)}
        <button type="button" class="mp-chip" title="Bấm để gỡ {m}" on:click={() => remove(m)}>{m}<span class="x">×</span></button>
      {/each}
    {/if}
  </div>

  <div class="mp-grid" role="group" aria-label="Biểu tượng ghim">
    {#each $pinnedMarkersStore as icon (icon)}
      <button type="button" class="marker-btn" class:active={!editPins && markers.includes(icon)} class:pinned={editPins}
        title={editPins ? `Bỏ ghim ${icon}` : label(icon)} on:click={() => toggle(icon)}>{icon}</button>
    {/each}
    <button type="button" class="marker-btn more" class:on={open} title="Thêm biểu tượng khác" aria-expanded={open}
      on:click={() => (open = !open)}>{open ? "▴" : "＋"}</button>
  </div>

  {#if open}
    <div class="mp-lib">
      <div class="mp-tools">
        <input type="text" placeholder="Tìm: tiền, lịch, xong… hoặc dán emoji" bind:value={query}
          aria-label="Tìm biểu tượng"
          on:keydown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (typed) addTyped(); else if (results[0]) toggle(results[0].e); } }} />
        <label class="mp-pinmode" title="Bật để bấm vào biểu tượng là ghim / bỏ ghim vào hàng nhanh ở trên">
          <input type="checkbox" bind:checked={editPins} /> Sửa hàng ghim
        </label>
      </div>
      {#if editPins}
        <p class="mp-hint">Bấm biểu tượng để ghim / bỏ ghim. Hàng ghim lưu theo Workspace.
          <button type="button" class="linkish" on:click={() => setPinnedMarkers(null)}>Khôi phục mặc định</button></p>
      {/if}

      <div class="mp-scroll">
        {#if typed && !results.some((r) => r.e === typed)}
          <div class="mp-head">Emoji vừa dán</div>
          <div class="mp-grid">
            <button type="button" class="marker-btn" class:active={markers.includes(typed)} on:click={addTyped}>{typed}</button>
          </div>
        {/if}
        {#if query.trim()}
          {#if results.length === 0 && !typed}
            <p class="muted">Không thấy — thử từ khác, hoặc dán emoji (Windows: phím Win + .).</p>
          {:else if results.length > 0}
            <div class="mp-grid">
              {#each results as r (r.e)}
                <button type="button" class="marker-btn" class:active={!editPins && markers.includes(r.e)}
                  class:pinned={editPins && $pinnedMarkersStore.includes(r.e)} title={label(r)} on:click={() => toggle(r.e)}>{r.e}</button>
              {/each}
            </div>
          {/if}
        {:else}
          {#if $recentMarkersStore.length > 0}
            <div class="mp-head">Dùng gần đây</div>
            <div class="mp-grid">
              {#each $recentMarkersStore as r (r)}
                <button type="button" class="marker-btn" class:active={!editPins && markers.includes(r)}
                  class:pinned={editPins && $pinnedMarkersStore.includes(r)} title={label(r)} on:click={() => toggle(r)}>{r}</button>
              {/each}
            </div>
          {/if}
          {#each EMOJI_GROUPS as grp (grp.id)}
            <div class="mp-head">{grp.name}</div>
            <div class="mp-grid">
              {#each grp.items as it (it.e)}
                <button type="button" class="marker-btn" class:active={!editPins && markers.includes(it.e)}
                  class:pinned={editPins && $pinnedMarkersStore.includes(it.e)} title={label(it)} on:click={() => toggle(it.e)}>{it.e}</button>
              {/each}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .mp { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
  .mp-current { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 24px; }
  .mp-chip {
    display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; font-size: 15px;
    border: 1px solid var(--border); border-radius: 999px; background: var(--panel, #fff); cursor: pointer;
  }
  .mp-chip .x { font-size: 11px; color: var(--muted); }
  .mp-chip:hover { border-color: #ef4444; }
  .mp-chip:hover .x { color: #ef4444; }
  .mp-grid { display: flex; flex-wrap: wrap; gap: 3px; }
  .marker-btn {
    width: 28px; height: 28px; font-size: 16px; line-height: 1; padding: 0;
    border: 1px solid var(--border); border-radius: 6px; background: var(--panel, #fff); cursor: pointer;
  }
  .marker-btn:hover { background: var(--accent-soft); }
  .marker-btn.active { border-color: var(--accent); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent); }
  .marker-btn.pinned { border-color: #f59e0b; background: #fef3c7; }
  .marker-btn.more { font-size: 14px; color: var(--muted); }
  .marker-btn.more.on { border-color: var(--accent); color: var(--accent); }
  .mp-lib { border: 1px solid var(--border); border-radius: 8px; padding: 6px; display: flex; flex-direction: column; gap: 6px; }
  .mp-tools { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .mp-tools input[type="text"] { flex: 1; min-width: 120px; font-size: 12px; padding: 4px 6px; }
  .mp-pinmode { font-size: 11px; color: var(--muted); display: inline-flex; gap: 3px; align-items: center; white-space: nowrap; }
  .mp-hint { font-size: 11px; color: #92400e; margin: 0; }
  .linkish { background: none; border: none; color: var(--accent); cursor: pointer; padding: 0; font-size: 11px; text-decoration: underline; }
  .mp-scroll { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 2px; }
  .mp-head { font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 4px; }
</style>
