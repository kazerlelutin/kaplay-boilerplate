# The Dunblane Quest — prototype

Prototype de RPG 2D en perspective isométrique, avec une esthétique 16 bits.
L'exploration sera isométrique ; les combats tactiques et certains dialogues pourront utiliser des vues 2D classiques.

Le dépôt a été remis à zéro à partir du boilerplate KAPLAY : **le jeu de plateforme « Blob & Coins » a été supprimé**.
La scène de titre actuelle est un point de départ technique, **pas encore une démo jouable**.

## Prérequis

- [Bun](https://bun.sh) installé
- Un navigateur moderne

## Démarrer

```bash
bun install
bun run dev
```

Ouvrir l'adresse indiquée par Vite (généralement http://localhost:5173).

## Vérifier et construire

```bash
bun run build
bun run preview
```

`build` exécute TypeScript puis crée les fichiers statiques dans `dist/`.

## Architecture de départ

```text
src/
├── game/
│   ├── config.ts        # Résolution logique et échelle
│   └── kaplay.ts        # Création du contexte KAPLAY (global: false)
├── scenes/
│   └── title/
│       └── title.ts     # Scène d'entrée provisoire
├── main.ts              # Bootstrap
└── style.css
docs/
└── PROTOTYPE.md         # Périmètre, séquencement et règles de contribution
```

Les futurs systèmes seront ajoutés **par feature et par entité**, uniquement quand leur ticket sera traité.
Les règles du combat (Flux, modules, tours, IA) devront rester en TypeScript pur et testables sans le moteur de rendu. Les scènes KAPLAY gèrent l'affichage et les entrées.

## Direction du prototype

1. Combat de Flux : trois opérateurs, trois modules par camp, réallocation d'énergie, neutralisation.
2. Exploration en vue isométrique : petite zone WUA et zone extérieure.
3. Dialogues, mission, rapport et première amélioration.
4. Sauvegarde locale et publication d'une version navigateur.

Consulter [docs/PROTOTYPE.md](docs/PROTOTYPE.md) pour les limites de périmètre et l'ordre des travaux.

## Technique

- Bun + TypeScript + Vite
- KAPLAY 4000 (alpha, version verrouillée dans `bun.lock`)
- Canvas logique 320 × 180, rendu pixel-perfect
- Pas d'assets définitifs à ce stade
