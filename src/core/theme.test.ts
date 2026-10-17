import { describe, it, expect } from "vitest";
import {
  THEMES,
  colorForDepth,
  colorForBranchDepth,
  branchLightenFactor,
  pickTextColor,
  lightenHex,
  computeThemedStyleForNode,
  hexToRgb,
  rgbToHsl,
} from "./theme";
import { createEmptyMap, createNode } from "./tree";
import type { MindMap, MindNode } from "./types";

const BLUE = THEMES.find((t) => t.id === "professional-blue")!;
const RAINBOW = THEMES.find((t) => t.id === "branch-colors")!;
const MONO = THEMES.find((t) => t.id === "monochrome")!;

describe("THEMES (P2.12 — 10 bộ theme mới theo trào lưu mỹ thuật)", () => {
  it("có đúng 14 theme (4 gốc + 10 mới), id không trùng nhau", () => {
    expect(THEMES.length).toBe(14);
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("mọi theme không phải perBranch đều có ĐÚNG 4 levels, mỗi level có fill+color hợp lệ", () => {
    for (const theme of THEMES) {
      if (theme.perBranch) continue;
      expect(theme.levels.length).toBe(4);
      for (const level of theme.levels) {
        expect(level.fill).toMatch(/^#[0-9a-f]{6}$/i);
        expect(level.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("10 theme mới (P2.12) đều tồn tại đúng id đã đặt", () => {
    const expectedIds = [
      "renaissance",
      "baroque",
      "ukiyo-e",
      "impressionism",
      "bauhaus",
      "art-deco",
      "constructivism",
      "memphis",
      "scandinavian",
      "vaporwave",
    ];
    for (const id of expectedIds) {
      expect(THEMES.some((t) => t.id === id)).toBe(true);
    }
  });
});

describe("colorForDepth (P2.11 — tiệm cận mũ, không đông cứng)", () => {
  it("depth trong phạm vi levels[] có sẵn -> trả về ĐÚNG y hệt giá trị cũ (không đổi hành vi hiện có)", () => {
    for (let d = 0; d < BLUE.levels.length; d++) {
      expect(colorForDepth(BLUE, d)).toEqual(BLUE.levels[d]);
    }
  });

  it("không đông cứng ngay lập tức như bug cũ: hàng chục cấp liên tiếp đều cho màu KHÁC NHAU", () => {
    // LƯU Ý: không gian màu hex 24-bit là HỮU HẠN — ở độ sâu cực lớn hai
    // cấp cuối cùng vẫn có thể trùng màu do làm tròn (giới hạn vật lý,
    // xem ghi chú đầu theme.ts), nên bài test này KHÔNG đòi hỏi phân
    // biệt được ở "vô hạn" cấp theo nghĩa đen — chỉ xác nhận việc sửa
    // bug thật: trước đây MỌI cấp >= 4 đông cứng NGAY LẬP TỨC vào đúng
    // một màu (levels[3]); giờ hàng chục cấp liên tiếp vẫn còn phân
    // biệt được, một cải thiện rõ rệt so với "đông cứng từ cấp 4".
    const seen = new Set<string>();
    for (let d = 0; d < 40; d++) {
      const { fill } = colorForDepth(BLUE, d);
      expect(seen.has(fill)).toBe(false);
      seen.add(fill);
    }
  });

  it("không có mốc đông cứng CỐ ĐỊNH nào — hai cấp liền kề vẫn khác nhau dù ở độ sâu rất lớn", () => {
    // Khác bug cũ (đông cứng NGAY từ cấp 4, cấp 4 và cấp 4000 giống hệt
    // nhau) — nay vẫn còn phân biệt được (nhờ hue trôi liên tục) tại
    // những độ sâu lớn hơn RẤT NHIỀU so với 4 mức cố định ban đầu.
    const near = colorForDepth(BLUE, 500);
    const further = colorForDepth(BLUE, 501);
    expect(near.fill).not.toBe(further.fill);
  });

  it("độ sâu âm được kẹp về 0, không ném lỗi", () => {
    expect(colorForDepth(BLUE, -5)).toEqual(colorForDepth(BLUE, 0));
  });

  it("Mono không trôi hue dù ở cấp rất sâu — giữ ĐÚNG sắc thái trung tính gốc (không phải xám tuyệt đối, xem THEMES), chỉ sáng dần lên", () => {
    const baseLevel = MONO.levels[MONO.levels.length - 1] as { fill: string };
    const { r: br, g: bg, b: bb } = hexToRgb(baseLevel.fill);
    const { h: baseHue } = rgbToHsl(br, bg, bb);
    for (let d = 4; d < 60; d += 8) {
      const { fill } = colorForDepth(MONO, d);
      const { r, g, b } = hexToRgb(fill);
      const { h } = rgbToHsl(r, g, b);
      // Mono cố ý KHÔNG bật hueDrift -> hue phải giữ NGUYÊN như base, chỉ
      // độ sáng (L) tăng dần theo độ sâu (khác Blue/Pastel, vốn hue trôi
      // liên tục để tạo thêm dấu hiệu phân biệt phụ). Sai số nhỏ chấp
      // nhận được — khi màu gần bão hoà trắng (saturation rất thấp), một
      // sai số làm tròn 8-bit nhỏ ở R/G/B có thể lệch hue vài độ dù mắt
      // không nhận ra khác biệt nào (bản chất hue kém ổn định khi gần
      // achromatic — KHÔNG phải hueDrift đang ngầm hoạt động).
      expect(Math.abs(h - baseHue)).toBeLessThan(6);
    }
  });

  it("Blue/Pastel (hueDrift bật) CÓ trôi hue theo độ sâu — khác hẳn Mono", () => {
    const PASTEL = THEMES.find((t) => t.id === "warm-pastel")!;
    for (const theme of [BLUE, PASTEL]) {
      const { fill: fillNear } = colorForDepth(theme, 10);
      const { fill: fillFar } = colorForDepth(theme, 30);
      const { r: r1, g: g1, b: b1 } = hexToRgb(fillNear);
      const { r: r2, g: g2, b: b2 } = hexToRgb(fillFar);
      const { h: h1 } = rgbToHsl(r1, g1, b1);
      const { h: h2 } = rgbToHsl(r2, g2, b2);
      expect(Math.abs(h1 - h2)).toBeGreaterThan(5);
    }
  });

  it("theme rỗng levels (phòng thủ) trả về giá trị mặc định an toàn, không crash", () => {
    expect(colorForDepth({ id: "x", name: "x", levels: [] }, 3)).toEqual({
      fill: "#ffffff",
      color: "#1f2933",
    });
  });
});

describe("branchLightenFactor (P2.11 — Rainbow tiệm cận mũ)", () => {
  it("depth 0..3 giữ nguyên công thức tuyến tính cũ (không đổi hành vi hiện có ở cấp nông)", () => {
    expect(branchLightenFactor(0)).toBeCloseTo(0, 5);
    expect(branchLightenFactor(1)).toBeCloseTo(0.22, 5);
    expect(branchLightenFactor(2)).toBeCloseTo(0.44, 5);
    expect(branchLightenFactor(3)).toBeCloseTo(0.66, 5);
  });

  it("vượt cấp 3: không còn bị chặn cứng ở 0.75 — tiếp tục tăng, tiệm cận 1", () => {
    const f4 = branchLightenFactor(4);
    const f5 = branchLightenFactor(5);
    const f50 = branchLightenFactor(50);
    expect(f4).toBeGreaterThan(0.66);
    expect(f5).toBeGreaterThan(f4);
    expect(f50).toBeGreaterThan(f5);
    expect(f50).toBeLessThan(1);
  });

  it("hai cấp sâu liền kề (vd 40 và 41) không còn cho ra ĐÚNG cùng một hệ số nữa", () => {
    expect(branchLightenFactor(40)).not.toBe(branchLightenFactor(41));
  });
});

describe("colorForBranchDepth (P2.11 — màu THẬT SỰ dùng để vẽ nhánh Rainbow)", () => {
  const HUE = "#2f9bed"; // một màu bất kỳ trong BRANCH_PALETTE

  it("depth 0..3 khớp ĐÚNG byte-for-byte công thức cũ lightenHex(hue, depth*0.22) (không đổi hành vi hiện có)", () => {
    for (let d = 0; d <= 3; d++) {
      const expectedFill = lightenHex(HUE, d * 0.22);
      expect(colorForBranchDepth(HUE, d).fill).toBe(expectedFill);
    }
  });

  it("vượt cấp 3: KHÔNG trắng xoá nhanh như lightenHex thẳng-tới-trắng cũ — vẫn còn giữ được sắc thái nhánh ở cấp 20-30", () => {
    const atDepth25 = colorForBranchDepth(HUE, 25);
    // Cách cũ (lightenHex thẳng, chặn ở 0.75): mọi cấp >= ~8 đã gần như trắng tinh (#fefeff...).
    // Cách mới: vẫn còn phân biệt được rõ ràng so với trắng tuyệt đối.
    expect(atDepth25.fill).not.toBe("#ffffff");
    const { r, g, b } = hexToRgb(atDepth25.fill);
    expect(Math.min(r, g, b)).toBeLessThan(250); // còn cách trắng tuyệt đối một khoảng đáng kể
  });

  it("nhiều cấp liên tiếp trong cùng một nhánh vẫn phân biệt được (không đông cứng như bug cũ)", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 40; d++) {
      const { fill } = colorForBranchDepth(HUE, d);
      expect(seen.has(fill)).toBe(false);
      seen.add(fill);
    }
  });

  it("màu chữ tương phản luôn nhất quán với chính fill vừa tính (qua pickTextColor)", () => {
    for (let d = 0; d < 30; d += 3) {
      const style = colorForBranchDepth(HUE, d);
      expect(style.color).toBe(pickTextColor(style.fill));
    }
  });
});

describe("pickTextColor (P2.11 — tương phản tự động theo YIQ)", () => {
  it("khớp đúng lựa chọn màu chữ đã hardcode từ trước cho từng cấp của cả 4 theme", () => {
    for (const theme of THEMES) {
      for (const level of theme.levels) {
        expect(pickTextColor(level.fill)).toBe(level.color);
      }
    }
  });

  it("nền rất sáng -> chữ tối; nền rất tối -> chữ trắng", () => {
    expect(pickTextColor("#ffffff")).toBe("#1f2933");
    expect(pickTextColor("#000000")).toBe("#ffffff");
  });
});

describe("computeThemedStyleForNode (P2.11 — auto-inherit khi tạo node mới)", () => {
  function buildMap(): { map: MindMap; child1: MindNode; grandchild: MindNode } {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const child1 = createNode("Nhánh 1", root.id);
    map.nodes[child1.id] = child1;
    root.children.push(child1.id);
    const child2 = createNode("Nhánh 2", root.id);
    map.nodes[child2.id] = child2;
    root.children.push(child2.id);
    const grandchild = createNode("Cháu", child1.id);
    map.nodes[grandchild.id] = grandchild;
    child1.children.push(grandchild.id);
    return { map, child1, grandchild };
  }

  it("theme theo cấp (Blue): độ sâu tính đúng từ gốc, khớp colorForDepth", () => {
    const { map, child1, grandchild } = buildMap();
    expect(computeThemedStyleForNode(map, map.rootId, BLUE)).toEqual(colorForDepth(BLUE, 0));
    expect(computeThemedStyleForNode(map, child1.id, BLUE)).toEqual(colorForDepth(BLUE, 1));
    expect(computeThemedStyleForNode(map, grandchild.id, BLUE)).toEqual(colorForDepth(BLUE, 2));
  });

  it("theme Rainbow: gốc luôn nhận màu trung tính cố định", () => {
    const { map } = buildMap();
    expect(computeThemedStyleForNode(map, map.rootId, RAINBOW)).toEqual({
      fill: "#14162b",
      color: "#ffffff",
    });
  });

  it("theme Rainbow: hai nhánh cấp-1 khác nhau nhận màu KHÁC NHAU từ BRANCH_PALETTE", () => {
    const map = createEmptyMap("Gốc");
    const root = map.nodes[map.rootId] as MindNode;
    const a = createNode("A", root.id);
    map.nodes[a.id] = a;
    root.children.push(a.id);
    const b = createNode("B", root.id);
    map.nodes[b.id] = b;
    root.children.push(b.id);

    const styleA = computeThemedStyleForNode(map, a.id, RAINBOW);
    const styleB = computeThemedStyleForNode(map, b.id, RAINBOW);
    expect(styleA.fill).not.toBe(styleB.fill);
  });

  it("theme Rainbow: cháu trong CÙNG nhánh dùng đúng hue của nhánh đó, chỉ nhạt dần thêm", () => {
    const { map, child1, grandchild } = buildMap();
    const styleChild = computeThemedStyleForNode(map, child1.id, RAINBOW);
    const styleGrandchild = computeThemedStyleForNode(map, grandchild.id, RAINBOW);
    expect(styleChild.fill).not.toBe(styleGrandchild.fill);
    // Cháu sâu hơn => hệ số nhạt lớn hơn => brightness (theo YIQ) không nhỏ hơn của cha.
    const brightnessOf = (hex: string): number => {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    expect(brightnessOf(styleGrandchild.fill)).toBeGreaterThanOrEqual(brightnessOf(styleChild.fill));
  });

  it("nhánh trôi (không có cha) được coi là gốc của chính nó — depth 0", () => {
    const map = createEmptyMap("Gốc");
    const floating = createNode("Nhánh trôi", null);
    map.nodes[floating.id] = floating;
    expect(computeThemedStyleForNode(map, floating.id, BLUE)).toEqual(colorForDepth(BLUE, 0));
  });
});

describe("lightenHex (giữ nguyên hành vi cũ, chỉ đổi cách hiện thực bên trong)", () => {
  it("factor 0 trả về đúng màu gốc, factor càng lớn càng sáng dần", () => {
    expect(lightenHex("#2f6fed", 0)).toBe("#2f6fed");
    const lighter = lightenHex("#2f6fed", 0.5);
    expect(lighter).not.toBe("#2f6fed");
  });
});
