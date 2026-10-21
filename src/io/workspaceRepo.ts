/**
 * io/workspaceRepo.ts
 * ---------------------------------------------------------------------
 * KW0 — đọc/ghi map trong một thư mục Workspace (xem core/workspace.ts):
 * mỗi map một file `maps/<mapId>.t17m` (đúng định dạng .t17m đang dùng
 * khi Lưu/Mở — mở thẳng bằng Tệp → Mở… cũng được), danh mục ở
 * `workspace.json`. Mở Workspace luôn đối chiếu danh mục với file thật:
 * danh mục hỏng/thiếu thì dựng lại từ các file trong maps/.
 *
 * Mọi thao tác ghi xếp hàng tuần tự (writeChain) để hai lần lưu gần nhau
 * không ghi đè workspace.json lẫn nhau.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { sanitizeTheme, type Theme } from "../core/theme";
import { applyCardFile, buildCardFile, isNewer, parseCardFile, versionOf, type RegistryCardFile } from "../core/cardRegistry";
import {
  MANIFEST_FILE,
  MAPS_DIR,
  TRASH_DIR,
  THEMES_DIR,
  createManifest,
  CARDS_DIR,
  cardFilePath,
  mapsUsingCard,
  isSafeId,
  sanitizePinnedMarkers,
  themeFilePath,
  mapDisplayTitle,
  mapFilePath,
  parseManifest,
  reconcileManifest,
  removeMapEntry,
  serializeManifest,
  sortedMapEntries,
  upsertMapEntry,
  type WorkspaceManifest,
  type WorkspaceMapEntry,
} from "../core/workspace";
import { exportT17mFile, parseT17mFile } from "./t17m";
import { bytesText, textBytes, type WorkspaceFs } from "./workspaceFs";

const toArrayBuffer = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

export interface OpenWorkspaceOptions {
  /** Sinh id cho Workspace mới (tách ra để test cố định được). */
  newId: () => string;
  /** Tên cho Workspace mới. */
  name?: string;
  now?: () => number;
}

export class WorkspaceRepo {
  private writeChain: Promise<unknown> = Promise.resolve();

  private constructor(readonly fs: WorkspaceFs, private manifest: WorkspaceManifest, private readonly now: () => number) {}

