import { describe, expect, it } from "vitest";
import { formatNumber, parseNumber } from "./numberParse";

describe("parseNumber", () => {
  it.each([
    ["12", 12],
    ["-3.5", -3.5],
    ["+7", 7],
    ["1.234,5", 1234.5],
    ["1,234.5", 1234.5],
    ["1.234.567", 1234567],
    ["1,234,567", 1234567],
    ["1.234", 1234],
    ["1,5", 1.5],
    ["0.125", 0.125],
    ["12%", 12],
    ["  1 234 ", 1234],
    ["5.000₫", 5000],
    ["$9.99", 9.99],
    [".5", 0.5],
  ])("%s → %s", (raw, want) => expect(parseNumber(raw)).toBe(want));

  it.each(["", "  ", "abc", "1.2.3,4", "12a", "--1", ".", ",", "1,23,456", "1..2"])("không phải số: %j", (raw) => expect(parseNumber(raw)).toBeNull());
});

describe("formatNumber", () => {
  it("bỏ số 0 thừa, dùng dấu nghìn", () => {
    expect(formatNumber(1234.5, 2, "en-US")).toBe("1,234.5");
    expect(formatNumber(3, 2, "en-US")).toBe("3");
  });
});
