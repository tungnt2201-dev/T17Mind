/**
 * ui/dialog.ts
 * ---------------------------------------------------------------------
 * Thay cho window.confirm() / window.alert() của trình duyệt. Lý do:
 * các hộp thoại gốc này bị chặn hoặc thất bại âm thầm trong nhiều môi
 * trường nhúng (ví dụ Simple Browser của VS Code) — người dùng bấm nút
 * mà không có gì xảy ra, rất khó đoán vì sao. Dùng UI tự vẽ bằng chính
 * app thì chạy đúng ở mọi nơi, kể cả trong khung nhúng.
 * ---------------------------------------------------------------------
 */

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function showConfirm(message: string, confirmLabel = "Đồng ý", cancelLabel = "Huỷ"): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">${escapeHtml(message)}</p>
        <div class="close-row" style="gap:8px;">
          <button class="btn" id="dlg-cancel">${escapeHtml(cancelLabel)}</button>
          <button class="btn danger" id="dlg-confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const cleanup = (result: boolean): void => {
      overlay.remove();
      resolve(result);
    };
    overlay.querySelector("#dlg-confirm")?.addEventListener("click", () => cleanup(true));
    overlay.querySelector("#dlg-cancel")?.addEventListener("click", () => cleanup(false));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * P2.10 — xem ảnh nhúng cỡ lớn (bấm icon 🖼 trên node). Dùng CÙNG khuôn
 * mẫu overlay tự vẽ như showConfirm/showAlert ở trên (không phải
 * <img>/modal riêng của trình duyệt) — lý do y hệt: chạy đúng ở mọi
 * môi trường nhúng, kể cả nơi hộp thoại gốc bị chặn.
 */
export function showImagePreview(dataBase64: string, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal" style="max-width:min(90vw,720px);max-height:90vh;display:flex;flex-direction:column;">
        <img src="data:${mimeType};base64,${dataBase64}" alt="Ảnh nhúng"
          style="max-width:100%;max-height:calc(90vh - 60px);object-fit:contain;border-radius:6px;margin:0 0 14px;" />
        <div class="close-row"><button class="btn primary" id="dlg-ok">Đóng</button></div>
      </div>`;
    document.body.appendChild(overlay);
    const cleanup = (): void => {
      overlay.remove();
      resolve();
    };
    overlay.querySelector("#dlg-ok")?.addEventListener("click", cleanup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });
  });
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">${escapeHtml(message)}</p>
        <div class="close-row"><button class="btn primary" id="dlg-ok">Đã hiểu</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#dlg-ok")?.addEventListener("click", () => {
      overlay.remove();
      resolve();
    });
  });
}