  /** Mở (hoặc tạo mới) Workspace trong `fs`. */
  static async open(fs: WorkspaceFs, opts: OpenWorkspaceOptions): Promise<WorkspaceRepo> {
    const now = opts.now ?? Date.now;
    const rawManifest = await fs.read(MANIFEST_FILE);
    let manifest = rawManifest ? parseManifest(bytesText(rawManifest)) : null;
    let dirty = false;
    if (!manifest) {
      // Danh mục hỏng: giữ lại một bản để người dùng còn cứu được, rồi dựng mới.
      if (rawManifest) await fs.write(`${MANIFEST_FILE}.hong-${now()}`, rawManifest);
      manifest = createManifest(opts.newId(), opts.name ?? "Workspace", now());
      dirty = true;
    }
    const files = (await fs.list(MAPS_DIR)).filter((f) => f.endsWith(".t17m"));
    const rec = reconcileManifest(manifest, files);
    manifest = rec.manifest;
    dirty ||= rec.changed;
    // File .t17m mới chép vào maps/: chưa biết giờ sửa → coi là vừa thêm (không để 1970 trong "Map gần đây").
    for (const mapId of rec.unknownMapIds) {
      const map = await readMapFile(fs, mapId);
      if (!map || map.mapId !== mapId) continue;
      manifest = upsertMapEntry(manifest, { mapId, title: mapDisplayTitle(map), updatedAt: now(), cardIds: Object.keys(map.cards) }, now());
      dirty = true;
    }
    // KW1 — đối chiếu kho card: bỏ mục mất file, nhận file card chép tay vào.
    const cardFiles = new Set((await fs.list(CARDS_DIR)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)));
    const cards = { ...manifest.cards };
    for (const id of Object.keys(cards)) {
      if (!cardFiles.has(id)) {
        delete cards[id];
        dirty = true;
      }
    }
    for (const id of cardFiles) {
      if (cards[id] || !isSafeId(id)) continue;
      const file = await readCardFile(fs, id);
      if (!file || file.card.id !== id) continue;
      cards[id] = { title: file.card.title, ...versionOf(file.card) };
      dirty = true;
    }
    manifest = { ...manifest, cards };
    const repo = new WorkspaceRepo(fs, manifest, now);
    if (dirty) await repo.saveManifest();
    return repo;
  }

  get workspaceId(): string {
    return this.manifest.workspaceId;
  }
  get name(): string {
    return this.manifest.name;
  }
  get lastOpenedMapId(): string | null {
    return this.manifest.lastOpenedMapId;
  }
  /** Bản sao danh mục hiện tại (chỉ đọc). */
  getManifest(): WorkspaceManifest {
    return structuredClone(this.manifest);
  }

  listMaps(): WorkspaceMapEntry[] {
    return sortedMapEntries(this.manifest);
  }

  getEntry(mapId: string): WorkspaceMapEntry | null {
    return this.manifest.maps.find((e) => e.mapId === mapId) ?? null;
  }

  /** Đọc một map; null nếu không có hoặc file hỏng. */
  async readMap(mapId: string): Promise<MindMap | null> {
    if (!this.getEntry(mapId)) return null;
    return readMapFile(this.fs, mapId);
  }

  /** Ghi một map (tạo mới hoặc ghi đè) và cập nhật danh mục. */
  writeMap(map: MindMap, updatedAt: number = this.now()): Promise<void> {
    const snapshot = structuredClone(map);
    return this.enqueue(async () => {
      const blob = await exportT17mFile(snapshot);
      await this.fs.write(mapFilePath(snapshot.mapId), new Uint8Array(await blob.arrayBuffer()));
      this.manifest = upsertMapEntry(
        this.manifest,
        { mapId: snapshot.mapId, title: mapDisplayTitle(snapshot), updatedAt, cardIds: Object.keys(snapshot.cards) },
        this.now()
      );
      await this.publishCards(snapshot);
      await this.writeManifestFile();
    });
  }

  /** KW1 — card trong map mới hơn bản chuẩn (hoặc chưa có) → ghi bản chuẩn. */
  private async publishCards(map: MindMap): Promise<void> {
    const cards = { ...this.manifest.cards };
    let changed = false;
    for (const card of Object.values(map.cards)) {
      if (!isSafeId(card.id)) continue;
      const entry = cards[card.id];
      if (entry && !isNewer(versionOf(card), entry)) continue;
      await this.fs.write(cardFilePath(card.id), textBytes(JSON.stringify(buildCardFile(map, card))));
      cards[card.id] = { title: card.title, ...versionOf(card) };
      changed = true;
    }
    if (changed) this.manifest = { ...this.manifest, cards };
  }

  /**
   * KW1 — lúc mở map: card nào có bản chuẩn MỚI HƠN bản sao trong map thì
   * thay vào (sửa thẳng `map`). Trả về tên các card đã cập nhật.
   */
  async pullNewerCards(map: MindMap): Promise<string[]> {
    const updated: string[] = [];
    for (const card of Object.values(map.cards)) {
      const entry = this.manifest.cards[card.id];
      if (!entry || !isNewer(entry, versionOf(card))) continue;
      const file = await readCardFile(this.fs, card.id);
      if (!file || !isNewer(versionOf(file.card), versionOf(card))) continue;
      applyCardFile(map, file);
      updated.push(file.card.title || "(chưa đặt tên)");
    }
    return updated;
  }

  /** KW1 — bản chuẩn của một card (null nếu không có / hỏng). */
  readCard(cardId: string): Promise<RegistryCardFile | null> {
    if (!this.manifest.cards[cardId]) return Promise.resolve(null);
    return readCardFile(this.fs, cardId);
  }

  /** KW1 — toàn bộ kho card chung, kèm danh sách map đang dùng từng card. */
  async listRegistryCards(): Promise<{ file: RegistryCardFile; usedIn: WorkspaceMapEntry[] }[]> {
    const out: { file: RegistryCardFile; usedIn: WorkspaceMapEntry[] }[] = [];
    for (const id of Object.keys(this.manifest.cards)) {
      const file = await readCardFile(this.fs, id);
      if (file) out.push({ file, usedIn: mapsUsingCard(this.manifest, id) });
    }
    return out.sort((a, b) => b.file.card.updatedAt - a.file.card.updatedAt);
  }

  /** KW1 — xoá card khỏi kho chung (chuyển vào .trash). Chỉ khi không map nào còn dùng. */
  deleteRegistryCard(cardId: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.manifest.cards[cardId]) return;
      if (mapsUsingCard(this.manifest, cardId).length > 0) throw new Error("Card vẫn đang được dùng trong một map.");
      const from = cardFilePath(cardId);
      if (await this.fs.read(from)) await this.fs.move(from, `${TRASH_DIR}/card-${cardId}-${this.now()}.json`);
      const cards = { ...this.manifest.cards };
      delete cards[cardId];
      this.manifest = { ...this.manifest, cards, updatedAt: this.now() };
      await this.writeManifestFile();
    });
  }

  /** Xoá map: chuyển file vào .trash/ (không xoá hẳn), bỏ khỏi danh mục. */
  deleteMap(mapId: string): Promise<void> {
    return this.enqueue(async () => {
      if (!this.getEntry(mapId)) return;
      const from = mapFilePath(mapId);
      if (await this.fs.read(from)) await this.fs.move(from, `${TRASH_DIR}/${mapId}-${this.now()}.t17m`);
      this.manifest = removeMapEntry(this.manifest, mapId, this.now());
      await this.writeManifestFile();
    });
  }

  setLastOpened(mapId: string): Promise<void> {
    if (this.manifest.lastOpenedMapId === mapId || !this.getEntry(mapId)) return Promise.resolve();
    return this.enqueue(async () => {
      this.manifest = { ...this.manifest, lastOpenedMapId: mapId };
      await this.writeManifestFile();
    });
  }

  get pinnedMarkers(): string[] | null {
    return this.manifest.pinnedMarkers ? [...this.manifest.pinnedMarkers] : null;
  }

  /** Lưu hàng biểu tượng ghim (null = quay về bộ mặc định). */
  setPinnedMarkers(list: string[] | null): Promise<void> {
    return this.enqueue(async () => {
      this.manifest = { ...this.manifest, pinnedMarkers: list === null ? null : sanitizePinnedMarkers(list), updatedAt: this.now() };
      await this.writeManifestFile();
    });
  }

  /** Mọi theme riêng trong themes/ (file hỏng bị bỏ qua). */
  async listThemes(): Promise<Theme[]> {
    const out: Theme[] = [];
    for (const f of await this.fs.list(THEMES_DIR)) {
      if (!f.endsWith(".json")) continue;
      const bytes = await this.fs.read(`${THEMES_DIR}/${f}`);
      if (!bytes) continue;
      try {
        const t = sanitizeTheme(JSON.parse(bytesText(bytes)));
        if (t && isSafeId(t.id) && `${t.id}.json` === f) out.push(t);
      } catch {
        // file hỏng: bỏ qua
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }

  writeTheme(theme: Theme): Promise<void> {
    const clean = sanitizeTheme(theme);
    if (!clean || !isSafeId(clean.id)) return Promise.reject(new Error("Theme không hợp lệ."));
    return this.enqueue(() => this.fs.write(themeFilePath(clean.id), textBytes(JSON.stringify(clean, null, 2))));
  }

  /** Xoá theme: chuyển file vào .trash/. */
  deleteTheme(themeId: string): Promise<void> {
    if (!isSafeId(themeId)) return Promise.resolve();
    return this.enqueue(async () => {
      const from = themeFilePath(themeId);
      if (await this.fs.read(from)) await this.fs.move(from, `${TRASH_DIR}/theme-${themeId}-${this.now()}.json`);
    });
  }

  /** Chờ mọi lần ghi đang xếp hàng xong. */
  async idle(): Promise<void> {
    await this.writeChain.catch(() => undefined);
  }

  private saveManifest(): Promise<void> {
    return this.enqueue(() => this.writeManifestFile());
  }

  private async writeManifestFile(): Promise<void> {
    await this.fs.write(MANIFEST_FILE, textBytes(serializeManifest(this.manifest)));
  }

  private enqueue(job: () => Promise<void>): Promise<void> {
    const next = this.writeChain.catch(() => undefined).then(job);
    this.writeChain = next;
    return next;
  }
}

async function readMapFile(fs: WorkspaceFs, mapId: string): Promise<MindMap | null> {
  const bytes = await fs.read(mapFilePath(mapId));
  if (!bytes) return null;
  const res = await parseT17mFile(toArrayBuffer(bytes));
  if (!res.ok) {
    console.warn(`Bỏ qua map "${mapId}" trong Workspace:`, res.errors);
    return null;
  }
  return res.map;
}

async function readCardFile(fs: WorkspaceFs, cardId: string): Promise<RegistryCardFile | null> {
  const bytes = await fs.read(cardFilePath(cardId));
  return bytes ? parseCardFile(bytesText(bytes)) : null;
}
