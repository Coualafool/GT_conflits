#!/usr/bin/env python3
"""Générateur de cartes du workspace GT_conflits.

Source : Natural Earth (domaine public, https://www.naturalearthdata.com).
Style : thème sombre du workspace, étiquettes françaises, pied de page de provenance.

Usage :  python3 scripts/gen_cartes.py [--out repertoire]
Les données Natural Earth sont téléchargées une fois dans ~/.cache/ne-vector/.

Dépendances : geopandas, shapely, matplotlib, pyproj.
"""
import argparse, os, sys, urllib.request
from datetime import date

import geopandas as gpd
import shapely
from shapely.geometry import box
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patheffects as pe
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

CACHE = os.path.expanduser("~/.cache/ne-vector")
OUT_DEFAULT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pictures")

BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
FILES = [
    "ne_110m_admin_0_countries", "ne_110m_lakes", "ne_110m_rivers_lake_centerlines",
    "ne_50m_admin_0_countries", "ne_50m_lakes", "ne_50m_rivers_lake_centerlines",
    "ne_50m_populated_places",
]

# --- palette (identique au thème du workspace) ---
BG = "#0f1419"; PANEL = "#1c2530"; BORDER = "#28323e"; GOLD = "#e0a458"
INK = "#e8edf2"; MUTED = "#9aa8b6"; FAINT = "#8a97a5"
WATER = "#12303f"; WATER_LINE = "#2e5a70"
TODAY = date.today().strftime("%d/%m/%Y")

ROBIN = "+proj=robin +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +datum=WGS84 +units=m +no_defs"

NATO = {"Albania","Belgium","Bulgaria","Canada","Croatia","Czechia","Denmark","Estonia",
        "Finland","France","Germany","Greece","Hungary","Iceland","Italy","Latvia","Lithuania",
        "Luxembourg","Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal",
        "Romania","Slovakia","Slovenia","Spain","Sweden","Turkey","United Kingdom",
        "United States of America"}
BRICS = {"Brazil","Russia","India","China","South Africa","Egypt","Ethiopia","Iran",
         "United Arab Emirates","Indonesia"}
BRICS_SMALL = {"United Arab Emirates"}

FR_FIX = {  # corrections/noms français là où NAME_FR est absent ou malcommode
    "United States of America": "États-Unis", "United Kingdom": "Royaume-Uni",
    "South Korea": "Corée du Sud", "North Korea": "Corée du Nord",
    "Dem. Rep. Congo": "R. D. Congo", "Central African Rep.": "République centrafricaine",
    "S. Sudan": "Soudan du Sud", "Saudi Arabia": "Arabie saoudite",
    "Czechia": "Tchéquie", "Bosnia and Herz.": "Bosnie-Herzégovine",
    "Dominican Rep.": "République dominicaine", "Eq. Guinea": "Guinée équatoriale",
    "Timor-Leste": "Timor-Oriental", "Papua New Guinea": "Papouasie-Nlle-Guinée",
    "United Arab Emirates": "EAU", "Palestine": "Palestine",
}

def fr_name(row):
    v = row.get("NAME_FR")
    if isinstance(v, str) and v.strip():
        return v
    return FR_FIX.get(row["NAME"], row["NAME"])


def ensure_data():
    os.makedirs(CACHE, exist_ok=True)
    for f in FILES:
        p = os.path.join(CACHE, f + ".geojson")
        if not os.path.exists(p) or os.path.getsize(p) < 1000:
            print(f"  téléchargement {f}…")
            urllib.request.urlretrieve(f"{BASE}/{f}.geojson", p)


def unwrap_russia(geom):
    """Coupe la Russie au 180e et rebascule la partie tchouktche à l'est."""
    east = geom.intersection(box(0, -90, 180, 90))
    west = geom.intersection(box(-180, -90, 0, 90))
    parts = [p for p in (east.geoms if east.geom_type == "MultiPolygon" else [east]) if not p.is_empty]
    if not west.is_empty:
        west = shapely.force_2d(west)
        c = shapely.get_coordinates(west); c[:, 0] += 360
        parts.append(shapely.set_coordinates(west, c))
    return shapely.union_all(parts)


