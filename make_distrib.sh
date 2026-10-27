#!/usr/bin/env bash
# make_distrib.sh — construit le zip de test du site (destiné à être envoyé tel quel).
# N'inclut PAS les prototypes internes (versions-noyau/) ni les fichiers de dev.
# Usage : ./make_distrib.sh [suffixe]   →  ../outil-peda-israel-palestine_<suffixe>.zip
set -euo pipefail
cd "$(dirname "$0")"

SUFFIX="${1:-test-$(date +%Y-%m-%d)}"
OUT="$(cd .. && pwd)/outil-peda-israel-palestine_${SUFFIX}.zip"
NAME="outil-peda-israel-palestine"

FILES=(index.html LISEZ-MOI.html README.md rapport_FR.html rapport_EN.html chapitre-1-espace.html chapitre-2-espace.html chapitre-3-espace.html chapitre-4-espace.html chapitre-5-espace.html chapitre-6-espace.html chapitre-7-espace.html chapitre-8-espace.html chapitre-9-espace.html chapitre-10-espace.html chapitre-11-espace.html composant-A-espace.html composant-B-espace.html composant-C-espace.html composant-D-espace.html composant-E-espace.html composant-F-espace.html composant-G-espace.html composant-H-espace.html composant-I-espace.html)

# Contrôle : tous les fichiers attendus doivent exister.
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "ERREUR : fichier manquant : $f" >&2; exit 1; }
done

STAGE="$(mktemp -d)/$NAME"
mkdir -p "$STAGE"
cp "${FILES[@]}" "$STAGE"/

rm -f "$OUT"
(cd "$(dirname "$STAGE")" && zip -qr "$OUT" "$NAME")
rm -rf "$(dirname "$STAGE")"

COUNT=$(unzip -Z1 "$OUT" | grep -v '/$' | wc -l)
echo "Construit : $OUT"
echo "Fichiers dans le zip : $COUNT (attendu : ${#FILES[@]})"
[ "$COUNT" -eq "${#FILES[@]}" ] && echo "OK"
