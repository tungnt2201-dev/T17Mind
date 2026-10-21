import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { parseJsonFile } from "./json";
import { parseXlsxFile } from "./xlsx";
import { parseXmindFile } from "./xmind";
import { parseT17mFile } from "./t17m";
import { parseMarkdownDoc } from "./markdownImport";
import { parseDelimited } from "../core/table";
import { parseThemeFile } from "../ui/userLibrary";
import { CURRENT_SCHEMA_VERSION } from "../core/types";
import { getRootIds } from "../core/tree";
import { createMemoryFs } from "./workspaceFs";
import { WorkspaceRepo } from "./workspaceRepo";

/**
 * Bộ file mẫu cho kiểm thử tay (docs/testing/mau + docs/testing/KIEM-THU.md):
 * mỗi file mẫu phải đúng như hướng dẫn nói — file tốt nhập được với đúng số
 * lượng, file lỗi bị từ chối với thông báo. Sửa mẫu hoặc sửa app mà lệch là test đỏ.
 */
const MAU = join(__dirname, "../../docs/testing/mau");
const read = (p: string) => readFileSync(join(MAU, p));
const text = (p: string) => read(p).toString("utf8");
const ab = (p: string): ArrayBuffer => {
  const b = read(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const nodes = (m: { nodes: Record<string, unknown> }) => Object.keys(m.nodes).length;

describe("Mẫu — bảng (dán Excel / nhập CSV)", () => {
  it("TSV, CSV dấu phẩy, CSV chấm phẩy: cùng 7 hàng × 4 cột, tiếng Việt nguyên vẹn", () => {
    for (const f of ["bang-excel-dan-vao.tsv", "bang-dau-phay.csv", "bang-cham-phay-excel-vn.csv"]) {
      const grid = parseDelimited(text(`02-bang/${f}`).replace(/^﻿/, ""));
      expect(grid.length, f).toBe(7);
      expect(grid.every((r) => r.length === 4), f).toBe(true);
      expect(grid[0]).toEqual(["Tháng", "Doanh thu (triệu)", "Chi phí (triệu)", "Ghi chú"]);
      expect(grid[3]![3]).toBe("Có món mới: cà phê muối");
    }
  });
  it("CSV có ngoặc kép, dấu phẩy và xuống dòng trong ô", () => {
    const g = parseDelimited(text("02-bang/bang-ngoac-kep-xuong-dong.csv").replace(/^﻿/, ""));
    expect(g).toHaveLength(4);
    expect(g[1]![1]).toBe("Cà phê sữa, size M");
    expect(g[2]![1]).toBe('Bạc xỉu "đặc biệt"');
    expect(g[2]![2]).toBe("Dòng 1\nDòng 2 trong cùng một ô");
    expect(g[3]![2]).toBe("");
  });
  it("bảng lớn 20 × 10; file trống ra 0 hàng", () => {
    const g = parseDelimited(text("02-bang/bang-lon-20x10.csv").replace(/^﻿/, ""));
    expect([g.length, g[0]!.length]).toEqual([20, 10]);
    expect(parseDelimited("")).toHaveLength(0);
  });
});

describe("Mẫu — nhập các định dạng", () => {
  it("XMind: 23 node (OPML kiểm ở testPack.dom.test.ts — cần DOM)", async () => {
    const x = await parseXmindFile(ab("03-nhap/ban-do.xmind"));
    expect(x.ok).toBe(true);
    if (x.ok) expect(nodes(x.map)).toBe(23);
  });
  it("XLSX: 8 node, 2 gốc (1 nhánh trôi), 4 tag, tiến độ/ưu tiên/hoàn thành đúng, header tiếng Việt", () => {
    const r = parseXlsxFile(ab("03-nhap/ban-do.xlsx"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byText = (t: string) => Object.values(r.map.nodes).find((n) => n.text.startsWith(t))!;
    expect(nodes(r.map)).toBe(8);
    expect(getRootIds(r.map)).toHaveLength(2);
    expect(r.map.tags.map((t) => t.name).sort()).toEqual(["Gấp", "Kỹ thuật", "Marketing", "Xong"]);
    expect(byText("Thiết kế sản phẩm")).toMatchObject({ progress: 60, priority: 1, checked: false, link: "https://example.com/thiet-ke", fill: "#fde68a" });
    expect(byText("Nghiên cứu").checked).toBe(true);
    expect(byText("Mẫu thử nghiệm").tagIds).toHaveLength(2);
    expect(byText("Kế hoạch ra mắt").markers).toEqual(["🚀"]);
  });
  it("JSON dạng cây, JSON đầy đủ, JSON ghép thêm", () => {
    const t = parseJsonFile(text("03-nhap/cay-gon.json"));
    expect(t.ok && nodes(t.map)).toBe(7);
    const f = parseJsonFile(text("03-nhap/day-du.json"));
    expect(f.ok).toBe(true);
    if (f.ok) {
      const m = f.map;
      expect(m.layoutType).toBe("treeDown");
      expect([m.relationships.length, m.summaries.length, m.boundaries.length, m.stickyNotes.length, m.tags.length]).toEqual([1, 1, 1, 1, 2]);
      expect(getRootIds(m)).toHaveLength(2);
      expect(Object.values(m.cards)[0]!.blocks.map((b) => b.type)).toEqual(["text", "table", "image"]);
    }
    const g = parseJsonFile(text("03-nhap/ghep-them.json"));
    expect(g.ok && nodes(g.map)).toBe(5);
  });
  it(".t17m và Markdown nhập được", async () => {
    const t = await parseT17mFile(ab("03-nhap/hoi-thao.t17m"));
    expect(t.ok).toBe(true);
    if (t.ok) expect(t.map.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    const md = parseMarkdownDoc(text("03-nhap/tai-lieu.md"), "x");
    expect(md.ok).toBe(true);
    if (md.ok) {
      const m = md.map;
      expect(m.nodes[m.rootId]!.text).toBe("Kế hoạch quý 4");
      const blocks = Object.values(m.cards).flatMap((c) => c.blocks.map((b) => b.type));
      expect(blocks.sort()).toEqual(["image", "table"]);
      const checks = Object.values(m.nodes).filter((n) => n.checked !== null);
      expect(checks.map((n) => [n.text, n.checked])).toEqual([["Chốt ngân sách", true], ["Tuyển 5 nhân viên", false]]);
    }
    const back = parseMarkdownDoc(text("03-nhap/hoi-thao-xuat-tu-app.md"), "x");
    expect(back.ok).toBe(true);
  });
});

describe("Mẫu — file lỗi và file cũ", () => {
  it("file hỏng bị từ chối kèm thông báo", async () => {
    for (const f of ["loi-khong-phai-json.json", "loi-json-thieu-text.json", "schema-moi-hon-999.json"]) {
      const r = parseJsonFile(text(`04-loi-va-cu/${f}`));
      expect(r.ok, f).toBe(false);
    }
    const newer = parseJsonFile(text("04-loi-va-cu/schema-moi-hon-999.json"));
    expect(!newer.ok && newer.errors.join(" ")).toMatch(/mới hơn/);
    for (const f of ["loi-xlsx-khong-co-goc.xlsx", "loi-xlsx-trung-id.xlsx", "loi-xlsx-thieu-cot.xlsx"]) {
      expect(parseXlsxFile(ab(`04-loi-va-cu/${f}`)).ok, f).toBe(false);
    }
    expect((await parseT17mFile(ab("04-loi-va-cu/loi-t17m-khong-phai-zip.t17m"))).ok).toBe(false);
    expect((await parseT17mFile(ab("04-loi-va-cu/loi-t17m-thieu-content.t17m"))).ok).toBe(false);
  });
  it("file schema cũ được nâng lên bản mới nhất, không mất dữ liệu", () => {
    const a = parseJsonFile(text("04-loi-va-cu/schema-cu-16-khong-co-card.json"));
    expect(a.ok).toBe(true);
    if (a.ok) {
      expect(a.map.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(nodes(a.map)).toBe(23);
    }
    const b = parseJsonFile(text("04-loi-va-cu/schema-cu-19-card-chua-co-moc-thoi-gian.json"));
    expect(b.ok).toBe(true);
    if (b.ok) {
      expect(b.map.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(Object.values(b.map.cards)[0]).toMatchObject({ createdAt: 0, updatedAt: 0, rev: 0 });
      expect(b.map.customTheme).toBeNull();
    }
  });
});

describe("Mẫu — theme", () => {
  it("theme tốt nhập được, theme lỗi bị từ chối, màu sai bị bỏ qua", () => {
    const a = parseThemeFile(text("05-theme/theme-bien-xanh.t17theme"))!;
    expect([a.name, a.levels.length, a.hueDrift]).toEqual(["Biển xanh (mẫu)", 4, true]);
    const b = parseThemeFile(text("05-theme/theme-lua-trai-nhanh.t17theme"))!;
    expect([b.perBranch, b.palette!.length, b.rootStyle!.fill]).toEqual([true, 6, "#292524"]);
    const c = parseThemeFile(text("05-theme/theme-mau-sai-van-doc-duoc.t17theme"))!;
    expect(c.levels.map((l) => l.fill)).toEqual(["#7c2d12", "#fed7aa"]);
    expect(parseThemeFile(text("05-theme/theme-loi-khong-doc-duoc.t17theme"))).toBeNull();
  });
});

describe("Mẫu — Workspace và dữ liệu lớn", () => {
  it("thư mục Workspace mẫu: 2 map, 2 card, 1 theme; mở map Ngân sách thì card dùng chung được cập nhật", async () => {
    const fs = createMemoryFs();
    const walk = (dir: string, rel = "") => {
      for (const name of readdirSync(join(dir, rel))) {
        const r = rel ? `${rel}/${name}` : name;
        if (statSync(join(dir, r)).isDirectory()) walk(dir, r);
        else void fs.write(r, new Uint8Array(readFileSync(join(dir, r))));
      }
    };
    walk(join(MAU, "06-workspace-mau"));
    const repo = await WorkspaceRepo.open(fs, { newId: () => "ws_test" });
    expect(repo.listMaps().map((m) => m.title).sort()).toEqual(["Mẫu — Hội thảo: Chương trình", "Mẫu — Hội thảo: Ngân sách"]);
    const reg = await repo.listRegistryCards();
    expect(reg.map((r) => r.file.card.id).sort()).toEqual(["card_mau_diengia", "card_mau_email"]);
    const shared = reg.find((r) => r.file.card.id === "card_mau_diengia")!;
    expect(shared.usedIn).toHaveLength(2);
    expect(reg.find((r) => r.file.card.id === "card_mau_email")!.usedIn).toHaveLength(0);
    expect((await repo.listThemes()).map((t) => t.name)).toEqual(["Theme có sẵn trong Workspace mẫu"]);
    const b = (await repo.readMap("m_mau_ngan_sach"))!;
    expect(b.cards.card_mau_diengia!.blocks).toHaveLength(1);
    expect(await repo.pullNewerCards(b)).toEqual(["Danh sách diễn giả"]);
    expect(b.cards.card_mau_diengia!.blocks).toHaveLength(2);
    const a = (await repo.readMap("m_mau_chuong_trinh"))!;
    expect(await repo.pullNewerCards(a)).toEqual([]);
  });
  it("map lớn 1500 node nhập được", () => {
    const r = parseJsonFile(text("07-demo/map-lon-1500-node.json"));
    expect(r.ok && nodes(r.map)).toBe(1500);
  });
  it("ảnh mẫu đủ loại: ảnh lớn thật sự lớn, đủ đuôi file", () => {
    const names = readdirSync(join(MAU, "01-anh"));
    for (const ext of [".jpg", ".png", ".webp", ".svg", ".txt"]) expect(names.some((n) => n.endsWith(ext)), ext).toBe(true);
    expect(statSync(join(MAU, "01-anh/anh-04-lon-4000x3000.jpg")).size).toBeGreaterThan(1_000_000);
  });
});
