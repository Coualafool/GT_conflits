// _probe_musee.mjs — SONDE TEMPORAIRE : console/pageerror de perspective-J sur TARS. À supprimer.
import { createRequire } from "module";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
const root = new URL("..", import.meta.url);
const NODE = process.execPath;
const serve = spawn(NODE, ["scripts/tars_serve.mjs"], { cwd: fileURLToPath(root), stdio: "ignore" });
await new Promise(r => setTimeout(r, 1800));
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage();
p.on("console", m => console.log("CONSOLE", m.type(), m.text().slice(0, 900) + " @ " + JSON.stringify(m.location())));
p.on("pageerror", e => console.log("PAGEERROR", String(e && e.stack || e).slice(0, 700)));
p.on("response", r => { if (r.status() >= 400) console.log("HTTP", r.status(), r.url()); });
p.on("requestfailed", r => console.log("REQFAIL", r.url(), r.failure() && r.failure().errorText));
await p.goto("http://localhost:8899/frise/perspective-J-musee.html", { waitUntil: "load" });
await p.waitForTimeout(2000);
console.log("musee=", await p.evaluate(() => !!window.__musee),
  "fallback=", await p.evaluate(() => getComputedStyle(document.getElementById("fallback")).display));
await b.close();
serve.kill();
process.exit(0);
