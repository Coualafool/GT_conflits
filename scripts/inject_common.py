#!/usr/bin/env python3
"""Inject the shared blocks (print, keyboard, footer) into every shipped page.

Idempotent: each block lives between ``<!-- BEGIN marker -->`` and
``<!-- END marker -->`` comments; re-running replaces blocks in place.
Footer review dates come from git (last commit touching each file).

Usage:
  python3 scripts/inject_common.py                # all blocks, all pages
  python3 scripts/inject_common.py --only print   # one kind: print|clavier|pied
  python3 scripts/inject_common.py --check        # report missing blocks, write nothing
"""
import argparse
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
             "août", "septembre", "octobre", "novembre", "décembre"]
MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"]

REPO_URL = "https://github.com/Coualafool/GT_conflits"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from blocs_seance import SEANCE_BLOCK
from blocs_glossaire import GLOSSAIRE_BLOCK
from blocs_quiz import QUIZ_BLOCK
LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/"

# ---------------------------------------------------------------- pages ----
# (path, has_accordions, has_inline_tools, language, kind)
# kind: None = page documentaire ; "frise" = page-applications de la frise
# (canvas plein-viewport : pied compact + outils de navigation kit,
#  jamais print/clavier/seance/glossaire/quiz qui casseraient la mise en page).
def shipped_pages():
    pages = []
    for p in sorted((ROOT / "chapitres").glob("chapitre-*-espace.html")):
        pages.append((p, True, True, "fr", None))
    for p in sorted((ROOT / "composants").glob("composant-*-espace.html")):
        pages.append((p, True, False, "fr", None))
    pages.append((ROOT / "rapport" / "rapport_FR.html", True, False, "fr", None))
    pages.append((ROOT / "rapport" / "rapport_EN.html", False, False, "en", None))
    pages.append((ROOT / "rapport" / "NOUVEAUTES.html", False, False, "fr", None))
    pages.append((ROOT / "discord" / "rejoindre-discord.html", False, False, "fr", None))
    pages.append((ROOT / "LISEZ-MOI.html", False, False, "fr", None))
    for p in sorted((ROOT / "frise").glob("*.html")):
        pages.append((p, False, False, "fr", "frise"))
    return pages

# ---------------------------------------------------------------- blocks ---
PRINT_BLOCK = """<!-- BEGIN commun:print -->
<style id="print-style">
/* ===== Print (bloc commun, ne pas éditer à la main -- inject_common.py) ===== */
@media print{
  :root{--bg:#ffffff;--panel:#ffffff;--panel-2:#f5f4f1;--border:#c8cdd3;--ink:#15181c;--muted:#3c434c;--faint:#5a626c;--fg:#15181c;--white:#15181c;--brand:#8a5a1f;--brand-2:#963d22;--accent:#1f5a78;--good:#1e6a44}
  html{scroll-behavior:auto}
  body{background:#fff!important;color:#15181c!important;font-size:12pt}
  .bar,.no-print,.tools,.cta-row,.cta-btn,.hero-cta,.outils-flottants{display:none!important}
  .wrap{max-width:none;padding:0 4mm}
  .hero{background:none!important;color:#15181c;padding:0 0 12pt}
  .hero .logo{display:none}
  code{background:#f0efec;color:#333}
  @page{size:A4;margin:15mm 14mm}
  h1,h2,h3,h4{break-after:avoid;page-break-after:avoid}
  figure,li,blockquote{break-inside:avoid}
  summary{font-weight:700}
  a{color:#1f5a78;text-decoration:none}
  p a[href^="http"]::after,li a[href^="http"]::after{content:" — " attr(href);font-size:.7em;color:#5a626c;word-break:break-all}
  .pied-commun a::after{content:none}
}
</style>
<script>
/* Print : tout ouvrir avant l’impression, restaurer ensuite. (bloc commun) */
(function(){
  var saved=[];
  window.addEventListener('beforeprint',function(){
    saved=[];
    document.querySelectorAll('details').forEach(function(d){saved.push(d.open);d.open=true;});
    document.querySelectorAll('.card').forEach(function(c){c.classList.add('open');});
  });
  window.addEventListener('afterprint',function(){
    var i=0;
    document.querySelectorAll('details').forEach(function(d){if(i<saved.length)d.open=saved[i++];});
  });
})();
</script>
<!-- END commun:print -->"""

CLAVIER_BLOCK = """<!-- BEGIN commun:clavier -->
<script>
/* Clavier : E = tout déplier, R = tout replier. (bloc commun) */
(function(){
  function setAllPages(o){
    document.querySelectorAll('details').forEach(function(d){d.open=o;});
    document.querySelectorAll('.card').forEach(function(c){c.classList.toggle('open',o);});
    /* les accordéons exclusifs se referment via l’événement toggle (asynchrone) :
       une seconde passe, après leur exécution, garantit que tout reste ouvert. */
    setTimeout(function(){document.querySelectorAll('details').forEach(function(d){d.open=o;});},0);
  }
  if(!window.setAll)window.setAll=setAllPages;
  document.addEventListener('keydown',function(e){
    if(e.ctrlKey||e.metaKey||e.altKey)return;
    var t=e.target;
    if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))return;
    var k=(e.key||'').toLowerCase();
    if(k==='e')window.setAll(true);
    else if(k==='r')window.setAll(false);
  });
})();
</script>
<!-- END commun:clavier -->"""

