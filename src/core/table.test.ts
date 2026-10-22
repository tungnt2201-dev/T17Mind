import { describe, it, expect } from "vitest";
import { createTableBlock, createChartBlock, validateCard } from "./cards";
import {
  createDraft,
  setCell,
  setAlign,
  setHeaderRow,
  insertRow,
  deleteRow,
  insertColumn,
  deleteColumn,
  pasteGrid,
  replaceWithGrid,
  tableFromGrid,
  parseDelimited,
  toDelimited,
  detectDelimiter,
  isGridText,
  nextCell,
  remapChartColumns,
  tableThumbnail,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS,
  TABLE_DEFAULT_COL_W,
  TABLE_DEFAULT_ROW_H,
  TABLE_MIN_COL_W,
  TABLE_MAX_COL_W,
  TABLE_MIN_ROW_H,
  setColWidth,
  setRowHeight,
  autoFitColWidth,
  autoFitRowHeight,
} from "./table";
import { migrateToLatest } from "./migrate";
import type { Card, TableBlock } from "./types";

function filled(rows: number, cols: number): TableBlock {
  const t = createTableBlock(rows, cols);
  t.cells = t.cells.map((row, r) => row.map((_, c) => `${r}${c}`));
  return t;
}

const isRect = (t: TableBlock): boolean => t.cells.every((row) => row.length === t.align.length);

describe("Bản nháp bảng — thêm/xoá hàng/cột, căn lề, tiêu đề (M2)", () => {
  it("không sửa bảng gốc (mọi hàm trả bản nháp mới)", () => {
    const t = filled(2, 2);
    const before = JSON.stringify(t);
    const d0 = createDraft(t);
    const d1 = insertColumn(insertRow(setCell(d0, 0, 0, "x"), 1), 0);
    expect(JSON.stringify(t)).toBe(before);
    expect(d0.table.cells[0]![0]).toBe("00");
    expect(d1.table.cells[0]![1]).toBe("x");
  });

  it("chèn/xoá hàng giữ hình chữ nhật và tối thiểu 1 hàng", () => {
    let d = createDraft(filled(2, 3));
    d = insertRow(d, 1);
    expect(d.table.cells.map((r) => r[0])).toEqual(["00", "", "10"]);
    d = insertRow(d, 99); // kẹp về cuối
    expect(d.table.cells).toHaveLength(4);
    expect(isRect(d.table)).toBe(true);
    d = deleteRow(deleteRow(deleteRow(d, 0), 0), 0);
    expect(d.table.cells).toHaveLength(1);
    expect(deleteRow(d, 0)).toBe(d); // không xoá hàng cuối cùng
  });

  it("chèn/xoá cột cập nhật align và colOrigin", () => {
    let d = createDraft(filled(2, 3));
    d = setAlign(d, 2, "right");
    d = insertColumn(d, 1);
    expect(d.table.cells[0]).toEqual(["00", "", "01", "02"]);
    expect(d.table.align).toEqual(["left", "left", "left", "right"]);
    expect(d.colOrigin).toEqual([0, null, 1, 2]);
    d = deleteColumn(d, 0);
    expect(d.colOrigin).toEqual([null, 1, 2]);
    expect(d.table.cells[1]).toEqual(["", "11", "12"]);
    d = deleteColumn(deleteColumn(d, 0), 0);
    expect(d.table.align).toEqual(["right"]);
    expect(deleteColumn(d, 0)).toBe(d); // không xoá cột cuối cùng
    expect(isRect(d.table)).toBe(true);
  });

  it("hàng tiêu đề bật/tắt, setCell ngoài phạm vi bị bỏ qua", () => {
    const d = createDraft(filled(1, 1));
    expect(setHeaderRow(d, false).table.headerRow).toBe(false);
    expect(setCell(d, 5, 5, "x")).toBe(d);
    expect(setAlign(d, 3, "center")).toBe(d);
  });

  it("có giới hạn số hàng/cột", () => {
    let d = createDraft(createTableBlock(1, TABLE_MAX_COLS));
    expect(insertColumn(d, 0)).toBe(d);
    d = createDraft(tableFromGrid("t", Array.from({ length: TABLE_MAX_ROWS }, () => ["a"])));
    expect(insertRow(d, 0)).toBe(d);
  });
});

