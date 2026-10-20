<script lang="ts">
  /**
   * ui/components/CardEditor.svelte
   * -------------------------------------------------------------------
   * Sửa NỘI DUNG một card theo id: tên, danh sách khối (văn bản, bảng,
   * ảnh…), thêm/sắp xếp/xoá khối. Dùng chung cho mục Card của node
   * (CardSection.svelte) và khung Thư viện (LibraryPanel.svelte — sửa
   * được cả card Inbox chưa gắn node nào). Tách ra từ CardSection (M1–M3)
   * ở bước H1.
   * Quy tắc giữ nguyên: mọi thay đổi chỉ qua Command (store.dispatch),
   * input dùng value + on:change một chiều, không dùng bind:value.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { showAlert } from "../dialog";
  import { tableEditorStore } from "../uiStores";
  import { parseDelimited, tableFromGrid } from "../../core/table";
  import { generateBlockId } from "../../core/tree";
  import {
    RenameCardCommand,
    AddBlockCommand,
    ReplaceBlockCommand,
    RemoveBlockCommand,
    MoveBlockCommand,
  } from "../../core/cardCommands";
  import { createTextBlock, createTableBlock, summarizeBlock } from "../../core/cards";
  import type { Block, ImageDisplaySize } from "../../core/types";
  import MentionTextarea from "./MentionTextarea.svelte";

  export let store: Store;
  export let controller: AppController;
  export let cardId: string;
  /** Tiền tố id cho ô nhập (hai CardEditor cùng lúc không trùng id). */
  export let idPrefix = "card";

  const map = mapStore(store);
  $: card = $map.cards[cardId] ?? null;

  const TYPE_LABEL: Record<Block["type"], string> = { text: "Văn bản", table: "Bảng", image: "Ảnh", chart: "Biểu đồ" };
  const SIZE_LABEL: Record<ImageDisplaySize, string> = { small: "Nhỏ", medium: "Vừa", large: "Lớn" };

  let imageInput: HTMLInputElement | undefined;
  let csvInput: HTMLInputElement | undefined;

  function addImages(e: Event): void {
    const input = e.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length > 0) void controller.addImagesToCard(cardId, files);
  }
  function imageSrc(assetId: string): string {
    const a = $map.assets[assetId];
    return a ? `data:${a.mimeType};base64,${a.dataBase64}` : "";
  }
  function addText(cardId: string): void {
    store.dispatch(new AddBlockCommand(cardId, createTextBlock("")));
  }
  function addTable(cardId: string): void {
    store.dispatch(new AddBlockCommand(cardId, createTableBlock(3, 3)));
  }
  function openTable(cardId: string, blockId: string): void {
    tableEditorStore.set({ cardId, blockId });
  }
  async function importCsv(cardId: string, e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const grid = parseDelimited((await file.text()).replace(/^\uFEFF/, ""));
    if (grid.length === 0) {
      void showAlert("File CSV trống.");
      return;
    }
    const block = tableFromGrid(generateBlockId(), grid, file.name.replace(/\.[^.]+$/, ""));
    store.dispatch(new AddBlockCommand(cardId, block));
  }
  function move(cardId: string, blockId: string, toIndex: number): void {
    store.dispatch(new MoveBlockCommand(cardId, blockId, toIndex));
  }
  function removeBlock(cardId: string, blockId: string): void {
    store.dispatch(new RemoveBlockCommand(cardId, blockId));
  }
</script>

