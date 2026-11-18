#!/usr/bin/env python3
# Génère frise/poc-media.js : documents (cartes/photos) du musée J.
# - Les events « baked » reçoivent un data-URI WebP (<= 900 px, q64) pour les murs 3D
#   (Chrome refuse les images file:// dans WebGL ; les data-URI sont propres).
# - Toutes les entries portent file/alt/credit pour le panneau DOM (<img> relatif, gratuit).
# Crédits lus dans pictures/manifest_downloads.json (auteur + licence Wikimedia).
import base64, io, json, os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
PIC = os.path.join(ROOT, "pictures")
OUT = os.path.join(ROOT, "frise", "poc-media.js")

# event index -> fichier (murs 3D) — mappings historiques exacts, aucune extrapolation
BAKE = {
    3:  "carte-telechargee-sykes-picot-overlay.webp",
    5:  "carte-telechargee-palestine-mandataire-1946.webp",
    12: "carte-telechargee-plan-partition-1947-fr.png",
    16: "carte-telechargee-controle-militaire-1949-1967.webp",
    22: "carte-telechargee-aqueduc-national-israel.png",
    26: "carte-telechargee-territoires-1967-fr.png",
    34: "carte-telechargee-vieille-ville-jerusalem.png",
    47: "carte-telechargee-oslo2-carte-1-1995.jpg",
    55: "carte-telechargee-zones-oslo-barriere-2005.png",
    60: "carte-telechargee-gaza-localisation.png",
    77: "carte-telechargee-emprises-colonies-2012.webp",
    78: "carte-telechargee-accords-abraham.png",
    82: "carte-telechargee-ocha-gaza-2023.webp",
    86: "carte-telechargee-reconnaissance-palestine-decennies.png",
}
# panneau seul (document d'appoint, zéro poids dans la page)
PANEL = {
    50: "photo-lemkin-portrait.webp",
    58: "photo-palais-paix-la-haye.webp",
    64: "carte-telechargee-gaza-localisation.png",
    69: "carte-telechargee-reconnaissance-palestine-decennies.png",
    74: "carte-telechargee-vieille-ville-jerusalem.png",
    91: "carte-telechargee-rive-ouest-zones-abc.png",
}
ALTS = {
    3: "Carte : le partage Sykes-Picot (1916) de la Syrie et de l'Iraq ottomans en zones d'influence française et britannique.",
    5: "Carte : la Palestine mandataire (1946), frontières du mandat confié à la Grande-Bretagne.",
    12: "Carte : le plan de partage de la Palestine (résolution 181, 1947) — État arabe, État juif, Jérusalem internationalisée.",
    16: "Carte : contrôle militaire et territoires, 1949-1967, entre les lignes d'armistice.",
    22: "Carte : l'aqueduc national israélien (1953-1964), du lac de Tibériade vers le sud.",
    26: "Carte : les territoires (1967) — Israël, Cisjordanie et bande de Gaza après la guerre des Six Jours.",
    34: "Carte : la vieille ville de Jérusalem, muraille et quartiers.",
    47: "Carte : Oslo II (1995) — découpage de la Cisjordanie en zones A, B et C.",
    55: "Carte : les zones d'Oslo et la barrière de séparation en 2005.",
    60: "Carte : la bande de Gaza dans son voisinage — localisation.",
    77: "Carte : les emprises des colonies de Cisjordanie (2012).",
    78: "Carte : les accords d'Abraham (2020) — reconnaissance entre Israël et plusieurs États arabes.",
    82: "Carte OCHA : la bande de Gaza (2023) — repères humanitaires avant la guerre.",
    86: "Carte : la reconnaissance de l'État de Palestine, décennie par décennie.",
    50: "Portrait : Raphael Lemkin, juriste qui a forgé le mot « génocide ».",
    58: "Le Palais de la Paix à La Haye, siège de la Cour internationale de Justice.",
    64: "Carte : localisation de la bande de Gaza.",
    69: "Carte : la reconnaissance de l'État de Palestine, décennie par décennie.",
    74: "Carte : la vieille ville de Jérusalem.",
    91: "Carte : Cisjordanie, zones A/B/C sous les accords d'Oslo.",
}

def credit_for(fname, manifest):
    for m in manifest:
        if m.get("file") == fname:
            lic = m.get("license") or "licence à vérifier"
            au = (m.get("author") or "auteur collectif").split("(")[0].strip()[:56]
            return "%s — %s (Wikimedia Commons)" % (au, lic)
    if fname.startswith("carte-generee"):
        return "Carte générée par le kit GT_conflits (CC BY-NC-SA)"
    return "Document du kit — voir pictures/README.md"

def data_uri(fname):
    p = os.path.join(PIC, fname)
    im = Image.open(p)
    if im.mode in ("RGBA", "P", "LA"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        im2 = im.convert("RGBA"); bg.paste(im2, mask=im2.split()[-1]); im = bg
    else:
        im = im.convert("RGB")
    im.thumbnail((900, 900), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "WEBP", quality=64, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

def main():
    manifest = json.load(open(os.path.join(PIC, "manifest_downloads.json")))
    table, total = {}, 0
    for i, f in BAKE.items():
        uri = data_uri(f)
        total += len(uri)
        table[i] = {"file": f, "alt": ALTS[i], "credit": credit_for(f, manifest), "b64": uri}
    for i, f in PANEL.items():
        table.setdefault(i, {"file": f, "alt": ALTS[i], "credit": credit_for(f, manifest)})
    lines = ["/* Généré par scripts/gen_poc_media.py — documents du musée J (cartes & photos).",
             "   Les b64 alimentent les murs 3D (data-URI propres pour WebGL sous file://) ;",
             "   file/alt/credit alimentent le panneau DOM via ../pictures/. */",
             "var MUSEE_MEDIA = {"]
    for i in sorted(table):
        t = table[i]
        lines.append('%d:{file:%s,alt:%s,credit:%s%s},' % (i, json.dumps(t["file"], ensure_ascii=False),
            json.dumps(t["alt"], ensure_ascii=False), json.dumps(t["credit"], ensure_ascii=False),
            (",b64:" + json.dumps(t["b64"])) if "b64" in t else ""))
    lines.append("};")
    open(OUT, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("baked:", len(BAKE), "panel-only:", len(PANEL),
          "| poids b64: %.0f Ko" % (total / 1024),
          "| poc-media.js: %.0f Ko" % (os.path.getsize(OUT) / 1024))

if __name__ == "__main__":
    main()
