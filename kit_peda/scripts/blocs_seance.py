# -*- coding: utf-8 -*-
"""Bloc commun « séance » — outils de classe injectés dans les pages à accordéons.

Mode projection (P), plan latéral avec progression et reprise 📍, mode séance
(flèche ←/→), fiche élève (impression allégée), impression d'une séquence seule.
Le stockage (progression, marque-page) utilise localStorage sous le préfixe
« gtconflits-v1: » ; si le navigateur le refuse (contexte isolé), les outils
dégradent silencieusement sans persistance.
"""

SEANCE_BLOCK = r'''<!-- BEGIN commun:seance -->
<div class="seance-outils no-print" role="group" aria-label="Outils de séance">
  <button type="button" id="se-proj" aria-pressed="false" title="Mode projection : grands caractères (touche P)">📽️ Projection</button>
  <button type="button" id="se-plan" aria-pressed="false" title="Sommaire latéral, avec progression">🎯 Plan</button>
  <button type="button" id="se-seance" title="Une séquence à la fois, plein écran (← → naviguent, Échap sort)">▶ Mode séance</button>
  <button type="button" id="se-fiche" title="Imprime l’essentiel + l’activité + un cadre de notes pour les élèves">🎓 Fiche élève</button>
</div>
<aside class="se-plan no-print" id="se-plan-el" aria-label="Plan du chapitre"></aside>
<div class="se-strip no-print" id="se-strip" role="status"></div>
<div class="se-toast no-print" id="se-toast" role="status"></div>
<style>
  .seance-outils{position:fixed;left:16px;bottom:16px;z-index:9;display:flex;gap:8px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:8px;box-shadow:0 8px 28px rgba(0,0,0,.4)}
  .seance-outils button{font:inherit;font-size:13px;color:var(--ink);background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer}
  .seance-outils button:hover,.seance-outils button[aria-pressed="true"]{border-color:var(--brand)}
  button:focus-visible,a:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
  .se-plan{position:fixed;left:16px;bottom:74px;z-index:8;width:232px;max-height:60vh;overflow:auto;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:10px 12px;font-size:13px;display:none}
  .se-plan.on{display:block}
  .se-plan a{display:flex;gap:8px;align-items:baseline;color:var(--muted);text-decoration:none;padding:5px 6px;border-radius:8px;line-height:1.35}
  .se-plan a:hover{background:var(--panel-2);color:var(--ink)}
  .se-plan a .n{color:var(--faint);font-weight:700;flex:none}
  .se-plan .dot{flex:none;width:8px;height:8px;border-radius:50%;border:1px solid var(--faint);align-self:center}
  .se-plan a.fait .dot{background:var(--good);border-color:var(--good)}
  .se-plan a.cour .dot{background:var(--brand);border-color:var(--brand)}
  .se-plan a.bm::after{content:"📍";margin-left:auto;font-size:11px}
  .se-plan .barre{height:4px;border-radius:2px;background:var(--panel-2);margin:4px 2px 10px;overflow:hidden}
  .se-plan .barre i{display:block;height:100%;background:var(--good);transition:width .3s}
  @media (max-width:1300px){.se-plan{display:none!important}}
  body.se-proj{font-size:19.5px}
  body.se-proj .pied-commun{display:none}
  body.se-proj .wrap{padding-bottom:140px}
  .se-strip{position:fixed;top:0;left:0;right:0;z-index:10;display:none;align-items:center;gap:12px;justify-content:center;background:var(--panel);border-bottom:1px solid var(--border);padding:9px 16px;font-size:14px;color:var(--muted)}
  .se-strip b{color:var(--ink)}
  .se-strip button{font:inherit;font-size:15px;background:var(--panel-2);color:var(--ink);border:1px solid var(--border);border-radius:8px;padding:4px 12px;cursor:pointer}
  body.se-seance .se-strip{display:flex}
  body.se-seance .seance-outils,body.se-seance .se-plan{display:none}
  body.se-seance{padding-top:46px}
  .se-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:11;display:none;gap:10px;align-items:center;background:var(--panel);border:1px solid var(--brand);border-radius:12px;padding:10px 16px;font-size:14px;box-shadow:0 8px 28px rgba(0,0,0,.5)}
  .se-toast a{color:var(--accent);cursor:pointer}
  .se-bm,.se-fait,.se-impr{background:none;border:none;cursor:pointer;font-size:13px;color:var(--faint);padding:2px 5px;border-radius:6px}
  .se-bm:hover,.se-impr:hover{color:var(--brand)}
  .se-fait[aria-pressed="true"]{color:var(--good)}
  details.acc summary .seq-outils{margin-left:auto;display:inline-flex;gap:2px}
  @media print{
    body.se-impr-1 details.acc:not(.cible),body.se-impr-1 .wrap>h1,body.se-impr-1 .wrap>h2.s,body.se-impr-1 .headcard,body.se-impr-1 .lead,body.se-impr-1 .srcs{display:none!important}
    body.se-fiche details.acc .body>*{display:none}
    body.se-fiche details.acc .body>.essentiel,body.se-fiche details.acc .body>.se-activite,body.se-fiche details.acc .body>.se-lignes{display:block}
    body.se-fiche details.acc summary .seq-outils{display:none!important}
    body.se-fiche .srcs,body.se-fiche .headcard,body.se-fiche .lead,body.se-fiche .wrap>h1{display:none!important}
    body.se-fiche details.acc{page-break-inside:avoid;border:1px solid #999}
    .se-lignes{margin-top:14px;padding:10px 12px 0;border:1px dashed #999;min-height:150px;background:repeating-linear-gradient(transparent,transparent 27px,#bbb 27px,#bbb 28px)}
  }
</style>
<script>
(function(){
  "use strict";
  var page=(location.pathname.split("/").pop()||"page").replace(/\.html$/,"");
  var LS;
  try{localStorage.setItem("gt-test","1");localStorage.removeItem("gt-test");LS=localStorage;}
  catch(e){LS={getItem:function(){return null},setItem:function(){},removeItem:function(){}}}
  function jget(k,d){try{return JSON.parse(LS.getItem("gtconflits-v1:"+k)||JSON.stringify(d))}catch(e){return d}}
  function jset(k,v){try{LS.setItem("gtconflits-v1:"+k,JSON.stringify(v))}catch(e){}}
  var seqs=[].slice.call(document.querySelectorAll("details.acc[id]"));
  if(!seqs.length)return;
  var prog=jget("prog:"+page,{}), bm=jget("bm:"+page,null), courant=null;
  function titre(d){var t=d.querySelector("summary .t");return t?t.textContent.trim():d.id}
  function numero(d){var n=d.querySelector(".seq-num");return n?n.textContent.trim():""}
  /* --- outils par séquence : faite / marque-page / impression seule --- */
  seqs.forEach(function(d){
    var s=d.querySelector("summary");if(!s)return;
    var g=document.createElement("span");g.className="seq-outils";
    var f=document.createElement("button");f.type="button";f.className="se-fait";
    f.title="Marquer « faite » — suivi de progression";
    f.textContent=prog[d.id]?"✓":"○";f.setAttribute("aria-pressed",prog[d.id]?"true":"false");
    f.setAttribute("aria-label","Séquence "+numero(d)+" : marquer faite / à faire");
    f.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();
      if(prog[d.id]){delete prog[d.id]}else{prog[d.id]=new Date().toISOString()}
      jset("prog:"+page,prog);f.textContent=prog[d.id]?"✓":"○";
      f.setAttribute("aria-pressed",prog[d.id]?"true":"false");majPlan()});
    var b=document.createElement("button");b.type="button";b.className="se-bm";
    b.title="Marquer ici — à l’ouverture prochaine, propose de reprendre ici";b.textContent="📍";
    b.setAttribute("aria-label","Reprendre à la séquence "+numero(d));
    b.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();jset("bm:"+page,d.id);toast(d)});
    var p=document.createElement("button");p.type="button";p.className="se-impr";
    p.title="Imprimer / PDF : cette séquence seule";p.textContent="🖨";
    p.setAttribute("aria-label","Imprimer la séquence "+numero(d));
    p.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();imprimer1(d)});
    g.appendChild(f);g.appendChild(b);g.appendChild(p);s.appendChild(g);
  });
  /* --- plan latéral --- */
  var plan=document.getElementById("se-plan-el");
  function majPlan(){
    var n=0;plan.innerHTML="";
    var barre=document.createElement("div");barre.className="barre";
    var fill=document.createElement("i");barre.appendChild(fill);plan.appendChild(barre);
    seqs.forEach(function(d){
      if(prog[d.id])n++;
      var a=document.createElement("a");a.href="#"+d.id;a.dataset.id=d.id;
      var cls=[];if(prog[d.id])cls.push("fait");if(bm===d.id)cls.push("bm");if(courant===d)cls.push("cour");
      a.className=cls.join(" ");
      a.innerHTML='<span class="dot"></span><span class="n">'+numero(d)+"</span><span>"+titre(d)+"</span>";
      plan.appendChild(a)});
    fill.style.width=(100*n/seqs.length)+"%"}
  function suivre(){
    var y=window.scrollY+130,c=null;
    seqs.forEach(function(d){if(d.offsetTop<=y)c=d});
    if(c!==courant){courant=c;
      [].forEach.call(plan.querySelectorAll("a"),function(a){a.classList.toggle("cour",a.dataset.id===(c?c.id:""))})}}
  document.getElementById("se-plan").addEventListener("click",function(){
    var on=plan.classList.toggle("on");this.setAttribute("aria-pressed",on?"true":"false");majPlan();suivre()});
  setInterval(suivre,600);
  /* --- toast de reprise --- */
  var toastEl=document.getElementById("se-toast");
  function toast(d){
    toastEl.innerHTML="📍 Séance précédente : <b>Séq. "+numero(d)+" — "+titre(d)+"</b> · <a id=se-go>y aller</a> · <a id=se-x>fermer</a>";
    toastEl.style.display="flex";
    document.getElementById("se-go").onclick=function(){d.open=true;d.scrollIntoView()};
    document.getElementById("se-x").onclick=function(){toastEl.style.display="none"};
    setTimeout(function(){toastEl.style.display="none"},9000)}
  if(bm&&!location.hash){var d0=document.getElementById(bm);if(d0)setTimeout(function(){toast(d0)},700)}
  majPlan();
  /* --- mode projection --- */
  var proj=document.getElementById("se-proj");
  function toggleProj(){var on=document.body.classList.toggle("se-proj");proj.setAttribute("aria-pressed",on?"true":"false")}
  proj.addEventListener("click",toggleProj);
  /* --- mode séance (une séquence à la fois) --- */
  var strip=document.getElementById("se-strip"),cur=0,restaur=[];
  function stripMaj(){
    strip.innerHTML='<button id=se-prev type="button" aria-label="Séquence précédente">←</button><span>Séq. <b>'+(cur+1)+"/"+seqs.length+"</b> — <b>"+titre(seqs[cur])+'</b></span><button id=se-next type="button" aria-label="Séquence suivante">→</button><button id=se-quit type="button">Quitter (Échap)</button>';
    document.getElementById("se-prev").onclick=function(){aller(cur-1)};
    document.getElementById("se-next").onclick=function(){aller(cur+1)};
    document.getElementById("se-quit").onclick=finSeance}
  function aller(i){
    if(i<0||i>=seqs.length)return;
    seqs.forEach(function(d,j){d.open=(j===i);d.style.display=(j===i)?"":"none"});
    cur=i;stripMaj();window.scrollTo(0,0)}
  function debutSeance(){
    var wrap=document.querySelector(".wrap")||document.body;
    [].slice.call(wrap.children).forEach(function(c){restaur.push([c,c.style.display])});
    [].slice.call(wrap.children).forEach(function(c){
      if(!(c.tagName==="DETAILS"&&c.className.indexOf("acc")>=0))c.style.display="none"});
    document.body.classList.add("se-seance");
    var st=null;seqs.forEach(function(d){if(d.classList.contains("cour"))st=d});
    aller(st?seqs.indexOf(st):0)}
  function finSeance(){
    restaur.forEach(function(p){p[0].style.display=p[1]});restaur=[];
    seqs.forEach(function(d){d.style.display=""});
    document.body.classList.remove("se-seance");strip.innerHTML=""}
  document.getElementById("se-seance").addEventListener("click",debutSeance);
  /* --- fiche élève --- */
  function prepFiche(){
    [].forEach.call(document.querySelectorAll("details.acc .todo"),function(t){
      var b=t.querySelector("b");
      if(b&&/À travailler/.test(b.textContent))t.classList.add("se-activite")});
    [].forEach.call(document.querySelectorAll("details.acc"),function(d){
      if(d.querySelector(".se-lignes"))return;
      var v=document.createElement("div");v.className="se-lignes";
      (d.querySelector(".body")||d).appendChild(v)})}
  function finFiche(){
    document.body.classList.remove("se-fiche");
    [].forEach.call(document.querySelectorAll(".se-lignes"),function(v){v.remove()});
    [].forEach.call(document.querySelectorAll(".se-activite"),function(t){t.classList.remove("se-activite")})}
  document.getElementById("se-fiche").addEventListener("click",function(){
    prepFiche();document.body.classList.add("se-fiche");
    setTimeout(function(){window.print();setTimeout(finFiche,500)},80)});
  /* --- impression d'une séquence seule --- */
  function imprimer1(d){
    var ouv=seqs.map(function(x){return x.open});
    seqs.forEach(function(x){x.open=(x===d)});
    d.classList.add("cible");document.body.classList.add("se-impr-1");
    setTimeout(function(){window.print();setTimeout(function(){
      document.body.classList.remove("se-impr-1");d.classList.remove("cible");
      seqs.forEach(function(x,i){x.open=ouv[i]})},500)},80)}
  /* --- clavier : P projection ; flèches en mode séance --- */
  document.addEventListener("keydown",function(ev){
    var t=ev.target,tn=(t&&t.tagName||"").toLowerCase();
    if(tn==="input"||tn==="textarea"||(t&&t.isContentEditable))return;
    if(ev.metaKey||ev.ctrlKey||ev.altKey)return;
    if(document.body.classList.contains("se-seance")){
      if(ev.key==="ArrowRight"||ev.key===" "){ev.preventDefault();aller(cur+1)}
      else if(ev.key==="ArrowLeft"){ev.preventDefault();aller(cur-1)}
      else if(ev.key==="Escape"){finSeance()}
      return}
    if(ev.key.toLowerCase()==="p"){toggleProj()}});
})();
</script>
<!-- END commun:seance -->'''
