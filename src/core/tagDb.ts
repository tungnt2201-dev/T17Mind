/**
 * core/tagDb.ts
 * ---------------------------------------------------------------------
 * KW5 — "Cơ sở dữ liệu Tag": mỗi Tag có thể định nghĩa THUỘC TÍNH (chữ,
 * số, ngày, chọn, trạng thái); mỗi node mang Tag đó là một DÒNG, giá trị
 * thuộc tính nằm ở `node.fieldValues`. File này là phần THUẦN: chuẩn hoá
 * giá trị, lấy dòng, lọc, sắp xếp, nhóm (cho Bảng và Kanban), gộp số liệu
 * cho biểu đồ, và dựng lưới chữ để xuất CSV/Excel. Mọi thay đổi dữ liệu
 * đi qua Command (core/tagDbCommands.ts).
 * ---------------------------------------------------------------------
 */
import type { MindMap, TagDef, TagField, TagFieldOption, TagFieldType } from "./types";
import type { ChartData } from "./chartData";
import { formatNumber, parseNumber } from "./numberParse";

export const FIELD_TYPE_LABEL: Record<TagFieldType, string> = {
  text: "Chữ",
  number: "Số",
  date: "Ngày",
  select: "Chọn một",
  status: "Trạng thái",
};

export const OPTION_COLORS = ["#6c757d", "#2f6fed", "#2b9348", "#e8590c", "#9c36b5", "#e8b923", "#0ca5b0", "#d6336c"] as const;

/** Ba lựa chọn mặc định của thuộc tính "Trạng thái". */
export const DEFAULT_STATUS_OPTIONS: ReadonlyArray<{ label: string; color: string }> = [
  { label: "Chưa làm", color: "#6c757d" },
  { label: "Đang làm", color: "#2f6fed" },
  { label: "Xong", color: "#2b9348" },
];

export const NAME_KEY = "__name"; // khoá đặc biệt: cột "Tên node"
export const MAX_FIELDS_PER_TAG = 20;
export const MAX_OPTIONS_PER_FIELD = 30;

export function hasOptions(type: TagFieldType): boolean {
  return type === "select" || type === "status";
}

export const isoDate = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/**
 * Chuẩn hoá một giá trị nhập vào theo kiểu thuộc tính. Trả về chuỗi chuẩn ("" = bỏ trống)
 * hoặc null nếu giá trị KHÔNG hợp lệ (số sai, ngày sai, option không tồn tại).
 */
export function normalizeFieldValue(field: TagField, raw: string): string | null {
  const v = raw.trim();
  if (v === "") return "";
  switch (field.type) {
    case "text":
      return raw;
    case "number": {
      const n = parseNumber(v);
      return n === null ? null : String(n);
    }
    case "date":
      return isoDate(v) ? v : null;
    case "select":
    case "status":
      return (field.options ?? []).some((o) => o.id === v) ? v : null;
  }
}

export function tagFieldsOf(tag: TagDef | undefined): TagField[] {
  return tag?.fields ?? [];
}

/** Tìm thuộc tính theo id trong mọi Tag. */
export function findField(map: Pick<MindMap, "tags">, fieldId: string): { tag: TagDef; field: TagField } | null {
  for (const tag of map.tags) {
    const field = tag.fields?.find((f) => f.id === fieldId);
    if (field) return { tag, field };
  }
  return null;
}

/** Các thuộc tính áp dụng cho một node (theo các Tag node đang mang, giữ thứ tự Tag). */
export function fieldsForNode(map: Pick<MindMap, "tags">, tagIds: readonly string[]): { tag: TagDef; field: TagField }[] {
  const out: { tag: TagDef; field: TagField }[] = [];
  for (const id of tagIds) {
    const tag = map.tags.find((t) => t.id === id);
    for (const field of tagFieldsOf(tag)) if (tag) out.push({ tag, field });
  }
  return out;
}

export function optionOf(field: TagField, id: string): TagFieldOption | undefined {
  return field.options?.find((o) => o.id === id);
}

