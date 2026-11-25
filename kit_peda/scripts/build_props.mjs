// build_props.mjs — AUDIT D'UN GLB DE PROPS + EXPORT du module de données embarqué (node, stdlib uniquement).
// Valide le GLB du kit (interne/BLENDER-PROPS-KIT.md) : 7 meshs prop_<archetype>, bbox ≤ 0,56 × 0,40 × 0,48 m
// (axes glTF Y-up : x ≤ 0,56 ; y ≤ 0,48 ; z ≤ 0,40), tris dans la plage de l'archétype, GLB ≤ 400 Ko,
// et que chaque archétype servi par interne/vitrine-props.json existe bien dans le GLB.
// Puis écrit frise/props-musee.data.js — script CLASSIQUE (chargeable en file://, zéro fetch) qui définit :
//   window.__VITRINE_PROPS = { version, generated, rows: { 'v2': {a,r}, ... }, glbBase64 }
// Le parsing GLB est fait À LA MAIN (header 12 o, chunk JSON, chunk BIN) — pas de three, pas de npm.
// Échec bruyant : tout gate rouge → ligne « FAIL: » + code de sortie non nul, aucun fichier écrit.
// Usage : node scripts/build_props.mjs <input.glb> [--out <chemin.js>] [--allow-test]
//   --allow-test : saute les gates de tris (fixture de test : des boxes, hors plages artistiques).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---- contrat (source : interne/BLENDER-PROPS-KIT.md) ----
const MAX_BBOX = { x: 0.56, y: 0.48, z: 0.40 };            // enveloppe cookie cutter, axes glTF (y = haut)
const EPS = 1e-4;                                          // même tolérance que le script Blender de la doc
const TRI_RANGE = {                                        // tris APRÈS modifiers, par archétype
  docstack: [150, 300], maproll: [80, 150], radio: [200, 400], lantern: [150, 300],
  letter: [60, 120], watch: [120, 250], books: [100, 200],
};
const MAX_GLB_BYTES = 400 * 1000;                          // budget embarqué base64 (le .js fait ~4/3 de ça)

// ---- CLI ----
const argv = process.argv.slice(2);
const allowTest = argv.includes("--allow-test");
const outIdx = argv.indexOf("--out");
const outPath = outIdx !== -1 ? path.resolve(argv[outIdx + 1]) : path.join(root, "frise/props-musee.data.js");
const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out");  // le chemin après --out n'est pas un positionnel
if (positional.length !== 1) { console.error("FAIL: usage : node scripts/build_props.mjs <input.glb> [--out <chemin.js>] [--allow-test]"); process.exit(1); }
const inPath = path.resolve(positional[0]);
if (!fs.existsSync(inPath)) { console.error(`FAIL: GLB introuvable : ${inPath}`); process.exit(1); }

// ---- lecture de la table de distribution (clés → archétype + rotY) ----
const distPath = path.join(root, "interne/vitrine-props.json");
const dist = JSON.parse(fs.readFileSync(distPath, "utf8"));
const rows = {};
for (const r of dist.rows) rows[r.key] = { a: r.archetype, r: r.rotYdeg };
const usedArchs = [...new Set(Object.values(rows).map(v => v.a))].sort();

// ---- parsing GLB minimal (stdlib) : header, chunk JSON, chunk BIN ----
const bytes = fs.readFileSync(inPath);
const fails = [];
const fail = (msg) => { console.log("FAIL:", msg); fails.push(msg); };
const warn = (msg) => console.log("WARN:", msg);

if (bytes.length < 12 || bytes.readUInt32LE(0) !== 0x46546c67) fail("ce n'est pas un GLB (magic « glTF » absent)");
if (!fails.length && bytes.readUInt32LE(4) !== 2) fail(`version GLB = ${bytes.readUInt32LE(4)}, attendu 2`);
if (!fails.length && bytes.readUInt32LE(8) !== bytes.length) fail(`taille annoncée ${bytes.readUInt32LE(8)} != ${bytes.length} octets réels`);

