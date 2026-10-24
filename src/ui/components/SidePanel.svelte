<script lang="ts">
  /**
   * ui/components/SidePanel.svelte
   * -------------------------------------------------------------------
   * P2.1 — Panel bên phải, chuyển từ ui/sidePanel.ts (đã xoá) sang
   * Svelte. Vẫn đúng 4 nhánh hiển thị như bản cũ:
   *   1 relationship  -> nhãn, màu, nét đứt, làm thẳng / xoá
   *   1 summary       -> nhãn, màu, số lượng thành viên, xoá
   *   1 node          -> màu, viền, link, đường nối, kích thước
   *   nhiều node      -> gợi ý bấm "Tóm tắt"
   *   không chọn gì   -> ẩn
   *
   * QUY TẮC KHÔNG ĐỔI: mọi input CHỈ dispatch Command qua store, không
   * bao giờ gán trực tiếp vào node/relationship/summary. Vì lý do này,
   * các <input> dưới đây dùng value={...} một chiều + on:input dispatch
   * — CỐ TÌNH KHÔNG dùng bind:value, vì bind: sẽ ngầm tạo một đường gán
   * ngược vào dữ liệu đọc từ $map, phá đúng quy tắc "một cửa" đang bảo
   * vệ xuyên suốt dự án (xem cảnh báo trong svelteBridge.ts).
   * -------------------------------------------------------------------
   */
  import MarkerPicker from "./MarkerPicker.svelte";
  import type { Store } from "../../core/store";
  import type { SelectionModel } from "../selection";
  import type { AppController } from "../appController";
  import { showImagePreview } from "../dialog";
  import { mapStore, selectionStore } from "../svelteBridge";
  import {
    UpdateNodeStyleCommand,
    BulkUpdateNodeStyleCommand,
    UpdateRelationshipCommand,
    DeleteRelationshipCommand,
    UpdateSummaryCommand,
    DeleteSummaryCommand,
    UpdateBoundaryCommand,
    DeleteBoundaryCommand,
    UpdateStickyNoteCommand,
    DeleteStickyNoteCommand,
    ResetNodeSizeCommand,
    SetNodeSizeCommand,
    SetNodeNotesCommand,
    AddTagCommand,
    RenameTagCommand,
    SetTagColorCommand,
    DeleteTagCommand,
    ToggleNodeTagCommand,
  } from "../../core/commands";
  import type { NodeStylePatch, RelationshipPatch, SummaryPatch, BoundaryPatch, StickyNotePatch } from "../../core/commands";
  import { lightenHex } from "../../core/theme";
  import { BOUNDARY_LIMITS, BOUNDARY_MODES, BOUNDARY_MODE_LABEL, defaultVisual, effectiveVisual } from "../../core/boundaryVisual";
  import type { Boundary, BoundaryMode, BoundaryVisualOptions } from "../../core/types";
  import { showConfirm } from "../dialog";
  import CardSection from "./CardSection.svelte";
  import NodeFieldsEditor from "./NodeFieldsEditor.svelte";
  import type { BorderStyle, EdgeShape, TextAlign, TextFit } from "../../core/types";

  export let store: Store;
  export let selection: SelectionModel;
  export let controller: AppController;

  const map = mapStore(store);
  const sel = selectionStore(selection);

  // P2.3 — trạng thái giao diện CỤC BỘ, không phải dữ liệu tài liệu:
  // đang xem thẻ nào, panel có đang thu gọn hay không. Không reset khi
  // đổi node đang chọn — giữ nguyên thẻ đang xem, giống cách VS Code
  // không tự đổi tab khi bấm sang file khác trong Explorer.
  let activeTab: "format" | "notes" = "format";
  let panelCollapsed = false;

  $: node = $sel.selectedIds.size === 1 && $sel.primaryId ? $map.nodes[$sel.primaryId] ?? null : null;
  // Node gốc có màu mặc định RIÊNG khi fill/color để trống (xem
  // render/CanvasRenderer.ts — tìm "isRoot ?"). Panel phải áp đúng quy
  // tắc y hệt, không thì ô chọn màu hiện sai so với những gì thấy trên
  // canvas — đây chính là lỗi vừa phát hiện qua test A1.
  $: isRootNode = node ? node.id === $map.rootId : false;
  $: relationship = $sel.selectedRelId
    ? $map.relationships.find((r) => r.id === $sel.selectedRelId) ?? null
    : null;
  $: summary = $sel.selectedSummaryId
    ? $map.summaries.find((s) => s.id === $sel.selectedSummaryId) ?? null
    : null;
  $: boundary = $sel.selectedBoundaryId
    ? $map.boundaries.find((b) => b.id === $sel.selectedBoundaryId) ?? null
    : null;
  $: stickyNote = $sel.selectedStickyNoteId
    ? $map.stickyNotes.find((n) => n.id === $sel.selectedStickyNoteId) ?? null
    : null;
  $: multiCount = $sel.selectedIds.size;
  $: hasContent =
    Boolean(relationship) ||
    Boolean(summary) ||
    Boolean(boundary) ||
    Boolean(stickyNote) ||
    Boolean(node) ||
    multiCount > 1;

  function patchNode(nodeId: string, patch: NodeStylePatch): void {
    store.dispatch(new UpdateNodeStyleCommand(nodeId, patch));
  }
  /** P2.7f — sửa hàng loạt: áp CÙNG patch cho MỌI node đang chọn cùng
   *  lúc, gộp thành đúng 1 bước hoàn tác (xem BulkUpdateNodeStyleCommand). */
  function bulkPatch(patch: NodeStylePatch): void {
    const ids = Array.from($sel.selectedIds);
    if (ids.length === 0) return;
    store.dispatch(new BulkUpdateNodeStyleCommand(ids, patch));
  }
  function setSize(nodeId: string, w: number, h: number): void {
    store.dispatch(new SetNodeSizeCommand(nodeId, { w, h }));
  }
  function resetSize(nodeId: string): void {
    store.dispatch(new ResetNodeSizeCommand(nodeId));
  }

  // P2.10 — Ảnh nhúng: input file ẩn, dùng chung DUY NHẤT một thẻ cho
  // node đang chọn tại thời điểm bấm (giống cơ chế các input ẩn của
  // Toolbar.svelte) — imageTargetNodeId ghi nhớ ĐANG gắn ảnh cho node
  // nào, vì lúc onImageFileChange() chạy (bất đồng bộ, sau khi người
  // dùng chọn xong file), người dùng CÓ THỂ đã lỡ đổi sang chọn node
  // khác trên canvas.
  let imageInput: HTMLInputElement;
  let imageTargetNodeId: string | null = null;
  function pickImageFor(nodeId: string): void {
    imageTargetNodeId = nodeId;
    imageInput.click();
  }
  async function onImageFileChange(): Promise<void> {
    const file = imageInput.files?.[0];
    const targetId = imageTargetNodeId;
    imageInput.value = "";
    imageTargetNodeId = null;
    if (file && targetId) await controller.insertNodeImage(targetId, file);
  }
  function removeImage(nodeId: string): void {
    controller.removeNodeImage(nodeId);
  }
  function previewImage(assetId: string): void {
    const asset = $map.assets[assetId];
    if (asset) void showImagePreview(asset.dataBase64, asset.mimeType);
  }

  // P2.3 — ghi chú: lưu định kỳ (debounce 800ms sau khi ngừng gõ) qua
  // session, gộp thành đúng MỘT bước hoàn tác khi rời ô. Session bắt
  // đầu lúc ô ghi chú được focus, kết thúc lúc mất focus — xem
  // SetNodeNotesCommand trong core/commands.ts để hiểu cơ chế session.
  let notesCommand: SetNodeNotesCommand | null = null;
  let notesDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const NOTES_DEBOUNCE_MS = 800;
  // (Sửa lỗi mất ghi chú) — id của node ĐANG có phiên ghi chú mở, để
  // lưới an toàn bên dưới phát hiện đúng lúc node đã đổi.
  let notesEditingNodeId: string | null = null;

  function onNotesFocus(nodeId: string, currentNotes: string | null): void {
    notesCommand = new SetNodeNotesCommand(nodeId, currentNotes);
    store.beginSession(notesCommand);
    notesEditingNodeId = nodeId;
  }
  function onNotesInput(value: string): void {
    if (!notesCommand) return;
    notesCommand.setTarget(value);
    if (notesDebounceTimer) clearTimeout(notesDebounceTimer);
    notesDebounceTimer = setTimeout(() => {
      if (notesCommand) store.updateSession(notesCommand);
    }, NOTES_DEBOUNCE_MS);
  }
  /** Chốt lại phiên ghi chú đang mở (nếu có) — dùng CHUNG cho cả lúc
   *  rời ô (blur) lẫn lưới an toàn khi node đổi đột ngột. notesCommand
   *  đã giữ đúng giá trị mới nhất người dùng gõ (setTarget gọi NGAY
   *  mỗi lần gõ trong onNotesInput ở trên, không hề debounce — chỉ
   *  bước store.updateSession/lưu mới debounce), nên chỉ cần commit
   *  lại đúng session đang mở, không cần đọc lại DOM. */
  function commitPendingNotes(): void {
    if (notesDebounceTimer) {
      clearTimeout(notesDebounceTimer);
      notesDebounceTimer = null;
    }
    if (!notesCommand) return;
    store.updateSession(notesCommand);
    store.endSession();
    notesCommand = null;
    notesEditingNodeId = null;
  }
  function onNotesBlur(value: string): void {
    if (!notesCommand) return;
    const trimmed = value.trim();
    notesCommand.setTarget(trimmed || null); // rỗng/toàn khoảng trắng -> null, giống quy ước của Hyperlink
    commitPendingNotes();
  }
  /**
   * SỬA LỖI (người dùng báo mất ghi chú): gõ ghi chú rồi bấm NGAY sang
   * node khác trên canvas — có lúc nội dung không được lưu. Nguyên
   * nhân: node trên canvas không phải DOM riêng từng cái (chỉ vẽ trên
   * một <canvas> chung), nên thứ tự sự kiện "blur" của ô ghi chú so
   * với việc Svelte tái hiện panel sang node MỚI (qua thay đổi
   * selection) KHÔNG được đảm bảo tuyệt đối giống nhau ở mọi trình
   * duyệt — có tình huống panel đã đổi sang hiển thị node khác trước
   * khi blur kịp chốt xong dữ liệu cũ.
   *
   * LƯỚI AN TOÀN: theo dõi TRỰC TIẾP việc node đang chọn (`node`) đổi
   * khác với node đang có phiên ghi chú mở (`notesEditingNodeId`) —
   * hễ phát hiện lệch, CHỦ ĐỘNG chốt ngay tại đây, không phụ thuộc gì
   * vào việc blur có bắn đúng lúc hay không nữa.
   */
  $: if (node && notesEditingNodeId !== null && node.id !== notesEditingNodeId) {
    commitPendingNotes();
  }
  function autoGrowAction(el: HTMLTextAreaElement, _dep?: string): { update: (d: string) => void } {
    const resize = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    resize();
    // update() được Svelte tự gọi lại mỗi khi tham số truyền vào
    // use:autoGrowAction={...} đổi giá trị — dùng n.id làm tham số để
    // textarea tự đo lại chiều cao đúng khi CHUYỂN SANG NODE KHÁC,
    // không chỉ lúc gõ (lúc gõ đã có lời gọi resize() thủ công riêng
    // trong on:input, xem template bên dưới).
    return { update: resize };
  }

  // P2.2 — bảng biểu tượng cố định, đủ dùng cho phần lớn nhu cầu đánh
  // dấu nhanh, không làm bảng chọn emoji đầy đủ (không cần thiết, xem
  // ghi chú "bảng chọn biểu tượng" trong bản kế hoạch gốc).

  // P2.6e — danh mục font phổ biến, có sẵn trên Windows và hiển thị
  // đúng dấu tiếng Việt — sửa lỗi ô nhập tự do trước đó bắt người dùng
  // phải gõ đúng tuyệt đối tên font, rất dễ gõ sai/gõ thiếu.
  const FONT_OPTIONS = [
    { value: "Arial", label: "Arial" },
    { value: "Times New Roman", label: "Times New Roman" },
    { value: "Calibri", label: "Calibri" },
    { value: "Cambria", label: "Cambria" },
    { value: "Georgia", label: "Georgia" },
    { value: "Tahoma", label: "Tahoma" },
    { value: "Verdana", label: "Verdana" },
    { value: "Segoe UI", label: "Segoe UI" },
    { value: "Consolas", label: "Consolas (đều nét)" },
  ];
  const CUSTOM_FONT_SENTINEL = "__custom__";

  // Theo dõi RIÊNG cho "đang ở chế độ tự gõ font hay không" — trạng
  // thái CỤC BỘ (không lưu vào tài liệu), tự đồng bộ lại đúng mỗi khi
  // ĐỔI SANG NODE KHÁC (không phải mỗi khi $map đổi khi đang gõ), cùng
  // khuôn mẫu đã dùng cho notesTargetNodeId ở P2.3.
  let showCustomFont = false;
  let customFontTrackedNodeId: string | null = null;
  $: if (node && node.id !== customFontTrackedNodeId) {
    showCustomFont = node.fontFamily !== null && !FONT_OPTIONS.some((f) => f.value === node.fontFamily);
    customFontTrackedNodeId = node.id;
  }

  // P2.6c — panel node đã khá dài qua nhiều bước, cho gấp/mở từng khối
  // để dễ nhìn hơn. Trạng thái CỤC BỘ (không lưu vào tài liệu, không
  // qua Ctrl+Z) — mặc định TẤT CẢ đang MỞ để không ai bất ngờ mất nội
  // dung ngay lần đầu dùng, chỉ gấp khi tự bấm.
  let sectionOpen = { base: true, connector: true, work: true, text: true };

  // P2.7e — trạng thái CỤC BỘ cho bảng chọn/quản lý Tag (không đọc từ
  // $map nên bind:value ở đây an toàn, không phá quy tắc "một cửa").
  let tagPickerOpen = false;
  let editingTagId: string | null = null;
  let newTagName = "";
  const TAG_COLOR_CHOICES = ["#2f6fed", "#d64545", "#0e9f6e", "#e8873a", "#9333ea", "#0891b2", "#c026d3", "#65a30d"];
  let newTagColor = TAG_COLOR_CHOICES[0] as string;

  function toggleNodeTag(nodeId: string, tagId: string): void {
    store.dispatch(new ToggleNodeTagCommand(nodeId, tagId));
  }
  function createAndAssignTag(nodeId: string): void {
    const name = newTagName.trim();
    if (!name) return;
    const cmd = new AddTagCommand(name, newTagColor);
    store.dispatch(cmd);
    store.dispatch(new ToggleNodeTagCommand(nodeId, cmd.newTagId));
    newTagName = "";
    // Vòng qua màu tiếp theo trong bảng — Tag kế tiếp tạo không trùng
    // màu Tag vừa tạo, dễ phân biệt hơn nếu tạo liên tiếp nhiều Tag.
    const curIdx = TAG_COLOR_CHOICES.indexOf(newTagColor);
    newTagColor = TAG_COLOR_CHOICES[(curIdx + 1) % TAG_COLOR_CHOICES.length] as string;
  }
  function commitRenameTag(tagId: string, value: string): void {
    const trimmed = value.trim();
    editingTagId = null;
    if (!trimmed) return;
    store.dispatch(new RenameTagCommand(tagId, trimmed));
  }
  function setTagColor(tagId: string, color: string): void {
    store.dispatch(new SetTagColorCommand(tagId, color));
  }
  async function deleteTagGlobally(tagId: string, tagName: string): Promise<void> {
    const ok = await showConfirm(
      `Xoá hẳn Tag "${tagName}"? Sẽ bị gỡ khỏi MỌI node đang gắn nó — không chỉ node đang chọn.`,
      "Xoá",
      "Huỷ"
    );
    if (!ok) return;
    store.dispatch(new DeleteTagCommand(tagId));
  }
  function patchRelationship(relId: string, patch: RelationshipPatch): void {
    store.dispatch(new UpdateRelationshipCommand(relId, patch));
  }
  function deleteRelationship(relId: string): void {
    store.dispatch(new DeleteRelationshipCommand(relId));
    selection.resetToRoot(store.getMap().rootId);
  }

  function patchSummary(summaryId: string, patch: SummaryPatch): void {
    store.dispatch(new UpdateSummaryCommand(summaryId, patch));
  }
  function deleteSummary(summaryId: string): void {
    store.dispatch(new DeleteSummaryCommand(summaryId));
    selection.resetToRoot(store.getMap().rootId);
  }

  /** Đổi kiểu vẽ: giữ thông số đang có nếu đã có `visual`, ngược lại dùng mặc định của kiểu mới. */
  function setBoundaryMode(boundaryId: string, mode: BoundaryMode): void {
    const b = store.getMap().boundaries.find((x) => x.id === boundaryId);
    if (!b) return;
    const next = b.visual ? { ...b.visual, mode } : defaultVisual(mode);
    // đổi sang/khỏi hình chữ nhật: độ mờ nền theo mặc định của kiểu mới (chữ nhật cũ tô đặc)
    if (!b.visual || b.visual.mode === "rectangle" || mode === "rectangle") next.fillOpacity = defaultVisual(mode).fillOpacity;
    store.dispatch(new UpdateBoundaryCommand(boundaryId, { visual: next }));
  }
  function patchVisual(b: Boundary, patch: Partial<BoundaryVisualOptions>): void {
    store.dispatch(new UpdateBoundaryCommand(b.id, { visual: { ...effectiveVisual(b), ...patch } }));
  }

  function patchBoundary(boundaryId: string, patch: BoundaryPatch): void {
    store.dispatch(new UpdateBoundaryCommand(boundaryId, patch));
  }
  function deleteBoundary(boundaryId: string): void {
    store.dispatch(new DeleteBoundaryCommand(boundaryId));
    selection.resetToRoot(store.getMap().rootId);
  }

  function patchStickyNote(noteId: string, patch: StickyNotePatch): void {
    store.dispatch(new UpdateStickyNoteCommand(noteId, patch));
  }
  function deleteStickyNote(noteId: string): void {
    store.dispatch(new DeleteStickyNoteCommand(noteId));
    selection.resetToRoot(store.getMap().rootId);
  }
