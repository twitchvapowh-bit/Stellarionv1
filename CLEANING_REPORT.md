# Rapport V7 — corrections vérifiées

## Butin d'attaque

Cause corrigée : les flottes cloud étaient encore parfois résolues par l'ancien `processFleets()` local. Le rapport affichait un butin côté navigateur, mais le stock cloud `game_resources` n'était pas crédité ou était ensuite ré-écrasé par Supabase.

Corrections :
- les flottes `serverAuthority` ne sont plus traitées par l'ancien moteur local ;
- la résolution d'attaque passe par `game-action` côté Supabase ;
- le résultat de combat serveur est stocké dans `payload.serverCombat` ;
- le butin affiché dans le rapport est immédiatement crédité dans `game_resources` côté serveur ;
- le cargo retour est volontairement remis à zéro pour éviter un double crédit ;
- le rapport client est généré depuis le résultat serveur, pas depuis une simulation locale ;
- correction de sécurité : si la capacité cargo est 0, aucun butin physique ne passe.

## Rotation planète / mode éco

Cause corrigée : les canvas `StellarionAtlasPlanet` de la colonne droite continuaient leur propre `requestAnimationFrame`, même quand le CSS stoppait certaines animations.

Corrections :
- en mode `eco`, les canvas de planète dans la colonne droite sont réellement arrêtés (`stop + draw static`) ;
- les orbites/apparats CSS de la colonne droite sont figés ;
- en quittant le mode éco, les canvas peuvent reprendre leur rendu.

## Vérifications locales

- `node --check js/main.js` : OK
- `tsc --noEmit ... game-action/index.ts` : seulement erreurs attendues d'environnement Deno/import URL, aucune erreur de syntaxe TypeScript locale.
