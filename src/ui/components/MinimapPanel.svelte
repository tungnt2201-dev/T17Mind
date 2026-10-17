<script lang="ts">
  /**
   * ui/components/MinimapPanel.svelte
   * -------------------------------------------------------------------
   * P2.8b — khung nhỏ hiện TOÀN BỘ bản đồ thu nhỏ + khung chữ nhật biểu
   * diễn vùng đang xem trên khung nhìn CHÍNH. Vị trí kéo thả tự do
   * (mặc định góc dưới-phải), kích thước kéo đổi được cả 2 chiều.
   * Bấm bất kỳ đâu NGOÀI khung chữ nhật là NHẢY view tới đó; kéo ngay
   * TRÊN khung chữ nhật là PAN view theo.
   * -------------------------------------------------------------------
   */
  import { onMount } from "svelte";
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { minimapStore, viewVersionStore } from "../uiStores";
  import { byId } from "../dom";
  import { collectVisibleNodeIds } from "../../core/tree";
  import {
    computeMinimapGeometry,
    worldToMinimap,
    minimapToWorld,
    computeViewportWorldRect,
    type MinimapGeometry,
  } from "../minimapLogic";

  export let store: Store;
  export let controller: AppController;

  $: map = mapStore(store);

  const HEADER_HEIGHT = 26;
  const CONTROLS_HEIGHT = 22;

  let canvasEl: HTMLCanvasElement;
  let geometry: MinimapGeometry = { scale: 1, offsetX: 0, offsetY: 0 };

  onMount(() => {
    minimapStore.update((s) => {
      if (s.x !== null && s.y !== null) return s;
      const mainRect = byId("main").getBoundingClientRect();
      return { ...s, x: mainRect.width - s.width - 16, y: mainRect.height - s.height - 16 };
    });
  });

  $: if (canvasEl && $map) {
    $viewVersionStore;
    $minimapStore; // đăng ký TƯỜNG MINH làm dependency — đổi syncMode/width/height đều phải vẽ lại ngay, không phụ thuộc suy đoán việc Svelte có tự theo dõi được store đọc GIÁN TIẾP bên trong drawMinimap() hay không
    drawMinimap();
  }

  function drawMinimap(): void {
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;
    const w = $minimapStore.width;
    const h = $minimapStore.height - HEADER_HEIGHT - CONTROLS_HEIGHT;
    if (canvasEl.width !== w) canvasEl.width = w;
    if (canvasEl.height !== h) canvasEl.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#eef0f3";
    ctx.fillRect(0, 0, w, h);

    // P2.8b (nâng cấp theo yêu cầu) — "sync": chỉ lấy đúng những node
    // ĐANG HIỂN THỊ THẬT trên canvas (tôn trọng node.collapsed, dùng
    // lại ĐÚNG collectVisibleNodeIds đã có sẵn — không tự viết lại
    // logic duyệt cây). "independent": luôn lấy TOÀN BỘ, bất kể đang
    // thu gọn gì — đúng mặc định "luôn bung hết" đã yêu cầu.
    const visibleIds =
      $minimapStore.syncMode === "sync" ? new Set(collectVisibleNodeIds($map)) : new Set(Object.keys($map.nodes));
    const nodesToShow = Object.values($map.nodes).filter((n) => visibleIds.has(n.id));

    geometry = computeMinimapGeometry(nodesToShow, w, h, 8);

    for (const node of nodesToShow) {
      const topLeft = worldToMinimap(geometry, node.x, node.y);
      const width = Math.max(1.5, node.width * geometry.scale);
      const height = Math.max(1.5, node.height * geometry.scale);
      ctx.fillStyle = node.fill || "#b8c0cc";
      ctx.fillRect(topLeft.x, topLeft.y, width, height);
    }

    let mainCanvasRect: DOMRect;
    try {
      mainCanvasRect = byId("map-canvas").getBoundingClientRect();
    } catch {
      return;
    }
    const view = controller.getView();
    const viewportWorld = computeViewportWorldRect(view, mainCanvasRect.width, mainCanvasRect.height);
    const vpTopLeft = worldToMinimap(geometry, viewportWorld.left, viewportWorld.top);
    const vpBottomRight = worldToMinimap(geometry, viewportWorld.right, viewportWorld.bottom);
    ctx.strokeStyle = "#2f6fed";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpTopLeft.x, vpTopLeft.y, vpBottomRight.x - vpTopLeft.x, vpBottomRight.y - vpTopLeft.y);
    ctx.fillStyle = "rgba(47, 111, 237, 0.08)";
    ctx.fillRect(vpTopLeft.x, vpTopLeft.y, vpBottomRight.x - vpTopLeft.x, vpBottomRight.y - vpTopLeft.y);
  }

  function close(): void {
    minimapStore.update((s) => ({ ...s, open: false }));
  }

  let panning = false;
  let panStartMM = { x: 0, y: 0 };

  function onCanvasMouseDown(e: MouseEvent): void {
    const rect = canvasEl.getBoundingClientRect();
    const mmX = e.clientX - rect.left;
    const mmY = e.clientY - rect.top;
    const worldPt = minimapToWorld(geometry, mmX, mmY);
    controller.setViewCenter(worldPt.x, worldPt.y);
    panning = true;
    panStartMM = { x: mmX, y: mmY };
    e.preventDefault();
  }

  let movingPanel = false;
  let moveStartClient = { x: 0, y: 0 };
  let moveStartPos = { x: 0, y: 0 };

  function onHeaderMouseDown(e: MouseEvent): void {
    movingPanel = true;
    moveStartClient = { x: e.clientX, y: e.clientY };
    moveStartPos = { x: $minimapStore.x ?? 0, y: $minimapStore.y ?? 0 };
    e.preventDefault();
  }

  let resizing = false;
  let resizeStartClient = { x: 0, y: 0 };
  let resizeStartSize = { width: 0, height: 0 };

  function onResizeMouseDown(e: MouseEvent): void {
    resizing = true;
    resizeStartClient = { x: e.clientX, y: e.clientY };
    resizeStartSize = { width: $minimapStore.width, height: $minimapStore.height };
    e.preventDefault();
  }

  function onWindowMouseMove(e: MouseEvent): void {
    if (panning) {
      const rect = canvasEl.getBoundingClientRect();
      const mmX = e.clientX - rect.left;
      const mmY = e.clientY - rect.top;
      const dxMM = mmX - panStartMM.x;
      const dyMM = mmY - panStartMM.y;
      if (dxMM !== 0 || dyMM !== 0) {
        controller.panViewByWorldDelta(dxMM / geometry.scale, dyMM / geometry.scale);
        panStartMM = { x: mmX, y: mmY };
      }
      return;
    }
    if (movingPanel) {
      const dx = e.clientX - moveStartClient.x;
      const dy = e.clientY - moveStartClient.y;
      // SỬA LỖI (người dùng báo "bám trục ngang", không kéo Y được):
      // trước đây lấy kích thước từ `panelEl.parentElement`
      // (#minimap-panel-root) — một div RỖNG, con của nó là
      // position:absolute nên KHÔNG đóng góp gì vào chiều cao của div
      // cha (đặc tính CSS bình thường của absolute positioning) —
      // mainRect.height gần như luôn = 0, khiến maxY = 0 - 26 = ÂM,
      // và Math.max(0, Math.min(số ÂM, ...)) LUÔN LUÔN ra đúng 0 — Y
      // bị kẹp cứng về 0 bất kể kéo bao nhiêu, chỉ X di chuyển được.
      // Dùng ĐÚNG `#main` (có kích thước thật) — giống hệt cách
      // onMount() ở trên đã tính vị trí mặc định, tránh 2 nơi tính
      // khác công thức nhau.
      const mainRect = byId("main").getBoundingClientRect();
      const maxX = mainRect.width - 60;
      const maxY = mainRect.height - HEADER_HEIGHT;
      minimapStore.update((s) => ({
        ...s,
        x: Math.max(0, Math.min(maxX, moveStartPos.x + dx)),
        y: Math.max(0, Math.min(maxY, moveStartPos.y + dy)),
      }));
      return;
    }
    if (resizing) {
      const dx = e.clientX - resizeStartClient.x;
      const dy = e.clientY - resizeStartClient.y;
      minimapStore.update((s) => ({
        ...s,
        width: Math.max(140, Math.min(500, resizeStartSize.width + dx)),
        height: Math.max(110, Math.min(400, resizeStartSize.height + dy)),
      }));
    }
  }
  function onWindowMouseUp(): void {
    panning = false;
    movingPanel = false;
    resizing = false;
  }
