/**
 * core/tree.ts
 * ---------------------------------------------------------------------
 * Các hàm THUẦN TUÝ (pure function) thao tác trên cấu trúc cây:
 * tạo node mới, thu thập một cây con, nhân bản sâu, sinh id...
 *
 * "Thuần tuý" ở đây nghĩa là: nhận dữ liệu vào, trả dữ liệu ra, không
 * tự ý ghi vào lịch sử hoàn tác. Việc bọc các hàm này thành thao tác
 * có thể hoàn tác được nằm ở commands.ts (lớp thao tác — P1.5).
 * ---------------------------------------------------------------------
 */
import type { MindMap, MindNode, Relationship, Summary, Boundary } from "./types";
import { CURRENT_SCHEMA_VERSION } from "./types";

/** Sinh id ngẫu nhiên đủ ngắn để đọc, đủ dài để không trùng trong một tài liệu. */
export function generateId(prefix: "n" | "r" | "s" | "b" | "k" | "m" | "tag" | "img"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** P2.6d — định danh cho CHÍNH TÀI LIỆU (khác generateId dùng cho các
 *  entity BÊN TRONG một tài liệu — node/relationship/summary/...).
 *  Tách hàm riêng dù dùng chung công thức, để chỗ gọi thể hiện rõ ý
 *  định — không ai nhầm "đây là id một map" với "đây là id một node". */
export function generateMapId(): string {
  return generateId("m");
}

/** P2.7e — định danh cho một Tag trong danh sách tập trung của map. */
export function generateTagId(): string {
  return generateId("tag");
}

/** Tạo một node mới, chưa gắn vào map nào. */
export function createNode(text: string, parentId: string | null): MindNode {
  return {
    id: generateId("n"),
    text: text || "Node mới",
    parentId,
    children: [],
    collapsed: false,
    notes: null,
    color: null,
    fill: null,
    fillTransparent: false,
    fillOpacity: 100,
    borderStyle: "solid",
    borderColor: null,
    link: null,
    imageAssetId: null,
    markers: [],
    progress: null,
    priority: null,
    tagIds: [],
    edgeColor: null,
    edgeDash: false,
    edgeShape: "curve",
    edgeWidth: null,
    fontSize: null,
    fontFamily: null,
    textAlign: "center",
    textFit: "auto",
    textBold: false,
    textItalic: false,
    textUnderline: false,
    checked: null,
    edgeLabel: null,
    offsetX: 0,
    offsetY: 0,
    manualWidth: null,
    manualHeight: null,
    baseX: 0,
    baseY: 0,
    x: 0,
    y: 0,
    width: 120,
    height: 36,
  };
}

/** Tạo một tài liệu mindmap trống, chỉ có node gốc. */
export function createEmptyMap(title: string): MindMap {
  const root = createNode(title || "Chủ đề trung tâm", null);
  root.width = 170;
  root.height = 46;
  return {
    mapId: generateMapId(),
    mapTitle: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rootId: root.id,
    nodes: { [root.id]: root },
    relationships: [],
    summaries: [],
    boundaries: [],
    stickyNotes: [],
    showEdgeLabels: false,
    showRelationships: true,
    showSummaries: true,
    layoutType: "logicRight",
    tags: [],
    assets: {},
    organicEdges: false,
    activeThemeId: null,
  };
}

/** Lấy node theo id, ném lỗi rõ ràng nếu không tồn tại thay vì trả về
 *  undefined âm thầm. Dùng ở mọi nơi cần "chắc chắn node này có thật". */
export function requireNode(map: MindMap, id: string): MindNode {
  const node = map.nodes[id];
  if (!node) throw new Error(`Node không tồn tại: ${id}`);
  return node;
}

/** Thu thập id của một node và TOÀN BỘ con cháu của nó (duyệt sâu). */
export function collectSubtreeIds(map: MindMap, rootId: string): string[] {
  const result: string[] = [];
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    result.push(cur);
    const node = map.nodes[cur];
    if (node) stack.push(...node.children);
  }
  return result;
}

/** true nếu candidateId là chính node hoặc là con cháu của node đó.
 *  Dùng để chặn thả một node vào chính con cháu của nó (P1.8). */
