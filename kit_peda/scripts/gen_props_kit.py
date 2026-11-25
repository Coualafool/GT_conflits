#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen_props_kit.py — générateur bpy des 7 props de vitrine du kit GT_conflits.

Contrat : interne/BLENDER-PROPS-KIT.md (enveloppe 0,56 L × 0,48 H × 0,40 P m,
pivot bas-centre, 1 matériau M_props_atlas, UV dans l'atlas 2048×1024 en
4×2 créneaux, naming prop_<archetype> exact). Tout est déterministe :
seed 7, aucune horloge, géométrie construite en bmesh pur (pas de bpy.ops
de modélisation), bevels appliqués en édition, zéro modificateur résiduel.

Usage (Blender headless, SEUL mode supporté) :
  blender --background --python scripts/gen_props_kit.py -- --out props-musee.glb [--atlas atlas.png]
Chemins --out/--atlas absolutisés (images.load/export résolvent le relatif contre le .blend).

Couleurs de référence (palette « warm archive », cuites dans l'atlas par
l'agent atlas — jamais d'or, jamais le code de divergence) :
  papier #cfc2a8 / #ece6da · bois #4a3b28 · laiton #a8853f
  tissu #3a2f24 · terre cuite #8a5a3c · cachet #6e3030
"""

import math
import random
import sys

import bpy
import bmesh
from mathutils import Matrix, Vector

# --------------------------------------------------------------------------
# Constantes du contrat (BLENDER-PROPS-KIT.md)
# --------------------------------------------------------------------------

# Enveloppe cookie cutter, axes Blender (x = L, y = P, z = H) :
# max_x 0,56 · max_y 0,40 · max_z 0,48. En glTF Y-up ce sera 0,56 × 0,48 × 0,40.
ENVELOPPE = (0.56, 0.40, 0.48)

# bbox cible par archétype (L×P×H, m) — plafond dur avec tolérance.
TARGET_BBOX = {
    "docstack": (0.26, 0.20, 0.05),
    "maproll":  (0.26, 0.08, 0.10),
    "radio":    (0.22, 0.10, 0.15),
    "lantern":  (0.13, 0.10, 0.11),
    "letter":   (0.20, 0.12, 0.025),
    "watch":    (0.07, 0.06, 0.03),
    "books":    (0.24, 0.17, 0.13),
}

# Plages de triangles APRÈS application (mêmes nombres que build_props.mjs).
TRI_RANGE = {
    "docstack": (150, 300), "maproll": (80, 150), "radio": (200, 400),
    "lantern": (150, 300), "letter": (60, 120), "watch": (120, 250),
    "books": (100, 200),
}

# Ordre des créneaux UV (atlas 2048×1024, 4 colonnes × 2 rangées de 512 px).
ARCHES = ["docstack", "maproll", "radio", "lantern", "letter", "watch", "books"]

UV_MARGIN = 0.94          # facteur d'échelle dans le créneau (6 % de garde/saignée)
MAT_NAME = "M_props_atlas"
IMG_NAME = "props_atlas.png"
ATLAS_W, ATLAS_H = 2048, 1024

EPS_Z = 1e-4              # tolérance pivot (idem script de vérification de la doc)
EPS_TARGET = 3e-3         # tolérance du bbox cible (avis de confort, pas le cookie cutter)

MAX_GLB_BYTES = 400 * 1000  # même budget que la gate build_props.mjs

# Props « ronds » : ombrage doux + seuil 35° ; les autres restent plats (boîte/papier).
ROUND_PROPS = {"maproll", "radio", "lantern", "watch"}


# --------------------------------------------------------------------------
# Helpers de maillage (bmesh pur — déterministe, sans contexte d'interface)
# --------------------------------------------------------------------------

def _new_bm():
    """Nouveau bmesh vide."""
    return bmesh.new()


def _add_box(bm, sx, sy, sz, loc=(0.0, 0.0, 0.0), rot_z=0.0):
    """Pavé sx×sy×sz centré sur loc, pivot au CENTRE, rotation ±z optionnelle. Renvoie les faces."""
    # Blender 4.5 : le dict retour de create_cube n'expose plus "faces" — diff d'identité.
    before = set(bm.faces)
    m = (Matrix.Translation(Vector(loc)) @
         Matrix.Rotation(math.radians(rot_z), 4, "Z") @
         Matrix.Diagonal((sx / 2.0, sy / 2.0, sz / 2.0, 1.0)))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    return [f for f in bm.faces if f not in before]


def _add_cylinder(bm, r, depth, segments, loc=(0.0, 0.0, 0.0), axis="Z",
                  cap_ends=True, taper_ends=0.0):
    """Cylindre (rayon r, hauteur depth), axe Z par défaut. taper_ends = fraction
    de loop de bord à rétrécir (échelle 0,92) — utilisé pour les bouts de la carte.
    Renvoie (verts, faces)."""
    rot = {"Z": Matrix.Identity(4),
           "X": Matrix.Rotation(math.radians(90), 4, "Y"),
           "Y": Matrix.Rotation(math.radians(-90), 4, "X")}[axis]
    # Blender 4.5 : create_cone ne retourne plus "faces" — snapshots d'identité bmesh.
    vb = set(bm.verts)
    fb = set(bm.faces)
    m = Matrix.Translation(Vector(loc)) @ rot
    bmesh.ops.create_cone(bm, cap_ends=cap_ends, cap_tris=False,
                          segments=segments, radius1=r, radius2=r,
                          depth=depth, matrix=m)
    verts = [v for v in bm.verts if v not in vb]
    faces = [f for f in bm.faces if f not in fb]
    if taper_ends > 0.0 and axis == "X":
        # boucles d'extrémité = sommets aux x extrêmes du cylindre (avant translation)
        xs = [v.co.x for v in verts]
        x0, x1 = min(xs), max(xs)
        cx, cy = loc[0], loc[1]
        for v in verts:
            if abs(v.co.x - x0) < 1e-7 or abs(v.co.x - x1) < 1e-7:
                v.co.y = cy + (v.co.y - cy) * taper_ends
                v.co.z = loc[2] + (v.co.z - loc[2]) * taper_ends
    return verts, faces


def _bevel_edges(bm, edges, width, segments=1):
    """Chanfrein appliqué immédiatement (équivalent d'un Bevel modifier appliqué)."""
    try:
        bmesh.ops.bevel(bm, geom=list(edges), offset=width, segments=segments,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    except TypeError:
        # anciennes signatures bpy : pas de clamp_overlap
        bmesh.ops.bevel(bm, geom=list(edges), offset=width, segments=segments,
                        profile=0.5, affect="EDGES")


def _sharp_edges(bm, min_angle_deg=30.0):
    """Arêtes dont l'angle dièdre dépasse min_angle_deg (arêtes « vives »)."""
    lim = math.radians(min_angle_deg)
    out = []
    for e in bm.edges:
        if len(e.link_faces) != 2:
            continue
        if e.calc_face_angle() > lim:
            out.append(e)
    return out


def _grid(bm, nx, ny, sx, sy):
    """Grille de quads nx×ny dans le plan XY centrée sur (0,0,0). Renvoie les faces."""
    verts_rows = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x = -sx / 2.0 + sx * i / nx
            y = -sy / 2.0 + sy * j / ny
            row.append(bm.verts.new((x, y, 0.0)))
        verts_rows.append(row)
    bm.verts.ensure_lookup_table()
    faces = []
    for j in range(ny):
        for i in range(nx):
            faces.append(bm.faces.new((verts_rows[j][i], verts_rows[j][i + 1],
                                       verts_rows[j + 1][i + 1], verts_rows[j + 1][i])))
    return faces


def _inset_caps(bm, faces, thickness):
    """Inset des faces dont la normale porte l'axe X (caps de la carte roulée) :
    crée la bague de bord décrite par la fiche."""
    cap_faces = [f for f in faces if len(f.verts) > 4 and
                 abs(f.normal.x) > 0.99]
    if cap_faces:
        bmesh.ops.inset_region(bm, faces=cap_faces, thickness=thickness,
                               depth=0.0)


def _merge(target_bm, src_bm):
    """Fusionne src dans target (géométrie seule ; les UV sont faits après la fusion)."""
    me_tmp = bpy.data.meshes.new("_merge_tmp")
    src_bm.to_mesh(me_tmp)
    target_bm.from_mesh(me_tmp)
    bpy.data.meshes.remove(me_tmp)


def _sweep_arc(bm, plane, base, zc, radius, a0_deg, a1_deg, n_seg, profile_pts):
    """Tube balayé le long d'un arc dans un plan VERTICAL :
    'XZ' : x = base + (R+u)·cos a, z = zc + (R+u)·sin a, y = v
    'YZ' : y = (R+u)·cos a,        z = zc + (R+u)·sin a, x = v
    profile_pts = liste (u, v) : u radial, v hors plan. n_seg segments →
    n_seg+1 anneaux, caps ngons aux deux bouts. Renvoie les faces."""
    rings = []
    for k in range(n_seg + 1):
        ang = math.radians(a0_deg + (a1_deg - a0_deg) * k / n_seg)
        ca, sa = math.cos(ang), math.sin(ang)
        ring = []
        for (u, v) in profile_pts:
            if plane == "XZ":
                ring.append(bm.verts.new((base + (radius + u) * ca, v,
                                          zc + (radius + u) * sa)))
            else:  # 'YZ'
                ring.append(bm.verts.new((v, (radius + u) * ca,
                                          zc + (radius + u) * sa)))
        rings.append(ring)
    faces = []
    for k in range(n_seg):
        r0, r1 = rings[k], rings[k + 1]
        for p in range(len(profile_pts)):
            q = (p + 1) % len(profile_pts)
            faces.append(bm.faces.new((r0[p], r0[q], r1[q], r1[p])))
    # caps ngons aux deux bouts (retournés pour la normale sortante)
    faces.append(bm.faces.new(tuple(reversed(rings[0]))))
    faces.append(bm.faces.new(tuple(rings[-1])))
    return faces


# --------------------------------------------------------------------------
# Matériau / UV — contrat partagé avec l'agent atlas
# --------------------------------------------------------------------------

def _slot_rect(k):
    """Rectangle UV du créneau k dans l'espace UV Blender (origine en bas à gauche)."""
    u0 = (k % 4) * 0.25
    v0 = 1.0 - (k // 4 + 1) * 0.5
    return u0, v0, u0 + 0.25, v0 + 0.5


def _get_or_make_image(atlas_path):
    """Image 'props_atlas.png' : fichier fourni, fichier existant par défaut,
    sinon damier de repli déterministe (l'export embarque ce qui existe)."""
    img = bpy.data.images.get(IMG_NAME)
    if img is not None:
        bpy.data.images.remove(img)
    candidates = []
    if atlas_path:
        candidates.append(atlas_path)
    import os
    candidates.append(os.path.join(os.getcwd(), IMG_NAME))
    for path in candidates:
        if path and os.path.isfile(path):
            img = bpy.data.images.load(path, check_existing=False)
            img.name = IMG_NAME
            return img
    # repli : damier « papier » aux deux teintes de la palette, jamais d'or.
    # pixels attend des FLOTTANTS 0..1 (les bytes 0..255 seraient écrasés à 1.0).
    from array import array
    img = bpy.data.images.new(IMG_NAME, ATLAS_W, ATLAS_H, alpha=False)
    a = (0.812, 0.761, 0.659)   # #cfc2a8
    b = (0.925, 0.902, 0.855)   # #ece6da
    cell = 64
    rows = []
    for parity in (0, 1):       # une rangée type par parité de (x // cell)
        c_row = array("f")
        for x in range(ATLAS_W):
            r, g, bl = a if (x // cell) % 2 == parity else b
            c_row.extend((r, g, bl, 1.0))
        rows.append(c_row)
    px = array("f")
    for y in range(ATLAS_H):    # damier : a quand (x//cell + y//cell) pair
        px.extend(rows[(y // cell) % 2])
    img.pixels.foreach_set(px)
    return img


def _build_material(atlas_path):
    """UN seul matériau : Principled + image diffuse (le rendu final sera du
    MeshBasicMaterial three — l'éclairage est cuit dans la texture)."""
    img = _get_or_make_image(atlas_path)
    mat = bpy.data.materials.new(MAT_NAME)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def _uv_slot_box(obj, k):
    """Projection plane par le dessus (vue de lecture) vers le rectangle du
    créneau k, échelle 0,94 centrée. Déterministe, aucune dépendance à l'opérateur."""
    me = obj.data
    # Blender 4.5 : uv_layers.clear() supprimé de l'API — retrait élément par élément.
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    uvl = me.uv_layers.new(name="UVMap")
    coords = [v.co for v in me.vertices]
    xs = [c.x for c in coords]
    ys = [c.y for c in coords]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    dx = max(x1 - x0, 1e-9)
    dy = max(y1 - y0, 1e-9)
    au0, av0, au1, av1 = _slot_rect(k)
    w = (au1 - au0) * UV_MARGIN
    h = (av1 - av0) * UV_MARGIN
    pu0 = au0 + ((au1 - au0) - w) / 2.0
    pv0 = av0 + ((av1 - av0) - h) / 2.0
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = coords[me.loops[li].vertex_index]
            uvl.data[li].uv = (pu0 + w * (co.x - x0) / dx,
                               pv0 + h * (co.y - y0) / dy)


# --------------------------------------------------------------------------
# Finisseur commun : objet nommé, pivot bas-centre, ombre, matériau, UV
# --------------------------------------------------------------------------

def _finalize(bm, key, mat, slot):
    """bm (coordonnées quelconques) → objet prop_<key> à l'identité :
    min z = 0, médiane x/z du bbox à l'origine, 1 matériau, UV du créneau."""
    name = "prop_" + key
    for old in (bpy.data.objects.get(name), bpy.data.meshes.get(name)):
        if old is not None:
            (bpy.data.objects.remove if isinstance(old, bpy.types.Object)
             else bpy.data.meshes.remove)(old)
    # winding garanti sortant AVANT export/bake : le wedge du bec, les caps des
    # sweeps et les shells solidify ont des enroulements écrits à la main.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    # recentrage : médiane X/Y sur 0, sol (min z) sur 0
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    zs = [v.co.z for v in me.vertices]
    dx = (min(xs) + max(xs)) / 2.0
    dy = (min(ys) + max(ys)) / 2.0
    dz = min(zs)
    for v in me.vertices:
        v.co.x -= dx
        v.co.y -= dy
        v.co.z -= dz
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    me.materials.append(mat)
    if key in ROUND_PROPS:
        for p in me.polygons:
            p.use_smooth = True
        # Pas d'auto-smooth ni de modificateur d'angle : use_auto_smooth est mort
        # en <4.1, l'enum SMOOTH_BY_ANGLE n'existe pas dans le build 4.5 visé
        # (run TARS 3 : 'enum "SMOOTH_BY_ANGLE" not found') — et le rendu final
        # consomme un MeshBasicMaterial qui IGNORE les normales. Doux partout est
        # le comportement cible ; un modificateur résiduel ferait échouer check().
    _uv_slot_box(obj, slot)
    return obj


# --------------------------------------------------------------------------
# 1. prop_docstack — pile de documents (bbox cible 0,26×0,20×0,05 · 150–300 tris)
# --------------------------------------------------------------------------

def build_docstack(mat):
    """3 feuilles 3×3 quads (×2 côtés + tranches via Solidify appliqué) empilées
    à ±8°, ondulation ±2 mm, coin du dessus soulevé de 4 mm. ≈180 tris."""
    rng = random.Random(7)
    sheet_specs = [
        # (taille, angle°, z de pose)
        ((0.240, 0.166), rng.uniform(-8.0, 8.0), 0.0006),
        ((0.232, 0.160), rng.uniform(-8.0, 8.0), 0.0046),
        ((0.236, 0.163), rng.uniform(-8.0, 8.0), 0.0090),
    ]
    for si, ((sx, sy), ang, z0) in enumerate(sheet_specs):  # noqa: B007
        sub = _new_bm()
        faces = _grid(sub, 3, 3, sx, sy)
        # ondulation déterministe ±2 mm, puis coin soulevé de 4 mm sur la feuille du dessus
        for v in sub.verts:
            w = 0.002 * math.sin(v.co.x * 12.7 + si * 2.1) * math.cos(v.co.y * 9.3 + si)
            v.co.z += w
        if si == 2:
            cx, cy = sx / 2.0, sy / 2.0
            for v in sub.verts:
                d2 = ((v.co.x - cx) / 0.11) ** 2 + ((v.co.y - cy) / 0.09) ** 2
                v.co.z += 0.004 * math.exp(-d2)
        m = (Matrix.Translation((0.0, 0.0, z0)) @
             Matrix.Rotation(math.radians(ang), 4, "Z"))
        for v in sub.verts:
            v.co = m @ v.co
        # Solidify appliqué : 0,6 mm d'épaisseur (tranches comprises)
        boundary = [e for e in sub.edges if e.is_boundary]
        res = bmesh.ops.solidify(sub, geom=boundary + faces, thickness=0.0006)
        _merge(bm_main_docstack, sub)
        sub.free()
    return _finalize(bm_main_docstack, "docstack", mat, ARCHES.index("docstack"))


# --------------------------------------------------------------------------
# 2. prop_maproll — carte roulée (0,26×0,08×0,10 · 80–150 tris)
# --------------------------------------------------------------------------

def build_maproll(mat):
    """Cylindre 10 faces le long de x, bagues de caps inset, taper 0,92 aux
    bouts, + pende de papier 8 segments en arc de 9 cm sur le plan. ≈108 tris."""
    bm = _new_bm()
    # rouleau : ø 0,078 (< 0,08 de profondeur), du x -0,13 au x +0,04, centre z 0,039
    verts, faces = _add_cylinder(bm, r=0.039, depth=0.17, segments=10,
                                 loc=(-0.045, 0.0, 0.039), axis="X",
                                 taper_ends=0.92)
    _inset_caps(bm, faces, thickness=0.006)
    # pende : bande 8 segments × 2 largeurs, descend de l'extrémité du rouleau
    # au sol sur un arc ~9 cm (profil en cosinus), puis repart à plat.
    x_start, arc = 0.040, 0.090
    n, w2 = 8, 0.036          # demi-largeur : 0,072 ≤ 0,08 (bbox cible prime sur le 0,10 de la fiche — voir rapport)
    z_top = 0.076
    rows = []
    for j in range(n + 1):
        t = j / n
        x = x_start + arc * t
        z = max(0.0004, z_top * math.cos(t * math.pi / 2.0))
        rows.append([bm.verts.new((x, -w2 + 2 * w2 * i / 2.0, z)) for i in range(3)])
    for j in range(n):
        for i in range(2):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
    return _finalize(bm, "maproll", mat, ARCHES.index("maproll"))


# --------------------------------------------------------------------------
# 3. prop_radio — radio d'époque (0,22×0,10×0,15 · 200–400 tris)
# --------------------------------------------------------------------------

def build_radio(mat):
    """Boîtier chanfreiné 3 mm + arche d'anse (arc à section 6 mm, 12 segments)
    + 2 cadrans cylindriques 8 faces en saillie de 4 mm. Grille HP = 100 % texture.
    ≈236 tris."""
    bm = _new_bm()
    # boîtier 0,22×0,10×0,095 posé à z 0, sous l'arc
    box_faces = _add_box(bm, 0.22, 0.10, 0.095, loc=(0.0, 0.0, 0.0475))
    box_verts = sorted({v for f in box_faces for v in f.verts}, key=id)
    bmesh.ops.subdivide_edges(bm, edges=list({e for v in box_verts for e in v.link_edges}),
                              cuts=1, use_grid_fill=True)
    _bevel_edges(bm, _sharp_edges(bm, 30.0), width=0.003)
    # arche d'anse : arc de 150°, rayon 0,053, centre (0,0,0,080), section 6×6 mm
    prof = [(-0.003, -0.003), (0.003, -0.003), (0.003, 0.003), (-0.003, 0.003)]
    _sweep_arc(bm, "XZ", base=0.0, zc=0.080, radius=0.053, a0_deg=15.0,
               a1_deg=165.0, n_seg=12, profile_pts=prof)
    # 2 cadrans laiton (geôlement = géométrie minimale) : saillie 4 mm, face avant -Y
    for cx in (-0.055, 0.055):
        _add_cylinder(bm, r=0.013, depth=0.012, segments=8,
                      loc=(cx, -0.048, 0.052), axis="Y")
    return _finalize(bm, "radio", mat, ARCHES.index("radio"))


# --------------------------------------------------------------------------
# 4. prop_lantern — lampe à huile méditerranéenne (0,13×0,10×0,11 · 150–300 tris)
# --------------------------------------------------------------------------

def build_lantern(mat):
    """Soucoupe = cône tronqué 12 faces ; panse = icosa subdiv 1 aplati (scale z
    0,45 — subdiv 2 de la fiche = 320 tris à lui seul, hors plage → subdiv 1,
    voir rapport) ; bec = wedge fusionné ; mèche = cylindre 6 faces ;
    anse = anneau 8 faces, moitié inférieure supprimée. ≈277 tris."""
    bm = _new_bm()
    # soucoupe
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=12,
                          radius1=0.048, radius2=0.034, depth=0.012,
                          matrix=Matrix.Translation((0.0, 0.0, 0.006)))
    # panse renflée (Blender 4.5 : idem create_icosphere, diff d'identité pour les verts)
    vb = set(bm.verts)
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.045)
    panse = [v for v in bm.verts if v not in vb]
    for v in panse:
        v.co.x *= 0.85
        v.co.y *= 0.68
        v.co.z = v.co.z * 0.45 + 0.030
    # bec : wedge à 5 faces fusionné dans la panse (pas de Remesh — mesh propre)
    b1 = bm.verts.new((0.020, 0.024, 0.012)); b2 = bm.verts.new((0.020, -0.024, 0.012))
    b3 = bm.verts.new((0.058, -0.012, 0.014)); b4 = bm.verts.new((0.058, 0.012, 0.014))
    t1 = bm.verts.new((0.020, 0.018, 0.036)); t2 = bm.verts.new((0.020, -0.018, 0.036))
    t3 = bm.verts.new((0.058, 0.0, 0.034))
    for quad in ((b1, b2, b3, b4), (b2, b1, t1, t2), (b1, b4, t3, t1),
                 (b2, t2, t3, b3)):
        bm.faces.new(quad)
    bm.faces.new((b4, b3, t3))
    # mèche brun noirci dans le bec
    _add_cylinder(bm, r=0.006, depth=0.012, segments=6, loc=(0.050, 0.0, 0.044))
    # anse : demi-anneau 8 faces de section, moitié basse supprimée (construit haute)
    prof = [(0.003 * math.cos(2 * math.pi * p / 8.0),
             0.003 * math.sin(2 * math.pi * p / 8.0)) for p in range(8)]
    _sweep_arc(bm, "YZ", base=0.0, zc=0.060, radius=0.024, a0_deg=10.0,
               a1_deg=170.0, n_seg=7, profile_pts=prof)
    return _finalize(bm, "lantern", mat, ARCHES.index("lantern"))


# --------------------------------------------------------------------------
# 5. prop_letter — lettre pliée + cachet (0,20×0,12×0,025 · 60–120 tris)
# --------------------------------------------------------------------------

def build_letter(mat):
    """Papier 6×2 quads plié en trois (plis à ±6°, mémoire du pli), Solidify
    0,6 mm appliqué, cachet cylindre 8 faces ø 3,2 cm × 3 mm excentré sur le
    tiers du dessus. ≈108 tris."""
    bm = _new_bm()
    faces = _grid(bm, 6, 2, 0.20, 0.115)
    # deux plis à x = ±0,0333 : tiers du milieu relevé à +6°, tiers haut basculé
    # de 6° en arrière — les plis ne se rejoignent pas exactement.
    tan6 = math.tan(math.radians(6.0))
    for v in bm.verts:
        if v.co.x > -0.0333 and v.co.x < 0.0333:
            v.co.z += (v.co.x + 0.0333) * tan6
        elif v.co.x >= 0.0333:
            v.co.z += 0.0667 * tan6 - (v.co.x - 0.0333) * tan6 * 0.97
    boundary = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.solidify(bm, geom=boundary + faces, thickness=0.0006)
    # cachet : borne éteint, ø 0,032 × 3 mm, excentré sur le tiers supérieur (x > 0).
    # Posé via la fonction du pli au x du cachet (l'ancien ztop global le faisait
    # flotter ~2,4 mm au-dessus du tiers droit, qui redescend vers x = 0,10).
    def _fold_z(x):
        if x < -0.0333:
            return 0.0
        if x < 0.0333:
            return (x + 0.0333) * tan6
        return 0.0667 * tan6 - (x - 0.0333) * tan6 * 0.97
    _add_cylinder(bm, r=0.016, depth=0.003, segments=8,
                  loc=(0.060, 0.018, _fold_z(0.060) + 0.0013))
    return _finalize(bm, "letter", mat, ARCHES.index("letter"))


# --------------------------------------------------------------------------
# 6. prop_watch — montre gousset posée (0,07×0,06×0,03 · 120–250 tris)
# --------------------------------------------------------------------------

def build_watch(mat):
    """Boîtier cylindre 16 faces ø 0,056, chanfrein de carrure 1,5 mm, verre
    = bague du dessus relevée de 1 mm ; couronne 6 faces crantée à « 12 h » (+y) ;
    chaîne = bande plane en S (16 tris — la fiche dit « 2 tris » ; une courbe en S
    lisible exige quelques segments, la chaîne reste 100 % texture). ≈168 tris."""
    bm = _new_bm()
    verts, faces = _add_cylinder(bm, r=0.027, depth=0.010, segments=16,
                                 loc=(0.0, 0.0, 0.006))
    # chanfrein de carrure : arêtes chapeau/flancs du boîtier. Filtre : écart
    # |n1.z − n2.z| > 0,9 (flancs n.z≈0, chapeaux n.z=±1). L'ancien produit
    # n1.z*n2.z < 0 était toujours faux (0 × ±1 = 0) → chanfrein jamais posé.
    ring_edges = [e for e in bm.edges
                  if len(e.link_faces) == 2 and
                  abs(e.link_faces[0].normal.z - e.link_faces[1].normal.z) > 0.9]
    _bevel_edges(bm, ring_edges, width=0.0015)
    bm.verts.ensure_lookup_table()
    # verre bombé : bague de sommets du dessus relevée de 1 mm
    zmax = max(v.co.z for v in verts)
    for v in verts:
        if v.co.z > zmax - 0.0022:
            v.co.z += 0.001
    # couronne à « 12 h » (+y), axe horizontal, 4 crans = 4 arêtes chanfreinées
    cv, _cf = _add_cylinder(bm, r=0.006, depth=0.010, segments=6,
                            loc=(0.0, 0.030, 0.008), axis="Y")
    crown_edges = [e for e in {e for v in cv for e in v.link_edges}
                   if len(e.link_faces) == 2 and
                  abs(e.link_faces[0].normal.y - e.link_faces[1].normal.y) > 0.5]
    _bevel_edges(bm, crown_edges[:4], width=0.002)
    # chaîne : bande plane de 8 segments courbée en S, posée sur le sol
    n = 8
    rows = []
    for j in range(n + 1):
        t = j / n
        x = 0.020 + 0.016 * t
        y = 0.026 + 0.006 * math.sin(t * math.pi * 2.0)
        rows.append([bm.verts.new((x, y - 0.004, 0.0012)),
                     bm.verts.new((x, y + 0.004, 0.0012))])
    for j in range(n):
        bm.faces.new((rows[j][0], rows[j][1], rows[j + 1][1], rows[j + 1][0]))
    return _finalize(bm, "watch", mat, ARCHES.index("watch"))


# --------------------------------------------------------------------------
# 7. prop_books — pile de trois livres (0,24×0,17×0,13 · 100–200 tris)
# --------------------------------------------------------------------------

def build_books(mat):
    """3 volumes (35–45 mm) chanfreinés 2 mm, du plus grand en bas au plus petit,
    rotations d'empilement 4° / −7° / 3° (absolues, emprise réduite pour rester
    sous le bbox cible), décalages 1–2 cm. ≈132 tris."""
    bm = _new_bm()
    specs = [
        # (sx, sy, sz, rot°, dx, dy)
        (0.225, 0.152, 0.045, 4.0, 0.000, 0.000),
        (0.210, 0.135, 0.040, -7.0, 0.012, 0.006),
        (0.198, 0.132, 0.038, 3.0, -0.009, -0.011),
    ]
    z = 0.0
    for (sx, sy, sz, rot, ox, oy) in specs:
        faces = _add_box(bm, sx, sy, sz, loc=(ox, oy, z + sz / 2.0), rot_z=rot)
        box_edges = {e for f in faces for e in f.edges}
        _bevel_edges(bm, box_edges, width=0.002)
        z += sz - 0.001
    return _finalize(bm, "books", mat, ARCHES.index("books"))


# Conteneur de la pile de documents (le build s'accumule entre feuilles)
bm_main_docstack = _new_bm()


# --------------------------------------------------------------------------
# Scène, auto-vérification, export
# --------------------------------------------------------------------------

def clear_scene():
    """Scène vide : plus aucun objet ni bloc de données orphelin. Unités métriques."""
    for ob in list(bpy.context.scene.objects):
        for coll in ob.users_collection:
            coll.objects.unlink(ob)
        bpy.data.objects.remove(ob, do_unlink=True)
    for table in (bpy.data.meshes, bpy.data.materials, bpy.data.images,
                  bpy.data.lights, bpy.data.cameras, bpy.data.armatures,
                  bpy.data.actions, bpy.data.node_groups):
        for block in list(table):
            if block.users == 0:
                table.remove(block)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0


def tris_of(obj):
    """Nombre de triangles tel que le compte l'audit : Σ(len(poly) − 2)."""
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


def measure(obj):
    """(dx, dy, dz, min_z) aux coordonnées locales (objet à l'identité)."""
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    zs = [v.co.z for v in obj.data.vertices]
    return (max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs), min(zs))


def check(objs):
    """Tableau par prop + portes dures : enveloppe, pivot min z = 0, tris,
    naming exact, 7 pile. Renvoie une liste de fautes."""
    fails = []
    print("prop            bbox L×P×H (m)      min z      tris  plage      cible        état")
    for key in ARCHES:
        name = "prop_" + key
        obj = bpy.data.objects.get(name)
        if obj is None or obj.name != name or obj.data.name != name:
            fails.append(f"{name}: nom de mesh/objet manquant ou inexact")
            continue
        if len(obj.users_collection) == 0:
            # l'OBJET doit être sous collection ; le maillage ne l'est jamais
            # directement (les collections ne linkent que des objets).
            fails.append(f"{name}: objet hors collection")
        dx, dy, dz, minz = measure(obj)
        tris = tris_of(obj)
        lo, hi = TRI_RANGE[key]
        tx, ty, tz = TARGET_BBOX[key]
        prob = []
        for d, m in ((dx, ENVELOPPE[0]), (dy, ENVELOPPE[1]), (dz, ENVELOPPE[2])):
            if d > m + 1e-4:
                prob.append(f"enveloppe dépassée ({d:.3f} > {m})")
                break
        if not prob:
            if abs(minz) > EPS_Z:
                prob.append(f"pivot: min z = {minz:.5f} ≠ 0")
            if not (lo <= tris <= hi):
                prob.append(f"{tris} tris hors plage {lo}–{hi}")
            if dx > tx + EPS_TARGET or dy > ty + EPS_TARGET or dz > tz + EPS_TARGET:
                prob.append(f"au-delà du bbox cible {tx}×{ty}×{tz}")
        for p in prob:
            fails.append(f"{name}: {p}")
        print(f"{name:<15} {dx:.3f}×{dy:.3f}×{dz:.3f}   {minz:+.5f}  {tris:4d}  "
              f"{lo}-{hi:<5} {tx}×{ty}×{tz:<6} {'FAIL: ' + '; '.join(prob) if prob else 'OK'}")
    extra = {o.name for o in bpy.context.scene.objects} - {"prop_" + a for a in ARCHES}
    if extra:
        fails.append(f"objets surnuméraires : {sorted(extra)}")
    if len(bpy.data.materials) != 1 or bpy.data.materials[0].name != MAT_NAME:
        fails.append("il faut exactement un matériau nommé M_props_atlas")
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and len(o.modifiers):
            fails.append(f"{o.name}: modificateurs non appliqués ({[m.name for m in o.modifiers]})")
    return fails


def export_glb(out_path):
    """GLB : les 7 props uniquement, modifiers appliqués, +Y up (défaut),
    matériaux et images embarqués."""
    bpy.ops.object.select_all(action="DESELECT")
    for key in ARCHES:
        obj = bpy.data.objects["prop_" + key]
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["prop_" + ARCHES[0]]
    bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB",
                              use_selection=True, export_yup=True,
                              export_apply=True, export_materials="EXPORT",
                              export_image_format="AUTO")


def parse_args(argv=None):
    """Args après le '--' de blender, sinon après le nom du script."""
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        for i, a in enumerate(argv):
            if a.endswith("gen_props_kit.py"):
                argv = argv[i + 1:]
                break
    out, atlas = "props-musee.glb", None
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
    if "--atlas" in argv:
        atlas = argv[argv.index("--atlas") + 1]
    # Chimie Blender : images.load/export résolvent les chemins RELATIFS contre le
    # .blend actif, pas le cwd du shell — tout absolutiser ici (cwd = répertoire de launch).
    import os
    out = os.path.abspath(os.path.expanduser(out))
    if atlas:
        atlas = os.path.abspath(os.path.expanduser(atlas))
    return out, atlas


def main(argv=None):
    global bm_main_docstack
    out_path, atlas_path = parse_args(argv)
    random.seed(7)                    # déterminisme : toutes les distributions
    bm_main_docstack = _new_bm()      # repartir propre même si main() est rappelé
    clear_scene()
    mat = _build_material(atlas_path)

    builders = {
        "docstack": build_docstack, "maproll": build_maproll,
        "radio": build_radio, "lantern": build_lantern,
        "letter": build_letter, "watch": build_watch, "books": build_books,
    }
    objs = [builders[k](mat) for k in ARCHES]

    fails = check(objs)
    export_glb(out_path)

    import os
    try:
        size = os.path.getsize(out_path)
        print(f"export : {out_path} ({size} octets)")
        if size > MAX_GLB_BYTES:
            fails.append(f"GLB {size} o > budget {MAX_GLB_BYTES} o")
    except OSError as exc:
        fails.append(f"export introuvable : {exc}")

    if fails:
        for f in fails:
            print("FAIL:", f)
        sys.exit(1)
    print("KIT OK — 7 props nommés, sous l'enveloppe, pivots au sol, tris dans les plages.")
    return 0


if __name__ == "__main__":
    main()
