/**
 * render/CanvasRenderer.ts
 * ---------------------------------------------------------------------
 * Vẽ toàn bộ sơ đồ lên một <canvas> bằng Canvas 2D. Đây là bộ dựng DUY
 * NHẤT trong phase 1 (P2.9 sẽ thêm SvgRenderer dùng chung dữ liệu và
 * kết quả layout, không đụng gì tới file này).
 *
 * Renderer CHỈ ĐỌC dữ liệu (MindMap) — không sửa. Mọi thay đổi dữ liệu
 * phải đi qua core/store.ts (lớp thao tác, P1.5).
 *
 * So với bản v3 (JS thuần), thay đổi kiến trúc quan trọng nhất: các
 * trường tạm thời phục vụ hit-test (hộp nhãn liên kết, điểm điều khiển
 * đường cong...) trước đây được gắn thẳng vào object dữ liệu bằng tiền
 * tố "__". Giờ chúng được giữ RIÊNG trong chính renderer (các Map bên
 * dưới), không còn làm bẩn dữ liệu gốc — dữ liệu gốc giờ chỉ chứa đúng
 * những gì cần lưu xuống file.
 * ---------------------------------------------------------------------
 */
import {
  rectAnchor,
  quadraticPoint,
  cubicBezierPoint,
  cubicBezierTangent,
  parentChildEdgeAnchors,
  computeEdgeWidth,
  computeViewportWorldRect,
  isRectVisibleInViewport,
  summaryGeometry,
  boundaryGeometry,
  gapIndicatorGeometry,
  visibleRepresentativeId,
  type Point,
  type SummaryGeometry,
  type BoundaryGeometry,
  type DropTarget,
} from "./geometry";
import type { MindMap, MindNode, StickyNote, TagDef } from "../core/types";
import { lightenHex } from "../core/theme";
import { isVerticalLayout } from "../core/types";
import { getRootIds } from "../core/tree";
import type { NodeMeasurer } from "../layout";
import {
  getThumbLayout,
  getNodeThumbTable,
  thumbLayoutForTable,
  thumbReservedHeight,
  thumbRect,
  THUMB_PAD,
  THUMB_ROW_H,
  THUMB_MORE_W,
  THUMB_FONT,
  type ThumbLayout,
} from "./tableThumb";
import type { ImageAsset, TableBlock } from "../core/types";
import {
  getNodeImageBlocks,
  assetDims,
  imageThumbLayout,
  imageReservedHeight,
  imageThumbRect,
  IMAGE_THUMB_HEIGHT,
  type ImageDims,
  type ImageThumbLayout,
} from "./imageThumb";

export interface ViewTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface SelectionState {
  selectedIds: ReadonlySet<string>;
  primaryId: string | null;
  selectedRelId: string | null;
  selectedSummaryId: string | null;
  selectedBoundaryId: string | null;
  selectedStickyNoteId: string | null;
  hoveredId: string | null;
  /** Node vừa được bấm chọn làm NGUỒN khi đang ở chế độ "Tạo liên kết".
   *  Tuỳ chọn (không phải mọi nơi gọi draw() đều cần quan tâm việc này,
   *  ví dụ lúc xuất PNG). */
  linkSourceId?: string | null;
}

export interface DragPreview {
  draggedId: string;
  dropTarget: DropTarget | null;
}

/** Hiệu ứng "phập phồng" (đậm/nhạt) quanh kết quả tìm kiếm vừa nhảy
 *  tới — intensity 0 (nhạt nhất) tới 1 (đậm nhất), AppController tự
 *  tính lại mỗi khung hình theo thời gian trôi qua (dao động hình
 *  sin). Không đổi kích thước khung, chỉ đổi độ đậm nhạt của viền. */
export interface SearchPulse {
  nodeId: string;
  intensity: number;
}

interface RelRenderInfo {
  labelBox: { x: number; y: number; w: number; h: number } | null;
  midPoint: Point;
  controlPoint: Point;
  samplePoints: Point[];
}

const FONT_LABEL = "500 10.5px -apple-system, Segoe UI, sans-serif";

/** P2.2 — chiều cao dành riêng cho dải nhãn dạng viên thuốc phía dưới
 *  node, khi node đó có ít nhất 1 nhãn. Cộng thẳng vào node.height để
 *  mọi nơi khác (hit-test, kéo, resize, layout) tự động đúng mà không
 *  cần biết gì về khái niệm "nhãn" — xem ghi chú trong types.ts. */
const LABEL_ROW_HEIGHT = 22;
const LABEL_PILL_HEIGHT = 16;
const LABEL_PILL_PAD_X = 8;
const LABEL_PILL_GAP = 5;

/** P2.7h (Phần 4) — "Kiểu cây tự nhiên": độ rộng ĐẦU đường (phía cha)
 *  = computeEdgeWidth() nhân với hệ số này (phóng to hẳn so với nét
 *  đều mặc định, để "dày hẳn" gần trung tâm giống ảnh tham khảo); độ
 *  rộng CUỐI đường (phía con) = độ rộng đầu nhân tiếp hệ số nhỏ hơn 1
 *  (thon nhọn dần). Cả 2 hệ số chọn qua thử nghiệm trực quan bằng
 *  canvas thật trước khi đưa vào đây (xem ghi chú ở drawTaperedBezier).
 */
const ORGANIC_START_MULTIPLIER = 2.2;
const ORGANIC_END_RATIO = 0.35;

/** P1.13 — biên an toàn (world-space, không phải pixel màn hình) nới
 *  rộng khung nhìn khi xét viewport culling — tránh hiện tượng "chớp
 *  tắt" (node vừa lướt ra khỏi mép đã biến mất ngay, chưa kịp mượt).
 *  ~2 lần chiều rộng một node thường (170px) là đủ dư dả mà không làm
 *  giảm nhiều hiệu quả tối ưu. */
const CULL_MARGIN = 300;

/** P2.5b — Ghi chú dán: bề rộng CỐ ĐỊNH, chiều cao luôn TÍNH LẠI theo
 *  nội dung (word-wrap) — không lưu height trong dữ liệu để tránh lệch
 *  khỏi nội dung thật, xem ghi chú trong core/types.ts#StickyNote. */
const STICKY_NOTE_WIDTH = 180;
const STICKY_NOTE_PADDING = 14;
const STICKY_LINE_HEIGHT = 18;
const STICKY_FONT = "13px -apple-system, Segoe UI, sans-serif";

interface StickyNoteBox {
  x: number;
  y: number;
  width: number;
  height: number;
  lines: string[];
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement | null;
  private ctx: CanvasRenderingContext2D;
  private cssWidth = 0;
  /** P1.13 — khung nhìn world hiện tại, tính lại ĐÚNG 1 LẦN ở đầu mỗi
   *  `draw()`, dùng suốt lượt vẽ đó để quyết định node/đường nối nào
   *  bỏ qua (viewport culling) — null trước lần draw() đầu tiên. */
  private cullViewportRect: { left: number; top: number; right: number; bottom: number } | null = null;
  private cssHeight = 0;

