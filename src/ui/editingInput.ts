/**
 * ui/editingInput.ts
 * ---------------------------------------------------------------------
 * Một ô <input>/<textarea> HTML thật, đặt đè lên đúng vị trí node/nhãn
 * trên canvas để sửa chữ tại chỗ — canvas không tự vẽ được caret nhấp
 * nháy hay xử lý IME tiếng Việt, nên mượn DOM cho việc này là lựa
 * chọn đúng.
 *
 * commit() chỉ được gọi MỘT LẦN khi rời ô (blur) hoặc Enter (với ô một
 * dòng) — đây là lý do gõ chữ liên tục chỉ tạo ĐÚNG MỘT bước hoàn tác
 * (P1.6), không cần cơ chế gộp lệnh phức tạp cho riêng trường hợp này.
 * ---------------------------------------------------------------------
 */

export interface InlineEditRect {
  left: number;
  top: number;
  width: number;
  height: number;
  fontSizePx: number;
}

let activeElement: HTMLInputElement | HTMLTextAreaElement | null = null;

export function isEditing(): boolean {
  return activeElement !== null;
}

export function cancelInlineEdit(): void {
  if (activeElement) {
    const el = activeElement;
    // P2.15 — đặt null TRƯỚC khi remove(), KHÔNG phải sau: remove() một
    // phần tử đang có focus khiến trình duyệt tự bắn sự kiện 'blur'
    // NGAY LẬP TỨC (đồng bộ, trong chính lệnh gọi remove() này) — nếu
    // activeElement vẫn còn trỏ tới nó lúc blur nổ ra, listener 'blur'
    // (hàm commit() ở startInlineEdit/startInlineEditMultiline bên
    // dưới) sẽ tưởng ô "vẫn đang sống" và tự gọi lại cancelInlineEdit()
    // một lần nữa trên CHÍNH phần tử đang bị remove dở — gây lỗi thật
    // sự đã bắt được khi kiểm bằng Playwright: "Failed to execute
    // 'remove' on 'Element': The node to be removed is no longer a
    // child of this node." (tái hiện bằng chuỗi thao tác rất bình
    // thường: bấm Tab thêm nhánh con rồi bấm Escape ngay để giữ tên
    // mặc định). Null trước giúp commit() nhận ra "đã bị huỷ rồi" và
    // tự return sớm, không remove() lần hai.
    activeElement = null;
    el.remove();
  }
}

/** Ô một dòng — Enter commit ngay, dùng cho tên node/nhãn liên kết/
 *  nhãn tóm tắt/nhãn khoanh vùng. */
export function startInlineEdit(
  initialValue: string,
  rect: InlineEditRect,
  onCommit: (value: string) => void
): void {
  cancelInlineEdit();

  const input = document.createElement("input");
  input.className = "t17-editing-input";
  input.value = initialValue;
  input.style.position = "absolute";
  input.style.left = `${rect.left}px`;
  input.style.top = `${rect.top}px`;
  input.style.width = `${rect.width}px`;
  input.style.height = `${rect.height}px`;
  input.style.fontSize = `${rect.fontSizePx}px`;

  document.body.appendChild(input);
  input.focus();
  input.select();
  activeElement = input;

  const commit = (): void => {
    if (activeElement !== input) return; // đã bị huỷ hoặc thay bởi ô khác
    const value = input.value.trim();
    cancelInlineEdit();
    onCommit(value || initialValue);
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      input.blur(); // sẽ tự kích hoạt commit() ở trên
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      cancelInlineEdit();
    }
    ev.stopPropagation(); // không để phím tắt toàn cục (Tab, Delete...) bắt nhầm khi đang gõ
  });
}

/**
 * P2.5b — Ô NHIỀU DÒNG, dùng cho ghi chú dán. Khác ô một dòng ở trên:
 * Enter KHÔNG commit — để textarea tự xuống dòng bình thường như một
 * trình soạn thảo thật. Chỉ rời ô (blur) hoặc Esc mới kết thúc. Tự
 * giãn chiều cao theo nội dung trong lúc gõ, giống ô ghi chú trong
 * panel (P2.3), nhưng viết riêng ở đây vì đây không phải component
 * Svelte — không dùng chung được action của SidePanel.svelte.
 */
export function startInlineEditMultiline(
  initialValue: string,
  rect: InlineEditRect,
  onCommit: (value: string) => void
): void {
  cancelInlineEdit();

  const textarea = document.createElement("textarea");
  textarea.className = "t17-editing-input t17-editing-textarea";
  textarea.value = initialValue;
  textarea.style.position = "absolute";
  textarea.style.left = `${rect.left}px`;
  textarea.style.top = `${rect.top}px`;
  textarea.style.width = `${rect.width}px`;
  textarea.style.minHeight = `${rect.height}px`;
  textarea.style.fontSize = `${rect.fontSizePx}px`;

  document.body.appendChild(textarea);

  const autoGrow = (): void => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };
  autoGrow();
  textarea.focus();
  textarea.select();
  activeElement = textarea;

  const commit = (): void => {
    if (activeElement !== textarea) return;
    const value = textarea.value.trim();
    cancelInlineEdit();
    onCommit(value);
  };

  textarea.addEventListener("input", autoGrow);
  textarea.addEventListener("blur", commit);
  textarea.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      ev.preventDefault();
      cancelInlineEdit();
    }
    // Enter KHÔNG commit — textarea tự xuống dòng, khác hẳn ô một dòng.
    ev.stopPropagation();
  });
}
