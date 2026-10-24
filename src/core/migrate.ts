/**
 * core/migrate.ts
 * ---------------------------------------------------------------------
 * Nâng cấp dữ liệu cũ lên đúng CURRENT_SCHEMA_VERSION trước khi dùng.
 *
 * Quy ước: mỗi migration nhận dữ liệu ở phiên bản N, trả về dữ liệu ở
 * phiên bản N+1. migrateToLatest() nối chuỗi các bước lại cho tới khi
 * đạt phiên bản hiện tại.
 *
 * QUAN TRỌNG — đọc trước khi sửa file này: KHÔNG BAO GIỜ xoá hay sửa
 * một hàm migration đã tồn tại, kể cả khi nó trông "lỗi thời". File
 * người dùng đã lưu ở phiên bản cũ vẫn cần đúng chuỗi di trú cũ đó để
 * mở lại đúng. Chỉ được PHÉP THÊM migration mới.
 * ---------------------------------------------------------------------
 */
import { CURRENT_SCHEMA_VERSION } from "./types";
import type { MindMap } from "./types";
import { generateMapId, generateTagId } from "./tree";
import { sanitizeTheme } from "./theme";
import { normalizeVisual } from "./boundaryVisual";

type UnknownRecord = Record<string, unknown>;
type MigrationFn = (raw: UnknownRecord) => UnknownRecord;

/**
 * Phiên bản 0 -> 1: dữ liệu phiên bản 0 là các file JSON đã xuất từ
 * bản HTML một-file trước khi dự án chuyển sang TypeScript (không có
 * trường schemaVersion). Hình dạng node ở đó đã trùng khớp gần như
 * hoàn toàn với MindNode hiện tại — bước này chủ yếu là điền giá trị
 * mặc định cho những trường có thể thiếu, không đổi cấu trúc.
 */
function migrateV0toV1(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};

  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      id: (n.id as string) ?? id,
      text: (n.text as string) ?? "",
      parentId: (n.parentId as string | null) ?? null,
      children: Array.isArray(n.children) ? n.children : [],
      collapsed: Boolean(n.collapsed),
      notes: (n.notes as string | null) ?? null,
      color: (n.color as string | null) ?? null,
      fill: (n.fill as string | null) ?? null,
      fillTransparent: Boolean(n.fillTransparent),
      borderStyle: (n.borderStyle as string) ?? "solid",
      borderColor: (n.borderColor as string | null) ?? null,
      link: (n.link as string | null) ?? null,
      edgeColor: (n.edgeColor as string | null) ?? null,
      edgeDash: Boolean(n.edgeDash),
      edgeShape: (n.edgeShape as string) ?? "curve",
      offsetX: typeof n.offsetX === "number" ? n.offsetX : 0,
      offsetY: typeof n.offsetY === "number" ? n.offsetY : 0,
      manualWidth: typeof n.manualWidth === "number" ? n.manualWidth : null,
      manualHeight: typeof n.manualHeight === "number" ? n.manualHeight : null,
      baseX: typeof n.baseX === "number" ? n.baseX : 0,
      baseY: typeof n.baseY === "number" ? n.baseY : 0,
      x: typeof n.x === "number" ? n.x : 0,
      y: typeof n.y === "number" ? n.y : 0,
      width: typeof n.width === "number" ? n.width : 120,
      height: typeof n.height === "number" ? n.height : 36,
    };
  }

  const rawRelationships = Array.isArray(raw.relationships) ? raw.relationships : [];
  const rawSummaries = Array.isArray(raw.summaries) ? raw.summaries : [];

  return {
    schemaVersion: 1,
    rootId: raw.rootId,
    nodes,
    relationships: rawRelationships.map((r: UnknownRecord) => ({
      id: r.id,
      fromId: r.fromId,
      toId: r.toId,
      label: (r.label as string) ?? "",
      color: (r.color as string | null) ?? null,
      dash: r.dash !== false,
      bend: (r.bend as { x: number; y: number } | null) ?? null,
    })),
    summaries: rawSummaries.map((s: UnknownRecord) => ({
      id: s.id,
      nodeIds: Array.isArray(s.nodeIds) ? s.nodeIds : [],
      label: (s.label as string) ?? "Tóm tắt",
      color: (s.color as string | null) ?? null,
    })),
  };
}

