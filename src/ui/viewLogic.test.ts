import { describe, it, expect } from "vitest";
import { ZOOM_MAX, ZOOM_MIN, ZOOM_RECT_MIN_PX, zoomToRectView, clampViewToContent, keepSomeNodeVisible } from "./viewLogic";

const view = { offsetX: 90, offsetY: 300, scale: 1 };

/** Điểm thế giới → màn hình theo khung nhìn. */
const toScreen = (v: { offsetX: number; offsetY: number; scale: number }, wx: number, wy: number) => ({ x: wx * v.scale + v.offsetX, y: wy * v.scale + v.offsetY });

describe("Alt + kéo: phóng vào vùng", () => {
  it("vùng chọn choán vừa khít canvas, giữ đúng tỉ lệ, tâm vùng về giữa canvas", () => {
    // vùng 200×100 (màn hình) trên canvas 1000×500 → phóng 5 lần (bị chặn ở 3)
    const next = zoomToRectView({ x1: 300, y1: 400, x2: 500, y2: 500 }, view, 1000, 500)!;
    expect(next.scale).toBe(ZOOM_MAX);
    const c = toScreen(next, (400 - view.offsetX) / view.scale, (450 - view.offsetY) / view.scale); // tâm vùng
    expect(c.x).toBeCloseTo(500);
    expect(c.y).toBeCloseTo(250);

    // vùng 500×250 → phóng đúng 2 lần, hai góc vùng chạm mép canvas
    const n2 = zoomToRectView({ x1: 100, y1: 300, x2: 600, y2: 550 }, view, 1000, 500)!;
    expect(n2.scale).toBeCloseTo(2);
    const tl = toScreen(n2, (100 - 90) / 1, (300 - 300) / 1);
    const br = toScreen(n2, (600 - 90) / 1, (550 - 300) / 1);
    expect([tl.x, tl.y, br.x, br.y].map(Math.round)).toEqual([0, 0, 1000, 500]);
  });

  it("kéo ngược chiều (từ phải xuống trái, từ dưới lên) cho kết quả y hệt", () => {
    const a = zoomToRectView({ x1: 100, y1: 300, x2: 600, y2: 550 }, view, 1000, 500)!;
    const b = zoomToRectView({ x1: 600, y1: 550, x2: 100, y2: 300 }, view, 1000, 500)!;
    expect(b).toEqual(a);
  });

  it("vùng khác tỉ lệ canvas: cạnh dài hơn quyết định mức zoom, phần dư chia đều hai bên", () => {
    // vùng cao 400×100 trên canvas 800×600: bị cạnh ngang hạn chế → scale 2, vùng nằm giữa theo chiều dọc
    const next = zoomToRectView({ x1: 90, y1: 300, x2: 490, y2: 400 }, view, 800, 600)!;
    expect(next.scale).toBeCloseTo(2);
    const top = toScreen(next, 0, 0);
    const bottom = toScreen(next, 400, 100);
    expect(top.y + bottom.y).toBeCloseTo(600); // đối xứng quanh giữa canvas
  });

  it("tính đúng khi khung nhìn đã đang zoom/dịch", () => {
    const v = { offsetX: -200, offsetY: 50, scale: 2 };
    // vùng màn hình tương ứng thế giới (100..300, 100..200)
    const rect = { x1: 100 * 2 - 200, y1: 100 * 2 + 50, x2: 300 * 2 - 200, y2: 200 * 2 + 50 };
    const next = zoomToRectView(rect, v, 1000, 500)!;
    expect(next.scale).toBeCloseTo(Math.min(1000 / 200, 500 / 100, ZOOM_MAX));
    const c = toScreen(next, 200, 150);
    expect([Math.round(c.x), Math.round(c.y)]).toEqual([500, 250]);
  });

  it("vùng rộng hơn khung nhìn thì thu nhỏ lại, nhưng không quá mức tối thiểu", () => {
    const n = zoomToRectView({ x1: 0, y1: 0, x2: 2000, y2: 1000 }, view, 1000, 500)!;
    expect(n.scale).toBeCloseTo(0.5);
    const huge = zoomToRectView({ x1: 0, y1: 0, x2: 100000, y2: 100000 }, view, 1000, 500)!;
    expect(huge.scale).toBe(ZOOM_MIN);
  });

  it("kéo quá nhỏ (lỡ tay, bấm Alt + click) hoặc dữ liệu vô lý thì bỏ qua", () => {
    expect(zoomToRectView({ x1: 100, y1: 100, x2: 100 + ZOOM_RECT_MIN_PX - 1, y2: 300 }, view, 1000, 500)).toBeNull();
    expect(zoomToRectView({ x1: 100, y1: 100, x2: 300, y2: 100 }, view, 1000, 500)).toBeNull();
    expect(zoomToRectView({ x1: 0, y1: 0, x2: 100, y2: 100 }, view, 0, 500)).toBeNull();
    expect(zoomToRectView({ x1: 0, y1: 0, x2: 100, y2: 100 }, { ...view, scale: 0 }, 1000, 500)).toBeNull();
  });
});

