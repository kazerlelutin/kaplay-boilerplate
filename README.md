# Blob & Coins — petit jeu de plateforme

Un mini jeu de plateforme réalisé avec [KAPLAY](https://kaplayjs.com) et les
assets gratuits [Kenney](https://kenney.nl) (CC0). Ramasse les pièces, trouve
la clé, évite les ennemis et rejoins la porte !

Ce guide explique comment lancer le jeu **sans rien connaître au
développement**. Suis les étapes dans l'ordre, ça prend 5 minutes.

---

## 1. Installer Bun

Bun est l'outil qui va télécharger les dépendances et lancer le jeu.
Tu n'auras à faire cette étape qu'une seule fois.

Ouvre un terminal :

- **Windows** : touche `Windows`, tape `PowerShell`, touche `Entrée`
- **macOS** : `Cmd + Espace`, tape `Terminal`, touche `Entrée`
- **Linux** : cherche « Terminal » dans tes applications

Puis copie-colle la commande qui correspond à ton système et valide avec
`Entrée` :

**macOS / Linux :**

```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell) :**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Une fois l'installation terminée, **ferme et rouvre le terminal**, puis
vérifie que tout est bon :

```bash
bun --version
```

Si un numéro de version s'affiche (par exemple `1.3.14`), c'est réussi. ✅

## 2. Télécharger les dépendances du jeu

Dans le terminal, déplace-toi dans le dossier du projet. Exemple (adapte le
chemin selon l'endroit où tu as mis le dossier) :

```bash
cd kaplay-boilerplate
```

Puis installe les dépendances :

```bash
bun install
```

Ça ne prend que quelques secondes. Cette étape n'est à refaire que si tu
supprimes le dossier `node_modules`.

## 3. Lancer le jeu

Toujours dans le terminal, depuis le dossier du projet :

```bash
bun run dev
```

Le terminal affiche une adresse qui ressemble à :

```
➜  Local:   http://localhost:5173/
```

Ouvre cette adresse dans ton navigateur (Chrome, Firefox, Edge…) : le jeu
démarre. 🎮

> Le terminal doit **rester ouvert** pendant que tu joues.
> Pour arrêter le jeu : retourne dans le terminal et fais `Ctrl + C`.

## Contrôles

| Action | Touches |
| --- | --- |
| Se déplacer | `←` `→` ou `A` `D` |
| Sauter | `Espace`, `↑` ou `W` |
| Recommencer le niveau | `R` |
| Rejouer après victoire / défaite | `Entrée` |

**Objectif** : ramasse des pièces, trouve la **clé** pour ouvrir la porte,
et évite les ennemis et les gouffres. Tu as 3 vies. Bonne chance !

## Problèmes fréquents

- **`bun : commande introuvable`** → ferme et rouvre le terminal après
  l'installation de Bun (étape 1).
- **La page ne s'ouvre pas / « site inaccessible »** → vérifie que
  `bun run dev` tourne toujours dans le terminal, et que tu utilises bien
  l'adresse affichée (http://localhost:5173/).
- **« Port 5173 is in use »** → un autre programme utilise le port. Vite en
  propose un autre automatiquement (par exemple 5174) : utilise l'adresse
  affichée dans le terminal.

## Pour aller plus loin (optionnel)

Générer une version autonome du site (dossier `dist/`, à mettre sur
n'importe quel hébergement statique) :

```bash
bun run build
```

---

- Moteur de jeu : [KAPLAY](https://kaplayjs.com) 4000 (alpha)
- Graphismes : [Kenney — 1-Bit Platformer Pack](https://kenney.nl/assets/1-bit-platformer-pack),
  licence CC0 (voir `LICENSE-kenney.txt`)
