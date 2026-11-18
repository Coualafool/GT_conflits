# Le Musée des récits — walkable 3D period-room museum, agreed design (NOT yet built)

Decided 2026-11-18 in a brainstorm session (five hinge questions asked and answered —
not defaults, explicit user picks). This is the decision sheet to build from; nothing
below is implemented. Status: **awaiting build go; spike first** (see « Spike »).

Lineage: this is the « Corridor (walk-through rooms) » concept that `FRISE-3D-DECISIONS.md`
(deliberately) rejected for the Braid in Nov 2026, on the grounds that CSS 3D was enough
for a braid — while explicitly reserving « Three.js only becomes interesting if the
Corridor … is ever built — same data modules and camera doctrine would carry over ».
That path is now the chosen one. `poc-data.js` + `poc-perspectives.js` stay the single
corpus; the museum is another VIEW, never a data fork.

## Purpose
Let a visitor **walk inside the three récits**: period rooms make time a corridor,
wall allegiance makes narrative a place, curtains make **silence visible while walking**
— the one editorial fact no flat view has expressed well (LV0 « pure absence » becomes
absence *with intent*: a covered spot asks « pourquoi rien ici ? »).

## Decisions (locked, one line each)
1. **Layout — Salles d'époque**: one physical room per era of the neutral `ERAS` bands;
   a central **vitrine** in each room hosts the contested facts of that span; **curtains**
   mark events a récit silences. Chosen over Trois Ailes (rotunda + wing per récit) and
   Grande Galerie (one hall, one wall per récit).
2. **Tech — vendored Three.js (real WebGL)**: first-person walking, fog, spotlights,
   real depth. Chosen over the CSS-3D corridor (recommended default) and over
   « prototype both ». Consequences accepted: new vendored dependency, canvas-texture
   text, heavier GPU cost, new harness surface.
3. **Movement — full first-person**: WASD + pointer-lock mouse-look, museum-as-a-game.
   Teleport (navigator strip + minimap + deep-link camera moves) is the accessibility
   fallback and the default re-entry framing. Chosen over teleport-first and over
   guided-tour-first (a docent mode stays a possible later add-on, not v1).
4. **Text — hybrid**: in-world baked canvas-texture labels (year + `REN` title, readable
   when near) + a crisp **DOM panel** opened by approaching / pressing E: full `EV`
   description, all récit versions in lane colours (panel doctrine inherited from H),
   kit back-link `chapitre-N-espace.html#sS`. Screen readers and text zoom read the DOM,
   never the texture.
5. **Atmosphere — warm archive**: dark slate walls, warm spotlights, gold reserved for
   divergence (same colour code as every frise view), fog to darkness beyond the light —
   rooms you haven't reached literally fade ahead. Chosen over white cube and over
   per-era period palettes.
6. **Wall grammar — fixed museum-wide**: left wall = récit palestinien, right wall =
   récit israélien, far wall + vitrine = faits disputés / trois voix. Learned once,
   valid in every room; a curtain on the left wall of room 1948 means *that récit* is
   silent at that fact, readable from across the room.

## Scene model
- Rooms from neutral `ERAS` (architecture is neutral by construction — narratives never
  get to move walls); each wall may carry its own récit's era sub-labels under the
  neutral room title, like H let each lane label its own floor.
- Poster = one event told by that wall's récit, positioned by year along the wall
  (`titleOf`/`lvOf` helpers); poster size/plinth height may encode LV (decide at build,
  LV never encodes dimming).
- Vitrine per room: shared facts whose `REN` titles diverge → one case, three plaques,
  gold rail (divergence code unchanged).
- Curtain count invariant: per récit, posters + curtains == whole corpus in that room.
- Zero new data: `EV`, `LV`, `REN`, `ERAS` only. Museum owns camera state only.

## Camera & movement doctrine
- Pointer-lock first-person: WASD + mouse-look, collision = room bounds only (straight
  corridors, no maze). Movement speed constant; `prefers-reduced-motion` → no glide,
  instant station jumps, pointer-lock never auto-engages.
- **Stations, not FPS**: within reach of a poster/vitrine, an « E » affordance focuses
  it; keyboard users Tab through focusable station proxies in walking order with visible
  focus rings (the DOM panel is the source of truth for a11y).
- Teleport-first re-entry: top navigator (variante-C lineage) + minimap list rooms;
  `?ch=N` / `?ev=i` / `#sN.S` MOVE THE CAMERA (window computed from corpus, never
  hardcoded) exactly as H/I; Esc releases pointer-lock, closes panel.
- Comfort lock: no head bob, no FOV punch, no roll; vignette + static crosshair only.

## Fallback & distribution (hard floors)
- WebGL failure or `file://` load failure → visible link to `variante-C-liste.html`:
  the museum is an enhancement, never the only door.
- Distrib zip grows ~0.7 MB (vendored bundle); DPR capped ~1.5, no shadow maps, few
  real lights + baked-look materials; target integrated GPUs / school Chromebooks.

## Spike (BEFORE any build — this gates everything)
Vendoring three.js so it works on `file://` is the only genuinely new technical unknown:
- S-A: bundle a pinned modern three via esbuild → one classic IIFE `.js`, committed to
  `frise/vendor/`;
- S-B: vendor the last classic (UMD) official build as-is.
Probe = a 10-line cube page loaded from `file://` on TARS (Edge + Chromium/playwright).
Winner ships; loser deleted. (E SM imports are CORS-dead on `file://` — never an option.)

## Harness (new `scripts/verif_musee.mjs`, added to tars_run_verifs)
Debug API `__musee` (pattern of `__h3d`/`__i3d`) exposes room bounds, poster/curtain/
vitrine inventories, camera state, raycast hits.
- Exhaustiveness: per récit, posters + curtains == nTold + silences per room; total
  posters == Σ nTold; gold vitrine rails == divergent shared facts; editorial
  floors/ceilings re-asserted from `nTold`, never hardcoded.
- Grammar: every pal poster x-position on the left wall plane, isr on the right,
  vitrine cases centred; no poster outside its room's date span.
- Camera: pointer-lock orbit signs, station snap within radius, teleport targets,
  reduced-motion instant mode; deep-link `?ev` lands the camera at the poster's room.
- Fallback: WebGL-disabled context shows the variante-C link.
- Screenshots to `artifacts/` only; `shot()` hides overlays; QC via the established
  git-only capture-branch recipe; run logged to `_runs/<name>.log` + `latest.log`.

## Deliberately NOT decided (build-phase choices, not open debates)
Docent/guided-tour mode (later add-on); exact LV encoding on posters; sound (only with
an off-by-default toggle, never ambience-on); room-to-room plan shape (straight enfilade
vs short L); whether curtains animate on approach.

## Status & next step
Spike S-A/S-B on TARS → report which build ships → build go for
`frise/perspective-J-musee.html` (name provisional), registered in
`index-comparatif.html` beside the other views. Promotion to a site entry
(hero/rails/distrib) stays a separate later decision, same as H/I.
