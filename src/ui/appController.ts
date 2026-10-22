/**
 * ui/appController.ts
 * ---------------------------------------------------------------------
 * Nơi mọi hành động của người dùng (chuột, bàn phím) biến thành một
 * Command rồi gửi qua store.dispatch()/beginSession()/updateSession().
 * File này KHÔNG BAO GIỜ sửa map trực tiếp — xem lại core/commands.ts
 * nếu quên vì sao quy tắc này quan trọng.
 *
 * Trạng thái sở hữu ở đây là trạng thái GIAO DIỆN thuần tuý, không
 * phải dữ liệu tài liệu: khung nhìn (view), đang kéo gì, đang ở chế độ
 * tạo liên kết hay không, clipboard nội bộ. Không cái nào trong số này
 * được lưu xuống file hay có trong lịch sử hoàn tác.
 * ---------------------------------------------------------------------
 */
import type { ImageAsset, MindNode, MindMap } from "../core/types";
import { isVerticalLayout } from "../core/types";
import type { NodeStylePatch } from "../core/commands";
import type { MapDisplayFlag } from "../core/commands";
import type { LayoutType } from "../core/types";
import { createEmptyMap, requireNode, getRootIds, generateId, getAutoArrangeTargetIds } from "../core/tree";
import type { Store } from "../core/store";
import type { SelectionModel } from "./selection";
import {
  CanvasRenderer,
  type ViewTransform,
  type SelectionState,
  type DragPreview,
  type SearchPulse,
} from "../render/CanvasRenderer";
import { computeDropTarget, summaryGeometry, findVisuallyNearestNode, type DropTarget } from "../render/geometry";
import {
  AddChildCommand,
  UpdateTextCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  ToggleCollapseCommand,
  CycleCollapseLevelCommand,
  ExpandAllCommand,
  SetNodeOffsetCommand,
  SetNodeSizeCommand,
  SetRelationshipBendCommand,
  AddRelationshipCommand,
  UpdateRelationshipCommand,
  DeleteRelationshipCommand,
  AddSummaryCommand,
  UpdateSummaryCommand,
  DeleteSummaryCommand,
  AddBoundaryCommand,
  CreateFloatingBranchCommand,
  MergeMapCommand,
  DetachToFloatingCommand,
  AddStickyNoteCommand,
  DeleteStickyNoteCommand,
  UpdateStickyNoteCommand,
  SetStickyNotePositionCommand,
  ApplyThemeCommand,
  ToggleMapDisplayFlagCommand,
  SetLayoutTypeCommand,
  extractFormatPatch,
  UpdateNodeStyleCommand,
  UpdateBoundaryCommand,
  DeleteBoundaryCommand,
  DuplicateNodeCommand,
  PasteSubtreeCommand,
  CompositeCommand,
  type Command,
  SetNodeImageCommand,
} from "../core/commands";
import {
  nodeToClipboardNode,
  forestToIndentedText,
  parseIndentedText,
  type ClipboardNode,
} from "../core/clipboard";
import { startInlineEdit, startInlineEditMultiline, isEditing, cancelInlineEdit } from "./editingInput";
import { writeSystemClipboard } from "./clipboardBridge";
import { downloadText, downloadBlob, byId } from "./dom";
import { showErrors } from "./errorBox";
import { showConfirm, showAlert, showImagePreview, showImageGallery } from "./dialog";
import { imageFilesFrom, prepareImageFile } from "./imageImport";
import {
  buildAddImagesToNodeCommand,
  buildAddImagesToCardCommand,
  CreateCardForNodeCommand,
  CreateNodeWithCardCommand,
  ImportCardCommand,
  AttachCardToNodeCommand,
} from "../core/cardCommands";
import { createCard } from "../core/cards";
import { buildMenu, type MenuAction, type MenuTarget } from "./contextMenuModel";
import { CARD_DRAG_TYPE } from "./uiStores";
import { getNodeImageBlocks } from "../render/imageThumb";
import { getNodeThumbTable } from "../render/tableThumb";
import { cardImageBlocks, formatBytes, MAP_ASSETS_WARN_BYTES, totalAssetBytes } from "../core/image";
import { toSafeUrl } from "../core/safeUrl";
import { toggleShortcutsModal } from "./shortcutsModal";
import {
  searchOpenStore,
  paletteOpenStore,
  formatPainterModeStore,
  hasLinkedFileStore,
  tableEditorStore,
  contextMenuStore,
  cardPageStore,
  exportDocStore,
} from "./uiStores";
import { parseJsonFile, exportFlatJson } from "../io/json";
import { loadMap as loadMapFromStorage, getWorkspaceRepo } from "../io/storage";
// P1.16 (tối ưu bundle) — xlsx/xmind KHÔNG import tĩnh ở đây nữa, xem
// ghi chú ngay trước từng phương thức dùng chúng bên dưới.
import { renderMarkdown } from "../io/markdownDoc";
import type { Theme } from "../core/theme";
import { buildDocModel, DEFAULT_DOC_OPTIONS, type DocOptions } from "../core/docModel";
import { exportSvg } from "../io/svg";
import { exportOpml, parseOpmlFile } from "../io/opml";
import { isFileSystemAccessSupported, pickSaveHandle, writeToHandle, pickOpenHandle } from "../io/fileSystemAccess";
import { isDesktopApp, appDir, nativeSaveDialog, nativeOpenDialog, nativeWriteFile, nativeReadFile } from "../io/nativeFs";
import {
  FORMATS,
  formatOrder,
  formatFromPath,
  ensureExtension,
  dirOf,
  baseName,
  joinPath,
  suggestBaseName,
  type FileFormat,
} from "../io/fileFormats";

type DragMode =
  | "pan"
  | "node-drag-pending"
  | "node-drag"
  | "resize"
  | "marquee"
  | "rel-bend"
  | "sticky-drag-pending"
  | "sticky-drag"
  | null;

const CLICK_THRESHOLD_PX = 3;

export class AppController {
  private view: ViewTransform = { offsetX: 90, offsetY: 300, scale: 1 };
  /** P1.12 — file thật trên đĩa đang liên kết với map hiện tại, nếu
   *  có (qua "Lưu file..."/"Mở file..."). CHỈ tồn tại trong phiên làm
   *  việc hiện tại — xem ghi chú đầu io/fileSystemAccess.ts. */
  /** File thật đang liên kết với map (sau "Lưu"/"Lưu thành…"/"Mở…" một
   *  file .t17m/.json): Ctrl+S ghi thẳng vào đó. Bản exe giữ đường dẫn,
   *  trình duyệt (Chrome/Edge) giữ handle của File System Access API. */
  private linkedFile:
    | { kind: "path"; path: string; format: FileFormat }
    | { kind: "handle"; handle: FileSystemFileHandle; format: FileFormat }
    | null = null;
  /** M5 — tuỳ chọn xuất tài liệu (.docx / .md / .zip) lần gần nhất. */
  private docOptions: DocOptions = { ...DEFAULT_DOC_OPTIONS };
  /** Bản exe: thư mục mặc định của hộp thoại Lưu/Mở trong phiên này —
   *  ban đầu là thư mục chứa T17Mind.exe, đổi theo file vừa mở/nhập/lưu. */
  private lastDir: string | null = null;

  private dragMode: DragMode = null;
  private dragStartScreen = { x: 0, y: 0 };
  private dragMoved = false;

  // node-drag (tự do + đổi cấu trúc)
  private draggedNodeId: string | null = null;
  private offsetCommand: SetNodeOffsetCommand | null = null;
  private offsetStartValue = { x: 0, y: 0 };
  private offsetStartWorld = { x: 0, y: 0 };
  private dropTargetPreview: DropTarget | null = null;

  // resize
  private resizeNodeId: string | null = null;
  private sizeCommand: SetNodeSizeCommand | null = null;

  // P2.5b — kéo ghi chú dán: đơn giản hơn node-drag hẳn, vì ghi chú
  // dán không có khái niệm "thả vào node khác để đổi cấu trúc" — chỉ
  // có kéo tự do, x/y là TOẠ ĐỘ TUYỆT ĐỐI (không phải offset cộng dồn
  // từ cha, vì ghi chú dán không có cha).
  private draggedStickyNoteId: string | null = null;
  private stickyPositionCommand: SetStickyNotePositionCommand | null = null;
  private stickyStartValue = { x: 0, y: 0 };
  private stickyStartWorld = { x: 0, y: 0 };
  private resizeStartSize = { w: 0, h: 0 };

  // uốn đường liên kết
  private bendCommand: SetRelationshipBendCommand | null = null;

  // pan
  private panStart = { x: 0, y: 0 };
  private spaceDown = false;

  // marquee (chọn vùng)
  private marqueeAdditive = false;
  private marqueeCurrentScreen = { x: 0, y: 0 };

  // chế độ tạo liên kết
  private linkingMode = false;
  // Đồng bộ MỘT CHIỀU từ searchOpenStore (Svelte) — chỉ để phím Esc
  // toàn cục biết có cần đóng ô tìm kiếm hay không. Không viết ngược
  // lại giá trị này vào store, luôn đọc qua searchOpenStore.set().
  private searchIsOpen = false;
  // P2.6 — chế độ "sao chép định dạng": đã bấm nguồn (formatPainterPatch
  // khác null) thì mọi lần bấm node tiếp theo áp patch đó, GIỮ CHẾ ĐỘ
  // (không tự tắt sau 1 lần) cho tới khi bấm Esc.
  private formatPainterPatch: NodeStylePatch | null = null;
  // P1.10 — trạng thái vòng nhấp nháy quanh kết quả tìm kiếm vừa nhảy
  // tới, và tay cầm requestAnimationFrame để huỷ đúng vòng lặp cũ nếu
  // người dùng nhảy sang kết quả khác trước khi vòng trước kết thúc.
  private searchHighlight: { nodeId: string; startTime: number } | null = null;
  private searchHighlightRaf: number | null = null;
  private readonly SEARCH_HIGHLIGHT_DURATION_MS = 1800;
  private linkSourceId: string | null = null;

  // clipboard nội bộ — luôn dùng được kể cả khi trình duyệt chặn
  // navigator.clipboard (xem ui/clipboardBridge.ts)
  private internalClipboard: ClipboardNode[] | null = null;

