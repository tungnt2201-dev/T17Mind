/**
 * core/search.ts
 * ---------------------------------------------------------------------
 * Bù nợ P1.10 (Tìm kiếm) — làm sau P2.3 theo yêu cầu, vì nhiều bước sau
 * (Navigator ở P2.8 trong phụ lục) cần dùng lại đúng phần lõi này.
 *
 * Hàm ở đây THUẦN TUÝ — chỉ nhận MindMap, trả về danh sách id, không
 * đụng DOM/canvas/store gì cả. Việc CHỌN node kết quả, BUNG nhánh đang
 * thu gọn để lộ ra, và CUỘN khung nhìn tới là việc của UI (xem
 * AppController#revealNode), không phải việc của file này.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "./types";
import { collectAllNodeIdsInOrder } from "./tree";

/**
 * Bỏ dấu tiếng Việt + hạ chữ thường, để "gap" tìm ra được "gấp". Dùng
 * Unicode NFD (tách chữ cái khỏi dấu) rồi lọc bỏ các ký tự dấu — cách
 * chuẩn, không cần bảng ánh xạ ký tự thủ công. "đ"/"Đ" xử lý riêng vì
 * NFD không tách được nó thành "d" + dấu (đây là chữ cái riêng trong
 * bảng chữ cái tiếng Việt, không phải "d" có dấu).
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Tìm mọi node có TEXT hoặc NOTES chứa từ khoá — không phân biệt hoa
 * thường, không phân biệt dấu tiếng Việt. Duyệt TOÀN BỘ cây (kể cả bên
 * trong nhánh đang thu gọn — xem collectAllNodeIdsInOrder), theo đúng
 * thứ tự hiển thị trên-xuống, để kết quả ổn định và không bỏ sót.
 */
export function searchNodes(map: MindMap, query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const needle = normalizeForSearch(trimmed);

  const results: string[] = [];
  for (const id of collectAllNodeIdsInOrder(map)) {
    const node = map.nodes[id];
    if (!node) continue;
    const haystack = normalizeForSearch(`${node.text} ${node.notes ?? ""}`);
    if (haystack.includes(needle)) results.push(id);
  }
  return results;
}
