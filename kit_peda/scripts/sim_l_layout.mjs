#!/usr/bin/env node
/* sim_l_layout.mjs — preuve HORS-LIGNE du « Chapelet du temps » (aucun navigateur, aucun TARS).
   Extrait le bloc `var GEO = {` → `/*__LAYOUT_END__*​/` de perspective-L-chapelet.html et le joue
   dans un vm avec les modules de données réels (perspective-I2-data → EV ; perspective-K-data →
   fenêtres __K_ALLIES). Disciplines héritées de sim_k_layout :
   - Les attentes viennent des DONNÉES (EV, fenêtres) et des constantes GEO, jamais du placement lu.
   - Chaque salle/poste doit reposer sur un rectangle de marche ; les vues doivent être marchables.
   - Zéro inventaire figé : tout est recompté depuis EV ici, et comparé à la page. */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGE = path.join(ROOT, "frise", "perspective-L-chapelet.html");

const page = fs.readFileSync(PAGE, "utf8");
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "frise", "perspective-I2-data.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "frise", "perspective-K-data.js"), "utf8"), ctx);

const a = page.indexOf("var GEO = {");
const b = page.indexOf("/*__LAYOUT_END__*/");
if (a < 0 || b < 0) { console.error("L0 FATAL — bornes du bloc layout introuvables"); process.exit(1); }
const block = page.slice(a, b);
const codeOnly = block.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
if (/\bconst\s|\blet\s/.test(codeOnly)) { console.error("L0 FATAL — const/let dans le bloc layout (interdits : lecture vm partagée)"); process.exit(1); }
vm.runInContext(block, ctx);
/* la loi de marche vit après le layout (comme K : walkable pur, sans DOM) */
const wl0 = page.indexOf("function inRect");
const wl1 = page.indexOf("var glide = null;");
if (wl0 < 0 || wl1 < 0) { console.error("L0 FATAL — loi de marche introuvable dans la page"); process.exit(1); }
vm.runInContext(page.slice(wl0, wl1), ctx);

const L = vm.runInContext("({ GEO, COLS, BRINS, WIN, SEGW, segOfYL, inWin, HUBS, SEGS, rooms, posters, curtains, cases, rects, blockers, fillers, allStations, factsByBrin, xcOf, nicheRowY, NICHE_R, ZMIN })", ctx);
const walkable = vm.runInContext("walkable", ctx);
const EV = vm.runInContext("EV", ctx);

let fails = 0, passes = 0;
function ok(cond, label, detail) {
  if (cond) { passes++; console.log("PASS " + label); }
  else { fails++; console.log("FAIL " + label + (detail ? " — " + detail : "")); }
}
const E = 1e-6;

/* ---------- attendus DÉRIVÉS des données ---------- */
const WINs = vm.runInContext("window.__K_ALLIES.plazas", ctx);
const windowFacts = EV.map((e, i) => i).filter((i) => WINs.some((w) => EV[i][0] >= w.y0 && EV[i][0] <= w.y1));
const outsideFacts = EV.map((e, i) => i).filter((i) => !WINs.some((w) => EV[i][0] >= w.y0 && EV[i][0] <= w.y1));
const brOf = (i) => vm.runInContext("BRINS", ctx)[EV[i][1]];

ok(L.HUBS.length === 9, "L1a 9 carrefours (entrée + 7 moments + aujourd'hui)", "trouvé " + L.HUBS.length);
ok(L.SEGS.length === 8, "L1b 8 segments de couloirs", "trouvé " + L.SEGS.length);

/* L2 : un fait = exactement une affiche (salle OU stèle) — rien au mur, rien de double */
const byEv = {};
L.posters.forEach((p) => { byEv[p.i] = (byEv[p.i] || 0) + 1; });
const missing = EV.map((_, i) => i).filter((i) => !byEv[i]);
const doubled = EV.map((_, i) => i).filter((i) => byEv[i] > 1);
ok(missing.length === 0, "L2a chaque fait a au moins une affiche", "manquants " + missing.length + " [" + missing.slice(0, 6).join(",") + "]");
ok(doubled.length === 0, "L2b jamais deux affiches pour un fait", "doublés " + doubled.slice(0, 6).join(","));
ok(L.posters.length === EV.length, "L2c inventaire affiches == corpus", L.posters.length + " vs " + EV.length);

/* L3 : les faits de fenêtre sont en stèle, les autres en salle — répartition recomptée ici */
const roomIds = L.posters.filter((p) => !p.niche).map((p) => p.i).sort((x, y) => x - y);
const steleIds = L.posters.filter((p) => p.niche).map((p) => p.i).sort((x, y) => x - y);
const outsideSet = new Set(outsideFacts), windowSet = new Set(windowFacts);
ok(roomIds.every((i) => outsideSet.has(i)), "L3a salles = faits hors fenêtres seulement");
ok(steleIds.length === windowFacts.length, "L3b stèles = faits des fenêtres", steleIds.length + " vs " + windowFacts.length);

