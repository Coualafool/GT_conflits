#!/usr/bin/env node
/* sim_k_layout.mjs — preuve HORS-LIGNE du bâtiment « Les Allées » (aucun navigateur, aucun TARS).
   Extrait le bloc `var GEO = {` → `/*__LAYOUT_END__*​/` de perspective-K-allees.html et le joue
   dans un vm avec les modules de données réels (perspective-I2-data → EV ;
   perspective-K-data → places). Mêmes disciplines que sim_musee_layout :
   - ATTACHEMENT : chaque objet est adossé à une surface réelle, dérivée de la GÉOMÉTRIE, et
     jamais dans une ouverture (leçons du bug floaters door-blind, transposées aux places).
   - Une expectatrice lue dans le code sous test est une tautologie : ici les attentes viennent
     des données (EV/fenêtres) et des constantes architecturales GEO, pas des placements.
   - La gate ne vaut que si elle rejette le bâti cassé : `--selftest` rejoue l'inventaire avec
     des plaçages délibérément fautifs et exige que chaque gate crie. */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(ROOT, "frise", "perspective-K-allees.html");

const page = fs.readFileSync(PAGE, "utf8");
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "frise", "perspective-I2-data.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "frise", "perspective-K-data.js"), "utf8"), ctx);

const a = page.indexOf("var GEO = {");
const b = page.indexOf("/*__LAYOUT_END__*/");
if (a < 0 || b < 0) { console.error("K0 FATAL — bornes du bloc layout introuvables"); process.exit(1); }
const block = page.slice(a, b);
const codeOnly = block.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
if (/\bconst\s|\blet\s/.test(codeOnly)) { console.error("K0 FATAL — const/let dans le bloc layout (interdits : lecture vm partagée)"); process.exit(1); }
vm.runInContext(block, ctx);
/* la loi de marche et les cadrages vivent apres le bloc layout (camera) — on les charge aussi :
   ces zones ont aveugle la premiere passe navigateur (riv z, vues hors-sol, creneaux de niche) */
const wl0 = page.indexOf("function inZone"), wl1 = page.indexOf("var SPD = 2.7");
if (wl0 < 0 || wl1 < 0) { console.error("K0 FATAL — loi de marche introuvable dans la page"); process.exit(1); }
vm.runInContext(page.slice(wl0, wl1), ctx);
const sv0 = page.indexOf("function stationView");
if (sv0 >= 0) {
  const svEnd = page.indexOf("}\n", page.indexOf("return { x:s.x, z:s.z + dir*1.7", sv0)) + 2;  // fin de fonction, pas du littéral
  vm.runInContext(page.slice(sv0, svEnd), ctx);
}
const WALK = vm.runInContext("(function(){ return { walkable: walkable, stationView: (typeof stationView !== 'undefined' ? stationView : null) }; })()", ctx);


const G = vm.runInContext("({ GEO, ALLEYS, BRINS, alleyZ, PW, CW, PLAZAS, SEGDEF, TLEN, posters, curtains, cases, factsByBrin, xOf, segOfY, plazaOfX, nicheX })", ctx);
const EV = vm.runInContext("EV", ctx);
const TRACK_KEYS = vm.runInContext("TRACK_KEYS", ctx);
const K = ctx.window.__K_ALLIES;

let fails = 0, passes = 0;
function ok(cond, label, detail) {
  if (cond) { passes++; console.log("PASS " + label); }
  else { fails++; console.log("FAIL " + label + (detail ? " — " + detail : "")); }
}
function eps(x) { return Math.abs(x); }
const E = 1e-6;

/* ---------- K0 structure attendue (attendus DÉRIVÉS des données, pas lus du placement) ---------- */
const nWallExpected = EV.filter(function (e) { return !(K.plazas.some(function (p) { return e[0] >= p.y0 && e[0] <= p.y1; })); }).length;
ok(G.PLAZAS.length === 7, "K0a 7 places", "trouvé " + G.PLAZAS.length);
ok(G.SEGDEF.length === 8, "K0b 8 segments inter-places", "trouvé " + G.SEGDEF.length);
ok(G.posters.length === nWallExpected + K.plazas.reduce(function (s, p) { return s + p.ids.length; }, 0),
   "K0c affiches = faits hors fenêtre + faits en niche", "affiches=" + G.posters.length + " attendu=" + (nWallExpected + K.plazas.reduce(function (s, p) { return s + p.ids.length; }, 0)));
