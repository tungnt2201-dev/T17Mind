/**
 * core/types.ts
 * ---------------------------------------------------------------------
 * Kiểu dữ liệu trung tâm của T17Mind. Đây là "bản đồ dữ liệu" — mọi
 * module khác trong dự án (layout, render, ui, io) đều dựa vào các
 * kiểu khai báo ở đây, KHÔNG được tự định nghĩa lại.
 *
 * Quy tắc phụ thuộc một chiều: file này không import bất cứ thứ gì
 * từ layout/, render/, ui/. Nó là đáy của kim tự tháp.
 * ---------------------------------------------------------------------
 */
import type { Theme } from "./theme";

/** Phiên bản cấu trúc dữ liệu hiện tại. Tăng số này mỗi khi đổi hình
 *  dạng MindNode/MindMap, và viết hàm di trú tương ứng trong migrate.ts */
export const CURRENT_SCHEMA_VERSION = 22;

export type BorderStyle = "solid" | "dashed" | "dotted" | "none";
export type EdgeShape = "curve" | "straight";
export type TextAlign = "left" | "center" | "right";
/** P2.6b-1 — "auto" giữ NGUYÊN VẸN hành vi hiện tại (một dòng, tự
 *  cắt bớt nếu node bị ép hẹp thủ công) — bắt buộc phải có trạng thái
 *  này để KHÔNG đổi giao diện của mọi node/file đã có từ trước, chỉ
 *  node nào người dùng CHỦ ĐỘNG chọn "wrap"/"shrink" mới đổi cách vẽ. */
export type TextFit = "auto" | "wrap" | "shrink";

/** Một node trong sơ đồ tư duy. */
export interface MindNode {
  readonly id: string;
  text: string;
  parentId: string | null;
  /** id của các con, ĐÚNG THỨ TỰ hiển thị trên sơ đồ. */
  children: string[];
  collapsed: boolean;

  notes: string | null;
  color: string | null;
  fill: string | null;
  fillTransparent: boolean;
  /** P2.6c — mức độ đậm/nhạt của MÀU NỀN khi fillTransparent đang TẮT
   *  (0-100). Khác fillTransparent (bật/tắt có-không có màu nền hoàn
   *  toàn) — đây là một mức liên tục áp dụng LÊN TRÊN màu nền đang có.
   *  Mặc định 100 = đậm hoàn toàn, giữ đúng hành vi trước khi có
   *  tính năng này. */
  fillOpacity: number;
  borderStyle: BorderStyle;
  borderColor: string | null;
  link: string | null;

  /** P2.10 — id của ảnh nhúng gắn trên node này, tham chiếu vào
   *  map.assets (xem ImageAsset bên dưới). null = không có ảnh. KHÔNG
   *  lưu trực tiếp dữ liệu ảnh trên node — ảnh có thể nặng (base64),
   *  tách riêng ra map.assets để không làm nặng mọi thao tác đọc/ghi
   *  thuộc tính khác của node (giống cách Tag tách khỏi node từ P2.7e).
   *  Đổi qua SetNodeImageCommand riêng (core/commands.ts), KHÔNG qua
   *  UpdateNodeStyleCommand chung — vì thêm ảnh còn phải ghi thêm vào
   *  map.assets, một thay đổi ở CẤP MAP chứ không chỉ trên node. */
  imageAssetId: string | null;

  /** M1 (Card & Block) — id của Card gắn trên node này, tham chiếu vào
   *  map.cards. null = node chưa có card. Nhiều node CÓ THỂ trỏ cùng một
   *  card (card là đơn vị nội dung độc lập; node chỉ là "chỗ treo" nó
   *  lên sơ đồ — tinh thần Card của Heptabase). Đổi qua các Command ở
   *  core/cardCommands.ts, KHÔNG qua UpdateNodeStyleCommand. */
  cardId: string | null;

  /** Bố cục HAI BÊN — bên đã chọn (ghim) cho nhánh cấp 1 (con trực tiếp của gốc cây hai bên): kéo sang bên nào thì
   *  ở yên bên đó. Không có = tự chia theo chiều cao như trước. Tuỳ chọn (không đổi schema); bố cục khác bỏ qua. */
  side?: "left" | "right";

