/**
 * core/commands.ts
 * ---------------------------------------------------------------------
 * LỚP THAO TÁC — P1.5, bước quan trọng nhất của toàn dự án.
 *
 * Quy tắc tuyệt đối kể từ file này trở đi: KHÔNG NƠI NÀO ngoài file
 * này được phép sửa map.nodes / map.relationships / map.summaries
 * trực tiếp. Mọi thay đổi đi qua một Command, và mọi Command đi qua
 * store.dispatch() (xem store.ts). Đây là điều kiện để có hoàn tác
 * (P1.6), và sau này là chế độ dàn ý hai chiều và cộng tác — ba tính
 * năng khác nhau nhưng cùng phụ thuộc một quy tắc này.
 *
 * Mỗi Command implement:
 *   - apply(map)  : thực hiện thay đổi lên map (mutate tại chỗ)
 *   - revert(map) : đưa map về đúng trạng thái trước khi apply() chạy
 *
 * Với các Command chỉ dispatch MỘT LẦN (Add, Update, Delete, Move...),
 * apply() có thể tự bắt lại giá trị "trước khi đổi" mỗi lần nó chạy,
 * vì store đảm bảo apply() chỉ bao giờ được gọi lại sau một revert()
 * tương ứng (undo rồi redo) — nghĩa là map lúc đó đã y hệt lần đầu.
 *
 * Với các Command dùng trong một "session" kéo thả liên tục (đổi
 * offset, đổi kích thước — xem store.beginSession/updateSession), giá
 * trị cũ CHỈ được bắt đúng MỘT LẦN ở đầu session, vì apply() sẽ được
 * gọi lại nhiều lần liên tiếp KHÔNG có revert() xen giữa. Các command
 * này có cờ `captured` để tự bảo vệ khỏi bắt nhầm giá trị.
 * ---------------------------------------------------------------------
 */
import type {
  BorderStyle,
  EdgeShape,
  MindMap,
  MindNode,
  Relationship,
  Summary,
  Boundary,
  StickyNote,
  LayoutType,
  TagDef,
  Card,
  ImageAsset,
} from "./types";
import {
  createNode,
  requireNode,
  collectSubtreeIds,
  deepClone,
  cloneRelationship,
  cloneSummary,
  cloneBoundary,
  deepCloneSubtree,
  generateId,
  isDescendantOrSelf,
  getRootIds,
  generateTagId,
} from "./tree";
import type { ClipboardNode } from "./clipboard";
import { clipboardNodeToTree } from "./clipboard";
import { remapLinks } from "./links";
import {
  THEMES,
  BRANCH_PALETTE,
  colorForDepth,
  colorForBranchDepth,
  computeThemedStyleForNode,
  type Theme,
  type ThemeLevelStyle,
} from "./theme";

export interface Command {
  readonly label: string;
  apply(map: MindMap): void;
  revert(map: MindMap): void;
}

/** Gộp nhiều Command thành đúng MỘT bước hoàn tác. Dùng khi một hành
 *  động của người dùng (ví dụ "xoá 3 node đang chọn") thực chất cần
 *  chạy nhiều Command con — nếu không gộp, Ctrl+Z một lần sẽ chỉ lùi
 *  lại một phần của hành động, gây khó hiểu. */
export class CompositeCommand implements Command {
  readonly label: string;
  constructor(private readonly commands: Command[], label = "Nhiều thao tác") {
    this.label = label;
  }
  apply(map: MindMap): void {
    for (const command of this.commands) command.apply(map);
  }
  revert(map: MindMap): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      (this.commands[i] as Command).revert(map);
    }
  }
}

// =====================================================================
// Nội dung node
// =====================================================================

export class UpdateTextCommand implements Command {
  readonly label = "Sửa nội dung";
  private oldText: string | null = null;

  constructor(private readonly nodeId: string, private readonly newText: string) {}

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.oldText = node.text;
    node.text = this.newText;
  }
  revert(map: MindMap): void {
    if (this.oldText === null) return;
    requireNode(map, this.nodeId).text = this.oldText;
  }
}

/** Patch định dạng — dùng chung cho panel định dạng (màu, viền, link,
 *  kiểu đường nối). Chỉ những khoá có mặt trong patch mới bị đổi. */
export type NodeStylePatch = Partial<
  Pick<
    MindNode,
    | "color"
    | "fill"
    | "fillTransparent"
    | "borderStyle"
    | "borderColor"
    | "link"
    | "edgeColor"
    | "edgeDash"
    | "edgeShape"
    | "edgeWidth"
    | "notes"
    | "markers"
    | "progress"
    | "priority"
    | "fontSize"
    | "fontFamily"
    | "textAlign"
    | "textFit"
    | "edgeLabel"
    | "fillOpacity"
    | "textBold"
    | "textItalic"
    | "textUnderline"
    | "checked"
  >
>;

export class UpdateNodeStyleCommand implements Command {
  readonly label = "Đổi định dạng";
  private oldValues: NodeStylePatch = {};

  constructor(private readonly nodeId: string, private readonly patch: NodeStylePatch) {}

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    const old: NodeStylePatch = {};
    for (const key of Object.keys(this.patch) as (keyof NodeStylePatch)[]) {
      (old as unknown as Record<string, unknown>)[key] = node[key];
      (node as unknown as Record<string, unknown>)[key] = this.patch[key];
    }
    this.oldValues = old;
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    for (const key of Object.keys(this.oldValues) as (keyof NodeStylePatch)[]) {
      (node as unknown as Record<string, unknown>)[key] = this.oldValues[key];
    }
  }
}

/**
 * P2.7f — áp CÙNG một patch cho NHIỀU node cùng lúc (sửa hàng loạt khi
 * đang chọn nhiều node), gộp thành ĐÚNG MỘT bước hoàn tác — khác hẳn
 * việc dispatch UpdateNodeStyleCommand riêng cho từng node (sẽ tạo
 * nhiều bước hoàn tác vụn vặt, Ctrl+Z phải bấm nhiều lần mới về hết).
 * MỖI NODE tự nhớ giá trị cũ CỦA RIÊNG NÓ (một Map theo nodeId), không
 * phải cả nhóm dùng chung một giá trị cũ — quan trọng vì các node
 * đang chọn có thể có giá trị KHÁC NHAU trước khi sửa hàng loạt (ví
 * dụ node A đang đậm sẵn, node B chưa đậm — bật đậm hàng loạt rồi
 * hoàn tác phải trả A về đậm, B về chưa đậm, không phải cả 2 về cùng
 * một trạng thái).
 */
export class BulkUpdateNodeStyleCommand implements Command {
  readonly label = "Đổi định dạng hàng loạt";
  private oldValuesByNodeId = new Map<string, NodeStylePatch>();

  constructor(private readonly nodeIds: string[], private readonly patch: NodeStylePatch) {}

  apply(map: MindMap): void {
    this.oldValuesByNodeId = new Map();
    for (const nodeId of this.nodeIds) {
      const node = map.nodes[nodeId];
      if (!node) continue;
      const old: NodeStylePatch = {};
      for (const key of Object.keys(this.patch) as (keyof NodeStylePatch)[]) {
        (old as unknown as Record<string, unknown>)[key] = node[key];
        (node as unknown as Record<string, unknown>)[key] = this.patch[key];
      }
      this.oldValuesByNodeId.set(nodeId, old);
    }
  }
  revert(map: MindMap): void {
    for (const [nodeId, old] of this.oldValuesByNodeId) {
      const node = map.nodes[nodeId];
      if (!node) continue;
      for (const key of Object.keys(old) as (keyof NodeStylePatch)[]) {
        (node as unknown as Record<string, unknown>)[key] = old[key];
      }
    }
  }
}

export class ToggleCollapseCommand implements Command {
  readonly label = "Thu gọn / mở rộng";
  constructor(private readonly nodeId: string) {}
  apply(map: MindMap): void {
    // P2.7g (nâng cấp theo yêu cầu mới) — trước đây CHẶN HẲN thu gọn
    // gốc (vì lúc đó thu gọn nhị phân sẽ ẩn TOÀN BỘ cây ngay một
    // phát). Giờ ĐÃ CHUYỂN sang cơ chế xoay 3 nấc
    // (CycleCollapseLevelCommand bên dưới), "thu gọn gốc" không còn
    // đáng sợ như trước — nó chỉ là NẤC 1 trong chu kỳ, người dùng có
    // thể bấm tiếp để bung dần theo cấp, đúng ý đồ mới: mức thu gọn
    // tối đa là "chỉ còn 1 mình gốc", không còn bị cấm nữa.
    const node = requireNode(map, this.nodeId);
    node.collapsed = !node.collapsed;
  }
  revert(map: MindMap): void {
    this.apply(map); // tự nghịch đảo — bật lại là tắt, không cần nhớ gì thêm
  }
}

