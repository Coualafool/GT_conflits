#!/usr/bin/env python3
"""audit_fraicheur.py — inventaire des attributions sourcées du kit et de leur âge.

Extrait les attributions inline « (source, date) » de toutes les pages livrées,
les classifie, et signale les DONNÉES probablement périmées à revérifier.

Catégories :
  historique  date < --historic-year (défaut 2015) — faits ancrés, pas de révision
              systématique (1948, 1982 UNCLOS…)
  donnée      source = organisme/chiffre OU précision au mois — la fraîcheur compte
  citation    le reste (ouvrages, presse datée, rapports ponctuels)

Drapeau ⚠ = catégorie « donnée » et âge > --max-age mois (défaut 24).

Scanne aussi : manifest_downloads.json (date des cartes téléchargées) et les
footers « générée le JJ/MM/AAAA » des cartes produites.

Usage : /usr/bin/python3 scripts/audit_fraicheur.py [--max-age 24] [--md rapport.md] [-v]
Sortie : tableau groupé par page + résumé. Codes retour : 0 = rien à signaler,
1 = au moins un ⚠ (utilisable dans une batterie de vérification).
"""
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PAGES = (sorted((ROOT / "chapitres").glob("chapitre-*-esp*.html"))
         + sorted((ROOT / "composants").glob("composant-*-esp*.html"))
         + sorted((ROOT / "rapport").glob("*.html"))
         + [ROOT / "LISEZ-MOI.html", ROOT / "discord" / "rejoindre-discord.html"])

MONTHS = {
    "janv": 1, "janvier": 1, "févr": 2, "fevr": 2, "février": 2, "fevrier": 2,
    "mars": 3, "avr": 4, "avril": 4, "mai": 5, "juin": 6, "juil": 7, "juillet": 7,
    "août": 8, "aout": 8, "sept": 9, "septembre": 9, "oct": 10, "octobre": 10,
    "nov": 11, "novembre": 11, "déc": 12, "dec": 12, "décembre": 12, "decembre": 12,
}

# organismes dont le chiffre devient faux s'il n'est pas récent
DATA_SOURCES = re.compile(
    r"\b(OCHA|PCBS|UNRWA|OHCHR|UNCTAD|ONU|OCHA|CNUCED|Banque mondiale|World Bank|"
    r"FMI|IMF|OCDE|OECD|Eurostat|CIA|CRS|UNESCO|RSF|Reporters sans [Pp]orti|HRW|"
    r"Human Rights Watch|Amnesty|B.?Tselem|Gisha|B?Tselem|ACLED|IHH|OCHA|FT|IMF|"
    r"Oxfam|CICR|Croix-Rouge|UN Women|Fafo|PCHR|Al Mezan|Yesh Din|Peace Now|"
    r"CBS|Statistiques?\b|indice|index)\b", re.I)

# un tiret d'année en double (1948-, plages) ou une guerre = événement, pas donnée
EVENT_HINT = re.compile(r"guerre|intifada|massacre|génocide|résolution|accord|Convention|loi\b", re.I)

ATTRIB = re.compile(
    r"\(([^()]{3,80}?),\s*((?:janv|févr|fevr|f[eé]vr|mars|avr|mai|juin|juil|aout|août|"
    r"sept|oct|nov|d[ée]c)[a-z.]*\s+)?(\d{4})\)", re.I)

GEN_DATED = re.compile(r"g[ée]n[ée]r[ée]e? le (\d{2})/(\d{2})/(\d{4})")


def strip_html(t: str) -> str:
    t = re.sub(r"<style.*?</style>|<script.*?</script>", " ", t, flags=re.S)
    t = re.sub(r"<[^>]+>", " ", t)
    return t.replace("&nbsp;", " ").replace("’", "'").replace("&rsquo;", "'")