describe("Dán từ Excel/Google Sheets (TSV) và CSV (M2)", () => {
  it("đọc TSV Excel: CRLF, dòng trống cuối, ô có ngoặc kép và xuống dòng", () => {
    const text = 'Tên\tSố\r\n"Nguyễn ""A"""\t10\r\n"dòng 1\ndòng 2"\t20\r\n';
    expect(parseDelimited(text)).toEqual([
      ["Tên", "Số"],
      ['Nguyễn "A"', "10"],
      ["dòng 1\ndòng 2", "20"],
    ]);
  });

  it("đọc CSV có dấu phẩy trong ngoặc, ô trống, hàng ngắn được đệm", () => {
    expect(parseDelimited('a,"b,c",\n1\n')).toEqual([
      ["a", "b,c", ""],
      ["1", "", ""],
    ]);
  });

  it("tự đoán dấu phân cách: Tab, ';' (Excel vùng VN) hoặc ','", () => {
    expect(detectDelimiter("a\tb")).toBe("\t");
    expect(detectDelimiter("Tên;Giá\n\"A\";1,5")).toBe(";");
    expect(detectDelimiter("a,b;c,d")).toBe(",");
    expect(parseDelimited("Tên;Giá\nA;1,5")).toEqual([
      ["Tên", "Giá"],
      ["A", "1,5"],
    ]);
  });

  it("ghi CSV/TSV rồi đọc lại ra đúng lưới cũ (round-trip)", () => {
    const grid = [
      ["a", 'có "ngoặc"', "x,y"],
      ["dòng\nmới", "", "tab\there"],
    ];
    for (const delim of [",", "\t", ";"] as const) {
      expect(parseDelimited(toDelimited(grid, delim), delim)).toEqual(grid);
    }
  });

  it("isGridText: chỉ coi là lưới khi có Tab hoặc nhiều dòng", () => {
    expect(isGridText("abc")).toBe(false);
    expect(isGridText("abc\r\n")).toBe(false); // Excel copy 1 ô
    expect(isGridText("a\tb")).toBe(true);
    expect(isGridText("a\nb")).toBe(true);
  });

  it("dán lưới vào giữa bảng: ghi đè đúng chỗ, tự nở thêm hàng/cột", () => {
    const d = createDraft(filled(2, 2));
    const { draft, clipped } = pasteGrid(d, 1, 1, [
      ["A", "B"],
      ["C", "D"],
    ]);
    expect(clipped).toBe(false);
    expect(draft.table.cells).toEqual([
      ["00", "01", ""],
      ["10", "A", "B"],
      ["", "C", "D"],
    ]);
    expect(draft.colOrigin).toEqual([0, 1, null]);
    expect(isRect(draft.table)).toBe(true);
  });

  it("dán quá giới hạn thì cắt bớt và báo clipped", () => {
    const d = createDraft(filled(1, 1));
    const wide = [Array.from({ length: TABLE_MAX_COLS + 5 }, (_, i) => String(i))];
    const { draft, clipped } = pasteGrid(d, 0, 0, wide);
    expect(clipped).toBe(true);
    expect(draft.table.align).toHaveLength(TABLE_MAX_COLS);
  });

  it("tableFromGrid / replaceWithGrid tạo bảng hợp lệ", () => {
    const t = tableFromGrid("t1", [["a", "b"], ["c"]], "Nhập");
    expect(t.cells).toEqual([
      ["a", "b"],
      ["c", ""],
    ]);
    expect(tableFromGrid("t2", []).cells).toEqual([[""]]);
    const card: Card = { id: "c", title: "", blocks: [t], createdAt: 0, updatedAt: 0, rev: 0 };
    expect(validateCard(card, {})).toEqual([]);

    const src = filled(2, 3);
    let d = createDraft(src);
    d = setAlign(d, 0, "right");
    d = replaceWithGrid(d, [["x", "y"]]);
    expect(d.table.id).toBe(src.id);
    expect(d.table.cells).toEqual([["x", "y"]]);
    expect(d.table.align).toEqual(["right", "left"]);
    expect(d.colOrigin).toEqual([0, 1]);
  });
});

