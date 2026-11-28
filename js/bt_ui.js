/* Yak-élec-pro V1.11 – Bureau d'études BT : interface de type logiciel de bureau
   (barre de menus, ruban, explorateur de projet, zone centrale à onglets, propriétés, messages, barre d'état). */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, B = () => EE.BT, LIB = () => EE.BTLib.all();
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => EE.app.ui;
  const f1 = (x, d = 1) => (x == null || !isFinite(x) ? '—' : Number(x).toFixed(d).replace('.', ','));
  const kW = (w) => (w == null ? '—' : (w / 1000).toFixed(2).replace('.', ','));
  const money = (v) => Math.round(v || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' ' + (EE.BTUI && EE.BTUI.st && EE.BTUI.st.rules.currency || (EE.Config.get().currency || 'GNF'));

  // ---------- stockage des études (par utilisateur) ----------
  const key = () => 'eep.bt.' + (EE.Store.Users.current() || { id: 'anon' }).id;
  const Studies = {
    list() { return EE.Store.raw.get(key(), []); },
    save(l) { if (!EE.Store.raw.set(key(), l)) throw new Error('Stockage plein : exportez vos études.'); },
    get(id) { return Studies.list().find((s) => s.id === id); },
    put(st) { const l = Studies.list(); const i = l.findIndex((x) => x.id === st.id); st.modified = Date.now(); if (i >= 0) l[i] = st; else l.push(st); Studies.save(l); },
    remove(id) { Studies.save(Studies.list().filter((s) => s.id !== id)); },
  };
  const ST = { st: null, res: null, sel: { kind: 'study' }, tab: 'bilan', hist: [], hi: -1, clip: null, zoom: 1, showArch: false };
  EE.BTUI = ST;

  // ---------- historique (annuler / rétablir) et enregistrement automatique ----------
  let saveT = null;
  function snapshot() { const s = JSON.stringify(ST.st); if (ST.hist[ST.hi] === s) return; ST.hist = ST.hist.slice(0, ST.hi + 1); ST.hist.push(s); if (ST.hist.length > 120) ST.hist.shift(); ST.hi = ST.hist.length - 1; }
  function changed(noSnap) { if (!noSnap) snapshot(); recompute(); clearTimeout(saveT); setSave('Modifications en cours…'); saveT = setTimeout(saveNow, 400); renderAll(); }
  function saveNow() { clearTimeout(saveT); saveT = null; if (!ST.st) return; try { Studies.put(ST.st); setSave('Enregistré à ' + EE.fmtTime(Date.now())); } catch (e) { setSave('⚠ ' + e.message); } }
  const setSave = (t) => { ST.saveTxt = t; const e = $('#btsave'); if (e) e.textContent = t; };
  function undo() { if (ST.hi > 0) { ST.hi--; ST.st = JSON.parse(ST.hist[ST.hi]); changed(true); } }
  function redo() { if (ST.hi < ST.hist.length - 1) { ST.hi++; ST.st = JSON.parse(ST.hist[ST.hi]); changed(true); } }
  function recompute() { try { ST.res = B().compute(ST.st, LIB()); ST.bom = B().bom(ST.st, ST.res, LIB()); } catch (e) { console.error(e); ST.res = { circuits: {}, boards: {}, msgs: [{ sev: 'error', msg: 'Erreur de calcul : ' + e.message }], stats: {}, balance: { boards: {} } }; ST.bom = null; } }

  // ---------- accès aux objets ----------
  const board = (id) => ST.st.boards.find((b) => b.id === id);
  const circ = (id) => B().findCircuit(ST.st, id);
  function selected() { const s = ST.sel; if (s.kind === 'board') return board(s.id); if (s.kind === 'circuit') { const f = circ(s.id); return f && f.circuit; } return ST.st; }
  function curBoard() { const s = ST.sel; if (s.kind === 'board') return board(s.id); if (s.kind === 'circuit') { const f = circ(s.id); return f && f.board; } return ST.st.boards[0]; }

  // ---------- actions de conception ----------
  const A = {
    addBoard() { const b = B().newBoard('TD' + ST.st.boards.length); ST.st.boards.push(b); ST.sel = { kind: 'board', id: b.id }; changed(); ui().toast('Tableau ajouté : reliez-le avec un « Départ » depuis un autre tableau', 'ok'); },
    addFeeder() { const pb = curBoard(); if (!pb) return; const b = B().newBoard('TD' + ST.st.boards.length); const c = B().newCircuit({ name: 'Départ ' + b.name, kind: 'feeder', feeds: b.id, phases: 3, type: 'Autre' }); b.feeder = c.id; pb.circuits.push(c); ST.st.boards.push(b); ST.sel = { kind: 'board', id: b.id }; changed(); ui().toast('Départ et tableau « ' + b.name + ' » ajoutés : ajoutez maintenant ses circuits', 'ok'); },
    addCircuit(type) { const b = curBoard(); if (!b) return; const t = type || 'Éclairage'; const c = B().newCircuit({ name: t + ' ' + (b.circuits.filter((x) => x.type === t).length + 1), type: t, phases: B().MOTORS.includes(t) ? 3 : 1, neutral: !B().MOTORS.includes(t), loads: [B().newLoad({ name: t, type: t, cos: B().MOTORS.includes(t) ? 0.85 : t === 'Éclairage' ? 0.95 : 1, eta: B().MOTORS.includes(t) ? 0.88 : 1 })] }); b.circuits.push(c); ST.sel = { kind: 'circuit', id: c.id }; changed(); },
    addLoad() { const s = ST.sel; if (s.kind !== 'circuit') { ui().toast('Sélectionnez d\'abord un circuit', 'bad'); return; } const c = circ(s.id).circuit; if (c.kind === 'feeder') { ui().toast('Un départ est alimenté par son tableau : ajoutez les récepteurs dans les circuits de ce tableau', 'bad'); return; } c.loads.push(B().newLoad({ name: 'Récepteur ' + (c.loads.length + 1), type: c.type })); changed(); },
    del() {
      const s = ST.sel; if (s.kind === 'circuit') { const f = circ(s.id); f.board.circuits = f.board.circuits.filter((x) => x.id !== s.id); if (f.circuit.feeds) { const ch = board(f.circuit.feeds); if (ch) ch.feeder = null; } ST.sel = { kind: 'board', id: f.board.id }; changed(); }
      else if (s.kind === 'board') { if (ST.st.boards.length < 2) { ui().toast('Une étude garde au moins un tableau', 'bad'); return; } const b = board(s.id); ST.st.boards.forEach((x) => x.circuits.forEach((c) => { if (c.feeds === b.id) { c.feeds = null; } })); ST.st.boards = ST.st.boards.filter((x) => x.id !== b.id); ST.sel = { kind: 'study' }; changed(); }
    },
    dup() { const s = ST.sel; if (s.kind === 'circuit') { const f = circ(s.id); const c = clone(f.circuit); c.name += ' (copie)'; if (c.kind === 'feeder') { c.kind = 'final'; c.feeds = null; } f.board.circuits.splice(f.board.circuits.indexOf(f.circuit) + 1, 0, c); ST.sel = { kind: 'circuit', id: c.id }; changed(); } else if (s.kind === 'board') { const b = clone(board(s.id)); b.name += ' (copie)'; b.feeder = null; b.circuits = b.circuits.filter((c) => c.kind !== 'feeder'); ST.st.boards.push(b); ST.sel = { kind: 'board', id: b.id }; changed(); } },
    move(d) { const s = ST.sel; if (s.kind !== 'circuit') return; const f = circ(s.id), L = f.board.circuits, i = L.indexOf(f.circuit), j = i + d; if (j < 0 || j >= L.length) return; L.splice(i, 1); L.splice(j, 0, f.circuit); changed(); },
    copy() { const s = ST.sel; if (s.kind !== 'circuit') { ui().toast('Sélectionnez un circuit à copier', 'bad'); return; } ST.clip = clone(circ(s.id).circuit); ui().toast('Circuit copié'); },
    paste() { if (!ST.clip) { ui().toast('Rien à coller', 'bad'); return; } const b = curBoard(); const c = clone(ST.clip); if (c.kind === 'feeder') { c.kind = 'final'; c.feeds = null; } b.circuits.push(c); ST.sel = { kind: 'circuit', id: c.id }; changed(); },
    cut() { A.copy(); if (ST.clip) A.del(); },
    async rename() { const o = selected(); const n = await ask('Renommer', 'Nouveau nom', o.name); if (n) { o.name = n; changed(); } },
    async moveTo() { const s = ST.sel; if (s.kind !== 'circuit') return; const f = circ(s.id); const r = await ui().modal({ title: 'Déplacer le circuit', body: `<label>Vers le tableau<select id="mvb">${ST.st.boards.filter((b) => b.id !== f.board.id && b.id !== f.circuit.feeds).map((b) => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Déplacer', cls: 'primary', value: (ov) => $('#mvb', ov).value }] }); if (!r) return; f.board.circuits = f.board.circuits.filter((x) => x !== f.circuit); board(r).circuits.push(f.circuit); changed(); },
  };
  function clone(o) { const c = JSON.parse(JSON.stringify(o)); const re = (x) => { if (x && typeof x === 'object') { if (x.id && typeof x.id === 'string') x.id = EE.uid(x.id.slice(0, 2)); Object.values(x).forEach(re); } }; re(c); return c; }
  const ask = (title, label, val) => ui().modal({ title, body: `<label>${esc(label)}<input id="askv" maxlength="80" value="${esc(val || '')}"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Valider', cls: 'primary', value: (ov) => $('#askv', ov).value.trim() }] });

  // ---------- assistant de création ----------
  async function wizard(base) {
    const s = base || B().newStudy(); const E = B().EARTHING, opt = (l, v) => l.map((x) => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const r = await ui().modal({ title: base ? 'Propriétés de l\'étude' : 'Assistant : nouvelle étude', wide: true,
      body: `<div class="two"><label>Nom du projet *<input id="w-name" value="${esc(base ? s.name : '')}" placeholder="Ex. : Immeuble de bureaux R+3"></label><label>Client<input id="w-client" value="${esc(s.client)}"></label>
        <label>Adresse du chantier<input id="w-site" value="${esc(s.site)}"></label><label>Bureau d'études<input id="w-office" value="${esc(s.office)}"></label>
        <label>Ingénieur responsable<input id="w-eng" value="${esc(s.engineer)}"></label><label>Date de l'étude<input id="w-date" type="date" value="${esc(s.date)}"></label>
        <label>Type de bâtiment<select id="w-bld">${opt(['Résidentiel', 'Tertiaire', 'Industriel', 'Administration', 'Hôtel', 'École', 'Hôpital', 'Distribution électrique', 'Autre'], s.building)}</select></label>
        <label>Type d'alimentation<select id="w-sup">${opt(['Réseau public BT', 'Poste HTA/BT privé', 'Groupe électrogène', 'Réseau + groupe (inverseur)'], s.supply)}</select></label>
        <label>Tension entre phases U (V)<input id="w-U" inputmode="decimal" value="${esc(s.U)}"></label><label>Tension simple U0 (V)<input id="w-U0" inputmode="decimal" value="${esc(s.U0)}"></label>
        <label>Fréquence (Hz)<select id="w-f">${opt(['50', '60'], String(s.f))}</select></label><label>Régime de neutre<select id="w-e">${opt(E, s.earthing)}</select></label>
        <label>Puissance disponible (kVA)<input id="w-P" inputmode="decimal" value="${esc(s.Pavail)}" placeholder="à renseigner"></label><label>Icc au point de livraison (kA)<input id="w-Ik" inputmode="decimal" value="${esc(s.Ik)}" placeholder="donnée du distributeur"></label>
        <label>Facteur de puissance de référence<input id="w-cos" inputmode="decimal" value="${esc(s.cos)}"></label><label>Résistance de la prise de terre RA (Ω, schéma TT)<input id="w-RA" inputmode="decimal" value="${esc(s.RA)}" placeholder="mesure ou valeur de projet"></label></div>
        <label>Normes de référence (édition à préciser)<input id="w-norms" value="${esc(s.rules.norms)}"></label>
        <p class="small muted">Les données inconnues peuvent rester vides : l'application les signalera comme « données manquantes » au lieu d'inventer une valeur. Le projet commence avec un TGBT ; ajoutez ensuite départs, tableaux et circuits.</p>`,
      buttons: [{ label: 'Annuler', value: null }, { label: base ? 'Enregistrer' : 'Créer l\'étude', cls: 'primary', value: (ov) => { const v = (i) => $('#' + i, ov).value.trim(); return { name: v('w-name'), client: v('w-client'), site: v('w-site'), office: v('w-office'), engineer: v('w-eng'), date: v('w-date'), building: v('w-bld'), supply: v('w-sup'), U: +v('w-U').replace(',', '.') || 400, U0: +v('w-U0').replace(',', '.') || 230, f: +v('w-f'), earthing: v('w-e'), Pavail: v('w-P'), Ik: v('w-Ik'), cos: v('w-cos'), RA: v('w-RA'), norms: v('w-norms') }; } }] });
    if (!r) return null; if (!r.name) { ui().toast('Le nom du projet est obligatoire', 'bad'); return wizard(base); }
    const norms = r.norms; delete r.norms; Object.assign(s, r); s.rules.norms = norms; return s;
  }

  // ---------- écran liste des études ----------
  function listScreen() {
    const L = Studies.list().filter((s) => ST.showArch || !s.archived).sort((a, b) => b.modified - a.modified);
    EE.main('bt').innerHTML = `<div class="page"><div class="bar"><h1>🏗️ Bureau d'études BT</h1><div class="grow"></div><label class="chk small"><input type="checkbox" id="bt-arch"${ST.showArch ? ' checked' : ''}> Afficher les archives</label><button class="btn" id="bt-imp">Importer une étude…</button><button class="btn primary" id="bt-new">＋ Nouvelle étude</button><input type="file" id="bt-impf" accept=".json" hidden></div>
      <p class="muted">Conception et dimensionnement de tableaux électriques basse tension : bilan de puissance, calcul des circuits (Ib, In, Iz, sections, chute de tension, Icc), choix des protections, répartition, enveloppes, vues 2D et 3D, échauffement, sélectivité, nomenclature, chiffrage, étiquettes et dossier d'étude.</p>
      ${L.length ? `<div class="table"><div class="tr th"><span>Étude</span><span>Client</span><span>Tableaux</span><span>Modifiée</span><span>Actions</span></div>${L.map((s) => `<div class="tr" data-id="${s.id}"><span><b>${esc(s.name)}</b>${s.archived ? ' <small class="lvl">archivée</small>' : ''}</span><span>${esc(s.client || '—')}</span><span>${s.boards.length}</span><span>${EE.fmtDate(s.modified)}</span><span class="acts"><button class="btn small primary" data-a="open">Ouvrir</button><button class="btn small" data-a="dup">Dupliquer</button><button class="btn small" data-a="arch">${s.archived ? 'Désarchiver' : 'Archiver'}</button><button class="btn small" data-a="exp">Exporter</button><button class="btn small danger" data-a="del">Supprimer</button></span></div>`).join('')}</div>` : '<section class="card flat"><p>Aucune étude. Cliquez sur « Nouvelle étude » : un assistant vous guide, ou ouvrez l\'exemple ci-dessous.</p><button class="btn" id="bt-demo">Créer l\'étude d\'exemple (immeuble de bureaux)</button></section>'}</div>`;
    $('#bt-new').onclick = async () => { const s = await wizard(); if (s) { Studies.put(s); open(s.id); } };
    $('#bt-arch').onchange = (e) => { ST.showArch = e.target.checked; listScreen(); };
    $('#bt-imp').onclick = () => $('#bt-impf').click(); $('#bt-impf').onchange = async (e) => { try { const s = importStudy(await e.target.files[0].text()); ui().toast('Étude importée : ' + s.name, 'ok'); listScreen(); } catch (err) { ui().toast(err.message, 'bad'); } };
    const demo = $('#bt-demo'); if (demo) demo.onclick = () => { const s = demoStudy(); Studies.put(s); open(s.id); };
    $$('.tr[data-id] [data-a]').forEach((b) => (b.onclick = async () => {
      const id = b.closest('.tr').dataset.id, s = Studies.get(id);
      if (b.dataset.a === 'open') open(id);
      else if (b.dataset.a === 'dup') { const c = JSON.parse(JSON.stringify(s)); c.id = EE.uid('bt'); c.name += ' (copie)'; c.created = Date.now(); Studies.put(c); listScreen(); }
      else if (b.dataset.a === 'arch') { s.archived = !s.archived; Studies.put(s); listScreen(); }
      else if (b.dataset.a === 'exp') exportStudy(s);
      else if (b.dataset.a === 'del' && await ui().confirmBox('Supprimer l\'étude', `Supprimer définitivement « <b>${esc(s.name)}</b> » ?`, 'Supprimer')) { Studies.remove(id); listScreen(); }
    }));
  }
  function exportStudy(s) { EE.Export.download(EE.Export.safe(s.name) + '.yakbt.json', new Blob([JSON.stringify({ format: 'yak-elec-pro-etude-bt', version: 1, study: s }, null, 1)], { type: 'application/json' })); }
  function importStudy(text) { let o; try { o = JSON.parse(text); } catch (e) { throw new Error('Fichier illisible.'); } if (!o || o.format !== 'yak-elec-pro-etude-bt' || !o.study || !Array.isArray(o.study.boards)) throw new Error('Ce fichier n\'est pas une étude Yak-élec-pro.'); const s = B().newStudy(o.study); s.id = EE.uid('bt'); Studies.put(s); return s; }
  function demoStudy() {
    const b = B(), s = b.newStudy({ name: 'Exemple – immeuble de bureaux', client: 'Client exemple', site: 'Conakry', building: 'Tertiaire', earthing: 'TT', Ik: 10, Pavail: 60, RA: 20 });
    const tg = s.boards[0]; tg.ks = 0.9;
    const mk = (bd, o, loads) => { const c = b.newCircuit(o); c.loads = loads.map((l) => b.newLoad(l)); bd.circuits.push(c); return c; };
    [['TD1 – rez-de-chaussée', 35], ['TD2 – étage', 45]].forEach(([n, L]) => { const td = b.newBoard(n); s.boards.push(td); const f = b.newCircuit({ name: 'Départ ' + n.split(' ')[0], kind: 'feeder', feeds: td.id, phases: 3, length: L }); td.feeder = f.id; tg.circuits.push(f);
      mk(td, { name: 'Éclairage bureaux', type: 'Éclairage', length: 30 }, [{ name: 'Luminaire LED 36 W', type: 'Éclairage', P: 36, n: 18, cos: 0.95 }]);
      mk(td, { name: 'Prises bureaux', type: 'Prises de courant', length: 25, ks: 0.4 }, [{ name: 'Prise 16 A (poste de travail)', type: 'Prises de courant', P: 250, n: 10 }]);
      mk(td, { name: 'Climatisation', type: 'Climatisation', length: 20 }, [{ name: 'Split 18 000 BTU', type: 'Climatisation', P: 1800, cos: 0.85, n: 1 }]);
      mk(td, { name: 'Informatique', type: 'Informatique', length: 15 }, [{ name: 'Baie informatique', type: 'Informatique', P: 1200, cos: 0.9, n: 1 }]); });
    mk(tg, { name: 'Pompe de surpression', type: 'Pompe', phases: 3, neutral: false, length: 40 }, [{ name: 'Pompe 4 kW', type: 'Pompe', P: 4000, cos: 0.85, eta: 0.87, n: 1 }]);
    mk(tg, { name: 'Éclairage extérieur', type: 'Éclairage', length: 60 }, [{ name: 'Projecteur LED 100 W', type: 'Éclairage', P: 100, n: 6, cos: 0.95 }]);
    return s;
  }

  // ---------- ouverture d'une étude ----------
  function open(id) { const s = Studies.get(id); if (!s) { ui().toast('Étude introuvable', 'bad'); return; } ST.st = B().newStudy(s); ST.st.id = s.id; ST.sel = { kind: 'study' }; ST.hist = []; ST.hi = -1; snapshot(); recompute(); ST.openId = id; render(); }
  function close() { saveNow(); ST.st = null; ST.openId = null; listScreen(); }

  const TABS = [['bilan', '⚡ Bilan de puissance'], ['calc', '🧮 Calculs et protections'], ['repart', '▦ Répartition'], ['enc', '🗄 Enveloppe'], ['v2d', '▭ Vue 2D'], ['v3d', '⬚ Vue 3D'], ['therm', '🌡 Thermique'], ['sel', '⛓ Sélectivité'], ['bom', '💰 Nomenclature et chiffrage'], ['lab', '🏷 Étiquettes'], ['doc', '📄 Dossier et exports'], ['lib', '📚 Bibliothèque'], ['param', '⚙ Paramètres']];

  // ---------- écran principal ----------
  function render() {
    if (!ST.st) return listScreen();
    EE.main('bt').innerHTML = `<div class="bt"><div class="mbar" id="btmenu"></div>
      <div class="btrib" id="btrib"></div>
      <div class="btmain"><aside class="bttree win" id="bttree"><div class="wbar"><span class="wtitle">🗂 Explorateur de projet</span></div><div class="wbody" id="bttreeb"></div></aside>
        <section class="btcenter"><div class="bttabs" id="bttabs"></div><div class="btview" id="btview"></div></section>
        <aside class="btprops win" id="btprops"><div class="wbar"><span class="wtitle">☰ Propriétés</span></div><div class="wbody" id="btpropsb"></div></aside></div>
      <div class="btmsgs" id="btmsgs"></div>
      <div class="sb" id="btsb"></div></div>`;
    renderMenu(); renderRibbon(); renderAll();
  }
  function renderAll() { if (!ST.st || !$('#btview')) return; renderTree(); renderTabs(); renderProps(); renderView(); renderMsgs(); renderStatus(); }

  // menus
  let openM = -1;
  function menus() {
    const D = EE.BTViews || {};
    return [
      ['Fichier', [['Nouvelle étude…', async () => { saveNow(); const s = await wizard(); if (s) { Studies.put(s); open(s.id); } }], ['Ouvrir une étude…', close], ['Enregistrer', () => { saveNow(); ui().toast('Étude enregistrée', 'ok'); }], ['Enregistrer sous…', async () => { const n = await ask('Enregistrer sous', 'Nom de la nouvelle étude', ST.st.name + ' (copie)'); if (!n) return; saveNow(); const c = JSON.parse(JSON.stringify(ST.st)); c.id = EE.uid('bt'); c.name = n; Studies.put(c); open(c.id); }], ['Propriétés de l\'étude…', async () => { const s = await wizard(ST.st); if (s) changed(); }], ['Archiver l\'étude', () => { ST.st.archived = !ST.st.archived; changed(); ui().toast(ST.st.archived ? 'Étude archivée' : 'Étude désarchivée', 'ok'); }], '-', ['Exporter l\'étude (.json)', () => exportStudy(ST.st)], ['Imprimer l\'onglet affiché', () => g.print()], '-', ['Fermer l\'étude', close]]],
      ['Édition', [['Annuler', undo, ST.hi <= 0], ['Rétablir', redo, ST.hi >= ST.hist.length - 1], '-', ['Couper', A.cut], ['Copier', A.copy], ['Coller', A.paste], ['Supprimer', A.del], ['Dupliquer', A.dup], ['Renommer…', A.rename], '-', ['Monter', () => A.move(-1)], ['Descendre', () => A.move(1)], ['Déplacer vers un autre tableau…', A.moveTo]]],
      ['Affichage', TABS.map(([k, l]) => [l, () => setTab(k)]).concat(['-', ['Zoom avant', () => zoom(1.25)], ['Zoom arrière', () => zoom(0.8)], ['Zoom 100 %', () => { ST.zoom = 1; renderView(); }]])],
      ['Conception', [['Ajouter un tableau', A.addBoard], ['Ajouter un départ (vers un nouveau tableau)', A.addFeeder], ['Ajouter un circuit', () => A.addCircuit()], ['Ajouter un récepteur', A.addLoad], '-', ...B().TYPES.slice(0, 8).map((t) => ['Circuit « ' + t + ' »', () => A.addCircuit(t)])]],
      ['Calculs', [['Recalculer', () => { changed(true); ui().toast('Calcul effectué', 'ok'); }], ['Calculs et protections', () => setTab('calc')], ['Bilan de puissance', () => setTab('bilan')], ['Échauffement', () => setTab('therm')], ['Sélectivité et filiation', () => setTab('sel')]]],
      ['Distribution', [['Répartition optimisée', () => setLayout('opt')], ['Répartition traditionnelle', () => setLayout('trad')], '-', ['Rangées de 13 modules', () => setPerRow(13)], ['Rangées de 18 modules', () => setPerRow(18)], ['Rangées de 24 modules', () => setPerRow(24)], '-', ['Réserve d\'extension…', async () => { const n = await ask('Réserve d\'extension', 'Réserve (%)', ST.st.rules.reserve); if (n != null && n !== '') { ST.st.rules.reserve = +n.replace(',', '.') || 0; changed(); } }]]],
      ['Tableaux', [['Enveloppe', () => setTab('enc')], ['Vue 2D', () => setTab('v2d')], ['Vue 3D', () => setTab('v3d')], ['Étiquettes', () => setTab('lab')], '-', ['Générer le schéma unifilaire (atelier)', () => D.unifilaire && D.unifilaire()]]],
      ['Bibliothèque', [['Ouvrir la bibliothèque', () => setTab('lib')], ['Importer des produits (CSV)…', () => D.libImport && D.libImport('merge')], ['Importer un tarif fournisseur (prix)…', () => D.libImport && D.libImport('prices')], ['Exporter la bibliothèque (CSV)', () => D.libExport && D.libExport()]]],
      ['Documents', [['Dossier d\'étude (PDF / impression)', () => D.dossier && D.dossier()], ['Classeur Excel (.xls)', () => D.excel && D.excel()], ['Nomenclature (CSV)', () => D.csvBom && D.csvBom()], ['Tableau des protections (CSV)', () => D.csvCalc && D.csvCalc()], ['Bon de commande', () => D.order && D.order()], ['Vue 2D (SVG)', () => D.svg2d && D.svg2d()], ['Schéma unifilaire (atelier, SVG / DXF)', () => D.unifilaire && D.unifilaire()]]],
      ['Paramètres', [['Règles de calcul et coefficients', () => setTab('param')], ['Propriétés de l\'étude…', async () => { const s = await wizard(ST.st); if (s) changed(); }]]],
      ['Aide', [['Mode d\'emploi', help], ['Hypothèses et limites', limits]]],
    ];
  }
  function renderMenu() {
    const el = $('#btmenu'); if (!el) return; const M = menus();
    el.innerHTML = M.map(([t], i) => `<div class="mnu${i === openM ? ' open' : ''}"><button class="mtop" data-m="${i}">${esc(t)}</button>${i === openM ? `<div class="mdrop">${M[i][1].map((it, j) => it === '-' ? '<hr>' : `<button class="mitem" data-mi="${j}"${it[2] ? ' disabled' : ''}><span>${esc(it[0])}</span></button>`).join('')}</div>` : ''}</div>`).join('');
    $$('[data-m]', el).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); openM = openM === +b.dataset.m ? -1 : +b.dataset.m; renderMenu(); }; b.onmouseenter = () => { if (openM >= 0 && openM !== +b.dataset.m) { openM = +b.dataset.m; renderMenu(); } }; });
    $$('[data-mi]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const it = M[openM][1][+b.dataset.mi]; openM = -1; renderMenu(); it[1](); }));
  }
  document.addEventListener('click', () => { if (openM >= 0) { openM = -1; renderMenu(); } });
  document.addEventListener('keydown', (e) => {
    if (!ST.st || !$('.bt') || EE.app.screen !== 'bt') return; const t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (c && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (c && k === 'y') { e.preventDefault(); redo(); } else if (c && k === 's') { e.preventDefault(); saveNow(); ui().toast('Étude enregistrée', 'ok'); }
    else if (c && k === 'c') A.copy(); else if (c && k === 'v') A.paste(); else if (c && k === 'x') A.cut(); else if (c && k === 'd') { e.preventDefault(); A.dup(); } else if (k === 'delete') A.del(); else if (k === 'escape' && openM >= 0) { openM = -1; renderMenu(); }
  });
  function renderRibbon() {
    const R = [
      ['Étude', [['📄', 'Nouvelle', () => menus()[0][1][0][1]()], ['📂', 'Ouvrir', close], ['💾', 'Enregistrer', () => { saveNow(); ui().toast('Étude enregistrée', 'ok'); }]]],
      ['Édition', [['↶', 'Annuler', undo], ['↷', 'Rétablir', redo], ['⧉', 'Copier', A.copy], ['📋', 'Coller', A.paste], ['🗑', 'Supprimer', A.del]]],
      ['Conception', [['🗄', '+ Tableau', A.addBoard], ['⤵', '+ Départ', A.addFeeder], ['➕', '+ Circuit', () => A.addCircuit()], ['🔌', '+ Récepteur', A.addLoad], ['⬆', 'Monter', () => A.move(-1)], ['⬇', 'Descendre', () => A.move(1)]]],
      ['Calcul', [['🧮', 'Calculer', () => { changed(true); setTab('calc'); }], ['⚡', 'Bilan', () => setTab('bilan')]]],
      ['Vue', [['−', 'Zoom −', () => zoom(0.8)], ['+', 'Zoom +', () => zoom(1.25)]]],
      ['Sorties', [['📐', 'Unifilaire', () => EE.BTViews.unifilaire()], ['📄', 'Dossier', () => EE.BTViews.dossier()], ['📊', 'Excel', () => EE.BTViews.excel()], ['🖨', 'Imprimer', () => g.print()]]],
    ];
    $('#btrib').innerHTML = R.map(([t, L], i) => `<div class="ribg"><div class="ribb">${L.map(([ic, l], j) => `<button class="ribbtn" data-r="${i}:${j}" title="${esc(l)}"><span class="ric">${ic}</span><span class="rlb">${esc(l)}</span></button>`).join('')}</div><div class="ribt">${esc(t)}</div></div>`).join('');
    $$('[data-r]').forEach((b) => (b.onclick = () => { const [i, j] = b.dataset.r.split(':').map(Number); R[i][1][j][2](); }));
  }
  const setTab = (k) => { ST.tab = k; renderTabs(); renderView(); };
  const setLayout = (m) => { const b = curBoard(); b.layout = m; changed(); setTab('repart'); };
  const setPerRow = (n) => { const b = curBoard(); b.perRow = n; changed(); setTab('repart'); };
  const zoom = (k) => { ST.zoom = Math.max(0.3, Math.min(4, ST.zoom * k)); renderView(); };

  // explorateur
  function renderTree() {
    const el = $('#bttreeb'); if (!el) return; const st = ST.st, res = ST.res;
    const dot = (s) => `<span class="stdot ${s === 'Conforme' ? 'ok' : s === 'À vérifier' ? 'check' : s === 'Non conforme' ? 'ko' : 'miss'}" title="${esc(s || '')}"></span>`;
    const isSel = (k, id) => ST.sel.kind === k && (k === 'study' || ST.sel.id === id);
    const rec = (b, depth, seen) => {
      if (seen.has(b.id)) return ''; seen.add(b.id); const br = res.boards[b.id];
      return `<div class="tn${isSel('board', b.id) ? ' on' : ''}" data-k="board" data-id="${b.id}" style="padding-left:${8 + depth * 14}px">🗄 <b>${esc(b.name)}</b> <small>${br ? kW(br.P) + ' kW' : ''}</small></div>` +
        b.circuits.map((c) => { const r = res.circuits[c.id]; const ch = B().childOf(st, c); return `<div class="tn${isSel('circuit', c.id) ? ' on' : ''}" data-k="circuit" data-id="${c.id}" style="padding-left:${22 + depth * 14}px">${dot(r && r.status)}${c.kind === 'feeder' ? '⤵' : '↳'} ${esc(c.name)} <small>${r ? r.In + ' A' : ''}</small></div>` + (ch ? rec(ch, depth + 2, seen) : ''); }).join('');
    };
    const seen = new Set(); let h = `<div class="tn${isSel('study') ? ' on' : ''}" data-k="study">📁 <b>${esc(st.name)}</b></div>`;
    (res.balance.roots || []).forEach((id) => { h += rec(board(id), 1, seen); });
    st.boards.filter((b) => !seen.has(b.id)).forEach((b) => { h += `<div class="tn muted small" style="padding-left:12px">non raccordé :</div>` + rec(b, 1, seen); });
    el.innerHTML = h;
    $$('.tn[data-k]', el).forEach((n) => (n.onclick = () => { ST.sel = { kind: n.dataset.k, id: n.dataset.id }; renderTree(); renderProps(); renderView(); renderStatus(); }));
  }
  function renderTabs() { const el = $('#bttabs'); if (!el) return; el.innerHTML = TABS.map(([k, l]) => `<button class="bttab${ST.tab === k ? ' on' : ''}" data-t="${k}">${l}</button>`).join(''); $$('[data-t]', el).forEach((b) => (b.onclick = () => setTab(b.dataset.t))); }
  function renderMsgs() {
    const el = $('#btmsgs'); if (!el) return; const M = ST.res.msgs, ic = { error: '⛔', warn: '⚠', missing: '❔' };
    const n = (s) => M.filter((m) => m.sev === s).length;
    el.innerHTML = `<div class="btmh"><b>Messages</b> <span class="lvl">⛔ ${n('error')} erreur(s)</span> <span class="lvl">⚠ ${n('warn')} avertissement(s)</span> <span class="lvl">❔ ${n('missing')} donnée(s) manquante(s)</span><span class="grow"></span><small class="muted">Résultats de calcul fondés sur les règles et tableaux saisis : à faire valider, pas de certification automatique.</small></div>` +
      (M.length ? `<div class="btml">${M.map((m, i) => `<div class="btm ${m.sev}" data-i="${i}">${ic[m.sev] || '•'} ${esc(m.msg)}</div>`).join('')}</div>` : '<div class="btml"><div class="btm ok">✔ Aucun problème détecté par le moteur de calcul.</div></div>');
    $$('.btm[data-i]', el).forEach((d) => (d.onclick = () => { const m = M[+d.dataset.i]; if (m.id) { ST.sel = { kind: 'circuit', id: m.id }; ST.tab = 'calc'; renderAll(); } }));
  }
  function renderStatus() {
    const el = $('#btsb'); if (!el) return; const st = ST.st, b = ST.res.balance, s = ST.res.stats || {};
    el.innerHTML = `<span>📁 ${esc(st.name)}</span><span>${st.U}/${st.U0} V – ${st.f} Hz – ${esc(st.earthing)}</span><span>P = ${kW(b.P)} kW · S = ${kW(b.S)} kVA · Ib = ${f1(b.Ib)} A${st.Pavail ? ' / ' + esc(st.Pavail) + ' kVA disponibles' : ''}</span><span>✔ ${s.ok || 0} · ? ${s.check || 0} · ✖ ${s.ko || 0} · ❔ ${s.missing || 0}</span><span class="grow"></span><span id="btsave">${esc(ST.saveTxt || 'Enregistré')}</span>`;
  }

  // ---------- propriétés ----------
  const fld = (o, k, label, type, opts, help) => {
    const v = o[k] == null ? '' : o[k];
    if (type === 'select') return `<label>${esc(label)}<select data-f="${k}">${opts.map((x) => { const [val, l] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(val)}"${String(val) === String(v) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>${help ? `<small class="muted">${esc(help)}</small>` : ''}</label>`;
    if (type === 'check') return `<label class="chk"><input type="checkbox" data-f="${k}"${v ? ' checked' : ''}> ${esc(label)}</label>`;
    return `<label>${esc(label)}<input data-f="${k}" value="${esc(v)}"${type === 'num' ? ' inputmode="decimal"' : ''}>${help ? `<small class="muted">${esc(help)}</small>` : ''}</label>`;
  };
  function bindProps(el, obj, nums) { $$('[data-f]', el).forEach((i) => (i.onchange = () => { const k = i.dataset.f; let v = i.type === 'checkbox' ? i.checked : i.value; if (nums && nums.includes(k) && v !== '') v = String(v).replace(',', '.'); if (k === 'phases') v = +v; if (k === 'neutral') v = !!v; obj[k] = v; changed(); })); }
  function renderProps() {
    const el = $('#btpropsb'); if (!el) return; const s = ST.sel, R = B();
    if (s.kind === 'study' || !selected()) {
      const st = ST.st; el.innerHTML = `<h3>${esc(st.name)}</h3><p class="small">${esc(st.client || 'Client non renseigné')}<br>${esc(st.site || '')}</p><table class="qt small"><tbody>${[['Bâtiment', st.building], ['Alimentation', st.supply], ['Réseau', st.U + ' / ' + st.U0 + ' V – ' + st.f + ' Hz'], ['Régime de neutre', st.earthing], ['Puissance disponible', st.Pavail ? st.Pavail + ' kVA' : 'à renseigner'], ['Icc livraison', st.Ik ? st.Ik + ' kA' : 'à renseigner'], ['RA (TT)', st.RA ? st.RA + ' Ω' : '—'], ['Bureau d\'études', st.office || '—'], ['Ingénieur', st.engineer || '—'], ['Date', st.date || '—']].map(([a, b]) => `<tr><td>${esc(a)}</td><td><b>${esc(String(b))}</b></td></tr>`).join('')}</tbody></table><div class="btnrow"><button class="btn primary" id="pp-edit">Modifier…</button></div>`;
      $('#pp-edit').onclick = async () => { const r = await wizard(ST.st); if (r) changed(); }; return;
    }
    if (s.kind === 'board') {
      const b = board(s.id), br = ST.res.boards[b.id] || {}, encs = ST.bom && ST.bom.layouts[b.id] ? R.enclosures(ST.st, b, ST.bom.layouts[b.id], LIB()) : [];
      el.innerHTML = `<h3>🗄 Tableau</h3>${fld(b, 'name', 'Nom')}${fld(b, 'ks', 'Facteur de simultanéité du tableau (ks)', 'num', null, '0 à 1 – appliqué à la somme des circuits')}${fld(b, 'layout', 'Répartition', 'select', [['opt', 'Optimisée'], ['trad', 'Traditionnelle']])}${fld(b, 'perRow', 'Modules par rangée', 'select', [['', 'Valeur de l\'étude (' + ST.st.rules.perRow + ')'], '13', '18', '24'])}${fld(b, 'enc', 'Enveloppe', 'select', [['', 'Automatique (la plus compacte)']].concat(encs.map((e) => [e.ref, e.name + (e.count > 1 ? ' × ' + e.count : '')])))}
        <table class="qt small"><tbody><tr><td>P demandée</td><td><b>${kW(br.P)} kW</b></td></tr><tr><td>S</td><td><b>${kW(br.S)} kVA</b></td></tr><tr><td>Ib (équilibré)</td><td><b>${f1(br.Ib)} A</b></td></tr>${br.phases ? `<tr><td>Phases L1 / L2 / L3</td><td>${['L1', 'L2', 'L3'].map((k) => kW(br.phases[k])).join(' / ')} kVA</td></tr><tr><td>Déséquilibre</td><td>${f1(br.unbalance, 0)} %</td></tr>` : ''}<tr><td>Icc aux barres</td><td><b>${br.Ik != null ? f1(br.Ik, 2) + ' kA' : 'non calculé'}</b></td></tr><tr><td>Chute de tension amont</td><td>${f1(br.dU, 2)} %</td></tr></tbody></table>
        <div class="btnrow"><button class="btn small" id="pp-add">+ Circuit</button><button class="btn small" id="pp-feed">+ Départ</button><button class="btn small danger" id="pp-del">Supprimer</button></div>`;
      bindProps(el, b, ['ks']); $('#pp-add').onclick = () => A.addCircuit(); $('#pp-feed').onclick = A.addFeeder; $('#pp-del').onclick = A.del; return;
    }
    const f = circ(s.id); if (!f) return; const c = f.circuit, r = ST.res.circuits[c.id] || {}, feeder = c.kind === 'feeder';
    el.innerHTML = `<h3>${feeder ? '⤵ Départ' : '↳ Circuit'} <span class="stchip ${stCls(r.status)}">${esc(r.status || '')}</span></h3>${fld(c, 'name', 'Désignation')}
      ${feeder ? `<p class="small">Alimente : <b>${esc((board(c.feeds) || {}).name || 'aucun tableau')}</b></p>` : fld(c, 'type', 'Type de circuit', 'select', R.TYPES)}
      <div class="two">${fld(c, 'phases', 'Phases', 'select', [['1', 'Monophasé'], ['3', 'Triphasé']])}${+c.phases === 3 ? fld(c, 'neutral', 'Neutre distribué', 'check') : '<span></span>'}</div>
      ${feeder ? '' : fld(c, 'ks', 'Simultanéité du circuit (ks)', 'num')}
      <h4>Canalisation</h4>${fld(c, 'length', 'Longueur (m) *', 'num', null, 'obligatoire pour la chute de tension et les Icc')}
      ${fld(c, 'method', 'Mode de pose', 'select', [['', 'Valeur de l\'étude (' + ST.st.rules.method + ')']].concat(Object.entries(R.METHODS)))}
      <div class="two">${fld(c, 'insul', 'Isolant', 'select', [['', 'Étude (' + ST.st.rules.insul + ')'], ['PVC', 'PVC (70 °C)'], ['PR', 'PR / XLPE (90 °C)']])}${fld(c, 'mat', 'Âme', 'select', [['', 'Étude (' + ST.st.rules.mat + ')'], ['cu', 'Cuivre'], ['al', 'Aluminium']])}</div>
      <div class="two">${fld(c, 'ambient', 'Température (°C)', 'num', null, 'vide = valeur de l\'étude')}${fld(c, 'group', 'Circuits groupés', 'num')}</div>
      ${fld(c, 'section', 'Section', 'select', [['auto', 'Automatique']].concat(R.SECTIONS.map((x) => [String(x), String(x).replace('.', ',') + ' mm²'])))}
      <h4>Protection</h4><div class="two">${fld(c, 'curve', 'Courbe', 'select', [['auto', 'Automatique'], 'B', 'C', 'D'])}${fld(c, 'rcd', 'Différentiel', 'select', [['auto', 'Automatique'], ['none', 'Aucun'], ['30', '30 mA'], ['100', '100 mA'], ['300', '300 mA']])}</div>
      ${fld(c, 'prot', 'Appareil', 'select', [['', 'Automatique (1re solution)']].concat((r.options || []).map((o) => [o.ref, o.name + ' – ' + o.fab])))}${feeder ? '' : fld(c, 'contactor', 'Commande par contacteur', 'check')}
      ${feeder ? '' : `<h4>Récepteurs (${c.loads.length})</h4>${c.loads.map((l, i) => `<div class="ldrow" data-l="${i}"><input data-lf="name" value="${esc(l.name)}" title="Désignation"><input data-lf="P" value="${esc(l.P)}" placeholder="P (W)" title="Puissance nominale (W)" inputmode="decimal"><input data-lf="n" value="${esc(l.n)}" title="Nombre" inputmode="decimal"><button class="btn small" data-ld="${i}" title="Supprimer">✕</button></div>`).join('')}<p class="small muted">Nom · puissance unitaire (W) · nombre. cos φ, rendement et facteurs dans l'onglet Bilan.</p><button class="btn small" id="pp-load">+ Récepteur</button>`}
      <div class="btnrow"><button class="btn small" id="pp-dup">Dupliquer</button><button class="btn small" id="pp-mv">Déplacer…</button><button class="btn small danger" id="pp-del">Supprimer</button></div>`;
    bindProps(el, c, ['ks', 'length', 'ambient', 'group']);
    $$('.ldrow [data-lf]', el).forEach((i) => (i.onchange = () => { const L = c.loads[+i.closest('.ldrow').dataset.l]; L[i.dataset.lf] = i.value.replace(',', '.'); changed(); }));
    $$('[data-ld]', el).forEach((b2) => (b2.onclick = () => { c.loads.splice(+b2.dataset.ld, 1); changed(); }));
    const pl = $('#pp-load'); if (pl) pl.onclick = A.addLoad; $('#pp-dup').onclick = A.dup; $('#pp-mv').onclick = A.moveTo; $('#pp-del').onclick = A.del;
  }
  const stCls = (s) => (s === 'Conforme' ? 'ok' : s === 'À vérifier' ? 'check' : s === 'Non conforme' ? 'ko' : 'miss');

  // ---------- zone centrale ----------
  function renderView() {
    const el = $('#btview'); if (!el) return; const V = EE.BTViews || {};
    const fn = { bilan: viewBilan, calc: viewCalc, param: viewParam, lib: V.lib, repart: V.repart, enc: V.enc, v2d: V.v2d, v3d: V.v3d, therm: V.therm, sel: V.sel, bom: V.bom, lab: V.lab, doc: V.doc }[ST.tab];
    try { if (fn) fn(el); else el.innerHTML = '<p class="muted">Onglet indisponible.</p>'; } catch (e) { console.error(e); el.innerHTML = '<p class="err">Affichage impossible : ' + esc(e.message) + '</p>'; }
  }
  function viewBilan(el) {
    const st = ST.st, res = ST.res, bal = res.balance;
    let h = `<div class="bar"><h2>Bilan de puissance</h2><div class="grow"></div><button class="btn small" id="bi-csv">CSV</button></div><p class="small muted">Pinst = n × Pn ; Pa = Pinst / η ; Pd = Pa × ku ; circuit : × ks ; Q = P × tan φ ; S = √(P² + Q²) ; Ib = S / U0 (mono) ou S / (√3·U) (tri). Les cases ku, ks, cos φ et η sont modifiables.</p>`;
    st.boards.forEach((b) => {
      const br = bal.boards[b.id]; if (!br) return;
      h += `<h3>🗄 ${esc(b.name)} <small class="muted">ks tableau <input class="tin" data-bks="${b.id}" value="${esc(b.ks)}"></small></h3><div class="qwrap"><table class="qt bal"><thead><tr><th>Circuit / récepteur</th><th>Type</th><th class="r">Pn (W)</th><th class="r">n</th><th class="r">cos φ</th><th class="r">η</th><th class="r">ku</th><th class="r">ks</th><th class="r">P inst. (kW)</th><th class="r">P (kW)</th><th class="r">Q (kvar)</th><th class="r">S (kVA)</th><th class="r">Ib (A)</th></tr></thead><tbody>`;
      b.circuits.forEach((c) => {
        const cr = br.circuits.find((x) => x.id === c.id) || {};
        h += `<tr class="cat"><td><b>${esc(c.name)}</b>${c.kind === 'feeder' ? ' <small>(départ → ' + esc((board(c.feeds) || {}).name || '?') + ')</small>' : ''}</td><td>${esc(c.kind === 'feeder' ? 'Départ' : c.type)}</td><td></td><td></td><td></td><td></td><td></td><td class="r">${c.kind === 'feeder' ? '' : `<input class="tin" data-cks="${c.id}" value="${esc(c.ks)}">`}</td><td class="r">${kW(cr.Pinst)}</td><td class="r"><b>${kW(cr.P)}</b></td><td class="r">${kW(cr.Q)}</td><td class="r">${kW(cr.S)}</td><td class="r"><b>${f1(cr.Ib)}</b></td></tr>`;
        c.loads.forEach((l, i) => { const lb = B().balance ? null : null; void lb; h += `<tr><td>↳ <input class="tin w" data-ld="${c.id}:${i}:name" value="${esc(l.name)}"></td><td>${esc(l.type || c.type)}</td>${['P', 'n', 'cos', 'eta', 'ku'].map((k) => `<td class="r"><input class="tin" data-ld="${c.id}:${i}:${k}" value="${esc(l[k])}"${k === 'P' && (l.P === '' || l.P == null) ? ' placeholder="?" style="border-color:#c62828"' : ''}></td>`).join('')}<td></td><td class="r">${kW((+l.P || 0) * (+l.n || 0))}</td><td colspan="4"></td></tr>`; });
      });
      h += `<tr class="tot"><td colspan="8"><b>Total ${esc(b.name)}</b> (Σ circuits ${kW(br.Pcircuits)} kW × ks ${esc(b.ks)})</td><td class="r">${kW(br.Pinst)}</td><td class="r"><b>${kW(br.P)}</b></td><td class="r">${kW(br.Q)}</td><td class="r">${kW(br.S)}</td><td class="r"><b>${f1(br.Ib)}</b></td></tr></tbody></table></div>`;
    });
    h += `<section class="card flat"><h3>Ensemble du projet</h3><p>P = <b>${kW(bal.P)} kW</b> · Q = ${kW(bal.Q)} kvar · S = <b>${kW(bal.S)} kVA</b> · cos φ = ${f1(bal.cos, 2)} · Ib = <b>${f1(bal.Ib)} A</b> sous ${st.U} V${st.Pavail ? ` · disponible : ${esc(st.Pavail)} kVA (${f1(100 * bal.S / 1000 / +String(st.Pavail).replace(',', '.'), 0)} % utilisés)` : ' · puissance disponible non renseignée'}</p></section>`;
    el.innerHTML = h;
    $$('[data-bks]', el).forEach((i) => (i.onchange = () => { board(i.dataset.bks).ks = i.value.replace(',', '.'); changed(); }));
    $$('[data-cks]', el).forEach((i) => (i.onchange = () => { circ(i.dataset.cks).circuit.ks = i.value.replace(',', '.'); changed(); }));
    $$('[data-ld]', el).forEach((i) => (i.onchange = () => { const [cid, li, k] = i.dataset.ld.split(':'); const L = circ(cid).circuit.loads[+li]; L[k] = k === 'name' ? i.value : i.value.replace(',', '.'); changed(); }));
    $('#bi-csv').onclick = () => EE.BTViews.csvBalance();
  }
  function viewCalc(el) {
    const st = ST.st, res = ST.res; const sel = ST.sel.kind === 'circuit' ? res.circuits[ST.sel.id] : null;
    const pdc = (r) => (r.prot ? r.prot.pdc + ' kA' : '—');
    let h = `<div class="bar"><h2>Calculs et sélection des protections</h2><div class="grow"></div><button class="btn small" id="ca-csv">CSV</button></div>
      <div class="qwrap"><table class="qt calcres"><thead><tr><th>Tableau</th><th>Circuit</th><th class="r">Ib (A)</th><th class="r">In (A)</th><th class="r">Iz (A)</th><th class="r">Section</th><th>Protection</th><th class="r">Icc max (kA)</th><th class="r">Icc min (A)</th><th class="r">ΔU (%)</th><th>Résultat</th></tr></thead><tbody>`;
    st.boards.forEach((b) => b.circuits.forEach((c) => { const r = res.circuits[c.id]; if (!r) return; h += `<tr class="${ST.sel.id === c.id ? 'on' : ''}" data-c="${c.id}"><td>${esc(b.name)}</td><td><b>${esc(c.name)}</b></td><td class="r">${f1(r.Ib)}</td><td class="r">${r.In}</td><td class="r">${f1(r.Iz, 0)}</td><td class="r">${r.section ? (r.phases === 3 ? (c.neutral === false ? '4G' : '5G') : '3G') + String(r.section).replace('.', ',') : '—'}</td><td>${r.prot ? esc(r.poles + ' ' + r.curve + r.In + (r.rcd ? ' ' + r.rcd + ' mA' : '')) + `<br><small>${esc(r.prot.ref)} – PdC ${pdc(r)}</small>` : '<span class="err">aucune</span>'}</td><td class="r">${r.IkOrigin != null ? f1(r.IkOrigin, 2) : '?'}</td><td class="r">${f1(r.Ikmin, 0)}</td><td class="r">${r.dUtot != null ? f1(r.dUtot, 2) : '?'} <small>/ ${r.lim}</small></td><td><span class="stchip ${stCls(r.status)}">${esc(r.status)}</span></td></tr>`; }));
    h += '</tbody></table></div>';
    if (sel) {
      const ci = sel.indirect || '', cls = ci.split(':')[0];
      h += `<section class="card flat calcdet"><h3>Note de calcul – ${esc(sel.board)} › ${esc(sel.name)} <span class="stchip ${stCls(sel.status)}">${esc(sel.status)}</span></h3>
        <ol class="small">
        <li><b>Courant d'emploi</b> : Ib = S / ${sel.phases === 3 ? '(√3 × U)' : 'U0'} = ${f1(sel.S, 0)} VA / ${sel.phases === 3 ? '(1,732 × ' + st.U + ')' : st.U0} = <b>${f1(sel.Ib, 2)} A</b></li>
        <li><b>Calibre</b> : plus petit In ≥ Ib disponible (${sel.poles}, courbe ${sel.curve}) → <b>In = ${sel.In} A</b></li>
        <li><b>Courant admissible</b> : ${esc(sel.hyp[0] || '')} → Iz = Iz₀ × k = <b>${f1(sel.Iz, 1)} A</b> ${sel.Iz >= sel.In ? '≥' : '<'} In ${sel.In} A ${sel.Iz >= sel.In ? '✔' : '✘'}</li>
        <li><b>Section retenue</b> : <b>${sel.section ? String(sel.section).replace('.', ',') + ' mm²' : '—'}</b> ${sel.mat === 'al' ? 'aluminium' : 'cuivre'} ${sel.reason ? '<span class="err">' + esc(sel.reason) + '</span>' : ''}</li>
        <li><b>Chute de tension</b> : ΔU = b × (ρ × L / S × cos φ + λ × L × sin φ) × Ib, b = ${sel.phases === 3 ? 1 : 2}, ρ = ${B().RHO[sel.mat || 'cu'].hot} Ω·mm²/m, λ = 0,08 mΩ/m → ${sel.dU != null ? f1(sel.dU, 2) + ' % + amont ' + f1(sel.dUup, 2) + ' % = <b>' + f1(sel.dUtot, 2) + ' %</b> (limite ' + sel.lim + ' %)' : '<span class="muted">longueur manquante</span>'}</li>
        <li><b>Icc maximal</b> aux barres du tableau : ${sel.IkOrigin != null ? '<b>' + f1(sel.IkOrigin, 2) + ' kA</b> → pouvoir de coupure requis ≥ ' + f1(sel.IkOrigin, 2) + ' kA ; appareil : ' + (sel.prot ? sel.prot.pdc + ' kA ' + (sel.prot.pdc >= sel.IkOrigin ? '✔' : '✘') : '—') : '<span class="muted">Icc de livraison ou longueur amont manquant(e)</span>'}${sel.IkEnd != null ? ' ; en bout de circuit : ' + f1(sel.IkEnd, 2) + ' kA' : ''}</li>
        <li><b>Icc minimal</b> (défaut phase-PE, méthode conventionnelle) : Ia = 0,8 × U0 × S / (ρ × 2 × L) = ${sel.Ikmin != null ? '<b>' + f1(sel.Ikmin, 0) + ' A</b> ' + (sel.Ikmin >= sel.Im ? '≥' : '<') + ' seuil magnétique haut ' + f1(sel.Im, 0) + ' A ' + (sel.Ikmin >= sel.Im ? '✔' : '✘') : '<span class="muted">longueur manquante</span>'}</li>
        <li><b>Protection différentielle</b> : ${sel.rcd ? sel.rcd + ' mA' + (sel.prot && sel.prot.rcbo ? ' (disjoncteur différentiel)' : ' (interrupteur différentiel de groupe)') : 'aucune'}</li>
        <li><b>Contacts indirects</b> : <span class="${cls === 'ok' ? 'okc' : cls === 'ko' ? 'err' : 'muted'}">${esc(ci.slice(ci.indexOf(':') + 1))}</span></li>
        <li><b>Surcharges</b> : Ib ${f1(sel.Ib, 1)} ≤ In ${sel.In} ≤ Iz ${f1(sel.Iz, 1)} A ${sel.Ib <= sel.In && sel.In <= (sel.Iz || 0) + 1e-9 ? '✔' : '✘'} · <b>Courts-circuits</b> : PdC ≥ Icc max et Icc min ≥ seuil magnétique</li>
        </ol>
        ${sel.missing.length ? `<div class="rep warn">Données manquantes : ${esc(sel.missing.join(', '))}</div>` : ''}${sel.warns.map((w) => `<div class="rep warn">⚠ ${esc(w)}</div>`).join('')}
        <h4>Solutions possibles</h4><div class="qwrap"><table class="qt small"><thead><tr><th>Solution</th><th>Appareil</th><th class="r">PdC</th><th class="r">Prix</th><th></th></tr></thead><tbody>${(sel.options || []).map((o) => `<tr><td>${o.rcbo ? 'Disjoncteur différentiel' : 'Disjoncteur'}</td><td>${esc(o.name)}<br><small>${esc(o.fab)} – ${esc(o.ref)}</small></td><td class="r">${o.pdc} kA</td><td class="r">${o.price ? money(o.price) : '—'}</td><td><button class="btn small" data-pick="${esc(o.ref)}">Choisir</button></td></tr>`).join('')}${sel.alternatives.map((a) => `<tr><td colspan="2">${esc(a.label)} : Iz ${f1(a.Iz, 0)} A, ΔU ${a.dU != null ? f1(a.dU, 2) + ' %' : '?'}</td><td></td><td></td><td><button class="btn small" data-sec="${a.section}">Imposer</button></td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">Hypothèses : tableaux de courants admissibles CEI 60364-5-52 (cuivre ; aluminium ≈ × 0,78), facteurs de température et de groupement usuels, résistivités conventionnelles NF C 15-100, source : Rs = 0,1·Zs, Xs = 0,995·Zs, Zs = U0 / Icc livraison. Valeurs à vérifier sur les normes et documentations en vigueur.</p></section>`;
    } else h += '<p class="small muted">Cliquez sur une ligne pour afficher la note de calcul détaillée (formules, hypothèses, solutions).</p>';
    el.innerHTML = h;
    $$('tr[data-c]', el).forEach((t) => (t.onclick = () => { ST.sel = { kind: 'circuit', id: t.dataset.c }; renderTree(); renderProps(); renderView(); }));
    $$('[data-pick]', el).forEach((b) => (b.onclick = () => { circ(ST.sel.id).circuit.prot = b.dataset.pick; changed(); }));
    $$('[data-sec]', el).forEach((b) => (b.onclick = () => { circ(ST.sel.id).circuit.section = b.dataset.sec; changed(); }));
    $('#ca-csv').onclick = () => EE.BTViews.csvCalc();
  }
  function viewParam(el) {
    const R = ST.st.rules, BT = B();
    const F = [['dULight', 'Chute de tension maximale – éclairage (%)'], ['dUOther', 'Chute de tension maximale – autres usages (%)'], ['ambient', 'Température ambiante de l\'air (°C)'], ['soil', 'Température du sol (°C)'], ['group', 'Circuits groupés par défaut'], ['reserve', 'Réserve d\'extension dans les tableaux (%)'], ['rcdPerGroup', 'Départs maximum par interrupteur différentiel'], ['tMax', 'Température maximale admise dans l\'enveloppe (°C)'], ['kSteel', 'Coefficient d\'échange enveloppe métallique (W/m²·K)'], ['kInsul', 'Coefficient d\'échange enveloppe isolante (W/m²·K)'], ['selRatio', 'Rapport minimal des calibres pour la sélectivité'], ['labourRate', 'Taux horaire de main-d\'œuvre'], ['hDevice', 'Heures par appareil'], ['hCircuit', 'Heures par circuit (câblage, raccordement)'], ['hBoard', 'Heures par tableau (montage, essais)'], ['fraisPct', 'Frais supplémentaires (%)'], ['marginPct', 'Marge (%)'], ['tvaPct', 'TVA (%) – à vérifier selon le pays']];
    el.innerHTML = `<h2>Paramètres et règles de calcul</h2><p class="small muted">Valeurs par défaut usuelles, modifiables pour chaque étude et selon le pays du projet. Normes de référence : <b>${esc(R.norms)}</b> (Fichier › Propriétés de l'étude).</p>
      <section class="card flat"><div class="two">${[['method', 'Mode de pose par défaut', Object.entries(BT.METHODS)], ['insul', 'Isolant par défaut', [['PVC', 'PVC'], ['PR', 'PR / XLPE']]], ['mat', 'Âme par défaut', [['cu', 'Cuivre'], ['al', 'Aluminium']]], ['perRow', 'Modules par rangée', [['13', '13'], ['18', '18'], ['24', '24']]]].map(([k, l, o]) => `<label>${esc(l)}<select data-r="${k}">${o.map(([v, t]) => `<option value="${v}"${String(R[k]) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`).join('')}${F.map(([k, l]) => `<label>${esc(l)}<input data-r="${k}" value="${esc(R[k])}" inputmode="decimal"></label>`).join('')}<label>Monnaie<input data-r="currency" value="${esc(R.currency)}" placeholder="${esc(EE.Config.get().currency || 'GNF')}"></label></div>
      <div class="btnrow"><button class="btn" id="pr-rst">Rétablir les valeurs par défaut</button></div></section>
      <section class="card flat"><h3>Tableaux de référence (CEI 60364-5-52, cuivre) – à vérifier</h3><p class="small muted">Courants admissibles Iz₀ (A) à 30 °C (air) ou 20 °C (sol). Saisis de mémoire : comparez-les à l'édition de la norme applicable avant toute étude réelle.</p>
      ${Object.keys(BT.IZ).map((m) => `<h4>${esc(BT.METHODS[m])}</h4><div class="qwrap"><table class="qt small"><thead><tr><th>Isolant / conducteurs chargés</th>${BT.SECTIONS.map((s) => `<th class="r">${String(s).replace('.', ',')}</th>`).join('')}</tr></thead><tbody>${['PVC', 'PR'].map((i) => [2, 3].map((n) => `<tr><td>${i} – ${n}</td>${BT.IZ[m][i][n].map((v) => `<td class="r">${String(v).replace('.', ',')}</td>`).join('')}</tr>`).join('')).join('')}</tbody></table></div>`).join('')}
      <h4>Facteurs de correction</h4><div class="two"><div><b>Température (air)</b><table class="qt small"><thead><tr><th>°C</th><th class="r">PVC</th><th class="r">PR</th></tr></thead><tbody>${Object.keys(BT.KT_AIR.PVC).map((t) => `<tr><td>${t}</td><td class="r">${BT.KT_AIR.PVC[t]}</td><td class="r">${BT.KT_AIR.PR[t]}</td></tr>`).join('')}</tbody></table></div><div><b>Groupement</b><table class="qt small"><thead><tr><th>Circuits</th><th class="r">k</th></tr></thead><tbody>${Object.keys(BT.KG).map((n) => `<tr><td>${n}</td><td class="r">${BT.KG[n]}</td></tr>`).join('')}</tbody></table></div></div></section>`;
    $$('[data-r]', el).forEach((i) => (i.onchange = () => { const k = i.dataset.r; R[k] = ['method', 'insul', 'mat', 'currency'].includes(k) ? i.value : (i.value.replace(',', '.')); if (k === 'perRow') R[k] = +i.value; changed(); }));
    $('#pr-rst').onclick = async () => { if (await ui().confirmBox('Rétablir', 'Remettre les règles de calcul par défaut pour cette étude ?', 'Rétablir', false)) { const n = R.norms; ST.st.rules = Object.assign(BT.defaultRules(), { norms: n }); changed(); } };
  }
  function help() { ui().modal({ title: 'Bureau d\'études – mode d\'emploi', wide: true, body: `<ol><li><b>Fichier › Nouvelle étude</b> : l'assistant enregistre le client, le réseau, le régime de neutre, l'Icc de livraison…</li><li>Dans l'<b>explorateur</b> (à gauche), sélectionnez le TGBT puis <b>+ Circuit</b> ou <b>+ Départ</b> (un départ crée un tableau divisionnaire). Renseignez dans les <b>propriétés</b> (à droite) le type, la longueur, le mode de pose et les récepteurs.</li><li>Le calcul est <b>automatique</b> : onglets <b>Bilan</b>, <b>Calculs et protections</b> (cliquez une ligne pour la note de calcul). Les messages en bas listent erreurs et données manquantes.</li><li><b>Répartition</b>, <b>Enveloppe</b>, <b>Vues 2D / 3D</b>, <b>Thermique</b> organisent et vérifient chaque tableau.</li><li><b>Nomenclature et chiffrage</b>, <b>Étiquettes</b>, <b>Dossier</b> produisent les documents (PDF, Excel, CSV, SVG, DXF via l'atelier).</li><li>Raccourcis : Ctrl+Z / Ctrl+Y, Ctrl+C / Ctrl+V / Ctrl+X, Ctrl+D, Suppr, Ctrl+S.</li></ol>`, buttons: [{ label: 'Fermer', cls: 'primary', value: null }] }); }
  function limits() { ui().modal({ title: 'Hypothèses et limites', wide: true, body: `<ul><li>Courants admissibles et coefficients : CEI 60364-5-52 saisis de mémoire (à vérifier) ; aluminium approché par × 0,78.</li><li>Icc : méthode des impédances simplifiée (source Rs = 0,1 Zs, Xs = 0,995 Zs ; câbles à 20 °C pour l'Icc maximal) ; Icc minimal : méthode conventionnelle NF C 15-100 (PE de même section).</li><li>Protections : choix parmi la bibliothèque ; seuils magnétiques normalisés B (3–5 In), C (5–10 In), D (10–20 In).</li><li>Différentiels : règles usuelles (30 mA prises et résidentiel, 300 mA en TT), modifiables par circuit.</li><li>Échauffement : méthode simplifiée inspirée de la CEI TR 60890 (pertes indicatives des appareils, surface effective) – à confirmer par les données des fabricants.</li><li>Sélectivité : analyse ampèremétrique indicative ; filiation jamais déclarée sans tableaux du fabricant.</li><li>Aucun résultat ne vaut certificat de conformité : l'étude doit être validée par une personne qualifiée.</li></ul>`, buttons: [{ label: 'Fermer', cls: 'primary', value: null }] }); }

  function screen() { if (ST.st && ST.openId && Studies.get(ST.openId) && EE.Store.Users.current()) { render(); } else { ST.st = null; listScreen(); } }
  Object.assign(ST, { Studies, render, renderAll, changed, recompute, open, close, A, board, circ, curBoard, selected, money, f1, kW, stCls, saveNow, demoStudy, setTab, importStudy, wizard });
  EE.Screens = EE.Screens || {}; EE.Screens.bt = screen;
})(window);