def world():
    w = gpd.read_file(os.path.join(CACHE, "ne_110m_admin_0_countries.geojson"))
    w["geometry"] = [unwrap_russia(g) if n == "Russia" else g
                     for g, n in zip(w.geometry, w["NAME"])]
    w = w.clip(box(-180, -90, 180, 90))
    return w.set_crs("EPSG:4326", allow_override=True).to_crs(ROBIN)


def world_raw():
    return gpd.read_file(os.path.join(CACHE, "ne_110m_admin_0_countries.geojson"))


def regional(layer="ne_50m_admin_0_countries", ext=(13, 19, 61, 42)):
    w = gpd.read_file(os.path.join(CACHE, layer + ".geojson"))
    w = w.clip(box(*ext))
    lat_ts = (ext[1] + ext[3]) / 2
    return w.set_crs("EPSG:4326", allow_override=True).to_crs(f"+proj=eqc +lat_ts={lat_ts} +ellps=WGS84 +units=m +no_defs")


def fig_setup(title, subtitle, w=16, h=8.4, sub_y=1.017):
    fig, ax = plt.subplots(figsize=(w, h), dpi=125)
    fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
    ax.set_title(title, fontsize=19, color=INK, pad=16, fontweight="bold", loc="left")
    if subtitle:
        ax.text(0, sub_y, subtitle, transform=ax.transAxes, fontsize=10.5, color=MUTED)
    ax.set_axis_off()
    return fig, ax


def footer(ax, extra=""):
    ax.text(0, -0.035, f"Fond : Natural Earth (domaine public) · {extra} · généré le {TODAY} · scripts/gen_cartes.py",
            transform=ax.transAxes, fontsize=8.5, color=FAINT)


def label(ax, x, y, text, member=False, size=10, anchor_dy=0):
    ax.annotate(text, (x, y + anchor_dy), ha="center", va="center", fontsize=size,
                color="#1a1206" if member else "#c8d2dc",
                fontweight="bold" if member else "normal",
                path_effects=[pe.withStroke(linewidth=3, foreground="white" if member else BG)],
                zorder=7)


# ---------------------------------------------------------------- cartes
def carte_monde_politique(out):
    w = world()
    fig, ax = fig_setup("Carte politique du monde — octobre 2026",
                        "Frontières d’États telles que représentées par Natural Earth ; noms en français")
    w.plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.5)
    big = w[w["POP_RANK"].astype(float) >= 6]
    for _, r in big.iterrows():
        pt = r["geometry"].representative_point()
        label(ax, pt.x, pt.y, fr_name(r), size=8.5)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_monde_muette(out):
    w = world()
    fig, ax = fig_setup("Carte muette du monde — à compléter",
                        "Projection Robinson · frontières d’États · aucune étiquette (support d’exercice)")
    w.plot(ax=ax, color=PANEL, edgecolor="#3a4654", linewidth=0.7)
    lakes = gpd.read_file(os.path.join(CACHE, "ne_110m_lakes.geojson")).to_crs(ROBIN)
    lakes.plot(ax=ax, color=WATER, linewidth=0)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


BRICS_ADHESIONS = [
    ("2009 — fondateurs (BRIC)", ["Brésil", "Russie", "Inde", "Chine"]),
    ("2010", ["Afrique du Sud"]),
    ("2024", ["Égypte", "Éthiopie", "Iran", "Émirats arabes unis (EAU)"]),
    ("2025", ["Indonésie"]),
]


