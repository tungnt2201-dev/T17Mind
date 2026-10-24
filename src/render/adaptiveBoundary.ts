/**
 * render/adaptiveBoundary.ts
 * ---------------------------------------------------------------------
 * Nhóm trực quan, chế độ E — "Adaptive Multi-Contour". THUẦN TypeScript: không DOM,
 * không Canvas; chỉ nhận hình chữ nhật (toạ độ thế giới) và trả về hình học.
 *
 * Cách làm:
 *  1. Liên kết: hai node có khoảng cách MÉP–MÉP ≤ connectionGap thì "gần nhau". Có
 *     hysteresis: cặp đã liên kết ở lần tính trước chỉ bị tách khi khoảng cách ≥
 *     1,25 × connectionGap (chống nhấp nháy khi kéo node qua ngưỡng).
 *  2. Mỗi node được nới ra `padding`; mỗi cặp gần nhau mà hai hình nới chưa chạm thì
 *     có thêm một "cầu nối" chữ L giữa hai điểm gần nhất. Cầu nối bị bỏ nếu chạm vào
 *     node KHÁC nhóm (obstacle) — nhờ đó đường bao hạn chế ôm nhầm node ngoài nhóm.
 *  3. Hợp tất cả các hình chữ nhật bằng nén toạ độ + lưới ô (mảng sai phân 2D) rồi dò
 *     biên → các vòng kín trực giao: vòng ngoài (diện tích dương) và lỗ (âm). Đường
 *     bao CHÍNH XÁC chứa mọi node cộng đệm, không thể tự cắt hay sinh NaN.
 *  4. Bo tròn các góc (smoothness) để ra đường mềm; chuỗi đường dẫn SVG dùng được
 *     cho cả Canvas (Path2D) lẫn xuất SVG.
 *  Mỗi vùng ngoài rời nhau = một "region". Hai node xa nhau → hai region.
 * Dữ liệu quá lớn / quá nhiều hình chữ nhật thì rơi về hộp bao từng cụm (vẫn đúng, kém "ôm").
 * ---------------------------------------------------------------------
 */

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Pt {
  x: number;
  y: number;
}

export interface Region {
  /** Vòng ngoài (trực giao, khép kín, chiều kim đồng hồ trên màn hình). */
  outer: Pt[];
  /** Các lỗ bên trong (vùng không thuộc nhóm bị vây quanh). */
  holes: Pt[][];
  bbox: { x: number; y: number; width: number; height: number };
  area: number;
  /** id các node thành viên nằm trong vùng này. */
  memberIds: string[];
  /** Đường dẫn SVG đã bo góc (vòng ngoài + lỗ), tô bằng quy tắc evenodd. */
  path: string;
}

export interface AdaptiveOptions {
  padding: number;
  connectionGap: number;
  /** 0–1. */
  smoothness: number;
  /** Rơi về hộp bao từng cụm (rẻ) thay vì dò contour đầy đủ. */
  quality?: "full" | "fast";
}

export interface AdaptiveResult {
  regions: Region[];
  /** Các cặp (khoá "idA|idB", idA < idB) đang liên kết — truyền lại lần sau làm hysteresis. */
  links: Set<string>;
  /** Có phải đã rơi về chế độ hộp bao (quá lớn hoặc quality = fast)? */
  approximate: boolean;
}

/** Ngưỡng tách = hệ số này × ngưỡng nối. */
export const HYSTERESIS_RATIO = 1.25;
/** Quá số hình chữ nhật này (gồm cả cầu nối) thì rơi về hộp bao. */
export const MAX_CONTOUR_RECTS = 700;

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Khoảng cách mép–mép giữa hai hình chữ nhật (0 nếu giao nhau/chạm). */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
  const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
  return Math.hypot(dx, dy);
}

const inflate = (r: { x: number; y: number; width: number; height: number }, d: number) => ({ x: r.x - d, y: r.y - d, width: r.width + 2 * d, height: r.height + 2 * d });
const intersects = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

