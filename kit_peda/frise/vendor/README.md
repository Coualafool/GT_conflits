# three.js vendorisé — issu du spike S-A/S-B du 2026-11-18

S-B (UMD r160 officiel, 670 Ko) et S-A (bundle ci-dessous, 539 Ko) marchaient tous deux
en `file://` sur TARS (Edge + Chromium, WebGL 2.0, CanvasTexture + raycast vérifiés —
commit ce783f3/sonde). S-A gagne : révision courante vs UMD dépréciée (supprimée upstream à r161),
131 Ko de moins, reproductible. Les imports ESM sont CORS-morts en `file://` — jamais une option.

Reconstruire (three.js ne se met à jour qu'ainsi) :

    npm i three@0.187.0 esbuild            # dans un répertoire scratch avec node_modules
    # entry = scripts/vendor_three_entry.js (imports NOMMÉS → tree-shaking ; les recopier ici)
    ./node_modules/.bin/esbuild entry.js --bundle --format=iife --minify --target=es2020 --outfile=three.bundle.js

Fichier livré : `three.bundle.js` — IIFE classique, expose `window.THREE` (REVISION 187).
Ne pas éditer à la main. Les pages du site ne chargent QUE ce fichier (jamais un CDN).