export function isDescendantOrSelf(
  map: MindMap,
  nodeId: string,
  candidateId: string
): boolean {
  return collectSubtreeIds(map, nodeId).includes(candidateId);
}

/** Nhân bản sâu một node (KHÔNG kèm con), sinh id mới hoàn toàn.
 *  parentId truyền vào sẽ ghi đè vào bản sao. */
export function cloneNodeWithNewId(
  node: MindNode,
  newParentId: string | null
): MindNode {
  return {
    ...node,
    id: generateId("n"),
    parentId: newParentId,
    children: [], // con được nối lại ở lớp gọi, sau khi đã có id mới của chính con
  };
}

/**
 * Nhân bản sâu toàn bộ một cây con, sinh id mới cho MỌI node bên trong.
 * Trả về node gốc mới của bản sao và danh sách phẳng mọi node đã tạo,
 * để lớp gọi tự quyết định gắn vào map ở đâu.
 */
export function deepCloneSubtree(
  map: MindMap,
  rootId: string,
  newParentId: string | null
): { root: MindNode; all: MindNode[] } {
  const original = requireNode(map, rootId);
  const newRoot = cloneNodeWithNewId(original, newParentId);
  const all: MindNode[] = [newRoot];

  const cloneChildren = (originalId: string, clonedParent: MindNode) => {
    const originalNode = requireNode(map, originalId);
    for (const childId of originalNode.children) {
      const originalChild = requireNode(map, childId);
      const clonedChild = cloneNodeWithNewId(originalChild, clonedParent.id);
      clonedParent.children.push(clonedChild.id);
      all.push(clonedChild);
      cloneChildren(childId, clonedChild);
    }
  };
  cloneChildren(rootId, newRoot);

  return { root: newRoot, all };
}

/** Nhân bản sâu (deep clone) một object thuần JSON, dùng để chụp ảnh
 *  trạng thái phục vụ hoàn tác. Ưu tiên structuredClone của trình
 *  duyệt; JSON.parse/stringify là phương án dự phòng. */
export function deepClone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Liệt kê id mọi node ĐANG HIỂN THỊ (bỏ qua node nằm trong nhánh đã
 * thu gọn), theo đúng thứ tự duyệt sâu (depth-first). Vì layout xếp
 * các node theo đúng thứ tự này từ trên xuống dưới trên canvas, mảng
 * trả về CHÍNH LÀ thứ tự xuất hiện trên màn hình — dùng để điều hướng
 * bằng phím Lên/Xuống (P1.9): trong cùng một nhóm anh em, hai node kề
 * nhau trong mảng này chính là hai anh em kề nhau; ở ranh giới một
 * nhóm, phần tử kế tiếp tự động là node đầu tiên của nhánh lân cận.
 */
export function collectVisibleNodeIds(map: MindMap): string[] {
  const result: string[] = [];
  const visit = (id: string): void => {
    result.push(id);
    const node = map.nodes[id];
    if (!node || node.collapsed) return;
    for (const childId of node.children) visit(childId);
  };
  for (const rootId of getRootIds(map)) visit(rootId);
  return result;
}

/**
 * Giống collectVisibleNodeIds nhưng duyệt TOÀN BỘ cây, KHÔNG bỏ qua
 * node nằm trong nhánh đang thu gọn. Dùng cho tìm kiếm — phải tìm được
 * cả những node đang bị ẩn, rồi tự bung nhánh ra khi nhảy tới (xem
 * AppController#revealNode), không được bỏ sót chỉ vì đang thu gọn.
 */
export function collectAllNodeIdsInOrder(map: MindMap): string[] {
  const result: string[] = [];
  const visit = (id: string): void => {
    result.push(id);
    const node = map.nodes[id];
    if (!node) return;
    for (const childId of node.children) visit(childId);
  };
  for (const rootId of getRootIds(map)) visit(rootId);
  return result;
}

/**
 * P2.5 — Nhánh trôi: một "gốc" giờ không còn nhất thiết là
 * map.rootId duy nhất — BẤT KỲ node nào có parentId = null đều là một
 * cây độc lập ("nhánh trôi"), không dính vào cây chính. Hàm này liệt
 * kê TẤT CẢ các gốc đó, luôn đặt map.rootId (gốc chính, không thể xoá)
 * lên đầu danh sách để layout/vẽ/duyệt ưu tiên nó trước.
 */