function finiteRects(rects: Rect[]): Rect[] {
  return rects
    .filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height))
    .map((r) => ({ ...r, width: Math.max(1, r.width), height: Math.max(1, r.height) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Các cặp gần nhau (có hysteresis), quét theo trục x để tránh O(n²) khi dữ liệu lớn. */
export function computeLinks(rects: Rect[], gap: number, prevLinks?: ReadonlySet<string>): Set<string> {
  const links = new Set<string>();
  const sorted = [...rects].sort((a, b) => a.x - b.x || (a.id < b.id ? -1 : 1));
  const reach = gap * HYSTERESIS_RATIO;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i] as Rect;
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j] as Rect;
      // đã sắp theo x tăng dần: khoảng cách ngang a→b không giảm theo j, nên vượt ngưỡng là dừng được.
      if (b.x - (a.x + a.width) > reach) break;
      const d = rectDistance(a, b);
      const key = pairKey(a.id, b.id);
      if (d <= gap || (d < reach && prevLinks?.has(key))) links.add(key);
    }
  }
  return links;
}

/** Các nhóm node liên thông theo `links` (Union-Find), sắp ổn định theo id nhỏ nhất. */
export function clusterByLinks(rects: Rect[], links: ReadonlySet<string>): Rect[][] {
  const parent = new Map<string, string>();
  for (const r of rects) parent.set(r.id, r.id);
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r) as string;
    let c = x;
    while (parent.get(c) !== r) {
      const n = parent.get(c) as string;
      parent.set(c, r);
      c = n;
    }
    return r;
  };
  for (const key of links) {
    const [a, b] = key.split("|") as [string, string];
    if (!parent.has(a) || !parent.has(b)) continue;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  }
  const groups = new Map<string, Rect[]>();
  for (const r of rects) {
    const root = find(r.id);
    const list = groups.get(root) ?? [];
    list.push(r);
    groups.set(root, list);
  }
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([, v]) => v);
}

/** Điểm gần nhất trên hình chữ nhật `r` tới điểm (px,py). */
const clampTo = (r: Rect, px: number, py: number): Pt => ({ x: Math.min(r.x + r.width, Math.max(r.x, px)), y: Math.min(r.y + r.height, Math.max(r.y, py)) });

/** Cặp điểm gần nhất giữa hai hình chữ nhật (một điểm trên mỗi hình). */
export function nearestPoints(a: Rect, b: Rect): [Pt, Pt] {
  const bc = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const pa = clampTo(a, bc.x, bc.y);
  const pb = clampTo(b, pa.x, pa.y);
  const pa2 = clampTo(a, pb.x, pb.y);
  return [pa2, pb];
}

type Box = { x: number; y: number; width: number; height: number };

/** Cầu nối chữ L (hai hình chữ nhật dày `thick`) giữa hai điểm. */
function bridgeBoxes(pa: Pt, pb: Pt, thick: number): Box[] {
  const h = thick / 2;
  const horiz: Box = { x: Math.min(pa.x, pb.x) - h, y: pa.y - h, width: Math.abs(pb.x - pa.x) + thick, height: thick };
  const vert: Box = { x: pb.x - h, y: Math.min(pa.y, pb.y) - h, width: thick, height: Math.abs(pb.y - pa.y) + thick };
  return [horiz, vert];
}

// ---------------------------------------------------------------------
// Hợp các hình chữ nhật → vòng biên trực giao
// ---------------------------------------------------------------------

interface Loop {
  pts: Pt[];
  area: number;
}

