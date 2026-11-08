# The Dunblane Quest — cadrage du prototype

## Objectif

Construire une boucle jouable courte, sans design final, pour éprouver les mécaniques et la narration de la proposition d'adaptation de juillet 2026.

## Parcours cible

1. Départ à la WUA, avec Kumji et une séquence de formation.
2. Tutoriel du combat par réseaux de Flux.
3. Exploration isométrique d'une zone extérieure compacte.
4. Mission de reconnaissance/récupération et combat réel.
5. Rencontre d'un comportement adverse inattendu.
6. Rapport de mission WUA et premier indice de dissonance narrative.
7. Amélioration simple d'un opérateur ou d'un module.

## Mécaniques minimales

- Exploration 2D isométrique, interactions, collisions et transitions de scène.
- Dialogues courts avec portrait.
- Combat au tour par tour : trois opérateurs, trois modules par camp.
- Flux produit par tour, coûts d'entretien, allocation, redirection.
- Actions d'attaque, de défense, de réparation et de neutralisation.
- Ennemi capable de rediriger le Flux après la perte d'un module.
- Objectif de mission et critères de rapport.

## Hors périmètre

- Monde ouvert et reproduction intégrale des anciennes cartes.
- Graphismes ou animations définitifs.
- Toutes les chimères, reliques, compétences et personnages.
- Révélation complète sur la Citadelle.
- Architecture générique de quêtes et éditeurs de contenu.

## Ordre de construction

- **TDQ-01** — Retirer le mini-jeu, initialiser le socle (ce changement).
- **TDQ-02 à TDQ-04** — Préparer les conventions, tests/lint et navigation initiale.
- **TDQ-05 à TDQ-12** — Valider le combat par Flux de manière indépendante.
- **TDQ-13 à TDQ-18** — Valider l'exploration isométrique.
- **TDQ-19 à TDQ-24** — Assembler la mission jouable.
- **TDQ-25 à TDQ-29** — Sauvegarde, validation, habillage provisoire et publication.

## Principes de développement

- Un ticket = un comportement délimité, avec une validation explicite.
- Pas de mécanique hors scope, de refonte opportuniste ou d'ajout non demandé.
- Une logique métier pure, distincte du rendu KAPLAY, particulièrement pour le combat.
- Préférer des composants simples et des données de démonstration plutôt qu'une abstraction générale prématurée.
- Les scénarios Gherkin et les tests devront accompagner les mécaniques ajoutées.
- Conserver une application démarrable et un build valide à chaque étape.

Ce document décrit le **prototype prévu**, pas les fonctionnalités déjà implémentées.
