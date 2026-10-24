import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { parseT17mFile } from "./t17m";
import { buildDocModel, docStats, DEFAULT_DOC_OPTIONS } from "../core/docModel";
import { buildDocxDocument } from "./docx";
import { Packer } from "docx";
import { getRootIds } from "../core/tree";

/** File demo trình diễn tính năng (docs/demo/T17Mind-demo.t17m) phải luôn mở được với phiên bản hiện tại. */
describe("File demo docs/demo/T17Mind-demo.t17m", () => {
  it("mở được, đủ các loại nội dung, xuất Word được", async () => {
    const buf = readFileSync(new URL("../../docs/demo/T17Mind-demo.t17m", import.meta.url));
    const res = await parseT17mFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const map = res.map;
    const cards = Object.values(map.cards);
    const blocks = cards.flatMap((c) => c.blocks);
    const used = new Set(Object.values(map.nodes).map((n) => n.cardId).filter(Boolean));
    expect(Object.keys(map.nodes).length).toBeGreaterThan(30);
    expect(getRootIds(map).length).toBe(3); // gốc chính + nhánh "Ý tưởng" + nhánh "Tham quan"
    expect(["text", "table", "image", "chart"].every((t) => blocks.some((b) => b.type === t))).toBe(true);
    expect(cards.some((c) => !used.has(c.id))).toBe(true); // có card Inbox
    expect(blocks.some((b) => b.type === "text" && b.text.includes("[[card:"))).toBe(true);
    expect(map.relationships.length + map.summaries.length + map.boundaries.length + map.stickyNotes.length + map.tags.length).toBeGreaterThan(8);
    expect(Object.values(map.assets).every((a) => a.dataBase64.length > 0)).toBe(true);
    const doc = buildDocModel(map, { ...DEFAULT_DOC_OPTIONS, headingDepth: 3 });
    expect(docStats(doc).tables).toBeGreaterThan(3);
    expect((await Packer.toBuffer(buildDocxDocument(doc))).length).toBeGreaterThan(10_000);
  });
});

describe("File demo docs/demo/T17Mind-bieu-do.t17m (KW4)", () => {
  it("mở được, có 3 biểu đồ (cột/đường/tròn) đọc ra số liệu thật", async () => {
    const buf = readFileSync(new URL("../../docs/demo/T17Mind-bieu-do.t17m", import.meta.url));
    const res = await parseT17mFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const charts = Object.values(res.map.cards).flatMap((c) => c.blocks.filter((b) => b.type === "chart"));
    expect(charts.map((c) => (c.type === "chart" ? c.kind : "")).sort()).toEqual(["bar", "line", "pie"]);
    const doc = buildDocModel(res.map, { ...DEFAULT_DOC_OPTIONS, headingDepth: 3 });
    const exported = doc.blocks.filter((b) => b.kind === "chart");
    expect(exported).toHaveLength(3);
    expect(exported.every((b) => b.kind === "chart" && b.series.some((s) => s.values.some((v) => v !== null)))).toBe(true);
  });
});

describe("File demo docs/demo/T17Mind-tag-database.t17m (KW5)", () => {
  it("mở được; Tag 'Công việc' có 4 thuộc tính, 8 dòng, xuất lưới đúng", async () => {
    const { rowsOfTag, tagFieldsOf, rowsToGrid } = await import("../core/tagDb");
    const buf = readFileSync(new URL("../../docs/demo/T17Mind-tag-database.t17m", import.meta.url));
    const res = await parseT17mFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const tag = res.map.tags.find((t) => t.name === "Công việc")!;
    const fields = tagFieldsOf(tag);
    expect(fields.map((f) => f.type)).toEqual(["status", "number", "date", "text"]);
    const rows = rowsOfTag(res.map, tag.id);
    expect(rows).toHaveLength(8);
    const grid = rowsToGrid(rows, fields);
    expect(grid[0]).toEqual(["Tên node", "Trạng thái", "Giờ ước tính", "Hạn", "Người làm"]);
    expect(grid[1]).toEqual(["Wireframe trang chủ", "Xong", "6", "20/10/2026", "An"]);
  });
});
