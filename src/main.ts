/**
 * main.ts — điểm khởi động ứng dụng.
 * ---------------------------------------------------------------------
 * Đây là NƠI DUY NHẤT trong toàn dự án được phép "biết" về cả năm lớp
 * (core, layout, render, ui, io) cùng lúc — nó ghép chúng lại với
 * nhau. Mọi module khác chỉ biết về các lớp NẰM DƯỚI nó theo quy tắc
 * phụ thuộc một chiều: ui -> render -> layout -> core.
 *
 * Luồng cập nhật:
 *   store thay đổi (thêm/xoá/sửa/hoàn tác...)
 *     -> tính lại layout đầy đủ (đo chữ + xếp vị trí)
 *     -> vẽ lại canvas
 *     -> tự lưu tạm vào localStorage
 *     (panel + toolbar giờ là component Svelte, TỰ vẽ lại qua
 *     svelteBridge.ts — không cần gọi refresh() thủ công nữa, xem P2.1)
 *
 *   selection thay đổi (chọn node khác, hover...)
 *     -> CHỈ vẽ lại canvas — không tính lại layout, không tự lưu, vì
 *        việc đang chọn gì không phải dữ liệu tài liệu.
 * ---------------------------------------------------------------------
 */
import "./style.css";
import { mount } from "svelte";
import { createEmptyMap } from "./core/tree";
import { Store } from "./core/store";
import { applyLayout } from "./layout";
import { setupPwaLaunchHandling } from "./ui/pwaLaunch";
import { CanvasRenderer } from "./render/CanvasRenderer";
import { SelectionModel } from "./ui/selection";
import { AppController } from "./ui/appController";
import { wireErrorBox } from "./ui/errorBox";
import { wireShortcutsModal } from "./ui/shortcutsModal";
import { linkingModeStore, viewVersionStore } from "./ui/uiStores";
import { byId } from "./ui/dom";
import { loadLastActiveMap, saveMap } from "./io/storage";
import { initWorkspace } from "./ui/workspaceController";
import ToolbarComponent from "./ui/components/Toolbar.svelte";
import SearchBarComponent from "./ui/components/SearchBar.svelte";
import MapsModalComponent from "./ui/components/MapsModal.svelte";
import SidePanelComponent from "./ui/components/SidePanel.svelte";
import HelpModalComponent from "./ui/components/HelpModal.svelte";
import ExplorerPanelComponent from "./ui/components/ExplorerPanel.svelte";
import MinimapPanelComponent from "./ui/components/MinimapPanel.svelte";
import TableEditorModalComponent from "./ui/components/TableEditorModal.svelte";
import ContextMenuComponent from "./ui/components/ContextMenu.svelte";
import LibraryPanelComponent from "./ui/components/LibraryPanel.svelte";
import CardPageModalComponent from "./ui/components/CardPageModal.svelte";
import ExportDocModalComponent from "./ui/components/ExportDocModal.svelte";

