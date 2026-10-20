import { describe, it, expect } from "vitest";
import { createEmptyMap } from "../core/tree";
import { createCard, createTableBlock, createTextBlock } from "../core/cards";
import {
  getNodeThumbTable,
  getThumbLayout,
  thumbLayoutForTable,
  thumbReservedHeight,
  thumbRect,
  THUMB_CELL_W,
  THUMB_ROW_H,
  THUMB_MORE_W,
  THUMB_MORE_H,
  THUMB_PAD,
  THUMB_CELL_W_MAX,
} from "./tableThumb";

function mapWithCard(blocks: ReturnType<typeof createTextBlock | typeof createTableBlock>[]) {
  const map = createEmptyMap("Gốc");
  const card = createCard("C");
  card.blocks = blocks;
  map.cards[card.id] = card;
  const root = map.nodes[map.rootId]!;
  root.cardId = card.id;
  return { map, root };
}

describe("Thẻ thu nhỏ của bảng trên node (M2)", () => {
  it("node không có card/bảng thì không có thẻ, không chiếm chiều cao", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId]!;
    expect(getThumbLayout(map, root)).toBeNull();
    expect(thumbReservedHeight(null)).toBe(0);
    const { map: m2, root: r2 } = mapWithCard([createTextBlock("chỉ chữ")]);
    expect(getThumbLayout(m2, r2)).toBeNull();
  });

  it("lấy bảng ĐẦU TIÊN trong card", () => {
    const t1 = createTableBlock(2, 2);
    const t2 = createTableBlock(3, 3);
    const { map, root } = mapWithCard([createTextBlock("x"), t1, t2]);
    expect(getNodeThumbTable(map, root)?.id).toBe(t1.id);
  });

  it("kích thước chỉ phụ thuộc số hàng/cột hiển thị (tối đa 4×5, thêm chỗ cho '…')", () => {
    const small = thumbLayoutForTable(createTableBlock(2, 3));
    expect(small.width).toBe(3 * THUMB_CELL_W);
    expect(small.height).toBe(2 * THUMB_ROW_H);
    const big = thumbLayoutForTable(createTableBlock(20, 9));
    expect(big.width).toBe(5 * THUMB_CELL_W + THUMB_MORE_W);
    expect(big.height).toBe(4 * THUMB_ROW_H + THUMB_MORE_H);
    expect(thumbReservedHeight(big)).toBe(big.height + THUMB_PAD);
  });

  it("thumbRect neo đáy (trên hàng Tag), căn giữa ngang, nằm trọn trong node", () => {
    const layout = thumbLayoutForTable(createTableBlock(3, 3));
    const node = { x: 100, y: 50, width: 200, height: 36 + thumbReservedHeight(layout) + 22 };
    const r = thumbRect(node, layout, 22);
    expect(r.x).toBe(100 + (200 - layout.width) / 2);
    expect(r.y + r.height).toBe(node.y + node.height - 22 - THUMB_PAD);
    expect(r.y).toBeGreaterThanOrEqual(node.y + 36);
  });

  it("khung bằng đúng cỡ mặc định thì ra đúng bố cục mặc định (node tự động không đổi)", () => {
    const t = createTableBlock(10, 8);
    const def = thumbLayoutForTable(t);
    const same = thumbLayoutForTable(t, { width: def.width, height: def.height }, true);
    expect(same).toMatchObject({ width: def.width, height: def.height, cellW: THUMB_CELL_W });
  });

  it("node tự động nhưng rộng (tiêu đề dài): ô giãn rộng, vẫn giữ trần 5×4", () => {
    const l = thumbLayoutForTable(createTableBlock(10, 8), { width: 600, height: 400 }, true);
    expect(l.thumb.cells).toHaveLength(4);
    expect(l.thumb.align).toHaveLength(5);
    expect(l.cellW).toBeGreaterThan(THUMB_CELL_W);
    expect(l.cellW).toBeLessThanOrEqual(THUMB_CELL_W_MAX);
    expect(l.width).toBeLessThanOrEqual(600);
  });

  it("node kéo to tay: hiện thêm hàng/cột vừa khung, bảng nhỏ thì hiện đủ không có '…'", () => {
    const big = thumbLayoutForTable(createTableBlock(30, 12), { width: 500, height: 200 }, false);
    expect(big.thumb.cells.length).toBe(Math.floor((200 - THUMB_MORE_H) / THUMB_ROW_H));
    expect(big.thumb.align.length).toBe(Math.floor((500 - THUMB_MORE_W) / THUMB_CELL_W));
    expect(big.thumb).toMatchObject({ moreRows: true, moreCols: true });
    expect(big.width).toBeLessThanOrEqual(500);
    expect(big.height).toBeLessThanOrEqual(200);

    const small = thumbLayoutForTable(createTableBlock(7, 4), { width: 500, height: 200 }, false);
    expect(small.thumb.cells).toHaveLength(7);
    expect(small.thumb).toMatchObject({ moreRows: false, moreCols: false });
    expect(small.cellW).toBe(Math.min(THUMB_CELL_W_MAX, Math.floor(500 / 4)));
  });

  it("khung quá nhỏ vẫn hiện ít nhất 1×1", () => {
    const l = thumbLayoutForTable(createTableBlock(5, 5), { width: 10, height: 5 }, false);
    expect(l.thumb.cells).toHaveLength(1);
    expect(l.thumb.align).toHaveLength(1);
  });
});
