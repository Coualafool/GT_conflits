#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Générateur de l'atlas de textures des props de vitrine (7 props + slot feutre).

Atlas unique 2048x1024, 8 slots de 512x512 en 4x2 :
  k=0 docstack, k=1 maproll, k=2 radio, k=3 lanterne,
  k=4 lettre, k=5 montre, k=6 livres, k=7 feutre (fond de socle éventuel).
Convention PIL : slot k = rect x=(k%4)*512, y=(k//4)*512 (y=0 = HAUT de l'image = UV v=1).

Doctrine (cf. interne/BLENDER-PROPS-KIT.md) :
  - MeshBasicMaterial : l'éclairage est CUIT dans la texture (rampe verticale « spot »).
  - Jamais de texte lisible (risque éditorial) — uniquement des traits flous.
  - Carte politique ABSTRAITE — jamais un vrai territoire.
  - Aiguilles de montre figées à une heure non datable (angles indépendants).
  - Palette « warm archive », sourde et sombre ; JAMAIS l'or #d2a63f
    (code divergence réservé au rail) — asserted à la fin.
  - Deterministe : random.seed(11).

Usage : python3 scripts/gen_props_atlas.py --out <chemin.png>
"""

import argparse
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageOps

# ---------------------------------------------------------------- constantes

SLOT = 512
COLS = 4
ROWS = 2
ATLAS_W, ATLAS_H = COLS * SLOT, ROWS * SLOT
BLEED = 8                      # bord répété (le maillage n'échantillonne que 94 % centraux)
SEED = 11
GOLD = (210, 166, 63)          # #d2a63f — interdit à moins de 15 d'distance RGB
GOLD_MIN_DIST = 15

# Palette « warm archive » — versions assourdies/enfoncées de la feuille
# (l'atlas sera multiplié par l'ambiance sombre de la scène : ne pas éclaircir).
P_PAPIER      = (162, 149, 127)   # papier crème assombri (chambre sombre)
P_PAPIER_PALE = (178, 166, 142)   # feuille du dessus
P_PAPIER_BAND = (136, 122, 100)   # bande d'en-tête beige plus foncée
P_CAFEE       = (118, 86, 58)     # tache de café
P_CARTE       = (156, 144, 121)   # papier de la carte
P_ENCRE_CARTE = (88, 92, 90)      # encre des frontières (désaturée)
P_BAKELITE    = (48, 38, 30)      # bakélite
P_BAKEL_WEAR  = (84, 68, 52)      # usure arêtes (plus clair)
P_GRILLE      = (26, 21, 16)      # trous du haut-parleur
P_LAITON      = (140, 114, 64)    # laiton mat (loin de l'or)
P_LAITON_PALE = (158, 132, 82)    # reflets laiton
P_CUIVRE      = (122, 80, 54)     # terre cuite (vers #8a5a3c enfoncé)
P_CUIVRE_PALE = (148, 104, 72)
P_SUIE        = (24, 19, 15)      # noir de suie
P_CACHET      = (110, 48, 48)     # #6e3030 borne éteint
P_CADAN       = (188, 178, 156)   # fond de cadran crème assombri
P_AIGUILLE    = (38, 32, 26)
P_TOILE_V     = (54, 68, 54)      # vert bouteille sourd
P_TOILE_B     = (80, 60, 46)      # brun sourd
P_TOILE_BL    = (52, 60, 74)      # bleu passé sourd
P_PAGES       = (156, 142, 110)   # tranche de pages jauni
P_FEUTRE      = (74, 60, 46)      # feutre brun moyen
P_ENCRE_FLOUE = (92, 88, 80)      # traits d'écriture floue

ORDRE = ["docstack", "maproll", "radio", "lanterne",
         "lettre", "montre", "livres", "feutre"]

# ---------------------------------------------------------------- utilitaires


def clamp255(v):
    return max(0, min(255, int(round(v))))


def slot_rect(k):
    """Rectangle PIL du slot k (coin haut-gauche)."""
    return ((k % COLS) * SLOT, (k // COLS) * SLOT)


def noise_layer(size, sigma, base=128):
    """Bruit gaussien déterministe (petite résolution, étirée ensuite)."""
    w, h = size
    px = [clamp255(base + random.gauss(0, sigma)) for _ in range(w * h)]
    im = Image.new("L", size)
    im.putdata(px)
    return im


def apply_ramp(slot, top, bottom, strength=1.0):
    """Rampe lumineuse verticale multiplicative (le spot cuit).

    top > 1 éclaircit vers le haut du slot, bottom < 1 assombrit vers le bas.
    Appliquée par lignes (LUT point) — pas de numpy, PIL only.
    """
    w, h = slot.size
    for y in range(h):
        t = y / (h - 1)
        f = top + (bottom - top) * t
        f = 1.0 + (f - 1.0) * strength
        strip = slot.crop((0, y, w, y + 1)).point(
            lambda v, f=f: clamp255(v * f))
        slot.paste(strip, (0, y))
    return slot


def bleed_border(slot, b=BLEED):
    """Bordure bleed : réplication des pixels intérieurs vers les b bords.

    Évite toute couture nette aux limites de slot ; le maillage n'échantillonne
    que les 94 % intérieurs, mais on garantit « bord = prolongement de l'intérieur ».
    """
    w, h = slot.size
    slot.paste(slot.crop((b, 0, b + 1, h)).resize((b, h)), (0, 0))
    slot.paste(slot.crop((w - b - 1, 0, w - b, h)).resize((b, h)), (w - b, 0))
    slot.paste(slot.crop((0, b, w, b + 1)).resize((w, b)), (0, 0))
    slot.paste(slot.crop((0, h - b - 1, w, h - b)).resize((w, b)), (0, h - b))
    return slot


def add_grain(slot, sigma=5):
    """Grain de matière : ajoute un bruit gaussien (centré sur 128) à chaque canal.

    Même bruit sur R/V/B → la teinte est gardée, seule la valeur tremble.
    """
    n = noise_layer((SLOT // 4, SLOT // 4), sigma).resize(slot.size, Image.Resampling.BICUBIC)
    out = slot.copy()
    nz = Image.merge("RGB", (n, n, n))
    db, dn = out.tobytes(), nz.tobytes()
    out = Image.frombytes("RGB", out.size,
                          bytes(clamp255(a + b - 128) for a, b in zip(db, dn)))
    return out


# ------------------------------------------------- fabrique d'un slot

def new_slot(base_rgb):
    """Fond + RAMPE DE SPOT EN PREMIER (plus clair ~+8 % en haut du slot,
    plus sombre vers le bas) — l'éclairage est cuit avant tout contenu."""
    s = Image.new("RGB", (SLOT, SLOT), base_rgb)
    apply_ramp(s, top=1.08, bottom=0.86)  # passe 1 : le bake de base
    return s


def finish_slot(s):
    """Seconde passe de rampe (propage le spot sur le contenu). Le bleed est
    applique EN DERNIER par build() (apres le grain) pour garantir
    « bord = prolongement de l'interieur »."""
    apply_ramp(s, top=1.04, bottom=0.93, strength=1.0)  # total haut ~1.12, bas ~0.80
    return s


# ------------------------------------------------- slot 0 : pile de documents

def paint_docstack(k):
    s = new_slot(P_PAPIER)
    # Ombre cuite sous la pile
    sh = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rectangle((40, 60, 470, 460), fill=(20, 16, 12, 60))
    sh = sh.filter(ImageFilter.GaussianBlur(8))
    s.paste(Image.alpha_composite(s.convert("RGBA"), sh).convert("RGB"), (0, 0))

    # 3 feuilles tournées (±8°), empilées jamais alignées
    angles = [random.uniform(-8, 8) for _ in range(3)]
    offs = [(0, 0), (18, -10), (-14, 12)]
    for i, (ang, (dx, dy)) in enumerate(zip(angles, offs)):
        fillc = P_PAPIER_PALE if i == 2 else P_PAPIER
        layer = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x0, y0, x1, y1 = 70 + dx, 80 + dy, 440 + dx, 430 + dy
        # ombre cuite de la feuille
        d.rectangle((x0 + 5, y0 + 7, x1 + 5, y1 + 7), fill=(18, 14, 10, 55))
        d.rectangle((x0, y0, x1, y1), fill=fillc + (255,),
                    outline=(104, 94, 78, 255), width=1)
        # bande d'en-tête beige plus foncé sur une seule feuille
        if i == 1:
            d.rectangle((x0 + 6, y0 + 8, x1 - 6, y0 + 52), fill=P_PAPIER_BAND + (255,))
        # lignes de texte FLOUES (traits 1-2 px, jamais de mots lisibles)
        txt = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
        td = ImageDraw.Draw(txt)
        ly = y0 + (52 + 18 if i == 1 else 18)
        while ly < y1 - 14:
            lx = x0 + 12
            while lx < x1 - 24:
                run = random.randint(40, 160)
                alpha = random.randint(26, 62)
                td.rectangle((lx, ly, min(lx + run, x1 - 12), ly + random.choice([1, 2])),
                             fill=P_ENCRE_FLOUE + (alpha,))
                lx += run + random.randint(14, 40)
            ly += random.randint(10, 15)
        txt = txt.filter(ImageFilter.GaussianBlur(0.8))
        layer = Image.alpha_composite(layer, txt)
        layer = layer.rotate(ang, resample=Image.Resampling.BICUBIC, expand=False)
        s.paste(Image.alpha_composite(s.convert("RGBA"), layer).convert("RGB"), (0, 0))

    # Tache de café (anneaux fins désaturés)
    ring = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy, r0 = 372, 388, 58
    rd.ellipse((cx - r0, cy - r0, cx + r0, cy + r0), outline=P_CAFEE + (66,), width=3)
    rd.arc((cx - r0 + 6, cy - r0 + 4, cx + r0 - 4, cy + r0 - 8), 200, 340,
           fill=P_CAFEE + (44,), width=2)
    rd.ellipse((cx - r0 + 14, cy - r0 + 16, cx + r0 - 12, cy + r0 - 14),
               outline=P_CAFEE + (30,), width=1)
    ring = ring.filter(ImageFilter.GaussianBlur(0.7))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ring).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 4)


