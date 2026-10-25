import { describe, expect, it } from "vitest";
import { createEmptyMap } from "../../core/tree";
import { sha256Hex } from "../../core/hash";
import { bytesToBase64 } from "../../core/bytes";
import { findDuplicateSource, loadSourceBytes, type SourceIo } from "./sourceFiles";
import type { Source } from "../../core/types";

const enc = (s: string): Uint8Array => new TextEncoder().encode(s);
const buf = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

function io(files: Record<string, string>): SourceIo & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    readFile: async (p) => {
      reads.push(p);
      if (!(p in files)) throw new Error(`NE_FS_FILRDER: ${p}`);
      return buf(enc(files[p]!));
    },
    hash: sha256Hex,
  };
}

describe("loadSourceBytes", () => {
  it("nguồn nhúng đọc từ map, không chạm đĩa", async () => {
    const map = createEmptyMap("G");
    map.assets.a1 = { mimeType: "application/pdf", dataBase64: bytesToBase64(enc("%PDF-nhung")) };
    const s: Source = { id: "s", kind: "pdf", name: "n", assetId: "a1", pages: 1, highlights: [] };
    const x = io({});
    const r = await loadSourceBytes(map, s, x);
    expect(r.state).toBe("ok");
    expect(new TextDecoder().decode(r.bytes!)).toBe("%PDF-nhung");
    expect(x.reads).toEqual([]);
  });
  it("nguồn nhúng mất asset → missing kèm lý do", async () => {
    const r = await loadSourceBytes(createEmptyMap("G"), { id: "s", kind: "pdf", name: "n", assetId: "khong-co", pages: 1, highlights: [] }, io({}));
    expect(r.state).toBe("missing");
    expect(r.bytes).toBeNull();
    expect(r.error).toBeTruthy();
  });
  it("nguồn liên kết: file còn nguyên → ok; file bị sửa → changed (vẫn trả byte); mất file → missing", async () => {
    const map = createEmptyMap("G");
    const sha = await sha256Hex(enc("%PDF-goc"));
    const s: Source = { id: "s", kind: "pdf", name: "n", assetId: null, path: "D:\\a.pdf", sha256: sha, pages: 1, highlights: [] };
    expect((await loadSourceBytes(map, s, io({ "D:\\a.pdf": "%PDF-goc" }))).state).toBe("ok");
    const changed = await loadSourceBytes(map, s, io({ "D:\\a.pdf": "%PDF-da-sua" }));
    expect(changed.state).toBe("changed");
    expect(new TextDecoder().decode(changed.bytes!)).toBe("%PDF-da-sua");
    const missing = await loadSourceBytes(map, s, io({}));
    expect(missing.state).toBe("missing");
    expect(missing.bytes).toBeNull();
    expect(missing.error).toContain("D:\\a.pdf");
  });
  it("nguồn liên kết cũ không có mã băm: file còn → ok (không kết luận đã đổi)", async () => {
    const s: Source = { id: "s", kind: "pdf", name: "n", assetId: null, path: "D:\\a.pdf", pages: 1, highlights: [] };
    expect((await loadSourceBytes(createEmptyMap("G"), s, io({ "D:\\a.pdf": "bất kỳ" }))).state).toBe("ok");
  });
});

describe("findDuplicateSource", () => {
  async function mapWith(): Promise<{ map: ReturnType<typeof createEmptyMap>; withHash: Source; legacy: Source; linked: Source }> {
    const map = createEmptyMap("G");
    const a = enc("%PDF-A");
    const b = enc("%PDF-BB");
    map.assets.a = { mimeType: "application/pdf", dataBase64: bytesToBase64(a) };
    map.assets.b = { mimeType: "application/pdf", dataBase64: bytesToBase64(b) };
    const withHash: Source = { id: "s1", kind: "pdf", name: "A", assetId: "a", sha256: await sha256Hex(a), size: a.length, pages: 1, highlights: [] };
    const legacy: Source = { id: "s2", kind: "pdf", name: "B cũ (không mã băm)", assetId: "b", pages: 1, highlights: [] };
    const linked: Source = { id: "s3", kind: "pdf", name: "C liên kết", assetId: null, path: "D:\\c.pdf", sha256: await sha256Hex(enc("%PDF-C")), pages: 1, highlights: [] };
    map.sources = { s1: withHash, s2: legacy, s3: linked };
    return { map, withHash, legacy, linked };
  }
  it("nhận ra file trùng với nguồn có mã băm, với nguồn cũ không có mã băm, và với nguồn liên kết", async () => {
    const { map } = await mapWith();
    expect((await findDuplicateSource(map, { sha256: await sha256Hex(enc("%PDF-A")), size: 6 }, sha256Hex))?.id).toBe("s1");
    expect((await findDuplicateSource(map, { sha256: await sha256Hex(enc("%PDF-BB")), size: 7 }, sha256Hex))?.id).toBe("s2");
    expect((await findDuplicateSource(map, { sha256: await sha256Hex(enc("%PDF-C")), size: 6 }, sha256Hex))?.id).toBe("s3");
  });
  it("khác nội dung → không trùng; nguồn cũ chỉ bị băm lại khi trùng dung lượng", async () => {
    const { map } = await mapWith();
    let hashed = 0;
    const counting = async (b: Uint8Array): Promise<string> => {
      hashed++;
      return sha256Hex(b);
    };
    expect(await findDuplicateSource(map, { sha256: await sha256Hex(enc("%PDF-Z")), size: 6 }, counting)).toBeNull();
    expect(hashed).toBe(0); // dung lượng 6 ≠ 7 của nguồn cũ → không băm lại
    expect(await findDuplicateSource(map, { sha256: await sha256Hex(enc("%PDF-Y9Y")), size: 7 }, counting)).toBeNull();
    expect(hashed).toBe(1);
  });
  it("map không có nguồn → null", async () => {
    expect(await findDuplicateSource(createEmptyMap("G"), { sha256: "a".repeat(64), size: 1 }, sha256Hex)).toBeNull();
  });
});
