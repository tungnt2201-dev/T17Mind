# T17Mind — Lộ trình v1.x: Bảng biểu · Hình ảnh · Biểu đồ · Kết xuất .md/.docx · Hướng Heptabase

> Phần 1–4 là lộ trình nội dung/xuất file. **Phần 5 (cuối file)** là các tính năng học từ Heptabase và cách chúng nối vào phần 1–4 — đọc cả hai trước khi bắt đầu M1.

## 1. Ý tưởng cốt lõi: "Khối nội dung" (Block)

Hiện mỗi node chỉ có chữ, ghi chú, link và **một** ảnh (`imageAssetId`). Thay vì thêm từng trường riêng cho bảng, biểu đồ…, ta thêm **một khái niệm chung**: node có thể mang **danh sách khối nội dung có thứ tự**.

```ts
// src/core/types.ts (ĐÃ CÀI ĐẶT ở M1)
type Block = TextBlock | TableBlock | ImageBlock | ChartBlock;   // mỗi khối có id duy nhất TRONG card

interface Card { id: string; title: string; blocks: Block[] }    // blocks lưu NGAY TRONG card, có thứ tự

// MindNode:  cardId: string | null        (nhiều node có thể trỏ cùng một card)
// MindMap:   cards: Record<string, Card>  (cùng khuôn với tags, assets)
// TableBlock: { headerRow, align[], cells: string[][] }  — luôn hình chữ nhật
// ImageBlock: { assetId, caption }                        — dữ liệu ảnh ở map.assets
// ChartBlock: { kind, tableBlockId, labelColumn, seriesColumns[] } — lấy số từ bảng CÙNG card
```

Vì sao thiết kế vậy:
- **Giống mẫu đã chạy tốt** của Tag (P2.7e) và Ảnh (P2.10): dữ liệu nặng nằm ở cấp map, node chỉ giữ id → copy/xoá/gộp map (MergeMapCommand) xử lý thống nhất.
- **Biểu đồ không chứa số riêng** mà trỏ tới bảng → sửa bảng, biểu đồ tự cập nhật; tránh dữ liệu trùng.
- Thêm loại khối mới sau này (code, sơ đồ nhỏ, file đính kèm…) không phải đổi schema.

## 2. Các giai đoạn

Mỗi giai đoạn = 1 milestone GitHub, chia thành các issue nhỏ, mỗi issue 1 PR. Mọi thay đổi dữ liệu đi qua Command (undo/redo) và có test.

### M1 — Nền móng Card & Block ✅ (hoàn thành 17/10/2026, còn các mục ghi chú bên dưới)
- [x] Kiểu dữ liệu `Card`/`Block`, `node.cardId`, `map.cards`; **migrate schema 16 → 17** (có guard cho dữ liệu cũ). *(Khối nằm trong `card.blocks`, không có `node.blockIds`/`map.blocks`.)*
- [ ] Chuyển `imageAssetId` cũ và `notes` thành khối của card — **hoãn** sang bước riêng sau khi card ổn định (xem mục 0.3); hiện giữ nguyên cả hai.
- [x] Command (`core/cardCommands.ts`): Create/Attach/Detach/DeleteCard, RenameCard, AddBlock, ReplaceBlock, RemoveBlock, MoveBlock (+ test undo/redo trả về đúng trạng thái).
- [x] `validate.ts`: kiểm tra `cardId`, ảnh, biểu đồ→bảng, bảng hình chữ nhật, id khối trùng.
- [x] JSON phẳng và `.t17m` round-trip đầy đủ card; MergeMap mang theo card (đổi id card, remap ảnh). *Chưa làm:* copy/paste/nhân bản node mang theo card (hiện cũng chưa mang ảnh/tag — cùng hạn chế sẵn có), JSON lồng nhau chưa có card.
- [x] SidePanel: mục **Card** (`CardSection.svelte`): tạo/gắn/gỡ/xoá card, đổi tên, thêm Văn bản/Bảng, sắp xếp, xoá khối, sửa chữ.

