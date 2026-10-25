import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./tree";
import { Store } from "./store";
import {
  base64Bytes,
  boundsOf,
  cardFromAreaHighlight,
  cardFromTextHighlight,
  cleanQuote,
  generateHighlightId,
  generateSourceId,
  highlightsByPage,
  mergeLineRects,
  normalizeRect,
  sanitizeSources,
  sourceOfCard,
} from "./sources";
import { AddHighlightCommand, AddSourceCommand, RemoveHighlightCommand, RemoveSourceCommand, RenameSourceCommand, SetHighlightColorCommand } from "./sourceCommands";
import { parseJsonFile, exportFlatJson } from "../io/json";
import { exportT17mFile, parseT17mFile } from "../io/t17m";
import { validateCard } from "./cards";
import type { PdfHighlight, Source } from "./types";

const PDF_B64 = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF").toString("base64");

function setup() {
  const map = createEmptyMap("Gốc");
  const source: Source = { id: generateSourceId(), kind: "pdf", name: "Giáo trình.pdf", assetId: "asset_pdf1", pages: 12, highlights: [] };
  const store = new Store(map);
  store.dispatch(new AddSourceCommand(source, { mimeType: "application/pdf", dataBase64: PDF_B64 }));
  const hl = (page = 3, text = "Đoạn văn cần ghi nhớ"): PdfHighlight => ({
    id: generateHighlightId(),
    page,
    kind: "text",
    rects: [{ x: 0.1, y: 0.2, w: 0.5, h: 0.03 }],
    text,
    color: "#ffe066",
    cardId: null,
    createdAt: 1,
  });
  return { store, source, hl, m: () => store.getMap() };
}