/** Chữ hiển thị của một giá trị (option → nhãn, số → định dạng Việt, ngày → dd/mm/yyyy). */
export function displayValue(field: TagField, value: string | undefined): string {
  if (value === undefined || value === "") return "";
  switch (field.type) {
    case "select":
    case "status":
      return optionOf(field, value)?.label ?? "";
    case "number": {
      const n = parseNumber(value);
      return n === null ? value : formatNumber(n, 6);
    }
    case "date":
      return isoDate(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value;
    default:
      return value;
  }
}

// ------------------------------------------------------------ Dòng

export interface DbRow {
  nodeId: string;
  name: string;
  values: Record<string, string>;
}

/** Mọi node mang `tagId`, theo thứ tự duyệt cây (cha trước con, theo thứ tự con). */
export function rowsOfTag(map: MindMap, tagId: string): DbRow[] {
  const rows: DbRow[] = [];
  const seen = new Set<string>();
  const visit = (id: string): void => {
    const n = map.nodes[id];
    if (!n || seen.has(id)) return;
    seen.add(id);
    if (n.tagIds.includes(tagId)) rows.push({ nodeId: id, name: n.text, values: n.fieldValues ?? {} });
    for (const c of n.children) visit(c);
  };
  for (const n of Object.values(map.nodes)) if (n.parentId === null) visit(n.id);
  return rows;
}

// ------------------------------------------------------------ Lọc

export type FilterOp = "contains" | "eq" | "neq" | "gt" | "lt" | "empty" | "notEmpty";
export interface Filter {
  /** id thuộc tính hoặc NAME_KEY. */
  key: string;
  op: FilterOp;
  value: string;
}

export const FILTER_OP_LABEL: Record<FilterOp, string> = {
  contains: "chứa",
  eq: "bằng",
  neq: "khác",
  gt: "lớn hơn",
  lt: "nhỏ hơn",
  empty: "để trống",
  notEmpty: "có giá trị",
};

/** Toán tử hợp lệ theo kiểu cột. */
export function opsFor(type: TagFieldType | "name"): FilterOp[] {
  switch (type) {
    case "name":
    case "text":
      return ["contains", "eq", "neq", "empty", "notEmpty"];
    case "number":
    case "date":
      return ["eq", "neq", "gt", "lt", "empty", "notEmpty"];
    default:
      return ["eq", "neq", "empty", "notEmpty"];
  }
}

const cellOf = (row: DbRow, key: string): string => (key === NAME_KEY ? row.name : (row.values[key] ?? ""));

export function matchesFilter(row: DbRow, f: Filter, fields: readonly TagField[]): boolean {
  const field = fields.find((x) => x.id === f.key);
  const raw = cellOf(row, f.key);
  if (f.op === "empty") return raw.trim() === "";
  if (f.op === "notEmpty") return raw.trim() !== "";
  const type = f.key === NAME_KEY ? "name" : field?.type;
  if (type === "number") {
    const a = parseNumber(raw);
    const b = parseNumber(f.value);
    if (b === null) return true; // điều kiện chưa nhập xong: không lọc
    if (a === null) return f.op === "neq";
    return f.op === "eq" ? a === b : f.op === "neq" ? a !== b : f.op === "gt" ? a > b : a < b;
  }
  if (type === "date") {
    if (!isoDate(f.value)) return true;
    if (raw === "") return f.op === "neq";
    return f.op === "eq" ? raw === f.value : f.op === "neq" ? raw !== f.value : f.op === "gt" ? raw > f.value : raw < f.value;
  }
  if (f.value === "" && (f.op === "contains" || f.op === "eq")) return true;
  const a = raw.toLowerCase();
  const b = f.value.toLowerCase();
  switch (f.op) {
    case "contains":
      return a.includes(b);
    case "eq":
      return a === b;
    case "neq":
      return a !== b;
    default:
      return true;
  }
}

/** Mọi bộ lọc đều phải khớp (AND). */
export function applyFilters(rows: DbRow[], filters: readonly Filter[], fields: readonly TagField[]): DbRow[] {
  return filters.length === 0 ? rows : rows.filter((r) => filters.every((f) => matchesFilter(r, f, fields)));
}

// ------------------------------------------------------------ Sắp xếp

export interface Sort {
  key: string;
  dir: "asc" | "desc";
}

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

/** Sắp xếp ổn định; ô trống luôn xuống cuối bất kể chiều. Lựa chọn sắp theo thứ tự option. */
export function sortRows(rows: DbRow[], sort: Sort | null, fields: readonly TagField[]): DbRow[] {
  if (!sort) return rows;
  const field = fields.find((f) => f.id === sort.key);
  const sign = sort.dir === "asc" ? 1 : -1;
  const keyed = rows.map((r, i) => ({ r, i, v: cellOf(r, sort.key) }));
  const cmp = (a: string, b: string): number => {
    if (field?.type === "number") return (parseNumber(a) ?? 0) - (parseNumber(b) ?? 0);
    if (field?.type === "date") return a < b ? -1 : a > b ? 1 : 0;
    if (field && hasOptions(field.type)) {
      const ia = field.options?.findIndex((o) => o.id === a) ?? -1;
      const ib = field.options?.findIndex((o) => o.id === b) ?? -1;
      return ia - ib;
    }
    return collator.compare(a, b);
  };
  keyed.sort((x, y) => {
    const ex = x.v.trim() === "";
    const ey = y.v.trim() === "";
    if (ex !== ey) return ex ? 1 : -1;
    if (ex && ey) return x.i - y.i;
    return sign * cmp(x.v, y.v) || x.i - y.i;
  });
  return keyed.map((k) => k.r);
}

// ------------------------------------------------------------ Nhóm / Kanban

export interface DbGroup {
  /** id option ("" = chưa đặt / lựa chọn không còn). */
  key: string;
  label: string;
  color: string;
  rows: DbRow[];
}

/** Nhóm dòng theo một thuộc tính chọn/trạng thái: mỗi option một nhóm (kể cả rỗng, để Kanban có đủ cột),
 *  thêm nhóm "Chưa đặt" ở CUỐI khi `withUnset` hoặc khi có dòng chưa đặt. */
export function groupByField(rows: DbRow[], field: TagField, withUnset = true): DbGroup[] {
  const opts = field.options ?? [];
  const groups: DbGroup[] = opts.map((o) => ({ key: o.id, label: o.label, color: o.color, rows: [] }));
  const unset: DbGroup = { key: "", label: "Chưa đặt", color: "#9aa3ad", rows: [] };
  for (const r of rows) {
    const v = r.values[field.id] ?? "";
    const g = groups.find((x) => x.key === v);
    (g ?? unset).rows.push(r);
  }
  if (withUnset || unset.rows.length > 0) groups.push(unset);
  return groups;
}

/** Nhóm theo MỘT cột bất kỳ (chữ/số/ngày: theo giá trị hiển thị) — dùng cho xem Bảng có nhóm. */
export function groupByAny(rows: DbRow[], field: TagField): DbGroup[] {
  if (hasOptions(field.type)) return groupByField(rows, field, false).filter((g) => g.rows.length > 0);
  const map = new Map<string, DbGroup>();
  for (const r of rows) {
    const v = r.values[field.id] ?? "";
    const label = displayValue(field, v) || "Chưa đặt";
    const g = map.get(v) ?? { key: v, label, color: "#9aa3ad", rows: [] };
    g.rows.push(r);
    map.set(v, g);
  }
  return [...map.values()].sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : collator.compare(a.label, b.label)));
}

