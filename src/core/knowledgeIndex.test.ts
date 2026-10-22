import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { createCard, createTextBlock, createTableBlock } from "./cards";
import { makeLinkToken } from "./links";
import {
  KnowledgeIndex,
  bodySnippet,
  buildMapEntries,
  buildMapIndex,
  highlightParts,
  queryTokens,
  scoreEntry,
} from "./knowledgeIndex";
import type { MindMap } from "./types";

function addNode(map: MindMap, text: string, parentId: string, notes: string | null = null) {
  const n = createNode(text, parentId);
  n.notes = notes;
  map.nodes[n.id] = n;
  map.nodes[parentId]!.children.push(n.id);
  return n;
}

function coffeeMap() {
  const map = createEmptyMap("Quán cà phê");
  const menu = addNode(map, "Thực đơn", map.rootId);
  const latte = addNode(map, "Cà phê sữa", menu.id, "Bán chạy nhất vào buổi sáng");
  const card = createCard("Công thức cà phê sữa");
  const t = createTextBlock("Pha 20g cà phê với 40ml sữa đặc. Xem [[card:other|Nhãn cũ]].");
  const table = createTableBlock(2, 2, "Định lượng");
  table.cells = [["Nguyên liệu", "Số lượng"], ["Sữa đặc", "40ml"]];
  card.blocks = [t, table];
  map.cards[card.id] = card;
  latte.cardId = card.id;
  return { map, menu, latte, card, t, table };
}

describe("KW2 — dựng mục chỉ mục từ map", () => {
  it("node (chữ + ghi chú + đường đi), card (tên) và từng khối (đoạn văn, bảng)", () => {
    const { map, latte, card, t, table } = coffeeMap();
    const entries = buildMapEntries(map);
    const nodeE = entries.find((e) => e.kind === "node" && e.id === latte.id)!;
    expect(nodeE).toMatchObject({ title: "Cà phê sữa", body: "Bán chạy nhất vào buổi sáng", context: "Quán cà phê › Thực đơn", mapTitle: "Quán cà phê" });
    expect(entries.find((e) => e.kind === "card")).toMatchObject({ id: card.id, title: "Công thức cà phê sữa" });
    const blocks = entries.filter((e) => e.kind === "block");
    expect(blocks.map((b) => b.blockId)).toEqual([t.id, table.id]);
    expect(blocks[0]).toMatchObject({ cardId: card.id, context: "Công thức cà phê sữa", title: expect.stringMatching(/^Đoạn: /) });
    expect(blocks[1]!.body).toContain("Sữa đặc · 40ml");
    expect(blocks[0]!.links).toEqual([{ type: "card", id: "other", blockId: null }]);
  });

  it("khối trống không có liên kết thì bỏ qua", () => {
    const map = createEmptyMap("M");
    const c = createCard("Trống");
    c.blocks = [createTextBlock("   ")];
    map.cards[c.id] = c;
    expect(buildMapEntries(map).filter((e) => e.kind === "block")).toEqual([]);
  });
});

describe("KW2 — tìm kiếm", () => {
  const setup = () => {
    const idx = new KnowledgeIndex();
    const a = coffeeMap();
    idx.set(buildMapIndex(a.map, 1));
    const m2 = createEmptyMap("Kế hoạch marketing");
    addNode(m2, "Quảng cáo cafe", m2.rootId);
    addNode(m2, "Ngân sách", m2.rootId, "Chi cho cà phê miễn phí 5 triệu");
    idx.set(buildMapIndex(m2, 2));
    return { idx, a, m2 };
  };

  it("không dấu, mọi từ phải có mặt; 'cafe' ra 'Cà phê' ở mọi map khi gõ 'ca phe'", () => {
    const { idx } = setup();
    const hits = idx.search("ca phe");
    const maps = new Set(hits.map((h) => h.entry.mapTitle));
    expect(maps).toEqual(new Set(["Quán cà phê", "Kế hoạch marketing"]));
    expect(idx.search("cafe").map((h) => h.entry.title)).toContain("Quảng cáo cafe");
    expect(idx.search("sua dac 40").map((h) => h.entry.kind)).toEqual(["block", "block"]); // đoạn văn + bảng
    expect(idx.search("sua khong-co-tu-nay")).toEqual([]);
    expect(idx.search("   ")).toEqual([]);
  });

  it("tên khớp xếp trước nội dung; khớp đầu tên xếp trước khớp giữa", () => {
    const { idx } = setup();
    const titles = idx.search("ca phe").map((h) => h.entry.title);
    expect(titles[0]).toMatch(/^Cà phê sữa$|^Công thức cà phê sữa$/); // khớp trong tên
    const body = idx.search("ca phe").findIndex((h) => h.entry.title === "Ngân sách"); // chỉ khớp ghi chú
    const inTitle = idx.search("ca phe").findIndex((h) => h.entry.title === "Cà phê sữa");
    expect(inTitle).toBeLessThan(body);
  });

  it("lọc theo loại; giới hạn số kết quả", () => {
    const { idx } = setup();
    expect(idx.search("ca phe", { kinds: ["card"] }).every((h) => h.entry.kind === "card")).toBe(true);
    expect(idx.search("ca phe", { limit: 2 })).toHaveLength(2);
  });

  it("card dùng chung nhiều map chỉ hiện MỘT lần, kèm danh sách map; map đang mở được ưu tiên", () => {
    const idx = new KnowledgeIndex();
    const a = coffeeMap();
    const b = createEmptyMap("Bản sao");
    b.cards[a.card.id] = structuredClone(a.card);
    idx.set(buildMapIndex(a.map, 1));
    idx.set(buildMapIndex(b, 2));
    const hits = idx.search("cong thuc", { kinds: ["card"], currentMapId: b.mapId });
    expect(hits).toHaveLength(1);
    expect(hits[0]!.maps.map((m) => m.mapTitle).sort()).toEqual(["Bản sao", "Quán cà phê"]);
    expect(hits[0]!.entry.mapId).toBe(b.mapId);
    // node cùng tên ở hai map vẫn là hai kết quả riêng
    const m3 = createEmptyMap("Hai");
    const m4 = createEmptyMap("Ba");
    addNode(m3, "Trùng tên", m3.rootId);
    addNode(m4, "Trùng tên", m4.rootId);
    const i2 = new KnowledgeIndex();
    i2.set(buildMapIndex(m3, 1));
    i2.set(buildMapIndex(m4, 1));
    expect(i2.search("trung ten", { kinds: ["node"] })).toHaveLength(2);
  });

  it("quản lý chỉ mục: stamp, thay map, bỏ map đã xoá (retain), đếm mục", () => {
    const { idx, a, m2 } = setup();
    expect(idx.stampOf(a.map.mapId)).toBe(1);
    expect(idx.has(m2.mapId)).toBe(true);
    const before = idx.size;
    idx.retain([a.map.mapId]);
    expect(idx.mapIds()).toEqual([a.map.mapId]);
    expect(idx.size).toBeLessThan(before);
    idx.set(buildMapIndex(a.map, 7));
    expect(idx.stampOf(a.map.mapId)).toBe(7);
    idx.remove(a.map.mapId);
    expect(idx.size).toBe(0);
  });

  it("điểm: thiếu từ nào là loại; khớp nguyên tên được cộng điểm", () => {
    const { a } = setup();
    const e = buildMapEntries(a.map).find((x) => x.kind === "node" && x.title === "Cà phê sữa")!;
    expect(scoreEntry(e, queryTokens("ca phe sua"))).not.toBeNull();
    expect(scoreEntry(e, queryTokens("ca phe tra"))).toBeNull();
    expect(scoreEntry(e, queryTokens("ca phe sua"))!).toBeLessThan(scoreEntry(e, queryTokens("phe"))!);
  });
});

