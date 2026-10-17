/**
 * layout/treeUp.ts
 * ---------------------------------------------------------------------
 * P2.7c — Bố cục "Tree Up": soi gương dọc của Tree Down — gốc DƯỚI
 * cùng, cây toả dần LÊN TRÊN.
 *
 * Khác treeDown.ts ở MỘT điểm đáng chú ý: tham số vị trí thứ 3 truyền
 * xuống đệ quy là "bottomY" (Y của MÉP DƯỚI node này), không phải
 * "depthY"/"topY" như treeDown — vì cây toả lên trên, mốc tự nhiên để
 * neo mỗi node là mép GẦN GỐC HƠN (mép dưới), không phải mép xa gốc.
 * Nhờ vậy MỌI ANH EM cùng cấp tự động có chung MÉP DƯỚI thẳng hàng dù
 * chiều cao mỗi node khác nhau (ví dụ do fontSize hay textFit="wrap"
 * tuỳ chỉnh riêng) — đối xứng đúng với treeDown, nơi anh em chung MÉP
 * TRÊN thẳng hàng.
 *
 * node.x/node.y vẫn luôn có nghĩa "mép trái/mép TRÊN trong toạ độ
 * world" (không đổi theo layout) — nên node.baseY ở đây LUÔN được tính
 * ra là bottomY - node.height (mép trên = mép dưới trừ chiều cao),
 * không gán trực tiếp bottomY vào baseY như treeDown gán depthY.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";

const V_GAP = 60;
const H_GAP = 16;

export function layoutTreeUp(map: MindMap): void {
  for (const rootId of getRootIds(map)) {
    layoutSubtreeUp(map, rootId, 0, 0);
  }
}

/** XUẤT RA để dành sẵn nếu sau này có biến thể khác cần dùng lại
 *  (giống cách layoutSubtreeRight/Left/Down đã được xuất). */
export function layoutSubtreeUp(map: MindMap, nodeId: string, startX: number, bottomY: number): number {
  const node = requireNode(map, nodeId);
  node.baseY = bottomY - node.height;

  if (node.children.length === 0 || node.collapsed) {
    node.baseX = startX;
    return node.width + H_GAP;
  }

  let cursorX = startX;
  let totalWidth = 0;
  const childBottomY = node.baseY - V_GAP;
  for (const childId of node.children) {
    const used = layoutSubtreeUp(map, childId, cursorX, childBottomY);
    cursorX += used;
    totalWidth += used;
  }

  const firstChild = requireNode(map, node.children[0] as string);
  const lastChild = requireNode(map, node.children[node.children.length - 1] as string);
  node.baseX = (firstChild.baseX + lastChild.baseX) / 2;

  return Math.max(totalWidth, node.width + H_GAP);
}
