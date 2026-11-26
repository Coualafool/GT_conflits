#!/usr/bin/env python3
# Plan — « le musée dupliqué 4 fois, fusionné aux salles communes ».
# On part du bâtiment du Musée des récits (perspective-J-musee.html) : 7 salles d'ère
# en enfilade, 14 × 12,5 m, cloisons de 0,3 m à porte centrale de 2,6 m.
# On duplique ce bâtiment 4 fois (une copie par récit, chaque copie n'accroche que les
# faits de SON récit) et on aligne les 4 copies sur un même axe du temps.
# Aux 7 grands moments (perspective-K-data.js), les 4 copies fusionnent : la salle
# commune est la pièce unique qui traverse les 4 bâtiments à ce moment-là.
# Usage : python3 scripts/gen_plan_j4.py
import json, os, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

js = r'''
const fs=require("fs");
global.window={};
eval(fs.readFileSync("frise/perspective-I2-data.js","utf8")+"\n"+fs.readFileSync("frise/perspective-K-data.js","utf8")+"\n"+`
const BRINS=TRACK_KEYS;
const brOf=(i)=>BRINS[EV[i][1]];
const facts=[]; EV.forEach((e,i)=>facts.push({y:e[0],br:brOf(i),t:e[2]}));
const moments=window.__K_ALLIES.plazas.map(p=>({y0:p.y0,y1:p.y1,label:p.label,ids:p.ids,
  who:Object.fromEntries(BRINS.map(k=>[k,p.ids.filter(i=>brOf(i)===k).length]))}));
console.log(JSON.stringify({facts,moments,eras:ERAS,
  titles:{occ:"Occidental",pal:"Palestinien",isr:"Israélien",ter:"Territoire"},
  colors:{occ:"#8a5a3c",pal:"#2e7d5b",isr:"#2f6f9e",ter:"#a06417"}}));
`);
'''
out = subprocess.run(["node", "-e", js], cwd=KIT, capture_output=True, text=True)
if out.returncode != 0:
    sys.exit("node lecture corpus a échoué :\n" + out.stderr)
D = json.loads(out.stdout)
FACTS, MOM, ERAS, TITLES, COL = D["facts"], D["moments"], D["eras"], D["titles"], D["colors"]
MOM = sorted(MOM, key=lambda m: m["y0"])
ORDER = ["occ", "pal", "isr", "ter"]

# --- géométrie : celle du musée J, à l'identique ---
RW, RH = 14.0, 12.5            # largeur du temps × profondeur d'une salle d'ère (m)
PART = 0.3
STRIP = RH + PART              # hauteur d'une copie
TOP, LM, BOT = 70, 130, 34
# x du temps : chaque salle d'ère occupe RW mètres, les années s'y répartissent en proportion
def yr_x(y):
    for i, e in enumerate(ERAS):
        a, b = e["a"], e["b"]
        if a <= y <= b:
            return LM + i*(RW+PART) + (y-a)/(b-a)*RW
    return LM if y < ERAS[0]["a"] else LM + len(ERAS)*RW + (len(ERAS)-1)*PART

def trunc(s, k=13):
    s = (s or "").strip().replace("&","&amp;").replace("<","&lt;").replace('"',"&quot;")
    return s if len(s) <= k else s[:k-1].rstrip()+"…"

TOTW = LM + len(ERAS)*RW + (len(ERAS)-1)*PART + 30
DEPTHH = len(ORDER)*STRIP
W = TOTW*9.0; H = (DEPTHH + TOP + BOT)*9.0
xA0, xB0 = LM, LM + len(ERAS)*(RW+PART) - PART
svg = [f'<svg viewBox="0 0 {W:.0f} {H:.0f}" width="100%" style="display:block" '
       f'role="img" aria-label="plan : le musée des récits dupliqué quatre fois, fusionné aux sept salles communes">']
S = 9.0
row_top = lambda i: TOP + i*STRIP