/**
 * Phiên bản 1 -> 2: P2.2 thêm 4 trường biến node thành mục công việc —
 * markers, progress, priority, labels. File phiên bản 1 (mọi file từ
 * Phase 1 và P2.1) chắc chắn không có các trường này — điền giá trị
 * mặc định "chưa dùng tính năng" (mảng rỗng / null), không suy đoán gì
 * thêm từ dữ liệu cũ vì Phase 1 không có khái niệm này để suy ra.
 */
function migrateV1toV2(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};

  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      ...n,
      markers: Array.isArray(n.markers) ? n.markers : [],
      progress: typeof n.progress === "number" ? n.progress : null,
      priority: typeof n.priority === "number" ? n.priority : null,
      labels: Array.isArray(n.labels) ? n.labels : [],
    };
  }

  return { ...raw, schemaVersion: 2, nodes };
}

/**
 * Phiên bản 2 -> 3: P2.4 thêm Khoanh vùng (Boundary) — một mảng entity
 * mới ở cấp tài liệu, giống hệt cách relationships/summaries đã có từ
 * trước. File phiên bản 2 chắc chắn chưa có mảng này — điền mảng rỗng,
 * không có gì để suy ra từ dữ liệu cũ.
 */
function migrateV2toV3(raw: UnknownRecord): UnknownRecord {
  return {
    ...raw,
    schemaVersion: 3,
    boundaries: Array.isArray(raw.boundaries) ? raw.boundaries : [],
  };
}

/**
 * Phiên bản 3 -> 4: P2.5b thêm Ghi chú dán (StickyNote) — cùng khuôn
 * mẫu với boundaries ở bước trước: một mảng entity mới ở cấp tài liệu,
 * điền mảng rỗng cho file chưa có.
 */
function migrateV3toV4(raw: UnknownRecord): UnknownRecord {
  return {
    ...raw,
    schemaVersion: 4,
    stickyNotes: Array.isArray(raw.stickyNotes) ? raw.stickyNotes : [],
  };
}

/**
 * Phiên bản 4 -> 5: P2.6b-1 thêm fontSize/textAlign/textFit vào từng
 * node. Mặc định textFit="auto" — GIỮ NGUYÊN VẸN cách vẽ chữ cũ cho
 * mọi node từ file trước đây, không có node nào bất ngờ đổi hình dạng
 * chỉ vì mở lên bằng bản mới.
 */
function migrateV4toV5(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};

  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      ...n,
      fontSize: typeof n.fontSize === "number" ? n.fontSize : null,
      textAlign: n.textAlign === "left" || n.textAlign === "right" ? n.textAlign : "center",
      textFit: n.textFit === "wrap" || n.textFit === "shrink" ? n.textFit : "auto",
    };
  }

  return { ...raw, schemaVersion: 5, nodes };
}

/**
 * Phiên bản 5 -> 6: P2.6b-2 thêm nhãn trên đường cha-con (edgeLabel,
 * lưu trên từng node) + 3 công tắc hiển thị mức tài liệu. Mặc định
 * showEdgeLabels=false (tắt) để không đột ngột hiện nhãn trên map của
 * ai chưa từng dùng tính năng này; showRelationships/showSummaries=true
 * để GIỮ ĐÚNG hành vi hiển thị đã có từ P1.8 tới giờ.
 */
function migrateV5toV6(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};

  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      ...n,
      edgeLabel: typeof n.edgeLabel === "string" ? n.edgeLabel : null,
    };
  }

  return {
    ...raw,
    schemaVersion: 6,
    nodes,
    showEdgeLabels: typeof raw.showEdgeLabels === "boolean" ? raw.showEdgeLabels : false,
    showRelationships: typeof raw.showRelationships === "boolean" ? raw.showRelationships : true,
    showSummaries: typeof raw.showSummaries === "boolean" ? raw.showSummaries : true,
  };
}

