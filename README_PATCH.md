# Stellarion — Cloud Only Final 1.5.69

Correctifs appliqués :

- suppression de l’autorité localStorage pour la progression joueur ;
- sauvegarde progression uniquement via `player_saves` Supabase ;
- correction alliance : plus aucun `chat_logs`, `members`, `bank`, `user_id` ou `founder` écrit dans `alliances` ;
- source de vérité alliance : `alliances` + `alliance_members` ;
- le créateur est automatiquement ajouté/réparé en membre `Fondateur` ;
- stabilisation du focus pendant la saisie ;
- réduction des boucles réseau `public_missions` trop agressives.

À faire avant déploiement : lancer `SUPABASE_CLOUD_ONLY_FINAL_1569.sql` dans Supabase SQL Editor.