function unionLoops(boxes: Box[]): Loop[] {
  const xsSet = new Set<number>();
  const ysSet = new Set<number>();
  for (const b of boxes) {
    xsSet.add(b.x);
    xsSet.add(b.x + b.width);
    ysSet.add(b.y);
    ysSet.add(b.y + b.height);
  }
  const xs = [...xsSet].sort((a, b) => a - b);
  const ys = [...ysSet].sort((a, b) => a - b);
  const W = xs.length - 1;
  const H = ys.length - 1;
  if (W < 1 || H < 1) return [];
  const xi = new Map(xs.map((v, i) => [v, i]));
  const yi = new Map(ys.map((v, i) => [v, i]));
  // mảng sai phân 2D, rồi tổng tiền tố → số hộp phủ mỗi ô
  const diff = new Int32Array((W + 1) * (H + 1));
  const at = (i: number, j: number): number => j * (W + 1) + i;
  for (const b of boxes) {
    const i0 = xi.get(b.x) as number;
    const i1 = xi.get(b.x + b.width) as number;
    const j0 = yi.get(b.y) as number;
    const j1 = yi.get(b.y + b.height) as number;
    diff[at(i0, j0)]! += 1;
    diff[at(i1, j0)]! -= 1;
    diff[at(i0, j1)]! -= 1;
    diff[at(i1, j1)]! += 1;
  }
  const filled = new Uint8Array(W * H);
  const acc = new Int32Array((W + 1) * (H + 1));
  for (let j = 0; j < H; j++) {
    let run = 0;
    for (let i = 0; i < W; i++) {
      run += diff[at(i, j)]!;
      const v = run + (j > 0 ? (acc[at(i, j - 1)] as number) : 0);
      acc[at(i, j)] = v;
      filled[j * W + i] = v > 0 ? 1 : 0;
    }
  }
  return traceLoops(xs, ys, W, H, (i, j) => filled[j * W + i] === 1);
}

function traceLoops(xs: number[], ys: number[], W: number, H: number, isFilled: (i: number, j: number) => boolean): Loop[] {
  const M = H + 1;
  const vkey = (i: number, j: number): number => i * M + j;
  type Edge = { to: number; dx: number; dy: number; used: boolean };
  const out = new Map<number, Edge[]>();
  const push = (i0: number, j0: number, i1: number, j1: number): void => {
    const k = vkey(i0, j0);
    const list = out.get(k) ?? [];
    list.push({ to: vkey(i1, j1), dx: Math.sign(i1 - i0), dy: Math.sign(j1 - j0), used: false });
    out.set(k, list);
  };
  const f = (i: number, j: number): boolean => i >= 0 && j >= 0 && i < W && j < H && isFilled(i, j);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      if (!f(i, j)) continue;
      if (!f(i, j - 1)) push(i, j, i + 1, j); // cạnh trên: sang phải
      if (!f(i + 1, j)) push(i + 1, j, i + 1, j + 1); // cạnh phải: đi xuống
      if (!f(i, j + 1)) push(i + 1, j + 1, i, j + 1); // cạnh dưới: sang trái
      if (!f(i - 1, j)) push(i, j + 1, i, j); // cạnh trái: đi lên
    }
  }
  const loops: Loop[] = [];
  const decode = (k: number): [number, number] => [Math.floor(k / M), k % M];
  // Ưu tiên rẽ phải, rồi đi thẳng, rồi rẽ trái (giữ ô được phủ ở bên phải → hai ô chạm chéo không dính thành hình số 8).
  const turnRank = (inDx: number, inDy: number, e: Edge): number => {
    const cross = inDx * e.dy - inDy * e.dx; // >0: rẽ phải trên màn hình (y hướng xuống)
    return cross > 0 ? 0 : cross === 0 ? 1 : 2;
  };
  const keys = [...out.keys()].sort((a, b) => a - b);
  for (const startKey of keys) {
    for (const first of out.get(startKey) as Edge[]) {
      if (first.used) continue;
      const pts: Pt[] = [];
      let curKey = startKey;
      let edge: Edge | undefined = first;
      let guard = 0;
      while (edge && !edge.used && guard++ < 1_000_000) {
        edge.used = true;
        const [ci, cj] = decode(curKey);
        pts.push({ x: xs[ci] as number, y: ys[cj] as number });
        const nextKey: number = edge.to;
        const candidates: Edge[] = (out.get(nextKey) ?? []).filter((e) => !e.used);
        candidates.sort((a, b) => turnRank(edge!.dx, edge!.dy, a) - turnRank(edge!.dx, edge!.dy, b));
        curKey = nextKey;
        edge = candidates[0];
        if (curKey === startKey && !edge) break;
      }
      const simplified = simplifyLoop(pts);
      if (simplified.length >= 4) loops.push({ pts: simplified, area: signedArea(simplified) });
    }
  }
  return loops;
}

