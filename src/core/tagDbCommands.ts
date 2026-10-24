/**
 * core/tagDbCommands.ts
 * ---------------------------------------------------------------------
 * KW5 — Command cho "Cơ sở dữ liệu Tag": thêm/sửa/xoá THUỘC TÍNH của Tag
 * và đặt GIÁ TRỊ thuộc tính trên node. Kéo thẻ trên Kanban và sửa hàng
 * loạt trong Bảng đều là MỘT SetFieldValueCommand (một bước hoàn tác).
 * ---------------------------------------------------------------------
 */
import type { Command } from "./commands";
import type { MindMap, TagDef, TagField, TagFieldOption, TagFieldType } from "./types";
import { generateFieldId, generateOptionId } from "./tree";
import {
  DEFAULT_STATUS_OPTIONS,
  MAX_FIELDS_PER_TAG,
  MAX_OPTIONS_PER_FIELD,
  OPTION_COLORS,
  findField,
  hasOptions,
  normalizeFieldValue,
} from "./tagDb";

function requireTag(map: MindMap, tagId: string): TagDef {
  const t = map.tags.find((x) => x.id === tagId);
  if (!t) throw new Error(`Tag không tồn tại: ${tagId}`);
  return t;
}

const cloneOptions = (o: TagFieldOption[] | undefined): TagFieldOption[] => (o ?? []).map((x) => ({ ...x }));

export function makeOptions(labels: readonly string[]): TagFieldOption[] {
  return labels.slice(0, MAX_OPTIONS_PER_FIELD).map((label, i) => ({ id: generateOptionId(), label, color: OPTION_COLORS[i % OPTION_COLORS.length]! }));
}

/** Thêm thuộc tính vào Tag. "Trạng thái" tự có 3 lựa chọn; "Chọn một" bắt đầu rỗng (thêm sau). */
export class AddTagFieldCommand implements Command {
  readonly label = "Thêm thuộc tính";
  readonly newFieldId = generateFieldId();
  private readonly options: TagFieldOption[] | undefined;
  constructor(private readonly tagId: string, private readonly name: string, private readonly type: TagFieldType, options?: TagFieldOption[]) {
    this.options = hasOptions(type)
      ? options ?? (type === "status" ? DEFAULT_STATUS_OPTIONS.map((o) => ({ id: generateOptionId(), label: o.label, color: o.color })) : [])
      : undefined;
  }
  apply(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    if ((tag.fields?.length ?? 0) >= MAX_FIELDS_PER_TAG) throw new Error(`Mỗi Tag tối đa ${MAX_FIELDS_PER_TAG} thuộc tính.`);
    const field: TagField = { id: this.newFieldId, name: this.name, type: this.type, ...(this.options ? { options: cloneOptions(this.options) } : {}) };
    tag.fields = [...(tag.fields ?? []), field];
  }
  revert(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    tag.fields = (tag.fields ?? []).filter((f) => f.id !== this.newFieldId);
    if (tag.fields.length === 0) delete tag.fields;
  }
}

export interface TagFieldPatch {
  name?: string;
  /** Thay toàn bộ danh sách lựa chọn (chỉ select/status). Giá trị trỏ tới lựa chọn đã xoá được xem là "chưa đặt". */
  options?: TagFieldOption[];
  /** Bật/tắt hiện giá trị trên node ở sơ đồ. */
  showOnNode?: boolean;
}

export class UpdateTagFieldCommand implements Command {
  readonly label = "Sửa thuộc tính";
  private old: TagField | null = null;
  constructor(private readonly tagId: string, private readonly fieldId: string, private readonly patch: TagFieldPatch) {}
  apply(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    const i = (tag.fields ?? []).findIndex((f) => f.id === this.fieldId);
    if (i < 0) throw new Error(`Thuộc tính không tồn tại: ${this.fieldId}`);
    const cur = tag.fields![i]!;
    this.old = { ...cur, ...(cur.options ? { options: cloneOptions(cur.options) } : {}) };
    const next: TagField = { ...cur };
    if (this.patch.name !== undefined) next.name = this.patch.name;
    if (this.patch.showOnNode !== undefined) {
      if (this.patch.showOnNode) next.showOnNode = true;
      else delete next.showOnNode;
    }
    if (this.patch.options !== undefined && hasOptions(cur.type)) next.options = cloneOptions(this.patch.options).slice(0, MAX_OPTIONS_PER_FIELD);
    tag.fields = tag.fields!.map((f, j) => (j === i ? next : f));
  }
  revert(map: MindMap): void {
    if (!this.old) return;
    const tag = requireTag(map, this.tagId);
    tag.fields = (tag.fields ?? []).map((f) => (f.id === this.fieldId ? this.old! : f));
  }
}