/**
 * P2.7g — gộp/bung TUẦN TỰ THEO CẤP, giống Org-mode: bấm lần lượt xoay
 * qua 3 trạng thái thay vì chỉ nhị phân ẩn hết/hiện hết như
 * ToggleCollapseCommand ở trên.
 *   1) Thu gọn hoàn toàn      — node.collapsed = true
 *   2) Chỉ hiện con trực tiếp — node mở, MỌI con có cháu đều tự thu gọn
 *   3) Mở hết toàn bộ cây con — mọi cấp đều mở
 * KHÔNG CẦN thêm trường dữ liệu mới nào — "trạng thái hiện tại" được
 * SUY RA ngay tại thời điểm bấm từ chính các cờ `collapsed` đã có sẵn
 * trên node và các con của nó (xem computeCollapseLevel), không lưu
 * trữ "đang ở nấc mấy" riêng — vì vậy không có gì có thể "lệch pha"
 * giữa dữ liệu lưu và trạng thái hiển thị thật.
 */
export class CycleCollapseLevelCommand implements Command {
  readonly label = "Gộp/bung theo cấp";
  private snapshot = new Map<string, boolean>();
  constructor(private readonly nodeId: string) {}

  apply(map: MindMap): void {
    // P2.7g (nâng cấp theo yêu cầu mới) — gốc GIỜ hoạt động Y HỆT
    // node thường trong chu kỳ 3 nấc (trước đây chặn riêng, không cho
    // gốc tự thu gọn ở nấc 1/3). Mức thu gọn TỐI ĐA của gốc giờ đúng
    // là "chỉ còn 1 mình gốc hiện" — đúng ý đồ mới, đối xứng hệt cách
    // một nhánh con bất kỳ có thể thu gọn hoàn toàn.
    this.snapshot = new Map();
    const node = requireNode(map, this.nodeId);
    // Node LÁ (không có con) thì không có gì để "cycle" cả — marker
    // cũng không bao giờ hiện cho trường hợp này (xem
    // hitTestCollapsedMarker). Không làm gì, tránh set collapsed=true
    // vô nghĩa (không ai nhìn thấy khác biệt gì) chỉ để làm bẩn dữ
    // liệu và tạo một bước hoàn tác thừa trong lịch sử.
    if (node.children.length === 0) return;
    const state = computeCollapseLevel(map, this.nodeId);

    const setCollapsed = (id: string, value: boolean): void => {
      const n = map.nodes[id];
      if (!n) return;
      if (!this.snapshot.has(id)) this.snapshot.set(id, n.collapsed);
      n.collapsed = value;
    };

    if (state === 1) {
      // 1 -> 2: mở CHÍNH node này ra, nhưng thu gọn NGAY mọi con có cháu
      // (để chỉ thấy đúng 1 tầng con trực tiếp, không thấy sâu hơn).
      setCollapsed(this.nodeId, false);
      for (const childId of node.children) {
        const child = map.nodes[childId];
        if (child && child.children.length > 0) setCollapsed(childId, true);
      }
    } else if (state === 2) {
      // 2 -> 3: mở ĐỆ QUY toàn bộ cây con — không chỉ con trực tiếp.
      const openAll = (id: string): void => {
        setCollapsed(id, false);
        const n = map.nodes[id];
        if (!n) return;
        for (const cid of n.children) openAll(cid);
      };
      for (const childId of node.children) openAll(childId);
    } else {
      // 3 (hoặc trạng thái xen kẽ bất kỳ khác) -> 1: thu gọn lại CHÍNH
      // node này — quay về điểm bắt đầu, đơn giản và dễ đoán, không cố
      // "nhớ" lại đã từng dừng ở đâu trước đó (xem ghi chú đầu class).
      setCollapsed(this.nodeId, true);
    }
  }
  revert(map: MindMap): void {
    for (const [id, oldValue] of this.snapshot) {
      const n = map.nodes[id];
      if (n) n.collapsed = oldValue;
    }
  }
}

/** P2.7g — mở NGAY toàn bộ cây con (bỏ qua các nấc giữa của cycle ở
 *  trên) — dành cho ai vẫn muốn hành vi "mở hết một phát" quen thuộc,
 *  gán cho Shift+bấm/Shift+C (xem appController.ts). */
export class ExpandAllCommand implements Command {
  readonly label = "Mở hết nhánh";
  private snapshot = new Map<string, boolean>();
  constructor(private readonly nodeId: string) {}
  apply(map: MindMap): void {
    this.snapshot = new Map();
    const openAll = (id: string): void => {
      const n = map.nodes[id];
      if (!n) return;
      if (!this.snapshot.has(id)) this.snapshot.set(id, n.collapsed);
      n.collapsed = false;
      for (const cid of n.children) openAll(cid);
    };
    openAll(this.nodeId);
  }
  revert(map: MindMap): void {
    for (const [id, oldValue] of this.snapshot) {
      const n = map.nodes[id];
      if (n) n.collapsed = oldValue;
    }
  }
}

/**
 * P2.7g — suy ra node đang ở "nấc" nào trong 3 trạng thái của
 * CycleCollapseLevelCommand, tính TRỰC TIẾP từ các cờ collapsed hiện
 * có (không lưu trữ riêng). Node lá hoặc không có cháu nào (con toàn
 * là lá) thì không có gì để phân biệt nấc 2/3 — coi là nấc 3 (trạng
 * thái "ổn định" nhất, để bấm lần tới quay thẳng về nấc 1).
 */
function computeCollapseLevel(map: MindMap, nodeId: string): 1 | 2 | 3 {
  const node = requireNode(map, nodeId);
  if (node.children.length === 0) return 3;
  if (node.collapsed) return 1;
  const childrenWithChildren = node.children
    .map((id) => map.nodes[id])
    .filter((n): n is MindNode => !!n && n.children.length > 0);
  if (childrenWithChildren.length === 0) return 3;
  const allCollapsed = childrenWithChildren.every((c) => c.collapsed);
  return allCollapsed ? 2 : 3;
}

// =====================================================================
// Kích thước / vị trí thủ công — dùng trong SESSION kéo thả (P1.8 bonus:
// kéo tự do đã có từ v3; P1.5 giữ nguyên hành vi này khi module hoá).
// =====================================================================

export class SetNodeOffsetCommand implements Command {
  readonly label = "Di chuyển node";
  private captured = false;
  private oldOffset = { x: 0, y: 0 };
  private newOffset = { x: 0, y: 0 };

  constructor(private readonly nodeId: string, startOffset: { x: number; y: number }) {
    this.newOffset = { ...startOffset };
  }

  setTarget(offset: { x: number; y: number }): void {
    this.newOffset = { ...offset };
  }

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    if (!this.captured) {
      this.oldOffset = { x: node.offsetX, y: node.offsetY };
      this.captured = true;
    }
    node.offsetX = this.newOffset.x;
    node.offsetY = this.newOffset.y;
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.offsetX = this.oldOffset.x;
    node.offsetY = this.oldOffset.y;
  }
}

export class SetNodeSizeCommand implements Command {
  readonly label = "Đổi kích thước node";
  private captured = false;
  private oldSize: { w: number | null; h: number | null } = { w: null, h: null };
  private newSize = { w: 0, h: 0 };

  constructor(private readonly nodeId: string, startSize: { w: number; h: number }) {
    this.newSize = { ...startSize };
  }

  setTarget(size: { w: number; h: number }): void {
    this.newSize = { ...size };
  }

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    if (!this.captured) {
      this.oldSize = { w: node.manualWidth, h: node.manualHeight };
      this.captured = true;
    }
    node.manualWidth = this.newSize.w;
    node.manualHeight = this.newSize.h;
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.manualWidth = this.oldSize.w;
    node.manualHeight = this.oldSize.h;
  }
}

export class ResetNodeSizeCommand implements Command {
  readonly label = "Đặt lại kích thước tự động";
  private oldSize: { w: number | null; h: number | null } = { w: null, h: null };
  constructor(private readonly nodeId: string) {}
  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.oldSize = { w: node.manualWidth, h: node.manualHeight };
    node.manualWidth = null;
    node.manualHeight = null;
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.manualWidth = this.oldSize.w;
    node.manualHeight = this.oldSize.h;
  }
}

/**
 * P2.3 — Sửa ghi chú. Dùng session giống SetNodeOffsetCommand/
 * SetNodeSizeCommand: bắt đầu session khi ô ghi chú được focus, gọi
 * setTarget()+updateSession() định kỳ trong lúc gõ (debounce ở phía
 * component Svelte, không phải ở đây — Command không biết gì về thời
 * gian), rồi endSession() khi rời ô. Kết quả: dữ liệu được lưu tạm vào
 * localStorage nhiều lần trong lúc gõ (an toàn cho ghi chú dài, lỡ mất
 * điện/đóng nhầm tab không mất hết), nhưng Ctrl+Z chỉ cần bấm MỘT LẦN
 * để lùi lại toàn bộ đoạn vừa gõ, không phải lùi từng đợt lưu tạm.
 */
/**
 * P2.10 — gắn/gỡ ảnh nhúng cho một node. KHÔNG dùng UpdateNodeStyleCommand
 * chung (xem ghi chú tại MindNode.imageAssetId trong types.ts) vì apply()
 * còn phải ghi thêm một mục MỚI vào map.assets — một thay đổi ở CẤP MAP.
 *
 * Gỡ ảnh: gọi với newAssetId=null, newAsset=null.
 * Gắn ảnh MỚI: LUÔN sinh assetId mới (xem ui/appController.ts#insertNodeImage)
 * — không bao giờ ghi đè một assetId đã có sẵn, nên revert() ở đây chỉ
 * cần xoá ĐÚNG assetId mà chính apply() này vừa thêm, không đụng gì
 * khác — không cần lo về việc node khác lỡ dùng chung asset đó.
 */
