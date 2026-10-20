import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode, deepClone } from "./tree";
import { Store } from "./store";
import { MergeMapCommand } from "./commands";
import {
  CreateCardForNodeCommand,
  AttachCardToNodeCommand,
  DetachCardFromNodeCommand,
  DeleteCardCommand,
  RenameCardCommand,
  AddBlockCommand,
  ReplaceBlockCommand,
  RemoveBlockCommand,
  MoveBlockCommand,
  UpdateTableCommand,
  touchCard,
} from "./cardCommands";
import { createDraft, setCell, insertRow, insertColumn, deleteColumn, pasteGrid, tableFromGrid, parseDelimited } from "./table";
import { createCard, createTextBlock, createTableBlock, createImageBlock, createChartBlock, validateCard } from "./cards";
import { validateMindMap } from "./validate";
import { migrateToLatest } from "./migrate";
import type { MindMap, TableBlock } from "./types";
import { CURRENT_SCHEMA_VERSION } from "./types";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function setup() {
  const map = createEmptyMap("Gốc");
  const child = createNode("Con", map.rootId);
  map.nodes[child.id] = child;
  map.nodes[map.rootId]!.children.push(child.id);
  const store = new Store(map);
  return { store, rootId: map.rootId, childId: child.id };
}

/** So khớp nội dung map; bỏ qua updatedAt/rev của card (KW0: hai trường này cố ý tăng cả khi hoàn tác). */
const snap = (m: MindMap) => JSON.stringify(m, (k, v) => (k === "updatedAt" || k === "rev" ? undefined : v));

