#!/usr/bin/env bash
# Export every shipped page of the tool to PDF via headless Chromium/Edge.
# Pages open all accordions automatically at print time (beforeprint hook).
#
# Usage:  ./scripts/make_pdf.sh [output_dir]
# Browser override:  BROWSER=/path/to/chrome ./scripts/make_pdf.sh
# Requires: Google Chrome, Chromium or Microsoft Edge (headless).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$root/dist/pdf}"
mkdir -p "$out"

find_browser() {
  local candidates=("${BROWSER:-}" \
    google-chrome google-chrome-stable chromium chromium-browser \
    microsoft-edge msedge \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
    "/Program Files/Google/Chrome/Application/chrome.exe" \
    "/Program Files (x86)/Microsoft/Edge/Application/msedge.exe")
  for b in "${candidates[@]}"; do
    [ -n "$b" ] && command -v "$b" >/dev/null 2>&1 && { echo "$b"; return 0; }
    [ -n "$b" ] && [ -x "$b" ] && { echo "$b"; return 0; }
  done
  return 1
}

BROWSER_BIN="$(find_browser)" || {
  echo "No Chrome/Chromium/Edge found. Set BROWSER=/path/to/browser." >&2
  exit 1
}

pages=(
  "rapport/rapport_FR.html"
  "LISEZ-MOI.html"
  "discord/rejoindre-discord.html"
)
for f in "$root"/chapitres/chapitre-*-espace.html "$root"/composants/composant-*-espace.html; do
  pages+=("${f#"$root"/}")
done

for page in "${pages[@]}"; do
  name="$(basename "$page" .html)"
  echo "-> $name"
  "$BROWSER_BIN" --headless=new --disable-gpu \
    --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$out/$name.pdf" \
    "file://$root/$page" 2>/dev/null
done

echo
echo "PDFs écrits dans : $out"
ls -la "$out"
