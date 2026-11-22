# Rapport de tests – Yak-élec-pro V1.8.0

Exécuté le 22/11/2026 avec Chromium (Playwright), sur `index.html` (fichiers modulaires) **et** sur `dist/yak-elec-pro.html` (fichier unique) : **195/195 tests réussis** dans les deux cas.

Commande : `YAK_ADMIN_PW=<mot de passe administrateur> python3 tests/run_tests.py [chemin]` (nécessite Python + Playwright + Chromium).

## Nouveautés V1.1 testées

| Fonction | Tests |
|---|---|
| Mot de passe afficher/masquer (connexion, confirmation, paramètres) | L1–L5 |
| Bibliothèque : 26 symboles de base + 30 industriels | C1, C3 |
| Simulation : allumage, double allumage, va-et-vient, commande, démarrage direct (marche, auto-maintien, arrêt), déclenchement thermique et réarmement, sens inverse, temporisation, court-circuit, courant continu | M1–M9 |
| Simulation dans l'atelier : bouton Simuler, lampe allumée, moteur animé, auto-maintien | N1–N5 |

## Nouveautés V1.2 testées

| Fonction | Tests |
|---|---|
| Quantitatif : formules de métré, 8 prises par circuit, circuits dédiés, différentiels, prix, article manquant, choix du coffret, étude vide | O1–O8 |
| Écran Quantitatif : calcul en direct, tableaux, coffret SVG, enregistrement, export CSV, plusieurs études | O9–O15 |
| Portail : administrateur, accès protégé, apparence, logo, catalogue (ajout, hausse %, CSV), règles, fiches symboles, sauvegarde/import de configuration, journal | P1–P23 |

## Circuits simples testés

