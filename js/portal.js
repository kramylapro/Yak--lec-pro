/* Yak-élec-pro – Portail administrateur : modifier l'application sans programmer */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, C = () => EE.Config;
  const ui = () => EE.app.ui, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let tab = 'look';
  const TABS = [['look', '🎨 Apparence et textes'], ['cat', '📦 Catalogue et prix'], ['rules', '📐 Règles de calcul'], ['pv', '☀️ Photovoltaïque'], ['sym', '🔣 Fiches des symboles'], ['save', '💾 Sauvegarde et mise à jour'], ['remote', '📡 Contrôle à distance'], ['stats', '👥 Connexions']];

  // texte descriptif de l'application (modifiable dans « Apparence et textes »)
  const aboutCard = () => `<section class="card flat about"><h2>📘 À propos de ${esc(C().get().brand.name1 + C().get().brand.name2)} <small class="muted">V${esc(EE.VERSION)}</small></h2>${C().aboutText().split('\n').map((t) => t.trim()).filter(Boolean).map((t) => `<p>${esc(t)}</p>`).join('')}</section>`;
  function renderPortal() {
    const u = EE.Store.Users.current();
    const box = (inner) => (EE.main('portal').innerHTML = `<div class="page narrow">${inner}</div>`);
    if (!C().isAdmin(u)) { box('<section class="card flat"><p>Accès refusé.</p></section>'); return; }
    if (!EE.portalUnlocked) {
      box(`<h1>🛠️ Portail administrateur</h1>${aboutCard()}<section class="card flat"><p>Zone protégée. Entrez le mot de passe administrateur.</p>${ui().pwField('pp', 'Mot de passe administrateur')}<p class="err" id="perr"></p><button class="btn primary" id="punlock">Entrer dans le portail</button></section>`);
      ui().bindEyes(EE.main('portal'));
      const go = () => {
        if (Date.now() < (EE.portalLockUntil || 0)) { $('#perr').textContent = 'Trop d\'essais : patientez quelques secondes.'; return; }
        if (C().checkAdminPassword($('#pp').value)) { EE.portalUnlocked = true; EE.portalFails = 0; C().log('Entrée dans le portail'); renderPortal(); return; }
        EE.portalFails = (EE.portalFails || 0) + 1; if (EE.portalFails >= 5) { EE.portalLockUntil = Date.now() + 30000; EE.portalFails = 0; }
        $('#perr').textContent = 'Mot de passe incorrect.';
      };
      $('#punlock').onclick = go; $('#pp').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      return;
    }
    EE.main('portal').innerHTML = `<div class="page"><div class="bar"><h1>🛠️ Portail administrateur</h1><div class="grow"></div><button class="btn small" id="plock">🔒 Verrouiller</button></div>
      ${aboutCard()}<p class="muted">Modifiez l'application avec de simples formulaires : aucune programmation. Les changements s'appliquent immédiatement sur cet appareil ; pour les mettre sur un autre appareil, utilisez « Sauvegarde et mise à jour ».</p>
      <div class="chips ptabs">${TABS.map(([k, l]) => `<button class="chip${k === tab ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div><div id="pbody"></div></div>`;
    $('#plock').onclick = () => { EE.portalUnlocked = false; EE.app.go('home'); };
    $$('.ptabs .chip').forEach((b) => (b.onclick = () => { tab = b.dataset.t; renderPortal(); }));
    ({ look, cat: catalogue, rules, pv: pvTab, sym: symbols, save: backup, remote: remoteTab, stats: statsTab })[tab]($('#pbody'));
  }

  // ---------- 1. Apparence ----------
  function look(el) {
    const cf = C().get(), b = cf.brand;
    el.innerHTML = `<section class="card flat"><h2>Nom, textes et contact</h2>
      <div class="two"><label>Nom de l'application (partie normale)<input id="b1" value="${esc(b.name1)}"></label><label>Nom (partie colorée)<input id="b2" value="${esc(b.name2)}"></label></div>
      <label>Slogan (écran de connexion)<input id="bs" value="${esc(b.slogan)}"></label>
      <label>Message d'accueil (après « Bonjour … – »)<input id="bw" value="${esc(b.welcome)}"></label>
      <label>Texte de présentation de l'application (affiché en haut du portail ; un paragraphe par ligne)<textarea id="bab" rows="7">${esc(C().aboutText())}</textarea></label>
      <label>Entreprise / établissement (en-tête des devis imprimés)<input id="bc" value="${esc(b.company)}"></label>
      <label>Contact (téléphone, adresse, e-mail)<input id="bt" value="${esc(b.contact)}"></label>
      <h4>Page « Contact » (vos coordonnées)</h4>
      <label>Votre nom<input id="on" value="${esc((b.owner || {}).name || '')}" placeholder="Prénom et nom"></label>
      <div class="two"><label>E-mail<input id="oe" type="email" value="${esc((b.owner || {}).email || '')}"></label><label>Téléphone / WhatsApp (avec l'indicatif)<input id="op" value="${esc((b.owner || {}).phone || '')}"></label></div>
      <label>Monnaie des prix<input id="bm" value="${esc(cf.currency)}" maxlength="8" style="max-width:140px"></label></section>
      <section class="card flat"><h2>Couleurs</h2><div class="two"><label>Couleur principale (en-tête)<input id="bcol" type="color" value="${esc(b.color)}"></label><label>Couleur d'accent (boutons)<input id="bacc" type="color" value="${esc(b.accent)}"></label></div></section>
      <section class="card flat"><h2>Logo</h2><div class="logoprev"><img id="lprev" src="${EE.LOGO_FULL}" alt="Logo actuel"></div>
        <div class="btnrow"><label class="btn" for="lfile">Choisir une image (PNG, JPG)…</label><input id="lfile" type="file" accept="image/*" class="hide"><button class="btn" id="lreset">Rétablir le logo d'origine</button></div>
        <p class="small muted">Conseil : image sur fond transparent (PNG), largeur d'au moins 400 pixels.</p></section>
      <div class="btnrow"><button class="btn primary" id="lsave">Enregistrer l'apparence</button><button class="btn" id="lrst">Tout rétablir (apparence)</button></div>`;
    $('#lsave').onclick = () => { C().set((c) => { Object.assign(c.brand, { name1: $('#b1').value, name2: $('#b2').value, slogan: $('#bs').value, welcome: $('#bw').value, about: $('#bab').value, company: $('#bc').value, contact: $('#bt').value, owner: { name: $('#on').value.trim(), email: $('#oe').value.trim(), phone: $('#op').value.trim() }, color: $('#bcol').value, accent: $('#bacc').value }); c.currency = $('#bm').value.trim() || 'GNF'; }, 'Apparence et textes modifiés'); ui().toast('Apparence enregistrée', 'ok'); renderPortalShell(); };
    $('#lrst').onclick = async () => { if (await ui().confirmBox('Rétablir l\'apparence', 'Remettre le nom, les textes, les couleurs et le logo d\'origine ?', 'Rétablir')) { C().reset('brand'); renderPortalShell(); } };
    $('#lreset').onclick = () => { C().set((c) => (c.brand.logo = null), 'Logo d\'origine rétabli'); renderPortalShell(); };
    $('#lfile').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
        const k = Math.min(1, 700 / im.width), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        C().set((c) => (c.brand.logo = cv.toDataURL('image/png')), 'Logo remplacé'); ui().toast('Logo remplacé', 'ok'); renderPortalShell(); };
        im.onerror = () => ui().toast('Image illisible.', 'bad'); im.src = rd.result; };
      rd.readAsDataURL(f);
    };
  }
  function renderPortalShell() { const t = tab; const y = g.scrollY; EE.app.go('portal'); tab = t; g.scrollTo(0, y); }

  // ---------- 2. Catalogue ----------
  function catalogue(el, q = '') {
    const cf = C().get(), cats = [...new Set(cf.catalog.map((c) => c.cat))];
    const rows = cf.catalog.map((c, i) => ({ c, i })).filter(({ c }) => (c.name + c.cat + c.id).toLowerCase().includes(q.toLowerCase()));
    el.innerHTML = `<section class="card flat"><div class="bar"><h2>Catalogue du matériel (${cf.catalog.length} articles)</h2><div class="grow"></div><input id="cq" placeholder="Rechercher…" value="${esc(q)}"></div>
      <p class="small muted">Modifiez directement un prix ou un nom : l'enregistrement est automatique. Le <b>nombre de modules</b> (18 mm) sert à calculer la place dans le coffret. Les articles « Coffret » indiquent le nombre de rangées et de modules par rangée.</p>
      <div class="btnrow"><button class="btn primary" id="cadd">＋ Ajouter un article</button><button class="btn" id="cinc">Augmenter / baisser tous les prix de…</button><button class="btn" id="cexp">Exporter (CSV / Excel)</button><label class="btn" for="cimp">Importer un CSV…</label><input id="cimp" type="file" accept=".csv,text/csv" class="hide"></div>
      <div class="qwrap"><table class="qt in"><thead><tr><th>Catégorie</th><th>Désignation</th><th>Unité</th><th class="r">Prix (${esc(cf.currency)})</th><th class="r">Modules</th><th class="r">Rangées</th><th class="r">Mod./rang.</th><th>Norme</th><th>Symbole</th><th>Photo</th><th></th></tr></thead><tbody id="ctb">${rows.map(({ c, i }) => `<tr data-i="${i}"><td><input data-k="cat" value="${esc(c.cat)}" list="cats" style="width:110px"></td><td><input data-k="name" value="${esc(c.name)}" style="width:300px"></td><td><input data-k="unit" value="${esc(c.unit)}" style="width:50px"></td><td><input data-k="price" type="number" min="0" step="any" value="${c.price || 0}" style="width:100px"></td><td><input data-k="mods" type="number" min="0" step="1" value="${c.mods || 0}" style="width:60px"></td><td><input data-k="rows" type="number" min="0" step="1" value="${c.rows || ''}" style="width:60px"></td><td><input data-k="perRow" type="number" min="0" step="1" value="${c.perRow || ''}" style="width:60px"></td><td><input data-k="norm" value="${esc(c.norm || '')}" style="width:190px"></td><td class="symcell">${EE.app.ui.symbol(c.sym, 30)}<select data-k="sym" style="max-width:150px"><option value="">— aucun —</option>${EE.Library.list.map((d) => `<option value="${d.id}"${d.id === c.sym ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}</select></td><td class="symcell">${c.img ? `<img src="${c.img}" alt="" class="cphoto"><button class="btn small" data-noimg="${i}" aria-label="Retirer la photo">✕</button>` : ''}<label class="btn small" for="ph${i}" title="Ajouter une photo de l'appareil">📷</label><input id="ph${i}" type="file" accept="image/*" class="hide" data-photo="${i}"></td><td><button class="btn small danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('') || '<tr><td colspan="11" class="muted">Aucun article.</td></tr>'}</tbody></table></div><datalist id="cats">${cats.map((c) => `<option value="${esc(c)}">`).join('')}</datalist></section>`;
    $('#cq').oninput = (e) => { catalogue(el, e.target.value); const i = $('#cq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#ctb').onchange = (e) => { const tr = e.target.closest('tr'), k = e.target.dataset.k; if (!tr || !k) return; let v = e.target.value; if (['price', 'mods', 'rows', 'perRow'].includes(k)) v = Math.max(0, parseFloat(v) || 0); C().set((c) => { const it = c.catalog[+tr.dataset.i]; if (['rows', 'perRow'].includes(k) && !v) delete it[k]; else if (k === 'sym') it.sym = v || null; else it[k] = v; }, null); if (k === 'sym') catalogue(el, q); };
    $('#ctb').addEventListener('change', (e) => {
      const inp = e.target.closest('[data-photo]'); if (!inp || !inp.files[0]) return; const idx = +inp.dataset.photo, f = inp.files[0];
      const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const k = Math.min(1, 260 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height); const url = cv.toDataURL('image/jpeg', 0.82); C().set((c) => (c.catalog[idx].img = url), 'Photo ajoutée : ' + cf.catalog[idx].name); ui().toast('Photo enregistrée', 'ok'); catalogue(el, q); }; im.onerror = () => ui().toast('Image illisible.', 'bad'); im.src = rd.result; }; rd.readAsDataURL(f);
    });
    $('#ctb').onclick = async (e) => { const nb = e.target.closest('[data-noimg]'); if (nb) { C().set((c) => delete c.catalog[+nb.dataset.noimg].img, 'Photo retirée'); catalogue(el, q); return; } const b = e.target.closest('[data-del]'); if (!b) return; const it = cf.catalog[+b.dataset.del]; if (await ui().confirmBox('Supprimer l\'article', `Supprimer « <b>${esc(it.name)}</b> » du catalogue ?`, 'Supprimer')) { C().set((c) => c.catalog.splice(+b.dataset.del, 1), 'Article supprimé : ' + it.name); catalogue(el, q); } };
    $('#cadd').onclick = async () => {
      const r = await ui().modal({ title: 'Nouvel article', wide: false, body: `<label>Catégorie<input id="na" list="cats" value="Appareillage"></label><label>Désignation<input id="nn"></label><div class="two"><label>Unité<input id="nu" value="pce"></label><label>Prix<input id="np" type="number" min="0" step="any" value="0"></label></div><label>Modules de 18 mm (appareils de protection, sinon 0)<input id="nm" type="number" min="0" step="1" value="0"></label><label>Identifiant technique (facultatif, ex. disj_45)<input id="ni"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Ajouter', cls: 'primary', value: () => ({ cat: $('#na').value.trim() || 'Autres', name: $('#nn').value.trim(), unit: $('#nu').value.trim() || 'pce', price: +$('#np').value || 0, mods: +$('#nm').value || 0, id: $('#ni').value.trim() }) }] });
      if (!r || !r.name) return; r.id = r.id || EE.uid('x'); if (cf.catalog.some((c) => c.id === r.id)) return ui().toast('Cet identifiant existe déjà.', 'bad');
      C().set((c) => c.catalog.push(r), 'Article ajouté : ' + r.name); catalogue(el, q);
    };
    $('#cinc').onclick = async () => { const p = await ui().modal({ title: 'Modifier tous les prix', body: '<label>Pourcentage (ex. 10 pour +10 %, -5 pour −5 %)<input id="pc" type="number" step="any" value="10"></label>', buttons: [{ label: 'Annuler', value: null }, { label: 'Appliquer', cls: 'primary', value: () => parseFloat($('#pc').value) }] }); if (p == null || isNaN(p)) return; C().set((c) => c.catalog.forEach((i) => (i.price = Math.round((i.price || 0) * (1 + p / 100)))), `Prix modifiés de ${p} %`); ui().toast('Prix mis à jour', 'ok'); catalogue(el, q); };
    $('#cexp').onclick = () => { const L = ['id;categorie;designation;unite;prix;modules;rangees;modules_par_rangee']; cf.catalog.forEach((c) => L.push([c.id, c.cat, c.name, c.unit, c.price || 0, c.mods || 0, c.rows || '', c.perRow || ''].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';'))); EE.Export.download('catalogue_materiel.csv', new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8' })); };
    $('#cimp').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const n = importCSV(await f.text()); ui().toast(n + ' article(s) importé(s) ou mis à jour', 'ok'); catalogue(el, q); } catch (er) { ui().toast(er.message, 'bad'); } };
  }
  function parseCSV(t) {
    t = t.replace(/^﻿/, ''); const sep = (t.split('\n')[0].match(/;/g) || []).length >= (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; } else cur += ch; }
    row.push(cur); if (row.some((x) => x !== '')) rows.push(row); return rows;
  }
  function importCSV(text) {
    const rows = parseCSV(text); if (rows.length < 2) throw new Error('Fichier vide.');
    const h = rows[0].map((x) => x.trim().toLowerCase()); const ix = (n) => h.indexOf(n); if (ix('id') < 0 || ix('designation') < 0 || ix('prix') < 0) throw new Error('Colonnes attendues : id;categorie;designation;unite;prix;modules;rangees;modules_par_rangee');
    let n = 0; const num = (v) => { const x = parseFloat(String(v || '').replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : 0; };
    C().set((c) => { rows.slice(1).forEach((r) => { const id = (r[ix('id')] || '').trim(); if (!id) return; let it = c.catalog.find((x) => x.id === id); if (!it) { it = { id, cat: 'Autres', name: id, unit: 'pce', price: 0, mods: 0 }; c.catalog.push(it); } if (ix('categorie') >= 0 && r[ix('categorie')]) it.cat = r[ix('categorie')]; it.name = r[ix('designation')] || it.name; if (ix('unite') >= 0 && r[ix('unite')]) it.unit = r[ix('unite')]; it.price = num(r[ix('prix')]); if (ix('modules') >= 0) it.mods = num(r[ix('modules')]); if (ix('rangees') >= 0 && num(r[ix('rangees')])) it.rows = num(r[ix('rangees')]); if (ix('modules_par_rangee') >= 0 && num(r[ix('modules_par_rangee')])) it.perRow = num(r[ix('modules_par_rangee')]); n++; }); }, 'Import du catalogue (CSV)');
    return n;
  }

  // ---------- 3. Règles ----------
  function rules(el) {
    const cf = C().get(), R = cf.rules;
    const fld = (r) => r.type === 'bool' ? `<label class="chk"><input type="checkbox" data-r="${r.k}" ${R[r.k] ? 'checked' : ''}> ${esc(r.label)}</label>` : r.type === 'select' ? `<label>${esc(r.label)}<select data-r="${r.k}">${r.opts.map(([v, l]) => `<option value="${v}"${R[r.k] === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${r.help ? `<small>${esc(r.help)}</small>` : ''}</label>` : `<label>${esc(r.label)}${r.unit ? ' (' + esc(r.unit) + ')' : ''}<input data-r="${r.k}" type="number" min="0" step="${r.step || 'any'}" value="${R[r.k]}">${r.help ? `<small>${esc(r.help)}</small>` : ''}</label>`;
    el.innerHTML = `<section class="card flat"><h2>Règles de calcul du quantitatif</h2><p class="small muted">Les appareils respectent les normes européennes de produit (EN 60898-1, EN 61008-1…). Les <b>règles de répartition</b> ci-dessous (nombre de prises par circuit, sections…) sont celles de la NF C 15-100 (France) : la norme européenne HD 60364 / CEI 60364 fixe les principes de sécurité mais pas ces nombres. Adaptez-les à la réglementation de votre pays.</p><div class="two">${C().RULES.map(fld).join('')}</div><div class="btnrow"><button class="btn primary" id="rsave">Enregistrer les règles</button><button class="btn" id="rrst">Rétablir les valeurs d'origine</button></div></section>
      <section class="card flat"><h2>Appareils spécialisés (circuits dédiés)</h2><div class="qwrap"><table class="qt in"><thead><tr><th>Appareil</th><th class="r">Disjoncteur (A)</th><th class="r">Section (mm²)</th><th>Différentiel type A</th><th></th></tr></thead><tbody id="sptb">${cf.specials.map((s, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(s.name)}" style="width:240px"></td><td><input data-k="breaker" type="number" min="1" value="${s.breaker}" style="width:80px"></td><td><input data-k="section" type="number" min="0.5" step="any" value="${s.section}" style="width:80px"></td><td><input data-k="typeA" type="checkbox" ${s.typeA ? 'checked' : ''}></td><td><button class="btn small danger" data-del="${i}" aria-label="Supprimer">✕</button></td></tr>`).join('')}</tbody></table></div><button class="btn" id="spadd">＋ Ajouter un appareil</button>
      <p class="small muted">Pour qu'un calibre ou une section soit compté(e), l'article correspondant doit exister dans le catalogue (ex. « disj_45 », « cable_6 »).</p></section>`;
    $('#rsave').onclick = () => { C().set((c) => { $$('[data-r]', el).forEach((i) => { const k = i.dataset.r; c.rules[k] = i.type === 'checkbox' ? i.checked : i.tagName === 'SELECT' ? i.value : parseFloat(i.value) || 0; }); }, 'Règles de calcul modifiées'); ui().toast('Règles enregistrées', 'ok'); };
    $('#rrst').onclick = async () => { if (await ui().confirmBox('Rétablir les règles', 'Remettre toutes les règles de calcul d\'origine ?', 'Rétablir')) { C().reset('rules'); rules(el); } };
    $('#sptb').onchange = (e) => { const tr = e.target.closest('tr'), k = e.target.dataset.k; if (!tr || !k) return; C().set((c) => { const s = c.specials[+tr.dataset.i]; s[k] = k === 'typeA' ? e.target.checked : k === 'name' ? e.target.value : parseFloat(e.target.value) || 0; }, null); };
    $('#sptb').onclick = (e) => { const b = e.target.closest('[data-del]'); if (!b) return; C().set((c) => c.specials.splice(+b.dataset.del, 1), 'Appareil supprimé'); rules(el); };
    $('#spadd').onclick = () => { C().set((c) => c.specials.push({ id: EE.uid('s'), name: 'Nouvel appareil', breaker: 20, section: 2.5, typeA: false }), 'Appareil ajouté'); rules(el); };
  }
  

  // ---------- Photovoltaïque : équipements et règles ----------
  const PVT = [
    ['panels', 'Panneaux', [['name', 'Désignation', 'text', 220], ['W', 'Pmax (Wc)'], ['Voc', 'Voc (V)'], ['Vmp', 'Vmp (V)'], ['Isc', 'Isc (A)'], ['Imp', 'Imp (A)'], ['bVoc', 'Coef. Voc (%/°C)'], ['price', 'Prix']], { id: 'pn', name: 'Nouveau panneau', price: 0, W: 400, Voc: 49, Vmp: 41, Isc: 10.4, Imp: 9.8, bVoc: -0.27 }],
    ['mppt', 'Régulateurs MPPT', [['name', 'Désignation', 'text', 220], ['Vpv', 'Tension PV max (V)'], ['Iout', 'Courant de sortie (A)'], ['Isc', 'Isc PV max (A)'], ['Vbat', 'Tensions batterie (ex. 12,24,48)', 'list'], ['price', 'Prix']], { id: 'mp', name: 'Nouveau régulateur', price: 0, Vpv: 150, Iout: 40, Isc: 45, Vbat: [12, 24, 48] }],
    ['inverters', 'Onduleurs / chargeurs (site isolé)', [['name', 'Désignation', 'text', 220], ['Pcont', 'Puissance continue (W)'], ['Psurge', 'Puissance de crête (W)'], ['Vbat', 'Tension batterie (V)'], ['price', 'Prix']], { id: 'oi', name: 'Nouvel onduleur', price: 0, Pcont: 3000, Psurge: 6000, Vbat: 24 }],
    ['hybrids', 'Onduleurs hybrides (site isolé, MPPT intégré)', [['name', 'Désignation', 'text', 220], ['Pcont', 'Puissance continue (W)'], ['Psurge', 'Puissance de crête (W)'], ['Vbat', 'Tension batterie (V)'], ['Vpv', 'Tension PV max (V)'], ['VmppMin', 'MPPT min (V)'], ['Isc', 'Isc PV max / MPPT (A)'], ['nMppt', 'Entrées MPPT'], ['Ppv', 'Puissance PV max (Wc)'], ['Ichg', 'Courant de charge max (A)'], ['price', 'Prix']], { id: 'hy', name: 'Nouvel onduleur hybride', price: 0, Pcont: 5000, Psurge: 10000, Vbat: 48, Vpv: 500, VmppMin: 120, Isc: 22, nMppt: 1, Ppv: 6000, Ichg: 100 }],
    ['gridInverters', 'Onduleurs réseau', [['name', 'Désignation', 'text', 220], ['Pac', 'Puissance AC (W)'], ['Vdc', 'Tension DC max (V)'], ['Vmin', 'MPPT min (V)'], ['Vmax', 'MPPT max (V)'], ['Iin', 'Courant d\'entrée / MPPT (A)'], ['nMppt', 'Entrées MPPT'], ['price', 'Prix']], { id: 'og', name: 'Nouvel onduleur réseau', price: 0, Pac: 5000, Vdc: 600, Vmin: 120, Vmax: 550, Iin: 13, nMppt: 2 }],
    ['batteries', 'Batteries', [['name', 'Désignation', 'text', 220], ['tech', 'Technologie (plomb / lithium)', 'text', 90], ['Vn', 'Tension nominale (V : 2, 12, 24, 48)'], ['Ah', 'Capacité (Ah)'], ['price', 'Prix']], { id: 'bt', name: 'Nouvelle batterie', price: 0, tech: 'plomb', Vn: 12, Ah: 100 }],
  ];
  const PVR = [['dodLead', 'Décharge maximale – plomb', '0 à 1'], ['cyclesLead', 'Durée de vie indicative – plomb', 'cycles'], ['cyclesLi', 'Durée de vie indicative – lithium', 'cycles'], ['effLead', 'Rendement – batteries plomb', '0 à 1'], ['dodLi', 'Décharge maximale – lithium', '0 à 1'], ['effLi', 'Rendement – batteries lithium', '0 à 1'], ['pr', 'Rendement global de l\'installation (pertes, poussière, température)', '0 à 1'], ['invEff', 'Rendement de l\'onduleur', '0 à 1'], ['invSafety', 'Marge de puissance de l\'onduleur', '×'], ['dropDC', 'Chute de tension maximale – panneaux', '%'], ['dropBat', 'Chute de tension maximale – batteries', '%'], ['dropAC', 'Chute de tension maximale – sortie alternative', '%'], ['mpptMargin', 'Marge de démarrage du MPPT au-dessus de la tension de charge', 'V'], ['chargeFactor', 'Tension de charge / tension nominale', '×'], ['iscFactor', 'Facteur de sécurité sur le courant (câbles, fusibles)', '×'], ['dcacMax', 'Rapport maximal puissance crête / puissance onduleur (réseau)', '×'], ['vac', 'Tension alternative', 'V']];
  function pvTab(el) {
    const cf = C().get(), PV = cf.pv;
    el.innerHTML = `<section class="card flat"><h2>Équipements photovoltaïques</h2><p class="small muted">Les valeurs fournies sont <b>génériques</b> : remplacez-les par les caractéristiques de la fiche technique du matériel que vous vendez ou installez. Chaque modification est enregistrée automatiquement.</p></section>`
      + PVT.map(([k, title, cols]) => `<section class="card flat"><h2>${title}</h2><div class="qwrap"><table class="qt in"><thead><tr>${cols.map((c) => `<th>${esc(c[1])}</th>`).join('')}<th></th></tr></thead><tbody data-l="${k}">${PV[k].map((r, i) => `<tr data-i="${i}">${cols.map(([f, , t, w]) => `<td><input data-f="${f}" ${t === 'text' || t === 'list' ? '' : 'type="number" step="any"'} value="${esc(t === 'list' ? (r[f] || []).join(',') : r[f])}" style="width:${w || 90}px"></td>`).join('')}<td><button class="btn small danger" data-del="${k}:${i}" aria-label="Supprimer">✕</button></td></tr>`).join('')}</tbody></table></div><button class="btn" data-add="${k}">＋ Ajouter</button></section>`).join('')
      + `<section class="card flat"><h2>Règles de dimensionnement</h2><div class="two">${PVR.map(([k, l, u]) => `<label>${esc(l)} (${esc(u)})<input data-pr="${k}" type="number" step="any" value="${PV.rules[k]}"></label>`).join('')}</div><div class="btnrow"><button class="btn primary" id="pvrs">Enregistrer les règles</button><button class="btn" id="pvrr">Rétablir les équipements et règles d'origine</button></div></section>`;
    el.oninput = (e) => { const t = e.target, tr = t.closest('tbody[data-l] tr'); if (!tr || !t.dataset.f) return; const l = tr.parentNode.dataset.l, f = t.dataset.f, col = PVT.find((x) => x[0] === l)[2].find((c) => c[0] === f);
      C().set((c) => { const r = c.pv[l][+tr.dataset.i]; r[f] = col[2] === 'list' ? t.value.split(/[,;\s]+/).map(Number).filter((x) => x > 0) : col[2] === 'text' ? t.value : (parseFloat(String(t.value).replace(',', '.')) || 0); }, null); };
    el.onclick = async (e) => { const a = e.target.closest('[data-add]'), d = e.target.closest('[data-del]');
      if (a) { const spec = PVT.find((x) => x[0] === a.dataset.add); C().set((c) => c.pv[spec[0]].push(Object.assign(EE.clone(spec[3]), { id: EE.uid('e') })), 'Équipement ajouté (' + spec[1] + ')'); pvTab(el); }
      if (d) { const [l, i] = d.dataset.del.split(':'); if (await ui().confirmBox('Supprimer', 'Supprimer cet équipement du catalogue ?', 'Supprimer')) { C().set((c) => c.pv[l].splice(+i, 1), 'Équipement supprimé'); pvTab(el); } } };
    $('#pvrs').onclick = () => { C().set((c) => { $$('[data-pr]', el).forEach((i) => (c.pv.rules[i.dataset.pr] = parseFloat(i.value) || 0)); }, 'Règles photovoltaïques modifiées'); ui().toast('Règles enregistrées', 'ok'); };
    $('#pvrr').onclick = async () => { if (await ui().confirmBox('Rétablir', 'Remettre les équipements et règles photovoltaïques d\'origine ?', 'Rétablir')) { C().reset('pv'); pvTab(el); } };
  }

  // ---------- 4. Fiches symboles ----------
  function symbols(el, id) {
    const L = EE.Library.list, d = L.find((x) => x.id === id) || L[0], o = C().get().library[d.id] || {};
    el.innerHTML = `<section class="card flat"><h2>Fiches descriptives des symboles</h2><p class="small muted">Adaptez les textes de la bibliothèque à votre cours (description, repère de norme, remarques). Le dessin du symbole n'est pas modifié ici.</p>
      <label>Symbole<select id="ssel">${EE.Library.cats.map((c) => `<optgroup label="${esc(c)}">${L.filter((x) => x.cat === c).map((x) => `<option value="${x.id}"${x.id === d.id ? ' selected' : ''}>${esc(x.name)}${(C().get().library[x.id] ? ' ✎' : '')}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <label>Description<textarea id="sd" rows="3">${esc(d.desc)}</textarea></label><label>Norme / référence<input id="sr" value="${esc(d.ref)}"></label><label>Remarques d'utilisation<textarea id="sn" rows="3">${esc(d.notes)}</textarea></label>
      <div class="btnrow"><button class="btn primary" id="ssave">Enregistrer cette fiche</button><button class="btn" id="srst">Rétablir le texte d'origine</button></div></section>`;
    $('#ssel').onchange = (e) => symbols(el, e.target.value);
    $('#ssave').onclick = () => { C().set((c) => (c.library[d.id] = { desc: $('#sd').value.trim(), ref: $('#sr').value.trim(), notes: $('#sn').value.trim() }), 'Fiche modifiée : ' + d.name); ui().toast('Fiche enregistrée', 'ok'); symbols(el, d.id); };
    $('#srst').onclick = () => { C().set((c) => delete c.library[d.id], 'Fiche rétablie : ' + d.name); symbols(el, d.id); };
  }


  // ---------- 6. Contrôle à distance ----------
  const RF = { blocked: false, message: '', devices: '', users: '', latest: '', url: '', notes: '', min: '', offline: '', owner: '', repo: '', branch: 'main', path: 'site/control.json', statsUrl: '', statsKey: '', apk: '' };
  function remoteTab(el) {
    const R = EE.Remote, st = R.state(), url = R.controlURL(), cfgR = C().get().remote || {};
    const m = /raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+?)(\?|$)/.exec(url || ''); if (m && !RF.owner) Object.assign(RF, { owner: m[1], repo: m[2], branch: m[3], path: m[4] });
    const gen = () => {
      const o = {}; o.blocked = !!RF.blocked; if (RF.message.trim()) o.message = RF.message.trim();
      const lines = (t) => t.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);
      if (lines(RF.devices).length) o.blockedDevices = lines(RF.devices); if (lines(RF.users).length) o.blockedUsers = lines(RF.users);
      if (RF.latest.trim()) o.latestVersion = RF.latest.trim(); if (RF.url.trim()) o.updateUrl = RF.url.trim(); if (RF.notes.trim()) o.updateNotes = RF.notes.trim(); if (/^https:\/\/\S+$/i.test(RF.apk.trim())) o.androidUrl = RF.apk.trim();
      if (RF.min.trim()) o.minVersion = RF.min.trim(); if (+RF.offline > 0) o.maxOfflineDays = +RF.offline; if (EE.Stats && EE.Stats.cleanUrl(RF.statsUrl)) { o.statsUrl = EE.Stats.cleanUrl(RF.statsUrl); if (RF.statsKey.trim()) o.statsKey = RF.statsKey.trim(); } o.updated = new Date().toISOString();
      return o;
    };
    const lab = (t, inner, h) => `<label>${t}${inner}${h ? `<small>${h}</small>` : ''}</label>`;
    el.innerHTML = `<section class="card flat"><h2>Cet appareil</h2>
        <p class="small">Identifiant de l'appareil : <b>${esc(R.deviceId())}</b> – version <b>${esc(EE.VERSION)}</b></p>
        <p class="small">Serveur de contrôle : <b>${url ? esc(url) : 'non configuré'}</b></p>
        <p class="small">Dernier contrôle : ${st.at ? EE.fmtDate(st.at) + (st.ok ? ' – <span style="color:var(--ok)">réussi</span>' : ' – <span style="color:var(--bad)">échec (' + esc(st.error || '?') + ')</span>') : 'jamais'}</p>
        <div class="two">${lab('Adresse du fichier de contrôle pour cet appareil (facultatif)', `<input id="rurl" value="${esc(cfgR.url || '')}" placeholder="https://…/control.json">`, 'Sert au test. Pour les copies distribuées, l\'adresse est intégrée à la fabrication de l\'application.')}${lab('Vérifier toutes les (minutes)', `<input id="rmin" type="number" min="1" value="${esc(cfgR.minutes || 15)}">`)}</div>
        <div class="btnrow"><button class="btn primary" id="rsave">Enregistrer</button><button class="btn" id="rcheck">↻ Vérifier maintenant</button><button class="btn" id="rload">⬇ Charger le fichier publié</button></div></section>
      <section class="card flat"><h2>Fichier de contrôle (à publier)</h2><p class="small muted">Remplissez : le fichier se met à jour à droite. Une fois publié, toutes les copies connectées à Internet appliquent ces règles (blocage, message, mise à jour proposée). Hors ligne, une copie garde son dernier état connu.</p>
        <label class="chk"><input id="fb" type="checkbox"> 🔒 Bloquer toutes les copies de l'application</label>
        ${lab('Message affiché sur l\'écran de blocage', `<textarea id="fm" rows="2" placeholder="Cette application a été désactivée par son concepteur. Pour la réactiver, contactez-le."></textarea>`)}
        <div class="two">${lab('Appareils à bloquer (identifiants, un par ligne)', '<textarea id="fd" rows="3" placeholder="YE-AB12-CD34"></textarea>', 'L\'identifiant s\'affiche sur l\'écran de blocage et dans cet onglet.')}${lab('Comptes à bloquer (noms d\'utilisateur)', '<textarea id="fu" rows="3"></textarea>')}</div>
        <h4>Proposer une mise à jour</h4><div class="two">${lab('Dernière version disponible', '<input id="fl" placeholder="ex. 1.9.0">')}${lab('Lien de téléchargement', '<input id="fx" placeholder="https://…">')}</div>
        ${lab('Nouveautés (texte affiché)', '<input id="fn" placeholder="Nouvelles fonctions : …">')}
        ${lab('📱 Lien de téléchargement de l\'application Android (facultatif)', `<input id="fa" placeholder="${esc(EE.AndroidDL ? EE.AndroidDL.DEFAULT_URL : '')}">`, 'Vide = APK publié automatiquement par GitHub (Release « android »). Bouton visible sur le site, écran de connexion et Paramètres.')}
        <div class="two">${lab('Version minimale autorisée (mise à jour obligatoire en dessous)', '<input id="fv" placeholder="vide = aucune">')}${lab('Blocage si aucune connexion Internet depuis (jours)', '<input id="fo" type="number" min="0" placeholder="0 = désactivé">', 'Attention : bloque aussi les élèves sans Internet.')}</div>
        ${RF.statsUrl ? `<p class="small">👥 Statistiques de connexion incluses : <b>${esc(RF.statsUrl)}</b> (onglet « Connexions »).</p>` : '<p class="small muted">👥 Pour compter les personnes connectées, configurez d\'abord l\'onglet « Connexions » : son adresse sera ajoutée à ce fichier.</p>'}
        <label>Contenu du fichier <code>control.json</code><textarea id="fj" rows="9" readonly style="font-family:monospace;font-size:.82rem"></textarea></label>
        <div class="btnrow"><button class="btn primary" id="fcopy">Copier</button><button class="btn" id="fdl">Télécharger control.json</button><button class="btn" id="fprev">👁 Aperçu de l'écran de blocage</button></div></section>
      <section class="card flat"><h2>Publier sur GitHub (depuis n'importe quel appareil)</h2><p class="small muted">Écrit le fichier directement dans votre dépôt GitHub. Le jeton (clé d'accès personnelle) n'est <b>jamais enregistré</b> : il reste en mémoire le temps de l'envoi. Créez-le dans GitHub › Settings › Developer settings › Fine-grained tokens, limité à ce dépôt avec la permission « Contents : Read and write ». Voir le guide « Contrôle à distance ».</p>
        <div class="two">${lab('Compte GitHub', `<input id="go" value="${esc(RF.owner)}">`)}${lab('Dépôt', `<input id="gr" value="${esc(RF.repo)}">`)}</div>
        <div class="two">${lab('Branche', `<input id="gb" value="${esc(RF.branch)}">`)}${lab('Chemin du fichier', `<input id="gp" value="${esc(RF.path)}">`)}</div>
        ${lab('Jeton GitHub', '<input id="gt" type="password" autocomplete="off">')}
        <div class="btnrow"><button class="btn primary" id="gpub">🚀 Publier maintenant</button></div><p class="small" id="gmsg"></p></section>`;
    const sync = () => { $('#fj').value = JSON.stringify(gen(), null, 2); };
    const map = { fb: 'blocked', fm: 'message', fd: 'devices', fu: 'users', fl: 'latest', fx: 'url', fn: 'notes', fv: 'min', fo: 'offline', fa: 'apk' };
    Object.entries(map).forEach(([id, k]) => { const e = $('#' + id); if (e.type === 'checkbox') e.checked = !!RF[k]; else e.value = RF[k]; e.oninput = e.onchange = () => { RF[k] = e.type === 'checkbox' ? e.checked : e.value; sync(); }; });
    sync();
    $('#rsave').onclick = () => { C().set((c) => { c.remote = Object.assign({}, c.remote, { url: $('#rurl').value.trim(), minutes: Math.max(1, +$('#rmin').value || 15) }); }, 'Contrôle à distance : réglages'); ui().toast('Réglages enregistrés', 'ok'); remoteTab(el); };
    $('#rcheck').onclick = async () => { const r = await R.check(); ui().toast(r.ok ? 'Fichier de contrôle lu' : r.error === 'no-url' ? 'Aucune adresse configurée' : 'Échec : ' + r.error, r.ok ? 'ok' : 'bad'); remoteTab(el); };
    $('#rload').onclick = async () => { const r = await R.check(); if (!r.ok) { ui().toast(r.error === 'no-url' ? 'Aucune adresse configurée' : 'Échec : ' + r.error, 'bad'); return; } const c = r.ctl; Object.assign(RF, { blocked: !!c.blocked, message: c.message || '', devices: (c.blockedDevices || []).join('\n'), users: (c.blockedUsers || []).join('\n'), latest: c.latestVersion || '', url: c.updateUrl || '', notes: c.updateNotes || '', min: c.minVersion || '', offline: c.maxOfflineDays || '', statsUrl: c.statsUrl || RF.statsUrl, statsKey: c.statsKey || RF.statsKey, apk: c.androidUrl || '' }); remoteTab(el); ui().toast('Fichier publié chargé', 'ok'); };
    $('#fcopy').onclick = async () => { try { await navigator.clipboard.writeText($('#fj').value); ui().toast('Copié', 'ok'); } catch (e) { $('#fj').select(); ui().toast('Sélectionné : copiez avec Ctrl+C', 'info'); } };
    $('#fdl').onclick = () => EE.Export.download('control.json', new Blob([$('#fj').value], { type: 'application/json' }));
    $('#fprev').onclick = () => R.preview(gen());
    $('#gpub').onclick = async () => {
      const o = $('#go').value.trim(), r = $('#gr').value.trim(), b = $('#gb').value.trim() || 'main', p = $('#gp').value.trim().replace(/^\/+/, ''), t = $('#gt').value.trim(), msg = $('#gmsg');
      Object.assign(RF, { owner: o, repo: r, branch: b, path: p });
      if (!o || !r || !p || !t) { msg.textContent = 'Renseignez le compte, le dépôt, le chemin et le jeton.'; msg.style.color = 'var(--bad)'; return; }
      msg.style.color = ''; msg.textContent = 'Envoi…';
      try {
        const api = `https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/contents/${p.split('/').map(encodeURIComponent).join('/')}`, H = { Authorization: 'Bearer ' + t, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' };
        let sha; const g1 = await fetch(api + '?ref=' + encodeURIComponent(b), { headers: H, cache: 'no-store' }); if (g1.ok) sha = (await g1.json()).sha; else if (g1.status !== 404) throw new Error('lecture refusée (HTTP ' + g1.status + ')');
        const body = { message: 'Contrôle à distance : mise à jour du fichier', content: btoa(unescape(encodeURIComponent($('#fj').value))), branch: b }; if (sha) body.sha = sha;
        const g2 = await fetch(api, { method: 'PUT', headers: H, body: JSON.stringify(body) }); if (!g2.ok) throw new Error('écriture refusée (HTTP ' + g2.status + ')');
        $('#gt').value = ''; msg.style.color = 'var(--ok)'; msg.textContent = '✔ Publié. Les copies connectées l\'appliqueront dans quelques minutes (délai du cache GitHub : environ 5 min).'; C().log && C().log('Contrôle à distance publié');
      } catch (e) { msg.style.color = 'var(--bad)'; msg.textContent = 'Échec : ' + (e.message || e); }
    };
  }

  // ---------- 7. Connexions (statistiques) ----------
  let statsTimer = null, statsData = null;
  function statsTab(el) {
    const S = EE.Stats, c = S.cfg(), loc = C().get().remote || {}, lb = S.last();
    if (!RF.statsUrl && c.url) RF.statsUrl = c.url; if (!RF.statsKey && c.key) RF.statsKey = c.key;
    clearInterval(statsTimer);
    const big = (n, t, cls) => `<div class="stbig ${cls || ''}"><b>${n}</b><span>${t}</span></div>`;
    el.innerHTML = `<section class="card flat"><h2>👥 Personnes connectées</h2>
        ${c.url ? `<p class="small">Base de statistiques : <b>${esc(c.url)}</b> <span class="muted">(source : ${esc(c.source)})</span></p>
        <p class="small">Cet appareil : dernier signal ${lb.at ? EE.fmtDate(lb.at) + (lb.ok ? ' – <span style="color:var(--ok)">reçu</span>' : ' – <span style="color:var(--bad)">échec (' + esc(lb.error) + ')</span>') : 'pas encore envoyé'}.</p>
        ${S.signedIn() ? `<div class="btnrow"><button class="btn primary" id="st-ref">↻ Actualiser</button><button class="btn" id="st-csv">⬇ Exporter (CSV)</button><button class="btn" id="st-out">Se déconnecter de Firebase</button></div><div id="st-res"><p class="muted">Chargement…</p></div>`
          : `<p class="small muted">Entrez le mot de passe de votre compte Firebase (pas celui du portail). Il n'est jamais enregistré.</p>
             <div class="two"><label>E-mail du compte Firebase<input id="st-mail" value="${esc(S.adminEmail())}"></label>${ui().pwField('st-pw', 'Mot de passe Firebase')}</div>
             <div class="btnrow"><button class="btn primary" id="st-in">Afficher les connexions</button></div><p class="err" id="st-err"></p>`}`
        : '<p>Aucune base de statistiques n\'est configurée. Suivez l\'installation ci-dessous (une seule fois, environ 10 minutes, gratuit).</p>'}
      </section>
      <section class="card flat"><h2>⚙️ Installation (une seule fois)</h2>
        <ol class="small steps">
          <li>Ouvrez <b>console.firebase.google.com</b> avec votre compte Google, puis <b>Créer un projet</b> (nom : yak-elec-pro). Google Analytics : non nécessaire.</li>
          <li>Menu <b>Build › Authentication › Commencer</b> : activez <b>E-mail/Mot de passe</b>. Onglet <b>Users › Ajouter un utilisateur</b> : votre adresse e-mail administrateur et un mot de passe de votre choix.</li>
          <li>Menu <b>Build › Realtime Database › Créer une base de données</b> (emplacement : Europe), en <b>mode verrouillé</b>. Copiez l'adresse affichée en haut (https://….firebasedatabase.app).</li>
          <li>Onglet <b>Règles</b> de la base : remplacez tout le texte par celui ci-dessous, puis <b>Publier</b>. Seul votre compte pourra lire les connexions.</li>
          <li>Icône ⚙️ <b>Paramètres du projet</b> : copiez la <b>Clé API Web</b>. Collez l'adresse et la clé ci-dessous, puis <b>Enregistrer</b>.</li>
          <li>Onglet <b>📡 Contrôle à distance</b> : <b>Publier maintenant</b>. Toutes les copies (V1.12 et suivantes) connectées à Internet commenceront à envoyer leur signal.</li>
        </ol>
        <label>Règles de la base (étape 4)<textarea id="st-rules" rows="8" readonly style="font-family:monospace;font-size:.8rem">${esc(S.rules())}</textarea></label>
        <div class="btnrow"><button class="btn" id="st-copy">Copier les règles</button></div>
        <div class="two"><label>Adresse de la base (étape 3)<input id="st-url" value="${esc(RF.statsUrl || '')}" placeholder="https://yak-elec-pro-default-rtdb.europe-west1.firebasedatabase.app"></label><label>Clé API Web (étape 5)<input id="st-key" value="${esc(RF.statsKey || '')}" placeholder="AIza…"></label></div>
        <div class="btnrow"><button class="btn primary" id="st-save">Enregistrer</button><button class="btn" id="st-test">Envoyer un signal de test</button></div><p class="small" id="st-msg"></p>
        <p class="small muted">Données envoyées par chaque copie, toutes les minutes quand l'application est ouverte : identifiant d'appareil, nom d'utilisateur du compte ouvert, plateforme et version. Rien d'autre (aucun projet, aucun mot de passe). Les utilisateurs en sont informés sur l'écran de connexion. Limite : un signal n'arrive que si l'appareil est connecté à Internet ; les versions antérieures à la V1.12 n'envoient rien.</p>
      </section>`;
    const msg = (t, ok) => { const m = $('#st-msg'); if (m) { m.textContent = t; m.style.color = ok ? 'var(--ok)' : 'var(--bad)'; } };
    $('#st-copy').onclick = async () => { try { await navigator.clipboard.writeText($('#st-rules').value); ui().toast('Règles copiées', 'ok'); } catch (e) { $('#st-rules').select(); ui().toast('Sélectionné : copiez avec Ctrl+C', 'info'); } };
    $('#st-save').onclick = () => {
      const u = $('#st-url').value.trim(), k = $('#st-key').value.trim();
      if (u && !S.cleanUrl(u)) { msg('Adresse non reconnue : elle doit ressembler à https://….firebasedatabase.app ou https://….firebaseio.com', false); return; }
      RF.statsUrl = S.cleanUrl(u); RF.statsKey = k;
      C().set((cf) => { cf.remote = Object.assign({}, cf.remote, { statsUrl: RF.statsUrl, statsKey: k }); }, 'Connexions : base de statistiques');
      ui().toast('Enregistré. Pensez à publier le fichier de contrôle pour toutes les copies.', 'ok'); statsTab(el);
    };
    $('#st-test').onclick = async () => { msg('Envoi…', true); const r = await S.beat(); msg(r.ok ? '✔ Signal reçu par la base.' : (r.error === 'no-url' ? 'Enregistrez d\'abord l\'adresse de la base.' : 'Échec : ' + r.error + ' (vérifiez l\'adresse et les règles).'), r.ok); };
    if (!c.url) return;
    if (!S.signedIn()) {
      ui().bindEyes(el);
      const go = async () => { const e = $('#st-err'); e.textContent = 'Connexion…'; try { await S.signIn($('#st-mail').value.trim(), $('#st-pw').value); statsTab(el); } catch (er) { e.textContent = er.message; } };
      $('#st-in').onclick = go; $('#st-pw').onkeydown = (e) => { if (e.key === 'Enter') go(); };
      return;
    }
    const show = async () => {
      const box = $('#st-res'); if (!box) { clearInterval(statsTimer); return; }
      try {
        statsData = S.summary(await S.fetchAll());
        const d = statsData, list = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li>${esc(k)} : <b>${n}</b></li>`).join('') || '<li class="muted">—</li>';
        box.innerHTML = `<div class="stgrid">${big(d.online, 'connectés maintenant', 'on')}${big(d.today, 'aujourd\'hui')}${big(d.week, '7 derniers jours')}${big(d.month, '30 derniers jours')}${big(d.total, 'appareils au total')}${big(d.newWeek, 'nouveaux (7 jours)')}</div>
          <p class="small muted">Mis à jour : ${EE.fmtDate(Date.now())} – actualisation automatique toutes les 30 s. « Connecté » = application ouverte avec un signal depuis moins de 2 min 30 s.</p>
          <div class="two"><div><h4>Connectés par plateforme</h4><ul class="small">${list(d.byPlatform)}</ul></div><div><h4>Versions utilisées (30 jours)</h4><ul class="small">${list(d.byVersion)}</ul></div></div>
          <h4>Appareils</h4><div class="tblwrap"><table class="tbl small"><thead><tr><th>État</th><th>Utilisateur</th><th>Appareil</th><th>Plateforme</th><th>Version</th><th>Dernière activité</th><th>Première fois</th></tr></thead><tbody>
          ${d.rows.slice(0, 300).map((r) => `<tr><td>${r.online ? '<span style="color:var(--ok)">● en ligne</span>' : '<span class="muted">○</span>'}</td><td>${esc(r.u || '(non connecté)')}</td><td><code>${esc(r.id)}</code></td><td>${esc(r.p)}</td><td>${esc(r.v)}</td><td>${EE.fmtDate(r.t)}</td><td>${EE.fmtDate(r.f)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucun signal reçu pour le moment.</td></tr>'}</tbody></table></div>
          <p class="small muted">Pour bloquer un appareil ou un compte, copiez son identifiant dans l'onglet « Contrôle à distance ».</p>`;
      } catch (er) { box.innerHTML = `<p class="err">${esc(er.message)}</p>`; if (!S.signedIn()) { clearInterval(statsTimer); statsTab(el); } }
    };
    $('#st-ref').onclick = show;
    $('#st-out').onclick = () => { S.signOut(); statsData = null; statsTab(el); };
    $('#st-csv').onclick = () => {
      if (!statsData) return; const q = (v) => '"' + String(v).replace(/"/g, '""') + '"', iso = (t) => new Date(t).toISOString();
      const csv = ['etat;utilisateur;appareil;plateforme;version;derniere_activite;premiere_fois'].concat(statsData.rows.map((r) => [r.online ? 'en ligne' : 'hors ligne', r.u, r.id, r.p, r.v, iso(r.t), iso(r.f)].map(q).join(';'))).join('\r\n');
      EE.Export.download('yak-elec-pro_connexions.csv', new Blob(['﻿' + csv], { type: 'text/csv' }));
    };
    show(); statsTimer = setInterval(show, 30000);
  }

  // ---------- 5. Sauvegarde / mise à jour ----------
  function backup(el) {
    el.innerHTML = `<section class="card flat"><h2>Sauvegarder la configuration</h2><p>Enregistre dans un fichier : apparence, logo, catalogue et prix, règles, appareils spécialisés et fiches des symboles.</p><button class="btn primary" id="bexp">Télécharger la configuration</button></section>
      <section class="card flat"><h2>Mettre à jour depuis un fichier</h2><p>Charge un fichier de configuration (créé ici ou reçu d'un collègue). Il <b>remplace</b> la configuration actuelle de cet appareil.</p><label class="btn" for="bimp">Choisir un fichier de configuration…</label><input id="bimp" type="file" accept=".json,application/json" class="hide"></section>
      <section class="card flat"><h2>Rétablir</h2><button class="btn danger" id="bres">Tout remettre aux réglages d'origine</button></section>
      <section class="card flat"><h2>Journal des modifications</h2>${C().logs().length ? `<ul class="log">${C().logs().map((l) => `<li><em>${EE.fmtDate(l.t)}</em> ${esc(l.what)}</li>`).join('')}</ul>` : '<p class="muted">Aucune modification pour le moment.</p>'}</section>
      <section class="card flat"><h2>Version</h2><p class="small muted">Version de l'application : ${EE.VERSION}. La mise à jour du <i>programme</i> lui-même se fait en remplaçant le fichier de l'application ; votre configuration et vos projets sont conservés sur l'appareil.</p></section>`;
    $('#bexp').onclick = () => { EE.Export.download('yak-elec-pro_configuration.json', new Blob([C().exportJSON()], { type: 'application/json' })); C().log('Configuration exportée'); ui().toast('Configuration téléchargée', 'ok'); };
    $('#bimp').onchange = async (e) => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (!(await ui().confirmBox('Remplacer la configuration', 'Ce fichier va remplacer la configuration actuelle. Continuer ?', 'Remplacer'))) return; try { C().importJSON(await f.text()); ui().toast('Configuration mise à jour', 'ok'); renderPortalShell(); } catch (er) { ui().toast(er.message, 'bad'); } };
    $('#bres').onclick = async () => { if (await ui().confirmBox('Tout rétablir', 'Remettre l\'apparence, le catalogue, les règles et les fiches aux valeurs d\'origine ?', 'Tout rétablir')) { C().reset(); ui().toast('Réglages d\'origine rétablis', 'ok'); renderPortalShell(); } };
  }
  EE.Screens = EE.Screens || {}; EE.Screens.portal = renderPortal;
})(window);
