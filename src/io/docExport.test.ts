import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import { createEmptyMap, createNode } from "../core/tree";
import { createCard, createTextBlock, createTableBlock, createImageBlock } from "../core/cards";
import { makeLinkToken } from "../core/links";
import { buildDocModel, docStats, splitParagraphs, maxOutline, outlineIndentStep, OUTLINE_STEP_DXA, OUTLINE_STEP_MIN_DXA, DEFAULT_DOC_OPTIONS, type DocOptions } from "../core/docModel";
import { renderMarkdown, headingSlug } from "./markdownDoc";
import { buildMarkdownZip } from "./markdownZip";
import { buildDocxDocument } from "./docx";
import type { MindMap } from "../core/types";

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/** Gốc → A (ghi chú, card: văn bản có liên kết + bảng 3×2 + ảnh) → A1 → A1a (checkbox); gốc → B. */
function buildMap(): { map: MindMap; ids: Record<string, string> } {
  const map = createEmptyMap("Kế hoạch 2026");
  const add = (text: string, parent: string): string => {
    const n = createNode(text, parent);
    map.nodes[n.id] = n;
    map.nodes[parent]!.children.push(n.id);
    return n.id;
  };
  const a = add("Mục tiêu", map.rootId);
  const a1 = add("Doanh thu", a);
  const a1a = add("Ký 3 hợp đồng | lớn", a1);
  const b = add("Rủi ro", map.rootId);
  map.nodes[a1a]!.checked = true;
  map.nodes[a]!.notes = "Đoạn ghi chú 1.\n\nĐoạn ghi chú 2\ncó xuống dòng.";
  map.assets.img1 = { mimeType: "image/png", dataBase64: PNG, width: 800, height: 400 };
  const card = createCard("Mục tiêu");
  const t = createTableBlock(3, 2, "Ngân sách");
  t.cells = [["Hạng mục", "Số tiền"], ["Thiết kế", "100"], ["Ghi chú | có gạch", "a\nb"]];
  t.align = ["left", "right"];
  card.blocks = [createTextBlock(`Xem thêm ${makeLinkToken("node", b, "Rủi ro")}.`), t, createImageBlock("img1", "Sơ đồ")];
  map.cards[card.id] = card;
  map.nodes[a]!.cardId = card.id;
  return { map, ids: { a, a1, a1a, b } };
}

const opts = (o: Partial<DocOptions> = {}): DocOptions => ({ ...DEFAULT_DOC_OPTIONS, ...o });

describe("M5 — mô hình tài liệu", () => {
  it("cấp đầu thành tiêu đề, sâu hơn thành danh sách; ghi chú và card nằm dưới node", () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2 }));
    expect(doc.title).toBe("Kế hoạch 2026");
    expect(doc.blocks.map((b) => b.kind)).toEqual([
      "heading", // Kế hoạch 2026 (H1)
      "heading", // Mục tiêu (H2)
      "paragraph",
      "paragraph", // 2 đoạn ghi chú
      "paragraph", // văn bản card (liên kết → tên)
      "table",
      "image",
      "listItem", // Doanh thu
      "listItem", // Ký 3 hợp đồng
      "heading", // Rủi ro
    ]);
    expect(doc.blocks[4]).toMatchObject({ kind: "paragraph", text: "Xem thêm Rủi ro." });
    expect(doc.blocks[8]).toMatchObject({ kind: "listItem", depth: 1, checked: true });
    expect(docStats(doc)).toEqual({ headings: 3, listItems: 2, tables: 1, tableRows: 3, images: 1 });
  });

  it("tuỳ chọn: chỉ một nhánh, bỏ ghi chú / card / ảnh, mục lục, toàn danh sách", () => {
    const { map, ids } = buildMap();
    const branch = buildDocModel(map, opts({ scope: "branch", branchRootId: ids.a1, headingDepth: 1 }));
    expect(branch.blocks.map((b) => b.kind)).toEqual(["heading", "listItem"]);
    const bare = buildDocModel(map, opts({ includeNotes: false, includeCards: false }));
    expect(docStats(bare)).toMatchObject({ tables: 0, images: 0 });
    expect(bare.blocks.some((b) => b.kind === "paragraph")).toBe(false);
    expect(docStats(buildDocModel(map, opts({ includeImages: false }))).images).toBe(0);
    expect(buildDocModel(map, opts({ toc: true })).blocks[0]).toEqual({ kind: "toc" });
    expect(docStats(buildDocModel(map, opts({ headingDepth: 0 })))).toMatchObject({ headings: 0, listItems: 5 });
    expect(splitParagraphs("a\n\n\nb\nc\n")).toEqual(["a", "b\nc"]);
  });
});

