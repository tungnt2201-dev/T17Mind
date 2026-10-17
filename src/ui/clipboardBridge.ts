/**
 * ui/clipboardBridge.ts
 * ---------------------------------------------------------------------
 * P1.7 — ghi ra clipboard của HỆ ĐIỀU HÀNH khi sao chép, để dán được
 * sang Word/Notepad. writeText() thường ít bị chặn hơn readText() nên
 * còn dùng được ở đây; chiều ĐỌC clipboard (khi dán) KHÔNG đi qua
 * navigator.clipboard.readText() nữa — hàm đó cần xin quyền qua một
 * hộp thoại không hoạt động trong một số khung nhúng (ví dụ Simple
 * Browser của VS Code). Chiều đọc giờ lấy dữ liệu trực tiếp từ sự kiện
 * "paste" tự nhiên của trình duyệt — xem appController.ts#onNativePaste
 * — không cần xin quyền gì cả.
 *
 * Dù writeText() có thất bại (bị chặn quyền), Ctrl+C/Ctrl+V vẫn hoạt
 * động bình thường TRONG NỘI BỘ ứng dụng nhờ "clipboard nội bộ" giữ
 * trong bộ nhớ ở appController.ts — chỉ khi đó không dán chéo được
 * sang ứng dụng khác ngoài trình duyệt.
 * ---------------------------------------------------------------------
 */

export async function writeSystemClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Không có quyền / không phải ngữ cảnh bảo mật — bỏ qua, clipboard
    // nội bộ trong appController.ts vẫn đảm bảo Ctrl+C/Ctrl+V dùng được.
  }
}
