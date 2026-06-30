# Stellarion — secure clean v7

Version basée sur la V6 stable, avec correction serveur du butin d'attaque et gouverneur éco des planètes.

À déployer :

1. Remplacer les fichiers Vercel par ceux de l'archive.
2. Redéployer l'Edge Function Supabase :
   ```bash
   supabase functions deploy game-action
   ```
3. Redéployer Vercel.

Audit console après déploiement :
```js
stellarionV7CombatEcoAudit1589()
```
