/* Yak-élec-pro – atelier de dessin (feuille, outils, historique, sauvegarde automatique) */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library, G = EE.G;
  const NS = 'http://www.w3.org/2000/svg';
  const key = (x, y) => x + ',' + y;
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

  // ---------- géométrie des conducteurs ----------
  function normalize(w) {
    let p = w.pts.filter((q, i) => i === 0 || !eq(q, w.pts[i - 1]));
    let ch = true;
    while (ch) {
      ch = false;
      for (let i = 1; i < p.length - 1; i++) {
        const a = p[i - 1], b = p[i], c = p[i + 1];
        if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) === 0) { p.splice(i, 1); ch = true; break; }
      }
      p = p.filter((q, i) => i === 0 || !eq(q, p[i - 1]));
    }
    w.pts = p; return w;
  }
  function moveEnd(w, atStart, oldP, newP) {
    let pts = w.pts.map((p) => p.slice()); if (!atStart) pts.reverse();
    const nb = pts[1];
    if (!nb) { pts[0] = newP.slice(); }
    else {
      const wasVert = oldP[0] === nb[0];
      pts[0] = newP.slice();
      if (!(newP[0] === nb[0] || newP[1] === nb[1])) {
        if (wasVert) { if (pts.length > 2 && pts[2][1] === nb[1]) nb[0] = newP[0]; else pts.splice(1, 0, [newP[0], nb[1]]); }
        else { if (pts.length > 2 && pts[2][0] === nb[0]) nb[1] = newP[1]; else pts.splice(1, 0, [nb[0], newP[1]]); }
      } else if (wasVert && newP[0] !== nb[0] && false) { /* unreachable */ }
    }
    if (!atStart) pts.reverse(); w.pts = pts; return normalize(w);
  }
  function transformComps(doc, ids, fn) {
    const map = {}; const set = new Set(ids);
    const olds = [];
    doc.comps.forEach((c) => { if (set.has(c.id)) { const d = Lib.get(c.type); olds.push([c, d.term.map((tm) => Lib.termWorld(c, tm))]); } });
    olds.forEach(([c]) => fn(c));
    olds.forEach(([c, oldT]) => { const d = Lib.get(c.type); d.term.forEach((tm, i) => { const n = Lib.termWorld(c, tm); if (oldT[i].x !== n.x || oldT[i].y !== n.y) map[key(oldT[i].x, oldT[i].y)] = [n.x, n.y]; }); });
    doc.wires.forEach((w) => {
      if (w.pts.length < 2) return;
      const f = w.pts[0], l = w.pts[w.pts.length - 1];
      const mf = map[key(f[0], f[1])], ml = map[key(l[0], l[1])];
      if (mf) moveEnd(w, true, f.slice(), mf);
      if (ml) { const l2 = w.pts[w.pts.length - 1]; moveEnd(w, false, [l[0], l[1]], ml); void l2; }
    });
    doc.wires = doc.wires.filter((w) => { normalize(w); return w.pts.length >= 2; });
  }

  function create(opt) {
    const svg = opt.svg, project = opt.project;
    let doc = EE.clone(project.doc);
    const settings = Object.assign({ grid: true, autolabel: true, terminalMarks: true }, opt.settings || {});
    const v = Object.assign({ x: 80, y: 80, k: 1 }, project.view || {});
    let tool = 'select', armed = null, drawing = null, ghost = null, pointer = null, drag = null, flip = false;
    let sel = { c: new Set(), w: new Set() }, clip = null, pasteN = 0, markers = [], focusMark = null;
    let hist = [JSON.stringify(doc)], hi = 0;
    const ptrs = new Map(); let pinch = null;
    let simObj = null, simTimer = null, simHold = null;

    // ---------- structure SVG ----------
    svg.innerHTML = `<defs><pattern id="gridp" width="${G}" height="${G}" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" class="gdot"/></pattern></defs>
      <g id="vp"><rect id="gridrect" fill="url(#gridp)" pointer-events="none"/><g id="content"></g><g id="overlay" pointer-events="none"></g></g>`;
    const vp = svg.querySelector('#vp'), content = svg.querySelector('#content'), overlay = svg.querySelector('#overlay'), gridrect = svg.querySelector('#gridrect');

    const mode = () => project.schema;
    const toWorld = (e) => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left - v.x) / v.k, y: (e.clientY - r.top - v.y) / v.k }; };
    const snapP = (w) => [EE.snap(w.x), EE.snap(w.y)];

    // ---------- rendu ----------
    function connectedTerm(A, T) { const n = A.nets[A.netOf(T.k)]; return n.wires.length > 0 || n.terms.length > 1; }
    function render() {
      vp.setAttribute('transform', `translate(${v.x},${v.y}) scale(${v.k})`);
      const r = svg.getBoundingClientRect(), x0 = -v.x / v.k, y0 = -v.y / v.k, w0 = r.width / v.k, h0 = r.height / v.k;
      gridrect.setAttribute('x', Math.floor(x0 / G) * G - G); gridrect.setAttribute('y', Math.floor(y0 / G) * G - G);
      gridrect.setAttribute('width', w0 + 3 * G); gridrect.setAttribute('height', h0 + 3 * G);
      gridrect.style.display = settings.grid && v.k > 0.45 ? '' : 'none';
      if (simObj) { content.innerHTML = EE.Render.docMarkup(simObj.doc, mode(), { hit: true, sim: simObj.view }); overlay.innerHTML = ''; svg.dataset.tool = 'sim'; return; }
      const A = EE.Engine.analyze(doc);
      content.innerHTML = EE.Render.docMarkup(doc, mode(), { hit: true, A });
      let o = '';
      sel.c.forEach((id) => { const c = doc.comps.find((x) => x.id === id); if (!c) return; const b = Lib.bbox(c); o += `<rect class="selbox" x="${b.x1 - 5}" y="${b.y1 - 5}" width="${b.x2 - b.x1 + 10}" height="${b.y2 - b.y1 + 10}" rx="4"/>`; });
      sel.w.forEach((id) => { const w = doc.wires.find((x) => x.id === id); if (w) o += `<polyline class="selwire" points="${w.pts.map((p) => p.join(',')).join(' ')}"/>`; });
      if (settings.terminalMarks) A.terms.forEach((T) => { if (T.comp.type === 'connexion') return; o += connectedTerm(A, T) ? `<circle class="tok" cx="${T.x}" cy="${T.y}" r="2.6"/>` : `<circle class="tfree" cx="${T.x}" cy="${T.y}" r="5"/>`; });
      markers.forEach((m) => { o += `<g class="mk ${m.sev}"><circle cx="${m.x}" cy="${m.y}" r="${focusMark === m.id ? 16 : 11}"/><text x="${m.x}" y="${m.y + 4}" text-anchor="middle">${m.id}</text></g>`; });
      if (tool === 'place' && armed && pointer) { const d = Lib.get(armed); if (d && !d.tool) { const gc = { id: 'ghost', type: armed, x: pointer[0], y: pointer[1], rot: 0, label: '', val: '' }; o += `<g opacity=".5">${EE.Render.compMarkup(gc, mode(), { termNames: false })}</g>`; } }
      if (drawing) { const pts = previewPts(); o += `<polyline class="prevwire" points="${pts.map((p) => p.join(',')).join(' ')}"/>`; }
      overlay.innerHTML = o;
      svg.dataset.tool = tool;
    }
    function previewPts() {
      const pts = drawing.pts.map((p) => p.slice()); if (!pointer) return pts;
      return pts.concat(orth(pts, pointer).slice(0));
    }
    function dirOf(pts) { if (pts.length < 2) return drawing && drawing.hint || null; const a = pts[pts.length - 2], b = pts[pts.length - 1]; return a[1] === b[1] ? 'h' : a[0] === b[0] ? 'v' : null; }
    function orth(pts, p) {
      const last = pts[pts.length - 1]; if (eq(last, p)) return [];
      if (last[0] === p[0] || last[1] === p[1]) return [p.slice()];
      const pd = dirOf(pts); let vfirst;
      if (pd === 'h') vfirst = true; else if (pd === 'v') vfirst = false; else vfirst = false;
      if (flip) vfirst = !vfirst;
      return vfirst ? [[last[0], p[1]], p.slice()] : [[p[0], last[1]], p.slice()];
    }

    // ---------- historique / sauvegarde ----------
    function notifySel() {
      opt.onSelect && opt.onSelect({ comps: doc.comps.filter((c) => sel.c.has(c.id)), wires: doc.wires.filter((w) => sel.w.has(w.id)) });
    }
    function commit() {
      doc.wires.forEach(normalize); doc.wires = doc.wires.filter((w) => w.pts.length >= 2);
      const s = JSON.stringify(doc); if (s === hist[hi]) { render(); return; }
      hist = hist.slice(0, hi + 1); hist.push(s); if (hist.length > 200) hist.shift(); hi = hist.length - 1;
      markers = []; focusMark = null; project.doc = doc;
      opt.onChange && opt.onChange(doc, project.view = Object.assign({}, v));
      render(); notifySel(); opt.onHistory && opt.onHistory({ undo: hi > 0, redo: false });
    }
    function restore(i) {
      hi = i; doc = JSON.parse(hist[hi]); project.doc = doc; sel = { c: new Set(), w: new Set() }; markers = []; drawing = null;
      opt.onChange && opt.onChange(doc, project.view = Object.assign({}, v)); render(); notifySel();
      opt.onHistory && opt.onHistory({ undo: hi > 0, redo: hi < hist.length - 1 });
    }
    const undo = () => { if (hi > 0) restore(hi - 1); };
    const redo = () => { if (hi < hist.length - 1) restore(hi + 1); };

    // ---------- création d'éléments ----------
    function autoLabel(type) {
      const d = Lib.get(type); if (!settings.autolabel || !d.prefix) return '';
      let max = 0; doc.comps.forEach((c) => { const m = new RegExp('^' + d.prefix + '(\\d+)$').exec(c.label || ''); if (m) max = Math.max(max, +m[1]); });
      return d.prefix + (max + 1);
    }
    function addComp(type, x, y, o = {}) {
      const c = Lib.newComp(type, EE.snap(x), EE.snap(y)); c.rot = o.rot || 0;
      c.label = o.label != null ? o.label : autoLabel(type); if (o.val != null) c.val = o.val;
      doc.comps.push(c); return c;
    }
    function addWire(pts, o = {}) { const w = normalize({ id: EE.uid('w'), pts: pts.map((p) => [p[0], p[1]]), n: o.n || 1, desig: o.desig || '' }); if (w.pts.length >= 2) doc.wires.push(w); return w; }

    function termAt(p) { return EE.Engine.analyze(doc).byCoord[key(p[0], p[1])] || []; }
    function wireEndAt(p) { return doc.wires.some((w) => w.pts.length > 1 && (eq(w.pts[0], p) || eq(w.pts[w.pts.length - 1], p))); }
    function wireInteriorAt(p) { return doc.wires.some((w) => w.pts.length > 1 && EE.Engine.onWire({ x: p[0], y: p[1] }, w, true)); }
    function ensureJunction(p) {
      if (termAt(p).length || wireEndAt(p)) return false;
      if (wireInteriorAt(p)) { doc.comps.push(Lib.newComp('connexion', p[0], p[1])); return true; }
      return false;
    }

    // ---------- outils ----------
    function setTool(t) { tool = t; if (t !== 'wire') drawing = null; if (t !== 'place') armed = t === 'place' ? armed : null; opt.onTool && opt.onTool(tool, armed); render(); }
    function arm(typeId) {
      const d = Lib.get(typeId); if (!d) return;
      if (d.tool === 'wire') { armed = null; tool = 'wire'; } else { armed = typeId; tool = 'place'; }
      drawing = null; opt.onTool && opt.onTool(tool, armed); render();
    }
    function finishWire() {
      if (!drawing) return; const pts = drawing.pts; drawing = null;
      if (pts.length >= 2) { const w = addWire(pts); if (w.pts.length >= 2) { sel = { c: new Set(), w: new Set([w.id]) }; } }
      commit();
    }
    function wireClick(p) {
      if (!drawing) {
        const hint = (() => { const T = termAt(p)[0]; if (!T) return null; const dx = T.comp.x - T.x, dy = T.comp.y - T.y; return Math.abs(dy) >= Math.abs(dx) ? 'h' : 'v'; })();
        const addedJ = ensureJunction(p);
        drawing = { pts: [p], hint, junc: addedJ }; if (addedJ) commit(); render(); return;
      }
      if (eq(drawing.pts[drawing.pts.length - 1], p)) { finishWire(); return; }
      const add = orth(drawing.pts, p); drawing.pts = drawing.pts.concat(add);
      const hasT = termAt(p).length > 0 || wireEndAt(p) && !drawing.pts.slice(0, -1).some((q) => eq(q, p));
      if (!hasT && wireInteriorAt(p)) { ensureJunction(p); finishWire(); return; }
      if (hasT) { finishWire(); return; }
      render();
    }

    // ---------- sélection / opérations ----------
    function select(cids, wids) { sel = { c: new Set(cids || []), w: new Set(wids || []) }; render(); notifySel(); }
    function selectAll() { select(doc.comps.map((c) => c.id), doc.wires.map((w) => w.id)); }
    function del() {
      if (!sel.c.size && !sel.w.size) return;
      doc.comps = doc.comps.filter((c) => !sel.c.has(c.id)); doc.wires = doc.wires.filter((w) => !sel.w.has(w.id));
      sel = { c: new Set(), w: new Set() }; commit(); notifySel();
    }
    function rotate() { if (!sel.c.size) return; transformComps(doc, [...sel.c], (c) => { c.rot = ((c.rot || 0) + 90) % 360; }); commit(); }
    function nudge(dx, dy) { if (!sel.c.size) return; transformComps(doc, [...sel.c], (c) => { c.x += dx; c.y += dy; }); commit(); }
    function copy() {
      if (!sel.c.size && !sel.w.size) return false;
      const comps = doc.comps.filter((c) => sel.c.has(c.id)).map(EE.clone);
      const tk = new Set(); comps.forEach((c) => Lib.get(c.type).term.forEach((tm) => { const p = Lib.termWorld(c, tm); tk.add(key(p.x, p.y)); }));
      const wires = doc.wires.filter((w) => sel.w.has(w.id) || (tk.has(key(w.pts[0][0], w.pts[0][1])) && tk.has(key(w.pts[w.pts.length - 1][0], w.pts[w.pts.length - 1][1])))).map(EE.clone);
      clip = { comps, wires }; pasteN = 0; return true;
    }
    function paste() {
      if (!clip) return; pasteN++; const off = G * 2 * pasteN; const nc = [], nw = [];
      clip.comps.forEach((c) => { const n = EE.clone(c); n.id = EE.uid('c'); n.x += off; n.y += off; doc.comps.push(n); n.label = autoLabel(n.type); nc.push(n.id); });
      clip.wires.forEach((w) => { const n = EE.clone(w); n.id = EE.uid('w'); n.pts = n.pts.map((p) => [p[0] + off, p[1] + off]); doc.wires.push(n); nw.push(n.id); });
      sel = { c: new Set(nc), w: new Set(nw) }; commit(); notifySel();
    }
    function duplicate() { if (copy()) paste(); }
    function updateSelected(patch) {
      doc.comps.forEach((c) => { if (sel.c.has(c.id)) { if ('label' in patch) c.label = patch.label; if ('val' in patch) c.val = patch.val; } });
      doc.wires.forEach((w) => { if (sel.w.has(w.id)) { if ('n' in patch) w.n = Math.max(1, Math.min(8, +patch.n || 1)); if ('desig' in patch) w.desig = patch.desig; } });
      commit(); notifySel();
    }

    // ---------- vue ----------
    function zoomAt(f, cx, cy) {
      const r = svg.getBoundingClientRect(); cx = cx == null ? r.width / 2 : cx; cy = cy == null ? r.height / 2 : cy;
      const nk = Math.max(0.2, Math.min(4, v.k * f)); const wx = (cx - v.x) / v.k, wy = (cy - v.y) / v.k;
      v.k = nk; v.x = cx - wx * nk; v.y = cy - wy * nk; project.view = Object.assign({}, v); render(); opt.onView && opt.onView(v);
    }
    function fit() {
      const r = svg.getBoundingClientRect(), b = EE.Render.bounds(doc), pad = 60;
      const k = Math.max(0.3, Math.min(1.5, Math.min((r.width - 2 * pad) / Math.max(40, b.x2 - b.x1), (r.height - 2 * pad) / Math.max(40, b.y2 - b.y1))));
      v.k = k; v.x = (r.width - (b.x2 - b.x1) * k) / 2 - b.x1 * k; v.y = (r.height - (b.y2 - b.y1) * k) / 2 - b.y1 * k; render(); opt.onView && opt.onView(v);
    }
    function centerOn(x, y) { const r = svg.getBoundingClientRect(); v.x = r.width / 2 - x * v.k; v.y = r.height / 2 - y * v.k; render(); }

    // ---------- vérification ----------
    function verify() { const r = EE.Engine.verify(doc); markers = r.issues.filter((i) => i.x != null && (i.x || i.y || i.ref)); render(); return r; }
    function focusIssue(id) {
      const m = markers.find((i) => i.id === id); if (!m) return; focusMark = id; centerOn(m.x, m.y);
      if (m.ref && m.ref.cid) select([m.ref.cid], []); else if (m.ref && m.ref.wid) select([], [m.ref.wid]); else render();
    }
    function clearMarkers() { markers = []; focusMark = null; render(); }

    // ---------- événements souris / tactile ----------
    function onDown(e) {
      if (e.button != null && e.button > 1) return;
      svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { // pince : zoom + déplacement
        if (drag && drag.type === 'move') { doc = JSON.parse(JSON.stringify(drag.base)); }
        drag = null; const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; return;
      }
      const w = toWorld(e), p = snapP(w);
      if (e.button === 1 || (e.button === 0 && e.altKey)) { drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y }; return; }
      if (simObj) { // mode simulation : on manipule les appareils
        const tg = e.target.closest ? e.target.closest('[data-cid]') : null;
        if (tg && simObj.isInteractive(tg.dataset.cid)) {
          const c = doc.comps.find((x) => x.id === tg.dataset.cid); const lx = Lib.rot(w.x - c.x, w.y - c.y, (360 - (c.rot || 0)) % 360)[0];
          simObj.press(c.id, lx); simHold = c.id; render(); opt.onSimChange && opt.onSimChange(simObj); return;
        }
        drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y }; return;
      }
      const mkHit = markers.find((m) => Math.hypot(w.x - m.x, w.y - m.y) <= 16 / Math.max(0.5, v.k));
      if (mkHit) { focusMark = mkHit.id; render(); opt.onMarker && opt.onMarker(mkHit.id, { x: e.clientX, y: e.clientY }); return; }
      if (tool === 'place' && armed) {
        const c = addComp(armed, p[0], p[1]); sel = { c: new Set([c.id]), w: new Set() }; commit(); notifySel(); return;
      }
      if (tool === 'wire') { wireClick(p); return; }
      const tgt = e.target.closest ? e.target.closest('[data-cid],[data-wid]') : null;
      if (tgt && tgt.dataset.cid) {
        const id = tgt.dataset.cid;
        if (!sel.c.has(id)) { if (!e.shiftKey && !e.ctrlKey) sel = { c: new Set(), w: new Set() }; sel.c.add(id); } else if (e.shiftKey || e.ctrlKey) sel.c.delete(id);
        drag = { type: 'move', start: w, base: JSON.parse(JSON.stringify(doc)), ids: [...sel.c], moved: false, dx: 0, dy: 0 }; render(); notifySel(); return;
      }
      if (tgt && tgt.dataset.wid) {
        const id = tgt.dataset.wid; if (!e.shiftKey && !e.ctrlKey) sel = { c: new Set(), w: new Set() };
        if (sel.w.has(id) && (e.shiftKey || e.ctrlKey)) sel.w.delete(id); else sel.w.add(id); render(); notifySel(); return;
      }
      if (e.shiftKey) { drag = { type: 'box', start: w, cur: w }; return; }
      if (sel.c.size || sel.w.size) { sel = { c: new Set(), w: new Set() }; notifySel(); }
      drag = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y }; render();
    }
    function onMove(e) {
      if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const r = svg.getBoundingClientRect(); v.x += cx - pinch.cx; v.y += cy - pinch.cy; zoomAt(d / pinch.d, cx - r.left, cy - r.top); pinch.d = d; pinch.cx = cx; pinch.cy = cy; return;
      }
      const w = toWorld(e); const np = snapP(w);
      if (!pointer || pointer[0] !== np[0] || pointer[1] !== np[1]) { pointer = np; opt.onPointer && opt.onPointer(np); if (tool === 'place' || drawing) render(); }
      if (!drag) return;
      if (drag.type === 'pan') { v.x = drag.vx + (e.clientX - drag.sx); v.y = drag.vy + (e.clientY - drag.sy); render(); }
      else if (drag.type === 'move') {
        const dx = EE.snap(w.x - drag.start.x), dy = EE.snap(w.y - drag.start.y);
        if (dx === drag.dx && dy === drag.dy) return; drag.dx = dx; drag.dy = dy; drag.moved = dx !== 0 || dy !== 0;
        doc = JSON.parse(JSON.stringify(drag.base)); if (drag.moved) transformComps(doc, drag.ids, (c) => { c.x += dx; c.y += dy; }); render();
      } else if (drag.type === 'box') { drag.cur = w; const x1 = Math.min(drag.start.x, w.x), y1 = Math.min(drag.start.y, w.y); overlay.innerHTML += ''; render(); overlay.insertAdjacentHTML('beforeend', `<rect class="selbox" x="${x1}" y="${y1}" width="${Math.abs(w.x - drag.start.x)}" height="${Math.abs(w.y - drag.start.y)}"/>`); }
    }
    function onUp(e) {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null;
      if (simHold) { if (simObj) simObj.release(simHold); simHold = null; render(); opt.onSimChange && opt.onSimChange(simObj); }
      if (!drag) return;
      const d = drag; drag = null;
      if (d.type === 'move') { if (d.moved) commit(); else { doc = JSON.parse(JSON.stringify(d.base)); render(); } }
      else if (d.type === 'box') {
        const x1 = Math.min(d.start.x, d.cur.x), y1 = Math.min(d.start.y, d.cur.y), x2 = Math.max(d.start.x, d.cur.x), y2 = Math.max(d.start.y, d.cur.y);
        const cs = doc.comps.filter((c) => { const b = Lib.bbox(c); return b.x1 >= x1 && b.x2 <= x2 && b.y1 >= y1 && b.y2 <= y2; }).map((c) => c.id);
        const ws = doc.wires.filter((w) => w.pts.every((p) => p[0] >= x1 && p[0] <= x2 && p[1] >= y1 && p[1] <= y2)).map((w) => w.id); select(cs, ws);
      } else if (d.type === 'pan') { project.view = Object.assign({}, v); opt.onView && opt.onView(v); }
    }
    function onWheel(e) { e.preventDefault(); const r = svg.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }
    function onDbl(e) { const tgt = e.target.closest && e.target.closest('[data-cid]'); if (tgt && tool === 'select') { opt.onEditRequest && opt.onEditRequest(); } }
    function onKey(e) {
      if (!opt.isActive || !opt.isActive()) return;
      if (simObj) return;
      const tg = e.target; if (tg && /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName)) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (ctrl && k.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (ctrl && k.toLowerCase() === 'c') { copy(); }
      else if (ctrl && k.toLowerCase() === 'v') { e.preventDefault(); paste(); }
      else if (ctrl && k.toLowerCase() === 'd') { e.preventDefault(); duplicate(); }
      else if (ctrl && k.toLowerCase() === 'a') { e.preventDefault(); selectAll(); }
      else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); del(); }
      else if (k === 'Escape') { if (drawing) { drawing = null; render(); } else { armed = null; setTool('select'); } }
      else if (k === 'Enter') { if (drawing) finishWire(); }
      else if (!ctrl && k.toLowerCase() === 'r') { rotate(); }
      else if (!ctrl && k.toLowerCase() === 'w') { setTool('wire'); }
      else if (!ctrl && k.toLowerCase() === 'v') { setTool('select'); }
      else if (!ctrl && k.toLowerCase() === 'x') { flip = !flip; render(); }
      else if (k === '+' || k === '=') zoomAt(1.2); else if (k === '-') zoomAt(1 / 1.2);
      else if (k.startsWith('Arrow')) { e.preventDefault(); nudge(k === 'ArrowLeft' ? -G : k === 'ArrowRight' ? G : 0, k === 'ArrowUp' ? -G : k === 'ArrowDown' ? G : 0); }
    }
    svg.addEventListener('pointerdown', onDown); svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp); svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('wheel', onWheel, { passive: false }); svg.addEventListener('dblclick', onDbl);
    svg.addEventListener('contextmenu', (e) => e.preventDefault()); svg.addEventListener('pointerleave', () => { pointer = null; if (tool === 'place') render(); });
    window.addEventListener('keydown', onKey);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => render()) : null; ro && ro.observe(svg);

    const api = {
      get doc() { return doc; }, project, get tool() { return tool; }, get armed() { return armed; },
      render, setTool, arm, undo, redo, copy, paste, duplicate, del, rotate, selectAll, select, updateSelected,
      startSim() { if (simObj) return simObj; drawing = null; armed = null; tool = 'select'; sel = { c: new Set(), w: new Set() }; markers = []; notifySel();
        simObj = EE.Sim.create(doc); simObj.solve();
        simTimer = setInterval(() => { const ch = simObj.tick(0.1); opt.onSimTick && opt.onSimTick(simObj); if (ch) render(); }, 100);
        render(); opt.onSim && opt.onSim(true, simObj); return simObj; },
      stopSim() { if (!simObj) return; clearInterval(simTimer); simObj = null; simHold = null; render(); opt.onSim && opt.onSim(false, null); },
      get sim() { return simObj; },
      setZoom: (k) => zoomAt(Math.max(0.2, Math.min(4, k)) / v.k), zoomIn: () => zoomAt(1.25), zoomOut: () => zoomAt(0.8), fit, centerOn, verify, focusIssue, clearMarkers,
      mutate(fn) { const r = fn(doc); commit(); return r; }, addComp, addWire, commit, finishWire, key, flipElbow() { flip = !flip; render(); },
      get selection() { return { comps: doc.comps.filter((c) => sel.c.has(c.id)), wires: doc.wires.filter((w) => sel.w.has(w.id)) }; },
      get view() { return v; }, get canUndo() { return hi > 0; }, get canRedo() { return hi < hist.length - 1; },
      setSettings(s) { Object.assign(settings, s); render(); }, setMode(m) { project.schema = m; render(); },
      replaceDoc(d) { doc = EE.clone(d); project.doc = doc; hist = [JSON.stringify(doc)]; hi = 0; sel = { c: new Set(), w: new Set() }; markers = []; render(); },
      destroy() { clearInterval(simTimer); window.removeEventListener('keydown', onKey); ro && ro.disconnect(); svg.innerHTML = ''; },
    };
    render(); notifySel();
    return api;
  }
  EE.Editor = { create, transformComps, normalize };
})(window);