// ------------------------------------------------------------ Biểu đồ

export type Measure = { kind: "count" } | { kind: "sum" | "avg"; fieldId: string };

/** Gộp số liệu theo nhóm của một thuộc tính chọn/trạng thái → ChartData (dùng với render/chartModel). */
export function aggregateForChart(rows: DbRow[], groupField: TagField, measure: Measure, fields: readonly TagField[]): ChartData {
  const groups = groupByField(rows, groupField, false).filter((g) => g.rows.length > 0);
  const mf = measure.kind === "count" ? null : fields.find((f) => f.id === measure.fieldId);
  const values = groups.map((g) => {
    if (measure.kind === "count" || !mf) return g.rows.length;
    const nums = g.rows.map((r) => parseNumber(r.values[mf.id] ?? "")).filter((n): n is number => n !== null);
    if (nums.length === 0) return measure.kind === "sum" ? 0 : null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return measure.kind === "sum" ? sum : sum / nums.length;
  });
  const name = measure.kind === "count" ? "Số dòng" : `${measure.kind === "sum" ? "Tổng" : "Trung bình"} ${mf?.name ?? ""}`.trim();
  return { labels: groups.map((g) => g.label), series: [{ name, column: 1, values }] };
}

// ------------------------------------------------------------ Xuất

