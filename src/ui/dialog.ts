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

export interface GalleryImage {
  dataBase64: string;
  mimeType: string;
  caption: string;
}

/**
 * M3 — xem lớn nhiều ảnh (các khối ảnh của một card): nút ‹ › hoặc phím
 * ←/→ để chuyển, Esc/Đóng để thoát. Cùng khuôn overlay tự vẽ như
 * showImagePreview ở trên.
 */
export function showImageGallery(images: GalleryImage[], startIndex = 0): Promise<void> {
  if (images.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let index = Math.max(0, Math.min(startIndex, images.length - 1));
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay open";
    overlay.innerHTML = `
      <div class="modal" style="max-width:min(92vw,900px);max-height:92vh;display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;min-height:0;">
          <button class="btn" id="dlg-prev" aria-label="Ảnh trước" style="width:auto;">‹</button>
          <img id="dlg-img" alt="" style="flex:1;min-width:0;max-height:calc(92vh - 130px);object-fit:contain;border-radius:6px;" />
          <button class="btn" id="dlg-next" aria-label="Ảnh sau" style="width:auto;">›</button>
        </div>
        <p id="dlg-cap" style="margin:0;text-align:center;font-size:13px;color:#374151;"></p>
        <div class="close-row" style="margin-top:0;align-items:center;gap:8px;">
          <span id="dlg-count" style="margin-right:auto;font-size:12px;color:#6b7280;"></span>
          <button class="btn primary" id="dlg-ok">Đóng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const img = overlay.querySelector<HTMLImageElement>("#dlg-img");
    const cap = overlay.querySelector<HTMLElement>("#dlg-cap");
    const count = overlay.querySelector<HTMLElement>("#dlg-count");
    const prev = overlay.querySelector<HTMLButtonElement>("#dlg-prev");
    const next = overlay.querySelector<HTMLButtonElement>("#dlg-next");
    const show = (): void => {
      const it = images[index]!;
      if (img) {
        img.src = `data:${it.mimeType};base64,${it.dataBase64}`;
        img.alt = it.caption || "Ảnh";
      }
      if (cap) cap.textContent = it.caption;
      if (count) count.textContent = images.length > 1 ? `${index + 1} / ${images.length}` : "";
      if (prev) prev.style.visibility = images.length > 1 ? "visible" : "hidden";
      if (next) next.style.visibility = images.length > 1 ? "visible" : "hidden";
    };
    const go = (delta: number): void => {
      index = (index + delta + images.length) % images.length;
      show();
    };
    const onKey = (e: KeyboardEvent): void => {
      // Chặn ở pha capture để phím tắt canvas (Delete, mũi tên...) không chạy.
      e.stopImmediatePropagation();
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "Escape" || e.key === "Enter") cleanup();
    };
    const cleanup = (): void => {
      window.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve();
    };
    window.addEventListener("keydown", onKey, true);
    prev?.addEventListener("click", () => go(-1));
    next?.addEventListener("click", () => go(1));
    overlay.querySelector("#dlg-ok")?.addEventListener("click", cleanup);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) cleanup();
    });
    show();
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
