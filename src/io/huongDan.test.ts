import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseT17mFile } from "./t17m";
import { searchNodes } from "../core/search";
import { getRootIds } from "../core/tree";

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