/**
 * Phiên bản 6 -> 7: P2.6c thêm fontFamily (tên font tự do) và
 * fillOpacity (độ đậm/nhạt màu nền, 0-100). fillOpacity mặc định 100
 * — GIỮ NGUYÊN VẸN độ đậm màu nền cũ cho mọi node có sẵn, không có
 * node nào tự nhạt đi chỉ vì mở bằng bản mới.
 */
function migrateV6toV7(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};

  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      ...n,
      fontFamily: typeof n.fontFamily === "string" ? n.fontFamily : null,
      fillOpacity: typeof n.fillOpacity === "number" ? n.fillOpacity : 100,
    };
  }

  return { ...raw, schemaVersion: 7, nodes };
}

/**
 * Phiên bản 7 -> 8: P2.6d thêm mapId + mapTitle. GIỮ mapId nếu file đã
 * có sẵn (ví dụ mở lại đúng file đã xuất từ bản có mapId trước đó) —
 * chỉ SINH MỚI khi thật sự chưa có (file cũ hơn P2.6d, hoặc soạn tay
 * không kèm mapId). Đây là hàm di trú DUY NHẤT không có kết quả tất
 * định 100% — mở CÙNG một file cũ 2 lần riêng biệt (2 lượt nhập JSON
 * tách biệt) sẽ ra 2 mapId KHÁC NHAU mỗi lần, vì bản thân file đó
 * chưa từng có định danh nào để "khôi phục" — đây là điều đã thống
 * nhất trước khi làm bước này, không phải sai sót.
 */
function migrateV7toV8(raw: UnknownRecord): UnknownRecord {
  return {
    ...raw,
    schemaVersion: 8,
    mapId: typeof raw.mapId === "string" && raw.mapId.length > 0 ? raw.mapId : generateMapId(),
    mapTitle: typeof raw.mapTitle === "string" ? raw.mapTitle : null,
  };
}

/**
 * Phiên bản 8 -> 9: P2.7a thêm layoutType. Mặc định "logicRight" —
 * ĐÚNG HÀNH VI DUY NHẤT đã có từ P1.1 tới giờ, không có map nào tự
 * đổi hình dạng chỉ vì mở bằng bản có nhiều kiểu bố cục.
 */
function migrateV8toV9(raw: UnknownRecord): UnknownRecord {
  return {
    ...raw,
    schemaVersion: 9,
    layoutType: raw.layoutType === "logicLeft" ? "logicLeft" : "logicRight",
  };
}

/**
 * Phiên bản 9 -> 10: P2.7e nâng cấp Nhãn tự do (labels: string[] trên
 * từng node) lên hệ thống Tag tập trung (map.tags: TagDef[] + mỗi node
 * chỉ giữ tagIds: string[] tham chiếu vào đó). KHÔNG MẤT DỮ LIỆU: quét
 * MỌI nhãn chữ đã có trên MỌI node, gom theo GIÁ TRỊ DUY NHẤT (2 node
 * cùng gõ "Quan trọng" giờ CHIA SẺ đúng một Tag, không tạo trùng lặp
 * — đổi tên/màu Tag đó sau này tự động áp dụng cho cả hai), tạo đúng
 * một Tag cho mỗi giá trị duy nhất, màu gán theo vòng tròn từ bảng màu
 * cố định (không có gì trong dữ liệu cũ để "suy ra" màu người dùng
 * từng mong muốn — id Tag luôn sinh mới ngẫu nhiên mỗi lần chạy hàm
 * này, giống tinh thần đã chấp nhận với mapId ở P2.6d).
 */
function migrateV9toV10(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const TAG_COLORS = ["#2f6fed", "#d64545", "#0e9f6e", "#e8873a", "#9333ea", "#0891b2", "#c026d3", "#65a30d"];

  const uniqueLabels: string[] = [];
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    const labels = Array.isArray(n.labels) ? (n.labels as unknown[]) : [];
    for (const l of labels) {
      if (typeof l === "string" && l.length > 0 && !uniqueLabels.includes(l)) uniqueLabels.push(l);
    }
  }

  const labelToTagId = new Map<string, string>();
  const tags: UnknownRecord[] = uniqueLabels.map((name, i) => {
    const id = generateTagId();
    labelToTagId.set(name, id);
    return { id, name, color: TAG_COLORS[i % TAG_COLORS.length] };
  });

  const nodes: UnknownRecord = {};
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    const labels = Array.isArray(n.labels) ? (n.labels as unknown[]) : [];
    const tagIds = labels
      .filter((l): l is string => typeof l === "string")
      .map((l) => labelToTagId.get(l))
      .filter((tagId): tagId is string => typeof tagId === "string");

    const nodeCopy: UnknownRecord = { ...n };
    delete nodeCopy.labels;
    nodeCopy.tagIds = tagIds;
    nodes[id] = nodeCopy;
  }

  return { ...raw, schemaVersion: 10, nodes, tags };
}

