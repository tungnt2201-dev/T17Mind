<script lang="ts">
  /**
   * ui/components/ContextMenu.svelte
   * -------------------------------------------------------------------
   * Menu chuột phải (mở qua contextMenuStore, danh sách mục từ
   * ui/contextMenuModel.ts). Đóng khi chọn mục, bấm ra ngoài, Esc, cuộn
   * chuột, đổi cỡ cửa sổ. ↑/↓ + Enter chọn bằng bàn phím. Trong lúc mở,
   * phím bấm bị chặn ở pha capture để phím tắt canvas không chạy nhầm.
   * -------------------------------------------------------------------
   */
  import { onDestroy, tick } from "svelte";
  import { contextMenuStore } from "../uiStores";
  import { placeMenu, type MenuAction } from "../contextMenuModel";

  let menuEl: HTMLDivElement | undefined;
  let pos = { left: 0, top: 0 };
  let focusIndex = -1;

  $: state = $contextMenuStore;
  $: items = state ? state.entries : [];
  $: enabledIdx = items.flatMap((e, i) => (e.kind === "item" && !e.disabled ? [i] : []));
  $: if (state) void open();

  async function open(): Promise<void> {
    if (!state) return;
    focusIndex = -1;
    pos = { left: state.x, top: state.y };
    await tick();
    if (!menuEl || !state) return;
    pos = placeMenu(state.x, state.y, menuEl.offsetWidth, menuEl.offsetHeight, window.innerWidth, window.innerHeight);
    attach();
  }

  function close(): void {
    contextMenuStore.set(null);
    detach();
  }

  function pick(action: MenuAction): void {
    const s = state;
    close();
    s?.onPick(action);
  }

  function onKey(e: KeyboardEvent): void {
    e.stopImmediatePropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (enabledIdx.length === 0) return;
      const at = enabledIdx.indexOf(focusIndex);
      const next = e.key === "ArrowDown" ? (at + 1) % enabledIdx.length : (at - 1 + enabledIdx.length) % enabledIdx.length;
      focusIndex = enabledIdx[at < 0 && e.key === "ArrowUp" ? enabledIdx.length - 1 : next] ?? -1;
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = items[focusIndex];
      if (entry?.kind === "item" && !entry.disabled) pick(entry.action);
    }
  }
  function onOutside(e: Event): void {
    if (e.target instanceof Node && menuEl?.contains(e.target)) return;
    close();
  }
  let attached = false;
  function attach(): void {
    if (attached) return;
    attached = true;
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onOutside, true);
    window.addEventListener("wheel", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
  }
  function detach(): void {
    if (!attached) return;
    attached = false;
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("mousedown", onOutside, true);
    window.removeEventListener("wheel", close, true);
    window.removeEventListener("resize", close);
    window.removeEventListener("blur", close);
  }
  onDestroy(detach);
</script>

{#if state}
  <div class="ctx-menu" role="menu" tabindex="-1" bind:this={menuEl} style="left:{pos.left}px;top:{pos.top}px"
    on:contextmenu|preventDefault>
    {#each items as entry, i}
      {#if entry.kind === "separator"}
        <div class="ctx-sep" role="separator"></div>
      {:else}
        <button type="button" role="menuitem" class="ctx-item" class:danger={entry.danger} class:focused={i === focusIndex}
          disabled={entry.disabled} on:mouseenter={() => (focusIndex = i)} on:click={() => pick(entry.action)}>
          <span class="ctx-label">{entry.label}</span>
          {#if entry.shortcut}<span class="ctx-key">{entry.shortcut}</span>{/if}
        </button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .ctx-menu {
    position: fixed; z-index: 2500; min-width: 220px; padding: 4px; background: #fff;
    border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
    font-size: 13px; outline: none; user-select: none;
  }
  .ctx-item {
    display: flex; width: 100%; align-items: center; gap: 16px; padding: 6px 10px; border: none; border-radius: 5px;
    background: transparent; color: #1f2933; text-align: left; cursor: pointer; font: inherit;
  }
  .ctx-item.focused:not(:disabled) { background: #eef3fe; }
  .ctx-item:disabled { color: #b0b6bf; cursor: default; }
  .ctx-item.danger:not(:disabled) { color: #c0392b; }
  .ctx-label { flex: 1; }
  .ctx-key { color: #9aa1ab; font-size: 11.5px; }
  .ctx-sep { height: 1px; margin: 4px 6px; background: #eef0f3; }
</style>
