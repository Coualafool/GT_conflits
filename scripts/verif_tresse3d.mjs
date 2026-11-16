// verif_tresse3d.mjs — vérification de la variante H « tresse 3D » (CSS 3D, caméra à presets).
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_tresse3d.mjs
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
const BASE = process.env.POC_BASE || "http://localhost:8899/frise";
const PAGE = BASE + "/perspective-H-tresse3d.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
const shot = async (name) => { await page.waitForTimeout(420); await page.screenshot({ path: ART + name + ".png" }); };
const h3d = () => page.evaluate(() => window.__h3d());
const settle = () => page.waitForTimeout(950);

const DEG = 180 / Math.PI;

/* ---------- H0 : intégrité de la scène ---------- */
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(800);
{
  const exp = await page.evaluate(() => {
    let cards = 0, ghosts = 0, chords = 0;
    for (let i = 0; i < EV.length; i++) {
      const n = PERS_KEYS.filter(k => lvOf(i, k) > 0).length;
      cards += n; ghosts += 3 - n; chords += n * (n - 1) / 2;
    }
    return {
      cards, ghosts, chords,
      gotCards: document.querySelectorAll(".c3").length,
      gotGhosts: document.querySelectorAll(".g3").length,
      gotChords: document.querySelectorAll(".chord").length,
      lanes: PERS_KEYS.map(k => nTold(k)),
    };
  });
  log("(H0) scène complète : une carte par récit narrateur, un fantôme par silence, un accord par paire",
    exp.cards === exp.gotCards && exp.ghosts === exp.gotGhosts && exp.chords === exp.gotChords,
    `attendus cartes=${exp.cards} fantômes=${exp.ghosts} accords=${exp.chords} / obtenus ${exp.gotCards}/${exp.gotGhosts}/${exp.gotChords} · ${exp.lanes}`);
  const s0 = await h3d();
  log("(H0b) arrivée = ¾ neutre, aucune orbite libre (pitch 26°, yaw 40°)",
    Math.abs(s0.pitch * DEG - 26) < 0.6 && Math.abs(s0.yaw * DEG - 40) < 0.6 && s0.preset === "q3",
    `pitch=${(s0.pitch * DEG).toFixed(1)} yaw=${(s0.yaw * DEG).toFixed(1)} preset=${s0.preset}`);
  await shot("H-default");
}

/* ---------- H1 : la projection est cohérente (le proche est près du centre, le loin hors champ) ---------- */
{
  const proj = await page.evaluate(() => {
    const st = window.__h3d();
    const sceneR = document.querySelector("#scene").getBoundingClientRect();
    const cx = sceneR.left + sceneR.width / 2;
    const pick = (lo, hi) => {
      const i = EV.findIndex(e => e[0] >= lo && e[0] <= hi && lvOf(e.indexOf ? 0 : 0, "pal") >= 0 && PERS_KEYS.some(k => lvOf(EV.indexOf(e), k) > 0));
      return i;
    };
    const nearIdx = EV.findIndex(e => Math.abs(e[0] - st.cy) < 2 && PERS_KEYS.some(k => lvOf(EV.indexOf(e), k) > 0));
    const iNear = EV.indexOf(EV[nearIdx]) >= 0 ? nearIdx : -1;
    const bN = document.querySelector(`.c3[data-i="${iNear}"]`);
    const rN = bN ? bN.getBoundingClientRect() : null;
    const bFar = document.querySelector('.c3[data-i="1"]'); // 1897 — loin de l'ancre 2013
    const rF = bFar ? bFar.getBoundingClientRect() : null;
    return {
      cx, sceneW: sceneR.width,
      nearX: rN ? rN.left + rN.width / 2 : -1, nearVisible: !!(rN && rN.width > 10),
      farX: rF ? rF.left + rF.width / 2 : -1, farVisible: !!(rF && rF.width > 10),
    };
  });
  log("(H1) l'événement à l'ancre est projeté au centre de l'écran",
    proj.nearVisible && Math.abs(proj.nearX - proj.cx) < proj.sceneW * 0.16,
    `centre écran=${proj.cx.toFixed(0)} carte-ancre x=${proj.nearX.toFixed(0)}`);
  log("(H1b) un événement à 116 ans de l'ancre est hors champ (le travelée fonctionne)",
    proj.farVisible && Math.abs(proj.farX - proj.cx) > proj.sceneW * 0.5,
    `carte 1897 x=${proj.farX.toFixed(0)} (centre ${proj.cx.toFixed(0)})`);
}

