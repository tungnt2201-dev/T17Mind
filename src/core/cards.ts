/**
 * core/cards.ts
 * ---------------------------------------------------------------------
 * M1 (Card & Block) — hàm THUẦN (không đổi map) để tạo và kiểm tra
 * Card/Block. Mọi thay đổi trên map thật đi qua Command ở
 * core/cardCommands.ts.
 * ---------------------------------------------------------------------
 */
import type { Block, Card, ChartBlock, ImageBlock, MindMap, TableAlign, TableBlock, TextBlock } from "./types";
import { generateBlockId, generateCardId } from "./tree";

export function createCard(title = ""): Card {
  return { id: generateCardId(), title, blocks: [] };
}

export function createTextBlock(text = ""): TextBlock {
  return { id: generateBlockId(), type: "text", text };
}

/** Bảng rỗng `rows` x `cols` (tối thiểu 1x1), hàng đầu là tiêu đề. */
export function createTableBlock(rows = 3, cols = 3, title = ""): TableBlock {
  const r = Math.max(1, Math.floor(rows));
  const c = Math.max(1, Math.floor(cols));
  return {
    id: generateBlockId(),
    type: "table",
    title,
    headerRow: true,
    align: Array.from({ length: c }, (): TableAlign => "left"),
    cells: Array.from({ length: r }, () => Array.from({ length: c }, () => "")),
  };
}

export function createImageBlock(assetId: string, caption = ""): ImageBlock {
  return { id: generateBlockId(), type: "image", assetId, caption };
}

export function createChartBlock(tableBlockId: string, kind: ChartBlock["kind"] = "bar"): ChartBlock {
  return {
    id: generateBlockId(),
    type: "chart",
    title: "",
    kind,
    tableBlockId,
    labelColumn: 0,
    seriesColumns: [1],
  };
}

/** Một dòng mô tả ngắn của khối (dùng ở danh sách khối, tìm kiếm...). */
export function summarizeBlock(block: Block): string {
  switch (block.type) {
    case "text": {
      const first = block.text.split("\n").find((l) => l.trim().length > 0) ?? "";
      return first.length > 60 ? first.slice(0, 57) + "..." : first || "(văn bản trống)";
    }
    case "table": {
      const rows = block.cells.length;
      const cols = block.align.length;
      return `${block.title ? block.title + " — " : ""}Bảng ${rows}×${cols}`;
    }
    case "image":
      return block.caption || "Ảnh";
    case "chart":
      return `${block.title ? block.title + " — " : ""}Biểu đồ ${block.kind}`;
  }
}

/** Mọi assetId mà các khối ảnh trong card đang dùng. */
export function cardAssetIds(card: Card): string[] {
  const ids: string[] = [];
  for (const b of card.blocks) if (b.type === "image") ids.push(b.assetId);
  return ids;
}

/** Tài sản ảnh còn được dùng ở đâu đó trong map không (node.imageAssetId
 *  hoặc khối ảnh của bất kỳ card nào, trừ card `exceptCardId`)? */
export function isAssetReferenced(map: MindMap, assetId: string, exceptCardId: string | null = null): boolean {
  for (const n of Object.values(map.nodes)) if (n.imageAssetId === assetId) return true;
  for (const c of Object.values(map.cards)) {
    if (c.id === exceptCardId) continue;
    if (cardAssetIds(c).includes(assetId)) return true;
  }
  return false;
}

/** Kiểm tra một card; trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateCard(card: Card, assets: MindMap["assets"]): string[] {
  const errors: string[] = [];
  const where = `Card "${card.id}"`;
  if (typeof card.title !== "string") errors.push(`${where} có title không phải chữ.`);
  if (!Array.isArray(card.blocks)) {
    errors.push(`${where} có blocks không phải mảng.`);
    return errors;
  }
  const seen = new Set<string>();
  for (const b of card.blocks) {
    if (!b || typeof b.id !== "string" || b.id.length === 0) {
      errors.push(`${where} có khối thiếu id.`);
      continue;
    }
    if (seen.has(b.id)) errors.push(`${where} có hai khối trùng id "${b.id}".`);
    seen.add(b.id);
  }
  for (const b of card.blocks) {
    if (!b) continue;
    const bw = `${where}, khối "${b.id}"`;
    switch (b.type) {
      case "text":
        if (typeof b.text !== "string") errors.push(`${bw}: text không phải chữ.`);
        break;
      case "table": {
        const cols = Array.isArray(b.align) ? b.align.length : -1;
        if (cols < 1) errors.push(`${bw}: bảng cần ít nhất 1 cột (align).`);
        if (!Array.isArray(b.cells) || b.cells.length < 1) {
          errors.push(`${bw}: bảng cần ít nhất 1 hàng.`);
          break;
        }
        b.cells.forEach((row, r) => {
          if (!Array.isArray(row) || row.length !== cols) {
            errors.push(`${bw}: hàng ${r} có ${Array.isArray(row) ? row.length : "?"} ô, cần ${cols}.`);
          } else if (row.some((c) => typeof c !== "string")) {
            errors.push(`${bw}: hàng ${r} có ô không phải chữ.`);
          }
        });
        break;
      }
      case "image":
        if (!assets[b.assetId]) errors.push(`${bw}: tham chiếu ảnh không tồn tại "${b.assetId}".`);
        break;
      case "chart": {
        const t = card.blocks.find((x) => x.id === b.tableBlockId);
        if (!t || t.type !== "table") {
          errors.push(`${bw}: biểu đồ trỏ tới bảng không tồn tại "${b.tableBlockId}".`);
          break;
        }
        const cols = t.align.length;
        const colsOk = [b.labelColumn, ...b.seriesColumns].every((c) => Number.isInteger(c) && c >= 0 && c < cols);
        if (!colsOk) errors.push(`${bw}: biểu đồ dùng cột ngoài phạm vi bảng (${cols} cột).`);
        if (b.seriesColumns.length === 0) errors.push(`${bw}: biểu đồ cần ít nhất 1 cột số liệu.`);
        break;
      }
      default:
        errors.push(`${bw}: loại khối không hỗ trợ "${(b as { type?: unknown }).type}".`);
    }
  }
  return errors;
}
