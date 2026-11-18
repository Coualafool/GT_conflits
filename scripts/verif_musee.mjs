// verif_musee.mjs — vérification de la variante J « Le Musée des récits » (salles 3D marchables).
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_musee.mjs
// Self-contained: playwright must live in this repo's node_modules (scripts/tars_setup_runtime.ps1).
// S'appuie sur window.__musee (API de harnais de la page) et sur les globaux poc-data/poc-perspectives.
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
const PAGE = BASE + "/perspective-J-musee.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
const shot = async (name) => {
  await page.evaluate(() => document.getElementById("welcome").classList.add("gone"));
  await page.waitForTimeout(650); await page.screenshot({ path: ART + name + ".png", timeout: 90000 });
};
await page.addInitScript(() => {   // les corpus sont en const (portée lexicale) : les exposer sur window pour page.evaluate
  Object.defineProperty(window, "__corpusOnWindow", { value: true });
});
const settle = async () => { await page.waitForFunction(() => !window.__musee.state().gliding, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(150); };
const kindOfKey = k => k ? ({ p: "poster", c: "curtain", v: "case" })[k[0]] : null;

/* ---------- J0 : seuil Three.js — la scène vit sur le bundle vendorisé ---------- */
await page.goto(PAGE, { waitUntil: "load" });
await page.waitForTimeout(1300);
{
  const s = await page.evaluate(() => ({
    has: !!window.__musee && typeof window.__musee.focus === "function",
    rev: window.THREE ? window.THREE.REVISION : null,
    room: window.__musee.state().room,
    canvas: (() => { const c = document.querySelector("#stage canvas"); if (!c) return [0, 0];
      const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    fallback: getComputedStyle(document.getElementById("fallback")).display,
  }));
  log("(J0) seuil Three.js : scène vivante sur le bundle vendorisé (REVISION 187, zéro CDN)",
    s.has && s.rev === "187" && s.fallback === "none" && s.canvas[0] >= 1400 && s.canvas[1] >= 700,
    `api=${s.has} rev=${s.rev} toile=${s.canvas.join("×")} fallback=${s.fallback}`);
  log("(J0b) arrivée dans la salle 0, regard porté vers la suite", s.room === 0, `room=${s.room}`);
  await shot("M-default");
}

/* ---------- J1 : intégrité 279 — tout dérivé de LV/REN/EV, rien de codé en dur ---------- */
{
  const g = await page.evaluate(() => {
    const c = window.__musee.counts();
    // recompter le corpus indépendamment de la page : c'est LE test « une seule source »
    const told = {}, occ = {}, divByRoom = {};
    PERS_KEYS.forEach(k => { told[k] = 0; occ[k] = 0; });
    for (let i = 0; i < EV.length; i++) {
      let room = 0;
      for (let k = 0; k < ERAS.length; k++) if (EV[i][0] >= ERAS[k].a && EV[i][0] < ERAS[k].b) room = k;
      PERS_KEYS.forEach(k => { if (lvOf(i, k) > 0) told[k]++; else occ[k]++; });
      if (divergent(i)) divByRoom[room] = (divByRoom[room] || 0) + 1;
    }
    const ps = window.__musee.posters();
    const laneRoomsOK = c.rooms.every(r => PERS_KEYS.every(k => r.per[k].told === ps.filter(p => p.room === r.room && p.lane === k).length));
    const satOK = c.rooms.every(r => PERS_KEYS.every(k => r.per[k].told + r.per[k].silent ===
      EV.filter(e => e[0] >= ERAS[r.room].a && e[0] < ERAS[r.room].b).length));
    const vitOK = c.rooms.every(r => r.cases === (divByRoom[r.room] || 0));
    return { c, told, occ, divByRoom, laneRoomsOK, satOK, vitOK };
  });
  const { c, told, occ, laneRoomsOK, satOK, vitOK } = g;
  const totOcc = Object.values(occ).reduce((s, v) => s + v, 0);
  const totTold = Object.values(told).reduce((s, v) => s + v, 0);
  log("(J1) une seule source : 3 × 93 = 279 cases recomptées dans le corpus — sans exception",
    c.corpus === 93 && totTold === 279 - totOcc && c.toldSum === totTold &&
    c.told.every(t => t.n === told[t.k] && t.posters === t.n),
    `corpus=${c.corpus} racontées=${c.toldSum} (${c.told.map(t => t.posters).join("/")}) affiches posées identiques`);
  log("(J1b) silence = 279 − racontées : chaque non-récit a SON rideau, compte juste",
    c.curtainSum + c.toldSum === 279, `${c.toldSum} racontées + ${c.curtainSum} rideaux = ${c.toldSum + c.curtainSum}`);
  log("(J1c) saturation pièce par pièce : dans chaque salle, tout événement narré a son affiche, tout non-récit son rideau",
    laneRoomsOK && satOK, `répartition vérifiée sur ${c.rooms.length} salles (affiches↔posters et told+silent↔événements)`);
  log("(J1d) vitrines = divergents, par salle, sans exception",
    vitOK && c.rooms.reduce((s, r) => s + r.cases, 0) === c.ndiv,
    `divergents=${c.ndiv} vitrines=${c.rooms.reduce((s, r) => s + r.cases, 0)}`);
}

/* ---------- J2 : grammaire des murs + poids du récit ---------- */
{
  const g = await page.evaluate(() => {
    const geo = window.__musee.geo, ps = window.__musee.posters(), cs = window.__musee.curtains();
    const rooms = window.__musee.rooms();
    const XP = geo.HALF - 0.12;
    let wall = true, range = true, size = true, side = true;
    ps.forEach(p => {
      const r = rooms[p.room];
      if (p.lane === "pal" && Math.abs(p.x + XP) > 0.02) wall = false;
      if (p.lane === "isr" && Math.abs(p.x - XP) > 0.02) wall = false;
      if (p.lane === "occ" && Math.abs(p.z - (r.z1 + 0.09)) > 0.02) wall = false;
      if (p.year < r.a || p.year > r.b) range = false;
    });
    cs.forEach(x => { if (x.lane === "pal" && x.x >= 0) side = false; if (x.lane === "isr" && x.x <= 0) side = false;
      if (x.lane === "occ" && Math.abs(x.z - (rooms[x.room].z1 + 0.07)) > 0.02) side = false; });
    for (const k of PERS_KEYS) for (let room = 0; room < rooms.length; room++) {
      const w1 = ps.filter(p => p.lane === k && p.room === room && p.lv === 1).map(p => p.w);
      const w2 = ps.filter(p => p.lane === k && p.room === room && p.lv === 2).map(p => p.w);
      if (w1.length && w2.length && Math.min(...w2) <= Math.max(...w1)) size = false;
    }
    const minScale = Math.min(...ps.map(p => p.scale));
    return { wall, range, size, side, nP: ps.length, nC: cs.length, minScale };
  });
  log("(J2) grammaire fixée une fois pour toutes : palestinien à gauche (−x), israélien à droite (+x), faits à trois voix au fond — rideaux sur leurs parois à eux",
    g.wall && g.side, `affiches=${g.nP} rideaux=${g.nC}, parois et côtés tous conformes`);
  log("(J2b) aucune affiche hors de la portée temporelle de sa salle", g.range, "");
  log("(J2c) le poids du récit se LIT : jamais une affiche de second plan plus large qu'une affiche centrale, dans la même salle et le même couloir",
    g.size, `échelle plancher ${g.minScale.toFixed(2)}`);
}

/* ---------- J3 : vitrines centrales, colonnes, gardes ---------- */
{
  const g = await page.evaluate(() => {
    const cs = window.__musee.cases(), rooms = window.__musee.rooms();
    let column = true, guard = true, spread = true, order = true, nRooms = 0;
    for (let k = 0; k < rooms.length; k++) {
      const K = cs.filter(c => c.room === k);
      if (K.length) nRooms++;
      const r = rooms[k];
      K.forEach(c => {
        if (Math.abs(Math.abs(c.x) - 0.95) > 0.03) column = false;
        if (c.z < r.z1 + 1.8 - 0.01 || c.z > r.z0 - 1.8 + 0.01) guard = false;
      });
      for (const col of [-1, 1]) {
        const C = K.filter(c => Math.sign(c.x) === col).sort((a, b) => b.z - a.z);
        for (let q = 1; q < C.length; q++) {
          if (C[q - 1].z - C[q].z < 0.7) spread = false;
          if (C[q].year < C[q - 1].year) order = false;
        }
      }
    }
    return { column, guard, spread, order, n: cs.length, nRooms };
  });
  log("(J3) vitrines du désaccord sur l'axe central (deux colonnes de part et d'autre de l'allée), hors des murs, espacées, dans l'ordre des années",
    g.column && g.guard && g.spread && g.order,
    `vitrines=${g.n} sur ${g.nRooms} salles — colonnes ±0,95, garde 1,8 m, pas ≥0,7 m, ordre-année=${g.order}`);
}

/* ---------- J4 : caméra — téléport, focus, panneau, badge, viseur ---------- */
const BACK = /^..\/chapitres\/chapitre-\d+-espace\.html#s\d+$/;
{
  await page.evaluate(() => window.__musee.teleportRoom(3));
  await settle();
  const t = await page.evaluate(() => window.__musee.state());
  log("(J4) téléport par le plan : salle 3, sur l'allée centrale, regard vers l'avant",
    t.room === 3 && Math.abs(t.x) < 0.12 && Math.abs(t.yaw) < 0.02,
    `room=${t.room} x=${t.x.toFixed(2)} yaw=${(t.yaw * 180 / Math.PI).toFixed(1)}°`);

  const pick = await page.evaluate(() => {
    const ps = window.__musee.posters();
    const pal1 = window.__musee.stations().find(s => s.kind === "poster" && s.lane === "pal" &&
      ps.find(p => p.key === s.key && p.row === 1));
    const vit = window.__musee.stations().find(s => s.kind === "case");
    const palCurtain = window.__musee.stations().find(s => s.kind === "curtain" && s.lane === "pal");
    const i = pal1.i;
    return { pal1Key: pal1.key, back: `../chapitres/chapitre-${EV[i][4]}-espace.html#s${EV[i][5]}`, i,
             vitKey: vit && vit.key, curtainKey: palCurtain.key };
  });
  await page.evaluate(k => window.__musee.focus(k), pick.pal1Key);
  await settle();
  const f = await page.evaluate(() => ({
    panel: window.__musee.panel(),
    badge: document.getElementById("badge").classList.contains("show"),
    hit: window.__musee.rayHit(0, -0.03),
  }));
  log("(J4b) poste d'affiche palestinienne : panneau ouvert sur CETTE case, dos-à-dos verrouillé vers la bonne salle du kit, badge affiché",
    f.panel.open && f.panel.key === pick.pal1Key && f.panel.backHref === pick.back && BACK.test(f.panel.backHref) && f.badge,
    `panneau=${kindOfKey(f.panel.key)} dos=${f.panel.backHref} badge=${f.badge}`);
  log("(J4c) le centre du viseur désigne bien CETTE affiche (raycast honnête)",
    f.hit && f.hit.kind === "poster" && f.hit.i === pick.i,
    f.hit ? `touché=${f.hit.kind} #${f.hit.i} (attendu #${pick.i})` : "rien touché");

  await page.evaluate(k => window.__musee.focus(k), pick.curtainKey);
  await settle();
  const c = await page.evaluate(() => ({ panel: window.__musee.panel(),
    says: document.getElementById("panel").textContent }));
  log("(J4d) le rideau du silence se visite : « Ce récit… », et la même porte que les autres cases",
    c.panel.open && kindOfKey(c.panel.key) === "curtain" && BACK.test(c.panel.backHref || "") &&
    /se tait/i.test(c.says), `panneau=${kindOfKey(c.panel.key)}`);

  if (pick.vitKey) {
    await page.evaluate(k => window.__musee.focus(k), pick.vitKey);
    await settle();
    const v = await page.evaluate(() => {
      const voix = [...document.querySelectorAll("#panel .voix .vx")].map(e => e.textContent);
      return { panel: window.__musee.panel(), hit: window.__musee.rayHit(0, 0),
               three: voix.length === 3 && PERS_KEYS.every(k => voix.join(" ").includes(PERS[k].name)) };
    });
    const three = v.three;
    log("(J4e) vitrine ouverte = les TROIS voix côte à côte dans le panneau (jamais une seule version)",
      v.panel.open && kindOfKey(v.panel.key) === "case" && three, `voix=${v.voix.length}`);
    log("(J4f) la vitrine est bien sous le viseur à son poste", v.hit && v.hit.kind === "case",
      v.hit ? `touché=${v.hit.kind}` : "rien");
  }
  await shot("M-station");
}

/* ---------- J5 : regard — signes, bornes ---------- */
{
  const g = await page.evaluate(() => {
    const y0 = window.__musee.state().yaw;
    window.__musee.nudgeLook(80, 0); const y1 = window.__musee.state().yaw;
    const p0 = window.__musee.state().pitch;
    window.__musee.nudgeLook(0, -90); const p1 = window.__musee.state().pitch;
    window.__musee.nudgeLook(0, 4000); const pTop = window.__musee.state().pitch;
    window.__musee.nudgeLook(0, -9000); const pBot = window.__musee.state().pitch;
    return { y0, y1, dPitch: p1 - p0, pTop, pBot };
  });
  log("(J5) la caméra suit la main : pousser à droite tourne à droite, pousser vers le haut regarde en haut",
    g.y1 < g.y0 - 0.05 && g.dPitch > 0.05, `dx→Δyaw=${(g.y1 - g.y0).toFixed(3)}, dy→Δpitch=${g.dPitch.toFixed(3)}`);
  log("(J5b) le regard ne se retourne jamais : pitch borné ±1,45 rad (~83°)",
    g.pTop >= 1.4 && g.pTop <= 1.4501 && g.pBot <= -1.4 && g.pBot >= -1.4501,
    `extrêmes=${g.pTop.toFixed(3)} / ${g.pBot.toFixed(3)}`);
}

/* ---------- J6 : clavier — Tab = parcours de visite, focus = panneau, Échap ---------- */
{
  await page.evaluate(() => window.__musee.teleportRoom(2));
  await settle();
  const order = await page.evaluate(() => ({
    same: [...document.querySelectorAll("#stations button")].map(b => b.getAttribute("data-key")).join("|") ===
          window.__musee.stations().map(s => s.key).join("|"),
    n: document.querySelectorAll("#stations button").length,
  }));
  log("(J6) Tab = parcours de visite : les postes focusables sont exactement les postes de la visite, dans l'ordre de marche",
    order.same && order.n > 150, `${order.n} postes, ordre identique = ${order.same}`);
  const midKey = await page.evaluate(() => {
    const st = window.__musee.state();
    const best = window.__musee.stations().find(s => s.kind === "poster" && Math.abs(s.view.z - st.z) < 8) ||
      window.__musee.stations().find(s => s.kind === "poster");
    document.querySelector(`#stations button[data-key="${best.key}"]`).focus();
    return best.key;
  });
  await settle();
  const kb = await page.evaluate(() => ({ panel: window.__musee.panel(), inStations: !!document.activeElement.closest("#stations") }));
  log("(J6b) posée au clavier = posée à la souris : le focus sur un poste ouvre le panneau et amène la caméra",
    kb.panel.open && kb.panel.key === midKey && kb.inStations, `panneau=${kindOfKey(kb.panel.key)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const esc = await page.evaluate(() => !window.__musee.panel().open);
  log("(J6c) Échap referme le panneau", esc, "");
}

/* ---------- J7 : « prefers-reduced-motion » — instantané, jamais verrouillé ---------- */
{
  const ctx2 = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const p2 = await ctx2.newPage();
  const err2 = [];
  p2.on("pageerror", (e) => err2.push(String(e)));
  await p2.goto(PAGE, { waitUntil: "load" });
  await p2.waitForTimeout(1100);
  const r = await p2.evaluate(() => {
    document.getElementById("welcome").classList.add("gone");
    const st = window.__musee.stations().find(s => s.kind === "poster");
    window.__musee.focus(st.key);           // PAS d'argument instantané : le réduit-motion doit snapper seul
    const s = window.__musee.state();
    return { reduced: s.reduced, glide: s.gliding, near: Math.hypot(s.x - st.view.x, s.z - st.view.z), locked: s.locked };
  });
  log("(J7) mode « sans animation » du système : saut instantané au poste, aucun glissement",
    r.reduced && !r.glide && r.near < 0.03, `réduit=${r.reduced} glide=${r.glide} écart=${r.near.toFixed(3)} m`);
  log("(J7b) réduction-motion : la souris n'est jamais verrouillée d'office", r.locked === false, "");
  log("(J7c) zéro erreur JS en mode réduit", err2.length === 0, err2.slice(0, 2).join(" | "));
  await ctx2.close();
}

/* ---------- J8 : liens profonds — ?ev=N, #sN.S ---------- */
{
  const probe = await page.evaluate(() => {
    let evIdx = -1;
    for (let i = 0; i < EV.length; i++) if (divergent(i)) { evIdx = i; break; }
    const y = EV[evIdx][0]; let room = 0;
    ERAS.forEach((e, k) => { if (y >= e.a && y < e.b) room = k; });
    return { evIdx, room };
  });
  await page.goto(PAGE + "?ev=" + probe.evIdx, { waitUntil: "load" });
  await page.waitForTimeout(1000); await settle();
  const a = await page.evaluate(() => window.__musee.state());
  log("(J8) lien profond ?ev=N : atterrissage dans la salle de l'événement",
    a.room === probe.room, `ev=${probe.evIdx} salle attendue=${probe.room} obtenue=${a.room}`);
  await page.goto(PAGE + "#s4.S", { waitUntil: "load" });
  await page.waitForTimeout(900); await settle();
  const b = await page.evaluate(() => window.__musee.state());
  log("(J8b) atterrissage depuis une salle du kit (#sN.S) : la salle N s'ouvre en face", b.room === 4, `salle=${b.room}`);
}

/* ---------- J9 : pas de WebGL → repli honeste vers la liste ---------- */
{
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx3.addInitScript(() => {
    const o = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t, ...rest) {
      if (String(t).indexOf("webgl") === 0) return null;
      return o.call(this, t, ...rest);
    };
  });
  const p3 = await ctx3.newPage();
  await p3.goto(PAGE, { waitUntil: "load" });
  await p3.waitForTimeout(700);
  const fb = await p3.evaluate(() => ({
    shown: getComputedStyle(document.getElementById("fallback")).display !== "none",
    href: document.querySelector("#fallback a").getAttribute("href"),
    welcomeHidden: document.getElementById("welcome").classList.contains("gone"),
    canvas: !!document.querySelector("#stage canvas"),
  }));
  log("(J9) sans WebGL : message court, ZÉRO scène 3D, repli direct vers la liste (variante C)",
    fb.shown && fb.welcomeHidden && !fb.canvas && /variante-C-liste\.html$/.test(fb.href),
    `repli=${fb.shown} toile=${fb.canvas} cible=${fb.href}`);
  await ctx3.close();
}

/* ---------- J10 : mobile, comparatif, zéro erreur ---------- */
{
  const ctx4 = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p4 = await ctx4.newPage();
  const err4 = [];
  p4.on("pageerror", (e) => err4.push(String(e)));
  await p4.goto(PAGE, { waitUntil: "load" });
  await p4.waitForTimeout(1100);
  const m = await p4.evaluate(() => {
    const c = document.querySelector("#stage canvas").getBoundingClientRect();
    return { noX: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
             w: Math.round(c.width), walk: !!document.getElementById("bWalk") };
  });
  log("(J10) mobile 390 : zéro scroll horizontal, toile pleine largeur, entrée « Marcher » présente",
    m.noX && m.w === 390 && m.walk && err4.length === 0, `scrollX=${m.noX} toile=${m.w} err=${err4.length}`);
  await p4.screenshot({ path: ART + "M-mobile.png" });
  await ctx4.close();

  const idxOK = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return (await r.text()).includes("perspective-J-musee.html");
  }, BASE + "/index-comparatif.html");
  log("(J10b) J est présentée dans index-comparatif", idxOK, "");
  log("(J11) aucune erreur JavaScript sur toute la batterie", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
}

await browser.close();
console.log("\n===== RESULTATS verif_musee =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(fails === 0 ? "TOUS LES CHECKS PASSENT" : fails + " CHECK(S) EN ECHEC");
process.exit(fails === 0 ? 0 : 1);
