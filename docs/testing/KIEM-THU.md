# T17Mind — Hướng dẫn kiểm thử các chức năng

_Bộ kiểm thử tay cho bản exe (Windows) · kèm bộ file mẫu trong thư mục mau/_

Tài liệu này đi qua toàn bộ chức năng đã làm, từ nền tảng sơ đồ tư duy đến Workspace và card dùng chung. Mỗi dòng là một phép thử: làm đúng **Thao tác**, so với **Kết quả mong đợi**, rồi đánh dấu **Đạt** hoặc **Lỗi**. Dòng có ★ là phép thử quan trọng (liên quan mất dữ liệu, lưu/mở, hoàn tác) — các dòng ★ phải đạt hết mới coi là nghiệm thu.

## Cách dùng

- **Chuẩn bị.** Giải nén **T17Mind-moi-nhat-portable.zip** vào một thư mục mới (ví dụ `D:\T17Mind-Test`) và giải nén **mau.zip** vào thư mục khác (ví dụ `D:\mau`). Trong tài liệu, `mau\…` nghĩa là thư mục mẫu đó.
- **Đánh dấu.** Ghi **Đ** (đạt) hoặc **L** (lỗi) vào cột Kết quả. Lỗi thì ghi ngắn vào cột Ghi chú và chụp màn hình, kèm mã phép thử (ví dụ `D07`).
- **Phím tắt chính.** Tab = thêm nhánh con · Enter = thêm node cùng cấp · F2 hoặc bấm đúp = sửa chữ · Delete = xoá · Ctrl+Z = hoàn tác · Ctrl+Shift+Z = làm lại · Ctrl+S = lưu · Ctrl+Shift+S = lưu thành… · Ctrl+F = tìm · F = vừa khung · C = gộp/bung nhánh · phím ? = bảng phím tắt.
- **Thanh công cụ.** Hàng trên: Nhánh con · Tìm kiếm · Map gần đây · **Tệp** (Mới, Mở…, Lưu, Lưu thành…) · **Nhập** (Nhập JSON, Ghép JSON, Nhập XLSX, Nhập XMind, Nhập OPML, Nhập Markdown) · **Xuất** (Xuất JSON, XLSX, XMind, OPML, Tài liệu Word / Markdown…, SVG, PNG). Hàng dưới: hoàn tác/làm lại, Vừa khung, Về gốc, bố cục, theme, 🎨 Theme riêng, Ghi chú, Liên kết, Tóm tắt, Khoanh vùng… Góc phải: bật/tắt khung Explorer, khung định dạng, Thư viện card, Minimap.

## Bộ file mẫu (thư mục `mau/`)

| Thư mục | Gồm | Dùng để |
| --- | --- | --- |
| `01-anh` | 9 ảnh + 1 file chữ | Ảnh thường, ảnh 4000×3000 (phải tự thu nhỏ), ảnh dài 3000×400, PNG nền trong suốt, WebP, ảnh nhỏ 64×64, SVG; `khong-phai-anh.txt` để thử thả file sai loại. |
| `02-bang` | 7 file | Dữ liệu bảng: `.tsv` và `.xlsx` để copy rồi dán (Excel/Notepad), `.csv` dấu phẩy, dấu chấm phẩy (kiểu Excel Việt Nam), CSV có ngoặc kép và xuống dòng trong ô, bảng lớn 20×10, file CSV trống. |
| `03-nhap` | 9 file | Các định dạng nhập: JSON dạng cây, JSON đầy đủ, JSON để ghép thêm, XLSX, XMind, OPML, Markdown, `.t17m`, và một file Markdown xuất sẵn từ app. |
| `04-loi-va-cu` | 11 file | File lỗi (phải bị từ chối kèm thông báo rõ) và file cũ (schema 16 và 19 — phải mở được, tự nâng cấp). |
| `05-theme` | 4 file | Theme `.t17theme`: theo cấp, theo nhánh, có màu sai (màu hỏng bị bỏ qua), và file lỗi. |
| `06-workspace-mau` | thư mục | Một Workspace mẫu: 2 map dùng chung 1 card (ở map Ngân sách là bản cũ), 1 card chưa map nào dùng, 1 theme. Chép vào `T17Mind-Workspace`. |
| `07-demo` | 2 file | `T17Mind-demo.t17m` (bản demo Gió Sớm Coffee, 63 node) và `map-lon-1500-node.json` (thử hiệu năng). |

## A. Khởi động và chuẩn bị

Làm mục này trước. Dùng bản exe vừa giải nén.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| ★ **A01** | Chạy **T17Mind.exe** lần đầu (nếu Windows SmartScreen cảnh báo, chọn Thông tin thêm → Vẫn chạy). | App mở, có một node gốc “Chủ đề trung tâm”. Cạnh file exe xuất hiện thư mục **T17Mind-Workspace** có `workspace.json` và thư mục `maps`. | ☐ Đ ☐ L | |
| **A02** | Bấm **Map gần đây**. | Mục **Nơi lưu** hiện đường dẫn thư mục Workspace cạnh file exe, có nút Mở thư mục / Đổi thư mục…; cạnh đó là dòng “Đã lưu hh:mm” (sau vài giây). | ☐ Đ ☐ L | |
| **A03** | Bấm phím **?**. | Hiện bảng phím tắt; bấm lần nữa (hoặc Esc) để đóng. | ☐ Đ ☐ L | |
| **A04** | Bấm chuột phải lên thanh công cụ hoặc khung bên phải. | Không hiện menu Back / Reload / Print của trình duyệt. (Trong ô nhập chữ vẫn có menu Copy / Paste.) | ☐ Đ ☐ L | |

## B. Sơ đồ tư duy cơ bản (kiểm nhanh)

