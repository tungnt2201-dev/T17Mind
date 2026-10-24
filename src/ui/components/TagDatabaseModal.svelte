<script lang="ts">
  /**
   * ui/components/TagDatabaseModal.svelte
   * -------------------------------------------------------------------
   * KW5 — "Cơ sở dữ liệu Tag": chọn một Tag, mỗi node mang Tag là một
   * dòng; thuộc tính của Tag là các cột. Ba chế độ xem: Bảng (lọc, sắp
   * xếp, nhóm, sửa ô, sửa hàng loạt, xuất CSV/Excel), Kanban (kéo thẻ
   * đổi giá trị cột chọn/trạng thái) và Biểu đồ (gộp theo một cột chọn).
   * Quy tắc giữ nguyên: mọi thay đổi dữ liệu qua Command; input dùng
   * value + on:change một chiều. Logic nằm ở core/tagDb.ts (thuần).
   * -------------------------------------------------------------------
   */
  import { onDestroy } from "svelte";
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { tagDbStore, showNotice } from "../uiStores";
  import { showConfirm } from "../dialog";
  import { downloadText, downloadBlob } from "../dom";
  import { toDelimited } from "../../core/table";
  import { generateOptionId } from "../../core/tree";
  import { AddTagFieldCommand, RemoveTagFieldCommand, SetFieldValueCommand, SetTagOrderCommand, UpdateTagFieldCommand } from "../../core/tagDbCommands";
  import { CompositeCommand } from "../../core/commands";
  import {
    FIELD_TYPE_LABEL,
    FILTER_OP_LABEL,
    MAX_FIELDS_PER_TAG,
    MAX_OPTIONS_PER_FIELD,
    NAME_KEY,
    OPTION_COLORS,
    aggregateForChart,
    applyFilters,
    displayValue,
    groupByAny,
    groupByField,
    moveInOrder,
    orderRows,
    hasOptions,
    normalizeFieldValue,
    opsFor,
    rowsOfTag,
    rowsToGrid,
    rowsToTypedGrid,
    sortRows,
    tagFieldsOf,
    type DbGroup,
    type DbRow,
    type Filter,
    type FilterOp,
    type Measure,
    type Sort,
  } from "../../core/tagDb";
  import { buildChartModel, chartToSvg } from "../../render/chartModel";
  import { svgToPng } from "../../io/chartPng";
  import type { ChartKind, TagField, TagFieldType } from "../../core/types";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  type View = "table" | "kanban" | "chart";
  let tagId: string | null = null;
  let view: View = "table";
  let filters: Filter[] = [];
  let sort: Sort | null = null;
  let groupKey = "";
  let selected = new Set<string>();
  let kanbanFieldId = "";
  let chartFieldId = "";
  let chartMeasure = "count"; // "count" | "sum:<id>" | "avg:<id>"
  let chartKind: ChartKind = "bar";
  let manage = false;
  let bulkFieldId = "";
  let bulkValue = "";
  let dragId: string | null = null;
  let overKey: string | null = null;
  let overCard: string | null = null;
  let newFieldName = "";
  let newFieldType: TagFieldType = "text";
  let wasOpen = false;

  $: open = $tagDbStore !== null;
  // Một khối duy nhất (không tách `wasOpen = open` ra khối riêng: Svelte sẽ xếp khối gán chạy TRƯỚC khối đọc).
  $: onOpenChange(open);
  function onOpenChange(isOpen: boolean): void {
    if (isOpen && !wasOpen) init();
    wasOpen = isOpen;
  }

  function init(): void {
    const tags = store.getMap().tags;
    tagId = $tagDbStore?.tagId && tags.some((t) => t.id === $tagDbStore!.tagId) ? $tagDbStore!.tagId : (tags[0]?.id ?? null);
    resetForTag();
    view = "table";
    manage = false;
  }
  function resetForTag(): void {
    filters = [];
    sort = null;
    groupKey = "";
    selected = new Set();
    kanbanFieldId = "";
    chartFieldId = "";
    chartMeasure = "count";
    bulkFieldId = "";
    bulkValue = "";
  }
  function close(): void {
    (document.activeElement as HTMLElement | null)?.blur?.();
    tagDbStore.set(null);
  }

  $: tags = $map.tags;
  $: tag = tags.find((t) => t.id === tagId) ?? null;
  $: fields = tagFieldsOf(tag ?? undefined);
  $: choiceFields = fields.filter((f) => hasOptions(f.type));
  $: numberFields = fields.filter((f) => f.type === "number");
  $: allRows = tag ? rowsOfTag($map, tag.id) : [];
  $: rows = sortRows(applyFilters(allRows, filters, fields), sort, fields);
  $: groupField = fields.find((f) => f.id === groupKey) ?? null;
  $: groups = groupField ? groupByAny(rows, groupField) : null;
  $: kanbanField = choiceFields.find((f) => f.id === kanbanFieldId) ?? choiceFields[0] ?? null;
  // Kanban xếp thẻ theo thứ tự kéo-thả thủ công (tag.order), bỏ qua "sắp xếp" của Bảng; bộ lọc vẫn áp dụng.
  $: kanbanRows = orderRows(applyFilters(allRows, filters, fields), tag?.order);
  $: columns = kanbanField ? groupByField(kanbanRows, kanbanField, true) : [];
  $: chartField = choiceFields.find((f) => f.id === chartFieldId) ?? choiceFields[0] ?? null;
  $: measure = parseMeasure(chartMeasure);
  $: chartSvg = chartField
    ? chartToSvg(buildChartModel(aggregateForChart(rows, chartField, measure, fields), chartKind, 560, 300, { title: chartTitle(chartField, measure) }))
    : "";
  $: visibleSelected = rows.filter((r) => selected.has(r.nodeId));
  $: bulkField = fields.find((f) => f.id === bulkFieldId) ?? fields[0] ?? null;

  function parseMeasure(m: string): Measure {
    const [kind, id] = m.split(":");
    return (kind === "sum" || kind === "avg") && id ? { kind, fieldId: id } : { kind: "count" };
  }
  function chartTitle(f: TagField, m: Measure): string {
    const by = m.kind === "count" ? "Số dòng" : `${m.kind === "sum" ? "Tổng" : "Trung bình"} ${fields.find((x) => x.id === m.fieldId)?.name ?? ""}`;
    return `${by} theo ${f.name}`;
  }
  const fieldType = (key: string): TagFieldType | "name" => (key === NAME_KEY ? "name" : (fields.find((f) => f.id === key)?.type ?? "text"));

  // ---------------------------------------------------------- Dữ liệu (đều qua Command)
  function setValue(nodeIds: string[], field: TagField, raw: string): boolean {
    const norm = normalizeFieldValue(field, raw);
    if (norm === null) {
      showNotice(field.type === "number" ? `"${field.name}" cần là một số.` : field.type === "date" ? `"${field.name}" cần là ngày hợp lệ.` : `Giá trị không hợp lệ cho "${field.name}".`);
      return false;
    }
    const unchanged = nodeIds.every((id) => ($map.nodes[id]?.fieldValues?.[field.id] ?? "") === norm);
    if (unchanged) return true;
    store.dispatch(new SetFieldValueCommand(nodeIds, field.id, norm));
    return true;
  }
  function onCellChange(e: Event, row: DbRow, field: TagField): void {
    const el = e.currentTarget as HTMLInputElement | HTMLSelectElement;
    if (!setValue([row.nodeId], field, el.value)) el.value = row.values[field.id] ?? "";
  }
  function applyBulk(): void {
    if (!bulkField || visibleSelected.length === 0) return;
    if (setValue(visibleSelected.map((r) => r.nodeId), bulkField, bulkValue)) showNotice(`Đã đặt "${bulkField.name}" cho ${visibleSelected.length} dòng.`);
  }
  /** Thả thẻ vào cột `g`: trước thẻ `beforeId`, hoặc cuối cột nếu null. Đổi giá trị cột (nếu khác) và thứ tự trong MỘT bước hoàn tác. */
  function dropCard(g: DbGroup, beforeId: string | null): void {
    const id = dragId;
    dragId = null;
    overKey = null;
    overCard = null;
    if (!id || !kanbanField || !tag || id === beforeId) return;
    const cur = $map.nodes[id]?.fieldValues?.[kanbanField.id] ?? "";
    const lastInCol = [...g.rows].reverse().find((r) => r.nodeId !== id)?.nodeId ?? null;
    const anchor = beforeId ? { before: beforeId } : lastInCol ? { after: lastInCol } : null;
    const effective = orderRows(allRows, tag.order).map((r) => r.nodeId);
    const next = moveInOrder(tag.order, allRows.map((r) => r.nodeId), id, anchor);
    const orderChanged = next.length !== effective.length || next.some((x, i) => x !== effective[i]);
    const valueChanged = cur !== g.key;
    if (valueChanged && normalizeFieldValue(kanbanField, g.key) === null) return;
    const cmds = [
      ...(valueChanged ? [new SetFieldValueCommand([id], kanbanField.id, g.key)] : []),
      ...(orderChanged ? [new SetTagOrderCommand(tag.id, next)] : []),
    ];
    if (cmds.length === 1) store.dispatch(cmds[0]!);
    else if (cmds.length > 1) store.dispatch(new CompositeCommand(cmds, "Kéo thẻ Kanban"));
  }

  // ---------------------------------------------------------- Lọc / sắp xếp / chọn
  function addFilter(): void {
    filters = [...filters, { key: NAME_KEY, op: "contains", value: "" }];
  }
  function patchFilter(i: number, p: Partial<Filter>): void {
    filters = filters.map((f, j) => {
      if (j !== i) return f;
      const next = { ...f, ...p };
      if (p.key !== undefined && p.key !== f.key) {
        const ops = opsFor(fieldType(p.key));
        if (!ops.includes(next.op)) next.op = ops[0]!;
        next.value = "";
      }
      return next;
    });
  }
  function toggleSort(key: string): void {
    sort = !sort || sort.key !== key ? { key, dir: "asc" } : sort.dir === "asc" ? { key, dir: "desc" } : null;
  }
  const sortMark = (key: string): string => (sort?.key === key ? (sort.dir === "asc" ? " ▲" : " ▼") : "");
  function toggleRow(id: string, on: boolean): void {
    const n = new Set(selected);
    if (on) n.add(id);
    else n.delete(id);
    selected = n;
  }
  function toggleAll(on: boolean): void {
    selected = on ? new Set(rows.map((r) => r.nodeId)) : new Set();
  }
  function goTo(nodeId: string): void {
    controller.revealNode(nodeId);
  }

  // ---------------------------------------------------------- Thuộc tính (cột)
  function addField(): void {
    if (!tag) return;
    const name = newFieldName.trim();
    if (!name) return;
    if (fields.length >= MAX_FIELDS_PER_TAG) {
      showNotice(`Mỗi Tag tối đa ${MAX_FIELDS_PER_TAG} thuộc tính.`);
      return;
    }
    store.dispatch(new AddTagFieldCommand(tag.id, name, newFieldType));
    newFieldName = "";
  }
  async function removeField(f: TagField): Promise<void> {
    if (!tag) return;
    const used = allRows.filter((r) => (r.values[f.id] ?? "") !== "").length;
    const msg = used > 0 ? `Xoá thuộc tính "${f.name}"? Giá trị đã nhập ở ${used} dòng cũng bị xoá (Ctrl+Z khôi phục được).` : `Xoá thuộc tính "${f.name}"?`;
    if (!(await showConfirm(msg, "Xoá"))) return;
    store.dispatch(new RemoveTagFieldCommand(tag.id, f.id));
  }
  function renameField(f: TagField, name: string): void {
    const n = name.trim();
    if (tag && n && n !== f.name) store.dispatch(new UpdateTagFieldCommand(tag.id, f.id, { name: n }));
  }
  function setOptions(f: TagField, options: NonNullable<TagField["options"]>): void {
    if (tag) store.dispatch(new UpdateTagFieldCommand(tag.id, f.id, { options }));
  }
  function addOption(f: TagField): void {
    const opts = f.options ?? [];
    if (opts.length >= MAX_OPTIONS_PER_FIELD) return;
    setOptions(f, [...opts, { id: generateOptionId(), label: `Lựa chọn ${opts.length + 1}`, color: OPTION_COLORS[opts.length % OPTION_COLORS.length]! }]);
  }
  function patchOption(f: TagField, id: string, p: { label?: string; color?: string }): void {
    setOptions(f, (f.options ?? []).map((o) => (o.id === id ? { ...o, ...p, label: (p.label ?? o.label).trim() || o.label } : o)));
  }
  function removeOption(f: TagField, id: string): void {
    setOptions(f, (f.options ?? []).filter((o) => o.id !== id));
  }

  // ---------------------------------------------------------- Xuất
  const fileBase = (): string => (tag?.name ?? "tag").replace(/[\\/:*?"<>|]+/g, "_").trim() || "tag";
  function exportCsv(): void {
    downloadText("﻿" + toDelimited(rowsToGrid(rows, fields), ","), `${fileBase()}.csv`, "text/csv;charset=utf-8");
  }
  async function exportXlsx(): Promise<void> {
    const { gridToXlsxBlob } = await import("../../io/xlsx");
    downloadBlob(gridToXlsxBlob(rowsToTypedGrid(rows, fields), fileBase()), `${fileBase()}.xlsx`);
  }
  function saveChartSvg(): void {
    if (chartSvg) downloadText(chartSvg, `${fileBase()}-bieu-do.svg`, "image/svg+xml;charset=utf-8");
  }
  async function saveChartPng(): Promise<void> {
    const png = chartSvg ? await svgToPng(chartSvg, 560, 300) : null;
    if (png) downloadBlob(png, `${fileBase()}-bieu-do.png`);
  }

  // ---------------------------------------------------------- Bàn phím
  function onKeydown(e: KeyboardEvent): void {
    e.stopPropagation();
    const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select") !== null;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) store.redo();
      else store.undo();
    } else if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "y") {
      e.preventDefault();
      store.redo();
    }
  }
  function onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) close();
  }
  onDestroy(() => (dragId = null));

  const opText = (op: FilterOp): string => FILTER_OP_LABEL[op];
  const needsValue = (op: FilterOp): boolean => op !== "empty" && op !== "notEmpty";
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-overlay open" role="presentation" on:click={onOverlayClick} on:keydown={onKeydown}>
    <div class="modal tdb" role="dialog" aria-modal="true" aria-label="Cơ sở dữ liệu Tag">
      <div class="tdb-head">
        <h2>Cơ sở dữ liệu Tag</h2>
        <select aria-label="Chọn Tag" value={tagId ?? ""} on:change={(e) => { tagId = e.currentTarget.value || null; resetForTag(); }}>
          {#each tags as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
        </select>
        <span class="tdb-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={view === "table"} class:on={view === "table"} on:click={() => (view = "table")}>Bảng</button>
          <button type="button" role="tab" aria-selected={view === "kanban"} class:on={view === "kanban"} on:click={() => (view = "kanban")}>Kanban</button>
          <button type="button" role="tab" aria-selected={view === "chart"} class:on={view === "chart"} on:click={() => (view = "chart")}>Biểu đồ</button>
        </span>
        <span class="tdb-grow"></span>
        <button type="button" class="btn small-btn" title="Hoàn tác" on:click={() => store.undo()}>↶</button>
        <button type="button" class="btn small-btn" title="Làm lại" on:click={() => store.redo()}>↷</button>
        <button type="button" class="btn small-btn" class:active={manage} on:click={() => (manage = !manage)}>Thuộc tính…</button>
        <button type="button" class="btn small-btn" on:click={exportCsv} disabled={!tag}>Xuất CSV</button>
        <button type="button" class="btn small-btn" on:click={() => void exportXlsx()} disabled={!tag}>Xuất Excel</button>
        <button type="button" class="btn small-btn" aria-label="Đóng" on:click={close}>✕</button>
      </div>

      {#if tags.length === 0}
        <p class="muted">Map chưa có Tag nào. Gắn Tag cho node (khung bên phải → Tag → “+ Chọn Tag”) rồi quay lại đây để thêm thuộc tính.</p>
      {:else if tag}
        {#if manage}
          <div class="tdb-manage">
            {#each fields as f (f.id)}
              <div class="tdb-field">
                <input type="text" value={f.name} aria-label="Tên thuộc tính" on:change={(e) => renameField(f, e.currentTarget.value)} />
                <span class="muted">{FIELD_TYPE_LABEL[f.type]}</span>
                <label class="tdb-show" title="Hiện giá trị của thuộc tính này thành thẻ nhỏ ngay trên node ở sơ đồ">
                  <input type="checkbox" checked={f.showOnNode === true} on:change={(e) => tag && store.dispatch(new UpdateTagFieldCommand(tag.id, f.id, { showOnNode: e.currentTarget.checked }))} />
                  Hiện trên node</label>
                <button type="button" class="btn danger small-btn" on:click={() => void removeField(f)}>Xoá</button>
                {#if hasOptions(f.type)}
                  <div class="tdb-options">
                    {#each f.options ?? [] as o (o.id)}
                      <span class="tdb-opt">
                        <input type="color" value={o.color} aria-label="Màu lựa chọn" on:change={(e) => patchOption(f, o.id, { color: e.currentTarget.value })} />
                        <input type="text" value={o.label} aria-label="Tên lựa chọn" on:change={(e) => patchOption(f, o.id, { label: e.currentTarget.value })} />
                        <button type="button" class="tdb-x" title="Xoá lựa chọn" on:click={() => removeOption(f, o.id)}>✕</button>
                      </span>
                    {/each}
                    <button type="button" class="btn small-btn" on:click={() => addOption(f)}>+ Lựa chọn</button>
                  </div>
                {/if}
              </div>
            {/each}
            <div class="tdb-field tdb-add">
              <input type="text" placeholder="Tên thuộc tính mới…" value={newFieldName} aria-label="Tên thuộc tính mới"
                on:input={(e) => (newFieldName = e.currentTarget.value)} on:keydown={(e) => { if (e.key === "Enter") addField(); }} />
              <select aria-label="Kiểu thuộc tính" value={newFieldType} on:change={(e) => (newFieldType = e.currentTarget.value as TagFieldType)}>
                {#each Object.entries(FIELD_TYPE_LABEL) as [v, label] (v)}<option value={v}>{label}</option>{/each}
              </select>
              <button type="button" class="btn primary small-btn" on:click={addField} disabled={!newFieldName.trim()}>Thêm thuộc tính</button>
            </div>
          </div>
        {/if}

        {#if fields.length === 0 && !manage}
          <p class="muted">Tag “{tag.name}” chưa có thuộc tính. Bấm <b>Thuộc tính…</b> để thêm cột (chữ, số, ngày, chọn, trạng thái); có {allRows.length} node mang Tag này.</p>
        {/if}

        <!-- Bộ lọc dùng chung cho cả ba chế độ xem -->
        <div class="tdb-filters">
          {#each filters as f, i}
            <span class="tdb-filter">
              <select value={f.key} aria-label="Cột lọc" on:change={(e) => patchFilter(i, { key: e.currentTarget.value })}>
                <option value={NAME_KEY}>Tên node</option>
                {#each fields as fl (fl.id)}<option value={fl.id}>{fl.name}</option>{/each}
              </select>
              <select value={f.op} aria-label="Điều kiện" on:change={(e) => patchFilter(i, { op: e.currentTarget.value as FilterOp })}>
                {#each opsFor(fieldType(f.key)) as op}<option value={op}>{opText(op)}</option>{/each}
              </select>
              {#if needsValue(f.op)}
                {@const ft = f.key === NAME_KEY ? undefined : fields.find((x) => x.id === f.key)}
                {#if ft && hasOptions(ft.type)}
                  <select value={f.value} aria-label="Giá trị lọc" on:change={(e) => patchFilter(i, { value: e.currentTarget.value })}>
                    <option value="">—</option>
                    {#each ft.options ?? [] as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
                  </select>
                {:else}
                  <input type={ft?.type === "date" ? "date" : "text"} value={f.value} aria-label="Giá trị lọc" on:input={(e) => patchFilter(i, { value: e.currentTarget.value })} />
                {/if}
              {/if}
              <button type="button" class="tdb-x" title="Bỏ bộ lọc" on:click={() => (filters = filters.filter((_, j) => j !== i))}>✕</button>
            </span>
          {/each}
          <button type="button" class="btn small-btn" on:click={addFilter}>+ Lọc</button>
          {#if view === "table"}
            <label class="tdb-group">Nhóm theo
              <select value={groupKey} on:change={(e) => (groupKey = e.currentTarget.value)}>
                <option value="">(không)</option>
                {#each fields as fl (fl.id)}<option value={fl.id}>{fl.name}</option>{/each}
              </select>
            </label>
          {/if}
          <span class="muted tdb-count">{rows.length}/{allRows.length} dòng</span>
        </div>

        {#if view === "table"}
          {#if visibleSelected.length > 0 && bulkField}
            <div class="tdb-bulk">
              <b>{visibleSelected.length}</b> dòng đã chọn — đặt
              <select value={bulkField.id} aria-label="Thuộc tính cần đặt" on:change={(e) => { bulkFieldId = e.currentTarget.value; bulkValue = ""; }}>
                {#each fields as fl (fl.id)}<option value={fl.id}>{fl.name}</option>{/each}
              </select>
              =
              {#if hasOptions(bulkField.type)}
                <select value={bulkValue} aria-label="Giá trị" on:change={(e) => (bulkValue = e.currentTarget.value)}>
                  <option value="">(xoá giá trị)</option>
                  {#each bulkField.options ?? [] as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
                </select>
              {:else}
                <input type={bulkField.type === "date" ? "date" : "text"} value={bulkValue} aria-label="Giá trị" on:input={(e) => (bulkValue = e.currentTarget.value)} />
              {/if}
              <button type="button" class="btn primary small-btn" on:click={applyBulk}>Áp dụng</button>
              <button type="button" class="btn small-btn" on:click={() => (selected = new Set())}>Bỏ chọn</button>
            </div>
          {/if}
          <div class="tdb-scroll">
            <table class="tdb-table">
              <thead>
                <tr>
                  <th class="tdb-chk"><input type="checkbox" aria-label="Chọn tất cả" checked={rows.length > 0 && visibleSelected.length === rows.length}
                    on:change={(e) => toggleAll(e.currentTarget.checked)} /></th>
                  <th><button type="button" class="tdb-sort" on:click={() => toggleSort(NAME_KEY)}>Tên node{sortMark(NAME_KEY)}</button></th>
                  {#each fields as f (f.id)}
                    <th><button type="button" class="tdb-sort" on:click={() => toggleSort(f.id)}>{f.name}{sortMark(f.id)}</button></th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each groups ?? [{ key: "", label: "", color: "", rows }] as g (g.key + g.label)}
                  {#if groups}
                    <tr class="tdb-grouprow"><td colspan={fields.length + 2}><span class="tdb-dot" style="background:{g.color}"></span>{groupField?.name}: <b>{g.label}</b> <span class="muted">({g.rows.length})</span></td></tr>
                  {/if}
                  {#each g.rows as r (r.nodeId)}
                    <tr>
                      <td class="tdb-chk"><input type="checkbox" aria-label="Chọn dòng" checked={selected.has(r.nodeId)} on:change={(e) => toggleRow(r.nodeId, e.currentTarget.checked)} /></td>
                      <td><button type="button" class="tdb-name" title="Chọn node trên sơ đồ" on:click={() => goTo(r.nodeId)}>{r.name || "(trống)"}</button></td>
                      {#each fields as f (f.id)}
                        <td>
                          {#if hasOptions(f.type)}
                            {@const cur = f.options?.find((o) => o.id === r.values[f.id])}
                            <select value={cur?.id ?? ""} aria-label={f.name} class="tdb-sel" style={cur ? `background:${cur.color}22;border-color:${cur.color}` : ""}
                              on:change={(e) => onCellChange(e, r, f)}>
                              <option value="">—</option>
                              {#each f.options ?? [] as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
                            </select>
                          {:else if f.type === "date"}
                            <input type="date" value={r.values[f.id] ?? ""} aria-label={f.name} on:change={(e) => onCellChange(e, r, f)} />
                          {:else}
                            <input type="text" class:tdb-num={f.type === "number"} value={r.values[f.id] ?? ""} aria-label={f.name}
                              inputmode={f.type === "number" ? "decimal" : "text"} on:change={(e) => onCellChange(e, r, f)} />
                          {/if}
                        </td>
                      {/each}
                    </tr>
                  {/each}
                {/each}
                {#if rows.length === 0}
                  <tr><td colspan={fields.length + 2} class="muted tdb-empty">{allRows.length === 0 ? "Chưa có node nào mang Tag này." : "Không dòng nào khớp bộ lọc."}</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        {:else if view === "kanban"}
          {#if !kanbanField}
            <p class="muted">Kanban cần một thuộc tính kiểu <b>Trạng thái</b> hoặc <b>Chọn một</b>. Bấm <b>Thuộc tính…</b> để thêm.</p>
          {:else}
            <div class="tdb-filters">
              <label class="tdb-group">Cột theo
                <select value={kanbanField.id} on:change={(e) => (kanbanFieldId = e.currentTarget.value)}>
                  {#each choiceFields as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
                </select>
              </label>
              <span class="muted">Kéo thẻ sang cột khác để đổi giá trị, kéo lên/xuống để đổi thứ tự (Ctrl+Z hoàn tác).</span>
            </div>
            <div class="tdb-kanban">
              {#each columns as g (g.key)}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="tdb-col" class:over={overKey === g.key} data-col={g.key}
                  on:dragover|preventDefault={() => (overKey = g.key)} on:dragleave={() => { if (overKey === g.key) overKey = null; }}
                  on:drop|preventDefault={() => dropCard(g, null)}>
                  <div class="tdb-colhead"><span class="tdb-dot" style="background:{g.color}"></span>{g.label} <span class="muted">{g.rows.length}</span></div>
                  {#each g.rows as r (r.nodeId)}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="tdb-card" draggable="true" data-node={r.nodeId} class:dragging={dragId === r.nodeId} class:drop-before={overCard === r.nodeId && dragId !== r.nodeId}
                      on:dragstart={(e) => { dragId = r.nodeId; e.dataTransfer?.setData("text/plain", r.nodeId); }} on:dragend={() => { dragId = null; overKey = null; overCard = null; }}
                      on:dragover|preventDefault|stopPropagation={() => { overKey = g.key; overCard = r.nodeId; }}
                      on:drop|preventDefault|stopPropagation={() => dropCard(g, r.nodeId)}>
                      <button type="button" class="tdb-name" on:click={() => goTo(r.nodeId)}>{r.name || "(trống)"}</button>
                      {#each fields.filter((f) => f.id !== kanbanField?.id && (r.values[f.id] ?? "") !== "").slice(0, 3) as f (f.id)}
                        <div class="tdb-meta"><span>{f.name}:</span> {displayValue(f, r.values[f.id])}</div>
                      {/each}
                    </div>
                  {/each}
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          {#if !chartField}
            <p class="muted">Biểu đồ cần một thuộc tính kiểu <b>Trạng thái</b> hoặc <b>Chọn một</b> để gộp theo. Bấm <b>Thuộc tính…</b> để thêm.</p>
          {:else}
            <div class="tdb-filters">
              <label class="tdb-group">Gộp theo
                <select value={chartField.id} on:change={(e) => (chartFieldId = e.currentTarget.value)}>
                  {#each choiceFields as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
                </select>
              </label>
              <label class="tdb-group">Đo
                <select value={chartMeasure} on:change={(e) => (chartMeasure = e.currentTarget.value)}>
                  <option value="count">Số dòng</option>
                  {#each numberFields as f (f.id)}
                    <option value={`sum:${f.id}`}>Tổng {f.name}</option>
                    <option value={`avg:${f.id}`}>Trung bình {f.name}</option>
                  {/each}
                </select>
              </label>
              <label class="tdb-group">Loại
                <select value={chartKind} on:change={(e) => (chartKind = e.currentTarget.value as ChartKind)}>
                  <option value="bar">Cột</option><option value="line">Đường</option><option value="pie">Tròn</option>
                </select>
              </label>
              <button type="button" class="btn small-btn" on:click={saveChartSvg}>Tải SVG</button>
              <button type="button" class="btn small-btn" on:click={() => void saveChartPng()}>Tải PNG</button>
            </div>
            <div class="tdb-chart" aria-label="Biểu đồ">{@html chartSvg}</div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
{/if}

<style>
  .tdb { max-width: min(1180px, 96vw); width: 96vw; height: 86vh; max-height: 86vh; display: flex; flex-direction: column; gap: 10px; padding: 16px 20px; }
  .tdb-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .tdb-head h2 { margin: 0 8px 0 0; font-size: 17px; }
  .tdb-grow { flex: 1; }
  .tdb-tabs { display: inline-flex; border: 1px solid #d8dce2; border-radius: 8px; overflow: hidden; }
  .tdb-tabs button { border: none; background: #fff; padding: 5px 12px; cursor: pointer; font-size: 13px; color: #374151; }
  .tdb-tabs button.on { background: #2f6fed; color: #fff; }
  .tdb select, .tdb input[type="text"], .tdb input[type="date"] {
    border: 1px solid #d8dce2; border-radius: 6px; padding: 4px 8px; font: inherit; font-size: 13px; background: #fff; color: #1f2933; min-width: 0;
  }
  .tdb-manage { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; background: #fafbfc; display: flex; flex-direction: column; gap: 8px; max-height: 32vh; overflow: auto; }
  .tdb-show { display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: #4b5563; }
  .tdb-field { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .tdb-options { flex-basis: 100%; display: flex; gap: 6px; flex-wrap: wrap; padding-left: 8px; }
  .tdb-opt { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 2px 4px; background: #fff; }
  .tdb-opt input[type="color"] { width: 22px; height: 22px; padding: 0; border: none; background: none; }
  .tdb-opt input[type="text"] { border: none; width: 110px; padding: 2px 4px; }
  .tdb-x { border: none; background: transparent; color: #9aa1ab; cursor: pointer; font-size: 12px; }
  .tdb-x:hover { color: #c0392b; }
  .tdb-filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
  .tdb-filter { display: inline-flex; align-items: center; gap: 4px; background: #f3f6fb; border-radius: 8px; padding: 3px 6px; }
  .tdb-group { display: inline-flex; align-items: center; gap: 6px; color: #4b5563; }
  .tdb-count { margin-left: auto; }
  .tdb-bulk { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: #eef3fe; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
  .tdb-scroll { flex: 1; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; min-height: 120px; }
  .tdb-table { border-collapse: collapse; width: 100%; font-size: 13px; }
  .tdb-table th { position: sticky; top: 0; background: #f3f6fb; text-align: left; padding: 0; border-bottom: 1px solid #e5e7eb; z-index: 1; }
  .tdb-table td { border-bottom: 1px solid #f0f1f3; padding: 3px 6px; }
  .tdb-chk { width: 30px; text-align: center; padding: 0 4px !important; }
  .tdb-sort { width: 100%; border: none; background: transparent; text-align: left; padding: 7px 8px; font: inherit; font-weight: 600; cursor: pointer; color: #374151; }
  .tdb-name { border: none; background: none; padding: 2px 0; cursor: pointer; font: inherit; color: #1f4fbf; text-align: left; }
  .tdb-name:hover { text-decoration: underline; }
  .tdb-table input[type="text"], .tdb-table input[type="date"], .tdb-sel { width: 100%; box-sizing: border-box; }
  .tdb-num { text-align: right; }
  .tdb-sel { border-width: 1.5px; }
  .tdb-grouprow td { background: #f8f9fb; padding: 5px 8px; }
  .tdb-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
  .tdb-empty { text-align: center; padding: 18px !important; }
  .tdb-kanban { flex: 1; display: flex; gap: 10px; overflow: auto; align-items: flex-start; padding-bottom: 6px; }
  .tdb-col { flex: 0 0 240px; background: #f4f6f9; border-radius: 10px; padding: 8px; min-height: 140px; border: 2px dashed transparent; display: flex; flex-direction: column; gap: 6px; }
  .tdb-col.over { border-color: #2f6fed; background: #eef3fe; }
  .tdb-colhead { font-weight: 600; font-size: 13px; color: #374151; padding: 2px 4px; }
  .tdb-card { background: #fff; border-radius: 8px; padding: 8px 10px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); cursor: grab; font-size: 13px; }
  .tdb-card.dragging { opacity: 0.45; }
  .tdb-card.drop-before { box-shadow: 0 -3px 0 0 #2f6fed, 0 1px 3px rgba(0, 0, 0, 0.12); }
  .tdb-meta { font-size: 12px; color: #4b5563; margin-top: 3px; }
  .tdb-meta span { color: #9aa1ab; }
  .tdb-chart { flex: 1; overflow: auto; display: flex; justify-content: center; align-items: flex-start; line-height: 0; }
  .tdb-chart :global(svg) { max-width: 100%; height: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
</style>
