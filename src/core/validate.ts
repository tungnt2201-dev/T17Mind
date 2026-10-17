/**
 * core/validate.ts
 * ---------------------------------------------------------------------
 * Kiểm tra một MindMap có hợp lệ không. Dùng ở ba nơi:
 *   1. Ngay sau khi nhập file JSON/XLSX (io/) — chặn dữ liệu hỏng
 *      trước khi nó chạm vào state của ứng dụng.
 *   2. Sau mỗi thao tác thay đổi cây (dùng khi viết test ở P1.13).
 *   3. Trước khi lưu file, để không bao giờ ghi ra một file hỏng.
 *
 * Trả về mảng rỗng nghĩa là hợp lệ. Không throw — lỗi dữ liệu là
 * chuyện thường gặp (file từ nguồn khác, gõ tay sai), không phải một
 * ngoại lệ chương trình.
 * ---------------------------------------------------------------------
 */
import type { MindMap, ValidationErrors } from "./types";
import { getRootIds } from "./tree";

export function validateMindMap(map: MindMap): ValidationErrors {
  const errors: ValidationErrors = [];

  if (!map.rootId || !map.nodes[map.rootId]) {
    errors.push(`rootId "${map.rootId}" không khớp với node nào trong nodes.`);
    return errors; // không kiểm tiếp được nếu gốc chính đã sai
  }

  const allIds = Object.keys(map.nodes);
  const rootNode = map.nodes[map.rootId];
  if (rootNode && rootNode.parentId !== null) {
    errors.push(`Node gốc chính "${map.rootId}" không được có parentId khác null.`);
  }

  // 1) Mọi children phải trỏ tới node có thật.
  for (const id of allIds) {
    const node = map.nodes[id];
    if (!node) continue;
    for (const childId of node.children) {
      if (!map.nodes[childId]) {
        errors.push(`Node "${id}" có children trỏ tới node không tồn tại: "${childId}".`);
      }
    }
  }

  // 2) parentId phải khớp NGƯỢC LẠI với children của node cha đó.
  // P2.5: một node có parentId = null KHÔNG CÒN LÀ LỖI nữa nếu đó không
  // phải map.rootId — nó là một "nhánh trôi", một cây độc lập tách rời
  // khỏi cây chính. Chỉ còn lỗi nếu parentId trỏ tới một node có thật
  // nhưng node cha đó lại không liệt kê nó trong children.
  for (const id of allIds) {
    const node = map.nodes[id];
    if (!node || id === map.rootId || node.parentId === null) continue;
    const parent = map.nodes[node.parentId];
    if (!parent) {
      errors.push(`Node "${id}" có parentId trỏ tới node không tồn tại: "${node.parentId}".`);
      continue;
    }
    if (!parent.children.includes(id)) {
      errors.push(`Node "${id}" nhận "${node.parentId}" làm cha, nhưng cha đó không liệt kê nó trong children.`);
    }
  }

  // 3) Không có vòng lặp: duyệt từ MỌI gốc (map.rootId + mọi nhánh
  // trôi) phải phủ hết mọi node — khác bản trước P2.5 chỉ duyệt từ
  // đúng một mình map.rootId.
  const reachable = new Set<string>();
  const stack: string[] = [...getRootIds(map)];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (reachable.has(cur)) continue; // đã thăm rồi -> nếu gặp lại là có vòng lặp phía trên
    reachable.add(cur);
    const node = map.nodes[cur];
    if (node) stack.push(...node.children);
  }
  for (const id of allIds) {
    if (!reachable.has(id)) {
      errors.push(`Node "${id}" không kết nối được tới gốc nào (mồ côi hoặc nằm trong vòng lặp).`);
    }
  }

  // 4) Quan hệ chéo và tóm tắt phải trỏ tới node có thật.
  for (const r of map.relationships) {
    if (!map.nodes[r.fromId]) errors.push(`Relationship "${r.id}" có fromId không tồn tại: "${r.fromId}".`);
    if (!map.nodes[r.toId]) errors.push(`Relationship "${r.id}" có toId không tồn tại: "${r.toId}".`);
  }
  for (const s of map.summaries) {
    for (const nodeId of s.nodeIds) {
      if (!map.nodes[nodeId]) errors.push(`Summary "${s.id}" tham chiếu node không tồn tại: "${nodeId}".`);
    }
    if (s.nodeIds.length < 2) {
      errors.push(`Summary "${s.id}" phải gồm ít nhất 2 node, hiện có ${s.nodeIds.length}.`);
    }
  }

  for (const b of map.boundaries) {
    for (const nodeId of b.nodeIds) {
      if (!map.nodes[nodeId]) errors.push(`Boundary "${b.id}" tham chiếu node không tồn tại: "${nodeId}".`);
    }
    if (b.nodeIds.length < 1) {
      errors.push(`Boundary "${b.id}" phải gồm ít nhất 1 node.`);
    }
  }

  // P2.7e — tagIds của mỗi node phải trỏ tới Tag có thật trong danh
  // sách tập trung map.tags.
  const tagIdSet = new Set(map.tags.map((t) => t.id));
  for (const id of allIds) {
    const node = map.nodes[id];
    if (!node) continue;
    for (const tagId of node.tagIds) {
      if (!tagIdSet.has(tagId)) {
        errors.push(`Node "${id}" có tagIds tham chiếu Tag không tồn tại: "${tagId}".`);
      }
    }
  }

  // P2.10 — imageAssetId của mỗi node phải trỏ tới ảnh có thật trong
  // kho tập trung map.assets (cùng nguyên tắc với tagIds/map.tags ở trên).
  for (const id of allIds) {
    const node = map.nodes[id];
    if (!node || node.imageAssetId === null) continue;
    if (!map.assets[node.imageAssetId]) {
      errors.push(`Node "${id}" có imageAssetId tham chiếu ảnh không tồn tại: "${node.imageAssetId}".`);
    }
  }

  // Không có đoạn xác thực riêng cho stickyNotes (P2.5b) — khác
  // Boundary/Summary/Relationship, ghi chú dán không tham chiếu tới
  // node nào cả nên không có gì để kiểm tra chéo.

  return errors;
}

/** Tiện ích: throw nếu dữ liệu không hợp lệ. Dùng ở io/ trước khi
 *  chấp nhận một file vừa nhập vào làm trạng thái ứng dụng. */
export function assertValidMindMap(map: MindMap): void {
  const errors = validateMindMap(map);
  if (errors.length > 0) {
    throw new Error("Dữ liệu mindmap không hợp lệ:\n" + errors.join("\n"));
  }
}
