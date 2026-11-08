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
**Combats** : l'écran affiche surtout le terrain et les personnages. Cliquer sur Kumji, Darla ou Lyrius pour choisir l'opérateur, puis une action (deux à quatre boutons selon le rôle), puis une cible/case sur le terrain. La prévisualisation compacte apparaît juste avant **Confirmer**. **Fin du tour** lance la riposte, puis **Tour suivant** recharge automatiquement le Flux disponible. Les mécanismes détaillés sont accessibles via le bouton **?**. La cellule de Flux derrière l'équipe n'est pas un opérateur sélectionnable : cliquer dessus demande à Lyrius de la réparer.

**Production et protection du Flux** : la cellule produit **9 Flux** par tour lorsqu'elle est intacte ; les trois modules opérationnels consomment chacun **1 Flux d'entretien**, ce qui donne **6 Flux pour agir**. Une cellule endommagée produit moins d'énergie au tour suivant (PV 5→1 : production 9→5), et sa destruction met fin au combat. Darla couvre passivement la cellule lorsqu'elle reste à **2 cases ou moins**, et peut dépenser 2 Flux pour renforcer temporairement son bouclier (+3 contre la prochaine riposte). Lyrius peut réparer la cellule. Les lignes bleues montrent les modules alimentés. Le Flux non dépensé n'est pas encore stocké d'un tour à l'autre (réserve/chimères hors MVP).

Les distances sont mesurées horizontalement et verticalement, sans diagonales. Kumji attaque à 4 cases, Lyrius utilise son coupe-flux à 5 cases, la réparation porte à 3 cases. Un déplacement d'une case coûte 1 Flux. La barrière ennemie absorbe une partie des tirs directs, mais pas le coupe-flux. Sans barrière, le Flux adverse est redirigé vers l'arme. Pour neutraliser, Lyrius doit être à portée de l'émetteur désactivé.

## Vérifications

```bash
bun run test
bun run build
```

Les tests portent sur la logique de combat indépendante du rendu, les phases du tour, la prévisualisation, les distances et les déplacements.
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
