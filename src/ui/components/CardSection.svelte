<script lang="ts">
  /**
   * ui/components/CardSection.svelte
   * -------------------------------------------------------------------
   * M1 (Card & Block) — mục "Card" trong SidePanel cho node đang chọn:
   * tạo/gắn/gỡ/xoá card; nội dung card sửa trong CardEditor.svelte (dùng
   * chung với khung Thư viện từ H1).
   * M2 — bảng (TableEditorModal), M3 — ảnh (dán/kéo-thả/chọn file), xem
   * chi tiết trong CardEditor.
   * H1 — "Card này còn xuất hiện ở": các node khác đang gắn cùng card,
   * bấm để nhảy tới.
   * Quy tắc cũ vẫn giữ: mọi thay đổi chỉ qua Command (store.dispatch).
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { showConfirm } from "../dialog";
  import {
    CreateCardForNodeCommand,
    AttachCardToNodeCommand,
    DetachCardFromNodeCommand,
    DeleteCardCommand,
  } from "../../core/cardCommands";
  import { createCard } from "../../core/cards";
  import { cardUsages } from "../../core/library";
  import CardEditor from "./CardEditor.svelte";

  export let store: Store;
  export let nodeId: string;
  export let controller: AppController;

  const map = mapStore(store);

  $: node = $map.nodes[nodeId];
  $: card = node?.cardId ? $map.cards[node.cardId] ?? null : null;
  $: otherCards = Object.values($map.cards)
    .filter((c) => c.id !== node?.cardId)
    .sort((a, b) => a.title.localeCompare(b.title));
  $: elsewhere = card ? cardUsages($map, card.id).filter((id) => id !== nodeId) : [];

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
    <button type="button" class="btn small-btn card-open-page" title="Mở card thành trang tài liệu: văn bản, ảnh, bảng xen kẽ"
      on:click={() => card && controller.openCardPage(card.id)}>⤢ Mở dạng trang</button>
    <CardEditor {store} {controller} cardId={card.id} idPrefix="node-card" />
    {#if elsewhere.length > 0}
      <div class="card-usages">
        <span class="muted">Card này còn xuất hiện ở:</span>
        {#each elsewhere as id (id)}
          <button type="button" class="card-usage-link" on:click={() => controller.revealNode(id)}>{$map.nodes[id]?.text || "(node trống)"}</button>
        {/each}
      </div>
    {/if}
    <div class="card-add">
      <button type="button" class="btn small-btn" on:click={detach}>Gỡ khỏi node</button>
      <button type="button" class="btn danger small-btn" on:click={() => removeCard(card.id)}>Xoá card</button>
    </div>
  {/if}
</div>
