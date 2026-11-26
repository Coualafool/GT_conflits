# « Les Allées » — bâtiment tressé : 4 allées-pistes + places de convergence (brainstorm 2026-11-25 — construit : `frise/perspective-K-allees.html`)

Plan du bâtiment (vue de dessus, échelle réelle, géométrie issue de `frise/perspective-K-data.js` via `scripts/gen_plan_k.py`) : [`plan-quatre-allees.html`](plan-quatre-allees.html).

Idée de l'utilisateur : une allée par brin de la tresse I² (perspective-I2-pdf.html),
allées séparées sauf aux grands événements communs ; à ces moments, toutes les allées
convergent vers une salle unique puis divergent vers leurs chemins d'origine.

Verdict de brainstorm : l'architecture EST l'argument — quatre récits qui occupent le
même sol et rarement l'histoire de l'autre. La rareté des rencontres est la thèse ;
le visiteur la marche. Ne pas retoucher J : dériver une nouvelle page (pattern I²-depuis-I).

## Ce que le corpus dit (vérifié sur perspective-I2-data.js, 2026-11-25)
- 4 brins : occ 16 · pal 22 · isr 26 · ter 15 ; EV = 79 faits ; ERAS = 7 bandes neutres.
- Chaque fait appartient à EXACTEMENT UN brin (EV[i][1]) ; aucune couche « fait partagé ».
- Balayage programme : une seule année civile avec 2 brins présents (2004, isr+ter) ;
  zéro fenêtre ±1 an à ≥3 brins. ⇒ « événements communs majeurs » n'existe PAS dans les
  données : nouvelle couche éditoriale explicite (table SHARED), jamais heuristique
  (principe corpus : ids choisis à la main + justification par entrée).
- divergent(i) = marque [?]/[!] du document → déjà réutilisable pour le code doré.

## Décisions verrouillées (questions posées, réponses explicites)
1. **Modèle de visite — B : traversée chronologique.** Une visite, le temps avance
   toujours ; les allées sont les pistes, les places sont les points de changement de
   piste — « à quel récit confiez-vous la suite ? » est la mécanique de visite.
2. **Règle des places (piège évité) : les couloirs d'allée sont continus bout-en-bout
   (toujours praticables) ; chaque place est un raccourci et un choix, jamais un
   carrefour forcé.** Sinon une place sans fait dans un brin immobiliserait la visite.
   Par moment de convergence : 4 plaques (couleur brin) autour d'une table-vitrine,
   rail doré ; brin silencieux = **niche vide voilée d'un rideau** côté place
   (doctrine rideaux J relocalisée : le silence se lit là où tout le monde devrait parler).
3. **Places = 7 : 1917 · 1936-39 · 1947-49 · 1967 · 1987 · 1993 · 2023.** Rythme ~1/15 m ;
   au-delà de 8, la thèse « ils ne se rencontrent presque jamais » se noie.
4. **Table SHARED (nouveau contrat de données)** dans le module dérivé :
   `{year, label, evs:{occ:i, pal:j, isr:k, ter:l|null}, why}`. Gates : chaque id existe
   et appartient au brin déclaré ; ≥3 brins non-nuls par ligne ; lignes ordonnées ;
   place jamais à <0,6 m d'une cloison.
5. **Ordre outer→inner : ter · pal · isr · occ** (la main extérieure à l'extérieur,
   touchable par chaque place ; le territoire se lit au sol). La cloison pal/isr est
   plus épaisse de 15 cm que les autres — silencieux, gratuit, signifiant.
6. **Géométrie** : allées ~4 m de large (enfermement = l'effet), baies d'ère ~14 m × 7,
   cloisons partagées portant les affiches **sur les deux faces** (une face = une allée).
   Baies et places héritent des ERAS neutres — les récits ne déplacent jamais les murs.
7. **Terminologie/page** : perspective-K « Les Allées », module `perspective-K-data.js`
   (exporte EV/TRACKS/ERAS d'I² + SHARED curaté), harness propre réutilisant les formes
   J. J reste intact (trois récits, salles d'époque).

## Ce qui est réutilisé tel quel
Doctrine caméra J (stations + E, téléport/minimap, `?ev`/`#sN.S` — le deep-link sélectionne
aussi l'allée, reduced-motion, repli WebGL → variante-C-liste) ; panneau DOM = source a11y ;
code doré = divergence ; props vitrines (décoratif zéro-donnée, jamais hitables) ;
 extraction `__LAYOUT_*` + sim hors-ligne avant toute passe TARS.

## Gates nouvelles (à écrire avant le build)
- SHARED : ids valides, appartenance brin, ≥3 brins/ligne, ordre temporel.
- Praticabilité : graphe allées+places — tout nœud joignable depuis tout nœud en temps
  croissant (le sim prouve que B est marchable AVANT TARS).
- Chaque ouverture de place = bloc de collision permanent sur les DEUX faces de cloison
  (leçon du bug floaters door-blind).
- Exhaustivité par allée : affiches + rideaux == nTold(brin) ; baies == capacité à scale ≤ 1,0.
- Places : clearance 0,6 m, niche voilée ↔ evs[brin] === null (bidirectionnel).

## Coût réel / prochaine étape
Le vrai travail : la table SHARED éditoriale (7 lignes × ids EV justifiés — croiser
pEvs(k) et les dates ci-dessus, chaque justification citant le libellé du document),
le sim étendu (places + double-face), puis la page K dérivée. Attendre le go de build ;
spike inutile (aucune inconnue technique nouvelle — Three.js vendor est éprouvé).

## Hors périmètre v1 (comme J)
Mode docète ; animation des rideaux ; son ; sens de visite imposé ; multi-visiteurs.
