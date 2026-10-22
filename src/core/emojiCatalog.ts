/**
 * core/emojiCatalog.ts
 * ---------------------------------------------------------------------
 * Kho biểu tượng (emoji) cho node, chia nhóm, kèm từ khoá tiếng Việt
 * (và vài từ tiếng Anh) để tìm không dấu: gõ "tien" ra 💰 💵 💳…
 * Biểu tượng trên node chỉ là chuỗi emoji (MindNode.markers) nên ngoài
 * kho này người dùng vẫn dán/gõ được emoji bất kỳ (normalizeEmoji).
 * ---------------------------------------------------------------------
 */
import { normalizeForSearch } from "./search";

export interface EmojiEntry {
  e: string;
  /** Từ khoá, cách nhau bởi dấu cách; có thể có dấu (tìm sẽ bỏ dấu). */
  k: string;
}

export interface EmojiGroup {
  id: string;
  name: string;
  items: EmojiEntry[];
}

/** 10 biểu tượng mặc định của hàng "ghim" (giữ đúng bộ cũ của P2.2). */
export const DEFAULT_PINNED_MARKERS = ["⭐", "✅", "❗", "⚠️", "🚀", "🔥", "📌", "💡", "🐛", "❓"];

const g = (id: string, name: string, list: [string, string][]): EmojiGroup => ({
  id,
  name,
  items: list.map(([e, k]) => ({ e, k })),
});

