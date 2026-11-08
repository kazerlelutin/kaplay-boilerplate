# language: fr
Fonctionnalité: Réseau de Flux — allocation, réserves et ripostes
  La production d'énergie n'est pas une attaque immédiate : elle se répartit dans les unités.

  Scénario: Distribuer puis attaquer
    Étant donné une cellule produisant six unités utilisables par tour
    Quand j'attribue trois unités à Kumji
    Et que je passe aux actions
    Alors Kumji possède trois unités de Flux
    Et la cellule conserve trois unités
    Et je peux choisir entre une attaque de deux ou trois Flux

  Scénario: Booster une attaque
    Étant donné Kumji avec quatre unités de Flux stockées
    Quand je prévisualise une attaque de deux Flux
    Et que j'augmente sa puissance à quatre
    Alors les dégâts prévus augmentent
    Et les quatre unités ne sont dépensées qu'à la confirmation

  Scénario: Garder la réserve entre les tours
    Étant donné trois unités de Flux stockées chez Kumji
    Quand le tour se termine
    Et que la nouvelle production est ajoutée à la cellule
    Alors Kumji conserve ses trois unités
    Et le Flux de la cellule s'ajoute sans dépasser sa capacité

  Scénario: Transférer entre opérateurs
    Étant donné Kumji avec quatre unités et Darla avec zéro
    Quand Kumji transfère trois unités à Darla
    Alors Kumji en conserve une et Darla en possède trois
    Et la somme des réserves reste constante

  Scénario: Protéger le noyau ennemi
    Étant donné un écran et un relais ennemis opérationnels
    Quand j'essaie d'attaquer leur noyau énergétique
    Alors l'attaque est refusée et son verrouillage est expliqué
    Quand je neutralise l'écran et le relais
    Alors le noyau devient vulnérable

  Scénario: Une IA qui exploite ses réserves
    Étant donné un ennemi avec un relais énergétique actif
    Quand son émetteur est neutralisé à la fin de mon tour
    Alors l'adversaire peut transférer du Flux vers son relais
    Et il peut reconstruire l'émetteur
    Et l'action ennemie devient visible dans le terrain et son récapitulatif

  Scénario: Suspendre le temps pour préparer ses ordres
    Étant donné une simulation de combat active
    Quand le joueur met en pause
    Alors aucun cycle de production ou de riposte ne progresse
    Et les réserves des unités restent modifiables

  Scénario: Laisser tourner une impulsion de simulation
    Étant donné une unité avec trois unités de Flux stockées
    Quand un cycle de trois secondes est résolu
    Alors le générateur produit du nouveau Flux dans sa réserve
    Et l'ennemi peut se déplacer et attaquer
    Et l'unité conserve ses trois unités si elle ne les utilise pas

  Scénario: Investir dans le générateur
    Étant donné Lyrius à portée de la cellule avec trois unités de Flux
    Quand il optimise le générateur
    Alors sa réserve diminue de trois
    Et les productions suivantes augmentent de un Flux

  Scénario: Terrain, diagonal et transmissions
    Étant donné un terrain comportant rochers couvertures et brouilleurs
    Quand une unité se déplace en diagonale
    Alors le déplacement coûte deux unités de Flux
    Et un rocher bloque le mouvement et les tirs
    Et un brouilleur coupe la transmission énergétique
