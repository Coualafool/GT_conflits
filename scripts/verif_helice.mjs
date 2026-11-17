// verif_helice.mjs — vérification de la variante I « l'Hélice des récits » (triple hélice CSS 3D).
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_helice.mjs
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
const PAGE = BASE + "/perspective-I-helice.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
const shot = async (name) => {
  await page.evaluate(() => { const h = document.querySelector("#help"); if (h) h.style.display = "none"; });
  await page.waitForTimeout(420); await page.screenshot({ path: ART + name + ".png", timeout: 90000 });
};
const i3d = () => page.evaluate(() => window.__i3d());
const settle = async () => { await page.waitForFunction(() => !window.__gliding(), null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(120); };

const DEG = 180 / Math.PI;

/* ---------- I0 : intégrité de la molécule ---------- */
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(800);
{
  const exp = await page.evaluate(() => {
    let cells = 0, ghosts = 0, rungs = 0;
    for (let i = 0; i < EV.length; i++) {
      const n = PERS_KEYS.filter(k => lvOf(i, k) > 0).length;
      cells += n; ghosts += 3 - n; rungs += n * (n - 1) / 2;
    }
    return {
      cells, ghosts, rungs,
      gotCells: document.querySelectorAll(".c3").length,
      gotGhosts: document.querySelectorAll(".g3").length,
      gotRungs: document.querySelectorAll(".rung").length,
      tubes: document.querySelectorAll(".tube").length,
      lanes: PERS_KEYS.map(k => nTold(k)),
    };
  });
  log("(I0) molécule complète : une cellule par récit narrateur, un fantôme par silence, une marche par paire",
    exp.cells === exp.gotCells && exp.ghosts === exp.gotGhosts && exp.rungs === exp.gotRungs && exp.tubes >= 250,
    `attendus cellules=${exp.cells} fantômes=${exp.ghosts} marches=${exp.rungs} / obtenus ${exp.gotCells}/${exp.gotGhosts}/${exp.gotRungs} · tubes=${exp.tubes} · ${exp.lanes}`);
  const s0 = await i3d();
  log("(I0b) arrivée = ¾ neutre (pitch 26°, yaw 40°)",
    Math.abs(s0.pitch * DEG - 26) < 0.6 && Math.abs(s0.yaw * DEG - 40) < 0.6 && s0.preset === "q3",
    `pitch=${(s0.pitch * DEG).toFixed(1)} yaw=${(s0.yaw * DEG).toFixed(1)} preset=${s0.preset}`);
  await shot("I-default");
}

/* ---------- I0c : géométrie hélicoïdale — trois brins à équidistance (120°), rayon constant ---------- */
{
  const g = await page.evaluate(() => {
    const P = k => window.__helix(k, 1969);
    const th = k => Math.atan2(P(k).y, P(k).z);
    const d12 = ((th("isr") - th("occ")) * 180 / Math.PI + 720) % 360;
    const d23 = ((th("pal") - th("isr")) * 180 / Math.PI + 720) % 360;
    const rad = k => Math.hypot(P(k).y, P(k).z);
    return { d12, d23, rO: rad("occ"), rI: rad("isr"), rP: rad("pal") };
  });
  log("(I0c) les trois brins sont à équidistance angulaire (120°) sur le même cylindre — aucun brin au centre",
    Math.abs(g.d12 - 120) < 1 && Math.abs(g.d23 - 120) < 1 &&
    Math.abs(g.rO - 230) < 1 && Math.abs(g.rI - 230) < 1 && Math.abs(g.rP - 230) < 1,
    `angles ${g.d12.toFixed(1)}°/${g.d23.toFixed(1)}° · rayons ${g.rO.toFixed(0)}/${g.rI.toFixed(0)}/${g.rP.toFixed(0)}`);
}

/* ---------- I1 : la projection est cohérente (le proche est près du centre, le loin hors champ) ---------- */
{
  const proj = await page.evaluate(() => {
    const st = window.__i3d();
    const sceneR = document.querySelector("#scene").getBoundingClientRect();
    const cx = sceneR.left + sceneR.width / 2;
    let bi = -1, bd = 9e9;
    EV.forEach((e, i) => { const d = Math.abs(e[0] - st.cy); if (d < bd && PERS_KEYS.some(k => lvOf(i, k) > 0)) { bd = d; bi = i; } });
    const bN = document.querySelector(`.c3[data-i="${bi}"]`);
    const rN = bN ? bN.getBoundingClientRect() : null;
    const bF = document.querySelector('.c3[data-i="1"]'); // 1897 — loin de l'ancre
    const rF = bF ? bF.getBoundingClientRect() : null;
    return {
      cx, sceneW: sceneR.width,
      nearX: rN ? rN.left + rN.width / 2 : -1, nearW: rN ? rN.width : 0,
      farX: rF ? rF.left + rF.width / 2 : -1, farW: rF ? rF.width : 0,
    };
  });
  log("(I1) la cellule la plus proche de l'ancre est projetée au centre, à taille cohérente",
    proj.nearW > 40 && proj.nearW < 500 && Math.abs(proj.nearX - proj.cx) < proj.sceneW * 0.18,
    `centre=${proj.cx.toFixed(0)} cellule-ancre x=${proj.nearX.toFixed(0)} w=${proj.nearW.toFixed(0)}`);
  log("(I1b) un fait à ~116 ans de l'ancre est hors champ et minuscule (perspective réelle)",
    Math.abs(proj.farX - proj.cx) > proj.sceneW * 0.5 || proj.farW < 8,
    `cellule 1897 x=${proj.farX.toFixed(0)} w=${proj.farW.toFixed(0)}`);
}

/* ---------- I2 : molette = distance seule ---------- */
{
  const before = await i3d();
  for (let i = 0; i < 5; i++) { await page.mouse.move(720, 500); await page.mouse.wheel(0, -240); await page.waitForTimeout(70); }
  const zoomIn = await i3d();
  const p1 = zoomIn.pitch * DEG, y1 = zoomIn.yaw * DEG;
  for (let i = 0; i < 45; i++) await page.mouse.wheel(0, -240);
  const clamped = await i3d();
  for (let i = 0; i < 90; i++) await page.mouse.wheel(0, 240);
  const clampedOut = await i3d();
  log("(I2) molette = distance seule ; clampée aux deux bouts ; le cap ne bouge jamais",
    zoomIn.d < before.d && clamped.d === clamped.MIN_D && Math.abs(clampedOut.d - clampedOut.maxD) < 1.5 &&
    Math.abs(zoomIn.pitch - before.pitch) < 1e-9 && Math.abs(zoomIn.yaw - before.yaw) < 1e-9,
    `d ${before.d.toFixed(0)}→${zoomIn.d.toFixed(0)}, min=${clamped.d.toFixed(0)}==${clamped.MIN_D}, max=${clampedOut.d.toFixed(0)}≈${clampedOut.maxD.toFixed(0)}, cap figé=${p1.toFixed(1)}/${y1.toFixed(1)}`);
  await page.keyboard.press("1"); await settle();
}

/* ---------- I2b : glisser gauche = regard libre (orbite autour de l'ancrage-temps) ---------- */
{
  const a = await i3d();
  await page.mouse.move(720, 430); await page.mouse.down();
  await page.mouse.move(1000, 500, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(200);
  const b = await i3d();
  await page.mouse.move(720, 430); await page.mouse.down();
  await page.mouse.move(720, -2600, { steps: 16 }); await page.mouse.up();
  await page.waitForTimeout(200);
  const c = await i3d();
  const dYaw = ((b.yaw - a.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  log("(I2b) glisser = regard libre : yaw suit le doigt, l'ancre-temps reste fixe, preset lâché",
    Math.abs(dYaw) > 0.35 && Math.abs(b.ax - a.ax) < 1 && b.preset === null,
    `yaw ${(dYaw * DEG).toFixed(1)}° tiré · ax invariable (${(b.ax - a.ax).toFixed(2)}px) · preset=null`);
  log("(I2b2) tirage extrême : pitch pincé à 2°, la vue ne se retourne jamais",
    Math.abs(c.pitch * DEG - 2) < 0.3 && Math.abs(c.ax - a.ax) < 1,
    `pitch=${(c.pitch * DEG).toFixed(2)}° pincé`);
  await page.keyboard.press("1"); await settle();
  const r = await i3d();
  log("(I2b3) la touche 1 recadre la caméra après l'orbite",
    Math.abs(r.pitch * DEG - 26) < 0.6 && Math.abs(r.yaw * DEG - 40) < 0.6,
    `pitch=${(r.pitch * DEG).toFixed(1)} yaw=${(r.yaw * DEG).toFixed(1)}`);
}

/* ---------- I3 : clavier = travelée sur le temps ---------- */
{
  for (let i = 0; i < 3; i++) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(80); }
  const a = await i3d();
  for (let i = 0; i < 2; i++) { await page.keyboard.press("ArrowRight"); await page.waitForTimeout(80); }
  const b = await i3d();
  for (let i = 0; i < 2; i++) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(80); }
  const c = await i3d();
  log("(I3) ←/→ parcourent le temps dans les deux sens, sans atteinte de clamp",
    b.cy > a.cy + 2 && c.cy < b.cy - 2 && Math.abs(c.cy - a.cy) < 0.5,
    `${a.cy.toFixed(1)} → ${b.cy.toFixed(1)} → ${c.cy.toFixed(1)}`);
}

/* ---------- I4 : presets — haut = sinus 2D, face = le long de l'axe, brin = dans le sillage du brin ---------- */
{
  await page.keyboard.press("2"); await settle();
  const haut = await i3d();
  const pressed = await page.$eval('#cams button[data-v="haut"]', b => b.getAttribute("aria-pressed"));
  await page.click('#cams button[data-v="face"]'); await settle();
  const face = await i3d();
  const faceOK = Math.abs(face.pitch * DEG) < 0.9 && Math.abs(face.yaw * DEG - 90) < 0.9 &&
    Math.abs(face.ayv) < 6 && Math.abs(face.azv) < 6;
  await shot("I-face");
  await page.keyboard.press("5"); await settle();
  const cou = await i3d();
  const onBrin = await page.evaluate(() => {
    const s = window.__i3d();
    const P = window.__helix("pal", s.cy);
    return Math.hypot(s.ayv - P.y, s.azv - P.z);
  });
  const couOK = cou.k === "pal" && onBrin < 60 && Math.abs(cou.pitch * DEG) < 40;
  await shot("I-couloir-pal");
  await page.keyboard.press("4"); await settle();
  const ens = await i3d();
  await shot("I-ens");
  await page.keyboard.press("1"); await settle();
  const q3 = await i3d();
  log("(I4) presets : haut ≈ piquée verticale, face = le long de l'axe sur l'axe, brin ancré SUR le brin, ensemble plus large que ¾",
    Math.abs(haut.pitch * DEG - 89.5) < 0.9 && pressed === "true" && faceOK && couOK &&
    ens.d > q3.d && q3.preset === "q3",
    `haut ${(haut.pitch * DEG).toFixed(1)}° · pressed=${pressed} · face pitch ${(face.pitch * DEG).toFixed(1)} yaw ${(face.yaw * DEG).toFixed(1)} ayv=${face.ayv.toFixed(1)} azv=${face.azv.toFixed(1)} · brin k=${cou.k} à ${onBrin.toFixed(0)}px pit=${(cou.pitch * DEG).toFixed(1)} · d ens=${ens.d.toFixed(0)} > q3=${q3.d.toFixed(0)} preset=${q3.preset}`);
  await page.keyboard.press("2"); await settle(); await shot("I-haut");
  await page.keyboard.press("1"); await settle();
}

/* ---------- I5 : « Maintenant » ---------- */
{
  const a = await i3d();
  await page.evaluate(() => window.__goNow());
  await settle();
  const b = await i3d();
  log("(I5) « Maintenant » ramène à la date du dernier événement",
    Math.abs(b.cy - 2026.3) < 0.4 && Math.abs(b.cy - a.cy) > 1,
    `${a.cy.toFixed(1)} → ${b.cy.toFixed(1)} (attendu 2026.3)`);
  await page.keyboard.press("4"); await settle();
}

/* ---------- I6 : toggle Silences (fantômes, off par défaut) ---------- */
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
    cells: document.querySelectorAll(".c3").length,
  }));
  await page.click("#ghostBtn"); await page.waitForTimeout(120);
  log("(I6) Silences : off par défaut, on affiche tous les fantômes sans toucher aux cellules",
    offVisible === 0 && on.cls && on.pressed === "true" && on.visible === tot,
    `off visible=${offVisible} · on visible=${on.visible}/${tot} cellules=${on.cells}`);
}