/* ---------- H2 : molette = zoom le long du temps seul ---------- */
{
  const before = await h3d();
  for (let i = 0; i < 5; i++) { await page.mouse.move(720, 500); await page.mouse.wheel(0, -240); await page.waitForTimeout(70); }
  const zoomIn = await h3d();
  const p1 = zoomIn.pitch * DEG, y1 = zoomIn.yaw * DEG;
  for (let i = 0; i < 45; i++) await page.mouse.wheel(0, -240);
  const clamped = await h3d();
  for (let i = 0; i < 90; i++) await page.mouse.wheel(0, 240);
  const clampedOut = await h3d();
  log("(H2) molette = distance seule ; clampée aux deux bouts ; le cap ne bouge jamais",
    zoomIn.d < before.d && clamped.d === clamped.MIN_D && Math.abs(clampedOut.d - clampedOut.maxD) < 1.5 &&
    Math.abs(zoomIn.pitch - before.pitch) < 1e-9 && Math.abs(zoomIn.yaw - before.yaw) < 1e-9,
    `d ${before.d.toFixed(0)}→${zoomIn.d.toFixed(0)}, min=${clamped.d.toFixed(0)}==${clamped.MIN_D}, max=${clampedOut.d.toFixed(0)}≈${clampedOut.maxD.toFixed(0)}, cap figé=${p1.toFixed(1)}/${y1.toFixed(1)}`);
  await page.keyboard.press("1"); await settle();
}

/* ---------- H3 : clavier = travelée sur le temps ---------- */
{
  const a = await h3d();
  for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(60); }
  const b = await h3d();
  for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(60); }
  const c = await h3d();
  log("(H3) ←/→ parcourent le temps dans les deux sens",
    b.cy > a.cy + 4 && Math.abs(c.cy - a.cy) < 0.35,
    `${a.cy.toFixed(1)} → ${b.cy.toFixed(1)} → ${c.cy.toFixed(1)}`);
}

/* ---------- H4 : presets par clic et par touche, cap synchronisé ---------- */
{
  await page.keyboard.press("2"); await settle();
  const haut = await h3d();
  const pressed = await page.$eval('#cams button[data-v="haut"]', b => b.getAttribute("aria-pressed"));
  await page.click('#cams button[data-v="profil"]'); await settle();
  const prof = await h3d();
  await page.click('#cams button[data-v="cou-pal"]'); await settle();
  const cou = await h3d();
  await shot("H-couloir-pal");
  await page.keyboard.press("4"); await settle();
  const ens = await h3d();
  await page.keyboard.press("1"); await settle();
  const q3 = await h3d();
  await shot("H-ens");
  log("(H4) presets : depuis le haut ≈ piquée verticale, profil en contre-plongée yaw 160, couloir ancré sur le couloir pal, ensemble plus large que ¾",
    Math.abs(haut.pitch * DEG - 89.5) < 0.5 && pressed === "true" &&
    Math.abs(prof.yaw * DEG - 160) < 0.5 && prof.pitch * DEG > 0 &&
    cou.k === "pal" && Math.abs(cou.pitch * DEG - 6) < 0.2 &&
    ens.d > q3.d && q3.preset === "q3",
    `haut ${(haut.pitch * DEG).toFixed(1)}° · profil yaw ${(prof.yaw * DEG).toFixed(0)}° · couloir k=${cou.k} · d ens=${ens.d.toFixed(0)} > q3=${q3.d.toFixed(0)}`);
  await page.keyboard.press("3"); await settle(); await shot("H-profil");
  await page.keyboard.press("2"); await settle(); await shot("H-haut");
  await page.keyboard.press("1"); await settle();
}

/* ---------- H5 : « Maintenant » ---------- */
{
  const a = await h3d();
  await page.evaluate(() => window.__goNow());
  await settle();
  const b = await h3d();
  log("(H5) « Maintenant » ramène à la date du dernier événement",
    Math.abs(b.cy - 2026.3) < 0.4 && Math.abs(b.cy - a.cy) > 1,
    `${a.cy.toFixed(1)} → ${b.cy.toFixed(1)} (attendu 2026.3)`);
  await page.keyboard.press("4"); await settle();
}

