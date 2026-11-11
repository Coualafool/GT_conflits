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

/* ----------------G : fusion C+D+F ---------------- */
await page.goto(BASE + "/perspective-G-fusion.html", { waitUntil: "load" });
await page.waitForTimeout(800);
{
  const r = await page.evaluate(() => ({
    rows: document.querySelectorAll("#braid .row").length,
    cards: document.querySelectorAll("#braid .card").length,
    dots: document.querySelectorAll("#navLanes i").length,
    expCards: nTold("pal") + nTold("isr") + nTold("occ"),
  }));
  log("(G1) tout — fenêtre entière = 93 lignes, tresse complète, mini-lignes complètes",
    r.rows === 93 && r.cards === r.expCards && r.dots === r.expCards, JSON.stringify(r));
  await shot("perspG-tout");
}
await page.click('#status button[data-a="1949"]'); await page.waitForTimeout(450);
{
  const r = await page.evaluate(() => {
    const lo = Math.ceil(d0), hi = Math.floor(d1);
    const years = [...document.querySelectorAll("#braid .card .yr")].map(t => parseInt(t.textContent, 10));
    return {
      rows: document.querySelectorAll("#braid .row").length,
      allInRange: years.length > 0 && years.every(y => y >= lo - 1 && y <= hi + 1),
      per: document.querySelector("#perLabel").textContent,
      expRows: EV.filter(ev => ev[0] >= d0 && ev[0] <= d1).length,
    };
  });
  log("(G2) prédéfini 1949–1987 — la tresse suit exactement la fenêtre",
    r.rows === r.expRows && r.allInRange && r.rows < 93, JSON.stringify(r));
  await shot("perspG-fenetre");
}
{
  const r = await page.evaluate(() => {
    document.querySelector('#status button[data-f="central"]').click();
    const exp = PERS_KEYS.reduce((s, k) => s + pEvs(k).filter(o => o.l === 2 && o.ev[0] >= d0 && o.ev[0] <= d1).length, 0);
    return { cards: document.querySelectorAll("#braid .card").length, exp };
  });
  log("(G3) filtre charnières dans la fenêtre", r.cards === r.exp && r.cards > 0, JSON.stringify(r));
  await page.click('#status button[data-f="all"]');
}
{
  const box = await page.locator("#navWin").boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 300, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const lo = Math.ceil(d0), hi = Math.floor(d1);
    const years = [...document.querySelectorAll("#braid .card .yr")].map(t => parseInt(t.textContent, 10));
    return {
      lo, hi, shifted: lo > 1949,
      rows: document.querySelectorAll("#braid .row").length,
      expRows: EV.filter(ev => ev[0] >= d0 && ev[0] <= d1).length,
      allInRange: years.every(y2 => y2 >= lo - 1 && y2 <= hi + 1),
    };
  });
  log("(G4) glisser la fenêtre — la tresse se resynchronise",
    r.shifted && r.rows === r.expRows && r.allInRange, JSON.stringify(r));
  await shot("perspG-drag");
}
{
  const r = await page.evaluate(() => {
    document.querySelector("#braid .card").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { open: document.querySelector("#panel").classList.contains("open"), rows: document.querySelectorAll("#pRows .vrow").length };
  });
  log("(G5) clic carte → panneau trois voix", r.open && r.rows === 3, JSON.stringify(r));
  await page.keyboard.press("Escape");
}
{
  const box = await page.locator("#navLanes").boundingBox();
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height / 2);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -240); await page.waitForTimeout(130); }
  const r = await page.evaluate(() => {
    const lo = Math.ceil(d0), hi = Math.floor(d1);
    const dots = [...document.querySelectorAll("#navLanes i")];
    const win = dots.filter(d => { const i = +d.dataset.i; return EV[i][0] >= d0 && EV[i][0] <= d1; });
    const cards = document.querySelectorAll("#braid .card").length;
    return { lo, hi, winDots: win.length, cards };
  });
  log("(G6) molette sur le navigateur — dots sous fenêtre = cartes de la tresse",
    r.winDots === r.cards && (r.hi - r.lo) < 40, JSON.stringify(r));
  await shot("perspG-zoom");
}

