import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { Store } from "../core/store";
import {
  AddChildCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  UpdateNodeStyleCommand,
  SetNodeImageCommand,
  ApplyThemeCommand,
  CreateFloatingBranchCommand,
  PasteSubtreeCommand,
} from "../core/commands";
import { validateMindMap } from "../core/validate";
import { colorForDepth, THEMES } from "../core/theme";
import type { ClipboardNode } from "../core/clipboard";
import type { MindNode } from "../core/types";

describe("AddChildCommand (P1.14)", () => {
  it("apply tạo đúng node mới, gắn đúng vào children của cha", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);

    const result = store.getMap();
    expect(result.nodes[cmd.newNodeId]?.text).toBe("Con mới");
    expect(result.nodes[map.rootId]?.children).toContain(cmd.newNodeId);
  });

  it("revert xoá đúng node vừa thêm, không ảnh hưởng gì khác", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);
    store.undo();

    const result = store.getMap();
    expect(result.nodes[cmd.newNodeId]).toBeUndefined();
    expect(result.nodes[map.rootId]?.children).not.toContain(cmd.newNodeId);
  });

  it("redo (apply lần 2) dùng LẠI ĐÚNG id cũ, không sinh id mới", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);
    const idAfterFirstApply = cmd.newNodeId;
    store.undo();
    store.redo();
    expect(cmd.newNodeId).toBe(idAfterFirstApply);
    expect(store.getMap().nodes[idAfterFirstApply]).toBeDefined();
  });
});

describe("DeleteNodeCommand (P1.14)", () => {
  it("apply xoá đúng CẢ CÂY CON (subtree), không chỉ node đó", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const child = createNode("Con", root.id);
    map.nodes[child.id] = child;
    root.children.push(child.id);
    const grandchild = createNode("Cháu", child.id);
    map.nodes[grandchild.id] = grandchild;
    child.children.push(grandchild.id);

    const store = new Store(map);
    store.dispatch(new DeleteNodeCommand(child.id));

    const result = store.getMap();
    expect(result.nodes[child.id]).toBeUndefined();
    expect(result.nodes[grandchild.id]).toBeUndefined(); // cháu cũng mất theo
    expect(result.nodes[map.rootId]?.children).not.toContain(child.id);
  });

  it("revert khôi phục ĐÚNG lại cả cây con, đúng vị trí trong children của cha", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const c1 = createNode("Con 1", root.id);
    map.nodes[c1.id] = c1;
    root.children.push(c1.id);
    const c2 = createNode("Con 2", root.id);
    map.nodes[c2.id] = c2;
    root.children.push(c2.id);
    const c3 = createNode("Con 3", root.id);
    map.nodes[c3.id] = c3;
    root.children.push(c3.id);

    const store = new Store(map);
    store.dispatch(new DeleteNodeCommand(c2.id)); // xoá node GIỮA
    store.undo();

    const result = store.getMap();
    expect(result.nodes[c2.id]).toBeDefined();
    // Phải về ĐÚNG vị trí giữa (index 1), không phải bị đẩy về cuối.
    expect(result.nodes[map.rootId]?.children).toEqual([c1.id, c2.id, c3.id]);
  });

  it("không thể xoá node gốc chính — ném lỗi rõ ràng", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    expect(() => store.dispatch(new DeleteNodeCommand(map.rootId))).toThrow();
  });
});

describe("MoveNodeCommand (P1.14)", () => {
  it("di chuyển node sang cha khác, đúng vị trí mong muốn", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const branchA = createNode("Nhánh A", root.id);
    map.nodes[branchA.id] = branchA;
    root.children.push(branchA.id);
    const branchB = createNode("Nhánh B", root.id);
    map.nodes[branchB.id] = branchB;
    root.children.push(branchB.id);
    const moving = createNode("Đang di chuyển", branchA.id);
    map.nodes[moving.id] = moving;
    branchA.children.push(moving.id);

    const store = new Store(map);
    store.dispatch(new MoveNodeCommand(moving.id, branchB.id, 0));

    const result = store.getMap();
    expect(result.nodes[branchA.id]?.children).not.toContain(moving.id);
    expect(result.nodes[branchB.id]?.children).toContain(moving.id);
    expect(result.nodes[moving.id]?.parentId).toBe(branchB.id);
  });

  it("revert đưa node về ĐÚNG cha cũ, đúng vị trí cũ", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const branchA = createNode("Nhánh A", root.id);
    map.nodes[branchA.id] = branchA;
    root.children.push(branchA.id);
    const branchB = createNode("Nhánh B", root.id);
    map.nodes[branchB.id] = branchB;
    root.children.push(branchB.id);
    const moving = createNode("Đang di chuyển", branchA.id);
    map.nodes[moving.id] = moving;
    branchA.children.push(moving.id);

    const store = new Store(map);
    store.dispatch(new MoveNodeCommand(moving.id, branchB.id, 0));
    store.undo();

    const result = store.getMap();
    expect(result.nodes[branchA.id]?.children).toContain(moving.id);
    expect(result.nodes[branchB.id]?.children).not.toContain(moving.id);
    expect(result.nodes[moving.id]?.parentId).toBe(branchA.id);
  });

  it("kết quả sau di chuyển luôn hợp lệ theo validateMindMap (không tạo vòng lặp/tham chiếu hỏng)", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const a = createNode("A", root.id);
    map.nodes[a.id] = a;
    root.children.push(a.id);
    const b = createNode("B", root.id);
    map.nodes[b.id] = b;
    root.children.push(b.id);

    const store = new Store(map);
    store.dispatch(new MoveNodeCommand(a.id, b.id, 0));
    expect(validateMindMap(store.getMap())).toEqual([]);
  });
});

