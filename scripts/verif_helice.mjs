// verif_helice.mjs — vérification de la variante I « l'Hélice des récits », VERSION TRESSE DÉROULÉE.
// La page est un document vertical : temps de haut en bas, trois brins tressés au centre
// (géométrie = l'hélice déroulée : x = amp·sin(2π·an/15 + φ), phases 0/120/240°, amp 92).
// Les compteurs (260 cartes / 19 silences / liens par paire), le panneau, les liens profonds,
// mobile 390 et reduced-motion sont des contrats PORTÉS de l'ancienne vue ; les portes de
// géométrie caméra sont REMPLACÉES par des portes de LISIBILITÉ (le défaut mesuré de l'I 3D).
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
const stab = async () => { await page.waitForTimeout(400); };

/* recouvrements de cartes dans le viewport — la cause de mort de l'ancienne vue, numérisée */
const OVERLAP_FN = `(() => {
  const vh = document.querySelector("#scene").getBoundingClientRect();
  const rs = [...document.querySelectorAll(".c3")].map(c => c.getBoundingClientRect()).filter(r => r.bottom > vh.top && r.top < vh.bottom);
  let bad = 0;
  for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) {
    const x = Math.min(rs[a].right, rs[b].right) - Math.max(rs[a].left, rs[b].left);
    const y = Math.min(rs[a].bottom, rs[b].bottom) - Math.max(rs[a].top, rs[b].top);
    if (x > 3 && y > 3) bad++;
  }
  return { n: rs.length, bad };
})()`;

/* ---------- T0 : intégrité de la tresse (invariant de compte, contrat I0 porté) ---------- */
await page.goto(PAGE, { waitUntil: "load" });
await stab();
{
  const exp = await page.evaluate(() => {
    let cells = 0, sils = 0, rungs = 0;
    for (let i = 0; i < EV.length; i++) {
      const n = PERS_KEYS.filter(k => lvOf(i, k) > 0).length;
      cells += n; sils += 3 - n; rungs += n >= 2 ? 1 : 0;   // un seul lien horizontal par fait
    }
    return {
      cells, sils, rungs,
      gotCells: document.querySelectorAll(".c3").length,
      gotSils: document.querySelectorAll("#weave .g3").length,
      gotRungs: document.querySelectorAll("#weave .rung").length,
      ribbons: document.querySelectorAll("#weave g.strand").length,
      lanes: PERS_KEYS.map(k => nTold(k)),
    };
  });
  log("(T0) tresse complète : une carte par récit narrateur, un pointillé par silence, un lien par fait",
    exp.cells === exp.gotCells && exp.sils === exp.gotSils && exp.rungs === exp.gotRungs && exp.ribbons === 3,
    `attendus cartes=${exp.cells} silences=${exp.sils} liens=${exp.rungs} rubans=3 / obtenus ${exp.gotCells}/${exp.gotSils}/${exp.gotRungs}/${exp.ribbons} · ${exp.lanes}`);
  await shot("I-default");
}

/* ---------- T0b : géométrie = l'hélice DERROULÉE (sinus période 15 ans, phases 0/120/240°, amp 92) ---------- */
{
  const g = await page.evaluate(() => {
    try {
      const cx = L.bandCx, amp = L.amp;
      const at = (k, y) => (nodeX(k, y) - cx) / amp;   // doit valoir sin(φk + 2π·(y−T_MIN)/15)
      const phi = { occ: 0, isr: 2 * Math.PI / 3, pal: 4 * Math.PI / 3 };
      const err = [];
      for (const k of ["occ", "isr", "pal"]) {
        let maxerr = 0;
        for (let y = 1950; y < 2020; y += 1) {
          const want = Math.sin(phi[k] + (y - T_MIN) * 2 * Math.PI / 15);
          maxerr = Math.max(maxerr, Math.abs(at(k, y) - want));
        }
        err.push([k, +maxerr.toFixed(4)]);
      }
      return { amp, cx: Math.round(cx), err };
    } catch (e) { return { err: String(e) }; }
  });
  const ok = Array.isArray(g.err) && g.err.every(([, e]) => e < 0.02) && Math.abs(g.amp - 92) < 0.5;
  log("(T0b) rubans = hélice déroulée exacte : sinus de période 15 ans, phases 0/120/240°, amplitude 92px",
    ok, `amp=${g.amp} bandCx=${g.cx} maxErr(sin)=${JSON.stringify(g.err)}`);
}

