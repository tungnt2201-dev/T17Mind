/**
 * io/xmind.ts
 * ---------------------------------------------------------------------
 * P2.9 (nhóm Xuất định dạng khác, chèn thêm theo yêu cầu trực tiếp) —
 * đọc/xuất file `.xmind`. Cấu trúc dưới đây đối chiếu TRỰC TIẾP với 3
 * file `.xmind` THẬT người dùng gửi (không chỉ dựa vào tài liệu công
 * khai, vốn thưa thớt cho định dạng này) — xem chi tiết đối chiếu
 * trong README mục "XMind".
 *
 * `.xmind` là file ZIP chứa `content.json` (mảng các "sheet") — dùng
 * `jszip` (thư viện npm, chạy được trong trình duyệt, không cần
 * backend — đóng gói thẳng vào file build cuối cùng giống `xlsx`).
 *
 * PHẠM VI: chỉ đọc/ghi `content.json` (định dạng XMind Zen/2024+).
 * File XMind CŨ chỉ có `content.xml` (không có `content.json`) KHÔNG
 * được hỗ trợ — báo lỗi rõ ràng, gợi ý mở lại bằng XMind rồi lưu lại.
 * File có NHIỀU sheet: chỉ nhập sheet ĐẦU TIÊN, báo warning rõ ràng
 * (không âm thầm bỏ mất nội dung sheet khác).
 * ---------------------------------------------------------------------
 */
import JSZip from "jszip";
import type { MindMap, MindNode, LayoutType, Relationship } from "../core/types";
import { createEmptyMap, createNode, generateId, generateTagId, getRootIds } from "../core/tree";
import { validateMindMap } from "../core/validate";

// --- structureClass (XMind) <-> layoutType (T17Mind) ---------------------
// Đối chiếu THẬT: "org.xmind.ui.logic.right" và "org.xmind.ui.timeline.vertical"
// tìm thấy trong file mẫu; phần còn lại tra từ SDK chính thức xmind-sdk-js
// (qua model.go — cùng constant, khác ngôn ngữ implement).
const STRUCTURE_TO_LAYOUT: Record<string, LayoutType> = {
  "org.xmind.ui.logic.right": "logicRight",
  "org.xmind.ui.logic.left": "logicLeft",
  "org.xmind.ui.map": "logicBoth",
  "org.xmind.ui.map.clockwise": "logicBoth",
  "org.xmind.ui.map.anticlockwise": "logicBoth",
  "org.xmind.ui.map.unbalanced": "logicBoth",
  "org.xmind.ui.tree.right": "logicRight",
  "org.xmind.ui.tree.left": "logicLeft",
  "org.xmind.ui.org-chart.down": "orgChart",
  "org.xmind.ui.org-chart.up": "orgChart",
  // T17Mind đã bỏ hẳn layout Fishbone — file .xmind THẬT (từ phần mềm
  // XMind, không phải T17Mind) vẫn có thể mang cấu trúc xương cá này,
  // nên KHÔNG xoá 2 dòng ánh xạ — chỉ đổi đích tới "logicRight" (an
  // toàn nhất, giữ nguyên cấu trúc cây, chỉ đổi hình dáng hiển thị,
  // không mất dữ liệu nào), giống cách mọi structureClass không có
  // tương đương khác đã xử lý (xem DEFAULT_LAYOUT bên dưới).
  "org.xmind.ui.fishbone.rightHeaded": "logicRight",
  "org.xmind.ui.fishbone.leftHeaded": "logicRight",
};
/** Không có tương đương (timeline, spreadsheet...) -> layout phổ biến
 *  nhất làm mặc định an toàn — GIỮ NGUYÊN cấu trúc cây, chỉ đổi hình
 *  dáng hiển thị, không mất dữ liệu nào. */
const DEFAULT_LAYOUT: LayoutType = "logicRight";

function structureClassToLayoutType(sc: string | undefined): LayoutType {
  if (!sc) return DEFAULT_LAYOUT;
  return STRUCTURE_TO_LAYOUT[sc] ?? DEFAULT_LAYOUT;
}