# ------------------------------------------- slot 1 : carte roulée abstraite

def paint_maproll(k):
    s = new_slot(P_CARTE)
    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # Frontières politiques ABSTRAITES : polygones fermés aléatoires, jamais
    # un territoire réel (règle : un prop ne prend pas parti).
    for _ in range(5):
        pts = []
        cx, cy = random.randint(120, 392), random.randint(120, 392)
        rbase = random.randint(60, 140)
        n = random.randint(7, 12)
        for j in range(n):
            a = 2 * math.pi * j / n + random.uniform(-0.2, 0.2)
            r = rbase * random.uniform(0.6, 1.25)
            pts.append((clamp255(cx + r * math.cos(a)), clamp255(cy + r * math.sin(a))))
        # léger remplissage désaturé (région « pays »)
        fillc = random.choice([(120, 118, 96), (104, 112, 108), (126, 110, 96)])
        d.polygon(pts, fill=fillc + (24,))
        d.line(pts + [pts[0]], fill=P_ENCRE_CARTE + (120,), width=2)
    # Hachures internes courtes (relief/zones, jamais du texte)
    for _ in range(240):
        x = random.randint(30, 470)
        y = random.randint(30, 470)
        L = random.randint(6, 18)
        a = random.uniform(-0.5, 0.5)
        d.line((x, y, x + L * math.cos(a), y + L * math.sin(a)),
               fill=P_ENCRE_CARTE + (random.randint(20, 55),), width=1)
    # « Courbes de niveau » gribouillées : marches aléatoires lissées
    for _ in range(4):
        x, y = random.uniform(60, 440), random.uniform(60, 440)
        pts, ha = [], random.uniform(0, 2 * math.pi)
        for j in range(40):
            ha += random.uniform(-0.6, 0.6)
            x = max(30, min(482, x + 9 * math.cos(ha)))
            y = max(30, min(482, y + 9 * math.sin(ha)))
            pts.append((x, y))
        d.line(pts, fill=P_ENCRE_CARTE + (70,), width=1)
    ov = ov.filter(ImageFilter.GaussianBlur(0.9))  # encre bue par le papier
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))
    # pli sombre vertical (la pende déroulée)
    fold = Image.new("L", (SLOT, SLOT), 0)
    fd = ImageDraw.Draw(fold)
    fd.rectangle((330, 0, 336, SLOT), fill=48)
    fd.rectangle((336, 0, 342, SLOT), fill=16)
    fold = fold.filter(ImageFilter.GaussianBlur(2))
    dark = Image.new("RGB", (SLOT, SLOT), (100, 92, 74))
    s.paste(Image.composite(dark, s, fold.point(lambda v: v // 2)), (0, 0))
    return add_grain(finish_slot(s), 5)


# ----------------------------------------------------------- slot 2 : radio

def paint_radio(k):
    s = new_slot(P_BAKELITE)
    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # Boîtier implicite : arêtes usées = pixels plus clairs le long des bords
    d.rectangle((56, 96, 456, 432), outline=P_BAKEL_WEAR + (110,), width=3)
    d.rectangle((68, 108, 444, 420), outline=P_BAKEL_WEAR + (46,), width=1)
    # Usure aléatoire le long des arêtes (points plus clairs)
    for _ in range(90):
        side = random.randint(0, 3)
        if side == 0:
            x, y = random.randint(56, 456), 96
        elif side == 1:
            x, y = random.randint(56, 456), 432
        elif side == 2:
            x, y = 56, random.randint(96, 432)
        else:
            x, y = 456, random.randint(96, 432)
        a = random.randint(40, 110)
        d.point((x, y), fill=P_BAKEL_WEAR + (a,))
    # Zone cadran : disque laiton mat, à droite
    cxx, cyy, rr = 356, 210, 86
    d.ellipse((cxx - rr, cyy - rr, cxx + rr, cyy + rr),
              fill=P_LAITON + (255,), outline=(90, 72, 42, 255), width=3)
    d.ellipse((cxx - rr + 8, cyy - rr + 8, cxx + rr - 8, cyy + rr - 8),
              outline=(96, 78, 46, 140), width=1)
    # Échelle de fréquences : repères flous autour de l'arc (jamais de chiffres)
    for j in range(23):
        a = math.radians(190 + 160 * j / 22)
        r1 = rr - 16
        r2 = r1 - (14 if j % 5 == 0 else 8)
        d.line((cxx + r1 * math.cos(a), cyy + r1 * math.sin(a),
                cxx + r2 * math.cos(a), cyy + r2 * math.sin(a)),
               fill=(60, 48, 28, 200), width=2)
    # Grille de haut-parleur : damier régulier de points sombres (100 % texture)
    gx0, gy0, gx1, gy1, step = 96, 150, 260, 400, 17
    row = 0
    gy = gy0
    while gy <= gy1:
        gx = gx0 + (step // 2 if row % 2 else 0)
        while gx <= gx1:
            d.ellipse((gx - 3, gy - 3, gx + 3, gy + 3), fill=P_GRILLE + (235,))
            gx += step
        gy += step
        row += 1
    ov = ov.filter(ImageFilter.GaussianBlur(0.6))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))
    # Reflet cuite du spot sur le dessus du boîtier
    gl = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    ImageDraw.Draw(gl).rectangle((60, 100, 452, 170), fill=(220, 200, 170, 20))
    gl = gl.filter(ImageFilter.GaussianBlur(14))
    s.paste(Image.alpha_composite(s.convert("RGBA"), gl).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 4)


# --------------------------------------------------------- slot 3 : lanterne

def radial_blob(size, center, radius, falloff=2.0):
    """Masque L radial doux (petite résolution → lissé)."""
    w, h = size
    px = []
    cx, cy = center
    for y in range(h):
        for x in range(w):
            dd = math.hypot(x - cx, y - cy) / radius
            px.append(clamp255(255 * max(0.0, 1.0 - dd) ** falloff))
    im = Image.new("L", size)
    im.putdata(px)
    return im


def paint_lantern(k):
    # Dégradé chaud radial : centre plus clair (panse), bords plus froids/sombres
    s = new_slot(P_CUIVRE)
    small = 64
    mask = radial_blob((small, small), (small // 2, small // 2 - 4), small * 0.62, 1.4) \
        .resize((SLOT, SLOT), Image.Resampling.BICUBIC)
    pale = Image.new("RGB", (SLOT, SLOT), P_CUIVRE_PALE)
    s = Image.composite(pale, s, mask.point(lambda v: v // 3))

    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # Traces de tour à potier : anneaux concentriques subtils
    cx, cy = 236, 262
    for r in range(24, 220, 12):
        c = (210, 180, 150, 16) if (r // 12) % 2 else (40, 26, 16, 20)
        d.ellipse((cx - r, cy - int(r * 0.9), cx + r, cy + int(r * 0.9)),
                  outline=c, width=2)
    ov = ov.filter(ImageFilter.GaussianBlur(1.2))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))

    # Suie noire autour du bec (zone implicite en haut à droite)
    soot = radial_blob((96, 96), (66, 34), 40, 1.6).resize((SLOT, SLOT), Image.Resampling.BICUBIC)
    black = Image.new("RGB", (SLOT, SLOT), P_SUIE)
    s = Image.composite(black, s, soot.point(lambda v: int(v * 0.55)))
    # Liseré de suie sur une ligne de bec
    ov2 = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    ImageDraw.Draw(ov2).line((330, 150, 470, 96), fill=P_SUIE + (150,), width=8)
    ov2 = ov2.filter(ImageFilter.GaussianBlur(5))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov2).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 5)


# ------------------------------------------------------------ slot 4 : lettre

def paint_letter(k):
    s = new_slot(P_PAPIER)
    # Trois panneaux du plié-en-trois : variations de teinte cuites
    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    d.rectangle((0, 0, SLOT // 3, SLOT), fill=(30, 24, 16, 22))     # pan gauche ombré
    d.rectangle((2 * SLOT // 3, 0, SLOT, SLOT), fill=(230, 215, 190, 14))  # pan droit éclairé
    # Plis plus foncés à 1/3 et 2/3 de la largeur (+ arête claire adjacente)
    for fx in (SLOT // 3, 2 * SLOT // 3):
        d.rectangle((fx - 2, 0, fx + 2, SLOT), fill=(60, 48, 32, 120))
        d.rectangle((fx + 2, 0, fx + 4, SLOT), fill=(235, 222, 200, 40))
    ov = ov.filter(ImageFilter.GaussianBlur(1.5))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))

    # Écriture floue : traits ondulés (aucun glyphe, aucune fonte)
    wr = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wr)
    for band in range(5):
        y = 150 + band * 62 + random.randint(-8, 8)
        x = 70 + (30 if band % 2 else 0)
        pts = []
        while x < SLOT - 90 - (20 if band % 2 else 0):
            x += random.randint(26, 60)
            pts.append((x, y + random.uniform(-4, 4)))
        wd.line(pts, fill=P_ENCRE_FLOUE + (70,), width=2)
    wr = wr.filter(ImageFilter.GaussianBlur(1.1))
    s.paste(Image.alpha_composite(s.convert("RGBA"), wr).convert("RGB"), (0, 0))

    # Cachet borne éteint #6e3030, disque excentré à bord d'étoile irrégulier
    seal = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    cx, cy, R = int(SLOT * 0.62), int(SLOT * 0.36), 58
    pts = []
    n = 15
    for j in range(n * 2):
        a = math.pi * j / n
        r = R * (1.0 if j % 2 == 0 else random.uniform(0.82, 0.92))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    sd.polygon(pts, fill=P_CACHET + (255,))
    sd.polygon(pts, outline=(78, 32, 32, 255))
    # reflet + creux central du cachet (cuit)
    sd.ellipse((cx - 20, cy - 22, cx + 16, cy + 12), fill=(140, 66, 62, 60))
    seal = seal.filter(ImageFilter.GaussianBlur(0.8))
    s.paste(Image.alpha_composite(s.convert("RGBA"), seal).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 4)


# ------------------------------------------------------------ slot 5 : montre

def paint_watch(k):
    s = new_slot((84, 70, 54))  # fond sombre = autour du boîtier posé
    cx, cy = SLOT // 2, SLOT // 2 + 10
    Rout, Rin = 196, 158  # boîtier / cadran
    # Boîtier laiton patiné : anneau en dégradé radial (petite résolution, lissé)
    small = 128
    px = []
    for y in range(small):
        for x in range(small):
            dd = math.hypot(x - small / 2, y - small / 2) / (small / 2)
            px.append(clamp255(dd * 255))
    g = Image.new("L", (small, small))
    g.putdata(px)
    g = g.resize((SLOT, SLOT), Image.Resampling.BICUBIC)
    # masque anneau de carrure
    ring = Image.new("L", (SLOT, SLOT), 0)
    rd = ImageDraw.Draw(ring)
    rd.ellipse((cx - Rout, cy - Rout, cx + Rout, cy + Rout), fill=255)
    rd.ellipse((cx - Rin, cy - Rin, cx + Rin, cy + Rin), fill=0)
    brass = Image.new("RGB", (SLOT, SLOT), P_LAITON)
    pale = Image.new("RGB", (SLOT, SLOT), P_LAITON_PALE)
    # Le dégradé radial est centré sur l'image ; le boîtier l'est aussi (à ~10 px)
    ringgrad = Image.composite(pale, brass, g)
    s = Image.composite(ringgrad, s, ring)
    # Ombre cuite du boîtier au sol
    sh = Image.new("L", (SLOT, SLOT), 0)
    ImageDraw.Draw(sh).ellipse((cx - Rout - 6, cy - Rout + 10, cx + Rout + 10, cy + Rout + 18),
                               fill=70)
    sh = sh.filter(ImageFilter.GaussianBlur(9))
    shadow = Image.new("RGB", (SLOT, SLOT), (30, 24, 18))
    s = Image.composite(shadow, s, sh)

    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    # Fond de cadran crème assombri
    d.ellipse((cx - Rin, cy - Rin, cx + Rin, cy + Rin), fill=P_CADAN + (255,))
    d.ellipse((cx - Rin, cy - Rin, cx + Rin, cy + Rin), outline=(96, 84, 60, 255), width=2)
    # Ticks de minute : 60 petits traits
    for j in range(60):
        a = 2 * math.pi * j / 60 - math.pi / 2
        r1 = Rin - 10
        r2 = r1 - (12 if j % 5 == 0 else 6)
        wdt = 3 if j % 5 == 0 else 1
        d.line((cx + r1 * math.cos(a), cy + r1 * math.sin(a),
                cx + r2 * math.cos(a), cy + r2 * math.sin(a)),
               fill=(58, 50, 40, 220), width=wdt)
    # Chiffres ABSTRAITS en traits courts (aucun glyphe de fonte)
    for j in range(12):
        a = 2 * math.pi * j / 12 - math.pi / 2
        rr = Rin - 34
        x0 = cx + rr * math.cos(a)
        y0 = cy + rr * math.sin(a)
        perp = a + math.pi / 2
        ln = 7 if j % 3 else 11
        d.line((x0 - ln * math.cos(perp), y0 - ln * math.sin(perp),
                x0 + ln * math.cos(perp), y0 + ln * math.sin(perp)),
               fill=(52, 44, 36, 200), width=3)
    ov = ov.filter(ImageFilter.GaussianBlur(0.6))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))

    # Aiguilles : angles INDÉPENDANTS (tirets aléatoires) → l'heure affichée est
    # incohérente entre aiguilles = jamais datable (règle de la feuille).
    a_min = random.uniform(0, 2 * math.pi)
    a_h = random.uniform(0, 2 * math.pi)
    while abs(a_min - a_h) < 0.5:  # éviter la superposition illisible
        a_h = random.uniform(0, 2 * math.pi)
    print(f"  [montre] angles aiguilles (non datables) : minute={math.degrees(a_min):.1f}°, "
          f"heure={math.degrees(a_h):.1f}°")
    hands = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hands)
    for ang, ln, wd in ((a_min, 122, 3), (a_h, 78, 5)):
        hd.line((cx, cy, cx + ln * math.cos(ang), cy + ln * math.sin(ang)),
                fill=P_AIGUILLE + (255,), width=wd)
    hd.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), fill=P_AIGUILLE + (255,))
    hands = hands.filter(ImageFilter.GaussianBlur(0.5))
    s.paste(Image.alpha_composite(s.convert("RGBA"), hands).convert("RGB"), (0, 0))

    # Couronne à 12 h + amorce de chaîne en S (texture pure)
    crown = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    cd = ImageDraw.Draw(crown)
    cty = cy - Rout - 16
    cd.rectangle((cx - 12, cty - 14, cx + 12, cty + 6), fill=P_LAITON + (255,),
                 outline=(80, 64, 36, 255))
    for i in range(-1, 2):  # crans
        cd.line((cx + i * 8, cty - 14, cx + i * 8, cty + 6), fill=(80, 64, 36, 220), width=2)
    chx, chy = cx + 14, cty - 12
    pts = []
    for j in range(14):
        chx += 15
        chy -= 9 * math.sin(j * 0.7)
        pts.append((chx, chy))
    cd.line(pts, fill=(110, 92, 56, 200), width=5)
    crown = crown.filter(ImageFilter.GaussianBlur(0.6))
    s.paste(Image.alpha_composite(s.convert("RGBA"), crown).convert("RGB"), (0, 0))
    # Reflet cuit du spot sur le verre (tache haute)
    gl = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    ImageDraw.Draw(gl).ellipse((cx - 70, cy - 120, cx + 60, cy - 20),
                               fill=(230, 220, 195, 22))
    gl = gl.filter(ImageFilter.GaussianBlur(16))
    s.paste(Image.alpha_composite(s.convert("RGBA"), gl).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 3)


