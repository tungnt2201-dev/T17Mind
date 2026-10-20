# T17Mind Knowledge Workspace — Đánh giá khả thi & Lộ trình

> Lập ngày 20/10/2026, dựa trên tài liệu "Bộ prompt phát triển T17Mind hướng tới Heptabase" (bản tóm tắt 8 gói G1–G8). Bộ 13 file Markdown của Prompt Pack **không được đính kèm**, nên đánh giá này dựa trên bảng G1–G8, các quy tắc trong prompt khởi động và mã nguồn hiện tại (schema 19, 245 test).

## 0. Hiện trạng kỹ thuật liên quan

| Hạng mục | Hiện có | Ảnh hưởng tới G1–G8 |
|---|---|---|
| Lưu trữ | IndexedDB, mỗi map một bản ghi (`io/storage.ts`); bản exe là IndexedDB của WebView2, cổng cố định 52717 | Dữ liệu "Workspace" nằm trong trình duyệt hoặc WebView2, **không nằm cạnh file exe**. CLI/MCP bên ngoài không đọc được trực tiếp. |
| Card | `map.cards`, id toàn cục, `node.cardId`, card Inbox, Thư viện trong một map, liên kết `[[card:id\|…]]`, backlinks | Nền tốt cho G1/G2: id đã là toàn cục, chỉ thiếu tầng dùng chung giữa nhiều map. |
| Khối | text (chữ thuần), table, image, chart (chờ M4) | G4 phải đổi mô hình văn bản: rủi ro lan sang tìm kiếm, liên kết, xuất .md/.docx. |
| Undo/Redo | Command chạy trên **một** `MindMap` | Phần dùng chung giữa nhiều map (G1) phải thiết kế để vẫn hoàn tác được. |
| Exe | Neutralino 6.1; native API cho phép: hộp thoại mở/lưu, đọc/ghi file | Chưa có phím tắt toàn hệ thống. Có `filesystem` (cần thêm vào allow-list nếu dùng watcher/readDirectory). |
| Thư viện ngoài | docx, jszip, xlsx (SheetJS 0.18) | G7 đọc được Excel ngay. PDF (G3) cần thêm pdf.js, khá nặng. |
| Quyết định đã chốt | Không làm whiteboard tự do (ROADMAP mục 0) | Phần "Section" của G8 phải chuyển thể cho mindmap. |

---

## 1. Phân loại

### 1.1 KHẢ THI (làm được với kiến trúc hiện tại, rủi ro thấp)

| # | Điểm | Thuộc gói | Ghi chú triển khai |
|---|---|---|---|
| K1 | Tìm kiếm toàn Workspace (mọi map: node, ghi chú, card, ô bảng, chú thích ảnh), không phân biệt dấu | G2 | Đọc mọi map từ IndexedDB rồi dựng chỉ mục trong bộ nhớ, cập nhật dần khi lưu. Tái dùng `cardSearchText`. |
| K2 | Command Palette (Ctrl+K) + mở nhanh (Ctrl+O) | G2 / H0 | Đã có trong ROADMAP H0. |
| K3 | Liên kết **cấp block** `[[card:id#blk\|…]]`, nhảy tới đúng khối, backlink theo khối | G2 | Block đã có id. Chỉ cần mở rộng cú pháp token, hoàn toàn tương thích ngược. |
| K4 | Backlink **xuyên map** ("Được nhắc tới ở map X → node Y") | G2 | Dựa trên chỉ mục K1. |
| K5 | Thuộc tính trên Tag (chữ, số, ngày, chọn, trạng thái), giá trị gắn trên card/node | G5 | Đã có `tags`, `progress`, `priority` để mở rộng. Cần schema mới. |
| K6 | Chế độ xem **Bảng** (lọc, sắp xếp, nhóm) và **Kanban** (kéo thẻ đổi trạng thái) | G5 | Kéo thẻ = một Command, nên vẫn hoàn tác được. Xuất CSV/Excel dùng `xlsx` sẵn có. |
| K7 | Quick Capture **trong app**: phím tắt mở ô nhập nhanh, tạo card Inbox, chọn đích | G6 | Inbox đã có. |
| K8 | Dán URL hoặc văn bản thành card có ghi nguồn (URL, thời điểm) | G6 | Không cần mạng. |
| K9 | **Nested Map**: node trỏ tới một map khác, bấm để mở, có nút quay lại | G8 | Thêm kiểu liên kết `[[map:id]]` và `node.link` dạng nội bộ. |
| K10 | **Nhóm thông minh** trên mindmap: khoanh vùng tự gom các node theo điều kiện (tag, thuộc tính, chữ) | G8 | Chuyển thể "Smart Section" cho mindmap, dựa trên Boundary sẵn có. |
| K11 | **CLI làm việc trên file** `.t17m`/`.json`: liệt kê, tìm, xuất .md/.docx, chuyển định dạng, kiểm tra hợp lệ | G8 | Tái dùng `core/` và `io/` (đều là hàm thuần) qua một gói Node riêng. |
| K12 | M4 Biểu đồ (còn nợ trong lộ trình cũ) | tiền đề G5/G7 | Kanban/Bảng và tham chiếu Excel đều cần biểu đồ. |