  private readonly marqueeBox: HTMLElement;
  private readonly linkingHint: HTMLElement;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly store: Store,
    private readonly selection: SelectionModel,
    private readonly renderer: CanvasRenderer,
    private readonly onViewChange?: () => void,
    private readonly onLinkingModeChange?: (active: boolean) => void
  ) {
    this.marqueeBox = byId("marquee-box");
    this.linkingHint = byId("linking-hint");
    searchOpenStore.subscribe((open) => {
      this.searchIsOpen = open;
    });
    this.wireEvents();
  }

  // ===================================================================
  // API công khai — toolbar.ts và main.ts gọi vào đây
  // ===================================================================

  getView(): ViewTransform {
    return this.view;
  }

  draw(): void {
    const sel = this.selection.snapshot();
    this.renderer.draw(
      this.store.getMap(),
      this.view,
      { ...sel, linkSourceId: this.linkSourceId },
      this.getDragPreview(),
      this.computeSearchPulse()
    );
  }

  /** Dao động hình sin theo thời gian trôi qua kể từ lúc nhảy tới kết
   *  quả tìm kiếm, mờ dần về cuối để không dừng đột ngột — xem
   *  startSearchHighlight() và CanvasRenderer#drawSearchPulse. */
  private computeSearchPulse(): SearchPulse | null {
    if (!this.searchHighlight) return null;
    const elapsed = performance.now() - this.searchHighlight.startTime;
    const seconds = elapsed / 1000;
    const oscillation = (Math.sin(seconds * Math.PI * 2 * 2.2) + 1) / 2; // ~2.2 vòng/giây
    const fadeOut = 1 - Math.min(1, elapsed / this.SEARCH_HIGHLIGHT_DURATION_MS);
    return { nodeId: this.searchHighlight.nodeId, intensity: oscillation * fadeOut };
  }

  /** Bắt đầu (hoặc thay bằng) một vòng nhấp nháy mới quanh nodeId. Tự
   *  dừng khi hết SEARCH_HIGHLIGHT_DURATION_MS, hoặc ngay khi người
   *  dùng chọn sang node khác (không nhấp nháy "đuổi theo" vô nghĩa
   *  trên một node không còn liên quan). */
  private startSearchHighlight(nodeId: string): void {
    if (this.searchHighlightRaf !== null) cancelAnimationFrame(this.searchHighlightRaf);
    this.searchHighlight = { nodeId, startTime: performance.now() };

    const tick = (): void => {
      if (!this.searchHighlight) return;
      if (this.selection.primary !== this.searchHighlight.nodeId) {
        this.searchHighlight = null;
        this.searchHighlightRaf = null;
        this.draw();
        return;
      }
      const elapsed = performance.now() - this.searchHighlight.startTime;
      if (elapsed >= this.SEARCH_HIGHLIGHT_DURATION_MS) {
        this.searchHighlight = null;
        this.searchHighlightRaf = null;
        this.draw();
        return;
      }
      this.draw();
      this.searchHighlightRaf = requestAnimationFrame(tick);
    };
    this.searchHighlightRaf = requestAnimationFrame(tick);
  }

  private getDragPreview(): DragPreview | null {
    if (this.dragMode === "node-drag" && this.draggedNodeId) {
      return { draggedId: this.draggedNodeId, dropTarget: this.dropTargetPreview };
    }
    return null;
  }

  async newMap(): Promise<void> {
    const ok = await showConfirm(
      "Tạo mindmap mới? Map đang mở vẫn được lưu — mở lại bất cứ lúc nào trong \"Map gần đây\".",
      "Tạo mới",
      "Huỷ"
    );
    if (!ok) return;
    const map = createEmptyMap("Chủ đề trung tâm");
    this.store.loadMap(map);
    this.selection.resetToRoot(map.rootId);
    this.resetView();
    // P1.12 — map mới không liên kết với file thật nào — file cũ (nếu
    // có) không còn hợp lý cho nội dung hoàn toàn khác này.
    this.setLinkedFile(null);
  }

  /**
   * P2.6d — chuyển sang một map ĐÃ LƯU khác (từ "Map gần đây"), tại
   * chỗ, không tải lại trang — tái dùng đúng `store.loadMap()` đã có
   * sẵn từ P1.6 (tự xoá lịch sử hoàn tác, không có ý nghĩa "hoàn tác
   * xuyên tài liệu"). Việc lưu lại + đánh dấu "đang mở gần nhất" tự
   * xảy ra qua chuỗi phản ứng có sẵn (loadMap -> notify -> fullRefresh
   * -> saveMap trong main.ts), không cần gọi gì thêm ở đây.
   */
  async openMap(mapId: string): Promise<boolean> {
    const map = await loadMapFromStorage(mapId);
    if (!map) return false;
    this.store.loadMap(map);
    this.selection.resetToRoot(map.rootId);
    this.resetView();
    // P1.12 — file cũ (nếu có) liên kết với map TRƯỚC đó, không phải
    // map vừa chuyển sang từ "Map gần đây".
    this.setLinkedFile(null);
    return true;
  }

  /**
   * KW2 — nhảy tới một kết quả của chỉ mục toàn Workspace: chuyển sang map
   * chứa nó (nếu khác map đang mở), rồi chọn node hoặc mở trang card (cuộn
   * tới đúng khối nếu là liên kết khối). Trả về false nếu không mở được map.
   */
  async goToKnowledgeTarget(t: { mapId: string; kind: "node" | "card" | "block"; id: string; cardId: string | null; blockId: string | null }): Promise<boolean> {
    if (t.mapId !== this.store.getMap().mapId && !(await this.openMap(t.mapId))) return false;
    if (t.kind === "node") {
      this.revealNode(t.id);
      return true;
    }
    const cardId = t.cardId ?? t.id;
    if (!this.store.getMap().cards[cardId]) return false;
    this.openCardPage(cardId, t.kind === "block" ? t.blockId : null);
    return true;
  }

  private resetView(): void {
    this.view = { offsetX: 90, offsetY: 300, scale: 1 };
  }

  /**
   * "Vừa khung nhìn" — giải quyết đúng vấn đề người dùng báo: sau khi
   * thu gọn một nhánh, layout tính lại đúng ngay (qua fullRefresh),
   * nhưng CAMERA (pan/zoom hiện tại) không hề tự đổi theo, nên vẫn
   * thấy nguyên khoảng trống cũ ở vùng đã thu gọn. Cố tình KHÔNG tự
   * động gọi hàm này mỗi lần thu gọn (tự nhảy camera liên tục sẽ gây
   * khó chịu hơn là giúp ích, nhất là khi thu gọn nhiều nhánh liên
   * tiếp) — để người dùng chủ động bấm khi thấy cần.
   *
   * Tính khung bao (bounding box) của MỌI NODE ĐANG HIỂN THỊ THẬT SỰ
   * (bỏ qua node nằm trong nhánh đang thu gọn — chúng không chiếm chỗ
   * trên màn hình), rồi canh giữa + chỉnh zoom vừa khít khung canvas,
   * chừa lề đều 4 phía.
   */
  fitToView(): void {
    const map = this.store.getMap();
    const rect = this.canvas.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;
    const visit = (id: string): void => {
      const node = map.nodes[id];
      if (!node) return;
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
      found = true;
      if (!node.collapsed) for (const childId of node.children) visit(childId);
    };
    for (const rootId of getRootIds(map)) visit(rootId);
    for (const note of map.stickyNotes) {
      minX = Math.min(minX, note.x);
      minY = Math.min(minY, note.y);
      maxX = Math.max(maxX, note.x + 160);
      maxY = Math.max(maxY, note.y + 100);
      found = true;
    }
    if (!found) return;

    const PADDING = 60;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const scaleX = (rect.width - PADDING * 2) / contentWidth;
    const scaleY = (rect.height - PADDING * 2) / contentHeight;
    const newScale = Math.min(3, Math.max(0.15, Math.min(scaleX, scaleY)));

    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    this.view.scale = newScale;
    this.view.offsetX = rect.width / 2 - contentCenterX * newScale;
    this.view.offsetY = rect.height / 2 - contentCenterY * newScale;

    this.draw();
    this.onViewChange?.();
  }

  async importJson(file: File): Promise<void> {
    const text = await file.text();
    const result = parseJsonFile(text);
    if (!result.ok) {
      showErrors("Lỗi trong file JSON", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
  }

  /**
   * P2.9 — "Ghép thêm JSON": nhập một file JSON KHÁC vào map ĐANG MỞ
   * (khác `importJson` ở trên — cái đó THAY THẾ hoàn toàn map hiện
   * tại). File nhập đi qua ĐÚNG `parseJsonFile` như nhập thường (di
   * trú schema cũ, validate đầy đủ) trước khi ghép — không bỏ qua bất
   * kỳ bước kiểm tra nào chỉ vì đây là luồng "ghép" thay vì "mở mới".
   * Xem MergeMapCommand (core/commands.ts) để biết cơ chế remap ID
   * tránh xung đột + gộp Tag theo tên.
   */
  async importJsonMerge(file: File): Promise<void> {
    const text = await file.text();
    const result = parseJsonFile(text);
    if (!result.ok) {
      showErrors("Lỗi trong file JSON cần ghép", result.errors);
      return;
    }
    const cmd = new MergeMapCommand(result.map);
    this.store.dispatch(cmd);
    const firstNewRootId = cmd.newRootIds[0];
    if (firstNewRootId) {
      this.selection.selectSingleNode(firstNewRootId);
      requestAnimationFrame(() => this.centerOnNode(firstNewRootId));
    }
  }

  /**
   * P1.16 (tối ưu bundle) — `import("../io/xlsx")` ĐỘNG thay vì tĩnh
   * ở đầu file: đo thực nghiệm xác nhận thư viện `xlsx` một mình
   * chiếm ~430KB trong bundle (hơn nửa tổng kích thước trước khi tối
   * ưu) — với PWA (tải qua mạng thật), người dùng KHÔNG BAO GIỜ đụng
   * tới Nhập/Xuất XLSX sẽ không phải tải phần này. Vite tự tách
   * `io/xlsx.ts` (+ `xlsx` package) thành một chunk RIÊNG, chỉ fetch
   * đúng lúc hàm này được gọi lần đầu — không đổi hành vi chức năng
   * gì, chỉ đổi THỜI ĐIỂM tải.
   */
  async importXlsx(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const { parseXlsxFile } = await import("../io/xlsx");
    const result = parseXlsxFile(buffer);
    if (!result.ok) {
      showErrors("Lỗi trong file XLSX", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
  }

  /**
   * P2.9 (XMind) — nhập file `.xmind`, THAY THẾ hoàn toàn map đang mở
   * (giống `importJson`/`importXlsx`, không phải ghép — dùng "Ghép
   * thêm JSON" nếu muốn giữ cả 2). Cấu trúc đối chiếu TRỰC TIẾP với
   * file `.xmind` thật do người dùng cung cấp — xem chi tiết trong
   * `io/xmind.ts` và README.
   */
  /**
   * P2.9 (XMind) — nhập file `.xmind`, THAY THẾ hoàn toàn map đang mở
   * (giống `importJson`/`importXlsx`, không phải ghép — dùng "Ghép
   * thêm JSON" nếu muốn giữ cả 2). Cấu trúc đối chiếu TRỰC TIẾP với
   * file `.xmind` thật do người dùng cung cấp — xem chi tiết trong
   * `io/xmind.ts` và README.
   *
   * P1.16 (tối ưu bundle) — `import("../io/xmind")` ĐỘNG cùng lý do
   * với `importXlsx` ở trên: `jszip` (thư viện chính `io/xmind.ts`
   * cần) đóng góp thêm ~102KB vào bundle nếu tải tĩnh ngay từ đầu.
   */
  async importXmind(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const { parseXmindFile } = await import("../io/xmind");
    const result = await parseXmindFile(buffer);
    if (!result.ok) {
      showErrors("Lỗi trong file XMind", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
    if (result.warnings.length > 0) {
      void showAlert(result.warnings.join("\n"));
    }
  }

  /**
   * P2.10 — "Ảnh nhúng": chọn một file ảnh từ máy, gắn lên node đang
   * chọn. Giới hạn 8MB/ảnh — KHÔNG phải giới hạn kỹ thuật (base64 không
   * có trần), mà để tránh vô tình làm map nặng tới mức chậm hẳn khi
   * lưu/mở (ảnh chụp màn hình gốc có thể vài chục MB) — báo lỗi rõ
   * ràng thay vì âm thầm làm chậm ứng dụng.
   */
  async insertNodeImage(nodeId: string, file: File): Promise<void> {
    // M3 — ảnh lớn được tự thu nhỏ/nén trước (ui/imageImport.ts); giới hạn
    // 8MB chỉ còn chặn những file không nén lại được (GIF, SVG...).
    const MAX_BYTES = 8 * 1024 * 1024;
    let asset: ImageAsset;
    try {
      asset = await prepareImageFile(file);
    } catch (err) {
      void showAlert((err as Error).message);
      return;
    }
    const bytes = (asset.dataBase64.length * 3) / 4;
    if (bytes > MAX_BYTES) {
      void showAlert(
        `Ảnh "${file.name}" nặng ${(bytes / 1024 / 1024).toFixed(1)}MB, vượt quá giới hạn 8MB cho một ảnh nhúng. Hãy nén nhỏ lại rồi thử lại.`
      );
      return;
    }
    this.store.dispatch(new SetNodeImageCommand(nodeId, generateId("img"), asset));
  }

  /**
   * M3 — thêm ảnh (dán, kéo-thả, chọn file) thành khối ảnh trong card của
   * node; node chưa có card thì tự tạo. Ảnh lớn tự thu nhỏ/nén
   * (ui/imageImport.ts). Cả loạt ảnh là MỘT bước hoàn tác.
   */
  async addImagesToNode(nodeId: string, files: File[]): Promise<void> {
    await this.addImages(files, (images) => {
      const map = this.store.getMap();
      if (!map.nodes[nodeId]) return false;
      this.store.dispatch(buildAddImagesToNodeCommand(map, nodeId, images));
      this.selection.selectSingleNode(nodeId);
      return true;
    });
  }

  /** H1 — thêm ảnh thẳng vào một card (card Inbox chưa gắn node nào). */
  async addImagesToCard(cardId: string, files: File[]): Promise<void> {
    await this.addImages(files, (images) => {
      if (!this.store.getMap().cards[cardId]) return false;
      this.store.dispatch(buildAddImagesToCardCommand(cardId, images));
      return true;
    });
  }

  /** Chuẩn bị (thu nhỏ/nén) các file ảnh rồi giao cho `commit` ghi vào map;
   *  gom lỗi + cảnh báo dung lượng thành một thông báo. */
  private async addImages(
    files: File[],
    commit: (images: { assetId: string; asset: ImageAsset }[]) => boolean
  ): Promise<void> {
    const errors: string[] = [];
    const images: { assetId: string; asset: ImageAsset }[] = [];
    for (const file of files) {
      try {
        images.push({ assetId: generateId("img"), asset: await prepareImageFile(file) });
      } catch (err) {
        errors.push((err as Error).message || `Không đọc được "${file.name}".`);
      }
    }
    if (images.length > 0 && commit(images)) {
      const total = totalAssetBytes(this.store.getMap());
      if (total > MAP_ASSETS_WARN_BYTES) {
        errors.push(
          `Tổng dung lượng ảnh trong map đã là ${formatBytes(total)} — map nặng sẽ lưu/mở chậm. Cân nhắc xoá bớt ảnh không cần.`
        );
      }
    }
    if (errors.length > 0) void showAlert(errors.join(" "));
  }

  /** Mở card dạng trang tài liệu (components/CardPageModal.svelte), cuộn tới khối `blockId`. */
  openCardPage(cardId: string, blockId: string | null = null): void {
    if (this.store.getMap().cards[cardId]) cardPageStore.set({ cardId, focusBlockId: blockId });
  }

  /** M3 — xem lớn các ảnh trong card của node, bắt đầu từ khối `blockId`. */
  openNodeImages(nodeId: string, blockId: string | null = null): void {
    const node = this.store.getMap().nodes[nodeId];
    if (node?.cardId) this.openCardImages(node.cardId, blockId);
  }

  /** Xem lớn các ảnh của một card, bắt đầu từ khối `blockId`. */
  openCardImages(cardId: string, blockId: string | null = null): void {
    const map = this.store.getMap();
    const card = map.cards[cardId];
    if (!card) return;
    const blocks = cardImageBlocks(card).filter((b) => map.assets[b.assetId]);
    const items = blocks.map((b) => ({ ...(map.assets[b.assetId] as ImageAsset), caption: b.caption }));
    void showImageGallery(items, Math.max(0, blocks.findIndex((b) => b.id === blockId)));
  }

  /** P2.10 — gỡ ảnh nhúng khỏi node (chỉ gỡ con trỏ, xem ghi chú tại
   *  SetNodeImageCommand trong core/commands.ts). */
  removeNodeImage(nodeId: string): void {
    this.store.dispatch(new SetNodeImageCommand(nodeId, null, null));
  }

  /**
   * P2.10 — nhập file `.t17m` (định dạng nguyên bản của T17Mind, có
   * nhúng ảnh thật trong zip) — THAY THẾ hoàn toàn map đang mở, cùng
   * quy ước với importXmind/importXlsx ở trên.
   */
  async importT17m(file: File): Promise<void> {
    const buffer = await file.arrayBuffer();
    const { parseT17mFile } = await import("../io/t17m");
    const result = await parseT17mFile(buffer);
    if (!result.ok) {
      showErrors("Lỗi trong file .t17m", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
  }

  /** M5 — nhập Markdown (tiêu đề/danh sách → node, đoạn văn → ghi chú,
   *  bảng/ảnh nhúng → card), thay map đang mở (io/markdownImport.ts). */
  async importMarkdownDoc(file: File): Promise<void> {
    const { parseMarkdownDoc } = await import("../io/markdownImport");
    const result = parseMarkdownDoc(await file.text(), file.name.replace(/\.[^.]+$/, ""));
    if (!result.ok) {
      showErrors("Lỗi trong file Markdown", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
  }

  async importOpml(file: File): Promise<void> {
    const text = await file.text();
    const result = parseOpmlFile(text);
    if (!result.ok) {
      showErrors("Lỗi trong file OPML", result.errors);
      return;
    }
    this.store.loadMap(result.map);
    this.selection.resetToRoot(result.map.rootId);
    this.resetView();
  }

  // ===================================================================
  // Lưu / Xuất / Mở file thật (hộp thoại chọn vị trí, tên, định dạng)
  // ===================================================================

  isDesktop(): boolean {
    return isDesktopApp();
  }

  /** Có hộp thoại chọn vị trí lưu không (bản exe, hoặc Chrome/Edge). Không
   *  có thì Lưu/Xuất rơi về kiểu tải file của trình duyệt. */
  canPickSaveLocation(): boolean {
    return isDesktopApp() || isFileSystemAccessSupported();
  }

  hasLinkedFile(): boolean {
    return this.linkedFile !== null;
  }

  private setLinkedFile(file: AppController["linkedFile"]): void {
    this.linkedFile = file;
    hasLinkedFileStore.set(file !== null);
  }

  /** Thư mục mặc định cho hộp thoại của bản exe. */
  private defaultDir(): string {
    return this.lastDir ?? appDir();
  }

  /** Tên file gợi ý (không đuôi) — theo file đang liên kết, không thì theo chữ node gốc. */
  private suggestedBase(): string {
    if (this.linkedFile?.kind === "path") return baseName(this.linkedFile.path).replace(/\.[^.]+$/, "");
    const map = this.store.getMap();
    return suggestBaseName(map.nodes[map.rootId]?.text ?? "");
  }

  /** Nội dung file của map đang mở theo định dạng. */
  private async buildFile(format: FileFormat): Promise<Blob | string | null> {
    const map = this.store.getMap();
    switch (format) {
      case "t17m":
        return (await import("../io/t17m")).exportT17mFile(map);
      case "json":
        return exportFlatJson(map);
      case "xlsx":
        return (await import("../io/xlsx")).exportXlsxBlob(map);
      case "xmind":
        return (await import("../io/xmind")).exportXmindFile(map);
      case "opml":
        return exportOpml(map);
      case "md": {
        const doc = buildDocModel(map, this.docOptions);
        return renderMarkdown(doc, this.docOptions.includeImages ? "embed" : "none").markdown;
      }
      case "zip":
        return (await import("../io/markdownZip")).exportMarkdownZip(
          buildDocModel(map, this.docOptions),
          `${this.suggestedBase()}.md`
        );
      case "docx":
        return (await import("../io/docx")).exportDocx(buildDocModel(map, this.docOptions), this.docOptions.indentByLevel);
      case "svg":
        return exportSvg(map);
      case "png":
        return this.renderPngBlob();
    }
  }

  /**
   * "Lưu thành…" / "Xuất …": luôn mở hộp thoại để chọn THƯ MỤC, TÊN FILE
   * và ĐỊNH DẠNG (ô "Save as type"; định dạng thật lấy theo đuôi tên file,
   * gõ tên không đuôi thì dùng `format`).
   * - Bản exe: hộp thoại Windows, thư mục mặc định = thư mục file vừa
   *   mở/nhập/lưu, ban đầu là thư mục chứa T17Mind.exe.
   * - Chrome/Edge: hộp thoại của trình duyệt (tự nhớ thư mục lần trước).
   * - Trình duyệt khác: tải file xuống như cũ.
   * `link` = true (Lưu/Lưu thành…): lưu .t17m/.json thì từ đó Ctrl+S ghi
   * thẳng vào file này. Xuất (link = false) không đổi file đang liên kết.
   */
  async saveAs(format: FileFormat = this.linkedFile?.format ?? "t17m", link = true): Promise<void> {
    const formats = formatOrder(format);
    try {
      if (isDesktopApp()) {
        const chosen = await nativeSaveDialog(
          link ? "Lưu map" : `Xuất ${FORMATS[format].label}`,
          joinPath(this.defaultDir(), `${this.suggestedBase()}.${FORMATS[format].ext}`),
          formats
        );
        if (!chosen) return; // bấm Huỷ
        const path = ensureExtension(chosen, format);
        const fmt = formatFromPath(path) ?? format;
        const data = await this.buildFile(fmt);
        if (data === null) return;
        await nativeWriteFile(path, data);
        this.lastDir = dirOf(path) || this.lastDir;
        if (link && (fmt === "t17m" || fmt === "json")) this.setLinkedFile({ kind: "path", path, format: fmt });
        return;
      }
      if (isFileSystemAccessSupported()) {
        const handle = await pickSaveHandle(`${this.suggestedBase()}.${FORMATS[format].ext}`, formats);
        if (!handle) return;
        const fmt = formatFromPath(handle.name) ?? format;
        const data = await this.buildFile(fmt);
        if (data === null) return;
        await writeToHandle(handle, data);
        if (link && (fmt === "t17m" || fmt === "json")) this.setLinkedFile({ kind: "handle", handle, format: fmt });
        return;
      }
      const data = await this.buildFile(format);
      if (data === null) return;
      const name = `${this.suggestedBase()}.${FORMATS[format].ext}`;
      if (typeof data === "string") downloadText(data, name, FORMATS[format].mime);
      else downloadBlob(data, name);
    } catch (err) {
      showErrors("Không lưu được file", [String((err as Error)?.message ?? err)]);
    }
  }

  /** M5 — tuỳ chọn xuất tài liệu đang dùng (hộp thoại Xuất tài liệu đọc để hiện lại lựa chọn cũ). */
  getDocOptions(): DocOptions {
    return { ...this.docOptions, branchRootId: this.selection.primary };
  }

  /** M5 — xuất tài liệu Word / Markdown theo tuỳ chọn, qua hộp thoại Lưu. */
  exportDocument(opts: DocOptions, format: "docx" | "md" | "zip"): Promise<void> {
    this.docOptions = { ...opts };
    return this.exportAs(format);
  }

  /** "Xuất …" một định dạng: hộp thoại lưu (chọn sẵn định dạng đó). */
  exportAs(format: FileFormat): Promise<void> {
    return this.saveAs(format, false);
  }

  /** "Lưu" (Ctrl+S): đã liên kết file thì ghi thẳng (không hỏi lại), chưa
   *  thì như "Lưu thành…" (mặc định .t17m — giữ cả ảnh). */
  async save(): Promise<void> {
    const linked = this.linkedFile;
    if (!linked) return this.saveAs("t17m", true);
    try {
      const data = await this.buildFile(linked.format);
      if (data === null) return;
      if (linked.kind === "path") await nativeWriteFile(linked.path, data);
      else await writeToHandle(linked.handle, data);
    } catch (err) {
      showErrors("Không lưu được file", [String((err as Error)?.message ?? err)]);
    }
  }

  /**
   * "Mở…" / "Nhập …" bằng hộp thoại có đường dẫn (bản exe, hoặc Chrome/
   * Edge). Trả về false nếu môi trường không có hộp thoại này — nơi gọi
   * dùng ô chọn file thường. Mở xong thì thư mục mặc định của lần Lưu/Xuất
   * sau chuyển về thư mục chứa file vừa mở; mở .t17m/.json (không phải
   * ghép) thì Ctrl+S ghi thẳng lại đúng file đó.
   */
  async openWithDialog(formats: FileFormat[] = formatOrder("t17m", true), merge = false): Promise<boolean> {
    if (!this.canPickSaveLocation()) return false;
    try {
      let file: File;
      let link: AppController["linkedFile"] = null;
      if (isDesktopApp()) {
        const path = await nativeOpenDialog(merge ? "Ghép JSON vào map" : "Mở file", this.defaultDir(), formats);
        if (!path) return true;
        file = new File([await nativeReadFile(path)], baseName(path));
        this.lastDir = dirOf(path) || this.lastDir;
        const fmt = formatFromPath(path);
        if (fmt === "t17m" || fmt === "json") link = { kind: "path", path, format: fmt };
      } else {
        const picked = await pickOpenHandle(formats);
        if (!picked) return true;
        file = picked.file;
        const fmt = formatFromPath(file.name);
        if (fmt === "t17m" || fmt === "json") link = { kind: "handle", handle: picked.handle, format: fmt };
      }
      if (merge) {
        await this.importJsonMerge(file);
        return true;
      }
      if (await this.importFile(file)) this.setLinkedFile(link);
    } catch (err) {
      showErrors("Không mở được file", [String((err as Error)?.message ?? err)]);
    }
    return true;
  }

  /** Nhập một file theo đuôi (thay map đang mở). Trả về true nếu đọc được. */
  async importFile(file: File): Promise<boolean> {
    const before = this.store.getMap();
    switch (formatFromPath(file.name)) {
      case "t17m":
        await this.importT17m(file);
        break;
      case "xlsx":
        await this.importXlsx(file);
        break;
      case "xmind":
        await this.importXmind(file);
        break;
      case "opml":
        await this.importOpml(file);
        break;
      case "json":
        await this.importJson(file);
        break;
      case "md":
        await this.importMarkdownDoc(file);
        break;
      default:
        void showAlert(`Không mở được "${file.name}": T17Mind chỉ mở file .t17m, .json, .xlsx, .xmind, .opml, .md.`);
        return false;
    }
    return this.store.getMap() !== before;
  }

  /** Vẽ toàn bộ map ra ảnh PNG (nền trắng, gấp đôi độ phân giải). */
  private renderPngBlob(): Promise<Blob | null> {
    const map = this.store.getMap();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of Object.keys(map.nodes)) {
      const n = map.nodes[id] as MindNode;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    for (const s of map.summaries) {
      const g = summaryGeometry(map, s);
      if (g) {
        maxX = Math.max(maxX, g.labelX + g.labelW);
        minX = Math.min(minX, g.labelX); // ngoặc bên trái: hộp nhãn có thể vượt ra ngoài các node
        minY = Math.min(minY, g.minY);
        maxY = Math.max(maxY, g.maxY);
      }
    }
    if (!Number.isFinite(minX)) return Promise.resolve(null); // map rỗng bất thường — không có gì để xuất

    const pad = 40;
    const scale = 2;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const off = document.createElement("canvas");
    off.width = w * scale;
    off.height = h * scale;
    const ctx = off.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const neutralSelection: SelectionState = {
      selectedIds: new Set(),
      primaryId: null,
      selectedRelId: null,
      selectedSummaryId: null,
      selectedBoundaryId: null,
      selectedStickyNoteId: null,
      hoveredId: null,
    };
    this.renderer.drawToOffscreenCanvas(
      ctx,
      w,
      h,
      map,
      { offsetX: pad - minX, offsetY: pad - minY, scale: 1 },
      neutralSelection
    );
    return new Promise((resolve) => off.toBlob(resolve, "image/png"));
  }

  addChildToSelection(): void {
    const parentId = this.selection.primary ?? this.store.getMap().rootId;
    const cmd = new AddChildCommand(parentId, "Ý mới");
    this.store.dispatch(cmd);
    this.selection.selectSingleNode(cmd.newNodeId);
    // Node mới tạo vào thẳng chế độ gõ chữ — không bắt người dùng phải
    // double-click hay bấm F2 thêm một bước nữa mới đổi được tên mặc
    // định "Ý mới". Dùng requestAnimationFrame để chắc chắn layout đã
    // chạy xong, khớp cách createSummaryFromSelection() đang làm.
    requestAnimationFrame(() => this.startEditNodeText(cmd.newNodeId));
  }

  private addSiblingToSelection(): void {
    const map = this.store.getMap();
    const node = this.selection.primary ? map.nodes[this.selection.primary] : null;
    const parentId = node?.parentId ?? map.rootId;
    const cmd = new AddChildCommand(parentId, "Ý mới");
    this.store.dispatch(cmd);
    this.selection.selectSingleNode(cmd.newNodeId);
    requestAnimationFrame(() => this.startEditNodeText(cmd.newNodeId));
  }

  deleteSelection(): void {
    if (this.selection.relId) {
      this.store.dispatch(new DeleteRelationshipCommand(this.selection.relId));
      this.selection.resetToRoot(this.store.getMap().rootId);
      return;
    }
    if (this.selection.summaryId) {
      this.store.dispatch(new DeleteSummaryCommand(this.selection.summaryId));
      this.selection.resetToRoot(this.store.getMap().rootId);
      return;
    }
    if (this.selection.boundaryId) {
      this.store.dispatch(new DeleteBoundaryCommand(this.selection.boundaryId));
      this.selection.resetToRoot(this.store.getMap().rootId);
      return;
    }
    if (this.selection.stickyNoteId) {
      this.store.dispatch(new DeleteStickyNoteCommand(this.selection.stickyNoteId));
      this.selection.resetToRoot(this.store.getMap().rootId);
      return;
    }
    const map = this.store.getMap();
    const ids = this.topLevelSelectedIds().filter((id) => id !== map.rootId);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      this.store.dispatch(new DeleteNodeCommand(ids[0] as string));
    } else {
      this.store.dispatch(
        new CompositeCommand(
          ids.map((id) => new DeleteNodeCommand(id)),
          `Xoá ${ids.length} node`
        )
      );
    }
    this.selection.resetToRoot(map.rootId);
  }

  canDelete(): boolean {
    if (this.selection.relId || this.selection.summaryId || this.selection.boundaryId || this.selection.stickyNoteId) {
      return true;
    }
    const map = this.store.getMap();
    return Array.from(this.selection.ids).some((id) => id !== map.rootId);
  }

  /**
   * P2.7g — đổi từ nhị phân (ẩn hết/hiện hết) sang xoay 3 nấc, giống
   * Org-mode. `expandAll=true` (gán cho Shift+C) bỏ qua chu kỳ, mở
   * NGAY toàn bộ — dành cho ai vẫn muốn hành vi "mở hết một phát"
   * quen thuộc.
   */
  toggleCollapsePrimary(expandAll = false): void {
    if (!this.selection.primary) return;
    const map = this.store.getMap();
    // P2.7g (nâng cấp theo yêu cầu mới) — gốc GIỜ hoạt động y hệt
    // node thường, không còn bị chặn thu gọn nữa (mức tối đa: chỉ còn
    // 1 mình gốc hiện — đúng ý đồ mới).
    // Node LÁ (không có con) không có gì để cycle — chặn sớm để không
    // tạo bước hoàn tác thừa (xem CycleCollapseLevelCommand).
    const node = map.nodes[this.selection.primary];
    if (!node || node.children.length === 0) return;
    if (expandAll) {
      this.store.dispatch(new ExpandAllCommand(this.selection.primary));
    } else {
      this.store.dispatch(new CycleCollapseLevelCommand(this.selection.primary));
    }
  }

  undo(): void {
    this.store.undo();
  }
  redo(): void {
    this.store.redo();
  }

  toggleLinkingMode(): void {
    this.linkingMode = !this.linkingMode;
    this.linkSourceId = null;
    this.linkingHint.classList.toggle("open", this.linkingMode);
    this.updateLinkingHintText();
    this.onLinkingModeChange?.(this.linkingMode);
    this.draw();
  }
  get isLinkingModeActive(): boolean {
    return this.linkingMode;
  }

  private updateLinkingHintText(): void {
    this.linkingHint.textContent = this.linkSourceId
      ? "Đã chọn nguồn — bấm vào node đích để hoàn tất (Esc để huỷ)"
      : "Bấm vào node để chọn làm nguồn của liên kết (Esc để huỷ)";
  }

  canCreateSummary(): boolean {
    return this.selection.ids.size >= 2;
  }

  createSummaryFromSelection(): void {
    const map = this.store.getMap();
    const ids = Array.from(this.selection.ids);
    if (ids.length < 2) return;
    const parentIds = new Set(ids.map((id) => map.nodes[id]?.parentId ?? null));
    if (parentIds.size !== 1) {
      void showAlert("Chỉ tóm tắt được các mục cùng cấp (cùng node cha).");
      return;
    }
    const parentId = parentIds.values().next().value as string | null;
    const order = parentId ? map.nodes[parentId]?.children ?? [] : [];
    const sortedIds = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));

    const cmd = new AddSummaryCommand(sortedIds, "Tóm tắt");
    this.store.dispatch(cmd);
    this.selection.selectSummary(cmd.newSummaryId);
    // Đợi renderer vẽ xong một khung hình (để summaryInfo có toạ độ)
    // rồi mới mở ô sửa nhãn tại đúng vị trí trên màn hình.
    requestAnimationFrame(() => this.startEditSummaryLabel(cmd.newSummaryId));
  }

  canCreateBoundary(): boolean {
    return this.selection.ids.size >= 1;
  }

  /**
   * P2.4 — khác createSummaryFromSelection() ở TRÊN: KHÔNG kiểm tra
   * "cùng node cha" — đây chính là điểm khác biệt cốt lõi giữa Boundary
   * và Summary. Boundary gom được node ở bất kỳ nhánh nào.
   */
  createBoundaryFromSelection(): void {
    const ids = Array.from(this.selection.ids);
    if (ids.length === 0) return;

    const cmd = new AddBoundaryCommand(ids, "Khoanh vùng");
    this.store.dispatch(cmd);
    this.selection.selectBoundary(cmd.newBoundaryId);
    requestAnimationFrame(() => this.startEditBoundaryLabel(cmd.newBoundaryId));
  }

  /**
   * P2.5 — tạo một nhánh trôi hoàn toàn mới, không gắn vào cây chính.
   * Dịch offsetY tăng dần theo số nhánh trôi đã có, để mỗi lần bấm tạo
   * mới không chồng đúng lên nhánh trôi trước đó.
   */
  createFloatingBranch(): void {
    const map = this.store.getMap();
    const floatingCount = getRootIds(map).length - 1; // trừ map.rootId
    const offsetY = 260 * (floatingCount + 1);
    const cmd = new CreateFloatingBranchCommand("Nhánh trôi mới", offsetY);
    this.store.dispatch(cmd);
    this.selection.selectSingleNode(cmd.newNodeId);
    requestAnimationFrame(() => this.startEditNodeText(cmd.newNodeId));
  }

  canDetachToFloating(): boolean {
    const map = this.store.getMap();
    return this.selection.ids.size === 1 && this.selection.primary !== null && this.selection.primary !== map.rootId;
  }

  /** P2.5 — tách nhánh đang chọn ra khỏi cây chính, biến thành một
   *  nhánh trôi độc lập (chiều ngược lại: kéo-thả một nhánh trôi lên
   *  node khác để gắn lại đã tự hoạt động qua MoveNodeCommand có sẵn,
   *  không cần thêm hàm riêng cho chiều đó). */
  detachSelectionToFloating(): void {
    const id = this.selection.primary;
    if (!id || id === this.store.getMap().rootId) return;
    this.store.dispatch(new DetachToFloatingCommand(id));
  }

  /** P2.5b — tạo ghi chú dán mới ở GIỮA KHUNG NHÌN HIỆN TẠI (toạ độ
   *  world, không phải một vị trí tuyệt đối cố định có thể đang nằm
   *  ngoài màn hình nếu người dùng đã pan/zoom đi xa). */
  createStickyNote(at: { x: number; y: number } | null = null): void {
    const rect = this.canvas.getBoundingClientRect();
    const worldCenter = this.renderer.toWorld(rect.width / 2, rect.height / 2, this.view);
    // Menu chuột phải truyền `at` = điểm vừa bấm (góc trên-trái ghi chú).
    const cmd = at
      ? new AddStickyNoteCommand(at.x, at.y, "")
      : new AddStickyNoteCommand(worldCenter.x - 90, worldCenter.y - 40, "");
    this.store.dispatch(cmd);
    this.selection.selectStickyNote(cmd.newNoteId);
    requestAnimationFrame(() => this.startEditStickyNoteText(cmd.newNoteId));
  }

  private startEditStickyNoteText(noteId: string): void {
    const note = this.store.getMap().stickyNotes.find((n) => n.id === noteId);
    const geo = this.renderer.getStickyNoteGeometry(noteId);
    if (!note || !geo) return;
    const rect = this.canvas.getBoundingClientRect();
    startInlineEditMultiline(
      note.text,
      {
        left: rect.left + geo.x * this.view.scale + this.view.offsetX,
        top: rect.top + geo.y * this.view.scale + this.view.offsetY,
        width: geo.width * this.view.scale,
        height: geo.height * this.view.scale,
        fontSizePx: 13,
      },
      (value) => this.store.dispatch(new UpdateStickyNoteCommand(noteId, { text: value }))
    );
  }

  // -------------------------------------------------------------
  // P2.6 — Theme + sao chép định dạng
  // -------------------------------------------------------------

  /** Áp một bộ theme cho toàn map (mọi cây độc lập, kể cả nhánh trôi —
   *  xem ApplyThemeCommand). Gộp thành đúng 1 bước hoàn tác. */
  applyTheme(themeId: string, theme: Theme | null = null): void {
    this.store.dispatch(new ApplyThemeCommand(themeId, theme));
  }

  /** P2.6b-2 — bật/tắt 1 trong 3 công tắc hiển thị mức tài liệu
   *  (showEdgeLabels/showRelationships/showSummaries). */
  toggleDisplayFlag(flag: MapDisplayFlag): void {
    this.store.dispatch(new ToggleMapDisplayFlagCommand(flag));
  }

  /** P2.7a — đổi bố cục cho toàn map. Việc tính lại toạ độ mọi node
   *  xảy ra tự động qua fullRefresh() trong main.ts sau dispatch. */
  setLayoutType(layoutType: LayoutType): void {
    if (this.store.getMap().layoutType === layoutType) return;
    this.store.dispatch(new SetLayoutTypeCommand(layoutType));
  }

  /** P2.14 — "Sắp xếp lại": xem giải thích đầy đủ ở
   *  getAutoArrangeTargetIds (core/tree.ts) — nút này chỉ có tác dụng
   *  khi có ít nhất 1 node trong phạm vi đang bị kéo lệch (offset khác
   *  0,0), nên dùng canAutoArrange() để tự vô hiệu hoá nút lúc không
   *  cần thiết. */
  canAutoArrange(): boolean {
    return getAutoArrangeTargetIds(this.store.getMap(), this.selection.ids).length > 0;
  }

  autoArrange(): void {
    const ids = getAutoArrangeTargetIds(this.store.getMap(), this.selection.ids);
    if (ids.length === 0) return;
    this.store.dispatch(
      new CompositeCommand(
        ids.map((id) => new SetNodeOffsetCommand(id, { x: 0, y: 0 })),
        "Sắp xếp lại"
      )
    );
  }

  get isFormatPainterActive(): boolean {
    return this.formatPainterPatch !== null;
  }

  /** Bật chế độ sao chép định dạng, lấy node đang chọn làm NGUỒN.
   *  Không làm gì nếu chưa chọn đúng 1 node. */
  startFormatPainter(): void {
    const id = this.selection.primary;
    if (!id || this.selection.ids.size !== 1) return;
    const source = this.store.getMap().nodes[id];
    if (!source) return;
    this.formatPainterPatch = extractFormatPatch(source);
    formatPainterModeStore.set(true);
  }

  /** Tắt chế độ sao chép định dạng (Esc, hoặc bấm lại nút trên Toolbar). */
  stopFormatPainter(): void {
    this.formatPainterPatch = null;
    formatPainterModeStore.set(false);
  }

  /** Gọi từ onMouseDown khi phát hiện bấm trúng một node TRONG LÚC
   *  đang ở chế độ sao chép định dạng — áp patch đã lưu, KHÔNG tắt chế
   *  độ (giữ để áp tiếp cho node khác). Trả về true nếu đã xử lý (để
   *  onMouseDown biết dừng, không rơi tiếp xuống logic chọn/kéo bình
   *  thường của node đó). */
  private applyFormatPainterTo(nodeId: string): boolean {
    if (!this.formatPainterPatch) return false;
    this.store.dispatch(new UpdateNodeStyleCommand(nodeId, this.formatPainterPatch));
    return true;
  }

  // -------------------------------------------------------------
  // Sao chép / cắt / dán / nhân bản — P1.7
  // -------------------------------------------------------------

  private topLevelSelectedIds(): string[] {
    const map = this.store.getMap();
    const ids = Array.from(this.selection.ids);
    return ids.filter((id) => {
      let cur = map.nodes[id]?.parentId ?? null;
      while (cur) {
        if (ids.includes(cur)) return false; // có tổ tiên cũng đang được chọn -> bỏ, tránh trùng lặp
        cur = map.nodes[cur]?.parentId ?? null;
      }
      return true;
    });
  }

  copySelection(): void {
    const map = this.store.getMap();
    const ids = this.topLevelSelectedIds();
    if (ids.length === 0) return;
    this.internalClipboard = ids.map((id) => nodeToClipboardNode(map, id));
    void writeSystemClipboard(forestToIndentedText(map, ids));
  }

  cutSelection(): void {
    if (this.selection.ids.size === 0 || this.topLevelSelectedIds().includes(this.store.getMap().rootId)) return;
    this.copySelection();
    this.deleteSelection();
  }

  /**
   * Dán bằng cách đọc dữ liệu ĐÍNH KÈM THEO sự kiện "paste" tự nhiên của
   * trình duyệt (do onNativePaste() cung cấp), thay vì tự gọi
   * navigator.clipboard.readText(). Lý do đổi cách này: readText() là
   * một API cần xin quyền qua hộp thoại riêng của trình duyệt — hộp
   * thoại đó không hoạt động trong Simple Browser của VS Code (và có
   * thể cả một số khung nhúng khác), khiến dán luôn thất bại ở đó dù
   * người dùng có cho phép hay không. Đọc trực tiếp từ sự kiện paste
   * không cần xin quyền gì cả, vì nó gắn liền với đúng thao tác Ctrl+V
   * người dùng vừa bấm.
   */
  private performPaste(clips: ClipboardNode[]): void {
    if (clips.length === 0) return;
    const map = this.store.getMap();
    const targetId = this.selection.primary ?? map.rootId;
    const cmd = new PasteSubtreeCommand(targetId, clips);
    this.store.dispatch(cmd);
    this.selection.applyMarqueeResult(cmd.newRootIds, false, map.rootId);
  }

  private onNativePaste(e: ClipboardEvent): void {
    if (isEditing() || isTypingTarget(document.activeElement)) return; // để trình duyệt tự lo dán ở ô nhập khác
    e.preventDefault();

    // M3 — clipboard CHỈ có ảnh (chụp màn hình, "Copy image") → thêm ảnh
    // vào node đang chọn. Có kèm chữ thì vẫn dán chữ như cũ: Excel copy ô
    // luôn kèm thêm một ảnh PNG của vùng ô, không được biến nó thành ảnh.
    const images = imageFilesFrom(e.clipboardData);
    if (images.length > 0 && !(e.clipboardData?.getData("text/plain") ?? "").trim()) {
      void this.addImagesToNode(this.selection.primary ?? this.store.getMap().rootId, images);
      return;
    }

    if (this.internalClipboard) {
      this.performPaste(this.internalClipboard);
      return;
    }
    const text = e.clipboardData?.getData("text/plain") ?? "";
    if (!text) return;
    this.performPaste(parseIndentedText(text));
  }

  duplicateSelection(): void {
    const id = this.selection.primary;
    const map = this.store.getMap();
    if (!id || id === map.rootId) return;
    const cmd = new DuplicateNodeCommand(id);
    this.store.dispatch(cmd);
    this.selection.selectSingleNode(cmd.newRootNodeId);
  }

  // ===================================================================
  // Sửa chữ tại chỗ
  // ===================================================================

  private startEditNodeText(nodeId: string): void {
    const node = this.store.getMap().nodes[nodeId];
    if (!node) return;
    const rect = this.canvas.getBoundingClientRect();
    startInlineEdit(
      node.text,
      {
        left: rect.left + node.x * this.view.scale + this.view.offsetX,
        top: rect.top + node.y * this.view.scale + this.view.offsetY,
        width: node.width * this.view.scale,
        height: node.height * this.view.scale,
        fontSizePx: 13 * this.view.scale,
      },
      (value) => this.store.dispatch(new UpdateTextCommand(nodeId, value))
    );
  }

  private startEditRelationshipLabel(relId: string): void {
    const rel = this.store.getMap().relationships.find((r) => r.id === relId);
    const mid = this.renderer.getRelMidPoint(relId);
    if (!rel || !mid) return;
    const rect = this.canvas.getBoundingClientRect();
    startInlineEdit(
      rel.label,
      {
        left: rect.left + mid.x * this.view.scale + this.view.offsetX - 60,
        top: rect.top + mid.y * this.view.scale + this.view.offsetY - 12,
        width: 120,
        height: 24,
        fontSizePx: 12.5,
      },
      (value) => this.store.dispatch(new UpdateRelationshipCommand(relId, { label: value }))
    );
  }

  private startEditSummaryLabel(summaryId: string): void {
    const summary = this.store.getMap().summaries.find((s) => s.id === summaryId);
    const geo = this.renderer.getSummaryGeometry(summaryId);
    if (!summary || !geo) return;
    const rect = this.canvas.getBoundingClientRect();
    startInlineEdit(
      summary.label,
      {
        left: rect.left + geo.labelX * this.view.scale + this.view.offsetX,
        top: rect.top + geo.labelY * this.view.scale + this.view.offsetY,
        width: geo.labelW * this.view.scale,
        height: geo.labelH * this.view.scale,
        fontSizePx: 13,
      },
      (value) => this.store.dispatch(new UpdateSummaryCommand(summaryId, { label: value || "Tóm tắt" }))
    );
  }

  private startEditBoundaryLabel(boundaryId: string): void {
    const boundary = this.store.getMap().boundaries.find((b) => b.id === boundaryId);
    const geo = this.renderer.getBoundaryGeometry(boundaryId);
    if (!boundary || !geo) return;
    const rect = this.canvas.getBoundingClientRect();
    startInlineEdit(
      boundary.label,
      {
        left: rect.left + geo.labelX * this.view.scale + this.view.offsetX,
        top: rect.top + geo.labelY * this.view.scale + this.view.offsetY,
        width: geo.labelW * this.view.scale,
        height: geo.labelH * this.view.scale,
        fontSizePx: 12,
      },
      (value) => this.store.dispatch(new UpdateBoundaryCommand(boundaryId, { label: value || "Khoanh vùng" }))
    );
  }

  // ===================================================================
  // Sự kiện chuột / bàn phím
  // ===================================================================

  private wireEvents(): void {
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("mouseup", () => this.onMouseUp());
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
    this.canvas.addEventListener("dblclick", (e) => this.onDblClick(e));
    window.addEventListener("keydown", (e) => this.onSpaceKeyDown(e));
    window.addEventListener("keyup", (e) => this.onSpaceKeyUp(e));
    window.addEventListener("keydown", (e) => this.onActionKeyDown(e));
    document.addEventListener("paste", (e) => this.onNativePaste(e));
    // M3 — kéo-thả file ảnh vào node.
    // H1 — kéo card từ khung Thư viện thả vào map (CARD_DRAG_TYPE).
    this.canvas.addEventListener("dragover", (e) => {
      const types = e.dataTransfer?.types ?? [];
      if (!types.includes("Files") && !types.includes(CARD_DRAG_TYPE)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = types.includes(CARD_DRAG_TYPE) ? "link" : "copy";
    });
    this.canvas.addEventListener("drop", (e) => {
      const cardId = e.dataTransfer?.getData(CARD_DRAG_TYPE);
      if (cardId) {
        e.preventDefault();
        const { x, y } = this.screenPos(e);
        this.placeCardAt(cardId, x, y);
        return;
      }
      this.onFileDrop(e);
    });
    this.canvas.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    // Bản exe (Neutralino/WebView2): chuột phải ở chỗ khác ngoài canvas sẽ
    // hiện menu mặc định của WebView2 (Back/Reload/Print… — vô nghĩa, dễ
    // bấm nhầm Reload). Chặn đi, trừ ô nhập chữ (vẫn cần Copy/Paste).
    if (typeof (window as { NL_OS?: string }).NL_OS === "string") {
      document.addEventListener("contextmenu", (e) => {
        if (!isTypingTarget(e.target)) e.preventDefault();
      });
    }
  }

  // ===================================================================
  // Menu chuột phải (ui/contextMenuModel.ts + components/ContextMenu.svelte)
  // ===================================================================

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    if (isEditing()) return;
    const { x, y } = this.screenPos(e);
    const map = this.store.getMap();
    let target: MenuTarget;

    const stickyHit = this.renderer.hitTestStickyNote(map, x, y, this.view);
    const nodeHit = stickyHit ? null : this.renderer.hitTestNode(map, x, y, this.view);
    if (stickyHit) {
      this.selection.selectStickyNote(stickyHit);
      target = { kind: "sticky", id: stickyHit };
    } else if (nodeHit) {
      if (this.selection.ids.has(nodeHit) && this.selection.ids.size > 1) {
        target = { kind: "multi", count: this.selection.ids.size };
      } else {
        this.selection.selectSingleNode(nodeHit);
        const node = map.nodes[nodeHit] as MindNode;
        target = {
          kind: "node",
          nodeId: nodeHit,
          isRoot: nodeHit === map.rootId,
          hasChildren: node.children.length > 0,
          hasCard: !!(node.cardId && map.cards[node.cardId]),
          tableBlockId: getNodeThumbTable(map, node)?.id ?? null,
          imageCount: getNodeImageBlocks(map, node).length,
          canPaste: !!this.internalClipboard,
        };
      }
    } else {
      const relHit = this.renderer.hitTestRelationship(x, y, this.view);
      const summaryHit = relHit ? null : this.renderer.hitTestSummary(x, y, this.view);
      const boundaryHit = relHit || summaryHit ? null : this.renderer.hitTestBoundary(x, y, this.view);
      if (relHit) {
        this.selection.selectRelationship(relHit);
        target = { kind: "relationship", id: relHit, bent: !!map.relationships.find((r) => r.id === relHit)?.bend };
      } else if (summaryHit) {
        this.selection.selectSummary(summaryHit);
        target = { kind: "summary", id: summaryHit };
      } else if (boundaryHit) {
        this.selection.selectBoundary(boundaryHit);
        target = { kind: "boundary", id: boundaryHit };
      } else {
        const w = this.renderer.toWorld(x, y, this.view);
        target = { kind: "canvas", worldX: w.x, worldY: w.y };
      }
    }
    contextMenuStore.set({
      x: e.clientX,
      y: e.clientY,
      entries: buildMenu(target),
      onPick: (action) => this.runMenuAction(action, target),
    });
  }

  /** Chạy một mục menu chuột phải — chỉ gọi lại các thao tác đã có. */
  runMenuAction(action: MenuAction, target: MenuTarget): void {
    const nodeId = target.kind === "node" ? target.nodeId : null;
    switch (action) {
      case "addChild":
        this.addChildToSelection();
        break;
      case "addSibling":
        this.addSiblingToSelection();
        break;
      case "editText":
        if (nodeId) this.startEditNodeText(nodeId);
        break;
      case "copy":
        this.copySelection();
        break;
      case "cut":
        this.cutSelection();
        break;
      case "paste":
        if (this.internalClipboard) this.performPaste(this.internalClipboard);
        break;
      case "duplicate":
        this.duplicateSelection();
        break;
      case "toggleCollapse":
      case "expandAll":
        this.toggleCollapsePrimary(action === "expandAll");
        break;
      case "createCard": {
        const node = nodeId ? this.store.getMap().nodes[nodeId] : null;
        if (node) this.store.dispatch(new CreateCardForNodeCommand(node.id, createCard(node.text)));
        break;
      }
      case "openPage": {
        const node = nodeId ? this.store.getMap().nodes[nodeId] : null;
        if (node?.cardId) this.openCardPage(node.cardId);
        break;
      }
      case "openTable": {
        const node = nodeId ? this.store.getMap().nodes[nodeId] : null;
        if (node?.cardId && target.kind === "node" && target.tableBlockId) {
          tableEditorStore.set({ cardId: node.cardId, blockId: target.tableBlockId });
        }
        break;
      }
      case "viewImages":
        if (nodeId) this.openNodeImages(nodeId);
        break;
      case "addImages":
        if (nodeId) this.pickImagesFor(nodeId);
        break;
      case "startLink":
        if (!nodeId) break;
        if (!this.linkingMode) this.toggleLinkingMode();
        this.linkSourceId = nodeId;
        this.updateLinkingHintText();
        this.draw();
        break;
      case "detachFloating":
        this.detachSelectionToFloating();
        break;
      case "exportBranch":
        exportDocStore.set({ scope: "branch" });
        break;
      case "summary":
        this.createSummaryFromSelection();
        break;
      case "boundary":
        this.createBoundaryFromSelection();
        break;
      case "editLabel":
        if (target.kind === "relationship") this.startEditRelationshipLabel(target.id);
        else if (target.kind === "summary") this.startEditSummaryLabel(target.id);
        else if (target.kind === "boundary") this.startEditBoundaryLabel(target.id);
        else if (target.kind === "sticky") this.startEditStickyNoteText(target.id);
        break;
      case "straighten":
        if (target.kind === "relationship") this.store.dispatch(new UpdateRelationshipCommand(target.id, { bend: null }));
        break;
      case "addFloating":
        this.createFloatingBranch();
        break;
      case "addSticky":
        if (target.kind === "canvas") this.createStickyNote({ x: target.worldX, y: target.worldY });
        break;
      case "fitView":
        this.fitToView();
        break;
      case "home":
        this.navigateHome();
        break;
      case "delete":
        this.deleteSelection();
        break;
    }
  }

  /** Mở hộp chọn file (nhiều ảnh) rồi thêm vào card của node. */
  private pickImagesFor(nodeId: string): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.addEventListener("change", () => {
      const files = Array.from(input.files ?? []);
      if (files.length > 0) void this.addImagesToNode(nodeId, files);
    });
    input.click();
  }

  /** H1 — thả card ở điểm màn hình (x, y): trúng node → thành nhánh con
   *  của node đó; vùng trống → nhánh trôi mới tại đúng chỗ thả. */
  placeCardAt(cardId: string, x: number, y: number): void {
    const map = this.store.getMap();
    const card = map.cards[cardId];
    if (!card) {
      // KW1 — card kéo từ phạm vi "Toàn Workspace" (chưa có trong map này).
      void this.importRegistryCard(cardId, { kind: "at", x, y });
      return;
    }
    const hit = this.renderer.hitTestNode(map, x, y, this.view);
    const w = this.renderer.toWorld(x, y, this.view);
    const cmd = new CreateNodeWithCardCommand(cardId, card.title || "Card", hit, hit ? null : { x: w.x, y: w.y - 18 });
    this.store.dispatch(cmd);
    this.selection.selectSingleNode(cmd.newNodeId);
  }

  /**
   * KW1 — đưa card từ kho card chung của Workspace vào map đang mở (giữ
   * nguyên id — cùng một card, sửa ở đâu cũng cập nhật sang map kia):
   *  - "child": thành nhánh con của node đang chọn (không chọn: của gốc);
   *  - "attach": gắn vào node đang chọn;
   *  - "at": thả ở điểm màn hình (trúng node → nhánh con, trống → nhánh trôi).
   * Một bước hoàn tác. Trả về false nếu không làm được.
   */
  async importRegistryCard(cardId: string, target: { kind: "child" } | { kind: "attach" } | { kind: "at"; x: number; y: number }): Promise<boolean> {
    const map = this.store.getMap();
    const cmds: Command[] = [];
    let title = map.cards[cardId]?.title ?? "";
    if (!map.cards[cardId]) {
      const file = await getWorkspaceRepo()?.readCard(cardId);
      if (!file) {
        void showAlert("Không đọc được card này trong thư mục Workspace.");
        return false;
      }
      cmds.push(new ImportCardCommand(file.card, file.assets));
      title = file.card.title;
    }
    let reveal: (() => string) | null = null;
    if (target.kind === "attach") {
      const nodeId = this.selection.primary;
      if (!nodeId || !map.nodes[nodeId]) return false;
      cmds.push(new AttachCardToNodeCommand(nodeId, cardId));
    } else if (target.kind === "child") {
      const parentId = this.selection.primary && map.nodes[this.selection.primary] ? this.selection.primary : map.rootId;
      const c = new CreateNodeWithCardCommand(cardId, title || "Card", parentId);
      cmds.push(c);
      reveal = () => c.newNodeId;
    } else {
      const hit = this.renderer.hitTestNode(map, target.x, target.y, this.view);
      const w = this.renderer.toWorld(target.x, target.y, this.view);
      const c = new CreateNodeWithCardCommand(cardId, title || "Card", hit, hit ? null : { x: w.x, y: w.y - 18 });
      cmds.push(c);
      reveal = () => c.newNodeId;
    }
    this.store.dispatch(new CompositeCommand(cmds, "Thêm card từ Workspace"));
    if (reveal) this.revealNode(reveal());
    return true;
  }

  /** H1 — thêm card thành nhánh con của node đang chọn (nút trong Thư viện,
   *  cách không cần kéo-thả). */
  addCardAsChildOfSelection(cardId: string): void {
    const map = this.store.getMap();
    const card = map.cards[cardId];
    const parentId = this.selection.primary ?? map.rootId;
    if (!card || !map.nodes[parentId]) return;
    const cmd = new CreateNodeWithCardCommand(cardId, card.title || "Card", parentId);
    this.store.dispatch(cmd);
    this.revealNode(cmd.newNodeId);
  }

  private onFileDrop(e: DragEvent): void {
    const files = imageFilesFrom(e.dataTransfer);
    if (!e.dataTransfer?.types.includes("Files")) return;
    e.preventDefault();
    if (files.length === 0) {
      void showAlert("Chỉ thả được file ảnh vào node.");
      return;
    }
    const { x, y } = this.screenPos(e);
    const hit = this.renderer.hitTestNode(this.store.getMap(), x, y, this.view);
    if (!hit) {
      void showAlert("Thả ảnh lên đúng một node để thêm ảnh vào card của node đó.");
      return;
    }
    void this.addImagesToNode(hit, files);
  }

  private screenPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onMouseDown(e: MouseEvent): void {
    // Chuột phải: để onContextMenu lo (chọn đúng đối tượng rồi mở menu) —
    // không bắt đầu kéo/chọn vùng.
    if (e.button === 2) return;
    const { x, y } = this.screenPos(e);
    this.dragStartScreen = { x, y };
    this.dragMoved = false;
    const map = this.store.getMap();

    if (this.linkingMode) {
      const hit = this.renderer.hitTestNode(map, x, y, this.view);
      if (hit) {
        if (!this.linkSourceId) {
          this.linkSourceId = hit;
          this.updateLinkingHintText();
          this.draw(); // QUAN TRỌNG: trước đây thiếu dòng này nên chọn
          // xong node nguồn không có gì đổi trên màn hình — trông như
          // click "không ăn" dù dữ liệu đã ghi nhận đúng.
        } else if (hit !== this.linkSourceId) {
          // Không dùng window.prompt() nữa: hộp thoại đó bị Simple
          // Browser trong VS Code chặn (và có thể bị chặn ở các khung
          // nhúng khác), khiến thao tác âm thầm thất bại. Thay vào đó,
          // tạo liên kết với nhãn mặc định trước, giống hệt cách làm
          // với Tóm tắt, rồi mở ô sửa ngay tại chỗ — luôn hoạt động,
          // không phụ thuộc trình duyệt nào.
          const cmd = new AddRelationshipCommand(this.linkSourceId, hit, "Relationship");
          this.store.dispatch(cmd);
          this.linkingMode = false;
          this.linkSourceId = null;
          this.linkingHint.classList.remove("open");
          this.onLinkingModeChange?.(false);
          this.selection.selectRelationship(cmd.newRelationshipId);
          requestAnimationFrame(() => this.startEditRelationshipLabel(cmd.newRelationshipId));
        }
      }
      return;
    }

    // P2.6 — đang ở chế độ sao chép định dạng: bấm trúng node nào thì
    // áp định dạng đã lưu cho node đó, GIỮ CHẾ ĐỘ (khác linkingMode ở
    // trên — không tự tắt sau 1 lần bấm, để áp liên tiếp cho nhiều
    // node mà không phải bấm lại nút mỗi lần).
    if (this.formatPainterPatch) {
      const hit = this.renderer.hitTestNode(map, x, y, this.view);
      if (hit) this.applyFormatPainterTo(hit);
      return;
    }

    if (this.spaceDown || e.button === 1) {
      this.dragMode = "pan";
      this.panStart = { x: e.clientX - this.view.offsetX, y: e.clientY - this.view.offsetY };
      this.canvas.style.cursor = "grabbing";
      e.preventDefault();
      return;
    }

    // P2.5b — ghi chú dán vẽ ĐÈ LÊN TRÊN mọi thứ khác (xem draw() trong
    // CanvasRenderer), nên cũng phải được ưu tiên bắt TRƯỚC mọi hit-test
    // khác — nếu không, một ghi chú dán nằm chồng lên node sẽ không bao
    // giờ bấm chọn được, dù nhìn thấy nó rõ ràng ở trên cùng.
    const stickyHit = this.renderer.hitTestStickyNote(map, x, y, this.view);
    if (stickyHit) {
      this.selection.selectStickyNote(stickyHit);
      this.draggedStickyNoteId = stickyHit;
      this.dragMode = "sticky-drag-pending";
      return;
    }

    if (this.selection.relId) {
      const relId = this.selection.relId;
      if (this.renderer.hitTestRelBendHandle(relId, x, y, this.view)) {
        this.bendCommand = new SetRelationshipBendCommand(relId);
        this.store.beginSession(this.bendCommand);
        this.dragMode = "rel-bend";
        return;
      }
    }

    if (this.selection.ids.size === 1 && this.selection.primary && !this.selection.relId && !this.selection.summaryId) {
      const primaryNode = map.nodes[this.selection.primary];
      if (primaryNode && this.renderer.hitTestResizeHandle(primaryNode, x, y, this.view)) {
        this.resizeNodeId = primaryNode.id;
        this.resizeStartSize = { w: primaryNode.width, h: primaryNode.height };
        this.sizeCommand = new SetNodeSizeCommand(primaryNode.id, this.resizeStartSize);
        this.store.beginSession(this.sizeCommand);
        this.dragMode = "resize";
        return;
      }
    }

    // P1.9 — bấm vào chấm tròn đánh dấu nhánh thu gọn để bung ra ngay,
    // không cần chọn node rồi bấm phím C. Đặt TRƯỚC hit-test thân node
    // vì chấm nằm ngoài hình chữ nhật của node (bên phải, cách 10px).
    const markerHit = this.renderer.hitTestCollapsedMarker(map, x, y, this.view);
    if (markerHit) {
      this.selection.selectSingleNode(markerHit);
      // P2.7g — bấm thường: cycle qua nấc kế tiếp. Giữ Shift: mở NGAY
      // toàn bộ, bỏ qua các nấc giữa — cho ai vẫn muốn hành vi "mở hết
      // một phát" quen thuộc (marker CHỈ hiện khi node đang thu gọn —
      // nấc 1 — nên đây luôn là lần bấm ĐẦU TIÊN của một chu kỳ).
      if (e.shiftKey) {
        this.store.dispatch(new ExpandAllCommand(markerHit));
      } else {
        this.store.dispatch(new CycleCollapseLevelCommand(markerHit));
      }
      return;
    }

    const hitId = this.renderer.hitTestNode(map, x, y, this.view);
    if (hitId) {
      const hitNode = map.nodes[hitId] as MindNode;
      if (this.renderer.hitTestLinkIcon(map, hitNode, x, y, this.view)) {
        // Chỉ mở link có scheme an toàn (http/https/mailto) — link có thể đến
        // từ file người khác gửi (JSON/XMind/Excel), không được tin tuyệt đối.
        const safe = toSafeUrl(hitNode.link);
        if (safe) window.open(safe, "_blank", "noopener,noreferrer");
        else void showAlert("Liên kết không hợp lệ hoặc không an toàn nên không được mở.");
        return;
      }
      // P2.10 — bấm icon 🖼 mở ảnh cỡ lớn, giống hệt cách icon 🔗 xử lý
      // ở trên (một hành động riêng, không lẫn với chọn/kéo node).
      if (this.renderer.hitTestImageIcon(map, hitNode, x, y, this.view)) {
        const asset = hitNode.imageAssetId ? map.assets[hitNode.imageAssetId] : null;
        if (asset) void showImagePreview(asset.dataBase64, asset.mimeType);
        return;
      }
      // P2.7f — bấm trúng checkbox hoàn thành thì đảo trạng thái, KHÔNG
      // chọn/kéo node (giống cách icon link ở trên xử lý — bấm icon là
      // một hành động riêng, không lẫn với việc chọn node).
      if (this.renderer.hitTestCheckbox(map, hitNode, x, y, this.view)) {
        this.selection.selectSingleNode(hitId);
        this.store.dispatch(new UpdateNodeStyleCommand(hitId, { checked: !hitNode.checked }));
        return;
      }
      // Bấm vào nội dung card trên node (render/cardLayout.ts): ảnh → xem
      // lớn; bảng → trình sửa bảng; trích văn bản / biểu tượng đính kèm →
      // mở trang card. Hành động riêng, không chọn-kéo node.
      const part = this.renderer.hitTestCardPart(map, hitNode, x, y, this.view);
      if (part && hitNode.cardId) {
        this.selection.selectSingleNode(hitId);
        if (part.kind === "image") this.openNodeImages(hitId, part.blockId);
        else if (part.kind === "table") tableEditorStore.set({ cardId: hitNode.cardId, blockId: part.blockId });
        else this.openCardPage(hitNode.cardId, part.blockId);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        this.selection.toggleNode(hitId);
        return; // không kéo khi đang thao tác chọn nhiều
      }
      this.selection.selectSingleNode(hitId);
      this.draggedNodeId = hitId;
      this.dragMode = "node-drag-pending"; // quyết định free-drag hay reparent ở mousemove, sau khi vượt ngưỡng
      return;
    }

    const relHit = this.renderer.hitTestRelationship(x, y, this.view);
    if (relHit) {
      this.selection.selectRelationship(relHit);
      return;
    }
    const summaryHit = this.renderer.hitTestSummary(x, y, this.view);
    if (summaryHit) {
      this.selection.selectSummary(summaryHit);
      return;
    }
    const boundaryHit = this.renderer.hitTestBoundary(x, y, this.view);
    if (boundaryHit) {
      this.selection.selectBoundary(boundaryHit);
      return;
    }

    // Không trúng gì — bắt đầu chọn vùng (marquee).
    this.dragMode = "marquee";
    this.marqueeAdditive = e.ctrlKey || e.metaKey || e.shiftKey;
    this.marqueeCurrentScreen = { x, y };
    this.showMarqueeBox(x, y, x, y);
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.dragMode === null) {
      this.updateHover(x, y);
      return;
    }

    if (
      !this.dragMoved &&
      (Math.abs(x - this.dragStartScreen.x) > CLICK_THRESHOLD_PX || Math.abs(y - this.dragStartScreen.y) > CLICK_THRESHOLD_PX)
    ) {
      this.dragMoved = true;
      if (this.dragMode === "node-drag-pending") this.beginNodeDrag();
      if (this.dragMode === "sticky-drag-pending") this.beginStickyDrag();
    }

    switch (this.dragMode) {
      case "pan":
        this.view.offsetX = e.clientX - this.panStart.x;
        this.view.offsetY = e.clientY - this.panStart.y;
        this.draw();
        this.onViewChange?.();
        break;
      case "node-drag":
        this.updateNodeDrag(x, y);
        break;
      case "sticky-drag":
        this.updateStickyDrag(x, y);
        break;
      case "resize":
        if (this.dragMoved) this.updateResize(x, y);
        break;
      case "rel-bend":
        this.updateRelBend(x, y);
        break;
      case "marquee":
        this.marqueeCurrentScreen = { x, y };
        this.updateMarqueeBox(this.dragStartScreen.x, this.dragStartScreen.y, x, y);
        break;
      default:
        break;
    }
  }

  private onMouseUp(): void {
    switch (this.dragMode) {
      case "node-drag-pending":
        break; // click thuần, đã chọn ở mousedown rồi, không có gì thêm
      case "node-drag":
        this.finishNodeDrag();
        break;
      case "sticky-drag-pending":
        break; // click thuần, đã chọn ở mousedown rồi, không có gì thêm
      case "sticky-drag":
        this.finishStickyDrag();
        break;
      case "resize":
        if (this.dragMoved) this.store.endSession();
        else this.store.cancelSession();
        this.resizeNodeId = null;
        this.sizeCommand = null;
        break;
      case "rel-bend":
        if (this.dragMoved) this.store.endSession();
        else this.store.cancelSession();
        this.bendCommand = null;
        break;
      case "marquee":
        this.finalizeMarquee();
        this.hideMarqueeBox();
        break;
      case "pan":
        this.canvas.style.cursor = this.spaceDown ? "grab" : "default";
        break;
      default:
        break;
    }
    this.dragMode = null;
    this.draw();
  }

  // P2.13: ngưỡng khoảng cách (px trên màn hình) để coi một node là
  // "đủ gần con trỏ chuột" khi chọn node neo lúc zoom bằng lăn chuột.
  // Nếu con trỏ ở quá xa mọi node (vượt ngưỡng này) thì không hợp lý
  // khi "hút" cả sơ đồ về phía một node xa xôi nào đó — lúc này dùng
  // node gốc làm neo thay vì node gần-nhất-nhưng-vẫn-rất-xa.
  private static readonly ZOOM_ANCHOR_NEAR_CURSOR_PX = 260;

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const { x: screenX, y: screenY } = this.screenPos(e);
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    const newScale = Math.min(3, Math.max(0.25, this.view.scale * factor));
    if (newScale === this.view.scale) return; // đã chạm biên phóng to/thu nhỏ, không đổi gì

    // Giữ nguyên điểm world đang nằm dưới con trỏ trước và sau khi đổi
    // scale — đó chính là "zoom lấy vị trí con trỏ làm tâm". Không làm
    // vậy thì điểm dưới con trỏ sẽ trôi đi mỗi lần cuộn, rất khó chịu
    // khi đang zoom vào một chỗ cụ thể trên sơ đồ lớn.
    const worldX = (screenX - this.view.offsetX) / this.view.scale;
    const worldY = (screenY - this.view.offsetY) / this.view.scale;
    this.view.offsetX = screenX - worldX * newScale;
    this.view.offsetY = screenY - worldY * newScale;
    this.view.scale = newScale;

    // P2.13: zoom lấy con trỏ làm tâm ở trên vẫn có thể khiến cả sơ đồ
    // trôi dần ra ngoài khung hình sau nhiều lần cuộn liên tiếp (nhất
    // là khi cuộn tại rìa canvas). Sau khi đổi scale, dịch nhẹ thêm
    // một bước để đảm bảo "node neo" luôn nằm trong vùng nhìn thấy:
    // ưu tiên active node đang chọn, rồi tới node gần con trỏ nhất
    // (nếu đủ gần), cuối cùng là node gốc.
    const anchorId = this.resolveZoomAnchorNodeId(screenX, screenY);
    if (anchorId) {
      const { dx, dy } = this.computeScrollIntoViewDelta(anchorId);
      this.view.offsetX += dx;
      this.view.offsetY += dy;
    }

    this.draw();
    this.onViewChange?.();
  }

  /**
   * Chọn "node neo" cần giữ trong khung hình khi zoom bằng lăn chuột,
   * theo đúng thứ tự ưu tiên: (1) active node đang được chọn — vì
   * người dùng rõ ràng đang thao tác quanh node đó; (2) nếu không có
   * active node, node gần con trỏ chuột nhất, miễn là con trỏ đủ gần
   * (trong ngưỡng ZOOM_ANCHOR_NEAR_CURSOR_PX); (3) nếu không thỏa cả
   * hai điều trên (không chọn gì và con trỏ ở xa mọi node) thì lấy
   * node gốc của map làm neo.
   */
  private resolveZoomAnchorNodeId(screenX: number, screenY: number): string | null {
    const map = this.store.getMap();
    const primary = this.selection.primary;
    if (primary && map.nodes[primary]) return primary;

    let nearestId: string | null = null;
    let nearestDist = Infinity;
    for (const id in map.nodes) {
      const node = map.nodes[id] as MindNode;
      const cx = (node.x + node.width / 2) * this.view.scale + this.view.offsetX;
      const cy = (node.y + node.height / 2) * this.view.scale + this.view.offsetY;
      const dist = Math.hypot(cx - screenX, cy - screenY);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = id;
      }
    }
    if (nearestId && nearestDist <= AppController.ZOOM_ANCHOR_NEAR_CURSOR_PX) {
      return nearestId;
    }
    return map.nodes[map.rootId] ? map.rootId : null;
  }

  private onDblClick(e: MouseEvent): void {
    const { x, y } = this.screenPos(e);
    const map = this.store.getMap();
    const stickyHit = this.renderer.hitTestStickyNote(map, x, y, this.view);
    if (stickyHit) {
      this.startEditStickyNoteText(stickyHit);
      return;
    }
    const nodeHit = this.renderer.hitTestNode(map, x, y, this.view);
    if (nodeHit) {
      this.startEditNodeText(nodeHit);
      return;
    }
    const relHit = this.renderer.hitTestRelationship(x, y, this.view);
    if (relHit) {
      this.startEditRelationshipLabel(relHit);
      return;
    }
    const summaryHit = this.renderer.hitTestSummary(x, y, this.view);
    if (summaryHit) {
      this.startEditSummaryLabel(summaryHit);
      return;
    }
    const boundaryHit = this.renderer.hitTestBoundary(x, y, this.view);
    if (boundaryHit) this.startEditBoundaryLabel(boundaryHit);
  }

  // --- node-drag: quyết định free-drag hay reparent -----------------

  private beginNodeDrag(): void {
    if (!this.draggedNodeId) return;
    const node = requireNode(this.store.getMap(), this.draggedNodeId);
    this.offsetStartValue = { x: node.offsetX, y: node.offsetY };
    this.offsetStartWorld = this.renderer.toWorld(this.dragStartScreen.x, this.dragStartScreen.y, this.view);
    this.offsetCommand = new SetNodeOffsetCommand(this.draggedNodeId, this.offsetStartValue);
    this.store.beginSession(this.offsetCommand);
    this.dragMode = "node-drag";
  }

  private updateNodeDrag(screenX: number, screenY: number): void {
    if (!this.draggedNodeId || !this.offsetCommand) return;
    const map = this.store.getMap();
    const world = this.renderer.toWorld(screenX, screenY, this.view);
    const dx = world.x - this.offsetStartWorld.x;
    const dy = world.y - this.offsetStartWorld.y;

    // Truyền dropTargetPreview HIỆN TẠI (kết quả từ khung hình TRƯỚC)
    // làm currentTarget — đây là điều kiện BẮT BUỘC để cơ chế "vào dễ,
    // ra khó" (hysteresis) trong computeDropTarget hoạt động: nếu
    // không truyền, hàm không có gì để so sánh, sẽ luôn dùng ngưỡng
    // HẸP (ENTER_RATIO) cho mọi khe kể cả khe đang giữ, quay lại đúng
    // vấn đề "nhích nhẹ là đổi hẳn vị trí".
    this.dropTargetPreview = computeDropTarget(map, this.draggedNodeId, world.x, world.y, this.dropTargetPreview);
    this.offsetCommand.setTarget({ x: this.offsetStartValue.x + dx, y: this.offsetStartValue.y + dy });
    this.store.updateSession(this.offsetCommand);
  }

  private finishNodeDrag(): void {
    if (!this.draggedNodeId) return;
    const draggedId = this.draggedNodeId;
    const target = this.dropTargetPreview;

    if (!this.dragMoved) {
      this.store.cancelSession();
    } else if (target) {
      this.store.cancelSession(); // bỏ phần "kéo tự do xem trước", chỉ giữ lại việc đổi cấu trúc
      const map = this.store.getMap();
      const targetIndex = target.kind === "child" ? map.nodes[target.parentId]?.children.length ?? 0 : target.index;
      try {
        this.store.dispatch(new MoveNodeCommand(draggedId, target.parentId, targetIndex));
      } catch (err) {
        // an toàn cuối cùng: nếu vì lý do gì đó lệnh không hợp lệ (ví
        // dụ vòng lặp lọt qua computeDropTarget), không làm sập ứng
        // dụng — chỉ bỏ qua thao tác thả này.
        console.warn("Không thể di chuyển node:", err);
      }
    } else {
      this.store.endSession();
    }

    this.draggedNodeId = null;
    this.offsetCommand = null;
    this.dropTargetPreview = null;
  }

  // --- kéo ghi chú dán (P2.5b) — đơn giản hơn node-drag hẳn, không có
  // khái niệm thả vào node khác để đổi cấu trúc, chỉ có kéo tự do ------

  private beginStickyDrag(): void {
    if (!this.draggedStickyNoteId) return;
    const note = this.store.getMap().stickyNotes.find((n) => n.id === this.draggedStickyNoteId);
    if (!note) return;
    this.stickyStartValue = { x: note.x, y: note.y };
    this.stickyStartWorld = this.renderer.toWorld(this.dragStartScreen.x, this.dragStartScreen.y, this.view);
    this.stickyPositionCommand = new SetStickyNotePositionCommand(this.draggedStickyNoteId, this.stickyStartValue);
    this.store.beginSession(this.stickyPositionCommand);
    this.dragMode = "sticky-drag";
  }

  private updateStickyDrag(screenX: number, screenY: number): void {
    if (!this.draggedStickyNoteId || !this.stickyPositionCommand) return;
    const world = this.renderer.toWorld(screenX, screenY, this.view);
    const dx = world.x - this.stickyStartWorld.x;
    const dy = world.y - this.stickyStartWorld.y;
    this.stickyPositionCommand.setTarget({ x: this.stickyStartValue.x + dx, y: this.stickyStartValue.y + dy });
    this.store.updateSession(this.stickyPositionCommand);
  }

  private finishStickyDrag(): void {
    if (this.dragMoved) this.store.endSession();
    else this.store.cancelSession();
    this.draggedStickyNoteId = null;
    this.stickyPositionCommand = null;
  }

  // --- resize ---------------------------------------------------------

  private updateResize(screenX: number, screenY: number): void {
    if (!this.resizeNodeId || !this.sizeCommand) return;
    const dx = (screenX - this.dragStartScreen.x) / this.view.scale;
    const dy = (screenY - this.dragStartScreen.y) / this.view.scale;
    const w = Math.max(50, this.resizeStartSize.w + dx);
    const h = Math.max(28, this.resizeStartSize.h + dy);
    this.sizeCommand.setTarget({ w, h });
    this.store.updateSession(this.sizeCommand);
  }

  // --- uốn đường liên kết ---------------------------------------------

  private updateRelBend(screenX: number, screenY: number): void {
    if (!this.bendCommand) return;
    const world = this.renderer.toWorld(screenX, screenY, this.view);
    this.bendCommand.setTarget(world);
    this.store.updateSession(this.bendCommand);
  }

  // --- hover ------------------------------------------------------------

  // --- P1.9: điều hướng bằng phím mũi tên -----------------------------

  /**
   * Trái = về cha. Phải = xuống con đầu tiên (chỉ khi nhánh đang mở) —
   * đây là hai phím DUY NHẤT đi theo quan hệ cha-con trong cây.
   *
   * Lên/Xuống đi theo VỊ TRÍ THẬT trên canvas (findVisuallyNearestNode
   * trong render/geometry.ts), không theo cấu trúc cây — sửa lại sau
   * khi phát hiện: với một nhánh dạng chuỗi dài (mỗi node chỉ có đúng
   * 1 con), đi theo thứ tự cây khiến Xuống làm y hệt việc Phải đã làm
   * (lặn sâu mãi vào một nhánh), không bao giờ chạm sang nhánh khác.
   */
  private navigateArrow(direction: "left" | "right" | "up" | "down"): void {
    const map = this.store.getMap();
    const currentId = this.selection.primary ?? map.rootId;
    const currentNode = map.nodes[currentId];
    if (!currentNode) return;

    // P2.7c — Tree Down xoay trục 90° so với mọi layout khác: độ sâu
    // (cha↔con) giờ nằm trên TRỤC DỌC, không phải trục ngang — nên
    // Lên/Xuống mới là "vào con/về cha", còn Trái/Phải mới là "tìm
    // anh em cùng hàng". Với mọi layout khác (logicRight/Left/Both),
    // giữ nguyên như trước: Trái/Phải là cha/con, Lên/Xuống tìm hàng.
    const isVertical = isVerticalLayout(map.layoutType);
    const isDepthKey = isVertical ? direction === "up" || direction === "down" : direction === "left" || direction === "right";

    let targetId: string | null = null;

    if (isDepthKey) {
      if (currentNode.parentId === null) {
        // P2.7b — node hiện tại là một GỐC (map.rootId hoặc nhánh
        // trôi) — không có cha để so sánh hướng. Với Logic Both Sides,
        // các con cấp 1 có thể ở KHÁC BÊN nhau, nên phải tìm đúng con
        // đang ở ĐÚNG PHÍA đã bấm (so theo toạ độ thật). Với
        // logicRight/logicLeft thuần tuý, MỌI con đều cùng một bên,
        // nên hàm này tự nhiên chỉ "trúng" khi bấm đúng hướng đó — ăn
        // khớp hệt hành vi cũ mà không cần biết layoutType cụ thể.
        targetId = this.findFirstChildOnSide(map, currentNode, direction);
      } else {
        // P2.7a — xác định "vào sâu hơn" hay "về cha nông hơn" bằng
        // cách SO SÁNH TOẠ ĐỘ THẬT với cha — theo trục Y cho layout
        // dọc, trục X cho layout ngang — đáng tin cậy cho mọi layout
        // (một khi một nhánh đã cam kết một hướng, con cháu của nó
        // luôn cùng hướng với nó).
        const parent = map.nodes[currentNode.parentId];
        const childIsBefore = isVertical
          ? parent
            ? currentNode.y + currentNode.height <= parent.y
            : false
          : parent
            ? currentNode.x + currentNode.width <= parent.x
            : false;
        const isGoingDeeper = isVertical
          ? childIsBefore
            ? direction === "up"
            : direction === "down"
          : childIsBefore
            ? direction === "left"
            : direction === "right";
        if (isGoingDeeper) {
          if (!currentNode.collapsed && currentNode.children.length > 0) {
            targetId = currentNode.children[0] as string;
          }
        } else {
          targetId = currentNode.parentId;
        }
      }
    } else {
      targetId = findVisuallyNearestNode(map, currentId, direction);
    }

    if (targetId) {
      this.selection.selectSingleNode(targetId);
      this.scrollIntoView(targetId);
    }
  }

  /** P2.7b/c — tìm con TRỰC TIẾP ĐẦU TIÊN của root đang nằm ở đúng
   *  phía đã bấm, so theo toạ độ thật — trục X cho trái/phải, trục Y
   *  cho lên/xuống. Trả về null nếu không con nào ở đúng phía đó (ví
   *  dụ bấm "trái" trên một map thuần logicRight, nơi mọi con đều ở
   *  bên phải). */
  private findFirstChildOnSide(
    map: MindMap,
    root: MindNode,
    direction: "left" | "right" | "up" | "down"
  ): string | null {
    if (root.collapsed || root.children.length === 0) return null;
    for (const childId of root.children) {
      const child = map.nodes[childId];
      if (!child) continue;
      if (direction === "left" || direction === "right") {
        const isLeft = child.x + child.width <= root.x;
        const isRight = child.x >= root.x + root.width;
        if (direction === "left" && isLeft) return childId;
        if (direction === "right" && isRight) return childId;
      } else {
        const isAbove = child.y + child.height <= root.y;
        const isBelow = child.y >= root.y + root.height;
        if (direction === "up" && isAbove) return childId;
        if (direction === "down" && isBelow) return childId;
      }
    }
    return null;
  }

  /** Về node gốc, cuộn khung nhìn theo nếu gốc đang nằm ngoài tầm nhìn. */
  /** P2.7g (nút Toolbar mới) — về gốc, chọn + cuộn vào khung nhìn.
   *  Trước đây chỉ gọi được qua phím Home, giờ công khai để Toolbar
   *  cũng gọi được trực tiếp qua nút bấm. */
  navigateHome(): void {
    const rootId = this.store.getMap().rootId;
    this.selection.selectSingleNode(rootId);
    this.scrollIntoView(rootId);
  }

  /**
   * P2.8b — Minimap cần đặt/dịch view (getView() đã có sẵn từ trước,
   * xem đầu file — chỉ cần thêm đúng 2 hàm GHI này).
   */
  /** Đặt tâm khung nhìn CHÍNH vào đúng điểm world (worldX, worldY),
   *  GIỮ NGUYÊN scale hiện tại — dùng khi bấm trực tiếp lên Minimap để
   *  "nhảy" tới một chỗ trên bản đồ. */
  setViewCenter(worldX: number, worldY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.view.offsetX = rect.width / 2 - worldX * this.view.scale;
    this.view.offsetY = rect.height / 2 - worldY * this.view.scale;
    this.draw();
    this.onViewChange?.();
  }

  /** Dịch khung nhìn CHÍNH theo một khoảng lệch tính bằng ĐƠN VỊ WORLD
   *  (không phải pixel màn hình) — dùng khi KÉO khung chữ nhật biểu
   *  diễn khung nhìn ngay trên Minimap (Minimap có tỷ lệ thu nhỏ RIÊNG
   *  của nó, khác hẳn scale của khung nhìn chính, nên phải quy đổi về
   *  đơn vị world trước khi gọi hàm này, không truyền thẳng pixel đã
   *  kéo trên Minimap vào đây). */
  panViewByWorldDelta(worldDx: number, worldDy: number): void {
    this.view.offsetX -= worldDx * this.view.scale;
    this.view.offsetY -= worldDy * this.view.scale;
    this.draw();
    this.onViewChange?.();
  }

  /**
   * Dùng cho tìm kiếm — node kết quả có thể đang bị ẩn bên trong một
   * hoặc nhiều nhánh thu gọn (searchNodes duyệt TOÀN BỘ cây, không chỉ
   * phần đang hiển thị). Bung hết các tổ tiên đang thu gọn của nó
   * thành ĐÚNG MỘT bước hoàn tác (CompositeCommand), rồi mới chọn và
   * cuộn khung nhìn tới — nếu bung sau khi cuộn, layout mới có thể làm
   * lệch vị trí vừa cuộn tới.
   */
  /**
   * P2.8 — Explorer (chế độ "đồng bộ với canvas") dùng hàm này để
   * thu gọn/mở MỘT node cụ thể — nhị phân đơn giản (ẩn hết/hiện hết),
   * KHÔNG dùng cơ chế xoay 3 nấc của `toggleCollapsePrimary()` (đó là
   * thiết kế cho canvas, nơi "chỉ hiện con trực tiếp" có ý nghĩa thị
   * giác rõ ràng — trong một DANH SÁCH PHẲNG như Explorer, khái niệm
   * đó không cần thiết, thu gọn/mở nhị phân trực quan hơn nhiều).
   * Vẫn qua ĐÚNG `ToggleCollapseCommand` — đồng bộ hoàn toàn với
   * canvas và hoàn tác được bằng Ctrl+Z, không phải nhánh xử lý riêng.
   */
  toggleNodeCollapsedSimple(nodeId: string): void {
    const map = this.store.getMap();
    const node = map.nodes[nodeId];
    if (!node || node.children.length === 0) return;
    this.store.dispatch(new ToggleCollapseCommand(nodeId));
  }

  revealNode(nodeId: string): void {
    const map = this.store.getMap();
    if (!map.nodes[nodeId]) return;

    const collapsedAncestors: string[] = [];
    let cur = map.nodes[nodeId]?.parentId ?? null;
    while (cur) {
      const ancestor = map.nodes[cur];
      if (ancestor?.collapsed) collapsedAncestors.push(cur);
      cur = ancestor?.parentId ?? null;
    }

    if (collapsedAncestors.length > 0) {
      this.store.dispatch(
        new CompositeCommand(
          collapsedAncestors.map((id) => new ToggleCollapseCommand(id)),
          "Bung nhánh để hiện kết quả tìm kiếm"
        )
      );
    }

    this.selection.selectSingleNode(nodeId);
    // rAF: đợi layout cập nhật xong theo trạng thái vừa bung (nếu có)
    // trước khi đo vị trí để canh giữa — giống mẫu đã dùng ở nơi khác
    // trong file này (ví dụ createSummaryFromSelection). Dùng
    // centerOnNode (canh giữa thật) thay vì scrollIntoView (chỉ dịch
    // tối thiểu, dành cho mũi tên/Home) — kết quả tìm kiếm có thể nhảy
    // xa bất kỳ đâu trên map, cần canh giữa để dễ định hướng xung
    // quanh. Kèm vòng nhấp nháy để thu hút ánh mắt vào đúng node đó.
    requestAnimationFrame(() => {
      this.centerOnNode(nodeId);
      this.startSearchHighlight(nodeId);
    });
  }

  /**
   * Dịch khung nhìn (KHÔNG đổi zoom) chỉ đủ để đưa trọn node vào trong
   * vùng nhìn thấy, chừa một khoảng đệm quanh mép canvas. Không tự
   * canh giữa — dịch tối thiểu để tránh giật màn hình liên tục khi
   * bấm mũi tên nhiều lần liên tiếp.
   */
  private scrollIntoView(nodeId: string): void {
    const { dx, dy } = this.computeScrollIntoViewDelta(nodeId);
    if (dx !== 0 || dy !== 0) {
      this.view.offsetX += dx;
      this.view.offsetY += dy;
      this.draw();
      this.onViewChange?.();
    }
  }

  /**
   * Tính độ dịch chuyển (dx, dy) TỐI THIỂU cần để đưa trọn node vào
   * trong vùng nhìn thấy của canvas, chừa một khoảng đệm quanh mép —
   * không tự áp dụng, không tự vẽ lại. Tách riêng khỏi scrollIntoView
   * (P2.13) để cơ chế "giữ node neo trong khung hình khi zoom" trong
   * onWheel cũng dùng chung được phép tính này mà không vẽ lại hai lần.
   */
  private computeScrollIntoViewDelta(nodeId: string): { dx: number; dy: number } {
    const node = this.store.getMap().nodes[nodeId];
    if (!node) return { dx: 0, dy: 0 };
    const rect = this.canvas.getBoundingClientRect();
    const marginPx = 60 * this.view.scale;

    const screenX1 = node.x * this.view.scale + this.view.offsetX;
    const screenY1 = node.y * this.view.scale + this.view.offsetY;
    const screenX2 = (node.x + node.width) * this.view.scale + this.view.offsetX;
    const screenY2 = (node.y + node.height) * this.view.scale + this.view.offsetY;

    let dx = 0;
    let dy = 0;
    if (screenX1 < marginPx) dx = marginPx - screenX1;
    else if (screenX2 > rect.width - marginPx) dx = rect.width - marginPx - screenX2;
    if (screenY1 < marginPx) dy = marginPx - screenY1;
    else if (screenY2 > rect.height - marginPx) dy = rect.height - marginPx - screenY2;

    return { dx, dy };
  }

  /**
   * Canh GIỮA THẬT SỰ node vào tâm khung nhìn — khác scrollIntoView ở
   * trên (chỉ dịch tối thiểu, dùng cho mũi tên/Home để không giật màn
   * hình khi bấm liên tục). Dùng riêng cho tìm kiếm: kết quả tìm được
   * có thể nhảy một khoảng xa bất kỳ trên map, canh giữa cho dễ định
   * hướng xung quanh, không cần "nhẹ nhàng" như điều hướng từng bước.
   */
  private centerOnNode(nodeId: string): void {
    const node = this.store.getMap().nodes[nodeId];
    if (!node) return;
    const rect = this.canvas.getBoundingClientRect();
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    this.view.offsetX = rect.width / 2 - cx * this.view.scale;
    this.view.offsetY = rect.height / 2 - cy * this.view.scale;
    this.draw();
    this.onViewChange?.();
  }

  private updateHover(screenX: number, screenY: number): void {
    if (this.linkingMode) return;
    const map = this.store.getMap();

    if (this.renderer.hitTestCollapsedMarker(map, screenX, screenY, this.view)) {
      this.selection.setHovered(null);
      this.canvas.style.cursor = "pointer";
      return;
    }

    const hit = this.renderer.hitTestNode(map, screenX, screenY, this.view);
    this.selection.setHovered(hit);

    if (hit) {
      const node = map.nodes[hit] as MindNode;
      if (this.renderer.hitTestLinkIcon(map, node, screenX, screenY, this.view)) {
        this.canvas.style.cursor = "pointer";
      } else if (this.renderer.hitTestImageIcon(map, node, screenX, screenY, this.view)) {
        this.canvas.style.cursor = "pointer";
      } else if (this.renderer.hitTestCheckbox(map, node, screenX, screenY, this.view)) {
        this.canvas.style.cursor = "pointer";
      } else if (this.renderer.hitTestCardPart(map, node, screenX, screenY, this.view)) {
        this.canvas.style.cursor = "pointer";
      } else if (
        this.selection.ids.size === 1 &&
        this.selection.primary === hit &&
        this.renderer.hitTestResizeHandle(node, screenX, screenY, this.view)
      ) {
        this.canvas.style.cursor = "nwse-resize";
      } else {
        this.canvas.style.cursor = "grab";
      }
    } else {
      this.canvas.style.cursor = this.spaceDown ? "grab" : "default";
    }
  }

  // --- marquee ------------------------------------------------------------

  private showMarqueeBox(x1: number, y1: number, x2: number, y2: number): void {
    this.marqueeBox.style.display = "block";
    this.updateMarqueeBox(x1, y1, x2, y2);
  }
  private updateMarqueeBox(x1: number, y1: number, x2: number, y2: number): void {
    this.marqueeBox.style.left = `${Math.min(x1, x2)}px`;
    this.marqueeBox.style.top = `${Math.min(y1, y2)}px`;
    this.marqueeBox.style.width = `${Math.abs(x2 - x1)}px`;
    this.marqueeBox.style.height = `${Math.abs(y2 - y1)}px`;
  }
  private hideMarqueeBox(): void {
    this.marqueeBox.style.display = "none";
  }

  private finalizeMarquee(): void {
    const map = this.store.getMap();
    const x1 = this.dragStartScreen.x;
    const y1 = this.dragStartScreen.y;
    const x2 = this.marqueeCurrentScreen.x;
    const y2 = this.marqueeCurrentScreen.y;
    const sx1 = Math.min(x1, x2);
    const sx2 = Math.max(x1, x2);
    const sy1 = Math.min(y1, y2);
    const sy2 = Math.max(y1, y2);
    const w1 = this.renderer.toWorld(sx1, sy1, this.view);
    const w2 = this.renderer.toWorld(sx2, sy2, this.view);

    const found: string[] = [];
    for (const id of Object.keys(map.nodes)) {
      const n = map.nodes[id] as MindNode;
      if (n.x < w2.x && n.x + n.width > w1.x && n.y < w2.y && n.y + n.height > w1.y) {
        found.push(id);
      }
    }
    this.selection.applyMarqueeResult(found, this.marqueeAdditive, map.rootId);
  }

  // --- bàn phím ------------------------------------------------------------

  private onSpaceKeyDown(e: KeyboardEvent): void {
    if (e.code !== "Space") return;
    if (isEditing() || isTypingTarget(e.target)) return;
    this.spaceDown = true;
    if (this.dragMode === null) this.canvas.style.cursor = "grab";
    e.preventDefault();
  }
  private onSpaceKeyUp(e: KeyboardEvent): void {
    if (e.code !== "Space") return;
    this.spaceDown = false;
    if (this.dragMode === null) this.canvas.style.cursor = "default";
  }

  private onActionKeyDown(e: KeyboardEvent): void {
    // Ctrl+F phải luôn mở được ô tìm kiếm của app, kể cả khi đang gõ ở
    // một ô nhập khác (panel, ghi chú...) — nếu không chặn TRƯỚC guard
    // bên dưới, trình duyệt sẽ tự mở "Tìm trong trang" của chính nó.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      searchOpenStore.set(true);
      return;
    }
    // KW2 — Ctrl+K: bảng tìm toàn Workspace + lệnh (trình duyệt dùng Ctrl+K
    // cho thanh địa chỉ/tìm kiếm nên phải chặn mặc định).
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
      e.preventDefault();
      paletteOpenStore.update((open) => !open);
      return;
    }
    // P1.12 — Ctrl+S phải luôn "Lưu" vào file thật (nếu trình duyệt hỗ
    // trợ), kể cả khi đang gõ ở ô khác — cùng lý do với Ctrl+F ở trên,
    // nếu không trình duyệt sẽ tự mở hộp thoại "Lưu trang web" của nó
    // (vô nghĩa với người dùng — đó là lưu HTML của trang, không phải
    // dữ liệu mindmap). LUÔN preventDefault để tránh hành vi mặc định
    // đó, nhưng nếu KHÔNG hỗ trợ thì phải NÓI RÕ vì sao — im lặng
    // không làm gì sẽ khiến người dùng tưởng phím tắt bị hỏng.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      // Ctrl+Shift+S = "Lưu thành…" (luôn hỏi vị trí/tên/định dạng).
      void (e.shiftKey ? this.saveAs() : this.save());
      return;
    }

    if (isEditing() || isTypingTarget(e.target)) return;
    if (e.code === "Space") return; // đã xử lý ở onSpaceKeyDown

    if (e.key === "Escape") {
      if (this.searchIsOpen) {
        searchOpenStore.set(false);
        return;
      }
      if (this.formatPainterPatch) {
        this.stopFormatPainter();
        return;
      }
      if (this.linkingMode) {
        this.linkingMode = false;
        this.linkSourceId = null;
        this.linkingHint.classList.remove("open");
        this.onLinkingModeChange?.(false);
        this.draw();
        return;
      }
      if (this.dragMode === "node-drag") {
        this.store.cancelSession();
        this.draggedNodeId = null;
        this.offsetCommand = null;
        this.dropTargetPreview = null;
        this.dragMode = null;
        this.draw();
        return;
      }
      if (this.dragMode === "resize" || this.dragMode === "rel-bend") {
        this.store.cancelSession();
        this.dragMode = null;
        this.draw();
        return;
      }
      return;
    }

    const ctrlOrCmd = e.ctrlKey || e.metaKey;

    if (ctrlOrCmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      this.undo();
    } else if ((ctrlOrCmd && e.key.toLowerCase() === "z" && e.shiftKey) || (ctrlOrCmd && e.key.toLowerCase() === "y")) {
      e.preventDefault();
      this.redo();
    } else if (ctrlOrCmd && e.key.toLowerCase() === "c") {
      this.copySelection();
    } else if (ctrlOrCmd && e.key.toLowerCase() === "x") {
      e.preventDefault();
      this.cutSelection();
    } else if (ctrlOrCmd && e.key.toLowerCase() === "d") {
      e.preventDefault();
      this.duplicateSelection();
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.addChildToSelection();
    } else if (e.key === "Enter") {
      e.preventDefault();
      this.addSiblingToSelection();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.deleteSelection();
    } else if (e.key === "F2") {
      e.preventDefault();
      if (this.selection.primary) this.startEditNodeText(this.selection.primary);
    } else if (e.key.toLowerCase() === "c" && !ctrlOrCmd) {
      // P2.7g — Shift+C mở NGAY toàn bộ (bỏ qua các nấc giữa), C
      // thường cycle qua nấc kế tiếp (xem toggleCollapsePrimary()).
      this.toggleCollapsePrimary(e.shiftKey);
    } else if (e.key.toLowerCase() === "f" && !ctrlOrCmd) {
      // Không preventDefault vô điều kiện — chỉ khi không đang gõ chữ
      // ở đâu đó (tránh chặn người dùng gõ chữ "f" trong ô tìm kiếm
      // hay tên node). wireEvents() đã lọc target trước khi gọi tới
      // đây (xem hàm gọi handleKeyDown), nên tới đây coi như an toàn.
      this.fitToView();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.navigateArrow("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.navigateArrow("right");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.navigateArrow("up");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.navigateArrow("down");
    } else if (e.key === "Home") {
      e.preventDefault();
      this.navigateHome();
    } else if (e.key === "?") {
      e.preventDefault();
      toggleShortcutsModal();
    }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

// Cho phép nơi khác đóng ô nhập nếu người dùng bấm nút khác trong lúc
// đang sửa chữ, tránh để lại một <input> mồ côi trên màn hình.
export { cancelInlineEdit };
