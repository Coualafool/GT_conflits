// verif_poc_A.mjs — vérification du PoC frise "Fraction A" (frise)
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_poc_A.mjs
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
const PAGE_URL = process.env.POC_URL || "http://localhost:8899/frise/poc-A-niveaux.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

await page.goto(PAGE_URL, { waitUntil: "load" });
await page.waitForTimeout(800);

// Géométrie du canvas dérivée de la boîte réelle : les blocs communs
// (pied compact) réduisent #viz — les coordonnées codées en dur allaient
// cliquer hors du canvas (2026-11-13).
const VB = await page.locator("#viz").boundingBox();
const VCX = VB.x + VB.width * 0.5;
const VY = (f) => VB.y + VB.height * f;
const VCY = VY(0.45);

// (a) zero page errors
{
  const real = pageErrors.filter((e) => !/favicon/i.test(e));
  log("(a) zero page errors", real.length === 0, real.length ? "errors: " + real.join(" | ") : "none");
}

// (b) help card visible on load, closes on first wheel, reopens with ?
{
  const vis0 = await page.locator("#help").isVisible();
  await page.mouse.move(VCX, VCY);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(300);
  const vis1 = await page.locator("#help").isVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("?");
  await page.waitForTimeout(150);
  const vis2 = await page.locator("#help").isVisible();
  await page.keyboard.press("?");
  log("(b) help lifecycle", vis0 && !vis1 && vis2, `load=${vis0} afterWheel=${vis1} afterQuestion=${vis2}`);
}

// (c) wheel zoom changes readout; level badge text updates
{
  const r0 = await page.locator("#zoomReadout").innerText();
  const b0 = await page.locator("#levelBadge").innerText();
  await page.mouse.move(VCX, VCY);
  await page.mouse.wheel(0, -1800);
  await page.waitForTimeout(300);
  const r1 = await page.locator("#zoomReadout").innerText();
  const b1 = await page.locator("#levelBadge").innerText();
  log("(c) wheel zoom", r0 !== r1, `"${r0}" -> "${r1}" | badge "${b0}" -> "${b1}"`);
}

