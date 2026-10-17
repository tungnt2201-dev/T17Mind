/**
 * ui/uiStores.ts
 * ---------------------------------------------------------------------
 * Vài mẩu trạng thái giao diện THUẦN TUÝ, cần chia sẻ giữa hai component
 * Svelte độc lập (ví dụ: nút "Hướng dẫn định dạng" nằm trong Toolbar,
 * nhưng nội dung hộp thoại lại render trong HelpModal — hai component
 * riêng biệt cần một cách nói chuyện với nhau).
 *
 * Đây KHÔNG phải dữ liệu tài liệu (không lưu xuống file, không có
 * trong lịch sử hoàn tác) nên không thuộc core/store.ts — giống hệt lý
 * do SelectionModel đứng riêng, xem ghi chú đầu file ui/selection.ts.
 *
 * Dùng writable() bình thường ở đây (khác với svelteBridge.ts) vì đây
 * là trạng thái THUỘC VỀ Svelte ngay từ đầu, không phải bọc lại một
 * nguồn dữ liệu TypeScript đã có sẵn — không có rủi ro "sửa tắt qua
 * mặt Command" như với map dữ liệu.
 * ---------------------------------------------------------------------
 */
import { writable } from "svelte/store";

/** true khi đang ở chế độ "Tạo liên kết" (đã bấm nút, đang chờ chọn
 *  node nguồn/đích). AppController cập nhật store này qua callback
 *  onLinkingModeChange truyền vào lúc khởi tạo — xem main.ts. */
export const linkingModeStore = writable(false);

/** true khi hộp thoại "Hướng dẫn định dạng" đang mở. */
export const helpModalOpenStore = writable(false);

/** true khi ô tìm kiếm đang mở. Đóng bằng Esc (cả trong ô lẫn toàn cục,
 *  xem AppController), bằng nút ×, hoặc bấm lại Ctrl+F. */
export const searchOpenStore = writable(false);

/** P2.6 — true khi đang ở chế độ "sao chép định dạng" (đã bấm nguồn,
 *  đang chờ bấm đích — GIỮ CHẾ ĐỘ, bấm được nhiều đích liên tiếp, Esc
 *  để tắt). Cùng khuôn mẫu với linkingModeStore ở trên. */
export const formatPainterModeStore = writable(false);

/**
 * P2.8b — Minimap cần biết MỖI KHI khung nhìn chính (pan/zoom) đổi để
 * vẽ lại khung chữ nhật biểu diễn vùng đang xem. `view` trong
 * AppController là property THƯỜNG (không phải Svelte store) — dùng
 * đúng cơ chế `onViewChange` đã có sẵn từ trước (nối trong main.ts),
 * CỘNG THÊM việc tăng số đếm này lên 1 — Minimap chỉ cần SUBSCRIBE
 * vào con số này (không quan tâm giá trị cụ thể là bao nhiêu, chỉ cần
 * biết "có gì vừa đổi, hãy gọi controller.getView() đọc lại rồi vẽ
 * lại"), không cần lưu trùng lặp toàn bộ ViewTransform vào một store
 * riêng.
 */
export const viewVersionStore = writable(0);

/** P1.12 — true khi map hiện tại đã liên kết với một file thật trên
 *  đĩa (qua "Lưu file..."/"Mở file..."), dùng để đổi chữ nút Toolbar
 *  giữa "Lưu file..." (chưa có) và "Lưu" (đã có). `fileHandle` trong
 *  AppController là property THƯỜNG (không phải Svelte store) — cùng
 *  lý do với `viewVersionStore` ở trên, cần MỘT store riêng để Svelte
 *  biết khi nào re-render, không thể tự suy luận qua việc đọc field
 *  private trong một method thường. */
export const hasLinkedFileStore = writable(false);