# ------------------------------------------------------------- slot 6 : livres

def paint_books(k):
    # Trois bandes horizontales = les 3 toiles ; lobe bas = livre du dessous
    # (le plus grand). Sous chaque couverture : tranche de pages jaunies.
    bands = [  # (y0, y1, couleur toile) du HAUT vers le BAS
        (0, 158, P_TOILE_BL),
        (186, 330, P_TOILE_B),
        (358, SLOT, P_TOILE_V),
    ]
    stripes = [(158, 186), (330, 358)]  # tranches de pages
    s = new_slot(P_PAGES)
    ov = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    for y0, y1, col in bands:
        d.rectangle((0, y0, SLOT, y1), fill=col + (255,))
        # ombre cuite sous la bande (jointure des livres)
        d.rectangle((0, y1 - 4, SLOT, y1), fill=(10, 8, 6, 90))
        d.rectangle((0, y0, SLOT, y0 + 3), fill=(10, 8, 6, 70))
        # dos plus sombre à gauche
        d.rectangle((0, y0, 26, y1), fill=(12, 10, 8, 60))
    ov = ov.filter(ImageFilter.GaussianBlur(0.8))
    s.paste(Image.alpha_composite(s.convert("RGBA"), ov).convert("RGB"), (0, 0))
    # Tranches de pages : fins traits verticaux (feuillets)
    pg = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pg)
    for y0, y1 in stripes:
        x = 6
        while x < SLOT:
            pd.line((x, y0 + 2, x, y1 - 2),
                    fill=(110, 96, 68, random.randint(30, 70)), width=1)
            x += random.randint(4, 8)
    pg = pg.filter(ImageFilter.GaussianBlur(0.4))
    s.paste(Image.alpha_composite(s.convert("RGBA"), pg).convert("RGB"), (0, 0))
    # Coins usés plus clairs (usure de toile)
    wear = Image.new("RGBA", (SLOT, SLOT), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wear)
    for y0, y1, col in bands:
        for corner in ((10, y0 + 6), (SLOT - 10, y0 + 6),
                       (10, y1 - 6), (SLOT - 10, y1 - 6)):
            cxx, cyy = corner
            wd.polygon([(cxx - 26, cyy), (cxx + 26, cyy), (cxx, cyy - 18 if cyy == y0 + 6 else cyy + 18)],
                       fill=(210, 200, 180, 40))
    wear = wear.filter(ImageFilter.GaussianBlur(4))
    s.paste(Image.alpha_composite(s.convert("RGBA"), wear).convert("RGB"), (0, 0))
    return add_grain(finish_slot(s), 6)  # toile = grain le plus marqué