Các chức năng nền đã có từ đầu — chỉ cần xác nhận chưa bị hỏng.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **B01** | Tệp → **Mới** → Tạo mới. Chọn node gốc, bấm **Tab**, gõ “Ý 1”, Enter, Enter, gõ “Ý 2”, Enter. | Có node gốc và 2 nhánh “Ý 1”, “Ý 2” cùng cấp. Map cũ (nếu có) vẫn còn trong Map gần đây. | ☐ Đ ☐ L | |
| ★ **B02** | Chọn “Ý 1”, **F2** (hoặc bấm đúp) đổi chữ; bấm **Tab** thêm con; **Delete** xoá con vừa thêm; **Ctrl+Z**. | Chữ đổi được; xoá rồi Ctrl+Z thì node trở lại đúng chỗ. | ☐ Đ ☐ L | |
| ★ **B03** | Kéo node “Ý 2” thả lên “Ý 1”. | “Ý 2” thành con của “Ý 1”. Ctrl+Z trả lại. | ☐ Đ ☐ L | |
| **B04** | Chọn một node có con, **Ctrl+C** rồi chọn node khác **Ctrl+V**; thử **Ctrl+D** (nhân bản). | Cả nhánh được sao chép; các node mới có id riêng, sửa bản sao không ảnh hưởng bản gốc. | ☐ Đ ☐ L | |
| **B05** | Chọn node có con, bấm **C** nhiều lần; thử **Shift+C**. | Xoay 3 nấc: thu gọn hết → chỉ con trực tiếp → mở hết; Shift+C mở hết ngay. | ☐ Đ ☐ L | |
| **B06** | Đổi **bố cục** lần lượt: Logic Right, Logic Left, Logic Both Sides, Tree Down, Org Chart, Tree Up. | Mỗi kiểu bố trí lại đúng hướng; không node nào chồng lên nhau; đường nối đúng kiểu (Org Chart: góc vuông). | ☐ Đ ☐ L | |
| **B07** | Cuộn chuột để zoom, giữ **Space** + kéo để di chuyển, **F** để vừa khung, nút **Về gốc**. | Zoom theo con trỏ; kéo mượt; F đưa toàn bộ map vào khung nhìn. | ☐ Đ ☐ L | |
| **B08** | **Ctrl+F**, gõ một chữ không dấu (ví dụ “y 1”), Enter. | Tìm được node có dấu; Enter nhảy tới kết quả kế tiếp. | ☐ Đ ☐ L | |
| **B09** | Chọn node → khung **Định dạng**: đổi màu nền, kiểu viền, cỡ chữ, đậm/nghiêng, tiến độ %, ưu tiên, checkbox hoàn thành, Hyperlink, Tag (+ Chọn Tag → tạo Tag mới). | Mỗi thay đổi hiện ngay trên node (vòng tiến độ, huy hiệu ưu tiên, checkbox, viên thuốc Tag); Ctrl+Z từng bước. | ☐ Đ ☐ L | |
| **B10** | Chọn 2 node cùng cha → **Tóm tắt**; chọn vài node → **Khoanh vùng**; **Liên kết** rồi bấm node A, node B; **Ghi chú** (ghi chú dán). | Có ngoặc tóm tắt, khung khoanh vùng, đường liên kết chéo, tờ ghi chú dán; mỗi thứ có thể sửa nhãn / xoá và hoàn tác. | ☐ Đ ☐ L | |
| **B11** | Kéo một node ra vùng trống / chuột phải → tách nhánh trôi. | Thành nhánh trôi độc lập; kéo đi chỗ khác được; gốc chính không tách được. | ☐ Đ ☐ L | |
| **B12** | Chọn theme **Rainbow** → **Áp dụng**; thử các theme khác; **Ctrl+Z**. | Cả map đổi màu theo theme; node mới thêm sau đó tự tô đúng màu theme. | ☐ Đ ☐ L | |
| **B13** | Bật khung **Explorer** (góc phải) và **Minimap**. | Explorer liệt kê cây, bấm tên nhảy tới node; Minimap hiện toàn bộ map, kéo khung nhìn được. | ☐ Đ ☐ L | |
| **B14** | Chọn node → thẻ **Ghi chú** ở khung bên phải, gõ một đoạn; sau đó đóng/mở lại app. | Ghi chú còn nguyên; node có biểu tượng ghi chú. | ☐ Đ ☐ L | |

## C. Card và khối nội dung (M1)

Chọn một node, tìm mục **Card** trong khung bên phải.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **C01** | Bấm **+ Tạo card cho node**. | Hiện ô Tên card và các nút + Văn bản, + Bảng 3×3, Nhập CSV…, + Ảnh…; node có dấu hiệu mang card. | ☐ Đ ☐ L | |
| **C02** | Bấm **+ Văn bản**, gõ vài dòng, bấm ra ngoài. | Dưới chữ node hiện 2–3 dòng đầu của văn bản (dài thì có “…”). | ☐ Đ ☐ L | |
| ★ **C03** | Đổi **Tên card**, Ctrl+Z. | Tên đổi rồi trả lại. | ☐ Đ ☐ L | |
| **C04** | Thêm 3 khối (văn bản, bảng, văn bản), dùng nút **↑ ↓ ✕**; Ctrl+Z. | Đổi được thứ tự, xoá được; Ctrl+Z trả đúng từng bước. | ☐ Đ ☐ L | |
| **C05** | Bấm **Gỡ khỏi node**. | Node không còn card; card vẫn nằm trong Thư viện (mục Inbox). | ☐ Đ ☐ L | |
| **C06** | Ở node khác bấm ô **Gắn card có sẵn…** và chọn card vừa gỡ. | Node mới mang card đó. | ☐ Đ ☐ L | |
| **C07** | Sửa nội dung card ở node này khi hai node cùng gắn một card. | Node kia cũng đổi ngay (cùng một card). | ☐ Đ ☐ L | |
| ★ **C08** | Bấm **Xoá card**, rồi Ctrl+Z. | Card biến mất khỏi node và Thư viện; Ctrl+Z trả lại cả card lẫn liên kết với node. | ☐ Đ ☐ L | |

## D. Bảng: sửa, dán từ Excel, nhập CSV, đổi cỡ cột/hàng (M2)

