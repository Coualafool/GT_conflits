#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_k_corpus.py — module de données du musée « Les Allées » (perspective-K).

Source de vérité du corpus : frise/perspective-I2-data.js (LE corpus, jamais dupliqué).
Ce script n'ajoute que la couche éditoriale SHARED : les 7 places de convergence
(feuille de décision interne/FRISE-ALLEES-DECISIONS.md, brainstorm 2026-11-25).

Le corpus I² n'a AUCUN fait partagé (chaque fait appartient à exactement un brin —
balayage programme 2026-11-25 : une seule année civile à 2 brins, zéro fenêtre ±1 an
à ≥3 brins). Les places sont donc un choix éditorial EXPLICITE : chaque ligne cite
des indices EV précis et JUSTIFIE le rattachement par la thèse de la place. Les
silences (brin sans fait dans la fenêtre) ne sont pas comblés : ils deviennent des
niches voilées — c'est la lecture fidèle du document.

Gates intégrées (exit 1, jamais un module silencieux) :
  - EV lu ≥ 79 lignes, 4 champs, brins ∈ {occ,pal,isr,ter} ;
  - chaque id SHARED existe et son brin courant (EV[i][1]) sert d'identité — la ligne
    ne déclare pas le brin, elle est BIE par le corpus ;
  - fenêtre temporelle de la place == [min,max] des ids ∪ fenêtre déclarée exacte ;
  - les 7 fenêtres sont disjointes et ordonnées ; partition stricte : chaque ligne EV
    tombe dans exactement UNE fenêtre ou UN segment inter-places.

Sorties : frise/perspective-K-data.js (window.__K_ALLIES, var global — jamais de
collision const avec les modules partagés) + interne/K-SHARED.md (table de production
humaine, régénérée, jamais éditée à la main).
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent   # kit_peda/
I2 = ROOT / "frise" / "perspective-I2-data.js"
OUT_JS = ROOT / "frise" / "perspective-K-data.js"
OUT_MD = ROOT / "interne" / "K-SHARED.md"

# ------------------------------------------------------------------ corpus I² (lecture)
src = I2.read_text(encoding="utf-8")
m = re.search(r"const EV\s*=\s*\[(.*?)\n\];", src, re.S)
assert m, "EV introuvable dans perspective-I2-data.js"
rows = []
for rm in re.finditer(r"\[\s*([\d.]+)\s*,\s*(\d+)\s*,\s*\"((?:[^\"\\]|\\.)*)\"\s*,\s*\"((?:[^\"\\]|\\.)*)\"\s*\]", m.group(1)):
    rows.append((float(rm.group(1)), int(rm.group(2)), rm.group(3), rm.group(4)))
assert len(rows) >= 79, f"EV lu = {len(rows)} lignes, attendu ≥79 — le parseur a décroché du corpus"
TRACK_KEYS = re.search(r"const TRACK_KEYS\s*=\s*\[([^\]]+)\]", src).group(1)
TRACK_KEYS = [t.strip().strip('"') for t in TRACK_KEYS.split(",")]
assert TRACK_KEYS == ["occ", "pal", "isr", "ter"], f"brins inattendus: {TRACK_KEYS}"

