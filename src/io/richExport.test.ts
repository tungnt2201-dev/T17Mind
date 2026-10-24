import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { Packer } from "docx";
import { createEmptyMap, createNode } from "../core/tree";
import { createCard, createEmbedBlock, createTextBlock, createTableBlock, validateCard } from "../core/cards";
import { buildDocModel, DEFAULT_DOC_OPTIONS } from "../core/docModel";
import { renderMarkdown } from "./markdownDoc";
import { buildDocxDocument } from "./docx";
import { parseMarkdownDoc } from "./markdownImport";
import { makeLinkToken } from "../core/links";
import { displayText } from "../core/richText";
import { AddBlockCommand, RemoveBlockCommand } from "../core/cardCommands";
import { Store } from "../core/store";
import { MergeMapCommand } from "../core/commands";
import { parseJsonFile, exportFlatJson } from "./json";
import type { MindMap } from "../core/types";

const RICH = "# Mục tiêu\nChữ **đậm**, *nghiêng*, ~~gạch~~ và `mã`.\n- một\n  - lồng\n1. đầu\n2. hai\n- [x] xong\n- [ ] chưa\n> trích dẫn\n```\ncode **x**\n```";

/** Gốc → node A mang card chứa văn bản (RICH). Trả thêm card B để nhúng. */
function build(): { map: MindMap; a: string; cardA: string; cardB: string } {
  const map = createEmptyMap("Gốc");
  const a = createNode("Mục A", map.rootId);
  map.nodes[a.id] = a;
  map.nodes[map.rootId]!.children.push(a.id);
  const ca = createCard("Card A");
  ca.blocks = [createTextBlock(RICH)];
  const cb = createCard("Card B nguồn");
  cb.blocks = [createTextBlock("Nội dung **nguồn**"), createTableBlock(2, 2, "Bảng nguồn")];
  (cb.blocks[1] as ReturnType<typeof createTableBlock>).cells = [["x", "y"], ["1", "=A2+1"]];
  map.cards[ca.id] = ca;
  map.cards[cb.id] = cb;
  a.cardId = ca.id;
  return { map, a: a.id, cardA: ca.id, cardB: cb.id };
}
const opts = { ...DEFAULT_DOC_OPTIONS, headingDepth: 2 };

describe("KW6 — xuất văn bản có định dạng", () => {
  it("docModel: đoạn có kiểu, danh sách, trích dẫn, khối mã", () => {
    const { map } = build();
    const doc = buildDocModel(map, opts);
    const kinds = doc.blocks.map((b) => b.kind);
    expect(kinds.filter((k) => k === "cardItem")).toHaveLength(6);
    expect(kinds).toContain("quote");
    expect(kinds).toContain("code");
    const p = doc.blocks.find((b) => b.kind === "paragraph" && b.text.startsWith("Chữ"));
    expect(p && p.kind === "paragraph" ? p.runs!.filter((r) => r.bold || r.italic || r.strike || r.code).map((r) => r.text) : []).toEqual(["đậm", "nghiêng", "gạch", "mã"]);
    const head = doc.blocks.find((b) => b.kind === "paragraph" && b.text === "Mục tiêu");
    expect(head && head.kind === "paragraph" ? head.runs!.every((r) => r.bold) : false).toBe(true);
  });
  it("Markdown: dựng lại ký hiệu, danh sách, tick, trích dẫn, khối mã", () => {
    const md = renderMarkdown(buildDocModel(build().map, opts), "none").markdown;
    expect(md).toContain("Chữ **đậm**, *nghiêng*, ~~gạch~~ và `mã`.");
    expect(md).toContain("- một");
    expect(md).toContain("  - lồng");
    expect(md).toContain("1. đầu");
    expect(md).toContain("- [x] xong");
    expect(md).toContain("- [ ] chưa");
    expect(md).toContain("> trích dẫn");
    expect(md).toContain("```\ncode **x**\n```");
  });
  it("Word: có chữ đậm/nghiêng/gạch, danh sách, khối mã, trích dẫn", async () => {
    const zip = await JSZip.loadAsync(await Packer.toBuffer(buildDocxDocument(buildDocModel(build().map, opts))));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("<w:b/>");
    expect(xml).toContain("<w:i/>");
    expect(xml).toContain("<w:strike/>");
    expect(xml).toContain("Consolas");
    expect(xml).toContain("☑ ");
    expect(xml).toContain("1. ");
    expect(xml).toContain("w:pBdr"); // viền trái của trích dẫn
    expect(xml).not.toContain("**đậm**"); // ký hiệu đã thành định dạng thật (khối mã giữ nguyên chữ)
  });
  it("văn bản thường không đổi (không có ký hiệu → đường cũ, giữ xuống dòng)", () => {
    const { map, cardA } = build();
    map.cards[cardA]!.blocks = [createTextBlock("Họp lúc 9:00 - mang laptop\n\nĐoạn hai: 3 * 4 = 12")];
    const doc = buildDocModel(map, opts);
    expect(doc.blocks.filter((b) => b.kind === "paragraph" && b.text.includes("Họp") || (b.kind === "paragraph" && b.text.includes("Đoạn hai")))).toHaveLength(2);
    expect(doc.blocks.some((b) => b.kind === "cardItem" || b.kind === "quote")).toBe(false);
  });
  it("liên kết trong văn bản định dạng lấy tên đích hiện tại", () => {
    const { map, cardA, cardB } = build();
    map.cards[cardA]!.blocks = [createTextBlock(`Xem **${makeLinkToken("card", cardB, "cũ")}** nhé`)];
    expect(displayText(map.cards[cardA]!.blocks[0]!.type === "text" ? (map.cards[cardA]!.blocks[0] as { text: string }).text : "", map)).toBe("Xem Card B nguồn nhé");
    const md = renderMarkdown(buildDocModel(map, opts), "none").markdown;
    expect(md).toContain("**Card B nguồn**");
  });
});

