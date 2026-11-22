/* Yak-élec-pro – assistant de dépannage : propose et applique des corrections aux erreurs de raccordement.
   Corrections « sûres » (ne détruisent rien) : fil proche d'une borne, jonction manquante, repères manquants/en double,
   symbole Terre manquant. Corrections « à confirmer » : suppression d'un fil inutile, liaison de deux bornes libres voisines. */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library, G = EE.G || 20, NEAR = 4 * G, LINK = 8 * G;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wid = () => EE.uid('w');
  const termFree = (A, T) => { const n = A.nets[A.netOf(T.k)]; return !(n.wires.length || n.terms.length > 1); };
  function nextLabel(doc, prefix) {
    const used = new Set(doc.comps.map((c) => (c.label || '').trim().toLowerCase())); let i = 1;
    while (used.has((prefix + i).toLowerCase())) i++; return prefix + i;
  }
  // relie deux points par un conducteur orthogonal (un coude si nécessaire)
  function route(a, b) { if (a.x === b.x || a.y === b.y) return [[a.x, a.y], [b.x, b.y]]; return [[a.x, a.y], [a.x, b.y], [b.x, b.y]]; }

  // renvoie la liste des actions possibles pour les anomalies d'un schéma
  function suggest(doc) {
    const r = EE.Engine.verify(doc), A = r.A, acts = [];
    const add = (i, label, safe, apply, why) => acts.push({ issueId: i.id, code: i.code, label, safe, apply, why: why || '' });
    r.issues.forEach((i) => {
      const ref = i.ref || {};
      if (i.code === 'DANGLING' && ref.wid) {
        const w = doc.wires.find((x) => x.id === ref.wid); if (!w) return;
        const p = { x: i.x, y: i.y };
        const cands = A.terms.map((T) => ({ T, d: dist(p, T) })).filter((o) => o.d > 0 && o.d <= NEAR).sort((a, b) => (termFree(A, b.T) - termFree(A, a.T)) || a.d - b.d);
        if (cands.length) {
          const T = cands[0].T;
          add(i, `Prolonger le fil jusqu'à la borne ${T.tid} de ${(T.comp.label || Lib.get(T.comp.type).name)}`, true, (d) => {
            const ww = d.wires.find((x) => x.id === ref.wid); if (!ww) return;
            const atStart = ww.pts[0][0] === p.x && ww.pts[0][1] === p.y; const pts = atStart ? ww.pts.slice().reverse() : ww.pts.slice();
            const q = pts[pts.length - 2]; pts.pop();
            const horiz = q && q[1] === p.y; const prev = pts[pts.length - 1];
            if (prev && prev[0] !== T.x && prev[1] !== T.y) pts.push(horiz ? [T.x, prev[1]] : [prev[0], T.y]);
            pts.push([T.x, T.y]); ww.pts = atStart ? pts.reverse() : pts;
          });
        }
        add(i, 'Supprimer ce fil inutile', false, (d) => { d.wires = d.wires.filter((x) => x.id !== ref.wid); }, 'Le fil sera effacé.');
      } else if ((i.code === 'ISOLATED' || i.code === 'WIRE_SHORT') && ref.wid) {
        add(i, 'Supprimer ce conducteur isolé', false, (d) => { d.wires = d.wires.filter((x) => x.id !== ref.wid); }, 'Le conducteur sera effacé.');
      } else if (i.code === 'AMBIGUOUS') {
        add(i, 'Ajouter une connexion (point) à cet endroit', true, (d) => { if (!d.comps.some((c) => c.type === 'connexion' && c.x === i.x && c.y === i.y)) d.comps.push(Lib.newComp('connexion', i.x, i.y)); });
      } else if (i.code === 'JUNC_ALONE' && ref.cid) {
        add(i, 'Supprimer cette jonction isolée', true, (d) => { d.comps = d.comps.filter((c) => c.id !== ref.cid); });
      } else if (i.code === 'NO_ID' && ref.cid) {
        const c = doc.comps.find((x) => x.id === ref.cid), df = c && Lib.get(c.type);
        if (df && df.prefix && !df.contact) add(i, `Donner un repère automatique (${df.prefix}1, ${df.prefix}2…)`, true, (d) => { const cc = d.comps.find((x) => x.id === ref.cid); if (cc && !(cc.label || '').trim()) cc.label = nextLabel(d, df.prefix); });
      } else if (i.code === 'DUP_ID' && ref.cid) {
        const c = doc.comps.find((x) => x.id === ref.cid), df = c && Lib.get(c.type); if (!df) return;
        const same = doc.comps.filter((x) => !Lib.get(x.type).contact && (x.label || '').trim().toLowerCase() === (c.label || '').trim().toLowerCase());
        if (same[0] !== c && df.prefix) add(i, `Renommer en ${nextLabel(doc, df.prefix)}`, true, (d) => { const cc = d.comps.find((x) => x.id === ref.cid); if (cc) cc.label = nextLabel(d, df.prefix); });
      } else if ((i.code === 'PE_OPEN' || i.code === 'PE_NOTEARTH') && ref.cid && ref.tid) {
        const T = A.terms.find((t) => t.cid === ref.cid && t.tid === ref.tid); if (!T) return;
        add(i, 'Ajouter un symbole Terre sous cette borne et le relier', true, (d) => {
          const tc = Lib.newComp('terre', T.x, T.y + 2 * G); d.comps.push(tc);
          const tt = Lib.termWorld(tc, Lib.get('terre').term[0]); d.wires.push({ id: wid(), pts: route({ x: T.x, y: T.y }, tt), n: 1, desig: '' });
        });
      } else if ((i.code === 'TERM_OPEN' || i.code === 'OPEN') && ref.cid && ref.tid) {
        const T = A.terms.find((t) => t.cid === ref.cid && t.tid === ref.tid); if (!T) return;
        const c = A.terms.filter((o) => o.cid !== T.cid && termFree(A, o) && !o.tm.pe && !(o.tm.opt) && dist(o, T) <= LINK).sort((a, b) => dist(a, T) - dist(b, T))[0];
        if (c) add(i, `Relier à la borne ${c.tid} de ${(c.comp.label || Lib.get(c.comp.type).name)} (la plus proche, non raccordée)`, false, (d) => { d.wires.push({ id: wid(), pts: route({ x: T.x, y: T.y }, { x: c.x, y: c.y }), n: 1, desig: '' }); }, 'Vérifiez que cette liaison est bien celle voulue (phase / neutre).');
      }
    });
    return { report: r, actions: acts };
  }

  // applique toutes les corrections sûres, en plusieurs passes ; renvoie la liste des corrections faites
  function autoFix(doc) {
    const done = []; let guard = 0;
    while (guard++ < 8) {
      const s = suggest(doc), seen = new Set(), todo = [];
      s.actions.forEach((a) => { if (a.safe && !seen.has(a.issueId)) { seen.add(a.issueId); todo.push(a); } });
      if (!todo.length) break;
      todo.forEach((a) => { a.apply(doc); done.push(a.label); });
    }
    return done;
  }
  EE.Fixer = { suggest, autoFix };
})(window);
