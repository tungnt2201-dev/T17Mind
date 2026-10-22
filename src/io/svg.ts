/**
 * io/svg.ts
 * ---------------------------------------------------------------------
 * Xuất mindmap ra SVG tĩnh — vector, giữ nguyên chất lượng khi phóng
 * to, dùng để in ấn/chèn vào tài liệu hoặc website.
 *
 * PHẠM VI (cố tình giữ ở mức CỐT LÕI, không cố xuất MỌI chi tiết trang
 * trí — tránh làm ẩu một tính năng lớn): khung node (bo góc, màu nền,
 * viền), chữ chính (đậm/nghiêng/cỡ chữ/font — CĂN GIỮA, không hỗ trợ tự
 * xuống dòng nhiều dòng như canvas), đường nối ĐÚNG HÌNH DẠNG theo
 * từng layout (cong/thẳng/góc vuông — tái dùng CHÍNH
 * `parentChildEdgeAnchors`/`computeEdgeWidth` đã có trong
 * render/geometry.ts, không viết lại công thức hình học lần thứ 2).
 * CHỈ xuất node ĐANG HIỂN THỊ THẬT (tôn trọng node.collapsed, giống
 * cách Explorer/Minimap ở chế độ "Đồng bộ" đã làm) — thu gọn bớt
 * trước khi xuất nếu muốn ẩn bớt phần nào.
 * KHÔNG xuất: viên thuốc Tag, icon checkbox/ghi chú/link, huy hiệu ưu
 * tiên/vòng tiến độ, gạch chân/gạch ngang, hiệu ứng "Kiểu cây tự
 * nhiên" (luôn dùng nét đều, không thon dần), quan hệ chéo, tóm tắt,
 * khoanh vùng, ghi chú dán — đây là bản xuất "khung + chữ + đường
 * nối", không phải xuất đầy đủ mọi lớp trang trí.
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "../core/types";
import { isVerticalLayout } from "../core/types";
import { layoutOfNode } from "../core/treeSettings";
import { collectVisibleNodeIds } from "../core/tree";
import { parentChildEdgeAnchors, computeEdgeWidth } from "../render/geometry";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function exportSvg(map: MindMap): string {
  const visibleIds = new Set(collectVisibleNodeIds(map));
  const visibleNodes = Object.values(map.nodes).filter((n) => visibleIds.has(n.id));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of visibleNodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  const PADDING = 40;
  const width = Math.round(maxX - minX + PADDING * 2);
  const height = Math.round(maxY - minY + PADDING * 2);
  const offsetX = PADDING - minX;
  const offsetY = PADDING - minY;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="-apple-system, Segoe UI, Roboto, sans-serif">`
  );
  parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="#f6f7f9"/>`);

  // --- Đường nối TRƯỚC (dưới node) — đúng thứ tự vẽ như canvas. ---
  const edgeParts: string[] = [];
  for (const node of visibleNodes) {
    if (node.collapsed) continue;
    for (const childId of node.children) {
      if (!visibleIds.has(childId)) continue;
      const child = map.nodes[childId];
      if (!child) continue;
      const { sx, sy, ex, ey } = parentChildEdgeAnchors(map, node, child);
      const x1 = sx + offsetX;
      const y1 = sy + offsetY;
      const x2 = ex + offsetX;
      const y2 = ey + offsetY;
      const strokeWidth = computeEdgeWidth(map, node);
      const color = node.edgeColor || "#9aa3ad";
      const dash = node.edgeDash ? ` stroke-dasharray="6,4"` : "";

      const layoutType = layoutOfNode(map, node.id);
      let d: string;
      if (node.edgeShape === "straight") {
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else if (layoutType === "orgChart") {
        // Giống hệt Organization Chart trên canvas — LUÔN góc vuông
        // kiểu T, bỏ qua edgeShape riêng từng node.
        const my = y1 + (y2 - y1) / 2;
        d = `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`;
      } else if (isVerticalLayout(layoutType)) {
        const my = (y1 + y2) / 2;
        d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
      } else {
        const mx = (x1 + x2) / 2;
        d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      }
      edgeParts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${dash}/>`);
    }
  }
  parts.push(`<g>${edgeParts.join("")}</g>`);

  // --- Node SAU (đè lên đường nối) — khung bo góc + chữ căn giữa. ---
  const nodeParts: string[] = [];
  for (const node of visibleNodes) {
    const isRoot = node.id === map.rootId;
    const x = node.x + offsetX;
    const y = node.y + offsetY;
    const fill = node.fillTransparent ? "none" : node.fill || (isRoot ? "#2f6fed" : "#ffffff");
    const textColor = node.color || (isRoot ? "#ffffff" : "#1f2933");
    const borderColor = node.borderColor || (isRoot ? "transparent" : "#d8dce2");
    const dash = node.borderStyle === "dashed" ? ` stroke-dasharray="6,4"` : "";
    nodeParts.push(
      `<rect x="${x}" y="${y}" width="${node.width}" height="${node.height}" rx="8" ry="8" fill="${fill}" stroke="${borderColor}" stroke-width="1.5"${dash}/>`
    );

    const cx = x + node.width / 2;
    const cy = y + node.height / 2;
    const fontSize = node.fontSize ?? (isRoot ? 15 : 13);
    const fontWeight = node.textBold || isRoot ? "600" : "400";
    const fontStyle = node.textItalic ? "italic" : "normal";
    nodeParts.push(
      `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" ` +
        `font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" fill="${textColor}">` +
        `${escapeXml(node.text || "(trống)")}</text>`
    );
  }
  parts.push(`<g>${nodeParts.join("")}</g>`);

  parts.push(`</svg>`);
  return parts.join("\n");
}
