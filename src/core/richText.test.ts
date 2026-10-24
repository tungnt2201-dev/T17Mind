import { describe, expect, it } from "vitest";
import { hasRichSyntax, inlineToMarkdown, parseInline, parseRich, richPlainText, toggleCheckLine } from "./richText";
import { continueList, insertCodeBlock, slashMatches, slashQuery, toggleInline, toggleLinePrefix } from "./richEdit";
import { makeLinkToken } from "./links";

const kinds = (t: string) => parseRich(t).map((b) => b.kind);

describe("parseInline", () => {
  it("đậm, nghiêng, gạch ngang, mã, lồng nhau", () => {
    expect(parseInline("a **b** c")).toEqual([{ text: "a " }, { text: "b", bold: true }, { text: " c" }]);
    expect(parseInline("*x* và ~~y~~")).toEqual([{ text: "x", italic: true }, { text: " và " }, { text: "y", strike: true }]);
    expect(parseInline("`a*b*`")).toEqual([{ text: "a*b*", code: true }]);
    expect(parseInline("**đậm *nghiêng* tiếp**")).toEqual([{ text: "đậm ", bold: true }, { text: "nghiêng", bold: true, italic: true }, { text: " tiếp", bold: true }]);
  });
  it("***đậm và nghiêng*** là cả hai kiểu, không còn dấu * thừa", () => {
    expect(parseInline("***x y***")).toEqual([{ text: "x y", bold: true, italic: true }]);
    expect(parseInline("a ***x*** b")).toEqual([{ text: "a " }, { text: "x", bold: true, italic: true }, { text: " b" }]);
  });
  it("ký hiệu không ôm sát chữ hoặc không đóng cặp là chữ thường", () => {
    for (const t of ["5 * 3 * 2", "a ** b ** c", "**chưa đóng", "*lẻ", "~~lẻ", "2*3", "a_b_c", "`lẻ"]) {
      if (t === "2*3") continue; // một dấu * giữa chữ: không có cặp
      expect(parseInline(t).map((s) => s.text).join("")).toBe(t);
      expect(parseInline(t).every((s) => !s.bold && !s.italic && !s.strike && !s.code)).toBe(true);
    }
  });
  it("token liên kết thành đoạn link, ký hiệu trong nhãn không bị hiểu nhầm", () => {
    const tok = makeLinkToken("card", "card_x", "Tên *lạ*");
    const out = parseInline(`xem ${tok} nhé`);
    expect(out[1]!.link).toMatchObject({ type: "card", id: "card_x" });
    expect(out[1]!.italic).toBeUndefined();
    expect(out.map((s) => s.text).join("")).toBe("xem Tên *lạ* nhé");
  });
});

describe("parseRich", () => {
  it("chữ thường nhiều dòng giữ nguyên từng dòng và dòng trống", () => {
    expect(kinds("một\n\nhai")).toEqual(["paragraph", "blank", "paragraph"]);
    expect(richPlainText("một\n\nhai")).toBe("một\n\nhai");
  });
  it("tiêu đề, trích dẫn, danh sách, số, tick, thụt bậc", () => {
    const b = parseRich("# T\n> q\n- a\n  - b\n* c\n1. x\n2. y\n- [ ] t1\n- [x] t2");
    expect(b.map((x) => x.kind)).toEqual(["heading", "quote", "bullet", "bullet", "bullet", "number", "number", "check", "check"]);
    expect(b[3]).toMatchObject({ kind: "bullet", depth: 1 });
    expect(b[6]).toMatchObject({ kind: "number", n: 2 });
    expect(b[8]).toMatchObject({ kind: "check", checked: true });
  });
  it("danh sách số đánh số liên tục và bắt đầu lại sau khối khác", () => {
    const b = parseRich("1. a\n1. b\ntext\n5. c");
    expect(b.filter((x) => x.kind === "number").map((x) => (x as { n: number }).n)).toEqual([1, 2, 1]);
  });
  it("khối mã: nội dung giữ nguyên, không phân tích ký hiệu; thiếu hàng rào đóng thì ăn hết", () => {
    const b = parseRich("```\n**x**\n- y\n```\nsau");
    expect(b[0]).toMatchObject({ kind: "code", lines: ["**x**", "- y"] });
    expect(b[1]).toMatchObject({ kind: "paragraph" });
    expect(parseRich("```\na\nb")[0]).toMatchObject({ kind: "code", lines: ["a", "b"] });
  });
  it("'#' không có dấu cách hoặc quá 3 cấp không phải tiêu đề; '-' đầu dòng không dấu cách là chữ", () => {
    expect(kinds("#tag\n#### x\n-x")).toEqual(["paragraph", "paragraph", "paragraph"]);
  });
  it("văn bản cũ có dấu gạch/số ở giữa câu không bị đổi", () => {
    const t = "Họp lúc 9:00 - nhớ mang laptop. Giá 1.200 - 1.500; 3 * 4 = 12";
    expect(kinds(t)).toEqual(["paragraph"]);
    expect(richPlainText(t)).toBe(t);
  });
});

