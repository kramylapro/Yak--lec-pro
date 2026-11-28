# Yak-élec-pro – V1.13.0

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

## V1.10.0 – Fonctions inspirées du cahier des charges « ELECTRO-SCHEMA »
- **Atelier** : barre de menus (Fichier, Édition, Affichage, Insertion, Simulation, Outils, Aide) ; **plusieurs feuilles par projet** (onglets sous la barre d'outils, double-clic = renommer) ; **Retourner (miroir)** un composant (touche M) ; **Couper** (Ctrl+X) ; tirer un conducteur sélectionné déplace un de ses segments sans le débrancher ; bornes mises en évidence sur le composant sélectionné ; Ctrl+S, Ctrl+P, Ctrl+N.
- **Annotations** : Texte, Titre, Commentaire, Repère numéroté (catégorie Annotations, sans effet électrique).
- **26 nouveaux symboles** (120 au total) : jeu de barres, bornes de raccordement (simple et L-N-PE), autotransformateur, alimentation continue 230 V → 24 V, parafoudre, interrupteur-sectionneur, différentiel tétrapolaire, relais temporisé au repos et ses contacts, compteur d'impulsions et son contact, **automate programmable 6 E / 4 S** et **relais logique 4 E / 2 S** (programme en équations ET / OU / NON), détecteurs capacitif, photoélectrique et de mouvement, moteur triphasé 6 bornes (étoile / triangle), pôles de puissance de contacteur, contacts 95-96 / 97-98 du relais thermique.
- **Simulation** : pause / reprise, **tensions et courants calculés** pour chaque récepteur (U d'après les potentiels, I d'après la puissance saisie), temporisation au repos, compteur, automate, couplage étoile / triangle du moteur 6 bornes.
- **Vérification** : un court-circuit qui n'existe que si deux contacteurs sont fermés ensemble est reconnu ; s'il manque le verrouillage par contacts NF croisés → avertissement « Verrouillage manquant ».
- **12 exemples pédagogiques** (menu Exemples) : simple allumage, double allumage, va-et-vient, télérupteur, prises, démarrage direct, inversion de sens, étoile-triangle, auto-maintien, relais thermique, arrêt d'urgence, distribution. Chacun : schéma, liste des composants, fonctionnement, étapes, exercices, test automatique du fonctionnement, ouverture dans l'atelier.
- **Calculs électriques** (menu Calculs) : loi d'Ohm, puissances P / Q / S, courant mono / tri, résistance, chute de tension (avec section suffisante), puissance moteur, facteur de puissance et compensation ; formules et unités affichées.
- **Projets** : dossiers (création, rangement, filtre), renommer / dupliquer.
- **Impression / PDF mis en page** : A4, A3, A2, portrait / paysage, toutes les feuilles ou la feuille ouverte, **cartouche** (titre, établissement, auteur, date, feuille n / N, échelle ; 1:20 / 1:50 / 1:100 pour les plans) ; impression directe. **Export DXF** (AutoCAD, R12, calques CONDUCTEURS / SYMBOLES / TEXTES, millimètres).
- **Mode pédagogique** (menu Pédagogie) : 6 cours + cours de l'enseignant, quiz de reconnaissance des symboles, circuits guidés (composants placés, à câbler), **correction automatique** des connexions et **note sur 20** (composants, connexions, vérification, fonctionnement), résultats de l'élève, exercices créés par l'enseignant (exportables), remise du travail par fichier, copies reçues et recorrection.
- Fichiers : `js/library_ext.js`, `js/menu.js`, `js/examples.js`, `js/examples_ui.js`, `js/calc.js`, `js/pedago.js`. Tests : `python3 tests/v110_tests.py [fichier.html]` (W1–W12, 49 tests, sans mot de passe admin).
- Choix technique : l'application reste en JavaScript sans framework, en un seul fichier hors ligne (le cahier des charges suggérait React/TypeScript : cela aurait obligé à tout réécrire et à casser l'.exe, l'APK et le site).

## V1.10.1 – Barres sur une ligne, sous-fenêtres réductibles
- En-tête, barre de menus et barre d'outils de l'atelier sur **une seule ligne** (boutons-icônes avec info-bulle ; sur petit écran, la barre défile à la molette ou au doigt).
- L'atelier est découpé en **trois sous-fenêtres** (Symboles, Feuille de dessin, Panneau), chacune avec une barre de titre et les boutons **― Réduire** et **☐ Agrandir / ❐ Restaurer**, comme sous Windows. Double-clic sur la barre de titre = agrandir / restaurer ; clic sur une fenêtre réduite = la restaurer ; largeur réglable en tirant la séparation. La disposition est mémorisée (`eep.panes`) ; menu Affichage › « Rétablir la disposition des fenêtres ».

## V1.10.2 – Onglet déroulant « Matériel »
- Dans la barre du haut, **Quantitatif** et **Composants** sont regroupés sous l'onglet **Matériel ▾** : un clic déplie la liste des sous-titres (avec une courte description), un clic sur un sous-titre ouvre l'écran ; clic ailleurs ou Échap = refermer. L'onglet reste en surbrillance quand l'un de ses écrans est ouvert.
- Correction : certains textes des menus (V1.10) utilisaient une couleur inexistante et pouvaient apparaître en blanc sur fond blanc.

## V1.10.3 – Onglet déroulant « Accueil »
- **Paramètres**, **Portail administrateur** (visible seulement pour le compte administrateur) et **Déconnexion** ne sont plus dans la barre du haut : ils sont des sous-titres de l'onglet **Accueil ▾**, avec « Page d'accueil » et le nom du compte connecté. La barre du haut tient ainsi sur une seule ligne.

## V1.10.4 – Contenu au clic et présentation dans le portail
- Clic sur un onglet à sous-titres (Accueil ▾, Matériel ▾) : le contenu du premier sous-titre s'affiche aussitôt et la liste des sous-titres reste ouverte ; clic sur un sous-titre : son contenu s'affiche.
- Portail administrateur : texte de présentation de l'application (« À propos de Yak-élec-pro ») affiché avant et après le mot de passe, modifiable dans Portail › Apparence et textes (`brand.about`, `EE.Config.aboutText()`).

## V1.10.5 – Contenus des sous-titres les uns sous les autres
- Un clic sur **Matériel ▾** affiche sur une même page le **Quantitatif** puis, en dessous, les **Composants** ; un clic sur **Accueil ▾** affiche la page d'accueil, puis les **Paramètres** (puis le **Portail** pour l'administrateur). Chaque partie a un bandeau-titre et des liens « ↕ » pour sauter à l'autre ; un clic sur un sous-titre de la liste fait descendre la page jusqu'à son contenu.
- Chaque partie reste indépendante (une recherche ou un ajout dans l'une ne vide pas l'autre) ; « Imprimer » n'imprime que la partie où l'on a cliqué.

