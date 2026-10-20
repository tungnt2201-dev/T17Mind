# T17Mind — Nhật ký phát triển chi tiết

Dự án đã hoàn thành **toàn bộ Phase 1 kể cả P1.10** (P1.1–P1.10) và **P2.1
đến P2.6, P2.6b-1, P2.6b-2, P2.6b-3, P2.6c, P2.6d, P2.7a, P2.7b, P2.7c,
P2.7d, P2.7e, P2.7f, P2.7g, P2.7h, P2.8, P2.8b, P2.8c, P2.9 (một phần)** trong bản kế hoạch 3
phase. P2.5 gốc được tách làm 2 lượt riêng (Nhánh trôi trước, Ghi chú dán
sau); P2.6b gốc tách làm 3 lượt nhỏ (b-1: định dạng chữ node, b-2: nhãn
cha-con, b-3: chữ xoay theo đường cong) — cả ba đã xong. **P2.6c** (font
chữ + độ trong suốt + panel gấp/mở được) và **P2.6d** (Đa map) đều là
bước chèn thêm ngoài kế hoạch gốc, theo yêu cầu trực tiếp giữa chừng.
**P2.7 (Nhiều bố cục) đã hoàn tất cả 4 lượt** (a: Logic Left, b: Logic
Both Sides, c: Organization Chart/Tree Down/Tree Up, d: Fishbone — mục
d SAU ĐÓ đã bị XOÁ HOÀN TOÀN, xem ghi chú tại chính mục P2.7d bên
dưới).
**P2.7e (Hệ thống Tag)** nâng cấp Nhãn tự do cũ lên Tag tập trung có màu.
**P2.7f (Định dạng chữ nâng cao + sửa hàng loạt)** đậm/nghiêng/gạch chân
+ checkbox hoàn thành, sửa hàng loạt cho nhiều node cùng lúc. **P2.7g
(Gộp/bung tuần tự theo cấp)** — bước chèn thêm giữa chừng, xoay 3 nấc
kiểu Org-mode thay vì nhị phân ẩn hết/hiện hết. **P2.7h (nâng cấp P2.7g +
Độ đậm nhạt nhánh + Kiểu cây tự nhiên)** — bước chèn thêm giữa chừng
khác, theo yêu cầu trực tiếp kèm ảnh tham khảo, **hoàn tất trọn vẹn cả 4
phần**: (1) ĐẢO NGƯỢC lại quyết định P2.7g ban đầu — giờ CHO PHÉP thu
gọn cả gốc (mức tối đa: chỉ còn 1 mình gốc), (2) thêm nút Toolbar
"Về gốc", (3) độ dày đường nối tự động mỏng dần theo cấp + người dùng tự
chỉnh tay được,
(4) **Kiểu cây "tự nhiên"** — công tắc mới (🌿 trên Toolbar), đường nối
vẽ dạng dải băng thon dần (dày gần trung tâm, mỏng dần ra xa NGAY TRONG
MỘT đường, khác hẳn việc "mỗi cấp một độ dày riêng" ở mục 3) — phần khó
nhất của cả yêu cầu, đã kiểm chứng bằng ảnh xuất ra từ chính code thật,
khớp đúng phong cách 2 ảnh tham khảo ban đầu. **P2.8 (Explorer)** — khung
duyệt cây bên trái, bật/tắt được, kéo đổi kích thước, chỉnh độ trong
suốt, lọc theo Tag (2 chế độ AND/OR), tìm kiếm chữ riêng, 2 chế độ thu
gọn/mở (đồng bộ với canvas hoặc độc lập). **P2.8b (Minimap)** — khung
nhỏ hiện toàn bộ bản đồ thu nhỏ, vị trí/kích thước tự do, bấm nhảy tới +
kéo pan, cũng có 2 chế độ đồng bộ/độc lập giống Explorer. **P2.8c (Ghép
thêm JSON)** —
nhập một file JSON khác vào map đang mở, thành (các) nhánh trôi mới, tự
tránh xung đột ID, gộp Tag theo tên, hoàn tác được bằng Ctrl+Z — tham
khảo bản phác thảo người dùng gửi kèm, nâng cấp thành Command thật và hỗ
trợ nhiều gốc ngay từ đầu. **P2.9 (Xuất định dạng khác) — CHỈ CÒN PDF**:
xuất **SVG** (khung/màu/chữ/đường nối), **Markdown** (danh sách lồng
nhau, checkbox, Tag dạng hashtag), **Nhập/Xuất XMind** (đọc/ghi file
`.xmind` thật — cấu trúc đối chiếu trực tiếp với 3 file mẫu người dùng
cung cấp, không chỉ dựa tài liệu công khai), và **Nhập/Xuất OPML**
(outline XML chuẩn, tương thích Workflowy/Dynalist/OmniOutliner) đã
xong; chỉ còn PDF chưa làm. **P2.10 (Ảnh nhúng + định dạng file nguyên
bản `.t17m`) — MỚI, chèn thêm ngoài kế hoạch gốc theo yêu cầu trực
tiếp** (lấy cảm hứng từ cách XMind đóng gói `.xmind`, xem chi tiết ở
mục P2.10 bên dưới): node giờ gắn được một ảnh nhúng (kho `map.assets`
tập trung, giống mô hình Tag), xem/xoá/đổi ảnh qua panel bên phải, icon
🖼 trên canvas bấm được để xem cỡ lớn; và một định dạng file **nguyên
bản của chính T17Mind** (`.t17m`, cũng là file zip dùng `jszip`) nhúng
ảnh THẬT dưới dạng nhị phân (không phải base64 như JSON thường) — nhẹ
hơn, portable, mở lại đủ 100% dữ liệu kể cả ảnh. **P2.11 (Quy luật màu
theme vô hạn cấp + tự tô node mới) — MỚI, theo yêu cầu trực tiếp "xử lý
dứt điểm" sau khi P2.10 chưa giải quyết**: mỗi bộ theme giờ có công thức
màu KHÔNG đông cứng ở cấp 4 như bug cũ (tra `levels[min(depth,3)]`) —
độ sáng tiến tới hạn theo tiệm cận mũ + tông màu trôi nhẹ mỗi cấp (theme
Rainbow cũng vậy, theo hue riêng của từng nhánh), giữ phân biệt được ở
hàng chục cấp sâu hơn nhiều so với trước (xem mục P2.11 bên dưới về giới
hạn vật lý thực tế của không gian màu). Quan trọng hơn: node MỚI TẠO
(thêm con, nhánh trôi, dán văn bản chưa định dạng) giờ **TỰ ĐỘNG** nhận
đúng màu theo theme đang bật thay vì trắng tinh — đúng lỗi người dùng
báo lại sau bản P2.10. P1.10 (Tìm kiếm)
làm SAU P2.3 theo yêu cầu — bù nợ khoản còn thiếu từ lúc
Phase 1 dừng ở P1.9. **P1.11 (IndexedDB) và P1.12 (File System Access
API) — Lưu trữ bền vững — đã xong**: tự động lưu ngầm qua IndexedDB
(thay localStorage giới hạn ~5MB trước đây), cộng "Lưu/Mở file thật"
trên đĩa (Ctrl+S, chỉ Chrome/Edge). **P1.14 (Test tự động) — MỘT PHẦN**:
bộ test thật bằng `vitest` (`npm test`), giờ 129 test qua 12 file, phủ các
phần nền tảng quan trọng nhất (di trú schema, Command apply/revert/redo,
ghép JSON, roundtrip xuất/nhập JSON/XMind) — không phải phủ toàn bộ 37
bước của dự án. **P1.13 (Tối ưu hiệu năng) — đã xong**: viewport culling
cho map lớn, đo được cải thiện nhiều lần tới hàng trăm lần tuỳ tình
huống, không suy giảm ở trường hợp xấu nhất. **P1.15 (Đóng gói PWA) —
đã xong**: cài đặt được như ứng dụng, liên kết file `.json`/`.xmind`
qua double-click (cần bước cài đặt một lần qua server cục bộ đi kèm —
xem chi tiết bên dưới, khác hẳn bản 1-file mở trực tiếp vẫn giữ nguyên
song song). **P1.16 (Tối ưu bundle — lazy-load) — đã xong**: `xlsx` và
`jszip` (tổng ~70% kích thước bundle dù chỉ dùng cho XLSX/XMind) giờ
chỉ tải khi thực sự bấm nút liên quan — bản PWA giảm 71.7% dung lượng
tải lần đầu (đo thực nghiệm, không phải ước lượng); bản 1-file không
đổi nhiều (vẫn gộp hết vào một file, đúng bản chất `file://` không có
mạng để tải lazy).

**P1.10 — Tìm kiếm** — Ctrl+F mở ô tìm nổi trên canvas, Enter nhảy tới kết
quả, Enter tiếp nhảy kết quả kế tiếp (quay vòng). Tìm cả `text` lẫn
`notes`, không phân biệt dấu tiếng Việt, tìm được cả node đang ẩn trong
nhánh thu gọn (tự bung ra khi nhảy tới).

**P2.1 — Đưa Svelte vào cho phần giao diện** — đã xong.
**P2.2 — Thuộc tính node mở rộng** (nhãn, ưu tiên, tiến độ, biểu tượng) —
đã xong.
**P2.3 — Ghi chú dài và khung bên** — đã xong, xem chi tiết ở mục "Những gì
đã có" bên dưới.

## Chạy thử

Cần cài Node.js (bản LTS) trước.

```bash
npm install
npm run dev
```

Mở địa chỉ hiện ra (thường là `http://localhost:5173`).

Muốn có file HTML một-trang chạy offline như bản cũ:

```bash
npm run build
```

Kết quả nằm ở `dist/index.html` — mở trực tiếp bằng trình duyệt, không cần server.

Sau khi sửa bất kỳ file `.svelte` nào, chạy thêm:

```bash
npm run check
```

**Bắt buộc**, không phải tuỳ chọn — `tsc --noEmit` (chạy trong `npm run build`)
và cả `vite build` đều **không** soi được lỗi kiểu bên trong file `.svelte`
(chỉ strip kiểu bằng esbuild, không kiểm tra sâu). `npm run check` chạy thêm
`svelte-check`, công cụ duy nhất kiểm tra kiểu thật sự cho `.svelte` — đã tự
bắt được 8 lỗi kiểu thật trong lúc làm P2.1 mà `npm run build` báo sạch.

Sau khi sửa bất kỳ file trong `core/`, `io/`, hay `render/geometry.ts`/
`layout/`, chạy thêm:

```bash
npm test
```

Chạy bộ test tự động (P1.14, `vitest`) — 129 test hiện có, phủ di trú
schema/Command/ghép JSON/xuất-nhập JSON-XMind-.t17m/logic Explorer-Minimap. **Không
phải bắt buộc như `npm run check`** (dự án vẫn hoạt động bình thường nếu bỏ
qua), nhưng nên chạy trước khi coi một thay đổi lớn ở tầng dữ liệu là "xong"
— bộ test này đã từng tự phát hiện một lỗi thật ngay từ lần chạy đầu tiên
(xem mục P1.14 bên dưới).

### Bản PWA (cài đặt được, liên kết file) — P1.15

Khác với `npm run build` ở trên (một file HTML, mở trực tiếp, không cần cài
gì) — đây là bản THỨ HAI, cài đặt được như một ứng dụng, và có thể đặt làm
"chương trình mặc định" để mở file `.json`/`.xmind` (double-click file là tự
mở app). Đánh đổi: cần một bước cài đặt một lần qua server cục bộ, không mở
trực tiếp bằng `file://` được (giới hạn của chính trình duyệt, xem chi tiết
ở mục P1.15 bên dưới).

**Cách 1 — Windows, double-click (khuyên dùng):**
```
start-pwa.bat
```
Tự build nếu chưa có, tự mở trình duyệt tới `http://localhost:5175`.

**Cách 2 — dòng lệnh (mọi hệ điều hành có Node):**
```bash
npm run build:pwa   # chỉ cần làm lại khi code đổi
npm run serve:pwa   # chạy server, giữ cửa sổ này mở
```
Rồi tự mở trình duyệt tới `http://localhost:5175`.

**Cài đặt PWA (làm MỘT LẦN, chỉ Chrome/Edge):** sau khi trang đã mở, tìm
biểu tượng "Cài đặt" (⊕ hoặc màn hình có mũi tên) trên thanh địa chỉ trình
duyệt → bấm **Cài đặt**. Từ đó app xuất hiện như một chương trình riêng
(Start Menu/màn hình chính), và Windows sẽ hỏi "Bạn muốn mở file này bằng
gì?" khi double-click một file `.json`/`.xmind` — chọn T17Mind, có thể tick
"Luôn dùng ứng dụng này" để lần sau tự động.

Sau khi cài xong, có thể đóng cửa sổ server (`start-pwa.bat`/`npm run
serve:pwa`) — Chrome/Edge cache lại app đã cài, không cần server chạy nền
liên tục cho mỗi lần mở lại (dù để chắc chắn liên kết file luôn hoạt động,
tốt nhất vẫn build lại + chạy server mỗi khi có code mới muốn cập nhật).

## Cấu trúc thư mục

```
src/
├── core/        dữ liệu, xác thực, di trú schema, LỚP THAO TÁC (Command), store
├── layout/      thuật toán xếp vị trí node — không vẽ gì, không biết gì về DOM
├── render/      bộ dựng Canvas + hình học (điểm neo, đường cong, khe thả)
├── ui/          chuột, bàn phím — nơi DUY NHẤT gắn sự kiện DOM cho canvas
│   └── components/  panel, thanh công cụ, hộp thoại — component Svelte (P2.1)
├── io/          nhập/xuất JSON, XLSX, tự lưu tạm
└── main.ts      điểm khởi động — nơi DUY NHẤT được biết cả 5 lớp cùng lúc
```

**Ranh giới Svelte (P2.1):** CHỈ `ui/components/*.svelte` được dùng Svelte.
Canvas (`render/`, `layout/`) và bộ điều phối chuột/bàn phím
(`ui/appController.ts`) vẫn hoàn toàn vanilla TypeScript, không import Svelte
ở đâu cả. Hai bên nói chuyện MỘT CHIỀU qua `ui/svelteBridge.ts` (Store/
SelectionModel → Svelte store, chỉ đọc) — component Svelte không bao giờ sửa
`map` trực tiếp, mọi thay đổi vẫn qua `store.dispatch(command)` như từ đầu dự
án tới giờ.

Quy tắc phụ thuộc một chiều: `ui → render → layout → core`. `io` chỉ phụ
thuộc `core`. Nếu sau này thấy một file trong `core/` hay `layout/` cần
`import` gì đó từ `render/` hay `ui/`, đó là dấu hiệu code đang bị đặt sai chỗ.

## Những gì đã có (map với từng bước trong kế hoạch)

- **P1.1** — Dự án Vite + TypeScript, `tsconfig.json` bật `strict` tối đa
  (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`).
- **P1.2** — `core/types.ts` (kiểu dữ liệu trung tâm), `core/validate.ts`
  (bộ xác thực, trả lỗi tiếng Việt), `core/migrate.ts` (khung di trú
  schema — hiện có sẵn bước di trú từ "phiên bản 0", tức là file JSON
  xuất ra từ bản HTML một-file cũ trước đây, mở được bình thường).
- **P1.3** — Toàn bộ engine của bản v3 (canvas, layout, nhập/xuất JSON/XLSX,
  liên kết chéo, tóm tắt, màu/viền/link, marquee chọn vùng, hover, resize)
  đã chuyển sang module đúng 5 lớp, **giữ nguyên hành vi**.
- **P1.4** — `vite-plugin-singlefile` đã cấu hình, build ra đúng 1 file HTML.
  Thư viện `xlsx` cài qua npm (không dùng CDN) nên được đóng gói thẳng vào
  file — ứng dụng không cần mạng để đọc/ghi Excel.
- **P1.5** — `core/commands.ts` + `core/store.ts`: MỌI thay đổi dữ liệu đều
  đi qua một Command. Không còn chỗ nào trong `ui/` sửa `map.nodes` trực tiếp.
- **P1.6** — Hoàn tác/làm lại đầy đủ, phím Ctrl+Z / Ctrl+Shift+Z (hoặc
  Ctrl+Y), giới hạn 100 bước, nút trên thanh công cụ hiện tên bước khi rê chuột.
- **P1.7** — Sao chép (Ctrl+C), cắt (Ctrl+X), dán (Ctrl+V), nhân bản (Ctrl+D).
  Dán được cả sang Word/Notepad (văn bản thụt lề bằng tab) và dán ngược lại.
- **P1.8** — Kéo node: **kéo tự do** như trước (giữ chuột và rê), nhưng nếu
  thả **lên thân một node khác** thì trở thành con của nó; thả **vào khe
  giữa hai node anh em** thì chèn đúng vị trí. Có chỉ báo trực quan (viền
  xanh quanh đích, hoặc vạch xanh ở khe) và node đang kéo mờ đi. Chặn thả
  vào chính con cháu của nó.
  **Sửa trải nghiệm (theo phản hồi trực tiếp trong lúc kiểm thử toàn
  diện): "kéo lệch một chút xíu là đổi hẳn vị trí với node trên/dưới"**
  — nguyên nhân: vùng nhạy "chèn vào khe" (đã từng mở RỘNG ra tới đúng
  điểm giữa mỗi node liền kề ở một lần sửa trước, vì lúc đó "quá hẹp,
  khó nhắm") được tính LẠI TỪ ĐẦU mỗi khung hình, không "nhớ" gì từ
  khung hình trước — chỉ cần nhích qua MỘT ranh giới tĩnh là nhảy ngay
  sang khe kế tiếp. Đây là lần sửa THỨ HAI theo hướng NGƯỢC LẠI lần
  trước — bài học rút ra: một ngưỡng tĩnh duy nhất không thể vừa "dễ
  nhắm" vừa "không nhảy lung tung", cần HAI ngưỡng khác nhau tuỳ NGỮ
  CẢNH.
  Sửa bằng **HYSTERESIS** (độ trễ chuyển trạng thái — mẫu hình chuẩn
  trong kéo-thả/nam châm của Figma, Illustrator...) — "vào dễ, ra
  khó": khe ĐANG được giữ (từ khung hình trước, do nơi gọi lưu lại và
  truyền vào làm `currentTarget`) dùng ngưỡng RỘNG (40% chiều cao/
  rộng node liền kề) để tiếp tục giữ nguyên; khe CHƯA được chọn dùng
  ngưỡng HẸP (18%) để bắt đầu được chọn. Nhờ vậy nhích nhẹ quanh vị
  trí đang kéo dở tiếp tục giữ đúng khe cũ; chỉ khi kéo đủ xa mới thực
  sự đổi sang khe khác — đúng "chỉ thay đổi trong một biên độ xác
  định" mà người dùng yêu cầu.
  6 test permanent mới cho `computeDropTarget` (trước đó CHƯA có test
  nào cho hàm này) — đặc biệt 2 test làm BẰNG CHỨNG TRỰC TIẾP cho cơ
  chế hysteresis: CÙNG một vị trí con trỏ, KHÁC kết quả tuỳ
  `currentTarget` (null → không nhận diện vì ngoài ngưỡng hẹp; đang
  active → vẫn giữ vì trong ngưỡng rộng) — đây chính là câu trả lời
  trực tiếp cho vấn đề đã báo.
  Đây là thay đổi về CẢM NHẬN khi thao tác, khó đánh giá chỉ qua số
  liệu test — publish thẳng bản build thật lên Artifact để tự xác
  nhận và cho người dùng thử trực tiếp bằng tay, không chỉ tin vào
  test tự động.
- **P1.9** — Điều hướng bằng mũi tên: **Trái/Phải theo cấu trúc cây** (về
  cha / vào con đầu tiên), **Lên/Xuống theo vị trí thật trên canvas**
  (`findVisuallyNearestNode` trong `render/geometry.ts` — chọn node hiển
  thị gần nhất phía trên/dưới, không phải node kế tiếp theo thứ tự cây).
  Bản đầu tiên dùng thứ tự cây cho cả 4 phím — sai với nhánh dạng chuỗi
  dài (mỗi node chỉ có 1 con): Xuống sẽ lặn sâu mãi vào nhánh hiện tại y
  hệt việc Phải đã làm, không bao giờ chạm sang nhánh khác. Đã sửa sau
  khi test trên map 200 node phát hiện ra. Ngoài ra: phím Home về gốc
  kèm tự cuộn khung nhìn, bảng phím tắt đầy đủ mở bằng dấu `?`, zoom
  bằng cuộn chuột lấy đúng vị trí con trỏ làm tâm, bấm chuột trực tiếp
  vào chấm tròn để bung/gộp nhánh (song song phím `C`).
- **P2.1** — Đưa Svelte 5 vào cho Toolbar, SidePanel, HelpModal (3 component
  trong `ui/components/`). Cầu nối một chiều `svelteBridge.ts` giữa Store/
  SelectionModel và Svelte store — component chỉ đọc, mọi thay đổi vẫn qua
  Command. Canvas và bộ điều phối chuột/bàn phím giữ nguyên vanilla, không
  đụng gì. `npm run check` (mới thêm) chạy `svelte-check` để soi lỗi kiểu
  trong `.svelte` — việc `tsc`/`vite build` không làm được.
- **P2.2** — 4 trường mới biến node thành mục công việc: `markers`
  (biểu tượng), `progress` (0–100), `priority` (1–5), `labels` (nhãn tự
  do). Nâng `schemaVersion` lên 2, viết `migrateV1toV2` — **không sửa**
  `migrateV0toV1` cũ, đúng quy tắc đã ghi trong `migrate.ts`. Vẽ trên
  canvas: huy hiệu ưu tiên và vòng tiến độ cắm ở hai mép trái/phải node
  (không lấn vào chữ), biểu tượng nổi phía trên, dải nhãn dạng viên
  thuốc ở đáy node (node tự cao/rộng thêm để chứa — có tính vào layout
  thật, không phải vẽ đè). Tái dùng `UpdateNodeStyleCommand` có sẵn cho
  cả 4 trường, không cần Command mới. XLSX có thêm 4 cột tuỳ chọn
  (markers/labels tách nhau bằng dấu phẩy vì Excel không có kiểu mảng).
- **P2.3** — Panel bên phải chia 2 thẻ: **Định dạng** | **Ghi chú**. Ô
  ghi chú tự giãn theo nội dung, **lưu định kỳ khi đang gõ** (debounce
  800ms) qua cơ chế session có sẵn từ P1.8 (`SetNodeNotesCommand`, giống
  hệt khuôn mẫu `SetNodeOffsetCommand`) — an toàn cho ghi chú dài nếu
  trình duyệt gặp sự cố giữa chừng, nhưng Ctrl+Z chỉ cần một lần để lùi
  cả đoạn vừa gõ. Node có ghi chú hiện icon 📝 ở góc trên-trái (đối xứng
  icon 🔗 ở trên-phải). Toàn bộ panel bên phải thu gọn được bằng nút
  (không chỉ riêng thẻ ghi chú). Thẻ "Ghi chú" có chấm nhỏ báo hiệu khi
  node đang có ghi chú, kể cả lúc đang xem thẻ "Định dạng".
- **P1.10** (làm sau P2.3, bù nợ) — Tìm kiếm. Lõi thuần tuý ở
  `core/search.ts` (`searchNodes`), không phụ thuộc UI — chuẩn hoá bỏ
  dấu tiếng Việt bằng Unicode NFD, tìm trong cả `text` lẫn `notes`,
  duyệt TOÀN BỘ cây kể cả bên trong nhánh thu gọn (khác
  `collectVisibleNodeIds` đã có — thêm `collectAllNodeIdsInOrder` mới
  cho việc này). Ctrl+F mở ô tìm nổi trên canvas (component
  `SearchBar.svelte`) — chặn hành vi "Tìm trong trang" mặc định của
  trình duyệt. Enter nhảy tới kết quả, Enter tiếp nhảy kết quả kế tiếp,
  quay vòng khi hết danh sách. Node kết quả đang ẩn trong nhánh thu gọn
  thì tự bung hết các tổ tiên liên quan (`AppController#revealNode`,
  gộp thành đúng 1 bước hoàn tác) rồi mới chọn và cuộn giữa khung nhìn,
  kèm hiệu ứng viền "phập phồng" đậm/nhạt 1.8 giây để thu hút ánh mắt.
- **P2.4** — Khoanh vùng (`Boundary`) — khung nền bo góc bao quanh một
  nhóm node **bất kỳ trên canvas, không cần cùng node cha**, khác hẳn
  Tóm tắt (chỉ dùng được cho anh em cùng cha). Nâng `schemaVersion` lên
  3, viết `migrateV2toV3` — không sửa 2 hàm di trú cũ. Vẽ nền **đầu
  tiên** (dưới cùng, mọi thứ khác đè lên trên). Hit-test chỉ ở nhãn và
  dải viền mỏng quanh khung, không phải toàn bộ vùng nền, để không
  tranh chấp với marquee (kéo vùng trống chọn nhiều node) đã có từ
  P1.8. XLSX vẫn không hỗ trợ (giống liên kết/tóm tắt) — chỉ JSON đầy
  đủ mới giữ được. Đã tự kiểm bằng script gọi thẳng `Store`/`Command`/
  `validateMindMap` thật trước khi gửi, xác nhận đúng điểm cốt lõi:
  gom được 2 node ở 2 nhánh khác nhau hoàn toàn.
- **P2.5 (chỉ phần Nhánh trôi)** — thay đổi kiến trúc lớn nhất từ đầu
  Phase 2: một node có `parentId = null` giờ KHÔNG CÒN bắt buộc phải
  là `map.rootId` duy nhất — bất kỳ node nào cũng có thể là một
  "nhánh trôi" độc lập, tách rời khỏi cây chính. Hàm mới `getRootIds`
  (`core/tree.ts`) là điểm neo cho mọi nơi cần biết "đang có bao nhiêu
  cây độc lập" — bố cục, vẽ, hit-test, tìm kiếm, điều hướng mũi tên đều
  tự động hoạt động đúng qua hàm này mà không cần sửa logic riêng.
  **Không đổi schema** — chỉ nới lỏng luật xác thực, không thêm trường
  dữ liệu nào. Kéo một nhánh trôi đi chỗ khác tái dùng nguyên cơ chế
  kéo tự do đã có từ P1.6; kéo thả một nhánh trôi lên node khác để gắn
  lại tái dùng nguyên `MoveNodeCommand` đã có từ P1.8 — chỉ Command mới
  thật sự cần viết là `CreateFloatingBranchCommand` (tạo mới) và
  `DetachToFloatingCommand` (tách một nhánh đang gắn sẵn ra độc lập).
  XLSX cũng đã nới lỏng theo — chấp nhận nhiều dòng để trống ParentID,
  dòng đầu tiên làm gốc chính, các dòng còn lại thành nhánh trôi.
  **Phát hiện và sửa luôn một lỗi thật có từ P2.4**: `DeleteNodeCommand`
  trước đó quên dọn `boundaries` khi xoá node, để lại tham chiếu "mồ
  côi" nếu node bị xoá đang là thành viên một khoanh vùng. Đã tự kiểm
  bằng 3 script riêng (17 phép thử cho nhánh trôi, 1 phép thử file cũ
  nhất schema 0 vẫn di trú đúng, 1 phép thử trọn vòng xuất/nhập XLSX
  nhiều gốc) trước khi gửi.
- **P2.5b — Ghi chú dán** (`StickyNote`) — một tờ giấy nhớ nổi tự do
  trên canvas, hoàn toàn không gắn với node nào — khác "Ghi chú" trong
  panel của P2.3 (thuộc về MỘT node cụ thể, chỉ đọc được khi chọn đúng
  node đó), ghi chú dán hiện TOÀN BỘ nội dung ngay trên canvas. Không
  lưu `width`/`height` — luôn tính lại từ nội dung qua `wrapStickyText`
  (word-wrap, tôn trọng cả xuống dòng thật), tránh dữ liệu dẫn xuất lệch
  khỏi nội dung. Nâng schema lên 4, `migrateV3toV4`. Vẽ **sau cùng**
  (đè lên mọi thứ khác, đúng cảm giác giấy dán TRÊN mặt bảng — ngược
  hẳn với Boundary vốn vẽ đầu tiên làm NỀN). Hit-test ưu tiên cao nhất
  trong chuỗi bấm chuột vì lý do tương tự. Cơ chế kéo tự do riêng
  (`sticky-drag`), đơn giản hơn kéo node vì không có khái niệm đổi cấu
  trúc. Ô sửa nội dung dùng `startInlineEditMultiline` mới thêm (textarea
  thật, Enter xuống dòng bình thường thay vì lưu ngay) — khác ô một
  dòng đã dùng cho mọi thứ khác từ trước tới giờ. XLSX không hỗ trợ
  (giống liên kết/tóm tắt/khoanh vùng). Đã tự kiểm bằng script riêng
  (10 phép thử: tạo/sửa/kéo/xoá/hoàn tác, di trú schema) trước khi gửi.
- **P2.6 — Theme + sao chép định dạng.** 4 bộ theme cố định
  (`core/theme.ts`): 3 bộ tra theo độ sâu (mảng màu index theo cấp),
  riêng bộ "Rainbow" xử lý khác hẳn — mỗi nhánh cấp 1 nhận
  một màu riêng từ bảng màu cố định, con cháu dùng sắc độ nhạt dần của
  đúng màu đó (`lightenHex`, tự viết, không dùng thư viện màu ngoài).
  **Áp theo TỪNG CÂY ĐỘC LẬP** (`ApplyThemeCommand` lặp qua
  `getRootIds`) — nhánh trôi cũng có đủ gradient màu riêng của chính
  nó, không bị coi là "lồng sâu hơn" trong cây chính, nhất quán với
  cách nhánh trôi đã được xử lý từ P2.5. Gộp toàn bộ thay đổi (có thể
  hàng trăm node) thành đúng 1 bước hoàn tác. "Sao chép định dạng"
  dùng lại đúng khuôn mẫu chế độ "Tạo liên kết" đã có từ P1.8 (bấm
  nguồn, bấm đích) nhưng **giữ chế độ** — bấm được nhiều đích liên
  tiếp, không tự tắt sau 1 lần, Esc để tắt. Chỉ copy thuộc tính thị
  giác thuần tuý (`extractFormatPatch`) — không đụng text/notes/link/
  markers/progress/priority/labels, tái dùng thẳng `UpdateNodeStyleCommand`
  có sẵn, không cần Command mới cho việc áp. Không đổi schema. Đã tự
  kiểm bằng 2 script riêng (11 phép thử cho theme — kể cả tình huống
  nhánh trôi tự tính độ sâu riêng, 7 phép thử cho sao chép định dạng)
  trước khi gửi.
- **P2.6b-1 — Định dạng chữ node.** Thêm `fontSize`/`textAlign`/
  `textFit` vào node, nâng schema lên 5, `migrateV4toV5`. `textFit` có
  3 giá trị: `auto` (mặc định — **giữ nguyên vẹn cách vẽ chữ cũ tuyệt
  đối**, cố ý thiết kế công thức đo/vẽ để cho ra kết quả giống hệt bản
  trước P2.6b-1 khi node chưa đụng vào tính năng này — không có node
  hay file cũ nào tự đổi hình dạng), `wrap` (tự xuống dòng, tái dùng
  đúng hàm `wrapText` đã viết cho Ghi chú dán ở P2.5b — đổi tên từ
  `wrapStickyText` vì giờ dùng chung cho cả hai), `shrink` (giữ 1
  dòng, tự thu nhỏ cỡ chữ cho vừa khung thay vì cắt bớt bằng "..."; chỉ
  thật sự phát huy tác dụng khi kết hợp với bề Rộng đặt thủ công, nếu
  không thì đo giống hệt `auto`). Panel có đủ 3 điều khiển. JSON và
  XLSX đều hỗ trợ (XLSX thêm 3 cột `FontSize`/`TextAlign`/`TextFit`).
  Đã tự kiểm bằng 2 script riêng (7 phép thử: giá trị mặc định, di trú
  schema, trọn vòng xuất/nhập XLSX) trước khi gửi.
- **P2.6b-2 — Nhãn cha-con + 3 công tắc hiển thị.** `edgeLabel` lưu
  trên node **CON** (đúng thiết kế đã thống nhất — đại diện cho nhãn
  của đường nối TỚI CHÍNH NÓ từ cha), chỉ vẽ khi bật `showEdgeLabels`
  (mặc định **tắt**). Nhãn đặt tại đúng điểm giữa (t=0.5) của chính
  đường cha-con thật — thêm hàm `cubicBezierPoint` (`geometry.ts`) vì
  đường cha-con vẽ bằng `bezierCurveTo` bậc ba, khác `quadraticPoint`
  bậc hai đã có cho liên kết chéo. Thêm luôn `showRelationships`/
  `showSummaries` (mặc định **bật**, giữ đúng hành vi cũ) theo đúng ý
  đã thống nhất khi bàn thiết kế. Nâng schema lên 6, `migrateV5toV6`.
  **Sửa một lỗi tiềm ẩn tự phát hiện khi làm**: `drawRelationships`/
  `drawSummaries` giờ LUÔN xoá dữ liệu hit-test trước khi kiểm cờ hiển
  thị — nếu không, tắt công tắc vẫn để sót vùng bấm chọn "ma" tại vị
  trí cũ. `ToggleMapDisplayFlagCommand` dùng chung cho cả 3 công tắc.
  JSON và XLSX đều hỗ trợ `edgeLabel` (XLSX thêm cột `EdgeLabel`) — 3
  công tắc hiển thị KHÔNG lưu qua XLSX được (cấp tài liệu, XLSX không
  có chỗ để lưu). Đã tự kiểm bằng script riêng (17 phép thử: giá trị
  mặc định, toggle + hoàn tác, edgeLabel lưu đúng chỗ, toán học
  `cubicBezierPoint` đúng 2 biên, di trú schema) trước khi gửi.
- **P2.6b-3 — Chữ tự xoay theo đường cong.** Thêm `cubicBezierTangent`
  (`geometry.ts`) — đạo hàm bậc nhất của đường cong bậc ba, cho ra vector
  tiếp tuyến tại đúng điểm đặt nhãn (t=0.5). Góc xoay = `atan2(tangent.y,
  tangent.x)`, áp cho CẢ viên thuốc nền lẫn chữ bên trong (xoay cả khối,
  không chỉ riêng chữ) bằng `ctx.translate` + `ctx.rotate` quanh đúng
  điểm giữa. Có chuẩn hoá góc phòng chữ lộn ngược nếu đường quay ngược
  bất thường — dùng tiêu chí `cos(góc) ≥ 0` (xoay có chu kỳ 360°, giá
  trị số 330° và -30° cho ra hình ảnh hệt nhau, không thể chỉ kiểm giá
  trị số nằm trong khoảng -90..90 như lần tự kiểm đầu tiên đã làm sai
  — phát hiện và sửa ngay trong lúc tự test, không phải để sót). Đường
  thẳng cũng được xoay theo đúng góc của đường, không chỉ riêng đường
  cong. Không cần trường dữ liệu mới, không đổi schema — thuần thay đổi
  cách vẽ. Đã tự kiểm bằng 2 script riêng (toán học tiếp tuyến đúng 2
  tình huống, logic chuẩn hoá góc đúng 5 phép thử) trước khi gửi.
- **P2.6c — Font chữ + độ trong suốt + panel gấp/mở được** (chèn thêm
  ngoài kế hoạch gốc, theo yêu cầu trực tiếp). Thêm `fontFamily` (chữ
  tự do, canvas tự lùi về font hệ thống nếu không tìm thấy, giống hệt
  cách CSS `font-family` fallback hoạt động — không cần kiểm tra font
  có cài trên máy hay không) và `fillOpacity` (0-100, **khác hẳn** ô
  "Nền trong suốt" cũ — đó là bật/tắt có-không có màu nền hoàn toàn,
  còn đây là một MỨC LIÊN TỤC áp lên trên màu nền đang có, qua
  `ctx.globalAlpha` giới hạn đúng phạm vi lúc tô nền, không rò rỉ sang
  viền/chữ vẽ sau đó). `getMeasurer()` và `drawNode()` dùng ĐÚNG cùng
  một font stack khi đo và khi vẽ — nếu lệch, chữ dễ tràn hoặc chừa dư
  khoảng trống. Nâng schema lên 7, `migrateV6toV7` — mặc định
  `fillOpacity=100` giữ nguyên độ đậm màu nền cũ cho mọi node có sẵn.
  Panel node tổ chức lại thành 4 khối gấp/mở được (Định dạng cơ bản,
  Đường nối cha-con, Thuộc tính công việc, Chữ trong node), mặc định
  tất cả đang mở — trạng thái gấp/mở là CỤC BỘ, không lưu vào tài liệu,
  không qua Ctrl+Z. Đã tự kiểm bằng script riêng (10 phép thử: giá trị
  mặc định, sửa + hoàn tác, di trú schema — đặc biệt xác nhận
  `fillOpacity=100` giữ đúng độ đậm cũ) trước khi gửi.
- **P2.6d — Đa map** (chèn thêm ngoài kế hoạch gốc, theo yêu cầu trực
  tiếp). Mỗi map giờ có `mapId` riêng (sinh một lần, giữ mãi mãi —
  KHÔNG sinh lại mỗi lần lưu/mở) và `mapTitle` tuỳ chọn (tên hiển thị
  độc lập với chữ node gốc, chỉ khác null khi người dùng chủ động đổi
  tên qua "Map gần đây"). Viết lại hoàn toàn `io/storage.ts`: mỗi map
  lưu riêng theo khoá `t17mind-map-{mapId}` (không còn dùng chung một
  khoá cho mọi map như trước — đúng lỗi cần sửa), một bảng chỉ mục nhẹ
  `t17mind-map-index` để liệt kê "Map gần đây" nhanh mà không phải tải
  hết dữ liệu từng map, và một con trỏ `t17mind-last-active` tách biệt
  để biết đúng map nào cần khôi phục khi mở lại trang — không tự ý
  ghi đè hay nhảy sang map khác. **Phát hiện hay khi làm**:
  `store.loadMap()` (có sẵn từ P1.6, dùng cho "Mới"/"Nhập file") tự xử
  lý đúng việc xoá lịch sử hoàn tác khi đổi cả tài liệu — "mở map
  khác" tái dùng được nguyên xi, không cần API mới; và nhờ kiến trúc
  phản ứng có sẵn (`store.loadMap` → `notify` → `fullRefresh` →
  `saveMap` trong `main.ts`), việc "Mới"/"Nhập file"/"Mở map khác" đều
  TỰ ĐỘNG lưu + đánh dấu "đang mở gần nhất" mà không cần viết thêm gì.
  Component mới `MapsModal.svelte` ("Map gần đây") — liệt kê, mở, đổi
  tên tại chỗ, xoá (có xử lý riêng khi xoá đúng map đang mở — thay
  bằng map trống mới, tránh trạng thái "ma" tiếp tục sửa trên dữ liệu
  đã xoá). Nâng schema lên 8, `migrateV7toV8` — **giữ nguyên** `mapId`
  nếu file JSON đã có sẵn (mở lại đúng file đã xuất từ bản có mapId),
  chỉ sinh mới khi thực sự thiếu (file cũ hơn P2.6d) — đây là hàm di
  trú DUY NHẤT không tất định 100%, đã thống nhất trước khi làm: mở
  CÙNG một file cũ 2 lần tách biệt sẽ ra 2 mapId khác nhau mỗi lần, vì
  bản thân file đó chưa từng có định danh nào để khôi phục. XLSX luôn
  sinh mapId mới (không có chỗ nào trong bảng phẳng để lưu). Đã tự
  kiểm bằng script riêng, giả lập `localStorage` trong Node (15 phép
  thử: 2 map lưu riêng không đè nhau, danh sách/mở/đổi tên/xoá đúng
  phạm vi, di trú giữ đúng mapId khi có sẵn) trước khi gửi.
