// verif_orientation.mjs — le parcours de choix : bouton hero → comparatif → rapport.
// Vérifie sur les pages rendues (pas juste le code) :
//  1. rapport/rapport_FR.html : le CTA frise pointe vers index-comparatif.html
//  2. frise/index-comparatif.html : le bouton « Toutes les variantes expliquées » pointe vers explications.html
//  3. frise/explications.html : se charge sans erreur, le pied frise « Comparer les vues » ramène au comparatif
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
let fail = 0;
const ok = (name, cond) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}`); if (!cond) fail++; };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 830 } });
page.on('pageerror', (e) => { console.log('pageerror: ' + e.message); fail++; });

await page.goto(url('rapport/rapport_FR.html'), { waitUntil: 'load' });
{
  const href = await page.$eval('a.timeline', (a) => a.getAttribute('href'));
  ok('hero CTA → index-comparatif.html', href === '../frise/index-comparatif.html');
}
await page.goto(url('frise/index-comparatif.html'), { waitUntil: 'load' });
{
  const href = await page.$$eval('a[href="explications.html"]', (as) => as.map((a) => a.textContent.trim()));
  ok('comparatif → bouton vers explications.html (1 seul, textuel)', href.length === 1 && href[0].includes('expliquées'));
  const back = await page.$eval('a[href="../rapport/rapport_FR.html"]', (a) => ({ text: a.textContent.trim(), first: a.parentElement.tagName === 'BODY' }));
  ok('comparatif → bouton « Retour au kit » en tête de page', back.text.includes('Retour au kit') && back.first);
  await page.screenshot({ path: 'artifacts/comparatif-haut.png', clip: { x: 0, y: 0, width: 1440, height: 420 } });
}
await page.goto(url('frise/explications.html'), { waitUntil: 'load' });
{
  const img = await page.$$eval('img', (is) => is.length);
  ok('rapport : images embarquées présentes (' + img + ')', img >= 12);
  const back = await page.$$eval('a[href="index-comparatif.html"]', (as) => as.length);
  ok('rapport : le pied ramène au comparatif', back >= 1);
  await page.screenshot({ path: 'artifacts/rapport-apres-deplacement.png' });
}
await browser.close();
console.log(fail ? 'ORIENTATION_FAIL ' + fail : 'ORIENTATION_OK');
process.exit(fail ? 1 : 0);