Dùng file trong `mau\02-bang`. Mở trình sửa bảng bằng cách bấm vào bảng hoặc nút **Sửa…**.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **D01** | Trong card bấm **+ Bảng 3×3**, rồi bấm vào bảng (hoặc **Sửa…**). | Trình sửa bảng mở, con trỏ ở ô A1; trên node hiện thẻ bảng nhỏ, node tự lớn ra, không đè node khác. | ☐ Đ ☐ L | |
| ★ **D02** | Mở `bang-excel-dan-vao.tsv` bằng **Notepad**, Ctrl+A, Ctrl+C. Trong trình sửa bảng bấm ô A1, **Ctrl+V**. | Bảng thành **7 hàng × 4 cột**; hàng đầu: Tháng · Doanh thu (triệu) · Chi phí (triệu) · Ghi chú; chữ tiếng Việt đúng, ô “Có món mới: cà phê muối” nguyên vẹn. | ☐ Đ ☐ L | |
| **D03** | Mở `bang-excel.xlsx` bằng **Excel**, chọn A1:D7, Ctrl+C. Trong trình sửa bấm một ô ở giữa bảng rồi Ctrl+V. | Dữ liệu rải đúng từ ô đang chọn, bảng tự nở thêm hàng/cột; ô “Tháng 3 / Ghi chú” có 2 dòng vẫn giữ xuống dòng. | ☐ Đ ☐ L | |
| **D04** | Trong Excel copy **một ô** rồi dán vào một ô của bảng. | Chữ chỉ vào đúng ô đó, không tạo thêm hàng/cột. | ☐ Đ ☐ L | |
| **D05** | Ở mục Card bấm **Nhập CSV…**, chọn `bang-dau-phay.csv`. | Thêm một khối bảng mới, tên bảng = tên file, **7 hàng × 4 cột**, tiếng Việt đúng. | ☐ Đ ☐ L | |
| **D06** | Nhập CSV `bang-cham-phay-excel-vn.csv` (dùng dấu `;`). | Vẫn tách đúng **4 cột** (không dồn hết vào 1 cột). | ☐ Đ ☐ L | |
| **D07** | Nhập CSV `bang-ngoac-kep-xuong-dong.csv`. | **4 hàng × 4 cột**; ô “Cà phê sữa, size M” nguyên (dấu phẩy nằm trong ô); ô “Bạc xỉu "đặc biệt"” đúng; ô “Dòng 1 / Dòng 2…” có xuống dòng trong cùng một ô; ô mô tả trống của hàng cuối để trống. | ☐ Đ ☐ L | |
| **D08** | Nhập CSV `bang-lon-20x10.csv`; quan sát thẻ trên node. | Thẻ chỉ hiện 5 cột × 4 hàng, có “…” bên phải và bên dưới; chữ dài bị cắt bằng “…”. Mở trình sửa thấy đủ 20×10. | ☐ Đ ☐ L | |
| **D09** | Nhập CSV `bang-trong.csv`. | Thông báo “File CSV trống.”; không tạo bảng nào. | ☐ Đ ☐ L | |
| **D10** | Trong trình sửa: gõ chữ, **Tab / Shift+Tab / Enter / Shift+Enter**, **Alt+Enter** (xuống dòng trong ô); Tab ở ô cuối cùng. | Di chuyển đúng chiều; Tab/Enter ở cuối tự thêm hàng mới; Alt+Enter xuống dòng ngay trong ô. | ☐ Đ ☐ L | |
| **D11** | Thử **+ Hàng trên/dưới, − Hàng, + Cột trái/phải, − Cột**; thử xoá khi chỉ còn 1 hàng / 1 cột. | Chạy theo ô đang chọn; **không xoá được** hàng/cột cuối cùng. | ☐ Đ ☐ L | |
| **D12** | Bấm **Căn Trái / Giữa / Phải**; bỏ tick **Hàng tiêu đề**. | Cả cột đổi căn lề (cả ở thẻ trên node); hàng đầu hết in đậm khi bỏ tick. | ☐ Đ ☐ L | |
| **D13** | Rê vào mép phải chữ A/B/C → kéo; rê vào mép dưới số hàng → kéo; **bấm đúp** mép cột và mép hàng. | Con trỏ đổi thành ↔ / ↕; kéo là cột rộng/hẹp, hàng cao/thấp; bấm đúp tự vừa khít chữ dài nhất. | ☐ Đ ☐ L | |
| ★ **D14** | **Lưu** bảng, rồi **Ctrl+Z một lần**. | Toàn bộ thay đổi của phiên sửa biến mất trong MỘT bước; Ctrl+Shift+Z làm lại. | ☐ Đ ☐ L | |
| **D15** | Sửa bảng rồi bấm **Huỷ** / Esc / bấm ra ngoài. | Hỏi “Bỏ các thay đổi chưa lưu?”; chưa sửa gì thì đóng thẳng. | ☐ Đ ☐ L | |
| **D16** | Chỉnh độ rộng cột, sau đó chèn một cột và dán thêm dữ liệu. | Các cột đã chỉnh giữ nguyên cỡ; cột mới có cỡ mặc định; thẻ trên node vẽ cột đúng tỉ lệ. | ☐ Đ ☐ L | |
| **D17** | Bấm **Xuất CSV** trong trình sửa, mở file bằng Excel. | Đúng số hàng/cột; tiếng Việt hiển thị đúng, không lỗi font. | ☐ Đ ☐ L | |

## E. Ảnh trên node (M3)

Dùng file trong `mau\01-anh`. Trong card bấm **+ Ảnh…** hoặc kéo-thả file từ Explorer lên node.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **E01** | Chụp màn hình (**Win+Shift+S**), chọn một node, **Ctrl+V**. | Node có card mới chứa khối ảnh; ảnh hiện trên node. | ☐ Đ ☐ L | |
| **E02** | Trong Excel copy vài ô rồi **Ctrl+V** lên canvas. | Ra các node chữ như trước, **không** bị hiểu thành ảnh. | ☐ Đ ☐ L | |
| ★ **E03** | Kéo 3 file `anh-01…`, `anh-02…`, `anh-03…` thả lên **một node**. | Thêm đủ 3 ảnh; trên node hiện ảnh đầu và “+2”. **Ctrl+Z một lần** gỡ cả 3 ảnh. | ☐ Đ ☐ L | |
| **E04** | Thả một ảnh ra **vùng trống**; thả `khong-phai-anh.txt` lên node. | Cả hai đều có thông báo (“Thả ảnh lên đúng một node…” / “Chỉ thả được file ảnh…”), không có gì bị thêm. | ☐ Đ ☐ L | |
| **E05** | Thêm `anh-04-lon-4000x3000.jpg` (1,3 MB). Sau đó Tệp → Lưu thành… `.t17m` và xem dung lượng file. | Chèn xong app vẫn mượt; ảnh được tự thu nhỏ còn **1920 × 1440**; file `.t17m` nhỏ hơn rõ rệt so với 1,3 MB của ảnh gốc. | ☐ Đ ☐ L | |
| **E06** | Thêm `anh-05-dai-3000x400.jpg`. | Ảnh dài hiện đúng tỉ lệ, không méo; thu nhỏ còn 1920 px bề ngang. | ☐ Đ ☐ L | |
| **E07** | Thêm `anh-06-nen-trong-suot.png`, đặt node nền màu (ví dụ vàng). | Nền ảnh vẫn **trong suốt** (thấy màu node xuyên qua), không thành nền đen/trắng. | ☐ Đ ☐ L | |
| **E08** | Thêm `anh-07-webp.webp`. | Chèn được và hiện bình thường (WebP giữ nguyên định dạng). | ☐ Đ ☐ L | |
| **E09** | Thêm `anh-08-icon-nho-64x64.png`. | Ảnh nhỏ hiện bình thường, không lỗi, không vỡ nét bất thường. | ☐ Đ ☐ L | |
| **E10** | Thêm `anh-09-svg.svg`. | Ảnh SVG hiện trên node và trong khung xem lớn. | ☐ Đ ☐ L | |
| **E11** | Đổi **Cỡ Nhỏ / Vừa / Lớn**. | Ảnh trên node đổi chiều cao, node tự co giãn, không đè node khác. | ☐ Đ ☐ L | |
| **E12** | Kéo tay nắm góc node **nhỏ lại** rồi **to ra**; bấm “Đặt lại kích thước tự động”. | Ảnh co theo node (giữ tỉ lệ); to ra thì ảnh to theo (node có cả bảng thì ảnh chỉ co); Đặt lại → về cỡ đã chọn. | ☐ Đ ☐ L | |
| **E13** | Bấm ảnh trên node để **xem lớn**; dùng **‹ ›** hoặc phím **← →**, gõ chú thích, **Esc**. | Chuyển ảnh được, chú thích hiện dưới ảnh; Esc đóng; trong lúc xem, bấm Delete **không** xoá node. | ☐ Đ ☐ L | |
| ★ **E14** | Xoá một khối ảnh bằng ✕, rồi **Ctrl+Z**. | Ảnh trở lại đúng khối, đúng chú thích. | ☐ Đ ☐ L | |
| ★ **E15** | Lưu `.t17m`, đóng app, mở lại file đó. | Ảnh, chú thích, cỡ ảnh nguyên vẹn. | ☐ Đ ☐ L | |

