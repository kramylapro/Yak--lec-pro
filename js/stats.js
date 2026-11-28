/* Yak-élec-pro – Statistiques de connexion (V1.12).
   Chaque copie ouverte et connectée à Internet envoie toutes les 60 s un petit signal (identifiant d'appareil,
   nom d'utilisateur du compte ouvert, plateforme, version) à une base Firebase Realtime Database qui appartient
   au propriétaire. Seul le propriétaire peut lire ces données (connexion Firebase avec l'e-mail administrateur
   défini dans Config.ADMIN_EMAIL, vérifiée par les règles de la base). L'adresse de la base et la clé Web sont
   publiées dans control.json (statsUrl, statsKey) ou réglées pour un seul appareil dans le portail.
   Rien n'est envoyé si aucune base n'est configurée. Le mot de passe Firebase n'est jamais enregistré. */
(function (g) {
  'use strict';
  const EE = g.EE, K_F = 'eep.stats.first', K_LAST = 'eep.stats.last';
  const ONLINE_MS = 150000, BEAT_MS = 60000; // « en ligne » = signal reçu depuis moins de 2 min 30 s
  const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } } };
  let timer = null, token = null, tokenUntil = 0, busy = false;
  const adminEmail = () => String((EE.Config && EE.Config.ADMIN_EMAIL) || '').trim().toLowerCase();

  // adresse acceptée : https://xxx.firebaseio.com ou https://xxx.<région>.firebasedatabase.app
  function cleanUrl(u) {
    u = String(u || '').trim().replace(/\/+$/, '').replace(/\.json$/, '');
    return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(firebaseio\.com|firebasedatabase\.app)$/i.test(u) ? u : '';
  }
  function cfg() {
    const loc = (EE.Config && EE.Config.get().remote) || {};
    const ctl = ((EE.Remote ? EE.Remote.state() : ls.get('eep.remote.state', {})) || {}).ctl || null;
    const url = cleanUrl(loc.statsUrl) || cleanUrl(ctl && ctl.statsUrl);
    const key = String(loc.statsKey || (ctl && ctl.statsKey) || '').trim();
    return { url, key, source: cleanUrl(loc.statsUrl) ? 'appareil' : (url ? 'control.json' : '') };
  }
  function platform() {
    const ua = navigator.userAgent || '';
    if (/^(127\.0\.0\.1|localhost)$/.test(location.hostname) && location.port === '47615') return 'Windows (application)';
    if (/Android/i.test(ua)) return /; wv\)/.test(ua) ? 'Android (application)' : 'Android (navigateur)';
    if (location.protocol === 'file:') return 'Fichier HTML';
    return 'Site web';
  }
  const user = () => { try { return ((EE.Store.Users.current() || {}).name || '').slice(0, 40); } catch (e) { return ''; } };

  async function beat() {
    const c = cfg(); if (!c.url || busy) return { ok: false, error: c.url ? 'busy' : 'no-url' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'offline' };
    busy = true;
    const dev = EE.Remote.deviceId(), body = { t: { '.sv': 'timestamp' }, v: String(EE.VERSION).slice(0, 19), p: platform(), u: user() };
    if (!ls.get(K_F, 0)) body.f = { '.sv': 'timestamp' };
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, to = setTimeout(() => ctrl && ctrl.abort(), 8000);
    try {
      const r = await fetch(`${c.url}/presence/${encodeURIComponent(dev)}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (body.f) ls.set(K_F, Date.now());
      ls.set(K_LAST, { at: Date.now(), ok: true, error: '' }); return { ok: true };
    } catch (e) { const err = String(e && e.message || e); ls.set(K_LAST, { at: Date.now(), ok: false, error: err }); return { ok: false, error: err }; }
    finally { clearTimeout(to); busy = false; }
  }
  function start() {
    clearInterval(timer);
    setTimeout(beat, 3000);
    timer = setInterval(() => { if (!document.hidden) beat(); }, BEAT_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    g.addEventListener('online', beat);
  }

  // ---------- lecture (propriétaire) ----------
  async function signIn(email, password) {
    const c = cfg(); if (!c.url) throw new Error('Aucune base de statistiques configurée.'); if (!c.key) throw new Error('Clé Web (API key) Firebase manquante.');
    const r = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(c.key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.idToken) {
      const m = (j.error && j.error.message) || ('HTTP ' + r.status);
      throw new Error(/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(m) ? 'E-mail ou mot de passe Firebase incorrect.' : /API key not valid/i.test(m) ? 'Clé Web (API key) incorrecte.' : /OPERATION_NOT_ALLOWED/.test(m) ? 'Activez la connexion « E-mail/Mot de passe » dans Firebase (Authentication).' : m);
    }
    token = j.idToken; tokenUntil = Date.now() + (Math.max(300, +j.expiresIn || 3600) - 120) * 1000; return true;
  }
  const signedIn = () => !!token && Date.now() < tokenUntil;
  function signOut() { token = null; tokenUntil = 0; }
  async function fetchAll() {
    const c = cfg(); if (!signedIn()) throw new Error('Connexion requise.');
    const r = await fetch(`${c.url}/presence.json?auth=${encodeURIComponent(token)}`, { cache: 'no-store' });
    if (r.status === 401 || r.status === 403) throw new Error('Lecture refusée : vérifiez les règles de la base (étape 4) et l\'e-mail du compte Firebase.');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()) || {};
  }
  function summary(data, now) {
    now = now || Date.now();
    const d0 = new Date(now); d0.setHours(0, 0, 0, 0);
    const rows = Object.entries(data || {}).filter(([, x]) => x && typeof x.t === 'number').map(([id, x]) => ({ id, t: x.t, f: x.f || x.t, v: x.v || '?', p: x.p || '?', u: x.u || '', online: now - x.t < ONLINE_MS })).sort((a, b) => b.t - a.t);
    const count = (fn) => rows.filter(fn).length, by = (list, k) => list.reduce((o, r) => ((o[r[k]] = (o[r[k]] || 0) + 1), o), {});
    const on = rows.filter((r) => r.online);
    return { rows, online: on.length, onlineUsers: new Set(on.map((r) => r.u || r.id)).size, today: count((r) => r.t >= d0.getTime()), week: count((r) => now - r.t < 7 * 864e5), month: count((r) => now - r.t < 30 * 864e5), total: rows.length, newWeek: count((r) => now - r.f < 7 * 864e5), byPlatform: by(on, 'p'), byVersion: by(rows.filter((r) => now - r.t < 30 * 864e5), 'v') };
  }
  function rules() {
    const e = adminEmail().replace(/'/g, '');
    return JSON.stringify({ rules: { '.read': false, '.write': false, presence: {
      '.read': `auth != null && auth.token.email == '${e}'`,
      '$dev': { '.write': "$dev.matches(/^YE-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]-[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]$/)", '.validate': "newData.hasChildren(['t', 'v', 'p'])",
        t: { '.validate': 'newData.val() == now' }, f: { '.validate': 'newData.isNumber() && newData.val() <= now' },
        v: { '.validate': 'newData.isString() && newData.val().length < 20' }, p: { '.validate': 'newData.isString() && newData.val().length < 40' },
        u: { '.validate': 'newData.isString() && newData.val().length <= 40' }, '$other': { '.validate': false } } } } }, null, 2);
  }
  const last = () => ls.get(K_LAST, { at: 0, ok: false, error: '' });
  EE.Stats = { cfg, cleanUrl, platform, beat, start, signIn, signOut, signedIn, fetchAll, summary, rules, last, adminEmail, ONLINE_MS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