## V1.10.6 – Contenu des sous-titres en liste verticale
Dans les listes déroulantes « Accueil ▾ » et « Matériel ▾ », le contenu écrit sous chaque sous-titre en gras s'affiche maintenant en liste verticale (un élément par ligne, avec une puce) au lieu d'une ligne séparée par des virgules.

## V1.10.7 – Voir tout le schéma dans la fiche d'un exemple
« Voir la fiche » affiche maintenant le schéma **en entier** dans son cadre (il était agrandi à toute la largeur et coupé). Boutons : **−** / **+** (zoom, puis défilement), **Tout voir**, **⛶ Plein écran** (schéma sur tout l'écran, avec zoom ; Échap ou ✕ pour fermer).

## V1.13.0 – Télécharger l'application Android depuis le site
- Bouton **📱 Télécharger l'application Android** sur l'écran de connexion du site et dans Paramètres › À propos (fenêtre avec les étapes d'installation). Masqué dans l'application Android, l'application Windows et le fichier local.
- Page à partager `android.html` fabriquée avec le site (`dist/site/android.html`).
- Workflow Android : APK publié automatiquement dans la Release fixe « android » (adresse stable), fabrication automatique à chaque changement du code ; signature fixe facultative par secrets GitHub (`YAK_KEYSTORE_B64`, `YAK_KEYSTORE_PASSWORD`, `YAK_KEY_ALIAS`).
- Lien remplaçable dans le portail (control.json → `androidUrl`). Guide : `docs/GUIDE_ANDROID.md`. Tests : `tests/android_dl_tests.py` (14 tests).

## V1.12.0 – Nombre de personnes connectées
- Portail › nouvel onglet **👥 Connexions** : personnes connectées maintenant, aujourd'hui, 7 et 30 jours, total, nouveaux, répartition par plateforme et version, liste des appareils, export CSV, actualisation toutes les 30 s.
- Chaque copie connectée à Internet envoie un signal toutes les 60 s à une base Firebase Realtime Database du propriétaire (identifiant d'appareil, utilisateur, plateforme, version). Lecture réservée au compte administrateur (règles fournies). Adresse et clé publiées dans `control.json` (`statsUrl`, `statsKey`).
- Avis d'information sur l'écran de connexion quand les statistiques sont actives.
- Guide : `docs/GUIDE_CONNEXIONS.md`. Tests : `tests/stats_tests.py` (21 tests, Firebase simulé).

## V1.11.1 – Correctif (application Windows et site)
- Corrigé : sur l'application Windows (et le site), du code JavaScript s'affichait en texte sous l'écran de connexion et l'application ne fonctionnait plus. Le lanceur insérait son script avant la première balise `</body>` trouvée, qui se trouvait dans le code d'impression. L'insertion se fait maintenant avant la dernière balise `</body>`, et les balises écrites dans le code JavaScript sont protégées (`<\/body>`).

## V1.11.0 – Bureau d'études BT (conception de tableaux électriques)
Nouvel onglet **Bureau d'études** (et carte sur l'accueil), présenté comme un logiciel de bureau : barre de menus (Fichier, Édition, Affichage, Conception, Calculs, Distribution, Tableaux, Bibliothèque, Documents, Paramètres, Aide), ruban d'outils, explorateur de projet à gauche, zone de travail à onglets au centre, propriétés à droite, messages en bas et barre d'état.
- **Études** : assistant de création (client, chantier, bureau d'études, ingénieur, date, bâtiment, alimentation, U / U0, fréquence, régime de neutre TT / TN-S / TN-C / TN-C-S / IT, puissance disponible, Icc de livraison, cos φ, RA, normes). Enregistrement automatique, enregistrer sous, dupliquer, archiver, importer / exporter (`.yakbt.json`), étude d'exemple.
- **Arborescence** TGBT → départs → tableaux divisionnaires → circuits → récepteurs : ajouter, renommer, dupliquer, déplacer, monter / descendre, supprimer, couper / copier / coller, annuler / rétablir (Ctrl+Z / Ctrl+Y).
- **Bilan de puissance** (ku, ks, cos φ, rendement ; par circuit, tableau et projet, équilibrage des phases) ; **calculs** Ib, In, Iz avec facteurs de correction, section, chute de tension cumulée, Icc max / min, pouvoir de coupure, contacts indirects selon le régime de neutre ; résultat **Conforme / À vérifier / Non conforme / Données manquantes** ; note de calcul détaillée (formules, hypothèses) et plusieurs solutions de protection.
- **Répartition** traditionnelle ou optimisée (rangées, différentiels et leurs départs, peignes, réserve), **choix de l'enveloppe** parmi plusieurs solutions, **vues 2D** (face, intérieur, côté) et **vue 3D** orientable, **échauffement** simplifié (ventilation conseillée), **sélectivité** indicative (courbes génériques) et tableau des données constructeur (seule source admise pour déclarer sélectivité ou filiation).
- **Nomenclature et chiffrage** (main-d'œuvre, frais, marge, TVA), bon de commande, **étiquettes** imprimables, **dossier d'étude** PDF (15 parties au choix), classeur **Excel** 6 feuilles, CSV, SVG ; **schéma unifilaire généré** dans l'atelier (une feuille par tableau, modifiable, exportable en PDF / SVG / DXF).
- **Bibliothèque d'appareils** : 576 produits génériques (prix à renseigner), import / export CSV des produits et des tarifs fabricants (Legrand, Schneider Electric, ABB, Siemens…).
- Honnêteté technique : aucune référence de fabricant inventée ; tableaux de courants admissibles (CEI 60364-5-52) signalés « à vérifier » et visibles dans Paramètres ; aucun résultat ne vaut certificat de conformité.
