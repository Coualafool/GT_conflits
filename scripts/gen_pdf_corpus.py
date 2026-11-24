#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Génère les modules de données des variantes I2 (corpus PDF seul) et I3 (fusion PDF + kit).

Source : Ressources/EVENEMENTS-Outil peda Palestine_Israel-5.md (tables Markdown, 4 pistes)
         frise/poc-data.js (EV kit, 93 événements) + frise/poc-perspectives.js (LV kit) pour la fusion.

Sorties : frise/perspective-I2-data.js  — EV_PDF (alias EV), TRACKS (4), ERAS_PDF, helpers
          frise/perspective-I3-data.js  — EV fusion, LV, REN (vides côté pdf), TRACK_SRC
          interne/RAPPORT-FUSION-PDF.md — journal du dédoublonnage (traçabilité)

Usage : python3 scripts/gen_pdf_corpus.py [--dry]
"""
import re, sys, unicodedata, difflib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD = ROOT / "Ressources" / "EVENEMENTS-Outil peda Palestine_Israel-5.md"
DRY = "--dry" in sys.argv

MONTHS = {"janv.":1,"févr.":2,"mars":3,"avr.":4,"mai":5,"juin":6,"juil.":7,"août":8,"sept.":9,"oct.":10,"nov.":11,"déc.":12}

TRACKS = [  # (clé, nom du document, nom court, couleur) — couleurs alignées sur le kit (pal/isr/occ)
    ("occ", "Influence occidentale / décisions de l'ONU", "Occidental", "#8a5a3c"),
    ("pal", "Palestine / territoires palestiniens",        "Palestinien", "#2e7d5b"),
    ("isr", "Yichouv / Israël",                             "Israélien",  "#2f6f9e"),
    ("ter", "Le territoire",                                "Territoire", "#a06417"),
]
TK = [k for k, *_ in TRACKS]

def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()

def hex2rgb(h):
    h = h.lstrip("#")
    return ",".join(str(int(h[i:i+2], 16)) for i in (0, 2, 4))

def jsq(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

# ---------------------------------------------------------------- parse MD --
def parse_md():
    events, track = [], None
    for line in MD.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^##\s+Piste\s+\d+\s+—\s+(.*)$", line)
        if m:
            track = None
            for k, n, *_ in TRACKS:
                if norm(n)[:14] in norm(m.group(1)):
                    track = k
            continue
        if not line.startswith("| ") or track is None:
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 2 or cells[0] in ("Date",) or set(cells[0]) <= set("- "):
            continue
        t = parse_date(cells[0])
        if t is None:
            continue
        events.append({"t": t, "track": track, "raw": cells[1], "date": cells[0]})
    return events

def parse_date(cell):
    nums = re.findall(r"\d{4}", cell)
    if not nums:
        return None
    months = [MONTHS[m] for m in MONTHS if m in cell]
    mo = months[0] if months else 7  # sans mois : milieu d'année (juillet)
    if len(nums) >= 2:
        a, b = int(nums[0]), int(nums[1])
        if b < a:                      # "nov. 1949-1951" déjà 4 chiffres ici ; garde-fou
            b = a
        return round((a + b) / 2 + (mo - 0.5) / 12, 2)
    return round(int(nums[0]) + (mo - 0.5) / 12, 2)

def split_title(raw, maxlen=92):
    t = " ".join(raw.split())
    m = re.match(r"^(.{14,%d}?[a-zûï)»'])(?:\.\s|\s+[A-Z«0-9(]|\s+[:,]\s)(.+)$" % maxlen, t, re.S)
    if m and len(m.group(2)) > 30:
        return m.group(1).rstrip(" ,;:"), m.group(2).strip()
    if len(t) > maxlen + 40:
        cut = t.rfind(" ", 0, maxlen)
        return t[:cut].rstrip(",;:"), t[cut:].strip()
    return t, ""

# ------------------------------------------------------------ kit EV + LV ---
def load_kit():
    src = (ROOT / "frise" / "poc-data.js").read_text(encoding="utf-8")
    body = src.split("const EV=[", 1)[1].rsplit("];", 1)[0]
    evs = []
    for t, pal, ti, de, ch, sq in re.findall(
            r"\[([0-9.]+),(\d+),\"((?:[^\"\\]|\\.)*)\",\"((?:[^\"\\]|\\.)*)\",(\d+),(\d+)\]", body):
        evs.append([float(t), int(pal), ti.replace('\\"', '"'), de.replace('\\"', '"'), int(ch), int(sq)])
    psrc = (ROOT / "frise" / "poc-perspectives.js").read_text(encoding="utf-8")
    lvsrc = psrc.split("const LV=[", 1)[1].split("];", 1)[0]
    lv = [list(map(int, m)) for m in re.findall(r"\[([012]),([012]),([012])\]", lvsrc)]
    ren_src = psrc.split("const REN={", 1)[1].split("\n};", 1)[0]
    pers_src = psrc.split("const PERS={", 1)[1].split("\n};", 1)[0]
    return evs, lv, ren_src, pers_src

# ------------------------------------------------------------------ merge ---
# doublons avérés = même fait déjà au kit ; les variantes de cadrage (« la même date
# vue autrement ») sont au contraire la richesse de la fusion -> whitelisting explicite.
# Clé : (année arrondie du PDF, 30 premiers caractères normalisés du texte).
KEEP_DISTINCT = {
    (1936, "grande revolte arabe anti brit"),  # le kit date 1936.3 ; le PDF ouvre sur le 1933 anti-colonial : cadrage distinct
    (1948, "independance d israel"),        # le kit dit « proclamation + première guerre » ; angle PDF = l'acte
    (1995, "yasser arafat accepte la pa"),  # l'acceptation palestinienne, absente du kit
    (1995, "le gouvernement d yitzhak r"),  # la reconnaissance OLP par Rabin, distincte de l'assassinat
    (1996, "echec des mises en applicat"),  # l'échec d'application, absent du kit
    (2004, "evacuation des 21 colonies "),  # 21+4 colonies chiffrées, datées 2004 par le document
    (2004, "gaza est dependante d israel"),  # dépendances vitales, pas le désengagement
}

def _key(e):
    return (round(e["t"]), norm(e["raw"])[:30])

def merge(pdf, kit):
    kept, dups = [], []
    for e in pdf:
        if _key(e) in KEEP_DISTINCT:
            kept.append(e); continue
        best, score = None, 0.0
        for ki, k in enumerate(kit):
            if abs(k[0] - e["t"]) > 1.6:
                continue
            tp = toks(e["raw"]) ; tk = toks(k[2])
            co = len(tp & tk) / min(len(tp), len(tk)) if tp and tk else 0.0
            cr = difflib.SequenceMatcher(None, norm(e["raw"]), norm(k[2] + " " + k[3])).ratio()
            s = max(co if co >= 0.5 else 0.0, cr)
            if s > score:
                best, score = ki, s
        if best is not None and score >= 0.5:
            dups.append((e, best, round(score, 2)))
        else:
            kept.append(e)
    return kept, dups

STOP = set("le la les un une des du de d au aux et en dans par pour sur avec sans vers dont que qui est sont fait faite faites comme".split())
def toks(s):
    t = {w for w in norm(s)[:120].split() if len(w) >= 4 and w not in STOP}
    return t

TRACK_LV = {"pal": [2, 0, 0], "isr": [0, 2, 0], "occ": [0, 0, 2], "ter": [1, 1, 2]}

# faits du PDF qu'un récit pousse au premier plan (clé = récit, mot-clé normalisé dans le texte)
CENTRAL = [
    ("isr","pogrom"),("isr","1ere aliya"),("isr","sionisme"),("isr","herzl"),("isr","congres sioniste"),
    ("isr","tel aviv"),("isr","hoavaro"),("isr","autosuffisance"),("isr","loi du retour"),
    ("isr","independance d israel"),("isr","accueil de 500"),("isr","institutions politiques"),
    ("isr","collecte de fonds"),
    ("pal","nakba"),("pal","emeutes anti juives"),("pal","grande revolte"),("pal","plan peel"),
    ("pal","livre blanc"),("pal","plan de partage"),("pal","effondrement de l economie"),
    ("pal","resistance arabe"),("pal","78"),("pal","promettre l independance"),("pal","85 de musulmans"),
    ("occ","sykes"),("occ","balfour"),("occ","mandat britannique"),("occ","evian"),
    ("occ","nuit de cristal"),("occ","partage"),("occ","revolution bol"),
    ("ter","blocus"),("ter","barriere de 65"),("ter","dome de fer"),("ter","valeur nationale"),
    ("ter","etat national du peuple juif"),("ter","7 oct"),("ter","1195"),("ter","attaques meurtrieres"),
    ("ter","colonisation"),("ter","dependante d israel"),
]

def lv_for_pdf(e):
    base = list(TRACK_LV[e["track"]])
    n = norm(e["raw"])
    for k, kw in CENTRAL:
        if k == e["track"] and k in TRACK_LV and k != "ter" and norm(kw) in n:
            base[{"pal": 0, "isr": 1, "occ": 2}[k]] = 2
    return base

# ------------------------------------------------------------------- main ---
def main():
    pdf = parse_md()
    kit, kit_lv, ren_src, pers_src = load_kit()
    by_track = {}
    for e in pdf:
        by_track[e["track"]] = by_track.get(e["track"], 0) + 1
    print(f"PDF: {len(pdf)} datés  {by_track} | kit: {len(kit)} (LV {len(kit_lv)})")

    kept, dups = merge(pdf, kit)
    print(f"fusion : +{len(kept)} apports, {len(dups)} doublons kit écartés")

    # --------------------------- module I2 -------------------------------
    pdf_sorted = sorted(pdf, key=lambda e: e["t"])
    oi = {k: i for i, k in enumerate(TK)}
    rows = []
    for e in pdf_sorted:
        title, desc = split_title(e["raw"])
        rows.append(f'  [{e["t"]},{oi[e["track"]]},"{jsq(title)}","{jsq(desc)}"]')
    tmin = round(pdf_sorted[0]["t"] - 2, 2)
    tmax = round(pdf_sorted[-1]["t"] + 1.6, 2)

    tracks_js = ",\n".join(
        f'  {k}:{{key:"{k}",name:"{jsq(n)}",short:"{jsq(s)}",c:"{c}",cLight:"rgba({hex2rgb(c)},.10)",count:{by_track.get(k,0)}}}'
        for k, n, s, c in TRACKS)
    labs = {"occ": ["Empires & promesses", "Mandat & partages", "Diplomatie contestée"],
            "pal": ["Société & révoltes", "Nakba & dépossessions", "Intifadas & après"],
            "isr": ["Yichouv & migrations", "État & guerres", "Droite & territoire"],
            "ter": ["Dépendances & barrières", "Blocus & boucliers", "Lois & guerre"]}
    eras_js = []
    for k in TK:
        ts = [e["t"] for e in pdf_sorted if e["track"] == k]
        lo, hi = min(ts), max(ts)
        th = (hi - lo) / 3
        c = dict((t[0], t[3]) for t in TRACKS)[k]
        bands = [(lo, lo + th), (lo + th, lo + 2 * th), (lo + 2 * th, hi + 0.02)]
        eras_js.append("  " + k + ":[" + ",".join(
            '{a:%g,b:%g,label:"%s",c:"%s"}' % (round(a, 2), round(b, 2), l, c)
            for (a, b), l in zip(bands, labs[k])) + "]")
    eras_block = ",\n".join(eras_js)

    ev2_block = ",\n".join(rows)
    _placeholder = None
    mod2 = f"""// Corpus « outil péda n°5 » — module de données pur, seul corpus de la variante I2.