describe("clampViewToContent — map luôn trong khung nhìn", () => {
  const W = 1000, H = 600;
  const box = { minX: 0, minY: 0, maxX: 200, maxY: 100 }; // nhỏ hơn khung
  it("contain: nội dung nhỏ bị đẩy ra ngoài → kéo vào trong, chừa lề", () => {
    const d = clampViewToContent({ offsetX: -500, offsetY: 900, scale: 1 }, box, W, H, "contain");
    expect(-500 + d.dx).toBe(40);
    expect(900 + d.dy + 100).toBe(H - 40);
  });
  it("contain: nội dung nhỏ đã nằm trong khung → không dịch", () => {
    expect(clampViewToContent({ offsetX: 300, offsetY: 200, scale: 1 }, box, W, H, "contain")).toEqual({ dx: 0, dy: 0 });
  });
  it("contain: nội dung lớn hơn khung → không để hở mép trống", () => {
    const big = { minX: 0, minY: 0, maxX: 3000, maxY: 2000 };
    const d = clampViewToContent({ offsetX: 200, offsetY: -1800, scale: 1 }, big, W, H, "contain");
    expect(200 + d.dx).toBe(40); // mép trái không lùi vào quá lề
    expect(-1800 + d.dy + 2000).toBe(H - 40); // mép dưới không lên cao hơn lề dưới
  });
  it("keep: kéo map gần hết ra ngoài thì vẫn giữ lại một phần; ở trong khung thì để yên", () => {
    const d = clampViewToContent({ offsetX: -190, offsetY: 0, scale: 1 }, box, W, H, "keep");
    expect(-190 + d.dx + 200).toBe(140); // còn 140 px nhìn thấy
    expect(clampViewToContent({ offsetX: -50, offsetY: 0, scale: 1 }, box, W, H, "keep")).toEqual({ dx: 0, dy: 0 });
  });
  it("có tính tỉ lệ zoom; nội dung rỗng → không dịch", () => {
    const d = clampViewToContent({ offsetX: 2000, offsetY: 0, scale: 0.5 }, box, W, H, "contain");
    expect(2000 + d.dx + 200 * 0.5).toBe(W - 40);
    expect(clampViewToContent({ offsetX: 0, offsetY: 0, scale: 1 }, null, W, H, "contain")).toEqual({ dx: 0, dy: 0 });
  });
});

describe("keepSomeNodeVisible — luôn còn ít nhất một node trong khung", () => {
  const W = 1000, H = 600;
  const nodes = [{ x: 0, y: 0, width: 120, height: 40 }, { x: 3000, y: 2000, width: 120, height: 40 }];
  it("còn node lộ ra trong khung → không dịch (kể cả khi khung bao có khoảng trống)", () => {
    expect(keepSomeNodeVisible({ offsetX: 100, offsetY: 100, scale: 1 }, nodes, W, H)).toEqual({ dx: 0, dy: 0 });
  });
  it("khung nhìn rơi vào khoảng trống giữa các nhánh → kéo node gần nhất vào trong", () => {
    const v = { offsetX: -1500, offsetY: -1000, scale: 1 }; // nhìn vào giữa hai node: trống trơn
    const d = keepSomeNodeVisible(v, nodes, W, H);
    const x1 = 0 + v.offsetX + d.dx, y1 = 0 + v.offsetY + d.dy;
    const x2 = 3000 + v.offsetX + d.dx, y2 = 2000 + v.offsetY + d.dy;
    const inside = (x: number, y: number) => x >= 0 && x + 120 <= W && y >= 0 && y + 40 <= H;
    expect(inside(x1, y1) || inside(x2, y2)).toBe(true);
  });
  it("chỉ lộ một mẩu quá nhỏ cũng tính là đã trôi ra ngoài", () => {
    const d = keepSomeNodeVisible({ offsetX: -110, offsetY: 0, scale: 1 }, [nodes[0]!], W, H);
    expect(-110 + d.dx).toBe(40);
  });
});