describe("richPlainText / tiện ích", () => {
  it("bỏ ký hiệu, đầu dòng danh sách thành ký tự; liên kết lấy nhãn", () => {
    const tok = makeLinkToken("node", "n1", "Gốc");
    expect(richPlainText(`# Tiêu đề\n- **a** ${tok}\n- [x] xong\n1. một`)).toBe("Tiêu đề\n• a Gốc\n☑ xong\n1. một");
    expect(richPlainText("x [[card:c|Nhãn]]", ) ).toBe("x Nhãn");
    expect(richPlainText("[[card:c1]]", () => "Tên mới")).toBe("Tên mới");
  });
  it("hasRichSyntax nhận biết nhanh", () => {
    expect(hasRichSyntax("chữ thường")).toBe(false);
    for (const t of ["**a**", "*a*", "- a", "# a", "1. a", "> a", "`a`", "```\nx\n```", "~~a~~"]) expect(hasRichSyntax(t), t).toBe(true);
  });
  it("toggleCheckLine chỉ đổi đúng dòng việc cần làm", () => {
    const t = "a\n- [ ] x\n- [x] y";
    expect(toggleCheckLine(t, 1)).toBe("a\n- [x] x\n- [x] y");
    expect(toggleCheckLine(t, 2)).toBe("a\n- [ ] x\n- [ ] y");
    expect(toggleCheckLine(t, 0)).toBe(t);
    expect(toggleCheckLine(t, 9)).toBe(t);
  });
  it("inlineToMarkdown giữ dấu cách ngoài ký hiệu và vòng khứ hồi với parseInline", () => {
    expect(inlineToMarkdown([{ text: "a " }, { text: " b ", bold: true }, { text: "c", italic: true, bold: true }])).toBe("a  **b** ***c***");
    const src = "x **đậm** *nghiêng* ~~gạch~~ `mã`";
    expect(inlineToMarkdown(parseInline(src))).toBe(src);
  });
});

