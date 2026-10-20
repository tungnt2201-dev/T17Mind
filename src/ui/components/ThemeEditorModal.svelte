<script lang="ts">
  /**
   * ui/components/ThemeEditorModal.svelte
   * -------------------------------------------------------------------
   * Theme riêng: tạo từ một theme có sẵn, sửa màu (theo cấp hoặc theo
   * nhánh), xem trước, lưu vào Workspace (ui/userLibrary.ts), áp dụng
   * cho map (ApplyThemeCommand — hoàn tác được, theme được nhúng vào map),
   * xuất / nhập file .t17theme để chia sẻ. Theme có sẵn giữ nguyên.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { AppController } from "../appController";
  import { mapStore } from "../svelteBridge";
  import { themeEditorStore } from "../uiStores";
  import {
    THEMES,
    cloneThemeAsCustom,
    colorForDepth,
    colorForBranchDepth,
    branchHue,
    themeRootStyle,
    pickTextColor,
    findTheme,
    type Theme,
  } from "../../core/theme";
  import {
    customThemesStore,
    saveCustomTheme,
    deleteCustomTheme,
    newCustomThemeId,
    parseThemeFile,
    themeFileContent,
  } from "../userLibrary";
  import { showAlert, showConfirm } from "../dialog";
  import { downloadText } from "../dom";
  import { isDesktopApp, nativeWriteFile } from "../../io/nativeFs";

  export let store: Store;
  export let controller: AppController;

  const map = mapStore(store);

  let draft: Theme | null = null;
  let baseId = THEMES[0]!.id;
  let autoText = true;
  let fileInput: HTMLInputElement | undefined;
  let dirty = false;

  $: req = $themeEditorStore;
  $: if (req && !draft) start(req.baseThemeId);
  $: if (!req) draft = null;
  $: isSaved = !!draft && $customThemesStore.some((t) => t.id === draft!.id);
  $: allBases = [...THEMES, ...$customThemesStore];

  function start(fromId: string | null): void {
    const existing = fromId ? $customThemesStore.find((t) => t.id === fromId) : null;
    if (existing) {
      edit(existing);
      return;
    }
    const base = findTheme(fromId, $map) ?? THEMES[0]!;
    baseId = base.id;
    draft = cloneThemeAsCustom(base, newCustomThemeId(), `${base.name} (của tôi)`);
    autoText = true;
    dirty = true;
  }
  function edit(t: Theme): void {
    draft = structuredClone(t);
    autoText = draft.levels.every((l) => l.color === pickTextColor(l.fill));
    dirty = false;
  }
  function newFromBase(): void {
    const base = allBases.find((t) => t.id === baseId) ?? THEMES[0]!;
    draft = cloneThemeAsCustom(base, newCustomThemeId(), `${base.name} (của tôi)`);
    autoText = true;
    dirty = true;
  }
  function close(): void {
    themeEditorStore.set(null);
  }
  function touch(): void {
    draft = draft;
    dirty = true;
  }
  function setLevelFill(i: number, v: string): void {
    if (!draft) return;
    const l = draft.levels[i]!;
    l.fill = v;
    if (autoText) l.color = pickTextColor(v);
    touch();
  }
  function setLevelText(i: number, v: string): void {
    if (!draft) return;
    draft.levels[i]!.color = v;
    touch();
  }
  function setAutoText(on: boolean): void {
    autoText = on;
    if (on && draft) for (const l of draft.levels) l.color = pickTextColor(l.fill);
    touch();
  }
  function setMode(perBranch: boolean): void {
    if (!draft) return;
    if (perBranch) {
      draft.perBranch = true;
      if (!draft.palette || draft.palette.length === 0) draft.palette = Array.from({ length: 6 }, (_, i) => branchHue({ id: "", name: "", levels: [] }, i));
      if (!draft.rootStyle) draft.rootStyle = { ...themeRootStyle(draft) };
    } else {
      delete draft.perBranch;
      if (draft.levels.length === 0) draft.levels = THEMES[0]!.levels.map((l) => ({ ...l }));
    }
    touch();
  }
  function setPalette(i: number, v: string): void {
    if (!draft?.palette) return;
    draft.palette[i] = v;
    touch();
  }
  function addPalette(): void {
    if (!draft) return;
    draft.palette = [...(draft.palette ?? []), "#64748b"];
    touch();
  }
  function removePalette(i: number): void {
    if (!draft?.palette || draft.palette.length <= 1) return;
    draft.palette = draft.palette.filter((_, j) => j !== i);
    touch();
  }
  function setRoot(v: string): void {
    if (!draft) return;
    draft.rootStyle = { fill: v, color: pickTextColor(v) };
    touch();
  }

  async function save(): Promise<Theme | null> {
    if (!draft) return null;
    if (!draft.name.trim()) {
      void showAlert("Đặt tên cho theme trước khi lưu.");
      return null;
    }
    try {
      const saved = await saveCustomTheme(draft);
      draft = structuredClone(saved);
      dirty = false;
      return saved;
    } catch (err) {
      void showAlert(`Không lưu được theme: ${(err as Error)?.message ?? err}`);
      return null;
    }
  }
  async function saveAndApply(): Promise<void> {
    const saved = await save();
    if (saved) controller.applyTheme(saved.id, saved);
  }
  async function remove(): Promise<void> {
    if (!draft || !isSaved) return;
    if (!(await showConfirm(`Xoá theme "${draft.name}"? Map đang dùng theme này vẫn giữ màu (theme đã được lưu kèm trong map).`, "Xoá", "Huỷ"))) return;
    await deleteCustomTheme(draft.id);
    draft = null;
    start(null);
  }
  async function exportFile(): Promise<void> {
    if (!draft) return;
    const name = `${draft.name.replace(/[\\/:*?"<>|]+/g, " ").trim() || "theme"}.t17theme`;
    const text = themeFileContent(draft);
    if (isDesktopApp()) {
      const n = (globalThis as unknown as { Neutralino?: { os: { showSaveDialog(t: string, o: unknown): Promise<string> } } }).Neutralino;
      const path = await n?.os.showSaveDialog("Xuất theme", { defaultPath: name, filters: [{ name: "Theme T17Mind", extensions: ["t17theme"] }] });
      if (path) await nativeWriteFile(path.endsWith(".t17theme") ? path : `${path}.t17theme`, text);
    } else {
      downloadText(text, name, "application/json");
    }
  }
  async function importFile(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const t = parseThemeFile(await file.text());
    if (!t) {
      void showAlert("File này không phải theme T17Mind hợp lệ.");
      return;
    }
    draft = t;
    autoText = t.levels.every((l) => l.color === pickTextColor(l.fill));
    dirty = true;
  }

  // Xem trước: theo cấp → 6 cấp; theo nhánh → gốc + 3 nhánh × 3 cấp.
  $: previewLevels = draft && !draft.perBranch ? [0, 1, 2, 3, 4, 5].map((d) => colorForDepth(draft!, d)) : [];
  $: previewBranches = draft?.perBranch
    ? [0, 1, 2].map((i) => [0, 1, 2].map((d) => colorForBranchDepth(branchHue(draft!, i), d)))
    : [];
  $: previewRoot = draft?.perBranch ? themeRootStyle(draft) : null;
  const LEVEL_NAMES = ["Gốc", "Cấp 1", "Cấp 2", "Cấp 3"];
</script>

{#if req && draft}
  <div class="modal-overlay open" role="presentation" on:click={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="modal te" role="dialog" aria-label="Theme riêng">
      <h2>Theme riêng</h2>

      <div class="te-top">
        <div class="te-list">
          <div class="te-head">Theme của bạn</div>
          {#if $customThemesStore.length === 0}
            <p class="muted">Chưa có — tạo từ một theme có sẵn bên dưới.</p>
          {/if}
          {#each $customThemesStore as t (t.id)}
            <button type="button" class="te-item" class:on={draft.id === t.id} on:click={() => edit(t)}>
              <span class="te-sw">
                {#each (t.perBranch ? (t.palette ?? []).slice(0, 4) : t.levels.map((l) => l.fill)) as c}<i style="background:{c}"></i>{/each}
              </span>{t.name}
            </button>
          {/each}
          <div class="te-new">
            <select bind:value={baseId} aria-label="Theme gốc">
              {#each allBases as t (t.id)}<option value={t.id}>{t.name}</option>{/each}
            </select>
            <button type="button" class="btn small-btn" on:click={newFromBase}>+ Tạo mới</button>
          </div>
          <button type="button" class="btn small-btn" on:click={() => fileInput?.click()}>Nhập file .t17theme…</button>
          <input bind:this={fileInput} type="file" accept=".t17theme,.json,application/json" hidden on:change={importFile} />
        </div>

        <div class="te-edit">
          <label class="te-row">Tên
            <input type="text" value={draft.name} on:input={(e) => { if (draft) { draft.name = e.currentTarget.value; touch(); } }} />
          </label>
          <div class="te-row">
            <label><input type="radio" name="te-mode" checked={!draft.perBranch} on:change={() => setMode(false)} /> Màu theo cấp</label>
            <label><input type="radio" name="te-mode" checked={!!draft.perBranch} on:change={() => setMode(true)} /> Mỗi nhánh một màu</label>
          </div>

          {#if !draft.perBranch}
            <div class="te-levels">
              {#each draft.levels as l, i}
                <div class="te-level">
                  <span>{LEVEL_NAMES[i] ?? `Cấp ${i}`}</span>
                  <input type="color" value={l.fill} title="Màu nền" on:input={(e) => setLevelFill(i, e.currentTarget.value)} />
                  {#if !autoText}
                    <input type="color" value={l.color} title="Màu chữ" on:input={(e) => setLevelText(i, e.currentTarget.value)} />
                  {/if}
                </div>
              {/each}
            </div>
            <label class="te-row small"><input type="checkbox" checked={autoText} on:change={(e) => setAutoText(e.currentTarget.checked)} /> Màu chữ tự chọn (đen/trắng) theo nền</label>
            <label class="te-row small"><input type="checkbox" checked={!!draft.hueDrift} on:change={(e) => { if (draft) { draft.hueDrift = e.currentTarget.checked || undefined; touch(); } }} /> Đổi sắc nhẹ ở các cấp sâu</label>
          {:else}
            <div class="te-level">
              <span>Gốc</span>
              <input type="color" value={themeRootStyle(draft).fill} on:input={(e) => setRoot(e.currentTarget.value)} />
            </div>
            <div class="te-head">Màu các nhánh (lặp lại khi nhiều nhánh hơn)</div>
            <div class="te-palette">
              {#each draft.palette ?? [] as c, i}
                <span class="te-pal">
                  <input type="color" value={c} on:input={(e) => setPalette(i, e.currentTarget.value)} />
                  <button type="button" class="te-x" title="Bỏ màu này" disabled={(draft.palette ?? []).length <= 1} on:click={() => removePalette(i)}>×</button>
                </span>
              {/each}
              <button type="button" class="btn small-btn" disabled={(draft.palette ?? []).length >= 16} on:click={addPalette}>+ Màu</button>
            </div>
          {/if}

          <div class="te-head">Xem trước</div>
          <div class="te-preview">
            {#if previewRoot}
              <span class="te-node root" style="background:{previewRoot.fill};color:{previewRoot.color}">Gốc</span>
              <div class="te-branches">
                {#each previewBranches as br, i}
                  <div class="te-branch">
                    {#each br as st, d}<span class="te-node" style="background:{st.fill};color:{st.color}">{d === 0 ? `Nhánh ${i + 1}` : `Cấp ${d + 1}`}</span>{/each}
                  </div>
                {/each}
              </div>
            {:else}
              {#each previewLevels as st, d}
                <span class="te-node" style="background:{st.fill};color:{st.color};margin-left:{d * 14}px">{d === 0 ? "Gốc" : `Cấp ${d}`}</span>
              {/each}
            {/if}
          </div>
        </div>
      </div>

      <div class="close-row te-actions">
        {#if isSaved}<button type="button" class="btn danger" on:click={remove}>Xoá</button>{/if}
        <button type="button" class="btn" on:click={exportFile}>Xuất file…</button>
        <span class="te-spacer"></span>
        <button type="button" class="btn" on:click={close}>Đóng</button>
        <button type="button" class="btn" disabled={!dirty && isSaved} on:click={save}>Lưu</button>
        <button type="button" class="btn primary" on:click={saveAndApply}>Lưu & áp dụng cho map</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .te { width: 720px; max-width: calc(100vw - 32px); }
  .te-top { display: flex; gap: 14px; flex-wrap: wrap; }
  .te-list { flex: 0 0 210px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .te-edit { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 8px; }
  .te-head { font-size: 11px; font-weight: 600; color: var(--muted); margin-top: 4px; }
  .te-item { display: flex; gap: 6px; align-items: center; text-align: left; padding: 5px 6px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel, #fff); cursor: pointer; font-size: 12px; }
  .te-item.on { border-color: var(--accent); background: var(--accent-soft); }
  .te-sw { display: inline-flex; }
  .te-sw i { width: 10px; height: 14px; display: inline-block; }
  .te-new { display: flex; gap: 4px; margin-top: 6px; }
  .te-new select { flex: 1; min-width: 0; font-size: 12px; }
  .te-row { display: flex; gap: 10px; align-items: center; font-size: 13px; flex-wrap: wrap; }
  .te-row input[type="text"] { flex: 1; min-width: 120px; }
  .te-row.small { font-size: 12px; color: var(--muted); }
  .te-levels { display: flex; flex-wrap: wrap; gap: 8px; }
  .te-level { display: flex; align-items: center; gap: 4px; font-size: 12px; }
  .te-level span { min-width: 40px; }
  input[type="color"] { width: 34px; height: 26px; padding: 0; border: 1px solid var(--border); border-radius: 4px; background: none; cursor: pointer; }
  .te-palette { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .te-pal { display: inline-flex; align-items: center; }
  .te-x { border: none; background: none; color: var(--muted); cursor: pointer; padding: 0 2px; }
  .te-preview { display: flex; flex-direction: column; gap: 4px; padding: 10px; border: 1px dashed var(--border); border-radius: 8px; background: #fafafa; }
  .te-branches { display: flex; flex-direction: column; gap: 4px; margin-left: 30px; }
  .te-branch { display: flex; gap: 6px; }
  .te-node { display: inline-block; align-self: flex-start; padding: 3px 10px; border-radius: 6px; font-size: 12px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15); }
  .te-node.root { font-weight: 600; }
  .te-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .te-spacer { flex: 1; }
</style>
