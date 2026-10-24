/**
 * core/numberParse.ts
 * ---------------------------------------------------------------------
 * Đọc SỐ từ chữ trong ô bảng — dùng chung cho biểu đồ (KW4) và hàm tính
 * toán trong bảng. Nhận cả kiểu Việt ("1.234,5") lẫn kiểu Anh ("1,234.5"),
 * bỏ khoảng trắng, ký hiệu tiền (₫ $ € đ), và đuôi "%" (12% → 12).
 *
 * Quy tắc dấu phân cách:
 * - Có cả "." và ",": dấu đứng CUỐI là dấu thập phân.
 * - Chỉ một loại dấu xuất hiện nhiều lần: là dấu nghìn ("1.234.567").
 * - Chỉ một dấu, một lần: là dấu nghìn nếu phần nguyên 1–3 chữ số (không
 *   bắt đầu bằng 0) và đúng 3 chữ số theo sau ("1.234" → 1234); ngược lại
 *   là dấu thập phân ("1,5" → 1.5, "0.125" → 0.125).
 * Trả về null nếu không phải số (chữ, trống, "1.2.3,4"...).
 * ---------------------------------------------------------------------
 */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[\s ₫đ$€£]/g, "");
  if (s === "") return null;
  if (s.endsWith("%")) s = s.slice(0, -1);
  let sign = 1;
  if (s.startsWith("-") || s.startsWith("+")) {
    if (s[0] === "-") sign = -1;
    s = s.slice(1);
  }
  if (!/^[0-9.,]+$/.test(s) || !/[0-9]/.test(s)) return null;

  const dots = s.split(".").length - 1;
  const commas = s.split(",").length - 1;
  let normalized: string;
  if (dots > 0 && commas > 0) {
    const decimalSep = s.lastIndexOf(".") > s.lastIndexOf(",") ? "." : ",";
    const thousandSep = decimalSep === "." ? "," : ".";
    if (s.split(decimalSep).length - 1 !== 1) return null;
    const [intPart, fracPart] = s.split(decimalSep) as [string, string];
    if (!groupsOk(intPart, thousandSep)) return null;
    normalized = `${intPart.split(thousandSep).join("")}.${fracPart}`;
  } else if (dots > 1 || commas > 1) {
    const sep = dots > 1 ? "." : ",";
    if (!groupsOk(s, sep)) return null;
    normalized = s.split(sep).join("");
  } else if (dots === 1 || commas === 1) {
    const sep = dots === 1 ? "." : ",";
    const [intPart, fracPart] = s.split(sep) as [string, string];
    const thousands = /^[1-9][0-9]{0,2}$/.test(intPart) && /^[0-9]{3}$/.test(fracPart);
    normalized = thousands ? intPart + fracPart : `${intPart || "0"}.${fracPart}`;
  } else {
    normalized = s;
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? sign * n : null;
}

/** "1.234.567": nhóm đầu 1–3 chữ số, các nhóm sau đúng 3. */
function groupsOk(s: string, sep: string): boolean {
  const parts = s.split(sep);
  if (!/^[0-9]{1,3}$/.test(parts[0]!)) return false;
  return parts.slice(1).every((p) => /^[0-9]{3}$/.test(p));
}

/** Định dạng số để hiển thị: tối đa `maxFrac` chữ số lẻ, bỏ số 0 thừa, dấu nghìn theo `locale`. */
export function formatNumber(n: number, maxFrac = 2, locale = "vi-VN"): string {
  if (!Number.isFinite(n)) return String(n);
  return new Intl.NumberFormat(locale, { maximumFractionDigits: maxFrac }).format(n);
}
