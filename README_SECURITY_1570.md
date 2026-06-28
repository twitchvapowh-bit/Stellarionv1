# STELLARION — Patch sécurité serveur 1.5.70

## Ce que ce patch ajoute

Ce patch déplace les actions sensibles vers Supabase Edge Function `game-action`.

Le client navigateur ne doit plus être la source de vérité pour :

- ressources : titane, xénite, antimatière, fragments ;
- bâtiments ;
- files de construction ;
- vaisseaux ;
- files de formation ;
- flottes / missions ;
- accélérations premium.

Le navigateur affiche et demande. Le serveur vérifie et applique.

## Fichiers ajoutés / modifiés

- `js/main.js` : ajout du patch client `server-authority-1570`.
- `SUPABASE_SERVER_AUTHORITY_1570.sql` : tables canoniques + RLS + trigger anti-triche sur `player_saves`.
- `supabase_functions/game-action/index.ts` : Edge Function serveur autoritaire.
- `supabase_functions/claim-fragments.index.ts` : les fragments Stripe sont maintenant crédités dans `game_resources`.

## Ordre d'installation

1. Lance `SUPABASE_SERVER_AUTHORITY_1570.sql` dans Supabase SQL Editor.
2. Déploie l'Edge Function `game-action`.
3. Redéploie aussi `claim-fragments` avec la version fournie si tu utilises Stripe.
4. Remplace les fichiers du projet par ceux du ZIP.
5. Push sur GitHub / Vercel.
6. Recharge le jeu avec `Ctrl + F5`.

## Test console après déploiement

```js
await stellarionServerAuthorityBootstrap1570()
await stellarionServerAuthorityAudit1570()
```

Le résultat attendu :

```txt
booted: true
directClientWriteBlocked: true
lastError: null
```

## Important

La première connexion après le patch migre une seule fois l'ancien état client vers les tables serveur si `game_resources` est vide pour ce joueur.
Après ça, les tables serveur deviennent autoritaires.

`player_saves` reste utilisable pour l'UI et les préférences, mais le trigger SQL retire automatiquement les champs sensibles avant stockage.

## Limite honnête

Ce patch verrouille les actions centrales et empêche les sauvegardes client truquées de devenir persistantes.
Il ne remplace pas encore tout le game design combat par un simulateur MMO complet côté serveur. Les missions sont enregistrées côté serveur, les vaisseaux/cargos sont débités côté serveur, et le retour est traité côté serveur. Le combat avancé pourra être renforcé dans un patch suivant.
