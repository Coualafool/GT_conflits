// Les trois récits — module de données pur (pas de DOM, pas d'état).
// Le corpus factuel reste EV (poc-data.js, 93 événements, kit GT_conflits).
// Ce module ajoute, pour chaque récit, la SÉLECTION d'événements, les TITRES tels que
// chaque récit les nomme, et sa PÉRIODISATION. But pédagogique : montrer que les dates
// sont communes, les récits non. Aucune entrée ne contrefait un fait : seul le cadrage change.
// Niveaux par récit : 2 = central (le récit s'articule dessus), 1 = présent en second plan, 0 = hors du récit.

const PERS_KEYS=["pal","isr","occ"];
const PERS={
  pal:{key:"pal",name:"Récit palestinien",short:"Palestinien",c:"#2e7d5b",cLight:"rgba(46,125,91,.10)",
    thesie:"Un seul long dépossédement, commencé en 1917. Un peuple expulsé de sa terre en 1948, dispersé, puis placé sous occupation. Chaque date se relit depuis cette perte — et depuis les formes de la survie : soulèvements, droit, culture, l'État voulu comme réparation.",
    ombre:"Ce récit dit peu les persécutions subies en Europe, le lien juif millénaire à la terre, ni les divisions palestiniennes.",
    eras:[
      {a:1895,b:1917,label:"Fin ottomane",c:"#2e7d5b"},
      {a:1917,b:1948,label:"Mandat & dépossession",c:"#357f62"},
      {a:1948,b:1967,label:"L'exil",c:"#3d8268"},
      {a:1967,b:1987,label:"L'occupation",c:"#46856e"},
      {a:1987,b:1993,label:"L'Intifada",c:"#4e8874"},
      {a:1993,b:2007,label:"Oslo, paix volée",c:"#578b7a"},
      {a:2007,b:2023,label:"Blocus & colonies",c:"#608e80"},
      {a:2023,b:2028.7,label:"Annihilation & reconnaissance",c:"#689186"}]},
  isr:{key:"isr",name:"Récit israélien",short:"Israélien",c:"#2f6f9e",cLight:"rgba(47,111,158,.10)",
    thesie:"Un retour et une survie. Un peuple traqué en Europe — pogromes, affaire Dreyfus, Shoah — qui rebâtit sa souveraineté dans sa terre ancestrale, affronte des guerres de destruction et le terrorisme, et des partitions qu'on lui propose puis qu'on lui reproche. Chaque date se relit depuis cette sécurité toujours niée.",
    ombre:"Ce récit dit peu l'expulsion palestinienne de 1948, les torts de l'occupation, et les Israélien·nes qui contestent leur propre gouvernement.",
    eras:[
      {a:1895,b:1917,label:"Persécution & retour",c:"#2f6f9e"},
      {a:1917,b:1947,label:"Le foyer sous Mandat",c:"#3676a4"},
      {a:1947,b:1949,label:"Indépendance",c:"#3d7dab"},
      {a:1949,b:1967,label:"L'État encerclé",c:"#4384b1"},
      {a:1967,b:1977,label:"Terres & sécurité",c:"#4a8bb8"},
      {a:1977,b:1993,label:"De la droite à Oslo",c:"#5192be"},
      {a:1993,b:2005,label:"La paix manquée",c:"#5899c5"},
      {a:2005,b:2023,label:"Gaza & normalisation",c:"#60a0cb"},
      {a:2023,b:2028.7,label:"Guerre d'existence",c:"#67a7d2"}]},
  occ:{key:"occ",name:"Vue occidentale",short:"Occidental",c:"#8a5a3c",cLight:"rgba(138,90,60,.10)",
    thesie:"Une histoire de responsabilité puis de médiation. La culpabilité européenne après la Shoah, une décolonisation mal conduite, une alliance avec Israël, et depuis 1993 un « processus de paix » que l'Occident ne contrôle plus. Depuis 2023, ce récit de médiateur se fissure dans ses propres opinions publiques.",
    ombre:"Ce récit se croit témoin neutre alors qu'il arme, vote et négocie ; il découvre en 2023 qu'il n'est plus cru au Sud global.",
    eras:[
      {a:1895,b:1917,label:"Fin des empires",c:"#8a5a3c"},
      {a:1917,b:1945,label:"Mandats & guerres mondiales",c:"#916242"},
      {a:1945,b:1973,label:"Guerre froide & décolonisation",c:"#986a49"},
      {a:1973,b:1991,label:"Pétrole & diplomatie",c:"#a07250"},
      {a:1991,b:2003,label:"L’heure unipolaire",c:"#a77a57"},
      {a:2003,b:2023,label:"Impuissance & errance",c:"#ae825e"},
      {a:2023,b:2028.7,label:"Gaza & Occident divisé",c:"#b58a65"}]}
};