### 1.2 KHẢ THI NHƯNG KHÓ (làm được, nhưng tốn công, cần quyết định thiết kế hoặc có rủi ro)

| # | Điểm | Thuộc gói | Vì sao khó | Hướng giải quyết đề xuất |
|---|---|---|---|---|
| D1 | **Card dùng chung giữa nhiều map** (sửa ở map A thì map B cũng thấy) | G1 | Undo/Redo đang chạy theo từng map. File `.t17m` phải tự chứa đủ để gửi cho người khác. Hai bản của cùng một card có thể xung đột. | Mỗi map **giữ bản sao card nhúng** như hiện nay, còn **Card Registry** của Workspace là nguồn chuẩn (thêm `updatedAt`, `rev`). Sửa card thì Command ghi vào map và đẩy sang Registry; mở map nào thì map đó đồng bộ theo bản mới nhất. Undo ở map A cũng đẩy lại Registry. Nhập `.t17m` thì gộp theo id và `rev`, xung đột thì hỏi người dùng. Không cần sửa cơ chế Command. |
| D2 | **PDF Highlight**: mở PDF, chọn chữ, tô sáng, tạo card kèm nguồn, bấm để quay về đúng trang và vị trí | G3 | pdf.js nặng (khoảng 1,3 MB chưa nén, tính cả worker): bản PWA nạp lười được, nhưng bản một file/exe phải nhúng hết. Toạ độ highlight phụ thuộc mức phóng to. File PDF lớn làm IndexedDB phình to. | Tải pdf.js lười (exe: tách thành file trong resources). Lưu highlight theo **trang + các hình chữ nhật chuẩn hoá (0..1) + đoạn trích**. **Source Registry**: PDF lưu trong IndexedDB (giới hạn dung lượng, có cảnh báo); bản exe có tuỳ chọn chỉ lưu **đường dẫn file**. PDF scan (không có lớp chữ) thì cho chọn vùng để chụp thành ảnh. |
| D3 | **Card Editor nâng cao**: chữ đậm/nghiêng/tiêu đề/danh sách/checklist/code, slash menu (`/`), nhúng card/khối | G4 | Đổi mô hình văn bản kéo theo migrate, tìm kiếm, liên kết, xuất .md/.docx, và ô xem trước trên canvas. Editor có lịch sử undo riêng, phải hoà với Command. Tự viết trên contenteditable rất dễ lỗi. | Lưu văn bản dạng **Markdown rút gọn** (vẫn là chuỗi): khối cũ tự hợp lệ, không cần migrate, token liên kết giữ nguyên, xuất .md gần như sẵn, canvas chỉ hiện chữ thuần. Editor: đánh giá **ProseMirror/TipTap** (khoảng 100–150 KB) so với tự viết bản tối giản. Mỗi lần "commit" đoạn văn là một Command (như `MentionTextarea` hiện nay). Nhúng card = khối mới `embed` (tham chiếu, không sao chép). |
| D4 | **Smart Reference Excel/CSV**: bảng trong card liên kết tới một vùng của file Excel; nút "Kiểm tra nguồn" báo khác biệt và cập nhật | G7 | Bản web không giữ được đường dẫn file (chỉ Chrome/Edge giữ được handle, mỗi phiên phải xin quyền lại). Theo dõi file thay đổi tự động cần watcher của Neutralino. | Lưu `source {path\|handle, sheet, range, hash, checkedAt}`. "Kiểm tra" = đọc lại, so hash, xem diff, rồi một Command cập nhật bảng. Exe: tuỳ chọn tự kiểm tra khi mở map (watcher để sau). **Chỉ một chiều** (đọc từ file nguồn). |
| D5 | **Smart Reference Word**: trích đoạn/bảng từ .docx kèm nguồn, kiểm tra thay đổi | G7 | Phải tự đọc `document.xml` (jszip có sẵn). Định vị đoạn văn không ổn định khi người khác sửa file. | Neo theo **tiêu đề gần nhất + vân tay đoạn văn**. Không khớp thì báo "nguồn đã đổi" để người dùng chọn lại. |
| D6 | **Web Clipper** | G6 | Bản PWA không nhận dữ liệu từ ngoài. Exe không có điểm nhận HTTP riêng (Neutralino chỉ phục vụ file tĩnh). | Mức khả thi: **bookmarklet hoặc tiện ích nhỏ copy nội dung trang** (tiêu đề, URL, đoạn chọn) vào clipboard theo định dạng T17Mind; dán vào app sẽ thành card có nguồn. Bản PWA trên Android: **Web Share Target**. |
| D7 | **MCP server có kiểm soát** (AI đọc/tìm/thêm card) | G8 | Chỉ thao tác được trên **file**, không chạm được dữ liệu trong app đang chạy (xem 1.3). Cần cơ chế an toàn: chỉ đọc mặc định, ghi phải có sao lưu. | Gói Node chạy stdio, công cụ `search`/`read_card`/`add_card_to_inbox`/`export`, làm việc trên **thư mục Workspace** do người dùng chỉ định. Ghi file thì luôn tạo bản `.bak` và kiểm tra hợp lệ trước khi ghi. |
| D8 | **Workspace dạng thư mục trên đĩa** cho bản exe (map và card nằm cạnh exe, mang đi được) | G1/G8 | Hiện dữ liệu nằm trong WebView2, sang máy khác là mất. CLI/MCP cần dữ liệu nằm trong file. | Tuỳ chọn "Workspace thư mục": tự lưu mỗi map một `.t17m`, kèm `workspace.json` (Card Registry, Source Registry). Cần thêm `filesystem.readDirectory` vào allow-list. Đây là cầu nối giữa D1, D7 và K11. |
| D9 | Hiệu năng khi Workspace lớn (hàng trăm map, hàng nghìn card) | G1/G2 | Đọc hết IndexedDB để dựng chỉ mục sẽ chậm. | Chỉ mục lưu bền trong một store riêng và cập nhật dần. Đo đạc ở M6. |

