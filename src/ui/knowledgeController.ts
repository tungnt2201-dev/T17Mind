/**
 * ui/knowledgeController.ts
 * ---------------------------------------------------------------------
 * KW2 — giữ chỉ mục tri thức toàn Workspace (core/knowledgeIndex.ts) và
 * cập nhật nó. Chỉ mục nằm trong bộ nhớ:
 *  - map đang mở luôn được dựng lại từ bản trực tiếp trong store;
 *  - các map khác đọc từ nơi lưu (chỉ đọc, không kéo card, không ghi) và
 *    chỉ dựng lại khi mốc cập nhật của chúng đổi so với lần trước;
 *  - map đã xoá bị bỏ khỏi chỉ mục.
 * Gọi `refreshKnowledgeIndex()` mỗi lần mở bảng Ctrl+K; nhiều lời gọi chồng
 * nhau dùng chung một lượt chạy.
 * ---------------------------------------------------------------------
 */
import { writable } from "svelte/store";
import { KnowledgeIndex, buildMapIndex } from "../core/knowledgeIndex";
import type { MindMap } from "../core/types";
import { flushWorkspaceWrites, listMaps, loadMapReadOnly } from "../io/storage";

export const knowledgeIndex = new KnowledgeIndex();

export interface IndexStatus {
  running: boolean;
  done: number;
  total: number;
  /** Số map không đọc được trong lượt gần nhất. */
  failed: number;
}
export const indexStatusStore = writable<IndexStatus>({ running: false, done: 0, total: 0, failed: 0 });

let running: Promise<void> | null = null;

const yieldToUi = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** Cập nhật chỉ mục cho map đang mở (rẻ, chạy đồng bộ). */
export function indexCurrentMap(map: MindMap): void {
  knowledgeIndex.set(buildMapIndex(map, Date.now()));
}

export function refreshKnowledgeIndex(getCurrent: () => MindMap): Promise<void> {
  if (running) return running;
  running = (async () => {
    try {
      indexCurrentMap(getCurrent());
      // bản ghi chờ (800 ms) phải vào thư mục trước, kẻo danh sách map còn mốc cũ → bỏ sót map vừa sửa
      await flushWorkspaceWrites();
      const entries = await listMaps();
      knowledgeIndex.retain([...entries.map((e) => e.mapId), getCurrent().mapId]);
      const todo = entries.filter((e) => e.mapId !== getCurrent().mapId && knowledgeIndex.stampOf(e.mapId) !== e.updatedAt);
      let done = 0;
      let failed = 0;
      indexStatusStore.set({ running: todo.length > 0, done, total: todo.length, failed });
      for (const e of todo) {
        const map = await loadMapReadOnly(e.mapId);
        if (map) knowledgeIndex.set(buildMapIndex(map, e.updatedAt));
        else {
          knowledgeIndex.remove(e.mapId);
          failed++;
        }
        done++;
        indexStatusStore.set({ running: done < todo.length, done, total: todo.length, failed });
        await yieldToUi();
      }
      indexCurrentMap(getCurrent()); // người dùng có thể đã sửa trong lúc đang lập chỉ mục
    } finally {
      indexStatusStore.update((s) => ({ ...s, running: false }));
      running = null;
    }
  })();
  return running;
}
