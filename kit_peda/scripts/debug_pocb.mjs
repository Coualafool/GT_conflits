// Diagnostic poc-B : copie instrumentée dans artifacts/, mesures à chaque draw().
// Usage (TARS) : .runtime\node\node.exe scripts\debug_pocb.mjs
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
let src = fs.readFileSync(path.join(repoRoot, 'frise/poc-B-clustering.html'), 'utf8');
if (!src.includes('window.addEventListener("resize",draw);')) { console.log('ANCHOR_NOT_FOUND'); process.exit(1); }
const probe = `
window.addEventListener("resize",draw);
const __origDraw=draw;
draw=function(){
  const d1=xs(new Date(1917,2,1));
  (window.__draws=window.__draws||[]).push({
    W, H,
    d1917: isNaN(d1)?"NaN":Math.round(d1),
    domain:x0.domain().map(String),
    range:x0.range(),
    tr: (()=>{ try{ return JSON.stringify(d3.zoomIdentity===undefined?null:(d3.zoomTransform(document.querySelector("#svg")))); }catch(err){ return "ERR:"+err.message; } })()
  });
  return __origDraw();
};
window.__dbg=()=>({
  nDraws:(window.__draws||[]).length,
  draws:(window.__draws||[]).slice(0,3).concat((window.__draws||[]).slice(-2)),
  eraX0: (()=>{const r=document.querySelector("#erasG rect"); return r?r.getAttribute("x"):"no-rect";})(),
  evtX0: (()=>{const c=document.querySelector("#eventsG circle"); return c?c.getAttribute("cx"):"no-circle";})(),
  rectProbe: (()=>{const r=document.querySelector("#erasG rect"); if(!r) return "no-rect";
    const b=r.getBoundingClientRect(); const cs=getComputedStyle(r);
    return JSON.stringify({ns:r.namespaceURI, vb:[Math.round(b.x),Math.round(b.y),Math.round(b.width),Math.round(b.height)],
      display:cs.display, vis:cs.visibility, op:cs.opacity, fill:cs.fill,
      gVB:(()=>{const gb=document.querySelector("#erasG").getBoundingClientRect();return [Math.round(gb.x),Math.round(gb.y),Math.round(gb.width),Math.round(gb.height)];})(),
      sVB:(()=>{const sb=document.querySelector("#svg").getBoundingClientRect();return [Math.round(sb.x),Math.round(sb.y),Math.round(sb.width),Math.round(sb.height)];})()
    });})()
});
`;
src = src.replace('window.addEventListener("resize",draw);', probe);
const dbgPath = path.join(repoRoot, 'artifacts', 'pocb-debug.html');
fs.writeFileSync(dbgPath, src);

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 830 } })).newPage();
await page.goto(pathToFileURL(dbgPath).href);
await page.waitForTimeout(1500);
console.log('APRES_LOAD=' + JSON.stringify(await page.evaluate(() => window.__dbg())));
await page.screenshot({ path: path.join(repoRoot, 'artifacts', 'pocb-debug-shot.png') });
await page.click('[data-years="10"]');
await page.waitForTimeout(1200);
console.log('APRES_CLICK=' + JSON.stringify(await page.evaluate(() => window.__dbg())));
await browser.close();
console.log('DEBUG_OK');
