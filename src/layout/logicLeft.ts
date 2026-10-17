/**
 * layout/logicLeft.ts
 * ---------------------------------------------------------------------
 * P2.7a — Bố cục "Logic Left": soi gương ngang của logicRight.ts —
 * gốc bên phải, các nhánh toả dần sang TRÁI theo tầng.
 *
 * QUAN TRỌNG: node.x vẫn luôn có nghĩa là MÉP TRÁI của khung node
 * trong toạ độ world (không đổi ý nghĩa theo layout) — mọi nơi khác
 * trong app (hit-test, kéo-thả, xuất PNG...) đọc node.x/width theo
 * đúng quy ước đó. Vì vậy "toả sang trái" ở đây có nghĩa là TOẠ ĐỘ
 * baseX của các con càng ngày càng ÂM hơn (nhỏ hơn) khi càng sâu, chứ
 * không phải đổi ý nghĩa của node.x. Việc vẽ đường nối đúng chiều
 * (mép trái cha nối mép phải con, ngược hẳn logicRight) là việc riêng
 * của render/geometry.ts#parentChildEdgeAnchors, không phải việc của
 * layout — layout chỉ lo TOẠ ĐỘ, không lo VẼ.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";

const H_GAP = 60;
const V_GAP = 16;

export function layoutLogicLeft(map: MindMap): void {
  for (const rootId of getRootIds(map)) {
    layoutSubtreeLeft(map, rootId, 0, 0);
  }
}

/** Giống hệt kết cấu đệ quy của layoutSubtreeRight trong logicRight.ts,
 *  chỉ khác duy nhất công thức tính childX: đặt con sao cho MÉP PHẢI
 *  của nó cách MÉP TRÁI cha đúng H_GAP về phía trái — ngược hẳn
 *  logicRight (đặt MÉP TRÁI con cách MÉP PHẢI cha đúng H_GAP về phía
 *  phải). Vì mỗi con có thể rộng khác nhau, phải trừ đúng bề rộng của
 *  TỪNG con khi tính, không thể dùng chung một childX cho mọi con như
 *  logicRight làm được (ở đó mọi con đều bắt đầu từ cùng một childX).
 *
 *  P2.7b — XUẤT RA (trước đây private) để layout/logicBoth.ts dùng
 *  lại cho NỬA BÊN TRÁI của bố cục "cả hai bên". */
export function layoutSubtreeLeft(map: MindMap, nodeId: string, depthX: number, startY: number): number {
  const node = requireNode(map, nodeId);

  if (node.children.length === 0 || node.collapsed) {
    node.baseX = depthX;
    node.baseY = startY;
    return node.height + V_GAP;
  }

  let cursorY = startY;
  let totalHeight = 0;
  for (const childId of node.children) {
    const child = requireNode(map, childId);
    const childX = depthX - H_GAP - child.width;
    const used = layoutSubtreeLeft(map, childId, childX, cursorY);
    cursorY += used;
    totalHeight += used;
  }

  const firstChild = requireNode(map, node.children[0] as string);
  const lastChild = requireNode(map, node.children[node.children.length - 1] as string);
  node.baseX = depthX;
  node.baseY = (firstChild.baseY + lastChild.baseY) / 2;

  return Math.max(totalHeight, node.height + V_GAP);
}
