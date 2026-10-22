<script lang="ts">
  /**
   * ui/components/CommandPalette.svelte
   * -------------------------------------------------------------------
   * KW2 — bảng Ctrl+K: một ô gõ duy nhất.
   *  - Gõ chữ → tìm trong MỌI map của Workspace (node, card, nội dung khối),
   *    không dấu, mọi từ phải có mặt. Enter / bấm → nhảy tới đúng chỗ, tự
   *    chuyển map nếu cần.
   *  - Gõ ">" đầu dòng (hoặc để trống) → danh sách lệnh của ứng dụng.
   *  - Các nút lọc: Tất cả · Node · Card · Nội dung.
   * Chỉ mục nằm trong bộ nhớ (ui/knowledgeController.ts), dựng lại mỗi lần mở
   * bảng — map chưa đổi từ lần trước thì được bỏ qua.
   * -------------------------------------------------------------------
   */
  import { tick } from "svelte";
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { bodySnippet, highlightParts, queryTokens, type EntryKind, type SearchHit } from "../../core/knowledgeIndex";
  import { filterCommands, type PaletteCommand } from "../../core/commandPalette";
  import { indexStatusStore, indexCurrentMap, knowledgeIndex, refreshKnowledgeIndex } from "../knowledgeController";
  import { createCommandHost } from "../commandHost";
  import { paletteOpenStore } from "../uiStores";

  export let store: Store;
  export let controller: AppController;

  type Filter = "all" | "node" | "card" | "block";
  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "node", label: "Node" },
    { id: "card", label: "Card" },
    { id: "block", label: "Nội dung" },
  ];

  const host = createCommandHost(controller);

  let query = "";
  let filter: Filter = "all";
  let active = 0;
  let inputEl: HTMLInputElement | undefined;
  let listEl: HTMLDivElement | undefined;
  let version = 0; // tăng khi chỉ mục đổi để tìm lại

  type Row = { type: "hit"; hit: SearchHit } | { type: "cmd"; cmd: PaletteCommand };

  $: commandMode = query.trimStart().startsWith(">");
  $: text = commandMode ? query.trimStart().slice(1) : query;
  $: tokens = queryTokens(text);
  $: rows = buildRows(commandMode, text, filter, version, $indexStatusStore.running);
  $: if (active >= rows.length) active = Math.max(0, rows.length - 1);

  function buildRows(cmdMode: boolean, q: string, f: Filter, _v: number, _r: boolean): Row[] {
    if (cmdMode || q.trim() === "") return filterCommands(q, undefined, 40).map((cmd) => ({ type: "cmd", cmd }));
    const kinds: EntryKind[] | undefined = f === "all" ? undefined : [f];
    const hits = knowledgeIndex.search(q, { kinds, limit: 40, currentMapId: store.getMap().mapId });
    const out: Row[] = hits.map((hit) => ({ type: "hit", hit }));
    if (f === "all") for (const cmd of filterCommands(q, undefined, 3)) out.push({ type: "cmd", cmd });
    return out;
  }

  // Mở bảng: dựng lại chỉ mục (map đang mở ngay, các map khác nền) rồi tìm lại khi xong.
  let wasOpen = false;
  $: if ($paletteOpenStore && !wasOpen) {
    wasOpen = true;
    query = "";
    filter = "all";
    active = 0;
    indexCurrentMap(store.getMap());
    version++;
    void refreshKnowledgeIndex(() => store.getMap()).then(() => (version += 1));
    void tick().then(() => inputEl?.focus());
  } else if (!$paletteOpenStore) wasOpen = false;

  function close(): void {
    paletteOpenStore.set(false);
  }

  function pickHitMap(hit: SearchHit): string {
    const cur = store.getMap().mapId;
    return hit.maps.find((m) => m.mapId === cur)?.mapId ?? hit.maps[0]!.mapId;
  }

  async function choose(row: Row | undefined): Promise<void> {
    if (!row) return;
    close();
    if (row.type === "cmd") {
      await tick(); // đóng bảng trước, để lệnh mở hộp thoại không bị tranh focus
      row.cmd.run(host);
      return;
    }
    const e = row.hit.entry;
    await controller.goToKnowledgeTarget({ mapId: pickHitMap(row.hit), kind: e.kind, id: e.id, cardId: e.cardId, blockId: e.blockId });
  }

  function scrollActive(): void {
    void tick().then(() => listEl?.querySelector<HTMLElement>(".cp-row.active")?.scrollIntoView({ block: "nearest" }));
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (rows.length) active = (active + 1) % rows.length;
      scrollActive();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (rows.length) active = (active - 1 + rows.length) % rows.length;
      scrollActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      void choose(rows[active]);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const i = FILTERS.findIndex((x) => x.id === filter);
      filter = FILTERS[(i + (e.shiftKey ? FILTERS.length - 1 : 1)) % FILTERS.length]!.id;
    }
    e.stopPropagation(); // không để phím tắt toàn cục (Tab, Delete…) bắt nhầm khi đang gõ
  }

  function contextLine(hit: SearchHit): string {
    const where = hit.maps.length > 1 ? `Dùng ở ${hit.maps.length} map: ${hit.maps.map((m) => m.mapTitle).join(", ")}` : hit.entry.mapTitle;
    return hit.entry.context ? `${where} · ${hit.entry.context}` : where;
  }

  const KIND_LABEL: Record<EntryKind, string> = { node: "Node", card: "Card", block: "Nội dung" };
</script>

