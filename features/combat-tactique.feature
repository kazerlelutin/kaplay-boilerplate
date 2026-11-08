# language: fr
Fonctionnalité: Combat tactique lisible
  Les ordres sont prévisualisés avant d'être appliqués, avec leur portée et leur coût.

  Scénario: Prévisualiser une attaque
    Étant donné le début du tour de Kumji
    Quand le joueur choisit une attaque et vise l'émetteur adverse
    Alors le jeu indique la distance et la portée
    Et il annonce le coût en Flux et les dégâts prévus
    Et aucune ressource ne change avant confirmation

  Scénario: Refuser une attaque hors de portée
    Étant donné Lyrius à six cases de l'émetteur
    Quand le joueur prévisualise Coupe-flux de portée cinq
    Alors la validation est désactivée
    Et le jeu explique que Lyrius doit se rapprocher

  Scénario: Déplacer un opérateur
    Étant donné Lyrius sur une case libre
    Quand le joueur sélectionne Déplacer et une case voisine libre
    Alors le coût de un Flux est prévisualisé
    Et la position ne change qu'après confirmation

  Scénario: Comprendre les phases
    Étant donné un tour du joueur avec six Flux disponibles
    Quand le joueur donne ses ordres puis termine le tour
    Alors la riposte ennemie est exécutée et visible
    Et le joueur choisit explicitement de commencer le tour suivant
    Et les six Flux sont alors récupérés

  Scénario: Sortir automatiquement après la victoire en formation
    Étant donné une neutralisation réussie lors de la formation WUA
    Quand le joueur confirme la neutralisation
    Alors il retourne directement à la cour de la WUA
    Et la formation est marquée comme validée
    Et aucun bouton "Continuer" n'est nécessaire

  Scénario: Sortir automatiquement après la victoire en mission
    Étant donné une neutralisation réussie lors de la mission extérieure
    Quand le joueur confirme la neutralisation
    Alors il retourne directement dans la zone extérieure
    Et la mission est marquée comme réussie

  Scénario: Relancer un combat perdu
    Étant donné la défaite de l'équipe
    Quand le joueur sélectionne "Réessayer"
    Alors le même combat recommence