### 1.3 KHÔNG KHẢ THI (trong phạm vi và công nghệ hiện tại)

| # | Điểm | Lý do | Thay thế |
|---|---|---|---|
| X1 | **Phím tắt toàn hệ thống** để Quick Capture khi T17Mind không ở cửa sổ trước | Neutralino không có API phím tắt toàn cục; phải viết native extension cho Windows, trái mục tiêu "portable, một file". | Phím tắt trong app (K7). Ghim exe lên taskbar rồi dùng Win+số. |
| X2 | **Web Clipper gửi thẳng vào app đang chạy** (bấm trên trình duyệt là card hiện ngay trong T17Mind) | PWA không nhận được dữ liệu từ ngoài. Exe không có điểm nhận HTTP. Mở cổng nhận dữ liệu là rủi ro bảo mật (đang để `tokenSecurity: none`). | Clipboard hoặc Share Target (D6). |
| X3 | **CLI/MCP điều khiển dữ liệu bên trong app đang mở** (IndexedDB của trình duyệt/WebView2) | Tiến trình bên ngoài không truy cập được storage của trình duyệt. | CLI/MCP trên file và Workspace thư mục (K11, D7, D8). |
| X4 | **Liên kết hai chiều với Word/Excel** (sửa trong T17Mind tự ghi ngược vào file Office, hoặc cập nhật trực tiếp khi Office đang mở) | Ghi đè file Office dễ làm hỏng định dạng hoặc công thức; không có API Office trong môi trường offline. | Chỉ một chiều có kiểm tra (D4, D5). Xuất Excel/Word thành file mới (đã có). |
| X5 | **OCR PDF scan** offline | Mô hình OCR (ví dụ tesseract.js kèm dữ liệu tiếng Việt) nặng vài chục MB, trái mục tiêu nhẹ. | Chọn vùng chụp thành ảnh (D2). Người dùng tự OCR bằng công cụ khác. |
| X6 | **Nhúng nội dung web trực tuyến** (YouTube, trang web) hoạt động offline | iframe cần mạng; hành vi không đồng nhất giữa PWA và exe. | Khối "liên kết web" có tiêu đề và URL. Ảnh chụp tự thêm. |
| X7 | Cloud sync, cộng tác thời gian thực, AI trả phí | **Đã loại khỏi phạm vi** ngay trong prompt và ROADMAP 5.6. | Đồng bộ thủ công qua Workspace thư mục (D8) bằng OneDrive/Drive của người dùng. |
| X8 | **Whiteboard tự do / Section kiểu Heptabase** | Đã chốt không làm (ROADMAP mục 0). | Nhóm thông minh trên mindmap (K10), Nested Map (K9). |

