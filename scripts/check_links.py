#!/usr/bin/env python3
"""check_links.py — vérifie tous les liens du kit.

Interne : chaque href/src relatif doit résoudre sur le disque (même règle que la
batterie de vérification, étendue à toutes les pages livrées).
Externe : chaque URL http(s) est interrogée (HEAD, fallback GET) — code 4xx/5xx
= cassé ; 403/405/429/timeout = « à l'œil » (beaucoup de sites bloquent les bots),
jamais une erreur franche.

Usage :
  /usr/bin/python3 scripts/check_links.py               # interne + externe
  /usr/bin/python3 scripts/check_links.py --internal-only
  /usr/bin/python3 scripts/check_links.py --external-only
Sortie : rapports séparés. Codes retour : 0 = OK/a-l'oeil uniquement,
1 = au moins un lien interne manquant ou externe franchement cassé.
"""
import argparse
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent

PAGES = (sorted((ROOT / "chapitres").glob("*.html"))
         + sorted((ROOT / "composants").glob("*.html"))
         + sorted((ROOT / "rapport").glob("*.html"))
         + sorted((ROOT / "interne").glob("*.html"))
         + [ROOT / "index.html", ROOT / "LISEZ-MOI.html", ROOT / "discord" / "rejoindre-discord.html"])

LINK = re.compile(r"""(?:href|src)\s*=\s*["']([^"'#]+)(?:#[^"']*)?["']""")
SOFT = {402, 403, 405, 429, 503}  # murs anti-bot : non conclusif
# le code '000' de curl = échec de connexion (souvent un blocage), traité comme non plus non conclusif


def probe(url: str) -> str:
    """HEAD puis GET si le HEAD n'est pas probant ; renvoie '200', '301', '404', 'timeout', 'ERR'.
    Un 404 peut être une bordure CDN capricieuse (constaté : hrw.org renvoie parfois
    « Page Not Found » sur une URL valide) -> 3 tentatives espacées avant de conclure."""
    import time
    last = "ERR"
    for attempt in range(3):
        for method in ("-I", "-X GET"):
            try:
                out = subprocess.run(
                    ["curl", "-s", "-o", "/dev/null", "--max-time", "20",
                     "--user-agent", "Mozilla/5.0 (compatible; link-checker)",
                     "-w", "%{http_code}", method, "-L", url],
                    capture_output=True, text=True, timeout=30).stdout.strip()
                if out.isdigit():
                    last = out
                    # HEAD rejeté de façon non concluante -> réessayer en GET
                    if method == "-I" and out in ("405", "400", "403"):
                        continue
                    if out != "404":
                        return out
                else:
                    last = "timeout" if not out else out
            except subprocess.TimeoutExpired:
                last = "timeout"
        if last not in ("404", "000", "timeout", "ERR"):
            return last
        if attempt < 2:
            time.sleep(4)
    return last


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--internal-only", action="store_true")
    ap.add_argument("--external-only", action="store_true")
    args = ap.parse_args()

    internal, external = {}, {}
    for page in PAGES:
        if not page.exists():
            continue
        body = page.read_text(encoding="utf-8")
        for m in LINK.finditer(body):
            u = unquote(m.group(1)).strip()
            if u.startswith(("mailto:", "tel:", "data:", "javascript:")):
                continue
            if u.startswith("http"):
                external.setdefault(u.split("#")[0], set()).add(page.relative_to(ROOT))
            else:
                target = (page.parent / u).resolve()
                if not target.exists():
                    internal.setdefault(str(page.relative_to(ROOT)), []).append(u)

    bad = 0
    if not args.external_only:
        if internal:
            print("── LIENS INTERNES MANQUANTS")
            for p, us in sorted(internal.items()):
                for u in sorted(set(us)):
                    print(f"  {p}  ->  {u}")
            bad = 1
        else:
            print("Liens internes : OK")

    if not args.internal_only:
        print(f"\n── LIENS EXTERNES ({len(external)} uniques)")
        verdict = Counter()
        for url in sorted(external):
            res = probe(url)
            code = res.split(" ")[0]
            if code.startswith("2"):
                verdict["ok"] += 1
            elif code in ("404", "410", "500", "502") or code in {str(s) for s in SOFT if s in (404, 410, 500, 502)}:
                verdict["cassé"] += 1
                print(f"  CASSÉ {res}  {url}\n        {' '.join(sorted(map(str, external[url])))}")
                bad = 1
            elif code in (str(s) for s in SOFT) or code == "000" or res in ("timeout", "ERR"):
                verdict["à l'œil"] += 1
                print(f"  ?     {res:>4}  {url}")
            elif code.startswith("3"):
                verdict["redirect"] += 1
                print(f"  ->    {res}  {url}")
            else:
                verdict["cassé"] += 1
                print(f"  CASSÉ {res}  {url}")
                bad = 1
        print("   " + " · ".join(f"{k}: {v}" for k, v in sorted(verdict.items())))
    return bad


if __name__ == "__main__":
    sys.exit(main())
