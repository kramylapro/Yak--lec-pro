/* Yak-élec-pro V1.11 – Bureau d'études BT : moteur de calcul (fonctions pures, sans interface).
   Bilan de puissance → courants → sections (Iz corrigé) → chute de tension → Icc max / min → pouvoir de coupure →
   protections (choix dans la bibliothèque) → contacts indirects → répartition → enveloppes → échauffement → sélectivité → nomenclature et chiffrage.
   SOURCES ET LIMITES : tableaux de courants admissibles et coefficients d'après la CEI 60364-5-52 (saisis de mémoire, À VÉRIFIER sur la
   norme en vigueur) ; formules usuelles de la NF C 15-100 / CEI 60364 ; échauffement par méthode simplifiée inspirée de la CEI TR 60890.
   Le moteur ne délivre jamais de certificat de conformité : il applique les règles saisies et signale ce qui manque. */
(function (g) {
  'use strict';
  const EE = g.EE;
  const S3 = Math.sqrt(3);
  const SECTIONS = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
  const IN_STD = [2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];
  // Courants admissibles (A), cuivre, CEI 60364-5-52 (B.52.2 à B.52.5) – [méthode][isolant][conducteurs chargés] → valeurs pour SECTIONS
  const IZ = {
    B: { PVC: { 2: [17.5, 24, 32, 41, 57, 76, 101, 125, 151, 192, 232, 269, 309, 353, 415], 3: [15.5, 21, 28, 36, 50, 68, 89, 110, 134, 171, 207, 239, 275, 314, 370] },
      PR: { 2: [23, 31, 42, 54, 75, 100, 133, 164, 198, 253, 306, 354, 407, 464, 546], 3: [20, 28, 37, 48, 66, 88, 117, 144, 175, 222, 269, 312, 358, 408, 481] } },
    C: { PVC: { 2: [19.5, 27, 36, 46, 63, 85, 112, 138, 168, 213, 258, 299, 344, 392, 461], 3: [17.5, 24, 32, 41, 57, 76, 96, 119, 144, 184, 223, 259, 299, 341, 403] },
      PR: { 2: [24, 33, 45, 58, 80, 107, 138, 171, 209, 269, 328, 382, 441, 506, 599], 3: [22, 30, 40, 52, 71, 96, 119, 147, 179, 229, 278, 322, 371, 424, 500] } },
    E: { PVC: { 2: [22, 30, 40, 51, 70, 94, 119, 148, 180, 232, 282, 328, 379, 434, 514], 3: [18.5, 25, 34, 43, 60, 80, 101, 126, 153, 196, 238, 276, 319, 364, 430] },
      PR: { 2: [26, 36, 49, 63, 86, 115, 149, 185, 225, 289, 352, 410, 473, 542, 641], 3: [23, 32, 42, 54, 75, 100, 127, 158, 192, 246, 298, 346, 399, 456, 538] } },
    D: { PVC: { 2: [22, 29, 38, 47, 63, 81, 104, 125, 148, 183, 216, 246, 278, 312, 361], 3: [18, 24, 31, 39, 52, 67, 86, 103, 122, 151, 179, 203, 230, 258, 297] },
      PR: { 2: [26, 34, 44, 56, 73, 95, 121, 146, 173, 213, 252, 287, 324, 363, 419], 3: [22, 29, 37, 46, 61, 79, 101, 122, 144, 178, 211, 240, 271, 304, 351] } },
  };
  const METHODS = { B: 'B – conduits ou goulottes (encastré ou en saillie)', C: 'C – fixé sur paroi, câble multiconducteur', E: 'E – chemin de câbles perforé', D: 'D – enterré sous fourreau' };
  const KT_AIR = { PVC: { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 }, PR: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71 } };
  const KT_SOIL = { PVC: { 10: 1.1, 15: 1.05, 20: 1, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77, 45: 0.71, 50: 0.63 }, PR: { 10: 1.07, 15: 1.04, 20: 1, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85, 45: 0.8, 50: 0.76 } };
  const KG = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52, 9: 0.5, 12: 0.45, 16: 0.41, 20: 0.38 };
  const AL_K = 0.78; // rapport indicatif Iz aluminium / cuivre (sections ≥ 16 mm²)
  const RHO = { cu: { r20: 0.01851, hot: 0.0225 }, al: { r20: 0.0294, hot: 0.036 } }; // Ω·mm²/m (résistivités conventionnelles NF C 15-100)
  const LAMBDA = 0.08e-3; // Ω/m, réactance linéique
  const CURVE_IM = { B: [3, 5], C: [5, 10], D: [10, 20], TM: [5, 10], 'Élec.': [8, 12] }; // seuils magnétiques bas / haut (× In)
  const TYPES = ['Éclairage', 'Prises de courant', 'Chauffage', 'Climatisation', 'Cuisson', 'Eau chaude', 'Moteur', 'Pompe', 'Ventilation', 'Informatique', 'Machine', 'Autre'];
  const MOTORS = ['Moteur', 'Pompe', 'Ventilation', 'Machine'];
  const EARTHING = ['TT', 'TN-S', 'TN-C', 'TN-C-S', 'IT'];
  const num = (v) => { if (v === '' || v == null) return null; const x = parseFloat(String(v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : null; };
  const lookupT = (tab, t) => { const ks = Object.keys(tab).map(Number).sort((a, b) => a - b); let best = ks[0]; ks.forEach((k) => { if (k <= t) best = k; }); if (t > ks[ks.length - 1]) return 0; return tab[best]; };
  const kGroup = (n) => { const ks = Object.keys(KG).map(Number).sort((a, b) => a - b); let v = 1; ks.forEach((k) => { if (n >= k) v = KG[k]; }); return v; };

  function defaultRules() {
    return { dULight: 3, dUOther: 5, ambient: 30, soil: 20, method: 'C', insul: 'PR', mat: 'cu', group: 1, reserve: 20, perRow: 18, rcdPerGroup: 8,
      tMax: 40, kSteel: 5.5, kInsul: 3.5, selRatio: 1.6, labourRate: 0, hDevice: 0.25, hCircuit: 1, hBoard: 4, fraisPct: 5, marginPct: 15, tvaPct: 18, currency: '', norms: 'NF C 15-100 (2015) ; CEI 60364 ; CEI 61439-1/-2 ; CEI 60947-2 ; CEI 60898-1' };
  }
  function newStudy(o) {
    const s = Object.assign({ id: EE.uid('bt'), name: 'Nouvelle étude', client: '', site: '', office: '', engineer: '', date: new Date().toISOString().slice(0, 10), building: 'Tertiaire', supply: 'Réseau public BT', U: 400, U0: 230, f: 50, earthing: 'TT', Pavail: '', Ik: '', cos: 0.9, RA: '', created: Date.now(), modified: Date.now(), archived: false, rules: defaultRules(), boards: [], coord: [], notes: '' }, o || {});
    s.rules = Object.assign(defaultRules(), s.rules || {});
    if (!s.boards.length) s.boards.push(newBoard('TGBT', null));
    return s;
  }
  function newBoard(name, feeder) { return { id: EE.uid('tb'), name: name || 'Tableau', feeder: feeder || null, ks: 0.8, layout: 'opt', perRow: '', enc: '', circuits: [] }; }
  function newCircuit(o) {
    return Object.assign({ id: EE.uid('ci'), name: 'Circuit', kind: 'final', feeds: null, type: 'Autre', phases: 1, neutral: true, ks: 1, loads: [], length: '', method: '', insul: '', mat: '', ambient: '', group: '', rcd: 'auto', prot: '', curve: 'auto', section: 'auto', contactor: false }, o || {});
  }
  function newLoad(o) { return Object.assign({ id: EE.uid('ld'), name: 'Récepteur', type: 'Autre', P: '', U: '', phases: '', cos: 1, eta: 1, n: 1, ku: 1, mode: 'Permanent' }, o || {}); }

  // ---------- 4. bilan de puissance ----------
  function loadBalance(l, c, st) {
    const P = num(l.P), n = num(l.n) || 0, cos = num(l.cos) || 1, eta = num(l.eta) || 1, ku = num(l.ku) == null ? 1 : num(l.ku);
    if (P == null) return { missing: true, Pinst: 0, Pa: 0, Pd: 0, Qd: 0 };
    const Pinst = P * n, Pa = Pinst / eta, Pd = Pa * ku, tan = Math.tan(Math.acos(Math.min(1, Math.max(0.05, cos))));
    return { Pinst, Pa, Pd, Qd: Pd * tan, cos };
  }
  function boardById(st, id) { return st.boards.find((b) => b.id === id); }
  function childOf(st, c) { return c.kind === 'feeder' && c.feeds ? boardById(st, c.feeds) : null; }
  function balance(st) {
    const memo = {};
    const bal = (b, stack = []) => {
      if (memo[b.id]) return memo[b.id]; if (stack.includes(b.id)) return { P: 0, Q: 0, S: 0, Pinst: 0, circuits: [], loop: true };
      const out = { P: 0, Q: 0, S: 0, Pinst: 0, circuits: [] };
      b.circuits.forEach((c) => {
        let P = 0, Q = 0, Pinst = 0, missing = false;
        if (c.kind === 'feeder') { const ch = childOf(st, c); if (ch) { const r = bal(ch, stack.concat(b.id)); P = r.P; Q = r.Q; Pinst = r.Pinst; missing = r.missing; } else missing = true; }
        else { c.loads.forEach((l) => { const r = loadBalance(l, c, st); if (r.missing) missing = true; P += r.Pd; Q += r.Qd; Pinst += r.Pinst; }); const ks = num(c.ks) == null ? 1 : num(c.ks); P *= ks; Q *= ks; }
        const S = Math.hypot(P, Q), ph = +c.phases === 3 ? 3 : 1, Ib = ph === 3 ? S / (S3 * st.U) : S / st.U0;
        const r = { id: c.id, P, Q, S, Pinst, Ib, cos: S ? P / S : 1, missing: missing || (c.kind === 'final' && !c.loads.length) };
        out.circuits.push(r); out.P += P; out.Q += Q; out.Pinst += Pinst; if (r.missing) out.missing = true;
      });
      const ks = num(b.ks) == null ? 1 : num(b.ks); out.Pcircuits = out.P; out.P *= ks; out.Q *= ks; out.S = Math.hypot(out.P, out.Q); out.Ib = out.S / (S3 * st.U); out.cos = out.S ? out.P / out.S : 1;
      memo[b.id] = out; return out;
    };
    const boards = {}; st.boards.forEach((b) => { boards[b.id] = bal(b); });
    const roots = st.boards.filter((b) => !b.feeder || !findCircuit(st, b.feeder));
    const P = roots.reduce((a, b) => a + boards[b.id].P, 0), Q = roots.reduce((a, b) => a + boards[b.id].Q, 0), S = Math.hypot(P, Q);
    return { boards, P, Q, S, Ib: S / (S3 * st.U), cos: S ? P / S : 1, roots: roots.map((b) => b.id) };
  }
  function findCircuit(st, id) { for (const b of st.boards) { const c = b.circuits.find((x) => x.id === id); if (c) return { board: b, circuit: c }; } return null; }

  // ---------- 5. dimensionnement d'un circuit ----------
  function izOf(method, insul, mat, loaded, s) {
    const tab = ((IZ[method] || IZ.C)[insul] || IZ.C.PVC)[loaded] || null; const i = SECTIONS.indexOf(s); if (!tab || i < 0) return null;
    if (mat === 'al') return s < 16 ? null : tab[i] * AL_K; return tab[i];
  }
  const nextIn = (Ib) => IN_STD.find((x) => x >= Ib - 1e-9);
  // calibre : le plus petit calibre ≥ Ib réellement disponible dans la bibliothèque pour ces pôles et cette courbe
  const famOf = (I) => (I > 630 ? ['acb'] : I > 125 ? ['mccb'] : ['mcb', 'rcbo', 'mccb']);
  const polesOk = (p, po) => p.poles === po || (po === '4P' && p.poles === '3P+N');
  function pickIn(lib, Ib, poles, curve) {
    const av = (lib || []).filter((p) => famOf(Ib).includes(p.type) && polesOk(p, poles) && (p.type === 'mccb' || p.type === 'acb' || p.curve === curve)).map((p) => +p.In).filter((x) => x >= Ib - 1e-9).sort((a, b) => a - b);
    return av[0] || nextIn(Ib);
  }
  function autoCurve(c) { if (c.curve && c.curve !== 'auto') return c.curve; return MOTORS.includes(c.type) ? 'D' : c.kind === 'feeder' ? 'C' : 'C'; }
  function polesOf(c) { return +c.phases === 3 ? (c.neutral === false ? '3P' : '4P') : '1P+N'; }
  function rcdNeed(c, st) { // sensibilité différentielle requise (mA) ou 0 ; règles usuelles, indicatives, modifiables par circuit
    if (c.rcd && c.rcd !== 'auto') return c.rcd === 'none' ? 0 : +c.rcd;
    if (c.kind === 'feeder') return st.earthing === 'TT' ? 300 : 0;
    if (['Prises de courant', 'Éclairage', 'Cuisson', 'Eau chaude', 'Chauffage', 'Climatisation'].includes(c.type) && (st.building === 'Résidentiel' || st.earthing === 'TT' || c.type === 'Prises de courant')) return 30;
    return st.earthing === 'TT' ? 300 : 0;
  }
  function sizeCircuit(st, b, c, cb, ctx, lib) {
    const R = st.rules, ph = +c.phases === 3 ? 3 : 1, U0 = +st.U0, U = +st.U;
    const method = c.method || R.method, insul = c.insul || R.insul, mat = c.mat || R.mat, amb = num(c.ambient) == null ? (method === 'D' ? +R.soil : +R.ambient) : num(c.ambient), grp = num(c.group) || +R.group || 1;
    const loaded = ph === 3 ? 3 : 2, kT = lookupT(method === 'D' ? KT_SOIL[insul] : KT_AIR[insul], amb), kG = kGroup(grp), k = kT * kG;
    const L = num(c.length), missing = [], warns = [], hyp = [];
    if (cb.missing) missing.push('puissances des récepteurs');
    if (L == null || L <= 0) missing.push('longueur du circuit');
    if (ctx.Ik == null) missing.push('Icc au point de livraison');
    const Ib = cb.Ib, curve0 = autoCurve(c), In = pickIn(lib, Math.max(Ib, 0.1), polesOf(c), curve0);
    const curve = In > 125 ? (In > 630 ? 'Élec.' : 'TM') : curve0, Imk = (CURVE_IM[curve] || CURVE_IM.C), ImHigh = Imk[1] * In;
    const lim = c.type === 'Éclairage' ? +R.dULight : +R.dUOther, dUup = ctx.dU || 0;
    const rho = RHO[mat] || RHO.cu, b2 = ph === 3 ? 1 : 2, cos = cb.cos || 1, sin = Math.sqrt(Math.max(0, 1 - cos * cos));
    const minS = mat === 'al' ? 16 : c.type === 'Prises de courant' || c.type === 'Cuisson' ? 2.5 : 1.5;
    const dUof = (s) => (L ? 100 * b2 * (rho.hot * L / s * cos + LAMBDA * L * sin) * Ib / U0 : null);
    const ikMinOf = (s) => (L ? 0.8 * U0 * s / (rho.hot * 2 * L) : null); // méthode conventionnelle (m = 1, PE de même section)
    const fixed = c.section && c.section !== 'auto' ? +c.section : null;
    let sel = null; const tried = [];
    for (const s of SECTIONS) {
      if (s < minS) continue; if (fixed && s !== fixed) continue;
      const iz = izOf(method, insul, mat, loaded, s); if (iz == null) continue; const izc = iz * k;
      const okIz = izc >= In - 1e-9, du = dUof(s), okDu = du == null || dUup + du <= lim + 1e-9, ikm = ikMinOf(s), okIk = ikm == null || ikm >= ImHigh;
      tried.push({ s, izc, du, ikm, okIz, okDu, okIk });
      if (okIz && okDu && okIk) { sel = tried[tried.length - 1]; break; }
    }
    const res = { id: c.id, name: c.name, board: b.name, type: c.type, kind: c.kind, phases: ph, poles: polesOf(c), Ib, In, curve, method, insul, mat, ambient: amb, group: grp, kT, kG, lim, dUup, missing, warns, hyp, alternatives: [] };
    hyp.push(`Pose ${method}, isolant ${insul}, ${mat === 'al' ? 'aluminium' : 'cuivre'}, ${amb} °C, ${grp} circuit(s) groupé(s) : k = ${kT.toFixed(2)} × ${kG.toFixed(2)} = ${k.toFixed(2)}`);
    if (!sel) {
      const last = tried[tried.length - 1];
      res.status = 'Non conforme'; res.section = fixed || (last && last.s) || null;
      if (!tried.length) res.reason = fixed ? `Section imposée ${fixed} mm² hors tableau ou interdite` : 'Aucune section disponible';
      else res.reason = !last.okIz ? `Iz corrigé insuffisant même à ${last.s} mm² (${last.izc.toFixed(0)} A < In ${In} A) : prévoir des câbles en parallèle ou réduire la charge` : !last.okDu ? `Chute de tension trop forte même à ${last.s} mm² (${(dUup + last.du).toFixed(2)} % > ${lim} %)` : `Icc minimal ${last.ikm.toFixed(0)} A inférieur au seuil magnétique ${ImHigh.toFixed(0)} A : réduire la longueur, augmenter la section ou changer de courbe`;
      if (last) Object.assign(res, { Iz: last.izc, dU: last.du, Ikmin: last.ikm });
      return finish(res, st, b, c, ctx, lib);
    }
    Object.assign(res, { section: sel.s, Iz: sel.izc, dU: sel.du, dUtot: sel.du == null ? null : dUup + sel.du, Ikmin: sel.ikm });
    const next = SECTIONS[SECTIONS.indexOf(sel.s) + 1]; if (next && !fixed) { const iz2 = izOf(method, insul, mat, loaded, next); if (iz2) res.alternatives.push({ label: `Section supérieure ${String(next).replace('.', ',')} mm²`, section: next, Iz: iz2 * k, dU: dUof(next) }); }
    return finish(res, st, b, c, ctx, lib);
  }
  function finish(res, st, b, c, ctx, lib) {
    const U0 = +st.U0, mat = res.mat, rho = RHO[mat] || RHO.cu, L = num(c.length), s = res.section;
    // Icc maximal à l'origine du circuit (barres du tableau) et à son extrémité
    res.IkOrigin = ctx.Ik; res.pdcNeed = ctx.Ik;
    if (ctx.Ik != null && s && L) { const Rc = rho.r20 * L / s, Xc = LAMBDA * L; res.IkEnd = U0 / Math.hypot(ctx.Rs + Rc, ctx.Xs + Xc) / 1000; res.RsEnd = ctx.Rs + Rc; res.XsEnd = ctx.Xs + Xc; }
    // protection : choix dans la bibliothèque
    const sens = rcdNeed(c, st); res.rcd = sens;
    const fam = res.In > 125 ? (res.In > 630 ? ['acb'] : ['mccb']) : res.In > 63 ? ['mcb', 'mccb'] : ['mcb', 'rcbo'];
    const pdcK = ctx.Ik; // kA
    let cands = (lib || []).filter((p) => fam.includes(p.type) && +p.In === res.In && polesOk(p, res.poles) && (p.type === 'mccb' || p.type === 'acb' || p.curve === res.curve));
    if (sens && res.poles === '1P+N') { const r = cands.filter((p) => p.type === 'rcbo' && p.rcd && +p.rcd.sens === sens); if (r.length) cands = r.concat(cands.filter((p) => p.type !== 'rcbo')); } else cands = cands.filter((p) => p.type !== 'rcbo');
    const okPdc = cands.filter((p) => pdcK == null || +p.pdc >= pdcK - 1e-9).sort((a, b2) => (+a.pdc - +b2.pdc) || ((+a.price || 0) - (+b2.price || 0)));
    res.options = okPdc.slice(0, 4).map((p) => ({ ref: p.ref, fab: p.fab, name: p.name, pdc: p.pdc, price: p.price, rcbo: p.type === 'rcbo' }));
    const chosen = c.prot && okPdc.find((p) => p.ref === c.prot) || okPdc[0] || null;
    res.prot = chosen ? { ref: chosen.ref, fab: chosen.fab, name: chosen.name, pdc: chosen.pdc, type: chosen.type, mods: +chosen.mods || 0, W: chosen.W, H: chosen.H, D: chosen.D, price: +chosen.price || 0, pw: +chosen.pw || 0, rcbo: chosen.type === 'rcbo' } : null;
    if (c.prot && chosen && chosen.ref !== c.prot) res.warns.push('Protection choisie remplacée : elle ne convient plus (calibre, pôles ou pouvoir de coupure).');
    if (!chosen) { if (cands.length && pdcK != null) res.fail = `Aucun appareil ${res.poles} ${res.In} A courbe ${res.curve} de la bibliothèque n'a un pouvoir de coupure ≥ ${pdcK.toFixed(1)} kA`; else res.fail = `Aucun appareil ${res.poles} ${res.In} A ${res.curve} dans la bibliothèque (ajoutez-le ou importez un tarif)`; }
    res.Im = (CURVE_IM[res.curve] || CURVE_IM.C)[1] * res.In;
    // contacts indirects selon le régime de neutre
    const e = st.earthing; let ci = '';
    if (e === 'TT') { const RA = num(st.RA); if (!sens) ci = 'ko:Schéma TT : dispositif différentiel obligatoire en tête du circuit ou du groupe'; else if (RA == null) ci = `check:Schéma TT : vérifier RA × IΔn ≤ 50 V (RA non renseignée ; RA max = ${(50000 / Math.max(sens, 30)).toFixed(0)} Ω pour ${sens} mA)`; else ci = RA * sens / 1000 <= 50 ? `ok:TT : RA × IΔn = ${(RA * sens / 1000).toFixed(1)} V ≤ 50 V` : `ko:TT : RA × IΔn = ${(RA * sens / 1000).toFixed(1)} V > 50 V`; }
    else if (e === 'IT') ci = 'check:Schéma IT : vérification au 2e défaut (Icc ≥ seuil, 0,86 × U0 ou U) et contrôleur permanent d\'isolement à prévoir – à vérifier';
    else if (res.Ikmin != null) ci = res.Ikmin >= res.Im ? `ok:${e} : Icc défaut ${res.Ikmin.toFixed(0)} A ≥ seuil magnétique ${res.Im.toFixed(0)} A (coupure dans le temps requis)` : `ko:${e} : Icc défaut ${res.Ikmin.toFixed(0)} A < seuil magnétique ${res.Im.toFixed(0)} A`;
    else ci = 'missing:longueur nécessaire pour vérifier la coupure au défaut';
    res.indirect = ci; if (e === 'TN-C' && (res.section || 0) < 10) res.warns.push('TN-C interdit pour des sections < 10 mm² cuivre (PEN) : passer en TN-S en aval.');
    if (e === 'TN-C' && sens) res.warns.push('Différentiel incompatible avec un conducteur PEN (TN-C).');
    // statut global
    const bad = res.status === 'Non conforme' || !!res.fail || ci.startsWith('ko:');
    if (bad) res.status = 'Non conforme';
    else if (res.missing.length || ci.startsWith('missing')) res.status = 'Données manquantes';
    else if (ci.startsWith('check') || res.warns.length) res.status = 'À vérifier';
    else res.status = 'Conforme';
    return res;
  }

  // ---------- calcul complet de l'étude ----------
  function compute(st, lib) {
    lib = lib || (EE.BTLib ? EE.BTLib.all() : []);
    const B = balance(st), R = st.rules, U0 = +st.U0, msgs = [], circuits = {}, boards = {};
    const Ik0 = num(st.Ik); // kA au point de livraison
    const Zs = Ik0 ? U0 / (Ik0 * 1000) : null;
    const rootCtx = { Ik: Ik0, Rs: Zs ? 0.1 * Zs : 0, Xs: Zs ? 0.995 * Zs : 0, dU: 0 };
    if (Ik0 == null) msgs.push({ sev: 'missing', msg: 'Icc au point de livraison non renseigné : pouvoirs de coupure et Icc maximaux non calculés (Fichier › Propriétés de l\'étude).' });
    if (!num(st.Pavail)) msgs.push({ sev: 'missing', msg: 'Puissance disponible non renseignée : comparaison avec le bilan impossible.' });
    const visit = (b, ctx, depth) => {
      const bb = B.boards[b.id]; const rs = { id: b.id, name: b.name, depth, Ik: ctx.Ik, dU: ctx.dU, P: bb.P, Q: bb.Q, S: bb.S, Ib: bb.Ib, circuits: [] };
      boards[b.id] = rs;
      b.circuits.forEach((c) => {
        const cb = bb.circuits.find((x) => x.id === c.id); const r = sizeCircuit(st, b, c, cb, ctx, lib); r.P = cb.P; r.Q = cb.Q; r.S = cb.S; r.Pinst = cb.Pinst; circuits[c.id] = r; rs.circuits.push(r);
        r.warns.forEach((w) => msgs.push({ sev: 'warn', msg: `${b.name} › ${c.name} : ${w}`, id: c.id }));
        if (r.status === 'Non conforme') msgs.push({ sev: 'error', msg: `${b.name} › ${c.name} : ${r.reason || r.fail || r.indirect.slice(3)}`, id: c.id });
        else if (r.status === 'Données manquantes') msgs.push({ sev: 'missing', msg: `${b.name} › ${c.name} : données manquantes – ${r.missing.concat(r.indirect.startsWith('missing') ? [] : []).join(', ') || r.indirect.slice(8)}`, id: c.id });
        const ch = childOf(st, c);
        if (ch) { const sub = { Ik: r.IkEnd != null ? r.IkEnd : null, Rs: r.RsEnd || 0, Xs: r.XsEnd || 0, dU: r.dUtot != null ? r.dUtot : ctx.dU }; if (r.IkEnd == null && ctx.Ik != null) msgs.push({ sev: 'missing', msg: `${ch.name} : Icc non calculé (longueur du départ ${c.name} manquante).`, id: c.id }); if (depth < 8) visit(ch, sub, depth + 1); }
      });
      // répartition des circuits monophasés sur L1, L2, L3 (le plus chargé d'abord, sur la phase la moins chargée)
      const ph = { L1: 0, L2: 0, L3: 0 };
      rs.circuits.filter((r) => r.phases === 3).forEach((r) => { ['L1', 'L2', 'L3'].forEach((k) => { ph[k] += r.S / 3; }); });
      rs.circuits.filter((r) => r.phases !== 3).sort((a, c) => c.S - a.S).forEach((r) => { const k = Object.keys(ph).sort((a, c) => ph[a] - ph[c])[0]; ph[k] += r.S; r.phase = k; });
      const mx = Math.max(ph.L1, ph.L2, ph.L3), avg = (ph.L1 + ph.L2 + ph.L3) / 3; rs.phases = ph; rs.unbalance = avg ? 100 * (mx - avg) / avg : 0; rs.IbMaxPhase = mx / +st.U0;
      if (+st.U > 300 && rs.unbalance > 20 && rs.circuits.length > 2) msgs.push({ sev: 'warn', msg: `${b.name} : déséquilibre entre phases ${rs.unbalance.toFixed(0)} % (répartir les circuits monophasés autrement).` });
      // protection générale / arrivée du tableau
      const In = nextIn(Math.max(bb.Ib, rs.IbMaxPhase || 0, 1)); rs.InMain = In;
      if (b.circuits.some((c) => c.kind === 'feeder' && !childOf(st, c))) msgs.push({ sev: 'warn', msg: `${b.name} : un départ n'alimente aucun tableau.` });
    };
    B.roots.forEach((id) => visit(boardById(st, id), rootCtx, 0));
    const Pav = num(st.Pavail); if (Pav && B.S / 1000 > Pav) msgs.push({ sev: 'error', msg: `Puissance appelée ${(B.S / 1000).toFixed(1)} kVA supérieure à la puissance disponible ${Pav} kVA.` });
    st.boards.forEach((b) => { if (!boards[b.id]) msgs.push({ sev: 'warn', msg: `${b.name} : tableau non raccordé à l'arborescence (aucun départ ne l'alimente).` }); });
    const count = (s) => Object.values(circuits).filter((r) => r.status === s).length;
    return { balance: B, circuits, boards, msgs, stats: { ok: count('Conforme'), check: count('À vérifier'), ko: count('Non conforme'), missing: count('Données manquantes'), total: Object.keys(circuits).length } };
  }

  // ---------- 8. répartition dans le tableau ----------
  function layout(st, b, res, lib) {
    const R = st.rules, perRow = +(b.perRow || R.perRow) || 18, rep = [];
    const rs = res.boards[b.id] || { circuits: [] }, crs = rs.circuits;
    const libGet = (ref) => (lib || []).find((p) => p.ref === ref);
    // appareil de tête : interrupteur-sectionneur (modulaire jusqu'à 125 A) ou disjoncteur boîtier moulé
    const fdr = b.feeder && findCircuit(st, b.feeder), In = rs.InMain || 40;
    const tri = (fdr ? +fdr.circuit.phases === 3 : +st.U > 300) || crs.some((r) => r.phases === 3) || In > 63;
    const headP = In <= 125 ? (lib || []).filter((p) => p.type === 'isolator' && +p.In >= In && (!tri || p.poles === '4P')).sort((a, c) => a.In - c.In)[0] : (lib || []).filter((p) => (p.type === 'mccb' || p.type === 'acb') && +p.In >= In && p.poles === '4P').sort((a, c) => a.In - c.In || a.pdc - c.pdc)[0];
    const devs = [];
    if (headP) devs.push({ role: 'head', label: 'Arrivée / coupure générale', ref: headP.ref, name: headP.name, mods: +headP.mods || 0, W: headP.W, H: headP.H, D: headP.D, pw: +headP.pw || 0, price: +headP.price || 0, fab: headP.fab, group: 'head', In: headP.In, Ib: rs.Ib });
    // groupes différentiels (circuits avec 30 / 300 mA sans disjoncteur différentiel intégré)
    const groups = {}; const free = [];
    crs.forEach((r) => { if (r.rcd && !(r.prot && r.prot.rcbo)) { const k = r.rcd + '|' + (r.phases === 3 ? 3 : 1); (groups[k] = groups[k] || []).push(r); } else free.push(r); });
    let gi = 0;
    Object.keys(groups).forEach((k) => {
      const [sens, ph] = k.split('|').map(Number), L = groups[k], per = +R.rcdPerGroup || 8;
      for (let i = 0; i < L.length; i += per) {
        const part = L.slice(i, i + per), sumIb = part.reduce((a, r) => a + r.Ib, 0), need = Math.max(25, sumIb);
        const typ = part.some((r) => ['Cuisson', 'Machine', 'Informatique', 'Climatisation'].includes(r.type)) ? 'A' : 'AC';
        const rc = (lib || []).filter((p) => p.type === 'rccb' && p.rcd && +p.rcd.sens === sens && p.poles === (ph === 3 ? '4P' : '2P') && +p.In >= need && (p.rcd.type === typ || typ === 'AC' && p.rcd.type === 'A')).sort((a, c) => a.In - c.In || (a.rcd.type === typ ? -1 : 1))[0];
        const gname = 'G' + (++gi);
        if (rc) devs.push({ role: 'rcd', label: `Différentiel ${gname} ${sens} mA`, ref: rc.ref, name: rc.name, mods: +rc.mods || 2, W: rc.W, H: rc.H, D: rc.D, pw: +rc.pw || 0, price: +rc.price || 0, fab: rc.fab, group: gname, In: rc.In, Ib: sumIb, poles: ph === 3 ? '3P+N' : '1P+N' });
        else rep.push(`${b.name} : aucun interrupteur différentiel ${sens} mA ≥ ${need.toFixed(0)} A dans la bibliothèque pour le groupe ${gname}.`);
        part.forEach((r) => devs.push(devOf(r, gname)));
      }
    });
    free.forEach((r) => devs.push(devOf(r, 'libre')));
    crs.forEach((r) => { const c = (b.circuits.find((x) => x.id === r.id) || {}); if (c.contactor) { const ct = (lib || []).filter((p) => p.type === 'contactor' && +p.In >= r.Ib && (r.phases === 3 ? p.poles !== '2P' : true)).sort((a, x) => a.In - x.In)[0]; if (ct) devs.push({ role: 'ctrl', label: `Contacteur ${r.name}`, ref: ct.ref, name: ct.name, mods: +ct.mods || 2, W: ct.W, H: ct.H, D: ct.D, pw: +ct.pw || 0, price: +ct.price || 0, fab: ct.fab, group: 'commande', In: ct.In, Ib: r.Ib }); } });
    function devOf(r, grp) { const p = r.prot || {}; return { role: 'circuit', id: r.id, label: r.name, ref: p.ref || '', name: p.name || `Protection ${r.poles} ${r.In} A (à choisir)`, mods: p.mods || (r.poles === '1P+N' ? 1 : r.poles === '3P' ? 3 : 4), W: p.W, H: p.H, D: p.D, pw: p.pw || 0, price: p.price || 0, fab: p.fab || '', group: grp, In: r.In, Ib: r.Ib, poles: r.poles, plate: p.type === 'mccb' || p.type === 'acb', missing: !p.ref }; }
    const modular = devs.filter((d) => d.mods > 0 && !d.plate), plate = devs.filter((d) => !(d.mods > 0) || d.plate);
    // regroupement en blocs (un différentiel + ses départs restent ensemble)
    const blocks = []; let cur = null;
    modular.forEach((d) => { if (d.role === 'rcd' || !cur || cur.group !== d.group) { cur = { group: d.group, items: [], mods: 0 }; blocks.push(cur); } cur.items.push(d); cur.mods += d.mods; });
    let order = blocks;
    if ((b.layout || 'opt') === 'opt') { const head = blocks.filter((x) => x.group === 'head'), rest = blocks.filter((x) => x.group !== 'head').sort((a, c) => c.mods - a.mods); order = head.concat(rest); }
    const rows = []; const newRow = () => { const r = { items: [], used: 0 }; rows.push(r); return r; };
    if ((b.layout || 'opt') === 'opt') { // remplissage optimisé : premier emplacement libre suffisant (bloc entier), sinon nouvelle rangée
      order.forEach((bl) => { if (bl.mods <= perRow) { let r = rows.find((x) => perRow - x.used >= bl.mods); if (!r) r = newRow(); bl.items.forEach((d) => { r.items.push(d); r.used += d.mods; }); } else { let r = rows.length ? rows[rows.length - 1] : newRow(); bl.items.forEach((d) => { if (r.used + d.mods > perRow) r = newRow(); r.items.push(d); r.used += d.mods; }); } });
    } else { // traditionnelle : dans l'ordre, rangée après rangée
      let r = newRow(); order.forEach((bl) => bl.items.forEach((d) => { if (r.used + d.mods > perRow) r = newRow(); r.items.push(d); r.used += d.mods; }));
    }
    const used = modular.reduce((a, d) => a + d.mods, 0), resv = +R.reserve || 0, need = Math.ceil(used * (1 + resv / 100));
    const rowsNeed = Math.max(rows.length, Math.ceil(need / perRow));
    while (rows.length < rowsNeed) newRow();
    // peignes : un segment par groupe et par rangée
    const combs = []; rows.forEach((r, i) => { const seg = {}; r.items.forEach((d) => { if (d.role === 'head' || d.role === 'ctrl') return; const k = d.group; seg[k] = seg[k] || { group: k, mods: 0, tri: false }; seg[k].mods += d.mods; if (d.poles && d.poles !== '1P+N') seg[k].tri = true; }); Object.values(seg).forEach((s) => { if (s.mods > 1) combs.push({ row: i + 1, group: s.group, mods: s.mods, poles: s.tri ? '3P+N' : '1P+N' }); }); });
    const groupsSplit = new Set(); const seen = {}; rows.forEach((r, i) => r.items.forEach((d) => { if (d.group === 'head' || d.group === 'libre') return; if (seen[d.group] != null && seen[d.group] !== i) groupsSplit.add(d.group); seen[d.group] = i; }));
    const busbar = In > 125 ? { In, needed: true } : null;
    return { perRow, rows: rows.map((r, i) => ({ n: i + 1, items: r.items, used: r.used, free: perRow - r.used })), used, total: rows.length * perRow, free: rows.length * perRow - used, reservePct: rows.length ? 100 * (rows.length * perRow - used) / (rows.length * perRow) : 0, plate, combs, vCombs: groupsSplit.size, busbar, devs, warns: rep, head: headP || null, layoutMode: b.layout || 'opt' };
  }

  // ---------- 9. enveloppes ----------
  function enclosures(st, b, lay, lib) {
    const encs = (lib || []).filter((p) => p.type === 'enclosure' && p.enc); const out = [];
    const plateH = lay.plate.reduce((a, d) => a + (+d.H || 200) + 100, 0), needPlate = lay.plate.length > 0;
    encs.forEach((e) => {
      const per = +e.enc.perRow || 18, usedRows = Math.ceil(lay.used * (1 + (+st.rules.reserve || 0) / 100) / per) || 1;
      const rowsAvail = e.enc.kind === 'armoire' ? Math.floor(((+e.H || 0) - 300 - plateH) / 150) : +e.enc.rows;
      if (needPlate && e.enc.kind !== 'armoire') return;
      const n = rowsAvail > 0 ? Math.ceil(usedRows / rowsAvail) : Infinity; if (!isFinite(n) || n > 4) return;
      const total = rowsAvail * per * n, free = total - lay.used;
      out.push({ ref: e.ref, fab: e.fab, name: e.name, W: +e.W, H: +e.H, D: +e.D, mat: e.enc.mat, kind: e.enc.kind, perRow: per, rows: rowsAvail, rowsUsed: usedRows, count: n, compartments: e.enc.kind === 'armoire' ? 1 + (needPlate ? 1 : 0) : 1, plastronH: 150, volume: (+e.W * +e.H * +e.D) / 1e9 * n, reservePct: total ? 100 * free / total : 0, price: (+e.price || 0) * n, plateH });
    });
    out.sort((a, c) => a.count - c.count || a.volume - c.volume);
    return out.slice(0, 5);
  }

  // ---------- 12. échauffement (méthode simplifiée, inspirée de la CEI TR 60890 – indicative) ----------
  function thermal(st, b, lay, enc) {
    const R = st.rules; const Ta = +R.ambient || 30;
    const parts = lay.devs.map((d) => { const k = d.In ? Math.min(1.2, (d.Ib || 0) / d.In) : 0.6; return { label: d.label, P: (d.pw || 0) * k * k }; });
    if (lay.busbar) parts.push({ label: 'Jeu de barres', P: lay.busbar.In * 0.025 * ((enc && enc.W) || 600) / 1000 });
    const P = parts.reduce((a, x) => a + x.P, 0) * 1.2; // + 20 % pour les connexions et conducteurs internes (hypothèse)
    if (!enc) return { P, missing: 'Choisissez une enveloppe pour calculer l\'échauffement.', parts };
    const H = enc.H / 1000, W = enc.W / 1000, D = enc.D / 1000, Ae = (1.8 * H * (W + D) + 1.4 * W * D) * enc.count; // surface effective (montage mural, face arrière non comptée)
    const k = enc.mat === 'isolant' ? +R.kInsul : +R.kSteel, dT = P / (k * Ae), Ti = Ta + dT, Tmax = +R.tMax;
    const out = { P, parts, Ae, k, dT, Ti, Ta, Tmax, ok: Ti <= Tmax };
    if (!out.ok) { const dTa = Tmax - Ta; out.vent = dTa > 0 ? 3.1 * (P - k * Ae * dTa) / dTa : null; out.advice = dTa > 0 ? `Ventilation forcée ≈ ${out.vent.toFixed(0)} m³/h (ou enveloppe plus grande / métallique)` : 'Température ambiante ≥ limite : climatisation de l\'enveloppe nécessaire.'; }
    return out;
  }

  // ---------- 13. sélectivité (indicative) et filiation (uniquement sur données constructeur saisies) ----------
  function selectivity(st, up, dn, IkDown) {
    const im = (p) => { const cv = p.curve === 'TM' || p.curve === 'Élec.' ? p.curve : (p.curve || 'C'); return (CURVE_IM[cv] || CURVE_IM.C).map((x) => x * p.In); };
    const ratio = up.In / dn.In, [upLo] = im(up), [, dnHi] = im(dn), R = st.rules;
    const table = (st.coord || []).find((x) => x.up === up.ref && x.down === dn.ref);
    const res = { ratio, upLo, dnHi, IkDown, table };
    if (table) { res.verdict = table.sel === 'totale' ? 'Sélectivité totale (données constructeur saisies)' : `Sélectivité partielle jusqu'à ${table.limit} kA (données constructeur saisies)`; res.cls = table.sel === 'totale' ? 'ok' : 'check'; res.filiation = table.fil ? `Filiation : pouvoir de coupure renforcé ${table.fil} kA (données constructeur saisies : ${table.src || 'source non précisée'})` : 'Filiation : non renseignée'; return res; }
    res.filiation = 'Filiation : impossible à déclarer sans les tableaux de filiation du fabricant (à saisir ci-dessous).';
    if (ratio < +R.selRatio || upLo <= dnHi) { res.verdict = 'Absence de sélectivité probable (seuils trop proches)'; res.cls = 'ko'; }
    else if (IkDown != null && upLo > IkDown * 1000) { res.verdict = 'Sélectivité ampèremétrique probable sur toute la plage d\'Icc (indicatif, à confirmer par les tables du fabricant)'; res.cls = 'check'; }
    else { res.verdict = `Sélectivité partielle probable jusqu'à ≈ ${(upLo / 1000).toFixed(2)} kA (indicatif, à confirmer par les tables du fabricant)`; res.cls = 'check'; }
    return res;
  }
  // courbes génériques temps-courant (EN 60898-1) : zone thermique 1,13–1,45 In, zone magnétique selon courbe
  function curvePoints(p) {
    const cv = p.curve === 'TM' || p.curve === 'Élec.' ? p.curve : (p.curve || 'C'), [lo, hi] = CURVE_IM[cv] || CURVE_IM.C, In = +p.In, minB = [], maxB = [];
    for (let x = 1.14; x <= 60; x *= 1.08) { const tmin = x >= lo ? 0.005 : 997 / (x * x - 1), tmax = x >= hi ? 0.02 : 3969 / (x * x - 1); minB.push([x * In, Math.max(0.005, Math.min(10000, tmin))]); maxB.push([x * In, Math.max(0.01, Math.min(10000, tmax))]); }
    return { minB, maxB };
  }

  // ---------- 14. nomenclature et chiffrage ----------
  function bom(st, res, lib) {
    const items = {}, add = (p, qty, cat, note) => { if (!p || !(qty > 0)) return; const k = p.fab + '|' + p.ref; const it = items[k] || (items[k] = { ref: p.ref, fab: p.fab, name: p.name, cat, unit: p.unit || 'pce', price: +p.price || 0, qty: 0, notes: new Set() }); it.qty += qty; if (note) it.notes.add(note); };
    const find = (ref) => (lib || []).find((p) => p.ref === ref);
    const layouts = {};
    st.boards.forEach((b) => {
      const lay = layout(st, b, res, lib); layouts[b.id] = lay;
      lay.devs.forEach((d) => { if (d.ref) add(find(d.ref) || d, 1, 'Appareillage', b.name); });
      const encs = enclosures(st, b, lay, lib), e = (b.enc && encs.find((x) => x.ref === b.enc)) || encs[0]; lay.enc = e || null;
      if (e) add(find(e.ref), e.count, 'Enveloppes', b.name); else if (lay.used) layouts[b.id].noEnc = true;
      add(find('GEN-PLASTRON-150'), lay.rows.length, 'Enveloppes', b.name);
      add(find('GEN-RAIL-DIN'), Math.ceil(lay.rows.length * ((e ? e.W : 450) / 1000) * 10) / 10, 'Accessoires', b.name);
      add(find('GEN-GOUL-40x60'), Math.ceil((lay.rows.length + 1) * ((e ? e.W : 450) / 1000) * 10) / 10, 'Accessoires', b.name);
      const blanks = Math.floor(lay.free / 5); add(find('GEN-OBT'), blanks, 'Accessoires', b.name);
      lay.combs.forEach((cm) => { const len = [13, 18, 24].find((x) => x >= cm.mods) || 24; add(find(`GEN-PGN-H-${cm.poles.replace('+', '')}-${len}`), 1, 'Accessoires', b.name); });
      add(find('GEN-PGN-V'), lay.vCombs, 'Accessoires', b.name);
      add(find('GEN-BOR-PE'), 1, 'Accessoires', b.name); add(find('GEN-BOR-N'), 1, 'Accessoires', b.name);
      add(find('GEN-BOR-RAIL'), b.circuits.length, 'Accessoires', b.name); add(find('GEN-FIX'), 1, 'Accessoires', b.name);
      if (lay.busbar) { const bb = (lib || []).filter((p) => p.type === 'busbar' && +p.In >= lay.busbar.In).sort((a, c) => a.In - c.In)[0]; add(bb, Math.ceil(((e ? e.W : 800) / 1000) * 10) / 10, 'Accessoires', b.name); }
      b.circuits.forEach((c) => { const r = res.circuits[c.id], L = num(c.length); if (!r || !r.section || !L) return; const cores = r.phases === 3 ? '5G' : '3G'; add(find(`GEN-CAB-U1000R2V-${cores}${String(r.section).replace('.', ',')}`) || { ref: `CAB-${cores}${r.section}`, fab: 'Générique', name: `Câble ${cores}${String(r.section).replace('.', ',')} mm²`, unit: 'm', price: 0 }, L, 'Câbles', `${b.name} › ${c.name}`); });
    });
    const list = Object.values(items).map((x) => Object.assign(x, { total: x.qty * x.price, notes: [...x.notes].join(', ') }));
    const R = st.rules, sum = (cat) => list.filter((x) => x.cat === cat).reduce((a, x) => a + x.total, 0);
    const nDev = list.filter((x) => x.cat === 'Appareillage').reduce((a, x) => a + x.qty, 0), nCirc = st.boards.reduce((a, b) => a + b.circuits.length, 0);
    const hours = nDev * +R.hDevice + nCirc * +R.hCircuit + st.boards.length * +R.hBoard, labour = hours * +R.labourRate;
    const mat = sum('Appareillage'), env = sum('Enveloppes'), acc = sum('Accessoires'), cab = sum('Câbles'), sub = mat + env + acc + cab + labour;
    const frais = sub * +R.fraisPct / 100, base = sub + frais, marge = base * +R.marginPct / 100, ht = base + marge, tva = ht * +R.tvaPct / 100;
    const noPrice = list.filter((x) => !x.price).length;
    return { list, layouts, cost: { mat, env, acc, cab, hours, labour, frais, marge, ht, tva, ttc: ht + tva }, noPrice };
  }

  // ---------- 15. étiquettes ----------
  function labels(st, res, layouts) {
    const L = [];
    st.boards.forEach((b) => {
      const lay = layouts[b.id]; if (!lay) return; let n = 0;
      lay.rows.forEach((r) => { L.push({ kind: 'Bandeau de rangée', board: b.name, text: `${b.name} – rangée ${r.n}`, sub: r.items.map((d) => d.label).join(' · ') }); r.items.forEach((d) => { n++; const cr = d.id && res.circuits[d.id]; L.push({ kind: d.role === 'circuit' ? 'Disjoncteur' : d.role === 'rcd' ? 'Différentiel' : 'Appareil', board: b.name, text: `Q${n}`, sub: d.label + (cr ? ` – ${cr.In} A – ${String(cr.section || '?').replace('.', ',')} mm²` : '') }); }); });
      b.circuits.forEach((c, i) => { const r = res.circuits[c.id]; L.push({ kind: 'Repère de circuit', board: b.name, text: `C${i + 1}`, sub: c.name }); L.push({ kind: 'Étiquette de départ', board: b.name, text: c.name, sub: r ? `${r.poles} ${r.In} A${r.rcd ? ' – ' + r.rcd + ' mA' : ''}` : '' }); L.push({ kind: 'Bornier', board: b.name, text: `X${i + 1}`, sub: c.name }); if (r && r.section) { const cab = `${r.phases === 3 ? '5G' : '3G'}${String(r.section).replace('.', ',')}`; L.push({ kind: 'Câble (origine)', board: b.name, text: `${b.name}/C${i + 1}`, sub: `${cab} – ${c.name}` }); L.push({ kind: 'Câble (arrivée)', board: b.name, text: `${b.name}/C${i + 1}`, sub: `${cab} – vers ${c.name}` }); } });
    });
    return L;
  }

  EE.BT = { SECTIONS, IN_STD, IZ, METHODS, KT_AIR, KT_SOIL, KG, RHO, CURVE_IM, TYPES, MOTORS, EARTHING, AL_K, num, defaultRules, newStudy, newBoard, newCircuit, newLoad, balance, compute, sizeCircuit, layout, enclosures, thermal, selectivity, curvePoints, bom, labels, izOf, kGroup, lookupT, findCircuit, boardById, childOf, polesOf, rcdNeed, nextIn };
})(window);