def carte_brics(out):
    import textwrap
    w = world()
    w["member"] = w["NAME"].isin(BRICS)
    fig = plt.figure(figsize=(17, 8.8), dpi=125)
    fig.patch.set_facecolor(BG)
    fig.text(0.055, 0.955, "Les BRICS+ en 2025 — adhésion confirmée", fontsize=19, color=INK, fontweight="bold")
    fig.text(0.055, 0.915, "L’Arabie saoudite est invitée mais son adhésion n’est pas formalisée — elle reste sombre sur la carte.\n"
                           "Aucune étiquette sur la carte : le code couleur marque les membres, la liste complète est à droite.",
             fontsize=10.5, color=MUTED, va="top")
    gs = fig.add_gridspec(1, 2, width_ratios=[2.4, 1.0], wspace=0.03,
                          left=0.03, right=0.985, top=0.86, bottom=0.06)
    ax = fig.add_subplot(gs[0, 0])
    ax.set_facecolor(BG); ax.set_axis_off()
    w[~w["member"]].plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.5)
    w[w["member"]].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=0.7)
    uae = w[w["NAME"] == "United Arab Emirates"].geometry.iloc[0].representative_point()
    ax.scatter([uae.x], [uae.y], s=110, color=GOLD, edgecolor="#1a1206", linewidth=1.6, zorder=6)
    ax.legend(handles=[Patch(facecolor=GOLD, edgecolor="#1a1206", label="BRICS+ (confirmé)"),
                       Patch(facecolor=PANEL, edgecolor=BORDER, label="Autres États"),
                       Line2D([0], [0], marker="o", color="none", markerfacecolor=GOLD,
                              markeredgecolor="#1a1206", markersize=10,
                              label="EAU — État membre trop petit pour être visible à cette échelle")],
              loc="lower left", frameon=False, fontsize=9.5, labelcolor=INK)
    axr = fig.add_subplot(gs[0, 1])
    axr.set_xlim(0, 1); axr.set_ylim(0, 1); axr.axis("off")
    y = 0.985
    axr.text(0, y, "Les 10 membres, par année d’adhésion", fontsize=12.5, color=INK, fontweight="bold", va="top")
    y -= 0.055
    for year, names in BRICS_ADHESIONS:
        axr.text(0, y, year, fontsize=9.5, color=GOLD, fontweight="bold", va="top")
        y -= 0.032
        for ln in textwrap.wrap(" · ".join(names), width=36):
            axr.text(0.02, y, ln, fontsize=9, color=INK, va="top")
            y -= 0.030
        y -= 0.012
    y -= 0.02
    for ln in textwrap.wrap("Non membre : l’Arabie saoudite, invitée en 2023, n’a pas formalisé son adhésion.", width=38):
        axr.text(0, y, ln, fontsize=8.5, color=MUTED, va="top", style="italic")
        y -= 0.028
    fig.text(0.03, 0.015, f"Fond : Natural Earth (domaine public) · projection Robinson · généré le {TODAY} · scripts/gen_cartes.py",
             fontsize=8.5, color=FAINT)
    fig.savefig(out, facecolor=BG, bbox_inches="tight")
    plt.close(fig)


OTAN_ADHESIONS = [
    ("1949 — membres fondateurs", ["États-Unis", "Canada", "Royaume-Uni", "France", "Belgique", "Pays-Bas",
                                   "Luxembourg", "Italie", "Portugal", "Norvège", "Danemark", "Islande"]),
    ("1952", ["Grèce", "Türkiye"]),
    ("1955", ["Allemagne (RFA, réintégrée en 1990)"]),
    ("1982", ["Espagne"]),
    ("1999", ["Pologne", "Hongrie", "Tchéquie"]),
    ("2004", ["Estonie", "Lettonie", "Lituanie", "Slovaquie", "Slovénie", "Roumanie", "Bulgarie"]),
    ("2009", ["Albanie", "Croatie"]),
    ("2017", ["Monténégro"]),
    ("2020", ["Macédoine du Nord"]),
    ("2023", ["Finlande"]),
    ("2024", ["Suède"]),
]


