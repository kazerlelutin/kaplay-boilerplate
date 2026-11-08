# The Dunblane Quest — MVP jouable

Premier parcours vertical de **The Dunblane Quest** : RPG d'exploration 2D isométrique à l'esthétique 16 bits, avec des combats tactiques au tour par tour par **Flux**.

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
**Combat** : chaque tour commence par la **distribution du Flux**. Cliquez sur +1 ou +3 près de Kumji, Darla ou Lyrius. La cellule conserve le reste. Ensuite, choisissez **Passer aux actions**.

Sélectionnez le personnage sur le terrain, choisissez une commande et, si besoin, sa cible. Le bouton ± ajuste la **puissance de 2 à 6 Flux** : plus vous dépensez, plus l'attaque ou le bouclier est efficace. **Confirmer** applique l'action, montre un effet au-dessus du module et une ligne de résultat. Vous pouvez revenir à la distribution ou transférer du Flux directement entre deux personnages (portée 3 cases).

**La réserve est persistante** : chaque opérateur peut cumuler jusqu'à 9 Flux, la cellule jusqu'à 12, sans perdre les points non dépensés lors du passage au tour suivant. Au début de chaque tour, la production de la cellule est ajoutée à sa réserve (9 si intacte, moins 1 par PV perdu), moins l'entretien des modules encore actifs (1 par module). La production excédant la capacité est perdue.

**Darla protège la source** lorsqu'elle se trouve à deux cases ou moins ; son bouclier actif utilise son Flux personnel pour renforcer la protection. **Lyrius répare** les modules ou la source en utilisant le Flux de sa réserve. **Kumji attaque** avec sa réserve et peut amplifier les dégâts. Le coupe-flux de Lyrius endommage les modules et retire du Flux stocké chez l'adversaire.

**L'ennemi utilise aussi le Flux** : il se réapprovisionne, attaque la cellule et tente de réparer l'émetteur grâce à son relais. Son propre générateur est attaquable, mais **l'écran ET le relais doivent d'abord être désactivés**. Vous pouvez aussi terminer le combat sans détruire le générateur grâce à la neutralisation. Les intentions ennemies, les dépenses d'énergie et les dégâts sont affichés sur le terrain et sous celui-ci.

**Portée** : distances horizontales/verticales sans diagonales ; Kumji attaque à 4 cases, Lyrius coupe le Flux à 5, répare à 3, transferts à 3. Un déplacement d'une case coûte 1 Flux stocké dans l'opérateur.


## Expérimentation : temps réel avec pause tactique

Le combat démarre en **pause tactique** : le joueur distribue le Flux et prépare ses actions. **▶ Lancer** démarre la simulation. Toutes les **3 secondes réelles**, le générateur produit à nouveau, les réserves sont conservées et l'ennemi se déplace ou attaque. **⏸ Pause** arrête instantanément la simulation pour répartir le Flux, attaquer ou réparer sans pression.

Les déplacements diagonaux coûtent 2 Flux (contre 1 pour une case orthogonale). La sentinelle adverse avance dans la limite de ses réserves. Les **rochers** empêchent les passages et les tirs ; les **couvertures ▥** réduisent les dégâts ; les **brouilleurs ⌁** interrompent les transmissions de Flux. La distribution de la cellule porte à 4 cases sans obstacle.

**Lyrius : Optimiser** dépense 3 Flux stockés pour ajouter durablement +1 à la production par cycle (jusqu'à +3). Cette amélioration ne crée pas d'énergie immédiatement, et la réserve de la cellule reste limitée à 12.

Cette version hybride expérimente le rythme du combat : elle conserve les actions confirmées en pause, puis résout la production et la réponse adverse à intervalles réguliers. Les déplacements ennemis et certaines actions restent discrets par cycle et ne constituent pas encore des animations continues.

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

- Deux cartes très petites et deux combats prédéfinis (plateau de combat tactique 9 × 5).
- Graphismes et animations non définitifs.
- Pas encore de sauvegarde, d'inventaire, de chimères, de monde ouvert ni de progression persistante.
- Déplacement case par case, clavier sur bureau ; commandes tactiles non implémentées.
- L'équilibrage, le ressenti et les transitions visuelles nécessiteront des tests de jeu.

Le document [docs/PROTOTYPE.md](docs/PROTOTYPE.md) conserve le périmètre et les étapes suivantes.
