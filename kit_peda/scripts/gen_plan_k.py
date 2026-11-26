#!/usr/bin/env python3
# Génère kit_peda/interne/plan-quatre-allees.html — plan (vue de dessus) du musée
# « Les Quatre Allées » à partir de sa géométrie RÉELLE.
# Source de vérité : frise/perspective-K-data.js (places) + frise/perspective-I2-data.js
# (corpus EV / pistes) + constants GEO reprises de frise/perspective-K-allees.html.
# Les places, leurs bornes x et leur largeur sont recalculées ici avec la MÊME formule
# que la page 3D : le plan ne peut pas dériver du bâtiment.
# Usage : python3 scripts/gen_plan_k.py   (relancer après tout changement de corpus)
import json, os, subprocess, sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TMP = os.path.join(os.environ.get("TMPDIR", "/tmp"), "kplan.json")

# 1) géométrie réelle via node (les modules de données sont du JS)
js = r'''
const fs=require("fs");
global.window={};
eval(fs.readFileSync("frise/perspective-I2-data.js","utf8")+"\n"+fs.readFileSync("frise/perspective-K-data.js","utf8")+"\n"+`
const GEO={ALLEYW:4.0,PART:0.3,PDH:0.95,PPY:1.0,PLAZAMIN:6.6,PW0:1.15};
const BRINS=TRACK_KEYS, ALLEYS=["ter","pal","isr","occ"];
const brOf=(i)=>BRINS[EV[i][1]];
const P=window.__K_ALLIES.plazas.map((p,j)=>{
  let maxb=1; for(const b of BRINS){const n=p.ids.filter(i=>brOf(i)===b).length; if(n>maxb)maxb=n;}
  const W=Math.max(GEO.PLAZAMIN,GEO.PW0*maxb+2*GEO.PDH+1.4);
  return {j,y0:p.y0,y1:p.y1,label:p.label,ids:p.ids,W,maxb};
});
const A=window.__K_ALLIES.segAfter, minY=window.__K_ALLIES.minY, maxY=window.__K_ALLIES.maxY;
const SEGDEF=[];
for(let j=0;j<=P.length;j++){
  const ya=j===0?minY:A[j-1][0], yb=j===P.length?maxY:A[j][1];
  SEGDEF.push({j,ya,yb});
}
let x=0;
for(let j=0;j<=P.length;j++){
  SEGDEF[j].x0=x; SEGDEF[j].x1=x+(SEGDEF[j].yb-SEGDEF[j].ya)*GEO.PPY; x=SEGDEF[j].x1;
  if(j<P.length){P[j].x0=x; P[j].x1=x+P[j].W; x=P[j].x1;}
}
for(const p of P){ p.voices={}; for(const k of ALLEYS) p.voices[k]=p.ids.filter(i=>brOf(i)===k).length; }
console.log(JSON.stringify({TLEN:x,minY,maxY,P,SEGDEF,ALLEYS,
  labels:{ter:"Le territoire",pal:"Palestine / territoires palestiniens",isr:"Yichouv / Israël",occ:"Influence occidentale / ONU"}}));
`);
'''
out = subprocess.run(["node", "-e", js], cwd=KIT, capture_output=True, text=True)
if out.returncode != 0:
    sys.exit("node géométrie a échoué :\n" + out.stderr)
open(TMP, "w").write(out.stdout)

d = json.loads(out.stdout)
P, SEG, TLEN = d["P"], d["SEGDEF"], d["TLEN"]
ALLEYS = ["ter", "pal", "isr", "occ"]
LBL = d["labels"]
COL = {"occ": "#8a5a3c", "pal": "#2e7d5b", "isr": "#2f6f9e", "ter": "#a06417"}
ERAS = [(1888,1917,"#6e6459"),(1917,1948,"#8a6d3b"),(1948,1967,"#3d6b8a"),
        (1967,1993,"#8a3d3d"),(1993,2005,"#4d7a4d"),(2005,2023,"#6b4d7a"),(2023,2026,"#994d1a")]

S = 13.0                     # px par mètre
WALL = 0.35
CH = 4.0                     # largeur d'allée
DEPTHH = 4*CH + 5*WALL       # 17.75 m
TOPPAD, BOTPAD, LEFypad = 46, 40, 8
BAND2_X = 106.8              # coupe entre place 3 et place 4

def ay(ai):
    return TOPPAD + WALL + ai*(CH+WALL)

def x2(px, band_x0):
    return LEFypad + (px - band_x0)*S

def yr2x(yr):
    for s in SEG:
        if s["ya"] <= yr <= s["yb"]:
            t = (yr-s["ya"])/max((s["yb"]-s["ya"]),1e-9)
            return s["x0"] + t*(s["x1"]-s["x0"])
    for p in P:
        if p["y0"] <= yr <= p["y1"]: return (p["x0"]+p["x1"])/2
    return 0 if yr < 1888 else TLEN

