import { describe, it, expect } from "vitest";
import { buildMenu, placeMenu, type MenuEntry, type MenuTarget } from "./contextMenuModel";

const actions = (entries: MenuEntry[]): string[] => entries.flatMap((e) => (e.kind === "item" ? [e.action] : []));
const find = (entries: MenuEntry[], action: string) => entries.find((e) => e.kind === "item" && e.action === action) as
  | Extract<MenuEntry, { kind: "item" }>
  | undefined;

const node = (over: Partial<Extract<MenuTarget, { kind: "node" }>> = {}): MenuTarget => ({
  kind: "node",
  nodeId: "n1",
  isRoot: false,
  hasChildren: true,
  hasCard: false,
  tableBlockId: null,
  imageCount: 0,
  canPaste: false,
  ...over,
});

describe("Menu chuột phải — chọn mục theo ngữ cảnh", () => {
  it("node thường: đủ nhóm thao tác, mỗi mục chỉ xuất hiện một lần, có phím tắt", () => {
    const m = buildMenu(node());
    const a = actions(m);
    expect(new Set(a).size).toBe(a.length);
    expect(a).toEqual(
      expect.arrayContaining(["addChild", "addSibling", "editText", "copy", "cut", "duplicate", "toggleCollapse", "createCard", "startLink", "delete"])
    );
    expect(find(m, "addChild")?.shortcut).toBe("Tab");
    expect(find(m, "delete")).toMatchObject({ danger: true, disabled: false });
    expect(find(m, "paste")?.disabled).toBe(true);
    expect(m[0]?.kind).toBe("item");
    expect(m[m.length - 1]?.kind).toBe("item");
  });

  it("node gốc: không xoá/cắt/tách/thêm cùng cấp được", () => {
    const m = buildMenu(node({ isRoot: true }));
    for (const a of ["delete", "cut", "detachFloating", "addSibling", "duplicate"]) expect(find(m, a)?.disabled).toBe(true);
    expect(find(m, "addChild")?.disabled).toBeFalsy();
  });

  it("node có card/bảng/ảnh: hiện Mở bảng, Xem ảnh, Thêm ảnh thay cho Tạo card", () => {
    const m = buildMenu(node({ hasCard: true, tableBlockId: "t1", imageCount: 3, canPaste: true, hasChildren: false }));
    const a = actions(m);
    expect(a).toContain("openTable");
    expect(a).toContain("addImages");
    expect(a).not.toContain("createCard");
    expect(find(m, "viewImages")?.label).toBe("Xem 3 ảnh");
    expect(find(m, "paste")?.disabled).toBe(false);
    expect(find(m, "toggleCollapse")?.disabled).toBe(true);
  });

  it("nhiều node, đường liên kết, tóm tắt, khoanh vùng, ghi chú dán, vùng trống", () => {
    expect(actions(buildMenu({ kind: "multi", count: 3 }))).toEqual(["summary", "boundary", "copy", "cut", "delete"]);
    expect(find(buildMenu({ kind: "relationship", id: "r", bent: false }), "straighten")?.disabled).toBe(true);
    expect(find(buildMenu({ kind: "relationship", id: "r", bent: true }), "straighten")?.disabled).toBe(false);
    for (const kind of ["summary", "boundary", "sticky"] as const) {
      expect(actions(buildMenu({ kind, id: "x" }))).toEqual(["editLabel", "delete"]);
    }
    expect(actions(buildMenu({ kind: "canvas", worldX: 0, worldY: 0 }))).toEqual(["addFloating", "addSticky", "fitView", "home"]);
  });

  it("không có hai vạch ngăn liền nhau", () => {
    const targets: MenuTarget[] = [node(), node({ hasCard: true, tableBlockId: "t", imageCount: 1 }), { kind: "multi", count: 2 }];
    for (const t of targets) {
      const m = buildMenu(t);
      m.forEach((e, i) => {
        if (e.kind === "separator") expect(m[i + 1]?.kind).toBe("item");
      });
    }
  });
});

describe("Vị trí menu", () => {
  it("đủ chỗ thì mở ngay tại con trỏ", () => {
    expect(placeMenu(100, 100, 200, 300, 1000, 800)).toEqual({ left: 100, top: 100 });
  });
  it("sát mép phải/dưới thì lật sang trái/lên trên", () => {
    expect(placeMenu(900, 700, 200, 300, 1000, 800)).toEqual({ left: 700, top: 400 });
  });
  it("cửa sổ quá nhỏ thì bám mép trái/trên", () => {
    expect(placeMenu(50, 50, 200, 300, 100, 100)).toEqual({ left: 4, top: 4 });
  });
});