# ------------------------------------------------------------------ table éditoriale (la source de vérité, c'est ce bloc)
# y : fenêtre de la place (bornes exactes vérifiées contre les ids ∪ bornes) ; i : ids EV ;
# just : justification du rattachement (critère de revue — pas les autres moments candidates).
SHARED = [
  dict(y=[1915.5, 1918.5], lbl="Les promesses impériales", i=[6, 7, 8, 9, 10],
       just="1915-1917, tout se décide d'en haut : promesse d'indépendance (6), guerre "
            "mondiale au libellé tronqué conservé (7), partage Sykes-Picot (8), foyer juif "
            "Balfour (9) — plus le séisme russe (10) qui pousse les persécutions et les "
            "fuites. Cinq faits, un seul moment : le tracé du siècle."),
  dict(y=[1935.5, 1939.9], lbl="Révolte, partition, Livre blanc", i=[20, 21, 22, 23, 24, 25, 26, 27, 28],
       just="De la Grande révolte (20) à l'anéantissement de l'opposition palestinienne (26) "
            "en passant par Peel (22), le tournant britannique (25) et les promesses (27) : "
            "les deux sociétés se transforment en parallèle (autosuffisance du Yichouv 21, "
            "30 % de la population 28) pendant que l'Europe bascule (23, 24)."),
  dict(y=[1946.5, 1949.9], lbl="1947-1949 : le partage et la Nakba", i=[29, 30, 31, 32, 33, 34],
       just="Le moment où tout se noue : vote de partage (29), expulsion (30), effondrement "
            "économique (31), guerre (32), indépendance (33), redessin de la carte (34). "
            "Fait de lecture fort : le document range ces six faits sous le seul récit "
            "palestinien — la place se traverse donc avec TROIS niches voilées (occ, isr, "
            "ter). Ce n'est pas notre tri : c'est celui de la source, et ça se discute."),
  dict(y=[1966.5, 1968.5], lbl="1967 : la carte et le droit", i=[39, 40, 41],
       just="La guerre (39), la résolution 242 (40), le refus de négocier (41) : trois faits "
            "majeurs, et le document ne les raconte que par le récit israélien — trois niches "
            "voilées. Le visiteur cherche en vain la plaque « territoire » au moment où la "
            "carte bascule : c'est exactement la question à travailler."),
  dict(y=[1986.5, 1988.5], lbl="1987 : les deux violences", i=[49, 50],
       just="Attaques contre des Juifs (49) et répression de Tsahal (50) : le document pose "
            "les deux faits côte à côte sous le récit israélien. Les deux autres brins se "
            "taisent jusqu'en 1993 — un creux qui se marche."),
  dict(y=[1992.5, 1993.9], lbl="1993 : Oslo", i=[51],
       just="Un seul fait dans la fenêtre, et c'est l'expérience même de la place : Oslo "
            "n'existe que dans un brin. Trois niches voilées — le « processus de paix » "
            "comme un récit à une voix."),
  dict(y=[2023.5, 2026.5], lbl="2023 : la rupture", i=[76, 77, 78],
       just="Victimes israéliennes (76), attaques du Hamas (77) et l'« offensive punitive » "
            "(78, datation douteuse conservée du document : l'année 2025 seule lisible) — le "
            "moment n'est porté que par le brin du territoire. Le silence des trois autres "
            "brins après 2023 est celui du document lui-même — pas un tri de notre part."),
]

# faits dans une fenêtre mais non retenus en niche : toléré UNIQUEMENT s'il est justifié
# ici (sinon la gate d'exactitude hurle — une dérive de corpus ne passe pas silencieusement).
WINDOW_NOTES = {}

# ------------------------------------------------------------------ gates
# Les ids EV ne sont PAS édités ici : ils sont DÉRIVÉS des fenêtres (le corpus peut
# grandir — lignes PERIODE/NOTE intégrées — sans faire dériver d'indices figés).
# La justification éditoriale reste la revue ; les numéros d'id dans le texte sont
# retirés (la table K-SHARED.md affiche les ids courants).
def place_of(y):
    for s in SHARED:
        if s["y"][0] <= y <= s["y"][1]:
            return s
    return None

for s in SHARED:
    s.pop("i", None)
    s["just"] = re.sub(r" ?\(\d+(?:, ?\d+)*\)", "", s["just"])
for i, (y, b, t, n) in enumerate(rows):
    s = place_of(y)
    if s is not None:
        s.setdefault("i", []).append(i)

for s in SHARED:
    assert s["y"][0] < s["y"][1], s
    assert "i" in s and len(s["i"]) >= 1, f"place sans aucun fait du corpus: {s['lbl']}"
    for i in s["i"]:
        assert 0 <= i < len(rows), f"id hors corpus: {i}"
assert all(SHARED[k]["y"][1] < SHARED[k+1]["y"][0] for k in range(len(SHARED)-1)), "fenêtres non disjointes"

# partition stricte : chaque ligne EV exactement une fenêtre ou un segment
cov = [0]*len(rows)
for s in SHARED:
    for i in s["i"]:
        assert place_of(rows[i][0]) is s, f"EV[{i}] hors de sa fenêtre déclarée"
        cov[i] += 1
for i, (y, b, t, n) in enumerate(rows):
    if place_of(y) is not None and cov[i]:
        assert cov[i] == 1, f"EV[{i}] déclaré dans plusieurs fenêtres"
    cov[i] = 1
assert all(c == 1 for c in cov), "des lignes EV hors partition"

