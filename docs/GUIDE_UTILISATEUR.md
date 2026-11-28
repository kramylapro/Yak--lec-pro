# Guide utilisateur – Yak-élec-pro V1

## Démarrer
1. Créer un compte (nom + mot de passe) puis se connecter.
2. **Nouveau projet** : nom, type d'installation, type de schéma (développé, unifilaire, multifilaire).
3. L'**atelier** s'ouvre : symboles à gauche, feuille au centre, propriétés / rapport à droite.

## Dessiner
| Action | Comment |
|---|---|
| Déposer un symbole | cliquer un symbole dans la liste, puis cliquer sur la feuille (Échap pour arrêter) |
| Tracer un conducteur | outil **Conducteur** (touche W) : clic sur une borne, clics aux points suivants, fin sur une borne (ou double-clic / Entrée). **X** change le sens du coude |
| Dérivation (T) | terminer sur un conducteur existant : une **jonction** est ajoutée automatiquement |
| Déplacer | glisser un composant (les conducteurs attachés suivent) ; flèches = pas d'une case |
| Pivoter | R ou bouton |
| Copier / coller / dupliquer | Ctrl+C, Ctrl+V, Ctrl+D |
| Supprimer | Suppr |
| Annuler / rétablir | Ctrl+Z / Ctrl+Y |
| Zoom / déplacer la feuille | molette (ou pincer) / glisser dans le vide (Maj+glisser = sélection par zone) |
| Identification et valeur | sélectionner le composant → panneau « Propriétés » |
| Unifilaire | sélectionner un conducteur → nombre de conducteurs (PE compris) et désignation (3G1,5) |

L'enregistrement est **automatique** (indication en bas à droite).

## Règle essentielle
Deux fils qui se croisent **ne sont pas connectés**. Pour relier, terminer sur une borne ou placer une **Connexion**.

## Vérifier mon schéma
Le bouton produit un rapport : fils non raccordés, bornes libres, circuits ouverts, court-circuits, connexions ambiguës, composants non identifiés. Chaque anomalie est numérotée et localisée sur la feuille (clic sur la ligne pour la voir). Orange = borne libre, vert = borne reliée.

## Exporter
Menu « Exporter » : **PDF**, **SVG**, **PNG** (avec cartouche) et **Projet (.json)** pour sauvegarder ou transférer ; « Importer » dans « Mes projets ».

## Simuler un schéma (V1.1)
1. Dessinez et vérifiez votre schéma. 2. Cliquez sur **▶ Simuler**. 3. Cliquez sur les interrupteurs ; maintenez appuyés les boutons-poussoirs. 4. **■ Arrêter** pour revenir à l'édition.
Convention industrielle : une bobine (KM1) et ses contacts (13/14, 21/22) portent le **même repère** ; c'est ce qui les relie.
Symboles industriels : onglet Bibliothèque, catégories « Industriel ».

## Quantitatif et coffret (V1.2)
1. Menu **Quantitatif**. Ajoutez vos pièces (dimensions, distance au coffret, nombre de points lumineux, interrupteurs, va-et-vient, prises) puis les appareils spécialisés (cuisinière, chauffe-eau…).
2. Le matériel, les circuits, les protections et le coffret s'affichent immédiatement. **Exporter en CSV** ouvre le tableau dans Excel ; **Imprimer / PDF** produit le devis.
3. Les prix sont à 0 tant qu'ils n'ont pas été saisis dans le Portail.

## Portail administrateur (V1.2)
- Le portail n'est visible que pour le compte dont le nom d'utilisateur est l'adresse e-mail administrateur (kramylapro@gmail.com). Ce compte ne peut être créé qu'avec le mot de passe administrateur, qui est redemandé à chaque ouverture du portail (blocage 30 s après 5 essais).
- **Apparence et textes** : nom, slogan, accueil, coordonnées de l'entreprise, couleurs, logo.
- **Catalogue et prix** : modifiez un prix en cliquant dessus ; ajoutez des articles ; « Exporter » puis « Importer » un fichier CSV pour travailler dans Excel.
- **Règles de calcul** : nombre de prises par circuit, calibres, sections, réserve du coffret, chutes, main-d'œuvre…
- **Fiches des symboles** : adaptez les textes à votre cours.
- **Sauvegarde et mise à jour** : téléchargez la configuration, importez-la sur un autre appareil, rétablissez les réglages d'origine.

## Photovoltaïque (V1.3)
1. Menu **Photovoltaïque**. Choisissez *Site isolé* ou *Raccordé au réseau*.
2. **Seules informations obligatoires** : le type d'installation et, pour chaque appareil, la puissance (W), la quantité et les heures d'utilisation par jour. Tout le reste est automatique (valeurs moyennes usuelles) : 4,5 kWh/m²/jour de soleil, Tmin 15 °C, cellules 65 °C, autonomie 2 jours, simultanéité 0,7, batteries plomb, tension 12/24/48 V selon la puissance, panneau choisi automatiquement, distances 10/2/1/10 m. On peut les modifier dans *Réglages avancés* ; le résultat affiche les « Valeurs retenues » (standard ou saisies).
3. **Propositions** : trois solutions sont comparées (Économique, Équilibrée, Moderne = lithium + onduleur hybride) ; un clic sur « Choisir cette solution » l'applique. Le dimensionnement et le matériel s'affichent en direct ; exportez en CSV ou imprimez.
4. Les caractéristiques des panneaux, régulateurs, onduleurs, batteries et leurs prix se règlent dans le Portail › Photovoltaïque.


