// gen_vitrine_props.mjs — table de distribution des PROP dans les vitrines du Musée (node, sans navigateur).
// ZÉRO donnée nouvelle : les vitrines viennent du MÉME bloc /*__LAYOUT_START__*/..__LAYOUT_END__ de
// perspective-J-musee.html que sim_musee_layout.mjs ; l'archétype de prop est un hachage FNV-1a stable
// de la clé de station de la vitrine (« v »+i, keyOf de la page). Les props sont décoratifs : le sens
// reste dans les trois plaques — aucun prop n'encode un fait du corpus (feuille de décision, « zéro donnée »).
// Sorties : interne/vitrine-props.json (machine, pipeline Blender/three) + interne/VITRINE-PROPS.md (humain).
// Relancer APRÈS toute modification du corpus : la table doit rester déterministe (même clé → même archétype).
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

const geoTxt = html.match(/var GEO = \{[^}]+\};/)[0];   // source unique : la GEO de la page, pas un doublon
const prelude = `
var GEO = ${geoTxt.match(/\{[\s\S]*\}/)[0]};
var STEP = GEO.DEPTH + GEO.PART;
function roomRange(k){ var z0 = -k*STEP; return { z0:z0, z1:z0 - GEO.DEPTH }; }
var NROOM = ERAS.length;
function mClamp(v,a,b){ return v<a?a:(v>b?b:v); }
`;
const built = new Function("EV","ERAS","lvOf","divergent","PERS_KEYS",
  prelude + m[1] + ";return {cases,GEO,STEP};")
  (M.EV, M.ERAS, M.lvOf, M.divergent, M.PERS_KEYS);
const { cases } = built;
const { EV, ERAS, titleOf, divergent } = M;

// ---- kit d'archétypes (neutres, d'époque ; la CLÉ du prop = nom d'instance dans le GLB) ----
const KIT = [
  { key:"docstack", nom:"pile de documents sous verre",      tris:"150–300",  tex:"atlas commun 512px" },
  { key:"maproll",  nom:"carte roulée",                       tris:"80–150",   tex:"atlas commun 512px" },
  { key:"radio",    nom:"radio d'époque (boîtier silhouette)",tris:"200–400",  tex:"atlas commun 512px" },
  { key:"lantern",  nom:"lampe à huile / lanterne",           tris:"150–300",  tex:"atlas commun 512px" },
  { key:"letter",   nom:"lettre pliée + cachet",              tris:"60–120",   tex:"atlas commun 512px" },
  { key:"watch",    nom:"montre gousset posée",               tris:"120–250",  tex:"atlas commun 512px" },
  { key:"books",    nom:"pile de trois livres",               tris:"100–200",  tex:"atlas commun 512px" },
];
// FNV-1a : déterministe, indépendant de l'implémentation du hachage du moteur.
function fnv1a(s){ let h = 0x811c9dc5; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }

const rows = cases
  .slice()
  .sort((a,b) => a.room - b.room || b.z - a.z)          // ordre de marche : salle, puis z décroissant (on avance vers z décroissant)
  .map(c => {
    const key = "v" + c.i;                               // clé de station exacte de la page (keyOf)
    const h = fnv1a(key);
    return {
      key,
      i: c.i,
      salle: c.room,
      ere: ERAS[c.room].nom || (ERAS[c.room].a + "–" + ERAS[c.room].b),
      annee: EV[c.i][0],
      titre: titleOf(c.i, "pal"),
      colonne: c.x < 0 ? "gauche" : "droite",
      x: +c.x.toFixed(2), z: +c.z.toFixed(2),
      archetype: KIT[h % KIT.length].key,
      rotYdeg: h % 360,                                  // variation d'orientation stable (évite l'alignement robotique)
      seed: h,
    };
  });