</script>

{#if hasContent && panelCollapsed}
  <button
    id="side-panel-reopen"
    on:click={() => (panelCollapsed = false)}
    title="Mở panel định dạng"
  >«</button>
{:else}
<div id="side-panel" class:open={hasContent}>
  {#if hasContent}
    <button
      class="panel-collapse-btn"
      on:click={() => (panelCollapsed = true)}
      title="Thu gọn panel"
    >»</button>
  {/if}
  {#if relationship}
    {@const rel = relationship}
    <h4>Liên kết (Relationship)</h4>
    <div class="row">
      <label for="p-rel-label">Nhãn</label>
      <input id="p-rel-label" type="text" value={rel.label || ""} on:input={(e) => patchRelationship(rel.id, { label: e.currentTarget.value })} />
    </div>
    <div class="row">
      <label for="p-rel-color">Màu đường</label>
      <input id="p-rel-color" type="color" value={rel.color || "#2f9bed"} on:input={(e) => patchRelationship(rel.id, { color: e.currentTarget.value })} />
    </div>
    <div class="row">
      <label for="p-rel-dash">Nét đứt</label>
      <input id="p-rel-dash" type="checkbox" checked={rel.dash !== false} on:change={(e) => patchRelationship(rel.id, { dash: e.currentTarget.checked })} />
    </div>
    <p class="muted">Kéo chấm tròn xanh trên đường để uốn cong quanh node khác.</p>
    <button class="btn small-btn" on:click={() => patchRelationship(rel.id, { bend: null })}>↺ Làm thẳng lại (tự động)</button>
    <div class="divider"></div>
    <button class="btn danger small-btn" on:click={() => deleteRelationship(rel.id)}>Xoá liên kết</button>
  {:else if summary}
    {@const sum = summary}
    <h4>Tóm tắt (Summary)</h4>
    <div class="row">
      <label for="p-sum-label">Nhãn</label>
      <input id="p-sum-label" type="text" value={sum.label || ""} on:input={(e) => patchSummary(sum.id, { label: e.currentTarget.value })} />
    </div>
    <div class="row">
      <label for="p-sum-color">Màu khung</label>
      <input id="p-sum-color" type="color" value={sum.color || "#14162b"} on:input={(e) => patchSummary(sum.id, { color: e.currentTarget.value })} />
    </div>
    <p class="muted">Gồm {sum.nodeIds.length} mục.</p>
    <div class="divider"></div>
    <button class="btn danger small-btn" on:click={() => deleteSummary(sum.id)}>Xoá tóm tắt</button>
  {:else if boundary}
    {@const bd = boundary}
    <h4>Nhóm trực quan (Khoanh vùng)</h4>
    {@const vis = effectiveVisual(bd)}
    {@const geo = $map && $sel ? controller.getBoundaryGeometry(bd.id) : null}
    <div class="row">
      <label for="p-bd-label">Nhãn</label>
      <input id="p-bd-label" type="text" value={bd.label || ""} on:input={(e) => patchBoundary(bd.id, { label: e.currentTarget.value })} />
    </div>
    <div class="row">
      <label for="p-bd-mode" title="Cách vẽ nhóm. Đổi qua lại bất kỳ lúc nào — thành viên, nhãn và màu giữ nguyên, hoàn tác được.">Kiểu vẽ</label>
      <select id="p-bd-mode" value={vis.mode} on:change={(e) => setBoundaryMode(bd.id, e.currentTarget.value as BoundaryMode)}>
        {#each BOUNDARY_MODES as m (m)}
          <option value={m}>{BOUNDARY_MODE_LABEL[m]}</option>
        {/each}
      </select>
    </div>
    <div class="row">
      <label for="p-bd-fill">Màu nền</label>
      <input id="p-bd-fill" type="color" value={bd.fillColor || "#fdf2ce"} on:input={(e) => patchBoundary(bd.id, { fillColor: e.currentTarget.value })} />
    </div>
    <div class="row">
      <label for="p-bd-border">Màu viền</label>
      <input id="p-bd-border" type="color" value={bd.borderColor || "#e8b923"} on:input={(e) => patchBoundary(bd.id, { borderColor: e.currentTarget.value })} />
    </div>
    {#if bd.visual && vis.mode !== "rectangle"}
      {#if vis.mode === "multiContour"}
        <div class="row">
          <label for="p-bd-gap" title="Hai node cách nhau (mép tới mép) không quá giá trị này thì được nối vào cùng một vùng; xa hơn thì tách thành vùng riêng.">Ngưỡng nối vùng</label>
          <input id="p-bd-gap" type="range" min={BOUNDARY_LIMITS.connectionGap.min} max={BOUNDARY_LIMITS.connectionGap.max} step="4" value={vis.connectionGap}
            on:change={(e) => patchVisual(bd, { connectionGap: Number(e.currentTarget.value) })} />
          <span class="muted">{Math.round(vis.connectionGap)}</span>
        </div>
        <div class="row">
          <label for="p-bd-smooth" title="Độ bo tròn góc của đường bao (0 = góc vuông).">Độ mượt</label>
          <input id="p-bd-smooth" type="range" min="0" max="1" step="0.05" value={vis.smoothness}
            on:change={(e) => patchVisual(bd, { smoothness: Number(e.currentTarget.value) })} />
        </div>
      {/if}
      <div class="row">
        <label for="p-bd-pad" title="Khoảng đệm giữa node và đường bao (đơn vị thế giới).">Độ đệm</label>
        <input id="p-bd-pad" type="range" min={BOUNDARY_LIMITS.padding.min} max={BOUNDARY_LIMITS.padding.max} step="2" value={vis.padding}
          on:change={(e) => patchVisual(bd, { padding: Number(e.currentTarget.value) })} />
        <span class="muted">{Math.round(vis.padding)}</span>
      </div>
      <div class="row">
        <label for="p-bd-op" title="Độ đậm của màu nền (thấp = trong suốt, dễ đọc chữ).">Độ mờ nền</label>
        <input id="p-bd-op" type="range" min={BOUNDARY_LIMITS.fillOpacity.min} max="0.6" step="0.02" value={Math.min(vis.fillOpacity, 0.6)}
          on:change={(e) => patchVisual(bd, { fillOpacity: Number(e.currentTarget.value) })} />
      </div>
      <div class="row">
        <label for="p-bd-conn" title="Vẽ nét đứt mảnh nối các vùng (hoặc các thành viên) của nhóm.">Nét nối phụ</label>
        <input id="p-bd-conn" type="checkbox" checked={vis.showConnectors} on:change={(e) => patchVisual(bd, { showConnectors: e.currentTarget.checked })} />
      </div>
      <button class="btn small-btn" on:click={() => patchBoundary(bd.id, { visual: defaultVisual(vis.mode) })}>Đặt lại mặc định</button>
      {#if geo?.fragmented}
        <p class="muted" style="color:#b7791f">⚠ Nhóm đang tách thành {geo.regions?.length} vùng. Nếu thấy rối, thử kiểu vẽ “Phân tán (F)” hoặc tăng ngưỡng nối vùng.</p>
      {:else if geo?.mode === "multiContour" && geo.regions}
        <p class="muted">Đang vẽ {geo.regions.length} vùng{geo.approximate ? " (rút gọn thành hộp bao vì dữ liệu lớn)" : ""}.</p>
      {/if}
    {/if}
    <p class="muted">Gồm {bd.nodeIds.length} mục — không cần cùng node cha.</p>
    <button class="btn small-btn" title="Chọn tất cả node thuộc nhóm (thành viên đang ẩn thì chọn node đại diện đang hiện)" on:click={() => controller.selectBoundaryMembers(bd.id)}>Chọn các thành viên</button>
    <div class="divider"></div>
    <button class="btn danger small-btn" on:click={() => deleteBoundary(bd.id)}>Xoá nhóm</button>
  {:else if stickyNote}
    {@const sn = stickyNote}
    <h4>Ghi chú dán</h4>
    <div class="row" style="align-items:flex-start">
      <label for="p-sticky-text">Nội dung</label>
      <textarea id="p-sticky-text" rows="4" value={sn.text}
        on:change={(e) => patchStickyNote(sn.id, { text: e.currentTarget.value })}></textarea>
    </div>
    <div class="row">
      <label for="p-sticky-color">Màu giấy</label>
      <input id="p-sticky-color" type="color" value={sn.color || "#fff3b0"} on:input={(e) => patchStickyNote(sn.id, { color: e.currentTarget.value })} />
    </div>
    <p class="muted">Không gắn với node nào — tự do trên canvas.</p>
    <div class="divider"></div>
    <button class="btn danger small-btn" on:click={() => deleteStickyNote(sn.id)}>Xoá ghi chú</button>
  {:else if node}
    {@const n = node}
    <div class="panel-tabs">
      <button type="button" class:active={activeTab === "format"} on:click={() => (activeTab = "format")}>Định dạng</button>
      <button type="button" class:active={activeTab === "notes"} on:click={() => (activeTab = "notes")}>
        Ghi chú{#if n.notes}<span class="tab-dot"></span>{/if}
      </button>
    </div>

    {#if activeTab === "notes"}
      <textarea
        class="notes-textarea"
        placeholder="Ghi chú cho node này…"
        value={n.notes || ""}
        use:autoGrowAction={n.id}
        on:focus={() => onNotesFocus(n.id, n.notes)}
        on:input={(e) => {
          onNotesInput(e.currentTarget.value);
          autoGrowAction(e.currentTarget);
        }}
        on:blur={(e) => onNotesBlur(e.currentTarget.value)}
      ></textarea>
    {:else}
    <h4>Định dạng node</h4>

    <button type="button" class="section-header" on:click={() => (sectionOpen.base = !sectionOpen.base)}>
      <span class="chevron" class:collapsed={!sectionOpen.base}>▾</span> Định dạng cơ bản
    </button>
    {#if sectionOpen.base}
      <div class="row">
        <label for="p-fill">Màu nền</label>
        <input id="p-fill" type="color" value={n.fill || (isRootNode ? "#2f6fed" : "#ffffff")} disabled={n.fillTransparent}
          on:input={(e) => patchNode(n.id, { fill: e.currentTarget.value })} />
      </div>
      <div class="row">
        <label for="p-fill-transparent">Nền trong suốt</label>
        <input id="p-fill-transparent" type="checkbox" checked={n.fillTransparent} on:change={(e) => patchNode(n.id, { fillTransparent: e.currentTarget.checked })} />
      </div>
      <div class="row">
        <label for="p-fill-opacity">Độ trong suốt</label>
        <div class="opacity-row">
          <input id="p-fill-opacity" type="range" min="0" max="100" value={n.fillOpacity} disabled={n.fillTransparent}
            on:input={(e) => patchNode(n.id, { fillOpacity: Number(e.currentTarget.value) })} />
          <span class="opacity-value">{n.fillOpacity}%</span>
        </div>
      </div>
      <div class="row">
        <label for="p-color">Màu chữ</label>
        <input id="p-color" type="color" value={n.color || (isRootNode ? "#ffffff" : "#1f2933")} on:input={(e) => patchNode(n.id, { color: e.currentTarget.value })} />
      </div>
      <div class="row">
        <label for="p-border-style">Kiểu viền</label>
        <select id="p-border-style" value={n.borderStyle} on:change={(e) => patchNode(n.id, { borderStyle: e.currentTarget.value as BorderStyle })}>
          <option value="solid">Liền</option>
          <option value="dashed">Đứt nét</option>
          <option value="dotted">Chấm</option>
          <option value="none">Không viền</option>
        </select>
      </div>
      <div class="row">
        <label for="p-border-color">Màu viền</label>
        <input id="p-border-color" type="color" value={n.borderColor || "#d0d5db"} on:input={(e) => patchNode(n.id, { borderColor: e.currentTarget.value })} />
      </div>
    {/if}
    <div class="divider"></div>

    <button type="button" class="section-header" on:click={() => (sectionOpen.connector = !sectionOpen.connector)}>
      <span class="chevron" class:collapsed={!sectionOpen.connector}>▾</span> Đường nối cha-con
    </button>
    {#if sectionOpen.connector}
      <div class="row">
        <label for="p-edge-shape">Đường nối tới con</label>
        <select id="p-edge-shape" value={n.edgeShape} on:change={(e) => patchNode(n.id, { edgeShape: e.currentTarget.value as EdgeShape })}>
          <option value="curve">Cong</option>
          <option value="straight">Thẳng</option>
        </select>
      </div>
      <div class="row">
        <label for="p-edge-dash">Nét đứt</label>
        <input id="p-edge-dash" type="checkbox" checked={n.edgeDash} on:change={(e) => patchNode(n.id, { edgeDash: e.currentTarget.checked })} />
      </div>
      <div class="row">
        <label for="p-edge-color">Màu đường nối</label>
        <input id="p-edge-color" type="color" value={n.edgeColor || "#9aa3ad"} on:input={(e) => patchNode(n.id, { edgeColor: e.currentTarget.value })} />
      </div>
      <div class="row">
        <label for="p-edge-width">Độ dày đường nối</label>
        <input id="p-edge-width" type="number" min="0.5" max="10" step="0.25" placeholder="Tự động theo cấp"
          value={n.edgeWidth ?? ""}
          on:change={(e) => {
            const raw = e.currentTarget.value.trim();
            patchNode(n.id, { edgeWidth: raw === "" ? null : Math.max(0.5, Math.min(10, Number(raw))) });
          }} />
      </div>
      {#if n.parentId !== null}
        <div class="row">
          <label for="p-edge-label">Nhãn trên đường nối</label>
          <input id="p-edge-label" type="text" placeholder="(không có)" value={n.edgeLabel || ""}
            on:input={(e) => patchNode(n.id, { edgeLabel: e.currentTarget.value.trim() || null })} />
        </div>
        {#if n.edgeLabel && !$map.showEdgeLabels}
          <p class="muted">Đã đặt nhãn, nhưng công tắc "Hiện nhãn cha-con" trên Toolbar đang tắt nên chưa hiện trên canvas.</p>
        {/if}
      {/if}
    {/if}
    <div class="divider"></div>

    <div class="row">
      <label for="p-link">Hyperlink</label>
      <input id="p-link" type="url" placeholder="https://..." value={n.link || ""}
        on:input={(e) => patchNode(n.id, { link: e.currentTarget.value.trim() || null })} />
    </div>
    <div class="row" style="align-items:flex-start;">
      <label for="p-image" style="margin-top:6px;">Ảnh nhúng</label>
      <div class="image-field">
        {#if n.imageAssetId && $map.assets[n.imageAssetId]}
          <button type="button" class="image-thumb" title="Bấm để xem cỡ lớn"
            on:click={() => previewImage(n.imageAssetId as string)}>
            <img src={`data:${$map.assets[n.imageAssetId as string]?.mimeType};base64,${$map.assets[n.imageAssetId as string]?.dataBase64}`} alt="Ảnh nhúng trên node" />
          </button>
          <div class="image-field-buttons">
            <button id="p-image" type="button" class="btn small-btn" on:click={() => pickImageFor(n.id)}>Đổi ảnh...</button>
            <button type="button" class="btn danger small-btn" on:click={() => removeImage(n.id)}>Xoá ảnh</button>
          </div>
        {:else}
          <button id="p-image" type="button" class="btn small-btn" on:click={() => pickImageFor(n.id)}>Chọn ảnh...</button>
        {/if}
      </div>
    </div>
    <div class="divider"></div>

    <CardSection {store} {controller} nodeId={n.id} />
    <div class="divider"></div>

    <button type="button" class="section-header" on:click={() => (sectionOpen.work = !sectionOpen.work)}>
      <span class="chevron" class:collapsed={!sectionOpen.work}>▾</span> Tiến độ, ưu tiên & Tag
    </button>
    {#if sectionOpen.work}
      <div class="row">
        <label for="p-priority">Độ ưu tiên</label>
        <select id="p-priority" value={n.priority === null ? "" : String(n.priority)}
          on:change={(e) => patchNode(n.id, { priority: e.currentTarget.value === "" ? null : Number(e.currentTarget.value) })}>
          <option value="">Không</option>
          <option value="1">1 — khẩn cấp</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5 — thấp</option>
        </select>
      </div>
      <div class="row">
        <label for="p-progress">Tiến độ (%)</label>
        <input id="p-progress" type="number" min="0" max="100" placeholder="—" value={n.progress ?? ""}
          on:change={(e) => {
            const raw = e.currentTarget.value.trim();
            patchNode(n.id, { progress: raw === "" ? null : Math.max(0, Math.min(100, Number(raw))) });
          }} />
      </div>
      <div class="row">
        <label for="p-checked">Checkbox hoàn thành</label>
        <select id="p-checked" value={n.checked === null ? "" : n.checked ? "true" : "false"}
          on:change={(e) => {
            const v = e.currentTarget.value;
            patchNode(n.id, { checked: v === "" ? null : v === "true" });
          }}>
          <option value="">Không có checkbox</option>
          <option value="false">Chưa hoàn thành</option>
          <option value="true">Đã hoàn thành (gạch ngang chữ)</option>
        </select>
      </div>

      <div class="row" style="align-items:flex-start">
        <label for="p-tag-btn">Tag</label>
        <button type="button" id="p-tag-btn" class="btn small-btn" on:click={() => (tagPickerOpen = !tagPickerOpen)}>
          {tagPickerOpen ? "Đóng" : "+ Chọn Tag"}
        </button>
      </div>
      {#if n.tagIds.length > 0}
        <div class="chip-row">
          {#each n.tagIds as tagId (tagId)}
            {@const tag = $map.tags.find((t) => t.id === tagId)}
            {#if tag}
              <span class="chip" style="background:{lightenHex(tag.color, 0.82)};color:{tag.color}">
                {tag.name}<button type="button" on:click={() => toggleNodeTag(n.id, tagId)}>×</button>
              </span>
            {/if}
          {/each}
        </div>
      {/if}
      <NodeFieldsEditor {store} map={$map} node={n} />
      {#if tagPickerOpen}
        <div class="tag-picker">
          {#each $map.tags as tag (tag.id)}
            <div class="tag-picker-row">
              <input type="checkbox" checked={n.tagIds.includes(tag.id)}
                on:change={() => toggleNodeTag(n.id, tag.id)} />
              <input type="color" value={tag.color} title="Đổi màu Tag (áp dụng cho mọi node đang gắn)"
                on:input={(e) => setTagColor(tag.id, e.currentTarget.value)} />
              {#if editingTagId === tag.id}
                <input type="text" class="tag-picker-name-input" value={tag.name}
                  on:blur={(e) => commitRenameTag(tag.id, e.currentTarget.value)}
                  on:keydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} />
              {:else}
                <button type="button" class="tag-picker-name" title="Bấm để đổi tên"
                  on:click={() => (editingTagId = tag.id)}>{tag.name}</button>
              {/if}
              <button type="button" class="tag-picker-delete" title="Xoá Tag khỏi mọi node đang gắn"
                on:click={() => deleteTagGlobally(tag.id, tag.name)}>🗑</button>
            </div>
          {/each}
          {#if $map.tags.length === 0}
            <p class="tag-picker-empty">Chưa có Tag nào — tạo mới bên dưới.</p>
          {/if}
          <div class="tag-picker-new">
            <input type="color" bind:value={newTagColor} title="Màu Tag mới" />
            <input type="text" placeholder="Tên Tag mới…" bind:value={newTagName}
              on:keydown={(e) => { if (e.key === "Enter") { e.preventDefault(); createAndAssignTag(n.id); } }} />
            <button type="button" class="btn small-btn" on:click={() => createAndAssignTag(n.id)}>Thêm</button>
          </div>
        </div>
      {/if}

      <div class="row" style="align-items:flex-start; margin-top:9px;">
        <span id="p-marker-label">Biểu tượng</span>
        <MarkerPicker markers={n.markers} on:change={(e) => patchNode(n.id, { markers: e.detail })} />
      </div>
    {/if}
    <div class="divider"></div>

    <button type="button" class="section-header" on:click={() => (sectionOpen.text = !sectionOpen.text)}>
      <span class="chevron" class:collapsed={!sectionOpen.text}>▾</span> Chữ trong node
    </button>
    {#if sectionOpen.text}
      <div class="row">
        <label for="p-text-style-btns">Kiểu chữ</label>
        <div id="p-text-style-btns" class="text-style-btns">
          <button type="button" class="text-style-btn" class:active={n.textBold}
            title="Đậm" on:click={() => patchNode(n.id, { textBold: !n.textBold })}><b>B</b></button>
          <button type="button" class="text-style-btn" class:active={n.textItalic}
            title="Nghiêng" on:click={() => patchNode(n.id, { textItalic: !n.textItalic })}><i>I</i></button>
          <button type="button" class="text-style-btn" class:active={n.textUnderline}
            title="Gạch chân" on:click={() => patchNode(n.id, { textUnderline: !n.textUnderline })}><u>U</u></button>
        </div>
      </div>
      <div class="row">
        <label for="p-font-family">Font chữ</label>
        <select id="p-font-family" value={showCustomFont ? CUSTOM_FONT_SENTINEL : (n.fontFamily ?? "")}
          on:change={(e) => {
            const v = e.currentTarget.value;
            if (v === CUSTOM_FONT_SENTINEL) {
              showCustomFont = true;
            } else {
              showCustomFont = false;
              patchNode(n.id, { fontFamily: v || null });
            }
          }}>
          <option value="">Mặc định (hệ thống)</option>
          {#each FONT_OPTIONS as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
          <option value={CUSTOM_FONT_SENTINEL}>Khác (tự gõ tên font)...</option>
        </select>
      </div>
      {#if showCustomFont}
        <div class="row">
          <label for="p-font-family-custom">Tên font tự gõ</label>
          <input id="p-font-family-custom" type="text" placeholder="Ví dụ: Roboto" value={n.fontFamily ?? ""}
            on:change={(e) => patchNode(n.id, { fontFamily: e.currentTarget.value.trim() || null })} />
        </div>
      {/if}
      <div class="row">
        <label for="p-font-size">Cỡ chữ (px)</label>
        <input id="p-font-size" type="number" min="9" max="40" placeholder="Mặc định" value={n.fontSize ?? ""}
          on:change={(e) => {
            const raw = e.currentTarget.value.trim();
            patchNode(n.id, { fontSize: raw === "" ? null : Math.max(9, Math.min(40, Number(raw))) });
          }} />
      </div>
      <div class="row">
        <label for="p-text-align">Căn lề</label>
        <select id="p-text-align" value={n.textAlign} on:change={(e) => patchNode(n.id, { textAlign: e.currentTarget.value as TextAlign })}>
          <option value="left">Trái</option>
          <option value="center">Giữa</option>
          <option value="right">Phải</option>
        </select>
      </div>
      <div class="row">
        <label for="p-text-fit">Cách hiển thị chữ</label>
        <select id="p-text-fit" value={n.textFit} on:change={(e) => patchNode(n.id, { textFit: e.currentTarget.value as TextFit })}>
          <option value="auto">Tự động (như trước giờ)</option>
          <option value="wrap">Tự xuống dòng</option>
          <option value="shrink">Tự co chữ</option>
        </select>
      </div>
    {/if}
    <div class="divider"></div>

    <div class="row">
      <label for="p-width">Rộng (px)</label>
      <input id="p-width" type="number" min="50" value={Math.round(n.width)}
        on:change={(e) => setSize(n.id, Math.max(50, Number(e.currentTarget.value) || 50), Math.max(28, n.manualHeight ?? n.height))} />
    </div>
    <div class="row">
      <label for="p-height">Cao (px)</label>
      <input id="p-height" type="number" min="28" value={Math.round(n.height)}
        on:change={(e) => setSize(n.id, Math.max(50, n.manualWidth ?? n.width), Math.max(28, Number(e.currentTarget.value) || 28))} />
    </div>
    <button class="btn small-btn" on:click={() => resetSize(n.id)}>Đặt lại kích thước tự động</button>
    {/if}
  {:else if multiCount > 1}
    <h4>{multiCount} node đã chọn</h4>
    <p class="muted">Bấm "{"{ }"} Tóm tắt" trên thanh công cụ để nhóm các mục cùng cấp này lại.</p>

    <h4 style="margin-top:16px">Sửa hàng loạt</h4>
    <p class="muted" style="margin-top:-6px">
      Áp dụng NGAY cho cả {multiCount} node đang chọn, gộp thành đúng 1 bước hoàn tác (Ctrl+Z một lần là về hết).
    </p>

    <div class="row">
      <label for="p-bulk-fill">Màu nền</label>
      <input id="p-bulk-fill" type="color" value="#2f6fed"
        on:change={(e) => bulkPatch({ fill: e.currentTarget.value })} />
      <button type="button" class="btn small-btn" on:click={() => bulkPatch({ fill: null })}>Đặt lại mặc định</button>
    </div>
    <div class="row">
      <label for="p-bulk-color">Màu chữ</label>
      <input id="p-bulk-color" type="color" value="#1f2933"
        on:change={(e) => bulkPatch({ color: e.currentTarget.value })} />
      <button type="button" class="btn small-btn" on:click={() => bulkPatch({ color: null })}>Đặt lại mặc định</button>
    </div>
    <div class="row" style="align-items:flex-start">
      <label for="p-bulk-style">Kiểu chữ</label>
      <div id="p-bulk-style" class="bulk-style-grid">
        <span class="bulk-style-label">Đậm</span>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textBold: true })}>Bật</button>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textBold: false })}>Tắt</button>
        <span class="bulk-style-label">Nghiêng</span>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textItalic: true })}>Bật</button>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textItalic: false })}>Tắt</button>
        <span class="bulk-style-label">Gạch chân</span>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textUnderline: true })}>Bật</button>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ textUnderline: false })}>Tắt</button>
      </div>
    </div>
    <div class="row" style="align-items:flex-start">
      <label for="p-bulk-checked">Checkbox</label>
      <div id="p-bulk-checked" class="bulk-checked-btns">
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ checked: null })}>Không có</button>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ checked: false })}>Chưa xong</button>
        <button type="button" class="btn small-btn" on:click={() => bulkPatch({ checked: true })}>Đã xong</button>
      </div>
    </div>
  {/if}