/* ---------- T1 : LA porte d'entrée — le repos est lisible (l'I 3D échouait ici) ---------- */
{
  const leg = await page.evaluate(() => {
    const sc = document.querySelector("#scene");
    const vh = sc.getBoundingClientRect();
    const cards = [...document.querySelectorAll(".c3")];
    let full = 0, tiny = 0, minW = 1e9, seen = 0;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.bottom > vh.top && r.top < vh.bottom && r.right > 0 && r.left < vh.width) {
        seen++; minW = Math.min(minW, r.width);
        if (r.width < 180) tiny++;
      }
      if (r.top < vh.top || r.bottom > vh.bottom || r.left < 0 || r.right > vh.width) continue;
      const fs = parseFloat(getComputedStyle(c.querySelector(".t")).fontSize);
      if (fs >= 14 && r.width >= 200) full++;
    }
    return { full, tiny, seen, minW: Math.round(minW) };
  });
  log("(T1) au repos 1440×900 : ≥8 cartes ENTIÈREMENT visibles avec titre ≥14px et largeur ≥200px",
    leg.full >= 8, `${leg.full} cartes lisibles à fond · ${leg.seen} cartes vues · plus étroite ${leg.minW}px`);
  log("(T1b) AUCUNE carte visible n'est sous 180px de large (fini les fragments de 30px)",
    leg.tiny === 0, `sous-180px=${leg.tiny}`);
  const ov = await page.evaluate(OVERLAP_FN);
  log("(T1c) zéro recouvrement de cartes au repos (l'occlusion murale de l'I 3D, rendue impossible)",
    ov.bad === 0, `${ov.n} cartes vues, ${ov.bad} recouvrements`);
}

/* ---------- T1d : l'ordre DOM suit le temps → Tab parcourt la chronologie ---------- */
{
  const ord = await page.evaluate(() => {
    const idx = [...document.querySelectorAll(".c3")].map(c => +c.dataset.i);
    let bad = 0;
    for (let j = 1; j < idx.length; j++) if (idx[j] < idx[j - 1]) bad++;
    return { bad, n: idx.length };
  });
  log("(T1d) ordre DOM des cartes = ordre chronologique (Tab suit le temps)", ord.bad === 0, `inversions=${ord.bad}/${ord.n}`);
}

/* ---------- T2 : le côté de la carte suit le côté du brin sur la tresse ---------- */
{
  const t2 = await page.evaluate(() => {
    const bad = [];
    const phi = { occ: 0, isr: 2 * Math.PI / 3, pal: 4 * Math.PI / 3 };
    for (let i = 0; i < EV.length; i += 5) {
      const r = window.__row(i);
      for (const it of r.items) {
        const side = Math.sin(phi[it.k] + (EV[i][0] - T_MIN) * 2 * Math.PI / 15) >= 0 ? "R" : "L";
        if (it.side !== side) bad.push([i, it.k, it.side, side]);
      }
    }
    return bad;
  });
  log("(T2) côté carte = côté du brin (sin≥0 → droite) : « aucun brin au centre » se VOIT",
    t2.length === 0, JSON.stringify(t2.slice(0, 3)));
}

