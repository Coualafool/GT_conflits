// verif_allees.mjs — vérification de la variante K « Les Quatre Allées » (couloirs parallèles + places-passerelles).
// Usage: repo root served on :8899 (node scripts/tars_serve.mjs), then from the repo root:
//   node scripts/verif_allees.mjs
// Self-contained: playwright must live in this repo's node_modules (scripts/tars_setup_runtime.ps1).
// S'appuie sur window.__allees (API de harnais de la page). Exits 0 si tout passe ; imprime un bloc PASS/FAIL.
import { createRequire } from "module";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
let chromium;
try { chromium = createRequire(import.meta.url)("playwright").chromium; }
catch { console.error("playwright absent du node_modules du repo — lancer scripts/tars_setup_runtime.ps1 d'abord"); process.exit(2); }

const ART = fileURLToPath(new URL("../artifacts/", import.meta.url));
mkdirSync(ART, { recursive: true });
const BASE = process.env.POC_BASE || "http://localhost:8899/kit_peda/frise";
const PAGE = BASE + "/perspective-K-allees.html";
const results = [];
function log(id, pass, evidence) { results.push((pass ? "PASS" : "FAIL") + "  " + id + " — " + evidence); }

const browser = await chromium.launch({ channel: "msedge", headless: true, args: (process.env.K_GL === "sw" ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : []) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));
const dismiss = () => page.evaluate(() => document.getElementById("welcome").classList.add("gone"));
const shot = async (name) => {
  await dismiss();
  await page.waitForTimeout(650); await page.screenshot({ path: ART + name + ".png", timeout: 90000 });
};