{
  const r = await page.evaluate(() => {
    const pills = [...document.querySelectorAll("#nav .laneLbl")].map(e => e.getBoundingClientRect());
    const dots = [...document.querySelectorAll("#navLanes i")].map(e => e.getBoundingClientRect());
    let overlaps = 0;
    for (const p of pills) for (const d of dots)
      if (p.left < d.right && d.left < p.right && p.top < d.bottom && d.top < p.bottom) overlaps++;
    const bands = [...document.querySelectorAll("#navLanes .lb")];
    return { pills: pills.length, dots: dots.length, overlaps,
      bands: bands.length, bandColors: new Set(bands.map(b => getComputedStyle(b).backgroundColor)).size };
  });
  log("(G7) pastilles de légende des lignes — zéro chevauchement avec les dots",
    r.pills === 3 && r.overlaps === 0, JSON.stringify(r));
  log("(G8) couloirs semi-transparents des trois lignes — présents et distincts",
    r.bands === 3 && r.bandColors === 3, JSON.stringify({ bands: r.bands, bandColors: r.bandColors }));
}

/* ----------------H : liens intelligents site ↔ frise ---------------- */
const ORIGIN = new URL(BASE).origin;
await page.goto(BASE + "/perspective-G-fusion.html?ch=2", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const r = await page.evaluate(() => {
    const ys = EV.filter(e => e[4] === 2).map(e => e[0]);
    return { lo: Math.round(d0), hi: Math.round(d1), min: Math.min(...ys), max: Math.max(...ys),
      covers: d0 <= Math.min(...ys) && d1 >= Math.max(...ys),
      rows: document.querySelectorAll("#braid .row").length };
  });
  log("(H1) ?ch=2 — fenêtre ouverte sur la plage des dates du chapitre 2",
    r.covers && r.rows >= 5 && (r.hi - r.lo) < 60, JSON.stringify(r));
  await shot("perspG-ch2");
}
await page.goto(BASE + "/perspective-G-fusion.html#s4.2", { waitUntil: "load" });
await page.waitForTimeout(700);
{
  const r = await page.evaluate(() => ({
    open: document.querySelector("#panel").classList.contains("open"),
    href: document.querySelector("#pKit").getAttribute("href"),
    yr: document.querySelector("#pYr").textContent,
    focused: !!document.querySelector('.row[data-i="' + EV.findIndex(e => e[4] === 4 && String(e[5]) === "2") + '"]'),
  }));
  log("(H2) #s4.2 — panneau ouvert sur la séquence + lien retour kit (chapitre 4, séq. 2)",
    r.open && /chapitre-4-espace\.html#s2$/.test(r.href) && r.focused, JSON.stringify(r));
}
await page.goto(ORIGIN + "/rapport/rapport_FR.html", { waitUntil: "load" });
{
  const r = await page.evaluate(() => ({
    banners: document.querySelectorAll('#core .banner a.frise[href*="perspective-G-fusion"]').length,
    hero: !!document.querySelector('.hero-cta a[href$="perspective-G-fusion.html"]'),
    chs: [...document.querySelectorAll('#core .banner a.frise')].map(a => (a.href.match(/ch=(\d+)/) || [])[1]).join(","),
  }));
  log("(H3) page principale — entrée du hero + 11 boutons « frise de ce chapitre » numérotés 1→11",
    r.banners === 11 && r.hero && r.chs === "1,2,3,4,5,6,7,8,9,10,11", JSON.stringify({ banners: r.banners, hero: r.hero }));
}
await page.goto(ORIGIN + "/chapitres/chapitre-2-espace.html", { waitUntil: "load" });
{
  const r = await page.evaluate(() => {
    const a = document.querySelector('a[href*="perspective-G-fusion"]');
    return { n: document.querySelectorAll('a[href*="perspective-G-fusion"]').length,
      ch: a && a.getAttribute("href").includes("?ch=2") };
  });
  log("(H4) pages chapitres — lien de rail vers la frise centrée sur le chapitre",
    r.n === 1 && r.ch === true, JSON.stringify(r));
}

log("(Z) zéro erreur console (tout le parcours)", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | ") || "none");

await browser.close();
console.log("\n===== RESULTATS =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(`${results.length - fails}/${results.length} checks pass`);
process.exit(fails ? 1 : 0);
