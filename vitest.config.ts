import { defineConfig } from "vitest/config";

// P1.14 — TÁCH RIÊNG khỏi vite.config.ts (dùng cho build production)
// để cấu hình test không lẫn vào, dù cùng chạy trên nền Vite.
//
// environment: "node" — mọi test hiện tại nhắm vào LOGIC THUẦN TUÝ
// (core/, io/, render/geometry.ts, layout/, ui/*Logic.ts) — không cần
// DOM thật. Component Svelte (.svelte) và mọi thứ đụng trực tiếp tới
// Canvas 2D context/File System Access API KHÔNG nằm trong phạm vi bộ
// test này (xem README mục "Test tự động" để biết lý do và cách đã tự
// kiểm những phần đó trong lúc phát triển — qua node-canvas/
// fake-indexeddb/mock, không phải bộ test thường trực).
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
