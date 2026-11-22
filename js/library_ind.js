/* Yak-élec-pro – bibliothèque d'électricité industrielle (puissance, commande, capteurs, récepteurs, convertisseurs) */
(function (g) {
  'use strict';
  const EE = g.EE, D = EE.Draw, { L, C, R, P, T, DASH, t } = D;
  const RI = EE.Draw.REF + ' ; NF EN 60947 (appareillage à basse tension) ; NF EN 60204-1 (équipement électrique des machines)';
  const X3 = [-20, 0, 20];
  const pole = (x, closed, tick, bw = 14) => L(x, -40, x, -12) + L(x, 12, x, 40) + C(x, -12, 2.5, true) + C(x, 12, 2.5, true) + (closed ? L(x, 12, x, -12) : L(x, 12, x - bw, -8) + (tick ? L(x - bw, -8, x - bw - 5, -11) : ''));
  const poles = (closed, tick) => X3.map((x) => pole(x, closed, tick)).join('') + L(-27, 2, 13, 2, DASH);
  const X2 = [-20, 0]; // phase sous la borne L, neutre sous la borne N du « Réseau monophasé 230 V » (mêmes abscisses)
  const T4 = () => [t('1', -20, -40), t('2', -20, 40), t('3', 0, -40), t('4', 0, 40)];
  const E2 = [['1', '2'], ['3', '4']];
  const poles2 = (closed, tick) => X2.map((x) => pole(x, closed, tick, 9)).join('') + L(-27, 2, 7, 2, DASH);
  const T6 = () => [t('1', -20, -40), t('2', -20, 40), t('3', 0, -40), t('4', 0, 40), t('5', 20, -40), t('6', 20, 40)];
  const E3 = [['1', '2'], ['3', '4'], ['5', '6']];
  const cross = (x) => L(x - 5, -34, x + 5, -24) + L(x - 5, -24, x + 5, -34);
  const coilFx = (x, y, w, h) => (c, st) => (st.coil ? { u: `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#7bd88f" fill-opacity=".7" stroke="none"/>` } : {});
  const spin = (r, dir) => `<g stroke="currentColor" stroke-width="2" fill="none"><animateTransform attributeName="transform" type="rotate" from="0 0 0" to="${dir === 'ccw' ? -360 : 360} 0 0" dur="0.9s" repeatCount="indefinite"/><line x1="0" y1="${-r}" x2="0" y2="${r}"/><line x1="${-r * .87}" y1="${r * .5}" x2="${r * .87}" y2="${-r * .5}"/><line x1="${-r * .87}" y1="${-r * .5}" x2="${r * .87}" y2="${r * .5}"/></g>`;
  const VCOL = { rouge: '#ff4d4d', vert: '#34d058', orange: '#ff9f1a', jaune: '#ffe14d', bleu: '#4da3ff', blanc: '#ffffff' };
  const sw1 = (open) => open;

  const defs = [
    // ---------------- PUISSANCE ----------------
    { id: 'sectionneur_tri', name: 'Sectionneur tripolaire', cat: 'Industriel – puissance', prefix: 'Q', term: T6(), sw: E3, bbox: [-34, -40, 20, 40],
      desc: 'Appareil de sectionnement à 3 pôles : isole le départ moteur du réseau pour la maintenance. Il ne coupe pas en charge (manœuvre à vide).',
      notes: 'Placé en tête de départ. En simulation, cliquer sur le sectionneur pour l\'ouvrir ou le fermer.',
      body: (c, m, st) => poles(st && st.closed, true), ref: RI },
    { id: 'sectionneur_fusibles', name: 'Sectionneur porte-fusibles tripolaire', cat: 'Industriel – puissance', prefix: 'Q', term: T6(), sw: E3, bbox: [-34, -40, 20, 40], prot: true,
      desc: 'Sectionneur à 3 pôles équipé de fusibles : sectionne et protège contre les courts-circuits.',
      notes: 'Les fusibles protègent le départ moteur contre les courts-circuits (la protection contre les surcharges est assurée par le relais thermique). En simulation : fond en cas de court-circuit ; clic pour réarmer.',
      body: (c, m, st) => poles(st && st.closed, false) + X3.map((x) => R(x - 4, 18, 8, 16)).join(''), ref: RI },
    { id: 'fusible_tri', name: 'Fusibles tripolaires', cat: 'Industriel – puissance', prefix: 'F', term: T6(), sw: E3, bbox: [-30, -40, 30, 40], prot: true,
      desc: 'Trois fusibles (un par phase) : protection contre les courts-circuits.', notes: 'Indiquer le calibre dans « Valeur » (ex. 16 A gG).',
      body: (c, m, st) => X3.map((x) => (st && st.blown ? L(x, -40, x, -18) + L(x, 18, x, 40) + R(x - 6, -18, 12, 36) + L(x - 4, -4, x + 4, 4) + L(x - 4, 4, x + 4, -4) : L(x, -40, x, 40) + R(x - 6, -18, 12, 36))).join(''), ref: RI },
    { id: 'disjoncteur_tri', name: 'Disjoncteur tripolaire', cat: 'Industriel – puissance', prefix: 'Q', term: T6(), sw: E3, bbox: [-34, -40, 20, 40], prot: true,
      desc: 'Disjoncteur à 3 pôles : coupure en charge et protection contre les surcharges et courts-circuits.', notes: 'En simulation, il déclenche en cas de court-circuit ; clic pour le réarmer.',
      body: (c, m, st) => poles(st && st.closed, true) + X3.map(cross).join(''), ref: RI },
    { id: 'disjoncteur_moteur', name: 'Disjoncteur magnéto-thermique moteur', cat: 'Industriel – puissance', prefix: 'Q', term: T6(), sw: E3, bbox: [-34, -40, 44, 40], prot: true,
      desc: 'Disjoncteur de protection de moteur : déclencheur magnétique (courts-circuits) et thermique (surcharges) en un seul appareil.', notes: 'Remplace l\'ensemble fusibles + relais thermique dans les départs moteurs modernes.',
      body: (c, m, st) => poles(st && st.closed, true) + X3.map(cross).join('') + R(26, -10, 14, 20) + T(33, 5, 'θ', 11), ref: RI },
    { id: 'contacteur_tri', name: 'Contacteur tripolaire', cat: 'Industriel – puissance', prefix: 'KM', term: T6().concat([t('A1', 60, -40), t('A2', 60, 40)]), loads: [['A1', 'A2']], sw: E3, coil: true, bbox: [-34, -40, 74, 40],
      desc: 'Contacteur à 3 pôles de puissance et une bobine (A1-A2) : commande à distance du moteur. Les contacts se ferment quand la bobine est alimentée.',
      notes: 'Le repère (KM1) sert aussi à relier les contacts auxiliaires « KM1 » dessinés ailleurs sur le schéma.',
      body: (c, m, st) => poles(st && st.closed, false).replace(L(-27, 2, 13, 2, DASH), '') + L(-27, 2, 48, 2, DASH) + L(60, -40, 60, -20) + L(60, 20, 60, 40) + R(48, -20, 24, 40) + T(60, 4, 'KM', 10),
      fx: coilFx(48, -20, 24, 40), ref: RI },
    { id: 'relais_thermique', name: 'Relais thermique', cat: 'Industriel – puissance', prefix: 'F', params: { val: true }, term: T6().concat([t('95', 60, -40), t('96', 60, 40), t('97', 80, -40, { opt: true }), t('98', 80, 40, { opt: true })]),
      sw: E3.concat([['95', '96'], ['97', '98']]), bbox: [-30, -40, 90, 40],
      desc: 'Protection contre les surcharges du moteur : 3 éléments bimétalliques en série dans la puissance et un contact auxiliaire NF (95-96) à placer dans le circuit de commande ; contact NO (97-98) pour la signalisation de défaut.',
      notes: 'En simulation, cliquer sur le relais pour simuler une surcharge : le contact 95-96 s\'ouvre et coupe la bobine du contacteur. Cliquer de nouveau pour réarmer. Régler l\'intensité (ex. 6,3 A) dans « Valeur ».',
      body: (c, m, st) => X3.map((x) => L(x, -40, x, -14) + L(x, 14, x, 40) + R(x - 6, -14, 12, 28) + P(`M${x - 3},-8 q6,4 0,8 q-6,4 0,8`)).join('') + L(-20, 28, 60, 28, DASH) +
        (st && st.tripped ? pole(60, false, false) : L(60, -40, 60, 40) + L(52, -12, 68, -12)) + pole(80, !(st && st.tripped), false), ref: RI },
    // ---------------- COMMANDE ----------------
    { id: 'bobine', name: 'Bobine de contacteur / relais', cat: 'Industriel – commande', prefix: 'KM', term: [t('A1', 0, -40), t('A2', 0, 40)], loads: [['A1', 'A2']], coil: true, bbox: [-14, -40, 14, 40],
      desc: 'Bobine d\'un contacteur ou d\'un relais (schéma développé). Ses contacts sont dessinés ailleurs sur le schéma avec le même repère (ex. KM1).',
      notes: 'Convention du schéma développé : circuit de puissance d\'un côté, circuit de commande de l\'autre, le repère relie la bobine à ses contacts.',
      body: () => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-12, -20, 24, 40), fx: coilFx(-12, -20, 24, 40), ref: RI },
    { id: 'bobine_tempo', name: 'Bobine de relais temporisé (travail)', cat: 'Industriel – commande', prefix: 'KT', params: { val: true }, defVal: '3 s', term: [t('A1', 0, -40), t('A2', 0, 40)], loads: [['A1', 'A2']], coil: true, timer: true, bbox: [-14, -40, 14, 40],
      desc: 'Bobine d\'un relais temporisé à l\'enclenchement (retard à l\'excitation). La durée de temporisation se règle dans « Valeur » (ex. 5 s).',
      notes: 'Ses contacts temporisés (67-68 NO, 55-56 NF) portent le même repère (KT1) et changent d\'état après la durée réglée.',
      body: () => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-12, -20, 24, 40) + T(0, 5, 't', 14) + L(-12, -20, 12, 20), fx: coilFx(-12, -20, 24, 40), ref: RI },
    { id: 'contact_no', name: 'Contact auxiliaire NO (13-14)', cat: 'Industriel – commande', prefix: 'KM', term: [t('13', 0, -40), t('14', 0, 40)], sw: [['13', '14']], contact: true, bbox: [-18, -40, 14, 40],
      desc: 'Contact normalement ouvert d\'un contacteur ou relais : il se ferme quand la bobine de même repère est alimentée. Sert notamment à l\'auto-maintien (à mettre en parallèle sur le bouton marche).',
      notes: 'Donner à ce contact le même repère que sa bobine (ex. KM1).', body: (c, m, st) => pole(0, st && st.closed, false), ref: RI },
    { id: 'contact_nf', name: 'Contact auxiliaire NF (21-22)', cat: 'Industriel – commande', prefix: 'KM', term: [t('21', 0, -40), t('22', 0, 40)], sw: [['21', '22']], contact: true, bbox: [-18, -40, 14, 40],
      desc: 'Contact normalement fermé : il s\'ouvre quand la bobine de même repère est alimentée. Sert aux verrouillages (interlock) entre deux contacteurs.',
      notes: 'Repère identique à celui de la bobine.', body: (c, m, st) => (st && !st.closed ? pole(0, false, false) : L(0, -40, 0, 40)) + L(-8, -12, 8, -12), ref: RI },
    { id: 'contact_no_tt', name: 'Contact NO temporisé au travail (67-68)', cat: 'Industriel – commande', prefix: 'KT', term: [t('67', 0, -40), t('68', 0, 40)], sw: [['67', '68']], contact: true, timed: true, bbox: [-22, -40, 14, 40],
      desc: 'Contact NO qui se ferme après la temporisation de la bobine KT de même repère (étoile-triangle, démarrages séquentiels…).', notes: 'Repère identique à la bobine temporisée.',
      body: (c, m, st) => pole(0, st && st.closed, false) + P('M-14,-2 q-6,6 0,12'), ref: RI },
    { id: 'contact_nf_tt', name: 'Contact NF temporisé au travail (55-56)', cat: 'Industriel – commande', prefix: 'KT', term: [t('55', 0, -40), t('56', 0, 40)], sw: [['55', '56']], contact: true, timed: true, bbox: [-22, -40, 14, 40],
      desc: 'Contact NF qui s\'ouvre après la temporisation de la bobine KT de même repère.', notes: 'Repère identique à la bobine temporisée.',
      body: (c, m, st) => (st && !st.closed ? pole(0, false, false) : L(0, -40, 0, 40)) + L(-8, -12, 8, -12) + P('M-14,-2 q-6,6 0,12'), ref: RI },
    { id: 'arret_urgence', name: 'Arrêt d\'urgence (coup de poing)', cat: 'Industriel – commande', prefix: 'S', term: [t('11', 0, -40), t('12', 0, 40)], sw: [['11', '12']], bbox: [-14, -40, 30, 40],
      desc: 'Bouton coup de poing rouge à verrouillage, contact NF : l\'appui coupe le circuit de commande et reste enclenché jusqu\'au déverrouillage.', notes: 'Obligatoire sur les machines (NF EN 60204-1). Cliquer pour enclencher / déverrouiller.',
      body: (c, m, st) => (st && !st.closed ? pole(0, false, false) : L(0, -40, 0, 40)) + L(-8, -12, 8, -12) + L(-7, 2, 12, 2, DASH) + P('M12,-6 A8,8 0 0 1 12,10'), ref: RI },
    { id: 'selecteur_2', name: 'Commutateur à 2 positions (maintenu)', cat: 'Industriel – commande', prefix: 'S', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 26, 40],
      desc: 'Bouton tournant à 2 positions stables (0-1) : contact maintenu dans la position choisie (ex. Manuel / Auto).', notes: 'Cliquer pour changer de position.',
      body: (c, m, st) => pole(0, st && st.closed, true) + L(-7, 2, 12, 2, DASH) + C(16, 2, 4), ref: RI },
    { id: 'selecteur_3', name: 'Commutateur à 3 positions (1-0-2)', cat: 'Industriel – commande', prefix: 'S', term: [t('C', 0, -40), t('A', -20, 40), t('B', 20, 40)], sw: [['C', 'A'], ['C', 'B']], bbox: [-28, -40, 34, 40],
      desc: 'Bouton tournant à 3 positions : 0 au centre (aucun contact fermé), 1 vers A, 2 vers B. Sert au choix de sens ou de mode.', notes: 'Cliquer pour passer de 0 à 1 puis 2 puis 0.',
      body: (c, m, st) => L(0, -40, 0, -12) + C(0, -12, 2.5, true) + C(-20, 12, 2.5, true) + C(20, 12, 2.5, true) + L(-20, 12, -20, 40) + L(20, 12, 20, 40) +
        (st && st.pos === 1 ? L(0, -12, -17, 9) : st && st.pos === 2 ? L(0, -12, 17, 9) : L(0, -12, 0, 6)) + L(-7, -2, 14, -2, DASH) + C(18, -2, 4), ref: RI },
    // ---------------- CAPTEURS ----------------
    { id: 'fdc_no', name: 'Fin de course NO', cat: 'Industriel – capteurs', prefix: 'SQ', term: [t('13', 0, -40), t('14', 0, 40)], sw: [['13', '14']], bbox: [-18, -40, 30, 40],
      desc: 'Contact de position à galet, normalement ouvert : il se ferme quand le mobile atteint la position.', notes: 'En simulation, cliquer pour actionner / relâcher le galet.',
      body: (c, m, st) => pole(0, st && st.closed, false) + L(-7, 2, 12, 2, DASH) + C(16, 2, 4), ref: RI },
    { id: 'fdc_nf', name: 'Fin de course NF', cat: 'Industriel – capteurs', prefix: 'SQ', term: [t('21', 0, -40), t('22', 0, 40)], sw: [['21', '22']], bbox: [-18, -40, 30, 40],
      desc: 'Contact de position à galet, normalement fermé : il s\'ouvre quand le mobile atteint la position (arrêt de fin de course).', notes: 'Cliquer pour actionner / relâcher.',
      body: (c, m, st) => (st && !st.closed ? pole(0, false, false) : L(0, -40, 0, 40)) + L(-8, -12, 8, -12) + L(-7, 2, 12, 2, DASH) + C(16, 2, 4), ref: RI },
    { id: 'detecteur_inductif', name: 'Détecteur de proximité inductif', cat: 'Industriel – capteurs', prefix: 'B', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-22, -40, 22, 40],
      desc: 'Capteur sans contact détectant la présence d\'une pièce métallique (sortie assimilée à un contact NO).', notes: 'Cliquer pour simuler la présence de la pièce.',
      body: (c, m, st) => L(0, -40, 0, -26) + L(0, 26, 0, 40) + P('M0,-26 L20,0 L0,26 L-20,0 Z') + C(0, -8, 2.5, true) + C(0, 8, 2.5, true) + (st && st.closed ? L(0, 8, 0, -8) : L(0, 8, -9, -6)), ref: RI },
    { id: 'pressostat', name: 'Pressostat', cat: 'Industriel – capteurs', prefix: 'SP', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 34, 40],
      desc: 'Contact commandé par la pression (compresseur, pompe), assimilé ici à un contact NO.', notes: 'Cliquer pour simuler le franchissement du seuil.',
      body: (c, m, st) => pole(0, st && st.closed, false) + L(-7, 2, 12, 2, DASH) + R(12, -6, 16, 16) + T(20, 7, 'P', 11), ref: RI },
    { id: 'thermostat', name: 'Thermostat', cat: 'Industriel – capteurs', prefix: 'ST', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-18, -40, 34, 40],
      desc: 'Contact commandé par la température (chauffage, ventilation), assimilé ici à un contact NO.', notes: 'Cliquer pour simuler le franchissement du seuil.',
      body: (c, m, st) => pole(0, st && st.closed, false) + L(-7, 2, 12, 2, DASH) + R(12, -6, 16, 16) + T(20, 7, 'θ', 11), ref: RI },
    // ---------------- RÉCEPTEURS ET CONVERTISSEURS ----------------
    { id: 'voyant', name: 'Voyant lumineux', cat: 'Industriel – récepteurs', prefix: 'H', params: { val: ['rouge', 'vert', 'orange', 'jaune', 'bleu', 'blanc'] }, defVal: 'vert', term: [t('1', 0, -40), t('2', 0, 40)], loads: [['1', '2']], bbox: [-20, -40, 20, 40],
      desc: 'Voyant de signalisation (marche, défaut, présence tension). La couleur se choisit dans les propriétés.', notes: 'Rouge = défaut / arrêt, vert = marche, orange = alarme (NF EN 60204-1).',
      body: () => L(0, -40, 0, -14) + L(0, 14, 0, 40) + C(0, 0, 14) + C(0, 0, 18) + L(-10, -10, 10, 10) + L(-10, 10, 10, -10),
      fx: (c, st) => (st.on ? { u: `<circle r="30" fill="${VCOL[c.val] || '#34d058'}" fill-opacity=".3" stroke="none"/><circle r="14" fill="${VCOL[c.val] || '#34d058'}" stroke="none"/>` } : {}), ref: RI },
    { id: 'avertisseur', name: 'Avertisseur sonore (klaxon)', cat: 'Industriel – récepteurs', prefix: 'HA', term: [t('1', 0, -40), t('2', 0, 40)], loads: [['1', '2']], bbox: [-14, -40, 30, 40],
      desc: 'Avertisseur sonore (klaxon, sirène, sonnerie).', notes: 'En simulation, des ondes sonores animées apparaissent quand il est alimenté.',
      body: () => L(0, -40, 0, -10) + L(0, 10, 0, 40) + P('M-8,-10 L2,-10 L14,-20 L14,20 L2,10 L-8,10 Z'),
      fx: (c, st) => (st.on ? { o: '<g stroke="currentColor" stroke-width="2" fill="none"><path d="M18,-8 q7,8 0,16"><animate attributeName="opacity" values="1;.1;1" dur=".5s" repeatCount="indefinite"/></path><path d="M23,-14 q11,14 0,28"><animate attributeName="opacity" values=".1;1;.1" dur=".5s" repeatCount="indefinite"/></path></g>' } : {}), ref: RI },
    { id: 'electrovanne', name: 'Électrovanne', cat: 'Industriel – récepteurs', prefix: 'YV', term: [t('1', 0, -40), t('2', 0, 40)], loads: [['1', '2']], bbox: [-16, -40, 48, 40],
      desc: 'Vanne à commande électrique (eau, air comprimé) : la bobine ouvre le passage du fluide.', notes: 'En simulation, la vanne devient verte (ouverte) quand la bobine est alimentée.',
      body: () => L(0, -40, 0, -20) + L(0, 20, 0, 40) + R(-12, -20, 24, 40) + R(16, -12, 28, 24) + P('M18,-10 L30,0 L18,10 Z') + P('M42,-10 L30,0 L42,10 Z') + L(12, 0, 16, 0),
      fx: (c, st) => (st.on ? { u: '<rect x="-12" y="-20" width="24" height="40" fill="#7bd88f" fill-opacity=".7" stroke="none"/><path d="M18,-10 L30,0 L18,10 Z M42,-10 L30,0 L42,10 Z" fill="#34d058" stroke="none"/>' } : {}), ref: RI },
    { id: 'resistance_chauff', name: 'Résistance chauffante', cat: 'Industriel – récepteurs', prefix: 'R', params: { val: true }, term: [t('1', 0, -40), t('2', 0, 40)], loads: [['1', '2']], bbox: [-12, -40, 12, 40],
      desc: 'Élément chauffant (four, chauffe-eau, convecteur).', notes: 'En simulation, elle rougit quand elle est alimentée.',
      body: () => L(0, -40, 0, -18) + L(0, 18, 0, 40) + R(-9, -18, 18, 36) + P('M-5,-12 L5,-6 L-5,0 L5,6 L-5,12'),
      fx: (c, st) => (st.on ? { u: '<rect x="-14" y="-22" width="28" height="44" rx="4" fill="#ff6a3d" fill-opacity=".55" stroke="none"/>' } : {}), ref: RI },
    { id: 'moteur_cc', name: 'Moteur à courant continu', cat: 'Industriel – récepteurs', prefix: 'M', term: [t('+', -20, -40), t('-', 20, -40), t('PE', 0, 40, { pe: true })], loads: [['+', '-']], bbox: [-26, -40, 26, 40],
      desc: 'Moteur à courant continu (aimant permanent ou excitation séparée), alimenté par une source continue.', notes: 'Alimenter les bornes + et − avec une source continue.',
      body: () => L(-20, -40, -20, -13) + L(20, -40, 20, -13) + C(0, 0, 24) + T(0, 4, 'M', 14) + T(0, 18, '=', 12) + L(0, 24, 0, 40),
      fx: (c, st) => (st.on ? { u: '<circle r="24" fill="#8fd0ff" fill-opacity=".55" stroke="none"/>', o: spin(14, st.dir) } : {}), ref: RI },
    { id: 'alim_cc', name: 'Source continue (batterie / alimentation)', cat: 'Industriel – récepteurs', prefix: 'G', params: { val: true }, defVal: '24 V', src: { '+': 'DC+', '-': 'DC-' }, term: [t('+', 0, -40), t('-', 0, 40)], bbox: [-16, -40, 16, 40],
      desc: 'Source de tension continue (batterie, alimentation stabilisée 24 V).', notes: 'Fournit les potentiels DC+ et DC− pour les circuits en continu (commande 24 V, moteur CC, LED).',
      body: () => L(0, -40, 0, -8) + L(-14, -8, 14, -8) + L(-7, 0, 7, 0) + L(0, 0, 0, 40) + T(10, -14, '+', 9, 'start') + T(10, 14, '−', 9, 'start'), ref: RI },
    { id: 'variateur', name: 'Variateur de vitesse (fréquence)', cat: 'Industriel – récepteurs', prefix: 'T', params: { val: true }, defVal: '1,5 kW', term: [t('L1', -20, -40), t('L2', 0, -40), t('L3', 20, -40), t('U', -20, 40), t('V', 0, 40), t('W', 20, 40)], loads: [['L1', 'L2', 'L3']],
      srcFn: (c) => ({ U: c.id + '.U', V: c.id + '.V', W: c.id + '.W' }), conv: true, bbox: [-38, -40, 38, 40],
      desc: 'Variateur de fréquence : alimenté en triphasé (L1-L2-L3), il alimente le moteur (U-V-W) en tension et fréquence réglables.', notes: 'Version simplifiée : alimenté, il fournit trois phases au moteur (réglages et consignes non simulés).',
      body: () => X3.map((x) => L(x, -40, x, -26) + L(x, 26, x, 40)).join('') + R(-36, -26, 72, 52) + T(0, -4, 'VFD', 13) + T(0, 14, '3~ ⇒ 3~', 9),
      fx: (c, st) => (st.on ? { u: '<rect x="-36" y="-26" width="72" height="52" fill="#7bd88f" fill-opacity=".45" stroke="none"/>' } : {}), ref: RI },
    { id: 'demarreur_progressif', name: 'Démarreur progressif', cat: 'Industriel – récepteurs', prefix: 'T', params: { val: true }, term: [t('L1', -20, -40), t('L2', 0, -40), t('L3', 20, -40), t('U', -20, 40), t('V', 0, 40), t('W', 20, 40)], loads: [['L1', 'L2', 'L3']],
      srcFn: (c) => ({ U: c.id + '.U', V: c.id + '.V', W: c.id + '.W' }), conv: true, bbox: [-38, -40, 38, 40],
      desc: 'Démarreur progressif (soft-starter) : limite l\'appel de courant et le couple au démarrage du moteur.', notes: 'Version simplifiée : alimenté, il alimente le moteur.',
      body: () => X3.map((x) => L(x, -40, x, -26) + L(x, 26, x, 40)).join('') + R(-36, -26, 72, 52) + T(0, -4, 'SS', 13) + T(0, 14, 'soft-start', 8),
      fx: (c, st) => (st.on ? { u: '<rect x="-36" y="-26" width="72" height="52" fill="#7bd88f" fill-opacity=".45" stroke="none"/>' } : {}), ref: RI },
    { id: 'redresseur', name: 'Pont redresseur', cat: 'Industriel – récepteurs', prefix: 'U', term: [t('~1', -20, -40), t('~2', 20, -40), t('+', -20, 40), t('-', 20, 40)], loads: [['~1', '~2']],
      srcFn: (c) => ({ '+': c.id + '.+', '-': c.id + '.-' }), conv: true, bbox: [-28, -40, 28, 40],
      desc: 'Pont de diodes : transforme le courant alternatif en courant continu (alimentation de commande, frein à courant continu).', notes: 'Entrée alternative ~1/~2, sortie continue + / −.',
      body: () => L(-20, -40, -20, -6) + L(20, -40, 20, -6) + L(-20, 6, -20, 40) + L(20, 6, 20, 40) + P('M0,-26 L26,0 L0,26 L-26,0 Z') + T(0, -9, '~', 13) + T(0, 17, '=', 13),
      fx: (c, st) => (st.on ? { u: '<path d="M0,-26 L26,0 L0,26 L-26,0 Z" fill="#7bd88f" fill-opacity=".55" stroke="none"/>' } : {}), ref: RI },
    // ---------------- COMMANDE DU BÂTIMENT : crépusculaire, télérupteur, minuteur ----------------
    { id: 'crepusculaire', name: 'Interrupteur crépusculaire (cellule jour/nuit)', cat: 'Commande', prefix: 'CR', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-14, -40, 42, 40],
      desc: 'Interrupteur commandé par la lumière du jour : il ferme son contact quand la luminosité baisse (la nuit) et l\'ouvre au lever du jour. Sert à l\'éclairage extérieur automatique.',
      notes: 'En simulation, cliquer dessus = « la nuit tombe » (contact fermé) ; recliquer = « le jour se lève ». Seuil de luminosité réglable sur l\'appareil réel.',
      body: (c, m, st) => pole(0, st && st.closed, true) + L(0, 2, 12, 2, DASH) + C(26, 2, 12) + L(20, -16, 14, -22) + L(14, -22, 14, -17) + L(14, -22, 19, -22) + L(30, -16, 24, -22) + L(24, -22, 24, -17) + L(24, -22, 29, -22) + T(26, 6, 'CR', 9),
      fx: (c, st) => (st.closed ? { u: '<circle cx="26" cy="2" r="10" fill="#27345c" fill-opacity=".75" stroke="none"/>' } : { u: '<circle cx="26" cy="2" r="10" fill="#ffd54a" fill-opacity=".55" stroke="none"/>' }), ref: RI + ' ; NF C 15-100 (éclairage extérieur)' },
    { id: 'telerupteur', name: 'Télérupteur (relais bistable)', cat: 'Commande', prefix: 'TL', term: [t('A1', -20, -40), t('A2', -20, 40), t('1', 20, -40), t('2', 20, 40)], loads: [['A1', 'A2']], sw: [['1', '2']], coil: true, bbox: [-34, -40, 30, 40],
      desc: 'Relais à mémoire : chaque impulsion sur la bobine (bouton-poussoir) change l\'état du contact (allumé → éteint → allumé…). Commande une lampe depuis plusieurs boutons-poussoirs en parallèle.',
      notes: 'Bobine A1-A2 alimentée par des boutons-poussoirs en parallèle (phase/neutre) ; contact 1-2 en série avec la lampe. Donner un repère (ex. TL1). Remplace avantageusement les va-et-vient multiples.',
      body: (c, m, st) => L(-20, -40, -20, -20) + L(-20, 20, -20, 40) + R(-32, -20, 24, 40) + T(-20, 4, 'TL', 10) + L(-32, 12, -8, 12) + L(20, -40, 20, -12) + L(20, 12, 20, 40) + C(20, -12, 2.5, true) + C(20, 12, 2.5, true) + (st && st.closed ? L(20, 12, 20, -12) : L(20, 12, 6, -8)) + L(-8, 0, 12, 0, DASH) + L(-4, -8, 4, -8) + L(-4, -8, -4, -3) + L(4, -8, 4, -13),
      fx: coilFx(-32, -20, 24, 40), ref: RI + ' ; NF C 15-100' },
    { id: 'minuteur', name: 'Minuteur d\'éclairage (minuterie d\'escalier)', cat: 'Commande', prefix: 'KT', params: { val: true }, defVal: '30 s', term: [t('1', 0, -40), t('2', 0, 40)], sw: [['1', '2']], bbox: [-14, -40, 42, 40],
      desc: 'Minuterie : une impulsion ferme le contact pendant une durée réglée (ex. 30 s) puis il s\'ouvre tout seul. Sert aux escaliers, couloirs et caves.',
      notes: 'Indiquer la durée dans « Valeur » (ex. 30 s). En simulation, cliquer dessus = appui sur le bouton-poussoir : la lampe s\'allume pendant la durée puis s\'éteint ; un nouvel appui relance la durée.',
      body: (c, m, st) => pole(0, st && st.closed, true) + L(0, 2, 12, 2, DASH) + C(26, 2, 12) + L(26, 2, 26, -6) + L(26, 2, 32, 5) + T(26, 22, 't', 10),
      fx: (c, st) => (st.closed ? { u: '<circle cx="26" cy="2" r="11" fill="#7bd88f" fill-opacity=".55" stroke="none"/>' } : {}), ref: RI + ' ; NF C 15-100' },
    // ---------------- APPAREILS BIPOLAIRES (phase + neutre) ----------------
    { id: 'sectionneur_bi', name: 'Sectionneur bipolaire (phase + neutre)', cat: 'Protection', prefix: 'Q', term: T4(), sw: E2, bbox: [-34, -40, 12, 40],
      desc: 'Appareil de sectionnement à 2 pôles : isole à la fois la phase et le neutre (installations monophasées 230 V). Il ne coupe pas en charge.',
      notes: 'Pôle de gauche = phase (1-2), pôle de droite = neutre (3-4). En simulation, cliquer pour l\'ouvrir ou le fermer.',
      body: (c, m, st) => poles2(st && st.closed, true), extra: { unifilaire: () => T(0, 52, '2P', 8) }, ref: RI },
    { id: 'sectionneur_fusibles_bi', name: 'Sectionneur porte-fusibles bipolaire', cat: 'Protection', prefix: 'Q', term: T4(), sw: E2, bbox: [-34, -40, 12, 40], prot: true,
      desc: 'Sectionneur à 2 pôles équipé de 2 fusibles (phase et neutre) : sectionne et protège contre les courts-circuits.',
      notes: 'Indiquer le calibre dans « Valeur ». En simulation : fond en cas de court-circuit ; clic pour réarmer.',
      body: (c, m, st) => poles2(st && st.closed, false) + X2.map((x) => R(x - 4, 18, 8, 16)).join(''), params: { val: true }, extra: { unifilaire: () => T(0, 52, '2P', 8) }, ref: RI },
    { id: 'disjoncteur_bi', name: 'Disjoncteur bipolaire (phase + neutre)', cat: 'Protection', prefix: 'Q', term: T4(), sw: E2, bbox: [-34, -40, 12, 40], prot: true, params: { val: true },
      desc: 'Disjoncteur à 2 pôles protégeant la phase et le neutre : coupure en charge, protection contre les surcharges et courts-circuits (ex. 20 A, 32 A).',
      notes: 'Utilisé en tête de tableau monophasé ou pour un circuit spécialisé. Pôle 1-2 = phase, pôle 3-4 = neutre. Il déclenche en simulation en cas de court-circuit ; clic pour réarmer.',
      body: (c, m, st) => poles2(st && st.closed, true) + X2.map(cross).join(''), extra: { unifilaire: () => T(0, 52, '2P', 8) }, ref: RI + ' ; NF C 15-100' },
    { id: 'disjoncteur_diff_bi', name: 'Disjoncteur différentiel bipolaire (phase + neutre)', cat: 'Protection', prefix: 'Q', term: T4(), sw: E2, bbox: [-34, -40, 38, 40], prot: true, params: { val: true },
      desc: 'Disjoncteur 2 pôles avec bloc différentiel : protège phase et neutre contre surcharges et courts-circuits et les personnes contre les courants de fuite (30 mA).',
      notes: 'Indiquer calibre et sensibilité dans « Valeur » (ex. 20 A – 30 mA). Pôle 1-2 = phase, pôle 3-4 = neutre.',
      body: (c, m, st) => poles2(st && st.closed, true) + X2.map(cross).join('') + R(14, -10, 18, 20) + T(23, 4, 'Δ', 11) + L(-27, 8, 14, 8, DASH), extra: { unifilaire: () => T(0, 52, '2P+Δ', 8) }, ref: RI + ' ; NF C 15-100' },
  ];
  // catégories industrielles
  ['Industriel – puissance', 'Industriel – commande', 'Industriel – capteurs', 'Industriel – récepteurs'].forEach((c) => EE.Library.cats.push(c));
  EE.Library.add(defs);
})(window);
