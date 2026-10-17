<script lang="ts">
  /**
   * ui/components/SearchBar.svelte
   * -------------------------------------------------------------------
   * Bù nợ P1.10 — ô tìm kiếm nổi trên canvas. Mở bằng Ctrl+F (chặn ở
   * AppController#onActionKeyDown) hoặc nút trên Toolbar. Gõ từ khoá,
   * Enter nhảy tới kết quả đầu tiên; Enter tiếp nhảy sang kết quả kế
   * tiếp, quay vòng lại đầu khi hết danh sách. Esc đóng.
   *
   * Lõi tìm (core/search.ts) thuần tuý, không biết gì về UI — component
   * này chỉ gọi searchNodes() rồi giao việc CHỌN + BUNG NHÁNH + CUỘN
   * cho AppController#revealNode(), không tự làm những việc đó ở đây.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { searchNodes } from "../../core/search";
  import { searchOpenStore } from "../uiStores";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  let query = "";
  let currentIndex = -1;
  let lastQuery = "";
  let inputEl: HTMLInputElement | undefined;

  $: matches = searchNodes($map, query);
  // Đổi từ khoá thì phải quên vị trí đang đứng — Enter lần đầu của một
  // từ khoá MỚI luôn nhảy tới kết quả đầu tiên, không tiếp tục đúng
  // chỗ của từ khoá trước đó.
  $: if (query !== lastQuery) {
    currentIndex = -1;
    lastQuery = query;
  }

  function jumpToNext(): void {
    if (matches.length === 0) return;
    currentIndex = (currentIndex + 1) % matches.length;
    const id = matches[currentIndex];
    if (id) controller.revealNode(id);
  }

  function close(): void {
    searchOpenStore.set(false);
    query = "";
    currentIndex = -1;
    lastQuery = "";
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      jumpToNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    e.stopPropagation(); // không để phím tắt toàn cục (Tab, Delete...) bắt nhầm khi đang gõ
  }

  // Mở ô thì tự focus ngay — không bắt người dùng phải bấm chuột vào
  // trước khi gõ được.
  $: if ($searchOpenStore && inputEl) {
    inputEl.focus();
  }
</script>

{#if $searchOpenStore}
  <div class="search-bar">
    <span class="search-icon">🔍</span>
    <input
      bind:this={inputEl}
      type="text"
      placeholder="Tìm nội dung hoặc ghi chú… (Enter để nhảy)"
      bind:value={query}
      on:keydown={onKeydown}
    />
    <span class="search-count">
      {#if query.trim() === ""}
        &nbsp;
      {:else if matches.length === 0}
        Không có kết quả
      {:else}
        {currentIndex + 1}/{matches.length}
      {/if}
    </span>
    <button type="button" class="search-close" on:click={close} title="Đóng (Esc)">×</button>
  </div>
{/if}

<style>
  .search-bar {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 8px;
    background: #ffffff;
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(20, 22, 30, 0.1);
    padding: 7px 10px;
    z-index: 1300;
    min-width: 320px;
  }
  .search-icon {
    font-size: 13px;
    opacity: 0.6;
  }
  .search-bar input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 13px;
    font-family: inherit;
  }
  .search-count {
    font-size: 11.5px;
    color: var(--muted);
    white-space: nowrap;
  }
  .search-close {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
    padding: 0 2px;
  }
  .search-close:hover {
    color: var(--accent);
  }
</style>