describe("UpdateNodeStyleCommand (P1.14)", () => {
  it("apply/revert đúng MỘT thuộc tính, không đụng thuộc tính khác", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    root.fill = "#111111";
    root.color = "#222222";

    const store = new Store(map);
    store.dispatch(new UpdateNodeStyleCommand(root.id, { fill: "#d64545" }));
    expect(store.getMap().nodes[root.id]?.fill).toBe("#d64545");
    expect(store.getMap().nodes[root.id]?.color).toBe("#222222"); // không đổi

    store.undo();
    expect(store.getMap().nodes[root.id]?.fill).toBe("#111111"); // về đúng giá trị cũ
  });

  it("nhiều lần sửa liên tiếp rồi hoàn tác dần — mỗi bước về ĐÚNG giá trị của chính nó", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const store = new Store(map);

    store.dispatch(new UpdateNodeStyleCommand(root.id, { fill: "#111111" }));
    store.dispatch(new UpdateNodeStyleCommand(root.id, { fill: "#222222" }));
    store.dispatch(new UpdateNodeStyleCommand(root.id, { fill: "#333333" }));

    expect(store.getMap().nodes[root.id]?.fill).toBe("#333333");
    store.undo();
    expect(store.getMap().nodes[root.id]?.fill).toBe("#222222");
    store.undo();
    expect(store.getMap().nodes[root.id]?.fill).toBe("#111111");
    store.undo();
    expect(store.getMap().nodes[root.id]?.fill).toBeNull(); // về đúng giá trị BAN ĐẦU (chưa từng sửa)
  });
});

describe("SetNodeImageCommand (P2.10 — Ảnh nhúng)", () => {
  it("apply gắn đúng imageAssetId lên node VÀ thêm đúng mục vào map.assets", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const store = new Store(map);

    store.dispatch(new SetNodeImageCommand(root.id, "img_abc", { mimeType: "image/png", dataBase64: "AAAA" }));

    const result = store.getMap();
    expect(result.nodes[root.id]?.imageAssetId).toBe("img_abc");
    expect(result.assets["img_abc"]).toEqual({ mimeType: "image/png", dataBase64: "AAAA" });
  });

  it("revert (Ctrl+Z) xoá đúng mục vừa thêm khỏi map.assets, không để lại rác, và trả node về imageAssetId cũ", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const store = new Store(map);

    store.dispatch(new SetNodeImageCommand(root.id, "img_abc", { mimeType: "image/png", dataBase64: "AAAA" }));
    store.undo();

    const result = store.getMap();
    expect(result.nodes[root.id]?.imageAssetId).toBeNull();
    expect(result.assets["img_abc"]).toBeUndefined();
  });

  it("gọi với newAssetId=null (xoá ảnh khỏi node) chỉ gỡ con trỏ trên node, KHÔNG xoá dữ liệu asset đã lưu — hoàn tác lại thấy ảnh cũ ngay, không cần chọn lại file", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const store = new Store(map);

    store.dispatch(new SetNodeImageCommand(root.id, "img_abc", { mimeType: "image/png", dataBase64: "AAAA" }));
    store.dispatch(new SetNodeImageCommand(root.id, null, null));

    let result = store.getMap();
    expect(result.nodes[root.id]?.imageAssetId).toBeNull();
    expect(result.assets["img_abc"]).toEqual({ mimeType: "image/png", dataBase64: "AAAA" }); // vẫn còn, chỉ không còn node nào trỏ tới

    store.undo(); // hoàn tác bước "xoá ảnh" -> node lại có ảnh
    result = store.getMap();
    expect(result.nodes[root.id]?.imageAssetId).toBe("img_abc");
  });

  it("redo (apply lần 2 sau undo) hoạt động đúng — thêm lại đúng asset đã bị revert() xoá", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const store = new Store(map);

    store.dispatch(new SetNodeImageCommand(root.id, "img_abc", { mimeType: "image/png", dataBase64: "AAAA" }));
    store.undo();
    store.redo();

    const result = store.getMap();
    expect(result.nodes[root.id]?.imageAssetId).toBe("img_abc");
    expect(result.assets["img_abc"]).toEqual({ mimeType: "image/png", dataBase64: "AAAA" });
  });
});

