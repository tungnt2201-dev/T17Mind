/**
 * core/formula.ts
 * ---------------------------------------------------------------------
 * Công thức trong ô bảng của card (kiểu Excel, bản nhỏ). Ô có chữ bắt
 * đầu bằng "=" là ô công thức; chuỗi công thức được LƯU NGUYÊN trong ô
 * (`cells[r][c]`), kết quả TÍNH LẠI khi hiển thị — không lưu kết quả,
 * không đổi schema, file cũ mở như thường.
 *
 * Cú pháp: số (12, 3.5), chữ trong "…", ô A1 (cột chữ, hàng số — hàng 1 là
 * HÀNG ĐẦU của lưới, kể cả khi đó là hàng tiêu đề), vùng liền A1:B3, phép
 * + - * /, ngoặc, so sánh = <> < > <= >=, và các hàm (không phân biệt hoa
 * thường; ngăn đối số bằng "," hoặc ";"):
 *   SUM MIN MAX COUNT AVERAGE COUNTA MEDIAN ROUND IF
 * Quy tắc: trong vùng/ô tham chiếu, ô không phải số (chữ, trống) BỊ BỎ QUA
 * (COUNT chỉ đếm số, COUNTA đếm ô không trống). Phép toán với ô chữ không
 * phải số → #VALUE; ô trống tính là 0. Lỗi lan theo tham chiếu.
 * Số trong ô thường đọc bằng `parseNumber` (nhận 1.234,5 và 1,234.5).
 * Tham chiếu vòng → #CYCLE; sai cú pháp → #SYNTAX; ô ngoài bảng → #REF;
 * chia 0 → #DIV/0; hàm lạ → #NAME.
 * ---------------------------------------------------------------------
 */
import { formatNumber, parseNumber } from "./numberParse";
import type { TableBlock } from "./types";

export type FormulaErrorCode = "SYNTAX" | "REF" | "CYCLE" | "DIV0" | "VALUE" | "NAME" | "ARGS";

export const FORMULA_ERROR_TEXT: Record<FormulaErrorCode, string> = {
  SYNTAX: "#SYNTAX",
  REF: "#REF",
  CYCLE: "#CYCLE",
  DIV0: "#DIV/0",
  VALUE: "#VALUE",
  NAME: "#NAME",
  ARGS: "#ARGS",
};
export const FORMULA_ERROR_HINT: Record<FormulaErrorCode, string> = {
  SYNTAX: "Sai cú pháp công thức",
  REF: "Tham chiếu ô ngoài bảng",
  CYCLE: "Tham chiếu vòng (ô tự phụ thuộc vào chính nó)",
  DIV0: "Chia cho 0",
  VALUE: "Phép toán với ô không phải số",
  NAME: "Tên hàm không hợp lệ (có: SUM, MIN, MAX, COUNT, AVERAGE, COUNTA, MEDIAN, ROUND, IF)",
  ARGS: "Sai số lượng/kiểu đối số của hàm",
};

export const FORMULA_FUNCTIONS = ["SUM", "MIN", "MAX", "COUNT", "AVERAGE", "COUNTA", "MEDIAN", "ROUND", "IF"] as const;

export function isFormula(raw: string): boolean {
  return raw.startsWith("=");
}

/** Tên cột kiểu Excel: 0 → A, 25 → Z, 26 → AA… */
export function columnName(c: number): string {
  let n = c;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export const cellAddress = (r: number, c: number): string => `${columnName(c)}${r + 1}`;

// ------------------------------------------------------------ Phân tích

type Ast =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "ref"; r: number; c: number }
  | { t: "range"; r1: number; c1: number; r2: number; c2: number }
  | { t: "neg"; e: Ast }
  | { t: "bin"; op: string; a: Ast; b: Ast }
  | { t: "call"; name: string; args: Ast[] };

class FormulaError extends Error {
  constructor(readonly code: FormulaErrorCode) {
    super(code);
  }
}

