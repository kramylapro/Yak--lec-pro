/* Yak-élec-pro – dimensionnement photovoltaïque (site isolé avec batteries, ou raccordé au réseau) ; fonction pure */
(function (g) {
  'use strict';
  const EE = g.EE;
  const num = (v, d) => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : (d == null ? 0 : d); };
  const STD_S = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
  // courants admissibles indicatifs (cuivre, 2 conducteurs chargés, en conduit) – à vérifier selon le mode de pose (HD 60364-5-52)
  const AMP = { 1.5: 15, 2.5: 21, 4: 28, 6: 36, 10: 50, 16: 68, 25: 89, 35: 110, 50: 134, 70: 171, 95: 207, 120: 239 };
  const STD_BRK = [6, 10, 16, 20, 25, 32, 40, 50, 63];
  const STD_FUSE = [32, 40, 63, 80, 100, 125, 160, 200, 250, 315, 400];
  const up = (arr, v) => arr.find((x) => x >= v) || null;
  const r1 = (v) => Math.round(v * 10) / 10;

  const PRESETS = [['Lampe LED', 10, 6], ['Lampe LED', 10, 6], ['Téléviseur LED', 80, 5], ['Réfrigérateur (moyenne 24 h)', 150, 8, 3], ['Congélateur (moyenne 24 h)', 200, 8, 3], ['Ventilateur', 60, 8],
    ['Ordinateur portable', 60, 6], ['Chargeur de téléphone', 10, 3], ['Décodeur / box', 20, 8], ['Fer à repasser', 1000, 0.5], ['Pompe à eau', 750, 1, 3], ['Machine à laver', 500, 1, 3]].filter((p, i, a) => a.findIndex((q) => q[0] === p[0]) === i);

  function newStudy(name) {
    return { id: EE.uid('v'), name: name || 'Nouvelle installation', created: Date.now(), modified: Date.now(), mode: 'isole', hsp: 4.5, tmin: 15, tcell: 65, panel: 'auto',
      loads: [{ name: 'Lampe LED', P: 10, n: 6, h: 5, start: 1 }, { name: 'Téléviseur LED', P: 80, n: 1, h: 5, start: 1 }, { name: 'Réfrigérateur (moyenne 24 h)', P: 150, n: 1, h: 8, start: 3 }],
      acLoads: true, sim: 0.7, days: 2, vbat: 'auto', tech: 'lithium', conv: 'hybride', coverage: 100, kwc: 0, dist: { dc: 10, bat: 2, bi: 1, ac: 10 } };
  }

  function designStrings(N, VocCold, VmpHot, Vmax, Vmin, extraMaxNs) {
    const nsMax = Math.min(Math.floor(Vmax / VocCold), extraMaxNs || 999), nsMin = Math.max(1, Math.ceil(Vmin / VmpHot));
    if (nsMax < nsMin || nsMax < 1) return null;
    let best = null;
    for (let ns = nsMax; ns >= nsMin; ns--) { const np = Math.ceil(N / ns), tot = ns * np; if (!best || tot < best.tot) best = { ns, np, tot }; }
    return Object.assign(best, { nsMin, nsMax });
  }

  function computeOne(st, cfg) {
    cfg = cfg || EE.Config.get(); const PV = cfg.pv, R = PV.rules, warns = [], steps = [];
    const cat = {}; cfg.catalog.forEach((c) => (cat[c.id] = c));
    const items = {}, order = [];
    const add = (id, qty, o) => {
      if (!(qty > 0)) return; o = o || {};
      let it = items[id]; if (!it) { const c = cat[id]; if (!c && !o.name) warns.push(`« ${id} » n'est pas dans le catalogue.`); it = items[id] = { id, cat: o.cat || (c ? c.cat : 'Autres'), name: o.name || (c ? c.name : id), unit: o.unit || (c ? c.unit : 'pce'), price: o.price != null ? +o.price : (c ? +c.price || 0 : 0), norm: c ? c.norm || '' : '', qty: 0 }; order.push(id); }
      it.qty += qty;
    };
    const S = (label, value, unit, formula) => steps.push({ label, value, unit: unit || '', formula: formula || '' });
    const panel = PV.panels.find((p) => p.id === st.panel) || PV.panels[0];
    if (!panel) { warns.push('Aucun panneau dans le catalogue photovoltaïque.'); return { ok: false, warns, steps, items: [], totals: { total: 0 } }; }
    const loads = (st.loads || []).map((l) => ({ name: l.name || 'Appareil', P: Math.max(0, num(l.P)), n: Math.max(0, Math.floor(num(l.n))), h: Math.max(0, Math.min(24, num(l.h))), start: Math.max(1, num(l.start, 1)) })).filter((l) => l.P > 0 && l.n > 0);
    const hsp = Math.max(0.1, num(st.hsp, 4.5)), tmin = num(st.tmin, 15), tcell = num(st.tcell, 65), days = Math.max(0.5, num(st.days, 2)), sim = Math.min(1, Math.max(0.1, num(st.sim, 0.7)));
    const dist = Object.assign({ dc: 10, bat: 2, bi: 1, ac: 10 }, st.dist || {});
    const out = { ok: false, mode: st.mode, warns, steps, panel, loads };
    if (!loads.length) { warns.push('Ajoutez au moins un appareil (puissance, quantité, heures par jour).'); out.items = []; out.totals = { material: 0, total: 0 }; return out; }
    const Eac = loads.reduce((a, l) => a + l.P * l.n * l.h, 0), Pload = loads.reduce((a, l) => a + l.P * l.n, 0);
    const Edc = st.acLoads === false ? Eac : Eac / R.invEff;
    S('Énergie consommée par jour', Math.round(Eac), 'Wh/j', 'Σ puissance × quantité × heures');
    S('Puissance installée (somme des appareils)', Math.round(Pload), 'W');
    const Ppeak = Pload * sim, vbatAuto = !st.vbat || st.vbat === 'auto', hybW = st.conv === 'hybride', vbat = vbatAuto ? (hybW ? (Ppeak * R.invSafety <= 2000 ? 24 : 48) : Ppeak * R.invSafety <= 1000 ? 12 : Ppeak * R.invSafety <= 3000 ? 24 : 48) : num(st.vbat, 24), Pstart = Ppeak + Math.max(0, ...loads.map((l) => l.P * (l.start - 1)));
    const VocC = panel.Voc * (1 + (panel.bVoc / 100) * (tmin - 25)), VmpH = panel.Vmp * (1 + (panel.bVoc / 100) * (tcell - 25));
    S('Tension à vide du panneau à la température minimale', r1(VocC), 'V', `Voc × (1 + β × (Tmin − 25)), β = ${panel.bVoc} %/°C`);
    S('Tension au point de puissance max. à chaud', r1(VmpH), 'V', `Vmp × (1 + β × (Tcellule − 25))`);
    const lineS = (I, L, drop, V, min) => { const need = 2 * L * I / (R.kappa * V * drop / 100); return STD_S.find((s) => s >= (min || 0) && s >= need && AMP[s] >= I) || STD_S[STD_S.length - 1]; };
    const acBreaker = (Pac) => { const I = Pac / R.vac; return { I, brk: up(STD_BRK, I * 1.25) }; };
    let panelsN = 0, np = 0, ns = 0, nr = 1;

    if (st.mode === 'reseau') {
      // ---------- raccordé au réseau (sans batterie) ----------
      const cov = Math.max(1, num(st.coverage, 100)) / 100, kwc = num(st.kwc);
      const Preq = kwc > 0 ? kwc : Eac * cov / (hsp * R.pr);
      S('Puissance crête à installer', Math.round(Preq), 'Wc', kwc > 0 ? 'imposée' : 'Énergie × couverture ÷ (heures de soleil × rendement global)');
      const N = Math.max(1, Math.ceil(Preq / panel.W)); let best = null;
      PV.gridInverters.forEach((iv) => {
        const d = designStrings(N, VocC, VmpH, iv.Vdc, iv.Vmin, Math.floor(iv.Vmax / (panel.Vmp * (1 + (panel.bVoc / 100) * (tmin - 25)))));
        if (!d) return; const perMppt = Math.max(1, Math.floor(iv.Iin / (panel.Isc))); const cap = perMppt * iv.nMppt; if (d.np > cap) return;
        const Pdc = d.tot * panel.W, ratio = Pdc / iv.Pac; if (ratio > R.dcacMax) return;
        const sc = [d.tot, iv.Pac]; if (!best || sc[0] < best.d.tot || (sc[0] === best.d.tot && sc[1] < best.iv.Pac)) best = { iv, d, ratio, Pdc };
      });
      if (!best) { warns.push('Aucun onduleur réseau du catalogue ne convient (tensions, courants ou rapport DC/AC) : ajoutez-en un dans le Portail › Photovoltaïque.'); out.items = []; out.totals = { material: 0, total: 0 }; return out; }
      ns = best.d.ns; np = best.d.np; panelsN = best.d.tot; const iv = best.iv;
      S('Panneaux', panelsN, 'pce', `${panelsN} × ${panel.W} Wc = ${best.Pdc} Wc`);
      S('Configuration', `${np} chaîne(s) de ${ns} panneaux en série`, '', `Tension à vide maxi ${r1(ns * VocC)} V (≤ ${iv.Vdc} V) ; plage de suivi ${iv.Vmin}–${iv.Vmax} V`);
      S('Onduleur réseau', iv.name, '', `Rapport DC/AC = ${r1(best.ratio * 100) / 100}`);
      const E = best.Pdc * hsp * R.pr / 1000; S('Production estimée', r1(E), 'kWh/j', 'Puissance crête × heures de soleil × rendement global');
      S('Couverture de la consommation', Math.round(E * 1000 / Eac * 100), '%');
      const Isc = panel.Isc * R.iscFactor, Sdc = lineS(Isc, dist.dc, R.dropDC, ns * panel.Vmp, 4), ac = acBreaker(iv.Pac), Sac = lineS(Math.max(ac.I, ac.brk || 0), dist.ac, R.dropAC, R.vac);
      S('Câble de chaîne (continu)', Sdc, 'mm²', `Courant ${r1(Isc)} A, chute ≤ ${R.dropDC} %`); S('Câble de sortie alternatif', Sac, 'mm²', `Courant ${r1(ac.I)} A, disjoncteur ${ac.brk || '—'} A, chute ≤ ${R.dropAC} %`);
      if (!ac.brk) warns.push('Courant alternatif supérieur à 63 A : étudier une alimentation triphasée.');
      if (best.ratio < 0.6) warns.push('Onduleur nettement plus puissant que le champ de panneaux (rapport DC/AC faible) : la plus petite référence du catalogue est déjà retenue ; ajoutez un onduleur plus petit au catalogue si besoin.');
      if (E * 1000 > Eac * 1.3) warns.push('Le champ minimal imposé par l\'onduleur produit plus que la consommation : vérifier le régime d\'injection / de rachat.');
      if (iv.Pac > 6000) warns.push('Au-delà de 6 kW, le raccordement est en général triphasé : à étudier.');
      warns.push('Le raccordement au réseau exige l\'accord du distributeur d\'électricité et un onduleur conforme à ses règles.');
      add('pv:' + panel.id, panelsN, { cat: 'Panneaux', name: panel.name, unit: 'pce', price: panel.price }); add('pv:' + iv.id, 1, { cat: 'Onduleur', name: iv.name, unit: 'pce', price: iv.price });
      add('pv_structure', panelsN); add('cable_pv_' + Sdc, Math.ceil(2 * dist.dc * np * 1.1)); add('pv_mc4', 2 * np); add('pv_sect', 1); add('pv_spd', 1);
      if (np >= 3) { add('pv_combiner', 1); add('pv_fuse', 2 * np); }
      add('cable_' + String(Sac).replace('.', '_'), Math.ceil(dist.ac * 1.1 * 3)); if (ac.brk) { add('disj_' + ac.brk, 1); add('diff_40_30', 1); }
      add('piquet_terre', 1); add('cable_terre', 10);
      out.design = { kind: 'reseau', panelsN, ns, np, inverter: iv, Pdc: best.Pdc, Sdc, Sac, acBreaker: ac.brk, prod: E };
    } else {
      // ---------- site isolé avec batteries ----------
      if (vbatAuto) S('Tension du parc de batteries (choix automatique)', vbat, 'V', hybW ? 'Onduleur hybride : 24 V jusqu\'à 2 kW, 48 V au-delà' : 'Usage courant : 12 V jusqu\'à 1 kW, 24 V jusqu\'à 3 kW, 48 V au-delà');
      const lead = st.tech !== 'lithium', dod = lead ? R.dodLead : R.dodLi, eff = lead ? R.effLead : R.effLi;
      S('Énergie à fournir par les batteries (par jour)', Math.round(Edc), 'Wh/j', st.acLoads === false ? 'charges en courant continu' : `Énergie ÷ rendement onduleur ${R.invEff}`);
      S('Puissance maximale simultanée', Math.round(Ppeak), 'W', `Puissance installée × simultanéité ${sim}`);
      S('Puissance de démarrage maximale', Math.round(Pstart), 'W', 'Puissance simultanée + surcharge du plus gros démarrage');
      // batterie
      const Eb = Edc * days / (dod * eff), Ah = Eb / vbat;
      S('Capacité utile des batteries', Math.round(Eb), 'Wh', `Énergie × ${days} jour(s) ÷ (décharge ${dod * 100} % × rendement ${eff})`);
      S('Capacité à la tension du parc', Math.round(Ah), 'Ah', `${Math.round(Eb)} Wh ÷ ${vbat} V`);
      let bb = null; PV.batteries.filter((b) => (b.tech === 'lithium') === !lead && vbat % b.Vn === 0).forEach((b) => { const s = vbat / b.Vn, p = Math.ceil(Ah / b.Ah), cnt = s * p; if (!bb || cnt < bb.cnt || (cnt === bb.cnt && p < bb.p)) bb = { b, s, p, cnt }; });
      if (!bb) { warns.push(`Aucune batterie (${lead ? 'plomb' : 'lithium'}) compatible avec ${vbat} V dans le catalogue.`); out.items = []; out.totals = { material: 0, total: 0 }; return out; }
      if (bb.p > 4) warns.push(`${bb.p} branches de batteries en parallèle : au-delà de 4, préférez des éléments de plus grande capacité (équilibrage difficile).`);
      S('Parc de batteries', `${bb.cnt} × ${bb.b.name}`, '', `${bb.s} en série × ${bb.p} en parallèle = ${vbat} V / ${bb.p * bb.b.Ah} Ah`);
      // panneaux
      const Pre = Edc / (eff * hsp * R.pr), Nreq = Math.max(1, Math.ceil(Pre / panel.W));
      S('Puissance crête à installer', Math.round(Pre), 'Wc', `Énergie batterie ÷ (rendement batterie ${eff} × ${hsp} h de soleil × rendement global ${R.pr})`);
      S('Nombre de panneaux nécessaire', Nreq, 'pce', `${Math.round(Pre)} Wc ÷ ${panel.W} Wc`);
      // régulateur + chaînes
      const Vmin = vbat * R.chargeFactor + R.mpptMargin; let best = null, hy = null;
      if (hybW) {
        PV.hybrids.filter((h) => h.Vbat === vbat).sort((x, y) => x.Pcont - y.Pcont).forEach((h) => {
          if (hy || h.Pcont < Ppeak * R.invSafety || h.Psurge < Pstart) return;
          const d = designStrings(Nreq, VocC, VmpH, h.Vpv, Math.max(h.VmppMin || 0, Vmin)); if (!d) return;
          const cap = Math.max(1, Math.floor(h.Isc / panel.Isc)) * (h.nMppt || 1); if (d.np > cap || (h.Ppv && d.tot * panel.W > h.Ppv)) return;
          hy = { h, d };
        });
        if (hy) best = { m: { integrated: true, id: hy.h.id, name: hy.h.name, Iout: hy.h.Ichg || 999, Vpv: hy.h.Vpv }, ns: hy.d.ns, np: hy.d.np, nr: 1, tot: hy.d.tot };
        else warns.push(`Aucun onduleur hybride du catalogue ne convient pour ${vbat} V avec ces besoins : solution avec régulateur MPPT et onduleur séparés retenue (ajoutez un hybride dans le Portail › Photovoltaïque).`);
      }
      if (!hy) {
      PV.mppt.filter((m) => (m.Vbat || []).includes(vbat)).forEach((m) => {
        const d = designStrings(Nreq, VocC, VmpH, m.Vpv, Vmin); if (!d) return;
        const perReg = Math.max(1, Math.floor(m.Isc / panel.Isc / 1.0));
        let n = Math.max(Math.ceil(d.np / perReg), Math.ceil(d.tot * panel.W / vbat / m.Iout)), npA = Math.ceil(d.np / n) * n;
        const cand = { m, ns: d.ns, np: npA, nr: n, tot: d.ns * npA };
        if (!best || cand.nr < best.nr || (cand.nr === best.nr && cand.tot < best.tot) || (cand.nr === best.nr && cand.tot === best.tot && m.Iout < best.m.Iout)) best = cand;
      });
      }
      if (!best) { warns.push(`Aucun régulateur MPPT du catalogue ne convient pour ${vbat} V avec ces panneaux (tension maximale ${r1(VocC)} V par panneau à froid).`); out.items = []; out.totals = { material: 0, total: 0 }; return out; }
      ns = best.ns; np = best.np; nr = best.nr; panelsN = best.tot; const mp = best.m, Pdc = panelsN * panel.W, Ichg = Pdc / vbat;
      S('Configuration des panneaux', `${panelsN} panneaux : ${np} chaîne(s) de ${ns} en série`, '', `Tension à vide maxi ${r1(ns * VocC)} V (≤ ${mp.Vpv} V) ; tension mini à chaud ${r1(ns * VmpH)} V (≥ ${r1(Vmin)} V)`);
      if (hy) S('Onduleur hybride (MPPT, chargeur et onduleur intégrés)', hy.h.name, '', `Courant de charge ${r1(Ichg)} A (≤ ${hy.h.Ichg} A) ; puissance PV ${Pdc} Wc (≤ ${hy.h.Ppv} Wc) ; tension PV maxi ${hy.h.Vpv} V`); else S('Régulateur(s) MPPT', `${nr} × ${mp.name}`, '', `Courant de charge ${r1(Ichg / nr)} A par régulateur (≤ ${mp.Iout} A)`);
      const cap = bb.p * bb.b.Ah, crate = Ichg / cap;
      if (lead && crate > 0.25) warns.push(`Courant de charge élevé pour des batteries au plomb (${r1(crate * 100)} % de la capacité) : limitez-le à environ 20 % ou ajoutez des batteries.`);
      if (lead && crate < 0.05) warns.push('Courant de charge très faible par rapport à la capacité des batteries : recharge lente, risque de sulfatation.');
      if (!lead && crate > 0.5) warns.push('Courant de charge supérieur à C/2 : vérifier la limite de charge du fabricant des batteries.');
      // onduleur
      let inv = hy ? hy.h : PV.inverters.filter((o) => o.Vbat === vbat).sort((a, b) => a.Pcont - b.Pcont).find((o) => o.Pcont >= Ppeak * R.invSafety && o.Psurge >= Pstart), ninv = 1;
      if (!inv) { const l = PV.inverters.filter((o) => o.Vbat === vbat).sort((a, b) => b.Pcont - a.Pcont)[0]; if (!l) { warns.push(`Aucun onduleur ${vbat} V dans le catalogue.`); } else { inv = l; ninv = Math.max(Math.ceil(Ppeak * R.invSafety / l.Pcont), Math.ceil(Pstart / l.Psurge)); warns.push(`Un seul onduleur ne suffit pas : ${ninv} onduleurs identiques en parallèle (modèle compatible avec la mise en parallèle).`); } }
      if (hy && Ichg > hy.h.Ichg * 1.3) warns.push('Le champ de panneaux dépasse nettement le courant de charge de l\'onduleur hybride : l\'excédent sera écrêté.');
      if (inv && !hy) S('Onduleur / chargeur', `${ninv} × ${inv.name}`, '', `Puissance continue ≥ ${Math.round(Ppeak * R.invSafety)} W ; surcharge ≥ ${Math.round(Pstart)} W`);
      const Pc = inv ? inv.Pcont * ninv : Ppeak * R.invSafety, Ibi = Pc / (vbat * 0.9);
      // câbles et protections
      const Isc = panel.Isc * R.iscFactor, Sdc = lineS(Isc, dist.dc, R.dropDC, ns * panel.Vmp, 4);
      const fuseBi = up(STD_FUSE, Ibi * R.iscFactor), fuseCh = up(STD_FUSE, Ichg / nr * R.iscFactor), Sbat = lineS(Math.max(Ichg / nr * R.iscFactor, fuseCh || 0), dist.bat, R.dropBat, vbat, 16), Sbi = lineS(Math.max(Ibi * R.iscFactor, fuseBi || 0), dist.bi, R.dropBat, vbat, 16);
      const ac = acBreaker(Math.min(Pc, Ppeak * R.invSafety)), Sac = lineS(Math.max(ac.I, ac.brk || 0), dist.ac, R.dropAC, R.vac);
      S('Câble de chaîne (continu)', Sdc, 'mm²', `Courant ${r1(Isc)} A, chute ≤ ${R.dropDC} %`); if (!mp.integrated) S('Câble régulateur → batteries', Sbat, 'mm²', `Courant ${r1(Ichg / nr * R.iscFactor)} A, chute ≤ ${R.dropBat} %, ≥ calibre du fusible`);
      S('Câble batteries → onduleur', Sbi, 'mm²', `Courant ${r1(Ibi * R.iscFactor)} A, chute ≤ ${R.dropBat} %`); S('Câble de sortie alternatif', Sac, 'mm²', `Courant ${r1(ac.I)} A, disjoncteur ${ac.brk || '—'} A, chute ≤ ${R.dropAC} %`);
      if (!ac.brk) warns.push('Courant alternatif supérieur à 63 A : étudier une alimentation triphasée.'); if (!fuseBi) warns.push('Courant batterie très élevé : protection à étudier.');
      add('pv:' + panel.id, panelsN, { cat: 'Panneaux', name: panel.name, unit: 'pce', price: panel.price }); add('pv_structure', panelsN);
      if (!mp.integrated) add('pv:' + mp.id, nr, { cat: 'Régulateur', name: mp.name, unit: 'pce', price: mp.price }); if (inv) add('pv:' + inv.id, ninv, { cat: 'Onduleur', name: inv.name, unit: 'pce', price: inv.price });
      add('pv:' + bb.b.id, bb.cnt, { cat: 'Batteries', name: bb.b.name, unit: 'pce', price: bb.b.price });
      add('cable_pv_' + Sdc, Math.ceil(2 * dist.dc * np * 1.1)); add('pv_mc4', 2 * np); add('pv_sect', nr); add('pv_spd', nr);
      if (np / nr >= 3) { add('pv_combiner', nr); add('pv_fuse', 2 * np); }
      if (!mp.integrated) { add('cable_bat_' + Sbat, Math.ceil(2 * dist.bat * nr * 1.1)); if (fuseCh) add('fuse_bat_' + fuseCh, nr); }
      add('cable_bat_' + Sbi, Math.ceil(2 * dist.bi * 1.1)); if (fuseBi) add('fuse_bat_' + fuseBi, 1);
      add('cable_' + String(Sac).replace('.', '_'), Math.ceil(dist.ac * 1.1 * 3)); if (ac.brk) { add('disj_' + ac.brk, 1); add('diff_40_30', 1); }
      add('piquet_terre', 1); add('cable_terre', 10);
      out.design = { kind: 'isole', hybrid: !!hy, panelsN, ns, np, nr, mppt: mp, inverter: inv, ninv, battery: bb, Pdc, Ichg, Sdc, Sbat, Sbi, Sac, fuseBi, fuseCh, acBreaker: ac.brk, vbat, Eac, Edc, Ppeak, Pstart, Ah, Eb };
    }
    const list = order.map((id) => items[id]); list.forEach((i) => (i.total = i.qty * i.price));
    const CAT = ['Panneaux', 'Régulateur', 'Onduleur', 'Batteries', 'Photovoltaïque', 'Protection', 'Câbles', 'Terre', 'Autres'];
    list.sort((a, b) => CAT.indexOf(a.cat) - CAT.indexOf(b.cat));
    const mat = list.reduce((a, i) => a + i.total, 0); out.items = list; out.totals = { material: mat, total: mat }; out.ok = true; out.Eac = Eac; out.Edc = Edc;
    return out;
  }

  // choix automatique du panneau : on essaie chaque panneau du catalogue et on garde le plus adapté
  function compute(st, cfg) {
    cfg = cfg || EE.Config.get(); let res;
    if (!st.panel || st.panel === 'auto') {
      const tries = cfg.pv.panels.map((p) => computeOne(Object.assign({}, st, { panel: p.id }), cfg)).filter((r) => r.ok);
      if (tries.length) { const minP = Math.min(...tries.map((r) => r.design.Pdc)); res = tries.filter((r) => r.design.Pdc <= minP * 1.15).sort((a, b) => a.design.panelsN - b.design.panelsN || a.design.Pdc - b.design.Pdc)[0]; res.steps.unshift({ label: 'Panneau (choix automatique)', value: res.panel.name, unit: '', formula: 'Le moins de panneaux pour une puissance proche du besoin' }); }
      else res = computeOne(Object.assign({}, st, { panel: cfg.pv.panels[0] && cfg.pv.panels[0].id }), cfg);
    } else res = computeOne(st, cfg);
    const D = newStudy(), dd = D.dist, d = Object.assign({}, dd, st.dist || {}), isAuto = (k) => st[k] === D[k];
    res.assumptions = [
      ['Heures de plein soleil', `${st.hsp} kWh/m²/jour`, isAuto('hsp')], ['Température minimale / des cellules', `${st.tmin} °C / ${st.tcell} °C`, isAuto('tmin') && isAuto('tcell')],
      ...(st.mode === 'reseau' ? [['Couverture visée', `${st.kwc > 0 ? 'puissance imposée' : st.coverage + ' %'}`, isAuto('coverage') && !(st.kwc > 0)]] : [['Autonomie', `${st.days} jour(s)`, isAuto('days')], ['Coefficient de simultanéité', st.sim, isAuto('sim')], ['Type de batteries', st.tech === 'lithium' ? 'lithium (LiFePO4)' : 'plomb', isAuto('tech')], ['Onduleur', st.conv === 'hybride' ? 'hybride (tout-en-un)' : 'régulateur + onduleur séparés', isAuto('conv')], ['Tension des batteries', st.vbat === 'auto' || !st.vbat ? 'automatique' : st.vbat + ' V', st.vbat === 'auto' || !st.vbat], ['Appareils en courant alternatif', st.acLoads === false ? 'non' : 'oui', st.acLoads !== false]]),
      ['Panneau', st.panel === 'auto' || !st.panel ? 'automatique' : (res.panel ? res.panel.name : ''), st.panel === 'auto' || !st.panel], ['Distances des câbles', `${d.dc} / ${d.bat} / ${d.bi} / ${d.ac} m`, ['dc', 'bat', 'bi', 'ac'].every((k) => d[k] == dd[k])]];
    return res;
  }

  // trois propositions comparées pour un site isolé : économique, équilibrée, moderne
  const PACKS = [
    { id: 'eco', name: 'Économique', tech: 'plomb', conv: 'separe', slogan: 'Prix d\'achat le plus bas' },
    { id: 'equi', name: 'Équilibrée', tech: 'lithium', conv: 'separe', slogan: 'Batteries lithium, appareils séparés' },
    { id: 'moderne', name: 'Moderne (recommandée)', tech: 'lithium', conv: 'hybride', slogan: 'Lithium + onduleur hybride tout-en-un' }];
  function proposals(st, cfg) {
    cfg = cfg || EE.Config.get(); if (st.mode === 'reseau') return []; const R = cfg.pv.rules;
    return PACKS.map((p) => {
      const r = compute(Object.assign({}, st, { tech: p.tech, conv: p.conv }), cfg), o = { pack: p, res: r, ok: !!(r && r.ok && r.design && r.design.battery) };
      if (o.ok) {
        const d = r.design, li = p.tech === 'lithium', dod = li ? R.dodLi : R.dodLead, nomWh = d.vbat * d.battery.p * d.battery.b.Ah, cycles = li ? R.cyclesLi : R.cyclesLead;
        Object.assign(o, { nominalKWh: nomWh / 1000, usableKWh: nomWh * dod / 1000, dod, cycles, years: Math.round(cycles / 365 * 10) / 10, devices: d.hybrid ? 1 : d.nr + d.ninv, hybrid: d.hybrid, total: r.totals.total, priced: r.items.every((i) => i.price > 0), battery: d.battery, vbat: d.vbat, panelsN: d.panelsN, inverter: d.inverter });
      }
      return o;
    });
  }

  function toCSV(st, res, cfg) {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"', cur = (cfg || EE.Config.get()).currency, L = [[q('Étude photovoltaïque'), q(st.name)].join(';'), '', ['Étape', 'Valeur', 'Unité', 'Calcul'].map(q).join(';')];
    res.steps.forEach((s) => L.push([q(s.label), q(s.value), q(s.unit), q(s.formula)].join(';')));
    L.push('', ['Catégorie', 'Désignation', 'Unité', 'Quantité', 'Prix unitaire (' + cur + ')', 'Total (' + cur + ')'].map(q).join(';'));
    res.items.forEach((i) => L.push([q(i.cat), q(i.name), q(i.unit), i.qty, i.price, Math.round(i.total)].join(';')));
    L.push([q('TOTAL'), '', '', '', '', Math.round(res.totals.total)].join(';')); return '﻿' + L.join('\r\n');
  }
  EE.PV = { compute, newStudy, toCSV, PRESETS, designStrings, proposals, PACKS };
})(window);
