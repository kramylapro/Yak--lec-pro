# Architecture – Yak-élec-pro V1

## Choix techniques
- **Application web (HTML/JS/SVG)** : un seul code pour ordinateur et Android, hors-ligne, sans dépendance externe. Emballable en APK (Capacitor) ou en application bureau (Electron/Tauri) sans changer le code.
- **Modules classiques sous un espace de noms `EE`** (pas de modules ES) : fonctionne en double-clic (`file://`).
- **Séparation stricte** : données (`store`) / modèle de symboles (`library`) / logique électrique (`engine`) / dessin (`render`) / interaction (`editor`) / écrans (`app`).

## Modèle de données (projet)
```json
{ "id":"p…", "owner":"u…", "name":"…", "install":"Résidentiel", "schema":"developpe|unifilaire|multifilaire",
  "created":0, "modified":0, "opened":0, "view":{"x":80,"y":80,"k":1},
  "doc":{ "comps":[{"id":"c…","type":"interrupteur","x":100,"y":200,"rot":0,"label":"S1","val":""}],
          "wires":[{"id":"w…","pts":[[100,100],[100,160]],"n":1,"desig":""}] } }
```
Toutes les coordonnées sont des multiples du pas de grille (20 px) : la connexion repose sur la **coïncidence exacte** de points, jamais sur une proximité approximative.

## Bibliothèque (`library.js`)
Chaque symbole déclare : `term` (bornes et position), `body(c, mode)` (dessin SVG), et son **comportement électrique** :
`loads` (bornes d'alimentation d'un récepteur), `sw` (organes de coupure : contact potentiellement fermé), `pa` (dipôles passifs en série), `src`/`srcFn` (potentiel imposé : L1/L2/L3, N, PE, secondaire d'un transformateur), `junction`, `cross`.
Ajouter un symbole = ajouter une entrée (aucun autre fichier à modifier).

## Moteur de connexion (`engine.js`)
Union-find sur les bornes et les conducteurs. Deux éléments sont reliés **uniquement** si : extrémité de conducteur sur une borne ; deux extrémités coïncidentes ; deux bornes coïncidentes ; une « Connexion » (jonction) sur le point, y compris sur un conducteur qui passe. **Un croisement n'est jamais une connexion.** Un conducteur qui touche le milieu d'un autre sans jonction est signalé « ambigu ».

## Vérification
1. Identification des composants (absente / en double).
2. Conducteurs isolés, fils non raccordés, contacts ambigus.
3. Bornes sans connexion.
4. Court-circuits : plusieurs potentiels reliés par des conducteurs et organes de coupure seulement.
5. Récepteurs : chaque borne d'alimentation doit atteindre un potentiel (en traversant organes de coupure et dipôles passifs) et les potentiels doivent être distincts → « circuit ouvert » ou « même potentiel ».
6. Bornes de terre.
Résultat : liste `{sev, code, msg, x, y, ref}` localisée sur la feuille.

## Extension prévue (moteurs futurs)
`EE.Engine.analyze(doc)` fournit réseaux, bornes et arêtes internes : base pour un moteur de simulation (états des contacts, propagation) et pour des règles de conformité (NF C 15-100 : sections, protections, nombre de points par circuit). Les vérifications futures s'ajoutent comme fonctions `(doc, A) → issues[]`.

## Données et sécurité
Comptes et projets dans `localStorage` du navigateur (par appareil). Mots de passe hachés (SHA-256 + sel) : **protection d'usage entre élèves, pas une sécurité forte**. Sauvegarde/transfert : export/import de projet `.json`.

## V1.1
- `js/library_ind.js` : 30 symboles industriels (catégories « Industriel – … »), enregistrés via `EE.Library.add`.
- `js/sim.js` : simulation (`EE.Sim.create(doc)`), même netlist que la vérification ; table `DEV` (états, clics, contacts fermés) ; contacts liés à la bobine de même repère ; `view` = état pour le rendu (`render.js`, `editor.js`).

## V1.2
- `js/config.js` : configuration (marque, monnaie, règles, appareils spécialisés, catalogue, fiches symboles) fusionnée avec les valeurs par défaut, stockée sous `eep.config` ; administrateur sous `eep.admin` ; journal `eep.config.log`. `EE.Config.apply()` applique couleurs, titre, logo et fiches.
- `js/quant.js` : `EE.Quant.compute(étude, config)` — fonction pure : circuits, câbles, conduits, appareillage, protections, coffret (placement par rangées), totaux ; `toCSV`.
- `js/quant_ui.js` : écran Quantitatif (études enregistrées sous `eep.quant.<utilisateur>`). `js/portal.js` : écran Portail. Les écrans s'enregistrent dans `EE.Screens`.
