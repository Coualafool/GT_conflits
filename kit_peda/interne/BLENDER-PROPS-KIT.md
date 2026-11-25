# Kit props de vitrines — feuille de modélisation Blender

À lire EN ENTIER avant d'ouvrir Blender. Sources de vérité : `frise/perspective-J-musee.html`
(géométrie des vitrines, lignes ~568–597) et `interne/VITRINE-PROPS.md` / `interne/vitrine-props.json`
(quelle vitrine reçoit quel archétype, avec rotY). Le kit = **7 meshs, 1 matériau, 1 atlas, 1 GLB**.
Règle cardinale : les props sont **décoratifs** — ils n'encodent aucun fait ; le sens est dans le cartel.

## Contraintes dures (le « cookie cutter »)

| paramètre | valeur | origine |
|---|---|---|
| volume intérieur du verre | 0,60 L × 0,44 P × 0,52 H (m) | `BoxGeometry(.6,.52,.44)`, centre y=1,24 |
| **enveloppe prop max** | **0,56 × 0,40 × 0,48 (m)** | garde-fou 2 cm par côté sous le verre |
| sol du prop | plan y = 0 (pivot bas-centre) | la page posera le prop à y = 0,95 (dessus du socle = 0,475 + 0,95/2) |
| pivot | **bas-centre du bbox**, origine au sol | sinon rotY de la page fait orbiter le prop au lieu de le tourner |
| distance de lecture | 1,2–2,2 m, **35–55° de dessus**, à travers un verre teinté opacité 0,1 | poste visiteur + œil 1,62 m |
| matériau | UN seul, `MeshBasicMaterial` côté three → **l'éclairage est cuit dans la texture**, pas de PBR, pas de normales-map sauf nécessité de silhouette | doctrine « baked-look, pas de lights » |
| atlas | une seule texture diffuse 1024² (AO + couleur chaudes cuites), export KTX2 uastc via `gltfpack -tc` | budget distrib : atlas ≤ 256 Ko, GLB ≤ 150 Ko Draco |
| couleurs | palette « warm archive » : papier #cfc2a8 / #ece6da, bois #4a3b28, laiton #a8853f, tissu #3a2f24 ; **jamais d'or** (#d2a63f = code divergence, réservé au rail) | même code couleur que toutes les vues |

Conséquence du point de vue : la **silhouette et les faces du dessus** portent le prop.
Les détails de tranche (grilles de haut-parleur, texte de couverture, boutons minuscules)
se cuitent dans la texture, ils ne reçoivent jamais de géométrie.

## Convention commune à tous les meshs

1. Unités : 1 U = 1 m ; scène Blender éventuellement en millimètres, exporter en mètres (glTF scale OK).
2. Nommage des meshs = clé exacte du JSON : `prop_docstack`, `prop_maproll`, `prop_radio`,
   `prop_lantern`, `prop_letter`, `prop_watch`, `prop_books`. La page instancie par nom — un nom
   inventé = prop qui n'apparaît jamais.
3. Un seul matériau partagé (`M_props_atlas`), UV empaquetés dans l'atlas 1024² avec 8 px de bleed.
   Densité texel : privilégier les faces hautes (le prop est vu de dessus).
4. Bakes : AO (32–64 samples, distance 2 cm) + diffuse couleur chaude **avec le dégradé de spot
   simulé** (plus clair au centre du volume, plus sombre vers le bas — c'est le spot du plafond qui
   fait le modelé). Ombrage = valeur cuite, pas de lights dans la scène three.
