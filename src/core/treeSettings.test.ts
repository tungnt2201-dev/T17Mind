import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import {
  AddChildCommand,
  ApplyThemeCommand,
  CreateFloatingBranchCommand,
  MergeMapCommand,
  SetLayoutTypeCommand,
  ToggleOrganicEdgesCommand,
} from "./commands";
import { THEMES } from "./theme";
import { layoutOfNode, rootIdOf, sanitizeTreeSettings, settingsOfNode } from "./treeSettings";
import { migrateToLatest } from "./migrate";
import { applyLayout } from "../layout";
import { parentChildEdgeAnchors } from "../render/geometry";
import type { MindNode } from "./types";

const BLUE = THEMES.find((t) => t.id === "professional-blue")!;
const MONO = THEMES.find((t) => t.id === "monochrome")!;
const measure = () => ({ width: 100, height: 30 });

/** Cây chính: Gốc → A, B. Nhánh trôi: F → F1, F2. */
function setup() {
  const store = new Store(createEmptyMap("Gốc"));
  const m = store.getMap();
  const add = (parentId: string, text: string): string => {
    const c = new AddChildCommand(parentId, text);
    store.dispatch(c);
    return c.newNodeId;
  };
  const a = add(m.rootId, "A");
  const b = add(m.rootId, "B");
  const fl = new CreateFloatingBranchCommand("F", 400);
  store.dispatch(fl);
  const f = fl.newNodeId;
  const f1 = add(f, "F1");
  const f2 = add(f, "F2");
  return { store, m, a, b, f, f1, f2 };
}

