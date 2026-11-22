/* Yak-élec-pro – contrôle à distance : blocage, message et proposition de mise à jour.
   L'application (hors ligne par défaut) lit, quand Internet est disponible, un petit fichier « control.json »
   que seul le propriétaire peut modifier (hébergé par exemple sur GitHub). Dernier état connu conservé hors ligne.
   Limite : protection côté application (dissuasive), pas une sécurité absolue. */
(function (g) {
  'use strict';
  const EE = g.EE, K_DEV = 'eep.device', K_ST = 'eep.remote.state', K_SKIP = 'eep.remote.skip';
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cmp = (a, b) => { const x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0 ? 1 : -1; } return 0; };
  const DEFAULT_MSG = 'Cette application a été désactivée par son concepteur. Pour la réactiver, contactez-le.';
  let timer = null, previewing = null, lastApplied = '';

  function deviceId() {
    let d = ls.get(K_DEV, null);
    if (!d) { const r = () => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0'); d = 'YE-' + r() + '-' + r(); ls.set(K_DEV, d); }
    return d;
  }
  function controlURL() {
    if (g.YAK_CONTROL_URL) return String(g.YAK_CONTROL_URL);
    if (EE.REMOTE_URL) return EE.REMOTE_URL;
    const c = (EE.Config && EE.Config.get().remote) || {}; if (c.url) return c.url;
    if (/^https?:$/.test(location.protocol) && !/^(127\.|localhost|\[?::1)/.test(location.hostname)) {
      const m = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname), repo = location.pathname.split('/').filter(Boolean)[0];
      if (m && repo) return `https://raw.githubusercontent.com/${m[1]}/${repo}/main/site/control.json`;
      return new URL('control.json', location.href).href;
    }
    return '';
  }
  const state = () => ls.get(K_ST, { ctl: null, at: 0, ok: false, error: '' });
  const user = () => { try { return (EE.Store.Users.current() || {}).name || ''; } catch (e) { return ''; } };

  // décision à partir d'un fichier de contrôle
  function evalCtl(ctl, now) {
    const out = { blocked: false, reason: '', message: '', update: null, mustUpdate: false };
    if (!ctl || typeof ctl !== 'object') return out; now = now || Date.now();
    const me = deviceId(), u = user().toLowerCase();
    const list = (a) => (Array.isArray(a) ? a.map((x) => String(x).trim().toLowerCase()) : []);
    if (ctl.blocked === true) Object.assign(out, { blocked: true, reason: 'all' });
    else if (list(ctl.blockedDevices).includes(me.toLowerCase())) Object.assign(out, { blocked: true, reason: 'device' });
    else if (u && list(ctl.blockedUsers).includes(u)) Object.assign(out, { blocked: true, reason: 'user' });
    if (!out.blocked && ctl.maxOfflineDays > 0) { const st = state(); if (st.lastOk && now - st.lastOk > ctl.maxOfflineDays * 864e5) Object.assign(out, { blocked: true, reason: 'offline' }); }
    out.message = String(ctl.message || (out.reason === 'offline' ? 'Connectez cet appareil à Internet pour continuer à utiliser l\'application.' : DEFAULT_MSG));
    if (ctl.latestVersion && cmp(ctl.latestVersion, EE.VERSION) > 0) out.update = { version: String(ctl.latestVersion), url: String(ctl.updateUrl || ''), notes: String(ctl.updateNotes || '') };
    if (ctl.minVersion && cmp(ctl.minVersion, EE.VERSION) > 0) { out.mustUpdate = true; out.update = out.update || { version: String(ctl.minVersion), url: String(ctl.updateUrl || ''), notes: String(ctl.updateNotes || '') }; }
    return out;
  }

  // ---------- interface ----------
  function contactLinks() {
    try { const o = EE.Contact.owner(); const a = []; if (o.email) a.push(`<a class="btn" href="${EE.Contact.mail(o, 'Yak-élec-pro – accès', '')}">✉ E-mail</a>`); if (/\d/.test(o.phone || '')) a.push(`<a class="btn wabtn" href="${EE.Contact.wa(o, 'Bonjour, mon identifiant appareil : ' + deviceId())}" target="_blank" rel="noopener">💬 WhatsApp</a>`); return a.join(''); } catch (e) { return ''; }
  }
  function overlay() { let o = document.getElementById('yk-lock'); if (!o) { o = document.createElement('div'); o.id = 'yk-lock'; document.body.appendChild(o); } return o; }
  function unlock() { const o = document.getElementById('yk-lock'); if (o) o.remove(); const a = document.getElementById('app'); if (a) a.inert = false; document.body.classList.remove('yk-locked'); lastApplied = ''; }
  function showLock(d, closer) {
    const sig = JSON.stringify([d.blocked, d.reason, d.message, d.mustUpdate, d.update && d.update.version, !!closer]); const o = overlay(); if (sig === lastApplied && o.firstChild) return; lastApplied = sig;
    const upd = d.update ? `<p class="yk-upd"><b>Mise à jour ${d.mustUpdate && !d.blocked ? 'obligatoire' : 'disponible'} : version ${esc(d.update.version)}</b>${d.update.notes ? `<br><span>${esc(d.update.notes)}</span>` : ''}</p>${d.update.url ? `<a class="btn primary" href="${esc(d.update.url)}" target="_blank" rel="noopener">⬇ Télécharger la mise à jour</a>` : ''}` : '';
    o.innerHTML = `<div class="yk-card" role="alertdialog" aria-modal="true"><img class="logoimg ico" src="${EE.LOGO_ICON || ''}" alt="" width="64" height="64"><h1>${d.blocked ? (d.reason === 'offline' ? 'Connexion requise' : 'Application bloquée') : 'Mise à jour obligatoire'}</h1><p>${esc(d.blocked ? d.message : 'Cette version n\'est plus autorisée : installez la nouvelle version pour continuer.')}</p>${d.blocked ? upd : upd}
      <p class="yk-id">Identifiant de cet appareil : <b>${esc(deviceId())}</b></p><div class="btnrow center">${contactLinks()}<button class="btn" id="yk-retry">↻ Réessayer</button>${closer ? '<button class="btn danger" id="yk-close">Fermer l\'aperçu</button>' : ''}</div><p class="yk-st small" id="yk-st"></p></div>`;
    document.body.classList.add('yk-locked'); const a = document.getElementById('app'); if (a) a.inert = true;
    const r = document.getElementById('yk-retry'); if (r) r.onclick = async () => { const s = document.getElementById('yk-st'); if (s) s.textContent = 'Vérification…'; const res = await check(); if (s && res && !res.ok) s.textContent = res.error === 'no-url' ? 'Aucun serveur de contrôle configuré.' : 'Pas de connexion Internet : dernier état conservé.'; };
    const c = document.getElementById('yk-close'); if (c) c.onclick = () => { previewing = null; apply(); };
  }
  function banner(d) {
    let b = document.getElementById('yk-upd');
    if (!d.update || d.mustUpdate || ls.get(K_SKIP, '') === d.update.version) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'yk-upd'; document.body.appendChild(b); }
    b.innerHTML = `<span>🔔 <b>Mise à jour ${esc(d.update.version)} disponible.</b> ${esc(d.update.notes || '')}</span>${d.update.url ? `<a class="btn small primary" href="${esc(d.update.url)}" target="_blank" rel="noopener">Télécharger</a>` : ''}<button class="btn small" id="yk-later">Plus tard</button>`;
    document.getElementById('yk-later').onclick = () => { ls.set(K_SKIP, d.update.version); b.remove(); };
  }
  function apply() {
    const d = previewing ? evalCtl(previewing.ctl) : evalCtl(state().ctl);
    if (d.blocked || d.mustUpdate) { showLock(d, !!previewing); const b = document.getElementById('yk-upd'); if (b) b.remove(); } else { unlock(); banner(d); }
    return d;
  }
  function preview(ctl) { previewing = { ctl }; return apply(); }

  // ---------- vérification en ligne ----------
  async function check() {
    const url = controlURL(); if (!url) return { ok: false, error: 'no-url' };
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(() => ctrl && ctrl.abort(), 8000);
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const ctl = await r.json(); if (!ctl || typeof ctl !== 'object' || Array.isArray(ctl)) throw new Error('fichier invalide');
      ls.set(K_ST, { ctl, at: Date.now(), lastOk: Date.now(), ok: true, error: '' }); apply(); return { ok: true, ctl };
    } catch (e) { const s = state(); s.ok = false; s.error = String(e && e.message || e); s.at = Date.now(); ls.set(K_ST, s); apply(); return { ok: false, error: s.error }; }
    finally { clearTimeout(to); }
  }
  function start() {
    apply(); setTimeout(check, 800);
    const minutes = Math.max(1, ((EE.Config && EE.Config.get().remote) || {}).minutes || 15);
    clearInterval(timer); timer = setInterval(check, minutes * 60000);
    g.addEventListener('online', check); document.addEventListener('visibilitychange', () => { if (!document.hidden) { apply(); check(); } });
    setInterval(apply, 4000); // réévalue (compte connecté, délai hors ligne) sans réseau
  }
  EE.Remote = { check, apply, preview, evalCtl, controlURL, deviceId, state, cmp, start, unlock };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