---

## 2. Lộ trình

Nguyên tắc giữ nguyên: mọi thay đổi dữ liệu qua Command (undo/redo); mỗi giai đoạn có test và checklist kiểm thử tay; commit message không dấu; giữ offline và exe portable; schema tăng dần, có migrate.

### Giai đoạn và thứ tự

```
KW0 Nền móng ─► KW1 Card Registry (G1) ─► KW2 Knowledge Index (G2) ─► KW3 PDF (G3)
   ─► KW4 Biểu đồ (M4) ─► KW5 Tag Database (G5) ─► KW6 Card Editor (G4)
   ─► KW7 Quick Capture (G6) ─► KW8 Smart Reference (G7) ─► KW9 Nested Map + CLI/MCP (G8)
   ─► KW10 Hoàn thiện (M6)
```

Khác với thứ tự trong prompt: **G5 làm trước G4**, vì G5 rẻ hơn, ít đụng mô hình văn bản. Nếu G4 lưu dạng Markdown rút gọn thì không gây làm lại cho G2. **M4 chen vào trước G5** vì Bảng/Kanban và G7 đều cần biểu đồ.

Cỡ việc: S ≈ 1 phiên làm việc, M ≈ 2–3 phiên, L ≈ 4–6 phiên.

| GĐ | Nội dung | Gồm | Cỡ | Tiêu chí nghiệm thu chính |
|---|---|---|---|---|
| **KW0** | Nền móng | Chốt cách merge chuỗi PR #1–#9; tài liệu kiến trúc Workspace; lớp `WorkspaceStore` (IndexedDB store mới: `cards`, `sources`, `index`); schema 20: `Card.createdAt/updatedAt/rev`, `Workspace.id`; đo hiệu năng cơ sở | S | Toàn bộ test cũ pass. Map cũ mở được và lưu lại không mất gì. |
| **KW1** | Card dùng chung giữa nhiều map (D1) | Card Registry; đồng bộ khi mở map; Thư viện có phạm vi "Map này / Toàn Workspace"; kéo card từ map khác vào; "Card xuất hiện ở map nào"; nhập/xuất `.t17m` gộp theo `rev`, có hộp thoại xung đột; undo xuyên map | L | Sửa card ở map A, mở map B thấy bản mới. Undo ở A thì B cũng trở lại. File `.t17m` gửi đi vẫn tự chứa đủ. Nhập lại không nhân đôi card. |
| **KW2** | Knowledge Index (K1–K4) | Chỉ mục toàn Workspace; Ctrl+O tìm toàn cục; Ctrl+K Command Palette; liên kết cấp khối `#blk`; backlink xuyên map; (tuỳ chọn) đồ thị liên kết | M | Tìm "cafe" ra "Cà phê" ở mọi map. Bấm liên kết khối thì nhảy đúng khối. Đổi tên card thì mọi liên kết cập nhật nhãn. |
| — | **Điểm đánh giá 1** | Bản "Knowledge Workspace" đầu tiên (giống khuyến nghị trong prompt) | | Build exe, kèm kịch bản kiểm thử. |
| **KW3** | PDF Highlight (D2) | Source Registry; trình xem PDF (pdf.js tải lười); tô sáng chữ, tạo card kèm nguồn; chọn vùng thành ảnh; danh sách highlight theo nguồn; bấm card mở đúng trang và vị trí; exe chọn nhúng file hay chỉ giữ đường dẫn | L | PDF 100 trang mở mượt. Highlight còn đúng chỗ sau khi đổi mức phóng to. Xoá nguồn thì card vẫn giữ đoạn trích. Bản exe vẫn chạy offline. |
| **KW4** | Biểu đồ (M4) | Bộ vẽ SVG tự viết (cột/đường/tròn); trình sửa; thẻ trên node; xuất docx/png | M | Khối chart hiện thật trên node, trong trang card và trong file Word. |
| **KW5** | Tag Database (K5, K6) | Thuộc tính trên Tag; xem Bảng (lọc/sắp xếp/nhóm) và Kanban; sửa thuộc tính hàng loạt; xuất CSV/Excel; biểu đồ từ thuộc tính | M–L | Kéo thẻ trên Kanban đổi trạng thái, Ctrl+Z trả lại. Lọc và nhóm đúng. |
| — | **Điểm đánh giá 2** | | | Build exe, kèm kịch bản kiểm thử. |
| **KW6** | Card Editor nâng cao (D3) | Chọn thư viện editor (làm thử 1 phiên); Markdown rút gọn; thanh định dạng + slash menu; checklist, code, trích dẫn; khối `embed` (nhúng card/khối khác); cập nhật xuất .md/.docx và nhập Markdown | L | Văn bản cũ hiện y nguyên. Undo theo từng lần chỉnh. Xuất Word giữ đậm/nghiêng/danh sách. Liên kết `@` vẫn chạy. |
| **KW7** | Quick Capture (K7, K8, D6) | Phím tắt trong app mở ô nhập nhanh; dán URL thành card có nguồn; Inbox: xử lý hàng loạt (gắn vào node, gắn tag, lưu trữ); bookmarklet copy trang; Share Target cho PWA | M | Ghi ý tưởng trong 2 giây không cần chuột. Dán từ bookmarklet thành card có tiêu đề và URL. |
| **KW8** | Smart Reference (D4, D5) | Liên kết bảng tới vùng Excel/CSV; trích từ Word; "Kiểm tra nguồn" kèm diff, cập nhật bằng Command; trạng thái nguồn (✓ khớp / ⚠ đã đổi / ✗ mất file); exe tự kiểm tra khi mở map | L | Sửa file Excel, bấm Kiểm tra thì thấy diff, đồng ý thì bảng cập nhật, Ctrl+Z trả lại. File mất thì báo rõ, không crash. |
| — | **Điểm đánh giá 3** | | | Build exe, kèm kịch bản kiểm thử. |
| **KW9** | Nested Map, nhóm thông minh, Workspace thư mục, CLI/MCP (K9–K11, D7, D8) | Node mở map con, có breadcrumb; khoanh vùng thông minh theo điều kiện; Workspace thư mục cho exe; gói `t17mind-cli` (list/search/export/convert/validate); MCP stdio (chỉ đọc mặc định, ghi kèm `.bak`) | L | Mở map con rồi quay lại đúng chỗ. CLI xuất được docx từ `.t17m`. MCP tìm và thêm card Inbox vào file, app mở lên thấy ngay. |
| **KW10** | Hoàn thiện (M6) | Hiệu năng (culling, chỉ mục lưu bền), Workspace 500 map / 5.000 card; README, ảnh chụp, demo cập nhật; bản phát hành exe | M | Mở Workspace lớn dưới 2 giây. Tìm kiếm dưới 200 ms. |

