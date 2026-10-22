/**
 * core/cardRegistry.ts
 * ---------------------------------------------------------------------
 * KW1 — Card dùng chung giữa nhiều map. Hàm THUẦN:
 *  - Mỗi card có một bản chuẩn trong Workspace: `cards/<cardId>.json`
 *    (card + dữ liệu các ảnh nó dùng) — xem io/workspaceRepo.ts.
 *  - Mỗi map VẪN giữ bản sao card trong map.cards (file .t17m tự chứa đủ,
 *    gửi đi vẫn mở được).
 *  - Đồng bộ theo "bản mới hơn thắng": so `updatedAt`, bằng nhau thì so
 *    `rev` (cả hai chỉ tăng — kể cả khi hoàn tác, xem cardCommands.ts#touchCard).
 *    Lưu map → card trong map mới hơn bản chuẩn thì ghi đè bản chuẩn.
 *    Mở map → bản chuẩn mới hơn thì thay bản sao trong map.
 * ---------------------------------------------------------------------
 */
import type { Card, ImageAsset, MindMap } from "./types";
import { cardAssetIds, isAssetReferenced, validateCard } from "./cards";
import { deepClone } from "./tree";

export const CARD_FILE_FORMAT = "t17mind-card";

export interface CardVersion {
  updatedAt: number;
  rev: number;
}

export interface RegistryCardFile {
  format: typeof CARD_FILE_FORMAT;
  version: 1;
  card: Card;
  /** Dữ liệu các ảnh card dùng (id → ảnh), để chép card sang map khác đủ ảnh. */
  assets: Record<string, ImageAsset>;
}

/** `a` mới hơn `b`? */
export function isNewer(a: CardVersion, b: CardVersion): boolean {
  return a.updatedAt > b.updatedAt || (a.updatedAt === b.updatedAt && a.rev > b.rev);
}

export function versionOf(card: Card): CardVersion {
  return { updatedAt: card.updatedAt ?? 0, rev: card.rev ?? 0 };
}

/** Gói một card của map thành nội dung file `cards/<id>.json`. */
export function buildCardFile(map: MindMap, card: Card): RegistryCardFile {
  const assets: Record<string, ImageAsset> = {};
  for (const id of cardAssetIds(card)) {
    const a = map.assets[id];
    if (a) assets[id] = { ...a };
  }
  return { format: CARD_FILE_FORMAT, version: 1, card: deepClone(card), assets };
}

/** Đọc file card; null nếu hỏng / không hợp lệ (thiếu ảnh nó dùng cũng tính là hỏng). */
export function parseCardFile(text: string): RegistryCardFile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.format !== CARD_FILE_FORMAT || typeof r.card !== "object" || r.card === null) return null;
  const card = r.card as Card;
  const assets = (typeof r.assets === "object" && r.assets !== null ? r.assets : {}) as Record<string, ImageAsset>;
  if (typeof card.id !== "string" || !card.id) return null;
  const c: Card = {
    ...card,
    createdAt: Number.isFinite(card.createdAt) ? card.createdAt : 0,
    updatedAt: Number.isFinite(card.updatedAt) ? card.updatedAt : 0,
    rev: Number.isFinite(card.rev) ? card.rev : 0,
  };
  if (validateCard(c, assets).length > 0) return null;
  return { format: CARD_FILE_FORMAT, version: 1, card: c, assets };
}

/**
 * Thay bản sao card trong map bằng bản chuẩn (gồm cả ảnh). Ảnh mà bản
 * cũ dùng nhưng bản mới không dùng, và không còn ai trong map dùng, được
 * dọn khỏi map.assets. Thao tác lúc MỞ map (không phải chỉnh sửa của người
 * dùng) nên không đi qua Command / không vào lịch sử hoàn tác.
 */
export function applyCardFile(map: MindMap, file: RegistryCardFile): void {
  const old = map.cards[file.card.id];
  map.cards[file.card.id] = deepClone(file.card);
  for (const id of cardAssetIds(file.card)) {
    const a = file.assets[id];
    if (a) map.assets[id] = { ...a };
  }
  if (old) {
    for (const id of cardAssetIds(old)) {
      if (!isAssetReferenced(map, id)) delete map.assets[id];
    }
  }
}
