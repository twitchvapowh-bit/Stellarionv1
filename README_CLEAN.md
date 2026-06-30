# Stellarion — Secure Clean V1

Version nettoyée à partir de la version fonctionnelle envoyée.

## Ce qui a été sécurisé

- `.env.local` n'est pas inclus dans l'archive.
- Les fichiers de liaison locaux Vercel/Supabase ne sont pas inclus.
- `.gitignore` protège `.env`, `.env.*` et `.vercel`.
- Les secrets Stripe/Supabase restent attendus via variables d'environnement serveur.
- Les Edge Functions sont rangées avec un seul `index.ts` par fonction.

## Ce qui a été nettoyé

- Suppression des doublons de fichiers `index(10).ts`, `index(11).ts`, etc.
- Normalisation de l'arborescence : `index.html`, `css/main.css`, `js/main.js`.
- Correction du bug de crédit des récompenses : une seule source active pour `stellarionCreditLootToActivePlanet`.
- Suppression de l'ancienne surcharge `oldCredit1540` qui réécrivait la fonction de crédit plus bas dans `main.js`.

## Déploiement conseillé

1. Remplacer les fichiers du repo par cette arborescence.
2. Ne jamais commit `.env.local` ni `.vercel`.
3. Déployer les Edge Functions :
   - `game-action`
   - `claim-fragments`
   - `create-checkout`
   - `stripe-webhook`
4. Définir les secrets serveur côté Supabase/Vercel.
5. Tester : connexion, chargement cloud, alliance, quête `Réclamer`, rechargement page.


### V2
- Saisie clavier directe des quantités de vaisseaux dans le popup d'attaque/mission.

### V3 — UI stable

Cette version ajoute le correctif `1.5.85` : ligne de trajectoire galaxie non scintillante et protection renforcée des champs de saisie Alliance.
Audit console : `stellarionFinalUiAudit1585()`.
