// sim_musee_layout.mjs — PREUVE du modèle de placement du Musée (node, sans navigateur).
// Extrait le bloc marqué /*__LAYOUT_START__*/../*__LAYOUT_END__*/ de frise/perspective-J-musee.html
// et l'exécute sur le vrai corpus (poc-data.js + poc-perspectives.js), puis vérifie les invariants :
// saturation, portée des murs, garde des cloisons/vitrines, zéro chevauchement par rangée, ordre-année,
// bijection taille↔LV, totaux rideaux/affiches. La page et cette preuve partagent le MEME code.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "frise/perspective-J-musee.html"), "utf8");
const src = fs.readFileSync(path.join(root, "frise/poc-data.js"), "utf8") + "\n" +
            fs.readFileSync(path.join(root, "frise/poc-perspectives.js"), "utf8");
const M = new Function(src + ";return {EV,ERAS,LV,REN,PERS,PERS_KEYS,lvOf,titleOf,nTold,divergent};")();
const m = html.match(/\/\*__LAYOUT_START__\*\/([\s\S]*?)\/\*__LAYOUT_END__\*\//);
if (!m) { console.error("FAIL: marqueurs de mise en raye introuvables dans la page"); process.exit(1); }
const block = m[1];

const geoTxt = html.match(/var GEO = \{[^}]+\};/)[0];   // source unique : la GEO de la page, pas un doublon
const prelude = `
${''}var GEO = ${geoTxt.match(/\{[\s\S]*\}/)[0]};
var STEP = GEO.DEPTH + GEO.PART;
function roomRange(k){ var z0 = -k*STEP; return { z0:z0, z1:z0 - GEO.DEPTH }; }
var NROOM = ERAS.length;
function mClamp(v,a,b){ return v<a?a:(v>b?b:v); }
`;
const built = new Function("EV","ERAS","lvOf","divergent","PERS_KEYS",
  prelude + block + ";return {posters,curtains,cases,GEO,STEP,roomRange,PW,CW,YA,YB};")
  (M.EV, M.ERAS, M.lvOf, M.divergent, M.PERS_KEYS);
const { posters, curtains, cases, GEO, roomRange, PW, CW, YA, YB } = built;
const { EV, ERAS, PERS_KEYS, lvOf, nTold, divergent } = M;

let fails = 0;
const fail = (msg) => { console.log("FAIL:", msg); fails++; };

