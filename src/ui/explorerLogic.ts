/**
 * ui/explorerLogic.ts
 * ---------------------------------------------------------------------
 * P2.8 — logic THUẦN TUÝ cho Explorer (lọc theo chữ + Tag), tách khỏi
 * component Svelte để tự kiểm bằng script gọi thẳng, không cần dựng
 * UI — cùng tinh thần với render/geometry.ts tách khỏi CanvasRenderer.
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode } from "../core/types";
import { getRootIds } from "../core/tree";

/**
 * Một node có "khớp" bộ lọc hiện tại hay không — CHỈ xét CHÍNH node
 * đó (không xét con cháu), dùng làm viên gạch cho
 * `computeFilterVisibleIds` bên dưới.
 */
export function nodeMatchesFilter(
  node: MindNode,
  searchText: string,
  selectedTagIds: Set<string>,
  tagFilterMode: "and" | "or"
): boolean {
  const trimmed = searchText.trim().toLocaleLowerCase();
  if (trimmed && !node.text.toLocaleLowerCase().includes(trimmed)) return false;
  if (selectedTagIds.size === 0) return true;
  if (tagFilterMode === "or") {
    return node.tagIds.some((t) => selectedTagIds.has(t));
  }
  // "and" — node phải có ĐỦ mọi Tag đã chọn (selectedTagIds là tập
  // con của node.tagIds), không chỉ giao nhau một phần.
  for (const t of selectedTagIds) {
    if (!node.tagIds.includes(t)) return false;
  }
  return true;
}

/**
 * Tính tập hợp id "NÊN HIỆN" trong danh sách khi đang lọc — bao gồm
 * cả node THẬT SỰ khớp lẫn MỌI TỔ TIÊN của nó (giữ nguyên đường dẫn
 * cây, không mất ngữ cảnh cấu trúc — giống cách nhiều trình duyệt tệp
 * vẫn làm khi lọc/tìm kiếm). Trả về `null` khi KHÔNG có bộ lọc nào
 * đang áp dụng (chữ tìm kiếm rỗng VÀ chưa chọn Tag nào) — nơi gọi coi
 * `null` là "hiện bình thường theo đúng trạng thái thu gọn/mở, không
 * qua bộ lọc".
 */
export function computeFilterVisibleIds(
  map: MindMap,
  searchText: string,
  selectedTagIds: Set<string>,
  tagFilterMode: "and" | "or"
): Set<string> | null {
  const hasFilter = searchText.trim().length > 0 || selectedTagIds.size > 0;
  if (!hasFilter) return null;

  const visible = new Set<string>();
  const visit = (id: string): boolean => {
    const node = map.nodes[id];
    if (!node) return false;
    let anyDescendantMatch = false;
    for (const childId of node.children) {
      if (visit(childId)) anyDescendantMatch = true;
    }
    const selfMatch = nodeMatchesFilter(node, searchText, selectedTagIds, tagFilterMode);
    if (selfMatch || anyDescendantMatch) {
      visible.add(id);
      return true;
    }
    return false;
  };
  for (const rootId of getRootIds(map)) visit(rootId);
  return visible;
}
