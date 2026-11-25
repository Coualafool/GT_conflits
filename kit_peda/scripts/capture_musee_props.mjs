// capture_musee_props.mjs — preuve visuelle des props de vitrines (harnais déterministe).
// Pourquoi un script et pas un script « écrit à la main par un bot » : les deux passes
// TARS ont échoué sur les mêmes pièges du DOM (deux overlays distincts, #welcome ouvert
// par défaut ; caméra immobile faute d'utiliser l'API focus). Ici chaque étape ASSERT
// et le script sort 1 sinon. Exécution : sur la machine Windows (TARS), Playwright déjà
// installé à côté des autres scripts de la repo. Usage :
//   node scripts/capture_musee_props.mjs [pageUrl] [outDir]
// Sorties : <outDir>/musee_III_[A-D]_*.png + <outDir>/musee_capture_report.json ; exit 0 = tout vert.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const PAGE = process.argv[2] || ('file:///' + path.join(ROOT, 'frise', 'perspective-J-musee.html').replace(/\\/g, '/'));
const OUT = process.argv[3] || path.join(ROOT, '_runs', 'capture_musee');
mkdirSync(OUT, { recursive: true });

const fails = [];
const ok = (cond, label, extra) => {
  console.log((cond ? 'OK   ' : 'FAIL ') + label + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : ''));
  if (!cond) fails.push(label);
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

await page.goto(PAGE, { waitUntil: 'load' });
await page.waitForFunction('window.__musee && window.__musee.props().loaded === true', null, { timeout: 30000 });
await page.waitForTimeout(2500);

// état initial des props : le seul état recevable avant capture
const props0 = await page.evaluate('__musee.props()');
ok(props0.placed === 49 && props0.skipped === 0 && props0.error === null && props0.sources.length === 7,
  'props: loaded, 49 posés, 0 sauté, 0 erreur, 7 sources', { placed: props0.placed, skipped: props0.skipped });

// les DEUX overlays fermés, vérifiés par le style calculé (pas par une classe de confiance)
await page.evaluate(`
  document.querySelector('#welcome').classList.add('gone');
  document.getElementById('menu').classList.remove('open');`);
const overlays = await page.evaluate(`({
  w: getComputedStyle(document.querySelector('#welcome')).display,
  m: getComputedStyle(document.getElementById('menu')).display,
  mOpen: document.getElementById('menu').classList.contains('open') })`);
ok(overlays.w === 'none' && (overlays.m === 'none' || !overlays.mOpen),
  'overlays welcome+menu fermés (display calculé)', overlays);
if (overlays.w !== 'none') { // sans ça, toute capture est une capture du dialogue d'accueil
  writeFileSync(path.join(OUT, 'musee_capture_report.json'), JSON.stringify({ fails, overlays, consoleErrors }, null, 2));
  await browser.close();
  console.log('ABORT — welcome non fermé, captures inutiles');
  process.exit(1);
}

const shots = [];
async function shoot(exprFocus, file, label) {
  if (exprFocus) {
    const done = await page.evaluate(`__musee.focus('${exprFocus}', true)`);
    ok(done === true, `focus('${exprFocus}') a bien téléporté`);
    await page.waitForTimeout(1600);
    // focusStation ouvre le panneau de la vitrine : le fermer proprement avant le tir
    const closed = await page.evaluate(`(() => {
      const x = document.querySelector('#panel .x');
      if (x) x.click();
      return __musee.state().panel === null; })()`);
    await page.waitForTimeout(800);
    ok(closed === true, `panneau fermé après focus('${exprFocus}')`);
  } else {
    await page.evaluate('() => __musee.teleportRoom(5)');
    await page.waitForTimeout(2200);
  }
  const st = await page.evaluate('__musee.state()');
  ok(st.menu === false && st.panel === null, `état propre avant tir ${label}`, { menu: st.menu, panel: st.panel });
  const f = path.join(OUT, file);
  await page.screenshot({ path: f });
  shots.push({ label, focus: exprFocus || 'room5', file: f, state: st });
  console.log('SHOT ' + label + ' -> ' + f);
}

await shoot('v78', 'musee_III_A_watch.png', 'A watch (v78)');
await shoot('v80', 'musee_III_B_lantern.png', 'B lantern (v80)');
await shoot('v86', 'musee_III_C_books.png', 'C books (v86)');
await shoot(null, 'musee_III_D_wide.png', 'D allée (salle 5)');

const truth = await page.evaluate(`(() => { const p = __musee.props(); return {
  placed: p.placed, watch78: p.placedNames.includes('prop_watch_78'),
  lantern80: p.placedNames.includes('prop_lantern_80'),
  books86: p.placedNames.includes('prop_books_86') }; })()`);
ok(truth.placed === 49 && truth.watch78 && truth.lantern80 && truth.books86,
  'contrôle final : 49 posés et les 3 props des tirs présents', truth);
ok(consoleErrors.length === 0, 'zéro console error', consoleErrors.slice(0, 6));

writeFileSync(path.join(OUT, 'musee_capture_report.json'),
  JSON.stringify({ fails, shots, truth, overlays, consoleErrors }, null, 2));
await browser.close();
console.log(fails.length ? 'RESULT: ' + fails.length + ' FAIL' : 'RESULT: TOUT VERT — 4 tirs');
process.exit(fails.length ? 1 : 0);