/* L4 : rideaux de stèle == (fenêtre × couloir sans fait), conduits == (segment × couloir sans fait) */
let steleCurtExpected = 0, conduitExpected = 0;
WINs.forEach((w) => L.COLS.forEach((k) => { if (!w.ids.some((i) => brOf(i) === k)) steleCurtExpected++; }));
L.SEGS.forEach((sg) => L.COLS.forEach((k, ai) => {
  const n = L.factsByBrin[k].filter((i) => vm.runInContext("segOfYL", ctx)(EV[i][0]) === sg.j).length;
  if (!n) conduitExpected++;
}));
const steleCurt = L.curtains.filter((c) => c.mode === "stele").length;
ok(steleCurt === steleCurtExpected, "L4a rideaux de stèle == silences de fenêtre", steleCurt + " vs attendu " + steleCurtExpected);
/* L4b nouvelle loi (utilisateur 2026-11-27) : muet = PAS d'allée — zéro conduit, zéro rideau de
   conduit, un massif par cellule muette, et la seule soudure possible est le segment tout-muet
   (descente dorée vers « aujourd'hui »), jamais atteignable sinon. */
const conduit = L.curtains.filter((c) => c.mode === "conduit").length;
const silentCells = L.SEGS.reduce((s, sg) => sg.merged ? s : s + sg.alive.filter((a) => !a).length, 0);
const mergedSegs = L.SEGS.filter((sg) => sg.merged);
ok(conduit === 0 && L.rects.filter((r) => r.kind === "conduit").length === 0 && L.curtains.length === steleCurt,
   "L4b zéro conduit nu : rien à dire = pas d'allée", "conduits=" + conduit);
ok(L.fillers.length === silentCells && mergedSegs.every((sg) => sg.alive.every((a) => !a)),
   "L4d massif plein sous chaque cellule muette (" + silentCells + ")", "massifs=" + L.fillers.length);
ok(mergedSegs.length <= 1 && mergedSegs.every((sg) =>
   walkable(0, (sg.zTop + sg.zBot) / 2)),
   "L4e descente dorée : « aujourd'hui » reste atteignable", "soudure(s)=" + mergedSegs.length);
ok(L.cases.length === 7, "L4c une vitrine par moment commun", "trouvé " + L.cases.length);

/* L5 : géométrie saine — aucune dimension négative, z strictement décroissant */
const negRects = L.rects.filter((r) => r.x1 - r.x0 <= 0 || r.z1 - r.z0 <= 0);
ok(negRects.length === 0, "L5a aucun rectangle de marche de surface nulle/négative", "coupables " + negRects.length + " " + JSON.stringify(negRects[0] || null));
let mono = true;
for (let q = 0; q < L.SEGS.length; q++) {
  const sg = L.SEGS[q], huTop = L.HUBS[q], huBot = L.HUBS[q + 1];
  if (!(Math.abs(sg.zTop - huTop.z1) < E && sg.zBot === huBot.z0 && sg.depth > 0)) mono = false;
  if (!(huBot.z1 < huBot.z0)) mono = false;
}
ok(mono, "L5b chaînage strict : hall → segment → hall, z toujours décroissant");
const nan = [L.ZMIN, ...L.rooms.flatMap((r) => [r.zt, r.zb])].some((v) => !isFinite(v));
ok(!nan, "L5c aucun NaN/Infinity dans les cotes");

/* L6 : colonnes disjointes — les salles d'une colonne ne jamais empiéter sur la colonne voisine */
let bayOk = true;
L.rooms.forEach((r) => {
  const hw = L.GEO.HALFW;
  for (let ai = 0; ai < 4; ai++) if (ai !== r.ai) {
    const dx = Math.abs(r.x - L.xcOf(ai));
    if (dx < hw + hw - E) bayOk = false;
  }
});
ok(bayOk, "L6a salles confinées dans leur colonne (pas 8 m, salles 6,2 m)");
let hallsOk = L.rects.filter((r) => r.kind === "hall").every((r) => r.x1 - r.x0 >= 30);
ok(hallsOk, "L6b halls dorés ≥ 30 m (les 4 colonnes tiennent dedans)");

/* L7 : chaque chaîne tient dans sa profondeur de segment ; stubs et boyaux existent */
let chainOk = true, badChain = null;
L.SEGS.forEach((sg) => {
  L.COLS.forEach((k, ai) => {
    const rs = L.rooms.filter((r) => r.seg === sg.j && r.ai === ai);
    if (!rs.length) return;
    const top = Math.max(...rs.map((r) => r.zt)), bot = Math.min(...rs.map((r) => r.zb));
    if (!(top <= sg.zTop && bot >= sg.zBot)) { chainOk = false; badChain = sg.j + "/" + k; }
  });
});
ok(chainOk, "L7a toutes les chaînes de salles tiennent dans leur segment", badChain);
const stubs = L.rects.filter((r) => r.kind === "stub").length;
const chainsN = new Set(L.rooms.map((r) => r.seg + "/" + r.ai)).size;
ok(stubs === 2 * chainsN, "L7b deux stubs par chaîne de salles (entrée + sortie)", stubs + " vs " + (2 * chainsN));
const necks = L.rects.filter((r) => r.kind === "neck").length;
ok(necks === L.rooms.length - chainsN, "L7c boyaux = salles − chaînes", necks + " vs " + (L.rooms.length - chainsN));