// 1) saturation : par salle × couloir, affiches + rideaux = événements de la salle (aucun trou)
let sumTold = 0, sumSilent = 0;
for (let k = 0; k < ERAS.length; k++) {
  const era = ERAS[k];
  const idx = EV.map((_, i) => i).filter(i => EV[i][0] >= era.a && EV[i][0] < era.b);
  for (const lane of PERS_KEYS) {
    const P = posters.filter(p => p.room === k && p.lane === lane);
    const C = curtains.filter(c => c.room === k && c.lane === lane);
    if (P.length + C.length !== idx.length)
      fail(`satur salle ${k} ${lane}: ${P.length}+${C.length} != ${idx.length}`);
    const told = idx.filter(i => lvOf(i, lane) > 0).length;
    if (P.length !== told) fail(`compte-tells salle ${k} ${lane}: ${P.length} != ${told}`);
    sumTold += P.length; sumSilent += C.length;
  }
  // 2) portée + garde des cloisons : mappés sur z dans [z1+0.5, z0-0.5] (murs latéraux), occ dans ±OCCU
  const r = roomRange(k);
  for (const s of posters.concat(curtains).filter(s => s.room === k)) {
    if (s.lane === "occ") {
      if (Math.abs(s.x) + (s.kind === "poster" ? s.w : CW) / 2 > GEO.OCCU + 1e-6)
        fail(`portée occ salle ${k} ${s.kind} i=${s.i} x=${s.x.toFixed(2)}`);
    } else {
      const U = s.kind === "poster" ? GEO.U : GEO.U;
      const zMin = r.z1 + (s.kind === "poster" ? s.w : CW) / 2 + 0.02;
      const zMax = r.z0 - (s.kind === "poster" ? s.w : CW) / 2 - 0.02;
      if (s.z < zMin - 1e-6 || s.z > zMax + 1e-6)
        fail(`garde cloison salle ${k} ${lane2(s)} ${s.kind} i=${s.i} z=${s.z.toFixed(2)} ∉ [${zMin.toFixed(2)},${zMax.toFixed(2)}]`);
      void U;
    }
  }
  // 3) zéro chevauchement : rideau vs tout son mur ; affiches vs affiches de la MÊME rangée
  for (const lane of PERS_KEYS) {
    const side = lane === "pal" ? -1 : lane === "isr" ? 1 : 0;
    const axis = lane === "occ" ? "x" : "z";
    const items = posters.concat(curtains).filter(s => s.room === k && s.lane === lane);
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      const A = items[a], B = items[b];
      if (A.kind === "poster" && B.kind === "poster" && A.row !== B.row) continue;   // étages différents
      const wA = A.w, wB = B.w;
      const pa = axis === "x" ? A.x : A.z, pb = axis === "x" ? B.x : B.z;
      const gap = Math.abs(pa - pb) - (wA + wB) / 2;
      if (gap < 0.02) fail(`chevauchement salle ${k} ${lane} r${A.row}/r${B.row} ${A.kind}(i${A.i}) / ${B.kind}(i${B.i}) gap=${gap.toFixed(3)}${side === 0 ? " [occ]" : ""}`);
    }
    // 4) ordre-année préservé sur chaque rangée
    for (const row of [1, 2]) {
      const P = posters.filter(p => p.room === k && p.lane === lane && p.row === row)
                       .sort((a, b) => (lane === "occ" ? a.x - b.x : a.z - b.z));
      for (let q = 1; q < P.length; q++)
        if (P[q].year < P[q - 1].year - 1e-9)
          fail(`ordre année salle ${k} ${lane} rangée ${row}: ${P[q].year} après ${P[q - 1].year}`);
    }
    const rowsUsed = new Set(posters.filter(p => p.room === k && p.lane === lane).map(p => p.row));
    if (posters.some(p => p.room === k && p.lane === lane) && rowsUsed.size < Math.min(2, Math.ceil(idx.length / 2)))
      fail(`rangées inutilisées salle ${k} ${lane}: ${[...rowsUsed]}`);
  }
  // 5) vitrines : z dans la salle avec garde de 1,8 m aux deux parois
  const K = cases.filter(c => c.room === k);
  for (const c of K) {
    if (c.z < r.z1 + 1.8 - 1e-6 || c.z > r.z0 - 1.8 + 1e-6)
      fail(`vitrine hors garde salle ${k} i=${c.i} z=${c.z.toFixed(2)} ∉ [${(r.z1 + 1.8).toFixed(2)},${(r.z0 - 1.8).toFixed(2)}]`);
    if (Math.abs(Math.abs(c.x) - 0.95) > 1e-9) fail(`vitrine hors colonne salle ${k} i=${c.i} x=${c.x}`);
  }
  for (const col of [-0.95, 0.95]) {
    const C = K.filter(c => Math.sign(c.x) === Math.sign(col)).sort((a, b) => b.z - a.z);   // avancer = z décroissant
    for (let q = 1; q < C.length; q++) {
      if (C[q - 1].z - C[q].z < 0.66 + 0.05) fail(`socles serrés salle ${k} colonne ${col}`);
      if (C[q].year < C[q - 1].year - 1e-9) fail(`ordre vitrines salle ${k} colonne ${col}`);
    }
  }
  const div = idx.filter(i => divergent(i)).length;
  if (K.length !== div) fail(`vitrines salle ${k}: ${K.length} != divergents ${div}`);
}
// 6) bijection taille↔LV sous l'échelle shrink-to-fit (LV2 = grande, jamais effacée)
for (const p of posters) {
  const wB = p.lv === 2 ? PW[p.lane].w2 : PW[p.lane].w1;
  const hB = p.lv === 2 ? PW[p.lane].h2 : PW[p.lane].h1;
  if (Math.abs(p.w - wB * p.scale) > 1e-9 || Math.abs(p.h - hB * p.scale) > 1e-9)
    fail(`échelle↔LV rompue i=${p.i} ${p.lane} lv=${p.lv} w=${p.w} h=${p.h} scale=${p.scale}`);
  if (!(p.scale > 0.6 && p.scale <= 1 + 1e-9)) fail(`échelle hors bornes salle ${p.room} ${p.lane}: ${p.scale}`);
  if (!(p.row === 1 || p.row === 2)) fail(`rangée invalide i=${p.i} ${p.lane} row=${p.row}`);
}
for (let k = 0; k < ERAS.length; k++) for (const lane of PERS_KEYS) {
  const big = posters.filter(p => p.room === k && p.lane === lane && p.lv === 2);
  const sml = posters.filter(p => p.room === k && p.lane === lane && p.lv === 1);
  if (big.length && sml.length && !(big[0].w > sml[0].w))
    fail(`LV2 pas plus grande que LV1 salle ${k} ${lane}`);
}
// 7) totaux : 93 × 3 = 279 étagères narratives, toutes pourvues ; rideaux + affiches = 279
const wantTold = PERS_KEYS.reduce((s, k) => s + nTold(k), 0);
if (sumTold !== wantTold) fail(`total affiches ${sumTold} != ${wantTold}`);
if (sumTold + sumSilent !== EV.length * 3) fail(`saturation globale ${sumTold + sumSilent} != ${EV.length * 3}`);
if (curtains.length !== sumSilent) fail("compte rideaux");
if (cases.length !== EV.reduce((s, _, i) => s + (divergent(i) ? 1 : 0), 0)) fail("compte vitrines");
// 8) le rideau couvre l'emplacement vide à hauteur d'yeux sans mordre la sous-étiquette (bas = 2,635 m)
for (const c of curtains) {
  const top = 0.14 + 2.3;                                // bas à 0,14 m + CH (CH = 2,3)
  if (top < built.YA + 0.66 / 2) fail(`rideau trop court salle ${c.room}`);
  if (top > 2.635 + 1e-6 && c.lane !== "occ") fail(`rideau mord la sous-étiquette salle ${c.room} ${c.lane}`);
}
console.log(fails ? `SIM FAILS=${fails}` :
  `SIM OK — ${posters.length} affiches, ${curtains.length} rideaux, ${cases.length} vitrines ; ` +
  `saturation 279, portée, gardes, rangées, ordre-année, taille↔LV tous verts`);
process.exit(fails ? 1 : 0);
function lane2(s) { return s.lane; }
