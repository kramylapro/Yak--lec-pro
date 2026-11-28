/* Yak-élec-pro V1.10 – atelier : barre de menus (Fichier, Édition, Affichage, Insertion, Simulation, Outils, Aide),
   feuilles multiples dans un même projet, fenêtre d'impression / mise en page (A4, A3, A2, cartouche). */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, St = EE.Store;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => EE.app.ui;

  // ---------- feuilles ----------
  const Sheets = {
    ensure(p) { if (!Array.isArray(p.sheets) || !p.sheets.length) { p.sheets = [{ id: EE.uid('f'), name: 'Feuille 1', doc: null, view: null }]; p.sheet = 0; } if (!(p.sheet >= 0 && p.sheet < p.sheets.length)) p.sheet = 0; return p; },
    count(p) { return p.sheets && p.sheets.length ? p.sheets.length : 1; },
  };
  EE.Sheets = Sheets;

  let H = null; // fonctions de l'atelier fournies par app.js
  function switchSheet(i) {
    const { ed, p } = H; Sheets.ensure(p); if (i === p.sheet || !p.sheets[i]) return;
    if (ed.sim) ed.stopSim();
    const cur = p.sheets[p.sheet]; cur.doc = EE.clone(ed.doc); cur.view = Object.assign({}, ed.view);
    const nx = p.sheets[i]; p.doc = nx.doc || { comps: [], wires: [] }; nx.doc = null; p.sheet = i;
    ed.replaceDoc(p.doc); if (p.doc.comps.length || p.doc.wires.length) setTimeout(() => ed.fit(), 20);
    H.scheduleSave(); H.renderProps({ comps: [], wires: [] }); renderSheets();
  }
  async function addSheet() {
    const { p } = H; Sheets.ensure(p); const name = await askText('Nouvelle feuille', 'Nom de la feuille', 'Feuille ' + (p.sheets.length + 1)); if (name == null) return;
    p.sheets.push({ id: EE.uid('f'), name: name || 'Feuille ' + (p.sheets.length + 1), doc: { comps: [], wires: [] }, view: null });
    switchSheet(p.sheets.length - 1); ui().toast('Feuille ajoutée', 'ok');
  }
  async function renameSheet(i) {
    const { p } = H; Sheets.ensure(p); const sh = p.sheets[i]; const name = await askText('Renommer la feuille', 'Nom de la feuille', sh.name); if (!name) return;
    sh.name = name; H.scheduleSave(); renderSheets();
  }
  async function delSheet(i) {
    const { p, ed } = H; Sheets.ensure(p); if (p.sheets.length < 2) { ui().toast('Un projet garde au moins une feuille', 'bad'); return; }
    if (!(await ui().confirmBox('Supprimer la feuille', `Supprimer « <b>${esc(p.sheets[i].name)}</b> » et tout son dessin ?`, 'Supprimer'))) return;
    if (i === p.sheet) { const j = i === 0 ? 1 : i - 1; switchSheet(j); }
    p.sheets.splice(i, 1); if (p.sheet > i) p.sheet--; H.scheduleSave(); renderSheets(); void ed;
  }
  function renderSheets() {
    const el = $('#shbar'); if (!el || !H) return; const { p } = H; Sheets.ensure(p);
    el.innerHTML = p.sheets.map((sh, i) => `<button class="shtab${i === p.sheet ? ' on' : ''}" data-sh="${i}" title="Cliquer pour ouvrir · double-clic pour renommer">${esc(sh.name)}${i === p.sheet && p.sheets.length > 1 ? `<span class="shx" data-shx="${i}" title="Supprimer la feuille">×</span>` : ''}</button>`).join('') +
      `<button class="shtab add" id="sh-add" title="Ajouter une feuille au projet">＋ Feuille</button><span class="small muted shinfo">${p.sheets.length} feuille${p.sheets.length > 1 ? 's' : ''}</span>`;
    $$('[data-sh]', el).forEach((b) => { b.onclick = (e) => { if (e.target.dataset.shx) return; switchSheet(+b.dataset.sh); }; b.ondblclick = () => renameSheet(+b.dataset.sh); });
    $$('[data-shx]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); delSheet(+b.dataset.shx); }));
    $('#sh-add', el).onclick = addSheet;
  }
  function askText(title, label, val) {
    return ui().modal({ title, body: `<label>${esc(label)}<input id="askv" maxlength="80" value="${esc(val || '')}"></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Valider', cls: 'primary', value: (ov) => $('#askv', ov).value.trim() }] });
  }

  // ---------- impression / mise en page ----------
  async function printDialog(p) {
    if (H && H.flushSave) H.flushSave();
    const u = St.Users.current(), arch = p.schema === 'architectural', n = Sheets.count(p);
    const r = await ui().modal({
      title: 'Imprimer / PDF mis en page', wide: true,
      body: `<div class="two"><label>Format du papier<select id="pr-f"><option>A4</option><option>A3</option><option>A2</option></select></label>
        <label>Orientation<select id="pr-o"><option value="auto">Automatique</option><option value="paysage">Paysage</option><option value="portrait">Portrait</option></select></label>
        <label>Feuilles<select id="pr-s"><option value="all">Toutes les feuilles (${n})</option><option value="current">Feuille ouverte seulement</option></select></label>
        <label>Échelle<select id="pr-k"><option value="fit">Ajustée à la page</option>${arch ? '<option>1:20</option><option>1:50</option><option>1:100</option>' : ''}</select></label>
        <label>Titre (cartouche)<input id="pr-t" maxlength="60" value="${esc(p.name)}"></label><label>Auteur<input id="pr-a" maxlength="40" value="${esc(u ? u.name : '')}"></label>
        <label>Établissement / entreprise<input id="pr-c" maxlength="40" value="${esc((EE.Config.get().brand || {}).name1 ? EE.Config.get().brand.name1 + (EE.Config.get().brand.name2 || '') : 'Yak-élec-pro')}"></label><label>Date<input id="pr-d" maxlength="20" value="${esc(EE.fmtDate(Date.now()))}"></label></div>
        <p class="small muted">Le cartouche (en bas à droite) indique le projet, l'auteur, la date, le numéro de feuille et l'échelle.${arch ? ' Plan : 1 carreau = 25 cm.' : ' Un schéma électrique est en général « sans échelle ».'}</p><div id="pr-prev" class="prprev"></div>`,
      buttons: [{ label: 'Fermer', value: null }, { label: '🖨 Imprimer', value: (ov) => Object.assign(read(ov), { act: 'print' }) }, { label: '⬇ Télécharger le PDF', cls: 'primary', value: (ov) => Object.assign(read(ov), { act: 'pdf' }) }],
    });
    function read(ov) { return { format: $('#pr-f', ov).value, orient: $('#pr-o', ov).value, sheets: $('#pr-s', ov).value, scale: $('#pr-k', ov).value, title: $('#pr-t', ov).value, author: $('#pr-a', ov).value, company: $('#pr-c', ov).value, date: $('#pr-d', ov).value }; }
    if (!r) return;
    try {
      if (r.act === 'print') { const pg = EE.Export.printPages(p, r); if (pg.some((x) => x.over)) ui().toast('Attention : le dessin dépasse la page à cette échelle', 'bad'); }
      else { const out = await EE.Export.pagedPdf(p, r); EE.Export.download(EE.Export.safe(p.name) + '_' + r.format + '.pdf', out.blob); ui().toast(`PDF ${r.format} prêt (${out.pages.length} page${out.pages.length > 1 ? 's' : ''})`, 'ok'); if (out.pages.some((x) => x.over)) ui().toast('Attention : le dessin dépasse la page à cette échelle', 'bad'); }
    } catch (e) { ui().toast(e.message, 'bad'); }
  }
  // aperçu en direct dans la fenêtre d'impression
  document.addEventListener('change', (e) => { if (e.target && /^pr-/.test(e.target.id || '')) preview(); });
  document.addEventListener('input', (e) => { if (e.target && /^pr-[tacd]$/.test(e.target.id || '')) preview(); });
  function preview() {
    const box = $('#pr-prev'); if (!box || !EE.app.project) return;
    const o = { format: $('#pr-f').value, orient: $('#pr-o').value, sheets: 'current', scale: $('#pr-k').value, title: $('#pr-t').value, author: $('#pr-a').value, company: $('#pr-c').value, date: $('#pr-d').value };
    const pg = EE.Export.layoutPages(EE.app.project, o)[0]; box.innerHTML = pg.svg + (pg.over ? '<p class="small err">⚠ Le dessin dépasse la page à cette échelle.</p>' : '');
  }
  const obs = new MutationObserver(() => { if ($('#pr-prev') && !$('#pr-prev').innerHTML) preview(); });
  g.addEventListener('DOMContentLoaded', () => obs.observe(document.body, { childList: true }));

  // ---------- barre de menus ----------
  function menus() {
    const { ed, p } = H; const s = St.Settings.get(); const sim = !!ed.sim;
    const exp = (k) => async () => { H.flushSave(); try { await EE.Export.run(k, p); ui().toast('Export ' + k.toUpperCase() + ' prêt', 'ok'); } catch (e) { ui().toast(e.message, 'bad'); } };
    const place = (t) => () => { if (sim) ed.stopSim(); ed.arm(t); ui().toast('Cliquez sur la feuille pour placer l\'élément'); };
    return [
      ['Fichier', [
        ['Nouveau projet…', 'Ctrl+N', () => H.newProject()], ['Ouvrir un projet…', '', () => H.go('projects')],
        ['Enregistrer maintenant', 'Ctrl+S', () => { H.flushSave(); ui().toast('Projet enregistré', 'ok'); }],
        ['Renommer le projet…', '', renameProject], ['Dupliquer le projet', '', () => { H.flushSave(); const c = St.Projects.duplicate(p.id); ui().toast('Copie créée : ' + c.name, 'ok'); }],
        ['Ranger dans un dossier…', '', () => EE.Folders && EE.Folders.moveDialog(p.id, () => { H.go('editor', p.id); })], '-',
        ['Imprimer / PDF mis en page…', 'Ctrl+P', () => printDialog(p)], ['Exporter en PDF (rapide)', '', exp('pdf')], ['Exporter en PNG', '', exp('png')], ['Exporter en SVG', '', exp('svg')], ['Exporter en DXF (AutoCAD)', '', exp('dxf')], ['Exporter le projet (.json)', '', exp('json')], '-',
        ['Fermer le projet', '', () => H.go('home')]]],
      ['Édition', [
        ['Annuler', 'Ctrl+Z', () => ed.undo(), !ed.canUndo], ['Rétablir', 'Ctrl+Y', () => ed.redo(), !ed.canRedo], '-',
        ['Couper', 'Ctrl+X', () => ed.cut()], ['Copier', 'Ctrl+C', () => ed.copy()], ['Coller', 'Ctrl+V', () => ed.paste()], ['Dupliquer', 'Ctrl+D', () => ed.duplicate()], ['Supprimer', 'Suppr', () => ed.del()], ['Tout sélectionner', 'Ctrl+A', () => ed.selectAll()], '-',
        ['Pivoter de 90°', 'R', () => ed.rotate()], ['Retourner (miroir)', 'M', () => ed.flip()]]],
      ['Affichage', [
        ['Zoom avant', '+', () => ed.zoomIn()], ['Zoom arrière', '−', () => ed.zoomOut()], ['Zoom 100 %', '', () => ed.setZoom(1)], ['Ajuster au dessin', '', () => ed.fit()], '-',
        [(s.grid ? '☑' : '☐') + ' Grille', '', () => { const v = !St.Settings.get().grid; St.Settings.set({ grid: v }); ed.setSettings({ grid: v }); const c = $('#b-grid'); if (c) c.checked = v; }],
        [(s.terminalMarks ? '☑' : '☐') + ' Marquer les bornes', '', () => { const v = !St.Settings.get().terminalMarks; St.Settings.set({ terminalMarks: v }); ed.setSettings({ terminalMarks: v }); }],
        [(s.theme === 'dark' ? '☑' : '☐') + ' Thème sombre', '', () => { const v = St.Settings.get().theme === 'dark' ? 'light' : 'dark'; St.Settings.set({ theme: v }); document.documentElement.dataset.theme = v; }],
        ['Plein écran du dessin', '', () => H.setFull(!document.body.classList.contains('yk-full'))], '-',
        ['Agrandir la feuille de dessin', '', () => setPane('sheet', 'max')], ['Réduire / restaurer les symboles', '', () => setPane('pal', 'min')], ['Réduire / restaurer le panneau', '', () => setPane('side', 'min')], ['Rétablir la disposition des fenêtres', '', () => { EE.Panes.reset(); try { localStorage.removeItem('eep.panelw'); } catch (e) { /* */ } $('#pal').style.width = ''; $('#side').style.width = ''; }]]],
      ['Insertion', [
        ['Conducteur', 'W', () => ed.setTool('wire')], ['Jonction (connexion)', '', place('connexion')], ['Croisement sans connexion', '', place('croisement')], '-',
        ['Texte', '', place('texte')], ['Titre', '', place('titre')], ['Commentaire', '', place('commentaire')], ['Repère numéroté', '', place('repere')], '-',
        ['Nouvelle feuille', '', addSheet], ['Exemple de circuit…', '', () => H.go('examples')]]],
      ['Simulation', [
        ['▶ Lancer la simulation', '', () => { if (!ed.sim) { $('#b-sim').click(); } }, sim || p.schema === 'architectural'],
        [ed.simPaused ? '▶ Reprendre' : '⏸ Mettre en pause', '', () => ed.pauseSim(), !sim], ['↺ Réinitialiser', '', () => { ed.sim.reset(); ed.render(); }, !sim], ['■ Arrêter', '', () => ed.stopSim(), !sim]]],
      ['Outils', [
        ['✔ Vérifier mon schéma', '', () => H.runVerify()], ['🛠 Réparer automatiquement', '', () => H.repair()], '-',
        ['Calculs électriques', '', () => H.go('calc')], ['Quantitatif et coffret', '', () => H.go('quant')], ['Photovoltaïque', '', () => H.go('pv')], ['Mode pédagogique', '', () => H.go('learn')],
        ...(p.exercise ? [['📝 Corriger mon exercice', '', () => EE.Pedago && EE.Pedago.correctCurrent()]] : [])]],
      ['Aide', [
        ['Mode d\'emploi de l\'atelier', '', () => H.renderProps({ comps: [], wires: [] }) || H.showTab('props')], ['Raccourcis clavier', '', shortcuts], ['Exemples de circuits', '', () => H.go('examples')], ['Cours et exercices', '', () => H.go('learn')], ['À propos', '', about]]],
    ];
  }
  async function renameProject() {
    const { p } = H; const name = await askText('Renommer le projet', 'Nom du projet', p.name); if (!name) return;
    p.name = name; H.flushSave(); St.Projects.edit(p.id, { name, install: p.install, schema: p.schema }); const n = $('#pname'); if (n) n.textContent = name; ui().toast('Projet renommé', 'ok');
  }
  function shortcuts() {
    const K = [['V', 'Outil sélection'], ['W', 'Outil conducteur'], ['R', 'Pivoter de 90°'], ['M', 'Retourner (miroir)'], ['X', 'Inverser le coude du conducteur'], ['Entrée / double-clic', 'Terminer le conducteur'], ['Échap', 'Annuler l\'outil en cours'], ['Suppr', 'Supprimer la sélection'], ['Ctrl+Z / Ctrl+Y', 'Annuler / rétablir'], ['Ctrl+X / C / V', 'Couper / copier / coller'], ['Ctrl+D', 'Dupliquer'], ['Ctrl+A', 'Tout sélectionner'], ['Maj + glisser', 'Sélection par rectangle'], ['Flèches', 'Déplacer la sélection'], ['+ / −, molette, pincer', 'Zoom'], ['Alt + glisser, glisser le fond', 'Déplacer la feuille'], ['Ctrl+S', 'Enregistrer'], ['Ctrl+P', 'Imprimer / PDF']];
    ui().modal({ title: 'Raccourcis clavier', body: `<table class="qt small">${K.map(([k, v]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(v)}</td></tr>`).join('')}</table>`, buttons: [{ label: 'Fermer', cls: 'primary', value: null }] });
  }
  function about() {
    ui().modal({ title: 'À propos', body: `<p><b>Yak-élec-pro V${EE.VERSION}</b> – dessin, vérification, simulation et apprentissage des schémas électriques, quantitatif et photovoltaïque. Fonctionne sans Internet.</p><p class="small muted">Symboles simplifiés d'après la NF EN 60617 (CEI 60617) et usages de la NF C 15-100 : à valider sur les normes en vigueur. La simulation est pédagogique : elle ne remplace jamais la vérification d'une installation réelle par un professionnel qualifié.</p>`, buttons: [{ label: 'Fermer', cls: 'primary', value: null }] });
  }
  let openIdx = -1;
  function renderMenu() {
    const el = $('#mbar'); if (!el || !H) return; const M = menus();
    el.innerHTML = M.map(([t], i) => `<div class="mnu${i === openIdx ? ' open' : ''}"><button class="mtop" data-m="${i}" aria-haspopup="true" aria-expanded="${i === openIdx}">${esc(t)}</button>${i === openIdx ? `<div class="mdrop" role="menu">${M[i][1].map((it, j) => it === '-' ? '<hr>' : `<button class="mitem" role="menuitem" data-mi="${j}"${it[3] ? ' disabled' : ''}><span>${esc(it[0])}</span><kbd>${esc(it[1] || '')}</kbd></button>`).join('')}</div>` : ''}</div>`).join('');
    $$('[data-m]', el).forEach((b) => { b.onclick = (e) => { e.stopPropagation(); openIdx = openIdx === +b.dataset.m ? -1 : +b.dataset.m; renderMenu(); }; b.onmouseenter = () => { if (openIdx >= 0 && openIdx !== +b.dataset.m) { openIdx = +b.dataset.m; renderMenu(); } }; });
    $$('[data-mi]', el).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const it = M[openIdx][1][+b.dataset.mi]; openIdx = -1; renderMenu(); if (it && it[2]) it[2](); }));
  }
  document.addEventListener('click', () => { if (openIdx >= 0) { openIdx = -1; renderMenu(); } });
  document.addEventListener('keydown', (e) => {
    if (!H || EE.app.screen !== 'editor' || !document.getElementById('mbar')) return;
    if (e.key === 'Escape' && openIdx >= 0) { openIdx = -1; renderMenu(); return; }
    const k = (e.key || '').toLowerCase(); if (!(e.ctrlKey || e.metaKey)) return;
    if (k === 's') { e.preventDefault(); H.flushSave(); ui().toast('Projet enregistré', 'ok'); } else if (k === 'p') { e.preventDefault(); printDialog(H.p); } else if (k === 'n') { e.preventDefault(); H.newProject(); }
  });

  // ---------- sous-fenêtres de l'atelier : réduire / agrandir / restaurer (comme les fenêtres Windows) ----------
  const PK = 'eep.panes', PANES = ['pal', 'sheet', 'side'];
  const PT = { pal: 'Symboles', sheet: 'Feuille de dessin', side: 'Panneau' };
  const paneEl = (k) => (k === 'sheet' ? $('#sheetwin') : $('#' + k));
  function paneState() { let s; try { s = JSON.parse(localStorage.getItem(PK) || '{}'); } catch (e) { s = {}; } return s || {}; }
  function savePanes(s) { try { localStorage.setItem(PK, JSON.stringify(s)); } catch (e) { /* stockage indisponible */ } }
  const mobile = () => g.innerWidth < 900;
  function applyPanes() {
    const eb = $('#eb'); if (!eb) return; const st = paneState();
    eb.classList.remove('max-pal', 'max-sheet', 'max-side', 'pal-min', 'sheet-min', 'side-min');
    PANES.forEach((k) => {
      const el = paneEl(k); if (!el) return; const v = st[k] || 'n';
      el.classList.toggle('wmin', v === 'min' && !mobile()); if (v === 'max') eb.classList.add('max-' + k); if (v === 'min' && !mobile()) eb.classList.add(k + '-min');
      const bar = $('.wbar', el), bm = $('[data-w=max]', bar), bn = $('[data-w=min]', bar);
      bm.innerHTML = v === 'max' ? '&#x2750;' : '&#x2610;'; bm.title = v === 'max' ? 'Restaurer' : 'Agrandir'; bm.setAttribute('aria-label', bm.title);
      bn.innerHTML = v === 'min' && !mobile() ? '&#x2610;' : '&#x2015;'; bn.title = v === 'min' && !mobile() ? 'Restaurer' : 'Réduire'; bn.setAttribute('aria-label', bn.title);
      bar.title = v === 'min' ? 'Cliquer pour restaurer « ' + PT[k] + ' »' : 'Double-clic : agrandir / restaurer';
    });
    if (H && H.ed) setTimeout(() => H.ed.render(), 30);
  }
  function setPane(k, v) {
    const st = paneState(); const nv = (st[k] || 'n') === v ? 'n' : v;
    if (nv === 'max') PANES.forEach((o) => { if (st[o] === 'max') st[o] = 'n'; });
    st[k] = nv;
    if (mobile() && v === 'min' && k !== 'sheet') { st[k] = 'n'; const el = paneEl(k); el && el.classList.remove('open'); }
    if (PANES.every((o) => st[o] === 'min')) st.sheet = 'n'; // au moins une fenêtre reste ouverte
    savePanes(st); applyPanes();
  }
  function bindPanes() {
    $$('#eb .wbar').forEach((bar) => {
      const k = bar.dataset.pane;
      $$('.wbtn', bar).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); setPane(k, b.dataset.w); }));
      bar.onclick = () => { if ((paneState()[k] || 'n') === 'min') setPane(k, 'min'); };
      bar.ondblclick = (e) => { if (e.target.closest('.wbtn')) return; setPane(k, 'max'); };
    });
    applyPanes();
  }
  g.addEventListener('resize', () => { if ($('#eb')) applyPanes(); });
  EE.Panes = { set: setPane, state: paneState, apply: applyPanes, reset() { savePanes({}); applyPanes(); } };

  EE.EdMenu = {
    mount(h) { H = h; Sheets.ensure(h.p); openIdx = -1; renderMenu(); renderSheets(); bindPanes(); },
    printDialog, switchSheet, addSheet, renderSheets, get helpers() { return H; },
  };
})(window);
