/* Yak-élec-pro – exportations SVG / PNG / PDF */
(function (g) {
  'use strict';
  const EE = g.EE;
  const safe = (s) => (s || 'schema').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'schema';

  function svgBlob(project) { return new Blob([EE.Render.standalone(project).svg], { type: 'image/svg+xml' }); }

  function canvasOf(project, scale) {
    const { svg, width, height } = EE.Render.standalone(project);
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas'); cv.width = Math.round(width * scale); cv.height = Math.round(height * scale);
        const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url); res(cv);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Rendu de l\'image impossible.')); };
      img.src = url;
    });
  }
  const toBlob = (cv, type, q) => new Promise((res) => cv.toBlob(res, type, q));

  async function pngBlob(project, scale = 2) { return toBlob(await canvasOf(project, scale), 'image/png'); }

  function ascii(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '?').replace(/([()\\])/g, '\\$1'); }

  // PDF (page A4, image JPEG haute résolution du schéma + métadonnées)
  async function pdfBlob(project) {
    const cv = await canvasOf(project, 3);
    const jpg = await toBlob(cv, 'image/jpeg', 0.92);
    const jb = new Uint8Array(await jpg.arrayBuffer());
    const wpx = cv.width, hpx = cv.height, land = wpx >= hpx, PW = land ? 842 : 595, PH = land ? 595 : 842, m = 28;
    const sc = Math.min((PW - 2 * m) / wpx, (PH - 2 * m) / hpx), dw = wpx * sc, dh = hpx * sc, dx = (PW - dw) / 2, dy = (PH - dh) / 2;
    const enc = new TextEncoder(); const chunks = []; let off = 0; const xref = [];
    const push = (b) => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); off += u.length; };
    const obj = (n, body) => { xref[n] = off; push(`${n} 0 obj\n${body}\nendobj\n`); };
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[^\x00-\x7f]/g, '')); push('%\x80\x80\x80\x80\n'.replace(/[^\x00-\x7f]/g, ''));
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 5 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 4 0 R >>`);
    const content = `q ${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)} cm /Im0 Do Q`;
    obj(4, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    xref[5] = off; push(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wpx} /Height ${hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jb.length} >>\nstream\n`); push(jb); push('\nendstream\nendobj\n');
    obj(6, `<< /Title (${ascii(project.name)}) /Producer (Yak-élec-pro ${EE.VERSION}) /Creator (Yak-élec-pro) >>`);
    const xo = off; let x = `xref\n0 7\n0000000000 65535 f \n`;
    for (let i = 1; i <= 6; i++) x += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  function download(name, blob) {
    if (g.YakAndroid && g.YakAndroid.saveBase64) { // application Android : enregistrement via le pont natif
      const fr = new FileReader(); fr.onload = () => { try { g.YakAndroid.saveBase64(name, String(fr.result).split(',')[1] || '', blob.type || 'application/octet-stream'); } catch (e) { /* ignore */ } }; fr.readAsDataURL(blob); return;
    }
    const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(blob); document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  // ================= V1.10 : mise en page (A4 / A3 / A2, portrait / paysage, cartouche) =================
  const PAPER = { A4: [595, 842], A3: [842, 1191], A2: [1191, 1684] };
  const SCALES = { '1:20': 20, '1:50': 50, '1:100': 100 };
  function sheetsOf(project) { // toutes les feuilles du projet (la feuille ouverte est dans project.doc)
    if (!project.sheets || !project.sheets.length) return [{ name: 'Feuille 1', doc: project.doc }];
    return project.sheets.map((sh, i) => ({ name: sh.name || 'Feuille ' + (i + 1), doc: i === (project.sheet || 0) ? project.doc : sh.doc || { comps: [], wires: [] } }));
  }
  function layoutPages(project, o = {}) {
    const esc = EE.esc, all = sheetsOf(project), cur = project.sheet || 0;
    const list = o.sheets === 'current' ? [all[cur] ? Object.assign({ no: cur + 1 }, all[cur]) : Object.assign({ no: 1 }, all[0])] : all.map((s, i) => Object.assign({ no: i + 1 }, s));
    const arch = project.schema === 'architectural';
    return list.map((sh) => {
      const b = EE.Render.bounds(sh.doc), bw = Math.max(60, b.x2 - b.x1), bh = Math.max(60, b.y2 - b.y1);
      let [W, H] = PAPER[o.format] || PAPER.A4;
      const land = o.orient === 'paysage' || (o.orient !== 'portrait' && bw > bh);
      if (land) [W, H] = [H, W];
      const M = 22, TBW = Math.min(300, W - 2 * M), TBH = 78, ax = M + 10, ay = M + 10, aw = W - 2 * M - 20, ah = H - 2 * M - 20 - TBH - 8;
      let k, scaleTxt;
      if (arch && SCALES[o.scale]) { k = (250 / SCALES[o.scale] / 20) * 72 / 25.4; scaleTxt = o.scale; } // 1 carreau = 25 cm
      else { k = Math.min(aw / bw, ah / bh, 2.2); scaleTxt = arch ? '≈ 1:' + Math.round(250 / (k * 20 * 25.4 / 72)) : 'Sans échelle (ajusté à la page)'; }
      const over = bw * k > aw + 1 || bh * k > ah + 1;
      const dx = ax + (aw - bw * k) / 2 - b.x1 * k, dy = ay + (ah - bh * k) / 2 - b.y1 * k;
      const tx = W - M - TBW, ty = H - M - TBH, c1 = tx + 160;
      const row = (y, lab, val, x = tx, w = 160) => `<text x="${x + 5}" y="${y + 9}" font-size="6.5" fill="#555">${esc(lab)}</text><text x="${x + 5}" y="${y + 21}" font-size="9.5" font-weight="700">${esc(val)}</text>`;
      const tb = `<g font-family="Arial,sans-serif" fill="#111" stroke="none"><rect x="${tx}" y="${ty}" width="${TBW}" height="${TBH}" fill="#fff" stroke="#111" stroke-width="1.2"/>` +
        `<line x1="${tx}" y1="${ty + 26}" x2="${tx + TBW}" y2="${ty + 26}" stroke="#111" stroke-width=".8"/><line x1="${tx}" y1="${ty + 52}" x2="${tx + TBW}" y2="${ty + 52}" stroke="#111" stroke-width=".8"/><line x1="${c1}" y1="${ty + 26}" x2="${c1}" y2="${ty + TBH}" stroke="#111" stroke-width=".8"/>` +
        `<text x="${tx + 6}" y="${ty + 17}" font-size="12" font-weight="700">${esc((o.title || project.name || '').slice(0, 44))}</text><text x="${tx + TBW - 5}" y="${ty + 17}" font-size="7" text-anchor="end" fill="#555">${esc(o.company || 'Yak-élec-pro')}</text>` +
        row(ty + 26, 'Auteur', o.author || '—') + row(ty + 26, 'Date', o.date || EE.fmtDate(Date.now()), c1, TBW - 160) +
        row(ty + 52, 'Feuille', `${sh.no} / ${all.length} – ${sh.name}`.slice(0, 34)) + row(ty + 52, 'Échelle', scaleTxt.slice(0, 26), c1, TBW - 160) +
        `<text x="${tx + 6}" y="${ty + TBH + 9}" font-size="6" fill="#666">${esc(EE.SCHEMAS[project.schema] || '')} · ${esc(project.install || '')} · Yak-élec-pro ${EE.VERSION}</text></g>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="color:#111;background:#fff"><rect width="${W}" height="${H}" fill="#fff"/>` +
        `<rect x="${M}" y="${M}" width="${W - 2 * M}" height="${H - 2 * M}" fill="none" stroke="#111" stroke-width="1.6"/>` +
        `<clipPath id="cl${sh.no}"><rect x="${M + 2}" y="${M + 2}" width="${W - 2 * M - 4}" height="${ty - M - 6}"/></clipPath>` +
        `<g clip-path="url(#cl${sh.no})"><g color="#111" transform="translate(${dx.toFixed(2)},${dy.toFixed(2)}) scale(${k.toFixed(4)})">${EE.Render.docMarkup(sh.doc, project.schema, { hit: false })}</g></g>${tb}</svg>`;
      return { svg, W, H, over, name: sh.name, scaleTxt };
    });
  }
  function rasterSvg(svg, W, H, scale) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })); const img = new Image();
      img.onload = () => { const cv = document.createElement('canvas'); cv.width = Math.round(W * scale); cv.height = Math.round(H * scale); const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); res(cv); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Rendu de la page impossible.')); }; img.src = url;
    });
  }
  async function pagedPdf(project, o = {}) {
    const pages = layoutPages(project, o), sc = o.format === 'A2' ? 1.6 : o.format === 'A3' ? 2.2 : 3;
    const imgs = [];
    for (const pg of pages) { const cv = await rasterSvg(pg.svg, pg.W, pg.H, sc); imgs.push({ jb: new Uint8Array(await (await toBlob(cv, 'image/jpeg', 0.9)).arrayBuffer()), wpx: cv.width, hpx: cv.height, W: pg.W, H: pg.H }); }
    const enc = new TextEncoder(); const chunks = []; let off = 0; const xref = [];
    const push = (b) => { const u = typeof b === 'string' ? enc.encode(b) : b; chunks.push(u); off += u.length; };
    const obj = (n, body) => { xref[n] = off; push(`${n} 0 obj\n${body}\nendobj\n`); };
    const n = imgs.length, kids = imgs.map((_, i) => `${3 + i * 3} 0 R`).join(' '), info = 3 + n * 3;
    push('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
    imgs.forEach((im, i) => {
      const pn = 3 + i * 3; const content = `q ${im.W} 0 0 ${im.H} 0 0 cm /Im${i} Do Q`;
      obj(pn, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${im.W} ${im.H}] /Resources << /XObject << /Im${i} ${pn + 2} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${pn + 1} 0 R >>`);
      obj(pn + 1, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      xref[pn + 2] = off; push(`${pn + 2} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${im.wpx} /Height ${im.hpx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.jb.length} >>\nstream\n`); push(im.jb); push('\nendstream\nendobj\n');
    });
    obj(info, `<< /Title (${ascii(project.name)}) /Author (${ascii(o.author || '')}) /Producer (Yak-elec-pro ${EE.VERSION}) >>`);
    const xo = off; let x = `xref\n0 ${info + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= info; i++) x += String(xref[i]).padStart(10, '0') + ' 00000 n \n';
    push(x + `trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xo}\n%%EOF\n`);
    return { blob: new Blob(chunks, { type: 'application/pdf' }), pages };
  }
  function printPages(project, o = {}) { // impression directe par le navigateur (une page par feuille)
    const pages = layoutPages(project, o); const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0'; document.body.appendChild(f);
    const [W, H] = [pages[0].W, pages[0].H];
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${W}pt ${H}pt;margin:0}body{margin:0}.pg{width:${W}pt;height:${H}pt;page-break-after:always;overflow:hidden}.pg svg{width:100%;height:100%}</style><\/head><body>${pages.map((p) => `<div class="pg">${p.svg}</div>`).join('')}<\/body><\/html>`;
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* impression indisponible */ } setTimeout(() => f.remove(), 60000); };
    return pages;
  }

  // ================= V1.10 : export DXF (AutoCAD, ASCII R12) =================
  function mul(m, n) { return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; }
  function parseTf(s) {
    let m = [1, 0, 0, 1, 0, 0]; const re = /(translate|rotate|scale)\(([^)]*)\)/g; let r;
    while ((r = re.exec(s || ''))) {
      const a = r[2].split(/[\s,]+/).filter(Boolean).map(Number);
      if (r[1] === 'translate') m = mul(m, [1, 0, 0, 1, a[0] || 0, a[1] || 0]);
      else if (r[1] === 'scale') m = mul(m, [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0]);
      else { const t = (a[0] || 0) * Math.PI / 180, c = Math.cos(t), sn = Math.sin(t); const cx = a[1] || 0, cy = a[2] || 0; m = mul(m, [1, 0, 0, 1, cx, cy]); m = mul(m, [c, sn, -sn, c, 0, 0]); m = mul(m, [1, 0, 0, 1, -cx, -cy]); }
    }
    return m;
  }
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  function pathPolys(d) { // échantillonne un chemin SVG en polylignes (M L H V A Q C Z, absolus et relatifs)
    const polys = []; let cur = null, x = 0, y = 0, sx = 0, sy = 0;
    const toks = (d.match(/[a-zA-Z]|-?[0-9]*\.?[0-9]+(?:e-?[0-9]+)?/g) || []); let i = 0, cmd = '';
    const nb = () => parseFloat(toks[i++]);
    const start = () => { cur = [[x, y]]; polys.push(cur); };
    while (i < toks.length) {
      if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      if (C === 'Z') { if (cur) cur.push([sx, sy]); x = sx; y = sy; cur = null; continue; }
      if (C === 'M') { const a = nb(), b = nb(); x = rel ? x + a : a; y = rel ? y + b : b; sx = x; sy = y; start(); cmd = rel ? 'l' : 'L'; continue; }
      if (!cur) start();
      if (C === 'L') { const a = nb(), b = nb(); x = rel ? x + a : a; y = rel ? y + b : b; cur.push([x, y]); }
      else if (C === 'H') { const a = nb(); x = rel ? x + a : a; cur.push([x, y]); }
      else if (C === 'V') { const b = nb(); y = rel ? y + b : b; cur.push([x, y]); }
      else if (C === 'Q') { const x1 = nb(), y1 = nb(), x2 = nb(), y2 = nb(); const cx = rel ? x + x1 : x1, cy = rel ? y + y1 : y1, ex = rel ? x + x2 : x2, ey = rel ? y + y2 : y2; for (let k = 1; k <= 8; k++) { const t = k / 8; cur.push([(1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ey]); } x = ex; y = ey; }
      else if (C === 'C') { const v = [nb(), nb(), nb(), nb(), nb(), nb()]; const P = rel ? v.map((q, j) => q + (j % 2 ? y : x)) : v; for (let k = 1; k <= 10; k++) { const t = k / 10, u = 1 - t; cur.push([u * u * u * x + 3 * u * u * t * P[0] + 3 * u * t * t * P[2] + t * t * t * P[4], u * u * u * y + 3 * u * u * t * P[1] + 3 * u * t * t * P[3] + t * t * t * P[5]]); } x = P[4]; y = P[5]; }
      else if (C === 'A') {
        let rx = Math.abs(nb()), ry = Math.abs(nb()); const ph = nb() * Math.PI / 180, fa = nb(), fs = nb(); let ex = nb(), ey = nb(); if (rel) { ex += x; ey += y; }
        if (!rx || !ry) { cur.push([ex, ey]); x = ex; y = ey; continue; }
        const cp = Math.cos(ph), sp = Math.sin(ph), dx2 = (x - ex) / 2, dy2 = (y - ey) / 2, x1 = cp * dx2 + sp * dy2, y1 = -sp * dx2 + cp * dy2;
        const lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        const sg = fa === fs ? -1 : 1, num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1, co = sg * Math.sqrt(Math.max(0, num / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
        const cxp = co * rx * y1 / ry, cyp = -co * ry * x1 / rx, cx = cp * cxp - sp * cyp + (x + ex) / 2, cy = sp * cxp + cp * cyp + (y + ey) / 2;
        const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
        const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry); let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
        if (!fs && dt > 0) dt -= 2 * Math.PI; if (fs && dt < 0) dt += 2 * Math.PI;
        const nseg = Math.max(4, Math.ceil(Math.abs(dt) / (Math.PI / 12)));
        for (let k = 1; k <= nseg; k++) { const t = t1 + dt * k / nseg; cur.push([cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp]); }
        x = ex; y = ey;
      } else { i++; }
    }
    return polys.filter((p) => p.length > 1);
  }
  function dxfFromMarkup(markup, unit) {
    const ents = [], f = (v) => (Math.round(v * 1000) / 1000).toString(), Y = (v) => -v;
    const line = (layer, a, b) => ents.push(`0\nLINE\n8\n${layer}\n10\n${f(a[0] * unit)}\n20\n${f(Y(a[1]) * unit)}\n30\n0\n11\n${f(b[0] * unit)}\n21\n${f(Y(b[1]) * unit)}\n31\n0`);
    const poly = (layer, pts) => { for (let i = 0; i < pts.length - 1; i++) line(layer, pts[i], pts[i + 1]); };
    const stack = [{ m: [1, 0, 0, 1, 0, 0], layer: 'SYMBOLES' }];
    const attr = (s, n) => { const r = new RegExp('\\s' + n + '="([^"]*)"').exec(s); return r ? r[1] : null; };
    const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>|([^<]+)/g; let r, pendingText = null;
    while ((r = re.exec(markup))) {
      if (r[5] != null) { if (pendingText) pendingText.txt += r[5]; continue; }
      const close = r[1] === '/', tag = r[2], at = r[3], selfc = r[4] === '/' || /^(line|circle|rect|path|polyline)$/.test(tag) && r[4] === '/';
      const top = stack[stack.length - 1];
      if (close) { if (tag === 'g') stack.pop(); if (tag === 'text' && pendingText) { const t = pendingText; pendingText = null; const txt = t.txt.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(); if (txt) { const sc = Math.hypot(t.m[0], t.m[1]); const p = ap(t.m, t.x, t.y); const h = t.size * sc * unit * 0.72; const al = t.anc === 'middle' ? 1 : t.anc === 'end' ? 2 : 0; const ent = `0\nTEXT\n8\nTEXTES\n10\n${f(p[0] * unit)}\n20\n${f(Y(p[1]) * unit)}\n30\n0\n40\n${f(h)}\n1\n${txt}` + (al ? `\n72\n${al}\n11\n${f(p[0] * unit)}\n21\n${f(Y(p[1]) * unit)}\n31\n0` : ''); ents.push(ent); } } continue; }
      if (/^(animate|animateTransform|defs|clipPath|pattern)$/.test(tag)) continue;
      const stroke = attr(at, 'stroke'), fill = attr(at, 'fill');
      const invisible = stroke === 'none' && (!fill || fill === 'transparent' || fill === 'none' || /^#/.test(fill) && tag !== 'circle') || stroke === 'transparent';
      const m = mul(top.m, parseTf(attr(at, 'transform')));
      if (tag === 'g') { if (!selfc) stack.push({ m, layer: attr(at, 'data-wid') ? 'CONDUCTEURS' : attr(at, 'data-cid') ? 'SYMBOLES' : top.layer }); continue; }
      if (tag === 'text') { pendingText = { m, x: +attr(at, 'x') || 0, y: +attr(at, 'y') || 0, size: +attr(at, 'font-size') || 10, anc: attr(at, 'text-anchor') || 'start', txt: '' }; continue; }
      if (invisible) continue;
      const L = top.layer;
      if (tag === 'line') line(L, ap(m, +attr(at, 'x1'), +attr(at, 'y1')), ap(m, +attr(at, 'x2'), +attr(at, 'y2')));
      else if (tag === 'polyline') { const pts = (attr(at, 'points') || '').trim().split(/\s+/).map((q) => q.split(',').map(Number)).map((q) => ap(m, q[0], q[1])); poly(L, pts); }
      else if (tag === 'rect') { const x = +attr(at, 'x') || 0, y = +attr(at, 'y') || 0, w = +attr(at, 'width'), h = +attr(at, 'height'); poly(L, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]].map((q) => ap(m, q[0], q[1]))); }
      else if (tag === 'circle') { const c = ap(m, +attr(at, 'cx') || 0, +attr(at, 'cy') || 0), rr = (+attr(at, 'r')) * Math.hypot(m[0], m[1]); ents.push(`0\nCIRCLE\n8\n${L}\n10\n${f(c[0] * unit)}\n20\n${f(Y(c[1]) * unit)}\n30\n0\n40\n${f(rr * unit)}`); }
      else if (tag === 'path') pathPolys(attr(at, 'd') || '').forEach((pl) => poly(L, pl.map((q) => ap(m, q[0], q[1]))));
    }
    return ents;
  }
  function dxfBlob(project) {
    const arch = project.schema === 'architectural', unit = arch ? 12.5 : 0.25; // mm par unité de dessin (1 carreau = 5 mm, ou 25 cm en plan)
    const ents = []; let oy = 0;
    sheetsOf(project).forEach((sh, i) => { // feuilles empilées verticalement
      const b = EE.Render.bounds(sh.doc); const mk = `<g transform="translate(0,${oy - b.y1})">${EE.Render.docMarkup(sh.doc, project.schema, { hit: false })}<text x="${b.x1}" y="${b.y1 - 30}" font-size="16">${EE.esc((project.name || '') + ' – ' + sh.name)}</text></g>`;
      ents.push(...dxfFromMarkup(mk, unit)); oy += (b.y2 - b.y1) + 200; void i;
    });
    const layers = ['CONDUCTEURS', 'SYMBOLES', 'TEXTES'];
    const head = `999\nYak-elec-pro ${EE.VERSION} - unites : millimetres (${arch ? '1 carreau = 250 mm' : '1 carreau = 5 mm'})\n0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$DWGCODEPAGE\n3\nANSI_1252\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n${layers.length}\n` + layers.map((l, i) => `0\nLAYER\n2\n${l}\n70\n0\n62\n${[1, 7, 5][i]}\n6\nCONTINUOUS`).join('\n') + '\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
    const txt = head + ents.join('\n') + '\n0\nENDSEC\n0\nEOF\n';
    const bytes = new Uint8Array(txt.length); for (let i = 0; i < txt.length; i++) { const c = txt.charCodeAt(i); bytes[i] = c < 256 ? c : c === 0x2013 || c === 0x2014 ? 0x2d : c === 0x2019 ? 0x27 : c === 0x2026 ? 0x2e : 0x3f; }
    return new Blob([bytes], { type: 'application/dxf' });
  }

  EE.Export = { safe, svgBlob, pngBlob, pdfBlob, download, layoutPages, pagedPdf, printPages, dxfBlob, dxfFromMarkup, pathPolys, sheetsOf, PAPER,
    async run(kind, project) {
      const base = safe(project.name);
      if (kind === 'svg') download(base + '.svg', svgBlob(project));
      else if (kind === 'png') download(base + '.png', await pngBlob(project, 2));
      else if (kind === 'pdf') download(base + '.pdf', await pdfBlob(project));
      else if (kind === 'dxf') download(base + '.dxf', dxfBlob(project));
      else if (kind === 'json') download(base + '.eep.json', new Blob([EE.Store.Projects.exportJSON(project.id)], { type: 'application/json' }));
    } };
})(window);
