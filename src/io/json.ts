/**
 * io/json.ts
 * ---------------------------------------------------------------------
 * Nhập/xuất JSON. Hai định dạng nhập được chấp nhận:
 *
 *   1. Cây lồng nhau { text, children: [...] } — soạn tay nhanh, không
 *      có relationships/summaries, không có schemaVersion (luôn coi là
 *      tài liệu MỚI, dựng thẳng ở CURRENT_SCHEMA_VERSION).
 *
 *   2. Định dạng đầy đủ { schemaVersion?, rootId, nodes, relationships,
 *      summaries } — chính là những gì "Xuất JSON" tạo ra. Nếu thiếu
 *      schemaVersion, coi là phiên bản 0 (file từ bản HTML một-file cũ)
 *      và chạy qua migrateToLatest() trước khi dùng.
 *
 * MỌI đường nhập đều phải qua validateMindMap() trước khi trả về —
 * đây là "xác thực ở biên" nhắc tới trong bản kế hoạch 3 phase.
 * ---------------------------------------------------------------------
 */
import type { BorderStyle, EdgeShape, MindMap } from "../core/types";
import { CURRENT_SCHEMA_VERSION } from "../core/types";
import { createNode, generateMapId, generateTagId } from "../core/tree";
import { validateMindMap } from "../core/validate";
import { migrateToLatest } from "../core/migrate";

export type ImportResult = { ok: true; map: MindMap } | { ok: false; errors: string[] };

export function parseJsonFile(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`File không phải JSON hợp lệ: ${String((err as Error).message)}`] };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, errors: ["Nội dung file phải là một object JSON."] };
  }

  const obj = parsed as Record<string, unknown>;
  const looksFlat = typeof obj.rootId === "string" && typeof obj.nodes === "object" && obj.nodes !== null;

  return looksFlat ? importFlatJson(obj) : importNestedJson(obj);
}

// ---------------------------------------------------------------------
// Định dạng đầy đủ (round-trip)
// ---------------------------------------------------------------------

function importFlatJson(obj: Record<string, unknown>): ImportResult {
  let migrated: MindMap;
  try {
    migrated = migrateToLatest(obj);
  } catch (err) {
    return { ok: false, errors: [(err as Error).message] };
  }
  const errors = validateMindMap(migrated);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, map: migrated };
}

/** Xuất định dạng đầy đủ — chính là những gì importFlatJson() đọc lại được. */
export function exportFlatJson(map: MindMap): string {
  return JSON.stringify(map, null, 2);
}

// ---------------------------------------------------------------------
// Cây lồng nhau (soạn tay)
// ---------------------------------------------------------------------

interface NestedNodeInput {
  text?: unknown;
  notes?: unknown;
  color?: unknown;
  fill?: unknown;
  fillTransparent?: unknown;
  borderStyle?: unknown;
  borderColor?: unknown;
  link?: unknown;
  markers?: unknown;
  progress?: unknown;
  priority?: unknown;
  labels?: unknown;
  edgeLabel?: unknown;
  edgeColor?: unknown;
  edgeDash?: unknown;
  edgeShape?: unknown;
  edgeWidth?: unknown;
  fontSize?: unknown;
  fontFamily?: unknown;
  fillOpacity?: unknown;
  textAlign?: unknown;
  textFit?: unknown;
  textBold?: unknown;
  textItalic?: unknown;
  textUnderline?: unknown;
  checked?: unknown;
  collapsed?: unknown;
  children?: unknown;
}