/* ---------- I7 : panneau — fait neutre d'abord, toutes les versions, back-link kit ---------- */
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
      gold: document.querySelectorAll(`.rung[data-i="${idx}"].div`).length,
      href: document.querySelector("#pFoot a") ? document.querySelector("#pFoot a").getAttribute("href") : "",
    };
  });
  const expHref = `../chapitres/chapitre-${t.ev[4]}-espace.html#s${t.ev[5]}`;
  log("(I7) clic cellule → panneau : fait neutre (titre+description du kit) puis les 3 versions ; back-link kit exact",
    t.open && t.nt === t.ev[2] && t.desc > 40 && t.rows === 3 && t.href === expHref &&
    new Set(t.titles).size > 1,
    `idx=${t.idx} « ${t.nt.slice(0, 34)}… » lignes=${t.rows} href=${t.href}`);
  log("(I7b) fait divergent raconté par les trois récits : ses 3 marches sont dorées", t.gold === 3, `dorées=${t.gold}/3`);
  await shot("I-panel");
  await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  const closed = await page.$eval("#panel", p => !p.classList.contains("open"));
  log("(I7c) Échap ferme le panneau", closed, "");
}

/* ---------- I8 : survol d'une cellule allume ses marches ---------- */
{
  const hl = await page.evaluate(() => {
    const idx = EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0));
    const c = document.querySelector(`.c3[data-i="${idx}"]`);
    c.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    const total = document.querySelectorAll(`.rung[data-i="${idx}"]`).length;
    const lit = document.querySelectorAll(`.rung[data-i="${idx}"].hl`).length;
    c.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    const off = document.querySelectorAll(`.rung[data-i="${idx}"].hl`).length;
    return { total, lit, off };
  });
  log("(I8) survol : les 3 marches du fait s'allument puis s'éteignent",
    hl.total === 3 && hl.lit === 3 && hl.off === 0, JSON.stringify(hl));
}

