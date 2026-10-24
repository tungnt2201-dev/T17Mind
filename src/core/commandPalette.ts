/**
 * core/commandPalette.ts
 * ---------------------------------------------------------------------
 * KW2 — Bảng lệnh (Ctrl+K). Phần THUẦN: danh sách lệnh và cách lọc. Việc
 * chạy lệnh đi qua `CommandHost` (cổng hẹp do giao diện cài — xem
 * ui/commandHost.ts), nên danh sách này kiểm thử được mà không cần giao diện.
 * ---------------------------------------------------------------------
 */
import type { LayoutType } from "./types";
import { normalizeForSearch } from "./search";

/** Những việc bảng lệnh được phép nhờ ứng dụng làm. */
export interface CommandHost {
  addChild(): void;
  newMap(): void;
  openMaps(): void;
  openFile(): void;
  save(): void;
  saveAs(): void;
  undo(): void;
  redo(): void;
  fitView(): void;
  goHome(): void;
  searchInMap(): void;
  toggleExplorer(): void;
  toggleLibrary(): void;
  toggleMinimap(): void;
  openTagDatabase(): void;
  toggleLinking(): void;
  addSticky(): void;
  addFloatingBranch(): void;
  autoArrange(): void;
  setLayout(layout: LayoutType): void;
  exportDocument(): void;
  openShortcuts(): void;
  openThemeEditor(): void;
}

export interface PaletteCommand {
  id: string;
  title: string;
  /** Từ khoá phụ (không dấu cũng tìm được). */
  keywords: string;
  /** Phím tắt hiển thị bên phải (nếu có). */
  shortcut?: string;
  run(host: CommandHost): void;
}

const LAYOUTS: [LayoutType, string][] = [
  ["logicRight", "Logic Right (cây sang phải)"],
  ["logicLeft", "Logic Left (cây sang trái)"],
  ["logicBoth", "Logic Both Sides (hai bên)"],
  ["treeDown", "Tree Down (cây xuống)"],
  ["orgChart", "Organization Chart (sơ đồ tổ chức)"],
  ["treeUp", "Tree Up (cây lên)"],
];

export const PALETTE_COMMANDS: PaletteCommand[] = [
  { id: "addChild", title: "Thêm node con", keywords: "nhanh con tab them", shortcut: "Tab", run: (h) => h.addChild() },
  { id: "newMap", title: "Tạo map mới", keywords: "moi tao tep file", run: (h) => h.newMap() },
  { id: "openMaps", title: "Map gần đây…", keywords: "danh sach mo chuyen map", run: (h) => h.openMaps() },
  { id: "openFile", title: "Mở file…", keywords: "tep nhap import t17m", run: (h) => h.openFile() },
  { id: "save", title: "Lưu", keywords: "ghi luu file", shortcut: "Ctrl+S", run: (h) => h.save() },
  { id: "saveAs", title: "Lưu thành…", keywords: "ghi luu ten dinh dang", shortcut: "Ctrl+Shift+S", run: (h) => h.saveAs() },
  { id: "undo", title: "Hoàn tác", keywords: "undo quay lai", shortcut: "Ctrl+Z", run: (h) => h.undo() },
  { id: "redo", title: "Làm lại", keywords: "redo", shortcut: "Ctrl+Shift+Z", run: (h) => h.redo() },
  { id: "fitView", title: "Vừa khung nhìn", keywords: "zoom canh giua fit", shortcut: "F", run: (h) => h.fitView() },
  { id: "home", title: "Về node gốc", keywords: "goc home", shortcut: "Home", run: (h) => h.goHome() },
  { id: "searchInMap", title: "Tìm trong map này", keywords: "tim kiem find", shortcut: "Ctrl+F", run: (h) => h.searchInMap() },
  { id: "explorer", title: "Bật/tắt khung Explorer", keywords: "duyet cay tag loc", run: (h) => h.toggleExplorer() },
  { id: "library", title: "Bật/tắt Thư viện card", keywords: "card the inbox", run: (h) => h.toggleLibrary() },
  { id: "tagDatabase", title: "Cơ sở dữ liệu Tag (bảng, Kanban, biểu đồ)", keywords: "tag thuoc tinh bang kanban database loc nhom", run: (h) => h.openTagDatabase() },
  { id: "minimap", title: "Bật/tắt Minimap", keywords: "ban do nho", run: (h) => h.toggleMinimap() },
  { id: "linking", title: "Tạo liên kết chéo giữa hai node", keywords: "relationship noi", run: (h) => h.toggleLinking() },
  { id: "sticky", title: "Thêm ghi chú dán", keywords: "giay nho sticky", run: (h) => h.addSticky() },
  { id: "floating", title: "Thêm nhánh trôi", keywords: "nhanh doc lap floating", run: (h) => h.addFloatingBranch() },
  { id: "autoArrange", title: "Sắp xếp lại node", keywords: "tu dong gon auto arrange", run: (h) => h.autoArrange() },
  { id: "exportDoc", title: "Xuất tài liệu Word / Markdown…", keywords: "docx word md xuat bao cao", run: (h) => h.exportDocument() },
  { id: "themeEditor", title: "Theme riêng…", keywords: "mau sac giao dien theme", run: (h) => h.openThemeEditor() },
  { id: "shortcuts", title: "Xem phím tắt", keywords: "tro giup help", shortcut: "?", run: (h) => h.openShortcuts() },
  ...LAYOUTS.map(([layout, label]): PaletteCommand => ({
    id: `layout:${layout}`,
    title: `Bố cục: ${label}`,
    keywords: "layout kieu bo cuc",
    run: (h) => h.setLayout(layout),
  })),
];

/** Lệnh khớp chuỗi gõ (không dấu, mọi từ phải có mặt); chuỗi rỗng = tất cả. Khớp đầu tên xếp trước. */
export function filterCommands(query: string, commands: PaletteCommand[] = PALETTE_COMMANDS, limit = 30): PaletteCommand[] {
  const tokens = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return commands.slice(0, limit);
  const scored: { c: PaletteCommand; score: number }[] = [];
  for (const c of commands) {
    const title = normalizeForSearch(c.title);
    const rest = normalizeForSearch(c.keywords);
    let score = 0;
    let ok = true;
    for (const t of tokens) {
      const at = title.indexOf(t);
      if (at >= 0) score += at === 0 || title[at - 1] === " " ? 0 : 1;
      else if (rest.includes(t)) score += 2;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ c, score });
  }
  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((s) => s.c);
}
