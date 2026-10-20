<script lang="ts">
  /** Thông báo ngắn ở góc dưới, tự ẩn sau vài giây (uiStores.showNotice). */
  import { noticeStore } from "../uiStores";
  let timer: ReturnType<typeof setTimeout> | undefined;
  $: if ($noticeStore) {
    clearTimeout(timer);
    const id = $noticeStore.id;
    timer = setTimeout(() => {
      if ($noticeStore?.id === id) noticeStore.set(null);
    }, 6000);
  }
</script>

{#if $noticeStore}
  <div class="toast" role="status">
    <span>{$noticeStore.text}</span>
    <button type="button" aria-label="Đóng" on:click={() => noticeStore.set(null)}>×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 3000;
    display: flex; gap: 10px; align-items: center; max-width: min(560px, calc(100vw - 32px));
    padding: 9px 12px; border-radius: 8px; background: #1f2937; color: #fff; font-size: 13px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  }
  .toast button { background: none; border: none; color: #cbd5e1; font-size: 16px; cursor: pointer; padding: 0 2px; }
</style>
