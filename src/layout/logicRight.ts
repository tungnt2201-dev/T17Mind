/**
 * layout/logicRight.ts
 * ---------------------------------------------------------------------
 * Bố cục "logic một bên" — kiểu mặc định hiện tại: gốc bên trái, các
 * nhánh toả sang phải theo tầng. Đây là hàm layout DUY NHẤT của phase 1;
 * kiến trúc registry ở index.ts để dành chỗ cho các bố cục khác ở P2.7
 * (cây hai bên, sơ đồ tổ chức, xương cá) mà không phải sửa lại chỗ gọi.
 *
 * Hàm ở đây CHỈ ghi node.baseX / node.baseY. Không đụng tới node.x/y
 * (đó là baseX/Y + offset thủ công, do applyAllOffsets tính ở index.ts)
 * và không vẽ gì lên màn hình.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";

const H_GAP = 60; // khoảng cách ngang giữa hai tầng cha-con
const V_GAP = 16; // khoảng cách dọc giữa hai node anh em

/**
 * P2.5 — mỗi gốc (map.rootId hoặc một nhánh trôi bất kỳ) được xếp bố
 * cục ĐỘC LẬP, luôn bắt đầu từ (depthX=0, startY=0) cho CHÍNH nó. Vị
 * trí THẬT của một nhánh trôi trên canvas do offsetX/offsetY của nó
 * quyết định (xem applyAllOffsets ở layout/index.ts) — cơ chế "kéo tự
 * do" đã có sẵn từ P1.6 áp dụng y nguyên, không cần thêm gì mới: kéo
 * một nhánh trôi đi chỗ khác chỉ là đổi offsetX/offsetY của gốc đó,
 * giống hệt kéo một node thường.
 */
export function layoutLogicRight(map: MindMap): void {
  for (const rootId of getRootIds(map)) {
    layoutSubtreeRight(map, rootId, 0, 0);
  }
}

/** Đệ quy: đặt vị trí cho nodeId tại (depthX, quanh startY), trả về
 *  tổng chiều cao mà cây con này chiếm dụng theo chiều dọc — để hàm
 *  gọi (là chính nó, ở tầng cha) biết dịch node anh em kế tiếp xuống
 *  bao nhiêu. Đây là ví dụ thực tế của "đệ quy" trong từ điển thuật ngữ.
 *
 *  P2.7b — XUẤT RA (trước đây private) để layout/logicBoth.ts gọi lại
 *  nguyên xi cho NỬA BÊN PHẢI của bố cục "cả hai bên", không viết lại
 *  cùng một logic đệ quy lần thứ hai. */
export function layoutSubtreeRight(map: MindMap, nodeId: string, depthX: number, startY: number): number {
  const node = requireNode(map, nodeId);

  if (node.children.length === 0 || node.collapsed) {
    node.baseX = depthX;
    node.baseY = startY;
    return node.height + V_GAP;
  }

  const childX = depthX + node.width + H_GAP;
  let cursorY = startY;
  let totalHeight = 0;
  for (const childId of node.children) {
    const used = layoutSubtreeRight(map, childId, childX, cursorY);
    cursorY += used;
    totalHeight += used;
  }

  // căn giữa node cha theo chiều dọc so với con đầu và con cuối
  const firstChild = requireNode(map, node.children[0] as string);
  const lastChild = requireNode(map, node.children[node.children.length - 1] as string);
  node.baseX = depthX;
  node.baseY = (firstChild.baseY + lastChild.baseY) / 2;

  return Math.max(totalHeight, node.height + V_GAP);
}