describe("Cài đặt riêng cho từng cây (schema 22)", () => {
  it("tra cứu: gốc của node, nhánh trôi chưa có bản ghi thì theo cây chính", () => {
    const { m, a, f, f1 } = setup();
    expect(rootIdOf(m, a)).toBe(m.rootId);
    expect(rootIdOf(m, f1)).toBe(f);
    expect(rootIdOf(m, f)).toBe(f);
    expect(layoutOfNode(m, f1)).toBe("logicRight");
    m.layoutType = "logicLeft"; // sửa thẳng, không qua Command → nhánh trôi chưa có bản ghi nên theo
    expect(layoutOfNode(m, f1)).toBe("logicLeft");
  });

  it("đổi bố cục NHÁNH TRÔI không đổi cây chính; undo/redo trả lại đúng", () => {
    const { store, m, a, f, f1 } = setup();
    store.dispatch(new SetLayoutTypeCommand("treeDown", f));
    expect(layoutOfNode(m, f1)).toBe("treeDown");
    expect(layoutOfNode(m, a)).toBe("logicRight");
    expect(m.layoutType).toBe("logicRight");
    store.undo();
    expect(layoutOfNode(store.getMap(), f1)).toBe("logicRight");
    expect(store.getMap().treeSettings[f]).toBeUndefined();
    store.redo();
    expect(layoutOfNode(store.getMap(), f1)).toBe("treeDown");
  });

  it("đổi bố cục CÂY CHÍNH không kéo theo nhánh trôi (được chốt giá trị cũ); undo bỏ cả việc chốt", () => {
    const { store, m, a, f, f1 } = setup();
    store.dispatch(new SetLayoutTypeCommand("logicBoth"));
    expect(layoutOfNode(m, a)).toBe("logicBoth");
    expect(layoutOfNode(m, f1)).toBe("logicRight"); // nhánh trôi giữ nguyên
    expect(m.treeSettings[f]).toBeTruthy();
    store.undo();
    expect(layoutOfNode(store.getMap(), a)).toBe("logicRight");
    expect(store.getMap().treeSettings[f]).toBeUndefined();
  });

  it("thuật toán xếp chỗ chạy riêng từng cây: cây chính sang phải, nhánh trôi sang trái cùng lúc", () => {
    const { store, m, a, f, f1 } = setup();
    store.dispatch(new SetLayoutTypeCommand("logicLeft", f));
    applyLayout(m, measure as never);
    const root = m.nodes[m.rootId] as MindNode;
    const fl = m.nodes[f] as MindNode;
    expect((m.nodes[a] as MindNode).baseX).toBeGreaterThan(root.baseX); // con cây chính bên phải gốc
    expect((m.nodes[f1] as MindNode).baseX).toBeLessThan(fl.baseX); // con nhánh trôi bên trái gốc nhánh
  });

  it("đường nối cha-con theo bố cục của cây chứa nó", () => {
    const { store, m, a, f, f1 } = setup();
    store.dispatch(new SetLayoutTypeCommand("treeDown", f));
    applyLayout(m, measure as never);
    const main = parentChildEdgeAnchors(m, m.nodes[m.rootId] as MindNode, m.nodes[a] as MindNode);
    expect(main.sx).toBe((m.nodes[m.rootId] as MindNode).x + (m.nodes[m.rootId] as MindNode).width); // ngang: từ mép phải
    const fl = parentChildEdgeAnchors(m, m.nodes[f] as MindNode, m.nodes[f1] as MindNode);
    expect(fl.sy).toBe((m.nodes[f] as MindNode).y + 30); // dọc: từ mép dưới
  });

  it("kiểu cây tự nhiên bật/tắt riêng từng cây", () => {
    const { store, m, a, f, f1 } = setup();
    store.dispatch(new ToggleOrganicEdgesCommand(f));
    expect(settingsOfNode(m, f1).organicEdges).toBe(true);
    expect(settingsOfNode(m, a).organicEdges).toBe(false);
    store.dispatch(new ToggleOrganicEdgesCommand());
    expect(settingsOfNode(m, a).organicEdges).toBe(true);
    expect(settingsOfNode(m, f1).organicEdges).toBe(true); // vẫn giữ riêng
    store.dispatch(new ToggleOrganicEdgesCommand(f));
    expect(settingsOfNode(m, f1).organicEdges).toBe(false);
    expect(settingsOfNode(m, a).organicEdges).toBe(true);
  });

  it("theme: áp cho nhánh trôi chỉ tô nhánh đó; cây chính giữ màu; node mới theo theme của cây nó", () => {
    const { store, m, a, b, f, f1 } = setup();
    const f1Initial = (m.nodes[f1] as MindNode).fill;
    store.dispatch(new ApplyThemeCommand(BLUE.id));
    expect((m.nodes[f1] as MindNode).fill).toBe(f1Initial); // áp theme cây chính không tô nhánh trôi
    const mainFill = (m.nodes[a] as MindNode).fill;
    expect(mainFill).toBeTruthy();
    expect(m.activeThemeId).toBe(BLUE.id);

    store.dispatch(new ApplyThemeCommand(MONO.id, null, f));
    expect(m.activeThemeId).toBe(BLUE.id); // cây chính không đổi theme
    expect((m.nodes[a] as MindNode).fill).toBe(mainFill); // cũng không đổi màu
    expect(settingsOfNode(m, f1).activeThemeId).toBe(MONO.id);
    expect((m.nodes[f1] as MindNode).fill).not.toBe(mainFill);

    // node mới tô theo theme của cây chứa nó
    const c1 = new AddChildCommand(f, "F3");
    store.dispatch(c1);
    const c2 = new AddChildCommand(m.rootId, "C");
    store.dispatch(c2);
    expect((m.nodes[c1.newNodeId] as MindNode).fill).toBe((m.nodes[f1] as MindNode).fill);
    expect((m.nodes[c2.newNodeId] as MindNode).fill).toBe((m.nodes[b] as MindNode).fill);

    store.undo(); store.undo(); // bỏ hai node vừa thêm
    store.undo(); // bỏ theme của nhánh trôi
    expect(settingsOfNode(store.getMap(), f1).activeThemeId).toBeNull(); // nhánh trôi chưa từng có theme
    expect((store.getMap().nodes[f1] as MindNode).fill).toBe(f1Initial);
    expect(store.getMap().activeThemeId).toBe(BLUE.id); // cây chính vẫn giữ theme
  });

  it("đổi theme cây chính không tô lại nhánh trôi đã có theme riêng", () => {
    const { store, m, f1, a } = setup();
    store.dispatch(new ApplyThemeCommand(MONO.id, null, m.nodes[f1]!.parentId));
    const floatFill = (m.nodes[f1] as MindNode).fill;
    store.dispatch(new ApplyThemeCommand(BLUE.id));
    expect((m.nodes[f1] as MindNode).fill).toBe(floatFill);
    expect((m.nodes[a] as MindNode).fill).not.toBe(floatFill);
  });

  it("ghép map: mỗi cây ghép vào giữ bố cục/theme của chính nó; undo bỏ sạch", () => {
    const { store, m } = setup();
    const other = createEmptyMap("Khác");
    other.layoutType = "treeUp";
    other.organicEdges = true;
    const c = createNode("Con", other.rootId);
    other.nodes[c.id] = c;
    (other.nodes[other.rootId] as MindNode).children.push(c.id);
    const merge = new MergeMapCommand(other);
    store.dispatch(merge);
    const newRoot = merge.newRootIds[0]!;
    expect(layoutOfNode(m, newRoot)).toBe("treeUp");
    expect(settingsOfNode(m, newRoot).organicEdges).toBe(true);
    expect(m.layoutType).toBe("logicRight");
    store.undo();
    expect(Object.keys(store.getMap().treeSettings)).not.toContain(newRoot);
  });
});

describe("treeSettings — lưu/mở file", () => {
  it("file cũ (schema 21) mở ra có treeSettings rỗng, nhánh trôi vẫn theo cây chính", () => {
    const { m, f1 } = setup();
    const raw = JSON.parse(JSON.stringify(m)) as Record<string, unknown>;
    delete raw.treeSettings;
    raw.schemaVersion = 21;
    raw.layoutType = "logicBoth";
    const migrated = migrateToLatest(raw);
    expect(migrated.treeSettings).toEqual({});
    expect(layoutOfNode(migrated, f1)).toBe("logicBoth");
  });

  it("làm sạch dữ liệu: bỏ bản ghi hỏng/id lạ, sửa giá trị sai", () => {
    const raw = {
      ok: { layoutType: "treeUp", organicEdges: true, activeThemeId: "x", customTheme: null },
      bad: "không phải object",
      lạ: { layoutType: "logicLeft" },
      sai: { layoutType: "fishbone", organicEdges: "yes", activeThemeId: 5 },
    };
    const out = sanitizeTreeSettings(raw, new Set(["ok", "bad", "sai"]));
    expect(Object.keys(out).sort()).toEqual(["ok", "sai"]);
    expect(out.ok).toEqual({ layoutType: "treeUp", organicEdges: true, activeThemeId: "x", customTheme: null });
    expect(out.sai).toEqual({ layoutType: "logicRight", organicEdges: false, activeThemeId: null, customTheme: null });
  });
});
