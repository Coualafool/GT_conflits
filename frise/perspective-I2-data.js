// Corpus « outil péda n°5 » — module de données pur, seul corpus de la variante I2.
// Généré par scripts/gen_pdf_corpus.py depuis Ressources/EVENEMENTS-Outil peda Palestine_Israel-5.md — ne pas éditer à la main.
// EV : [année+mois/12, indice de piste 0..3, titre, description]. TRANSCRIPTION FIDÈLE du document (coquilles et marques [?]/[!] conservées).
const T_MIN=1888.54, T_MAX=2026.14;
const NOW=2024.54;
const TRACK_KEYS=["occ","pal","isr","ter"];
const TRACKS={
  occ:{key:"occ",name:"Influence occidentale / décisions de l'ONU",short:"Occidental",c:"#8a5a3c",cLight:"rgba(138,90,60,.10)",count:16},
  pal:{key:"pal",name:"Palestine / territoires palestiniens",short:"Palestinien",c:"#2e7d5b",cLight:"rgba(46,125,91,.10)",count:22},
  isr:{key:"isr",name:"Yichouv / Israël",short:"Israélien",c:"#2f6f9e",cLight:"rgba(47,111,158,.10)",count:26},
  ter:{key:"ter",name:"Le territoire",short:"Territoire",c:"#a06417",cLight:"rgba(160,100,23,.10)",count:15}
};
const ERAS=[{a:1888,b:1917,label:"Empires & promesses",c:"#6e6459"},{a:1917,b:1948,label:"Mandat & partages",c:"#8a6d3b"},{a:1948,b:1967,label:"Guerres & exils",c:"#3d6b8a"},{a:1967,b:1993,label:"Occupation & Intifadas",c:"#8a3d3d"},{a:1993,b:2005,label:"Oslo & effondrement",c:"#4d7a4d"},{a:2005,b:2023,label:"Blocus & lois",c:"#6b4d7a"},{a:2023,b:2026.1,label:"Guerre à Gaza",c:"#994d1a"}];
const ERAS_DOC={
  occ:[{a:1890.54,b:1901.21,label:"Empires & promesses",c:"#8a5a3c"},{a:1901.21,b:1911.87,label:"Mandat & partages",c:"#8a5a3c"},{a:1911.87,b:1922.56,label:"Diplomatie contestée",c:"#8a5a3c"}],
  pal:[{a:1929.54,b:1939.21,label:"Société & révoltes",c:"#2e7d5b"},{a:1939.21,b:1948.87,label:"Nakba & dépossessions",c:"#2e7d5b"},{a:1948.87,b:1958.56,label:"Intifadas & après",c:"#2e7d5b"}],
  isr:[{a:1964.54,b:1977.87,label:"Yichouv & migrations",c:"#2f6f9e"},{a:1977.87,b:1991.21,label:"État & guerres",c:"#2f6f9e"},{a:1991.21,b:2004.56,label:"Droite & territoire",c:"#2f6f9e"}],
  ter:[{a:2004.54,b:2011.21,label:"Dépendances & barrières",c:"#a06417"},{a:2011.21,b:2017.87,label:"Blocus & boucliers",c:"#a06417"},{a:2017.87,b:2024.56,label:"Lois & guerre",c:"#a06417"}]
};
const EV=[
  [1890.54,0,"naissance du sionisme",""],
  [1896.54,0,"Th. Herzl publie Der Judenstaat",""],
  [1897.54,0,"1er congrès sioniste de Bâle",""],
  [1898.04,0,"1ère Aliya",""],
  [1909.54,0,"la 1re ville exclusivement juive est créée : Tel Aviv",""],
  [1914.54,0,"la population palestinienne représente","5 % de Musulmans, 10 % de Chrétiens, 5 % de Juifs"],
  [1915.54,0,"le RU promet l'indépendance aux tribus arabes, dès le départ des Ottomans",""],
  [1916.54,0,"Première Guerre mondiale [libellé partiellement tronqué]",""],
  [1916.54,0,"accords Sykes-Picot","les Frs et le RU se partagent secrètement le M-O, malgré les promesses d'indépendance faites aux Arabes"],
  [1917.54,0,"le RU soutient l'établissement d'un foyer juif en","alestine, comme état tampon, solidaire des intérêts des Européens dans la région (déclaration Balfour)"],
  [1917.54,0,"Révolution bolchévique en","ussie – fuite de nombreux juifs"],
  [1920.54,0,"premières émeutes antisionistes",""],
  [1920.54,0,"Le Yichouv se dote d'institutions politiques","Knesset, gouvernement, force armée clandestine) + 1er syndicat"],
  [1920.54,0,"collecte de fonds pour le futur Israël (Londres)",""],
  [1920.54,0,"début des confrontations entre Juifs et Arabes [?]",""],
  [1922.54,0,"Palestine passe du contrôle ottoman à un mandat britannique attribué par la SDN",""],
  [1929.54,1,"émeutes anti-juives basées sur des fausses rumeurs complotistes",""],
  [1933.54,1,"Allemagne Nazi",""],
  [1933.54,1,"accords de Hoavaro [!] facilitant l'arrivée, notamment, en","alestine de 53.000 juifs allemands socioéco. aisés"],
  [1933.54,1,"nouvelle révolte anti-coloniale et anti-immigration juive : répression sévère",""],
  [1936.54,1,"Grande révolte Arabe anti-britannique et anti-juive",""],
  [1936.54,1,"accroissement de l'autosuffisance économique du Yichouv",""],
  [1937.54,1,"Plan Peel : 1er proposition britannique de partition de la","alestine mandataire en 3 zones (juive, arabe, sacrée). Refus des différents côtés"],
  [1938.54,1,"Nuit de Cristal",""],
  [1938.54,1,"conférence d'Évian",""],
  [1938.54,1,"nouvelle politique britannique pro-arabe pour la","alestine mandataire (Livre blanc)"],
  [1939.54,1,"L'opposition arabe anti-britannique est presque totalement anéantie",""],
  [1939.54,1,"Les arabes se voient notamment promettre l'indépendance à venir",""],
  [1939.54,1,"la population juive représentante [!] 30 % de la population palestinienne",""],
  [1947.54,1,"Plan de partage de la","alestine par l'ONU. Israël obtiendrait 57 % du territoire de la Palestine mandataire"],
  [1947.54,1,"Nakba (=catastrophe)","le nettoyage ethnique. 800.000 arabes sont chassés de leur terre par l'armée israélienne"],
  [1947.54,1,"effondrement de l'économie palestinienne",""],
  [1947.88,1,"début de la guerre dite d'indépendance [libellé partiellement tronqué]",""],
  [1948.54,1,"Indépendance d'Israël",""],
  [1949.54,1,"Israël prend le contrôle de","8 % du territoire de la Palestine mandataire dont la majeure partie de Jérusalem"],
  [1950.54,1,"loi du retour",""],
  [1950.88,1,"accueil de 500.000 juifs issus d'Europe et de pays arabes",""],
  [1958.54,1,"développement de résistance arabe","Souvent sous forme d'actions terroristes"],
  [1964.54,2,"création de l'OLP avec Yasser Arafat à sa tête",""],
  [1967.54,2,"Israël attaque l'Egypte","+Syrie et la Jordanie). En six jours, elle occupe Gaza, la Cisjordanie et le plateau du Golan et Jérusalem-Est (Guerre des Six jours)"],
  [1967.54,2,"l'ONU adopte la résolution","42 qui doit forcer Israël à quitter les 70.000 km² [unité incertaine sur le document] de territoires qu'elle occupe. Refus d'Israël"],
  [1967.54,2,"les pays arabes et l'OLP refusent de négociations avec Israël",""],
  [1972.54,2,"Attentat palestinien aux J.O. de Munich",""],
  [1973.54,2,"guerre dite du Ramadan / Kippour / d'Octobre","Israël se fait attaquer par l'Egypte et la Syrie. Tsahal parvient à repousser les belligérants [les trois libellés figurent sur le document]"],
  [1973.54,2,"accords de paix de Genève",""],
  [1974.54,2,"reconnaissance de l'OLP par l'ONU comme représentante de l'État palestinien",""],
  [1976.54,2,"la Pal. devient membre de la ligue des États arabes",""],
  [1978.54,2,"1er accord de paix de","amp David entre Israël et l'Egypte"],
  [1982.54,2,"affrontements violents entre les partisans de l'OLP et du Hamas : plus de 800 morts [!]",""],
  [1987.54,2,"nombreuses violences perpétrées à l'égard des","uifs dans la bande de Gaza et en Cisjordanie + émergence du Hamas comme faction politique islamiste"],
  [1987.54,2,"répression violente de la part de Tsahal",""],
  [1993.54,2,"Accords d'Oslo",""],
  [1995.54,2,"Accords d'Oslo II : les territoires palestiniens sont divisés en 3 zones",""],
  [1995.54,2,"Yasser Arafat accepte la partition temporaire de la Palestine en 3 zones [?]",""],
  [1995.54,2,"des factions palestiniennes hostiles aux accords multiplient les attentats",""],
  [1995.54,2,"Le gouvernement d'Yitzhak","abin reconnaît l'OLP comme représentante légitime du peuple palestinien [!]"],
  [1995.54,2,"Assassinat d'Yitzhak Rabin, par un juif extrémiste",""],
  [1996.54,2,"échec des mises en application des accords d'Oslo",""],
  [2000.54,2,"Visite controversée d'A. Sharon sur l'esplanade des Mosquées de Jérusalem",""],
  [2002.54,2,"construction d'un mur de sécurité",""],
  [2003.54,2,"nouvelle tentative d'un accord de paix","Genève), échec des négociations"],
  [2004.54,2,"Mort de Yasser Arafat, remplacé par Mahmoud Abbas",""],
  [2004.54,2,"évacuation des 21 colonies juives de peuplement implantées à Gaza et des","implantées en Cisjordanie après 38 ans d'occupation [date à vérifier : l'évacuation de Gaza est datée 2005 sur la frise voisine]"],
  [2004.54,2,"renforcement sécuritaire des frontières israéliennes, création de zones tampons, contrôle","des frontières et de l'espace maritime et aérien"],
  [2004.54,3,"Gaza est dépendante d'Israël en ce qui concerne l'eau, l'électricité et les moyens de communication",""],
  [2005.54,3,"Israël instaure un blocus sur","aza en représailles à l'arrivée du Hamas"],
  [2006.54,3,"Le Hamas remporte les élections à Gaza, tandis que le Fatah gère la Cisjordanie",""],
  [2006.54,3,"violents affrontements entre les partisans du","atah (ancien OLP [!]) et du Hamas"],
  [2009.54,3,"B. Netanyahou arrive au pouvoir","Encouragement de la colonisation"],
  [2011.54,3,"Dôme de fer, système antimissile",""],
  [2015.54,3,"Israël autorise le déploiement de la","G mobile en Cisjordanie après 10 ans de négociations. Décret mis en application en 2018"],
  [2017.54,3,"D. Trump annonce le déménagement de l'ambassade des USA de Tel Aviv vers Jérusalem",""],
  [2020.54,3,"nouvelle tentative d'un accord de paix","D. trump n'invite pas les Palestinien-nes à la négociation"],
  [2021.54,3,"nouvelle version de la loi spéciale - Israël - État national du peuple juif",""],
  [2021.54,3,"L'hébreu est officiellement reconnu comme la langue officielle [!] — « L'État considère le","développement de la colonisation juive comme une valeur nationale et s'efforce d'encourager et de promouvoir son établissement et sa consolidation »"],
  [2022.54,3,"B. Netanyahou est à la tête du gouvernement le plus à droite de l'histoire d'Israël",""],
  [2023.54,3,"1195 victimes israéliennes périssent dans l'attaque",""],
  [2023.79,3,"le Hamas conduit une série d'attaques meurtrières contre les citoyens et militaires israéliens",""],
  [2024.54,3,"« offensive punitive [?] »","près de 2023/2025) ; année « 2025 » seule, sans texte lisible [!]"]
];
const MONTHS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
function eraOfTrack(k,y){for(const e of ERAS_DOC[k]){if(y>=e.a&&y<e.b)return e;}return ERAS_DOC[k][ERAS_DOC[k].length-1];}
const PERS_KEYS=TRACK_KEYS;
const THSES={occ:"Des décisions prises d'en haut : promesses impériales, mandats, partages votés sans les concerné·es, puis une diplomatie dont les résolutions s'accumulent sans s'appliquer.",
 pal:"Une population déjà là : vie rurale et citadine, révoltes écrasées, expulsion de 1948, et une résistance qui cherche ses formes — soulèvement, droit, élections.",
 isr:"Une immigration et un État : fuir les persécutions, bâtir le Yichouv, faire la guerre, recevoir des vagues d'arrivées, et déplacer le pouvoir vers la droite.",
 ter:"Le sol d'abord : qui contrôle l'eau, le courant, les frontières, les colonies et les murs — la carte comme objet politique permanent."};
const PERS={}; for(const k of TRACK_KEYS){PERS[k]=Object.assign({thesie:THSES[k]},TRACKS[k]);}
function lvOf(i,k){return (EV[i][3]&&EV[i][3].length>3)?2:1;}
function titleOf(i,k){return EV[i][2];}
function divergent(i){return /\[[?!]\]/.test(EV[i][2]+" "+EV[i][3]);}
function nTold(k){let c=0;for(const e of EV)if(e[1]===TRACK_KEYS.indexOf(k))c++;return c;}
function pEvs(k){const out=[];for(let i=0;i<EV.length;i++)if(EV[i][1]===TRACK_KEYS.indexOf(k))out.push({i,l:2,ev:EV[i],t:EV[i][2]});return out;}
function eraOf(y){for(let i=0;i<ERAS.length;i++){if(y>=ERAS[i].a&&y<ERAS[i].b)return ERAS[i];}return ERAS[ERAS.length-1];}
function escAttr(s){return String(s).replace(/"/g,"&quot;");}