const LAYOUT_TO_STRUCTURE: Record<LayoutType, string> = {
  logicRight: "org.xmind.ui.logic.right",
  logicLeft: "org.xmind.ui.logic.left",
  logicBoth: "org.xmind.ui.map",
  treeDown: "org.xmind.ui.org-chart.down",
  treeUp: "org.xmind.ui.org-chart.up",
  orgChart: "org.xmind.ui.org-chart.down",
};

// --- Màu: XMind #RRGGBBAA (8 ký tự, có kênh alpha) <-> T17Mind #RRGGBB ---
function xmindColorToHex(c: unknown): string | null {
  if (typeof c !== "string" || !c) return null;
  const hex = c.startsWith("#") ? c.slice(1) : c;
  return hex.length >= 6 ? `#${hex.slice(0, 6)}` : null;
}
function hexToXmindColor(c: string | null): string | undefined {
  if (!c) return undefined;
  const hex = c.startsWith("#") ? c.slice(1) : c;
  return `#${hex}FF`;
}

/** notes trong XMind có thể là chuỗi thô HOẶC object `{ plain: { content }
 *  }` tuỳ phiên bản — đọc cả 2 dạng, không giả định chỉ một kiểu. */
function extractNotesText(notes: unknown): string | null {
  if (!notes) return null;
  if (typeof notes === "string") return notes || null;
  if (typeof notes === "object") {
    const plain = (notes as Record<string, unknown>).plain as Record<string, unknown> | undefined;
    if (typeof plain?.content === "string") return plain.content || null;
  }
  return null;
}

interface XmindTopicRaw {
  id?: string;
  title?: string;
  structureClass?: string;
  notes?: unknown;
  labels?: string[];
  position?: { x?: number; y?: number };
  style?: { properties?: Record<string, unknown> };
  children?: { attached?: XmindTopicRaw[]; detached?: XmindTopicRaw[] };
}
interface XmindRelationshipRaw {
  id?: string;
  end1Id?: string;
  end2Id?: string;
  title?: string;
  style?: { properties?: Record<string, unknown> };
}
interface XmindSheetRaw {
  title?: string;
  rootTopic?: XmindTopicRaw;
  relationships?: XmindRelationshipRaw[];
}

export type XmindImportOutcome = { ok: true; map: MindMap; warnings: string[] } | { ok: false; errors: string[] };