describe("hình chữ nhật chuẩn hoá", () => {
  it("quy về 0..1 theo trang, kẹp trong trang, bỏ hình suy biến", () => {
    const n = normalizeRect({ left: 50, top: 100, width: 200, height: 20 }, { width: 500, height: 1000 })!;
    expect([n.x, n.y, n.w, n.h].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([0.1, 0.1, 0.4, 0.02]);
    const clipped = normalizeRect({ left: -50, top: 990, width: 700, height: 100 }, { width: 500, height: 1000 })!;
    expect(clipped.x).toBe(0);
    expect(clipped.x + clipped.w).toBeLessThanOrEqual(1);
    expect(clipped.y + clipped.h).toBeLessThanOrEqual(1);
    expect(normalizeRect({ left: 10, top: 10, width: 0, height: 10 }, { width: 500, height: 1000 })).toBeNull();
    expect(normalizeRect({ left: 10, top: 10, width: 10, height: 10 }, { width: 0, height: 0 })).toBeNull();
  });
  it("normalizeRect đảo ngược được theo mọi mức phóng to (cùng kết quả)", () => {
    const a = normalizeRect({ left: 60, top: 120, width: 240, height: 24 }, { width: 600, height: 800 })!;
    const b = normalizeRect({ left: 120, top: 240, width: 480, height: 48 }, { width: 1200, height: 1600 })!;
    expect(a.x).toBeCloseTo(b.x, 9);
    expect(a.w).toBeCloseTo(b.w, 9);
    expect(a.h).toBeCloseTo(b.h, 9);
  });
  it("mergeLineRects gộp mảnh cùng dòng, giữ các dòng riêng, bỏ mảnh nằm gọn trong mảnh khác", () => {
    const r = (x: number, y: number, w: number, h = 0.02) => ({ x, y, w, h });
    const merged = mergeLineRects([r(0.1, 0.2, 0.1), r(0.21, 0.2005, 0.15), r(0.1, 0.25, 0.3), r(0.12, 0.2, 0.05), r(0.7, 0.2, 0.1)]);
    expect(merged).toHaveLength(3);
    expect(merged[0]!.x).toBeCloseTo(0.1);
    expect(merged[0]!.x + merged[0]!.w).toBeCloseTo(0.36);
    expect(merged[1]!.x).toBeCloseTo(0.7); // xa quá → không gộp
    expect(merged[2]!.y).toBeCloseTo(0.25);
    expect(mergeLineRects([])).toEqual([]);
  });
  it("boundsOf", () => {
    expect(boundsOf([{ x: 0.1, y: 0.2, w: 0.1, h: 0.1 }, { x: 0.5, y: 0.6, w: 0.2, h: 0.1 }])).toEqual({ x: 0.1, y: 0.2, w: expect.closeTo(0.6), h: expect.closeTo(0.5) });
    expect(boundsOf([])).toBeNull();
  });
});

describe("chữ trích", () => {
  it("nối từ bị gạch nối cuối dòng, gộp xuống dòng và khoảng trắng", () => {
    expect(cleanQuote("trí nhớ ngắn-\nhạn rất   quan\ntrọng ")).toBe("trí nhớ ngắnhạn rất quan trọng");
    expect(cleanQuote("A - B\nC")).toBe("A - B C"); // gạch nối có khoảng trắng hai bên không bị nối
    expect(cleanQuote("so­ft")).toBe("soft");
  });
});

describe("Command nguồn", () => {
  it("thêm nguồn ghi cả file PDF vào assets; undo/redo", () => {
    const { store, source, m } = setup();
    expect(m().sources![source.id]!.name).toBe("Giáo trình.pdf");
    expect(m().assets[source.assetId!]!.mimeType).toBe("application/pdf");
    store.undo();
    expect(m().sources).toBeUndefined();
    expect(m().assets[source.assetId!]).toBeUndefined();
    store.redo();
    expect(m().sources![source.id]).toBeDefined();
  });
  it("tô sáng chữ tạo card có trích dẫn + liên kết hai chiều trong MỘT bước hoàn tác", () => {
    const { store, source, hl, m } = setup();
    const h = hl();
    const card = cardFromTextHighlight(source, h);
    store.dispatch(new AddHighlightCommand(source.id, h, card));
    const stored = m().sources![source.id]!.highlights[0]!;
    expect(stored.cardId).toBe(card.id);
    const c = m().cards[card.id]!;
    expect(c.source).toEqual({ sourceId: source.id, highlightId: h.id });
    expect(c.blocks[0]).toMatchObject({ type: "text" });
    expect((c.blocks[0] as { text: string }).text).toContain("> Đoạn văn cần ghi nhớ");
    expect((c.blocks[0] as { text: string }).text).toContain("tr. 3");
    expect(sourceOfCard(m(), c)).toMatchObject({ highlight: { page: 3 } });
    expect(validateCard(c, m().assets)).toEqual([]);
    store.undo();
    expect(m().cards[card.id]).toBeUndefined();
    expect(m().sources![source.id]!.highlights).toHaveLength(0);
  });
  it("vùng chọn thành ảnh: ghi ảnh + card có khối ảnh; undo dọn sạch ảnh", () => {
    const { store, source, m } = setup();
    const h: PdfHighlight = { ...{ id: generateHighlightId(), page: 5, kind: "area", rects: [{ x: 0.1, y: 0.1, w: 0.5, h: 0.4 }], text: "", color: "#74c0fc", cardId: null, createdAt: 2 } };
    const image = { id: "img_crop1", asset: { mimeType: "image/png", dataBase64: "QQ==", width: 300, height: 200 } };
    const card = cardFromAreaHighlight(source, h, image.id);
    store.dispatch(new AddHighlightCommand(source.id, h, card, image));
    expect(m().assets.img_crop1).toBeDefined();
    expect(m().cards[card.id]!.blocks[0]).toMatchObject({ type: "image", assetId: "img_crop1" });
    expect(validateCard(m().cards[card.id]!, m().assets)).toEqual([]);
    store.undo();
    expect(m().assets.img_crop1).toBeUndefined();
  });
  it("xoá vùng tô sáng: card còn nhưng mất liên kết; undo khôi phục đúng vị trí và liên kết", () => {
    const { store, source, hl, m } = setup();
    const h1 = hl(1, "một");
    const h2 = hl(2, "hai");
    const c2 = cardFromTextHighlight(source, h2);
    store.dispatch(new AddHighlightCommand(source.id, h1));
    store.dispatch(new AddHighlightCommand(source.id, h2, c2));
    store.dispatch(new RemoveHighlightCommand(source.id, h1.id));
    expect(m().sources![source.id]!.highlights.map((x) => x.page)).toEqual([2]);
    store.dispatch(new RemoveHighlightCommand(source.id, h2.id));
    expect(m().cards[c2.id]).toBeDefined();
    expect(m().cards[c2.id]!.source).toBeUndefined();
    store.undo();
    expect(m().cards[c2.id]!.source).toEqual({ sourceId: source.id, highlightId: h2.id });
    store.undo();
    expect(m().sources![source.id]!.highlights.map((x) => x.page)).toEqual([1, 2]);
  });
  it("xoá nguồn: file PDF mất, card giữ đoạn trích nhưng mất liên kết; undo khôi phục tất cả", () => {
    const { store, source, hl, m } = setup();
    const h = hl();
    const card = cardFromTextHighlight(source, h);
    store.dispatch(new AddHighlightCommand(source.id, h, card));
    store.dispatch(new RemoveSourceCommand(source.id));
    expect(m().sources).toBeUndefined();
    expect(m().assets[source.assetId!]).toBeUndefined();
    expect(m().cards[card.id]!.source).toBeUndefined();
    expect((m().cards[card.id]!.blocks[0] as { text: string }).text).toContain("Đoạn văn cần ghi nhớ");
    store.undo();
    expect(m().assets[source.assetId!]).toBeDefined();
    expect(m().cards[card.id]!.source).toBeDefined();
    expect(m().sources![source.id]!.highlights).toHaveLength(1);
  });
  it("đổi màu, đổi tên: undo được", () => {
    const { store, source, hl, m } = setup();
    const h = hl();
    store.dispatch(new AddHighlightCommand(source.id, h));
    store.dispatch(new SetHighlightColorCommand(source.id, h.id, "#8ce99a"));
    store.dispatch(new RenameSourceCommand(source.id, "Tên mới"));
    expect(m().sources![source.id]!.highlights[0]!.color).toBe("#8ce99a");
    expect(m().sources![source.id]!.name).toBe("Tên mới");
    store.undo();
    store.undo();
    expect(m().sources![source.id]!.highlights[0]!.color).toBe("#ffe066");
    expect(m().sources![source.id]!.name).toBe("Giáo trình.pdf");
  });
  it("tra cứu theo trang", () => {
    const { store, source, hl, m } = setup();
    store.dispatch(new AddHighlightCommand(source.id, hl(2)));
    store.dispatch(new AddHighlightCommand(source.id, hl(2)));
    store.dispatch(new AddHighlightCommand(source.id, hl(7)));
    const by = highlightsByPage(m().sources![source.id]!);
    expect(by.get(2)).toHaveLength(2);
    expect(by.get(7)).toHaveLength(1);
    expect(by.get(1)).toBeUndefined();
  });
  it("dung lượng base64", () => {
    expect(base64Bytes(Buffer.from("abcd").toString("base64"))).toBe(4);
    expect(base64Bytes(Buffer.from("abcde").toString("base64"))).toBe(5);
    expect(base64Bytes("")).toBe(0);
  });
});

describe("lưu / đọc", () => {
  function withData() {
    const s = setup();
    const h = s.hl();
    s.store.dispatch(new AddHighlightCommand(s.source.id, h, cardFromTextHighlight(s.source, h)));
    return { ...s, h };
  }
  it("JSON round-trip giữ nguồn, PDF, vùng tô sáng và liên kết card", () => {
    const { m, source, h } = withData();
    const res = parseJsonFile(exportFlatJson(m()));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.map.sources![source.id]!.highlights[0]!.rects).toEqual(h.rects);
    expect(res.map.assets[source.assetId!]!.dataBase64).toBe(PDF_B64);
    const card = Object.values(res.map.cards)[0]!;
    expect(sourceOfCard(res.map, card)).not.toBeNull();
  });
  it(".t17m round-trip: PDF được tách thành file nhị phân và đọc lại đúng từng byte", async () => {
    const { m, source } = withData();
    const blob = await exportT17mFile(m());
    const res = await parseT17mFile(await blob.arrayBuffer());
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.map.assets[source.assetId!]!.mimeType).toBe("application/pdf");
    expect(res.map.assets[source.assetId!]!.dataBase64).toBe(PDF_B64);
    expect(res.map.sources![source.id]!.pages).toBe(12);
  });
  it("làm sạch dữ liệu hỏng: nguồn thiếu PDF, vùng sai hình, id trùng, liên kết card mồ côi, màu sai", () => {
    const { m, source, h } = withData();
    const raw = JSON.parse(exportFlatJson(m())) as Record<string, any>;
    raw.sources[source.id].highlights.push({ ...h }); // trùng id
    raw.sources[source.id].highlights.push({ id: "x1", page: 0, kind: "text", rects: [{ x: 0, y: 0, w: 1, h: 1 }], text: "", color: "#fff", cardId: null, createdAt: 0 });
    raw.sources[source.id].highlights.push({ id: "x2", page: 2, kind: "text", rects: [{ x: 0, y: 0, w: -1, h: 1 }], text: "", color: "#fff", cardId: null, createdAt: 0 });
    raw.sources[source.id].highlights.push({ id: "x3", page: 2, kind: "area", rects: [{ x: 0.9, y: 0.9, w: 0.5, h: 0.5 }], text: 5, color: "đỏ", cardId: "khong-co", createdAt: "x" });
    raw.sources["src_hong"] = { id: "src_hong", kind: "pdf", name: "x", assetId: "khong-co", pages: 1, highlights: [] };
    const clean = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
    sanitizeSources(clean);
    const srcs = clean.sources as Record<string, Source>;
    expect(Object.keys(srcs)).toEqual([source.id]);
    const hs = srcs[source.id]!.highlights;
    expect(hs.map((x) => x.id)).toEqual([h.id, "x3"]);
    const x3 = hs[1]!;
    expect(x3.color).toBe("#ffe066");
    expect(x3.text).toBe("");
    expect(x3.cardId).toBeNull();
    expect(x3.rects[0]!.x + x3.rects[0]!.w).toBeLessThanOrEqual(1);
    expect(x3.rects[0]!.y + x3.rects[0]!.h).toBeLessThanOrEqual(1);
  });
  it("card.source mồ côi bị xoá khi đọc; map không có nguồn không thêm khoá lạ", () => {
    const { m } = withData();
    const raw = JSON.parse(exportFlatJson(m())) as Record<string, any>;
    const cardId = Object.keys(raw.cards)[0]!;
    raw.cards[cardId].source = { sourceId: "khong-co", highlightId: "x" };
    const res = parseJsonFile(JSON.stringify(raw));
    expect(res.ok).toBe(true);
    if (res.ok) expect(Object.values(res.map.cards)[0]!.source).toBeUndefined();
    const plain = parseJsonFile(exportFlatJson(createEmptyMap("X")));
    expect(plain.ok && plain.map.sources === undefined).toBe(true);
  });
});

