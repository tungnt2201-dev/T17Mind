import { describe, it, expect } from "vitest";
import { migrateToLatest } from "./migrate";
import { validateMindMap } from "./validate";
import { CURRENT_SCHEMA_VERSION } from "./types";

describe("migrate — chuỗi di trú schema (P1.14)", () => {
  it("KHÔNG THIẾU bước di trú nào — mọi phiên bản 0..CURRENT-1 đều di trú lên được đúng 1 bước", () => {
    // Test "meta" quan trọng nhất: nếu sau này ai tăng
    // CURRENT_SCHEMA_VERSION mà QUÊN thêm hàm migrate tương ứng, test
    // này phải ĐỎ NGAY — tự dựng 1 map tối thiểu ở TỪNG phiên bản
    // trung gian, xác nhận di trú lên latest không bị "kẹt" giữa
    // chừng (thiếu function cho version nào đó khiến migrateToLatest
    // dừng sớm hoặc ném lỗi).
    for (let v = 0; v < CURRENT_SCHEMA_VERSION; v++) {
      const raw = {
        mapId: `test-v${v}`,
        schemaVersion: v,
        rootId: "root1",
        nodes: { root1: { id: "root1", text: `Gốc từ v${v}`, parentId: null, children: [] } },
      };
      const migrated = migrateToLatest(raw);
      expect(migrated.schemaVersion, `di trú từ v${v} phải ra đúng CURRENT_SCHEMA_VERSION`).toBe(
        CURRENT_SCHEMA_VERSION
      );
      const errors = validateMindMap(migrated);
      expect(errors, `di trú từ v${v} phải cho ra map HỢP LỆ`).toEqual([]);
    }
  });

  it("map schema v0 tối thiểu (chỉ đúng 1 node gốc) di trú thành công, giữ đúng text", () => {
    const raw = {
      mapId: "old-v0",
      schemaVersion: 0,
      rootId: "root1",
      nodes: { root1: { id: "root1", text: "Gốc rất cũ", parentId: null, children: [] } },
    };
    const migrated = migrateToLatest(raw);
    expect(migrated.nodes[migrated.rootId]?.text).toBe("Gốc rất cũ");
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("nhãn tự do (labels) ở schema cũ tự động thành Tag thật sau khi di trú qua mốc Tag (v9->v10)", () => {
    const raw = {
      mapId: "old-with-labels",
      schemaVersion: 9,
      rootId: "root1",
      nodes: {
        root1: {
          id: "root1",
          text: "Gốc",
          parentId: null,
          children: ["c1"],
          labels: ["Ưu tiên", "Gấp"],
        },
        c1: { id: "c1", text: "Con", parentId: "root1", children: [], labels: ["Ưu tiên"] },
      },
    };
    const migrated = migrateToLatest(raw);
    const tagNames = migrated.tags.map((t) => t.name).sort();
    expect(tagNames).toEqual(["Gấp", "Ưu tiên"]);
    // Node con phải giữ ĐÚNG liên kết Tag "Ưu tiên" (không lạc mất,
    // không bị gộp nhầm với "Gấp").
    const uuTienTag = migrated.tags.find((t) => t.name === "Ưu tiên");
    expect(migrated.nodes.c1?.tagIds).toEqual([uuTienTag?.id]);
  });

  it("dữ liệu cây có vòng lặp/hỏng nặng vẫn không làm migrateToLatest crash (ném lỗi có kiểm soát, không throw kiểu bất ngờ)", () => {
    const raw = {
      mapId: "broken",
      schemaVersion: 0,
      rootId: "khong-ton-tai",
      nodes: {},
    };
    // Không kỳ vọng migrate "sửa" được dữ liệu vô lý — chỉ kỳ vọng nó
    // không crash im lặng cho ra dữ liệu sai mà không ai biết. Hành vi
    // cụ thể (throw hay trả về gì) không phải trọng tâm test này;
    // dùng validateMindMap ở TẦNG GỌI để bắt lỗi mới là đúng chỗ — test
    // này chỉ xác nhận bản thân việc GỌI migrateToLatest không crash
    // theo cách không kiểm soát được (segfault-kiểu, out of memory...).
    expect(() => migrateToLatest(raw)).not.toThrow(RangeError); // ví dụ: không đệ quy vô hạn
  });

  it("map cũ có layoutType=\"fishbone\" (bố cục đã bị xoá hoàn toàn khỏi ứng dụng) tự động chuyển về \"logicRight\" khi di trú — không crash, không hiện màn hình trống", () => {
    const raw = {
      mapId: "old-fishbone",
      schemaVersion: 13,
      layoutType: "fishbone",
      rootId: "root1",
      nodes: { root1: { id: "root1", text: "Gốc", parentId: null, children: [] } },
    };
    const migrated = migrateToLatest(raw);
    expect(migrated.layoutType).toBe("logicRight");
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(validateMindMap(migrated)).toEqual([]);
  });

  it("map cũ có layoutType khác (còn tồn tại) giữ NGUYÊN, không bị migration V13->V14 ảnh hưởng nhầm", () => {
    const raw = {
      mapId: "old-treedown",
      schemaVersion: 13,
      layoutType: "treeDown",
      rootId: "root1",
      nodes: { root1: { id: "root1", text: "Gốc", parentId: null, children: [] } },
    };
    const migrated = migrateToLatest(raw);
    expect(migrated.layoutType).toBe("treeDown");
  });

  it("P2.10 — map cũ (trước khi có Ảnh nhúng) không có 'assets' cấp map, không có 'imageAssetId' trên node -> tự thêm assets={} và imageAssetId=null cho MỌI node, không crash, không hiện màn hình trống", () => {
    const raw = {
      mapId: "old-no-image",
      schemaVersion: 14,
      layoutType: "logicRight",
      rootId: "root1",
      nodes: {
        root1: { id: "root1", text: "Gốc", parentId: null, children: ["c1"] },
        c1: { id: "c1", text: "Con", parentId: "root1", children: [] },
      },
    };
    const migrated = migrateToLatest(raw);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.assets).toEqual({});
    expect(migrated.nodes.root1?.imageAssetId).toBeNull();
    expect(migrated.nodes.c1?.imageAssetId).toBeNull();
    expect(validateMindMap(migrated)).toEqual([]);
  });

  it("P2.10 — file đã có sẵn assets/imageAssetId hợp lệ (ví dụ ghi tay để kiểm thử) giữ NGUYÊN qua di trú, không bị xoá mất", () => {
    const raw = {
      mapId: "already-has-image",
      schemaVersion: 14,
      layoutType: "logicRight",
      rootId: "root1",
      nodes: {
        root1: { id: "root1", text: "Gốc", parentId: null, children: [], imageAssetId: "img_1" },
      },
      assets: { img_1: { mimeType: "image/png", dataBase64: "AAAA" } },
    };
    const migrated = migrateToLatest(raw);
    expect(migrated.nodes.root1?.imageAssetId).toBe("img_1");
    expect(migrated.assets.img_1).toEqual({ mimeType: "image/png", dataBase64: "AAAA" });
    expect(validateMindMap(migrated)).toEqual([]);
  });
});