function importNestedJson(obj: Record<string, unknown>): ImportResult {
  const errors: string[] = [];
  if (typeof obj.text !== "string" || obj.text.length === 0) {
    errors.push('Node gốc thiếu trường "text" (nội dung).');
    return { ok: false, errors };
  }

  const nodes: MindMap["nodes"] = {};
  // Định dạng cây soạn tay tiếp tục nhận "labels" dạng CHỮ TỰ DO (khác
  // định dạng đầy đủ, giờ dùng tagIds tham chiếu map.tags) — giữ đúng
  // tinh thần "soạn tay nhanh" của định dạng này, không bắt người soạn
  // phải tự khai báo trước danh sách Tag. Tự động TẠO Tag khi gặp chữ
  // MỚI, TÁI DÙNG đúng Tag đã tạo khi gặp lại CHỮ GIỐNG HỆT (không tạo
  // trùng lặp) — cùng nguyên tắc với hàm di trú migrateV9toV10.
  const labelToTagId = new Map<string, string>();
  const tags: MindMap["tags"] = [];
  const TAG_COLORS = ["#2f6fed", "#d64545", "#0e9f6e", "#e8873a", "#9333ea", "#0891b2", "#c026d3", "#65a30d"];
  function resolveLabelsToTagIds(labels: unknown): string[] {
    if (!Array.isArray(labels)) return [];
    const tagIds: string[] = [];
    for (const l of labels) {
      if (typeof l !== "string" || l.length === 0) continue;
      let tagId = labelToTagId.get(l);
      if (!tagId) {
        tagId = generateTagId();
        labelToTagId.set(l, tagId);
        tags.push({ id: tagId, name: l, color: TAG_COLORS[tags.length % TAG_COLORS.length] as string });
      }
      if (!tagIds.includes(tagId)) tagIds.push(tagId);
    }
    return tagIds;
  }

  const build = (input: NestedNodeInput, parentId: string | null, path: string): string | null => {
    if (typeof input.text !== "string" || input.text.length === 0) {
      errors.push(`Node tại "${path}" thiếu trường "text".`);
      return null;
    }
    const node = createNode(input.text, parentId);
    if (typeof input.notes === "string") node.notes = input.notes;
    if (typeof input.color === "string") node.color = input.color;
    if (typeof input.fill === "string") node.fill = input.fill;
    if (typeof input.fillTransparent === "boolean") node.fillTransparent = input.fillTransparent;
    if (typeof input.borderStyle === "string") node.borderStyle = input.borderStyle as BorderStyle;
    if (typeof input.borderColor === "string") node.borderColor = input.borderColor;
    if (typeof input.link === "string") node.link = input.link;
    if (Array.isArray(input.markers)) node.markers = input.markers.filter((m): m is string => typeof m === "string");
    if (typeof input.progress === "number") node.progress = Math.max(0, Math.min(100, input.progress));
    if (typeof input.priority === "number") node.priority = Math.max(1, Math.min(5, input.priority));
    node.tagIds = resolveLabelsToTagIds(input.labels);
    if (typeof input.edgeColor === "string") node.edgeColor = input.edgeColor;
    if (typeof input.edgeDash === "boolean") node.edgeDash = input.edgeDash;
    if (typeof input.edgeShape === "string") node.edgeShape = input.edgeShape as EdgeShape;
    if (typeof input.edgeWidth === "number") node.edgeWidth = input.edgeWidth;
    if (typeof input.fontSize === "number") node.fontSize = Math.max(9, Math.min(40, input.fontSize));
    if (typeof input.fontFamily === "string") node.fontFamily = input.fontFamily;
    if (typeof input.fillOpacity === "number") node.fillOpacity = Math.max(0, Math.min(100, input.fillOpacity));
    if (input.textAlign === "left" || input.textAlign === "right" || input.textAlign === "center") {
      node.textAlign = input.textAlign;
    }
    if (input.textFit === "wrap" || input.textFit === "shrink" || input.textFit === "auto") {
      node.textFit = input.textFit;
    }
    if (typeof input.edgeLabel === "string") node.edgeLabel = input.edgeLabel;
    if (typeof input.collapsed === "boolean") node.collapsed = input.collapsed;
    if (typeof input.textBold === "boolean") node.textBold = input.textBold;
    if (typeof input.textItalic === "boolean") node.textItalic = input.textItalic;
    if (typeof input.textUnderline === "boolean") node.textUnderline = input.textUnderline;
    if (typeof input.checked === "boolean") node.checked = input.checked;
    nodes[node.id] = node;

    if (input.children !== undefined) {
      if (!Array.isArray(input.children)) {
        errors.push(`Trường "children" tại "${path}" phải là một mảng.`);
        return node.id;
      }
      input.children.forEach((childInput: unknown, index: number) => {
        const childId = build(
          (childInput ?? {}) as NestedNodeInput,
          node.id,
          `${path} > children[${index}]`
        );
        if (childId) node.children.push(childId);
      });
    }
    return node.id;
  };

  const rootId = build(obj as NestedNodeInput, null, "root");
  if (errors.length > 0 || rootId === null) return { ok: false, errors };

  // P2.6d — giữ mapId nếu file soạn tay đã ghi sẵn (ví dụ tự mình xuất
  // ra rồi sửa tay lại), sinh mới nếu thiếu — đúng quy tắc đã thống
  // nhất, áp dụng luôn cho định dạng cây soạn tay này, không chỉ JSON
  // đầy đủ (vốn tự động đi qua migrateV7toV8, đã xử lý sẵn).
  const rawMapId = (obj as { mapId?: unknown }).mapId;
  const rawMapTitle = (obj as { mapTitle?: unknown }).mapTitle;

  const map: MindMap = {
    mapId: typeof rawMapId === "string" && rawMapId.length > 0 ? rawMapId : generateMapId(),
    mapTitle: typeof rawMapTitle === "string" ? rawMapTitle : null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rootId,
    nodes,
    relationships: [],
    summaries: [],
    boundaries: [],
    stickyNotes: [],
    showEdgeLabels: false,
    showRelationships: true,
    showSummaries: true,
    layoutType: (obj as { layoutType?: unknown }).layoutType === "logicLeft" ? "logicLeft" : "logicRight",
    tags,
    assets: {},
    organicEdges: (obj as { organicEdges?: unknown }).organicEdges === true,
    activeThemeId: null,
  };

  const validationErrors = validateMindMap(map);
  if (validationErrors.length > 0) return { ok: false, errors: validationErrors };
  return { ok: true, map };
}