type Tok = { k: "num" | "str" | "id" | "op" | "end"; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] ?? ""))) {
      let j = i;
      while (j < src.length && /[0-9]/.test(src[j]!)) j++;
      if (src[j] === ".") {
        j++;
        while (j < src.length && /[0-9]/.test(src[j]!)) j++;
      }
      out.push({ k: "num", v: src.slice(i, j) });
      i = j;
    } else if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== '"') s += src[j++];
      if (j >= src.length) throw new FormulaError("SYNTAX");
      out.push({ k: "str", v: s });
      i = j + 1;
    } else if (ch === "#" && src.slice(i, i + 4).toUpperCase() === "#REF") {
      out.push({ k: "id", v: "#REF" });
      i += 4;
    } else if (/[A-Za-z$_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9$_.]/.test(src[j]!)) j++;
      out.push({ k: "id", v: src.slice(i, j) });
      i = j;
    } else if (/[+\-*/(),;:=<>]/.test(ch)) {
      const two = src.slice(i, i + 2);
      if (two === "<=" || two === ">=" || two === "<>") {
        out.push({ k: "op", v: two });
        i += 2;
      } else {
        out.push({ k: "op", v: ch });
        i++;
      }
    } else {
      throw new FormulaError("SYNTAX");
    }
  }
  out.push({ k: "end", v: "" });
  return out;
}

const REF_RE = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,5})$/;
function parseRef(id: string): { r: number; c: number } | null {
  const m = REF_RE.exec(id);
  if (!m) return null;
  const row = Number(m[2]);
  if (row < 1) return null;
  return { r: row - 1, c: columnIndex(m[1]!.toUpperCase()) };
}

function parse(src: string): Ast {
  const toks = tokenize(src);
  let p = 0;
  const peek = (): Tok => toks[p]!;
  const isOp = (v: string): boolean => peek().k === "op" && peek().v === v;
  const expect = (v: string): void => {
    if (!isOp(v)) throw new FormulaError("SYNTAX");
    p++;
  };

  const primary = (): Ast => {
    const t = peek();
    if (t.k === "num") {
      p++;
      return { t: "num", v: Number(t.v) };
    }
    if (t.k === "str") {
      p++;
      return { t: "str", v: t.v };
    }
    if (isOp("(")) {
      p++;
      const e = cmp();
      expect(")");
      return e;
    }
    if (t.k === "id") {
      p++;
      if (isOp("(")) {
        p++;
        const args: Ast[] = [];
        if (!isOp(")")) {
          for (;;) {
            args.push(cmp());
            if (isOp(",") || isOp(";")) p++;
            else break;
          }
        }
        expect(")");
        return { t: "call", name: t.v.toUpperCase(), args };
      }
      if (t.v === "#REF") throw new FormulaError("REF");
      const a = parseRef(t.v);
      if (!a) throw new FormulaError(/^[A-Za-z_]+$/.test(t.v) ? "NAME" : "SYNTAX");
      if (isOp(":")) {
        p++;
        const idTok = peek();
        if (idTok.k !== "id") throw new FormulaError("SYNTAX");
        p++;
        const b = parseRef(idTok.v);
        if (!b) throw new FormulaError("SYNTAX");
        return { t: "range", r1: Math.min(a.r, b.r), c1: Math.min(a.c, b.c), r2: Math.max(a.r, b.r), c2: Math.max(a.c, b.c) };
      }
      return { t: "ref", r: a.r, c: a.c };
    }
    throw new FormulaError("SYNTAX");
  };
  const unary = (): Ast => {
    if (isOp("-")) {
      p++;
      return { t: "neg", e: unary() };
    }
    if (isOp("+")) {
      p++;
      return unary();
    }
    return primary();
  };
  const mul = (): Ast => {
    let a = unary();
    while (isOp("*") || isOp("/")) {
      const op = toks[p++]!.v;
      a = { t: "bin", op, a, b: unary() };
    }
    return a;
  };
  const add = (): Ast => {
    let a = mul();
    while (isOp("+") || isOp("-")) {
      const op = toks[p++]!.v;
      a = { t: "bin", op, a, b: mul() };
    }
    return a;
  };
  const cmp = (): Ast => {
    const a = add();
    for (const op of ["<=", ">=", "<>", "<", ">", "="]) {
      if (isOp(op)) {
        p++;
        return { t: "bin", op, a, b: add() };
      }
    }
    return a;
  };

  const ast = cmp();
  if (peek().k !== "end") throw new FormulaError("SYNTAX");
  return ast;
}