/* ---------- T3 : survol → tout le fait s'allume (cartes, nœuds, attache, lien épaissi) ---------- */
{
  const hl = await page.evaluate(() => {
    const idx = EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0));
    const c = document.querySelector(`.c3[data-i="${idx}"]`);
    c.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    const rungs = [...document.querySelectorAll(`#weave .rung[data-i="${idx}"]`)];
    const lit = document.querySelectorAll('[data-i="' + idx + '"].lit').length;
    const thick = rungs.filter(r => +r.getAttribute("stroke-width") >= 4).length;
    const dimmed = document.querySelector("#canvas").classList.contains("dim");
    c.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
    const off = document.querySelectorAll('[data-i="' + idx + '"].lit').length;
    return { total: rungs.length, lit, thick, dimmed, off };
  });
  log("(T3) survol : le groupe du fait s'allume (lit + lien épaissi + voile), puis s'éteint",
    hl.total === 1 && hl.lit >= 9 && hl.thick === 1 && hl.dimmed && hl.off === 0, JSON.stringify(hl));
}

/* ---------- T4 : panneau — fait neutre d'abord, toutes les versions, back-link kit exact ---------- */
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
      gold: document.querySelectorAll(`#weave .rung[data-i="${idx}"].div`).length,
      href: document.querySelector("#pFoot a") ? document.querySelector("#pFoot a").getAttribute("href") : "",
      litWhileOpen: document.querySelectorAll('[data-i="' + idx + '"].lit').length > 0,
    };
  });
  const expHref = `../chapitres/chapitre-${t.ev[4]}-espace.html#s${t.ev[5]}`;
  log("(T4) clic carte → panneau : fait neutre (titre+description du kit) puis les 3 versions ; back-link kit exact",
    t.open && t.nt === t.ev[2] && t.desc > 40 && t.rows === 3 && t.href === expHref &&
    new Set(t.titles).size > 1 && t.litWhileOpen,
    `idx=${t.idx} « ${t.nt.slice(0, 34)}… » lignes=${t.rows} href=${t.href} lit=${t.litWhileOpen}`);
  log("(T4b) fait divergent raconté par les trois récits : son lien traverse la tresse en doré", t.gold === 1, `doré=${t.gold}/1`);
  await shot("I-panel");
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const closed = await page.$eval("#panel", p => !p.classList.contains("open"));
  const unlit = await page.evaluate(() => !document.querySelector("#canvas").classList.contains("dim"));
  log("(T4c) Échap ferme le panneau et éteint l'éclairage du groupe", closed && unlit, `closed=${closed} unlit=${unlit}`);
}

/* ---------- T5 : silences — 19 cercles pointillés TOUJOURS visibles (contrat renforcé) ---------- */
{
  const s5 = await page.evaluate(() => {
    const els = [...document.querySelectorAll("#weave .g3")];
    const vis = els.filter(g => {
      const st = getComputedStyle(g);
      return st.display !== "none" && st.visibility !== "hidden" && parseFloat(st.opacity) > 0.05;
    }).length;
    const first = els[0] && els[0].closest("g") ? els[0].closest("g").querySelector("title") : null;
    return { n: els.length, vis, tip: first ? first.textContent : "" };
  });
  log("(T5) les 19 silences sont rendus et visibles SANS toggle (plus jamais cachés derrière un bouton)",
    s5.n === 19 && s5.vis === 19 && /ne raconte pas/.test(s5.tip), `${s5.vis}/${s5.n} visibles · infobulle « ${s5.tip.slice(0, 30)}… »`);
}

/* ---------- T6 : « Maintenant » (bouton + touche n) centre sur le dernier événement ---------- */
{
  await page.evaluate(() => { document.querySelector("#scene").scrollTop = 0; });
  await stab();
  await page.click("#nowBtn");
  await page.waitForTimeout(900);
  const near = await page.evaluate(() => {
    const vh = document.querySelector("#scene").getBoundingClientRect();
    const cy = vh.top + vh.height / 2;
    let best = 1e9, bv = 0;
    for (const c of document.querySelectorAll(".c3")) {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - cy);
      if (d < best) { best = d; bv = EV[+c.dataset.i][0]; }
    }
    return bv;
  });
  await page.keyboard.press("n"); await page.waitForTimeout(600);
  const near2 = await page.evaluate(() => {
    const vh = document.querySelector("#scene").getBoundingClientRect();
    const cy = vh.top + vh.height / 2;
    let best = 1e9, bv = 0;
    for (const c of document.querySelectorAll(".c3")) {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - cy);
      if (d < best) { best = d; bv = EV[+c.dataset.i][0]; }
    }
    return bv;
  });
  log("(T6) « Maintenant » (bouton puis touche n) centre la vue sur le dernier événement (±2,5 ans : les cartes empilées décalent le centre de rangée)",
    Math.abs(near - 2026.3) < 2.5 && Math.abs(near2 - 2026.3) < 2.5, `carte-centre ≈ ${near.toFixed(1)} puis ${near2.toFixed(1)} (attendu ≈ 2026.3)`);
}

