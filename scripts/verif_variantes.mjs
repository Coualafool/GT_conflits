// verif_variantes.mjs — vérification des 3 variantes de frise (lignes / grappes / liste)
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_variantes.mjs
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
const BASE = process.env.POC_BASE || "http://localhost:8899/interne/poc-timeline";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: ART + name + ".png" }); };
const domEvents = () => page.evaluate(() => EV.filter((e) => e[0] >= d0 - 0.25 && e[0] <= d1 + 0.25).length);

/* ----------------variante A : une ligne par ère---------------- */
await page.goto(BASE + "/variante-A-lignes.html", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const n = await page.evaluate(() => document.querySelectorAll(".ev").length);
  log("(A1) 93 points en vue Tout", n === 93, "points: " + n);
  await shot("varA-tout");
}
await page.mouse.move(700, 400);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120); }
{
  const [dots, exp] = [await page.evaluate(() => document.querySelectorAll(".ev").length), await domEvents()];
  log("(A2) zoom avant — aucun point perdu", dots === exp, `points=${dots} attendus=${exp}`);
  await shot("varA-zoom");
  const ov = await page.evaluate(() => {
    const labs = [...document.querySelectorAll(".ev .lab")].map((l) => l.getBoundingClientRect()).filter((r) => r.width > 0);
    let v = 0;
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const a = labs[i], b = labs[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) v++;
    }
    return { overlaps: v, count: labs.length };
  });
  log("(A3) zéro chevauchement d'étiquettes en zoom", ov.overlaps === 0, JSON.stringify(ov));
  log("(A4) le zoom fait apparaître des étiquettes", ov.count > 20, "étiquettes: " + ov.count);
}
await page.click('button[data-a="1918"]'); await page.waitForTimeout(350);
{
  const [dots, exp] = [await page.evaluate(() => document.querySelectorAll(".ev").length), await domEvents()];
  log("(A5) preset Mandat — exhaustivité", dots === exp, `points=${dots} attendus=${exp}`);
  await shot("varA-mandat");
  await page.evaluate(() => document.querySelector(".ev i").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(300);
  log("(A6) clic point → panneau", await page.evaluate(() => document.querySelector("#panel").classList.contains("open")), "panneau");
}

/* ----------------variante B : grappes---------------- */
await page.goto(BASE + "/variante-B-grappes.html", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const b = await page.evaluate(() => {
    const dots = document.querySelectorAll(".dot[data-ev]").length;
    const grouped = [...document.querySelectorAll("[data-g]")].map((c) => +c.textContent.match(/×(\d+)/)[1]).reduce((s, n) => s + n, 0);
    return { dots, grouped, groups: document.querySelectorAll("[data-g]").length };
  });
  log("(B1) Tout — points + membres de grappes = 93", b.dots + b.grouped === 93, JSON.stringify(b));
  await shot("varB-tout");
  await page.evaluate(() => {
    const ch = [...document.querySelectorAll("[data-g]")].sort((a, b) => +b.textContent.match(/×(\d+)/)[1] - +a.textContent.match(/×(\d+)/)[1])[0];
    ch.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(450);
  const after = await page.evaluate(() => ({ open: document.querySelector("#panel").classList.contains("open"), li: document.querySelectorAll("#panel ul.grp li").length, span: d1 - d0 }));
  log("(B2) clic grappe → liste + zoom", after.open && after.li >= 2 && after.span < 60, JSON.stringify(after));
  await shot("varB-grappe");
  await page.keyboard.press("0"); await page.waitForTimeout(300);
  log("(B3) touche 0 → retour Tout groupé", await page.evaluate(() => document.querySelectorAll("[data-g]").length > 0), "groupes revenus");
}

/* ----------------variante C : navigateur + liste---------------- */
await page.goto(BASE + "/variante-C-liste.html", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const n = await page.evaluate(() => document.querySelectorAll("#list .item").length);
  log("(C1) Tout — 93 lignes de liste", n === 93, "lignes: " + n);
  await shot("varC-tout");
}
{
  const wb = await page.locator("#navWin").boundingBox();
  await page.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2);
  await page.mouse.down();
  await page.mouse.move(wb.x + wb.width / 2 - 300, wb.y + wb.height / 2, { steps: 8 });
  await page.mouse.up(); await page.waitForTimeout(400);
  const s = await page.evaluate(() => ({ span: d1 - d0, items: document.querySelectorAll("#list .item").length, exact: document.querySelectorAll("#list .item").length === EV.filter((e) => e[0] >= d0 && e[0] <= d1).length }));
  log("(C2) drag fenêtre → liste synchronisée", s.span < 90 && s.items > 0 && s.exact, JSON.stringify(s));
  await shot("varC-drag");
}
{
  const wb = await page.locator("#navWin .h.r").boundingBox();
  await page.mouse.move(wb.x + 5, wb.y + wb.height / 2);
  await page.mouse.down();
  await page.mouse.move(wb.x + 150, wb.y + wb.height / 2, { steps: 6 });
  await page.mouse.up(); await page.waitForTimeout(350);
  const okRes = await page.evaluate(() => document.querySelectorAll("#list .item").length === EV.filter((e) => e[0] >= d0 && e[0] <= d1).length);
  log("(C3) resize bord droit — liste toujours exacte", okRes, "cohérence domaine");
}
await page.locator("#list .item").first().click();
await page.waitForTimeout(300);
log("(C4) clic ligne → panneau détail", await page.evaluate(() => document.querySelector("#panel").classList.contains("open")), "panneau");
await shot("varC-panel");
await page.keyboard.press("Escape");
await page.keyboard.press("0"); await page.waitForTimeout(300);
log("(C5) touche 0 → Tout", await page.evaluate(() => Math.round(d0) === 1895 && Math.round(d1) === 2029), "domaine reinitialise");

/* ----------------zéro erreur console sur les 3 pages ---------------- */
{
  const real = pageErrors.filter((e) => !/favicon/i.test(e));
  log("(Z) zero page errors (3 variantes)", real.length === 0, real.length ? "errors: " + real.join(" | ") : "none");
}

console.log("\n===== RESULTATS =====");
console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`${results.length - fails}/${results.length} checks pass`);
await browser.close();
process.exit(fails ? 1 : 0);
