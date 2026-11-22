/* Yak-élec-pro – bibliothèque de symboles (26 symboles) */
(function (g) {
  'use strict';
  const EE = g.EE;
  const L = (a, b, c, d, x = '') => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" ${x}/>`;
  const C = (x, y, r, f = false) => `<circle cx="${x}" cy="${y}" r="${r}"${f ? ' fill="currentColor"' : ''}/>`;
  const R = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
  const P = (d, f = false) => `<path d="${d}"${f ? ' fill="currentColor"' : ''}/>`;
  const T = (x, y, s, size = 10, anc = 'middle') => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anc}" fill="currentColor" stroke="none" font-family="Arial,sans-serif">${EE.esc(s)}</text>`;
  const DASH = 'stroke-dasharray="4 3"';
  const t = (id, x, y, o = {}) => Object.assign({ id, x, y }, o);
  const REF = 'NF EN 60617 (CEI 60617) – Symboles graphiques pour schémas électriques';
  const REF_I = 'NF C 15-100 – Installations électriques à basse tension';

  // Corps d'un interrupteur (lame ouverte) – bornes 1 (haut) et 2 (bas)
  const swBody = (x = 0, open = true) => L(x, -40, x, -12) + L(x, 12, x, 40) + C(x, -12, 2.5, true) + C(x, 12, 2.5, true) +
    (open ? L(x, 12, x - 14, -8) : L(x, 12, x, -12));

  const defs = [
    { id: 'conducteur', name: 'Conducteur', cat: 'Liaisons', prefix: '', tool: 'wire', term: [], bbox: [-30, -10, 30, 10],
      desc: "Liaison électrique entre deux bornes. Se trace avec l'outil « Conducteur » (traits orthogonaux). Un simple croisement n'est jamais une connexion.",
      notes: 'En schéma unifilaire, un trait représente une canalisation ; le nombre de traits obliques indique le nombre de conducteurs (PE compris).',
      body: () => L(-30, 0, 30, 0), ref: REF + ' – conducteurs et connexions ; ' + REF_I },
    { id: 'connexion', name: 'Connexion (jonction)', cat: 'Liaisons', prefix: '', junction: true, term: [t('J', 0, 0)], bbox: [-8, -8, 8, 8],
      desc: 'Point de jonction : relie électriquement tous les conducteurs et bornes qui passent par ce point.',
      notes: "Placer une connexion pour réaliser une dérivation (T). Sans jonction, un conducteur qui touche un autre conducteur est signalé « ambigu ».",
      body: () => C(0, 0, 4.5, true), ref: REF + ' – conducteurs et connexions' },
    { id: 'croisement', name: 'Croisement sans connexion', cat: 'Liaisons', prefix: '', cross: true, term: [], bbox: [-20, -20, 20, 20],
      desc: 'Deux conducteurs se croisent sans être reliés électriquement (représentation en pont).',
      notes: "Ce symbole n'a aucun effet électrique : le moteur de connexion ignore tout croisement de conducteurs.",
      body: () => L(0, -20, 0, 20) + L(-20, 0, -6, 0) + L(6, 0, 20, 0) + P('M-6,0 A6,6 0 0 1 6,0'), ref: REF + ' – conducteurs et connexions' },
    { id: 'terre', name: 'Terre', cat: 'Sources', prefix: '', src: { PE: 'PE' }, term: [t('PE', 0, 0)], bbox: [-12, 0, 12, 36],
      desc: 'Prise de terre / conducteur de protection (PE), repéré vert/jaune.',
      notes: 'Toute masse métallique (luminaire classe I, prise, moteur) doit être reliée à la terre.',
      body: () => L(0, 0, 0, 16) + L(-12, 16, 12, 16) + L(-8, 23, 8, 23) + L(-4, 30, 4, 30), ref: REF + ' ; ' + REF_I },
    { id: 'phase', name: 'Phase', cat: 'Sources', prefix: '', params: { val: ['L1', 'L2', 'L3'] }, defVal: 'L1', srcFn: (c) => ({ P: c.val || 'L1' }), term: [t('P', 0, 0)], bbox: [-16, -36, 16, 0],
      desc: 'Origine d’un conducteur de phase (L1, L2 ou L3). Couleurs usuelles : marron, noir ou gris (NF C 15-100).',
      notes: 'Choisir L1, L2 ou L3 dans le panneau de propriétés (utile pour les moteurs triphasés).',
      body: (c) => L(0, 0, 0, -14) + R(-16, -34, 32, 20) + T(0, -20, c.val || 'L1', 11), ref: REF + ' ; ' + REF_I },
    { id: 'neutre', name: 'Neutre', cat: 'Sources', prefix: '', src: { N: 'N' }, term: [t('N', 0, 0)], bbox: [-16, -36, 16, 0],
      desc: 'Origine du conducteur neutre, repéré bleu clair.',
      notes: 'Le neutre ne doit jamais être interrompu par un interrupteur dans un circuit d’éclairage : c’est la phase qui est coupée.',
      body: () => L(0, 0, 0, -14) + R(-16, -34, 32, 20) + T(0, -20, 'N', 11), ref: REF + ' ; ' + REF_I },
    { id: 'interrupteur', name: 'Interrupteur simple', cat: 'Commande', prefix: 'S', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 14, 40],
      desc: 'Appareil de commande à deux positions (ouvert / fermé) qui coupe la phase du circuit d’éclairage (simple allumage).',
      notes: 'Se place sur le conducteur de phase, en amont de la lampe.',
      body: (c, m, st) => swBody(0, !(st && st.closed)) + (st && st.closed ? '' : L(-14, -8, -19, -11)), ref: REF + ' – appareillage de commande et de protection' },
    { id: 'interrupteur_double', name: 'Interrupteur double', cat: 'Commande', prefix: 'S', term: [t('C', 0, -40), t('1', -20, 40), t('2', 20, 40)], sw: [['C', '1'], ['C', '2']], bbox: [-36, -40, 36, 40],
      desc: 'Deux interrupteurs dans un même boîtier alimentés par une phase commune (double allumage : deux circuits de lampes).',
      notes: 'C = entrée commune de la phase ; 1 et 2 = retours vers chaque lampe.',
      body: (c, m, st) => L(0, -40, 0, -24) + L(-20, -24, 20, -24) + L(-20, -24, -20, -12) + L(20, -24, 20, -12) + C(-20, -12, 2.5, true) + C(20, -12, 2.5, true) +
        (st && st.c1 ? L(-20, 12, -20, -12) : L(-20, 12, -34, -8)) + (st && st.c2 ? L(20, 12, 20, -12) : L(20, 12, 6, -8)) + L(-20, 12, -20, 40) + L(20, 12, 20, 40) + C(-20, 12, 2.5, true) + C(20, 12, 2.5, true) + L(-30, 0, 10, 0, DASH),
      ref: REF + ' – appareillage de commande' },
    { id: 'va_et_vient', name: 'Va-et-vient', cat: 'Commande', prefix: 'S', term: [t('C', 0, -40), t('L1', -20, 40), t('L2', 20, 40)], sw: [['C', 'L1'], ['C', 'L2']], bbox: [-28, -40, 28, 40],
      desc: 'Commutateur à deux directions : permet de commander une lampe depuis deux endroits (avec un second va-et-vient).',
      notes: 'C = commun ; L1 et L2 = navettes reliées au second va-et-vient.',
      body: (c, m, st) => L(0, -40, 0, -12) + C(0, -12, 2.5, true) + (st && st.pos === 1 ? L(0, -12, 17, 9) : L(0, -12, -17, 9)) + C(-20, 12, 2.5, true) + C(20, 12, 2.5, true) + L(-20, 12, -20, 40) + L(20, 12, 20, 40),
      ref: REF + ' – appareillage de commande' },
    { id: 'bp_no', name: 'Bouton-poussoir NO', cat: 'Commande', prefix: 'BP', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-20, -40, 24, 40],
      desc: 'Contact normalement ouvert (NO) : fermé tant que l’on appuie, rouvert au relâchement (rappel par ressort).',
      notes: 'Utilisé pour commander une minuterie, un télérupteur, un contacteur ou une sonnerie. Plusieurs BP se branchent en parallèle.',
      body: (c, m, st) => swBody(0, !(st && st.closed)) + L(-7, 2, 10, 2, DASH) + L(10, -4, 10, 8) + L(5, -4, 15, -4), ref: REF + ' – dispositifs de commande manuelle' },
    { id: 'bp_nf', name: 'Bouton-poussoir NF', cat: 'Commande', prefix: 'BP', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-20, -40, 24, 40],
      desc: 'Contact normalement fermé (NF) : ouvert tant que l’on appuie. Sert d’arrêt (bouton « Arrêt » d’un circuit de commande).',
      notes: 'Placé en série dans un circuit de commande avec un bouton marche NO.',
      body: (c, m, st) => (st && !st.closed ? swBody(0, true) : L(0, -40, 0, 40)) + L(-8, -12, 8, -12) + L(-7, 2, 10, 2, DASH) + L(10, -4, 10, 8) + L(5, -4, 15, -4), ref: REF + ' – dispositifs de commande manuelle' },
    { id: 'contacteur', name: 'Contacteur', cat: 'Commande', prefix: 'KM', term: [t('A1', -20, -40), t('A2', -20, 40), t('1', 20, -40), t('2', 20, 40)], loads: [['A1', 'A2']], sw: [['1', '2']], bbox: [-34, -40, 30, 40],
      desc: 'Appareil de commutation à commande électrique : une bobine (A1-A2) ferme un contact de puissance (1-2).',
      notes: 'La bobine appartient au circuit de commande, le contact au circuit de puissance.',
      body: (c, m, st) => L(-20, -40, -20, -20) + L(-20, 20, -20, 40) + R(-32, -20, 24, 40) + T(-20, 4, 'KM', 10) + L(20, -40, 20, -12) + L(20, 12, 20, 40) + C(20, -12, 2.5, true) + C(20, 12, 2.5, true) + (st && st.closed ? L(20, 12, 20, -12) : L(20, 12, 6, -8)) + L(-8, 0, 12, 0, DASH),
      fx: (c, st) => (st.coil ? { u: '<rect x="-32" y="-20" width="24" height="40" fill="#7bd88f" fill-opacity=".7" stroke="none"/>' } : {}), coil: true,
      ref: REF + ' – appareils de commutation' },
    { id: 'relais', name: 'Relais', cat: 'Commande', prefix: 'K', term: [t('A1', -20, -40), t('A2', -20, 40), t('13', 20, -40), t('14', 20, 40)], loads: [['A1', 'A2']], sw: [['13', '14']], bbox: [-34, -40, 30, 40],
      desc: 'Relais électromagnétique : bobine (A1-A2) et contact auxiliaire normalement ouvert (13-14).',
      notes: 'Sert à la commande à faible puissance, aux automatismes et à l’auto-maintien.',
      body: (c, m, st) => L(-20, -40, -20, -20) + L(-20, 20, -20, 40) + R(-32, -20, 24, 40) + L(-32, -20, -8, 20) + L(20, -40, 20, -12) + L(20, 12, 20, 40) + C(20, -12, 2.5, true) + C(20, 12, 2.5, true) + (st && st.closed ? L(20, 12, 20, -12) : L(20, 12, 6, -8)) + L(-8, 0, 12, 0, DASH),
      fx: (c, st) => (st.coil ? { u: '<rect x="-32" y="-20" width="24" height="40" fill="#7bd88f" fill-opacity=".7" stroke="none"/>' } : {}), coil: true,
      ref: REF + ' – relais' },
    { id: 'fusible', name: 'Fusible', cat: 'Protection', prefix: 'F', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-10, -40, 10, 40],
      desc: 'Protection contre les surintensités : le fusible fond et coupe le circuit.', notes: 'Indiquer le calibre (ex. 10 A) dans le champ « Valeur ».',
      body: (c, m, st) => (st && st.blown ? L(0, -40, 0, -18) + L(0, 18, 0, 40) + R(-6, -18, 12, 36) + L(-4, -4, 4, 4) + L(-4, 4, 4, -4) : L(0, -40, 0, 40) + R(-6, -18, 12, 36)), ref: REF + ' – dispositifs de protection' },
    { id: 'disjoncteur', name: 'Disjoncteur', cat: 'Protection', prefix: 'Q', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 14, 40],
      desc: 'Appareil de protection et de coupure contre les surcharges et courts-circuits (ex. 16 A pour un circuit d’éclairage en 1,5 mm²).',
      notes: 'Dans le tableau, un disjoncteur protège chaque circuit (NF C 15-100).',
      body: (c, m, st) => swBody(0, !(st && st.closed)) + L(-5, -34, 5, -24) + L(-5, -24, 5, -34), ref: REF + ' – dispositifs de protection ; ' + REF_I,
      extra: { unifilaire: () => T(0, 52, '1P+N', 8) } },
    { id: 'differentiel', name: 'Interrupteur différentiel', cat: 'Protection', prefix: 'ID', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 30, 40],
      desc: 'Dispositif de protection des personnes : coupe le circuit en cas de courant de fuite (ex. 30 mA).',
      notes: 'En général placé en tête de plusieurs circuits (NF C 15-100).',
      body: (c, m, st) => swBody(0, !(st && st.closed)) + R(10, -10, 18, 20) + T(19, 4, 'Δ', 11) + L(-7, 2, 10, 2, DASH), ref: REF + ' ; ' + REF_I },
    { id: 'lampe', name: 'Lampe', cat: 'Récepteurs', prefix: 'H', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], loads: [['1', '2']], bbox: [-16, -40, 16, 40],
      desc: 'Lampe d’éclairage (point lumineux).', notes: 'Une lampe a besoin de deux potentiels différents : phase (via l’interrupteur) et neutre.',
      body: () => L(0, -40, 0, -14) + L(0, 14, 0, 40) + C(0, 0, 14) + L(-10, -10, 10, 10) + L(-10, 10, 10, -10),
      fx: (c, st) => (st.on ? { u: '<circle r="30" fill="#ffd54a" fill-opacity=".28" stroke="none"/><circle r="22" fill="#ffd54a" fill-opacity=".35" stroke="none"/><circle r="14" fill="#ffe45c" stroke="none"/>' } : {}), ref: REF + ' – lampes et dispositifs de signalisation' },
    { id: 'prise', name: 'Prise de courant', cat: 'Récepteurs', prefix: 'X', term: [t('L', -20, -40), t('N', 20, -40), t('PE', 0, 40, { pe: true })], loads: [['L', 'N']], bbox: [-24, -40, 24, 40],
      desc: 'Prise de courant 2P+T (phase, neutre, terre).', notes: 'La borne de terre doit être reliée au conducteur de protection.',
      body: () => L(-20, -40, -20, 0) + L(20, -40, 20, 0) + P('M-20,0 A20,20 0 0 0 20,0') + L(0, 20, 0, 40) + L(-8, 32, 8, 32),
      extra: { unifilaire: () => T(0, -46, '2P+T', 8) }, ref: REF + ' – prises de courant' },
    { id: 'moteur_mono', name: 'Moteur monophasé', cat: 'Récepteurs', prefix: 'M', term: [t('L', -20, -40), t('N', 20, -40), t('PE', 0, 40, { pe: true })], loads: [['L', 'N']], bbox: [-26, -40, 26, 40],
      desc: 'Moteur asynchrone monophasé.', notes: 'Alimenté entre phase et neutre ; masse reliée à la terre.',
      body: () => L(-20, -40, -20, -13) + L(20, -40, 20, -13) + C(0, 0, 24) + T(0, 4, 'M', 14) + T(0, 17, '1~', 9) + L(0, 24, 0, 40),
      fx: (c, st) => (st.on ? { u: '<circle r="24" fill="#8fd0ff" fill-opacity=".55" stroke="none"/>', o: (function(dir){ return '<g stroke="currentColor" stroke-width="2" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 0 0" to="' + (dir === 'ccw' ? -360 : 360) + ' 0 0" dur="0.9s" repeatCount="indefinite"/><line x1="0" y1="-14" x2="0" y2="14"/><line x1="-12" y1="7" x2="12" y2="7"/><line x1="-12" y1="-7" x2="12" y2="7"/></g>'; })(st.dir) } : {}),
      ref: REF + ' – machines tournantes' },
    { id: 'moteur_tri', name: 'Moteur triphasé', cat: 'Récepteurs', prefix: 'M', term: [t('U', -20, -40), t('V', 0, -40), t('W', 20, -40), t('PE', 0, 40, { pe: true })], loads: [['U', 'V', 'W']], bbox: [-26, -40, 26, 40],
      desc: 'Moteur asynchrone triphasé (3~).', notes: 'Alimenté par trois phases L1, L2, L3 : les trois bornes doivent recevoir trois phases différentes.',
      body: () => L(-20, -40, -20, -13) + L(20, -40, 20, -13) + L(0, -40, 0, -24) + C(0, 0, 24) + T(0, 4, 'M', 14) + T(0, 17, '3~', 9) + L(0, 24, 0, 40),
      fx: (c, st) => (st.on ? { u: '<circle r="24" fill="#8fd0ff" fill-opacity=".55" stroke="none"/>', o: (function(dir){ return '<g stroke="currentColor" stroke-width="2" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 0 0" to="' + (dir === 'ccw' ? -360 : 360) + ' 0 0" dur="0.9s" repeatCount="indefinite"/><line x1="0" y1="-14" x2="0" y2="14"/><line x1="-12" y1="7" x2="12" y2="7"/><line x1="-12" y1="-7" x2="12" y2="7"/></g>'; })(st.dir) } : {}),
      ref: REF + ' – machines tournantes' },
    { id: 'transformateur', name: 'Transformateur', cat: 'Récepteurs', prefix: 'TR', params: { val: true }, defVal: '230/12 V', term: [t('P1', -20, -40), t('P2', -20, 40), t('S1', 20, -40), t('S2', 20, 40)], loads: [['P1', 'P2']],
      srcFn: (c) => ({ S1: c.id + '.S1', S2: c.id + '.S2' }), conv: true, bbox: [-28, -40, 28, 40],
      fx: (c, st) => (st.on ? { u: '<circle cx="20" cy="0" r="20" fill="#8fd0ff" fill-opacity=".5" stroke="none"/>' } : {}),
      desc: 'Transformateur : primaire (P1-P2) alimenté en 230 V, secondaire (S1-S2) isolé en basse tension (sonnerie, TBTS).', notes: 'Le secondaire est électriquement séparé du primaire.',
      body: () => L(-20, -40, -20, -18) + L(-20, 18, -20, 40) + C(-20, -12, 6) + C(-20, 0, 6) + C(-20, 12, 6) + L(20, -40, 20, -18) + L(20, 18, 20, 40) + C(20, -12, 6) + C(20, 0, 6) + C(20, 12, 6) + L(-4, -18, -4, 18) + L(4, -18, 4, 18),
      ref: REF + ' – transformateurs' },
    { id: 'resistance', name: 'Résistance', cat: 'Composants', prefix: 'R', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], pa: [['1', '2']], bbox: [-10, -40, 10, 40],
      desc: 'Résistor (dipôle passif).', notes: 'Indiquer la valeur en ohms.', body: () => L(0, -40, 0, -14) + L(0, 14, 0, 40) + R(-7, -14, 14, 28), ref: REF + ' – résistances' },
    { id: 'condensateur', name: 'Condensateur', cat: 'Composants', prefix: 'C', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], pa: [['1', '2']], bbox: [-14, -40, 14, 40],
      desc: 'Condensateur (non polarisé).', notes: 'Indiquer la capacité (µF).', body: () => L(0, -40, 0, -4) + L(0, 4, 0, 40) + L(-12, -4, 12, -4) + L(-12, 4, 12, 4), ref: REF + ' – condensateurs' },
    { id: 'diode', name: 'Diode', cat: 'Composants', prefix: 'D', term: [t('A', 0, -40), t('K', 0, 40)], pa: [['A', 'K']], bbox: [-14, -40, 14, 40],
      desc: 'Diode : laisse passer le courant de l’anode (A) vers la cathode (K).', notes: 'La version 1 ne simule pas le sens de conduction.',
      body: () => L(0, -40, 0, -12) + L(0, 12, 0, 40) + P('M-12,-12 L12,-12 L0,12 Z') + L(-12, 12, 12, 12), ref: REF + ' – semi-conducteurs' },
    { id: 'zener', name: 'Diode Zener', cat: 'Composants', prefix: 'DZ', params: { val: true }, term: [t('A', 0, -40), t('K', 0, 40)], pa: [['A', 'K']], bbox: [-16, -40, 18, 40],
      desc: 'Diode Zener : régulation / limitation de tension.', notes: 'Indiquer la tension Zener (ex. 5,1 V).',
      body: () => L(0, -40, 0, -12) + L(0, 12, 0, 40) + P('M-12,-12 L12,-12 L0,12 Z') + L(-12, 12, 12, 12) + L(-12, 12, -12, 6) + L(12, 12, 12, 18), ref: REF + ' – semi-conducteurs' },
    { id: 'led', name: 'LED', cat: 'Composants', prefix: 'LED', term: [t('A', 0, -40), t('K', 0, 40)], pa: [['A', 'K']], bbox: [-14, -40, 26, 40],
      desc: 'Diode électroluminescente (voyant).', notes: 'À placer avec une résistance en série.',
      body: () => L(0, -40, 0, -12) + L(0, 12, 0, 40) + P('M-12,-12 L12,-12 L0,12 Z') + L(-12, 12, 12, 12) + L(14, -6, 24, -16) + P('M24,-16 L19,-15 L23,-11 Z', true) + L(14, 2, 24, -8) + P('M24,-8 L19,-7 L23,-3 Z', true),
      fx: (c, st) => (st.on ? { u: '<circle r="26" fill="#5be37a" fill-opacity=".35" stroke="none"/><path d="M-12,-12 L12,-12 L0,12 Z" fill="#5be37a" stroke="none"/>' } : {}), ref: REF + ' – semi-conducteurs' },
  ];

  EE.Draw = { L, C, R, P, T, DASH, t, swBody, REF, REF_I };
  const byId = {};
  defs.forEach((d) => { d.params = d.params || {}; byId[d.id] = d; });

  EE.Library = {
    list: defs,
    get: (id) => byId[id],
    cats: ['Liaisons', 'Sources', 'Commande', 'Protection', 'Récepteurs', 'Composants'],
    add(arr, cat) { arr.forEach((d) => { d.params = d.params || {}; byId[d.id] = d; defs.push(d); }); },
    // Bornes en coordonnées monde
    rot(x, y, rot) { const r = ((rot % 360) + 360) % 360; if (r === 90) return [-y, x]; if (r === 180) return [-x, -y]; if (r === 270) return [y, -x]; return [x, y]; },
    termWorld(c, tm) { const [rx, ry] = this.rot(tm.x, tm.y, c.rot || 0); return { x: Math.round(c.x + rx), y: Math.round(c.y + ry) }; },
    sources(c) { const d = byId[c.type]; if (d.srcFn) return d.srcFn(c); return d.src || null; },
    newComp(type, x, y) {
      const d = byId[type];
      return { id: EE.uid('c'), type, x, y, rot: 0, label: '', val: d.defVal || '' };
    },
    // Boîte englobante en coordonnées monde (avec rotation)
    bbox(c) {
      const d = byId[c.type]; const [a, b, e, f] = d.bbox;
      const pts = [[a, b], [e, b], [e, f], [a, f]].map(([x, y]) => this.rot(x, y, c.rot || 0));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      return { x1: c.x + Math.min(...xs), y1: c.y + Math.min(...ys), x2: c.x + Math.max(...xs), y2: c.y + Math.max(...ys) };
    },
  };
})(window);