/* ---------- T7 : badge-année vivant + minimap synchronisée (le point aveugle de l'I 3D) ---------- */
{
  const moved = await page.evaluate(() => {
    const sc = document.querySelector("#scene");
    sc.scrollTop = document.querySelector("#canvas").offsetTop + window.__row(50).y - sc.clientHeight / 2;
    return sc.scrollTop;
  });
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => {
    const sc = document.querySelector("#scene");
    const off = document.querySelector("#canvas").offsetTop;
    const bi = window.__nearestRow(sc.scrollTop + sc.clientHeight * 0.35 - off);
    return { txt: document.querySelector("#axisnote").textContent, year: EV[bi][0], vpY: +document.querySelector("#mini-vp").getAttribute("y") };
  });
  const shown = parseInt(after.txt, 10);
  log("(T7) badge-année mis à jour au scroll : l'année affichée = la rangée réellement visible (±1)",
    !isNaN(shown) && Math.abs(shown - Math.round(after.year)) <= 1,
    `badge « ${after.txt} » pour la rangée visible ${after.year.toFixed(1)}`);
  log("(T7b) le rectangle de la minimap suit le viewport", after.vpY > 10, `mini-vp.y=${Math.round(after.vpY)} après scroll à ${Math.round(moved)}px`);
}

/* ---------- T8 : clavier ↑↓ saute de fait en fait et pose le focus ---------- */
{
  const a = await page.evaluate(() => window.__i3d().top);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(600);
  const b = await page.evaluate(() => ({
    top: window.__i3d().top,
    focused: !!(document.activeElement && document.activeElement.classList && document.activeElement.classList.contains("c3")),
    i: document.activeElement && document.activeElement.dataset ? +document.activeElement.dataset.i : -1,
  }));
  log("(T8) flèche ↓ : passe au fait suivant, met la carte en focus, fait défiler",
    Math.abs(b.top - a) > 20 && b.focused && b.i >= 0, `Δtop=${Math.round(b.top - a)}px focus=${b.focused} i=${b.i}`);
}

/* ---------- T9 : liens profonds ?ev= · ?ch= · #sN.S ---------- */
{
  const idx = await page.evaluate(() => EV.findIndex((e, i) => divergent(i) && PERS_KEYS.every(k => lvOf(i, k) > 0)));
  await page.goto(`${PAGE}?ev=${idx}`, { waitUntil: "load" }); await stab(); await stab();
  const ev9 = await page.evaluate((i) => {
    const sc = document.querySelector("#scene");
    const vh = sc.getBoundingClientRect();
    const cards = [...document.querySelectorAll(`.c3[data-i="${i}"]`)];
    const inView = cards.length > 0 && cards.some(c => {
      const r = c.getBoundingClientRect();
      return r.top >= vh.top - 5 && r.bottom <= vh.bottom + 5;
    });
    return { open: document.querySelector("#panel").classList.contains("open"), inView };
  }, idx);
  log("(T9) ?ev=i — panneau ouvert ET la carte du fait est dans le viewport", ev9.open && ev9.inView, `ouvert=${ev9.open} visible=${ev9.inView}`);
  const ch = await page.evaluate(() => EV[1][4]);
  await page.goto(`${PAGE}?ch=${ch}`, { waitUntil: "load" }); await stab();
  const ok9b = await page.evaluate((n) => {
    const cy = window.__i3d().cy, ds = EV.filter(e => e[4] === n).map(e => e[0]);
    return cy >= Math.min(...ds) - 8 && cy <= Math.max(...ds) + 8;
  }, ch);
  log(`(T9b) ?ch=${ch} — la fenêtre visible est dans l'emprise du chapitre`, ok9b, "");
  const seq = await page.evaluate(() => { const e = EV[6]; return { h: `#s${e[4]}.${e[5]}` }; });
  await page.goto(PAGE + seq.h, { waitUntil: "load" }); await stab();
  const ok9c = await page.evaluate(() => document.querySelector("#panel").classList.contains("open"));
  log(`(T9c) ${seq.h} (back-link kit) — ouvre le bon fait`, ok9c, "");
}