Tổng ước lượng: khoảng **30–40 phiên làm việc**. Nặng nhất là KW1, KW3, KW6 và KW8.

### Quy trình Git đề xuất

- Prompt đề nghị **một nhánh** `feat/knowledge-workspace-v1` cho toàn bộ G0–G8. Như vậy sẽ thành một PR khổng lồ, khó review và khó hoàn tác.
- Đề xuất: **mỗi giai đoạn KW một nhánh + một PR** (`feat/kw1-card-registry`, `feat/kw2-knowledge-index`, …), đúng quy ước đã dùng từ M2.
- Nên **merge chuỗi PR #1–#9 vào `main` trước KW1**, để các nhánh mới tách thẳng từ `main` và không phải xếp chồng thêm 10 PR nữa.
- Nếu vẫn muốn theo đúng prompt: có thể tạo `feat/knowledge-workspace-v1` làm nhánh tích hợp, mỗi KW là một PR nhỏ nhập vào nhánh đó.

### Quyết định đã chốt (20/10/2026)

1. Merge PR #1–#9 vào `main` trước — **đã merge**.
2. **Mỗi giai đoạn một nhánh + một PR** (`feat/kw0-foundation`, `feat/kw1-…`).
3. **Nơi lưu chuẩn là thư mục Workspace trên ổ đĩa ngay từ đầu** (D8 đưa lên KW0).
4. PDF trong bản exe: **cho người dùng tự chọn** nhúng file hay chỉ giữ đường dẫn.
5. Chấp nhận thêm thư viện editor ngoài (ProseMirror/TipTap) cho KW6.

