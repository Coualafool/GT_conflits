#!/usr/bin/env python3
# Plan — « chapelet de carrefours » (d'après le croquis de l'utilisateur, adapté à 4).
# Le motif du croquis : un carrefour (hub) en haut, d'où partent des colonnes
# indépendante ; chaque colonne = une suite de pièces reliées par des cols
# (pièce–col–pièce…) ; les colonnes ne se touchent JAMAIS entre elles ; leurs
# extrémités ouvertes pendent dans le carrefour SUIVANT.
# Adaptation 4 récits + répétition autant que nécessaire : le temps coule de HAUT
# en BAS ; un carrefour = une salle commune (les 7 grands moments) ; entre deux
# carrefours, chaque récit déroule sa chaîne de salles (une par fait de sa
# fenêtre) — répétée autant de fois que le corpus l'exige ; fenêtre vide = la
# chaîne est un simple conduit (les « pendants » ouverts du croquis).
# Sources : perspective-I2-data.js (faits) + perspective-K-data.js (les 7 moments).
# Usage : python3 scripts/gen_plan_hubs.py
import json, os, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

js = r'''
const fs=require("fs"); global.window={};
eval(fs.readFileSync("frise/perspective-I2-data.js","utf8")+"\n"+fs.readFileSync("frise/perspective-K-data.js","utf8")+"\n"+`
const BRINS=TRACK_KEYS, brOf=i=>BRINS[EV[i][1]];
const MOM=window.__K_ALLIES.plazas.slice().sort((a,b)=>a.y0-b.y0);
const seg=[...Array(MOM.length+1)].map(()=>({occ:[],pal:[],isr:[],ter:[]}));
EV.forEach((e,i)=>{ const y=e[0]; let j=0; while(j<MOM.length && y>MOM[j].y1) j++;
  if(j<MOM.length && y>=MOM[j].y0) return;
  seg[j][brOf(i)].push({y,t:e[2]}); });
console.log(JSON.stringify({seg, MOM:MOM.map(m=>({y0:m.y0,y1:m.y1,label:m.label,
  who:Object.fromEntries(BRINS.map(k=>[k,m.ids.filter(i=>brOf(i)===k).length]))})),
  titles:{occ:"Occidental",pal:"Palestinien",isr:"Israélien",ter:"Territoire"},
  colors:{occ:"#8a5a3c",pal:"#2e7d5b",isr:"#2f6f9e",ter:"#a06417"}}));
`);'''
out = subprocess.run(["node", "-e", js], cwd=KIT, capture_output=True, text=True)
if out.returncode != 0:
    sys.exit("node lecture corpus a échoué :\n" + out.stderr)
D = json.loads(out.stdout)
SEG, MOM, TITLES, COL = D["seg"], D["MOM"], D["titles"], D["colors"]
ORDER = ["occ", "pal", "isr", "ter"]

# --- géométrie (mètres) ---
CW, GAP = 10.0, 4.0                 # largeur de colonne, espace entre colonnes
ROOMW, ROOMH = 7.0, 3.6             # pièce
NECKW, NECKH = 2.6, 1.4             # col entre pièces
STUB = 1.6                          # tronçon d'attache vers le carrefour
HUBH = 9.0
LM, TOPM, BOTM = 60, 40, 30
S = 9.0                             # px par mètre
TOTW = LM + len(ORDER)*CW + (len(ORDER)-1)*GAP + 20

def trunc(s, k=16):
    s = (s or "").strip().replace("&","&amp;").replace("<","&lt;").replace('"',"&quot;")
    return s if len(s) <= k else s[:k-1].rstrip()+"…"

cx = lambda i: LM + i*(CW+GAP) + CW/2

# --- hauteurs des niveaux (alternance hub / segment) ---
def seg_h(j):
    return max(len(SEG[j][k]) for k in ORDER) or 1
