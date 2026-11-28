/* Yak-élec-pro V1.10 – symboles complémentaires : distribution, protection, temporisation au repos, compteur,
   automate programmable, relais logique, capteurs, annotations (textes, titres, commentaires, repères).
   Symboles simplifiés d'après les principes de la NF EN 60617 (CEI 60617) : à valider sur la norme en vigueur. */
(function (g) {
  'use strict';
  const EE = g.EE, D = EE.Draw, { L, C, R, P, T, DASH, t } = D;
  const RI = D.REF + ' ; NF EN 60947 (appareillage à basse tension)';
  const RB = D.REF + ' ; ' + D.REF_I;
  const pole = (x, closed, tick, bw = 12) => L(x, -40, x, -12) + L(x, 12, x, 40) + C(x, -12, 2.5, true) + C(x, 12, 2.5, true) + (closed ? L(x, 12, x, -12) : L(x, 12, x - bw, -8) + (tick ? L(x - bw, -8, x - bw - 5, -11) : ''));
  const coilFx = (x, y, w, h) => (c, st) => (st.coil ? { u: `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#7bd88f" fill-opacity=".7" stroke="none"/>` } : {});
  const nf = (x, open) => (open ? pole(x, false, false) : L(x, -40, x, 40)) + L(x - 8, -12, x + 8, -12);
  const tempoRepos = () => P('M-18,-8 q6,6 0,12'); // demi-cercle tourné vers le contact (retard au déclenchement)

  // ---------- automate programmable / relais logique : bornes ----------
  const plcTerms = (nIn, nOut, half) => {
    const top = [t('L', -half + 20, -60), t('N', -half + 40, -60)];
    for (let i = 1; i <= nIn; i++) top.push(t('I' + i, -half + 40 + i * 20, -60, { opt: true }));
    const bot = [t('C', -half + 20, 60, { opt: true })];
    for (let i = 1; i <= nOut; i++) bot.push(t('Q' + i, -half + 20 + i * 20, 60, { opt: true }));
    return top.concat(bot);
  };
  const plcBody = (nIn, nOut, half, title) => (c, m, st) => {
    let s = R(-half, -40, half * 2, 80) + T(0, -2, title, 13) + T(0, 14, String(c.val || '').slice(0, 30) + (String(c.val || '').length > 30 ? '…' : ''), 7);
    s += L(-half + 20, -60, -half + 20, -40) + L(-half + 40, -60, -half + 40, -40) + T(-half + 20, -30, 'L', 7) + T(-half + 40, -30, 'N', 7);
    for (let i = 1; i <= nIn; i++) { const x = -half + 40 + i * 20; s += L(x, -60, x, -40) + T(x, -30, 'I' + i, 7); if (st && st.inp && st.inp[i - 1]) s += `<circle cx="${x}" cy="-44" r="3" fill="#34d058" stroke="none"/>`; }
    s += L(-half + 20, 40, -half + 20, 60) + T(-half + 20, 36, 'C', 7);
    for (let i = 1; i <= nOut; i++) { const x = -half + 20 + i * 20; s += L(x, 40, x, 60) + T(x, 36, 'Q' + i, 7); if (st && st.out && st.out[i - 1]) s += `<circle cx="${x}" cy="44" r="3" fill="#ff9f1a" stroke="none"/>`; }
    return s;
  };
  const plcFx = (half) => (c, st) => (st.on ? { u: `<rect x="${-half}" y="-40" width="${half * 2}" height="80" fill="#4da3ff" fill-opacity=".12" stroke="none"/>` } : {});

  // ---------- annotations ----------
  const txtW = (s, size) => Math.max(20, Math.round(String(s || '').length * size * 0.56));
  const annot = (id, name, size, bold, extra) => ({
    id, name, cat: 'Annotations', prefix: '', noLabel: true, annot: true, params: { val: true }, defVal: name === 'Repère' ? '1' : name, term: [],
    bbox: [-10, -size, 60, 6],
    bboxFn: (c) => { if (id === 'repere') return [-14, -14, 14, 14]; const w = txtW(c.val, size); return [-4, -size - 2, w + 8, Math.round(size * 0.45)]; },
    desc: extra.desc, notes: 'Écrivez le texte dans le champ « Valeur » du panneau Propriétés. Ce symbole n\'a aucun effet électrique.',
    body: (c) => {
      if (id === 'repere') return C(0, 0, 12) + T(0, 4, c.val || '1', 12);
      const w = txtW(c.val, size);
      const tx = `<text x="0" y="0" font-size="${size}" text-anchor="start" fill="currentColor" stroke="none" font-family="Arial,sans-serif"${bold ? ' font-weight="700"' : ''}${extra.italic ? ' font-style="italic"' : ''}>${EE.esc(c.val || '')}</text>`;
      return (extra.box ? `<rect x="-6" y="${-size - 4}" width="${w + 12}" height="${size + 12}" rx="4" stroke-dasharray="${extra.dash ? '4 3' : 'none'}"/>` : '') + (extra.under ? L(0, 6, w, 6) : '') + tx;
    },
    ref: 'Annotation (texte libre)',
  });

  const defs = [
    // ---------------- DISTRIBUTION ----------------
    { id: 'jeu_barres', name: 'Jeu de barres (barres de distribution)', cat: 'Distribution', prefix: 'W', params: { val: true }, defVal: 'L1',
      term: [-80, -40, 0, 40, 80].map((x, i) => t('B' + (i + 1), x, i === 0 ? -20 : 20, { opt: i !== 0 })),
      bridge: [['B1', 'B2', 'B3', 'B4', 'B5']], bbox: [-90, -20, 90, 20],
      desc: 'Barre conductrice de distribution (barre de cuivre ou peigne) : l\'arrivée (B1, en haut) est reliée à tous les départs (B2 à B5, en bas). On en place une par conducteur (L1, L2, L3, N, PE).',
      notes: 'Toutes les bornes de la barre sont au même potentiel. Indiquez le conducteur dans « Valeur » (L1, N, PE…). Les départs inutilisés ne sont pas signalés.',
      body: (c) => `<rect x="-90" y="-6" width="180" height="12" fill="currentColor" fill-opacity=".25"/>` + L(-80, -20, -80, -6) + [-40, 0, 40, 80].map((x) => L(x, 6, x, 20)).join('') + T(-60, -10, c.val || '', 9, 'start'), ref: RB },
    { id: 'bornier', name: 'Borne de raccordement', cat: 'Distribution', prefix: 'X', term: [t('1', 0, -20), t('2', 0, 20)], bridge: [['1', '2']], bbox: [-10, -20, 10, 20],
      desc: 'Borne de bornier (sur rail) : relie un conducteur arrivant (1) à un conducteur partant (2). Sert aux entrées et sorties d\'un coffret ou d\'une armoire.',
      notes: 'Numérotez les bornes (X1, X2…). Les deux côtés de la borne sont au même potentiel.',
      body: () => R(-8, -10, 16, 20) + L(0, -20, 0, -10) + L(0, 10, 0, 20) + C(0, -4, 2.2, true) + C(0, 4, 2.2, true), ref: RB },
    { id: 'bornier_lnpe', name: 'Bornier L – N – PE', cat: 'Distribution', prefix: 'X', term: [t('L1', -20, -20), t('L2', -20, 20), t('N1', 0, -20), t('N2', 0, 20), t('PE1', 20, -20, { pe: true }), t('PE2', 20, 20, { pe: true })],
      bridge: [['L1', 'L2'], ['N1', 'N2'], ['PE1', 'PE2']], bbox: [-30, -20, 30, 20],
      desc: 'Trois bornes côte à côte : phase, neutre et terre (borne vert/jaune). Raccordement d\'un circuit ou d\'un appareil.',
      notes: 'Chaque borne relie le haut et le bas. La borne PE doit être reliée à la terre.',
      body: () => [-20, 0, 20].map((x, i) => R(x - 8, -10, 16, 20) + L(x, -20, x, -10) + L(x, 10, x, 20) + T(x, 4, ['L', 'N', '⏚'][i], 8)).join(''), ref: RB },
    { id: 'autotransformateur', name: 'Autotransformateur', cat: 'Distribution', prefix: 'TR', params: { val: true }, defVal: '230/115 V', term: [t('E1', -20, -40), t('E2', -20, 40), t('S1', 20, -40), t('S2', 20, 40)], loads: [['E1', 'E2']],
      srcFn: (c) => ({ S1: c.id + '.S1', S2: c.id + '.S2' }), conv: true, bbox: [-28, -40, 28, 40],
      fx: (c, st) => (st.on ? { u: '<circle cx="0" cy="0" r="22" fill="#8fd0ff" fill-opacity=".45" stroke="none"/>' } : {}),
      desc: 'Autotransformateur : un seul enroulement avec une prise intermédiaire ; il abaisse ou élève la tension mais n\'isole pas le secondaire du primaire.',
      notes: 'Indiquez les tensions dans « Valeur » (ex. 230/115 V). Simulation simplifiée : la sortie S1-S2 est alimentée quand l\'entrée E1-E2 l\'est. Ne convient pas pour la TBTS (pas d\'isolement).',
      body: () => L(-20, -40, -20, -28) + L(-20, 28, -20, 40) + L(-20, -28, 0, -28) + L(-20, 28, 0, 28) + C(0, -18, 6) + C(0, -6, 6) + C(0, 6, 6) + C(0, 18, 6) + L(6, -6, 20, -6) + L(20, -6, 20, -40) + L(6, 28, 20, 28) + L(20, 28, 20, 40) + P('M14,-12 l6,6 l-6,6'), ref: RI },
    { id: 'alim_cc_dc', name: 'Alimentation continue (redressée 230 V → 24 V)', cat: 'Distribution', prefix: 'G', params: { val: true }, defVal: '24 V', term: [t('L', -20, -40), t('N', 20, -40), t('+', -20, 40), t('-', 20, 40)], loads: [['L', 'N']],
      srcFn: (c) => ({ '+': c.id + '.+', '-': c.id + '.-' }), conv: true, bbox: [-30, -40, 30, 40],
      fx: (c, st) => (st.on ? { u: '<rect x="-30" y="-24" width="60" height="48" fill="#8fd0ff" fill-opacity=".35" stroke="none"/>' } : {}),
      desc: 'Bloc d\'alimentation à découpage : reçoit le 230 V alternatif (L-N) et fournit une tension continue (ex. 24 V) pour les circuits de commande et les automates.',
      notes: 'La sortie + / − n\'est alimentée que si l\'entrée L-N l\'est.',
      body: () => R(-30, -24, 60, 48) + L(-20, -40, -20, -24) + L(20, -40, 20, -24) + L(-20, 24, -20, 40) + L(20, 24, 20, 40) + L(-30, 24, 30, -24) + T(-12, -8, '~', 12) + T(12, 16, '=', 12), ref: RI },

    // ---------------- PROTECTION ----------------
    { id: 'parafoudre', name: 'Parafoudre', cat: 'Protection', prefix: 'F', params: { val: true }, defVal: 'Type 2', term: [t('1', 0, -40), t('PE', 0, 40, { pe: true })], bbox: [-14, -40, 18, 40],
      desc: 'Parafoudre (limiteur de surtension) : écoule vers la terre les surtensions dues à la foudre. Il se raccorde entre le conducteur actif (phase ou neutre) et la terre.',
      notes: 'Placé en tête du tableau, après le disjoncteur de branchement, avec une liaison à la terre la plus courte possible (NF C 15-100 – à vérifier). En fonctionnement normal il ne conduit pas.',
      body: () => L(0, -40, 0, -18) + L(0, 18, 0, 40) + R(-10, -18, 20, 36) + P('M4,-12 L-4,0 L4,0 L-4,12') + P('M-4,12 l1,-6 l3,3 z', true), ref: RB },
    { id: 'interrupteur_sectionneur', name: 'Interrupteur-sectionneur bipolaire', cat: 'Protection', prefix: 'Q', term: [t('1', -20, -40), t('2', -20, 40), t('3', 0, -40), t('4', 0, 40)], sw: [['1', '2'], ['3', '4']], bbox: [-34, -40, 12, 40],
      desc: 'Interrupteur-sectionneur : coupe en charge (comme un interrupteur) et assure le sectionnement (isolement visible pour la maintenance). Ne protège pas contre les surintensités.',
      notes: 'Souvent utilisé comme interrupteur général d\'un tableau. En simulation, cliquer pour ouvrir / fermer.',
      body: (c, m, st) => [-20, 0].map((x) => pole(x, st && st.closed, false, 9) + L(x - 4, -12, x + 4, -12)).join('') + L(-27, 2, 7, 2, DASH), ref: RI },
    { id: 'differentiel_tetra', name: 'Interrupteur différentiel tétrapolaire (3P+N)', cat: 'Protection', prefix: 'ID', params: { val: true }, defVal: '40 A 30 mA', term: [t('1', -40, -40), t('2', -40, 40), t('3', -20, -40), t('4', -20, 40), t('5', 0, -40), t('6', 0, 40), t('N1', 20, -40), t('N2', 20, 40)],
      sw: [['1', '2'], ['3', '4'], ['5', '6'], ['N1', 'N2']], bbox: [-54, -40, 48, 40],
      desc: 'Différentiel triphasé + neutre : protège les personnes contre les courants de fuite sur une installation triphasée (ex. 30 mA).',
      notes: 'Indiquez le calibre et la sensibilité dans « Valeur ». En simulation : déclenche sur court-circuit, clic pour réarmer.',
      body: (c, m, st) => [-40, -20, 0, 20].map((x) => pole(x, st && st.closed, true, 9)).join('') + R(30, -10, 16, 20) + T(38, 4, 'Δ', 10) + L(-47, 2, 30, 2, DASH), ref: RI },

    // ---------------- TEMPORISATION AU REPOS / COMPTEUR ----------------
    { id: 'bobine_tempo_repos', name: 'Bobine de relais temporisé (repos)', cat: 'Industriel – commande', prefix: 'KA', params: { val: true }, defVal: '5 s', term: [t('A1', 0, -40), t('A2', 0, 40)], loads: [['A1', 'A2']], coil: true, timerOff: true, bbox: [-14, -40, 14, 40],
      desc: 'Bobine d\'un relais temporisé au déclenchement (retard à la retombée) : ses contacts basculent dès que la bobine est alimentée et ne reviennent au repos qu\'après la durée réglée, une fois la bobine coupée.',
      notes: 'Durée dans « Valeur » (ex. 5 s). Contacts associés : « Contact NO / NF temporisé au repos » avec le même repère (KA1). Usage : ventilation qui continue après l\'arrêt, éclairage temporisé.',
      body: () => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-12, -20, 24, 40) + T(0, 5, 't', 14) + R(-12, -20, 8, 40), fx: coilFx(-12, -20, 24, 40), ref: RI },
    { id: 'contact_no_tr', name: 'Contact NO temporisé au repos', cat: 'Industriel – commande', prefix: 'KA', term: [t('57', 0, -40), t('58', 0, 40)], sw: [['57', '58']], contact: true, timed: true, bbox: [-22, -40, 14, 40],
      desc: 'Contact NO qui se ferme dès que la bobine temporisée au repos (même repère) est alimentée, et ne s\'ouvre qu\'après la durée réglée quand elle est coupée.',
      notes: 'Repères de bornes indicatifs : vérifiez la documentation du fabricant.', body: (c, m, st) => pole(0, st && st.closed, false) + tempoRepos(), ref: RI },
    { id: 'contact_nf_tr', name: 'Contact NF temporisé au repos', cat: 'Industriel – commande', prefix: 'KA', term: [t('65', 0, -40), t('66', 0, 40)], sw: [['65', '66']], contact: true, timed: true, bbox: [-22, -40, 14, 40],
      desc: 'Contact NF qui s\'ouvre dès que la bobine temporisée au repos (même repère) est alimentée, et ne se referme qu\'après la durée réglée quand elle est coupée.',
      notes: 'Repères de bornes indicatifs : vérifiez la documentation du fabricant.', body: (c, m, st) => nf(0, st && !st.closed) + tempoRepos(), ref: RI },
    { id: 'bobine_compteur', name: 'Compteur d\'impulsions (bobine)', cat: 'Automatisme', prefix: 'KC', params: { val: true }, defVal: '5', term: [t('A1', 0, -40), t('A2', 0, 40)], loads: [['A1', 'A2']], coil: true, counter: true, bbox: [-16, -40, 40, 40],
      desc: 'Compteur électromécanique : chaque impulsion sur la bobine ajoute 1. Quand le nombre réglé (présélection) est atteint, ses contacts basculent.',
      notes: 'Présélection dans « Valeur » (ex. 5). Contacts associés : « Contact de compteur » avec le même repère (KC1). En simulation, cliquer sur le compteur le remet à zéro.',
      body: (c, m, st) => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-14, -20, 28, 40) + T(0, 5, 'n', 13) + T(20, -24, st && st.count != null ? String(st.count) + '/' + (c.val || '5') : '', 9, 'start'), fx: coilFx(-14, -20, 28, 40), ref: RI },
    { id: 'contact_compteur', name: 'Contact de compteur (NO)', cat: 'Automatisme', prefix: 'KC', term: [t('13', 0, -40), t('14', 0, 40)], sw: [['13', '14']], contact: true, bbox: [-18, -40, 22, 40],
      desc: 'Contact NO d\'un compteur : il se ferme quand le compteur de même repère atteint sa présélection.', notes: 'Même repère que la bobine du compteur.',
      body: (c, m, st) => pole(0, st && st.closed, false) + T(14, 4, 'n', 10), ref: RI },

    // ---------------- AUTOMATISME ----------------
    { id: 'automate', name: 'Automate programmable (API) 6 E / 4 S', cat: 'Automatisme', prefix: 'A', params: { val: true }, defVal: 'Q1 = (I1 OU Q1) ET NON I2', term: plcTerms(6, 4, 100), loads: [['L', 'N']], plc: { nIn: 6, nOut: 4 },
      sw: [1, 2, 3, 4].map((i) => ['C', 'Q' + i]), bbox: [-100, -60, 100, 60],
      body: plcBody(6, 4, 100, 'API'), fx: plcFx(100),
      desc: 'Automate programmable industriel : alimenté par L-N, il lit ses entrées I1 à I6 (contacts reliés à la phase) et commande ses sorties à relais Q1 à Q4 (contact entre la borne commune C et chaque sortie) selon son programme.',
      notes: 'Le programme s\'écrit dans « Valeur », une équation par sortie, séparées par « ; ». Mots permis : ET, OU, NON, parenthèses, I1…I6, Q1…Q4. Exemple : Q1 = (I1 OU Q1) ET NON I2 ; Q2 = I3. Simulation simplifiée (logique combinatoire et auto-maintien, sans temporisation interne).',
      ref: 'NF EN 61131 (automates programmables) – symbole simplifié' },
    { id: 'relais_logique', name: 'Relais logique programmable 4 E / 2 S', cat: 'Automatisme', prefix: 'A', params: { val: true }, defVal: 'Q1 = I1 OU I2 ; Q2 = I3 ET I4', term: plcTerms(4, 2, 60), loads: [['L', 'N']], plc: { nIn: 4, nOut: 2 },
      sw: [1, 2].map((i) => ['C', 'Q' + i]), bbox: [-60, -60, 60, 60],
      body: plcBody(4, 2, 60, 'RL'), fx: plcFx(60),
      desc: 'Petit relais programmable (type « nano-automate ») : 4 entrées, 2 sorties à relais. Idéal pour les petits automatismes du bâtiment (éclairage, portail, pompe).',
      notes: 'Programme dans « Valeur », comme pour l\'automate : Q1 = I1 OU I2 ; Q2 = I3 ET I4.',
      ref: 'NF EN 61131 – symbole simplifié' },
    { id: 'detecteur_capacitif', name: 'Détecteur de proximité capacitif', cat: 'Industriel – capteurs', prefix: 'B', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-22, -40, 22, 40],
      desc: 'Capteur sans contact qui détecte tous les matériaux (bois, plastique, liquide…), assimilé à un contact NO.', notes: 'Cliquer pour simuler la présence de l\'objet.',
      body: (c, m, st) => L(0, -40, 0, -26) + L(0, 26, 0, 40) + P('M0,-26 L20,0 L0,26 L-20,0 Z') + L(-6, -14, -6, -6) + L(-2, -14, -2, -6) + C(0, 4, 2.5, true) + C(0, 16, 2.5, true) + (st && st.closed ? L(0, 16, 0, 4) : L(0, 16, -8, 6)), ref: RI },
    { id: 'detecteur_photo', name: 'Détecteur photoélectrique (cellule)', cat: 'Industriel – capteurs', prefix: 'B', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-22, -40, 30, 40],
      desc: 'Cellule photoélectrique : détecte le passage d\'un objet qui coupe un faisceau lumineux (portail, convoyeur), assimilée à un contact NO.', notes: 'Cliquer pour simuler la coupure du faisceau.',
      body: (c, m, st) => L(0, -40, 0, -26) + L(0, 26, 0, 40) + P('M0,-26 L20,0 L0,26 L-20,0 Z') + L(14, -16, 26, -24) + L(14, -8, 26, -16) + C(0, -6, 2.5, true) + C(0, 8, 2.5, true) + (st && st.closed ? L(0, 8, 0, -6) : L(0, 8, -8, -2)), ref: RI },
    { id: 'detecteur_mouvement', name: 'Détecteur de mouvement (présence)', cat: 'Commande', prefix: 'B', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-24, -40, 24, 40],
      desc: 'Détecteur infrarouge de présence : ferme son contact quand une personne passe (couloirs, extérieurs, sanitaires).', notes: 'Cliquer pour simuler une présence.',
      body: (c, m, st) => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-14, -20, 28, 40) + P('M-8,-10 a10,10 0 0 1 16,0') + P('M-11,-14 a14,14 0 0 1 22,0') + C(0, 4, 2.2, true) + C(0, 14, 2.2, true) + (st && st.closed ? L(0, 14, 0, 4) : L(0, 14, -7, 6)), ref: RB },

    { id: 'moteur_tri_6', name: 'Moteur triphasé 6 bornes (étoile / triangle)', cat: 'Industriel – récepteurs', prefix: 'M', params: { val: true }, defVal: '5,5 kW',
      term: [t('U1', -20, -40), t('V1', 0, -40), t('W1', 20, -40), t('W2', -20, 40, { opt: true }), t('U2', 0, 40, { opt: true }), t('V2', 20, 40, { opt: true }), t('PE', 40, 40, { pe: true })],
      loads: [['U1', 'V1', 'W1']], bbox: [-30, -40, 48, 40], motor6: true,
      fx: (c, st) => (st.on ? { u: `<circle r="24" fill="#7bd88f" fill-opacity=".35" stroke="none"/><g stroke="currentColor" stroke-width="2" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="0.9s" repeatCount="indefinite"/><line x1="0" y1="-16" x2="0" y2="16"/><line x1="-14" y1="8" x2="14" y2="-8"/><line x1="-14" y1="-8" x2="14" y2="8"/></g>` } : {}),
      desc: 'Moteur asynchrone triphasé dont les 6 bornes sont accessibles (plaque à bornes) : U1, V1, W1 en haut, W2, U2, V2 en bas. Couplage étoile : W2, U2, V2 reliés ensemble ; couplage triangle : U1-W2, V1-U2, W1-V2.',
      notes: 'Indispensable pour le démarrage étoile-triangle. La simulation indique le couplage obtenu (étoile ou triangle) et signale un couplage incomplet.',
      body: (c, m, st) => [-20, 0, 20].map((x) => L(x, -40, x, -20) + L(x, 20, x, 40)).join('') + L(40, 40, 40, 30) + L(40, 30, 20, 14) + C(0, 0, 24) + T(0, -2, 'M', 13) + T(0, 12, '3~', 9) + (st && st.coupling ? T(0, 32, st.coupling, 7) : ''), ref: RI },
    { id: 'poles_contacteur', name: 'Pôles de puissance de contacteur (3 pôles)', cat: 'Industriel – puissance', prefix: 'KM', term: [t('1', -20, -40), t('2', -20, 40), t('3', 0, -40), t('4', 0, 40), t('5', 20, -40), t('6', 20, 40)], sw: [['1', '2'], ['3', '4'], ['5', '6']], contact: true, bbox: [-34, -40, 26, 40],
      desc: 'Les trois contacts de puissance d\'un contacteur, dessinés seuls dans le circuit de puissance. Ils se ferment quand la bobine de même repère (ex. KM1), dessinée dans le circuit de commande, est alimentée.',
      notes: 'Convention du schéma développé : la bobine est dans le circuit de commande, ses pôles dans le circuit de puissance, reliés par le même repère.',
      body: (c, m, st) => [-20, 0, 20].map((x) => pole(x, st && st.closed, false, 9) + P(`M${x - 4},-14 a4,4 0 0 1 8,0`)).join('') + L(-27, 2, 13, 2, DASH), ref: RI },
    { id: 'contact_rt_nf', name: 'Contact NF du relais thermique (95-96)', cat: 'Industriel – commande', prefix: 'F', term: [t('95', 0, -40), t('96', 0, 40)], sw: [['95', '96']], contact: true, owners: ['relais_thermique'], bbox: [-18, -40, 18, 40],
      desc: 'Contact NF du relais thermique, placé en série dans le circuit de commande : il s\'ouvre en cas de surcharge et coupe la bobine du contacteur.', notes: 'Même repère que le relais thermique du circuit de puissance (ex. F1).',
      body: (c, m, st) => nf(0, st && !st.closed) + R(6, -6, 10, 10) + T(11, 3, '', 6), ref: RI },
    { id: 'contact_rt_no', name: 'Contact NO du relais thermique (97-98)', cat: 'Industriel – commande', prefix: 'F', term: [t('97', 0, -40), t('98', 0, 40)], sw: [['97', '98']], contact: true, owners: ['relais_thermique'], bbox: [-18, -40, 18, 40],
      desc: 'Contact NO du relais thermique : il se ferme en cas de surcharge, pour allumer un voyant ou un avertisseur de défaut.', notes: 'Même repère que le relais thermique (ex. F1).',
      body: (c, m, st) => pole(0, st && st.closed, false) + R(6, -6, 10, 10), ref: RI },
    // ---------------- ANNOTATIONS ----------------
    annot('texte', 'Texte', 12, false, { desc: 'Texte libre placé sur la feuille (indication, nom d\'un circuit…).' }),
    annot('titre', 'Titre', 20, true, { under: true, desc: 'Titre de la feuille ou d\'une partie du schéma (gros caractères, souligné).' }),
    annot('commentaire', 'Commentaire', 11, false, { box: true, dash: true, italic: true, desc: 'Commentaire encadré (consigne, remarque de l\'enseignant, point d\'attention).' }),
    annot('repere', 'Repère', 12, true, { desc: 'Repère numéroté dans un cercle (renvoi vers une explication, une étape ou une légende).' }),
  ];
  EE.Library.add(defs);
  ['Distribution', 'Automatisme', 'Annotations'].forEach((c) => { if (!EE.Library.cats.includes(c)) EE.Library.cats.push(c); });

  // ---------- langage de programmation de l'automate (ET / OU / NON) : analyse sûre, sans eval ----------
  function parseProgram(src) {
    const eqs = [], errors = [];
    String(src || '').split(/[;\n]+/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
      const m = /^Q\s*(\d+)\s*[=:]\s*(.+)$/i.exec(line);
      if (!m) { errors.push(`« ${line} » : écrire Qn = expression`); return; }
      try { eqs.push({ out: +m[1], ast: parseExpr(m[2]) }); } catch (e) { errors.push(`Q${m[1]} : ${e.message}`); }
    });
    return { eqs, errors };
  }
  function parseExpr(s) {
    const toks = []; const re = /\s*(\(|\)|[IQ]\s*\d+|ET\b|OU\b|NON\b|AND\b|OR\b|NOT\b|&&?|\|\|?|!|\*|\+|~|[01])/iy; let i = 0;
    s = s.trim();
    while (i < s.length) { re.lastIndex = i; const m = re.exec(s); if (!m || m.index !== i) throw new Error('mot inconnu près de « ' + s.slice(i, i + 6) + ' »'); toks.push(m[1].toUpperCase().replace(/\s+/g, '')); i = re.lastIndex; while (s[i] === ' ') i++; }
    let p = 0;
    const peek = () => toks[p], eat = () => toks[p++];
    const isOr = (x) => ['OU', 'OR', '|', '||', '+'].includes(x), isAnd = (x) => ['ET', 'AND', '&', '&&', '*'].includes(x), isNot = (x) => ['NON', 'NOT', '!', '~'].includes(x);
    function or() { let a = and(); while (isOr(peek())) { eat(); a = { op: 'or', a, b: and() }; } return a; }
    function and() { let a = not(); while (isAnd(peek())) { eat(); a = { op: 'and', a, b: not() }; } return a; }
    function not() { if (isNot(peek())) { eat(); return { op: 'not', a: not() }; } return atom(); }
    function atom() {
      const x = eat(); if (x == null) throw new Error('expression incomplète');
      if (x === '(') { const e = or(); if (eat() !== ')') throw new Error('parenthèse fermante manquante'); return e; }
      if (x === '0' || x === '1') return { op: 'k', v: x === '1' };
      const m = /^([IQ])(\d+)$/.exec(x); if (m) return { op: 'v', k: m[1], n: +m[2] };
      throw new Error('« ' + x + ' » inattendu');
    }
    const e = or(); if (p < toks.length) throw new Error('« ' + toks[p] + ' » en trop'); return e;
  }
  function evalExpr(e, inp, out) {
    switch (e.op) {
      case 'k': return e.v; case 'not': return !evalExpr(e.a, inp, out);
      case 'and': return evalExpr(e.a, inp, out) && evalExpr(e.b, inp, out);
      case 'or': return evalExpr(e.a, inp, out) || evalExpr(e.b, inp, out);
      case 'v': return !!(e.k === 'I' ? inp[e.n - 1] : out[e.n - 1]);
    } return false;
  }
  EE.PLC = { parseProgram, evalExpr };
})(window);