describe("KW2 — liên kết ngược xuyên map", () => {
  it("khối ở map khác trỏ tới card; bỏ card đã có ở map đang mở; liên kết khối cũng tính", () => {
    const target = createCard("Giá điện");
    target.blocks = [createTextBlock("1.200 đ/kWh")];
    const mapA = createEmptyMap("Dự án A");
    mapA.cards[target.id] = target;
    const mapB = createEmptyMap("Dự án B");
    const ref = createCard("Báo cáo B");
    ref.blocks = [createTextBlock(`Theo ${makeLinkToken("card", target.id, "Giá điện", target.blocks[0]!.id)} thì lãi.`)];
    mapB.cards[ref.id] = ref;
    mapB.cards[target.id] = structuredClone(target);
    const mapC = createEmptyMap("Dự án C");
    const ref2 = createCard("Ghi chú C");
    ref2.blocks = [createTextBlock(makeLinkToken("card", target.id, "Giá điện"))];
    mapC.cards[ref2.id] = ref2;
    const idx = new KnowledgeIndex();
    for (const [i, m] of [mapA, mapB, mapC].entries()) idx.set(buildMapIndex(m, i));
    const all = idx.backlinksToCard(target.id);
    expect(all.map((b) => b.cardTitle).sort()).toEqual(["Báo cáo B", "Ghi chú C"]);
    // đang mở map A (chỉ có card đích): cả hai đều là "map khác"
    expect(idx.backlinksToCard(target.id, new Set(Object.keys(mapA.cards)))).toHaveLength(2);
    // đang mở map B: card "Báo cáo B" đã nằm trong map này → bỏ khỏi danh sách xuyên map
    expect(idx.backlinksToCard(target.id, new Set(Object.keys(mapB.cards))).map((b) => b.cardTitle)).toEqual(["Ghi chú C"]);
    expect(all[0]!.maps[0]!.mapTitle).toMatch(/Dự án/);
  });
});

describe("KW2 — tô sáng và trích đoạn", () => {
  it("tô sáng không dấu mà vẫn cắt đúng chữ gốc có dấu", () => {
    const parts = highlightParts("Công thức cà phê sữa", queryTokens("ca phe"));
    expect(parts.map((p) => p.text).join("")).toBe("Công thức cà phê sữa");
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["cà", "phê"]);
    expect(highlightParts("Đường đi", queryTokens("duong")).find((p) => p.hit)!.text).toBe("Đường");
    expect(highlightParts("abc", [])).toEqual([{ text: "abc", hit: false }]);
    expect(highlightParts("", ["a"])).toEqual([]);
  });

  it("trích đoạn quanh chỗ khớp, có dấu … hai đầu khi cắt", () => {
    const body = `${"x".repeat(200)} cà phê sữa đặc ${"y".repeat(200)}`;
    const s = bodySnippet(body, queryTokens("ca phe"), 60);
    expect(s).toContain("cà phê");
    expect(s.startsWith("…") && s.endsWith("…")).toBe(true);
    expect(bodySnippet("ngắn thôi", queryTokens("ngan"))).toBe("ngắn thôi");
  });
});
