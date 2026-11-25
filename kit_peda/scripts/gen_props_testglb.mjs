// gen_props_testglb.mjs — GENERATEUR DE FIXTURE : un GLB de test sans Blender (node, zéro dépendance).
// Écrit 7 boxes nommées prop_<archetype> (les 7 clés du kit, cf. interne/BLENDER-PROPS-KIT.md),
// chacune sous l'enveloppe « cookie cutter » 0,56 × 0,40 × 0,48 m, min Y = 0 (pivot bas-centre).
// Les boxes sont volontairement hors plages de tris artistiques → valider avec build_props.mjs --allow-test.
// Le GLB est construit À LA MAIN (header 12 o + chunk JSON + chunk BIN, glTF 2.0 valide,
// positions en accessors VEC3 float32 avec min/max, indices uint16) — pas de three, pas de npm.
// Usage : node scripts/gen_props_testglb.mjs --out <chemin.glb>
import fs from "node:fs";
import path from "node:path";

// ---- CLI ----
const argv = process.argv.slice(2);
const outIdx = argv.indexOf("--out");
if (outIdx === -1 || !argv[outIdx + 1]) {
  console.error("FAIL: --out <chemin.glb> requis (fixture — jamais frise/ en production)");
  process.exit(1);
}
const outPath = path.resolve(argv[outIdx + 1]);

// ---- kit : les 7 archétypes exacts (mêmes clés que gen_vitrine_props.mjs / BLENDER-PROPS-KIT.md) ----
const ARCHES = ["docstack", "maproll", "radio", "lantern", "letter", "watch", "books"];
// Dimensions de fixture (demi-boîtes, m) : toutes bien sous 0,56 L × 0,40 P × 0,48 H (y = haut).
const HALVES = {
  docstack: [0.13, 0.025, 0.10], maproll: [0.13, 0.05, 0.04], radio: [0.11, 0.075, 0.05],
  lantern: [0.065, 0.055, 0.05], letter: [0.10, 0.0125, 0.06], watch: [0.035, 0.015, 0.03],
  books: [0.12, 0.065, 0.085],
};

// ---- cube 8 sommets / 12 triangles (topologie valide ; les normales sont plates — fixture) ----
// Sommet b = (xbit<<2)|(ybit<<1)|zbit ; faces découpées en 2 triangles chacune.
const CUBE_IDX = [
  4, 5, 7, 4, 7, 6,   // +x
  0, 2, 3, 0, 3, 1,   // -x
  2, 3, 7, 2, 7, 6,   // +y
  0, 4, 5, 0, 5, 1,   // -y
  1, 3, 7, 1, 7, 5,   // +z
  0, 4, 6, 0, 6, 2,   // -z
];

// ---- BIN : pour chaque prop, un accessor POSITION (8×3 float32) puis un accessor.indices (36 uint16) ----
const binParts = [];
const accessors = [];
const bufferViews = [];
let byteOffset = 0;

function pushView(buf, target) {
  bufferViews.push({ buffer: 0, byteOffset, byteLength: buf.length, ...(target ? { target } : {}) });
  binParts.push(buf);
  byteOffset += buf.length; // tailles construites multiples de 4 → alignement 4 o guaranteed
}

const meshes = [];
const nodes = [];
for (const arch of ARCHES) {
  const [hx, hy, hz] = HALVES[arch];
  // 8 sommets : x/z centrés sur 0, y de 0 à 2hy (pivot bas-centre, min Y = 0 comme un prop réel)
  const pos = new Float32Array(8 * 3);
  for (let b = 0; b < 8; b++) {
    const xb = (b >> 2) & 1, yb = (b >> 1) & 1, zb = b & 1;
    pos[b * 3 + 0] = xb ? hx : -hx;
    pos[b * 3 + 1] = yb ? 2 * hy : 0;
    pos[b * 3 + 2] = zb ? hz : -hz;
  }
  const idx = new Uint16Array(CUBE_IDX);

  const posView = bufferViews.length; pushView(Buffer.from(pos.buffer), 34962); // ARRAY_BUFFER
  const idxView = bufferViews.length; pushView(Buffer.from(idx.buffer), 34963); // ELEMENT_ARRAY_BUFFER

  const nPos = accessors.length;
  accessors.push({ bufferView: posView, componentType: 5126, count: 8, type: "VEC3",
    min: [-hx, 0, -hz], max: [hx, 2 * hy, hz] });                       // min/max obligatoires pour POSITION
  const nIdx = accessors.length;
  accessors.push({ bufferView: idxView, componentType: 5123, count: idx.length, type: "SCALAR",
    min: [0], max: [7] });

  meshes.push({ name: `prop_${arch}`, primitives: [{ attributes: { POSITION: nPos }, indices: nIdx, material: 0 }] });
  nodes.push({ mesh: meshes.length - 1, name: `prop_${arch}` });
}

const bin = Buffer.concat(binParts);
const gltf = {
  asset: { version: "2.0", generator: "gen_props_testglb.mjs (fixture sans Blender)" },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials: [{ name: "M_props_atlas", pbrMetallicRoughness: { baseColorFactor: [0.81, 0.76, 0.66, 1], metallicFactor: 0, roughnessFactor: 1 } }],
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};

// ---- assemblage GLB : header(12) + chunk JSON (bourré d'espaces, 4 o) + chunk BIN (bourré de 0, 4 o) ----
let jsonStr = JSON.stringify(gltf);
jsonStr += " ".repeat((4 - (jsonStr.length % 4)) % 4);
const jsonBuf = Buffer.from(jsonStr, "utf8");
const binPad = Buffer.alloc((4 - (bin.length % 4)) % 4);
const binBuf = Buffer.concat([bin, binPad]);

const total = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);   // magic « glTF »
header.writeUInt32LE(2, 4);            // version 2
header.writeUInt32LE(total, 8);
const jsonHead = Buffer.alloc(8);
jsonHead.writeUInt32LE(jsonBuf.length, 0); jsonHead.writeUInt32LE(0x4e4f534a, 4); // « JSON »
const binHead = Buffer.alloc(8);
binHead.writeUInt32LE(binBuf.length, 0);  binHead.writeUInt32LE(0x004e4942, 4);   // « BIN\0 »

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.concat([header, jsonHead, jsonBuf, binHead, binBuf]));
console.log(`FIXTURE OK — ${ARCHES.length} meshs prop_* écrits : ${outPath} (${total} octets)`);