  /** P2.2 — biến node thành mục công việc. */
  /** Danh sách biểu tượng (ký tự emoji), vẽ thành một hàng phía trên node. */
  markers: string[];
  /** 0–100, null = không hiện vòng tiến độ. */
  progress: number | null;
  /** 1 (khẩn cấp) tới 5 (thấp), null = không hiện huy hiệu ưu tiên. */
  priority: number | null;
  /** P2.7e — id các Tag gán cho node này (tham chiếu vào map.tags,
   *  KHÔNG còn là chữ tự do như trước — xem TagDef bên dưới). Hiện
   *  dạng viên thuốc, màu lấy từ chính Tag tương ứng — LÀM TĂNG
   *  node.height khi có, xem layout/index.ts và
   *  render/CanvasRenderer.ts#getMeasurer. */
  tagIds: string[];
  /** KW5 — giá trị thuộc tính theo `TagField.id` (chuỗi chuẩn hoá: số "12.5", ngày
   *  "2026-10-24", lựa chọn = id option, chữ nguyên văn). Thiếu khoá = chưa đặt. Chỉ
   *  có nghĩa với các Tag node đang mang; đổi qua SetFieldValueCommand. */
  fieldValues?: Record<string, string>;

  /** Kiểu đường nối từ node này TỚI CÁC CON của nó (không phải tới cha). */
  edgeColor: string | null;
  edgeDash: boolean;
  edgeShape: EdgeShape;
  /** P2.7 (nâng cấp) — độ dày đường nối TỚI CÁC CON, tự chỉnh tay.
   *  null = TỰ ĐỘNG theo cấp (cấp càng sâu càng mỏng dần — xem
   *  render/geometry.ts#computeEdgeWidth), số cụ thể = ép cứng độ dày
   *  này, bỏ qua tính tự động. */
  edgeWidth: number | null;

  /** P2.6b-1 — định dạng chữ. null/"auto" = mặc định như trước giờ
   *  (xem TextFit ở trên). fontSize null = tự động theo cấp (gốc to
   *  hơn node thường, y hệt hành vi cũ). */
  fontSize: number | null;
  /** P2.6c — tên font tự do (ví dụ "Arial", "Times New Roman"). null =
   *  dùng font hệ thống mặc định như trước giờ. Không kiểm tra font có
   *  cài trên máy hay không — Canvas tự lùi về font dự phòng nếu không
   *  tìm thấy, giống hệt cách CSS font-family hoạt động. */
  fontFamily: string | null;
  textAlign: TextAlign;
  textFit: TextFit;

  /** P2.7f — đậm/nghiêng/gạch chân cho chữ chính của node. Độc lập với
   *  fontWeight tự động theo cấp (gốc vốn đã đậm sẵn — textBold=true
   *  trên gốc chỉ là "đậm thêm", không đổi gì vì đã đậm nhất định
   *  dạng rồi; trên node thường thì có tác dụng rõ). */
  textBold: boolean;
  textItalic: boolean;
  textUnderline: boolean;

  /** P2.7f — checkbox hoàn thành kiểu to-do. null = KHÔNG hiện checkbox
   *  (đa số node bình thường). false/true = có hiện, chưa/đã hoàn
   *  thành — true tự động gạch ngang chữ khi vẽ (xem
   *  render/CanvasRenderer.ts), không cần bật thêm textUnderline. */
  checked: boolean | null;

  /** P2.6b-2 — nhãn trên đường nối cha-con. LƯU TRÊN NODE CON (không
   *  phải node cha) — đại diện cho nhãn của đường nối TỚI CHÍNH NODE
   *  NÀY từ cha của nó. null = không có nhãn. Chỉ thật sự VẼ ra khi
   *  map.showEdgeLabels đang bật (xem MindMap#showEdgeLabels) — tắt
   *  công tắc không xoá dữ liệu, chỉ ẩn phần vẽ. */
  edgeLabel: string | null;

  /** Độ lệch thủ công so với vị trí do layout tính ra (kéo tự do). */
  offsetX: number;
  offsetY: number;
  /** Kích thước ép tay; null nghĩa là để layout tự đo theo nội dung chữ. */
  manualWidth: number | null;
  manualHeight: number | null;