  // Trạng thái tạm thời của lần draw() gần nhất — dùng cho hit-test.
  private relInfo = new Map<string, RelRenderInfo>();
  private summaryInfo = new Map<string, SummaryGeometry>();
  private boundaryInfo = new Map<string, BoundaryGeometry>();
  private stickyNoteInfo = new Map<string, StickyNoteBox>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    if (!this.canvas) return; // đang ở chế độ vẽ offscreen, không có canvas hiển thị để đo
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  /** Kích thước phần CHỮ của node (chưa kể hàng Tag, thẻ bảng) — dùng
   *  cho getMeasurer và để biết thẻ bảng còn bao nhiêu chỗ lúc vẽ (M2). */
  private measureTextBox(node: MindNode, isRoot: boolean): { width: number; height: number } {
    // P2.6b-1 — fontSize null dùng đúng cỡ mặc định cũ (15/13), nên
    // với node chưa từng đụng vào tính năng này, mọi phép tính dưới
    // đây cho ra kết quả HỆT NHƯ TRƯỚC — không có node nào tự đổi
    // hình dạng chỉ vì bản này thêm tính năng mới.
    const fontSize = node.fontSize ?? (isRoot ? 15 : 13);
    const fontWeight = isRoot ? "600" : "400";
    // P2.6c — dùng ĐÚNG font stack như lúc vẽ (drawNode), nếu không
    // đo bằng font hệ thống mà vẽ bằng font tuỳ chỉnh sẽ ra bề rộng
    // sai lệch, chữ dễ bị tràn hoặc chừa dư khoảng trống.
    const fontStack = node.fontFamily
      ? `${node.fontFamily}, -apple-system, Segoe UI, sans-serif`
      : "-apple-system, Segoe UI, sans-serif";
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontStack}`;

    // P2.7f — checkbox hoàn thành (nếu có) chiếm thêm bề ngang, phải
    // tính vào đây — nếu không, node có checkbox sẽ bị đo HẸP HƠN
    // cần thiết (vì lúc vẽ đã dịch chữ sang phải nhường chỗ, nhưng
    // lúc đo lại không cộng thêm khoảng đó), khiến chữ chật/tràn oan.
    const checkboxSpace = node.checked !== null ? 14 + 6 : 0;

    let width: number;
    let height: number;

    if (node.textFit === "wrap") {
      // Cần một bề rộng CỐ ĐỊNH để có gì đó mà ngắt dòng vào — nếu
      // không thì rộng tự động sẽ luôn "vừa đủ 1 dòng", không bao
      // giờ thật sự cần xuống dòng. Dùng manualWidth nếu người dùng
      // đã tự đặt, không thì lấy một cỡ mặc định vừa phải.
      const wrapWidth = node.manualWidth ?? 200;
      const innerWidth = wrapWidth - 24 - checkboxSpace;
      const lines = this.wrapText(node.text || "", innerWidth);
      const lineHeight = Math.round(fontSize * 1.35);
      width = wrapWidth;
      height = Math.max(isRoot ? 46 : 36, lines.length * lineHeight + 16);
    } else {
      // "auto" VÀ "shrink" đo GIỐNG HỆT NHAU — khác nhau chỉ ở lúc
      // VẼ (auto cắt bớt bằng "...", shrink tự thu nhỏ cỡ chữ). Nếu
      // người dùng không đặt manualWidth, "shrink" thực chất không
      // có gì để co vào (rộng tự động đã luôn vừa đủ 1 dòng) — chỉ
      // thật sự phát huy tác dụng khi kết hợp với một manualWidth
      // hẹp hơn nội dung cần.
      const textWidth = this.ctx.measureText(node.text || "").width;
      width = Math.max(60, Math.min(320, textWidth + 32 + checkboxSpace));
      const baseHeight = isRoot ? 46 : 36;
      height = Math.max(baseHeight, Math.round(fontSize * 1.8) + 12);
    }

    return { width, height };
  }

  /** M3 — bitmap THU NHỎ của từng ảnh (theo assetId — asset không bao
   *  giờ bị sửa tại chỗ, ảnh mới luôn có id mới), để mỗi khung hình chỉ
   *  drawImage một canvas nhỏ thay vì giải mã lại ảnh gốc. */
  private imageCache = new Map<string, { state: "loading" | "ready" | "error"; bitmap?: HTMLCanvasElement; dims?: ImageDims }>();

  /** main.ts gắn vào: gọi khi một ảnh giải mã xong. `relayout` = true nếu
   *  trước đó chưa biết kích thước ảnh (cần tính lại layout). */
  onImageReady: ((relayout: boolean) => void) | null = null;

  private imageDims(assetId: string, asset: ImageAsset | undefined): ImageDims | null {
    return assetDims(asset) ?? this.imageCache.get(assetId)?.dims ?? null;
  }

  private ensureImageBitmap(assetId: string, asset: ImageAsset): void {
    if (this.imageCache.has(assetId) || typeof Image === "undefined") return;
    this.imageCache.set(assetId, { state: "loading" });
    const hadDims = assetDims(asset) !== null;
    const img = new Image();
    img.onload = () => {
      const maxH = IMAGE_THUMB_HEIGHT.large * 2; // đủ nét cho cỡ Lớn trên màn hình mật độ điểm ảnh cao
      const scale = Math.min(1, maxH / img.naturalHeight, (maxH * 3) / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      this.imageCache.set(assetId, { state: "ready", bitmap: c, dims: { width: img.naturalWidth, height: img.naturalHeight } });
      this.onImageReady?.(!hadDims);
    };
    img.onerror = () => this.imageCache.set(assetId, { state: "error" });
    img.src = `data:${asset.mimeType};base64,${asset.dataBase64}`;
  }

  /** Bỏ bitmap của ảnh không còn trong map (gọi mỗi lần đo lại layout). */
  private pruneImageCache(map: MindMap): void {
    for (const id of this.imageCache.keys()) if (!map.assets[id]) this.imageCache.delete(id);
  }

  private imageLayoutForNode(map: MindMap, node: MindNode): ImageThumbLayout | null {
    const images = getNodeImageBlocks(map, node);
    const first = images[0];
    if (!first) return null;
    return imageThumbLayout(images, this.imageDims(first.assetId, map.assets[first.assetId]));
  }

  /** M2 — bố cục thẻ bảng theo khoảng trống THẬT của node lúc vẽ/dò bấm
   *  (node kéo to ra thì thẻ hiện thêm hàng/cột, ô giãn rộng). Chỗ cho
   *  chữ giữ đúng như lúc đo; phần còn lại (trừ hàng Tag) là của thẻ. */
  private thumbLayoutForNode(map: MindMap, node: MindNode): ThumbLayout | null {
    const table = getNodeThumbTable(map, node);
    if (!table) return null;
    // Cùng quy ước "gốc" với lúc đo (layout/index.ts: mọi node không có
    // cha, kể cả nhánh trôi), để chỗ cho chữ khớp đúng chiều cao đã đo.
    const textHeight = this.measureTextBox(node, node.parentId === null).height;
    const tagRow = node.tagIds.length > 0 ? LABEL_ROW_HEIGHT : 0;
    const box = {
      width: node.width - THUMB_PAD * 2,
      height: node.height - tagRow - THUMB_PAD - textHeight - imageReservedHeight(this.imageLayoutForNode(map, node)),
    };
    const manual = node.manualWidth != null || node.manualHeight != null;
    return thumbLayoutForTable(table, box, !manual);
  }

  /** Hàm đo chữ để tiêm vào layout/applyLayout (xem ghi chú kiến trúc
   *  trong layout/index.ts về lý do tách riêng việc đo khỏi việc xếp).
   *  P2.7e — nhận thêm map để tra TÊN Tag qua tagIds (trước đây
   *  node.labels tự nó đã là chữ, giờ chỉ là id, cần tra ngược). */
  getMeasurer(map: MindMap): NodeMeasurer {
    const tagNameById = new Map(map.tags.map((t) => [t.id, t.name]));
    this.pruneImageCache(map);
    return (node: MindNode, isRoot: boolean) => {
      let { width, height } = this.measureTextBox(node, isRoot);

      // P2.2 — có nhãn thì node cao thêm một hàng, và rộng ra đủ để
      // chứa trọn hàng viên thuốc đó nếu nó rộng hơn phần chữ chính.
      if (node.tagIds.length > 0) {
        this.ctx.font = FONT_LABEL;
        const tagNames = node.tagIds.map((id) => tagNameById.get(id) ?? "?");
        const pillsWidth =
          tagNames.reduce((sum, name) => sum + this.ctx.measureText(name).width + LABEL_PILL_PAD_X * 2, 0) +
          LABEL_PILL_GAP * (node.tagIds.length - 1);
        width = Math.max(width, Math.min(320, pillsWidth + 20));
        height += LABEL_ROW_HEIGHT;
      }

      // M2 — thẻ thu nhỏ của bảng (xem render/tableThumb.ts): node cao
      // thêm đúng phần thẻ chiếm, và rộng ra nếu thẻ rộng hơn phần chữ.
      const thumb = getThumbLayout(map, node);
      if (thumb) {
        width = Math.max(width, thumb.width + THUMB_PAD * 2);
        height += thumbReservedHeight(thumb);
      }
      // M3 — thẻ ảnh (render/imageThumb.ts), nằm trên thẻ bảng.
      const image = this.imageLayoutForNode(map, node);
      if (image) {
        width = Math.max(width, image.width + THUMB_PAD * 2);
        height += imageReservedHeight(image);
      }

      return { width, height };
    };
  }

  // ----------------------------------------------------------------
  // VẼ
  // ----------------------------------------------------------------

  draw(
    map: MindMap,
    view: ViewTransform,
    sel: SelectionState,
    dragPreview: DragPreview | null = null,
    searchPulse: SearchPulse | null = null
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);

    // P1.13 — tính lại khung viewport world-space ĐÚNG 1 LẦN cho cả
    // lượt vẽ này, dùng để bỏ qua (culling) node/đường nối nằm hẳn
    // ngoài khung nhìn — với map lớn (hàng trăm/nghìn node), đây là
    // phần tiết kiệm chi phí đáng kể nhất (đo text, tính toạ độ, gọi
    // API vẽ — không chỉ chi phí ghi pixel mà Canvas driver có thể đã
    // tự bỏ qua một phần).
    this.cullViewportRect = computeViewportWorldRect(view, this.cssWidth, this.cssHeight);

    this.drawBoundaries(map, sel);
    for (const rootId of getRootIds(map)) this.drawEdges(map, rootId);
    if (map.showEdgeLabels) {
      for (const rootId of getRootIds(map)) this.drawEdgeLabels(map, rootId);
    }
    this.drawRelationships(map, sel);
    this.drawSummaries(map, sel);
    for (const rootId of getRootIds(map)) this.drawNodes(map, rootId, sel);

    if (sel.selectedIds.size === 1 && !sel.selectedRelId && !sel.selectedSummaryId && sel.primaryId && !dragPreview) {
      const node = map.nodes[sel.primaryId];
      if (node) this.drawResizeHandle(node);
    }
    if (sel.hoveredId && sel.hoveredId !== sel.primaryId && !dragPreview) {
      const hovered = map.nodes[sel.hoveredId];
      if (hovered) this.drawHoverRing(hovered);
    }
    if (dragPreview) this.drawDragPreview(map, dragPreview);
    if (sel.linkSourceId) {
      const sourceNode = map.nodes[sel.linkSourceId];
      if (sourceNode) this.drawLinkSourceRing(sourceNode);
    }
    if (searchPulse) {
      const pulseNode = map.nodes[searchPulse.nodeId];
      if (pulseNode) this.drawSearchPulse(pulseNode, searchPulse.intensity);
    }
    this.drawStickyNotes(map, sel);

    ctx.restore();
  }

  /** P1.8-fix — viền vàng đứt nét đánh dấu node vừa chọn làm NGUỒN khi
   *  đang ở chế độ "Tạo liên kết". Trước bản sửa này, việc chọn nguồn
   *  không có phản hồi hình ảnh nào — người dùng bấm xong không biết
   *  có ăn hay không, dễ tưởng bị lỗi. */
  private drawLinkSourceRing(node: MindNode): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    this.roundRectPath(node.x - 4, node.y - 4, node.width + 8, node.height + 8, 12);
    ctx.strokeStyle = "#f2c230";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * P1.10 — vòng nhấp nháy quanh kết quả tìm kiếm vừa nhảy tới. "Nhấp
   * nháy rộng-hẹp" thực hiện bằng cách nới RỘNG khoảng cách viền ra
   * khỏi node (padding) và ĐẬM nhạt độ mờ theo cùng một giá trị dao
   * động (intensity, do AppController tính mỗi khung hình bằng hàm
   * sin theo thời gian) — khi intensity cao: viền xa node hơn, đậm
   * hơn; khi intensity thấp: viền sát node, mờ hơn. Dùng vàng hổ phách
   * (khác màu xanh của viền chọn) để không lẫn hai chỉ báo cùng lúc,
   * vì node kết quả tìm kiếm luôn ĐANG ĐƯỢC CHỌN nữa (viền xanh riêng).
   */
  /**
   * P1.10 — "phập phồng" quanh kết quả tìm kiếm: chỉ đổi ĐỘ ĐẬM NHẠT
   * (alpha) theo thời gian, khoảng cách viền LUÔN CỐ ĐỊNH sát ngay mép
   * node — không nới rộng/hẹp và không dùng màu riêng, dùng luôn đúng
   * màu xanh của viền chọn để cảm giác như chính viền node đang thở,
   * không phải một khung phụ chồng lên trông rối mắt.
   */
  private drawSearchPulse(node: MindNode, intensity: number): void {
    const ctx = this.ctx;
    const clamped = Math.max(0, Math.min(1, intensity));
    const alpha = 0.3 + clamped * 0.55;

    ctx.save();
    ctx.beginPath();
    this.roundRectPath(node.x - 2, node.y - 2, node.width + 4, node.height + 4, 10);
    ctx.strokeStyle = `rgba(47, 111, 237, ${alpha.toFixed(3)})`;
    ctx.lineWidth = 2.6;
    ctx.stroke();
    ctx.restore();
  }

  /** P1.8 — làm mờ node đang kéo (phủ một lớp gần trùng màu nền lên
   *  trên) và vẽ chỉ báo điểm sẽ thả: viền dày quanh node đích (thả
   *  làm con) hoặc một vạch ngang giữa hai anh em (thả vào khe). */
  private drawDragPreview(map: MindMap, preview: DragPreview): void {
    const ctx = this.ctx;
    const dragged = map.nodes[preview.draggedId];
    if (dragged) {
      ctx.save();
      ctx.beginPath();
      this.roundRectPath(dragged.x, dragged.y, dragged.width, dragged.height, 8);
      ctx.fillStyle = "rgba(247,248,250,0.62)";
      ctx.fill();
      ctx.restore();
    }

    const target = preview.dropTarget;
    if (!target) return;

    if (target.kind === "child") {
      const node = map.nodes[target.parentId];
      if (!node) return;
      ctx.save();
      ctx.beginPath();
      this.roundRectPath(node.x - 3, node.y - 3, node.width + 6, node.height + 6, 11);
      ctx.strokeStyle = "#2f6fed";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    } else {
      const geo = gapIndicatorGeometry(map, target.parentId, target.index);
      if (!geo) return;
      ctx.save();
      ctx.strokeStyle = "#2f6fed";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(geo.x1 - 10, geo.y);
      ctx.lineTo(geo.x2 + 10, geo.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(geo.x1 - 10, geo.y, 3.5, 0, Math.PI * 2);
      ctx.arc(geo.x2 + 10, geo.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2f6fed";
      ctx.fill();
      ctx.restore();
    }
  }

  private drawEdges(map: MindMap, nodeId: string): void {
    const node = map.nodes[nodeId];
    if (!node || node.collapsed) return;

    for (const childId of node.children) {
      const child = map.nodes[childId];
      if (!child) continue;
      const { sx, sy, ex, ey } = parentChildEdgeAnchors(map, node, child);

      // P1.13 — viewport culling: bỏ qua việc VẼ đường nối này nếu CẢ
      // 2 đầu (neo cha lẫn con) đều nằm ngoài khung nhìn — tính TRƯỚC
      // ctx.save()/thiết lập style, tránh chi phí đó khi biết chắc sẽ
      // skip. Dùng bounding box bao quanh CẢ 2 điểm neo (không chỉ 1
      // điểm) vì đường cong có thể "phình" ra giữa 2 điểm này.
      //
      // SỬA LỖI (Task #7 — đường nối cha-con biến mất ở một số mức
      // zoom): TRƯỚC ĐÂY dùng `continue` ở đây, khiến vòng lặp nhảy
      // thẳng sang node con TIẾP THEO — bỏ qua LUÔN cả lời gọi đệ quy
      // `this.drawEdges(map, childId)` của CHÍNH node con đang xét (nó
      // nằm sau, trong cùng một vòng lặp). Hậu quả: hễ đoạn nối cha→con
      // NGAY SÁT GỐC của một nhánh (ví dụ nhánh đã bị người dùng kéo
      // lệch rất xa bằng offsetX/offsetY lớn) rơi ra ngoài khung nhìn,
      // thì TOÀN BỘ đường nối của mọi node cháu/chắt bên dưới nó cũng
      // không bao giờ được vẽ nữa — dù chính các node cháu/chắt đó vẫn
      // nằm trong khung nhìn và vẫn hiển thị bình thường (vì
      // `drawNodes()` bên dưới áp dụng ĐÚNG nguyên tắc: chỉ bỏ qua việc
      // VẼ, KHÔNG BAO GIỜ bỏ qua việc ĐỆ QUY xuống con — xem comment ở
      // đó). Đây chính là lý do đường liên kết chéo (Relationship,
      // drawRelationships() — không hề culling) không bao giờ mất,
      // trong khi đường nối cha-con (có culling nhưng cull SAI) lại mất
      // — 2 dấu hiệu observed khớp hoàn toàn với nguyên nhân này.
      //
      // Cách sửa: KHÔNG dùng `continue` nữa — chỉ dùng biến `visible` để
      // quyết định có vẽ đoạn nối này hay không, còn lời gọi đệ quy
      // `this.drawEdges(map, childId)` luôn luôn chạy, y hệt cách
      // `drawNodes()` đã làm.
      let visible = true;
      if (this.cullViewportRect) {
        const minX = Math.min(sx, ex);
        const minY = Math.min(sy, ey);
        const boundingBox = { x: minX, y: minY, width: Math.abs(ex - sx), height: Math.abs(ey - sy) };
        visible = isRectVisibleInViewport(boundingBox, this.cullViewportRect, CULL_MARGIN);
      }

      if (visible) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = node.edgeColor || "#9aa3ad";
        ctx.fillStyle = node.edgeColor || "#9aa3ad"; // dùng khi vẽ dải băng thon dần (fill, không stroke)
        ctx.lineWidth = computeEdgeWidth(map, node);
        ctx.setLineDash(node.edgeDash ? [6, 4] : []);
        // P2.7h (Phần 4) — "Kiểu cây tự nhiên" CHỈ áp dụng cho 2 trường
        // hợp dùng đường cong bezier bên dưới (ngang/dọc) — orgChart và
        // edgeShape="straight" đều có hình dạng riêng (góc vuông/thẳng
        // tuyệt đối), thon dần không hợp lý cho chúng.
        const useOrganic =
          map.organicEdges &&
          map.layoutType !== "orgChart" &&
          node.edgeShape !== "straight";
        if (map.layoutType === "orgChart") {
          // P2.7c — Organization Chart LUÔN vẽ góc vuông kiểu T, BỎ QUA
          // edgeShape riêng của từng node (đặt nhánh này TRƯỚC kiểm tra
          // edgeShape ở dưới) — đúng bản chất "sơ đồ tổ chức" là nhất
          // quán toàn map, không hợp lý nếu lẫn đường cong/thẳng/góc
          // vuông lộn xộn trong cùng một sơ đồ.
          const my = sy + (ey - sy) / 2;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, my);
          ctx.lineTo(ex, my);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        } else if (node.edgeShape === "straight") {
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        } else if (isVerticalLayout(map.layoutType)) {
          // P2.7c — đường cong DỌC: điểm điều khiển lấy mốc giữa theo
          // TRỤC Y (không phải X như mọi layout ngang khác), để đường
          // cong đổ xuống/lên mượt mà thay vì "cong ngang" sai hướng.
          // Dùng chung ĐÚNG một công thức cho cả treeDown lẫn treeUp —
          // toán học nội suy trung điểm không quan tâm sy lớn hơn hay
          // nhỏ hơn ey, tự động đúng hướng dù cha ở trên hay ở dưới.
          const my = (sy + ey) / 2;
          const p0 = { x: sx, y: sy };
          const p1 = { x: sx, y: my };
          const p2 = { x: ex, y: my };
          const p3 = { x: ex, y: ey };
          if (useOrganic) {
            const widthStart = computeEdgeWidth(map, node) * ORGANIC_START_MULTIPLIER;
            this.drawTaperedBezier(p0, p1, p2, p3, widthStart, widthStart * ORGANIC_END_RATIO);
          } else {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.bezierCurveTo(sx, my, ex, my, ex, ey);
            ctx.stroke();
          }
        } else {
          const mx = (sx + ex) / 2;
          const p0 = { x: sx, y: sy };
          const p1 = { x: mx, y: sy };
          const p2 = { x: mx, y: ey };
          const p3 = { x: ex, y: ey };
          if (useOrganic) {
            const widthStart = computeEdgeWidth(map, node) * ORGANIC_START_MULTIPLIER;
            this.drawTaperedBezier(p0, p1, p2, p3, widthStart, widthStart * ORGANIC_END_RATIO);
          } else {
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.bezierCurveTo(mx, sy, mx, ey, ex, ey);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
      this.drawEdges(map, childId);
    }
  }

  /**
   * P2.6b-2 — nhãn trên đường cha-con, đặt tại ĐÚNG điểm giữa (t=0.5)
   * của chính đường vừa được drawEdges() vẽ — dùng lại HỆT công thức
   * toạ độ điểm neo (sx/sy/ex/ey) để nhãn luôn nằm chính giữa đường
   * thật, không lệch dù đường thẳng hay cong. Vẽ RIÊNG một lượt sau
   * cùng (không lồng chung với drawEdges) để mọi nhãn luôn nổi lên
   * trên TẤT CẢ đường nối, không bị đường của nhánh khác đè lên.
   */
  private drawEdgeLabels(map: MindMap, nodeId: string): void {
    const node = map.nodes[nodeId];
    if (!node || node.collapsed) return;
    const ctx = this.ctx;

    for (const childId of node.children) {
      const child = map.nodes[childId];
      if (!child) continue;
      if (child.edgeLabel) {
        const anchors = parentChildEdgeAnchors(map, node, child);
        const p0: Point = { x: anchors.sx, y: anchors.sy };
        const p3: Point = { x: anchors.ex, y: anchors.ey };

        let mid: Point;
        let angle: number;
        if (map.layoutType === "orgChart") {
          // P2.7c — nhãn đặt tại ĐOẠN NGANG GIỮA của đường góc vuông
          // (khớp đúng vị trí "my" trong drawEdges), KHÔNG XOAY — chữ
          // luôn nằm ngang, đúng quy ước sơ đồ tổ chức thật (không có
          // khái niệm "tiếp tuyến" cho một đường gấp khúc góc vuông).
          const my = p0.y + (p3.y - p0.y) / 2;
          mid = { x: (p0.x + p3.x) / 2, y: my };
          angle = 0;
        } else if (node.edgeShape === "straight") {
          mid = { x: (p0.x + p3.x) / 2, y: (p0.y + p3.y) / 2 };
          angle = Math.atan2(p3.y - p0.y, p3.x - p0.x);
        } else if (isVerticalLayout(map.layoutType)) {
          // P2.7c — điểm điều khiển theo TRỤC Y (khớp đúng cách vẽ
          // đường cong dọc trong drawEdges).
          const my = (p0.y + p3.y) / 2;
          const p1: Point = { x: p0.x, y: my };
          const p2: Point = { x: p3.x, y: my };
          mid = cubicBezierPoint(p0, p1, p2, p3, 0.5);
          const tangent = cubicBezierTangent(p0, p1, p2, p3, 0.5);
          angle = Math.atan2(tangent.y, tangent.x);
        } else {
          const mx = (p0.x + p3.x) / 2;
          const p1: Point = { x: mx, y: p0.y };
          const p2: Point = { x: mx, y: p3.y };
          mid = cubicBezierPoint(p0, p1, p2, p3, 0.5);
          // P2.6b-3 — góc xoay chữ LẤY TỪ TIẾP TUYẾN thật của đường
          // cong tại đúng điểm đặt nhãn (t=0.5), không phải góc thẳng
          // nối 2 đầu — với đường cong lệch nhiều theo chiều dọc, tiếp
          // tuyến ở giữa dốc hơn hẳn đường thẳng nối 2 đầu (xem test
          // "đường cong dốc" đã tự kiểm — 76° so với góc thẳng nối 2
          // đầu chỉ khoảng 63°).
          const tangent = cubicBezierTangent(p0, p1, p2, p3, 0.5);
          angle = Math.atan2(tangent.y, tangent.x);
        }
        // Chuẩn hoá: KHÔNG BAO GIỜ để chữ hiện lộn ngược — nếu góc chỉ
        // về bên trái (|góc| > 90°), xoay thêm 180° để chữ luôn đọc
        // xuôi trái sang phải. Với layout hiện tại (con luôn ở bên
        // phải cha) trường hợp này khó xảy ra, nhưng vẫn phòng thủ.
        if (angle > Math.PI / 2 || angle < -Math.PI / 2) {
          angle += Math.PI;
        }

        ctx.save();
        ctx.font = "11px -apple-system, Segoe UI, sans-serif";
        const textWidth = ctx.measureText(child.edgeLabel).width;
        const pillW = textWidth + 14;
        const pillH = 18;
        // Xoay quanh CHÍNH ĐIỂM GIỮA — dịch gốc toạ độ tới đó trước,
        // để mọi hình vẽ sau (viên thuốc + chữ) đều dùng toạ độ CỤC BỘ
        // quanh (0,0), tự động xoay đúng theo phép rotate() đã áp.
        ctx.translate(mid.x, mid.y);
        ctx.rotate(angle);
        ctx.beginPath();
        this.roundRectPath(-pillW / 2, -pillH / 2, pillW, pillH, pillH / 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#e2e5ea";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#6b7280"; // nhạt hơn màu chữ node mặc định (#1f2933), đúng đặc tả gốc
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(child.edgeLabel, 0, 0.5);
        ctx.restore();
      }
      this.drawEdgeLabels(map, childId);
    }
  }

  private drawRelationships(map: MindMap, sel: SelectionState): void {
    const ctx = this.ctx;
    this.relInfo.clear();
    // P2.6b-2 — LUÔN xoá relInfo trước khi kiểm cờ (đã làm ở trên) —
    // nếu tắt hiển thị mà bỏ qua bước dọn, hitTestRelationship() vẫn
    // "trúng" đúng vị trí cũ của một đường đã ẩn, dữ liệu tồn đọng từ
    // lần vẽ trước khi còn bật.
    if (!map.showRelationships) return;

    for (const r of map.relationships) {
      // Nếu một đầu (hoặc cả hai) đang bị ẩn bên trong nhánh đã thu
      // gọn, "gom" đường vẽ về đúng node tổ tiên đang hiển thị thay vì
      // trôi tới vị trí cũ của node đã ẩn.
      const fromRepId = visibleRepresentativeId(map, r.fromId);
      const toRepId = visibleRepresentativeId(map, r.toId);
      if (fromRepId === toRepId) continue; // cả hai gom về cùng một node — không có gì để vẽ

      const a = map.nodes[fromRepId];
      const b = map.nodes[toRepId];
      if (!a || !b) continue;

      const bCenter = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      const aCenter = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
      const p0 = rectAnchor(a, bCenter.x, bCenter.y);
      const p3 = rectAnchor(b, aCenter.x, aCenter.y);

      const cp = r.bend ?? this.autoControlPoint(p0, p3);
      const selected = sel.selectedRelId === r.id;

      ctx.save();
      ctx.strokeStyle = r.color || "#2f9bed";
      ctx.lineWidth = selected ? 3.2 : 2.2;
      ctx.setLineDash(r.dash === false ? [] : [7, 5]);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.quadraticCurveTo(cp.x, cp.y, p3.x, p3.y);
      ctx.stroke();

      const angle = Math.atan2(p3.y - cp.y, p3.x - cp.x);
      ctx.setLineDash([]);
      ctx.fillStyle = r.color || "#2f9bed";
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p3.x - 9 * Math.cos(angle - 0.4), p3.y - 9 * Math.sin(angle - 0.4));
      ctx.lineTo(p3.x - 9 * Math.cos(angle + 0.4), p3.y - 9 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      const mid = quadraticPoint(p0, cp, p3, 0.5);
      let labelBox: RelRenderInfo["labelBox"] = null;
      if (r.label) {
        ctx.save();
        ctx.font = "500 12px -apple-system, Segoe UI, sans-serif";
        const textWidth = ctx.measureText(r.label).width;
        const bx = mid.x - textWidth / 2 - 7;
        const by = mid.y - 11;
        const bw = textWidth + 14;
        const bh = 22;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = selected ? "#2f6fed" : "#dbe4f5";
        ctx.lineWidth = 1;
        ctx.beginPath();
        this.roundRectPath(bx, by, bw, bh, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#1f2933";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(r.label, mid.x, mid.y + 1);
        ctx.restore();
        labelBox = { x: bx, y: by, w: bw, h: bh };
      }

      this.relInfo.set(r.id, {
        labelBox,
        midPoint: mid,
        controlPoint: cp,
        samplePoints: [p0, quadraticPoint(p0, cp, p3, 0.25), mid, quadraticPoint(p0, cp, p3, 0.75), p3],
      });

      if (selected) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#2f6fed";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private autoControlPoint(p0: Point, p3: Point): Point {
    const mx = (p0.x + p3.x) / 2;
    const my = (p0.y + p3.y) / 2;
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const bendAmount = Math.min(70, len * 0.25);
    return { x: mx + nx * bendAmount, y: my + ny * bendAmount };
  }

  /**
   * P2.4 — Khoanh vùng: khung nền bo góc, tô màu nhạt bên trong, có
   * viền và nhãn. Vẽ ĐẦU TIÊN trong draw() (xem lời gọi ở trên) để nằm
   * dưới cùng — mọi thứ khác (đường nối, liên kết, tóm tắt, node) vẽ
   * đè lên trên, đúng cảm giác "một vùng nền được tô" chứ không phải
   * một lớp phủ che khuất nội dung.
   */
  /**
   * P2.5b — chia một đoạn văn bản thành nhiều dòng vừa đúng maxWidth,
   * tôn trọng cả xuống dòng THẬT (Enter khi gõ) lẫn tự ngắt dòng khi
   * một dòng quá dài. Không có khái niệm "quá dài không ngắt được" —
   * một từ đơn lẻ dài hơn maxWidth vẫn được giữ nguyên trên một dòng
   * riêng (đơn giản hơn cắt giữa từ, chấp nhận tràn nhẹ cho trường hợp
   * hiếm gặp này).
   *
   * P2.6b-1: ban đầu chỉ dùng cho Ghi chú dán, giờ TÁI DÙNG NGUYÊN XI
   * cho chữ node ở chế độ textFit="wrap" — logic hoàn toàn tổng quát
   * (chỉ cần text + maxWidth), không có gì đặc thù riêng cho ghi chú
   * dán cả, nên đổi tên cho đúng vai trò dùng chung.
   */
  /**
   * P2.6f (sửa lỗi) — cắt bớt CHỮ THẬT (không phải squeeze hình ảnh
   * qua tham số maxWidth của fillText — đó là hành vi CHÈN ÉP bề rộng
   * chữ, không phải cắt bớt) khi văn bản vẫn không vừa dù đã co cỡ
   * chữ xuống mức nhỏ nhất cho phép. Dò nhị phân tìm đúng số ký tự dài
   * nhất mà "phần đó + …" còn vừa maxWidth — nhanh hơn thử từng ký tự
   * một với chuỗi dài.
   */
  /**
   * P2.7f — vẽ gạch chân (textUnderline) và/hoặc gạch ngang (checked)
   * dưới/giữa MỘT dòng chữ đã vẽ. Canvas KHÔNG có gạch chân/gạch ngang
   * sẵn cho fillText (khác CSS text-decoration) — phải tự đo bề rộng
   * rồi vẽ một đoạn thẳng riêng. Dùng CHUNG cho cả 3 chế độ hiển thị
   * (auto/wrap/shrink) — gọi ngay sau MỖI fillText, với ĐÚNG font đang
   * set lúc đó (để đo bề rộng khớp chính xác chữ vừa vẽ).
   */
  /**
   * P2.7h (Phần 4 — "Kiểu cây tự nhiên") — vẽ đường nối cha-con dạng
   * DẢI BĂNG THON DẦN dọc theo đúng đường cong bezier (dày ở p0, mỏng
   * dần tới p3), thay cho `ctx.stroke()` với MỘT độ dày cố định.
   * Canvas 2D KHÔNG hỗ trợ "nét tự thon" — phải tự TÍNH rồi TÔ ĐẦY
   * một đa giác: tại nhiều điểm dọc đường cong, tính pháp tuyến (vuông
   * góc với tiếp tuyến — dùng lại `cubicBezierTangent` đã có), lệch
   * sang 2 bên theo độ rộng tại điểm đó (nội suy tuyến tính từ
   * widthStart tới widthEnd theo t), nối các điểm lệch đó thành một
   * dải rồi tô đầy.
   *
   * ĐÃ THỬ NGHIỆM TRƯỚC bằng canvas thật (node-canvas), xuất PNG xem
   * trực quan trước khi đưa vào đây — kết quả khớp đúng phong cách 2
   * ảnh mindmap tham khảo (dày gần trung tâm, thon nhọn khi ra xa),
   * không phải đoán mò công thức rồi hy vọng đẹp.
   */
  private drawTaperedBezier(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    widthStart: number,
    widthEnd: number
  ): void {
    const SEGMENTS = 24; // đủ mượt cho kích cỡ node/đường nối thường gặp, không cần nhiều hơn
    const ctx = this.ctx;
    const leftSide: Point[] = [];
    const rightSide: Point[] = [];
    let prevTangent: Point = { x: 1, y: 0 };
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const point = cubicBezierPoint(p0, p1, p2, p3, t);
      let tangent = cubicBezierTangent(p0, p1, p2, p3, t);
      const len = Math.hypot(tangent.x, tangent.y);
      if (len < 0.0001) {
        // Đường cong suy biến tại đúng điểm này (hiếm — ví dụ 2 điểm
        // điều khiển trùng nhau) — dùng tạm tiếp tuyến ngay trước đó,
        // còn hơn chia cho 0.
        tangent = prevTangent;
      } else {
        tangent = { x: tangent.x / len, y: tangent.y / len };
        prevTangent = tangent;
      }
      const normal = { x: -tangent.y, y: tangent.x };
      const width = widthStart + (widthEnd - widthStart) * t;
      leftSide.push({ x: point.x + (normal.x * width) / 2, y: point.y + (normal.y * width) / 2 });
      rightSide.push({ x: point.x - (normal.x * width) / 2, y: point.y - (normal.y * width) / 2 });
    }
    ctx.beginPath();
    ctx.moveTo(leftSide[0]!.x, leftSide[0]!.y);
    for (let i = 1; i < leftSide.length; i++) ctx.lineTo(leftSide[i]!.x, leftSide[i]!.y);
    for (let i = rightSide.length - 1; i >= 0; i--) ctx.lineTo(rightSide[i]!.x, rightSide[i]!.y);
    ctx.closePath();
    ctx.fill();
  }

  private drawTextDecoration(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    align: CanvasTextAlign,
    underline: boolean,
    strikethrough: boolean
  ): void {
    if (!underline && !strikethrough) return;
    const ctx = this.ctx;
    const width = ctx.measureText(text).width;
    if (width <= 0) return;
    let left: number;
    if (align === "left") left = x;
    else if (align === "right") left = x - width;
    else left = x - width / 2;
    const right = left + width;

    ctx.save();
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    if (underline) {
      const uy = y + fontSize * 0.38; // dưới baseline (textBaseline="middle") một đoạn hợp lý
      ctx.beginPath();
      ctx.moveTo(left, uy);
      ctx.lineTo(right, uy);
      ctx.stroke();
    }
    if (strikethrough) {
      const sy = y + fontSize * 0.05; // gần chính giữa chữ
      ctx.beginPath();
      ctx.moveTo(left, sy);
      ctx.lineTo(right, sy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private truncateToFit(text: string, maxWidth: number): string {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const candidate = `${text.slice(0, mid)}…`;
      if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo > 0 ? `${text.slice(0, lo)}…` : "…";
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const ctx = this.ctx;
    const paragraphs = text.split("\n");
    const lines: string[] = [];
    for (const para of paragraphs) {
      if (para.trim() === "") {
        lines.push("");
        continue;
      }
      const words = para.split(/\s+/).filter(Boolean);
      let current = "";
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(test).width > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }
    return lines.length > 0 ? lines : [""];
  }

  private computeStickyNoteBox(note: StickyNote): StickyNoteBox {
    this.ctx.font = STICKY_FONT;
    const innerWidth = STICKY_NOTE_WIDTH - STICKY_NOTE_PADDING * 2;
    const lines = this.wrapText(note.text || "Ghi chú...", innerWidth);
    const height = STICKY_NOTE_PADDING * 2 + lines.length * STICKY_LINE_HEIGHT;
    return { x: note.x, y: note.y, width: STICKY_NOTE_WIDTH, height, lines };
  }

  /** P2.5b — vẽ SAU CÙNG (xem lời gọi trong draw()), đè lên mọi thứ
   *  khác — đúng cảm giác một tờ giấy nhớ dán TRÊN mặt bảng, không
   *  phải một phần của sơ đồ bên dưới nó. */
  private drawStickyNotes(map: MindMap, sel: SelectionState): void {
    const ctx = this.ctx;
    this.stickyNoteInfo.clear();

    for (const note of map.stickyNotes) {
      const box = this.computeStickyNoteBox(note);
      this.stickyNoteInfo.set(note.id, box);
      const selected = sel.selectedStickyNoteId === note.id;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      this.roundRectPath(box.x, box.y, box.width, box.height, 4);
      ctx.fillStyle = note.color || "#fff3b0";
      ctx.fill();
      ctx.restore(); // tắt đổ bóng trước khi vẽ viền/chữ, tránh đổ bóng luôn cả chữ

      if (selected) {
        ctx.save();
        ctx.beginPath();
        this.roundRectPath(box.x, box.y, box.width, box.height, 4);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#2f6fed";
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.font = STICKY_FONT;
      ctx.fillStyle = "#4a3c0b";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      let ly = box.y + STICKY_NOTE_PADDING;
      for (const line of box.lines) {
        ctx.fillText(line, box.x + STICKY_NOTE_PADDING, ly, box.width - STICKY_NOTE_PADDING * 2);
        ly += STICKY_LINE_HEIGHT;
      }
      ctx.restore();
    }
  }

  private drawBoundaries(map: MindMap, sel: SelectionState): void {
    const ctx = this.ctx;
    this.boundaryInfo.clear();

    for (const b of map.boundaries) {
      const g = boundaryGeometry(map, b);
      if (!g) continue;
      this.boundaryInfo.set(b.id, g);
      const selected = sel.selectedBoundaryId === b.id;

      ctx.save();
      ctx.beginPath();
      this.roundRectPath(g.x, g.y, g.width, g.height, 16);
      ctx.fillStyle = b.fillColor || "#fdf2ce";
      ctx.fill();
      ctx.strokeStyle = selected ? "#2f6fed" : b.borderColor || "#e8b923";
      ctx.lineWidth = selected ? 2.4 : 1.6;
      ctx.setLineDash(selected ? [] : [5, 4]);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      this.roundRectPath(g.labelX, g.labelY, g.labelW, g.labelH, 7);
      ctx.fillStyle = b.borderColor || "#e8b923";
      ctx.fill();
      if (selected) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#2f6fed";
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 12px -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label || "Khoanh vùng", g.labelX + g.labelW / 2, g.labelY + g.labelH / 2 + 1, g.labelW - 12);
      ctx.restore();
    }
  }

  private drawSummaries(map: MindMap, sel: SelectionState): void {
    const ctx = this.ctx;
    this.summaryInfo.clear();
    if (!map.showSummaries) return;

    for (const s of map.summaries) {
      const g = summaryGeometry(map, s);
      if (!g) continue;
      this.summaryInfo.set(s.id, g);

      const selected = sel.selectedSummaryId === s.id;
      const color = s.color || "#14162b";
      const { braceX, minY, maxY, tipX, tipY } = g;
      const out = 16;

      ctx.save();
      ctx.strokeStyle = selected ? "#2f6fed" : color;
      ctx.lineWidth = selected ? 2.6 : 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(braceX, minY);
      ctx.quadraticCurveTo(braceX + out, minY, braceX + out, minY + (tipY - minY) * 0.6);
      ctx.quadraticCurveTo(braceX + out, tipY, tipX, tipY);
      ctx.quadraticCurveTo(braceX + out, tipY, braceX + out, maxY - (maxY - tipY) * 0.6);
      ctx.quadraticCurveTo(braceX + out, maxY, braceX, maxY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(g.labelX, tipY);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      this.roundRectPath(g.labelX, g.labelY, g.labelW, g.labelH, 8);
      ctx.fillStyle = color;
      ctx.fill();
      if (selected) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#2f6fed";
        ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 13px -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.label || "Tóm tắt", g.labelX + g.labelW / 2, g.labelY + g.labelH / 2 + 1, g.labelW - 14);
      ctx.restore();
    }
  }

  private drawNodes(map: MindMap, nodeId: string, sel: SelectionState): void {
    const node = map.nodes[nodeId];
    if (!node) return;
    // P1.13 — viewport culling: bỏ qua việc VẼ node này nếu nó nằm
    // hẳn ngoài khung nhìn (kèm margin an toàn) — nhưng VẪN đệ quy
    // xuống con bình thường ở dưới, vì con có thể trải dài VÀO trong
    // khung nhìn dù chính node cha đang ở ngoài (ví dụ node cha nằm
    // ngay sát mép trên, cây con của nó kéo dài xuống bên trong) —
    // cull "cả nhánh" dựa theo MỘT node sẽ có nguy cơ ẩn nhầm phần
    // con đang hiển thị thật, chỉ an toàn khi cull ĐÚNG TỪNG NODE một.
    const isNodeVisible =
      !this.cullViewportRect || isRectVisibleInViewport(node, this.cullViewportRect, CULL_MARGIN);
    if (isNodeVisible) {
      this.drawNode(map, node, sel, node.id === map.rootId, this.isNodeLeftOriented(map, node));
    }
    if (!node.collapsed) {
      for (const childId of node.children) this.drawNodes(map, childId, sel);
    } else if (node.children.length > 0 && isNodeVisible) {
      this.drawCollapsedMarker(map, node);
    }
  }

  private drawNode(map: MindMap, node: MindNode, sel: SelectionState, isRoot: boolean, isLeftLayout: boolean): void {
    const ctx = this.ctx;
    const inMulti = sel.selectedIds.has(node.id);
    const isPrimary = sel.primaryId === node.id && inMulti;
    // Node GỐC bo góc ĐẬM hơn hẳn node thường, ở MỌI layout — theo
    // phản hồi kèm ảnh tham khảo Ishikawa (thời còn có layout Fishbone,
    // sau đã bỏ hẳn) làm nổi bật node gốc rõ ràng hơn.
    const cornerRadius = isRoot ? 16 : 8;

    ctx.beginPath();
    this.roundRectPath(node.x, node.y, node.width, node.height, cornerRadius);
    if (!node.fillTransparent) {
      // P2.6c — độ đậm/nhạt CHỈ áp cho phần TÔ NỀN, không ảnh hưởng
      // viền/chữ vẽ sau đó — save/restore giới hạn đúng phạm vi này.
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(100, node.fillOpacity)) / 100;
      ctx.fillStyle = node.fill || (isRoot ? "#2f6fed" : "#ffffff");
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    this.roundRectPath(node.x, node.y, node.width, node.height, cornerRadius);
    if (node.borderStyle !== "none") {
      ctx.setLineDash(node.borderStyle === "dashed" ? [6, 4] : node.borderStyle === "dotted" ? [2, 3] : []);
      ctx.lineWidth = isPrimary ? 2.6 : inMulti ? 2 : 1;
      ctx.strokeStyle = isPrimary ? "#2f6fed" : inMulti ? "#7ea6ff" : node.borderColor || "#d0d5db";
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (inMulti) {
      ctx.lineWidth = isPrimary ? 2.6 : 2;
      ctx.strokeStyle = isPrimary ? "#2f6fed" : "#7ea6ff";
      ctx.stroke();
    }

    // P2.2 — có nhãn thì chữ chính chỉ căn giữa trong PHẦN TRÊN của
    // node (bỏ chừa hàng nhãn ở đáy), không phải giữa toàn bộ chiều cao.
    // M2 — thẻ bảng (nếu có) nằm ngay trên hàng Tag, cũng bị trừ ra.
    const tagRowHeight = node.tagIds.length > 0 ? LABEL_ROW_HEIGHT : 0;
    const thumb = this.thumbLayoutForNode(map, node);
    const image = this.imageLayoutForNode(map, node);
    const textAreaHeight = node.height - tagRowHeight - thumbReservedHeight(thumb) - imageReservedHeight(image);
    // P2.3 — chừa chỗ cho CẢ HAI icon góc (ghi chú bên trái, link bên
    // phải) nếu có, để chữ chính không đè lên chúng khi node hẹp.
    // P2.7f — chừa thêm chỗ cho checkbox hoàn thành (nếu có) — checkbox
    // nằm "ngay trước chữ" nên phải trừ vào bề rộng khả dụng CHO CHỮ,
    // giống hệt cách 2 icon góc đã trừ từ trước.
    const iconMargin = 12 + (node.link ? 14 : 0) + (node.notes ? 14 : 0) + (node.imageAssetId ? 14 : 0);
    const CHECKBOX_SIZE = 14;
    const checkboxSpace = node.checked !== null ? CHECKBOX_SIZE + 6 : 0;

    // P2.6b-1 — cỡ chữ tuỳ chỉnh (null = mặc định theo cấp, y hệt
    // trước giờ) + căn lề + 3 cách hiển thị (auto/wrap/shrink).
    // P2.6c — fontFamily tuỳ chỉnh (null = dùng font hệ thống cũ).
    const fontSize = node.fontSize ?? (isRoot ? 15 : 13);
    const fontWeight = isRoot ? "600" : "400";
    const fontStack = node.fontFamily
      ? `${node.fontFamily}, -apple-system, Segoe UI, sans-serif`
      : "-apple-system, Segoe UI, sans-serif";
    // P2.7f — đậm/nghiêng: textBold ép "700" bất kể cấp (gốc vốn đã
    // "600", đậm thêm cũng không lùi về nhạt hơn); textItalic thêm tiền
    // tố "italic " vào khai báo font — đúng cú pháp CSS font shorthand
    // mà Canvas font cũng dùng chung.
    const weight = node.textBold ? "700" : fontWeight;
    const italicPrefix = node.textItalic ? "italic " : "";
    const buildFontDecl = (size: number): string => `${italicPrefix}${weight} ${size}px ${fontStack}`;
    const fontDecl = buildFontDecl(fontSize);
    ctx.fillStyle = node.color || (isRoot ? "#ffffff" : "#1f2933");

    const TEXT_PADDING_X = 10;
    let textX: number;
    if (node.textAlign === "left") {
      ctx.textAlign = "left";
      textX = node.x + TEXT_PADDING_X + checkboxSpace;
    } else if (node.textAlign === "right") {
      ctx.textAlign = "right";
      textX = node.x + node.width - TEXT_PADDING_X;
    } else {
      ctx.textAlign = "center";
      // P2.7f — dịch điểm giữa sang phải nửa khoảng checkbox, để tổng
      // thể "checkbox + chữ" trông cân đối hơn trong phần còn lại của
      // node, thay vì chữ vẫn giữa NGUYÊN node đè lên checkbox.
      textX = node.x + node.width / 2 + checkboxSpace / 2;
    }
    ctx.textBaseline = "middle";

    // P2.7f — checkbox hoàn thành, vẽ TRƯỚC chữ vì nằm bên trái chữ.
    if (node.checked !== null) {
      const cbX = node.x + TEXT_PADDING_X;
      const cbY = node.y + textAreaHeight / 2;
      const boxColor = node.color || (isRoot ? "#ffffff" : "#6b7280");
      ctx.save();
      ctx.beginPath();
      this.roundRectPath(cbX, cbY - CHECKBOX_SIZE / 2, CHECKBOX_SIZE, CHECKBOX_SIZE, 3);
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (node.checked) {
        ctx.fillStyle = boxColor;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cbX + 3, cbY);
        ctx.lineTo(cbX + CHECKBOX_SIZE / 2 - 1, cbY + CHECKBOX_SIZE / 2 - 3.5);
        ctx.lineTo(cbX + CHECKBOX_SIZE - 3, cbY - CHECKBOX_SIZE / 2 + 3);
        ctx.strokeStyle = node.fill || (isRoot ? "#2f6fed" : "#ffffff");
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = node.color || (isRoot ? "#ffffff" : "#1f2933"); // khôi phục fillStyle cho chữ vẽ tiếp theo
    }

    // P2.7f — checked=true tự động gạch ngang chữ (đã thống nhất trước
    // khi làm) — KHÔNG cần bật thêm textUnderline riêng, dù cả 2 vẫn
    // có thể cùng bật (gạch chân VÀ gạch ngang cùng lúc, hiếm gặp
    // nhưng không cấm).
    const strikethrough = node.checked === true;

    if (node.textFit === "wrap") {
      const wrapWidth = node.manualWidth ?? 200;
      ctx.font = fontDecl;
      const lines = this.wrapText(node.text, wrapWidth - 24 - checkboxSpace);
      const lineHeight = Math.round(fontSize * 1.35);
      const totalTextHeight = lines.length * lineHeight;
      let ly = node.y + textAreaHeight / 2 - totalTextHeight / 2 + lineHeight / 2;
      for (const line of lines) {
        ctx.fillText(line, textX, ly, node.width - iconMargin - checkboxSpace);
        this.drawTextDecoration(line, textX, ly, fontSize, ctx.textAlign, node.textUnderline, strikethrough);
        ly += lineHeight;
      }
    } else if (node.textFit === "shrink") {
      // Đo ở cỡ chữ GỐC trước — chỉ thu nhỏ khi thật sự không vừa,
      // không bao giờ phóng to hơn cỡ đã đặt.
      let drawFontSize = fontSize;
      const availableWidth = node.width - iconMargin - checkboxSpace - TEXT_PADDING_X;
      ctx.font = fontDecl;
      const textWidth = ctx.measureText(node.text).width;
      let textToDraw = node.text;
      if (textWidth > availableWidth && textWidth > 0) {
        drawFontSize = Math.max(9, Math.floor(fontSize * (availableWidth / textWidth)));
        ctx.font = buildFontDecl(drawFontSize);
        // SỬA LỖI: chữ quá dài so với khung quá hẹp có thể KHÔNG BAO
        // GIỜ vừa dù đã co tới cỡ nhỏ nhất cho phép (9px) — trước đây
        // thiếu hẳn bước này, chữ cứ thế tràn ra ngoài không kiểm
        // soát. Đo lại ở đúng cỡ đã co, cắt bớt bằng "…" nếu vẫn tràn.
        if (ctx.measureText(node.text).width > availableWidth) {
          textToDraw = this.truncateToFit(node.text, availableWidth);
        }
      }
      ctx.fillText(textToDraw, textX, node.y + textAreaHeight / 2);
      this.drawTextDecoration(
        textToDraw,
        textX,
        node.y + textAreaHeight / 2,
        drawFontSize,
        ctx.textAlign,
        node.textUnderline,
        strikethrough
      );
    } else {
      // "auto" — hành vi CŨ Y HỆT (cắt bớt bằng "..." nếu tràn), chỉ
      // khác là fontSize/fontFamily giờ có thể tuỳ chỉnh thay vì luôn
      // cố định.
      ctx.font = fontDecl;
      ctx.fillText(node.text, textX, node.y + textAreaHeight / 2, node.width - iconMargin - checkboxSpace);
      this.drawTextDecoration(
        node.text,
        textX,
        node.y + textAreaHeight / 2,
        fontSize,
        ctx.textAlign,
        node.textUnderline,
        strikethrough
      );
    }

    // P2.7a — soi gương vị trí icon theo layout: ở logicRight, cha nối
    // vào mép TRÁI của node này, nên "phía ra ngoài xa cha" là mép
    // PHẢI; ở logicLeft thì ngược lại — cha nối vào mép PHẢI, "ra
    // ngoài" là mép TRÁI. Ghi chú+huy hiệu ưu tiên vốn cắm mép trái,
    // link+vòng tiến độ vốn cắm mép phải (quy ước có từ P2.2/P2.3) —
    // soi gương đồng bộ cả 4 thứ theo đúng layout đang dùng.
    if (node.notes) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = node.color || (isRoot ? "#ffffff" : "#2f6fed");
      ctx.fillText("📝", isLeftLayout ? node.x + node.width - 14 : node.x + 14, node.y + 13);
    }
    if (node.link) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = node.color || (isRoot ? "#ffffff" : "#2f6fed");
      ctx.fillText("🔗", isLeftLayout ? node.x + 14 : node.x + node.width - 14, node.y + 13);
    }
    // P2.10 — icon ảnh nhúng: CÙNG PHÍA với 🔗 (phía "ra ngoài xa cha",
    // xem ghi chú soi gương P2.7a ở trên) nhưng lùi thêm 14px ra ngoài
    // nếu link cũng đang có, để 2 icon không đè lên nhau.
    if (node.imageAssetId) {
      ctx.font = "12px sans-serif";
      ctx.fillStyle = node.color || (isRoot ? "#ffffff" : "#2f6fed");
      const extra = node.link ? 14 : 0;
      ctx.fillText("🖼", isLeftLayout ? node.x + 14 + extra : node.x + node.width - 14 - extra, node.y + 13);
    }

    this.drawPriorityBadge(node, isLeftLayout);
    this.drawProgressRing(node, isLeftLayout);
    this.drawMarkers(node);
    this.drawLabelPills(map, node);
    if (thumb) this.drawTableThumb(node, thumb, tagRowHeight, isRoot);
    if (image) this.drawImageThumb(map, node, image, tagRowHeight + thumbReservedHeight(thumb), isRoot);
  }

  /** M3 — vẽ thẻ ảnh (ảnh đầu tiên của card + huy hiệu "+N"). Ảnh chưa
   *  giải mã xong thì vẽ ô giữ chỗ; xong sẽ tự vẽ lại qua onImageReady. */
  private drawImageThumb(map: MindMap, node: MindNode, layout: ImageThumbLayout, belowReserved: number, isRoot: boolean): void {
    const ctx = this.ctx;
    const r = imageThumbRect(node, layout, belowReserved);
    const asset = map.assets[layout.block.assetId];
    if (asset) this.ensureImageBitmap(layout.block.assetId, asset);
    const entry = this.imageCache.get(layout.block.assetId);
    ctx.save();
    ctx.beginPath();
    this.roundRectPath(r.x, r.y, r.width, r.height, 4);
    if (entry?.state === "ready" && entry.bitmap) {
      ctx.clip();
      ctx.drawImage(entry.bitmap, r.x, r.y, r.width, r.height);
    } else {
      ctx.fillStyle = isRoot ? "rgba(255,255,255,0.18)" : "rgba(31,41,51,0.08)";
      ctx.fill();
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = isRoot ? "#ffffff" : "#6b7280";
      ctx.fillText(entry?.state === "error" ? "⚠" : "🖼", r.x + r.width / 2, r.y + r.height / 2);
    }
    ctx.restore();
    if (layout.more > 0) {
      const label = `+${layout.more}`;
      ctx.save();
      ctx.font = "600 10px -apple-system, Segoe UI, sans-serif";
      const w = ctx.measureText(label).width + 8;
      const bx = r.x + r.width - w - 3;
      const by = r.y + 3;
      ctx.beginPath();
      this.roundRectPath(bx, by, w, 14, 7);
      ctx.fillStyle = "rgba(17,24,39,0.72)";
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, bx + w / 2, by + 7.5);
      ctx.restore();
    }
  }

  /** M2 — chữ đã cắt cho vừa ô của từng bảng, cache theo object bảng
   *  (xem ghi chú hiệu năng đầu file render/tableThumb.ts). */
  private thumbTextCache = new WeakMap<TableBlock, Map<string, string[][]>>();

  private fitThumbText(text: string, maxWidth: number): string {
    const ctx = this.ctx;
    const oneLine = text.replace(/\s+/g, " ").trim();
    if (ctx.measureText(oneLine).width <= maxWidth) return oneLine;
    let lo = 0;
    let hi = oneLine.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (ctx.measureText(oneLine.slice(0, mid) + "…").width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo === 0 ? "" : oneLine.slice(0, lo) + "…";
  }

  /** M2 — vẽ thẻ thu nhỏ của bảng (tối đa 5×4 ô, phần ẩn hiện "…").
   *  Bấm vào thẻ mở trình sửa bảng — xem hitTestTableThumb. */
  private drawTableThumb(node: MindNode, layout: ThumbLayout, tagRowHeight: number, isRoot: boolean): void {
    const ctx = this.ctx;
    const rect = thumbRect(node, layout, tagRowHeight);
    const { thumb } = layout;
    const cols = thumb.align.length;
    const rows = thumb.cells.length;
    const lineColor = isRoot ? "rgba(255,255,255,0.55)" : "rgba(31,41,51,0.22)";
    const textColor = node.color || (isRoot ? "#ffffff" : "#1f2933");
    const colW = layout.colW;
    // colX[c] = mép trái cột c (colX[cols] = mép phải lưới).
    const colX = [0];
    for (const w of colW) colX.push(colX[colX.length - 1]! + w);
    const gridW = colX[cols] ?? 0;
    const gridH = rows * THUMB_ROW_H;

    ctx.save();
    ctx.font = THUMB_FONT;
    let byShape = this.thumbTextCache.get(layout.table);
    if (!byShape) {
      byShape = new Map();
      this.thumbTextCache.set(layout.table, byShape);
    }
    const shapeKey = `${rows}x${colW.join(",")}/${thumb.headerRow ? 1 : 0}`;
    let fitted = byShape.get(shapeKey);
    if (!fitted) {
      fitted = thumb.cells.map((row, r) => {
        ctx.font = r === 0 && thumb.headerRow ? `600 ${THUMB_FONT}` : THUMB_FONT;
        return row.map((v, c) => this.fitThumbText(v, (colW[c] ?? 0) - 6));
      });
      byShape.set(shapeKey, fitted);
    }

    ctx.fillStyle = isRoot ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.75)";
    ctx.fillRect(rect.x, rect.y, gridW, gridH);
    if (thumb.headerRow) {
      ctx.fillStyle = isRoot ? "rgba(255,255,255,0.22)" : "rgba(47,111,237,0.10)";
      ctx.fillRect(rect.x, rect.y, gridW, THUMB_ROW_H);
    }

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const y = Math.round(rect.y + r * THUMB_ROW_H) + 0.5;
      ctx.moveTo(rect.x, y);
      ctx.lineTo(rect.x + gridW, y);
    }
    for (let c = 0; c <= cols; c++) {
      const x = Math.round(rect.x + (colX[c] ?? 0)) + 0.5;
      ctx.moveTo(x, rect.y);
      ctx.lineTo(x, rect.y + gridH);
    }
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textBaseline = "middle";
    fitted.forEach((row, r) => {
      ctx.font = r === 0 && thumb.headerRow ? `600 ${THUMB_FONT}` : THUMB_FONT;
      row.forEach((text, c) => {
        if (!text) return;
        const align = thumb.align[c] ?? "left";
        const cellX = rect.x + (colX[c] ?? 0);
        const cellW = colW[c] ?? 0;
        ctx.textAlign = align;
        const tx = align === "left" ? cellX + 3 : align === "right" ? cellX + cellW - 3 : cellX + cellW / 2;
        ctx.fillText(text, tx, rect.y + r * THUMB_ROW_H + THUMB_ROW_H / 2);
      });
    });

    ctx.font = THUMB_FONT;
    ctx.textAlign = "center";
    ctx.fillStyle = lineColor;
    if (thumb.moreCols) ctx.fillText("…", rect.x + gridW + THUMB_MORE_W / 2, rect.y + gridH / 2);
    if (thumb.moreRows) ctx.fillText("…", rect.x + gridW / 2, rect.y + gridH + 4);
    ctx.restore();
  }

  /**
   * P2.7b — node này đang "mọc" về bên trái hay bên phải cha của nó?
   * Dùng chung cho cả 3 layout bằng cách SO SÁNH TOẠ ĐỘ THẬT, không
   * cần biết map.layoutType cụ thể là gì — quan trọng nhất với
   * logicBoth, nơi các nhánh cấp 1 khác nhau có thể ở khác bên nhau,
   * một cờ chung duy nhất không đủ diễn tả. Gốc (không có cha — kể cả
   * nhánh trôi) mặc định KHÔNG soi gương, vì bản thân nó không có
   * "hướng" nội tại — hướng chỉ có ý nghĩa với thứ đang mọc RA TỪ nó.
   */
  private isNodeLeftOriented(map: MindMap, node: MindNode): boolean {
    if (node.parentId === null) return false;
    const parent = map.nodes[node.parentId];
    if (!parent) return false;
    return node.x + node.width <= parent.x;
  }

  /** P2.2 — huy hiệu ưu tiên: chấm tròn cắm ở mép "vào trong" (phía
   *  cha) của node — mép trái ở logicRight, mép phải ở logicLeft (xem
   *  P2.7a). */
  private drawPriorityBadge(node: MindNode, isLeftLayout: boolean): void {
    if (node.priority === null) return;
    const ctx = this.ctx;
    const cx = isLeftLayout ? node.x + node.width : node.x;
    const cy = node.y + node.height / 2;
    const colors: Record<number, string> = {
      1: "#d64545",
      2: "#e8873a",
      3: "#c9a227",
      4: "#2f6fed",
      5: "#9aa3ad",
    };
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fillStyle = colors[node.priority] ?? "#9aa3ad";
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 10px -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(node.priority), cx, cy + 0.5);
    ctx.restore();
  }

  /** P2.2 — vòng tiến độ: cắm ở mép "ra ngoài" (xa cha) của node —
   *  mép phải ở logicRight, mép trái ở logicLeft (xem P2.7a). Luôn vẽ
   *  vòng nền xám trọn 360° trước; chỉ vẽ thêm cung màu khi progress
   *  > 0 — tại đúng 0% không để lại vệt vẽ thừa nào, và tại 100% cung
   *  khép kín thành đúng một vòng tròn hoàn chỉnh. */
  private drawProgressRing(node: MindNode, isLeftLayout: boolean): void {
    if (node.progress === null) return;
    const ctx = this.ctx;
    const cx = isLeftLayout ? node.x : node.x + node.width;
    const cy = node.y + node.height / 2;
    const r = 9;
    const pct = Math.max(0, Math.min(100, node.progress));

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#e3e6ec";
    ctx.lineWidth = 3;
    ctx.stroke();

    if (pct > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * pct) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = pct >= 100 ? "#4c9a5a" : "#2f6fed";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    ctx.restore();
  }

  /** P2.2 — biểu tượng: một hàng emoji nổi PHÍA TRÊN node, căn giữa
   *  theo chiều ngang. Không lấn vào node nên không cần tính lại kích
   *  thước, giống triết lý của huy hiệu ưu tiên/vòng tiến độ. */
  private drawMarkers(node: MindNode): void {
    if (node.markers.length === 0) return;
    const ctx = this.ctx;
    const spacing = 16;
    const totalWidth = node.markers.length * spacing;
    let x = node.x + node.width / 2 - totalWidth / 2 + spacing / 2;
    const y = node.y - 12;

    ctx.save();
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const marker of node.markers) {
      ctx.fillText(marker, x, y);
      x += spacing;
    }
    ctx.restore();
  }

  /** P2.2 — dải nhãn dạng viên thuốc, nằm trong hàng dưới cùng của
   *  node (phần height đã được getMeasurer() cộng thêm riêng cho nó). */
  /** P2.2/P2.7e — dải Tag dạng viên thuốc, nằm trong hàng dưới cùng
   *  của node (phần height đã được getMeasurer() cộng thêm riêng cho
   *  nó). Mỗi viên lấy ĐÚNG màu của Tag tương ứng (nền nhạt tự tính từ
   *  màu Tag qua lightenHex, chữ giữ nguyên màu gốc) — trước đây mọi
   *  nhãn dùng chung một màu xanh cố định. */
  private drawLabelPills(map: MindMap, node: MindNode): void {
    if (node.tagIds.length === 0) return;
    const ctx = this.ctx;
    const y = node.y + node.height - LABEL_ROW_HEIGHT / 2;

    const tags = node.tagIds.map((id) => map.tags.find((t) => t.id === id)).filter((t): t is TagDef => t != null);
    if (tags.length === 0) return;

    ctx.font = FONT_LABEL;
    const widths = tags.map((tag) => ctx.measureText(tag.name).width + LABEL_PILL_PAD_X * 2);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + LABEL_PILL_GAP * (tags.length - 1);
    let x = node.x + node.width / 2 - totalWidth / 2;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i] as TagDef;
      const w = widths[i] as number;
      ctx.beginPath();
      this.roundRectPath(x, y - LABEL_PILL_HEIGHT / 2, w, LABEL_PILL_HEIGHT, LABEL_PILL_HEIGHT / 2);
      ctx.fillStyle = lightenHex(tag.color, 0.82);
      ctx.fill();
      ctx.fillStyle = tag.color;
      ctx.fillText(tag.name, x + w / 2, y + 1);
      x += w + LABEL_PILL_GAP;
    }
    ctx.restore();
  }

  private drawHoverRing(node: MindNode): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    this.roundRectPath(node.x - 4, node.y - 4, node.width + 8, node.height + 8, 12);
    ctx.strokeStyle = "rgba(59,130,246,0.5)";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * P2.7c (sửa lỗi) — "bên nào là ra ngoài, xa cha" cho node này, dùng
   * chung cho MỌI thứ cần soi gương theo layout mà trước đây bị bỏ
   * sót ở P2.7a/b: chấm tròn báo "còn con thu gọn, bấm để mở ra"
   * (trước đây LUÔN vẽ cố định bên phải) và vùng bấm icon 🔗 (trước
   * đây LUÔN hit-test cố định bên phải dù icon ĐÃ được vẽ soi gương
   * từ P2.7a — 2 lỗi cùng một nguyên nhân, sửa chung một hàm).
   */
  private isNodeIconsLeftSide(map: MindMap, node: MindNode): boolean {
    if (node.parentId !== null) {
      // Có cha — chấm nằm CÙNG PHÍA với chính node này so với cha
      // (con cháu khi mở ra sẽ tiếp tục đúng hướng đã "cam kết" đó,
      // tái dùng đúng logic đã viết cho icon soi gương ở P2.7b).
      return this.isNodeLeftOriented(map, node);
    }
    // Không có cha (gốc, hoặc nhánh trôi) — không có gì để so sánh vị
    // trí, dùng layoutType làm tín hiệu duy nhất còn lại.
    return map.layoutType === "logicLeft";
  }

  private drawCollapsedMarker(map: MindMap, node: MindNode): void {
    const ctx = this.ctx;
    const isLeft = this.isNodeIconsLeftSide(map, node);
    const cx = isLeft ? node.x - 10 : node.x + node.width + 10;
    const cy = node.y + node.height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#9aa3ad";
    ctx.fill();
  }

  private drawResizeHandle(node: MindNode): void {
    const ctx = this.ctx;
    const s = 9;
    ctx.fillStyle = "#2f6fed";
    ctx.fillRect(node.x + node.width - s / 2, node.y + node.height - s / 2, s, s);
  }

  private roundRectPath(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ----------------------------------------------------------------
  // HIT-TEST — chuyển toạ độ màn hình (screen) sang toạ độ sơ đồ
  // (world) rồi kiểm tra va chạm. Gọi SAU khi đã draw() ít nhất một
  // lần, vì hit-test liên kết/tóm tắt dựa trên relInfo/summaryInfo
  // được tính lại ở mỗi lần draw().
  // ----------------------------------------------------------------

  toWorld(screenX: number, screenY: number, view: ViewTransform): Point {
    return {
      x: (screenX - view.offsetX) / view.scale,
      y: (screenY - view.offsetY) / view.scale,
    };
  }

  hitTestNode(map: MindMap, screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    let found: string | null = null;
    const visit = (id: string): void => {
      const node = map.nodes[id];
      if (!node) return;
      if (wx >= node.x && wx <= node.x + node.width && wy >= node.y && wy <= node.y + node.height) {
        found = id;
      }
      if (!node.collapsed) for (const childId of node.children) visit(childId);
    };
    for (const rootId of getRootIds(map)) visit(rootId);
    return found;
  }

  hitTestResizeHandle(node: MindNode, screenX: number, screenY: number, view: ViewTransform): boolean {
    const hx = (node.x + node.width) * view.scale + view.offsetX;
    const hy = (node.y + node.height) * view.scale + view.offsetY;
    return Math.abs(screenX - hx) <= 8 && Math.abs(screenY - hy) <= 8;
  }

  hitTestLinkIcon(map: MindMap, node: MindNode, screenX: number, screenY: number, view: ViewTransform): boolean {
    if (!node.link) return false;
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    const isLeft = this.isNodeIconsLeftSide(map, node);
    // P2.7c (sửa lỗi) — khớp đúng vị trí icon 🔗 ĐÃ soi gương lúc vẽ
    // (dòng "isLeftLayout ? node.x + 14 : ..." trong drawNode) — trước
    // đây hit-test luôn cố định bên phải, lệch khỏi icon thật với node
    // ở bên trái.
    if (isLeft) {
      return wx >= node.x && wx <= node.x + 22 && wy >= node.y - 2 && wy <= node.y + 20;
    }
    return wx >= node.x + node.width - 22 && wx <= node.x + node.width && wy >= node.y - 2 && wy <= node.y + 20;
  }

  /** M2 — bấm trúng thẻ thu nhỏ của bảng thì trả về id bảng (để mở
   *  trình sửa), không thì null. Dùng đúng thumbRect như lúc vẽ. */
  hitTestTableThumb(map: MindMap, node: MindNode, screenX: number, screenY: number, view: ViewTransform): string | null {
    const layout = this.thumbLayoutForNode(map, node);
    if (!layout) return null;
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    const r = thumbRect(node, layout, node.tagIds.length > 0 ? LABEL_ROW_HEIGHT : 0);
    const slack = 2;
    const inside = wx >= r.x - slack && wx <= r.x + r.width + slack && wy >= r.y - slack && wy <= r.y + r.height + slack;
    return inside ? layout.table.id : null;
  }

  /** M3 — bấm trúng thẻ ảnh thì trả về id khối ảnh đang hiện, không thì null. */
  hitTestImageThumb(map: MindMap, node: MindNode, screenX: number, screenY: number, view: ViewTransform): string | null {
    const layout = this.imageLayoutForNode(map, node);
    if (!layout) return null;
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    const below = (node.tagIds.length > 0 ? LABEL_ROW_HEIGHT : 0) + thumbReservedHeight(this.thumbLayoutForNode(map, node));
    const r = imageThumbRect(node, layout, below);
    const inside = wx >= r.x && wx <= r.x + r.width && wy >= r.y && wy <= r.y + r.height;
    return inside ? layout.block.id : null;
  }

  /**
   * P2.10 — vùng bấm icon 🖼 (ảnh nhúng). Khớp ĐÚNG vị trí đã vẽ ở
   * drawNode(): cùng phía với 🔗 nhưng lùi thêm 14px nếu link cũng có
   * mặt — xem ghi chú tại đoạn vẽ icon trong drawNode().
   */
  hitTestImageIcon(map: MindMap, node: MindNode, screenX: number, screenY: number, view: ViewTransform): boolean {
    if (!node.imageAssetId) return false;
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    const isLeft = this.isNodeIconsLeftSide(map, node);
    const extra = node.link ? 14 : 0;
    if (isLeft) {
      return wx >= node.x + extra && wx <= node.x + 22 + extra && wy >= node.y - 2 && wy <= node.y + 20;
    }
    return (
      wx >= node.x + node.width - 22 - extra &&
      wx <= node.x + node.width - extra &&
      wy >= node.y - 2 &&
      wy <= node.y + 20
    );
  }

  /** P2.7f — dò bấm trúng checkbox hoàn thành hay không. Dùng ĐÚNG
   *  công thức vị trí đã dùng lúc vẽ trong drawNode (node.x +
   *  TEXT_PADDING_X=10, canh giữa theo textAreaHeight) — cố tình viết
   *  lại hằng số ở đây thay vì chia sẻ hàm chung, vì vị trí checkbox
   *  chỉ phụ thuộc 2 con số đơn giản (không phức tạp như viên Tag cần
   *  đo bề rộng chữ), tách hàm riêng cho trường hợp này không đáng. */
  hitTestCheckbox(map: MindMap, node: MindNode, screenX: number, screenY: number, view: ViewTransform): boolean {
    if (node.checked === null) return false;
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    const textAreaHeight =
      node.height - (node.tagIds.length > 0 ? LABEL_ROW_HEIGHT : 0) - thumbReservedHeight(this.thumbLayoutForNode(map, node)) -
      imageReservedHeight(this.imageLayoutForNode(map, node));
    const CHECKBOX_SIZE = 14;
    const TEXT_PADDING_X = 10;
    const cbX = node.x + TEXT_PADDING_X;
    const cbY = node.y + textAreaHeight / 2;
    const slack = 2;
    return (
      wx >= cbX - slack &&
      wx <= cbX + CHECKBOX_SIZE + slack &&
      wy >= cbY - CHECKBOX_SIZE / 2 - slack &&
      wy <= cbY + CHECKBOX_SIZE / 2 + slack
    );
  }

  hitTestRelationship(screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    for (const [id, info] of this.relInfo) {
      if (info.labelBox) {
        const b = info.labelBox;
        if (wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h) return id;
      }
      for (const p of info.samplePoints) {
        if (Math.hypot(p.x - wx, p.y - wy) < 10 / view.scale) return id;
      }
    }
    return null;
  }

  hitTestRelBendHandle(relId: string, screenX: number, screenY: number, view: ViewTransform): boolean {
    const info = this.relInfo.get(relId);
    if (!info) return false;
    const hx = info.controlPoint.x * view.scale + view.offsetX;
    const hy = info.controlPoint.y * view.scale + view.offsetY;
    return Math.hypot(screenX - hx, screenY - hy) <= 10;
  }

  getRelControlPoint(relId: string): Point | null {
    return this.relInfo.get(relId)?.controlPoint ?? null;
  }
  getRelMidPoint(relId: string): Point | null {
    return this.relInfo.get(relId)?.midPoint ?? null;
  }

  hitTestSummary(screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    for (const [id, g] of this.summaryInfo) {
      if (wx >= g.labelX && wx <= g.labelX + g.labelW && wy >= g.labelY && wy <= g.labelY + g.labelH) return id;
      if (Math.abs(wx - g.braceX) < 12 && wy >= g.minY - 4 && wy <= g.maxY + 4) return id;
    }
    return null;
  }

  /**
   * P2.4 — hit-test Boundary CHỈ ở nhãn hoặc dải viền mỏng quanh khung
   * (trong khoảng 6px quanh mép), KHÔNG phải toàn bộ vùng nền bên
   * trong. Lý do: vùng nền tô màu có thể rất rộng và bao trọn cả
   * khoảng trống giữa các node — nếu bấm bất cứ đâu trong đó cũng chọn
   * được Boundary, sẽ tranh chấp với marquee (kéo vùng trống để chọn
   * nhiều node), vốn đã có sẵn từ P1.8.
   */
  hitTestBoundary(screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    for (const [id, g] of this.boundaryInfo) {
      if (wx >= g.labelX && wx <= g.labelX + g.labelW && wy >= g.labelY && wy <= g.labelY + g.labelH) return id;
      const nearLeftOrRight =
        (Math.abs(wx - g.x) < 6 || Math.abs(wx - (g.x + g.width)) < 6) && wy >= g.y && wy <= g.y + g.height;
      const nearTopOrBottom =
        (Math.abs(wy - g.y) < 6 || Math.abs(wy - (g.y + g.height)) < 6) && wx >= g.x && wx <= g.x + g.width;
      if (nearLeftOrRight || nearTopOrBottom) return id;
    }
    return null;
  }

  getBoundaryGeometry(boundaryId: string): BoundaryGeometry | null {
    return this.boundaryInfo.get(boundaryId) ?? null;
  }

  /** P2.5b — hit-test toàn bộ hộp ghi chú dán (khác Boundary: ghi chú
   *  dán KHÔNG có vùng "trong suốt" nào — cả tờ giấy là một khối, bấm
   *  đâu trong đó cũng hợp lệ, đúng cảm giác một tờ giấy nhớ thật). */
  hitTestStickyNote(map: MindMap, screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    for (const note of map.stickyNotes) {
      const box = this.stickyNoteInfo.get(note.id);
      if (!box) continue;
      if (wx >= box.x && wx <= box.x + box.width && wy >= box.y && wy <= box.y + box.height) return note.id;
    }
    return null;
  }

  getStickyNoteGeometry(noteId: string): StickyNoteBox | null {
    return this.stickyNoteInfo.get(noteId) ?? null;
  }

  getSummaryGeometry(summaryId: string): SummaryGeometry | null {
    return this.summaryInfo.get(summaryId) ?? null;
  }

  /**
   * P1.9 — hit-test cho chấm tròn nhỏ đánh dấu một nhánh đang thu gọn
   * (xem drawCollapsedMarker). Tách riêng khỏi hitTestNode vì chấm này
   * nằm NGOÀI hình chữ nhật của node (cách 10px về phía "ra ngoài" —
   * P2.7c sửa lỗi: trước đây LUÔN ở bên phải, giờ soi gương đúng theo
   * layout giống hệt lúc vẽ, không thì vùng bấm sẽ lệch khỏi chấm
   * hiển thị thật với node ở bên trái).
   */
  hitTestCollapsedMarker(map: MindMap, screenX: number, screenY: number, view: ViewTransform): string | null {
    const { x: wx, y: wy } = this.toWorld(screenX, screenY, view);
    let found: string | null = null;
    const visit = (id: string): void => {
      if (found) return;
      const node = map.nodes[id];
      if (!node) return;
      if (node.collapsed && node.children.length > 0) {
        const isLeft = this.isNodeIconsLeftSide(map, node);
        const cx = isLeft ? node.x - 10 : node.x + node.width + 10;
        const cy = node.y + node.height / 2;
        if (Math.hypot(wx - cx, wy - cy) <= 9) {
          found = id;
          return;
        }
      }
      if (!node.collapsed) for (const childId of node.children) visit(childId);
    };
    for (const rootId of getRootIds(map)) visit(rootId);
    return found;
  }

  /**
   * Vẽ vào một canvas OFFSCREEN riêng (dùng cho xuất PNG ở lớp ui/io)
   * bằng cách HOÁN ĐỔI tạm thời ngữ cảnh vẽ, rồi khôi phục lại ngữ
   * cảnh của canvas hiển thị chính. Không tạo instance mới, không cần
   * ép kiểu — instance renderer đang dùng trên màn hình vẫn nguyên vẹn
   * sau khi hàm này chạy xong.
   */
  drawToOffscreenCanvas(
    targetCtx: CanvasRenderingContext2D,
    cssWidth: number,
    cssHeight: number,
    map: MindMap,
    view: ViewTransform,
    sel: SelectionState
  ): void {
    const savedCtx = this.ctx;
    const savedCanvas = this.canvas;
    const savedW = this.cssWidth;
    const savedH = this.cssHeight;

    this.ctx = targetCtx;
    this.canvas = null;
    this.cssWidth = cssWidth;
    this.cssHeight = cssHeight;
    try {
      this.draw(map, view, sel);
    } finally {
      this.ctx = savedCtx;
      this.canvas = savedCanvas;
      this.cssWidth = savedW;
      this.cssHeight = savedH;
    }
  }
}