// (d) drag pans (viewRect moves), preset button re-zooms + gets .on
{
  const left0 = await page.locator("#viewRect").evaluate((el) => el.style.left);
  await page.mouse.move(VCX + VB.width * 0.25, VCY);
  await page.mouse.down();
  await page.mouse.move(VCX - VB.width * 0.2, VCY, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const left1 = await page.locator("#viewRect").evaluate((el) => el.style.left);
  await page.click('button[data-span="0"]');
  await page.waitForTimeout(300);
  const on = await page.locator('button[data-span="0"]').evaluate((el) => el.classList.contains("on"));
  const active = await page.locator(".controls button.on").count();
  log("(d) drag + presets", left0 !== left1 && on && active === 1, `viewRect ${left0}->${left1} tout.on=${on} actives=${active}`);
}

// (e) zoom overlay buttons
{
  const r0 = await page.locator("#zoomReadout").innerText();
  await page.click("#zIn");
  await page.waitForTimeout(250);
  const r1 = await page.locator("#zoomReadout").innerText();
  await page.click("#zOut");
  await page.waitForTimeout(250);
  const r2 = await page.locator("#zoomReadout").innerText();
  log("(e) zoom +/− buttons", r0 !== r1 && r1 !== r2, `"${r0}" -> "${r1}" -> "${r2}"`);
}

// (f) era click zooms to era
{
  await page.click('button[data-span="0"]');
  await page.waitForTimeout(250);
  const r0 = await page.locator("#zoomReadout").innerText();
  const era = page.locator(".era").first();
  await era.click();
  await page.waitForTimeout(300);
  const r1 = await page.locator("#zoomReadout").innerText();
  log("(f) era click zooms", r0 !== r1, `"${r0}" -> "${r1}"`);
}

// (g) minimap click + drag moves viewRect
{
  const left0 = await page.locator("#viewRect").evaluate((el) => el.style.left);
  const box = await page.locator("#minimap").boundingBox();
  await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.waitForTimeout(300);
  const left1 = await page.locator("#viewRect").evaluate((el) => el.style.left);
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const left2 = await page.locator("#viewRect").evaluate((el) => el.style.left);
  log("(g) minimap click+drag", left0 !== left1 && left1 !== left2, `viewRect ${left0}->${left1}->${left2}`);
}

// (h) event click opens panel (title, meta, chapter link), Escape closes
{
  await page.click('button[data-since="2023"]');
  await page.waitForTimeout(300);
  // premier point ENTIÈREMENT dans le champ : les puces frontières (x<0 ou x>W) ne sont que des affleurements visuels, non cliquables par Playwright
  const idx = await page.evaluate(() => {
    const b = document.getElementById("field").getBoundingClientRect();
    const els = [...document.querySelectorAll(".ev")];
    return els.findIndex((e) => { const r = e.getBoundingClientRect(); return r.left >= b.left - 0.5 && r.right <= b.right + 0.5; });
  });
  if (idx < 0) throw new Error("aucun .ev entièrement dans le champ");
  const ev = page.locator(".ev").nth(idx);
  await ev.click();
  await page.waitForTimeout(250);
  const open1 = await page.locator("#panel").isVisible();
  const title = await page.locator("#panel h3").innerText();
  const meta = await page.locator("#panel .meta").innerText();
  const href = await page.locator("#panel a").getAttribute("href");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const open2 = await page.locator("#panel").isVisible();
  log("(h) panel open/close", open1 && !open2 && title.length > 4 && /chapitre/.test(meta) && /chapitre-\d+-espace\.html#s\d/.test(href),
      `open=${open1} closed=${!open2} title='${title.slice(0, 40)}' href=${href}`);
  await page.screenshot({ path: ART + "poc-open.png" });
}

// (i) keyboard: 0 = full view, arrows pan (tested from a zoomed state — full view legitimately can't pan)
{
  await page.locator("#viz").click({ position: { x: VB.width * 0.5, y: VB.height * 0.7 } });
  await page.mouse.move(VCX, VCY);
  await page.mouse.wheel(0, -1200);
  await page.waitForTimeout(300);
  const leftA = await page.locator("#viewRect").evaluate((el) => el.style.left);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const leftB = await page.locator("#viewRect").evaluate((el) => el.style.left);
  await page.keyboard.press("0");
  await page.waitForTimeout(300);
  const r0 = await page.locator("#zoomReadout").innerText();
  const fullSpan = await page.evaluate(() => Math.round(T_MAX - T_MIN)); // dérivé du jeu de données, pas codé en dur
  log("(i) keyboard arrows + 0", leftA !== leftB && r0 === fullSpan + " ans visibles", `viewRect ${leftA}->${leftB} full='${r0}' attendu='${fullSpan} ans visibles'`);
}

// (j) double-click zooms in, shift+double-click out
{
  const r0 = await page.locator("#zoomReadout").innerText();
  await page.mouse.dblclick(VCX, VY(0.35));
  await page.waitForTimeout(300);
  const r1 = await page.locator("#zoomReadout").innerText();
  log("(j) double-click zoom", r0 !== r1, `"${r0}" -> "${r1}"`);
}

// (a2) vue zoomee a etiquettes : aucune etiquette ne depasse du champ (replay du rognage du 10/11 —
// a pleine amplitude la vue est sans etiquettes ; on zoome d'abord la ou les etiquettes apparaissent)
{
  await page.evaluate(() => { const z = document.getElementById("zoomSlider"); z.value = 50; z.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.waitForTimeout(400);
  const over = await page.evaluate(() => {
    const box = document.getElementById("field").getBoundingClientRect();
    const bad = [...document.querySelectorAll("#field .ev .lab")].filter((l) => {
      const r = l.getBoundingClientRect();
      return r.right > box.right + 1 || r.left < box.left - 1;
    });
    return { total: document.querySelectorAll("#field .ev .lab").length, n: bad.length, sample: bad.slice(0, 3).map((l) => l.textContent.slice(0, 30)) };
  });
  log("(a2) labeled view: no label overflows viewport", over.total > 0 && over.n === 0, "labels=" + over.total + " overflows=" + over.n + " " + JSON.stringify(over.sample));
  await page.keyboard.press("0");
  await page.waitForTimeout(300);
}

// (k) desktop screenshots (full view, help shown)
{
  await page.click('button[data-span="0"]');
  await page.click("#btnHelp");
  await page.waitForTimeout(300);
  await page.screenshot({ path: ART + "poc-desktop.png" });
  await page.click("#help .x");
  log("(k) desktop screenshot", true, ART + "poc-desktop.png");
}

// (l) mobile 390px: no horizontal overflow; panel fits viewport when opened
{
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const ev = page.locator(".ev").first();
  const hasEv = await page.locator(".ev").count();
  if (hasEv) { await ev.click(); await page.waitForTimeout(250); }
  const fits = await page.locator("#panel").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.right <= window.innerWidth + 1 && r.left >= -1;
  });
  await page.screenshot({ path: ART + "poc-mobile.png" });
  log("(l) mobile fits", overflow <= 0 && (!hasEv || fits), `overflow=${overflow}px panelFits=${fits} evs=${hasEv}`);
}

// (z) page errors recap
log("(z) no page errors (final)", pageErrors.length === 0, JSON.stringify(pageErrors));

console.log("\n===== RESULTS =====");
for (const r of results) console.log(r);
console.log("===== END =====");
await browser.close();
const failed = results.filter((r) => r.startsWith("FAIL")).length;
process.exit(failed ? 1 : 0);