export class SetNodeImageCommand implements Command {
  readonly label = "Ảnh nhúng";
  private oldAssetId: string | null = null;

  constructor(
    private readonly nodeId: string,
    private readonly newAssetId: string | null,
    private readonly newAsset: ImageAsset | null
  ) {}

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.oldAssetId = node.imageAssetId;
    node.imageAssetId = this.newAssetId;
    if (this.newAssetId && this.newAsset) {
      map.assets[this.newAssetId] = this.newAsset;
    }
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    if (this.newAssetId) delete map.assets[this.newAssetId];
    node.imageAssetId = this.oldAssetId;
  }
}

export class SetNodeNotesCommand implements Command {
  readonly label = "Sửa ghi chú";
  private captured = false;
  private oldNotes: string | null = null;
  private newNotes: string | null;

  constructor(private readonly nodeId: string, startNotes: string | null) {
    this.newNotes = startNotes;
  }

  setTarget(notes: string | null): void {
    this.newNotes = notes;
  }

  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    if (!this.captured) {
      this.oldNotes = node.notes;
      this.captured = true;
    }
    node.notes = this.newNotes;
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.notes = this.oldNotes;
  }
}

// =====================================================================
// Thêm / xoá / di chuyển node trong cây
// =====================================================================

export class AddChildCommand implements Command {
  readonly label = "Thêm node con";
  private created: MindNode | null = null;

  constructor(private readonly parentId: string, private readonly text: string) {}

  apply(map: MindMap): void {
    const parent = requireNode(map, this.parentId);
    // Lần đầu apply(): tạo node mới. Khi redo (apply lần 2 trở đi sau
    // một revert): DÙNG LẠI đúng node/id đã tạo lần đầu, không sinh id
    // mới — nếu không, một relationship trỏ tới id cũ (tạo sau đó, rồi
    // undo/redo qua lại) sẽ trỏ vào hư không.
    const isFirstCreate = !this.created;
    const node = this.created ? this.created : createNode(this.text, this.parentId);
    this.created = node;
    map.nodes[node.id] = node;
    if (!parent.children.includes(node.id)) parent.children.push(node.id);
    // P2.11: chỉ tô theo theme lần TẠO ĐẦU TIÊN — lúc redo, node đã
    // mang sẵn màu đã tính từ lần đó, không tính lại (giữ đúng y hệt
    // sau mỗi undo/redo, không phụ thuộc map.activeThemeId có đổi
    // giữa chừng hay không).
    if (isFirstCreate) applyActiveThemeToNewNode(map, node.id);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    const parent = requireNode(map, this.parentId);
    parent.children = parent.children.filter((id) => id !== this.created!.id);
    delete map.nodes[this.created.id];
  }

  /** id của node vừa tạo — chỉ đọc được SAU khi đã dispatch. */
  get newNodeId(): string {
    if (!this.created) throw new Error("AddChildCommand chưa được apply.");
    return this.created.id;
  }
}

export class DeleteNodeCommand implements Command {
  readonly label = "Xoá node";
  private snapshotNodes: MindNode[] = [];
  // P2.5: null nghĩa là đang xoá một NHÁNH TRÔI (không có cha, không
  // cần splice khỏi children của ai cả) — khác node thường luôn có cha.
  private parentId: string | null = null;
  private indexInParent = 0;
  private relationshipsBefore: Relationship[] = [];
  private summariesBefore: Summary[] = [];
  private boundariesBefore: Boundary[] = [];

  constructor(private readonly nodeId: string) {}

  apply(map: MindMap): void {
    if (this.nodeId === map.rootId) throw new Error("Không thể xoá node gốc chính.");
    const node = requireNode(map, this.nodeId);
    this.parentId = node.parentId;

    const idsToRemove = collectSubtreeIds(map, this.nodeId);
    const removedSet = new Set(idsToRemove);
    this.snapshotNodes = idsToRemove.map((id) => deepClone(requireNode(map, id)));
    this.relationshipsBefore = map.relationships.map(cloneRelationship);
    this.summariesBefore = map.summaries.map(cloneSummary);
    this.boundariesBefore = map.boundaries.map(cloneBoundary);

    if (this.parentId !== null) {
      const parent = requireNode(map, this.parentId);
      this.indexInParent = parent.children.indexOf(this.nodeId);
      parent.children.splice(this.indexInParent, 1);
    }
    // parentId === null (nhánh trôi): không có cha nào để splice khỏi.

    for (const id of idsToRemove) delete map.nodes[id];
    map.relationships = map.relationships.filter(
      (r) => !removedSet.has(r.fromId) && !removedSet.has(r.toId)
    );
    for (const s of map.summaries) {
      s.nodeIds = s.nodeIds.filter((id) => !removedSet.has(id));
    }
    map.summaries = map.summaries.filter((s) => s.nodeIds.length >= 2);
    // Sửa lỗi có từ P2.4: trước đây KHÔNG lọc boundaries khi xoá node,
    // để lại tham chiếu "mồ côi" trong boundary.nodeIds.
    for (const b of map.boundaries) {
      b.nodeIds = b.nodeIds.filter((id) => !removedSet.has(id));
    }
    map.boundaries = map.boundaries.filter((b) => b.nodeIds.length >= 1);
  }

  revert(map: MindMap): void {
    for (const n of this.snapshotNodes) map.nodes[n.id] = deepClone(n);
    if (this.parentId !== null) {
      const parent = requireNode(map, this.parentId);
      const idx = Math.min(this.indexInParent, parent.children.length);
      parent.children.splice(idx, 0, this.nodeId);
    }
    map.relationships = this.relationshipsBefore.map(cloneRelationship);
    map.summaries = this.summariesBefore.map(cloneSummary);
    map.boundaries = this.boundariesBefore.map(cloneBoundary);
  }
}

/**
 * Di chuyển một node sang cha khác (hoặc đổi thứ tự trong cùng cha).
 * targetIndex là vị trí mong muốn trong children[] CỦA CHA MỚI, tính
 * SAU KHI node đã được rút khỏi vị trí cũ — nơi gọi không cần tự lo
 * việc lệch chỉ số khi kéo trong cùng một cha.
 */
export class MoveNodeCommand implements Command {
  readonly label = "Di chuyển trong cây";
  // P2.5: null nghĩa là node ĐANG LÀ một nhánh trôi trước khi di
  // chuyển (không có cha cũ để tách ra khỏi) — ví dụ khi kéo một
  // nhánh trôi thả vào cây chính để gắn nó lại.
  private oldParentId: string | null = null;
  private oldIndex = 0;

  constructor(
    private readonly nodeId: string,
    private readonly newParentId: string,
    private readonly targetIndex: number
  ) {}

  apply(map: MindMap): void {
    if (this.nodeId === map.rootId) throw new Error("Không thể di chuyển node gốc chính.");
    if (isDescendantOrSelf(map, this.nodeId, this.newParentId)) {
      throw new Error("Không thể thả một node vào chính con cháu của nó.");
    }
    const node = requireNode(map, this.nodeId);
    this.oldParentId = node.parentId;

    if (this.oldParentId !== null) {
      const oldParent = requireNode(map, this.oldParentId);
      this.oldIndex = oldParent.children.indexOf(this.nodeId);
      oldParent.children.splice(this.oldIndex, 1);
    }
    // oldParentId === null: đang là nhánh trôi, không có cha cũ để tách.

    const newParent = requireNode(map, this.newParentId);
    const clampedIndex = Math.max(0, Math.min(this.targetIndex, newParent.children.length));
    newParent.children.splice(clampedIndex, 0, this.nodeId);
    node.parentId = this.newParentId;
  }

  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    const currentParent = requireNode(map, this.newParentId);
    const idx = currentParent.children.indexOf(this.nodeId);
    if (idx >= 0) currentParent.children.splice(idx, 1);

    node.parentId = this.oldParentId;
    if (this.oldParentId !== null) {
      const oldParent = requireNode(map, this.oldParentId);
      const restoreIndex = Math.min(this.oldIndex, oldParent.children.length);
      oldParent.children.splice(restoreIndex, 0, this.nodeId);
    }
    // oldParentId === null: trở lại thành nhánh trôi, không cần chèn vào đâu.
  }
}

// =====================================================================
// P2.5 — Nhánh trôi (Floating branch): một cây con KHÔNG gắn vào gốc
// chính, parentId = null nhưng KHÔNG phải map.rootId. Xem getRootIds()
// trong core/tree.ts — mọi thứ khác (bố cục, vẽ, tìm kiếm, điều hướng)
// tự động hoạt động đúng một khi hai Command dưới đây tạo/tách đúng
// một node có parentId = null hợp lệ.
// =====================================================================

/**
 * Tạo một nhánh trôi HOÀN TOÀN MỚI — không phải tách từ cây có sẵn.
 * initialOffsetY dịch nó xuống dưới một khoảng để không chồng lên cây
 * chính hay các nhánh trôi khác đã có — nơi gọi (AppController) tự
 * tính khoảng dịch này tăng dần theo số nhánh trôi hiện có.
 */