- **P2.7a — Bố cục Logic Left.** Thêm `layoutType` vào `MindMap`
  (`"logicRight" | "logicLeft"`), nâng schema lên 9, `migrateV8toV9`.
  `layout/logicLeft.ts` soi gương ngang của `logicRight.ts` — điểm mấu
  chốt: `node.x` VẪN giữ nguyên ý nghĩa "mép trái trong toạ độ world"
  (không đổi theo layout), chỉ công thức tính vị trí CON đổi (trừ
  đúng bề rộng của TỪNG con — không thể dùng chung một childX như
  logicRight, vì mỗi con rộng khác nhau). Thêm hàm dùng chung
  `parentChildEdgeAnchors()` (`render/geometry.ts`) để mọi nơi cần
  biết điểm neo đường nối (vẽ đường, vẽ nhãn cha-con) đều đọc đúng
  theo layout, tránh lặp lại if/else ở nhiều chỗ. Theo đúng 2 quyết
  định đã thống nhất trước khi làm: **phím Trái/Phải đảo nghĩa** theo
  đúng hướng nhìn thấy trên màn hình khi dùng Logic Left (Lên/Xuống
  không đổi); **4 icon soi gương** theo layout (ghi chú/huy hiệu ưu
  tiên vốn cắm mép trái, link/vòng tiến độ vốn cắm mép phải — đổi bên
  đồng bộ cả 4 khi dùng Logic Left, để luôn nằm đúng phía "ra ngoài,
  xa cha"). `computeDropTarget` (kéo-thả) xác nhận KHÔNG cần sửa — vốn
  đã tính theo toạ độ thật của từng con, không giả định hướng cụ thể.
  Đã tự kiểm bằng 2 script riêng (11 phép thử: toạ độ đúng chiều, điểm
  neo đúng cho cả 2 layout, hoàn tác, di trú schema; và 4 phép thử
  riêng cho tình huống nhiều node rộng khác nhau cùng tầng — xác nhận
  không chồng lấn, thẳng hàng đúng dù chênh lệch độ rộng lớn) trước
  khi gửi.
- **P2.7b — Bố cục Logic Both Sides.** Không cần nâng schema (trường
  `layoutType` đã có sẵn từ P2.7a, chỉ thêm giá trị hợp lệ mới
  `"logicBoth"`). Chỉ **con trực tiếp của gốc** (hoặc của mỗi nhánh
  trôi — coi như gốc riêng) bị chia sang 2 bên; một khi đã "cam kết"
  một bên, toàn bộ cây con đi theo tới hết. **Tự động cân bằng** theo
  tổng CHIỀU CAO cây con (không phải chỉ đếm số lượng) bằng thuật toán
  tham lam kinh điển — sắp giảm dần theo chiều cao, lần lượt nhét vào
  bên đang nhẹ hơn. Đo chiều cao bằng cách chạy "dry run"
  `layoutSubtreeRight` cho mọi con trước (vị trí tạm thời bị ghi đè
  hoàn toàn ở bước sau, dry run chỉ cần đúng con số trả về). **Xuất
  hai hàm đệ quy trước đây private** (`layoutSubtreeRight`/
  `layoutSubtreeLeft`) từ `logicRight.ts`/`logicLeft.ts` để dùng lại
  nguyên xi cho mỗi bên — không viết lại thuật toán đệ quy lần thứ ba.
  **Phát hiện thiết kế hay khi làm**: xác định "node này đang ở bên
  nào" bằng cách SO SÁNH TOẠ ĐỘ THẬT với cha (thay vì đọc
  `map.layoutType`) hoá ra dùng chung đúng cho CẢ BA layout — áp dụng
  luôn cách này để **viết lại** `parentChildEdgeAnchors`, icon soi
  gương (`isNodeLeftOriented`), và `navigateArrow`/phím Trái-Phải cho
  gọn hơn hẳn so với cách hardcode riêng `layoutType === "logicLeft"`
  đã làm ở P2.7a — đồng thời xác nhận KHÔNG hồi quy hành vi cũ của
  Logic Right/Left qua bộ kiểm riêng. **Giới hạn đã biết, cố tình chưa
  sửa**: kéo-thả để SẮP XẾP LẠI thứ tự chính các con trực tiếp của gốc
  (không phải đổi cha) khi đang ở Logic Both Sides có thể cho kết quả
  không như ý — `computeDropTarget` phát hiện khe hở dựa theo toạ độ Y
  giữa 2 node LIÊN TIẾP TRONG MẢNG, nhưng ở Both Sides hai con liên
  tiếp trong mảng có thể đang nằm ở 2 BÊN KHÁC NHAU (không cùng cột
  dọc), khiến việc dò khe hở giữa chúng không còn ý nghĩa. Không ảnh
  hưởng dữ liệu (không mất/hỏng gì), chỉ là trải nghiệm kéo-thả trong
  đúng tình huống hẹp này chưa hoàn thiện. Đã tự kiểm bằng 3 script
  riêng (7 phép thử thuật toán cân bằng + không chồng lấn, 5 phép thử
  điểm neo đường nối đúng theo từng cặp cha-con kể cả hồi quy, 9 phép
  thử điều hướng phím kể cả hồi quy logicRight/logicLeft) trước khi gửi.
- **P2.7c (chỉ phần Tree Down) — Bố cục dọc từ trên xuống.** Khác hẳn
  logicRight/Left/Both (đều xoay quanh trục ngang: X=độ sâu, Y=anh
  em), Tree Down XOAY TRỤC 90°: Y=độ sâu, X=anh em — lần đầu trong dự
  án. `layout/treeDown.ts` kết cấu giống hệt `layoutSubtreeRight`
  nhưng hoán đổi hoàn toàn vai trò X↔Y. Do đổi trục, hàng loạt chỗ
  khác cũng phải cập nhật: `parentChildEdgeAnchors` thêm nhánh nối mép
  dưới cha — mép trên con (điểm giữa theo NGANG, khác các layout khác
  nối điểm giữa theo DỌC); đường cong trong `drawEdges`/`drawEdgeLabels`
  đổi điểm điều khiển theo trục Y; `computeDropTarget` đảo hẳn cách dò
  khe hở giữa anh em (theo X thay vì Y) — **sửa triệt để** thay vì chỉ
  ghi nhận giới hạn như đã làm với Both Sides ở P2.7b, vì lỗi này ảnh
  hưởng MỌI CẤP trong Tree Down, không chỉ riêng gốc. `navigateArrow`
  đảo hoàn toàn vai trò 4 phím: Lên/Xuống thành cha/con, Trái/Phải
  thành tìm anh em — tổng quát hoá `findVisuallyNearestNode` (trước
  chỉ có lên/xuống) thêm 2 hướng trái/phải. **Lỗi tự phát hiện qua tự
  kiểm, đã sửa ngay**: `findVisuallyNearestNode` bản đầu cho trái/phải
  dùng chung công thức trọng số với lên/xuống (phạt trục phụ hệ số
  0.5) — không đủ để loại trừ trường hợp GỐC (khác hàng nhưng tình cờ
  gần hơn theo X thuần tuý) bị chọn nhầm thay vì đúng anh em cùng
  hàng; đã tăng hệ số phạt trục phụ lên 3 cho riêng nhánh trái/phải,
  không đụng tới nhánh lên/xuống đã qua kiểm thử kỹ từ trước. **Quyết
  định phạm vi đã thống nhất trước khi làm** (từ 3 câu hỏi làm rõ
  "Organization Chart"): giữ nguyên vị trí 4 icon (không chuyển sang
  trên/dưới cho layout dọc) — coi là giới hạn nhẹ, để dành sau nếu
  thấy cần; Organization Chart sẽ CHỈ là Tree Down + đường nối góc
  vuông kiểu T (không cần hệ toạ độ riêng), không cần thẳng hàng tuyệt
  đối theo cấp, không cần khung tự động quanh nhóm. Đã tự kiểm bằng 3
  script riêng (5 phép thử thuật toán layout, 7 phép thử điểm neo +
  dò khe hở + tìm anh em, 7 phép thử điều hướng phím — tất cả đều có
  đối chứng xác nhận không hồi quy layout ngang) trước khi gửi.
- **P2.7c (thêm phần Organization Chart).** Dùng CHUNG thuật toán xếp
  vị trí với Tree Down (`layoutTreeDown`) — không viết layout riêng,
  không cần Command mới. Thêm hàm dùng chung `isVerticalLayout()`
  (`core/types.ts`) để mọi nơi cần biết "đây có phải layout dọc hay
  không" (điều hướng phím, dò khe hở kéo-thả, điểm neo đường nối) đều
  nhận đúng CẢ HAI `treeDown` lẫn `orgChart` — tránh phải sửa rải rác
  nhiều chỗ khi thêm layout dọc tiếp theo (Tree Up). Điểm khác biệt
  DUY NHẤT so với Tree Down: kiểu vẽ đường nối — góc vuông kiểu T (từ
  đáy cha đi ngang tới đúng cột con rồi rẽ vuông góc xuống đỉnh con),
  đặt kiểm tra NÀY TRƯỚC cả `edgeShape` riêng từng node — **Organization
  Chart LUÔN vẽ góc vuông, bỏ qua tuỳ chọn cong/thẳng của từng node** —
  quyết định có chủ đích: một sơ đồ tổ chức mà lẫn lộn kiểu đường trong
  cùng một sơ đồ sẽ mất đi đúng cái "nhất quán, nhấn mạnh cấp bậc" mà
  bạn đã mô tả khi bàn thiết kế. Nhãn cha-con trên đường góc vuông đặt
  tại đoạn ngang giữa, KHÔNG XOAY (khác Tree Down — đường gấp khúc
  không có khái niệm "tiếp tuyến" như đường cong). Đã tự kiểm bằng
  script riêng (9 phép thử) xác nhận Organization Chart cho ra ĐÚNG
  CÙNG toạ độ với Tree Down ở mọi node, và kế thừa đúng cả điểm neo
  đường nối lẫn cách dò khe hở kéo-thả — không có sai lệch nào.
- **P2.7c (thêm phần Tree Up — hoàn tất cả cụm P2.7c).** Soi gương dọc
  của Tree Down, giống cách Logic Left từng soi gương Logic Right ở
  P2.7a. Khác treeDown.ts ở MỘT điểm đáng chú ý: tham số vị trí truyền
  xuống đệ quy là "bottomY" (Y của MÉP DƯỚI node) thay vì "depthY"/
  "topY" — vì cây toả lên trên, mốc tự nhiên để neo là mép GẦN GỐC HƠN
  (mép dưới). Nhờ đó MỌI ANH EM cùng cấp tự động thẳng hàng theo MÉP
  DƯỚI dù chiều cao mỗi node khác nhau (ví dụ do tuỳ chỉnh cỡ chữ) —
  đối xứng đúng với treeDown (anh em thẳng hàng theo MÉP TRÊN). Thêm
  `treeUp`/`orgChart` vào `isVerticalLayout()` — nhờ đã tổng quát hoá
  hàm này từ trước, `computeDropTarget` và phần lớn `parentChildEdgeAnchors`
  **không cần sửa gì thêm** ngoài đúng 1 nhánh mới cho hướng nối
  (đỉnh cha → đáy con, ngược treeDown). **Phát hiện thú vị nhất khi
  làm**: `navigateArrow` (điều hướng phím) hoạt động ĐÚNG NGAY cho Tree
  Up mà **không cần sửa một dòng code nào** — nhờ cách so sánh toạ độ
  thật (thay vì đọc cứng layoutType) đã tổng quát hoá từ P2.7b, việc
  Lên/Xuống tự động đảo đúng nghĩa (Lên = vào con vì con thật sự ở
  trên, Xuống = về cha) hoàn toàn tự nhiên từ hình học, không cần biết
  trước "đây là treeUp" ở bất kỳ đâu trong logic điều hướng. Đã tự
  kiểm bằng 2 script riêng (13 phép thử: thuật toán layout — đặc biệt
  tình huống thẳng hàng mép dưới dù chiều cao khác nhau, điểm neo
  đường nối, điều hướng phím, dò khe hở kéo-thả) trước khi gửi.
- **P2.7d — Fishbone (sơ đồ xương cá / Ishikawa).**
  > ⚠️ **ĐÃ XOÁ HOÀN TOÀN KHỎI ỨNG DỤNG** — theo yêu cầu trực tiếp, sau
  > 7 vòng thiết kế lại (từ toạ độ cực ban đầu tới kiến trúc xương
  > sống ngang ở Vòng 7, gồm cả cân bằng trọng lượng) vẫn chưa đạt
  > được hình dạng người dùng thực sự cần. Toàn bộ nội dung TỪ ĐÂY tới
  > hết phần "Vòng 7" bên dưới **CHỈ CÒN GIÁ TRỊ LỊCH SỬ/BÀI HỌC KỸ
  > THUẬT** (thuật toán "đặt rồi đo" chống chồng lấn, công thức hình
  > chiếu vuông góc, cách cân bằng trọng lượng hai nhóm...) — KHÔNG
  > PHẢI mô tả tính năng đang hoạt động. `layoutType: "fishbone"`
  > KHÔNG CÒN TỒN TẠI trong ứng dụng — file cũ có giá trị này tự động
  > chuyển về `"logicRight"` khi mở lại (migration schema v13→v14).
  > **2 checklist kiểm thử tay dành riêng cho Fishbone trong tài liệu
  > này đã bị XOÁ HẲN** (không phải chỉ đánh dấu) vì làm theo sẽ chỉ
  > gây nhầm lẫn — tính năng không còn để kiểm.

  Khác HẲN 6 layout
  trước — không "toả theo cấp" dọc một trục cố định, mà dùng TOẠ ĐỘ
  CỰC (góc + khoảng cách) tự lặp lại: mỗi node có "hướng xương sống
  riêng" (kế thừa từ góc nó vừa rẽ khỏi cha), con của nó rẽ chéo khỏi
  ĐÚNG hướng đó (không phải hướng xương sống gốc ban đầu), càng sâu
  càng thu ngắn — không giới hạn số cấp, không mất dữ liệu ở bất kỳ độ
  sâu nào (theo đúng yêu cầu đã thống nhất trước khi làm). Quy ước
  hướng (đã đổi 1 lần — xem vòng 5 bên dưới): đầu cá (gốc) bên TRÁI,
  xương sống kéo dài sang PHẢI; nhánh chính/phụ tự động cân bằng theo
  TRỌNG LƯỢNG cây con (đúng yêu cầu "giống Both Sides").
  **Hành trình 3 vòng thiết kế lại, mỗi vòng tự kiểm phát hiện đúng
  vấn đề của vòng trước:**
  1. *Góc cố định ±38° + dàn theo chỉ số*: tự kiểm phát hiện lỗi
     **trùng khít 0px** — mọi node cùng nhóm cân bằng nhận đúng cùng
     góc + cùng khoảng cách.
  2. *Thêm dàn dọc xương sống*: hết trùng khít, nhưng tự kiểm phát
     hiện lỗi MỚI — 2 node ở **2 nhánh hoàn toàn khác nhau** tình cờ
     hội tụ gần nhau (không có gì ngăn một nhánh "lượn" sang địa phận
     nhánh khác — rủi ro cố hữu của layout toạ độ cực, khác cây kiểu
     Đề-các vốn có "làn đường" tách biệt sẵn theo trục).
  3. *Chia MÚI GÓC (angular wedge) + tự đẩy xa khi múi hẹp*: đổi hẳn
     cách tiếp cận — mỗi node được cấp một MÚI GÓC riêng (rộng hay hẹp
     theo trọng lượng), con cháu CHỈ được đặt trong đúng múi đã cấp,
     không bao giờ tràn ra ngoài — đảm bảo 2 nhánh khác nhau không thể
     chồng lấn **bằng thiết kế**, không phải may rủi tham số. Khi một
     node có nhiều con phải chia sẻ múi hẹp (cạnh tranh với nhiều anh
     em), tự động ĐẨY XA hơn (tăng bán kính) để giữ khoảng cách tối
     thiểu — nhận ra việc tăng bán kính không hề phá vỡ đảm bảo không
     chồng lấn (đảm bảo đó chỉ phụ thuộc GÓC, không phụ thuộc khoảng
     cách). Đã tự kiểm bằng 7 phép thử qua nhiều tình huống (cơ bản,
     cây lệch hẳn 1 nhánh siêu nặng, chuỗi sâu 6 cấp, 10 con cùng cha,
     và stress test 105 node) — mọi tình huống đều đạt.
  4. *(Phát hiện SAU KHI đã gửi bản đầu, ngay lúc dựng file mẫu để
     kiểm thử)* — vòng 3 tuy hết chồng lấn nhưng quét múi theo ĐÚNG
     THỨ TỰ MẢNG (gặp đâu hay đó khi tích luỹ góc vượt quá hướng xương
     sống chính), nên KHÔNG thật sự cân bằng TỔNG TRỌNG LƯỢNG giữa 2
     nửa trên/dưới như đã thống nhất — chỉ tình cờ cân bằng nếu thứ tự
     trong file cũng tình cờ xen kẽ nặng/nhẹ hợp lý. Kiểm bằng dữ liệu
     thật (6 nhánh 6M, "Con người" cố tình nặng hơn và đứng ĐẦU mảng):
     3 nhánh đầu mảng bị dồn hết một bên (nặng gấp rưỡi 3 nhánh còn
     lại), dù bản thân cách dồn đó không hề chồng lấn. Sửa: TÁCH THÀNH
     2 NHÓM cân bằng trọng lượng trước — thuật toán tham lam GIỐNG HỆT
     Logic Both Sides (P2.7b) — rồi MỖI NHÓM mới quét múi riêng trong
     đúng nửa của mình. Đã tự kiểm lại đủ 6 phép thử (kể cả phép thử
     riêng cho đúng vấn đề vừa sửa, và toàn bộ 5 phép thử cũ để xác
     nhận không hồi quy tính chất không chồng lấn).
  5. *(Thử và ROLLBACK, theo phản hồi kèm ảnh tham khảo)* — người dùng
     đề xuất cấp 2 trở đi đổi sang XẾP CHỒNG THẲNG (không xoay góc
     thêm), giống cách các sơ đồ xương cá chuyên nghiệp vẫn vẽ (mục
     con thẳng hàng gọn gàng, chữ không bị xoay nghiêng). Đã thử viết
     lại: cấp 1 giữ nguyên múi góc, cấp 2 trở đi xếp thành CỘT dọc
     theo trục VUÔNG GÓC với hướng xương chính, đệ quy giữ NGUYÊN
     hướng đó qua các cấp sâu hơn (không xoay tiếp). Tự kiểm phát hiện
     NGAY vấn đề nghiêm trọng hơn cả những gì đã gặp trước đó: bỏ ràng
     buộc múi góc ở cấp 2+ làm MẤT LUÔN đảm bảo "không chồng lấn giữa
     các nhánh khác nhau" mà vòng 3 đã dày công xây dựng — 2 XƯƠNG
     CHÍNH khác nhau (không chỉ anh em cùng cha) đâm thẳng vào nhau
     (13px), vì không còn gì ngăn "cấp 2 của nhánh A" lấn sang lãnh
     thổ "cấp 2 của nhánh B". Thử sửa bằng cách tính lại hướng thật
     theo từng cặp cha-con (thay vì kế thừa nguyên xi) và tăng khoảng
     cách xếp chồng — vẫn không triệt để, các lỗi mới liên tục xuất
     hiện ở tình huống khác. **Bài học rút ra**: đảm bảo không chồng
     lấn cho một layout toạ độ cực NHẤT THIẾT cần yếu tố GÓC để phân
     tách các nhánh — xếp chồng thuần khoảng cách không đủ, dù nhìn
     có vẻ đơn giản và gọn hơn. Quyết định ROLLBACK về đúng bản múi
     góc (vòng 4), chỉ giữ lại phần THAY ĐỔI AN TOÀN duy nhất từ lần
     thử này: **đổi hướng đầu cá sang TRÁI** (trước đó bên phải) —
     thay đổi này chỉ đổi góc khởi điểm (0° thay vì π), không đụng gì
     tới cơ chế múi/cân bằng đã kiểm chứng, nên không có rủi ro hồi
     quy. Đã tự kiểm lại đủ 6 phép thử sau khi rollback + đổi hướng,
     xác nhận khôi phục đúng và hướng mới hoạt động chuẩn.
  **3 giới hạn đã biết, cố tình chưa xử lý sâu hơn** (đều đã tự kiểm
  và ghi nhận rõ ràng, không phải bỏ sót): (1) kéo-thả sắp xếp lại thứ
  tự anh em (không phải đổi cha) — hình học chéo tuỳ ý không khớp
  cách dò khe hở hiện có (vốn chỉ hiểu trục ngang hoặc trục dọc thuần
  tuý); (2) điều hướng phím Trái/Phải và soi gương icon dùng phép so
  MÉP HỘP có sẵn từ P2.7a/b — tự kiểm phát hiện phép so này không
  tuyệt đối chính xác cho Fishbone (node rộng ở góc gần biên múi có
  thể lấn nhẹ qua mép cha dù TÂM đã tách bạch đúng theo múi), cân nhắc
  sửa sâu hơn thì phải động vào logic dùng chung cho cả 6 layout khác
  đã kiểm kỹ, rủi ro hồi quy cao hơn lợi ích nên quyết định không sửa;
  (3) icon (ưu tiên/tiến độ/ghi chú/link) giữ nguyên vị trí trái/phải
  quen thuộc, giống giới hạn đã chấp nhận từ Tree Down.

  **VÒNG 6 (đã làm — mục (4) ở trên, theo phản hồi trực tiếp kèm ảnh
  Ishikawa tham khảo, "nhánh quá dài").** Cấp 2 (Cause, con trực tiếp
  của Category) đổi sang mọc VUÔNG GÓC dọc theo đường Category tại
  nhiều điểm cách đều, KHÔNG tiếp tục nghiêng góc thêm — giải quyết
  đúng nguyên nhân "nhánh quá dài do cộng dồn góc nghiêng qua nhiều
  cấp". Cấp 1 (Category) và cấp 3 trở đi (Cause hiếm khi có con riêng)
  giữ nguyên múi góc thông thường.
  **Quá trình tự kiểm phát hiện và sửa LIÊN TIẾP 5 lỗi thật** qua nhiều
  vòng (ảnh hình học trừu tượng → ảnh render thật → test tích hợp
  permanent → test stress → so sánh diện tích) — đây là tính năng đòi
  hỏi nhiều vòng sửa nhất từ trước tới giờ trong dự án:
  1. Hướng "vào trong" chọn SAI (dùng so sánh hiệu góc thay vì tích
     chéo) — Cause mọc lệch sai phía, vượt qua xương sống.
  2. Công thức đầu KHÔNG tính kích thước thật của node — node đè lên
     nhau rõ rệt khi render ảnh thật (bài kiểm hình học trừu tượng chỉ
     vẽ điểm/đường, không lộ ra được).
  3. Hệ số an toàn viết NHẦM DẤU ý nghĩa (1.6, lớn hơn 1, thay vì nhỏ
     hơn 1) — cho phép vượt biên múi thay vì giới hạn dưới biên.
  4. Cause CUỐI CÙNG đè lên CHÍNH category của nó — chưa từng ràng
     buộc khoảng cách tới category.
  5. Một lần sửa (dùng "maxT" thu hẹp phạm vi) MÂU THUẪN với công thức
     đã có (giả định t không nhân thêm hệ số nào) — test stress
     (n=1, n=2) lộ ra ngay.
  **Sửa đúng cuối cùng**: hai ràng buộc ĐỘC LẬP (theo GÓC cho Cause
  đầu tiên, theo KHOẢNG CÁCH THẲNG cho Cause cuối cùng) — dùng MAX
  giữa chúng (không cộng — một lần thử cộng dồn 2 ràng buộc làm
  category line dài HƠN CẢ HAI ràng buộc gộp lại, chỉ phát hiện qua
  so sánh diện tích trước/sau, không phải qua bộ test "không chồng
  lấn" — bộ test đó bắt được ĐÚNG/SAI nhưng không bắt được TỐI ƯU).
  Gộp toàn bộ công thức vào một hàm dùng chung
  (`computeCauseSpacingInfo`) — tránh viết trùng lặp ở 2 nơi (chính là
  nguyên nhân của lỗi số 5).
  **Đánh đổi cần biết THẲNG THẮN**: diện tích tổng thể của sơ đồ TĂNG
  khoảng 2.2 lần so với bản trước vòng 6 (585×1008 → 954×1359, đo bằng
  cùng một bộ dữ liệu mẫu) — không phải vì cộng dồn góc nghiêng qua
  nhiều cấp như vấn đề gốc, mà vì category line cần đủ dài để N Cause
  đủ chỗ an toàn theo góc múi (thường khá hẹp khi có nhiều Category).
  Đây là CÁI GIÁ cho việc đảm bảo TOÁN HỌC CHẶT CHẼ không bao giờ
  chồng lấn (khác thiết kế cũ, vốn không đảm bảo diện tích nhỏ mà chỉ
  tình cờ nhỏ trong các trường hợp cụ thể đã thử — có thể vẫn có
  trường hợp khác chồng lấn chưa từng phát hiện). Nếu sau khi thử,
  diện tích tăng này chưa ổn, đây là điểm có thể bàn thêm hướng khác
  (ví dụ giảm bớt margin an toàn, chấp nhận rủi ro chồng lấn nhẹ ở
  trường hợp cực đoan để đổi lấy hình nhỏ gọn hơn).
  Node gốc bo góc đậm hơn (16px thay vì 8px) — áp dụng cho MỌI layout
  (không chỉ Fishbone), theo đúng yêu cầu (yếu tố duy nhất trong ảnh
  tham khảo hợp lý áp dụng rộng, không gắn với ngữ cảnh riêng "nguyên
  nhân-kết quả" của Fishbone).
  10 test permanent mới trong `layout/fishbone.test.ts` (lần đầu có
  test cho `layout/`) — đặc biệt test STRESS qua 8 tổ hợp số
  Category × số Cause khác nhau, và test kích thước node KHÔNG ĐỒNG
  ĐỀU (một Cause tên rất dài) để xác nhận công thức dùng MAX kích
  thước, không phải trung bình, vẫn đúng trong mọi trường hợp.

  **VÒNG 7 (viết lại HOÀN TOÀN kiến trúc — không phải chỉnh sửa tiếp
  trên nền Vòng 6) — theo phản hồi trực tiếp kèm 2 ảnh tham khảo THỰC
  TẾ** (sơ đồ người dùng tự vẽ bằng công cụ khác, không phải mẫu
  Ishikawa lý thuyết như trước): kiến trúc TOẠ ĐỘ CỰC (mọi Category
  toả ra từ một điểm gốc duy nhất, dùng xuyên suốt từ Phiên bản 2 tới
  hết Vòng 6) SAI HẲN so với Fishbone thật — Fishbone chuẩn có XƯƠNG
  SỐNG LÀ MỘT ĐƯỜNG THẲNG NẰM NGANG, Category cắm vào NHIỀU ĐIỂM KHÁC
  NHAU dọc theo đường đó, không toả chung từ một điểm.
  **Cơ chế AN TOÀN cũng đổi hẳn triết lý** (không chỉ đổi hình dạng
  hiển thị): Vòng 6 dựa vào GÓC (mỗi nhánh có múi góc riêng, không
  giao nhau bất kể bán kính); Vòng 7 KHÔNG CÒN múi góc dùng chung một
  gốc nữa — an toàn phải đến từ KHOẢNG CÁCH DỌC TRỤC X giữa các điểm
  cắm Category kế tiếp. Cách đảm bảo AN TOÀN chọn cho Vòng 7: **"ĐẶT
  RỒI ĐO, DÙNG SỐ ĐO THẬT ĐỂ ĐỊNH VỊ TIẾP THEO"** — sau khi đặt xong
  một Category và toàn bộ Cause của nó, ĐO bounding box X THỰC TẾ
  (không suy luận trước bằng công thức lượng giác) — Category tiếp
  theo luôn bắt đầu SAU điểm xa nhất vừa đo — cố tình chọn cách này
  thay vì tính trước bằng công thức, vì 5 lỗi liên tiếp ở Vòng 6 đều
  bắt nguồn từ công thức lượng giác sai một chi tiết nhỏ khó nhận ra
  ngay; "đo thật rồi mới đặt tiếp" loại bỏ hẳn rủi ro đó.

  **Phase 1 (khung kiến trúc)** — chia Category thành cặp trên/dưới
  XEN KẼ theo thứ tự (chưa cân bằng trọng lượng — để dành sau), mỗi
  cặp cắm vào cùng một điểm trên xương sống, đường Category nghiêng
  góc CỐ ĐỊNH 35°. Ngay khi tự rà lại code (TRƯỚC KHI kịp render ảnh
  đầu tiên), phát hiện và tự sửa 1 lỗ hổng rõ ràng: độ dài đường
  Category ban đầu là HẰNG SỐ CỐ ĐỊNH, không điều chỉnh theo số Cause
  — với N Cause lớn, chắc chắn chồng lấn (đúng lỗ hổng Vòng 6 đã tốn 5
  lần sửa, suýt lặp lại y hệt).
  **Phát hiện qua đúng BỘ TEST PERMANENT (không phải chỉ nhìn ảnh
  tổng thể)**: bản viết lại LẶP LẠI đúng lỗi #1 của Vòng 6 (chọn sai
  hướng "vào trong" bằng so sánh hiệu góc thay vì tích chéo) — vì quên
  áp dụng lại công thức đã học được khi viết mọi thứ từ đầu. Đây là
  bằng chứng cụ thể cho giá trị của bộ test permanent: 9/10 test CŨ
  (viết cho kiến trúc CŨ hoàn toàn khác) vẫn PASS sau khi đổi hẳn kiến
  trúc — xác nhận thiết kế mới an toàn tốt cho phần lớn trường hợp đã
  kiểm trước đó; đúng 1 test lộ ra lỗi hướng sai này ngay lập tức.
  1 test (Cause có con riêng, cấp 3 — hiếm gặp) đánh dấu SKIP có lý do
  rõ ràng thay vì xoá hẳn hoặc để đỏ, chờ làm ở bước sau.

  **Sửa đường nối Cause (theo phản hồi trực tiếp, so ảnh mẫu)** — nối
  thẳng tâm-tâm (Category → Cause) làm Cause trông như "toả ra" từ một
  điểm chung (đầu mút Category) thay vì "ăn vào" đường Category tại
  các điểm riêng biệt dọc theo nó, đúng như thuật toán ĐÃ ĐẶT VỊ TRÍ
  nhưng phần VẼ đường nối chưa khớp. Sửa bằng **HÌNH CHIẾU VUÔNG GÓC**:
  chiếu tâm Cause lên đường Category (spinePoint → categoryCenter) để
  suy ngược đúng điểm neo ban đầu — không cần lưu thêm dữ liệu vào
  schema, chỉ cần suy luận hình học ngược (vì Cause được đặt tại
  "anchor + perp·khoảng_cách" với perp vuông góc đường Category, chiếu
  ngược tâm Cause lên đúng đường đó cho lại đúng anchor).
  **Phát hiện thêm 1 lỗi tiềm ẩn khi tự rà lại** (không đợi người dùng
  báo): điều kiện phân biệt "đây là Category" dùng `parent.id ===
  map.rootId` — chỉ đúng cho CÂY CHÍNH, SAI với NHÁNH TRÔI (gốc riêng,
  khác `map.rootId`) — sẽ khiến Category của nhánh trôi bị xử lý nhầm
  như Cause. Sửa dùng `parent.parentId === null` (đúng cho MỌI gốc,
  kể cả nhánh trôi) và dùng `parent.parentId` (không phải `map.rootId`
  cố định) để tìm đúng root CỦA CHÍNH CÂY đó khi tính cho Cause. Tự
  kiểm bằng script riêng xác nhận điểm neo tính đúng gần gốc TRÔI,
  không lẫn với gốc CHÍNH.

  **Thêm đường XƯƠNG SỐNG CHÍNH liền mạch** (theo phản hồi trực tiếp:
  "xương sống của con cá đang bị thiếu") — trước đó chỉ có từng đoạn
  RỜI RẠC (từ mỗi điểm cắm riêng tới Category của nó), thiếu hẳn đường
  TRỤC CHÍNH nối liền các điểm lại. Tách hàm dùng chung
  `computeCategorySpineX` (export từ `layout/fishbone.ts`) — dùng bởi
  CẢ đường nối (đã refactor `render/geometry.ts` thay công thức inline
  cũ) LẪN đường xương sống mới (`drawFishboneSpine` trong
  `CanvasRenderer.ts`) — tránh viết lại công thức ở nhiều nơi, đúng
  bài học xuyên suốt từ nhiều lần sửa lỗi trước. Vẽ xương sống TRƯỚC
  `drawEdges` (nằm dưới các đường nối khác), tính điểm xa nhất bằng
  chính hàm dùng chung, không suy luận riêng.

  **Đã hỏi lại và XÁC NHẬN rõ ràng trước khi sửa tiếp** (tránh đoán sai
  lần thứ 3, sau khi đã đoán sai 2 lần liên tiếp — kiến trúc toàn bộ,
  rồi hướng nối Cause): người dùng gửi thêm 1 ảnh mẫu KHÁC hẳn (trục
  chính nằm CHÉO, không phải ngang) kèm nhận xét "nhánh đâm ngang chứ
  không đâm chéo" — XÁC NHẬN: ảnh đó chỉ để MƯỢN Ý "cần có xương sống
  rõ ràng" (đã làm ở trên), KHÔNG cần đổi góc nghiêng Category — giữ
  nguyên cấu trúc theo ảnh LOGIN SYSTEM (xương sống ngang, Category
  nghiêng 35° cố định).

  **CÒN LẠI, cố tình để dành cho bước tiếp theo** (đã trao đổi rõ với
  người dùng, không phải bỏ sót): Cause có con riêng (cấp 3 — hiện tạm
  KHÔNG định vị, test tương ứng đang skip); kiểm các trường hợp biên
  mới (rất nhiều Category dọc một xương sống dài, kích thước node cực
  đoan trong kiến trúc mới).

  **Cân bằng trọng lượng khi chia Category vào 2 nhóm trên/dưới — ĐÃ
  LÀM** (theo yêu cầu trực tiếp, bước đầu tiên trong 3 việc còn lại).
  Trước đó: xen kẽ CỨNG THEO CHỈ SỐ mảng gốc (0→trên, 1→dưới,
  2→trên...), không xét Category nào có nhiều Cause hơn — nếu 1
  Category rất nặng rơi vào vị trí chẵn, phía đó sẽ lệch hẳn so với
  phía kia. Sửa bằng thuật toán THAM LAM giống hệt Both Sides (P2.7b)
  và Vòng 6 cũ: sắp Category theo trọng lượng GIẢM DẦN, gán lần lượt
  vào nhóm đang NHẸ HƠN — giữ đúng thứ tự mảng gốc TRONG TỪNG NHÓM
  (không xáo trộn thứ tự hiển thị trong cùng một nhóm) — rồi GHÉP CẶP
  theo VỊ TRÍ trong từng nhóm (top[i] ghép bottom[i], cùng một điểm
  trên xương sống) — giữ đúng hình ảnh "cặp đối xứng qua xương sống"
  trong ảnh mẫu, nhưng giờ cặp đó có tổng trọng lượng 2 bên cân đối
  hơn thay vì ghép cứng theo thứ tự khai báo.
  **Đánh đổi cần biết THẲNG THẮN**: với dữ liệu có trọng lượng KHÔNG
  hoàn toàn bằng nhau (như ảnh mẫu LOGIN SYSTEM — 4 Category có 5, 3,
  5, 7 Cause), THỨ TỰ Category trên xương sống sẽ ĐỔI so với trước
  (ưu tiên cân bằng tổng trọng lượng hơn giữ nguyên thứ tự khai báo)
  — đã tự kiểm và xác nhận đây là thay đổi có chủ đích, đúng mục tiêu
  của bước này, không phải hồi quy ngoài ý muốn.
  Tự kiểm bằng cả script riêng (Category rất nặng — 10 Cause — tách
  đúng một mình một phía, các Category nhẹ dồn về phía kia) lẫn ảnh
  thật (2 trường hợp: dữ liệu gần giống LOGIN SYSTEM và trường hợp
  lệch trọng lượng rõ rệt). Thêm 2 test permanent mới xác nhận hành
  vi cân bằng, sửa lại mô tả 2 test cũ cho đúng ngữ cảnh (trọng lượng
  bằng nhau là TRƯỜNG HỢP RIÊNG của thuật toán cân bằng, không phải
  quy tắc chính — 2 test đó vẫn đạt vì tình cờ dùng dữ liệu trọng
  lượng bằng nhau, không phải vì hành vi "xen kẽ theo chỉ số" vẫn còn
  đúng).

  **Bộ test permanent đầy đủ cho kiến trúc Vòng 7 — ĐÃ LÀM** (theo yêu
  cầu trực tiếp, ưu tiên trước các việc còn lại ở trên). Viết lại
  HOÀN TOÀN `layout/fishbone.test.ts` (không chỉ thêm lên nền cũ) —
  test riêng cho `computeCategorySpineX` (hàm dùng chung mới), Category
  xen kẽ đúng trên/dưới theo thứ tự, càng về sau càng xa gốc, số lẻ
  Category, Category không Cause nào, không chồng lấn (Category riêng,
  Cause cùng Category, 2 Category khác nhau), Cause giữ đúng phía
  (kiểm CẢ 2 phía trong một lần chạy — bài học từ lỗi đã lặp lại ở
  chính Vòng 7 này), thu gọn, nhánh trôi, kích thước không đồng đều,
  STRESS 9 tổ hợp (thêm trường hợp 12 Category — đặc thù kiến trúc
  mới, không có trong Vòng 6). Thêm mới `render/geometry.test.ts` cho
  đường nối fishbone: Category nối đúng trên xương sống, Cause nối
  đúng qua điểm trên đường Category (không phải tâm-tâm — đúng ngay
  chỗ vừa sửa), nhánh trôi tính đúng không lẫn gốc chính.
  **Phát hiện và sửa 3 lỗi TRONG CHÍNH BÀI TEST** (không phải code
  production) ngay khi chạy lần đầu — đáng ghi lại vì cùng một dạng
  nhầm lẫn lặp lại: (1) `computeCategorySpineX` đọc `node.x/y` (đúng
  ngữ cảnh RENDER, giá trị sau khi cộng offset) nhưng test set nhầm
  `baseX/baseY` (đúng ngữ cảnh LAYOUT NỘI BỘ, trước khi cộng offset)
  — 2 trường phục vụ 2 mục đích khác nhau, dễ lẫn nếu không để ý; (2)
  test "Category càng về sau" gọi hàm trên kết quả `layoutFishbone`
  (chỉ tính `baseX/baseY`) mà quên tự copy sang `x/y` trước; (3) test
  nhánh trôi ban đầu kiểm tra chồng lấn bằng `baseX/baseY` — SAI, vì 2
  cây khác nhau LUÔN có `baseX/baseY` gần giống nhau theo toạ độ CỤC
  BỘ (mỗi cây tự bắt đầu từ gốc riêng) — đây là hành vi ĐÚNG chứ không
  phải lỗi, bài học đã áp dụng đúng ở bộ test Vòng 6 nhưng quên khi
  viết lại. Tự kiểm THÊM một lần nữa bằng ảnh thật sau khi hoàn tất
  (dù chỉ thêm test, không sửa code layout/render) — xác nhận hình
  dạng vẫn y hệt đã chốt với người dùng, không bị ảnh hưởng gì.
- **P2.7e — Hệ thống Tag.** Nâng cấp "Nhãn" tự do cũ (P2.2 —
  `node.labels: string[]`, chữ tự do, không màu, không quản lý tập
  trung) lên hệ thống Tag tập trung: `map.tags: TagDef[]`
  (`{id, name, color}`) + `node.tagIds: string[]` chỉ lưu id, tham
  chiếu vào đó — đổi tên/màu một Tag tự động cập nhật MỌI node đang
  gắn nó, không cần sửa từng node. Nâng schema lên 10. 5 Command
  chuyên dụng (`AddTagCommand`/`RenameTagCommand`/`SetTagColorCommand`/
  `DeleteTagCommand`/`ToggleNodeTagCommand`) — tách riêng khỏi
  `NodeStylePatch` chung vì đây là thao tác CẤP MAP (ảnh hưởng danh
  sách dùng chung), khác việc patch một trường của riêng một node.
  `DeleteTagCommand` xoá KHỎI DANH SÁCH lẫn khỏi MỌI node đang gắn
  cùng lúc, hoàn tác đúng cả 2 phần (không phải "gắn lại cho mọi node"
  sai lệch — chỉ gắn lại đúng những node đã thực sự có nó trước khi xoá).
  Di trú 9→10 **không mất dữ liệu nhãn cũ**: gom theo GIÁ TRỊ DUY NHẤT
  (2 node cùng gõ "Quan trọng" giờ chia sẻ đúng MỘT Tag, không tạo
  trùng lặp), màu gán vòng tròn từ bảng màu cố định. Định dạng JSON
  cây soạn tay và XLSX **tiếp tục nhận "labels" dạng chữ tự do** (giữ
  đúng tinh thần "soạn tay nhanh" — không bắt khai báo trước danh sách
  Tag), tự động tạo/tái dùng Tag khi nhập, xuất lại đúng tên chữ khi
  xuất — cùng nguyên tắc với hàm di trú. UI: bảng chọn Tag trong panel
  (checkbox bật/tắt cho node đang chọn) tích hợp LUÔN chức năng quản
  lý tập trung ngay tại đó (đổi tên bấm vào tên, đổi màu bấm vào ô màu,
  xoá qua `showConfirm` — không dùng `window.confirm` bị cấm trong dự
  án — vì xoá ảnh hưởng MỌI node đang gắn, cần xác nhận rõ ràng), thay
  vì tách riêng một modal quản lý — gọn hơn cho quy mô Tag của một
  mindmap cá nhân. Đã tự kiểm 21 phép thử qua 3 script riêng (Command
  cơ bản + hoàn tác đúng cả 2 phần khi xoá, di trú không mất dữ liệu +
  không trùng lặp Tag, định dạng soạn tay round-trip nhất quán, layout
  tính đúng kích thước qua tra cứu tên Tag) trước khi gửi.
  **Sự cố giữa chừng đáng ghi nhận**: môi trường làm việc (toàn bộ thư
  mục dự án) bị đặt lại ngoài ý muốn giữa lúc đang làm dở phần UI —
  may mắn file mã nguồn nén gửi bạn ở bước trước đó (root-collapse-fix)
  vẫn còn nguyên trong outputs, dùng nó khôi phục lại rồi làm lại toàn
  bộ phần nền tảng Tag đã mất (không phải làm lại từ đầu dự án). Từ
  sau sự cố này, `git commit` được thực hiện NGAY sau mỗi cột mốc lớn
  hoàn tất, không đợi gộp nhiều việc rồi mới commit — giảm thiệt hại
  nếu sự cố tương tự lặp lại.
- **P2.7f — Định dạng chữ nâng cao + sửa hàng loạt.** Thêm
  `textBold`/`textItalic`/`textUnderline` (đậm/nghiêng/gạch chân cho
  chữ chính) và `checked` (checkbox hoàn thành kiểu to-do, `null` =
  không hiện, `true`/`false` = có hiện — `true` TỰ ĐỘNG gạch ngang chữ,
  đúng quyết định đã thống nhất trước khi làm). Nâng schema lên 11, di
  trú 10→11 đơn giản (chỉ điền mặc định, không biến đổi dữ liệu như
  Tag ở bản 9→10).
  **Vẽ**: Canvas KHÔNG có gạch chân/gạch ngang sẵn cho `fillText` —
  viết `drawTextDecoration()` tự đo bề rộng chữ rồi vẽ một đoạn thẳng
  riêng, dùng CHUNG cho cả 3 chế độ hiển thị (auto/wrap/shrink), gọi
  ngay sau MỖI `fillText` với đúng font đang set lúc đó. Checkbox đặt
  "ngay trước chữ" (đúng quyết định đã thống nhất) — chừa khoảng trống
  bên trái vùng chữ, dịch điểm căn giữa/trái/phải theo đúng
  `checkboxSpace`. **Phát hiện và tự sửa TRƯỚC KHI commit** (không đợi
  người dùng báo)**: `getMeasurer()` (tính kích thước node) ban đầu
  hoàn toàn chưa biết gì về checkbox — nếu không sửa, node có checkbox
  sẽ bị đo HẸP HƠN cần thiết (vì lúc vẽ đã dịch chữ sang phải nhường
  chỗ, nhưng lúc đo lại không cộng thêm khoảng đó), khiến chữ chật/tràn
  oan. Đã bổ sung `checkboxSpace` vào cả công thức đo bề rộng lẫn bề
  rộng khả dụng để ngắt dòng (chế độ "wrap").
  **`BulkUpdateNodeStyleCommand`** (sửa hàng loạt) — áp CÙNG một patch
  cho NHIỀU node cùng lúc, gộp thành đúng MỘT bước hoàn tác, nhưng MỖI
  NODE tự nhớ giá trị cũ CỦA RIÊNG NÓ (một Map theo nodeId, không phải
  cả nhóm dùng chung một giá trị cũ) — quan trọng vì các node đang
  chọn có thể có giá trị KHÁC NHAU trước khi sửa hàng loạt (node A
  đang đậm sẵn, node B chưa đậm — hoàn tác phải trả đúng A về đậm, B
  về chưa đậm, không phải cả 2 về cùng một trạng thái). Theo đúng
  quyết định đã thống nhất, **mở rộng luôn cho màu nền/màu chữ cũ có
  sẵn** (không chỉ 3 thuộc tính mới), dùng lại nguyên xi
  `NodeStylePatch` đã có — không cần kiểu dữ liệu riêng cho bulk.
  **UI sửa hàng loạt**: mỗi thuộc tính B/I/N/checkbox dùng 2-3 nút
  Bật/Tắt RIÊNG BIỆT thay vì một nút toggle duy nhất — vì với nhiều
  node có thể đang ở trạng thái khác nhau (một số đã đậm, một số
  chưa), "toggle" không có ý nghĩa rõ ràng (đảo theo node nào?).
  Đã tự kiểm 21 phép thử qua 4 script riêng (Command sửa hàng loạt +
  hoàn tác giữ đúng giá trị riêng từng node, di trú không đổi hành vi
  cũ, định dạng soạn tay round-trip đầy đủ, XLSX round-trip — đặc biệt
  phân biệt đúng `checked=false` với `checked=null` không bị lẫn lộn
  qua bảng phẳng, và logic hit-test checkbox khớp đúng vị trí vẽ) trước
  khi gửi.
- **P2.7g — Gộp/bung tuần tự theo cấp.** Bước chèn thêm giữa chừng
  (theo yêu cầu trực tiếp, không nằm trong kế hoạch gốc) — đổi cơ chế
  thu gọn từ NHỊ PHÂN (ẩn hết/hiện hết, chỉ 1 trạng thái) sang XOAY 3
  NẤC kiểu Org-mode: (1) thu gọn hoàn toàn, (2) chỉ hiện con trực
  tiếp — cháu vẫn ẩn, (3) mở hết toàn bộ. **Không thêm trường dữ liệu
  mới nào** — "đang ở nấc mấy" được SUY RA trực tiếp tại thời điểm bấm
  từ chính các cờ `collapsed` đã có sẵn trên node và các con của nó
  (`computeCollapseLevel`), không lưu trữ riêng — nên không có gì có
  thể "lệch pha" giữa dữ liệu lưu và trạng thái hiển thị thật.
  `CycleCollapseLevelCommand` (xoay nấc) và `ExpandAllCommand` (mở
  ngay toàn bộ, bỏ qua nấc giữa — gán cho Shift, dành cho ai vẫn muốn
  hành vi "mở hết một phát" quen thuộc) đều tự nhớ giá trị cũ CỦA
  RIÊNG TỪNG NODE bị đụng tới (một Map theo nodeId) để hoàn tác đúng
  từng bước của chu kỳ, không chỉ đảo ngược thô.
  **Giới hạn đã biết, cố tình chấp nhận** (do đặc điểm sẵn có của
  chấm tròn thu gọn — CHỈ hiện khi node đang ở nấc 1): bấm chuột vào
  chấm tròn chỉ tiện cho LẦN ĐẦU của một chu kỳ (nấc 1→2) hoặc
  Shift-click (mở hết ngay từ nấc 1); một khi node đã rời nấc 1 (nấc
  2 hoặc 3), KHÔNG CÒN chấm tròn nào hiện trên CHÍNH node đó để bấm
  tiếp — phải dùng phím tắt C (đã chọn sẵn node đó) để cycle tiếp.
  Cân nhắc thêm một loại điểm bấm MỚI luôn hiện bất kể trạng thái
  (không chỉ khi collapsed=true) để giải quyet triệt để, nhưng đó là
  mở rộng phạm vi đáng kể so với yêu cầu ban đầu nên chưa làm.
  Cũng chặn riêng NODE LÁ (không có con) — không có gì để cycle,
  tránh set `collapsed=true` vô nghĩa (không ai thấy khác biệt gì, vì
  marker chỉ vẽ khi node có con) chỉ để làm bẩn dữ liệu và tạo một
  bước hoàn tác thừa trong lịch sử.
  Đã tự kiểm 16 phép thử qua 2 script riêng (đúng chu kỳ đầy đủ
  1→2→3→1, hoàn tác từng bước riêng lẻ, chặn gốc và node lá qua đúng
  luồng người dùng thật — không chỉ gọi thẳng Command, `ExpandAllCommand`
  mở đúng dù đang thu gọn nhiều lớp lồng nhau) trước khi gửi.
- **P2.7h — Nâng cấp P2.7g + Độ đậm nhạt nhánh.** Bước chèn thêm giữa
  chừng khác, theo yêu cầu trực tiếp kèm 2 ảnh tham khảo mindmap kiểu
  "cây tự nhiên".
  **(1) ĐẢO NGƯỢC quyết định P2.7g ban đầu** — trước đó CHẶN HẲN thu
  gọn gốc (người dùng từng báo "bấm C ở gốc làm ẩn cả cây" khi còn cơ
  chế nhị phân cũ). Giờ với cơ chế xoay 3 nấc đã có, thu gọn gốc
  không còn "đáng sợ" như trước — bỏ chặn ở cả 3 nơi
  (`ToggleCollapseCommand`, `CycleCollapseLevelCommand`,
  `toggleCollapsePrimary`), gốc hoạt động Y HỆT node thường trong chu
  kỳ, mức thu gọn tối đa đúng là "chỉ còn 1 mình gốc hiện" — đúng ý đồ
  mới, đối xứng hệt một nhánh con bất kỳ.
  **(2)** `navigateHome()` đổi từ private sang public, thêm nút
  **🏠 Về gốc** trên Toolbar (trước đây chỉ có phím Home).
  **(3) Độ đậm nhạt nhánh** — thêm `MindNode.edgeWidth: number | null`
  (null = TỰ ĐỘNG theo cấp, số cụ thể = ép cứng, LUÔN ưu tiên hơn tính
  tự động). Nâng schema lên 12. `getNodeDepth()` (tree.ts) tính độ sâu
  bằng cách đi NGƯỢC `parentId` lên tới gốc (không cần duyệt toàn cây).
  `computeEdgeWidth()` (geometry.ts) — cấp 0 dày nhất (2.5px), mỗi cấp
  sâu hơn giảm 0.4px, không bao giờ mỏng hơn 0.75px (để không biến
  mất hẳn ở cây rất sâu). UI panel thêm ô "Độ dày đường nối" — để
  trống là tự động, gõ số là ép cứng.
  **Lưu ý kỹ thuật quan trọng**: đây vẫn là nét vẽ ĐỀU một độ dày trên
  toàn bộ chiều dài MỘT đường nối — khác với kiểu "thon dần NGAY
  TRONG một đường" (dày ở gốc, mỏng dần khi ra xa NGAY TRÊN CÙNG một
  nét) thấy trong ảnh tham khảo — đó là "Kiểu cây tự nhiên hơn" ở mục
  riêng bên dưới, một tính năng đồ hoạ phức tạp hơn nhiều, Canvas 2D
  không hỗ trợ sẵn.
  Đã tự kiểm 15 phép thử qua 3 script riêng (chu kỳ collapse mới trên
  gốc, `computeEdgeWidth` tự động/tối thiểu/tự chỉnh ưu tiên, UI panel
  qua đúng luồng `patchNode` — gán/reset/hoàn tác) trước khi gửi.

