import { describe, it, expect } from "vitest";
import { parseThemeFile, themeFileContent } from "./userLibrary";

describe("File theme .t17theme", () => {
  it("xuất rồi nhập lại: giữ màu, cấp id mới (không ghi đè theme đang có)", () => {
    const t = { id: "theme_1", name: "Biển", levels: [{ fill: "#0055aa", color: "#ffffff" }], hueDrift: true, custom: true };
    const text = themeFileContent(t);
    expect(JSON.parse(text)).toMatchObject({ format: "t17mind-theme", version: 1, theme: { name: "Biển" } });
    const back = parseThemeFile(text)!;
    expect(back).toMatchObject({ name: "Biển", levels: t.levels, hueDrift: true, custom: true });
    expect(back.id).not.toBe("theme_1");
    expect(back.id).toMatch(/^theme_[a-z0-9]+$/);
  });

  it("nhận cả JSON theme trần; từ chối file lạ", () => {
    expect(parseThemeFile(JSON.stringify({ id: "x", name: "Trần", levels: [{ fill: "#123456" }] }))!.name).toBe("Trần");
    expect(parseThemeFile("không phải json")).toBeNull();
    expect(parseThemeFile(JSON.stringify({ format: "t17mind-theme", theme: { name: "thiếu id" } }))).toBeNull();
  });
});