OUTILS_BLOCK = """<!-- BEGIN commun:outils -->
<div class="outils-flottants no-print" role="group" aria-label="Contrôles des séquences">
  <button type="button" onclick="setAll(true)" title="Raccourci clavier : touche E">Tout déplier</button>
  <button type="button" onclick="setAll(false)" title="Raccourci clavier : touche R">Tout replier</button>
</div>
<style>
  .outils-flottants{position:fixed;right:16px;bottom:16px;z-index:9;display:flex;gap:8px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.4)}
  .outils-flottants button{font:inherit;font-size:13px;color:var(--ink);background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer}
  .outils-flottants button:hover{border-color:var(--brand)}
</style>
<!-- END commun:outils -->"""

# Outils des pages-frise : navigation vers le kit, EN FILUX (jamais fixed :
# poc-A/poc-B ont leur propre barre de pied en flux — un pill fixe la
# recouvrirait). Avec le pied compact juste en dessous, les deux lignes
# forment un seul pied visuel.
FRISE_OUTILS_BLOCK = """<!-- BEGIN commun:frise-outils -->
<nav class="frise-outils" aria-label="Navigation vers le kit">
  <a href="../rapport/rapport_FR.html">← Kit pédagogique</a>{idx}
</nav>
<style>
  .frise-outils{{display:flex;flex-wrap:wrap;gap:4px 16px;background:var(--card,#fff);border-top:1px solid var(--border,#ccc);padding:9px 16px 0;font-size:12px}}
  .frise-outils a{{color:var(--accent,#9a511c);text-decoration:none}}
  .frise-outils a:hover{{text-decoration:underline}}
</style>
<!-- END commun:frise-outils -->"""

# Le pied « compact » des pages-frise : elles font 100 % de hauteur,
# le pied standard (marges 64/48) volerait trop de place au canvas.
# Pas de bordure haute : la barre de outils la porte déjà (un seul pied).
FRISE_PIED_STYLE = """
<style>
  /* pied compact (pages-frise -- inject_common.py) */
  .pied-commun{border-top:0;margin:0;padding:3px 16px 9px;font-size:12px;line-height:1.5;color:var(--muted,#555);background:var(--card,#fff)}
  .pied-commun p{display:inline}
  .pied-commun p+p::before{content:" · "}
</style>"""

PIED_HEAD_BLOCK = """<!-- BEGIN commun:pied-head -->
<link rel="license" href="{license_url}">
<!-- END commun:pied-head -->"""

PIED_BODY_FR = """<!-- BEGIN commun:pied -->
<footer class="pied-commun">
  <p><b>Outil pédagogique Israël–Palestine</b> · réalisé par le GT (Groupe de travail) · Licence <a rel="license" href="{license_deed}">CC BY-NC-SA 4.0</a></p>
  <p>Dernière mise à jour de cette page : <time datetime="{iso}">{shown_fr}</time> · <a href="{nouv}">Nouveautés du kit</a> · Dépôt : <a href="{repo}">{repo_short}</a></p>
</footer>
<style>
  .pied-commun{{max-width:var(--maxw,880px);margin:64px auto 0;padding:16px 22px 48px;border-top:1px solid var(--border);color:var(--faint);font-size:12.5px;line-height:1.7}}
  .pied-commun p{{margin:3px 0}}
  .pied-commun a{{color:var(--muted)}}
  .pied-commun a:hover{{color:var(--ink)}}
</style>
<!-- END commun:pied -->"""

PIED_BODY_EN = """<!-- BEGIN commun:pied -->
<footer class="pied-commun">
  <p><b>Israel–Palestine teaching kit</b> · built by the GT (working group) · License <a rel="license" href="{license_deed}">CC BY-NC-SA 4.0</a></p>
  <p>This page last updated: <time datetime="{iso}">{shown_en}</time> · <a href="{nouv}">What's new</a> · Repository: <a href="{repo}">{repo_short}</a></p>
</footer>
<style>
  .pied-commun{{max-width:var(--maxw,880px);margin:64px auto 0;padding:16px 22px 48px;border-top:1px solid var(--border);color:var(--faint);font-size:12.5px;line-height:1.7}}
  .pied-commun p{{margin:3px 0}}
  .pied-commun a{{color:var(--muted)}}
  .pied-commun a:hover{{color:var(--ink)}}
</style>
<!-- END commun:pied -->"""

# ------------------------------------------------------------- machinery ---
def block(name, content):
    return re.compile(
        r"<!-- BEGIN " + re.escape(name) + r" -->.*?<!-- END " + re.escape(name) + r" -->",
        re.DOTALL)

