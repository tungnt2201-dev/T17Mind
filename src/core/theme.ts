import type { MindMap } from "./types";

/**
 * core/theme.ts
 * ---------------------------------------------------------------------
 * P2.6 — 4 bộ theme cố định: mỗi bộ định nghĩa màu nền + màu chữ theo
 * ĐỘ SÂU trong cây (0 = gốc, 1 = cấp 1...). Riêng "branch-colors" xử lý
 * khác hẳn — mỗi NHÁNH CẤP 1 (con trực tiếp của một gốc) nhận một màu
 * riêng biệt từ BRANCH_PALETTE, con cháu của nhánh đó dùng sắc độ nhạt
 * dần của đúng màu đó (xem lightenHex) — không đơn thuần tra cứu theo
 * index độ sâu như 3 bộ còn lại, nên `levels` để mảng rỗng, có cờ
 * riêng `perBranch: true` để ApplyThemeCommand biết cần xử lý khác.
 *
 * P2.11 — QUY LUẬT MÀU VÔ HẠN CẤP (theo yêu cầu trực tiếp: "mỗi bộ
 * theme cần có quy luật màu để chọn được màu của node ở xa đến mức vô
 * hạn"). Vấn đề cũ: `levels` chỉ có ĐÚNG 4 phần tử — mọi cấp >= 4 tra
 * cứu `levels[min(depth,3)]` nên bị "đông cứng" vào ĐÚNG màu cấp 3,
 * cấp 4 và cấp 400 trông giống hệt nhau. Tương tự, theme Rainbow dùng
 * công thức thật (`lightenHex(hue, depth*0.22)`) nhưng bị chặn trần
 * `Math.min(0.75, ...)` nên cũng đông cứng từ cấp 4 trở đi.
 *
 * Cách sửa — TIỆM CẬN MŨ (exponential decay), không phải tuyến tính bị
 * chặn trần: từ cấp 3 trở đi, độ sáng (L trong HSL) tiến DẦN MÃI về
 * gần trắng nhưng KHÔNG BAO GIỜ chạm hẳn — nghĩa là cấp 4 và cấp 400
 * LUÔN LUÔN ra hai giá trị khác nhau về mặt toán học (`Math.pow` không
 * bao giờ cho ra đúng 0), dù từ khoảng cấp 8-10 trở đi mắt người không
 * còn phân biệt nổi nữa — đây là giới hạn vật lý của thị giác/màn
 * hình, KHÔNG phải thuật toán còn thiếu; không công thức màu sắc nào
 * giải được giới hạn này. Depth 0-1-2-3 GIỮ NGUYÊN Y HỆT màu đã định
 * nghĩa tay từ trước (tra cứu `levels[depth]` như cũ) — hàm mũ chỉ bắt
 * đầu tính từ cấp 3 trở đi, khớp liền mạch tại đúng điểm nối (depth=3
 * cho ra chính xác `levels[3]`, không có bước nhảy thị giác nào giữa
 * "phần tra bảng" và "phần công thức").
 *
 * Thêm một trục phụ cho 2 theme có MỘT tông màu (Blue, Pastel — không
 * áp cho Mono vì Mono CHỦ Ý là xám tuyệt đối, xoay tông sẽ phá vỡ bản
 * chất "không màu" của nó): xoay nhẹ HUE mỗi cấp (vài độ/cấp) từ cấp 4
 * trở đi — khi độ sáng đã gần bão hoà (khó phân biệt bằng mắt), tông
 * màu trôi dần vẫn còn là dấu hiệu phân biệt phụ. Rainbow KHÔNG cần
 * trục này vì nó đã dùng hue để phân biệt NHÁNH rồi — xoay thêm hue
 * theo cấp sẽ làm loãng khái niệm "một nhánh = một họ màu"; Rainbow
 * chỉ cần bỏ trần 0.75 và tiếp tục công thức tiệm cận mũ.
 *
 * Màu CHỮ cũng đổi từ "gán tay theo mốc cấp" (không mở rộng được ra vô
 * hạn) sang MỘT quy luật duy nhất dùng ở MỌI nơi: tính độ sáng cảm
 * quan (perceptual brightness, công thức YIQ chuẩn) của chính màu nền
 * vừa tính ra, So sánh SÁT với ngưỡng 170/255 — ngưỡng này được chọn
 * bằng cách đối chiếu NGƯỢC với toàn bộ 12 tổ hợp màu chữ đã định nghĩa
 * tay trước đây (4 theme x mức độ khác nhau) — khớp ĐÚNG 100%, không
 * đổi giao diện của bất kỳ node nào đang dùng theme ở cấp 0-3.
 * ---------------------------------------------------------------------
 */