/** Xuất cây lồng nhau — định dạng dễ đọc/sửa tay, KHÔNG giữ relationship
 *  và summary (xem help modal trong ui/ để biết vì sao). */
export function exportNestedJson(map: MindMap): string {
  const build = (nodeId: string): Record<string, unknown> => {
    const node = map.nodes[nodeId];
    if (!node) return {};
    const obj: Record<string, unknown> = { text: node.text };
    if (node.notes) obj.notes = node.notes;
    if (node.color) obj.color = node.color;
    if (node.fill) obj.fill = node.fill;
    if (node.fillTransparent) obj.fillTransparent = true;
    if (node.borderStyle !== "solid") obj.borderStyle = node.borderStyle;
    if (node.borderColor) obj.borderColor = node.borderColor;
    if (node.link) obj.link = node.link;
    if (node.markers.length > 0) obj.markers = node.markers;
    if (node.progress !== null) obj.progress = node.progress;
    if (node.priority !== null) obj.priority = node.priority;
    if (node.tagIds.length > 0) {
      const names = node.tagIds
        .map((id) => map.tags.find((t) => t.id === id)?.name)
        .filter((n): n is string => typeof n === "string");
      if (names.length > 0) obj.labels = names;
    }
    if (node.edgeColor) obj.edgeColor = node.edgeColor;
    if (node.fontSize !== null) obj.fontSize = node.fontSize;
    if (node.fontFamily !== null) obj.fontFamily = node.fontFamily;
    if (node.fillOpacity !== 100) obj.fillOpacity = node.fillOpacity;
    if (node.textAlign !== "center") obj.textAlign = node.textAlign;
    if (node.textFit !== "auto") obj.textFit = node.textFit;
    if (node.textBold) obj.textBold = true;
    if (node.textItalic) obj.textItalic = true;
    if (node.textUnderline) obj.textUnderline = true;
    if (node.checked !== null) obj.checked = node.checked;
    if (node.edgeLabel) obj.edgeLabel = node.edgeLabel;
    if (node.edgeDash) obj.edgeDash = true;
    if (node.edgeShape !== "curve") obj.edgeShape = node.edgeShape;
    if (node.edgeWidth !== null) obj.edgeWidth = node.edgeWidth;
    if (node.collapsed) obj.collapsed = true;
    if (node.children.length > 0) obj.children = node.children.map(build);
    return obj;
  };
  return JSON.stringify(build(map.rootId), null, 2);
}