def carte_otan(out):
    import textwrap
    w = world()
    w["member"] = w["NAME"].isin(NATO)
    # la France de Natural Earth inclut les DROM (Guyane, Réunion…) — non couverts
    # de fait par le traité : on ne dore que la métropole
    import pyproj
    fr = w["NAME"] == "France"
    if fr.any():
        pr = pyproj.Transformer.from_crs("EPSG:4326", ROBIN, always_xy=True)
        x1, y1 = pr.transform(-10, 41)
        x2, y2 = pr.transform(10, 52)
        met = box(x1, y1, x2, y2)
        geom = w.loc[fr, "geometry"].iloc[0]
        parts = [p for p in (geom.geoms if geom.geom_type == "MultiPolygon" else [geom])
                 if p.intersects(met)]
        w.loc[fr, "geometry"] = shapely.union_all(parts)
    fig = plt.figure(figsize=(17, 8.8), dpi=125)
    fig.patch.set_facecolor(BG)
    fig.text(0.055, 0.955, "L’OTAN en 2025 — 32 États membres", fontsize=19, color=INK, fontweight="bold")
    fig.text(0.055, 0.915, "Adhésions récentes : Finlande (2023), Suède (2024) — l’Ukraine n’est pas membre.\n"
                           "Aucune étiquette sur la carte : le code couleur marque les membres, la liste complète est à droite.",
             fontsize=10.5, color=MUTED, va="top")
    gs = fig.add_gridspec(1, 2, width_ratios=[2.4, 1.0], wspace=0.03,
                          left=0.03, right=0.985, top=0.86, bottom=0.06)
    ax = fig.add_subplot(gs[0, 0])
    ax.set_facecolor(BG); ax.set_axis_off()
    w[~w["member"]].plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.5)
    w[w["member"]].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=0.7)
    axr = fig.add_subplot(gs[0, 1])
    axr.set_xlim(0, 1); axr.set_ylim(0, 1); axr.axis("off")
    y = 0.985
    axr.text(0, y, "Les 32 membres, par année d’adhésion", fontsize=12.5, color=INK, fontweight="bold", va="top")
    y -= 0.055
    for year, names in OTAN_ADHESIONS:
        axr.text(0, y, year, fontsize=9.5, color=GOLD, fontweight="bold", va="top")
        y -= 0.032
        body = " · ".join(names)
        for ln in textwrap.wrap(body, width=36):
            axr.text(0.02, y, ln, fontsize=9, color=INK, va="top")
            y -= 0.030
        y -= 0.012
    ax.legend(handles=[Patch(facecolor=GOLD, edgecolor="#1a1206", label="Membre de l’OTAN"),
                       Patch(facecolor=PANEL, edgecolor=BORDER, label="Non membre")],
              loc="lower left", frameon=False, fontsize=9.5, labelcolor=INK)
    fig.text(0.03, 0.015, f"Fond : Natural Earth (domaine public) · projection Robinson · généré le {TODAY} · scripts/gen_cartes.py",
             fontsize=8.5, color=FAINT)
    fig.savefig(out, facecolor=BG, bbox_inches="tight")
    plt.close(fig)


