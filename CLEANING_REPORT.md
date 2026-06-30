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


## V4 — 2026-06-30
- Base reprise depuis `stellarion_secure_clean_v2`, car la V3 ajoutait un guard récursif autour de `render()`/`blur()`.
- Patch V3 1.5.85 non repris.
- Ajout du patch `STELLARION 1.5.86` : aucun override de `HTMLElement.prototype.blur`, aucun wrapper supplémentaire de `render()`.
- Trajectoire : suppression des `stroke-dasharray` et `drop-shadow`, masquage de la ligne `bg` concurrente, conservation d'une ligne unique `stellarion-route-full1583`.
- Alliance : les fonctions de saisie mettent à jour `state` sans re-render à chaque frappe.

## V5 — correction définitive trajectoire galaxie (1.5.87)

Cause racine trouvée : la V4 cachait la ligne native complète `line.bg` et comptait sur une ligne recréée après coup (`line.stellarion-route-full1583`). Or la couche SVG de mission est redessinée en continu avec `innerHTML`, ce qui supprimait cette ligne injectée entre deux passes de stabilisation. Résultat visible : le trait disparaissait puis réapparaissait pendant l'attaque ou le retour.

Correction V5 :
- `line.bg` redevient la ligne officielle complète de trajectoire ;
- `line.bg` est visible immédiatement à chaque frame, sans attendre une injection secondaire ;
- `line.stellarion-route-full1583` est masquée pour éviter une couche concurrente ;
- `.live` et `.tail` restent masquées pour éviter le scintillement/progression partielle ;
- ajout d'un audit console : `stellarionV5TrajectoryAudit1587()` ;
- vérification syntaxe : `node --check js/main.js` OK.
