/**
 * core/cardCommands.ts
 * ---------------------------------------------------------------------
 * M1 (Card & Block) — mọi thay đổi Card/Block đi qua Command (undo/redo).
 * Quy ước: mỗi Command chụp snapshot đúng phần nó đụng tới ở apply() và
 * khôi phục nguyên trạng ở revert(), để hoàn tác luôn chính xác kể cả
 * khi Command tự dọn ảnh/biểu đồ phụ thuộc.
 * ---------------------------------------------------------------------
 */
import { CompositeCommand, type Command } from "./commands";
import type { Block, Card, ImageAsset, MindMap, TableBlock } from "./types";
import { deepClone, requireNode } from "./tree";
import { cardAssetIds, createCard, createImageBlock, isAssetReferenced } from "./cards";
import { remapChartColumns } from "./table";

function requireCard(map: MindMap, cardId: string): Card {
  const card = map.cards[cardId];
  if (!card) throw new Error(`Card không tồn tại: ${cardId}`);
  return card;
}

/** Xoá khỏi map.assets các ảnh trong `candidateIds` mà không còn ai dùng;
 *  trả về phần đã xoá để revert() khôi phục. */
function pruneAssets(map: MindMap, candidateIds: string[], exceptCardId: string | null): Record<string, ImageAsset> {
  const removed: Record<string, ImageAsset> = {};
  for (const id of new Set(candidateIds)) {
    const asset = map.assets[id];
    if (asset && !isAssetReferenced(map, id, exceptCardId)) {
      removed[id] = asset;
      delete map.assets[id];
    }
  }
  return removed;
}

/** Tạo card MỚI và gắn vào node (node đang có card khác thì chỉ bị đổi
 *  con trỏ; card cũ vẫn còn trong map.cards). */
export class CreateCardForNodeCommand implements Command {
  readonly label = "Tạo card";
  private oldCardId: string | null = null;
  constructor(private readonly nodeId: string, private readonly card: Card) {}
  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.oldCardId = node.cardId;
    map.cards[this.card.id] = deepClone(this.card);
    node.cardId = this.card.id;
  }
  revert(map: MindMap): void {
    requireNode(map, this.nodeId).cardId = this.oldCardId;
    delete map.cards[this.card.id];
  }
}

/** Gắn một card ĐÃ CÓ vào node (nhiều node cùng trỏ một card). */
export class AttachCardToNodeCommand implements Command {
  readonly label = "Gắn card";
  private oldCardId: string | null = null;
  constructor(private readonly nodeId: string, private readonly cardId: string) {}
  apply(map: MindMap): void {
    requireCard(map, this.cardId);
    const node = requireNode(map, this.nodeId);
    this.oldCardId = node.cardId;
    node.cardId = this.cardId;
  }
  revert(map: MindMap): void {
    requireNode(map, this.nodeId).cardId = this.oldCardId;
  }
}

/** Gỡ card khỏi node (card vẫn còn trong map.cards). */
export class DetachCardFromNodeCommand implements Command {
  readonly label = "Gỡ card khỏi node";
  private oldCardId: string | null = null;
  constructor(private readonly nodeId: string) {}
  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.oldCardId = node.cardId;
    node.cardId = null;
  }
  revert(map: MindMap): void {
    requireNode(map, this.nodeId).cardId = this.oldCardId;
  }
}

/** Xoá HẲN card: gỡ khỏi mọi node đang trỏ tới và dọn ảnh không còn dùng. */
export class DeleteCardCommand implements Command {
  readonly label = "Xoá card";
  private snapshot: { card: Card; nodeIds: string[]; assets: Record<string, ImageAsset> } | null = null;
  constructor(private readonly cardId: string) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    const nodeIds = Object.values(map.nodes)
      .filter((n) => n.cardId === this.cardId)
      .map((n) => n.id);
    for (const id of nodeIds) requireNode(map, id).cardId = null;
    delete map.cards[this.cardId];
    const assets = pruneAssets(map, cardAssetIds(card), this.cardId);
    this.snapshot = { card, nodeIds, assets };
  }
  revert(map: MindMap): void {
    if (!this.snapshot) return;
    map.cards[this.cardId] = this.snapshot.card;
    for (const id of this.snapshot.nodeIds) if (map.nodes[id]) (map.nodes[id] as { cardId: string | null }).cardId = this.cardId;
    Object.assign(map.assets, this.snapshot.assets);
  }
}

