<script lang="ts">
  /**
   * ui/components/TableEditorModal.svelte
   * -------------------------------------------------------------------
   * M2 — trình sửa bảng. Mở qua tableEditorStore (SidePanel mục Card,
   * hoặc bấm thẻ thu nhỏ của bảng trên canvas).
   *
   * Làm việc trên BẢN NHÁP (core/table.ts#TableDraft): thêm/xoá hàng/cột,
   * hàng tiêu đề, căn lề, Tab/Enter di chuyển ô, dán lưới từ Excel/Google
   * Sheets, nhập/xuất CSV. Bấm "Lưu" mới dispatch ĐÚNG MỘT
   * UpdateTableCommand → cả phiên sửa là một bước hoàn tác; "Huỷ" bỏ nháp.
   *
   * Phím bấm trong hộp thoại bị chặn không cho lan ra window, để phím tắt
   * toàn cục của canvas (Delete xoá node, Ctrl+Z hoàn tác map...) không
   * chạy nhầm khi tiêu điểm đang ở nút bấm trong hộp thoại.
   * -------------------------------------------------------------------
   */
  import { onDestroy, tick } from "svelte";
  import type { Store } from "../../core/store";
  import { mapStore } from "../svelteBridge";
  import { tableEditorStore } from "../uiStores";
  import { showAlert, showConfirm } from "../dialog";
  import { downloadText } from "../dom";
  import { UpdateTableCommand } from "../../core/cardCommands";
  import {
    createDraft,
    setCell,
    setAlign,
    setHeaderRow,
    setTitle,
    insertRow,
    deleteRow,
    insertColumn,
    deleteColumn,
    pasteGrid,
    replaceWithGrid,
    parseDelimited,
    toDelimited,
    isGridText,
    nextCell,
    TABLE_MAX_ROWS,
    TABLE_MAX_COLS,
    type TableDraft,
    type CellNavKey,
  } from "../../core/table";
  import type { TableAlign, TableBlock } from "../../core/types";

  export let store: Store;

  const map = mapStore(store);

  let draft: TableDraft | null = null;
  let original: TableBlock | null = null;
  let openedFor: string | null = null;
  let active = { r: 0, c: 0 };
  let gridEl: HTMLDivElement | undefined;
  let modalEl: HTMLDivElement | undefined;
  let csvInput: HTMLInputElement | undefined;

  $: target = $tableEditorStore;
  $: if (target && openedFor !== `${target.cardId}/${target.blockId}`) load(target.cardId, target.blockId);
  $: if (!target && openedFor !== null) reset();
  $: table = draft?.table ?? null;
  $: dirty = !!draft && !!original && JSON.stringify(draft.table) !== JSON.stringify(original);

  function load(cardId: string, blockId: string): void {
    const block = $map.cards[cardId]?.blocks.find((b) => b.id === blockId);
    if (!block || block.type !== "table") {
      tableEditorStore.set(null);
      return;
    }
    openedFor = `${cardId}/${blockId}`;
    original = block;
    draft = createDraft(block);
    active = { r: 0, c: 0 };
    // Hoãn một nhịp: khi mở bằng cách bấm thẻ trên canvas, hành vi mặc
    // định của mousedown (đưa tiêu điểm về body) chạy SAU handler mở hộp
    // thoại và sẽ cướp mất tiêu điểm nếu focus ngay.
    setTimeout(() => void focusCell(0, 0), 0);
  }

  function reset(): void {
    openedFor = null;
    draft = null;
    original = null;
  }

  async function close(force = false): Promise<void> {
    if (!force && dirty && !(await showConfirm("Bỏ các thay đổi chưa lưu trong bảng?", "Bỏ thay đổi"))) return;
    tableEditorStore.set(null);
  }

  function save(): void {
    if (!draft || !target) return;
    const card = store.getMap().cards[target.cardId];
    if (!card?.blocks.some((b) => b.id === draft?.table.id && b.type === "table")) {
      void showAlert("Bảng này không còn tồn tại (có thể card đã bị xoá), không lưu được.");
      return;
    }
    if (dirty) {
      const moved = draft.colOrigin.some((o, i) => o !== i) || draft.colOrigin.length !== original?.align.length;
      store.dispatch(new UpdateTableCommand(target.cardId, draft.table, moved ? draft.colOrigin : null));
    }
    void close(true);
  }

  async function focusCell(r: number, c: number): Promise<void> {
    active = { r, c };
    await tick();
    const el = gridEl?.querySelector<HTMLTextAreaElement>(`textarea[data-r="${r}"][data-c="${c}"]`);
    el?.focus();
    el?.select();
  }

  function onCellInput(r: number, c: number, e: Event): void {
    if (draft) draft = setCell(draft, r, c, (e.currentTarget as HTMLTextAreaElement).value);
  }

  function onCellKeydown(r: number, c: number, e: KeyboardEvent): void {
    if (!draft) return;
    if (e.key === "Enter" && e.altKey) {
      // Alt+Enter: xuống dòng NGAY TRONG ô (giống Excel).
      e.preventDefault();
      const el = e.currentTarget as HTMLTextAreaElement;
      const { selectionStart: s, selectionEnd: t, value } = el;
      draft = setCell(draft, r, c, value.slice(0, s) + "\n" + value.slice(t));
      void tick().then(() => el.setSelectionRange(s + 1, s + 1));
      return;
    }
    let key: CellNavKey | null = null;
    if (e.key === "Tab") key = e.shiftKey ? "shift-tab" : "tab";
    else if (e.key === "Enter" && !e.ctrlKey && !e.metaKey) key = e.shiftKey ? "shift-enter" : "enter";
    if (!key) return;
    e.preventDefault();
    const rows = draft.table.cells.length;
    const cols = draft.table.align.length;
    const next = nextCell(r, c, rows, cols, key);
    if (next.addRow) {
      if (rows >= TABLE_MAX_ROWS) return;
      draft = insertRow(draft, rows);
    }
    void focusCell(next.r, next.c);
  }

  function onCellPaste(r: number, c: number, e: ClipboardEvent): void {
    if (!draft) return;
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (!isGridText(text)) return; // một giá trị đơn: để ô nhập tự dán
    e.preventDefault();
    const result = pasteGrid(draft, r, c, parseDelimited(text));
    draft = result.draft;
    if (result.clipped) {
      void showAlert(`Dữ liệu dán vượt giới hạn ${TABLE_MAX_ROWS} hàng × ${TABLE_MAX_COLS} cột — phần thừa đã bị bỏ.`);
    }
  }

  function addRow(offset: 0 | 1): void {
    if (!draft) return;
    draft = insertRow(draft, active.r + offset);
    void focusCell(active.r + offset, active.c);
  }
  function removeRow(): void {
    if (!draft) return;
    draft = deleteRow(draft, active.r);
    void focusCell(Math.min(active.r, draft.table.cells.length - 1), active.c);
  }
  function addColumn(offset: 0 | 1): void {
    if (!draft) return;
    draft = insertColumn(draft, active.c + offset);
    void focusCell(active.r, active.c + offset);
  }
  function removeColumn(): void {
    if (!draft) return;
    draft = deleteColumn(draft, active.c);
    void focusCell(active.r, Math.min(active.c, draft.table.align.length - 1));
  }
  function alignActive(a: TableAlign): void {
    if (draft) draft = setAlign(draft, active.c, a);
  }

  async function importCsv(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file || !draft) return;
    const grid = parseDelimited((await file.text()).replace(/^﻿/, ""));
    if (grid.length === 0) {
      void showAlert("File CSV trống.");
      return;
    }
    const hasContent = draft.table.cells.some((row) => row.some((v) => v !== ""));
    if (hasContent && !(await showConfirm("Thay toàn bộ nội dung bảng bằng dữ liệu trong file CSV?", "Thay"))) return;
    draft = replaceWithGrid(draft, grid);
    void focusCell(0, 0);
  }

  function exportCsv(): void {
    if (!draft) return;
    const name = (draft.table.title.trim() || "bang").replace(/[\\/:*?"<>|]+/g, "_");
    // BOM để Excel mở đúng tiếng Việt (UTF-8).
    downloadText("﻿" + toDelimited(draft.table.cells, ","), `${name}.csv`, "text/csv;charset=utf-8");
  }

  function onModalKeydown(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      void close();
    } else if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key.toLowerCase() === "s")) {
      e.preventDefault();
      save();
    }
  }
  /** Khi hộp thoại mở mà tiêu điểm vẫn ở ngoài (ví dụ vừa bấm thẻ trên
   *  canvas), phím bấm không đi qua onModalKeydown — chặn ngay ở pha
   *  capture của window để phím tắt canvas không chạy, vẫn xử lý Esc/lưu. */
  function onWindowKeydownCapture(e: KeyboardEvent): void {
    if (!draft || (e.target instanceof Node && modalEl?.contains(e.target))) return;
    e.stopImmediatePropagation();
    onModalKeydown(e);
  }
  $: if (typeof window !== "undefined") {
    if (table) window.addEventListener("keydown", onWindowKeydownCapture, true);
    else window.removeEventListener("keydown", onWindowKeydownCapture, true);
  }
  onDestroy(() => window.removeEventListener("keydown", onWindowKeydownCapture, true));

  function onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) void close();
  }

  const colName = (i: number): string => {
    let s = "";
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
  };
