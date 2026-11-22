# Yak-élec-pro – V1.2.0

Application de dessin et d'analyse de schémas électriques (ordinateur + Android), **sans serveur ni installation** : 100 % HTML/CSS/JavaScript.

## Lancer l'application
- **Ordinateur** : double-cliquer sur `dist/yak-elec-pro.html` (fichier unique) ou sur `index.html` (fichiers modulaires). Navigateurs récents : Chrome, Edge, Firefox, Safari.
- **Android** : copier `yak-elec-pro.html` sur le téléphone et l'ouvrir avec Chrome, ou l'héberger (GitHub Pages, serveur de l'école…) puis « Ajouter à l'écran d'accueil ». Un APK natif est possible plus tard en emballant ce même code (Capacitor) : aucune réécriture n'est nécessaire.
- Au premier lancement : créer un compte (stocké sur l'appareil), puis « Nouveau projet ».

## Structure
```
index.html            point d'entrée (charge les modules dans l'ordre)
css/style.css         interface (clair / sombre, adaptée au mobile)
js/core.js            utilitaires, hachage SHA-256
js/library.js         bibliothèque de 26 symboles (bornes, rôle électrique, fiche, référence)
js/engine.js          moteur de connectivité + vérification
js/store.js           utilisateurs, projets, paramètres (stockage local)
js/render.js          rendu SVG commun (écran + exports), cartouche
js/export.js          exportation SVG / PNG / PDF / projet JSON
js/editor.js          atelier : feuille, outils, historique, sauvegarde auto
js/app.js             écrans : accueil, projets, bibliothèque, atelier, paramètres
build.py              assemble tout en dist/yak-elec-pro.html
tests/                circuits de test + run_tests.py (98 tests)
docs/                 ARCHITECTURE, GUIDE_UTILISATEUR, TESTS, FEUILLE_DE_ROUTE
```

## Tests
`python3 tests/run_tests.py` (Python, Playwright, Chromium). Résultats : `docs/TESTS.md`.

## Limites connues de la V1
Voir `docs/FEUILLE_DE_ROUTE.md` (comptes locaux sans serveur, symboles simplifiés, vérification de connectivité uniquement, PDF raster, etc.).

## Nouveautés V1.1
- **Mot de passe** : bouton 👁 pour afficher/masquer (connexion, création de compte, paramètres).
- **Mode Simuler** (▶) : la lampe s'allume (halo), le moteur tourne (animation, sens direct/inverse), les bobines s'excitent, les contacts suivent leur bobine (même repère), les fils sont colorés par potentiel. Boutons-poussoirs maintenus tant que l'on appuie ; disjoncteurs/relais thermiques déclenchent sur court-circuit/surcharge et se réarment d'un clic.
- **Électricité industrielle** : 30 symboles (sectionneurs, fusibles, disjoncteurs, contacteur tripolaire, relais thermique, bobines, contacts, arrêt d'urgence, sélecteurs, fins de course, détecteurs, pressostat, thermostat, voyants, avertisseur, électrovanne, résistance chauffante, moteur CC, alimentation CC, variateur, démarreur progressif, redresseur).
- Simplifications de la simulation : sens du courant dans les diodes/LED non simulé, un seul type de temporisation (travail), condensateur bloquant, lampes en série non alimentées.
- **Logo Yak-Élec** : fond retiré (PNG transparent), intégré à la connexion, à l'accueil, à l'en-tête (monogramme YE) et comme icône d'onglet (`assets/`, `js/logo.js`).

## Nouveautés V1.2
- **Quantitatif et coffret** : à partir des dimensions des pièces (longueur, largeur, hauteur, distance au coffret), des points lumineux, interrupteurs, va-et-vient, prises et appareils spécialisés, l'application calcule les circuits, les câbles, les conduits, l'appareillage, les boîtes, les disjoncteurs, les différentiels, le disjoncteur général, la mise à la terre et le coffret (rangées de modules dessinées). Export CSV (Excel) et impression/PDF.
- **Portail administrateur** (menu « Portail ») : modification sans programmation du nom, du logo, des couleurs, des textes, du catalogue et des prix (avec import/export Excel-CSV), des règles de calcul, des appareils spécialisés et des fiches des symboles ; sauvegarde et mise à jour par fichier de configuration ; journal des modifications. Visible uniquement pour le compte administrateur (nom d'utilisateur = e-mail administrateur), avec mot de passe administrateur à chaque ouverture ; le mot de passe n'est stocké que sous forme d'empreinte.
- Les prix du catalogue sont à **0 par défaut** : à renseigner dans le portail.

## V1.2.1 – Composants et symboles
Menu **Composants** : liste de tous les composants du catalogue avec le symbole de la bibliothèque correspondant (ou « aucun symbole » : aucun symbole n'est inventé). Le symbole figure aussi dans la liste du matériel du quantitatif ; il se corrige dans Portail › Catalogue. Export CSV et impression.

## V1.2.2 – Portail réservé
Le portail n'apparaît que pour le compte `kramylapro@gmail.com`, créé avec le mot de passe administrateur. Les tests du portail nécessitent la variable d'environnement `YAK_ADMIN_PW`.

## V1.2.3 – Appareils réalistes dans le coffret
La composition du coffret montre chaque appareil (disjoncteur général, différentiels, disjoncteurs, parafoudre) de face sur rail DIN : borniers, manette, bouton test, étiquette de calibre. Dans Portail › Catalogue, le bouton 📷 permet de remplacer ce dessin par la photo réelle de l'appareil (photo réduite et enregistrée sur l'appareil).

## V1.2.4 – DPN, différentiels et normes européennes
- Disjoncteurs divisionnaires **DPN 1P+N, courbe C, 6 kA (EN 60898-1), 1 module** ; interrupteurs différentiels **ID 2P, 30 mA, type AC ou A (EN 61008-1), 2 modules** ; parafoudre EN 61643-11 ; coffret EN 61439-3 / EN 60670-24 ; appareillage EN 60669-1 ; boîtes EN 60670-1 ; bornes EN 60947-7-x ; électrodes de terre EN 62561-2 ; conduits EN 61386 ; couleurs HD 308 S2.
- Connectique du coffret : peigne d'alimentation 1P+N par rangée, barrettes de neutre et de terre, obturateurs pour les places libres, repères.
- Les normes s'affichent dans le quantitatif, l'écran Composants et sont modifiables dans le Portail. Un ancien catalogue enregistré est mis à jour automatiquement (prix, photos et articles ajoutés conservés).
- Les règles de répartition (prises par circuit, sections) restent celles de la NF C 15-100 (nationale) ; HD 60364 / CEI 60364 ne fixe pas ces nombres.

## V1.8.0 – Électricité bâtiment et icône Windows
Onglet **Bâtiment** : les quatre types de schéma (développé, unifilaire, multifilaire, architectural) avec création et liste des projets par type. Nouveau **schéma architectural (plan d'implantation)** : murs en trait épais, 23 symboles de plan (porte, fenêtre, DCL, applique, interrupteurs, prises, RJ45, TV, tableau, DAAF, convecteur…), nom des pièces, **bilan du plan** (décompte des équipements, longueur des murs ; 1 carreau = 25 cm). `Yak-elec-pro.exe` porte maintenant l'icône du logo (`desktop/make_icon.py`).

## V1.7.0 – Photovoltaïque moderne
Batteries lithium LiFePO4 (12,8 / 25,6 / 51,2 V, rack ou murales, BMS intégré), onduleurs hybrides tout-en-un 2 à 10 kW (MPPT, chargeur et onduleur intégrés), type d'onduleur au choix (hybride ou régulateur + onduleur séparés), lithium et hybride par défaut. Trois propositions comparées (Économique plomb, Équilibrée lithium, Moderne lithium + hybride) avec stockage, durée de vie indicative et coût. Nouveaux équipements ajoutés automatiquement aux catalogues déjà enregistrés (prix conservés) ; table « Onduleurs hybrides » et durées de vie dans le Portail › Photovoltaïque.

## V1.6.0 – Windows et dossier IA
`dist/Yak-elec-pro.exe` : application Windows 10/11 (64 bits), hors ligne, double-clic (ouvre une fenêtre d'application ; au premier lancement Windows peut afficher « SmartScreen » : *Informations complémentaires › Exécuter quand même*, l'exécutable n'est pas signé). `IA_PROJET_YAK-ELEC-PRO.md` (copié en CLAUDE.md et AGENTS.md) : dossier à donner à une IA pour faire évoluer l'application (Windows ou Android).

## V1.5.0 – Contact
Onglet « Contact » sous le logo : e-mail, téléphone, WhatsApp, formulaire qui ouvre l'e-mail ou WhatsApp avec le message pré-rédigé. Nom, e-mail et téléphone modifiables dans Portail › Apparence et textes.

## V1.4.0 – Interface en relief (3D)
Boutons en touches enfonçables, champs en creux, cartes épaisses avec ombres portées, icônes en volume, barre de navigation en relief, inclinaison 3D des cartes et symboles au passage de la souris (js/fx3d.js ; désactivée au tactile, en « moins de mouvement » et à l'impression). Thèmes clair et sombre.

## V1.3.3 – Sources d'énergie
Catégorie **Sources** enrichie (11 symboles) : réseau monophasé 230 V, réseau triphasé 400 V, groupe électrogène mono/triphasé, batterie, pile, panneau photovoltaïque, éolienne. Chaque source fournit ses potentiels (L1/L2/L3, N, PE, DC+/DC−) à la vérification et à la simulation ; borne non raccordée signalée.

## V1.3.1 – Photovoltaïque
Menu **Photovoltaïque** : on remplit une grille (type d'installation et appareils : puissance, quantité, heures par jour ; tout le reste est automatique avec des valeurs standard, modifiables dans « Réglages avancés ») et l'application dimensionne : panneaux, chaînes en série/parallèle (tension à froid et à chaud), régulateur(s) MPPT, onduleur, parc de batteries (plomb ou lithium), câbles, fusibles, sectionneur et parafoudre DC, protections AC, mise à la terre ; synoptique, détail des calculs, liste de matériel chiffrée, export CSV et PDF. Deux modes : site isolé (batteries) et raccordé au réseau. Équipements et règles modifiables dans Portail › Photovoltaïque (valeurs d'exemple génériques à remplacer par les fiches techniques).


## V1.9.0 – Contrôle à distance et Android
- `js/remote.js` : lecture de `control.json` en ligne (blocage général / par appareil / par compte, message, mise à jour proposée ou obligatoire, blocage après N jours hors ligne). Dernier état conservé hors ligne.
- Portail › « 📡 Contrôle à distance » : générateur de `control.json`, aperçu du blocage, publication GitHub (jeton jamais enregistré).
- `build.py` : variable `YAK_CONTROL_URL` ou fichier `controle/url.txt` → adresse intégrée ; produit aussi `dist/site/` (PWA : manifest, service worker, icônes, control.json modèle).
- `android/` : projet Gradle (WebView, pont d'export, sélecteur de fichiers, liens externes) ; `.github/workflows/android.yml` (APK) et `site.yml` (site PWA). **Non compilé dans l'environnement de création.**
- Guide : `docs/GUIDE_CONTROLE_A_DISTANCE.md`. Tests : `python3 tests/remote_tests.py [fichier.html]` (X1–X27, sans mot de passe admin).

## V1.9.1–1.9.3
- Rapport d'erreurs détaillé (titre, problème, comment corriger) ; feuille ajustable (zoom, plein écran, panneaux) ; bipolaires alignés sur le réseau 230 V ; télérupteur/minuteur/crépusculaire ; **assistant de dépannage `js/fixer.js`** (`EE.Fixer.suggest/autoFix`, bouton 🛠 Réparer). Tests : `tests/ux_tests.py`.

- V1.9.4 : clic sur un repère d'erreur de la feuille → bulle (problème, conseil, bouton « Corriger automatiquement »). `editor.onMarker`, `showMarkerPop` (app.js).