/** Bỏ các điểm thẳng hàng. */
function simplifyLoop(pts: Pt[]): Pt[] {
  const n = pts.length;
  if (n < 4) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i + n - 1) % n] as Pt;
    const c = pts[i] as Pt;
    const q = pts[(i + 1) % n] as Pt;
    const cross = (c.x - p.x) * (q.y - c.y) - (c.y - p.y) * (q.x - c.x);
    if (cross !== 0) out.push(c);
  }
  return out;
}

/** Diện tích có dấu (dương = chiều kim đồng hồ trên màn hình, y hướng xuống). */
export function signedArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i] as Pt;
    const b = pts[(i + 1) % pts.length] as Pt;
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i] as Pt;
    const b = poly[j] as Pt;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Vòng trực giao → đường dẫn SVG, góc bo bán kính `radius` (kẹp theo nửa cạnh ngắn nhất kề góc). */
export function loopToPath(loop: Pt[], radius: number): string {
  const n = loop.length;
  const f = (v: number): string => String(Math.round(v * 100) / 100);
  if (n < 3) return "";
  if (radius <= 0.01) return `M${loop.map((p) => `${f(p.x)} ${f(p.y)}`).join(" L")} Z`;
  const segs: string[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i + n - 1) % n] as Pt;
    const cur = loop[i] as Pt;
    const next = loop[(i + 1) % n] as Pt;
    const l1 = Math.hypot(cur.x - prev.x, cur.y - prev.y);
    const l2 = Math.hypot(next.x - cur.x, next.y - cur.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    const a: Pt = { x: cur.x + ((prev.x - cur.x) / l1) * r, y: cur.y + ((prev.y - cur.y) / l1) * r };
    const b: Pt = { x: cur.x + ((next.x - cur.x) / l2) * r, y: cur.y + ((next.y - cur.y) / l2) * r };
    segs.push(`${i === 0 ? "M" : "L"}${f(a.x)} ${f(a.y)} Q${f(cur.x)} ${f(cur.y)} ${f(b.x)} ${f(b.y)}`);
  }
  return `${segs.join(" ")} Z`;
}

// ---------------------------------------------------------------------
// Điểm vào chính
// ---------------------------------------------------------------------

function makeRegions(loops: Loop[], members: Rect[], radius: number): Region[] {
  const outers = loops.filter((l) => l.area > 0).sort((a, b) => b.area - a.area);
  const holes = loops.filter((l) => l.area < 0);
  const regions: Region[] = outers.map((o) => {
    const myHoles = holes.filter((h) => pointInPolygon(h.pts[0] as Pt, o.pts)).map((h) => h.pts);
    const xs = o.pts.map((p) => p.x);
    const ys = o.pts.map((p) => p.y);
    const bbox = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    const memberIds = members
      .filter((m) => {
        const c = { x: m.x + m.width / 2, y: m.y + m.height / 2 };
        return pointInPolygon(c, o.pts) && !myHoles.some((h) => pointInPolygon(c, h));
      })
      .map((m) => m.id);
    const path = [o.pts, ...myHoles].map((l) => loopToPath(l, radius)).join(" ");
    return { outer: o.pts, holes: myHoles, bbox, area: o.area - myHoles.reduce((s, h) => s + Math.abs(signedArea(h)), 0), memberIds, path };
  });
  // ổn định: diện tích lớn trước, hoà thì theo id thành viên nhỏ nhất
  return regions.sort((a, b) => b.area - a.area || ((a.memberIds[0] ?? "") < (b.memberIds[0] ?? "") ? -1 : 1));
}

function clusterBoxRegions(clusters: Rect[][], padding: number, radius: number): Region[] {
  const regions: Region[] = [];
  for (const c of clusters) {
    const x0 = Math.min(...c.map((r) => r.x)) - padding;
    const y0 = Math.min(...c.map((r) => r.y)) - padding;
    const x1 = Math.max(...c.map((r) => r.x + r.width)) + padding;
    const y1 = Math.max(...c.map((r) => r.y + r.height)) + padding;
    const outer: Pt[] = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ];
    regions.push({ outer, holes: [], bbox: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, area: (x1 - x0) * (y1 - y0), memberIds: c.map((r) => r.id), path: loopToPath(outer, radius) });
  }
  return regions.sort((a, b) => b.area - a.area || ((a.memberIds[0] ?? "") < (b.memberIds[0] ?? "") ? -1 : 1));
}

