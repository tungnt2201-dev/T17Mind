/**
 * ui/contextMenuModel.ts
 * ---------------------------------------------------------------------
 * Menu chuột phải — phần THUẦN: từ "bấm vào cái gì" (MenuTarget) ra danh
 * sách mục (MenuEntry). Không đụng DOM/Store nên test được; việc chạy
 * từng mục nằm ở AppController.runMenuAction, hiển thị ở
 * components/ContextMenu.svelte.
 *
 * Mọi mục chỉ gọi lại đúng các thao tác đã có (toolbar, phím tắt) — vẫn
 * đi qua Command như cũ nên hoàn tác được; nhãn kèm phím tắt để người
 * dùng học dần.
 * ---------------------------------------------------------------------
 */

export type MenuTarget =
  | {
      kind: "node";
      nodeId: string;
      isRoot: boolean;
      hasChildren: boolean;
      hasCard: boolean;
      tableBlockId: string | null;
      imageCount: number;
      canPaste: boolean;
    }
  | { kind: "multi"; count: number }
  | { kind: "relationship"; id: string; bent: boolean }
  | { kind: "summary"; id: string }
  | { kind: "boundary"; id: string }
  | { kind: "sticky"; id: string }
  | { kind: "canvas"; worldX: number; worldY: number };

export type MenuAction =
  | "addChild"
  | "addSibling"
  | "editText"
  | "copy"
  | "cut"
  | "paste"
  | "duplicate"
  | "toggleCollapse"
  | "expandAll"
  | "createCard"
  | "openPage"
  | "openTable"
  | "viewImages"
  | "addImages"
  | "startLink"
  | "detachFloating"
  | "exportBranch"
  | "summary"
  | "boundary"
  | "editLabel"
  | "straighten"
  | "addFloating"
  | "addSticky"
  | "fitView"
  | "home"
  | "delete";

export type MenuEntry =
  | { kind: "item"; action: MenuAction; label: string; shortcut?: string; disabled?: boolean; danger?: boolean }
  | { kind: "separator" };

const item = (
  action: MenuAction,
  label: string,
  shortcut?: string,
  extra: { disabled?: boolean; danger?: boolean } = {}
): MenuEntry => ({ kind: "item", action, label, ...(shortcut ? { shortcut } : {}), ...extra });
const SEP: MenuEntry = { kind: "separator" };

export function buildMenu(t: MenuTarget): MenuEntry[] {
  switch (t.kind) {
    case "node":
      return [
        item("addChild", "Thêm nhánh con", "Tab"),
        item("addSibling", "Thêm nhánh cùng cấp", "Enter", { disabled: t.isRoot }),
        item("editText", "Sửa chữ", "F2"),
        SEP,
        item("copy", "Sao chép", "Ctrl+C"),
        item("cut", "Cắt", "Ctrl+X", { disabled: t.isRoot }),
        item("paste", "Dán vào đây", "Ctrl+V", { disabled: !t.canPaste }),
        item("duplicate", "Nhân bản", "Ctrl+D", { disabled: t.isRoot }),
        SEP,
        item("toggleCollapse", "Thu gọn / mở từng cấp", "C", { disabled: !t.hasChildren }),
        item("expandAll", "Mở hết nhánh", "Shift+C", { disabled: !t.hasChildren }),
        SEP,
        ...(t.hasCard ? [item("openPage", "Mở trang card"), item("addImages", "Thêm ảnh vào card…")] : [item("createCard", "Tạo card cho node")]),
        ...(t.tableBlockId ? [item("openTable", "Mở bảng")] : []),
        ...(t.imageCount > 0 ? [item("viewImages", t.imageCount > 1 ? `Xem ${t.imageCount} ảnh` : "Xem ảnh")] : []),
        item("startLink", "Tạo liên kết từ node này"),
        item("detachFloating", "Tách thành nhánh trôi", undefined, { disabled: t.isRoot }),
        item("exportBranch", "Xuất nhánh này thành tài liệu…"),
        SEP,
        item("delete", "Xoá", "Del", { disabled: t.isRoot, danger: true }),
      ];
    case "multi":
      return [
        item("summary", `Tóm tắt ${t.count} node`),
        item("boundary", "Khoanh vùng"),
        SEP,
        item("copy", "Sao chép", "Ctrl+C"),
        item("cut", "Cắt", "Ctrl+X"),
        SEP,
        item("delete", `Xoá ${t.count} node`, "Del", { danger: true }),
      ];
    case "relationship":
      return [
        item("editLabel", "Sửa nhãn"),
        item("straighten", "Làm thẳng lại", undefined, { disabled: !t.bent }),
        SEP,
        item("delete", "Xoá liên kết", "Del", { danger: true }),
      ];
    case "summary":
      return [item("editLabel", "Sửa nhãn tóm tắt"), SEP, item("delete", "Xoá tóm tắt", "Del", { danger: true })];
    case "boundary":
      return [item("editLabel", "Sửa nhãn khoanh vùng"), SEP, item("delete", "Xoá khoanh vùng", "Del", { danger: true })];
    case "sticky":
      return [item("editLabel", "Sửa ghi chú dán"), SEP, item("delete", "Xoá ghi chú dán", "Del", { danger: true })];
    case "canvas":
      return [
        item("addFloating", "Thêm nhánh trôi"),
        item("addSticky", "Thêm ghi chú dán ở đây"),
        SEP,
        item("fitView", "Vừa khung", "F"),
        item("home", "Về gốc", "Home"),
      ];
  }
}

/** Vị trí menu sao cho nằm trọn trong khung nhìn: gần mép phải/dưới thì
 *  lật sang trái/lên trên con trỏ. */
export function placeMenu(
  x: number,
  y: number,
  menuW: number,
  menuH: number,
  viewW: number,
  viewH: number,
  margin = 4
): { left: number; top: number } {
  const left = x + menuW + margin > viewW ? Math.max(margin, x - menuW) : x;
  const top = y + menuH + margin > viewH ? Math.max(margin, y - menuH) : y;
  return { left, top };
}