/** Sinh id không trùng với bất kỳ id nào trong `taken` — generateId()
 *  thuần chỉ random (cực hiếm trùng), nhưng khi GHÉP HẲN một map khác
 *  vào (P2.9 — MergeMapCommand bên dưới), tốt hơn là đảm bảo TUYỆT ĐỐI
 *  bằng một vòng lặp kiểm tra, giống cách bản phác thảo ban đầu đã làm. */
function generateUniqueId(prefix: "n" | "r" | "s" | "b" | "k" | "tag" | "img" | "card", taken: Set<string>): string {
  let id: string;
  do {
    id = generateId(prefix);
  } while (taken.has(id));
  taken.add(id);
  return id;
}

/**
 * P2.9 — "Ghép thêm JSON" — nhập một file JSON KHÁC vào map đang mở,
 * biến (các) gốc của nó thành (các) NHÁNH TRÔI MỚI, tự động sinh lại
 * ID cho MỌI thực thể (node/Tag/quan hệ chéo/tóm tắt/khoanh vùng/ghi
 * chú dán) để không bao giờ trùng với dữ liệu đang có — tránh đúng
 * loại lỗi "ghi đè nhầm node của nhau" nếu 2 file từng xuất từ cùng
 * một nguồn gốc rồi chỉnh sửa riêng, tình cờ trùng id.
 *
 * HỖ TRỢ NHIỀU GỐC ngay từ đầu (map nguồn có thể tự nó đã có vài
 * nhánh trôi riêng — ví dụ chính nó cũng từng ghép nhiều lần trước
 * đó) — MỖI gốc trở thành một nhánh trôi RIÊNG trong map đích, xếp
 * chồng dọc bên dưới nội dung hiện có, cách nhau đủ xa để không đè
 * lên nhau (300px — không thể biết chính xác chiều cao THẬT của mỗi
 * cây con tại thời điểm này vì cần chạy layout thật, đo bằng canvas
 * context — Command thuần tuý không có quyền truy cập việc đó; 300px
 * đủ rộng cho tuyệt đại đa số trường hợp, người dùng luôn có thể tự
 * kéo lại nếu một nhánh đặc biệt cao).
 *
 * Tag GỘP THEO TÊN (không phân biệt hoa/thường) — nếu map nguồn có
 * Tag trùng tên với Tag đã có trong map đích, TÁI SỬ DỤNG đúng Tag đó
 * (không tạo Tag trùng lặp); chỉ Tag nào tên chưa từng có mới được
 * tạo mới. Quan hệ chéo/tóm tắt/khoanh vùng CHỈ giữ lại nếu MỌI id
 * liên quan đều nằm trong đúng phạm vi các node vừa remap — bỏ qua an
 * toàn (không tạo dữ liệu tham chiếu sai) nếu file nguồn có gì bất
 * thường (ví dụ tự sửa tay JSON làm hỏng tham chiếu).
 *
 * HOÀN TÁC: chụp ảnh (deep clone) TOÀN BỘ 6 phần dữ liệu CÓ THỂ bị
 * đụng tới NGAY TRƯỚC khi ghép — cách đơn giản và chắc chắn nhất,
 * tránh phải tính toán riêng "phần nào mới thêm cần xoá" (đặc biệt
 * rắc rối với Tag, vì Tag có thể được TÁI SỬ DỤNG chứ không phải lúc
 * nào cũng tạo mới — không thể chỉ "xoá mọi Tag mới thêm" một cách
 * đơn giản).
 */
export class MergeMapCommand implements Command {
  readonly label = "Ghép thêm map (nhánh trôi)";
  private snapshot: {
    nodes: Record<string, MindNode>;
    tags: TagDef[];
    relationships: Relationship[];
    summaries: Summary[];
    boundaries: Boundary[];
    stickyNotes: StickyNote[];
    assets: MindMap["assets"];
    cards: MindMap["cards"];
  } | null = null;
  private newRootIdsInternal: string[] = [];

  constructor(private readonly importedMap: MindMap) {}

  get newRootIds(): string[] {
    return this.newRootIdsInternal;
  }

  apply(map: MindMap): void {
    this.snapshot = {
      nodes: deepClone(map.nodes),
      tags: deepClone(map.tags),
      relationships: deepClone(map.relationships),
      summaries: deepClone(map.summaries),
      boundaries: deepClone(map.boundaries),
      stickyNotes: deepClone(map.stickyNotes),
      assets: deepClone(map.assets),
      cards: deepClone(map.cards),
    };

    // --- 1) Remap ID node: MỌI node trong file nhập đều nhận id MỚI ---
    const nodeIdRemap = new Map<string, string>();
    const takenNodeIds = new Set(Object.keys(map.nodes));
    for (const oldId of Object.keys(this.importedMap.nodes)) {
      nodeIdRemap.set(oldId, generateUniqueId("n", takenNodeIds));
    }

    // --- 1b) Ảnh nhúng (P2.10): remap id, KHÔNG gộp trùng như Tag (ảnh
    // không có "tên" để so khớp) — mỗi ảnh trong file nhập LUÔN thành
    // một mục MỚI trong map.assets đích, tránh trùng id với ảnh sẵn có. ---
    const assetIdRemap = new Map<string, string>();
    const takenAssetIds = new Set(Object.keys(map.assets));
    for (const oldAssetId of Object.keys(this.importedMap.assets ?? {})) {
      assetIdRemap.set(oldAssetId, generateUniqueId("img", takenAssetIds));
    }

    // --- 1c) Card (M1): MỌI card của file nhập đều nhận id MỚI (như node),
    // và khối ảnh trong card trỏ sang assetId đã remap ở trên. ---
    const cardIdRemap = new Map<string, string>();
    const takenCardIds = new Set(Object.keys(map.cards));
    for (const oldCardId of Object.keys(this.importedMap.cards ?? {})) {
      cardIdRemap.set(oldCardId, generateUniqueId("card", takenCardIds));
    }
    for (const [oldCardId, newCardId] of cardIdRemap) {
      const card = deepClone((this.importedMap.cards ?? {})[oldCardId] as Card);
      card.id = newCardId;
      for (const b of card.blocks) {
        if (b.type === "image") b.assetId = assetIdRemap.get(b.assetId) ?? b.assetId;
        // H2 — liên kết [[card:…]] / [[node:…]] trong văn bản trỏ theo id mới.
        if (b.type === "text") b.text = remapLinks(b.text, cardIdRemap, nodeIdRemap);
      }
      map.cards[newCardId] = card;
    }

    // --- 2) Tag: gộp theo TÊN (không phân biệt hoa/thường) ---
    const tagIdRemap = new Map<string, string>();
    const nameToExistingTagId = new Map<string, string>();
    for (const t of map.tags) {
      const key = t.name.trim().toLocaleLowerCase();
      if (key && !nameToExistingTagId.has(key)) nameToExistingTagId.set(key, t.id);
    }
    const takenTagIds = new Set(map.tags.map((t) => t.id));
    const newTags: TagDef[] = [];
    for (const t of this.importedMap.tags) {
      const key = t.name.trim().toLocaleLowerCase();
      const matchedId = key ? nameToExistingTagId.get(key) : undefined;
      if (matchedId) {
        tagIdRemap.set(t.id, matchedId);
      } else {
        const newId = generateUniqueId("tag", takenTagIds);
        tagIdRemap.set(t.id, newId);
        newTags.push({ ...deepClone(t), id: newId, name: t.name.trim() || "Tag" });
        if (key) nameToExistingTagId.set(key, newId);
      }
    }

    // --- 3) Remap node: parentId/children/tagIds theo bảng đã tính ---
    const remappedNodes: Record<string, MindNode> = {};
    for (const oldId of Object.keys(this.importedMap.nodes)) {
      const orig = this.importedMap.nodes[oldId] as MindNode;
      const newId = nodeIdRemap.get(oldId) as string;
      const clonedBase = deepClone(orig);
      const cloned: MindNode = {
        ...clonedBase,
        id: newId,
        parentId: clonedBase.parentId === null ? null : nodeIdRemap.get(clonedBase.parentId) ?? null,
        children: clonedBase.children.map((c) => nodeIdRemap.get(c)).filter((c): c is string => !!c),
        tagIds: clonedBase.tagIds.map((t) => tagIdRemap.get(t)).filter((t): t is string => !!t),
        imageAssetId: clonedBase.imageAssetId ? assetIdRemap.get(clonedBase.imageAssetId) ?? null : null,
        cardId: clonedBase.cardId ? cardIdRemap.get(clonedBase.cardId) ?? null : null,
      };
      remappedNodes[newId] = cloned;
    }

    // Ghi các ảnh đã remap id vào kho ảnh đích, theo ĐÚNG bảng vừa tính.
    for (const [oldAssetId, newAssetId] of assetIdRemap) {
      const asset = (this.importedMap.assets ?? {})[oldAssetId];
      if (asset) map.assets[newAssetId] = deepClone(asset);
    }

    // --- 4) MỖI gốc của map nhập vào -> MỘT nhánh trôi mới, xếp chồng
    // dọc bên dưới nội dung hiện có (xem ghi chú đầu class) ---
    let maxY = 0;
    for (const n of Object.values(map.nodes)) maxY = Math.max(maxY, (n.y ?? 0) + (n.height ?? 36));
    let cursorY = maxY + 180;
    this.newRootIdsInternal = [];
    for (const oldRootId of getRootIds(this.importedMap)) {
      const newRootId = nodeIdRemap.get(oldRootId);
      if (!newRootId) continue;
      const rootNode = remappedNodes[newRootId];
      if (!rootNode) continue;
      rootNode.parentId = null;
      rootNode.offsetX = 0;
      rootNode.offsetY = cursorY;
      cursorY += 300;
      this.newRootIdsInternal.push(newRootId);
    }

    for (const [id, node] of Object.entries(remappedNodes)) map.nodes[id] = node;
    map.tags = [...map.tags, ...newTags];

    // --- 5) Quan hệ chéo/tóm tắt/khoanh vùng/ghi chú dán — remap ID,
    // BỎ QUA an toàn nếu tham chiếu ra ngoài phạm vi vừa remap ---
    const takenRelIds = new Set(map.relationships.map((r) => r.id));
    const newRelationships: Relationship[] = [];
    for (const r of this.importedMap.relationships) {
      const fromId = nodeIdRemap.get(r.fromId);
      const toId = nodeIdRemap.get(r.toId);
      if (!fromId || !toId) continue;
      newRelationships.push({ ...cloneRelationship(r), id: generateUniqueId("r", takenRelIds), fromId, toId });
    }
    map.relationships = [...map.relationships, ...newRelationships];

    const takenSumIds = new Set(map.summaries.map((s) => s.id));
    const newSummaries: Summary[] = [];
    for (const s of this.importedMap.summaries) {
      const nodeIds = s.nodeIds.map((n) => nodeIdRemap.get(n)).filter((n): n is string => !!n);
      if (nodeIds.length === 0) continue;
      newSummaries.push({ ...cloneSummary(s), id: generateUniqueId("s", takenSumIds), nodeIds });
    }
    map.summaries = [...map.summaries, ...newSummaries];

    const takenBoundaryIds = new Set(map.boundaries.map((b) => b.id));
    const newBoundaries: Boundary[] = [];
    for (const b of this.importedMap.boundaries) {
      const nodeIds = b.nodeIds.map((n) => nodeIdRemap.get(n)).filter((n): n is string => !!n);
      if (nodeIds.length === 0) continue;
      newBoundaries.push({ ...cloneBoundary(b), id: generateUniqueId("b", takenBoundaryIds), nodeIds });
    }
    map.boundaries = [...map.boundaries, ...newBoundaries];

    // Ghi chú dán không tham chiếu node nào — chỉ cần remap ID và dịch
    // theo ĐÚNG độ lệch Y đã áp dụng cho gốc ĐẦU TIÊN (giữ đúng vị trí
    // TƯƠNG ĐỐI so với cây của nó, giống bản phác thảo ban đầu).
    const firstOldRootId = getRootIds(this.importedMap)[0];
    const firstOldRoot = firstOldRootId ? this.importedMap.nodes[firstOldRootId] : null;
    const shiftX = firstOldRoot ? -(firstOldRoot.offsetX ?? 0) : 0;
    const shiftY = firstOldRoot ? maxY + 180 - (firstOldRoot.offsetY ?? 0) : 0;
    const takenStickyIds = new Set(map.stickyNotes.map((k) => k.id));
    const newStickyNotes: StickyNote[] = this.importedMap.stickyNotes.map((k) => ({
      ...deepClone(k),
      id: generateUniqueId("k", takenStickyIds),
      x: (k.x ?? 0) + shiftX,
      y: (k.y ?? 0) + shiftY,
    }));
    map.stickyNotes = [...map.stickyNotes, ...newStickyNotes];
  }

