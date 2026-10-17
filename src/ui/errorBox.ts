/** ui/errorBox.ts — hiển thị danh sách lỗi khi nhập file thất bại. */
import { byId } from "./dom";

export function wireErrorBox(): void {
  byId("err-close").addEventListener("click", () => byId("err-box").classList.remove("open"));
}

export function showErrors(title: string, errors: string[]): void {
  byId("err-box-title").textContent = title;
  const list = byId("err-list");
  list.innerHTML = "";
  for (const message of errors) {
    const li = document.createElement("li");
    li.textContent = message;
    list.appendChild(li);
  }
  byId("err-box").classList.add("open");
}