### M2 — Bảng biểu ✅ (hoàn thành 17/10/2026, còn các mục ghi chú bên dưới)
- [x] Trình sửa bảng (`TableEditorModal.svelte`): thêm/xoá hàng/cột, hàng tiêu đề, căn lề, Tab/Enter di chuyển ô (Tab ở ô cuối / Enter ở hàng cuối tự thêm hàng), Alt+Enter xuống dòng trong ô. Sửa trên bản nháp (`core/table.ts`), bấm Lưu → **một** `UpdateTableCommand` = một bước hoàn tác; Command này đưa cột của biểu đồ cùng card về đúng chỗ khi chèn/xoá cột.
- [x] Kéo mép tiêu đề cột / số hàng để đổi độ rộng cột, chiều cao hàng; bấm đúp mép = vừa khít chữ (`TableBlock.colWidths/rowHeights`, **schema 18 → 19**). Thẻ trên node vẽ cột theo đúng tỉ lệ (hàng trên thẻ vẫn cao đều).
- [x] **Dán từ Excel/Google Sheets** (TSV, hiểu ngoặc kép/ô nhiều dòng, tự nở bảng) và nhập CSV (tự nhận `,` / `;`, bỏ BOM) — cả trong trình sửa lẫn nút "Nhập CSV…" ở mục Card; xuất bảng ra CSV (UTF-8 có BOM để Excel đọc đúng tiếng Việt). Giới hạn 1000 hàng × 100 cột.
- [x] Hiển thị trên canvas: node hiện **thẻ thu nhỏ** của bảng đầu tiên trong card (tối đa 5×4 ô, phần còn lại "…"); bấm thẻ mở trình sửa. Node được kéo to tay thì thẻ lấp đầy chỗ trống (thêm hàng/cột, ô giãn rộng). *Chưa làm:* thẻ chưa có trong xuất SVG (node vẫn cao đúng nhưng phần thẻ để trống).
- [x] Đo chiều cao node có tính khối (`render/tableThumb.ts` dùng chung cho đo/vẽ/dò bấm): ô thẻ có bề rộng cố định nên bước đo không phải đo chữ; chữ đã cắt cho vừa ô được cache theo object bảng (WeakMap, tự hết hạn khi Command thay bảng mới).

### M3 — Hình ảnh (nâng cấp) ✅ (hoàn thành 20/10/2026, còn các mục ghi chú bên dưới)
- [x] Nhiều ảnh mỗi node (khối ảnh trong card), chú thích, đổi cỡ hiển thị Nhỏ/Vừa/Lớn (node kéo cỡ tay thì ảnh co/giãn theo node) (`ImageBlock.size`, **schema 17 → 18**). Xem lớn có ‹ › / phím ←/→ giữa các ảnh của card.
- [x] Dán ảnh từ clipboard (Ctrl+V khi clipboard chỉ có ảnh — copy ô Excel kèm ảnh PNG vẫn dán chữ như cũ), kéo-thả file ảnh vào node, chọn nhiều file ở mục Card; node chưa có card thì tự tạo; cả loạt là một bước hoàn tác. Tự thu nhỏ về cạnh dài 1920px và nén (JPEG 0.85, giữ PNG nếu có nền trong suốt; GIF/SVG giữ nguyên); cảnh báo khi tổng ảnh của map vượt 25 MB. Ảnh nhúng kiểu cũ (`imageAssetId`) cũng được thu nhỏ khi chọn.
- [x] Cache bitmap thu nhỏ (`CanvasRenderer.imageCache`, theo assetId) để vẽ canvas mượt; kích thước gốc lưu trong `ImageAsset.width/height` (tuỳ chọn, `.t17m` giữ lại) nên đo layout không phải chờ giải mã. *Chưa làm:* xuất SVG chưa có ảnh/bảng; xuất PNG chỉ có ảnh của node đã từng hiện trên màn hình (ảnh chưa giải mã ra ô giữ chỗ).

### M4 — Biểu đồ
- [ ] Bộ vẽ biểu đồ **tự viết nhỏ gọn** (cột / đường / tròn) sinh ra **chuỗi SVG** — một đường code dùng chung cho canvas, xuất ảnh và docx. Không kéo thêm thư viện biểu đồ nặng.
- [ ] Trình sửa: chọn bảng nguồn, cột nhãn, cột số liệu, loại biểu đồ, bảng màu theo theme.
- [ ] Hiển thị thẻ thu nhỏ trên node; bấm để xem lớn.