</script>

<svelte:window on:mousemove={onWindowMouseMove} on:mouseup={onWindowMouseUp} />

{#if $minimapStore.open && $minimapStore.x !== null && $minimapStore.y !== null}
  <div
    id="minimap-panel"
    style="left:{$minimapStore.x}px; top:{$minimapStore.y}px; width:{$minimapStore.width}px; height:{$minimapStore.height}px"
  >
    <div
      class="minimap-header"
      role="button"
      tabindex="0"
      aria-label="Kéo để di chuyển vị trí Minimap"
      on:mousedown={onHeaderMouseDown}
    >
      <span class="title">🗺 Minimap</span>
      <button type="button" class="close-btn" on:click={close} title="Đóng Minimap">✕</button>
    </div>
    <div class="minimap-controls">
      <button
        type="button"
        class:active={$minimapStore.syncMode === "sync"}
        title="Chỉ vẽ đúng phần đang hiển thị thật trên canvas (tôn trọng nhánh đang thu gọn)"
        on:click={() => minimapStore.update((s) => ({ ...s, syncMode: "sync" }))}
      >Đồng bộ</button>
      <button
        type="button"
        class:active={$minimapStore.syncMode === "independent"}
        title="Luôn hiện toàn bộ bản đồ, bỏ qua trạng thái thu gọn trên canvas"
        on:click={() => minimapStore.update((s) => ({ ...s, syncMode: "independent" }))}
      >Độc lập</button>
    </div>
    <canvas
      bind:this={canvasEl}
      class="minimap-canvas"
      on:mousedown={onCanvasMouseDown}
    ></canvas>
    <div
      class="minimap-resize-handle"
      role="slider"
      aria-orientation="horizontal"
      aria-label="Kéo để đổi kích thước Minimap"
      aria-valuenow={$minimapStore.width}
      aria-valuemin={140}
      aria-valuemax={500}
      tabindex="0"
      on:mousedown={onResizeMouseDown}
    ></div>
  </div>
{/if}

<style>
  #minimap-panel {
    position: absolute;
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(20, 22, 30, 0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    z-index: 50;
  }
  .minimap-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    padding: 0 8px;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    cursor: move;
    flex: none;
  }
  .minimap-header .title {
    font-size: 11px;
    font-weight: 600;
    color: var(--muted);
  }
  .close-btn {
    border: none;
    background: none;
    cursor: pointer;
    font-size: 11px;
    color: var(--muted);
    padding: 0 3px;
  }
  .close-btn:hover {
    color: var(--text);
  }
  .minimap-controls {
    display: flex;
    flex: none;
    border-bottom: 1px solid var(--border);
  }
  .minimap-controls button {
    flex: 1;
    border: none;
    background: #fff;
    padding: 3px 4px;
    font-size: 10px;
    cursor: pointer;
    color: var(--muted);
  }
  .minimap-controls button:first-child {
    border-right: 1px solid var(--border);
  }
  .minimap-controls button.active {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }
  .minimap-canvas {
    flex: 1;
    display: block;
    cursor: crosshair;
  }
  .minimap-resize-handle {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(135deg, transparent 50%, var(--border) 50%, var(--border) 60%, transparent 60%, transparent 70%, var(--border) 70%, var(--border) 80%, transparent 80%);
  }
</style>