// ---- garde-fous : la table doit couvrir exactement les vitrines divergentes, rien de plus ----
let fails = 0;
const fail = (msg) => { console.log("FAIL:", msg); fails++; };
const nDiv = EV.reduce((s,_,i) => s + (divergent(i) ? 1 : 0), 0);
if (rows.length !== nDiv) fail(`lignes ${rows.length} != vitrines divergentes ${nDiv}`);
if (new Set(rows.map(r => r.key)).size !== rows.length) fail("clés dupliquées");
for (const r of rows) {
  if (!divergent(r.i)) fail(`ligne ${r.key} : événement non divergent`);
  if (Math.abs(Math.abs(r.x) - 0.95) > 1e-9) fail(`ligne ${r.key} : colonne invalide x=${r.x}`);
}
if (fails) { console.log(`GEN FAILS=${fails}`); process.exit(1); }

// ---- distribution : équilibre par salle (signalement, pas un échec — le hachage ne promise rien) ----
const perRoom = {};
for (const r of rows) (perRoom[r.salle] ??= []).push(r.archetype);
const notes = [];
for (const [k, archs] of Object.entries(perRoom)) {
  const run = archs.reduce((max, a, q) => (q > 0 && a === archs[q-1] ? max+1 : max), 0);
  if (run >= 2) notes.push(`salle ${k} : ${run+1} archétypes identiques d'affilée (hachage, accepté — variation rotY/seed)`);
}

// ---- sorties ----
const outJson = {
  "$comment": "Généré par scripts/gen_vitrine_props.mjs — ne pas éditer à la main. Clé = station de la page (v+i) ; re-générer après tout changement de corpus.",
  kit: KIT,
  rows,
};
fs.mkdirSync(path.join(root, "interne"), { recursive: true });
fs.writeFileSync(path.join(root, "interne/vitrine-props.json"), JSON.stringify(outJson, null, 2) + "\n");

const kitLine = KIT.map(k => `- \`${k.key}\` — ${k.nom} — ${k.tris} tris — ${k.tex}`).join("\n");
const table = rows.map(r =>
  `| ${r.key} | ${r.salle} | ${r.annee} | ${r.colonne} | ${r.x.toFixed(2)}, ${r.z.toFixed(2)} | \`${r.archetype}\` | ${r.rotYdeg}° | ${r.titre.replace(/\|/g,"\\|")} |`
).join("\n");
fs.writeFileSync(path.join(root, "interne/VITRINE-PROPS.md"), `# Vitrines → props : table de distribution

Générée par \`scripts/gen_vitrine_props.mjs\` — **ne pas éditer à la main**. Source des vitrines :
le bloc \`__LAYOUT__\` de \`frise/perspective-J-musee.html\` (le même que \`sim_musee_layout.mjs\`).
L'archétype est un FNV-1a stable de la clé de station \`v<i>\` : immuable tant que l'identifiant
de l'événement ne change pas, reproductible sans état. **Les props sont décoratifs** — le sens
reste dans les trois plaques ; aucun prop n'encode un fait du corpus.

## Kit (7 archétypes, un GLB instancié)

${kitLine}

Export : glTF + Draco (\`gltfpack -cc -tc\`), atlas KTX2 ; props exclus des \`hitables\`
(ou hits transférés au socle) pour garder \`verif_musee.mjs\` vert.

## Table (${rows.length} vitrines)

| clé | salle | année | colonne | x, z (m) | archétype | rotY | titre du fait |
|---|---|---|---|---|---|---|---|
${table}

## Notes de distribution

${notes.length ? notes.map(n => "- " + n).join("\n") : "- aucune répétition consécutive de plus de deux archétypes dans une salle."}
`);

const dist = {};
for (const r of rows) dist[r.archetype] = (dist[r.archetype] || 0) + 1;
console.log(`GEN OK — ${rows.length} vitrines, ${KIT.length} archétypes`);
console.log("distribution :", Object.entries(dist).map(([k,n]) => `${k}=${n}`).join(" "));
if (notes.length) console.log("notes :", notes.join(" | "));
console.log("écrit : interne/vitrine-props.json + interne/VITRINE-PROPS.md");
