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
