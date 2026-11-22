# DOSSIER POUR L'IA – Yak-élec-pro
> **Comment l'utiliser** : donnez ce fichier (et le dossier `yak-elec-pro/` ou le fichier `dist/yak-elec-pro.html`) à n'importe quelle IA de programmation (Claude, ChatGPT, Gemini, Copilot…), puis écrivez votre demande en français simple. Ce fichier lui explique tout le projet pour qu'elle continue **sans rien casser** et dans le même style. Modèles de demandes en section 10.

---
## 1. Le projet en bref
- **Nom** : Yak-élec-pro – application de **dessin de schémas électriques, vérification, simulation, quantitatif/coffret, dimensionnement photovoltaïque**, avec portail d'administration sans code.
- **Propriétaire / utilisateur** : enseignant d'électricité du bâtiment (CAP Électricité Bâtiment, Guinée), **sans connaissance en programmation** : l'IA doit livrer des fichiers **complets, prêts à l'emploi**, expliquer en français simple, et ne pas demander à l'utilisateur de coder. Contact : voir le menu *Contact* de l'application.
- **Public final** : élèves, enseignants, électriciens. **Langue de l'interface : français.** Monnaie par défaut : GNF.
- **Plateformes** : ordinateur (Windows 10 et plus récents) et Android. **Hors ligne obligatoire**, sans dépendance externe (aucun CDN, aucune bibliothèque téléchargée).
- **Version actuelle** : voir `EE.VERSION` dans `js/core.js` (V1.8.0 au moment de la rédaction).

