# Stellarion Secure Clean V12

Base: V11.

Correctif ajouté : ouverture des coffres sous autorité serveur.

- Les coffres ne débitent plus les fragments en local avant confirmation.
- Les ressources gagnées et les fragments consommés sont appliqués dans `game_resources` via `game-action`.
- Le client reçoit le stock exact confirmé serveur et met à jour l'affichage.
- Les récompenses cosmétiques/boosts restent traitées côté client après confirmation serveur.
- Ajout audit console : `stellarionV12ChestAudit1593()`.

Déploiement requis :

```bash
supabase functions deploy game-action
```

Puis redéployer Vercel avec les fichiers V12.