/* ---------- H6 : toggle Silences (fantômes, off par défaut) ---------- */
{
  const tot = await page.evaluate(() => document.querySelectorAll(".g3").length);
  const offVisible = await page.evaluate(() =>
    [...document.querySelectorAll(".g3")].filter(g => getComputedStyle(g).display !== "none").length);
  await page.click("#ghostBtn");
  await page.waitForTimeout(150);
  const on = await page.evaluate(() => ({
    cls: document.body.classList.contains("ghosts"),
    pressed: document.querySelector("#ghostBtn").getAttribute("aria-pressed"),
    visible: [...document.querySelectorAll(".g3")].filter(g => getComputedStyle(g).display !== "none").length,
    cards: document.querySelectorAll(".c3").length,
  }));
  await page.click("#ghostBtn"); await page.waitForTimeout(120);
  log("(H6) Silences : off par défaut, on affiche tous les fantômes sans toucher aux cartes",
    offVisible === 0 && on.cls && on.pressed === "true" && on.visible === tot,
    `off visible=${offVisible} · on visible=${on.visible}/${tot} cartes=${on.cards}`);
}

/* ---------- H7 : panneau — fait neutre d'abord, toutes les versions, back-link kit ---------- */
{
  const t = await page.evaluate(() => {
    const idx = EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0));
    document.querySelector(`.c3[data-i="${idx}"]`).click();
    return {
      idx, ev: EV[idx],
      open: document.querySelector("#panel").classList.contains("open"),
      nt: document.querySelector("#pNt").textContent,
      desc: (document.querySelector("#pDesc").textContent || "").length,
      rows: document.querySelectorAll("#pRows .vrow").length,
      titles: [...document.querySelectorAll("#pRows .vt")].map(v => v.textContent),
      href: document.querySelector("#pFoot a") ? document.querySelector("#pFoot a").getAttribute("href") : "",
    };
  });
  const expHref = `../chapitres/chapitre-${t.ev[4]}-espace.html#s${t.ev[5]}`;
  log("(H7) clic carte → panneau : fait neutre (titre+description du kit) puis les 3 versions ; back-link kit exact",
    t.open && t.nt === t.ev[2] && t.desc > 40 && t.rows === 3 && t.href === expHref &&
    new Set(t.titles).size > 1,
    `idx=${t.idx} « ${t.nt.slice(0, 34)}… » lignes=${t.rows} href=${t.href}`);
  await shot("H-panel");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const closed = await page.$eval("#panel", p => !p.classList.contains("open"));
  log("(H7b) Échap ferme le panneau", closed, "");
}

/* ---------- H8 : survol d'une carte allume ses accords ---------- */
{
  const hl = await page.evaluate(() => {
    const idx = EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0));
    const c = document.querySelector(`.c3[data-i="${idx}"]`);
    c.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    const total = document.querySelectorAll(`.chord[data-i="${idx}"]`).length;
    const lit = document.querySelectorAll(`.chord[data-i="${idx}"].hl`).length;
    c.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    const off = document.querySelectorAll(`.chord[data-i="${idx}"].hl`).length;
    return { total, lit, off };
  });
  log("(H8) survol : les 3 accords du fait s'allument puis s'éteignent",
    hl.total === 3 && hl.lit === 3 && hl.off === 0, JSON.stringify(hl));
}

/* ---------- H9 : liens profonds ?ev= · ?ch= · #sN.S ---------- */
{
  const idx = await page.evaluate(() => EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0)));
  await page.goto(`${PAGE}?ev=${idx}`, { waitUntil: "load" }); await page.waitForTimeout(800);
  const ev9 = await page.evaluate(() => ({ open: document.querySelector("#panel").classList.contains("open"), cy: window.__h3d().cy }));
  const yearOK = await page.evaluate((i) => Math.abs(window.__h3d().cy - EV[i][0]) < 1, idx);
  log("(H9) ?ev=i — panneau ouvert, caméra sur le fait", ev9.open && yearOK, `cy=${ev9.cy.toFixed(1)} ouvert=${ev9.open}`);
  const ch = await page.evaluate(() => EV[1][4]);
  await page.goto(`${PAGE}?ch=${ch}`, { waitUntil: "load" }); await page.waitForTimeout(600);
  const ok9b = await page.evaluate((n) => {
    const cy = window.__h3d().cy, ds = EV.filter(e => e[4] === n).map(e => e[0]);
    return cy >= Math.min(...ds) - 4 && cy <= Math.max(...ds) + 4;
  }, ch);
  log(`(H9b) ?ch=${ch} — caméra dans l'emprise du chapitre`, ok9b, "");
  const seq = await page.evaluate(() => {
    const e = EV[6]; return { i: 6, h: `#s${e[4]}.${e[5]}` };
  });
  await page.goto(PAGE + seq.h, { waitUntil: "load" }); await page.waitForTimeout(800);
  const ok9c = await page.evaluate(() => document.querySelector("#panel").classList.contains("open"));
  log(`(H9c) ${seq.h} (back-link kit) — ouvre le bon fait`, ok9c, "");
}

