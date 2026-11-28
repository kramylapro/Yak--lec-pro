/* Yak-élec-pro – noyau : utilitaires, hachage, événements */
(function (g) {
  'use strict';
  const EE = g.EE = g.EE || {};
  EE.VERSION = '1.13.0';
  EE.G = 20; // pas de grille (px)
  EE.uid = (p = 'id') => p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  EE.clone = (o) => JSON.parse(JSON.stringify(o));
  EE.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  EE.snap = (v) => Math.round(v / EE.G) * EE.G;
  EE.pad2 = (n) => String(n).padStart(2, '0');
  EE.fmtDate = (t) => { const d = new Date(t); return EE.pad2(d.getDate()) + '/' + EE.pad2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + EE.pad2(d.getHours()) + ':' + EE.pad2(d.getMinutes()); };
  EE.fmtTime = (t) => { const d = new Date(t); return EE.pad2(d.getHours()) + ':' + EE.pad2(d.getMinutes()) + ':' + EE.pad2(d.getSeconds()); };

  // SHA-256 (synchrone, indépendant du contexte sécurisé du navigateur)
  EE.sha256 = function (str) {
    const bytes = Array.from(new TextEncoder().encode(str));
    const K = [], H = [];
    const isPrime = (n) => { for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
    for (let c = 2, n = 0; n < 64; c++) if (isPrime(c)) { if (n < 8) H[n] = Math.floor((Math.sqrt(c) % 1) * 4294967296) >>> 0; K[n++] = Math.floor((Math.cbrt(c) % 1) * 4294967296) >>> 0; }
    const l = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = [];
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, gg, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & gg);
        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        h = gg; gg = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + gg) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
  };

  // Petit bus d'événements
  EE.Bus = { _h: {}, on(n, f) { (this._h[n] = this._h[n] || []).push(f); }, emit(n, d) { (this._h[n] || []).forEach((f) => f(d)); } };
})(window);
