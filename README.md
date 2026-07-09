# Stellarion

Projet MMO navigateur.

## Alpha 1.7.00-1.7.03 — Passe graphisme/UX (session du 8 juillet 2026)

Suite à l'audit équilibrage/code du 6 juillet, cette passe s'attaque au graphisme et à la
praticité de l'interface. Tout est additif : aucune fonction existante supprimée, aucune
donnée de sauvegarde touchée. Nouveaux fichiers, chargés après main.js :

- `js/patch_1700_ui_dialogs.js` — remplace les popups grises `alert()`/`confirm()` du
  navigateur par des modales stylées du jeu (`stAlert`, `stConfirm`), et donne enfin un
  vrai visuel (toasts empilés, auto-disparition) aux ~30 appels `toast()`/`addLog()` qui,
  jusqu'ici, se contentaient d'ajouter une ligne dans le journal sans jamais rien afficher
  à l'écran. Les ~9 appels `confirm()` de main.js ont été convertis en
  `await stConfirm(...)` dans la même session (fonctions passées en `async`, sans impact :
  tous ces appels viennent de boutons `onclick`, aucun code n'attendait de retour
  synchrone).
- `js/patch_1701_onboarding.js` — tutoriel de premières minutes pour les nouveaux comptes
  (aucun onboarding n'existait). Se déclenche via un signal posé dans `main.js` → `load()`
  au tout premier lancement d'un compte (aucune sauvegarde trouvée = empire neuf) ;
  rejouable à tout moment via le bouton "?" en bas de l'écran.
- ~~`js/patch_1702_icon_set.js`~~ — **retiré le 8 juillet 2026.** Remplaçait les emojis
  par des icônes SVG, mais scannait/mutait le DOM en boucle ; entrait en conflit avec le
  re-rendu de la barre de navigation toutes les secondes (`render()` + `tickV145`,
  `setInterval(...,1000)`), provoquant un clignotement/chevauchement visuel permanent.
  Supprimé plutôt que corrigé à la hâte : à refaire proprement plus tard en s'accrochant
  au cycle de rendu du jeu plutôt qu'en l'observant de l'extérieur.
- `js/patch_1703_sound.js` — sons d'interface courts et synthétisés (succès/erreur/
  avertissement, branchés sur les nouveaux toasts, pas sur chaque clic) + un bouton
  muet/son persistant. Pas de musique d'ambiance : ça demanderait un vrai morceau
  composé/licencié, pas quelque chose à générer.

## Alpha 1.7.04 — Allègement des boucles setInterval (8 juillet 2026, suite)

Après retour utilisateur ("trop d'actualisation en arrière-plan"), ralenti ~20 boucles
`setInterval` de `main.js` qui tournaient en continu entre 250 et 900 ms — pour la
plupart des systèmes de "trajectoires galaxie" superposés au fil des versions
(1537/1555/1558/1559/1560/1586/1587), plus quelques re-verrouillages défensifs
(`wrapProcessFleets`, `wrapLaunchMission`) et une horloge affichée à 250 ms. Chacun est
passé à 1000-3000 ms selon son rôle réel : rien n'est supprimé, juste moins fréquent.
Volontairement laissés intacts : la boucle de jeu réelle (production/construction/
flottes/ressources), `tickV145` et `incomingAttackInterval` (1000 ms, cœur du jeu), et
2 boucles déjà rares ou conditionnelles.

## Alpha 1.7.05 — Correction du scintillement omniprésent (8 juillet 2026, suite)

Cause racine identifiée : `render()` (fonction centrale du jeu, ~254 appels directs +
tick automatique) remplace l'intégralité du `innerHTML` de `#app` à chaque appel. Chaque
élément décoratif animé en CSS (orbites de planète, pulsations, rotations, "aura") est
donc détruit et recréé à chaque render, ce qui remet son animation à zéro à chaque fois —
d'où le scintillement visible sur toutes les pages. Réécrire `render()` pour qu'il ne
remplace que ce qui change serait une chirurgie lourde sur le cœur du moteur d'affichage,
trop risquée à faire à l'aveugle sur un jeu en production avec paiements réels (même
niveau de risque que la dette CSS ou la chaîne de wrappers sur `render()`, déjà signalées
et volontairement non touchées). `js/patch_1705_anim_continuity.js` corrige le symptôme
sans toucher à `render()` : dès qu'un élément animé apparaît dans le DOM, son
`animation-delay` est resynchronisé sur une horloge fixe pour qu'il reprenne l'animation
exactement où elle devrait en être, au lieu de repartir de zéro à chaque recréation.

