# Stellarion secure clean V8

Version anti-crash et correction butin combat.

À utiliser à la place de V7.

## Important

Cette version contient une modification front (`js/main.js`) ET une modification Supabase (`supabase/functions/game-action/index.ts`).

Il faut donc:

```bash
supabase functions deploy game-action
```

puis redéployer le projet sur Vercel.

## Audit console

```js
stellarionV8Audit1590()
```

Ce test doit afficher:

- `patch: "v8-no-stack-combat-credit-1.5.90"`
- les ressources actuelles
- les flottes avec `pendingLoot` / `cargo`
- les crédits déjà appliqués pour éviter les doublons
