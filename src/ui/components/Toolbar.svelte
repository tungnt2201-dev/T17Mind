<script lang="ts">
  /**
   * ui/components/Toolbar.svelte
   * -------------------------------------------------------------------
   * P2.1 — Thanh công cụ, chuyển từ HTML tĩnh + ui/toolbar.ts (đã xoá)
   * sang component Svelte.
   *
   * P2.15 — VIẾT LẠI HOÀN TOÀN phần hiển thị (bỏ ribbon nhiều tab kiểu
   * Office đã làm ở P2.1), theo yêu cầu trực tiếp: "số lượng công cụ
   * chưa nhiều, làm ribbon tốn thời gian thao tác — gộp thành 1 thanh
   * công cụ, bố trí khoa học, phong cách hiện đại tối giản, tham khảo
   * app T17 Timeline (cùng dòng T17) để nhất quán ngôn ngữ thiết kế".
   *
   * Cấu trúc mới — LUÔN HIỂN THỊ ĐẦY ĐỦ, không còn tab phải bấm chuyển:
   *  - HÀNG 1 (thanh chính): thương hiệu, hành động chính (Nhánh con —
   *    nút xanh nổi bật, giống "+ Note mới" của Timeline), Tìm kiếm/Map
   *    gần đây, rồi 3 menu thả xuống gộp các thao tác Tệp/Nhập/Xuất
   *    (mỗi menu gộp nhiều nút cũ lại — cùng kỹ thuật Timeline dùng cho
   *    "Dữ liệu ▾" để gộp nhiều thao tác dữ liệu vào một nút), cụm icon
   *    Explorer/Minimap/Trợ giúp bên phải (giống cụm icon phải cùng của
   *    Timeline: split-view/fullscreen/"?").
   *  - HÀNG 2 (công cụ theo ngữ cảnh làm việc): Hoàn tác/Làm lại, Vừa
   *    khung/Về gốc, Bố cục + nút MỚI "Sắp xếp lại" (auto-arrange) +
   *    Tự nhiên, Theme, các thao tác Chèn (Ghi chú/Liên kết/Tóm tắt/
   *    Khoanh vùng), các thao tác Cấu trúc (Sao chép/Nhân bản/Định
   *    dạng/Nhánh trôi/Tách nhánh/Xoá), menu thả xuống Hiển thị (gộp 3
   *    công tắc ẩn/hiện) — giống hàng điều khiển thứ 2 của Timeline
   *    (zoom/Tìm/Lọc/Bố trí ▾/Quan hệ ▾/Quy tắc ▾/Hiển thị ▾/Hợp lệ).
   *
   * TOÀN BỘ logic gọi AppController GIỮ NGUYÊN — chỉ đổi cách trình bày
   * và cách GOM NHÓM các nút đã có (không có id nút cũ nào bị tham
   * chiếu ở nơi khác trong mã nguồn — đã xác nhận lại bằng grep trước
   * khi viết, giống lần nâng cấp ribbon trước — nên đổi cấu trúc HTML ở
   * đây an toàn tuyệt đối với phần còn lại của ứng dụng).
   * -------------------------------------------------------------------
   */
  import { onMount, onDestroy } from "svelte";
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { mapStore, selectionStore } from "../svelteBridge";
  import { linkingModeStore, helpModalOpenStore, searchOpenStore, formatPainterModeStore, mapsModalOpenStore, explorerStore, minimapStore, hasLinkedFileStore, libraryStore, exportDocStore, paletteOpenStore, tagDbStore } from "../uiStores";
  import { THEMES } from "../../core/theme";
  import { customThemesStore } from "../userLibrary";
  import { settingsOfRoot } from "../../core/treeSettings";
  import { themeEditorStore } from "../uiStores";
  import { toggleShortcutsModal } from "../shortcutsModal";
  import Icon from "./Icon.svelte";
  import type { FileFormat } from "../../io/fileFormats";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;

  const map = mapStore(store);
  const sel = selectionStore(selection);

  // $map/$sel chỉ dùng để LÀM TÍN HIỆU kích hoạt tính lại — store.canUndo()
  // vẫn là nguồn sự thật thật sự (không nằm trong MindMap, không thể
  // "wrap" trực tiếp qua $map). Xem ghi chú trong core/store.ts.
  $: canUndo = $map ? store.canUndo() : false;
  $: canRedo = $map ? store.canRedo() : false;
  $: undoLabel = $map ? store.peekUndoLabel() : null;
  $: redoLabel = $map ? store.peekRedoLabel() : null;
  $: canDelete = $sel ? controller.canDelete() : false;
  $: canCreateSummary = $sel ? controller.canCreateSummary() : false;
  $: canCreateBoundary = $sel ? controller.canCreateBoundary() : false;
  $: canDetachToFloating = $sel ? controller.canDetachToFloating() : false;
  $: canStartFormatPainter = $sel ? $sel.selectedIds.size === 1 : false;
  // P2.14 — phụ thuộc CẢ $map (offset đổi sau khi bấm) LẪN $sel (đổi
  // phạm vi khi chọn node khác), khác các can* phía trên chỉ cần $sel.
  $: canAutoArrange = $map && $sel ? controller.canAutoArrange() : false;

  // Schema 22 — Bố cục / Theme / Tự nhiên áp dụng cho CÂY chứa node đang chọn (không chọn
  // node nào: cây chính). Mỗi cây (cây chính, mỗi nhánh trôi) có cài đặt riêng.
  $: treeRootId = $map && $sel ? controller.activeTreeRootId() : $map.rootId;
  $: treeSettings = settingsOfRoot($map, treeRootId);
  $: treeIsMain = treeRootId === $map.rootId;
  $: treeName = treeIsMain ? "Cây chính" : `Nhánh trôi “${clip($map.nodes[treeRootId]?.text || "(trống)")}”`;
  const clip = (t: string): string => (t.length > 18 ? `${t.slice(0, 17)}…` : t);

  let selectedThemeId = THEMES[0]!.id;
  // Ô chọn theme theo theme của cây đang chọn (đổi cây, mở map khác, áp theme riêng từ trình sửa…).
  let lastThemeKey: string | undefined = undefined;
  $: {
    const key = `${treeRootId}|${treeSettings.activeThemeId ?? ""}`;
    if (key !== lastThemeKey) {
      lastThemeKey = key;
      if (treeSettings.activeThemeId) selectedThemeId = treeSettings.activeThemeId;
    }
  }

  let jsonInput: HTMLInputElement;
  let jsonMergeInput: HTMLInputElement;
  let xlsxInput: HTMLInputElement;
  let xmindInput: HTMLInputElement;
  let opmlInput: HTMLInputElement;
  let mdInput: HTMLInputElement;
  let t17mInput: HTMLInputElement;

  function onImportJsonChange(): void {
    const file = jsonInput.files?.[0];
    jsonInput.value = "";
    if (file) void controller.importJson(file);
  }
  function onImportJsonMergeChange(): void {
    const file = jsonMergeInput.files?.[0];
    jsonMergeInput.value = "";
    if (file) void controller.importJsonMerge(file);
  }
  function onImportXlsxChange(): void {
    const file = xlsxInput.files?.[0];
    xlsxInput.value = "";
    if (file) void controller.importXlsx(file);
  }
  function onImportXmindChange(): void {
    const file = xmindInput.files?.[0];
    xmindInput.value = "";
    if (file) void controller.importXmind(file);
  }
  function onImportOpmlChange(): void {
    const file = opmlInput.files?.[0];
    opmlInput.value = "";
    if (file) void controller.importOpml(file);
  }
  function onImportT17mChange(): void {
    const file = t17mInput.files?.[0];
    t17mInput.value = "";
    if (file) void controller.importFile(file); // "Mở…" ở trình duyệt không có hộp thoại có đường dẫn
  }

  function toggleLinkMode(): void {
    controller.toggleLinkingMode();
  }

  // ---- P2.15: menu thả xuống (Tệp/Nhập/Xuất/Hiển thị) — trạng thái UI
  // THUẦN HIỂN THỊ, đóng/mở bằng cách bấm, tự đóng khi bấm ra ngoài. ----
  type MenuName = "file" | "import" | "export" | "display";
  let openMenu: MenuName | null = null;
  // Toạ độ panel tính bằng position:fixed theo toạ độ MÀN HÌNH của nút
  // vừa bấm — KHÔNG dùng position:absolute neo theo .menu-wrap (cách
  // "tự nhiên" ban đầu), vì .tbar-row cần overflow-x:auto để cuộn
  // ngang khi tràn (nhiều nút hơn bề ngang màn hình) — mà CSS quy định
  // hễ overflow-x khác "visible" thì overflow-y cũng tự động bị ép
  // thành "auto", nên mọi panel absolute neo bên trong hàng đó sẽ bị
  // CẮT MẤT theo chiều dọc, không cách nào thấy được (đã bắt lỗi này
  // bằng ảnh chụp Playwright: bấm nút thấy nút sáng lên đúng trạng thái
  // "đang mở" nhưng panel hoàn toàn không hiện ra). Tính toạ độ tuyệt
  // đối theo màn hình bằng getBoundingClientRect() của nút là cách né
  // triệt để, không phụ thuộc overflow của bất kỳ tổ tiên nào.
  let menuPos = { top: 0, left: 0 };

  function toggleMenu(name: MenuName, btn: HTMLElement): void {
    if (openMenu === name) {
      openMenu = null;
      return;
    }
    const rect = btn.getBoundingClientRect();
    // Kẹp left trong khung nhìn — nút Hiển thị đứng cuối hàng 2, panel
    // rộng ~200px+ neo thẳng theo rect.left dễ tràn ra ngoài mép phải
    // màn hình trên cửa sổ hẹp.
    const PANEL_MIN_WIDTH = 200;
    const left = Math.min(rect.left, window.innerWidth - PANEL_MIN_WIDTH - 8);
    menuPos = { top: rect.bottom + 4, left: Math.max(8, left) };
    openMenu = name;
  }
  function closeMenu(): void {
    openMenu = null;
  }
  /** Chạy một hành động rồi tự đóng menu — dùng cho các mục MENU HÀNH
   *  ĐỘNG (Tệp/Nhập/Xuất). KHÔNG dùng cho menu Hiển thị (công tắc bật/
   *  tắt — cố tình giữ menu mở để bật/tắt liên tiếp nhiều mục). */
  function runAndClose(action: () => void): void {
    action();
    closeMenu();
  }
  /** Nhập một định dạng: bản exe / Chrome-Edge dùng hộp thoại có đường dẫn
   *  (để thư mục lưu mặc định theo file vừa mở); trình duyệt khác dùng ô
   *  chọn file thường. */
  async function importVia(format: FileFormat, input: HTMLInputElement, merge = false): Promise<void> {
    if (!(await controller.openWithDialog([format], merge))) input.click();
  }
  function onWindowClick(e: MouseEvent): void {
    const target = e.target as HTMLElement | null;
    if (target && (target.closest(".menu-wrap") || target.closest(".menu-panel"))) return;
    openMenu = null;
  }
  function onWindowKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") openMenu = null;
  }
  // P2.15 — ĐÃ THỬ tự đóng menu khi cuộn (window.addEventListener("scroll",
  // ..., true)) để tránh toạ độ fixed bị lệch khỏi nút nếu người dùng
  // cuộn ngang .tbar-row trong lúc menu đang mở. BỎ LẠI vì bắt được lỗi
  // NGHIÊM TRỌNG HƠN nhiều khi kiểm bằng Playwright: bấm vào một nút mở
  // menu đang nằm NGOÀI vùng nhìn thấy của hàng cuộn ngang (ví dụ "Hiển
  // thị" ở cuối hàng 2) khiến trình duyệt tự cuộn nó vào khung nhìn
  // NGAY TRONG LÚC xử lý cú click — sự kiện 'scroll' đó (bắt được nhờ
  // capture:true) đóng menu NGAY LẬP TỨC, y hệt như chưa từng mở được.
  // Rủi ro nhỏ còn lại (menu lệch vị trí nếu chủ động cuộn hàng trong
  // lúc menu đang mở) chấp nhận được hơn hẳn so với "menu không mở
  // được" — nên chỉ còn đóng bằng bấm ra ngoài hoặc Esc.
  onMount(() => {
    window.addEventListener("click", onWindowClick);
    window.addEventListener("keydown", onWindowKeydown);
  });
  onDestroy(() => {
    window.removeEventListener("click", onWindowClick);
    window.removeEventListener("keydown", onWindowKeydown);
  });