</script>

{#if table}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay open" role="presentation" bind:this={modalEl} on:click={onOverlayClick} on:keydown={onModalKeydown}>
    <div class="modal table-editor" role="dialog" aria-modal="true" aria-label="Sửa bảng">
      <div class="te-head">
        <input class="te-title" type="text" placeholder="Tên bảng (tuỳ chọn)" value={table.title}
          on:input={(e) => { if (draft) draft = setTitle(draft, e.currentTarget.value); }} />
        <label class="te-check">
          <input type="checkbox" checked={table.headerRow}
            on:change={(e) => { if (draft) draft = setHeaderRow(draft, e.currentTarget.checked); }} />
          Hàng tiêu đề
        </label>
      </div>

      <div class="te-toolbar">
        <span class="te-group">
          <button type="button" class="btn small-btn" title="Chèn hàng phía trên" on:click={() => addRow(0)}>+ Hàng trên</button>
          <button type="button" class="btn small-btn" title="Chèn hàng phía dưới" on:click={() => addRow(1)}>+ Hàng dưới</button>
          <button type="button" class="btn danger small-btn" title="Xoá hàng đang chọn"
            disabled={table.cells.length <= 1} on:click={removeRow}>− Hàng</button>
        </span>
        <span class="te-group">
          <button type="button" class="btn small-btn" title="Chèn cột bên trái" on:click={() => addColumn(0)}>+ Cột trái</button>
          <button type="button" class="btn small-btn" title="Chèn cột bên phải" on:click={() => addColumn(1)}>+ Cột phải</button>
          <button type="button" class="btn danger small-btn" title="Xoá cột đang chọn"
            disabled={table.align.length <= 1} on:click={removeColumn}>− Cột</button>
        </span>
        <span class="te-group" role="group" aria-label="Căn lề cột">
          {#each [["left", "⇤ Trái"], ["center", "↔ Giữa"], ["right", "⇥ Phải"]] as [a, label] (a)}
            <button type="button" class="btn small-btn" class:active={table.align[active.c] === a}
              title="Căn lề cột {colName(active.c)}" on:click={() => alignActive(a as TableAlign)}>{label}</button>
          {/each}
        </span>
        <span class="te-group">
          <button type="button" class="btn small-btn" on:click={() => csvInput?.click()}>Nhập CSV…</button>
          <button type="button" class="btn small-btn" on:click={exportCsv}>Xuất CSV</button>
          <input bind:this={csvInput} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden
            on:change={importCsv} />
        </span>
      </div>

      <div class="te-grid" bind:this={gridEl}>
        <table>
          <thead>
            <tr>
              <th class="te-corner"></th>
              {#each table.align as _, c}
                <th class:te-active-col={c === active.c}>{colName(c)}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each table.cells as row, r}
              <tr class:te-header-row={r === 0 && table.headerRow}>
                <th class="te-rownum" class:te-active-col={r === active.r}>{r + 1}</th>
                {#each row as cell, c}
                  <td class:te-active={r === active.r && c === active.c}>
                    <textarea rows="1" data-r={r} data-c={c} value={cell} style="text-align:{table.align[c]}"
                      aria-label="Ô {colName(c)}{r + 1}"
                      on:focus={() => (active = { r, c })}
                      on:input={(e) => onCellInput(r, c, e)}
                      on:keydown={(e) => onCellKeydown(r, c, e)}
                      on:paste={(e) => onCellPaste(r, c, e)}></textarea>
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <p class="te-hint">
        Tab/Shift+Tab: sang ô kế/trước · Enter/Shift+Enter: xuống/lên · Alt+Enter: xuống dòng trong ô ·
        Dán vùng ô copy từ Excel/Google Sheets vào ô bất kỳ để rải dữ liệu từ ô đó · Ctrl+Enter: lưu
      </p>

      <div class="close-row te-actions">
        <span class="te-size">{table.cells.length} hàng × {table.align.length} cột</span>
        <button type="button" class="btn" on:click={() => close()}>Huỷ</button>
        <button type="button" class="btn primary" on:click={save}>{dirty ? "Lưu" : "Đóng"}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .table-editor { max-width: min(96vw, 980px); width: 96%; display: flex; flex-direction: column; gap: 10px; }
  .te-head { display: flex; gap: 12px; align-items: center; }
  .te-title { flex: 1; font-size: 15px; padding: 6px 8px; }
  .te-check { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; white-space: nowrap; }
  .te-toolbar { display: flex; flex-wrap: wrap; gap: 10px; }
  .te-group { display: inline-flex; gap: 4px; flex-wrap: wrap; }
  .te-group :global(.btn) { width: auto; }
  .te-group :global(.btn.active) { background: #2f6fed; color: #fff; border-color: #2f6fed; }
  .te-grid { overflow: auto; max-height: 56vh; border: 1px solid var(--border, #e5e7eb); border-radius: 8px; }
  .te-grid table { border-collapse: collapse; margin: 0; width: auto; }
  .te-grid th, .te-grid td { border: 1px solid var(--border, #e5e7eb); padding: 0; }
  .te-grid thead th, .te-rownum { background: #f3f4f6; color: #6b7280; font-weight: 500; font-size: 11px; text-align: center; padding: 2px 6px; position: sticky; }
  .te-grid thead th { top: 0; z-index: 1; }
  .te-rownum { left: 0; min-width: 28px; }
  .te-corner { left: 0; z-index: 2 !important; }
  .te-active-col { background: #dbe6fd !important; color: #2f6fed !important; }
  .te-grid td textarea {
    display: block; box-sizing: border-box; width: 130px; min-height: 28px; height: 28px; resize: none;
    border: none; outline: none; padding: 5px 7px; font: inherit; font-size: 13px; background: transparent; overflow: hidden;
  }
  .te-header-row td textarea { font-weight: 600; background: #f8f9fb; }
  .te-grid td.te-active { outline: 2px solid #2f6fed; outline-offset: -2px; }
  .te-hint { margin: 0; font-size: 12px; color: #6b7280; }
  .te-actions { align-items: center; gap: 8px; margin-top: 0; }
  .te-size { margin-right: auto; font-size: 12px; color: #6b7280; }
</style>