let json = null, bin = null;
if (!fails.length) {
  let off = 12;
  while (off + 8 <= bytes.length) {
    const len = bytes.readUInt32LE(off);
    const type = bytes.readUInt32LE(off + 4);
    const body = bytes.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(body.toString("utf8"));       // « JSON »
    else if (type === 0x004e4942) bin = Buffer.from(body);                     // « BIN\0 »
    off += 8 + len;
  }
  if (!json) fail("chunk JSON introuvable");
  if (!bin) fail("chunk BIN introuvable");
}

// ---- accès bufferViews / accessors ----
const viewBytes = (bvIdx) => {
  const bv = json.bufferViews[bvIdx];
  return bin.subarray(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength);
};
const COMP = { 5121: ["UInt8", 1], 5122: ["Int16", 2], 5123: ["UInt16", 2], 5125: ["UInt32", 4], 5126: ["Float32", 4] };
const TYPE_N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function accessorValues(accIdx) {                                  // décoder un accessor en JS natif
  const acc = json.accessors[accIdx];
  const [Ctor, size] = COMP[acc.componentType];
  const n = TYPE_N[acc.type];
  const bv = json.bufferViews[acc.bufferView];
  const stride = bv.byteStride ?? size * n;
  const base = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const out = new Array(acc.count * n);
  for (let i = 0; i < acc.count * n; i++) {
    const o = base + Math.floor(i / n) * stride + (i % n) * size;
    out[i] = acc.componentType === 5126 ? view.getFloat32(o, true) : view["get" + Ctor](o, true);
  }
  return out;
}
function accessorMinMax(accIdx) {                                  // min/max : accessors d'abord, sinon recalcul
  const acc = json.accessors[accIdx];
  const n = TYPE_N[acc.type];
  if (acc.min && acc.max) return { min: acc.min, max: acc.max };
  warn(`accessor ${accIdx} sans min/max — recalcul depuis le BIN (lent mais correct)`);
  const v = accessorValues(accIdx);
  const min = new Array(n).fill(Infinity), max = new Array(n).fill(-Infinity);
  for (let i = 0; i < v.length; i++) { const c = i % n; if (v[i] < min[c]) min[c] = v[i]; if (v[i] > max[c]) max[c] = v[i]; }
  return { min, max };
}

// ---- agrégation par prop : un mesh = un nom prop_<archetype> (noms de node en priorité, cf. export Blender) ----
const props = new Map();                                           // name -> { tris, bboxMin, bboxMax, prims }
function addPrim(name, prim, meshIdx) {
  if (!props.has(name)) props.set(name, { tris: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], meshIdx });
  const p = props.get(name);
  if (prim.mode !== undefined && prim.mode !== 4) { warn(`${name} : primitif mode=${prim.mode} (non-TRIANGLES) ignoré du comptage de tris`); }
  else if (prim.indices !== undefined) {
    if (json.accessors[prim.indices].count % 3 !== 0) fail(`${name} : ${json.accessors[prim.indices].count} indices, pas un multiple de 3`);
    else p.tris += json.accessors[prim.indices].count / 3;
  }
  if (prim.attributes.POSITION === undefined) { fail(`${name} : primitif sans POSITION`); return; }
  const { min, max } = accessorMinMax(prim.attributes.POSITION);
  for (let c = 0; c < 3; c++) { p.min[c] = Math.min(p.min[c], min[c]); p.max[c] = Math.max(p.max[c], max[c]); }
}
if (json) {
  const meshNames = json.meshes.map((m, i) => (m.name !== undefined ? m.name : `mesh${i}`));
  const nameByMesh = [...meshNames];                               // nom de node prioritaire (objet Blender)
  for (const node of json.nodes ?? []) {
    if (node.mesh !== undefined && node.name) nameByMesh[node.mesh] = node.name;
  }
  json.meshes.forEach((mesh, i) => {
    if (!nameByMesh[i].startsWith("prop_")) { warn(`mesh surnuméraire ignoré (nom hors contrat) : « ${nameByMesh[i]} »`); return; }
    if (nameByMesh[i] !== meshNames[i] && mesh.name) warn(`mesh ${i} : nom du node « ${nameByMesh[i]} » retenu (le mesh s'appelait « ${mesh.name} »)`);
    for (const prim of mesh.primitives) addPrim(nameByMesh[i], prim, i);
  });
}