<details><summary>Các câu hỏi ban đầu</summary>

### Quyết định cần bạn chốt trước khi bắt đầu

1. **Merge PR #1–#9 vào `main` ngay**, hay tiếp tục xếp chồng?
2. **Nguồn chuẩn của card dùng chung**: Card Registry trong IndexedDB và bản sao nhúng trong map (đề xuất D1), hay Workspace thư mục trên đĩa ngay từ đầu (D8)?
3. **PDF trong bản exe**: nhúng file PDF vào dữ liệu (mang đi được, nặng) hay chỉ giữ đường dẫn (nhẹ, mất liên kết khi di chuyển file)? Hoặc cho người dùng chọn.
4. **Editor (KW6)**: chấp nhận thêm thư viện ngoài khoảng 100–150 KB (ProseMirror/TipTap) hay ưu tiên tự viết bản tối giản?
5. **Một nhánh cho tất cả hay một nhánh mỗi giai đoạn** (mục Git ở trên).

</details>

---

## 3. Kiến trúc Workspace (KW0 — đã làm)

```
<Workspace>/
  workspace.json        danh mục: id, tên, danh sách map (id, tên, updatedAt), map mở gần nhất
  maps/<mapId>.t17m     mỗi map một file .t17m (mở thẳng bằng Tệp → Mở… được)
  .trash/               map bị xoá được chuyển vào đây
  themes/<id>.json      theme riêng của người dùng (+ workspace.json#pinnedMarkers: hàng biểu tượng ghim)
  (KW1) cards/…         Card Registry      (KW3) sources/…   PDF và nguồn khác
```

- **Exe:** mặc định `<thư mục chứa exe>/T17Mind-Workspace`. Chép cả thư mục exe sang máy khác là mang theo toàn bộ dữ liệu. Đổi được thư mục trong "Map gần đây"; đường dẫn đã chọn được nhớ trên máy.
- **Chrome/Edge:** người dùng chọn thư mục (File System Access API); trình duyệt có thể hỏi lại quyền mỗi phiên (nút "Cấp quyền"). **Firefox/Safari:** chỉ dùng bộ nhớ trình duyệt như trước.
- **Ghi:** IndexedDB ghi ngay mỗi thay đổi (bản dự phòng); thư mục ghi sau khi ngừng sửa 0,8 giây. Ghi ra file tạm rồi đổi tên, nên tắt máy giữa chừng không làm hỏng file cũ. Exe: bấm đóng cửa sổ thì ghi nốt rồi mới thoát.
- **Đọc:** bản nào mới hơn (theo `updatedAt`) thắng. App tắt đột ngột thì lấy lại từ IndexedDB rồi ghi bù; sửa ở máy khác qua OneDrive/Drive thì thư mục thắng.
- **Tự sửa:** `workspace.json` hỏng hoặc mất thì dựng lại từ các file trong `maps/` (giữ bản hỏng `workspace.json.hong-…`). File `.t17m` chép tay vào `maps/` được nhận tự động.
- **Lần đầu gắn thư mục trống:** tự chép mọi map đang có trong bộ nhớ trình duyệt vào; về sau, map chỉ có trong trình duyệt hiện nút "Đưa vào Workspace".
- **Schema 20:** `Card.createdAt/updatedAt/rev`. `rev` tăng ở mọi lần sửa, **kể cả hoàn tác** (không lùi), để KW1 biết bản nào mới hơn khi đồng bộ.
- Module: `core/workspace.ts` (thuần), `io/workspaceFs.ts` (exe / thư mục trình duyệt / bộ nhớ), `io/workspaceRepo.ts`, `io/storage.ts` (hai chế độ), `ui/workspaceController.ts`.