describe("Điều hướng ô Tab/Enter (M2)", () => {
  it("Tab sang phải, hết hàng xuống đầu hàng sau, ô cuối thì thêm hàng", () => {
    expect(nextCell(0, 0, 2, 3, "tab")).toEqual({ r: 0, c: 1, addRow: false });
    expect(nextCell(0, 2, 2, 3, "tab")).toEqual({ r: 1, c: 0, addRow: false });
    expect(nextCell(1, 2, 2, 3, "tab")).toEqual({ r: 2, c: 0, addRow: true });
  });
  it("Shift+Tab lùi lại và dừng ở ô đầu", () => {
    expect(nextCell(1, 0, 2, 3, "shift-tab")).toEqual({ r: 0, c: 2, addRow: false });
    expect(nextCell(0, 0, 2, 3, "shift-tab")).toEqual({ r: 0, c: 0, addRow: false });
  });
  it("Enter xuống dưới (hàng cuối thì thêm hàng), Shift+Enter lên", () => {
    expect(nextCell(0, 1, 2, 3, "enter")).toEqual({ r: 1, c: 1, addRow: false });
    expect(nextCell(1, 1, 2, 3, "enter")).toEqual({ r: 2, c: 1, addRow: true });
    expect(nextCell(0, 1, 2, 3, "shift-enter")).toEqual({ r: 0, c: 1, addRow: false });
  });
});

describe("Biểu đồ phụ thuộc + thẻ thu nhỏ (M2)", () => {
  it("remapChartColumns theo colOrigin: chèn cột dịch chỉ số, xoá cột bỏ series", () => {
    const chart = { ...createChartBlock("t"), labelColumn: 0, seriesColumns: [1, 2] };
    expect(remapChartColumns(chart, [0, null, 1, 2])).toMatchObject({ labelColumn: 0, seriesColumns: [2, 3] });
    expect(remapChartColumns(chart, [0, 2])).toMatchObject({ labelColumn: 0, seriesColumns: [1] });
    // xoá hết cột số liệu → lấy cột đầu tiên khác cột nhãn
    expect(remapChartColumns(chart, [0, null])).toMatchObject({ labelColumn: 0, seriesColumns: [1] });
    // xoá cột nhãn → về cột 0
    expect(remapChartColumns(chart, [1, 2])).toMatchObject({ labelColumn: 0, seriesColumns: [0, 1] });
  });

  it("tableThumbnail cắt còn tối đa 4×5 và báo phần bị ẩn", () => {
    const small = tableThumbnail(filled(2, 2));
    expect(small).toMatchObject({ moreRows: false, moreCols: false });
    expect(small.cells).toEqual(filled(2, 2).cells);
    const big = tableThumbnail(filled(10, 8));
    expect(big.cells).toHaveLength(4);
    expect(big.cells[0]).toHaveLength(5);
    expect(big.align).toHaveLength(5);
    expect(big).toMatchObject({ moreRows: true, moreCols: true });
  });
});

