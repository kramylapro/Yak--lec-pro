/* Yak-élec-pro – rendu SVG commun (atelier + exports) */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library, esc = EE.esc;
  const POT_COLOR = { L1: '#b5651d', L2: '#555555', L3: '#8a8a8a', N: '#1e88e5', PE: '#2e9e3f', 'DC+': '#d84315', 'DC-': '#1565c0' };
  const potColor = (pots) => { const p = [...pots][0]; if (!p) return null; if (p.indexOf('.S1') > 0) return '#8e44ad'; if (p.indexOf('.S2') > 0) return '#16a085'; return POT_COLOR[p] || null; };

  function termLabels(c, d) {
    const out = [];
    d.term.forEach((tm) => {
      if (['J', 'P', 'N', 'PE'].includes(tm.id) && d.term.length === 1) return;
      const p = Lib.termWorld(c, tm); const dx = c.x - p.x, dy = c.y - p.y;
      let x, y, a = 'start';
      if (Math.abs(dy) >= Math.abs(dx)) { x = p.x + 5; y = p.y + (dy > 0 ? 11 : -4); }
      else { x = p.x + (dx > 0 ? 4 : -4); y = p.y - 4; a = dx > 0 ? 'start' : 'end'; }
      out.push(`<text x="${x}" y="${y}" font-size="8" text-anchor="${a}" fill="currentColor" stroke="none" opacity=".75" font-family="Arial,sans-serif">${esc(tm.id)}</text>`);
    });
    return out.join('');
  }

  function compMarkup(c, mode, opts = {}) {
    const d = Lib.get(c.type); if (!d) return '';
    const st = opts.sim && opts.sim.comp ? opts.sim.comp[c.id] || {} : null;
    let body = d.body(c, mode, st);
    if (d.extra && d.extra[mode]) body += d.extra[mode](c);
    const fx = st && d.fx ? d.fx(c, st) || {} : {};
    const bb = d.bboxFn ? d.bboxFn(c) : d.bbox;
    if (c.flip) body = body.replace(/<text x="(-?[0-9.]+)"([^>]*?)text-anchor="(start|end|middle)"/g, (m, x, mid, a) => `<text transform="scale(-1,1)" x="${-parseFloat(x)}"${mid}text-anchor="${a === 'start' ? 'end' : a === 'end' ? 'start' : 'middle'}"`);
    const hit = opts.hit ? `<rect x="${bb[0]}" y="${bb[1]}" width="${bb[2] - bb[0]}" height="${bb[3] - bb[1]}" fill="transparent" stroke="none"/>` : '';
    let s = `<g data-cid="${c.id}"><g transform="translate(${c.x},${c.y}) rotate(${c.rot || 0})${c.flip ? ' scale(-1,1)' : ''}">${hit}${fx.u || ''}<g stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g>${fx.o || ''}</g>`;
    if (st && st.tripped) { const bb2 = Lib.bbox(c); s += `<g><circle cx="${bb2.x2 + 4}" cy="${bb2.y1 + 8}" r="9" fill="#e53935" stroke="none"/><text x="${bb2.x2 + 4}" y="${bb2.y1 + 12}" text-anchor="middle" font-size="12" font-weight="700" fill="#fff" stroke="none">!</text></g>`; }
    if (mode !== 'unifilaire' && mode !== 'architectural' && opts.termNames !== false) s += termLabels(c, d);
    // identification + valeur, à droite du composant (jamais pivotées)
    const b = Lib.bbox(c);
    if (!['connexion', 'croisement', 'conducteur', 'p_etiquette'].includes(c.type) && !d.annot) {
      const lx = b.x2 + 6, ly = (b.y1 + b.y2) / 2;
      const lab = c.label ? `<text x="${lx}" y="${ly}" font-size="12" font-weight="700" fill="currentColor" stroke="none" font-family="Arial,sans-serif">${esc(c.label)}</text>` : '';
      const showVal = c.val && !['phase', 'neutre', 'terre'].includes(c.type);
      const val = showVal ? `<text x="${lx}" y="${ly + (c.label ? 13 : 0)}" font-size="10" fill="currentColor" stroke="none" opacity=".8" font-family="Arial,sans-serif">${esc(c.val)}</text>` : '';
      s += lab + val;
    }
    return s + '</g>';
  }

  function tickMarkup(w) {
    const ps = w.pts; let best = 0, bi = 0;
    for (let i = 0; i < ps.length - 1; i++) { const l = Math.abs(ps[i + 1][0] - ps[i][0]) + Math.abs(ps[i + 1][1] - ps[i][1]); if (l > best) { best = l; bi = i; } }
    if (best < 30) return '';
    const a = ps[bi], b = ps[bi + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, horiz = a[1] === b[1];
    const n = Math.max(1, Math.min(8, +w.n || 1)); let s = '';
    if (n > 1) for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 5;
      s += horiz ? `<line x1="${mx + off - 3}" y1="${my + 5}" x2="${mx + off + 3}" y2="${my - 5}" stroke="currentColor" stroke-width="1.6"/>` : `<line x1="${mx - 5}" y1="${my + off + 3}" x2="${mx + 5}" y2="${my + off - 3}" stroke="currentColor" stroke-width="1.6"/>`;
    }
    if (w.desig) s += horiz ? `<text x="${mx}" y="${my - 10}" font-size="10" text-anchor="middle" fill="currentColor" stroke="none" font-family="Arial,sans-serif">${esc(w.desig)}</text>` : `<text x="${mx + 9}" y="${my + 3}" font-size="10" fill="currentColor" stroke="none" font-family="Arial,sans-serif">${esc(w.desig)}</text>`;
    return s;
  }

  function wiresMarkup(doc, mode, opts = {}) {
    const A = opts.A; let s = '';
    if (mode === 'architectural') { doc.wires.forEach((w) => { if (w.pts.length < 2) return; const pts = w.pts.map((p) => p.join(',')).join(' '); s += `<g data-wid="${w.id}">${opts.hit ? `<polyline points="${pts}" fill="none" stroke="transparent" stroke-width="14"/>` : ''}<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="7" stroke-linejoin="miter" stroke-linecap="square" opacity=".85"/></g>`; }); return s; }
    doc.wires.forEach((w) => {
      if (w.pts.length < 2) return;
      let col = 'currentColor', sw = 2, op = 1;
      if (opts.sim && opts.sim.wire && opts.sim.wire[w.id]) {
        const sv = opts.sim.wire[w.id];
        if (sv.short) { col = '#e53935'; sw = 3.2; } else if (sv.pots.length) { col = potColor(new Set(sv.pots)) || '#f0a000'; sw = 2.8; } else op = 0.55;
      } else if (A && mode !== 'unifilaire') { const net = A.nets[A.netOf('W:' + w.id)]; const pc = net && potColor(net.pots); if (pc) col = pc; }
      const pts = w.pts.map((p) => p.join(',')).join(' ');
      s += `<g data-wid="${w.id}">${opts.hit ? `<polyline points="${pts}" fill="none" stroke="transparent" stroke-width="12" stroke-linejoin="round"/>` : ''}<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${sw}" opacity="${op}" stroke-linejoin="round" stroke-linecap="round"${col === '#2e9e3f' ? ' stroke-dasharray="10 3"' : ''}/>`;
      if (mode === 'unifilaire') s += tickMarkup(w);
      s += '</g>';
    });
    return s;
  }

  function docMarkup(doc, mode, opts = {}) {
    let A = opts.A;
    if (!A && mode !== 'unifilaire' && mode !== 'architectural' && !opts.sim) A = EE.Engine.analyze(doc);
    return wiresMarkup(doc, mode, Object.assign({}, opts, { A })) + doc.comps.map((c) => compMarkup(c, mode, opts)).join('');
  }

  function bounds(doc) {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    doc.comps.forEach((c) => { const b = Lib.bbox(c); x1 = Math.min(x1, b.x1); y1 = Math.min(y1, b.y1); x2 = Math.max(x2, b.x2 + 70); y2 = Math.max(y2, b.y2); });
    doc.wires.forEach((w) => w.pts.forEach((p) => { x1 = Math.min(x1, p[0]); y1 = Math.min(y1, p[1]); x2 = Math.max(x2, p[0]); y2 = Math.max(y2, p[1]); }));
    if (!isFinite(x1)) return { x1: 0, y1: 0, x2: 200, y2: 120 };
    return { x1, y1, x2, y2 };
  }

  // SVG autonome (cartouche inclus) pour l'exportation
  function standalone(project, opts = {}) {
    const doc = project.doc, mode = project.schema, b = bounds(doc), M = 40, TBW = 300, TBH = 70;
    const cw = Math.max(b.x2 - b.x1, TBW - 0), ox = b.x1 - M, oy = b.y1 - M;
    const W = Math.round(cw + 2 * M), H = Math.round((b.y2 - b.y1) + 2 * M + TBH + 20);
    const tx = ox + W - TBW - 10, ty = oy + H - TBH - 10;
    const dateS = EE.fmtDate(Date.now());
    const tb = `<g font-family="Arial,sans-serif" fill="#111" stroke="none"><rect x="${tx}" y="${ty}" width="${TBW}" height="${TBH}" fill="#fff" stroke="#111" stroke-width="1.5"/>` +
      `<line x1="${tx}" y1="${ty + 26}" x2="${tx + TBW}" y2="${ty + 26}" stroke="#111"/><text x="${tx + 8}" y="${ty + 18}" font-size="14" font-weight="700">${esc(project.name)}</text>` +
      `<text x="${tx + 8}" y="${ty + 42}" font-size="10">${esc(EE.SCHEMAS[project.schema] || '')} – ${esc(project.install || '')}</text>` +
      `<text x="${tx + 8}" y="${ty + 57}" font-size="9" fill="#444">Yak-élec-pro ${EE.VERSION} – ${esc(dateS)}</text></g>`;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${ox} ${oy} ${W} ${H}" style="color:#111;background:#fff"><rect x="${ox}" y="${oy}" width="${W}" height="${H}" fill="#fff"/>` +
      `<g color="#111">${docMarkup(doc, mode, { hit: false })}</g>${tb}</svg>`;
    return { svg, width: W, height: H };
  }

  EE.Render = { compMarkup, wiresMarkup, docMarkup, bounds, standalone, potColor };
})(window);