/** Sổ đăng ký: khoá là phiên bản NGUỒN, giá trị là hàm nâng lên NGUỒN+1. */
/**
 * Phiên bản 10 -> 11: P2.7f thêm đậm/nghiêng/gạch chân
 * (textBold/textItalic/textUnderline) và checkbox hoàn thành
 * (checked) cho từng node. Đơn giản hơn hẳn các lần di trú trước —
 * không cần biến đổi hay gom dữ liệu cũ (khác Tag ở bản 9->10), chỉ
 * điền giá trị mặc định ĐÚNG HÀNH VI CŨ (false/false/false/null) cho
 * mọi node hiện có, không có node nào tự đổi hình dạng.
 */
function migrateV10toV11(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = {
      ...n,
      textBold: typeof n.textBold === "boolean" ? n.textBold : false,
      textItalic: typeof n.textItalic === "boolean" ? n.textItalic : false,
      textUnderline: typeof n.textUnderline === "boolean" ? n.textUnderline : false,
      checked: typeof n.checked === "boolean" ? n.checked : null,
    };
  }
  return { ...raw, schemaVersion: 11, nodes };
}

/**
 * Phiên bản 11 -> 12: nâng cấp cho phép chỉnh ĐỘ DÀY đường nối tự
 * chỉnh tay (edgeWidth trên từng node — null = tự động theo cấp).
 * Đơn giản như 10->11 — chỉ điền mặc định null (đúng hành vi cũ: mọi
 * đường nối trước đây đều vẽ cùng một độ dày cố định 1.5px; giờ
 * TỰ ĐỘNG chuyển sang mỏng dần theo cấp thay vì giữ cố định — đây là
 * MỘT THAY ĐỔI HÌNH ẢNH nhẹ so với trước, không phải giữ y hệt pixel,
 * nhưng không node nào cần sửa dữ liệu gì để đạt điều đó).
 */
function migrateV11toV12(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = { ...n, edgeWidth: typeof n.edgeWidth === "number" ? n.edgeWidth : null };
  }
  return { ...raw, schemaVersion: 12, nodes };
}

/**
 * Phiên bản 12 -> 13: nâng cấp thêm công tắc "Kiểu cây tự nhiên"
 * (organicEdges trên map, không phải trên từng node). Đơn giản nhất
 * trong mọi hàm di trú — chỉ thêm ĐÚNG MỘT trường ở CẤP MAP, mặc định
 * false (giữ nguyên y hệt cách vẽ cũ cho mọi file có sẵn — công tắc
 * này CHỦ ĐỘNG người dùng phải tự bật, không tự động bật cho ai cả).
 */
function migrateV12toV13(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 13, organicEdges: typeof raw.organicEdges === "boolean" ? raw.organicEdges : false };
}

/**
 * Phiên bản 13 -> 14: XOÁ HOÀN TOÀN bố cục Fishbone (sơ đồ xương cá) —
 * theo yêu cầu trực tiếp sau nhiều vòng chỉnh sửa (6+ lần thiết kế lại
 * thuật toán) vẫn chưa đạt được hình dạng mong muốn. Bất kỳ file nào
 * đã lưu với `layoutType: "fishbone"` (không còn tồn tại trong
 * `LayoutType`) sẽ tự động chuyển về `"logicRight"` — layout MẶC ĐỊNH
 * xuyên suốt từ P1.1, an toàn nhất để không ai mở lại file cũ mà gặp
 * màn hình trống hoặc lỗi vì layoutType không còn được nhận diện.
 * Không có field nào khác cần dọn (Fishbone dùng chung schema
 * MindNode/MindMap với mọi layout khác, không có field riêng).
 */