export async function parseXmindFile(buffer: ArrayBuffer): Promise<XmindImportOutcome> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { ok: false, errors: ["File không giải nén được — không phải định dạng .xmind hợp lệ."] };
  }

  const contentFile = zip.file("content.json");
  if (!contentFile) {
    return {
      ok: false,
      errors: [
        "File này không có content.json — có thể là định dạng XMind cũ hơn (chỉ có " +
          "content.xml), hiện T17Mind chưa hỗ trợ đọc dạng đó. Hãy mở file bằng XMind " +
          "rồi lưu lại bằng phiên bản mới — bản lưu mới sẽ tự có thêm content.json.",
      ],
    };
  }

  let sheets: XmindSheetRaw[];
  try {
    sheets = JSON.parse(await contentFile.async("text"));
  } catch {
    return { ok: false, errors: ["content.json bên trong file .xmind bị hỏng, không đọc được."] };
  }
  if (!Array.isArray(sheets) || sheets.length === 0) {
    return { ok: false, errors: ["File .xmind này không có sheet (map) nào."] };
  }

  const warnings: string[] = [];
  if (sheets.length > 1) {
    warnings.push(
      `File có ${sheets.length} sheet — chỉ nhập sheet đầu tiên ("${sheets[0]?.title ?? "?"}"), bỏ qua các sheet còn lại.`
    );
  }

  const sheet = sheets[0] as XmindSheetRaw;
  const rootTopicRaw = sheet.rootTopic;
  if (!rootTopicRaw) {
    return { ok: false, errors: ["Sheet đầu tiên không có rootTopic (node gốc)."] };
  }

  // --- Remap ID: mọi id từ XMind -> id mới đúng quy ước T17Mind, tránh
  // phụ thuộc vào định dạng ID riêng của XMind (có thể lẫn ký tự XMind
  // dùng nội bộ mà T17Mind không kỳ vọng). ---
  const idMap = new Map<string, string>();
  const takenNodeIds = new Set<string>();
  let noIdCounter = 0;
  function newNodeId(xmindId: string | undefined): string {
    const key = xmindId ?? `__no_id_${noIdCounter++}`;
    let mapped = idMap.get(key);
    if (!mapped) {
      do {
        mapped = generateId("n");
      } while (takenNodeIds.has(mapped));
      takenNodeIds.add(mapped);
      idMap.set(key, mapped);
    }
    return mapped;
  }

  // --- Tag: gom "labels" trùng tên (không phân biệt hoa/thường) thành
  // MỘT Tag chung — cùng ý tưởng với cách migrate.ts từng xử lý "labels"
  // cũ của chính T17Mind (P2.7e), viết riêng vì cấu trúc nguồn khác. ---
  const tagNameToId = new Map<string, string>();
  const tags: MindMap["tags"] = [];
  const TAG_COLORS = ["#2f6fed", "#d64545", "#0e9f6e", "#9333ea", "#e8873a"];
  function tagIdForLabel(label: string): string {
    const key = label.trim().toLocaleLowerCase();
    let id = tagNameToId.get(key);
    if (!id) {
      id = generateTagId();
      tagNameToId.set(key, id);
      tags.push({ id, name: label.trim() || "Nhãn", color: TAG_COLORS[tags.length % TAG_COLORS.length] as string });
    }
    return id;
  }

  const nodes: Record<string, MindNode> = {};
  const floatingRootIds: string[] = [];

  /** Chuyển 1 Topic XMind (và toàn bộ hậu duệ `attached`) thành MindNode.
   *  `detached` CHỈ xử lý đặc biệt (thành nhánh trôi) khi gặp ở ĐÚNG
   *  root — XMind cho phép "detached" lồng ở topic bất kỳ, nhưng
   *  T17Mind chỉ có khái niệm "nhánh trôi" ở CẤP CAO NHẤT; nếu gặp ở
   *  topic không phải root (hiếm), gộp vào làm con bình thường thay vì
   *  bỏ mất — mất Ý NGHĨA "tách biệt" nhưng KHÔNG mất dữ liệu. */
  function convertTopic(raw: XmindTopicRaw, parentId: string | null): MindNode {
    const base = createNode(raw.title ?? "", parentId);
    const props = raw.style?.properties ?? {};
    const node: MindNode = {
      ...base,
      id: newNodeId(raw.id),
      notes: extractNotesText(raw.notes),
      fill: xmindColorToHex(props["svg:fill"]),
      borderStyle: props["border-line-pattern"] === "dash" || props["border-line-pattern"] === "handdrawn-dash" ? "dashed" : "solid",
      borderColor: xmindColorToHex(props["border-line-color"]),
      tagIds: (raw.labels ?? []).map(tagIdForLabel),
    };

    const attachedChildren = raw.children?.attached ?? [];
    node.children.push(...attachedChildren.map((c) => convertTopic(c, node.id).id));
    for (const childId of node.children) nodes[childId] = nodes[childId] as MindNode; // no-op giữ rõ ý — con đã tự thêm vào `nodes` trong lần đệ quy của chính nó

    nodes[node.id] = node;
    return node;
  }

  const root = convertTopic(rootTopicRaw, null);
  root.parentId = null;

  // Nhánh trôi — CHỈ detached ở cấp root mới xử lý thành gốc độc lập.
  for (const detachedRaw of rootTopicRaw.children?.detached ?? []) {
    const floatNode = convertTopic(detachedRaw, null);
    floatNode.offsetX = detachedRaw.position?.x ?? 0;
    floatNode.offsetY = detachedRaw.position?.y ?? 0;
    floatingRootIds.push(floatNode.id);
  }

  // --- Quan hệ chéo ---
  const relationships: Relationship[] = [];
  const takenRelIds = new Set<string>();
  for (const r of sheet.relationships ?? []) {
    const fromId = r.end1Id ? idMap.get(r.end1Id) : undefined;
    const toId = r.end2Id ? idMap.get(r.end2Id) : undefined;
    if (!fromId || !toId) continue; // tham chiếu không map được — bỏ qua an toàn, không tạo dữ liệu sai
    let relId: string;
    do {
      relId = generateId("r");
    } while (takenRelIds.has(relId));
    takenRelIds.add(relId);
    relationships.push({
      id: relId,
      fromId,
      toId,
      label: r.title ?? "",
      color: xmindColorToHex(r.style?.properties?.["line-color"]),
      dash: false,
      bend: null,
    });
  }

  const map: MindMap = {
    ...createEmptyMap(root.text),
    mapTitle: sheet.title ?? null,
    rootId: root.id,
    nodes,
    relationships,
    tags,
    layoutType: structureClassToLayoutType(rootTopicRaw.structureClass),
  };
  void floatingRootIds; // nhánh trôi đã nằm sẵn trong `nodes` với parentId=null — getRootIds() tự nhận ra, không cần danh sách riêng

  const errors = validateMindMap(map);
  if (errors.length > 0) {
    return { ok: false, errors: [`File nhập được nhưng dữ liệu sau khi chuyển đổi không hợp lệ: ${errors.join(", ")}`] };
  }
  return { ok: true, map, warnings };
}

