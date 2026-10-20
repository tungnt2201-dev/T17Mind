/**
 * io/xlsx.ts
 * ---------------------------------------------------------------------
 * Nhập/xuất bảng XLSX. Quy tắc định dạng (giải thích lại trong hộp
 * thoại hướng dẫn ở ui/components/HelpModal.svelte):
 *   - Sheet đầu tiên, cột ID và Text bắt buộc.
 *   - ParentID để trống ở ĐÚNG MỘT dòng — đó là node gốc.
 *   - Tên cột không phân biệt hoa/thường, chấp nhận cả tiếng Việt.
 *
 * xlsx được cài qua npm (không dùng CDN) nên được đóng gói thẳng vào
 * file build cuối cùng — ứng dụng không cần mạng để đọc/ghi Excel.
 * ---------------------------------------------------------------------
 */
import * as XLSX from "xlsx";
import type { BorderStyle, EdgeShape, MindMap, MindNode } from "../core/types";
import { CURRENT_SCHEMA_VERSION } from "../core/types";
import { createNode, getRootIds, generateMapId, generateTagId } from "../core/tree";
import type { ImportResult } from "./json";

type RawRow = Record<string, unknown>;

const HEADER_ALIASES: Record<string, string[]> = {
  id: ["id", "mã", "ma", "id node", "mã node"],
  text: ["text", "nội dung", "noi dung", "tên", "ten", "tiêu đề", "tieu de", "name"],
  parentid: ["parentid", "parent id", "mã cha", "ma cha", "id cha", "cha", "parent"],
  notes: ["notes", "note", "ghi chú", "ghi chu"],
  color: ["color", "màu chữ", "mau chu", "text color", "textcolor"],
  fill: ["fill", "màu nền", "mau nen", "background", "bg"],
  transparent: ["transparent", "trong suốt", "trong suot"],
  link: ["link", "url", "hyperlink", "liên kết", "lien ket"],
  markers: ["markers", "biểu tượng", "bieu tuong", "icon"],
  progress: ["progress", "tiến độ", "tien do"],
  priority: ["priority", "ưu tiên", "uu tien"],
  labels: ["labels", "nhãn", "nhan"],
  borderstyle: ["borderstyle", "border style", "kiểu viền", "kieu vien"],
  fontsize: ["fontsize", "font size", "cỡ chữ", "co chu"],
  fontfamily: ["fontfamily", "font family", "font chữ", "font chu"],
  fillopacity: ["fillopacity", "fill opacity", "độ trong suốt", "do trong suot"],
  textalign: ["textalign", "text align", "căn lề", "can le"],
  edgelabel: ["edgelabel", "edge label", "nhãn đường nối", "nhan duong noi"],
  textfit: ["textfit", "text fit", "cách hiển thị chữ", "cach hien thi chu"],
  bordercolor: ["bordercolor", "border color", "màu viền", "mau vien"],
  edgecolor: ["edgecolor", "edge color", "màu đường nối", "mau duong noi"],
  edgedash: ["edgedash", "edge dash", "nét đứt", "net dut"],
  edgeshape: ["edgeshape", "edge shape", "kiểu đường nối", "kieu duong noi"],
  edgewidth: ["edgewidth", "edge width", "độ dày đường nối", "do day duong noi"],
  width: ["width", "rộng", "rong"],
  height: ["height", "cao"],
  textbold: ["textbold", "text bold", "đậm", "dam", "bold"],
  textitalic: ["textitalic", "text italic", "nghiêng", "nghieng", "italic"],
  textunderline: ["textunderline", "text underline", "gạch chân", "gach chan", "underline"],
  checked: ["checked", "hoàn thành", "hoan thanh", "done"],
};

function normalizeHeader(h: string): string | null {
  const key = h.trim().toLowerCase();
  for (const canon of Object.keys(HEADER_ALIASES)) {
    if (HEADER_ALIASES[canon]?.includes(key)) return canon;
  }
  return null;
}

function truthy(value: string): boolean {
  return /^(true|1|có|co|yes)$/i.test(value.trim());
}

