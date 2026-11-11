# The Dunblane Quest — démo scénarisée (novembre 2026)

## Scénario jouable (source : « Scénario de la démo »)

1. Présentation du cataclysme, refuge à la WUA, quarante ans écoulés.
2. Rêve étrange de Kumji, réveil, contemplation du paysage, appel du directeur.
3. Exploration de l'aile des opérateurs : entrevue avec le directeur (père de Kumji).
4. Rejoindre Darla et Lyrius ; traverser la porte WUA.
5. Reconnaissance dans la plaine désolée : cellule de Flux, anomalie, combat.
6. Après le combat : Kumji voit au loin un démon qui protège quelque chose d'indiscernable.
7. Retour à la WUA : remise de la cellule à Lyrius et rapport au directeur ; fin de démo.

**La rencontre avec le démon reste volontairement mystérieuse.** La scène ne révèle pas ce qu'il protège, conformément au scénario. Aucun combat d'entraînement imposé : le combat de la démo est l'anomalie de la plaine.

## Système de combat (source : « Nouveau système de combat »)

- Attaque ordinaire : **1 Flux**.
- Magie / Canalisation : **2 Flux** (mages futurs : Astriar, Astriana, Layana).
- Limite : **3 Flux** (Coups foudroyants de Kumji, Mégatemps de Darla, Martial de Lyrius).
- Chimère : **6 Flux** (prévue pour une version ultérieure).
- Déplacement : **0 Flux**, sur cases, avec un budget de mouvement tactique de **3 points par cycle** (orthogonal 1, diagonal 2), choix de prototype.
- Production : **8 Flux maximum par cycle** ; la production continue par seconde et la pause tactique sont héritées du MVP précédent à titre d'expérimentation.

**Important :** Les noms des limites sont ceux du document. Faute de fiche Excel de compétences associée à ces nouveaux fichiers, leurs effets restent provisoires et ne sont pas présentés comme les capacités définitives. Les anciens tests d'amplification des attaques restent une compatibilité du moteur, mais l'interface de démo affiche les coûts fixes ci-dessus.

## Principes et limites

Logique métier en TypeScript pur, rendu isométrique KAPLAY pour l'exploration, DOM pour le combat et les dialogues. Les éléments graphiques sont des placeholders. Le combat de la démo utilise encore les modules et adversaires du MVP : la configuration finale sera affinée au playtest.

Le réseau automatique, la conversion de PV en Flux à défaut de réserve et la pause tactique restent présents, sous réserve d'équilibrage.

La CI doit vérifier `bun run test`, `bun run build` et `docker build` pour CapRover.