async function bootstrap(): Promise<void> {
  const canvas = byId<HTMLCanvasElement>("map-canvas");
  const renderer = new CanvasRenderer(canvas);

  // P1.11 — loadLastActiveMap() giờ ĐỌC QUA IndexedDB, bất đồng bộ
  // (khác localStorage đồng bộ trước đây) — bootstrap() phải chờ xong
  // mới khởi tạo Store/CanvasRenderer/AppController, nếu không sẽ lỡ
  // khởi tạo với map RỖNG rồi mới "biết" có map cũ cần khôi phục.
  // KW0 — gắn thư mục Workspace (nếu có) TRƯỚC, để map đầu tiên đọc từ đó.
  await initWorkspace();
  const initialMap = (await loadLastActiveMap()) ?? createEmptyMap("Chủ đề trung tâm");
  const store = new Store(initialMap);

  const selection = new SelectionModel();
  selection.selectSingleNode(initialMap.rootId);

  const controller = new AppController(
    canvas,
    store,
    selection,
    renderer,
    () => {
      updateStatusBar();
      viewVersionStore.update((n) => n + 1);
    },
    (active) => linkingModeStore.set(active)
  );

  // P1.15 (đóng gói PWA) — an toàn gọi cho CẢ 2 bản build (tự kiểm tra
  // API tồn tại trước khi dùng bên trong hàm này).
  setupPwaLaunchHandling(controller);

  // P2.1 — Toolbar, SidePanel, HelpModal giờ là component Svelte, tự
  // subscribe vào store/selection qua svelteBridge.ts và tự vẽ lại —
  // không cần giữ tham chiếu instance hay gọi .refresh() thủ công như
  // các lớp vanilla cũ.
  mount(ToolbarComponent, { target: byId("toolbar-root"), props: { store, selection, controller } });
  mount(SearchBarComponent, { target: byId("search-bar-root"), props: { store, controller } });
  mount(MapsModalComponent, { target: byId("maps-modal-root"), props: { store, controller } });
  mount(SidePanelComponent, { target: byId("side-panel-root"), props: { store, selection, controller } });
  mount(HelpModalComponent, { target: byId("help-modal-root"), props: {} });
  mount(ExplorerPanelComponent, { target: byId("explorer-panel-root"), props: { store, selection, controller } });
  mount(MinimapPanelComponent, { target: byId("minimap-panel-root"), props: { store, controller } });
  mount(TableEditorModalComponent, { target: byId("table-editor-root"), props: { store } });
  mount(ContextMenuComponent, { target: byId("context-menu-root"), props: {} });
  mount(LibraryPanelComponent, { target: byId("library-panel-root"), props: { store, selection, controller } });
  mount(CardPageModalComponent, { target: byId("card-page-root"), props: { store, controller } });
  mount(ExportDocModalComponent, { target: byId("export-doc-root"), props: { store, selection, controller } });

  // FIX: canvas đã được đo kích thước một lần trong constructor của
  // CanvasRenderer ở TRÊN — lúc đó Toolbar chưa kịp gắn vào DOM nên đo
  // sai (thanh công cụ trống, cao 0px). Đo lại NGAY BÂY GIỜ, sau khi cả
  // 3 component Svelte đã gắn xong và trình duyệt đã tính xong layout
  // thật — nếu thiếu bước này, bộ nhớ vẽ bên trong canvas lệch so với
  // kích thước hiển thị thật, biểu hiện ra ngoài là bấm/hover bị lệch
  // toạ độ theo chiều dọc.
  renderer.resize();
  controller.draw();

  wireErrorBox();
  wireShortcutsModal();

  function updateStatusBar(): void {
    const map = store.getMap();
    const count = Object.keys(map.nodes).length;
    const zoom = Math.round(controller.getView().scale * 100);
    byId("status").textContent = `${count} node · zoom ${zoom}%`;
  }

  function fullRefresh(): void {
    applyLayout(store.getMap(), renderer.getMeasurer(store.getMap()));
    controller.draw();
    updateStatusBar();
    void saveMap(store.getMap()); // P1.11 — fire-and-forget, saveMap() tự bọc lỗi bên trong, không cần await
  }

  function lightRefresh(): void {
    controller.draw();
  }

  // M3 — ảnh trên node giải mã xong (bất đồng bộ): vẽ lại; nếu trước đó
  // chưa biết kích thước ảnh thì tính lại layout (không cần tự lưu — dữ
  // liệu tài liệu không đổi).
  renderer.onImageReady = (relayout) => {
    if (relayout) applyLayout(store.getMap(), renderer.getMeasurer(store.getMap()));
    controller.draw();
  };

  store.subscribe(fullRefresh);
  selection.subscribe(lightRefresh);

  window.addEventListener("resize", () => {
    renderer.resize();
    controller.draw();
  });

  // Cảnh báo trước khi đóng tab nếu có gì đó chưa kịp tự lưu — tự lưu
  // đã chạy sau mỗi thay đổi nên trong thực tế hiếm khi kích hoạt,
  // nhưng vẫn là một lớp bảo vệ rẻ tiền đáng có.
  window.addEventListener("beforeunload", () => {
    void saveMap(store.getMap()); // P1.11 — fire-and-forget, saveMap() tự bọc lỗi bên trong, không cần await
  });

  fullRefresh();
}

void bootstrap();