export const EMOJI_GROUPS: EmojiGroup[] = [
  g("status", "Trạng thái", [
    ["✅", "xong hoàn thành đạt done ok tick"],
    ["☑️", "đã chọn tick checkbox"],
    ["✔️", "đúng dấu tick"],
    ["❌", "sai hủy không fail lỗi"],
    ["⏳", "đang làm chờ đợi pending tiến hành"],
    ["⌛", "hết giờ chờ"],
    ["🔄", "lặp lại làm lại cập nhật refresh"],
    ["⏸️", "tạm dừng pause"],
    ["⏹️", "dừng stop"],
    ["▶️", "bắt đầu chạy play"],
    ["🆕", "mới new"],
    ["🆗", "ok được"],
    ["🔒", "khóa bảo mật riêng tư lock"],
    ["🔓", "mở khóa unlock"],
    ["🚧", "đang xây dựng thi công dở dang wip"],
    ["🟢", "xanh tốt ổn an toàn"],
    ["🟡", "vàng chú ý trung bình"],
    ["🟠", "cam cảnh báo"],
    ["🔴", "đỏ nguy hiểm gấp"],
    ["🔵", "xanh dương thông tin"],
    ["🟣", "tím"],
    ["⚫", "đen"],
    ["⚪", "trắng"],
  ]),
  g("priority", "Ưu tiên & cảnh báo", [
    ["⭐", "sao quan trọng yêu thích star"],
    ["🌟", "nổi bật xuất sắc sao sáng"],
    ["❗", "chú ý quan trọng chấm than"],
    ["‼️", "rất quan trọng khẩn"],
    ["❓", "hỏi câu hỏi chưa rõ question"],
    ["⁉️", "bất ngờ thắc mắc"],
    ["⚠️", "cảnh báo rủi ro warning"],
    ["🚨", "khẩn cấp báo động gấp"],
    ["🔥", "nóng gấp hot ưu tiên cháy"],
    ["⛔", "cấm chặn blocked"],
    ["🚫", "không cho phép cấm"],
    ["📌", "ghim quan trọng pin"],
    ["📍", "vị trí địa điểm ghim"],
    ["🎯", "mục tiêu đích target"],
    ["🏆", "thành tích giải thưởng chiến thắng"],
    ["🥇", "nhất vàng hạng 1"],
    ["🥈", "nhì bạc hạng 2"],
    ["🥉", "ba đồng hạng 3"],
    ["💯", "điểm tuyệt đối hoàn hảo trăm"],
    ["🐛", "lỗi bug sâu"],
  ]),
  g("work", "Công việc", [
    ["📋", "danh sách checklist bảng kẹp"],
    ["📝", "ghi chú viết note"],
    ["✏️", "bút chì sửa"],
    ["🖊️", "bút ký"],
    ["📄", "tài liệu văn bản giấy"],
    ["📑", "tài liệu nhiều trang đánh dấu"],
    ["📁", "thư mục folder"],
    ["📂", "thư mục mở"],
    ["🗂️", "hồ sơ phân loại"],
    ["📦", "gói hàng sản phẩm đóng gói"],
    ["📎", "đính kèm kẹp giấy attach"],
    ["🖇️", "kẹp nhiều"],
    ["✂️", "cắt kéo"],
    ["🗑️", "thùng rác xóa bỏ"],
    ["📊", "biểu đồ báo cáo thống kê cột"],
    ["📈", "tăng trưởng tăng biểu đồ lên"],
    ["📉", "giảm sụt biểu đồ xuống"],
    ["🗃️", "lưu trữ hộp hồ sơ"],
    ["🧾", "hóa đơn biên lai"],
    ["📜", "hợp đồng văn bản cổ cuộn giấy"],
    ["✍️", "ký tên viết tay"],
    ["🤝", "hợp tác thỏa thuận bắt tay đối tác"],
    ["💼", "công việc cặp kinh doanh văn phòng"],
    ["🏢", "công ty tòa nhà văn phòng"],
    ["🏭", "nhà máy sản xuất"],
    ["🛠️", "công cụ sửa chữa kỹ thuật"],
    ["🔧", "cờ lê sửa cài đặt"],
    ["🔨", "búa xây dựng"],
    ["⚙️", "cài đặt bánh răng cấu hình"],
    ["🧰", "hộp đồ nghề"],
    ["🧪", "thử nghiệm thí nghiệm test"],
    ["🔍", "tìm kiếm kiểm tra soi"],
    ["🔎", "xem xét chi tiết"],
    ["🚀", "ra mắt khởi động launch nhanh"],
  ]),
  g("time", "Thời gian", [
    ["📅", "lịch ngày hạn deadline"],
    ["🗓️", "lịch kế hoạch tháng"],
    ["📆", "lịch ngày"],
    ["⏰", "báo thức nhắc hạn giờ"],
    ["⏱️", "bấm giờ đo thời gian"],
    ["🕐", "đồng hồ giờ"],
    ["🌅", "sáng sớm bình minh"],
    ["🌙", "tối đêm"],
    ["☀️", "ngày nắng"],
    ["🔔", "thông báo chuông nhắc"],
    ["🔕", "tắt thông báo"],
    ["🎂", "sinh nhật"],
    ["🎉", "chúc mừng sự kiện tiệc"],
    ["🎊", "lễ hội"],
  ]),
  g("money", "Tiền & kinh doanh", [
    ["💰", "tiền túi tiền ngân sách money"],
    ["💵", "tiền mặt đô la"],
    ["💴", "tiền yên"],
    ["💶", "tiền euro"],
    ["💳", "thẻ thanh toán ngân hàng"],
    ["🏦", "ngân hàng"],
    ["🪙", "đồng xu"],
    ["💸", "chi tiêu mất tiền tiêu"],
    ["🧮", "tính toán bàn tính kế toán"],
    ["🛒", "mua sắm giỏ hàng"],
    ["🛍️", "mua sắm túi"],
    ["🏷️", "nhãn giá tag"],
    ["💎", "giá trị cao kim cương cao cấp"],
    ["📢", "quảng cáo thông báo loa"],
    ["📣", "marketing truyền thông loa"],
    ["🎁", "quà tặng khuyến mãi"],
    ["🧑‍💼", "doanh nhân quản lý"],
    ["🤑", "lợi nhuận kiếm tiền"],
  ]),
  g("comm", "Truyền thông", [
    ["📧", "email thư điện tử"],
    ["✉️", "thư phong bì"],
    ["📨", "thư đến nhận"],
    ["📤", "gửi đi outbox"],
    ["📥", "nhận vào inbox"],
    ["📞", "điện thoại gọi"],
    ["📱", "di động điện thoại app"],
    ["💬", "tin nhắn trò chuyện bình luận chat"],
    ["🗨️", "ý kiến"],
    ["💭", "suy nghĩ"],
    ["🗣️", "nói phát biểu"],
    ["📺", "tivi truyền hình"],
    ["📻", "radio"],
    ["📰", "báo tin tức"],
    ["🎬", "video phim quay"],
    ["🎥", "máy quay video"],
    ["📸", "ảnh chụp hình camera"],
    ["📷", "máy ảnh"],
    ["🎙️", "micro podcast ghi âm"],
    ["🌐", "web internet toàn cầu"],
    ["🔗", "liên kết link"],
  ]),
  g("people", "Con người", [
    ["👤", "người cá nhân"],
    ["👥", "nhóm đội nhân sự"],
    ["🧑‍🤝‍🧑", "cặp đôi đồng hành"],
    ["👨‍💻", "lập trình viên kỹ sư"],
    ["👩‍💻", "lập trình viên nữ"],
    ["🧑‍🏫", "giáo viên đào tạo"],
    ["🧑‍🎓", "sinh viên học sinh"],
    ["🧑‍🔧", "thợ kỹ thuật"],
    ["🧑‍⚕️", "bác sĩ y tế"],
    ["🧑‍🍳", "đầu bếp"],
    ["👶", "em bé trẻ em"],
    ["👍", "đồng ý thích tốt like"],
    ["👎", "không đồng ý không thích"],
    ["👏", "vỗ tay khen"],
    ["🙌", "ăn mừng"],
    ["🙏", "cảm ơn cầu mong"],
    ["💪", "mạnh mẽ cố gắng"],
    ["👀", "theo dõi xem"],
    ["🧠", "não tư duy suy nghĩ"],
    ["❤️", "yêu thích tim"],
  ]),
  g("ideas", "Ý tưởng & học tập", [
    ["💡", "ý tưởng sáng kiến bóng đèn idea"],
    ["🧩", "mảnh ghép giải pháp"],
    ["📚", "sách học tập tài liệu"],
    ["📖", "đọc sách"],
    ["🎓", "tốt nghiệp học vấn"],
    ["🏫", "trường học"],
    ["🔬", "nghiên cứu khoa học"],
    ["🔭", "tầm nhìn quan sát"],
    ["🧭", "định hướng la bàn"],
    ["🗺️", "bản đồ lộ trình"],
    ["🪜", "các bước thang"],
    ["🎨", "thiết kế sáng tạo màu"],
    ["✨", "mới lạ lấp lánh"],
    ["🌱", "khởi đầu phát triển mầm"],
    ["♻️", "tái chế bền vững"],
  ]),
  g("tech", "Công nghệ", [
    ["💻", "máy tính laptop"],
    ["🖥️", "máy tính để bàn màn hình"],
    ["⌨️", "bàn phím"],
    ["🖱️", "chuột"],
    ["🖨️", "máy in"],
    ["💾", "lưu đĩa mềm save"],
    ["💿", "đĩa"],
    ["🔌", "điện cắm"],
    ["🔋", "pin năng lượng"],
    ["📡", "ăng ten vệ tinh mạng"],
    ["🛰️", "vệ tinh"],
    ["🤖", "robot tự động ai"],
    ["☁️", "đám mây cloud"],
    ["🗄️", "máy chủ server lưu trữ"],
    ["🔐", "bảo mật mã hóa"],
    ["🧬", "dna công nghệ sinh học"],
  ]),
  g("places", "Địa điểm & di chuyển", [
    ["🏠", "nhà"],
    ["🏡", "nhà vườn"],
    ["🏪", "cửa hàng"],
    ["🏬", "trung tâm thương mại"],
    ["🏨", "khách sạn"],
    ["🏥", "bệnh viện"],
    ["⛪", "nhà thờ"],
    ["🏛️", "cơ quan nhà nước"],
    ["🌍", "thế giới quốc tế"],
    ["🇻🇳", "việt nam vn"],
    ["✈️", "máy bay công tác bay"],
    ["🚗", "ô tô xe hơi"],
    ["🚚", "xe tải giao hàng vận chuyển"],
    ["🚲", "xe đạp"],
    ["🛵", "xe máy giao hàng"],
    ["🚢", "tàu thủy"],
    ["🚆", "tàu hỏa"],
    ["⛽", "xăng nhiên liệu"],
  ]),
  g("food", "Ăn uống", [
    ["☕", "cà phê cafe"],
    ["🍵", "trà"],
    ["🧋", "trà sữa"],
    ["🍺", "bia"],
    ["🍷", "rượu vang"],
    ["🍜", "phở mì"],
    ["🍚", "cơm"],
    ["🥖", "bánh mì"],
    ["🍰", "bánh ngọt"],
    ["🍎", "táo trái cây"],
    ["🥗", "salad rau"],
    ["🍕", "pizza"],
  ]),
  g("nature", "Thiên nhiên & thời tiết", [
    ["🌳", "cây"],
    ["🌸", "hoa"],
    ["🍀", "may mắn cỏ bốn lá"],
    ["🌊", "sóng biển nước"],
    ["⛰️", "núi"],
    ["🌧️", "mưa"],
    ["⛈️", "bão giông"],
    ["❄️", "tuyết lạnh"],
    ["🌡️", "nhiệt độ"],
    ["⚡", "điện sét nhanh"],
    ["🌈", "cầu vồng"],
    ["🐶", "chó"],
    ["🐱", "mèo"],
  ]),
  g("faces", "Cảm xúc", [
    ["😀", "vui cười"],
    ["😊", "hài lòng"],
    ["😎", "ngầu tự tin"],
    ["🤔", "suy nghĩ cân nhắc"],
    ["😐", "bình thường"],
    ["😟", "lo lắng"],
    ["😡", "tức giận"],
    ["😴", "buồn ngủ chán"],
    ["🤯", "quá tải bùng nổ"],
    ["🥳", "ăn mừng tiệc"],
  ]),
  g("symbols", "Ký hiệu & số", [
    ["➕", "cộng thêm"],
    ["➖", "trừ bớt"],
    ["➡️", "tiếp theo phải mũi tên"],
    ["⬅️", "trái quay lại"],
    ["⬆️", "lên tăng"],
    ["⬇️", "xuống giảm"],
    ["🔁", "lặp vòng"],
    ["1️⃣", "một số 1"],
    ["2️⃣", "hai số 2"],
    ["3️⃣", "ba số 3"],
    ["4️⃣", "bốn số 4"],
    ["5️⃣", "năm số 5"],
    ["🅰️", "a phương án"],
    ["🅱️", "b phương án"],
    ["ℹ️", "thông tin info"],
    ["🔟", "mười số 10"],
  ]),
];

