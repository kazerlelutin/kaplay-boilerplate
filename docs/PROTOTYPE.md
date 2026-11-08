# The Dunblane Quest — MVP

## Tranche implémentée

- Écran de titre et retour au début.
- WUA : cour isométrique, instructeur, dialogue, accès conditionnel à la sortie.
- Simulation tactique : trois modules alliés et trois modules adverses, Flux limité.
- Extérieur : récupération d'un cristal, contact ennemi, déclenchement d'un second combat.
- Combat : attaque ciblée, coupe-flux, barrière, réparation, IA simple et neutralisation.
- Rapport WUA avec un décalage narratif après l'observation d'un habitant natif protégeant un petit.

Les éléments de rendu sont des placeholders 16 bits sans assets définitifs.

## Principes

1. Règles métier en TypeScript pur (notamment dans `features/combat/domain`).
2. KAPLAY gère le rendu isométrique et les scènes ; DOM gère les écrans et dialogues.
3. Aucun ajout de mécanique qui ne sert pas directement à la boucle MVP.
4. Chaque changement doit conserver `bun run test` et `bun run build`.

## Travaux suivants

- Valider le comportement réel des scènes dans un navigateur (clavier, interactions, lisibilité).
- Affiner Flux / coûts et intentions ennemies avec des playtests.
- Ajouter véritables sprites 16 bits, animations et sons.
- Améliorer navigation (mouvement continu ou cases avec interpolation) et interactions.
- Ajouter tests d'intégration et sauvegarde locale.
- Introduire la progression opérateur/modules et davantage de variété de missions.

## Hors MVP

Monde ouvert, carte complète, chimères avancées, reliques complexes, embranchements narratifs, révélation de la Citadelle-vaisseau.
