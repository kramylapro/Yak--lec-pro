/* Yak-élec-pro – écran « Photovoltaïque » : grille de saisie, dimensionnement automatique, synoptique, matériel */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, PV = EE.PV;
  const ui = () => EE.app.ui, $ = (s, r = document) => r.querySelector(s);
  const key = () => 'eep.pv.' + EE.Store.Users.current().id;
  const Studies = { list() { return EE.Store.raw.get(key(), []); }, save(l) { EE.Store.raw.set(key(), l); }, get(id) { return Studies.list().find((s) => s.id === id); },
    put(s) { const l = Studies.list(), i = l.findIndex((x) => x.id === s.id); s.modified = Date.now(); if (i < 0) l.push(s); else l[i] = s; Studies.save(l); }, remove(id) { Studies.save(Studies.list().filter((s) => s.id !== id)); } };
  EE.PVStudies = Studies;
  let cur = null, timer = null;
  const f1 = (v) => (typeof v === 'number' ? String(Math.round(v * 10) / 10).replace('.', ',') : esc(v));

  function synoptic(res) {
    const d = res.design; if (!d) return '';
    const iso = d.kind === 'isole', cs = (s) => (s ? s.toString().replace('.', ',') + ' mm²' : '');
    const B = iso ? [
      ['Panneaux', `${d.panelsN} × ${res.panel.W} Wc`, `${d.np} chaîne(s) de ${d.ns}`, '#ffc83d'], ['Protection DC', 'Sectionneur DC', 'Parafoudre DC', '#e0e6ee'],
      ['Régulateur MPPT', `${d.nr} × ${d.mppt.Iout} A`, `${d.vbat} V`, '#bcd6ff'], ['Batteries', `${d.battery.cnt} éléments`, `${d.vbat} V / ${d.battery.p * d.battery.b.Ah} Ah`, '#c9eccb'],
      [d.hybrid ? 'Onduleur hybride' : 'Onduleur', d.inverter ? `${d.ninv} × ${d.inverter.Pcont} W` : '—', d.hybrid ? 'MPPT + chargeur intégrés' : 'pur sinus', '#bcd6ff'], ['Tableau AC', d.acBreaker ? `Disj. ${d.acBreaker} A + ID 30 mA` : '', '230 V', '#e0e6ee']]
      : [['Panneaux', `${d.panelsN} × ${res.panel.W} Wc`, `${d.np} chaîne(s) de ${d.ns}`, '#ffc83d'], ['Protection DC', 'Sectionneur DC', 'Parafoudre DC', '#e0e6ee'], ['Onduleur réseau', `${d.inverter.Pac / 1000} kW`, 'MPPT intégré', '#bcd6ff'], ['Tableau AC', d.acBreaker ? `Disj. ${d.acBreaker} A + ID 30 mA` : '', '230 V', '#e0e6ee'], ['Réseau', 'compteur', 'distributeur', '#f0f0f0']];
    if (iso && d.hybrid) { B.splice(2, 4, ['Onduleur hybride', `${d.inverter.Pcont} W – MPPT intégré`, `+ ${d.battery.cnt} batt. ${d.vbat} V / ${d.battery.p * d.battery.b.Ah} Ah`, '#bcd6ff'], ['Tableau AC', d.acBreaker ? `Disj. ${d.acBreaker} A + ID 30 mA` : '', '230 V', '#e0e6ee']); }
    const L = iso && d.hybrid ? [cs(d.Sdc), '', cs(d.Sac)] : iso ? [cs(d.Sdc), '', cs(d.Sbat), cs(d.Sbi), cs(d.Sac)] : [cs(d.Sdc), '', cs(d.Sac), ''];
    const w = 128, gap = 30, H = 120, W = B.length * w + (B.length - 1) * gap + 20;
    let o = `<svg class="pvsyn" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Synoptique de l'installation photovoltaïque">`;
    B.forEach((b, i) => { const x = 10 + i * (w + gap); o += `<rect x="${x}" y="24" width="${w}" height="70" rx="8" fill="${b[3]}" stroke="#333" stroke-width="1.4"/><text x="${x + w / 2}" y="44" text-anchor="middle" font-size="11.5" font-weight="700" fill="#17212b">${esc(b[0])}</text><text x="${x + w / 2}" y="62" text-anchor="middle" font-size="10" fill="#17212b">${esc(b[1])}</text><text x="${x + w / 2}" y="77" text-anchor="middle" font-size="9.5" fill="#333">${esc(b[2])}</text>`;
      if (i < B.length - 1) { const x2 = x + w; o += `<line x1="${x2}" y1="59" x2="${x2 + gap}" y2="59" stroke="#333" stroke-width="2"/><path d="M${x2 + gap - 6} 55 L${x2 + gap} 59 L${x2 + gap - 6} 63" fill="none" stroke="#333" stroke-width="2"/><text x="${x2 + gap / 2}" y="52" text-anchor="middle" font-size="8.5" fill="#444">${esc(L[i] || '')}</text>`; } });
    return o + '</svg>';
  }

  function resultHTML(st, res) {
    const M = EE.Config.money; let h = '';
    if (res.warns.length) h += `<div class="warn">${res.warns.map((w) => '⚠ ' + esc(w)).join('<br>')}</div>`;
    if (!res.ok) return h + '<p class="muted">Complétez la grille pour obtenir le dimensionnement.</p>';
    const d = res.design;
    h += `<div class="pvass"><b>Valeurs retenues :</b> ${res.assumptions.map((a) => `<span class="${a[2] ? 'std' : 'usr'}" title="${a[2] ? 'Valeur standard appliquée automatiquement' : 'Valeur saisie par vous'}">${esc(a[0])} : ${esc(a[1])}${a[2] ? ' <i>(standard)</i>' : ''}</span>`).join('')}</div>`;
    h += `<div class="pvcards">${d.kind === 'isole' ? `<div class="pvc"><small>Panneaux</small><b>${d.panelsN} × ${res.panel.W} Wc</b><span>${d.Pdc} Wc – ${d.np} chaîne(s) de ${d.ns}</span></div><div class="pvc"><small>Batteries</small><b>${d.battery.cnt} × ${esc(d.battery.b.name)}</b><span>${d.vbat} V – ${d.battery.p * d.battery.b.Ah} Ah</span></div>${d.hybrid ? `<div class="pvc"><small>Onduleur hybride (MPPT + chargeur intégrés)</small><b>${esc(d.inverter.name)}</b><span>Charge max ${d.inverter.Ichg} A – ${d.inverter.Pcont} W</span></div>` : `<div class="pvc"><small>Régulateur MPPT</small><b>${d.nr} × ${esc(d.mppt.name)}</b></div><div class="pvc"><small>Onduleur</small><b>${d.inverter ? d.ninv + ' × ' + esc(d.inverter.name) : '—'}</b></div>`}`
      : `<div class="pvc"><small>Panneaux</small><b>${d.panelsN} × ${res.panel.W} Wc</b><span>${d.Pdc} Wc – ${d.np} chaîne(s) de ${d.ns}</span></div><div class="pvc"><small>Onduleur réseau</small><b>${esc(d.inverter.name)}</b></div><div class="pvc"><small>Production estimée</small><b>${f1(d.prod)} kWh/jour</b></div>`}</div>`;
    const props = st.mode === 'reseau' ? [] : PV.proposals(st, EE.Config.get());
    if (props.length) {
      h += `<h2>Propositions <small class="muted">(choisissez la solution qui convient)</small></h2><div class="pvprops no-print">${props.map((o) => { const cur = (st.tech === o.pack.tech) && ((st.conv || 'separe') === o.pack.conv);
        if (!o.ok) return `<div class="pvprop"><h3>${esc(o.pack.name)}</h3><p class="small muted">${esc(o.pack.slogan)}</p><p class="small">Non réalisable avec le catalogue actuel (voir les avertissements).</p></div>`;
        return `<div class="pvprop${cur ? ' cur' : ''}${o.pack.id === 'moderne' ? ' reco' : ''}"><h3>${esc(o.pack.name)}</h3><p class="small muted">${esc(o.pack.slogan)}</p><ul class="small">
          <li><b>Batteries :</b> ${o.battery.cnt} × ${esc(o.battery.b.name)}</li><li><b>Stockage :</b> ${f1(o.nominalKWh)} kWh nominal, ${f1(o.usableKWh)} kWh utilisable (décharge ${Math.round(o.dod * 100)} %)</li>
          <li><b>Durée de vie indicative :</b> environ ${o.cycles} cycles, soit ${f1(o.years)} ans</li><li><b>Onduleur :</b> ${o.hybrid ? esc(o.inverter.name) + ' (1 appareil)' : `régulateur + onduleur (${o.devices} appareils)`}</li>
          <li><b>Panneaux :</b> ${o.panelsN} × ${o.res.panel.W} Wc – <b>tension :</b> ${o.vbat} V</li><li><b>Coût matériel :</b> ${o.priced ? M(o.total) : 'prix à renseigner dans le Portail'}</li></ul>
          ${cur ? '<span class="pill">✔ Choix actuel</span>' : `<button class="btn small primary" data-pack="${o.pack.id}">Choisir cette solution</button>`}</div>`; }).join('')}</div>
      <p class="small muted no-print">Durées de vie et décharge utile : valeurs indicatives modifiables dans le Portail (règles photovoltaïques). Le lithium (LiFePO4) accepte une décharge plus profonde, dure plus longtemps et pèse moins ; l'hybride réduit le câblage et permet la supervision à distance. Vérifier la compatibilité de communication entre batterie et onduleur (CAN / RS485) sur les fiches techniques.</p>`;
    }
    h += `<h2>Synoptique</h2><div class="qwrap">${synoptic(res)}</div>`;
    h += `<h2>Détail du dimensionnement</h2><div class="qwrap"><table class="qt"><thead><tr><th>Étape</th><th class="r">Valeur</th><th>Unité</th><th>Calcul</th></tr></thead><tbody>${res.steps.map((s) => `<tr><td>${esc(s.label)}</td><td class="r"><b>${f1(s.value)}</b></td><td>${esc(s.unit)}</td><td class="small muted">${esc(s.formula)}</td></tr>`).join('')}</tbody></table></div>`;
    h += `<h2>Liste du matériel</h2>${res.items.some((i) => !i.price) ? '<p class="muted small no-print">Prix à renseigner dans le Portail › Photovoltaïque (équipements) et › Catalogue (câbles et protections).</p>' : ''}<div class="qwrap"><table class="qt"><thead><tr><th>Désignation</th><th class="r">Qté</th><th>Unité</th><th class="r">Prix unitaire</th><th class="r">Total</th></tr></thead><tbody>`;
    let last = ''; res.items.forEach((i) => { if (i.cat !== last) { h += `<tr class="cat"><td colspan="5">${esc(i.cat)}</td></tr>`; last = i.cat; } h += `<tr><td>${esc(i.name)}${i.norm ? `<br><small class="muted">${esc(i.norm)}</small>` : ''}</td><td class="r"><b>${i.qty}</b></td><td>${esc(i.unit)}</td><td class="r">${i.price ? M(i.price) : '—'}</td><td class="r">${i.price ? M(i.total) : '—'}</td></tr>`; });
    h += `</tbody><tfoot><tr class="tot"><td colspan="4">TOTAL</td><td class="r">${M(res.totals.total)}</td></tr></tfoot></table></div>`;
    return h + '<p class="small muted">Dimensionnement indicatif établi avec les valeurs saisies et les règles du Portail. Les valeurs de panneaux, régulateurs, onduleurs et batteries du catalogue sont génériques : remplacez-les par les fiches techniques du matériel choisi. La conception finale doit être validée par un professionnel qualifié (règles d\'installation, HD 60364-7-712 pour les installations photovoltaïques).</p>';
  }

  function render() {
    const cfg = EE.Config.get(); let list = Studies.list();
    if (!list.length) { const s = PV.newStudy('Installation 1'); Studies.put(s); list = [s]; }
    if (!cur || !Studies.get(cur)) cur = list[0].id; const st = Studies.get(cur);
    const field = (label, inner, help) => `<label>${label}${inner}${help ? `<small>${help}</small>` : ''}</label>`;
    const num = (k, v, step) => `<input data-f="${k}" type="number" step="${step || 'any'}" min="0" value="${esc(v)}" inputmode="decimal">`;
    $('#main').innerHTML = `<div class="page"><div class="bar no-print"><h1>☀️ Photovoltaïque</h1><div class="grow"></div><select id="vsel" aria-label="Installation">${list.map((s) => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <button class="btn" id="vnew">Nouvelle</button><button class="btn" id="vren">Renommer</button><button class="btn" id="vdup">Dupliquer</button><button class="btn danger" id="vdel">Supprimer</button></div>
      <p class="muted no-print">Remplissez la grille : l'application calcule les panneaux, les chaînes, le régulateur, l'onduleur, les batteries, les câbles et les protections.</p>
      <div class="printonly phead"><b>${esc(cfg.brand.company)}</b><br>${esc(cfg.brand.contact)}<br>Étude : <b>${esc(st.name)}</b> – ${EE.fmtDate(Date.now())}</div>
      <section class="card flat no-print"><h2>1. Type d'installation</h2><div class="pvgrid">${field('Que voulez-vous installer ?', `<select data-f="mode"><option value="isole">Site isolé (avec batteries)</option><option value="reseau">Raccordé au réseau (sans batterie)</option></select>`)}</div>
        <p class="small muted">Seules les informations ci-dessous sont obligatoires. Tout le reste est réglé automatiquement avec des valeurs moyennes et usuelles (voir « Valeurs retenues » dans le résultat).</p></section>
      <section class="card flat no-print"><h2>2. Appareils à alimenter <small class="muted">(* obligatoire)</small></h2><div class="qwrap"><table class="qt in"><thead><tr><th>Appareil</th><th>Puissance (W) *</th><th>Quantité *</th><th>Heures / jour *</th><th title="Facultatif. Surintensité au démarrage : 1 = aucune, 3 à 6 pour un moteur (frigo, pompe)">Démarrage × <small>(facultatif)</small></th><th></th></tr></thead><tbody id="vloads"></tbody></table></div>
        <div class="btnrow"><button class="btn" id="vaddl">＋ Ajouter une ligne</button><select id="vpre" aria-label="Appareil courant"><option value="">＋ Appareil courant…</option>${PV.PRESETS.map((p, i) => `<option value="${i}">${esc(p[0])} (${p[1]} W)</option>`).join('')}</select></div><p class="small muted">Les valeurs des appareils courants sont indicatives : relevez la puissance sur la plaque signalétique de vos appareils.</p></section>
      <details class="card flat no-print"><summary><b>Réglages avancés (facultatif)</b> – des valeurs standard sont déjà appliquées</summary><div class="pvgrid" style="margin-top:10px">
        ${field('Heures de plein soleil (kWh/m²/jour)', num('hsp', st.hsp), 'Valeur moyenne par défaut ; mettez celle de votre site (mois le plus défavorable)')}
        ${field('Température minimale du site (°C)', `<input data-f="tmin" type="number" step="any" value="${esc(st.tmin)}">`)}
        ${field('Température maximale des cellules (°C)', `<input data-f="tcell" type="number" step="any" value="${esc(st.tcell)}">`, 'Environ 65 °C en climat chaud')}
        ${field('Panneau', `<select data-f="panel"><option value="auto">Automatique (le mieux adapté)</option>${cfg.pv.panels.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>`)}
        <div class="iso">${field('Tension du parc de batteries', `<select data-f="vbat"><option value="auto">Automatique</option><option>12</option><option>24</option><option>48</option></select>`)}</div>
        <div class="iso">${field('Type de batteries', `<select data-f="tech"><option value="lithium">Lithium LiFePO4 (moderne, recommandé)</option><option value="plomb">Plomb (AGM / gel / stationnaire)</option></select>`)}</div>
        <div class="iso">${field('Type d\'onduleur', `<select data-f="conv"><option value="hybride">Hybride tout-en-un (onduleur + chargeur + MPPT)</option><option value="separe">Séparés (régulateur MPPT + onduleur / chargeur)</option></select>`)}</div>
        <div class="iso">${field('Autonomie sans soleil (jours)', num('days', st.days), 'Usage courant : 1 à 3 jours')}</div>
        <div class="iso">${field('Coefficient de simultanéité', num('sim', st.sim), 'Part de la puissance installée utilisée en même temps (0 à 1)')}</div>
        <div class="iso"><label class="chk"><input data-f="acLoads" type="checkbox"> Appareils en courant alternatif (onduleur)</label></div>
        <div class="grid">${field('Couverture de la consommation visée (%)', num('coverage', st.coverage))}${field('Puissance crête imposée (Wc, 0 = automatique)', num('kwc', st.kwc))}</div>
        ${field('Distance panneaux → régulateur / onduleur (m)', num('d.dc', st.dist.dc))}
        <div class="iso">${field('Distance régulateur → batteries (m)', num('d.bat', st.dist.bat))}</div><div class="iso">${field('Distance batteries → onduleur (m)', num('d.bi', st.dist.bi))}</div>
        ${field('Distance onduleur → tableau AC (m)', num('d.ac', st.dist.ac))}</div></details>
      <div class="btnrow no-print"><button class="btn primary" id="vcsv">Exporter en CSV (Excel)</button><button class="btn" id="vprint">Imprimer / enregistrer en PDF</button></div><div id="vres"></div></div>`;
    // valeurs
    const setv = (k, v) => { const e = $(`[data-f="${k}"]`); if (!e) return; if (e.type === 'checkbox') e.checked = !!v; else e.value = v; };
    ['mode', 'panel', 'vbat', 'tech'].forEach((k) => setv(k, st[k])); setv('conv', st.conv || 'separe'); setv('acLoads', st.acLoads !== false);
    const iso = () => { $$('.iso').forEach((e) => e.classList.toggle('hide', st.mode !== 'isole')); const gd = $('.grid'); gd.classList.toggle('hide', st.mode !== 'reseau'); $$('.grid label').forEach((l) => (l.style.display = '')); };
    const $$ = (s) => [...document.querySelectorAll(s)];
    const drawLoads = () => { $('#vloads').innerHTML = st.loads.map((l, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(l.name)}" style="width:210px"></td><td><input data-k="P" type="number" min="0" step="any" value="${esc(l.P)}" style="width:80px"></td><td><input data-k="n" type="number" min="0" step="1" value="${esc(l.n)}" style="width:60px"></td><td><input data-k="h" type="number" min="0" max="24" step="any" value="${esc(l.h)}" style="width:70px"></td><td><input data-k="start" type="number" min="1" step="any" value="${esc(l.start)}" style="width:60px"></td><td><button class="btn small danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join(''); };
    const recompute = () => { const res = PV.compute(st, EE.Config.get()); EE.lastPV = { study: st, res }; $('#vres').innerHTML = resultHTML(st, res); };
    const soon = () => { clearTimeout(timer); timer = setTimeout(() => Studies.put(st), 200); recompute(); };
    drawLoads(); iso(); recompute();
    $('.page').addEventListener('input', (e) => {
      const t = e.target, f = t.dataset.f, tr = t.closest('#vloads tr');
      if (tr && t.dataset.k) { st.loads[+tr.dataset.i][t.dataset.k] = t.value; soon(); return; }
      if (!f) return; const v = t.type === 'checkbox' ? t.checked : t.value;
      if (f.startsWith('d.')) st.dist[f.slice(2)] = v; else st[f] = (['mode', 'panel', 'tech'].includes(f) || t.type === 'checkbox') ? v : v;
      if (f === 'mode') iso(); soon();
    });
    $('#vres').onclick = (e) => { const b = e.target.closest('[data-pack]'); if (!b) return; const pk = PV.PACKS.find((x) => x.id === b.dataset.pack); st.tech = pk.tech; st.conv = pk.conv; setv('tech', st.tech); setv('conv', st.conv); Studies.put(st); recompute(); ui().toast('Solution « ' + pk.name + ' » appliquée', 'ok'); };
    $('#vloads').onclick = (e) => { const b = e.target.closest('[data-del]'); if (!b) return; st.loads.splice(+b.dataset.del, 1); drawLoads(); Studies.put(st); recompute(); };
    $('#vaddl').onclick = () => { st.loads.push({ name: 'Appareil', P: 50, n: 1, h: 4, start: 1 }); drawLoads(); Studies.put(st); recompute(); };
    $('#vpre').onchange = (e) => { if (e.target.value === '') return; const p = PV.PRESETS[+e.target.value]; st.loads.push({ name: p[0], P: p[1], n: 1, h: p[2], start: p[3] || 1 }); e.target.value = ''; drawLoads(); Studies.put(st); recompute(); };
    $('#vsel').onchange = (e) => { cur = e.target.value; render(); };
    const nameBox = (title, val) => ui().modal({ title, body: `<label>Nom<input id="vn" value="${esc(val)}" maxlength="60"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Valider', cls: 'primary', value: () => ($('#vn').value.trim() || null) }] });
    $('#vnew').onclick = async () => { const n = await nameBox('Nouvelle installation', ''); if (!n) return; const s = PV.newStudy(n); Studies.put(s); cur = s.id; render(); };
    $('#vren').onclick = async () => { const n = await nameBox('Renommer', st.name); if (!n) return; st.name = n; Studies.put(st); render(); };
    $('#vdup').onclick = () => { const c = EE.clone(st); c.id = EE.uid('v'); c.name = st.name + ' (copie)'; Studies.put(c); cur = c.id; render(); };
    $('#vdel').onclick = async () => { if (await ui().confirmBox('Supprimer l\'installation', `Supprimer « <b>${esc(st.name)}</b> » ?`, 'Supprimer')) { Studies.remove(st.id); cur = null; render(); } };
    $('#vcsv').onclick = () => { const res = PV.compute(st, EE.Config.get()); EE.Export.download('Photovoltaique_' + EE.Export.safe(st.name) + '.csv', new Blob([PV.toCSV(st, res)], { type: 'text/csv;charset=utf-8' })); ui().toast('Fichier CSV prêt', 'ok'); };
    $('#vprint').onclick = () => g.print();
  }
  EE.Screens = EE.Screens || {}; EE.Screens.pv = render;
})(window);
