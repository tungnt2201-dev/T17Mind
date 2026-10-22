import { describe, it, expect, beforeEach } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import { AddChildCommand, ApplyThemeCommand } from "./commands";
import { migrateToLatest } from "./migrate";
import { validateMindMap } from "./validate";
import { CURRENT_SCHEMA_VERSION, type MindMap } from "./types";
import {
  THEMES,
  sanitizeTheme,
  findTheme,
  registerCustomThemes,
  cloneThemeAsCustom,
  computeThemedStyleForNode,
  type Theme,
} from "./theme";
import { ALL_EMOJIS, EMOJI_GROUPS, DEFAULT_PINNED_MARKERS, searchEmojis, normalizeEmoji, pushRecent } from "./emojiCatalog";
import { applyLayout } from "../layout";
import { MARKER_ROW_SPACE } from "../layout/spacing";

function mapWithBranches(): { map: MindMap; a: string; b: string; a1: string } {
  const map = createEmptyMap("Gốc");
  const add = (text: string, parent: string) => {
    const n = createNode(text, parent);
    map.nodes[n.id] = n;
    map.nodes[parent]!.children.push(n.id);
    return n.id;
  };
  const a = add("A", map.rootId);
  const b = add("B", map.rootId);
  const a1 = add("A1", a);
  return { map, a, b, a1 };
}

const BRANCHY: Theme = {
  id: "theme_test",
  name: "Của tôi",
  levels: [],
  perBranch: true,
  palette: ["#ff0000", "#00ff00"],
  rootStyle: { fill: "#111111", color: "#ffffff" },
  custom: true,
};

beforeEach(() => registerCustomThemes([]));

describe("Kho biểu tượng", () => {
  it("tìm không dấu bằng tiếng Việt; nhiều từ phải khớp hết", () => {
    expect(searchEmojis("tien").map((e) => e.e)).toContain("💰");
    expect(searchEmojis("Lịch").map((e) => e.e)).toContain("📅");
    expect(searchEmojis("ca phe").map((e) => e.e)).toContain("☕");
    expect(searchEmojis("tien mat do la").map((e) => e.e)).toEqual(["💵"]);
    expect(searchEmojis("   ")).toEqual([]);
  });

  it("mọi mục trong kho là đúng một emoji; bộ ghim mặc định nằm trong kho", () => {
    for (const it of ALL_EMOJIS) expect(normalizeEmoji(it.e), it.e).toBe(it.e);
    for (const e of DEFAULT_PINNED_MARKERS) expect(ALL_EMOJIS.some((x) => x.e === e)).toBe(true);
    expect(EMOJI_GROUPS.length).toBeGreaterThanOrEqual(10);
    expect(ALL_EMOJIS.length).toBeGreaterThan(200);
  });

  it("emoji dán vào: lấy đúng một biểu tượng kể cả emoji ghép, cờ, số; chữ thường bị từ chối", () => {
    expect(normalizeEmoji("👨‍💻 lập trình")).toBe("👨‍💻");
    expect(normalizeEmoji("🇻🇳")).toBe("🇻🇳");
    expect(normalizeEmoji("1️⃣")).toBe("1️⃣");
    expect(normalizeEmoji(" ⭐ ")).toBe("⭐");
    expect(normalizeEmoji("abc")).toBeNull();
    expect(normalizeEmoji("")).toBeNull();
  });

  it("dùng gần đây: mới nhất lên đầu, không trùng, có giới hạn", () => {
    expect(pushRecent(["a", "b", "c"], "b")).toEqual(["b", "a", "c"]);
    expect(pushRecent(["a", "b"], "c", 2)).toEqual(["c", "a"]);
  });
});