/* ---------- I9 : liens profonds ?ev= · ?ch= · #sN.S ---------- */
{
  const idx = await page.evaluate(() => EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0)));
  await page.goto(`${PAGE}?ev=${idx}`, { waitUntil: "load" }); await page.waitForTimeout(800);
  const ev9 = await page.evaluate(() => ({ open: document.querySelector("#panel").classList.contains("open"), cy: window.__i3d().cy }));
  const yearOK = await page.evaluate((i) => Math.abs(window.__i3d().cy - EV[i][0]) < 1, idx);
  log("(I9) ?ev=i — panneau ouvert, caméra sur le fait", ev9.open && yearOK, `cy=${ev9.cy.toFixed(1)} ouvert=${ev9.open}`);
  const ch = await page.evaluate(() => EV[1][4]);
  await page.goto(`${PAGE}?ch=${ch}`, { waitUntil: "load" }); await page.waitForTimeout(600);
  const ok9b = await page.evaluate((n) => {
    const cy = window.__i3d().cy, ds = EV.filter(e => e[4] === n).map(e => e[0]);
    return cy >= Math.min(...ds) - 4 && cy <= Math.max(...ds) + 4;
  }, ch);
  log(`(I9b) ?ch=${ch} — caméra dans l'emprise du chapitre`, ok9b, "");
  const seq = await page.evaluate(() => {
    const e = EV[6]; return { i: 6, h: `#s${e[4]}.${e[5]}` };
  });
  await page.goto(PAGE + seq.h, { waitUntil: "load" }); await page.waitForTimeout(800);
  const ok9c = await page.evaluate(() => document.querySelector("#panel").classList.contains("open"));
  log(`(I9c) ${seq.h} (back-link kit) — ouvre le bon fait`, ok9c, "");
}

