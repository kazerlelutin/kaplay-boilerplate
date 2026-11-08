# language: fr
Fonctionnalité: Mission jouable The Dunblane Quest
  Le joueur découvre la WUA puis intervient dans une zone extérieure.

  Scénario: Terminer la formation
    Étant donné Kumji dans la cour de la WUA
    Quand il parle à l'instructeur
    Et qu'il neutralise l'émetteur du simulateur
    Alors la sortie vers la mission est débloquée

  Scénario: Explorer la zone extérieure
    Étant donné Kumji à l'extérieur
    Quand il récupère l'échantillon au sol
    Et qu'il neutralise l'émetteur et le relais adverses
    Alors il découvre un habitant natif protégeant un petit
    Et il peut rejoindre le point d'extraction

  Scénario: Consulter le rapport
    Étant donné la mission accomplie
    Quand Kumji rejoint l'extraction
    Alors le rapport WUA présente la mission comme réussie
    Et il est possible de relancer une partie