export interface ThemeLevelStyle {
  fill: string;
  color: string;
}

export interface Theme {
  id: string;
  name: string;
  levels: ThemeLevelStyle[];
  perBranch?: boolean;
  /** P2.11 — cho phép hue trôi dần theo cấp từ cấp 3 trở đi (chỉ theme
   *  một-tông-màu mới bật — xem ghi chú đầu file). Mặc định false. */
  hueDrift?: boolean;
}

export const THEMES: Theme[] = [
  {
    id: "professional-blue",
    name: "Blue",
    levels: [
      { fill: "#1d4ed8", color: "#ffffff" },
      { fill: "#2f6fed", color: "#ffffff" },
      { fill: "#dbe8fd", color: "#1f2933" },
      { fill: "#f2f6fe", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    id: "branch-colors",
    name: "Rainbow",
    levels: [],
    perBranch: true,
  },
  {
    id: "monochrome",
    name: "Mono",
    levels: [
      { fill: "#14162b", color: "#ffffff" },
      { fill: "#3a3d52", color: "#ffffff" },
      { fill: "#8b8fa3", color: "#ffffff" },
      { fill: "#e4e5ec", color: "#1f2933" },
    ],
    // Cố ý KHÔNG bật hueDrift — Mono là xám tuyệt đối (saturation 0),
    // xoay hue sẽ làm nó không còn "mono" nữa. Vẫn tiệm cận mũ về sáng.
  },
  {
    id: "warm-pastel",
    name: "Pastel",
    levels: [
      { fill: "#e8873a", color: "#ffffff" },
      { fill: "#f2c230", color: "#1f2933" },
      { fill: "#ffe3b3", color: "#1f2933" },
      { fill: "#fff6e5", color: "#1f2933" },
    ],
    hueDrift: true,
  },

  // -------------------------------------------------------------------
  // P2.12 — 10 bộ theme mới, mỗi bộ lấy cảm hứng từ một TRÀO LƯU MỸ
  // THUẬT cụ thể (cổ điển lẫn hiện đại) — theo yêu cầu trực tiếp. Cùng
  // khuôn mẫu 4 `levels` + `hueDrift` tuỳ chọn như 4 bộ gốc ở trên,
  // dùng chung TOÀN BỘ cơ chế vô hạn cấp (colorForDepth) đã có sẵn từ
  // P2.11 — không cần sửa gì thêm ở phần thuật toán, mỗi bộ chỉ là một
  // "bộ 4 màu gốc + có trôi hue hay không" khác nhau. `hueDrift` bật
  // cho trào lưu vốn chuộng biến chuyển sắc độ mềm mại (Ấn tượng,
  // Ukiyo-e, Memphis, Vaporwave...), tắt cho trào lưu chuộng kỷ luật
  // một bộ màu cố định, không pha trộn thêm (Art Deco, Kiến tạo, Bắc
  // Âu tối giản) — cùng lý do Mono không bật hueDrift ở trên.
  // -------------------------------------------------------------------
  {
    // Cổ điển — Phục Hưng: đỏ mận sẫm, nâu vàng cổ, kem ngà — bảng màu
    // tranh sơn dầu Phục Hưng (Titian, Raphael).
    id: "renaissance",
    name: "Phục Hưng",
    levels: [
      { fill: "#6b1421", color: "#ffffff" },
      { fill: "#a9752f", color: "#ffffff" },
      { fill: "#e8c893", color: "#1f2933" },
      { fill: "#faf3e0", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Cổ điển — Baroque: tương phản sáng-tối mạnh (chiaroscuro), nâu
    // đen sâu, đỏ rượu vang, điểm nhấn vàng kim xa hoa.
    id: "baroque",
    name: "Baroque",
    levels: [
      { fill: "#241512", color: "#ffffff" },
      { fill: "#7a1f2b", color: "#ffffff" },
      { fill: "#d9ab55", color: "#1f2933" },
      { fill: "#f2e4c2", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Cổ điển Nhật Bản — Ukiyo-e (tranh khắc gỗ): chàm indigo đậm đặc
    // trưng của Hokusai/Hiroshige, ngả dần sang sắc ấm (vermillion) khi
    // ra tới các cấp ngoài nhờ hueDrift — gợi tương phản lạnh/nóng kinh
    // điển của thể loại tranh này.
    id: "ukiyo-e",
    name: "Ukiyo-e",
    levels: [
      { fill: "#1a2b4c", color: "#ffffff" },
      { fill: "#2f5d8a", color: "#ffffff" },
      { fill: "#f2b6a0", color: "#1f2933" },
      { fill: "#f7ecd9", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Cổ điển/tiền hiện đại — Trường phái Ấn tượng (Monet): sắc lam-tím
    // dịu, xanh bạc hà, hồng phấn — ánh sáng mềm, ranh giới màu nhoè.
    id: "impressionism",
    name: "Ấn Tượng",
    levels: [
      { fill: "#5b6ea8", color: "#ffffff" },
      { fill: "#9db0da", color: "#1f2933" },
      { fill: "#bfe3d0", color: "#1f2933" },
      { fill: "#f7e1e8", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Hiện đại — Bauhaus: hình khối rõ ràng, 3 màu gốc (đỏ/vàng/lam)
    // trên nền đen — trường phái thiết kế công năng, dứt khoát.
    id: "bauhaus",
    name: "Bauhaus",
    levels: [
      { fill: "#1c1c1c", color: "#ffffff" },
      { fill: "#d0342c", color: "#ffffff" },
      { fill: "#f2c94c", color: "#1f2933" },
      { fill: "#dbe9fb", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Hiện đại (thập niên 1920) — Art Deco: đen tuyền, vàng kim, xanh
    // lục bảo — sang trọng, đối xứng, kỷ luật (KHÔNG trôi hue, giữ đúng
    // 3 sắc chủ đạo xuyên suốt như phong cách này đòi hỏi).
    id: "art-deco",
    name: "Art Deco",
    levels: [
      { fill: "#16181d", color: "#ffffff" },
      { fill: "#0f5132", color: "#ffffff" },
      { fill: "#d4af37", color: "#1f2933" },
      { fill: "#f4ecd8", color: "#1f2933" },
    ],
  },
  {
    // Hiện đại — Chủ nghĩa Kiến tạo (Constructivism, Nga Xô Viết đầu
    // TK20): đỏ-đen-trắng ngà, đồ hoạ cổ động, bảng màu giới hạn có chủ
    // đích (KHÔNG trôi hue).
    id: "constructivism",
    name: "Kiến Tạo",
    levels: [
      { fill: "#131313", color: "#ffffff" },
      { fill: "#c1272d", color: "#ffffff" },
      { fill: "#d8d3c7", color: "#1f2933" },
      { fill: "#f5f3ee", color: "#1f2933" },
    ],
  },
  {
    // Hậu hiện đại — Memphis Design (Ý, thập niên 1980): hồng cánh
    // sen, ngọc lam, vàng mù tạt — sắc màu va chạm cố ý, vui tươi,
    // phá cách.
    id: "memphis",
    name: "Memphis",
    levels: [
      { fill: "#e0218a", color: "#ffffff" },
      { fill: "#17b6a7", color: "#ffffff" },
      { fill: "#ffd23f", color: "#1f2933" },
      { fill: "#d9f2e6", color: "#1f2933" },
    ],
    hueDrift: true,
  },
  {
    // Hiện đại — Tối giản Bắc Âu (Scandinavian): xám than, xanh khói,
    // be ấm, trắng ngà — điềm tĩnh, ít màu, không phô trương (KHÔNG
    // trôi hue).
    id: "scandinavian",
    name: "Bắc Âu",
    levels: [
      { fill: "#33393f", color: "#ffffff" },
      { fill: "#7f97a6", color: "#ffffff" },
      { fill: "#e4d9c8", color: "#1f2933" },
      { fill: "#f7f4ef", color: "#1f2933" },
    ],
  },
  {
    // Đương đại — Vaporwave/Synthwave: tím than hoàng hôn, hồng neon,
    // xanh cyan neon — thẩm mỹ số hoá thập niên 1980 hồi sinh, gradient
    // neon là đặc trưng cốt lõi (hueDrift gần như bắt buộc).
    id: "vaporwave",
    name: "Vaporwave",
    levels: [
      { fill: "#2b1055", color: "#ffffff" },
      { fill: "#ff2fb0", color: "#ffffff" },
      { fill: "#7fe8f0", color: "#1f2933" },
      { fill: "#f5e0f7", color: "#1f2933" },
    ],
    hueDrift: true,
  },
];

/** Bảng màu gốc cho từng nhánh cấp 1, dùng cho theme "branch-colors".
 *  Lặp lại (chia dư) nếu có nhiều hơn 8 nhánh cấp 1. */
export const BRANCH_PALETTE = [
  "#2f6fed",
  "#e8873a",
  "#4c9a5a",
  "#d64545",
  "#8b5cf6",
  "#0891b2",
  "#c2185b",
  "#78716c",
];

// ---------------------------------------------------------------------
// Các hàm màu cấp thấp — hex <-> RGB <-> HSL, không dùng thư viện ngoài.
// ---------------------------------------------------------------------

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Trộn một màu hex về phía trắng theo factor (0 = giữ nguyên, 1 = trắng
 *  hoàn toàn) — dùng để tính sắc độ nhạt dần theo độ sâu cho theme
 *  "branch-colors" (và trước đây từng bị chặn trần ở factor 0.75, xem
 *  ghi chú P2.11 đầu file — nay factor truyền vào không còn trần cứng,
 *  bản thân hàm này vẫn giữ nguyên, chỉ nơi TÍNH factor mới đổi). */
export function lightenHex(hex: string, factor: number): string {
  const clamped = Math.max(0, Math.min(1, factor));
  const { r, g, b } = hexToRgb(hex);
  const mix = (c: number) => c + (255 - c) * clamped;
  return rgbToHex(mix(r), mix(g), mix(b));
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const hn = ((h % 360) + 360) % 360;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const hk = hn / 360;
  return {
    r: hue2rgb(hk + 1 / 3) * 255,
    g: hue2rgb(hk) * 255,
    b: hue2rgb(hk - 1 / 3) * 255,
  };
}

/**
 * P2.11 — màu CHỮ tự động theo độ sáng cảm quan của chính màu nền
 * (công thức YIQ chuẩn, thang 0-255) — MỘT quy luật duy nhất thay cho
 * việc gán tay theo mốc cấp trước đây, hoạt động đúng ở BẤT KỲ độ sâu
 * nào (kể cả những màu chưa từng được định nghĩa tay). Ngưỡng 170 được
 * chọn bằng cách đối chiếu ngược với toàn bộ tổ hợp màu chữ đã có sẵn
 * của cả 4 theme ở cấp 0-3 — khớp đúng 100%, xem chi tiết đối chiếu ở
 * `theme.test.ts`.
 */
export function pickTextColor(fillHex: string): string {
  const { r, g, b } = hexToRgb(fillHex);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 170 ? "#1f2933" : "#ffffff";
}

// P2.11 — LƯU Ý VỀ GIỚI HẠN THỰC TẾ: màn hình chỉ biểu diễn được hữu
// hạn màu (24-bit ~16 triệu, mắt người phân biệt được ít hơn nhiều).
// "Vô hạn cấp" ở đây nghĩa là CÔNG THỨC không có mốc đông cứng cứng
// (không giống bug cũ tra `levels[min(depth,3)]` khiến cấp 4 và cấp
// 400 giống hệt nhau) — mỗi cấp SÂU HƠN luôn được tính lại, không copy
// nguyên giá trị cấp trước. Ở độ sâu cực lớn, hai cấp liền kề rốt cuộc
// vẫn có thể làm tròn ra cùng một mã hex (giới hạn vật lý của không
// gian màu, không phải lỗi công thức) — decay chậm (0.85) + trần sáng
// không quá gần trắng (L_LIMIT) + trôi hue đều đặn giúp việc đó chỉ
// xảy ra ở độ sâu rất lớn (hàng chục cấp) thay vì NGAY LẬP TỨC như bug
// cũ (đông cứng cứng nhắc từ đúng cấp 4).
const LIGHTNESS_DECAY_RATE = 0.85; // r trong công thức tiệm cận mũ — càng gần 1 càng tiến chậm, còn phân biệt được ở nhiều cấp hơn
const HUE_DRIFT_PER_LEVEL = 10; // độ, chỉ dùng khi theme.hueDrift = true — đủ lớn để mắt nhận ra, đủ nhỏ để không "nhảy tông" đột ngột

/**
 * P2.11 — tính {fill, color} cho MỘT theme có `levels` (Blue/Mono/
 * Pastel) tại độ sâu BẤT KỲ, không giới hạn ở 4 cấp đã định nghĩa tay.
 *
 * depth 0..3: tra `levels[depth]` y hệt trước đây (không đổi gì).
 * depth > 3: tiếp tục công thức tiệm cận mũ bắt đầu từ đúng giá trị
 * HSL của `levels[3]` — độ sáng L tiến dần về gần trắng (99%) nhưng
 * không bao giờ chạm hẳn; nếu theme bật `hueDrift`, tông màu H trôi
 * thêm vài độ mỗi cấp làm dấu hiệu phân biệt phụ khi độ sáng đã khó
 * phân biệt bằng mắt.
 */
export function colorForDepth(theme: Theme, depth: number): ThemeLevelStyle {
  const clampedDepth = Math.max(0, depth);
  const lastIndex = theme.levels.length - 1;
  // Phòng hờ theme có ít hơn 4 levels được định nghĩa (không xảy ra với
  // 3 theme hiện có, nhưng an toàn cho theme thêm sau này).
  if (lastIndex < 0) return { fill: "#ffffff", color: "#1f2933" };
  if (clampedDepth <= lastIndex) return theme.levels[clampedDepth] as ThemeLevelStyle;

  // depth > lastIndex (bình thường là > 3): tiếp tục công thức tiệm
  // cận mũ, bắt đầu ĐÚNG từ giá trị HSL của level cuối cùng đã định
  // nghĩa tay, để không có bước nhảy thị giác nào tại điểm nối.
  const base = theme.levels[lastIndex] as ThemeLevelStyle;
  const { r, g, b } = hexToRgb(base.fill);
  const { h, s, l } = rgbToHsl(r, g, b);
  const stepsBeyond = clampedDepth - lastIndex;
  const L_LIMIT = 0.94; // tiệm cận nhưng CHỪA HEADROOM, không trắng xoá — trắng tuyệt đối xoá luôn tác dụng của hueDrift (mọi hue đều ra trắng như nhau)
  const newL = L_LIMIT - (L_LIMIT - l) * Math.pow(LIGHTNESS_DECAY_RATE, stepsBeyond);
  const newH = theme.hueDrift ? h + stepsBeyond * HUE_DRIFT_PER_LEVEL : h;
  const { r: nr, g: ng, b: nb } = hslToRgb(newH, s, newL);
  const fill = rgbToHex(nr, ng, nb);
  return { fill, color: pickTextColor(fill) };
}

const BRANCH_FACTOR_START_DEPTH = 3;
const BRANCH_FACTOR_AT_START = BRANCH_FACTOR_START_DEPTH * 0.22; // = 0.66, khớp công thức tuyến tính cũ tại đúng điểm nối
const BRANCH_HUE_DRIFT_PER_LEVEL = 6; // độ/cấp — nhỏ hơn hẳn khoảng cách giữa 2 màu nhánh kề nhau trong BRANCH_PALETTE (~45°), không gây nhầm sang nhánh khác ở vài chục cấp đầu

/**
 * P2.11 — hệ số làm nhạt (dùng với `lightenHex`) cho theme Rainbow tại
 * độ sâu-trong-nhánh bất kỳ. depth 0..3: y hệt công thức tuyến tính cũ
 * (`depth * 0.22`, KHÔNG đổi màu của map đang dùng theme này ở cấp
 * nông). depth > 3: tiếp tục tiệm cận mũ về 1 (trắng hoàn toàn) thay
 * vì bị chặn cứng ở 0.75 như trước.
 *
 * Vẫn giữ hàm này (đơn thuần trả về MỘT con số) làm khối xây dựng cấp
 * thấp — nhưng bộ màu THẬT SỰ dùng để vẽ là `colorForBranchDepth` bên
 * dưới: chỉ tăng sáng thôi (như hàm này) sẽ nhanh chóng "trắng xoá"
 * mọi nhánh về cùng một màu trắng chỉ sau ~8 cấp — xoá luôn đặc trưng
 * màu riêng của từng nhánh. `colorForBranchDepth` chuyển sang HSL để
 * có thể vừa tăng sáng tiệm cận (chậm hơn, KHÔNG trắng xoá hẳn) VỪA
 * trôi nhẹ sắc độ, giữ được đặc trưng màu nhánh lâu hơn nhiều.
 */
export function branchLightenFactor(depthInBranch: number): number {
  const depth = Math.max(0, depthInBranch);
  if (depth <= BRANCH_FACTOR_START_DEPTH) return depth * 0.22;
  const stepsBeyond = depth - BRANCH_FACTOR_START_DEPTH;
  const LIMIT = 0.999;
  return LIMIT - (LIMIT - BRANCH_FACTOR_AT_START) * Math.pow(LIGHTNESS_DECAY_RATE, stepsBeyond);
}

/**
 * P2.11 — {fill, color} THẬT SỰ dùng để vẽ theo theme Rainbow tại một
 * độ sâu-trong-nhánh bất kỳ, xuất phát từ đúng `hue` (một màu trong
 * BRANCH_PALETTE) của nhánh đó.
 *
 * depth 0..3: giữ NGUYÊN byte-for-byte công thức cũ
 * (`lightenHex(hue, depth*0.22)`) — không đổi gì ở các cấp nông đã
 * quen mắt từ P2.6.
 *
 * depth > 3: chuyển sang KHÔNG GIAN HSL thay vì tiếp tục lerp thẳng
 * sang trắng trong RGB — độ sáng (L) tiến tới `L_LIMIT` (94%, không
 * phải trắng tuyệt đối) theo đúng nhịp tiệm cận mũ dùng chung với
 * `colorForDepth`, ĐỒNG THỜI tông màu (H) trôi thêm vài độ mỗi cấp.
 * Nhờ vậy, dù độ sáng đã gần bão hoà, hue vẫn tiếp tục đổi khác — hai
 * cấp liền kề không còn ra ĐÚNG cùng một mã hex chỉ sau vài cấp như
 * cách làm RGB-thẳng-tới-trắng trước đó.
 */
export function colorForBranchDepth(hue: string, depthInBranch: number): ThemeLevelStyle {
  const depth = Math.max(0, depthInBranch);
  if (depth <= BRANCH_FACTOR_START_DEPTH) {
    const fill = lightenHex(hue, depth * 0.22);
    return { fill, color: pickTextColor(fill) };
  }

  const { r, g, b } = hexToRgb(lightenHex(hue, BRANCH_FACTOR_AT_START));
  const { h, s, l } = rgbToHsl(r, g, b);
  const stepsBeyond = depth - BRANCH_FACTOR_START_DEPTH;
  const L_LIMIT = 0.9; // trần thấp hơn colorForDepth một chút — nhánh cần giữ được sắc độ riêng lâu hơn, không thể để trắng xoá quá sớm
  const newL = L_LIMIT - (L_LIMIT - l) * Math.pow(LIGHTNESS_DECAY_RATE, stepsBeyond);
  const newH = h + stepsBeyond * BRANCH_HUE_DRIFT_PER_LEVEL;
  const { r: nr, g: ng, b: nb } = hslToRgb(newH, s, newL);
  const fill = rgbToHex(nr, ng, nb);
  return { fill, color: pickTextColor(fill) };
}

/** Màu trung tính tối dùng cho CHÍNH một gốc (gốc chính hoặc nhánh
 *  trôi) dưới theme Rainbow — khớp đúng giá trị `applyBranchColors` đã
 *  gán cho root từ trước (P2.6), giữ nguyên không đổi. */
const RAINBOW_ROOT_STYLE: ThemeLevelStyle = { fill: "#14162b", color: "#ffffff" };

/**
 * P2.11 — tính {fill, color} theo ĐÚNG theme đang bật cho MỘT node đơn
 * lẻ vừa được gắn vào map (dùng khi TẠO node mới — AddChildCommand,
 * CreateFloatingBranchCommand, nhân bản, dán, ghép map — xem
 * core/commands.ts), khác với việc tô lại TOÀN BỘ map lúc bấm "Áp
 * dụng" (ApplyThemeCommand tự duyệt DFS, xem lý do giữ nguyên cơ chế
 * đó ở chính command đó).
 *
 * Đi ngược `parentId` từ `nodeId` lên tới tận gốc (gốc chính HOẶC gốc
 * của một nhánh trôi, không nhất thiết `map.rootId`) để biết: (1) độ
 * sâu — cho theme theo cấp; (2) nếu là Rainbow, node NÀY thuộc nhánh
 * cấp-1 nào (branchIndex) và sâu bao nhiêu TÍNH TỪ chính branch đó —
 * dùng lại NGUYÊN các hàm màu ở trên, không viết công thức riêng.
 * `node` phải đã được gắn vào `map.nodes` (kể cả parent đã nối children)
 * trước khi gọi — hàm này chỉ ĐỌC cấu trúc cây, không tự sửa gì.
 */
export function computeThemedStyleForNode(map: MindMap, nodeId: string, theme: Theme): ThemeLevelStyle {
  const chain: string[] = [];
  let curId: string | null = nodeId;
  while (curId !== null) {
    chain.unshift(curId);
    const node: { parentId: string | null } | undefined = map.nodes[curId];
    curId = node ? node.parentId : null;
  }
  const depth = chain.length - 1; // 0 = chính nó là một gốc

  if (!theme.perBranch) return colorForDepth(theme, depth);
  if (depth === 0) return RAINBOW_ROOT_STYLE;

  const rootId = chain[0] as string;
  const branchTopId = chain[1] as string;
  const root = map.nodes[rootId];
  const branchIndex = root ? Math.max(0, root.children.indexOf(branchTopId)) : 0;
  const hue = BRANCH_PALETTE[branchIndex % BRANCH_PALETTE.length] as string;
  const depthInBranch = depth - 1; // branchTopId (chain[1]) tương ứng depthInBranch = 0
  return colorForBranchDepth(hue, depthInBranch);
}