/* ---------- I10 : le plancher d'opacité — aucune cellule n'est jamais « droppée » ---------- */
{
  await page.goto(PAGE, { waitUntil: "load" }); await page.waitForTimeout(700);
  for (let i = 0; i < 3; i++) { await page.mouse.move(720, 500); await page.mouse.wheel(0, 240); await page.waitForTimeout(60); }
  const floorOK = await page.evaluate(() => {
    const els = [...document.querySelectorAll(".bpos[data-pos]")];
    const bad = els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.369);
    return { n: els.length, bad: bad.length };
  });
  log("(I10) zoom arrière maximal : toute l'hélice reste dessinée (opacité ≥ 0,37 partout)",
    floorOK.bad === 0 && floorOK.n > 250, `${floorOK.n} éléments, ${floorOK.bad} sous le plancher`);
}

/* ---------- I11 : le budget rendu — 60 recadrages caméra complets en < 2,5 s (Chromebook scolaire) ---------- */
{
  const ms = await page.evaluate(() => {
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) window.__frame();
    return performance.now() - t0;
  });
  log("(I11) 60 recadrages caméra (matrice + fondu des billboards) < 2 500 ms", ms < 2500, `${ms.toFixed(0)} ms`);
}

/* ---------- I12 : prefers-reduced-motion = coupe franche ---------- */
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const p2 = await ctx.newPage();
  await p2.goto(PAGE, { waitUntil: "load" }); await p2.waitForTimeout(700);
  await p2.click('#cams button[data-v="haut"]');
  await p2.waitForTimeout(120);
  const r = await p2.evaluate(() => window.__i3d());
  log("(I12) prefers-reduced-motion : le preset s'applique sans glide",
    Math.abs(r.pitch * 180 / Math.PI - 89.5) < 0.05, `pitch=${(r.pitch * 180 / Math.PI).toFixed(2)}° après 120 ms`);
  await ctx.close();
}

