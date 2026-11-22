/* Yak-élec-pro – quantitatif : pièces + appareils → circuits, protections, matériel, coffret */
(function (g) {
  'use strict';
  const EE = g.EE;
  const SERIES = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
  const CONDUIT = { 1.5: 16, 2.5: 20, 4: 25, 6: 25, 10: 32, 16: 40 };
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
  const int = (v) => Math.max(0, Math.floor(num(v)));
  const secKey = (s) => String(s).replace('.', '_').replace(',', '_');
  const secTxt = (s) => String(s).replace('.', ',');

  function newStudy(name) { return { id: EE.uid('q'), name: name || 'Nouvelle étude', created: Date.now(), modified: Date.now(), rooms: [newRoom('Séjour')], appliances: [], note: '' }; }
  function newRoom(name) { return { id: EE.uid('r'), name: name || 'Pièce', L: 4, W: 3, H: 2.8, dist: 5, lights: 1, switches: 1, vav: 0, sockets: 4 }; }

  // Calcule tout à partir d'une étude et de la configuration ; fonction pure.
  function compute(study, cfg) {
    cfg = cfg || EE.Config.get();
    const R = cfg.rules, cat = {}; cfg.catalog.forEach((c) => (cat[c.id] = c));
    const warns = [], items = {}, order = [];
    const add = (id, qty, fb) => {
      if (!(qty > 0)) return;
      let it = items[id];
      if (!it) {
        const c = cat[id];
        if (!c) warns.push(`« ${fb || id} » n'est pas dans le catalogue : ajoutez-le dans le Portail (prix à 0).`);
        it = items[id] = { id, cat: c ? c.cat : 'Autres', norm: c ? c.norm || '' : '', name: c ? c.name : (fb || id), unit: c ? c.unit : 'pce', price: c ? +c.price || 0 : 0, mods: c ? +c.mods || 0 : 0, qty: 0 };
        order.push(id);
      }
      it.qty += qty;
    };
    const rooms = (study.rooms || []).map((r) => ({ id: r.id, name: r.name || 'Pièce', L: num(r.L), W: num(r.W), H: num(r.H) || 2.5, dist: num(r.dist), lights: int(r.lights), switches: int(r.switches), vav: int(r.vav), sockets: int(r.sockets) }));
    rooms.forEach((r) => { if (r.switches + r.vav * 2 === 0 && r.lights > 0) warns.push(`${r.name} : points lumineux sans interrupteur.`); if (r.vav && r.lights < 1) warns.push(`${r.name} : va-et-vient sans point lumineux.`); });
    const wasteK = 1 + (+R.wastePct || 0) / 100, hs = +R.switchHeight, hp = +R.socketHeight;

    // ---- longueurs de câble (m) par catégorie de circuit ----
    let lenL = 0, lenS = 0; const byRoom = [];
    rooms.forEach((r) => {
      const per = (r.L + r.W);
      let l = 0, s = 0;
      if (r.lights) {
        l += r.dist + r.H;                                                       // descente du coffret jusqu'au plafond de la pièce
        l += Math.max(0, r.lights - 1) * Math.sqrt((r.L * r.W) / r.lights);     // liaison entre luminaires (maille régulière)
      }
      const nsw = r.switches + r.vav * 2;
      l += r.switches * (Math.max(0, r.H - hs) + per / 4);                       // descente + trajet jusqu'à chaque interrupteur simple
      l += r.vav * (2 * Math.max(0, r.H - hs) + per / 2);                        // navettes entre les deux va-et-vient
      if (r.sockets) { s += r.dist + Math.max(0, r.H - hp); s += r.sockets * per / 2; }
      lenL += l; lenS += s; byRoom.push({ name: r.name, light: l * wasteK, socket: s * wasteK });
    });

    // ---- circuits ----
    const circuits = []; let cn = 0;
    const totLights = rooms.reduce((a, r) => a + r.lights, 0), totSock = rooms.reduce((a, r) => a + r.sockets, 0);
    const mk = (kind, label, breaker, section, points, where, typeA) => circuits.push({ id: 'C' + (++cn), kind, label, breaker, section, points, where, typeA: !!typeA });
    const pack = (key, max, kind, label, breaker, section) => {
      let cur = null; const m = Math.max(1, +max || 1);
      rooms.forEach((r) => { let left = r[key]; while (left > 0) { if (!cur || cur.points >= m) { cur = { points: 0, rooms: [] }; mk(kind, '', breaker, section, 0, ''); cur.c = circuits[circuits.length - 1]; } const take = Math.min(left, m - cur.points); cur.points += take; cur.c.points = cur.points; if (!cur.rooms.includes(r.name)) cur.rooms.push(r.name); cur.c.where = cur.rooms.join(', '); left -= take; } });
      let i = 0; circuits.filter((c) => c.kind === kind).forEach((c) => (c.label = `${label} ${++i}`));
    };
    pack('lights', R.lightPerCircuit, 'light', 'Éclairage', +R.lightBreaker, +R.lightSection);
    pack('sockets', R.socketsPerCircuit, 'socket', 'Prises 2P+T', +R.socketBreaker, +R.socketSection);
    const spec = {}; cfg.specials.forEach((s) => (spec[s.id] = s)); let lenSp = {}; const spCount = {};
    (study.appliances || []).forEach((a) => {
      const s = spec[a.type]; const n = int(a.qty); if (!s || !n) return;
      const room = rooms.find((r) => r.id === a.room) || rooms[0]; const d = room ? room.dist + room.H : 5;
      for (let i = 0; i < n; i++) { spCount[s.id] = (spCount[s.id] || 0) + 1; mk('special', `${s.name}${spCount[s.id] > 1 ? ' ' + spCount[s.id] : ''}`, +s.breaker, +s.section, 1, room ? room.name : '', s.typeA); }
      lenSp[s.section] = (lenSp[s.section] || 0) + n * d;
      add('prise_32', 0); if (+s.breaker >= 32) add('prise_32', n);
    });

    // ---- câbles & conduits ----
    const cab = {};
    const addCab = (sec, m) => { if (m > 0) cab[sec] = (cab[sec] || 0) + m; };
    addCab(+R.lightSection, lenL); addCab(+R.socketSection, lenS); Object.keys(lenSp).forEach((s) => addCab(+s, lenSp[s]));
    Object.keys(cab).forEach((sec) => {
      const m = Math.ceil(cab[sec] * wasteK); add('cable_' + secKey(sec), m, `Câble ${secTxt(sec)} mm²`);
      if (R.mode === 'apparent') add('goulotte', m, 'Moulure / goulotte'); else { const d = CONDUIT[sec] || 25; add('gaine_' + d, m, `Gaine ICTA Ø${d} mm`); }
    });
    // ---- appareillage et boîtes ----
    const sw = rooms.reduce((a, r) => a + r.switches, 0), va = rooms.reduce((a, r) => a + r.vav * 2, 0);
    add('inter_simple', sw); add('inter_va', va); add('prise_16', totSock); add('dcl', totLights);
    add('plaque', sw + va + totSock); add('boite_enc', sw + va + totSock); add('boite_dcl', totLights);
    add('boite_deriv', rooms.filter((r) => r.lights + r.sockets > 0).length);

    // ---- protections ----
    const stdSeries = (v) => SERIES.find((s) => s >= v) || SERIES[SERIES.length - 1];
    const totalCurrent = circuits.reduce((a, c) => a + c.breaker, 0) * (+R.diversity || 1);
    const mainA = [30, 40, 60, 63].find((a) => a >= totalCurrent) || 63;
    if (circuits.length && totalCurrent > 63) warns.push('Courant estimé supérieur à 63 A : étudier une alimentation triphasée ou un calcul de puissance détaillé.');
    circuits.forEach((c) => add('disj_' + c.breaker, 1, `Disjoncteur DPN 1P+N ${c.breaker} A – courbe C – 6 kA`));
    // groupes de différentiels
    const groups = []; const maxC = Math.max(1, +R.diffMaxCircuits || 8);
    const kinds = R.separateLightDiff ? [['light'], ['socket', 'special']] : [['light', 'socket', 'special']];
    kinds.forEach((ks) => { let cur = null; circuits.filter((c) => ks.includes(c.kind)).forEach((c) => { if (!cur || cur.cs.length >= maxC) { cur = { cs: [] }; groups.push(cur); } cur.cs.push(c); }); });
    groups.forEach((gr, i) => { gr.typeA = gr.cs.some((c) => c.typeA); gr.name = 'ID' + (i + 1); const amps = Math.max(+R.diffRating || 40, stdSeries(gr.cs.reduce((a, c) => a + c.breaker, 0) * (+R.diversity || 1))); gr.rating = [25, 40, 63].find((a) => a >= Math.min(amps, 63)) || 63; add(`diff${gr.typeA ? 'A' : ''}_${gr.rating}_${+R.diffSens}`, 1, `Interrupteur différentiel ${gr.rating} A ${R.diffSens} mA type ${gr.typeA ? 'A' : 'AC'}`); gr.cs.forEach((c) => (c.diff = gr.name)); });
    if (circuits.length && R.mainInCoffret) add('general_' + mainA, 1, `Disjoncteur général ${mainA} A`);
    if (circuits.length && R.surge) add('parafoudre', 1);

    // ---- composition du coffret ----
    const devs = [];  // dispositifs dans l'ordre
    if (circuits.length && R.mainInCoffret) devs.push({ k: 'main', cid: 'general_' + mainA, label: 'DG', sub: mainA + ' A', mods: modsOf('general_' + mainA) });
    if (circuits.length && R.surge) devs.push({ k: 'surge', cid: 'parafoudre', label: 'PF', sub: 'parafoudre', mods: modsOf('parafoudre') });
    groups.forEach((gr) => { devs.push({ k: 'diff', cid: `diff${gr.typeA ? 'A' : ''}_${gr.rating}_${+R.diffSens}`, typeA: gr.typeA, sens: +R.diffSens, label: gr.name, sub: `${gr.rating} A ${R.diffSens} mA ${gr.typeA ? 'A' : 'AC'}`, mods: modsOf(`diff${gr.typeA ? 'A' : ''}_${gr.rating}_${+R.diffSens}`), newRow: true }); gr.cs.forEach((c) => devs.push({ k: 'cb', cid: 'disj_' + c.breaker, label: c.id, sub: c.breaker + ' A', mods: modsOf('disj_' + c.breaker), name: c.label })); });
    function modsOf(id) { return (cat[id] && +cat[id].mods) || 2; }
    const used = devs.reduce((a, d) => a + d.mods, 0);
    function layout(perRow) {
      const rows = [{ d: [], u: 0 }];
      devs.forEach((d) => { let r = rows[rows.length - 1]; if ((d.newRow && r.d.some((x) => x.k === 'diff' || x.k === 'cb')) || r.u + d.mods > perRow) { r = { d: [], u: 0 }; rows.push(r); } r.d.push(Object.assign({ x: r.u }, d)); r.u += d.mods; });
      return rows;
    }
    { let gi = -1, rowOf = {}; layout(+R.modulesPerRowFallback || 13).forEach((r, ri) => r.d.forEach((d) => { if (d.k === 'diff') { gi = d.label; rowOf[gi] = new Set(); } if (d.k === 'cb' && gi !== -1) rowOf[gi].add(ri); })); Object.keys(rowOf).forEach((k) => { if (rowOf[k].size > 1) warns.push(`${k} alimente des disjoncteurs sur deux rangées : prévoir un pont de raccordement entre rangées.`); }); }
    const coffrets = cfg.catalog.filter((c) => c.rows && c.perRow).sort((a, b) => a.rows * a.perRow - b.rows * b.perRow);
    let chosen = null, rows = null;
    for (const c of coffrets) { const L = layout(+c.perRow); const need = Math.max(L.length, Math.ceil(used * (1 + (+R.reservePct || 0) / 100) / c.perRow)); if (need <= c.rows) { chosen = c; rows = L; break; } }
    let coffret;
    if (devs.length) {
      if (!chosen) { const pr = +R.modulesPerRowFallback || 13; rows = layout(pr); const need = Math.max(rows.length, Math.ceil(used * (1 + (+R.reservePct || 0) / 100) / pr)); chosen = { id: null, name: `Coffret ${need} rangée(s) × ${pr} modules`, rows: need, perRow: pr }; warns.push(`Aucun coffret du catalogue n'est assez grand : ajoutez un « Coffret ${need} × ${pr} » dans le Portail.`); add('coffret_' + need + 'x' + pr, 1, chosen.name); }
      else add(chosen.id, 1);
      while (rows.length < chosen.rows) rows.push({ d: [], u: 0 });
      coffret = { name: chosen.name, nRows: chosen.rows, perRow: +chosen.perRow, rows, used, free: chosen.rows * chosen.perRow - used, reservePct: used ? Math.round((chosen.rows * chosen.perRow - used) / used * 100) : 0 };
      add('peigne', rows.filter((r) => r.d.length).length); add('obturateur', coffret.free, 'Obturateur modulaire 1 module'); add('bornier_neutre', 1); add('bornier_terre', 1); add('repere', circuits.length + groups.length);
    }
    // ---- mise à la terre ----
    if (circuits.length) { add('piquet_terre', 1); add('collier_terre', 1); add('cable_terre', Math.ceil(+R.earthCable || 0), 'Conducteur de terre'); }

    const list = order.map((id) => items[id]); list.forEach((i) => (i.total = i.qty * i.price));
    const CAT = ['Câbles', 'Conduits', 'Appareillage', 'Boîtes', 'Protection', 'Coffret', 'Terre', 'Autres'];
    list.sort((a, b) => CAT.indexOf(a.cat) - CAT.indexOf(b.cat));
    const mat = list.reduce((a, i) => a + i.total, 0), lab = mat * (+R.labourPct || 0) / 100, sub = mat + lab, cont = sub * (+R.contingencyPct || 0) / 100;
    return { rooms, byRoom, circuits, groups, items: list, coffret, warns, mainA, totalCurrent, cableLen: cab, totals: { material: mat, labour: lab, contingency: cont, total: sub + cont }, summary: { lights: totLights, sockets: totSock, switches: sw, vav: va / 2, circuits: circuits.length } };
  }

  function toCSV(study, res, cfg) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"', cur = (cfg || EE.Config.get()).currency, L = [];
    L.push([q('Étude'), q(study.name)].join(';'), '', ['Catégorie', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire (' + cur + ')', 'Total (' + cur + ')'].map(q).join(';'));
    res.items.forEach((i) => L.push([q(i.cat), q(i.name), q(i.unit), i.qty, i.price, Math.round(i.total)].join(';')));
    L.push('', [q('Matériel'), '', '', '', '', Math.round(res.totals.material)].join(';'));
    if (res.totals.labour) L.push([q('Main-d\'œuvre'), '', '', '', '', Math.round(res.totals.labour)].join(';'));
    if (res.totals.contingency) L.push([q('Imprévus'), '', '', '', '', Math.round(res.totals.contingency)].join(';'));
    L.push([q('TOTAL'), '', '', '', '', Math.round(res.totals.total)].join(';'));
    L.push('', ['Circuit', 'Désignation', 'Disjoncteur (A)', 'Section (mm²)', 'Points', 'Différentiel', 'Pièces'].map(q).join(';'));
    res.circuits.forEach((c) => L.push([q(c.id), q(c.label), c.breaker, String(c.section).replace('.', ','), c.points, q(c.diff || ''), q(c.where)].join(';')));
    return '﻿' + L.join('\r\n');
  }
  EE.Quant = { compute, newStudy, newRoom, toCSV, num, int };
})(window);