// ------------------------------------------------------------ Tính

/** Kết quả một ô đã tính. `num` = giá trị số (null nếu là chữ/trống/lỗi). */
export interface CellResult {
  isFormula: boolean;
  /** Chữ hiển thị / xuất ra ngoài. Ô công thức lỗi: mã lỗi ("#VALUE"…). */
  text: string;
  num: number | null;
  error: FormulaErrorCode | null;
}

type Val = number | string;

/** Làm tròn bỏ sai số nhị phân (0.1+0.2 → 0.3). */
const clean = (n: number): number => Number(n.toPrecision(12));

export function displayNumber(n: number): string {
  return formatNumber(clean(n), 6);
}

export interface TableEval {
  /** Kết quả (tính lười, có nhớ) của ô (r,c); ô ngoài bảng → ô trống. */
  at(r: number, c: number): CellResult;
}

const ast$ = new Map<string, Ast | FormulaError>();
function astOf(src: string): Ast {
  let hit = ast$.get(src);
  if (!hit) {
    try {
      hit = parse(src);
    } catch (e) {
      hit = e instanceof FormulaError ? e : new FormulaError("SYNTAX");
    }
    if (ast$.size > 2000) ast$.clear();
    ast$.set(src, hit);
  }
  if (hit instanceof FormulaError) throw hit;
  return hit;
}