## Appareils bipolaires (phase + neutre)
Dans la Bibliothèque, catégorie **Protection** : sectionneur bipolaire, sectionneur porte-fusibles bipolaire, disjoncteur bipolaire et disjoncteur différentiel bipolaire. Pôle 1-2 = phase, pôle 3-4 = neutre. En simulation, un clic ouvre/ferme l'appareil ; un court-circuit fait déclencher le disjoncteur ou fondre les fusibles.

## Commandes du bâtiment (catégorie Commande)
- **Interrupteur crépusculaire** : contact fermé la nuit. En simulation, un clic = « la nuit tombe », un second clic = « le jour se lève ».
- **Télérupteur** : bobine A1-A2 alimentée par des boutons-poussoirs ; chaque impulsion allume ou éteint la lampe (donner un repère, ex. TL1).
- **Minuteur d'éclairage** : un clic = impulsion ; la lampe reste allumée pendant la durée écrite dans « Valeur » (ex. 30 s).

## Rapport d'erreurs clair et feuille ajustable (V1.9.1)
- **✔ Vérifier mon schéma** : chaque anomalie a un titre, le problème et un encadré vert « 🛠 Comment corriger ». Les erreurs sont classées avant les avertissements ; cliquez sur une ligne pour voir le repère numéroté sur la feuille.
- **Agrandir / réduire la feuille** : boutons − et +, curseur de zoom, bouton « 100 % », molette ou pincement. **Ajuster** cadre le dessin.
- **⛶ Plein écran** : la feuille occupe tout l'écran (Échap pour quitter).
- **Panneaux redimensionnables** : glissez la barre verticale entre la liste des symboles / le panneau de droite et la feuille ; double-clic = largeur d'origine.

