import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

/**
 * Mọi `byId("…-root")` trong main.ts phải có thẻ tương ứng trong CẢ HAI trang HTML (bản một-file và bản PWA). Thiếu một
 * thẻ làm `byId` ném lỗi giữa chừng khiến các thành phần mount sau đó không hiện (đã từng xảy ra với bản PWA).
 */
describe("main.ts ↔ index.html / index.pwa.html", () => {
  const main = readFileSync(new URL("../main.ts", import.meta.url), "utf8");
  const ids = [...new Set([...main.matchAll(/byId(?:<[^>]*>)?\("([a-z0-9-]+)"\)/g)].map((m) => m[1]!))];
  for (const file of ["index.html", "index.pwa.html"]) {
    it(`${file} có đủ ${ids.length} thẻ gốc`, () => {
      const html = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      const missing = ids.filter((id) => !html.includes(`id="${id}"`));
      expect(missing).toEqual([]);
    });
  }
});