## Alpha 1.7.06 — Scroll automatique sur la page Bâtiments (8 juillet 2026, suite)

`js/patch_1632_building_popup.js` embarquait son propre système de sauvegarde/
restauration du scroll (5 passes à délais fixes : 0/60/160/350/700ms), séparé et
indépendant de celui déjà intégré directement dans `render()` (main.js,
`restoreScrollState`, 1.6.10 à 1.6.46) qui fait ce travail pour **chaque** appel à
`render()`, `queueBuilding()` inclus. Les deux tournaient en même temps sur la page
Bâtiments, avec des instants de capture et des délais différents — et celui du patch
1632 ne s'arrêtait pas quand l'utilisateur reprenait la main sur le scroll (contrairement
à celui de `render()`), d'où les sauts de scroll signalés. Le doublon a été retiré ; le
mécanisme natif de `render()` couvre déjà ce cas correctement.

## Alpha 1.7.07 — Vraie cause du scroll automatique en continu (8 juillet 2026, suite)

Le retrait du doublon de `patch_1632` (1.7.06) n'a pas suffi : le scroll sautait encore,
en continu, même sans clic. Cause réelle trouvée dans le mécanisme natif de `render()`
(`restoreScrollState`, 1.6.44/1.6.46) : après un rendu, un `MutationObserver` surveille
`#center` pendant 900ms pour réappliquer la position de scroll si quelque chose bouge
entre-temps. Mais il réagissait à **n'importe quelle** mutation, y compris la barre de
progression de construction (`updateQueueTimers1583`, qui met à jour `style.width` chaque
seconde) — un simple pourcentage qui change, sans rapport avec le scroll. Comme des rendus
ont lieu assez souvent pour que cette fenêtre de 900ms soit quasiment toujours réarmée, le
symptôme redémarrait en boucle. Corrigé dans `main.js` : l'observateur ignore désormais les
mutations qui ne concernent que le style d'un élément `[data-progress]`.

## Alpha 1.7.08 — Scroll au lancement/fin de construction (8 juillet 2026, suite)

Après 1.7.07, le scroll sautait encore, mais seulement à deux moments précis : au clic sur
"AMÉLIORER" (lancement) et à la fin automatique d'une construction. Le jeu contient au
moins 6 systèmes de préservation de scroll différents accumulés au fil des versions ; un
helper dédié existait déjà (`rerenderPreserveScroll()`, capture le scroll, rend, restaure)
mais `queueBuilding()` et `tickV145()` appelaient `save()`/`render()` nus à la place,
comptant uniquement sur la protection interne de `render()` — insuffisante pour ce cas
précis. Les deux utilisent maintenant `rerenderPreserveScroll()`.

## Alpha 1.7.09 — Correction et vérification alliance (8 juillet 2026, suite)