## 2. Règles impératives (ne jamais enfreindre)
1. **Ne jamais écrire le mot de passe administrateur** (ni aucun mot de passe) en clair dans le code, les documents ou les messages. Il n'existe que sous forme de **hachage salé** (`Config.checkAdminPassword` dans `js/config.js`). Pour le changer : calculer un nouveau hachage et remplacer la constante, sans publier le mot de passe.
2. Le **portail administrateur** n'est visible que pour le compte administrateur : e-mail **kramylapro@gmail.com** + mot de passe. Ne pas élargir cet accès. (Limite à rappeler : sécurité côté navigateur = protection d'usage, pas une sécurité forte.)
3. **Rester hors ligne** et en **un seul fichier** final (`dist/yak-elec-pro.html`) : pas de framework, pas de modules ES, pas de CDN, pas de polices externes.
4. **Ne pas casser l'existant** : toujours lancer les tests (section 6) avant de livrer ; ajouter des tests pour chaque nouvelle fonction ; garder les données des utilisateurs (migrations de `localStorage`).
5. **Honnêteté technique** : les symboles sont *simplifiés d'après la norme* (pas les planches officielles) ; les normes citées (EN 60898-1, EN 61008-1, NF C 15-100, EN 62548…) sont écrites de mémoire et **doivent être validées** par l'utilisateur sur les textes en vigueur ; les valeurs photovoltaïques par défaut (ensoleillement 4,5 kWh/m²/j, etc.) sont **indicatives**. Ne jamais prétendre le contraire.
6. Ne rien inventer : si une donnée manque (prix, norme, caractéristique d'un appareil), le dire et proposer une valeur modifiable dans le portail.
7. Ne pas reproduire de logos/œuvres protégés ; le logo YAK-ELEC appartient au propriétaire (déjà intégré).

## 3. Architecture (où se trouve quoi)
Application web **vanilla JS + SVG + localStorage**, scripts classiques sous l'espace de noms global `EE` (fonctionne en double-clic, `file://`).

| Fichier | Rôle |
|---|---|
| `index.html` | Charge les scripts **dans cet ordre** : core, logo, library, library_ind, library_src, library_bat, engine, sim, store, config, quant, pv, render, export, editor, quant_ui, pv_ui, compo_ui, bat_ui, contact, portal, app, fx3d |
| `css/style.css` | Tous les styles (thèmes clair/sombre par variables CSS, effet 3D en fin de fichier) |
| `js/core.js` | `EE.VERSION`, utilitaires (`esc`, `uid`, `clone`), SHA-256 |
| `js/logo.js` | Logos en base64 |
| `js/library.js`, `library_ind.js`, `library_src.js` | **Symboles** (base 26, industriels 30, sources d'énergie 8). Ajouter un symbole = ajouter une entrée `{id,name,cat,prefix,term,body,desc,notes,ref…}` ; aucun autre fichier à modifier |
| `js/library_bat.js` | Symboles du **schéma architectural** (plan d'implantation, catégorie « Plan architectural » : porte, fenêtre, DCL, prises, tableau…) ; en mode architectural, les conducteurs sont des **murs** (trait épais, aucune analyse électrique) et le bouton « Bilan du plan » remplace la vérification |
| `js/bat_ui.js` | Onglet **Bâtiment** : hub des 4 types de schéma (développé, unifilaire, multifilaire, architectural) |
| `js/engine.js` | Moteur de connexion (union-find sur bornes/conducteurs), **vérification** (court-circuit, circuit ouvert, bornes, terre…) |
| `js/sim.js` | **Simulation** (contacts, bobines de même repère, lampes qui s'allument, moteurs qui tournent) ; même netlist que la vérification |
| `js/store.js` | Comptes, session, projets (localStorage), export/import |
| `js/config.js` | **Configuration globale** (marque, règles, catalogue de matériel, prix, normes, symboles associés, photovoltaïque), migration de catalogue (`CATVER`), fonctions administrateur |
| `js/quant.js` / `quant_ui.js` | **Quantitatif** : calcul pur `EE.Quant.compute(étude, config)` (circuits, câbles, protections, différentiels, coffret par rangées, totaux) + écran |
| `js/pv.js` / `pv_ui.js` | **Photovoltaïque** : calcul pur `EE.PV.compute(étude, config)` (batteries, panneaux, chaînes, régulateur MPPT, onduleur, câbles, protections) + écran ; seules les valeurs obligatoires sont demandées, le reste utilise des **valeurs standard** (`res.assumptions`) |
| `js/compo_ui.js` | Écran « Composants » (liste des composants avec symbole et norme) |
| `js/contact.js` | Page « Contact » (e-mail, téléphone, WhatsApp, formulaire → mailto / wa.me) |
| `js/portal.js` | **Portail administrateur** sans code (apparence, catalogue/prix, règles, photovoltaïque, fiches de symboles, sauvegarde) |
| `js/render.js`, `export.js`, `editor.js` | Rendu SVG, exports (PNG, PDF, SVG, CSV), atelier de dessin interactif |
| `js/app.js` | Écrans, navigation (`EE.Screens`), connexion, accueil ; expose `EE.app.ui` |
| `js/fx3d.js` | Inclinaison 3D des cartes (désactivée au tactile) |
| `build.py` | Assemble tout en `dist/yak-elec-pro.html` |
| `desktop/` | Lanceur **Windows** (Go) → `dist/Yak-elec-pro.exe` (section 7) |
| `tests/run_tests.py` | Tests d'acceptation (Playwright/Chromium) |
| `docs/` | README, ARCHITECTURE, GUIDE_UTILISATEUR, FEUILLE_DE_ROUTE, TESTS |

**Données** (localStorage) : `eep.users`, `eep.session`, `eep.projects.<uid>`, `eep.settings.<uid>`, `eep.config` (+ `eep.config.log`), `eep.quant.<uid>`, `eep.pv.<uid>`.
**Principe clé du dessin** : tout est sur une grille de 20 px ; deux éléments sont reliés **uniquement** par coïncidence exacte de points (jamais par proximité). Un seul « netlist » alimente vérification, simulation et rendu.
**Écrans** : s'enregistrent dans `EE.Screens.<nom>` et sont ajoutés dans la navigation de `app.js`.
**Calculs** : ce sont des **fonctions pures** (entrées → résultat), testables sans interface ; les écrans ne font qu'afficher.

## 4. Conventions de code
- JavaScript classique (ES2019 environ), IIFE `(function (g) { 'use strict'; const EE = g.EE; … })(window);`, pas de `import`.
- Échapper tout texte affiché avec `EE.esc`. Aucune donnée utilisateur dans `innerHTML` sans échappement.
- Couleurs via variables CSS (`--accent`, `--brand`, `--panel`…), compatibles thème sombre.
- Textes en **français**, décimales avec virgule à l'affichage, tests de non-régression pour chaque règle de calcul.
- Interface adaptée au **tactile** (cibles ≥ 38 px) et aux petits écrans (Android).
- Les prix, normes, symboles, règles doivent rester **modifiables dans le portail** (pas de valeurs codées en dur sans entrée de configuration).

## 5. Fonctions déjà réalisées (V1 → V1.5)
V1 comptes/projets/bibliothèque/atelier/vérification/exports • œil mot de passe • simulation (lampes, moteurs) • 30 symboles industriels • logo • quantitatif + coffret + portail sans code • liste des composants avec symboles • portail réservé à l'e-mail administrateur • images réalistes des appareils (téléversement de photos) • DPN/différentiels/connecteurs aux normes européennes • photovoltaïque (grille + dimensionnement automatique, valeurs standard, choix automatique du panneau et de la tension) • interface en relief 3D • 8 symboles de sources d'énergie • page Contact • lanceur Windows `.exe` avec icône • sources d'énergie • photovoltaïque moderne (lithium, onduleurs hybrides, 3 propositions) • onglet Bâtiment avec schéma architectural.

## 6. Construire et tester
```bash
python3 build.py                              # produit dist/yak-elec-pro.html
YAK_ADMIN_PW='<mot de passe admin>' python3 tests/run_tests.py             # tests sur index.html
YAK_ADMIN_PW='<mot de passe admin>' python3 tests/run_tests.py dist/yak-elec-pro.html
```
(Playwright + Chromium requis. Le mot de passe admin est demandé **à l'utilisateur au moment du test**, jamais stocké.) Dernier résultat complet connu : tous les tests passent sur `index.html` et `dist/yak-elec-pro.html`. Pour une modification, ajouter une section de tests (A…U existent) et mettre à jour `docs/TESTS.md`, `README.md` et `EE.VERSION`.

## 7. Produire les versions Ordinateur (Windows) et Android
### Windows 10 / 11 (`.exe`)
- Le lanceur `desktop/main.go` (Go, bibliothèque standard seulement) **embarque** `dist/yak-elec-pro.html`, le sert sur `127.0.0.1:47615`, ouvre une **fenêtre d'application Edge** (ou Chrome) avec un profil dédié (`%LOCALAPPDATA%\Yak-elec-pro\profil`) → comptes et projets conservés ; se ferme quand la fenêtre est fermée. Aucun Internet requis.
- Reconstruire : `python3 build.py && cp dist/yak-elec-pro.html desktop/app.html && cd desktop && CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -ldflags "-H=windowsgui -s -w" -o ../dist/Yak-elec-pro.exe .` (voir `desktop/construire_windows.sh`).
- Icône : `desktop/make_icon.py` génère `icone_windows_amd64.syso` (ressource COFF) et `yak-elec-pro.ico` depuis `assets/logo-ye.png` sans outil externe ; Go la lie automatiquement.
- À faire plus tard : installateur (Inno Setup / NSIS), signature de code (évite l'avertissement SmartScreen), alternative Tauri/Electron.
### Android
- **Immédiat** : ouvrir `yak-elec-pro.html` dans Chrome Android (fonctionne hors ligne).
- **APK** (à faire) : emballer `dist/yak-elec-pro.html` avec **Capacitor** (`npm i @capacitor/core @capacitor/cli @capacitor/android`, `npx cap init`, copier le HTML en `www/index.html`, `npx cap add android`, `npx cap build android` / Android Studio) — le code n'a pas à changer. Prévoir : icône, nom, `AndroidManifest` (aucune permission nécessaire), enregistrement/téléchargement de fichiers (plugin Filesystem/Share) car les exports « téléchargement » du navigateur se comportent différemment dans une WebView, liens `mailto:`/`wa.me` (ouvrir par `Browser`/`App` plugin). **Cette étape n'a pas été réalisée ni testée sur un appareil physique.**
- Alternative : PWA (manifest + service worker) hébergée en HTTPS.

## 7 bis. Limites connues
Comptes locaux (pas de synchronisation PC↔téléphone : utiliser export/import) • symboles simplifiés • vérification de connectivité + règles de quantitatif, pas de contrôle complet NF C 15-100 • PDF = image haute résolution • conducteurs orthogonaux uniquement • non testé sur Android physique • `.exe` non testé sur une machine Windows réelle (construit par compilation croisée ; la logique serveur a été testée sous Linux) • valeurs photovoltaïques et normes à valider.

## 8. Feuille de route (idées, à prioriser avec l'utilisateur)
1. Icône + installateur Windows ; APK Android (Capacitor) ; test sur appareils réels.
2. Schéma unifilaire du tableau généré automatiquement depuis le quantitatif ; chute de tension et bilan de puissance ; triphasé complet.
3. Règles de conformité NF C 15-100 (sections, protections, nombre de points par circuit) dans l'atelier.
4. Onduleur, inverseur de sources et couplage groupe/réseau dans la bibliothèque et la simulation ; sens des diodes ; étoile-triangle, inversion de sens.
5. Vue 3D du coffret / de l'installation ; plans d'implantation.
6. Comptes en ligne, classes enseignant-élèves, synchronisation (nécessite un serveur).
7. Cartouche personnalisable, feuilles multiples, PDF vectoriel.

## 9. Méthode de travail attendue de l'IA
1. **Lire** ce fichier, `docs/ARCHITECTURE.md`, puis les fichiers concernés (ne pas réécrire ce qui marche).
2. Résumer en une phrase ce qui va être fait ; en cas d'ambiguïté **coûteuse**, poser une question courte, sinon choisir la lecture raisonnable et l'indiquer.
3. Modifier le **minimum** de fichiers ; garder les anciennes données compatibles (migrations).
4. `python3 build.py` → tests → corriger → livrer `dist/yak-elec-pro.html` (+ `.exe`/APK si demandé) **et** le dossier source mis à jour (zip) **et** la nouvelle version dans `EE.VERSION`, README et docs.
5. Vérifier l'interface en la **regardant** (capture d'écran) pour les changements visuels, en clair et en sombre, ordinateur et mobile.
6. Conclure en français simple : ce qui change, ce qui est testé, ce qui reste à valider, et **une** suite possible.

## 10. Modèles de demandes (copier-coller)
- **Nouvelle fonction** : « Voici le projet Yak-élec-pro et son dossier IA. Ajoute : *[décris]*. Respecte les règles du dossier, teste, et donne-moi le fichier final prêt à l'emploi. »
- **Correction** : « Dans Yak-élec-pro, quand je *[action]*, il se passe *[problème]* au lieu de *[attendu]*. Corrige sans rien casser et ajoute un test. »
- **Nouveaux symboles/matériel** : « Ajoute ces appareils au catalogue et à la bibliothèque : *[liste avec caractéristiques ou photos]*. Mets les normes entre parenthèses et dis-moi lesquelles je dois valider. »
- **Android** : « Fabrique l'APK Android de Yak-élec-pro avec Capacitor à partir de dist/yak-elec-pro.html (icône du logo), en gérant l'export des fichiers et les liens e-mail/WhatsApp. Explique-moi comment l'installer. »
- **Windows** : « Ajoute l'icône du logo à Yak-elec-pro.exe et crée un installateur Windows (Inno Setup) avec raccourci bureau. »
- **Contrôle qualité** : « Relis tout le projet, lance les tests, liste les risques (sécurité, données, normes) et propose des corrections par ordre de priorité. »
- **Mise à jour d'un calcul** : « Voici la règle/norme à appliquer : *[texte ou extrait]*. Modifie le calcul de *[quantitatif | photovoltaïque]* et rends-la modifiable dans le portail. »

## 11. Liste de contrôle avant toute livraison
- [ ] Tests passent sur `index.html` **et** `dist/yak-elec-pro.html`
- [ ] Aucune erreur JavaScript dans la console
- [ ] Aucun mot de passe en clair ; portail réservé à l'administrateur
- [ ] Thème clair et sombre, mobile et ordinateur vérifiés visuellement
- [ ] Anciennes données conservées (migration)
- [ ] `EE.VERSION`, README, docs/TESTS mis à jour
- [ ] Limites et points à valider (normes, valeurs par défaut) indiqués à l'utilisateur


## Ajouts V1.9.0 – Contrôle à distance, PWA, Android
| Fichier | Rôle |
|---|---|
| `js/remote.js` | `EE.Remote` : lit `control.json` (fetch no-store, timeout 8 s), état en `localStorage eep.remote.state`, id appareil `eep.device`, écran `#yk-lock`, bandeau `#yk-upd`. Champs : blocked, blockedDevices, blockedUsers, message, latestVersion, minVersion, updateUrl, updateNotes, maxOfflineDays. |
| `js/portal.js` (`remoteTab`) | Onglet « Contrôle à distance » : générateur, aperçu, publication via API GitHub contents (jeton en mémoire seulement). |
| `build.py` | Intègre `window.YAK_CONTROL_URL` (env `YAK_CONTROL_URL` ou `controle/url.txt`), construit `dist/site/` (PWA). |
| `android/` | Projet Gradle WebView (`MainActivity.java`, pont `YakAndroid.saveBase64` utilisé par `EE.Export.download`), icônes via `android/make_icons.py`. |
| `.github/workflows/` | `android.yml` (APK debug), `site.yml` (publie `site/`). |
Règles : ne jamais stocker le jeton GitHub ni le mot de passe admin ; la fonction doit rester sans effet si aucune URL n'est configurée ; l'APK n'a jamais été compilé dans l'environnement initial (à valider). Priorité d'URL : `window.YAK_CONTROL_URL` > `EE.REMOTE_URL` > `Config.remote.url` > dérivée de github.io.
Tests : `python3 tests/remote_tests.py`.

| `js/fixer.js` | Assistant de dépannage : `EE.Fixer.suggest(doc)` → actions {issueId, label, safe, apply(doc)} ; `autoFix(doc)` applique les actions sûres (multi-passes). `EE.Engine.HELP` = titres et « comment corriger » par code d'anomalie. `editor.mutate(fn)` = modification avec historique (annulable). |
