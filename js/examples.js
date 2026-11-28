/* Yak-élec-pro V1.10 – collection de circuits pédagogiques prêts à l'emploi.
   Chaque exemple : schéma (construit ici sur la grille de 20), liste des composants (déduite du schéma),
   fonctionnement, étapes de réalisation, exercices. Les schémas sont vérifiés et simulés par les tests. */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library;

  // ---------- outils de construction ----------
  function B() {
    const d = { comps: [], wires: [] }; let n = 0;
    const c = (type, x, y, label = '', val, o = {}) => { const k = Lib.newComp(type, x, y); k.id = 'e' + (n++); k.label = label; if (val != null) k.val = val; if (o.rot) k.rot = o.rot; if (o.flip) k.flip = true; d.comps.push(k); return k; };
    const w = (...pts) => { d.wires.push({ id: 'w' + d.wires.length, pts: pts.map((p) => [p[0], p[1]]), n: 1, desig: '' }); };
    const j = (x, y) => c('connexion', x, y);
    const txt = (type, x, y, s) => c(type, x, y, '', s);
    // colonne d'appareils empilés (bornes jointives tous les 80) ; par = appareil en parallèle à droite
    const col = (x, y, items) => { items.forEach((it) => { if (it.par) { c(it.t, x, y + 40, it.l, it.v); c(it.par.t, x + it.par.dx, y + 40, it.par.l, it.par.v); w([x, y], [x + it.par.dx, y]); w([x, y + 80], [x + it.par.dx, y + 80]); } else c(it.t, x, y + 40, it.l, it.v); y += 80; }); return y; };
    const rail = (pts) => { for (let i = 0; i < pts.length - 1; i++) w(pts[i], pts[i + 1]); };
    return { d, c, w, j, txt, col, rail };
  }
  const I = (t, l, v) => ({ t, l, v });
  const PAR = (t, l, v, pt, pl, pv, dx = 80) => ({ t, l, v, par: { t: pt, l: pl, v: pv, dx } });

  // échelle (schéma développé) : phase en haut à gauche, neutre en bas à gauche, branches verticales
  function ladder(b, X0, Ytop, Ybot, branches, opt = {}) {
    if (!opt.noPhase) b.c('phase', X0, Ytop, '', 'L1');
    if (!opt.noNeutral) b.c('neutre', X0, Ybot);
    const xs = branches.map((br) => br.x);
    b.rail([[opt.topFrom || X0, Ytop]].concat(xs.map((x) => [x, Ytop])));
    b.rail([[opt.botFrom || X0, Ybot]].concat(xs.map((x) => [x, Ybot])));
    branches.forEach((br) => { const y = b.col(br.x, Ytop, br.items); if (y < Ybot) b.w([br.x, y], [br.x, Ybot]); });
  }
  // départ moteur : réseau triphasé + appareils de puissance empilés ; renvoie la position des sorties
  function powerStack(b, items) {
    b.c('reseau_tri', 100, 60, 'G1', '400 V');
    [60, 80, 100].forEach((x) => b.w([x, 100], [x, 140]));
    let y = 140; items.forEach((it) => { b.c(it.t, 80, y + 40, it.l, it.v); y += 80; });
    return y;
  }

  const EX = [];
  const add = (o) => EX.push(o);

  // 1. simple allumage
  add({ id: 'simple_allumage', title: 'Circuit simple allumage', level: 'Débutant', schema: 'developpe', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -10, 'Simple allumage'); ladder(b, 60, 80, 420, [{ x: 140, items: [I('disjoncteur', 'Q1', '10 A'), I('interrupteur', 'S1'), I('lampe', 'H1', '60 W')] }]); return b.d; },
    how: ['Le disjoncteur Q1 protège le circuit d\'éclairage contre les surintensités (10 A, conducteurs 1,5 mm²).', 'L\'interrupteur S1 coupe la phase : fermé, il laisse passer le courant vers la lampe H1.', 'Le retour de la lampe se fait par le neutre, qui n\'est jamais coupé par l\'interrupteur.'],
    steps: ['Placer la phase (L1) et le neutre (N).', 'Placer le disjoncteur Q1, l\'interrupteur S1 et la lampe H1 en colonne.', 'Relier la phase au disjoncteur, puis à l\'interrupteur et à la lampe.', 'Relier l\'autre borne de la lampe au neutre.', 'Vérifier, puis simuler : cliquer sur S1 pour allumer et éteindre.'],
    exercises: ['Pourquoi l\'interrupteur doit-il couper la phase et non le neutre ?', 'Ajoutez une deuxième lampe H2 commandée en même temps que H1 (en parallèle).', 'Quel courant traverse une lampe de 60 W sous 230 V ? (I = P / U)'],
    sim: [['press', 'S1'], ['on', 'H1', true], ['press', 'S1'], ['on', 'H1', false]] });

  // 2. double allumage
  add({ id: 'double_allumage', title: 'Circuit double allumage', level: 'Débutant', schema: 'developpe', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -10, 'Double allumage'); b.c('phase', 60, 80, '', 'L1'); b.w([60, 80], [160, 80]); b.c('disjoncteur', 160, 120, 'Q1', '10 A'); b.c('interrupteur_double', 160, 200, 'S1');
      b.c('lampe', 120, 320, 'H1', '60 W'); b.c('lampe', 200, 320, 'H2', '60 W'); b.w([140, 240], [140, 260], [120, 260], [120, 280]); b.w([180, 240], [180, 260], [200, 260], [200, 280]);
      b.c('neutre', 60, 440); b.rail([[60, 440], [120, 440], [200, 440]]); b.w([120, 360], [120, 440]); b.w([200, 360], [200, 440]); return b.d; },
    how: ['L\'interrupteur double S1 réunit deux interrupteurs dans un même boîtier, alimentés par une phase commune (borne C).', 'La touche gauche commande la lampe H1, la touche droite la lampe H2 : on allume l\'une, l\'autre ou les deux.', 'Les deux lampes reviennent sur le même neutre.'],
    steps: ['Placer la phase, le disjoncteur Q1 et l\'interrupteur double S1.', 'Placer les deux lampes sous les sorties 1 et 2 de S1.', 'Relier la sortie 1 à H1 et la sortie 2 à H2.', 'Relier les deux lampes au neutre.', 'Simuler : cliquer à gauche ou à droite de S1.'],
    exercises: ['Combien de conducteurs faut-il entre l\'interrupteur double et le plafond ?', 'Remplacez H2 par deux lampes en parallèle et vérifiez le schéma.', 'Citez une pièce où le double allumage est utile.'],
    sim: [['press', 'S1', -10], ['on', 'H1', true], ['on', 'H2', false], ['press', 'S1', 10], ['on', 'H2', true]] });

  // 3. va-et-vient
  add({ id: 'va_et_vient', title: 'Circuit va-et-vient', level: 'Débutant', schema: 'developpe', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -10, 'Va-et-vient'); b.c('phase', 60, 80, '', 'L1'); b.w([60, 80], [160, 80]); b.c('disjoncteur', 160, 120, 'Q1', '10 A'); b.c('va_et_vient', 160, 200, 'S1'); b.c('va_et_vient', 160, 360, 'S2', '', { rot: 180 });
      b.w([140, 240], [140, 320]); b.w([180, 240], [180, 320]); b.c('lampe', 160, 440, 'H1', '60 W'); b.c('neutre', 60, 560); b.w([60, 560], [160, 560]); b.w([160, 480], [160, 560]);
      b.txt('texte', 200, 290, 'navettes'); return b.d; },
    how: ['Deux va-et-vient S1 et S2 commandent la même lampe depuis deux endroits (couloir, chambre, escalier).', 'Les deux conducteurs qui relient S1 et S2 s\'appellent les navettes.', 'Chaque manœuvre de S1 ou de S2 change l\'état de la lampe.'],
    steps: ['Placer la phase, Q1 et le premier va-et-vient S1 (commun en haut).', 'Placer S2 retourné (commun en bas) sous S1.', 'Relier les navettes L1 et L2 entre S1 et S2.', 'Relier le commun de S2 à la lampe, puis la lampe au neutre.', 'Simuler en cliquant alternativement sur S1 et S2.'],
    exercises: ['Que se passe-t-il si l\'on inverse les deux navettes ?', 'Combien de va-et-vient faut-il pour trois points de commande ? (indice : permutateur ou télérupteur)', 'Tracez le schéma multifilaire de ce circuit.'],
    sim: [['on', 'H1', false], ['press', 'S1'], ['on', 'H1', true], ['press', 'S2'], ['on', 'H1', false], ['press', 'S1'], ['on', 'H1', true]] });

  // 4. télérupteur
  add({ id: 'telerupteur', title: 'Circuit télérupteur', level: 'Intermédiaire', schema: 'developpe', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -10, 'Télérupteur'); b.c('phase', 60, 80, '', 'L1'); b.w([60, 80], [80, 80]); b.c('disjoncteur', 120, 80, 'Q1', '10 A', { rot: 90 });
      b.rail([[160, 80], [220, 80], [300, 80], [340, 80]]); b.c('bp_no', 220, 120, 'S1'); b.c('bp_no', 300, 120, 'S2'); b.c('telerupteur', 320, 240, 'TL1');
      b.w([300, 160], [300, 200]); b.w([220, 160], [220, 180], [300, 180]); b.j(300, 180); b.w([340, 80], [340, 200]); b.c('lampe', 340, 360, 'H1', '60 W'); b.w([340, 280], [340, 320]);
      b.c('neutre', 60, 480); b.rail([[60, 480], [300, 480], [340, 480]]); b.w([300, 280], [300, 480]); b.w([340, 400], [340, 480]); return b.d; },
    how: ['Les boutons-poussoirs S1 et S2, en parallèle, envoient une impulsion à la bobine du télérupteur TL1.', 'Le télérupteur est un relais à mémoire : chaque impulsion change l\'état de son contact 1-2.', 'Le contact 1-2 allume ou éteint la lampe H1. On peut ajouter autant de boutons que l\'on veut, en parallèle.'],
    steps: ['Placer la phase et le disjoncteur Q1.', 'Placer les boutons-poussoirs S1 et S2 en parallèle.', 'Relier les boutons à la bobine A1-A2 du télérupteur, puis A2 au neutre.', 'Alimenter le contact 1-2 par la phase et le relier à la lampe.', 'Simuler : chaque appui sur S1 ou S2 change l\'état de la lampe.'],
    exercises: ['Pourquoi utilise-t-on un télérupteur plutôt que des va-et-vient dans un long couloir ?', 'Ajoutez un troisième bouton-poussoir S3.', 'Que se passe-t-il si un bouton-poussoir reste bloqué enfoncé ?'],
    sim: [['press', 'S1', 0, true], ['on', 'H1', true], ['press', 'S2', 0, true], ['on', 'H1', false]] });

  // 5. prises de courant
  add({ id: 'prise', title: 'Circuit prises de courant', level: 'Débutant', schema: 'developpe', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -10, 'Circuit prises de courant 16 A'); b.c('phase', 60, 80, '', 'L1'); b.w([60, 80], [80, 80]); b.c('differentiel', 120, 80, 'ID1', '40 A 30 mA', { rot: 90 }); b.c('disjoncteur', 200, 80, 'Q1', '16 A', { rot: 90 });
      b.rail([[240, 80], [320, 80], [440, 80]]); b.w([320, 80], [320, 160]); b.w([440, 80], [440, 160]); b.c('prise', 340, 200, 'X1', '16 A'); b.c('prise', 460, 200, 'X2', '16 A');
      b.c('neutre', 560, 120); b.rail([[560, 120], [480, 120], [360, 120]]); b.w([480, 120], [480, 160]); b.w([360, 120], [360, 160]);
      b.w([340, 240], [340, 280], [400, 280]); b.w([460, 240], [460, 280], [400, 280]); b.c('terre', 400, 320); b.w([400, 280], [400, 320]); return b.d; },
    how: ['L\'interrupteur différentiel ID1 (30 mA) protège les personnes contre les contacts indirects.', 'Le disjoncteur Q1 (16 A, câble 2,5 mm²) protège le circuit des prises contre les surintensités.', 'Les prises sont branchées en parallèle : phase à gauche, neutre à droite, terre au centre. La terre est obligatoire.'],
    steps: ['Placer la phase, le différentiel ID1 puis le disjoncteur Q1.', 'Placer les prises X1 et X2 et les relier à la phase et au neutre.', 'Relier les bornes de terre des prises à la terre.', 'Vérifier : aucune borne de terre ne doit rester libre.', 'Simuler : les prises sont alimentées ; déclenchez Q1 pour les couper.'],
    exercises: ['Combien de prises au maximum sur un circuit 16 A en 2,5 mm² ? (à vérifier dans la NF C 15-100)', 'Pourquoi la terre est-elle indispensable sur une prise ?', 'Ajoutez une troisième prise X3.'],
    sim: [['on', 'X1', true], ['press', 'Q1'], ['on', 'X1', false]] });

  // 6. démarrage direct d'un moteur triphasé
  add({ id: 'demarrage_direct', title: 'Démarrage direct d\'un moteur triphasé', level: 'Intermédiaire', schema: 'multifilaire', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -40, 'Démarrage direct – puissance et commande');
      const y = powerStack(b, [I('disjoncteur_moteur', 'Q1', '6 A'), I('poles_contacteur', 'KM1')]);
      b.c('moteur_tri', 80, y + 80, 'M1', '2,2 kW'); [60, 80, 100].forEach((x) => b.w([x, y], [x, y + 40]));
      b.w([140, 100], [140, 140], [200, 140], [200, y + 140], [80, y + 140], [80, y + 120]);
      b.w([120, 100], [120, 120], [260, 120], [260, 560]);
      b.c('phase', 300, 160, '', 'L1');
      ladder(b, 300, 160, 560, [{ x: 380, items: [I('fusible', 'F2', '2 A'), I('bp_nf', 'S0'), PAR('bp_no', 'S1', '', 'contact_no', 'KM1', ''), I('bobine', 'KM1', '230 V')] }, { x: 540, items: [I('contact_no', 'KM1'), I('voyant', 'H1', 'vert')] }], { noPhase: true, noNeutral: true, botFrom: 260 });
      b.txt('texte', 300, 600, 'Circuit de commande'); b.txt('texte', 20, y + 180, 'Circuit de puissance'); return b.d; },
    how: ['Circuit de puissance : le disjoncteur-moteur Q1 protège contre les courts-circuits et les surcharges ; les pôles du contacteur KM1 alimentent le moteur M1.', 'Circuit de commande : un appui sur S1 (marche) alimente la bobine KM1 ; le contact KM1 en parallèle sur S1 assure l\'auto-maintien.', 'Un appui sur S0 (arrêt, contact NF) coupe la bobine : le moteur s\'arrête. Le voyant vert H1 signale la marche.'],
    steps: ['Dessiner le circuit de puissance : réseau L1-L2-L3, Q1, pôles de KM1, moteur M1 relié à la terre.', 'Dessiner le circuit de commande entre phase et neutre : F2, S0, S1, bobine KM1.', 'Ajouter le contact KM1 en parallèle sur S1 (auto-maintien).', 'Ajouter le voyant de marche commandé par un contact KM1.', 'Simuler : marche, maintien, arrêt.'],
    exercises: ['Que se passe-t-il si l\'on supprime le contact d\'auto-maintien ?', 'Pourquoi le bouton d\'arrêt est-il un contact NF ?', 'Calculez le courant d\'un moteur de 2,2 kW sous 400 V (cos φ 0,85 ; η 0,9) dans l\'onglet Calculs.'],
    sim: [['on', 'M1', false], ['press', 'S1', 0, true], ['on', 'M1', true], ['on', 'H1', true], ['press', 'S0', 0, true], ['on', 'M1', false]] });

  // 7. inversion du sens de rotation
  add({ id: 'inversion_sens', title: 'Démarrage moteur avec inversion de sens', level: 'Avancé', schema: 'multifilaire', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -40, 'Inversion du sens de rotation');
      b.c('reseau_tri', 100, 60, 'G1', '400 V'); [60, 80, 100].forEach((x) => b.w([x, 100], [x, 140])); b.c('disjoncteur_moteur', 80, 180, 'Q1', '6 A');
      b.c('poles_contacteur', 80, 340, 'KM1'); b.c('poles_contacteur', 240, 340, 'KM2');
      [60, 80, 100].forEach((x) => b.w([x, 220], [x, 300])); b.j(60, 240); b.j(80, 260); b.j(100, 280);
      b.w([60, 240], [220, 240], [220, 300]); b.w([80, 260], [240, 260], [240, 300]); b.w([100, 280], [260, 280], [260, 300]);
      b.c('moteur_tri', 80, 500, 'M1', '1,5 kW'); [60, 80, 100].forEach((x) => b.w([x, 380], [x, 460]));
      b.j(100, 440); b.j(80, 420); b.j(60, 400); b.w([220, 380], [220, 440], [100, 440]); b.w([240, 380], [240, 420], [80, 420]); b.w([260, 380], [260, 400], [60, 400]);
      b.w([140, 100], [140, 140], [300, 140], [300, 560], [80, 560], [80, 540]); b.w([120, 100], [120, 120], [340, 120], [340, 640]);
      b.c('phase', 380, 160, '', 'L1'); b.w([380, 160], [460, 160]);
      let y = b.col(460, 160, [I('fusible', 'F2', '2 A'), I('bp_nf', 'S0')]);
      b.col(460, y, [PAR('bp_no', 'S1', '', 'contact_no', 'KM1', ''), I('contact_nf', 'KM2'), I('bobine', 'KM1', '230 V')]);
      b.w([540, y], [620, y]); b.col(620, y, [PAR('bp_no', 'S2', '', 'contact_no', 'KM2', ''), I('contact_nf', 'KM1'), I('bobine', 'KM2', '230 V')]);
      b.w([460, 560], [460, 640]); b.w([620, 560], [620, 640]); b.rail([[340, 640], [460, 640], [620, 640]]);
      b.txt('texte', 470, 690, 'S1 : sens 1 (KM1) – S2 : sens 2 (KM2)'); return b.d; },
    how: ['KM1 alimente le moteur dans l\'ordre L1-L2-L3 ; KM2 inverse deux phases (L1 et L3) : le moteur tourne dans l\'autre sens.', 'Le contact NF KM2 dans la branche de KM1 (et NF KM1 dans celle de KM2) est le verrouillage électrique : les deux contacteurs ne peuvent jamais être fermés ensemble (court-circuit).', 'S0 arrête le moteur ; il faut passer par l\'arrêt avant de changer de sens.'],
    steps: ['Dessiner le réseau, Q1 et les deux contacteurs KM1 et KM2.', 'Croiser deux phases à la sortie de KM2.', 'Dessiner la commande : F2, S0 commun, puis une branche par sens.', 'Ajouter l\'auto-maintien de chaque contacteur et les verrouillages NF croisés.', 'Simuler : sens 1, arrêt, sens 2 ; observer le sens indiqué dans le panneau.'],
    exercises: ['Que se passerait-il sans les contacts de verrouillage ?', 'Ajoutez deux voyants (un par sens).', 'Modifiez le schéma pour pouvoir passer d\'un sens à l\'autre sans appuyer sur S0 (verrouillage par les boutons).'],
    sim: [['press', 'S1', 0, true], ['on', 'M1', true], ['dir', 'M1', 'cw'], ['press', 'S0', 0, true], ['on', 'M1', false], ['press', 'S2', 0, true], ['dir', 'M1', 'ccw']] });

  // 8. étoile-triangle
  add({ id: 'etoile_triangle', title: 'Démarrage étoile-triangle', level: 'Avancé', schema: 'multifilaire', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -40, 'Démarrage étoile-triangle');
      b.c('reseau_tri', 100, 60, 'G1', '400 V'); [60, 80, 100].forEach((x) => b.w([x, 100], [x, 140])); b.c('disjoncteur_moteur', 80, 180, 'Q1', '16 A'); b.c('poles_contacteur', 80, 300, 'KM1'); [60, 80, 100].forEach((x) => b.w([x, 220], [x, 260]));
      b.c('moteur_tri_6', 80, 460, 'M1', '7,5 kW'); [60, 80, 100].forEach((x) => b.w([x, 340], [x, 420]));
      b.j(60, 360); b.j(80, 380); b.j(100, 400);
      b.c('poles_contacteur', 240, 540, 'KM3', '', { rot: 90 });
      b.w([60, 360], [320, 360], [320, 520], [280, 520]); b.w([80, 380], [340, 380], [340, 540], [280, 540]); b.w([100, 400], [360, 400], [360, 560], [280, 560]);
      b.c('poles_contacteur', 80, 620, 'KM2'); [60, 80, 100].forEach((x) => b.w([x, 500], [x, 580])); b.j(60, 520); b.j(80, 540); b.j(100, 560);
      b.w([200, 520], [60, 520]); b.w([200, 540], [80, 540]); b.w([200, 560], [100, 560]); b.rail([[60, 660], [80, 660], [100, 660]]);
      b.w([140, 100], [140, 140], [400, 140], [400, 700], [120, 700], [120, 500]); b.w([120, 100], [120, 120], [420, 120], [420, 640]);
      b.c('phase', 460, 160, '', 'L1'); b.w([460, 160], [540, 160]);
      const y = b.col(540, 160, [I('fusible', 'F2', '2 A'), I('bp_nf', 'S0'), PAR('bp_no', 'S1', '', 'contact_no', 'KM1', '')]);
      b.col(540, y, [I('bobine', 'KM1', '230 V')]); b.w([540, y + 80], [540, 640]);
      b.w([620, y], [700, y]); b.w([700, y], [780, y]); b.w([780, y], [860, y]);
      b.col(700, y, [I('bobine_tempo', 'KT1', '5 s')]); b.w([700, y + 80], [700, 640]);
      b.col(780, y, [I('contact_nf_tt', 'KT1'), I('contact_nf', 'KM3'), I('bobine', 'KM2', '230 V')]);
      b.col(860, y, [I('contact_no_tt', 'KT1'), I('contact_nf', 'KM2'), I('bobine', 'KM3', '230 V')]);
      b.rail([[420, 640], [540, 640], [700, 640], [780, 640], [860, 640]]);
      b.txt('texte', 150, 740, 'KM1 ligne · KM2 étoile · KM3 triangle · KT1 durée du démarrage'); return b.d; },
    how: ['Au démarrage, KM1 (ligne) et KM2 (étoile) sont fermés : chaque enroulement reçoit 230 V au lieu de 400 V, ce qui divise par 3 le courant de démarrage.', 'Le relais temporisé KT1 compte la durée réglée (5 s) ; à la fin, son contact NF 55-56 coupe KM2 et son contact NO 67-68 ferme KM3 (triangle).', 'Les contacts NF KM2 et KM3 croisés empêchent l\'étoile et le triangle d\'être fermés ensemble (court-circuit).'],
    steps: ['Dessiner la puissance : réseau, Q1, KM1, moteur 6 bornes.', 'Ajouter KM2 qui relie W2-U2-V2 ensemble (point étoile).', 'Ajouter KM3 qui relie W2, U2, V2 aux phases L1, L2, L3 (couplage triangle).', 'Dessiner la commande : marche/arrêt de KM1 avec auto-maintien, bobine temporisée KT1, branches KM2 et KM3 verrouillées.', 'Simuler : appuyer sur S1, observer « étoile » puis « triangle » après 5 s.'],
    exercises: ['Pourquoi le démarrage étoile-triangle réduit-il le courant de démarrage ?', 'Quelle doit être la tension nominale du moteur (plaque) pour ce démarrage sur un réseau 400 V ?', 'Réglez KT1 sur 8 s et vérifiez la durée en simulation.'],
    sim: [['press', 'S1', 0, true], ['coupling', 'M1', 'étoile'], ['wait', 6], ['coupling', 'M1', 'triangle'], ['press', 'S0', 0, true], ['on', 'M1', false]] });

  // 9. marche-arrêt avec auto-maintien
  add({ id: 'auto_maintien', title: 'Commande marche-arrêt avec auto-maintien', level: 'Débutant', schema: 'developpe', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -10, 'Marche-arrêt avec auto-maintien');
      ladder(b, 60, 80, 480, [{ x: 140, items: [I('fusible', 'F1', '2 A'), I('bp_nf', 'S0'), PAR('bp_no', 'S1', '', 'contact_no', 'KM1', ''), I('bobine', 'KM1', '230 V')] }, { x: 300, items: [I('contact_no', 'KM1'), I('voyant', 'H1', 'vert')] }]); return b.d; },
    how: ['Un appui bref sur S1 (marche) alimente la bobine KM1.', 'Le contact KM1, placé en parallèle sur S1, se ferme : il « maintient » la bobine alimentée quand on relâche S1. C\'est l\'auto-maintien (mémoire).', 'Un appui sur S0 (arrêt, NF) coupe le circuit : la bobine retombe et le contact d\'auto-maintien s\'ouvre. Le voyant H1 suit l\'état de KM1.'],
    steps: ['Placer phase, fusible F1, S0 (NF) et S1 (NO) en série.', 'Placer la bobine KM1 sous S1, puis la relier au neutre.', 'Ajouter un contact NO KM1 en parallèle sur S1.', 'Ajouter une branche : contact NO KM1 + voyant H1.', 'Simuler : marche (relâcher), puis arrêt.'],
    exercises: ['Expliquez avec vos mots le rôle de l\'auto-maintien.', 'Que se passe-t-il en cas de coupure de courant puis de retour de tension ? Est-ce sûr ?', 'Ajoutez un voyant rouge H2 allumé quand KM1 est au repos (contact NF).'],
    sim: [['press', 'S1', 0, true], ['coil', 'KM1', true], ['on', 'H1', true], ['press', 'S0', 0, true], ['coil', 'KM1', false]] });

  // 10. relais thermique
  add({ id: 'relais_thermique', title: 'Circuit avec relais thermique', level: 'Intermédiaire', schema: 'multifilaire', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -40, 'Protection par relais thermique');
      const y = powerStack(b, [I('sectionneur_fusibles', 'Q1', '10 A aM'), I('poles_contacteur', 'KM1'), I('relais_thermique', 'F1', '4 – 6 A')]);
      b.c('moteur_tri', 80, y + 80, 'M1', '2,2 kW'); [60, 80, 100].forEach((x) => b.w([x, y], [x, y + 40]));
      b.w([140, 100], [140, 140], [200, 140], [200, y + 140], [80, y + 140], [80, y + 120]); b.w([120, 100], [120, 120], [260, 120], [260, 640]);
      b.c('phase', 300, 160, '', 'L1');
      ladder(b, 300, 160, 640, [{ x: 380, items: [I('fusible', 'F2', '2 A'), I('contact_rt_nf', 'F1'), I('bp_nf', 'S0'), PAR('bp_no', 'S1', '', 'contact_no', 'KM1', ''), I('bobine', 'KM1', '230 V')] },
        { x: 540, items: [I('contact_no', 'KM1'), I('voyant', 'H1', 'vert')] }, { x: 620, items: [I('contact_rt_no', 'F1'), I('voyant', 'H2', 'rouge')] }], { noPhase: true, noNeutral: true, botFrom: 260 }); return b.d; },
    how: ['Le relais thermique F1 surveille le courant absorbé par le moteur : en cas de surcharge prolongée, il déclenche.', 'Son contact NF 95-96, en série avec la bobine KM1, coupe le contacteur : le moteur s\'arrête.', 'Son contact NO 97-98 allume le voyant rouge H2 (défaut). Après refroidissement, on réarme le relais.'],
    steps: ['Dessiner la puissance : réseau, sectionneur porte-fusibles Q1, KM1, relais thermique F1, moteur.', 'Dessiner la commande : F2, contact 95-96 de F1, S0, S1 avec auto-maintien, bobine KM1.', 'Ajouter le voyant vert de marche (contact KM1) et le voyant rouge de défaut (contact 97-98).', 'Régler F1 sur le courant nominal du moteur (plaque signalétique).', 'Simuler : marche, puis cliquer sur F1 pour simuler une surcharge.'],
    exercises: ['Sur quelle valeur règle-t-on un relais thermique ?', 'Quelle est la différence entre la protection par fusibles aM et par relais thermique ?', 'Pourquoi le moteur ne redémarre-t-il pas tout seul après le réarmement ?'],
    sim: [['press', 'S1', 0, true], ['on', 'M1', true], ['press', 'F1'], ['on', 'M1', false], ['on', 'H2', true]] });

  // 11. arrêt d'urgence
  add({ id: 'arret_urgence', title: 'Circuit de commande avec arrêt d\'urgence', level: 'Intermédiaire', schema: 'developpe', theme: 'Industriel',
    build() { const b = B(); b.txt('titre', 40, -10, 'Commande avec arrêt d\'urgence');
      ladder(b, 60, 80, 560, [{ x: 140, items: [I('fusible', 'F1', '2 A'), I('arret_urgence', 'S0'), I('bp_nf', 'S1'), PAR('bp_no', 'S2', '', 'contact_no', 'KM1', ''), I('bobine', 'KM1', '230 V')] },
        { x: 300, items: [I('contact_no', 'KM1'), I('voyant', 'H1', 'vert')] }, { x: 380, items: [I('contact_nf', 'KM1'), I('voyant', 'H2', 'rouge')] }]);
      b.txt('commentaire', 440, 120, 'S0 : arrêt d\'urgence à accrochage'); return b.d; },
    how: ['L\'arrêt d\'urgence S0 (coup de poing rouge, contact NF) est placé en tête du circuit de commande : il coupe tout, quel que soit l\'état des autres boutons.', 'Il reste enfoncé (accrochage) : la machine ne peut pas redémarrer tant qu\'on ne l\'a pas déverrouillé, puis réappuyé sur marche.', 'S1 est l\'arrêt normal, S2 la marche avec auto-maintien. H1 vert = marche, H2 rouge = arrêt.'],
    steps: ['Placer phase, F1 puis l\'arrêt d\'urgence S0 en premier.', 'Ajouter S1 (arrêt), S2 (marche) avec auto-maintien KM1 et la bobine KM1.', 'Ajouter les voyants de marche (NO KM1) et d\'arrêt (NF KM1).', 'Vérifier le schéma.', 'Simuler : marche, arrêt d\'urgence, tentative de redémarrage, déverrouillage.'],
    exercises: ['Pourquoi l\'arrêt d\'urgence utilise-t-il un contact NF et non un contact NO ?', 'Où doit-on placer les arrêts d\'urgence sur une machine ?', 'Ajoutez un deuxième arrêt d\'urgence S3 : en série ou en parallèle ? Justifiez.'],
    sim: [['press', 'S2', 0, true], ['coil', 'KM1', true], ['press', 'S0'], ['coil', 'KM1', false], ['press', 'S2', 0, true], ['coil', 'KM1', false], ['press', 'S0'], ['press', 'S2', 0, true], ['coil', 'KM1', true]] });

  // 12. distribution
  add({ id: 'distribution', title: 'Circuit de distribution avec disjoncteurs', level: 'Intermédiaire', schema: 'multifilaire', theme: 'Bâtiment',
    build() { const b = B(); b.txt('titre', 40, -20, 'Tableau de distribution');
      b.c('reseau_mono', 100, 60, 'G1', '230 V'); b.c('disjoncteur_bi', 100, 180, 'Q0', '500 mA 30 A'); b.w([80, 100], [80, 140]); b.w([100, 100], [100, 140]);
      b.rail([[80, 220], [80, 280], [220, 280], [340, 280], [460, 280]]); b.rail([[100, 220], [100, 320], [240, 320], [360, 320], [480, 320]]);
      [[240, 'Q1', '10 A'], [360, 'Q2', '16 A'], [480, 'Q3', '20 A']].forEach(([x, l, v]) => { b.c('disjoncteur_bi', x, 400, l, v); b.w([x - 20, 280], [x - 20, 360]); b.w([x, 320], [x, 360]); });
      b.c('lampe', 220, 520, 'H1', '100 W'); b.w([220, 440], [220, 480]); b.w([240, 440], [240, 460], [260, 460], [260, 600], [220, 600], [220, 560]);
      b.c('prise', 360, 520, 'X1', '16 A'); b.w([340, 440], [340, 480]); b.w([360, 440], [360, 460], [380, 460], [380, 480]);
      b.c('resistance_chauff', 460, 520, 'R1', '2 kW'); b.w([460, 440], [460, 480]); b.w([480, 440], [480, 460], [500, 460], [500, 600], [460, 600], [460, 560]);
      b.w([120, 100], [120, 120], [560, 120], [560, 640], [360, 640], [360, 560]);
      b.txt('texte', 200, 680, 'C1 éclairage · C2 prises · C3 chauffe-eau'); return b.d; },
    how: ['Le disjoncteur de branchement Q0 (différentiel 500 mA) coupe toute l\'installation.', 'La phase et le neutre sont répartis vers chaque circuit, protégé par son propre disjoncteur bipolaire : Q1 éclairage (10 A), Q2 prises (16 A), Q3 chauffe-eau (20 A).', 'Le calibre de chaque disjoncteur dépend de la section du câble du circuit (1,5 mm² → 10 A ou 16 A, 2,5 mm² → 16 A ou 20 A – à vérifier dans la NF C 15-100).'],
    steps: ['Placer l\'arrivée du réseau et le disjoncteur de branchement Q0.', 'Tracer la répartition de la phase et du neutre.', 'Placer un disjoncteur par circuit et le récepteur correspondant.', 'Relier les masses à la terre.', 'Simuler : déclencher un disjoncteur ne coupe que son circuit.'],
    exercises: ['Pourquoi chaque circuit a-t-il sa propre protection ?', 'Calculez le courant du chauffe-eau de 2 kW (onglet Calculs) et vérifiez le calibre de Q3.', 'Ajoutez un circuit C4 pour un climatiseur.'],
    sim: [['on', 'H1', true], ['on', 'R1', true], ['press', 'Q1'], ['on', 'H1', false], ['on', 'R1', true]] });

  // ---------- composants (déduits du schéma) ----------
  function components(doc) {
    const m = {}; doc.comps.forEach((c) => { const d = Lib.get(c.type); if (!d || d.annot || ['connexion', 'croisement', 'phase', 'neutre', 'terre'].includes(c.type)) return; const k = c.type + '|' + (d.contact ? '' : c.label); if (!m[k]) m[k] = { name: d.name, labels: [], val: c.val || '', n: 0 }; m[k].n++; if (c.label && !m[k].labels.includes(c.label)) m[k].labels.push(c.label); });
    return Object.values(m).sort((a, b) => (a.labels[0] || '').localeCompare(b.labels[0] || ''));
  }
  // rejoue le scénario de simulation d'un exemple (utilisé par les tests et par le bouton « Tester l'exemple »)
  function scenario(ex, docIn) {
    const doc = docIn || ex.build(), sim = EE.Sim.create(doc); sim.solve(); const log = []; let ok = true;
    const byLab = (l, pred) => doc.comps.filter((c) => c.label === l).sort((a, b) => (pred ? (pred(b) ? 1 : 0) - (pred(a) ? 1 : 0) : 0))[0];
    (ex.sim || []).forEach((st) => {
      const [k, l, a, b] = st; const v = sim.view;
      if (k === 'press') { const c = byLab(l, (x) => sim.isInteractive(x.id)); if (!c || !sim.isInteractive(c.id)) { ok = false; log.push('appareil non manœuvrable : ' + l); return; } sim.press(c.id, a || 0); if (b) sim.release(c.id); log.push('appui ' + l); return; }
      if (k === 'wait') { for (let i = 0; i < Math.round(l * 10); i++) sim.tick(0.1); log.push('attente ' + l + ' s'); return; }
      const c = byLab(l, (x) => !Lib.get(x.type).contact); const cv = c ? v.comp[c.id] || {} : {};
      const got = k === 'on' ? !!cv.on : k === 'coil' ? !!cv.coil : k === 'dir' ? cv.dir : k === 'coupling' ? cv.coupling : undefined;
      const good = got === a; if (!good) ok = false; log.push(`${good ? '✔' : '✘'} ${l} ${k} = ${got} (attendu ${a})`);
    });
    return { ok, log, issues: EE.Engine.verify(doc).issues };
  }
  EE.Examples = { scenario, list: EX, get: (id) => EX.find((e) => e.id === id), components, build: (id) => EX.find((e) => e.id === id).build() };
})(window);
