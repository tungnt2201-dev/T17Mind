/**
 * render/labelRows.ts
 * ---------------------------------------------------------------------
 * Chia các viên ở đáy node (viên Tag + thẻ giá trị thuộc tính) thành NHIỀU DÒNG vừa bề rộng cho phép. Hàm THUẦN —
 * đo chữ được tiêm vào qua `widthOf` — nên kiểm thử được; CanvasRenderer dùng cho cả đo node lẫn vẽ.
 * Quy tắc: viên Tag luôn đi cùng thẻ giá trị ĐẦU TIÊN của nó (không tách Tag khỏi thẻ ngay sau); thẻ nào đứng một
 * mình mà vẫn quá rộng thì nằm riêng một dòng; tối đa `maxRows` dòng, phần dư thay bằng viên `more` ở cuối dòng cuối.
 * ---------------------------------------------------------------------
 */
export interface RowItem {
  kind: "tag" | "chip";
  gapAfter: number;
}

export function packLabelRows<T extends RowItem>(items: readonly T[], widthOf: (it: T) => number, avail: number, maxRows: number, more: T): T[][] {
  const rowWidth = (row: readonly T[]): number => row.reduce((a, it, i) => a + widthOf(it) + (i < row.length - 1 ? it.gapAfter : 0), 0);
  const units: T[][] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (it.kind === "tag" && items[i + 1]?.kind === "chip") units.push([it, items[++i]!]);
    else units.push([it]);
  }
  const rows: T[][] = [[]];
  for (const u of units) {
    const cur = rows[rows.length - 1]!;
    if (cur.length > 0 && rowWidth([...cur, ...u]) > avail) rows.push([...u]);
    else rows[rows.length - 1] = [...cur, ...u];
  }
  if (rows[0]!.length === 0) return [];
  if (rows.length > maxRows) {
    const kept = rows.slice(0, maxRows);
    kept[maxRows - 1] = [...kept[maxRows - 1]!, more];
    return kept;
  }
  return rows;
}