### M5 — Kết xuất tài liệu (.md và .docx) ✅ (hoàn thành 20/10/2026)
Mô hình chung (một lần, dùng cho cả hai định dạng): **cây map → "tài liệu"** gồm tiêu đề / đoạn / danh sách / bảng / ảnh (`core/docModel.ts`).
- [x] Hộp thoại tuỳ chọn (Xuất → "Tài liệu Word / Markdown…", hoặc chuột phải node → "Xuất nhánh này thành tài liệu…"): cả map hay chỉ nhánh đang chọn; số cấp đầu → tiêu đề (H1…H6, sâu hơn thành danh sách); kèm ghi chú / nội dung card / ảnh; mục lục; dòng "Sẽ gồm…" đếm trước nội dung. Biểu đồ (M4 chưa làm) xuất tạm thành dòng "[Biểu đồ: …]".
- [x] **Markdown**: bảng → bảng GFM (căn lề, thoát `|`, xuống dòng → `<br>`); ảnh → nhúng base64 trong một file `.md`, hoặc **.zip** gồm `.md` + thư mục `assets/`; mục lục có liên kết neo.
- [x] **DOCX**: thư viện `docx` (nạp lười — bản PWA tách chunk riêng ~122 KB gzip; bản một file/exe tăng ~440 KB vì phải gộp hết); kiểu tiêu đề chuẩn Word, danh sách gạch đầu dòng lồng nhau, bảng Word thật (độ rộng cột theo tỉ lệ, căn lề, hàng tiêu đề tô nền), ảnh thật (PNG/JPEG/GIF/BMP; WebP/SVG thành dòng chú thích), mục lục (trường TOC — Word hỏi cập nhật khi mở). Ảnh biểu đồ SVG → PNG để dành cho M4.
- [x] Test "tự kiểm chứng": xuất rồi giải nén/đọc lại (document.xml, zip), so khớp số tiêu đề/hàng/cột/ảnh với map gốc.
- [x] **Nhập Markdown** → map (tiêu đề/danh sách → node, đoạn văn → ghi chú, bảng GFM và ảnh nhúng → card) — Tệp → Mở… hoặc Nhập → Nhập Markdown.

### M6 — Hoàn thiện
- [ ] Hiệu năng với map lớn có nhiều khối (culling cũng áp dụng cho thẻ khối).
- [ ] Bản desktop: xem mục rủi ro #1.
- [ ] Cập nhật README, ví dụ map mẫu, ảnh chụp màn hình.

## 3. Rủi ro / quyết định cần chốt sớm

1. ✅ *(20/10/2026: đã chuyển sang hộp thoại Lưu/Mở của Neutralino — `io/nativeFs.ts`; còn cần xác nhận trên Windows thật)* **Lưu file trên bản .exe (Neutralino/WebView2)**: tải file kiểu trình duyệt (blob + `<a download>`) có thể không hoạt động ổn trong cửa sổ Neutralino. Xuất `.docx/.md/.zip` là tính năng cốt lõi, nên cần **kiểm tra trên Windows ngay ở M1**; nếu lỗi sẽ dùng hộp thoại lưu của Neutralino (`os.showSaveDialog` + `filesystem.writeBinaryFile`) và mở thêm đúng các quyền đó trong `nativeAllowList`.
2. **Bảng có công thức?** Đề xuất v1: chỉ chữ/số thô; tính toán chỉ ở biểu đồ. Công thức để sau.
3. **Cỡ file `.t17m`**: ảnh lớn làm nặng — cần nén và cảnh báo.
4. **Layout**: node có khối cao hơn bình thường; nên vẽ khối dạng thẻ có kích thước tối đa cố định để bố cục không "nổ".
5. **Tầng module** (giữ quy tắc `ui → render → layout → core`): bộ vẽ biểu đồ và mô hình tài liệu là hàm thuần chỉ phụ thuộc `core`; `io/docx.ts`, `io/markdownDoc.ts` dùng chúng, không import `ui`.

## 4. Quy trình làm việc trên GitHub

- Nhánh `main` luôn xanh (CI: check + test + build). Mỗi tính năng: nhánh `feat/<tên>` → Pull Request → merge.
- Mỗi gạch đầu dòng ở trên = 1 Issue, gắn Milestone M1…M6.
- Commit message không dấu (quy ước dự án). Gắn tag `vX.Y.Z` để workflow tự build bản Windows.
- Tính năng nào có thay đổi dữ liệu: luôn kèm migration + test.

