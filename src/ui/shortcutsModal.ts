/** ui/shortcutsModal.ts — bảng phím tắt đầy đủ, mở/đóng bằng dấu "?". */
import { byId } from "./dom";

export function wireShortcutsModal(): void {
  const overlay = byId("shortcuts-overlay");
  byId("shortcuts-close").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });
}

export function toggleShortcutsModal(): void {
  byId("shortcuts-overlay").classList.toggle("open");
}
