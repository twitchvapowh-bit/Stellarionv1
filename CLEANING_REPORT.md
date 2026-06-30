# Rapport de nettoyage Stellarion

## Fichiers exclus volontairement

- `.env.local` : contient une variable d'environnement locale, ne doit pas être partagé.
- `.vercel` / `repo.json` / fichiers de link local : utiles seulement sur ta machine, pas dans un paquet propre.
- Fichiers doublons numérotés : remplacés par une arborescence canonique.

## Doublons TypeScript supprimés

- `index(10).ts` et `index(12).ts` étaient identiques : conservé comme `supabase/functions/game-action/index.ts`.
- `index(11).ts` et `create-checkout.index.ts` étaient identiques : conservé comme `supabase/functions/create-checkout/index.ts`.
- `index(13).ts` et `claim-fragments.index.ts` étaient identiques : conservé comme `supabase/functions/claim-fragments/index.ts`.
- `index(14).ts` et `stripe-webhook.index.ts` étaient identiques : conservé comme `supabase/functions/stripe-webhook/index.ts`.

## Correctif JS appliqué

`stellarionCreditLootToActivePlanet` avait deux versions actives :

1. une fonction de base qui créditait `state.resources` puis `state.planetResources`,
2. une surcharge plus bas qui réécrivait `window.stellarionCreditLootToActivePlanet`.

La surcharge a été retirée. La fonction canonique crédite désormais :

- les ressources planétaires dans `state.planetResources[activePlanetId]`,
- les Fragments et Artefacts dans les ressources communes de l'empire,
- puis resynchronise `state.resources` avec la planète active.

## Note importante

Le fichier `main.js` contient encore des wrappers historiques autour de `render`, `setView`, `queueBuilding`, etc. Ils n'ont pas été supprimés automatiquement, car ils portent des correctifs UI actifs. Les supprimer à l'aveugle risquerait de casser la version qui fonctionne. Le nettoyage fait ici vise les doublons sûrs et le bug de crédit clairement identifié.


## Patch V2 — saisie clavier flotte

- Remplace la quantité figée `<b>` du popup de mission par un champ `<input type="number">`.
- Permet de taper directement `0`, `12`, `540`, etc. au clavier.
- Clamp automatique entre 0 et le nombre de vaisseaux disponibles.
- Mise à jour live des stats du popup sans re-render destructeur pendant la saisie.
- Le bouton Attaquer/Transférer se réactive automatiquement après saisie.

## V3 — Correctif final UI 1.5.85

- Ajout d'une couche CSS/JS finale `STELLARION HOTFIX 1.5.85`.
- Trajectoires galaxie : neutralisation des anciennes couches concurrentes et affichage d'une seule route stable, pleine, sans pointillés animés ni filtres lumineux responsables du scintillement.
- Alliance : garde finale sur `render()` et `rerenderPreserveScroll()` pendant la saisie, restauration du curseur, blocage des `blur()` programmatiques, et setters d'alliance non destructeurs pendant l'écriture.
- Audit disponible en console : `stellarionFinalUiAudit1585()`.
