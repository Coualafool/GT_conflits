# La Tresse 3D — braid timeline, agreed design (bracketed, NOT yet built)

Decided 2026-11-16 in a brainstorm session. This is the decision sheet to build from;
nothing below is implemented yet. Status: **awaiting build go**.

## Purpose
A 3D spatialisation of the official frise corpus (93 événements, `EV` +
`poc-perspectives.js`) whose whole reason to exist is one thing the seven 2D views
cannot do: show **three simultaneous readings of one dated corpus** as geometry.
Not "the frise but wow" — the divergence itself made navigable.

## Decisions (locked, one line each)
1. **Concept — The Braid**: time = X, récit = depth, récit-weight (LV) = height.
   Chosen over Corridor (walk-through rooms), Helix (planetarium ornament) and
   Time×geography (needs geocoding, second product).
2. **Shared events are REPLICATED**: each récit that tells a fact gets its own card,
   carrying its own `REN` title; a chord links the copies. ~200 cards max — fine.
3. **Lane order — no centre**: triangular cross-section, the three lanes equidistant;
   no vantage point is the default one.
4. **Ghost outlines** (faint absent-card silhouette in an excluding lane): built, but
   **hidden behind an off-by-default toggle**, judged live in the PoC.
5. **On arrival**: neutral ¾-high camera; the spectator is NOT asked « depuis quel
   récit regardez-vous » — choosing comes later via the couloir presets.
6. **Tech — CSS 3D transforms**: real HTML cards (`translate3d`) in a `perspective`
   container; the camera IS a container transform. Chords on one SVG/canvas layer
   beneath the cards. Chosen over vendored Three.js and hand-rolled canvas projection.
7. **Status — PoC judged first**: `frise/perspective-H-tresse3d.html`, linked from
   `index-comparatif.html` beside the other views, judged with the usual
   `tars_run_verifs.ps1` battery + screenshot QC. Promotion to a site entry
   (hero/rails/distrib) is a **separate later decision**.
8. **Detail panel — all versions at once**: neutral fact first (description from
   `EV`), then the récit versions side by side, each in its lane colour, divergent
   titles immediately visible. The comparison IS the lesson.

## Scene model
- Axes: X = année (`T_MIN`→`T_MAX`), depth+triangle position = récit
  (pal/isr/occ equidistant), Y (height) = LV 2 « central » high / LV 1 « second plan »
  mid / **LV 0 absent from the lane** (the editorial exclusion gate expressed as pure
  absence — never a dimmed card).
- `ERAS` bands = tinted floor stripes travelled along; per-récit era divisions may
  label each lane's own floor.
- Cards are the same text as the 2D views (`lvOf/titleOf` helpers) — zero new data,
  zero dataset fork. Data stays 100 % derived from `poc-data.js` + `poc-perspectives.js`
  (both remain pure modules; each page owns its own camera state).

## Camera doctrine (hard rule)
- **Presets only, never free orbit** — free orbit destroys the time-axis intuition.
  - ¾ haute (default): divergence view, all three lanes + chords legible;
  - Plongeante: top-down ≈ today's perspective F (the known 2D reading);
  - Couloir: low camera inside one récit's lane (« lire depuis un récit » ×3);
  - Profil: side-on, chords edge-on.
- Wheel/keys dolly **along time only**; clicking a card eases the camera to it;
  `prefers-reduced-motion` = presets cut instantly instead of gliding.
- Keyboard camera control required (arrows dolly, keys for presets); every card a
  real focusable button with visible focus ring.

## Interaction & panel
- Hover/focus raises the card and lights its chord; click opens the panel (decision 8)
  with the kit back-link `chapitre-N-espace.html#sS` as in all views; Esc / click-away
  closes.
- Deep links preserved: `?ch=N` / `?ev=i` MOVE THE CAMERA to the range/event
  (window computed from the corpus, never hardcoded); `#sN.S` focuses the row and
  pre-opens the panel.
- Occlusion defence by construction: browser depth order + distance fade; labels
  readable on near slice / focused card; **never drop a card to avoid collision**
  (the old disappearance bug must not return in 3D).

## Why CSS 3D (decision 6, consequences)
- Zero dependencies, `file://`-native, ships in the distrib zip unchanged;
  playwright harness asserts on real DOM as usual; crisp text at any zoom; theme vars
  apply; ≤200 transformed elements is trivial for school machines.
- Three.js only becomes interesting if the Corridor or Time×geography ideas are ever
  built — same data modules and camera doctrine would carry over, this PoC does not
  block that path.

## Harness (new `scripts/verif_tresse3d.mjs`, added to tars_run_verifs)
- Exhaustiveness: visible cards == Σ nTold per view state; chord count == shared facts;
  LV-0 cards absent from their lane; editorial floors/ceilings re-asserted.
- Geometry: no card-card full overlap in any preset; chords connect the right copies
  (pick 1948: « La Nakba » ↔ « Indépendance » linked, one date).
- Camera: presets reachable by click AND key; dolly clamps to domain; reduced-motion
  honoured; no gesture produces a free-orbit escape from the time axis.
- Panel: opens on click, shows all récit versions + neutral fact + back-link;
  `?ev=i` focuses; ghosts toggle off by default.
- Mobile 390 px: fit + zero horizontal overflow, as per poc-A precedent.

## Deferred (explicitly)
- Promotion to site entry (hero, chapter rails, `shipped_pages()` flags, distrib) —
  separate decision after PoC verdict.
- Ghost-outline final on/off — PoC toggle decides.
- Corridor / Helix / Time×geography — later products, not this one.
- In-page bascule F↔H comparison — considered, not chosen (option rejected: PoC
  judged standalone).

## Build-time checks / caveats
- Shared `<script src>` purity: H owns its own camera/state consts (duplicated
  top-level const between shared module and page = silent SyntaxError, known pitfall).
- Frise page-kind rules from `inject_common.py`: frise-outils bar + compact pied only,
  no fixed-position tools; register H in `shipped_pages()` + `index-comparatif` on
  build day; re-run `--check` = 0 MISSING.
- CSS 3D gotchas to verify on TARS early: `perspective` + `overflow` interaction
  (overflow hidden flattens 3D in some engines), focus-ring legibility on rotated
  lanes, print CSS (frise pages print the 2D fallback state — define it: plongeante).
