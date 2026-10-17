// Dung file .exe portable: build web -> chen shim Neutralino -> neu build (nhung resources vao 1 file).
// Chay tu thu muc goc: npm run build:desktop
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: "inherit" });

run("npm run build", root);

if (!existsSync(join(here, "node_modules"))) run("npm install --no-audit --no-fund", here);
if (!existsSync(join(here, "bin", "neutralino-win_x64.exe")) || !existsSync(join(here, "resources", "js", "neutralino.js"))) {
  run("npx neu update", here);
}

// Shim: trong cua so Neutralino, window.open(url) phai mo bang trinh duyet mac dinh cua he dieu hanh.
const shim = `<script src="/__neutralino_globals.js"></script>
<script src="/js/neutralino.js"></script>
<script>
(function () {
  if (typeof Neutralino === "undefined") return;
  try { Neutralino.init(); } catch (e) {}
  var nativeOpen = window.open;
  window.open = function (url) {
    if (typeof url === "string" && /^(https?:|mailto:)/i.test(url)) {
      Neutralino.os.open(url).catch(function () {});
      return null;
    }
    return nativeOpen.apply(window, arguments);
  };
})();
</script>`;

let html = readFileSync(join(root, "dist", "index.html"), "utf8");
// Chen SAU the <meta charset> (the nay phai nam trong 1024 byte dau cua file).
const charsetMeta = html.match(/<meta\s+charset=[^>]*>/i);
if (!charsetMeta) throw new Error("dist/index.html khong co <meta charset>");
html = html.replace(charsetMeta[0], charsetMeta[0] + "\n" + shim);
mkdirSync(join(here, "resources"), { recursive: true });
writeFileSync(join(here, "resources", "index.html"), html);

// Chi can binary Windows (neu build mac dinh nhung vao ca Linux/macOS, de loi khi embed).
for (const f of readdirSync(join(here, "bin"))) {
  if (f !== "neutralino-win_x64.exe") rmSync(join(here, "bin", f), { force: true });
}

const out = join(here, "dist");
const sub = join(out, "T17Mind");
let embedded = false;
rmSync(out, { recursive: true, force: true });
try {
  run("npx neu build --release --embed-resources", here);
  embedded = true;
} catch {
  console.warn("\n[!] Khong nhung duoc resources vao exe (loi postject/PE). Chuyen sang kieu 2 file: exe + resources.neu");
  rmSync(out, { recursive: true, force: true });
  run("npx neu build --release", here);
}

// Gom thanh thu muc portable + zip
const portable = join(out, "T17Mind-portable");
mkdirSync(portable, { recursive: true });
copyFileSync(join(sub, "T17Mind-win_x64.exe"), join(portable, "T17Mind.exe"));
if (!embedded) copyFileSync(join(sub, "resources.neu"), join(portable, "resources.neu"));
console.log("\nXong:", embedded ? "1 file exe (da nhung resources)" : "T17Mind.exe + resources.neu (de cung thu muc)", "->", portable);
