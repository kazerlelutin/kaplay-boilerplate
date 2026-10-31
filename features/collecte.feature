# language: fr
Fonctionnalité: Collecte des objets
  Le joueur ramasse des pièces pour marquer des points et une clé
  pour déverrouiller la porte de sortie.

  Scénario: Ramasser une pièce
    Étant donné une partie en cours
    Quand la créature touche une pièce
    Alors la pièce disparaît
    Et le compteur de pièces du HUD augmente de 1

  Scénario: Ramasser la clé
    Étant donné une partie en cours
    Quand la créature touche la clé
    Alors la clé disparaît
    Et la porte de sortie s'ouvre
