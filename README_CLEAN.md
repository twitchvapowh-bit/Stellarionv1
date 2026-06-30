# STELLARION Secure Clean V13

Version basée sur V12, avec correctif critique des coffres.

## À faire

1. Remplacer les fichiers du projet par ceux de cette archive.
2. Déployer la fonction Supabase :

```bash
supabase functions deploy game-action
```

3. Redéployer Vercel.
4. Tester l'ouverture de coffre.
5. En cas d'erreur, ouvrir la console et lancer :

```js
stellarionV13ChestAudit1594()
```

## Correction V13

L'ouverture des coffres ne dépend plus du traitement des attaques/flottes en attente. Une erreur combat ne peut plus bloquer un coffre.