/* ---------- Sélection : [pal, isr, occ] pour chaque EV[i] (93 lignes, même ordre) ---------- */
const LV=[
  [1,2,1],[1,2,1],[2,0,1],[1,1,2],[2,2,2],[2,2,2],[2,1,1],[2,1,1],[2,2,1],[1,2,2], // 0-9
  [1,1,2],[1,1,1],[2,2,2],[2,2,2],[2,1,2],[2,1,1],[1,2,2],[0,1,2],[1,1,2],[2,0,1], // 10-19
  [2,2,0],[1,1,0],[1,1,0],[1,1,1],[1,2,2],[2,1,1],[2,2,2],[2,1,1],[2,1,1],[1,2,2], // 20-29
  [1,2,1],[1,2,1],[1,1,1],[2,2,2],[2,1,1],[2,2,2],[0,0,1],[2,0,0],[2,2,2],[1,2,1], // 30-39
  [2,0,1],[1,1,2],[1,1,2],[1,1,2],[1,1,2],[2,2,2],[1,1,1],[2,1,2],[2,2,2],[1,2,1], // 40-49
  [0,0,1],[1,1,0],[2,2,2],[2,1,1],[0,0,1],[2,2,2],[1,1,2],[1,1,2],[2,1,2],[2,1,1], // 50-59
  [2,2,2],[1,2,1],[2,2,2],[1,0,2],[2,2,2],[1,1,1],[1,0,1],[1,1,1],[2,1,1],[2,1,2], // 60-69
  [2,2,2],[2,1,1],[2,1,2],[1,1,1],[2,2,2],[2,1,2],[2,1,2],[1,0,1],[1,2,2],[2,1,2], // 70-79
  [2,2,1],[1,1,2],[2,2,2],[2,1,2],[2,2,2],[2,1,2],[2,1,2],[2,1,2],[2,1,2],[2,1,1], // 80-89
  [2,2,2],[2,1,1],[2,2,2]                                                          // 90-92
];

