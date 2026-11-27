// verif_chapelet.mjs — vérification de la variante L « Le Chapelet du temps » (4 couloirs de salles, 9 carrefours dorés).
// Usage : serveur du repo sur un port, puis depuis la racine du repo :
//   node scripts/verif_chapelet.mjs        (POC_BASE=http://localhost:8911/kit_peda/frise si autre port)
// S'appuie sur window.__chapelet (API de harnais de la page). Exits 0 si tout passe.
import { createRequire } from "module";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
let chromium;
try { chromium = createRequire(import.meta.url)("playwright").chromium; }
catch { console.error("playwright absent du node_modules du repo — lancer scripts/tars_setup_runtime.ps1 d'abord"); process.exit(2); }

const ART = fileURLToPath(new URL("../artifacts/", import.meta.url));
mkdirSync(ART, { recursive: true });
const BASE = process.env.POC_BASE || "http://localhost:8911/kit_peda/frise";
const PAGE = BASE + "/perspective-L-chapelet.html";
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

/* ---------- L0 : seuil Three.js — la scène vit sur le bundle vendorisé ---------- */
await page.goto(PAGE + "?nocache=" + Date.now(), { waitUntil: "load" });
await page.waitForTimeout(1500);
{
  const s = await page.evaluate(() => ({
    has: !!window.__chapelet && typeof window.__chapelet.focus === "function",
    rev: window.THREE ? window.THREE.REVISION : null,
    canvas: (() => { const c = document.querySelector("#stage canvas"); if (!c) return [0, 0];
      const r = c.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
    fallback: (() => { const f = document.getElementById("fallback"); return f ? getComputedStyle(f).display : "ABSENT"; })(),
  }));
  log("(L0) seuil Three.js : scène vivante sur le bundle vendorisé (REVISION 187, zéro CDN)",
    s.has && s.rev === "187" && s.fallback === "none" && s.canvas[0] >= 1400 && s.canvas[1] >= 700,
    `api=${s.has} rev=${s.rev} toile=${s.canvas.join("×")} fallback=${s.fallback}`);
  if (!s.has) {
    await browser.close();
    console.log("\n===== RÉSULTATS verif_chapelet ====="); results.forEach((r) => console.log(r));
    console.log("--- ARRÊT : window.__chapelet absente (exception dans le module page)"); process.exit(1);
  }
  await shot("L-default");
}

/* ---------- L1 : inventaires — chaque fait a sa salle ou sa stèle, nulle part ailleurs ---------- */
{
  const inv = await page.evaluate(() => {
    const C = window.__chapelet, c = C.counts();
    const posts = C.posters();
    const once = {};
    posts.forEach((p) => { once[p.i] = (once[p.i] || 0) + 1; });
    const expSC = c.steleCurtExpected;
    return { corpus: c.corpus, posters: posts.length, roomPosters: posts.filter((p) => !p.mode || p.mode === "room").length,
      stelePosters: posts.filter((p) => p.mode === "stele").length, steleCurtains: c.steleCurtains,
      conduits: c.conduits, momentsIn: c.momentsIn, cases: c.cases === undefined ? C.cases().length : 0,
      hubs: C.hubs().length, segs: C.segs().length, expSC: expSC,
      unique: Object.keys(once).length, dup: Object.values(once).filter((n) => n > 1).length,
      stations: C.stations().length };
  });
  const cov = inv.unique === inv.corpus && inv.dup === 0 && inv.posters === inv.corpus;
  log("(L1) un fait = exactement une affiche (salle ou stèle) ; carrefours et segments complets",
    cov && inv.hubs === 9 && inv.segs === 8 && inv.steleCurtains === inv.expSC && inv.cases === 7,
    `corpus=${inv.corpus} affiches=${inv.posters} (${inv.roomPosters} salles + ${inv.stelePosters} stèles) rideaux=${inv.steleCurtains} conduits=${inv.conduits} vitrines=${inv.cases} hubs=${inv.hubs} segments=${inv.segs} dup=${inv.dup}`);
}

/* ---------- L2 : marche continue — chaque couloir va du premier carrefour au dernier, portes comprises ---------- */
{
  const walk = await page.evaluate(() => {
    const C = window.__chapelet, H = C.hubs(), S = C.segs(), bad = [];
    C.cols().forEach((col) => {
      for (let h = 0; h < H.length - 1; h++) {
        const sg = S[h];
        for (let z = sg.zTop; z >= sg.zBot; z -= 0.5)
          if (!C.walkable(col.x, z) && !C.walkable(col.x, z + 0.3) && !C.walkable(col.x, z - 0.3)) bad.push(col.k + "@" + z.toFixed(1));
      }
    });
    const hallBad = H.filter((hu) => !C.walkable(0, (hu.z0 + hu.z1) / 2)).map((hu) => hu.h);
    const blockBad = C.blockers().filter((b) => C.walkable((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2)).length;
    return { bad: bad.slice(0, 8), n: bad.length, hallBad, blockBad };
  });
  log("(L2) marche continue : les 4 couloirs descendent de carrefour en carrefour, halls et portes inclus, zéro mur fantôme",
    walk.n === 0 && walk.hallBad.length === 0 && walk.blockBad === 0,
    `ruptures=${walk.n} [${walk.bad.join(",")}] halls-intraversables=${walk.hallBad.length} stèles-traversables=${walk.blockBad}`);
}

/* ---------- L3 : chaque type de poste est cadré depuis son viewpoint (rayon central) ---------- */
{
  const res = await page.evaluate(async () => {
    const C = window.__chapelet, out = { fail: [], tried: 0 };
    const st = C.stations();
    const kinds = {};
    st.forEach((s) => { const k = s.kind + "/" + (s.mode || "-"); (kinds[k] = kinds[k] || []).push(s); });
    for (const k2 of Object.keys(kinds)) {
      const list = kinds[k2];
      const step = Math.max(1, Math.floor(list.length / 8));
      for (let q = 0; q < list.length; q += step) {
        const s = list[q]; out.tried++;
        C.focus(s.key, true);
        let hit = null;
        for (let t = 0; t < 6 && !(hit && hit.key === s.key); t++) { hit = C.forwardHit(); if (!(hit && hit.key === s.key)) await new Promise((r) => setTimeout(r, 150)); }
        if (!(hit && hit.key === s.key)) out.fail.push(s.key + "→" + (hit && hit.key ? hit.key : "miss"));
        C.panel().open && (() => { const p = document.querySelector("#panel .x"); if (p) p.click(); })();
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    return out;
  });
  log("(L3) chaque type de poste est cadré depuis son viewpoint — le rayon central touche l'œuvre visée",
    res.fail.length === 0, `échantillonnés=${res.tried} ratés=${res.fail.length} [${res.fail.slice(0, 6).join(", ")}]`);
}

/* ---------- L4 : panneau ouvert/fermé + regard croisé + retour à l'index ---------- */
{
  const p = await page.evaluate(async () => {
    const C = window.__chapelet;
    const rp = C.stations().find((s) => s.kind === "poster" && s.mode === "room");
    C.focus(rp.key, true);
    await new Promise((r) => setTimeout(r, 250));
    const a = C.panel();
    const back = a.backHref;
    const croise = !!document.querySelector("#panel .voix");
    document.querySelector("#panel .x").click();
    const b = C.panel();
    const cv = C.stations().find((s) => s.kind === "case");
    C.focus(cv.key, true);
    await new Promise((r) => setTimeout(r, 250));
    const justifie = document.querySelector("#panel").textContent.includes("Pourquoi ce carrefour");
    document.querySelector("#panel .x").click();
    return { openedKey: a.key, wanted: rp.key, closed: !b.open, back, croise, justifie };
  });
  log("(L4) panneau : ouvre la bonne fiche, regard croisé, vitrine justifiée, ferme, retour à l'index",
    p.openedKey === p.wanted && p.closed && p.back === "index-comparatif.html" && p.croise && p.justifie,
    `cle=${p.openedKey} ferme=${p.closed} retour=${p.back} croise=${p.croise} justifie=${p.justifie}`);
  await shot("L-after-panels");
}

/* ---------- L5 : entrées profondes ?hub= et ?ev= ---------- */
{
  await page.goto(PAGE + "?hub=3&nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const h3 = await page.evaluate(() => { const s = window.__chapelet.state(); return { pos: s.pos, z: s.z }; });
  const hubOk = h3.pos && h3.pos.kind === "hub" && h3.pos.hub === 3;
  const evTarget = await page.evaluate(() => {
    const C = window.__chapelet;
    const rp = C.stations().find((s) => s.kind === "poster" && s.mode === "room");
    const sp = C.stations().find((s) => s.kind === "poster" && s.mode === "stele");
    return { rp: rp.i, rpKey: rp.key, sp: sp.i, spKey: sp.key };
  });
  await page.goto(PAGE + "?ev=" + evTarget.rp + "&nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const d1 = await page.evaluate(() => window.__chapelet.panel());
  await shot("L-deep-room");
  await page.goto(PAGE + "?ev=" + evTarget.sp + "&nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const d2 = await page.evaluate(() => window.__chapelet.panel());
  log("(L5) entrées profondes : ?hub=3 au carrefour, ?ev= en salle et sur stèle — panneau à la bonne clé",
    hubOk && d1.open && d1.key === evTarget.rpKey && d2.open && d2.key === evTarget.spKey,
    `hub3=${hubOk} salle=${d1.key}/${evTarget.rpKey} stele=${d2.key}/${evTarget.spKey}`);
}

/* ---------- L8 : pas latéraux ZQSD — D à droite, Q à gauche, Z vers l'avant, mesurés en marche réelle ----------
   Le bug signalé par l'utilisateur (2026-11-27 : « je presse D, je vais à gauche ») passait au travers
   de TOUTES les gates : aucune ne marchait vraiment. Cette gate mesure le déplacement sous verrou souris,
   la loi étant évaluée contre le yaw mesuré (pas d'axe codé en dur) — elle REJETTE le vecteur inversé. */
{
  await dismiss();
  await page.mouse.click(720, 450);   // geste utilisateur vérifié -> verrou souris sur la toile
  let lk = false;
  for (let i = 0; i < 25 && !lk; i++) { await page.waitForTimeout(100); lk = await page.evaluate(() => !!window.__chapelet.state().locked); }
  let wmsg = "verrou souris indisponible sur ce poste — direction du pas NON mesurée";
  if (lk) {
    wmsg = await page.evaluate(async () => {
      const C = window.__chapelet;
      C.closePanel()   // la batterie laisse des fiches ouvertes (deep links) : step() exige panneau fermé
      await new Promise((r) => setTimeout(r, 150));
      // LE SPOT ET LE YAW SONT CHERCHÉS, PAS SUPPOSÉS — walkable() est pur, on scanne avant de bouger
      // la caméra (leçon TARS 2026-11-27 : le spot « évident » du carrefour plaçait le cap dans un mur).
      const spots = C.hubs().map((hu) => ({ x: 0, z: (hu.z0 + hu.z1) / 2 }));
      let YAW = null, SP = null;
      const ouvert = (sp, y) => {
        const F = [-Math.sin(y), -Math.cos(y)], R = [Math.cos(y), -Math.sin(y)];
        return C.walkable(sp.x + R[0] * 0.5, sp.z + R[1] * 0.5) && C.walkable(sp.x - R[0] * 0.5, sp.z - R[1] * 0.5) &&
               C.walkable(sp.x + F[0] * 0.5, sp.z + F[1] * 0.5);
      };
      scan: for (let pass = 0; pass < 2 && YAW === null; pass++)
        for (const sp of spots) for (let i = pass === 0 ? 1 : 0; i < 16; i++) {
          const y = i * Math.PI / 8;
          if (ouvert(sp, y)) { YAW = y; SP = sp; break scan; }
        }
      if (YAW === null) { document.exitPointerLock(); return "ok=false AUCUN SPOT OUVERT (droite+gauche+avant) trouvé"; }
      // sonde de vie de la boucle rAF : un snapTo glissé doit se terminer de lui-même.
      C.snapTo({ x: SP.x, z: SP.z, yaw: YAW, pitch: 0 }, false);
      await new Promise((r) => setTimeout(r, 800));
      const rafAlive = !C.state().gliding;
      // PASSER LES TOUCHES piloté par les IMAGES : on maintient la touche jusqu'à ce que la position
      // ait bougé (le rendu SwiftShader tourne parfois à ~1 image/s — une fenêtre de temps fixe
      // ne prenait 0 image et mesurait 0,00 m, ce n'était PAS le bug de direction).
      const go = async (k) => {
        C.snapTo({ x: SP.x, z: SP.z, yaw: YAW, pitch: 0 }, true);
        await new Promise((r) => setTimeout(r, 120));
        const a = C.state();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: k }));
        await new Promise((r) => setTimeout(r, 250));
        const m0 = C.state();
        const dbg = "kd=" + !!(C.keys && C.keys[k]) + " panel=" + m0.panel + " lock=" + m0.locked + " glide=" + m0.gliding +
          " walkR=" + C.walkable(a.x + Math.cos(a.yaw) * 0.5, a.z - Math.sin(a.yaw) * 0.5);
        let dx = 0, dz = 0, tries = 0;
        while (tries < 120) {
          tries++;
          await new Promise((r) => setTimeout(r, 100));
          const b = C.state();
          dx = b.x - a.x; dz = b.z - a.z;
          if (Math.hypot(dx, dz) >= 0.35) break;
        }
        document.dispatchEvent(new KeyboardEvent("keyup", { key: k }));
        await new Promise((r) => setTimeout(r, 120));
        const b = C.state();
        const fdx = b.x - a.x, fdz = b.z - a.z, y = b.yaw;
        return { dist: Math.hypot(fdx, fdz), right: fdx * Math.cos(y) - fdz * Math.sin(y), fwd: -fdx * Math.sin(y) - fdz * Math.cos(y), dbg };
      };
      const d = await go("d"), q = await go("q"), z = await go("z");
      document.exitPointerLock();
      const ok = rafAlive && d.dist > 0.3 && q.dist > 0.3 && z.dist > 0.3 && d.right > 0.2 && q.right < -0.2 && z.fwd > 0.2;
      return `ok=${ok} raf=${rafAlive ? "vivant" : "MORTE"} D[${d.dbg}] Q[${q.dbg}] Z[${z.dbg}] ` +
        `D->droite=${d.right.toFixed(2)}m Q->gauche=${q.right.toFixed(2)}m Z->avant=${z.fwd.toFixed(2)}m pas=${d.dist.toFixed(1)}/${q.dist.toFixed(1)}/${z.dist.toFixed(1)}m`;
    });
  }
  await page.waitForTimeout(300);
  log("(L8) pas latéraux ZQSD mesurés en marche réelle : D va à droite, Q à gauche, Z vers l'avant (yaw oblique)",
    wmsg.startsWith("ok=true"), wmsg);
}

/* ---------- L9 : balayage fin de chaîne — aucune bande morte devant une porte ----------
   Leçon 2026-11-27 : l'union de rectangles marchait AU-DESUS des portes mais le colliseur
   laissait la trousse du mur (0,30 m) morte dans chaque ouverture — 208 bandes invisibles,
   l'utilisateur butait devant chaque seuil. Les gates à tolérance (L2, ±0,3 m) enjambaient
   exactement ces bandes : une continuité vérifiée au pas de 0,5 m ne prouve rien au pas de 5 cm. */
{
  const sweep = await page.evaluate(() => {
    const C = window.__chapelet, hub = C.hubs(), bad = [];
    C.cols().forEach((col) => {
      let dead = null;
      for (let z = -0.2; z >= C.ZMIN; z -= 0.05) {
        const w = C.walkable(col.x, z);
        if (!w && dead === null) dead = z;
        if ((w || z <= C.ZMIN) && dead !== null) {
          const a = dead, b = z; dead = null;
          const width = a - b;
          if (width > 0.4) return true;                       // obstacle visible (stèle) : on contourne
          if (a > -0.3 || b < C.ZMIN + 0.5) return true;      // murs d'entrée et de bout du temps
          bad.push(col.k + " " + a.toFixed(2) + "→" + b.toFixed(2) + " (" + width.toFixed(2) + " m)");
        }
      }
      return true;
    });
    return bad;
  });
  log("(L9) chaîne marchable au pas de 5 cm : aucune bande morte devant une porte (couloir→salle→carrefour)",
    sweep.length === 0, sweep.length ? sweep.slice(0, 6).join(" ; ") : "bandes=0 sur les 4 colonnes");
}

/* ---------- L6 : captures humaines — un hall avec ses stèles, une salle avec son affiche ---------- */
{
  await page.goto(PAGE + "?nocache=" + Date.now(), { waitUntil: "load" });
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.__chapelet.teleportHub(3));
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const C = window.__chapelet;
    const hu = C.hubs()[3];
    C.snapTo({ x: -4, z: hu.z0 - 1.6, yaw: 0, pitch: -0.08 }, true);   // debout dans le hall, la stèle palestinienne en face à 1,5 m
  });
  await shot("L-hub3");
  await page.evaluate(() => {
    const C = window.__chapelet;
    const p = C.posters().filter((q) => q.mode === "room")[8];
    C.snapTo({ x: p.x, z: p.z + 2.2, yaw: 0, pitch: -0.05 }, true);   // dans la salle, face à l'affiche sur le plein
  });
  await shot("L-room");
}

/* ---------- L7 : zéro exception de page ---------- */
{
  const api = await page.evaluate(() => !!window.__chapelet && !!window.__chapelet.state().pos);
  log("(L7) zéro exception de page sur toute la batterie (console propre, API vivante)",
    pageErrors.length === 0 && api, `pageerror=${pageErrors.length} ${pageErrors.slice(0, 2).join(" | ").slice(0, 200)}`);
}

await browser.close();
console.log("\n===== RÉSULTATS verif_chapelet =====");
results.forEach((r) => console.log(r));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log("--- " + (results.length - fails) + " PASS / " + fails + " FAIL");
process.exit(fails ? 1 : 0);