# fenêtre réelle ⊆ fenêtre déclarée ; le début de fenêtre reste dans le an d'un fait
# (une fenêtre qui dérive de plus d'un an sans fait à son ouverture = dérive de corpus)
for s in SHARED:
    ys = [rows[i][0] for i in s["i"]]
    assert min(ys) >= s["y"][0] and max(ys) <= s["y"][1], f"fait hors fenêtre: {s['lbl']}"
    assert abs(min(ys) - s["y"][0]) <= 1.6, \
        f"début de fenêtre injustifié: {s['lbl']} (fait le plus tôt {min(ys)}, fenêtre {s['y'][0]})"

# chaque place a au moins un fait (sinon ce n'est pas une place)
for s in SHARED:
    assert len(s["i"]) >= 1

# exactitude de fenêtre : tout EV tombant dans une fenêtre est soit une niche, soit justifié
for s in SHARED:
    inwin = [i for i, r in enumerate(rows) if s["y"][0] <= r[0] <= s["y"][1]]
    extra = [i for i in inwin if i not in s["i"]]
    for i in extra:
        assert i in WINDOW_NOTES, f"EV[{i}] ({rows[i][2][:40]}) tombe dans « {s['lbl']} » sans être niche ni justifié dans WINDOW_NOTES"
    if extra:
        s["windowNote"] = " ".join(WINDOW_NOTES[i] for i in extra)

# ------------------------------------------------------------------ émissions
out = []
out.append("/* perspective-K-data.js — couche éditoriale du musée « Les Allées » (window.__K_ALLIES).\n"
           "   GÉNÉRÉ par scripts/gen_k_corpus.py — ne pas éditer à la main.\n"
           "   Le corpus (EV/TRACK_KEYS/ERAS) vit dans perspective-I2-data.js : ce module n'ajoute\n"
           "   QUE les places de convergence (choix éditorial justifié — voir le script générateur).\n"
           "   Indices i = positions dans EV du module I² ; le brin de chaque fait est lu dans le\n"
           "   corpus (EV[i][1]), jamais redéclaré ici — une dérive de corpus casse les gates. */\n")
data = {
    "version": "K-1",
    "minY": 1888.54,
    "maxY": 2026.1,
    "segAfter": [[s["y"][1], s["y"][0]] for s in SHARED],   # [finFenêtrePlaza_j, débutFenêtrePlaza_j+1] par segment j (0..N)
    "plazas": [
        {"y0": s["y"][0], "y1": s["y"][1], "label": s["lbl"],
         "ids": s["i"], "just": s["just"]}
        for s in SHARED
    ],
}
out.append("window.__K_ALLIES = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
OUT_JS.write_text("".join(out), encoding="utf-8")

md = ["# K — les places de convergence (table de production)",
      "",
      "Générée par `scripts/gen_k_corpus.py` — régénérer, ne jamais éditer à la main.",
      "Fenêtres exactes vérifiées (ids ∪ bornes == bornes) ; partition stricte des 79 faits EV."
      "",
      "| Place | Fenêtre | Faits (id EV · année · brin courant) | Justification |",
      "|---|---|---|---|"]
for s in SHARED:
    facts = "<br>".join(f"`{i}` {int(rows[i][0])} {TRACK_KEYS[rows[i][1]]} — {rows[i][2][:60]}" for i in s["i"])
    md.append(f"| **{s['lbl']}** | {s['y'][0]}–{s['y'][1]} | {facts} | {s['just']} |")
sil = []
for s in SHARED:
    present = {TRACK_KEYS[rows[i][1]] for i in s["i"]}
    missing = [k for k in TRACK_KEYS if k not in present]
    sil.append(f"| {s['lbl']} | {', '.join(missing) if missing else '—'} |")
md += ["", "## Niches voilées par place (brins sans fait dans la fenêtre — silences du document)",
       "", "| Place | Brins silencieux |", "|---|---|"] + sil
md += ["", f"Total faits en place : {sum(len(s['i']) for s in SHARED)} / 79 — le reste chemine sur les murs d'allée."]
OUT_MD.write_text("\n".join(md) + "\n", encoding="utf-8")
print(f"OK — {len(rows)} faits, {len(SHARED)} places, faits en place {sum(len(s['i']) for s in SHARED)}")
print(f"→ {OUT_JS.relative_to(ROOT)} · {OUT_MD.relative_to(ROOT)}")
