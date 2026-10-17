/**
 * ui/icons.ts
 * ---------------------------------------------------------------------
 * P2.16 — Bộ icon SVG đơn sắc (line-icon, viewBox 20x20, stroke =
 * currentColor) thay cho TOÀN BỘ emoji nhiều màu trước đây dùng trong
 * Toolbar (🔍📁⬇⬆🧭🗺❓🪄🌿🎨📝🔗📊🧩📋🖼✂🗑☁🖌 v.v.). Theo yêu cầu trực
 * tiếp: "màu sắc toolbar tương đồng với T17 Timeline, các nút trông
 * hiện đại, phong cách thiết kế nút hiện đại, ít màu mè".
 *
 * LÝ DO PHẢI THAY EMOJI (không chỉ đổi CSS màu): emoji có màu CỐ ĐỊNH
 * do hệ điều hành/font quyết định (📁 luôn vàng, 🌿 luôn xanh lá, 🍅-như
 * 🎨 luôn nhiều màu...) — KHÔNG thể đổi màu bằng CSS `color` (khác text
 * thường). Muốn "ít màu mè, đồng bộ 1 tông xám như Timeline" thì bắt
 * buộc phải chuyển hẳn sang icon dạng SVG vẽ tay (stroke, không fill),
 * để `color`/currentColor trên nút cha quyết định màu — icon tự động ăn
 * đúng màu chữ của nút (xám lúc thường, xanh khi active, đỏ khi danger,
 * trắng khi ở trên nền primary xanh đặc), không lệch tông bao giờ.
 *
 * Mỗi icon là một CHUỖI markup các thẻ SVG con (không bọc <svg> ở đây)
 * — <svg> khung ngoài (viewBox, stroke-width...) đặt DÙNG CHUNG một chỗ
 * trong Icon.svelte, để mọi icon chắc chắn cùng kích thước/độ dày nét,
 * đúng tinh thần "một bộ icon nhất quán" (khác hẳn cảm giác lộn xộn của
 * emoji trước đây, mỗi cái một phong cách vẽ khác nhau).
 * Hình học cố tình ĐƠN GIẢN (chỉ path/rect/circle/line cơ bản) — vẽ tay
 * cẩn thận từng toạ độ trên lưới 20x20, không chép path phức tạp từ trí
 * nhớ (dễ sai lệch, ra hình méo) — đã tự kiểm bằng ảnh chụp Playwright
 * phóng to sau khi viết xong (xem README).
 * --------------------------------------------------------------------- */