## 🛠 Réparer : résoudre les problèmes de raccordement (V1.9.3)
- Bouton **🛠 Réparer** (barre d'outils) ou **Corriger automatiquement** dans le rapport : applique les corrections sûres en une fois (Ctrl+Z pour annuler) – fil prolongé jusqu'à la borne voisine (≤ 4 carreaux), connexion (point) ajoutée aux jonctions ambiguës, repères manquants ou en double, symbole Terre ajouté sous une borne PE libre, jonction isolée supprimée.
- Sous chaque erreur, un bouton propose la correction adaptée. Les corrections **à confirmer** (⚠) demandent votre accord : suppression d'un fil inutile, liaison à la borne libre la plus proche.
- Ce qui reste (court-circuit, récepteur mal alimenté, phase/neutre inversés…) nécessite votre jugement : suivez « Comment corriger ».

- **Sur la feuille** : après « Vérifier », cliquez sur un cercle numéroté rouge/orange : une bulle explique l'erreur et propose « 🛠 Corriger automatiquement ».


## Nouveautés V1.10
### Atelier
- **Menus** en haut de la feuille : Fichier (nouveau, ouvrir, enregistrer, renommer, dupliquer, ranger dans un dossier, imprimer, exporter), Édition, Affichage, Insertion (textes, titres, commentaires, repères, nouvelle feuille), Simulation (lancer, pause, réinitialiser, arrêter), Outils (vérifier, réparer, calculs, pédagogie), Aide (raccourcis).
- **Feuilles** : « ＋ Feuille » ajoute une feuille au projet (ex. « Puissance » et « Commande ») ; cliquez sur un onglet pour changer de feuille, double-cliquez pour le renommer, × pour supprimer.
- **⇋ Retourner** (touche M) : miroir du composant sélectionné. **Déplacer un fil** : cliquez sur le fil puis tirez-le ; ses deux bouts restent sur leurs bornes.
- **Texte, titre, commentaire, repère** : catégorie *Annotations* ou menu Insertion ; écrivez le texte dans le panneau Propriétés.
### Simulation
- **⏸ Pause** fige les temporisations ; **Tensions et courants calculés** : tableau U / P / I pour chaque récepteur alimenté (indiquez la puissance dans « Valeur », ex. 100 W, 1,5 kW).
- **Automate / relais logique** : écrivez le programme dans « Programme », ex. `Q1 = (I1 OU Q1) ET NON I2 ; Q2 = I3`. Les entrées sont actives quand elles reçoivent la phase ; les sorties ferment le contact C-Qn.
### Exemples, calculs, pédagogie
- **Exemples** : 12 circuits complets ; « Voir la fiche » (schéma, composants, fonctionnement, étapes, exercices, test), « Ouvrir dans l'atelier » pour les modifier et les simuler.
- **Calculs** : remplissez les cases ; le résultat, la formule et les unités s'affichent aussitôt.
- **Pédagogie** : choisissez « élève » ou « enseignant ». Élève : cours, quiz des symboles, exercices (Commencer → câbler → Outils › Corriger mon exercice → Remettre mon travail : un fichier est téléchargé, à envoyer à l'enseignant). Enseignant : créer un exercice à partir d'un exemple ou d'un de ses projets (le projet sert de corrigé), l'exporter pour les élèves, importer et recorriger les copies, ajouter ses cours.
### Projets, impression
- **Mes projets** : « ＋ Nouveau dossier », bouton « Ranger » sur chaque projet, filtres par dossier.
- **Exporter… › Imprimer / PDF mis en page** : format A4/A3/A2, orientation, toutes les feuilles, cartouche (titre, auteur, date, n° de feuille, échelle), aperçu ; « Télécharger le PDF » ou « Imprimer ». **Exporter › DXF** : fichier pour AutoCAD / LibreCAD (1 carreau = 5 mm, ou 25 cm pour un plan).

### Fenêtres de l'atelier (V1.10.1)
Les Symboles, la Feuille de dessin et le Panneau ont chacun une barre de titre avec ― (réduire) et ☐ (agrandir). Une fenêtre réduite devient une fine bande verticale : cliquez dessus pour la rouvrir. Double-cliquez sur une barre de titre pour l'agrandir à tout l'écran de travail, puis ❐ pour restaurer. Tirez la séparation entre deux fenêtres pour changer leur largeur. Menu Affichage › « Rétablir la disposition des fenêtres » remet tout comme au départ.

### Onglet « Matériel » (V1.10.2)
Dans la barre du haut, cliquez sur **Matériel ▾** : les sous-titres **Quantitatif** et **Composants** apparaissent juste en dessous ; cliquez sur celui que vous voulez.

### Onglet « Accueil » (V1.10.3)
Cliquez sur **Accueil ▾** : vous y trouvez la page d'accueil, les **Paramètres**, le **Portail administrateur** (uniquement sur le compte administrateur) et **Déconnexion**. Le nom du compte connecté est affiché en haut de la liste. Le logo ramène toujours directement à la page d'accueil.

### Contenu au clic et présentation (V1.10.4)
Un clic sur « Accueil ▾ » ou « Matériel ▾ » affiche directement le contenu du premier sous-titre et ouvre la liste des autres. Le Portail administrateur commence par un texte de présentation de l'application, que vous pouvez réécrire dans Portail › Apparence et textes › « Texte de présentation ».

### Pages « Accueil » et « Matériel » (V1.10.5)
Les contenus des sous-titres s'affichent les uns sous les autres : descendez avec la molette (ou le doigt) pour passer du Quantitatif aux Composants, ou de l'accueil aux Paramètres. Les liens « ↕ » à droite de chaque bandeau-titre sautent directement à l'autre partie.

### Schéma d'une fiche d'exemple (V1.10.7)
Le schéma est affiché en entier. « + » et « − » zooment (faites ensuite défiler), « Tout voir » revient au schéma entier, « ⛶ Plein écran » l'affiche sur tout l'écran (Échap ou ✕ Fermer pour revenir).

## Bureau d'études BT (V1.11)
1. Cliquez sur **Bureau d'études** dans la barre du haut, puis **＋ Nouvelle étude** : remplissez l'assistant (seul le nom est obligatoire ; laissez vide ce que vous ne connaissez pas). Pour découvrir, cliquez sur **Créer l'étude d'exemple**.
2. À gauche, l'**explorateur** montre le TGBT, ses départs, les tableaux divisionnaires et les circuits (pastille verte = conforme, orange = à vérifier, rouge = non conforme, grise = données manquantes).
3. Sélectionnez un tableau puis **+ Circuit** (ruban) ; à droite, dans les **propriétés**, indiquez le type, la longueur, le mode de pose et les récepteurs (puissance, nombre). **+ Départ** crée un nouveau tableau divisionnaire alimenté par le tableau sélectionné.
4. Le calcul se fait tout seul. Onglet **Calculs et protections** : cliquez sur une ligne pour voir la note de calcul pas à pas (Ib, calibre, Iz, section, chute de tension, Icc, protection) et les autres solutions possibles.
5. Les onglets **Répartition**, **Enveloppe**, **Vue 2D**, **Vue 3D**, **Thermique** organisent le tableau ; **Nomenclature et chiffrage**, **Étiquettes**, **Dossier et exports** produisent les documents (PDF, Excel, CSV, schéma unifilaire dans l'atelier).
6. Les prix sont à saisir (dans la nomenclature ou la bibliothèque) ou à importer depuis le tarif de votre fournisseur (Bibliothèque › Importer un tarif).
Rappel : les résultats doivent être validés par une personne qualifiée ; les tableaux de calcul sont à vérifier sur l'édition des normes en vigueur dans votre pays.