{#if card}
  <div class="row">
    <label for="{idPrefix}-title">Tên card</label>
    <input id="{idPrefix}-title" type="text" placeholder="(chưa đặt tên)" value={card.title}
      on:change={(e) => { if (card && e.currentTarget.value !== card.title) store.dispatch(new RenameCardCommand(card.id, e.currentTarget.value)); }} />
  </div>

    {#if card.blocks.length === 0}
      <p class="muted">Card trống — thêm khối nội dung bên dưới.</p>
    {/if}

    <ol class="card-blocks">
      {#each card.blocks as b, i (b.id)}
        <li class="card-block">
          <div class="card-block-head">
            <span class="card-block-type">{TYPE_LABEL[b.type]}</span>
            <span class="card-block-actions">
              {#if b.type === "table"}
                <button type="button" class="btn small-btn" title="Mở trình sửa bảng"
                  on:click={() => openTable(card.id, b.id)}>Sửa…</button>
              {/if}
              <button type="button" class="btn small-btn" title="Lên" disabled={i === 0}
                on:click={() => move(card.id, b.id, i - 1)}>↑</button>
              <button type="button" class="btn small-btn" title="Xuống" disabled={i === card.blocks.length - 1}
                on:click={() => move(card.id, b.id, i + 1)}>↓</button>
              <button type="button" class="btn danger small-btn" title="Xoá khối"
                on:click={() => removeBlock(card.id, b.id)}>✕</button>
            </span>
          </div>
          {#if b.type === "text"}
            <MentionTextarea map={$map} cls="card-text" rows={3} placeholder="Nhập văn bản… (gõ @ hoặc [[ để liên kết card/node)"
              value={b.text} excludeCardId={card.id}
              on:commit={(e) => card && store.dispatch(new ReplaceBlockCommand(card.id, { ...b, text: e.detail }))} />
          {:else if b.type === "table"}
            <div class="card-table-preview" role="button" tabindex="0" title="Bấm để sửa bảng"
              on:click={() => openTable(card.id, b.id)}
              on:keydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openTable(card.id, b.id); } }}>
              <table><tbody>
                {#each b.cells.slice(0, 4) as row, r}
                  <tr>
                    {#each row.slice(0, 4) as cell}
                      {#if r === 0 && b.headerRow}<th>{cell}</th>{:else}<td>{cell}</td>{/if}
                    {/each}
                  </tr>
                {/each}
              </tbody></table>
              <span class="muted">{summarizeBlock(b)} — bấm để sửa</span>
            </div>
          {:else if b.type === "image"}
            <div class="card-image">
              <button type="button" class="card-image-thumb" title="Bấm để xem lớn"
                on:click={() => controller.openCardImages(card.id, b.id)}>
                <img src={imageSrc(b.assetId)} alt={b.caption || "Ảnh"} />
              </button>
              <div class="card-image-fields">
                <input type="text" placeholder="Chú thích…" value={b.caption} aria-label="Chú thích ảnh"
                  on:change={(e) => { if (e.currentTarget.value !== b.caption) store.dispatch(new ReplaceBlockCommand(card.id, { ...b, caption: e.currentTarget.value })); }} />
                <select value={b.size} aria-label="Cỡ hiển thị trên node"
                  on:change={(e) => store.dispatch(new ReplaceBlockCommand(card.id, { ...b, size: e.currentTarget.value as ImageDisplaySize }))}>
                  {#each Object.entries(SIZE_LABEL) as [v, label] (v)}
                    <option value={v}>Cỡ {label}</option>
                  {/each}
                </select>
              </div>
            </div>
          {:else}
            <div class="muted">{summarizeBlock(b)}</div>
          {/if}
        </li>
      {/each}
    </ol>

    <div class="card-add">
      <button type="button" class="btn small-btn" on:click={() => addText(card.id)}>+ Văn bản</button>
      <button type="button" class="btn small-btn" on:click={() => addTable(card.id)}>+ Bảng 3×3</button>
      <button type="button" class="btn small-btn" title="Thêm bảng từ file CSV/TSV (xuất từ Excel, Google Sheets)"
        on:click={() => csvInput?.click()}>Nhập CSV…</button>
      <input bind:this={csvInput} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden
        on:change={(e) => importCsv(card.id, e)} />
      <button type="button" class="btn small-btn" title="Thêm một hoặc nhiều ảnh (cũng có thể dán Ctrl+V hoặc kéo-thả ảnh lên node)"
        on:click={() => imageInput?.click()}>+ Ảnh…</button>
      <input bind:this={imageInput} type="file" accept="image/*" multiple hidden on:change={addImages} />
    </div>
{/if}