---

## 0. Quyết định đã chốt (17/10/2026)

1. **Card ở trong map, id toàn cục (phương án A).** `map.cards`, `node.cardId`; map vẫn là file độc lập.
2. **T17Mind vẫn là phần mềm mindmap, có thêm card.** KHÔNG làm canvas whiteboard tự do (H4 bị loại). Section/mũi tên kiểu Heptabase đã có phần tương đương qua nhánh trôi + đường liên kết.
3. `notes` hiện tại **giữ nguyên** ở M1 (không migrate ngay, tránh vỡ tìm kiếm/xuất file/icon ghi chú); sẽ gộp vào card ở một bước riêng sau khi card ổn định.

## 5. Định hướng kế thừa Heptabase

Nguồn tham khảo: video *Heptabase Fundamentals 101: Sense-making with whiteboards* (kênh Heptabase) và wiki công khai của Heptabase (Fundamental Elements, User Interface Logic, Mindmap, Heptabase 1.0, Public Roadmap). Lưu ý: không lấy được phụ đề video; nội dung video được hiểu qua các chương (tạo card trên whiteboard, thư viện card, trích ghi chú từ sách, trích từ PDF, **tổng hợp kiến thức từ nhiều nguồn bằng mindmap**, "giá trị cốt lõi") và đối chiếu với wiki. Cần xem lại video để bổ sung chi tiết thao tác.

### 5.1 Tư tưởng cốt lõi của Heptabase

1. **Card là đơn vị tri thức, sống trong Thư viện (Card Library)**, không thuộc về bảng nào. *Một card xuất hiện được trên nhiều whiteboard mà không nhân bản.*
2. **Whiteboard chỉ là nơi sắp xếp không gian** (không sở hữu card): đặt card, nhóm vào **Section**, nối bằng **mũi tên**, lồng **whiteboard con**.
3. **Mindmap là một đối tượng trên whiteboard**; node có thể là chữ hoặc card; "Turn into new card" biến node thành card, kéo card vào node để thành nhánh.
4. **Liên kết hai chiều** (`@card`, backlinks, hover preview) → mạng tri thức thay cho cây thư mục.
5. **Đọc → trích → tổng hợp**: highlight từ PDF/sách thành card, rồi sắp xếp các card đó lại bằng whiteboard/mindmap (đây là "sense-making" mà video nhấn mạnh).
6. **Bảng dữ liệu (Tag Database)**: tag + thuộc tính → xem dạng Table / Kanban.
7. Thêm: Journal (nhật ký ngày), Inbox (thu thập nhanh), tìm kiếm toàn cục + Command Palette, chế độ Focus, tab/sidebar, xuất Markdown/PDF/ảnh.

### 5.2 Đối chiếu với T17Mind

| Heptabase | T17Mind hiện có | Đề xuất |
|---|---|---|
| Card (note dạng block: bảng, ảnh, code, to-do…) | Node + ghi chú + 1 ảnh | **Card = tập khối nội dung** (chính là Block ở phần 1, nâng lên thành tài liệu có tiêu đề) |
| Card Library | Chưa có | Thư viện card (H1) |
| Whiteboard + Section + mũi tên | Nhánh trôi, đường liên kết, đa map | **Canvas tự do** (H4) |
| Mindmap trên whiteboard | **Là thế mạnh của T17Mind** | Giữ nguyên, thêm "node ↔ card" |
| Backlinks / `@` | Chưa có | Liên kết node/card hai chiều (H2) |
| Highlight PDF → card | Chưa có | Đọc PDF & trích (H5) |
| Tag Database (Table/Kanban) | Tag, tiến độ, ưu tiên, Explorer | Chế độ xem Bảng/Kanban (H3) |
| Global Search / Command Palette | Tìm kiếm cơ bản | Command Palette (rẻ, làm sớm) |
| Journal, Inbox | Chưa có | Tuỳ chọn, sau cùng |
| AI (Chat/Actions) | Không | **Ngoài phạm vi** (xem 5.4) |

