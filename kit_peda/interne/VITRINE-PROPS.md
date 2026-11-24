# Vitrines → props : table de distribution

Générée par `scripts/gen_vitrine_props.mjs` — **ne pas éditer à la main**. Source des vitrines :
le bloc `__LAYOUT__` de `frise/perspective-J-musee.html` (le même que `sim_musee_layout.mjs`).
L'archétype est un FNV-1a stable de la clé de station `v<i>` : immuable tant que l'identifiant
de l'événement ne change pas, reproductible sans état. **Les props sont décoratifs** — le sens
reste dans les trois plaques ; aucun prop n'encode un fait du corpus.

## Kit (7 archétypes, un GLB instancié)

- `docstack` — pile de documents sous verre — 150–300 tris — atlas commun 512px
- `maproll` — carte roulée — 80–150 tris — atlas commun 512px
- `radio` — radio d'époque (boîtier silhouette) — 200–400 tris — atlas commun 512px
- `lantern` — lampe à huile / lanterne — 150–300 tris — atlas commun 512px
- `letter` — lettre pliée + cachet — 60–120 tris — atlas commun 512px
- `watch` — montre gousset posée — 120–250 tris — atlas commun 512px
- `books` — pile de trois livres — 100–200 tris — atlas commun 512px

Export : glTF + Draco (`gltfpack -cc -tc`), atlas KTX2 ; props exclus des `hitables`
(ou hits transférés au socle) pour garder `verif_musee.mjs` vert.

## Table (49 vitrines)