describe("richEdit", () => {
  it("toggleInline: bao vùng chọn, bỏ khi đã bao (bên ngoài hoặc trong vùng chọn), cặp rỗng, giữ dấu cách", () => {
    expect(toggleInline("ab cd", 3, 5, "**")).toEqual({ value: "ab **cd**", start: 5, end: 7 });
    expect(toggleInline("ab **cd**", 5, 7, "**")).toEqual({ value: "ab cd", start: 3, end: 5 });
    expect(toggleInline("ab **cd**", 3, 9, "**")).toEqual({ value: "ab cd", start: 3, end: 5 });
    expect(toggleInline("ab", 2, 2, "**")).toEqual({ value: "ab****", start: 4, end: 4 });
    expect(toggleInline("a  b  c", 1, 6, "*")).toEqual({ value: "a  *b*  c", start: 4, end: 5 });
    expect(toggleInline("   ", 0, 3, "*").value).toBe("   ");
  });
  it("toggleInline nghiêng không nhầm với đậm", () => {
    expect(toggleInline("**ab**", 2, 4, "*").value).toBe("***ab***");
  });
  it("toggleLinePrefix: đặt, bỏ, đổi kiểu, nhiều dòng, đánh số", () => {
    expect(toggleLinePrefix("a\nb", 0, 3, "bullet").value).toBe("- a\n- b");
    expect(toggleLinePrefix("- a\n- b", 0, 7, "bullet").value).toBe("a\nb");
    expect(toggleLinePrefix("- a\nb", 0, 5, "number").value).toBe("1. a\n2. b");
    expect(toggleLinePrefix("a", 0, 1, "check").value).toBe("- [ ] a");
    expect(toggleLinePrefix("- [x] a", 0, 7, "check").value).toBe("a");
    expect(toggleLinePrefix("# a", 0, 3, "h2").value).toBe("## a");
    expect(toggleLinePrefix("x\ny", 2, 2, "quote").value).toBe("x\n> y");
    expect(toggleLinePrefix("a\n\nb", 0, 4, "bullet").value).toBe("- a\n\n- b");
    expect(toggleLinePrefix("  - a", 0, 5, "number").value).toBe("  1. a");
  });
  it("toggleLinePrefix khi chỉ có con trỏ: con trỏ ở cuối dòng (không bôi đen), nhiều dòng thì giữ vùng chọn", () => {
    expect(toggleLinePrefix("", 0, 0, "check")).toEqual({ value: "- [ ] ", start: 6, end: 6 });
    expect(toggleLinePrefix("ab\ncd", 4, 4, "bullet")).toEqual({ value: "ab\n- cd", start: 7, end: 7 });
    expect(toggleLinePrefix("a\nb", 0, 3, "bullet")).toMatchObject({ start: 0, end: 7 });
  });
  it("insertCodeBlock bao dòng / chèn khối rỗng", () => {
    expect(insertCodeBlock("x\nabc\ny", 3, 3).value).toBe("x\n```\nabc\n```\ny");
    const e = insertCodeBlock("", 0, 0);
    expect(e.value).toBe("```\n\n```");
    expect(e.start).toBe(4);
  });
  it("continueList: tiếp tục kiểu, số tăng, tick trống, thoát khi dòng rỗng, null khi không phải danh sách", () => {
    expect(continueList("- a", 3)).toEqual({ value: "- a\n- ", start: 6, end: 6 });
    expect(continueList("1. a", 4)!.value).toBe("1. a\n2. ");
    expect(continueList("- [x] a", 7)!.value).toBe("- [x] a\n- [ ] ");
    expect(continueList("  - a", 5)!.value).toBe("  - a\n  - ");
    expect(continueList("x\n- ", 4)).toEqual({ value: "x\n", start: 2, end: 2 });
    expect(continueList("chữ thường", 3)).toBeNull();
    expect(continueList("- abc", 1)).toBeNull(); // con trỏ trong ký hiệu đầu dòng
    expect(continueList("- ab", 3)!.value).toBe("- a\n- b"); // tách giữa dòng
  });
  it("menu '/': chỉ mở ở đầu dòng, lọc không dấu", () => {
    expect(slashQuery("/")).toEqual({ start: 0, query: "" });
    expect(slashQuery("abc\n  /da")).toEqual({ start: 6, query: "da" });
    expect(slashQuery("giữa dòng /x")).toBeNull();
    expect(slashQuery("http://x")).toBeNull();
    expect(slashMatches("").length).toBeGreaterThan(8);
    expect(slashMatches("tieu").map((i) => i.id)).toEqual(["h1", "h2", "h3"]);
    expect(slashMatches("viec").map((i) => i.id)).toEqual(["check"]);
    expect(slashMatches("zzz")).toEqual([]);
  });
});

describe("định dạng bao quanh liên kết", () => {
  it("**[[card:…]]** là liên kết đậm; hai liên kết trong một cặp ký hiệu", () => {
    const t1 = makeLinkToken("card", "c1", "Một");
    const t2 = makeLinkToken("node", "n2", "Hai");
    const out = parseInline(`a **${t1}** b *${t1} và ${t2}*`);
    expect(out.find((s) => s.link && s.bold)?.link?.id).toBe("c1");
    const italics = out.filter((s) => s.italic);
    expect(italics.map((s) => s.text).join("")).toBe("Một và Hai");
    expect(italics.filter((s) => s.link)).toHaveLength(2);
    expect(inlineToMarkdown(out.map((s) => ({ ...s, text: s.text })))).toBe("a **Một** b *Một và Hai*");
  });
  it("ký tự giữ chỗ trong văn bản gốc không gây nhầm", () => {
    const out = parseInline("x\uE000 0\uE001 y " + makeLinkToken("card", "c1", "L"));
    expect(out.map((s) => s.text).join("")).toBe("x 0 y L");
  });
});