import { isLinkedSource, sourceFileState } from "./sources";
import { ChangeSourceStorageCommand } from "./sourceCommands";
import { isHash, sameHash, sha256Hex } from "./hash";

describe("mã băm", () => {
  it("SHA-256 đúng giá trị chuẩn; cùng nội dung → cùng mã, khác → khác", async () => {
    const a = await sha256Hex(new TextEncoder().encode("abc"));
    expect(a).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await sha256Hex(new TextEncoder().encode("abc"))).toBe(a);
    expect(await sha256Hex(new TextEncoder().encode("abd"))).not.toBe(a);
    expect(isHash(a)).toBe(true);
  });
  it("sameHash chỉ đúng khi cùng nội dung và cùng kiểu băm; rác/thiếu → false", () => {
    const h = "a".repeat(64);
    expect(sameHash(h, h)).toBe(true);
    expect(sameHash(h, "b".repeat(64))).toBe(false);
    expect(sameHash(h, "fnv:0123456789abcdef")).toBe(false);
    expect(sameHash("fnv:0123456789abcdef", "fnv:0123456789abcdef")).toBe(true);
    expect(sameHash(undefined, h)).toBe(false);
    expect(sameHash("xyz", "xyz")).toBe(false);
  });
});

describe("nguồn liên kết (chỉ giữ đường dẫn)", () => {
  const linked = (): Source => ({ id: generateSourceId(), kind: "pdf", name: "Ngoài.pdf", assetId: null, path: "D:\\Tài liệu\\Ngoài.pdf", sha256: "c".repeat(64), size: 1234, pages: 7, highlights: [] });

  it("thêm nguồn liên kết KHÔNG ghi dữ liệu PDF vào map; undo/redo; chặn cấu hình sai", () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s = linked();
    store.dispatch(new AddSourceCommand(s, null));
    expect(Object.keys(store.getMap().assets)).toEqual([]);
    expect(isLinkedSource(store.getMap().sources![s.id]!)).toBe(true);
    store.undo();
    expect(store.getMap().sources).toBeUndefined();
    store.redo();
    expect(store.getMap().sources![s.id]!.path).toBe("D:\\Tài liệu\\Ngoài.pdf");
    expect(() => new AddSourceCommand(s, { mimeType: "application/pdf", dataBase64: "QQ==" })).toThrow();
    expect(() => new AddSourceCommand({ ...s, assetId: "a1" }, null)).toThrow();
    expect(() => new AddSourceCommand({ ...s, path: undefined }, null)).toThrow();
  });
  it("trạng thái file: ok / missing / changed; nguồn nhúng luôn ok", () => {
    const s = linked();
    expect(sourceFileState(s, { found: true, sha256: s.sha256 })).toBe("ok");
    expect(sourceFileState(s, { found: false })).toBe("missing");
    expect(sourceFileState(s, { found: true, sha256: "d".repeat(64) })).toBe("changed");
    expect(sourceFileState({ assetId: null }, { found: true })).toBe("ok"); // nguồn cũ không có mã băm → không kết luận "đã đổi"
    expect(sourceFileState({ assetId: "a", sha256: "e".repeat(64) }, { found: false })).toBe("ok");
  });
  it("xoá nguồn liên kết và hoàn tác không đụng assets", () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s = linked();
    store.dispatch(new AddSourceCommand(s, null));
    store.dispatch(new RemoveSourceCommand(s.id));
    expect(store.getMap().sources).toBeUndefined();
    store.undo();
    expect(store.getMap().sources![s.id]).toBeDefined();
    expect(Object.keys(store.getMap().assets)).toEqual([]);
  });
  it("chuyển liên kết → nhúng: ghi asset, bỏ path; undo trả lại đúng như cũ (giữ vùng tô sáng)", () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s = linked();
    store.dispatch(new AddSourceCommand(s, null));
    store.dispatch(new AddHighlightCommand(s.id, { id: "h1", page: 2, kind: "text", rects: [{ x: 0, y: 0, w: 0.1, h: 0.1 }], text: "t", color: "#fff", cardId: null, createdAt: 0 }));
    store.dispatch(new ChangeSourceStorageCommand(s.id, { assetId: "asset_new", path: null, sha256: "f".repeat(64), size: 99, pages: 7 }, { mimeType: "application/pdf", dataBase64: PDF_B64 }));
    const m = () => store.getMap().sources![s.id]!;
    expect(m().assetId).toBe("asset_new");
    expect(m().path).toBeUndefined();
    expect(store.getMap().assets.asset_new!.dataBase64).toBe(PDF_B64);
    expect(m().highlights).toHaveLength(1);
    store.undo();
    expect(m().assetId).toBeNull();
    expect(m().path).toBe("D:\\Tài liệu\\Ngoài.pdf");
    expect(m().sha256).toBe("c".repeat(64));
    expect(store.getMap().assets.asset_new).toBeUndefined();
  });
  it("chuyển nhúng → liên kết: gỡ asset, ghi path; undo khôi phục asset", () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s: Source = { id: generateSourceId(), kind: "pdf", name: "X", assetId: "asset_x", pages: 3, highlights: [] };
    store.dispatch(new AddSourceCommand(s, { mimeType: "application/pdf", dataBase64: PDF_B64 }));
    store.dispatch(new ChangeSourceStorageCommand(s.id, { assetId: null, path: "E:\\x.pdf", sha256: "a".repeat(64), size: 10, pages: 3 }));
    expect(store.getMap().assets.asset_x).toBeUndefined();
    expect(store.getMap().sources![s.id]).toMatchObject({ assetId: null, path: "E:\\x.pdf", size: 10 });
    store.undo();
    expect(store.getMap().assets.asset_x!.dataBase64).toBe(PDF_B64);
    expect(store.getMap().sources![s.id]!.path).toBeUndefined();
    expect(store.getMap().sources![s.id]!.sha256).toBeUndefined();
  });
  it("trỏ lại đường dẫn khác (chọn lại file): chỉ đổi path/mã băm/trang, undo trả lại", () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s = linked();
    store.dispatch(new AddSourceCommand(s, null));
    store.dispatch(new ChangeSourceStorageCommand(s.id, { assetId: null, path: "F:\\moi\\Ngoai.pdf", sha256: "b".repeat(64), size: 5, pages: 9 }));
    expect(store.getMap().sources![s.id]).toMatchObject({ path: "F:\\moi\\Ngoai.pdf", pages: 9 });
    store.undo();
    expect(store.getMap().sources![s.id]).toMatchObject({ path: "D:\\Tài liệu\\Ngoài.pdf", pages: 7, sha256: "c".repeat(64) });
  });
  it("JSON/.t17m round-trip nguồn liên kết; làm sạch: thiếu path bị loại, mã băm rác bị bỏ", async () => {
    const map = createEmptyMap("G");
    const store = new Store(map);
    const s = linked();
    store.dispatch(new AddSourceCommand(s, null));
    const res = parseJsonFile(exportFlatJson(store.getMap()));
    expect(res.ok && res.map.sources![s.id]!.path).toBe("D:\\Tài liệu\\Ngoài.pdf");
    const t = await parseT17mFile(await (await exportT17mFile(store.getMap())).arrayBuffer());
    expect(t.ok && t.map.sources![s.id]!.sha256).toBe("c".repeat(64));
    const raw = JSON.parse(exportFlatJson(store.getMap())) as Record<string, any>;
    raw.sources.src_a = { id: "src_a", kind: "pdf", name: "a", assetId: null, pages: 1, highlights: [] };
    raw.sources[s.id].sha256 = "không phải mã băm";
    raw.sources[s.id].size = "x";
    sanitizeSources(raw);
    expect(Object.keys(raw.sources)).toEqual([s.id]);
    expect(raw.sources[s.id].sha256).toBeUndefined();
    expect(raw.sources[s.id].size).toBeUndefined();
  });
});