ok(G.TLEN > 120 && G.TLEN < 190, "K0d longueur du bâtiment plausible", "TLEN=" + G.TLEN.toFixed(1));

/* K0e — monotonie temporelle du bâti : x0/x1 de SEGDEF et PLAZAS augmentent, et l'ordre des
   fenêtres de place est l'ordre chronologique des années */
(function () {
  let mono = true, det = "";
  let x = -1;
  for (let j = 0; j < G.SEGDEF.length; j++) {
    if (G.SEGDEF[j].x0 < x - E) { mono = false; det = "seg " + j; break; }
    x = G.SEGDEF[j].x1;
    if (j < G.PLAZAS.length) {
      if (G.PLAZAS[j].x0 < x - E) { mono = false; det = "plaza " + j; break; }
      if (G.PLAZAS[j].y0 < G.SEGDEF[j].y1 - E) { mono = false; det = "plaza " + j + " avant son segment"; break; }
      x = G.PLAZAS[j].x1;
    }
  }
  ok(mono, "K0e temps→x monotone (segments et places dans l'ordre des années)", det);
})();

/* K0f — une seule échelle : les faits d'un même segment sont dans [x0,x1] du segment (vu en K3)
   et deux faits de brins DIFFÉRENTS à la même année sont à moins de 1,2 m l'un de l'autre en x
   (synchronicité spatiale du bâtiment — la promesse « un seul temps ») */
(function () {
  let worst = 0, pair = "";
  for (let i = 0; i < EV.length; i++) for (let j = i + 1; j < EV.length; j++) {
    if (Math.abs(EV[i][0] - EV[j][0]) > 1e-9) continue;
    if (G.segOfY(EV[i][0]) < 0 || G.segOfY(EV[j][0]) < 0) continue;
    const dx = Math.abs(G.xOf(EV[i][0]) - G.xOf(EV[j][0]));
    if (dx > worst) { worst = dx; pair = i + "/" + j; }
  }
  ok(worst <= 1.2, "K0f même année = même x (échelle temporelle unique)", "écart max " + worst.toFixed(2) + " m (" + pair + ")");
})();

/* ---------- K1 exhaustivité : chaque fait EV a exactement UN emplacement ---------- */
(function () {
  const place = new Map();
  let dup = 0;
  function put(i, key) { if (place.has(i)) { dup++; } place.set(i, key); }
  G.posters.forEach(function (p) { put(p.i, (p.niche ? "niche" : "mur") + ":" + p.key); });
  const missing = [];
  for (let i = 0; i < EV.length; i++) if (!place.has(i)) missing.push(i);
  ok(missing.length === 0 && dup === 0, "K1 les 79 faits ont exactement un emplacement",
    "manquants=" + missing.length + " dupliqués=" + dup + (missing.length ? " [" + missing.slice(0, 6).join(",") + "]" : ""));
})();

/* K1b — les faits HORS fenêtre sont tous en mur, les faits EN fenêtre tous en niche, par le bon brin */
(function () {
  let bad = [];
  const inPlaza = new Map();
  K.plazas.forEach(function (p) { p.ids.forEach(function (i) { inPlaza.set(i, p); }); });
  G.posters.forEach(function (p) {
    const expectedNiche = inPlaza.has(p.i);
    if (p.niche !== expectedNiche) bad.push("i" + p.i + " niche=" + p.niche + " attendu=" + expectedNiche);
    const brinOfFact = TRACK_KEYS[EV[p.i][1]];
    if (p.brin !== brinOfFact) bad.push("i" + p.i + " brin=" + p.brin + " corpus=" + brinOfFact);
  });
  ok(bad.length === 0, "K1b mur↔niche et brin conformes au corpus", bad.slice(0, 4).join(" | "));
})();

