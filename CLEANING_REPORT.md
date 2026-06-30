# CLEANING REPORT — V9

## Base
Version reprise depuis `stellarion_secure_clean_v8.zip`.

## Correctifs ajoutés

### Combat / attaque
- Ajout du module `STELLARION 1.5.91 — V9 combat report + loot failsafe final`.
- Le client ne dépend plus uniquement de l'ancien marqueur V7 `__serverCombatReportsV7`.
- Un rapport serveur n'est plus considéré comme traité si le message n'a pas réellement été créé.
- Si Supabase renvoie `attackerResourcesAfter`, le stock affiché est aligné sur le stock serveur exact.
- Si Supabase ne renvoie pas de rapport après l'arrivée de l'attaque, un fallback local unique crée le rapport et crédite le butin une seule fois.
- Protection anti double-crédit via `state.__combatLootCreditsV9`.
- Audit disponible : `stellarionV9CombatAudit1591()`.

### Edge Function `game-action`
- Conservation du crédit serveur à l'arrivée du combat.
- Nettoyage d'un update de ressources inutile quand un cargo retour est vide.

## Vérifications locales
- `node --check js/main.js` : OK.
- `tsc --noEmit` ne signale que les imports Deno/Supabase normaux hors environnement Supabase.

## Déploiement obligatoire
Après upload Vercel, redéployer aussi :

```bash
supabase functions deploy game-action
```