/**
 * Tính các vùng bao của một nhóm.
 * @param members  hình chữ nhật của các node thành viên đang HIỆN.
 * @param obstacles hình chữ nhật của các node đang hiện nhưng KHÔNG thuộc nhóm (cầu nối tránh chúng).
 * @param prevLinks kết quả `links` lần trước (hysteresis).
 */
export function computeAdaptiveRegions(members: Rect[], opts: AdaptiveOptions, obstacles: Rect[] = [], prevLinks?: ReadonlySet<string>): AdaptiveResult {
  const rects = finiteRects(members);
  if (rects.length === 0) return { regions: [], links: new Set(), approximate: false };
  const pad = Math.max(0, opts.padding);
  const radius = Math.max(0, Math.min(1, opts.smoothness)) * pad * 0.9;
  const links = computeLinks(rects, opts.connectionGap, prevLinks);
  const byId = new Map(rects.map((r) => [r.id, r]));

  const boxes: Box[] = rects.map((r) => inflate(r, pad));
  const bridgeThick = Math.max(8, pad * 1.4);
  const obstacleBoxes = obstacles.filter((o) => Number.isFinite(o.x) && Number.isFinite(o.y)).map((o) => ({ x: o.x, y: o.y, width: o.width, height: o.height }));
  for (const key of [...links].sort()) {
    const [ia, ib] = key.split("|") as [string, string];
    const a = byId.get(ia);
    const b = byId.get(ib);
    if (!a || !b) continue;
    const padA = inflate(a, pad);
    const padB = inflate(b, pad);
    if (intersects(padA, padB) || padA.x + padA.width === padB.x || padB.x + padB.width === padA.x || padA.y + padA.height === padB.y || padB.y + padB.height === padA.y) continue; // đã dính nhau
    const [pa, pb] = nearestPoints(a, b);
    const parts = bridgeBoxes(pa, pb, bridgeThick);
    if (parts.some((part) => obstacleBoxes.some((o) => intersects(part, o)))) continue; // không ôm nhầm node ngoài nhóm
    boxes.push(...parts);
  }

  const clusters = clusterByLinks(rects, links);
  if (opts.quality === "fast" || boxes.length > MAX_CONTOUR_RECTS) {
    return { regions: clusterBoxRegions(clusters, pad, radius), links, approximate: true };
  }
  const loops = unionLoops(boxes);
  const regions = makeRegions(loops, rects, radius);
  if (regions.length === 0) return { regions: clusterBoxRegions(clusters, pad, radius), links, approximate: true };
  return { regions, links, approximate: false };
}

/** Khoảng cách từ điểm tới đoạn thẳng. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
}

/** Khoảng cách từ điểm tới đường viền (vòng ngoài và lỗ) của vùng. */
export function distanceToRegionStroke(p: Pt, region: Region): number {
  let best = Infinity;
  for (const loop of [region.outer, ...region.holes]) {
    for (let i = 0; i < loop.length; i++) best = Math.min(best, distToSegment(p, loop[i] as Pt, loop[(i + 1) % loop.length] as Pt));
  }
  return best;
}

/** Cây khung nhỏ nhất (Prim) nối các hình chữ nhật: trả về đoạn nối giữa hai điểm gần nhất của mỗi cặp. */
export function minimumSpanningSegments(items: Rect[]): [Pt, Pt][] {
  const n = items.length;
  if (n < 2) return [];
  const sorted = [...items].sort((a, b) => (a.id < b.id ? -1 : 1));
  const inTree = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  best[0] = 0;
  const segs: [Pt, Pt][] = [];
  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!inTree[i] && (u === -1 || (best[i] as number) < (best[u] as number))) u = i;
    inTree[u] = true;
    const parentIdx = from[u] as number;
    if (parentIdx >= 0) segs.push(nearestPoints(sorted[parentIdx] as Rect, sorted[u] as Rect));
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue;
      const d = rectDistance(sorted[u] as Rect, sorted[v] as Rect);
      if (d < (best[v] as number)) {
        best[v] = d;
        from[v] = u;
      }
    }
  }
  return segs;
}