function migrateV13toV14(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 14, layoutType: raw.layoutType === "fishbone" ? "logicRight" : raw.layoutType };
}

/**
 * Phiên bản 14 -> 15: thêm "Ảnh nhúng" trên node (P2.10) — kho ảnh tập
 * trung `map.assets` (mới, mặc định rỗng — file cũ không có ảnh nào)
 * và con trỏ `node.imageAssetId` trên từng node (mới, mặc định null —
 * không node cũ nào có ảnh, không thể suy ra được từ dữ liệu trước đó).
 * Đơn giản, cùng khuôn mẫu với migrateV12toV13 (chỉ thêm field mới,
 * không cần chuyển đổi giá trị cũ nào).
 */
function migrateV14toV15(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = { ...n, imageAssetId: typeof n.imageAssetId === "string" ? n.imageAssetId : null };
  }
  return {
    ...raw,
    schemaVersion: 15,
    nodes,
    assets: typeof raw.assets === "object" && raw.assets !== null ? raw.assets : {},
  };
}

/**
 * Phiên bản 15 -> 16: thêm `map.activeThemeId` (P2.11) — id theme đang
 * bật để biết node MỚI TẠO cần tự động tô theo theme nào. File cũ
 * (trước khi field này tồn tại) coi như "chưa bật theme nào", mặc
 * định null — giữ nguyên hành vi cũ (không tự tô gì thêm) cho tới khi
 * người dùng chủ động bấm "Áp dụng" một lần.
 */
function migrateV15toV16(raw: UnknownRecord): UnknownRecord {
  return {
    ...raw,
    schemaVersion: 16,
    activeThemeId: typeof raw.activeThemeId === "string" ? raw.activeThemeId : null,
  };
}

/**
 * Phiên bản 16 -> 17: thêm Card & Block (M1) — kho `map.cards` (mới,
 * mặc định rỗng) và con trỏ `node.cardId` (mới, mặc định null). File cũ
 * không có card nào; `notes` được GIỮ NGUYÊN (không chuyển thành card ở
 * bước này — xem docs/ROADMAP.md mục 0).
 */
function migrateV16toV17(raw: UnknownRecord): UnknownRecord {
  const rawNodes = (raw.nodes as UnknownRecord | undefined) ?? {};
  const nodes: UnknownRecord = {};
  for (const id of Object.keys(rawNodes)) {
    const n = (rawNodes[id] ?? {}) as UnknownRecord;
    nodes[id] = { ...n, cardId: typeof n.cardId === "string" ? n.cardId : null };
  }
  return {
    ...raw,
    schemaVersion: 17,
    nodes,
    cards: typeof raw.cards === "object" && raw.cards !== null && !Array.isArray(raw.cards) ? raw.cards : {},
  };
}

/**
 * Phiên bản 17 -> 18: khối ảnh trong card có thêm `size` (M3 — cỡ hiển
 * thị trên node), mặc định "medium". Các khối khác giữ nguyên.
 */
function migrateV17toV18(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 18, cards: normalizeImageBlockSizes(raw.cards) };
}

const IMAGE_SIZES = new Set(["small", "medium", "large"]);

/**
 * Phiên bản 18 -> 19: bảng có thêm `colWidths` / `rowHeights` (kéo đổi
 * cỡ cột/hàng trong trình sửa bảng), mặc định 130 / 28 px.
 */
function migrateV18toV19(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 19, cards: normalizeTableSizes(raw.cards) };
}

/** Bảo đảm mọi bảng có colWidths/rowHeights đúng độ dài, số dương; giá
 *  trị thiếu/sai thay bằng mặc định (giữ lại phần còn dùng được). */
