import { describe, it, expect } from "vitest";
import { toSafeUrl } from "./safeUrl";

describe("toSafeUrl", () => {
  it("cho phep http/https/mailto", () => {
    expect(toSafeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(toSafeUrl("http://example.com")).toBe("http://example.com/");
    expect(toSafeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
  });
  it("them https cho link thieu scheme", () => {
    expect(toSafeUrl("example.com/x")).toBe("https://example.com/x");
    expect(toSafeUrl("localhost:3000/a")).toBe("https://localhost:3000/a");
  });
  it("chan scheme nguy hiem", () => {
    expect(toSafeUrl("javascript:alert(1)")).toBeNull();
    expect(toSafeUrl("  JaVaScRiPt:alert(1)")).toBeNull();
    expect(toSafeUrl("data:text/html,<script>1</script>")).toBeNull();
    expect(toSafeUrl("file:///etc/passwd")).toBeNull();
    expect(toSafeUrl("vbscript:x")).toBeNull();
  });
  it("rong / null -> null", () => {
    expect(toSafeUrl("")).toBeNull();
    expect(toSafeUrl("   ")).toBeNull();
    expect(toSafeUrl(null)).toBeNull();
    expect(toSafeUrl(undefined)).toBeNull();
  });
});
