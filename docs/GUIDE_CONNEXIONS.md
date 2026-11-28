# Voir le nombre de personnes connectées (V1.12)

Le portail administrateur a un nouvel onglet **👥 Connexions**. Il affiche :
- le nombre de personnes **connectées maintenant** (application ouverte, signal reçu depuis moins de 2 min 30 s) ;
- les appareils actifs **aujourd'hui**, sur **7 jours** et sur **30 jours**, le **total** des appareils et les **nouveaux** de la semaine ;
- la répartition par **plateforme** (Windows, Android, site web, fichier HTML) et par **version** ;
- la liste des appareils (utilisateur, identifiant d'appareil, plateforme, version, dernière activité, première utilisation), avec **export CSV**.

## Comment ça marche
L'application fonctionne hors ligne : il faut un petit service en ligne pour recevoir les signaux. On utilise
**Firebase Realtime Database** (Google, offre gratuite « Spark »). Chaque copie ouverte et connectée à Internet envoie
toutes les 60 secondes : identifiant d'appareil, nom d'utilisateur du compte ouvert, plateforme, version. Rien d'autre.
Les utilisateurs en sont informés sur l'écran de connexion. Seul le compte Firebase de l'administrateur peut lire les données
(règles de la base). Le mot de passe Firebase n'est jamais enregistré dans l'application.

## Installation (une seule fois, environ 10 minutes)
1. Ouvrir **console.firebase.google.com** avec le compte Google du propriétaire → **Créer un projet** (nom : yak-elec-pro).
2. **Build › Authentication › Commencer** → activer **E-mail/Mot de passe** → onglet **Users › Ajouter un utilisateur** :
   l'e-mail administrateur de l'application et un mot de passe (différent de celui du portail, conseillé).
3. **Build › Realtime Database › Créer une base de données** → emplacement Europe → **mode verrouillé**. Copier l'adresse
   (https://….firebasedatabase.app).
4. Onglet **Règles** de la base → coller les règles affichées dans le portail (bouton « Copier les règles ») → **Publier**.
5. **⚙️ Paramètres du projet** → copier la **Clé API Web**.
6. Dans le portail, onglet **👥 Connexions** : coller l'adresse et la clé → **Enregistrer** → **Envoyer un signal de test**.
7. Onglet **📡 Contrôle à distance** → **Publier maintenant** : l'adresse et la clé sont ajoutées à `control.json`
   (`statsUrl`, `statsKey`) ; toutes les copies V1.12 et suivantes connectées à Internet commencent à envoyer leur signal.

## Limites
- Un appareil hors ligne n'est pas compté (il le sera à sa prochaine connexion).
- Les versions antérieures à la V1.12 n'envoient rien : distribuer la V1.12.
- La clé API Web et l'adresse de la base sont publiques par nature (comme chez tous les sites Firebase) : la protection
  repose sur les règles de la base (écriture limitée et validée, lecture réservée à l'administrateur). Quelqu'un de mal
  intentionné pourrait envoyer de faux signaux : les chiffres sont des indicateurs, pas une preuve.
- Offre gratuite Firebase : largement suffisante pour quelques centaines d'utilisateurs (vérifier les quotas en vigueur).