export const ALL_EMOJIS: EmojiEntry[] = EMOJI_GROUPS.flatMap((grp) => grp.items);

/** Tìm emoji theo từ khoá (không dấu, mọi từ trong truy vấn đều phải khớp). */
export function searchEmojis(query: string, limit = 60): EmojiEntry[] {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const out: EmojiEntry[] = [];
  const seen = new Set<string>();
  for (const it of ALL_EMOJIS) {
    if (seen.has(it.e)) continue;
    const hay = normalizeForSearch(it.k);
    if (words.every((w) => hay.includes(w))) {
      out.push(it);
      seen.add(it.e);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const PICTO = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

/**
 * Lấy biểu tượng đầu tiên từ chuỗi người dùng dán/gõ (một "grapheme" —
 * emoji ghép như 👨‍💻, cờ 🇻🇳, số 1️⃣ vẫn là một). null nếu không phải emoji.
 */
export function normalizeEmoji(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  let first = s;
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment(t: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    for (const part of new Seg(undefined, { granularity: "grapheme" }).segment(s)) {
      first = part.segment;
      break;
    }
  } else {
    first = Array.from(s)[0] ?? "";
  }
  return PICTO.test(first) ? first : null;
}

/** Thêm `e` vào đầu danh sách "dùng gần đây", bỏ trùng, giữ tối đa `max`. */
export function pushRecent(list: string[], e: string, max = 16): string[] {
  return [e, ...list.filter((x) => x !== e)].slice(0, max);
}
