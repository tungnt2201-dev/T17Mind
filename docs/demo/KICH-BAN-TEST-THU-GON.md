# Bài test: thu gọn từng cấp và giữ map trong khung nhìn

Dùng file `Claude-du-toan-thau-hop-dong-v2.t17m` (map lớn, sâu 4 cấp), hoặc bất kỳ map nào có từ 3 cấp trở lên.

| # | Làm gì | Kết quả đúng |
|---|---|---|
| 1 | Chọn node gốc, bấm `C` một lần | Chỉ tầng **sâu nhất** biến mất; node gốc **đứng yên** trên màn hình |
| 2 | Bấm `C` tiếp, mỗi lần một cái | Mỗi lần rút thêm **một tầng**, không rút hết một lần |
| 3 | Bấm tới khi chỉ còn node gốc | Node gốc **nằm giữa màn hình** |
| 4 | Bấm `C` tiếp | Bung lại **từng tầng một** cho tới khi mở hết; bấm tiếp thì lại rút dần |
| 5 | `Shift+C` trên node đang thu gọn | Mở hết một lần |
| 6 | Chọn một chủ đề ở giữa map (ví dụ "Skills"), bấm `C` vài lần | Node đó đứng yên, các nhánh xung quanh co lại; map không bị đẩy ra khỏi khung |
| 7 | Bấm vào **chấm tròn** cạnh một node đang thu gọn | Bung **một tầng** (không bung hết) |
| 8 | Giữ Space rồi kéo map thật xa ra khỏi khung | Map dừng lại, vẫn còn ít nhất một node nhìn thấy ở mép |
| 9 | Lăn chuột phóng to/thu nhỏ ở sát góc màn hình nhiều lần | Map không trôi mất khỏi khung |
| 10 | Thu gọn/mở, thêm/xoá node, đổi bố cục, Ctrl+Z / Ctrl+Y | Không lần nào màn hình trắng trơn, luôn thấy map |
| 11 | Ctrl+Z sau một lần bấm `C` | Trở lại đúng trạng thái trước (kể cả các nhánh bạn đã tự thu riêng) |