/* L8 : grille de stèle — échelle bornée, ≤3 rangées, affiches dans la stèle */
let gridOk = true, gridBad = "";
L.posters.filter((p) => p.niche).forEach((p) => {
  if (!(p.scale > 0.4 && p.scale <= 1)) { gridOk = false; gridBad = p.key + " scale " + p.scale; }
  if (!(Math.abs(p.x - L.xcOf(p.ai)) <= L.GEO.STELEU - p.w / 2 + 1e-9)) { gridOk = false; gridBad = p.key + " hors stèle"; }
  const gid = p.hub * 4 + p.ai, g = L.NICHE_R[gid];
  if (!(g && p.row <= 3 && p.y + p.h / 2 < 2.95)) { gridOk = false; gridBad = p.key + " plafond rangée " + p.row; }
});
ok(gridOk, "L8a grilles de stèle : échelle ≥0,4, ≤3 rangées, dans le panneau", gridBad);

/* L9 : postes et vues marchables — la salle porte sa visite */
function inAny(x, z) { return walkable(x, z); }
let viewBad = [], viewBadCase = "";
L.allStations.forEach((s) => {
  const v = s.view;
  if (!inAny(v.x, v.z)) { viewBad.push(s.key); }
  if (!isFinite(v.yaw) || !isFinite(v.pitch)) viewBadCase = s.key;
});
ok(viewBad.length === 0, "L9a toutes les vues de poste sont sur du sol praticable", viewBad.slice(0, 8).join(",") + " (" + viewBad.length + ")");
ok(!viewBadCase, "L9b aucune vue avec yaw/pitch NaN", viewBadCase);

/* L10 : marchabilité structurale — les bloquants mordent, les portes percent */
const steleBlock = L.blockers.filter((b) => b.kind === "stele");
ok(steleBlock.length === 7 * 4, "L10a 4 stèles bloquantes × 7 carrefours", "trouvé " + steleBlock.length);
let blockerWalk = false;
steleBlock.forEach((b) => { if (walkable((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2)) blockerWalk = true; });
ok(!blockerWalk, "L10b on ne marche pas dans une stèle");
const hallMid = L.HUBS[3];
ok(walkable(0, (hallMid.z0 + hallMid.z1) / 2), "L10c le centre d'un hall est praticable");
ok(!walkable(0, -1e3) && !walkable(0, 1e3), "L10d hors du bâtiment = pas de marche");
/* le visiteur passe-t-il le mur de hall ? (porte à xc, linteau) — point médian de l'embrasure */
/* L10e portes EXACTES : franchissables là où l'allée existe, scellées là où le récit se tait.
   (une porte fantôme = trou dans le mur vers un massif ; une allée sans porte = piège au seuil) */
let doorMissing = [], doorPhantom = [];
L.HUBS.forEach(function(hu){ L.COLS.forEach(function(k, ai){
  [[hu.h > 0 ? L.SEGS[hu.h-1] : null, hu.z0], [hu.h < L.HUBS.length-1 ? L.SEGS[hu.h] : null, hu.z1]]
  .forEach(function(pair){
    const sg = pair[0], z = pair[1];
    if (!sg || sg.merged) return;                               // rives du temps / soudure : rien à vérifier
    const open = sg.alive[ai];
    if (open && !walkable(L.xcOf(ai), z)) doorMissing.push("h" + hu.h + "/" + k);
    if (!open && walkable(L.xcOf(ai), z)) doorPhantom.push("h" + hu.h + "/" + k);
  });
}); });
ok(doorMissing.length === 0 && doorPhantom.length === 0,
   "L10e portes exactes : franchissables où l'allée existe, mur scellé où le récit se tait",
   "absentes=" + doorMissing.join(",") + " fantômes=" + doorPhantom.join(","));

/* L11 : progression du temps dans la chaîne — une salle plus profonde = date plus tardive */
let orderBad = "";
L.SEGS.forEach((sg) => L.COLS.forEach((k, ai) => {
  const rs = L.rooms.filter((r) => r.seg === sg.j && r.ai === ai).sort((x, y) => y.zt - x.zt);
  for (let q = 1; q < rs.length; q++) if (!(EV[rs[q].i][0] >= EV[rs[q - 1].i][0])) orderBad = sg.j + "/" + k;
}));
ok(!orderBad, "L11 plus on descend, plus la date avance", orderBad);

/* L12 : inventaire total des stations */
const stTotal = L.allStations.length;
ok(stTotal === L.posters.length + L.curtains.length + L.cases.length, "L12a stations = affiches + rideaux + vitrines", stTotal);
ok(stTotal >= EV.length, "L12b chaque visiteur qui Tab voit au moins tous les faits");

/* ---------- bilan ---------- */
console.log("--- SIM L : " + passes + " PASS / " + fails + " FAIL");
process.exit(fails ? 1 : 0);