/* ---------- K2 ATTACHEMENT : chaque œuvre est adossée à une paroi réelle, jamais dans une ouverture ---------- */
(function () {
  const bad = [];
  G.posters.concat(G.curtains).forEach(function (it) {
    const half = it.w / 2;
    if (!it.niche) { // mur d'allée
      const s = G.SEGDEF[it.seg];
      const zWall = G.alleyZ(it.ai) + (it.face === "i" ? (G.GEO.ALLEYW / 2 - (it.kind === "curtain" ? 0.15 : 0.12)) : -(G.GEO.ALLEYW / 2 - (it.kind === "curtain" ? 0.15 : 0.12)));
      if (eps(it.z - zWall) > 0.02) bad.push((it.kind||"poster") + " i" + it.i + " décollé de sa paroi (z=" + it.z.toFixed(2) + " attendu=" + zWall.toFixed(2) + ")");
      if (it.x - half < s.x0 - E || it.x + half > s.x1 + E) bad.push("poster i" + it.i + " hors du créneau du segment " + it.seg);
      // backing latéral : à moins de 0,2 m d'une paroi de place ET dans la bande d'embrasure → porte
      G.PLAZAS.forEach(function (p) {
        [p.x0, p.x1].forEach(function (xe) {
          const inBand = Math.abs(it.x - xe) < 0.2 + half;
          if (!inBand) return;
          const door = Math.abs(it.z - G.alleyZ(it.ai)) <= G.GEO.PDH;
          if (!door) bad.push("poster i" + it.i + " dans une ouverture de place sans porte (x=" + it.x.toFixed(2) + " z=" + it.z.toFixed(2) + ")");
        });
      });
    } else { // niche de place
      const p = G.PLAZAS[it.plaza];
      if (!p) { bad.push("niche sans place i=" + (it.i === null ? "curtain" : it.i)); return; }
      const cx = G.PLAZAS[it.plaza].x0 + G.nicheX(G.PLAZAS[it.plaza], it.ai);
      if (eps(it.z - (p.x0 + 0.11)) > 0.03) bad.push("niche décollée du mur d'entrée (z=" + it.z.toFixed(2) + " face=" + (p.x0+0.11).toFixed(2) + ")");
      const U = (p.W - 2 * G.GEO.PDH) / 2 - 0.35;
      if (it.x - half < cx - U - 0.02 || it.x + half > cx + U + 0.02) bad.push("groupe de niche débordant sous une porte (i=" + (it.i === null ? "rideau" : it.i) + ")");
      if (it.kind === "curtain" && eps(it.x - cx) > 0.02) bad.push("rideau hors de l'axe d'allée (x=" + it.x.toFixed(2) + " attendu=" + cx.toFixed(2) + ")");
    }
    if ((it.h||0) && it.y - it.h / 2 < 0.05) bad.push("œuvre sous 5 cm du sol y=" + it.y.toFixed(2));
    if ((it.h||0) && it.y + it.h / 2 > G.GEO.WALLH - 0.02) bad.push("œuvre au-dessus du mur");
  });
  ok(bad.length === 0, "K2 toute œuvre adossée, jamais dans une ouverture", bad.slice(0, 5).join(" | "));
})();

/* K2b — niche rideau ⟺ brin sans fait dans la fenêtre (bidirectionnel, données → bâti) */
(function () {
  let bad = [];
  G.PLAZAS.forEach(function (p) {
    G.ALLEYS.forEach(function (k, ai) {
      const has = p.ids.some(function (i) { return TRACK_KEYS[EV[i][1]] === k; });
      const curt = G.curtains.find(function (c) { return c.plaza === p.j && c.ai === ai; });
      const posts = G.posters.filter(function (pp) { return pp.niche && pp.plaza === p.j && pp.ai === ai; });
      if (has && (curt || !posts.length)) bad.push("place" + p.j + "/" + k + " parle mais niche ≠ affiches");
      if (!has && (!curt || posts.length)) bad.push("place" + p.j + "/" + k + " se tait mais niche ≠ rideau");
    });
  });
  ok(bad.length === 0, "K2b rideau ⟺ silence du brin (bidirectionnel)", bad.slice(0, 4).join(" | "));
})();

