<script lang="ts">
  /**
   * ui/components/PdfViewerModal.svelte
   * -------------------------------------------------------------------
   * KW3 — trình xem PDF của một NGUỒN trong map: xem từng trang (nạp lười, mượt với PDF dài), chọn CHỮ để tô sáng và tạo card
   * kèm nguồn, chọn VÙNG để cắt thành ảnh (PDF scan không có lớp chữ), danh sách vùng tô sáng của nguồn, bấm để nhảy tới.
   * Vùng tô sáng lưu theo toạ độ chuẩn hoá 0..1 của trang nên đúng ở mọi mức phóng to. Mọi thay đổi dữ liệu qua Command.
   * -------------------------------------------------------------------
   */
  import { onDestroy, tick } from "svelte";
  import type { PDFDocumentProxy } from "pdfjs-dist";
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { pdfViewerStore, showNotice } from "../uiStores";
  import { showConfirm } from "../dialog";
  import { AddHighlightCommand, RemoveHighlightCommand, RemoveSourceCommand, SetHighlightColorCommand } from "../../core/sourceCommands";
  import {
    HIGHLIGHT_COLORS,
    boundsOf,
    cardFromAreaHighlight,
    cardFromTextHighlight,
    cleanQuote,
    generateHighlightId,
    highlightsByPage,
    mergeLineRects,
    normalizeRect,
    sourcesOf,
  } from "../../core/sources";
  import { generateId } from "../../core/tree";
  import type { PdfHighlight, PdfRect } from "../../core/types";
  import { acceptChangedFile, addPdfFile, addPdfLinked, embedSource, linkSourceToFile, pdfIo, relinkSource } from "../pdf/pdfController";
  import { openPdf, renderPage, type PageRender } from "../pdf/pdfEngine";
  import { loadSourceBytes } from "../pdf/sourceFiles";
  import { isDesktopApp } from "../../io/nativeFs";
  import { isLinkedSource, type SourceFileState } from "../../core/sources";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  type Tool = "text" | "area";
  let tool: Tool = "text";
  let color: string = HIGHLIGHT_COLORS[0];
  let sourceId: string | null = null;
  let page = 1;
  let scale = 1.2;
  let fitted = false;
  let showList = true;
  let doc: PDFDocumentProxy | null = null;
  let docFor = "";
  let loading = false;
  let loadError = "";
  /** Trạng thái file của nguồn (liên kết: ok / đã đổi / mất file) và byte đã đọc (để chuyển nhúng / chấp nhận bản mới). */
  let fileState: SourceFileState = "ok";
  let loadedBytes: Uint8Array | null = null;
  let loadedSha = "";
  // Đánh giá lại mỗi lần mở hộp (cầu nối Neutralino có thể sẵn sàng muộn hơn lúc khởi tạo component).
  let desktop = false;
  let rendered: PageRender | null = null;
  let pageW = 0;
  let pageH = 0;
  let noText = false;
  let selectedHl: string | null = null;
  let pulse: string | null = null;
  let pending: { rects: PdfRect[]; text: string; anchor: { x: number; y: number } } | null = null;
  let drag: { x0: number; y0: number; x1: number; y1: number } | null = null;

  let canvasEl: HTMLCanvasElement | undefined;
  let textEl: HTMLDivElement | undefined;
  let wrapEl: HTMLDivElement | undefined;
  let scrollEl: HTMLDivElement | undefined;
  let wasOpen = false;
  let renderSeq = 0;

  $: open = $pdfViewerStore !== null;
  $: onOpenChange(open);
  function onOpenChange(isOpen: boolean): void {
    if (isOpen && !wasOpen) {
      const t = $pdfViewerStore!;
      desktop = isDesktopApp();
      sourceId = t.sourceId ?? sourcesOf($map).slice(-1)[0]?.id ?? null;
      page = t.page ?? 1;
      fitted = false;
      pending = null;
      selectedHl = t.highlightId ?? null;
      pulse = t.highlightId ?? null;
      void ensureDoc().then(() => {
        if (t.highlightId) void scrollToHighlight(t.highlightId);
      });
    }
    if (!isOpen && wasOpen) {
      void doc?.destroy();
      doc = null;
      docFor = "";
    }
    wasOpen = isOpen;
  }
  // Cũng nhận yêu cầu "nhảy tới" khi hộp đã mở (bấm "Mở trong PDF" ở card khác).
  let lastTarget: unknown = null;
  $: if (open && wasOpen && $pdfViewerStore !== lastTarget) {
    const t = $pdfViewerStore!;
    lastTarget = t;
    if (t.sourceId && t.sourceId !== sourceId) {
      sourceId = t.sourceId;
      void ensureDoc();
    }
    if (t.page) page = t.page;
    if (t.highlightId) {
      selectedHl = t.highlightId;
      pulse = t.highlightId;
      void scrollToHighlight(t.highlightId);
    }
  }

  $: sources = sourcesOf($map);
  $: source = sourceId ? ($map.sources?.[sourceId] ?? null) : null;
  $: pageCount = source?.pages ?? 1;
  $: byPage = source ? highlightsByPage(source) : new Map<number, PdfHighlight[]>();
  $: pageHighlights = byPage.get(page) ?? [];
  $: sortedHighlights = source ? [...source.highlights].sort((a, b) => a.page - b.page || (a.rects[0]?.y ?? 0) - (b.rects[0]?.y ?? 0)) : [];

  async function ensureDoc(): Promise<void> {
    const s = sourceId ? $map.sources?.[sourceId] : null;
    if (!s) {
      doc = null;
      docFor = "";
      return;
    }
    if (doc && docFor === s.id) return;
    loading = true;
    loadError = "";
    fileState = "ok";
    loadedBytes = null;
    try {
      void doc?.destroy();
      doc = null;
      const loaded = await loadSourceBytes($map, s, pdfIo);
      fileState = loaded.state;
      loadedSha = loaded.sha256 ?? "";
      if (!loaded.bytes) {
        docFor = "";
        loadError = loaded.error ?? "Không đọc được dữ liệu PDF.";
        return;
      }
      loadedBytes = loaded.bytes;
      doc = await openPdf(loaded.bytes);
      docFor = s.id;
      page = Math.min(Math.max(1, page), doc.numPages);
      if (!fitted) await fitWidth();
    } catch (e) {
      console.error(e);
      loadError = e instanceof Error ? e.message : String(e);
      doc = null;
    } finally {
      loading = false;
    }
  }

  async function fitWidth(): Promise<void> {
    if (!doc) return;
    const p = await doc.getPage(Math.min(page, doc.numPages));
    const w = p.getViewport({ scale: 1 }).width;
    const avail = (scrollEl?.clientWidth ?? 800) - 40;
    scale = Math.max(0.4, Math.min(3, Math.round((avail / w) * 100) / 100));
    fitted = true;
  }

  /** Yêu cầu vẽ lại: xếp hàng tuần tự (không bao giờ hai tác vụ vẽ cùng lúc trên một canvas); yêu cầu cũ bị bỏ qua. */
  let drawChain: Promise<void> = Promise.resolve();
  function draw(): Promise<void> {
    const seq = ++renderSeq;
    drawChain = drawChain.then(() => drawNow(seq)).catch((e) => console.error("Lỗi vẽ trang PDF:", e));
    return drawChain;
  }
  async function drawNow(seq: number): Promise<void> {
    if (seq !== renderSeq || !doc || !canvasEl || !textEl) return;
    if (rendered) {
      rendered.cancel();
      await rendered.settled;
      rendered = null;
    }
    if (seq !== renderSeq) return;
    pending = null;
    const r = await renderPage(doc, Math.min(Math.max(1, page), doc.numPages), scale, canvasEl, textEl, () => {
      if (seq === renderSeq) pendingScrollRefresh();
    });
    rendered = r;
    if (seq !== renderSeq) return; // bị thay bằng yêu cầu mới: lần vẽ sau sẽ huỷ và chờ lần này
    pageW = r.width;
    pageH = r.height;
    noText = !r.hasText;
  }
  function pendingScrollRefresh(): void {
    /* vẽ xong: không cần làm gì thêm, chỗ này để mở rộng (ví dụ cập nhật trạng thái "đang vẽ") */
  }

  $: if (open && doc && (page || scale)) void tick().then(() => draw());

  function go(n: number): void {
    const next = Math.min(Math.max(1, Math.round(n)), pageCount);
    if (next !== page) {
      page = next;
      selectedHl = null;
      scrollEl?.scrollTo({ top: 0 });
    }
  }
  function zoom(delta: number): void {
    scale = Math.max(0.4, Math.min(3, Math.round((scale + delta) * 100) / 100));
  }
  async function scrollToHighlight(id: string): Promise<void> {
    const h = sourceId ? $map.sources?.[sourceId]?.highlights.find((x) => x.id === id) : null;
    if (!h) return;
    if (h.page !== page) page = h.page;
    await tick();
    await new Promise((r) => setTimeout(r, 60));
    const b = boundsOf(h.rects);
    if (b && scrollEl) scrollEl.scrollTo({ top: Math.max(0, b.y * pageH - scrollEl.clientHeight / 3), behavior: "smooth" });
    setTimeout(() => (pulse = null), 2200);
  }

  // ------------------------------------------------------------ Chọn chữ
  function pageRect(): DOMRect | null {
    return wrapEl?.getBoundingClientRect() ?? null;
  }
  /** Bấm (không bôi đen) lên một vùng tô sáng của trang → chọn nó (lớp chữ nằm trên lớp tô sáng nên phải dò toạ độ). */
  function hitHighlight(e: MouseEvent): void {
    const base = pageRect();
    if (!base) return;
    const x = (e.clientX - base.left) / base.width;
    const y = (e.clientY - base.top) / base.height;
    const hit = pageHighlights.find((h) => h.rects.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h));
    selectedHl = hit ? (selectedHl === hit.id ? null : hit.id) : null;
  }
  function onTextMouseUp(e: MouseEvent): void {
    if (tool !== "text") return;
    setTimeout(() => {
      const sel = window.getSelection();
      const base = pageRect();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !base || !textEl) {
        pending = null;
        hitHighlight(e);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!textEl.contains(range.commonAncestorContainer)) return;
      const raw: PdfRect[] = [];
      for (const r of Array.from(range.getClientRects())) {
        const n = normalizeRect({ left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height }, { width: base.width, height: base.height });
        if (n) raw.push(n);
      }
      const rects = mergeLineRects(raw);
      const text = cleanQuote(sel.toString());
      if (rects.length === 0 || text === "") {
        pending = null;
        return;
      }
      const last = rects[rects.length - 1]!;
      pending = { rects, text, anchor: { x: (last.x + last.w) * base.width, y: (last.y + last.h) * base.height } };
    }, 0);
  }
  function commitText(): void {
    if (!pending || !source) return;
    const h: PdfHighlight = { id: generateHighlightId(), page, kind: "text", rects: pending.rects, text: pending.text, color, cardId: null, createdAt: Date.now() };
    store.dispatch(new AddHighlightCommand(source.id, h, cardFromTextHighlight(source, h)));
    window.getSelection()?.removeAllRanges();
    pending = null;
    selectedHl = h.id;
    showNotice("Đã tô sáng và tạo card trong Inbox của Thư viện.");
  }

  // ------------------------------------------------------------ Chọn vùng (ảnh)
  function areaPoint(e: MouseEvent): { x: number; y: number } {
    const b = pageRect()!;
    return { x: Math.min(Math.max(0, e.clientX - b.left), b.width), y: Math.min(Math.max(0, e.clientY - b.top), b.height) };
  }
  function onAreaDown(e: MouseEvent): void {
    if (tool !== "area" || e.button !== 0) return;
    e.preventDefault();
    const p = areaPoint(e);
    drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    const move = (ev: MouseEvent): void => {
      const q = areaPoint(ev);
      if (drag) drag = { ...drag, x1: q.x, y1: q.y };
    };
    const up = (): void => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      void finishArea();
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }
  async function finishArea(): Promise<void> {
    const d = drag;
    drag = null;
    if (!d || !source || !canvasEl) return;
    const left = Math.min(d.x0, d.x1);
    const top = Math.min(d.y0, d.y1);
    const width = Math.abs(d.x1 - d.x0);
    const height = Math.abs(d.y1 - d.y0);
    const n = normalizeRect({ left, top, width, height }, { width: pageW, height: pageH });
    if (!n || width < 12 || height < 12) return;
    const k = canvasEl.width / pageW;
    const crop = document.createElement("canvas");
    crop.width = Math.max(1, Math.round(width * k));
    crop.height = Math.max(1, Math.round(height * k));
    crop.getContext("2d")!.drawImage(canvasEl, Math.round(left * k), Math.round(top * k), crop.width, crop.height, 0, 0, crop.width, crop.height);
    const blob = await new Promise<Blob | null>((res) => crop.toBlob(res, "image/png"));
    if (!blob) return;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const imageId = generateId("img");
    const h: PdfHighlight = { id: generateHighlightId(), page, kind: "area", rects: [n], text: "", color, cardId: null, createdAt: Date.now() };
    store.dispatch(new AddHighlightCommand(source.id, h, cardFromAreaHighlight(source, h, imageId), { id: imageId, asset: { mimeType: "image/png", dataBase64: btoa(bin), width: crop.width, height: crop.height } }));
    selectedHl = h.id;
    showNotice("Đã cắt vùng thành ảnh và tạo card trong Inbox của Thư viện.");
  }

  // ------------------------------------------------------------ Hành động trên vùng tô sáng
  function openCard(h: PdfHighlight): void {
    if (h.cardId && $map.cards[h.cardId]) controller.openCardPage(h.cardId);
    else showNotice("Card của vùng này đã bị xoá.");
  }
  function removeHl(h: PdfHighlight): void {
    if (source) store.dispatch(new RemoveHighlightCommand(source.id, h.id));
    if (selectedHl === h.id) selectedHl = null;
  }
  /** Sau khi đổi cách lưu/đường dẫn của nguồn: nạp lại file. */
  async function reload(): Promise<void> {
    docFor = "";
    fitted = false;
    await ensureDoc();
  }
  async function doRelink(): Promise<void> {
    if (source && (await relinkSource(store, source))) await reload();
  }
  async function doAccept(): Promise<void> {
    if (!source || !loadedBytes || !doc) return;
    acceptChangedFile(store, source, loadedBytes, loadedSha, doc.numPages);
    fileState = "ok";
  }
  async function doEmbed(): Promise<void> {
    if (!source || !loadedBytes) return;
    const pages = doc?.numPages ?? source.pages;
    const sha = loadedSha || (await pdfIo.hash(loadedBytes));
    if (await embedSource(store, source, loadedBytes, sha, pages)) {
      fileState = "ok";
    }
  }
  async function doLink(): Promise<void> {
    if (!source || !loadedBytes) return;
    if (await linkSourceToFile(store, source, loadedBytes)) fileState = "ok";
  }
  async function removeSource(): Promise<void> {
    if (!source) return;
    const n = source.highlights.length;
    if (!(await showConfirm(`Xoá nguồn "${source.name}"? File PDF${n ? ` và ${n} vùng tô sáng` : ""} bị gỡ khỏi map; các card đã tạo vẫn giữ nguyên đoạn trích (Ctrl+Z khôi phục được).`, "Xoá"))) return;
    store.dispatch(new RemoveSourceCommand(source.id));
    const rest = sourcesOf(store.getMap());
    sourceId = rest[rest.length - 1]?.id ?? null;
    doc = null;
    docFor = "";
    page = 1;
    await ensureDoc();
  }
  async function pickSource(id: string): Promise<void> {
    sourceId = id;
    page = 1;
    selectedHl = null;
    fitted = false;
    await ensureDoc();
  }
  async function linkNew(): Promise<void> {
    const id = await addPdfLinked(store);
    if (id) await pickSource(id);
  }
  let fileInput: HTMLInputElement | undefined;
  async function onFile(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = "";
    if (!f) return;
    const id = await addPdfFile(store, f);
    if (id) await pickSource(id);
  }

  function close(): void {
    window.getSelection()?.removeAllRanges();
    pdfViewerStore.set(null);
  }
  function onKeydown(e: KeyboardEvent): void {
    e.stopPropagation();
    const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select") !== null;
    if (e.key === "Escape") {
      if (pending) {
        pending = null;
        window.getSelection()?.removeAllRanges();
      } else close();
    } else if (!typing && (e.key === "ArrowRight" || e.key === "PageDown")) go(page + 1);
    else if (!typing && (e.key === "ArrowLeft" || e.key === "PageUp")) go(page - 1);
    else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    } else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "y") {
      e.preventDefault();
      store.redo();
    }
  }
  onDestroy(() => void doc?.destroy());

  const pct = (v: number): string => `${(v * 100).toFixed(3)}%`;
  const snippet = (h: PdfHighlight): string => (h.kind === "area" ? "Vùng cắt thành ảnh" : h.text.length > 90 ? `${h.text.slice(0, 89)}…` : h.text);
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay open pv-overlay" role="presentation" on:keydown={onKeydown}>
    <div class="pv" role="dialog" aria-modal="true" aria-label="Trình xem PDF">
      <div class="pv-bar">
        {#if sources.length > 0}
          <select aria-label="Nguồn PDF" value={sourceId ?? ""} on:change={(e) => void pickSource(e.currentTarget.value)}>
            {#each sources as s (s.id)}<option value={s.id}>{s.name}</option>{/each}
          </select>
        {/if}
        <button type="button" class="btn small-btn" title="Chép PDF vào map (đi theo file map)" on:click={() => fileInput?.click()}>{desktop ? "+ Nhúng PDF…" : "+ Thêm PDF…"}</button>
        {#if desktop}
          <button type="button" class="btn small-btn" title="Chỉ nhớ đường dẫn file PDF, không chép vào map (map nhẹ; file phải còn ở đường dẫn đó)" on:click={() => void linkNew()}>+ Liên kết PDF…</button>
        {/if}
        <input bind:this={fileInput} type="file" accept="application/pdf,.pdf" hidden on:change={onFile} />
        {#if source}
          <span class="pv-sep"></span>
          <button type="button" class="btn small-btn" disabled={page <= 1} on:click={() => go(page - 1)} aria-label="Trang trước">‹</button>
          <input class="pv-page" type="number" min="1" max={pageCount} value={page} aria-label="Số trang" on:change={(e) => go(Number(e.currentTarget.value))} />
          <span class="pv-count">/ {pageCount}</span>
          <button type="button" class="btn small-btn" disabled={page >= pageCount} on:click={() => go(page + 1)} aria-label="Trang sau">›</button>
          <span class="pv-sep"></span>
          <button type="button" class="btn small-btn" on:click={() => zoom(-0.15)} aria-label="Thu nhỏ">−</button>
          <span class="pv-count">{Math.round(scale * 100)}%</span>
          <button type="button" class="btn small-btn" on:click={() => zoom(0.15)} aria-label="Phóng to">+</button>
          <button type="button" class="btn small-btn" on:click={async () => { await fitWidth(); }}>Vừa rộng</button>
          <span class="pv-sep"></span>
          <span class="pv-tools" role="group" aria-label="Công cụ">
            <button type="button" class:on={tool === "text"} on:click={() => { tool = "text"; drag = null; }} title="Bôi đen chữ để tô sáng và tạo card">Chọn chữ</button>
            <button type="button" class:on={tool === "area"} on:click={() => { tool = "area"; pending = null; }} title="Kéo một vùng để cắt thành ảnh và tạo card (dùng cho PDF scan)">Chọn vùng</button>
          </span>
          <span class="pv-colors" role="group" aria-label="Màu tô sáng">
            {#each HIGHLIGHT_COLORS as c (c)}
              <button type="button" class="pv-swatch" class:on={color === c} style="background:{c}" aria-label="Màu {c}" on:click={() => { color = c; const h = selectedHl && source?.highlights.find((x) => x.id === selectedHl); if (h && source && h.color !== c) store.dispatch(new SetHighlightColorCommand(source.id, h.id, c)); }}></button>
            {/each}
          </span>
        {/if}
        <span class="pv-grow"></span>
        <button type="button" class="btn small-btn" on:click={() => store.undo()} aria-label="Hoàn tác">↶</button>
        <button type="button" class="btn small-btn" on:click={() => store.redo()} aria-label="Làm lại">↷</button>
        {#if source}<button type="button" class="btn small-btn" class:active={showList} on:click={() => (showList = !showList)}>Vùng tô sáng ({source.highlights.length})</button>{/if}
        {#if source && desktop && loadedBytes}
          {#if isLinkedSource(source)}
            <button type="button" class="btn small-btn" title="Chép PDF vào map để map tự chứa, không phụ thuộc file ngoài" on:click={() => void doEmbed()}>Nhúng vào map</button>
          {:else}
            <button type="button" class="btn small-btn" title="Ghi PDF ra file rồi gỡ bản nhúng khỏi map (map nhẹ đi)" on:click={() => void doLink()}>Chuyển sang liên kết…</button>
          {/if}
        {/if}
        {#if source}<button type="button" class="btn danger small-btn" on:click={() => void removeSource()}>Xoá nguồn</button>{/if}
        <button type="button" class="btn small-btn" aria-label="Đóng" on:click={close}>✕</button>
      </div>

      <div class="pv-body">
        <div class="pv-scroll" bind:this={scrollEl}>
          {#if !source}
            <div class="pv-empty">
              <p><b>Chưa có nguồn PDF nào trong map này.</b></p>
              <p>Thêm một file PDF để đọc, tô sáng chữ và biến đoạn trích thành card kèm nguồn. File PDF được lưu NGAY TRONG file map (đi theo file .t17m khi gửi đi).</p>
              <button type="button" class="btn primary" on:click={() => fileInput?.click()}>+ Thêm PDF…</button>
            </div>
          {:else if loadError}
            <div class="pv-empty">
              {#if isLinkedSource(source) && fileState === "missing"}
                <p><b>Mất file PDF liên kết.</b></p>
                <p>Nguồn "{source.name}" chỉ nhớ đường dẫn:<br /><code>{source.path}</code><br />File đã bị đổi tên, di chuyển, xoá, hoặc ổ đĩa không còn gắn. Các vùng tô sáng và card đã tạo vẫn còn nguyên.</p>
                {#if desktop}<button type="button" class="btn primary" on:click={() => void doRelink()}>Chọn lại file…</button>{/if}
              {:else}
                <p><b>Không mở được PDF.</b></p><p>{loadError}</p>
              {/if}
            </div>
          {:else}
            {#if source && isLinkedSource(source)}
              {#if fileState === "changed"}
                <div class="pv-note pv-warn">
                  File liên kết <b>đã thay đổi</b> so với lúc thêm — vùng tô sáng có thể lệch khỏi chữ.
                  <button type="button" class="btn small-btn" on:click={() => void doAccept()}>Chấp nhận bản hiện tại</button>
                  {#if desktop}<button type="button" class="btn small-btn" on:click={() => void doRelink()}>Chọn file khác…</button>{/if}
                </div>
              {:else}
                <div class="pv-note pv-ok" title={source.path}>✓ Liên kết tới file trên đĩa — khớp với lúc thêm. <span class="pv-path">{source.path}</span></div>
              {/if}
            {/if}
            {#if loading}<div class="pv-loading">Đang mở PDF…</div>{/if}
            {#if noText}
              <div class="pv-note">Trang này không có lớp chữ (PDF scan hoặc ảnh) — dùng công cụ <b>Chọn vùng</b> để cắt thành ảnh.</div>
            {/if}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="pv-page-wrap" bind:this={wrapEl} style="width:{pageW}px;height:{pageH}px" on:mouseup={onTextMouseUp}>
              <canvas bind:this={canvasEl}></canvas>
              <div class="pv-hl-layer">
                {#each pageHighlights as h (h.id)}
                  {#each h.rects as r}
                    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                    <div class="pv-hl" class:sel={selectedHl === h.id} class:pulse={pulse === h.id} class:area={h.kind === "area"}
                      style="left:{pct(r.x)};top:{pct(r.y)};width:{pct(r.w)};height:{pct(r.h)};--c:{h.color}" title={snippet(h)}
                      on:click|stopPropagation={() => (selectedHl = selectedHl === h.id ? null : h.id)}></div>
                  {/each}
                {/each}
              </div>
              <div class="textLayer pv-text" class:pv-off={tool !== "text"} bind:this={textEl}></div>
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="pv-area-layer" class:on={tool === "area"} on:mousedown={onAreaDown}>
                {#if drag}
                  <div class="pv-drag" style="left:{Math.min(drag.x0, drag.x1)}px;top:{Math.min(drag.y0, drag.y1)}px;width:{Math.abs(drag.x1 - drag.x0)}px;height:{Math.abs(drag.y1 - drag.y0)}px"></div>
                {/if}
              </div>
              {#if pending}
                <div class="pv-act" style="left:{Math.min(pending.anchor.x, pageW - 220)}px;top:{pending.anchor.y + 6}px">
                  <button type="button" class="btn primary small-btn" on:click={commitText}>Tô sáng và tạo card</button>
                </div>
              {/if}
              {#if selectedHl}
                {@const h = pageHighlights.find((x) => x.id === selectedHl)}
                {#if h}
                  {@const b = boundsOf(h.rects)}
                  {#if b}
                    <div class="pv-pop" style="left:{Math.min(b.x * pageW, pageW - 260)}px;top:{(b.y + b.h) * pageH + 6}px">
                      <button type="button" class="btn small-btn" on:click={() => openCard(h)}>Mở card</button>
                      <button type="button" class="btn danger small-btn" on:click={() => removeHl(h)}>Xoá vùng</button>
                    </div>
                  {/if}
                {/if}
              {/if}
            </div>
          {/if}
        </div>

        {#if showList && source}
          <aside class="pv-list" aria-label="Vùng tô sáng">
            <h3>Vùng tô sáng</h3>
            {#each sortedHighlights as h (h.id)}
              <div class="pv-item" class:sel={selectedHl === h.id}>
                <button type="button" class="pv-item-main" on:click={() => { selectedHl = h.id; pulse = h.id; void scrollToHighlight(h.id); }}>
                  <span class="pv-dot" style="background:{h.color}"></span>
                  <span class="pv-pg">tr. {h.page}</span>
                  <span class="pv-snip">{snippet(h)}</span>
                </button>
                <span class="pv-item-act">
                  <button type="button" title="Mở card" on:click={() => openCard(h)}>▣</button>
                  <button type="button" title="Xoá vùng" on:click={() => removeHl(h)}>✕</button>
                </span>
              </div>
            {/each}
            {#if sortedHighlights.length === 0}
              <p class="pv-none">Chưa có vùng nào. Bôi đen chữ (hoặc kéo chọn vùng) trên trang để tạo.</p>
            {/if}
          </aside>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Dưới trang card (1500): bấm "Mở card" trong trình xem thì card hiện ĐÈ LÊN; từ card bấm "Mở trong PDF" thì card tự đóng. */
  .pv-overlay { z-index: 1400; align-items: stretch; justify-content: center; padding: 14px; box-sizing: border-box; }
  .pv { background: #eef0f3; border-radius: 10px; width: min(1400px, 100%); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
  .pv-bar { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 8px 10px; background: #fff; border-bottom: 1px solid #dfe3e8; }
  .pv-bar select, .pv-page { border: 1px solid #d8dce2; border-radius: 6px; padding: 4px 6px; font: inherit; font-size: 13px; background: #fff; max-width: 220px; }
  .pv-page { width: 56px; text-align: center; }
  .pv-count { font-size: 12.5px; color: #4b5563; min-width: 34px; text-align: center; }
  .pv-sep { width: 1px; height: 20px; background: #e5e7eb; margin: 0 4px; }
  .pv-grow { flex: 1; }
  .pv-tools { display: inline-flex; border: 1px solid #d8dce2; border-radius: 8px; overflow: hidden; }
  .pv-tools button { border: none; background: #fff; padding: 5px 10px; cursor: pointer; font-size: 12.5px; color: #374151; }
  .pv-tools button.on { background: #2f6fed; color: #fff; }
  .pv-colors { display: inline-flex; gap: 4px; }
  .pv-swatch { width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; padding: 0; }
  .pv-swatch.on { border-color: #1f2933; }
  .pv-body { flex: 1; display: flex; min-height: 0; }
  .pv-scroll { flex: 1; overflow: auto; padding: 16px 20px 40px; position: relative; }
  .pv-page-wrap { position: relative; margin: 0 auto; background: #fff; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25); }
  .pv-page-wrap canvas { display: block; }
  .pv-empty { max-width: 460px; margin: 60px auto; text-align: center; color: #374151; display: flex; flex-direction: column; gap: 8px; align-items: center; }
  .pv-loading { position: absolute; left: 50%; top: 24px; transform: translateX(-50%); background: #1f2933; color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12.5px; z-index: 5; }
  .pv-note { max-width: 560px; margin: 0 auto 10px; background: #fff7e0; border: 1px solid #f0d78a; border-radius: 8px; padding: 6px 12px; font-size: 12.5px; color: #6b5200; }
  .pv-warn { background: #fff0ee; border-color: #f0b8b0; color: #8a2d1f; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .pv-ok { background: #eefaf0; border-color: #b8e0c0; color: #1f6b34; }
  .pv-path { color: #5d8b69; word-break: break-all; font-size: 11.5px; }
  .pv-hl-layer, .pv-area-layer { position: absolute; inset: 0; pointer-events: none; }
  .pv-hl { position: absolute; background: var(--c); opacity: 0.45; mix-blend-mode: multiply; border-radius: 2px; pointer-events: auto; cursor: pointer; }
  .pv-hl.area { background: transparent; border: 2px solid var(--c); opacity: 0.95; mix-blend-mode: normal; }
  .pv-hl.sel { outline: 2px solid #2f6fed; opacity: 0.6; }
  .pv-hl.pulse { animation: pvpulse 0.7s ease-in-out 3; }
  @keyframes pvpulse { 50% { opacity: 1; outline: 3px solid #2f6fed; } }
  .pv-text { z-index: 2; }
  .pv-text.pv-off { pointer-events: none; user-select: none; }
  .pv-area-layer.on { pointer-events: auto; cursor: crosshair; z-index: 3; }
  .pv-drag { position: absolute; border: 2px dashed #2f6fed; background: rgba(47, 111, 237, 0.15); }
  .pv-act, .pv-pop { position: absolute; z-index: 6; display: flex; gap: 6px; background: #fff; padding: 4px; border-radius: 8px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }
  .pv-list { width: 300px; background: #fff; border-left: 1px solid #dfe3e8; overflow: auto; padding: 10px; flex-shrink: 0; }
  .pv-list h3 { margin: 0 0 8px; font-size: 14px; }
  .pv-item { display: flex; align-items: flex-start; gap: 2px; border-radius: 6px; }
  .pv-item.sel { background: #eef3fe; }
  .pv-item-main { flex: 1; display: flex; align-items: flex-start; gap: 6px; border: none; background: none; text-align: left; padding: 6px; cursor: pointer; font: inherit; font-size: 12.5px; min-width: 0; }
  .pv-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
  .pv-pg { color: #6b7280; flex-shrink: 0; }
  .pv-snip { color: #1f2933; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; }
  .pv-item-act { display: flex; flex-direction: column; }
  .pv-item-act button { border: none; background: none; cursor: pointer; color: #9aa1ab; padding: 3px 5px; font-size: 12px; }
  .pv-item-act button:hover { color: #c0392b; }
  .pv-none { color: #9aa1ab; font-size: 12.5px; }
  /* Lớp chữ của pdf.js (rút gọn từ pdf_viewer.css): chữ trong suốt nằm đúng vị trí để bôi đen được. */
  .pv-text:global(.textLayer) { position: absolute; inset: 0; overflow: clip; line-height: 1; text-size-adjust: none; transform-origin: 0 0; }
  .pv-text :global(span), .pv-text :global(br) { color: transparent; position: absolute; white-space: pre; cursor: text; transform-origin: 0% 0%; }
  .pv-text :global(span.markedContent) { top: 0; height: 0; }
  .pv-text :global(::selection) { background: rgba(0, 80, 255, 0.28); }
  .pv-text :global(.endOfContent) { display: block; position: absolute; inset: 100% 0 0; z-index: 0; cursor: default; user-select: none; }
  .pv-text:global(.selecting) :global(.endOfContent) { top: 0; }
</style>
