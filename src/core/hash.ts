/**
 * core/hash.ts — mã băm nội dung file để nhận ra PDF trùng và phát hiện file liên kết đã bị sửa.
 * SHA-256 qua Web Crypto (có trong trình duyệt/WebView/Node); môi trường không có (trang http thường) rơi về FNV-1a 64 bit
 * ("fnv:…") — đủ để so sánh hai lần băm CÙNG phương pháp. So sánh luôn qua `sameHash` (chỉ coi là trùng khi cùng kiểu băm).
 */
const hex = (buf: ArrayBuffer | Uint8Array): string => Array.from(new Uint8Array(buf as ArrayBuffer), (b) => b.toString(16).padStart(2, "0")).join("");

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    return hex(await subtle.digest("SHA-256", copy));
  }
  // FNV-1a 64 bit bằng hai nửa 32 bit (không dùng BigInt để chạy mọi nơi).
  let h1 = 0x811c9dc5;
  let h2 = 0x84222325;
  for (let i = 0; i < bytes.length; i++) {
    h1 = Math.imul(h1 ^ bytes[i]!, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (bytes[i]! + i), 0x01000193) >>> 0;
  }
  return `fnv:${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

export const isHash = (v: unknown): v is string => typeof v === "string" && (/^[0-9a-f]{64}$/.test(v) || /^fnv:[0-9a-f]{16}$/.test(v));

/** Hai mã băm có phải của cùng một nội dung không (khác kiểu băm → không so sánh được → false). */
export function sameHash(a: string | undefined, b: string | undefined): boolean {
  return !!a && !!b && isHash(a) && isHash(b) && a.startsWith("fnv:") === b.startsWith("fnv:") && a === b;
}
