import { describe, expect, it } from "vitest";
import { cellAddress, columnName, displayCells, evalTable, hasFormulas, isFormula } from "./formula";

/** Dựng bảng nhanh từ lưới chữ. */
const T = (cells: string[][]) => ({ cells, align: cells[0]!.map(() => "left" as const) });
/** Tính công thức đặt ở ô cuối của bảng mẫu bên dưới. */
const SAMPLE = [
  ["Tên", "SL", "Giá"],
  ["a", "10", "1.500"],
  ["b", "20", "2,5"],
  ["c", "x", ""],
  ["d", "30", "4"],
];
const f = (formula: string, base = SAMPLE) => {
  const cells = base.map((r) => [...r, ""]);
  const last = cells[0]!.length - 1;
  cells[cells.length - 1]![last] = formula;
  return evalTable(T(cells)).at(cells.length - 1, last);
};

describe("địa chỉ ô", () => {
  it("tên cột kiểu Excel", () => {
    expect([0, 1, 25, 26, 27, 51, 52, 99].map(columnName)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA", "CV"]);
    expect(cellAddress(0, 0)).toBe("A1");
    expect(cellAddress(9, 27)).toBe("AB10");
  });
  it("nhận ra ô công thức", () => {
    expect(isFormula("=1+1")).toBe(true);
    expect(isFormula(" =1")).toBe(false);
    expect(hasFormulas({ cells: [["a", "=B1"]] })).toBe(true);
    expect(hasFormulas({ cells: [["a", "b"]] })).toBe(false);
  });
});

describe("hàm thống kê trên vùng liền", () => {
  it("SUM / MIN / MAX / COUNT / AVERAGE bỏ qua ô không phải số", () => {
    expect(f("=SUM(B2:B5)").num).toBe(60); // "x" bị bỏ qua
    expect(f("=MIN(B2:B5)").num).toBe(10);
    expect(f("=MAX(B2:B5)").num).toBe(30);
    expect(f("=COUNT(B2:B5)").num).toBe(3);
    expect(f("=AVERAGE(B2:B5)").num).toBe(20);
  });
  it("COUNTA đếm ô không trống; MEDIAN", () => {
    expect(f("=COUNTA(B2:C5)").num).toBe(7);
    expect(f("=COUNT(B2:C5)").num).toBe(6);
    expect(f("=MEDIAN(B2:B5)").num).toBe(20);
    expect(f("=MEDIAN(10,20,30,40)").num).toBe(25);
  });
  it("đọc số kiểu Việt và kiểu Anh trong ô", () => {
    expect(f("=SUM(C2:C5)").num).toBe(1506.5);
  });
  it("vùng viết ngược/ô lẻ/nhiều đối số", () => {
    expect(f("=SUM(B5:B2)").num).toBe(60);
    expect(f("=SUM(B2,B3,5)").num).toBe(35);
    expect(f("=SUM(B2:B3;B5)").num).toBe(60);
    expect(f("=sum(b2:b3)").num).toBe(30);
  });
  it("AVERAGE/MEDIAN không có số → lỗi", () => {
    expect(f("=AVERAGE(A2:A5)").error).toBe("DIV0");
    expect(f("=MEDIAN(A2:A5)").error).toBe("VALUE");
    expect(f("=MIN(A2:A5)").num).toBe(0);
  });
});

describe("phép tính và IF/ROUND", () => {
  it("+ - * / có thứ tự ưu tiên, ngoặc, dấu âm", () => {
    expect(f("=1+2*3").num).toBe(7);
    expect(f("=(1+2)*3").num).toBe(9);
    expect(f("=-B2+5").num).toBe(-5);
    expect(f("=B3/B2").num).toBe(2);
    expect(f("=B2*C3").num).toBe(25);
    expect(f("=0.1+0.2").num).toBe(0.3);
  });
  it("ô trống tính là 0; ô chữ không phải số → #VALUE", () => {
    expect(f("=C4+1").num).toBe(1);
    expect(f("=B4+1").error).toBe("VALUE");
    expect(f("=B4+1").text).toBe("#VALUE");
  });
  it("ROUND", () => {
    expect(f("=ROUND(2.567,2)").num).toBe(2.57);
    expect(f("=ROUND(2.5)").num).toBe(3);
    expect(f("=ROUND(-2.5)").num).toBe(-3);
    expect(f("=ROUND(1234.5,-2)").num).toBe(1200);
    expect(f("=ROUND(AVERAGE(B2:B5),1)").num).toBe(20);
  });
  it("IF với so sánh số và chữ", () => {
    expect(f("=IF(B2>5,100,0)").num).toBe(100);
    expect(f("=IF(B2>=B3,1,2)").num).toBe(2);
    expect(f("=IF(SUM(B2:B3)=30,\"đủ\",\"thiếu\")").text).toBe("đủ");
    expect(f("=IF(A2=\"A\",1,0)").num).toBe(1);
    expect(f("=IF(B2<>10,1,0)").num).toBe(0);
    expect(f("=IF(0,1)").num).toBe(0);
  });
});

describe("lỗi", () => {
  it.each([
    ["=1/0", "DIV0"],
    ["=B2/(B3-20)", "DIV0"],
    ["=SUM(", "SYNTAX"],
    ["=1+", "SYNTAX"],
    ["=1 2", "SYNTAX"],
    ["=@", "SYNTAX"],
    ["=\"abc", "SYNTAX"],
    ["=FOO(1)", "NAME"],
    ["=SUM()", "ARGS"],
    ["=IF(1)", "ARGS"],
    ["=SUM(Z1)", "REF"],
    ["=SUM(B2:B99)", "REF"],
    ["=B2:B3", "VALUE"],
    ["=XYZ", "NAME"],
  ])("%s → %s", (formula, code) => expect(f(formula).error).toBe(code));
  it("lỗi lan theo tham chiếu", () => {
    const cells = [["=1/0", "=A1+1", "=SUM(A1:B1)"]];
    const ev = evalTable(T(cells));
    expect(ev.at(0, 1).error).toBe("DIV0");
    expect(ev.at(0, 2).error).toBe("DIV0");
  });
  it("tham chiếu vòng → #CYCLE (cả vòng trực tiếp và gián tiếp), ô khác vẫn tính", () => {
    const ev = evalTable(T([["=A1", "=C1", "=B1", "=1+1"]]));
    expect(ev.at(0, 0).error).toBe("CYCLE");
    expect(ev.at(0, 1).error).toBe("CYCLE");
    expect(ev.at(0, 2).error).toBe("CYCLE");
    expect(ev.at(0, 3).num).toBe(2);
  });
});

describe("ô tham chiếu ô công thức", () => {
  it("chuỗi phụ thuộc: tổng của tổng", () => {
    const cells = [
      ["1", "2", "=A1+B1"],
      ["3", "4", "=A2+B2"],
      ["", "", "=SUM(C1:C2)"],
    ];
    const ev = evalTable(T(cells));
    expect(ev.at(2, 2).num).toBe(10);
  });
  it("kết quả chữ không tính vào SUM", () => {
    const ev = evalTable(T([["=\"x\"", "5", "=SUM(A1:B1)"]]));
    expect(ev.at(0, 2).num).toBe(5);
  });
});

describe("displayCells", () => {
  it("không có công thức → trả nguyên bảng (không sao chép)", () => {
    const cells = [["a", "1"]];
    expect(displayCells(T(cells))).toBe(cells);
  });
  it("thay công thức bằng kết quả hiển thị, giữ nguyên ô thường", () => {
    const out = displayCells(T([["1.000", "2.000", "=A1+B1"], ["", "", "=A1/0"]]));
    expect(out[0]![2]).toBe("3.000");
    expect(out[1]![2]).toBe("#DIV/0");
    expect(out[0]![0]).toBe("1.000");
  });
  it("số thập phân hiển thị gọn, tối đa 6 chữ số lẻ", () => {
    expect(displayCells(T([["=1/3"]]))[0]![0]).toBe("0,333333");
    expect(displayCells(T([["=2.50"]]))[0]![0]).toBe("2,5");
  });
});

describe("hiệu năng", () => {
  it("bảng 1000×10 với 1000 ô SUM vùng dài tính trong thời gian hợp lý", () => {
    const rows = 1000;
    const cells = Array.from({ length: rows }, (_, r) => [String(r), String(r * 2), "3", "4", "5", "6", "7", "8", "9", r === rows - 1 ? "=SUM(A1:I999)" : `=A${r + 1}+B${r + 1}`]);
    const t0 = performance.now();
    const ev = evalTable(T(cells));
    for (let r = 0; r < rows; r++) ev.at(r, 9);
    expect(performance.now() - t0).toBeLessThan(1500);
    expect(ev.at(rows - 1, 9).num).toBeGreaterThan(0);
  });
});

import { shiftFormulaRefs, shiftCells } from "./formula";
import { createDraft, deleteColumn, deleteRow, insertColumn, insertRow, tableFromGrid } from "./table";

describe("chèn/xoá hàng-cột cập nhật tham chiếu", () => {
  it("chèn hàng: ô và vùng từ hàng chèn trở xuống dịch xuống; chèn giữa vùng thì vùng nở", () => {
    expect(shiftFormulaRefs("=SUM(B2:B6)", "row", 3, "insert")).toBe("=SUM(B2:B7)");
    expect(shiftFormulaRefs("=SUM(B2:B6)", "row", 1, "insert")).toBe("=SUM(B3:B7)");
    expect(shiftFormulaRefs("=SUM(B2:B6)", "row", 6, "insert")).toBe("=SUM(B2:B6)");
    expect(shiftFormulaRefs("=A1+A5", "row", 2, "insert")).toBe("=A1+A6");
  });
  it("xoá hàng: dịch lên, vùng co lại, ô bị xoá → #REF", () => {
    expect(shiftFormulaRefs("=SUM(B2:B6)", "row", 3, "delete")).toBe("=SUM(B2:B5)");
    expect(shiftFormulaRefs("=SUM(B2:B6)", "row", 0, "delete")).toBe("=SUM(B1:B5)");
    expect(shiftFormulaRefs("=B3+1", "row", 2, "delete")).toBe("=#REF+1");
    expect(shiftFormulaRefs("=B2:B3", "row", 1, "delete")).toBe("=B2:B2");
    expect(shiftFormulaRefs("=SUM(B3:B3)", "row", 2, "delete")).toBe("=SUM(#REF)");
  });
  it("cột: chèn/xoá tương tự, tên cột kiểu AA", () => {
    expect(shiftFormulaRefs("=SUM(B2:C2)", "col", 1, "insert")).toBe("=SUM(C2:D2)");
    expect(shiftFormulaRefs("=Z1", "col", 5, "insert")).toBe("=AA1");
    expect(shiftFormulaRefs("=SUM(B2:D2)", "col", 2, "delete")).toBe("=SUM(B2:C2)");
  });
  it("không đụng chuỗi chữ, tên hàm giống địa chỉ, chữ thường, $", () => {
    expect(shiftFormulaRefs('=IF(A2>1,"B2",B2)', "row", 0, "insert")).toBe('=IF(A3>1,"B2",B3)');
    expect(shiftFormulaRefs("=LOG10(A2)", "row", 0, "insert")).toBe("=LOG10(A3)");
    expect(shiftFormulaRefs("=sum(b2:b3)", "row", 0, "insert")).toBe("=sum(b3:b4)");
    expect(shiftFormulaRefs("=$B$2+B2", "row", 0, "insert")).toBe("=$B$3+B3");
  });
  it("giữ thứ tự đầu-cuối người dùng gõ", () => {
    expect(shiftFormulaRefs("=SUM(B5:B2)", "row", 0, "insert")).toBe("=SUM(B6:B3)");
  });
  it("shiftCells giữ nguyên ô thường và trả lại cùng mảng khi không có công thức", () => {
    const plain = [["a", "1"]];
    expect(shiftCells(plain, "row", 0, "insert")).toBe(plain);
  });
  it("trên bảng thật: chèn hàng phía trên vùng tổng → tổng vẫn đúng; xoá cột trước → vẫn đúng", () => {
    let d = createDraft(tableFromGrid("t", [["x", "10"], ["y", "20"], ["tổng", "=SUM(B1:B2)"]]));
    const total = (dd: typeof d, r: number, c: number) => evalTable(dd.table).at(r, c).num;
    d = insertRow(d, 0); // hàng mới trên cùng
    expect(d.table.cells[3]![1]).toBe("=SUM(B2:B3)");
    expect(total(d, 3, 1)).toBe(30);
    d = insertColumn(d, 0); // cột mới bên trái
    expect(d.table.cells[3]![2]).toBe("=SUM(C2:C3)");
    expect(total(d, 3, 2)).toBe(30);
    d = deleteColumn(d, 0);
    d = deleteRow(d, 0);
    expect(d.table.cells[2]![1]).toBe("=SUM(B1:B2)");
    expect(total(d, 2, 1)).toBe(30);
    d = deleteRow(d, 0); // xoá hàng đầu của vùng: vùng co lại
    expect(d.table.cells[1]![1]).toBe("=SUM(B1:B1)");
    expect(total(d, 1, 1)).toBe(20);
  });
});
