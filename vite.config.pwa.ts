import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// P1.15 (đóng gói PWA) — build RIÊNG cho bản PWA, TÁCH HẲN khỏi
// vite.config.ts (bản 1-file, mở qua file://). KHÔNG dùng
// `viteSingleFile` — bản PWA CẦN các file rời (manifest.json, sw.js,
// icon-*.png) để trình duyệt tải riêng, nhét chung vào 1 file HTML sẽ
// làm hỏng cả Web App Manifest lẫn Service Worker (cả 2 API BẮT BUỘC
// phải là file/URL độc lập, không thể inline). Output vào `dist-pwa/`
// (khác `dist/` của bản 1-file) — 2 bản build KHÔNG BAO GIỜ trộn lẫn.
//
// Entry point riêng `index.pwa.html` (khác `index.html`) — file đó có
// thêm <link rel="manifest">, meta theme-color mà bản 1-file không có
// (và không cần, vì file:// không hỗ trợ 2 API này).
export default defineConfig({
  plugins: [svelte()],
  build: {
    target: "es2020",
    outDir: "dist-pwa",
    rollupOptions: {
      input: "index.pwa.html",
    },
  },
});
