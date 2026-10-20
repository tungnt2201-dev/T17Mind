import { describe, it, expect } from "vitest";
import { createEmptyMap } from "../core/tree";
import { createCard, createTextBlock, createTableBlock, createImageBlock } from "../core/cards";
import type { MindMap, MindNode } from "../core/types";
import {
  cardContentOf,
  measureCard,
  placeCard,
  previewLines,
  hitCardPart,
  chipWidth,
  CHIP_H,
  PREVIEW_LINE_H,
  PREVIEW_W,
  type Wrap,
} from "./cardLayout";
import { THUMB_PAD } from "./tableThumb";

/** Ngắt dòng giả: 6px mỗi ký tự, ngắt theo từ. */
const wrap: Wrap = (text, width) => {
  const per = Math.max(1, Math.floor(width / 6));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && t.length > per) {
        out.push(cur);
        cur = w;
      } else cur = t;
    }
    out.push(cur);
  }
  return out;
};

const LONG = "Họp với đội thiết kế về bố cục mới của trang chủ và danh sách việc cần làm trong tuần tới cho cả nhóm";

function mapWith(blocks: ReturnType<typeof createTextBlock | typeof createTableBlock | typeof createImageBlock>[]): { map: MindMap; node: MindNode } {
  const map = createEmptyMap("Gốc");
  map.assets.a = { mimeType: "image/png", dataBase64: "QQ==", width: 400, height: 300 };
  const card = createCard("C");
  card.blocks = blocks;
  map.cards[card.id] = card;
  const node = map.nodes[map.rootId]!;
  node.cardId = card.id;
  return { map, node };
}

describe("Nội dung card trên node", () => {
  it("node có card văn bản: hiện trích tối đa 3 dòng, dòng cuối có …", () => {
    const { map, node } = mapWith([createTextBlock(LONG)]);
    const c = cardContentOf(map, node)!;
    expect(c.previewText).toBe(LONG);
    const lines = previewLines(LONG, PREVIEW_W, wrap);
    expect(lines).toHaveLength(3);
    expect(lines[2]!.endsWith("…")).toBe(true);
    const m = measureCard(c, wrap, null);
    expect(m.height).toBe(3 * PREVIEW_LINE_H + THUMB_PAD);
    expect(m.width).toBe(PREVIEW_W + THUMB_PAD * 2);
  });

  it("card trống hoặc văn bản rỗng: không có trích; card không khối nào: không có nội dung", () => {
    expect(cardContentOf(...(Object.values(mapWith([])) as [MindMap, MindNode]))).toBeNull();
    const { map, node } = mapWith([createTextBlock("   ")]);
    expect(cardContentOf(map, node)!.previewText).toBeNull();
    expect(measureCard(cardContentOf(map, node)!, wrap, null).height).toBe(0);
  });

  it("node tự động: xếp từ dưới lên bảng → ảnh → trích văn bản, không chồng nhau", () => {
    const { map, node } = mapWith([createTextBlock("Ngắn gọn"), createImageBlock("a"), createTableBlock(2, 2)]);
    const c = cardContentOf(map, node)!;
    const m = measureCard(c, wrap, null);
    Object.assign(node, { x: 0, y: 0, width: Math.max(160, m.width), height: 36 + m.height });
    const p = placeCard(c, node, 36, 0, wrap);
    expect(p.mode).toBe("full");
    expect(p.preview!.rect.y + p.preview!.rect.height).toBeLessThanOrEqual(p.image!.rect.y);
    expect(p.image!.rect.y + p.image!.rect.height).toBeLessThanOrEqual(p.table!.rect.y);
    expect(p.table!.rect.y + p.table!.rect.height).toBeLessThanOrEqual(node.height - THUMB_PAD + 0.001);
    expect(p.preview!.rect.y).toBeGreaterThanOrEqual(36);
    expect(p.reserved).toBe(m.height);
  });

  it("kéo node nhỏ tới mức không đủ chỗ: thu thành hàng biểu tượng, chữ node được ưu tiên", () => {
    const { map, node } = mapWith([createTextBlock(LONG), createTextBlock("b"), createImageBlock("a"), createTableBlock(3, 3)]);
    const c = cardContentOf(map, node)!;
    Object.assign(node, { x: 10, y: 20, width: 120, height: 60, manualWidth: 120, manualHeight: 60 });
    const p = placeCard(c, node, 36, 0, wrap);
    expect(p.mode).toBe("compact");
    expect(p.chips.map((ch) => [ch.kind, ch.count])).toEqual([
      ["text", 2],
      ["table", 1],
      ["image", 1],
    ]);
    expect(p.reserved).toBe(CHIP_H + THUMB_PAD);
    const first = p.chips[0]!;
    expect(first.rect.width).toBe(chipWidth(2));
    expect(first.rect.y + first.rect.height).toBeLessThanOrEqual(node.y + node.height);
    // bấm biểu tượng bảng → đúng khối bảng
    const tableChip = p.chips[1]!;
    const hit = hitCardPart(p, tableChip.rect.x + 2, tableChip.rect.y + 2);
    expect(hit).toMatchObject({ kind: "chip", chipKind: "table", blockId: c.firstBlock.table });
  });

  it("node kéo to vừa đủ: vẫn hiện thẻ, số dòng trích co theo chỗ còn lại", () => {
    const { map, node } = mapWith([createTextBlock(LONG), createTableBlock(4, 3)]);
    const c = cardContentOf(map, node)!;
    Object.assign(node, { x: 0, y: 0, width: 260, height: 36 + 15 + 8 + 15 * 2 + 8 + 8, manualWidth: 260, manualHeight: 36 + 15 + 8 + 15 * 2 + 8 + 8 });
    const p = placeCard(c, node, 36, 0, wrap);
    expect(p.mode).toBe("full");
    expect(p.preview!.lines.length).toBeGreaterThanOrEqual(1);
    expect(p.preview!.lines.length).toBeLessThan(3);
    expect(p.table).not.toBeNull();
    expect(hitCardPart(p, p.preview!.rect.x + 5, p.preview!.rect.y + 3)).toMatchObject({ kind: "preview" });
  });
});