# 1) salles communes d'abord (dessous de pile) : traversantes sur tout le bâtiment
for m in MOM:
    x0 = max(yr_x(m["y0"]), LM); x1 = min(yr_x(m["y1"]), LM+ len(ERAS)*(RW+PART))
    if x1-x0 < 3.2:                       # fenêtre trop fine : élargie pour rester une pièce
        c = (x0+x1)/2; x0, x1 = c-1.6, c+1.6
    svg.append(f'<rect x="{x0*S:.1f}" y="{TOP*S:.1f}" width="{(x1-x0)*S:.1f}" height="{DEPTHH*S:.1f}" class="commune"/>')
    svg.append(f'<text x="{(x0+x1)/2*S:.1f}" y="{(TOP-6)*S:.1f}" class="commune-lab" text-anchor="middle">{int(m["y0"])}–{int(round(m["y1"]))}</text>')
    svg.append(f'<text x="{(x0+x1)/2*S:.1f}" y="{(TOP-14)*S:.1f}" class="commune-t" text-anchor="middle">{trunc(m["label"],20)}</text>')

# 2) les 4 copies du musée
for i, k in enumerate(ORDER):
    yt = row_top(i)*S
    # sol teinté de la copie
    svg.append(f'<rect x="{LM*S:.1f}" y="{yt:.1f}" width="{(TOTW-LM-10)*S:.1f}" height="{RH*S:.1f}" fill="{COL[k]}" fill-opacity="0.07"/>')
    # nom de copie
    svg.append(f'<text x="14" y="{yt+RH*S/2-6:.1f}" class="copie" fill="{COL[k]}">COPIE {TITLES[k].upper()}</text>')
    svg.append(f'<text x="14" y="{yt+RH*S/2+7:.1f}" class="copie-n">{sum(1 for f in FACTS if f["br"]==k)} faits</text>')
    # murs haut/bas de la copie, rompus dans les salles communes (= grandes ouvertures)
    def wall_broken(yw, x0, x1):
        segs, cur = [], x0
        for m in MOM:
            mx0 = yr_x(m["y0"]); mx1 = yr_x(m["y1"])
            if mx1 < x0 or mx0 > x1: continue
            if mx0 > cur: segs.append((cur, mx0))
            cur = mx1
        if cur < x1: segs.append((cur, x1))
        for (a, b) in segs:
            if (b-a)*S > 1: svg.append(f'<line x1="{a*S:.1f}" y1="{yw:.1f}" x2="{b*S:.1f}" y2="{yw:.1f}" class="mur"/>')
    xA, xB = xA0, xB0
    wall_broken(yt, xA, xB)
    wall_broken(yt+RH*S, xA, xB)
    # cloisons d'ère (porte centrale 2,6 m comme dans J), sautées si dans une commune
    for e in range(1, len(ERAS)):
        xe = LM + e*(RW+PART) - PART/2
        inside = any(yr_x(m["y0"]) <= xe <= yr_x(m["y1"]) for m in MOM)
        if inside: continue
        ym = yt + (RH/2 - 1.3)*S
        svg.append(f'<line x1="{xe*S:.1f}" y1="{yt:.1f}" x2="{xe*S:.1f}" y2="{ym:.1f}" class="cloison"/>')
        svg.append(f'<line x1="{xe*S:.1f}" y1="{ym+2.6*S:.1f}" x2="{xe*S:.1f}" y2="{yt+RH*S:.1f}" class="cloison"/>')
        svg.append(f'<line x1="{(xe-1.3)*S:.1f}" y1="{ym+1.3*S:.1f}" x2="{(xe+1.3)*S:.1f}" y2="{ym+1.3*S:.1f}" class="porte-arc"/>')
    # le rail doré du temps (comme dans J), rompu dans les communes
    svg.append(f'<line x1="{(LM+1)*S:.1f}" y1="{(yt+RH/2)*S:.1f}" x2="{(xB-1)*S:.1f}" y2="{(yt+RH/2)*S:.1f}" class="or"/>')
    # les faits du récit : patères sur les murs latéraux (comme dans J), année inscrite si la place le permet
    prev_x = -99
    for f in sorted([f for f in FACTS if f["br"] == k], key=lambda z: z["y"]):
        inhall = any(m["y0"] <= f["y"] <= m["y1"] for m in MOM)
        if inhall: continue
        x = yr_x(f["y"])
        y = yt + 3 if k == "pal" else yt + (RH-3)*S     # patère haute (gauche J) ou basse (droite J)
        svg.append(f'<rect x="{(x-0.5)*S:.1f}" y="{y:.1f}" width="{1.0*S:.1f}" height="{0.9*S:.1f}" fill="{COL[k]}"/>')
        if (x-prev_x)*S >= 26:
            svg.append(f'<text x="{x*S:.1f}" y="{y+ (0.9*S+8 if k=="pal" else -3):.1f}" class="an" fill="{COL[k]}" text-anchor="middle">{int(f["y"])}</text>')
        prev_x = x

