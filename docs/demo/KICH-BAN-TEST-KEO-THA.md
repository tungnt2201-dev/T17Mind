# Bài test kéo thả node (đợt 1 + đợt 2)

File dùng để test: `T17Mind-keo-tha.t17m` (mở bằng Tệp → Mở). Mỗi bài làm trên một nhánh riêng của map. Làm xong một bài có thể bấm `Ctrl+Z` để trở lại như cũ, hoặc làm tiếp luôn.

## Những gì đã thay đổi

- **Hết lệch một ô khi kéo xuống.** Trước đây thả vào khe giữa C và D thì node rơi xuống dưới D.
- **Kéo được lên đầu và xuống cuối** một nhóm anh em.
- **Trên thân một node có ba vùng:** mép trên là *chèn phía trên*, phần giữa là *làm nhánh con*, mép dưới là *chèn phía dưới*. Khoảng trống giữa hai node cũng là vùng chèn.
- **Thả hụt ra chỗ trống không còn "kéo tự do".** Node tự bám vào vị trí gần nhất trong nhóm anh em cũ, nên thứ tự trong cây luôn khớp với chỗ nhìn thấy.
- **Muốn đặt tự do thì giữ `Alt` trong lúc kéo.** Khi đó thứ tự trong cây giữ nguyên, chỉ dời vị trí.
- **Có lời nhắc nhỏ ở đáy màn hình**, chỉ hiện trong lúc kéo và tắt ngay khi thả. Lời nhắc cho biết sẽ thả vào đâu, ví dụ "Chèn phía trên «A»" hoặc "Làm nhánh con của «X»", và nhắc "Giữ Alt để kéo tự do · Esc để huỷ".
- **Thả vào cây thì node về đúng chỗ bố cục**: độ lệch do kéo tay trước đó được xoá. Cả thao tác vẫn chỉ là một bước `Ctrl+Z`.

## Các bài test

| # | Làm gì (trên nhánh nào) | Kết quả đúng |
|---|---|---|
| 1a | Nhánh **1. Đổi thứ tự**: kéo **B** xuống khoảng trống giữa **D** và **E** | Thứ tự A, C, D, **B**, E, F. Lời nhắc hiện "Chèn phía trên «E»", vạch xanh nằm giữa D và E |
| 1b | Kéo **F** lên khoảng trống phía trên **A** | **F** lên đầu nhóm |
| 1c | Kéo **E** đi một đoạn rồi thả lại đúng chỗ cũ | Không có gì thay đổi. `Ctrl+Z` không cần dùng (không có bước nào được ghi) |
| 1d | Kéo **A** thật xa xuống phía dưới, ra chỗ trống không gần node nào rồi thả | A về **cuối nhóm** của chính nó (bám vị trí), không bị "treo lơ lửng" |
| 2a | Nhánh **2**: kéo **Chị Lan** thả vào **giữa thân** "Phòng Tài chính" | Chị Lan thành nhánh con của Phòng Tài chính (khung xanh bao quanh node đích khi kéo) |
| 2b | Kéo **Phòng Tài chính** thả ở **mép trên** (hoặc khoảng trống ngay trên) "Phòng Kỹ thuật" | Phòng Tài chính đứng trên Phòng Kỹ thuật, cùng cấp |
| 3 | Nhánh **3**: "Bước 3 (đang lệch)" đang bị kéo lệch sẵn. Kéo nó vào khoảng giữa **Bước 1** và **Bước 2** | Thứ tự Bước 1, Bước 3, Bước 2, Bước 4; Bước 3 **nằm thẳng hàng** (hết lệch). `Ctrl+Z` một lần trở lại như cũ |
| 4 | Nhánh **4**: kéo **Nhánh có con** thả vào giữa thân **Đích Y** | Cả nhánh (kèm Con 1–3) thành con của Đích Y |
| 5 | Kéo nhánh trôi **"5. Nhánh trôi…"** thả vào giữa thân **Đích X** | Nhánh trôi gắn vào cây, thành con của Đích X, nằm đúng chỗ (không văng ra xa) |
| 5b | Kéo một nhánh trôi ra chỗ trống | Nhánh trôi đi theo chuột như trước (nhánh trôi vẫn dời tự do) |
| 6 | Cây **6. Cây xuống**: kéo **Một** sang bên phải **Bốn** | Thứ tự Hai, Ba, Bốn, **Một**. Vạch xanh là vạch **dọc** |
| 7 | Nhấn **giữ Alt** rồi kéo **D** ra chỗ khác, thả | Lời nhắc đổi thành "Dời tự do — thứ tự trong cây giữ nguyên". D nằm đúng chỗ thả, thứ tự nhóm không đổi |
| 7b | Bắt đầu kéo, giữa chừng nhấn rồi thả Alt (không nhích chuột) | Lời nhắc và vạch xanh đổi ngay theo Alt |
| 8 | Đang kéo thì bấm **Esc** | Huỷ, node về chỗ cũ, lời nhắc biến mất |
| 9 | Sau bài 7, bấm nút "Sắp xếp lại" | D về đúng vị trí theo thứ tự (trước đây đây là lúc node "tự nhảy xuống") |
| 10 | Thu nhỏ map (zoom khoảng 50%) và làm lại 1a, 2a | Vẫn nhắm được: khoảng trống giữa hai node là chèn, giữa thân node là làm con |

