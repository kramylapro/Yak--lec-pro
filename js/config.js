/* Yak-élec-pro – configuration modifiable sans programmation (portail administrateur) */
(function (g) {
  'use strict';
  const EE = g.EE, S = () => EE.Store.raw;
  const KEY = 'eep.config', LOG = 'eep.config.log';

  const cat = (id, c, name, unit, mods, extra) => Object.assign({ id, cat: c, name, unit, price: 0, mods: mods || 0 }, extra || {});
  const catalog = [];
  [['1_5', '1,5'], ['2_5', '2,5'], ['4', '4'], ['6', '6'], ['10', '10'], ['16', '16']].forEach(([k, s]) => catalog.push(cat('cable_' + k, 'Câbles', `Câble U-1000 R2V / fil H07V-U ${s} mm²`, 'm')));
  [16, 20, 25, 32, 40].forEach((d) => catalog.push(cat('gaine_' + d, 'Conduits', `Gaine ICTA Ø${d} mm`, 'm')));
  catalog.push(cat('goulotte', 'Conduits', 'Moulure / goulotte (pose apparente)', 'm'));
  catalog.push(cat('inter_simple', 'Appareillage', 'Interrupteur simple allumage 10 A', 'pce'), cat('inter_va', 'Appareillage', 'Interrupteur va-et-vient 10 A', 'pce'),
    cat('prise_16', 'Appareillage', 'Prise de courant 2P+T 16 A', 'pce'), cat('prise_32', 'Appareillage', 'Prise / sortie de câble 32 A', 'pce'),
    cat('plaque', 'Appareillage', 'Plaque de finition', 'pce'), cat('dcl', 'Appareillage', 'DCL (dispositif de connexion luminaire) + douille', 'pce'),
    cat('boite_enc', 'Boîtes', 'Boîte d\'encastrement Ø67', 'pce'), cat('boite_dcl', 'Boîtes', 'Boîte d\'encastrement pour DCL', 'pce'), cat('boite_deriv', 'Boîtes', 'Boîte de dérivation', 'pce'));
  [6, 10, 16, 20, 25, 32, 40, 50, 63].forEach((a) => catalog.push(cat('disj_' + a, 'Protection', `Disjoncteur DPN 1P+N ${a} A – courbe C – 6 kA`, 'pce', 1)));
  [25, 40, 63].forEach((a) => catalog.push(cat('diff_' + a + '_30', 'Protection', `Interrupteur différentiel ID 2P ${a} A – 30 mA – type AC`, 'pce', 2), cat('diffA_' + a + '_30', 'Protection', `Interrupteur différentiel ID 2P ${a} A – 30 mA – type A`, 'pce', 2)));
  [30, 40, 60, 63].forEach((a) => catalog.push(cat('general_' + a, 'Protection', `Disjoncteur général / de branchement 2P ${a} A`, 'pce', 2)));
  catalog.push(cat('parafoudre', 'Protection', 'Parafoudre 1P+N – type 2', 'pce', 2));
  [[1, 13], [2, 13], [3, 13], [4, 13]].forEach(([r, m]) => catalog.push(cat(`coffret_${r}x${m}`, 'Coffret', `Coffret ${r} rangée${r > 1 ? 's' : ''} × ${m} modules`, 'pce', 0, { rows: r, perRow: m })));
  catalog.push(cat('peigne', 'Coffret', 'Peigne d\'alimentation 1P+N pour DPN (par rangée)', 'pce'), cat('obturateur', 'Coffret', 'Obturateur modulaire (cache-vide) 1 module', 'pce'), cat('bornier_neutre', 'Coffret', 'Barrette de neutre', 'pce'), cat('bornier_terre', 'Coffret', 'Barrette de terre', 'pce'), cat('repere', 'Coffret', 'Repère / étiquette de circuit', 'pce'));
  catalog.push(cat('piquet_terre', 'Terre', 'Piquet de terre cuivre 1,5 m', 'pce'), cat('cable_terre', 'Terre', 'Conducteur de terre', 'm'), cat('collier_terre', 'Terre', 'Collier / cosse de piquet', 'pce'));

  // Photovoltaïque : câbles, connectique, protections (les panneaux, régulateurs, onduleurs et batteries ont leurs propres tableaux : config.pv)
  [4, 6, 10, 16].forEach((s) => catalog.push(cat('cable_pv_' + s, 'Photovoltaïque', `Câble solaire PV ${s} mm² (H1Z2Z2-K)`, 'm')));
  [16, 25, 35, 50, 70, 95].forEach((s) => catalog.push(cat('cable_bat_' + s, 'Photovoltaïque', `Câble batterie souple ${s} mm² (H07V-K)`, 'm')));
  [32, 40, 63, 80, 100, 125, 160, 200, 250, 315, 400].forEach((a) => catalog.push(cat('fuse_bat_' + a, 'Photovoltaïque', `Fusible batterie ${a} A + porte-fusible`, 'pce')));
  catalog.push(cat('pv_mc4', 'Photovoltaïque', 'Paire de connecteurs PV (type MC4)', 'pce'), cat('pv_combiner', 'Photovoltaïque', 'Boîte de jonction DC (mise en parallèle des chaînes)', 'pce'),
    cat('pv_fuse', 'Photovoltaïque', 'Fusible gPV 1 000 V DC + porte-fusible', 'pce'), cat('pv_sect', 'Photovoltaïque', 'Interrupteur-sectionneur DC (côté panneaux)', 'pce'),
    cat('pv_spd', 'Photovoltaïque', 'Parafoudre DC photovoltaïque type 2', 'pce'), cat('pv_structure', 'Photovoltaïque', 'Structure de montage (par panneau)', 'pce'));
  // Correspondance composant du catalogue -> symbole de la bibliothèque (null : pas de symbole dans la bibliothèque)
  const SYM = [[/^cable_terre$/, 'conducteur', 'Conducteur de terre : symbole du conducteur'], [/^cable_/, 'conducteur', 'Symbole du conducteur ; en unifilaire, la section et le nombre de conducteurs s\'indiquent par des traits obliques'],
    [/^inter_simple$/, 'interrupteur', ''], [/^inter_va$/, 'va_et_vient', ''], [/^prise_16$/, 'prise', ''], [/^prise_32$/, 'prise', 'Même symbole que la prise ; le calibre (32 A) s\'écrit à côté'],
    [/^dcl$/, 'lampe', 'Symbole du point lumineux (lampe)'], [/^disj_/, 'disjoncteur', 'Le calibre s\'écrit à côté du symbole'], [/^general_/, 'disjoncteur', 'Disjoncteur général : symbole du disjoncteur, repéré DG'],
    [/^diff(A)?_/, 'differentiel', 'Le calibre, la sensibilité (30 mA) et le type (AC ou A) s\'écrivent à côté'], [/^piquet_terre$/, 'terre', 'Symbole de la terre']];
  // Normes européennes (EN / HD) applicables à chaque famille de composants — indications documentaires
  const NORM = [[/^cable_pv_/, 'EN 50618 (câbles pour systèmes photovoltaïques)'], [/^cable_bat_/, 'HD 21.3 / EN 50525-2-31 (H07V-K)'], [/^fuse_bat_/, 'EN 60269 (fusibles basse tension)'], [/^cable_terre$/, 'HD 21.3 / EN 50525-2-31 (H07V-U) ; couleurs : HD 308 S2 (vert/jaune)'], [/^cable_/, 'H07V-U : HD 21.3 / EN 50525-2-31 ; R2V : NF C 32-321 (national) ; couleurs : HD 308 S2'],
    [/^gaine_/, 'EN 61386-1 et EN 61386-22 (conduits cintrables)'], [/^goulotte$/, 'EN 50085-1 (goulottes)'],
    [/^inter_|^plaque$/, 'EN 60669-1 (interrupteurs pour installations domestiques)'], [/^prise_16$/, 'IEC 60884-1 (prises de courant)'],
    [/^boite_/, 'EN 60670-1 (boîtes et enveloppes pour appareillage)'],
    [/^disj_/, 'EN 60898-1 (disjoncteurs pour installations domestiques) – pouvoir de coupure 6 000 A'], [/^diff(A)?_/, 'EN 61008-1 (interrupteurs différentiels, ID) – type AC ou A selon EN 61008-1'],
    [/^general_/, 'EN 60947-2 ou EN 60898-1 (disjoncteur général)'], [/^parafoudre$/, 'EN 61643-11 (parafoudres basse tension)'],
    [/^pv_mc4$/, 'EN IEC 62852 (connecteurs pour systèmes photovoltaïques)'], [/^pv_fuse$/, 'EN 60269-6 (fusibles pour protection de systèmes photovoltaïques)'], [/^pv_sect$/, 'EN 60947-3 (interrupteurs-sectionneurs, catégorie DC-PV2)'], [/^pv_spd$/, 'EN 50539-11 (parafoudres pour installations photovoltaïques)'], [/^pv_combiner$/, 'IEC 62548 (exigences de conception des champs PV)'],
    [/^coffret_/, 'EN 61439-3 (tableaux de répartition) ; EN 60670-24 (enveloppes) ; IP : EN 60529'],
    [/^bornier_neutre$/, 'EN 60947-7-1 (bornes de raccordement)'], [/^bornier_terre$/, 'EN 60947-7-2 (bornes pour conducteurs de protection)'],
    [/^piquet_terre$/, 'EN 62561-2 (électrodes de terre)'], [/^collier_terre$/, 'EN 62561-1 (éléments de connexion)']];
  const normOf = (id) => { const m = NORM.find(([re]) => re.test(id)); return m ? m[1] : ''; };
  catalog.forEach((c) => { c.norm = normOf(c.id); });
  const CATVER = 3, PVVER = 2;
  const symOf = (id) => { const m = SYM.find(([re]) => re.test(id)); return m ? { sym: m[1], note: m[2] } : { sym: null, note: '' }; };
  catalog.forEach((c) => { const m = symOf(c.id); c.sym = m.sym; });
  const RULES = [
    { k: 'mode', label: 'Mode de pose', type: 'select', opts: [['encastre', 'Encastré (gaines ICTA)'], ['apparent', 'Apparent (moulures)']], help: 'Détermine le type de conduit compté.' },
    { k: 'lightPerCircuit', label: 'Points lumineux maximum par circuit', unit: 'points', help: 'NF C 15-100 : 8 points d\'utilisation par circuit d\'éclairage.' },
    { k: 'lightBreaker', label: 'Calibre du disjoncteur d\'éclairage', unit: 'A' },
    { k: 'lightSection', label: 'Section du circuit d\'éclairage', unit: 'mm²' },
    { k: 'socketsPerCircuit', label: 'Prises maximum par circuit', unit: 'prises', help: '8 prises sur 20 A / 2,5 mm² (5 prises sur 16 A / 1,5 mm²).' },
    { k: 'socketBreaker', label: 'Calibre du disjoncteur des prises', unit: 'A' },
    { k: 'socketSection', label: 'Section du circuit des prises', unit: 'mm²' },
    { k: 'diffRating', label: 'Calibre des interrupteurs différentiels', unit: 'A' },
    { k: 'diffSens', label: 'Sensibilité des différentiels', unit: 'mA' },
    { k: 'diffMaxCircuits', label: 'Circuits maximum protégés par différentiel', unit: 'circuits' },
    { k: 'separateLightDiff', label: 'Séparer l\'éclairage des prises sur des différentiels distincts', type: 'bool' },
    { k: 'mainInCoffret', label: 'Disjoncteur général placé dans le coffret', type: 'bool' },
    { k: 'surge', label: 'Ajouter un parafoudre', type: 'bool' },
    { k: 'diversity', label: 'Coefficient de foisonnement (calibre du disjoncteur général)', unit: '0 à 1', step: 0.05, help: 'Estimation indicative : à confirmer par un calcul de puissance.' },
    { k: 'reservePct', label: 'Réserve de place dans le coffret', unit: '%' },
    { k: 'modulesPerRowFallback', label: 'Modules par rangée (si aucun coffret du catalogue ne convient)', unit: 'modules' },
    { k: 'wastePct', label: 'Chutes et marge sur les câbles et conduits', unit: '%' },
    { k: 'switchHeight', label: 'Hauteur des interrupteurs', unit: 'm', step: 0.05 },
    { k: 'socketHeight', label: 'Hauteur des prises', unit: 'm', step: 0.05 },
    { k: 'earthCable', label: 'Longueur du conducteur de terre', unit: 'm' },
    { k: 'earthSection', label: 'Section du conducteur de terre', unit: 'mm²' },
    { k: 'labourPct', label: 'Main-d\'œuvre (en % du matériel)', unit: '%' },
    { k: 'contingencyPct', label: 'Imprévus (en % du total)', unit: '%' },
  ];
  const DEFAULTS = {
    brand: { name1: 'Yak-élec-', name2: 'pro', slogan: 'Dessin et analyse de schémas électriques', welcome: 'dessinez, vérifiez, simulez et chiffrez vos installations électriques.', about: 'Yak-élec-pro est une application de conception, de simulation et d’apprentissage des schémas électriques, pensée pour les électriciens, les techniciens, les enseignants et les élèves (CAP Électricité du bâtiment).\nOn y dessine des schémas développés, unifilaires, multifilaires et des plans architecturaux avec une bibliothèque de plus de 120 symboles simplifiés d’après la NF EN 60617 ; l’application vérifie les raccordements (courts-circuits, circuits ouverts, bornes libres, terre) et simule le fonctionnement : lampes, moteurs, contacteurs, temporisations, automates, avec les tensions et courants calculés.\nElle calcule aussi le quantitatif et le coffret d’une installation, dimensionne une installation photovoltaïque, propose des calculs électriques (loi d’Ohm, puissances, chute de tension…), 12 exemples de circuits commentés et un mode pédagogique (cours, quiz, exercices corrigés automatiquement).\nElle fonctionne sans Internet, sur ordinateur (Windows) et sur téléphone (Android), et enregistre les comptes et les projets sur l’appareil. Les normes citées et les valeurs par défaut sont indicatives : elles doivent être vérifiées sur les textes en vigueur avant toute installation réelle.\nCe portail permet à l’administrateur de modifier l’application sans programmer : apparence et textes, catalogue et prix, règles de calcul, photovoltaïque, fiches des symboles, sauvegarde et contrôle à distance.', company: 'Yak-Élec – Installation & dépannage électrique', contact: '', owner: { name: '', email: 'kramylapro@gmail.com', phone: '+224 620 409 093' }, color: '#0b3d6b', accent: '#1769d1', logo: null },
    currency: 'GNF',
    rules: { mode: 'encastre', lightPerCircuit: 8, lightBreaker: 10, lightSection: 1.5, socketsPerCircuit: 8, socketBreaker: 20, socketSection: 2.5, diffRating: 40, diffSens: 30, diffMaxCircuits: 8, separateLightDiff: true, mainInCoffret: true, surge: false, diversity: 0.6, reservePct: 20, modulesPerRowFallback: 13, wastePct: 10, switchHeight: 1.1, socketHeight: 0.3, earthCable: 10, earthSection: 16, labourPct: 0, contingencyPct: 0 },
    specials: [
      { id: 'cuisiniere', name: 'Cuisinière / plaque de cuisson', breaker: 32, section: 6, typeA: true },
      { id: 'chauffe_eau', name: 'Chauffe-eau', breaker: 20, section: 2.5, typeA: false },
      { id: 'lave_linge', name: 'Lave-linge', breaker: 20, section: 2.5, typeA: true },
      { id: 'lave_vaisselle', name: 'Lave-vaisselle', breaker: 20, section: 2.5, typeA: false },
      { id: 'four', name: 'Four', breaker: 20, section: 2.5, typeA: false },
      { id: 'climatiseur', name: 'Climatiseur', breaker: 20, section: 2.5, typeA: false },
      { id: 'congelateur', name: 'Congélateur', breaker: 16, section: 1.5, typeA: false },
    ],
    catalog,
    pv: {
      rules: { dodLead: 0.5, effLead: 0.85, dodLi: 0.8, effLi: 0.95, pr: 0.75, invEff: 0.9, invSafety: 1.25, dropDC: 3, dropBat: 1, dropAC: 3, kappa: 56, mpptMargin: 5, chargeFactor: 1.2, iscFactor: 1.25, dcacMax: 1.3, vac: 230, cyclesLead: 1200, cyclesLi: 4000 },
      // Valeurs génériques d'exemple : à remplacer par les fiches techniques du matériel réellement disponible
      panels: [
        { id: 'p250', name: 'Panneau 250 Wc (60 cellules)', price: 0, W: 250, Voc: 37.5, Vmp: 30.5, Isc: 8.9, Imp: 8.2, bVoc: -0.29 },
        { id: 'p400', name: 'Panneau 400 Wc (72 demi-cellules)', price: 0, W: 400, Voc: 49.3, Vmp: 41.0, Isc: 10.4, Imp: 9.8, bVoc: -0.27 },
        { id: 'p550', name: 'Panneau 550 Wc (144 demi-cellules)', price: 0, W: 550, Voc: 49.9, Vmp: 41.8, Isc: 13.9, Imp: 13.2, bVoc: -0.27 },
      ],
      mppt: [
        { id: 'm100_30', name: 'Régulateur MPPT 100 V / 30 A', price: 0, Vpv: 100, Iout: 30, Isc: 35, Vbat: [12, 24] },
        { id: 'm150_45', name: 'Régulateur MPPT 150 V / 45 A', price: 0, Vpv: 150, Iout: 45, Isc: 50, Vbat: [12, 24, 48] },
        { id: 'm250_60', name: 'Régulateur MPPT 250 V / 60 A', price: 0, Vpv: 250, Iout: 60, Isc: 70, Vbat: [24, 48] },
        { id: 'm250_100', name: 'Régulateur MPPT 250 V / 100 A', price: 0, Vpv: 250, Iout: 100, Isc: 70, Vbat: [48] },
      ],
      inverters: [
        { id: 'o1000_12', name: 'Onduleur / chargeur 1 000 W – 12 V', price: 0, Pcont: 1000, Psurge: 2000, Vbat: 12 },
        { id: 'o1500_24', name: 'Onduleur / chargeur 1 500 W – 24 V', price: 0, Pcont: 1500, Psurge: 3000, Vbat: 24 },
        { id: 'o3000_24', name: 'Onduleur / chargeur 3 000 W – 24 V', price: 0, Pcont: 3000, Psurge: 6000, Vbat: 24 },
        { id: 'o3000_48', name: 'Onduleur / chargeur 3 000 W – 48 V', price: 0, Pcont: 3000, Psurge: 6000, Vbat: 48 },
        { id: 'o5000_48', name: 'Onduleur / chargeur 5 000 W – 48 V', price: 0, Pcont: 5000, Psurge: 10000, Vbat: 48 },
        { id: 'o8000_48', name: 'Onduleur / chargeur 8 000 W – 48 V', price: 0, Pcont: 8000, Psurge: 16000, Vbat: 48 },
      ],
      gridInverters: [
        { id: 'g3', name: 'Onduleur réseau monophasé 3 kW', price: 0, Pac: 3000, Vdc: 500, Vmin: 100, Vmax: 450, Iin: 12, nMppt: 1 },
        { id: 'g5', name: 'Onduleur réseau monophasé 5 kW', price: 0, Pac: 5000, Vdc: 600, Vmin: 120, Vmax: 550, Iin: 13, nMppt: 2 },
        { id: 'g8', name: 'Onduleur réseau monophasé 8 kW', price: 0, Pac: 8000, Vdc: 600, Vmin: 120, Vmax: 550, Iin: 16, nMppt: 2 },
        { id: 'g10', name: 'Onduleur réseau 10 kW', price: 0, Pac: 10000, Vdc: 1000, Vmin: 160, Vmax: 800, Iin: 16, nMppt: 2 },
      ],
      // Onduleurs hybrides « tout-en-un » (onduleur + chargeur + régulateur MPPT intégré, gestion batterie lithium)
      hybrids: [
        { id: 'h2_24', name: 'Onduleur hybride 2 kW – 24 V (MPPT intégré)', price: 0, Pcont: 2000, Psurge: 4000, Vbat: 24, Vpv: 145, VmppMin: 30, Isc: 18, nMppt: 1, Ppv: 2000, Ichg: 60 },
        { id: 'h3_24', name: 'Onduleur hybride 3 kW – 24 V (MPPT intégré)', price: 0, Pcont: 3000, Psurge: 6000, Vbat: 24, Vpv: 145, VmppMin: 30, Isc: 18, nMppt: 1, Ppv: 3000, Ichg: 80 },
        { id: 'h3_48', name: 'Onduleur hybride 3 kW – 48 V (MPPT intégré)', price: 0, Pcont: 3000, Psurge: 6000, Vbat: 48, Vpv: 145, VmppMin: 60, Isc: 18, nMppt: 1, Ppv: 3500, Ichg: 60 },
        { id: 'h5_48', name: 'Onduleur hybride 5 kW – 48 V (MPPT intégré, Wi-Fi)', price: 0, Pcont: 5000, Psurge: 10000, Vbat: 48, Vpv: 500, VmppMin: 120, Isc: 22, nMppt: 1, Ppv: 6000, Ichg: 100 },
        { id: 'h6_48', name: 'Onduleur hybride 6 kW – 48 V (2 MPPT, Wi-Fi)', price: 0, Pcont: 6000, Psurge: 12000, Vbat: 48, Vpv: 500, VmppMin: 120, Isc: 27, nMppt: 2, Ppv: 8000, Ichg: 120 },
        { id: 'h8_48', name: 'Onduleur hybride 8 kW – 48 V (2 MPPT, Wi-Fi)', price: 0, Pcont: 8000, Psurge: 16000, Vbat: 48, Vpv: 500, VmppMin: 120, Isc: 27, nMppt: 2, Ppv: 10000, Ichg: 160 },
        { id: 'h10_48', name: 'Onduleur hybride 10 kW – 48 V (2 MPPT, Wi-Fi)', price: 0, Pcont: 10000, Psurge: 20000, Vbat: 48, Vpv: 550, VmppMin: 125, Isc: 27, nMppt: 2, Ppv: 13000, Ichg: 200 },
      ],
      batteries: [
        { id: 'b12_100', name: 'Batterie AGM / gel 12 V 100 Ah', price: 0, tech: 'plomb', Vn: 12, Ah: 100 },
        { id: 'b12_200', name: 'Batterie AGM / gel 12 V 200 Ah', price: 0, tech: 'plomb', Vn: 12, Ah: 200 },
        { id: 'b2_1000', name: 'Élément stationnaire 2 V 1 000 Ah', price: 0, tech: 'plomb', Vn: 2, Ah: 1000 },
        { id: 'l12_100', name: 'Batterie LiFePO4 12,8 V 100 Ah (BMS intégré)', price: 0, tech: 'lithium', Vn: 12, Ah: 100 },
        { id: 'l12_200', name: 'Batterie LiFePO4 12,8 V 200 Ah (BMS intégré, Bluetooth)', price: 0, tech: 'lithium', Vn: 12, Ah: 200 },
        { id: 'l24_100', name: 'Batterie LiFePO4 25,6 V 100 Ah (BMS intégré)', price: 0, tech: 'lithium', Vn: 24, Ah: 100 },
        { id: 'l24_200', name: 'Batterie LiFePO4 25,6 V 200 Ah (BMS intégré)', price: 0, tech: 'lithium', Vn: 24, Ah: 200 },
        { id: 'l48_100', name: 'Batterie lithium LiFePO4 48 V (51,2 V) 100 Ah – 5 kWh, rack ou murale, communication onduleur', price: 0, tech: 'lithium', Vn: 48, Ah: 100 },
        { id: 'l48_200', name: 'Batterie lithium LiFePO4 48 V (51,2 V) 200 Ah – 10 kWh, rack, communication onduleur', price: 0, tech: 'lithium', Vn: 48, Ah: 200 },
      ],
    },
    library: {},
    remote: { url: '', minutes: 15 },
    catVer: CATVER,
    pvVer: PVVER,
  };

  let cache = null;
  const Config = {
    DEFAULTS, RULES, symOf, normOf,
    get() { if (!cache) { const o = S().get(KEY, {}); cache = merge(EE.clone(DEFAULTS), o); cache.catalog.forEach((c) => { if (c.sym === undefined) c.sym = symOf(c.id).sym; if (c.norm === undefined) c.norm = normOf(c.id); });
        if ((o.catVer || 1) < CATVER && o.catalog) {   // mise à jour du catalogue enregistré : noms, normes, modules ; prix, photos et articles ajoutés conservés
          const byId = {}; DEFAULTS.catalog.forEach((d) => (byId[d.id] = d));
          cache.catalog.forEach((c) => { const d = byId[c.id]; if (d) { c.name = d.name; c.mods = d.mods; c.norm = d.norm; if (d.cat) c.cat = d.cat; } });
          DEFAULTS.catalog.forEach((d) => { if (!cache.catalog.some((c) => c.id === d.id)) cache.catalog.push(EE.clone(d)); });
          cache.catVer = CATVER; S().set(KEY, cache);
        }
        if ((o.pvVer || 1) < PVVER && o.pv) {   // nouveaux équipements photovoltaïques (hybrides, batteries lithium) ajoutés sans toucher aux prix saisis
          ['batteries', 'hybrids'].forEach((k) => (DEFAULTS.pv[k] || []).forEach((d) => { cache.pv[k] = cache.pv[k] || []; if (!cache.pv[k].some((x) => x.id === d.id)) cache.pv[k].push(EE.clone(d)); }));
          cache.pvVer = PVVER; S().set(KEY, cache);
        } } return cache; },
    save(c) { cache = c; S().set(KEY, delta(c)); },
    set(mutator, what) { const c = EE.clone(Config.get()); mutator(c); Config.save(c); if (what !== null) Config.log(what || 'Modification'); Config.apply(); },
    reset(part) { const c = EE.clone(Config.get()); if (part) c[part] = EE.clone(DEFAULTS[part]); else Object.keys(DEFAULTS).forEach((k) => (c[k] = EE.clone(DEFAULTS[k]))); Config.save(c); Config.log('Réinitialisation' + (part ? ' : ' + part : ' complète')); Config.apply(); },
    exportJSON() { return JSON.stringify({ format: 'yak-elec-pro-config', version: 1, date: new Date().toISOString(), config: Config.get() }, null, 1); },
    importJSON(text) {
      let o; try { o = JSON.parse(text); } catch (e) { throw new Error('Fichier illisible (JSON invalide).'); }
      if (!o || o.format !== 'yak-elec-pro-config' || !o.config) throw new Error('Ce fichier n\'est pas une configuration Yak-élec-pro.');
      const c = merge(EE.clone(DEFAULTS), o.config); Config.save(c); Config.log('Import d\'une configuration'); Config.apply();
    },
    log(what) { const l = S().get(LOG, []); l.unshift({ t: Date.now(), what }); S().set(LOG, l.slice(0, 40)); },
    logs() { return S().get(LOG, []); },
    // --- administrateur : un seul compte (adresse e-mail), mot de passe vérifié par empreinte (le mot de passe n'est jamais écrit dans le code) ---
    ADMIN_EMAIL: 'kramylapro@gmail.com',
    isAdminName(name) { return String(name || '').trim().toLowerCase() === Config.ADMIN_EMAIL; },
    isAdmin(u) { return !!u && Config.isAdminName(u.name); },
    checkAdminPassword(pwd) {
      const salt = 'yak-admin-v1'; let h = EE.sha256(salt + '|' + Config.ADMIN_EMAIL + '|' + String(pwd || ''));
      for (let i = 0; i < 4000; i++) h = EE.sha256(h + salt);
      return h === '842a0f1ef573c07d81b12e3b04a1f940609b7de7b844fd566ae8a0909c2077e3';
    },
    // --- application de la configuration à l'interface ---
    apply() {
      const c = Config.get(), b = c.brand, r = document.documentElement.style;
      r.setProperty('--brand', b.color); r.setProperty('--accent', b.accent);
      const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = b.color;
      document.title = b.name1 + b.name2;
      if (!EE.LOGO_FULL0) { EE.LOGO_FULL0 = EE.LOGO_FULL; EE.LOGO_ICON0 = EE.LOGO_ICON; }
      EE.LOGO_FULL = b.logo || EE.LOGO_FULL0; EE.LOGO_ICON = b.logo || EE.LOGO_ICON0;
      // fiches de symboles modifiées
      (EE.Library.list || []).forEach((d) => {
        if (!d._orig) d._orig = { desc: d.desc, notes: d.notes, ref: d.ref };
        const o = c.library[d.id] || {}; d.desc = o.desc || d._orig.desc; d.notes = o.notes || d._orig.notes; d.ref = o.ref || d._orig.ref;
      });
    },
    aboutText() { const b = Config.get().brand || {}; return (b.about && b.about.trim()) ? b.about : DEFAULTS.brand.about; },
    money(v) { const c = Config.get().currency; return Math.round(v).toLocaleString('fr-FR').replace(/ /g, ' ') + ' ' + c; },
  };
  function merge(base, o) {
    Object.keys(o || {}).forEach((k) => { if (Array.isArray(o[k]) || typeof o[k] !== 'object' || o[k] === null || typeof base[k] !== 'object' || base[k] === null || Array.isArray(base[k])) base[k] = o[k]; else base[k] = merge(base[k], o[k]); });
    return base;
  }
  function delta(c) { return c; }
  EE.Config = Config;
})(window);
