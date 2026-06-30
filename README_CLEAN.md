# Stellarion secure clean V9

Version basée sur V8, avec correctif combat V9.

À déployer :

1. Vercel : déposer le contenu de cette archive.
2. Supabase : redéployer `supabase/functions/game-action/index.ts`.

Commande Supabase :

```bash
supabase functions deploy game-action
```

Audit navigateur après déploiement :

```js
stellarionV9CombatAudit1591()
```

Objectif V9 : ne plus laisser une attaque sans rapport ni crédit de butin.
