#!/usr/bin/env python3
"""make_changelog.py — régénère rapport/NOUVEAUTES.html depuis le journal git.

Le kit n'a pas de « releases » formelles : chaque commit vérifié est une
modification publiée. Cette page présente le journal groupé par mois, avec un
badge par nature de modification ; l'ordinaire purement technique est replié.

Relancer après tout commit de contenu :
  /usr/bin/python3 scripts/make_changelog.py
Puis relancer inject_common.py (la page est dans shipped_pages) et valider.
"""
import re
import subprocess
import sys
from collections import OrderedDict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "rapport" / "NOUVEAUTES.html"

MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
          "août", "septembre", "octobre", "novembre", "décembre"]

TYPES = [  # (regex sur le sujet, badge, replié ?)
    (re.compile(r"\bcarte|pictures|figure|webp|image|photo|commons|OCHA\b", re.I), "🗺️ Cartes & images", False),
    (re.compile(r"^feat|\bchapitre-\d|sequence|s\d\b|rapport|chap\d", re.I), "✨ Nouveauté", False),
    (re.compile(r"^fix|bug|corrige|repair|broken", re.I), "🛠️ Correction", False),
    (re.compile(r"^print\b|^pdf|^pied|^inject|^clavier", re.I), "🖨️ Affichage & impression", False),
]

HEAD = """<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nouveautés — Journal du kit · Outil péda Israël–Palestine</title>
<style>
  :root{--bg:#0f1419;--panel:#161d25;--panel-2:#1c2530;--border:#28323e;--ink:#e8edf2;--muted:#9aa8b6;--faint:#6b7885;--brand:#e0a458;--brand-2:#c9704b;--accent:#5aa9c9;--good:#5fb380;--maxw:880px}
  *{box-sizing:border-box}html{scroll-behavior:smooth}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.65;font-size:16px}
  .bar{border-bottom:1px solid var(--border);padding:14px 22px;position:sticky;top:0;background:rgba(15,20,25,.9);backdrop-filter:blur(6px);z-index:5}
  .bar .in{max-width:var(--maxw);margin:0 auto;display:flex;align-items:center;gap:12px}
  .back{color:var(--accent);text-decoration:none;font-size:14px}
  .back:hover{text-decoration:underline}
  .bar .crumb{color:var(--faint);font-size:13px;margin-left:auto}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:34px 22px 90px}
  .kicker{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--brand);font-weight:700}
  h1{font-size:26px;margin:10px 0 6px}
  .lead{color:var(--muted);font-size:15.5px;border-left:3px solid var(--brand);padding:4px 0 4px 16px;margin:14px 0 30px}
  details.mo{border:1px solid var(--border);border-radius:14px;background:var(--panel);margin:10px 0;overflow:hidden}
  details.mo>summary{cursor:pointer;padding:13px 18px;font-weight:700;font-size:15px;list-style:none;display:flex;align-items:center;gap:10px}
  details.mo>summary::-webkit-details-marker{display:none}
  details.mo>summary::before{content:"▸";color:var(--faint);transition:transform .15s}
  details.mo[open]>summary::before{transform:rotate(90deg)}
  details.mo[open]>summary{border-bottom:1px solid var(--border)}
  .cnt{margin-left:auto;color:var(--faint);font-weight:400;font-size:12.5px}
  ul.log{margin:8px 0;padding:0 18px 12px 40px}
  ul.log li{margin:7px 0;font-size:14.5px;color:var(--muted)}
  .tag{display:inline-block;font-size:11px;border-radius:999px;padding:1px 9px;margin-right:8px;border:1px solid var(--border);color:var(--brand);vertical-align:1px}
  .tag.coulisses{color:var(--faint)}
  code.sha{color:var(--faint);font-size:12px;margin-left:6px}
  li.coul{color:var(--faint);font-size:13.5px}
</style>
</head>
<body>
<div class="bar"><div class="in">
  <a class="back" href="rapport_FR.html">← Rapport</a>
  <span class="crumb">Nouveautés du kit</span>
</div></div>
<main class="wrap">
  <div class="kicker">Suivi du kit</div>
  <h1>Nouveautés &amp; corrections</h1>
  <p class="lead">Journal de développement du kit&nbsp;: chaque entrée est une modification vérifiée puis publiée
  dans la semaine. Les modifications de fond (contenu des chapitres, cartes, affichage) sont en tête&nbsp;;
  l&rsquo;ordinaire purement technique est replié. <b>Les libellés d&rsquo;origine sont conservés</b> (journal de travail).</p>
"""

TAIL = """</main>
</body>
</html>
"""


def classify(subject: str):
    for rx, badge, folded in TYPES:
        if rx.search(subject):
            return badge, folded
    return "⚙️ Coulisses", True


def main():
    log = subprocess.run(
        ["git", "-C", str(ROOT), "log", "--date=short", "--reverse",
         "--pretty=format:%ad|%h|%s"],
        capture_output=True, text=True, check=True).stdout.splitlines()

    months = OrderedDict()
    for line in log:
        d, sha, subj = line.split("|", 2)
        y, m, _ = d.split("-")
        months.setdefault(f"{y}-{m}", []).append((d, sha, subj))

    parts = [HEAD]
    for ym in sorted(months, reverse=True):
        y, m = (int(x) for x in ym.split("-"))
        entries = months[ym]
        main_e, folds = [], []
        for d, sha, subj in reversed(entries):
            badge, folded = classify(subj)
            (folds if folded else main_e).append((d, sha, subj, badge))
        open_attr = " open" if ym == sorted(months, reverse=True)[0] else ""
        parts.append(f'  <details class="mo"{open_attr}>\n'
                     f'    <summary>{MONTHS[m-1]} {y}<span class="cnt">{len(entries)} modification'
                     f'{"s" if len(entries) > 1 else ""}</span></summary>\n')
        if main_e or not folds:
            parts.append("    <ul class=\"log\">\n")
            for d, sha, subj, badge in main_e:
                parts.append(f'      <li><span class="tag">{badge}</span>{esc(subj)}<code class="sha">{sha}</code></li>\n')
            parts.append("    </ul>\n")
        if folds:
            parts.append('    <details><summary style="cursor:pointer;padding:4px 18px 10px;color:var(--faint);font-size:13px">'
                         f'Coulisses techniques ({len(folds)})</summary>\n    <ul class="log">\n')
            for d, sha, subj, badge in folds:
                parts.append(f'      <li class="coul">{esc(subj)}<code class="sha">{sha}</code></li>\n')
            parts.append("    </ul>\n    </details>\n")
        parts.append("  </details>\n")

    today = date.today()
    parts.append(f'  <p style="color:var(--faint);font-size:13px;margin-top:28px">Page générée le '
                 f'{today.day} {MONTHS[today.month-1]} {today.year} par <code>scripts/make_changelog.py</code>.</p>\n')
    parts.append(TAIL)
    OUT.write_text("".join(parts), encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)}: {len(log)} commits, {len(months)} mois")


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


if __name__ == "__main__":
    sys.exit(main())
