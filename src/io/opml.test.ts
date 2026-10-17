// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { exportOpml, parseOpmlFile } from "./opml";
import { createEmptyMap, createNode, getRootIds } from "../core/tree";
import { validateMindMap } from "../core/validate";
import type { MindMap, MindNode } from "../core/types";

function buildFixtureMap(): MindMap {
  const map = createEmptyMap("Gốc <đặc biệt> & \"trích dẫn\"");
  const root = map.nodes[map.rootId] as MindNode;
  const child = createNode("Con A", root.id);
  child.notes = "Ghi chú của A";
  child.checked = true;
  map.nodes[child.id] = child;
  root.children.push(child.id);
  const grandchild = createNode("Cháu A1", child.id);
  map.nodes[grandchild.id] = grandchild;
  child.children.push(grandchild.id);
  const leaf = createNode("Con B (chưa xong)", root.id);
  leaf.checked = false;
  map.nodes[leaf.id] = leaf;
  root.children.push(leaf.id);

  const floatRoot = createNode("Nhánh trôi", null);
  map.nodes[floatRoot.id] = floatRoot;

  return map;
}

describe("io/opml — exportOpml (P2.9)", () => {
  it("xuất đúng cấu trúc XML, escape ký tự đặc biệt trong text", () => {
    const map = buildFixtureMap();
    const opml = exportOpml(map);
    expect(opml).toContain("<?xml");
    expect(opml).toContain("<opml");
    expect(opml).toContain("&lt;đặc biệt&gt;");
    expect(opml).toContain("&amp;");
    expect(opml).toContain("&quot;trích dẫn&quot;");
    // Không được có ký tự thô chưa escape lọt ra ngoài attribute
    expect(opml).not.toContain('text="Gốc <đặc biệt>');
  });

  it("ghi chú thành _note, checkbox thành _complete", () => {
    const map = buildFixtureMap();
    const opml = exportOpml(map);
    expect(opml).toContain('_note="Ghi chú của A"');
    expect(opml).toContain('_complete="true"');
    expect(opml).toContain('_complete="false"');
  });

  it("nhánh trôi xuất thành outline riêng ở cấp cao nhất", () => {
    const map = buildFixtureMap();
    const opml = exportOpml(map);
    expect(opml).toContain('text="Nhánh trôi"');
  });
});

describe("io/opml — parseOpmlFile (P2.9)", () => {
  it("roundtrip: xuất rồi đọc lại khớp đúng số node/gốc/ghi chú/checkbox", () => {
    const map = buildFixtureMap();
    const nodeCountBefore = Object.keys(map.nodes).length;
    const rootCountBefore = getRootIds(map).length;

    const opml = exportOpml(map);
    const result = parseOpmlFile(opml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(Object.keys(result.map.nodes).length).toBe(nodeCountBefore);
    expect(getRootIds(result.map).length).toBe(rootCountBefore);

    const conA = Object.values(result.map.nodes).find((n) => n.text === "Con A")!;
    expect(conA.notes).toBe("Ghi chú của A");
    expect(conA.checked).toBe(true);

    const conB = Object.values(result.map.nodes).find((n) => n.text.startsWith("Con B"))!;
    expect(conB.checked).toBe(false);
  });

  it("giữ đúng cấu trúc phân cấp (cháu vẫn là con của đúng cha)", () => {
    const map = buildFixtureMap();
    const opml = exportOpml(map);
    const result = parseOpmlFile(opml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const conA = Object.values(result.map.nodes).find((n) => n.text === "Con A")!;
    const chauA1 = Object.values(result.map.nodes).find((n) => n.text === "Cháu A1")!;
    expect(chauA1.parentId).toBe(conA.id);
    expect(conA.children).toContain(chauA1.id);
  });

  it("kết quả luôn hợp lệ theo validateMindMap", () => {
    const map = buildFixtureMap();
    const result = parseOpmlFile(exportOpml(map));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateMindMap(result.map)).toEqual([]);
  });

  it("đọc được file OPML từ nguồn NGOÀI T17Mind (không có _note/_complete, dùng attribute 'title' thay 'text')", () => {
    const externalOpml = `<?xml version="1.0"?>
<opml version="1.0">
  <head><title>Từ công cụ khác</title></head>
  <body>
    <outline title="Việc 1">
      <outline title="Việc con 1.1"/>
    </outline>
    <outline title="Việc 2"/>
  </body>
</opml>`;
    const result = parseOpmlFile(externalOpml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.nodes[result.map.rootId]?.text).toBe("Việc 1");
    expect(Object.values(result.map.nodes).some((n) => n.text === "Việc con 1.1")).toBe(true);
  });

  it("file XML sai cú pháp -> báo lỗi rõ ràng, không crash", () => {
    const result = parseOpmlFile("<opml><body><outline text=\"chưa đóng thẻ\"</body></opml>");
    expect(result.ok).toBe(false);
  });

  it("file không có <body> -> báo lỗi rõ ràng", () => {
    const result = parseOpmlFile('<?xml version="1.0"?><opml version="2.0"><head><title>X</title></head></opml>');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("body");
  });

  it("file không có outline nào -> báo lỗi rõ ràng", () => {
    const result = parseOpmlFile('<?xml version="1.0"?><opml version="2.0"><body></body></opml>');
    expect(result.ok).toBe(false);
  });
});
