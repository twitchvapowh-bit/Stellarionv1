# Stellarion secure clean V8 — rapport

Base: V7.

## Corrections V8 1.5.90

1. Crash `Maximum call stack size exceeded`
   - Cause: le garde `installRenderGuard1583()` recapturait des wrappers de `render()` installés après lui.
   - Effet: `guardedRender1583 -> renderWrap -> guardedRender1583 -> ...` en boucle infinie.
   - Correction: le garde ne recapture plus un wrapper déjà installé et ne remplace plus `render()` quand une couche plus récente est déjà active.

2. Butin d'attaque non ajouté au stock
   - Côté Supabase `game-action`: le résultat serveur contient maintenant `attackerResourcesAfter`, c'est-à-dire le stock exact après crédit du butin.
   - Côté client: si un rapport serveur contient ce stock exact, il est appliqué au stock affiché.
   - Côté client local/fallback: quand une attaque locale passe en retour avec `pendingLoot`, le butin est crédité immédiatement une seule fois, puis `pendingLoot` et `cargo` sont vidés pour empêcher le double crédit au retour.

3. Anti double-crédit
   - Ajout d'un registre `state.__attackLootCreditedV8`.
   - Les rapports locaux ne créditent pas directement dans `addMessage`; le crédit se fait par la flotte, pour éviter rapport + retour.

## Vérifications effectuées

- `node --check js/main.js`: OK.
- Recherche de la boucle `guardedRender1583/renderWrap`: correction appliquée dans `installRenderGuard1583()`.
- Vérification du bloc serveur `markFleetReturningAfterCombat()`: le stock exact après combat est renvoyé dans le payload.

## Déploiement obligatoire

- Vercel: redéployer le front V8.
- Supabase: redéployer `game-action`.

Commande Supabase:

```bash
supabase functions deploy game-action
```

Audit navigateur après déploiement:

```js
stellarionV8Audit1590()
```
