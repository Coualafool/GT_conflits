# -*- coding: utf-8 -*-
"""Bloc commun « glossaire » — infobulles sur les termes-clés du kit.

Le dictionnaire est embarqué dans le bloc (une seule source : ce fichier).
La correspondance est insensible à la casse et tolérante aux accents
(colonie/Colonie, sionisme/Sionisme) et au pluriel. Une seule occurrence
marquée par terme et par page, jamais dans les résumés d'accordéon ni
dans les encadrés de source. Les définitions suivent la règle des trois
étages : ce qui est établi d'un côté, ce qui est disputé signalé comme tel.

Pour ajouter un terme : l'ajouter au dictionnaire JS ci-dessous, réinjecter
(inject_common.py --only glossaire), et vérifier qu'il apparaît réellement
dans les pages (le texte d'un terme absent du kit ne produit rien).
"""

GLOSSAIRE_BLOCK = r'''<!-- BEGIN commun:glossaire -->
<div class="gl-infobulle no-print" id="gl-infobulle" role="tooltip"></div>
<style>
  .gl{border-bottom:1px dotted var(--brand);cursor:help}
  .gl-infobulle{position:absolute;z-index:12;max-width:340px;background:var(--panel);border:1px solid var(--brand);border-radius:10px;padding:10px 13px;font-size:13.5px;line-height:1.5;color:var(--ink);box-shadow:0 10px 32px rgba(0,0,0,.55);display:none}
  .gl-infobulle b{color:var(--brand);display:block;margin-bottom:3px}
  @media print{.gl{border-bottom:none}}
</style>
<script>
(function(){
  "use strict";
  var TERMES={
    "géopolitique":"Lire un territoire comme un rapport de forces&nbsp;: qui trace les frontières, contrôle les ressources, la circulation et les récits. Une paire de lunettes, pas une doctrine.",
    "antisémitisme":"Hostilité envers les Juifs en tant que groupe, héritée des stéréotypes religieux puis racialisée au XIXᵉ&nbsp;siècle. Sa définition contemporaine (IHRA), qui évoque Israël, est elle-même disputée.",
    "sionisme":"Mouvement né à la fin du XIXᵉ&nbsp;siècle (Herzl) visant un foyer national juif en Palestine&nbsp;; abouti à la fondation d'Israël en 1948. Pour les Palestiniens, le mot porte la dépossession.",
    "Nakba":"La «&nbsp;Catastrophe&nbsp;» en arabe&nbsp;: l'expulsion et la fuite d'environ 700&nbsp;000&nbsp;Palestiniens pendant la guerre de 1947-1949. Commémorée le 15 mai&nbsp;; longtemps niée par l'historiographie officielle israélienne.",
    "sumud":"«&nbsp;Persévérance&nbsp;» en arabe&nbsp;: rester sur sa terre, bâtir, cultiver malgré l'occupation. Forme de résistance civile, individuelle et collective.",
    "mandat":"Dispositif de la SDN (1920) confiant à une puissance européenne l'administration d'un territoire jusqu'à ce qu'il soit jugé «&nbsp;apte&nbsp;». La Grande-Bretagne reçoit celui de la Palestine (1920-1948).",
    "SDN":"Société des Nations (1920-1946), ancêtre de l'ONU, née de la Première Guerre mondiale et affaiblie par ses échecs des années 1930.",
    "ONU":"Organisation fondée en 1945 pour remplacer la SDN. Son Assemblée générale délibère&nbsp;; son Conseil de sécurité décide, sous la menace de cinq droits de veto.",
    "Conseil de sécurité":"Organe de l'ONU seul habilité à produire des résolutions contraignantes. Cinq membres permanents détiennent un veto&nbsp;: États-Unis, Russie, Chine, France, Royaume-Uni.",
    "Assemblée générale":"Parlement de l'ONU&nbsp;: un État, une voix. Ses résolutions ont un poids politique et symbolique fort, mais ne sont pas juridiquement contraignantes.",
    "résolution":"Décision écrite d'un organe de l'ONU. Contraignante quand le Conseil de sécurité l'adopte au titre du Chapitre&nbsp;VII de la Charte&nbsp;; recommandation sinon.",
    "CIJ":"Cour internationale de Justice (La Haye), organe judiciaire de l'ONU. Elle tranche les litiges entre États et rend des avis consultatifs — sans force de police pour les appliquer.",
    "CPI":"Cour pénale internationale (La Haye, 2002). Elle juge des individus pour génocide, crimes de guerre et crimes contre l'humanité. Ni Israël ni les États-Unis n'en sont États parties.",
    "droit international humanitaire":"Le droit de la guerre (conventions de Genève de 1949 et protocoles)&nbsp;: protéger civils, blessés, prisonniers. Il lie tous les belligérants, sans excuser l'adversaire.",
    "génocide":"En droit (convention de 1948)&nbsp;: actes commis dans l'intention de détruire, en tout ou partie, un groupe national, ethnique, racial ou religieux. L'intention spécifique est le nerf de la qualification juridique — donc de sa contestation.",
    "crime contre l'humanité":"Attaque généralisée ou systématique contre une population civile (meurtre, déportation, persécution…). Ne requiert pas l'intention de détruire le groupe, contrairement au génocide.",
    "nettoyage ethnique":"Rendre une zone homogène en chassant sa population. Le terme n'est pas une qualification pénale autonome en droit international&nbsp;; les actes relèvent des crimes contre l'humanité. Terme descriptif utile, dont l'absence de définition pénale autonome est un débat en soi.",
    "corpus separatum":"Le «&nbsp;corps séparé&nbsp;»&nbsp;: statut d'administration internationale prévu pour Jérusalem par le plan de partage de 1947. Jamais appliqué&nbsp;; le statut de la ville reste le point le plus disputé.",
    "ligne verte":"La ligne d'armistice de 1949 entre Israël et ses voisins, frontière de fait jusqu'en 1967. C'est la référence de ce kit&nbsp;: parler des «&nbsp;lignes de 1967&nbsp;», c'est parler d'elle.",
    "colonie":"Implantation civile israélienne dans les territoires occupés depuis 1967. La quasi-totalité de la communauté internationale (CIJ incluse) y voit une violation de l'article&nbsp;49 de la IVᵉ convention de Genève.",
    "annexion":"Intégration par un État d'un territoire extérieur dans sa souveraineté — interdite par la Charte de l'ONU. Israël a annexé Jérusalem-Est (1980) puis le Golan (1981)&nbsp;; ces annexions ne sont pas reconnues.",
    "occupation":"Situation où une armée exerce un contrôle effectif sur un territoire étranger (règlement de La Haye 1907&nbsp;; IVᵉ convention de Genève). Elle impose des devoirs envers la population occupée.",
    "blocus":"Encerclement d'un territoire pour en bloquer les entrées et sorties par mer, air ou terre. Celui de Gaza (2007-2025) n'est admis par certains juristes que sous sa forme navale, en conflit armé&nbsp;; la majorité le conteste.",
    "checkpoint":"Poste de contrôle israélien, fixe ou mobile, en Cisjordanie&nbsp;: franchissement et autorisations discrétionnaires. Instrument central de la restriction de la liberté de mouvement palestinienne.",
    "barrière de séparation":"Ouvrage de séparation construit par Israël à partir de 2002 pendant la seconde intifada, mur et clôture mêlés. Son tracé sur le territoire occupé a été jugé contraire au droit international par la CIJ en 2004.",
    "intifada":"«&nbsp;Soulèvement&nbsp;» en arabe. La première (1987-1993) et la seconde (2000-2005) désignent les grandes révoltes palestiniennes contre l'occupation israélienne.",
    "OLP":"Organisation de libération de la Palestine (1964), dirigée par Arafat de 1969 à 2004. Elle a reconnu Israël en 1993 et représente le peuple palestinien à l'ONU comme État observateur non membre.",
    "Autorité palestinienne":"Entité d'autonomie créée en 1994 (accords d'Oslo), compétente de façon limitée dans les zones A et B de Cisjordanie. Affaiblie et contestée de toutes parts — jusque dans ses propres sondages.",
    "Hamas":"Mouvement palestinien fondé en 1987, issu des Frères musulmans&nbsp;; vainqueur des législatives de 2006, au pouvoir à Gaza depuis. Considéré comme organisation terroriste par les États-Unis, l'UE et d'autres — qualification qui ne fait pas l'unanimité du droit.",
    "UNRWA":"Office de l'ONU pour les réfugiés palestiniens (1949)&nbsp;: écoles, santé, aide pour quelque 6&nbsp;millions de réfugiés enregistrés. Le vote sur son mandat est un moment politique récurrent.",
    "droit au retour":"Droit des réfugiés à rentrer dans leur pays, admis en principe par la résolution&nbsp;194 de l'ONU (1948). Son application concrète à la Palestine donne lieu à des interprétations irréconciliables.",
    "accords d'Abraham":"Accords de normalisation signés en 2020 par Israël avec les Émirats arabes unis, Bahreïn, le Maroc et le Soudan, sous médiation américaine&nbsp;; conclus sans avancée sur l'État palestinien.",
    "BDS":"Mouvement Boycott, Désinvestissement, Sanctions lancé en 2005 par des organisations de la société civile palestinienne, inspiré de la lutte contre l'apartheid. Qualifié d'antisémite par ses adversaires&nbsp;; ses promoteurs le contestent.",
    "accords d'Oslo":"Accords de 1993-1995 créant l'Autorité palestinienne et le découpage de la Cisjordanie en zones A, B et C. Le statut final devait être négocié&nbsp;; il ne l'a jamais été. Processus intérimaire devenu permanent.",
    "zone C":"Les 60&nbsp;% de la Cisjordanie sous contrôle civil et sécuritaire israélien complet (accords d'Oslo). La construction palestinienne y est quasi impossible&nbsp;; les colonies y sont concentrées.",
    "statut de Jérusalem":"Question de souveraineté sur Jérusalem, revendiquée «&nbsp;entière&nbsp;» par Israël et comme capitale par les Palestiniens pour la partie est. Aucune reconnaissance internationale de la souveraineté israélienne sur la ville tout entière."
  };
  var ACCENTS={a:"aàâ",e:"eéèêë",i:"iîï",o:"oô",u:"uûù",c:"cç",n:"n",y:"y"};
  function motif(t){
    var out="",i,ch;
    for(i=0;i<t.length;i++){ch=t.charAt(i).toLowerCase();
      if(ACCENTS[ch])out+="["+ACCENTS[ch]+"]";
      else if(/[a-z]/.test(ch))out+=ch;
      else if(ch===" ")out+="[\\s\\u00a0]";
      else if(ch==="'"||ch==="’")out+="['\\u2019]";
      else out+="\\"+ch}
    return out+"s?"}
  var bulle=document.getElementById("gl-infobulle");
  var marks={},walker;
  function noeudsOk(n){
    var p=n.parentElement;
    return p&&!p.closest("summary,.gl,.src,.srcs,script,style,.gl-infobulle,.seq-outils")&&
           (p.closest(".body,.lead,.wrap"))}
  function marquer(){
    for(var terme in TERMES){
      if(marks[terme])continue;
      var rx=new RegExp("(^|[\\s(«:;—])("+motif(terme)+")(?![a-zàâçéèêëîïôûù])","i");
      var w=document.createTreeWalker(document.querySelector(".wrap")||document.body,NodeFilter.SHOW_TEXT,null);
      var n,found=false;
      while((n=w.nextNode())){
        if(!noeudsOk(n)||n.nodeValue.length<4)continue;
        var m=rx.exec(n.nodeValue);
        if(!m)continue;
        var debut=m.index+m[1].length,len=m[2].length;
        var span=document.createElement("span");span.className="gl";span.tabIndex=0;
        var apres=n.splitText(debut);
        apres.splitText(len);
        n.parentNode.replaceChild(span,apres);
        span.appendChild(apres);
        span.dataset.def=TERMES[terme];span.dataset.term=m[2];
        marks[terme]=1;found=true;break}}
  }
  marquer();
  function montre(el){
    var r=el.getBoundingClientRect();
    bulle.innerHTML="<b>"+el.dataset.term+"</b>"+el.dataset.def;
    bulle.style.display="block";
    var x=r.left+window.scrollX,y=r.bottom+window.scrollY+8;
    bulle.style.left="0px";bulle.style.top="0px";
    var bw=bulle.offsetWidth;
    x=Math.max(8,Math.min(x,window.scrollX+document.documentElement.clientWidth-bw-12));
    bulle.style.left=x+"px";bulle.style.top=y+"px"}
  function cache(){bulle.style.display="none"}
  document.addEventListener("mouseover",function(ev){var g=ev.target.closest&&ev.target.closest(".gl");if(g)montre(g)});
  document.addEventListener("mouseout",function(ev){if(ev.target.closest&&ev.target.closest(".gl"))cache()});
  document.addEventListener("focusin",function(ev){var g=ev.target.closest&&ev.target.closest(".gl");if(g)montre(g)});
  document.addEventListener("focusout",function(ev){if(ev.target.closest&&ev.target.closest(".gl"))cache()});
  document.addEventListener("click",function(ev){var g=ev.target.closest&&ev.target.closest(".gl");if(g){montre(g)}else cache()});
  document.addEventListener("keydown",function(ev){if(ev.key==="Escape")cache()});
  window.addEventListener("scroll",cache,{passive:true});
})();
</script>
<!-- END commun:glossaire -->'''
