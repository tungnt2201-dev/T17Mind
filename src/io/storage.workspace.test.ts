import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { createEmptyMap } from "../core/tree";
import {
  saveMap,
  loadMap,
  listMaps,
  deleteMap,
  loadLastActiveMap,
  setLastActiveMapId,
  setWorkspaceRepo,
  flushWorkspaceWrites,
  listBrowserOnlyMaps,
  copyBrowserMapsToWorkspace,
  onWorkspaceSaveStatus,
  type WorkspaceSaveStatus,
} from "./storage";
import { createMemoryFs } from "./workspaceFs";
import { WorkspaceRepo } from "./workspaceRepo";

let n = 0;
const open = (fs: ReturnType<typeof createMemoryFs>) => WorkspaceRepo.open(fs, { newId: () => `ws_${++n}` });

beforeEach(() => setWorkspaceRepo(null));

describe("KW0 — storage với thư mục Workspace", () => {
  it("lưu: IndexedDB ghi ngay, thư mục ghi khi flush; danh sách map lấy từ thư mục", async () => {
    const fs = createMemoryFs();
    setWorkspaceRepo(await open(fs));
    const statuses: WorkspaceSaveStatus[] = [];
    onWorkspaceSaveStatus((s) => statuses.push(s));
    const map = createEmptyMap("Một");
    await saveMap(map);
    expect(fs.files.has(`maps/${map.mapId}.t17m`)).toBe(false);
    expect(statuses.at(-1)!.pending).toBe(true);
    await flushWorkspaceWrites();
    expect(fs.files.has(`maps/${map.mapId}.t17m`)).toBe(true);
    expect(statuses.at(-1)).toMatchObject({ pending: false, error: null });
    expect((await listMaps()).map((e) => e.title)).toEqual(["Một"]);
    onWorkspaceSaveStatus(null);
  });

  it("app tắt trước khi kịp ghi ra thư mục: lần sau lấy bản mới hơn từ IndexedDB rồi ghi bù", async () => {
    const fs = createMemoryFs();
    setWorkspaceRepo(await open(fs));
    const map = createEmptyMap("Bản 1");
    await saveMap(map);
    await flushWorkspaceWrites();
    map.nodes[map.rootId]!.text = "Bản 2";
    await new Promise((r) => setTimeout(r, 5));
    await saveMap(map);
    setWorkspaceRepo(null); // "tắt app": bỏ mọi lần ghi đang chờ
    const repo2 = await open(fs);
    setWorkspaceRepo(repo2);
    expect((await repo2.readMap(map.mapId))!.nodes[map.rootId]!.text).toBe("Bản 1");
    const loaded = await loadMap(map.mapId);
    expect(loaded!.nodes[map.rootId]!.text).toBe("Bản 2");
    await flushWorkspaceWrites();
    expect((await repo2.readMap(map.mapId))!.nodes[map.rootId]!.text).toBe("Bản 2");
  });

  it("thư mục mới hơn (sửa ở máy khác): dùng bản trong thư mục", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    setWorkspaceRepo(repo);
    const map = createEmptyMap("Máy này");
    await saveMap(map);
    await flushWorkspaceWrites();
    const other = structuredClone(map);
    other.nodes[other.rootId]!.text = "Máy khác";
    await repo.writeMap(other, Date.now() + 60_000);
    expect((await loadMap(map.mapId))!.nodes[map.rootId]!.text).toBe("Máy khác");
  });

  it("mang thư mục sang máy khác: mở đúng map gần nhất ghi trong workspace.json", async () => {
    const fs = createMemoryFs();
    const repo = await open(fs);
    const a = createEmptyMap("A");
    const b = createEmptyMap("B");
    await repo.writeMap(a, 1);
    await repo.writeMap(b, 2);
    await repo.setLastOpened(a.mapId);
    await setLastActiveMapId("m_khong_thuoc_workspace");
    setWorkspaceRepo(await open(fs));
    expect((await loadLastActiveMap())!.mapId).toBe(a.mapId);
  });

  it("xoá map: huỷ lần ghi đang chờ, file vào .trash", async () => {
    const fs = createMemoryFs();
    setWorkspaceRepo(await open(fs));
    const map = createEmptyMap("Xoá tôi");
    await saveMap(map);
    await flushWorkspaceWrites();
    await saveMap(map); // còn một lần ghi đang chờ
    await deleteMap(map.mapId);
    await flushWorkspaceWrites();
    expect(fs.files.has(`maps/${map.mapId}.t17m`)).toBe(false);
    expect([...fs.files.keys()].some((k) => k.startsWith(".trash/"))).toBe(true);
    expect((await listMaps()).find((e) => e.mapId === map.mapId)).toBeUndefined();
  });

  it("map chỉ có trong bộ nhớ trình duyệt: liệt kê được và chép vào Workspace", async () => {
    const solo = createEmptyMap("Chỉ trình duyệt");
    await saveMap(solo); // chưa gắn thư mục
    const fs = createMemoryFs();
    setWorkspaceRepo(await open(fs));
    const only = await listBrowserOnlyMaps();
    expect(only.map((e) => e.mapId)).toContain(solo.mapId);
    await copyBrowserMapsToWorkspace([solo.mapId]);
    expect(fs.files.has(`maps/${solo.mapId}.t17m`)).toBe(true);
    expect((await listBrowserOnlyMaps()).map((e) => e.mapId)).not.toContain(solo.mapId);
  });
});