## F. Card hiển thị trên node, biểu tượng đính kèm, trang card

Node có card gồm văn bản + ảnh + bảng (làm từ mục C, D, E).

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **F01** | Node có card chỉ văn bản. | Dưới chữ node hiện 2–3 dòng đầu. | ☐ Đ ☐ L | |
| **F02** | Node có đủ văn bản + ảnh + bảng. | Thứ tự trên node: chữ node → trích văn bản → ảnh → bảng → Tag. | ☐ Đ ☐ L | |
| **F03** | Kéo góc node **nhỏ dần**. | Các thẻ co lại; tới mức quá nhỏ thì thành **hàng biểu tượng** (văn bản / bảng / ảnh), chữ node vẫn đọc được. | ☐ Đ ☐ L | |
| **F04** | Bấm một biểu tượng trong hàng biểu tượng. | Trang card mở, cuộn tới đúng khối. | ☐ Đ ☐ L | |
| **F05** | Bấm “Đặt lại kích thước tự động”. | Node về cỡ tự động, hiện lại đầy đủ. | ☐ Đ ☐ L | |
| **F06** | Mở **Mở dạng trang**: sửa tiêu đề, gõ đoạn văn, chèn đoạn giữa hai khối (＋), đổi thứ tự (↑↓), xoá (✕), thêm bảng/ảnh/CSV, dán ảnh. | Trang hiển thị văn bản, ảnh, bảng xen kẽ như một tài liệu; mọi thay đổi cập nhật ngay lên node trên map. | ☐ Đ ☐ L | |
| **F07** | Trong trang bấm **Sửa bảng…**. | Trình sửa bảng mở đè lên trang; lưu xong trang hiện bảng mới. | ☐ Đ ☐ L | |
| **F08** | **Esc** hoặc bấm ra ngoài trang; sau đó **Ctrl+Z** nhiều lần. | Trang đóng (đoạn đang gõ vẫn được lưu); Ctrl+Z hoàn tác từng thao tác đã làm trên trang. | ☐ Đ ☐ L | |
| **F09** | Chuột phải node có card. | Menu có “Mở trang card”. | ☐ Đ ☐ L | |

## G. Menu chuột phải

Thử trên map có node, đường liên kết, tóm tắt, khoanh vùng, ghi chú dán.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **G01** | Chuột phải lên một node. | Menu hiện đúng chỗ con trỏ, node được chọn; mỗi mục ghi kèm phím tắt và chạy đúng. | ☐ Đ ☐ L | |
| **G02** | Chuột phải lên node gốc. | Xoá, Cắt, Tách nhánh trôi, Thêm cùng cấp bị mờ. | ☐ Đ ☐ L | |
| **G03** | Chọn nhiều node rồi chuột phải lên một trong số đó. | Menu có Tóm tắt, Khoanh vùng, “Xoá N node”. | ☐ Đ ☐ L | |
| **G04** | Chuột phải lên đường liên kết / tóm tắt / khoanh vùng / ghi chú dán. | Menu Sửa nhãn / Xoá, tác động đúng đối tượng. | ☐ Đ ☐ L | |
| **G05** | Chuột phải vùng trống → “Thêm ghi chú dán ở đây”. | Ghi chú nằm đúng chỗ bấm. | ☐ Đ ☐ L | |
| **G06** | Node có bảng / ảnh: chuột phải. | Có “Mở bảng”, “Xem ảnh”; node có card có “Thêm ảnh vào card…”. | ☐ Đ ☐ L | |
| **G07** | Ctrl+C một node, chuột phải node khác → “Dán vào đây”. | Nhánh được dán làm con của node đó. | ☐ Đ ☐ L | |
| **G08** | Chuột phải sát mép phải / mép dưới cửa sổ. | Menu không bị tràn ra ngoài màn hình. | ☐ Đ ☐ L | |
| **G09** | Esc, bấm ra ngoài, hoặc cuộn chuột khi menu đang mở; làm vài thao tác qua menu rồi Ctrl+Z. | Menu đóng; mọi thao tác qua menu đều hoàn tác được. | ☐ Đ ☐ L | |

## H. Thư viện card (H1)

Bật bằng biểu tượng 📖 ở góc phải thanh công cụ. Cần một map có vài card (có thể mở `mau\07-demo\T17Mind-demo.t17m`).

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **H01** | Bật / tắt Thư viện. | Khung mở bên trái khung định dạng; bấm × hoặc nút để đóng. | ☐ Đ ☐ L | |
| **H02** | Xem danh sách card. | Mỗi card là một thẻ nổi có dải màu, dòng trích, biểu tượng loại nội dung, “N node” hoặc “Inbox”; card gắn ở ≥2 node có lớp xếp chồng phía sau. | ☐ Đ ☐ L | |
| **H03** | Gõ tìm không dấu một chữ nằm trong văn bản / ô bảng / chú thích ảnh. | Ra đúng card chứa chữ đó. | ☐ Đ ☐ L | |
| **H04** | Lọc **Inbox** / **Đang dùng**; chọn một **Tag**. | Danh sách lọc đúng; lọc Tag chỉ còn card có node mang Tag đó. | ☐ Đ ☐ L | |
| **H05** | **+ Card nhanh (vào Inbox)**. | Card mới ở Inbox, mở sẵn để đặt tên; thêm được văn bản/bảng/ảnh. | ☐ Đ ☐ L | |
| **H06** | Kéo một card thả lên một node; kéo một card thả ra vùng trống. | Thả lên node → thành nhánh con mang card; thả vùng trống → nhánh trôi đúng chỗ thả. | ☐ Đ ☐ L | |
| **H07** | Mở rộng một card → **Gắn vào node đang chọn** và **Thêm làm nhánh con**. | Chạy đúng; Ctrl+Z hoàn tác. | ☐ Đ ☐ L | |
| **H08** | Ở card mở rộng, bấm tên node trong “Đang xuất hiện ở”. | Map nhảy tới node đó, nhánh thu gọn tự bung. | ☐ Đ ☐ L | |
| **H09** | Sửa card trong Thư viện. | Mọi node đang gắn card thấy thay đổi ngay. | ☐ Đ ☐ L | |
| ★ **H10** | **Xoá** card (có hỏi xác nhận), rồi Ctrl+Z. | Card biến mất; Ctrl+Z trả lại. | ☐ Đ ☐ L | |

## I. Liên kết giữa card và node (H2)

