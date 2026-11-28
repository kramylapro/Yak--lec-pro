/* Yak-élec-pro – moteur de connectivité et vérification
   Principe : un croisement graphique n'est JAMAIS une connexion.
   Deux éléments sont reliés seulement si :
     - une extrémité de conducteur est sur une borne ;
     - deux extrémités de conducteurs coïncident ;
     - deux bornes coïncident ;
     - une « Connexion » (jonction) est placée sur le point (y compris sur un conducteur qui passe). */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library;
  const key = (x, y) => x + ',' + y;

  function onSegment(p, a, b) { // p sur le segment [a,b] (segments orthogonaux ou obliques)
    const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) > 1e-6) return false;
    return p.x >= Math.min(a.x, b.x) - 1e-6 && p.x <= Math.max(a.x, b.x) + 1e-6 && p.y >= Math.min(a.y, b.y) - 1e-6 && p.y <= Math.max(a.y, b.y) + 1e-6;
  }
  const wpts = (w) => w.pts.map((p) => ({ x: p[0], y: p[1] }));
  function onWire(p, w, interiorOnly) {
    const ps = wpts(w);
    if (interiorOnly) { const e0 = ps[0], e1 = ps[ps.length - 1]; if ((p.x === e0.x && p.y === e0.y) || (p.x === e1.x && p.y === e1.y)) return false; }
    for (let i = 0; i < ps.length - 1; i++) if (onSegment(p, ps[i], ps[i + 1])) return true;
    return false;
  }

  class UF { constructor() { this.p = {}; } find(a) { if (!(a in this.p)) this.p[a] = a; while (this.p[a] !== a) { this.p[a] = this.p[this.p[a]]; a = this.p[a]; } return a; } union(a, b) { a = this.find(a); b = this.find(b); if (a !== b) this.p[a] = b; } }

  function analyze(doc) {
    const uf = new UF();
    const terms = []; // {k, cid, tid, x, y, comp, tm}
    const byCoord = {};
    const comps = {};
    doc.comps.forEach((c) => {
      comps[c.id] = c;
      const d = Lib.get(c.type); if (!d) return;
      d.term.forEach((tm) => {
        const p = Lib.termWorld(c, tm);
        const T = { k: 'T:' + c.id + '.' + tm.id, cid: c.id, tid: tm.id, x: p.x, y: p.y, comp: c, tm };
        terms.push(T); (byCoord[key(p.x, p.y)] = byCoord[key(p.x, p.y)] || []).push(T); uf.find(T.k);
      });
    });
    const ambiguous = [];
    // 1. bornes qui coïncident (contact direct)
    Object.values(byCoord).forEach((l) => { for (let i = 1; i < l.length; i++) uf.union(l[0].k, l[i].k); });
    // 1 bis. liaisons internes des barres et bornes (toutes les bornes d'un même groupe sont au même potentiel)
    doc.comps.forEach((c) => { const d = Lib.get(c.type); if (d && d.bridge) d.bridge.forEach((grp) => { for (let i = 1; i < grp.length; i++) uf.union('T:' + c.id + '.' + grp[0], 'T:' + c.id + '.' + grp[i]); }); });
    // 2. conducteurs
    const epIndex = {};
    doc.wires.forEach((w) => {
      const wk = 'W:' + w.id; uf.find(wk);
      const ps = wpts(w); if (ps.length < 2) return;
      [ps[0], ps[ps.length - 1]].forEach((p, i) => {
        const kk = key(p.x, p.y);
        (byCoord[kk] || []).forEach((T) => uf.union(wk, T.k));
        (epIndex[kk] = epIndex[kk] || []).push({ w, end: i });
      });
    });
    Object.values(epIndex).forEach((l) => { for (let i = 1; i < l.length; i++) uf.union('W:' + l[0].w.id, 'W:' + l[i].w.id); });
    // 3. jonctions : relient les conducteurs qui passent par le point
    const junctions = doc.comps.filter((c) => c.type === 'connexion');
    junctions.forEach((j) => {
      doc.wires.forEach((w) => { if (w.pts.length > 1 && onWire({ x: j.x, y: j.y }, w, false)) uf.union('W:' + w.id, 'T:' + j.id + '.J'); });
    });
    // 4. contacts ambigus : extrémité ou borne posée sur un conducteur qui passe, sans jonction
    doc.wires.forEach((w) => {
      const ps = wpts(w); if (ps.length < 2) return;
      doc.wires.forEach((o) => {
        if (o === w || o.pts.length < 2) return;
        [ps[0], ps[ps.length - 1]].forEach((p) => {
          if (onWire(p, o, true) && !(byCoord[key(p.x, p.y)] || []).some((T) => T.comp.type === 'connexion')) ambiguous.push({ x: p.x, y: p.y, wid: w.id, other: o.id, kind: 'end' });
        });
      });
      terms.forEach((T) => {
        if (T.comp.type === 'connexion') return;
        if (onWire({ x: T.x, y: T.y }, w, true) && uf.find(T.k) !== uf.find('W:' + w.id)) ambiguous.push({ x: T.x, y: T.y, wid: w.id, cid: T.cid, tid: T.tid, kind: 'term' });
      });
    });
    // 5. réseaux (nets)
    const nets = {};
    const netOf = (k) => uf.find(k);
    terms.forEach((T) => { const n = netOf(T.k); (nets[n] = nets[n] || { id: n, terms: [], wires: [], pots: new Set() }).terms.push(T); });
    doc.wires.forEach((w) => { const n = netOf('W:' + w.id); (nets[n] = nets[n] || { id: n, terms: [], wires: [], pots: new Set() }).wires.push(w); });
    // 6. sources de potentiel
    terms.forEach((T) => {
      const s = Lib.sources(T.comp); if (s && s[T.tid]) nets[netOf(T.k)].pots.add(s[T.tid]);
    });
    const A = { uf, terms, comps, nets, netOf, byCoord, ambiguous, junctions };
    // 7. arêtes internes (appareils)
    A.edges = { sw: [], pa: [] };
    doc.comps.forEach((c) => {
      const d = Lib.get(c.type); if (!d) return;
      ['sw', 'pa'].forEach((kind) => (d[kind] || []).forEach(([a, b]) => A.edges[kind].push([netOf('T:' + c.id + '.' + a), netOf('T:' + c.id + '.' + b), c.id])));
    });
    return A;
  }

  // BFS sur le graphe des réseaux à travers les arêtes autorisées ; retourne l'ensemble des potentiels atteints
  function reach(A, startNet, kinds) {
    const adj = {};
    kinds.forEach((k) => A.edges[k].forEach(([a, b]) => { (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }));
    const seen = new Set([startNet]), q = [startNet], pots = new Set(), nets = [];
    while (q.length) { const n = q.shift(); nets.push(n); if (A.nets[n]) A.nets[n].pots.forEach((p) => pots.add(p)); (adj[n] || []).forEach((m) => { if (!seen.has(m)) { seen.add(m); q.push(m); } }); }
    return { pots, nets };
  }

  // Affectation de potentiels deux à deux distincts à chaque borne d'alimentation
  function canAssign(sets) {
    const rec = (i, used) => { if (i === sets.length) return true; for (const p of sets[i]) if (!used.has(p)) { used.add(p); if (rec(i + 1, used)) return true; used.delete(p); } return false; };
    return rec(0, new Set());
  }

  // titre clair + « comment corriger » pour chaque type d'anomalie
  const HELP = {
    NO_ID: ['Composant sans repère', 'Cliquez sur le composant, puis écrivez son repère dans le champ « Repère » du panneau Propriétés (ex. Q1 pour un disjoncteur, H1 pour une lampe, KM1 pour un contacteur).'],
    DUP_ID: ['Deux composants ont le même repère', 'Donnez à chacun un repère différent (ex. H1 et H2). Seuls une bobine et ses contacts peuvent porter le même repère.'],
    CONTACT_NO_COIL: ['Contact sans bobine', 'Donnez au contact le même repère que sa bobine ou son contacteur (ex. KM1), ou ajoutez la bobine qui le commande.'],
    ISOLATED: ['Conducteur isolé', 'Ce conducteur ne touche aucune borne. Sélectionnez-le puis appuyez sur Suppr, ou prolongez-le jusqu\'à la borne d\'un composant.'],
    WIRE_SHORT: ['Conducteur incomplet', 'Supprimez ce conducteur puis retracez-le : cliquez sur la borne de départ, puis sur la borne d\'arrivée.'],
    DANGLING: ['Fil non raccordé', 'Tirez cette extrémité jusqu\'à une borne (petit point) d\'un composant ou jusqu\'à un autre conducteur, ou supprimez le fil s\'il est inutile.'],
    AMBIGUOUS: ['Connexion ambiguë', 'Si les deux conducteurs doivent être reliés, ajoutez le symbole « Connexion » (gros point) à cet endroit. Sinon, écartez-les ou utilisez « Croisement sans connexion ».'],
    JUNC_ALONE: ['Jonction inutile', 'Reliez cette jonction à un conducteur, ou supprimez-la.'],
    PE_OPEN: ['Borne de terre non raccordée', 'Reliez cette borne de terre (PE) au symbole « Terre » avec un conducteur : c\'est obligatoire pour la sécurité des personnes (NF C 15-100).'],
    SRC_OPEN: ['Source non raccordée', 'Tracez un conducteur depuis la borne de cette source (phase, neutre ou terre) vers le circuit à alimenter.'],
    TERM_OPEN: ['Borne non raccordée', 'Tracez un conducteur depuis cette borne vers le composant suivant. Si la borne ne sert pas (contact auxiliaire inutilisé), vous pouvez l\'ignorer.'],
    SHORT_IF: ['Verrouillage manquant', 'Deux contacteurs ne doivent jamais être fermés ensemble (inversion de sens, étoile-triangle) : placez un contact NF de chaque contacteur en série avec la bobine de l\'autre (verrouillage électrique), et si possible un verrouillage mécanique.'],
    SHORT: ['Court-circuit', 'La phase et le neutre (ou deux phases) sont reliés sans récepteur entre eux. Insérez un récepteur (lampe, moteur, résistance…) entre les deux, ou supprimez le conducteur qui les relie directement.'],
    OPEN: ['Circuit ouvert (récepteur non alimenté)', 'Une borne du récepteur n\'est reliée à aucune source. Reliez une borne à la phase (en passant par l\'interrupteur et le disjoncteur) et l\'autre borne au neutre.'],
    SAME_POT: ['Récepteur mal branché', 'Les deux bornes du récepteur sont au même potentiel (par exemple les deux sur la phase). Reliez une borne à la phase et l\'autre au neutre (ou à une autre phase).'],
    PE_NOTEARTH: ['Masse non reliée à la terre', 'Reliez la borne de terre (PE) de ce composant au symbole « Terre » : la masse métallique doit toujours être protégée.'],
    NO_SOURCE: ['Aucune source dans le schéma', 'Ajoutez les symboles « Phase » et « Neutre » (catégorie Sources) et reliez-les au circuit, pour que le logiciel puisse contrôler l\'alimentation.'],
  };

  function verify(doc) {
    const A = analyze(doc), issues = [];
    let n = 0;
    const add = (sev, code, msg, x, y, ref) => issues.push({ id: ++n, sev, code, msg, x, y, ref: ref || null, title: (HELP[code] || [''])[0], fix: (HELP[code] || ['', ''])[1] });
    const compName = (c) => (c.label ? c.label : Lib.get(c.type).name) + (c.label ? ' (' + Lib.get(c.type).name + ')' : '');
    const nonEmpty = doc.comps.filter((c) => c.type !== 'conducteur');
    if (!nonEmpty.length && !doc.wires.length) return { issues, ok: true, stats: stats(), empty: true, A };

    // --- Identification des composants
    const needLabel = (c) => !['connexion', 'croisement', 'terre', 'phase', 'neutre'].includes(c.type) && !(Lib.get(c.type) || {}).noLabel;
    const seenLabels = {};
    doc.comps.forEach((c) => {
      if (!needLabel(c)) return;
      if (!c.label || !c.label.trim()) add('warning', 'NO_ID', `Composant sans identification : ${Lib.get(c.type).name}.`, c.x, c.y, { cid: c.id });
      else { const l = c.label.trim().toLowerCase(); (seenLabels[l] = seenLabels[l] || []).push(c); }
    });
    // les contacts (KM1…) partagent volontairement le repère de leur bobine
    Object.values(seenLabels).forEach((l) => { const prim = l.filter((c) => !Lib.get(c.type).contact); if (prim.length > 1) prim.forEach((c) => add('warning', 'DUP_ID', `Identification en double : « ${c.label} » (${prim.length} composants).`, c.x, c.y, { cid: c.id })); });
    doc.comps.forEach((c) => { const d = Lib.get(c.type); if (d.contact && c.label && !doc.comps.some((x) => (Lib.get(x.type).coil || (d.owners || []).includes(x.type)) && x.label === c.label)) add('warning', 'CONTACT_NO_COIL', `Contact « ${c.label} » : aucune bobine ou aucun contacteur portant le même repère.`, c.x, c.y, { cid: c.id }); });

    // --- Fils non raccordés / conducteurs isolés
    const isolatedWires = new Set();
    Object.values(A.nets).forEach((net) => {
      if (net.wires.length && !net.terms.length) {
        const w = net.wires[0]; net.wires.forEach((x) => isolatedWires.add(x.id));
        add('error', 'ISOLATED', `Conducteur isolé : ce conducteur n'est relié à aucune borne${net.wires.length > 1 ? ' (groupe de ' + net.wires.length + ' conducteurs)' : ''}.`, w.pts[0][0], w.pts[0][1], { wid: w.id });
      }
    });
    doc.wires.forEach((w) => {
      if (isolatedWires.has(w.id)) return;
      const ps = wpts(w);
      if (ps.length < 2) { add('error', 'WIRE_SHORT', 'Conducteur incomplet (moins de deux points).', ps[0] ? ps[0].x : 0, ps[0] ? ps[0].y : 0, { wid: w.id }); return; }
      [ps[0], ps[ps.length - 1]].forEach((p) => {
        const kk = key(p.x, p.y);
        const hasTerm = (A.byCoord[kk] || []).length > 0;
        const otherEnd = doc.wires.some((o) => o !== w && o.pts.length > 1 && ((o.pts[0][0] === p.x && o.pts[0][1] === p.y) || (o.pts[o.pts.length - 1][0] === p.x && o.pts[o.pts.length - 1][1] === p.y)));
        const touches = doc.wires.some((o) => o !== w && o.pts.length > 1 && onWire(p, o, true));
        if (!hasTerm && !otherEnd && !touches) add('error', 'DANGLING', 'Fil non raccordé : cette extrémité ne touche aucune borne ni aucun conducteur.', p.x, p.y, { wid: w.id });
      });
    });
    // --- Contacts ambigus (T sans jonction)
    const seenAmb = new Set();
    A.ambiguous.forEach((a) => {
      const kk = a.kind + key(a.x, a.y) + a.wid; if (seenAmb.has(kk)) return; seenAmb.add(kk);
      add('error', 'AMBIGUOUS', a.kind === 'end' ? 'Connexion ambiguë : un conducteur touche un autre conducteur sans « Connexion » (jonction). Ajouter une jonction, ou écarter le conducteur.' : 'Une borne est posée sur un conducteur qui passe sans y être reliée : ajouter une jonction ou déplacer le composant.', a.x, a.y, { wid: a.wid, cid: a.cid });
    });
    // --- Bornes sans connexion
    A.terms.forEach((T) => {
      const d = Lib.get(T.comp.type), net = A.nets[A.netOf(T.k)];
      const connected = net.wires.length > 0 || net.terms.length > 1;
      if (connected) return;
      if (T.comp.type === 'connexion') { add('warning', 'JUNC_ALONE', 'Jonction isolée (aucun conducteur).', T.x, T.y, { cid: T.cid }); return; }
      if (T.tm.opt) return;
      if (T.tm.pe) add('warning', 'PE_OPEN', `Borne de terre non raccordée : ${compName(T.comp)}, borne ${T.tid}.`, T.x, T.y, { cid: T.cid, tid: T.tid });
      else if (d.src || d.srcFn && ['phase', 'neutre', 'terre'].includes(T.comp.type)) add('error', 'SRC_OPEN', `Source non raccordée : ${compName(T.comp)}.`, T.x, T.y, { cid: T.cid });
      else add('error', 'TERM_OPEN', `Borne sans connexion : ${compName(T.comp)}, borne ${T.tid}.`, T.x, T.y, { cid: T.cid, tid: T.tid });
    });
    // --- Court-circuits : plusieurs potentiels reliés sans charge (conducteurs + organes de coupure seulement)
    const doneNets = new Set();
    Object.keys(A.nets).forEach((nid) => {
      if (doneNets.has(nid)) return;
      const r = reach(A, nid, ['sw']); r.nets.forEach((m) => doneNets.add(m));
      if (r.pots.size > 1) {
        const net = A.nets[nid]; const pt = net.terms[0] ? { x: net.terms[0].x, y: net.terms[0].y } : { x: net.wires[0].pts[0][0], y: net.wires[0].pts[0][1] };
        // court-circuit conditionnel : n'existe que si plusieurs contacteurs (repères différents) sont fermés ensemble
        const inG = new Set(r.nets), coilCtl = (cid) => { const c = A.comps[cid], d = c && Lib.get(c.type); return !!(d && c.label && (d.contact || d.coil) && !(d.owners)); };
        const fixed = { sw: A.edges.sw.filter((e) => !coilCtl(e[2])), pa: [] }; const B2 = Object.assign({}, A, { edges: fixed });
        const uncond = r.nets.some((m) => reach(B2, m, ['sw']).pots.size > 1);
        if (!uncond) {
          const labs = [...new Set(A.edges.sw.filter((e) => coilCtl(e[2]) && inG.has(e[0]) && inG.has(e[1])).map((e) => A.comps[e[2]].label))];
          if (labs.length >= 2) {
            const nfOf = (l) => doc.comps.some((c) => c.label === l && /^contact_nf/.test(c.type));
            const locked = labs.filter(nfOf).length >= 2;
            if (!locked) add('warning', 'SHORT_IF', `Court-circuit si ${labs.join(' et ')} sont fermés en même temps : ${[...r.pots].join(' et ')} seraient reliés. Ajoutez un verrouillage (contacts NF croisés).`, pt.x, pt.y, net.terms[0] ? { cid: net.terms[0].cid } : { wid: net.wires[0].id });
            return;
          }
        }
        add('error', 'SHORT', `Court-circuit possible : ${[...r.pots].map((p) => p.replace(/^c[a-z0-9]+\./, 'secondaire ')).join(' et ')} sont reliés sans charge entre eux.`, pt.x, pt.y, net.terms[0] ? { cid: net.terms[0].cid } : { wid: net.wires[0].id });
      }
    });
    // --- Charges : alimentation, circuits ouverts, même potentiel
    const hasSource = Object.values(A.nets).some((n) => n.pots.size);
    let loadCount = 0;
    doc.comps.forEach((c) => {
      const d = Lib.get(c.type); if (!d || !d.loads) return;
      d.loads.forEach((supply) => {
        loadCount++;
        const sets = [], missing = [];
        supply.forEach((tid) => {
          const T = A.terms.find((x) => x.cid === c.id && x.tid === tid);
          const r = reach(A, A.netOf(T.k), ['sw', 'pa']);
          const pots = new Set([...r.pots].filter((p) => p !== 'PE'));
          sets.push(pots); if (!pots.size) missing.push(T);
        });
        if (!hasSource) return;
        const name = compName(c);
        if (missing.length) {
          const T0 = missing[0];
          add('error', 'OPEN', `Circuit ouvert : ${name} — la borne ${missing.map((m) => m.tid).join(', ')} n'est reliée à aucune source (phase, neutre ou secondaire) même en fermant les appareils de commande.`, T0.x, T0.y, { cid: c.id, tid: T0.tid });
        } else if (!canAssign(sets)) {
          add('error', 'SAME_POT', `Connexion incohérente : les bornes d'alimentation de ${name} sont au même potentiel (récepteur non alimenté ou court-circuité).`, c.x, c.y, { cid: c.id });
        }
      });
      // borne de terre : doit atteindre la terre
      d.term.filter((tm) => tm.pe).forEach((tm) => {
        const T = A.terms.find((x) => x.cid === c.id && x.tid === tm.id);
        const net = A.nets[A.netOf(T.k)];
        if (net.wires.length || net.terms.length > 1) {
          const r = reach(A, A.netOf(T.k), ['sw']);
          if (!r.pots.has('PE') && Object.values(A.nets).some((n) => n.pots.has('PE'))) add('warning', 'PE_NOTEARTH', `La borne de terre de ${compName(c)} n'est pas reliée à la terre.`, T.x, T.y, { cid: c.id, tid: tm.id });
        }
      });
    });
    if (!hasSource && loadCount) add('warning', 'NO_SOURCE', 'Aucune source (Phase / Neutre / transformateur) dans le schéma : impossible de contrôler l\'alimentation des récepteurs.', 0, 0, null);
    return { issues, ok: !issues.some((i) => i.sev === 'error'), stats: stats(), A };
    function stats() { return { comps: doc.comps.length, wires: doc.wires.length, nets: Object.keys(A.nets).length, errors: issues.filter((i) => i.sev === 'error').length, warnings: issues.filter((i) => i.sev === 'warning').length }; }
  }

  // Signature canonique des réseaux (pour comparer avant / après sauvegarde)
  function signature(doc) {
    const A = analyze(doc);
    return Object.values(A.nets).map((n) => n.terms.map((t) => t.cid + '.' + t.tid).sort().join('+') + '|' + n.wires.map((w) => w.id).sort().join('+') + '|' + [...n.pots].sort().join(',')).sort().join(' ;; ');
  }

  EE.Engine = { analyze, verify, HELP, signature, onWire, reach };
})(window);