## Nếu thấy chưa đúng

Ghi lại số bài, map đang ở bố cục nào (Logic Right, Logic Both Sides, Cây xuống…), mức zoom, và chụp màn hình **lúc đang kéo** để thấy lời nhắc. Như vậy tôi biết app đã hiểu ý định thả là gì.

## Đợt 2: node dạt ra nhường chỗ, nhớ bên trái/phải

**Thay đổi:**
- **Các node anh em trượt ra nhường chỗ** ngay trong lúc kéo. Khoảng trống mở ra đúng nơi sẽ thả, chỗ cũ của node đang kéo khép lại. Những gì thấy lúc kéo chính là kết quả sau khi thả, không còn cú nhảy nào. Giữ Alt thì mọi node trượt về chỗ cũ.
- **Cây hai bên (Logic Both Sides) nhớ bên đã chọn.**
  - Kéo một nhánh cấp 1 sang bên nào thì nhánh ở yên bên đó, kể cả khi sau này thêm con làm nhánh cao lên.
  - Khi bạn đã tự chọn bên, các nhánh khác cũng được giữ nguyên bên đang hiện, không tự cân lại.
  - Kéo sang một bên đang trống: đưa chuột sang phía đó, ngang tầm node gốc. Lời nhắc hiện "Làm nhánh con của «…», bên trái".
- **Menu chuột phải (cây hai bên):**
  - Trên một nhánh cấp 1: "Chuyển nhánh sang bên trái/phải", và "Để tự chia bên (bỏ ghim)".
  - Trên node gốc: "Tự chia lại hai bên", để trở về chia tự động như trước.
- **Thêm nhánh cùng cấp** (Enter) cạnh một nhánh đã ghim bên thì nhánh mới cũng ở bên đó.

| # | Làm gì | Kết quả đúng |
|---|---|---|
| 11 | Nhánh **1**: kéo chậm **B** dọc xuống qua C, D, E | Các node lần lượt **trượt lên/xuống** nhường chỗ, khoảng trống đi theo chuột. Thả ra thì không có node nào nhảy |
| 12 | Đang kéo như bài 11 thì nhấn giữ **Alt** | Các node trượt về chỗ cũ, lời nhắc thành "Dời tự do" |
| 13 | Cây **7. Hai bên**: P, Q, R đang ở bên trái, "Nhánh lớn" ở bên phải. Kéo **P** sang bên phải, thả phía trên "Nhánh lớn" | P sang phải, nằm trên Nhánh lớn. Q, R **vẫn ở bên trái** |
| 14 | Chọn **P**, bấm **Tab** 3 lần để thêm 3 con cho P (nhánh cao lên) | P **vẫn ở bên phải**, không nhánh nào đổi bên |
| 15 | Chuột phải lên **Q** → "Chuyển nhánh sang bên phải" | Q sang phải, các nhánh khác đứng yên |
| 16 | Chuột phải lên gốc **"7. Hai bên…"** → "Tự chia lại hai bên" | Các nhánh tự chia lại theo chiều cao như trước khi ghim. `Ctrl+Z` trả về đúng các bên đã ghim |
| 17 | Kéo hết các nhánh về một bên, rồi kéo một nhánh sang **bên trống** (đưa chuột sang phía đó, ngang tầm gốc) | Lời nhắc "Làm nhánh con của «7. Hai bên…», bên …". Thả xong nhánh sang đúng bên trống |
| 18 | Chọn một nhánh đã ghim bên trái → **Enter** (thêm cùng cấp) | Nhánh mới xuất hiện ở bên trái |
| 19 | Lưu file, đóng, mở lại | Các bên đã ghim còn nguyên |
