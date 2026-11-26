#!/usr/bin/env python3
# Génère kit_peda/interne/plan-quatre-salles.html — plan (vue de dessus) de la variante
# « quatre successions de salles » :
#   - 1 couloir de salles par récit (4 couloirs parallèles, étanches),
#   - 1 salle par fait du corpus (couloir palestinien = histoire palestinienne, etc.),
#   - les 4 couloirs ne FUSIONNENT qu'aux 7 salles communes des grands moments :
#     une salle commune est une seule pièce qui traverse les 4 couloirs (x partagé).
#
# Source de vérité : frise/perspective-I2-data.js (corpus EV : un fait = une salle)
# et frise/perspective-K-data.js (7 moments de convergence, choix éditorial justifié).
# Usage : python3 scripts/gen_plan_salles.py   (relancer après tout changement de corpus)
import json, os, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

js = r'''
const fs=require("fs");
global.window={};
eval(fs.readFileSync("frise/perspective-I2-data.js","utf8")+"\n"+fs.readFileSync("frise/perspective-K-data.js","utf8")+"\n"+`
const BRINS=TRACK_KEYS;
const brOf=(i)=>BRINS[EV[i][1]];
const facts=[];
EV.forEach((e,i)=>facts.push({i,y:e[0],br:brOf(i),t:e[2]}));
const moments=window.__K_ALLIES.plazas.map(p=>({y0:p.y0,y1:p.y1,label:p.label,
  ids:p.ids, who:Object.fromEntries(BRINS.map(k=>[k,p.ids.filter(i=>brOf(i)===k).length]))}));
console.log(JSON.stringify({facts,moments,
  titles:{occ:"Occidental — influence & ONU",pal:"Palestinien",isr:"Israélien",ter:"Territoire"},
  colors:{occ:"#8a5a3c",pal:"#2e7d5b",isr:"#2f6f9e",ter:"#a06417"}}));
`);
'''
out = subprocess.run(["node", "-e", js], cwd=KIT, capture_output=True, text=True)
if out.returncode != 0:
    sys.exit("node lecture corpus a échoué :\n" + out.stderr)
D = json.loads(out.stdout)
FACTS, MOM, TITLES, COL = D["facts"], D["moments"], D["titles"], D["colors"]
ORDER = ["occ", "pal", "isr", "ter"]          # couloirs, de haut en bas

# --- découpage temps : segments entre moments, moments = salles communes ---
MOM = sorted(MOM, key=lambda m: m["y0"])
def seg_index(y):
    for j, m in enumerate(MOM):
        if m["y0"] <= y <= m["y1"]: return j          # fait "dans" le moment → absorbé par la salle commune
        if y < m["y0"]: return j
    return len(MOM)

segments = [[] for _ in range(len(MOM)+1)]
for f in FACTS:
    j = seg_index(f["y"])
    if 0 <= j < len(MOM) and MOM[j]["y0"] <= f["y"] <= MOM[j]["y1"]:
        continue                                        # porté par la salle commune
    segments[j].append(f)

# --- géométrie : chaque segment a une largeur = max(nb salles par couloir) × largeur salle ;
#     à l'intérieur du segment, chaque couloir répartit ses salles sur la même largeur
#     ⇒ les salles communes sont des pièces verticales qui traversent les 4 couloirs. ---
RW, HALLW, GW = 5.8, 15.0, 0.0       # largeur salle nominale / salle commune / jeu
RH, CH = 8.6, 3.2                    # profondeur salle / circulation du couloir
n = lambda j, k: sum(1 for f in segments[j] if f["br"] == k)
segw = [max(1, max(n(j, k) for k in ORDER)) * RW for j in range(len(MOM)+1)]
xs, x = [0.0], 0.0
for j in range(len(MOM)+1):
    x += segw[j]; xs.append(x)
    if j < len(MOM): x += HALLW; xs.append(x)
TOTW = x
DEPTH = len(ORDER)*RH + (len(ORDER)-1)*CH
TOP, BOT, LM = 66, 40, 150
S = 1620.0 / (TOTW + 20)             # px/m — le plan entier tient la largeur du cadre
W, H = (TOTW+20)*S, DEPTH*S + TOP + BOT
def X(m): return (LM/1 + m) * S * 0 + (m + 10) * S   # x mètre → px (marge gauche incluse)
def Xpx(m): return (m + 10) * S

def trunc(s, k=14):
    s = (s or "").strip().replace("&","&amp;").replace("<","&lt;").replace('"',"&quot;")
    return s if len(s) <= k else s[:k-1].rstrip()+"…"

svg = [f'<svg viewBox="0 0 {X(TOTW)+0:.0f} {H:.0f}" width="100%" style="display:block" '
       f'role="img" aria-label="plan du musée en quatre successions de salles fusionnant aux moments majeurs">']

row_top = lambda i: TOP + i*(RH+CH)

