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

  Scénario: Une action puise du Flux automatiquement dans la chaîne
    Étant donné Kumji sans réserve personnelle
    Et la cellule avec trois unités de Flux
    Quand Kumji confirme une attaque de trois unités
    Alors le Flux traverse le réseau jusqu'à Kumji
    Et la cellule perd trois unités
    Et les dégâts sont appliqués à la cible

  Scénario: Relayer le Flux sur une grande distance
    Étant donné Kumji trop éloigné de la cellule
    Et Darla entre Kumji et la cellule à portée de chaque liaison
    Quand Kumji demande une attaque de trois unités
    Alors le trajet Cellule vers Darla vers Kumji apparaît
    Et le Flux arrive à Kumji sans être consommé par Darla

  Scénario: Prévisualiser une chaîne rompue
    Étant donné Kumji isolé par un brouilleur et sans réserve
    Quand il sélectionne une attaque
    Alors le bouton de confirmation est désactivé
    Et une liaison rompue est signalée sur la carte
    Et aucune énergie n'est dépensée

  Scénario: Le joueur contrôle au clavier
    Étant donné un combat en pause tactique
    Quand il appuie sur 2 pour sélectionner Darla
    Et utilise les touches de commande pour sélectionner le bouclier
    Et appuie sur Entrée
    Alors la commande de Darla est exécutée si son réseau est alimenté

  Scénario: Observer une réaction ennemie
    Étant donné une simulation active
    Quand une impulsion déclenche le déplacement ou l'attaque de la Sentinelle
    Alors l'effet est visible sur la carte
    Et le résultat reste disponible dans le récapitulatif de riposte

  Scénario: Produire le Flux chaque seconde sans accélérer les ennemis
    Étant donné une cellule intacte
    Quand une seconde de simulation s'écoule
    Alors deux unités de Flux sont produites dans sa réserve
    Et la riposte ennemie attend son propre cycle

  Scénario: Intercepter un projectile
    Étant donné Kumji placé entre la Sentinelle et le générateur
    Quand la Sentinelle tire vers le générateur
    Alors Kumji intercepte les dégâts
    Et un projectile montre le trajet réel

  Scénario: Restaurer un émetteur ennemi neutralisé
    Étant donné un émetteur neutralisé et un relais encore opérationnel
    Quand deux réactions ennemies passent
    Alors l'émetteur reste neutralisé
    Quand le relais le répare
    Alors l'émetteur reste éteint
    Quand le relais le remet en service
    Alors l'émetteur peut de nouveau combattre

  Scénario: Compétences différentes
    Étant donné une équipe alimentée
    Quand Kumji utilise sa frappe de rupture
    Alors il inflige des dégâts directs importants
    Quand Darla lance le dôme protecteur
    Alors un bouclier visible couvre la cellule
    Quand Lyrius lance une impulsion EMP
    Alors l'énergie ennemie est drainée et ses réactions sont retardées

  Scénario: Utiliser ses PV faute de Flux
    Étant donné Kumji avec 6 PV et aucune énergie disponible dans le réseau
    Quand il prévisualise une attaque de 3 Flux
    Alors un sacrifice de 3 PV est annoncé
    Et la prévisualisation ne modifie pas ses PV
    Quand il confirme l'attaque
    Alors Kumji conserve 3 PV
    Et la cible reçoit les dégâts

  Scénario: Consommer le Flux puis les PV
    Étant donné Kumji avec 6 PV et 2 Flux accessibles
    Quand il confirme une action coûtant 3 Flux
    Alors 2 Flux sont consommés
    Et Kumji perd 1 PV

  Scénario: Ne jamais sacrifier son dernier PV
    Étant donné Darla avec 1 PV et aucun Flux accessible
    Quand elle tente un déplacement coûtant 1 Flux
    Alors l'action est refusée sans modifier son état
