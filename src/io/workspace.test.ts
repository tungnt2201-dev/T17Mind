import { describe, it, expect } from "vitest";
import { createEmptyMap, createNode } from "../core/tree";
import { createCard, createTextBlock } from "../core/cards";
import {
  createManifest,
  mapIdFromFileName,
  parseManifest,
  reconcileManifest,
  removeMapEntry,
  serializeManifest,
  sortedMapEntries,
  upsertMapEntry,
  MANIFEST_FILE,
} from "../core/workspace";
import { createMemoryFs, bytesText, textBytes } from "./workspaceFs";
import { WorkspaceRepo } from "./workspaceRepo";
import type { MindMap } from "../core/types";

function sampleMap(title: string): MindMap {
  const map = createEmptyMap(title);
  const n = createNode("Con", map.rootId);
  map.nodes[n.id] = n;
  map.nodes[map.rootId]!.children.push(n.id);
  const card = createCard("Card");
  card.blocks = [createTextBlock("Nội dung")];
  map.cards[card.id] = card;
  n.cardId = card.id;
  map.assets.img = { mimeType: "image/png", dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", width: 1, height: 1 };
  return map;
}

let seq = 0;
const opts = () => ({ newId: () => `ws_${++seq}`, name: "Thử" });

describe("KW0 — danh mục Workspace (thuần)", () => {
  it("tên file ↔ mapId; tạo/cập nhật/xoá mục; sắp xếp mới nhất lên đầu", () => {
    expect(mapIdFromFileName("maps/m_abc-1.t17m")).toBe("m_abc-1");
    expect(mapIdFromFileName("ghi chú.t17m")).toBeNull();
    expect(mapIdFromFileName("m_abc.json")).toBeNull();
    let m = createManifest("w1", "WS", 100);
    m = upsertMapEntry(m, { mapId: "a", title: "A", updatedAt: 5 }, 101);
    m = upsertMapEntry(m, { mapId: "b", title: "B", updatedAt: 9 }, 102);
    m = upsertMapEntry(m, { mapId: "a", title: "A2", updatedAt: 20 }, 103);
    expect(m.maps).toHaveLength(2);
    expect(sortedMapEntries(m).map((e) => e.title)).toEqual(["A2", "B"]);
    expect(m.maps[0]!.file).toBe("maps/a.t17m");
    m = { ...m, lastOpenedMapId: "a" };
    m = removeMapEntry(m, "a", 104);
    expect(m.maps.map((e) => e.mapId)).toEqual(["b"]);
    expect(m.lastOpenedMapId).toBeNull();
  });

  it("parseManifest: đọc lại đúng; bỏ mục hỏng/trùng; từ chối file lạ; báo lỗi bản mới hơn", () => {
    const m = upsertMapEntry(createManifest("w1", "WS", 1), { mapId: "a", title: "A", updatedAt: 2 }, 3);
    expect(parseManifest(serializeManifest(m))).toEqual(m);
    expect(parseManifest("không phải json")).toBeNull();
    expect(parseManifest(JSON.stringify({ format: "khác", workspaceId: "x" }))).toBeNull();
    const messy = JSON.stringify({
      format: "t17mind-workspace",
      workspaceId: "w",
      maps: [{ mapId: "a", title: "A" }, { mapId: "a", title: "trùng" }, { mapId: "../xấu" }, null, { title: "thiếu id" }],
      lastOpenedMapId: "khong-co",
    });
    const p = parseManifest(messy)!;
    expect(p.maps.map((e) => e.title)).toEqual(["A"]);
    expect(p.lastOpenedMapId).toBeNull();
    expect(() => parseManifest(JSON.stringify({ format: "t17mind-workspace", workspaceId: "w", formatVersion: 99 }))).toThrow(/mới hơn/);
  });

  it("reconcile: bỏ mục mất file, báo file lạ cần thêm", () => {
    let m = createManifest("w", "WS", 1);
    m = upsertMapEntry(m, { mapId: "a", title: "A", updatedAt: 1 });
    m = upsertMapEntry(m, { mapId: "gone", title: "G", updatedAt: 1 });
    m = { ...m, lastOpenedMapId: "gone" };
    const r = reconcileManifest(m, ["a.t17m", "new1.t17m", "readme.txt"]);
    expect(r.manifest.maps.map((e) => e.mapId)).toEqual(["a"]);
    expect(r.manifest.lastOpenedMapId).toBeNull();
    expect(r.unknownMapIds).toEqual(["new1"]);
    expect(r.changed).toBe(true);
  });
});

describe("KW0 — WorkspaceRepo trên thư mục (bộ nhớ)", () => {
  it("Workspace mới: tạo workspace.json; ghi rồi đọc lại map nguyên vẹn (card, ảnh, schema mới nhất)", async () => {
    const fs = createMemoryFs();
    const repo = await WorkspaceRepo.open(fs, opts());
    expect(fs.files.has(MANIFEST_FILE)).toBe(true);
    const map = sampleMap("Kế hoạch");
    await repo.writeMap(map, 1234);
    expect(fs.files.has(`maps/${map.mapId}.t17m`)).toBe(true);
    const back = await repo.readMap(map.mapId);
    expect(back).not.toBeNull();
    expect(back!.nodes[map.rootId]!.text).toBe("Kế hoạch");
    expect(Object.values(back!.cards)[0]!.blocks[0]).toMatchObject({ type: "text", text: "Nội dung" });
    expect(back!.assets.img!.dataBase64.length).toBeGreaterThan(10);
    expect(repo.listMaps()).toEqual([{ mapId: map.mapId, file: `maps/${map.mapId}.t17m`, title: "Kế hoạch", updatedAt: 1234 }]);
  });

  it("mở lại Workspace: giữ id, danh mục, map mở gần nhất", async () => {
    const fs = createMemoryFs();
    const r1 = await WorkspaceRepo.open(fs, opts());
    const a = sampleMap("A");
    const b = sampleMap("B");
    await r1.writeMap(a, 10);
    await r1.writeMap(b, 20);
    await r1.setLastOpened(a.mapId);
    const r2 = await WorkspaceRepo.open(fs, opts());
    expect(r2.workspaceId).toBe(r1.workspaceId);
    expect(r2.listMaps().map((e) => e.title)).toEqual(["B", "A"]);
    expect(r2.lastOpenedMapId).toBe(a.mapId);
  });

  it("danh mục hỏng hoặc mất: dựng lại từ các file trong maps/, giữ bản hỏng để cứu", async () => {
    const fs = createMemoryFs();
    const r1 = await WorkspaceRepo.open(fs, opts());
    const a = sampleMap("Map A");
    await r1.writeMap(a);
    fs.files.set(MANIFEST_FILE, textBytes("{hỏng"));
    const r2 = await WorkspaceRepo.open(fs, opts());
    expect(r2.listMaps().map((e) => e.title)).toEqual(["Map A"]);
    expect([...fs.files.keys()].some((k) => k.startsWith("workspace.json.hong-"))).toBe(true);
    fs.files.delete(MANIFEST_FILE);
    const r3 = await WorkspaceRepo.open(fs, opts());
    expect(r3.listMaps().map((e) => e.mapId)).toEqual([a.mapId]);
  });

  it("file .t17m chép tay vào maps/ được nhận; file mất bị bỏ khỏi danh mục; file hỏng bị bỏ qua", async () => {
    const fs = createMemoryFs();
    const r1 = await WorkspaceRepo.open(fs, opts());
    const a = sampleMap("A");
    const b = sampleMap("B");
    await r1.writeMap(a);
    await r1.writeMap(b);
    const bBytes = fs.files.get(`maps/${b.mapId}.t17m`)!;
    fs.files.delete(`maps/${b.mapId}.t17m`);
    fs.files.set("maps/m_copied.t17m", bBytes); // id trong file khác tên file → bỏ qua
    const c = sampleMap("C");
    const tmp = await WorkspaceRepo.open(createMemoryFs(), opts());
    await tmp.writeMap(c);
    fs.files.set(`maps/${c.mapId}.t17m`, (tmp.fs as ReturnType<typeof createMemoryFs>).files.get(`maps/${c.mapId}.t17m`)!);
    fs.files.set("maps/m_broken.t17m", textBytes("không phải zip"));
    const r2 = await WorkspaceRepo.open(fs, opts());
    expect(r2.listMaps().map((e) => e.title).sort()).toEqual(["A", "C"]);
  });

  it("xoá map: chuyển vào .trash/, bỏ khỏi danh mục", async () => {
    const fs = createMemoryFs();
    const repo = await WorkspaceRepo.open(fs, opts());
    const a = sampleMap("A");
    await repo.writeMap(a);
    await repo.deleteMap(a.mapId);
    expect(repo.listMaps()).toEqual([]);
    expect(fs.files.has(`maps/${a.mapId}.t17m`)).toBe(false);
    expect([...fs.files.keys()].some((k) => k.startsWith(`.trash/${a.mapId}-`))).toBe(true);
    expect(await repo.readMap(a.mapId)).toBeNull();
  });

  it("nhiều lần ghi liên tiếp không ghi đè danh mục của nhau", async () => {
    const fs = createMemoryFs();
    const repo = await WorkspaceRepo.open(fs, opts());
    const maps = [sampleMap("1"), sampleMap("2"), sampleMap("3"), sampleMap("4")];
    await Promise.all(maps.map((m, i) => repo.writeMap(m, i + 1)));
    const onDisk = parseManifest(bytesText(fs.files.get(MANIFEST_FILE)!))!;
    expect(onDisk.maps.map((e) => e.title).sort()).toEqual(["1", "2", "3", "4"]);
  });

  it("ghi map lúc đang sửa tiếp: file lưu đúng trạng thái tại thời điểm gọi", async () => {
    const fs = createMemoryFs();
    const repo = await WorkspaceRepo.open(fs, opts());
    const a = sampleMap("Trước");
    const p = repo.writeMap(a);
    a.nodes[a.rootId]!.text = "Sau";
    await p;
    expect((await repo.readMap(a.mapId))!.nodes[a.rootId]!.text).toBe("Trước");
  });
});

describe("Biểu tượng ghim & theme riêng trong Workspace", () => {
  const theme = { id: "theme_a", name: "Ấm áp", levels: [{ fill: "#aa5500", color: "#ffffff" }], custom: true };

  it("hàng ghim lưu trong workspace.json, mở lại vẫn còn; null = mặc định", async () => {
    const fs = createMemoryFs();
    const r1 = await WorkspaceRepo.open(fs, opts());
    expect(r1.pinnedMarkers).toBeNull();
    await r1.setPinnedMarkers(["☕", "💰", "☕", ""]);
    const r2 = await WorkspaceRepo.open(fs, opts());
    expect(r2.pinnedMarkers).toEqual(["☕", "💰"]);
    await r2.setPinnedMarkers(null);
    expect((await WorkspaceRepo.open(fs, opts())).pinnedMarkers).toBeNull();
  });

  it("theme: ghi themes/<id>.json, đọc lại, xoá vào .trash; file hỏng / id lạ bị bỏ qua", async () => {
    const fs = createMemoryFs();
    const repo = await WorkspaceRepo.open(fs, opts());
    await repo.writeTheme(theme);
    expect(fs.files.has("themes/theme_a.json")).toBe(true);
    fs.files.set("themes/hong.json", textBytes("{"));
    fs.files.set("themes/khac.json", textBytes(JSON.stringify({ ...theme, id: "theme_b" })));
    expect((await repo.listThemes()).map((t) => t.id)).toEqual(["theme_a"]);
    await expect(repo.writeTheme({ ...theme, id: "../xau" })).rejects.toThrow();
    await repo.deleteTheme("theme_a");
    expect(await repo.listThemes()).toEqual([]);
    expect([...fs.files.keys()].some((k) => k.startsWith(".trash/theme-theme_a-"))).toBe(true);
  });
});