describe("M5 — Markdown (tự kiểm chứng)", () => {
  it("bảng GFM đúng số hàng/cột, căn lề, thoát ký tự |; checkbox; tiêu đề", () => {
    const { map } = buildMap();
    const { markdown } = renderMarkdown(buildDocModel(map, opts({ headingDepth: 2 })), "none");
    const tableLines = markdown.split("\n").filter((l) => l.startsWith("|"));
    expect(tableLines).toHaveLength(3 + 1); // 3 hàng + dòng căn lề
    expect(tableLines[1]).toBe("| :--- | ---: |");
    expect(tableLines[3]).toBe("| Ghi chú \\| có gạch | a<br>b |");
    expect(markdown).toContain("# Kế hoạch 2026");
    expect(markdown).toContain("## Mục tiêu");
    expect(markdown).toContain("  - [x] Ký 3 hợp đồng | lớn");
    expect(markdown).toContain("**Ngân sách**");
    expect(markdown).not.toContain("[[node:");
    expect(markdown).not.toContain("![");
  });

  it("ảnh nhúng base64 hoặc tách file; mục lục trỏ đúng neo", () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2, toc: true }));
    const embed = renderMarkdown(doc, "embed");
    expect(embed.markdown).toContain(`![Sơ đồ](data:image/png;base64,${PNG})`);
    expect(embed.files).toEqual([]);
    const files = renderMarkdown(doc, "files");
    expect(files.markdown).toContain("![Sơ đồ](assets/img1.png)");
    expect(files.files).toEqual([{ path: "assets/img1.png", dataBase64: PNG }]);
    expect(files.markdown).toContain(`- [Kế hoạch 2026](#${headingSlug("Kế hoạch 2026")})`);
    expect(headingSlug("Kế hoạch: Q1/2026!")).toBe("kế-hoạch-q12026");
  });

  it("zip Markdown đọc lại được: đủ file .md và ảnh", async () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts());
    const bytes = await buildMarkdownZip(doc, "ke-hoach.md").generateAsync({ type: "uint8array" });
    const zip = await JSZip.loadAsync(bytes);
    expect(Object.keys(zip.files).sort()).toEqual(["assets/", "assets/img1.png", "ke-hoach.md"]);
    expect(await zip.file("assets/img1.png")!.async("base64")).toBe(PNG);
    expect(await zip.file("ke-hoach.md")!.async("string")).toContain("assets/img1.png");
  });
});

describe("M5 — Word .docx (tự kiểm chứng)", () => {
  it("giải nén document.xml: đủ tiêu đề, bảng (số hàng/cột), ảnh, danh sách, mục lục", async () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2, toc: true }));
    const buf = await Packer.toBuffer(buildDocxDocument(doc));
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect((xml.match(/<w:tbl>/g) ?? []).length).toBe(1);
    expect((xml.match(/<w:tr[ >]/g) ?? []).length).toBe(3);
    expect((xml.match(/<w:gridCol /g) ?? []).length).toBe(2);
    expect((xml.match(/w:val="Heading1"/g) ?? []).length).toBe(1);
    expect((xml.match(/w:val="Heading2"/g) ?? []).length).toBe(2);
    expect((xml.match(/<w:numPr>/g) ?? []).length).toBe(2); // 2 mục danh sách
    expect(xml).toContain("TOC \\h \\o");
    expect(xml).not.toContain('<w:b w:val="false"/>'); // không ghi đè in đậm của kiểu Heading
    expect(xml).toContain("Ký 3 hợp đồng | lớn");
    expect(xml).toContain("Xem thêm Rủi ro.");
    const media = Object.keys(zip.files).filter((f) => f.startsWith("word/media/") && !f.endsWith("/"));
    expect(media).toHaveLength(1);
  });
});