/** Tách một ô Excel chứa nhiều mục cách nhau bằng dấu phẩy — dùng cho
 *  cột Markers và Labels, vì Excel không có kiểu mảng thật. */
function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

interface Record_ {
  rowNum: number;
  id: string;
  text: string;
  parentId: string;
  notes: string;
  color: string;
  fill: string;
  transparent: string;
  link: string;
  markers: string;
  progress: string;
  priority: string;
  labels: string;
  borderStyle: string;
  fontSize: string;
  fontFamily: string;
  fillOpacity: string;
  textAlign: string;
  edgeLabel: string;
  textFit: string;
  borderColor: string;
  edgeColor: string;
  edgeDash: string;
  edgeShape: string;
  edgeWidth: string;
  width: string;
  height: string;
  textBold: string;
  textItalic: string;
  textUnderline: string;
  checked: string;
}

export function parseXlsxFile(buffer: ArrayBuffer): ImportResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch (err) {
    return { ok: false, errors: [`Không đọc được file XLSX: ${String((err as Error).message)}`] };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { ok: false, errors: ["File không có sheet nào."] };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { ok: false, errors: [`Không đọc được sheet "${sheetName}".`] };

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
  return buildMapFromRows(rows, sheetName);
}

function buildMapFromRows(rows: RawRow[], sheetName: string): ImportResult {
  const errors: string[] = [];
  if (rows.length === 0) {
    return { ok: false, errors: [`Sheet "${sheetName}" không có dữ liệu.`] };
  }

  const sample = rows[0] as RawRow;
  const headerMap: Record<string, string> = {};
  for (const h of Object.keys(sample)) {
    const canon = normalizeHeader(h);
    if (canon) headerMap[canon] = h;
  }
  if (!headerMap.id) errors.push('Thiếu cột "ID" (hoặc "Mã").');
  if (!headerMap.text) errors.push('Thiếu cột "Text" (hoặc "Nội dung").');
  if (errors.length > 0) return { ok: false, errors };

  const get = (row: RawRow, key: string): string => {
    const header = headerMap[key];
    if (!header) return "";
    const value = row[header];
    return value === undefined || value === null ? "" : String(value).trim();
  };

  const records: Record_[] = rows.map((row, idx) => ({
    rowNum: idx + 2,
    id: get(row, "id"),
    text: get(row, "text"),
    parentId: get(row, "parentid"),
    notes: get(row, "notes"),
    color: get(row, "color"),
    fill: get(row, "fill"),
    transparent: get(row, "transparent"),
    link: get(row, "link"),
    markers: get(row, "markers"),
    progress: get(row, "progress"),
    priority: get(row, "priority"),
    labels: get(row, "labels"),
    borderStyle: get(row, "borderstyle"),
    fontSize: get(row, "fontsize"),
    fontFamily: get(row, "fontfamily"),
    fillOpacity: get(row, "fillopacity"),
    textAlign: get(row, "textalign"),
    edgeLabel: get(row, "edgelabel"),
    textFit: get(row, "textfit"),
    borderColor: get(row, "bordercolor"),
    edgeColor: get(row, "edgecolor"),
    edgeDash: get(row, "edgedash"),
    edgeShape: get(row, "edgeshape"),
    edgeWidth: get(row, "edgewidth"),
    width: get(row, "width"),
    height: get(row, "height"),
    textBold: get(row, "textbold"),
    textItalic: get(row, "textitalic"),
    textUnderline: get(row, "textunderline"),
    checked: get(row, "checked"),
  }));

  const seen = new Map<string, number>();
  for (const rec of records) {
    if (!rec.id) {
      errors.push(`Dòng ${rec.rowNum}: thiếu ID.`);
      continue;
    }
    if (!rec.text) {
      errors.push(`Dòng ${rec.rowNum}: thiếu Text.`);
      continue;
    }
    if (seen.has(rec.id)) {
      errors.push(`ID "${rec.id}" bị trùng (dòng ${seen.get(rec.id)} và dòng ${rec.rowNum}).`);
    } else {
      seen.set(rec.id, rec.rowNum);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const roots = records.filter((r) => !r.parentId);
  if (roots.length === 0) {
    errors.push('Không có dòng gốc — cần ít nhất 1 dòng để trống cột "ParentID".');
  }
  const idSet = new Set(records.map((r) => r.id));
  for (const rec of records) {
    if (rec.parentId && !idSet.has(rec.parentId)) {
      errors.push(`Dòng ${rec.rowNum}: ParentID "${rec.parentId}" không khớp với ID nào.`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const nodes: MindMap["nodes"] = {};
  const idToNodeId: Record<string, string> = {};
  const labelToTagId = new Map<string, string>();
  const tags: MindMap["tags"] = [];
  const TAG_COLORS = ["#2f6fed", "#d64545", "#0e9f6e", "#e8873a", "#9333ea", "#0891b2", "#c026d3", "#65a30d"];
  function resolveLabelsToTagIds(labelStr: string): string[] {
    if (!labelStr) return [];
    const tagIds: string[] = [];
    for (const l of splitList(labelStr)) {
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

  for (const rec of records) {
    const node = createNode(rec.text, null);
    if (rec.notes) node.notes = rec.notes;
    if (rec.color) node.color = rec.color;
    if (rec.fill) node.fill = rec.fill;
    if (rec.transparent) node.fillTransparent = truthy(rec.transparent);
    if (rec.link) node.link = rec.link;
    if (rec.markers) node.markers = splitList(rec.markers);
    if (rec.progress) node.progress = clamp(Number(rec.progress), 0, 100);
    if (rec.priority) node.priority = clamp(Number(rec.priority), 1, 5);
    node.tagIds = resolveLabelsToTagIds(rec.labels);
    if (rec.borderStyle) node.borderStyle = rec.borderStyle as BorderStyle;
    if (rec.fontSize) node.fontSize = clamp(Number(rec.fontSize), 9, 40);
    if (rec.fontFamily) node.fontFamily = rec.fontFamily;
    if (rec.fillOpacity) node.fillOpacity = clamp(Number(rec.fillOpacity), 0, 100);
    if (rec.textAlign === "left" || rec.textAlign === "right" || rec.textAlign === "center") {
      node.textAlign = rec.textAlign;
    }
    if (rec.textFit === "wrap" || rec.textFit === "shrink" || rec.textFit === "auto") {
      node.textFit = rec.textFit;
    }
    if (rec.textBold) node.textBold = truthy(rec.textBold);
    if (rec.textItalic) node.textItalic = truthy(rec.textItalic);
    if (rec.textUnderline) node.textUnderline = truthy(rec.textUnderline);
    if (rec.checked) node.checked = truthy(rec.checked);
    if (rec.edgeLabel) node.edgeLabel = rec.edgeLabel;
    if (rec.borderColor) node.borderColor = rec.borderColor;
    if (rec.edgeColor) node.edgeColor = rec.edgeColor;
    if (rec.edgeDash) node.edgeDash = truthy(rec.edgeDash);
    if (rec.edgeShape) node.edgeShape = rec.edgeShape as EdgeShape;
    if (rec.edgeWidth) node.edgeWidth = Number(rec.edgeWidth) || null;
    if (rec.width) node.manualWidth = Math.max(50, Number(rec.width) || 50);
    if (rec.height) node.manualHeight = Math.max(28, Number(rec.height) || 28);
    nodes[node.id] = node;
    idToNodeId[rec.id] = node.id;
  }

  // P2.5: dòng gốc ĐẦU TIÊN (theo thứ tự trong file) làm gốc chính
  // (map.rootId) — mọi dòng gốc còn lại trở thành NHÁNH TRÔI độc lập,
  // dịch offsetY tăng dần để không chồng lên nhau khi vừa nhập xong.
  const rootRecord = roots[0] as Record_;
  const rootId = idToNodeId[rootRecord.id] as string;
  for (let i = 1; i < roots.length; i++) {
    const extraRootId = idToNodeId[(roots[i] as Record_).id] as string;
    (nodes[extraRootId] as MindNode).offsetY = 260 * i;
  }
  for (const rec of records) {
    if (!rec.parentId) continue;
    const nodeId = idToNodeId[rec.id] as string;
    const node = nodes[nodeId] as MindNode;
    const parentNodeId = idToNodeId[rec.parentId] as string;
    node.parentId = parentNodeId;
    (nodes[parentNodeId] as MindNode).children.push(nodeId);
  }

  // Duyệt từ MỌI dòng gốc (không chỉ rootId chính) — mỗi dòng gốc là
  // điểm bắt đầu của một cây độc lập hợp lệ.
  const visited = new Set<string>();
  const stack: string[] = roots.map((r) => idToNodeId[r.id] as string);
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const node = nodes[cur];
    if (node) stack.push(...node.children);
  }
  if (visited.size !== Object.keys(nodes).length) {
    const orphanTexts = Object.keys(nodes)
      .filter((id) => !visited.has(id))
      .map((id) => `"${(nodes[id] as MindNode).text}"`)
      .join(", ");
    return {
      ok: false,
      errors: [`Phát hiện vòng lặp hoặc node không kết nối được tới gốc nào: ${orphanTexts}.`],
    };
  }

  return {
    ok: true,
    map: {
      // P2.6d — XLSX là bảng phẳng, không có chỗ nào lưu mapId được —
      // luôn sinh mới, khác với JSON (có thể giữ mapId cũ nếu có).
      mapId: generateMapId(),
      mapTitle: null,
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
      layoutType: "logicRight",
      tags,
      assets: {},
    cards: {},
      organicEdges: false,
      activeThemeId: null,
    },
  };
}

export function exportXlsx(map: MindMap, filename: string): void {
  XLSX.writeFile(buildXlsxWorkbook(map), filename);
}

/** Như exportXlsx nhưng trả về nội dung file (để ghi qua hộp thoại Lưu
 *  của bản exe / File System Access) thay vì để thư viện tự tải xuống. */
export function exportXlsxBlob(map: MindMap): Blob {
  const data = XLSX.write(buildXlsxWorkbook(map), { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function buildXlsxWorkbook(map: MindMap): XLSX.WorkBook {
  const rows: RawRow[] = [];
  const walk = (nodeId: string): void => {
    const node = map.nodes[nodeId];
    if (!node) return;
    rows.push({
      ID: node.id,
      Text: node.text,
      ParentID: node.parentId || "",
      Notes: node.notes || "",
      Color: node.color || "",
      Fill: node.fill || "",
      Transparent: node.fillTransparent ? "true" : "",
      Link: node.link || "",
      Markers: node.markers.join(", "),
      Progress: node.progress ?? "",
      Priority: node.priority ?? "",
      Labels: node.tagIds
        .map((id) => map.tags.find((t) => t.id === id)?.name)
        .filter((n): n is string => typeof n === "string")
        .join(", "),
      BorderStyle: node.borderStyle,
      FontSize: node.fontSize ?? "",
      FontFamily: node.fontFamily ?? "",
      FillOpacity: node.fillOpacity !== 100 ? node.fillOpacity : "",
      TextAlign: node.textAlign !== "center" ? node.textAlign : "",
      TextFit: node.textFit !== "auto" ? node.textFit : "",
      TextBold: node.textBold ? "true" : "",
      TextItalic: node.textItalic ? "true" : "",
      TextUnderline: node.textUnderline ? "true" : "",
      Checked: node.checked === null ? "" : node.checked ? "true" : "false",
      EdgeLabel: node.edgeLabel || "",
      BorderColor: node.borderColor || "",
      EdgeColor: node.edgeColor || "",
      EdgeDash: node.edgeDash ? "true" : "",
      EdgeShape: node.edgeShape,
      EdgeWidth: node.edgeWidth ?? "",
      Width: Math.round(node.width),
      Height: Math.round(node.height),
    });
    for (const childId of node.children) walk(childId);
  };
  for (const rootId of getRootIds(map)) walk(rootId);

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mindmap");
  return workbook;
}