function normalizeTableSizes(rawCards: unknown): UnknownRecord {
  if (typeof rawCards !== "object" || rawCards === null || Array.isArray(rawCards)) return {};
  const fix = (arr: unknown, len: number, def: number): number[] =>
    Array.from({ length: len }, (_, i) => {
      const v = Array.isArray(arr) ? arr[i] : undefined;
      return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : def;
    });
  const cards: UnknownRecord = {};
  for (const [id, c] of Object.entries(rawCards as UnknownRecord)) {
    const card = (c ?? {}) as UnknownRecord;
    const blocks = Array.isArray(card.blocks)
      ? card.blocks.map((b: unknown) => {
          const block = (b ?? {}) as UnknownRecord;
          if (block.type !== "table" || !Array.isArray(block.align) || !Array.isArray(block.cells)) return block;
          return {
            ...block,
            colWidths: fix(block.colWidths, block.align.length, 130),
            rowHeights: fix(block.rowHeights, block.cells.length, 28),
          };
        })
      : card.blocks;
    cards[id] = { ...card, blocks };
  }
  return cards;
}

/** Bảo đảm mọi khối ảnh có `size` hợp lệ (dùng cho migrate 17->18 và cho
 *  bước chuẩn hoá cuối migrateToLatest — dữ liệu ghi "18" nhưng thiếu). */
function normalizeImageBlockSizes(rawCards: unknown): UnknownRecord {
  if (typeof rawCards !== "object" || rawCards === null || Array.isArray(rawCards)) return {};
  const cards: UnknownRecord = {};
  for (const [id, c] of Object.entries(rawCards as UnknownRecord)) {
    const card = (c ?? {}) as UnknownRecord;
    const blocks = Array.isArray(card.blocks)
      ? card.blocks.map((b: unknown) => {
          const block = (b ?? {}) as UnknownRecord;
          if (block.type !== "image" || IMAGE_SIZES.has(block.size as string)) return block;
          return { ...block, size: "medium" };
        })
      : card.blocks;
    cards[id] = { ...card, blocks };
  }
  return cards;
}

/**
 * Phiên bản 19 -> 20 (KW0): card có thêm `createdAt` / `updatedAt` / `rev`
 * (nền cho đồng bộ card giữa nhiều map — KW1). Card cũ: 0 / 0 / 0 = "không
 * rõ, cũ hơn mọi lần sửa sau này".
 */
function migrateV19toV20(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 20, cards: normalizeCardMeta(raw.cards) };
}

/** Bảo đảm mọi card có createdAt/updatedAt/rev là số hữu hạn không âm. */
function normalizeCardMeta(rawCards: unknown): UnknownRecord {
  if (typeof rawCards !== "object" || rawCards === null || Array.isArray(rawCards)) return {};
  const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const cards: UnknownRecord = {};
  for (const [id, c] of Object.entries(rawCards as UnknownRecord)) {
    const card = (c ?? {}) as UnknownRecord;
    cards[id] = { ...card, createdAt: num(card.createdAt), updatedAt: num(card.updatedAt), rev: num(card.rev) };
  }
  return cards;
}

/** Phiên bản 20 -> 21: map có thêm `customTheme` (theme riêng nhúng kèm), mặc định null. */
function migrateV20toV21(raw: UnknownRecord): UnknownRecord {
  return { ...raw, schemaVersion: 21, customTheme: sanitizeTheme(raw.customTheme) };
}

const MIGRATIONS: Record<number, MigrationFn> = {
  0: migrateV0toV1,
  1: migrateV1toV2,
  2: migrateV2toV3,
  3: migrateV3toV4,
  4: migrateV4toV5,
  5: migrateV5toV6,
  6: migrateV6toV7,
  7: migrateV7toV8,
  8: migrateV8toV9,
  9: migrateV9toV10,
  10: migrateV10toV11,
  11: migrateV11toV12,
  12: migrateV12toV13,
  13: migrateV13toV14,
  14: migrateV14toV15,
  15: migrateV15toV16,
  16: migrateV16toV17,
  17: migrateV17toV18,
  18: migrateV18toV19,
  19: migrateV19toV20,
  20: migrateV20toV21,
};

/**
 * Nâng dữ liệu bất kỳ lên CURRENT_SCHEMA_VERSION. Ném lỗi rõ ràng nếu
 * file đến từ một bản T17Mind MỚI HƠN (không thể lùi phiên bản), hoặc
 * nếu thiếu một bước di trú trong chuỗi (lỗi cấu hình, không nên xảy
 * ra nếu MIGRATIONS được cập nhật đúng mỗi khi tăng schema version).
 */
