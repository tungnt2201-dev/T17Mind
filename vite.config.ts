import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

// P1.4 — build ra đúng một file HTML tự chứa, mở được bằng file://
// không qua server. xlsx được cài qua npm (không dùng CDN) nên
// cũng được đóng gói thẳng vào file này, ứng dụng không cần mạng.
//
// P2.1 — thêm plugin Svelte, CHỈ dùng cho panel/toolbar/hộp thoại
// hướng dẫn (xem src/ui/components/). Canvas vẫn hoàn toàn vanilla,
// không import Svelte ở bất cứ đâu trong render/ hay layout/.
//
// P1.15 (đóng gói PWA) — thư mục public/ giờ chứa manifest.json/sw.js/
// icon-*.png dành RIÊNG cho bản PWA (xem vite.config.pwa.ts). Vite MẶC
// ĐỊNH tự copy toàn bộ public/ vào dist/ dù build này không hề tham
// chiếu tới chúng — phá vỡ đúng cam kết "một file HTML duy nhất" đã
// giữ xuyên suốt dự án. `publicDir: false` tắt hành vi copy tự động
// đó cho bản 1-file này; bản PWA (config riêng) vẫn cần các file đó
// nên giữ nguyên mặc định ở đó.
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  publicDir: false,
  build: {
    target: "es2020",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000, // ép mọi asset nhúng thẳng vào HTML
  },
});