def carte_monde_physique(out):
    w = world()
    fig, ax = fig_setup("Le monde physique — relief et hydrographie",
                        "Lacs et cours d’eau principaux · fond marin non représenté")
    w.plot(ax=ax, color="#20262b", edgecolor="#333c44", linewidth=0.4)
    lakes = gpd.read_file(os.path.join(CACHE, "ne_110m_lakes.geojson")).to_crs(ROBIN)
    rivers = gpd.read_file(os.path.join(CACHE, "ne_110m_rivers_lake_centerlines.geojson")).to_crs(ROBIN)
    lakes.plot(ax=ax, color=WATER, linewidth=0)
    rivers.plot(ax=ax, color=WATER_LINE, linewidth=0.6)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def _choropleth(out, field, title, subtitle, legend_title, fmt):
    w = world_raw()
    w["value"] = w[field].astype(float)
    w = w[w["value"] > 0]
    w = w.set_crs("EPSG:4326", allow_override=True).to_crs(ROBIN)
    fig, ax = fig_setup(title, subtitle)
    w.plot(column="value", ax=ax, cmap="YlOrBr", norm=matplotlib.colors.LogNorm(),
           edgecolor=BORDER, linewidth=0.3, missing_kwds={"color": PANEL})
    sm = matplotlib.cm.ScalarMappable(norm=matplotlib.colors.LogNorm(
        vmin=float(w["value"].min()), vmax=float(w["value"].max())), cmap="YlOrBr")
    ticks = [v for v in [10, 100, 1000, 10000, 100000] if w["value"].min() <= v <= w["value"].max()]
    cb = fig.colorbar(sm, ax=ax, shrink=0.6, ticks=ticks, pad=0.02)
    cb.ax.set_yticklabels([fmt(t) for t in ticks], color=INK, fontsize=9)
    cb.outline.set_edgecolor(BORDER)
    cb.set_label(legend_title, color=MUTED, fontsize=9)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_densite(out):
    w = world_raw()
    w = w.set_crs("EPSG:4326")
    w["area_km2"] = w.to_crs("ESRI:54009").geometry.area / 1e6
    w["dens"] = w["POP_EST"].astype(float) / w["area_km2"]
    w = w[w["dens"] > 0].to_crs(ROBIN)
    fig, ax = fig_setup("Densité de population par État (2025)",
                        "Population ÷ superficie — échelle logarithmique ; les micro-États densifies ressortent")
    w.plot(column="dens", ax=ax, cmap="YlOrBr", norm=matplotlib.colors.LogNorm(),
           edgecolor=BORDER, linewidth=0.3)
    sm = matplotlib.cm.ScalarMappable(norm=matplotlib.colors.LogNorm(
        vmin=float(w["dens"].min()), vmax=float(w["dens"].max())), cmap="YlOrBr")
    ticks = [v for v in [1, 10, 100, 1000] if w["dens"].min() <= v <= w["dens"].max()]
    cb = fig.colorbar(sm, ax=ax, shrink=0.6, ticks=ticks, pad=0.02)
    cb.ax.set_yticklabels([f"{t} hab./km²" for t in ticks], color=INK, fontsize=9)
    cb.outline.set_edgecolor(BORDER)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_pib(out):
    w = world_raw()
    w = w.set_crs("EPSG:4326")
    w["pp"] = w["GDP_MD"].astype(float) * 1e6 / w["POP_EST"].astype(float)
    w = w[w["pp"] > 0].to_crs(ROBIN)
    _choropleth_dummy = None
    fig, ax = fig_setup("PIB par habitant (nominal, 2025)",
                        "Données Natural Earth (estimations) — échelle logarithmique en dollars courants")
    w.plot(column="pp", ax=ax, cmap="YlOrBr", norm=matplotlib.colors.LogNorm(),
           edgecolor=BORDER, linewidth=0.3)
    sm = matplotlib.cm.ScalarMappable(norm=matplotlib.colors.LogNorm(
        vmin=float(w["pp"].min()), vmax=float(w["pp"].max())), cmap="YlOrBr")
    ticks = [v for v in [1000, 10000, 100000] if w["pp"].min() <= v <= w["pp"].max()]
    cb = fig.colorbar(sm, ax=ax, shrink=0.6, ticks=ticks, pad=0.02)
    cb.ax.set_yticklabels([f"{t//1000} k$" for t in ticks], color=INK, fontsize=9)
    cb.outline.set_edgecolor(BORDER)
    footer(ax, "projection Robinson")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_moyen_orient(out):
    ext = (13, 19, 61, 42)
    w = regional(ext=ext)
    fig, ax = fig_setup("Le Moyen-Orient — acteurs régionaux",
                        "Frontières d’États · Palestine (Rive occidentale, y c. Jérusalem-Est, et bande de Gaza)",
                        w=15, h=9)
    w.plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.6)
    w[w["NAME"] == "Palestine"].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=0.9)
    for _, r in w.iterrows():
        if float(r.get("POP_RANK", 0) or 0) >= 5 or r["NAME"] == "Palestine":
            pt = r["geometry"].representative_point()
            label(ax, pt.x, pt.y, fr_name(r), member=(r["NAME"] == "Palestine"), size=10)
    footer(ax, "projection équirectangulaire (lat. 30°)")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


CITIES = {  # nom français : (lon, lat, décalage étiquette en points dx,dy)
    "Jérusalem": (35.2066, 31.7784, (-46, -4)),
    "Tel Aviv": (34.7681, 32.0819, (-44, 4)),
    "Haïfa": (34.9892, 32.7945, (-38, 5)),
    "Gaza": (34.4450, 31.5300, (-32, -14)),
    "Ramallah": (35.2062, 31.9029, (10, 4)),
    "Hébron": (35.0944, 31.5326, (10, -4)),
    "Naplouse": (35.2733, 32.2211, (10, 3)),
    "Jéricho": (35.4444, 31.8711, (10, -2)),
    "Beersheba": (34.7913, 31.2518, (-46, -3)),
    "Amman": (35.9314, 31.9519, (10, 2)),
    "Beyrouth": (35.5078, 33.8739, (-46, 0)),
    "Damas": (36.2981, 33.5020, (10, 0)),
    "Le Caire": (31.2480, 30.0520, (0, 0)),  # hors cadre des cartes régionales — filtré
}


