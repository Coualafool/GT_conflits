// Captures d'état de la PoC A pour revue visuelle. Usage: node scripts/poc_capture.mjs [chemin.html]
// Écrit artifacts/poc-vue-default.png et artifacts/poc-vue-intermediaire.png (relatif au dépôt).
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const html = process.argv[2] || path.join(repoRoot, 'interne/poc-timeline/poc-A-niveaux.html');
const out = (n) => path.join(repoRoot, 'artifacts', n);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 830 } })).newPage();
await page.goto(pathToFileURL(html).href);
await page.waitForTimeout(600);
await page.click('#help .x'); // fermer la carte d'aide pour voir la frise nue
await page.waitForTimeout(300);
await page.screenshot({ path: out('poc-vue-default.png') });
// état intermédiaire : slider ~ milieu (vue décennale, étiquettes attendues)
await page.locator('#zoomSlider').evaluate((el) => { el.value = 50; el.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(500);
await page.screenshot({ path: out('poc-vue-intermediaire.png') });
const labels = await page.locator('#field .lab').count();
const dots = await page.locator('#field .ev').count();
console.log(`INTERMEDIAIRE labels=${labels} dots=${dots}`);
await browser.close();
console.log('CAPTURES_OK');