/* ---------- T10 : rien n'est jamais retiré — compte et plancher d'opacité après navigation ---------- */
{
  await page.goto(PAGE, { waitUntil: "load" }); await stab();
  await page.evaluate(() => { const sc = document.querySelector("#scene"); sc.scrollTop = sc.scrollHeight; });
  await page.waitForTimeout(300);
  const keep = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".c3")];
    const gone = cards.filter(c => getComputedStyle(c).display === "none").length;
    const faded = cards.filter(c => parseFloat(getComputedStyle(c).opacity) < 0.5).length;
    return { n: cards.length, gone, faded };
  });
  log("(T10) après voyage au bas de la tresse : les cartes sont toutes là, aucune retirée, aucune sous 0,5 d'opacité",
    keep.n === 260 && keep.gone === 0 && keep.faded === 0, `${keep.n} cartes · display-none=${keep.gone} · <0.5=${keep.faded}`);
}

/* ---------- T11 : budget rendu — 60 rafraîchissements HUD en < 2,5 s (Chromebook scolaire) ---------- */
{
  const ms = await page.evaluate(() => {
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) window.__frame();
    return performance.now() - t0;
  });
  log("(T11) 60 rafraîchissements HUD (badge + minimap) < 2 500 ms", ms < 2500, `${ms.toFixed(0)} ms`);
}

/* ---------- T11b : la zone la plus dense (2023+) reste lisible + capture QC ---------- */
{
  await page.evaluate(() => {
    const i = EV.findIndex(e => e[0] >= 2023);
    const sc = document.querySelector("#scene");
    sc.scrollTop = document.querySelector("#canvas").offsetTop + window.__row(i).y - sc.clientHeight / 2;
  });
  await stab();
  await shot("I-dense");
  const dense = await page.evaluate(() => {
    const vh = document.querySelector("#scene").getBoundingClientRect();
    let full = 0;
    for (const c of document.querySelectorAll(".c3")) {
      const r = c.getBoundingClientRect();
      if (r.top >= vh.top && r.bottom <= vh.bottom && parseFloat(getComputedStyle(c.querySelector(".t")).fontSize) >= 14 && r.width >= 200) full++;
    }
    return full;
  });
  const ov2 = await page.evaluate(OVERLAP_FN);
  log("(T11b) zone la plus dense (2023+) : ≥6 cartes entièrement lisibles et zéro recouvrement à 1440×900",
    dense >= 6 && ov2.bad === 0, `lisibles=${dense} · ${ov2.n} vues · recouvrements=${ov2.bad}`);
}

/* ---------- T12 : prefers-reduced-motion = saut instantané (pas de glide) ---------- */
{
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 800 } });
  const p2 = await ctx.newPage();
  await p2.goto(PAGE, { waitUntil: "load" }); await p2.waitForTimeout(600);
  await p2.keyboard.press("n");
  await p2.waitForTimeout(150);
  const r = await p2.evaluate(() => {
    const sc = document.querySelector("#scene");
    let bi = 0, bd = 1e9;
    for (let j = 0; j < EV.length; j++) { const d = Math.abs(EV[j][0] - NOW); if (d < bd) { bd = d; bi = j; } }
    const want = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, document.querySelector("#canvas").offsetTop + window.__row(bi).y - sc.clientHeight / 2));
    return { got: sc.scrollTop, want };
  });
  log("(T12) prefers-reduced-motion : « n » saute SANS glide (<150 ms, position exacte)",
    Math.abs(r.got - r.want) < 40, `top=${Math.round(r.got)} attendu=${Math.round(r.want)}`);
  await ctx.close();
}

