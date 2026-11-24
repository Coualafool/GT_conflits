#!/usr/bin/env bash
# Suis en direct la batterie de vérifs en cours sur la machine Windows (TARS).
# Usage : scripts/watch_run.sh          (fraîche + défilement, Ctrl-C pour sortir)
#         scripts/watch_run.sh --stats  (compteur PASS/FAIL/suites, rafraîchi 5 s)
LOG="$(dirname "$0")/../_runs/latest.log"
if [ "$1" = "--stats" ]; then
  while :; do
    P=$(grep -c '^PASS' "$LOG" 2>/dev/null); F=$(grep -ci 'FAIL\|a echoue' "$LOG" 2>/dev/null)
    S=$(grep -c '^===== ' "$LOG" 2>/dev/null); D=$(grep -c 'BATTERY_DONE' "$LOG" 2>/dev/null)
    SUITE=$(grep '^===== ' "$LOG" 2>/dev/null | tail -1 | tr -d '=')
    printf '\r[%.0s] suite: %-24s PASS:%-3s FAIL:%-2s %s   ' "$(date +%S)" "${SUITE:-—}" "$P" "$F" "$([ "$D" -gt 0 ] && echo '✔ TERMINÉ' || echo '… en cours')"
    [ "$D" -gt 0 ] && break; sleep 5
  done; echo
else
  tail -n 15 -f "$LOG"
fi
