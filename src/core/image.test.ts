import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import { buildAddImagesToNodeCommand, AddBlockCommand, CreateCardForNodeCommand, RemoveBlockCommand } from "./cardCommands";
import { createCard, createTextBlock, createImageBlock, validateCard } from "./cards";
import { validateMindMap } from "./validate";
import { migrateToLatest } from "./migrate";
import {
  planImageResize,
  base64Bytes,
  totalAssetBytes,
  cardImageBlocks,
  formatBytes,
  IMAGE_MAX_SIDE,
  IMAGE_KEEP_BYTES,
} from "./image";
import { CURRENT_SCHEMA_VERSION, type ImageAsset, type MindMap } from "./types";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const asset = (w = 1, h = 1): ImageAsset => ({ mimeType: "image/png", dataBase64: PNG, width: w, height: h });
const snap = (m: MindMap) => JSON.stringify(m);

function setup() {
  const map = createEmptyMap("Gốc");
  const child = createNode("Con", map.rootId);
  map.nodes[child.id] = child;
  map.nodes[map.rootId]!.children.push(child.id);
  return { store: new Store(map), childId: child.id };
}

describe("Nén/thu nhỏ ảnh khi chèn (M3)", () => {
  it("ảnh nhỏ, nhẹ thì giữ nguyên", () => {
    expect(planImageResize(800, 600, 200 * 1024, "image/jpeg", false)).toBeNull();
  });
  it("ảnh quá cạnh tối đa thì thu nhỏ giữ tỉ lệ, cạnh dài = IMAGE_MAX_SIDE", () => {
    const p = planImageResize(4000, 3000, 3_000_000, "image/jpeg", false)!;
    expect(p.width).toBe(IMAGE_MAX_SIDE);
    expect(p.height).toBe(1440);
    expect(p.mimeType).toBe("image/jpeg");
    const tall = planImageResize(1000, 5000, 100, "image/png", false)!;
    expect(tall.height).toBe(IMAGE_MAX_SIDE);
    expect(tall.width).toBe(384);
  });
  it("ảnh đúng cỡ nhưng quá nặng thì nén lại (không đổi cỡ); có nền trong suốt giữ PNG", () => {
    const p = planImageResize(1200, 900, IMAGE_KEEP_BYTES + 1, "image/png", true)!;
    expect(p).toMatchObject({ width: 1200, height: 900, mimeType: "image/png" });
  });
  it("BMP luôn được đổi định dạng; GIF/SVG không bao giờ vẽ lại (giữ hoạt ảnh/vector)", () => {
    expect(planImageResize(100, 100, 1000, "image/bmp", false)).not.toBeNull();
    expect(planImageResize(5000, 5000, 9_000_000, "image/gif", false)).toBeNull();
    expect(planImageResize(5000, 5000, 9_000_000, "image/svg+xml", false)).toBeNull();
  });
  it("đếm byte base64 và tổng dung lượng ảnh của map", () => {
    expect(base64Bytes("QUJD")).toBe(3);
    expect(base64Bytes("QUI=")).toBe(2);
    expect(base64Bytes("QQ==")).toBe(1);
    const map = createEmptyMap("x");
    map.assets.a = { mimeType: "image/png", dataBase64: "QUJD" };
    map.assets.b = { mimeType: "image/png", dataBase64: "QQ==" };
    expect(totalAssetBytes(map)).toBe(4);
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(30 * 1024 * 1024)).toBe("30.0 MB");
  });
});