### 5.3 Quyết định kiến trúc cần chốt trước M1 — "Card ở đâu?"

Phần 1 đặt Block ở cấp **map** (an toàn, dễ nhập/xuất `.t17m`). Heptabase đặt Card ở cấp **thư viện dùng chung nhiều bảng**. Hai hướng:

- **(A) Card trong map, id toàn cục (khuyến nghị).** Mỗi Card có `id` duy nhất toàn cục (UUID), nằm trong `map.cards`; node trỏ `cardId`. Map vẫn là file độc lập, xuất/nhập dễ. Khi làm Thư viện (H1) thì "nâng" card lên cấp workspace mà không phải đổi id; trong lúc chờ, dùng "Sao chép kèm liên kết nguồn".
- **(B) Thư viện workspace ngay từ đầu.** Đúng tinh thần Heptabase nhất, nhưng mọi thứ phức tạp hơn: xuất `.t17m` phải gói cả card được tham chiếu, xoá card phải kiểm tra mọi map, migrate dữ liệu đa map hiện có.

→ **ĐÃ CHỌN (A)**: đổi M1 thành "Card & Block": `Card { id, title, blockIds }`, `node.cardId`, ghi chú hiện tại (`notes`) migrate thành khối văn bản đầu tiên của card. Làm vậy mọi việc ở M2–M5 (bảng, ảnh, biểu đồ, xuất .md/.docx) vẫn đúng, chỉ đổi "khối thuộc node" thành "khối thuộc card của node".

### 5.4 Các milestone bổ sung (đặt sau M5, hoặc xen kẽ theo ý bạn)

**H0 — Rẻ, thấy giá trị ngay (làm cùng lúc với M1–M2)**
- [x] **Menu chuột phải** (chèn thêm theo yêu cầu, 20/10/2026): đổi theo chỗ bấm — node / nhiều node / đường liên kết / tóm tắt / khoanh vùng / ghi chú dán / vùng trống; mỗi mục ghi kèm phím tắt. Bản exe chặn menu mặc định của WebView2 (trừ ô nhập chữ).
- [ ] **Command Palette** (Ctrl+K): gõ tìm hành động; **tìm kiếm toàn cục** (Ctrl+O) trên node/card/tag.
- [ ] **"Biến node thành card"** / **"Biến nhánh thành card"** (xuất cả nhánh thành văn bản trong một card) / **"Sao chép nhánh dạng Markdown"** — đều có trong roadmap Heptabase.
- [ ] Xoá node **không xoá nhánh con** (con được nâng lên cha) — Heptabase vừa thêm.

**H1 — Thư viện Card** ✅ phần trong một map (20/10/2026)
- [x] Khung "Thư viện" bên phải (nút 📖 trên thanh công cụ): danh sách, tìm theo nội dung (không phân biệt dấu — tên, văn bản, ô bảng, chú thích ảnh), lọc Tất cả / Inbox / Đang dùng và theo Tag của các node đang gắn card; **kéo card thả vào map** thành node (thả lên node → nhánh con, vùng trống → nhánh trôi tại chỗ thả); nút "Gắn vào node đang chọn", "Thêm làm nhánh con".
- [x] "Card này đang xuất hiện ở đâu": danh sách node đang gắn card (trong Thư viện và mục Card của node), bấm để nhảy tới. *Chưa làm:* card dùng chung **giữa nhiều map** — cần chốt cách "nâng" card lên cấp workspace (mục 5.3): đồng bộ thật hay "sao chép kèm liên kết nguồn".
- [x] Hộp thư **Inbox**: "+ Card nhanh" tạo card chưa gắn node nào, sửa ngay trong Thư viện (kể cả thêm ảnh/bảng).
- [x] *(bổ sung theo phản hồi)* Node hiện trích văn bản của card; node kéo quá nhỏ → hàng biểu tượng đính kèm (bấm mở card); **trang card** (văn bản/ảnh/bảng xen kẽ, sửa trên trang); thẻ card nổi (giả 3D) trong Thư viện.