  /** Toạ độ do layout tính, CHƯA cộng offset thủ công. layout/ ghi. */
  baseX: number;
  baseY: number;
  /** Toạ độ cuối cùng dùng để vẽ = base + offset cộng dồn từ tổ tiên.
   *  render/ và ui/ chỉ đọc hai trường này, không tự tính. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Liên kết chéo giữa hai node bất kỳ, không nhất thiết cùng nhánh. */
export interface Relationship {
  readonly id: string;
  fromId: string;
  toId: string;
  label: string;
  color: string | null;
  /** false = nét liền. Mặc định (undefined khi đọc file cũ) coi là true. */
  dash: boolean;
  /** Điểm điều khiển đường cong do người dùng kéo tay; null = tự tính. */
  bend: { x: number; y: number } | null;
}

/** Nhóm tóm tắt nhiều node cùng cấp bằng một ngoặc + nhãn. */
export interface Summary {
  readonly id: string;
  nodeIds: string[];
  label: string;
  color: string | null;
}

/**
 * P2.4 — Khoanh vùng: khung nền bo góc bao quanh một nhóm node BẤT KỲ
 * trên canvas — khác Summary ở chỗ KHÔNG YÊU CẦU cùng chung một node
 * cha, có thể gom node ở nhiều nhánh khác hẳn nhau.
 */
export interface Boundary {
  readonly id: string;
  nodeIds: string[];
  label: string;
  fillColor: string | null;
  borderColor: string | null;
  /** Nhóm trực quan (Visual Group): thiếu = hình chữ nhật như cũ (file cũ không đổi gì).
   *  Chỉ là TUỲ CHỌN HIỂN THỊ — đường bao thật luôn được tính lại từ vị trí node, không lưu. */
  visual?: BoundaryVisualOptions;
}

/**
 * Cách vẽ một nhóm: "rectangle" (khung chữ nhật cũ), "multiContour" (E — một hoặc nhiều
 * vùng bao tự thích nghi ôm sát các node), "distributed" (F — viền/chip nhỏ trên từng node
 * thành viên, không có vùng nền lớn).
 */
export type BoundaryMode = "rectangle" | "multiContour" | "distributed";

export interface BoundaryVisualOptions {
  mode: BoundaryMode;
  /** Khoảng đệm quanh mỗi node (đơn vị thế giới). */
  padding: number;
  /** Hai node cách nhau (mép tới mép) không quá giá trị này thì được nối vào cùng một vùng. */
  connectionGap: number;
  /** 0–1: độ bo tròn góc đường bao. */
  smoothness: number;
  /** Độ đậm của màu nền vùng (0–1). */
  fillOpacity: number;
  /** Vẽ nét đứt mảnh nối các vùng / các thành viên của nhóm. */
  showConnectors: boolean;
}

/**
 * P2.5b — Ghi chú dán: một tờ giấy nhớ nổi tự do trên canvas, KHÔNG
 * gắn với node nào cả — hoàn toàn độc lập, không tham gia cấu trúc
 * cây. Khác "notes" trong MindNode (thuộc về một node cụ thể, chỉ đọc
 * được khi chọn đúng node đó) — ghi chú dán hiện TOÀN BỘ nội dung
 * ngay trên canvas. Không có width/height lưu sẵn: bề rộng cố định
 * theo hằng số, chiều cao luôn tính lại từ nội dung (word-wrap), xem
 * render/CanvasRenderer.ts#wrapStickyText — tránh lưu dữ liệu dẫn xuất
 * có thể lệch khỏi nội dung thật.
 */
export interface StickyNote {
  readonly id: string;
  text: string;
  x: number;
  y: number;
  color: string | null;
}

/** Toàn bộ tài liệu mindmap — đơn vị lưu/mở file. */
/**
 * P2.7e — định nghĩa MỘT Tag trong danh sách tập trung của map. Node
 * chỉ lưu id (xem MindNode.tagIds), không lưu tên/màu trực tiếp — đổi
 * tên hay đổi màu một Tag ở đây tự động cập nhật MỌI node đang gắn nó,
 * không cần sửa từng node riêng lẻ.
 */
export interface TagDef {
  id: string;
  name: string;
  /** Mã màu hex, ví dụ "#2f6fed" — dùng cho cả nền viên thuốc trên
   *  node lẫn ô quản lý Tag. */
  color: string;
  /** KW5 — thuộc tính của Tag ("cơ sở dữ liệu Tag"). Tuỳ chọn, không đổi
   *  schema: thiếu = Tag chưa có thuộc tính. Giá trị nằm ở
   *  `MindNode.fieldValues` của từng node mang Tag này. */
  fields?: TagField[];
  /** KW5 — thứ tự thủ công của các node mang Tag này (id node), do kéo thẻ Kanban đặt. Node không có
   *  trong danh sách xếp sau, theo thứ tự cây. Tuỳ chọn. */
  order?: string[];
}

export type TagFieldType = "text" | "number" | "date" | "select" | "status";

export interface TagFieldOption {
  id: string;
  label: string;
  /** Mã màu hex của thẻ lựa chọn (Kanban, viên thuốc trong bảng). */
  color: string;
}

export interface TagField {
  /** Duy nhất trong toàn map (khoá của MindNode.fieldValues). */
  id: string;
  name: string;
  type: TagFieldType;
  /** Chỉ có với "select" / "status". */
  options?: TagFieldOption[];
  /** Hiện giá trị của thuộc tính này thành một thẻ nhỏ ngay trên node ở sơ đồ (cạnh viên thuốc Tag). */
  showOnNode?: boolean;
}

/**
 * P2.10 — một tệp ảnh nhúng trong tài liệu (dùng cho MindNode.imageAssetId).
 * Lưu dạng base64 NGAY TRONG file JSON/localStorage bình thường (đơn
 * giản nhất, không cần thay đổi cách lưu hiện có) — nhưng khi xuất ra
 * định dạng `.t17m` (io/t17m.ts), dữ liệu này được TÁCH RA thành file
 * nhị phân THẬT bên trong zip (thư mục `assets/`), giống cách phần mềm
 * XMind nhúng ảnh — nhẹ hơn ~33% so với giữ nguyên base64 trong JSON.
 */
export interface ImageAsset {
  /** Ví dụ "image/png", "image/jpeg" — dùng để đặt tên file trong zip
   *  lúc xuất `.t17m` và để trình duyệt hiển thị đúng khi xem lại. */
  mimeType: string;
  /** Nội dung ảnh mã hoá base64 (KHÔNG kèm tiền tố "data:...;base64,"
   *  — tiền tố đó được ghép lại mỗi lần cần hiển thị, xem
   *  ui/dialog.ts#showImagePreview và render/CanvasRenderer.ts). */
  dataBase64: string;
  /** M3 — kích thước gốc (px), ghi lúc chèn ảnh để đo layout ngay mà
   *  không phải chờ giải mã. Tuỳ chọn: ảnh cũ không có thì renderer tự
   *  biết sau khi giải mã xong (rồi tính lại layout). */
  width?: number;
  height?: number;
}

/**
 * M1 (Card & Block) — NỘI DUNG của một Card là danh sách khối có thứ tự.
 * Mỗi khối có `id` duy nhất TRONG card đó (không cần duy nhất toàn map).
 */
export type BlockType = "text" | "table" | "image" | "chart" | "embed";

interface BlockBase {
  id: string;
  type: BlockType;
}

/** Đoạn văn bản (chữ thuần, xuống dòng bằng "\n"). */
export interface TextBlock extends BlockBase {
  type: "text";
  text: string;
}

export type TableAlign = "left" | "center" | "right";

/** Bảng: `cells[hàng][cột]`, mọi ô là chữ (công thức: chưa hỗ trợ). Luôn
 *  hình chữ nhật: mọi hàng có cùng số cột = `align.length`. */
export interface TableBlock extends BlockBase {
  type: "table";
  title: string;
  headerRow: boolean;
  align: TableAlign[];
  cells: string[][];
  /** Độ rộng từng cột (px trong trình sửa), cùng độ dài với `align`
   *  (schema 19). Thẻ thu nhỏ trên node vẽ cột theo đúng tỉ lệ này. */
  colWidths: number[];
  /** Chiều cao từng hàng (px trong trình sửa), cùng độ dài với `cells`. */
  rowHeights: number[];
}

/** M3 — cỡ hiển thị của ảnh trên node (chiều cao thẻ ảnh, xem
 *  render/imageThumb.ts). */
export type ImageDisplaySize = "small" | "medium" | "large";

/** Ảnh: dữ liệu nằm ở map.assets (dùng chung cơ chế P2.10). */
export interface ImageBlock extends BlockBase {
  type: "image";
  assetId: string;
  caption: string;
  /** M3 (schema 18). */
  size: ImageDisplaySize;
}

export type ChartKind = "bar" | "line" | "pie";

/** Biểu đồ (M4): lấy số từ một khối bảng CÙNG card. */
export interface ChartBlock extends BlockBase {
  type: "chart";
  title: string;
  kind: ChartKind;
  tableBlockId: string;
  labelColumn: number;
  seriesColumns: number[];
}

/** KW6 — khối NHÚNG: hiện nội dung của một card khác (cả card, hoặc một khối của card đó) ngay trong card này, luôn là
 *  bản mới nhất (không sao chép). Đích bị xoá thì hiện thông báo "nguồn đã bị xoá". Không nhúng chính card mình. */
export interface EmbedBlock extends BlockBase {
  type: "embed";
  cardId: string;
  /** null = nhúng cả card. */
  blockId: string | null;
}

export type Block = TextBlock | TableBlock | ImageBlock | ChartBlock | EmbedBlock;

/**
 * M1 — Card: một "tờ ghi chú" độc lập với vị trí trên sơ đồ. `id` duy
 * nhất toàn cục (UUID-like) để sau này có thể nâng lên Thư viện dùng
 * chung nhiều map mà không phải đổi id. Card không bị xoá khi node
 * chứa nó bị xoá — nó trở thành card "chưa treo vào đâu" (vẫn nằm
 * trong map.cards).
 */
export interface Card {
  id: string;
  title: string;
  blocks: Block[];
  /** KW0 (schema 20) — thời điểm tạo / sửa nội dung gần nhất (ms, Date.now()).
   *  0 = không rõ (card có từ trước schema 20). */
  createdAt: number;
  updatedAt: number;
  /** KW0 — bộ đếm thay đổi, chỉ tăng (kể cả khi hoàn tác) — xem
   *  core/cardCommands.ts#touchCard. Dùng để đồng bộ card giữa nhiều map (KW1). */
  rev: number;
  /** KW3 — card này sinh ra từ một đoạn tô sáng của nguồn PDF: bấm "Mở trong PDF" nhảy đúng trang và vị trí. */
  source?: { sourceId: string; highlightId: string };
}

/** KW3 — một hình chữ nhật CHUẨN HOÁ (0..1) theo kích thước trang PDF, nên đúng ở mọi mức phóng to. */
export interface PdfRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** KW3 — một vùng tô sáng trên trang PDF (chữ hoặc vùng chọn thành ảnh). */
export interface PdfHighlight {
  id: string;
  /** Trang, bắt đầu từ 1. */
  page: number;
  kind: "text" | "area";
  rects: PdfRect[];
  /** Đoạn chữ trích (kind "text"); với "area" có thể là chú thích. */
  text: string;
  color: string;
  /** Card sinh ra từ vùng này (null nếu đã xoá card hoặc chưa tạo). */
  cardId: string | null;
  createdAt: number;
}

/** KW3 — một NGUỒN (hiện chỉ có PDF). Hai cách lưu:
 *  - NHÚNG (mặc định): dữ liệu ở `map.assets[assetId]` (mimeType "application/pdf"), đi theo file .t17m/.json của map
 *    như ảnh — gửi file là gửi luôn PDF.
 *  - LIÊN KẾT (chỉ bản exe): `assetId = null`, chỉ nhớ `path` (đường dẫn tuyệt đối) — map nhẹ nhưng PDF phải còn
 *    ở đường dẫn đó; thiếu/đổi file thì trình xem báo trạng thái và cho chọn lại. */
export interface Source {
  id: string;
  kind: "pdf";
  name: string;
  assetId: string | null;
  /** Chỉ có với nguồn liên kết. */
  path?: string;
  /** Mã băm nội dung (SHA-256 hex) lúc thêm — nhận PDF trùng, phát hiện file liên kết đã bị sửa. Tuỳ chọn (nguồn cũ không có). */
  sha256?: string;
  /** Dung lượng byte lúc thêm. */
  size?: number;
  pages: number;
  highlights: PdfHighlight[];
}

export interface MindMap {
  /**
   * P2.6d — định danh DUY NHẤT của chính tài liệu này (khác hẳn id của
   * từng node/liên kết bên trong nó) — dùng để lưu riêng từng map vào
   * localStorage theo khoá `t17mind-map-{mapId}`, không còn dùng
   * chung một khoá cho mọi map như trước. Sinh một lần khi tạo map
   * mới hoặc khi nhập một file JSON không có sẵn mapId — SAU ĐÓ GIỮ
   * NGUYÊN mãi mãi, không sinh lại mỗi lần lưu/mở.
   */
  mapId: string;
  /** P2.6d — tên hiển thị TUỲ CHỌN trong "Map gần đây". null = dùng
   *  luôn chữ của node gốc làm tên hiển thị (không cần nhập thêm gì).
   *  Chỉ khác null khi người dùng CHỦ ĐỘNG đổi tên qua "Map gần đây" —
   *  tên đó không tự đổi theo mỗi khi sửa chữ node gốc nữa. */
  mapTitle: string | null;

