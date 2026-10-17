/**
 * core/safeUrl.ts
 * ---------------------------------------------------------------------
 * Chỉ cho phép mở link có scheme an toàn (http, https, mailto). Link của
 * node có thể đến từ file JSON/XMind/Excel do người khác gửi, nên không
 * được mở thẳng chuỗi tuỳ ý (ví dụ "javascript:..." hay "data:...").
 * Link không có scheme (vd "example.com") được coi là https.
 * Trả về URL đã chuẩn hoá, hoặc null nếu không an toàn / không hợp lệ.
 * ---------------------------------------------------------------------
 */
const ALLOWED = new Set(["http:", "https:", "mailto:"]);

export function toSafeUrl(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(text);
  // "host:port" không có scheme thật (vd "localhost:3000") -> coi như thiếu scheme
  const looksHostPort = /^[^/\s:]+:\d+(\/|$)/.test(text);
  const candidate = hasScheme && !looksHostPort ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return ALLOWED.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