Cần ít nhất 2 card và vài node có tên khác nhau.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **I01** | Trong ô văn bản của card gõ **@** rồi vài chữ (không dấu cũng được); ↑↓ chọn; Enter hoặc Tab chèn; Esc đóng. | Hiện danh sách card/node khớp; chọn xong văn bản có liên kết. | ☐ Đ ☐ L | |
| **I02** | Gõ **[[** rồi một tên có khoảng trắng. | Cũng gợi ý được. | ☐ Đ ☐ L | |
| **I03** | Mở **trang card** chứa liên kết. | Liên kết hiện thành chữ xanh (card) / xanh lá (node); rê chuột có xem trước; bấm card → mở trang card đó; bấm node → map nhảy tới node. | ☐ Đ ☐ L | |
| ★ **I04** | Đổi tên card đích. Sau đó xoá card đích rồi Ctrl+Z. | Chỗ liên kết hiện tên mới; xoá thì liên kết thành gạch ngang (hỏng); Ctrl+Z trả lại. | ☐ Đ ☐ L | |
| **I05** | Mở card/node đích → mục **Được nhắc tới ở** (mục Card, trang card, Thư viện). | Liệt kê nơi nhắc tới; bấm là mở đúng chỗ. | ☐ Đ ☐ L | |
| **I06** | Xem chữ trích trên node và dòng trích trong Thư viện. | Hiện tên liên kết, không lộ `[[card:…]]`. | ☐ Đ ☐ L | |
| **I07** | Bấm **↗ Vẽ đường liên kết cho N nhắc tới**. | Xuất hiện các đường nét đứt tới node được nhắc; Ctrl+Z gỡ cả loạt trong một bước. | ☐ Đ ☐ L | |

## J. Lưu, Mở và hộp thoại chọn thư mục (bản exe)

Làm trên bản exe. Thư mục mặc định ban đầu là thư mục chứa T17Mind.exe.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| ★ **J01** | Ctrl+S lần đầu. | Hộp thoại Lưu của Windows mở đúng **thư mục chứa T17Mind.exe**, tên gợi ý = chữ node gốc, kiểu `.t17m`. | ☐ Đ ☐ L | |
| ★ **J02** | Gõ tên không đuôi → Save; sau đó Tệp → **Mở…** chọn lại file. | File `.t17m` xuất hiện đúng thư mục; mở lại đủ dữ liệu, cả ảnh. | ☐ Đ ☐ L | |
| ★ **J03** | Sửa map rồi Ctrl+S. | Không hỏi lại, file được ghi đè (xem giờ sửa của file). | ☐ Đ ☐ L | |
| **J04** | Tệp → **Lưu thành…**; đổi kiểu sang `.json`. | Luôn hỏi; ra file JSON. | ☐ Đ ☐ L | |
| **J05** | Xuất → PNG / SVG / XLSX / XMind / OPML / Xuất JSON. | Mỗi mục mở hộp thoại với đúng định dạng; file mở được bằng phần mềm tương ứng. | ☐ Đ ☐ L | |
| **J06** | Nhập một file từ thư mục khác (ví dụ `D:\mau\03-nhap`), rồi Ctrl+S. | Hộp thoại mặc định mở ở **thư mục của file vừa nhập**. | ☐ Đ ☐ L | |
| **J07** | Mở một `.t17m` ở thư mục khác, sửa, Ctrl+S. | Ghi đè đúng file vừa mở, không hỏi. | ☐ Đ ☐ L | |
| **J08** | Bấm **Huỷ** trong hộp thoại Lưu. | Không có gì xảy ra, không báo lỗi. | ☐ Đ ☐ L | |
| **J09** | Lưu vào thư mục không có quyền ghi (ví dụ `C:\Windows`). | Có thông báo “Không lưu được file…”, app không treo. | ☐ Đ ☐ L | |
| ★ **J10** | Đóng app (nút ✕) rồi mở lại. | Map vẫn còn (tự lưu ngầm). | ☐ Đ ☐ L | |

## K. Nhập từ các định dạng khác

File trong `mau\03-nhap`. Dùng **Nhập** (hoặc Tệp → Mở…) rồi chọn file.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **K01** | Nhập → **Nhập JSON** → `cay-gon.json`. | **7 node**: gốc “Dự án nhỏ (JSON dạng cây)”, Việc 1 (nền xanh, chữ trắng; con 1.1 và 1.2 có tick), Việc 2 (viền nét đứt, có link, có ghi chú), Việc 3 (2 Tag “Gấp”, “Quan trọng”; con 3.1 in đậm). | ☐ Đ ☐ L | |
| ★ **K02** | Nhập JSON → `day-du.json`. | **24 node**; bố cục **Tree Down**; Tag “Gấp” và “Tài chính”; 1 nhánh trôi “Việc cần nhớ”; đường liên kết “phụ thuộc” (Thư mời → Danh sách khách mời); tóm tắt “Hai phiên chính”; khoanh vùng “Khoản chi”; 1 ghi chú dán; node “Phiên 2…” tiến độ 40% và nhãn đường nối “trọng tâm”; node “Danh sách khách mời” có card gồm văn bản + bảng 3×2 + ảnh. | ☐ Đ ☐ L | |
| ★ **K03** | Mở một map có sẵn, rồi Nhập → **Ghép JSON** → `ghep-them.json`. | Thêm **5 node** thành nhánh trôi mới, không đè map cũ; **Ctrl+Z một lần** gỡ hết nhóm vừa ghép. | ☐ Đ ☐ L | |
| **K04** | Nhập → **Nhập XLSX** → `ban-do.xlsx`. | **8 node**, 2 gốc (dòng gốc thứ hai thành nhánh trôi); các Tag: Xong, Gấp, Kỹ thuật, Marketing; “Thiết kế sản phẩm” tiến độ 60%, ưu tiên 1, nền vàng, có link; “Nghiên cứu thị trường” đã tick; “Kế hoạch ra mắt” có biểu tượng 🚀. (Tên cột tiếng Việt như “Nội dung”, “Mã cha”, “Tiến độ” được hiểu.) | ☐ Đ ☐ L | |
| **K05** | Nhập → **Nhập XMind** → `ban-do.xmind`. | **23 node**; gốc “Hội thảo Khách hàng 2026”; ghi chú và tick đi kèm. (Nếu có file `.xmind` thật của bạn, thử thêm.) | ☐ Đ ☐ L | |
| **K06** | Nhập → **Nhập OPML** → `ban-do.opml`. | **23 node**; có **7** node có checkbox; ghi chú giữ nguyên. | ☐ Đ ☐ L | |
| **K07** | Nhập → **Nhập Markdown** → `tai-lieu.md`. | **13 node**; gốc “Kế hoạch quý 4” (đoạn mô tả thành ghi chú); “Mục tiêu” có 4 mục con (“Mở thêm 2 điểm bán” có 2 con), “Chốt ngân sách” **đã tick**, “Tuyển 5 nhân viên” **chưa tick**; “Số liệu” có card chứa **bảng** “Doanh thu theo tháng” (3 cột, cột số căn phải); “Ghi chú nhỏ” có card chứa **ảnh**; “Rủi ro” có 2 mục. | ☐ Đ ☐ L | |
| ★ **K08** | Tệp → **Mở…** → `hoi-thao.t17m`. | Mở đủ cây, card, ảnh, theme, tag như `day-du.json`. | ☐ Đ ☐ L | |
| **K09** | Tệp → **Mở…** → `hoi-thao-xuat-tu-app.md` (file Markdown do app xuất, có mục lục). | Dựng lại cây gốc “Hội thảo Khách hàng 2026” (**24 node**); mục lục bị bỏ qua, không thành node. | ☐ Đ ☐ L | |
| **K10** | Với mỗi định dạng ở trên, sau khi nhập hãy **Xuất lại** cùng định dạng rồi nhập lần nữa. | Cấu trúc (số node, thứ tự, chữ) không đổi qua một vòng nhập → xuất → nhập. | ☐ Đ ☐ L | |

## L. Xuất tài liệu Word và Markdown (M5)

Mở `mau\07-demo\T17Mind-demo.t17m` làm dữ liệu. Xuất → **Tài liệu Word / Markdown…**

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **L01** | Mở hộp thoại xuất. | Có các tuỳ chọn: định dạng (.docx / .md / .zip), phạm vi, số cấp làm tiêu đề, ghi chú, nội dung card, ảnh, mục lục, **Thụt lề theo tầng**; dòng “Sẽ gồm: … tiêu đề · … bảng · … ảnh” đổi theo tuỳ chọn. | ☐ Đ ☐ L | |
| ★ **L02** | Chọn **.docx**, 3 cấp tiêu đề, bật mục lục → Xuất…, mở bằng **Word**. | Tiêu đề dùng Heading 1/2/3 (thấy trong Navigation Pane); node sâu hơn là gạch đầu dòng; bảng là bảng Word thật (đúng cột, căn lề, hàng tiêu đề tô nền); ảnh hiện đúng, chú thích dưới ảnh. | ☐ Đ ☐ L | |
| **L03** | Trong Word: chuột phải mục lục → **Update Field** (hoặc F9). | Mục lục hiện đủ tiêu đề, có số trang, bấm được. | ☐ Đ ☐ L | |
| **L04** | Kiểm tra **thụt lề**: mở file ở L02. | Mỗi tầng thụt vào ~1 cm; nội dung card (đoạn, bảng, ảnh) thụt sâu hơn node của nó một bậc; bảng thụt theo. | ☐ Đ ☐ L | |
| **L05** | Dùng map có cây rất sâu (7–8 tầng, ví dụ nhánh “Tham quan T17Mind”) rồi xuất lại. | Vẫn nhìn rõ tầng nhưng tầng sâu nhất không lùi quá khoảng 1/3 trang. | ☐ Đ ☐ L | |
| **L06** | Bỏ tick **Thụt lề theo tầng** rồi xuất. | File trở về kiểu cũ (sát lề). | ☐ Đ ☐ L | |
| **L07** | Đổi **Số cấp đầu làm tiêu đề** thành 1, rồi 0. | 1: chỉ tầng 1 là tiêu đề, còn lại là gạch đầu dòng; 0: toàn bộ là danh sách. | ☐ Đ ☐ L | |
| **L08** | Chọn một node → chuột phải → **Xuất nhánh này thành tài liệu…** | File chỉ chứa nhánh đó, node đó là tiêu đề cao nhất. | ☐ Đ ☐ L | |
| **L09** | Bỏ tick ghi chú / nội dung card / ảnh rồi xuất. | Phần tương ứng biến mất khỏi file; dòng “Sẽ gồm…” đổi số ngay. | ☐ Đ ☐ L | |
| **L10** | Xuất **.md** rồi mở bằng VS Code / Typora / Obsidian. | Bảng hiển thị đúng dạng bảng; ảnh hiện (nhúng sẵn). | ☐ Đ ☐ L | |
| **L11** | Xuất **.zip** rồi giải nén. | Có file `.md` và thư mục `assets/` chứa ảnh; mở `.md` thấy ảnh. | ☐ Đ ☐ L | |
| **L12** | Xuất `.md` rồi **Mở…** lại chính file đó. | Cây dựng lại đúng (checkbox, bảng kể cả tên bảng, ảnh); Ctrl+Z ngay sau khi nhập trở về map trước đó. | ☐ Đ ☐ L | |
| **L13** | Xuất Word từ map có ảnh **WebP** (`anh-07-webp.webp` đã chèn ở E08) và ảnh **SVG**. | Hai ảnh này **không nhúng được vào Word** — thay bằng một dòng chú thích dạng [Ảnh: …]; các ảnh PNG/JPEG vẫn hiện bình thường. | ☐ Đ ☐ L | |

## M. Biểu tượng và theme riêng

Chọn node → khung **Định dạng** → mục Biểu tượng. Theme: file trong `mau\05-theme`.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **M01** | Bấm nút **＋** cạnh hàng biểu tượng ghim, gõ “tien” vào ô tìm, bấm 💰. | Node có 💰 trên mép trên; hàng “đang gắn” hiện 💰×. Gõ “lich” ra 📅, “ca phe” ra ☕. | ☐ Đ ☐ L | |
| **M02** | Bấm × cạnh 💰 ở hàng đang gắn; Ctrl+Z. | Gỡ được; Ctrl+Z trả lại. | ☐ Đ ☐ L | |
| **M03** | Bấm **Win + .** (bảng emoji Windows), chọn một emoji bất kỳ (ví dụ 🦄), dán vào ô tìm. | Hiện mục “Emoji vừa dán”; bấm để gắn vào node. | ☐ Đ ☐ L | |
| **M04** | Tick **Sửa hàng ghim**, bấm vài biểu tượng để ghim / bỏ ghim; đóng rồi mở lại app. | Hàng ghim đổi theo và **còn nguyên sau khi mở lại**; nút “Khôi phục mặc định” trả về 10 biểu tượng cũ. | ☐ Đ ☐ L | |
| **M05** | Gắn biểu tượng cho 2 node nằm trên dưới nhau. | Hàng biểu tượng của node dưới **không đè** lên node trên. | ☐ Đ ☐ L | |
| **M06** | Bấm **🎨 Theme riêng** → chọn “Rainbow” → **+ Tạo mới** → đổi tên, đổi màu nhánh → xem phần Xem trước. | Xem trước đổi theo từng màu; có thêm/bớt màu nhánh. | ☐ Đ ☐ L | |
| ★ **M07** | Bấm **Lưu & áp dụng cho map**; sau đó Ctrl+Z. | Cả map đổi màu theo theme; Ctrl+Z trả về màu cũ. | ☐ Đ ☐ L | |
| **M08** | Đóng hộp thoại; mở ô chọn theme trên thanh công cụ. | Có nhóm **Theme của tôi** chứa theme vừa lưu; đóng/mở lại app vẫn còn. | ☐ Đ ☐ L | |
| **M09** | **Xuất file…** theme vừa tạo → được file `.t17theme`; xoá theme; **Nhập file .t17theme…** → chọn lại file → Lưu. | Theme trở lại đầy đủ (tên và màu). | ☐ Đ ☐ L | |
| **M10** | Nhập `theme-bien-xanh.t17theme`, `theme-lua-trai-nhanh.t17theme`, rồi áp dụng từng cái. | Biển xanh: tô theo cấp; Lửa trại: mỗi nhánh một màu, gốc màu nâu đen. | ☐ Đ ☐ L | |
| **M11** | Nhập `theme-mau-sai-van-doc-duoc.t17theme`. | Vẫn nhập được; hai màu hợp lệ (nâu cam đậm và cam nhạt) còn lại, màu “đỏ tươi” bị bỏ qua (theme chỉ có 2 cấp). | ☐ Đ ☐ L | |
| **M12** | Nhập `theme-loi-khong-doc-duoc.t17theme`. | Có thông báo “File này không phải theme T17Mind hợp lệ.”; không có theme nào được thêm. | ☐ Đ ☐ L | |
| ★ **M13** | Áp một theme riêng cho map, **lưu `.t17m`**; ở một **thư mục Workspace khác** (hoặc máy khác chưa có theme đó) mở file; thêm một nhánh mới. | Màu giữ nguyên và nhánh mới tô đúng màu theme; ô chọn theme có nhóm “Lưu trong map này”. | ☐ Đ ☐ L | |

## N. Workspace dạng thư mục (KW0)

Dữ liệu chuẩn nằm trong thư mục `T17Mind-Workspace` cạnh file exe.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| ★ **N01** | Sửa một map, chờ ~1 giây, mở Map gần đây. | Dòng trạng thái “Đã lưu hh:mm”; trong thư mục `maps` có file `.t17m` đổi giờ sửa. | ☐ Đ ☐ L | |
| ★ **N02** | Sửa map rồi **bấm ✕ đóng ngay**, mở lại app. | Thay đổi cuối cùng vẫn còn. | ☐ Đ ☐ L | |
| ★ **N03** | Chép cả thư mục chứa exe (gồm `T17Mind-Workspace`) sang thư mục/máy khác, chạy exe ở đó. | Thấy đúng các map và mở đúng map đang làm dở. | ☐ Đ ☐ L | |
| **N04** | Map gần đây → **Đổi thư mục…** sang một thư mục trống. | Các map được chép sang; nút “Về mặc định” trả về thư mục cạnh exe. | ☐ Đ ☐ L | |
| **N05** | Xoá một map trong Map gần đây. | Hỏi xác nhận; file của map chuyển vào `T17Mind-Workspace\.trash\` (lấy lại được bằng tay). | ☐ Đ ☐ L | |
| **N06** | Tệp → Mở… chọn trực tiếp một file trong `maps\`. | Đọc được bình thường. | ☐ Đ ☐ L | |
| ★ **N07** | Đóng app. Xoá file `workspace.json`. Mở lại app. | App vẫn chạy, danh sách map dựng lại đầy đủ từ thư mục `maps`; có thêm file `workspace.json.hong-…` chỉ khi file cũ bị hỏng (ở đây là xoá nên không có). | ☐ Đ ☐ L | |
| ★ **N08** | Đóng app. Mở `workspace.json` bằng Notepad, xoá bớt vài ký tự cho hỏng, lưu. Mở lại app. | App vẫn chạy bình thường, danh sách map dựng lại; bản hỏng được giữ lại dưới tên `workspace.json.hong-…`. | ☐ Đ ☐ L | |
| **N09** | (Bản web, Chrome/Edge) Mở **Map gần đây** → **Chọn thư mục Workspace…**, chọn một thư mục trống. | Các map đang có được chép vào thư mục; sau khi đóng và mở lại trình duyệt có nút **Cấp quyền** để dùng tiếp. | ☐ Đ ☐ L | |
| **N10** | (Bản web, Firefox) Mở Map gần đây. | Hiện ghi chú “Trình duyệt này không cho chọn thư mục…”; app vẫn lưu như cũ. | ☐ Đ ☐ L | |

## O. Card dùng chung giữa nhiều map (KW1)

Dùng Workspace mẫu `mau\06-workspace-mau`. **Đóng app** rồi chép 3 thư mục `maps`, `cards`, `themes` vào `T17Mind-Workspace` (chọn gộp). Mở app.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| ★ **O01** | Map gần đây. | Có thêm 2 map: **“Mẫu — Hội thảo: Chương trình”** và **“Mẫu — Hội thảo: Ngân sách”**, giờ hiển thị là hôm nay (không phải năm 1970). | ☐ Đ ☐ L | |
| **O02** | Mở ô chọn theme. | Có theme “Theme có sẵn trong Workspace mẫu” trong nhóm Theme của tôi. | ☐ Đ ☐ L | |
| **O03** | Mở map **Chương trình** (bấm Đóng để thoát khung Map gần đây), chọn node “Diễn giả”, xem mục Card. | Card “Danh sách diễn giả” gồm văn bản **BẢN MỚI (v2)** và bảng “Lịch phát biểu”. | ☐ Đ ☐ L | |
| ★ **O04** | Mở map **Ngân sách** (có node “Diễn giả (card dùng chung)”). Nếu app tự mở sẵn map này lúc khởi động thì thông báo đã hiện ngay khi mở app. | Hiện thông báo **“Đã cập nhật 1 card từ map khác: Danh sách diễn giả”**; card của node đó giờ cũng là **BẢN MỚI (v2)** kèm bảng (trước đó chỉ là bản cũ v1). | ☐ Đ ☐ L | |
| **O05** | Bật Thư viện → tab **Toàn Workspace**. | Thấy 2 card: “Danh sách diễn giả” (Dùng ở: cả hai map) và “Mẫu email mời (card chưa map nào dùng)” (Không map nào dùng). | ☐ Đ ☐ L | |
| **O06** | Lọc **Chưa có ở map này** và **Không map nào dùng**; gõ tìm không dấu “email”. | Lọc và tìm đúng. | ☐ Đ ☐ L | |
| **O07** | Mở rộng “Mẫu email mời” → **＋ Thêm làm nhánh con** (hoặc kéo thả vào canvas). | Node mới mang card, chữ node = tên card, có văn bản thư mời; **Ctrl+Z một lần** gỡ hẳn node lẫn card khỏi map này. | ☐ Đ ☐ L | |
| ★ **O08** | Ở map Ngân sách, **sửa chữ** trong card “Danh sách diễn giả”, chờ 1 giây, rồi mở lại map **Chương trình**. | Hiện thông báo cập nhật và card ở map Chương trình có chữ vừa sửa. | ☐ Đ ☐ L | |
| **O09** | Ở map Chương trình bấm **Ctrl+Z** thay đổi của card; chờ 1 giây; mở map Ngân sách. | Map kia cũng trở lại đúng nội dung trước đó. | ☐ Đ ☐ L | |
| **O10** | Trong tab Toàn Workspace mở card “Danh sách diễn giả”, bấm **Mở map: …**. | Chuyển sang đúng map. | ☐ Đ ☐ L | |
| **O11** | Xoá hẳn card “Mẫu email mời” khỏi map (nếu đã thêm ở O07) rồi bấm “Xoá khỏi Workspace”. | Hỏi xác nhận; card chuyển vào `.trash\`; không xoá được card còn map đang dùng. | ☐ Đ ☐ L | |
| **O12** | Lấy file `06-workspace-mau\maps\m_mau_ngan_sach.t17m` (bản gốc trong mau.zip), dùng Tệp → **Mở…** mở trực tiếp. | Mở được; card “Danh sách diễn giả” hiện **BẢN CŨ (v1)** — nội dung nằm sẵn trong file, không cần kho card (map luôn tự chứa đủ khi gửi đi). | ☐ Đ ☐ L | |

## P. Hiệu năng

File trong `mau\07-demo`.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **P01** | Nhập JSON → `map-lon-1500-node.json`; bấm **F**. | Nhập xong trong vài giây; map hiện đủ 1500 node; thanh trạng thái ghi “1500 node”. | ☐ Đ ☐ L | |
| **P02** | Cuộn zoom, kéo di chuyển, thu gọn/mở bằng **C**, tìm kiếm Ctrl+F trên map này. | Không giật, không đứng; tìm kiếm trả kết quả ngay. | ☐ Đ ☐ L | |
| **P03** | Với map lớn: sửa chữ một node và bấm Ctrl+Z vài lần. | Phản hồi nhanh, không treo. | ☐ Đ ☐ L | |
| **P04** | Lưu map lớn bằng Ctrl+S. | Lưu xong không treo giao diện; mở lại đủ 1500 node. | ☐ Đ ☐ L | |

## Q. File lỗi và file cũ

File trong `mau\04-loi-va-cu`. **File lỗi phải bị từ chối bằng thông báo rõ ràng, app không treo và map đang mở không bị mất.**

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| ★ **Q01** | Nhập JSON → `loi-khong-phai-json.json`. | Thông báo “File không phải JSON hợp lệ…”; map đang mở giữ nguyên. | ☐ Đ ☐ L | |
| **Q02** | Nhập JSON → `loi-json-thieu-text.json`. | Từ chối kèm lý do: node gốc thiếu trường “text”. | ☐ Đ ☐ L | |
| ★ **Q03** | Nhập JSON → `schema-moi-hon-999.json`. | Thông báo file được lưu bởi bản T17Mind **mới hơn**, yêu cầu cập nhật ứng dụng; không mở. | ☐ Đ ☐ L | |
| ★ **Q04** | Nhập JSON → `schema-cu-16-khong-co-card.json` (schema 16). | Mở được, **23 node** đủ, tự nâng lên bản mới nhất; map dùng bình thường (tạo card, lưu, mở lại). | ☐ Đ ☐ L | |
| ★ **Q05** | Nhập JSON → `schema-cu-19-card-chua-co-moc-thoi-gian.json`. | Mở được, card VIP (văn bản + bảng + ảnh) còn nguyên; sửa card được, lưu lại bình thường. | ☐ Đ ☐ L | |
| **Q06** | Nhập OPML → `loi-opml-hong.opml`. | Từ chối kèm thông báo; không treo. | ☐ Đ ☐ L | |
| **Q07** | Nhập XLSX → `loi-xlsx-khong-co-goc.xlsx`. | Từ chối: không có dòng gốc (cần ít nhất 1 dòng để trống ParentID). | ☐ Đ ☐ L | |
| **Q08** | Nhập XLSX → `loi-xlsx-trung-id.xlsx`. | Từ chối: ID “1” bị trùng, chỉ rõ dòng. | ☐ Đ ☐ L | |
| **Q09** | Nhập XLSX → `loi-xlsx-thieu-cot.xlsx`. | Từ chối: thiếu cột Text (và/hoặc ParentID). | ☐ Đ ☐ L | |
| ★ **Q10** | Tệp → Mở… → `loi-t17m-khong-phai-zip.t17m` và `loi-t17m-thieu-content.t17m`. | Cả hai bị từ chối với thông báo (không phải .t17m hợp lệ / thiếu content.json); map đang mở nguyên vẹn. | ☐ Đ ☐ L | |
| **Q11** | Sau mỗi lần nhập lỗi ở trên: bấm Ctrl+S. | Lưu bình thường, nội dung là map đang mở (không phải file lỗi). | ☐ Đ ☐ L | |

## R. Bản demo trình diễn

`mau\07-demo\T17Mind-demo.t17m` — “Gió Sớm Coffee”.

| Mã | Thao tác | Kết quả mong đợi | Kết quả (Đ/L) | Ghi chú |
| --- | --- | --- | :---: | --- |
| **R01** | Mở file demo, bấm **Vừa khung**. | Hiện đủ 8 mảng quanh node trung tâm, nhánh trôi “Ý tưởng mở rộng”, nhánh “🧭 Tham quan T17Mind” bên trái, 2 ghi chú dán; không có node chồng nhau. | ☐ Đ ☐ L | |
| **R02** | Chọn node “1. Chào mừng & di chuyển” → **Mở dạng trang** → bấm một liên kết xanh. | Map nhảy tới đúng node được nhắc. | ☐ Đ ☐ L | |
| **R03** | Đi tiếp 3–4 bước trong nhánh Tham quan (ví dụ bước 5 về bảng, bước 7 về biểu tượng đính kèm). | Lời dẫn khớp với giao diện thật; các liên kết nhảy đúng chỗ. | ☐ Đ ☐ L | |
| **R04** | Xuất Word từ demo (như L02). | Có mục lục, tiêu đề, bảng, ảnh; không lỗi. | ☐ Đ ☐ L | |

## Tổng kết

- **Nghiệm thu:** toàn bộ phép thử ★ phải Đạt; các phép thử còn lại nếu Lỗi thì ghi rõ để sửa theo mức độ.
- **Gửi kết quả:** gửi lại danh sách mã phép thử bị Lỗi (ví dụ “D07, K04, N03”) kèm ảnh chụp màn hình và mô tả ngắn; càng cụ thể càng sửa nhanh.
- **Chưa kiểm được:** biểu đồ (bước M4 chưa làm — khối biểu đồ chỉ hiện dạng chữ), tìm kiếm toàn Workspace và liên kết tới từng khối (bước KW2 chưa làm), đọc PDF (bước KW3 chưa làm).

| Mục | Số phép thử | Đạt | Lỗi |
| --- | ---: | ---: | ---: |
| A. Khởi động và chuẩn bị | 4 | | |
| B. Sơ đồ tư duy cơ bản (kiểm nhanh) | 14 | | |
| C. Card và khối nội dung (M1) | 8 | | |
| D. Bảng: sửa, dán từ Excel, nhập CSV, đổi cỡ cột/hàng (M2) | 17 | | |
| E. Ảnh trên node (M3) | 15 | | |
| F. Card hiển thị trên node, biểu tượng đính kèm, trang card | 9 | | |
| G. Menu chuột phải | 9 | | |
| H. Thư viện card (H1) | 10 | | |
| I. Liên kết giữa card và node (H2) | 7 | | |
| J. Lưu, Mở và hộp thoại chọn thư mục (bản exe) | 10 | | |
| K. Nhập từ các định dạng khác | 10 | | |
| L. Xuất tài liệu Word và Markdown (M5) | 13 | | |
| M. Biểu tượng và theme riêng | 13 | | |
| N. Workspace dạng thư mục (KW0) | 10 | | |
| O. Card dùng chung giữa nhiều map (KW1) | 12 | | |
| P. Hiệu năng | 4 | | |
| Q. File lỗi và file cũ | 11 | | |
| R. Bản demo trình diễn | 4 | | |
| **Tổng** | **180** | | |