# 3) niches des salles communes : face de chaque copie dans la commune (affiche ou rideau)
for m in MOM:
    x0 = max(yr_x(m["y0"]), LM); x1 = min(yr_x(m["y1"]), LM+len(ERAS)*(RW+PART))
    if x1-x0 < 3.2:
        c=(x0+x1)/2; x0,x1 = c-1.6, c+1.6
    for i, k in enumerate(ORDER):
        yc = (row_top(i) + RH/2)*S
        if m["who"][k]:
            svg.append(f'<rect x="{(x0+0.7)*S:.1f}" y="{yc-4:.1f}" width="8" height="8" fill="{COL[k]}"/>')
            svg.append(f'<rect x="{(x1-0.7)*S-8:.1f}" y="{yc-4:.1f}" width="8" height="8" fill="{COL[k]}"/>')
        else:
            svg.append(f'<rect x="{(x0+0.7)*S:.1f}" y="{yc-4:.1f}" width="8" height="8" class="rideau"/>')
# vitrine de la commune au centre du bâtiment
for m in MOM:
    x0 = max(yr_x(m["y0"]), LM); x1 = min(yr_x(m["y1"]), LM+len(ERAS)*(RW+PART))
    if x1-x0 < 3.2:
        c=(x0+x1)/2; x0,x1 = c-1.6, c+1.6
    cx, cy = (x0+x1)/2*S, (TOP+DEPTHH/2)*S
    svg.append(f'<rect x="{cx-8:.1f}" y="{cy-8:.1f}" width="16" height="16" transform="rotate(45 {cx:.1f} {cy:.1f})" class="case"/>')
svg.append(f'<text x="{xB0*S:.1f}" y="{(TOP-22)*S:.1f}" class="temps" text-anchor="end">temps →</text>')
svg.append("</svg>")
svg_str = "".join(svg)