{#if $paletteOpenStore}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="cp-overlay" on:click|self={close}>
    <div class="cp" role="dialog" aria-label="Tìm kiếm và lệnh">
      <div class="cp-top">
        <span class="cp-icon">⌘</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          on:keydown={onKeydown}
          type="text"
          placeholder="Tìm node, card, nội dung ở mọi map… (gõ &gt; để chạy lệnh)"
          spellcheck="false"
          autocomplete="off"
        />
        <button type="button" class="cp-close" on:click={close} title="Đóng (Esc)">×</button>
      </div>
      <div class="cp-filters">
        {#each FILTERS as f (f.id)}
          <button type="button" class="cp-chip" class:on={filter === f.id && !commandMode} disabled={commandMode} on:click={() => (filter = f.id)}>{f.label}</button>
        {/each}
        <span class="cp-status">
          {#if $indexStatusStore.running}Đang lập chỉ mục {$indexStatusStore.done}/{$indexStatusStore.total} map…
          {:else}{knowledgeIndex.mapIds().length} map · {knowledgeIndex.size} mục{#if $indexStatusStore.failed > 0} · {$indexStatusStore.failed} map không đọc được{/if}{/if}
        </span>
      </div>
      <div class="cp-list" bind:this={listEl}>
        {#each rows as row, i (row.type === "hit" ? `h${row.hit.entry.mapId}/${row.hit.entry.kind}/${row.hit.entry.id}/${row.hit.entry.blockId ?? ""}` : `c${row.cmd.id}`)}
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="cp-row" class:active={i === active} on:mousemove={() => (active = i)} on:click={() => choose(row)}>
            {#if row.type === "cmd"}
              <span class="cp-badge cmd">Lệnh</span>
              <span class="cp-main"><span class="cp-title">{row.cmd.title}</span></span>
              {#if row.cmd.shortcut}<kbd>{row.cmd.shortcut}</kbd>{/if}
            {:else}
              {@const e = row.hit.entry}
              <span class="cp-badge {e.kind}">{KIND_LABEL[e.kind]}</span>
              <span class="cp-main">
                <span class="cp-title">{#each highlightParts(e.title || "(trống)", tokens) as p}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span>
                {#if e.body}
                  <span class="cp-snip">{#each highlightParts(bodySnippet(e.body, tokens), tokens) as p}{#if p.hit}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span>
                {/if}
                <span class="cp-ctx">{contextLine(row.hit)}</span>
              </span>
            {/if}
          </div>
        {:else}
          <div class="cp-empty">
            {#if $indexStatusStore.running}Đang lập chỉ mục, kết quả sẽ hiện dần…{:else}Không có kết quả cho “{text.trim()}”.{/if}
          </div>
        {/each}
      </div>
      <div class="cp-foot"><kbd>↑</kbd><kbd>↓</kbd> chọn · <kbd>Enter</kbd> mở · <kbd>Tab</kbd> đổi bộ lọc · <kbd>Esc</kbd> đóng</div>
    </div>
  </div>
{/if}

<style>
  .cp-overlay { position: fixed; inset: 0; background: rgba(20, 22, 30, 0.35); z-index: 2200; display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; }
  .cp { width: min(680px, calc(100vw - 32px)); background: #fff; border-radius: 12px; box-shadow: 0 20px 60px rgba(20, 22, 30, 0.35); display: flex; flex-direction: column; max-height: 70vh; overflow: hidden; }
  .cp-top { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--border, #e5e7eb); }
  .cp-icon { color: #9aa1ab; font-size: 16px; }
  .cp-top input { flex: 1; border: none; outline: none; font: inherit; font-size: 15px; }
  .cp-close { background: none; border: none; color: var(--muted, #6b7280); font-size: 18px; cursor: pointer; line-height: 1; }
  .cp-filters { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-bottom: 1px solid var(--border, #e5e7eb); }
  .cp-chip { border: 1px solid #e5e7eb; background: #fff; border-radius: 999px; padding: 2px 10px; font: inherit; font-size: 12px; cursor: pointer; color: #4b5563; }
  .cp-chip.on { background: #eef3fe; border-color: #2f6fed; color: #2f6fed; font-weight: 600; }
  .cp-chip:disabled { opacity: 0.45; cursor: default; }
  .cp-status { margin-left: auto; font-size: 11.5px; color: var(--muted, #6b7280); }
  .cp-list { overflow-y: auto; padding: 4px; min-height: 60px; }
  .cp-row { display: flex; align-items: flex-start; gap: 10px; padding: 7px 10px; border-radius: 8px; cursor: pointer; }
  .cp-row.active { background: #eef3fe; }
  .cp-badge { flex: none; font-size: 10.5px; font-weight: 700; border-radius: 4px; padding: 2px 6px; margin-top: 1px; min-width: 52px; text-align: center; }
  .cp-badge.node { background: #edf7ef; color: #2f8f46; }
  .cp-badge.card { background: #eef3fe; color: #2f6fed; }
  .cp-badge.block { background: #fdf3e3; color: #b7791f; }
  .cp-badge.cmd { background: #f3f4f6; color: #4b5563; }
  .cp-main { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
  .cp-title { font-size: 13.5px; font-weight: 600; color: #1f2933; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp-snip { font-size: 12px; color: #4b5563; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cp-ctx { font-size: 11px; color: #9aa1ab; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  mark { background: #fff0a8; color: inherit; border-radius: 2px; padding: 0 1px; }
  kbd { font-family: inherit; font-size: 11px; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; padding: 0 5px; color: #4b5563; margin: 0 2px; }
  .cp-empty { padding: 18px; text-align: center; color: var(--muted, #6b7280); font-size: 13px; }
  .cp-foot { padding: 6px 14px; border-top: 1px solid var(--border, #e5e7eb); font-size: 11.5px; color: var(--muted, #6b7280); }
</style>