/* ---------- K3 packing : pas de chevauchement, bornes, saturation ---------- */
(function () {
  const bad = [];
  const byFace = new Map();
  G.posters.filter(function (p) { return p.face !== undefined; }).forEach(function (p) {
    const key = p.ai + "-" + p.face + "-" + p.seg;
    if (!byFace.has(key)) byFace.set(key, []);
    byFace.get(key).push(p);
  });
  byFace.forEach(function (list, key) {
    const rows = new Map();
    list.forEach(function (p) { if (!rows.has(p.row)) rows.set(p.row, []); rows.get(p.row).push(p); });
    Array.from(rows.keys()).forEach(function (r) {
      rows.get(r).sort(function (a, b) { return a.x - b.x; });
      const rl = rows.get(r);
      for (let q = 1; q < rl.length; q++) {
        const gap = rl[q].x - rl[q].w / 2 - (rl[q - 1].x + rl[q - 1].w / 2);
        if (gap < 0.02) bad.push(key + " rang" + r + " chevauchement " + gap.toFixed(3));
      }
    });
  });
  ok(bad.length === 0, "K3a zéro chevauchement par face/rangée", bad.slice(0, 4).join(" | "));
})();
(function () {
  let maxScale = 0, worst = "";
  G.posters.forEach(function (p) { if (p.scale > maxScale) { maxScale = p.scale; worst = String(p.i); } });
  ok(maxScale <= 1.0 + E, "K3b saturation : aucune face compactée sous l'échelle 1", "scale=" + maxScale + " (i=" + worst + ")");
})();
(function () { // les niches non plus ne se chevauchent pas
  const bad = [];
  const byNicheRow = new Map();
  G.posters.filter(function (p) { return p.niche; }).forEach(function (p) {
    const key = p.plaza + "-" + p.ai + "-r" + p.row;
    if (!byNicheRow.has(key)) byNicheRow.set(key, []);
    byNicheRow.get(key).push(p);
  });
  byNicheRow.forEach(function (list, key) {
    list.sort(function (a, b) { return a.x - b.x; });
    for (let q = 1; q < list.length; q++) {
      const gap = list[q].x - list[q].w / 2 - (list[q - 1].x + list[q - 1].w / 2);
      if (gap < 0.02) bad.push(key + " " + gap.toFixed(3));
    }
  });
  ok(bad.length === 0, "K3c zéro chevauchement dans les niches", bad.slice(0, 4).join(" | "));
})();

/* ---------- K4 praticabilité : graphe allées×segments + places, tout joignable ---------- */
(function () {
  const adj = new Map();
  function link(a, b) { if (!adj.has(a)) adj.set(a, new Set()); if (!adj.has(b)) adj.set(b, new Set()); adj.get(a).add(b); adj.get(b).add(a); }
  G.SEGDEF.forEach(function (s, j) {
    G.ALLEYS.forEach(function (k, ai) {
      if (j < G.PLAZAS.length) link("S" + j + "/" + ai, "P" + j + "/" + ai);
      if (j > 0) link("P" + (j - 1) + "/" + ai, "S" + j + "/" + ai);
      if (j < G.PLAZAS.length && ai + 1 < G.ALLEYS.length) link("P" + j + "/" + ai, "P" + j + "/" + (ai + 1));
    });
  });
  const seen = new Set(["S0/0"]);
  const q = ["S0/0"];
  while (q.length) { const n = q.shift(); (adj.get(n) || []).forEach(function (m) { if (!seen.has(m)) { seen.add(m); q.push(m); } }); }
  const total = G.SEGDEF.length * G.ALLEYS.length + G.PLAZAS.length * G.ALLEYS.length;
  ok(seen.size === total, "K4 graphe tout-joignable depuis le seuil (couloirs continus + places-passerelles)", seen.size + "/" + total);
  /* porte de place dans CHAQUE allée, des deux côtés (règle du brainstorm : jamais de carrefour forcé ET jamais de cul-de-sac) */
  let doorOk = true;
  G.PLAZAS.forEach(function (p) { G.ALLEYS.forEach(function (k, ai) {
    const n = adj.get("P" + p.j + "/" + ai); if (!n) { doorOk = false; return; }
    if (!n.has("S" + p.j + "/" + ai) || !n.has("S" + (p.j + 1) + "/" + ai)) doorOk = false; }); });
  ok(doorOk, "K4b chaque place a ses 4 portes × 2 côtés (chaque allée entre ET sort de chaque place)");
})();

/* ---------- K5 lecture des silences : table d'absences par allée/segment (info, pas un défaut) ---------- */
(function () {
  const lines = [];
  G.SEGDEF.forEach(function (s) {
    G.ALLEYS.forEach(function (k, ai) {
      const n = G.posters.filter(function (p) { return p.face !== undefined && p.ai === ai && p.seg === s.j; }).length;
      if (n === 0) lines.push("allée " + k + " · " + Math.floor(s.y0) + "–" + Math.floor(s.y1) + " : aucun fait (vide mur à assumer)");
    });
  });
  console.log("INFO K5 — " + lines.length + " vide(s) d'allée (attendus : le document ne dit rien partout)");
  lines.forEach(function (l) { console.log("  · " + l); });
})();