describe("Thêm nhiều ảnh vào node — một bước hoàn tác (M3)", () => {
  it("node chưa có card: tạo card + các khối ảnh; Ctrl+Z một lần về đúng trạng thái cũ", () => {
    const { store, childId } = setup();
    const s0 = snap(store.getMap());
    store.dispatch(
      buildAddImagesToNodeCommand(store.getMap(), childId, [
        { assetId: "img_a", asset: asset(400, 300), caption: "A" },
        { assetId: "img_b", asset: asset() },
      ])
    );
    const m = store.getMap();
    const card = m.cards[m.nodes[childId]!.cardId!]!;
    expect(card.title).toBe("Con");
    expect(cardImageBlocks(card).map((b) => [b.assetId, b.caption, b.size])).toEqual([
      ["img_a", "A", "medium"],
      ["img_b", "", "medium"],
    ]);
    expect(m.assets.img_a?.width).toBe(400);
    expect(validateMindMap(m)).toEqual([]);
    store.undo();
    expect(snap(store.getMap())).toBe(s0);
    store.redo();
    expect(Object.keys(store.getMap().assets).sort()).toEqual(["img_a", "img_b"]);
  });

  it("node đã có card: ảnh được thêm vào CUỐI card, không tạo card mới", () => {
    const { store, childId } = setup();
    const card = createCard("Có sẵn");
    store.dispatch(new CreateCardForNodeCommand(childId, card));
    store.dispatch(new AddBlockCommand(card.id, createTextBlock("chữ")));
    store.dispatch(buildAddImagesToNodeCommand(store.getMap(), childId, [{ assetId: "img_c", asset: asset() }]));
    const m = store.getMap();
    expect(Object.keys(m.cards)).toEqual([card.id]);
    expect(m.cards[card.id]!.blocks.map((b) => b.type)).toEqual(["text", "image"]);
  });

  it("xoá khối ảnh thì dọn luôn dữ liệu ảnh; hoàn tác trả lại", () => {
    const { store, childId } = setup();
    store.dispatch(buildAddImagesToNodeCommand(store.getMap(), childId, [{ assetId: "img_d", asset: asset() }]));
    const cardId = store.getMap().nodes[childId]!.cardId!;
    const blockId = store.getMap().cards[cardId]!.blocks[0]!.id;
    store.dispatch(new RemoveBlockCommand(cardId, blockId));
    expect(store.getMap().assets.img_d).toBeUndefined();
    store.undo();
    expect(store.getMap().assets.img_d).toBeDefined();
  });
});

describe("Schema 17 → 18: cỡ hiển thị của khối ảnh (M3)", () => {
  it("khối ảnh cũ không có size được gán 'medium', khối khác giữ nguyên", () => {
    const raw = {
      schemaVersion: 17,
      rootId: "n1",
      nodes: { n1: { id: "n1", text: "Gốc", parentId: null, children: [], cardId: "c1" } },
      assets: { a1: { mimeType: "image/png", dataBase64: PNG } },
      cards: {
        c1: {
          id: "c1",
          title: "",
          blocks: [
            { id: "b1", type: "image", assetId: "a1", caption: "x" },
            { id: "b2", type: "text", text: "t" },
          ],
        },
      },
    };
    const m = migrateToLatest(raw as never);
    expect(m.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(m.cards.c1!.blocks[0]).toMatchObject({ type: "image", size: "medium", caption: "x" });
    expect(m.cards.c1!.blocks[1]).toEqual({ id: "b2", type: "text", text: "t" });
  });

  it("dữ liệu ghi schema 18 nhưng thiếu/sai size vẫn được chuẩn hoá", () => {
    const raw = {
      schemaVersion: 18,
      rootId: "n1",
      nodes: { n1: { id: "n1", text: "Gốc", parentId: null, children: [] } },
      assets: { a1: { mimeType: "image/png", dataBase64: PNG } },
      cards: { c1: { id: "c1", title: "", blocks: [{ id: "b1", type: "image", assetId: "a1", caption: "", size: "huge" }] } },
    };
    expect(migrateToLatest(raw as never).cards.c1!.blocks[0]).toMatchObject({ size: "medium" });
  });

  it("validateCard báo lỗi cỡ ảnh không hợp lệ", () => {
    const b = { ...createImageBlock("a1"), size: "huge" as never };
    const errors = validateCard({ id: "c", title: "", blocks: [b], createdAt: 0, updatedAt: 0, rev: 0 }, { a1: asset() });
    expect(errors.some((e) => e.includes("cỡ ảnh"))).toBe(true);
  });
});
