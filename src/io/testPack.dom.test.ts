// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseOpmlFile } from "./opml";

/** Phần của bộ file mẫu cần DOMParser (xem testPack.test.ts). */
const MAU = join(__dirname, "../../docs/testing/mau");
const text = (p: string) => readFileSync(join(MAU, p), "utf8");

describe("Mẫu — OPML", () => {
  it("ban-do.opml: 23 node, gốc đúng, 7 checkbox", () => {
    const o = parseOpmlFile(text("03-nhap/ban-do.opml"));
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(Object.keys(o.map.nodes)).toHaveLength(23);
    expect(o.map.nodes[o.map.rootId]!.text).toBe("Hội thảo Khách hàng 2026");
    expect(Object.values(o.map.nodes).filter((n) => n.checked !== null)).toHaveLength(7);
  });
  it("loi-opml-hong.opml bị từ chối", () => {
    expect(parseOpmlFile(text("04-loi-va-cu/loi-opml-hong.opml")).ok).toBe(false);
  });
});
