import { describe, it, expect } from "vitest";
import { formatFromPath, ensureExtension, dirOf, baseName, joinPath, suggestBaseName, formatOrder, FORMATS } from "./fileFormats";

describe("Định dạng & đường dẫn file", () => {
  it("nhận định dạng theo đuôi, không phân biệt hoa thường", () => {
    expect(formatFromPath("C:\\Docs\\Kế hoạch.T17M")).toBe("t17m");
    expect(formatFromPath("/home/a/map.json")).toBe("json");
    expect(formatFromPath("ghi chu.markdown")).toBe("md");
    expect(formatFromPath("outline.xml")).toBe("opml");
    expect(formatFromPath("C:\\a.b\\khong-duoi")).toBeNull();
    expect(formatFromPath("anh.jpg")).toBeNull();
  });

  it("thêm đuôi khi người dùng gõ tên không có đuôi", () => {
    expect(ensureExtension("C:\\Docs\\ban do", "t17m")).toBe("C:\\Docs\\ban do.t17m");
    expect(ensureExtension("C:\\Docs\\ban do.png", "t17m")).toBe("C:\\Docs\\ban do.png");
    expect(ensureExtension("v1.2", "json")).toBe("v1.2.json");
  });

  it("thư mục / tên file / ghép đường dẫn cho cả Windows và kiểu /", () => {
    expect(dirOf("C:\\Users\\Tung\\map.t17m")).toBe("C:\\Users\\Tung");
    expect(dirOf("C:\\map.t17m")).toBe("C:\\");
    expect(dirOf("/home/tung/map.json")).toBe("/home/tung");
    expect(dirOf("/map.json")).toBe("/");
    expect(dirOf("map.json")).toBe("");
    expect(baseName("C:\\a\\b c.json")).toBe("b c.json");
    expect(joinPath("C:\\Apps\\T17Mind", "Bản đồ.t17m")).toBe("C:\\Apps\\T17Mind\\Bản đồ.t17m");
    expect(joinPath("C:\\", "x.json")).toBe("C:\\x.json");
    expect(joinPath("/home/tung", "x.json")).toBe("/home/tung/x.json");
    expect(joinPath("", "x.json")).toBe("x.json");
  });

  it("tên file gợi ý bỏ ký tự Windows cấm", () => {
    expect(suggestBaseName('Kế hoạch: Q1/2026 "mới"?')).toBe("Kế hoạch Q1 2026 mới");
    expect(suggestBaseName("   ")).toBe("T17Mind");
    expect(suggestBaseName("a.")).toBe("a");
    expect(suggestBaseName("x".repeat(200))).toHaveLength(80);
  });

  it("thứ tự định dạng trong hộp thoại: định dạng chọn sẵn lên đầu", () => {
    const all = formatOrder("png");
    expect(all[0]).toBe("png");
    expect(new Set(all).size).toBe(Object.keys(FORMATS).length);
    expect(formatOrder("json", true)).toEqual(["json", "t17m", "xlsx", "xmind", "opml", "md"]);
    expect(formatFromPath("Báo cáo.DOCX")).toBe("docx");
    expect(formatFromPath("tai lieu.zip")).toBe("zip");
  });
});
