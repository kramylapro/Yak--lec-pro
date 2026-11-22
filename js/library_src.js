/* Yak-élec-pro – symboles de sources d'énergie (réseau, groupe électrogène, batterie, photovoltaïque, éolienne) */
(function (g) {
  'use strict';
  const EE = g.EE, { L, C, R, P, T, t, REF, REF_I } = EE.Draw;
  const RS = REF + ' – sources d\'énergie électrique (production et conversion) ; ' + REF_I;
  const pe = (x, y) => t('PE', x, y, { pe: true });
  const sine = (cx, cy, w) => P(`M${cx - w},${cy} C${cx - w / 2},${cy - w} ${cx - w / 4},${cy - w} ${cx},${cy} S${cx + w / 2},${cy + w} ${cx + w},${cy}`);
  const glow = (r) => (c, st) => (st.on ? { u: `<circle r="${r}" fill="#ffe14d" fill-opacity=".45" stroke="none"/>` } : {});
  const defs = [
    { id: 'reseau_mono', name: 'Réseau monophasé 230 V', cat: 'Sources', prefix: 'G', params: { val: true }, defVal: '230 V', src: { L: 'L1', N: 'N', PE: 'PE' },
      term: [t('L', -20, 40), t('N', 0, 40), pe(20, 40)], bbox: [-26, -34, 26, 40],
      desc: 'Source du distributeur d\'énergie : phase (L), neutre (N) et terre (PE) en 230 V monophasé.',
      notes: 'Une seule source fournit la phase, le neutre et la terre du circuit. Le raccordement de la terre est signalé s\'il est oublié.',
      body: () => C(0, -10, 24) + sine(0, -10, 13) + L(-20, 12, -20, 40) + L(0, 14, 0, 40) + L(20, 12, 20, 40), ref: RS },
    { id: 'reseau_tri', name: 'Réseau triphasé 400 V', cat: 'Sources', prefix: 'G', params: { val: true }, defVal: '400 V', src: { L1: 'L1', L2: 'L2', L3: 'L3', N: 'N', PE: 'PE' },
      term: [t('L1', -40, 40), t('L2', -20, 40), t('L3', 0, 40), t('N', 20, 40, { opt: true }), pe(40, 40)], bbox: [-46, -34, 46, 40],
      desc: 'Source du distributeur : 3 phases (L1, L2, L3), neutre (N) et terre (PE) en 400 V triphasé.',
      notes: 'Le neutre est facultatif pour un récepteur purement triphasé (moteur). Brancher le neutre pour alimenter aussi des charges monophasées.',
      body: () => C(0, -10, 24) + T(0, -8, '3~', 15) + L(-40, 40, -40, 20) + L(-40, 20, -16, 12) + L(-20, 40, -20, 16) + L(0, 40, 0, 14) + L(20, 40, 20, 16) + L(40, 40, 40, 20) + L(40, 20, 16, 12), ref: RS },
    { id: 'groupe_mono', name: 'Groupe électrogène monophasé', cat: 'Sources', prefix: 'GE', params: { val: true }, defVal: '5 kVA', src: { L: 'L1', N: 'N', PE: 'PE' },
      term: [t('L', -20, 40), t('N', 0, 40), pe(20, 40)], bbox: [-26, -34, 26, 40],
      desc: 'Génératrice entraînée par un moteur thermique : fournit du 230 V monophasé (secours, chantier, site isolé).',
      notes: 'En secours, il ne doit jamais être couplé au réseau sans inverseur de source (verrouillage mécanique ou électrique).',
      body: () => C(0, -10, 24) + T(0, -6, 'G', 15) + sine(0, 8, 7) + L(-20, 14, -20, 40) + L(0, 16, 0, 40) + L(20, 14, 20, 40), fx: glow(24), ref: RS },
    { id: 'groupe_tri', name: 'Groupe électrogène triphasé', cat: 'Sources', prefix: 'GE', params: { val: true }, defVal: '20 kVA', src: { L1: 'L1', L2: 'L2', L3: 'L3', N: 'N', PE: 'PE' },
      term: [t('L1', -40, 40), t('L2', -20, 40), t('L3', 0, 40), t('N', 20, 40, { opt: true }), pe(40, 40)], bbox: [-46, -34, 46, 40],
      desc: 'Génératrice triphasée 400 V avec moteur thermique : alimentation de secours ou de chantier.',
      notes: 'Prévoir un inverseur de sources et la mise à la terre du groupe (schéma de liaison à la terre à définir).',
      body: () => C(0, -10, 24) + T(0, -6, 'GS', 14) + T(0, 6, '3~', 9) + L(-40, 40, -40, 20) + L(-40, 20, -16, 12) + L(-20, 40, -20, 16) + L(0, 40, 0, 14) + L(20, 40, 20, 16) + L(40, 40, 40, 20) + L(40, 20, 16, 12), fx: glow(24), ref: RS },
    { id: 'batterie', name: 'Batterie d\'accumulateurs', cat: 'Sources', prefix: 'GB', params: { val: true }, defVal: '12 V', src: { '+': 'DC+', '-': 'DC-' },
      term: [t('+', 0, -40), t('-', 0, 40)], bbox: [-16, -40, 16, 40],
      desc: 'Batterie (plomb, gel, lithium) : tension continue. Symbole de 3 éléments en série.',
      notes: 'Le grand trait est la borne positive. En photovoltaïque isolé, la batterie stocke l\'énergie des panneaux (voir menu Photovoltaïque). Protéger par un fusible près de la borne +.',
      body: () => L(0, -40, 0, -16) + L(-14, -16, 14, -16) + L(-7, -8, 7, -8) + L(-14, 0, 14, 0) + L(-7, 8, 7, 8) + L(-14, 16, 14, 16) + L(0, 16, 0, 40) + T(12, -22, '+', 9, 'start') + T(12, 26, '−', 9, 'start'), ref: RS },
    { id: 'pile', name: 'Pile / source continue', cat: 'Sources', prefix: 'G', params: { val: true }, defVal: '9 V', src: { '+': 'DC+', '-': 'DC-' },
      term: [t('+', 0, -40), t('-', 0, 40)], bbox: [-16, -40, 16, 40],
      desc: 'Élément de pile ou générateur de tension continue.', notes: 'Le grand trait est la borne positive.',
      body: () => L(0, -40, 0, -6) + L(-14, -6, 14, -6) + L(-7, 4, 7, 4) + L(0, 4, 0, 40) + T(12, -12, '+', 9, 'start') + T(12, 16, '−', 9, 'start'), ref: RS },
    { id: 'panneau_pv', name: 'Panneau photovoltaïque', cat: 'Sources', prefix: 'PV', params: { val: true }, defVal: '400 Wc', src: { '+': 'DC+', '-': 'DC-' },
      term: [t('+', -20, 40), t('-', 20, 40)], bbox: [-30, -36, 30, 40],
      desc: 'Module photovoltaïque : transforme le rayonnement solaire en tension continue (DC).',
      notes: 'Brancher en série (tensions additionnées) ou en parallèle (courants additionnés) ; protéger par fusibles gPV et parafoudre DC. Le dimensionnement se fait dans le menu Photovoltaïque.',
      body: () => R(-30, -34, 60, 40) + L(-30, 6, 30, -34) + L(-10, -34, -10, 6) + L(10, -34, 10, 6) + L(-30, -14, 30, -14) + L(-20, 6, -20, 40) + L(20, 6, 20, 40) + T(-12, 22, '+', 9) + T(12, 22, '−', 9), fx: glow(36), ref: RS + ' ; NF EN 61215 / EN 61730' },
    { id: 'eolienne', name: 'Éolienne (générateur)', cat: 'Sources', prefix: 'GW', params: { val: true }, defVal: '1 kW', src: { '+': 'DC+', '-': 'DC-' },
      term: [t('+', -20, 40), t('-', 20, 40)], bbox: [-26, -34, 26, 40],
      desc: 'Petite éolienne avec régulateur : fournit une tension continue pour charger des batteries.',
      notes: 'Prévoir un régulateur de charge et une résistance de délestage (sécurité en cas de batterie pleine).',
      body: () => C(0, -10, 24) + L(0, -10, 0, -28) + L(0, -10, 15, 0) + L(0, -10, -15, 0) + L(-20, 14, -20, 40) + L(20, 14, 20, 40) + T(-12, 28, '+', 9) + T(12, 28, '−', 9), ref: RS },
  ];
  EE.Library.add(defs);
})(window);
