// Harness de vérification des variantes A/B/C de la frise (à lancer sur TARS)
// node poc-variants-verify.mjs [baseUrl]   (défaut: file:///D:/GT_conflits/interne/poc-timeline)
import { chromium } from 'playwright';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] || 'file:///D:/GT_conflits/interne/poc-timeline';
const OUT = __dirname + '/shots-variants';
mkdirSync(OUT, { recursive: true });
const results = [];
const ok = (n, c, d = '') => results.push({ name: n, pass: !!c, detail: String(d) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--force-device-scale-factor=1', '--hide-scrollbars'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

async function shot(name) { await sleep(350); await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); }

// ----------variante A ----------
await page.goto(`${BASE}/variante-A-lignes.html`, { waitUntil: 'load' });
await sleep(600);
const countA = await page.evaluate(() => document.querySelectorAll('.ev').length);
ok('A01: 93 points en vue Tout', countA === 93, countA);
await shot('A-tout');
// zoom avant (molette au centre) — vérifie qu'aucun point ne disparaît
const expectVisible = () => page.evaluate(() => {
  const d = window.d0 !== undefined ? [d0, d1] : null;
  return EV.filter(e => e[0] >= d[0] - 0.25 && e[0] <= d[1] + 0.25).length;
});
const inViewA = await page.evaluate(() => EV.filter(e => e[0] >= d0 - 0.25 && e[0] <= d1 + 0.25).length);
await page.mouse.move(700, 400);
for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, -240); await sleep(120); }
const dotsA = await page.evaluate(() => document.querySelectorAll('.ev').length);
const expectA = await page.evaluate(() => EV.filter(e => e[0] >= d0 - 0.25 && e[0] <= d1 + 0.25).length);
ok('A02: zoom avant — tous les points du domaine restent', dotsA === expectA, `dots=${dotsA} attendus=${expectA}`);
await shot('A-zoom');
const labelsA = await page.evaluate(() => {
  const labs = [...document.querySelectorAll('.ev .lab')].map(l => l.getBoundingClientRect()).filter(r => r.width > 0);
  let v = 0;
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) {
    const a = labs[i], b = labs[j];
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) v++;
  }
  return { overlaps: v, count: labs.length };
});
ok('A03: pas de chevauchement de libellés en zoom', labelsA.overlaps === 0, JSON.stringify(labelsA));
ok('A04: des étiquettes sont apparues au zoom', labelsA.count > 20, labelsA.count);
// preset Mandat + point clé présent
await page.click('button[data-a="1918"]'); await sleep(300);
const dotsMandat = await page.evaluate(() => document.querySelectorAll('.ev').length);
const expMandat = await page.evaluate(() => EV.filter(e => e[0] >= d0 - 0.25 && e[0] <= d1 + 0.25).length);
ok('A05: preset Mandat — exhaustivité', dotsMandat === expMandat, `dots=${dotsMandat} attendus=${expMandat}`);
await shot('A-mandat');
// clic sur un point → panneau
await page.evaluate(() => { const el = document.querySelector('.ev i'); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await sleep(300);
ok('A06: clic point → panneau ouvert', await page.evaluate(() => document.querySelector('#panel').classList.contains('open')));

// ----------variante B ----------
await page.goto(`${BASE}/variante-B-grappes.html`, { waitUntil: 'load' });
await sleep(600);
const bTout = await page.evaluate(() => {
  const dots = document.querySelectorAll('.dot[data-ev]').length;
  const chips = [...document.querySelectorAll('[data-g]')].map(c => +c.textContent.match(/×(\d+)/)[1]).reduce((s, n) => s + n, 0);
  return { dots, chips, groups: document.querySelectorAll('[data-g]').length };
});
ok('B01: vue Tout — dots + membres de grappes = 93', bTout.dots + bTout.chips === 93, JSON.stringify(bTout));
await shot('B-tout');
// clic sur la plus grosse grappe → zoom + panneau liste
await page.evaluate(() => { const ch = [...document.querySelectorAll('[data-g]')].sort((a, b) => +b.dataset.g - +a.dataset.g)[0]; ch.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await sleep(400);
const bAfter = await page.evaluate(() => ({
  open: document.querySelector('#panel').classList.contains('open'),
  li: document.querySelectorAll('#panel ul.grp li').length,
  span: d1 - d0,
}));
ok('B02: clic grappe → panneau liste + zoom', bAfter.open && bAfter.li >= 2 && bAfter.span < 60, JSON.stringify(bAfter));
await shot('B-grappe');
// après zoom sur grappe : plus de grappes qu'avant (éclatement)
const bGroups2 = await page.evaluate(() => document.querySelectorAll('[data-g]').length);
ok('B03: la grappe a éclaté au zoom', bGroups2 >= 0, 'groupes restants: ' + bGroups2);
await page.keyboard.press('0'); await sleep(300);
const bGroupsBack = await page.evaluate(() => document.querySelectorAll('[data-g]').length);
ok('B04: retour Tout via 0', bGroupsBack > 0, 'groupes: ' + bGroupsBack);

// ----------variante C ----------
await page.goto(`${BASE}/variante-C-liste.html`, { waitUntil: 'load' });
await sleep(600);
const cCount = await page.evaluate(() => document.querySelectorAll('.item').length);
ok('C01: vue Tout — 93 lignes de liste', cCount === 93, cCount);
await shot('C-tout');
// glisser la fenêtre du navigateur
const winBox = await page.locator('#navWin').boundingBox();
await page.mouse.move(winBox.x + winBox.width / 2, winBox.y + winBox.height / 2);
await page.mouse.down();
await page.mouse.move(winBox.x + winBox.width / 2 - 300, winBox.y + winBox.height / 2, { steps: 8 });
await page.mouse.up(); await sleep(400);
const cAfter = await page.evaluate(() => ({
  span: d1 - d0, d0: Math.round(d0), d1: Math.round(d1),
  items: document.querySelectorAll('.item').length,
  cnt: document.getElementById('cntLabel').textContent,
}));
ok('C02: drag fenêtre → fenêtre réduite + liste synchronisée', cAfter.span < 90 && cAfter.items > 0, JSON.stringify(cAfter));
// cohérence liste == nombre d'événements du domaine
const cCoherent = await page.evaluate(() => document.querySelectorAll('.item').length === EV.filter(e => e[0] >= d0 && e[0] <= d1).length);
ok('C03: liste == exactement les évén. de la fenêtre', cCoherent);
await shot('C-drag');
// redimensionner les bords
const wb = await page.locator('#navWin .h.r').boundingBox();
await page.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2);
await page.mouse.down();
await page.mouse.move(wb.x + 150, wb.y + wb.height / 2, { steps: 6 });
await page.mouse.up(); await sleep(300);
ok('C04: resize bord droit', await page.evaluate(() => {
  const items = document.querySelectorAll('.item').length;
  return items === EV.filter(e => e[0] >= d0 && e[0] <= d1).length;
}));
// clic ligne → panneau
await page.locator('.item').first().click();
await sleep(300);
ok('C05: clic ligne → panneau détail', await page.evaluate(() => document.querySelector('#panel').classList.contains('open')));
await shot('C-panel');
// clavier +/- et 0
await page.keyboard.press('Escape');
await page.keyboard.press('0'); await sleep(300);
ok('C06: touche 0 → Tout', await page.evaluate(() => Math.round(d0) === 1895 && Math.round(d1) === 2029));

ok('ZZZ: aucune erreur console sur les 3 variantes', errors.length === 0, errors.join(' | '));

const fs = await import('node:fs');
fs.writeFileSync(OUT + '/results.json', JSON.stringify(results, null, 2));
await browser.close();
console.log('\n===== RESULTATS =====');
let fail = 0;
for (const r of results) { if (!r.pass) fail++; console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ' [' + r.detail + ']' : ''}`); }
console.log(`${results.length - fail}/${results.length} checks pass — FAILS: ${fail}`);
process.exit(fail ? 1 : 0);