export function evalTable(table: Pick<TableBlock, "cells" | "align">): TableEval {
  const memo = new Map<number, CellResult>();
  const busy = new Set<number>();
  const cols = table.align.length;
  const rows = table.cells.length;
  const key = (r: number, c: number): number => r * 1024 + c;

  const plain = (raw: string): CellResult => {
    const n = parseNumber(raw);
    return { isFormula: false, text: raw, num: n, error: null };
  };
  const failed = (code: FormulaErrorCode): CellResult => ({ isFormula: true, text: FORMULA_ERROR_TEXT[code], num: null, error: code });

  const at = (r: number, c: number): CellResult => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) return { isFormula: false, text: "", num: null, error: null };
    const k = key(r, c);
    const hit = memo.get(k);
    if (hit) return hit;
    const raw = table.cells[r]?.[c] ?? "";
    let res: CellResult;
    if (!isFormula(raw)) {
      res = plain(raw);
    } else if (busy.has(k)) {
      return failed("CYCLE");
    } else {
      busy.add(k);
      try {
        const v = evalAst(astOf(raw.slice(1)));
        res = typeof v === "number" ? { isFormula: true, text: displayNumber(v), num: clean(v), error: null } : { isFormula: true, text: v, num: null, error: null };
      } catch (e) {
        res = failed(e instanceof FormulaError ? e.code : "SYNTAX");
      } finally {
        busy.delete(k);
      }
    }
    memo.set(k, res);
    return res;
  };

  /** Giá trị đơn của một ô khi dùng trong phép toán. */
  const scalar = (r: number, c: number): Val => {
    if (r < 0 || c < 0 || r >= rows || c >= cols) throw new FormulaError("REF");
    const x = at(r, c);
    if (x.error) throw new FormulaError(x.error);
    if (x.num !== null) return x.num;
    return x.text.trim() === "" ? 0 : x.text;
  };
  const toNum = (v: Val): number => {
    if (typeof v === "number") return v;
    const n = parseNumber(v);
    if (n === null) throw new FormulaError("VALUE");
    return n;
  };

  /** Gom các ô số trong vùng/ô; `all` = mọi ô không trống (cho COUNTA). */
  const collect = (arg: Ast, nums: number[], nonEmpty: { n: number }): void => {
    if (arg.t === "range") {
      if (arg.r2 >= rows || arg.c2 >= cols) throw new FormulaError("REF");
      for (let r = arg.r1; r <= arg.r2; r++) {
        for (let c = arg.c1; c <= arg.c2; c++) {
          const x = at(r, c);
          if (x.error) throw new FormulaError(x.error);
          if (x.num !== null) nums.push(x.num);
          if (x.text.trim() !== "") nonEmpty.n++;
        }
      }
    } else if (arg.t === "ref") {
      const x = (() => {
        if (arg.r >= rows || arg.c >= cols) throw new FormulaError("REF");
        return at(arg.r, arg.c);
      })();
      if (x.error) throw new FormulaError(x.error);
      if (x.num !== null) nums.push(x.num);
      if (x.text.trim() !== "") nonEmpty.n++;
    } else {
      const v = evalAst(arg);
      if (typeof v === "number") {
        nums.push(v);
        nonEmpty.n++;
      } else {
        const n = parseNumber(v);
        if (n === null) throw new FormulaError("VALUE");
        nums.push(n);
        nonEmpty.n++;
      }
    }
  };

  const truthy = (v: Val): boolean => (typeof v === "number" ? v !== 0 : v !== "");

  const call = (name: string, args: Ast[]): Val => {
    if (name === "IF") {
      if (args.length < 2 || args.length > 3) throw new FormulaError("ARGS");
      if (truthy(evalAst(args[0]!))) return evalAst(args[1]!);
      return args.length === 3 ? evalAst(args[2]!) : 0;
    }
    if (name === "ROUND") {
      if (args.length < 1 || args.length > 2) throw new FormulaError("ARGS");
      const x = toNum(evalAst(args[0]!));
      const d = args.length === 2 ? Math.trunc(toNum(evalAst(args[1]!))) : 0;
      if (d < -15 || d > 15) throw new FormulaError("ARGS");
      const f = Math.pow(10, d);
      return Math.sign(x) * Math.round(Math.abs(x) * f + 1e-9) / f;
    }
    if (!(FORMULA_FUNCTIONS as readonly string[]).includes(name)) throw new FormulaError("NAME");
    if (args.length === 0) throw new FormulaError("ARGS");
    const nums: number[] = [];
    const ne = { n: 0 };
    for (const a of args) collect(a, nums, ne);
    switch (name) {
      case "SUM":
        return nums.reduce((a, b) => a + b, 0);
      case "COUNT":
        return nums.length;
      case "COUNTA":
        return ne.n;
      case "MIN":
        return nums.length ? Math.min(...nums) : 0;
      case "MAX":
        return nums.length ? Math.max(...nums) : 0;
      case "AVERAGE":
        if (nums.length === 0) throw new FormulaError("DIV0");
        return nums.reduce((a, b) => a + b, 0) / nums.length;
      case "MEDIAN": {
        if (nums.length === 0) throw new FormulaError("VALUE");
        const s = [...nums].sort((a, b) => a - b);
        const m = s.length >> 1;
        return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
      }
    }
    throw new FormulaError("NAME");
  };

  function evalAst(a: Ast): Val {
    switch (a.t) {
      case "num":
      case "str":
        return a.v;
      case "ref":
        return scalar(a.r, a.c);
      case "range":
        throw new FormulaError("VALUE"); // vùng chỉ dùng làm đối số hàm
      case "neg":
        return -toNum(evalAst(a.e));
      case "call":
        return call(a.name, a.args);
      case "bin": {
        const x = evalAst(a.a);
        const y = evalAst(a.b);
        if (["=", "<>", "<", ">", "<=", ">="].includes(a.op)) {
          const bothNum = typeof x === "number" && typeof y === "number";
          const l: number | string = bothNum ? x : typeof x === "number" && parseNumber(String(y)) !== null ? x : String(x).toLowerCase();
          const rr: number | string = bothNum ? y : typeof x === "number" && parseNumber(String(y)) !== null ? parseNumber(String(y))! : String(y).toLowerCase();
          switch (a.op) {
            case "=": return l === rr ? 1 : 0;
            case "<>": return l !== rr ? 1 : 0;
            case "<": return l < rr ? 1 : 0;
            case ">": return l > rr ? 1 : 0;
            case "<=": return l <= rr ? 1 : 0;
            default: return l >= rr ? 1 : 0;
          }
        }
        const nx = toNum(x);
        const ny = toNum(y);
        switch (a.op) {
          case "+": return nx + ny;
          case "-": return nx - ny;
          case "*": return nx * ny;
          default:
            if (ny === 0) throw new FormulaError("DIV0");
            return nx / ny;
        }
      }
    }
  }

  return { at };
}