export class RenameCardCommand implements Command {
  readonly label = "Đổi tên card";
  private old = "";
  constructor(private readonly cardId: string, private readonly title: string) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    this.old = card.title;
    card.title = this.title;
  }
  revert(map: MindMap): void {
    requireCard(map, this.cardId).title = this.old;
  }
}

/** Thêm một khối vào card (cuối danh sách nếu index = null). Với khối
 *  ảnh, truyền kèm `newAsset` để ghi dữ liệu ảnh vào map.assets. */
export class AddBlockCommand implements Command {
  readonly label = "Thêm khối";
  private addedAssetId: string | null = null;
  private replacedAsset: ImageAsset | null = null;
  constructor(
    private readonly cardId: string,
    private readonly block: Block,
    private readonly index: number | null = null,
    private readonly newAsset: { assetId: string; asset: ImageAsset } | null = null
  ) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    if (card.blocks.some((b) => b.id === this.block.id)) throw new Error(`Khối trùng id: ${this.block.id}`);
    if (this.newAsset) {
      this.addedAssetId = this.newAsset.assetId;
      this.replacedAsset = map.assets[this.addedAssetId] ?? null;
      map.assets[this.addedAssetId] = this.newAsset.asset;
    }
    const at = this.index === null ? card.blocks.length : Math.max(0, Math.min(this.index, card.blocks.length));
    card.blocks.splice(at, 0, deepClone(this.block));
  }
  revert(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    card.blocks = card.blocks.filter((b) => b.id !== this.block.id);
    if (this.addedAssetId) {
      if (this.replacedAsset) map.assets[this.addedAssetId] = this.replacedAsset;
      else delete map.assets[this.addedAssetId];
    }
  }
}

/** Thay nội dung một khối (cùng id) bằng bản mới — dùng cho sửa chữ,
 *  sửa bảng, đổi loại biểu đồ... */
export class ReplaceBlockCommand implements Command {
  readonly label = "Sửa khối";
  private old: Block | null = null;
  constructor(private readonly cardId: string, private readonly block: Block) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    const i = card.blocks.findIndex((b) => b.id === this.block.id);
    if (i < 0) throw new Error(`Khối không tồn tại: ${this.block.id}`);
    this.old = card.blocks[i] as Block;
    card.blocks[i] = deepClone(this.block);
  }
  revert(map: MindMap): void {
    if (!this.old) return;
    const card = requireCard(map, this.cardId);
    const i = card.blocks.findIndex((b) => b.id === this.block.id);
    if (i >= 0) card.blocks[i] = this.old;
  }
}

/**
 * M2 — lưu kết quả trình sửa bảng (một bước hoàn tác cho cả phiên sửa).
 * Khác ReplaceBlockCommand ở chỗ: các biểu đồ CÙNG card lấy số từ bảng
 * này được đưa cột về đúng chỗ theo `colOrigin` (xem core/table.ts), để
 * chèn/xoá cột không làm biểu đồ trỏ sai cột hoặc ra ngoài phạm vi.
 * `colOrigin = null` nghĩa là cột không đổi vị trí (chỉ sửa ô).
 */
export class UpdateTableCommand implements Command {
  readonly label = "Sửa bảng";
  private oldBlocks: Block[] | null = null;
  constructor(
    private readonly cardId: string,
    private readonly table: TableBlock,
    private readonly colOrigin: (number | null)[] | null = null
  ) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    const i = card.blocks.findIndex((b) => b.id === this.table.id);
    if (i < 0 || card.blocks[i]!.type !== "table") throw new Error(`Bảng không tồn tại: ${this.table.id}`);
    this.oldBlocks = card.blocks;
    const colOrigin = this.colOrigin;
    card.blocks = card.blocks.map((b) => {
      if (b.id === this.table.id) return deepClone(this.table);
      if (colOrigin && b.type === "chart" && b.tableBlockId === this.table.id) return remapChartColumns(b, colOrigin);
      return b;
    });
  }
  revert(map: MindMap): void {
    if (!this.oldBlocks) return;
    requireCard(map, this.cardId).blocks = this.oldBlocks;
  }
}

