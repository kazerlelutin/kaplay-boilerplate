# language: fr
Fonctionnalité: Fin de niveau et défaite
  Le niveau se termine en victoire par la porte ouverte,
  ou en défaite quand toutes les vies sont perdues.

  Scénario: Porte fermée sans la clé
    Étant donné une partie en cours
    Et la créature sans la clé
    Quand la créature touche la porte
    Alors le niveau continue

  Scénario: Terminer le niveau
    Étant donné une partie en cours
    Et la créature avec la clé
    Quand la créature touche la porte ouverte
    Alors la bannière de victoire s'affiche avec le nombre de pièces
    Et une pression sur "Entrée" relance le niveau

  Scénario: Contact avec un ennemi
    Étant donné une partie en cours
    Quand la créature touche un ennemi
    Alors elle perd une vie et réapparaît à son point de départ
    Et elle est temporairement invulnérable et clignote

  Scénario: Partie terminée
    Étant donné une partie en cours
    Et la créature avec une seule vie restante
    Quand la créature touche un ennemi
    Alors la bannière "GAME OVER" s'affiche
    Et une pression sur "Entrée" relance le niveau