Correction d'une conclusion précédente : la session avait signalé un risque de désynchronisation
Supabase sur "Quitter l'alliance". En vérifiant directement le schéma réel de la base (table
`alliance_members`, via l'outil Supabase connecté), il s'avère que la version de
`leaveAlliance` réellement active (la dernière chargée dans `main.js`, 1.5.69 "Correctif
final") gère déjà correctement le serveur : elle supprime uniquement la ligne d'appartenance
du joueur (`alliance_members`), ou dissout proprement l'alliance si c'est le fondateur qui
part. Les 5 autres définitions de `leaveAlliance` dans le fichier sont bien mortes (écrasées),
comme suspecté, mais n'affectent donc rien en pratique. En revanche cette version active ne
demandait jamais de confirmation avant d'agir - risqué pour un fondateur qui dissoudrait toute
son alliance d'un clic accidentel : une confirmation stylée (via `stConfirm`) a été ajoutée,
avec un message spécifique si la personne est fondatrice.

Vérifié aussi : aucun autre patch (`patch_1625_mobile.js`, `fragment-shop-stripe-patch.js`) ne
duplique le système de préservation de scroll de `render()` — leurs usages de scroll sont
spécifiques (zoom galaxie, carrousel boutique) et sans conflit.

Chantier volontairement non lancé dans cette session : la dette CSS (~6000 `!important`
dans `css/main.css`, accumulés par 5+ générations de patches mobiles superposés). Trop
risqué à corriger en un seul passage sur un jeu en production avec paiements réels — à
traiter séparément, de façon incrémentale et testée.

## Alpha 1.7.10 — La colonisation ne créait jamais de colonie (8 juillet 2026, suite)

Cause racine trouvée : depuis le passage du jeu en "server authority" (patchs 1.5.70 et
1.5.89), toutes les flottes des joueurs connectés sont lancées et résolues côté serveur
(`supabase/functions/game-action`), et le `processFleets()` local — le seul endroit du
code qui créait réellement une colonie (`state.planets.push(...)`) — n'est plus jamais
exécuté pour ces flottes (elles sont explicitement retirées de la liste passée à
`processFleets()` par le patch V7 "server combat authority", voir `main.js`). Le vaisseau
partait donc bien, la mission "colonize" arrivait bien à destination côté serveur... mais
`processQueues()` (côté serveur) traitait "colonize" exactement comme "explore" ou
"transfer" : la flotte repartait simplement à vide, sans qu'aucune ligne ne soit jamais
créée pour la nouvelle planète. Aucune erreur, aucun message : juste rien.

Corrigé des deux côtés :

- **Serveur** (`supabase/functions/game-action/index.ts`) : ajout de `resolveColonization()`,
  appelée à l'arrivée d'une flotte "colonize". Elle crée une ligne `game_buildings`
  (`command_center` niveau 1) pour la nouvelle planète, de façon idempotente (si la ligne
  existe déjà, ne fait rien — évite les doublons en cas de double traitement). Le nom/
  rareté/archétype de la planète sont recalculés avec exactement la même formule
  déterministe que côté client (`planetProfile()`, seed fixe basée sur le numéro du
  système) : aucune donnée supplémentaire à faire transiter, le résultat est garanti
  identique. Ajout aussi d'une vérification serveur qu'un vaisseau colon est bien présent
  dans la flotte (le client le vérifiait déjà, mais rien ne l'imposait côté serveur — un
  appel direct à l'API aurait pu contourner cette règle).
- **Client** (`main.js`, `applyServerState()`) : le serveur ne renvoyant que des lignes
  `game_buildings`/`game_ships` (pas d'objet "planète"), le client détecte désormais tout
  `planet_id` inconnu de `state.planets` et reconstruit localement sa fiche complète
  (nom, rareté, bonus, emplacements, coordonnées) avec les fonctions déjà existantes
  (`planetProfile()`, `reserveUniqueCoord()`), exactement comme le faisait l'ancien code
  local de colonisation.

Limite connue : les tentatives de colonisation lancées *avant* ce correctif ont consommé
leur vaisseau colon et leurs ressources sans jamais avoir créé de colonie récupérable
automatiquement — dis-moi si tu veux qu'on aille chercher dans les journaux serveur
(`game_security_audit`, `game_action_claims`) quels joueurs sont concernés pour leur
recréditer une colonie manuellement.

**Correctif de suivi (même jour) : le correctif ci-dessus n'avait jamais été déployé.**
Éditer `supabase/functions/game-action/index.ts` en local ne suffit pas : Supabase exécute
la version publiée sur son infrastructure tant qu'un déploiement explicite n'est pas fait.
La fonction tournait donc toujours en version 18 (sans `resolveColonization`) malgré le
correctif écrit. Déployée manuellement en version 19 via l'outil Supabase — vérifié après
coup que la version publiée contient bien `resolveColonization`/`colonize_success`.

## Alpha 1.7.11 — Colonisation drastiquement plus coûteuse (8 juillet 2026, suite)

Demande : la colonisation était trop simple à obtenir vu sa valeur (une planète de plus,
pour toujours). Coût du vaisseau colon (`colon_ship`) très augmenté, dans `js/main.js` et
`supabase/functions/game-action/index.ts` (les deux copies doivent rester identiques : le
serveur revalide indépendamment le coût de chaque vaisseau).

Coût final (après le multiplicateur ×5 déjà appliqué par le jeu à tous les vaisseaux) :

- Avant : 41 000 Titane · 22 000 Xénite · 1 150 Antimatière, 2h10 de construction.
- Après : 180 000 Titane · 100 000 Xénite · 30 000 Antimatière, 4h30 de construction.

Positionnement choisi : juste au-dessus du Porte-vaisseaux (l'unité "Élite" la plus chère
après le Mothership), avec un accent particulier sur l'antimatière (la ressource la plus
rare à produire) pour que fonder une colonie reste un vrai choix stratégique de milieu/fin
de partie plutôt qu'un achat anodin. Le Mothership reste l'unité la plus chère du jeu.

## Alpha 1.7.12 — Colonie affichée au mauvais endroit sur la carte empire (8 juillet 2026, suite)

Retour utilisateur : après colonisation, la nouvelle colonie apparaissait à un endroit de
la carte "empire" sans rapport avec le système réellement ciblé (ex : colonisation d'un
système donné, mais la colonie visible ailleurs, comme si une autre planète au hasard
avait été obtenue). Le nom restait correct (`<nom du système> Prime`, ex : "Aethar-111
Prime" pour une colonisation de "Aethar-111") mais la position semait la confusion.

Cause : le code de placement (`reserveUniqueCoord`, hérité tel quel de l'ancien système de
colonisation client) ancrait toujours la nouvelle colonie près de la planète *active* du
joueur, avec un décalage aléatoire (±8 sur une grille) — jamais aux coordonnées du système
ciblé. C'est un choix de conception déjà présent avant cette session (regrouper les
colonies près de son empire), mais combiné à un nom reprenant celui du système ciblé, le
résultat semblait aléatoire et incohérent.

Corrigé dans `main.js` (`applyServerState()`) : la colonie est maintenant ancrée sur les
coordonnées propres du système réellement colonisé (`sector`/`system`/`x`/`y` copiés
depuis `state.systems`), donc affichée au bon endroit sur la carte. Un correctif
rétroactif recalcule aussi, une seule fois, la position des colonies déjà fondées avant ce
correctif (marquées `__coordFixed1712` une fois corrigées, pour ne pas les re-décaler à
chaque rechargement).

## Alpha 1.7.13 — Ressources par planète + abandon de colonie (9 juillet 2026)

Retour utilisateur : après colonisation, la nouvelle colonie héritait instantanément de
tout le stock de titane/xénite/antimatière de la planète mère — un seul pool de
ressources était partagé par toutes les planètes du joueur. Demande explicite : stock
séparé par planète, et possibilité d'abandonner une colonie si on n'en veut plus.

Migration Supabase (`game_resources_per_planet_1712`) : la table `game_resources` passe
d'une clé `(player_id)` à `(player_id, planet_id)`. Chaque planète (mère + chaque colonie)
a maintenant son propre stock de titane/xénite/antimatière, alimenté uniquement par ses
propres bâtiments. Les FRAGMENTS (monnaie payée via Stripe) restent volontairement une
notion compte-large : toujours lus/écrits sur `planet_id="home"`, jamais fractionnés par
colonie — ce point a été traité avec une rigueur particulière puisqu'il touche aux
paiements réels.

Réécrit côté serveur (`game-action`, déployé v20) : accrual, achats, coffres, quêtes,
combats/pillage et retours de flotte utilisent tous désormais la bonne planète. Une
nouvelle colonie démarre à 0 ressource (elle n'a encore aucune mine). `claim-fragments`
(déployé v9) corrigé en préventif : il ciblait déjà `game_resources` sans filtrer par
planète, ce qui aurait cassé tout paiement Stripe dès qu'un joueur possède une colonie.

Nouvelle fonctionnalité : abandon de colonie. Un bouton "Abandonner cette colonie"
apparaît dans le panneau "Gestion rapide" de toute colonie (jamais sur la planète mère),
avec confirmation explicite avant l'action. Conséquence assumée : bâtiments, vaisseaux,
files de construction/formation et stock de la colonie sont définitivement perdus, sans
remboursement ni rapatriement vers la planète mère. Une flotte déjà en vol vers une
colonie abandonnée est automatiquement rapatriée vers la planète mère au lieu d'échouer.

## Alpha 1.7.14 — Impossible d'écrire dans Renommer/Relocaliser (9 juillet 2026, suite)

Retour utilisateur : dans le panneau de la colonie sur la carte Galaxie, impossible de
taper un nouveau nom de planète ou une position de relocalisation — le focus clavier ne
se posait jamais dans les champs.

Cause : `render()` reconstruit tout `#app.innerHTML` très fréquemment (files d'attente,
trajectoires de flotte), ce qui détruit et recrée l'input en cours d'édition. Un correctif
précédent (1.7.09) restaurait le focus après coup, mais quand `render()` est redéclenché
plusieurs fois par seconde, cette restauration peut elle-même être écrasée par l'appel
suivant : dans les faits, le champ ne gardait jamais le focus assez longtemps pour taper.

Corrigé plus radicalement : tant qu'un champ "Renommer la colonie" ou "Relocalisateur
galactique" a le focus, `render()` est sauté entièrement (aucune reconstruction du DOM ne
peut donc l'interrompre) ; les compteurs de ressources/files continuent d'être mis à jour
par ailleurs, sans passer par `render()`. Dès que le champ perd le focus, un rendu de
rattrapage s'exécute pour resynchroniser l'affichage.

## Alpha 1.7.15 — Le transfert de ressources inter-planètes ne fonctionnait pas du tout (9 juillet 2026, suite)

Retour utilisateur (à juste titre très mécontent) : dans le panneau "Logistique
inter-planètes" (Commandements), impossible de saisir une quantité de Titane/Xénite/
Antimatière — le champ repassait à 0 dès qu'on cliquait ailleurs — et le bouton "Envoyer
les ressources" ne faisait rien de durable.

Deux bugs cumulés :
1. Les champs de quantité n'avaient aucun `oninput` : rien ne mémorisait la valeur tapée
   nulle part, donc le moindre rafraîchissement de page (fréquent, comme pour le bug
   1.7.14 ci-dessus) la remettait à 0 telle qu'écrite en dur dans le template.
2. Plus grave : le bouton "Envoyer les ressources" ne faisait qu'une mutation locale de
   `state.planetResources`, sans jamais appeler le serveur. Comme `game_resources` (côté
   Supabase) fait autorité et resynchronise le client périodiquement, ce "transfert"
   fantôme était systématiquement effacé en silence à la synchro suivante.

Corrigé des deux côtés : nouvelle action serveur `transfer_resources` dans `game-action`
(déployée v21) qui déplace réellement titane/xénite/antimatière d'une planète à l'autre
dans `game_resources`, de façon atomique et après vérification que les deux planètes
appartiennent bien au joueur. Côté client, les champs de départ/destination/quantités
sont maintenant sauvegardés dans `state.transferDraft` (comme pour renommer/relocaliser)
et le bouton appelle ce nouveau point d'entrée serveur au lieu de mutations locales.

## Alpha 1.7.16 — Perte de ressources lors d'un transfert vers une colonie ancienne (9 juillet 2026, suite)

Retour utilisateur : "les ressources sont bien parties de la planète mère, mais elles ne
sont pas arrivées sur la planète où elles étaient censées arriver."

Cause racine : la fonction `transferResources()` ajoutée en 1.7.15 débite d'abord la
planète de départ (écriture persistée immédiatement) puis crédite la planète de
destination. Une colonie fondée AVANT la migration "ressources par planète" (1.7.13)
n'a jamais reçu de ligne `game_resources` — seule `resolveColonization()` en crée une,
et uniquement pour les colonies fondées après ce patch. Résultat : le débit de la
planète mère s'exécutait avec succès, puis le crédit vers la colonie plantait
(`resources_missing`), sans annulation du débit déjà écrit. Les ressources étaient donc
réellement détruites, pas juste "non affichées".

Diagnostic en base : 3 tentatives de transfert échouées, toutes vers la même colonie
(`sys_11`), confirmées par le journal d'audit — et confirmation qu'aucune autre action
consommatrice de ressources n'a eu lieu entre-temps.

Corrigé : `transferResources()` crée maintenant systématiquement (via `ensureResourceRow`)
la ligne `game_resources` des deux planètes concernées, à zéro si elle n'existe pas,
avant tout débit/crédit — déployé en v22. Un correctif immédiat a aussi été appliqué en
base pour créer la ligne manquante de `sys_11`. La restitution des ressources perdues
lors des 3 tentatives ratées est traitée séparément avec le joueur, faute de journal
exact des montants exacts demandés à chaque tentative.

## Alpha 1.5.45 — Messagerie destinataire

Ajout : champ destinataire avec répertoire/autocomplete des joueurs depuis la table Supabase `players`.

Pour que les messages soient réellement livrés entre joueurs, lancer `SUPABASE_MESSAGES_SETUP.sql` dans Supabase si la table `messages` n'existe pas encore.
Sans cette table, l'interface reste stable mais le message est seulement conservé localement avec un avertissement dans le journal.