/* ---------- K0 : seuil Three.js — la scène vit sur le bundle vendorisé ---------- */
await page.goto(PAGE + (PAGE.includes("?") ? "&" : "?") + "nocache=" + Date.now(), { waitUntil: "load" });
await page.waitForTimeout(1300);
{
  const s = await page.evaluate(() => ({
    has: !!window.__allees && typeof window.__allees.focus === "function",
    rev: window.THREE ? window.THREE.REVISION : null,
    canvas: (() => { const c = document.querySelector("#stage canvas"); if (!c) return [0, 0];
      const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    fallback: (() => { const f = document.getElementById("fallback"); return f ? getComputedStyle(f).display : "ABSENT"; })(),
  }));
  log("(K0) seuil Three.js : scène vivante sur le bundle vendorisé (REVISION 187, zéro CDN)",
    s.has && s.rev === "187" && s.fallback === "none" && s.canvas[0] >= 1400 && s.canvas[1] >= 700,
    `api=${s.has} rev=${s.rev} toile=${s.canvas.join("×")} fallback=${s.fallback}`);
  if (!s.has) {   // pas d'API = module tué par une exception : on s'arrête là, la suite n'a pas de sens
    await browser.close();
    console.log("\n===== RÉSULTATS verif_allees ====="); results.forEach((r) => console.log(r));
    console.log("--- ARRÊT : window.__allees absente (exception dans le module page)"); process.exit(1);
  }
  await shot("K-default");
  // preuve visuelle : une capture par allée depuis l'entrée (l'œil humain juge ce que la sim ne voit pas)
  for (let ai = 0; ai < 4; ai++) {
    await page.evaluate((ai) => {
      const A = window.__allees, al = A.alleys()[ai];
      A.snapTo({ x: 1.4, z: al.z, yaw: -Math.PI / 2, pitch: -0.06 }, true);
    }, ai);
    await page.waitForTimeout(500);
    await dismiss();
    await page.waitForTimeout(450);
    await page.screenshot({ path: ART + "K-alley-" + ai + ".png", timeout: 90000 });
  }
  // et une lecture d'affiche de près (le texte est-il coupé ? l'humain répond sur la capture)
  await page.evaluate(() => {
    const A = window.__allees, p = A.posters().find((q) => q.lv === 2 && !q.niche);
    A.focus("p" + p.i + "-" + p.ai + "-" + p.face + "-" + p.seg, true);
  });
  await page.waitForTimeout(600);
  await dismiss();
  await page.waitForTimeout(450);
  await page.screenshot({ path: ART + "K-poster-read.png", timeout: 90000 });
  // la place avec son groupe de niche le plus fourni (la grille se lit-elle ?)
  await page.evaluate(() => {
    const A = window.__allees, cs = A.curtains();
    const counts = {}; A.posters().filter((p) => p.niche).forEach((p) => { counts[p.plaza] = (counts[p.plaza] || 0) + 1; });
    const pj = +Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
    A.teleportPlaza(pj);
  });
  await page.waitForTimeout(700);
  await dismiss();
  await page.waitForTimeout(450);
  await page.screenshot({ path: ART + "K-niche.png", timeout: 90000 });
}

/* ---------- K1 : intégrité du corpus — tout dérivé d'EV, rien de codé en dur ---------- */
{
  const g = await page.evaluate(() => {
    const c = window.__allees.counts();
    const totalWall = Object.values(c.perBrin).reduce((s, b) => s + b.wallPosters, 0);
    const totalNiche = Object.values(c.perBrin).reduce((s, b) => s + b.nichePosters, 0);
    return { c, totalWall, totalNiche,
      nCases: window.__allees.cases().length, nPlazas: window.__allees.plazas().length };
  });
  const c = g.c;
  log("(K1) une seule source : chaque fait a exactement un poste (mur OU niche), total = corpus",
    g.totalWall + g.totalNiche === c.corpus && c.corpus === 79,
    `murs=${g.totalWall} niches=${g.totalNiche} corpus=${c.corpus}`);
  const perBrinOk = Object.values(c.perBrin).every((b) => b.wallPosters + b.nichePosters === b.n);
  log("(K1b) par allée : posters = faits de la piste, sans exception", perBrinOk,
    Object.keys(c.perBrin).map((k) => `${k}:${c.perBrin[k].wallPosters}+${c.perBrin[k].nichePosters}/${c.perBrin[k].n}`).join(" "));
  log("(K1c) chaque place a SA vitrine (un seul fait à quatre voix)", g.nCases === g.nPlazas && g.nPlazas === 7,
    `${g.nCases} vitrines / ${g.nPlazas} places`);
}

/* ---------- K2 : géométrie invariante (revérifiée côté navigateur, pas que dans la sim) ---------- */
{
  const r = await page.evaluate(() => {
    const A = window.__allees, G = A.geo, bad = [];
    const ps = A.posters(), cs = A.curtains(), pl = A.plazas(), sg = A.segs(), al = A.alleys();
    if (pl.length !== 7) bad.push("places=" + pl.length);
    if (sg.length !== 8) bad.push("segments=" + sg.length);
    for (let j = 0; j + 1 < sg.length; j++) if (sg[j + 1].x0 <= sg[j].x0) bad.push("x non monotone en segment " + j);
    // échelle uniforme DANS une même bande (les places sont des pauses temporelles voulues)
    const d1 = A.xOf(1962) - A.xOf(1952), d2 = A.xOf(2014) - A.xOf(2004);
    if (Math.abs(d1 - d2) > 1e-6) bad.push("échelle temporelle non uniforme dans les bandes");
    for (const p of ps) {
      if (p.niche) {
        const pz = pl[p.plaza];
        if (!pz) { bad.push("niche sans place i=" + p.i); continue; }
        // niche = œuvre pendue dans l'embrasure de la porte d'allée : à plat contre le mur d'entrée,
        // dans la largeur de porte (|z − axe| ≤ PDH). Vérifié face au rayon réel en K5.
        if (p.x < pz.x0 + 0.05) bad.push("niche en deçà du mur d'entrée i=" + p.i);
        if (Math.abs(p.z - al[p.ai].z) > G.PDH) bad.push("niche hors embrasure de porte i=" + p.i);
      } else {
        const s = sg[p.seg];
        const zWall = al[p.ai].z + (p.face === "i" ? G.ALLEYW / 2 - 0.12 : -(G.ALLEYW / 2 - 0.12));
        if (Math.abs(p.z - zWall) > 0.02) bad.push("affiche décollée i=" + p.i);
        if (p.x < s.x0 - 0.01 || p.x > s.x1 + 0.01) bad.push("affiche hors segment i=" + p.i);
      }
    }
    for (const cur of cs) {
      const pz = pl[cur.plaza];
      if (Math.abs(cur.z - al[cur.ai].z) > 0.03) bad.push("rideau hors axe de porte A" + cur.ai);
      if (Math.abs(cur.x - (A.nicheXabs ? A.nicheXabs(cur.plaza, cur.ai) + 0.11 : NaN)) > 0.03) bad.push("rideau décollé du mur A" + cur.ai);
    }
    for (const pz of pl) for (const n of pz.niches) {
      const grp = ps.filter((p) => p.niche && p.plaza === pz.j && p.ai === n.ai);
      for (const g of grp) if (g.x - g.w / 2 < n.x - n.U - 0.02 || g.x + g.w / 2 > n.x + n.U + 0.02) bad.push("groupe hors créneau i=" + g.i);
      for (const c of cs.filter((q) => q.plaza === pz.j && q.ai === n.ai)) if (c.w / 2 > n.U + 0.02) bad.push("rideau hors créneau P" + pz.j + "A" + n.ai);
      const nc = ps.filter((p) => p.niche && p.plaza === pz.j && p.ai === n.ai).length;
      const cc = cs.filter((q) => q.plaza === pz.j && q.ai === n.ai).length;
      if (n.facts.length ? (!nc || cc) : (!cc || nc)) bad.push("niche muette/parlante incohérente P" + pz.j + "A" + n.ai);
    }
    return { bad, nPosters: ps.length, nCurtains: cs.length };
  });
  log("(K2) géométrie adossée : zéro œuvre décollée, décrochée du créneau, niche muette/parlante incohérente",
    r.bad.length === 0, r.bad.slice(0, 4).join(" | ") || `${r.nPosters} affiches, ${r.nCurtains} rideaux — tous posés`);
}

/* ---------- K3 : marche — chaque allée mène du seuil à la dernière place, sans mur ---------- */
{
  const bad = await page.evaluate(() => {
    const A = window.__allees, al = A.alleys(), bad = [];
    for (const a of al) {
      let prev = null;
      for (let x = 0.2; x <= A.TLEN - 0.2; x += 0.1) {
        const w = A.walkable(x, a.z);
        if (prev !== null && w !== prev) bad.push(`A${a.ai} rupture à x=${x.toFixed(1)}`);
        prev = w;
      }
      if (prev === false) bad.push(`A${a.ai} bute avant la fin`);
      if (!A.walkable(0.2, a.z)) bad.push(`A${a.ai} pas praticable au seuil`);
    }
    for (let x = 0.5; x < A.TLEN; x += 0.5) {
      const zMid = (al[0].z + al[1].z) / 2;
      if (A.walkable(x, zMid)) bad.push(`traversée fantôme de cloison à x=${x}`);
    }
    return bad;
  });
  log("(K3) marche continue : les 4 allées vont du seuil à la fin, places-passerelles incluses, zéro rupture ni traversée fantôme",
    bad.length === 0, bad.slice(0, 3).join(" | ") || "4 allées × ~180 m échantillonnées à 10 cm");
}

/* ---------- K4 : les postes sont tous atteignables et cadrables ---------- */
{
  const r = await page.evaluate(() => {
    const A = window.__allees;
    const st = A.stations();
    const kinds = {}; st.forEach((s) => { kinds[s.kind] = (kinds[s.kind] || 0) + 1; });
    let ordOk = true; for (let q = 1; q < st.length; q++) if (st[q].order <= st[q - 1].order) ordOk = false;
    // vues de niche : le sol de l embrasure (bande de porte) n est pas la loi de marche
    // générale — on exige qu elles restent dans l embrasure (|Δz| ≤ 1 m de l œuvre) et sur
    // la portée x de la place ; la visée réelle est prouvée par K5 au rayon central.
    const pl0 = A.plazas();
    const nicheViewOk = (s) => {
      const pz = pl0[s.plaza]; if (!pz) return false;
      if (Math.abs(s.view.z - s.z) > 1.0) return false;
      return s.view.x >= pz.x0 - 0.05 && s.view.x <= pz.x1 + 0.05;
    };
    const badView = st.filter((s) => {
      if (s.kind === "curtain" || /^np/.test(s.key)) return !nicheViewOk(s);
      return !A.walkable(s.view.x, s.view.z);
    }).length;
    const sample = [st[0], st[Math.floor(st.length / 2)], st[st.length - 1]];
    let focusOk = true; for (const s of sample) if (!A.focus(s.key, true)) focusOk = false;
    return { n: st.length, kinds, ordOk, badView, focusOk };
  });
  log("(K4) stations : TOUS les viewpoints praticables, ordre-temps strict",
    r.ordOk && r.badView === 0, `${r.n} stations ${JSON.stringify(r.kinds)} vuesHorsSol=${r.badView}`);
  log("(K4b) focus fonctionne (début / milieu / fin)", r.focusOk, String(r.focusOk));
  {
    const stamp = await page.evaluate(() => {
      const A = window.__allees;
      const pv = A.stations().find((s) => s.key === "pv0");
      return { pvPitch: pv && pv.view ? +pv.view.pitch.toFixed(3) : null, oldFormula: document.documentElement.innerHTML.includes("EYE-(s.y") };
    });
    console.log("STAMP page vue pv0:", JSON.stringify(stamp));
  }
}

/* ---------- K5 : chaque type de poste est cadré depuis son viewpoint (rayon central) ---------- */
{
  const r = await page.evaluate(async () => {
    const A = window.__allees;
    const ra = (ms) => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
    const pick = {};
    for (const kind of ["poster", "curtain", "case"]) {
      const st = A.stations().filter((s) => s.kind === kind).slice(0, 3);
      let ok = 0; const miss = [];
      for (const s of st) {
        A.focus(s.key, true);
        // le glide caméra (~900 ms) : on attend qu elle soit POSÉE avant de tirer le rayon
        for (let w = 0; w < 24; w++) {
          const c0 = A.state();
          if (Math.hypot(c0.x - s.view.x, c0.z - s.view.z) < 0.06 && Math.abs(c0.pitch - s.view.pitch) < 0.02) break;
          await new Promise((res) => setTimeout(res, 80));
        }
        await new Promise((res) => setTimeout(res, 120));
        let hit = null;
        for (let t = 0; t < 4 && !(hit && hit.key === s.key); t++) { hit = A.forwardHit ? A.forwardHit() : A.rayHit(0, 0); if (!(hit && hit.key === s.key)) await new Promise((res) => setTimeout(res, 150)); }
        const stt = A.state();
        if (hit && hit.key === s.key) ok++;
        else {
          const it = A.stations().find((q) => q.key === s.key);
          const straight = A.probeRay(stt.x, 1.62, stt.z, it.x - stt.x, 0, it.z - stt.z, 12);
          miss.push(s.key + "→" + JSON.stringify(hit) + "@cam" + stt.x.toFixed(1) + "," + stt.z.toFixed(1) + " p" + (stt.pitch/Math.PI).toFixed(3) + " obj(" + it.x.toFixed(1) + "," + it.z.toFixed(1) + ") droit:" + JSON.stringify(straight));
        }
      }
      pick[kind] = { tried: st.length, ok, miss };
    }
    return pick;
  });
  for (const k2 of ["nc0-0", "pv0"]) {          // preuve visuelle directe du cadrage niche / vitrine
    await page.evaluate((k) => window.__allees.focus(k, true), k2);
    await page.waitForTimeout(500);
    await page.screenshot({ path: ART + "K5-" + k2 + ".png", timeout: 90000 });
  }
  const allOk = ["poster", "curtain", "case"].every((k) => r[k].ok === r[k].tried);
  log("(K5) chaque type de poste est cadré depuis son viewpoint (affiche, rideau, vitrine)",
    allOk, ["poster", "curtain", "case"].map((k) => `${k}:${r[k].ok}/${r[k].tried}${r[k].miss.length ? " ratés=" + r[k].miss.join(",") : ""}`).join(" "));
}

/* ---------- K5b : face aux œuvres — de bout en bout, aucune affiche ne se voit par le dos ---------- */
{
  const r = await page.evaluate(async () => {
    const A = window.__allees;
    const bad = [];
    const keys = A.stations().filter(s => s.kind === "poster" && (s.key.indexOf("-0-") > 0 || s.key.indexOf("-3-") > 0));
    const sample = keys.filter((s, idx) => idx % 4 === 0).slice(0, 10);
    for (const s of sample) {
      A.focus(s.key, true);
      for (let w = 0; w < 24; w++) {
        const c0 = A.state();
        if (Math.hypot(c0.x - s.view.x, c0.z - s.view.z) < 0.06 && Math.abs(c0.pitch - s.view.pitch) < 0.02) break;
        await new Promise((res) => setTimeout(res, 80));
      }
      const hit = A.forwardHit();
      const c1 = A.state();
      if (!(hit && hit.key === s.key)) bad.push(s.key + "→" + (hit ? hit.key || hit.kind : "miss") + "@cam" + c1.x.toFixed(1) + "," + c1.z.toFixed(1) + " p" + (c1.pitch/Math.PI).toFixed(2) + " visé " + s.view.x.toFixed(1) + "," + s.view.z.toFixed(1));
    }
    return { n: sample.length, bad };
  });
  log("(K5b) face aux œuvres : le rayon central touche CHAQUE poste échantillonné, de bout en bout — zéro dos",
    r.bad.length === 0, r.bad.length ? r.bad.slice(0, 6).join(" ") : r.n + " postes vus de face (rayon réel)");
}

/* ---------- K6 : panneau — focus affiche → fiche ouverte avec regard croisé, Échap referme ---------- */
{
  const key = await page.evaluate(() => {
    const A = window.__allees;
    const s = A.stations().find((q) => q.kind === "poster" && !/np/.test(q.key));
    A.focus(s.key, true);
    return s.key;
  });
  await page.waitForTimeout(400);
  const p0 = await page.evaluate(() => ({ open: window.__allees.panel().open, key: window.__allees.panel().key,
    croise: /Autour du fait/.test(document.getElementById("panel").textContent) }));
  await shot("K-poster-focus");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const p1 = await page.evaluate(() => window.__allees.panel().open);
  log("(K6) focus affiche → fiche ouverte (avec regard croisé), Échap la referme",
    p0.open && p0.key === key && p1 === false, `ouvert=${p0.open} clé=${p0.key} croisé=${p0.croise} après-échap=${p1}`);
}

/* ---------- K7 : entrées profondes — ?pl=j téléporte à la place · ?ev=i cadre le poste du fait ---------- */
{
  await page.goto(PAGE + "?pl=2&nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1200); await dismiss();
  const s2 = await page.evaluate(() => {
    const st = window.__allees.state();
    const pj = window.__allees.plazas().findIndex((p) => st.x >= p.x0 - 0.4 && st.x <= p.x1 + 0.4);
    return { x: st.x, pj };
  });
  log("(K7) ?pl=2 — entrée profonde pose le visiteur sur la place 2", s2.pj === 2, `x=${s2.x.toFixed(1)} place=${s2.pj}`);
  await shot("K-place-2");
  await page.goto(PAGE + "?ev=33&nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1200); await dismiss();
  const e33 = await page.evaluate(() => {
    const pn = window.__allees.panel();
    const st = window.__allees.state();
    const q = window.__allees.posters().find((p) => p.i === 33);
    const al = window.__allees.alleys()[q.ai].z;          // le visiteur est sur l axe d allée, pas au plan du mur
    return { key: pn.key, open: pn.open, near: Math.hypot(st.x - q.x, st.z - al) };
  });
  log("(K7b) ?ev=33 — entrée profonde cadre le poste du fait 33 (fiche ouverte)",
    e33.open && /^(np)?33-/.test(e33.key || "") && e33.near < 5, `clé=${e33.key} ouvert=${e33.open} dist=${e33.near.toFixed(1)}m`);
}

/* ---------- K8 : accessoires optionnels — le kit props se dégrade en douceur ---------- */
{
  const pr = await page.evaluate(() => window.__allees.props());
  log("(K8) props optionnels : zéro prop dans les hitables tant que rien n'est posé (dégradation douce)",
    pr.inHitables === (pr.placed || 0),
    `loaded=${pr.loaded} placés=${pr.placed} hitables=${pr.inHitables} erreur=${pr.error || "none"}`);
}

/* ---------- K9 : zéro erreur de page sur toute la batterie ---------- */
log("(K9) zéro pageerror sur toute la batterie", pageErrors.length === 0, pageErrors.slice(0, 2).join(" | ") || "aucune");

await browser.close();
console.log("\n===== RÉSULTATS verif_allees =====");
results.forEach((r) => console.log(r));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`--- ${results.length - fails} PASS / ${fails} FAIL`);
process.exit(fails ? 1 : 0);