</script>

<div id="toolbar">
  <div class="tbar-row tbar-row-main">
    <span class="tbar-brand"><span class="tbar-brand-mark"><Icon name="brand" size={13} /></span>T17Mind</span>

    <button class="tbar-btn primary" id="btn-add-child" on:click={() => controller.addChildToSelection()}>
      <Icon name="plus" /><span class="label">Nhánh con</span></button>

    <span class="tbar-sep"></span>

    <button class="tbar-btn" id="btn-palette" title="Tìm toàn Workspace và lệnh (Ctrl+K)" on:click={() => paletteOpenStore.set(true)}>
      <Icon name="command" /><span class="label">Tìm toàn bộ</span></button>
    <button class="tbar-btn" id="btn-search" title="Tìm kiếm trong map đang mở (Ctrl+F)" on:click={() => searchOpenStore.set(true)}>
      <Icon name="search" /><span class="label">Tìm kiếm</span></button>
    <button class="tbar-btn" id="btn-maps" title="Xem/mở/đổi tên/xoá các map đã lưu" on:click={() => mapsModalOpenStore.set(true)}>
      <Icon name="folder" /><span class="label">Map gần đây</span></button>

    <span class="tbar-sep"></span>

    <div class="menu-wrap">
      <button class="tbar-btn menu-btn" class:menu-open={openMenu === "file"} on:click={(e) => toggleMenu("file", e.currentTarget)}>
        <Icon name="file" /><span class="label">Tệp</span><span class="chevron">▾</span></button>
      {#if openMenu === "file"}
        <div class="menu-panel" style="top:{menuPos.top}px; left:{menuPos.left}px;">
          <button class="menu-item" on:click={() => runAndClose(() => controller.newMap())}>
            <Icon name="plus" />Mới</button>
          <button class="menu-item" title="Mở file .t17m / .json / .xlsx / .xmind / .opml — thay thế map đang mở. Thư mục lưu mặc định chuyển về thư mục của file này"
            on:click={() => runAndClose(() => void controller.openWithDialog().then((ok) => { if (!ok) t17mInput.click(); }))}>
            <Icon name="folder" />Mở…</button>
          <button class="menu-item" title={$hasLinkedFileStore ? "Ghi đè vào file đang mở (Ctrl+S)" : "Chọn thư mục, tên file và định dạng để lưu (Ctrl+S)"}
            on:click={() => runAndClose(() => void controller.save())}>
            <Icon name="save" />{$hasLinkedFileStore ? "Lưu" : "Lưu…"}<span class="menu-key">Ctrl+S</span></button>
          <button class="menu-item" title="Luôn hỏi thư mục, tên file và định dạng (.t17m giữ cả ảnh; .json; hoặc xuất .xlsx/.xmind/.md/.png…)"
            on:click={() => runAndClose(() => void controller.saveAs())}>
            <Icon name="package" />Lưu thành…<span class="menu-key">Ctrl+Shift+S</span></button>
        </div>
      {/if}
    </div>

    <div class="menu-wrap">
      <button class="tbar-btn menu-btn" class:menu-open={openMenu === "import"} on:click={(e) => toggleMenu("import", e.currentTarget)}>
        <Icon name="download" /><span class="label">Nhập</span><span class="chevron">▾</span></button>
      {#if openMenu === "import"}
        <div class="menu-panel" style="top:{menuPos.top}px; left:{menuPos.left}px;">
          <button class="menu-item" on:click={() => runAndClose(() => void importVia("json", jsonInput))}>
            <Icon name="download" />Nhập JSON</button>
          <button class="menu-item" title="Ghép thêm một file JSON khác vào map đang mở, thành (các) nhánh trôi mới — tự tránh trùng ID, gộp Tag theo tên, hoàn tác được bằng Ctrl+Z"
            on:click={() => runAndClose(() => void importVia("json", jsonMergeInput, true))}>
            <Icon name="plus" />Ghép JSON</button>
          <button class="menu-item" on:click={() => runAndClose(() => void importVia("xlsx", xlsxInput))}>
            <Icon name="table" />Nhập XLSX</button>
          <button class="menu-item" title="Nhập file .xmind (XMind Zen/2024+, cần có content.json bên trong) — thay thế map đang mở"
            on:click={() => runAndClose(() => void importVia("xmind", xmindInput))}>
            <Icon name="grid" />Nhập XMind</button>
          <button class="menu-item" title="Nhập file .opml (Workflowy, Dynalist, OmniOutliner...) — thay thế map đang mở"
            on:click={() => runAndClose(() => void importVia("opml", opmlInput))}>
            <Icon name="list" />Nhập OPML</button>
          <button class="menu-item" title="Nhập Markdown (.md): tiêu đề/danh sách thành node, đoạn văn thành ghi chú, bảng và ảnh nhúng thành card — thay thế map đang mở"
            on:click={() => runAndClose(() => void importVia("md", mdInput))}>
            <Icon name="doc-text" />Nhập Markdown</button>
          <div class="menu-sep"></div>
          <button class="menu-item" title="Xem quy tắc định dạng file JSON mà T17Mind hiểu được" id="btn-help"
            on:click={() => runAndClose(() => helpModalOpenStore.set(true))}>
            <Icon name="book" />Định dạng file...</button>
        </div>
      {/if}
    </div>

    <div class="menu-wrap">
      <button class="tbar-btn menu-btn" class:menu-open={openMenu === "export"} on:click={(e) => toggleMenu("export", e.currentTarget)}>
        <Icon name="upload" /><span class="label">Xuất</span><span class="chevron">▾</span></button>
      {#if openMenu === "export"}
        <div class="menu-panel" style="top:{menuPos.top}px; left:{menuPos.left}px;">
          <button class="menu-item" on:click={() => runAndClose(() => void controller.exportAs("json"))}>
            <Icon name="upload" />Xuất JSON</button>
          <button class="menu-item" on:click={() => runAndClose(() => void controller.exportAs("xlsx"))}>
            <Icon name="table" />XLSX</button>
          <button class="menu-item" title="Xuất ra file .xmind mở được bằng phần mềm XMind — không kèm màu chủ đề/hiệu ứng riêng của XMind, chỉ giữ cấu trúc/màu nền/ghi chú/Tag/quan hệ chéo cơ bản"
            on:click={() => runAndClose(() => void controller.exportAs("xmind"))}>
            <Icon name="grid" />XMind</button>
          <button class="menu-item" title="Xuất outline chuẩn (.opml) — mở được bằng Workflowy/Dynalist/OmniOutliner... chỉ gồm cấu trúc/ghi chú/checkbox, không kèm màu sắc/Tag"
            on:click={() => runAndClose(() => void controller.exportAs("opml"))}>
            <Icon name="list" />OPML</button>
          <button class="menu-item" title="Xuất thành tài liệu Word (.docx) hoặc Markdown (.md / .zip kèm ảnh): tiêu đề theo cấp, danh sách, ghi chú, nội dung card (văn bản, bảng, ảnh), mục lục"
            on:click={() => runAndClose(() => exportDocStore.set({ scope: "map" }))}>
            <Icon name="doc-text" />Tài liệu Word / Markdown…</button>
          <button class="menu-item" title="Xuất ảnh vector (.svg) — khung/màu/chữ/đường nối, không kèm Tag/checkbox/icon hay hiệu ứng Kiểu tự nhiên"
            on:click={() => runAndClose(() => void controller.exportAs("svg"))}>
            <Icon name="image" />SVG</button>
          <button class="menu-item" on:click={() => runAndClose(() => void controller.exportAs("png"))}>
            <Icon name="image" />PNG</button>
        </div>
      {/if}
    </div>

    <span class="tbar-spacer"></span>

    <button class="tbar-icon-btn chip" class:active={$explorerStore.open} title="Bật/tắt khung duyệt cây Explorer bên trái"
      on:click={() => explorerStore.update((s) => ({ ...s, open: !s.open }))}><Icon name="sidebar" /></button>
    <button class="tbar-icon-btn chip" class:active={$libraryStore.open} title="Bật/tắt Thư viện card — tìm, lọc card, kéo card thả vào map; Inbox cho card chưa gắn node"
      on:click={() => libraryStore.update((s) => ({ ...s, open: !s.open }))}><Icon name="book" /></button>
    <button class="tbar-icon-btn chip" class:active={$minimapStore.open} title="Bật/tắt Minimap — khung nhỏ hiện toàn bộ bản đồ, kéo thả vị trí và kích thước tự do"
      on:click={() => minimapStore.update((s) => ({ ...s, open: !s.open }))}><Icon name="map" /></button>
    <button class="tbar-icon-btn chip" title="Xem đầy đủ phím tắt" on:click={() => toggleShortcutsModal()}><Icon name="help-circle" /></button>
  </div>

  <div class="tbar-row tbar-row-tools">
    <div class="tbar-icon-group">
      <button class="tbar-icon-btn" title={undoLabel ? `Hoàn tác: ${undoLabel}` : "Không có gì để hoàn tác"}
        disabled={!canUndo} on:click={() => controller.undo()}><Icon name="undo" /></button>
      <button class="tbar-icon-btn" title={redoLabel ? `Làm lại: ${redoLabel}` : "Không có gì để làm lại"}
        disabled={!canRedo} on:click={() => controller.redo()}><Icon name="redo" /></button>
    </div>

    <span class="tbar-sep"></span>

    <button class="tbar-btn" title="Canh khung nhìn vừa khít mọi node đang hiển thị (phím tắt: F) — hữu ích ngay sau khi thu gọn một nhánh lớn, tránh còn sót khoảng trống cũ"
      on:click={() => controller.fitToView()}><Icon name="maximize" /><span class="label">Vừa khung</span></button>
    <button class="tbar-btn" title="Về node gốc — chọn + cuộn vào khung nhìn (phím tắt: Home)"
      on:click={() => controller.navigateHome()}><Icon name="home" /><span class="label">Về gốc</span></button>

    <span class="tbar-sep"></span>

    <span class="tbar-tree" class:floating={!treeIsMain}
      title="Bố cục, Tự nhiên và Theme bên cạnh áp dụng cho cây này — chọn node ở cây khác (cây chính hoặc một nhánh trôi) để chỉnh cây đó. Mỗi cây có cài đặt riêng.">⛭ {treeName}</span>
    <select id="layout-select" value={treeSettings.layoutType} title="Chọn kiểu bố cục cho cây đang chọn ({treeName})" class="tbar-select"
      on:change={(e) => controller.setLayoutType(e.currentTarget.value as "logicRight" | "logicLeft" | "logicBoth" | "treeDown" | "orgChart" | "treeUp")}>
      <option value="logicRight">Logic Right</option>
      <option value="logicLeft">Logic Left</option>
      <option value="logicBoth">Logic Both Sides</option>
      <option value="treeDown">Tree Down</option>
      <option value="orgChart">Organization Chart</option>
      <option value="treeUp">Tree Up</option>
    </select>
    <button class="tbar-btn" id="btn-auto-arrange" disabled={!canAutoArrange}
      title="Đưa các node đã bị kéo tay lệch khỏi vị trí bố cục tự động về lại đúng chỗ — có chọn node/nhánh nào thì chỉ gọn lại nhánh đó, không chọn gì thì gọn lại toàn bộ map. Giữ nguyên vị trí tổng thể của node gốc và mọi nhánh trôi trên canvas."
      on:click={() => controller.autoArrange()}>
      <Icon name="wand" /><span class="label">Sắp xếp lại</span></button>
    <button class="tbar-btn" class:active={treeSettings.organicEdges}
      title="Đường nối dạng dải băng thon dần (dày gần trung tâm, mỏng dần ra xa) thay vì nét đều một độ dày — chỉ áp cho cây đang chọn ({treeName}); không áp dụng cho Organization Chart (mặc định tắt)"
      on:click={() => controller.toggleOrganicEdges()}><Icon name="leaf" /><span class="label">Tự nhiên</span></button>

    <span class="tbar-sep"></span>

    <select id="theme-select" bind:value={selectedThemeId} title="Chọn bộ theme rồi bấm Áp dụng" class="tbar-select">
      <optgroup label="Có sẵn">
        {#each THEMES as theme (theme.id)}
          <option value={theme.id}>{theme.name}</option>
        {/each}
      </optgroup>
      {#if $customThemesStore.length > 0}
        <optgroup label="Theme của tôi">
          {#each $customThemesStore as theme (theme.id)}
            <option value={theme.id}>{theme.name}</option>
          {/each}
        </optgroup>
      {/if}
      {#if treeSettings.customTheme && !$customThemesStore.some((t) => t.id === treeSettings.customTheme?.id)}
        <optgroup label="Lưu trong map này">
          <option value={treeSettings.customTheme.id}>{treeSettings.customTheme.name}</option>
        </optgroup>
      {/if}
    </select>
    <button class="tbar-btn" title="Áp bộ theme đã chọn cho cây đang chọn ({treeName}) — các cây khác giữ nguyên"
      on:click={() => controller.applyTheme(selectedThemeId)}><Icon name="check" /><span class="label">Áp dụng</span></button>
    <button class="tbar-btn" title="Tạo / sửa theme riêng, nhập/xuất file theme"
      on:click={() => themeEditorStore.set({ baseThemeId: selectedThemeId })}>🎨<span class="label">Theme riêng</span></button>

    <span class="tbar-sep"></span>

    <button class="tbar-btn" on:click={() => controller.createStickyNote()} title="Thêm ghi chú dán tự do trên canvas">
      <Icon name="note" /><span class="label">Ghi chú</span></button>
    <button class="tbar-btn" class:active={$linkingModeStore} on:click={toggleLinkMode}>
      <Icon name="link" /><span class="label">Liên kết</span></button>
    <button class="tbar-btn" disabled={!canCreateSummary} on:click={() => controller.createSummaryFromSelection()}>
      <span class="icon icon-text">{"{ }"}</span><span class="label">Tóm tắt</span></button>
    <button class="tbar-btn" disabled={!canCreateBoundary}
      title="Nhóm trực quan (còn gọi là Khoanh vùng): gom các node ở bất kỳ nhánh nào vào một nhóm có nhãn và màu — mặc định vẽ bằng nhiều vùng bao ôm sát node, đổi sang chế độ Phân tán hoặc Hình chữ nhật trong khung bên phải"
      on:click={() => controller.createBoundaryFromSelection()}>
      <span class="icon icon-text">▭</span><span class="label">Nhóm trực quan</span></button>
    <button class="tbar-btn" on:click={() => tagDbStore.set({ tagId: null })}
      title="Cơ sở dữ liệu Tag: thêm thuộc tính cho Tag, xem node theo Bảng / Kanban / Biểu đồ, lọc, nhóm, xuất CSV/Excel">
      <span class="icon icon-text">▦</span><span class="label">Bảng Tag</span></button>

    <span class="tbar-sep"></span>

    <button class="tbar-btn" title="Sao chép (Ctrl+C)" on:click={() => controller.copySelection()}>
      <Icon name="copy" /><span class="label">Sao chép</span></button>
    <button class="tbar-btn" title="Nhân bản (Ctrl+D)" on:click={() => controller.duplicateSelection()}>
      <Icon name="duplicate" /><span class="label">Nhân bản</span></button>
    <button class="tbar-btn" class:active={$formatPainterModeStore}
      title="Sao chép định dạng: bấm node nguồn (đã chọn sẵn), rồi bấm các node đích liên tiếp — Esc để tắt"
      disabled={!canStartFormatPainter && !$formatPainterModeStore}
      on:click={() => ($formatPainterModeStore ? controller.stopFormatPainter() : controller.startFormatPainter())}>
      <Icon name="brush" /><span class="label">Định dạng</span></button>
    <button class="tbar-btn" title="Tạo nhánh trôi mới, không gắn vào cây chính" on:click={() => controller.createFloatingBranch()}>
      <Icon name="cloud" /><span class="label">Nhánh trôi</span></button>
    <button class="tbar-btn" title="Tách nhánh đang chọn khỏi cây chính" disabled={!canDetachToFloating}
      on:click={() => controller.detachSelectionToFloating()}>
      <Icon name="scissors" /><span class="label">Tách nhánh</span></button>
    <button class="tbar-btn danger" disabled={!canDelete} on:click={() => controller.deleteSelection()}>
      <Icon name="trash" /><span class="label">Xoá</span></button>

    <span class="tbar-spacer"></span>

    <div class="menu-wrap">
      <button class="tbar-btn menu-btn" class:menu-open={openMenu === "display"} on:click={(e) => toggleMenu("display", e.currentTarget)}>
        <Icon name="eye" /><span class="label">Hiển thị</span><span class="chevron">▾</span></button>
      {#if openMenu === "display"}
        <div class="menu-panel" style="top:{menuPos.top}px; left:{menuPos.left}px;">
          <button class="menu-item toggle" class:checked={$map.showEdgeLabels} title="Hiện/ẩn nhãn trên đường nối cha-con (mặc định tắt)"
            on:click={() => controller.toggleDisplayFlag("showEdgeLabels")}>
            <span class="check">{$map.showEdgeLabels ? "☑" : "☐"}</span><Icon name="tag" size={14} /> Nhãn cha-con</button>
          <button class="menu-item toggle" class:checked={$map.showRelationships} title="Hiện/ẩn liên kết chéo (mặc định bật)"
            on:click={() => controller.toggleDisplayFlag("showRelationships")}>
            <span class="check">{$map.showRelationships ? "☑" : "☐"}</span><Icon name="link" size={14} /> Liên kết chéo</button>
          <button class="menu-item toggle" class:checked={$map.showSummaries} title="Hiện/ẩn tóm tắt (mặc định bật)"
            on:click={() => controller.toggleDisplayFlag("showSummaries")}>
            <span class="check">{$map.showSummaries ? "☑" : "☐"}</span><span class="icon-text">{"{ }"}</span> Tóm tắt</button>
        </div>
      {/if}
    </div>
  </div>
</div>

<input bind:this={jsonInput} type="file" accept=".json,application/json" on:change={onImportJsonChange} style="display:none" />
<input bind:this={jsonMergeInput} type="file" accept=".json,application/json" on:change={onImportJsonMergeChange} style="display:none" />
<input bind:this={xlsxInput} type="file" accept=".xlsx,.xls" on:change={onImportXlsxChange} style="display:none" />
<input bind:this={xmindInput} type="file" accept=".xmind" on:change={onImportXmindChange} style="display:none" />
<input bind:this={opmlInput} type="file" accept=".opml,.xml" on:change={onImportOpmlChange} style="display:none" />
<input bind:this={t17mInput} type="file" accept=".t17m,.json,.xlsx,.xls,.xmind,.opml,.xml,.md,.markdown" on:change={onImportT17mChange} style="display:none" />
<input bind:this={mdInput} type="file" accept=".md,.markdown,text/markdown" on:change={() => { const f = mdInput.files?.[0]; mdInput.value = ""; if (f) void controller.importMarkdownDoc(f); }} style="display:none" />