export function migrateToLatest(raw: UnknownRecord): MindMap {
  let data = raw;
  let version = typeof data.schemaVersion === "number" ? data.schemaVersion : 0;

  if (version > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `File này được lưu bởi một bản T17Mind mới hơn (schema ${version}, ` +
        `bản hiện tại chỉ hiểu tới ${CURRENT_SCHEMA_VERSION}). ` +
        `Hãy cập nhật ứng dụng lên bản mới nhất rồi mở lại.`
    );
  }

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) {
      throw new Error(`Thiếu hàm di trú từ schema ${version} lên ${version + 1}.`);
    }
    data = migrate(data);
    version = data.schemaVersion as number;
  }

  // SỬA LỖI (phát hiện qua bộ test P1.14, không phải người dùng báo):
  // mỗi hàm di trú TỰ CHỊU TRÁCH NHIỆM giữ nguyên/khởi tạo field của
  // CHÍNH nó — nhưng chỉ `migrateV0toV1` (bước ĐẦU TIÊN) thực sự kiểm
  // tra `Array.isArray` trước khi dùng `relationships`/`summaries`;
  // các bước SAU đó ngầm giả định field này LUÔN ĐÃ CÓ (đúng với MỌI
  // file thật, vì chúng luôn đi qua bước v0->v1 trước) — nhưng nếu dữ
  // liệu bị chỉnh tay/hỏng khiến `schemaVersion` không khớp đúng cấu
  // trúc thực của nó (ví dụ ghi "schemaVersion: 5" nhưng thiếu hẳn
  // `relationships`), vòng lặp trên sẽ BỎ QUA bước v0->v1 (vì đã coi
  // là "đủ mới"), và field đó sẽ là `undefined` thay vì mảng rỗng —
  // khiến `validateMindMap` (và mọi nơi khác lặp qua các mảng này)
  // CRASH với "not iterable" thay vì báo lỗi có kiểm soát.
  // Chuẩn hoá lại MỘT LẦN DUY NHẤT ở đây — điểm hẹp, dễ bảo trì hơn
  // nhiều so với rà soát sửa lại cả 12 hàm di trú riêng lẻ.
  const safe = data as UnknownRecord;
  if (!Array.isArray(safe.relationships)) safe.relationships = [];
  if (!Array.isArray(safe.summaries)) safe.summaries = [];
  if (!Array.isArray(safe.boundaries)) safe.boundaries = [];
  if (!Array.isArray(safe.stickyNotes)) safe.stickyNotes = [];
  if (!Array.isArray(safe.tags)) safe.tags = [];
  if (typeof safe.assets !== "object" || safe.assets === null) safe.assets = {};
  if (typeof safe.activeThemeId !== "string") safe.activeThemeId = null;
  safe.customTheme = sanitizeTheme(safe.customTheme);
  // Nhóm trực quan: `visual` là tuỳ chọn thêm sau (không đổi schema) — làm sạch khi đọc file; hỏng/thiếu = hình chữ nhật cũ.
  for (const b of safe.boundaries as UnknownRecord[]) {
    if (b && typeof b === "object" && "visual" in b) {
      const v = normalizeVisual(b.visual);
      if (v) b.visual = v;
      else delete b.visual;
    }
  }
  safe.cards = normalizeCardMeta(normalizeTableSizes(normalizeImageBlockSizes(safe.cards)));

  // Cùng lý do, cùng cách sửa — nhưng ở CẤP NODE: children/markers/
  // tagIds cũng là mảng, cũng có thể bị "rơi" giống hệt các mảng cấp
  // map ở trên nếu dữ liệu vào không đi trọn từ v0.
  const nodes = safe.nodes as Record<string, UnknownRecord> | undefined;
  if (nodes) {
    for (const node of Object.values(nodes)) {
      if (!Array.isArray(node.children)) node.children = [];
      if (!Array.isArray(node.markers)) node.markers = [];
      if (!Array.isArray(node.tagIds)) node.tagIds = [];
      if (typeof node.imageAssetId !== "string") node.imageAssetId = null;
      if (typeof node.cardId !== "string") node.cardId = null;
    }
  }

  return data as unknown as MindMap;
}