const BLUE = THEMES.find((t) => t.id === "professional-blue")!;

describe("ApplyThemeCommand (P2.11 — ghi lại activeThemeId + dùng công thức vô hạn cấp)", () => {
  it("apply đặt map.activeThemeId, revert trả về giá trị cũ (null nếu chưa từng bật theme nào)", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    expect(store.getMap().activeThemeId).toBe("professional-blue");
    store.undo();
    expect(store.getMap().activeThemeId).toBeNull();
    store.redo();
    expect(store.getMap().activeThemeId).toBe("professional-blue");
  });

  it("tô đúng màu theo colorForDepth cho cả cây, kể cả cấp vượt ngoài 4 mức cố định", () => {
    const map = createEmptyMap("Gốc");
    let parentId = map.rootId;
    const chain: string[] = [map.rootId];
    for (let i = 0; i < 6; i++) {
      const child = createNode(`Cấp ${i + 1}`, parentId);
      map.nodes[child.id] = child;
      (map.nodes[parentId] as MindNode).children.push(child.id);
      parentId = child.id;
      chain.push(child.id);
    }
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));

    const result = store.getMap();
    chain.forEach((id, depth) => {
      const expected = colorForDepth(BLUE, depth);
      expect(result.nodes[id]?.fill).toBe(expected.fill);
      expect(result.nodes[id]?.color).toBe(expected.color);
    });
    // Cấp 5 (index 5) và cấp 6 (index 6) đều nằm ngoài 4 mức cố định
    // (0..3) — trước bản vá P2.11 sẽ trùng hệt màu cấp 3; giờ phải khác.
    expect(result.nodes[chain[5] as string]?.fill).not.toBe(result.nodes[chain[6] as string]?.fill);
  });

  it("theme Rainbow đổi tên đúng đặt lại activeThemeId sang bộ mới khi áp lần 2", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    store.dispatch(new ApplyThemeCommand("branch-colors"));
    expect(store.getMap().activeThemeId).toBe("branch-colors");
    store.undo();
    expect(store.getMap().activeThemeId).toBe("professional-blue");
  });
});

describe("AddChildCommand tự tô theo theme đang bật (P2.11 — sửa dứt điểm lỗi node mới trắng tinh)", () => {
  it("map CHƯA bật theme nào -> node mới vẫn fill/color null như trước (không đổi hành vi cũ)", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);
    const node = store.getMap().nodes[cmd.newNodeId];
    expect(node?.fill).toBeNull();
    expect(node?.color).toBeNull();
  });

  it("map ĐÃ bật theme (Blue) -> node con mới tự động nhận đúng màu cấp 1, không còn trắng tinh", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);

    const node = store.getMap().nodes[cmd.newNodeId];
    const expected = colorForDepth(BLUE, 1);
    expect(node?.fill).toBe(expected.fill);
    expect(node?.color).toBe(expected.color);
  });

  it("tạo cháu (cấp 2) từ một con đã tự tô theo theme -> cháu cũng tự tô đúng cấp 2", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    const childCmd = new AddChildCommand(map.rootId, "Con");
    store.dispatch(childCmd);
    const grandchildCmd = new AddChildCommand(childCmd.newNodeId, "Cháu");
    store.dispatch(grandchildCmd);

    const grandchild = store.getMap().nodes[grandchildCmd.newNodeId];
    const expected = colorForDepth(BLUE, 2);
    expect(grandchild?.fill).toBe(expected.fill);
    expect(grandchild?.color).toBe(expected.color);
  });

  it("theme Rainbow: node con mới của nhánh cấp-1 thứ 2 nhận đúng hue riêng của nhánh đó", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("branch-colors"));
    const branch1 = new AddChildCommand(map.rootId, "Nhánh 1");
    store.dispatch(branch1);
    const branch2 = new AddChildCommand(map.rootId, "Nhánh 2");
    store.dispatch(branch2);

    const style1 = store.getMap().nodes[branch1.newNodeId];
    const style2 = store.getMap().nodes[branch2.newNodeId];
    expect(style1?.fill).not.toBe(style2?.fill);
  });

  it("redo (sau undo) trả về ĐÚNG cùng node/id với ĐÚNG cùng màu đã tính lần đầu", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    const cmd = new AddChildCommand(map.rootId, "Con mới");
    store.dispatch(cmd);
    const idAfterFirstApply = cmd.newNodeId;
    const fillAfterFirstApply = store.getMap().nodes[idAfterFirstApply]?.fill;

    store.undo();
    store.redo();

    expect(cmd.newNodeId).toBe(idAfterFirstApply);
    expect(store.getMap().nodes[idAfterFirstApply]?.fill).toBe(fillAfterFirstApply);
  });
});