// ---------------------------------------------------------------------
// XUẤT: MindMap (T17Mind) -> file .xmind
// ---------------------------------------------------------------------

function convertNodeToTopic(map: MindMap, node: MindNode): XmindTopicRaw {
  const topic: XmindTopicRaw = { id: node.id, title: node.text };
  if (node.children.length > 0) {
    topic.children = { attached: node.children.map((id) => convertNodeToTopic(map, map.nodes[id] as MindNode)) };
  }
  const properties: Record<string, unknown> = {};
  if (node.fill) properties["svg:fill"] = hexToXmindColor(node.fill);
  if (node.borderStyle === "dashed") properties["border-line-pattern"] = "dash";
  if (node.borderColor) properties["border-line-color"] = hexToXmindColor(node.borderColor);
  if (Object.keys(properties).length > 0) topic.style = { properties };
  if (node.notes) topic.notes = { plain: { content: node.notes } };
  if (node.tagIds.length > 0) {
    topic.labels = node.tagIds
      .map((id) => map.tags.find((t) => t.id === id)?.name)
      .filter((n): n is string => !!n);
  }
  return topic;
}

export async function exportXmindFile(map: MindMap): Promise<Blob> {
  const root = map.nodes[map.rootId] as MindNode;
  const rootTopic = convertNodeToTopic(map, root);
  rootTopic.structureClass = LAYOUT_TO_STRUCTURE[map.layoutType] ?? LAYOUT_TO_STRUCTURE.logicRight;

  const floatingRootIds = getRootIds(map).filter((id) => id !== map.rootId);
  if (floatingRootIds.length > 0) {
    rootTopic.children = rootTopic.children ?? {};
    rootTopic.children.detached = floatingRootIds.map((id) => {
      const node = map.nodes[id] as MindNode;
      const topic = convertNodeToTopic(map, node);
      topic.position = { x: node.offsetX, y: node.offsetY };
      return topic;
    });
  }

  const relationships: XmindRelationshipRaw[] = map.relationships.map((r) => ({
    id: r.id,
    end1Id: r.fromId,
    end2Id: r.toId,
    title: r.label,
    style: r.color
      ? { properties: { "line-color": hexToXmindColor(r.color), "shape-class": "org.xmind.relationshipShape.curved" } }
      : undefined,
  }));

  const sheet: XmindSheetRaw = {
    title: map.mapTitle || root.text || "Map 1",
    rootTopic,
    relationships,
  };

  const zip = new JSZip();
  zip.file("content.json", JSON.stringify([sheet]));
  zip.file("metadata.json", JSON.stringify({ dataStructureVersion: "2", creator: { name: "T17Mind", version: "1.0" } }));
  zip.file(
    "manifest.json",
    JSON.stringify({ "file-entries": { "content.json": {}, "metadata.json": {} } })
  );
  return zip.generateAsync({ type: "blob" });
}
