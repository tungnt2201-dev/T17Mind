import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { createCard, createTextBlock, createImageBlock } from "../core/cards";
import { Store } from "../core/store";
import { CompositeCommand } from "../core/commands";
import { RenameCardCommand, ReplaceBlockCommand, ImportCardCommand, CreateNodeWithCardCommand, DeleteCardCommand } from "../core/cardCommands";
import { isNewer, buildCardFile, parseCardFile, applyCardFile } from "../core/cardRegistry";
import { validateMindMap } from "../core/validate";
import type { MindMap, TextBlock } from "../core/types";
import { createMemoryFs, textBytes } from "./workspaceFs";
import { WorkspaceRepo } from "./workspaceRepo";
import { saveMap, loadMap, setWorkspaceRepo, flushWorkspaceWrites, onCardsPulled } from "./storage";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
let n = 0;
const open = (fs: ReturnType<typeof createMemoryFs>) => WorkspaceRepo.open(fs, { newId: () => `ws_${++n}` });

/** Map có một node mang card "Giá" (văn bản + ảnh). */
function mapWithCard(title: string, card = makeCard()): MindMap {
  const map = createEmptyMap(title);
  const node = createNode("Node", map.rootId);
  map.nodes[node.id] = node;
  map.nodes[map.rootId]!.children.push(node.id);
  map.cards[card.id] = structuredClone(card);
  map.assets.img1 = { mimeType: "image/png", dataBase64: PNG, width: 1, height: 1 };
  node.cardId = card.id;
  return map;
}
function makeCard() {
  const c = createCard("Giá", 1000);
  c.blocks = [createTextBlock("100k"), createImageBlock("img1", "ảnh")];
  return c;
}
const textOf = (map: MindMap, cardId: string) => (map.cards[cardId]!.blocks[0] as TextBlock).text;

beforeEach(() => setWorkspaceRepo(null));

describe("KW1 — hàm thuần kho card", () => {
  it("isNewer so updatedAt rồi rev", () => {
    expect(isNewer({ updatedAt: 2, rev: 1 }, { updatedAt: 1, rev: 9 })).toBe(true);
    expect(isNewer({ updatedAt: 2, rev: 3 }, { updatedAt: 2, rev: 2 })).toBe(true);
    expect(isNewer({ updatedAt: 2, rev: 2 }, { updatedAt: 2, rev: 2 })).toBe(false);
  });

  it("file card chỉ gói ảnh card dùng; đọc lại hợp lệ; file hỏng / thiếu ảnh bị từ chối", () => {
    const map = mapWithCard("A");
    map.assets.other = { mimeType: "image/png", dataBase64: PNG };
    const card = Object.values(map.cards)[0]!;
    const file = buildCardFile(map, card);
    expect(Object.keys(file.assets)).toEqual(["img1"]);
    expect(parseCardFile(JSON.stringify(file))!.card.title).toBe("Giá");
    expect(parseCardFile("{")).toBeNull();
    expect(parseCardFile(JSON.stringify({ ...file, assets: {} }))).toBeNull();
  });

  it("applyCardFile thay card và dọn ảnh cũ không còn ai dùng", () => {
    const map = mapWithCard("A");
    const card = structuredClone(Object.values(map.cards)[0]!);
    card.blocks = [createTextBlock("mới")];
    card.updatedAt = 5000;
    applyCardFile(map, { format: "t17mind-card", version: 1, card, assets: {} });
    expect(textOf(map, card.id)).toBe("mới");
    expect(map.assets.img1).toBeUndefined();
    expect(validateMindMap(map)).toEqual([]);
  });
});