levels = []   # (genre, données, hauteur_m)
levels.append(("start", None, 6.0))
for j in range(len(MOM)+1):
    mx = max(len(SEG[j][k]) for k in ORDER)
    h = 2*STUB + (mx*ROOMH + max(0, mx-1)*NECKH if mx else 0)
    levels.append(("seg", j, h))
    if j < len(MOM):
        levels.append(("hub", j, HUBH))
levels.append(("end", None, 5.0))
TOTALH = sum(h for _, _, h in levels)
H = (TOTALH + TOPM + BOTM)*S
W = TOTW*S

svg = [f'<svg viewBox="0 0 {W:.0f} {H:.0f}" width="100%" style="display:block" '
       f'role="img" aria-label="plan en chapelet : salles communes en carrefours horizontaux, quatre colonnes de salles par récit, temps de haut en bas">']

y = TOPM
def ypx(m): return m*S

# dessin d'un carrefour (hub) entre y et y+HUBH
def draw_hub(y0, m, first=False, last=False):
    x0, x1 = LM-10, LM+len(ORDER)*(CW+GAP)-GAP+10
    svg.append(f'<rect x="{x0*S:.1f}" y="{ypx(y0):.1f}" width="{(x1-x0)*S:.1f}" height="{HUBH*S:.1f}" class="commune"/>')
    cxm = (x0+x1)/2
    if m is None:
        lab = "ENTRÉE · 1888" if first else "FIN · 2026"
        svg.append(f'<text x="{cxm*S:.1f}" y="{ypx(y0+HUBH/2-1):.1f}" class="hub-t" text-anchor="middle">{lab}</text>')
    else:
        svg.append(f'<text x="{cxm*S:.1f}" y="{ypx(y0+2.6):.1f}" class="hub-lab" text-anchor="middle">SALLE COMMUNE · {int(m["y0"])}–{int(round(m["y1"]))} — {trunc(m["label"],34)}</text>')
        q = 0
        for k in ORDER:
            if m["who"][k]:
                svg.append(f'<rect x="{(cxm-14+q*6)*S:.1f}" y="{ypx(y0+HUBH/2+0.4):.1f}" width="{4*S:.1f}" height="{2*S:.1f}" fill="{COL[k]}"/>')
                svg.append(f'<text x="{(cxm-12+q*6)*S:.1f}" y="{ypx(y0+HUBH/2+3.4):.1f}" class="hub-n" text-anchor="middle">{m["who"][k]}</text>')
                q += 1
            else:
                svg.append(f'<rect x="{(cxm-14+q*6)*S:.1f}" y="{ypx(y0+HUBH/2+0.4):.1f}" width="{4*S:.1f}" height="{2*S:.1f}" class="rideau"/>')
                q += 1

def draw_seg(y0, j):
    # étiquette de fenêtre de temps à gauche
    ya = MOM[j-1]["y1"] if j > 0 else 1888.5
    yb = MOM[j]["y0"] if j < len(MOM) else 2026.1
    svg.append(f'<text x="12" y="{ypx(y0+2*STUB+2):.1f}" class="fen">{int(ya)}–{int(yb)}</text>')
    for i, k in enumerate(ORDER):
        facts = SEG[j][k]
        x = cx(i)
        if not facts:
            # conduit nu : la colonne traverse sans pièce (les pendants du croquis)
            svg.append(f'<rect x="{(x-NECKW/2)*S:.1f}" y="{ypx(y0):.1f}" width="{NECKW*S:.1f}" '
                       f'height="{(2*STUB+ (0 if not facts else 0)+ (0)) *S:.1f}" class="conduit"/>')
            svg.append(f'<line x1="{x*S:.1f}" y1="{ypx(y0):.1f}" x2="{x*S:.1f}" y2="{ypx(y0+2*STUB+0):.1f}" class="conduit-line"/>')
            continue
        yy = y0 + STUB
        for q, f in enumerate(facts):
            if q: 
                svg.append(f'<rect x="{(x-NECKW/2)*S:.1f}" y="{ypx(yy):.1f}" width="{NECKW*S:.1f}" height="{NECKH*S:.1f}" class="col"/>')
                yy += NECKH
            rx = x - ROOMW/2
            svg.append(f'<rect x="{rx*S:.1f}" y="{ypx(yy):.1f}" width="{ROOMW*S:.1f}" height="{ROOMH*S:.1f}" '
                       f'class="salle" fill="{COL[k]}" fill-opacity="0.16" stroke="{COL[k]}"/>')
            if len(facts) <= 12:
                svg.append(f'<text x="{x*S:.1f}" y="{ypx(yy+ROOMH/2-0.2):.1f}" class="an" fill="{COL[k]}" text-anchor="middle">{int(f["y"])} · {trunc(f["t"],14)}</text>')
            else:
                svg.append(f'<text x="{x*S:.1f}" y="{ypx(yy+ROOMH/2+0.6):.1f}" class="an" fill="{COL[k]}" text-anchor="middle">{int(f["y"])}</text>')
            yy += ROOMH
        # attaches (deux souches comme dans le croquis, une entrée en haut, une sortie en bas)
        for dx in (-1.8, 1.8):
            svg.append(f'<line x1="{(x+dx)*S:.1f}" y1="{ypx(y0):.1f}" x2="{(x+dx)*S:.1f}" y2="{ypx(y0+STUB):.1f}" class="souche"/>')
            svg.append(f'<line x1="{(x+dx)*S:.1f}" y1="{ypx(yy):.1f}" x2="{(x+dx)*S:.1f}" y2="{ypx(yy+STUB):.1f}" class="souche"/>')