</div>
{/if}

<input bind:this={imageInput} type="file" accept="image/*" on:change={onImageFileChange} style="display:none" />

<style>
  /* P2.6c — tiêu đề khối gấp/mở được */
  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    background: none;
    border: none;
    padding: 4px 0 10px;
    margin: 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--muted);
    cursor: pointer;
    text-align: left;
  }
  .section-header .chevron {
    display: inline-block;
    font-size: 10px;
    transition: transform 0.12s ease;
  }
  .section-header .chevron.collapsed {
    transform: rotate(-90deg);
  }

  /* P2.10 — Ảnh nhúng: khung nhỏ + 2 nút, xếp bên phải label giống mọi
   *  hàng khác trong panel. */
  .image-field {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }
  .image-field-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .image-thumb {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    background: #f4f5f6;
    flex-shrink: 0;
  }
  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  /* P2.6c — thanh trượt độ trong suốt màu nền */
  .opacity-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }
  .opacity-row input[type="range"] {
    flex: 1;
  }
  .opacity-value {
    font-size: 11.5px;
    color: var(--muted);
    min-width: 32px;
    text-align: right;
  }

  /* P2.3 — thanh 2 thẻ Định dạng/Ghi chú */
  .panel-tabs {
    display: flex;
    gap: 4px;
    margin: 0 0 12px;
    border-bottom: 1px solid var(--border);
  }
  .panel-tabs button {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 6px 4px 8px;
    font-size: 12.5px;
    color: var(--muted);
    cursor: pointer;
    position: relative;
  }
  .panel-tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 500;
  }
  .tab-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    margin-left: 4px;
    vertical-align: middle;
  }
  .notes-textarea {
    width: 100%;
    min-height: 90px;
    max-height: 320px;
    resize: vertical;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    font-family: inherit;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--ink, #20242c);
    overflow-y: auto;
  }
  .notes-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  /* P2.3 — nút thu gọn (trong panel) và nút mở lại (khi đã thu gọn) */
  .panel-collapse-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    width: 22px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    font-size: 11px;
    line-height: 1;
    padding: 0;
  }
  .panel-collapse-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  #side-panel-reopen {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 28px;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    color: var(--muted);
    cursor: pointer;
    font-size: 13px;
    box-shadow: 0 8px 24px rgba(20, 22, 30, 0.08);
  }
  #side-panel-reopen:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  /* P2.2 — CSS riêng cho các phần tử chỉ dùng trong component này, dùng
     kiểu scoped của Svelte thay vì thêm vào style.css chung, vì đây là
     chi tiết không có nơi nào khác cần biết tới. */
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0 9px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 999px;
    padding: 3px 4px 3px 10px;
    font-size: 11.5px;
  }
  .chip button {
    background: none;
    border: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    padding: 0 4px;
  }
  .tag-picker {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px;
    margin: 4px 0 9px;
    background: var(--bg);
    max-height: 220px;
    overflow-y: auto;
  }
  .tag-picker-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
  }
  .tag-picker-row input[type="checkbox"] {
    flex: none;
  }
  .tag-picker-row input[type="color"] {
    flex: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .tag-picker-name {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12.5px;
    padding: 2px 4px;
    border-radius: 4px;
    color: var(--text);
  }
  .tag-picker-name:hover {
    background: var(--accent-soft);
  }
  .tag-picker-name-input {
    flex: 1;
    font-size: 12.5px;
    padding: 2px 4px;
  }
  .tag-picker-delete {
    flex: none;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    opacity: 0.6;
    padding: 2px 4px;
  }
  .tag-picker-delete:hover {
    opacity: 1;
  }
  .tag-picker-empty {
    font-size: 12px;
    color: var(--muted);
    margin: 4px 0;
  }
  .tag-picker-new {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--border);
  }
  .tag-picker-new input[type="text"] {
    flex: 1;
  }
  .tag-picker-new input[type="color"] {
    flex: none;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .text-style-btns {
    display: flex;
    gap: 4px;
  }
  .text-style-btn {
    width: 28px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel);
    color: var(--text);
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .text-style-btn.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
  }
  .bulk-style-grid {
    display: grid;
    grid-template-columns: auto auto auto;
    gap: 4px 6px;
    align-items: center;
  }
  .bulk-style-label {
    font-size: 12px;
    color: var(--muted);
  }
  .bulk-checked-btns {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
</style>
