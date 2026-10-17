/**
 * core/clipboard.ts
 * ---------------------------------------------------------------------
 * P1.7 — Sao chép, cắt, dán, nhân bản.
 *
 * ClipboardNode là dạng dữ liệu "trung tính": có nội dung và định dạng
 * của một node, nhưng KHÔNG có id, không có toạ độ. Lý do không giữ id
 * cũ: nếu dán nhiều lần từ cùng một lần copy, mỗi lần dán phải sinh
 * node hoàn toàn mới — giữ id cũ sẽ đụng độ ngay ở lần dán thứ hai.
 *
 * Hai chiều chuyển đổi:
 *   node cây  <-> ClipboardNode   (sao chép/dán NỘI BỘ trong ứng dụng)
 *   node cây  <-> văn bản thụt lề (dán ra Word/Notepad, dán từ đó vào)
 * ---------------------------------------------------------------------
 */
import type { BorderStyle, EdgeShape, MindMap } from "./types";
import { createNode, requireNode } from "./tree";
import type { MindNode } from "./types";

export interface ClipboardNode {
  text: string;
  notes: string | null;
  color: string | null;
  fill: string | null;
  fillTransparent: boolean;
  borderStyle: BorderStyle;
  borderColor: string | null;
  link: string | null;
  edgeColor: string | null;
  edgeDash: boolean;
  edgeShape: EdgeShape;
  collapsed: boolean;
  children: ClipboardNode[];
}

/** Node cây -> ClipboardNode (đệ quy, kèm toàn bộ con cháu). */
export function nodeToClipboardNode(map: MindMap, nodeId: string): ClipboardNode {
  const node = requireNode(map, nodeId);
  return {
    text: node.text,
    notes: node.notes,
    color: node.color,
    fill: node.fill,
    fillTransparent: node.fillTransparent,
    borderStyle: node.borderStyle,
    borderColor: node.borderColor,
    link: node.link,
    edgeColor: node.edgeColor,
    edgeDash: node.edgeDash,
    edgeShape: node.edgeShape,
    collapsed: node.collapsed,
    children: node.children.map((childId) => nodeToClipboardNode(map, childId)),
  };
}

/** ClipboardNode -> cây node MỚI (id mới hoàn toàn), chưa gắn vào map.
 *  Nơi gọi (một Command) chịu trách nhiệm gắn `all` vào map.nodes và
 *  nối `root.id` vào children[] của node cha thật sự. */
export function clipboardNodeToTree(
  clip: ClipboardNode,
  parentId: string | null
): { root: MindNode; all: MindNode[] } {
  const node = createNode(clip.text, parentId);
  node.notes = clip.notes;
  node.color = clip.color;
  node.fill = clip.fill;
  node.fillTransparent = clip.fillTransparent;
  node.borderStyle = clip.borderStyle;
  node.borderColor = clip.borderColor;
  node.link = clip.link;
  node.edgeColor = clip.edgeColor;
  node.edgeDash = clip.edgeDash;
  node.edgeShape = clip.edgeShape;
  node.collapsed = clip.collapsed;

  const all: MindNode[] = [node];
  for (const childClip of clip.children) {
    const built = clipboardNodeToTree(childClip, node.id);
    node.children.push(built.root.id);
    all.push(...built.all);
  }
  return { root: node, all };
}

// ---------------------------------------------------------------------
// Văn bản thụt lề — để dán được sang Word/Notepad và dán ngược lại.
// ---------------------------------------------------------------------

/** Một node và toàn bộ con cháu -> nhiều dòng text, thụt lề bằng tab. */
export function nodeToIndentedText(map: MindMap, nodeId: string, depth = 0): string {
  const node = requireNode(map, nodeId);
  const line = "\t".repeat(depth) + node.text;
  const childLines = node.children.map((childId) => nodeToIndentedText(map, childId, depth + 1));
  return [line, ...childLines].join("\n");
}

export function forestToIndentedText(map: MindMap, nodeIds: string[]): string {
  return nodeIds.map((id) => nodeToIndentedText(map, id, 0)).join("\n");
}

function blankClipboardNode(text: string): ClipboardNode {
  return {
    text,
    notes: null,
    color: null,
    fill: null,
    fillTransparent: false,
    borderStyle: "solid",
    borderColor: null,
    link: null,
    edgeColor: null,
    edgeDash: false,
    edgeShape: "curve",
    collapsed: false,
    children: [],
  };
}

/** Đoán đơn vị thụt lề đang dùng trong văn bản: tab, hoặc N dấu cách. */
function detectIndentUnit(lines: string[]): "tab" | number {
  for (const line of lines) {
    if (line.startsWith("\t")) return "tab";
    const match = /^ +/.exec(line);
    if (match && match[0].length >= 2) return match[0].length;
  }
  return "tab";
}

/** Tách một dòng thành (độ sâu thụt lề, nội dung đã bỏ thụt lề và bỏ
 *  dấu gạch đầu dòng kiểu Markdown nếu có: "- ", "* ", "+ "). */
function measureIndent(line: string, unit: "tab" | number): { depth: number; content: string } {
  let rest = line;
  let depth = 0;
  if (unit === "tab") {
    while (rest.startsWith("\t")) {
      rest = rest.slice(1);
      depth++;
    }
  } else {
    const chunk = " ".repeat(unit);
    while (rest.startsWith(chunk)) {
      rest = rest.slice(unit);
      depth++;
    }
  }
  const bullet = /^[-*+]\s+/.exec(rest);
  if (bullet) rest = rest.slice(bullet[0].length);
  return { depth, content: rest.trim() };
}

/**
 * Văn bản thụt lề tuỳ ý -> rừng ClipboardNode (nhiều cây gốc, vì một
 * đoạn dán có thể chứa nhiều mục cùng cấp cao nhất). Chấp nhận cả tab
 * lẫn khoảng trắng, và bỏ qua dấu gạch đầu dòng Markdown nếu có.
 */
export function parseIndentedText(text: string): ClipboardNode[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const unit = detectIndentUnit(lines);
  const parsed = lines.map((line) => measureIndent(line, unit));

  const roots: ClipboardNode[] = [];
  const stack: { depth: number; node: ClipboardNode }[] = [];

  for (const { depth, content } of parsed) {
    const node = blankClipboardNode(content);
    while (stack.length > 0 && (stack[stack.length - 1] as { depth: number }).depth >= depth) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      (stack[stack.length - 1] as { node: ClipboardNode }).node.children.push(node);
    }
    stack.push({ depth, node });
  }

  return roots;
}