// Généré par scripts/gen_pdf_corpus.py depuis Ressources/EVENEMENTS-Outil peda Palestine_Israel-5.md — ne pas éditer à la main.
// EV : [année+mois/12, indice de piste 0..3, titre, description]. TRANSCRIPTION FIDÈLE du document (coquilles et marques [?]/[!] conservées).
const T_MIN={tmin}, T_MAX={tmax};
const NOW={pdf_sorted[-1]["t"]};
const TRACK_KEYS=["{"\",\"".join(TK)}"];
const TRACKS={{
{tracks_js}
}};
const ERAS=[{{a:1888,b:1917,label:"Empires & promesses",c:"#6e6459"}},{{a:1917,b:1948,label:"Mandat & partages",c:"#8a6d3b"}},{{a:1948,b:1967,label:"Guerres & exils",c:"#3d6b8a"}},{{a:1967,b:1993,label:"Occupation & Intifadas",c:"#8a3d3d"}},{{a:1993,b:2005,label:"Oslo & effondrement",c:"#4d7a4d"}},{{a:2005,b:2023,label:"Blocus & lois",c:"#6b4d7a"}},{{a:2023,b:2026.1,label:"Guerre à Gaza",c:"#994d1a"}}];
const ERAS_DOC={{
{eras_block}
}};
const EV=[
{ev2_block}
];
const MONTHS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function eraOfTrack(k,y){{for(const e of ERAS_DOC[k]){{if(y>=e.a&&y<e.b)return e;}}return ERAS_DOC[k][ERAS_DOC[k].length-1];}}
const PERS_KEYS=TRACK_KEYS;
const THSES={{occ:"Des décisions prises d'en haut : promesses impériales, mandats, partages votés sans les concerné·es, puis une diplomatie dont les résolutions s'accumulent sans s'appliquer.",
 pal:"Une population déjà là : vie rurale et citadine, révoltes écrasées, expulsion de 1948, et une résistance qui cherche ses formes — soulèvement, droit, élections.",
 isr:"Une immigration et un État : fuir les persécutions, bâtir le Yichouv, faire la guerre, recevoir des vagues d'arrivées, et déplacer le pouvoir vers la droite.",
 ter:"Le sol d'abord : qui contrôle l'eau, le courant, les frontières, les colonies et les murs — la carte comme objet politique permanent."}};