export const ICONS: Record<string, string> = {
  // Logo T17Mind — 3 "node" nối nhau, ẩn dụ mindmap, thay 🧠.
  brand: `<circle cx="5" cy="10" r="2.1"/><circle cx="15" cy="5.5" r="2.1"/><circle cx="15" cy="14.5" r="2.1"/><line x1="6.8" y1="9" x2="13.2" y2="6.5"/><line x1="6.8" y1="11" x2="13.2" y2="13.5"/>`,

  plus: `<line x1="10" y1="4" x2="10" y2="16"/><line x1="4" y1="10" x2="16" y2="10"/>`,

  search: `<circle cx="8.3" cy="8.3" r="4.8"/><line x1="11.8" y1="11.8" x2="16.5" y2="16.5"/>`,

  folder: `<path d="M3 6.3c0-.7.5-1.2 1.2-1.2h3.6l1.6 2H15.8c.7 0 1.2.5 1.2 1.2V15c0 .7-.5 1.2-1.2 1.2H4.2C3.5 16.2 3 15.7 3 15V6.3z"/>`,

  file: `<path d="M6.2 3.2h5.4l3.2 3.2V16a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1z"/><path d="M11.6 3.2v3.2h3.2"/>`,

  "doc-text": `<path d="M6.2 3.2h5.4l3.2 3.2V16a1 1 0 0 1-1 1H6.2a1 1 0 0 1-1-1V4.2a1 1 0 0 1 1-1z"/><path d="M11.6 3.2v3.2h3.2"/><line x1="7" y1="11" x2="13" y2="11"/><line x1="7" y1="13.6" x2="13" y2="13.6"/>`,

  save: `<path d="M4.2 3.8h8.4l3.2 3.2V15.8a1 1 0 0 1-1 1H4.2a1 1 0 0 1-1-1V4.8a1 1 0 0 1 1-1z"/><path d="M6.6 3.8v4h5.4v-4"/><path d="M6.2 12h7.6v4.8H6.2z"/>`,

  package: `<path d="M3.6 6.8L10 3.6l6.4 3.2L10 10 3.6 6.8z"/><path d="M3.6 6.8v6.4L10 16.4l6.4-3.2V6.8"/><line x1="10" y1="10" x2="10" y2="16.4"/>`,

  download: `<line x1="10" y1="3.4" x2="10" y2="12.2"/><path d="M6.4 8.8L10 12.4l3.6-3.6"/><path d="M4 15.6h12v1.4H4z"/>`,

  upload: `<line x1="10" y1="16.6" x2="10" y2="7.8"/><path d="M6.4 11.2L10 7.6l3.6 3.6"/><path d="M4 15.6h12v1.4H4z"/>`,

  table: `<rect x="3.6" y="4.2" width="12.8" height="11.6" rx="1"/><line x1="3.6" y1="8.6" x2="16.4" y2="8.6"/><line x1="3.6" y1="12.4" x2="16.4" y2="12.4"/><line x1="9.8" y1="4.2" x2="9.8" y2="15.8"/>`,

  grid: `<rect x="3.8" y="3.8" width="5.2" height="5.2" rx="1"/><rect x="11" y="3.8" width="5.2" height="5.2" rx="1"/><rect x="3.8" y="11" width="5.2" height="5.2" rx="1"/><rect x="11" y="11" width="5.2" height="5.2" rx="1"/>`,

  list: `<line x1="7.4" y1="5.2" x2="16.4" y2="5.2"/><line x1="7.4" y1="10" x2="16.4" y2="10"/><line x1="7.4" y1="14.8" x2="16.4" y2="14.8"/><circle cx="4" cy="5.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="4" cy="10" r="0.9" fill="currentColor" stroke="none"/><circle cx="4" cy="14.8" r="0.9" fill="currentColor" stroke="none"/>`,

  image: `<rect x="3.4" y="4.6" width="13.2" height="10.8" rx="1.2"/><circle cx="7.4" cy="8.4" r="1.25"/><path d="M4 15.2l4.4-4.4 2.8 2.8 2-2 3.4 3.4"/>`,

  book: `<path d="M4.2 4.6a1.4 1.4 0 0 1 1.4-1.4H15.8v13.6H5.6a1.4 1.4 0 0 0-1.4 1.4V4.6z"/><line x1="15.8" y1="3.2" x2="15.8" y2="16.8"/>`,

  sidebar: `<rect x="3.4" y="4.2" width="13.2" height="11.6" rx="1.4"/><line x1="8" y1="4.2" x2="8" y2="15.8"/>`,

  map: `<path d="M4 5.6l4.3-1.4 3.8 1.4 4.3-1.4v11.2l-4.3 1.4-3.8-1.4-4.3 1.4z"/><line x1="8.3" y1="4.2" x2="8.3" y2="15.4"/><line x1="12.1" y1="5.6" x2="12.1" y2="16.8"/>`,

  "help-circle": `<circle cx="10" cy="10" r="6.8"/><path d="M7.9 8.1a2.1 2.1 0 1 1 3.2 1.8c-.7.4-1.1.9-1.1 1.7v.3"/><circle cx="10" cy="13.9" r="0.9" fill="currentColor" stroke="none"/>`,

  undo: `<path d="M5 8.6A6 6 0 1 1 4.4 13"/><path d="M3 5.8v3.8h3.8"/>`,

  redo: `<path d="M15 8.6A6 6 0 1 0 15.6 13"/><path d="M17 5.8v3.8h-3.8"/>`,

  maximize: `<path d="M4.2 8V4.2H8"/><path d="M15.8 8V4.2H12"/><path d="M4.2 12v3.8H8"/><path d="M15.8 12v3.8H12"/>`,

  home: `<path d="M3.8 10.2L10 5l6.2 5.2"/><path d="M5.8 9.2V16h8.4V9.2"/><path d="M8.3 16v-3.6h3.4V16"/>`,

  wand: `<line x1="4.6" y1="15.4" x2="12.4" y2="7.6"/><line x1="14.8" y1="3.2" x2="14.8" y2="6"/><line x1="13.4" y1="4.6" x2="16.2" y2="4.6"/><line x1="16.8" y1="7" x2="16.8" y2="8.6"/>`,

  leaf: `<path d="M15.2 4.8C9 4.8 4.8 9 4.8 15.2c6.2 0 10.4-4.2 10.4-10.4z"/><path d="M6.4 14.4c2.6-2.6 4.7-4.7 7.3-8.3"/>`,

  check: `<path d="M4.4 10.6l3.6 3.6 7.6-8.6"/>`,

  note: `<rect x="4.4" y="4.4" width="11.2" height="11.2" rx="1.2"/><line x1="7" y1="8" x2="13" y2="8"/><line x1="7" y1="10.4" x2="13" y2="10.4"/><line x1="7" y1="12.8" x2="10.6" y2="12.8"/>`,

  link: `<path d="M8.4 11.6a2.9 2.9 0 0 0 4.1 0l2-2a2.9 2.9 0 0 0-4.1-4.1l-1 1"/><path d="M11.6 8.4a2.9 2.9 0 0 0-4.1 0l-2 2a2.9 2.9 0 0 0 4.1 4.1l1-1"/>`,

  copy: `<rect x="3.4" y="6.6" width="9" height="9" rx="1.2"/><path d="M7 6.6V4.6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-2"/>`,

  duplicate: `<rect x="3.4" y="6.6" width="9" height="9" rx="1.2"/><path d="M7 6.6V4.6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1h-2"/><line x1="7.9" y1="9.1" x2="7.9" y2="13.1"/><line x1="5.9" y1="11.1" x2="9.9" y2="11.1"/>`,

  brush: `<path d="M15.4 4.6a2 2 0 0 1 0 2.8l-5.2 5.2-2.8-2.8 5.2-5.2a2 2 0 0 1 2.8 0z"/><path d="M7.4 11.8l1.8 1.8-1.6 1.6c-.9.9-2.3 1-3.5.5.6-1.1.6-2.6 1.5-3.5z"/>`,

  cloud: `<path d="M6.6 14.6a3 3 0 0 1-.5-6 4.1 4.1 0 0 1 7.8-1.6 3.4 3.4 0 0 1-.5 7.6h-6.8z"/>`,

  scissors: `<circle cx="5.8" cy="5.8" r="1.9"/><circle cx="5.8" cy="14.2" r="1.9"/><line x1="7.3" y1="7" x2="16.2" y2="14.4"/><line x1="7.3" y1="13" x2="16.2" y2="5.6"/>`,

  trash: `<line x1="4.4" y1="6.2" x2="15.6" y2="6.2"/><path d="M8 6.2V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.6"/><path d="M6.2 6.2l.7 9.3a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.7-9.3"/><line x1="8.6" y1="9" x2="8.6" y2="13.4"/><line x1="11.4" y1="9" x2="11.4" y2="13.4"/>`,

  eye: `<path d="M3.2 10s2.7-4.8 6.8-4.8S16.8 10 16.8 10s-2.7 4.8-6.8 4.8S3.2 10 3.2 10z"/><circle cx="10" cy="10" r="1.9"/>`,

  tag: `<path d="M4 4h5.6l6 6-5.6 5.6-6-6V4z"/><circle cx="6.9" cy="6.9" r="0.9" fill="currentColor" stroke="none"/>`,

  compass: `<circle cx="10" cy="10" r="6.8"/><path d="M12.6 7.4l-1.6 4-4 1.6 1.6-4z"/>`,
};
