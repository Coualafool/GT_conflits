// verif_perspectives.mjs — vérification des 3 vues « trois récits » (D triptyque / E bascule / F tresse)
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_perspectives.mjs
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

/* ----------------module partagé : cohérence des données de récit ---------------- */
await page.goto(BASE + "/perspective-D-triptyque.html", { waitUntil: "load" });
await page.waitForTimeout(700);
const meta = await page.evaluate(() => ({
  lv: LV.length,
  lvBad: LV.some(r => r.length !== 3 || r.some(v => ![0, 1, 2].includes(v))),
  pal: nTold("pal"), isr: nTold("isr"), occ: nTold("occ"),
  ndiv: EV.reduce((s, _, i) => s + (divergent(i) ? 1 : 0), 0),
  ren: Object.keys(REN).length,
}));
log("(P0) module récits : 93 lignes de niveaux, titres divergents présents",
  meta.lv === 93 && !meta.lvBad && meta.ndiv > 20 && meta.ren > 20, JSON.stringify(meta));
log("(P0b) chaque récit raconte une partie crédible du corpus",
  meta.pal > 45 && meta.isr > 45 && meta.occ > 45 && meta.pal < 93 && meta.isr < 93 && meta.occ < 93,
  `pal=${meta.pal} isr=${meta.isr} occ=${meta.occ} / 93`);

/* ----------------D : triptyque ---------------- */
{
  const counts = await page.evaluate(() => PERS_KEYS.map(k => ({
    k, n: document.querySelectorAll('#lb-' + k + ' .dot').length, exp: nTold(k),
  })));
  log("(D1) Tout — chaque ligne montre exactement ses événements",
    counts.every(c => c.n === c.exp), JSON.stringify(counts));
  await shot("perspD-tout");
}
await page.mouse.move(700, 400);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120); }
{
  const inv = await page.evaluate(() => PERS_KEYS.map(k => {
    const dots = [...document.querySelectorAll('#lb-' + k + ' .dot')];
    const exp = pEvs(k).filter(o => o.ev[0] >= d0 - 0.25 && o.ev[0] <= d1 + 0.25).length;
    return { k, n: dots.length, exp };
  }));
  log("(D2) zoom — zéro événement perdu dans aucune ligne",
    inv.every(c => c.n === c.exp), JSON.stringify(inv));
  await shot("perspD-zoom");
  const ov = await page.evaluate(() => {
    const labs = [...document.querySelectorAll(".lab")].map(l => l.getBoundingClientRect()).filter(r => r.width > 0);
    let v = 0;
    for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
      const a = labs[i], b = labs[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) v++;
    }
    return { overlaps: v, count: labs.length };
  });
  log("(D3) étiquettes du triptyque — zéro chevauchement au zoom", ov.overlaps === 0 && ov.count >= 5, JSON.stringify(ov));
}
{
  const r = await page.evaluate(() => {
    document.querySelector('#lb-pal .dot[data-i="19"]').dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return {
      open: document.querySelector("#panel").classList.contains("open"),
      rows: document.querySelectorAll("#pRows .vrow").length,
      absent: document.querySelectorAll("#pRows .vrow.absent").length,
      first: document.querySelector("#pRows .vrow .vt").textContent.slice(0, 30),
    };
  });
  log("(D4) clic UNRWA → panneau comparé avec un récit absent", r.open && r.rows === 3 && r.absent >= 1, JSON.stringify(r));
  await shot("perspD-panel");
  await page.keyboard.press("Escape");
}

/* ----------------E : bascule ---------------- */
await page.goto(BASE + "/perspective-E-bascule.html", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const cmp = await page.evaluate(() => ({
    items: document.querySelectorAll("#list .item.cmp").length,
    div: [...document.querySelectorAll("#list .divbadge")].filter(b => b.textContent === "noms différents").length,
    ndiv: EV.reduce((s, _, i) => s + (divergent(i) ? 1 : 0), 0),
  }));
  log("(E1) comparaison — 93 lignes, badge de divergence cohérent", cmp.items === 93 && cmp.div === cmp.ndiv, JSON.stringify(cmp));
  await shot("perspE-cmp");
}
await page.click('#seg button[data-k="pal"]'); await page.waitForTimeout(450);
{
  const n = await page.evaluate(() => ({
    items: document.querySelectorAll("#list .item").length, exp: nTold("pal"),
  }));
  log("(E2) bascule palestinienne — la liste = sélection du récit", n.items === n.exp, JSON.stringify(n));
  await shot("perspE-pal");
}
await page.click('#seg button[data-k="isr"]'); await page.waitForTimeout(450);
{
  const r = await page.evaluate(() => ({
    items: document.querySelectorAll("#list .item").length, exp: nTold("isr"),
    hasInd: [...document.querySelectorAll("#list .ti")].some(t => t.textContent.includes("guerre d’Indépendance")),
    palTitleGone: ![...document.querySelectorAll("#list .ti")].some(t => t.textContent.includes("700 000 expulsé")),
  }));
  log("(E3) bascule israélienne — le 1948 palestinien y change de nom", r.items === r.exp && r.hasInd && r.palTitleGone, JSON.stringify(r));
}
{
  const r = await page.evaluate(() => {
    document.querySelector("#list .item").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { open: document.querySelector("#panel").classList.contains("open"), rows: document.querySelectorAll("#pRows .vrow").length };
  });
  log("(E4) clic ligne → panneau trois voix", r.open && r.rows === 3, JSON.stringify(r));
  await page.keyboard.press("Escape");
}

/* ----------------F : tresse ---------------- */
await page.goto(BASE + "/perspective-F-tresse.html", { waitUntil: "load" });
await page.waitForTimeout(800);
{
  const r = await page.evaluate(() => ({
    rows: document.querySelectorAll("#braid .row").length,
    cards: document.querySelectorAll("#braid .card").length,
    exp: nTold("pal") + nTold("isr") + nTold("occ"),
    grid3: [...document.querySelectorAll("#braid .card")].every(c => /grid-column/.test(c.getAttribute("style") || "")),
  }));
  log("(F1) tresse — 93 lignes, cartes = total des sélections, colonnes alignées", r.rows === 93 && r.cards === r.exp && r.grid3, JSON.stringify(r));
  await shot("perspF-tout");
}
await page.click('#chips button[data-f="central"]'); await page.waitForTimeout(500);
{
  const r = await page.evaluate(() => ({
    rows: document.querySelectorAll("#braid .row").length,
    cards: document.querySelectorAll("#braid .card").length,
    exp: PERS_KEYS.reduce((s, k) => s + pEvs(k).filter(o => o.l === 2).length, 0),
  }));
  log("(F2) filtre charnières — seulement les événements centraux", r.cards === r.exp && r.rows < 93, JSON.stringify(r));
  await shot("perspF-central");
}
{
  const r = await page.evaluate(() => {
    document.querySelector("#braid .card").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { open: document.querySelector("#panel").classList.contains("open"), rows: document.querySelectorAll("#pRows .vrow").length };
  });
  log("(F3) clic carte → panneau trois voix", r.open && r.rows === 3, JSON.stringify(r));
}

log("(Z) zéro erreur console (3 pages)", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | ") || "none");

await browser.close();
console.log("\n===== RESULTATS =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(`${results.length - fails}/${results.length} checks pass`);
process.exit(fails ? 1 : 0);