/** Xoá một khối. Xoá bảng thì đồng thời xoá các biểu đồ lấy số từ bảng
 *  đó (nếu không sẽ thành tham chiếu mồ côi); xoá ảnh thì dọn dữ liệu
 *  ảnh nếu không còn nơi nào dùng. */
export class RemoveBlockCommand implements Command {
  readonly label = "Xoá khối";
  private snapshot: { blocks: Block[]; assets: Record<string, ImageAsset> } | null = null;
  constructor(private readonly cardId: string, private readonly blockId: string) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    const target = card.blocks.find((b) => b.id === this.blockId);
    if (!target) throw new Error(`Khối không tồn tại: ${this.blockId}`);
    const before = card.blocks;
    card.blocks = before.filter(
      (b) => b.id !== this.blockId && !(b.type === "chart" && target.type === "table" && b.tableBlockId === target.id)
    );
    const removedImages = before
      .filter((b) => !card.blocks.includes(b))
      .flatMap((b) => (b.type === "image" ? [b.assetId] : []));
    const assets = pruneAssets(map, removedImages, null);
    this.snapshot = { blocks: before, assets };
  }
  revert(map: MindMap): void {
    if (!this.snapshot) return;
    requireCard(map, this.cardId).blocks = this.snapshot.blocks;
    Object.assign(map.assets, this.snapshot.assets);
  }
}

/** Đổi vị trí một khối trong card (toIndex tính trên danh sách SAU khi
 *  đã rút khối ra, và được kẹp vào phạm vi hợp lệ). */
export class MoveBlockCommand implements Command {
  readonly label = "Di chuyển khối";
  private oldIndex = -1;
  constructor(private readonly cardId: string, private readonly blockId: string, private readonly toIndex: number) {}
  apply(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    this.oldIndex = card.blocks.findIndex((b) => b.id === this.blockId);
    if (this.oldIndex < 0) throw new Error(`Khối không tồn tại: ${this.blockId}`);
    const [b] = card.blocks.splice(this.oldIndex, 1);
    const at = Math.max(0, Math.min(this.toIndex, card.blocks.length));
    card.blocks.splice(at, 0, b as Block);
  }
  revert(map: MindMap): void {
    const card = requireCard(map, this.cardId);
    const cur = card.blocks.findIndex((b) => b.id === this.blockId);
    if (cur < 0 || this.oldIndex < 0) return;
    const [b] = card.blocks.splice(cur, 1);
    card.blocks.splice(this.oldIndex, 0, b as Block);
  }
}

/**
 * M3 — thêm một hoặc nhiều ảnh vào card của node (dán Ctrl+V, kéo-thả
 * file, chọn file). Node chưa có card thì tạo card mới (tên = chữ của
 * node). Tất cả gộp thành MỘT bước hoàn tác.
 */
export function buildAddImagesToNodeCommand(
  map: MindMap,
  nodeId: string,
  images: { assetId: string; asset: ImageAsset; caption?: string }[]
): Command {
  const node = requireNode(map, nodeId);
  const commands: Command[] = [];
  let cardId = node.cardId && map.cards[node.cardId] ? node.cardId : null;
  if (!cardId) {
    const card = createCard(node.text);
    commands.push(new CreateCardForNodeCommand(nodeId, card));
    cardId = card.id;
  }
  for (const img of images) {
    commands.push(
      new AddBlockCommand(cardId, createImageBlock(img.assetId, img.caption ?? ""), null, { assetId: img.assetId, asset: img.asset })
    );
  }
  return new CompositeCommand(commands, images.length > 1 ? `Thêm ${images.length} ảnh` : "Thêm ảnh");
}