describe("M5 — Word: thụt lề theo tầng", () => {
  it("bậc thụt tự co theo độ sâu tổng thể, có sàn tối thiểu", () => {
    expect(outlineIndentStep(0, 9360)).toBe(OUTLINE_STEP_DXA);
    expect(outlineIndentStep(3, 9360)).toBe(OUTLINE_STEP_DXA); // cây nông: 1 cm/tầng
    expect(outlineIndentStep(10, 9360)).toBe(280); // 30% × 9360 / 10
    expect(outlineIndentStep(10, 9360) * 10).toBeLessThanOrEqual(9360 * 0.3);
    expect(outlineIndentStep(40, 9360)).toBe(OUTLINE_STEP_MIN_DXA);
  });

  it("mô hình ghi tầng: tiêu đề/mục = độ sâu node, nội dung = độ sâu + 1", () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2 }));
    const outline = (k: string, t: string) => doc.blocks.find((b) => b.kind === k && "text" in b && b.text === t)!;
    expect(outline("heading", "Kế hoạch 2026")).toMatchObject({ outline: 0 });
    expect(outline("heading", "Mục tiêu")).toMatchObject({ outline: 1 });
    expect(outline("paragraph", "Đoạn ghi chú 1.")).toMatchObject({ outline: 2 });
    expect(doc.blocks.find((b) => b.kind === "table")).toMatchObject({ outline: 2 });
    expect(outline("listItem", "Ký 3 hợp đồng | lớn")).toMatchObject({ outline: 3 });
    expect(maxOutline(doc)).toBe(3);
  });

  it("document.xml: tiêu đề, đoạn, bảng, danh sách thụt theo tầng; tắt thì không thụt", async () => {
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2 }));
    const xmlOf = async (byLevel: boolean) =>
      (await JSZip.loadAsync(await Packer.toBuffer(buildDocxDocument(doc, byLevel)))).file("word/document.xml")!.async("string");
    const xml = await xmlOf(true);
    const step = OUTLINE_STEP_DXA;
    const para = (text: string) => xml.split("</w:p>").find((p) => p.includes(`>${text}<`))!;
    expect(para("Kế hoạch 2026")).not.toContain("<w:ind");
    expect(para("Mục tiêu")).toContain(`w:left="${step}"`);
    expect(para("Đoạn ghi chú 1.")).toContain(`w:left="${2 * step}"`);
    expect(xml).toContain(`<w:tblInd w:type="dxa" w:w="${2 * step}"/>`);
    expect(para("☑ Ký 3 hợp đồng | lớn")).toMatch(new RegExp(`w:left="${3 * step + 283}"[^>]*w:hanging="283"|w:hanging="283"[^>]*w:left="${3 * step + 283}"`));
    const flat = await xmlOf(false);
    expect(flat).not.toContain("<w:tblInd");
  });
});

describe("M5 — nhập Markdown (đi hai chiều)", () => {
  it("xuất Markdown (ảnh nhúng) rồi nhập lại: giữ cây, checkbox, bảng (hàng/cột/căn lề/tên), ảnh", async () => {
    const { parseMarkdownDoc } = await import("./markdownImport");
    const { map } = buildMap();
    const doc = buildDocModel(map, opts({ headingDepth: 2, toc: true }));
    const { markdown } = renderMarkdown(doc, "embed");
    const r = parseMarkdownDoc(markdown);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = r.map;
    const root = m.nodes[m.rootId]!;
    expect(root.text).toBe("Kế hoạch 2026");
    const names = (ids: string[]) => ids.map((id) => m.nodes[id]!.text);
    expect(names(root.children)).toEqual(["Mục tiêu", "Rủi ro"]);
    const muc = m.nodes[root.children[0]!]!;
    expect(names(muc.children)).toEqual(["Doanh thu"]);
    const kyket = m.nodes[m.nodes[muc.children[0]!]!.children[0]!]!;
    expect(kyket).toMatchObject({ text: "Ký 3 hợp đồng | lớn", checked: true });
    expect(muc.notes).toContain("Đoạn ghi chú 1.");
    expect(muc.notes).toContain("Xem thêm Rủi ro.");
    const card = m.cards[muc.cardId!]!;
    const table = card.blocks.find((b) => b.type === "table")!;
    expect(table).toMatchObject({ title: "Ngân sách", headerRow: true, align: ["left", "right"] });
    expect(table.type === "table" && table.cells).toEqual([["Hạng mục", "Số tiền"], ["Thiết kế", "100"], ["Ghi chú | có gạch", "a\nb"]]);
    const img = card.blocks.find((b) => b.type === "image");
    expect(img && img.type === "image" && img.caption).toBe("Sơ đồ");
    expect(Object.values(m.assets)[0]?.dataBase64).toBe(PNG);
    // số lượng khớp map gốc khi xuất lại
    expect(docStats(buildDocModel(m, opts({ headingDepth: 2 })))).toMatchObject({ headings: 3, listItems: 2, tables: 1, tableRows: 3, images: 1 });
  });

  it("Markdown viết tay: danh sách số, thụt lề tab, bảng không tiêu đề, nhiều H1", async () => {
    const { parseMarkdownDoc } = await import("./markdownImport");
    const r = parseMarkdownDoc("Đoạn mở đầu\n\n1. Một\n\t2. Hai\n3. Ba\n\n# Phần A\n## A1\n# Phần B\n");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = r.map;
    const root = m.nodes[m.rootId]!;
    expect(root.text).toBe("Phần A");
    expect(root.notes).toBe("Đoạn mở đầu");
    expect(root.children.map((id) => m.nodes[id]!.text)).toEqual(["Một", "Ba", "A1", "Phần B"]);
    expect(m.nodes[root.children[0]!]!.children.map((id) => m.nodes[id]!.text)).toEqual(["Hai"]);
  });
});
