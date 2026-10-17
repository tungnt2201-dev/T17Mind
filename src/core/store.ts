/**
 * core/store.ts
 * ---------------------------------------------------------------------
 * P1.5 (lớp thao tác) + P1.6 (hoàn tác/làm lại).
 *
 * Store là NƠI DUY NHẤT giữ tham chiếu tới MindMap đang mở. ui/ không
 * bao giờ tự ý sửa dữ liệu — nó tạo một Command rồi gọi store.dispatch().
 * Store tự chạy apply(), ghi vào ngăn xếp hoàn tác, rồi báo cho mọi nơi
 * đã subscribe() biết là có thay đổi (thường là main.ts, nơi sẽ chạy
 * lại layout rồi vẽ lại canvas).
 *
 * VỀ CƠ CHẾ "GỘP LỆNH LIÊN TIẾP" (P1.6): thay vì gộp theo cửa sổ thời
 * gian (ví dụ 500ms) — vốn dễ tách một cử chỉ kéo chuột thành nhiều
 * bước hoàn tác nếu người dùng khựng tay giữa chừng — store dùng SESSION
 * tường minh: beginSession() mở một giao dịch, updateSession() cập nhật
 * liên tục trong lúc kéo (không đẩy gì vào ngăn xếp), endSession() mới
 * chốt lại thành ĐÚNG MỘT bước hoàn tác cho cả cử chỉ. Việc gõ chữ liên
 * tục không cần cơ chế này vì ô nhập chỉ dispatch một UpdateTextCommand
 * duy nhất khi rời khỏi ô (xem ui/editingInput.ts).
 * ---------------------------------------------------------------------
 */
import type { MindMap } from "./types";
import type { Command } from "./commands";

export type StoreListener = () => void;
export type Unsubscribe = () => void;

const MAX_HISTORY = 100;

export class Store {
  private map: MindMap;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private activeSession: Command | null = null;
  private readonly listeners = new Set<StoreListener>();

  constructor(initialMap: MindMap) {
    this.map = initialMap;
  }

  getMap(): MindMap {
    return this.map;
  }

  subscribe(listener: StoreListener): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  // -------------------------------------------------------------
  // Thao tác một-lần (thêm, xoá, sửa, di chuyển cấu trúc...)
  // -------------------------------------------------------------

  dispatch(command: Command): void {
    command.apply(this.map);
    this.pushUndo(command);
    this.notify();
  }

  private pushUndo(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
  }

  // -------------------------------------------------------------
  // Session — cho thao tác kéo liên tục (đổi offset, đổi kích thước)
  // -------------------------------------------------------------

  beginSession(command: Command): void {
    command.apply(this.map);
    this.activeSession = command;
    this.notify();
  }

  /** Gọi lại sau khi đã cập nhật "giá trị đích" trên command đang mở
   *  session (ví dụ command.setTarget(...)) — xem SetNodeOffsetCommand. */
  updateSession(command: Command): void {
    if (this.activeSession !== command) return;
    command.apply(this.map);
    this.notify();
  }

  endSession(): void {
    if (!this.activeSession) return;
    this.pushUndo(this.activeSession);
    this.activeSession = null;
    this.notify(); // chốt phiên xong mới cần layout đầy đủ + lưu tạm + cập nhật panel
  }

  /** Huỷ giữa chừng (ví dụ nhấn Esc khi đang kéo) — trả map về đúng
   *  trạng thái trước khi session bắt đầu. */
  cancelSession(): void {
    if (!this.activeSession) return;
    this.activeSession.revert(this.map);
    this.activeSession = null;
    this.notify();
  }

  isSessionActive(): boolean {
    return this.activeSession !== null;
  }

  // -------------------------------------------------------------
  // Hoàn tác / làm lại
  // -------------------------------------------------------------

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  peekUndoLabel(): string | null {
    return this.undoStack[this.undoStack.length - 1]?.label ?? null;
  }
  peekRedoLabel(): string | null {
    return this.redoStack[this.redoStack.length - 1]?.label ?? null;
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.revert(this.map);
    this.redoStack.push(command);
    this.notify();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.apply(this.map);
    this.undoStack.push(command);
    this.notify();
  }

  // -------------------------------------------------------------
  // Thay cả tài liệu (Mới / Nhập file) — không có ý nghĩa để "hoàn
  // tác xuyên tài liệu", nên xoá sạch lịch sử khi làm việc này.
  // -------------------------------------------------------------

  loadMap(newMap: MindMap): void {
    this.map = newMap;
    this.undoStack = [];
    this.redoStack = [];
    this.activeSession = null;
    this.notify();
  }
}