# noms de colonnes (en tête, sous l'entrée)
for i, k in enumerate(ORDER):
    svg.append(f'<text x="{cx(i)*S:.1f}" y="{ypx(TOPM-10):.1f}" class="copie" fill="{COL[k]}" text-anchor="middle">{TITLES[k].upper()}</text>')

for genre, data, h in levels:
    if genre == "start":
        draw_hub(y, None, first=True)
    elif genre == "end":
        draw_hub(y, None, last=True)
    elif genre == "hub":
        draw_hub(y, MOM[data])
    else:
        draw_seg(y, data)
    y += h
# flèche temps
svg.append(f'<line x1="{(TOTW-8)*S:.1f}" y1="{ypx(TOPM+2):.1f}" x2="{(TOTW-8)*S:.1f}" y2="{ypx(TOPM+16):.1f}" class="fleche"/>')
svg.append(f'<text x="{(TOTW-8)*S:.1f}" y="{ypx(TOPM+21):.1f}" class="temps" text-anchor="middle">temps</text>')
svg.append("</svg>")
svg_str = "".join(svg)

html = f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Plan — Chapelet de carrefours ×4</title>
<style>
 :root{{ --ink:#1d1a16; --line:#57503f; --paper:#faf7f0; --gold:#b98a2f; }}
 @media (prefers-color-scheme: dark){{ :root{{ --ink:#efe9dd; --line:#9b917d; --paper:#171512; --gold:#d7ae55; }} }}
 body{{ margin:0; padding:14px 12px 22px; background:transparent; color:var(--ink);
       font:15px/1.45 ui-sans-serif, system-ui, sans-serif; }}
 h1{{ font-size:19px; margin:0 0 2px; }}
 p.sub{{ margin:0 0 10px; color:var(--muted-foreground,#6d6455); font-size:13px; max-width:88ch; }}
 svg text{{ font-family:ui-sans-serif, system-ui, sans-serif; }}
 .commune{{ fill:rgba(185,138,47,.12); stroke:var(--gold); stroke-width:1.6; }}
 .salle{{ stroke-width:1.1; }}
 .col{{ fill:var(--muted-foreground,#d8d0c0); opacity:.45; }}
 .conduit{{ fill:var(--muted-foreground,#d8d0c0); opacity:.30; }}
 .conduit-line{{ stroke:var(--line); stroke-width:.8; stroke-dasharray:3 3; }}
 .souche{{ stroke:var(--gold); stroke-width:2.2; }}
 .rideau{{ fill:none; stroke:var(--line); stroke-width:1; stroke-dasharray:2.4 1.8; }}
 .copie{{ font-size:11px; font-weight:700; letter-spacing:.06em; }}
 .an{{ font-size:7.5px; font-weight:600; }}
 .hub-lab{{ font-size:10px; font-weight:700; fill:var(--gold); }}
 .hub-t{{ font-size:11px; font-weight:700; fill:var(--ink); letter-spacing:.2em; }}
 .hub-n{{ font-size:8px; fill:var(--muted-foreground,#4c453a); }}
 .fen{{ font-size:9px; fill:var(--muted-foreground,#6d6455); writing-mode:vertical-rl; }}
 .fleche{{ stroke:var(--muted-foreground,#6d6455); stroke-width:1.2; marker-end:none; }}
 .temps{{ font-size:9px; fill:var(--muted-foreground,#6d6455); letter-spacing:.14em; }}
 .legend{{ display:flex; flex-wrap:wrap; gap:12px 20px; margin:6px 0 12px; font-size:12.5px;
          color:var(--muted-foreground,#4c453a); }}
 .legend span{{ display:inline-flex; align-items:center; gap:7px; }}
 .key{{ width:16px; height:12px; display:inline-block; border-radius:2px; }}
 .note{{ margin:14px 0 0; font-size:12.5px; color:var(--muted-foreground,#4c453a); max-width:88ch; }}
</style></head><body>
<h1>Chapelet de carrefours — le croquis, en quatre</h1>
<p class="sub">Le motif du croquis : un carrefour, quatre colonnes indépendantes de pièces reliées par des cols, qui pendent de leurs extrémités ouvertes dans le carrefour suivant. Ici : <b>le temps coule de haut en bas</b> ; chaque carrefour doré est une <b>salle commune</b> (les 7 grands moments + l'entrée 1888 + la fin 2026) ; entre deux carrefours, chaque récit déroule sa <b>chaîne de salles — une par fait</b>, répétée autant que nécessaire ; quand un récit n'a rien à dire dans la fenêtre, sa colonne devient un simple conduit (les pendants du croquis).</p>
<div class="legend">
 <span><i class="key" style="background:rgba(185,138,47,.3);border:1.5px solid #b98a2f"></i>salle commune (carrefour : les 4 récits se rejoignent)</span>
 <span><i class="key" style="background:rgba(46,125,91,.4)"></i>salle = un fait du récit</span>
 <span><i class="key" style="background:#bbb;opacity:.7"></i>col / conduit</span>
 <span><i class="key" style="background:#b98a2f;height:3px"></i>souche d'attache au carrefour</span>
 <span><i class="key" style="border:1.5px dashed #777;background:none"></i>face muette au carrefour</span>
</div>
{svg_str}
<p class="note">Lecture : on entre en haut, on choisit une colonne = un récit ; on descend ses salles dans l'ordre du temps, sans jamais traverser une autre colonne. Chaque salle commune est un carrefour : on y retrouve les quatre récits sur le même moment, puis on repart dans n'importe quelle colonne — c'est là (et seulement là) que l'on change d'histoire. Le motif se répète huit fois, de 1888 à 2026, la longueur de chaque chaîne étant dictée par le corpus : occidental {sum(len(s["occ"]) for s in SEG)} salles, palestinien {sum(len(s["pal"]) for s in SEG)}, israélien {sum(len(s["isr"]) for s in SEG)}, territoire {sum(len(s["ter"]) for s in SEG)}.</p>
<p class="note" style="opacity:.7">Généré par <code>scripts/gen_plan_hubs.py</code> depuis <code>perspective-I2-data.js</code> et <code>perspective-K-data.js</code> — relancer après tout changement de corpus.</p>
</body></html>"""

path = os.path.join(KIT, "interne", "plan-chapelet.html")
open(path, "w", encoding="utf-8").write(html)
print("written", path, len(html), "octets | bâtiment:", round(TOTW,1), "m ×", round(TOTALH,1), "m")
print("salles:", {k: sum(len(s[k]) for s in SEG) for k in ORDER}, "| carrefours:", len(MOM)+2)