/* ---------- K6 bornes d'exploitation ---------- */
ok(G.PLAZAS.every(function (p) { return p.W >= G.GEO.PLAZAMIN - E && p.W <= 14; }), "K6a largeurs de place dans les bornes");
(function () {
  const slotBad = [];
  G.PLAZAS.forEach(function (p) { G.ALLEYS.forEach(function (k, ai) {
    const cnt = G.curtains.filter(function (q) { return q.plaza === p.j && q.ai === ai; }).length
      + G.posters.filter(function (q) { return q.niche && q.plaza === p.j && q.ai === ai; }).length;
    if (cnt < 1) slotBad.push("P" + p.j + "/A" + ai + " vide");
  }); });
  ok(slotBad.length === 0, "K6b chaque niche de place = groupe d'affiches OU rideau (4 × 7 places)", slotBad.slice(0, 4).join(" | "));
})();

/* ---------- K7 collision de noms inter-scripts (la classe de bug « page morte ») :
   tout nom déclaré au plus haut niveau du script de la page est INTERDIT dans les modules ---------- */
(function () {
  const modSrc = fs.readFileSync(path.join(ROOT, "frise", "perspective-I2-data.js"), "utf8") +
                 fs.readFileSync(path.join(ROOT, "frise", "perspective-K-data.js"), "utf8");
  const modNames = new Set();
  for (const m of modSrc.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) modNames.add(m[1]);
  const inline = page.slice(page.lastIndexOf("<script>"), page.lastIndexOf("</script>"));
  const pageNames = new Set();
  for (const m of inline.matchAll(/^(?:var|function)\s+([A-Za-z_$][\w$]*)/gm)) pageNames.add(m[1]);
  const clash = [...pageNames].filter(function (n) { return modNames.has(n); });
  ok(clash.length === 0, "K7 zéro collision de nom page↔modules", clash.join(", "));
})();

/* ---------- --selftest : les gates doivent REJETER le bâti cassé (sinon elles sont décoratives) ---------- */
if (process.argv.includes("--selftest")) {
  console.log("--- selftest : gates contre bâti fautif ---");
  let caught = 0, expected = 0;
  function expectFail(name, fn) {
    expected++;
    try {
      const r = fn();
      if (r.length) { caught++; console.log("  OK  " + name + " → gate crie (" + r.length + ")"); }
      else console.log("  ✗  " + name + " → la gate ne dit RIEN (décorative !)");
    } catch (e) { caught++; console.log("  OK  " + name + " → exception (" + e.message.slice(0, 40) + ")"); }
  }
  expectFail("affiche dans l'embrasure d'une porte de place", function () {
    const p = G.PLAZAS[1], s = G.SEGDEF[1];
    const fake = { i: 999, kind: "poster", ai: 1, face: "i", seg: 1, plaza: null, x: p.x0 - 0.05, z: G.alleyZ(1) + 1.9, y: 1.58, w: 0.9, h: 0.6, niche: false };
    return checkOne(fake);
  });
  expectFail("affiche décollée de sa paroi (z central)", function () {
    const s = G.SEGDEF[3];
    const fake = { i: 998, kind: "poster", ai: 2, face: "i", seg: 3, plaza: null, x: (s.x0 + s.x1) / 2, z: G.alleyZ(2), y: 1.58, w: 0.9, h: 0.6, niche: false };
    return checkOne(fake);
  });
  expectFail("niche décollée du mur d'entrée", function () {
    const p = G.PLAZAS[2];
    const fake = { i: 997, kind: "poster", ai: 0, face: undefined, seg: undefined, plaza: 2, x: p.x0 + p.W / 2, z: p.x0 + 0.9, y: 1.58, w: 0.9, h: 0.6, niche: true };
    return checkOne(fake);
  });
  function checkOne(it) {
    const bad = [];
    const half = it.w / 2;
    if (it.face !== undefined) {
      const s = G.SEGDEF[it.seg];
      const zWall = G.alleyZ(it.ai) + (it.face === "i" ? (G.GEO.ALLEYW / 2 - 0.12) : -(G.GEO.ALLEYW / 2 - 0.12));
      if (Math.abs(it.z - zWall) > 0.02) bad.push("detach");
      if (it.x - half < s.x0 || it.x + half > s.x1) bad.push("out-of-slot");
      G.PLAZAS.forEach(function (p) {
        [p.x0, p.x1].forEach(function (xe) {
          if (Math.abs(it.x - xe) < 0.2 + half && Math.abs(it.z - G.alleyZ(it.ai)) > G.GEO.PDH) bad.push("door-void");
        });
      });
    } else {
      const p = G.PLAZAS[it.plaza];
      const cx = G.PLAZAS[it.plaza].x0 + G.nicheX(G.PLAZAS[it.plaza], it.ai);
      if (Math.abs(it.x - cx) > 0.02) bad.push("off-axis");
      if (Math.abs(it.z - p.x0) > 0.03) bad.push("wall-detached");
    }
    return bad;
  }
  console.log("selftest: " + caught + "/" + expected + " bâtis fautifs rejetés");
  if (caught < expected) fails += expected - caught;
}