/* ---------- Titres : le même fait, nommé par chaque récit (défaut : titre neutre du kit) ---------- */
const REN={
  2:{pal:"Hussein-MacMahon — des promesses, déjà trahies"},
  3:{occ:"Sykes-Picot — l’Occident trace la carte"},
  4:{pal:"Balfour — « une promesse de celui qui n’a pas à celui qui n’a pas »",isr:"Balfour — la première reconnaissance internationale"},
  7:{pal:"La Grande Révolte — écrasée, mais fondatrice",isr:"1936 — la révolte arabe contre le Yichouv"},
  8:{isr:"Livre blanc — portes fermées pendant la Shoah"},
  9:{pal:"La Shoah — crime d’Europe, facture payée en Palestine"},
  11:{pal:"King David — un attentat contre le QG britannique",isr:"King David — l’underground déclare la guerre au Mandat"},
  12:{pal:"Le plan de partage — décidé sans les Palestinien·nes",isr:"Résolution 181 — l’État juif reconnu par le monde"},
  13:{pal:"La guerre qui détruit la société palestinienne",isr:"La guerre d’Indépendance",occ:"Fin du Mandat — la première guerre régionale"},
  14:{pal:"Al-Nakba — 700 000 expulsé·es",isr:"La fuite de 1948 — conséquence du refus arabe du partage",occ:"La Nakba — un problème de réfugiés pour sept décennies"},
  15:{pal:"Résolution 194 — le retour promis, jamais appliqué"},
  19:{pal:"L’UNRWA — le camp de réfugiés durable"},
  20:{pal:"Loi du retour — l’envers du miroir",isr:"Loi du retour — la loi fondatrice"},
  24:{pal:"Suez — la guerre de l’Égypte",isr:"Suez 1956 — l’alliance avec Paris et Londres",occ:"Suez — l’Empire britannique réduit à rien"},
  25:{pal:"L’OLP — la cause reprend ses propriétaires"},
  26:{pal:"L’occupation commence (juin 1967)",isr:"Les Six Jours — Jérusalem réunifiée",occ:"Juin 1967 — Israël occupe des territoires"},
  27:{pal:"Arafat — la réappropriation par la main"},
  29:{isr:"Kippour — la surprise et le choc",occ:"Kippour — le premier choc pétrolier"},
  30:{isr:"3379 — « le sionisme est un racisme » : la blessure fondatrice"},
  31:{isr:"1977 — la droite arrive au pouvoir"},
  33:{pal:"Camp David — la paix avec l’Égypte, sans les Palestinien·nes",isr:"La première paix arabe : l’Égypte reconnaît Israël"},
  35:{pal:"Beyrouth — puis Sabra et Chatila",isr:"1982 — chasser l’OLP du Liban, puis la commission d’enquête"},
  37:{pal:"Fès — le monde arabe promet enfin un État"},
  38:{pal:"La première Intifada — un peuple se soulève",isr:"La première Intifada — la violence de masse contre l’État"},
  40:{pal:"1988 — l’indépendance déclarée depuis Alger"},
  45:{pal:"Oslo — la reconnaissance sans la fin",isr:"Oslo — la main tendue à l’ennemi"},
  47:{pal:"Oslo II — le découpage « provisoire » qui reste"},
  48:{isr:"L’assassinat de Rabin — la paix tuée de l’intérieur"},
  52:{pal:"La seconde Intifada — le soulèvement contre l’occupation",isr:"Camp David refusé, puis les kamikazes",occ:"Le sommet manqué, puis la spirale"},
  55:{pal:"2002 — les villes réoccupées, le mur au milieu",isr:"Rempart — frapper les réseaux du terrorisme"},
  58:{pal:"Le mur condamné par la CIJ ; Arafat s’éteint"},
  59:{pal:"BDS — le boycott, modèle sud-africain assumé",occ:"Naissance du BDS"},
  60:{pal:"Le désengagement — et Gaza toujours assiégée",isr:"Le désengagement — quitter Gaza unilatéralement"},
  62:{pal:"Gaza sous blocus",isr:"Le blocus après le coup de force du Hamas"},
  64:{pal:"Plomb durci — 1 400 mort·es à Gaza",isr:"Plomb durci — le sud sous les roquettes : la riposte",occ:"Plomb durci — deux récits d’enquête irréconciliables"},
  69:{pal:"Un État reconnu par 138 voix"},
  70:{pal:"Gaza — 50 jours de guerre (2014)",isr:"Bordure protectrice — la guerre des tunnels"},
  72:{pal:"2334 — les colonies déclarées illégales"},
  74:{pal:"Jérusalem — la trahison américaine",isr:"Jérusalem — capitale éternelle et indivisible"},
  75:{pal:"Le droit au retour, écrasé à la barrière",isr:"Loi de l’État-nation — l’autodétermination juive"},
  78:{isr:"Les accords d’Abraham — la région normalise enfin"},
  79:{pal:"Le mot « apartheid » devient expert",occ:"« Apartheid » : le mot qui divise les experts"},
  80:{pal:"Cheikh Jarrah — Jérusalem se soulève",isr:"Guerre de mai — les roquettes sur nos villes"},
  82:{pal:"Octobre 7, puis la guerre sur Gaza",isr:"Le 7 octobre — le pire massacre de Juifs depuis la Shoah",occ:"Le 7 octobre — et deux ans qui divisent l’Occident"},
  83:{pal:"La Haye — enfin une cour",isr:"La Haye — le lawfare contre l’État"},
  85:{pal:"Le veto — Washington couvre, et bloque la reconnaissance",occ:"Le veto — l’Occident montre ses deux poids"},
  86:{pal:"La reconnaissance, par vagues",occ:"L’Europe se fracture sur la reconnaissance"},
  87:{pal:"La CIJ juge l’occupation illégale"},
  88:{isr:"Les mandats d’arrêt — le tabou brisé",pal:"Les mandats d’arrêt — le tabou brisé"},
  90:{pal:"Le cessez-le-feu — Gaza à reconstruire, comptes à rendre",isr:"10 octobre 2025 — les otages rentrent"}
};

/* ---------- Helpers (state/DOM appartient à chaque page) ---------- */
const LVKEY={pal:0,isr:1,occ:2};
function lvOf(i,k){return LV[i][LVKEY[k]];}
function titleOf(i,k){const r=REN[i];return (r&&r[k])||EV[i][2];}
function pEvs(k){const out=[];for(let i=0;i<EV.length;i++){const l=lvOf(i,k);if(l>0)out.push({i,l,ev:EV[i],t:titleOf(i,k)});}return out;}
function divergent(i){const s=new Set(PERS_KEYS.filter(k=>lvOf(i,k)>0).map(k=>titleOf(i,k)));return s.size>1;}
function nTold(k){let c=0;for(let i=0;i<EV.length;i++)if(lvOf(i,k)>0)c++;return c;}
