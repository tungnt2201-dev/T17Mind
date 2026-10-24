import { describe, expect, it } from "vitest";
import { packLabelRows, type RowItem } from "./labelRows";

interface It extends RowItem {
  name: string;
  w: number;
}
const tag = (name: string, w = 50): It => ({ name, kind: "tag", w, gapAfter: 12 });
const chip = (name: string, w = 60): It => ({ name, kind: "chip", w, gapAfter: 4 });
const more: It = { name: "…", kind: "chip", w: 14, gapAfter: 0 };
const pack = (items: It[], avail: number, maxRows = 4) => packLabelRows(items, (i) => i.w, avail, maxRows, more).map((r) => r.map((i) => i.name));

describe("packLabelRows", () => {
  it("vừa một dòng thì một dòng", () => {
    expect(pack([tag("A"), chip("a1"), chip("a2")], 400)).toEqual([["A", "a1", "a2"]]);
  });
  it("hết chỗ thì xuống dòng; mỗi Tag mới bắt đầu dòng khi không còn vừa", () => {
    const items = [tag("A"), chip("a1"), chip("a2"), tag("B"), chip("b1")];
    expect(pack(items, 400)).toEqual([["A", "a1", "a2", "B", "b1"]]);
    expect(pack(items, 190)).toEqual([["A", "a1", "a2"], ["B", "b1"]]);
  });
  it("Tag luôn đi cùng thẻ đầu tiên của nó, không bị bỏ lại cuối dòng", () => {
    // A + a1 = 114 vừa; thêm B (50) → 114 + 12 + 50 = 176 vừa; nhưng B + b1 là một đơn vị (50+4+60 = 114) → 240 > 200 → xuống dòng cả cặp.
    expect(pack([tag("A"), chip("a1"), tag("B"), chip("b1")], 200)).toEqual([["A", "a1"], ["B", "b1"]]);
  });
  it("Tag không có thẻ nào đi một mình; thẻ quá rộng nằm riêng một dòng", () => {
    expect(pack([tag("A"), tag("B"), tag("C")], 130)).toEqual([["A", "B"], ["C"]]);
    expect(pack([chip("dai", 500)], 100)).toEqual([["dai"]]);
  });
  it("quá số dòng tối đa thì cắt và thêm viên '…' ở cuối dòng cuối", () => {
    const items = [tag("A"), chip("a1"), tag("B"), chip("b1"), tag("C"), chip("c1")];
    expect(pack(items, 120, 2)).toEqual([["A", "a1"], ["B", "b1", "…"]]);
  });
  it("không có viên nào → không có dòng", () => {
    expect(pack([], 200)).toEqual([]);
  });
});
