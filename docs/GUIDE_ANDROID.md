# Télécharger l'application Android depuis le site (V1.13)

## Ce que voient les visiteurs du site
- Sur l'**écran de connexion** du site (et dans **Paramètres › À propos**) : bouton **📱 Télécharger l'application Android**.
  Il ouvre une fenêtre avec les étapes d'installation et le bouton **⬇ Télécharger l'APK**.
- Une page à partager (WhatsApp, affiche, QR code) : **`android.html`** à côté du site,
  par exemple `https://yak-elec-pro.netlify.app/android.html`.
- Le bouton n'apparaît pas dans l'application Android elle-même, ni dans l'application Windows, ni dans le fichier HTML ouvert en local.

## D'où vient le fichier APK
Le workflow GitHub **« Construire l'application Android (APK) »** fabrique l'APK et le publie dans la **Release fixe « android »** du dépôt :

`https://github.com/<compte>/<dépôt>/releases/download/android/Yak-elec-pro.apk`

Cette adresse ne change jamais : à chaque nouvelle fabrication, le fichier est simplement remplacé.
Le workflow se lance tout seul quand le code de l'application change sur GitHub (dossiers js, css, android…),
ou à la main : onglet **Actions › Construire l'application Android (APK) › Run workflow**.

**Le dépôt doit être public** pour que tout le monde puisse télécharger le fichier de la Release.

Autre adresse (Google Drive, autre site…) : portail › **📡 Contrôle à distance** › champ
« Lien de téléchargement de l'application Android », puis **Publier** (champ `androidUrl` de `control.json`).

## Site Netlify
Si le site Netlify est mis à jour par glisser-déposer (Netlify Drop), déposez **tout le dossier `dist/site`**
(il contient maintenant `android.html`). L'APK lui-même reste sur GitHub : pas besoin de le déposer sur Netlify.

## Signature de l'APK (conseillé, une seule fois)
Android n'accepte de mettre à jour une application que si la nouvelle version est signée avec **la même clé**.
Sans clé enregistrée, GitHub signe avec une clé de test qui change à chaque fabrication : pour installer une nouvelle
version, il faut alors **désinstaller l'ancienne** (après avoir exporté ses projets).

Pour une clé fixe et privée :
1. Sur un ordinateur avec Java (JDK Temurin) : `keytool -genkeypair -keystore yak.keystore -alias yak -keyalg RSA -keysize 2048 -validity 10000`
   (choisir un mot de passe). **Garder ce fichier et ce mot de passe en lieu sûr, pour toujours.**
2. Convertir le fichier en texte (PowerShell) : `[Convert]::ToBase64String([IO.File]::ReadAllBytes("yak.keystore")) | Set-Clipboard`
3. GitHub › dépôt › **Settings › Secrets and variables › Actions › New repository secret** :
   `YAK_KEYSTORE_B64` (le texte copié), `YAK_KEYSTORE_PASSWORD` (le mot de passe), `YAK_KEY_ALIAS` (`yak`).
4. Relancer le workflow Android. Ne jamais mettre la clé ni le mot de passe dans le code ou dans un message.