# -------------------------------------------------------------- slot 7 : feutre

def paint_felt(k):
    s = new_slot(P_FEUTRE)
    # Vignettage doux + grain feutre
    v = radial_blob((64, 64), (32, 32), 46, 0.8).resize((SLOT, SLOT), Image.Resampling.BICUBIC)
    dark = Image.new("RGB", (SLOT, SLOT), (46, 37, 28))
    s = Image.composite(s, dark, v)
    return add_grain(finish_slot(s), 7)


# ---------------------------------------------------------------- pipeline

PAINTERS = {
    "docstack": paint_docstack,
    "maproll": paint_maproll,
    "radio": paint_radio,
    "lanterne": paint_lantern,
    "lettre": paint_letter,
    "montre": paint_watch,
    "livres": paint_books,
    "feutre": paint_felt,
}


def slot_luma(slot):
    """Luminance moyenne d'un slot (via histogramme — rapide)."""
    h = slot.convert("L").histogram()
    return sum(i * c for i, c in enumerate(h)) / sum(h)


def build(out_path):
    random.seed(SEED)
    atlas = Image.new("RGB", (ATLAS_W, ATLAS_H), (0, 0, 0))
    stats = []
    for k, name in enumerate(ORDRE):
        slot = PAINTERS[name](k)
        bleed_border(slot)  # dernier geste : le bord replicate l'interieur final
        atlas.paste(slot, slot_rect(k))
        stats.append((k, name, slot_luma(slot)))

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    atlas.save(out_path)

    # ------------------------------------------------------------ auto-contrôles
    fails = []
    if not os.path.exists(out_path):
        fails.append("fichier absent")
    chk = Image.open(out_path)
    if chk.size != (ATLAS_W, ATLAS_H):
        fails.append(f"taille {chk.size} != (2048, 1024)")

    g = chk.convert("L")
    h = g.histogram()
    mean = sum(i * c for i, c in enumerate(h)) / (g.width * g.height)
    mx = max(i for i, c in enumerate(h) if c)
    if not (40 <= mean <= 110):
        fails.append(f"luminance moyenne {mean:.1f} hors [40, 110]")
    if mx > 235:
        fails.append(f"pixel trop proche du blanc (max L={mx})")

    # Interdit : or #d2a63f à moins de 15 d'distance RGB, nulle part
    gold_hits = 0
    px = chk.tobytes()  # RGB ligne par ligne
    for i in range(0, len(px), 3):
        dr = px[i] - GOLD[0]
        if abs(dr) > GOLD_MIN_DIST:
            continue
        dg, db2 = px[i + 1] - GOLD[1], px[i + 2] - GOLD[2]
        if dr * dr + dg * dg + db2 * db2 < GOLD_MIN_DIST ** 2:
            gold_hits += 1
    if gold_hits:
        fails.append(f"{gold_hits} pixels proches de l'or #{GOLD[0]:02x}{GOLD[1]:02x}{GOLD[2]:02x}")

    # Voisin vertical : aucun slot ne doit être une anomalie lumineuse
    for k in range(COLS):
        diff = abs(stats[k][2] - stats[k + COLS][2])
        if diff > 45:
                fails.append(f"écart lumineux {stats[k][0]}↔{stats[k+COLS][0]} = {diff:.0f} > 45")

    # Rapports
    print(f"atlas      : {out_path}")
    print(f"taille     : {chk.size[0]}x{chk.size[1]}")
    print(f"luminance  : moyenne={mean:.1f} (cible [40,110]), max={mx} (garde <236)")
    print(f"pixels or  : {gold_hits} (exigé : 0)")
    print("slots      :")
    for k, name, luma in stats:
        print(f"  k={k} {name:<9} luma_moyenne={luma:6.1f}")
    if fails:
        print("AUTO-CONTROLES : ECHEC")
        for f in fails:
            print("  -", f)
        sys.exit(1)
    print("AUTO-CONTROLES : OK (taille, luminance, or absent, écarts slots modérés)")
    return mean


def main():
    ap = argparse.ArgumentParser(description="Atlas props de vitrine (warm archive).")
    ap.add_argument("--out", required=True, help="chemin du PNG de sortie")
    args = ap.parse_args()
    build(args.out)


if __name__ == "__main__":
    main()