**H2 — Liên kết hai chiều** ✅ (20/10/2026, trừ mục tuỳ chọn)
- [x] Gõ `@` hoặc `[[` trong khối văn bản để liên kết tới card/node (gợi ý không phân biệt dấu, ↑↓ Enter); liên kết lưu ngay trong chữ dạng `[[card:id|Tên]]` / `[[node:id|Tên]]` (không đổi schema), hiển thị bằng tên hiện tại của đích; **Backlinks** ("Được nhắc tới ở") trong mục Card của node, trang card và Thư viện; rê chuột lên liên kết (trang card) xem trước đích. *Hạn chế:* ô văn bản ở thanh bên vẫn hiện token thô — xem dạng chữ đẹp trong trang card.
- [x] Đường liên kết giữa node sinh từ liên kết `@`: nút "↗ Vẽ đường liên kết cho N nhắc tới" ở mục Card.
- [ ] Đồ thị liên kết (tuỳ chọn).

**H3 — Dữ liệu có cấu trúc: Bảng & Kanban**
- [ ] Thuộc tính cho node/card (chữ, số, ngày, chọn một/nhiều, trạng thái) — mở rộng Tag/tiến độ/ưu tiên hiện có.
- [ ] Chế độ xem **Bảng** (sắp xếp, lọc, nhóm) và **Kanban** (kéo thẻ đổi trạng thái); xuất bảng ra CSV/Excel (đã có xlsx).
- [ ] Biểu đồ (M4) có thể lấy nguồn từ bảng thuộc tính này.

**H4 — Canvas tự do (Whiteboard) — ĐÃ LOẠI khỏi phạm vi (xem mục 0), giữ lại để tham khảo**
- [ ] Một tầng "Bảng trắng" chứa các **đối tượng**: map (mindmap), card, ảnh, ghi chú dán, **Section** (nhóm có tự co giãn), **mũi tên**; lồng bảng trắng con.
- [ ] Tận dụng nhánh trôi + đa map + đường liên kết hiện có; map hiện tại trở thành một loại đối tượng. Chế độ **Focus** (chỉ hiện đối tượng liên quan), **Tidy up** cho Section, **Minimap** (đã có), **xuất ảnh whiteboard** (đã có xuất PNG).
- [ ] **Đây là bước lớn nhất, thay đổi cách nhìn của cả app** — chỉ nên làm sau khi H1–H2 ổn định. Cân nhắc kỹ: T17Mind có nên vẫn là "phần mềm mindmap" hay thành "bảng trắng tri thức"?

**H5 — Đọc & trích (Reading → Cards)**
- [ ] Mở **PDF** (pdf.js, tải lười): chọn chữ/vùng → highlight → **tạo card/node kèm nguồn (trang, file)**; bấm card nhảy về đúng chỗ trong PDF.
- [ ] Nhập highlight từ file/định dạng khác (Markdown, Readwise-CSV…) — sau.
- [ ] Quy trình mẫu theo video: *trích ghi chú từ sách/PDF → mỗi ý một card → kéo các card vào mindmap để tổng hợp*.

**H6 — Tuỳ chọn:** Journal (nhật ký ngày + công việc), tab/đa cửa sổ, đồng bộ (không bắt buộc, offline-first là ưu điểm).

### 5.5 Gợi ý thứ tự thực hiện

```
M1 (Card & Block) + H0  →  M2 Bảng  →  M3 Ảnh  →  H1 Thư viện  →  H2 Backlinks
   →  M5 Xuất .md/.docx  →  M4 Biểu đồ  →  H3 Bảng/Kanban  →  H5 PDF  →  H4 Canvas
```

Lý do: M1+H0 tạo nền Card dùng chung; H1–H2 biến app thành mạng tri thức (giá trị cốt lõi Heptabase) trước khi đầu tư canvas lớn; **xuất .md/.docx (M5) nên có sớm** vì là mục tiêu thực dụng bạn nêu; H4 để cuối vì rủi ro và công sức lớn nhất.

### 5.6 Những thứ KHÔNG nên sao chép
- **AI Chat/Actions** của Heptabase (đòi hỏi máy chủ/API trả phí; trái hướng offline, file nhỏ).
- **Đồng bộ thời gian thực/ứng dụng di động**: ngoài phạm vi; PWA đã đủ dùng trên điện thoại.
- Giữ nguyên các lợi thế riêng của T17Mind: một file/portable nhỏ, offline, bố cục mindmap nhiều kiểu, tự vẽ canvas hiệu năng cao.