describe("KW1 — kho card chung trong thư mục Workspace", () => {
  it("lưu map → card vào cards/<id>.json, danh mục ghi map nào dùng card nào", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    const a = mapWithCard("A");
    const cardId = Object.keys(a.cards)[0]!;
    await repo.writeMap(a);
    expect(fs.files.has(`cards/${cardId}.json`)).toBe(true);
    const list = await repo.listRegistryCards();
    expect(list.map((x) => [x.file.card.title, x.usedIn.map((m) => m.title)])).toEqual([["Giá", ["A"]]]);
  });

  it("sửa ở map A → mở map B thấy bản mới; bản cũ hơn không ghi đè bản mới", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    const a = mapWithCard("A");
    const cardId = Object.keys(a.cards)[0]!;
    const b = mapWithCard("B", a.cards[cardId]!);
    await repo.writeMap(a);
    await repo.writeMap(b);
    const sa = new Store(a);
    const blk = a.cards[cardId]!.blocks[0] as TextBlock;
    sa.dispatch(new ReplaceBlockCommand(cardId, { ...blk, text: "120k" }));
    await repo.writeMap(sa.getMap());
    await repo.writeMap(b); // B (bản cũ) lưu lại — không được ghi đè
    const bReloaded = (await repo.readMap(b.mapId))!;
    const updated = await repo.pullNewerCards(bReloaded);
    expect(updated).toEqual(["Giá"]);
    expect(textOf(bReloaded, cardId)).toBe("120k");
    expect((await repo.readCard(cardId))!.card.blocks[0]).toMatchObject({ text: "120k" });
    expect(await repo.pullNewerCards(bReloaded)).toEqual([]);
  });

  it("hoàn tác ở map A cũng lan sang map B (rev chỉ tăng)", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    const a = mapWithCard("A");
    const cardId = Object.keys(a.cards)[0]!;
    const b = mapWithCard("B", a.cards[cardId]!);
    const sa = new Store(a);
    sa.dispatch(new RenameCardCommand(cardId, "Giá mới"));
    await repo.writeMap(sa.getMap());
    await repo.writeMap(b);
    const b1 = (await repo.readMap(b.mapId))!;
    await repo.pullNewerCards(b1);
    expect(b1.cards[cardId]!.title).toBe("Giá mới");
    sa.undo();
    await repo.writeMap(sa.getMap());
    const b2 = (await repo.readMap(b.mapId))!;
    await repo.pullNewerCards(b2);
    expect(b2.cards[cardId]!.title).toBe("Giá");
  });

  it("xoá khỏi kho chỉ khi không map nào dùng; file card chép tay vào được nhận", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    const a = mapWithCard("A");
    const cardId = Object.keys(a.cards)[0]!;
    await repo.writeMap(a);
    await expect(repo.deleteRegistryCard(cardId)).rejects.toThrow();
    const sa = new Store(a);
    sa.dispatch(new DeleteCardCommand(cardId));
    await repo.writeMap(sa.getMap());
    await repo.deleteRegistryCard(cardId);
    expect(await repo.listRegistryCards()).toEqual([]);
    expect([...fs.files.keys()].some((k) => k.startsWith(`.trash/card-${cardId}-`))).toBe(true);

    const other = mapWithCard("X");
    const c2 = Object.values(other.cards)[0]!;
    fs.files.set(`cards/${c2.id}.json`, textBytes(JSON.stringify(buildCardFile(other, c2))));
    const repo2 = await open(fs);
    expect((await repo2.listRegistryCards()).map((x) => x.file.card.id)).toEqual([c2.id]);
  });
});

describe("KW1 — đưa card từ Workspace vào map đang mở", () => {
  it("ImportCardCommand + CreateNodeWithCardCommand: một bước hoàn tác, giữ id, mang ảnh", async () => {
    const src = mapWithCard("Nguồn");
    const card = Object.values(src.cards)[0]!;
    const file = buildCardFile(src, card);
    const target = createEmptyMap("Đích");
    const st = new Store(target);
    const add = new CreateNodeWithCardCommand(card.id, card.title, target.rootId);
    st.dispatch(new CompositeCommand([new ImportCardCommand(file.card, file.assets), add]));
    const m = st.getMap();
    expect(m.cards[card.id]!.title).toBe("Giá");
    expect(m.assets.img1).toBeDefined();
    expect(m.nodes[add.newNodeId]!.cardId).toBe(card.id);
    expect(validateMindMap(m)).toEqual([]);
    st.undo();
    expect(st.getMap().cards[card.id]).toBeUndefined();
    expect(st.getMap().assets.img1).toBeUndefined();
    // map đã có card → không thêm lại, hoàn tác không xoá nhầm
    const st2 = new Store(mapWithCard("Đã có", card));
    st2.dispatch(new ImportCardCommand(file.card, file.assets));
    st2.undo();
    expect(st2.getMap().cards[card.id]).toBeDefined();
  });

  it("storage: mở map B sau khi sửa card ở map A (chưa kịp ghi) vẫn thấy bản mới, có báo", async () => {
    const fs = createMemoryFs();
    setWorkspaceRepo(await open(fs));
    const a = mapWithCard("A");
    const cardId = Object.keys(a.cards)[0]!;
    const b = mapWithCard("B", a.cards[cardId]!);
    await saveMap(a);
    await saveMap(b);
    await flushWorkspaceWrites();
    const sa = new Store(a);
    sa.dispatch(new RenameCardCommand(cardId, "Đổi ở A"));
    await saveMap(sa.getMap()); // còn đang chờ ghi ra thư mục
    let notice: string[] = [];
    onCardsPulled((t) => (notice = t));
    const loaded = (await loadMap(b.mapId))!;
    expect(loaded.cards[cardId]!.title).toBe("Đổi ở A");
    expect(notice).toEqual(["Đổi ở A"]);
    onCardsPulled(null);
  });
});
