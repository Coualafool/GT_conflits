// Captures pour le rapport variantes : poc-B (défaut + déplié) et page comparative.
// Usage (TARS, depuis la racine du dépôt) : .runtime\node\node.exe scripts\report_capture.mjs
// Écrit artifacts/pb-tout.png, artifacts/pb-10ans.png, artifacts/comparatif-pleine.png.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const out = (n) => path.join(repoRoot, 'artifacts', n);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 830 } });

// --- poc-B « clustering par densité » (D3 via CDN — vérifier la bannière d'avertissement)
{
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('POCB pageerror: ' + err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('POCB console-error: ' + msg.text()); });
  await page.goto(pathToFileURL(path.join(repoRoot, 'frise/poc-B-clustering.html')).href);
  await page.waitForTimeout(2500); // CDN d3 + rendu
  const warnVisible = await page.evaluate(() => {
    const el = document.getElementById('d3warn');
    return !!el && getComputedStyle(el).display !== 'none';
  });
  console.log('POCB d3warn_visible=' + warnVisible);
  const dom = await page.evaluate(() => ({
    d3: typeof window.d3,
    circles: document.querySelectorAll('#eventsG circle').length,
    clusters: document.querySelectorAll('#eventsG .cluster').length,
    eraRects: document.querySelectorAll('#erasG rect').length,
    axisTicks: document.querySelectorAll('#axisG .tick').length,
    svgBox: (() => { const b = document.querySelector('#svg').getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; })(),
    readout: (document.getElementById('zoomReadout') || {}).textContent,
  }));
  console.log('POCB dom=' + JSON.stringify(dom));
  await page.screenshot({ path: out('pb-tout.png') });
  await page.click('[data-years="10"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out('pb-10ans.png') });
  const readout = await page.locator('#zoomReadout').textContent().catch(() => '(absent)');
  console.log('POCB readout=' + (readout || '(vide)'));
  await page.close();
}

// --- page comparative (toutes les cartes, pleine hauteur)
{
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(repoRoot, 'frise/index-comparatif.html')).href);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('comparatif-pleine.png'), fullPage: true });
  await page.close();
}

await browser.close();
console.log('CAPTURES_OK');