const PERS={{}}; for(const k of TRACK_KEYS){{PERS[k]=Object.assign({{thesie:THSES[k]}},TRACKS[k]);}}
function lvOf(i,k){{return (EV[i][3]&&EV[i][3].length>3)?2:1;}}
function titleOf(i,k){{return EV[i][2];}}
function divergent(i){{return /\[[?!]\]/.test(EV[i][2]+" "+EV[i][3]);}}
function nTold(k){{let c=0;for(const e of EV)if(e[1]===TRACK_KEYS.indexOf(k))c++;return c;}}
function pEvs(k){{const out=[];for(let i=0;i<EV.length;i++)if(EV[i][1]===TRACK_KEYS.indexOf(k))out.push({{i,l:2,ev:EV[i],t:EV[i][2]}});return out;}}
function eraOf(y){{for(let i=0;i<ERAS.length;i++){{if(y>=ERAS[i].a&&y<ERAS[i].b)return ERAS[i];}}return ERAS[ERAS.length-1];}}
function escAttr(s){{return String(s).replace(/"/g,"&quot;");}}
"""
    # --------------------------- module I3 -------------------------------
    merged = []
    for i, k in enumerate(kit):
        merged.append((k[0], 0, {"src": "kit", "k": k, "lv": kit_lv[i], "i": i}))
    for e in kept:
        title, desc = split_title(e["raw"])
        merged.append((e["t"], 1, {"src": "pdf", "e": e, "title": title, "desc": desc}))
    merged.sort(key=lambda m: (m[0], m[1]))

    ev3, lv3, src3 = [], [], []
    for t, _, m in merged:
        if m["src"] == "kit":
            k = m["k"]
            ev3.append(f'[{k[0]},{k[1]},"{jsq(k[2])}","{jsq(k[3])}",{k[4]},{k[5]},0]')
            lv3.append(m["lv"])
            src3.append(["kit", None])
        else:
            e = m["e"]
            ev3.append(f'[{t},1,"{jsq(m["title"])}","{jsq(m["desc"])}",null,null,1]')
            lv3.append(lv_for_pdf(e))
            src3.append(["pdf", e["track"]])
    # REN kit renuméroté : les kit gardent leur ordre relatif — recalcul des index
    kitpos = {}
    p = 0
    for t, _, m in merged:
        if m["src"] == "kit":
            kitpos[m["i"]] = p
        p += 1
    ren_map = re.sub(r"(?m)^(\s*)(\d+):", lambda mo: mo.group(1) + str(kitpos[int(mo.group(2))]) + ":", ren_src)
    pers_block = pers_src

    lv2_block = ",\n  ".join("[" + ",".join(map(str, l)) + "]" for l in lv3)
    mod3 = f"""// Fusion kit (93 faits, récits du kit) + outil péda n°5 ({len(kept)} faits ajoutés, {len(dups)} doublons écartés).
// Généré par scripts/gen_pdf_corpus.py — ne pas éditer à la main. Journal du dédoublonnage : interne/RAPPORT-FUSION-PDF.md
// EV : [année, palier, titre, description, chapitre|null, séq|null, src] — src 0 = kit, 1 = outil péda (fidèle au document).
// LV : niveaux [pal,isr,occ] — faits du kit : sélection du kit ; faits ajoutés : rôle par défaut de leur piste du document,
//      porté au premier plan par la liste CENTRAL du générateur. Les faits du PDF sont des TRANSCRIPTIONS fidèles (coquilles conservées).
const T_MIN=1895, T_MAX=2028.6;
const NOW=2026.3;
const MONTHS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const TRACK_SRC=[{",".join('"%s"' % s[0] if s[0]=="kit" else '"%s"' % s[1] for s in src3)}]; // "kit" | piste du document d'origine
const EV=[
{",\n".join(ev3)}
];
const LV=[
{lv2_block}
];
const PERS_KEYS=["pal","isr","occ"];
const PERS={{{pers_block}}};
const REN={{{ren_map}}};
const LVKEY={{pal:0,isr:1,occ:2}};
function lvOf(i,k){{return LV[i][LVKEY[k]];}}
function titleOf(i,k){{const r=REN[i];return (r&&r[k])||EV[i][2];}}
function pEvs(k){{const out=[];for(let i=0;i<EV.length;i++){{const l=lvOf(i,k);if(l>0)out.push({{i,l,ev:EV[i],t:titleOf(i,k)}});}}return out;}}
function divergent(i){{const s=new Set(PERS_KEYS.filter(k=>lvOf(i,k)>0).map(k=>titleOf(i,k)));return s.size>1;}}
function nTold(k){{let c=0;for(let i=0;i<EV.length;i++)if(lvOf(i,k)>0)c++;return c;}}
function eraOf(y){{return null;}}
function escAttr(s){{return String(s).replace(/"/g,"&quot;");}}
"""
    # I3 a besoin d'ERAS aussi (bandes partagées du kit) — copier le tableau depuis poc-data.js
    eras_src = (ROOT / "frise" / "poc-data.js").read_text(encoding="utf-8")
    kit_eras_block = eras_src.split("const ERAS=[", 1)[1].split("];", 1)[0]
    mod3 = mod3.replace("function eraOf(y){return null;}",
                        "const ERAS=[" + kit_eras_block + "];\nfunction eraOf(y){for(let i=0;i<ERAS.length;i++){if(y>=ERAS[i].a&&y<ERAS[i].b)return ERAS[i];}return ERAS[ERAS.length-1];}")

    if DRY:
        print("--- DRY : rien d'écrit. Aperçu EV fusion:", len(ev3), "lignes ; LV", len(lv3))
        print("aperçu EV[0]:", ev3[0][:120])
    else:
        (ROOT / "frise" / "perspective-I2-data.js").write_text(mod2, encoding="utf-8")
        (ROOT / "frise" / "perspective-I3-data.js").write_text(mod3, encoding="utf-8")
        rep = ["# Rapport de fusion — corpus « outil péda n°5 » + corpus du kit", "",
               f"Généré par `scripts/gen_pdf_corpus.py`. {len(pdf)} événements datés lus dans le PDF, "
               f"{len(kept)} retenus, {len(dups)} écartés comme doublons d'un fait du kit (similarité ≥ 0,50 sur texte normalisé, fenêtre ±1,2 an).", "",
               "## Doublons écartés", ""]
        for e, ki, s in dups:
            rep.append(f"- **{e['date']}** [{e['track']}] « {e['raw'][:80]} » ≈ kit #{ki} « {kit[ki][2]} » (score {s})")
        rep += ["", "## Apports retenus (par piste)", ""]
        for k in TK:
            rep.append(f"### {dict((t[0], t[1]) for t in TRACKS)[k]}")
            for e in sorted([x for x in kept if x["track"] == k], key=lambda x: x["t"]):
                rep.append(f"- {e['date']} : {e['raw'][:110]}")
            rep.append("")
        (ROOT / "interne" / "RAPPORT-FUSION-PDF.md").parent.mkdir(exist_ok=True)
        (ROOT / "interne" / "RAPPORT-FUSION-PDF.md").write_text("\n".join(rep), encoding="utf-8")
        print("écrit : frise/perspective-I2-data.js, frise/perspective-I3-data.js, interne/RAPPORT-FUSION-PDF.md")

if __name__ == "__main__":
    main()
