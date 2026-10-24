<script lang="ts">
  /**
   * ui/components/HelpModal.svelte
   * -------------------------------------------------------------------
   * P2.1 — Hộp thoại "Hướng dẫn định dạng", chuyển từ HTML tĩnh +
   * ui/helpModal.ts (đã xoá) sang Svelte. Nội dung giữ NGUYÊN VĂN so
   * với bản cũ. Nút mở nằm ở Toolbar.svelte (component khác) nên hai
   * bên nói chuyện qua helpModalOpenStore dùng chung (uiStores.ts).
   * -------------------------------------------------------------------
   */
  import { helpModalOpenStore } from "../uiStores";

  function close(): void {
    helpModalOpenStore.set(false);
  }
  function onOverlayClick(e: MouseEvent): void {
    if (e.target === e.currentTarget) close();
  }
</script>

<div class="modal-overlay" class:open={$helpModalOpenStore} role="presentation" on:click={onOverlayClick}>
  <div class="modal">
    <h2>Định dạng file để T17Mind hiểu được</h2>

    <h3>1. JSON dạng cây (soạn nhanh, không có relationship/tóm tắt)</h3>
    <pre>{`{
  "text": "Chủ đề trung tâm",
  "children": [
    { "text": "Nhánh 1", "fill": "#2f6fed", "color": "#ffffff",
      "borderStyle": "dashed", "link": "https://example.com",
      "children": [ { "text": "Ý con 1.1" } ] }
  ]
}`}</pre>
    <table>
      <tbody>
        <tr><th>Trường</th><th>Bắt buộc</th><th>Ý nghĩa</th></tr>
        <tr><td>text</td><td>Có</td><td>Nội dung node</td></tr>
        <tr><td>children</td><td>Không</td><td>Mảng node con (đệ quy)</td></tr>
        <tr><td>notes</td><td>Không</td><td>Ghi chú</td></tr>
        <tr><td>color / fill</td><td>Không</td><td>Màu chữ / màu nền, mã hex</td></tr>
        <tr><td>fillTransparent</td><td>Không</td><td>true = nền trong suốt</td></tr>
        <tr><td>borderStyle / borderColor</td><td>Không</td><td>solid/dashed/dotted/none + màu viền</td></tr>
        <tr><td>link</td><td>Không</td><td>URL gắn vào node</td></tr>
        <tr><td>edgeColor / edgeDash / edgeShape</td><td>Không</td><td>Kiểu đường nối tới CÁC CON của node này</td></tr>
        <tr><td>fontSize</td><td>Không</td><td>Cỡ chữ (px), bỏ trống = mặc định theo cấp</td></tr>
        <tr><td>fontFamily</td><td>Không</td><td>Tên font tự do (ví dụ "Arial"), bỏ trống = font hệ thống mặc định</td></tr>
        <tr><td>fillOpacity</td><td>Không</td><td>Độ đậm màu nền, 0-100, mặc định 100 (đậm hoàn toàn)</td></tr>
        <tr><td>textAlign</td><td>Không</td><td>left/center/right, mặc định center</td></tr>
        <tr><td>textFit</td><td>Không</td><td>auto/wrap/shrink, mặc định auto</td></tr>
        <tr><td>edgeLabel</td><td>Không</td><td>Nhãn trên đường nối từ CHA tới node này — chỉ hiện khi bật công tắc "🏷 Nhãn cha-con" trên Toolbar</td></tr>
        <tr><td>collapsed</td><td>Không</td><td>true/false — thu gọn nhánh con</td></tr>
        <tr><td>labels</td><td>Không</td><td>Mảng chữ tự do, ví dụ ["Quan trọng", "Gấp"] — P2.7e: nội bộ đây là TÊN Tag, tự động tạo Tag mới khi gặp tên chưa có (màu gán tự động), tái dùng đúng Tag khi gặp lại tên giống hệt. Quản lý Tag đầy đủ (đổi màu, đổi tên, xoá) làm trong panel bên phải khi chọn một node, không phải sửa tay JSON.</td></tr>
        <tr><td>textBold / textItalic / textUnderline</td><td>Không</td><td>true/false — đậm/nghiêng/gạch chân cho chữ chính của node (P2.7f)</td></tr>
        <tr><td>checked</td><td>Không</td><td>true/false — checkbox hoàn thành kiểu to-do, hiện ngay trước chữ. Bỏ trống (không ghi trường này) = KHÔNG hiện checkbox. true tự động gạch ngang chữ khi vẽ (P2.7f)</td></tr>
      </tbody>
    </table>

    <h3>2. XLSX (bảng, sheet đầu tiên)</h3>
    <p>Bắt buộc cột <code>ID</code> và <code>Text</code>. <code>ParentID</code> để trống ở đúng 1 dòng (node gốc).
    Cột tuỳ chọn: <code>Link</code>, <code>BorderStyle</code>, <code>BorderColor</code>, <code>Transparent</code>,
    <code>EdgeColor</code>, <code>EdgeDash</code>, <code>EdgeShape</code>, <code>Width</code>, <code>Height</code>,
    <code>FontSize</code>, <code>TextAlign</code>, <code>TextFit</code>, <code>EdgeLabel</code>,
    <code>FontFamily</code>, <code>FillOpacity</code>.
    Không hỗ trợ relationship/tóm tắt/khoanh vùng/ghi chú dán qua XLSX. 3 công
    tắc hiển thị (nhãn cha-con/liên kết/tóm tắt) cũng không lưu được qua
    XLSX — vì đó là cài đặt CẤP TÀI LIỆU, không phải dữ liệu từng dòng, XLSX
    không có chỗ nào để lưu việc đó.</p>
    <p><b>Quy tắc bắt buộc:</b> ID không trùng · ít nhất 1 dòng gốc (để trống ParentID) · ParentID phải khớp ID có thật · không vòng lặp.</p>
    <p>Có nhiều hơn 1 dòng gốc cũng hợp lệ (P2.5) — dòng gốc đầu tiên trong file trở thành gốc chính, các dòng gốc còn lại thành các nhánh trôi độc lập.</p>

    <h3>3. JSON đầy đủ (round-trip — hỗ trợ relationship + tóm tắt + khoanh vùng)</h3>
    <p>Đây là định dạng khi bấm "Xuất JSON" — sửa tay rồi nhập lại vẫn giữ nguyên liên kết/tóm tắt/khoanh vùng/độ uốn cong.
    Có thêm trường <code>schemaVersion</code> để phiên bản sau vẫn mở được file cũ.</p>
    <p><b>Nhóm trực quan (Khoanh vùng):</b> mỗi nhóm trong <code>boundaries</code> có thể có thêm trường tuỳ chọn <code>visual</code> —
    <code>{"{"}mode: "rectangle" | "multiContour" | "distributed", padding, connectionGap, smoothness, fillOpacity, showConnectors{"}"}</code>.
    Thiếu <code>visual</code> = hình chữ nhật như bản cũ; giá trị sai được kẹp về khoảng hợp lệ. Đường bao không được lưu — luôn tính lại từ vị trí node.</p>
    <p>File còn có <code>mapId</code> (định danh riêng của map, dùng để lưu vào "Map gần đây" — <b>không đổi</b> nếu nhập lại đúng file đã có sẵn trường này, chỉ sinh mới khi thiếu), <code>mapTitle</code> (tên hiển thị tuỳ chọn, khác chữ của node gốc), và <code>layoutType</code> ("logicRight"/"logicLeft"/"logicBoth"/"treeDown"/"orgChart"/"treeUp", mặc định "logicRight" nếu thiếu).</p>

    <div class="close-row"><button class="btn primary" id="help-close" on:click={close}>Đã hiểu</button></div>
  </div>
</div>
