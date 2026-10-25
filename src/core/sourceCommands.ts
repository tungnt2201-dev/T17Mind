/**
 * core/sourceCommands.ts
 * ---------------------------------------------------------------------
 * KW3 — Command cho nguồn PDF và vùng tô sáng. Mọi thay đổi dữ liệu nguồn đi qua đây (hoàn tác/làm lại được).
 * Xoá nguồn / xoá vùng tô sáng KHÔNG xoá card đã tạo (card giữ nguyên đoạn trích) — chỉ gỡ liên kết `card.source`.
 * ---------------------------------------------------------------------
 */
import type { Command } from "./commands";
import type { Card, ImageAsset, MindMap, PdfHighlight, Source } from "./types";
import { deepClone } from "./tree";
import { touchCard } from "./cardCommands";

function requireSource(map: MindMap, id: string): Source {
  const s = map.sources?.[id];
  if (!s) throw new Error(`Nguồn không tồn tại: ${id}`);
  return s;
}

/** Thêm một nguồn PDF cùng dữ liệu file (ghi vào map.assets). */
export class AddSourceCommand implements Command {
  readonly label = "Thêm nguồn PDF";
  constructor(private readonly source: Source, private readonly asset: ImageAsset) {}
  apply(map: MindMap): void {
    if (map.sources?.[this.source.id]) throw new Error(`Nguồn trùng id: ${this.source.id}`);
    map.assets[this.source.assetId] = this.asset;
    map.sources = { ...(map.sources ?? {}), [this.source.id]: deepClone(this.source) };
  }
  revert(map: MindMap): void {
    delete map.assets[this.source.assetId];
    if (map.sources) {
      delete map.sources[this.source.id];
      if (Object.keys(map.sources).length === 0) delete map.sources;
    }
  }
}

/** Xoá nguồn và file PDF của nó; card đã tạo giữ nguyên nội dung nhưng mất liên kết "Mở trong PDF". */
export class RemoveSourceCommand implements Command {
  readonly label = "Xoá nguồn PDF";
  private removed: Source | null = null;
  private asset: ImageAsset | undefined;
  private unlinked: { cardId: string; ref: NonNullable<Card["source"]> }[] = [];
  constructor(private readonly sourceId: string) {}
  apply(map: MindMap): void {
    const s = requireSource(map, this.sourceId);
    this.removed = s;
    this.asset = map.assets[s.assetId];
    delete map.assets[s.assetId];
    delete map.sources![this.sourceId];
    if (Object.keys(map.sources!).length === 0) delete map.sources;
    this.unlinked = [];
    for (const c of Object.values(map.cards)) {
      if (c.source?.sourceId === this.sourceId) {
        this.unlinked.push({ cardId: c.id, ref: c.source });
        delete c.source;
        touchCard(c);
      }
    }
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    if (this.asset) map.assets[this.removed.assetId] = this.asset;
    map.sources = { ...(map.sources ?? {}), [this.sourceId]: this.removed };
    for (const u of this.unlinked) {
      const c = map.cards[u.cardId];
      if (c) {
        c.source = u.ref;
        touchCard(c);
      }
    }
  }
}

/** Thêm một vùng tô sáng; có `card` thì tạo luôn card (vào Inbox, chưa gắn node) và liên kết hai chiều; có `image` thì ghi kèm ảnh cắt. */
export class AddHighlightCommand implements Command {
  readonly label = "Tô sáng PDF";
  constructor(
    private readonly sourceId: string,
    private readonly highlight: PdfHighlight,
    private readonly card: Card | null = null,
    private readonly image: { id: string; asset: ImageAsset } | null = null
  ) {}
  apply(map: MindMap): void {
    const s = requireSource(map, this.sourceId);
    if (s.highlights.some((h) => h.id === this.highlight.id)) throw new Error(`Vùng tô sáng trùng id: ${this.highlight.id}`);
    const h = deepClone(this.highlight);
    if (this.card) {
      if (map.cards[this.card.id]) throw new Error(`Card trùng id: ${this.card.id}`);
      h.cardId = this.card.id;
      map.cards[this.card.id] = deepClone(this.card);
    }
    if (this.image) map.assets[this.image.id] = this.image.asset;
    s.highlights = [...s.highlights, h];
  }
  revert(map: MindMap): void {
    const s = map.sources?.[this.sourceId];
    if (s) s.highlights = s.highlights.filter((h) => h.id !== this.highlight.id);
    if (this.card) delete map.cards[this.card.id];
    if (this.image) delete map.assets[this.image.id];
  }
}

/** Xoá một vùng tô sáng; card đã tạo từ nó vẫn còn nhưng mất liên kết nguồn. */
export class RemoveHighlightCommand implements Command {
  readonly label = "Xoá vùng tô sáng";
  private removed: PdfHighlight | null = null;
  private index = -1;
  private unlinkedCard: string | null = null;
  constructor(private readonly sourceId: string, private readonly highlightId: string) {}
  apply(map: MindMap): void {
    const s = requireSource(map, this.sourceId);
    const i = s.highlights.findIndex((h) => h.id === this.highlightId);
    if (i < 0) return;
    this.removed = s.highlights[i]!;
    this.index = i;
    s.highlights = s.highlights.filter((_, j) => j !== i);
    this.unlinkedCard = null;
    for (const c of Object.values(map.cards)) {
      if (c.source?.sourceId === this.sourceId && c.source.highlightId === this.highlightId) {
        delete c.source;
        touchCard(c);
        this.unlinkedCard = c.id;
      }
    }
  }
  revert(map: MindMap): void {
    if (!this.removed) return;
    const s = map.sources?.[this.sourceId];
    if (!s) return;
    const hs = [...s.highlights];
    hs.splice(this.index, 0, this.removed);
    s.highlights = hs;
    if (this.unlinkedCard && map.cards[this.unlinkedCard]) {
      map.cards[this.unlinkedCard]!.source = { sourceId: this.sourceId, highlightId: this.highlightId };
      touchCard(map.cards[this.unlinkedCard]!);
    }
  }
}

export class SetHighlightColorCommand implements Command {
  readonly label = "Đổi màu tô sáng";
  private old = "";
  constructor(private readonly sourceId: string, private readonly highlightId: string, private readonly color: string) {}
  apply(map: MindMap): void {
    const h = requireSource(map, this.sourceId).highlights.find((x) => x.id === this.highlightId);
    if (!h) return;
    this.old = h.color;
    h.color = this.color;
  }
  revert(map: MindMap): void {
    const h = map.sources?.[this.sourceId]?.highlights.find((x) => x.id === this.highlightId);
    if (h) h.color = this.old;
  }
}

export class RenameSourceCommand implements Command {
  readonly label = "Đổi tên nguồn";
  private old = "";
  constructor(private readonly sourceId: string, private readonly name: string) {}
  apply(map: MindMap): void {
    const s = requireSource(map, this.sourceId);
    this.old = s.name;
    s.name = this.name;
  }
  revert(map: MindMap): void {
    const s = map.sources?.[this.sourceId];
    if (s) s.name = this.old;
  }
}