| clé | salle | année | colonne | x, z (m) | archétype | rotY | titre du fait |
|---|---|---|---|---|---|---|---|
| v2 | 0 | 1915.2 | gauche | -0.95, -9.97 | `radio` | 273° | Hussein-MacMahon — des promesses, déjà trahies |
| v3 | 0 | 1916.38 | droite | 0.95, -10.39 | `letter` | 94° | Accords Sykes-Picot |
| v4 | 1 | 1917.9 | gauche | -0.95, -14.91 | `watch` | 271° | Balfour — « une promesse de celui qui n’a pas à celui qui n’a pas » |
| v7 | 1 | 1936.3 | droite | 0.95, -20.14 | `lantern` | 90° | La Grande Révolte — écrasée, mais fondatrice |
| v8 | 1 | 1939.42 | gauche | -0.95, -21.04 | `maproll` | 283° | Livre blanc britannique |
| v9 | 1 | 1941.7 | droite | 0.95, -21.69 | `lantern` | 104° | La Shoah — crime d’Europe, facture payée en Palestine |
| v11 | 1 | 1946.55 | gauche | -0.95, -23.08 | `letter` | 219° | King David — un attentat contre le QG britannique |
| v12 | 1 | 1947.9 | droite | 0.95, -23.19 | `radio` | 38° | Le plan de partage — décidé sans les Palestinien·nes |
| v13 | 2 | 1948.42 | gauche | -0.95, -27.71 | `docstack` | 217° | La guerre qui détruit la société palestinienne |
| v14 | 2 | 1948.45 | droite | 0.95, -27.71 | `watch` | 36° | Al-Nakba — 700 000 expulsé·es |
| v15 | 2 | 1948.95 | gauche | -0.95, -28.63 | `lantern` | 215° | Résolution 194 — le retour promis, jamais appliqué |
| v19 | 2 | 1950.33 | droite | 0.95, -28.63 | `books` | 227° | L’UNRWA — le camp de réfugiés durable |
| v20 | 2 | 1950.5 | gauche | -0.95, -29.55 | `lantern` | 315° | Loi du retour — l’envers du miroir |
| v24 | 2 | 1956.85 | droite | 0.95, -31.34 | `radio` | 311° | Suez — la guerre de l’Égypte |
| v25 | 2 | 1964.42 | gauche | -0.95, -34.71 | `letter` | 132° | L’OLP — la cause reprend ses propriétaires |
| v26 | 2 | 1967.5 | droite | 0.95, -35.99 | `watch` | 309° | L’occupation commence (juin 1967) |
| v27 | 3 | 1969.15 | gauche | -0.95, -40.61 | `docstack` | 130° | Arafat — la réappropriation par la main |
| v29 | 3 | 1973.76 | droite | 0.95, -42.25 | `lantern` | 128° | Guerre de Kippour |
| v30 | 3 | 1975.88 | gauche | -0.95, -43.01 | `lantern` | 74° | Résolution 3379 : « sionisme = racisme » |
| v31 | 3 | 1977.37 | droite | 0.95, -43.54 | `maproll` | 253° | Le Likoud au pouvoir |
| v33 | 3 | 1978.72 | gauche | -0.95, -44.02 | `watch` | 255° | Camp David — la paix avec l’Égypte, sans les Palestinien·nes |
| v35 | 3 | 1982.6 | droite | 0.95, -45.40 | `radio` | 257° | Beyrouth — puis Sabra et Chatila |
| v38 | 3 | 1987.95 | gauche | -0.95, -47.30 | `watch` | 82° | La première Intifada — un peuple se soulève |
| v40 | 3 | 1988.88 | droite | 0.95, -47.63 | `letter` | 245° | 1988 — l’indépendance déclarée depuis Alger |
| v45 | 4 | 1993.7 | gauche | -0.95, -53.45 | `docstack` | 70° | Oslo — la reconnaissance sans la fin |
| v47 | 4 | 1995.72 | droite | 0.95, -54.73 | `letter` | 72° | Oslo II — le découpage « provisoire » qui reste |
| v48 | 4 | 1995.92 | gauche | -0.95, -54.86 | `radio` | 237° | Assassinat de Yitzhak Rabin |
| v52 | 4 | 2000.54 | droite | 0.95, -57.79 | `watch` | 162° | La seconde Intifada — le soulèvement contre l’occupation |
| v55 | 4 | 2002.23 | gauche | -0.95, -58.87 | `maproll` | 347° | 2002 — les villes réoccupées, le mur au milieu |
| v58 | 4 | 2004.6 | droite | 0.95, -60.37 | `docstack` | 156° | Le mur condamné par la CIJ ; Arafat s’éteint |
| v59 | 4 | 2005.55 | gauche | -0.95, -60.98 | `watch` | 335° | BDS — le boycott, modèle sud-africain assumé |
| v60 | 4 | 2005.67 | droite | 0.95, -61.29 | `radio` | 303° | Le désengagement — et Gaza toujours assiégée |
| v62 | 5 | 2007.6 | gauche | -0.95, -66.13 | `watch` | 301° | Gaza sous blocus |
| v64 | 5 | 2008.99 | droite | 0.95, -66.91 | `lantern` | 307° | Plomb durci — 1 400 mort·es à Gaza |
| v69 | 5 | 2012.91 | gauche | -0.95, -69.09 | `books` | 132° | Un État reconnu par 138 voix |
| v70 | 5 | 2014.58 | droite | 0.95, -70.02 | `lantern` | 94° | Gaza — 50 jours de guerre (2014) |
| v72 | 5 | 2016.98 | gauche | -0.95, -71.35 | `docstack` | 96° | 2334 — les colonies déclarées illégales |
| v74 | 5 | 2017.96 | droite | 0.95, -71.90 | `radio` | 90° | Jérusalem — la trahison américaine |
| v75 | 5 | 2018.24 | gauche | -0.95, -72.27 | `docstack` | 269° | Le droit au retour, écrasé à la barrière |
| v78 | 5 | 2020.75 | droite | 0.95, -73.45 | `watch` | 102° | Accords d'Abraham |
| v79 | 5 | 2021.03 | gauche | -0.95, -73.60 | `lantern` | 281° | Le mot « apartheid » devient expert |
| v80 | 5 | 2021.38 | droite | 0.95, -74.37 | `lantern` | 137° | Cheikh Jarrah — Jérusalem se soulève |
| v82 | 6 | 2023.8 | gauche | -0.95, -79.87 | `docstack` | 139° | Octobre 7, puis la guerre sur Gaza |
| v83 | 6 | 2024.08 | droite | 0.95, -80.32 | `radio` | 320° | La Haye — enfin une cour |
| v85 | 6 | 2024.3 | gauche | -0.95, -80.79 | `letter` | 314° | Le veto — Washington couvre, et bloque la reconnaissance |
| v86 | 6 | 2024.45 | droite | 0.95, -81.24 | `books` | 135° | La reconnaissance, par vagues |
| v87 | 6 | 2024.55 | gauche | -0.95, -81.71 | `maproll` | 316° | La CIJ juge l’occupation illégale |
| v88 | 6 | 2024.85 | droite | 0.95, -82.16 | `maproll` | 129° | Les mandats d’arrêt — le tabou brisé |
| v90 | 6 | 2025.78 | gauche | -0.95, -83.02 | `letter` | 288° | Le cessez-le-feu — Gaza à reconstruire, comptes à rendre |

## Notes de distribution

- aucune répétition consécutive de plus de deux archétypes dans une salle.
