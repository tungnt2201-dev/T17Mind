import { describe, it, expect } from "vitest";
import { createEmptyMap } from "../core/tree";
import { createCard, createImageBlock, createTextBlock } from "../core/cards";
import {
  getNodeImageBlocks,
  assetDims,
  imageThumbLayout,
  imageReservedHeight,
  imageThumbRect,
  IMAGE_THUMB_HEIGHT,
  IMAGE_THUMB_MIN_HEIGHT,
  fitImageLayout,
} from "./imageThumb";
import { THUMB_PAD } from "./tableThumb";

describe("Thẻ ảnh trên node (M3)", () => {
  it("chỉ lấy khối ảnh có dữ liệu ảnh thật, theo thứ tự trong card", () => {
    const map = createEmptyMap("Gốc");
    map.assets.a = { mimeType: "image/png", dataBase64: "QQ==" };
    const card = createCard();
    const i1 = createImageBlock("a");
    const missing = createImageBlock("khong_co");
    card.blocks = [createTextBlock("x"), missing, i1];
    map.cards[card.id] = card;
    const root = map.nodes[map.rootId]!;
    expect(getNodeImageBlocks(map, root)).toEqual([]);
    root.cardId = card.id;
    expect(getNodeImageBlocks(map, root).map((b) => b.id)).toEqual([i1.id]);
  });

  it("assetDims bỏ qua kích thước thiếu/sai (file từ ngoài)", () => {
    expect(assetDims({ mimeType: "image/png", dataBase64: "", width: 40, height: 20 })).toEqual({ width: 40, height: 20 });
    expect(assetDims({ mimeType: "image/png", dataBase64: "" })).toBeNull();
    expect(assetDims({ mimeType: "image/png", dataBase64: "", width: "40" as never, height: 20 })).toBeNull();
    expect(assetDims({ mimeType: "image/png", dataBase64: "", width: 0, height: 20 })).toBeNull();
  });

  it("cao theo cỡ hiển thị, rộng theo tỉ lệ ảnh (kẹp 0.5–3, chưa biết thì 4:3), '+N' cho ảnh còn lại", () => {
    const blocks = [createImageBlock("a", "", "large"), createImageBlock("b"), createImageBlock("c")];
    const l = imageThumbLayout(blocks, { width: 1600, height: 800 })!;
    expect(l).toMatchObject({ height: IMAGE_THUMB_HEIGHT.large, width: IMAGE_THUMB_HEIGHT.large * 2, more: 2 });
    expect(imageThumbLayout([createImageBlock("a", "", "small")], null)).toMatchObject({
      height: 48,
      width: 64,
      more: 0,
    });
    expect(imageThumbLayout([createImageBlock("a")], { width: 10000, height: 10 })!.width).toBe(IMAGE_THUMB_HEIGHT.medium * 3);
    expect(imageThumbLayout([], null)).toBeNull();
    expect(imageReservedHeight(l)).toBe(l.height + THUMB_PAD);
    expect(imageReservedHeight(null)).toBe(0);
  });

  it("imageThumbRect nằm ngay trên phần bên dưới (thẻ bảng + hàng Tag), căn giữa", () => {
    const l = imageThumbLayout([createImageBlock("a")], { width: 4, height: 3 })!;
    const node = { x: 0, y: 0, width: 200, height: 300 };
    const r = imageThumbRect(node, l, 50);
    expect(r.x).toBe((200 - l.width) / 2);
    expect(r.y + r.height).toBe(300 - 50 - THUMB_PAD);
  });

  it("fitImageLayout: node kéo nhỏ thì ảnh co theo, giữ tỉ lệ", () => {
    const l = imageThumbLayout([createImageBlock("a")], { width: 4, height: 3 })!; // 112×84
    const small = fitImageLayout(l, { width: 56, height: 200 }, true);
    expect(small.width).toBe(56);
    expect(small.height).toBe(42);
    const short = fitImageLayout(l, { width: 500, height: 42 }, false);
    expect(short).toMatchObject({ width: 56, height: 42 });
  });

  it("fitImageLayout: kéo to thì giãn (chỉ khi được phép), không nhỏ hơn mức tối thiểu", () => {
    const l = imageThumbLayout([createImageBlock("a")], { width: 4, height: 3 })!;
    expect(fitImageLayout(l, { width: 400, height: 168 }, true)).toMatchObject({ width: 224, height: 168 });
    expect(fitImageLayout(l, { width: 400, height: 168 }, false)).toBe(l); // có bảng bên dưới: không giãn
    expect(fitImageLayout(l, { width: 5, height: -20 }, true).height).toBe(IMAGE_THUMB_MIN_HEIGHT);
  });
});