// ---- gates ----
if (!fails.length) {
  const want = Object.keys(TRI_RANGE).map(a => `prop_${a}`);
  const got = [...props.keys()];
  for (const n of want) if (!props.has(n)) fail(`mesh manquant : ${n} (la page instancie par nom — un prop absent n'apparaît jamais)`);
  for (const n of got) if (!want.includes(n)) warn(`mesh prop surnuméraire : ${n} (hors kit — instancié par erreur ?)`);

  for (const [name, p] of props) {
    const arch = name.replace(/^prop_/, "");
    if (!(arch in TRI_RANGE)) continue;                             // déjà signalé en WARN ci-dessus
    const d = p.max.map((v, c) => v - p.min[c]);
    const axes = ["x", "y", "z"];
    for (let c = 0; c < 3; c++) {
      if (d[c] > MAX_BBOX[axes[c]] + EPS) fail(`${name} : bbox ${d[0].toFixed(3)}×${d[1].toFixed(3)}×${d[2].toFixed(3)} m — axe ${axes[c]} > ${MAX_BBOX[axes[c]]} m (cookie cutter 0,56×0,48×0,40 Y-up)`);
    }
    if (!allowTest) {
      const [lo, hi] = TRI_RANGE[arch];
      if (p.tris < lo || p.tris > hi) fail(`${name} : ${p.tris} tris hors plage ${lo}–${hi} (BLENDER-PROPS-KIT.md)`);
    }
    console.log(`${name} : bbox ${d[0].toFixed(3)}×${d[1].toFixed(3)}×${d[2].toFixed(3)} m, ${p.tris} tris${allowTest && !(p.tris >= TRI_RANGE[arch][0] && p.tris <= TRI_RANGE[arch][1]) ? " (tris non gateés : --allow-test)" : ""}`);
  }

  // chaque archétype réellement servi à une vitrine doit exister dans le GLB
  for (const a of usedArchs) if (!props.has(`prop_${a}`)) fail(`vitrine-props.json sert « ${a} » mais le GLB n'a pas de mesh prop_${a}`);

  if (bytes.length > MAX_GLB_BYTES) fail(`GLB = ${bytes.length} octets > budget ${MAX_GLB_BYTES} octets (400 Ko)`);
}

if (fails.length) { console.log(`BUILD FAILS=${fails.length}`); process.exit(1); }

// ---- écriture du module de données (script classique, window.__VITRINE_PROPS) ----
const payload = {
  version: 1,
  generated: new Date().toISOString(),
  rows,
  glbBase64: bytes.toString("base64"),
};
const mod = `// props-musee.data.js — GÉNÉRÉ par scripts/build_props.mjs — ne pas éditer à la main.
// GLB des props de vitrines embarqué en base64 : chargeable en file:// (zéro fetch, zéro ESM).
// Consommé par frise/perspective-J-musee.html : window.__VITRINE_PROPS = {version, generated, rows, glbBase64}.
window.__VITRINE_PROPS = ${JSON.stringify(payload, null, 2)};
`;
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, mod);
console.log(`BUILD OK — ${props.size} props, ${Object.keys(rows).length} lignes de distribution${allowTest ? " (--allow-test : gates de tris sautées)" : ""}`);
console.log(`écrit : ${outPath} (${fs.statSync(outPath).size} octets, GLB ${bytes.length} o → base64)`);
