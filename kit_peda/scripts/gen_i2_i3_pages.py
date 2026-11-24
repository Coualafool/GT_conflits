#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Construit les pages variante I2 (corpus PDF seul) et I3 (fusion) depuis perspective-I-helice.html.
Transformations explicites, chaque ancre assertée (count==1) avant remplacement."""
from pathlib import Path

R = Path(__file__).resolve().parents[1]
SRC = (R / "frise" / "perspective-I-helice.html").read_text(encoding="utf-8")

def rep(s, old, new, n=1):
    c = s.count(old)
    assert c == n, f"ancre {c}x (attendu {n}): {old[:70]!r}"
    return s.replace(old, new)

def dynamic_legend_thses():
    # remplace le HTML statique keyrow/thèses par des conteneurs vides
    return None

# ============================================================ I2 : PDF seul =
p = SRC
p = rep(p, "<title>Frise — Variante I : l'Hélice des récits (tresse déroulée)</title>",
        "<title>Frise — Variante I² : la tresse de l'outil péda (corpus du document)</title>")
p = rep(p, '<span class="badgeI">Variante I</span>L\'Hélice des récits — la tresse déroulée',
        '<span class="badgeI">Variante I²</span>La tresse de l\'outil péda — le document déroulé')
p = rep(p, '<p class="sub">Le temps coule de haut en bas ; chaque récit est un brin tressé autour de lui — aucun brin au centre. Le lien qui traverse la tresse relie les versions d\'un même fait, doré quand les récits ne le nomment pas pareil. Un cercle pointillé sur un brin : un fait que ce récit se tait.</p>',
        '<p class="sub">Les quatre pistes de la frise du document « Outil péda n°5 », tressées comme la variante I : le temps coule de haut en bas, chaque piste est un brin. Un lien <b>doré</b> marque une lecture incertaine ([?]/[!]) conservée du document. Texte fidèle au PDF, coquilles comprises.</p>')
# keyrow statique -> 4 pistes dynamiques
p = rep(p, '''  <div id="keyrow" aria-label="Couleurs des trois récits">
    <span class="keyk" style="--kc:var(--pal)"><i></i>Récit palestinien <em id="key-pal"></em></span>
    <span class="keyk" style="--kc:var(--isr)"><i></i>Récit israélien <em id="key-isr"></em></span>
    <span class="keyk" style="--kc:var(--occ)"><i></i>Vue occidentale <em id="key-occ"></em></span>
  </div>''',
        '''  <div id="keyrow" aria-label="Couleurs des quatre pistes du document"></div>''')
# thèses statiques -> dynamiques
p = rep(p, '''    <div id="thses" aria-label="Les trois récits en une phrase">
      <div class="th th-pal"><span><b>Récit palestinien</b> — <span id="th-pal"></span></span><span class="cnt" id="cnt-pal"></span></div>
      <div class="th th-isr"><span><b>Récit israélien</b> — <span id="th-isr"></span></span><span class="cnt" id="cnt-isr"></span></div>
      <div class="th th-occ"><span><b>Vue occidentale</b> — <span id="th-occ"></span></span><span class="cnt" id="cnt-occ"></span></div>
    </div>''',
        '''    <div id="thses" aria-label="Les quatre pistes en une phrase"></div>''')
p = rep(p, '''      <span><span class="goldseg"></span>même fait, noms différents</span>''',
        '''      <span><span class="goldseg"></span>lecture incertaine ([?]/[!]) du document</span>''')
p = rep(p, 'aria-label="La tresse des trois récits, de 1895 à 2026.',
        'aria-label="La tresse des quatre pistes du document.')
# scripts sources
p = rep(p, '''<script src="poc-data.js"></script>
<script src="poc-perspectives.js"></script>''', '''<script src="perspective-I2-data.js"></script>''')
# classes de pistes : palette étendue (pal/isr/occ identiques au kit + ter)
p = rep(p, '.c3.l-pal{--lane:var(--pal);--lane-ink:var(--pal-ink)} .c3.l-isr{--lane:var(--isr);--lane-ink:var(--isr-ink)} .c3.l-occ{--lane:var(--occ);--lane-ink:var(--occ-ink)}',
        '''.c3.l-pal{--lane:var(--pal);--lane-ink:var(--pal-ink)} .c3.l-isr{--lane:var(--isr);--lane-ink:var(--isr-ink)} .c3.l-occ{--lane:var(--occ);--lane-ink:var(--occ-ink)} .c3.l-ter{--lane:#a06417;--lane-ink:#7c4d0e}
.vrow.p-ter{--lc:#7c4d0e} .th.th-ter{--lc:#7c4d0e}''')
# 4 brins : équitable 4 phases
p = rep(p, 'const TURN=15, PHI={occ:0,isr:2*Math.PI/3,pal:4*Math.PI/3};',
        'const TURN=15, PHI={}; PERS_KEYS.forEach((k,j)=>PHI[k]=j*2*Math.PI/PERS_KEYS.length);')
# thèses : rendu dynamique par piste
p = rep(p, 'for(const k of PERS_KEYS){$("#th-"+k).textContent=PERS[k].thesie;$("#cnt-"+k).textContent=nTold(k)+" dates";$("#key-"+k).textContent=nTold(k)+" dates";}',
        '''$("#thses").innerHTML=PERS_KEYS.map(k=>'<div class="th th-'+k+'" style="--lc:'+PERS[k].c+'"><span><b>'+escT(PERS[k].name)+'</b> — '+escT(PERS[k].thesie)+'</span><span class="cnt">'+nTold(k)+' dates</span></div>').join("");
$("#keyrow").innerHTML=PERS_KEYS.map(k=>'<span class="keyk" style="--kc:'+PERS[k].c+'"><i></i>'+escT(PERS[k].short)+' <em>'+nTold(k)+' dates</em></span>').join("");''')
# panneau : provenance document plutôt que back-link kit (pas de chapitre/séq dans ce corpus)
p = rep(p, '''  const ev=EV[i];
  $("#pYr").textContent=fmtY(ev[0])+" · chapitre "+ev[4];
  $("#pNt").textContent=ev[2];
  $("#pDesc").textContent=ev[3];
  const ks=PERS_KEYS.filter(k=>lvOf(i,k)>0);
  $("#pRows").innerHTML=ks.map(k=>{
    const l=lvOf(i,k);
    return '<div class="vrow p-'+k+'"><div class="vh"><i></i>'+PERS[k].name+
      '<span class="lvl">'+(l===2?"Central":"Second plan")+'</span></div><div class="vt">'+escT(titleOf(i,k))+"</div></div>";
  }).join("");
  const silNames=PERS_KEYS.filter(k=>lvOf(i,k)===0).map(k=>PERS[k].short);
  const msg=divergent(i)&&ks.length>1?"Même date, des noms différents — le lien est doré.":
    (ks.length===1?"Un seul récit porte cette date. Les deux autres se taisent.":"Les trois récits nomment cette date pareillement.");
  $("#pFoot").innerHTML=escT(msg)+(silNames.length?" · "+escT(silNames.join(" et "))+" ne raconte"+(silNames.length===1?" pas":"nt")+" ce fait.":"")+
    ' · <a href="../chapitres/chapitre-'+ev[4]+"-espace.html#s"+ev[5]+'">Ouvrir la séquence du kit →</a>';''',
        '''  const ev=EV[i];
  $("#pYr").textContent=fmtY(ev[0])+" · piste "+PERS[TRACK_KEYS[ev[1]]].name;
  $("#pNt").textContent=ev[2];
  $("#pDesc").textContent=ev[3]||"—";
  const k=TRACK_KEYS[ev[1]];
  $("#pRows").innerHTML='<div class="vrow p-'+k+'"><div class="vh"><i></i>'+PERS[k].name+
    '<span class="lvl">Piste du document</span></div><div class="vt">'+escT(ev[2])+"</div></div>";
  const msg=divergent(i)?"Lecture incertaine sur le document — les marques [?]/[!] sont conservées telles quelles.":
    "Transcription fidèle du document, coquilles comprises.";
  $("#pFoot").textContent=msg;''')
# légende neutre du panneau : contrat différent ici
p = rep(p, '<div class="neutral"><div class="nh">Le fait, tel que le kit le raconte</div>',
        '<div class="neutral"><div class="nh">Le fait, tel que le document l\'écrit</div>')
# atterrissage : premier amas dense du corpus PDF (1929)
p = rep(p, 'let j=0;while(j<EV.length&&EV[j][0]<1917)j++;', 'let j=0;while(j<EV.length&&EV[j][0]<1929)j++;')
(R / "frise" / "perspective-I2-pdf.html").write_text(p, encoding="utf-8")
print("écrit perspective-I2-pdf.html", len(p))

# ============================================================ I3 : fusion ==
q = SRC
q = rep(q, "<title>Frise — Variante I : l'Hélice des récits (tresse déroulée)</title>",
        "<title>Frise — Variante I⁺ : la tresse des récits, corpus élargi (kit + outil péda)</title>")
q = rep(q, '<span class="badgeI">Variante I</span>L\'Hélice des récits — la tresse déroulée',
        '<span class="badgeI">Variante I⁺</span>L\'Hélice des récits — corpus élargi')
q = rep(q, '''<p class="sub">Le temps coule de haut en bas ; chaque récit est un brin tressé autour de lui — aucun brin au centre. Le lien qui traverse la tresse relie les versions d\'un même fait, doré quand les récits ne le nomment pas pareil. Un cercle pointillé sur un brin : un fait que ce récit se tait.</p>''',
        '''<p class="sub">La tresse de la variante I, avec 53 faits ajoutés depuis la frise du document « Outil péda n°5 » (transcription fidèle, coquilles comprises) — sélection par récit par défaut selon la piste d\'origine du document. Ces faits ajoutés portent la mention « outil péda n°5 » dans le panneau.</p>''')
q = rep(q, '''<script src="poc-data.js"></script>
<script src="poc-perspectives.js"></script>''', '''<script src="perspective-I3-data.js"></script>''')
# I3 : PERS vient du module kit (PERS est redéfini dans perspective-I3-data.js ? non — on le réimporte pas ; le définir ici côté page)

# panneau : provenance « outil péda » pour les faits du PDF (src==1), back-link kit pour les faits du kit
q = rep(q, '''  $("#pYr").textContent=fmtY(ev[0])+" · chapitre "+ev[4];''',
        '''  $("#pYr").textContent=fmtY(ev[0])+(ev[6]===1?" · outil péda n°5":" · chapitre "+ev[4]);''')
q = rep(q, '''  $("#pFoot").innerHTML=escT(msg)+(silNames.length?" · "+escT(silNames.join(" et "))+" ne raconte"+(silNames.length===1?" pas":"nt")+" ce fait.":"")+
    ' · <a href="../chapitres/chapitre-'+ev[4]+"-espace.html#s"+ev[5]+'">Ouvrir la séquence du kit →</a>';''',
        '''  $("#pFoot").innerHTML=escT(msg)+(silNames.length?" · "+escT(silNames.join(" et "))+" ne raconte"+(silNames.length===1?" pas":"nt")+" ce fait.":"")+
    (ev[6]===1?" · <i>Fait ajouté depuis l'outil péda n°5 — texte fidèle au document.</i>":
      ' · <a href="../chapitres/chapitre-'+ev[4]+"-espace.html#s"+ev[5]+'">Ouvrir la séquence du kit →</a>');''')
DYN = '''for(const k of PERS_KEYS){$("#th-"+k).textContent=PERS[k].thesie;$("#cnt-"+k).textContent=nTold(k)+" dates";$("#key-"+k).textContent=nTold(k)+" dates";}'''
DYNJS = '''$("#thses").innerHTML=PERS_KEYS.map(k=>'<div class="th th-'+k+'"><span><b>'+escT(PERS[k].name)+'</b> — '+escT(PERS[k].thesie)+'</span><span class="cnt">'+nTold(k)+' dates</span></div>').join("");
$("#keyrow").innerHTML=PERS_KEYS.map(k=>'<span class="keyk" style="--kc:'+PERS[k].c+'"><i></i>'+escT(PERS[k].short)+' <em>'+nTold(k)+' dates</em></span>').join("");'''
q = rep(q, DYN, DYNJS)
q = rep(q, '''  <div id="keyrow" aria-label="Couleurs des trois récits">
    <span class="keyk" style="--kc:var(--pal)"><i></i>Récit palestinien <em id="key-pal"></em></span>
    <span class="keyk" style="--kc:var(--isr)"><i></i>Récit israélien <em id="key-isr"></em></span>
    <span class="keyk" style="--kc:var(--occ)"><i></i>Vue occidentale <em id="key-occ"></em></span>
  </div>''', '''  <div id="keyrow" aria-label="Couleurs des trois récits"></div>''')
q = rep(q, '''    <div id="thses" aria-label="Les trois récits en une phrase">
      <div class="th th-pal"><span><b>Récit palestinien</b> — <span id="th-pal"></span></span><span class="cnt" id="cnt-pal"></span></div>
      <div class="th th-isr"><span><b>Récit israélien</b> — <span id="th-isr"></span></span><span class="cnt" id="cnt-isr"></span></div>
      <div class="th th-occ"><span><b>Vue occidentale</b> — <span id="th-occ"></span></span><span class="cnt" id="cnt-occ"></span></div>
    </div>''', '''    <div id="thses" aria-label="Les trois récits en une phrase"></div>''')
(R / "frise" / "perspective-I3-fusion.html").write_text(q, encoding="utf-8")
print("écrit perspective-I3-fusion.html", len(q))