describe("Card & Block — Command + undo/redo (M1)", () => {
  it("tạo card cho node, thêm các khối, rồi undo từng bước về đúng trạng thái ban đầu", () => {
    const { store, childId } = setup();
    const s0 = snap(store.getMap());

    const card = createCard("Ghi chú A");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    const t = createTableBlock(2, 3, "Doanh thu");
    store.dispatch(new AddBlockCommand(card.id, createTextBlock("Xin chào")));
    store.dispatch(new AddBlockCommand(card.id, t));
    store.dispatch(new AddBlockCommand(card.id, createChartBlock(t.id, "line")));

    const m = store.getMap();
    expect(m.nodes[childId]!.cardId).toBe(card.id);
    expect(m.cards[card.id]!.blocks.map((b) => b.type)).toEqual(["text", "table", "chart"]);
    expect(validateMindMap(m)).toEqual([]);

    store.undo();
    store.undo();
    store.undo();
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
    store.redo();
    store.redo();
    store.redo();
    store.redo();
    expect(store.getMap().cards[card.id]!.blocks).toHaveLength(3);
  });

  it("sửa khối, đổi tên, di chuyển khối — undo khôi phục chính xác", () => {
    const { store, childId } = setup();
    const card = createCard("X");
    const a = createTextBlock("a");
    const b = createTextBlock("b");
    const c = createTextBlock("c");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    for (const x of [a, b, c]) store.dispatch(new AddBlockCommand(card.id, x));
    const s1 = snap(store.getMap());

    store.dispatch(new ReplaceBlockCommand(card.id, { ...a, text: "a2" }));
    store.dispatch(new RenameCardCommand(card.id, "Y"));
    store.dispatch(new MoveBlockCommand(card.id, a.id, 2));
    expect(store.getMap().cards[card.id]!.blocks.map((x) => x.id)).toEqual([b.id, c.id, a.id]);
    expect((store.getMap().cards[card.id]!.blocks[2] as { text: string }).text).toBe("a2");
    expect(store.getMap().cards[card.id]!.title).toBe("Y");

    store.undo();
    store.undo();
    store.undo();
    expect(snap(store.getMap())).toBe(s1);
  });

  it("xoá bảng kéo theo xoá biểu đồ phụ thuộc; undo trả lại cả hai", () => {
    const { store, childId } = setup();
    const card = createCard("T");
    const t = createTableBlock(2, 2);
    const ch = createChartBlock(t.id);
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    store.dispatch(new AddBlockCommand(card.id, t));
    store.dispatch(new AddBlockCommand(card.id, ch));
    const s1 = snap(store.getMap());

    store.dispatch(new RemoveBlockCommand(card.id, t.id));
    expect(store.getMap().cards[card.id]!.blocks).toHaveLength(0);
    expect(validateMindMap(store.getMap())).toEqual([]);
    store.undo();
    expect(snap(store.getMap())).toBe(s1);
  });

  it("khối ảnh: thêm ghi dữ liệu vào map.assets; xoá khối dọn ảnh nếu không ai dùng; undo trả lại", () => {
    const { store, childId } = setup();
    const card = createCard("Ảnh");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    const img = createImageBlock("img_c1", "Chú thích");
    store.dispatch(new AddBlockCommand(card.id, img, null, { assetId: "img_c1", asset: { mimeType: "image/png", dataBase64: PNG } }));
    expect(store.getMap().assets["img_c1"]?.dataBase64).toBe(PNG);
    const s1 = snap(store.getMap());

    store.dispatch(new RemoveBlockCommand(card.id, img.id));
    expect(store.getMap().assets["img_c1"]).toBeUndefined();
    store.undo();
    expect(snap(store.getMap())).toBe(s1);
  });

  it("ảnh dùng chung bởi 2 card: xoá khối ở card 1 KHÔNG xoá dữ liệu ảnh", () => {
    const { store, childId, rootId } = setup();
    const c1 = createCard("1");
    const c2 = createCard("2");
    store.dispatch(new CreateCardForNodeCommand(childId, c1));
    store.dispatch(new CreateCardForNodeCommand(rootId, c2));
    const i1 = createImageBlock("img_s", "");
    const i2 = createImageBlock("img_s", "");
    store.dispatch(new AddBlockCommand(c1.id, i1, null, { assetId: "img_s", asset: { mimeType: "image/png", dataBase64: PNG } }));
    store.dispatch(new AddBlockCommand(c2.id, i2));
    store.dispatch(new RemoveBlockCommand(c1.id, i1.id));
    expect(store.getMap().assets["img_s"]).toBeDefined();
    expect(validateMindMap(store.getMap())).toEqual([]);
  });

  it("gắn/gỡ card: nhiều node dùng chung một card; DeleteCard gỡ khỏi mọi node và undo trả lại hết", () => {
    const { store, childId, rootId } = setup();
    const card = createCard("Chung");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    store.dispatch(new AttachCardToNodeCommand(rootId, card.id));
    expect(store.getMap().nodes[rootId]!.cardId).toBe(card.id);
    store.dispatch(new DetachCardFromNodeCommand(rootId));
    expect(store.getMap().nodes[rootId]!.cardId).toBeNull();
    expect(store.getMap().cards[card.id]).toBeDefined(); // card vẫn còn
    store.dispatch(new AttachCardToNodeCommand(rootId, card.id));
    const s1 = snap(store.getMap());

    store.dispatch(new DeleteCardCommand(card.id));
    expect(store.getMap().cards[card.id]).toBeUndefined();
    expect(store.getMap().nodes[rootId]!.cardId).toBeNull();
    expect(store.getMap().nodes[childId]!.cardId).toBeNull();
    expect(validateMindMap(store.getMap())).toEqual([]);
    store.undo();
    expect(snap(store.getMap())).toBe(s1);
  });

  it("lỗi dữ liệu bị từ chối: thêm khối trùng id, sửa khối không tồn tại, card không tồn tại", () => {
    const { store, childId } = setup();
    const card = createCard("E");
    const a = createTextBlock("a");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    store.dispatch(new AddBlockCommand(card.id, a));
    expect(() => store.dispatch(new AddBlockCommand(card.id, a))).toThrow();
    expect(() => store.dispatch(new ReplaceBlockCommand(card.id, createTextBlock("x")))).toThrow();
    expect(() => store.dispatch(new AttachCardToNodeCommand(childId, "card_khong_co"))).toThrow();
  });
});

describe("Card & Block — validate (M1)", () => {
  it("bắt tham chiếu mồ côi và bảng méo", () => {
    const { childId } = setup();
    const map = createEmptyMap("V");
    const child = createNode("c", map.rootId);
    map.nodes[child.id] = child;
    map.nodes[map.rootId]!.children.push(child.id);
    child.cardId = "card_ma";
    expect(validateMindMap(map).join("\n")).toContain("cardId tham chiếu card không tồn tại");
    child.cardId = null;

    const card = createCard("Bad");
    const t: TableBlock = createTableBlock(2, 2);
    t.cells[1] = ["chỉ 1 ô"];
    card.blocks.push(t, createImageBlock("img_ma"), createChartBlock("blk_ma"));
    map.cards[card.id] = card;
    const text = validateMindMap(map).join("\n");
    expect(text).toContain("hàng 1 có 1 ô, cần 2");
    expect(text).toContain('tham chiếu ảnh không tồn tại "img_ma"');
    expect(text).toContain("biểu đồ trỏ tới bảng không tồn tại");
    void childId;
  });

  it("card không node nào trỏ tới vẫn hợp lệ; biểu đồ dùng cột ngoài phạm vi bị bắt", () => {
    const map = createEmptyMap("V");
    const card = createCard("Mồ côi");
    const t = createTableBlock(2, 2);
    const ch = createChartBlock(t.id);
    ch.seriesColumns = [5];
    card.blocks.push(t, ch);
    map.cards[card.id] = card;
    expect(validateCard(card, map.assets).join()).toContain("cột ngoài phạm vi");
    ch.seriesColumns = [1];
    expect(validateMindMap(map)).toEqual([]);
  });
});

