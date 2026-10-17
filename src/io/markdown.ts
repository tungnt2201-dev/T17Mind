/**
 * io/markdown.ts
 * ---------------------------------------------------------------------
 * Xuất mindmap ra Markdown dạng danh sách lồng nhau — mở được bằng bất
 * kỳ trình soạn thảo text nào, dùng tốt với Obsidian/Notion/GitHub.
 *
 * PHẠM VI (cố tình đơn giản, không cố gắng xuất MỌI thuộc tính node):
 *   - Chữ chính của node, xuống dòng theo đúng cấp (2 dấu cách/cấp)
 *   - checked !== null -> checkbox to-do `- [x]`/`- [ ]` (cú pháp
 *     GitHub-Flavored Markdown, đọc được ở hầu hết công cụ hiện đại)
 *   - link (nếu có) -> `[chữ](link)` thay vì chữ trơn
 *   - Tag -> hashtag `#TênTag` nối vào cuối dòng
 *   - Nhiều gốc (nhánh trôi) -> mỗi gốc một khối riêng, cách nhau
 *     đúng một dòng trống
 * KHÔNG xuất: ghi chú, màu sắc, độ ưu tiên/tiến độ, quan hệ chéo, tóm
 * tắt, khoanh vùng, ghi chú dán — đây là bản xuất "cấu trúc outline",
 * không phải xuất đầy đủ dữ liệu (dùng "Xuất JSON" cho việc đó).
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode } from "../core/types";
import { getRootIds } from "../core/tree";

/** Markdown coi `*`/`_`/`[`/`]` là ký tự đặc biệt — thoát để chữ node
 *  chứa các ký tự đó không bị hiểu nhầm thành định dạng. */
function escapeMarkdownText(text: string): string {
  return text.replace(/([*_[\]])/g, "\\$1");
}

export function exportMarkdown(map: MindMap): string {
  const tagNameById = new Map(map.tags.map((t) => [t.id, t.name]));

  const lines: string[] = [];

  const visit = (nodeId: string, depth: number): void => {
    const node = map.nodes[nodeId] as MindNode;
    const indent = "  ".repeat(depth);
    const checkbox = node.checked === null ? "" : node.checked ? "[x] " : "[ ] ";
    const escapedText = escapeMarkdownText(node.text || "(trống)");
    const textPart = node.link ? `[${escapedText}](${node.link})` : escapedText;
    const tagsPart = node.tagIds
      .map((id) => tagNameById.get(id))
      .filter((name): name is string => !!name)
      .map((name) => ` #${name.replace(/\s+/g, "")}`)
      .join("");
    lines.push(`${indent}- ${checkbox}${textPart}${tagsPart}`);
    for (const childId of node.children) visit(childId, depth + 1);
  };

  const rootIds = getRootIds(map);
  for (let i = 0; i < rootIds.length; i++) {
    if (i > 0) lines.push(""); // dòng trống giữa các nhánh trôi độc lập
    visit(rootIds[i] as string, 0);
  }

  return lines.join("\n") + "\n";
}