| Circuit | Vérification | Sauvegarde | Réouverture (JSON, réseaux, rendu SVG, nombre d'éléments) |
|---|---|---|---|
| Simple allumage | OK | OK | OK |
| Double allumage | OK | OK | OK |
| Va-et-vient | OK | OK | OK |
| Circuit de commande simple | OK | OK | OK |

Le circuit « va-et-vient » contient volontairement le **croisement de deux conducteurs** (navettes) : le test E-vav-3 vérifie que ce croisement n'est pas une connexion électrique.

## Détail

### A – Utilisateurs

- ✅ A1 Création de compte refusée si mots de passe différents
- ✅ A2 Compte créé et connexion automatique
- ✅ A3 Tableau de bord : logo + 5 entrées
- ✅ A4 Mauvais mot de passe refusé
- ✅ A5 Reconnexion réussie

### B – Projets

- ✅ B1 Projet créé avec nom / installation / type de schéma
- ✅ B2 Modification du projet
- ✅ B3 Duplication du projet
- ✅ B4 Suppression annulée : projet conservé
- ✅ B5 Suppression après confirmation
- ✅ B6 Filtre de la liste

### C – Bibliothèque de symboles

- ✅ C1 Bibliothèque : 26 symboles
- ✅ C2 Tous les symboles demandés sont présents
- ✅ C3 Chaque symbole a fiche + norme + rendu des 3 types de schéma
- ✅ C4 Ouverture de la fiche descriptive
- ✅ C5 Recherche de symbole
- ✅ C6 Représentation adaptée au type de schéma (prise : 2P+T en unifilaire)

### D – Atelier de dessin

- ✅ D1 Symboles déposés sur la feuille
- ✅ D2 Identification automatique (S1, H1)
- ✅ D3 Conducteurs tracés entre bornes (3)
- ✅ D4 Schéma dessiné à la main : aucune anomalie
- ✅ D5 Marqueurs de bornes : toutes reliées
- ✅ D6 Déplacement d'un composant (grille respectée)
- ✅ D7 Les conducteurs suivent le composant déplacé (aucune anomalie)
- ✅ D8 Annuler (Ctrl+Z)
- ✅ D9 Rétablir (Ctrl+Y)
- ✅ D10 Rotation 90° (touche R) : les conducteurs restent raccordés aux bornes
- ✅ D11 Copier / coller (nouvelle identification unique)
- ✅ D12 Suppression
- ✅ D13 Annuler la suppression
- ✅ D14 Dérivation sur un conducteur : jonction ajoutée automatiquement
- ✅ D15 Zoom (molette)
- ✅ D16 Déplacement de la feuille (pan)
- ✅ D17 Grille masquable
- ✅ D18 Ajuster la vue
- ✅ D19 Propriétés : identification et valeur
- ✅ D20 Sauvegarde automatique
- ✅ D21 Marque d'enregistrement affichée

### E – Circuits de test + sauvegarde / réouverture

- ✅ E-allumage-1 Simple allumage : vérification sans anomalie
- ✅ E-allumage-2 Simple allumage : enregistré (4 composants, 3 conducteurs)
- ✅ E-double-1 Double allumage : vérification sans anomalie
- ✅ E-double-2 Double allumage : enregistré (6 composants, 5 conducteurs)
- ✅ E-vav-1 Va-et-vient : vérification sans anomalie
- ✅ E-vav-2 Va-et-vient : enregistré (5 composants, 5 conducteurs)
- ✅ E-commande-1 Circuit de commande simple : vérification sans anomalie
- ✅ E-commande-2 Circuit de commande simple : enregistré (8 composants, 7 conducteurs)
- ✅ E-vav-3 Va-et-vient : le croisement des deux navettes n'est PAS une connexion
- ✅ E-0 Session conservée après rechargement
- ✅ E-allumage-4 Réouverture : données identiques (JSON)
- ✅ E-allumage-5 Réouverture : connexions identiques (réseaux)
- ✅ E-allumage-6 Réouverture : symboles et tracés identiques (rendu SVG)
- ✅ E-allumage-7 Réouverture : nombre d'éléments affichés
- ✅ E-allumage-8 Réouverture : vérification toujours sans anomalie
- ✅ E-double-4 Réouverture : données identiques (JSON)
- ✅ E-double-5 Réouverture : connexions identiques (réseaux)
- ✅ E-double-6 Réouverture : symboles et tracés identiques (rendu SVG)
- ✅ E-double-7 Réouverture : nombre d'éléments affichés
- ✅ E-double-8 Réouverture : vérification toujours sans anomalie
- ✅ E-vav-4 Réouverture : données identiques (JSON)
- ✅ E-vav-5 Réouverture : connexions identiques (réseaux)
- ✅ E-vav-6 Réouverture : symboles et tracés identiques (rendu SVG)
- ✅ E-vav-7 Réouverture : nombre d'éléments affichés
- ✅ E-vav-8 Réouverture : vérification toujours sans anomalie
- ✅ E-commande-4 Réouverture : données identiques (JSON)
- ✅ E-commande-5 Réouverture : connexions identiques (réseaux)
- ✅ E-commande-6 Réouverture : symboles et tracés identiques (rendu SVG)
- ✅ E-commande-7 Réouverture : nombre d'éléments affichés
- ✅ E-commande-8 Réouverture : vérification toujours sans anomalie

### F – Moteur de connexion et vérification (cas défectueux)

- ✅ F1 Conducteur isolé détecté
- ✅ F2 Fil non raccordé détecté
- ✅ F3 Borne sans connexion + circuit ouvert détectés
- ✅ F4 Phase reliée au neutre : court-circuit détecté
- ✅ F5 Composant sans identification détecté
- ✅ F6 Identification en double détectée
- ✅ F7 Borne non raccordée du nouvel appareil détectée
- ✅ F8 Un simple croisement n'est jamais une connexion (pas de court-circuit)
- ✅ F9 Contact « en T » sans jonction signalé (ambigu)
- ✅ F10 Même contact avec une jonction : connexion acceptée (plus d'ambiguïté)
- ✅ F11 Absence de source signalée
- ✅ F12 Lampe reliée à la phase aux deux bornes : incohérence détectée (même potentiel)
- ✅ F13 Moteur triphasé non alimenté signalé

### G – Types de schéma / unifilaire

- ✅ G1 Unifilaire : nombre de conducteurs et désignation du conducteur
- ✅ G2 Unifilaire : traits obliques + désignation affichés
- ✅ G3 Changement de type de schéma

### H – Exportations

- ✅ H1 Export SVG valide (XML) avec cartouche
- ✅ H2 Export PNG valide
- ✅ H3 PNG non vide (contenu dessiné)
- ✅ H4 Export PDF valide (1 page A4)
- ✅ H5 PDF : le schéma est visible
- ✅ H6 Export projet JSON (sauvegarde / transfert)
- ✅ H7 Import d'un projet exporté
- ✅ H8 Import d'un fichier invalide refusé

### I – Isolation des comptes

- ✅ I1 Deuxième utilisateur : aucun projet de l'autre compte
- ✅ I2 Changement de mot de passe
- ✅ I3 Suppression de compte

### J – Mobile

- ✅ J1 Mobile (390 px) : pas de défilement horizontal de la page
- ✅ J2 Mobile : palette de symboles en tiroir, symbole armé

### K – Robustesse

- ✅ K Aucune erreur JavaScript pendant toute la session

## V1.3 – Photovoltaïque
Tests S1–S20 : formules (énergie, batteries, panneaux), chaînes (tension à froid / à chaud), batteries plomb et lithium, onduleur et démarrage moteur, sections de câbles et fusibles, mode raccordé au réseau, liste de matériel et normes, prix, entrées absurdes, écran en direct, enregistrement, export CSV, équipements et règles du Portail.


## Section X – Contrôle à distance (`tests/remote_tests.py`, 27 tests)
X1–X3 identifiant/URL/état libre · X4–X6 blocage général et déblocage · X7–X10 appareil/compte · X11–X12 hors ligne et réessai · X13–X16 bandeau de mise à jour · X17 version minimale · X18 délai hors ligne · X19 versions · X20 fichier invalide · X21–X24 portail (formulaire, aperçu) · X25–X26 publication GitHub simulée, jeton non stocké · X27 aucune erreur JS. Le portail est ouvert par contournement de test (mot de passe admin non utilisé).