/* ---------- I13 : mobile 390 — pas de scroll horizontal, scène pleine ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const p3 = await ctx.newPage();
  const errs = [];
  p3.on("pageerror", e => errs.push(String(e)));
  await p3.goto(PAGE, { waitUntil: "load" }); await p3.waitForTimeout(800);
  const m = await p3.evaluate(() => ({
    noX: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    sceneW: document.querySelector("#scene").getBoundingClientRect().width,
    cells: document.querySelectorAll(".c3").length,
    close: window.__i3d().d < 3000,
  }));
  log("(I13) mobile 390 : zéro scroll horizontal, scène pleine largeur, cadrage serré par défaut, zéro erreur",
    m.noX && m.sceneW === 390 && m.cells > 150 && m.close && errs.length === 0,
    `scrollX=${m.noX} scène=${m.sceneW} cellules=${m.cells} près=${m.close} err=${errs.length}`);
  await p3.screenshot({ path: ART + "I-mobile.png" });
  await ctx.close();
}

/* ---------- I14 : enregistré dans le comparatif ---------- */
{
  const idxOK = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return (await r.text()).includes("perspective-I-helice.html");
  }, BASE + "/index-comparatif.html");
  log("(I14) I est présenté dans index-comparatif", idxOK, "");
  log("(I15) aucune erreur JavaScript sur toute la batterie", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
}

await browser.close();
console.log("\n===== RESULTATS verif_helice =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(fails === 0 ? "TOUS LES CHECKS PASSENT" : fails + " CHECK(S) EN ECHEC");
process.exit(fails === 0 ? 0 : 1);