/** Lưới chữ (hàng đầu là tiêu đề) cho CSV/Excel: giá trị hiển thị — nhãn option, số/ngày chuẩn Việt. */
export function rowsToGrid(rows: DbRow[], fields: readonly TagField[]): string[][] {
  const head = ["Tên node", ...fields.map((f) => f.name)];
  return [head, ...rows.map((r) => [r.name, ...fields.map((f) => displayValue(f, r.values[f.id]))])];
}

/** Như rowsToGrid nhưng cột Số xuất dạng SỐ THẬT (để Excel tính/sắp xếp được); ô trống là "". */
export function rowsToTypedGrid(rows: DbRow[], fields: readonly TagField[]): (string | number)[][] {
  const head = ["Tên node", ...fields.map((f) => f.name)];
  return [
    head,
    ...rows.map((r) => [
      r.name,
      ...fields.map((f) => {
        const v = r.values[f.id];
        if (f.type === "number" && v !== undefined && v !== "") {
          const n = parseNumber(v);
          if (n !== null) return n;
        }
        return displayValue(f, v);
      }),
    ]),
  ];
}

// ------------------------------------------------------------ Thẻ giá trị trên node

export const MAX_NODE_CHIPS = 4;

export interface NodeChip {
  text: string;
  /** Màu lựa chọn (Chọn một / Trạng thái) hoặc null cho giá trị thường (chữ/số/ngày). */
  color: string | null;
}

/** Thẻ giá trị hiện trên node: các thuộc tính bật `showOnNode` của các Tag node đang mang, chỉ những ô có giá trị. */
export function nodeFieldChips(map: Pick<MindMap, "tags">, node: { tagIds: readonly string[]; fieldValues?: Record<string, string> }): NodeChip[] {
  if (!node.fieldValues) return [];
  const out: NodeChip[] = [];
  for (const { field } of fieldsForNode(map, node.tagIds)) {
    if (!field.showOnNode) continue;
    const raw = node.fieldValues[field.id];
    const shown = displayValue(field, raw);
    if (shown === "") continue;
    if (hasOptions(field.type)) out.push({ text: shown, color: optionOf(field, raw!)?.color ?? null });
    else out.push({ text: `${field.name}: ${shown}`, color: null });
    if (out.length >= MAX_NODE_CHIPS) break;
  }
  return out;
}

// ------------------------------------------------------------ Thứ tự thẻ (Kanban)

/** Xếp dòng theo thứ tự thủ công `order`; dòng không có trong `order` ở sau, giữ thứ tự cũ (thứ tự cây). Ổn định. */
export function orderRows(rows: DbRow[], order: readonly string[] | undefined): DbRow[] {
  if (!order || order.length === 0) return rows;
  const idx = new Map(order.map((id, i) => [id, i]));
  return rows
    .map((r, i) => ({ r, i, k: idx.get(r.nodeId) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => (a.k === b.k ? a.i - b.i : a.k - b.k))
    .map((x) => x.r);
}

/**
 * Thứ tự mới sau khi đặt `id` vào vị trí `anchor` (trước/sau một dòng khác; null = cuối cùng). `allIds` là mọi dòng của Tag
 * theo thứ tự cây (để dòng chưa từng được xếp vẫn có vị trí xác định). Trả về danh sách đầy đủ.
 */
export function moveInOrder(
  order: readonly string[] | undefined,
  allIds: readonly string[],
  id: string,
  anchor: { before: string } | { after: string } | null
): string[] {
  const rows = orderRows(allIds.map((nodeId) => ({ nodeId, name: "", values: {} })), order).map((r) => r.nodeId);
  const rest = rows.filter((x) => x !== id);
  let at = rest.length;
  if (anchor) {
    const target = "before" in anchor ? anchor.before : anchor.after;
    const ti = rest.indexOf(target);
    if (ti >= 0) at = "before" in anchor ? ti : ti + 1;
  }
  rest.splice(at, 0, id);
  return rest;
}
