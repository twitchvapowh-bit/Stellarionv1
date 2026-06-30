# Stellarion Secure Clean V6

Version nettoyée basée sur la V5, avec correctif du butin d'attaque.

## Correction principale

Les ressources gagnées en attaque sont maintenant ajoutées au stock :
- le serveur calcule le butin à l'arrivée de la flotte ;
- le butin voyage dans le cargo du retour ;
- au retour, `game_resources` est créditée ;
- le client affiche aussi correctement le crédit sur la planète de départ.

Audit console après déploiement :

```js
stellarionV6AttackLootAudit1588()
```

## Déploiement

Remplacer les fichiers du projet puis redéployer Vercel.
Redéployer aussi la Edge Function Supabase :

```bash
supabase functions deploy game-action
```
