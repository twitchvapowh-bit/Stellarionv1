# Rapport V12

## Problème corrigé

À l'ouverture d'un coffre, l'ancien code faisait :

1. débit fragments local ;
2. crédit ressources local ;
3. `save()` ;
4. refresh/retour serveur ;
5. le serveur renvoyait l'ancien stock `game_resources`, donc l'affichage donnait l'impression d'une réinitialisation.

## Correction

- Ajout de l'action serveur `open_chest` dans `supabase/functions/game-action/index.ts`.
- Le serveur vérifie les fragments, tire les récompenses, débite/crédite `game_resources`, puis renvoie `stockAfter`.
- `openChest1525()` est passé en `async` et ne modifie plus les ressources localement avant confirmation Supabase.
- Historique des coffres conservé côté client après réponse serveur.
- Audit disponible : `stellarionV12ChestAudit1593()`.

## Vérification locale

- `node --check js/main.js` : OK.
- `tsc --noEmit` sur l'Edge Function ne remonte que les erreurs attendues hors environnement Deno/Supabase (`Deno` et import URL), pas d'erreur syntaxique liée au patch V12.
