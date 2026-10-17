<script lang="ts">
  /**
   * ui/components/CardSection.svelte
   * -------------------------------------------------------------------
   * M1 (Card & Block) — mục "Card" trong SidePanel cho node đang chọn:
   * tạo/gắn/gỡ card, liệt kê và sắp xếp các khối nội dung. Ảnh nhiều
   * khối (M3), biểu đồ (M4) sẽ bổ sung sau.
   * M2 — bảng: bấm bản xem trước hoặc "Sửa bảng…" mở TableEditorModal
   * (qua tableEditorStore); "Nhập CSV…" thêm một khối bảng từ file.
   * Quy tắc cũ vẫn giữ: mọi thay đổi chỉ qua Command (store.dispatch),
   * input dùng value + on:change một chiều, không dùng bind:value.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import { mapStore } from "../svelteBridge";
  import { showAlert, showConfirm } from "../dialog";
  import { tableEditorStore } from "../uiStores";
  import { parseDelimited, tableFromGrid } from "../../core/table";
  import { generateBlockId } from "../../core/tree";
  import {
    CreateCardForNodeCommand,
    AttachCardToNodeCommand,
    DetachCardFromNodeCommand,
    DeleteCardCommand,
    RenameCardCommand,
    AddBlockCommand,
    ReplaceBlockCommand,
    RemoveBlockCommand,
    MoveBlockCommand,
  } from "../../core/cardCommands";
  import { createCard, createTextBlock, createTableBlock, summarizeBlock } from "../../core/cards";
  import type { Block } from "../../core/types";

  export let store: Store;
  export let nodeId: string;

  const map = mapStore(store);

  $: node = $map.nodes[nodeId];
  $: card = node?.cardId ? $map.cards[node.cardId] ?? null : null;
  $: otherCards = Object.values($map.cards)
    .filter((c) => c.id !== node?.cardId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const TYPE_LABEL: Record<Block["type"], string> = { text: "Văn bản", table: "Bảng", image: "Ảnh", chart: "Biểu đồ" };

  function createForNode(): void {
    const c = createCard(node?.text ?? "");
    store.dispatch(new CreateCardForNodeCommand(nodeId, c));
  }
  function attach(cardId: string): void {
    if (cardId) store.dispatch(new AttachCardToNodeCommand(nodeId, cardId));
  }
  function detach(): void {
    store.dispatch(new DetachCardFromNodeCommand(nodeId));
  }
  async function removeCard(cardId: string): Promise<void> {
    const users = Object.values($map.nodes).filter((n) => n.cardId === cardId).length;
    const ok = await showConfirm(
      `Xoá hẳn card này${users > 1 ? ` (đang gắn với ${users} node)` : ""}? Có thể hoàn tác bằng Ctrl+Z.`,
      "Xoá card"
    );
    if (ok) store.dispatch(new DeleteCardCommand(cardId));
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
  let csvInput: HTMLInputElement | undefined;
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

<div class="card-section">
  <div class="card-section-title">Card</div>
  {#if !card}
    <div class="card-empty">
      <button type="button" class="btn small-btn" on:click={createForNode}>+ Tạo card cho node</button>
      {#if otherCards.length > 0}
        <select class="card-attach" aria-label="Gắn card có sẵn"
          on:change={(e) => { attach(e.currentTarget.value); e.currentTarget.value = ""; }}>
          <option value="">Gắn card có sẵn…</option>
          {#each otherCards as c (c.id)}
            <option value={c.id}>{c.title || "(chưa đặt tên)"}</option>
          {/each}
        </select>
      {/if}
    </div>
  {:else}
    <div class="row">
      <label for="card-title">Tên card</label>
      <input id="card-title" type="text" placeholder="(chưa đặt tên)" value={card.title}
        on:change={(e) => { if (e.currentTarget.value !== card.title) store.dispatch(new RenameCardCommand(card.id, e.currentTarget.value)); }} />
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
            <textarea class="card-text" rows="3" placeholder="Nhập văn bản…" value={b.text}
              on:change={(e) => { if (e.currentTarget.value !== b.text) store.dispatch(new ReplaceBlockCommand(card.id, { ...b, text: e.currentTarget.value })); }}></textarea>
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
    </div>
    <div class="card-add">
      <button type="button" class="btn small-btn" on:click={detach}>Gỡ khỏi node</button>
      <button type="button" class="btn danger small-btn" on:click={() => removeCard(card.id)}>Xoá card</button>
    </div>
  {/if}
</div>
