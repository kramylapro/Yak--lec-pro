// Définition des circuits de test (coordonnées monde, multiples de 20)
window.__CIRCUITS = {
  allumage: { name: 'Simple allumage', schema: 'developpe',
    comps: [['phase',100,100,'', 'L1'],['interrupteur',100,200,'S1'],['lampe',100,320,'H1'],['neutre',200,400,'']],
    wires: [[[100,100],[100,160]],[[100,240],[100,280]],[[200,400],[200,360],[100,360]]] },
  double: { name: 'Double allumage', schema: 'developpe',
    comps: [['phase',100,100,'','L1'],['interrupteur_double',100,200,'S1'],['lampe',60,320,'H1'],['lampe',140,320,'H2'],['neutre',240,400,''],['connexion',140,400,'']],
    wires: [[[100,100],[100,160]],[[80,240],[80,260],[60,260],[60,280]],[[120,240],[120,260],[140,260],[140,280]],[[60,360],[60,400],[240,400]],[[140,360],[140,400]]] },
  vav: { name: 'Va-et-vient', schema: 'developpe',
    comps: [['phase',100,100,'','L1'],['va_et_vient',100,200,'S1'],['va_et_vient',100,400,'S2',null,180],['lampe',100,520,'H1'],['neutre',200,560,'']],
    wires: [[[100,100],[100,160]],[[80,240],[80,300],[120,300],[120,360]],[[120,240],[160,240],[160,330],[80,330],[80,360]],[[100,440],[100,480]],[[200,560],[100,560]]] },
  commande: { name: 'Circuit de commande simple', schema: 'developpe',
    comps: [['phase',100,100,'','L1'],['bp_nf',100,200,'S0'],['bp_no',100,320,'S1'],['contacteur',200,440,'KM1'],['phase',260,100,'','L1'],['lampe',220,560,'H1'],['neutre',300,640,''],['connexion',220,640,'']],
    wires: [[[100,100],[100,160]],[[100,240],[100,280]],[[100,360],[100,400],[180,400]],[[260,100],[260,300],[220,300],[220,400]],[[220,480],[220,520]],[[180,480],[180,640],[300,640]],[[220,600],[220,640]]] },
};
window.__build = function (key) {
  const C = window.__CIRCUITS[key], ed = EE.app.editor;
  C.comps.forEach(([t,x,y,l,v,r]) => ed.addComp(t,x,y,{label:l,val:v,rot:r||0}));
  C.wires.forEach((pts) => ed.addWire(pts));
  ed.commit(); ed.fit(); return ed.doc;
};

// Document pur (sans éditeur) pour les tests du moteur
window.__doc = function (key, mutate) {
  const C = window.__CIRCUITS[key]; const doc = { comps: [], wires: [] }; let n = 0;
  C.comps.forEach(([t,x,y,l,v,r]) => { const c = EE.Library.newComp(t,x,y); c.id = 'c' + (++n); c.label = l || ''; if (v) c.val = v; c.rot = r || 0; doc.comps.push(c); });
  C.wires.forEach((pts, i) => doc.wires.push({ id: 'w' + (i + 1), pts: pts.map((p) => p.slice()), n: 1, desig: '' }));
  if (mutate) mutate(doc); return doc;
};

// ---- Circuits industriels (V1.1) ----
Object.assign(window.__CIRCUITS, {
  // Démarrage direct 1 sens : sectionneur porte-fusibles, contacteur, relais thermique, moteur ; commande marche/arrêt avec auto-maintien
  dol: { name: 'Démarrage direct 1 sens', schema: 'developpe',
    comps: [['phase',300,100,'','L1'],['phase',340,100,'','L2'],['phase',380,100,'','L3'],['sectionneur_fusibles',340,240,'Q1'],['contacteur_tri',340,360,'KM1'],['relais_thermique',340,520,'F2','6,3 A'],['moteur_tri',340,680,'M1'],['terre',340,760,''],
            ['phase',480,100,'','L1'],['bp_nf',480,200,'S0'],['bp_no',480,320,'S1'],['contact_no',540,320,'KM1'],['neutre',460,600,'']],
    wires: [[[300,100],[300,160],[320,160],[320,200]],[[340,100],[340,200]],[[380,100],[380,160],[360,160],[360,200]],
            [[320,280],[320,320]],[[340,280],[340,320]],[[360,280],[360,320]],
            [[320,400],[320,480]],[[340,400],[340,480]],[[360,400],[360,480]],
            [[320,560],[320,640]],[[340,560],[340,640]],[[360,560],[360,640]],[[340,720],[340,760]],
            [[480,100],[480,160]],[[480,240],[480,280]],[[480,280],[540,280]],[[480,360],[540,360]],[[480,360],[440,360],[440,320],[400,320]],
            [[400,400],[400,480]],[[400,560],[400,600],[460,600]]] },
});
