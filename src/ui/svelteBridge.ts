/**
 * ui/svelteBridge.ts
 * ---------------------------------------------------------------------
 * P2.1 — Cầu nối giữa core/store.ts (Store thuần TypeScript, cơ chế
 * subscribe tự viết) và hệ thống phản ứng của Svelte (giao thức store
 * chuẩn: {subscribe(run) => unsubscribe}, dùng được với cú pháp $store
 * trong file .svelte).
 *
 * QUAN TRỌNG — đây là cầu nối MỘT CHIỀU, chỉ để ĐỌC:
 *   Store/SelectionModel thay đổi  -->  component Svelte tự vẽ lại
 *
 * Component Svelte KHÔNG BAO GIỜ được phép gán ngược lại giá trị cho
 * các store này (không dùng cú pháp $map = ...). Mọi thay đổi dữ liệu
 * vẫn phải đi qua store.dispatch(command) như trước giờ — quy tắc "một
 * cửa" ở core/commands.ts không đổi chỉ vì giờ có thêm Svelte.
 *
 * Vì sao không dùng writable() của Svelte để bọc trực tiếp: writable()
 * cho phép set() từ bất cứ đâu, sẽ vô tình mở một đường tắt sửa dữ liệu
 * không qua Command. Tự viết subscribe() thủ công như dưới đây đảm bảo
 * store trả về CHỈ đọc được (kiểu Readable-like), không có set()/update().
 * ---------------------------------------------------------------------
 */
import type { Store } from "../core/store";
import type { MindMap } from "../core/types";
import type { SelectionModel, SelectionSnapshot } from "./selection";

type Subscriber<T> = (value: T) => void;
type Unsubscriber = () => void;

/** Đúng hình dạng "Svelte store contract" — đủ để dùng $map trong .svelte,
 *  nhưng không có set()/update() nên không thể sửa từ phía Svelte. */
export interface ReadableLike<T> {
  subscribe(run: Subscriber<T>): Unsubscriber;
}

export function mapStore(store: Store): ReadableLike<MindMap> {
  return {
    subscribe(run: Subscriber<MindMap>): Unsubscriber {
      run(store.getMap()); // giao thức Svelte: phải gọi run() ngay lần đầu
      return store.subscribe(() => run(store.getMap()));
    },
  };
}

export function selectionStore(selection: SelectionModel): ReadableLike<SelectionSnapshot> {
  return {
    subscribe(run: Subscriber<SelectionSnapshot>): Unsubscriber {
      run(selection.snapshot());
      return selection.subscribe(() => run(selection.snapshot()));
    },
  };
}
