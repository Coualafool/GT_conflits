# In-class notes feature — agreed design (bracketed, NOT yet built)

Decided 2026-11-09 in a brainstorm session. This is the decision sheet to build from;
nothing below is implemented yet. Status: **awaiting go + Google Drive setup by user**.

## Purpose
Teacher takes notes during class while using the kit pages, to feed future update rounds
("what happened", "what should change in the kit"). Notes must survive across locations.

## Architecture (locked)
- **Live editor:** localStorage (auto-save, debounced 500 ms, never needs a Save button).
- **Transport between machines:** one Markdown file per chapter exported/imported by hand
  through a **Google Drive** synced folder (`GT_conflits/notes/`, via Google Drive for
  desktop on Linux + Windows). Kit stays in git; Drive carries only the notes files.
- Browser save dialog pointed once at the Drive folder (browsers remember last folder).
- Import = **merge per sequence by timestamp** (newest wins per field, never blind
  overwrite); files matching conflict patterns (`(1)`, `copie conflit`) ignored with a toast.

## Data model (locked)
- Key scheme extends existing convention: `gtconflits-v1:notes:ch{N}:{sK}`.
- Notes are **per session**: each entry carries **class label + date** (user teaches the
  same chapter to several classes) — export groups by sequence, then by session.
- Guided fields per session entry:
  - ⏱ Durée réelle (drawer pre-prints planned duration from sequence data when present;
    blank where the page doesn't state one)
  - 👍 Ce qui a marché
  - 👎 Ce qui a coincé
  - 💬 Remarques d'élèves (à rebondir)
  - 🔧 À modifier dans le kit (explicit change requests → becomes the update backlog)
  - Libre
- **Block pinning in v1:** « + noter ici » beside each activity/h4 pins a `bloc_ref`
  (e.g. `ch3:s2:La solution israélienne`) so change requests point at exact blocks.

## File format (locked)
Markdown, fixed skeleton, machine-parseable, human-first (pasteable to the agent for
update rounds). Version guard comment `<!-- gtconflits-notes:format:1 -->`.
Sketch: `# Notes de classe — Chapitre N : …` → `## S2 — <titre>` → per-session subsection
with `- Classe:` / `- Date:` / `- Durée:` lines and `### Ça a marché` etc. blocks; pinned
notes rendered as `- @bloc:<anchor> — texte`.

## UI (locked)
- `📝` button in the teacher toolbar opens a right-side drawer (teacher view only —
  built by JS only when teacher mode on; never in student view, never printed).
- `Shift+N` hotkey toggle; per-sequence status chips: `—` empty · `●` newer than last
  export · `✓` synced.
- **Reminder banner on every page** when any chapter has notes newer than their export.
- Drawer footer: "pas de noms d'élèves" privacy line.
- Reset possible per chapter AND per sequence, double-confirm; clearing localStorage
  ≠ deleting the synced file (warning).

## Deferred
- Cross-chapter notes dashboard ("toutes mes notes") — later round, after real usage.
- "Historique des retours classe" section generated from the .md files — later round.

## Build-time checks / caveats
- **Verify early (TARS):** chapters opened as separate `file://` pages must share one
  localStorage origin for the cross-chapter banner to work. Per-page persistence already
  works; cross-file sharing is the open question. Fallback if not shared: banner
  degrades to per-chapter scope; export/merge machinery unaffected.
- Drive conflict-copy naming ignored by import (see above).
- Notes never included in print/PDF or the distributable build.
- Phone: reading the .md via Drive app is fine; importing into the kit on phone is out
  of scope (document in NOTES.md how-to).

## Acceptance test (once Drive folder exists)
Notes typed on machine A appear inside the kit on machine B after « Synchroniser », for
all three edit-order cases (A only / B only / both edited), nothing lost. Playwright on
TARS + one real sync round-trip.

## Related open gap (pre-existing, unrelated to notes)
`make_distrib.sh` FILES list omits `pictures/` and `discord/` — pending decision.
