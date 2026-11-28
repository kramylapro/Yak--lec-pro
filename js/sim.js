/* Yak-élec-pro – moteur de simulation (états des appareils, alimentation des récepteurs, bobines/contacts, temporisation, protections)
   Principe : on réutilise l'analyse de connectivité (réseaux) et on ne laisse conduire que les contacts réellement fermés. */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library;
  const E3 = [['1', '2'], ['3', '4'], ['5', '6']], P12 = [['1', '2']];

  // ---------- tables d'appareils : état initial, action de l'utilisateur, contacts fermés ----------
  const tog = (pairs, o = {}) => ({ init: () => ({ on: !!o.init }), click: (s) => { s.on = !s.on }, edges: (s) => ((o.nf ? !s.on : s.on) ? pairs : []), vis: (s) => ({ closed: o.nf ? !s.on : s.on, on: s.on }) });
  const mom = (pairs, o = {}) => Object.assign(tog(pairs, o), { click: () => {}, press: (s) => { s.on = true }, release: (s) => { s.on = false }, momentary: true });
  const fuse = (pairs) => ({ init: () => ({ blown: false }), click: (s) => { s.blown = false }, edges: (s) => (s.blown ? [] : pairs), vis: (s) => ({ closed: !s.blown, blown: s.blown, tripped: s.blown }), trip: (s) => { s.blown = true }, prot: true });
  const brk = (pairs) => ({ init: () => ({ on: true, tripped: false }), click: (s) => { if (s.tripped) { s.tripped = false; s.on = true; } else s.on = !s.on; }, edges: (s) => (s.on && !s.tripped ? pairs : []), vis: (s) => ({ closed: s.on && !s.tripped, tripped: s.tripped }), trip: (s) => { s.tripped = true; s.on = false; }, prot: true });
  const E2 = [['1', '2'], ['3', '4']];
  const DEV = {
    interrupteur: tog(P12),
    interrupteur_double: { init: () => ({ a: false, b: false }), click: (s, c, lx) => { if (lx < 0) s.a = !s.a; else s.b = !s.b; }, edges: (s) => (s.a ? [['C', '1']] : []).concat(s.b ? [['C', '2']] : []), vis: (s) => ({ c1: s.a, c2: s.b }) },
    va_et_vient: { init: () => ({ pos: 0 }), click: (s) => { s.pos = s.pos ? 0 : 1; }, edges: (s) => [['C', s.pos ? 'L2' : 'L1']], vis: (s) => ({ pos: s.pos }) },
    selecteur_3: { init: () => ({ pos: 0 }), click: (s) => { s.pos = (s.pos + 1) % 3; }, edges: (s) => (s.pos === 1 ? [['C', 'A']] : s.pos === 2 ? [['C', 'B']] : []), vis: (s) => ({ pos: s.pos }) },
    bp_no: mom(P12), bp_nf: mom(P12, { nf: true }),
    arret_urgence: tog([['11', '12']], { nf: true }), selecteur_2: tog(P12),
    fdc_no: tog([['13', '14']]), fdc_nf: tog([['21', '22']], { nf: true }), detecteur_inductif: tog(P12), pressostat: tog(P12), thermostat: tog(P12),
    disjoncteur: brk(P12), differentiel: brk(P12), disjoncteur_tri: brk(E3), disjoncteur_moteur: brk(E3),
    sectionneur_tri: tog(E3, { init: true }),
    crepusculaire: Object.assign(tog(P12), { info: (s) => (s.on ? 'nuit : contact fermé' : 'jour : contact ouvert') }),
    telerupteur: { init: () => ({ on: false }), edges: (s) => (s.on ? P12 : []), vis: (s) => ({ closed: s.on }), latch: (s) => { s.on = !s.on; } },
    minuteur: { init: () => ({ rem: 0 }), click: (s, c) => { s.rem = parseDelay(c.val); }, edges: (s) => (s.rem > 0 ? P12 : []), vis: (s) => ({ closed: s.rem > 0, rem: Math.ceil(s.rem) }), tick: (s, dt) => { if (s.rem > 0) s.rem = Math.max(0, s.rem - dt); }, info: (s) => (s.rem > 0 ? `allumé, reste ${Math.ceil(s.rem)} s` : 'éteint (cliquer = impulsion)') },
    disjoncteur_bi: brk(E2), disjoncteur_diff_bi: brk(E2), sectionneur_bi: tog(E2, { init: true }),
    sectionneur_fusibles_bi: { init: () => ({ on: true, blown: false }), click: (s) => { if (s.blown) s.blown = false; else s.on = !s.on; }, edges: (s) => (s.on && !s.blown ? E2 : []), vis: (s) => ({ closed: s.on && !s.blown, blown: s.blown, tripped: s.blown }), trip: (s) => { s.blown = true; }, prot: true },
    sectionneur_fusibles: { init: () => ({ on: true, blown: false }), click: (s) => { if (s.blown) s.blown = false; else s.on = !s.on; }, edges: (s) => (s.on && !s.blown ? E3 : []), vis: (s) => ({ closed: s.on && !s.blown, blown: s.blown, tripped: s.blown }), trip: (s) => { s.blown = true; }, prot: true },
    fusible: fuse(P12), fusible_tri: fuse(E3),
    relais_thermique: { init: () => ({ tripped: false }), click: (s) => { s.tripped = !s.tripped; }, edges: (s) => E3.concat(s.tripped ? [['97', '98']] : [['95', '96']]), vis: (s) => ({ tripped: s.tripped }) },
    // appareils pilotés par une bobine de même repère (ctx.coil) ou par une temporisation
    contacteur: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? P12 : []) },
    relais: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? [['13', '14']] : []) },
    contacteur_tri: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? E3 : []) },
    contact_no: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? [['13', '14']] : []) },
    contact_nf: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? [] : [['21', '22']]) },
    contact_no_tt: { ctl: 'timer', edges: (s, c, x) => (x.done[c.label] ? [['67', '68']] : []) },
    contact_nf_tt: { ctl: 'timer', edges: (s, c, x) => (x.done[c.label] ? [] : [['55', '56']]) },
    // V1.10 : nouveaux appareils
    interrupteur_sectionneur: tog(E2, { init: true }),
    differentiel_tetra: brk([['1', '2'], ['3', '4'], ['5', '6'], ['N1', 'N2']]),
    detecteur_capacitif: tog(P12), detecteur_photo: tog(P12), detecteur_mouvement: tog(P12),
    contact_no_tr: { ctl: 'timerOff', edges: (s, c, x) => (x.off[c.label] ? [['57', '58']] : []) },
    contact_nf_tr: { ctl: 'timerOff', edges: (s, c, x) => (x.off[c.label] ? [] : [['65', '66']]) },
    bobine_compteur: { init: () => ({ count: 0 }), click: (s) => { s.count = 0; }, latch: (s) => { s.count++; }, vis: (s) => ({ count: s.count }), info: (s, c) => `${s.count} / ${parseInt(c.val, 10) || 5} impulsion(s) – cliquer = remise à zéro` },
    contact_compteur: { ctl: 'count', edges: (s, c, x) => (x.cnt[c.label] ? [['13', '14']] : []) },
    poles_contacteur: { ctl: 'coil', edges: (s, c, x) => (x.coil[c.label] ? E3 : []) },
    contact_rt_nf: { ctl: 'therm', edges: (s, c, x) => (x.therm[c.label] ? [] : [['95', '96']]) },
    contact_rt_no: { ctl: 'therm', edges: (s, c, x) => (x.therm[c.label] ? [['97', '98']] : []) },
    automate: { plc: true, edges: (s, c, x) => { const o = (x.plc[c.id] || {}).out || []; return o.map((v, i) => (v ? ['C', 'Q' + (i + 1)] : null)).filter(Boolean); }, vis: () => ({}) },
    relais_logique: { plc: true, edges: (s, c, x) => { const o = (x.plc[c.id] || {}).out || []; return o.map((v, i) => (v ? ['C', 'Q' + (i + 1)] : null)).filter(Boolean); }, vis: () => ({}) },
    resistance: { pa: true, edges: () => [['1', '2']] }, led: { pa: true, edges: () => [['A', 'K']] }, diode: { pa: true, edges: () => [['A', 'K']] }, zener: { pa: true, edges: () => [['A', 'K']] },
  };
  const potIdx = (p) => ({ L1: 0, L2: 1, L3: 2 }[p] !== undefined ? { L1: 0, L2: 1, L3: 2 }[p] : /\.U$/.test(p) ? 0 : /\.V$/.test(p) ? 1 : /\.W$/.test(p) ? 2 : -1);

  function assign(sets) { // un potentiel distinct par borne d'alimentation
    const out = [];
    const rec = (i, used) => { if (i === sets.length) return true; for (const p of sets[i]) if (!used.has(p)) { used.add(p); out[i] = p; if (rec(i + 1, used)) return true; used.delete(p); } return false; };
    return rec(0, new Set()) ? out : null;
  }
  function parseDelay(v) { const m = /([0-9]+(?:[.,][0-9]+)?)/.exec(v || ''); return m ? parseFloat(m[1].replace(',', '.')) : 3; }

  // ---------- tensions et courants théoriques (valeurs nominales, pas une mesure) ----------
  const num = (v) => { const m = /(-?[0-9]+(?:[.,][0-9]+)?)/.exec(v || ''); return m ? parseFloat(m[1].replace(',', '.')) : null; };
  function powerW(val) { // « 60 W », « 1,5 kW », « 2 kVA », « 3 CV »
    const s = String(val || '').toLowerCase(); const n = num(s); if (n == null) return null;
    if (/cv|ch\b/.test(s)) return n * 736; if (/k\s*(w|va)/.test(s)) return n * 1000; if (/(w|va)\b/.test(s)) return n; return null;
  }
  function potVolt(doc, a, b, U) { // tension entre deux potentiels
    const ph = (p) => /^L[123]$/.test(p), byId = (id) => doc.comps.find((c) => c.id === id);
    if (ph(a) && ph(b)) return U.uTri; if ((ph(a) && b === 'N') || (ph(b) && a === 'N')) return U.uMono;
    if ((a === 'DC+' && b === 'DC-') || (a === 'DC-' && b === 'DC+')) { const src = doc.comps.find((c) => ['batterie', 'pile', 'alim_cc', 'panneau_pv', 'eolienne'].includes(c.type)); return src ? num(src.val) : null; }
    const m1 = /^(c[^.]+)\.(S1|S2|\+|-|U|V|W)$/.exec(a), m2 = /^(c[^.]+)\.(S1|S2|\+|-|U|V|W)$/.exec(b);
    if (m1 && m2 && m1[1] === m2[1]) { const c = byId(m1[1]); if (!c) return null; if (/^[UVW]$/.test(m1[2])) return U.uTri; const v = String(c.val || '').split('/'); return num(v[v.length - 1]); }
    return null;
  }
  function create(doc) {
    doc = EE.clone(doc);
    const A = EE.Engine.analyze(doc);
    const S = { doc, A, lastOn: {}, st: {}, coil: {}, act: {}, el: {}, done: {}, offEl: {}, off: {}, plc: {}, log: [], view: null, t: 0 };
    const progs = {}; doc.comps.forEach((c) => { if (Lib.get(c.type).plc) progs[c.id] = EE.PLC.parseProgram(c.val); });
    doc.comps.forEach((c) => { const d = DEV[c.type]; if (d && d.init) S.st[c.id] = d.init(); });
    const netOf = (c, tid) => A.netOf('T:' + c.id + '.' + tid);
    const byId = {}; doc.comps.forEach((c) => { byId[c.id] = c; });

    function graph() {
      const ufS = new Map(), ufA = new Map();
      const find = (m, a) => { if (!m.has(a)) m.set(a, a); while (m.get(a) !== a) { m.set(a, m.get(m.get(a))); a = m.get(a); } return a; };
      const uni = (m, a, b) => { a = find(m, a); b = find(m, b); if (a !== b) m.set(a, b); };
      const ctx = { coil: S.coil, done: S.done, off: S.off, plc: S.plc, cnt: counts(), therm: therms() };
      doc.comps.forEach((c) => {
        const d = DEV[c.type]; if (!d || !d.edges) return;
        d.edges(S.st[c.id], c, ctx).forEach(([a, b]) => { const na = netOf(c, a), nb = netOf(c, b); uni(ufA, na, nb); if (!d.pa) uni(ufS, na, nb); });
      });
      const potsS = new Map(), potsA = new Map();
      const addPot = (m, uf, net, p) => { const r = find(uf, net); if (!m.has(r)) m.set(r, new Set()); m.get(r).add(p); };
      doc.comps.forEach((c) => {
        const d = Lib.get(c.type); const srcs = Lib.sources(c); if (!srcs) return;
        if (d.conv && !S.act[c.id]) return;
        Object.keys(srcs).forEach((tid) => { const n = netOf(c, tid); addPot(potsS, ufS, n, srcs[tid]); addPot(potsA, ufA, n, srcs[tid]); });
      });
      return {
        ufS, ufA, potsS, potsA, find,
        potsOfA: (n) => potsA.get(find(ufA, n)) || new Set(),
        potsOfS: (n) => potsS.get(find(ufS, n)) || new Set(),
      };
    }
    function therms() { const r = {}; doc.comps.forEach((c) => { if (c.type === 'relais_thermique' && c.label && S.st[c.id]) r[c.label] = r[c.label] || !!S.st[c.id].tripped; }); return r; }
    function counts() { const r = {}; doc.comps.forEach((c) => { if (Lib.get(c.type).counter && c.label && S.st[c.id]) r[c.label] = S.st[c.id].count >= (parseInt(c.val, 10) || 5); }); return r; }
    // automates : entrée active = borne reliée à un potentiel actif (phase, secondaire, +) ; programme évalué à chaque résolution
    const LIVE = (p) => p !== 'N' && p !== 'PE' && p !== 'DC-' && !/\.(S2|-)$/.test(p);
    function plcStep(G) {
      let ch = false;
      doc.comps.forEach((c) => {
        const d = Lib.get(c.type); if (!d.plc) return;
        const on = loadState(G, c, d.loads[0]).on; const prev = S.plc[c.id] || { out: [] };
        const inp = []; for (let i = 1; i <= d.plc.nIn; i++) inp.push(on && [...G.potsOfA(netOf(c, 'I' + i))].some(LIVE));
        let out = new Array(d.plc.nOut).fill(false);
        if (on) { const pr = progs[c.id]; out = out.map((v, i) => { const e = pr.eqs.filter((q) => q.out === i + 1).pop(); return e ? EE.PLC.evalExpr(e.ast, inp, prev.out) : false; }); }
        const nx = { on, inp, out }; if (JSON.stringify(nx) !== JSON.stringify(prev)) ch = true; S.plc[c.id] = nx;
      });
      return ch;
    }
    function loadState(G, c, supply) {
      const sets = supply.map((tid) => [...G.potsOfA(netOf(c, tid))].filter((p) => p !== 'PE'));
      const a = assign(sets); return { on: !!a, assign: a };
    }

    function solve() {
      let G;
      for (let outer = 0; outer < 6; outer++) {
        for (let loops = 0; loops < 14; loops++) {
          G = graph(); const nc = {}, na = {};
          doc.comps.forEach((c) => {
            const d = Lib.get(c.type); if (!d.loads) return;
            d.loads.forEach((sup) => { const on = loadState(G, c, sup).on; if (d.coil && c.label) nc[c.label] = nc[c.label] || on; if (d.conv) na[c.id] = on; });
          });
          let diff = JSON.stringify(nc) !== JSON.stringify(S.coil) || JSON.stringify(na) !== JSON.stringify(S.act);
          S.coil = nc; S.act = na;
          doc.comps.forEach((c) => { if (Lib.get(c.type).timerOff && c.label && S.coil[c.label] && !S.off[c.label]) { S.off[c.label] = true; S.offEl[c.label] = 0; diff = true; } });
          if (plcStep(G)) diff = true;
          if (!diff) break;
        }
        let flipped = false;
        doc.comps.forEach((c) => { const dv = DEV[c.type]; if (!dv || !dv.latch || !c.label) return; const on = !!S.coil[c.label]; if (on && !S.lastOn[c.id]) { dv.latch(S.st[c.id]); flipped = true; } S.lastOn[c.id] = on; });
        if (flipped) continue;
        // court-circuits : plusieurs potentiels reliés par des contacts fermés seulement
        const shortRoots = new Set(); G.potsS.forEach((s, r) => { if (s.size > 1) shortRoots.add(r); });
        if (!shortRoots.size) { S.shortRoots = shortRoots; break; }
        let tripped = false;
        doc.comps.forEach((c) => {
          const d = DEV[c.type]; if (!d || !d.prot) return;
          const closed = d.edges(S.st[c.id], c, {}); if (!closed.length) return;
          if (closed.some(([a]) => shortRoots.has(G.find(G.ufS, netOf(c, a))))) { d.trip(S.st[c.id]); tripped = true; const msg = `${c.label || Lib.get(c.type).name} a déclenché : court-circuit`; if (!S.log.includes(msg)) S.log.push(msg); }
        });
        S.shortRoots = shortRoots;
        if (!tripped) break;
      }
      S.G = G; S.view = buildView(G); return S.view;
    }

    function buildView(G) {
      const comp = {}, items = [], alerts = [];
      doc.comps.forEach((c) => {
        const d = Lib.get(c.type), dv = DEV[c.type]; let v = {};
        if (dv && dv.edges) { const e = dv.edges(S.st[c.id], c, { coil: S.coil, done: S.done, off: S.off, plc: S.plc, cnt: counts(), therm: therms() }); v.closed = e.length > 0; }
        if (dv && dv.vis) Object.assign(v, dv.vis(S.st[c.id]));
        if (dv && dv.info && S.st[c.id]) items.push({ id: c.id, label: c.label, name: d.name, on: !!v.closed, text: dv.info(S.st[c.id], c), cls: 'coil' });
        if (d.coil && c.label) { v.coil = !!S.coil[c.label]; }
        if (d.loads) {
          const ls = d.loads.map((sup) => loadState(G, c, sup)); const on = ls.some((x) => x.on); v.on = on;
          if (d.coil) { v.coil = on; if (c.label) items.push({ id: c.id, label: c.label, name: d.name, on, text: on ? (d.timer ? `excitée (${(S.el[c.label] || 0).toFixed(1)} / ${parseDelay(c.val)} s)` : 'excitée') : 'au repos', cls: 'coil' }); }
          else if (['lampe', 'voyant', 'avertisseur', 'electrovanne', 'resistance_chauff', 'prise'].includes(c.type)) { if (c.type !== 'prise') items.push({ id: c.id, label: c.label, name: d.name, on, text: on ? (c.type === 'lampe' || c.type === 'voyant' ? 'allumé' : 'alimenté') : 'éteint', cls: 'load' }); }
          else if (d.motor6) {
            const pr = (t) => [...G.potsOfA(netOf(c, t))].filter((q) => q !== 'PE' && q !== 'N'); const r = (t) => G.find(G.ufA, netOf(c, t));
            const star = r('U2') === r('V2') && r('V2') === r('W2') && !pr('U2').length;
            const ends = ['U2', 'V2', 'W2'].map(pr), delta = ends.every((x) => x.length === 1) && new Set(ends.map((x) => x[0])).size === 3 && ['U', 'V', 'W'].every((k) => pr(k + '1')[0] !== pr(k + '2')[0]);
            const run = on && (star || delta); v.on = run; v.coupling = run ? (star ? 'étoile' : 'triangle') : '';
            items.push({ id: c.id, label: c.label, name: d.name, on: run, text: run ? `en marche – couplage ${star ? 'ÉTOILE (démarrage)' : 'TRIANGLE (régime normal)'}` : on ? 'alimenté mais couplage incomplet (ni étoile ni triangle)' : 'à l\'arrêt', cls: 'motor' });
          }
          else if (/^moteur/.test(c.type)) {
            let dir = 'cw'; const a = ls[0].assign;
            if (on && c.type === 'moteur_tri' && a) { const i = potIdx(a[0]), j = potIdx(a[1]), k = potIdx(a[2]); if (i >= 0 && j >= 0 && k >= 0) dir = ((j - i + 3) % 3 === 1 && (k - j + 3) % 3 === 1) ? 'cw' : 'ccw'; }
            v.dir = dir; items.push({ id: c.id, label: c.label, name: d.name, on, text: on ? `en marche (${c.type === 'moteur_tri' ? 'sens ' + (dir === 'cw' ? 'direct' : 'inverse') : 'tourne'})` : 'à l\'arrêt', cls: 'motor' });
          }
        }
        if (d.conv && !d.loads) { /* sources conditionnelles seulement */ }
        if (d.conv) v.on = !!S.act[c.id];
        if (dv && dv.pa && !dv.ctl) { const n = netOf(c, Lib.get(c.type).term[0].id); v.on = G.potsOfA(n).size > 1 && c.type !== 'resistance'; }
        if (dv && dv.edges && d.timer) { /* rien */ }
        comp[c.id] = v;
      });
      doc.comps.forEach((c) => { const d = Lib.get(c.type); if (!d.plc) return; const P = S.plc[c.id] || { inp: [], out: [] }; comp[c.id] = Object.assign(comp[c.id] || {}, { on: P.on, inp: P.inp, out: P.out });
        items.push({ id: c.id, label: c.label, name: d.name, on: !!P.on, text: P.on ? `entrées ${P.inp.map((v, i) => 'I' + (i + 1) + (v ? '●' : '○')).join(' ')} – sorties ${P.out.map((v, i) => 'Q' + (i + 1) + (v ? '●' : '○')).join(' ')}` : 'non alimenté (L-N)', cls: 'coil' });
        (progs[c.id].errors || []).forEach((m) => { const t = `${c.label || d.name} – programme : ${m}`; if (!alerts.includes(t)) alerts.push(t); }); });
      doc.comps.forEach((c) => { if (Lib.get(c.type).timerOff && c.label) { const it = items.find((i) => i.id === c.id); if (it && !S.coil[c.label] && S.off[c.label]) it.text = `coupée – contacts encore basculés (${(S.offEl[c.label] || 0).toFixed(1)} / ${parseDelay(c.val)} s)`; } });
      // appareils manuels / protections dans le résumé
      doc.comps.forEach((c) => { const dv = DEV[c.type]; if (!dv || !S.st[c.id]) return; const d = Lib.get(c.type);
        if (dv.prot) { const v = comp[c.id]; items.push({ id: c.id, label: c.label, name: d.name, on: v.closed, text: v.tripped ? 'DÉCLENCHÉ (cliquer pour réarmer)' : v.closed ? 'fermé' : 'ouvert', cls: v.tripped ? 'trip' : 'dev' }); }
        else if (c.type === 'relais_thermique') items.push({ id: c.id, label: c.label, name: d.name, on: !S.st[c.id].tripped, text: S.st[c.id].tripped ? 'DÉCLENCHÉ – surcharge (cliquer pour réarmer)' : 'normal (cliquer pour simuler une surcharge)', cls: S.st[c.id].tripped ? 'trip' : 'dev' });
      });
      Object.keys(S.coil).forEach((l) => { if (!doc.comps.some((c) => Lib.get(c.type).coil && c.label === l)) delete S.coil[l]; });
      doc.comps.forEach((c) => { if (Lib.get(c.type).contact && !doc.comps.some((x) => (Lib.get(x.type).coil || (Lib.get(c.type).owners || []).includes(x.type)) && x.label === c.label && c.label)) { const m = `Contact « ${c.label || '?'} » sans bobine du même repère`; if (!alerts.includes(m)) alerts.push(m); } });
      if (S.shortRoots && S.shortRoots.size) alerts.push('Court-circuit présent sans protection : ajoutez un fusible ou un disjoncteur');
      const wire = {};
      doc.wires.forEach((w) => {
        const n = A.netOf('W:' + w.id); const pots = [...G.potsOfA(n)]; const sh = S.shortRoots && S.shortRoots.has(G.find(G.ufS, n));
        wire[w.id] = { pots, short: !!sh };
      });
      // tensions et courants des récepteurs alimentés
      const U = { uMono: 230, uTri: 400, cosM: 0.85, eta: 0.9 }; const elec = [];
      doc.comps.forEach((c) => {
        const d = Lib.get(c.type); if (!d.loads || d.coil || d.plc || !comp[c.id] || !comp[c.id].on) return;
        const ls = d.loads.map((sup) => loadState(G, c, sup)).find((x) => x.on); if (!ls || !ls.assign) return;
        const a = ls.assign; const tri = a.length === 3; const u = tri ? U.uTri : potVolt(doc, a[0], a[1], U);
        const P = powerW(c.val); const mot = /^moteur/.test(c.type) || ['variateur', 'demarreur_progressif'].includes(c.type); if (Lib.get(c.type).motor6 && !comp[c.id].on) return;
        const cos = mot ? U.cosM : 1, eta = mot ? U.eta : 1; let I = null;
        if (P != null && u) I = tri ? P / (Math.sqrt(3) * u * cos * eta) : P / (u * cos * eta);
        elec.push({ id: c.id, label: c.label || d.name, u, P, I, tri, pots: a.join('–'), mot });
        comp[c.id].u = u; comp[c.id].i = I;
      });
      return { comp, wire, items, alerts, elec, log: S.log.slice(-6) };
    }

    function tick(dt) {
      let changed = false; const before = JSON.stringify(S.view);
      doc.comps.forEach((c) => { const d = Lib.get(c.type); if (d.timer && c.label) { const on = !!S.coil[c.label]; S.el[c.label] = on ? (S.el[c.label] || 0) + dt : 0; } });
      doc.comps.forEach((c) => { const d = Lib.get(c.type); if (!d.timerOff || !c.label) return; if (S.coil[c.label]) { S.off[c.label] = true; S.offEl[c.label] = 0; } else if (S.off[c.label]) { S.offEl[c.label] = (S.offEl[c.label] || 0) + dt; if (S.offEl[c.label] >= parseDelay(c.val) - 1e-9) S.off[c.label] = false; } });
      const done = {}; doc.comps.forEach((c) => { const d = Lib.get(c.type); if (d.timer && c.label) done[c.label] = !!S.coil[c.label] && S.el[c.label] >= parseDelay(c.val) - 1e-9; });
      doc.comps.forEach((c) => { const dv = DEV[c.type]; if (dv && dv.tick && S.st[c.id]) dv.tick(S.st[c.id], dt, c); });
      S.done = done; S.t += dt; solve();
      // les temporisations qui viennent d'expirer peuvent changer des bobines : on résout à nouveau
      changed = JSON.stringify(S.view) !== before; return changed;
    }
    function find(cid) { return byId[cid]; }
    return {
      doc, get view() { return S.view; }, state: S.st, coil: S.coil,
      press(cid, lx) { const c = find(cid), d = DEV[c && c.type]; if (!d || !S.st[cid]) return false; if (d.momentary) d.press(S.st[cid]); else if (d.click) d.click(S.st[cid], c, lx || 0); else return false; solve(); return true; },
      release(cid) { const c = find(cid), d = DEV[c && c.type]; if (d && d.release) { d.release(S.st[cid]); solve(); return true; } return false; },
      tick, solve,
      reset() { doc.comps.forEach((c) => { const d = DEV[c.type]; if (d && d.init) S.st[c.id] = d.init(); }); S.coil = {}; S.act = {}; S.lastOn = {}; S.el = {}; S.done = {}; S.off = {}; S.offEl = {}; S.plc = {}; S.log = []; solve(); },
      isInteractive(cid) { const c = find(cid); return !!(c && DEV[c.type] && S.st[cid]); },
    };
  }
  EE.Sim = { create, DEV, powerW, potVolt };
})(window);