describe("Theme riêng", () => {
  it("sanitizeTheme: giữ trường hợp lệ, bỏ màu sai, từ chối dữ liệu hỏng", () => {
    expect(sanitizeTheme(null)).toBeNull();
    expect(sanitizeTheme({ id: "x", name: "n", levels: [] })).toBeNull(); // theo cấp mà không có màu
    const t = sanitizeTheme({
      id: " t1 ",
      name: "Tên",
      levels: [{ fill: "#ABCDEF" }, { fill: "đỏ" }, { fill: "#000000", color: "#ffffff" }],
      hueDrift: true,
      extra: "bỏ",
    })!;
    expect(t).toEqual({
      id: "t1",
      name: "Tên",
      levels: [
        { fill: "#abcdef", color: "#1f2933" },
        { fill: "#000000", color: "#ffffff" },
      ],
      hueDrift: true,
      custom: true,
    });
    const b = sanitizeTheme({ ...BRANCHY, palette: ["#ff0000", "xanh", "#00FF00"] })!;
    expect(b.palette).toEqual(["#ff0000", "#00ff00"]);
    expect(b.perBranch).toBe(true);
  });

  it("findTheme: có sẵn → nhúng trong map → thư viện", () => {
    expect(findTheme("monochrome")!.name).toBe("Mono");
    expect(findTheme("theme_test")).toBeNull();
    registerCustomThemes([{ ...BRANCHY, name: "Trong thư viện" }]);
    expect(findTheme("theme_test")!.name).toBe("Trong thư viện");
    expect(findTheme("theme_test", { customTheme: { ...BRANCHY, name: "Trong map" } })!.name).toBe("Trong map");
    expect(findTheme(null)).toBeNull();
  });

  it("áp theme riêng: dùng palette/màu gốc riêng, nhúng vào map; hoàn tác trả lại y nguyên", () => {
    const { map, a, b, a1 } = mapWithBranches();
    const store = new Store(map);
    const before = JSON.stringify(store.getMap());
    store.dispatch(new ApplyThemeCommand(BRANCHY.id, BRANCHY));
    const m = store.getMap();
    expect(m.activeThemeId).toBe("theme_test");
    expect(m.customTheme).toMatchObject({ id: "theme_test", palette: ["#ff0000", "#00ff00"] });
    expect(m.nodes[m.rootId]!.fill).toBe("#111111");
    expect(m.nodes[a]!.fill).toBe("#ff0000");
    expect(m.nodes[b]!.fill).toBe("#00ff00");
    expect(m.nodes[a1]!.fill).not.toBe("#ff0000"); // nhạt dần theo cấp
    expect(validateMindMap(m)).toEqual([]);
    store.undo();
    expect(JSON.stringify(store.getMap())).toBe(before);
  });

  it("mở map ở máy không có theme đó trong thư viện: node mới vẫn tô đúng theme nhúng", () => {
    const { map, a } = mapWithBranches();
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand(BRANCHY.id, BRANCHY));
    const reopened = migrateToLatest(JSON.parse(JSON.stringify(store.getMap())));
    registerCustomThemes([]); // "máy khác"
    const s2 = new Store(reopened);
    const cmd = new AddChildCommand(a, "Mới");
    s2.dispatch(cmd);
    const node = s2.getMap().nodes[cmd.newNodeId]!;
    expect(node.fill).toBe(computeThemedStyleForNode(s2.getMap(), node.id, reopened.customTheme!).fill);
  });

  it("áp lại theme có sẵn thì bỏ theme nhúng", () => {
    const { map } = mapWithBranches();
    const store = new Store(map);
    store.dispatch(new ApplyThemeCommand(BRANCHY.id, BRANCHY));
    store.dispatch(new ApplyThemeCommand("monochrome"));
    expect(store.getMap().customTheme).toBeNull();
  });

  it("cloneThemeAsCustom: bản sao độc lập, giữ kiểu theo nhánh", () => {
    const rainbow = THEMES.find((t) => t.id === "branch-colors")!;
    const c = cloneThemeAsCustom(rainbow, "theme_x", "Cầu vồng của tôi");
    expect(c).toMatchObject({ id: "theme_x", custom: true, perBranch: true });
    expect(c.palette!.length).toBe(8);
    c.palette![0] = "#000000";
    const blue = THEMES[0]!;
    const cb = cloneThemeAsCustom(blue, "theme_y", "B");
    cb.levels[0]!.fill = "#000000";
    expect(blue.levels[0]!.fill).not.toBe("#000000");
  });

  it("migrate 20 -> 21: thêm customTheme = null; theme nhúng hỏng bị bỏ", () => {
    const m = createEmptyMap("g") as unknown as Record<string, unknown>;
    m.schemaVersion = 20;
    delete m.customTheme;
    expect(migrateToLatest(m).customTheme).toBeNull();
    const m2 = { ...createEmptyMap("g"), schemaVersion: 20, customTheme: { id: "", name: 3 } } as unknown as Record<string, unknown>;
    const out = migrateToLatest(m2);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.customTheme).toBeNull();
  });
});

describe("Bố cục chừa chỗ cho hàng biểu tượng", () => {
  it("node có biểu tượng được đẩy xuống thêm MARKER_ROW_SPACE so với anh em phía trên", () => {
    const { map, a, b } = mapWithBranches();
    const measure = () => ({ width: 100, height: 30 });
    map.layoutType = "logicRight";
    applyLayout(map, measure as never);
    const gapPlain = map.nodes[b]!.baseY - map.nodes[a]!.baseY;
    map.nodes[b]!.markers = ["🎁"];
    applyLayout(map, measure as never);
    expect(map.nodes[b]!.baseY - map.nodes[a]!.baseY).toBe(gapPlain + MARKER_ROW_SPACE);
  });
});
