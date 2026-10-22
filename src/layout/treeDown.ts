/**
 * layout/treeDown.ts
 * ---------------------------------------------------------------------
 * P2.7c — Bố cục "Tree Down": gốc trên cùng, cây toả dần XUỐNG DƯỚI.
 * Đây là lần đầu tiên trong dự án ĐỘ SÂU ánh xạ theo TRỤC Y (không
 * phải X như logicRight/Left/Both) — kết cấu thuật toán giống hệt
 * logicRight.ts, chỉ HOÁN ĐỔI vai trò X↔Y: "depthX" trở thành
 * "depthY" (độ sâu), "cursorY/startY" trở thành "cursorX/startX" (vị
 * trí trong hàng anh em).
 *
 * QUAN TRỌNG: node.x/node.y vẫn luôn có nghĩa "mép trái/mép trên
 * trong toạ độ world" (không đổi ý nghĩa theo layout) — như đã áp
 * dụng nhất quán từ P2.7a. Việc vẽ đường nối đúng hướng (mép dưới cha
 * nối mép trên con) là việc riêng của render/geometry.ts, không phải
 * việc của layout.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";

const V_GAP = 60; // khoảng cách giữa các TẦNG (vai trò của H_GAP ở logicRight)
const H_GAP = 16; // khoảng cách giữa các ANH EM cùng tầng (vai trò của V_GAP ở logicRight)

/** `rootIds`: các cây cần xếp (mặc định mọi cây) — applyLayout gọi riêng cho từng nhóm cây cùng bố cục. */
export function layoutTreeDown(map: MindMap, rootIds: string[] = getRootIds(map)): void {
  for (const rootId of rootIds) {
    layoutSubtreeDown(map, rootId, 0, 0);
  }
}

/** Đệ quy: đặt vị trí cho nodeId tại (quanh startX, depthY), trả về
 *  tổng BỀ RỘNG mà cây con này chiếm dụng theo chiều ngang — vai trò
 *  hệt "chiều cao" trong layoutSubtreeRight, chỉ đổi trục. XUẤT RA để
 *  Organization Chart (dùng chung layout này, chỉ khác kiểu vẽ đường
 *  nối) và Tree Up (soi gương dọc) dùng lại sau này. */
export function layoutSubtreeDown(map: MindMap, nodeId: string, startX: number, depthY: number): number {
  const node = requireNode(map, nodeId);

  if (node.children.length === 0 || node.collapsed) {
    node.baseX = startX;
    node.baseY = depthY;
    return node.width + H_GAP;
  }

  let cursorX = startX;
  let totalWidth = 0;
  const childY = depthY + node.height + V_GAP;
  for (const childId of node.children) {
    const used = layoutSubtreeDown(map, childId, cursorX, childY);
    cursorX += used;
    totalWidth += used;
  }

  const firstChild = requireNode(map, node.children[0] as string);
  const lastChild = requireNode(map, node.children[node.children.length - 1] as string);
  node.baseX = (firstChild.baseX + lastChild.baseX) / 2;
  node.baseY = depthY;

  return Math.max(totalWidth, node.width + H_GAP);
}