5. Modifiers à appliquer avant export (Bevel, Decimate) ; le GLB final = `props-musee.glb`,
   à la racine du kit ou `frise/` (décidé à l'intégration), chargé UNE fois, instancié 49 fois.
6. Aucune animation, aucune hiérarchie d'os, aucune lumière dans le fichier.

## Pages archetype

Pour chacun : dimensions = bbox cible dans l'enveloppe ; tris = plage **après** application des
modifiers (le générateur d'audit vérifiera) ; « silhouette » = ce que l'œil lit à 2 m.

### 1. `prop_docstack` — pile de documents sous verre (7 vitrines)
- **bbox** 0,26 × 0,20 × 0,05 (L×P×H, posée à plat)
- **tris** 150–300
- **silhouette** 2–3 feuilles rectangles, rotations libres ±8°, la du dessus légèrement cornée.
- **modelage** chaque feuille = plane subdivisé 3×3 ; plis = 2 edge loops + léger flood-fill
  Proportional Edit (faiblesse 2 mm) ; coin corné = pivot d'un vertex du coin soulevé de 4 mm.
  Empiler avec 2–4 mm de décalage vertical, jamais parfaitement aligné (la main du deposant).
- **texture** lignes de texte floues (bruit 1 px, ne JAMAIS écrire de texte lisible — risque éditorial),
  taches de café, une feuille à en-tête beige plus foncé.

### 2. `prop_maproll` — carte roulée (5 vitrines)
- **bbox** 0,26 × 0,08 × 0,10, couché le long de x
- **tris** 80–150
- **silhouette** cylindre fin + une pende de papier qui se déroule d'un quart de tour sur le plan.
- **modelage** cylindre 10 sides, caps insets (une bague de bord), léger taper aux deux bouts
  (Select loop extrémité, scale 0,92) ; pende = strip 8 segments × 2, courbé en arc de rayon 9 cm,
  largeur 0,10 m. Les deux sont un seul mesh (joint par une charnière de 2 tris cachée sous la pende).
- **texture** carte politique **abstraite** — hachures et traits de frontière génériques, jamais
  une vraie carte d'un territoire disputé : un prop ne prend pas parti.

### 3. `prop_radio` — radio d'époque (8 vitrines)
- **bbox** 0,22 × 0,10 × 0,15 (boîtier + arche d'anse)
- **tris** 200–400
- **silhouette** boîtier trapu légèrement biseauté + arche d'anse au-dessus — c'est TOUT ce qui se lit.
- **modelage** box 1 segment × 2, Bevel modifier 1 segment / 3 mm (apply) ; anse = arc de cercle 12 faces
  de section 6 mm, supprimé aux deux tiers sous le boîtier ; 2 cadrans = cylindres 8 faces
  en saillie de 4 mm dans la face avant. **La grille de haut-parleur est 100 % texture.**
- **texture** bakélite foncé usé sur les arêtes (AO+edge wear cuits), cadran laiton, échelle de
  fréquences en pixels flous.

### 4. `prop_lantern` — lampe à huile / lanterne (10 vitrines — l'archétype le plus fréquent)
- **bbox** 0,13 × 0,10 × 0,11, posée debout
- **tris** 150–300
- **silhouette** soucoupe large + panse renflée + bec court : la lampe méditerranéenne. Silhouette
  lue de dessus = un ovale avec une pointe — doit rester reconnaissable d'aplomb.
- **modelage** base = cône tronqué 12 faces ; panse = icosa subdiv 2 puis aplatir verticalement
  (scale y 0,45) ; bec = wedge 4 faces fusionné (Remesh NO — garder le mesh propre pour le bake) ;
  mèche = petit cylindre 6 faces brun noirci dans le bec. Anse éventuelle : anneau 8 faces,
  moitié inférieure supprimée.
- **texture** terre cuite chaude (#8a5a3c→#cfc2a8 cuit), noirci de suie au bec (AO peint).

### 5. `prop_letter` — lettre pliée + cachet (7 vitrines)
- **bbox** 0,20 × 0,12 × 0,025
- **tris** 60–120 (l'archétype le plus économe)
- **silhouette** rectangle plié en trois, un disque de cachet au pli. Très plate — lit surtout par
  son ombre cuite.
- **modelage** plane subdivisé 1×3, deux plis à ±6° d'ouverture (pas à 0 : le pli garde de la
  mémoire) ; cachet = cylindre 8 faces, ø 3,2 cm, 3 mm d'épaisseur, posé sur le tiers du dessus,
  légèrement excentré. Deux plis ne se rejoignent pas exactement — vu de dessus, le trapèze doit
  respirer.
- **texture** papier crème, pli plus foncé (cuit), cachet borne éteint #6e3030, écriture floue.

### 6. `prop_watch` — montre gousset posée (9 vitrines)
- **bbox** 0,07 × 0,06 × 0,03 (face vers le haut)
- **tris** 120–250
- **silhouette** disque + couronne et maillons de chaîne : à 2 m, un rond et une ligne courbe.
- **modelage** boîtier = cylindre 16 faces ø 6 cm, biseau de carrure (loop + bevel 1,5 mm) ;
  **verre = face du dessus légèrement bombée** (une bague de sommet relevée de 1 mm — le reflet
  du spot cuit dans la texture fait le reste) ; couronne = cylindre 6 faces + 4 crans en biseaux,
  à 12 h vers le haut de la table ; chaîne = **texture sur bande plane de 2 tris** courbée en S
  (une vraie chaîne à 2 m = zéro lecture, des tri gaspillés).
- **texture** cadran clair, aiguilles peintes figées n'importe où SAUT toute référence datable ;
  boîtier laiton patiné.

### 7. `prop_books` — pile de trois livres (3 vitrines)
- **bbox** 0,24 × 0,17 × 0,13 (3 volumes épais de 35–45 mm, empilés)
- **tris** 100–200
- **silhouette** trois rectangles tournés les uns sur les autres — la rotation fait le modelage,
  pas la géométrie.
- **modelage** chaque livre = box 1 segment + Bevel 2 mm (apply) ; coins du dos légèrement arrondis
  en edit mode (boucle du dos only) ; rotations d'empilement 4° / −7° / 3°, décalages de 1–2 cm.
  Le livre du dessous est le plus grand, du plus grand au plus petit vers le haut — sinon la pile
  « tombe » visuellement.
- **texture** couvertures toile délavées (vert bouteille, brun, bleu passé — teintes sourdes),
  tranche des pages crème jauni, dorure de dos **absente** (la dorure = code divergence).

## Pipeline & acceptation

```
Blender (7 meshs, M_props_atlas, bakes 1024²)
  → export glTF 2.0 (apply modifiers, +Y up default, sans lights/anim)
  → gltfpack -i props-musee.glb -o props-musee.glb -cc -tc   (Draco + KTX2)
  → budget : GLB ≤ 150 Ko, atlas ≤ 256 Ko
```

Checklist d'acceptation PAR prop (à faire tourner, script Blender fourni en fin de doc) :
- [ ] bbox ≤ 0,56 × 0,40 × 0,48 — vérifié programmatiquement (`o.dimensions`) ;
- [ ] pivot au bas-centre (la médiane XZ du bbox = origines locales, min Z = 0) ;
- [ ] nom de mesh = clé du JSON, 7 sur 7 présents, aucun mesh surnuméraire ;
- [ ] tris dans la plage de la page ;
- [ ] 1 matériau, 0 lumière, 0 animation, 0 hiérarchie d'os (7 meshs distincts, parents propres) ;
- [ ] test visuel : rendu 512px à 45° depuis 1,8 m — la silhouette se nomme à l'œil.

Script de vérification dans Blender (Texte > Run) :

```python
import bpy
MAX = (0.56, 0.40, 0.48)
WANT = {"prop_docstack","prop_maproll","prop_radio","prop_lantern",
        "prop_letter","prop_watch","prop_books"}
got = {o.name: o for o in bpy.context.scene.objects if o.type == "MESH"}
for n in sorted(WANT - set(got)): print("MISSING:", n)
for n in sorted(set(got) - WANT): print("EXTRA:", n)
for n in sorted(WANT & set(got)):
    o = got[n]; d = o.dimensions
    bad = [f"dim {d[i]:.2f}>{MAX[i]}" for i in range(3) if d[i] > MAX[i] + 1e-4]
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if bad: print(f"{n}: {'; '.join(bad)} (tris={tris})")
    else: print(f"{n}: OK ({d.x:.2f}×{d.y:.2f}×{d.z:.2f}, {tris} tris)")
```

## Intégration (rappel, hors périmètre de modélisation)

La page instancie par nom de mesh depuis `vitrine-props.json`, pose y = 0,98, applique `rotYdeg`,
et **n'ajoute pas les props aux `hitables`** (le socle et le verre restent les seules cibles — les
42 checks de `verif_musee.mjs` sur TARS doivent rester verts).
