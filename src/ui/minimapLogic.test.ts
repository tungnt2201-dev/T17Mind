import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode, collectVisibleNodeIds } from "../core/tree";
import { Store } from "../core/store";
import { ToggleCollapseCommand } from "../core/commands";
import { computeMinimapGeometry, worldToMinimap, minimapToWorld, computeViewportWorldRect } from "./minimapLogic";
import type { MindMap, MindNode } from "../core/types";

describe("minimapLogic (P1.14)", () => {
  it("khung bao vừa khít nội dung, không tràn ra ngoài", () => {
    const map: MindMap = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    root.x = 0;
    root.y = 0;
    root.width = 170;
    root.height = 46;
    const far = createNode("Xa", root.id);
    far.x = 1000;
    far.y = 500;
    far.width = 120;
    far.height = 36;
    map.nodes[far.id] = far;
    root.children.push(far.id);

    const nodes = Object.values(map.nodes);
    const geo = computeMinimapGeometry(nodes, 220, 170, 10);
    const rootMM = worldToMinimap(geo, root.x, root.y);
    const farMM = worldToMinimap(geo, far.x + far.width, far.y + far.height);
    expect(rootMM.x).toBeGreaterThanOrEqual(0);
    expect(rootMM.y).toBeGreaterThanOrEqual(0);
    expect(farMM.x).toBeLessThanOrEqual(220);
    expect(farMM.y).toBeLessThanOrEqual(170);
  });

  it("quy đổi world -> minimap -> world khớp lại chính xác giá trị ban đầu", () => {
    const map: MindMap = createEmptyMap("Gốc");
    const nodes = Object.values(map.nodes);
    const geo = computeMinimapGeometry(nodes, 220, 170, 10);
    const original = { x: 543, y: 217 };
    const toMM = worldToMinimap(geo, original.x, original.y);
    const back = minimapToWorld(geo, toMM.x, toMM.y);
    expect(back.x).toBeCloseTo(original.x, 5);
    expect(back.y).toBeCloseTo(original.y, 5);
  });

  it("mảng node rỗng không chia cho 0 (scale hữu hạn, dương)", () => {
    const geo = computeMinimapGeometry([], 220, 170);
    expect(Number.isFinite(geo.scale)).toBe(true);
    expect(geo.scale).toBeGreaterThan(0);
  });

  it("khung viewport tính đúng từ ViewTransform + kích thước canvas", () => {
    const view = { scale: 1.5, offsetX: 100, offsetY: 50 };
    const rect = computeViewportWorldRect(view, 800, 600);
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;
    // Quy đổi ngược: điểm giữa khung world phải map đúng về giữa canvas
    expect(centerX * view.scale + view.offsetX).toBeCloseTo(400, 5);
    expect(centerY * view.scale + view.offsetY).toBeCloseTo(300, 5);
  });

  it("chế độ Đồng bộ/Độc lập cho ra tập node khác nhau đúng khi có nhánh thu gọn", () => {
    const map: MindMap = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const branch = createNode("Nhánh lớn", root.id);
    map.nodes[branch.id] = branch;
    root.children.push(branch.id);
    const farChild = createNode("Con rất xa", branch.id);
    map.nodes[farChild.id] = farChild;
    branch.children.push(farChild.id);

    const store = new Store(map);
    store.dispatch(new ToggleCollapseCommand(branch.id));
    const collapsed = store.getMap();

    const syncIds = new Set(collectVisibleNodeIds(collapsed));
    const independentIds = new Set(Object.keys(collapsed.nodes));

    expect(syncIds.has(farChild.id)).toBe(false); // ẩn theo canvas
    expect(independentIds.has(farChild.id)).toBe(true); // luôn bung hết
    expect(independentIds.size).toBeGreaterThan(syncIds.size);
  });
});
