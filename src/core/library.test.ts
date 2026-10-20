import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import { createCard, createTextBlock, createTableBlock, createImageBlock } from "./cards";
import {
  AddCardCommand,
  AttachCardToNodeCommand,
  CreateNodeWithCardCommand,
  buildAddImagesToCardCommand,
  DeleteCardCommand,
} from "./cardCommands";
import { listLibrary, cardUsages, cardSearchText, blockCounts, describeCounts } from "./library";
import { validateMindMap } from "./validate";
import type { MindMap } from "./types";

const snap = (m: MindMap) => JSON.stringify(m);
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/** Map: gốc + 2 con (A có Tag "t1"); card "Kế hoạch" gắn A và B, card "Ý tưởng" ở Inbox, card không tên ở Inbox. */
function setup() {
  const map = createEmptyMap("Gốc");
  const a = createNode("A", map.rootId);
  const b = createNode("B", map.rootId);
  map.nodes[a.id] = a;
  map.nodes[b.id] = b;
  map.nodes[map.rootId]!.children.push(a.id, b.id);
  map.tags.push({ id: "t1", name: "Việc gấp", color: "#e0563b" });
  a.tagIds = ["t1"];
  const plan = createCard("Kế hoạch");
  const table = createTableBlock(2, 2);
  table.cells = [["Hạng mục", "Ngân sách"], ["Thiết kế", "100"]];
  plan.blocks = [createTextBlock("Họp với đội phát triển"), table];
  const idea = createCard("Ý tưởng");
  idea.blocks = [createTextBlock("Thử bố cục mới")];
  const blank = createCard("");
  map.cards[plan.id] = plan;
  map.cards[idea.id] = idea;
  map.cards[blank.id] = blank;
  a.cardId = plan.id;
  b.cardId = plan.id;
  return { map, a: a.id, b: b.id, plan: plan.id, idea: idea.id, blank: blank.id };
}

describe("Thư viện card — tìm/lọc (H1)", () => {
  it("cardUsages: mọi node đang gắn card", () => {
    const { map, a, b, plan, idea } = setup();
    expect(cardUsages(map, plan).sort()).toEqual([a, b].sort());
    expect(cardUsages(map, idea)).toEqual([]);
  });

  it("liệt kê theo tên, card chưa đặt tên xuống cuối; kèm số node, Tag, số khối", () => {
    const { map, plan, idea, blank } = setup();
    const list = listLibrary(map);
    expect(list.map((e) => e.card.id)).toEqual([plan, idea, blank]);
    expect(list[0]).toMatchObject({ tagIds: ["t1"], counts: { text: 1, table: 1, image: 0, chart: 0 } });
    expect(list[0]!.usages).toHaveLength(2);
    expect(describeCounts(list[0]!.counts)).toBe("1 văn bản · 1 bảng");
    expect(describeCounts(blockCounts(map.cards[blank]!))).toBe("trống");
  });

  it("lọc Inbox / Đang dùng / theo Tag", () => {
    const { map, plan, idea, blank } = setup();
    expect(listLibrary(map, { filter: "inbox" }).map((e) => e.card.id)).toEqual([idea, blank]);
    expect(listLibrary(map, { filter: "used" }).map((e) => e.card.id)).toEqual([plan]);
    expect(listLibrary(map, { tagId: "t1" }).map((e) => e.card.id)).toEqual([plan]);
    expect(listLibrary(map, { tagId: "khong-co" })).toEqual([]);
  });

  it("tìm không phân biệt dấu, trong văn bản/ô bảng/chú thích; mọi từ phải khớp", () => {
    const { map, plan, idea } = setup();
    expect(listLibrary(map, { query: "ngan sach" }).map((e) => e.card.id)).toEqual([plan]);
    expect(listLibrary(map, { query: "BO CUC" }).map((e) => e.card.id)).toEqual([idea]);
    expect(listLibrary(map, { query: "hop thiet ke" }).map((e) => e.card.id)).toEqual([plan]);
    expect(listLibrary(map, { query: "hop bo cuc" })).toEqual([]);
    const c = createCard("x");
    c.blocks = [createImageBlock("a", "Ảnh sơ đồ")];
    expect(cardSearchText(c)).toContain("Ảnh sơ đồ");
  });
});

describe("Thư viện card — Command (H1)", () => {
  it("Card nhanh vào Inbox, gắn vào node, hoàn tác về đúng trạng thái", () => {
    const { map, a } = setup();
    const store = new Store(map);
    const s0 = snap(store.getMap());
    const quick = createCard("Nhanh");
    store.dispatch(new AddCardCommand(quick));
    expect(listLibrary(store.getMap(), { filter: "inbox" }).some((e) => e.card.id === quick.id)).toBe(true);
    store.dispatch(new AttachCardToNodeCommand(a, quick.id));
    expect(listLibrary(store.getMap(), { filter: "inbox" }).some((e) => e.card.id === quick.id)).toBe(false);
    store.undo();
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
    expect(() => new AddCardCommand(store.getMap().cards[Object.keys(store.getMap().cards)[0]!]!).apply(store.getMap())).toThrow();
  });

  it("kéo card thả lên node → node con mới mang card; thả vùng trống → nhánh trôi tại điểm thả", () => {
    const { map, a, idea } = setup();
    const store = new Store(map);
    const s0 = snap(store.getMap());
    const child = new CreateNodeWithCardCommand(idea, "Ý tưởng", a);
    store.dispatch(child);
    const m = store.getMap();
    expect(m.nodes[child.newNodeId]).toMatchObject({ parentId: a, cardId: idea, text: "Ý tưởng" });
    expect(m.nodes[a]!.children).toContain(child.newNodeId);
    const floating = new CreateNodeWithCardCommand(idea, "Ý tưởng", null, { x: 640, y: 320 });
    store.dispatch(floating);
    expect(store.getMap().nodes[floating.newNodeId]).toMatchObject({ parentId: null, cardId: idea, offsetX: 640, offsetY: 320 });
    expect(cardUsages(store.getMap(), idea)).toHaveLength(2);
    expect(validateMindMap(store.getMap())).toEqual([]);
    store.undo();
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
    store.redo();
    expect(store.getMap().nodes[child.newNodeId]?.cardId).toBe(idea); // redo giữ đúng id node cũ
  });

  it("thêm ảnh thẳng vào card Inbox (một bước hoàn tác); xoá card dọn luôn ảnh", () => {
    const { map, idea } = setup();
    const store = new Store(map);
    store.dispatch(
      buildAddImagesToCardCommand(idea, [
        { assetId: "img1", asset: { mimeType: "image/png", dataBase64: PNG } },
        { assetId: "img2", asset: { mimeType: "image/png", dataBase64: PNG } },
      ])
    );
    expect(store.getMap().cards[idea]!.blocks.map((b) => b.type)).toEqual(["text", "image", "image"]);
    store.dispatch(new DeleteCardCommand(idea));
    expect(store.getMap().assets).toEqual({});
    store.undo();
    store.undo();
    expect(store.getMap().cards[idea]!.blocks).toHaveLength(1);
    expect(store.getMap().assets).toEqual({});
  });
});