  schemaVersion: number;
  rootId: string;
  /** Flat map id -> node, tra cứu O(1). Xem thuật ngữ "flat map". */
  nodes: Record<string, MindNode>;
  relationships: Relationship[];
  summaries: Summary[];
  boundaries: Boundary[];
  stickyNotes: StickyNote[];

  /**
   * P2.6b-2 — công tắc hiển thị MỨC TÀI LIỆU (không phải riêng từng
   * node/liên kết/tóm tắt). Tắt chỉ ẩn phần VẼ, không xoá dữ liệu bên
   * dưới — bật lại là thấy y nguyên.
   *  - showEdgeLabels: mặc định TẮT — nhãn cha-con chỉ hữu ích khi cần,
   *    bật tràn lan ngay từ đầu sẽ rối canvas với ai không dùng tới.
   *  - showRelationships / showSummaries: mặc định BẬT — giữ đúng hành
   *    vi đã có từ P1.8 tới giờ, chỉ tắt khi người dùng chủ động muốn
   *    nhìn gọn hơn.
   */
  showEdgeLabels: boolean;
  showRelationships: boolean;
  showSummaries: boolean;

  /**
   * P2.7a — kiểu bố cục đang dùng cho TOÀN BỘ map (mọi cây độc lập —
   * gốc chính lẫn mọi nhánh trôi — dùng CHUNG một kiểu, không có khái
   * niệm "mỗi nhánh trôi một bố cục riêng"). Mặc định "logicRight" —
   * đúng hành vi duy nhất đã có từ P1.1 tới giờ. Mở sẵn chỗ cho các
   * kiểu khác ở P2.7b/c/d (cây hai bên, sơ đồ tổ chức, xương cá...)
   * mà không cần đổi lại trường này lần nữa.
   */
  layoutType: LayoutType;

