import { describe, it, expect } from "vitest";
import { exportT17mFile, parseT17mFile } from "./t17m";
import { createEmptyMap, createNode } from "../core/tree";
import { SetNodeImageCommand } from "../core/commands";
import type { MindMap } from "../core/types";

// Ảnh PNG 1x1 pixel THẬT (không phải chuỗi giả) — encode base64 hợp lệ,
// đủ để jszip nén/giải nén như một file nhị phân thật sự.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function buildMapWithImage(): MindMap {
  const map = createEmptyMap("Gốc có ảnh");
  const child = createNode("Con có ảnh", map.rootId);
  map.nodes[child.id] = child;
  map.nodes[map.rootId]!.children.push(child.id);

  const cmd = new SetNodeImageCommand(child.id, "img_test1", { mimeType: "image/png", dataBase64: TINY_PNG_BASE64 });
  cmd.apply(map);
  return map;
}

describe("io/t17m — xuất/nhập định dạng nguyên bản .t17m (P2.10)", () => {
  it("round-trip: xuất rồi nhập lại giữ đúng cấu trúc cây và mimeType của ảnh nhúng", async () => {
    const original = buildMapWithImage();
    const blob = await exportT17mFile(original);
    const buffer = await blob.arrayBuffer();

    const result = await parseT17mFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.map.nodes)).toHaveLength(2);
    expect(result.map.rootId).toBe(original.rootId);
    const childId = original.nodes[original.rootId]!.children[0] as string;
    expect(result.map.nodes[childId]?.imageAssetId).toBe("img_test1");
    expect(result.map.assets["img_test1"]?.mimeType).toBe("image/png");
  });

  it("round-trip: dữ liệu base64 của ảnh khớp CHÍNH XÁC với ảnh gốc (không bị hỏng qua vòng nén/giải nén nhị phân)", async () => {
    const original = buildMapWithImage();
    const blob = await exportT17mFile(original);
    const result = await parseT17mFile(await blob.arrayBuffer());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.assets["img_test1"]?.dataBase64).toBe(TINY_PNG_BASE64);
  });

  it("content.json bên trong zip KHÔNG lưu trùng lặp base64 (đã tách ra file nhị phân riêng ở assets/) — kiểm tra đúng tinh thần '.t17m nhúng tệp thật', không phải json phẳng đổi tên đuôi", async () => {
    const original = buildMapWithImage();
    const blob = await exportT17mFile(original);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    const contentText = await zip.file("content.json")?.async("text");
    expect(contentText).toBeDefined();
    const parsedContent = JSON.parse(contentText as string) as MindMap;
    expect(parsedContent.assets["img_test1"]?.dataBase64).toBe("");

    const assetFile = zip.file("assets/img_test1.png");
    expect(assetFile).not.toBeNull();
  });

  it("file .t17m không có content.json -> báo lỗi rõ ràng, không crash", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("khong-lien-quan.txt", "xin chao");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    const result = await parseT17mFile(buffer);
    expect(result.ok).toBe(false);
  });

  it("file không phải zip hợp lệ -> báo lỗi rõ ràng, không crash", async () => {
    const buffer = new TextEncoder().encode("day khong phai file zip").buffer;
    const result = await parseT17mFile(buffer);
    expect(result.ok).toBe(false);
  });

  it("map không có ảnh nào vẫn xuất/nhập lại đúng (không bắt buộc phải có assets/)", async () => {
    const map = createEmptyMap("Map trơn, không ảnh");
    const blob = await exportT17mFile(map);
    const result = await parseT17mFile(await blob.arrayBuffer());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.map.assets)).toHaveLength(0);
  });
});

describe("io/t17m — Card & Block (M1)", () => {
  it("round-trip .t17m và JSON phẳng giữ nguyên card, bảng, khối ảnh (ảnh trong card tách ra assets/ thật)", async () => {
    const { CreateCardForNodeCommand, AddBlockCommand } = await import("../core/cardCommands");
    const { createCard, createTextBlock, createTableBlock, createImageBlock } = await import("../core/cards");
    const { exportFlatJson, parseJsonFile } = await import("./json");
    const map = createEmptyMap("Gốc card");
    const card = createCard("Báo cáo");
    const table = createTableBlock(2, 2, "Số liệu");
    table.cells = [["A", "B"], ["1", "2"]];
    new CreateCardForNodeCommand(map.rootId, card).apply(map);
    new AddBlockCommand(card.id, createTextBlock("Đoạn mở đầu")).apply(map);
    new AddBlockCommand(card.id, table).apply(map);
    new AddBlockCommand(card.id, createImageBlock("img_cb", "Ảnh 1"), null, {
      assetId: "img_cb",
      asset: { mimeType: "image/png", dataBase64: TINY_PNG_BASE64 },
    }).apply(map);

    const viaT17m = await parseT17mFile(await (await exportT17mFile(map)).arrayBuffer());
    expect(viaT17m.ok).toBe(true);
    if (viaT17m.ok) {
      expect(viaT17m.map.cards[card.id]).toEqual(map.cards[card.id]);
      expect(viaT17m.map.assets["img_cb"]?.dataBase64).toBe(TINY_PNG_BASE64);
      expect(viaT17m.map.nodes[map.rootId]?.cardId).toBe(card.id);
    }

    const viaJson = parseJsonFile(exportFlatJson(map));
    expect(viaJson.ok).toBe(true);
    if (viaJson.ok) expect(viaJson.map.cards[card.id]).toEqual(map.cards[card.id]);
  });
});
