import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseT17mFile } from "./t17m";
import { searchNodes } from "../core/search";
import { getRootIds } from "../core/tree";
import { findBacklinks } from "../core/links";

/** File demo đi kèm bộ Hướng dẫn sử dụng (docs/huong-dan/demo) phải đúng như tài liệu nói. */
const DEMO = join(__dirname, "../../docs/huong-dan/demo");
const load = async (name: string) => {
  const b = readFileSync(join(DEMO, name));
  const r = await parseT17mFile(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);
  if (!r.ok) throw new Error(r.errors.join("; "));
  return r.map;
};

describe("Hướng dẫn sử dụng — Chương 1", () => {
  it("NMDMT-C1-khung-du-an.t17m: 49 node, 8 nhánh chính, bố cục hai bên, đúng chỗ cho bài tập", async () => {
    const m = await load("NMDMT-C1-khung-du-an.t17m");
    expect(Object.keys(m.nodes)).toHaveLength(49);
    expect(m.layoutType).toBe("logicBoth");
    expect(getRootIds(m)).toEqual([m.rootId]);
    const root = m.nodes[m.rootId]!;
    expect(root.text).toBe("Nhà máy điện mặt trời Ninh Sơn 1 — 50 MWp");
    expect(root.children.map((id) => m.nodes[id]!.text)).toEqual([
      "Xin phép & Thủ tục", "Quan hệ các bên", "Kỹ thuật", "Pháp lý", "Khách hàng & Mua điện", "Doanh thu", "Lợi nhuận & Tài chính", "Tiến độ & Rủi ro",
    ]);
    const parentText = (t: string) => m.nodes[m.nodes[Object.values(m.nodes).find((n) => n.text === t)!.id]!.parentId!]!.text;
    expect(parentText("Bảo hiểm")).toBe("Pháp lý");           // bài tập 2
    expect(parentText("Hợp đồng EPC")).toBe("Pháp lý");       // mục 1.6
    expect(searchNodes(m, "epc")).toHaveLength(2);              // bài tập 3: "Nhà thầu EPC" và "Hợp đồng EPC"
  });
});

describe("Hướng dẫn sử dụng — Chương 2", () => {
  it("NMDMT-C2-theo-doi.t17m: 53 node, 5 Tag, 4 liên kết, 1 tóm tắt, 1 khoanh vùng, 1 ghi chú dán, 1 nhánh trôi", async () => {
    const m = await load("NMDMT-C2-theo-doi.t17m");
    expect(Object.keys(m.nodes)).toHaveLength(53);
    expect(m.tags.map((t) => t.name)).toEqual(["Đang làm", "Chờ duyệt", "Vướng", "Hoàn thành", "Cần quyết định"]);
    expect(m.relationships).toHaveLength(4);
    expect(m.summaries).toHaveLength(1);
    expect(m.boundaries).toHaveLength(1);
    expect(m.stickyNotes).toHaveLength(1);
    const roots = getRootIds(m);
    expect(roots).toHaveLength(2);
    expect(roots.map((id) => m.nodes[id]!.text)).toContain("Việc cần làm tuần này");
    const byText = (t: string) => Object.values(m.nodes).find((n) => n.text === t)!;
    // bài tập 5: đúng 3 node mang Tag "Cần quyết định"
    const qd = m.tags.find((t) => t.name === "Cần quyết định")!.id;
    expect(Object.values(m.nodes).filter((n) => n.tagIds.includes(qd)).map((n) => n.text).sort()).toEqual(
      ["Bổ sung quy hoạch điện", "Hợp đồng mua bán điện (PPA)", "Ngân hàng cho vay"].sort(),
    );
    // các node dùng cho bài tập còn trống thuộc tính
    for (const t of ["Rủi ro thủ tục", "Rủi ro kỹ thuật", "Rủi ro thị trường", "Rủi ro tài chính", "Bảo hiểm", "Tuân thủ và báo cáo định kỳ"]) {
      const n = byText(t);
      expect([n.priority, n.progress, n.tagIds.length, n.markers.length]).toEqual([null, null, 0, 0]);
    }
    // tóm tắt/khoanh vùng của file mẫu và các node cần cho thao tác trong chương
    expect(m.boundaries[0]!.label).toBe("Chỉ tiêu trình HĐQT");
    const parentText = (t: string) => m.nodes[byText(t).parentId!]!.text;
    expect(parentText("Nhà thầu EPC")).toBe("Quan hệ các bên");
    expect(parentText("Hợp đồng EPC")).toBe("Pháp lý");
  });
});

describe("Hướng dẫn sử dụng — Chương 3", () => {
  it("NMDMT-C3-ho-so.t17m: 5 card (3 bảng, 1 ảnh), liên kết giữa card, 1 card trong Inbox; file thực hành đúng", async () => {
    const m = await load("NMDMT-C3-ho-so.t17m");
    expect(Object.keys(m.nodes)).toHaveLength(53);
    const cards = Object.values(m.cards);
    expect(cards).toHaveLength(5);
    const blocks = cards.flatMap((c) => c.blocks);
    expect(blocks.filter((b) => b.type === "table")).toHaveLength(3);
    expect(blocks.filter((b) => b.type === "image")).toHaveLength(1);
    const byNode = (t: string) => m.cards[Object.values(m.nodes).find((n) => n.text === t)!.cardId!]!;
    const ppa = byNode("Hợp đồng mua bán điện (PPA)");
    const rev = byNode("Doanh thu theo năm");
    const table = (c: typeof ppa) => c.blocks.find((b) => b.type === "table") as Extract<(typeof ppa)["blocks"][number], { type: "table" }>;
    expect([table(ppa).cells.length, table(ppa).cells[0]!.length]).toEqual([6, 3]);
    expect([table(rev).cells.length, table(rev).cells[0]!.length]).toEqual([6, 5]); // dán từ TSV
    expect(table(byNode("Chi phí vận hành (OPEX)")).cells.at(-1)).toEqual(["Tổng", "13,5", "~1,5% vốn đầu tư"]); // nhập từ CSV
    // liên kết: card doanh thu → card PPA; card PPA → node "Giá điện và cơ chế"
    expect(findBacklinks(m, { type: "card", id: ppa.id }).map((b) => b.cardId)).toEqual([rev.id]);
    const giaDien = Object.values(m.nodes).find((n) => n.text === "Giá điện và cơ chế")!;
    expect(findBacklinks(m, { type: "node", id: giaDien.id }).map((b) => b.cardId)).toEqual([ppa.id]);
    // Inbox: đúng một card chưa gắn node nào (đáp án bài tập 5)
    const used = new Set(Object.values(m.nodes).map((n) => n.cardId));
    expect(cards.filter((c) => !used.has(c.id)).map((c) => c.title)).toEqual(["Biên bản họp dân lần 2"]);
    // ảnh nhúng đủ dữ liệu; file thực hành tồn tại
    expect(Object.values(m.assets).every((a) => a.dataBase64.length > 1000)).toBe(true);
    for (const f of ["mat-bang-62ha.png", "so-do-dau-noi.png", "chi-phi-van-hanh.csv", "doanh-thu-5-nam.tsv"]) {
      expect(readFileSync(join(DEMO, "mau-c3", f)).length).toBeGreaterThan(100);
    }
  });
});

