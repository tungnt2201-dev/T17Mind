/**
 * ui/dragPreview.ts
 * ---------------------------------------------------------------------
 * Kéo thả node — phần THUẦN (test được, không đụng DOM):
 *  - `buildDropCommands`: các lệnh sẽ chạy khi thả node vào một đích (dùng chung cho lúc thả THẬT và lúc xem trước).
 *  - `previewDropPositions`: chạy thử các lệnh đó trên một BẢN SAO NHẸ của map rồi xếp bố cục — ra vị trí mọi node
 *    SAU KHI thả. Trong lúc kéo, các node anh em trượt dần tới đúng vị trí này ("dạt ra nhường chỗ"), nên thả xong
 *    không có cú nhảy nào: thứ nhìn thấy lúc kéo chính là kết quả.
 * ---------------------------------------------------------------------
 */
import { CompositeCommand, MoveNodeCommand, SetNodeOffsetCommand, SetNodeSideCommand, type Command } from "../core/commands";
import { collectSubtreeIds } from "../core/tree";
import type { MindMap, MindNode } from "../core/types";
import { applyLayout, type NodeMeasurer } from "../layout";
import { dropChangesStructure, type DropTarget } from "../render/geometry";

/** Lệnh khi thả `draggedId` vào `target` (rỗng = không có gì thay đổi). Gọi khi node đã trở về offset trước lúc kéo. */
export function buildDropCommands(map: MindMap, draggedId: string, target: DropTarget): Command[] {
  const node = map.nodes[draggedId];
  if (!node) return [];
  const commands: Command[] = [];
  const index = target.kind === "child" ? map.nodes[target.parentId]?.children.length ?? 0 : target.index;
  if (dropChangesStructure(map, draggedId, target)) commands.push(new MoveNodeCommand(draggedId, target.parentId, index));
  // Cây hai bên: thả vào gốc thì ghim bên đã chọn; rời khỏi gốc thì bỏ ghim cũ (không còn ý nghĩa).
  const wantSide = target.side ?? null;
  if ((node.side ?? null) !== wantSide) commands.push(new SetNodeSideCommand(draggedId, wantSide));
  // Người dùng đã tự chọn bên → "chốt" luôn bên đang hiện của các nhánh anh em chưa ghim; nếu không, việc cân lại
  // tự động sẽ đẩy chúng sang bên kia và trông như "tự nhảy".
  if (wantSide) commands.push(...pinSiblingSides(map, target.parentId, draggedId));
  // Thả vào cây thì node nằm ĐÚNG chỗ bố cục tính — bỏ độ lệch kéo tay cũ (nếu còn), để không "trôi" khỏi khe.
  if (node.offsetX !== 0 || node.offsetY !== 0) commands.push(new SetNodeOffsetCommand(draggedId, { x: 0, y: 0 }));
  return commands;
}

/** Lệnh ghim bên đang hiện cho mọi nhánh cấp 1 chưa ghim của gốc `rootId` (trừ `exceptId`). */
export function pinSiblingSides(map: MindMap, rootId: string, exceptId: string | null): Command[] {
  const root = map.nodes[rootId];
  if (!root) return [];
  const out: Command[] = [];
  for (const id of root.children) {
    const n = map.nodes[id];
    if (!n || id === exceptId || n.side) continue;
    out.push(new SetNodeSideCommand(id, n.x + n.width <= root.x ? "left" : "right"));
  }
  return out;
}

/** Gộp thành một lệnh (một bước hoàn tác). */
export const asOneCommand = (commands: Command[]): Command =>
  commands.length === 1 ? (commands[0] as Command) : new CompositeCommand(commands, "Di chuyển trong cây");

/**
 * Vị trí (x, y) của mọi node — TRỪ node đang kéo và nhánh con của nó (chúng đi theo chuột) — sau khi thả vào
 * `target`. `restoreOffset` = offset của node đang kéo trước lúc kéo (trong lúc kéo offset của nó đang đổi liên tục).
 * Bản sao chỉ chép node (không chép ảnh/card nặng); null nếu thả không đổi gì.
 */
export function previewDropPositions(
  map: MindMap,
  draggedId: string,
  target: DropTarget,
  restoreOffset: { x: number; y: number },
  measure: NodeMeasurer
): Map<string, { x: number; y: number }> | null {
  const nodes: Record<string, MindNode> = {};
  for (const [id, n] of Object.entries(map.nodes)) nodes[id] = { ...n, children: [...n.children] };
  const clone: MindMap = { ...map, nodes };
  const dragged = nodes[draggedId];
  if (!dragged) return null;
  dragged.offsetX = restoreOffset.x;
  dragged.offsetY = restoreOffset.y;
  const commands = buildDropCommands(clone, draggedId, target);
  if (commands.length === 0) return null;
  try {
    for (const c of commands) c.apply(clone);
  } catch {
    return null;
  }
  applyLayout(clone, measure);
  const excluded = new Set(collectSubtreeIds(map, draggedId));
  const out = new Map<string, { x: number; y: number }>();
  for (const [id, n] of Object.entries(nodes)) if (!excluded.has(id)) out.set(id, { x: n.x, y: n.y });
  return out;
}