/* ---------- T13 : mobile 390 — pas de scroll horizontal, cartes pleine largeur ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, isMobile: true, hasTouch: true });
  const p3 = await ctx.newPage();
  const errs = [];
  p3.on("pageerror", e => errs.push(String(e)));
  await p3.goto(PAGE, { waitUntil: "load" }); await p3.waitForTimeout(800);
  const m = await p3.evaluate(() => {
    const cards = [...document.querySelectorAll(".c3")];
    const vh = document.querySelector("#scene").getBoundingClientRect();
    let vis = 0, full = 0;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (r.bottom > vh.top && r.top < vh.bottom) { vis++; if (r.width >= 240) full++; }
    }
    return {
      noX: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      cards: cards.length, vis, full,
      mini: getComputedStyle(document.querySelector("#mini")).display,
      sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
    };
  });
  log("(T13) mobile 390 : zéro scroll horizontal, 260 cartes, cartes ≥240px dans le viewport, minimap masquée, zéro erreur",
    m.noX && m.cards === 260 && m.full === m.vis && m.vis >= 3 && m.mini === "none" && errs.length === 0,
    `scrollX=${m.sw}/${m.cw} cartes=${m.cards} vues=${m.vis} ≥240px=${m.full} mini=${m.mini} err=${errs.length}`);
  await p3.screenshot({ path: ART + "I-mobile.png" });
  await ctx.close();
}

/* ---------- T16 : AUCUN titre coupé — le sujet de la page est dans les mots ---------- */
{
  const cut = await page.evaluate(() => {
    const bad = [];
    for (const c of document.querySelectorAll(".c3")) {
      const t = c.querySelector(".t");
      if (t.scrollHeight - t.clientHeight > 4) bad.push(c.dataset.i + "|" + c.dataset.k);
    }
    return { n: document.querySelectorAll(".c3").length, bad: bad.slice(0, 6), count: bad.length };
  });
  log("(T16) zéro titre rogné : chaque titre tient dans sa carte (hauteur mesurée avant packing)",
    cut.count === 0, `${cut.count}/${cut.n} cartes à texte rogné ${cut.bad.length ? JSON.stringify(cut.bad) : ""}`);
}

/* ---------- T17 : chaque nœud/silence EST SUR son brin (dérive de l'empilement, le bug signalé) ---------- */
{
  const on = await page.evaluate(() => {
    let worst = 0, n = 0;
    for (const el of document.querySelectorAll("#weave .node, #weave .g3")) {
      const cx = +el.getAttribute("cx"), cy = +el.getAttribute("cy");
      const want = ribbonX(el.dataset.k, cy);
      worst = Math.max(worst, Math.abs(cx - want)); n++;
    }
    return { n, worst: +worst.toFixed(2) };
  });
  log("(T17) les 279 marqueurs posés exactement sur leur brin à LA hauteur de leur rangée",
    on.worst <= 1, `${on.n} marqueurs · écart max au brin ${on.worst}px`);
}

/* ---------- T14 : enregistré dans le comparatif ---------- */
{
  const idxOK = await page.evaluate(async (u) => {
    const r = await fetch(u);
    return (await r.text()).includes("perspective-I-helice.html");
  }, BASE + "/index-comparatif.html");
  log("(T14) I est présenté dans index-comparatif", idxOK, "");
  log("(T15) aucune erreur JavaScript sur toute la batterie", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
}

await browser.close();
console.log("\n===== RESULTATS verif_helice (tresse déroulée) =====");
for (const r of results) console.log(r);
const fails = results.filter(r => r.startsWith("FAIL")).length;
console.log(fails === 0 ? "TOUS LES CHECKS PASSENT" : fails + " CHECK(S) EN ECHEC");
process.exit(fails === 0 ? 0 : 1);