  revert(map: MindMap): void {
    if (!this.snapshot) return;
    map.nodes = this.snapshot.nodes;
    map.tags = this.snapshot.tags;
    map.relationships = this.snapshot.relationships;
    map.summaries = this.snapshot.summaries;
    map.boundaries = this.snapshot.boundaries;
    map.stickyNotes = this.snapshot.stickyNotes;
    map.assets = this.snapshot.assets;
    map.cards = this.snapshot.cards;
  }
}

export class CreateFloatingBranchCommand implements Command {
  readonly label = "Tạo nhánh trôi";
  private created: MindNode | null = null;

  constructor(private readonly text: string, private readonly initialOffsetY: number) {}

  apply(map: MindMap): void {
    const isFirstCreate = !this.created;
    if (!this.created) {
      const node = createNode(this.text, null);
      node.offsetY = this.initialOffsetY;
      this.created = node;
    }
    map.nodes[this.created.id] = this.created;
    // P2.11: nhánh trôi cũng là "gốc" của chính nó (depth 0) — tô theo
    // theme đang bật y hệt AddChildCommand, chỉ lúc tạo lần đầu.
    if (isFirstCreate) applyActiveThemeToNewNode(map, this.created.id);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    delete map.nodes[this.created.id];
  }
  get newNodeId(): string {
    if (!this.created) throw new Error("CreateFloatingBranchCommand chưa được apply.");
    return this.created.id;
  }
}

/**
 * Tách một node (và cả cây con của nó) đang gắn trong cây chính thành
 * một NHÁNH TRÔI độc lập — chiều NGƯỢC LẠI của MoveNodeCommand (vốn
 * luôn cần một newParentId để gắn VÀO, không dùng để tách RA được).
 * Dịch offsetY thêm một khoảng để nhánh vừa tách không chồng đúng lên
 * vị trí cũ — người dùng tự kéo đi chỗ khác sau nếu muốn (cơ chế kéo
 * tự do đã có từ P1.6, dùng lại nguyên xi).
 */
export class DetachToFloatingCommand implements Command {
  readonly label = "Tách thành nhánh trôi";
  private oldParentId: string | null = null;
  private oldIndex = 0;
  private oldOffsetY = 0;

  constructor(private readonly nodeId: string) {}

  apply(map: MindMap): void {
    if (this.nodeId === map.rootId) throw new Error("Không thể tách node gốc chính.");
    const node = requireNode(map, this.nodeId);
    this.oldParentId = node.parentId;
    this.oldOffsetY = node.offsetY;

    if (this.oldParentId !== null) {
      const oldParent = requireNode(map, this.oldParentId);
      this.oldIndex = oldParent.children.indexOf(this.nodeId);
      oldParent.children.splice(this.oldIndex, 1);
    }
    node.parentId = null;
    node.offsetY = this.oldOffsetY + 260;
  }

  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.parentId = this.oldParentId;
    node.offsetY = this.oldOffsetY;
    if (this.oldParentId !== null) {
      const oldParent = requireNode(map, this.oldParentId);
      const idx = Math.min(this.oldIndex, oldParent.children.length);
      oldParent.children.splice(idx, 0, this.nodeId);
    }
  }
}

// =====================================================================
// Sao chép / dán / nhân bản — P1.7
// =====================================================================

/** Nhân bản một node (kèm cây con) thành anh em kế tiếp ngay sau nó. */
export class DuplicateNodeCommand implements Command {
  readonly label = "Nhân bản node";
  private createdIds: string[] = [];
  private parentId = "";
  private insertIndex = 0;
  private newRootId = "";

  constructor(private readonly nodeId: string) {}

  apply(map: MindMap): void {
    const original = requireNode(map, this.nodeId);
    if (original.parentId === null) throw new Error("Không thể nhân bản node gốc.");
    this.parentId = original.parentId;

    const { root, all } = deepCloneSubtree(map, this.nodeId, this.parentId);
    for (const n of all) map.nodes[n.id] = n;
    this.createdIds = all.map((n) => n.id);
    this.newRootId = root.id;

    const parent = requireNode(map, this.parentId);
    const originalIndex = parent.children.indexOf(this.nodeId);
    this.insertIndex = originalIndex + 1;
    parent.children.splice(this.insertIndex, 0, root.id);
  }
  revert(map: MindMap): void {
    const parent = requireNode(map, this.parentId);
    parent.children = parent.children.filter((id) => id !== this.newRootId);
    for (const id of this.createdIds) delete map.nodes[id];
  }

  get newRootNodeId(): string {
    return this.newRootId;
  }
}

/**
 * Dán một hoặc nhiều cây (từ clipboard nội bộ hoặc từ văn bản thụt lề
 * bên ngoài) vào làm CON của node đích.
 */
export class PasteSubtreeCommand implements Command {
  readonly label = "Dán";
  private createdRootIds: string[] = [];
  private createdAllIds: string[] = [];

  constructor(private readonly parentId: string, private readonly clips: ClipboardNode[]) {}

