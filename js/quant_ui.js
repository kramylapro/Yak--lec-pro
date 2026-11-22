/* Yak-élec-pro – écran « Quantitatif et coffret » */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, Q = EE.Quant;
  const ui = () => EE.app.ui, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const key = () => 'eep.quant.' + EE.Store.Users.current().id;
  const Studies = {
    list() { return EE.Store.raw.get(key(), []); },
    save(l) { EE.Store.raw.set(key(), l); },
    get(id) { return Studies.list().find((s) => s.id === id); },
    put(s) { const l = Studies.list(), i = l.findIndex((x) => x.id === s.id); s.modified = Date.now(); if (i < 0) l.push(s); else l[i] = s; Studies.save(l); },
    remove(id) { Studies.save(Studies.list().filter((s) => s.id !== id)); },
  };
  EE.QuantStudies = Studies;
  let cur = null, timer = null;

  // Dessin réaliste d'un appareil modulaire (vue de face) ; remplacé par la photo du catalogue si elle existe
  function deviceArt(d, x, y, w, h, img) {
    const cx = x + w / 2, rating = String(d.sub).split(' ')[0];
    if (img) return `<g class="dev-art photo" data-cid="${esc(d.cid || '')}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#fff" stroke="#888"/><image href="${img}" x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" preserveAspectRatio="xMidYMid meet"/></g>`;
    const body = d.k === 'main' ? '#e9e6e0' : d.k === 'surge' ? '#e4e2f0' : '#f3f1ec';
    let o = `<g class="dev-art" data-cid="${esc(d.cid || '')}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${body}" stroke="#7d7d7d" stroke-width="1.2"/>`;
    // borniers haut et bas avec vis
    [[y, 0], [y + h - 14, 1]].forEach(([yy]) => { o += `<rect x="${x + 2}" y="${yy + 1}" width="${w - 4}" height="12" rx="2" fill="#c9c9c9" stroke="#999" stroke-width=".8"/>`; const n = Math.max(1, Math.round(w / 28)); for (let i = 0; i < n; i++) { const sx = x + (w / n) * (i + .5); o += `<circle cx="${sx}" cy="${yy + 7}" r="3.6" fill="#8a8a8a" stroke="#555" stroke-width=".6"/><line x1="${sx - 2.4}" y1="${yy + 7}" x2="${sx + 2.4}" y2="${yy + 7}" stroke="#333" stroke-width="1"/>`; } });
    if (d.k === 'surge') {
      o += `<rect x="${x + 6}" y="${y + 26}" width="${w - 12}" height="22" rx="3" fill="#2e7d32" stroke="#555"/><text x="${cx}" y="${y + 41}" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">OK</text>`;
      o += `<rect x="${x + 6}" y="${y + 54}" width="${w - 12}" height="30" rx="2" fill="#fff" stroke="#aaa"/><text x="${cx}" y="${y + 66}" text-anchor="middle" font-size="9" font-weight="700">PARAFOUDRE</text><text x="${cx}" y="${y + 78}" text-anchor="middle" font-size="8">Type 2</text>`;
    } else {
      // manette (levier) en position enclenchée
      const lw = Math.min(w - 12, 22), lx = cx - lw / 2;
      o += `<rect x="${x + 5}" y="${y + 22}" width="${w - 10}" height="40" rx="3" fill="#cfcfcf" stroke="#999" stroke-width=".8"/><rect x="${lx}" y="${y + 25}" width="${lw}" height="20" rx="3" fill="${d.k === 'main' ? '#c62828' : '#1f1f1f'}" stroke="#000" stroke-width=".8"/><rect x="${lx + 3}" y="${y + 28}" width="${lw - 6}" height="3" rx="1" fill="#fff" opacity=".35"/><text x="${cx}" y="${y + 56}" text-anchor="middle" font-size="8" font-weight="700" fill="#222">I</text>`;
      if (d.k === 'diff') o += `<rect x="${x + 5}" y="${y + 66}" width="${Math.min(w - 10, 26)}" height="11" rx="2" fill="#f2c200" stroke="#7a6200" stroke-width=".8"/><text x="${x + 5 + Math.min(w - 10, 26) / 2}" y="${y + 75}" text-anchor="middle" font-size="8" font-weight="700" fill="#222">T</text>`;
      // étiquette : calibre / sensibilité
      const ly = y + (d.k === 'diff' ? 80 : 68), lh = h - 14 - ly + y - 3;
      o += `<rect x="${x + 5}" y="${ly}" width="${w - 10}" height="${lh}" rx="2" fill="#fff" stroke="#bbb" stroke-width=".8"/>`;
      if (d.k === 'cb') o += `<text x="${cx}" y="${ly + lh / 2 + 1}" text-anchor="middle" font-size="${w < 40 ? 10 : 12}" font-weight="800" fill="#111">C${rating}</text><text x="${cx}" y="${ly + lh / 2 + 11}" text-anchor="middle" font-size="6.5" fill="#333">6000</text>`;
      else if (d.k === 'diff') o += `<text x="${cx}" y="${ly + 11}" text-anchor="middle" font-size="9" font-weight="800" fill="#111">${rating} A</text><text x="${cx}" y="${ly + 21}" text-anchor="middle" font-size="8" font-weight="700" fill="#111">${d.sens || 30}mA</text><text x="${cx}" y="${ly + 31}" text-anchor="middle" font-size="8" fill="#111">${d.typeA ? 'A' : 'AC'}</text>`;
      else o += `<text x="${cx}" y="${ly + lh / 2 + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#111">${rating} A</text>`;
    }
    return o + '</g>';
  }
  function coffretSVG(cf) {
    const cat = {}; EE.Config.get().catalog.forEach((c) => (cat[c.id] = c));
    const mw = 28, dh = 132, rh = dh + 34, pad = 14, W = cf.perRow * mw + pad * 2, H = cf.nRows * (rh + 8) + pad * 2;
    let o = `<svg class="cofsvg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Composition du coffret"><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="10" fill="#f7f7f5" stroke="#555" stroke-width="2.5"/>`;
    cf.rows.forEach((r, ri) => {
      const y = pad + ri * (rh + 8) + 8, ry = y + dh / 2 - 6;
      o += `<rect x="${pad - 4}" y="${ry}" width="${cf.perRow * mw + 8}" height="12" fill="#b9bcc0" stroke="#7b7e82"/>`;                      // rail DIN
      for (let m = r.u; m < cf.perRow; m++) o += `<rect x="${pad + m * mw + 1}" y="${y}" width="${mw - 2}" height="${dh}" rx="3" fill="#eceae4" stroke="#c4c1b8" stroke-dasharray="3 3"/>`;
      r.d.forEach((d) => { const x = pad + d.x * mw + 1, w = d.mods * mw - 2; o += deviceArt(d, x, y, w, dh, d.cid && cat[d.cid] && cat[d.cid].img); o += `<text x="${x + w / 2}" y="${y + dh + 14}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${esc(d.label)}</text>`; });
      o += `<text x="${pad}" y="${y - 2}" font-size="9" fill="#666">Rangée ${ri + 1}</text>`;
    });
    return o + '</svg>';
  }

  function resultHTML(study, res) {
    const cfg = EE.Config.get(), M = EE.Config.money, s = res.summary;
    const unpriced = res.items.filter((i) => !i.price).length;
    let h = `<div class="qsum"><span><b>${res.rooms.length}</b> pièce(s)</span><span><b>${s.lights}</b> points lumineux</span><span><b>${s.sockets}</b> prises</span><span><b>${s.circuits}</b> circuits</span><span><b>${res.coffret ? esc(res.coffret.name) : '—'}</b></span></div>`;
    if (res.warns.length) h += `<div class="warn">${res.warns.map((w) => '⚠ ' + esc(w)).join('<br>')}</div>`;
    if (!res.circuits.length) return h + '<p class="muted">Ajoutez des points lumineux, des prises ou des appareils pour obtenir le matériel.</p>';
    h += `<h2 id="qmat">Liste du matériel</h2>`;
    if (unpriced) h += `<p class="muted small no-print">${unpriced} article(s) sans prix : renseignez les prix dans le <b>Portail administrateur › Catalogue</b> pour obtenir le total.</p>`;
    h += `<div class="qwrap"><table class="qt"><thead><tr><th></th><th>Désignation</th><th class="r">Qté</th><th>Unité</th><th class="r">Prix unitaire</th><th class="r">Total</th></tr></thead><tbody>`;
    let lastCat = ''; const symOf = {}; cfg.catalog.forEach((c) => { if (c.sym) symOf[c.id] = c.sym; });
    res.items.forEach((i) => { if (i.cat !== lastCat) { h += `<tr class="cat"><td colspan="6">${esc(i.cat)}</td></tr>`; lastCat = i.cat; } h += `<tr><td class="symcell">${(symOf[i.id] && EE.app.ui.symbol(symOf[i.id], 34)) || ''}</td><td>${esc(i.name)}${i.norm ? `<br><small class="muted">${esc(i.norm)}</small>` : ''}</td><td class="r"><b>${i.qty}</b></td><td>${esc(i.unit)}</td><td class="r">${i.price ? M(i.price) : '—'}</td><td class="r">${i.price ? M(i.total) : '—'}</td></tr>`; });
    h += `</tbody><tfoot><tr><td colspan="5">Matériel</td><td class="r">${M(res.totals.material)}</td></tr>${res.totals.labour ? `<tr><td colspan="5">Main-d'œuvre (${cfg.rules.labourPct} %)</td><td class="r">${M(res.totals.labour)}</td></tr>` : ''}${res.totals.contingency ? `<tr><td colspan="5">Imprévus (${cfg.rules.contingencyPct} %)</td><td class="r">${M(res.totals.contingency)}</td></tr>` : ''}<tr class="tot"><td colspan="5">TOTAL</td><td class="r">${M(res.totals.total)}</td></tr></tfoot></table></div>`;
    h += `<h2 id="qcir">Circuits et protections</h2><div class="qwrap"><table class="qt"><thead><tr><th>Circuit</th><th>Désignation</th><th class="r">Disjoncteur</th><th class="r">Section</th><th class="r">Points</th><th>Différentiel</th><th>Pièces</th></tr></thead><tbody>${res.circuits.map((c) => `<tr><td><b>${c.id}</b></td><td>${esc(c.label)}</td><td class="r">${c.breaker} A</td><td class="r">${String(c.section).replace('.', ',')} mm²</td><td class="r">${c.points}</td><td>${esc(c.diff || '')}</td><td>${esc(c.where)}</td></tr>`).join('')}</tbody></table></div>`;
    h += `<p class="small muted">Courant total des disjoncteurs × coefficient de foisonnement ${cfg.rules.diversity} = <b>${res.totalCurrent.toFixed(1)} A</b> → disjoncteur général proposé : <b>${res.mainA} A</b> (à confirmer par un calcul de puissance).</p>`;
    const norms = [...new Set(res.items.filter((i) => ['Protection', 'Coffret'].includes(i.cat) && i.norm).map((i) => i.norm))];
    if (res.coffret) { const c = res.coffret; h += `<h2 id="qcof">Composition du coffret</h2><p><b>${esc(c.name)}</b> – ${c.used} module(s) utilisé(s) sur ${c.nRows * c.perRow} ; ${c.free} libre(s) (réserve ${c.reservePct} %).</p>${coffretSVG(c)}<p class="small muted">Représentation de face des appareils sur rail DIN (levier rouge : disjoncteur général ; bouton jaune « T » : test du différentiel ; pointillés : places libres). Chaque rangée est alimentée par un peigne ; les places libres reçoivent des obturateurs. Vous pouvez remplacer ces dessins par les photos de vos appareils dans Portail › Catalogue.</p>${norms.length ? `<p class="small"><b>Normes européennes :</b> ${norms.map(esc).join(' · ')}</p>` : ''}`; }
    h += `<p class="small muted">Estimation de métré à partir des dimensions saisies, des règles de calcul et des prix du catalogue (modifiables dans le Portail). Elle ne remplace ni l'étude détaillée ni la vérification par un professionnel qualifié.</p>`;
    return h;
  }

  function renderQuant() {
    const A = EE.app, u = EE.Store.Users.current(); let list = Studies.list();
    if (!list.length) { const s = Q.newStudy('Étude 1'); Studies.put(s); list = [s]; }
    if (!cur || !Studies.get(cur)) cur = list[0].id;
    const st = Studies.get(cur), cfg = EE.Config.get();
    $('#main').innerHTML = `<div class="page"><div class="bar no-print"><h1>Quantitatif et coffret</h1><div class="grow"></div>
        <select id="qsel" aria-label="Étude">${list.map((s) => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <button class="btn" id="qnew">Nouvelle</button><button class="btn" id="qren">Renommer</button><button class="btn" id="qdup">Dupliquer</button><button class="btn danger" id="qdel">Supprimer</button></div>
      <p class="muted no-print">Saisissez les dimensions des pièces et les appareils à installer : l'application calcule les câbles, conduits, appareillage, protections et la composition du coffret. Les règles et les prix se règlent dans le Portail.</p>
      <div class="printonly phead"><b>${esc(cfg.brand.company)}</b><br>${esc(cfg.brand.contact)}<br>Étude : <b>${esc(st.name)}</b> – ${EE.fmtDate(Date.now())}</div>
      <section class="card flat no-print"><h2>1. Pièces</h2><div class="qwrap"><table class="qt in"><thead><tr><th>Pièce</th><th>Long. (m)</th><th>Larg. (m)</th><th>Haut. (m)</th><th title="Distance entre le coffret et la pièce">Dist. coffret (m)</th><th>Points lumineux</th><th>Interr. simples</th><th>Va-et-vient (circuits)</th><th>Prises 16 A</th><th></th></tr></thead><tbody id="qrooms"></tbody></table></div>
        <button class="btn" id="qaddr">＋ Ajouter une pièce</button></section>
      <section class="card flat no-print"><h2>2. Appareils spécialisés</h2><div id="qapps"></div><button class="btn" id="qadda">＋ Ajouter un appareil</button><p class="small muted">Chaque appareil reçoit son propre circuit (calibre et section réglés dans le Portail).</p></section>
      <div class="btnrow no-print"><button class="btn primary" id="qcsv">Exporter en CSV (Excel)</button><button class="btn" id="qprint">Imprimer / enregistrer en PDF</button></div>
      <div id="qres" class="qres"></div></div>`;
    const rooms = $('#qrooms'), apps = $('#qapps');
    const num = (k, v, w = 70, step = 'any') => `<input data-k="${k}" type="number" min="0" step="${step}" value="${esc(v)}" style="width:${w}px" inputmode="decimal">`;
    const drawRooms = () => { rooms.innerHTML = st.rooms.map((r, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(r.name)}" style="width:130px"></td><td>${num('L', r.L)}</td><td>${num('W', r.W)}</td><td>${num('H', r.H)}</td><td>${num('dist', r.dist)}</td><td>${num('lights', r.lights, 60, 1)}</td><td>${num('switches', r.switches, 60, 1)}</td><td>${num('vav', r.vav, 60, 1)}</td><td>${num('sockets', r.sockets, 60, 1)}</td><td><button class="btn small danger" data-del="${i}" aria-label="Supprimer la pièce">✕</button></td></tr>`).join(''); };
    const drawApps = () => {
      apps.innerHTML = st.appliances.length ? st.appliances.map((a, i) => `<div class="qapp" data-i="${i}"><select data-k="type">${cfg.specials.map((s) => `<option value="${s.id}"${s.id === a.type ? ' selected' : ''}>${esc(s.name)} (${s.breaker} A / ${String(s.section).replace('.', ',')} mm²)</option>`).join('')}</select>
        <select data-k="room">${st.rooms.map((r) => `<option value="${r.id}"${r.id === a.room ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}</select>${num('qty', a.qty, 60, 1)}<button class="btn small danger" data-adel="${i}" aria-label="Supprimer l'appareil">✕</button></div>`).join('') : '<p class="muted small">Aucun appareil spécialisé.</p>';
    };
    const recompute = () => { const res = Q.compute(st, EE.Config.get()); EE.lastQuant = { study: st, res }; $('#qres').innerHTML = resultHTML(st, res); };
    const saveSoon = () => { clearTimeout(timer); timer = setTimeout(() => { Studies.put(st); }, 200); recompute(); };
    drawRooms(); drawApps(); recompute();
    rooms.oninput = (e) => { const tr = e.target.closest('tr'); if (!tr || !e.target.dataset.k) return; const r = st.rooms[+tr.dataset.i]; r[e.target.dataset.k] = e.target.dataset.k === 'name' ? e.target.value : e.target.value; saveSoon(); };
    rooms.onclick = (e) => { const b = e.target.closest('[data-del]'); if (!b) return; const r = st.rooms[+b.dataset.del]; st.rooms.splice(+b.dataset.del, 1); st.appliances = st.appliances.filter((a) => a.room !== r.id); drawRooms(); drawApps(); Studies.put(st); recompute(); };
    $('#qaddr').onclick = () => { st.rooms.push(Q.newRoom('Pièce ' + (st.rooms.length + 1))); drawRooms(); drawApps(); Studies.put(st); recompute(); };
    apps.oninput = apps.onchange = (e) => { const d = e.target.closest('.qapp'); if (!d || !e.target.dataset.k) return; st.appliances[+d.dataset.i][e.target.dataset.k] = e.target.value; saveSoon(); };
    apps.onclick = (e) => { const b = e.target.closest('[data-adel]'); if (!b) return; st.appliances.splice(+b.dataset.adel, 1); drawApps(); Studies.put(st); recompute(); };
    $('#qadda').onclick = () => { if (!st.rooms.length) return ui().toast('Ajoutez d\'abord une pièce.', 'bad'); st.appliances.push({ type: cfg.specials[0] && cfg.specials[0].id, room: st.rooms[0].id, qty: 1 }); drawApps(); Studies.put(st); recompute(); };
    $('#qsel').onchange = (e) => { cur = e.target.value; renderQuant(); };
    $('#qnew').onclick = async () => { const n = await nameBox('Nouvelle étude', ''); if (!n) return; const s = Q.newStudy(n); Studies.put(s); cur = s.id; renderQuant(); };
    $('#qren').onclick = async () => { const n = await nameBox('Renommer l\'étude', st.name); if (!n) return; st.name = n; Studies.put(st); renderQuant(); };
    $('#qdup').onclick = () => { const c = EE.clone(st); c.id = EE.uid('q'); c.name = st.name + ' (copie)'; c.created = Date.now(); Studies.put(c); cur = c.id; renderQuant(); };
    $('#qdel').onclick = async () => { if (await ui().confirmBox('Supprimer l\'étude', `Supprimer « <b>${esc(st.name)}</b> » ?`, 'Supprimer')) { Studies.remove(st.id); cur = null; renderQuant(); } };
    $('#qcsv').onclick = () => { const res = Q.compute(st, EE.Config.get()); EE.Export.download('Quantitatif_' + EE.Export.safe(st.name) + '.csv', new Blob([Q.toCSV(st, res)], { type: 'text/csv;charset=utf-8' })); ui().toast('Fichier CSV prêt', 'ok'); };
    $('#qprint').onclick = () => g.print();
  }
  async function nameBox(title, val) {
    return ui().modal({ title, body: `<label>Nom de l'étude<input id="qn" value="${esc(val)}" maxlength="60"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Valider', cls: 'primary', value: () => ($('#qn').value.trim() || null) }] });
  }
  EE.Screens = EE.Screens || {}; EE.Screens.quant = renderQuant;
})(window);