/** Chữ hiển thị của mọi ô (công thức → kết quả). Cho xuất file / màn hình tĩnh. */
export function displayCells(table: Pick<TableBlock, "cells" | "align">): string[][] {
  if (!table.cells.some((row) => row.some(isFormula))) return table.cells;
  const ev = evalTable(table);
  return table.cells.map((row, r) => row.map((_, c) => ev.at(r, c).text));
}

/** Bảng có ô công thức nào không (để bỏ qua việc tính khi không cần). */
export function hasFormulas(table: Pick<TableBlock, "cells">): boolean {
  return table.cells.some((row) => row.some(isFormula));
}

// ------------------------------------------------------------ Chèn/xoá hàng-cột

const REF_SCAN = /(?<![A-Za-z0-9_$.#])(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,5})(?::(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,5}))?(?![A-Za-z0-9_$.]|\s*\()/g;

/**
 * Viết lại tham chiếu ô trong MỘT công thức khi bảng chèn/xoá hàng hoặc cột
 * tại chỉ số `at` (0-based), giống Excel:
 * - chèn: mọi tham chiếu ở hàng/cột ≥ `at` dịch +1 (chèn giữa một vùng thì vùng nở ra);
 * - xoá: tham chiếu sau `at` dịch −1; vùng co lại; ô đơn/vùng nằm trọn trong hàng/cột bị xoá → `#REF`
 *   (tính ra lỗi #REF).
 * Chữ trong "…" không bị đụng tới. Công thức không có tham chiếu bị ảnh hưởng giữ nguyên.
 */
export function shiftFormulaRefs(formula: string, axis: "row" | "col", at: number, kind: "insert" | "delete"): string {
  const parts = formula.split(/("[^"]*")/); // phần lẻ là chuỗi trong ngoặc kép
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(REF_SCAN, (_m, d1: string, l1: string, d2: string, n1: string, e1?: string, l2?: string, e2?: string, n2?: string) => {
        const a = { c: columnIndex(l1.toUpperCase()), r: Number(n1) - 1 };
        const hasEnd = l2 !== undefined && n2 !== undefined;
        const b = hasEnd ? { c: columnIndex(l2!.toUpperCase()), r: Number(n2) - 1 } : a;
        const k = axis === "row" ? "r" : "c";
        let lo = Math.min(a[k], b[k]);
        let hi = Math.max(a[k], b[k]);
        if (kind === "insert") {
          if (lo >= at) lo++;
          if (hi >= at) hi++;
        } else {
          if (lo === at && hi === at) return "#REF";
          if (lo > at) lo--;
          if (hi >= at) hi--;
          if (hi < lo) return "#REF";
        }
        const fix = (p: { c: number; r: number }, v: number): { c: number; r: number } => (k === "r" ? { c: p.c, r: v } : { c: v, r: p.r });
        // Giữ nguyên thứ tự đầu/cuối người dùng gõ (A5:A2 vẫn là A5:A2 sau khi dịch).
        const swapped = a[k] > b[k];
        const pa = fix(a, swapped ? hi : lo);
        const pb = fix(b, swapped ? lo : hi);
        const one = (p: { c: number; r: number }, dl: string, dn: string, lt: string): string => {
          const name = columnName(p.c);
          return `${dl}${lt === lt.toLowerCase() ? name.toLowerCase() : name}${dn}${p.r + 1}`;
        };
        const head = one(pa, d1, d2, l1);
        return hasEnd ? `${head}:${one(pb, e1 ?? "", e2 ?? "", l2!)}` : head;
      });
    })
    .join("");
}

/** Áp `shiftFormulaRefs` cho mọi ô công thức của lưới (ô thường giữ nguyên, cùng tham chiếu khi không đổi). */
export function shiftCells(cells: string[][], axis: "row" | "col", at: number, kind: "insert" | "delete"): string[][] {
  if (!cells.some((row) => row.some(isFormula))) return cells;
  return cells.map((row) => row.map((v) => (isFormula(v) ? shiftFormulaRefs(v, axis, at, kind) : v)));
}
