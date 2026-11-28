/* Yak-élec-pro – Téléchargement de l'application Android depuis le site (V1.13).
   Le fichier APK est fabriqué par GitHub (workflow « Construire l'application Android ») et publié dans la
   « Release » fixe nommée « android » du dépôt : son adresse ne change jamais.
   Ordre de priorité de l'adresse : control.json (androidUrl) > adresse intégrée à la fabrication (YAK_APK_URL) > adresse par défaut.
   Le bouton n'apparaît que sur le site web (pas dans l'application Android elle-même, ni dans l'application Windows). */
(function (g) {
  'use strict';
  const EE = g.EE;
  const DEFAULT_URL = 'https://github.com/kramylapro/Yak--lec-pro/releases/download/android/Yak-elec-pro.apk';
  const okUrl = (u) => /^https:\/\/\S+$/i.test(String(u || '').trim()) ? String(u).trim() : '';
  function ctl() { try { return ((EE.Remote ? EE.Remote.state() : JSON.parse(localStorage.getItem('eep.remote.state') || '{}')) || {}).ctl || {}; } catch (e) { return {}; } }
  function url() { return okUrl(ctl().androidUrl) || okUrl(g.YAK_APK_URL) || DEFAULT_URL; }
  function isAndroidApp() { return !!g.YakAndroid || /; wv\)/.test(navigator.userAgent || ''); }
  function show() {
    if (isAndroidApp()) return false;
    return /^https?:$/.test(location.protocol) && !/^(127\.|localhost$|\[?::1)/.test(location.hostname);
  }
  const onAndroid = () => /Android/i.test(navigator.userAgent || '');
  function button(id, cls) { return show() ? `<button type="button" class="btn ${cls || ''} apkbtn" id="${id}">📱 Télécharger l'application Android</button>` : ''; }
  function steps() {
    return `<ol class="small steps">
      <li>Touchez <b>Télécharger l'APK</b> ci-dessous${onAndroid() ? '' : ' (ou ouvrez ce site sur le téléphone)'}. Le fichier <b>Yak-elec-pro.apk</b> arrive dans les <b>Téléchargements</b>.</li>
      <li>Ouvrez le fichier. Si Android affiche « Pour votre sécurité… », touchez <b>Paramètres</b> puis autorisez <b>Installer des applications inconnues</b> pour le navigateur, et revenez.</li>
      <li>Touchez <b>Installer</b>. Si Play Protect affiche un avertissement, choisissez <b>Installer quand même</b> (l'application ne vient pas du Play Store).</li>
      <li>Ouvrez <b>Yak-élec-pro</b> depuis l'écran d'accueil : elle fonctionne aussi sans Internet.</li></ol>
      <p class="small muted">Vos comptes et projets du site ne passent pas automatiquement dans l'application : exportez vos projets (fichier .json) puis importez-les dans l'application. Android 7 ou plus récent.</p>`;
  }
  async function open() {
    const u = url();
    const ui = EE.app && EE.app.ui;
    const body = `${steps()}<div class="btnrow center"><a class="btn primary big" id="apk-go" href="${EE.esc(u)}" download="Yak-elec-pro.apk" rel="noopener">⬇ Télécharger l'APK</a></div>`;
    if (ui && ui.modal) return ui.modal({ title: '📱 Application Android', body, buttons: [{ label: 'Fermer', value: null }] });
    g.location.href = u;
  }
  function bind(root) { (root || document).querySelectorAll('.apkbtn').forEach((b) => (b.onclick = open)); }
  EE.AndroidDL = { url, show, button, open, bind, steps, DEFAULT_URL, isAndroidApp };
})(window);
