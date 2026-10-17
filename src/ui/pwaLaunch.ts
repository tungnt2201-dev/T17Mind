/**
 * ui/pwaLaunch.ts
 * ---------------------------------------------------------------------
 * P1.15 (đóng gói PWA) — 2 việc, CẢ HAI đều tự kiểm tra API có tồn tại
 * trước khi dùng, nên AN TOÀN GỌI TỪ main.ts DÙNG CHUNG cho cả bản
 * 1-file (mở qua file://, không có các API này) lẫn bản PWA (phục vụ
 * qua http/https):
 *
 * 1. Đăng ký service worker (public/sw.js) — chỉ tồn tại/hoạt động
 *    trên bản PWA; qua file:// gọi register() sẽ tự thất bại êm, có
 *    bọc try/catch để không in lỗi đỏ vô ích ra console cho bản cũ.
 *
 * 2. Tiêu thụ Launch Handler API (`window.launchQueue`) — khi người
 *    dùng double-click một file `.json`/`.xmind` đã liên kết với
 *    PWA đã cài, trình duyệt gọi launchQueue's consumer với file đó;
 *    ở đây đọc file rồi TÁI DÙNG ĐÚNG luồng nhập đã có sẵn
 *    (`controller.importJson`/`controller.importXmind`) theo đuôi
 *    file — không viết lại logic đọc/parse nào mới.
 * ---------------------------------------------------------------------
 */
import type { AppController } from "./appController";
import { showErrors } from "./errorBox";

/** Kiểu tối thiểu cho Launch Handler API — TypeScript's lib.dom.d.ts
 *  (bản đang dùng) chưa có sẵn (API còn khá mới, chỉ Chromium hỗ trợ). */
declare global {
  interface LaunchParams {
    files: FileSystemFileHandle[];
  }
  interface LaunchQueue {
    setConsumer(consumer: (params: LaunchParams) => void | Promise<void>): void;
  }
  interface Window {
    launchQueue?: LaunchQueue;
  }
}

export function setupPwaLaunchHandling(controller: AppController): void {
  // --- 1. Service worker — chỉ có ý nghĩa trên bản PWA thật (phục vụ
  // qua http/https); qua file:// API này không tồn tại/không hoạt
  // động, bọc try/catch để im lặng bỏ qua thay vì log lỗi đỏ vô ích. ---
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Bản 1-file (file://) hoặc trình duyệt không hỗ trợ — bỏ qua,
      // đây KHÔNG phải lỗi cần báo cho người dùng.
    });
  }

  // --- 2. Mở file qua liên kết (double-click .json/.xmind sau khi đã
  // cài PWA) — CHỈ tồn tại trên Chrome/Edge đã cài PWA, kiểm tra kỹ
  // trước khi dùng. ---
  if (!window.launchQueue) return;
  window.launchQueue.setConsumer(async (params) => {
    const handle = params.files[0];
    if (!handle) return; // mở app bình thường (không kèm file) — không làm gì thêm
    let file: File;
    try {
      file = await handle.getFile();
    } catch (err) {
      showErrors("Không mở được file", [String((err as Error).message ?? err)]);
      return;
    }
    const name = file.name.toLocaleLowerCase();
    if (name.endsWith(".xmind")) {
      await controller.importXmind(file);
    } else if (name.endsWith(".t17m")) {
      await controller.importT17m(file);
    } else {
      // Mặc định coi là JSON — khớp đúng khai báo "accept" trong
      // manifest.json (đăng ký .json/.xmind/.t17m, không có gì khác).
      await controller.importJson(file);
    }
  });
}
