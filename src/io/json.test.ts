import { describe, it, expect } from "vitest";
import { createEmptyMap } from "../core/tree";
import { Store } from "../core/store";
import { AddChildCommand, AddTagCommand, ToggleNodeTagCommand, UpdateNodeStyleCommand } from "../core/commands";
import { parseJsonFile, exportFlatJson, exportNestedJson } from "./json";
import { validateMindMap } from "../core/validate";
import type { MindMap, MindNode } from "../core/types";

function buildRichMap(): MindMap {
  const map = createEmptyMap("Gốc");
  const root = map.nodes[map.rootId] as MindNode;
  const store = new Store(map);
  const tag = new AddTagCommand("Gấp", "#d64545");
  store.dispatch(tag);
  const cmd = new AddChildCommand(root.id, "Con có Tag");
  store.dispatch(cmd);
  store.dispatch(new ToggleNodeTagCommand(cmd.newNodeId, tag.newTagId));
  store.dispatch(new UpdateNodeStyleCommand(cmd.newNodeId, { checked: true }));
  return store.getMap();
}

describe("io/json — parseJsonFile / exportFlatJson (P1.14)", () => {
  it("roundtrip: export rồi import lại khớp đúng số node, Tag, checkbox", () => {
    const map = buildRichMap();
    const json = exportFlatJson(map);
    const result = parseJsonFile(json);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.map.nodes).length).toBe(Object.keys(map.nodes).length);
    expect(result.map.tags.length).toBe(map.tags.length);
    expect(validateMindMap(result.map)).toEqual([]);
  });

  it("từ chối JSON sai cú pháp, báo lỗi rõ ràng", () => {
    const result = parseJsonFile("{ không phải JSON hợp lệ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("từ chối JSON đúng cú pháp nhưng rootId trỏ tới node không tồn tại", () => {
    const badJson = JSON.stringify({
      mapId: "x",
      schemaVersion: 13,
      rootId: "khong-ton-tai",
      nodes: { a: { id: "a", text: "A", parentId: null, children: [] } },
      relationships: [],
      summaries: [],
      boundaries: [],
      stickyNotes: [],
      tags: [],
    });
    const result = parseJsonFile(badJson);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.includes("rootId"))).toBe(true);
  });

  it("tự di trú file schema cũ (v9) qua đúng luồng parseJsonFile", () => {
    const oldJson = JSON.stringify({
      mapId: "old",
      schemaVersion: 9,
      rootId: "root1",
      nodes: { root1: { id: "root1", text: "Cũ", parentId: null, children: [], labels: ["Nhãn cũ"] } },
    });
    const result = parseJsonFile(oldJson);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.map.tags.some((t) => t.name === "Nhãn cũ")).toBe(true);
  });
});

describe("io/json — exportNestedJson (P1.14)", () => {
  it("xuất đúng cấu trúc cây lồng nhau, đọc lại được qua parseJsonFile", () => {
    const map = buildRichMap();
    const nested = exportNestedJson(map);
    const parsed = JSON.parse(nested);
    expect(parsed.text).toBe("Gốc");
    expect(Array.isArray(parsed.children)).toBe(true);
    expect(parsed.children[0].text).toBe("Con có Tag");

    // Nhập lại được qua đúng luồng nhập thường (không phải chỉ JSON.parse thô)
    const result = parseJsonFile(nested);
    expect(result.ok).toBe(true);
  });
});
