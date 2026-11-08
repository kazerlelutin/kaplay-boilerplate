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
