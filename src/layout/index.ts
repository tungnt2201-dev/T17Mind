/**
 * layout/index.ts
 * ---------------------------------------------------------------------
 * Điểm vào duy nhất của lớp layout. Hai trách nhiệm:
 *
 *  1. Sổ đăng ký các thuật toán layout (hiện chỉ có "logicRight";
 *     P2.7 sẽ thêm cây hai bên, sơ đồ tổ chức vào đây mà KHÔNG cần
 *     sửa applyLayout hay bất cứ chỗ nào gọi nó).
 *
 *  2. applyAllOffsets — cộng dồn offset kéo tay (offsetX/Y) từ gốc
 *     xuống lá để ra toạ độ x/y cuối cùng dùng để vẽ.
 *
 * LƯU Ý KIẾN TRÚC: việc "đo chữ rộng bao nhiêu pixel" cần tới
 * CanvasRenderingContext2D, vốn là khái niệm của lớp render — nếu
 * layout/ tự import canvas, nó sẽ phá quy tắc phụ thuộc một chiều
 * (layout phải đứng dưới render). Giải pháp: layout KHÔNG tự đo, mà
 * NHẬN một hàm đo (NodeMeasurer) do nơi gọi (render/ hoặc main.ts)
 * cung cấp. Đây gọi là "dependency injection" — xem từ điển thuật ngữ
 * nếu muốn tra lại khi gặp cụm này ở chỗ khác.
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode, LayoutType } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";
import { layoutLogicRight } from "./logicRight";
import { layoutLogicLeft } from "./logicLeft";
import { layoutLogicBoth } from "./logicBoth";
import { layoutTreeDown } from "./treeDown";
import { layoutTreeUp } from "./treeUp";

export type { LayoutType };

export type NodeMeasurer = (
  node: MindNode,
  isRoot: boolean
) => { width: number; height: number };

const LAYOUTS: Record<LayoutType, (map: MindMap) => void> = {
  logicRight: layoutLogicRight,
  logicLeft: layoutLogicLeft,
  logicBoth: layoutLogicBoth,
  treeDown: layoutTreeDown,
  // P2.7c — Organization Chart dùng CHUNG thuật toán xếp vị trí với
  // Tree Down, chỉ khác kiểu vẽ đường nối (xem CanvasRenderer.ts) —
  // không cần viết thuật toán layout riêng.
  orgChart: layoutTreeDown,
  treeUp: layoutTreeUp,
};

/**
 * Điểm vào chính: đo kích thước mọi node (trừ node đã ép kích thước
 * thủ công), chạy thuật toán layout để tính baseX/baseY, rồi cộng dồn
 * offset thủ công để ra toạ độ x/y cuối cùng.
 *
 * P2.7a — layoutType giờ ĐỌC TỪ CHÍNH map.layoutType (thuộc tính lưu
 * trong tài liệu), không còn nhận qua tham số riêng — layout là một
 * lựa chọn của TÀI LIỆU (lưu lại, xuất/nhập theo file), không phải
 * một tuỳ chọn tạm thời mỗi lần gọi applyLayout.
 */
export function applyLayout(map: MindMap, measure: NodeMeasurer): void {
  sizeAllNodes(map, measure);
  const layoutFn = LAYOUTS[map.layoutType] ?? layoutLogicRight;
  layoutFn(map);
  applyAllOffsets(map);
}

function sizeAllNodes(map: MindMap, measure: NodeMeasurer): void {
  // P2.5: "isRoot" (kiểu chữ to, nền xanh mặc định) giờ áp dụng cho MỌI
  // gốc — map.rootId lẫn mọi nhánh trôi — không chỉ riêng map.rootId.
  const rootIds = new Set(getRootIds(map));
  for (const id of Object.keys(map.nodes)) {
    const node = requireNode(map, id);
    const isRoot = rootIds.has(id);
    if (node.manualWidth != null && node.manualHeight != null) {
      node.width = node.manualWidth;
      node.height = node.manualHeight;
      continue;
    }
    const measured = measure(node, isRoot);
    node.width = node.manualWidth ?? measured.width;
    node.height = node.manualHeight ?? measured.height;
  }
}

/**
 * Cộng dồn offsetX/offsetY từ gốc xuống lá. Kéo một node lệch khỏi vị
 * trí tự động sẽ khiến TOÀN BỘ cây con của nó dịch theo cùng một
 * lượng — đây là hành vi "kéo cả nhánh đi theo" mà v3 đã có.
 *
 * P2.5: chạy walk() RIÊNG cho từng gốc (map.rootId + mọi nhánh trôi),
 * mỗi lần đều bắt đầu accX=accY=0 — nghĩa là offsetX/offsetY của CHÍNH
 * một nhánh trôi (node gốc của nó) chính là TOẠ ĐỘ TUYỆT ĐỐI của nó
 * trên canvas, không cộng dồn từ đâu khác. Đây là lý do "kéo nhánh
 * trôi đi chỗ khác" dùng lại được nguyên xi cơ chế kéo tự do đã có.
 */
export function applyAllOffsets(map: MindMap): void {
  const walk = (id: string, accX: number, accY: number): void => {
    const node = map.nodes[id];
    if (!node) return;
    const nextX = accX + node.offsetX;
    const nextY = accY + node.offsetY;
    node.x = node.baseX + nextX;
    node.y = node.baseY + nextY;
    for (const childId of node.children) walk(childId, nextX, nextY);
  };
  for (const rootId of getRootIds(map)) walk(rootId, 0, 0);
}
