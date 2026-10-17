/**
 * serve-pwa.js
 * ---------------------------------------------------------------------
 * P1.15 (đóng gói PWA) — server tĩnh CỤC BỘ tối giản để phục vụ
 * `dist-pwa/` qua `http://localhost` — Web App Manifest và Service
 * Worker BẮT BUỘC phải chạy qua http/https, KHÔNG chạy được qua
 * file:// (giới hạn bảo mật của chính trình duyệt, không phải điều gì
 * có thể lách qua).
 *
 * Chỉ dùng module CÓ SẴN của Node (`http`, `fs`, `path`) — không cần
 * `npm install` thêm gì, không phụ thuộc mạng internet lúc chạy.
 * Chạy qua `npm run serve:pwa`, hoặc double-click `start-pwa.bat`
 * (Windows — tự chạy lệnh này rồi mở trình duyệt).
 * ---------------------------------------------------------------------
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 5175;
const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "dist-pwa");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const server = createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    let filePath = join(ROOT, urlPath === "/" ? "index.html" : urlPath);

    const info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) filePath = join(filePath, "index.html");

    const data = await readFile(filePath);
    const mime = MIME_TYPES[extname(filePath)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    // Không tìm thấy file — trả về index.html (single-page app, mọi
    // đường dẫn không khớp file tĩnh nào đều nên vào lại trang chính).
    try {
      const fallback = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fallback);
    } catch {
      res.writeHead(404);
      res.end("Không tìm thấy dist-pwa/ — chạy `npm run build:pwa` trước.");
    }
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`T17Mind (bản PWA) đang chạy tại ${url}`);
  console.log(`Mở trình duyệt tới địa chỉ trên, bấm biểu tượng "Cài đặt" trên thanh địa chỉ để cài PWA.`);
  console.log(`Giữ cửa sổ này mở trong lúc dùng lần đầu để cài đặt — sau khi cài xong có thể đóng.`);
});