  /** P2.7e — danh sách Tag tập trung của toàn map. */
  tags: TagDef[];

  /** P2.10 — kho ảnh nhúng tập trung của toàn map, tra theo id (xem
   *  MindNode.imageAssetId và ImageAsset ở trên) — CÙNG MÔ HÌNH với
   *  `tags`: node chỉ lưu id, dữ liệu thật nằm ở đây, một chỗ duy nhất. */
  assets: Record<string, ImageAsset>;

  /** KW3 — kho nguồn tài liệu (PDF) của map, tra theo id. Tuỳ chọn, không đổi schema; thiếu = chưa có nguồn nào. */
  sources?: Record<string, Source>;

  /** M1 — kho Card của map (xem MindNode.cardId, Card ở trên). */
  cards: Record<string, Card>;

  /** P2.7h (Phần 4) — bật "Kiểu cây tự nhiên": đường nối vẽ dạng dải
   *  băng thon dần (dày ở cha, mỏng dần khi ra tới con) thay vì nét
   *  đều một độ dày như mặc định. Áp dụng cho MỌI layout dùng đường
   *  cong bezier (logicRight/Left/Both/treeDown/treeUp) — orgChart
   *  luôn có hình dạng riêng (góc vuông), bỏ qua công tắc này. Mặc
   *  định false — KHÔNG đổi cách vẽ hiện có trừ khi người dùng chủ
   *  động bật. */
  organicEdges: boolean;