  apply(map: MindMap): void {
    const parent = requireNode(map, this.parentId);
    const rootIds: string[] = [];
    const allIds: string[] = [];
    for (const clip of this.clips) {
      const { root, all } = clipboardNodeToTree(clip, this.parentId);
      for (const n of all) map.nodes[n.id] = n;
      rootIds.push(root.id);
      allIds.push(...all.map((n) => n.id));
      parent.children.push(root.id);
    }
    this.createdRootIds = rootIds;
    this.createdAllIds = allIds;
    // P2.11: nội dung dán từ văn bản thụt lề bên ngoài (không phải sao
    // chép node có sẵn trong map) không mang theo định dạng nào — mỗi
    // node như vậy có fill/color đều null. Với node NÀY (không phải
    // node được dán từ một node đã có màu tường minh), tô theo theme
    // đang bật để nhất quán với "tạo node mới". KHÔNG đụng tới node có
    // fill/color khác null — đó là định dạng người dùng đã sao chép
    // tường minh, phải giữ nguyên y hệt lúc copy.
    if (map.activeThemeId) {
      for (const id of allIds) {
        const node = map.nodes[id];
        if (node && node.fill === null && node.color === null) {
          applyActiveThemeToNewNode(map, id);
        }
      }
    }
  }
  revert(map: MindMap): void {
    const parent = requireNode(map, this.parentId);
    const rootSet = new Set(this.createdRootIds);
    parent.children = parent.children.filter((id) => !rootSet.has(id));
    for (const id of this.createdAllIds) delete map.nodes[id];
  }

  get newRootIds(): string[] {
    return this.createdRootIds;
  }
}

// =====================================================================
// Liên kết chéo (Relationship)
// =====================================================================

export class AddRelationshipCommand implements Command {
  readonly label = "Tạo liên kết";
  private created: Relationship | null = null;

  constructor(
    private readonly fromId: string,
    private readonly toId: string,
    private readonly initialLabel: string
  ) {}

  apply(map: MindMap): void {
    const rel: Relationship = this.created ?? {
      id: generateId("r"),
      fromId: this.fromId,
      toId: this.toId,
      label: this.initialLabel,
      color: "#2f9bed",
      dash: true,
      bend: null,
    };
    this.created = rel;
    if (!map.relationships.some((r) => r.id === rel.id)) map.relationships.push(rel);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    map.relationships = map.relationships.filter((r) => r.id !== this.created!.id);
  }
  get newRelationshipId(): string {
    if (!this.created) throw new Error("AddRelationshipCommand chưa được apply.");
    return this.created.id;
  }
}

export class DeleteRelationshipCommand implements Command {
  readonly label = "Xoá liên kết";
  private removed: Relationship | null = null;
  private index = 0;
  constructor(private readonly relationshipId: string) {}

  apply(map: MindMap): void {
    const idx = map.relationships.findIndex((r) => r.id === this.relationshipId);
    if (idx === -1) return;
    this.index = idx;
    this.removed = cloneRelationship(map.relationships[idx] as Relationship);
    map.relationships.splice(idx, 1);
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const idx = Math.min(this.index, map.relationships.length);
    map.relationships.splice(idx, 0, cloneRelationship(this.removed));
  }
}

/** Kéo điểm uốn đường liên kết (chấm tròn xanh) — dùng qua session vì
 *  người dùng kéo liên tục, giống SetNodeOffsetCommand. */
export class SetRelationshipBendCommand implements Command {
  readonly label = "Uốn đường liên kết";
  private captured = false;
  private oldBend: { x: number; y: number } | null = null;
  private newBend: { x: number; y: number } | null = null;

  constructor(private readonly relationshipId: string) {}

  setTarget(point: { x: number; y: number }): void {
    this.newBend = { ...point };
  }

  apply(map: MindMap): void {
    const rel = map.relationships.find((r) => r.id === this.relationshipId);
    if (!rel) return;
    if (!this.captured) {
      this.oldBend = rel.bend;
      this.captured = true;
    }
    rel.bend = this.newBend;
  }
  revert(map: MindMap): void {
    const rel = map.relationships.find((r) => r.id === this.relationshipId);
    if (!rel) return;
    rel.bend = this.oldBend;
  }
}

export type RelationshipPatch = Partial<Pick<Relationship, "label" | "color" | "dash" | "bend">>;

export class UpdateRelationshipCommand implements Command {
  readonly label = "Sửa liên kết";
  private oldValues: RelationshipPatch = {};
  constructor(private readonly relationshipId: string, private readonly patch: RelationshipPatch) {}

  apply(map: MindMap): void {
    const rel = map.relationships.find((r) => r.id === this.relationshipId);
    if (!rel) return;
    const old: RelationshipPatch = {};
    for (const key of Object.keys(this.patch) as (keyof RelationshipPatch)[]) {
      (old as unknown as Record<string, unknown>)[key] = rel[key];
      (rel as unknown as Record<string, unknown>)[key] = this.patch[key];
    }
    this.oldValues = old;
  }
  revert(map: MindMap): void {
    const rel = map.relationships.find((r) => r.id === this.relationshipId);
    if (!rel) return;
    for (const key of Object.keys(this.oldValues) as (keyof RelationshipPatch)[]) {
      (rel as unknown as Record<string, unknown>)[key] = this.oldValues[key];
    }
  }
}

// =====================================================================
// Tóm tắt (Summary)
// =====================================================================

export class AddSummaryCommand implements Command {
  readonly label = "Tạo tóm tắt";
  private created: Summary | null = null;
  constructor(private readonly nodeIds: string[], private readonly initialLabel: string) {}

  apply(map: MindMap): void {
    const summary: Summary = this.created ?? {
      id: generateId("s"),
      nodeIds: [...this.nodeIds],
      label: this.initialLabel,
      color: "#14162b",
    };
    this.created = summary;
    if (!map.summaries.some((s) => s.id === summary.id)) map.summaries.push(summary);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    map.summaries = map.summaries.filter((s) => s.id !== this.created!.id);
  }
  get newSummaryId(): string {
    if (!this.created) throw new Error("AddSummaryCommand chưa được apply.");
    return this.created.id;
  }
}

export class DeleteSummaryCommand implements Command {
  readonly label = "Xoá tóm tắt";
  private removed: Summary | null = null;
  private index = 0;
  constructor(private readonly summaryId: string) {}

  apply(map: MindMap): void {
    const idx = map.summaries.findIndex((s) => s.id === this.summaryId);
    if (idx === -1) return;
    this.index = idx;
    this.removed = cloneSummary(map.summaries[idx] as Summary);
    map.summaries.splice(idx, 1);
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const idx = Math.min(this.index, map.summaries.length);
    map.summaries.splice(idx, 0, cloneSummary(this.removed));
  }
}

export type SummaryPatch = Partial<Pick<Summary, "label" | "color">>;

export class UpdateSummaryCommand implements Command {
  readonly label = "Sửa tóm tắt";
  private oldValues: SummaryPatch = {};
  constructor(private readonly summaryId: string, private readonly patch: SummaryPatch) {}

  apply(map: MindMap): void {
    const summary = map.summaries.find((s) => s.id === this.summaryId);
    if (!summary) return;
    const old: SummaryPatch = {};
    for (const key of Object.keys(this.patch) as (keyof SummaryPatch)[]) {
      (old as unknown as Record<string, unknown>)[key] = summary[key];
      (summary as unknown as Record<string, unknown>)[key] = this.patch[key];
    }
    this.oldValues = old;
  }
  revert(map: MindMap): void {
    const summary = map.summaries.find((s) => s.id === this.summaryId);
    if (!summary) return;
    for (const key of Object.keys(this.oldValues) as (keyof SummaryPatch)[]) {
      (summary as unknown as Record<string, unknown>)[key] = this.oldValues[key];
    }
  }
}

// =====================================================================
// Khoanh vùng (Boundary) — P2.4. Khác Summary: KHÔNG yêu cầu cùng cha,
// nên không có bước kiểm tra "cùng node cha" như AddSummaryCommand gọi
// từ phía appController — mọi thứ còn lại giống hệt khuôn mẫu Summary.
// =====================================================================

export class AddBoundaryCommand implements Command {
  readonly label = "Tạo khoanh vùng";
  private created: Boundary | null = null;
  constructor(private readonly nodeIds: string[], private readonly initialLabel: string) {}

  apply(map: MindMap): void {
    const boundary: Boundary = this.created ?? {
      id: generateId("b"),
      nodeIds: [...this.nodeIds],
      label: this.initialLabel,
      fillColor: "#fdf2ce",
      borderColor: "#e8b923",
    };
    this.created = boundary;
    if (!map.boundaries.some((b) => b.id === boundary.id)) map.boundaries.push(boundary);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    map.boundaries = map.boundaries.filter((b) => b.id !== this.created!.id);
  }
  get newBoundaryId(): string {
    if (!this.created) throw new Error("AddBoundaryCommand chưa được apply.");
    return this.created.id;
  }
}

export class DeleteBoundaryCommand implements Command {
  readonly label = "Xoá khoanh vùng";
  private removed: Boundary | null = null;
  private index = 0;
  constructor(private readonly boundaryId: string) {}

  apply(map: MindMap): void {
    const idx = map.boundaries.findIndex((b) => b.id === this.boundaryId);
    if (idx === -1) return;
    this.index = idx;
    this.removed = cloneBoundary(map.boundaries[idx] as Boundary);
    map.boundaries.splice(idx, 1);
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const idx = Math.min(this.index, map.boundaries.length);
    map.boundaries.splice(idx, 0, cloneBoundary(this.removed));
  }
}

export type BoundaryPatch = Partial<Pick<Boundary, "label" | "fillColor" | "borderColor">>;

