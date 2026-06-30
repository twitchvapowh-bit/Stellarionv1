# STELLARION Secure Clean V13 — 1.5.94

## Correctif principal

La V12 rendait l'ouverture des coffres dépendante du traitement global `processQueues()` de `game-action`.
Conséquence : si une flotte/attaque en attente provoquait une erreur côté serveur, l'action `open_chest` échouait aussi. Résultat visible côté jeu : clic sur coffre = rien ne se passe.

## Corrections V13

- `open_chest` est isolé des erreurs de combat/flotte.
- Les files bâtiments/vaisseaux terminées restent traitées via `processQueuesSafeNoCombat()`.
- Les flottes/attaques ne sont plus traitées pendant l'ouverture d'un coffre.
- Le client ajoute un timeout de 12 secondes au lieu de laisser les boutons bloqués.
- Les erreurs sont maintenant visibles dans le journal et la console.
- Les boutons coffres se réactivent après erreur.
- Le stock final reste appliqué depuis Supabase (`stockAfter`).
- Aucun changement volontaire sur combat, rapports, trajectoires, focus alliance, quêtes ou planète.

## Déploiement obligatoire

Cette version modifie `supabase/functions/game-action/index.ts`.
Il faut donc redéployer Supabase :

```bash
supabase functions deploy game-action
```

Puis redéployer Vercel.

## Audits console

```js
stellarionV13ChestAudit1594()
stellarionV12ChestAudit1593()
stellarionV11CombatReportAudit1592()
```

## Vérifications locales

- `node --check js/main.js` : OK
- TypeScript local : uniquement erreurs attendues hors environnement Deno/Supabase (`Deno`, imports https://esm.sh)