html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Plan — Musée ×4 fusionné</title>
<style>
 :root{{ --ink:#1d1a16; --line:#57503f; --paper:#faf7f0; --gold:#b98a2f; }}
 @media (prefers-color-scheme: dark){{ :root{{ --ink:#efe9dd; --line:#9b917d; --paper:#171512; --gold:#d7ae55; }} }}
 body{{ margin:0; padding:14px 12px 22px; background:transparent; color:var(--ink);
       font:15px/1.45 ui-sans-serif, system-ui, sans-serif; }}
 h1{{ font-size:19px; margin:0 0 2px; }}
 p.sub{{ margin:0 0 10px; color:var(--muted-foreground,#6d6455); font-size:13px; max-width:88ch; }}
 svg text{{ font-family:ui-sans-serif, system-ui, sans-serif; }}
 .mur{{ stroke:var(--ink); stroke-width:1.4; }}
 .cloison{{ stroke:var(--ink); stroke-width:1; opacity:.8; }}
 .porte-arc{{ stroke:var(--gold); stroke-width:1.6; }}
 .commune{{ fill:rgba(185,138,47,.12); stroke:var(--gold); stroke-width:1.6; }}
 .case{{ fill:var(--gold); stroke:var(--paper); stroke-width:1; }}
 .rideau{{ fill:none; stroke:var(--line); stroke-width:1; stroke-dasharray:2.4 1.8; }}
 .or{{ stroke:var(--gold); stroke-width:1; stroke-dasharray="1.5 7"; opacity:.9; }}
 .copie{{ font-size:11px; font-weight:700; letter-spacing:.06em; }}
 .copie-n{{ font-size:9px; fill:var(--muted-foreground,#6d6455); }}
 .an{{ font-size:7.5px; font-weight:700; }}
 .commune-lab{{ font-size:9px; font-weight:700; fill:var(--gold); }}
 .commune-t{{ font-size:7.6px; fill:var(--ink); }}
 .temps{{ font-size:11px; fill:var(--muted-foreground,#6d6455); letter-spacing:.12em; }}
 .legend{{ display:flex; flex-wrap:wrap; gap:12px 20px; margin:6px 0 12px; font-size:12.5px;
          color:var(--muted-foreground,#4c453a); }}
 .legend span{{ display:inline-flex; align-items:center; gap:7px; }}
 .key{{ width:16px; height:12px; display:inline-block; border-radius:2px; }}
 .note{{ margin:14px 0 0; font-size:12.5px; color:var(--muted-foreground,#4c453a); max-width:88ch; }}
</style></head><body>
<h1>Le musée des récits, dupliqué 4 fois — fusionné aux grands moments</h1>
<p class="sub">Même bâtiment que le Musée des récits (7 salles d'ère de 14 × 12,5 m en enfilade, porte centrale dans chaque cloison), dupliqué 4 fois sur un axe du temps partagé. Chaque copie n'accroche que les faits de son récit ({sum(1 for f in FACTS if f["br"]=="occ")}/{sum(1 for f in FACTS if f["br"]=="pal")}/{sum(1 for f in FACTS if f["br"]=="isr")}/{sum(1 for f in FACTS if f["br"]=="ter")}). Aux 7 grands moments, les murs des 4 copies s'effacent et les copies ne font plus qu'une seule <b>salle commune</b> dorée ; puis les cloisons reprennent et chaque récit repart seul.</p>
<div class="legend">
 <span><i class="key" style="background:rgba(185,138,47,.3);border:1.5px solid #b98a2f"></i>salle commune (les 4 copies fusionnées)</span>
 <span><i class="key" style="background:#b98a2f"></i>vitrine centrale</span>
 <span><i class="key" style="border:1.5px dashed #777;background:none"></i>face muette d'un récit</span>
 <span><i class="key" style="background:#555"></i>patère d'affiche sur le mur</span>
 <span><i class="key" style="background:#b98a2f;height:3px"></i>porte d'ère (2,6 m, comme dans J)</span>
</div>
{svg_str}
<p class="note">Dans chaque copie, la succession des salles suit les salles d'ère du musée J ; les faits du récit sont accrochés à ses murs (rail doré au centre comme dans J). Une salle commune est la seule pièce où l'on peut voir les quatre récits du même moment : l'affiche du récit absent y est un rideau. Rien d'autre ne relie les copies — pas d'escalier, pas de porte dérobée.</p>
<p class="note" style="opacity:.7">Généré par <code>scripts/gen_plan_j4.py</code> depuis <code>perspective-J</code> (géométrie des salles), <code>perspective-I2-data.js</code> (faits) et <code>perspective-K-data.js</code> (les 7 moments de fusion).</p>
</body></html>"""

path = os.path.join(KIT, "interne", "plan-musee-x4.html")
open(path, "w", encoding="utf-8").write(html)
print("written", path, len(html), "octets | largeur:", round(TOTW,1), "m × profondeur:", round(DEPTHH,1), "m")
print("communes:", len(MOM), "| copies:", len(ORDER), "| salles d'ère par copie:", len(ERAS))