/**
 * P2.8b — Minimap: khung nhỏ hiện toàn bộ bản đồ thu nhỏ, kéo thả vị
 * trí tự do + kéo đổi kích thước được (khác Explorer — Explorer chỉ
 * đổi được ĐỘ RỘNG vì luôn dính theo cạnh trái, Minimap là một hộp
 * NỔI TỰ DO nên cần đổi được CẢ 2 chiều, và vị trí cũng tự do luôn).
 * `x`/`y` = null nghĩa là CHƯA từng đặt — component tự tính một vị
 * trí mặc định hợp lý (góc dưới-phải khung canvas) ngay khi mount lần
 * đầu, dựa theo kích thước THẬT của khung chứa lúc đó (không đoán
 * trước bằng `window.innerWidth` ở đây, vì có thể sai nếu khung canvas
 * không chiếm trọn cửa sổ trình duyệt).
 */
export interface MinimapState {
  open: boolean;
  x: number | null;
  y: number | null;
  width: number;
  height: number;
  /** P2.8b (nâng cấp theo yêu cầu) — "sync" = chỉ vẽ đúng những node
   *  ĐANG HIỂN THỊ THẬT SỰ trên canvas (tôn trọng node.collapsed —
   *  giống hệt hình dạng thật của map). "independent" = LUÔN vẽ TOÀN
   *  BỘ node, bất kể đang thu gọn gì trên canvas — mặc định của chế
   *  độ này chính là "luôn bung hết", đúng yêu cầu, không cần theo
   *  dõi trạng thái mở/đóng riêng như Explorer (Minimap không có thao
   *  tác thu gọn/mở riêng lẻ từng node — chỉ có đúng 2 lựa chọn "theo
   *  đúng canvas" hoặc "luôn xem toàn cảnh"). */
  syncMode: "sync" | "independent";
}

export const minimapStore = writable<MinimapState>({
  open: false,
  x: null,
  y: null,
  width: 220,
  height: 170,
  syncMode: "sync",
});

/** P2.6d — true khi hộp thoại "Map gần đây" đang mở. */
export const mapsModalOpenStore = writable(false);

/**
 * P2.8 — Explorer: khung duyệt cây bên trái, lọc theo Tag/tìm chữ.
 * TOÀN BỘ trạng thái ở đây là UI THUẦN TUÝ của khung này (mở/đóng, độ
 * rộng, độ trong suốt, chế độ lọc, chữ đang gõ...) — KHÔNG lưu vào
 * file map, không có trong lịch sử hoàn tác, đúng tinh thần chung của
 * file này. Gộp thành MỘT object thay vì nhiều store rời — các trường
 * hay đổi CÙNG LÚC khi người dùng thao tác trên Explorer (ví dụ đổi
 * bộ lọc Tag thường đi kèm gõ thêm chữ tìm kiếm).
 *
 * `syncMode`: "sync" = thu gọn/mở trong Explorer DÙNG THẲNG
 * `node.collapsed` thật (đổi trong Explorer thì canvas đổi theo, qua
 * đúng Command như bấm trên canvas — vẫn hoàn tác được). "independent"
 * = Explorer tự giữ RIÊNG một danh sách "đang mở" trong
 * `independentExpandedIds`, không đụng gì tới `node.collapsed` — cho
 * phép duyệt sâu trong danh sách mà không ảnh hưởng gì tới những gì
 * đang hiện trên canvas.
 */
export interface ExplorerState {
  open: boolean;
  width: number;
  opacity: number;
  syncMode: "sync" | "independent";
  independentExpandedIds: Set<string>;
  searchText: string;
  selectedTagIds: Set<string>;
  tagFilterMode: "and" | "or";
  /** P2.8 (nâng cấp theo yêu cầu) — khối lọc Tag đặt CUỐI panel, gấp/mở
   *  được — để phần cây (khu vực chính) luôn có nhiều chỗ nhất có thể. */
  tagSectionOpen: boolean;
}

export const explorerStore = writable<ExplorerState>({
  open: false,
  width: 320,
  opacity: 100,
  syncMode: "sync",
  independentExpandedIds: new Set(),
  searchText: "",
  selectedTagIds: new Set(),
  tagFilterMode: "or",
  tagSectionOpen: false,
});

/** M2 — bảng đang mở trong trình sửa bảng (TableEditorModal), null =
 *  đóng. Mở từ SidePanel (mục Card) hoặc bấm thẻ thu nhỏ trên canvas. */
export interface TableEditorTarget {
  cardId: string;
  blockId: string;
}
export const tableEditorStore = writable<TableEditorTarget | null>(null);