def classify(src: str, year: int, month, historic_year: int, text_around: str) -> str:
    if year < historic_year:
        return "historique"
    if EVENT_HINT.search(text_around) and month is None:
        return "historique"
    if month is not None or DATA_SOURCES.search(src):
        return "donnée"
    return "citation"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-age", type=int, default=24, help="âge max (mois) des données avant ⚠")
    ap.add_argument("--historic-year", type=int, default=2015)
    ap.add_argument("--md", metavar="FICHIER", help="écrire aussi un rapport Markdown")
    ap.add_argument("-v", "--verbose", action="store_true", help="afficher historique + citations")
    args = ap.parse_args()

    today = dt.date.today()
    rows = []
    for page in PAGES:
        if not page.exists():
            continue
        text = strip_html(page.read_text(encoding="utf-8"))
        for m in ATTRIB.finditer(text):
            src, mname, year = m.group(1).strip(), m.group(2), int(m.group(3))
            month = None
            if mname:
                key = re.sub(r"[ .]", "", mname.lower()).replace("f", "f")
                month = MONTHS.get(key) or MONTHS.get(key[:4]) or MONTHS.get(key[:3])
            when = dt.date(year, month or 7, 15)  # mi-année si mois inconnu
            age_m = (today.year - when.year) * 12 + (today.month - when.month)
            cat = classify(src, year, month, args.historic_year, text[max(0, m.start()-60):m.start()])
            flag = "⚠" if cat == "donnée" and age_m > args.max_age else " "
            rows.append((page.relative_to(ROOT), flag, cat, year, month, age_m, src))

    # dates des cartes téléchargées (manifest)
    mf = ROOT / "pictures" / "manifest_downloads.json"
    if mf.exists():
        for e in json.load(open(mf)):
            d = (e.get("date") or "")[:10]
            if re.match(r"\d{4}-\d{2}-\d{2}", d):
                when = dt.date.fromisoformat(d)
                age_m = (today.year - when.year) * 12 + (today.month - when.month)
                if not e["file"].startswith("carte-telechargee"):
                    continue
                # une carte ancienne est un document daté (réalité affichée), pas
                # une donnée périmée ; seule une carte « d'actualité » vieillit mal
                if when.year < 2022:
                    continue
                flag = "⚠" if age_m > args.max_age else " "
                rows.append((Path("pictures/manifest_downloads.json"), flag, "carte",
                             when.year, when.month, age_m, e["file"]))

    # footers des cartes générées (dans les pages)
    for page in PAGES:
        if not page.exists():
            continue
        for mm in GEN_DATED.finditer(page.read_text(encoding="utf-8")):
            dd, mo, yy = (int(x) for x in mm.groups())
            when = dt.date(yy, mo, dd)
            age_m = (today.year - when.year) * 12 + (today.month - when.month)
            if age_m > args.max_age:
                rows.append((page.relative_to(ROOT), " ", "carte", yy, mo, age_m, "carte générée"))

    warns = [r for r in rows if r[1] == "⚠"]
    shown = rows if args.verbose else [r for r in rows if r[1] == "⚠" or r[2] in ("donnée", "carte")]

    cur = None
    for f, flag, cat, year, month, age_m, src in sorted(shown, key=lambda r: (str(r[0]), -r[5])):
        if f != cur:
            print(f"\n== {f} ==")
            cur = f
        d = f"{year}" if not month else ["", "janv.", "févr.", "mars", "avr.", "mai", "juin",
                                         "juil.", "août", "sept.", "oct.", "nov.", "déc."][month] + f" {year}"
        print(f" {flag} [{cat:10}] {d:>11}  il y a {age_m:3} mois  ({src})")

    n_hist = sum(1 for r in rows if r[2] == "historique")
    print(f"\n── résumé : {len(rows)} attributions · {n_hist} historiques · "
          f"{sum(1 for r in rows if r[2] in ('donnée','carte'))} données/cartes · {len(warns)} ⚠ à revérifier")
    if warns:
        print("   → prioriser : " + "; ".join(sorted({r[6] for r in warns})[:8]))

    if args.md:
        with open(args.md, "w", encoding="utf-8") as fh:
            fh.write(f"# Rapport de fraîcheur — {today.isoformat()}\n\n"
                     f"Seuil : données de plus de {args.max_age} mois à revérifier.\n\n"
                     "| ⚠ | page | catégorie | date | âge (mois) | source |\n|---|---|---|---|---|---|\n")
            for f, flag, cat, year, month, age_m, src in sorted(rows, key=lambda r: -r[5]):
                if cat == "historique" and not args.verbose:
                    continue
                d = f"{year}" if not month else f"m{month:02d}-{year}"
                fh.write(f"| {flag} | {f} | {cat} | {d} | {age_m} | {src} |\n")
        print(f"rapport écrit : {args.md}")
    return 1 if warns else 0


if __name__ == "__main__":
    sys.exit(main())
