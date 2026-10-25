/**
 * ui/pdf/sourceFiles.ts
 * ---------------------------------------------------------------------
 * KW3 — đọc dữ liệu thật của một nguồn PDF (nhúng: từ map; liên kết: từ đường dẫn trên đĩa) và tìm nguồn TRÙNG nội dung.
 * Việc đọc file và băm được tiêm vào (`io`) nên kiểm thử được mà không cần Windows/trình duyệt.
 * ---------------------------------------------------------------------
 */
import type { MindMap, Source } from "../../core/types";
import { base64ToBytes } from "../../core/bytes";
import { sameHash } from "../../core/hash";
import { base64Bytes, sourceFileState, type SourceFileState } from "../../core/sources";

export interface SourceIo {
  readFile(path: string): Promise<ArrayBuffer>;
  hash(bytes: Uint8Array): Promise<string>;
}

export interface LoadedSource {
  state: SourceFileState;
  /** null khi file liên kết không đọc được (hoặc nguồn nhúng mất dữ liệu). */
  bytes: Uint8Array | null;
  sha256?: string;
  /** Lý do khi không đọc được. */
  error?: string;
}

/** Nạp byte của nguồn. Nhúng: lấy từ `map.assets`. Liên kết: đọc `path`, băm, so với mã băm lúc thêm → ok/changed/missing. */
export async function loadSourceBytes(map: Pick<MindMap, "assets">, source: Source, io: SourceIo): Promise<LoadedSource> {
  if (source.assetId !== null) {
    const asset = map.assets[source.assetId];
    return asset ? { state: "ok", bytes: base64ToBytes(asset.dataBase64) } : { state: "missing", bytes: null, error: "Dữ liệu PDF không còn trong map." };
  }
  try {
    const bytes = new Uint8Array(await io.readFile(source.path ?? ""));
    const sha256 = await io.hash(bytes);
    return { state: sourceFileState(source, { found: true, sha256 }), bytes, sha256 };
  } catch (e) {
    return { state: sourceFileState(source, { found: false }), bytes: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Tìm nguồn ĐÃ CÓ trong map có cùng nội dung với (sha256, size). Nguồn có mã băm thì so thẳng; nguồn nhúng cũ không có mã băm
 * chỉ được băm lại khi trùng dung lượng (tránh băm cả thư viện); nguồn liên kết không có mã băm thì bỏ qua.
 */
export async function findDuplicateSource(map: Pick<MindMap, "sources" | "assets">, probe: { sha256: string; size: number }, hash: SourceIo["hash"]): Promise<Source | null> {
  for (const s of Object.values(map.sources ?? {})) {
    if (s.sha256) {
      if (sameHash(s.sha256, probe.sha256)) return s;
      continue;
    }
    if (s.assetId !== null) {
      const asset = map.assets[s.assetId];
      if (!asset || base64Bytes(asset.dataBase64) !== probe.size) continue;
      if (sameHash(await hash(base64ToBytes(asset.dataBase64)), probe.sha256)) return s;
    }
  }
  return null;
}