describe("Đổi cỡ cột/hàng (schema 19)", () => {
  it("bảng mới có colWidths/rowHeights mặc định đúng độ dài", () => {
    const t = createTableBlock(3, 4);
    expect(t.colWidths).toEqual([TABLE_DEFAULT_COL_W, TABLE_DEFAULT_COL_W, TABLE_DEFAULT_COL_W, TABLE_DEFAULT_COL_W]);
    expect(t.rowHeights).toEqual([TABLE_DEFAULT_ROW_H, TABLE_DEFAULT_ROW_H, TABLE_DEFAULT_ROW_H]);
    expect(tableFromGrid("x", [["a", "b"], ["c"]]).colWidths).toHaveLength(2);
  });

  it("setColWidth/setRowHeight kẹp trong giới hạn, chỉ số sai bị bỏ qua", () => {
    let d = createDraft(createTableBlock(2, 2));
    d = setColWidth(d, 1, 9999);
    expect(d.table.colWidths).toEqual([TABLE_DEFAULT_COL_W, TABLE_MAX_COL_W]);
    d = setColWidth(d, 0, 1);
    expect(d.table.colWidths[0]).toBe(TABLE_MIN_COL_W);
    d = setRowHeight(d, 0, 87.6);
    expect(d.table.rowHeights[0]).toBe(88);
    expect(setRowHeight(d, 0, 1).table.rowHeights[0]).toBe(TABLE_MIN_ROW_H);
    expect(setColWidth(d, 5, 100)).toBe(d);
    expect(setRowHeight(d, 0, Number.NaN)).toBe(d);
  });

  it("chèn/xoá/dán giữ colWidths và rowHeights khớp số cột/hàng, cột cũ giữ cỡ đã chỉnh", () => {
    let d = createDraft(createTableBlock(2, 2));
    d = setColWidth(d, 1, 300);
    d = setRowHeight(d, 1, 60);
    d = insertColumn(d, 0);
    d = insertRow(d, 0);
    expect(d.table.colWidths).toEqual([TABLE_DEFAULT_COL_W, TABLE_DEFAULT_COL_W, 300]);
    expect(d.table.rowHeights).toEqual([TABLE_DEFAULT_ROW_H, TABLE_DEFAULT_ROW_H, 60]);
    d = deleteColumn(d, 1);
    d = deleteRow(d, 0);
    expect(d.table.colWidths).toEqual([TABLE_DEFAULT_COL_W, 300]);
    expect(d.table.rowHeights).toEqual([TABLE_DEFAULT_ROW_H, 60]);
    d = pasteGrid(d, 0, 0, [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]]).draft;
    expect(d.table.colWidths).toEqual([TABLE_DEFAULT_COL_W, 300, TABLE_DEFAULT_COL_W]);
    expect(d.table.rowHeights).toHaveLength(3);
    d = replaceWithGrid(d, [["x", "y"]]);
    expect(d.table.colWidths).toEqual([TABLE_DEFAULT_COL_W, 300]);
    expect(d.table.rowHeights).toEqual([TABLE_DEFAULT_ROW_H]);
    const card: Card = { id: "c", title: "", blocks: [d.table], createdAt: 0, updatedAt: 0, rev: 0 };
    expect(validateCard(card, {})).toEqual([]);
  });

  it("vừa khít chữ: cột theo dòng chữ dài nhất, hàng theo ô nhiều dòng nhất", () => {
    const t = createTableBlock(2, 2);
    t.cells = [["ngắn", ""], ["một dòng rất dài\nx", "a\nb\nc"]];
    const measure = (s: string): number => s.length * 10;
    expect(autoFitColWidth(t, 0, measure)).toBe("một dòng rất dài".length * 10 + 18);
    expect(autoFitColWidth(t, 1, () => 0)).toBe(TABLE_MIN_COL_W);
    expect(autoFitRowHeight(t, 1)).toBe(3 * 18 + 10);
    expect(autoFitRowHeight(t, 0)).toBe(TABLE_DEFAULT_ROW_H);
  });

  it("validateCard báo lỗi khi colWidths/rowHeights lệch độ dài hoặc không phải số dương", () => {
    const t = { ...createTableBlock(2, 2), colWidths: [100], rowHeights: [28, -1] };
    const errors = validateCard({ id: "c", title: "", blocks: [t], createdAt: 0, updatedAt: 0, rev: 0 }, {});
    expect(errors.some((e) => e.includes("colWidths"))).toBe(true);
    expect(errors.some((e) => e.includes("rowHeights"))).toBe(true);
  });

  it("migrate 18 → 19: bảng cũ được thêm cỡ mặc định, giá trị hợp lệ được giữ", () => {
    const raw = {
      schemaVersion: 18,
      rootId: "n1",
      nodes: { n1: { id: "n1", text: "Gốc", parentId: null, children: [] } },
      cards: {
        c1: {
          id: "c1",
          title: "",
          blocks: [
            { id: "t1", type: "table", title: "", headerRow: true, align: ["left", "left"], cells: [["a", "b"]] },
            { id: "t2", type: "table", title: "", headerRow: true, align: ["left"], cells: [["a"], ["b"]], colWidths: [200], rowHeights: ["x", 50] },
          ],
        },
      },
    };
    const m = migrateToLatest(raw as never);
    expect(m.cards.c1!.blocks[0]).toMatchObject({ colWidths: [TABLE_DEFAULT_COL_W, TABLE_DEFAULT_COL_W], rowHeights: [TABLE_DEFAULT_ROW_H] });
    expect(m.cards.c1!.blocks[1]).toMatchObject({ colWidths: [200], rowHeights: [TABLE_DEFAULT_ROW_H, 50] });
    expect(validateCard(m.cards.c1!, {})).toEqual([]);
  });
});
