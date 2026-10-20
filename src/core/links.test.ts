import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "./tree";
import { Store } from "./store";
import { MergeMapCommand } from "./commands";
import { createCard, createTextBlock } from "./cards";
import {
  makeLinkToken,
  parseSegments,
  linksIn,
  plainText,
  remapLinks,
  findBacklinks,
  nodeBacklinks,
  mentionQuery,
  mentionCandidates,
  resolveLinkLabel,
  relationshipTargetsFromLinks,
} from "./links";
import { validateMindMap } from "./validate";

function setup() {
  const map = createEmptyMap("Gốc");
  const a = createNode("Kế hoạch quý", map.rootId);
  const b = createNode("Ngân sách", map.rootId);
  map.nodes[a.id] = a;
  map.nodes[b.id] = b;
  map.nodes[map.rootId]!.children.push(a.id, b.id);
  const plan = createCard("Kế hoạch");
  const budget = createCard("Ngân sách 2026");
  plan.blocks = [createTextBlock(`Xem ${makeLinkToken("card", budget.id, "Ngân sách 2026")} và ${makeLinkToken("node", b.id, "Ngân sách")}.`)];
  budget.blocks = [createTextBlock("Chi tiết")];
  map.cards[plan.id] = plan;
  map.cards[budget.id] = budget;
  a.cardId = plan.id;
  b.cardId = budget.id;
  return { map, a: a.id, b: b.id, plan: plan.id, budget: budget.id };
}

describe("Liên kết trong văn bản (H2)", () => {
  it("token: tạo, tách đoạn, nhãn không làm vỡ cú pháp", () => {
    const t = makeLinkToken("card", "card_1", "A|B]]\nC");
    expect(t).toBe("[[card:card_1|A B C]]");
    expect(parseSegments(`Trước ${t} sau`)).toEqual([
      { kind: "text", text: "Trước " },
      { kind: "link", type: "card", id: "card_1", label: "A B C" },
      { kind: "text", text: " sau" },
    ]);
    expect(parseSegments("[[không phải token]] [[card:x]]")).toEqual([
      { kind: "text", text: "[[không phải token]] " },
      { kind: "link", type: "card", id: "x", label: "" },
    ]);
    expect(linksIn("[[node:n1|A]] và [[card:c2|B]]")).toEqual([
      { type: "node", id: "n1" },
      { type: "card", id: "c2" },
    ]);
  });

  it("chữ thuần dùng tên HIỆN TẠI của đích (đổi tên không làm hỏng), đích mất thì dùng nhãn cũ", () => {
    const { map, plan, budget } = setup();
    const text = (map.cards[plan]!.blocks[0] as { text: string }).text;
    expect(plainText(text, map)).toBe("Xem Ngân sách 2026 và Ngân sách.");
    map.cards[budget]!.title = "Ngân sách sửa";
    expect(plainText(text, map)).toBe("Xem Ngân sách sửa và Ngân sách.");
    delete map.cards[budget];
    expect(resolveLinkLabel(map, "card", budget)).toBeNull();
    expect(plainText(text, map)).toBe("Xem Ngân sách 2026 và Ngân sách.");
  });

  it("liên kết ngược của card và của node (trực tiếp hoặc qua card đang gắn)", () => {
    const { map, a, b, plan, budget } = setup();
    expect(findBacklinks(map, { type: "card", id: budget }).map((x) => x.cardId)).toEqual([plan]);
    expect(findBacklinks(map, { type: "card", id: plan })).toEqual([]);
    const nb = nodeBacklinks(map, b);
    expect(nb).toHaveLength(1); // trỏ cả node lẫn card của node — chỉ tính một lần
    expect(nb[0]!.snippet).toContain("Ngân sách 2026");
    expect(nodeBacklinks(map, a)).toEqual([]);
  });

  it("gõ @ hoặc [[ thì nhận ra chuỗi đang gõ", () => {
    expect(mentionQuery("Xem @ngan")).toEqual({ start: 4, query: "ngan" });
    expect(mentionQuery("@")).toEqual({ start: 0, query: "" });
    expect(mentionQuery("email a@b")).toBeNull();
    expect(mentionQuery("Xem [[Kế hoạch q")).toEqual({ start: 4, query: "Kế hoạch q" });
    expect(mentionQuery("Xem [[x]] xong")).toBeNull();
  });

  it("gợi ý card/node không phân biệt dấu, khớp đầu tên trước, bỏ chính card đang sửa", () => {
    const { map, plan } = setup();
    const c = mentionCandidates(map, "ngan", 8, plan);
    expect(c.map((x) => `${x.type}:${x.label}`)).toEqual(["card:Ngân sách 2026", "node:Ngân sách"]);
    expect(mentionCandidates(map, "ke hoach", 8, plan).map((x) => x.label)).toEqual(["Kế hoạch quý"]);
    expect(mentionCandidates(map, "", 3)).toHaveLength(3);
  });

  it("vẽ đường liên kết từ nhắc tới: node đích, bỏ cặp đã có đường", () => {
    const { map, a, b } = setup();
    expect(relationshipTargetsFromLinks(map, a)).toEqual([b]);
    map.relationships.push({ id: "r1", fromId: b, toId: a, label: "", color: "#000", dash: true, bend: null });
    expect(relationshipTargetsFromLinks(map, a)).toEqual([]);
  });

  it("ghép map: id trong liên kết được đổi theo id mới, liên kết ngược vẫn đúng", () => {
    const { map } = setup();
    const store = new Store(createEmptyMap("Khác"));
    const cmd = new MergeMapCommand(map);
    store.dispatch(cmd);
    const m = store.getMap();
    const merged = Object.values(m.cards).find((c) => c.title === "Kế hoạch")!;
    const target = Object.values(m.cards).find((c) => c.title === "Ngân sách 2026")!;
    const links = linksIn((merged.blocks[0] as { text: string }).text);
    expect(links[0]).toEqual({ type: "card", id: target.id });
    expect(m.nodes[links[1]!.id]?.text).toBe("Ngân sách");
    expect(findBacklinks(m, { type: "card", id: target.id })).toHaveLength(1);
    expect(validateMindMap(m)).toEqual([]);
    expect(remapLinks("[[card:x|A]] [[node:y]]", new Map([["x", "x2"]]), new Map())).toBe("[[card:x2|A]] [[node:y]]");
  });
});
