/**
 * io/t17m.ts
 * ---------------------------------------------------------------------
 * P2.10 — định dạng file NGUYÊN BẢN (native) của chính T17Mind: `.t17m`,
 * lấy cảm hứng trực tiếp từ cách XMind đóng gói `.xmind` (xem io/xmind.ts)
 * nhưng ĐƠN GIẢN HƠN nhiều vì không cần đối chiếu với định dạng của phần
 * mềm khác — đây là zip CHỨA CHÍNH DỮ LIỆU CỦA T17MIND, không chuyển đổi.
 *
 * Cấu trúc file `.t17m` (zip, dùng `jszip` — cùng thư viện đã dùng cho
 * `.xmind`/`.xlsx`, không thêm phụ thuộc mới):
 *   - content.json   : chính là MindMap ở CURRENT_SCHEMA_VERSION, nhưng
 *                      map.assets["xxx"].dataBase64 được THAY bằng một
 *                      chuỗi rỗng "" — dữ liệu ảnh thật nằm ở nơi khác
 *                      (xem dưới), tránh lưu 2 lần cùng một dữ liệu nặng.
 *   - assets/<id>.<ext> : TỪNG ảnh trong map.assets, dưới dạng file NHỊ
 *                      PHÂN thật trong zip (KHÔNG phải base64) — đây
 *                      chính là điểm khác biệt cốt lõi so với JSON
 *                      thường (nơi ảnh phải mã hoá base64, nặng hơn
 *                      ~33%): `.t17m` mới thật sự "nhúng tệp" giống XMind.
 *
 * Vì sao KHÔNG tái dùng nguyên xi exportFlatJson()/importFlatJson():
 * hai hàm đó luôn đọc/ghi base64 NGAY TRONG JSON (đơn giản, đúng cho
 * .json thường — không có "chỗ khác" nào để cất ảnh) — `.t17m` cần một
 * bước TÁCH ra lúc xuất và GHÉP LẠI lúc nhập, xoay quanh CÙNG MỘT
 * schema MindMap, không phải một schema riêng.
 * ---------------------------------------------------------------------
 */
import JSZip from "jszip";
import type { MindMap } from "../core/types";
import { migrateToLatest } from "../core/migrate";
import { validateMindMap } from "../core/validate";

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
};

function extForMime(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? "bin";
}

export type T17mImportOutcome = { ok: true; map: MindMap } | { ok: false; errors: string[] };

/**
 * XUẤT: MindMap -> file `.t17m`. Ảnh trong map.assets được tách thành
 * file nhị phân thật trong thư mục assets/, content.json chỉ giữ
 * mimeType (dataBase64 rỗng, xem ghi chú đầu file) để không lưu trùng
 * lặp cùng một dữ liệu ảnh 2 lần trong cùng một file zip.
 */
export async function exportT17mFile(map: MindMap): Promise<Blob> {
  const zip = new JSZip();
  const assetsFolder = zip.folder("assets");

  const contentAssets: MindMap["assets"] = {};
  for (const [assetId, asset] of Object.entries(map.assets)) {
    const ext = extForMime(asset.mimeType);
    assetsFolder?.file(`${assetId}.${ext}`, asset.dataBase64, { base64: true });
    contentAssets[assetId] = { mimeType: asset.mimeType, dataBase64: "" };
  }

  const content: MindMap = { ...map, assets: contentAssets };
  zip.file("content.json", JSON.stringify(content));
  zip.file(
    "t17m-manifest.json",
    JSON.stringify({ format: "t17mind-native", formatVersion: 1, creator: "T17Mind" })
  );
  return zip.generateAsync({ type: "blob" });
}

/**
 * NHẬP: file `.t17m` -> MindMap. Đọc lại từng file nhị phân trong
 * assets/, mã hoá lại thành base64 để ghép vào map.assets — từ đây trở
 * đi, map trong bộ nhớ ứng dụng LUÔN dùng đúng MỘT hình dạng (base64
 * trong map.assets), bất kể mở từ .json hay .t17m — mọi nơi khác trong
 * ứng dụng (render, panel thuộc tính...) không cần biết file gốc là gì.
 */
export async function parseT17mFile(buffer: ArrayBuffer): Promise<T17mImportOutcome> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { ok: false, errors: ["File không giải nén được — không phải định dạng .t17m hợp lệ."] };
  }

  const contentFile = zip.file("content.json");
  if (!contentFile) {
    return { ok: false, errors: ["File .t17m này không có content.json — có thể bị hỏng hoặc không phải do T17Mind tạo ra."] };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(await contentFile.async("text"));
  } catch {
    return { ok: false, errors: ["content.json bên trong file .t17m bị hỏng, không đọc được."] };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["content.json bên trong file .t17m không phải một object hợp lệ."] };
  }

  let migrated: MindMap;
  try {
    migrated = migrateToLatest(raw as Record<string, unknown>);
  } catch (err) {
    return { ok: false, errors: [(err as Error).message] };
  }

  // Đọc lại dữ liệu ảnh nhị phân thật trong assets/, ghép ngược vào
  // đúng key ảnh tương ứng đã có trong content.json (id không đổi giữa
  // 2 nơi — xem exportT17mFile() ở trên).
  const assets: MindMap["assets"] = {};
  for (const assetId of Object.keys(migrated.assets ?? {})) {
    const mimeType = migrated.assets[assetId]?.mimeType ?? "application/octet-stream";
    const ext = extForMime(mimeType);
    const file = zip.file(`assets/${assetId}.${ext}`);
    if (!file) continue; // thiếu file nhị phân tương ứng -> bỏ qua an toàn, không crash cả map
    const dataBase64 = await file.async("base64");
    assets[assetId] = { mimeType, dataBase64 };
  }
  migrated.assets = assets;

  const errors = validateMindMap(migrated);
  if (errors.length > 0) {
    return { ok: false, errors: [`File nhập được nhưng dữ liệu không hợp lệ: ${errors.join(", ")}`] };
  }
  return { ok: true, map: migrated };
}
