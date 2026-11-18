// spike_three_vendor.mjs — spike S-A/S-B : quel build three.js survit à file:// sur TARS.
// Ouvre frise/vendor/probe.html?b=a (bundle esbuild IIFE) et ?b=b (UMD r160) en file://
// sur Edge ET Chromium (playwright), lit window.__probe. Usage (racine du repo, TARS) :
//   .runtime\node\node.exe scripts\spike_three_vendor.mjs
import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(ROOT, ".runtime", "ms-playwright");
let chromium;
try { chromium = createRequire(import.meta.url)("playwright").chromium; }
catch { console.error("playwright absent du node_modules du repo — lancer scripts\\tars_setup_runtime.ps1 d'abord"); process.exit(2); }

const PROBE = pathToFileURL(path.join(ROOT, "frise", "vendor", "probe.html")).href;
const GL_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

let fail = 0;
for (const [name, opts] of [["edge", { channel: "msedge" }], ["chromium", {}]]) {
  let browser;
  try { browser = await chromium.launch({ ...opts, headless: true, args: GL_ARGS }); }
  catch (e) { console.log("FAIL  spike-" + name + " — launch: " + e.message); fail = 1; continue; }
  for (const b of ["a", "b"]) {
    const page = await browser.newPage({ viewport: { width: 400, height: 320 } });
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e)));
    try {
      await page.goto(PROBE + "?b=" + b, { waitUntil: "load" });
      await page.waitForFunction(() => window.__probe, null, { timeout: 15000 });
      const p = await page.evaluate(() => window.__probe);
      const ok = !!p.ok && errs.length === 0;
      if (!ok) fail = 1;
      console.log((ok ? "PASS" : "FAIL") + "  spike-" + name + "-" + b + " — " +
        (p.err ? "err=" + p.err : `rev=${p.rev} gl=${String(p.gl).slice(0, 40)} lit=${p.litPx} fond=${p.bgPx} raycast=${p.raycast}`) +
        (errs.length ? " pageerror=" + errs[0].slice(0, 120) : ""));
    } catch (e) {
      fail = 1;
      console.log("FAIL  spike-" + name + "-" + b + " — " + e.message.slice(0, 160) + (errs.length ? " pageerror=" + errs[0].slice(0, 120) : ""));
    }
    await page.close();
  }
  await browser.close();
}
console.log(fail ? "SPIKE: au moins un échec" : "SPIKE: les deux builds marchent en file://");
process.exit(fail);
