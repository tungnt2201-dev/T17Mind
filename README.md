# T17Mind

Phần mềm **mindmap** chạy hoàn toàn offline trên trình duyệt (và dạng app Windows portable). Dữ liệu lưu cục bộ trên máy bạn, không cần tài khoản hay máy chủ.

Công nghệ: TypeScript · Svelte 5 · Canvas 2D · Vite · Vitest.

## Tính năng chính

- Nhiều bố cục: Logic Right/Left/Both, Org Chart, Tree Down/Up; kiểu cây "tự nhiên" (đường nối thon dần).
- Node: định dạng chữ, tag màu, checkbox, ghi chú, liên kết, ảnh nhúng, nhánh trôi, đường liên kết giữa các node.
- Thu gọn/mở theo cấp, Explorer (cây bên trái), Minimap, tìm kiếm, nhiều map, theme.
- Hoàn tác / làm lại (mọi thay đổi đi qua Command).
- Nhập/xuất: JSON, `.t17m` (có ảnh), OPML, XMind, Excel (.xlsx), Markdown, SVG, PNG.
- PWA: cài như app, dùng offline.

## Chạy thử (phát triển)

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # TypeScript + svelte-check
npm test           # Vitest
npm run build      # dist/index.html (một file duy nhất)
```

Bản PWA: `npm run build:pwa` rồi `npm run serve:pwa` (hoặc `start-pwa.bat` trên Windows).

## App Windows portable (.exe)

Dùng [Neutralino](https://neutralino.js.org/) (nhẹ, ~3 MB, không cần cài đặt). Cần **WebView2 Runtime** (đã có sẵn trên Windows 10/11 mới).

```bash
npm run build:desktop
```

Kết quả trong `desktop/dist/T17Mind-portable/`: `T17Mind.exe` (+ `resources.neu` nếu không nhúng được). **Hai file phải để chung thư mục.** Có thể chép cả thư mục vào USB.

Hoặc để GitHub Actions build: tab *Actions → Build Windows portable exe → Run workflow*, tải file zip ở phần Artifacts (gắn tag `v*` sẽ tự đính vào Release).

Lưu ý:
- App dùng cổng cố định `52717` (để dữ liệu IndexedDB không đổi giữa các lần mở). Nếu cổng bị chiếm, app sẽ không mở được.
- Dữ liệu nằm trong profile WebView2 của Windows; hãy dùng **Xuất** để sao lưu định kỳ.
- Link trong node mở bằng trình duyệt mặc định; chỉ cho phép `http`, `https`, `mailto`.

## Cấu trúc

```
src/core     mô hình dữ liệu, Command (undo/redo), migrate, validate
src/layout   các thuật toán bố cục
src/render   vẽ Canvas
src/ui       giao diện Svelte, controller
src/io       nhập/xuất các định dạng, lưu trữ
desktop/     bộ đóng gói Neutralino (.exe)
docs/        nhật ký phát triển chi tiết (DEVLOG.md)
```

Quy tắc phân tầng: `ui → render → layout → core` (tầng dưới không import tầng trên).

## Bảo mật

- Link node chỉ mở với scheme an toàn (xem `src/core/safeUrl.ts`).
- Thư viện `xlsx` (SheetJS) bản npm 0.18.5 có lỗ hổng đã biết (prototype pollution, ReDoS); chỉ ảnh hưởng khi mở file Excel không tin cậy. Có thể nâng cấp bản vá:
  `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`

## Giấy phép

[MIT](LICENSE)
