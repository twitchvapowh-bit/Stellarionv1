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

Chantier volontairement non lancé dans cette session : la dette CSS (~6000 `!important`
dans `css/main.css`, accumulés par 5+ générations de patches mobiles superposés). Trop
risqué à corriger en un seul passage sur un jeu en production avec paiements réels — à
traiter séparément, de façon incrémentale et testée.

## Alpha 1.5.45 — Messagerie destinataire

Ajout : champ destinataire avec répertoire/autocomplete des joueurs depuis la table Supabase `players`.

Pour que les messages soient réellement livrés entre joueurs, lancer `SUPABASE_MESSAGES_SETUP.sql` dans Supabase si la table `messages` n'existe pas encore.
Sans cette table, l'interface reste stable mais le message est seulement conservé localement avec un avertissement dans le journal.
