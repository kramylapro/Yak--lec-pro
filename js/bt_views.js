/* Yak-élec-pro V1.11 – Bureau d'études BT : vues et documents (répartition, enveloppe, 2D, 3D, échauffement, sélectivité,
   nomenclature et chiffrage, étiquettes, dossier d'étude, Excel / CSV / SVG, schéma unifilaire automatique, bibliothèque). */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, B = () => EE.BT, LIB = () => EE.BTLib.all(), S = () => EE.BTUI;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => EE.app.ui;
  const f1 = (x, d = 1) => (x == null || !isFinite(x) ? '—' : Number(x).toFixed(d).replace('.', ','));
  const money = (v) => S().money(v);
  const curB = () => S().curBoard() || S().st.boards[0];
  const layOf = (b) => (S().bom && S().bom.layouts[b.id]) || B().layout(S().st, b, S().res, LIB());
  const encOf = (b, lay) => { lay = lay || layOf(b); if (lay.enc !== undefined) return lay.enc; const e = B().enclosures(S().st, b, lay, LIB()); return (b.enc && e.find((x) => x.ref === b.enc)) || e[0] || null; };
  const boardPicker = (b) => `<label class="small">Tableau <select class="bpick">${S().st.boards.map((x) => `<option value="${x.id}"${x.id === b.id ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>`;
  const bindPicker = (el) => $$('.bpick', el).forEach((s) => (s.onchange = () => { S().sel = { kind: 'board', id: s.value }; S().renderAll(); }));
  const dl = (name, text, type) => EE.Export.download(name, new Blob(['﻿' + text], { type: type || 'text/csv;charset=utf-8' }));
  const csv = (rows) => rows.map((r) => r.map((v) => { const s = v == null ? '' : typeof v === 'number' ? String(Math.round(v * 1000) / 1000).replace('.', ',') : String(v); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\r\n');
  const base = () => EE.Export.safe(S().st.name);

  // ---------- répartition ----------
  function repart(el) {
    const b = curB(), lay = layOf(b), st = S().st;
    el.innerHTML = `<div class="bar"><h2>Répartition – ${esc(b.name)}</h2><div class="grow"></div>${boardPicker(b)}<label class="small">Mode <select id="rp-m"><option value="opt"${lay.layoutMode === 'opt' ? ' selected' : ''}>Optimisée</option><option value="trad"${lay.layoutMode === 'trad' ? ' selected' : ''}>Traditionnelle</option></select></label><label class="small">Modules / rangée <select id="rp-n">${[13, 18, 24].map((n) => `<option${n === lay.perRow ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <p class="small muted">Optimisée : chaque différentiel reste avec ses départs, les groupes les plus gros sont placés d'abord, puis on comble les places libres (moins de rangées, peignes plus courts). Traditionnelle : appareils dans l'ordre des circuits. Réserve demandée : ${st.rules.reserve} %.</p>
      <div class="chips"><span class="lvl">${lay.rows.length} rangée(s) de ${lay.perRow} modules</span><span class="lvl">${f1(lay.used, 1)} modules occupés</span><span class="lvl">${f1(lay.free, 1)} modules libres (réserve ${f1(lay.reservePct, 0)} %)</span><span class="lvl">${lay.combs.length} peigne(s) horizontal(aux)</span><span class="lvl">${lay.vCombs} liaison(s) entre rangées</span>${lay.busbar ? `<span class="lvl">Jeu de barres ${lay.busbar.In} A</span>` : ''}${lay.plate.length ? `<span class="lvl">${lay.plate.length} appareil(s) sur platine</span>` : ''}</div>
      ${lay.warns.map((w) => `<div class="rep warn">⚠ ${esc(w)}</div>`).join('')}
      <div class="rows2d" style="--pr:${lay.perRow}">${lay.rows.map((r) => `<div class="row2d"><span class="rn">R${r.n}</span><div class="rail">${r.items.map((d) => `<div class="dev ${d.role} ${d.missing ? 'miss' : ''}" style="flex:0 0 calc(${d.mods} / var(--pr) * 100%)" title="${esc(d.name)}"><b>${esc(d.role === 'rcd' ? 'ID' : d.role === 'head' ? 'GÉN.' : d.In + 'A')}</b><small>${esc(d.label)}</small><i>${esc(d.group !== 'libre' && d.group !== 'head' ? d.group : '')}</i></div>`).join('')}${r.free > 0 ? `<div class="dev free" style="flex:0 0 calc(${r.free} / var(--pr) * 100%)"><small>libre ${f1(r.free, 1)}</small></div>` : ''}</div></div>`).join('')}</div>
      ${lay.plate.length ? `<h3>Appareils sur platine</h3><ul>${lay.plate.map((d) => `<li>${esc(d.label)} – ${esc(d.name)} (${d.W || '?'}×${d.H || '?'} mm)</li>`).join('')}</ul>` : ''}
      <h3>Peignes</h3>${lay.combs.length ? `<table class="qt small"><thead><tr><th>Rangée</th><th>Groupe</th><th>Type</th><th class="r">Modules</th></tr></thead><tbody>${lay.combs.map((c) => `<tr><td>${c.row}</td><td>${esc(c.group)}</td><td>${esc(c.poles)}</td><td class="r">${f1(c.mods, 1)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small">Aucun peigne nécessaire.</p>'}`;
    bindPicker(el); $('#rp-m').onchange = (e) => { b.layout = e.target.value; S().changed(); }; $('#rp-n').onchange = (e) => { b.perRow = +e.target.value; S().changed(); };
  }

  // ---------- enveloppe ----------
  function enc(el) {
    const b = curB(), lay = layOf(b), E = B().enclosures(S().st, b, lay, LIB()), cur = encOf(b, lay);
    el.innerHTML = `<div class="bar"><h2>Enveloppe – ${esc(b.name)}</h2><div class="grow"></div>${boardPicker(b)}</div><p class="small muted">Besoin : ${f1(lay.used, 1)} modules + ${S().st.rules.reserve} % de réserve${lay.plate.length ? ` et ${lay.plate.length} appareil(s) sur platine (≈ ${lay.plate.reduce((a, d) => a + (+d.H || 200) + 100, 0)} mm de hauteur)` : ''}. Hauteur des plastrons : 150 mm ; 300 mm réservés au raccordement dans les armoires.</p>
      ${E.length ? `<div class="qwrap"><table class="qt"><thead><tr><th>Enveloppe</th><th class="r">L × H × P (mm)</th><th class="r">Nb</th><th class="r">Rangées (utilisées / dispo.)</th><th class="r">Compartiments</th><th class="r">Volume (m³)</th><th class="r">Réserve</th><th class="r">Prix</th><th></th></tr></thead><tbody>${E.map((e) => `<tr class="${cur && cur.ref === e.ref ? 'on' : ''}"><td><b>${esc(e.name)}</b><br><small>${esc(e.fab)} – ${esc(e.ref)}</small></td><td class="r">${e.W} × ${e.H} × ${e.D}</td><td class="r">${e.count}</td><td class="r">${e.rowsUsed} / ${e.rows * e.count}</td><td class="r">${e.compartments}</td><td class="r">${f1(e.volume, 3)}</td><td class="r">${f1(e.reservePct, 0)} %</td><td class="r">${e.price ? money(e.price) : '—'}</td><td>${cur && cur.ref === e.ref ? '✔ retenue' : `<button class="btn small" data-e="${esc(e.ref)}">Retenir</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="rep bad">Aucune enveloppe de la bibliothèque ne convient : ajoutez-en une (onglet Bibliothèque) ou divisez le tableau.</div>'}`;
    bindPicker(el); $$('[data-e]', el).forEach((x) => (x.onclick = () => { b.enc = x.dataset.e; S().changed(); }));
  }

  // ---------- vue 2D (face, côté, intérieur) ----------
  let v2mode = 'face';
  function svg2dOf(b, mode) {
    const lay = layOf(b), e = encOf(b, lay) || { W: 450, H: 125 + lay.rows.length * 150, D: 150, perRow: lay.perRow, kind: 'coffret', name: 'Enveloppe non choisie' };
    const W = e.W, H = e.H, D = e.D, mw = 18, pr = lay.perRow, rowW = pr * mw, x0 = (W - rowW) / 2, top = e.kind === 'armoire' ? 150 : 60;
    let s = '';
    if (mode === 'cote') {
      s += `<rect x="0" y="0" width="${D}" height="${H}" fill="#e9edf2" stroke="#333" stroke-width="2"/><line x1="10" y1="0" x2="10" y2="${H}" stroke="#666"/>`;
      lay.rows.forEach((r, i) => { const y = top + i * 150 + 75; s += `<rect x="12" y="${y - 4}" width="8" height="8" fill="#999"/><rect x="20" y="${y - 42}" width="${Math.min(D - 30, 75)}" height="85" fill="#fff" stroke="#555"/>`; });
      s += `<text x="${D / 2}" y="${H + 24}" text-anchor="middle" font-size="16">Profondeur ${D} mm</text>`;
      return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 ${D + 40} ${H + 60}" font-family="Arial,sans-serif">${s}</svg>`, W: D, H };
    }
    s += `<rect x="0" y="0" width="${W}" height="${H}" rx="8" fill="${mode === 'face' ? '#f1f3f6' : '#dfe4ea'}" stroke="#333" stroke-width="3"/>`;
    if (mode === 'interieur') { s += `<rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="#cfd6de" stroke="#888"/>`; for (let i = 0; i <= lay.rows.length; i++) { const y = top + i * 150 - 12; s += `<rect x="${x0 - 30}" y="${y - 10}" width="${rowW + 60}" height="20" fill="#9aa5b1" opacity=".6"/>`; } }
    lay.rows.forEach((r, i) => {
      const y = top + i * 150 + 30; let x = x0;
      if (mode === 'face') s += `<rect x="${x0 - 12}" y="${y - 18}" width="${rowW + 24}" height="121" rx="4" fill="#fff" stroke="#bbb"/>`;
      s += `<rect x="${x0}" y="${y + 38}" width="${rowW}" height="8" fill="#8a8f96"/>`; // rail DIN
      r.items.forEach((d) => { const w = d.mods * mw; const col = d.role === 'rcd' ? '#dbe9ff' : d.role === 'head' ? '#ffe3c2' : d.missing ? '#ffd6d6' : '#ffffff'; s += `<rect x="${x + 1}" y="${y}" width="${w - 2}" height="85" rx="3" fill="${col}" stroke="#333"/><rect x="${x + w / 2 - 4}" y="${y + 30}" width="8" height="18" fill="#333"/><text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" font-size="${w < 20 ? 7 : 9}" font-weight="700">${esc(d.role === 'rcd' ? 'ID' : d.role === 'head' ? 'GÉN' : d.In + 'A')}</text><text x="${x + w / 2}" y="${y + 104}" text-anchor="middle" font-size="7">${esc(String(d.label).slice(0, Math.max(4, Math.floor(w / 4))))}</text>`; x += w; });
      if (mode === 'interieur') lay.combs.filter((c) => c.row === r.n).forEach(() => { s += `<line x1="${x0}" y1="${y + 70}" x2="${x}" y2="${y + 70}" stroke="#c77700" stroke-width="3"/>`; });
      s += `<text x="${x0 - 18}" y="${y + 46}" text-anchor="end" font-size="12" fill="#555">R${r.n}</text>`;
    });
    let py = top + lay.rows.length * 150 + 20;
    lay.plate.forEach((d) => { const w = Math.min(W - 60, +d.W || 140), h = +d.H || 200; s += `<rect x="${(W - w) / 2}" y="${py}" width="${w}" height="${h}" fill="#fff3e0" stroke="#333"/><text x="${W / 2}" y="${py + h / 2}" text-anchor="middle" font-size="12" font-weight="700">${esc(d.label)}</text><text x="${W / 2}" y="${py + h / 2 + 16}" text-anchor="middle" font-size="9">${esc(d.name.slice(0, 40))}</text>`; py += h + 100; });
    if (lay.busbar && mode !== 'face') for (let k = 0; k < 4; k++) s += `<rect x="${W - 70 + k * 12}" y="40" width="6" height="${H - 80}" fill="${['#b5651d', '#333', '#888', '#1e88e5'][k]}"/>`;
    s += `<text x="${W / 2}" y="${H + 26}" text-anchor="middle" font-size="16">${esc(e.name || '')} – ${W} × ${H} mm</text>`;
    return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 ${W + 40} ${H + 70}" font-family="Arial,sans-serif">${s}</svg>`, W, H };
  }
  function v2d(el) {
    const b = curB(), o = svg2dOf(b, v2mode);
    el.innerHTML = `<div class="bar"><h2>Vue 2D – ${esc(b.name)}</h2><div class="grow"></div>${boardPicker(b)}<div class="chips" style="margin:0">${[['face', 'Face (plastrons)'], ['interieur', 'Intérieur'], ['cote', 'Côté']].map(([k, l]) => `<button class="chip${v2mode === k ? ' on' : ''}" data-v="${k}">${l}</button>`).join('')}</div><button class="btn small" id="v2-svg">SVG</button></div>
      <div class="v2box" style="--z:${S().zoom}">${o.svg}</div><p class="small muted">Dimensions des appareils d'après la bibliothèque (1 module = 18 mm). Rails DIN, plastrons, goulottes (vue intérieure, en gris), peignes (orange) et jeu de barres. Zoom : ruban ou menu Affichage.</p>`;
    bindPicker(el); $$('[data-v]', el).forEach((x) => (x.onclick = () => { v2mode = x.dataset.v; v2d(el); })); $('#v2-svg').onclick = () => svg2d();
  }
  function svg2d() { const b = curB(); EE.Export.download(base() + '_' + EE.Export.safe(b.name) + '_' + v2mode + '.svg', new Blob([svg2dOf(b, v2mode).svg], { type: 'image/svg+xml' })); }

  // ---------- vue 3D (projection, rotation à la souris ou au doigt) ----------
  const cam = { yaw: -0.6, pitch: 0.35, k: 1, door: false };
  function boxes3d(b) {
    const lay = layOf(b), e = encOf(b, lay) || { W: 450, H: 125 + lay.rows.length * 150, D: 150 }; const W = e.W, H = e.H, D = e.D, out = [];
    const box = (x, y, z, w, h, d, col, alpha) => out.push({ x, y, z, w, h, d, col, alpha: alpha == null ? 1 : alpha });
    box(0, 0, 0, W, H, 4, '#c9d0d8'); box(0, 0, 0, 4, H, D, '#d7dde3', 0.9); box(W - 4, 0, 0, 4, H, D, '#d7dde3', 0.9); box(0, 0, 0, W, 4, D, '#d7dde3', 0.9); box(0, H - 4, 0, W, 4, D, '#d7dde3', 0.9);
    const mw = 18, pr = lay.perRow, x0 = (W - pr * mw) / 2, top = e.kind === 'armoire' ? 150 : 60;
    lay.rows.forEach((r, i) => { const y = top + i * 150 + 30; box(x0, y + 38, 6, pr * mw, 8, 10, '#8a8f96'); let x = x0; r.items.forEach((d) => { const w = d.mods * mw; box(x + 1, y, 16, w - 2, 85, Math.min(D - 30, 70), d.role === 'rcd' ? '#9fc3ff' : d.role === 'head' ? '#ffc27a' : d.missing ? '#ff9a9a' : '#f4f4f4'); x += w; }); });
    let py = top + lay.rows.length * 150 + 20; lay.plate.forEach((d) => { const w = Math.min(W - 60, +d.W || 140), h = +d.H || 200; box((W - w) / 2, py, 6, w, h, Math.min(D - 20, +d.D || 100), '#ffd9a8'); py += h + 100; });
    if (lay.busbar) for (let k = 0; k < 4; k++) box(W - 70 + k * 12, 40, 20, 6, H - 80, 10, ['#b5651d', '#333', '#888', '#1e88e5'][k]);
    if (cam.door) box(0, 0, D, W, H, 3, '#9fb3c8', 0.35);
    return { list: out, W, H, D };
  }
  function render3d(b, Wpx, Hpx) {
    const { list, W, H, D } = boxes3d(b); const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const sc = Math.min(Wpx, Hpx) / Math.max(W, H, D) * 0.8 * cam.k;
    const P = (x, y, z) => { x -= W / 2; y -= H / 2; z -= D / 2; const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [Wpx / 2 + x1 * sc, Hpx / 2 + y1 * sc, z2]; };
    const faces = [];
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.min(255, Math.round(((n >> 16) & 255) * f)), g2 = Math.min(255, Math.round(((n >> 8) & 255) * f)), b2 = Math.min(255, Math.round((n & 255) * f)); return `rgb(${r},${g2},${b2})`; };
    list.forEach((o) => {
      const v = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]].map(([a, c, e]) => P(o.x + a * o.w, o.y + c * o.h, o.z + e * o.d));
      [[0, 1, 2, 3, 0.8], [4, 5, 6, 7, 1], [0, 1, 5, 4, 0.9], [3, 2, 6, 7, 0.7], [0, 3, 7, 4, 0.85], [1, 2, 6, 5, 0.75]].forEach(([a, c, d, e, f]) => { const pts = [v[a], v[c], v[d], v[e]]; faces.push({ z: pts.reduce((s, p) => s + p[2], 0) / 4, pts, fill: shade(o.col, f), alpha: o.alpha }); });
    });
    faces.sort((a, c) => c.z - a.z);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Wpx} ${Hpx}" width="100%" height="100%">${faces.map((f) => `<polygon points="${f.pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${f.fill}" fill-opacity="${f.alpha}" stroke="#333" stroke-width=".4" stroke-opacity=".5"/>`).join('')}</svg>`;
  }
  function v3d(el) {
    const b = curB();
    el.innerHTML = `<div class="bar"><h2>Vue 3D – ${esc(b.name)}</h2><div class="grow"></div>${boardPicker(b)}<label class="chk small"><input type="checkbox" id="v3-door"${cam.door ? ' checked' : ''}> Porte</label><button class="btn small" id="v3-r">Vue initiale</button><button class="btn small" id="v3-f">Face</button><button class="btn small" id="v3-zo">−</button><button class="btn small" id="v3-zi">+</button></div>
      <div class="v3box" id="v3box"></div><p class="small muted">Faites glisser pour tourner, molette ou + / − pour zoomer. Dimensions d'après la bibliothèque (enveloppe, rangées, appareils, platines, jeu de barres).</p>`;
    bindPicker(el); const box = $('#v3box');
    const draw = () => { const r = box.getBoundingClientRect(); box.innerHTML = render3d(b, Math.max(300, r.width), Math.max(300, r.height)); };
    draw(); let drag = null;
    box.onpointerdown = (e) => { drag = { x: e.clientX, y: e.clientY, yaw: cam.yaw, pitch: cam.pitch }; box.setPointerCapture(e.pointerId); };
    box.onpointermove = (e) => { if (!drag) return; cam.yaw = drag.yaw + (e.clientX - drag.x) * 0.01; cam.pitch = Math.max(-1.4, Math.min(1.4, drag.pitch + (e.clientY - drag.y) * 0.01)); draw(); };
    box.onpointerup = () => { drag = null; }; box.onwheel = (e) => { e.preventDefault(); cam.k = Math.max(0.3, Math.min(5, cam.k * (e.deltaY < 0 ? 1.12 : 0.89))); draw(); };
    $('#v3-r').onclick = () => { Object.assign(cam, { yaw: -0.6, pitch: 0.35, k: 1 }); draw(); }; $('#v3-f').onclick = () => { Object.assign(cam, { yaw: 0, pitch: 0 }); draw(); };
    $('#v3-zi').onclick = () => { cam.k *= 1.25; draw(); }; $('#v3-zo').onclick = () => { cam.k *= 0.8; draw(); }; $('#v3-door').onchange = (e) => { cam.door = e.target.checked; draw(); };
  }

  // ---------- échauffement ----------
  function therm(el) {
    const b = curB(), lay = layOf(b), e = encOf(b, lay), t = B().thermal(S().st, b, lay, e);
    el.innerHTML = `<div class="bar"><h2>Échauffement – ${esc(b.name)}</h2><div class="grow"></div>${boardPicker(b)}</div>
      ${t.missing ? `<div class="rep warn">${esc(t.missing)}</div>` : `<div class="rep ${t.ok ? 'ok' : 'bad'}">${t.ok ? '✔' : '✘'} Température intérieure estimée <b>${f1(t.Ti, 1)} °C</b> (ambiante ${t.Ta} °C + échauffement ${f1(t.dT, 1)} K) – limite ${t.Tmax} °C${t.ok ? '' : '<br>' + esc(t.advice || '')}</div>
      <p class="small">Puissance dissipée P = ${f1(t.P, 1)} W (pertes des appareils × (Ib / In)², + 20 % pour les connexions) · surface effective Ae = ${f1(t.Ae, 3)} m² · coefficient k = ${t.k} W/m²·K · ΔT = P / (k × Ae).</p>`}
      <div class="qwrap"><table class="qt small"><thead><tr><th>Appareil</th><th class="r">Pertes (W)</th></tr></thead><tbody>${t.parts.map((p) => `<tr><td>${esc(p.label)}</td><td class="r">${f1(p.P, 2)}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">Méthode simplifiée inspirée de la CEI TR 60890 pour les ensembles CEI 61439 ; pertes des appareils indicatives (bibliothèque) : à remplacer par les valeurs des fabricants, et à confirmer par la méthode de vérification de l'échauffement retenue (essai, calcul ou règle de conception). Limite et coefficients modifiables dans Paramètres.</p>`;
    bindPicker(el);
  }

  // ---------- sélectivité ----------
  function devicesAll() {
    const st = S().st, res = S().res, out = [];
    st.boards.forEach((b) => { const lay = layOf(b); if (lay.head) out.push({ key: 'h:' + b.id, label: `${b.name} – arrivée (${lay.head.In} A)`, ref: lay.head.ref, In: +lay.head.In, curve: lay.head.curve || (lay.head.type === 'isolator' ? '' : 'TM'), Ik: (res.boards[b.id] || {}).Ik, iso: lay.head.type === 'isolator' }); b.circuits.forEach((c) => { const r = res.circuits[c.id]; if (r && r.prot) out.push({ key: c.id, label: `${b.name} › ${c.name} (${r.curve}${r.In} A)`, ref: r.prot.ref, In: r.In, curve: r.curve, Ik: r.IkOrigin }); }); });
    return out;
  }
  let selUp = '', selDn = '';
  function sel(el) {
    const D = devicesAll(), st = S().st; if (!D.some((d) => d.key === selUp)) { const u0 = D.find((d) => !d.iso); selUp = u0 ? u0.key : ''; } if (!D.some((d) => d.key === selDn)) selDn = ''; if (!selDn && D[1]) selDn = D[D.length - 1].key;
    const up = D.find((d) => d.key === selUp), dn = D.find((d) => d.key === selDn);
    let r = null; if (up && dn && !up.iso) r = B().selectivity(st, up, dn, dn.Ik);
    el.innerHTML = `<h2>Sélectivité et filiation</h2><div class="two"><label>Protection amont<select id="se-u">${D.map((d) => `<option value="${d.key}"${d.key === selUp ? ' selected' : ''}>${esc(d.label)}</option>`).join('')}</select></label><label>Protection aval<select id="se-d">${D.map((d) => `<option value="${d.key}"${d.key === selDn ? ' selected' : ''}>${esc(d.label)}</option>`).join('')}</select></label></div>
      ${up && up.iso ? '<div class="rep warn">L\'appareil amont est un interrupteur-sectionneur : il ne protège pas, la sélectivité ne s\'applique pas.</div>' : ''}
      ${r ? `<table class="qt small"><tbody><tr><td>Rapport des calibres</td><td><b>${f1(r.ratio, 2)}</b> (mini ${st.rules.selRatio})</td></tr><tr><td>Seuil magnétique bas amont</td><td>${f1(r.upLo, 0)} A</td></tr><tr><td>Seuil magnétique haut aval</td><td>${f1(r.dnHi, 0)} A</td></tr><tr><td>Icc maximal au point aval</td><td>${r.IkDown != null ? f1(r.IkDown, 2) + ' kA' : 'non calculé'}</td></tr></tbody></table>
        <div class="rep ${r.cls === 'ok' ? 'ok' : r.cls === 'ko' ? 'bad' : 'warn'}">${esc(r.verdict)}</div><div class="rep info">${esc(r.filiation)}</div>
        <div class="curves">${curvesSvg(up, dn, dn.Ik)}</div><p class="small muted">Courbes temps-courant <b>génériques</b> (zones thermique 1,13–1,45 In et magnétique normalisée EN 60898-1), indicatives : elles ne remplacent pas les courbes et tables de sélectivité du fabricant.</p>` : ''}
      <h3>Données constructeur vérifiées</h3><p class="small muted">Saisissez ici les associations indiquées par les tables de sélectivité / filiation du fabricant : seules ces données permettent de déclarer une sélectivité ou une filiation.</p>
      <div class="qwrap"><table class="qt small"><thead><tr><th>Amont (réf.)</th><th>Aval (réf.)</th><th>Sélectivité</th><th class="r">Limite (kA)</th><th class="r">Filiation (kA)</th><th>Source</th><th></th></tr></thead><tbody>${(st.coord || []).map((c, i) => `<tr><td>${esc(c.up)}</td><td>${esc(c.down)}</td><td>${esc(c.sel)}</td><td class="r">${esc(c.limit || '')}</td><td class="r">${esc(c.fil || '')}</td><td>${esc(c.src || '')}</td><td><button class="btn small danger" data-cd="${i}">✕</button></td></tr>`).join('')}</tbody></table></div>
      <div class="btnrow"><button class="btn" id="se-add" ${up && dn ? '' : 'disabled'}>＋ Saisir pour la paire sélectionnée</button></div>`;
    $('#se-u').onchange = (e) => { selUp = e.target.value; sel(el); }; $('#se-d').onchange = (e) => { selDn = e.target.value; sel(el); };
    $$('[data-cd]', el).forEach((x) => (x.onclick = () => { st.coord.splice(+x.dataset.cd, 1); S().changed(); }));
    const add = $('#se-add'); if (add) add.onclick = async () => { const v = await ui().modal({ title: 'Données constructeur', body: `<p class="small">${esc(up.ref)} (amont) / ${esc(dn.ref)} (aval)</p><label>Sélectivité<select id="cs"><option value="totale">Totale</option><option value="partielle">Partielle</option><option value="aucune">Aucune</option></select></label><label>Limite de sélectivité (kA)<input id="cl" inputmode="decimal"></label><label>Pouvoir de coupure renforcé par filiation (kA, vide si aucune)<input id="cf" inputmode="decimal"></label><label>Source (document, page, édition)<input id="cx"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Enregistrer', cls: 'primary', value: (ov) => ({ up: up.ref, down: dn.ref, sel: $('#cs', ov).value, limit: $('#cl', ov).value, fil: $('#cf', ov).value, src: $('#cx', ov).value }) }] }); if (v) { if (!v.src) { ui().toast('Indiquez la source des données constructeur', 'bad'); return; } st.coord.push(v); S().changed(); } };
  }
  function curvesSvg(up, dn, Ik) {
    const W = 520, H = 340, lx = (I) => 50 + (Math.log10(I) - 0) / (5 - 0) * (W - 70), ly = (t) => 20 + (4 - Math.log10(t)) / (4 + 2.3) * (H - 50);
    const band = (p, col) => { const c = B().curvePoints(p); const pts = c.minB.map(([i, t]) => [lx(i), ly(t)]).concat(c.maxB.slice().reverse().map(([i, t]) => [lx(i), ly(t)])); return `<polygon points="${pts.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="1.5"/>`; };
    let grid = ''; [1, 10, 100, 1000, 10000, 100000].forEach((I) => { grid += `<line x1="${lx(I)}" y1="20" x2="${lx(I)}" y2="${H - 30}" stroke="#ccc"/><text x="${lx(I)}" y="${H - 14}" font-size="10" text-anchor="middle">${I >= 1000 ? I / 1000 + ' kA' : I + ' A'}</text>`; }); [0.01, 0.1, 1, 10, 100, 1000, 10000].forEach((t) => { grid += `<line x1="50" y1="${ly(t)}" x2="${W - 20}" y2="${ly(t)}" stroke="#eee"/><text x="44" y="${ly(t) + 3}" font-size="10" text-anchor="end">${t} s</text>`; });
    const ik = Ik != null ? `<line x1="${lx(Ik * 1000)}" y1="20" x2="${lx(Ik * 1000)}" y2="${H - 30}" stroke="#c62828" stroke-dasharray="5 4"/><text x="${lx(Ik * 1000) + 4}" y="32" font-size="10" fill="#c62828">Icc ${f1(Ik, 2)} kA</text>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:640px;background:#fff;color:#111;border-radius:8px" font-family="Arial,sans-serif">${grid}${band(up, '#1e88e5')}${band(dn, '#e65100')}${ik}<text x="60" y="${H - 36}" font-size="11" fill="#1e88e5">Amont ${up.curve}${up.In} A</text><text x="200" y="${H - 36}" font-size="11" fill="#e65100">Aval ${dn.curve}${dn.In} A</text></svg>`;
  }

  // ---------- nomenclature et chiffrage ----------
  function bom(el) {
    const m = S().bom; if (!m) { el.innerHTML = '<p class="err">Calcul indisponible.</p>'; return; } const c = m.cost, cats = ['Appareillage', 'Enveloppes', 'Accessoires', 'Câbles'];
    el.innerHTML = `<div class="bar"><h2>Nomenclature et chiffrage</h2><div class="grow"></div><button class="btn small" id="bo-csv">CSV</button><button class="btn small" id="bo-xls">Excel</button><button class="btn small" id="bo-ord">Bon de commande</button></div>
      ${m.noPrice ? `<div class="rep warn">⚠ ${m.noPrice} article(s) sans prix : saisissez le prix unitaire ci-dessous (il est enregistré dans la bibliothèque) ou importez un tarif fournisseur (Bibliothèque › Importer un tarif).</div>` : ''}
      ${cats.map((k) => { const L = m.list.filter((x) => x.cat === k); return L.length ? `<h3>${k}</h3><div class="qwrap"><table class="qt small"><thead><tr><th>Référence</th><th>Désignation</th><th>Fabricant</th><th class="r">Qté</th><th>Unité</th><th class="r">PU</th><th class="r">Total</th><th>Remarques</th></tr></thead><tbody>${L.map((x) => `<tr><td>${esc(x.ref)}</td><td>${esc(x.name)}</td><td>${esc(x.fab)}</td><td class="r">${f1(x.qty, x.unit === 'm' ? 1 : 0)}</td><td>${esc(x.unit)}</td><td class="r"><input class="tin" data-p="${esc(x.fab + '|' + x.ref)}" value="${x.price || ''}" placeholder="?"></td><td class="r">${money(x.total)}</td><td class="small muted">${esc(x.notes)}</td></tr>`).join('')}</tbody></table></div>` : ''; }).join('')}
      <section class="card flat"><h3>Chiffrage</h3><table class="qt"><tbody>${[['Appareillage', c.mat], ['Enveloppes', c.env], ['Accessoires', c.acc], ['Câbles', c.cab], [`Main-d'œuvre (${f1(c.hours, 1)} h × ${S().st.rules.labourRate} / h)`, c.labour], [`Frais supplémentaires (${S().st.rules.fraisPct} %)`, c.frais], [`Marge (${S().st.rules.marginPct} %)`, c.marge], ['<b>Total HT</b>', c.ht], [`TVA (${S().st.rules.tvaPct} %)`, c.tva], ['<b>Total TTC</b>', c.ttc]].map(([l, v]) => `<tr><td>${l}</td><td class="r"><b>${money(v)}</b></td></tr>`).join('')}</tbody></table><p class="small muted">Taux horaire, temps unitaires, frais, marge et TVA : onglet Paramètres. Taux de TVA à vérifier selon le pays.</p></section>`;
    $$('[data-p]', el).forEach((i) => (i.onchange = () => { const [fab, ref] = i.dataset.p.split('|'); const p = EE.BTLib.get(ref, fab); const v = parseFloat(i.value.replace(/\s/g, '').replace(',', '.')) || 0; if (p) EE.BTLib.upsert(Object.assign({}, p, { price: v })); else EE.BTLib.upsert({ ref, fab, name: ref, cat: 'Divers', price: v }); S().changed(true); }));
    $('#bo-csv').onclick = csvBom; $('#bo-xls').onclick = excel; $('#bo-ord').onclick = order;
  }
  function csvBom() { const m = S().bom; dl(base() + '_nomenclature.csv', csv([['Catégorie', 'Référence', 'Désignation', 'Fabricant', 'Quantité', 'Unité', 'Prix unitaire', 'Prix total', 'Remarques']].concat(m.list.map((x) => [x.cat, x.ref, x.name, x.fab, x.qty, x.unit, x.price, x.total, x.notes])).concat([[], ['Total HT', '', '', '', '', '', '', m.cost.ht], ['TVA', '', '', '', '', '', '', m.cost.tva], ['Total TTC', '', '', '', '', '', '', m.cost.ttc]]))); }
  function csvCalc() { const st = S().st, res = S().res; const rows = [['Tableau', 'Circuit', 'Type', 'Phases', 'Ib (A)', 'In (A)', 'Courbe', 'Iz (A)', 'Section (mm²)', 'Âme', 'Isolant', 'Pose', 'Longueur (m)', 'ΔU cumulée (%)', 'Icc max (kA)', 'Icc min (A)', 'Différentiel (mA)', 'Protection', 'PdC (kA)', 'Résultat', 'Observation']]; st.boards.forEach((b) => b.circuits.forEach((c) => { const r = res.circuits[c.id]; if (r) rows.push([b.name, c.name, c.kind === 'feeder' ? 'Départ' : c.type, r.phases, r.Ib, r.In, r.curve, r.Iz, r.section, r.mat, r.insul, r.method, c.length, r.dUtot, r.IkOrigin, r.Ikmin, r.rcd, r.prot ? r.prot.ref : '', r.prot ? r.prot.pdc : '', r.status, r.reason || r.fail || r.missing.join(', ')]); })); dl(base() + '_protections.csv', csv(rows)); }
  function csvBalance() { const st = S().st, bal = S().res.balance; const rows = [['Tableau', 'Circuit', 'Récepteur', 'Pn (W)', 'n', 'cos φ', 'η', 'ku', 'ks', 'P (kW)', 'Q (kvar)', 'S (kVA)', 'Ib (A)']]; st.boards.forEach((b) => { const br = bal.boards[b.id]; b.circuits.forEach((c) => { const cr = br.circuits.find((x) => x.id === c.id); rows.push([b.name, c.name, '', '', '', '', '', '', c.ks, cr.P / 1000, cr.Q / 1000, cr.S / 1000, cr.Ib]); c.loads.forEach((l) => rows.push(['', '', l.name, l.P, l.n, l.cos, l.eta, l.ku, '', '', '', '', ''])); }); rows.push([b.name + ' – total', '', '', '', '', '', '', '', b.ks, br.P / 1000, br.Q / 1000, br.S / 1000, br.Ib]); }); dl(base() + '_bilan.csv', csv(rows)); }
  function order() {
    const m = S().bom, st = S().st, fabs = [...new Set(m.list.map((x) => x.fab))];
    printHTML(`<h1>Bon de commande</h1><p>Étude : <b>${esc(st.name)}</b> – client : ${esc(st.client || '—')} – date : ${esc(EE.fmtDate(Date.now()))}</p>${fabs.map((f) => { const L = m.list.filter((x) => x.fab === f); return `<h2>Fournisseur / fabricant : ${esc(f)}</h2><table><thead><tr><th>Référence</th><th>Désignation</th><th>Qté</th><th>Unité</th><th>PU</th><th>Total</th></tr></thead><tbody>${L.map((x) => `<tr><td>${esc(x.ref)}</td><td>${esc(x.name)}</td><td class="r">${f1(x.qty, x.unit === 'm' ? 1 : 0)}</td><td>${esc(x.unit)}</td><td class="r">${money(x.price)}</td><td class="r">${money(x.total)}</td></tr>`).join('')}<tr><td colspan="5"><b>Sous-total</b></td><td class="r"><b>${money(L.reduce((a, x) => a + x.total, 0))}</b></td></tr></tbody></table>`; }).join('')}`, 'Bon de commande');
  }

  // ---------- étiquettes ----------
  const labOpt = { w: 60, h: 18, fs: 10, kinds: null, board: '' };
  function labelsList() { const st = S().st, L = B().labels(st, S().res, S().bom.layouts), ov = st.labelOv || {}; return L.map((l, i) => { const k = l.kind + '|' + l.board + '|' + l.text + '|' + l.sub; return Object.assign({}, l, { key: k, text: ov[k] && ov[k].text != null ? ov[k].text : l.text, sub: ov[k] && ov[k].sub != null ? ov[k].sub : l.sub, i }); }); }
  function lab(el) {
    const st = S().st, all = labelsList(), kinds = [...new Set(all.map((l) => l.kind))]; if (!labOpt.kinds) labOpt.kinds = kinds.slice();
    const L = all.filter((l) => labOpt.kinds.includes(l.kind) && (!labOpt.board || l.board === (S().board(labOpt.board) || {}).name));
    el.innerHTML = `<div class="bar"><h2>Étiquettes</h2><div class="grow"></div><button class="btn primary" id="lb-print">🖨 Imprimer (${L.length})</button></div>
      <div class="two"><label>Largeur (mm)<input id="lb-w" value="${labOpt.w}" inputmode="decimal"></label><label>Hauteur (mm)<input id="lb-h" value="${labOpt.h}" inputmode="decimal"></label><label>Taille du texte (pt)<input id="lb-fs" value="${labOpt.fs}" inputmode="decimal"></label><label>Tableau<select id="lb-b"><option value="">Tous</option>${st.boards.map((b) => `<option value="${b.id}"${labOpt.board === b.id ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label></div>
      <div class="chips">${kinds.map((k) => `<label class="chip${labOpt.kinds.includes(k) ? ' on' : ''}"><input type="checkbox" data-k="${esc(k)}"${labOpt.kinds.includes(k) ? ' checked' : ''} hidden> ${esc(k)}</label>`).join('')}</div>
      <p class="small muted">Cliquez sur une étiquette pour modifier son texte (enregistré dans l'étude). Format d'impression : planche A4, étiquettes à découper.</p>
      <div class="labs">${L.map((l) => `<div class="lab" data-key="${esc(l.key)}" style="width:${labOpt.w * 3}px;min-height:${labOpt.h * 3}px;font-size:${labOpt.fs * 1.3}px" title="${esc(l.kind)}"><b>${esc(l.text)}</b><small>${esc(l.sub)}</small></div>`).join('')}</div>`;
    ['w', 'h', 'fs'].forEach((k) => ($('#lb-' + k).onchange = (e) => { labOpt[k] = Math.max(5, parseFloat(e.target.value.replace(',', '.')) || labOpt[k]); lab(el); }));
    $('#lb-b').onchange = (e) => { labOpt.board = e.target.value; lab(el); };
    $$('[data-k]', el).forEach((i) => (i.closest('label').onclick = (e) => { e.preventDefault(); const k = i.dataset.k; labOpt.kinds = labOpt.kinds.includes(k) ? labOpt.kinds.filter((x) => x !== k) : labOpt.kinds.concat(k); lab(el); }));
    $$('.lab', el).forEach((d) => (d.onclick = async () => { const l = all.find((x) => x.key === d.dataset.key); const v = await ui().modal({ title: 'Texte de l\'étiquette', body: `<label>Texte principal<input id="lt" value="${esc(l.text)}"></label><label>Texte secondaire<input id="ls" value="${esc(l.sub)}"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Enregistrer', cls: 'primary', value: (ov) => ({ text: $('#lt', ov).value, sub: $('#ls', ov).value }) }] }); if (v) { st.labelOv = st.labelOv || {}; st.labelOv[l.key] = v; S().changed(); } }));
    $('#lb-print').onclick = () => printHTML(`<style>.lbs{display:flex;flex-wrap:wrap;gap:2mm}.lb{width:${labOpt.w}mm;height:${labOpt.h}mm;border:0.3mm dashed #888;padding:1mm;box-sizing:border-box;overflow:hidden;font-size:${labOpt.fs}pt;line-height:1.1}.lb small{display:block;font-size:${Math.max(5, labOpt.fs * 0.65)}pt}</style><div class="lbs">${L.map((l) => `<div class="lb"><b>${esc(l.text)}</b><small>${esc(l.sub)}</small></div>`).join('')}</div>`, 'Étiquettes', true);
  }

  // ---------- schéma unifilaire automatique (projet modifiable dans l'atelier) ----------
  function unifDocs() {
    const st = S().st, res = S().res, Lib = EE.Library, docs = [];
    const LOAD = { 'Éclairage': 'lampe', 'Prises de courant': 'prise', 'Moteur': 'moteur_tri', 'Pompe': 'moteur_tri', 'Ventilation': 'moteur_tri', 'Machine': 'moteur_tri', 'Chauffage': 'resistance_chauff', 'Eau chaude': 'resistance_chauff', 'Cuisson': 'resistance_chauff' };
    st.boards.forEach((b) => {
      const d = { comps: [], wires: [] }; let n = 0; const c = (type, x, y, label, val) => { const k = Lib.newComp(type, x, y); k.id = 'u' + (n++); k.label = label || ''; if (val != null) k.val = val; d.comps.push(k); return k; };
      const w = (pts, nn, desig) => d.wires.push({ id: 'uw' + d.wires.length, pts, n: nn || 1, desig: desig || '' });
      const lay = layOf(b), N = Math.max(1, b.circuits.length), X0 = 160, dx = 140, Xs = b.circuits.map((_, i) => X0 + i * dx);
      c('titre', 40, 20, '', `Schéma unifilaire – ${b.name}`);
      const fd = b.feeder && B().findCircuit(st, b.feeder);
      c('texte', 40, 50, '', fd ? `Alimenté par ${fd.board.name} › ${fd.circuit.name}` : `${st.supply} – ${st.U}/${st.U0} V – ${st.earthing}${st.Ik ? ' – Icc ' + st.Ik + ' kA' : ''}`);
      const yb = 260; c('phase', 60, 100, '', 'L');
      w([[60, 100], [60, 140]], 5); c('disjoncteur', 60, 180, 'Q0', lay.head ? lay.head.In + ' A' : '');
      c('texte', 80, 175, '', lay.head ? (lay.head.type === 'isolator' ? 'Interrupteur-sectionneur ' : 'Disjoncteur général ') + lay.head.In + ' A' : '');
      w([[60, 220], [60, yb]], 5); let px = 60;
      Xs.forEach((x, i) => { w([[px, yb], [x, yb]], 5, i === 0 ? 'Jeu de barres' : ''); if (i < Xs.length - 1) c('connexion', x, yb); px = x; });
      if (!Xs.length) w([[60, yb], [140, yb]], 5);
      b.circuits.forEach((ci, i) => {
        const r = res.circuits[ci.id] || {}, x = Xs[i], nn = r.phases === 3 ? 5 : 3; let y = yb;
        w([[x, y], [x, y + 40]], nn); y += 40;
        if (r.rcd && !(r.prot && r.prot.rcbo)) { c('differentiel', x, y + 40, 'ID' + (i + 1), r.rcd + ' mA'); y += 80; }
        c('disjoncteur', x, y + 40, 'Q' + (i + 1), `${r.curve || ''}${r.In || ''} A${r.prot && r.prot.rcbo ? ' ' + r.rcd + ' mA' : ''}`); y += 80;
        const cab = r.section ? `${r.phases === 3 ? (ci.neutral === false ? '4G' : '5G') : '3G'}${String(r.section).replace('.', ',')}` : '';
        const t = ci.kind === 'feeder' ? null : LOAD[ci.type];
        w([[x, y], [x, y + 80]], r.phases === 3 ? (ci.neutral === false ? 4 : 5) : 3, cab); y += 80;
        if (t === 'prise' || t === 'moteur_tri') c(t, x + 20, y + 40, 'R' + (i + 1));
        else if (t) c(t, x, y + 40, 'R' + (i + 1));
        else { c('bornier', x, y + 20, 'X' + (i + 1)); c('texte', x + 14, y + 50, '', ci.kind === 'feeder' ? '→ ' + ((S().board(ci.feeds) || {}).name || '?') : '→ ' + ci.type); }
        c('texte', x - 50, y + 110, '', ci.name.slice(0, 22)); c('texte', x - 50, y + 126, '', `${ci.length || '?'} m – ${r.Ib != null ? r.Ib.toFixed(1).replace('.', ',') : '?'} A`);
      });
      docs.push({ name: b.name, doc: d });
    });
    return docs;
  }
  async function unifilaire() {
    const st = S().st, docs = unifDocs(), St = EE.Store;
    let p = st.unifProject && St.Projects.get(st.unifProject);
    if (p && !(await ui().confirmBox('Schéma unifilaire', `Le schéma « <b>${esc(p.name)}</b> » existe déjà. Le régénérer remplacera les modifications faites dans l'atelier.`, 'Régénérer', false))) { EE.app.go('editor', p.id); return; }
    if (!p) p = St.Projects.create({ name: 'Unifilaire – ' + st.name, install: st.building === 'Industriel' ? 'Industriel' : st.building === 'Résidentiel' ? 'Résidentiel' : 'Tertiaire', schema: 'unifilaire' });
    p.doc = docs[0].doc; p.sheets = docs.map((d, i) => ({ id: EE.uid('f'), name: d.name, doc: i === 0 ? null : d.doc, view: null })); p.sheet = 0; p.schema = 'unifilaire'; St.Projects.update(p);
    st.unifProject = p.id; S().saveNow(); ui().toast('Schéma unifilaire généré (une feuille par tableau) : modifiable dans l\'atelier', 'ok'); EE.app.go('editor', p.id);
  }

  // ---------- dossier d'étude ----------
  function printHTML(body, title, raw) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0'; document.body.appendChild(f);
    f.srcdoc = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:A4;margin:14mm}body{font:10.5pt Arial,sans-serif;color:#111}h1{font-size:20pt;margin:0 0 6mm}h2{font-size:13pt;border-bottom:1.5pt solid #0b3d6b;color:#0b3d6b;margin:8mm 0 3mm;break-after:avoid}h3{font-size:11pt;margin:5mm 0 2mm}table{border-collapse:collapse;width:100%;margin:2mm 0;font-size:8.5pt}th,td{border:0.4pt solid #999;padding:1.2mm 1.6mm;text-align:left;vertical-align:top}th{background:#e8eef5}.r{text-align:right}.pg{page-break-before:always}.cover{text-align:center;padding-top:50mm}.cover h1{font-size:28pt}.ok{color:#1b7a34}.ko{color:#c62828}.chk{color:#a35b00}svg{max-width:100%;height:auto}.fig{border:0.4pt solid #ccc;padding:2mm;margin:2mm 0;page-break-inside:avoid}</style><\/head><body>${body}<\/body><\/html>`;
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* ignore */ } setTimeout(() => f.remove(), 60000); };
  }
  const DOCPARTS = [['cover', 'Page de garde'], ['pres', 'Présentation du projet'], ['bal', 'Bilan de puissance'], ['unif', 'Schéma unifilaire'], ['dist', 'Schéma de distribution'], ['notes', 'Notes de calcul'], ['prot', 'Tableau des protections'], ['cab', 'Tableau des sections de câbles'], ['bom', 'Liste de matériel'], ['impl', 'Implantation du tableau (vue 2D)'], ['v3d', 'Vue 3D'], ['lab', 'Étiquettes'], ['order', 'Bon de commande'], ['cost', 'Chiffrage'], ['obs', 'Réserves et observations']];
  let docSel = DOCPARTS.map((x) => x[0]);
  function dossierHTML() {
    const st = S().st, res = S().res, m = S().bom, bal = res.balance, has = (k) => docSel.includes(k); let h = '';
    const stc = (s) => `<span class="${s === 'Conforme' ? 'ok' : s === 'Non conforme' ? 'ko' : 'chk'}">${esc(s)}</span>`;
    if (has('cover')) h += `<div class="cover"><p>${esc(st.office || '')}</p><h1>${esc(st.name)}</h1><h3>Dossier d'étude – installation électrique basse tension</h3><p>Client : <b>${esc(st.client || '—')}</b><br>Chantier : ${esc(st.site || '—')}<br>Ingénieur : ${esc(st.engineer || '—')}<br>Date de l'étude : ${esc(st.date || '')}</p><p style="margin-top:30mm;font-size:8.5pt;color:#555">Document établi avec Yak-élec-pro ${EE.VERSION}. Les résultats découlent des règles et tableaux de calcul saisis ; ils doivent être validés par une personne qualifiée et ne constituent pas un certificat de conformité.</p></div>`;
    if (has('pres')) h += `<h2 class="pg">1. Présentation du projet</h2><table><tbody>${[['Type de bâtiment', st.building], ['Alimentation', st.supply], ['Réseau', `${st.U} / ${st.U0} V – ${st.f} Hz`], ['Régime de neutre', st.earthing], ['Puissance disponible', st.Pavail ? st.Pavail + ' kVA' : 'non renseignée'], ['Icc au point de livraison', st.Ik ? st.Ik + ' kA' : 'non renseigné'], ['Facteur de puissance de référence', st.cos], ['Résistance de terre RA', st.RA ? st.RA + ' Ω' : '—'], ['Normes de référence', st.rules.norms], ['Tableaux', st.boards.map((b) => b.name).join(', ')]].map(([a, b]) => `<tr><th>${esc(a)}</th><td>${esc(String(b))}</td></tr>`).join('')}</tbody></table>`;
    if (has('bal')) { h += `<h2 class="pg">2. Bilan de puissance</h2>`; st.boards.forEach((b) => { const br = bal.boards[b.id]; if (!br) return; h += `<h3>${esc(b.name)} (ks = ${esc(b.ks)})</h3><table><thead><tr><th>Circuit</th><th>Type</th><th class="r">ks</th><th class="r">P (kW)</th><th class="r">Q (kvar)</th><th class="r">S (kVA)</th><th class="r">Ib (A)</th></tr></thead><tbody>${b.circuits.map((c) => { const cr = br.circuits.find((x) => x.id === c.id); return `<tr><td>${esc(c.name)}</td><td>${esc(c.kind === 'feeder' ? 'Départ' : c.type)}</td><td class="r">${esc(c.ks)}</td><td class="r">${f1(cr.P / 1000, 2)}</td><td class="r">${f1(cr.Q / 1000, 2)}</td><td class="r">${f1(cr.S / 1000, 2)}</td><td class="r">${f1(cr.Ib, 1)}</td></tr>`; }).join('')}<tr><th colspan="3">Total</th><th class="r">${f1(br.P / 1000, 2)}</th><th class="r">${f1(br.Q / 1000, 2)}</th><th class="r">${f1(br.S / 1000, 2)}</th><th class="r">${f1(br.Ib, 1)}</th></tr></tbody></table>`; }); h += `<p><b>Projet : P = ${f1(bal.P / 1000, 2)} kW ; S = ${f1(bal.S / 1000, 2)} kVA ; Ib = ${f1(bal.Ib, 1)} A ; cos φ = ${f1(bal.cos, 2)}</b></p>`; }
    if (has('unif')) { h += `<h2 class="pg">3. Schéma unifilaire</h2>`; unifDocs().forEach((u) => { h += `<div class="fig"><h3>${esc(u.name)}</h3>${EE.docSvg ? EE.docSvg(u.doc, 'unifilaire') : ''}</div>`; }); }
    if (has('dist')) { const rec = (b, d) => `<li><b>${esc(b.name)}</b> – ${f1((bal.boards[b.id] || {}).S / 1000, 2)} kVA, Icc ${(res.boards[b.id] || {}).Ik != null ? f1(res.boards[b.id].Ik, 2) + ' kA' : '?'}<ul>${b.circuits.map((c) => { const r = res.circuits[c.id] || {}; const ch = B().childOf(st, c); return `<li>${esc(c.name)} – ${r.poles || ''} ${r.In || ''} A – ${r.section ? String(r.section).replace('.', ',') + ' mm²' : ''}${ch && d < 6 ? '<ul>' + rec(ch, d + 1) + '</ul>' : ''}</li>`; }).join('')}</ul></li>`; h += `<h2 class="pg">4. Schéma de distribution</h2><ul>${(bal.roots || []).map((id) => rec(S().board(id), 0)).join('')}</ul>`; }
    if (has('notes')) { h += `<h2 class="pg">5. Notes de calcul</h2><p style="font-size:8.5pt">Ib = S / U0 (mono) ou S / (√3·U) ; In ≥ Ib ; Iz = Iz₀ × kT × kG ≥ In ; ΔU = b(ρL/S·cos φ + λL·sin φ)·Ib ; Icc min (phase-PE) = 0,8·U0·S / (ρ·2L) ≥ seuil magnétique ; pouvoir de coupure ≥ Icc max aux barres. ρ = 0,0225 Ω·mm²/m (Cu), 0,036 (Al) ; λ = 0,08 mΩ/m. Tableaux CEI 60364-5-52 (à vérifier).</p>`; st.boards.forEach((b) => b.circuits.forEach((c) => { const r = res.circuits[c.id]; if (!r) return; h += `<h3>${esc(b.name)} › ${esc(c.name)} – ${stc(r.status)}</h3><table><tbody><tr><td>Ib = ${f1(r.Ib, 2)} A ; In = ${r.In} A (${r.poles}, courbe ${r.curve}) ; ${esc(r.hyp[0] || '')}</td></tr><tr><td>Section ${r.section ? String(r.section).replace('.', ',') : '—'} mm² ; Iz = ${f1(r.Iz, 1)} A ; ΔU = ${r.dUtot != null ? f1(r.dUtot, 2) + ' %' : '?'} (limite ${r.lim} %) ; Icc max ${r.IkOrigin != null ? f1(r.IkOrigin, 2) + ' kA' : '?'} ; Icc min ${f1(r.Ikmin, 0)} A ; seuil ${f1(r.Im, 0)} A</td></tr><tr><td>${esc((r.indirect || '').slice((r.indirect || '').indexOf(':') + 1))}${r.reason || r.fail ? ' – ' + esc(r.reason || r.fail) : ''}${r.missing.length ? ' – données manquantes : ' + esc(r.missing.join(', ')) : ''}</td></tr></tbody></table>`; })); }
    if (has('prot')) { h += `<h2 class="pg">6. Tableau des protections</h2><table><thead><tr><th>Tableau</th><th>Circuit</th><th class="r">Ib</th><th class="r">In</th><th class="r">Iz</th><th>Section</th><th>Protection</th><th class="r">Icc</th><th>Résultat</th></tr></thead><tbody>${st.boards.map((b) => b.circuits.map((c) => { const r = res.circuits[c.id]; return r ? `<tr><td>${esc(b.name)}</td><td>${esc(c.name)}</td><td class="r">${f1(r.Ib, 1)}</td><td class="r">${r.In}</td><td class="r">${f1(r.Iz, 0)}</td><td>${r.section ? String(r.section).replace('.', ',') + ' mm²' : '—'}</td><td>${r.prot ? esc(r.prot.ref) + ' (' + r.prot.pdc + ' kA)' : '—'}${r.rcd ? ' + ' + r.rcd + ' mA' : ''}</td><td class="r">${r.IkOrigin != null ? f1(r.IkOrigin, 2) + ' kA' : '?'}</td><td>${stc(r.status)}</td></tr>` : ''; }).join('')).join('')}</tbody></table>`; }
    if (has('cab')) { h += `<h2>7. Tableau des sections de câbles</h2><table><thead><tr><th>Repère</th><th>Câble</th><th class="r">Longueur</th><th>Âme / isolant</th><th>Pose</th><th class="r">ΔU</th></tr></thead><tbody>${st.boards.map((b) => b.circuits.map((c, i) => { const r = res.circuits[c.id]; return r ? `<tr><td>${esc(b.name)}/C${i + 1} ${esc(c.name)}</td><td>${r.section ? (r.phases === 3 ? (c.neutral === false ? '4G' : '5G') : '3G') + String(r.section).replace('.', ',') : '—'}</td><td class="r">${esc(c.length || '?')} m</td><td>${r.mat === 'al' ? 'Alu' : 'Cu'} / ${esc(r.insul)}</td><td>${esc(r.method)}</td><td class="r">${r.dUtot != null ? f1(r.dUtot, 2) + ' %' : '?'}</td></tr>` : ''; }).join('')).join('')}</tbody></table>`; }
    if (has('bom') && m) h += `<h2 class="pg">8. Liste de matériel</h2><table><thead><tr><th>Catégorie</th><th>Référence</th><th>Désignation</th><th>Fabricant</th><th class="r">Qté</th><th class="r">PU</th><th class="r">Total</th></tr></thead><tbody>${m.list.map((x) => `<tr><td>${esc(x.cat)}</td><td>${esc(x.ref)}</td><td>${esc(x.name)}</td><td>${esc(x.fab)}</td><td class="r">${f1(x.qty, x.unit === 'm' ? 1 : 0)} ${esc(x.unit)}</td><td class="r">${money(x.price)}</td><td class="r">${money(x.total)}</td></tr>`).join('')}</tbody></table>`;
    if (has('impl')) { h += `<h2 class="pg">9. Implantation des tableaux</h2>`; st.boards.forEach((b) => { h += `<div class="fig"><h3>${esc(b.name)}</h3>${svg2dOf(b, 'face').svg}</div>`; }); }
    if (has('v3d')) { h += `<h2 class="pg">10. Vue 3D</h2>`; const sv = Object.assign({}, cam); Object.assign(cam, { yaw: -0.6, pitch: 0.35, k: 1, door: false }); st.boards.forEach((b) => { h += `<div class="fig"><h3>${esc(b.name)}</h3><div style="height:110mm">${render3d(b, 600, 420)}</div></div>`; }); Object.assign(cam, sv); }
    if (has('lab')) { const L = labelsList(); h += `<h2 class="pg">11. Étiquettes</h2><div style="display:flex;flex-wrap:wrap;gap:2mm">${L.map((l) => `<div style="width:55mm;min-height:14mm;border:0.3pt dashed #888;padding:1mm;font-size:8pt"><b>${esc(l.text)}</b><br><span style="font-size:6.5pt">${esc(l.sub)}</span></div>`).join('')}</div>`; }
    if (has('order') && m) { const fabs = [...new Set(m.list.map((x) => x.fab))]; h += `<h2 class="pg">12. Bon de commande</h2>${fabs.map((f) => `<h3>${esc(f)}</h3><table><thead><tr><th>Référence</th><th>Désignation</th><th class="r">Qté</th><th class="r">Total</th></tr></thead><tbody>${m.list.filter((x) => x.fab === f).map((x) => `<tr><td>${esc(x.ref)}</td><td>${esc(x.name)}</td><td class="r">${f1(x.qty, x.unit === 'm' ? 1 : 0)} ${esc(x.unit)}</td><td class="r">${money(x.total)}</td></tr>`).join('')}</tbody></table>`).join('')}`; }
    if (has('cost') && m) { const c = m.cost, R = st.rules; h += `<h2>13. Chiffrage</h2><table><tbody>${[['Appareillage', c.mat], ['Enveloppes', c.env], ['Accessoires', c.acc], ['Câbles', c.cab], [`Main-d'œuvre (${f1(c.hours, 1)} h)`, c.labour], [`Frais (${R.fraisPct} %)`, c.frais], [`Marge (${R.marginPct} %)`, c.marge], ['Total HT', c.ht], [`TVA (${R.tvaPct} %)`, c.tva], ['Total TTC', c.ttc]].map(([a, v]) => `<tr><th>${esc(a)}</th><td class="r">${money(v)}</td></tr>`).join('')}</tbody></table>${m.noPrice ? `<p class="chk">${m.noPrice} article(s) sans prix unitaire.</p>` : ''}`; }
    if (has('obs')) h += `<h2 class="pg">14. Réserves et observations</h2><ul>${res.msgs.map((x) => `<li class="${x.sev === 'error' ? 'ko' : 'chk'}">${esc(x.msg)}</li>`).join('') || '<li>Aucune anomalie détectée par le moteur de calcul.</li>'}</ul>${st.notes ? `<p>${esc(st.notes)}</p>` : ''}<p style="font-size:8.5pt">Hypothèses : tableaux de courants admissibles et coefficients CEI 60364-5-52 (à vérifier) ; Icc par méthode des impédances simplifiée ; échauffement par méthode simplifiée (CEI TR 60890) ; sélectivité et filiation uniquement sur données constructeur saisies. Ce dossier ne vaut pas attestation de conformité.</p>`;
    return h;
  }
  function dossier() { printHTML(dossierHTML(), 'Dossier – ' + S().st.name); }
  function doc(el) {
    el.innerHTML = `<h2>Dossier d'étude et exports</h2><p class="small muted">Cochez les parties à inclure, puis « Imprimer / PDF » (choisissez « Enregistrer au format PDF » dans la fenêtre d'impression).</p>
      <div class="chips">${DOCPARTS.map(([k, l]) => `<label class="chip${docSel.includes(k) ? ' on' : ''}" data-d="${k}">${esc(l)}</label>`).join('')}</div>
      <div class="btnrow"><button class="btn primary" id="dc-pdf">🖨 Dossier d'étude (PDF / impression)</button><button class="btn" id="dc-html">Aperçu</button></div>
      <h3>Exports</h3><div class="btnrow"><button class="btn" id="dc-xls">📊 Classeur Excel (.xls)</button><button class="btn" id="dc-bal">Bilan (CSV)</button><button class="btn" id="dc-cal">Protections (CSV)</button><button class="btn" id="dc-bom">Nomenclature (CSV)</button><button class="btn" id="dc-ord">Bon de commande</button><button class="btn" id="dc-svg">Vue 2D (SVG)</button><button class="btn" id="dc-uni">Schéma unifilaire → atelier (SVG, DXF, PDF)</button><button class="btn" id="dc-json">Étude (.json)</button></div>
      <div id="dc-prev"></div>`;
    $$('[data-d]', el).forEach((c) => (c.onclick = () => { const k = c.dataset.d; docSel = docSel.includes(k) ? docSel.filter((x) => x !== k) : docSel.concat(k); doc(el); }));
    $('#dc-pdf').onclick = dossier; $('#dc-html').onclick = () => { $('#dc-prev').innerHTML = `<div class="dosprev">${dossierHTML()}</div>`; };
    $('#dc-xls').onclick = excel; $('#dc-bal').onclick = csvBalance; $('#dc-cal').onclick = csvCalc; $('#dc-bom').onclick = csvBom; $('#dc-ord').onclick = order; $('#dc-svg').onclick = svg2d; $('#dc-uni').onclick = unifilaire;
    $('#dc-json').onclick = () => EE.Export.download(EE.Export.safe(S().st.name) + '.yakbt.json', new Blob([JSON.stringify({ format: 'yak-elec-pro-etude-bt', version: 1, study: S().st }, null, 1)], { type: 'application/json' }));
  }
  // classeur Excel 2003 (SpreadsheetML) : plusieurs feuilles, s'ouvre dans Excel et LibreOffice
  function excel() {
    const st = S().st, res = S().res, m = S().bom, bal = res.balance, x = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cell = (v) => (typeof v === 'number' && isFinite(v) ? `<Cell><Data ss:Type="Number">${Math.round(v * 1000) / 1000}</Data></Cell>` : `<Cell><Data ss:Type="String">${x(v)}</Data></Cell>`);
    const sheet = (name, rows) => `<Worksheet ss:Name="${x(name).slice(0, 31)}"><Table>${rows.map((r, i) => `<Row${i === 0 ? ' ss:StyleID="h"' : ''}>${r.map(cell).join('')}</Row>`).join('')}</Table></Worksheet>`;
    const S1 = [['Champ', 'Valeur'], ['Étude', st.name], ['Client', st.client], ['Chantier', st.site], ['Bureau d\'études', st.office], ['Ingénieur', st.engineer], ['Date', st.date], ['Bâtiment', st.building], ['Réseau', `${st.U}/${st.U0} V ${st.f} Hz`], ['Régime de neutre', st.earthing], ['Puissance disponible (kVA)', st.Pavail], ['Icc livraison (kA)', st.Ik], ['P projet (kW)', bal.P / 1000], ['S projet (kVA)', bal.S / 1000], ['Ib projet (A)', bal.Ib]];
    const S2 = [['Tableau', 'Circuit', 'P (kW)', 'Q (kvar)', 'S (kVA)', 'Ib (A)']]; st.boards.forEach((b) => { const br = bal.boards[b.id]; b.circuits.forEach((c) => { const cr = br.circuits.find((y) => y.id === c.id); S2.push([b.name, c.name, cr.P / 1000, cr.Q / 1000, cr.S / 1000, cr.Ib]); }); S2.push([b.name, 'TOTAL', br.P / 1000, br.Q / 1000, br.S / 1000, br.Ib]); });
    const S3 = [['Tableau', 'Circuit', 'Ib (A)', 'In (A)', 'Courbe', 'Iz (A)', 'Section (mm²)', 'Longueur (m)', 'ΔU (%)', 'Icc max (kA)', 'Icc min (A)', 'Différentiel (mA)', 'Protection', 'PdC (kA)', 'Résultat']]; st.boards.forEach((b) => b.circuits.forEach((c) => { const r = res.circuits[c.id]; if (r) S3.push([b.name, c.name, r.Ib, r.In, r.curve, r.Iz, r.section, +c.length || '', r.dUtot, r.IkOrigin, r.Ikmin, r.rcd || '', r.prot ? r.prot.ref : '', r.prot ? r.prot.pdc : '', r.status]); }));
    const S4 = [['Catégorie', 'Référence', 'Désignation', 'Fabricant', 'Quantité', 'Unité', 'PU', 'Total', 'Remarques']].concat(m ? m.list.map((y) => [y.cat, y.ref, y.name, y.fab, y.qty, y.unit, y.price, y.total, y.notes]) : []);
    const c = m ? m.cost : {}; const S5 = [['Poste', 'Montant']].concat([['Appareillage', c.mat], ['Enveloppes', c.env], ['Accessoires', c.acc], ['Câbles', c.cab], ['Main-d\'œuvre', c.labour], ['Frais', c.frais], ['Marge', c.marge], ['Total HT', c.ht], ['TVA', c.tva], ['Total TTC', c.ttc]]);
    const S6 = [['Type', 'Tableau', 'Texte', 'Détail']].concat(labelsList().map((l) => [l.kind, l.board, l.text, l.sub]));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/></Style></Styles>${sheet('Projet', S1)}${sheet('Bilan de puissance', S2)}${sheet('Protections et câbles', S3)}${sheet('Nomenclature', S4)}${sheet('Chiffrage', S5)}${sheet('Étiquettes', S6)}</Workbook>`;
    EE.Export.download(base() + '.xls', new Blob([xml], { type: 'application/vnd.ms-excel' })); ui().toast('Classeur Excel prêt (6 feuilles)', 'ok');
  }

  // ---------- bibliothèque ----------
  let libQ = '', libCat = '', libFab = '';
  function lib(el) {
    const L = LIB(), q = libQ.toLowerCase(), V = L.filter((p) => (!libCat || p.cat === libCat) && (!libFab || p.fab === libFab) && (p.ref + ' ' + p.name).toLowerCase().includes(q)), shown = V.slice(0, 200);
    el.innerHTML = `<div class="bar"><h2>Bibliothèque des appareils (${L.length})</h2><div class="grow"></div><button class="btn small" id="li-add">＋ Produit</button><button class="btn small" id="li-imp">Importer CSV…</button><button class="btn small" id="li-tar">Importer un tarif…</button><button class="btn small" id="li-exp">Exporter CSV</button><button class="btn small" id="li-tpl">Modèle CSV</button><button class="btn small danger" id="li-rst">Rétablir</button><input type="file" id="li-f" accept=".csv,.txt" hidden></div>
      <p class="small muted">Produits génériques fournis (caractéristiques typiques, dimensions et pertes indicatives, prix à renseigner). Ajoutez les produits Legrand, Schneider Electric, ABB, Siemens ou autres en important leur tarif au format CSV (Excel : Fichier › Enregistrer sous › CSV point-virgule). Colonnes : ${EE.BTLib.COLS.map((c) => c[1]).join(', ')}.</p>
      <div class="chips"><input id="li-q" placeholder="Rechercher…" value="${esc(libQ)}"><select id="li-c"><option value="">Toutes catégories</option>${EE.BTLib.cats().map((c) => `<option${c === libCat ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select><select id="li-fb"><option value="">Tous fabricants</option>${EE.BTLib.fabs().map((c) => `<option${c === libFab ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select><span class="lvl">${V.length} produit(s)${V.length > 200 ? ' – 200 premiers affichés' : ''}</span></div>
      <div class="qwrap"><table class="qt small"><thead><tr><th>Référence</th><th>Fabricant</th><th>Désignation</th><th>Pôles</th><th class="r">In</th><th class="r">PdC</th><th>Courbe</th><th class="r">Modules</th><th class="r">L×H×P</th><th>Montage</th><th class="r">Pertes</th><th class="r">Prix</th><th></th></tr></thead><tbody>${shown.map((p) => `<tr><td>${esc(p.ref)}</td><td>${esc(p.fab)}</td><td>${esc(p.name)}${p.rcd ? ` <small>(${p.rcd.sens} mA type ${esc(p.rcd.type)})</small>` : ''}</td><td>${esc(p.poles || '')}</td><td class="r">${p.In || ''}</td><td class="r">${p.pdc ? p.pdc + ' kA' : ''}</td><td>${esc(p.curve || '')}</td><td class="r">${p.mods || ''}</td><td class="r">${p.W ? Math.round(p.W) + '×' + p.H + '×' + p.D : ''}</td><td>${esc(p.mount || '')}</td><td class="r">${p.pw ? f1(p.pw, 1) + ' W' : ''}</td><td class="r"><input class="tin" data-lp="${esc(p.fab + '|' + p.ref)}" value="${p.price || ''}" placeholder="?"></td><td><button class="btn small" data-le="${esc(p.fab + '|' + p.ref)}">✎</button></td></tr>`).join('')}</tbody></table></div>`;
    const re = () => lib(el);
    $('#li-q').oninput = (e) => { libQ = e.target.value; re(); const i = $('#li-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#li-c').onchange = (e) => { libCat = e.target.value; re(); }; $('#li-fb').onchange = (e) => { libFab = e.target.value; re(); };
    $$('[data-lp]', el).forEach((i) => (i.onchange = () => { const [fab, ref] = i.dataset.lp.split('|'); EE.BTLib.upsert(Object.assign({}, EE.BTLib.get(ref, fab), { price: parseFloat(i.value.replace(/\s/g, '').replace(',', '.')) || 0 })); S().changed(true); }));
    $$('[data-le]', el).forEach((b) => (b.onclick = () => { const [fab, ref] = b.dataset.le.split('|'); editProduct(EE.BTLib.get(ref, fab)); }));
    $('#li-add').onclick = () => editProduct(null); $('#li-imp').onclick = () => libImport('merge'); $('#li-tar').onclick = () => libImport('prices'); $('#li-exp').onclick = libExport;
    $('#li-tpl').onclick = () => dl('modele_bibliotheque_yak.csv', EE.BTLib.toCSV(LIB().filter((p) => p.type === 'mcb').slice(0, 3)));
    $('#li-rst').onclick = async () => { if (await ui().confirmBox('Rétablir la bibliothèque', 'Revenir à la bibliothèque générique d\'origine (produits importés et prix saisis perdus) ?', 'Rétablir')) { EE.BTLib.reset(); S().changed(true); } };
  }
  async function editProduct(p) {
    const o = p || { ref: '', fab: '', name: '', cat: 'Disjoncteurs', type: 'mcb', poles: '1P+N', In: 16, Un: 230, pdc: 6, curve: 'C', mods: 1, W: 18, H: 85, D: 75, mount: 'Rail DIN', price: 0, acc: '', sheet: '', pw: 0 };
    const F = [['ref', 'Référence'], ['fab', 'Fabricant'], ['name', 'Désignation'], ['cat', 'Catégorie'], ['type', 'Type (mcb, rcbo, rccb, mccb, acb, contactor, isolator, enclosure…)'], ['poles', 'Pôles'], ['In', 'Courant nominal (A)'], ['Un', 'Tension nominale (V)'], ['pdc', 'Pouvoir de coupure (kA)'], ['curve', 'Courbe'], ['mods', 'Modules'], ['W', 'Largeur (mm)'], ['H', 'Hauteur (mm)'], ['D', 'Profondeur (mm)'], ['mount', 'Type de montage'], ['price', 'Prix unitaire'], ['pw', 'Pertes au courant nominal (W)'], ['acc', 'Accessoires compatibles'], ['sheet', 'Fiche technique (norme, lien, document)']];
    const r = await ui().modal({ title: p ? 'Modifier le produit' : 'Nouveau produit', wide: true, body: `<div class="two">${F.map(([k, l]) => `<label>${esc(l)}<input data-pf="${k}" value="${esc(o[k] == null ? '' : o[k])}"></label>`).join('')}</div>`, buttons: [{ label: 'Annuler', value: null }].concat(p ? [{ label: 'Supprimer', cls: 'danger', value: 'del' }] : []).concat([{ label: 'Enregistrer', cls: 'primary', value: (ov) => { const v = {}; $$('[data-pf]', ov).forEach((i) => { v[i.dataset.pf] = ['In', 'Un', 'pdc', 'mods', 'W', 'H', 'D', 'price', 'pw'].includes(i.dataset.pf) ? (parseFloat(i.value.replace(',', '.')) || 0) : i.value.trim(); }); return v; } }]) });
    if (!r) return; if (r === 'del') { EE.BTLib.remove(p.ref, p.fab); S().changed(true); return; }
    if (!r.ref || !r.name || !r.fab) { ui().toast('Référence, fabricant et désignation obligatoires', 'bad'); return; }
    if (p && (p.ref !== r.ref || p.fab !== r.fab)) EE.BTLib.remove(p.ref, p.fab); EE.BTLib.upsert(Object.assign({}, p || {}, r)); S().changed(true);
  }
  function libImport(mode) {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,.txt';
    i.onchange = async () => { try { const r = EE.BTLib.importCSV(await i.files[0].text(), mode); ui().toast(`${mode === 'prices' ? 'Tarif importé' : 'Import terminé'} : ${r.added} ajouté(s), ${r.updated} mis à jour${r.errors.length ? ', ' + r.errors.length + ' ligne(s) ignorée(s)' : ''}`, 'ok'); S().changed(true); } catch (e) { ui().toast(e.message, 'bad'); } };
    i.click();
  }
  function libExport() { dl('bibliotheque_yak-elec-pro.csv', EE.BTLib.toCSV(LIB())); }

  EE.BTViews = { repart, enc, v2d, v3d, therm, sel, bom, lab, doc, lib, unifilaire, unifDocs, dossier, dossierHTML, excel, csvBom, csvCalc, csvBalance, order, svg2d, svg2dOf, render3d, libImport, libExport };
})(window);
