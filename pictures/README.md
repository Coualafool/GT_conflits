# Images du workspace GT_conflits

25 images prêtes à intégrer dans les chapitres. Deux familles, **toutes utilisables
libèrement dans un cadre pédagogique**, avec pour chacune la source et la licence.

## 1. Cartes générées (12) — domaine public

Générées par `scripts/gen_cartes.py` à partir de **Natural Earth** (domaine public,
US government work). Reproductibles à l'identique :

```bash
python3 scripts/gen_cartes.py            # tout régénérer
python3 scripts/gen_cartes.py --only brics
```

Chaque carte porte un pied de page de provenance (fond, projection, date de génération).

| Fichier | Contenu | Usage prévu |
|---|---|---|
| `carte-generee-monde-politique.png` | Monde politique, noms en français, oct. 2026 | ch1, ch2 — remplacer la carte de 2009 |
| `carte-generee-monde-muette.png` | Monde muet (frontières + lacs) | exercices |
| `carte-generee-brics.png` | BRICS+ 2025 (adhésion confirmée ; EAU en marqueur) | ch1 |
| `carte-generee-otan.png` | OTAN 2025 — 32 membres (Finlande, Suède) | ch1, ch10 |
| `carte-generee-monde-physique.png` | Physique : lacs, fleuves | ch3 |
| `carte-generee-monde-densite.png` | Densité de population (log) | ch1, ch3 |
| `carte-generee-monde-pib.png` | PIB/habitant nominal (log) | ch1, ch7 |
| `carte-generee-moyen-orient.png` | Moyen-Orient, Palestine en doré | ch2, ch4, ch10 |
| `carte-generee-isra-palestine.png` | Israël-Palestine régional, villes | ch2, ch9 |
| `carte-generee-bassin-jourdain.png` | Bassin du Jourdain (eau) | ch3 |
| `carte-generee-golfe-ormuz.png` | Golfe persique, détroit d'Ormuz | ch1 |
| `carte-generee-israel-belgique.png` | Échelle Israël/Belgique (LAEA, aires exactes) | ch2, séquence « comprendre les échelles » |

## 2. Cartes téléchargées (13) — Wikimedia Commons

Détails complets (auteur, licence, URL d'origine) dans `manifest_downloads.json`.
Merci de conserver la ligne d'attribution correspondante sous l'image dans la page.

| Fichier | Contenu | Licence |
|---|---|---|
| `carte-telechargee-reconnaissance-palestine-decennies.png` | Reconnaissance de la Palestine par décennie (à jour sept. 2025) | CC0 |
| `carte-telechargee-plan-partition-1947-fr.png` | Plan de partage ONU 1947 (en français) | Domaine public |
| `carte-telechargee-partition-1947-vs-armistice-1949.png` | Comparaison plan 1947 / lignes d'armistice 1949 | Domaine public |
| `carte-telechargee-territoires-1967-fr.png` | Territoires occupés depuis 1967 (en français) | CC BY-SA 2.5 |
| `carte-telechargee-rive-ouest-zones-abc.png` | Zones A/B/C de la Rive occidentale (2025) | CC BY-SA 3.0 |
| `carte-telechargee-ocha-rive-ouest-acces-2025.png` | Restrictions d'accès Rive occidentale (juil. 2025, OCHA) | Domaine public (OCHA) |
| `carte-telechargee-ocha-gaza-2023.png` | Bande de Gaza, gouvernorats (OCHA, sept. 2023) | Domaine public (OCHA) |
| `carte-telechargee-territoires-palestiniens-ocha.png` | Localisation des territoires palestiniens (OCHA) | CC BY 3.0 |
| `carte-telechargee-gaza-localisation.png` | Gaza dans la région | CC BY-SA 3.0 |
| `carte-telechargee-vieille-ville-jerusalem.png` | Vieille ville de Jérusalem et environs | CC BY-SA 3.0 |
| `carte-telechargee-aqueduc-national-israel.png` | Aqueduc national d'Israël | CC BY-SA 4.0 |
| `carte-telechargee-accords-abraham.png` | Accords d'Abraham (normalisations 2020) | CC BY-SA 4.0 |
| `carte-telechargee-moyen-orient-muet.png` | Moyen-Orient muet | Domaine public |

## Règles d'usage

- **CC BY / CC BY-SA** : attribution visible obligatoire (auteur + licence Commons).
  Le fichier `manifest_downloads.json` contient les champs à reporter.
- **CC0 / domaine public** : pas d'obligation, attribution recommandée.
- Les cartes OCHA (restrictions d'accès, zones) sont **datées** — toujours afficher
  la date à côté de l'image, ces réalités évoluent.
- Pour les cartes générées : régénérer plutôt qu'éditer l'image ; le script est la
  source de vérité.