/* ---------- H10 : le plancher d'opacité — aucune carte n'est jamais « droppée » ---------- */
{
  await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(700);
  for (let i = 0; i < 3; i++) { await page.mouse.move(720, 500); await page.mouse.wheel(0, 240); await page.waitForTimeout(60); }
  const floorOK = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".bpos[data-pos]")];
    const bad = els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.369);
    return { n: els.length, bad: bad.length };
  });
  log("(H10) zoom arrière maximal : toute la tresse reste dessinée (opacité ≥ 0,37 partout)",
    floorOK.bad === 0 && floorOK.n > 400, `${floorOK.n} éléments, ${floorOK.bad} sous le plancher`);
}

/* ---------- H11 : le budget rendu — 60 recadrages caméra complets en < 2,5 s (Chromebook scolaire) ---------- */
{
  const ms = await page.evaluate(() => {
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) window.__frame();
    return performance.now() - t0;
  });
  log("(H11) 60 recadrages caméra (matrice + fondu des 500 éléments) < 2 500 ms", ms < 2500, `${ms.toFixed(0)} ms`);
}

/* ---------- H12 : prefers-reduced-motion = coupe franche ---------- */
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const p2 = await ctx.newPage();
  await p2.goto(PAGE, { waitUntil: "load" }); await p2.waitForTimeout(700);
  await p2.click('#cams button[data-v="haut"]');
  await p2.waitForTimeout(120);
  const r = await p2.evaluate(() => window.__h3d());
  log("(H12) prefers-reduced-motion : le preset s'applique sans glide",
    Math.abs(r.pitch * 180 / Math.PI - 89.5) < 0.05, `pitch=${(r.pitch * 180 / Math.PI).toFixed(2)}° après 120 ms`);
  await ctx.close();
}

/* ---------- H13 : mobile 390 — pas de scroll horizontal, scène pleine ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const p3 = await ctx.newPage();
  const errs = [];
  p3.on("pageerror", e => errs.push(String(e)));
  await p3.goto(PAGE, { waitUntil: "load" }); await p3.waitForTimeout(800);
  const m = await p3.evaluate(() => ({
    noX: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    sceneW: document.querySelector("#scene").getBoundingClientRect().width,
    cards: document.querySelectorAll(".c3").length,
    narrow: window.__h3d().d < 2200,
  }));
  log("(H13) mobile 390 : zéro scroll horizontal, scène pleine largeur, zoom serré par défaut, zéro erreur",
    m.noX && m.sceneW === 390 && m.cards > 150 && m.narrow && errs.length === 0,
    `scrollX=${m.noX} scène=${m.sceneW} cartes=${m.cards} d=${m.narrow ? "serré" : "large"} err=${errs.length}`);
  await p3.screenshot({ path: ART + "H-mobile.png" });
  await ctx.close();
}

/* ---------- H14 : enregistré dans le comparatif ; module partagé intact ---------- */
{
  const idxOK = await page.evaluate(async () => {
    const r = await fetch(BASE + "/index-comparatif.html");
    return (await r.text()).includes("perspective-H-tresse3d.html");
  });
  log("(H14) H est présenté dans index-comparatif", idxOK, "");
  log("(H15) aucune erreur JavaScript sur toute la batterie", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
}

await browser.close();
console.log("\n===== RESULTATS verif_tresse3d =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(fails === 0 ? "TOUS LES CHECKS PASSENT" : fails + " CHECK(S) EN ECHEC");
process.exit(fails === 0 ? 0 : 1);