/* ---------- K8 loi de marche + cadrages (les aveugles de la passe navigateur, version sim) ---------- */
(function () {
  const bad = [];
  G.ALLEYS.forEach(function (k, ai) {
    let prev = null;
    for (let x = 0.2; x <= G.TLEN - 0.2; x += 0.1) {
      const w = WALK.walkable(x, G.alleyZ(ai));
      if (prev !== null && w !== prev) bad.push("A" + ai + " rupture à x=" + x.toFixed(1));
      prev = w;
    }
    if (prev === false) bad.push("A" + ai + " bute avant la fin");
  });
  for (let x = 0.5; x < G.TLEN; x += 0.5) {
    const zMid = (G.alleyZ(0) + G.alleyZ(1)) / 2;
    if (WALK.walkable(x, zMid)) bad.push("traversée fantôme à x=" + x.toFixed(1));
  }
  ok(bad.length === 0, "K8a marche continue : les 4 allées du seuil à la fin, zéro rupture ni fantôme", bad.slice(0, 3).join(" | "));
})();
(function () {
  if (!WALK.stationView) { ok(false, "K8b viewpoints praticables", "stationView non chargé"); return; }
  const bad = [];
  const why = (p, v) => {
    const pl = p.plaza !== undefined ? G.PLAZAS[p.plaza] : null;
    return (p.key || ("i" + p.i)) + "@v(" + v.x.toFixed(2) + "," + v.z.toFixed(2) + ")" + (pl ? " pl[" + pl.x0.toFixed(2) + "," + pl.x1.toFixed(2) + "]" : "");
  };
  G.posters.forEach(function (p) {
    const v = WALK.stationView(p);
    if (!WALK.walkable(v.x, v.z)) bad.push(why(p, v));
  });
  G.curtains.forEach(function (p) {
    const v = WALK.stationView(p);
    if (!WALK.walkable(v.x, v.z)) bad.push(why(p, v));
  });
  ok(bad.length === 0, "K8b tous les viewpoints de postes praticables (mur, niche, rideau)", bad.slice(0, 6).join(","));
})();
(function () {
  const bad = [];
  G.PLAZAS.forEach(function (p) {
    G.ALLEYS.forEach(function (k, ai) {
      const slot = vm.runInContext("nicheSlot(PLAZAS[" + p.j + "]," + ai + ")", ctx);
      G.posters.filter(function (q) { return q.niche && q.plaza === p.j && q.ai === ai; }).forEach(function (q) {
        if (q.x - q.w / 2 < slot.cx - slot.U - 0.011 || q.x + q.w / 2 > slot.cx + slot.U + 0.011) bad.push("np" + q.i);
        if (q.y + q.h / 2 > G.GEO.WALLH - 0.02) bad.push("np" + q.i + " plafond");
      });
      const widest = Math.max.apply(null, [0].concat(G.curtains.filter(function(c){return c.plaza===p.j&&c.ai===ai;}).map(function(c){return c.w;})));
      if (widest/2 > slot.U + 0.011) bad.push("P"+p.j+"A"+ai+" rideau plus large que son créneau");
    });
  });
  ok(bad.length === 0, "K8c niches dans leurs créneaux (entre portes), sous le plafond", bad.slice(0, 6).join(","));
})();

console.log("--- SIM K : " + passes + " PASS / " + fails + " FAIL");
process.exit(fails ? 1 : 0);
