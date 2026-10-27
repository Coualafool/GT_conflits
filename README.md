# Outil pédagogique Israël–Palestine — investigation & modernisation

Investigation of the shared Google Drive folder **« 2026_Outil péda_Israël-Palestine »** and a
proposal to turn it into a modern, modular toolset for students and teachers.

## Source
- Drive folder: https://drive.google.com/drive/folders/1DNFOr5uEMC1cs6lHWPLRqoW4idBqWtlq
- A French-language, civil-society-built peace-education toolkit on the Israeli–Palestinian
  question (francophone Belgium), revised 2025–2026, lineage back to a 2009 CD-era kit.
- Read-only investigation; no Drive files were modified.

## Repository layout

```
index.html                 entry point (redirects to rapport/rapport_FR.html)
LISEZ-MOI.html             French tester guide
README.md                  this file
rapport/
  rapport_FR.html          full report in French (primary deliverable / index)
  rapport_EN.html          same report in English (static, no linked pages)
chapitres/                 one workspace page per chapter (11)
composants/                one chantier page per proposed component (9)
interne/versions-noyau/    the three index prototypes explored (internal, not shipped)
scripts/make_distrib.sh    builds the tester zip
.github/workflows/         GitHub Pages deployment (whole repo)
```

## Contents
- `index.html` — **entry point**; double-click this when the folder is handed to someone.
- `LISEZ-MOI.html` — French **tester guide** (how to open, what's inside, what feedback is expected).
- `rapport/rapport_FR.html` — full report in French. Section 3 (12 chapters)
  and section 7 (9 proposed components) both use the **Version B card design** (badge, chips,
  expandable plan, banner CTA — one open at a time).
- `chapitres/chapitre-1-espace.html` … `chapitre-11-espace.html` — one dedicated **workspace page**
  per chapter (Version B design: header card with band + badge, sequenced accordions with
  "À travailler ici" blocks, Notes & ressources). Linked from each chapter card's banner.
- `composants/composant-A-espace.html` … `composant-I-espace.html` — one dedicated **chantier page**
  per proposed component (implementation steps as sequenced accordions).
- `rapport/rapport_EN.html` — same report in English (static version).
- `scripts/make_distrib.sh` — builds the **test zip** to send to external testers
  (`./scripts/make_distrib.sh [suffix]` → `../outil-peda-israel-palestine_<suffix>.zip`;
  preserves the folder tree, excludes `interne/`).
- `interne/versions-noyau/` — the three index prototypes (`version_A/B/C.html`) that were explored;
  Version B was adopted for the index cards and the workspace pages. **Internal — not shipped.**

All pages are self-contained single-file HTML (inline CSS, no external dependencies). Links are
relative, so the folder tree must be kept intact; open any page in any browser.

## What the report covers
1. What the folder is · 2. Folder anatomy · 3. The 12-chapter core · 4. Assets & media ·
5. How it was made · 6. Strengths & gaps · 7. Proposed new toolset (9 components) ·
8. Roadmap · 9. Risks & guardrails · 10. Glossary.
