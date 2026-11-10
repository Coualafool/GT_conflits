// verif_navigateur.mjs — GT_conflits chapter-2 verification (glossaire fix ad9bee3 + widgets)
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_navigateur.mjs
// Self-contained: playwright must live in this repo's node_modules (scripts/tars_setup_runtime.ps1).
// Exits 0 if every check passes; prints a PASS/FAIL RESULTS block to paste back.
import { createRequire } from "module";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
let chromium;
try { chromium = createRequire(import.meta.url)("playwright").chromium; }
catch { console.error("playwright absent du node_modules du repo — lancer scripts/tars_setup_runtime.ps1 d'abord"); process.exit(2); }

const ART = fileURLToPath(new URL("../artifacts/", import.meta.url));
mkdirSync(ART, { recursive: true });

const URL = process.env.KIT_URL || "http://localhost:8899/chapitres/chapitre-2-espace.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const httpErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("requestfailed", (r) => {});
page.on("response", (r) => { if (r.status() >= 400) httpErrors.push(r.status() + " " + r.url()); });

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(2500);

// (a) page errors — favicon 404 tolerated (it's an http 404, not a page error)
{
  const real = pageErrors.filter((e) => !/favicon/i.test(e));
  log("(a) zero page errors", real.length === 0, real.length ? "errors: " + real.join(" | ") : "pageErrors=" + JSON.stringify(pageErrors));
}

// (b) glossaire highlights
{
  const n = await page.locator("span.gl").count();
  log("(b) .gl highlights >= 15", n >= 15, "count=" + n);
}

// (c) tooltip on hover
{
  const gl = page.locator("span.gl").first();
  await gl.hover();
  await page.waitForTimeout(400);
  const style = await page.locator("#gl-infobulle").evaluate((el) => getComputedStyle(el).display);
  const txt = await page.locator("#gl-infobulle").innerText();
  const hasBold = await page.locator("#gl-infobulle b").count();
  log("(c) tooltip shows", style === "block" && hasBold >= 1, "display=" + style + " boldTerms=" + hasBold + " text='" + txt.slice(0, 60) + "'");
  await page.mouse.move(0, 0);
}

// (d) muet smoke: 16 chips, place ALL at exact targets, check -> 16 / 16
// NB: #muet-check is intentionally disabled until all 16 are placed.
{
  const chips = await page.locator("#muet-s1 button.muet-chip").count();
  log("(d0) 16 chips", chips === 16, "count=" + chips);
  const layer = page.locator("#muet-layer");
  const box = await layer.boundingBox();
  const TARGETS = { "Turquie":[38.9,8.8], "Chypre":[35.4,20.3], "Syrie":[44.7,20.6], "Liban":[39.6,23.8],
    "Isra\u00ebl":[38.4,31.5], "Jordanie":[41.2,32.9], "Irak":[53.9,25.9], "Iran":[71.2,28.2],
    "\u00c9gypte":[31.2,44.7], "saoudite":[56.3,53.2], "Kowe\u00eft":[60.7,37.1], "Y\u00e9men":[60.7,77.9],
    "M\u00e9diterran\u00e9e":[23.7,25.0], "Rouge":[44.7,54.4], "Persique":[67.5,42.6], "Suez":[31.9,33.7] };
  for (const [label,[xPct,yPct]] of Object.entries(TARGETS)) {
    await page.locator("#muet-s1 button.muet-chip", { hasText: label }).first().click();
    await layer.click({ position: { x: box.width*xPct/100, y: box.height*yPct/100 } });
  }
  await page.locator("#muet-check").click();
  const score = await page.locator("#muet-score").innerText();
  log("(d1) check shows 16 / 16", score.includes("16 / 16"), "score='" + score + "'");
  const dots = await page.locator("button.muet-dot").count();
  log("(d2) 16 dots on map", dots === 16, "dots=" + dots);
  await page.locator("#muet-reset").click();
  const dotsAfter = await page.locator("button.muet-dot").count();
  log("(d3) reset clears", dotsAfter === 0, "dots=" + dotsAfter);
}

// (d4) timeline scroll affordances: right arrow visible, scroll works, left arrow appears
{
  const R = page.locator("#tl-right");
  const visR0 = await R.isVisible();
  const L0 = await page.locator("#tl-left").isVisible();
  const before = await page.locator("#tl-track").evaluate((el) => el.scrollLeft);
  await page.locator("#tl-s1").screenshot({ path: ART + "tl-1.png" });
  await R.click();
  await page.waitForTimeout(900);
  const after = await page.locator("#tl-track").evaluate((el) => el.scrollLeft);
  const visL1 = await page.locator("#tl-left").isVisible();
  await page.locator("#tl-s1").screenshot({ path: ART + "tl-2.png" });
  log("(d4) scroll arrows", visR0 && !L0 && after > before && visL1,
      "right0=" + visR0 + " left0=" + L0 + " scrollLeft " + before + "->" + after + " left1=" + visL1);
  await page.locator("#tl-track").evaluate((el) => el.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

// (e) screenshots
{
  await page.screenshot({ path: ART + "fullpage2.png", fullPage: true });
  await page.locator("#tl-s1").screenshot({ path: ART + "tl-s1.png" });
  log("(e) screenshots", true, ART + "fullpage2.png + tl-s1.png");
}

log("(z) http >= 400 responses (favicon expected)", httpErrors.every((e) => /favicon/i.test(e)) && httpErrors.length <= 2, JSON.stringify(httpErrors));

console.log("\n===== RESULTS =====");
for (const r of results) console.log(r);
console.log("===== END =====");
await browser.close();
const failed = results.filter((r) => r.startsWith("FAIL")).length;
process.exit(failed ? 1 : 0);