def band(x0, x1):
    w = (x1-x0)*S + 2*LEFypad
    h = TOPPAD + DEPTHH + BOTPAD + 14
    out = [f'<svg viewBox="0 0 {w:.0f} {h:.0f}" width="100%" style="display:block" role="img" aria-label="plan du musée, bande {int(x0)}-{int(x1)} m">']
    for (a,b,c) in ERAS:
        xa, xb = max(a,1888.5), min(b,2026.1)
        exa, exb = x2(yr2x(xa), x0), x2(yr2x(xb), x0)
        if exb > 6 and exa < w-6 and exb > exa:
            out.append(f'<rect x="{exa:.1f}" y="6" width="{exb-exa:.1f}" height="7" fill="{c}" opacity="0.85"/>')
            if exb-exa > 60: out.append(f'<text x="{exa+4:.1f}" y="15.5" class="era">{int(xa)}–{int(xb)}</text>')
    bx0, bx1 = x2(x0, x0), x2(x1, x0)
    top, bot = TOPPAD, TOPPAD+DEPTHH
    out.append(f'<rect x="{bx0:.1f}" y="{top:.1f}" width="{bx1-bx0:.1f}" height="{DEPTHH:.1f}" class="env"/>')
    for p in P:
        if p["x1"] <= x0+0.01 or p["x0"] >= x1-0.01: continue
        px0, px1 = max(p["x0"],x0), min(p["x1"],x1)
        rx0, rx1 = x2(px0,x0), x2(px1,x0)
        out.append(f'<rect x="{rx0:.1f}" y="{top:.1f}" width="{rx1-rx0:.1f}" height="{DEPTHH:.1f}" class="plaza"/>')
        cx, cy = (rx0+rx1)/2, (top+bot)/2
        out.append(f'<rect x="{cx-7:.1f}" y="{cy-7:.1f}" width="14" height="14" transform="rotate(45 {cx:.1f} {cy:.1f})" class="case"/>')
        for ai,k in enumerate(ALLEYS):
            yc = ay(ai)+CH/2
            nx = x2(max(p["x0"],x0),x0)+9
            if p["voices"][k]:
                out.append(f'<rect x="{nx:.1f}" y="{yc-3.2:.1f}" width="6.4" height="6.4" fill="{COL[k]}"/>')
            else:
                out.append(f'<rect x="{nx:.1f}" y="{yc-3.2:.1f}" width="6.4" height="6.4" class="rideau"/>')
            for e in (rx0, rx1):
                out.append(f'<line x1="{e:.1f}" y1="{ay(ai)+0.5:.1f}" x2="{e:.1f}" y2="{ay(ai)+CH-0.5:.1f}" class="porte"/>')
        lx = (rx0+rx1)/2
        out.append(f'<text x="{lx:.1f}" y="{top+DEPTHH+11:.1f}" class="place-lab" text-anchor="middle">{p["label"]}</text>')
        out.append(f'<text x="{lx:.1f}" y="{top+DEPTHH+21:.1f}" class="place-year" text-anchor="middle">{int(p["y0"])}–{int(round(p["y1"]))}</text>')
    for ai,k in enumerate(ALLEYS):
        ytop = ay(ai)
        out.append(f'<rect x="{bx0+1:.1f}" y="{ytop+0.6:.1f}" width="{bx1-bx0-2:.1f}" height="{CH-1.2:.1f}" fill="{COL[k]}" opacity="0.10"/>')
        out.append(f'<line x1="{bx0+3:.1f}" y1="{ytop+CH/2:.1f}" x2="{bx1-3:.1f}" y2="{ytop+CH/2:.1f}" class="or" stroke-dasharray="1 7"/>')
        out.append(f'<text x="{bx0+6:.1f}" y="{ytop+CH/2-4:.1f}" class="alley-lab" fill="{COL[k]}">ALLÉE · {LBL[k].upper()}</text>')
    for ai in range(4):
        for w in (ai, ai+1):
            yw = ay(ai) - WALL if w==ai else ay(ai)+CH
            segs, cur = [], bx0
            for p in P:
                if p["x1"] <= x0 or p["x0"] >= x1: continue
                rx0, rx1 = x2(max(p["x0"],x0),x0), x2(min(p["x1"],x1),x0)
                if rx0 > cur: segs.append((cur,rx0))
                cur = rx1
            if cur < bx1: segs.append((cur,bx1))
            for (a,b) in segs:
                if b>a+0.5: out.append(f'<line x1="{a:.1f}" y1="{yw:.1f}" x2="{b:.1f}" y2="{yw:.1f}" class="mur"/>')
    out.append(f'<text x="{bx1-2:.1f}" y="{top-10:.1f}" class="temps" text-anchor="end">temps →</text>')
    out.append("</svg>")
    return "".join(out)