describe("KW6 — nhập Markdown", () => {
  it("đoạn có định dạng, trích dẫn, khối mã thành khối văn bản của card; đoạn thường vẫn là ghi chú", () => {
    const res = parseMarkdownDoc("# Gốc\n\nĐoạn thường.\n\nĐoạn **đậm** ở đây.\n\n> Trích dẫn\n\n```\nlet a = 1;\n\nlet b = 2;\n```\n");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const root = res.map.nodes[res.map.rootId]!;
    expect(root.notes).toBe("Đoạn thường.");
    const blocks = Object.values(res.map.cards).flatMap((c) => c.blocks);
    const texts = blocks.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
    expect(texts).toEqual(["Đoạn **đậm** ở đây.", "> Trích dẫn", "```\nlet a = 1;\n\nlet b = 2;\n```"]);
  });
  it("khứ hồi: xuất Markdown rồi nhập lại giữ được định dạng trong khối văn bản", () => {
    const md = renderMarkdown(buildDocModel(build().map, opts), "none").markdown;
    const res = parseMarkdownDoc(md);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const all = Object.values(res.map.cards).flatMap((c) => c.blocks).map((b) => (b.type === "text" ? b.text : "")).join("\n");
    expect(all).toContain("**đậm**");
    expect(all).toContain("```\ncode **x**\n```");
  });
});

describe("KW6 — khối nhúng", () => {
  it("hợp lệ; không cho nhúng chính mình; cardId rỗng bị báo", () => {
    const { map, cardA, cardB } = build();
    const card = map.cards[cardA]!;
    card.blocks.push(createEmbedBlock(cardB));
    expect(validateCard(card, map.assets)).toEqual([]);
    card.blocks.push(createEmbedBlock(cardA));
    expect(validateCard(card, map.assets).join("\n")).toContain("không được nhúng chính nó");
    card.blocks.push(createEmbedBlock(""));
    expect(validateCard(card, map.assets).join("\n")).toContain("thiếu cardId");
  });
  it("thêm/xoá bằng Command, hoàn tác được; JSON giữ khối nhúng", () => {
    const { map, cardA, cardB } = build();
    const store = new Store(map);
    const emb = createEmbedBlock(cardB, null);
    store.dispatch(new AddBlockCommand(cardA, emb));
    expect(store.getMap().cards[cardA]!.blocks.at(-1)).toMatchObject({ type: "embed", cardId: cardB });
    const res = parseJsonFile(exportFlatJson(store.getMap()));
    expect(res.ok).toBe(true);
    store.dispatch(new RemoveBlockCommand(cardA, emb.id));
    expect(store.getMap().cards[cardA]!.blocks.some((b) => b.type === "embed")).toBe(false);
    store.undo();
    expect(store.getMap().cards[cardA]!.blocks.some((b) => b.type === "embed")).toBe(true);
    store.undo();
    expect(store.getMap().cards[cardA]!.blocks.some((b) => b.type === "embed")).toBe(false);
  });
  it("xuất: nội dung nhúng được bung ra (kèm công thức đã tính), nhãn nguồn; nguồn bị xoá có thông báo; nhúng lồng chỉ một tầng", () => {
    const { map, cardA, cardB } = build();
    map.cards[cardA]!.blocks = [createEmbedBlock(cardB)];
    let md = renderMarkdown(buildDocModel(map, opts), "none").markdown;
    expect(md).toContain("*Nhúng từ: Card B nguồn*");
    expect(md).toContain("Nội dung **nguồn**");
    expect(md).toContain("| 1 | 2 |"); // =A2+1 → 2 (ô A2 = 1)
    // chỉ một khối
    map.cards[cardA]!.blocks = [createEmbedBlock(cardB, map.cards[cardB]!.blocks[0]!.id)];
    md = renderMarkdown(buildDocModel(map, opts), "none").markdown;
    expect(md).toContain("Nội dung **nguồn**");
    expect(md).not.toContain("Bảng nguồn");
    // nguồn bị xoá
    delete map.cards[cardB];
    md = renderMarkdown(buildDocModel(map, opts), "none").markdown;
    expect(md).toContain("nguồn đã bị xoá");
  });
  it("nhúng lồng: tầng sâu hơn chỉ là thẻ giữ chỗ (không vòng lặp)", () => {
    const { map, cardA, cardB } = build();
    map.cards[cardB]!.blocks = [createEmbedBlock(cardA)]; // B nhúng A, A nhúng B → vòng
    map.cards[cardA]!.blocks = [createEmbedBlock(cardB)];
    const md = renderMarkdown(buildDocModel(map, opts), "none").markdown;
    expect(md).toContain("Nhúng lồng");
  });
  it("ghép map: cardId của khối nhúng được ánh xạ sang id mới", () => {
    const { map, cardA, cardB } = build();
    map.cards[cardA]!.blocks = [createEmbedBlock(cardB)];
    const target = createEmptyMap("Đích");
    const store = new Store(target);
    store.dispatch(new MergeMapCommand(map));
    const newCardA = Object.values(store.getMap().cards).find((c) => c.title === "Card A")!;
    const newCardB = Object.values(store.getMap().cards).find((c) => c.title === "Card B nguồn")!;
    expect(newCardA.id).not.toBe(cardA);
    expect(newCardA.blocks[0]).toMatchObject({ type: "embed", cardId: newCardB.id });
  });
});