# 1) salles communes : une seule pièce verticale par moment, traversant tout le bâtiment
for j, m in enumerate(MOM):
    hx0 = xs[2*j+1] - HALLW            # borne gauche du hall j dans xs
    px0, px1 = Xpx(hx0), Xpx(hx0+HALLW)
    svg.append(f'<rect x="{px0:.1f}" y="{TOP*S-S*CH*0:.1f}" width="{px1-px0:.1f}" '
               f'height="{DEPTH*S:.1f}" class="commune"/>')
    # travée médiane + vitrine au centre du bâtiment
    cx = (px0+px1)/2; cy = TOP*S + DEPTH*S/2
    svg.append(f'<line x1="{cx:.1f}" y1="{TOP*S+6:.1f}" x2="{cx:.1f}" y2="{TOP*S+DEPTH*S-6:.1f}" class="or"/>')
    svg.append(f'<rect x="{cx-8:.1f}" y="{cy-8:.1f}" width="16" height="16" transform="rotate(45 {cx:.1f} {cy:.1f})" class="case"/>')
    svg.append(f'<text x="{cx:.1f}" y="{TOP*S-34:.1f}" class="commune-lab" text-anchor="middle">SALLE COMMUNE</text>')
    svg.append(f'<text x="{cx:.1f}" y="{TOP*S-24:.1f}" class="commune-t" text-anchor="middle">{int(m["y0"])}–{int(round(m["y1"]))} · {trunc(m["label"],26)}</text>')

# 2) couloirs : salles-datées + circulation, cloisons entre salles (traits), portes vers les communes
for i, k in enumerate(ORDER):
    yt = row_top(i)*S
    # band de couloir + nom
    svg.append(f'<text x="12" y="{yt+RH*S/2-5:.1f}" class="couloir" fill="{COL[k]}">COULOIR {TITLES[k].split(" ")[0].upper()}</text>')
    svg.append(f'<text x="12" y="{yt+RH*S/2+8:.1f}" class="couloir-n">{sum(1 for f in FACTS if f["br"]==k)} salles</text>')
    for j in range(len(MOM)+1):
        seg = [f for f in segments[j] if f["br"] == k]
        if not seg: 
            continue
        sx0 = xs[2*j]; span = segw[j]
        rw = span/len(seg)
        for q, f in enumerate(seg):
            rx0 = Xpx(sx0 + q*rw)
            fill = COL[k]
            svg.append(f'<rect x="{rx0:.1f}" y="{yt:.1f}" width="{rw*S-GW:.1f}" height="{RH*S:.1f}" '
                       f'fill="{fill}" fill-opacity="0.15" stroke="{fill}" class="salle"/>')
            if rw*S >= 34:
                svg.append(f'<text x="{rx0+rw*S/2:.1f}" y="{yt+RH*S/2-3:.1f}" class="an" fill="{fill}" text-anchor="middle">{int(f["y"])}</text>')
                svg.append(f'<text x="{rx0+rw*S/2:.1f}" y="{yt+RH*S/2+8:.1f}" class="ti" text-anchor="middle">{trunc(f["t"])}</text>')
            elif rw*S >= 14:
                svg.append(f'<text x="{rx0+rw*S/2:.1f}" y="{yt+RH*S/2+3:.1f}" class="an" fill="{fill}" text-anchor="middle" transform="rotate(90 {rx0+rw*S/2:.1f} {yt+RH*S/2:.1f})">{int(f["y"])}</text>')
    # circulation du couloir (sous ses salles, au-dessus du couloir suivant)
    svg.append(f'<rect x="{Xpx(0):.1f}" y="{yt+RH*S:.1f}" width="{TOTW*S:.1f}" height="{CH*S:.1f}" class="circ"/>')
    # portes : ouverture de la circulation vers chaque salle commune
    for j in range(len(MOM)):
        hx0 = xs[2*j+1] - HALLW
        cx = Xpx(hx0 + HALLW/2)
        svg.append(f'<line x1="{cx-14:.1f}" y1="{yt+RH*S:.1f}" x2="{cx+14:.1f}" y2="{yt+RH*S:.1f}" class="porte"/>')
        svg.append(f'<line x1="{cx-14:.1f}" y1="{yt:.1f}" x2="{cx+14:.1f}" y2="{yt:.1f}" class="porte"/>')
    # niches de la commune par couloir : affiche colorée si le brin parle, vide sinon
    for j, m in enumerate(MOM):
        hx0 = xs[2*j+1] - HALLW
        px0 = Xpx(hx0)
        yc = yt + RH*S/2
        if m["who"][k]:
            svg.append(f'<rect x="{px0+8:.1f}" y="{yc-5:.1f}" width="10" height="10" fill="{COL[k]}"/>')
        else:
            svg.append(f'<rect x="{px0+8:.1f}" y="{yc-5:.1f}" width="10" height="10" class="rideau"/>')
svg.append(f'<text x="{Xpx(TOTW)-6:.1f}" y="{TOP*S-46:.1f}" class="temps" text-anchor="end">temps →</text>')
svg.append("</svg>")
svg = "".join(svg)