/** Xoá thuộc tính và mọi giá trị của nó trên node (nhớ lại để hoàn tác đúng từng node). */
export class RemoveTagFieldCommand implements Command {
  readonly label = "Xoá thuộc tính";
  private removed: TagField | null = null;
  private index = -1;
  private values: [string, string][] = [];
  constructor(private readonly tagId: string, private readonly fieldId: string) {}
  apply(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    const i = (tag.fields ?? []).findIndex((f) => f.id === this.fieldId);
    if (i < 0) return;
    this.removed = tag.fields![i]!;
    this.index = i;
    tag.fields = tag.fields!.filter((_, j) => j !== i);
    if (tag.fields.length === 0) delete tag.fields;
    this.values = [];
    for (const n of Object.values(map.nodes)) {
      const v = n.fieldValues?.[this.fieldId];
      if (v === undefined) continue;
      this.values.push([n.id, v]);
      const rest = { ...n.fieldValues };
      delete rest[this.fieldId];
      if (Object.keys(rest).length === 0) delete n.fieldValues;
      else n.fieldValues = rest;
    }
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const tag = requireTag(map, this.tagId);
    const fields = [...(tag.fields ?? [])];
    fields.splice(this.index, 0, this.removed);
    tag.fields = fields;
    for (const [nodeId, v] of this.values) {
      const n = map.nodes[nodeId];
      if (n) n.fieldValues = { ...(n.fieldValues ?? {}), [this.fieldId]: v };
    }
  }
}

/**
 * Đặt giá trị thuộc tính cho MỘT hay NHIỀU node trong một bước hoàn tác (sửa hàng loạt, kéo thẻ Kanban).
 * `value` đã được chuẩn hoá bởi nơi gọi hoặc để Command tự chuẩn hoá; "" = xoá giá trị. Giá trị không hợp lệ → lỗi.
 */
export class SetFieldValueCommand implements Command {
  readonly label = "Đặt giá trị thuộc tính";
  private before = new Map<string, string | undefined>();
  private applied = "";
  constructor(private readonly nodeIds: readonly string[], private readonly fieldId: string, private readonly value: string) {}
  apply(map: MindMap): void {
    const found = findField(map, this.fieldId);
    if (!found) throw new Error(`Thuộc tính không tồn tại: ${this.fieldId}`);
    const norm = normalizeFieldValue(found.field, this.value);
    if (norm === null) throw new Error(`Giá trị không hợp lệ cho "${found.field.name}": ${this.value}`);
    this.applied = norm;
    this.before.clear();
    for (const id of this.nodeIds) {
      const n = map.nodes[id];
      if (!n) continue;
      this.before.set(id, n.fieldValues?.[this.fieldId]);
      const next = { ...(n.fieldValues ?? {}) };
      if (norm === "") delete next[this.fieldId];
      else next[this.fieldId] = norm;
      if (Object.keys(next).length === 0) delete n.fieldValues;
      else n.fieldValues = next;
    }
  }
  revert(map: MindMap): void {
    for (const [id, old] of this.before) {
      const n = map.nodes[id];
      if (!n) continue;
      const next = { ...(n.fieldValues ?? {}) };
      if (old === undefined) delete next[this.fieldId];
      else next[this.fieldId] = old;
      if (Object.keys(next).length === 0) delete n.fieldValues;
      else n.fieldValues = next;
    }
  }
  /** Giá trị chuẩn hoá đã ghi ở lần apply gần nhất (để kiểm thử). */
  get appliedValue(): string {
    return this.applied;
  }
}

/** Đặt thứ tự thủ công của các dòng trong một Tag (kéo thẻ Kanban đổi vị trí). */
export class SetTagOrderCommand implements Command {
  readonly label = "Đổi thứ tự thẻ";
  private old: string[] | undefined;
  private hadOrder = false;
  constructor(private readonly tagId: string, private readonly order: readonly string[]) {}
  apply(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    this.hadOrder = tag.order !== undefined;
    this.old = tag.order ? [...tag.order] : undefined;
    tag.order = [...this.order];
  }
  revert(map: MindMap): void {
    const tag = requireTag(map, this.tagId);
    if (this.hadOrder) tag.order = this.old ? [...this.old] : [];
    else delete tag.order;
  }
}
