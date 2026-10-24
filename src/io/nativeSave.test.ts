import { afterEach, describe, expect, it } from "vitest";
import { nativeSaveBlob } from "./nativeFs";

type Fake = {
  os: { showSaveDialog: (t?: string, o?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string> };
  filesystem: { writeBinaryFile: (p: string, d: ArrayBuffer) => Promise<void> };
};
const g = globalThis as unknown as { window?: { Neutralino?: Fake } };

function install(pick: string, writes: { path: string; bytes: number[] }[], seen: { path?: string; filters?: unknown }[]): void {
  g.window = {
    Neutralino: {
      os: {
        showSaveDialog: async (_t, o) => {
          seen.push({ path: o?.defaultPath, filters: o?.filters });
          return pick;
        },
      },
      filesystem: { writeBinaryFile: async (p, d) => void writes.push({ path: p, bytes: Array.from(new Uint8Array(d)) }) },
    },
  };
}
afterEach(() => {
  delete g.window;
});

describe("nativeSaveBlob (hộp thoại Lưu của bản exe)", () => {
  it("hỏi đường dẫn với tên gợi ý và bộ lọc theo đuôi, rồi ghi đúng nội dung", async () => {
    const writes: { path: string; bytes: number[] }[] = [];
    const seen: { path?: string; filters?: unknown }[] = [];
    install("D:\\Báo cáo\\bang.csv", writes, seen);
    const out = await nativeSaveBlob("a,b\n1,2", "bang.csv");
    expect(out).toBe("D:\\Báo cáo\\bang.csv");
    expect(seen[0]!.path).toBe("bang.csv");
    expect(seen[0]!.filters).toEqual([{ name: "Tệp .csv", extensions: ["csv"] }, { name: "Mọi tệp", extensions: ["*"] }]);
    expect(new TextDecoder().decode(new Uint8Array(writes[0]!.bytes))).toBe("a,b\n1,2");
  });
  it("ghi cả blob nhị phân (PNG/Excel) đúng từng byte", async () => {
    const writes: { path: string; bytes: number[] }[] = [];
    install("C:\\x.png", writes, []);
    await nativeSaveBlob(new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])]), "x.png");
    expect(writes[0]!.bytes).toEqual([137, 80, 78, 71, 0, 255]);
  });
  it("bấm Huỷ thì không ghi gì và trả null", async () => {
    const writes: { path: string; bytes: number[] }[] = [];
    install("", writes, []);
    expect(await nativeSaveBlob("x", "a.svg")).toBeNull();
    expect(writes).toHaveLength(0);
  });
  it("tên không có đuôi vẫn lưu được; không chạy trong exe thì báo lỗi", async () => {
    const seen: { path?: string; filters?: unknown }[] = [];
    install("C:\\f", [], seen);
    await nativeSaveBlob("x", "khong-duoi");
    expect(seen[0]!.filters).toEqual([{ name: "Mọi tệp", extensions: ["*"] }]);
    delete g.window;
    await expect(nativeSaveBlob("x", "a.txt")).rejects.toThrow("Không chạy trong bản exe");
  });
});