html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Plan — Quatre successions de salles</title>
<style>
 :root{{ --ink:#1d1a16; --line:#57503f; --paper:#faf7f0; --gold:#b98a2f; }}
 @media (prefers-color-scheme: dark){{ :root{{ --ink:#efe9dd; --line:#9b917d; --paper:#171512; --gold:#d7ae55; }} }}
 body{{ margin:0; padding:14px 12px 22px; background:transparent; color:var(--ink);
       font:15px/1.45 ui-sans-serif, system-ui, sans-serif; }}
 h1{{ font-size:19px; margin:0 0 2px; }}
 p.sub{{ margin:0 0 10px; color:var(--muted-foreground,#6d6455); font-size:13px; max-width:84ch; }}
 svg text{{ font-family:ui-sans-serif, system-ui, sans-serif; }}
 .salle{{ stroke-width:1; }}
 .commune{{ fill:rgba(185,138,47,.10); stroke:var(--gold); stroke-width:1.6; }}
 .circ{{ fill:var(--muted-foreground,#e9e2d4); opacity:.5; }}
 .porte{{ stroke:var(--gold); stroke-width:2.6; }}
 .or{{ stroke:var(--gold); stroke-width:1.2; stroke-dasharray="2 6"; }}
 .case{{ fill:var(--gold); stroke:var(--paper); stroke-width:1; }}
 .rideau{{ fill:none; stroke:var(--line); stroke-width:1; stroke-dasharray:2.4 1.8; }}
 .an{{ font-size:8.5px; font-weight:700; }}
 .ti{{ font-size:6.8px; fill:var(--muted-foreground,#5c5346); }}
 .couloir{{ font-size:11px; font-weight:700; letter-spacing:.05em; }}
 .couloir-n{{ font-size:9px; fill:var(--muted-foreground,#6d6455); }}
 .commune-lab{{ font-size:9px; font-weight:700; fill:var(--gold); letter-spacing:.14em; }}
 .commune-t{{ font-size:8px; fill:var(--ink); }}
 .temps{{ font-size:11px; fill:var(--muted-foreground,#6d6455); letter-spacing:.12em; }}
 .legend{{ display:flex; flex-wrap:wrap; gap:12px 20px; margin:6px 0 12px; font-size:12.5px;
          color:var(--muted-foreground,#4c453a); }}
 .legend span{{ display:inline-flex; align-items:center; gap:7px; }}
 .key{{ width:16px; height:12px; display:inline-block; border-radius:2px; }}
 .note{{ margin:14px 0 0; font-size:12.5px; color:var(--muted-foreground,#4c453a); max-width:84ch; }}
</style></head><body>
<h1>Quatre successions de salles, fusionnant aux moments majeurs</h1>
<p class="sub">Quatre couloirs de salles indépendants — <b>une salle par fait du corpus</b> : occidental {sum(1 for f in FACTS if f["br"]=="occ")} salles, palestinien {sum(1 for f in FACTS if f["br"]=="pal")}, israélien {sum(1 for f in FACTS if f["br"]=="isr")}, territoire {sum(1 for f in FACTS if f["br"]=="ter")} (les {sum(len(m["ids"]) for m in MOM)} faits des grands moments vivent dans les salles communes, pas dans les couloirs). Les couloirs sont étanches : aucune porte de l'un à l'autre. Ils ne se rejoignent qu'aux <b>7 salles communes</b> dorées, seules pièces qui traversent les quatre récits.</p>
<div class="legend">
 <span><i class="key" style="background:rgba(46,125,91,.35)"></i>salle du couloir = un fait (année inscrite)</span>
 <span><i class="key" style="background:rgba(185,138,47,.35);border:1.5px solid #b98a2f"></i>salle commune = moment majeur, les 4 couloirs fusionnent</span>
 <span><i class="key" style="background:#b98a2f"></i>vitrine centrale de la commune</span>
 <span><i class="key" style="border:1.5px dashed #777;background:none"></i>face muette d'un brin (rideau)</span>
 <span><i class="key" style="background:#b98a2f;height:3px"></i>portes dorées</span>
</div>
{svg}
<p class="note">Lecture : on entre par un couloir, on marche le long de ses salles-datées (la circulation centrale du couloir), et on n'en sort jamais pour traverser un autre récit. Aux grands moments, une porte dorée ouvre sur la salle commune : la même pièce, vue des quatre couloirs, avec ses niches — affiche quand le récit du couloir parle à ce moment, rideau quand il se tait. La commune traversée, chaque couloir reprend seul sa succession de salles.</p>
<p class="note" style="opacity:.7">Généré par <code>scripts/gen_plan_salles.py</code> depuis <code>perspective-I2-data.js</code> (un fait = une salle) et <code>perspective-K-data.js</code> (les 7 moments, seuls points de fusion) — relancer après tout changement de corpus.</p>
</body></html>"""

path = os.path.join(KIT, "interne", "plan-quatre-salles.html")
open(path, "w", encoding="utf-8").write(html)
print("written", path, len(html), "octets")
print("largeur totale du bâtiment:", round(TOTW,1), "m — profondeur:", DEPTH, "m")
for k in ORDER:
    inhall = sum(m["who"][k] for m in MOM)
    print(k, "salles de couloir:", sum(1 for f in FACTS if f["br"]==k) - inhall,
          "| faits portés par les communes:", inhall, end="  ")
print()
