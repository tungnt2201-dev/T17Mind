/**
 * ui/selection.ts
 * ---------------------------------------------------------------------
 * "Đang chọn gì / đang hover gì" là trạng thái GIAO DIỆN, không phải
 * dữ liệu tài liệu — nó không được lưu xuống file, không nằm trong
 * lịch sử hoàn tác, và vì vậy KHÔNG thuộc core/store.ts. Tách riêng
 * ra đây để interaction.ts, sidePanel.ts, toolbar.ts cùng đọc/ghi một
 * nguồn chung mà không phải truyền qua lại bằng tham số lằng nhằng.
 * ---------------------------------------------------------------------
 */

export interface SelectionSnapshot {
  selectedIds: ReadonlySet<string>;
  primaryId: string | null;
  selectedRelId: string | null;
  selectedSummaryId: string | null;
  selectedBoundaryId: string | null;
  selectedStickyNoteId: string | null;
  hoveredId: string | null;
}

export type SelectionListener = () => void;

export class SelectionModel {
  private selectedIds = new Set<string>();
  private primaryId: string | null = null;
  private selectedRelId: string | null = null;
  private selectedSummaryId: string | null = null;
  private selectedBoundaryId: string | null = null;
  private selectedStickyNoteId: string | null = null;
  private hoveredId: string | null = null;
  private readonly listeners = new Set<SelectionListener>();

  subscribe(listener: SelectionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  snapshot(): SelectionSnapshot {
    return {
      selectedIds: this.selectedIds,
      primaryId: this.primaryId,
      selectedRelId: this.selectedRelId,
      selectedSummaryId: this.selectedSummaryId,
      selectedBoundaryId: this.selectedBoundaryId,
      selectedStickyNoteId: this.selectedStickyNoteId,
      hoveredId: this.hoveredId,
    };
  }

  get ids(): ReadonlySet<string> {
    return this.selectedIds;
  }
  get primary(): string | null {
    return this.primaryId;
  }
  get relId(): string | null {
    return this.selectedRelId;
  }
  get summaryId(): string | null {
    return this.selectedSummaryId;
  }
  get boundaryId(): string | null {
    return this.selectedBoundaryId;
  }
  get stickyNoteId(): string | null {
    return this.selectedStickyNoteId;
  }
  get hovered(): string | null {
    return this.hoveredId;
  }

  selectSingleNode(id: string): void {
    this.selectedIds = new Set([id]);
    this.primaryId = id;
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  toggleNode(id: string): void {
    const next = new Set(this.selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) next.add(id); // không cho phép bấm để về 0 lựa chọn
    this.selectedIds = next;
    this.primaryId = id;
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  applyMarqueeResult(ids: string[], additive: boolean, fallbackId: string): void {
    if (additive) {
      const next = new Set(this.selectedIds);
      for (const id of ids) next.add(id);
      this.selectedIds = next;
      if (ids.length > 0) this.primaryId = ids[ids.length - 1] as string;
    } else {
      this.selectedIds = new Set(ids);
      this.primaryId = ids.length > 0 ? (ids[ids.length - 1] as string) : fallbackId;
    }
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  selectRelationship(id: string): void {
    this.selectedIds = new Set();
    this.primaryId = null;
    this.selectedRelId = id;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  selectSummary(id: string): void {
    this.selectedIds = new Set();
    this.primaryId = null;
    this.selectedRelId = null;
    this.selectedSummaryId = id;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  selectBoundary(id: string): void {
    this.selectedIds = new Set();
    this.primaryId = null;
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = id;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  selectStickyNote(id: string): void {
    this.selectedIds = new Set();
    this.primaryId = null;
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = id;
    this.notify();
  }

  clearRelSummarySelectionKeepNodes(): void {
    this.selectedRelId = null;
    this.selectedSummaryId = null;
    this.selectedBoundaryId = null;
    this.selectedStickyNoteId = null;
    this.notify();
  }

  setHovered(id: string | null): void {
    if (this.hoveredId === id) return;
    this.hoveredId = id;
    this.notify();
  }

  resetToRoot(rootId: string): void {
    this.selectSingleNode(rootId);
  }
}