  /**
   * P2.11 — id của bộ theme (xem `core/theme.ts#THEMES`) đang ÁP DỤNG
   * cho map này, hoặc `null` nếu người dùng chưa từng bấm "Áp dụng"
   * theme nào (giữ nguyên màu tự đặt tay như trước P2.6). Lưu lại giá
   * trị này để khi TẠO NODE MỚI (AddChildCommand, nhân bản, dán, ghép
   * map...) biết cần tự động tô màu theo ĐÚNG theme đang bật thay vì
   * bỏ trắng/copy màu cha — xem `computeThemedStyleForNode`. Không tự
   * đổi khi người dùng chỉnh tay màu một node lẻ; chỉ đổi khi bấm lại
   * "Áp dụng" (theme khác) hoặc "Bỏ theme".
   */
  activeThemeId: string | null;

  /** Schema 21 — bản sao của theme RIÊNG (người dùng tạo) đang áp dụng
   *  cho map, để map tự chứa đủ: mở ở máy khác (không có theme đó trong
   *  thư viện) vẫn đúng màu, node mới vẫn tô đúng. null = đang dùng theme
   *  có sẵn hoặc không dùng theme. Xem core/theme.ts#findTheme. */
  customTheme: Theme | null;

  /** Schema 22 — cài đặt riêng của từng NHÁNH TRÔI, tra theo id node gốc của nhánh
   *  (xem TreeSettings). Cây chính không có ở đây — dùng các trường trên map. */
  treeSettings: Record<string, TreeSettings>;
}

/**
 * Schema 22 — kiểu bố cục, theme và "kiểu cây tự nhiên" áp dụng RIÊNG cho từng
 * cây (cây chính và mỗi nhánh trôi), không còn dùng chung cho cả map.
 * Cây chính (map.rootId) giữ các trường cũ ngay trên map (layoutType,
 * organicEdges, activeThemeId, customTheme). Mỗi nhánh trôi có thể có bản ghi
 * riêng trong `map.treeSettings[rootId]`; nhánh trôi CHƯA có bản ghi thì dùng
 * theo cây chính — cho tới lúc cây chính hoặc chính nhánh đó bị đổi (khi đó bản
 * ghi được "chốt" lại, xem core/treeSettings.ts).
 */
export interface TreeSettings {
  layoutType: LayoutType;
  organicEdges: boolean;
  activeThemeId: string | null;
  customTheme: Theme | null;
}

export type LayoutType = "logicRight" | "logicLeft" | "logicBoth" | "treeDown" | "orgChart" | "treeUp";

/**
 * P2.7c — "layout dọc" (độ sâu = trục Y) gồm treeDown, orgChart (dùng
 * chung thuật toán xếp vị trí với treeDown, chỉ khác kiểu vẽ đường
 * nối) và treeUp (soi gương dọc của treeDown) — dùng hàm này ở mọi
 * nơi cần biết "đây có phải layout dọc hay không" (điều hướng phím,
 * dò khe hở kéo-thả, điểm neo đường nối), tránh lặp lại điều kiện
 * rải rác nhiều chỗ, dễ quên cập nhật đồng bộ khi thêm layout dọc mới.
 */
export function isVerticalLayout(layoutType: LayoutType): boolean {
  return layoutType === "treeDown" || layoutType === "orgChart" || layoutType === "treeUp";
}

/** Kết quả xác thực: rỗng nghĩa là dữ liệu hợp lệ. */
export type ValidationErrors = string[];