describe("Card & Block — migrate v16 -> v17 (M1)", () => {
  it("file schema 16 không có card: lên 17 với cards rỗng, node.cardId null, notes giữ nguyên", () => {
    const raw = {
      mapId: "m16",
      schemaVersion: 16,
      rootId: "r",
      nodes: { r: { id: "r", text: "Gốc", parentId: null, children: [], notes: "ghi chú cũ" } },
    };
    const m = migrateToLatest(raw);
    expect(m.schemaVersion).toBeGreaterThanOrEqual(17);
    expect(m.cards).toEqual({});
    expect(m.nodes["r"]!.cardId).toBeNull();
    expect(m.nodes["r"]!.notes).toBe("ghi chú cũ");
    expect(validateMindMap(m)).toEqual([]);
  });

  it("dữ liệu hỏng (cards là mảng) được chuẩn hoá về {} thay vì làm crash", () => {
    const m = migrateToLatest({
      mapId: "x",
      schemaVersion: 17,
      rootId: "r",
      nodes: { r: { id: "r", text: "G", parentId: null, children: [] } },
      cards: [],
    });
    expect(m.cards).toEqual({});
  });
});

describe("Card & Block — MergeMapCommand (M1)", () => {
  it("ghép map có card: card nhận id mới, node trỏ đúng, ảnh trong card remap theo asset mới, map đích hợp lệ; undo sạch", () => {
    const src = setup();
    const card = createCard("Nguồn");
    src.store.dispatch(new CreateCardForNodeCommand(src.childId, card));
    const img = createImageBlock("img_src", "");
    src.store.dispatch(new AddBlockCommand(card.id, img, null, { assetId: "img_src", asset: { mimeType: "image/png", dataBase64: PNG } }));
    src.store.dispatch(new AddBlockCommand(card.id, createTextBlock("nội dung")));
    const source = deepClone(src.store.getMap());

    const dst = setup();
    const before = snap(dst.store.getMap());
    dst.store.dispatch(new MergeMapCommand(source));
    const m = dst.store.getMap();

    const cardIds = Object.keys(m.cards);
    expect(cardIds).toHaveLength(1);
    expect(cardIds[0]).not.toBe(card.id);
    const merged = m.cards[cardIds[0] as string]!;
    expect(merged.id).toBe(cardIds[0]);
    const mergedImg = merged.blocks.find((b) => b.type === "image");
    expect(mergedImg && mergedImg.type === "image" && m.assets[mergedImg.assetId]?.dataBase64).toBe(PNG);
    expect(Object.values(m.nodes).filter((n) => n.cardId === cardIds[0])).toHaveLength(1);
    expect(validateMindMap(m)).toEqual([]);

    // ghép LẦN 2 cùng file: không trùng id card
    dst.store.dispatch(new MergeMapCommand(source));
    expect(Object.keys(dst.store.getMap().cards)).toHaveLength(2);
    expect(validateMindMap(dst.store.getMap())).toEqual([]);

    dst.store.undo();
    dst.store.undo();
    {
      const a = JSON.parse(before), b = JSON.parse(snap(dst.store.getMap()));
      const out: string[] = [];
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out.push(k + ": " + JSON.stringify(a[k])?.slice(0, 300) + " ||| " + JSON.stringify(b[k])?.slice(0, 300));
      expect(out.join("\n")).toBe("");
    }
  });
});

