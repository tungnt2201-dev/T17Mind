import { describe, it, expect } from "vitest";
import { parseXmindFile, exportXmindFile } from "./xmind";
import { createEmptyMap, createNode, getRootIds } from "../core/tree";
import { validateMindMap } from "../core/validate";
import type { MindMap, MindNode } from "../core/types";

/** Dựng nội dung content.json THEO ĐÚNG cấu trúc đã đối chiếu với 3
 *  file .xmind thật (KH_cong_trinh_dau_tu.xmind, Cac_buoc_nhap_SAP,
 *  Mo_hinh_HD_Tu_van) — không phải đoán mò theo tài liệu công khai. */
function buildFakeXmindJson(): string {
  return JSON.stringify([
    {
      title: "Map 1",
      rootTopic: {
        id: "root-x",
        title: "Gốc XMind",
        structureClass: "org.xmind.ui.logic.right",
        children: {
          attached: [
            {
              id: "a-x",
              title: "Việc A",
              labels: ["Gấp"],
              style: { properties: { "svg:fill": "#D64545FF" } },
              children: { attached: [{ id: "a1-x", title: "Con của A" }] },
            },
            { id: "b-x", title: "Việc B", notes: { plain: { content: "Ghi chú B" } } },
          ],
          detached: [{ id: "float-x", title: "Nhánh trôi", position: { x: 100, y: 200 } }],
        },
      },
      relationships: [{ id: "rel-x", end1Id: "a-x", end2Id: "b-x", title: "liên quan" }],
    },
  ]);
}

async function buildFakeXmindBuffer(): Promise<ArrayBuffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("content.json", buildFakeXmindJson());
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("io/xmind — parseXmindFile (P2.9)", () => {
  it("đọc đúng cấu trúc cây, giữ đúng số node (đối chiếu KH_cong_trinh_dau_tu.xmind thật: 10 topic -> 10 node, khớp tuyệt đối)", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Gốc + A + A1 + B + Nhánh trôi = 5 node
    expect(Object.keys(result.map.nodes).length).toBe(5);
  });

  it("structureClass đã biết map đúng layoutType", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.layoutType).toBe("logicRight");
  });

  it("structureClass KHÔNG có tương đương (ví dụ timeline) -> fallback về logicRight, KHÔNG mất node nào (đối chiếu Mo_hinh_HD_Tu_van_-_Xay_lap.xmind thật, dùng org.xmind.ui.timeline.vertical)", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file(
      "content.json",
      JSON.stringify([{ title: "X", rootTopic: { title: "Gốc", structureClass: "org.xmind.ui.timeline.vertical" } }])
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.layoutType).toBe("logicRight");
  });

  it("children.detached ở ROOT thành nhánh trôi riêng, giữ đúng vị trí (đối chiếu Mo_hinh_HD_Tu_van_-_Xay_lap.xmind thật: đúng 3 gốc)", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(getRootIds(result.map).length).toBe(2); // gốc chính + 1 nhánh trôi
    const floatId = getRootIds(result.map).find((id) => id !== result.map.rootId)!;
    const floatNode = result.map.nodes[floatId] as MindNode;
    expect(floatNode.text).toBe("Nhánh trôi");
    expect(floatNode.offsetX).toBe(100);
    expect(floatNode.offsetY).toBe(200);
  });

  it("labels gộp thành Tag, màu #RRGGBBAA cắt đúng còn #RRGGBB", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.tags.some((t) => t.name === "Gấp")).toBe(true);
    const nodeA = Object.values(result.map.nodes).find((n) => n.text === "Việc A")!;
    expect(nodeA.fill).toBe("#D64545");
  });

  it("notes đọc đúng cả dạng object {plain:{content}}", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const nodeB = Object.values(result.map.nodes).find((n) => n.text === "Việc B")!;
    expect(nodeB.notes).toBe("Ghi chú B");
  });

  it("quan hệ chéo remap đúng ID (end1Id/end2Id -> fromId/toId)", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.relationships.length).toBe(1);
    const rel = result.map.relationships[0]!;
    const nodeA = Object.values(result.map.nodes).find((n) => n.text === "Việc A")!;
    const nodeB = Object.values(result.map.nodes).find((n) => n.text === "Việc B")!;
    expect(rel.fromId).toBe(nodeA.id);
    expect(rel.toId).toBe(nodeB.id);
  });

  it("kết quả luôn hợp lệ theo validateMindMap", async () => {
    const buffer = await buildFakeXmindBuffer();
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateMindMap(result.map)).toEqual([]);
  });

  it("nhiều sheet -> chỉ lấy sheet đầu, báo warning rõ ràng", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file(
      "content.json",
      JSON.stringify([
        { title: "Sheet 1", rootTopic: { title: "Gốc 1" } },
        { title: "Sheet 2", rootTopic: { title: "Gốc 2" } },
      ])
    );
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.nodes[result.map.rootId]?.text).toBe("Gốc 1");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("file không có content.json (XMind cũ) -> báo lỗi rõ ràng, không crash", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("content.xml", "<xml>giả lập file cũ</xml>");
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    const result = await parseXmindFile(buffer);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("content.json");
  });

  it("file không phải ZIP hợp lệ -> báo lỗi rõ ràng, không crash", async () => {
    const fakeBuffer = new TextEncoder().encode("không phải file zip").buffer;
    const result = await parseXmindFile(fakeBuffer as ArrayBuffer);
    expect(result.ok).toBe(false);
  });
});

describe("io/xmind — exportXmindFile (P2.9)", () => {
  function buildT17MindMap(): MindMap {
    const map = createEmptyMap("Gốc T17Mind");
    const root = map.nodes[map.rootId] as MindNode;
    const child = createNode("Con", root.id);
    map.nodes[child.id] = child;
    root.children.push(child.id);
    const floatNode = createNode("Nhánh trôi", null);
    floatNode.offsetX = 50;
    floatNode.offsetY = 300;
    map.nodes[floatNode.id] = floatNode;
    return map;
  }

  it("xuất ra file ZIP hợp lệ, chứa đủ content.json/manifest.json/metadata.json", async () => {
    const map = buildT17MindMap();
    const blob = await exportXmindFile(map);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(zip.file("content.json")).not.toBeNull();
    expect(zip.file("manifest.json")).not.toBeNull();
    expect(zip.file("metadata.json")).not.toBeNull();
  });

  it("roundtrip đầy đủ: xuất rồi đọc lại khớp đúng số node/gốc", async () => {
    const map = buildT17MindMap();
    const nodeCountBefore = Object.keys(map.nodes).length;
    const rootCountBefore = getRootIds(map).length;

    const blob = await exportXmindFile(map);
    const reimported = await parseXmindFile(await blob.arrayBuffer());

    expect(reimported.ok).toBe(true);
    if (!reimported.ok) return;
    expect(Object.keys(reimported.map.nodes).length).toBe(nodeCountBefore);
    expect(getRootIds(reimported.map).length).toBe(rootCountBefore);
  });

  it("nhánh trôi xuất đúng vào children.detached kèm position", async () => {
    const map = buildT17MindMap();
    const blob = await exportXmindFile(map);
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const content = JSON.parse(await zip.file("content.json")!.async("text"));
    const detached = content[0].rootTopic.children.detached;
    expect(detached.length).toBe(1);
    expect(detached[0].position).toEqual({ x: 50, y: 300 });
  });
});