export class UpdateBoundaryCommand implements Command {
  readonly label = "Sửa khoanh vùng";
  private oldValues: BoundaryPatch = {};
  constructor(private readonly boundaryId: string, private readonly patch: BoundaryPatch) {}

  apply(map: MindMap): void {
    const boundary = map.boundaries.find((b) => b.id === this.boundaryId);
    if (!boundary) return;
    const old: BoundaryPatch = {};
    for (const key of Object.keys(this.patch) as (keyof BoundaryPatch)[]) {
      (old as unknown as Record<string, unknown>)[key] = boundary[key];
      (boundary as unknown as Record<string, unknown>)[key] = this.patch[key];
    }
    this.oldValues = old;
  }
  revert(map: MindMap): void {
    const boundary = map.boundaries.find((b) => b.id === this.boundaryId);
    if (!boundary) return;
    for (const key of Object.keys(this.oldValues) as (keyof BoundaryPatch)[]) {
      (boundary as unknown as Record<string, unknown>)[key] = this.oldValues[key];
    }
  }
}

// =====================================================================
// P2.5b — Ghi chú dán (StickyNote). Hoàn toàn độc lập, không tham
// chiếu tới node nào — đơn giản hơn hẳn Relationship/Summary/Boundary,
// không cần bước "kiểm tra thành viên còn tồn tại" khi xoá node khác.
// =====================================================================

export class AddStickyNoteCommand implements Command {
  readonly label = "Thêm ghi chú dán";
  private created: StickyNote | null = null;

  constructor(private readonly x: number, private readonly y: number, private readonly initialText: string) {}

  apply(map: MindMap): void {
    const note: StickyNote = this.created ?? {
      id: generateId("k"),
      text: this.initialText,
      x: this.x,
      y: this.y,
      color: "#fff3b0",
    };
    this.created = note;
    if (!map.stickyNotes.some((n) => n.id === note.id)) map.stickyNotes.push(note);
  }
  revert(map: MindMap): void {
    if (!this.created) return;
    map.stickyNotes = map.stickyNotes.filter((n) => n.id !== this.created!.id);
  }
  get newNoteId(): string {
    if (!this.created) throw new Error("AddStickyNoteCommand chưa được apply.");
    return this.created.id;
  }
}

export class DeleteStickyNoteCommand implements Command {
  readonly label = "Xoá ghi chú dán";
  private removed: StickyNote | null = null;
  private index = 0;
  constructor(private readonly noteId: string) {}

  apply(map: MindMap): void {
    const idx = map.stickyNotes.findIndex((n) => n.id === this.noteId);
    if (idx === -1) return;
    this.index = idx;
    this.removed = deepClone(map.stickyNotes[idx] as StickyNote);
    map.stickyNotes.splice(idx, 1);
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const idx = Math.min(this.index, map.stickyNotes.length);
    map.stickyNotes.splice(idx, 0, deepClone(this.removed));
  }
}

export type StickyNotePatch = Partial<Pick<StickyNote, "text" | "color">>;

export class UpdateStickyNoteCommand implements Command {
  readonly label = "Sửa ghi chú dán";
  private oldValues: StickyNotePatch = {};
  constructor(private readonly noteId: string, private readonly patch: StickyNotePatch) {}

  apply(map: MindMap): void {
    const note = map.stickyNotes.find((n) => n.id === this.noteId);
    if (!note) return;
    const old: StickyNotePatch = {};
    for (const key of Object.keys(this.patch) as (keyof StickyNotePatch)[]) {
      (old as unknown as Record<string, unknown>)[key] = note[key];
      (note as unknown as Record<string, unknown>)[key] = this.patch[key];
    }
    this.oldValues = old;
  }
  revert(map: MindMap): void {
    const note = map.stickyNotes.find((n) => n.id === this.noteId);
    if (!note) return;
    for (const key of Object.keys(this.oldValues) as (keyof StickyNotePatch)[]) {
      (note as unknown as Record<string, unknown>)[key] = this.oldValues[key];
    }
  }
}

/** Kéo tự do một ghi chú dán — dùng session giống SetNodeOffsetCommand,
 *  nhưng ghi chú dán không có "vị trí gốc do layout tính" để cộng dồn
 *  offset lên trên — x/y ở đây LÀ toạ độ tuyệt đối luôn, không phải
 *  offset. */
export class SetStickyNotePositionCommand implements Command {
  readonly label = "Di chuyển ghi chú dán";
  private captured = false;
  private oldPos = { x: 0, y: 0 };
  private newPos = { x: 0, y: 0 };

  constructor(private readonly noteId: string, startPos: { x: number; y: number }) {
    this.newPos = { ...startPos };
  }

  setTarget(pos: { x: number; y: number }): void {
    this.newPos = { ...pos };
  }

  apply(map: MindMap): void {
    const note = map.stickyNotes.find((n) => n.id === this.noteId);
    if (!note) return;
    if (!this.captured) {
      this.oldPos = { x: note.x, y: note.y };
      this.captured = true;
    }
    note.x = this.newPos.x;
    note.y = this.newPos.y;
  }
  revert(map: MindMap): void {
    const note = map.stickyNotes.find((n) => n.id === this.noteId);
    if (!note) return;
    note.x = this.oldPos.x;
    note.y = this.oldPos.y;
  }
}

// =====================================================================
// P2.6 — Theme + sao chép định dạng
// =====================================================================

/**
 * Áp một bộ theme (xem core/theme.ts) cho TOÀN BỘ map — mọi cây độc
 * lập (gốc chính lẫn mọi nhánh trôi) đều được xử lý, MỖI CÂY TỰ TÍNH
 * ĐỘ SÂU RIÊNG từ chính gốc của nó (nhất quán với cách nhánh trôi đã
 * được coi "như một gốc" từ P2.5 — xem getRootIds trong core/tree.ts).
 * Gộp toàn bộ thay đổi (có thể hàng trăm node) thành ĐÚNG MỘT bước
 * hoàn tác.
 */
export class ApplyThemeCommand implements Command {
  readonly label = "Áp dụng theme";
  private oldValues: Record<string, { fill: string | null; color: string | null }> = {};
  private oldActiveThemeId: string | null = null;

  constructor(private readonly themeId: string) {}

  apply(map: MindMap): void {
    const theme = THEMES.find((t) => t.id === this.themeId);
    if (!theme) return;
    this.oldValues = {};
    this.oldActiveThemeId = map.activeThemeId;
    map.activeThemeId = this.themeId;

    for (const rootId of getRootIds(map)) {
      if (theme.perBranch) {
        this.applyBranchColors(map, rootId);
      } else {
        this.applyDepthBased(map, theme, rootId);
      }
    }
  }

  revert(map: MindMap): void {
    map.activeThemeId = this.oldActiveThemeId;
    for (const id of Object.keys(this.oldValues)) {
      const node = map.nodes[id];
      if (!node) continue;
      const old = this.oldValues[id] as { fill: string | null; color: string | null };
      node.fill = old.fill;
      node.color = old.color;
    }
  }

  private captureOld(node: MindNode): void {
    if (!(node.id in this.oldValues)) {
      this.oldValues[node.id] = { fill: node.fill, color: node.color };
    }
  }

  /**
   * P2.11 — không còn tra `theme.levels[min(depth, 3)]` (đông cứng từ
   * cấp 4 trở đi) mà gọi `colorForDepth`, công thức tiệm cận mũ đúng
   * với MỌI độ sâu, kể cả vô hạn. Xem core/theme.ts để biết lý do.
   */
  private applyDepthBased(map: MindMap, theme: Theme, rootId: string): void {
    const visit = (id: string, depth: number): void => {
      const node = map.nodes[id];
      if (!node) return;
      const level: ThemeLevelStyle = colorForDepth(theme, depth);
      this.captureOld(node);
      node.fill = level.fill;
      node.color = level.color;
      for (const childId of node.children) visit(childId, depth + 1);
    };
    visit(rootId, 0);
  }

  /**
   * Gốc (của cây này) luôn tối màu trung tính; mỗi con trực tiếp của
   * gốc nhận một màu riêng từ BRANCH_PALETTE, con cháu sâu hơn dùng
   * sắc độ nhạt dần của đúng màu nhánh đó — P2.11: giờ dùng chung
   * `colorForBranchDepth` với `computeThemedStyleForNode` (một nguồn
   * công thức DUY NHẤT, đảm bảo "Áp dụng" và node tự tô khi tạo mới
   * luôn ra ĐÚNG cùng một màu ở cùng một độ sâu-trong-nhánh).
   */
  private applyBranchColors(map: MindMap, rootId: string): void {
    const root = map.nodes[rootId];
    if (!root) return;
    this.captureOld(root);
    root.fill = "#14162b";
    root.color = "#ffffff";

    root.children.forEach((childId, branchIndex) => {
      const hue = BRANCH_PALETTE[branchIndex % BRANCH_PALETTE.length] as string;
      const visit = (id: string, depthInBranch: number): void => {
        const node = map.nodes[id];
        if (!node) return;
        this.captureOld(node);
        const style = colorForBranchDepth(hue, depthInBranch);
        node.fill = style.fill;
        node.color = style.color;
        for (const c of node.children) visit(c, depthInBranch + 1);
      };
      visit(childId, 0);
    });
  }
}