describe("UpdateTableCommand — lưu trình sửa bảng (M2)", () => {
  function setupTable() {
    const { store, childId } = setup();
    const card = createCard("Số liệu");
    const t = createTableBlock(3, 3, "Doanh thu");
    t.cells = [
      ["Tháng", "A", "B"],
      ["1", "10", "20"],
      ["2", "30", "40"],
    ];
    const chart = { ...createChartBlock(t.id, "bar"), labelColumn: 0, seriesColumns: [1, 2] };
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    store.dispatch(new AddBlockCommand(card.id, t));
    store.dispatch(new AddBlockCommand(card.id, chart));
    return { store, cardId: card.id, t, chart };
  }

  it("một phiên sửa = một bước hoàn tác, undo/redo chính xác", () => {
    const { store, cardId, t } = setupTable();
    const s0 = snap(store.getMap());
    let d = createDraft(t);
    d = setCell(d, 1, 1, "99");
    d = insertRow(d, 3);
    d = pasteGrid(d, 3, 0, [["3", "50", "60"]]).draft;
    store.dispatch(new UpdateTableCommand(cardId, d.table, null));
    const s1 = snap(store.getMap());
    const saved = store.getMap().cards[cardId]!.blocks[0] as TableBlock;
    expect(saved.cells).toHaveLength(4);
    expect(saved.cells[1]![1]).toBe("99");
    expect(validateMindMap(store.getMap())).toEqual([]);

    store.undo();
    expect(snap(store.getMap())).toBe(s0);
    store.redo();
    expect(snap(store.getMap())).toBe(s1);
  });

  it("xoá/chèn cột: biểu đồ cùng card được đưa cột về đúng chỗ, map vẫn hợp lệ", () => {
    const { store, cardId, t, chart } = setupTable();
    const s0 = snap(store.getMap());
    let d = createDraft(t);
    d = deleteColumn(d, 1); // bỏ cột "A"
    d = insertColumn(d, 0); // chèn cột mới bên trái
    store.dispatch(new UpdateTableCommand(cardId, d.table, d.colOrigin));
    const m = store.getMap();
    const c = m.cards[cardId]!.blocks.find((b) => b.id === chart.id);
    expect(c).toMatchObject({ labelColumn: 1, seriesColumns: [2] }); // "Tháng" giờ ở cột 1, "B" ở cột 2
    expect(validateMindMap(m)).toEqual([]);
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
  });

  it("báo lỗi khi id không phải bảng có trong card", () => {
    const { store, cardId, chart } = setupTable();
    const fake = createTableBlock(1, 1);
    expect(() => store.dispatch(new UpdateTableCommand(cardId, fake))).toThrow();
    expect(() => store.dispatch(new UpdateTableCommand(cardId, { ...fake, id: chart.id }))).toThrow();
  });

  it("thêm bảng nhập từ CSV qua AddBlockCommand rồi hoàn tác", () => {
    const { store, childId } = setup();
    const card = createCard("CSV");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    const s0 = snap(store.getMap());
    const block = tableFromGrid("blk_csv", parseDelimited("a;b\n1;2\n"), "nhap");
    store.dispatch(new AddBlockCommand(card.id, block));
    expect((store.getMap().cards[card.id]!.blocks[0] as TableBlock).cells).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
    expect(validateMindMap(store.getMap())).toEqual([]);
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
  });
});

describe("KW0 — dấu thời gian và rev của card (schema 20)", () => {
  it("card mới có createdAt/updatedAt/rev; sửa nội dung tăng rev, hoàn tác cũng tăng (không lùi)", () => {
    const { store, childId } = setup();
    store.dispatch(new CreateCardForNodeCommand(childId, createCard("X")));
    const id = store.getMap().nodes[childId]!.cardId!;
    const c0 = { ...store.getMap().cards[id]! };
    expect(c0.rev).toBe(1);
    expect(c0.createdAt).toBeGreaterThan(0);
    store.dispatch(new RenameCardCommand(id, "Y"));
    const r1 = store.getMap().cards[id]!.rev;
    expect(r1).toBe(2);
    store.undo();
    const after = store.getMap().cards[id]!;
    expect(after.title).toBe("X");
    expect(after.rev).toBe(3);
    expect(after.updatedAt).toBeGreaterThan(c0.updatedAt);
    expect(after.createdAt).toBe(c0.createdAt);
    store.redo();
    expect(store.getMap().cards[id]!.rev).toBe(4);
  });

  it("touchCard: updatedAt luôn tăng kể cả khi đồng hồ lùi; rev hỏng coi như 0", () => {
    const c = createCard("a", 1000);
    touchCard(c, 500);
    expect(c.updatedAt).toBe(1001);
    c.rev = Number.NaN;
    touchCard(c, 2000);
    expect(c.rev).toBe(1);
    expect(c.updatedAt).toBe(2000);
  });

  it("migrate 19 -> 20: card cũ được thêm 0/0/0, dữ liệu hỏng được sửa", () => {
    const m = createEmptyMap("g") as unknown as Record<string, unknown>;
    m.schemaVersion = 19;
    m.cards = { c1: { id: "c1", title: "t", blocks: [] }, c2: { id: "c2", title: "t", blocks: [], rev: -3, updatedAt: "x", createdAt: 5 } };
    const out = migrateToLatest(m);
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.cards.c1).toMatchObject({ createdAt: 0, updatedAt: 0, rev: 0 });
    expect(out.cards.c2).toMatchObject({ createdAt: 5, updatedAt: 0, rev: 0 });
    expect(validateMindMap(out)).toEqual([]);
  });
});