describe("CreateFloatingBranchCommand tự tô theo theme đang bật (P2.11)", () => {
  it("nhánh trôi mới tạo được tô như một GỐC (depth 0) theo theme đang bật", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));
    const cmd = new CreateFloatingBranchCommand("Nhánh trôi", 300);
    store.dispatch(cmd);

    const node = store.getMap().nodes[cmd.newNodeId];
    const expected = colorForDepth(BLUE, 0);
    expect(node?.fill).toBe(expected.fill);
    expect(node?.color).toBe(expected.color);
  });

  it("Rainbow: nhánh trôi là gốc riêng -> luôn nhận đúng RAINBOW_ROOT_STYLE trung tính (khớp applyBranchColors cho root)", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("branch-colors"));
    const cmd = new CreateFloatingBranchCommand("Nhánh trôi", 300);
    store.dispatch(cmd);

    const node = store.getMap().nodes[cmd.newNodeId];
    expect(node?.fill).toBe("#14162b");
    expect(node?.color).toBe("#ffffff");
  });
});

function plainClip(text: string, children: ClipboardNode[] = []): ClipboardNode {
  return {
    text,
    notes: null,
    color: null,
    fill: null,
    fillTransparent: false,
    borderStyle: "solid",
    borderColor: null,
    link: null,
    edgeColor: null,
    edgeDash: false,
    edgeShape: "curve",
    collapsed: false,
    children,
  };
}

describe("PasteSubtreeCommand tự tô theo theme cho nội dung KHÔNG có định dạng sẵn (P2.11)", () => {
  it("dán văn bản thụt lề (fill/color đều null) khi map đã bật theme -> tự tô theo đúng cấp đích", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));

    const clip = plainClip("Dán vào", [plainClip("Con của dán")]);
    const cmd = new PasteSubtreeCommand(map.rootId, [clip]);
    store.dispatch(cmd);

    const result = store.getMap();
    const pastedRootId = cmd.newRootIds[0] as string;
    const pastedRoot = result.nodes[pastedRootId] as MindNode;
    const pastedChild = result.nodes[pastedRoot.children[0] as string] as MindNode;

    expect(pastedRoot.fill).toBe(colorForDepth(BLUE, 1).fill);
    expect(pastedChild.fill).toBe(colorForDepth(BLUE, 2).fill);
  });

  it("dán một node ĐÃ có màu tường minh (copy nội bộ) -> giữ NGUYÊN màu đã copy, không bị ghi đè theo theme", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand("professional-blue"));

    const clipWithColor: ClipboardNode = { ...plainClip("Đã tô tay"), fill: "#ff00ff", color: "#000000" };
    const cmd = new PasteSubtreeCommand(map.rootId, [clipWithColor]);
    store.dispatch(cmd);

    const result = store.getMap();
    const pastedRoot = result.nodes[cmd.newRootIds[0] as string] as MindNode;
    expect(pastedRoot.fill).toBe("#ff00ff");
    expect(pastedRoot.color).toBe("#000000");
  });

  it("map CHƯA bật theme -> dán văn bản thuần vẫn fill/color null như trước (không đổi hành vi cũ)", () => {
    const map = createEmptyMap("Gốc");
    const store = new Store(map);
    const cmd = new PasteSubtreeCommand(map.rootId, [plainClip("Dán vào")]);
    store.dispatch(cmd);

    const result = store.getMap();
    const pastedRoot = result.nodes[cmd.newRootIds[0] as string] as MindNode;
    expect(pastedRoot.fill).toBeNull();
    expect(pastedRoot.color).toBeNull();
  });
});
