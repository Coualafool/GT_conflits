// Diagnostic géométrie des étiquettes : état des débordements à slider=50. Usage: .runtime\\node\\node.exe scripts\\dbg_labels.mjs (sur TARS) — output JSON, bad=[] attendu.
import { chromium } from 'playwright';
const url = 'file:///D:/GT_conflits/frise/poc-A-niveaux.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url); await p.waitForTimeout(900);
await p.evaluate(() => { const z = document.getElementById('zoomSlider'); z.value = 50; z.dispatchEvent(new Event('input', { bubbles: true })); });
await p.waitForTimeout(400);
const out = await p.evaluate(() => {
  const box = document.getElementById('field').getBoundingClientRect();
  const rows = [...document.querySelectorAll('#field .ev')].map((el) => {
    const lab = el.querySelector('.lab'); if (!lab) return null;
    const r = lab.getBoundingClientRect();
    return { t: lab.textContent.slice(0, 24), flip: el.classList.contains('flip'),
      left: +el.style.left.replace('px',''), w: lab.getBoundingClientRect().width,
      dl: +(r.left - box.left).toFixed(1), dr: +(r.right - box.right).toFixed(1),
      bad: r.right > box.right + 1 || r.left < box.left - 1 };
  }).filter(Boolean);
  return { boxW: box.width, bad: rows.filter(r => r.bad), nLab: rows.length, flips: rows.filter(r => r.flip).length };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
