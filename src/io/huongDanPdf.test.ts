import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseT17mFile } from "./t17m";
import { sourcesOf, sourceOfCard } from "../core/sources";
import { sha256Hex } from "../core/hash";

const rd = (p: string) => readFileSync(new URL(`../../docs/huong-dan-pdf/demo/${p}`, import.meta.url));

describe("Tài liệu hướng dẫn PDF — file demo", () => {
  it("NMDMT-PDF-nguon.t17m mở được: 3 nguồn PDF nhúng, mỗi vùng tô sáng có card + node", async () => {
    const buf = rd("NMDMT-PDF-nguon.t17m");
    const res = await parseT17mFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const srcs = sourcesOf(res.map);
    expect(srcs.map((s) => s.name).sort()).toEqual(["Bao-cao-DTM", "Catalog-tam-pin", "PPA-Ninh-Son-1"]);
    for (const s of srcs) {
      expect(Buffer.from(res.map.assets[s.assetId!]!.dataBase64, "base64").subarray(0, 5).toString()).toBe("%PDF-");
      expect(s.highlights.length).toBeGreaterThan(0);
      for (const h of s.highlights) expect(sourceOfCard(res.map, res.map.cards[h.cardId!]!)).not.toBeNull();
    }
    expect(Object.values(res.map.nodes).filter((n) => n.cardId).length).toBe(9);
  });

  it("thư mục pdf-mau: bản gửi qua mail trùng byte với catalog (để thử chống trùng)", async () => {
    const a = rd("pdf-mau/Tai-ve/Catalog-tam-pin.pdf");
    const b = rd("pdf-mau/Email-dinh-kem/Catalog-tam-pin-qua-mail.pdf");
    expect(await sha256Hex(new Uint8Array(a))).toBe(await sha256Hex(new Uint8Array(b)));
    expect(await sha256Hex(new Uint8Array(a))).not.toBe(await sha256Hex(new Uint8Array(rd("pdf-mau/HopDong/PPA-Ninh-Son-1.pdf"))));
  });
});