/**
 * P2.11 — nếu map đang bật một theme (`map.activeThemeId`), tính sẵn
 * {fill, color} theo ĐÚNG theme đó cho một node VỪA được gắn vào cây
 * (đã có `parentId` trỏ đúng, đã nối vào `children` của cha) và gán
 * thẳng lên node — dùng ngay sau khi tạo/nhân bản/dán một node trong
 * các Command bên dưới để node mới không bao giờ "trắng tinh"/lệch
 * màu theme đang dùng. Không làm gì nếu map chưa bật theme nào (giữ
 * đúng hành vi cũ — người dùng tự chọn màu hoặc dùng mặc định).
 */
function applyActiveThemeToNewNode(map: MindMap, nodeId: string): void {
  if (!map.activeThemeId) return;
  const theme = THEMES.find((t) => t.id === map.activeThemeId);
  if (!theme) return;
  const node = map.nodes[nodeId];
  if (!node) return;
  const style = computeThemedStyleForNode(map, nodeId, theme);
  node.fill = style.fill;
  node.color = style.color;
}

/**
 * "Sao chép định dạng" — chỉ copy các thuộc tính THUẦN THỊ GIÁC, không
 * copy nội dung (text/notes/link/markers/progress/priority/tagIds).
 * Trả về đúng NodeStylePatch để có thể dispatch thẳng qua
 * UpdateNodeStyleCommand đã có — không cần Command riêng cho việc áp.
 */
export function extractFormatPatch(node: MindNode): NodeStylePatch {
  return {
    fill: node.fill,
    fillTransparent: node.fillTransparent,
    fillOpacity: node.fillOpacity,
    color: node.color,
    borderStyle: node.borderStyle,
    borderColor: node.borderColor,
    edgeColor: node.edgeColor,
    edgeDash: node.edgeDash,
    edgeShape: node.edgeShape,
    fontSize: node.fontSize,
    fontFamily: node.fontFamily,
    textAlign: node.textAlign,
    textFit: node.textFit,
  };
}

/**
 * P2.6b-2 — 3 công tắc hiển thị mức TÀI LIỆU (showEdgeLabels/
 * showRelationships/showSummaries). Một Command DÙNG CHUNG cho cả 3,
 * vì cả 3 đều là "đảo ngược một cờ boolean trên map" — không cần viết
 * 3 Command gần như giống hệt nhau. P2.7h (Phần 4) — organicEdges
 * cũng chỉ là MỘT CỜ BOOLEAN Y HỆT trên map, tái dùng luôn Command
 * này thay vì viết riêng.
 */
export type MapDisplayFlag = "showEdgeLabels" | "showRelationships" | "showSummaries" | "organicEdges";

export class ToggleMapDisplayFlagCommand implements Command {
  readonly label = "Đổi hiển thị";
  private oldValue = false;
  constructor(private readonly flag: MapDisplayFlag) {}

  apply(map: MindMap): void {
    this.oldValue = map[this.flag];
    map[this.flag] = !map[this.flag];
  }
  revert(map: MindMap): void {
    map[this.flag] = this.oldValue;
  }
}

/**
 * P2.7a — đổi kiểu bố cục của toàn map. Bản thân Command chỉ đổi
 * đúng một trường (`map.layoutType`) — việc TÍNH LẠI toạ độ mọi node
 * theo bố cục mới xảy ra tự động qua chuỗi phản ứng có sẵn
 * (dispatch -> notify -> fullRefresh -> applyLayout trong main.ts,
 * applyLayout giờ đọc thẳng map.layoutType), không cần Command này tự
 * tính toán gì thêm.
 */
export class SetLayoutTypeCommand implements Command {
  readonly label = "Đổi bố cục";
  private oldValue: LayoutType = "logicRight";
  constructor(private readonly newValue: LayoutType) {}

  apply(map: MindMap): void {
    this.oldValue = map.layoutType;
    map.layoutType = this.newValue;
  }
  revert(map: MindMap): void {
    map.layoutType = this.oldValue;
  }
}

// =====================================================================
// P2.7e — Tag: danh sách tập trung ở map.tags, node chỉ giữ id (xem
// TagDef/MindNode.tagIds trong core/types.ts). Dùng Command RIÊNG cho
// việc thêm/sửa/xoá TAG (khác việc GÁN/BỎ tag cho một node cụ thể) vì
// đây là thao tác cấp MAP (ảnh hưởng danh sách dùng chung), không phải
// patch một trường của riêng một node như NodeStylePatch.
// =====================================================================

/** Tạo Tag mới, thêm vào danh sách tập trung. newTagId công khai để
 *  nơi gọi biết ngay id vừa tạo (ví dụ để gán luôn cho node hiện tại
 *  sau khi tạo — xem cách AddRelationshipCommand/AddSummaryCommand đã
 *  làm với newRelationshipId/... ). */
export class AddTagCommand implements Command {
  readonly label = "Thêm Tag";
  readonly newTagId: string;
  constructor(private readonly name: string, private readonly color: string) {
    this.newTagId = generateTagId();
  }
  apply(map: MindMap): void {
    map.tags = [...map.tags, { id: this.newTagId, name: this.name, color: this.color }];
  }
  revert(map: MindMap): void {
    map.tags = map.tags.filter((t) => t.id !== this.newTagId);
  }
}

export class RenameTagCommand implements Command {
  readonly label = "Đổi tên Tag";
  private oldName = "";
  constructor(private readonly tagId: string, private readonly newName: string) {}
  apply(map: MindMap): void {
    const tag = map.tags.find((t) => t.id === this.tagId);
    if (!tag) return;
    this.oldName = tag.name;
    map.tags = map.tags.map((t) => (t.id === this.tagId ? { ...t, name: this.newName } : t));
  }
  revert(map: MindMap): void {
    map.tags = map.tags.map((t) => (t.id === this.tagId ? { ...t, name: this.oldName } : t));
  }
}

export class SetTagColorCommand implements Command {
  readonly label = "Đổi màu Tag";
  private oldColor = "";
  constructor(private readonly tagId: string, private readonly newColor: string) {}
  apply(map: MindMap): void {
    const tag = map.tags.find((t) => t.id === this.tagId);
    if (!tag) return;
    this.oldColor = tag.color;
    map.tags = map.tags.map((t) => (t.id === this.tagId ? { ...t, color: this.newColor } : t));
  }
  revert(map: MindMap): void {
    map.tags = map.tags.map((t) => (t.id === this.tagId ? { ...t, color: this.oldColor } : t));
  }
}

/** Xoá Tag KHỎI DANH SÁCH TẬP TRUNG lẫn khỏi MỌI node đang gắn nó —
 *  ghi nhớ đủ để hoàn tác đúng cả 2 phần (vị trí cũ trong danh sách +
 *  danh sách chính xác các node đã gắn nó, để gắn lại đúng khi Ctrl+Z,
 *  không phải "gắn lại cho MỌI node" một cách sai lệch). */
export class DeleteTagCommand implements Command {
  readonly label = "Xoá Tag";
  private removedTag: TagDef | null = null;
  private removedIndex = -1;
  private affectedNodeIds: string[] = [];
  constructor(private readonly tagId: string) {}

  apply(map: MindMap): void {
    const idx = map.tags.findIndex((t) => t.id === this.tagId);
    if (idx < 0) return;
    this.removedTag = map.tags[idx] ?? null;
    this.removedIndex = idx;
    map.tags = map.tags.filter((t) => t.id !== this.tagId);

    this.affectedNodeIds = [];
    for (const node of Object.values(map.nodes)) {
      if (node.tagIds.includes(this.tagId)) {
        this.affectedNodeIds.push(node.id);
        node.tagIds = node.tagIds.filter((id) => id !== this.tagId);
      }
    }
  }
  revert(map: MindMap): void {
    if (!this.removedTag) return;
    const tags = [...map.tags];
    tags.splice(this.removedIndex, 0, this.removedTag);
    map.tags = tags;
    for (const nodeId of this.affectedNodeIds) {
      const node = map.nodes[nodeId];
      if (node && !node.tagIds.includes(this.tagId)) {
        node.tagIds = [...node.tagIds, this.tagId];
      }
    }
  }
}

/** Gán/bỏ MỘT Tag cho MỘT node cụ thể (khác 4 Command trên — những cái
 *  đó sửa chính danh sách Tag, cái này chỉ sửa tagIds của một node). */
export class ToggleNodeTagCommand implements Command {
  readonly label = "Gán/bỏ Tag";
  private hadTag = false;
  constructor(private readonly nodeId: string, private readonly tagId: string) {}
  apply(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    this.hadTag = node.tagIds.includes(this.tagId);
    node.tagIds = this.hadTag ? node.tagIds.filter((id) => id !== this.tagId) : [...node.tagIds, this.tagId];
  }
  revert(map: MindMap): void {
    const node = requireNode(map, this.nodeId);
    node.tagIds = this.hadTag ? [...node.tagIds, this.tagId] : node.tagIds.filter((id) => id !== this.tagId);
  }
}

// Re-export để ui/ chỉ cần import từ một chỗ khi cần các kiểu style dùng chung.
export type { BorderStyle, EdgeShape };
