/* Yak-élec-pro V1.11 – Bureau d'études BT : bibliothèque de produits (multi-fabricants, extensible, import / export CSV).
   Les produits fournis sont GÉNÉRIQUES (fabricant « Générique ») : caractéristiques typiques, dimensions et pertes indicatives,
   prix à 0 (à renseigner ou importer depuis un tarif fournisseur). Aucune référence de fabricant n'est inventée. */
(function (g) {
  'use strict';
  const EE = g.EE;
  const KEY = 'eep.btlib';
  const P = (o) => Object.assign({ fab: 'Générique', Un: 400, pdc: 0, curve: '', mods: 0, W: 0, H: 0, D: 0, mount: 'Rail DIN', price: 0, acc: '', sheet: '', pw: 0, poles: '', In: 0 }, o);
  const IN_MCB = [2, 6, 10, 16, 20, 25, 32, 40, 50, 63];
  const lossMcb = (In) => (In <= 16 ? 2 : In <= 32 ? 3 : In <= 63 ? 4.5 : 6); // W par pôle au courant assigné (ordre de grandeur indicatif)

  function defaults() {
    const L = [];
    // ---------- A. Disjoncteurs modulaires (EN 60898-1) ----------
    [['1P', 1, 230], ['1P+N', 1, 230], ['2P', 2, 400], ['3P', 3, 400], ['3P+N', 4, 400], ['4P', 4, 400]].forEach(([po, m, un]) => ['B', 'C', 'D'].forEach((cu) => IN_MCB.forEach((In) => [6, 10].forEach((pdc) => {
      if (po === '1P+N' && In > 40) return; if (pdc === 10 && In < 6) return;
      L.push(P({ ref: `GEN-MCB-${po.replace('+', '')}-${cu}${In}-${pdc}K`, name: `Disjoncteur modulaire ${po} courbe ${cu} ${In} A – ${pdc} kA`, cat: 'Disjoncteurs', type: 'mcb', poles: po, In, Un: un, pdc, curve: cu, mods: po === '1P+N' ? 1 : m, W: 18 * (po === '1P+N' ? 1 : m), H: 85, D: 75, pw: lossMcb(In) * (po === '1P+N' ? 2 : m), sheet: 'EN 60898-1', acc: 'Auxiliaire OF/SD, déclencheur MX/MN, peigne' }));
    }))));
    // disjoncteurs modulaires 80 à 125 A (EN 60947-2)
    ['1P+N', '2P', '3P', '4P'].forEach((po) => [80, 100, 125].forEach((In) => ['C', 'D'].forEach((cu) => { const m = { '1P+N': 2, '2P': 2, '3P': 3, '4P': 4 }[po]; L.push(P({ ref: `GEN-MCBH-${po.replace('+', '')}-${cu}${In}`, name: `Disjoncteur modulaire forte intensité ${po} courbe ${cu} ${In} A – 10 kA`, cat: 'Disjoncteurs', type: 'mcb', poles: po, In, pdc: 10, curve: cu, mods: Math.round(m * 1.5), W: 27 * m, H: 85, D: 75, pw: 7 * m, sheet: 'EN 60947-2' })); })));
    // disjoncteurs différentiels (1P+N)
    [10, 16, 20, 25, 32, 40].forEach((In) => ['C'].forEach((cu) => [['AC', 30], ['A', 30], ['A', 300]].forEach(([ty, s]) => L.push(P({ ref: `GEN-RCBO-1PN-${cu}${In}-${ty}${s}`, name: `Disjoncteur différentiel 1P+N ${cu} ${In} A ${s} mA type ${ty} – 6 kA`, cat: 'Disjoncteurs', type: 'rcbo', poles: '1P+N', In, Un: 230, pdc: 6, curve: cu, mods: 2, W: 36, H: 85, D: 75, rcd: { sens: s, type: ty }, pw: lossMcb(In) * 2 + 0.5, sheet: 'EN 61009-1' })))));
    // disjoncteurs boîtiers moulés (EN 60947-2), électroniques au-delà de 250 A
    [[100, 'TM', 25], [160, 'TM', 36], [250, 'TM', 36], [250, 'Électronique', 50], [400, 'Électronique', 50], [630, 'Électronique', 50]].forEach(([In, dec, pdc]) => ['3P', '4P'].forEach((po) => {
      const big = In > 250; L.push(P({ ref: `GEN-MCCB-${po}-${In}-${dec === 'TM' ? 'TM' : 'EL'}-${pdc}K`, name: `Disjoncteur boîtier moulé ${po} ${In} A déclencheur ${dec === 'TM' ? 'magnéto-thermique' : 'électronique'} – ${pdc} kA`, cat: 'Disjoncteurs', type: 'mccb', trip: dec, poles: po, In, pdc, curve: dec === 'TM' ? 'TM' : 'Élec.', W: (big ? 140 : 105) * (po === '4P' ? 1.33 : 1), H: big ? 255 : 161, D: big ? 110 : 86, mount: 'Platine', pw: (In <= 160 ? 8 : In <= 250 ? 15 : 30) * (po === '4P' ? 4 : 3), sheet: 'EN 60947-2', acc: 'Bloc différentiel, commande rotative, auxiliaires' }));
    }));
    [800, 1000, 1250, 1600, 2000, 2500].forEach((In) => ['3P', '4P'].forEach((po) => L.push(P({ ref: `GEN-ACB-${po}-${In}`, name: `Disjoncteur de puissance (ouvert) ${po} ${In} A – 65 kA, unité de contrôle électronique`, cat: 'Disjoncteurs', type: 'acb', trip: 'Électronique', poles: po, In, pdc: 65, curve: 'Élec.', W: po === '4P' ? 420 : 320, H: 370, D: 260, mount: 'Platine / débrochable', pw: In * 0.06 * (po === '4P' ? 4 : 3) / 3, sheet: 'EN 60947-2' }))));
    // ---------- B. Protection différentielle (interrupteurs différentiels EN 61008-1) ----------
    [['2P', 2, 230], ['4P', 4, 400]].forEach(([po, m, un]) => [25, 40, 63, 80, 100].forEach((In) => [['AC', 30], ['A', 30], ['F', 30], ['B', 30], ['AC', 300], ['A', 300], ['A', 100]].forEach(([ty, s]) => {
      if (ty === 'B' && In < 40) return; L.push(P({ ref: `GEN-RCCB-${po}-${In}-${ty}${s}`, name: `Interrupteur différentiel ${po} ${In} A ${s} mA type ${ty}`, cat: 'Protection différentielle', type: 'rccb', poles: po, In, Un: un, mods: m, W: 18 * m, H: 85, D: 75, rcd: { sens: s, type: ty }, pw: In <= 40 ? 2.5 * m / 2 : 5 * m / 2, sheet: ty === 'B' ? 'EN 62423' : 'EN 61008-1' }));
    })));
    // ---------- C. Commande ----------
    [[16, '2P'], [25, '2P'], [25, '4P'], [40, '4P'], [63, '4P']].forEach(([In, po]) => L.push(P({ ref: `GEN-CT-${po}-${In}`, name: `Contacteur modulaire ${po} ${In} A bobine 230 V`, cat: 'Appareils de commande', type: 'contactor', poles: po, In, mods: po === '2P' ? 1 : 2, W: po === '2P' ? 18 : 36, H: 85, D: 65, pw: 2 + In * 0.05, sheet: 'EN 61095' })));
    [9, 18, 32, 65].forEach((In) => L.push(P({ ref: `GEN-KM-3P-${In}`, name: `Contacteur industriel 3P ${In} A (AC-3) + 1 NO`, cat: 'Appareils de commande', type: 'contactor', poles: '3P', In, W: In <= 32 ? 45 : 55, H: 80, D: 90, mods: In <= 32 ? 3 : 4, pw: 2 + In * 0.05, sheet: 'EN 60947-4-1' })));
    [['0,63-1', 1], ['1-1,6', 1.6], ['2,5-4', 4], ['4-6', 6], ['9-13', 13], ['17-25', 25]].forEach(([r, In]) => L.push(P({ ref: `GEN-RT-${String(r).replace(/[ ,]/g, '')}`, name: `Relais thermique ${r} A`, cat: 'Appareils de commande', type: 'overload', poles: '3P', In, W: 45, H: 70, D: 80, mods: 3, pw: 3, sheet: 'EN 60947-4-1' })));
    L.push(P({ ref: 'GEN-RL-230-2NO', name: 'Relais modulaire 230 V 2 NO 16 A', cat: 'Appareils de commande', type: 'relay', poles: '2NO', In: 16, mods: 1, W: 18, H: 85, D: 65, pw: 1.2 }));
    L.push(P({ ref: 'GEN-TL-16', name: 'Télérupteur 16 A 1 NO', cat: 'Appareils de commande', type: 'relay', poles: '1NO', In: 16, mods: 1, W: 18, H: 85, D: 65, pw: 0.6 }));
    L.push(P({ ref: 'GEN-INT-2P-20', name: 'Interrupteur modulaire 2P 20 A', cat: 'Appareils de commande', type: 'switch', poles: '2P', In: 20, mods: 1, W: 18, H: 85, D: 65, pw: 0.5 }));
    [[40, '2P', 2], [63, '4P', 4], [100, '4P', 4], [125, '4P', 4]].forEach(([In, po, m]) => L.push(P({ ref: `GEN-IS-${po}-${In}`, name: `Interrupteur-sectionneur ${po} ${In} A`, cat: 'Appareils de commande', type: 'isolator', poles: po, In, mods: m, W: 18 * m, H: 85, D: 70, pw: In * 0.04 * m / 2, sheet: 'EN 60947-3' })));
    [160, 250, 400, 630].forEach((In) => L.push(P({ ref: `GEN-ISB-4P-${In}`, name: `Interrupteur-sectionneur boîtier 4P ${In} A`, cat: 'Appareils de commande', type: 'isolator', poles: '4P', In, W: 140, H: 200, D: 110, mount: 'Platine', pw: In * 0.06, sheet: 'EN 60947-3' })));
    [[40, 'manuel'], [63, 'manuel'], [125, 'motorisé'], [250, 'motorisé'], [630, 'motorisé']].forEach(([In, k]) => L.push(P({ ref: `GEN-INV-4P-${In}`, name: `Inverseur de source 4P ${In} A ${k}`, cat: 'Appareils de commande', type: 'ats', poles: '4P', In, mods: In <= 63 ? 8 : 0, W: In <= 63 ? 144 : 300, H: In <= 63 ? 85 : 250, D: 120, mount: In <= 63 ? 'Rail DIN' : 'Platine', pw: In * 0.06, sheet: 'EN 60947-6-1' })));
    [['MX', 'Déclencheur à émission de courant (MX)'], ['MN', 'Déclencheur à minimum de tension (MN)'], ['OF', 'Contact auxiliaire ouvert/fermé (OF)'], ['SD', 'Contact signal défaut (SD)']].forEach(([k, n]) => L.push(P({ ref: `GEN-AUX-${k}`, name: n, cat: 'Appareils de commande', type: 'aux', mods: k === 'OF' || k === 'SD' ? 0.5 : 1, W: k === 'OF' || k === 'SD' ? 9 : 18, H: 85, D: 75, pw: 0.5 })));
    // ---------- D. Distribution ----------
    [['1P+N', 13], ['1P+N', 18], ['1P+N', 24], ['3P+N', 13], ['3P+N', 18], ['3P+N', 24]].forEach(([po, n]) => L.push(P({ ref: `GEN-PGN-H-${po.replace('+', '')}-${n}`, name: `Peigne horizontal ${po} ${n} modules`, cat: 'Distribution', type: 'comb', poles: po, In: 63, mods: n, sheet: 'Accessoire' })));
    L.push(P({ ref: 'GEN-PGN-V', name: 'Peigne vertical (liaison entre rangées)', cat: 'Distribution', type: 'comb_v', In: 63 }));
    [[125, 4, 13], [160, 4, 13], [250, 4, 15]].forEach(([In, b, n]) => L.push(P({ ref: `GEN-REP-${In}`, name: `Répartiteur ${b} barres ${In} A – ${n} départs`, cat: 'Distribution', type: 'distrib', In, mods: In <= 125 ? 4 : 0, W: In <= 125 ? 72 : 150, H: 100, D: 60, pw: 3 })));
    [[250, '20×5'], [400, '30×5'], [630, '40×10'], [1000, '60×10'], [1600, '80×10'], [2500, '2×100×10']].forEach(([In, s]) => L.push(P({ ref: `GEN-JDB-${In}`, name: `Jeu de barres cuivre ${s} mm – ${In} A (prix au mètre, 4 barres)`, cat: 'Distribution', type: 'busbar', In, unit: 'm', pw: In * 0.025 })));
    L.push(P({ ref: 'GEN-BLOC-DIST', name: 'Bloc de distribution 4P 125 A', cat: 'Distribution', type: 'distrib', In: 125, mods: 4, W: 72, H: 90, D: 60 }));
    L.push(P({ ref: 'GEN-BOR-PE', name: 'Bornier de terre 15 trous', cat: 'Distribution', type: 'terminal', mods: 0 }));
    L.push(P({ ref: 'GEN-BOR-N', name: 'Bornier de neutre 15 trous', cat: 'Distribution', type: 'terminal', mods: 0 }));
    L.push(P({ ref: 'GEN-BOR-RAIL', name: 'Borne sur rail 4 mm² (départ)', cat: 'Distribution', type: 'terminal', mods: 0.3 }));
    L.push(P({ ref: 'GEN-CONN', name: 'Connecteur de raccordement (lot)', cat: 'Distribution', type: 'connector' }));
    // ---------- E. Enveloppes ----------
    [[1, 13, 'isolant'], [2, 13, 'isolant'], [3, 13, 'isolant'], [4, 13, 'isolant'], [1, 18, 'isolant'], [2, 18, 'isolant'], [3, 18, 'isolant'], [4, 18, 'isolant'], [5, 18, 'métallique'], [6, 18, 'métallique'], [4, 24, 'métallique'], [5, 24, 'métallique'], [6, 24, 'métallique'], [7, 24, 'métallique'], [8, 24, 'métallique']].forEach(([r, m, mat]) => {
      const W = m === 13 ? 300 : m === 18 ? 410 : 560, H = 125 + r * 150, D = mat === 'isolant' ? 110 : 160;
      L.push(P({ ref: `GEN-COF-${r}R${m}M-${mat === 'isolant' ? 'I' : 'M'}`, name: `Coffret modulaire ${mat} ${r} rangée${r > 1 ? 's' : ''} × ${m} modules (IP40, porte)`, cat: 'Enveloppes', type: 'enclosure', enc: { rows: r, perRow: m, mat, kind: 'coffret', plates: 0 }, W, H, D, mount: 'Mural', sheet: 'EN 61439-3' }));
    });
    [[1200, 600, 250, 'murale'], [1400, 800, 300, 'murale'], [1800, 600, 400, 'au sol'], [2000, 800, 400, 'au sol'], [2000, 800, 600, 'au sol'], [2000, 1000, 600, 'au sol']].forEach(([H, W, D, k]) => L.push(P({ ref: `GEN-ARM-${H}x${W}x${D}`, name: `Armoire métallique ${k} ${H}×${W}×${D} mm (IP55)`, cat: 'Enveloppes', type: 'enclosure', enc: { rows: Math.floor((H - 300) / 150), perRow: W >= 800 ? 36 : 24, mat: 'métallique', kind: 'armoire', plates: 1 }, W, H, D, mount: k === 'au sol' ? 'Sol' : 'Mural', sheet: 'EN 61439-1/-2' })));
    L.push(P({ ref: 'GEN-PLASTRON-150', name: 'Plastron modulaire hauteur 150 mm', cat: 'Enveloppes', type: 'plate', unit: 'pce' }));
    L.push(P({ ref: 'GEN-RAIL-DIN', name: 'Rail DIN 35 mm (au mètre)', cat: 'Enveloppes', type: 'rail', unit: 'm' }));
    L.push(P({ ref: 'GEN-GOUL-40x60', name: 'Goulotte de câblage 40×60 mm (au mètre)', cat: 'Enveloppes', type: 'duct', unit: 'm' }));
    L.push(P({ ref: 'GEN-OBT', name: 'Obturateur 5 modules (réserves)', cat: 'Enveloppes', type: 'blank', mods: 5 }));
    L.push(P({ ref: 'GEN-FIX', name: 'Accessoires de fixation (lot)', cat: 'Enveloppes', type: 'fixing' }));
    // ---------- Câbles (prix au mètre) ----------
    [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240].forEach((s) => ['3G', '5G'].forEach((c) => L.push(P({ ref: `GEN-CAB-U1000R2V-${c}${String(s).replace('.', ',')}`, name: `Câble U-1000 R2V ${c}${String(s).replace('.', ',')} mm² (au mètre)`, cat: 'Câbles', type: 'cable', section: s, cores: c, unit: 'm', sheet: 'NF C 32-321' }))));
    return L;
  }

  // ---------- stockage (la bibliothèque complète n'est enregistrée qu'après une modification) ----------
  let cache = null;
  const Lib = {
    all() { if (!cache) { const s = EE.Store.raw.get(KEY, null); cache = Array.isArray(s) && s.length ? s : defaults(); } return cache; },
    save(list) { cache = list; EE.Store.raw.set(KEY, list); },
    reset() { cache = null; EE.Store.raw.del(KEY); },
    defaults,
    get(ref, fab) { return Lib.all().find((p) => p.ref === ref && (!fab || p.fab === fab)); },
    cats() { return [...new Set(Lib.all().map((p) => p.cat))]; },
    fabs() { return [...new Set(Lib.all().map((p) => p.fab))]; },
    upsert(p) { const l = Lib.all().slice(); const i = l.findIndex((x) => x.ref === p.ref && x.fab === p.fab); if (i >= 0) l[i] = Object.assign({}, l[i], p); else l.push(P(p)); Lib.save(l); },
    remove(ref, fab) { Lib.save(Lib.all().filter((x) => !(x.ref === ref && x.fab === fab))); },
  };

  // ---------- CSV (séparateur ; ou , détecté ; en-têtes en français) ----------
  const COLS = [['ref', 'reference'], ['fab', 'fabricant'], ['name', 'designation'], ['cat', 'categorie'], ['type', 'type'], ['poles', 'poles'], ['In', 'courant_nominal'], ['Un', 'tension_nominale'], ['pdc', 'pouvoir_de_coupure_ka'], ['curve', 'courbe'], ['mods', 'modules'], ['W', 'largeur_mm'], ['H', 'hauteur_mm'], ['D', 'profondeur_mm'], ['mount', 'montage'], ['price', 'prix_unitaire'], ['acc', 'accessoires'], ['sheet', 'fiche_technique'], ['sens', 'sensibilite_ma'], ['rtype', 'type_differentiel'], ['pw', 'pertes_w'], ['unit', 'unite']];
  const NUMS = ['In', 'Un', 'pdc', 'mods', 'W', 'H', 'D', 'price', 'sens', 'pw'];
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  function splitCSV(line, sep) { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; }
  function toCSV(list) {
    const q = (v) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [COLS.map((c) => c[1]).join(';')].concat(list.map((p) => COLS.map(([k]) => q(k === 'sens' ? (p.rcd || {}).sens : k === 'rtype' ? (p.rcd || {}).type : typeof p[k] === 'number' ? String(p[k]).replace('.', ',') : p[k])).join(';'))).join('\r\n');
  }
  function parseCSV(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim()); if (lines.length < 2) throw new Error('Fichier vide ou sans ligne de produits.');
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const head = splitCSV(lines[0], sep).map(norm);
    const idx = {}; COLS.forEach(([k, n]) => { const i = head.findIndex((h) => h === n || h === norm(k) || h.startsWith(n.split('_')[0]) && n.split('_')[0].length > 4); if (i >= 0) idx[k] = i; });
    if (idx.ref == null || idx.name == null) throw new Error('Colonnes « reference » et « designation » obligatoires (voir le modèle CSV).');
    const out = [], errs = [];
    lines.slice(1).forEach((l, n) => {
      const c = splitCSV(l, sep); const p = {}; Object.keys(idx).forEach((k) => { let v = (c[idx[k]] || '').trim(); if (NUMS.includes(k)) v = v === '' ? 0 : parseFloat(v.replace(/\s/g, '').replace(',', '.')) || 0; p[k] = v; });
      if (!p.ref || !p.name) { errs.push(`ligne ${n + 2} : référence ou désignation manquante`); return; }
      if (!p.fab) p.fab = 'Inconnu'; if (p.sens || p.rtype) p.rcd = { sens: p.sens || 30, type: p.rtype || 'AC' }; delete p.sens; delete p.rtype;
      if (!p.cat) p.cat = 'Divers'; out.push(P(p));
    });
    return { products: out, errors: errs };
  }
  function importCSV(text, mode) { // mode : 'merge' (mise à jour + ajout) ou 'prices' (prix seulement)
    const r = parseCSV(text); const l = Lib.all().slice(); let add = 0, upd = 0;
    r.products.forEach((p) => { const i = l.findIndex((x) => x.ref === p.ref && x.fab === p.fab); if (i >= 0) { l[i] = mode === 'prices' ? Object.assign({}, l[i], { price: p.price }) : Object.assign({}, l[i], p); upd++; } else if (mode !== 'prices') { l.push(p); add++; } });
    Lib.save(l); return { added: add, updated: upd, errors: r.errors };
  }
  EE.BTLib = Object.assign(Lib, { toCSV, parseCSV, importCSV, COLS });
})(window);
