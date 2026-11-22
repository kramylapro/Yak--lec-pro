# Contrôle à distance et version Android – Yak-élec-pro V1.9.0

## 1. Principe (simple)
L'application reste **hors ligne**. Quand un appareil a Internet, elle lit un petit fichier **control.json** que **vous seul** pouvez modifier (hébergé sur GitHub). Selon son contenu :
- **Blocage** : toutes les copies, ou un appareil précis, ou un compte précis → écran « Application bloquée » avec votre message et vos boutons e-mail/WhatsApp.
- **Mise à jour** : un bandeau « Mise à jour 2.0.0 disponible » avec lien de téléchargement (ou mise à jour **obligatoire** : blocage tant que la version minimale n'est pas installée).
- **Blocage automatique** si l'appareil reste sans Internet plus de N jours (facultatif).
Sans Internet, l'appareil garde son **dernier état connu** (bloqué reste bloqué).

## 2. Mise en place (une seule fois, ~10 minutes, depuis un téléphone ou un PC)
1. Créez un compte gratuit sur github.com, puis un dépôt (ex. `yak-elec-pro`), **public**.
2. Envoyez-y tout le dossier du projet (fichier ZIP du projet → « Upload files »).
3. Dans le dépôt : **Actions → « Publier le site » → Run workflow**. Cela crée le dossier `site/` (application web installable + `control.json`).
4. Dans **Settings → Pages**, choisissez la branche `main` et le dossier `/site` : votre application en ligne est alors à l'adresse `https://VOTRE-COMPTE.github.io/yak-elec-pro/`.
5. L'adresse de contrôle est : `https://raw.githubusercontent.com/VOTRE-COMPTE/yak-elec-pro/main/site/control.json`.
6. **Intégrez cette adresse aux applications distribuées** : dites-moi votre compte et le nom du dépôt et je refabrique le .exe ; pour Android et le site, les workflows le font automatiquement.

## 3. Bloquer / débloquer / proposer une mise à jour (de n'importe quel appareil)
**Méthode A – dans l'application** : Portail administrateur → **📡 Contrôle à distance**. Remplissez le formulaire, vérifiez l'**Aperçu du blocage**, puis **Publier maintenant** (compte, dépôt, jeton GitHub). Le jeton n'est jamais enregistré.
**Méthode B – sans l'application** : sur github.com (navigateur du téléphone), ouvrez `site/control.json` → ✏ modifier → enregistrer (« Commit »). Exemple :
```json
{ "blocked": false,
  "message": "Application suspendue. Contactez le concepteur.",
  "blockedDevices": ["YE-AB12-CD34"],
  "blockedUsers": ["eleve12"],
  "latestVersion": "2.0.0",
  "updateUrl": "https://github.com/COMPTE/DEPOT/releases/latest",
  "updateNotes": "Nouveaux symboles et dimensionnement amélioré",
  "minVersion": "",
  "maxOfflineDays": 0 }
```
Pour tout bloquer : `"blocked": true`. Pour débloquer : `false`. Délai d'application : environ 5 à 15 minutes (cache GitHub + vérification toutes les 15 min).
**Jeton GitHub** : GitHub → Settings → Developer settings → Fine-grained tokens → limité à ce seul dépôt, permission « Contents : Read and write », durée courte.

## 4. Identifiant d'appareil
Chaque appareil a un identifiant `YE-XXXX-XXXX` (écran de blocage et portail). Un élève vous le communique, vous l'ajoutez à `blockedDevices`.

## 5. Limites honnêtes
- C'est une protection **dissuasive côté application** : quelqu'un de très habile peut la contourner (ex. empêcher la lecture du fichier avant sa première connexion, ou modifier le code).
- Un appareil **jamais connecté à Internet** ne peut pas être bloqué. Les copies **déjà distribuées avant V1.9.0** ne contiennent pas ce mécanisme : il faut redistribuer la nouvelle version.
- Dépôt public = `control.json` lisible par tous (n'y mettez rien de secret).
- Le blocage « N jours sans Internet » bloque aussi les élèves honnêtes sans connexion : à utiliser avec prudence.

## 6. Android
Trois voies, de la plus simple à la plus complète :
1. **Site installable (PWA)** : ouvrez l'adresse de l'étape 2.4 dans Chrome Android → menu ⋮ → **Ajouter à l'écran d'accueil / Installer l'application**. Fonctionne ensuite hors ligne, contrôle à distance inclus. *Aucun APK nécessaire.*
2. **APK (fichier .apk)** : dans le dépôt, **Actions → « Construire l'application Android » → Run workflow** ; au bout de ~5 min, téléchargez `Yak-elec-pro-android` (contient `app-debug.apk`). Sur le téléphone : autorisez « Installer des applications inconnues » puis ouvrez l'APK. Les exports (PDF, PNG…) vont dans `Téléchargements/Yak-elec-pro`.
3. **Fichier HTML seul** : ouvrir `yak-elec-pro.html` dans Chrome Android (sans installation ; contrôle à distance seulement si l'adresse y est intégrée).
⚠ Le projet Android (`android/`) n'a **pas pu être compilé dans l'environnement de création** (pas de SDK Android) : il suit la structure standard mais doit être validé au premier lancement du workflow. En cas d'erreur, copiez le message d'erreur à l'IA avec le fichier `CLAUDE.md`.