### Kiểu cây "tự nhiên" — P2.7h Phần 4, đã hoàn tất

Cùng yêu cầu với P2.7h ở trên, tham khảo 2 ảnh mindmap có đường nối
"thon dần" (dày ở gần trung tâm, mỏng dần khi ra xa NGAY TRONG CÙNG một
nét vẽ — khác hẳn việc "mỗi CẤP một độ dày riêng" đã làm ở P2.7h #3).
Theo yêu cầu, đây là **một lựa chọn MỚI, bật/tắt được** (không thay thế
cách vẽ hiện tại) — `MindMap.organicEdges: boolean` (mặc định false).
Nâng schema lên 13 — hàm di trú ĐƠN GIẢN NHẤT từ trước tới giờ, chỉ thêm
đúng một trường cấp map.

**Vì sao khó**: Canvas 2D's `ctx.stroke()` chỉ vẽ được MỘT độ dày cố
định cho toàn bộ một path — không có cách nào để một nét "tự thon dần"
qua `lineWidth`. Giải pháp: `drawTaperedBezier()` — lấy 24 điểm dọc
theo đường cong bezier hiện có (dùng lại `cubicBezierPoint`/
`cubicBezierTangent` đã có sẵn trong geometry.ts, không viết lại toán
học từ đầu), tại mỗi điểm tính pháp tuyến (vuông góc với tiếp tuyến,
chuẩn hoá về vector đơn vị — có xử lý trường hợp tiếp tuyến suy biến
về (0,0) tại một điểm hiếm gặp, dùng tạm tiếp tuyến ngay trước đó), rồi
vẽ một ĐA GIÁC (không phải `stroke`, mà `fill`) nối các điểm "lệch sang
2 bên" theo pháp tuyến với độ rộng nội suy tuyến tính từ `widthStart`
(tại node cha, = `computeEdgeWidth()` nhân hệ số 2.2 để "dày hẳn") tới
`widthEnd` (tại node con, = `widthStart` nhân tiếp 0.35 để thon nhọn).
Chỉ áp dụng cho 2 layout dùng đường cong bezier thật (logicRight/Left/
Both và treeDown/treeUp) — Organization Chart (luôn góc vuông) giữ
nguyên cách vẽ cũ vì bản chất hình dạng riêng không phải bezier,
"thon dần" không hợp lý.

**Quy trình kiểm chứng — làm đúng như kế hoạch đã ghi trước khi bắt
tay, không vẽ ẩu một tính năng đồ hoạ phức tạp:**
1. Cài `canvas` (node-canvas) TẠM THỜI, viết thuật toán `drawTaperedBezier`
   trong một script ĐỘC LẬP (chưa đụng vào code chính), vẽ thử với dữ
   liệu mô phỏng cấu trúc mindmap thật (gốc + nhiều nhánh + cấp 2),
   xuất PNG, TỰ XEM bằng mắt qua công cụ đọc ảnh — kết quả khớp đúng
   phong cách 2 ảnh tham khảo ngay từ lần thử đầu tiên.
2. Viết `drawTaperedBezier` (gần như y hệt bản đã kiểm ở bước 1) thành
   private method thật trong `CanvasRenderer.ts`, tích hợp vào
   `drawEdges` — rẽ nhánh khi `map.organicEdges===true` VÀ layout phù
   hợp, giữ nguyên `ctx.stroke()` cũ cho mọi trường hợp còn lại.
3. **Kiểm chứng NGHIÊM NGẶT HƠN NỮA** — không chỉ tin vào việc "code
   trông giống bước 1": dựng lại một kịch bản dùng ĐÚNG class
   `CanvasRenderer` thật của app (không phải bản sao thuật toán), mô
   phỏng `HTMLCanvasElement` bằng node-canvas + stub `getBoundingClientRect`,
   dựng map thật qua `createEmptyMap`/`applyLayout` thật, gọi
   `renderer.draw()` thật với `organicEdges=true`, xuất PNG, xem lại
   bằng mắt — xác nhận **chính code sẽ chạy trong app** (không phải
   một phiên bản "trông giống") cho ra đúng kết quả mong muốn.
4. Gỡ `canvas` ngay sau khi xong (không phải dependency thật của dự án).
5. Thêm công tắc Toolbar — tái dùng NGUYÊN XI `ToggleMapDisplayFlagCommand`
   đã có sẵn từ P2.6b-2 (chỉ mở rộng union type `MapDisplayFlag` thêm
   `"organicEdges"`), không cần viết Command mới cho một cờ boolean cấp
   map giống hệt 3 cờ đã có.

- **P2.8c — Ghép thêm JSON.** Người dùng gửi kèm một bản phác thảo HTML
  (`t17mind-p2_9b-merge-json-remap-data.html`) đã tự viết trước, mô tả
  khá chi tiết cơ chế mong muốn — đọc kỹ file đó trước khi làm, giữ
  đúng những ý hay nhất, nhưng NÂNG CẤP 2 điểm quan trọng: (1) bản phác
  thảo SỬA TRỰC TIẾP `map.nodes`/`map.tags`/... rồi gọi `notify()`,
  KHÔNG hoàn tác được — viết lại thành `MergeMapCommand` thật, tự chụp
  ảnh (deep clone) toàn bộ 6 mảng dữ liệu (nodes/tags/relationships/
  summaries/boundaries/stickyNotes) TRƯỚC khi ghép để hoàn tác đúng,
  đơn giản và chắc chắn hơn nhiều so với tính riêng "phần nào mới thêm
  cần xoá" (đặc biệt rắc rối với Tag, vì Tag có thể được TÁI SỬ DỤNG
  chứ không phải lúc nào cũng tạo mới); (2) bản phác thảo GIỚI HẠN chỉ
  nhận file có đúng 1 gốc (báo lỗi nếu nhiều hơn) — làm luôn HỖ TRỢ
  NHIỀU GỐC ngay từ đầu, mỗi gốc trong file nhập vào trở thành một
  nhánh trôi RIÊNG, xếp chồng dọc bên dưới nội dung hiện có.
  Giữ đúng ý hay nhất của bản phác thảo: remap ID cho MỌI thực thể
  (node/Tag/quan hệ chéo/tóm tắt/khoanh vùng/ghi chú dán) để không bao
  giờ trùng với dữ liệu đang có; Tag GỘP THEO TÊN (không phân biệt hoa
  thường) — trùng tên thì TÁI SỬ DỤNG Tag đã có (không tạo trùng lặp),
  giữ nguyên màu/thông tin của Tag cũ (không bị Tag mới ghi đè). Quan
  hệ chéo/tóm tắt/khoanh vùng chỉ giữ lại nếu MỌI id liên quan đều nằm
  trong đúng phạm vi vừa remap — bỏ qua an toàn nếu file nguồn có gì
  bất thường. Nút Toolbar **"➕ Ghép thêm JSON"**, đặt cạnh "Nhập JSON".
  Đã tự kiểm 11 phép thử bằng dữ liệu thật — đặc biệt tình huống khó
  nhất: 2 Tag trùng tên khác hoa/thường phải gộp đúng, giữ nguyên
  thông tin Tag đã có, hỗ trợ đa gốc, và hoàn tác về đúng trạng thái
  ban đầu cả 6 loại dữ liệu.

- **P2.8 — Explorer.** Khung duyệt cây bên trái, bật/tắt được (nút
  Toolbar 🧭), kéo đổi kích thước (thanh kéo bên phải panel, dùng
  `role="slider"` đúng ngữ nghĩa ARIA — thử `role="separator"` trước
  nhưng đó là phần tử KHÔNG tương tác theo chuẩn, gây cảnh báo
  accessibility khi gắn sự kiện chuột lên nó), chỉnh độ trong suốt
  (thanh trượt 30–100%).
  **Lọc theo Tag** — 2 chế độ chuyển đổi được: **OR** (node có ít nhất
  1 trong các Tag đã chọn) và **AND** (phải có ĐỦ tất cả Tag đã chọn).
  **Tìm kiếm chữ riêng** ngay trong Explorer, không dùng chung ô Ctrl+F
  (theo đúng yêu cầu). Khi ĐANG lọc (chữ hoặc Tag), Explorer tự động
  **giữ nguyên đường dẫn cây** — tổ tiên của một node khớp vẫn hiện dù
  bản thân tổ tiên đó không khớp gì cả (không mất ngữ cảnh cấu trúc,
  giống cách nhiều trình duyệt tệp vẫn làm khi lọc/tìm kiếm) — toàn bộ
  logic này tách thành file `explorerLogic.ts` riêng, THUẦN TUÝ không
  đụng gì tới Svelte, để tự kiểm bằng script gọi thẳng không cần dựng
  UI (đã kiểm 14 phép thử, bao phủ cả AND/OR lẫn giữ đường dẫn).
  **2 chế độ thu gọn/mở**: **"Đồng bộ"** — dùng THẲNG `node.collapsed`
  thật, đổi trong Explorer thì canvas đổi theo (và ngược lại), qua
  đúng `ToggleCollapseCommand` nên vẫn hoàn tác được — nhưng dùng
  PHIÊN BẢN NHỊ PHÂN đơn giản (`toggleNodeCollapsedSimple` mới thêm
  trong appController), KHÔNG dùng cơ chế xoay 3 nấc đã làm ở P2.7g
  (đó là thiết kế riêng cho canvas, "chỉ hiện con trực tiếp" không có
  ý nghĩa gì trong một danh sách phẳng như Explorer). **"Độc lập"** —
  Explorer tự giữ riêng một `Set` các node "đang mở" trong chính nó
  (`explorerStore.independentExpandedIds`), không đụng gì tới
  `node.collapsed` — cho phép duyệt sâu trong danh sách mà không ảnh
  hưởng gì tới những gì đang hiện trên canvas. Chuyển SANG "độc lập"
  lần đầu tự khởi tạo bằng ĐÚNG trạng thái mở/thu gọn hiện tại của
  canvas (không đột nhiên trống trơn hay bung hết bất ngờ).
  Toàn bộ trạng thái Explorer (mở/đóng, độ rộng, độ trong suốt, chế
  độ, bộ lọc, chữ tìm kiếm) là **UI THUẦN TUÝ của phiên làm việc** —
  KHÔNG lưu vào file map, không có trong lịch sử hoàn tác, đúng tinh
  thần đã có sẵn của `uiStores.ts` (giống `helpModalOpenStore`,
  `mapsModalOpenStore`...).
  `ExplorerNodeRow.svelte` là component ĐỆ QUY (Svelte cho phép một
  component `.svelte` tự import chính nó qua `<svelte:self>`) — mỗi
  dòng tự vẽ con của nó, thụt lề theo cấp, hiện chấm màu cho từng Tag,
  icon checkbox (gạch ngang chữ khi đã hoàn thành, tái dùng đúng quy
  ước từ P2.7f). Bấm vào một dòng dùng lại ĐÚNG `revealNode()` đã có
  từ P1.10 (tự bung tổ tiên đang thu gọn TRÊN CANVAS nếu cần, chọn,
  cuộn tới, nhấp nháy đánh dấu) — không viết logic điều hướng mới.

- **P2.8b — Minimap.** Khung nhỏ hiện TOÀN BỘ bản đồ thu nhỏ, bật/tắt
  qua nút Toolbar riêng (🗺, độc lập với Explorer). Khác Explorer ở 2
  điểm theo đúng yêu cầu: **vị trí kéo thả TỰ DO** (không dính cạnh
  màn hình — mặc định góc dưới-phải, tự tính lúc mở lần đầu dựa theo
  kích thước THẬT của khung canvas lúc đó, không đoán trước bằng
  `window.innerWidth`), và **kéo đổi kích thước CẢ 2 CHIỀU** (Explorer
  chỉ đổi được độ rộng vì luôn dính cạnh trái, Minimap là một hộp NỔI
  hoàn toàn tự do nên cần đổi được cả rộng lẫn cao qua một tay cầm ở
  góc dưới-phải).
  **`view` (pan/zoom hiện tại) là property THƯỜNG trong AppController,
  không phải Svelte store** — thêm `viewVersionStore` (uiStores.ts,
  chỉ là một số đếm tăng dần) nối vào ĐÚNG callback `onViewChange` đã
  có sẵn từ trước (main.ts), để Minimap biết "có gì vừa đổi, hãy đọc
  lại view rồi vẽ lại" mà không cần lưu trùng lặp toàn bộ
  `ViewTransform` vào một store riêng — Minimap chỉ cần SUBSCRIBE vào
  con số đó làm dependency phản ứng, không quan tâm giá trị cụ thể.
  Thêm `setViewCenter(worldX, worldY)` và `panViewByWorldDelta(dx, dy)`
  vào AppController (`getView()` đọc thì ĐÃ CÓ SẴN từ trước — suýt viết
  trùng, phát hiện qua lỗi `tsc` "Duplicate function implementation"
  ngay khi kiểm tra, không phải để sót tới lúc chạy mới lộ ra).
  **Vẽ**: mỗi node thành một hình chữ nhật nhỏ (màu theo đúng
  `node.fill`, không vẽ chữ vì quá nhỏ để đọc, chỉ tổ thêm thời gian vẽ
  vô ích), cộng một khung chữ nhật xanh biểu diễn đúng vùng đang xem —
  tính từ `ViewTransform` hiện tại GHÉP VỚI kích thước THẬT của canvas
  chính (lấy qua `byId("map-canvas").getBoundingClientRect()`, không
  giả định kích thước cố định). Toàn bộ phép tính hình học (khung bao
  nội dung, tỷ lệ thu nhỏ, quy đổi world ↔ pixel-trên-minimap, khung
  viewport) tách thành `minimapLogic.ts` THUẦN TUÝ, tự kiểm bằng script
  gọi thẳng không cần dựng UI — đặc biệt kiểm tra quy đổi 2 CHIỀU
  world→minimap→world phải khớp lại chính xác giá trị ban đầu.
  **Tương tác**: bấm bất kỳ đâu trên canvas Minimap → nhảy khung nhìn
  chính tới đó NGAY LẬP TỨC (`setViewCenter`), kéo tiếp tục ngay sau đó
  → pan liên tục theo hướng kéo (`panViewByWorldDelta`, quy đổi từ
  pixel-đã-kéo-trên-minimap sang world-delta trước khi gọi — không
  truyền thẳng số pixel vì Minimap có tỷ lệ thu nhỏ RIÊNG, khác hẳn
  scale của khung nhìn chính) — đúng lựa chọn đã chốt trước khi làm.
  Kéo THANH TIÊU ĐỀ di chuyển VỊ TRÍ của cả khung Minimap (khác hẳn kéo
  trên canvas — đó là pan khung nhìn chính, không phải di chuyển
  Minimap). Kéo tay cầm góc dưới-phải đổi kích thước cả 2 chiều cùng
  lúc.
  **Không dựng được `AppController` thật để kiểm** — `wireEvents()`
  cần `window.addEventListener`/`document.addEventListener` đầy đủ,
  vượt quá những gì node-canvas mô phỏng được (khác `CanvasRenderer`,
  vốn chỉ cần `HTMLCanvasElement` nên dựng được bằng node-canvas như
  đã làm ở P2.7h). Thay vào đó, sao y đúng công thức 2 hàm mới (đã đọc
  kỹ code, logic rất đơn giản — vài dòng cộng/trừ) để kiểm TOÁN HỌC độc
  lập: đúng hướng dịch chuyển, đúng độ lớn dịch chuyển, và kết hợp với
  `toWorld()` có sẵn cho kết quả khớp chính xác.
  Đã tự kiểm tổng cộng 10 phép thử (5 cho hình học Minimap cơ bản, 5
  cho 2 hàm điều khiển view mới) qua 2 script riêng trước khi gửi.

- **P2.9 — Xuất định dạng khác (SVG + Markdown, MỘT PHẦN của nhóm này —
  PDF/OPML/XMind chưa làm).** Cả 2 định dạng CỐ TÌNH giữ phạm vi ở mức
  CỐT LÕI, ghi rõ giới hạn ngay trong comment đầu mỗi file thay vì cố
  xuất MỌI chi tiết trang trí (dễ làm ẩu một tính năng lớn nếu tham
  vọng quá): **không xuất** viên thuốc Tag, icon checkbox/ghi chú/link,
  huy hiệu ưu tiên/vòng tiến độ, hiệu ứng "Kiểu cây tự nhiên" (P2.7h),
  quan hệ chéo, tóm tắt, khoanh vùng, ghi chú dán — dùng "Xuất JSON" khi
  cần đầy đủ mọi dữ liệu.
  **Markdown** (`io/markdown.ts`) — danh sách lồng nhau (2 dấu cách/
  cấp), `checked` thành checkbox to-do chuẩn GitHub-Flavored Markdown
  (`- [x]`/`- [ ]`), Tag thành hashtag `#TênTag` (bỏ khoảng trắng để
  hợp lệ), `link` thành `[chữ](link)`, nhiều gốc (nhánh trôi) mỗi gốc
  một khối riêng cách nhau đúng một dòng trống. Có ESCAPE ký tự đặc
  biệt Markdown (`* _ [ ]`) trong chữ node — thiếu bước này thì một
  node tên "Việc [gấp] *quan trọng*" sẽ vô tình bị hiểu nhầm thành cú
  pháp Markdown khi mở file, không hiện đúng chữ gốc.
  **SVG** (`io/svg.ts`) — tái dùng CHÍNH `parentChildEdgeAnchors()` và
  `computeEdgeWidth()` đã có sẵn trong `render/geometry.ts` để vẽ đúng
  hình dạng đường nối theo từng layout (cong/thẳng/góc vuông kiểu T)
  — KHÔNG viết lại công thức hình học lần thứ hai, tránh
  2 nơi tính cùng một thứ rồi lệch nhau như bài học đã rút ra từ lỗi
  Minimap ở trên. CHỈ xuất node ĐANG HIỂN THỊ THẬT (tôn trọng
  `node.collapsed`, giống chế độ "Đồng bộ" của Explorer/Minimap) — thu
  gọn bớt trước khi xuất nếu muốn ẩn phần nào. Có ESCAPE ký tự XML
  (`< > & " '`) trong chữ node — ngoài lý do hiển thị đúng, còn CHỐNG
  được việc một node vô tình chứa `<script>` (ví dụ dán nhầm từ nơi
  khác) làm hỏng cấu trúc SVG hoặc chạy mã khi mở file bằng trình
  duyệt.
  **Không dựng được công cụ render SVG→ảnh để xem trực quan bằng mắt**
  trong sandbox hiện có (không có sẵn thư viện phù hợp) — thay vào đó
  KIỂM CẤU TRÚC CHUỖI kỹ càng: đếm đúng số `<rect>`/`<path>` khớp với
  số node/đường nối đang hiển thị thật, xác nhận escape đúng, viewBox
  hợp lệ.
  Đã tự kiểm 8 phép thử cho Markdown + 11 phép thử cho SVG (đặc biệt
  escape XSS/ký tự đặc biệt, tôn trọng node đang thu gọn, đúng số
  lượng phần tử) qua 2 script riêng trước khi gửi.

- **P1.11 — Lưu trữ bền vững qua IndexedDB.** Viết lại HOÀN TOÀN
  `io/storage.ts` (trước dùng localStorage, giới hạn ~5MB, dễ mất khi
  người dùng dọn dữ liệu duyệt web — chính comment trong code cũ đã
  ghi rõ "P1.11 sẽ thay bằng IndexedDB", đây là bước hiện thực hoá lời
  hứa đó). GIỮ NGUYÊN tên + tham số mọi hàm công khai
  (`listMaps`/`saveMap`/`loadMap`/`loadLastActiveMap`/
  `setLastActiveMapId`/`renameMap`/`deleteMap`), nhưng ĐỔI TOÀN BỘ từ
  ĐỒNG BỘ sang BẤT ĐỒNG BỘ (`Promise`) — IndexedDB tự bản chất không
  có cách nào dùng kiểu đồng bộ như localStorage. Việc đổi API này BUỘC
  phải rà soát và cập nhật ĐỦ CẢ 3 nơi gọi: `main.ts` (`bootstrap()`
  thành `async`, phải chờ xong `loadLastActiveMap()` mới khởi tạo
  Store/Renderer/Controller — nếu không sẽ lỡ khởi tạo với map RỖNG
  rồi mới "biết" có map cũ cần khôi phục; 2 chỗ autosave dùng
  `void saveMap(...)` fire-and-forget vì hàm này tự bọc lỗi bên trong,
  Promise không bao giờ reject nên không cần `await` chặn UI chờ lưu
  xong), `appController.ts` (`openMap()` thành `async`),
  `MapsModal.svelte` (`refresh`/`open`/`commitRename`/`removeMap` đều
  `async`). Cấu trúc IndexedDB gồm 3 object store (`maps`/`mapIndex`/
  `meta`) đóng đúng vai trò 3 khoá localStorage cũ.
  Đã tự kiểm 13 phép thử bằng `fake-indexeddb` (cài tạm rồi gỡ ngay,
  cùng tinh thần với `canvas` đã dùng nhiều lần trước) — lưu/tải đúng
  dữ liệu, danh sách đúng thứ tự mới nhất lên đầu, con trỏ "đang mở
  gần nhất" đúng, đổi tên, và ĐẶC BIỆT xoá đúng map ĐANG là last-active
  thì con trỏ đó cũng phải mất theo (không trỏ treo tới map không còn
  tồn tại).

- **P1.12 — File System Access API.** Cho phép "Lưu"/"Mở" trực tiếp
  một file JSON THẬT trên đĩa (giống Word/Excel) — khác IndexedDB ở
  trên (tự động lưu NGẦM, người dùng không thấy file nào) và khác
  "Xuất JSON" (luôn tải xuống một file MỚI, không "nhớ" để ghi đè lại
  đúng file cũ). CHỈ Chrome/Edge hỗ trợ — `io/fileSystemAccess.ts` có
  `isFileSystemAccessSupported()` để MỌI nơi gọi kiểm tra trước, ẨN
  HẲN nút liên quan nếu không hỗ trợ thay vì hiện ra rồi báo lỗi khi
  bấm. TypeScript's `lib.dom.d.ts` (theo phiên bản đang dùng) CHƯA có
  sẵn type cho API này (còn khá mới) — phải tự khai báo bổ sung
  (`declare global`), chỉ khai báo ĐÚNG những gì thực sự dùng tới,
  không cố khai báo đầy đủ toàn bộ bề mặt API.
  Handle (`FileSystemFileHandle`) CHỈ tồn tại trong PHIÊN LÀM VIỆC
  HIỆN TẠI (biến thường trong `AppController`, không lưu vào
  IndexedDB) — cố tình đơn giản hoá, tránh độ phức tạp của việc xin
  lại quyền truy cập mỗi lần tải lại trang cộng xử lý handle không còn
  hợp lệ nếu file đã bị xoá/di chuyển — không tương xứng lợi ích cho
  một tính năng chèn thêm. Mở lại trang thì "Lưu" sẽ hỏi lại vị trí
  như lần đầu; người dùng vẫn luôn có IndexedDB tự động lưu ngầm làm
  lưới an toàn phía sau.
  Phím tắt **Ctrl+S** LUÔN `preventDefault()` (tránh trình duyệt tự mở
  hộp thoại "Lưu trang web" vô nghĩa — đó là lưu HTML của trang, không
  phải dữ liệu mindmap), nhưng nếu trình duyệt KHÔNG hỗ trợ thì phải
  THÔNG BÁO RÕ vì sao thay vì im lặng không làm gì — **phát hiện và tự
  sửa điểm này TRƯỚC KHI hoàn tất**, không đợi người dùng báo lỗi khó
  hiểu "bấm Ctrl+S chẳng thấy gì xảy ra".
  `fileHandle` là property THƯỜNG (không phải Svelte store) — thêm
  `hasLinkedFileStore` (uiStores.ts) để Toolbar biết REACTIVE khi nào
  đổi chữ nút giữa "Lưu file..." (chưa có) và "Lưu" (đã có) — cùng bài
  học với `viewVersionStore` đã rút ra từ Minimap trước đó. Reset
  `fileHandle` đúng lúc khi tạo map mới hoặc chuyển sang map khác từ
  "Map gần đây" — handle cũ liên kết với NỘI DUNG KHÁC, không còn hợp
  lý để "Lưu" ghi đè nhầm.
  **Không thể dùng trình duyệt thật để kiểm** (đây là API tương tác
  người dùng — hộp thoại chọn file của hệ điều hành) — thay vào đó
  MOCK `window.showSaveFilePicker`/`showOpenFilePicker` và
  `FileSystemFileHandle` giả lập để kiểm LOGIC NỘI BỘ: ghi đúng nội
  dung, gọi đúng `close()`, xử lý đúng khi người dùng bấm Huỷ
  (`AbortError` không được coi là lỗi thật), và ném lỗi rõ ràng khi
  file JSON hỏng thay vì âm thầm trả về dữ liệu sai. Đã tự kiểm 10
  phép thử qua 1 script riêng — phần TƯƠNG TÁC HỘP THOẠI THẬT (bấm
  "Lưu"/"Mở" có đúng hiện hộp thoại hệ điều hành, quyền truy cập file
  có xin đúng không) vẫn cần người dùng tự thử trên Chrome/Edge thật.

