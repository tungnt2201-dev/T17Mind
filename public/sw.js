/**
 * public/sw.js
 * ---------------------------------------------------------------------
 * Service worker TỐI THIỂU — mục đích DUY NHẤT là thoả điều kiện "có
 * thể cài đặt" của Chrome (yêu cầu ít nhất một SW có fetch handler),
 * không phải xây dựng chiến lược offline-first phức tạp — T17Mind vốn
 * không cần mạng để chạy (mọi xử lý ở client, tự lưu qua IndexedDB),
 * nên cache ở đây chỉ là lưới an toàn để mở lại được app khi offline,
 * không phải yêu cầu cốt lõi.
 *
 * Cache-first đơn giản cho đúng các file tĩnh của chính app (không
 * cache lung tung request bên ngoài) — nếu có bản mới hơn (CACHE_NAME
 * đổi), service worker cũ tự xoá cache cũ ở bước "activate".
 * ---------------------------------------------------------------------
 */
const CACHE_NAME = "t17mind-pwa-v1";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Chỉ can thiệp request GET cùng gốc (same-origin) — bỏ qua mọi thứ
  // khác (POST, request bên ngoài...) để không vô tình cache nhầm.
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