b1 = band(0, BAND2_X)
b2 = band(BAND2_X, max(p["x1"] for p in P))

html = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Plan — Les Quatre Allées</title>
<style>
 :root{ --ink:#1d1a16; --line:#57503f; --paper:#faf7f0; --gold:#b98a2f; }
 @media (prefers-color-scheme: dark){ :root{ --ink:#efe9dd; --line:#9b917d; --paper:#171512; --gold:#d7ae55; } }
 body{ margin:0; padding:14px 12px 22px; background:transparent; color:var(--ink);
       font:15px/1.45 ui-sans-serif, system-ui, sans-serif; }
 h1{ font-size:19px; margin:0 0 2px; letter-spacing:.01em; }
 p.sub{ margin:0 0 12px; color:var(--muted-foreground,#6d6455); font-size:13px; }
 svg text{ font-family:ui-sans-serif, system-ui, sans-serif; }
 .env{ fill:none; stroke:var(--ink); stroke-width:1.6; }
 .mur{ stroke:var(--ink); stroke-width:1.1; }
 .porte{ stroke:var(--gold); stroke-width:1.8; }
 .plaza{ fill:rgba(185,138,47,.13); stroke:var(--gold); stroke-width:1.4; }
 .case{ fill:var(--gold); stroke:var(--paper); stroke-width:1; }
 .rideau{ fill:none; stroke:var(--line); stroke-width:0.9; stroke-dasharray:2 1.6; }
 .or{ stroke:var(--gold); stroke-width:1; }
 .alley-lab{ font-size:10.5px; font-weight:700; letter-spacing:.06em; }
 .place-lab{ font-size:10px; fill:var(--ink); }
 .place-year{ font-size:9px; fill:var(--muted-foreground,#6d6455); }
 .era{ font-size:8.5px; fill:var(--paper); font-weight:600; }
 .temps{ font-size:10px; fill:var(--muted-foreground,#6d6455); letter-spacing:.12em; }
 .legend{ display:flex; flex-wrap:wrap; gap:14px 22px; margin:6px 0 14px; font-size:12.5px; color:var(--muted-foreground,#4c453a); }
 .legend span{ display:inline-flex; align-items:center; gap:7px; }
 .key{ width:16px; height:12px; display:inline-block; border-radius:2px; }
 h2.cut{ font-size:12px; text-transform:uppercase; letter-spacing:.14em; color:var(--muted-foreground,#6d6455);
        border-top:1px solid var(--line,#c8c0b0); padding-top:10px; margin:18px 0 8px; font-weight:600; }
 .note{ margin:14px 0 0; font-size:12.5px; color:var(--muted-foreground,#4c453a); max-width:72ch; }
</style></head><body>
<h1>Les Quatre Allées — plan du musée</h1>
<p class="sub">Géométrie réelle du bâtiment (échelle ~13 px/m, coupé en deux bandes). Le temps court de gauche à droite : 1888 → 2026. Quatre allées indépendantes, sept places communes dorées où les quatre allées convergent.</p>
<div class="legend">
 <span><i class="key" style="background:rgba(185,138,47,.3);border:1.5px solid #b98a2f"></i>place commune (fait à quatre voix, vitrine au centre)</span>
 <span><i class="key" style="background:#b98a2f"></i>vitrine</span>
 <span><i class="key" style="background:#555"></i>affiche de niche (le brin parle)</span>
 <span><i class="key" style="border:1.5px dashed #777;background:none"></i>rideau (le brin se tait)</span>
 <span><i class="key" style="background:#b98a2f;height:3px"></i>portes dorées dans les places</span>
</div>
""" + b1 + """<h2 class="cut">suite du parcours</h2>""" + b2 + """
<p class="note">Chaque allée est un couloir continu, du seuil (1888) à son terminus (2026) : on n'emprunte jamais l'allée d'un autre brin. Une place commune traverse le bâtiment d'un mur à l'autre : les quatre allées y entrent par des portes dorées, chacune trouvant en face sa niche — une affiche quand son brin raconte l'événement, un rideau quand son brin se tait. Puis chaque allée repart seule vers la suite du temps.</p>
<p class="note" style="opacity:.7">Généré par <code>scripts/gen_plan_k.py</code> — relancer après tout changement de corpus.</p>
</body></html>"""

path = os.path.join(KIT, "interne", "plan-quatre-allees.html")
open(path, "w", encoding="utf-8").write(html)
print("written", path, len(html), "bytes")