def draw_cities(ax, ext, crs_str, names):
    import pyproj
    pr = pyproj.Transformer.from_crs("EPSG:4326", crs_str, always_xy=True)
    for nm in names:
        lon, lat, (dx, dy) = CITIES[nm]
        if not (ext[0] <= lon <= ext[2] and ext[1] <= lat <= ext[3]):
            continue
        x, y = pr.transform(lon, lat)
        ax.scatter([x], [y], s=34, color=INK, edgecolor=BG, linewidth=1.0, zorder=8)
        ax.annotate(nm, (x, y), textcoords="offset points", xytext=(dx, dy), ha="center", va="center",
                    fontsize=8.5, color=INK, path_effects=[pe.withStroke(linewidth=2, foreground=BG)], zorder=8)


def carte_isra_palestine(out):
    ext = (33.3, 28.3, 37.8, 34.3)
    crs = f"+proj=eqc +lat_ts=31.3 +ellps=WGS84 +units=m +no_defs"
    w = regional(ext=ext)
    fig, ax = fig_setup("Israël et Palestine — échelle régionale",
                        "Palestine en doré (Rive occidentale, y c. Jérusalem-Est, et bande de Gaza) · villes principales",
                        w=11, h=11, sub_y=1.06)
    w.plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.6)
    w[w["NAME"] == "Palestine"].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=1.0)
    lakes = gpd.read_file(os.path.join(CACHE, "ne_50m_lakes.geojson")).clip(box(*ext)).to_crs(crs)
    lakes.plot(ax=ax, color="#14344a", linewidth=0)
    for nm, fr in [("Israel", "Israël"), ("Jordan", "Jordanie"), ("Lebanon", "Liban"),
                   ("Syria", "Syrie"), ("Egypt", "Égypte")]:
        sub = w[w["NAME"] == nm]
        if sub.empty:
            continue
        pt = sub.geometry.iloc[0].representative_point()
        label(ax, pt.x, pt.y, fr, size=10)
    draw_cities(ax, ext, crs, [n for n in CITIES if n != "Le Caire"])
    footer(ax, "projection équirectangulaire (lat. 31,3°)")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_eau_jourdain(out):
    ext = (34.2, 29.3, 36.8, 33.8)
    w = regional(ext=ext)
    fig, ax = fig_setup("Le bassin du Jourdain — ressource en eau partagée",
                        "Jourdain, lac de Tibériade (mer de Galilée), mer Morte · fleuves et lacs : Natural Earth",
                        w=11, h=11, sub_y=1.06)
    w.plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.6)
    w[w["NAME"] == "Palestine"].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=1.0)
    crs = f"+proj=eqc +lat_ts=31.5 +ellps=WGS84 +units=m +no_defs"
    lakes = gpd.read_file(os.path.join(CACHE, "ne_50m_lakes.geojson")).clip(box(*ext)).to_crs(crs)
    rivers = gpd.read_file(os.path.join(CACHE, "ne_50m_rivers_lake_centerlines.geojson")).clip(box(*ext)).to_crs(crs)
    lakes.plot(ax=ax, color=WATER, linewidth=0)
    rivers.plot(ax=ax, color=WATER_LINE, linewidth=1.4)
    for nm in ("Mer Morte", "Lac de Tibériade", "Jourdain"):
        if nm == "Mer Morte":
            xy = (35.5, 31.5)
        elif nm == "Lac de Tibériade":
            xy = (35.58, 32.79)
        else:
            xy = (35.55, 31.95)
        import pyproj
        pr = pyproj.Transformer.from_crs("EPSG:4326", crs, always_xy=True)
        x, y = pr.transform(*xy)
        label(ax, x, y, nm, size=9, anchor_dy=0)
    footer(ax, "projection équirectangulaire (lat. 31,5°)")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_golfe(out):
    ext = (42, 21, 62, 32)
    w = regional(ext=ext)
    fig, ax = fig_setup("Le Golfe persique et le détroit d’Ormuz",
                        "Point de passage crucial du pétrole mondial (~1/5 du commerce maritime de brut)",
                        w=13, h=9)
    w.plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.6)
    for _, r in w.iterrows():
        if float(r.get("POP_RANK", 0) or 0) >= 4 or r["NAME"] in {"Qatar", "Bahrain", "United Arab Emirates"}:
            pt = r["geometry"].representative_point()
            nm = fr_name(r)
            label(ax, pt.x, pt.y, nm, member=(r["NAME"] == "Iran"), size=10)
    import pyproj
    crs = f"+proj=eqc +lat_ts=26.5 +ellps=WGS84 +units=m +no_defs"
    pr = pyproj.Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    x, y = pr.transform(57.0, 26.4)
    label(ax, x, y, "détroit d’Ormuz", size=10)
    footer(ax, "projection équirectangulaire (lat. 26,5°)")
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