- **P1.14 — Test tự động, MỘT PHẦN.** Suốt dự án tới thời điểm này, mọi
  lần "tự kiểm trước khi gửi" đều là viết script tạm rồi XOÁ NGAY sau
  khi dùng — không có gì tồn tại lâu dài để chạy lại. Bước này dựng
  **bộ test THẬT, nằm trong project, chạy qua `npm test`** — dùng
  `vitest` (chọn vì tích hợp sẵn với Vite đang dùng, nhanh, hiểu
  TypeScript trực tiếp không cần cấu hình thêm). `vitest.config.ts`
  TÁCH RIÊNG khỏi `vite.config.ts` (build production) — `environment:
  "node"`, chỉ nhắm vào LOGIC THUẦN TUÝ, không đụng DOM/Canvas/File
  System Access API thật (những phần đó vẫn tự kiểm bằng
  node-canvas/fake-indexeddb/mock như trước, không phải bộ test
  thường trực — xem lại các mục P2.7h/P1.11/P1.12 phía trên).
  **PHẠM VI CỐ Ý GIỚI HẠN** — 35 test qua 6 file, phủ đúng các phần NỀN
  TẢNG rủi ro cao nhất, KHÔNG PHẢI toàn bộ 37 bước của dự án (viết test
  cho MỌI tính năng là khối lượng không tương xứng effort một lượt):
  di trú schema (mọi phiên bản 0..hiện tại), Command apply/revert/redo
  phổ biến nhất (Add/Delete/Move/UpdateStyle Node), MergeMapCommand
  (chuyển từ script tạm P2.8c thành permanent), roundtrip xuất/nhập
  JSON, và logic Explorer/Minimap.
  **Phát hiện được một lỗi THẬT ngay từ bài test đầu tiên** — giá trị
  cụ thể của việc có bộ test tự động, không phải chỉ lý thuyết: các
  hàm di trú TRUNG GIAN (từ v1→v2 trở đi) không tự bảo vệ nếu dữ liệu
  vào thiếu các trường mảng cấp map/node (`relationships`, `tagIds`...)
  — chỉ hàm ĐẦU TIÊN (v0→v1) có kiểm tra `Array.isArray`. Trên thực tế
  HIẾM xảy ra (mọi file thật luôn đi qua v0→v1 trước khi tới bất kỳ
  bước nào khác), nhưng nếu dữ liệu bị chỉnh tay/hỏng theo đúng cách
  (ví dụ `schemaVersion` không khớp cấu trúc thực của nó), code sẽ
  CRASH ("not iterable") thay vì báo lỗi có kiểm soát. Sửa bằng MỘT
  bước "chuẩn hoá cuối cùng" duy nhất trong `migrateToLatest` (đảm bảo
  mọi mảng quan trọng luôn là mảng thật), thay vì rà soát sửa lại cả
  12 hàm di trú riêng lẻ — điểm sửa hẹp, dễ bảo trì hơn nhiều. Script
  tạm trước đây CHƯA BAO GIỜ phát hiện được lỗ hổng này vì luôn dùng
  dữ liệu do `createEmptyMap()` tạo ra (luôn đúng cấu trúc đầy đủ),
  chưa từng thử với input thô tối giản.
  Đã xác nhận CẨN THẬN file test KHÔNG lẫn vào bundle production dù
  `tsconfig.json`'s `include` bao gồm cả `*.test.ts` (`tsc` trong bước
  build chỉ TYPE-CHECK nhờ có sẵn `noEmit: true`, không sinh file nào;
  `vite build` chỉ đóng gói theo đúng import graph từ `main.ts`, không
  liên quan gì tới test) — kích thước file build GIỮ NGUYÊN y hệt
  trước/sau khi thêm test.
  **Phát hiện thêm (không liên quan trực tiếp P1.14, nhưng lộ ra qua
  `npm audit` khi cài `vitest`)**: thư viện `xlsx` (SheetJS, dùng từ
  P2.6d cho nhập/xuất Excel) có 2 lỗ hổng bảo mật mức CAO đã biết
  (Prototype Pollution, ReDoS) — KHÔNG CÓ bản vá nào từ nhà phát hành
  tại thời điểm này. Đây là rủi ro CÓ TỪ TRƯỚC (không phải do bất kỳ
  thay đổi nào trong lượt này), không sửa được trong phạm vi công việc
  hiện tại (đổi thư viện xlsx là quyết định lớn, ảnh hưởng tính năng
  đã hoạt động ổn định) — ghi lại để người dùng biết, không lờ đi.

- **P1.13 — Tối ưu hiệu năng (Viewport culling).** ĐO TRƯỚC KHI SỬA
  bằng benchmark thật (không đoán mò) — dựng map 1021 node qua
  `node-canvas`, gọi `draw()` 30 lần lấy trung bình: **64.93ms/lần** ở
  chế độ toàn cảnh (tương đương chưa tới 15 FPS — đủ để cảm nhận giật
  khi kéo/pan liên tục). Nguyên nhân xác định rõ ràng: `draw()` vẽ
  TOÀN BỘ cây mỗi lần, không quan tâm phần nào thực sự nằm trong khung
  nhìn.
  Thêm `computeViewportWorldRect()` và `isRectVisibleInViewport()`
  trong `render/geometry.ts` — CỐ Ý trùng lặp một phần công thức với
  `ui/minimapLogic.ts` (đã có từ P2.8b) thay vì import chéo, vì
  `render/` import từ `ui/` sẽ VI PHẠM quy tắc kiến trúc một chiều
  `ui → render → layout → core` của dự án — trùng lặp vài dòng công
  thức đơn giản chấp nhận được hơn nhiều so với phá vỡ ranh giới kiến
  trúc đã giữ vững xuyên suốt dự án.
  Tích hợp vào `drawNodes`/`drawEdges`: chỉ SKIP bước VẼ (đo text, gọi
  API canvas) cho node/đường nối nằm hẳn ngoài khung nhìn (kèm margin
  300 world-units chống hiện tượng "chớp tắt" khi lướt qua mép) —
  **KHÔNG skip việc đệ quy xuống con**, vì một node cha có thể đang ở
  ngoài khung nhìn trong khi cây con của nó trải dài vào bên trong;
  cull theo cả một nhánh dựa trên một node sẽ có nguy cơ ẩn nhầm phần
  con đang hiển thị thật, chỉ an toàn khi xét đúng từng node riêng lẻ.
  ĐO LẠI sau khi sửa, so sánh APPLES-TO-APPLES đúng cùng khung nhìn:
  trường hợp xấu nhất (zoom vừa đủ để toàn bộ 1021 node lọt vào khung
  nhìn cùng lúc, culling không giúp được gì) đi từ 33.26ms xuống
  30.86ms — KHÔNG SUY GIẢM (chênh lệch nằm trong nhiễu đo lường của
  JIT warm-up khi chạy nhiều lần trong cùng một tiến trình Node.js,
  không phải regression thật); trường hợp PHỔ BIẾN hơn nhiều trong
  thực tế (một phần map nằm ngoài khung nhìn — gần như luôn đúng khi
  map đủ lớn) cải thiện từ vài lần tới hàng trăm lần tuỳ mức độ zoom.
  **Đã kiểm tra CẨN THẬN** trước khi tin tưởng thay đổi an toàn:
  `hitTestNode()`/`hitTestCollapsedMarker()` (dùng khi bấm chuột chọn
  node) đều tự tính lại TRỰC TIẾP từ dữ liệu layout đã có sẵn
  (`node.x/y/width/height`), hoàn toàn KHÔNG phụ thuộc việc node đó có
  vừa được vẽ hay không trong lần `draw()` gần nhất — xác nhận viewport
  culling không thể làm hỏng khả năng click/chọn node dù nó đang tạm
  thời không được vẽ. `relInfo`/`summaryInfo` (dữ liệu hình học phục
  vụ hit-test quan hệ chéo/tóm tắt) được tính trong
  `drawRelationships()`/`drawSummaries()` — hai hàm HOÀN TOÀN TÁCH
  BIỆT, không hề bị đụng tới trong thay đổi này.
  Thêm 5 test cho 2 hàm hình học mới (`render/geometry.test.ts`) vào bộ
  test P1.14 — permanent, không phải script tạm. Toàn bộ 40 test cũ
  (bao gồm cả những phần hoàn toàn không liên quan tới rendering) vẫn
  đạt sau thay đổi, xác nhận đây THUẦN TUÝ là tối ưu hiệu năng, không
  ảnh hưởng gì tới tính đúng đắn của bất kỳ chức năng nào khác.

- **P2.9 (tiếp) — Nhập/Xuất XMind.** Người dùng gửi kèm **3 file
  `.xmind` THẬT** trước khi làm — phân tích cấu trúc trực tiếp từ
  chúng (giải nén bằng `unzip`, đọc `content.json` bằng Python) thay
  vì chỉ dựa vào tài liệu công khai (thưa thớt cho định dạng này,
  từng cảnh báo là phần rủi ro cao nhất trong nhóm P2.9). `.xmind` là
  file ZIP chứa `content.json` (mảng "sheet") — dùng `jszip` (dependency
  THẬT, cần lúc chạy — khác `canvas`/`fake-indexeddb` chỉ dùng tạm để tự
  kiểm rồi gỡ) để nén/giải nén trong trình duyệt, không cần backend.
  **Bảng mapping** (đối chiếu qua file thật, không đoán): `title`↔`text`,
  `children.attached`↔`children`, `children.detached`+`position:{x,y}`
  (chỉ xử lý đặc biệt khi gặp ở CẤP ROOT — XMind cho phép detached lồng
  ở topic bất kỳ, nhưng T17Mind chỉ có khái niệm "nhánh trôi" ở cấp cao
  nhất; gặp detached không phải ở root thì gộp vào làm con bình thường,
  mất Ý NGHĨA "tách biệt" nhưng KHÔNG mất dữ liệu)↔nhánh trôi +
  `offsetX/offsetY`, `structureClass`↔`layoutType` (`org.xmind.ui.logic.right`
  xác nhận qua file thật; các structureClass KHÔNG có tương đương như
  timeline/spreadsheet FALLBACK về `logicRight` — GIỮ NGUYÊN cấu trúc
  cây, chỉ đổi hình dáng hiển thị, không mất node nào), `svg:fill`
  (`#RRGGBBAA`, 8 ký tự có kênh alpha) ↔ `fill` (`#RRGGBB`, cắt 2 ký tự
  cuối), `border-line-pattern`↔`borderStyle`, `end1Id/end2Id`↔`fromId/toId`
  cho quan hệ chéo, `labels` gộp thành Tag theo tên (cùng ý tưởng với
  cách `migrate.ts` từng xử lý "labels" cũ của chính T17Mind ở P2.7e).
  MỌI ID từ XMind được REMAP qua `generateId()` — không dùng trực tiếp
  ID gốc của XMind (tránh phụ thuộc định dạng ID riêng của họ).
  **Quy trình tự kiểm chặt chẽ hơn hẳn bình thường, vì đây là phần rủi
  ro cao nhất đã cảnh báo trước:**
  1. Đọc CẢ 3 file thật bằng `parseXmindFile` — cả 3 đều nhập thành
     công, số node hợp lý (157/10/22).
  2. **Đối chiếu ĐỘC LẬP bằng Python** (đếm topic trực tiếp từ
     `content.json` gốc, không qua bất kỳ code TypeScript nào của
     chính dự án) — khớp TUYỆT ĐỐI cả 3 file, không mất/thừa node nào.
  3. Xác nhận `Mo_hinh_HD_Tu_van_-_Xay_lap.xmind` (dùng structureClass
     `org.xmind.ui.timeline.vertical`, không có tương đương) tự nhận
     diện đúng 3 gốc (1 chính + 2 nhánh trôi từ `detached`) và fallback
     đúng về `logicRight`.
  4. **Roundtrip đầy đủ CHÍNH 3 FILE THẬT** (nhập → xuất → đọc lại) —
     khớp đúng số node/gốc/quan hệ chéo ở cả 3 file.
  5. Xác nhận file ZIP xuất ra hợp lệ bằng **Python `zipfile`, độc lập
     hoàn toàn với code JS của dự án** — không chỉ tin tưởng mù quáng
     vào chính công cụ mình viết ra.
  6. Xuất lại roundtrip của CHÍNH 3 file thật, gửi kèm cho người dùng
     tự mở bằng phần mềm XMind thật — đây là bước kiểm chứng DUY NHẤT
     không tự làm được trong sandbox (không có XMind cài sẵn), cần
     người dùng xác nhận.
  14 test permanent trong `io/xmind.test.ts` — dùng dữ liệu TỰ DỰNG mô
  phỏng đúng cấu trúc đã đối chiếu, KHÔNG nhúng trực tiếp nội dung 3
  file thật của người dùng vào mã nguồn (tránh lộ dữ liệu riêng tư vào
  git, và tránh làm phình dự án không cần thiết).
  **Giới hạn đã biết**: chỉ đọc được XMind Zen/2024+ (có `content.json`)
  — XMind cũ hơn chỉ có `content.xml` sẽ báo lỗi rõ ràng, gợi ý mở lại
  bằng XMind rồi lưu để có `content.json`. File nhiều sheet: chỉ nhập
  sheet đầu, báo warning rõ ràng (không âm thầm bỏ mất sheet khác).
  Không giữ được theme/font/hình dạng node đặc thù của XMind (marker,
  hình khối phức tạp) — chỉ giữ cấu trúc/màu nền cơ bản/ghi chú/Tag/
  quan hệ chéo.

- **P1.15 — Đóng gói PWA (Phương án A, theo yêu cầu trực tiếp giữa
  chừng).** Người dùng muốn app "giống file `.exe`" — cân nhắc 2 hướng
  (PWA nhẹ/tận dụng được nhiều vs Electron/Tauri đúng nghĩa đen nhưng
  nặng và cần vòng lặp kiểm tra trên Windows thật mà sandbox không có)
  — chọn PWA trước.
  **Phát hiện quan trọng ngay khi bắt tay, ảnh hưởng lớn tới thiết
  kế**: Web App Manifest và Service Worker — cả 2 API bắt buộc để cài
  đặt/liên kết file — CHỈ hoạt động qua `http://`/`https://`, tuyệt
  đối KHÔNG qua `file://` (giới hạn bảo mật trình duyệt, không lách
  qua được) — mâu thuẫn trực tiếp với cam kết "một file HTML mở trực
  tiếp" đã giữ xuyên suốt dự án từ P1.4. Giải quyết bằng cách TÁCH HẲN
  2 bản build độc lập, không bao giờ trộn lẫn:
  - `vite.config.ts` (cũ, không đổi hành vi) — bản 1-file, `npm run
    build`. Thêm `publicDir: false` — nếu không, Vite MẶC ĐỊNH tự
    copy toàn bộ `public/` (giờ chứa icon/manifest/sw dành RIÊNG cho
    bản PWA) vào `dist/`, âm thầm phá vỡ đúng cam kết "một file duy
    nhất" mà không ai để ý (phát hiện qua tự kiểm, không phải đợi
    người dùng báo).
  - `vite.config.pwa.ts` (mới) — bản nhiều file, `npm run build:pwa`,
    output `dist-pwa/`, entry `index.pwa.html` (bản riêng của
    `index.html`, thêm `<link rel="manifest">`/theme-color — 2 thẻ
    này vô dụng và không nên có ở bản `file://`). Sau build, đổi tên
    `index.pwa.html` thành `index.html` trong thư mục output (để
    server tĩnh mặc định phục vụ đúng khi truy cập `/`).
  `public/manifest.json` — cú pháp `file_handlers` đối chiếu tài liệu
  Chrome for Developers chính thức (không đoán mò một API còn khá
  mới). 3 icon PNG (192/512/maskable-512) tự vẽ bằng `node-canvas`
  (cài tạm, gỡ ngay sau — cùng tinh thần dùng xuyên suốt dự án) — icon
  maskable ĐÚNG chuẩn (phủ kín toàn bộ canvas, không góc bo/viền
  trong suốt, nội dung nằm trong vùng an toàn 80% ở giữa — lần đầu vẽ
  nhầm dùng lại icon thường có góc bo, tự phát hiện và sửa trước khi
  hoàn tất). `public/sw.js` — service worker TỐI GIẢN, mục đích DUY
  NHẤT là thoả điều kiện "có thể cài đặt" của Chrome, cache-first đơn
  giản làm lưới an toàn khi offline chứ không phải chiến lược
  offline-first phức tạp (T17Mind vốn không cần mạng để chạy).
  `ui/pwaLaunch.ts` (`setupPwaLaunchHandling()`) — làm 2 việc, CẢ HAI
  tự kiểm tra API tồn tại trước khi dùng nên AN TOÀN gọi từ `main.ts`
  DÙNG CHUNG cho cả 2 bản build (qua `file://` các API này không tồn
  tại, code tự bỏ qua êm, không cần nhánh if riêng ở nơi gọi): (1)
  đăng ký service worker; (2) tiêu thụ Launch Handler API
  (`window.launchQueue`) khi mở file qua liên kết — TÁI DÙNG ĐÚNG
  luồng nhập đã có (`importJson`/`importXmind` theo đuôi file), không
  viết lại logic parse nào mới. Kiểu `FileSystemFileHandle` cần khai
  báo thêm merge đúng với khai báo đã có từ P1.12, không xung đột.
  `serve-pwa.js` — server tĩnh cục bộ, CHỈ dùng module có sẵn của Node
  (`http`/`fs`/`path`), không cần cài thêm gói, không phụ thuộc mạng
  internet lúc chạy. `start-pwa.bat` — file khởi chạy Windows
  (double-click), tự build lần đầu nếu chưa có, chạy server Ở CHẾ ĐỘ
  NỀN rồi MỚI mở trình duyệt (ban đầu viết ngược thứ tự — mở trình
  duyệt trước khi server kịp lắng nghe sẽ báo lỗi kết nối ở lần tải
  đầu; tự phát hiện và sửa trước khi hoàn tất, không đợi người dùng
  gặp lỗi rồi báo lại).
  Đã tự kiểm: build cả 2 bản thành công; xác nhận `dist/` (bản 1-file)
  CHỈ CÒN đúng một `index.html`, không còn bị lẫn icon/manifest/sw sau
  khi thêm `publicDir: false`; `dist-pwa/` đủ 8 file cần thiết; chạy
  thử `serve-pwa.js` thật, dùng `curl` xác nhận mọi file trả về đúng
  mã 200 VÀ đúng `Content-Type` (đặc biệt `manifest.json` phải là
  `application/json`, không phải mặc định `application/octet-stream`
  mà nhiều server tĩnh đơn giản trả nhầm). 4 test bằng mock
  `window.launchQueue` (không có Chrome PWA thật trong sandbox để thử
  đầy đủ) — phân biệt đúng `.json` gọi `importJson` còn `.xmind` gọi
  `importXmind`, và mở app không kèm file thì không làm gì cả. Toàn
  bộ 54 test cũ + cả 2 bản build vẫn đạt sau thay đổi.
  **Giới hạn thành thật, cần người dùng tự xác nhận trên máy thật**:
  việc CÀI ĐẶT PWA thực sự (bấm nút cài trên thanh địa chỉ Chrome/
  Edge) và việc DOUBLE-CLICK một file `.json`/`.xmind` sau khi cài có
  THỰC SỰ tự mở đúng app hay không — đây là tương tác cấp hệ điều
  hành + trình duyệt thật mà sandbox không có cách nào tự kiểm được,
  khác mọi tính năng trước đó luôn tự kiểm được gần trọn vẹn trước khi
  gửi.

- **P2.9 (tiếp) — Nhập/Xuất OPML.** Định dạng outline XML chuẩn —
  tương thích Workflowy/Dynalist/OmniOutliner và nhiều outliner khác.
  Cùng phạm vi CỐ Ý GIỮ Ở MỨC CỐT LÕI như Markdown/SVG: mỗi node
  thành `<outline text="...">`, ghi chú thành thuộc tính `_note`,
  checkbox hoàn thành thành `_complete="true"/"false"` (2 quy ước này
  không phải phát minh riêng — nhiều outliner phổ biến đã dùng, chọn
  theo đúng quy ước sẵn có để file xuất ra THỰC SỰ tương thích ngược
  với công cụ khác, không chỉ tương thích với chính T17Mind). KHÔNG
  xuất: Tag, màu sắc, link, marker, quan hệ chéo, tóm tắt, khoanh
  vùng, ghi chú dán.
  Dùng `DOMParser` (có sẵn trong mọi trình duyệt) để đọc XML khi nhập
  — không cần thư viện ngoài nào cho việc parse. Để viết ĐƯỢC test
  permanent cho việc này (môi trường test `vitest` mặc định chạy trên
  Node, không có `DOMParser` sẵn), cài thêm `jsdom` như dependency
  THẬT (khác `canvas`/`fake-indexeddb` dùng tạm rồi gỡ — `jsdom` cần
  tồn tại LÂU DÀI vì `opml.test.ts` sẽ chạy mỗi lần `npm test` về
  sau) — chỉ áp dụng môi trường `jsdom` cho ĐÚNG file test này qua
  chú thích `// @vitest-environment jsdom` ở đầu file, KHÔNG đổi môi
  trường chung cho toàn bộ project (giữ `"node"` mặc định nhanh hơn
  cho mọi test khác không cần DOM).
  Nhánh trôi (đa gốc): outline thứ 2 trở đi ở cấp cao nhất trong
  `<body>` trở thành nhánh trôi riêng — cùng cách xử lý đa gốc đã
  nhất quán từ "Ghép thêm JSON" và XMind.
  Đã tự kiểm 10 test — đặc biệt: escape ký tự đặc biệt XML đúng,
  roundtrip giữ đúng cấu trúc phân cấp + ghi chú + checkbox, VÀ **đọc
  được file OPML từ NGUỒN NGOÀI T17Mind** (dùng attribute `title`
  thay vì `text`, không có `_note`/`_complete` — mô phỏng file xuất từ
  một outliner khác, không phải chỉ đọc lại đúng file của chính mình
  — xác nhận khả năng tương thích ngược thực sự, không phải ảo giác
  "tự kiểm bằng chính output của mình nên luôn đúng"), báo lỗi rõ ràng
  với XML sai cú pháp/thiếu `<body>`/không có outline nào.
  Tích hợp `importOpml()`/`exportOpmlFile()` trong `appController`, 2
  nút Toolbar mới. Tổng 64 test qua 9 file. Cả 2 bản build (1-file và
  PWA) đều thành công sau khi thêm, xác nhận không hồi quy gì từ P1.15.

- **P1.16 — Tối ưu bundle (lazy-load), theo yêu cầu rà soát trực tiếp
  trước khi làm PDF.** Người dùng yêu cầu rà soát tổng thể xem còn gì
  tối ưu được — quá trình rà soát phát hiện 2 vấn đề, đây là vấn đề
  ĐẦU (kỹ thuật); vấn đề còn lại (tài liệu README lỗi thời) xử lý ở
  mục sau đây.
  **Đo bằng THỰC NGHIỆM, không đoán mò**: tạm thay lần lượt từng thư
  viện (`xlsx`, `jszip`) bằng một bản "rỗng" (stub) chỉ vài dòng, build
  lại, đo chênh lệch kích thước thật — rồi khôi phục nguyên trạng ngay
  sau khi đo (xác nhận bằng `git status` sạch, không để lại dấu vết).
  Kết quả: lõi app (mọi tính năng UI, không tính 2 thư viện này)
  ~226KB; `xlsx` (chỉ dùng cho Nhập/Xuất XLSX) đóng góp thêm ~430KB;
  `jszip` (chỉ dùng cho Nhập/Xuất XMind) thêm ~102KB — tổng cộng 2 thư
  viện này chiếm **hơn 70%** bundle 759KB trước khi tối ưu, dù phần
  lớn người dùng có thể không bao giờ đụng tới 1 trong 2 tính năng đó.
  **Cách sửa**: đổi 4 phương thức trong `appController`
  (`importXlsx`/`exportXlsx`/`importXmind`/`exportXmindFile`) từ
  `import` TĨNH ở đầu file sang `import("../io/xlsx")`/`import("../io/xmind")`
  ĐỘNG ngay bên trong thân từng hàm — cú pháp chuẩn ES2020, không phải
  kỹ thuật đặc thù dễ vỡ. Vite tự nhận diện dynamic import và tách
  `io/xlsx.ts`/`io/xmind.ts` thành 2 chunk RIÊNG BIỆT, chỉ tải khi hàm
  tương ứng được gọi LẦN ĐẦU — không đổi hành vi chức năng gì, chỉ đổi
  THỜI ĐIỂM nạp module. `exportXlsx()` đổi từ đồng bộ (`void`) sang bất
  đồng bộ (`Promise<void>`) do bản chất `import()` luôn trả về Promise
  — kiểm tra nơi gọi (`Toolbar.svelte`) không `await`/dùng giá trị trả
  về nên tương thích ngược hoàn toàn, không cần sửa UI.
  **Kết quả đo LẠI sau khi sửa (không phải lý thuyết)**: bản PWA giờ
  có ĐÚNG 3 chunk tách biệt như kỳ vọng — chunk chính 228KB (gzip
  68.6KB, giảm **71.7%** so với 242.73KB gzip trước đó), chunk
  `xmind.js` 102KB riêng, chunk `xlsx.js` 429KB riêng, cả hai chỉ được
  trình duyệt tải khi người dùng thực sự bấm nút liên quan lần đầu.
  **Bản 1-file KHÔNG được hưởng lợi ích này** — `vite-plugin-singlefile`
  vẫn gộp toàn bộ (kể cả 2 chunk lazy) vào đúng một file HTML như cũ
  (783KB, gần như không đổi so với 780KB trước) — đây là điều ĐÚNG VÀ
  CẦN THIẾT, không phải thất bại: bản 1-file mở qua `file://` không hề
  có kết nối mạng để tải thêm chunk lúc chạy, nên bản chất không thể
  "lazy" được gì — mọi thứ BẮT BUỘC phải có sẵn ngay trong file đó.
  Toàn bộ 64 test + `npm run check` vẫn sạch sau thay đổi, xác nhận
  logic bên trong `io/xlsx.ts`/`io/xmind.ts` không đổi gì (chỉ đổi
  cách nạp module, không đổi cách chúng hoạt động).

- **Nâng cấp giao diện Toolbar sang kiểu Ribbon (như Office)** — theo
  yêu cầu trực tiếp ("gọn, hiện đại, kiểu ribbon như Office"), thay
  thế hoàn toàn hàng nút phẳng cũ (11 "group" xếp ngang, tràn nhiều
  dòng trên màn hình hẹp) bằng cấu trúc **5 tab** (Trang chủ / Chèn /
  Bố cục / Xuất-Nhập / Xem), mỗi tab chứa vài **cụm nút có nhãn**.
  **Quy trình cố tình chia 2 bước xem trước bằng Artifact HTML ĐỘC
  LẬP** (không phải Svelte thật) trước khi viết vào `Toolbar.svelte`
  — tránh lặp lại bài học từ Fishbone (đoán sai kiến trúc rồi phải
  viết lại thuật toán nhiều lần): Bước 1 chỉ demo khung tab + tab
  "Trang chủ"; sau khi xác nhận, Bước 2 mở rộng đủ 5 tab và tối ưu lại
  theo góp ý "tận dụng không gian" — trộn **1-2 nút LỚN** (icon trên/
  chữ dưới, dành cho hành động dùng nhiều nhất) với **một cột nút NHỎ
  xếp chồng 2-3 dòng** (hành động ít dùng hơn) trong cùng một cụm —
  đúng kỹ thuật nhóm "Clipboard" của Office (1 nút Paste lớn + cột
  Cut/Copy/Format Painter nhỏ cạnh bên) — giúp nhiều hành động phụ
  chung một cụm chỉ chiếm bề ngang bằng một nút, thay vì xếp ngang
  từng nút lớn riêng lẻ.
  **Trước khi viết vào Svelte, xác nhận AN TOÀN tuyệt đối**: không có
  `id` nút nào (40 cái) bị tham chiếu ở nơi khác trong mã nguồn (test,
  DOM query) — chỉ tồn tại trong chính `Toolbar.svelte`; phím tắt xử
  lý độc lập trong `appController.ts` (nghe sự kiện toàn cục, gọi
  thẳng phương thức controller, không phụ thuộc DOM Toolbar) — nên
  đổi cấu trúc HTML không ảnh hưởng gì tới phần còn lại của ứng dụng.
  Toàn bộ phần `<script>` của `Toolbar.svelte` **giữ nguyên y hệt**
  (không đổi một dòng logic/gọi controller nào) — chỉ thêm 2 biến
  trạng thái UI thuần hiển thị (`activeTab`, `ribbonCollapsed`). Đối
  chiếu chính xác bằng `diff` 2 danh sách id (trước/sau khi viết lại)
  xác nhận đủ 40/40 nút gốc có mặt, không thiếu không thừa.
  CSS dùng class đặt tên riêng (`rtab`/`rgroup`/`rbtn`/`rcol`/
  `rbtn-sm`...) — KHÔNG dùng lại `btn`/`group` cũ vì 3 modal khác
  (HelpModal, MapsModal, SidePanel) vẫn dùng nguyên các class đó cho
  nút của họ — xác nhận trước khi sửa để không làm hỏng giao diện nơi
  khác. Giữ đúng bảng màu hiện có (`--accent`, `--panel`... không đổi
  thẩm mỹ tổng thể, chỉ đổi cách sắp xếp/kích thước nút).
  **Giới hạn cách tự kiểm cần biết**: không thể chụp ảnh màn hình
  thật trong sandbox này (thử cài `puppeteer` nhưng tải Chromium bị
  chặn bởi mạng hạn chế của môi trường) — thay vào đó, publish CHÍNH
  bản build thật (không phải ảnh/demo tĩnh) lên Artifact riêng để tự
  xác nhận trực quan kết quả tích hợp trước khi báo cáo hoàn tất.
  `npm run check` sạch hoàn toàn, `npm test` 66/66 đạt không hồi quy,
  cả 2 bản build thành công.

