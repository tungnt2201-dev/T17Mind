import { describe, it, expect } from "vitest";
import { PALETTE_COMMANDS, filterCommands, type CommandHost } from "./commandPalette";

describe("KW2 — bảng lệnh Ctrl+K", () => {
  it("id không trùng; mọi lệnh có tên", () => {
    const ids = PALETTE_COMMANDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PALETTE_COMMANDS.every((c) => c.title.trim().length > 0)).toBe(true);
  });

  it("lọc không dấu, mọi từ phải có; tên xếp trước từ khoá phụ; rỗng = danh sách đầu", () => {
    expect(filterCommands("hoan tac").map((c) => c.id)).toEqual(["undo"]);
    expect(filterCommands("LUU").map((c) => c.id).slice(0, 2)).toEqual(["save", "saveAs"]);
    expect(filterCommands("bo cuc tree").map((c) => c.id)).toEqual(["layout:treeDown", "layout:treeUp"]);
    expect(filterCommands("word").map((c) => c.id)).toContain("exportDoc"); // qua từ khoá phụ
    expect(filterCommands("khong co lenh nay")).toEqual([]);
    expect(filterCommands("").length).toBeGreaterThan(10);
    expect(filterCommands("", undefined, 3)).toHaveLength(3);
  });

  it("chạy lệnh gọi đúng việc trên host", () => {
    const calls: string[] = [];
    const host = new Proxy({}, { get: (_t, prop: string) => (...args: unknown[]) => calls.push(`${prop}${args.length ? `(${args.join(",")})` : ""}`) }) as CommandHost;
    for (const id of ["undo", "fitView", "layout:orgChart", "exportDoc", "newMap"]) PALETTE_COMMANDS.find((c) => c.id === id)!.run(host);
    expect(calls).toEqual(["undo", "fitView", "setLayout(orgChart)", "exportDocument", "newMap"]);
  });
});
