/**
 * layout/logicBoth.ts
 * ---------------------------------------------------------------------
 * P2.7b — Bố cục "Logic Both Sides" (kiểu mindmap cổ điển): CHỈ CON
 * TRỰC TIẾP của gốc (hoặc của mỗi nhánh trôi — coi như gốc riêng) mới
 * bị chia sang 2 bên. Một khi một nhánh đã "cam kết" đi bên nào, TOÀN
 * BỘ cây con của nó đi theo đúng bên đó tới hết — tái dùng NGUYÊN XI
 * layoutSubtreeRight/layoutSubtreeLeft đã có, không viết lại thuật
 * toán đệ quy lần thứ ba.
 *
 * Cách chia bên: TỰ ĐỘNG CÂN BẰNG theo tổng CHIỀU CAO cây con (không
 * phải chỉ đếm số lượng) — sắp giảm dần theo chiều cao, lần lượt gán
 * vào bên đang NHẸ HƠN (thuật toán cân bằng tham lam kinh điển cho 2
 * "thùng"). Đo chiều cao bằng cách CHẠY THỬ layoutSubtreeRight cho
 * MỌI con trước (một "dry run" — vị trí tạm thời này sẽ bị GHI ĐÈ
 * hoàn toàn ở bước sau, dry run chỉ cần đúng con số chiều cao trả về,
 * không cần vị trí đúng).
 *
 * CHƯA CÓ ở bản này: kéo tay ép một nhánh cụ thể sang bên chỉ định —
 * để dành cho sau nếu cần (đã thống nhất trước khi làm bước này).
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { requireNode, getRootIds } from "../core/tree";
import { layoutSubtreeRight } from "./logicRight";
import { layoutSubtreeLeft } from "./logicLeft";

const H_GAP = 60;

/** `rootIds`: các cây cần xếp (mặc định mọi cây) — applyLayout gọi riêng cho từng nhóm cây cùng bố cục. */
export function layoutLogicBoth(map: MindMap, rootIds: string[] = getRootIds(map)): void {
  for (const rootId of rootIds) {
    layoutBothSidesRoot(map, rootId);
  }
}

function layoutBothSidesRoot(map: MindMap, rootId: string): void {
  const root = requireNode(map, rootId);

  if (root.children.length === 0 || root.collapsed) {
    root.baseX = 0;
    root.baseY = 0;
    return;
  }

  // 1) "Dry run" đo chiều cao từng nhánh cấp 1 — vị trí tạm thời này
  //    sẽ bị ghi đè hoàn toàn ở bước 3, chỉ cần đúng con số trả về.
  const heights = new Map<string, number>();
  for (const childId of root.children) {
    heights.set(childId, layoutSubtreeRight(map, childId, 0, 0));
  }

  // 2) Cân bằng tham lam: nhánh CAO NHẤT xử lý trước, luôn nhét vào
  //    bên đang NHẸ HƠN tại thời điểm đó.
  const sortedByHeight = [...root.children].sort(
    (a, b) => (heights.get(b) ?? 0) - (heights.get(a) ?? 0)
  );
  const sideOf = new Map<string, "left" | "right">();
  let rightTotal = 0;
  let leftTotal = 0;
  for (const childId of sortedByHeight) {
    const h = heights.get(childId) ?? 0;
    if (rightTotal <= leftTotal) {
      sideOf.set(childId, "right");
      rightTotal += h;
    } else {
      sideOf.set(childId, "left");
      leftTotal += h;
    }
  }

  // 3) Layout THẬT theo đúng THỨ TỰ GỐC trong map.nodes (không phải
  //    thứ tự đã sắp theo chiều cao ở bước 2) — để trên-xuống-dưới
  //    trong MỖI BÊN vẫn khớp đúng thứ tự trong cây dữ liệu, dễ đoán
  //    hơn cho người dùng thay vì bị xáo trộn theo kích cỡ.
  let cursorRight = 0;
  let cursorLeft = 0;
  let rightFirstY: number | null = null;
  let rightLastY = 0;
  let leftFirstY: number | null = null;
  let leftLastY = 0;

  for (const childId of root.children) {
    const child = requireNode(map, childId);
    if (sideOf.get(childId) === "right") {
      const used = layoutSubtreeRight(map, childId, root.width + H_GAP, cursorRight);
      if (rightFirstY === null) rightFirstY = child.baseY;
      rightLastY = child.baseY;
      cursorRight += used;
    } else {
      // Ngược với logicLeft.ts gọi layoutSubtreeLeft cho CON của một
      // node khác (nơi childX được TÍNH SẴN bằng cách trừ bề rộng con
      // trước khi gọi) — ở đây CHÍNH child này là "gốc" của lượt gọi,
      // nên phải tự trừ bề rộng của nó TRƯỚC khi gọi, y hệt logic mà
      // layoutSubtreeLeft vốn làm cho con của nó.
      const leftDepthX = -H_GAP - child.width;
      const used = layoutSubtreeLeft(map, childId, leftDepthX, cursorLeft);
      if (leftFirstY === null) leftFirstY = child.baseY;
      leftLastY = child.baseY;
      cursorLeft += used;
    }
  }

  // 4) Gốc đặt tại điểm giữa của TOÀN BỘ 2 bên gộp lại — không nhất
  //    thiết đúng giữa hình học tuyệt đối nếu 2 bên không cân hoàn
  //    toàn (thuật toán cân bằng ở bước 2 chỉ CỐ GẮNG giảm chênh
  //    lệch, không đảm bảo bằng nhau tuyệt đối).
  const rightMid = rightFirstY !== null ? (rightFirstY + rightLastY) / 2 : null;
  const leftMid = leftFirstY !== null ? (leftFirstY + leftLastY) / 2 : null;
  root.baseX = 0;
  if (rightMid !== null && leftMid !== null) {
    root.baseY = (rightMid + leftMid) / 2;
  } else {
    root.baseY = rightMid ?? leftMid ?? 0;
  }
}