- **P2.10 — Ảnh nhúng (embedded image) + định dạng file nguyên bản
  `.t17m`.** Chèn thêm ngoài kế hoạch gốc, theo hướng đã bàn khi thảo
  luận ý tưởng "dựng kiểu file cài đặt như XMind (có thể portable)" —
  đối chiếu cơ chế thật của XMind (`.xmind` là zip, nhúng ảnh dưới dạng
  file nhị phân thật trong thư mục riêng, không phải base64 trong
  JSON) rồi làm phiên bản tương đương cho chính T17Mind, tái dùng đúng
  kỹ thuật `jszip` đã có sẵn từ `io/xmind.ts` — không thêm phụ thuộc
  mới.
  **Mô hình dữ liệu**: `MindNode.imageAssetId` (con trỏ, `string | null`)
  + `MindMap.assets` (kho ảnh tập trung, `Record<id, ImageAsset>`) —
  ĐÚNG khuôn mẫu đã dùng cho Tag ở P2.7e (node chỉ lưu id, dữ liệu thật
  nằm một chỗ duy nhất, đổi/xoá ảnh không phải sửa từng node). Trong
  bộ nhớ ứng dụng và trong file `.json`/localStorage bình thường, ảnh
  lưu base64 NGAY TRONG `map.assets` (đơn giản nhất, không cần đổi
  cách lưu hiện có). `schemaVersion` lên 15 (`migrateV14toV15`) — file
  cũ tự thêm `assets={}` cấp map và `imageAssetId=null` cho mọi node,
  không crash, không mất dữ liệu.
  **Command riêng, không dùng chung `UpdateNodeStyleCommand`**:
  `SetNodeImageCommand` — vì gắn ảnh còn phải ghi thêm một mục MỚI vào
  `map.assets` (thay đổi CẤP MAP, không chỉ trên node), khác mọi
  thuộc tính khác chỉ nằm gọn trên node. Gỡ ảnh khỏi node (`newAssetId
  = null`) chỉ gỡ con trỏ, KHÔNG xoá dữ liệu ảnh trong `map.assets` —
  hoàn tác thao tác "xoá ảnh" thấy lại ảnh ngay, không cần chọn lại
  file; ngược lại, hoàn tác thao tác "gắn ảnh mới" xoá đúng mục vừa
  thêm, không để lại rác (asset id luôn sinh MỚI cho mỗi lần gắn, không
  bao giờ ghi đè id cũ, nên revert() biết chắc chắn phải xoá đúng gì).
  **`MergeMapCommand` (Ghép thêm JSON, P2.8c) cũng được cập nhật** —
  ảnh nhúng của map nguồn được remap id (KHÔNG gộp trùng như Tag, vì
  ảnh không có "tên" để so khớp) trước khi ghép vào `map.assets` đích,
  tránh đè lên ảnh đã có sẵn nếu 2 file tình cờ trùng id.
  **`io/t17m.ts` (định dạng `.t17m`)**: xuất — mỗi ảnh trong
  `map.assets` được TÁCH thành file nhị phân thật trong `assets/`
  bên trong zip (`content.json` chỉ giữ `mimeType`, `dataBase64` để
  rỗng, tránh lưu trùng lặp cùng dữ liệu nặng 2 lần); nhập — đọc lại
  từng file nhị phân, mã hoá lại base64 để ghép vào `map.assets` trong
  bộ nhớ, sao cho mọi nơi khác trong ứng dụng (render, panel) không
  cần biết file gốc là `.json` hay `.t17m` — luôn một hình dạng dữ
  liệu duy nhất một khi đã nạp vào app. Nút "Mở .t17m"/"Lưu .t17m" đặt
  thành cụm riêng nổi bật trên tab Xuất/Nhập (không gộp chung với
  XLSX/XMind/OPML — đây là định dạng CHÍNH của T17Mind, không phải
  định dạng chuyển đổi sang phần mềm khác); double-click file `.t17m`
  đã liên kết (bản PWA) cũng mở thẳng được, giống `.json`/`.xmind`
  (`manifest.json` cập nhật `file_handlers`).
  **UI chọn/xem/xoá ảnh** đặt trong panel thuộc tính bên phải (ngay
  dưới Hyperlink) — ĐÚNG vị trí mọi thuộc tính-riêng-của-node khác
  (Ghi chú, Hyperlink), không đưa lên Ribbon (khác "Ghi chú dán", một
  đối tượng độc lập trên canvas chứ không phải thuộc tính của node
  đang chọn). Giới hạn 8MB/ảnh — không phải giới hạn kỹ thuật của
  base64, chỉ để tránh vô tình làm map nặng tới mức chậm hẳn khi lưu/
  mở nếu lỡ chọn nhầm ảnh gốc chưa nén. Trên canvas, node có ảnh hiện
  icon 🖼 (cùng phía với 🔗, lùi thêm ra ngoài nếu link cũng có mặt để
  không đè icon) — bấm icon mở hộp thoại xem ảnh cỡ lớn (dùng lại
  đúng khuôn mẫu overlay tự vẽ của `showConfirm`/`showAlert` trong
  `ui/dialog.ts`, không phải `<dialog>`/modal gốc trình duyệt — lý do
  y hệt: chạy đúng ở mọi môi trường nhúng).
  **14 test mới** (tổng 72 → 86): `SetNodeImageCommand` apply/revert/
  redo (bao gồm 2 test khẳng định "gỡ ảnh không xoá dữ liệu, gắn ảnh
  hoàn tác không để lại rác"), `MergeMapCommand` remap ảnh không đè
  ảnh trùng id ở đích + hoàn tác dọn sạch, di trú schema 14→15 (file
  cũ thêm field mặc định đúng + file đã có sẵn field giữ nguyên), và
  round-trip `io/t17m.ts` (bao gồm kiểm tra base64 của ảnh khớp CHÍNH
  XÁC sau một vòng nén/giải nén nhị phân thật bằng `jszip`, không chỉ
  kiểm tra cấu trúc cây). Tự kiểm thêm bằng Playwright trên chính bản
  build thật (`dist/index.html`) — kịch bản: chọn node, gắn ảnh, xác
  nhận icon+thumbnail xuất hiện, mở hộp thoại xem ảnh, Ctrl+Z/Ctrl+Y
  đúng cả 2 chiều, xuất `.t17m` rồi nhập lại NGAY trong giao diện thật
  (không chỉ test đơn vị) — không có lỗi console nào trong suốt kịch
  bản. `npm run check` sạch, `npm test` 86/86, cả 2 bản build thành
  công.

- **P2.11 — Quy luật màu theme vô hạn cấp + tự động tô node mới theo
  theme.** Chèn thêm ngoài kế hoạch gốc, theo yêu cầu trực tiếp hai
  bước: (1) phân tích thuật toán TRƯỚC khi làm ("mỗi bộ theme cần có
  quy luật màu để chọn được màu của node ở xa đến mức vô hạn"); (2) sau
  khi bản build P2.10 giao đi vẫn còn nguyên bug, người dùng yêu cầu
  thẳng "xử lý dứt điểm" — không hỏi thêm, làm theo đúng hướng đã đề
  xuất khi phân tích (tiệm cận mũ + trôi hue + tự động kế thừa lúc tạo
  node).
  **Bug gốc (2 chỗ)**: (a) `ApplyThemeCommand.applyDepthBased` tra
  `theme.levels[Math.min(depth, 3)]` — mọi cấp từ 4 trở đi ĐÔNG CỨNG
  vào ĐÚNG màu cấp 3, cấp 4 và cấp 400 giống hệt nhau; theme Rainbow
  cũng vậy qua `Math.min(0.75, depthInBranch * 0.22)`. (b) Node MỚI TẠO
  (`AddChildCommand`, `CreateFloatingBranchCommand`...) không hề biết
  map đang bật theme nào — luôn `fill`/`color` = `null` (trắng tinh),
  chỉ có "Áp dụng" (tô lại TOÀN BỘ cây một lần) mới ra màu đúng, khiến
  người dùng phải bấm "Áp dụng" lại sau MỖI lần thêm node — đây chính
  là điều người dùng phản ánh "tạo node mới thì không theo màu theme".
  **Thuật toán màu** (`core/theme.ts`, viết lại hoàn toàn, không dùng
  thư viện màu ngoài — tự cài hex↔RGB↔HSL): `colorForDepth(theme, depth)`
  — cấp 0-3 tra `levels[]` y hệt trước (không đổi màu đã quen mắt);
  cấp > 3 chuyển sang HSL, độ sáng tiến tới `L_LIMIT` theo công thức
  tiệm cận mũ `L_LIMIT - (L_LIMIT - l) * rate^stepsBeyond` (không bao
  giờ chạm hẳn, luôn còn khác biệt VỀ MẶT TOÁN HỌC), nếu theme bật
  `hueDrift` (Blue/Pastel) tông màu trôi thêm vài độ mỗi cấp làm dấu
  hiệu phân biệt phụ khi độ sáng đã khó phân biệt bằng mắt — Mono CỐ Ý
  không bật hueDrift (giữ đúng sắc thái trung tính, không biến thành
  màu sắc sặc sỡ). `colorForBranchDepth(hue, depthInBranch)` — công
  thức song song cho Rainbow (cấp 0-3 giữ nguyên `lightenHex` cũ, cấp
  sâu hơn chuyển HSL + trôi hue nhỏ hơn, tránh lấn sang hue của nhánh
  kề bên trong BRANCH_PALETTE). `pickTextColor(fillHex)` — MỘT công
  thức YIQ chuẩn (`(R*299+G*587+B*114)/1000`, ngưỡng 170) thay cho việc
  gán tay màu chữ theo từng mốc cấp — đối chiếu ngược khớp ĐÚNG 100% với
  toàn bộ tổ hợp màu chữ đã hardcode sẵn ở cấp 0-3 của cả 4 theme trước
  khi coi là an toàn để thay thế (xem `theme.test.ts`).
  **Giới hạn thực tế cần biết** (đã nói rõ với người dùng khi phân
  tích, giữ nguyên trong code là một khối chú thích lớn ở đầu
  `theme.ts`): 24-bit hex chỉ biểu diễn hữu hạn màu, "vô hạn cấp" nghĩa
  là CÔNG THỨC không có mốc đông cứng cứng (khác hẳn bug cũ), không
  phải mọi cấp bất kỳ đều còn phân biệt được bằng mắt — thực đo được:
  theme Blue/Pastel còn phân biệt ~55-65 cấp liên tiếp, Rainbow trong
  cùng một nhánh ~85+ cấp (nhờ trôi hue), Mono (không trôi hue, đúng
  chủ đích) ít hơn hẳn — chỉ ~13 cấp — vì thang xám không có "chiều"
  nào khác ngoài độ sáng để phân biệt; tất cả đều HƠN RẤT NHIỀU so với
  bug cũ (đông cứng NGAY LẬP TỨC từ cấp 4).
  **Tự động kế thừa theme khi tạo node mới**: thêm `MindMap.activeThemeId`
  (`string | null`, schema 15→16, `migrateV15toV16`) — ghi lại theme
  đang bật để biết cần tô theo bộ nào. `ApplyThemeCommand` giờ set/revert
  luôn field này (một bước hoàn tác duy nhất, giống các field khác của
  nó). Hàm `computeThemedStyleForNode(map, nodeId, theme)` (dùng CHUNG
  đúng `colorForDepth`/`colorForBranchDepth` với `ApplyThemeCommand` —
  một nguồn công thức DUY NHẤT, đảm bảo "Áp dụng" và node tự tô lúc tạo
  luôn ra ĐÚNG cùng màu ở cùng độ sâu) — đi ngược `parentId` từ node lên
  tận gốc (kể cả gốc của một nhánh trôi) để tính độ sâu và (với Rainbow)
  biết thuộc nhánh cấp-1 nào. Gắn vào: `AddChildCommand` và
  `CreateFloatingBranchCommand` (đúng 2 điểm tạo node MỚI mà người dùng
  phản ánh — chỉ tô ở lần tạo ĐẦU TIÊN, redo sau undo dùng lại y nguyên
  màu đã tính, không tính lại); `PasteSubtreeCommand` — CHỈ tô những
  node có `fill`/`color` đều `null` sau khi dựng từ clip (tức nội dung
  dán từ văn bản thụt lề bên ngoài, chưa từng mang định dạng nào), node
  nào ĐÃ có màu tường minh (sao chép nội bộ một node đã tô tay hoặc đã
  tô theo theme trước đó) được GIỮ NGUYÊN, không bị ghi đè. **Cố tình
  KHÔNG đụng** `DuplicateNodeCommand` (nhân bản = sao chép ĐÚNG định
  dạng gốc, kể cả khi đã tô tay khác theme — ép về theme sẽ phá vỡ kỳ
  vọng "nhân bản giữ y nguyên") và `MergeMapCommand` (ghép map khác vào
  = giữ nguyên màu của map nguồn, không phải "vẽ lại theo theme map
  đích").
  **35 test mới** (tổng 86 → 121, thêm 1 file `theme.test.ts`): toàn bộ
  hàm màu cấp thấp (`colorForDepth`, `colorForBranchDepth`, `pickTextColor`,
  `computeThemedStyleForNode`) cùng `ApplyThemeCommand` (set/revert
  `activeThemeId`, tô đúng cả cấp vượt ngoài 4 mức cố định) và tự động
  kế thừa ở `AddChildCommand`/`CreateFloatingBranchCommand`/
  `PasteSubtreeCommand` (bao gồm test khẳng định KHÔNG đổi hành vi cũ
  khi map chưa bật theme nào, và node dán có màu tường minh KHÔNG bị
  ghi đè). Tự kiểm thêm bằng Playwright trên chính bản build thật
  (`dist/index.html`): áp theme Blue, tạo node con mới bằng phím Tab,
  xuất JSON, đối chiếu ĐÚNG giá trị `fill`/`color` đã lưu khớp
  `colorForDepth(BLUE, 1)` và `activeThemeId` = `"professional-blue"`
  — xác nhận việc sửa hoạt động đúng ngay trong giao diện thật, không
  chỉ ở test đơn vị. `npm run check` sạch, `npm test` 121/121, cả 2 bản
  build thành công.

- **P2.12 — 10 bộ theme mới lấy cảm hứng từ các trào lưu mỹ thuật cổ
  điển lẫn hiện đại.** Theo yêu cầu trực tiếp sau khi P2.11 (thuật toán
  vô hạn cấp) đã ổn — chỉ cần thêm BỘ MÀU mới, không cần đổi gì thêm ở
  cơ chế: mỗi bộ chỉ là một entry mới trong `THEMES` (4 `levels` + cờ
  `hueDrift` tuỳ chọn), tự động thừa hưởng TOÀN BỘ cơ chế đã có từ
  P2.11 (vô hạn cấp, tự tô node mới, `pickTextColor`) mà không cần sửa
  `commands.ts` hay bất kỳ UI nào — Toolbar vốn đã tự render dropdown
  theo đúng danh sách `THEMES`.
  **4 bộ cổ điển**: Phục Hưng (`renaissance` — đỏ mận sẫm, nâu vàng cổ,
  kem ngà), Baroque (`baroque` — tương phản sáng-tối mạnh, nâu đen sâu +
  điểm nhấn vàng kim), Ukiyo-e (`ukiyo-e` — tranh khắc gỗ Nhật Bản, chàm
  indigo ngả dần sang ấm), Ấn Tượng (`impressionism` — sắc lam-tím dịu
  kiểu Monet, ranh giới màu nhoè).
  **6 bộ hiện đại**: Bauhaus (`bauhaus` — hình khối rõ ràng, đỏ/vàng/lam
  trên nền đen), Art Deco (`art-deco` — đen/vàng kim/lục bảo, sang
  trọng đối xứng), Kiến Tạo (`constructivism` — đỏ-đen-trắng ngà, đồ
  hoạ cổ động Xô Viết), Memphis (`memphis` — hồng cánh sen/ngọc lam/vàng
  mù tạt, va chạm màu cố ý thập niên 1980), Bắc Âu (`scandinavian` —
  xám than/be ấm/trắng ngà, tối giản điềm tĩnh), Vaporwave (`vaporwave`
  — tím than hoàng hôn + hồng/lam neon, thẩm mỹ số hoá đương đại).
  `hueDrift` bật cho trào lưu chuộng biến chuyển sắc độ mềm mại (Phục
  Hưng, Baroque, Ukiyo-e, Ấn Tượng, Bauhaus, Memphis, Vaporwave), tắt
  cho trào lưu chuộng kỷ luật một bộ màu cố định không pha trộn (Art
  Deco, Kiến Tạo, Bắc Âu) — cùng nguyên tắc đã áp dụng cho Mono ở
  P2.11.
  **3 test mới** (tổng 121 → 124): tổng số theme đúng 14 (4 gốc + 10
  mới) và id không trùng nhau, mọi theme không phải `perBranch` đều có
  đúng 4 `levels` hợp lệ (hex hợp lệ), đủ mặt 10 id mới đã đặt. Không
  cần viết thêm gì cho `pickTextColor` — bài test đã có từ P2.11 (đối
  chiếu MỌI `theme.levels` trong `THEMES` với chính công thức YIQ) tự
  động phủ luôn cả 40 tổ hợp fill/color mới, bắt được ngay nếu có màu
  chữ nào chọn sai. Tự kiểm bằng Playwright trên bản build thật: áp lần
  lượt cả 10 theme mới cho một cây 2-3 cấp, chụp ảnh xác nhận từng bộ
  hiện đúng màu như mô tả, dropdown hiện đủ 14 theme, không có lỗi
  console nào. `npm run check` sạch, `npm test` 124/124, cả 2 bản build
  thành công.

- **P2.13 — Zoom giữ node "neo" luôn trong khung hình.** Theo yêu cầu
  trực tiếp sau khi dùng bản P2.12 trên map thật (~100 node): "lúc zoom
  thì cần map trong khung hình khả kiến thay vì nó trôi ra ngoài khung
  hình". Cơ chế zoom lấy con trỏ làm tâm (giữ nguyên điểm world dưới
  con trỏ) vẫn giữ nguyên như cũ — nhưng sau mỗi bước phóng to/thu nhỏ
  bằng lăn chuột (`onWheel` trong `appController.ts`), thêm một bước
  dịch khung nhìn TỐI THIỂU để đảm bảo "node neo" luôn nằm trọn trong
  canvas, theo ĐÚNG 3 mức ưu tiên đã yêu cầu:
  1. **Active node** (`selection.primary`) nếu đang có node được chọn —
     ưu tiên cao nhất vì người dùng rõ ràng đang thao tác quanh node đó.
  2. Nếu không có active node: **node gần con trỏ chuột nhất** trong
     bán kính `ZOOM_ANCHOR_NEAR_CURSOR_PX = 260px` (tính trên màn hình)
     — đủ gần thì hợp lý coi đó là nơi người dùng đang nhắm tới.
  3. Nếu không thoả cả hai điều trên (không chọn gì VÀ con trỏ cách xa
     mọi node) thì lấy **node gốc** (`map.rootId`) làm neo.
  Về mặt code: tách logic "dịch tối thiểu để đưa 1 node vào khung hình,
  chừa margin quanh mép" (vốn có sẵn cho phím mũi tên/Home) ra một hàm
  thuần `computeScrollIntoViewDelta(nodeId)` dùng chung — `scrollIntoView`
  cũ giờ chỉ gọi lại hàm này rồi tự vẽ, còn `onWheel` gọi trực tiếp để áp
  `dx/dy` NGAY trong cùng một lượt vẽ (không vẽ lại 2 lần). Hàm mới
  `resolveZoomAnchorNodeId(screenX, screenY)` chọn node neo theo đúng 3
  mức trên. Không đổi hành vi zoom-lấy-con-trỏ-làm-tâm đã có — đây chỉ
  là một bước "kéo nhẹ về" áp thêm SAU đó, nên cảm giác zoom cũ (điểm
  dưới con trỏ đứng yên) vẫn giữ nguyên, chỉ khác là node neo không bao
  giờ bị đẩy hẳn ra ngoài nữa.
  Không cần test đơn vị mới (logic nằm trong `appController.ts`, lớp UI
  gắn với canvas thật — theo đúng kiến trúc dự án, lớp này được kiểm
  chứng bằng Playwright trên bản build thật, không phải `vitest`), nên
  tổng vẫn 124/124 test qua như P2.12. Tự kiểm bằng Playwright trên
  `dist/index.html` với map 42 node (1 gốc → "công trình" → 40 nhánh
  con toả ra): (a) không chọn node nào, đưa con trỏ vào góc màn hình
  trống rồi phóng to liên tục tới 300% — node gốc vẫn hiện TRỌN VẸN dù
  con trỏ ở góc đối diện, đáng lẽ sẽ kéo node gốc ra khỏi khung hình nếu
  không có cơ chế neo; (b) chọn một node ở rìa xa ("Vùng 9"), phóng to
  với con trỏ đặt ở một góc hoàn toàn khác — đúng node "Vùng 9" đó (chứ
  không phải gốc hay node theo con trỏ) vẫn hiện trọn vẹn suốt quá
  trình zoom tới 300%. `npm run check` sạch, `npm test` 124/124, cả 2
  bản build thành công.
  **Về lỗi "đường kết nối nhánh biến mất khi zoom tới 1 mức độ nào đó"
  được báo cùng lúc**: lúc này CHƯA tái hiện được (đã thử trên map thật
  ~200 node lẫn map tổng hợp 42 node xuyên suốt 25%–300%) — xem mục
  "Task #7" trong phần "Sửa lỗi sau khi hoàn thành" bên dưới để biết
  nguyên nhân thật sự và cách đã sửa (tìm ra ở một phiên làm việc sau,
  nhờ người dùng gửi kèm file map thật đang lỗi).

- **P2.14 — Nút "Sắp xếp lại" (auto-arrange).** Theo yêu cầu trực tiếp:
  "khi người dùng điều chỉnh vị trí node quá nhiều dẫn tới khó nhận
  diện được hình dạng map nữa" — cần một nút tự động dọn lại, tương tự
  "auto arrange" ở các phần mềm sơ đồ khác. Đặt tên "Sắp xếp lại" (icon
  🪄 — cây đũa phép, ẩn dụ phổ biến cho thao tác "tự động sửa gọn giúp
  tôi" ở nhiều ứng dụng khác, phân biệt rõ với các icon đã dùng: 🎨 cho
  theme, 🌿 cho đường nối tự nhiên).
  Cơ chế: mỗi node giữ một `offsetX/offsetY` — độ lệch THỦ CÔNG so với
  vị trí `baseX/baseY` do thuật toán bố cục tính ra (xem
  `layout/index.ts#applyAllOffsets`); kéo tay một node chỉ đổi
  offset của node đó (và cộng dồn xuống mọi con cháu, "kéo cả nhánh đi
  theo"). Nút mới thêm hàm thuần tuý
  `getAutoArrangeTargetIds(map, selectedIds)` (`core/tree.ts`) xác định
  đúng những node cần đưa offset về lại 0 — CHỦ Ý LOẠI TRỪ offset của
  CHÍNH mọi node gốc (`map.rootId` + gốc mỗi nhánh trôi), vì đó là VỊ
  TRÍ NEO của cả nhánh trên canvas vô hạn (nơi người dùng chủ động đặt
  nhánh trôi), không phải một phần "hình dạng" cần dọn — reset nó sẽ
  khiến mọi nhánh trôi dồn hết về một điểm, xoá mất công sắp xếp tổng
  thể, ngược hẳn mục đích của nút. Phạm vi: có chọn node/nhánh cụ thể
  (khác một mình node gốc chính) thì chỉ dọn (các) nhánh đó + toàn bộ
  hậu duệ (kể cả đang thu gọn); không chọn gì, hoặc chỉ đang chọn đúng
  một mình node gốc chính (trạng thái mặc định) thì dọn TOÀN BỘ map.
  `AppController.autoArrange()` gộp mọi `SetNodeOffsetCommand(id, {x:0,
  y:0})` cần thiết thành đúng 1 `CompositeCommand` (1 bước hoàn tác
  duy nhất dù dọn cả trăm node); `canAutoArrange()` tự vô hiệu hoá nút
  khi không có gì để dọn (mọi offset trong phạm vi đã là 0,0 sẵn).
  **5 test mới** (`core/tree.test.ts`, tổng 124 → 129): không chọn gì
  dọn toàn bộ map nhưng luôn chừa lại mọi node gốc; chỉ chọn một mình
  gốc chính coi như không chọn gì; chọn 1 node cụ thể chỉ dọn đúng
  nhánh đó; chọn gốc một nhánh trôi chỉ dọn bên trong nhánh đó, giữ
  nguyên vị trí neo; phạm vi đã sạch sẵn thì trả về rỗng. Tự kiểm bằng
  Playwright trên bản build thật: thêm 1 node con, kéo lệch nó ra xa
  (nút bật enabled đúng lúc), bấm "Sắp xếp lại" (node bật lại đúng vị
  trí, nút tự vô hiệu hoá lại), Ctrl+Z hoàn tác đúng 1 bước (node quay
  lại chỗ vừa kéo, nút bật enabled trở lại) — cả 4 bước đều đúng như
  kỳ vọng. `npm run check` sạch, `npm test` 129/129, cả 2 bản build
  thành công.

- **P2.15 — Viết lại toàn bộ Toolbar: bỏ ribbon nhiều tab, gộp thành 1
  thanh công cụ, tham khảo thiết kế app T17 Timeline.** Theo yêu cầu
  trực tiếp: "số lượng công cụ chưa nhiều, việc làm ribbon tốn thời
  gian thao tác — bố trí lại toàn bộ ra 1 thanh, cách bố trí phải khoa
  học hợp lý, thiết kế phong cách hiện đại, hơi tối giản, tham khảo
  thanh công cụ app Timeline, có thể làm nó tương đối nhất quán về ngôn
  ngữ thiết kế với app Timeline do cùng 1 dòng T17". Bỏ hẳn ribbon 5
  tab (Trang chủ/Chèn/Bố cục/Xuất-Nhập/Xem) phải bấm chuyển qua lại của
  P2.1 — thay bằng **1 khối 2 hàng LUÔN HIỂN THỊ ĐẦY ĐỦ**, không còn
  gì phải bấm tab mới thấy:
  - **Hàng 1** (nền trắng — "khu thương hiệu/tệp", giống hàng trên cùng
    của Timeline): thương hiệu 🧠 T17Mind, nút chính ➕ Nhánh con (xanh
    đặc, nổi bật — giống "+ Note mới" của Timeline), Tìm kiếm/Map gần
    đây, 3 menu thả xuống **Tệp ▾ / Nhập ▾ / Xuất ▾** (mỗi menu gộp
    3–7 nút cũ lại thành 1 nút — ĐÚNG kỹ thuật Timeline dùng cho
    "Dữ liệu ▾" để gộp nhiều thao tác dữ liệu ít-dùng-hơn), cụm icon
    vuông 🧭 Explorer / 🗺 Minimap / ❓ Trợ giúp bên phải (giống cụm
    icon phải cùng — split-view/fullscreen/"?" — của Timeline).
  - **Hàng 2** (nền hơi xám `--row2-bg` — "khu công cụ theo ngữ cảnh
    đang làm việc", giống hàng điều khiển thứ 2 của Timeline): ↺/↻
    Hoàn tác-Làm lại, ⛶ Vừa khung / 🏠 Về gốc, chọn Bố cục, **🪄 Sắp
    xếp lại (P2.14, mới)**, 🌿 Tự nhiên, chọn Theme + Áp dụng, các thao
    tác Chèn (Ghi chú/Liên kết/Tóm tắt/Khoanh vùng), các thao tác Cấu
    trúc (Sao chép/Nhân bản/Định dạng/Nhánh trôi/Tách nhánh/Xoá), và
    menu thả xuống **Hiển thị ▾** ở cuối hàng (gộp 3 công tắc ẩn/hiện
    thành 1 nút, dạng checkbox ☐/☑ — không tự đóng khi bật/tắt, để bật
    nhiều mục liên tiếp trong 1 lần mở, khác 3 menu hành động kia luôn
    tự đóng sau khi chọn 1 mục).
  Nút dạng "viên thuốc" bo tròn, icon+chữ NẰM NGANG (khác hẳn kiểu
  icon-trên-chữ-dưới cồng kềnh của ribbon cũ), viền mảnh, primary xanh
  đặc, menu thả xuống có bóng đổ nổi lên trên canvas — đúng ngôn ngữ
  thiết kế phẳng, nhỏ gọn của Timeline. Class CSS đặt tên riêng
  (`tbar-*`/`menu-*`), không đụng `button.btn` của 3 modal khác.
  Gộp "Hướng dẫn định dạng file" (HelpModal — tài liệu JSON schema) vào
  cuối menu Nhập ▾ (đúng chỗ dùng: đang xem các lựa chọn nhập file thì
  tiện tra luôn định dạng); tách hẳn bảng phím tắt đầy đủ (mở bằng phím
  `?`, module `ui/shortcutsModal.ts` có sẵn từ trước nhưng trước đó
  KHÔNG có nút bấm nào, chỉ có dòng chữ gợi ý) ra nút ❓ riêng ở góc
  phải hàng 1 — vừa dễ tìm hơn, vừa không cần dòng "hint" dài chiếm chỗ
  ngang hàng ribbon cũ nữa.
  **2 lỗi thật bắt được bằng Playwright ngay trong lúc làm** (không
  phải đoán suông — chụp ảnh thấy nút "sáng đúng trạng thái đang mở"
  nhưng panel không hề xuất hiện):
  1. `.menu-panel` ban đầu dùng `position: absolute` neo theo
     `.menu-wrap` — nhưng hàng chứa nó (`.tbar-row`) cần
     `overflow-x: auto` để cuộn ngang lúc tràn (nhiều nút hơn bề ngang
     màn hình), mà theo đúng quy tắc CSS, hễ `overflow-x` khác
     `visible` thì `overflow-y` cũng tự động bị ép thành `auto` —
     khiến mọi panel absolute bên trong bị CẮT MẤT theo chiều dọc,
     không cách nào thấy được dù state đã đúng. Sửa bằng cách chuyển
     `.menu-panel` sang `position: fixed`, tự tính `top/left` bằng
     `getBoundingClientRect()` của nút vừa bấm ngay trong `toggleMenu()`
     (kèm kẹp `left` trong khung nhìn cho menu Hiển thị đứng cuối hàng,
     dễ tràn mép phải màn hình hẹp) — không còn phụ thuộc overflow của
     bất kỳ tổ tiên nào.
  2. Đã THỬ thêm `window.addEventListener("scroll", ..., true)` để tự
     đóng menu nếu người dùng cuộn ngang `.tbar-row` trong lúc menu
     đang mở (tránh toạ độ fixed bị lệch khỏi nút) — nhưng BỎ LẠI ngay
     vì bắt được lỗi nghiêm trọng hơn nhiều: bấm một nút mở menu đang
     nằm NGOÀI vùng nhìn thấy của hàng cuộn ngang (ví dụ nút Hiển thị ở
     cuối hàng 2 trên màn hình hẹp) khiến trình duyệt tự cuộn nút đó
     vào khung nhìn NGAY TRONG LÚC xử lý cú click — sự kiện `scroll` đó
     (bắt được nhờ `capture:true`) đóng menu NGAY LẬP TỨC, y hệt như
     chưa từng mở được. Rủi ro nhỏ còn lại (menu lệch vị trí nếu chủ
     động cuộn hàng trong lúc menu đang mở) chấp nhận được hơn hẳn so
     với "một số nút không mở menu được" — chỉ còn đóng bằng bấm ra
     ngoài hoặc phím Esc.
  **1 lỗi có thật, PHÁT HIỆN TÌNH CỜ khi kiểm thử (KHÔNG liên quan gì
  tới toolbar) cũng tiện sửa luôn**: `cancelInlineEdit()` (dùng chung
  cho mọi ô sửa tên node/nhãn tại chỗ, `ui/editingInput.ts`) đặt
  `activeElement = null` SAU KHI gọi `.remove()` — nhưng remove() một
  phần tử ĐANG CÓ FOCUS khiến trình duyệt tự bắn sự kiện `blur` NGAY
  LẬP TỨC (đồng bộ, trong chính lệnh gọi `.remove()`), kích hoạt lại
  `commit()` trong lúc `activeElement` vẫn còn trỏ tới phần tử đang bị
  remove dở → gọi `cancelInlineEdit()` lần hai trên cùng phần tử → lỗi
  thật "Failed to execute 'remove' on 'Element': The node to be removed
  is no longer a child of this node." Tái hiện được bằng chuỗi thao tác
  RẤT BÌNH THƯỜNG (bấm Tab thêm nhánh con rồi bấm Escape ngay để giữ
  tên mặc định "Ý mới") — nghĩa là người dùng thật, không chỉ kịch bản
  test, cũng gặp lỗi này trước P2.15. Sửa bằng cách đảo thứ tự: đặt
  `activeElement = null` TRƯỚC khi `.remove()`, để `commit()` (chạy do
  blur đồng bộ) nhận ra "đã bị huỷ rồi" và tự return sớm.
  **Không có test đơn vị mới cho phần trình bày** (logic thuần UI/DOM,
  không đo được bằng `vitest` theo đúng kiến trúc dự án — lớp UI được
  kiểm chứng bằng Playwright trên bản build thật, xem `core/tree.test.ts`
  ở mục P2.14 phía trên cho phần LOGIC đo được). Tự kiểm bằng Playwright
  trên `dist/index.html`: mở/đóng cả 4 menu thả xuống (Tệp/Nhập/Xuất/
  Hiển thị) đúng vị trí không còn bị cắt; bấm ra ngoài tự đóng; bấm Esc
  tự đóng; toggle 1 mục trong menu Hiển thị KHÔNG tự đóng (bật được
  nhiều mục liên tiếp); nút ❓ mở đúng bảng phím tắt; icon Explorer mở
  đúng panel Explorer; toàn bộ nút cũ (Hoàn tác/Xoá/Theme/Bố cục...)
  vẫn gọi đúng y hệt hành động cũ, không đổi hành vi nghiệp vụ nào,
  chỉ đổi cách trình bày. `npm run check` sạch, `npm test` 129/129, cả
  2 bản build thành công.

- **P2.16 — Toolbar: đổi TOÀN BỘ icon emoji nhiều màu sang bộ icon SVG
  đơn sắc, bảng màu tương đồng T17 Timeline.** Theo yêu cầu trực tiếp
  (kèm ảnh chụp toolbar Timeline): "màu sắc toolbar tương đồng với T17
  Timeline, các nút cũng trông hiện đại, phong cách thiết kế nút hiện
  đại, ít màu mè". Bản P2.15 tuy đã đúng BỐ CỤC kiểu Timeline (1 khối
  2 hàng, menu thả xuống gộp nhóm...) nhưng vẫn "màu mè" vì lý do không
  thể sửa bằng CSS: mọi icon trước đó là EMOJI (🔍📁⬇⬆🧭🗺❓🪄🌿🎨📝🔗📊
  🧩📋🖼✂🗑☁🖌...) — emoji có màu CỐ ĐỊNH do hệ điều hành/font quyết định
  (📁 luôn vàng, 🌿 luôn xanh lá, 🎨 luôn nhiều màu...), hoàn toàn không
  đổi được bằng thuộc tính CSS `color` như chữ thường, nên thanh công cụ
  luôn rực rỡ nhiều tông màu bất kể CSS nút viết "tối giản" cỡ nào.
  **Giải pháp**: viết hẳn một bộ ~30 icon SVG dạng line-icon (stroke,
  không fill, `viewBox 0 0 20 20`, cùng độ dày nét 1.6, cùng bo góc) ở
  `ui/icons.ts` (mỗi icon chỉ là chuỗi markup path/rect/circle/line cơ
  bản, KHÔNG chép path phức tạp từ trí nhớ để tránh hình méo — tự kiểm
  lại từng icon bằng ảnh chụp Playwright phóng to sau khi viết), cùng
  một component dùng chung `ui/components/Icon.svelte` bọc khung `<svg
  stroke="currentColor">` — mấu chốt là `currentColor`: icon tự động ăn
  ĐÚNG màu chữ hiện tại của nút cha (xám lúc thường, xanh khi active, đỏ
  khi danger, trắng khi ở trên nút primary xanh đặc), không lệch tông
  bao giờ, khác hẳn emoji cố định màu trước đó. 2 icon dạng ký tự thuần
  VỐN ĐÃ đơn sắc (`{ }` cho Tóm tắt, `▭` cho Khoanh vùng) được giữ
  nguyên dạng chữ, không cần vẽ lại.
  Đồng thời viết lại bảng màu tương tác của toolbar: TRƯỚC ĐÂY mọi nút
  hover đều đổi sang viền+nền xanh (`--accent`), khiến cả thanh nhấp
  nháy xanh liên tục khi rê chuột qua — dù mỗi lúc chỉ 1 nút hover,
  cảm giác tổng thể vẫn "màu mè". Giờ hover mặc định chỉ đổi nền xám
  nhạt trung tính (`--neutral-hover`, token mới), CHỈ giữ lại màu xanh
  ở đúng 2 chỗ có Ý NGHĨA thật: nút hành động chính ("+ Nhánh con") và
  trạng thái đang bật/đang mở (active/menu-open) — đúng cách Timeline
  dùng màu (một tông xám xuyên suốt, xanh chỉ để NHẤN đúng chỗ). Thêm
  logo nhỏ: ô vuông xanh 22×22 chứa icon "3 node nối nhau" (ẩn dụ
  mindmap, thay 🧠) đứng trước chữ "T17Mind", giống mẫu logo khối-vuông-
  xanh-trước-tên-app của Timeline — ĐÚNG 1 chỗ dùng màu ngoài phạm vi
  primary/active vì đây là bản sắc thương hiệu, không phải trang trí.
  Cụm icon-vuông Explorer/Minimap/Trợ giúp cuối hàng 1 được thêm biến
  thể `.chip` (nền xám nhạt `--chip-bg` LUÔN HIỆN kể cả lúc không
  hover) — đúng y hệt cụm 3 icon-vuông bên phải cùng của Timeline (khác
  cặp Hoàn tác/Làm lại ở hàng 2, giữ nền trong suốt lúc thường như cũ).
  Bỏ luôn icon 🔀/🎨 lặp lại trước mỗi `<option>` trong 2 select (Bố cục/
  Theme) — `<select>` gốc HTML không tô màu được icon nên chỉ giữ lại
  chữ, gọn và nhất quán hơn.
  **Không có test đơn vị mới** (thuần thay đổi trình bày UI/SVG, không
  đụng logic — đúng kiến trúc dự án, lớp UI kiểm chứng bằng Playwright
  trên bản build thật). Tự kiểm bằng Playwright, chụp phóng to từng
  icon (bao gồm cả icon trong 4 menu thả xuống Tệp/Nhập/Xuất/Hiển thị
  và icon "Sắp xếp lại" lúc đang enabled) để soi hình dạng không bị méo/
  vỡ; xác nhận lại toàn bộ hành vi tương tác CŨ vẫn nguyên vẹn (3 menu
  hành động mở/đóng đúng, menu Hiển thị không tự đóng khi toggle, nút
  Sắp xếp lại vẫn bật/tắt/chạy đúng theo đúng chu trình đã kiểm ở
  P2.14) — không có lỗi JS mới phát sinh. `npm run check` sạch,
  `npm test` vẫn 129/129, cả 2 bản build thành công.

## Sửa lỗi sau khi hoàn thành (phát hiện qua kiểm thử thực tế)

- **Minimap: vị trí "bám trục ngang", không kéo Y được** — người dùng
  báo sau khi kiểm thử P2.8b. Nguyên nhân: hàm xử lý kéo di chuyển vị
  trí tính giới hạn kéo từ `panelEl.parentElement`
  (`#minimap-panel-root`) — một `<div>` RỖNG, con duy nhất của nó là
  `position: absolute` nên KHÔNG đóng góp gì vào chiều cao của div cha
  (đặc tính CSS bình thường của absolute positioning, không phải lỗi
  trình duyệt) — `mainRect.height` gần như luôn ≈ 0, khiến
  `maxY = 0 - HEADER_HEIGHT` ra số ÂM, và
  `Math.max(0, Math.min(số ÂM, ...))` LUÔN LUÔN cho ra đúng 0 — toạ độ
  Y bị kẹp cứng về 0 bất kể kéo bao nhiêu, chỉ X di chuyển tự do được.
  Sửa dùng ĐÚNG `byId("main")` (khung có kích thước thật) — giống hệt
  công thức `onMount()` đã dùng để tính vị trí mặc định, tránh 2 nơi
  tính theo 2 công thức khác nhau (đây chính là nguồn gốc lỗi — nếu
  viết chung MỘT chỗ ngay từ đầu, lỗi này không có cơ hội xảy ra).
- **Minimap: hình dạng không khớp với canvas** — Minimap ban đầu LUÔN
  vẽ toàn bộ node bất kể đang thu gọn gì trên canvas, khiến hình dạng
  không phản ánh đúng những gì người dùng thực sự đang xem. Thêm công
  tắc **Đồng bộ / Độc lập** giống Explorer: "Đồng bộ" chỉ vẽ đúng node
  ĐANG HIỂN THỊ THẬT (tôn trọng `node.collapsed`, dùng lại
  `collectVisibleNodeIds` đã có sẵn — không viết lại logic duyệt cây),
  "Độc lập" LUÔN vẽ toàn bộ bất kể thu gọn gì — đúng mặc định "luôn
  bung hết" theo yêu cầu (khác Explorer, "độc lập" của Minimap không
  cần theo dõi trạng thái mở/đóng riêng từng node vì Minimap không có
  thao tác thu gọn/mở lẻ từng node). Đổi chữ ký `computeMinimapGeometry`
  nhận mảng node ĐÃ LỌC SẴN thay vì cả `MindMap`, để tính tỷ lệ zoom
  đúng theo ĐÚNG những gì đang hiển thị (không bị ảnh hưởng bởi phần
  đang ẩn khi ở chế độ Đồng bộ). Đã tự kiểm 7 phép thử — đặc biệt tình
  huống thực tế (nhánh thu gọn, con nằm rất xa) xác nhận 2 chế độ cho
  ra số lượng node VÀ tỷ lệ zoom khác biệt rõ rệt, đúng ý nghĩa.

- **Sao chép định dạng bỏ sót thuộc tính mới** — `extractFormatPatch`
  viết lần đầu ở P2.6, nhưng khi P2.6b-1/P2.6c thêm cỡ chữ/font/căn lề/
  độ trong suốt vào node thì hàm này không được cập nhật theo, nên
  "sao chép định dạng" âm thầm bỏ sót 5 trường đó. Người dùng phát hiện
  qua so sánh thực tế (copy từ node có độ mờ đặc biệt thì không ăn,
  copy từ node thường thì "ăn" — vì thứ duy nhất khác biệt chính là thứ
  bị bỏ sót). Đã bổ sung đủ cả 5 trường.
- **Ô "Font chữ" bắt gõ tự do, dễ gõ sai** — đổi từ `<input>` tự do sang
  danh mục xổ xuống gồm các font phổ biến có sẵn trên Windows và hiển
  thị đúng dấu tiếng Việt (Arial, Times New Roman, Calibri, Cambria,
  Georgia, Tahoma, Verdana, Segoe UI, Consolas), kèm tuỳ chọn "Khác" mở
  ra ô gõ tự do cho ai thật sự cần font ngoài danh mục.
- **Chế độ "Tự co chữ" (`textFit="shrink"`) không có bước cắt chữ dự
  phòng** — khi chữ quá dài so với khung quá hẹp, thuật toán co cỡ chữ
  xuống mức tối thiểu (9px) nhưng vẫn không đủ để vừa (một giới hạn
  toán học thật, không phải lỗi thuật toán co — 34 ký tự không thể vừa
  khung 58px dù nhỏ tới đâu mà còn đọc được), và trước đây không có gì
  xử lý tiếp theo, khiến chữ vẽ tràn ra ngoài không kiểm soát. Đã tự
  cài `canvas` (node-canvas) TẠM THỜI để đo chính xác bằng Canvas 2D
  thật thay vì đoán — phát hiện `-apple-system, Segoe UI` không phân
  giải được trên Linux nên phải đo lại bằng `sans-serif` mới ra số
  liệu đáng tin cậy. Thêm `truncateToFit` (dò nhị phân tìm số ký tự
  dài nhất mà "phần đó + …" còn vừa khung) làm bước dự phòng sau khi
  co hết cỡ vẫn chưa đủ. Đã gỡ `canvas` khỏi devDependencies ngay sau
  khi xong — chỉ cần tạm thời để gỡ lỗi, app thật chạy trên trình
  duyệt đã có sẵn Canvas API, không cần gói này.

- **Task #7 — Đường nối cha-con biến mất hoàn toàn ở một số mức zoom/vị
  trí pan, dù node vẫn hiện đầy đủ (đã tìm ra nguyên nhân thật sự).**
  Người dùng báo lại 2 lần (từng thấy ở zoom ~204%, sau đó lại thấy ở
  zoom ~159% với gợi ý quan trọng: "đường Liên kết [Relationship] thì
  không mất"). Phiên làm việc trước ĐÃ THỬ rà soát và tái hiện bằng
  Playwright trên nhiều map tổng hợp nhưng KHÔNG tái hiện được, vì mọi
  map tự tạo trước đó đều có `offsetX/offsetY ≈ 0` (không có node nào bị
  kéo tay lệch xa) — thiếu đúng điều kiện thật sự gây lỗi. Người dùng
  gửi kèm file map thật đang lỗi (103 node, nhiều node bị kéo tay lệch
  hàng trăm/nghìn đơn vị so với vị trí thuật toán tính ra) cùng ảnh chụp
  màn hình thật, đủ để soi ra nguyên nhân bằng cách đọc lại đúng vòng
  lặp vẽ đường nối:
  ```ts
  // CanvasRenderer.ts — drawEdges(), BẢN CŨ (có lỗi)
  for (const childId of node.children) {
    ...
    if (!isRectVisibleInViewport(boundingBox, this.cullViewportRect, CULL_MARGIN)) continue; // ①
    ... // vẽ đường nối cha → childId
    this.drawEdges(map, childId); // ② đệ quy xuống NHÁNH CON của childId
  }
  ```
  `continue` ở ① nhảy thẳng sang PHẦN TỬ TIẾP THEO của vòng lặp `for`
  — nghĩa là bỏ qua LUÔN cả dòng ② (đệ quy tiếp xuống con của `childId`),
  vì ② nằm SAU ① trong CÙNG một lượt lặp. Hậu quả: hễ đúng đoạn nối
  cha→`childId` (chỉ MỘT đoạn, ngay sát gốc của một nhánh) có bounding
  box không giao với khung nhìn hiện tại — rất dễ xảy ra khi `childId`
  đã bị kéo tay lệch xa vị trí thuật toán tính ra, hoặc đơn giản chỉ vì
  người dùng đang zoom sâu vào một góc xa gốc — thì TOÀN BỘ đường nối
  của MỌI node cháu, chắt... bên dưới `childId` cũng vĩnh viễn không bao
  giờ được vẽ nữa trong lượt vẽ đó, dù chính các node cháu/chắt ấy vẫn
  đang hiển thị rõ ràng trong khung nhìn (vì việc VẼ NODE, ở `drawNodes()`,
  được viết ĐÚNG nguyên tắc ngay từ đầu: chỉ bỏ qua việc vẽ khi node đó
  ngoài khung hình, nhưng KHÔNG BAO GIỜ bỏ qua việc đệ quy xuống con —
  xem đúng comment giải thích nguyên tắc này tại `drawNodes()`). Đây
  cũng giải thích trọn vẹn gợi ý của người dùng: `drawRelationships()`
  (vẽ đường Liên kết chéo) hoàn toàn KHÔNG áp dụng viewport culling —
  nên không bao giờ dính lỗi này; còn `drawEdges()` áp dụng culling
  nhưng áp dụng SAI (cull nhầm luôn cả đệ quy) nên mới mất. Với một map
  vừa lớn vừa bị kéo tay nhiều như file người dùng gửi, hầu như CHẮC
  CHẮN có ít nhất một đoạn nối gần gốc rơi ra ngoài khung nhìn bất cứ
  khi nào zoom sâu vào một vùng cụ thể — nên hiệu ứng quan sát được là
  "gần như toàn bộ đường nối cha-con biến mất" dù các node vẫn còn
  nguyên, đúng y hệt 2 lần người dùng báo.
  **Cách sửa**: bỏ hẳn `continue`, thay bằng biến `visible` — chỉ quyết
  định có VẼ đoạn nối hay không, còn lời gọi đệ quy `this.drawEdges(map,
  childId)` luôn luôn chạy vô điều kiện, giống hệt cách `drawNodes()`
  đã làm đúng từ trước.
  **Đã tự kiểm bằng Playwright, dùng ĐÚNG file map thật người dùng gửi,
  tái hiện ĐÚNG mức zoom người dùng báo (159%)** — không đoán suông:
  dựng lại 2 bản build (trước/sau khi sửa) từ cùng file này, cùng thao
  tác (nhập file → tìm node "#1 keo moi" → canh giữa → cuộn chuột phóng
  to 6 nấc, dừng đúng lúc thanh trạng thái báo "zoom 159%"), chụp đúng
  cùng một vùng canvas: bản TRƯỚC khi sửa tái hiện lỗi Y HỆT ảnh người
  dùng gửi (node "#1 keo moi" mất cả đường nối tới chính con ruột của nó
  là "công trình", 2 đường Liên kết nét đứt vẫn hiện nguyên); bản SAU khi
  sửa hiện đầy đủ mọi đường nối cha-con xung quanh, không còn thiếu
  đường nào, 2 đường Liên kết vẫn hiện y như trước (không đổi hành vi).
  Không có lỗi JS mới phát sinh ở cả 2 bản. `npm run check` sạch,
  `npm test` vẫn 129/129 (không cần thêm test đơn vị mới — bug thuần về
  trình tự vẽ trên Canvas 2D thật, đúng loại logic dự án quy ước kiểm
  chứng bằng Playwright trên bản build thật thay vì `vitest`, xem ghi
  chú trong `vitest.config.ts`), cả 2 bản build thành công.

## Việc CHƯA làm (cố tình dừng đúng ở P1.10 + P2.6b/c/d — toàn bộ P2.7 đã hoàn tất)

- **Toàn bộ P2.7 (Nhiều bố cục) đã xong cả 4 lượt** — không còn phần
  nào của cụm bố cục còn dang dở. 3 giới hạn đã biết của riêng Fishbone
  (kéo-thả sắp xếp lại anh em, điều hướng phím/soi gương icon dùng
  phép so mép hộp chưa hoàn toàn chính xác, icon giữ vị trí cũ) đã ghi
  chi tiết ở mục P2.7d phía trên.
- **Vị trí 4 icon (ưu tiên/tiến độ/ghi chú/link) chưa soi gương theo
  trục dọc cho Tree Down/Organization Chart/Tree Up** — vẫn giữ nguyên
  vị trí trái/phải như layout ngang, đã thống nhất trước khi làm P2.7c
  là giới hạn tạm chấp nhận được, để dành sau nếu thấy cần.
- **Kéo tay ép một nhánh cụ thể sang bên chỉ định** khi dùng Logic Both
  Sides — hiện chỉ có tự động cân bằng (đã thống nhất trước khi làm
  P2.7b), để dành sau nếu thấy cần.
- **Giới hạn đã biết của P2.7b**: kéo-thả sắp xếp lại thứ tự chính các
  con trực tiếp của gốc (không đổi cha) khi đang ở Logic Both Sides có
  thể chưa như ý — xem chi tiết ở mục P2.7b phía trên.
- Toàn bộ Phase 2 từ P2.7e trở đi (tag, gộp/bung tuần tự theo cấp,
  định dạng chữ nâng cao + sửa hàng loạt, Explorer, Minimap, xuất
  SVG/PDF/XMind...).
- `errorBox.ts`, `shortcutsModal.ts`, `dialog.ts` **cố tình chưa chuyển**
  sang Svelte — không nằm trong phạm vi P2.1 đã ghi trong kế hoạch, để
  dành nếu sau này muốn nhất quán hoàn toàn thì làm riêng, không bắt buộc.
- Bảng chọn biểu tượng hiện là 10 emoji cố định, không phải bảng emoji đầy
  đủ có tìm kiếm — đủ dùng cho phần lớn nhu cầu, có thể mở rộng sau nếu
  thấy thiếu.
- Tìm kiếm hiện chỉ khớp CHỨA từ khoá (substring), chưa mờ (fuzzy), chưa
  đánh trọng số ưu tiên khớp ở `text` hơn `notes`. Đủ dùng cho quy mô
  hiện tại, có thể nâng cấp sau nếu map lớn tới mức cần.
- Ghi chú dán chưa resize được (bề rộng cố định 180px, chỉ chiều cao tự
  giãn theo nội dung) — đủ dùng cho phần lớn nhu cầu, có thể thêm sau.
- Khoanh vùng chưa tự "đi theo" khi kéo TOÀN BỘ nhóm node bên trong nó
  cùng lúc (mỗi node vẫn kéo riêng lẻ như từ trước) — khung tự vẽ lại
  đúng vị trí sau khi kéo xong, chỉ là chưa có thao tác "kéo cả khung"
  như một khối. Không nằm trong đặc tả gốc của P2.4, có thể cân nhắc
  thêm sau nếu thấy cần.
- Chưa có cách nào **xoá riêng một nhánh trôi rỗng** ngoài phím Delete
  thông thường — chưa thử nghiệm việc kéo MỘT node ra khỏi cây rồi thả
  ngay vào khoảng trống có tự tách thành nhánh trôi hay không (hiện chỉ
  làm được qua nút "✂ Tách nhánh" trên Toolbar).

### Phần còn thiếu của Phase 1 (chưa đổi gì so với trước, trừ P1.10 đã xong)

- Lưu file thật qua File System Access API — hiện vẫn tự lưu tạm vào
  `localStorage` như bản cũ, xem cảnh báo trong `io/storage.ts` (P1.11).
- Cắt ngoài khung nhìn / đo hiệu năng (P1.12).
- Bộ test tự động bằng Vitest (P1.13) — **chưa có test nào**, nghiệm thu
  ở bước này hoàn toàn bằng tay theo danh sách dưới.
- Giai đoạn dùng thật + sửa lỗi (P1.14).

## Checklist kiểm thử tay — P2.11 Quy luật màu theme vô hạn cấp + tự tô node mới (làm trước khi coi bước này là xong)

### Node mới tự động theo theme (đúng lỗi người dùng báo lại)
- [ ] Chọn 1 theme bất kỳ (Blue/Rainbow/Mono/Pastel) trên Ribbon, bấm
      **"Áp dụng"** — toàn bộ cây đổi màu như trước
- [ ] Chọn một node bất kỳ, bấm **Tab** (thêm con) — node con MỚI hiện
      NGAY màu đúng theo theme đang bật (không còn trắng tinh/mặc định
      như trước khi sửa)
- [ ] Từ chính node con vừa tạo, bấm Tab tiếp — node cháu cũng tự tô
      đúng cấp tiếp theo (không phải lặp lại y hệt màu cha)
- [ ] Với theme **Rainbow**: tạo thêm 1 nhánh cấp-1 mới từ gốc — nhánh
      mới nhận màu RIÊNG (khác các nhánh đã có), không trùng
- [ ] Bấm **"Nhánh trôi"** (tạo nhánh trôi mới) — nhánh trôi cũng tự tô
      như một GỐC theo đúng theme đang bật (Rainbow: màu trung tính tối
      giống mọi gốc khác)
- [ ] Dán (Ctrl+V) một đoạn văn bản thụt lề từ ngoài (Word/Notepad) vào
      map đang bật theme — nội dung dán vào tự tô theo đúng cấp nơi dán
- [ ] Copy một node ĐÃ tô màu tay khác hẳn theme, dán (Ctrl+V) node đó
      vào chỗ khác — màu tô tay được GIỮ NGUYÊN, KHÔNG bị ép về theme
- [ ] Tạo node mới, Ctrl+Z rồi Ctrl+Y (undo/redo) — màu node giữ nguyên
      không đổi qua lại
- [ ] Tắt hẳn theme (map từ đầu chưa từng bấm "Áp dụng" lần nào) — node
      mới tạo vẫn mặc định trắng/không màu như hành vi cũ trước P2.11
      (không bị ép theme khi người dùng chưa hề chọn theme nào)

### Quy luật màu ở cấp rất sâu
- [ ] Tạo một chuỗi node lồng nhau thật sâu (ví dụ bấm Tab liên tục
      10-15 lần để tạo chuỗi cha-con-cháu...), áp một theme — xác nhận
      BẰNG MẮT các cấp sâu (5, 8, 10...) vẫn còn phân biệt được với
      nhau, không "đông cứng" về đúng một màu như bug cũ (trước đây mọi
      cấp từ 4 trở đi giống hệt màu cấp 3)
- [ ] Theme Mono ở cấp sâu vẫn giữ tông xám/trung tính, KHÔNG ngả sang
      các màu sặc sỡ khác (không bật hueDrift, đúng chủ đích)
- [ ] Theme Blue/Pastel ở cấp sâu có thể ngả nhẹ sang các tông màu khác
      nhau (hue trôi) — đây là chủ đích, không phải lỗi

### Đối chứng không hồi quy
- [ ] Áp lại theme ở các cấp 0-3 (4 mức đã định nghĩa tay từ trước) —
      màu Y HỆT như bản trước P2.11, không đổi gì
- [ ] Mở lại một map JSON cũ (schema thấp hơn 16) đã lưu từ bản trước —
      mở được bình thường, không lỗi, không mất dữ liệu (di trú
      `activeThemeId = null` tự động)
- [ ] Toàn bộ chức năng ảnh nhúng, `.t17m`, Tag, Explorer, Minimap... từ
      các bước trước vẫn hoạt động bình thường, không có gì thay đổi

## Checklist kiểm thử tay — P2.10 Ảnh nhúng + định dạng .t17m (làm trước khi coi bước này là xong)

### Ảnh nhúng trên node
- [ ] Chọn 1 node, panel bên phải → mục "Ảnh nhúng" → **"Chọn ảnh..."**,
      chọn một file ảnh (PNG/JPG) — thumbnail nhỏ hiện ngay trong panel,
      icon 🖼 hiện trên góc node ở canvas
- [ ] Bấm vào thumbnail (hoặc icon 🖼 trên canvas) — hộp thoại hiện ảnh
      cỡ đầy đủ, bấm "Đóng" hoặc bấm ra ngoài để tắt
- [ ] Bấm **"Đổi ảnh..."** chọn ảnh khác — ảnh cũ được thay hẳn, không
      còn hiện lại nếu Ctrl+Z SAU KHI đã đổi ảnh khác đi xa hơn 1 bước
- [ ] Bấm **"Xoá ảnh"** — icon 🖼 biến mất khỏi node, panel về lại nút
      "Chọn ảnh..."; bấm Ctrl+Z ngay sau đó — ảnh cũ hiện lại NGAY
      (không cần chọn lại file)
- [ ] Gắn ảnh mới rồi bấm Ctrl+Z ngay — node hết ảnh; bấm Ctrl+Shift+Z
      (hoặc Ctrl+Y) — ảnh trở lại đúng như trước khi hoàn tác
- [ ] Node cùng lúc có cả Hyperlink lẫn Ảnh nhúng — xác nhận 2 icon 🔗
      và 🖼 trên canvas KHÔNG đè lên nhau
- [ ] Thử chọn một file ảnh rất nặng (>8MB) — hiện thông báo lỗi rõ
      ràng, không làm treo hay crash ứng dụng

### Định dạng file `.t17m`
- [ ] Gắn ảnh cho vài node khác nhau trong một map, tab **Xuất/Nhập** →
      bấm **"Lưu .t17m"** — file `.t17mind-export.t17m` tải về
- [ ] Đóng/mở lại map trống, bấm **"Mở .t17m"**, chọn lại đúng file vừa
      lưu — toàn bộ cây, MỌI ảnh nhúng hiện lại đúng như trước khi lưu
- [ ] Đổi tên file `.t17m` vừa lưu thành `.zip`, giải nén bằng công cụ
      bất kỳ — xác nhận có `content.json` và thư mục `assets/` chứa các
      file ảnh THẬT (mở được bằng trình xem ảnh bình thường, không phải
      chuỗi base64)
- [ ] Thử mở một file KHÔNG phải `.t17m` hợp lệ (đổi đuôi file `.txt`
      bất kỳ thành `.t17m`) — hiện đúng hộp thoại báo lỗi, không làm
      hỏng map đang mở
- [ ] Map KHÔNG có ảnh nào vẫn "Lưu .t17m"/"Mở .t17m" bình thường
      (không bắt buộc phải có ảnh mới dùng được định dạng này)
- [ ] (Nếu dùng bản PWA đã cài) double-click một file `.t17m` đã liên
      kết — mở thẳng vào T17Mind, giống hệt hành vi `.json`/`.xmind`

### Ghép map (P2.8c) có ảnh
- [ ] Mở map A có node gắn ảnh, dùng **"Ghép JSON"** nhập map B (cũng
      có node gắn ảnh) — sau khi ghép, cả ảnh của A lẫn ảnh remap từ B
      đều hiện đúng, không cái nào bị mất hay đè nhầm lên nhau
- [ ] Ctrl+Z sau khi ghép — map A trở lại ĐÚNG trạng thái trước đó (kể
      cả ảnh), không còn sót ảnh "rác" nào từ B

### Dữ liệu cũ
- [ ] Mở một file JSON/map đã lưu TỪ TRƯỚC KHI có tính năng này (không
      có `assets`/`imageAssetId`) — mở bình thường, không crash, không
      hiện màn hình trống, panel "Ảnh nhúng" hiện nút "Chọn ảnh..." bình
      thường (coi như chưa có ảnh)
- [ ] `npm test` chạy sạch — dòng cuối `Tests  86 passed (86)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P1.16 Tối ưu bundle lazy-load (làm trước khi coi bước này là xong)

- [ ] Build lại bản PWA (`npm run build:pwa`), mở DevTools (F12) → tab
      **Network**, tải lại trang — xem tổng dung lượng JS tải về LÚC
      MỞ APP (không tính lúc bấm nút nào) — phải KHÔNG thấy file
      `xlsx-*.js` hay `xmind-*.js` nào trong danh sách tải lúc này
- [ ] Bấm **"Nhập XLSX"** (hoặc "Xuất XLSX") lần đầu — quan sát tab
      Network, phải thấy MỘT request MỚI tải file `xlsx-*.js` (~430KB)
      ngay lúc đó — sau đó tính năng hoạt động bình thường như trước
- [ ] Bấm lại "Nhập XLSX" lần thứ 2 (cùng phiên làm việc) — KHÔNG tải
      lại file đó nữa (trình duyệt tự cache), tính năng vẫn hoạt động
      đúng
- [ ] Tương tự với **"Nhập XMind"/"Xuất XMind"** — chỉ tải file
      `xmind-*.js` (~102KB) khi bấm lần đầu
- [ ] Thử NGAY TỪ ĐẦU bấm "Nhập XLSX" TRƯỚC (chưa từng đụng XMind) —
      xác nhận chỉ đúng file `xlsx-*.js` được tải, KHÔNG kéo theo tải
      nhầm `xmind-*.js` (2 tính năng phải tách biệt hoàn toàn, không
      phụ thuộc chéo)
- [ ] Đối chứng bản 1-file: mở `dist/index.html` — mọi tính năng
      (XLSX, XMind, mọi thứ khác) vẫn hoạt động bình thường như trước
      (bản này không lazy-load gì, luôn có sẵn mọi thứ trong 1 file)
- [ ] `npm test` chạy sạch — dòng cuối `Tests  64 passed (64)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.9 (tiếp) Nhập/Xuất OPML (làm trước khi coi bước này là xong)

### Xuất
- [ ] Dựng một map có vài node checkbox (đã tick + chưa tick), 1 node
      có ghi chú, và một nhánh trôi. Bấm **"Xuất OPML"** trên Toolbar
- [ ] Mở file `.opml` vừa tải bằng trình soạn thảo text — kiểm tra
      cấu trúc `<outline text="...">` lồng nhau đúng theo cây, node
      có ghi chú có thêm `_note="..."`, node có checkbox có thêm
      `_complete="true"` hoặc `"false"`
- [ ] Đặt tên một node có ký tự `<`, `>`, `&`, `"` — mở file, xác nhận
      các ký tự đó đã được escape đúng (`&lt;`, `&gt;`, `&amp;`,
      `&quot;`), không làm hỏng cấu trúc XML

### Nhập
- [ ] Bấm **"Nhập OPML"**, chọn lại đúng file vừa xuất — cấu trúc,
      ghi chú, checkbox phải giữ nguyên đúng như trước khi xuất
- [ ] **Quan trọng nhất**: nếu có tài khoản Workflowy/Dynalist (hoặc
      công cụ outline nào khác hỗ trợ xuất `.opml`) — thử xuất một
      outline THẬT từ đó, rồi nhập vào T17Mind. Đây là bài kiểm tra
      tương thích ngược THỰC SỰ (khác việc chỉ đọc lại file do chính
      T17Mind xuất ra)
- [ ] Thử nhập một file `.opml` KHÔNG hợp lệ (đổi đuôi 1 file `.txt`
      bất kỳ thành `.opml`) — hiện đúng hộp thoại báo lỗi, không làm
      hỏng map đang mở

### Chung
- [ ] `npm test` chạy sạch — dòng cuối `Tests  64 passed (64)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P1.15 Đóng gói PWA (làm trước khi coi bước này là xong)

**Đây là tính năng duy nhất tôi KHÔNG tự kiểm được trọn vẹn** — cần
thực hiện trên Windows thật với Chrome hoặc Edge.

### Cài đặt lần đầu
- [ ] Double-click `start-pwa.bat` — cửa sổ đen (server) hiện ra, sau
      đó trình duyệt TỰ MỞ tới `http://localhost:5175` (không phải
      lỗi "không kết nối được")
- [ ] Thấy đúng giao diện T17Mind bình thường, hoạt động y hệt bản
      mở trực tiếp file HTML
- [ ] Nhìn thanh địa chỉ trình duyệt — thấy biểu tượng **"Cài đặt"**
      (hình dấu ⊕ hoặc màn hình có mũi tên, tuỳ phiên bản trình duyệt)
- [ ] Bấm **Cài đặt** — xác nhận hộp thoại — app mở ra trong MỘT CỬA
      SỔ RIÊNG (không có thanh địa chỉ/tab của trình duyệt, giống hệt
      một chương trình cài đặt thật)
- [ ] Tìm trong Start Menu (gõ "T17Mind") — thấy app xuất hiện như
      một chương trình đã cài, có icon riêng

### Liên kết file (double-click mở app)
- [ ] Chuột phải vào một file `.json` bất kỳ đã xuất trước đó → "Mở
      bằng" → tìm và chọn T17Mind — file phải TỰ MỞ đúng app, hiện
      đúng nội dung map đó
- [ ] Thử double-click TRỰC TIẾP file `.json` đó (sau khi đã chọn "Mở
      bằng" một lần, Windows có thể tự nhớ) — mở đúng app
- [ ] Thử tương tự với 1 file `.xmind` — mở đúng, hiện đúng cấu trúc
      cây (không bị nhầm sang luồng đọc JSON)
- [ ] Đóng server (`start-pwa.bat`'s cửa sổ đen), thử double-click
      lại file `.json`/`.xmind` — kiểm tra app có vẫn mở được không
      (Chrome/Edge có thể đã cache đủ để chạy không cần server, nhưng
      đây là hành vi PHỤ THUỘC trình duyệt, không đảm bảo tuyệt đối —
      ghi lại đúng những gì xảy ra)

### Đối chứng bản 1-file cũ không bị ảnh hưởng
- [ ] Mở lại bản build cũ (`dist/index.html`, double-click trực tiếp
      không qua server) — vẫn hoạt động bình thường như trước giờ,
      không có gì thay đổi

### Chung
- [ ] `npm test` chạy sạch — dòng cuối `Tests  54 passed (54)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo
- [ ] `npm run build` (bản 1-file) VẪN chỉ ra đúng 1 file
      `dist/index.html`, không có file nào khác trong `dist/`

## Checklist kiểm thử tay — P2.9 (tiếp) Nhập/Xuất XMind (làm trước khi coi bước này là xong)

**Có 3 file `.xmind` "roundtrip" gửi kèm** (đã qua Nhập rồi Xuất lại
bằng chính code này) — đây là bước kiểm chứng DUY NHẤT không tự làm
được vì sandbox không có phần mềm XMind:

- [ ] Mở CẢ 3 file `*-roundtrip.xmind` bằng phần mềm XMind thật —
      kiểm tra mở được, không báo lỗi hỏng file
- [ ] So sánh với file `.xmind` GỐC (bản ban đầu bạn đã gửi) — cấu
      trúc cây, tên node, quan hệ chéo có giữ đúng không (màu sắc/hình
      dạng/theme có thể khác — đây là giới hạn đã biết, không phải lỗi)
- [ ] Với `Mo_hinh_HD_Tu_van_-_Xay_lap-roundtrip.xmind` — kiểm tra 2
      "nhánh trôi" (topic tách biệt) còn giữ đúng vị trí tương đối,
      không bị dính vào cây chính

**Nhập trực tiếp vào T17Mind:**
- [ ] Mở app, bấm **"Nhập XMind"** trên Toolbar, chọn 1 trong 3 file
      gốc — kiểm tra cấu trúc cây hiện đúng, đọc được tiếng Việt có dấu
- [ ] Với file có quan hệ chéo (`Cac_buoc_nhap_SAP` hoặc
      `Mo_hinh_HD_Tu_van`) — kiểm tra các đường quan hệ chéo hiện đúng,
      nối đúng 2 node
- [ ] Với `Mo_hinh_HD_Tu_van_-_Xay_lap.xmind` — kiểm tra 2 nhánh trôi
      hiện tách biệt khỏi cây chính, không dính nhầm vào đâu

**Xuất từ T17Mind:**
- [ ] Sửa vài node trong map vừa nhập, bấm **"Xuất XMind"** — tải về
      file `.xmind` mới, mở lại bằng XMind thật — nội dung vừa sửa
      phải có trong file xuất ra
- [ ] Thử với map có Tag — mở file xuất ra bằng XMind, kiểm tra Tag đã
      thành "labels" đúng (XMind gọi là gì tuỳ phiên bản, có thể hiện
      dạng nhãn/thẻ dưới tên node)

**Trường hợp lỗi (đối chứng thông báo rõ ràng):**
- [ ] Thử đổi đuôi một file `.zip` bất kỳ (không phải xmind) thành
      `.xmind` rồi nhập — báo lỗi rõ ràng, không crash
- [ ] Nếu có sẵn 1 file `.xmind` từ phiên bản XMind CŨ (chỉ có
      content.xml, không có content.json) — báo đúng lỗi gợi ý mở lại
      bằng XMind rồi lưu để có content.json

- [ ] `npm test` chạy sạch — dòng cuối `Tests  54 passed (54)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P1.13 Tối ưu hiệu năng (làm trước khi coi bước này là xong)

- [ ] Dựng (hoặc nhập) một map LỚN — vài trăm node trở lên (có thể
      dùng "Nhập XLSX" với một bảng nhiều dòng để tạo nhanh, hoặc tạo
      thủ công nhiều nhánh/con qua Tab liên tục)
- [ ] Zoom nhỏ để xem TOÀN CẢNH — kéo (pan) qua lại, xoay/zoom liên
      tục — cảm nhận có mượt hơn rõ rệt so với các bản trước đây
      không (nếu bạn có bản build cũ để đối chứng)
- [ ] Zoom sâu vào MỘT góc nhỏ của map lớn đó (chỉ 1 phần nhỏ hiển
      thị, phần lớn còn lại ở ngoài khung nhìn) — kéo/pan xung quanh,
      xác nhận vẫn mượt mà, không giật
- [ ] Kéo (pan) từ từ để một nhánh LƯỚT QUA MÉP khung nhìn (đi từ hiện
      ra tới biến mất) — quan sát kỹ xem có hiện tượng "chớp tắt"
      (nhấp nháy đột ngột) hay nhánh đó biến mất/hiện ra mượt mà bình
      thường
- [ ] Trong lúc đang zoom sâu vào 1 góc (phần lớn map ở ngoài khung
      nhìn), thử BẤM CHỌN một node đang hiện — chọn đúng, không có gì
      bất thường (xác nhận việc bấm chọn node vẫn hoạt động đúng dù
      phần lớn map khác đang không được vẽ)
- [ ] Nếu map có quan hệ chéo/tóm tắt — kiểm tra bấm/kéo chúng vẫn
      hoạt động bình thường ở mọi mức zoom
- [ ] Bấm phím **F** (Vừa khung nhìn) để zoom fit toàn bộ map lớn vào
      1 khung — vẫn hiển thị đủ, không có gì bị thiếu/lỗi
- [ ] `npm test` chạy sạch — dòng cuối `Tests  40 passed (40)`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P1.11 + P1.12 Lưu trữ bền vững (làm trước khi coi bước này là xong)

### P1.11 — IndexedDB (tự động lưu ngầm)
- [ ] Tạo/sửa một mindmap bất kỳ, **KHÔNG bấm "Xuất JSON"**. Tải lại
      trang (F5) — nội dung phải còn nguyên (đây chính là autosave
      ngầm qua IndexedDB, thay localStorage cũ)
- [ ] Mở DevTools (F12) → tab **Application** → **IndexedDB** →
      `t17mind-db` — thấy đủ 3 object store: `maps`, `mapIndex`, `meta`
- [ ] Tạo thêm 1-2 map mới nữa (nút "＋ Mới"), bấm **"📂 Map gần đây"**
      — thấy đủ danh sách, map mới sửa gần nhất đứng đầu
- [ ] Đổi tên một map trong danh sách, đóng rồi mở lại hộp thoại — tên
      mới vẫn giữ nguyên
- [ ] Xoá một map ĐANG MỞ khỏi danh sách — app tự chuyển sang một map
      trống mới, không bị lỗi hay treo
- [ ] Đóng hẳn tab trình duyệt, mở lại địa chỉ app — map đang làm dở
      gần nhất tự động hiện lại đúng, không cần thao tác gì thêm

### P1.12 — File System Access API (chỉ Chrome/Edge)
- [ ] Mở app bằng **Chrome hoặc Edge** — thấy 2 nút **"💾 Lưu file..."**
      và **"📁 Mở file..."** trên Toolbar
- [ ] Bấm **"💾 Lưu file..."** — hộp thoại "Lưu" của hệ điều hành hiện
      ra, chọn vị trí lưu — sau khi lưu xong, chữ nút đổi thành
      **"💾 Lưu"** (không còn dấu "...")
- [ ] Sửa thêm vài node, bấm **Ctrl+S** — KHÔNG hiện hộp thoại nào cả,
      lưu thẳng vào ĐÚNG file đã chọn trước đó (mở file đó bằng trình
      soạn thảo text để xác nhận nội dung đã cập nhật)
- [ ] Bấm **"📁 Mở file..."**, chọn một file `.json` khác đã có sẵn
      (ví dụ file mẫu từ các lần kiểm thử trước) — nội dung map đổi
      đúng theo file đó, và Ctrl+S từ giờ ghi vào ĐÚNG file MỚI này
      (không phải file trước đó)
- [ ] Bấm nút **"＋ Mới"** — chữ nút "💾" trở lại thành **"Lưu file..."**
      (không còn dấu vết liên kết file cũ, vì đây là nội dung hoàn
      toàn khác)
- [ ] Thử mở file KHÔNG phải JSON hợp lệ (đổi đuôi 1 file `.txt` bất kỳ
      thành `.json` rồi chọn) — hiện đúng hộp thoại báo lỗi, không làm
      hỏng map đang mở
- [ ] Nếu có sẵn **Firefox hoặc Safari** để thử: mở app — 2 nút
      "💾 Lưu file..."/"📁 Mở file..." phải **KHÔNG hiện** trên
      Toolbar. Bấm Ctrl+S — hiện thông báo giải thích rõ trình duyệt
      chưa hỗ trợ, gợi ý dùng "Xuất JSON" thay thế (không phải im lặng
      không có gì xảy ra, cũng không phải hộp thoại "Lưu trang web"
      mặc định của trình duyệt)

### Chung
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.9 Xuất SVG + Markdown (làm trước khi coi bước này là xong)

### Markdown
- [ ] Chọn map có ít nhất 3 cấp, vài node có checkbox, vài Tag, 1 node
      có link. Bấm **"Xuất Markdown"** trên Toolbar
- [ ] Mở file `.md` vừa tải bằng trình soạn thảo text bất kỳ (Notepad,
      VS Code...) — kiểm tra thụt lề đúng theo cấp, node đã tick hiện
      `- [x]`, chưa tick hiện `- [ ]`
- [ ] Node có Tag — hiện đúng `#TênTag` ở cuối dòng
- [ ] Node có link — hiện đúng dạng `[chữ](đường dẫn)`
- [ ] Thử đặt tên một node có ký tự `*`, `[`, `]` (ví dụ "Việc [gấp]
      *quan trọng*") — mở file `.md` bằng trình xem Markdown có định
      dạng (VS Code preview, GitHub...) — chữ phải hiện ĐÚNG NGUYÊN
      VĂN, không bị hiểu nhầm thành in nghiêng hay liên kết
- [ ] Nếu map có nhánh trôi (nhiều gốc) — mỗi gốc thành một khối riêng,
      cách nhau đúng một dòng trống

### SVG
- [ ] Bấm **"Xuất SVG"** trên Toolbar, mở file `.svg` vừa tải bằng
      trình duyệt (kéo thả file vào tab mới)
- [ ] **Kiểm tra:** đủ mọi node đang hiển thị, đúng màu nền/màu chữ đã
      tuỳ chỉnh, đường nối đúng hình dạng (cong/thẳng/góc vuông tuỳ
      layout đang chọn)
- [ ] Phóng to hết cỡ trong trình duyệt — hình vẫn SẮC NÉT (không vỡ
      nét như ảnh PNG), vì đây là vector
- [ ] Thu gọn một nhánh trên canvas TRƯỚC KHI xuất — kiểm tra file SVG
      chỉ chứa phần đang hiển thị thật, không bao gồm nhánh đã ẩn
- [ ] Đặt tên một node có ký tự `<`, `>`, `&` — mở file SVG bằng trình
      duyệt, chữ phải hiện ĐÚNG các ký tự đó (không làm hỏng cấu trúc
      file, không có cảnh báo lỗi XML)
- [ ] Thử với vài layout khác nhau (Logic Right, Tree Down,
      Organization Chart) — mỗi lần xuất, đường nối trong SVG phải
      đúng hình dạng của ĐÚNG layout đang chọn lúc xuất

### Chung
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.8b Minimap (làm trước khi coi bước này là xong)

- [ ] Bấm nút **🗺 Minimap** trên Toolbar — khung nhỏ hiện ở góc
      dưới-phải màn hình, thấy toàn bộ node thu nhỏ dạng hình chữ nhật
      màu, kèm 1 khung viền xanh biểu diễn đúng vùng đang xem
- [ ] Cuộn/zoom trên canvas chính — khung viền xanh trong Minimap đổi
      kích thước theo (zoom nhỏ lại thì khung xanh to ra, và ngược lại)
- [ ] Kéo (pan) canvas chính bằng giữ Space — khung viền xanh trong
      Minimap di chuyển theo đúng hướng
- [ ] Bấm vào một góc BẤT KỲ của Minimap (ngoài khung viền xanh) —
      canvas chính NHẢY NGAY tới đúng vùng đó
- [ ] Từ chỗ vừa bấm, giữ chuột KÉO tiếp (không thả ra) — canvas chính
      PAN LIÊN TỤC theo hướng kéo, mượt mà không giật
- [ ] Thả chuột, kéo THANH TIÊU ĐỀ (chữ "🗺 Minimap") sang một góc khác
      của màn hình, kể cả kéo THEO CHIỀU DỌC (lên/xuống) — khung
      Minimap phải di chuyển tự do theo CẢ 2 CHIỀU, không bị "bám"
      chỉ di chuyển ngang (lỗi đã sửa — xem mục "Sửa lỗi" bên dưới)
- [ ] Kéo tay cầm ở góc dưới-phải khung Minimap — cả chiều rộng lẫn
      chiều cao đổi theo cùng lúc
- [ ] Đóng Minimap (nút ✕), mở lại — vị trí và kích thước vừa chỉnh
      vẫn giữ nguyên như trước khi đóng
- [ ] Thử với map có nhánh trôi (nhiều gốc) — Minimap vẽ đủ TẤT CẢ,
      không chỉ cây chính
- [ ] Thu gọn một nhánh lớn trên canvas (phím C). Với Minimap đang ở
      chế độ **"Đồng bộ"** (mặc định) — kiểm tra Minimap CŨNG không
      còn vẽ phần đã thu gọn, đúng khớp hình dạng thật trên canvas
- [ ] Bấm sang chế độ **"Độc lập"** — Minimap NGAY LẬP TỨC hiện lại
      TOÀN BỘ, kể cả phần đang thu gọn trên canvas
- [ ] Mở lại nhánh đã thu gọn — dù đang ở chế độ nào, Minimap cũng
      hiện đủ trở lại (khớp đúng, vì lúc này "đang hiển thị thật" và
      "toàn bộ" là như nhau)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.8c Ghép thêm JSON (làm trước khi coi bước này là xong)

- [ ] Dựng/mở 2 file JSON riêng biệt A và B (đều xuất từ chính app này
      để đảm bảo đúng định dạng)
- [ ] Mở file A, bấm **"➕ Ghép thêm JSON"** trên Toolbar, chọn file B
- [ ] **Kiểm tra:** map A giữ nguyên mọi node cũ, VÀ có thêm (các)
      nhánh trôi mới ở bên dưới — không đè lên nội dung cũ
- [ ] Nếu file B có sẵn từ 2 gốc trở lên (ví dụ 1 file đã từng ghép
      trước đó) — **kiểm tra cả 2 gốc đều xuất hiện** thành 2 nhánh
      trôi riêng biệt, không đè lên nhau
- [ ] Nếu cả A và B đều có Tag TRÙNG TÊN (kể cả viết hoa/thường khác
      nhau) — **kiểm tra** sau khi ghép chỉ còn ĐÚNG 1 Tag đó (không
      bị nhân đôi), và node từ B vẫn hiện đúng màu Tag (đã gộp)
- [ ] Bấm **Ctrl+Z một lần** — toàn bộ việc ghép lùi lại, map trở về
      ĐÚNG trạng thái trước khi ghép (kể cả Tag, quan hệ chéo, tóm tắt
      nếu file B có mang theo)
- [ ] Thử ghép một file JSON **KHÔNG hợp lệ** (sửa tay làm hỏng cấu
      trúc) — hiện đúng hộp thoại báo lỗi, KHÔNG làm hỏng gì map A
      đang mở
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.8 Explorer (làm trước khi coi bước này là xong)

- [ ] Bấm nút **🧭 Explorer** trên Toolbar — khung bên trái hiện ra
- [ ] Kéo thanh mép phải khung (con trỏ đổi hình mũi tên 2 chiều) —
      độ rộng khung đổi theo, không giật/lag
- [ ] Kéo thanh trượt "Độ trong suốt" xuống thấp — khung mờ đi rõ rệt,
      vẫn đọc được nội dung bên dưới
- [ ] Gõ vào ô tìm kiếm một phần tên node — danh sách CHỈ còn hiện
      đúng những node khớp VÀ tổ tiên của chúng (không mất cấu trúc
      cây), các nhánh không liên quan biến mất
- [ ] Xoá trắng ô tìm kiếm — toàn bộ cây hiện lại bình thường
- [ ] Tick chọn 1 Tag trong khung lọc (đang ở chế độ mặc định "Có 1
      trong số") — chỉ node có Tag đó (và tổ tiên) hiện ra
- [ ] Tick thêm Tag thứ 2 — danh sách MỞ RỘNG thêm (node có MỘT trong
      2 Tag đều hiện — đúng nghĩa OR)
- [ ] Đổi sang **"Có đủ tất cả"** (AND) — danh sách THU HẸP lại, chỉ
      còn node có ĐỦ CẢ 2 Tag mới hiện
- [ ] Ở chế độ **"Đồng bộ"** (mặc định), bấm mũi tên thu gọn một dòng
      trong Explorer — **kiểm tra ngay trên canvas**, đúng nhánh đó
      cũng thu gọn theo
- [ ] Đổi sang chế độ **"Độc lập"** — thử thu gọn/mở vài dòng trong
      Explorer — **canvas KHÔNG đổi gì** dù danh sách trong Explorer
      thay đổi
- [ ] Bấm vào TÊN một node đang hiện sâu trong Explorer (đang ở nhánh
      bị thu gọn trên canvas, chế độ Độc lập) — canvas tự bung đúng
      tổ tiên cần thiết, cuộn tới, chọn đúng node đó, có nhấp nháy
      đánh dấu
- [ ] Node có checkbox đã hoàn thành — hiện đúng ☑ và chữ gạch ngang
      trong Explorer (khớp đúng những gì thấy trên canvas)
- [ ] Đóng Explorer (nút ✕ hoặc bấm lại nút Toolbar), mở lại — mọi cài
      đặt (độ rộng, độ trong suốt, bộ lọc) vẫn giữ nguyên như trước
      khi đóng (đúng vì đây là state của phiên làm việc, không mất khi
      chỉ ẩn/hiện khung)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7h Nâng cấp P2.7g + Độ đậm nhạt nhánh (làm trước khi coi bước này là xong)

### Thu gọn cả gốc (đảo ngược P2.7g cũ)
- [ ] Chọn node **gốc**, bấm phím **C** — gốc thu gọn hoàn toàn, màn
      hình CHỈ CÒN 1 mình node gốc (đúng ý đồ mới — khác hẳn trước đây
      là bị chặn hoàn toàn)
- [ ] Bấm **C** lần nữa — con trực tiếp của gốc hiện ra, nhưng cháu
      (nếu có) vẫn ẩn (nấc 2)
- [ ] Bấm **C** lần thứ 3 — mở hết toàn bộ (nấc 3)
- [ ] Bấm **C** lần thứ 4 — quay vòng về lại chỉ còn 1 mình gốc
- [ ] Bấm **🏠 Về gốc** trên Toolbar (nút mới) — chọn + cuộn về đúng
      gốc, dù đang thu gọn hay không

### Độ đậm nhạt nhánh
- [ ] Dựng cây 3-4 cấp — quan sát đường nối: cấp càng sâu càng MỎNG
      dần một cách tự nhiên (không cần chỉnh gì)
- [ ] Chọn 1 node, mở khối "Đường nối cha-con", gõ số vào ô "Độ dày
      đường nối" (ví dụ 5) — đường nối từ node đó TỚI CON của nó dày
      hẳn lên ngay, KHÔNG ảnh hưởng đường nối ở cấp khác
- [ ] Xoá trắng ô đó (để trống) — đường nối trở lại đúng độ dày tự
      động theo cấp như ban đầu
- [ ] Xuất JSON, "+ Mới", nhập lại — độ dày tự chỉnh giữ nguyên đúng
- [ ] Mở một file JSON **cũ** (trước bước này) — tự nâng cấp lên
      schema 12, mọi đường nối vẫn hiện bình thường (mỏng dần theo
      cấp tự động, không lỗi gì)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

### Kiểu cây "tự nhiên" (Phần 4 — giờ đã xong)
- [ ] Bấm nút **🌿 Kiểu tự nhiên** trên Toolbar (bật lên) — mọi đường
      nối trong layout Logic Right/Left/Both đổi ngay sang dạng dải
      băng thon dần: dày rõ rệt gần node cha, mỏng nhọn dần khi tới
      node con — không còn là nét mảnh đều một độ dày như trước
- [ ] Đổi sang layout **Tree Down** hoặc **Tree Up** — vẫn thấy hiệu
      ứng thon dần, đúng hướng dọc (dày trên/dưới tuỳ layout, mỏng dần
      khi ra xa theo trục dọc)
- [ ] Đổi sang layout **Organization Chart** — đường nối
      TRỞ LẠI bình thường (góc vuông như cũ), KHÔNG bị ép
      thành dải băng — đúng vì layout này có hình dạng riêng, không
      phải bezier
- [ ] Chọn một node, đổi "Đường nối tới con" sang **"Thẳng"** (edgeShape)
      trong khi đang bật Kiểu tự nhiên — đường đó cũng KHÔNG bị ép
      thành dải băng (giữ đúng đường thẳng như đã chọn), chỉ những
      đường vẫn dùng "Cong" (mặc định) mới áp dụng hiệu ứng
- [ ] Tắt nút **🌿 Kiểu tự nhiên** — mọi thứ trở lại nét mảnh đều như
      ban đầu ngay lập tức
- [ ] Xuất JSON, "+ Mới", nhập lại — trạng thái bật/tắt của Kiểu tự
      nhiên được giữ nguyên đúng
- [ ] Mở một file JSON **cũ** (trước bước này) — tự nâng cấp lên
      schema 13, mặc định Kiểu tự nhiên TẮT (không tự ý đổi hình ảnh
      của map cũ khi chưa được yêu cầu)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7g Gộp/bung tuần tự theo cấp (làm trước khi coi bước này là xong)

- [ ] Dựng cây 3 cấp: Gốc → Nhánh A → vài Cháu (1 trong số Cháu lại có
      thêm Chắt riêng của nó)
- [ ] Chọn "Nhánh A", bấm phím **C** — Nhánh A thu gọn hoàn toàn (nấc 1,
      giống hành vi cũ)
- [ ] Bấm **C** lần nữa — Nhánh A MỞ ra, thấy các Cháu, nhưng Cháu nào
      có Chắt riêng thì Cháu đó lại thu gọn (chấm tròn hiện trên đúng
      Cháu đó) — đây là nấc 2, khác hẳn hành vi cũ
- [ ] Bấm **C** lần thứ 3 — mọi Cháu VÀ Chắt đều mở hết (nấc 3)
- [ ] Bấm **C** lần thứ 4 — quay vòng về nấc 1 (thu gọn lại từ đầu)
- [ ] Từ nấc 1 (chấm tròn đang hiện trên Nhánh A), giữ **Shift** rồi
      bấm vào chấm tròn đó — mở NGAY toàn bộ (nấc 3), bỏ qua nấc 2
- [ ] Thu gọn lại (bấm C), rồi thử **Shift+C** (không cần bấm đúng
      chấm tròn, chỉ cần đã chọn node) — cũng mở hết ngay, giống hệt
      Shift+click
- [ ] Bấm **Ctrl+Z** nhiều lần liên tiếp sau khi đã xoay qua vài nấc —
      mỗi lần lùi đúng 1 nấc trước đó (không nhảy cách quãng)
- [ ] Thử bấm **C** trên một node **KHÔNG có con** (node lá) — không
      có gì xảy ra, không tạo bước hoàn tác nào (Ctrl+Z không có gì để
      lùi)
- [ ] Thử bấm **C** khi đang chọn **node gốc** — vẫn không làm gì (gốc
      không bao giờ bị thu gọn, giống hành vi đã sửa trước đây)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7f Định dạng chữ nâng cao + sửa hàng loạt (làm trước khi coi bước này là xong)

### Node đơn
- [ ] Chọn 1 node, mở khối "Chữ trong node", bấm nút **B** — chữ trong
      node đậm lên ngay. Bấm lại — về bình thường
- [ ] Bấm nút **I** — chữ nghiêng. Bấm nút **U** — chữ có gạch chân
      (đường thẳng dưới chữ, KHÔNG phải chữ đổi kiểu font)
- [ ] Bật cả 3 (B+I+U) cùng lúc — cả 3 hiệu ứng cùng hiện, không cái
      nào đè mất cái nào
- [ ] Thử với node dùng "Tự xuống dòng" (wrap) và "Tự co chữ"
      (shrink) — gạch chân vẫn đúng bề rộng TỪNG DÒNG (không phải một
      đường dài cố định)
- [ ] Ở khối "Thuộc tính công việc", đổi ô "Checkbox hoàn thành" từ
      "Không có checkbox" sang "Chưa hoàn thành" — checkbox rỗng xuất
      hiện ngay trước chữ trên node
- [ ] Đổi tiếp sang "Đã hoàn thành" — checkbox chuyển thành có dấu
      tick, VÀ chữ tự động có gạch ngang (không cần bật thêm gạch chân)
- [ ] Bấm TRỰC TIẾP vào checkbox trên node (ngoài canvas, không qua
      panel) — con trỏ đổi thành hình bàn tay khi rê tới, bấm vào đảo
      đúng trạng thái tick/bỏ tick
- [ ] Với node hẹp có chữ dài — kiểm tra chữ KHÔNG bị đè lên checkbox
      (đủ khoảng trống, không chồng lấn)

### Sửa hàng loạt
- [ ] Giữ Ctrl (hoặc Shift), bấm chọn 3-4 node cùng lúc — panel hiện
      đúng khối "Sửa hàng loạt" (không phải khối chỉnh sửa 1 node)
- [ ] Đổi màu nền ở khối này — CẢ 3-4 node đổi màu nền cùng lúc ngay
      lập tức
- [ ] Bấm "Bật" ở dòng Đậm — cả 3-4 node đậm lên cùng lúc, kể cả node
      trước đó đã đậm sẵn (không bị lỗi gì)
- [ ] Bấm "Đã xong" ở dòng Checkbox — cả 3-4 node đều có checkbox tick
      sẵn, chữ đều gạch ngang
- [ ] Bấm **Ctrl+Z một lần** — TẤT CẢ thay đổi vừa làm (màu nền + đậm +
      checkbox) đều lùi lại cùng lúc, không phải bấm nhiều lần
- [ ] **Kiểm tra quan trọng nhất**: trước khi sửa hàng loạt, chọn 1
      trong các node đó rồi bật riêng "Đậm" cho MỖI MÌNH nó trước. Sau
      đó chọn lại cả nhóm, sửa hàng loạt "Tắt Đậm" cho cả nhóm, rồi
      Ctrl+Z — node đã tự bật đậm từ trước phải trở LẠI ĐÚNG trạng thái
      đậm của riêng nó (không phải mất đậm theo cả nhóm)

### Dữ liệu
- [ ] Xuất JSON đầy đủ, "+ Mới", nhập lại — mọi thuộc tính mới giữ
      nguyên đúng
- [ ] Mở một file JSON **cũ** (trước P2.7f) — tự nâng cấp lên schema
      11, không node nào tự đổi hình dạng (không đậm/nghiêng/gạch chân
      thừa, không có checkbox thừa)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7e Hệ thống Tag (làm trước khi coi bước này là xong)

- [ ] Chọn một node, bấm **"+ Chọn Tag"** trong panel bên phải — bảng
      chọn hiện ra (rỗng nếu map chưa có Tag nào)
- [ ] Gõ tên Tag mới (ví dụ "Quan trọng"), chọn màu, bấm **"Thêm"** —
      Tag mới xuất hiện trong bảng VÀ tự động gắn luôn cho node đang
      chọn (chip màu đúng hiện ngay dưới nút)
- [ ] Chọn **node khác**, mở lại bảng chọn Tag — thấy Tag vừa tạo
      trong danh sách (dùng chung cho cả map, không phải riêng từng
      node), tick vào ô để gắn thêm cho node này
- [ ] Quay lại node đầu tiên, **bấm vào TÊN Tag** ngay trong bảng chọn
      — hiện ô sửa tên, gõ tên mới rồi bấm ra ngoài hoặc Enter — tên
      đổi đúng, và chip hiển thị trên **CẢ 2 node** đã gắn nó đều đổi
      tên theo (không cần sửa riêng từng node)
- [ ] Bấm vào **ô màu** cạnh Tag, đổi màu khác — chip trên **cả 2
      node** đổi màu theo ngay
- [ ] Bấm nút **🗑** cạnh Tag — hộp thoại xác nhận hiện ra (không phải
      hộp thoại trắng của trình duyệt), xác nhận xoá — Tag biến mất
      khỏi bảng chọn VÀ khỏi chip trên cả 2 node cùng lúc
- [ ] Bấm **Ctrl+Z** sau khi xoá — Tag quay lại đúng cả bảng chọn lẫn
      chip trên cả 2 node (không phải chỉ 1 trong 2)
- [ ] Bấm nút **×** trên một chip Tag hiển thị trực tiếp trên node —
      gỡ đúng Tag đó khỏi riêng node này (không ảnh hưởng node khác
      đang cùng gắn Tag đó)
- [ ] Xuất JSON đầy đủ, "+ Mới", nhập lại — Tag và việc gắn Tag cho
      từng node được giữ nguyên
- [ ] Mở một file JSON **cũ** (trước P2.7e, còn dùng "Nhãn" chữ tự do
      — ví dụ file mẫu P2.2 nếu còn giữ) — tự nâng cấp lên schema 10,
      nhãn cũ tự động thành Tag (có màu), **không mất node nào, không
      mất nhãn nào**
- [ ] Xuất "Cây lồng nhau" (định dạng soạn tay), mở file đó bằng trình
      soạn thảo text — trường vẫn tên `"labels"` (chữ tự do), không
      phải mảng id khó đọc
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo


## Checklist kiểm thử tay — P2.7c Tree Up (làm trước khi coi cụm P2.7c là hoàn tất)

- [ ] Dựng map có ít nhất 3 tầng, một node cỡ chữ lớn hơn hẳn anh em
      của nó (để có chiều cao khác nhau). Đổi sang **"Tree Up"** trong
      ô chọn bố cục trên Toolbar
- [ ] **Kiểm tra:** cây lật lên trên — gốc DƯỚI CÙNG, các nhánh toả
      dần lên trên theo tầng, không chồng lấn
- [ ] **Kiểm tra quan trọng nhất:** node cỡ chữ lớn và anh em cỡ chữ
      thường của nó phải **thẳng hàng theo MÉP DƯỚI** (không phải mép
      trên) — nhìn kỹ đáy 2 node đó có bằng nhau không, dù chiều cao
      khác hẳn
- [ ] Bấm Ctrl+Z — quay lại đúng bố cục trước đó, một lần bấm
- [ ] Chọn node gốc, bấm mũi tên **Lên** — nhảy vào một con (con thật
      sự đang hiện phía trên). Bấm **Xuống** — không có gì (gốc không
      có cha)
- [ ] Chọn một node không phải gốc, bấm **Trái/Phải** — di chuyển đúng
      giữa các anh em cùng hàng, không nhảy nhầm lên cha/ông bà
- [ ] Từ một node, bấm **Lên** để vào con, bấm **Xuống** để quay lại —
      về đúng vị trí ban đầu
- [ ] Bật "🏷 Nhãn cha-con", đặt nhãn — nhãn nằm đúng giữa đường nối
      DỌC, chữ xoay hợp lý
- [ ] Kéo-thả (cả đổi thứ tự anh em lẫn đổi cha) — hoạt động bình
      thường
- [ ] Xuất JSON, nhập lại — giữ nguyên `layoutType: "treeUp"`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7c Organization Chart (làm trước khi coi phần này là xong)

- [ ] Dựng map có gốc + vài con + vài cháu. Đổi sang **"Organization
      Chart"** trong ô chọn bố cục trên Toolbar
- [ ] **Kiểm tra:** vị trí các node giống hệt Tree Down (gốc trên
      cùng, con xếp ngang hàng bên dưới), nhưng đường nối giờ là
      **góc vuông kiểu T** (đi ngang từ cha rồi rẽ vuông góc xuống
      con), không còn là đường cong
- [ ] Với một node có sẵn "Đường nối tới con" = Thẳng hoặc Cong trong
      panel — vẫn hiện góc vuông như mọi node khác (đúng vì Organization
      Chart cố tình BỎ QUA tuỳ chọn edgeShape riêng từng node, không
      phải lỗi)
- [ ] Bấm Ctrl+Z sau khi đổi sang Organization Chart — quay lại đúng
      bố cục trước đó, một lần bấm
- [ ] Bật "🏷 Nhãn cha-con", đặt nhãn cho một node — nhãn nằm đúng
      giữa đoạn đường NGANG (không lệch), chữ nằm NGANG THẲNG (không
      xoay nghiêng như ở Tree Down)
- [ ] Điều hướng phím (Lên/Xuống = cha/con, Trái/Phải = tìm anh em) —
      hoạt động giống hệt Tree Down, không có gì khác biệt
- [ ] Kéo-thả (cả đổi thứ tự anh em lẫn đổi cha) — hoạt động giống hệt
      Tree Down, không có gì khác biệt
- [ ] Xuất JSON, nhập lại — giữ nguyên `layoutType: "orgChart"`
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7c Tree Down (làm trước khi coi phần này là xong)

- [ ] Dựng map có ít nhất 3 tầng, vài node độ dài chữ khác nhau. Đổi
      sang **"Tree Down"** trong ô chọn bố cục trên Toolbar
- [ ] **Kiểm tra:** cây lật xuống dưới — gốc trên cùng, các con xếp
      NGANG HÀNG bên dưới, không chồng lấn dù độ rộng khác nhau
- [ ] Bấm Ctrl+Z — quay lại đúng bố cục trước đó, một lần bấm. Đổi lại
      Tree Down để tiếp tục
- [ ] Chọn node gốc, bấm mũi tên **Xuống** — nhảy vào một con; bấm
      **Lên** — không có gì (gốc không có cha). Đây là **đảo vai trò**
      so với layout ngang (ở đó Lên/Xuống dùng để tìm anh em)
- [ ] Chọn một node không phải gốc, bấm **Trái/Phải** nhiều lần — di
      chuyển đúng qua lại giữa các ANH EM CÙNG HÀNG (không nhảy nhầm
      lên node cha hay ông bà — đây đúng lỗi đã tự phát hiện và sửa
      trong lúc làm, xem mục "Những gì đã có" phía trên)
- [ ] Từ một node, bấm **Xuống** để vào con, bấm **Lên** để quay lại —
      về đúng vị trí ban đầu
- [ ] Bật "🏷 Nhãn cha-con", đặt nhãn cho một node — nhãn nằm đúng giữa
      đường nối DỌC (không lệch sang ngang), chữ xoay hợp lý theo
      hướng đường
- [ ] Kéo một node thả vào **khe hở giữa 2 anh em ngang hàng** (không
      phải thả vào thân node) — chèn đúng vị trí trong danh sách con,
      không bị lỗi hay đảo lộn (đây đúng phần đã sửa triệt để, khác
      Both Sides chỉ ghi nhận giới hạn)
- [ ] Kéo một node thả vào thân node khác (đổi cha) — vẫn hoạt động
      bình thường
- [ ] Đặt ưu tiên/tiến độ/ghi chú/link cho một node — icon **vẫn ở vị
      trí trái/phải quen thuộc** (chưa chuyển sang trên/dưới — đúng
      giới hạn đã thống nhất trước khi làm, không phải lỗi)
- [ ] Xuất JSON, nhập lại — giữ nguyên `layoutType: "treeDown"`
- [ ] Mở lại một file JSON cũ (trước P2.7c, không có giá trị
      "treeDown") — vẫn mở bình thường, không lỗi
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7b Bố cục Logic Both Sides (làm trước khi coi bước này là xong)

- [ ] Dựng một map có gốc + ít nhất 4-5 nhánh cấp 1, một vài nhánh có
      nhiều cháu (cao hẳn), một vài nhánh chỉ có 1-2 con (thấp). Đổi
      sang bố cục **"Logic Both Sides"** trong ô chọn trên Toolbar
- [ ] **Kiểm tra quan trọng nhất:** các nhánh CAO tự động tách RIÊNG,
      không bị nhét chung một bên với nhau nếu làm bên đó nặng hẳn so
      với bên kia — tổng thể 2 bên phải trông tương đối cân bằng, không
      lệch hẳn về một phía
- [ ] Không node nào chồng lên gốc hay chồng lên node khác, dù các
      nhánh cao/thấp xen kẽ
- [ ] Chọn một node ở NHÁNH BÊN PHẢI, bấm mũi tên **Trái/Phải** — hoạt
      động đúng như Logic Right thuần (Phải = vào con, Trái = về cha)
- [ ] Chọn một node ở NHÁNH BÊN TRÁI, bấm mũi tên **Trái/Phải** — hoạt
      động đúng như Logic Left (đảo nghĩa: Trái = vào con, Phải = về cha)
- [ ] Từ chính node GỐC, bấm mũi tên **Phải** — phải nhảy vào ĐÚNG một
      nhánh đang ở bên phải màn hình; bấm **Trái** — nhảy vào đúng một
      nhánh đang ở bên trái
- [ ] Đặt ưu tiên/tiến độ và ghi chú/link cho một node bên trái lẫn một
      node bên phải — icon soi gương đúng theo TỪNG BÊN của chính nó
      (không phải theo một hướng chung cho cả map)
- [ ] Bật "🏷 Nhãn cha-con", đặt nhãn cho cả một node bên trái lẫn một
      node bên phải — cả hai nhãn đều nằm đúng giữa đường nối thật của
      chính chúng, xoay đúng hướng
- [ ] Kéo một node ở nhánh BÊN TRÁI thả làm con của một node đang ở
      nhánh BÊN PHẢI (đổi cha, không chỉ sắp xếp lại) — vẫn hoạt động
      đúng, node đó tự chuyển sang đi theo hướng bên phải (kế thừa
      hướng của cha mới)
- [ ] Bấm Ctrl+Z sau khi đổi sang Logic Both Sides — quay lại đúng bố
      cục trước đó, một lần bấm
- [ ] Xuất JSON, nhập lại — giữ nguyên `layoutType: "logicBoth"`, bố
      cục hiện đúng lại 2 bên như trước khi xuất
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.7a Bố cục Logic Left (làm trước khi coi bước này là xong)

- [ ] Dựng một map có ít nhất 3 tầng, vài node độ dài chữ khác nhau
      (để có bề rộng khác nhau). Trong ô chọn bố cục trên Toolbar, đổi
      sang **"Logic Left"**
- [ ] **Kiểm tra:** toàn bộ cây LẬT SANG TRÁI ngay — gốc bên phải, các
      nhánh toả dần sang trái theo tầng, không có node nào chồng lấn
      lên node khác dù độ rộng khác nhau
- [ ] Bấm Ctrl+Z — quay lại đúng Logic Right, đúng 1 lần bấm
- [ ] Đổi lại Logic Left, chọn một node **không phải gốc**, bấm phím
      **mũi tên Trái** — phải nhảy ĐÚNG vào CON của node đó (con thật
      sự đang hiện ở bên trái màn hình) — đây là hành vi ĐẢO so với
      Logic Right
- [ ] Từ đó bấm **mũi tên Phải** — phải nhảy về ĐÚNG CHA (cha đang
      hiện ở bên phải màn hình)
- [ ] Bấm mũi tên **Lên/Xuống** — vẫn di chuyển giữa các node cùng
      hàng ngang theo đúng vị trí thị giác như trước, không bị ảnh
      hưởng bởi việc đổi layout
- [ ] Đặt độ ưu tiên và tiến độ cho một node — **kiểm tra huy hiệu ưu
      tiên và vòng tiến độ đã ĐỔI BÊN** so với lúc dùng Logic Right
      (ưu tiên giờ cắm mép phải, tiến độ giờ cắm mép trái)
- [ ] Thêm ghi chú và hyperlink cho một node — icon 📝 và 🔗 cũng đã
      đổi bên đúng theo layout
- [ ] Bật công tắc "🏷 Nhãn cha-con", đặt nhãn cho một node — nhãn vẫn
      nằm đúng giữa đường nối thật, chữ xoay đúng theo hướng đường
      (không bị lệch dù đường giờ đi từ phải sang trái)
- [ ] Kéo-thả một node sang làm con của node khác (khi đang ở Logic
      Left) — vẫn hoạt động bình thường, không bị lỗi hay đảo lộn
- [ ] Xuất JSON, nhập lại — giữ nguyên `layoutType: "logicLeft"`
- [ ] Mở lại một file JSON cũ (trước P2.7a, không có `layoutType`) —
      tự nâng cấp lên schema 9, mặc định Logic Right, map trông y hệt
      như trước khi nâng cấp
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6d Đa map (làm trước khi coi bước này là xong)

**Lưu ý quan trọng trước khi bắt đầu:** vì đổi hẳn cách lưu trữ (khoá
localStorage cũ `t17mind_autosave` không còn dùng nữa), lần đầu mở bản
này sẽ **KHÔNG thấy lại map đang dở từ bản P2.6c trở về trước** — đây
KHÔNG phải mất dữ liệu, chỉ là map cũ giờ nằm ở khoá cũ, ứng dụng bắt đầu
với một map trống mới. Nếu cần map cũ, xuất JSON từ bản P2.6c trước khi
chuyển hẳn sang bản này (nếu chưa kịp xuất, mở DevTools > Console, gõ
`localStorage.getItem("t17mind_autosave")` để lấy lại thủ công).

- [ ] Mở app lần đầu bằng bản này — thấy một map trống mới, không lỗi
- [ ] Gõ vài node, đợi vài giây (tự lưu), bấm nút **"📂 Map gần đây"**
      trên Toolbar — thấy đúng 1 dòng, tên khớp chữ node gốc, có chữ
      "đang mở" bên cạnh
- [ ] Đóng hộp thoại, bấm **"+ Mới"**, xác nhận tạo map thứ hai, gõ nội
      dung khác hẳn map đầu — mở lại "Map gần đây": thấy đúng **2 map**
      riêng biệt, map thứ hai có chữ "đang mở"
- [ ] Bấm **"Mở"** ở dòng map đầu tiên — chuyển đúng sang map đó, nội
      dung đúng như lúc gõ, KHÔNG lẫn nội dung của map thứ hai
- [ ] Mở lại "Map gần đây" — giờ map ĐẦU TIÊN có chữ "đang mở", đúng
      theo map vừa chuyển sang
- [ ] Bấm **"Đổi tên"** ở một map, gõ tên mới, Enter — tên đổi đúng
      trong danh sách, KHÔNG đổi chữ của node gốc trên canvas
- [ ] Tải lại trang trình duyệt (F5) — app tự khôi phục đúng map đang
      mở gần nhất (không phải map còn lại), đúng cả nội dung lẫn tên
      vừa đổi
- [ ] Bấm **"Xoá"** ở map KHÔNG đang mở — xác nhận, map đó biến mất
      khỏi danh sách, map đang mở không bị ảnh hưởng gì
- [ ] Bấm **"Xoá"** ở đúng map ĐANG MỞ — xác nhận, app tự chuyển sang
      một map trống mới ngay (không còn hiện nội dung của map vừa xoá,
      không bị lỗi hay đứng hình)
- [ ] Xuất JSON một map, mở file đó bằng trình soạn thảo văn bản — thấy
      có trường `mapId` trong file
- [ ] Nhập lại đúng file JSON đó — mở "Map gần đây": map nhập vào có
      cùng `mapId` với map gốc (không tự tách thành map riêng biệt) —
      cách kiểm nhanh: đổi tên map đó, xuất lại JSON, nhập lại lần nữa,
      xác nhận tên vẫn giữ đúng như đã đổi (chứng tỏ cùng một mapId,
      không sinh entry chỉ mục mới)
- [ ] Nhập một file JSON **cũ** (từ trước P2.6d, không có `mapId`) —
      nhập được bình thường, tự sinh mapId mới, xuất hiện đúng trong
      "Map gần đây"
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6c Font/độ trong suốt/panel gấp mở (làm trước khi coi bước này là xong)

- [ ] Mở một file JSON đã xuất từ P2.6b-3 trở về trước — tự nâng cấp
      lên schema 7, không lỗi, **mọi node trông y hệt như trước khi
      nâng cấp** (không có node nào tự nhạt màu chỉ vì mở bằng bản mới)
- [ ] Chọn một node, mở khối "Định dạng cơ bản" (bấm vào tiêu đề nếu
      đang gấp), chọn **"Times New Roman"** trong danh mục "Font chữ"
      (đã đổi từ ô gõ tự do sang danh mục xổ xuống — xem ghi chú sửa
      lỗi bên dưới) — chữ trong node đổi font ngay trên canvas
- [ ] Chọn lại **"Mặc định (hệ thống)"** — chữ trở về đúng font mặc
      định cũ
- [ ] Chọn **"Khác (tự gõ tên font)..."** — hiện thêm ô nhập tự do bên
      dưới, gõ tên font bất kỳ (ví dụ "Roboto") — vẫn áp dụng được,
      dành cho ai cần font ngoài danh mục có sẵn
- [ ] Kéo thanh trượt "Độ trong suốt" xuống 50% — màu nền node nhạt đi
      rõ rệt, thấy được các chấm nền canvas mờ mờ xuyên qua
- [ ] Kéo về 100% — màu nền trở lại đậm hoàn toàn như trước
- [ ] Bấm tick "Nền trong suốt" (ô cũ, khác thanh trượt mới) — cả màu
      nền lẫn thanh trượt "Độ trong suốt" đều MỜ ĐI, không dùng được
      (đúng vì lúc này không có màu nền nào để áp độ trong suốt lên)
- [ ] Bấm tiêu đề khối **"Định dạng cơ bản"** — toàn bộ nội dung khối
      đó gấp lại, mũi tên xoay hướng; bấm lại — mở ra đúng, giữ nguyên
      giá trị đã chỉnh trước đó (không bị mất khi gấp/mở)
- [ ] Lặp lại thao tác gấp/mở với cả 3 khối còn lại (Đường nối cha-con,
      Thuộc tính công việc, Chữ trong node)
- [ ] Gấp một khối lại, chọn sang node khác rồi chọn lại node cũ — khối
      đó **vẫn đang gấp** (trạng thái gấp/mở không tự reset khi đổi node)
- [ ] Xuất JSON, nhập lại — giữ nguyên font chữ và độ trong suốt đã đặt
- [ ] Xuất XLSX, mở bằng Excel — thấy đủ 2 cột mới `FontFamily`,
      `FillOpacity`; nhập lại đúng
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6b-3 Chữ xoay theo đường cong (làm trước khi coi bước này là xong)

- [ ] Bật công tắc "🏷 Nhãn cha-con" trên Toolbar (nếu chưa bật)
- [ ] Đặt một nhãn cha-con cho node mà cha và con nằm gần **cùng hàng
      ngang** (đường nối gần thẳng, ít cong) — nhãn hiện gần như nằm
      ngang, không nghiêng nhiều
- [ ] Kéo node con đó xuống thấp hơn hẳn (đường nối giờ cong dốc rõ) —
      nhãn tự **xoay nghiêng theo đúng độ dốc** của đường cong tại
      đúng vị trí đặt nhãn, không còn nằm ngang
- [ ] Kéo tiếp lên trên (đảo chiều độ dốc) — nhãn xoay theo chiều
      ngược lại đúng hướng đường mới, mượt mà không giật cục
- [ ] Đổi "Đường nối tới con" của node cha từ Cong sang **Thẳng** —
      nhãn vẫn xoay đúng theo góc của đường thẳng đó (không phải luôn
      nằm ngang mặc định)
- [ ] Với bất kỳ hướng nghiêng nào (dốc lên, dốc xuống, gần như dựng
      đứng) — chữ **luôn đọc được xuôi trái sang phải, không bao giờ
      lộn ngược hay đọc từ phải sang trái**
- [ ] Zoom in/out — nhãn xoay đúng và cỡ chữ tỉ lệ đúng theo zoom,
      không bị méo hay lệch vị trí khỏi đường
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6b-2 Nhãn cha-con + công tắc hiển thị (làm trước khi coi bước này là xong)

- [ ] Mở một file JSON đã xuất từ P2.6b-1 trở về trước — tự nâng cấp
      lên schema 6, không lỗi, **map trông y hệt như trước** (nhãn
      cha-con, liên kết, tóm tắt hiện/ẩn đúng như hành vi cũ — vì mặc
      định 3 công tắc là tắt/bật/bật khớp với "trước khi có tính năng
      này")
- [ ] Chọn một node **không phải gốc** — thấy ô "Nhãn trên đường nối"
      trong panel; chọn gốc chính hoặc một nhánh trôi — ô đó **biến
      mất** (không có cha nên không có gì để đặt nhãn)
- [ ] Gõ một nhãn vào ô đó cho một node — canvas **KHÔNG** hiện gì cả
      (vì công tắc "🏷 Nhãn cha-con" đang tắt mặc định), nhưng panel
      hiện đúng dòng nhắc "Đã đặt nhãn, nhưng công tắc... đang tắt"
- [ ] Bấm nút **"🏷 Nhãn cha-con"** trên Toolbar để bật — nhãn vừa gõ
      hiện ngay trên canvas, đúng vị trí **giữa đường nối** từ cha
      xuống đúng node đó (không lệch về phía cha hay phía con)
- [ ] Thử với cả node có đường nối **cong** lẫn đường nối **thẳng**
      (đổi "Đường nối tới con" của node cha) — nhãn cả hai trường hợp
      đều nằm đúng giữa đường thật, không lệch
- [ ] Bấm tắt nút "🏷 Nhãn cha-con" lại — mọi nhãn biến mất khỏi canvas
      ngay (dữ liệu vẫn còn, thử bật lại để xác nhận)
- [ ] Bấm nút **"🔗 Liên kết"** để tắt (nếu đang có liên kết chéo nào
      trên map) — mọi đường liên kết chéo biến mất khỏi canvas
- [ ] Bấm chuột vào đúng vị trí một liên kết chéo **vừa ẩn** — **không
      được chọn nhầm** thứ gì (đây là phép thử quan trọng nhất: xác
      nhận không còn vùng bấm chọn "ma" sót lại từ lúc còn hiện)
- [ ] Bật lại "🔗 Liên kết" — đường hiện lại đúng, bấm chọn được bình
      thường như trước
- [ ] Lặp lại 2 bước trên với nút **"{ } Tóm tắt"**
- [ ] Bấm Ctrl+Z sau khi bật/tắt một công tắc bất kỳ — quay lại đúng
      trạng thái trước đó
- [ ] Xuất JSON, nhập lại — giữ nguyên cả nhãn cha-con lẫn trạng thái
      3 công tắc
- [ ] Xuất XLSX, mở bằng Excel — thấy cột `EdgeLabel`; nhập lại đúng
      nội dung nhãn (3 công tắc hiển thị thì KHÔNG cần kiểm — XLSX
      không lưu được, đã ghi rõ trong hộp thoại hướng dẫn)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6b-1 Định dạng chữ node (làm trước khi coi bước này là xong)

- [ ] Mở một file JSON đã xuất từ P2.6 trở về trước — tự nâng cấp lên
      schema 5, không lỗi, **mọi node trông giống hệt như trước khi
      nâng cấp** (đây là mục quan trọng nhất — không có node nào tự đổi
      cỡ chữ/hình dạng chỉ vì mở bằng bản mới)
- [ ] Chọn một node, đặt **Cỡ chữ = 24** — chữ trong node to hẳn lên
      ngay, node tự cao/rộng thêm nếu cần để không bị tràn
- [ ] Xoá trắng ô Cỡ chữ (để trống) — chữ trở về đúng cỡ mặc định cũ
- [ ] Đặt **Căn lề = Trái** — chữ dồn sát mép trái node; đổi **Phải** —
      dồn sát mép phải; đổi lại **Giữa** — về đúng vị trí căn giữa cũ
- [ ] Node có Hyperlink hoặc Ghi chú (có icon góc) — thử căn lề Trái —
      icon góc và chữ không đè lên nhau
- [ ] Đặt **Cách hiển thị chữ = Tự xuống dòng**, gõ một đoạn dài — chữ
      tự ngắt xuống nhiều dòng, node tự cao thêm vừa đủ, không tràn
- [ ] Đặt lại **Rộng (px)** cho node đang ở chế độ "Tự xuống dòng" —
      đoạn chữ tự ngắt lại đúng theo bề rộng mới
- [ ] Đặt **Cách hiển thị chữ = Tự co chữ**, đặt **Rộng (px)** hẹp hơn
      nội dung cần — chữ tự thu nhỏ vừa đủ để hiện trọn 1 dòng, không
      bị cắt bằng "..." như trước
- [ ] Đổi lại **Cách hiển thị chữ = Tự động** — quay về đúng hành vi cũ
      (một dòng, cắt bằng "..." nếu node bị ép hẹp hơn nội dung)
- [ ] Xuất JSON, nhập lại — giữ nguyên cỡ chữ/căn lề/cách hiển thị
- [ ] Xuất XLSX, mở bằng Excel — thấy đủ 3 cột mới (FontSize, TextAlign,
      TextFit); nhập lại đúng
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.6 Theme + sao chép định dạng (làm trước khi coi P2.6 là xong)

- [ ] Dựng một map có ít nhất 3 tầng (gốc → con → cháu), chọn theme
      **"Blue"** trong ô chọn, bấm **"🎨 Áp dụng"**
- [ ] **Kiểm tra:** gốc/con/cháu nhận đúng 3 sắc độ xanh khác nhau theo
      đúng cấp, không bị lẫn
- [ ] Thử lần lượt cả 3 theme còn lại (Rainbow / Mono / Pastel) — mỗi
      lần đổi, canvas cập nhật đúng ngay, màu cũ không còn sót lại ở
      node nào
- [ ] Với theme **"Rainbow"**: mỗi nhánh cấp 1 (con trực tiếp
      của gốc) phải có màu RIÊNG BIỆT, không trùng nhánh khác; con cháu
      trong CÙNG một nhánh phải nhạt dần theo cấp (không đổi hẳn sang
      màu của nhánh khác)
- [ ] Tạo thêm một nhánh trôi (nút "☁ Nhánh trôi"), áp lại theme —
      **kiểm tra quan trọng nhất:** nhánh trôi có đủ gradient màu RIÊNG
      của chính nó (không bị coi như "con cháu sâu" của cây chính, tức
      không nhận màu nhạt nhất trong bảng dù nó chỉ ở cấp 0 của chính nó)
- [ ] Bấm Ctrl+Z sau khi áp theme — TOÀN BỘ map quay lại đúng màu cũ
      chỉ trong **một lần** bấm (không phải bấm nhiều lần mới lùi hết)
- [ ] Chọn một node đã có màu/viền ưng ý, bấm **"🖌 Sao chép định dạng"**
      — nút chuyển trạng thái "đang bật" (đổi màu nút)
- [ ] Bấm lần lượt vào 3 node khác nhau — cả 3 đều nhận đúng màu/viền
      của node nguồn, và **nút KHÔNG tự tắt** sau lần bấm đầu tiên (vẫn
      áp tiếp được cho node thứ 2, thứ 3)
- [ ] Kiểm tra kỹ một trong các node đích: **chữ/nội dung KHÔNG đổi**,
      chỉ màu/viền/kiểu đường nối đổi theo
- [ ] Bấm phím **Esc** — tắt chế độ sao chép định dạng, nút trở lại
      bình thường
- [ ] Chưa chọn node nào (hoặc chọn nhiều node cùng lúc) — nút "🖌 Sao
      chép định dạng" MỜ ĐI, không bấm được
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.5b Ghi chú dán (làm trước khi coi P2.5 là hoàn tất)

- [ ] Bấm nút **"📝 Ghi chú"** trên Toolbar — một ghi chú màu vàng hiện
      ra ở giữa khung nhìn hiện tại, tự vào chế độ gõ chữ ngay
- [ ] Gõ vài dòng dài (đủ để tự động xuống dòng), bấm Enter giữa chừng
      để xuống dòng thật — Enter KHÔNG lưu ngay, chỉ xuống dòng như gõ
      văn bản bình thường
- [ ] Bấm ra ngoài (rời ô) — nội dung lưu lại đúng, tờ giấy tự cao thêm
      vừa đủ để hiện hết chữ, không bị cắt
- [ ] Kéo tự do ghi chú dán sang vị trí khác trên canvas — di chuyển
      được, không dính vào node hay nhánh nào
- [ ] Đặt ghi chú dán đè lên một node bất kỳ — bấm vào chỗ đè lên đó
      phải chọn được **ghi chú dán** (không phải chọn nhầm node bên dưới)
- [ ] Chọn ghi chú dán, đổi màu trong panel — canvas cập nhật ngay
- [ ] Double-click vào ghi chú dán trên canvas — mở lại đúng ô sửa
      nhiều dòng tại đúng vị trí, gõ tiếp được
- [ ] Tạo 2-3 ghi chú dán liên tiếp — không chồng đúng lên nhau
- [ ] Bấm phím Delete khi đang chọn ghi chú dán — xoá đúng; Ctrl+Z khôi
      phục lại đúng cả nội dung lẫn vị trí
- [ ] Xuất JSON, nhập lại — ghi chú dán giữ nguyên nội dung/vị trí/màu
- [ ] Mở hộp thoại "Hướng dẫn định dạng" — xác nhận XLSX ghi rõ không
      hỗ trợ ghi chú dán
- [ ] Mở lại một file JSON cũ (trước P2.5b) — tự nâng cấp lên schema 4,
      không lỗi, không mất gì
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.5 Nhánh trôi (làm trước khi coi P2.5 là xong)

- [ ] Bấm nút **"☁ Nhánh trôi"** trên Toolbar (không cần chọn node nào
      trước) — một node mới hiện ra, tách biệt hẳn khỏi cây chính, tự
      vào chế độ gõ chữ ngay
- [ ] Bấm nút đó thêm 2 lần nữa — mỗi nhánh trôi mới xuất hiện ở vị trí
      khác nhau, không chồng lên nhánh trôi trước hay lên cây chính
- [ ] Thêm con vào một nhánh trôi (Tab như bình thường) — layout tự
      xếp đúng, giống hệt cách cây chính hoạt động
- [ ] Kéo tự do một nhánh trôi (kéo ra vùng trống, không thả lên node
      khác) — di chuyển được, cả cây con của nó đi theo
- [ ] Kéo một nhánh trôi **thả lên một node trong cây chính** — nhánh
      trôi gắn lại vào cây chính đúng như thao tác kéo-thả-đổi-cấu-trúc
      bình thường đã có từ P1.8
- [ ] Bấm Ctrl+Z ngay sau bước trên — nhánh trôi tách trở lại độc lập
      đúng như trước khi gắn
- [ ] Chọn một node đang có con **trong cây chính** (không phải gốc),
      bấm nút **"✂ Tách nhánh"** — nó tách khỏi cây chính, trở thành
      nhánh trôi độc lập, dịch xuống dưới để không chồng vị trí cũ
- [ ] Bấm Ctrl+Z — nhánh vừa tách quay lại đúng vị trí cũ trong cây chính
- [ ] Bấm chọn node gốc chính (`Chủ đề trung tâm`) — nút "✂ Tách nhánh"
      phải MỜ ĐI, không tách được gốc chính
- [ ] Tạo một Khoanh vùng (hoặc liên kết chéo) có node thành viên nằm
      trong một nhánh trôi — vẽ đúng, không lỗi
- [ ] Xoá cả một nhánh trôi (chọn gốc nhánh trôi, bấm Delete) — nếu
      nhánh đó đang là thành viên của một Khoanh vùng, khoanh vùng đó
      tự dọn theo (không còn tham chiếu "mồ côi"); Ctrl+Z khôi phục
      đúng cả nhánh trôi lẫn khoanh vùng
- [ ] Bấm mũi tên Xuống/Lên khi đang chọn node trong cây chính, gần
      biên với một nhánh trôi ở gần đó về mặt vị trí — điều hướng vẫn
      hoạt động hợp lý, không bị lỗi hay bỏ sót
- [ ] Mở Ctrl+F, tìm một từ khoá chỉ có trong nhánh trôi — vẫn tìm ra,
      nhảy tới đúng, canh giữa khung nhìn
- [ ] Xuất JSON, nhập lại — giữ nguyên mọi nhánh trôi, đúng vị trí
- [ ] Xuất XLSX, nhập lại — giữ nguyên mọi nhánh trôi (kiểm thêm: mở
      file XLSX bằng Excel, xác nhận có nhiều dòng để trống cột
      ParentID — mỗi dòng đó là một gốc)
- [ ] Mở lại một file JSON rất cũ (từ Phase 1, trước cả P2.2) — vẫn mở
      đúng, không lỗi (P2.5 không đổi schema nên không cần di trú thêm)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.4 (làm trước khi coi P2.4 là xong)

- [ ] Mở một file JSON đã xuất từ P1.10 (hoặc từ Phase 1/P2.1–P2.3) — tự
      nâng cấp lên schema 3, không báo lỗi, không mất node nào
- [ ] Chọn 2 node ở **hai nhánh khác nhau hoàn toàn** (không cùng cha) —
      bấm nút "▭ Khoanh vùng" trên Toolbar
- [ ] Khung nền bo góc hiện ra bao trọn cả 2 node đó, kể cả phần khoảng
      trống ở giữa hai nhánh — đây chính là điều Tóm tắt không làm được
- [ ] Thử tương tự với chỉ 1 node được chọn — vẫn tạo được khoanh vùng
      quanh đúng 1 node
- [ ] Đổi màu nền, màu viền trong panel — canvas cập nhật ngay
- [ ] Sửa nhãn trong panel (hoặc double-click vào nhãn trên canvas) —
      đổi đúng nội dung hiển thị trên khung
- [ ] Kéo một node đang nằm bên trong khoanh vùng sang vị trí khác —
      khung tự vẽ lại đúng theo vị trí mới, bao trọn đủ mọi thành viên
- [ ] Bấm vào **vùng nền bên trong** khung (chỗ trống, không phải nhãn
      hay viền) rồi kéo — phải kích hoạt **marquee chọn vùng** như bình
      thường, KHÔNG di chuyển hay chọn nhầm khoanh vùng
- [ ] Bấm đúng vào **viền mỏng** của khung (mép ngoài) — chọn được
      khoanh vùng, panel chuyển đúng sang giao diện Boundary
- [ ] Thu gọn một nhánh có node đang là thành viên của khoanh vùng —
      khung tự vẽ lại nhỏ hơn (bỏ qua thành viên đang ẩn), không "trôi"
      tới vị trí cũ
- [ ] Bấm nút "Xoá khoanh vùng" (hoặc phím Delete khi đang chọn) — xoá
      đúng, các node bên trong KHÔNG bị xoá theo
- [ ] Ctrl+Z sau khi tạo khoanh vùng — quay lại đúng, không còn khung nào
- [ ] Xuất JSON, nhập lại — khoanh vùng giữ nguyên đủ nhãn/màu/thành viên
- [ ] Xuất XLSX — mở hộp thoại "Hướng dẫn định dạng", xác nhận có ghi rõ
      XLSX không hỗ trợ khoanh vùng (đúng như tài liệu)
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.3 (làm trước khi coi P2.3 là xong)

- [ ] Chọn một node, thấy 2 thẻ "Định dạng" và "Ghi chú" ở đầu panel
- [ ] Bấm thẻ "Ghi chú", gõ vài dòng — ô tự giãn cao theo nội dung, không
      bị cuộn ẩn khi còn ít chữ
- [ ] Gõ xong, bấm chọn sang node khác rồi bấm lại về node cũ — ghi chú
      còn nguyên
- [ ] Đang gõ dở (chưa rời ô), đợi khoảng 1 giây không gõ tiếp, rồi chọn
      sang node khác luôn (không đợi rời ô) — quay lại node cũ, ghi chú
      vẫn được lưu (không mất đoạn vừa gõ)
- [ ] Gõ một đoạn ghi chú, rời khỏi ô, bấm Ctrl+Z **một lần** — toàn bộ
      đoạn vừa gõ biến mất, không phải lùi từng chữ/từng đợt lưu tạm
- [ ] Node đang xem thẻ "Định dạng" nhưng đã có ghi chú từ trước — thấy
      chấm nhỏ trên thẻ "Ghi chú" báo hiệu, không cần bấm vào mới biết
- [ ] Xoá trắng hết nội dung ghi chú, rời ô — chấm báo hiệu trên thẻ biến
      mất
- [ ] Node có ghi chú hiện icon 📝 ở góc trên-trái trên canvas, đối xứng
      với icon 🔗 (nếu node đó cũng có link) ở góc trên-phải
- [ ] Bấm nút thu gọn ở góc panel — toàn bộ panel biến mất, chỉ còn một
      nút nhỏ để mở lại
- [ ] Bấm nút đó — panel mở lại đúng, giữ nguyên thẻ đang xem trước đó
- [ ] Xuất JSON, nhập lại — ghi chú giữ nguyên
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P1.10 Tìm kiếm (bù nợ, làm sau P2.3)

- [ ] Bấm **Ctrl+F** ở bất kỳ đâu (kể cả đang gõ trong ô ghi chú/panel) —
      ô tìm kiếm nổi lên giữa canvas, không phải hộp "Tìm trong trang" của
      trình duyệt
- [ ] Gõ một từ có trong `text` của một node, bấm Enter — nhảy tới đúng
      node đó, node nằm **ĐÚNG GIỮA** khung nhìn (không chỉ lọt vào mép)
- [ ] Node kết quả có viền xanh (cùng màu viền chọn) đậm nhạt "phập
      phồng" trong khoảng 1-2 giây rồi tự tắt — khung KHÔNG đổi kích
      thước, chỉ đổi độ đậm nhạt
- [ ] Trong lúc đang nhấp nháy, bấm chọn sang một node khác (bấm chuột
      trực tiếp) — vòng nhấp nháy tắt ngay, không "đuổi theo" sang node
      không liên quan
- [ ] Có từ khoá khớp nhiều node — Enter liên tiếp nhảy lần lượt qua từng
      kết quả, số đếm góc phải ô tìm kiếm tăng đúng (`1/5`, `2/5`...)
- [ ] Enter ở đúng kết quả cuối cùng — quay vòng về kết quả đầu tiên, số
      đếm về lại `1/n`
- [ ] Gõ không dấu (ví dụ "gap") — vẫn tìm ra node có dấu ("gấp")
- [ ] Gõ một từ chỉ có trong **ghi chú** (không có trong tên node) — vẫn
      tìm ra đúng node đó
- [ ] Gõ một từ chỉ có trong nhánh **đang thu gọn** — Enter nhảy tới, nhánh
      tự bung ra để lộ node đó, không chỉ chọn ngầm một node vô hình
- [ ] Bung xong, bấm Ctrl+Z **một lần** — nhánh thu gọn lại đúng như trước
      khi tìm (bung nhiều tổ tiên cùng lúc cũng chỉ tính 1 bước hoàn tác)
- [ ] Gõ từ khoá không tồn tại — hiện đúng chữ "Không có kết quả"
- [ ] Đổi sang từ khoá khác giữa chừng — Enter đầu tiên của từ khoá mới
      nhảy tới kết quả ĐẦU TIÊN của nó, không tiếp tục đúng vị trí cũ
- [ ] Bấm Esc khi đang gõ trong ô tìm kiếm — đóng ô lại
- [ ] Bấm nút "🔍 Tìm kiếm" trên Toolbar — mở ô tìm kiếm giống hệt Ctrl+F
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.2 (làm trước khi coi P2.2 là xong)

- [ ] Mở một file JSON đã xuất từ P2.1 (hoặc từ Phase 1) — tự nâng cấp lên
      schema 2, không báo lỗi, không mất node nào
- [ ] Chọn một node, đặt Độ ưu tiên = 1 — huy hiệu tròn đỏ hiện ở mép trái
      node, đúng số "1" bên trong
- [ ] Đổi ưu tiên qua 2, 3, 4, 5 — màu huy hiệu đổi theo (đỏ → cam → vàng →
      xanh dương → xám), số đổi đúng
- [ ] Chọn "Không" trong ô ưu tiên — huy hiệu biến mất hẳn khỏi canvas
- [ ] Đặt Tiến độ = 0 — vòng tròn ở mép phải chỉ hiện viền xám, KHÔNG có
      cung màu nào (không phải chấm hay vệt vẽ thừa)
- [ ] Đặt Tiến độ = 100 — vòng tròn tô kín trọn 360°, màu xanh lá, không bị
      méo hay hở một khoảng nào
- [ ] Đặt Tiến độ = 50 — đúng nửa vòng tròn có màu, nửa còn lại vẫn xám
- [ ] Xoá ô Tiến độ về trống — vòng tròn biến mất hẳn
- [ ] Gõ một nhãn vào ô "Nhãn", bấm Enter — nhãn hiện dạng viên thuốc màu
      xanh nhạt ở đáy node, node tự cao thêm một chút để chứa
- [ ] Thêm 2-3 nhãn nữa — node tự rộng ra nếu các viên thuốc dài hơn chữ
      chính, không bị cắt hay chồng lên nhau
- [ ] Bấm dấu × trên một viên thuốc — nhãn đó biến mất, node tự co bớt nếu
      không còn nhãn nào
- [ ] Bấm chọn 2-3 biểu tượng trong lưới — icon hiện thành một hàng nổi
      phía TRÊN node, không đè lên chữ hay viên thuốc
- [ ] Bấm lại đúng biểu tượng đã chọn — tắt đi, biến mất khỏi hàng icon
- [ ] Node có đủ cả nhãn lẫn node khác nằm ngay bên dưới nó trong cây —
      hai node không chồng lên nhau (layout tự chừa đủ chỗ)
- [ ] Xuất JSON, nhập lại — giữ nguyên đủ ưu tiên/tiến độ/nhãn/biểu tượng
- [ ] Xuất XLSX, mở file bằng Excel/Google Sheets — thấy đúng 4 cột mới
      (Markers, Progress, Priority, Labels), nhãn/biểu tượng cách nhau bằng
      dấu phẩy trong một ô
- [ ] Nhập lại đúng file XLSX đó — khôi phục đúng cả 4 thuộc tính
- [ ] Đổi Tiến độ của một node, bấm Ctrl+Z — quay lại giá trị cũ đúng
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

## Checklist kiểm thử tay — P2.1 (làm trước khi coi P2.1 là xong)

- [ ] Chọn một node — panel bên phải hiện đúng màu/viền/link/kích thước
      của đúng node đó
- [ ] Đổi màu nền trong panel — thấy canvas cập nhật ngay, không cần bấm
      thêm gì
- [ ] Chọn node khác — nội dung panel đổi theo ngay, không còn dữ liệu của
      node cũ sót lại
- [ ] Chọn một liên kết chéo — panel chuyển đúng sang giao diện liên kết
      (nhãn, màu, nét đứt, nút làm thẳng/xoá), không lẫn với panel node
- [ ] Chọn một tóm tắt — panel chuyển đúng sang giao diện tóm tắt
- [ ] Chọn nhiều node (Ctrl/Shift+click hoặc kéo vùng) — panel hiện đúng
      số lượng và gợi ý bấm Tóm tắt
- [ ] Bấm nút "Hướng dẫn định dạng" trên Toolbar — hộp thoại mở đúng, bấm
      "Đã hiểu" hoặc bấm ra ngoài — đóng đúng
- [ ] Bấm "Tạo liên kết" trên Toolbar — nút đổi màu "active", huỷ bằng Esc
      hoặc tạo xong liên kết — nút tự hết active (không bị kẹt sáng)
- [ ] Nút Hoàn tác/Làm lại/Xoá/Tóm tắt tự mờ đúng lúc không dùng được (ví
      dụ Xoá mờ khi đang chọn đúng node gốc)
- [ ] Nhập JSON/XLSX qua nút trên Toolbar vẫn hoạt động bình thường
- [ ] `npm run check` chạy sạch — 0 lỗi TypeScript, 0 lỗi Svelte

## Checklist kiểm thử tay — P1.5–P1.8 (đợt trước, làm lại nếu chưa từng làm)

Đánh dấu từng dòng khi tự tay thử trên trình duyệt:

**Hoàn tác / làm lại (P1.6)**
- [ ] Thêm vài node, Ctrl+Z liên tiếp về đúng trạng thái ban đầu
- [ ] Ctrl+Shift+Z làm lại đúng thứ tự đã hoàn tác
- [ ] Xoá một nhánh có nhiều node con, Ctrl+Z phục hồi đủ, kể cả liên
      kết chéo và tóm tắt từng trỏ vào nhánh đó
- [ ] Hoàn tác rồi thao tác mới — không còn "làm lại" được thao tác cũ nữa
- [ ] Rê chuột vào nút Hoàn tác/Làm lại thấy đúng tên bước sắp chạy

**Sao chép / dán / nhân bản (P1.7)**
- [ ] Copy một nhánh, dán sang Notepad/Word ra đúng danh sách thụt lề
- [ ] Copy văn bản thụt lề từ Word, dán vào ứng dụng ra đúng cây
- [ ] Ctrl+D nhân bản một node ra đúng anh em kế tiếp, giữ nguyên định dạng
- [ ] Dán nhiều lần liên tiếp từ cùng một lần copy — không bị trùng id lỗi

**Kéo thả đổi cấu trúc (P1.8)**
- [ ] Kéo một node thả lên thân node khác — trở thành con, cả cây con đi theo
- [ ] Kéo thả vào khe giữa hai node anh em — chèn đúng vị trí
- [ ] Kéo một node thả lên chính con cháu của nó — bị chặn, không đổi gì
- [ ] Kéo nhẹ rồi thả tại chỗ (không đủ ngưỡng di chuyển) — không tạo bước
      hoàn tác nào, không có gì đổi
- [ ] Kéo ra vùng trống không có node nào bên dưới — giữ hành vi "kéo tự do"
      như bản cũ (chỉ dịch vị trí hiển thị)
- [ ] Nhấn Esc giữa lúc đang kéo — huỷ, node về đúng vị trí cũ

**Chung (P1.3 — hành vi giữ nguyên so với bản v3)**
- [ ] Nhập/xuất JSON, XLSX vẫn đúng như bản cũ
- [ ] Mở lại một file JSON đã xuất từ bản HTML một-file CŨ (trước
      TypeScript) — phải mở được nhờ `migrate.ts`
- [ ] Marquee chọn vùng, Ctrl/Shift+click chọn nhiều, tạo tóm tắt, tạo
      liên kết chéo, uốn đường liên kết, đổi màu/viền/link trong panel —
      tất cả còn hoạt động

**Điều hướng và thu gọn (P1.9)**
- [ ] Chọn một node, bấm `→` — nếu nhánh đang mở, chọn sang con đầu tiên;
      nếu nhánh đang thu gọn hoặc không có con, không có gì xảy ra
- [ ] Bấm `←` từ một node con — quay về đúng node cha
- [ ] Bấm `↓` lặp lại nhiều lần từ node đầu tiên — đi hết các anh em rồi
      tự động nhảy sang nhánh lân cận, không bị kẹt ở node cuối
- [ ] Bấm `↑` đi ngược lại đúng thứ tự vừa đi bằng `↓`
- [ ] Bấm `Home` từ bất kỳ đâu — quay về node gốc, khung nhìn tự cuộn tới
      nếu gốc đang nằm ngoài tầm nhìn
- [ ] Điều hướng tới một node đang nằm ngoài mép canvas (đã kéo/zoom ra xa)
      — khung nhìn tự dịch vừa đủ để node đó lọt vào trong, không giật
      hay canh giữa màn hình
- [ ] Bấm `?` — bảng phím tắt hiện ra đầy đủ; bấm lại `?` hoặc nút Đóng —
      biến mất
- [ ] Thu gọn một nhánh có đang chứa đường liên kết chéo hoặc nằm trong
      một tóm tắt — đường liên kết/ngoặc tóm tắt phải "gom" về đúng node
      cha đang hiển thị, không trôi tới vị trí cũ trong khoảng trống
- [ ] Bấm chuột trực tiếp vào chấm tròn của một nhánh đang thu gọn — bung
      ra ngay, không cần chọn node rồi bấm phím `C`
- [ ] Cuộn chuột để zoom trong khi con trỏ đang ở một góc màn hình (không
      phải chính giữa) — điểm dưới con trỏ giữ nguyên vị trí, không trôi

## Về file lớn (~545KB) sau khi build

Bản build hiện lớn hơn file HTML v3 cũ (~63KB) vì hai lý do cộng dồn:

1. Thư viện `xlsx` đóng gói thẳng vào file thay vì tải từ CDN (~430KB) —
   đánh đổi lấy khả năng chạy hoàn toàn offline, quyết định từ P1.4.
2. Runtime Svelte 5 + 3 component (P2.1) — thêm khoảng **41KB**.

**Lệch so với kế hoạch gốc:** bản kế hoạch P2.1 ước tính mức tăng "dưới
30KB" — đó là ước lượng đặt ra TRƯỚC khi thực sự làm, giờ đo được thật là
~41KB. Ghi lại đúng số thật ở đây thay vì để nguyên số ước tính cũ, dù nó
không đẹp bằng. Không phải lỗi chức năng gì — 545KB vẫn tải tức thời trên
mọi máy — chỉ là ước lượng ban đầu hơi lạc quan.

Nếu muốn quay lại dùng CDN cho nhẹ file, sửa `src/io/xlsx.ts` để `import`
từ URL CDN thay vì `import * as XLSX from "xlsx"`. Trước mắt cứ giữ như
vậy — nhẹ tuyệt đối chỉ nên đánh đổi khi thực sự cần.

## Cảnh báo bảo mật đã biết

`npm audit` báo 1 lỗ hổng mức cao trong gói `xlsx` (ReDoS và prototype
pollution khi phân tích file — xem
`GHSA-4r6h-8v6p-xvw6` và `GHSA-5pgg-2g8v-p4x9`). Đây là lỗi đã biết của
gói `xlsx` trên npm registry, chưa có bản vá công khai qua npm tính đến
thời điểm viết README này. Rủi ro thực tế thấp cho một ứng dụng cá nhân
chỉ mở file do chính bạn tạo ra, nhưng **không mở file XLSX từ nguồn
không tin cậy** cho tới khi vấn đề này được theo dõi lại.

## Về Simple Browser trong VS Code

Ứng dụng test được trong Simple Browser (tab mở bằng lệnh `Simple
Browser: Show`). Ba hàm hộp thoại gốc của trình duyệt
(`window.alert`/`confirm`/`prompt`) đã được thay bằng hộp thoại tự vẽ
(`src/ui/dialog.ts`), và việc dán (Ctrl+V) đã đổi sang đọc dữ liệu trực
tiếp từ sự kiện `paste` tự nhiên thay vì gọi `navigator.clipboard.readText()`
(`src/ui/appController.ts#onNativePaste`) — cả hai đều là API cần xin
quyền qua hộp thoại riêng của trình duyệt, hộp thoại đó không hoạt động
trong Simple Browser. Sau hai lần sửa này, mọi thao tác đã test đều chạy
giống nhau ở cả Simple Browser lẫn trình duyệt thật.

Nếu sau này thêm tính năng mới mà thấy cần `window.confirm`/`alert`/
`prompt`, hoặc `navigator.clipboard.readText()` — **đừng dùng trực
tiếp**, sẽ lặp lại đúng lỗi này. Dùng lại `src/ui/dialog.ts` cho hộp
thoại, và dùng sự kiện `paste`/`copy` tự nhiên thay vì Clipboard API khi
cần đọc dữ liệu clipboard.

---

## M1 — Card & Block (17/10/2026)

Thêm Card (tờ nội dung độc lập, gắn vào node qua `node.cardId`) chứa các khối Văn bản / Bảng / Ảnh / Biểu đồ. Schema 16 → 17. Xem `docs/ROADMAP.md` (mục 0 và M1) để biết quyết định thiết kế và phần còn lại.

- Lõi: `src/core/cards.ts` (tạo/kiểm tra), `src/core/cardCommands.ts` (Command, undo/redo), nối `validate.ts`, `migrate.ts`, `MergeMapCommand`.
- Giao diện: `src/ui/components/CardSection.svelte` trong SidePanel.
- Lỗi thật bắt được nhờ test: `MergeMapCommand.revert()` ban đầu quên khôi phục `map.cards` — test "ghép 2 lần rồi hoàn tác 2 lần" so sánh JSON toàn map đã phát hiện.

---

## M2 — Bảng biểu (17/10/2026)

Trình sửa bảng, dán từ Excel/Google Sheets, nhập/xuất CSV, thẻ thu nhỏ của bảng trên node. Không đổi schema (vẫn 17) — chỉ dùng `TableBlock` đã có từ M1.

- Lõi: `src/core/table.ts` — hàm thuần trên **bản nháp** (`TableDraft` = bảng + `colOrigin`): thêm/xoá hàng/cột, căn lề, hàng tiêu đề, `pasteGrid`, `parseDelimited`/`toDelimited`/`detectDelimiter` (TSV/CSV kiểu Excel), `nextCell` (Tab/Enter), `tableThumbnail`, `remapChartColumns`.
- Command: `UpdateTableCommand` (`core/cardCommands.ts`) — lưu cả phiên sửa thành **một** bước hoàn tác; dùng `colOrigin` để biểu đồ lấy số từ bảng vẫn trỏ đúng cột sau khi chèn/xoá cột (nếu không, `validate.ts` sẽ báo cột ngoài phạm vi). Nhập CSV thành khối mới dùng lại `AddBlockCommand`.
- Giao diện: `src/ui/components/TableEditorModal.svelte` (mở qua `tableEditorStore` trong `uiStores.ts`); nút "Sửa…" / bấm bản xem trước / "Nhập CSV…" ở `CardSection.svelte`.
- Canvas: `src/render/tableThumb.ts` (hình học thẻ, dùng chung cho `getMeasurer`, `drawNode`, `hitTestTableThumb`, `hitTestCheckbox`); bấm thẻ trên canvas mở trình sửa (`appController.ts`). `hitTestCheckbox` giờ nhận thêm `map` vì vùng chữ phải trừ phần thẻ.
- Phím trong hộp thoại bị chặn không lan ra window (kể cả khi tiêu điểm còn ở ngoài, qua listener pha capture) — nếu không, Delete/Ctrl+Z của canvas sẽ chạy nhầm trên map khi đang sửa bảng.
- Sửa kèm: `#side-panel .small-btn { width: 100% }` thắng `.card-add > .btn` về độ ưu tiên CSS nên hàng nút ↑ ↓ ✕ của khối (từ M1) bị tràn khỏi panel.
- Lỗi thật bắt được khi chạy thử trên trình duyệt: mở trình sửa bằng cách bấm thẻ trên canvas thì mousedown kéo tiêu điểm về `body` → Esc không đóng được hộp thoại. Sửa bằng cách hoãn focus một nhịp + listener capture nói trên.
- Sửa sau phản hồi thử trên exe (20/10): kéo node to ra mà thẻ vẫn chỉ 5×4 ô cố định. Giờ lúc vẽ thẻ lấp đầy khoảng trống thật (`thumbLayoutForTable(table, box, capped)`): node kéo to tay hiện thêm hàng/cột, ô giãn tới 140px; node tự động giữ trần 5×4. Phần đo chữ tách thành `measureTextBox` để biết chữ chiếm bao nhiêu chỗ.
- Test: `core/table.test.ts`, `render/tableThumb.test.ts`, thêm nhóm `UpdateTableCommand` trong `core/cardCommands.test.ts` (172 test / 16 file).

### Checklist kiểm thử tay — M2 (làm trước khi coi M2 là xong)

- [ ] Chọn node → mục Card → "+ Tạo card cho node" → "+ Bảng 3×3" — node trên canvas hiện thẻ bảng nhỏ bên dưới chữ, node tự cao/rộng ra, không chồng lên node khác
- [ ] Bấm "Sửa…" (hoặc bấm bản xem trước trong panel, hoặc bấm thẻ trên canvas) — hộp thoại sửa bảng mở, con trỏ ở ô A1
- [ ] Gõ chữ, Tab sang phải; Tab ở ô cuối cùng tự thêm hàng mới; Shift+Tab đi lùi
- [ ] Enter đi xuống, Enter ở hàng cuối tự thêm hàng; Shift+Enter đi lên; Alt+Enter xuống dòng ngay trong ô
- [ ] Copy một vùng ô trong Excel (hoặc Google Sheets), dán vào một ô giữa bảng — dữ liệu rải đúng từ ô đó, bảng tự nở thêm hàng/cột; ô có dấu phẩy/xuống dòng giữ nguyên
- [ ] Dán một chữ đơn (copy 1 ô) — chỉ vào đúng ô đang sửa, không tạo thêm hàng
- [ ] + Hàng trên/dưới, − Hàng, + Cột trái/phải, − Cột chạy theo ô đang chọn; không xoá được hàng/cột cuối cùng
- [ ] Căn Trái/Giữa/Phải đổi căn lề cả cột, thẻ trên canvas cũng căn theo
- [ ] Bỏ tick "Hàng tiêu đề" — hàng đầu hết in đậm cả trong hộp thoại lẫn trên thẻ
- [ ] "Xuất CSV" → mở bằng Excel: tiếng Việt hiển thị đúng, đúng số hàng/cột
- [ ] "Nhập CSV…" trong hộp thoại thay nội dung bảng (hỏi xác nhận nếu bảng đã có dữ liệu); CSV dùng dấu `;` (Excel vùng Việt Nam) cũng đọc đúng
- [ ] "Nhập CSV…" ở mục Card thêm một khối bảng mới, tên bảng = tên file
- [ ] Lưu → Ctrl+Z **một lần** — toàn bộ thay đổi của phiên sửa biến mất; Ctrl+Shift+Z làm lại
- [ ] Sửa rồi bấm Huỷ / Esc / bấm ra ngoài — hỏi "Bỏ các thay đổi chưa lưu?"; chưa sửa gì thì đóng luôn
- [ ] Đang mở hộp thoại, bấm Delete khi tiêu điểm ở nút bấm — node trên canvas KHÔNG bị xoá
- [ ] Kéo node có bảng to ra (hoặc đặt Rộng/Cao trong panel) — thẻ hiện thêm hàng/cột, ô rộng ra; "Đặt lại kích thước tự động" — thẻ về 5×4
- [ ] Bảng lớn (ví dụ 20×10) — thẻ chỉ hiện 5 cột × 4 hàng, có "…" bên phải và bên dưới; chữ dài bị cắt bằng "…"
- [ ] Node có cả Tag và bảng — thẻ nằm trên hàng Tag, không đè nhau; node có checkbox hoàn thành vẫn bấm checkbox được
- [ ] Xuất `.t17m`/JSON rồi mở lại — bảng giữ nguyên
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

---

## M3 — Hình ảnh (20/10/2026)

Nhiều ảnh mỗi node (khối ảnh trong card), chú thích, cỡ hiển thị, dán/kéo-thả ảnh, tự thu nhỏ/nén, thẻ ảnh trên node với bitmap cache. **Schema 17 → 18.**

- Dữ liệu: `ImageBlock.size` ("small" | "medium" | "large", mặc định "medium") — migrate 17→18 và bước chuẩn hoá cuối `migrateToLatest` (dữ liệu ghi 18 nhưng thiếu/sai size). `ImageAsset.width/height` tuỳ chọn (không cần migrate; renderer bỏ qua giá trị sai). `io/t17m.ts` giữ lại hai trường này khi lưu/mở.
- Lõi: `core/image.ts` (`planImageResize`, `totalAssetBytes`…), `buildAddImagesToNodeCommand` trong `core/cardCommands.ts` (tạo card nếu chưa có + các `AddBlockCommand`, gộp bằng `CompositeCommand` = một bước hoàn tác).
- UI: `ui/imageImport.ts` (giải mã bằng `createImageBitmap`, vẽ lại bằng canvas khi cần thu nhỏ/nén), `AppController.addImagesToNode` / `openNodeImages`, dán ảnh trong `onNativePaste`, kéo-thả trên canvas (`onFileDrop`), `showImageGallery` trong `ui/dialog.ts`, khối ảnh trong `CardSection.svelte` (giờ nhận thêm `controller`).
- Canvas: `render/imageThumb.ts` (hình học thẻ ảnh — ảnh đầu tiên của card, huy hiệu "+N"; nằm trên thẻ bảng). `CanvasRenderer` cache bitmap thu nhỏ theo assetId, `onImageReady` báo `main.ts` vẽ lại (hoặc tính lại layout nếu trước đó chưa biết kích thước ảnh).
- Ảnh co giãn theo node (yêu cầu thêm, 20/10): node đã kéo cỡ tay thì thẻ ảnh co/giãn cho vừa chỗ còn lại, giữ tỉ lệ (`fitImageLayout`); node có cả bảng thì ảnh chỉ co. Node chỉ đặt rộng tay thì ảnh co theo bề ngang ngay từ bước đo. Bitmap cache giữ tới 560px chiều cao cho ảnh giãn to vẫn nét.
- Quyết định: clipboard có cả chữ lẫn ảnh thì **dán chữ** — Excel copy ô luôn kèm một ảnh PNG của vùng ô, nếu ưu tiên ảnh thì dán bảng từ Excel ra canvas sẽ thành ảnh.
- Test: `core/image.test.ts`, `render/imageThumb.test.ts`, thêm round-trip kích thước ảnh trong `io/t17m.test.ts` (192 test / 18 file). Chạy thử trên Chromium: dán ảnh 3000×2000 → lưu 1920×1280; thả 2 ảnh → 3 khối, "+2" trên node; đổi cỡ Lớn; xem lớn ←/→; 4 lần Ctrl+Z về đúng trạng thái đầu.

### Checklist kiểm thử tay — M3 (làm trước khi coi M3 là xong)

- [ ] Chụp màn hình (Win+Shift+S), chọn một node, Ctrl+V — node có card mới (nếu chưa có) chứa khối ảnh, ảnh hiện trên node
- [ ] Copy vùng ô trong Excel rồi Ctrl+V lên canvas — vẫn ra các node chữ như trước, KHÔNG thành ảnh
- [ ] Kéo 2–3 file ảnh từ Explorer thả lên một node — thêm đủ ảnh, trên node hiện ảnh đầu + "+N"
- [ ] Thả ảnh ra vùng trống — có thông báo "Thả ảnh lên đúng một node…"; thả file không phải ảnh — có thông báo
- [ ] Mục Card → "+ Ảnh…" chọn nhiều file cùng lúc — thêm đủ
- [ ] Đổi "Cỡ Nhỏ / Vừa / Lớn" — ảnh trên node đổi chiều cao, node tự co giãn, không đè node khác
- [ ] Kéo tay nắm góc node nhỏ lại — ảnh co theo (giữ tỉ lệ); kéo to ra — ảnh to theo (node có cả bảng thì ảnh chỉ co, không to thêm); "Đặt lại kích thước tự động" — ảnh về cỡ đã chọn
- [ ] Gõ chú thích → hiện dưới ảnh khi xem lớn
- [ ] Bấm ảnh trên node (hoặc ảnh nhỏ trong panel) — xem lớn; ‹ › và phím ←/→ chuyển ảnh; Esc đóng; trong lúc xem, Delete không xoá node
- [ ] Ảnh rất lớn (ảnh chụp điện thoại 4000px) — chèn xong vẫn mượt, file `.t17m` không phình quá
- [ ] Node vừa có ảnh vừa có bảng và Tag — thứ tự từ trên xuống: chữ, ảnh, bảng, Tag; bấm ảnh mở xem lớn, bấm bảng mở trình sửa
- [ ] Xoá khối ảnh → Ctrl+Z trả lại đúng ảnh
- [ ] Dán/thả nhiều ảnh → Ctrl+Z **một lần** gỡ hết loạt ảnh đó
- [ ] Lưu `.t17m`, mở lại — ảnh, chú thích, cỡ giữ nguyên; mở map cũ (trước M3) — không lỗi
- [ ] "Chọn ảnh..." (ảnh nhúng kiểu cũ) với ảnh lớn — vẫn chạy, ảnh đã được thu nhỏ
- [ ] `npm run check` chạy sạch — 0 lỗi, 0 cảnh báo

---

## Đổi cỡ cột/hàng trong bảng (20/10/2026)

Theo yêu cầu sau khi thử M2 trên exe. **Schema 18 → 19.**

- Dữ liệu: `TableBlock.colWidths` / `rowHeights` (px trong trình sửa, mặc định 130 / 28, kẹp 40–600 / 24–300). Migrate 18→19 điền mặc định; bước chuẩn hoá cuối `migrateToLatest` sửa mảng thiếu/sai độ dài/không phải số dương (giữ lại giá trị còn dùng được). `validateCard` kiểm tra độ dài và giá trị.
- Lõi (`core/table.ts`): `setColWidth`, `setRowHeight`, `autoFitColWidth` (giống bấm đúp mép cột trong Excel), `autoFitRowHeight`; mọi thao tác chèn/xoá/dán/nhập CSV giữ hai mảng khớp số cột/hàng, cột cũ giữ cỡ đã chỉnh.
- Trình sửa: tay nắm ở mép phải tiêu đề cột và mép dưới số hàng (kéo để đổi, bấm đúp để vừa khít). Vẫn nằm trong bản nháp → Lưu = một `UpdateTableCommand`.
- Thẻ trên node (`render/tableThumb.ts`): `ThumbLayout.colW[]` thay cho `cellW` — cột theo đúng tỉ lệ `colWidths` (130px ↔ 46px trên thẻ, tối thiểu 18px), cùng giãn một hệ số khi node rộng.
- Lỗi bắt được khi chạy thử: tay nắm cột ban đầu thò ra ngoài ô tiêu đề 4px và bị ô kế bên (cũng `position: sticky`, cùng z-index) che → kéo không ăn, chỉ bấm đúp cột cuối là chạy. Sửa bằng cách để tay nắm nằm trọn trong ô.
- Test: thêm nhóm "Đổi cỡ cột/hàng" trong `core/table.test.ts`, test tỉ lệ cột trong `render/tableThumb.test.ts` (199 test).

### Checklist kiểm thử tay — đổi cỡ cột/hàng

- [ ] Rê chuột vào mép phải chữ A/B/C ở tiêu đề cột — con trỏ thành ↔; kéo sang phải/trái — cột rộng/hẹp theo
- [ ] Rê vào mép dưới số hàng — con trỏ thành ↕; kéo — hàng cao/thấp theo (ô nhiều dòng hiện đủ chữ)
- [ ] Bấm đúp mép cột — cột vừa khít chữ dài nhất; bấm đúp mép hàng — hàng vừa đủ ô nhiều dòng nhất
- [ ] Lưu → thẻ trên node vẽ cột rộng/hẹp đúng tỉ lệ; Ctrl+Z một lần — về cỡ cũ
- [ ] Chèn/xoá cột, dán từ Excel — cột đã chỉnh vẫn giữ cỡ, cột mới cỡ mặc định
- [ ] Mở map cũ có bảng (trước bản này) — không lỗi, cột/hàng cỡ mặc định

