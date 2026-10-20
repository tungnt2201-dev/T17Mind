<script lang="ts">
  /**
   * ui/components/ExportDocModal.svelte
   * -------------------------------------------------------------------
   * M5 — hộp thoại "Xuất tài liệu": chọn phạm vi (cả map / nhánh đang
   * chọn), định dạng (Word .docx, Markdown .md có ảnh nhúng, hoặc
   * Markdown + thư mục ảnh .zip), số cấp đầu thành tiêu đề (sâu hơn thành
   * danh sách), có kèm ghi chú / nội dung card / ảnh, có mục lục. Bấm
   * "Xuất…" → hộp thoại Lưu (chọn thư mục, tên file) như mọi mục Xuất.
   * Dòng "Sẽ gồm…" đếm trước nội dung bằng chính core/docModel.ts.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore, selectionStore } from "../svelteBridge";
  import { exportDocStore } from "../uiStores";
  import { buildDocModel, docStats, type DocOptions } from "../../core/docModel";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;

  const map = mapStore(store);
  const sel = selectionStore(selection);

  let opts: DocOptions | null = null;
  let format: "docx" | "md" | "zip" = "docx";

  $: req = $exportDocStore;
  $: if (req && !opts) opts = { ...controller.getDocOptions(), scope: req.scope };
  $: if (!req) opts = null;
  $: selectedNode = $sel.primaryId ? $map.nodes[$sel.primaryId] ?? null : null;
  $: effective = opts ? { ...opts, branchRootId: selectedNode?.id ?? null, scope: selectedNode ? opts.scope : ("map" as const) } : null;
  $: stats = effective ? docStats(buildDocModel($map, effective)) : null;

  function close(): void {
    exportDocStore.set(null);
  }
  function go(): void {
    if (!effective) return;
    const o = effective;
    close();
    void controller.exportDocument(o, format);
  }
  function onKey(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Escape") close();
  }
</script>

{#if req && opts}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay open" role="presentation" on:click={(e) => { if (e.target === e.currentTarget) close(); }} on:keydown={onKey}>
    <div class="modal xd" role="dialog" aria-modal="true" aria-label="Xuất tài liệu">
      <h2>Xuất tài liệu</h2>

      <fieldset>
        <legend>Định dạng</legend>
        <label><input type="radio" bind:group={format} value="docx" /> Word (.docx) — bảng Word thật, ảnh, kiểu tiêu đề chuẩn</label>
        <label><input type="radio" bind:group={format} value="md" /> Markdown (.md) — một file, ảnh nhúng sẵn bên trong</label>
        <label><input type="radio" bind:group={format} value="zip" /> Markdown + thư mục ảnh (.zip) — file .md nhẹ, ảnh ở assets/</label>
      </fieldset>

      <fieldset>
        <legend>Phạm vi</legend>
        <label><input type="radio" bind:group={opts.scope} value="map" /> Cả map (kể cả nhánh trôi)</label>
        <label class:muted={!selectedNode}>
          <input type="radio" bind:group={opts.scope} value="branch" disabled={!selectedNode} />
          Chỉ nhánh đang chọn{#if selectedNode}: <strong>{selectedNode.text || "(không tên)"}</strong>{:else} (chọn một node trên map trước){/if}
        </label>
      </fieldset>

      <fieldset>
        <legend>Cấu trúc</legend>
        <label class="xd-row">
          Số cấp đầu làm tiêu đề
          <select bind:value={opts.headingDepth}>
            {#each [0, 1, 2, 3, 4, 5, 6] as d}<option value={d}>{d === 0 ? "Không (toàn danh sách)" : `${d} (H1${d > 1 ? `–H${d}` : ""})`}</option>{/each}
          </select>
        </label>
        <p class="xd-hint">Node sâu hơn thành danh sách gạch đầu dòng lồng nhau.</p>
        <label><input type="checkbox" bind:checked={opts.toc} disabled={opts.headingDepth === 0} /> Có mục lục</label>
      </fieldset>

      <fieldset>
        <legend>Nội dung kèm theo</legend>
        <label><input type="checkbox" bind:checked={opts.includeNotes} /> Ghi chú của node</label>
        <label><input type="checkbox" bind:checked={opts.includeCards} /> Nội dung card (văn bản, bảng)</label>
        <label class:muted={!opts.includeCards}><input type="checkbox" bind:checked={opts.includeImages} disabled={!opts.includeCards} /> Ảnh trong card</label>
      </fieldset>

      {#if stats}
        <p class="xd-stats">
          Sẽ gồm: {stats.headings} tiêu đề · {stats.listItems} mục danh sách · {stats.tables} bảng ({stats.tableRows} hàng) · {stats.images} ảnh
        </p>
      {/if}

      <div class="close-row xd-actions">
        <button type="button" class="btn" on:click={close}>Huỷ</button>
        <button type="button" class="btn primary" on:click={go}>Xuất…</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .xd { max-width: 520px; }
  .xd fieldset { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px 10px; margin: 0 0 10px; display: flex; flex-direction: column; gap: 5px; }
  .xd legend { font-size: 12px; font-weight: 600; color: #6b7280; padding: 0 4px; }
  .xd label { font-size: 13px; display: flex; gap: 6px; align-items: center; }
  .xd .muted { color: #9aa1ab; }
  .xd-row { justify-content: space-between; }
  .xd-hint { margin: 0; font-size: 11.5px !important; color: #9aa1ab !important; }
  .xd-stats { margin: 4px 0 0; font-size: 12.5px !important; color: #2f6fed !important; }
  .xd-actions { gap: 8px; }
</style>