def carte_israel_belgique(out):
    import pyproj
    fig, axes = plt.subplots(1, 2, figsize=(13, 7.5), dpi=125)
    fig.patch.set_facecolor(BG)
    specs = [("Belgique", (1.5, 48.0, 8.8, 52.8), 50.6, {"Belgium"}),
             ("Israël-Palestine", (33.3, 28.3, 37.8, 34.6), 31.3, {"Israel", "Palestine"})]
    SPAN = 4.6e5  # même échelle métrique dans les deux panneaux
    for ax, (nm, ext, lat_ts, subject) in zip(axes, specs):
        ax.set_facecolor(BG)
        crs = f"+proj=laea +lat_0={lat_ts} +lon_0={(ext[0]+ext[2])/2} +ellps=WGS84 +units=m +no_defs"
        w = gpd.read_file(os.path.join(CACHE, "ne_50m_admin_0_countries.geojson")).clip(box(*ext)).to_crs(crs)
        w["subj"] = w["NAME"].isin(subject)
        w[~w["subj"]].plot(ax=ax, color=PANEL, edgecolor=BORDER, linewidth=0.5)
        w[w["subj"] & (w["NAME"] != "Palestine")].plot(ax=ax, color="#46586c", edgecolor="#5d7186", linewidth=0.8)
        w[w["NAME"] == "Palestine"].plot(ax=ax, color=GOLD, edgecolor="#1a1206", linewidth=0.9)
        cx = w[w["subj"]].geometry.unary_union.representative_point()
        ax.set_xlim(cx.x - SPAN/2, cx.x + SPAN/2); ax.set_ylim(cx.y - SPAN/2, cx.y + SPAN/2)
        ax.set_aspect("equal"); ax.set_axis_off()
        ax.set_title(nm, fontsize=13, color=INK, pad=8)
    fig.suptitle("Même échelle : Israël et la Belgique", fontsize=19, color=INK, fontweight="bold", x=0.06, ha="left")
    fig.text(0.06, 0.90, "Superficie comparable (~30 000 km²) — projection LAEA centrée, aires exactes",
             fontsize=10.5, color=MUTED)
    fig.text(0.06, 0.02, f"Fond : Natural Earth (domaine public) · généré le {TODAY} · scripts/gen_cartes.py",
             fontsize=8.5, color=FAINT)
    fig.savefig(out, facecolor=BG, bbox_inches="tight"); plt.close(fig)


CARTE = [
    ("carte-generee-monde-politique.png", carte_monde_politique),
    ("carte-generee-monde-muette.png", carte_monde_muette),
    ("carte-generee-brics.png", carte_brics),
    ("carte-generee-otan.png", carte_otan),
    ("carte-generee-monde-physique.png", carte_monde_physique),
    ("carte-generee-monde-densite.png", carte_densite),
    ("carte-generee-monde-pib.png", carte_pib),
    ("carte-generee-moyen-orient.png", carte_moyen_orient),
    ("carte-generee-isra-palestine.png", carte_isra_palestine),
    ("carte-generee-bassin-jourdain.png", carte_eau_jourdain),
    ("carte-generee-golfe-ormuz.png", carte_golfe),
    ("carte-generee-israel-belgique.png", carte_israel_belgique),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=OUT_DEFAULT)
    ap.add_argument("--only", default=None, help="filtrer par sous-chaîne de nom de fichier")
    args = ap.parse_args()
    ensure_data()
    for fname, fn in CARTE:
        if args.only and args.only not in fname:
            continue
        out = os.path.join(args.out, fname)
        print(f"→ {fname}")
        fn(out)
    print("OK")


if __name__ == "__main__":
    main()
