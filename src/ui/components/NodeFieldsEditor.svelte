<script lang="ts">
  /**
   * ui/components/NodeFieldsEditor.svelte
   * -------------------------------------------------------------------
   * KW5 — sửa GIÁ TRỊ thuộc tính (của các Tag node đang mang) ngay trong
   * khung bên phải. Mỗi lần sửa là một SetFieldValueCommand. Cũng có
   * nút mở Cơ sở dữ liệu Tag (bảng/Kanban/biểu đồ) cho từng Tag.
   * -------------------------------------------------------------------
   */
  import type { Store } from "../../core/store";
  import type { MindMap, MindNode, TagField } from "../../core/types";
  import { SetFieldValueCommand } from "../../core/tagDbCommands";
  import { fieldsForNode, hasOptions, normalizeFieldValue } from "../../core/tagDb";
  import { tagDbStore, showNotice } from "../uiStores";

  export let store: Store;
  export let map: MindMap;
  export let node: MindNode;

  $: groups = node.tagIds
    .map((id) => map.tags.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((tag) => ({ tag, fields: fieldsForNode(map, [tag.id]).map((x) => x.field) }));

  function commit(e: Event, f: TagField): void {
    const el = e.currentTarget as HTMLInputElement | HTMLSelectElement;
    const norm = normalizeFieldValue(f, el.value);
    if (norm === null) {
      showNotice(f.type === "number" ? `"${f.name}" cần là một số.` : f.type === "date" ? `"${f.name}" cần là ngày hợp lệ.` : `Giá trị không hợp lệ cho "${f.name}".`);
      el.value = node.fieldValues?.[f.id] ?? "";
      return;
    }
    if ((node.fieldValues?.[f.id] ?? "") === norm) return;
    store.dispatch(new SetFieldValueCommand([node.id], f.id, norm));
  }
</script>

{#if groups.length > 0}
  <div class="nfe" data-testid="node-fields">
    {#each groups as g (g.tag.id)}
      <div class="nfe-tag">
        <span class="nfe-name" style="color:{g.tag.color}">{g.tag.name}</span>
        <button type="button" class="btn small-btn" title="Mở bảng / Kanban / biểu đồ của Tag này" on:click={() => tagDbStore.set({ tagId: g.tag.id })}>Mở bảng</button>
      </div>
      {#each g.fields as f (f.id)}
        <div class="row nfe-row">
          <label for="nfe-{f.id}">{f.name}</label>
          {#if hasOptions(f.type)}
            <select id="nfe-{f.id}" value={node.fieldValues?.[f.id] ?? ""} on:change={(e) => commit(e, f)}>
              <option value="">—</option>
              {#each f.options ?? [] as o (o.id)}<option value={o.id}>{o.label}</option>{/each}
            </select>
          {:else if f.type === "date"}
            <input id="nfe-{f.id}" type="date" value={node.fieldValues?.[f.id] ?? ""} on:change={(e) => commit(e, f)} />
          {:else}
            <input id="nfe-{f.id}" type="text" inputmode={f.type === "number" ? "decimal" : "text"} value={node.fieldValues?.[f.id] ?? ""} on:change={(e) => commit(e, f)} />
          {/if}
        </div>
      {/each}
    {/each}
  </div>
{/if}

<style>
  .nfe { margin: 6px 0 4px; display: flex; flex-direction: column; gap: 4px; }
  .nfe-tag { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; margin-top: 4px; }
  .nfe-row { margin: 0; }
</style>