def upsert(text, name, content, anchor, before=True):
    """Replace marked block in place, or insert it next to `anchor`."""
    pat = block(name, content)
    m = pat.search(text)
    if m:
        return pat.sub(lambda _: content, text), True
    idx = text.rfind(anchor)
    if idx == -1:
        raise ValueError(f"anchor {anchor!r} not found")
    if before:
        return text[:idx] + content + "\n" + text[idx:], False
    end = idx + len(anchor)
    return text[:end] + "\n" + content + text[end:], False

def git_date(path):
    try:
        out = subprocess.run(
            ["git", "-C", str(ROOT), "log", "-1", "--date=%Y-%m-%d", "--format=%ad", "--",
             str(path.relative_to(ROOT))],
            capture_output=True, text=True, check=True).stdout.strip()
        return date.fromisoformat(out)
    except Exception:
        return date.today()

def fmt(d, months):
    return f"{d.day} {months[d.month - 1]} {d.year}"

def render_pied(path, lang):
    d = git_date(path)
    tpl = PIED_BODY_EN if lang == "en" else PIED_BODY_FR
    nouv = Path(os.path.relpath(ROOT / "rapport" / "NOUVEAUTES.html", path.parent)).as_posix()
    return tpl.format(
        license_deed=LICENSE_URL + ("deed.en" if lang == "en" else "deed.fr"),
        iso=d.isoformat(),
        shown_fr=fmt(d, MONTHS_FR),
        shown_en=fmt(d, MONTHS_EN),
        repo=REPO_URL,
        repo_short=REPO_URL.split("//", 1)[1],
        nouv=nouv)

def render_frise_outils(path):
    # sur l'index lui-même, pas de lien vers soi ; les autres pages renvoient
    # au comparatif des vues (variante/perspective/poc).
    idx = "" if path.name == "index-comparatif.html" else \
        '\n  <a href="index-comparatif.html">Comparer les vues</a>'
    return FRISE_OUTILS_BLOCK.format(idx=idx)

KINDS = {"print": ["commun:print"],
         "clavier": ["commun:clavier", "commun:outils"],
         "seance": ["commun:seance"],
         "glossaire": ["commun:glossaire"],
         "quiz": ["commun:quiz"],
         "frise": ["commun:frise-outils", "commun:pied-head", "commun:pied"],
         "pied": ["commun:pied-head", "commun:pied"]}

def wanted_blocks(path, accordions, inline_tools, lang, keep=None, kind=None):
    """(name, content, where) — where: 'head' or 'body'."""
    if kind == "frise":
        # pages-applications de la frise : pied + outils kit uniquement.
        w = [("commun:frise-outils", render_frise_outils(path), "body"),
             ("commun:pied-head", PIED_HEAD_BLOCK.format(license_url=LICENSE_URL), "head"),
             ("commun:pied", render_pied(path, lang) + FRISE_PIED_STYLE, "body")]
        if keep:
            w = [b for b in w if b[0] in keep]
        return w
    w = [("commun:print", PRINT_BLOCK, "head")]
    if accordions:
        w.append(("commun:clavier", CLAVIER_BLOCK, "body"))
        if not inline_tools:
            w.append(("commun:outils", OUTILS_BLOCK, "body"))
        w.append(("commun:seance", SEANCE_BLOCK, "body"))
        w.append(("commun:glossaire", GLOSSAIRE_BLOCK, "body"))
        w.append(("commun:quiz", QUIZ_BLOCK, "body"))
    w.append(("commun:pied-head", PIED_HEAD_BLOCK.format(license_url=LICENSE_URL), "head"))
    w.append(("commun:pied", render_pied(path, lang), "body"))
    if keep:
        w = [b for b in w if b[0] in keep]
    return w

def process(path, kinds, check_only):
    text = path.read_text(encoding="utf-8")
    changes = []
    for name, content, where in wanted_blocks(*kinds):
        present = block(name, content).search(text) is not None
        if check_only:
            changes.append(f"{name}:{'ok' if present else 'MISSING'}")
            continue
        anchor = "</head>" if where == "head" else "</body>"
        text, inserted = upsert(text, name, content, anchor)
        changes.append(f"{name}:{'updated' if inserted else 'added'}")
    if check_only:
        return changes
    path.write_text(text, encoding="utf-8")
    return changes

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", choices=sorted(KINDS), help="inject one kind of block only")
    ap.add_argument("--check", action="store_true", help="report missing blocks, write nothing")
    args = ap.parse_args()

    keep = KINDS[args.only] if args.only else None
    total = 0
    missing = 0
    for path, accordions, inline_tools, lang, kind in shipped_pages():
        changes = process(path, (path, accordions, inline_tools, lang, keep, kind), args.check)
        total += 1
        missing += sum("MISSING" in c for c in changes)
        print(f"{path.relative_to(ROOT)}: {', '.join(changes)}")
    print(f"{'checked' if args.check else 'updated'} {total} pages")
    return 1 if args.check and missing else 0

if __name__ == "__main__":
    sys.exit(main())
