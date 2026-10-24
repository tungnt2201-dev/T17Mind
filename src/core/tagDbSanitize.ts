/**
 * core/tagDbSanitize.ts — làm sạch dữ liệu KW5 khi đọc file (migrate.ts). Dữ liệu hỏng/lạ bị bỏ
 * thay vì làm hỏng cả map: thuộc tính sai kiểu bị loại, id trùng bị loại, giá trị trỏ vào thuộc
 * tính/lựa chọn không tồn tại hoặc sai kiểu bị bỏ. Sửa tại chỗ (đối tượng đã là bản sao của migrate).
 */
import { MAX_FIELDS_PER_TAG, MAX_OPTIONS_PER_FIELD, hasOptions, normalizeFieldValue } from "./tagDb";
import type { TagField, TagFieldType } from "./types";

type Rec = Record<string, unknown>;
const TYPES: TagFieldType[] = ["text", "number", "date", "select", "status"];
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const hex = (v: unknown): string => (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : "#6c757d");

const MAX_ORDER = 5000;

export function sanitizeTagFields(tags: Rec[]): void {
  const usedFieldIds = new Set<string>();
  for (const tag of tags) {
    if (isRec(tag) && "order" in tag) {
      const seen = new Set<string>();
      const ord = (Array.isArray(tag.order) ? tag.order : []).filter((x): x is string => typeof x === "string" && x !== "" && !seen.has(x) && !!seen.add(x));
      if (ord.length > 0) tag.order = ord.slice(0, MAX_ORDER);
      else delete tag.order;
    }
    if (!isRec(tag) || !("fields" in tag)) continue;
    const out: TagField[] = [];
    if (Array.isArray(tag.fields)) {
      for (const f of tag.fields) {
        if (out.length >= MAX_FIELDS_PER_TAG) break;
        if (!isRec(f) || typeof f.id !== "string" || f.id === "" || usedFieldIds.has(f.id)) continue;
        if (typeof f.name !== "string" || !TYPES.includes(f.type as TagFieldType)) continue;
        const type = f.type as TagFieldType;
        const field: TagField = { id: f.id, name: f.name, type };
        if (f.showOnNode === true) field.showOnNode = true;
        if (hasOptions(type)) {
          const seen = new Set<string>();
          field.options = [];
          for (const o of Array.isArray(f.options) ? f.options : []) {
            if (field.options.length >= MAX_OPTIONS_PER_FIELD) break;
            if (!isRec(o) || typeof o.id !== "string" || o.id === "" || seen.has(o.id) || typeof o.label !== "string") continue;
            seen.add(o.id);
            field.options.push({ id: o.id, label: o.label, color: hex(o.color) });
          }
        }
        usedFieldIds.add(f.id);
        out.push(field);
      }
    }
    if (out.length > 0) tag.fields = out;
    else delete tag.fields;
  }
}

export function sanitizeFieldValues(nodes: Record<string, Rec>, tags: Rec[]): void {
  const fields = new Map<string, TagField>();
  for (const t of tags) for (const f of (isRec(t) && Array.isArray(t.fields) ? t.fields : []) as TagField[]) fields.set(f.id, f);
  for (const n of Object.values(nodes)) {
    if (!isRec(n) || !("fieldValues" in n)) continue;
    const out: Record<string, string> = {};
    if (isRec(n.fieldValues)) {
      for (const [k, v] of Object.entries(n.fieldValues)) {
        const f = fields.get(k);
        if (!f || typeof v !== "string") continue;
        const norm = normalizeFieldValue(f, v);
        if (norm !== null && norm !== "") out[k] = norm;
      }
    }
    if (Object.keys(out).length > 0) n.fieldValues = out;
    else delete n.fieldValues;
  }
}
