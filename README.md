# The Dunblane Quest — MVP jouable

Premier parcours vertical de **The Dunblane Quest** : RPG d'exploration 2D isométrique à l'esthétique 16 bits, avec des combats tactiques hybrides (temps réel et pause) utilisant le réseau de **Flux**.

Les graphismes sont volontairement provisoires (formes dessinées par KAPLAY).

## Démarrer

Prérequis : [Bun](https://bun.sh/), navigateur récent.

```bash
bun install
bun run dev
```

Ouvrir l'URL affichée par Vite (habituellement http://localhost:5173).

## Jouer

1. Depuis le titre, choisir **Commencer**.
2. Dans la cour de la WUA, approcher l'instructeur violet et appuyer sur **E** ou **Entrée**.
3. Dans le simulateur, désactiver l'émetteur adverse puis cliquer **Neutraliser**.
4. Dans la cour, rejoindre le portail doré pour sortir.
5. Dans les ruines, récupérer le cristal turquoise, puis approcher l'adversaire rouge.
6. En combat réel, désactiver **l'émetteur et le relais**, puis cliquer **Neutraliser**.
7. Après avoir confirmé la neutralisation, le combat se ferme automatiquement et vous revenez dans la zone précédente. Rejoindre ensuite le point d'extraction bleu pour lire le rapport WUA.

**Déplacements** : flèches ou ZQSD (une case par pression). **Interactions** : E, Entrée ou Espace.
**Combat : les actions demandent directement leur énergie au réseau.** La répartition manuelle (+1/+3) n'est plus obligatoire. Choisissez un personnage, une action et une cible : l'aperçu montre le coût et la chaîne d'alimentation choisie. Cliquez sur **Confirmer** pour exécuter. Le moteur puise d'abord dans la réserve de l'opérateur, ensuite chez les alliés connectés, enfin dans la cellule. Un relais intermédiaire peut être vide : il transmet l'énergie sans la consommer.

**Si la chaîne est rompue**, un lien orange apparaît et la prévisualisation explique pourquoi : distance entre deux unités, obstacle ou brouilleur. Les réserves déjà stockées permettent tout de même à une unité isolée de continuer à agir. Une action ne prélève jamais d'énergie lors de sa prévisualisation. Les unités conservent leurs réserves entre les cycles (9 Flux max par opérateur, 12 à la cellule).

**Simulation hybride** : le combat commence en pause tactique. **Espace** ou le bouton **▶ Lancer / ⏸ Pause** démarre ou suspend la simulation. Le générateur produit de l'énergie **chaque seconde** ; les ennemis se déplacent et réagissent **toutes les 3 secondes**. Les déplacements, impacts, réparations et recharges adverses apparaissent sur le terrain et dans un récapitulatif agrandi.

**Commandes clavier** : **1, 2, 3** pour Kumji, Darla, Lyrius ; **4 à 9** pour les actions contextuelles ; **flèches** ou **ZQSD** pour préparer un déplacement orthogonal ; **A/E/W/C** pour une diagonale ; **Entrée** pour confirmer ; **Espace** pour mettre en pause/reprendre. Les boutons +/− permettent d'ajuster la puissance des actions.

**Production et rôles** : la cellule intacte produit **2 Flux par seconde**, avec une réserve de 12. Lyrius peut investir 3 Flux pour augmenter durablement cette cadence de +1/seconde, jusqu'à +3 ; il peut aussi réparer. Darla protège la source ; Kumji frappe en fonction de la puissance dépensée. La barrière et le relais ennemis doivent être coupés avant de cibler directement le noyau, mais la neutralisation non létale reste possible.

**Retours audiovisuels** : des sons synthétiques peuvent être coupés par le bouton ♪. Un projectile animé indique les attaques, les PV restent visibles sur les unités, et le bouclier de Darla apparaît autour de la cellule lorsqu'il est actif. Une action peut être confirmée par **double-clic sur sa cible** après la première sélection, ou avec Entrée.

**Compétences spéciales** : Kumji possède une **frappe de rupture** à 6 Flux, Darla crée un **dôme protecteur** à 5 Flux, Lyrius déclenche une **impulsion EMP** à 5 Flux (draine les réserves ennemies et coupe les liaisons). Le **coupe-flux ordinaire** n'est plus un simple tir : il inflige peu de dégâts, mais retire l'énergie ennemie et perturbe sa recharge. La **neutralisation** met fin au combat sans détruire le générateur, lorsque les modules critiques sont neutralisés.

**Remise en service adverse** : une arme désactivée attend deux réactions ennemies avant qu'un relais puisse la réparer, puis une réaction supplémentaire pour la redémarrer. L'adversaire de mission possède également un éclaireur spécialisé mobile, différent du réseau du joueur.

**Terrain** : les déplacements diagonaux coûtent 2 Flux (1 en orthogonal). Les rochers bloquent mouvements et tirs, les couverts ▥ réduisent les dégâts, les brouilleurs ⌁ bloquent les transmissions. La cellule peut alimenter un allié directement à 4 cases ; les alliés relaient entre eux à 3 cases sans obstacle, ce qui étend la portée pratique du réseau.


## Vérifications

```bash
bun run test
bun run build
```

Les tests portent sur la logique métier : allocation, persistance des réserves, boost d'attaque, transfert, barrières du générateur adverse, réactions ennemies, distance, déplacements et sorties de combat.
La CI GitHub Actions exécute les tests et le build sur chaque PR.

## Structure

```text
src/
  game/            # Configuration KAPLAY et état de session
  scenes/title/    # Accueil
  features/
    combat/domain/ # Règles de Flux, modules, dégâts, IA, neutralisation
    combat/        # Interface de combat 2D
    exploration/   # Cartes, déplacements, projection 2:1
    dialogue/      # Dialogues scénarisés
    mission/       # Rapport WUA
  shared/ui/       # Conteneur DOM des interfaces
tests/             # Tests de logique métier
features/          # Scénarios Gherkin
docs/PROTOTYPE.md  # Périmètre, limites et prochaines itérations
```

**Architecture** : exploration et scènes rendues par KAPLAY ; interfaces de dialogue/combat/rapport en DOM ; calculs de combat en TypeScript pur et testables hors navigateur.

## Limites de cette tranche

- Deux cartes d'exploration très petites et deux combats prédéfinis (plateau tactique 13 × 7).
- Graphismes et animations non définitifs.
- Pas encore de sauvegarde, d'inventaire, de chimères, de monde ouvert ni de progression persistante.
- Déplacement case par case, clavier sur bureau ; commandes tactiles non implémentées.
- L'équilibrage, le ressenti et les transitions visuelles nécessiteront des tests de jeu.

Le document [docs/PROTOTYPE.md](docs/PROTOTYPE.md) conserve le périmètre et les étapes suivantes.
