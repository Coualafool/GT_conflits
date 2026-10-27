#!/usr/bin/env bash
# make_distrib.sh — construit le zip de test du site (destiné à être envoyé tel quel).
# N'inclut PAS les prototypes internes (interne/) ni les fichiers de dev (.git, .github, ce script).
# L'arborescence du dépôt est conservée : les liens relatifs entre pages en dépendent.
# Usage : ./scripts/make_distrib.sh [suffixe]   →  ../outil-peda-israel-palestine_<suffixe>.zip
set -euo pipefail
cd "$(dirname "$0")/.."

SUFFIX="${1:-test-$(date +%Y-%m-%d)}"
OUT="$(cd .. && pwd)/outil-peda-israel-palestine_${SUFFIX}.zip"
NAME="outil-peda-israel-palestine"

FILES=(index.html LISEZ-MOI.html README.md
       rapport/rapport_FR.html rapport/rapport_EN.html
       chapitres/chapitre-1-espace.html chapitres/chapitre-2-espace.html chapitres/chapitre-3-espace.html
       chapitres/chapitre-4-espace.html chapitres/chapitre-5-espace.html chapitres/chapitre-6-espace.html
       chapitres/chapitre-7-espace.html chapitres/chapitre-8-espace.html chapitres/chapitre-9-espace.html
       chapitres/chapitre-10-espace.html chapitres/chapitre-11-espace.html
       composants/composant-A-espace.html composants/composant-B-espace.html composants/composant-C-espace.html
       composants/composant-D-espace.html composants/composant-E-espace.html composants/composant-F-espace.html
       composants/composant-G-espace.html composants/composant-H-espace.html composants/composant-I-espace.html)

# Contrôle : tous les fichiers attendus doivent exister.
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "ERREUR : fichier manquant : $f" >&2; exit 1; }
done

STAGE_ROOT="$(mktemp -d)"
STAGE="$STAGE_ROOT/$NAME"
mkdir -p "$STAGE"

for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  cp "$f" "$STAGE/$f"
done

rm -f "$OUT"
if command -v zip >/dev/null 2>&1; then
  (cd "$STAGE_ROOT" && zip -qr "$OUT" "$NAME")
elif command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1; then
  PY=$(command -v python || command -v python3)
  if command -v cygpath >/dev/null 2>&1; then
    ROOT_ARG="$(cygpath -w "$STAGE_ROOT")"; OUT_ARG="$(cygpath -w "$OUT")"
  else
    ROOT_ARG="$STAGE_ROOT"; OUT_ARG="$OUT"
  fi
  "$PY" - "$ROOT_ARG" "$NAME" "$OUT_ARG" <<'PYEOF'
import os, sys, zipfile
root, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
base = os.path.join(root, name)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, _dirs, files in os.walk(base):
        for f in sorted(files):
            full = os.path.join(dirpath, f)
            z.write(full, os.path.join(name, os.path.relpath(full, base)))
PYEOF
else
  echo "ERREUR : ni 'zip' ni 'python' disponibles pour créer l'archive." >&2
  exit 1
fi
rm -rf "$STAGE_ROOT"

COUNT=$( (unzip -Z1 "$OUT" 2>/dev/null || "$PY" -c 'import sys,zipfile;print("\n".join(n for n in zipfile.ZipFile(sys.argv[1]).namelist() if not n.endswith("/")))' "${OUT_ARG:-$OUT}") | grep -v '/$' | wc -l)
echo "Construit : $OUT"
echo "Fichiers dans le zip : $COUNT (attendu : ${#FILES[@]})"
[ "$COUNT" -eq "${#FILES[@]}" ] && echo "OK"
