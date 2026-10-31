# language: fr
Fonctionnalité: Déplacement du joueur
  Le joueur contrôle une créature dans un niveau de plateforme.

  Scénario: Se déplacer horizontalement
    Étant donné une partie en cours
    Quand le joueur maintient la touche "droite" ou "gauche"
    Alors la créature se déplace dans la direction demandée
    Et son animation de marche est jouée
    Et son sprite est orienté vers la direction du déplacement

  Scénario: Sauter
    Étant donné une partie en cours
    Et la créature au sol
    Quand le joueur appuie sur la touche de saut
    Alors la créature quitte le sol avec l'animation de saut
    Et retombe sous l'effet de la gravité

  Scénario: Pas de saut en l'air
    Étant donné une partie en cours
    Et la créature en l'air
    Quand le joueur appuie sur la touche de saut
    Alors rien ne se passe

  Scénario: Chute dans un gouffre
    Étant donné une partie en cours
    Quand la créature tombe sous la limite du niveau
    Alors elle perd une vie et réapparaît à son point de départ
