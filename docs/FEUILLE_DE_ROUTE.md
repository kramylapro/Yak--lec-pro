# Limites de la V1 et feuille de route

## Limites connues (V1)
- **Comptes locaux** : liés à l'appareil, pas de synchronisation entre ordinateur et téléphone (utiliser l'export/import `.json`). Un serveur (comptes en ligne, partage) est une évolution à part.
- **Symboles simplifiés** : redessinés d'après les principes de la NF EN 60617 (CEI 60617), sans reproduire les planches de la norme. À valider sur la norme sous licence avant un usage officiel. Le sens de conduction des diodes n'est pas simulé.
- **Vérification de connectivité uniquement** : elle ne contrôle ni sections, ni calibres, ni nombre de points par circuit (règles NF C 15-100 à ajouter).
- **PDF** : page A4 contenant une image haute résolution du schéma (pas de texte vectoriel).
- Les conducteurs sont orthogonaux ; pas de tracé oblique ; pas de feuilles multiples ni de cartouche personnalisable.
- Rotation / déplacement : les conducteurs attachés suivent mais peuvent former des coudes à réorganiser à la main.
- Testé avec Chromium ; non testé sur appareil Android physique (interface tactile prévue : pincer, tiroirs de panneaux).

## Pistes pour la suite (après validation de la V1)
1. Moteur de simulation (états des contacts, boutons-poussoirs, télérupteur, minuterie).
2. Règles de conformité NF C 15-100 (sections, protections, circuits).
3. Plans d'implantation (architectural) et multifilaire automatique depuis l'unifilaire.
4. Comptes en ligne / classes / partage enseignant-élèves, paquet Android (Capacitor).

## Après V1.1
Inversion de sens (2 contacteurs), étoile-triangle, temporisation au repos, sens du courant des diodes, symboles supplémentaires (norme complète).

## Après V1.2
Génération automatique du schéma unifilaire du tableau à partir du quantitatif, calcul de chute de tension et de puissance, installation triphasée, création de nouveaux symboles par formulaire, hébergement en ligne avec comptes partagés.


## Après V1.10
- Temporisations et compteurs internes de l'automate (TON/TOF, CTU) et langage à contacts (Ladder) ; entrées/sorties analogiques.
- Simulation du sens de conduction des diodes, calcul des courants réels dans un réseau maillé (lois de Kirchhoff) au lieu des valeurs nominales.
- Classes en ligne (serveur) pour remplacer l'échange de fichiers exercices / copies ; synchronisation ordinateur ↔ téléphone.
- PDF vectoriel (texte sélectionnable) ; import DXF ; bibliothèque de symboles créés par l'utilisateur dans le portail.

## Après V1.11 (Bureau d'études BT)
- Tables de sélectivité / filiation importables en CSV depuis les documents des fabricants.
- Courbes temps-courant réelles des appareils (import fabricant) et sélectivité énergétique.
- Calcul des Icc selon la CEI 60909 complète (transformateur, groupe électrogène, câbles en parallèle) ; conducteur PE de section réduite.
- Implantation glisser-déposer des appareils dans la vue 2D ; vue 3D texturée.
