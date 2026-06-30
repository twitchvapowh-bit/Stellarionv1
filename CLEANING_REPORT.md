# Stellarion Secure Clean V6 — Rapport

Base reprise : V5 stable.

## Correctif V6 1.5.88

Problème corrigé : après une attaque, le rapport / trajet retour indiquait un butin, mais les ressources ne s'ajoutaient pas au stock.

Cause racine trouvée :
- côté serveur `game-action`, `processQueues()` passait une flotte d'attaque en `returning=true` avec le cargo d'origine ;
- pour une attaque, le cargo d'origine est vide ;
- donc au retour, `addResources()` recevait `{}` et `game_resources` n'était jamais créditée.

Corrections appliquées :
- `supabase/functions/game-action/index.ts` calcule maintenant un butin serveur à l'arrivée d'une attaque ;
- ce butin est stocké dans `game_fleets.cargo` pendant le retour ;
- au retour, le serveur crédite `game_resources` avec ce cargo ;
- côté client, le retour d'une flotte d'attaque sait aussi créditer `f.cargo` si `pendingLoot` est absent ;
- `stellarionCreditLootToActivePlanet()` accepte maintenant `{ planetId }` pour créditer la planète de départ, pas une planète active au hasard ;
- audit ajouté : `stellarionV6AttackLootAudit1588()`.

## Vérification

- `node --check js/main.js` : OK.

## Important déploiement

Il faut redéployer :
1. le front sur Vercel ;
2. la fonction Supabase `game-action`, car le correctif principal est côté serveur.
