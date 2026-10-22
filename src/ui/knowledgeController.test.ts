import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { createCard, createTextBlock } from "../core/cards";
import { deleteMap, flushWorkspaceWrites, loadMap, loadMapReadOnly, saveMap, setWorkspaceRepo } from "../io/storage";
import { createMemoryFs } from "../io/workspaceFs";
import { WorkspaceRepo } from "../io/workspaceRepo";
import { indexStatusStore, knowledgeIndex, refreshKnowledgeIndex } from "./knowledgeController";
import { get } from "svelte/store";
import type { MindMap } from "../core/types";

let n = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function mapWith(title: string, nodeText: string): MindMap {
  const map = createEmptyMap(title);
  const c = createNode(nodeText, map.rootId);
  map.nodes[c.id] = c;
  map.nodes[map.rootId]!.children.push(c.id);
  return map;
}

beforeEach(() => {
  setWorkspaceRepo(null);
  knowledgeIndex.clear();
});

describe("KW2 — lập chỉ mục toàn Workspace", () => {
  it("map đang mở lấy từ bản trực tiếp (chưa lưu); map khác đọc từ nơi lưu; xoá map thì bỏ khỏi chỉ mục", async () => {
    setWorkspaceRepo(await WorkspaceRepo.open(createMemoryFs(), { newId: () => `ws_${++n}` }));
    const a = mapWith("Quán A", "Cà phê sữa");
    const b = mapWith("Quán B", "Trà đào");
    const c = mapWith("Quán C", "Bánh mì");
    for (const m of [a, b, c]) {
      await saveMap(m);
      await sleep(3);
    }
    await flushWorkspaceWrites();
    // sửa trực tiếp ở A mà chưa lưu
    const live = a;
    Object.values(live.nodes).find((x) => x.text === "Cà phê sữa")!.text = "Cà phê muối";

    await refreshKnowledgeIndex(() => live);
    expect(knowledgeIndex.mapIds().sort()).toEqual([a.mapId, b.mapId, c.mapId].sort());
    expect(knowledgeIndex.search("muoi").map((h) => h.entry.title)).toEqual(["Cà phê muối"]);
    expect(knowledgeIndex.search("tra dao")[0]!.entry.mapTitle).toBe("Quán B");
    expect(get(indexStatusStore)).toMatchObject({ running: false, done: 2, total: 2, failed: 0 });

    // lần sau: map chưa đổi thì bỏ qua (không đọc lại)
    const stampB = knowledgeIndex.stampOf(b.mapId);
    await refreshKnowledgeIndex(() => live);
    expect(get(indexStatusStore).total).toBe(0);
    expect(knowledgeIndex.stampOf(b.mapId)).toBe(stampB);

    // B đổi → được đọc lại; C bị xoá → bỏ khỏi chỉ mục
    Object.values(b.nodes).find((x) => x.text === "Trà đào")!.text = "Trà vải";
    await sleep(3);
    await saveMap(b);
    await deleteMap(c.mapId);
    await refreshKnowledgeIndex(() => live);
    expect(knowledgeIndex.search("tra vai")).toHaveLength(1);
    expect(knowledgeIndex.search("tra dao")).toHaveLength(0);
    expect(knowledgeIndex.search("banh mi")).toHaveLength(0);
  });

  it("nhiều lời gọi chồng nhau dùng chung một lượt; map hỏng được đếm là không đọc được", async () => {
    setWorkspaceRepo(null);
    const a = mapWith("A", "Một");
    const b = mapWith("B", "Hai");
    await saveMap(a);
    await saveMap(b);
    const p1 = refreshKnowledgeIndex(() => a);
    const p2 = refreshKnowledgeIndex(() => a);
    expect(p1).toBe(p2);
    await p1;
    expect(knowledgeIndex.search("hai")).toHaveLength(1);
  });

  it("đọc chỉ-để-lập-chỉ-mục không kéo card mới từ kho chung; mở map bình thường thì có", async () => {
    const repo = await WorkspaceRepo.open(createMemoryFs(), { newId: () => `ws_${++n}` });
    setWorkspaceRepo(repo);
    const m = mapWith("Có card", "Gốc con");
    const card = createCard("Cũ");
    card.blocks = [createTextBlock("nội dung cũ")];
    m.cards[card.id] = card;
    await saveMap(m);
    await flushWorkspaceWrites();
    // map khác sửa cùng card (bản mới hơn) và lưu → kho card chung có bản mới
    const other = mapWith("Map khác", "Con");
    other.cards[card.id] = { ...card, title: "Mới", updatedAt: (card.updatedAt ?? 0) + 5000, rev: (card.rev ?? 0) + 1 };
    await saveMap(other);
    await flushWorkspaceWrites();
    expect((await loadMapReadOnly(m.mapId))!.cards[card.id]!.title).toBe("Cũ"); // chỉ đọc: chưa kéo bản mới
    expect(await loadMapReadOnly("khong-co-map")).toBeNull();
    expect((await loadMap(m.mapId))!.cards[card.id]!.title).toBe("Mới"); // mở thật: có kéo
  });
});