export function getRootIds(map: MindMap): string[] {
  const ids = Object.keys(map.nodes).filter((id) => map.nodes[id]?.parentId === null);
  return ids.sort((a) => (a === map.rootId ? -1 : 1));
}

/** P2.7 (nâng cấp) — độ sâu của một node trong cây, 0 = gốc (hoặc gốc
 *  của một nhánh trôi). Đi NGƯỢC parentId lên tới gốc, đếm số bước —
 *  không cần duyệt toàn cây, chỉ đi dọc theo đúng một đường. Dùng cho
 *  độ đậm nhạt đường nối tự động theo cấp — xem
 *  render/geometry.ts#computeEdgeWidth. */
export function getNodeDepth(map: MindMap, nodeId: string): number {
  let depth = 0;
  let cur = map.nodes[nodeId];
  while (cur && cur.parentId !== null) {
    depth++;
    cur = map.nodes[cur.parentId];
  }
  return depth;
}

/**
 * P2.14 — "Sắp xếp lại" (auto-arrange): xác định danh sách id các node
 * cần đưa offsetX/offsetY về 0 (để applyAllOffsets ở layout/index.ts
 * tính lại đúng vị trí bố cục tự động), khi người dùng bấm nút này vì
 * đã kéo tay quá nhiều node khiến hình dạng cây khó nhận diện.
 *
 * Phạm vi:
 *  - Đang chọn (các) node CỤ THỂ khác node gốc chính (map.rootId) — kể
 *    cả khi đó là gốc một nhánh trôi — chỉ dọn (các) node đó cùng TOÀN
 *    BỘ hậu duệ (kể cả đang thu gọn).
 *  - Không chọn gì, HOẶC chỉ đang chọn đúng một mình node gốc chính
 *    (trạng thái mặc định sau nhiều thao tác, xem SelectionModel#
 *    resetToRoot) — dọn TOÀN BỘ map (mọi cây, kể cả mọi nhánh trôi).
 *
 * CHỦ Ý LOẠI TRỪ offset của CHÍNH mọi node gốc (map.rootId + gốc mỗi
 * nhánh trôi) khỏi kết quả: offset của một node gốc là VỊ TRÍ NEO của
 * cả nhánh đó trên canvas vô hạn — nơi người dùng đã chủ động đặt
 * nhánh trôi, hoặc đã kéo cả cây chính tới — không phải một phần "hình
 * dạng" bên trong cần dọn. Reset nó sẽ khiến mọi nhánh trôi dồn hết về
 * đúng một điểm, xoá mất công sắp xếp tổng thể — ngược hẳn mục đích
 * của nút này (chỉ gọn lại BÊN TRONG một nhánh, giữ nguyên vị trí tổng
 * thể của nhánh đó trên canvas).
 */
export function getAutoArrangeTargetIds(
  map: MindMap,
  selectedIds: ReadonlySet<string> | readonly string[]
): string[] {
  const rootIds = getRootIds(map);
  const rootIdSet = new Set(rootIds);
  const selected = Array.from(selectedIds);
  const onlyDefaultRootSelected = selected.length === 1 && selected[0] === map.rootId;
  const scopeRootIds = selected.length === 0 || onlyDefaultRootSelected ? rootIds : selected;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const scopeRoot of scopeRootIds) {
    for (const id of collectSubtreeIds(map, scopeRoot)) {
      if (seen.has(id)) continue;
      seen.add(id);
      if (rootIdSet.has(id)) continue; // giữ nguyên neo của node gốc
      const node = map.nodes[id];
      if (node && (node.offsetX !== 0 || node.offsetY !== 0)) {
        result.push(id);
      }
    }
  }
  return result;
}

export function cloneRelationship(r: Relationship): Relationship {
  return deepClone(r);
}
export function cloneSummary(s: Summary): Summary {
  return deepClone(s);
}
export function cloneBoundary(b: Boundary): Boundary {
  return deepClone(b);
}
