/* Yak-élec-pro – application : écrans, navigation, boîtes de dialogue */
(function (g) {
  'use strict';
  const EE = g.EE, Lib = EE.Library, St = EE.Store, esc = EE.esc;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LOGO = (s = 34) => `<svg class="logo" width="${s}" height="${s}" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="10" fill="#0b3d6b"/><path d="M27 6 13 27h9l-3 15 16-23h-10z" fill="#ffc83d"/></svg>`;
  const app = { screen: 'home', project: null, editor: null, saveT: null, dirty: false };
  EE.app = app;

  // ---------- utilitaires UI ----------
  function toast(msg, kind = '') { const t = document.createElement('div'); t.className = 'toast ' + kind; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3600); }
  function modal({ title, body, buttons, wide }) {
    return new Promise((res) => {
      const ov = document.createElement('div'); ov.className = 'overlay';
      ov.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="mb">${body}</div><div class="mf">${(buttons || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
      document.body.appendChild(ov);
      const close = (v) => { ov.remove(); res(v); };
      ov.addEventListener('click', (e) => { if (e.target === ov) close(null); const b = e.target.closest('button[data-i]'); if (!b) return; const spec = buttons[+b.dataset.i]; close(spec.value !== undefined ? (typeof spec.value === 'function' ? spec.value(ov) : spec.value) : null); });
      const first = $('input,select', ov); first && first.focus();
      ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(null); if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const ok = $('.btn.primary', ov); ok && ok.click(); } });
    });
  }
  const confirmBox = (title, msg, okLabel = 'Confirmer', danger = true) => modal({ title, body: `<p>${msg}</p>`, buttons: [{ label: 'Annuler', value: false }, { label: okLabel, cls: danger ? 'danger' : 'primary', value: true }] });
  const opts = (arr, sel) => arr.map((a) => `<option value="${esc(a)}"${a === sel ? ' selected' : ''}>${esc(a)}</option>`).join('');
  const schemaOpts = (sel) => Object.entries(EE.SCHEMAS).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v}</option>`).join('');

  async function projectDialog(p, schema0) {
    const r = await modal({
      title: p ? 'Modifier le projet' : 'Nouveau projet',
      body: `<label>Nom du projet<input id="pn" maxlength="80" value="${esc(p ? p.name : '')}" placeholder="Ex. : Éclairage salon – va-et-vient"></label>
        <label>Type d'installation<select id="pi">${opts(EE.INSTALLS, p ? p.install : EE.INSTALLS[0])}</select></label>
        <label>Type de schéma<select id="ps">${schemaOpts(p ? p.schema : schema0 || St.Settings.get().schema || 'developpe')}</select></label><p class="err" id="perr"></p>`,
      buttons: [{ label: 'Annuler', value: null }, { label: p ? 'Enregistrer' : 'Créer le projet', cls: 'primary', value: (ov) => ({ name: $('#pn', ov).value, install: $('#pi', ov).value, schema: $('#ps', ov).value }) }],
    });
    return r;
  }

  // champ mot de passe avec bouton « afficher / masquer »
  const pwField = (id, label, extra = '') => `<label${extra}>${label}<span class="pw"><input id="${id}" type="password" autocomplete="off"><button type="button" class="eye" data-eye="${id}" aria-label="Afficher le mot de passe" aria-pressed="false" title="Afficher / masquer le mot de passe">👁</button></span></label>`;
  function bindEyes(root = document) {
    $$('[data-eye]', root).forEach((b) => (b.onclick = (ev) => {
      ev.preventDefault(); const i = $('#' + b.dataset.eye); const show = i.type === 'password'; i.type = show ? 'text' : 'password';
      b.textContent = show ? '🙈' : '👁'; b.setAttribute('aria-pressed', show); b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); i.focus();
    }));
  }

  // ---------- squelette ----------
  const Cf = () => EE.Config.get();
  const showPortal = (u) => EE.Config.isAdmin(u);
  function shell() {
    EE.Config.apply();
    const u = St.Users.current();
    document.documentElement.dataset.theme = u ? St.Settings.get().theme : 'light';
    if (!u) return renderLogin();
    $('#app').innerHTML = `<header class="top"><div class="brandcol"><a class="brand" data-go="home"><img class="logoimg ico" src="${EE.LOGO_ICON}" alt="Yak-élec" width="38" height="38"><span>${esc(Cf().brand.name1)}<b>${esc(Cf().brand.name2)}</b></span></a><button class="ctab${app.screen === 'contact' ? ' on' : ''}" data-go="contact" title="Me contacter">✉ Contact</button></div>
      <nav>${[['home', 'Accueil'], ['projects', 'Mes projets'], ['library', 'Bibliothèque'], ['editor', 'Atelier'], ['bat', 'Bâtiment'], ['quant', 'Quantitatif'], ['compo', 'Composants'], ['pv', 'Photovoltaïque']].concat(showPortal(u) ? [['portal', 'Portail']] : []).concat([['settings', 'Paramètres']]).map(([k, l]) => `<button class="nav${app.screen === k ? ' on' : ''}" data-go="${k}">${l}</button>`).join('')}</nav>
      <div class="user"><span title="Utilisateur connecté">👤 ${esc(u.name)}</span><button class="btn small" id="logout">Déconnexion</button></div></header>
      <main id="main"></main>`;
    $('#logout').onclick = () => { flushSave(); leaveEditor(); St.Users.logout(); EE.portalUnlocked = false; app.project = null; app.screen = 'home'; shell(); };
    $$('[data-go]').forEach((b) => (b.onclick = () => go(b.dataset.go)));
  }
  function leaveEditor() { flushSave(); if (app.editor) { app.editor.destroy(); app.editor = null; } }
  function go(screen, arg) {
    if (app.screen === 'editor' && screen !== 'editor') leaveEditor();
    app.screen = screen; shell(); if (!St.Users.current()) return;
    (Object.assign({ home: renderHome, projects: renderProjects, library: renderLibrary, editor: () => renderEditor(arg), settings: renderSettings }, EE.Screens || {}))[screen](arg);
  }
  app.go = go;

  // ---------- connexion ----------
  function renderLogin() {
    const users = St.Users.list(); const reg = !users.length;
    $('#app').innerHTML = `<div class="login"><div class="card login-card"><img class="logoimg full" src="${EE.LOGO_FULL}" alt="Yak-élec – Installation &amp; dépannage électrique"><h1 class="sr">${esc(Cf().brand.name1 + Cf().brand.name2)}</h1><p class="muted">${esc(Cf().brand.slogan)}</p><p class="small loginct">${EE.Contact ? EE.Contact.inline() : ''}</p>
      <div class="tabs"><button class="tab${reg ? '' : ' on'}" data-t="in">Connexion</button><button class="tab${reg ? ' on' : ''}" data-t="up">Créer un compte</button></div>
      <form id="lf" autocomplete="off"><label>Nom d'utilisateur<input id="lu" required list="ul"></label><datalist id="ul">${users.map((u) => `<option value="${esc(u.name)}">`).join('')}</datalist>
        ${pwField('lp', 'Mot de passe')}${pwField('lp2', 'Confirmer le mot de passe', ` id="l2" class="${reg ? '' : 'hide'}"`)}
        <p class="err" id="lerr"></p><button class="btn primary big" id="lgo">${reg ? 'Créer mon compte' : 'Se connecter'}</button></form>
      <p class="muted small">Les comptes et projets sont enregistrés <b>sur cet appareil</b> (navigateur). Pensez à exporter vos projets pour les sauvegarder ou les transférer.</p></div></div>`;
    bindEyes($('.login'));
    let up = reg;
    $$('.tab').forEach((b) => (b.onclick = () => { up = b.dataset.t === 'up'; $$('.tab').forEach((x) => x.classList.toggle('on', x === b)); $('#l2').classList.toggle('hide', !up); $('#lgo').textContent = up ? 'Créer mon compte' : 'Se connecter'; $('#lerr').textContent = ''; }));
    $('#lf').onsubmit = (e) => {
      e.preventDefault();
      try {
        if (up) { if ($('#lp').value !== $('#lp2').value) throw new Error('Les deux mots de passe ne correspondent pas.'); St.Users.register($('#lu').value, $('#lp').value); }
        else St.Users.login($('#lu').value, $('#lp').value);
        app.screen = 'home'; go('home');
      } catch (err) { $('#lerr').textContent = err.message; }
    };
  }

  // ---------- accueil ----------
  function renderHome() {
    const u = St.Users.current(), rec = St.Projects.recent(5), n = St.Projects.list().length;
    $('#main').innerHTML = `<div class="page"><section class="hero"><img class="logoimg hero-logo" src="${EE.LOGO_FULL}" alt="Yak-élec"><div><h1>${esc(Cf().brand.name1)}<b>${esc(Cf().brand.name2)}</b></h1><p>Bonjour ${esc(u.name)} – ${esc(Cf().brand.welcome)}</p><button class="btn small ctab2" data-go="contact">✉ Me contacter</button></div></section>
      ${St.raw.persistent ? '' : '<div class="warn">⚠ Le stockage du navigateur est indisponible : exportez vos projets, ils ne seront pas conservés.</div>'}
      <section class="cards">
        <button class="card act" data-a="new"><span class="ic">＋</span><b>Nouveau projet</b><small>Créer un schéma</small></button>
        <button class="card act" data-a="bat"><span class="ic">🏠</span><b>Électricité bâtiment</b><small>Unifilaire, multifilaire, architectural, développé</small></button>
        <button class="card act" data-a="projects"><span class="ic">📁</span><b>Mes projets</b><small>${n} projet${n > 1 ? 's' : ''}</small></button>
        <button class="card act" data-a="library"><span class="ic">🔣</span><b>Bibliothèque de symboles</b><small>${Lib.list.length} symboles</small></button>
        <button class="card act" data-a="editor"><span class="ic">✏️</span><b>Atelier de dessin</b><small>Ouvrir la feuille</small></button>
        <button class="card act" data-a="pv"><span class="ic">☀️</span><b>Photovoltaïque</b><small>Panneaux, batteries, onduleur</small></button>
        <button class="card act" data-a="quant"><span class="ic">🧮</span><b>Quantitatif et coffret</b><small>Matériel, protections, devis</small></button>
        ${showPortal(u) ? '<button class="card act" data-a="portal"><span class="ic">🛠️</span><b>Portail administrateur</b><small>Prix, règles, apparence</small></button>' : ''}
        <button class="card act" data-a="settings"><span class="ic">⚙️</span><b>Paramètres</b><small>Thème, grille, compte</small></button>
      </section>
      <section><h2>Derniers projets ouverts</h2>${rec.length ? `<div class="list">${rec.map((p) => `<button class="row" data-open="${p.id}"><b>${esc(p.name)}</b><span>${esc(EE.SCHEMAS[p.schema])} · ${esc(p.install)}</span><em>${EE.fmtDate(p.opened)}</em></button>`).join('')}</div>` : '<p class="muted">Aucun projet pour le moment. Créez votre premier schéma avec « Nouveau projet ».</p>'}</section></div>`;
    $$('[data-a]').forEach((b) => (b.onclick = () => ({ new: newProject, projects: () => go('projects'), library: () => go('library'), editor: () => go('editor'), settings: () => go('settings'), quant: () => go('quant'), bat: () => go('bat'), pv: () => go('pv'), portal: () => go('portal') })[b.dataset.a]()));
    $$('[data-open]').forEach((b) => (b.onclick = () => go('editor', b.dataset.open)));
  }
  async function newProject(schema) {
    const r = await projectDialog(null, typeof schema === 'string' ? schema : null); if (!r) return;
    try { const p = St.Projects.create(r); go('editor', p.id); } catch (e) { toast(e.message, 'bad'); }
  }
  app.newProject = newProject;

  // ---------- projets ----------
  function renderProjects(filter = '') {
    const l = St.Projects.list().slice().sort((a, b) => b.modified - a.modified).filter((p) => (p.name + p.install).toLowerCase().includes(filter.toLowerCase()));
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>Mes projets</h1><div class="grow"></div><input id="flt" placeholder="Rechercher…" value="${esc(filter)}"><button class="btn" id="imp">Importer…</button><button class="btn primary" id="np">＋ Nouveau projet</button><input type="file" id="impf" accept=".json,.eep,application/json" hidden></div>
      ${l.length ? `<div class="table"><div class="tr th"><span>Nom</span><span>Installation</span><span>Schéma</span><span>Modifié</span><span>Actions</span></div>${l.map((p) => `<div class="tr" data-id="${p.id}"><span><b>${esc(p.name)}</b></span><span>${esc(p.install)}</span><span>${esc(EE.SCHEMAS[p.schema])}</span><span>${EE.fmtDate(p.modified)}</span><span class="acts"><button class="btn small primary" data-a="open">Ouvrir</button><button class="btn small" data-a="edit">Modifier</button><button class="btn small" data-a="dup">Dupliquer</button><button class="btn small" data-a="exp">Exporter</button><button class="btn small danger" data-a="del">Supprimer</button></span></div>`).join('')}</div>` : '<p class="muted">Aucun projet.</p>'}</div>`;
    $('#np').onclick = newProject; $('#flt').oninput = (e) => { renderProjects(e.target.value); const i = $('#flt'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#imp').onclick = () => $('#impf').click();
    $('#impf').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const p = St.Projects.importJSON(await f.text()); toast('Projet importé : ' + p.name, 'ok'); renderProjects(); } catch (err) { toast(err.message, 'bad'); } };
    $$('.tr[data-id] [data-a]').forEach((b) => (b.onclick = async () => {
      const id = b.closest('.tr').dataset.id, p = St.Projects.get(id);
      try {
        if (b.dataset.a === 'open') go('editor', id);
        else if (b.dataset.a === 'edit') { const r = await projectDialog(p); if (r) { St.Projects.edit(id, r); toast('Projet modifié', 'ok'); renderProjects($('#flt').value); } }
        else if (b.dataset.a === 'dup') { St.Projects.duplicate(id); toast('Projet dupliqué', 'ok'); renderProjects($('#flt').value); }
        else if (b.dataset.a === 'exp') EE.Export.run('json', p);
        else if (b.dataset.a === 'del') { if (await confirmBox('Supprimer le projet', `Supprimer définitivement « <b>${esc(p.name)}</b> » ? Cette action est irréversible.`, 'Supprimer')) { St.Projects.remove(id); toast('Projet supprimé', 'ok'); renderProjects($('#flt').value); } }
      } catch (err) { toast(err.message, 'bad'); }
    }));
  }

  // ---------- bibliothèque ----------
  function preview(d, mode, size = 90) {
    const c = { id: 'prev', type: d.id, x: 0, y: 0, rot: 0, label: '', val: d.defVal || '' };
    const [a, b, e, f] = d.bbox; const pad = 14;
    return `<svg viewBox="${a - pad} ${b - pad} ${e - a + 2 * pad} ${f - b + 2 * pad}" width="${size}" height="${size}" class="pv">${EE.Render.compMarkup(c, mode, {})}</svg>`;
  }
  function renderLibrary(cat = 'Tous', q = '', mode = 'developpe') {
    const list = Lib.list.filter((d) => (cat === 'Tous' || d.cat === cat) && (d.name + d.cat + d.desc).toLowerCase().includes(q.toLowerCase()));
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>Bibliothèque de symboles</h1><div class="grow"></div><input id="lq" placeholder="Rechercher un symbole…" value="${esc(q)}"><select id="lm">${schemaOpts(mode)}</select></div>
      <div class="chips">${['Tous', ...Lib.cats].map((c) => `<button class="chip${c === cat ? ' on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
      <div class="libgrid">${list.map((d) => `<button class="sym" data-s="${d.id}">${preview(d, mode)}<b>${esc(d.name)}</b><small>${esc(d.cat)}</small></button>`).join('') || '<p class="muted">Aucun symbole.</p>'}</div>
      <p class="muted small">Symboles redessinés de façon simplifiée d'après les principes de la norme NF EN 60617 (CEI 60617) ; ils ne reproduisent pas les planches de la norme. Pour un dossier officiel, vérifiez les symboles sur la norme en vigueur.</p></div>`;
    $$('.chip').forEach((b) => (b.onclick = () => renderLibrary(b.dataset.c, $('#lq').value, $('#lm').value)));
    $('#lq').oninput = () => { renderLibrary(cat, $('#lq').value, $('#lm').value); const i = $('#lq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#lm').onchange = () => renderLibrary(cat, $('#lq').value, $('#lm').value);
    $$('.sym').forEach((b) => (b.onclick = () => symbolSheet(b.dataset.s)));
  }
  async function symbolSheet(id) {
    const d = Lib.get(id);
    const body = `<div class="fiche"><div class="prevs">${Object.entries(EE.SCHEMAS).map(([k, v]) => `<figure>${preview(d, k, 110)}<figcaption>${v}</figcaption></figure>`).join('')}</div>
      <p>${esc(d.desc)}</p><p><b>À savoir :</b> ${esc(d.notes)}</p><p><b>Catégorie :</b> ${esc(d.cat)}${d.prefix ? ' · <b>Repère usuel :</b> ' + esc(d.prefix) : ''}</p>
      ${d.term.length ? `<table class="mini"><tr><th>Borne</th><th>Rôle dans le moteur</th></tr>${d.term.map((tm) => `<tr><td>${esc(tm.id)}</td><td>${tm.pe ? 'Terre (conseillée)' : (d.loads || []).some((l) => l.includes(tm.id)) ? 'Alimentation du récepteur' : (d.sw || d.pa || []).some((l) => l.includes(tm.id)) ? 'Contact / passage du courant' : Lib.sources({ id: 'x', val: '' }) && d.src ? 'Source de potentiel' : 'Borne'}</td></tr>`).join('')}</table>` : '<p class="muted">Aucune borne (symbole graphique sans effet électrique).</p>'}
      <p class="small muted"><b>Référence documentaire :</b> ${esc(d.ref)}</p></div>`;
    const r = await modal({ title: d.name, body, wide: true, buttons: [{ label: 'Fermer', value: null }, { label: 'Utiliser dans l\'atelier', cls: 'primary', value: 'use' }] });
    if (r === 'use') { if (!app.project) { const rec = St.Projects.recent(1)[0]; if (!rec) { toast('Créez d\'abord un projet.', 'bad'); return; } go('editor', rec.id); } else go('editor'); setTimeout(() => app.editor && app.editor.arm(id), 50); }
  }

  // ---------- atelier ----------
  function flushSave() { if (app.saveT) { clearTimeout(app.saveT); app.saveT = null; } if (app.dirty && app.project) { try { St.Projects.update(app.project); app.dirty = false; setStatus('Enregistré à ' + EE.fmtTime(Date.now())); } catch (e) { setStatus('⚠ ' + e.message); } } }
  function setStatus(t) { const s = $('#sbsave'); if (s) s.textContent = t; }
  function scheduleSave() { app.dirty = true; setStatus('Modifications en cours…'); clearTimeout(app.saveT); app.saveT = setTimeout(() => { app.saveT = null; flushSave(); }, 600); }
  g.addEventListener('pagehide', flushSave); document.addEventListener('visibilitychange', () => { if (document.hidden) flushSave(); });

  function renderEditor(id) {
    let p;
    if (id) { p = St.Projects.get(id); St.Projects.touch(id); }
    else if (app.project) p = app.project;
    else { p = St.Projects.recent(1)[0]; if (p) St.Projects.touch(p.id); }
    if (!p) { $('#main').innerHTML = `<div class="page center"><h1>Atelier de dessin</h1><p class="muted">Aucun projet ouvert. Créez un projet pour commencer à dessiner.</p><button class="btn primary big" id="np2">＋ Nouveau projet</button></div>`; $('#np2').onclick = newProject; return; }
    p = St.Projects.get(p.id); app.project = p; const set = St.Settings.get();
    $('#main').innerHTML = `<div class="ed"><div class="tb">
        <div class="tgrp"><b class="pname" id="pname" title="Nom du projet"></b><span class="badge" id="pbadge"></span></div>
        <div class="tgrp edit"><button class="btn tool on" id="t-select" title="Sélection (V)">⬉ Sélection</button><button class="btn tool" id="t-wire" title="Conducteur (W)">╱ Conducteur</button></div>
        <div class="tgrp edit"><button class="btn" id="b-rot" title="Rotation 90° (R)">⟳ Rotation</button><button class="btn" id="b-copy" title="Copier (Ctrl+C)">Copier</button><button class="btn" id="b-paste" title="Coller (Ctrl+V)">Coller</button><button class="btn" id="b-dup" title="Dupliquer (Ctrl+D)">Dupliquer</button><button class="btn" id="b-del" title="Supprimer (Suppr)">Supprimer</button></div>
        <div class="tgrp edit"><button class="btn" id="b-undo" title="Annuler (Ctrl+Z)">↶ Annuler</button><button class="btn" id="b-redo" title="Rétablir (Ctrl+Y)">↷ Rétablir</button></div>
        <div class="tgrp zgrp"><button class="btn" id="b-zo" title="Réduire la feuille (zoom arrière)">−</button><input type="range" id="b-zr" min="20" max="400" step="5" value="100" title="Agrandir / réduire la feuille" aria-label="Zoom de la feuille"><button class="btn" id="b-zi" title="Agrandir la feuille (zoom avant)">+</button><button class="btn" id="b-z100" title="Revenir à 100 %">100 %</button><button class="btn" id="b-fit" title="Ajuster la vue au dessin">Ajuster</button><button class="btn" id="b-full" title="Plein écran du dessin (Échap pour quitter)">⛶ Plein écran</button><label class="chk"><input type="checkbox" id="b-grid" ${set.grid ? 'checked' : ''}>Grille</label></div>
        <div class="tgrp"><select id="b-mode" title="Type de schéma">${schemaOpts(p.schema)}</select></div>
        <div class="tgrp"><button class="btn" id="b-fix" title="Corriger automatiquement les problèmes de raccordement">🛠 Réparer</button><button class="btn primary" id="b-verify">✔ Vérifier mon schéma</button><button class="btn simbtn" id="b-sim" aria-pressed="false" title="Tester le fonctionnement : lampes, moteurs, contacteurs">▶ Simuler</button>
          <select id="b-exp" title="Exporter"><option value="">Exporter…</option><option value="pdf">PDF</option><option value="svg">SVG</option><option value="png">PNG</option><option value="json">Projet (.json)</option></select></div>
        <div class="tgrp mobbtn"><button class="btn" id="m-pal">Symboles</button><button class="btn" id="m-side">Panneau</button></div>
      </div>
      <div class="eb"><aside class="pal" id="pal"><input id="pq" placeholder="Filtrer les symboles…"><div id="pitems"></div></aside><div class="split" id="sp-pal" title="Glisser pour élargir ou réduire la liste des symboles"></div>
        <div class="sheetwrap"><div class="simbar hide" id="simbar">▶ SIMULATION – cliquez sur les interrupteurs, boutons-poussoirs et appareils pour les actionner (le bouton-poussoir reste fermé tant que vous appuyez).</div><svg id="sheet" tabindex="0" xmlns="${'http://www.w3.org/2000/svg'}"></svg></div>
        <div class="split" id="sp-side" title="Glisser pour élargir ou réduire le panneau"></div><aside class="side" id="side"><div class="tabs"><button class="tab on" data-p="props">Propriétés</button><button class="tab" data-p="report">Rapport</button><button class="tab hide" data-p="sim">Simulation</button></div><div id="pprops"></div><div id="preport" class="hide"></div><div id="psim" class="hide"></div></aside></div>
      <div class="sb"><span id="sbpos">x : –  y : –</span><span id="sbtool">Outil : sélection</span><span id="sbzoom"></span><span class="grow"></span><span id="sbsave">Enregistré</span></div></div>`;
    $('#pname').textContent = p.name; $('#pbadge').textContent = EE.SCHEMAS[p.schema] + ' · ' + p.install;
    renderPalette();
    const ed = app.editor = EE.Editor.create({
      svg: $('#sheet'), project: p, settings: set,
      isActive: () => app.screen === 'editor',
      onChange: () => { scheduleSave(); updateHist(); },
      onSelect: renderProps, onHistory: updateHist,
      onTool: (t, a) => { $('#t-select').classList.toggle('on', t === 'select'); $('#t-wire').classList.toggle('on', t === 'wire'); $('#sbtool').textContent = 'Outil : ' + (t === 'place' ? 'placer « ' + (Lib.get(a) || {}).name + ' »' : t === 'wire' ? 'conducteur (clic = point, double-clic ou Entrée = fin)' : 'sélection'); $$('.pitem').forEach((b) => b.classList.toggle('on', b.dataset.s === a)); },
      onPointer: (pt) => { $('#sbpos').textContent = `x : ${pt[0] / EE.G}  y : ${pt[1] / EE.G}`; },
      onMarker: (id, pt) => showMarkerPop(id, pt), onView: (v) => { $('#sbzoom').textContent = 'Zoom ' + Math.round(v.k * 100) + ' %'; syncZoom(v.k); scheduleSave(); },
      onSim: (on) => { $('.ed').classList.toggle('simon', on); $('#simbar').classList.toggle('hide', !on); $('#b-sim').classList.toggle('on', on); $('#b-sim').setAttribute('aria-pressed', on); $('#b-sim').textContent = on ? '■ Arrêter la simulation' : '▶ Simuler'; $('#side .tab[data-p=sim]').classList.toggle('hide', !on); if (on) { showTab('sim'); $('#side').classList.add('open'); } else showTab('props'); },
      onSimTick: (s) => renderSimPanel(s), onSimChange: (s) => renderSimPanel(s),
      onEditRequest: () => { const i = $('#f-label'); i && (i.focus(), i.select()); },
    });
    $('#sbzoom').textContent = 'Zoom ' + Math.round(ed.view.k * 100) + ' %';
    if (p.doc.comps.length || p.doc.wires.length) { if (!p.view || p.view.k === 1 && p.view.x === 80 && p.view.y === 80) setTimeout(() => ed.fit(), 30); }
    function updateHist() { $('#b-undo').disabled = !ed.canUndo; $('#b-redo').disabled = !ed.canRedo; }
    updateHist(); renderProps({ comps: [], wires: [] });
    const B = (id, f) => ($('#' + id).onclick = f);
    B('t-select', () => ed.setTool('select')); B('t-wire', () => ed.setTool('wire'));
    B('b-rot', () => ed.rotate()); B('b-copy', () => { ed.copy() ? toast('Copié') : toast('Rien à copier', 'bad'); }); B('b-paste', () => ed.paste()); B('b-dup', () => ed.duplicate()); B('b-del', () => ed.del());
    B('b-undo', () => ed.undo()); B('b-redo', () => ed.redo()); B('b-zo', () => ed.zoomOut()); B('b-zi', () => ed.zoomIn()); B('b-fit', () => ed.fit());
    $('#b-grid').onchange = (e) => { St.Settings.set({ grid: e.target.checked }); ed.setSettings({ grid: e.target.checked }); };
    $('#b-mode').onchange = (e) => { p.schema = e.target.value; ed.setMode(p.schema); applyModeUI(p.schema); $('#pbadge').textContent = EE.SCHEMAS[p.schema] + ' · ' + p.install; scheduleSave(); };
    B('b-verify', () => runVerify()); B('b-fix', repair); applyModeUI(p.schema);
    B('b-sim', () => { if (ed.sim) ed.stopSim(); else { ed.startSim(); renderSimPanel(ed.sim); } });
    $('#b-exp').onchange = async (e) => { const k = e.target.value; e.target.value = ''; if (!k) return; flushSave(); try { await EE.Export.run(k, p); toast('Export ' + k.toUpperCase() + ' prêt', 'ok'); } catch (err) { toast(err.message, 'bad'); } };
    $('#pq').oninput = renderPalette;
    $$('#side .tab').forEach((b) => (b.onclick = () => showTab(b.dataset.p)));
    const syncZoom = (k) => { const r = $('#b-zr'); if (r) r.value = Math.round(k * 100); const b = $('#b-z100'); if (b) b.textContent = Math.round(k * 100) + ' %'; };
    syncZoom(ed.view.k);
    $('#b-zr').oninput = (e) => ed.setZoom(+e.target.value / 100); B('b-z100', () => ed.setZoom(1));
    const setFull = (on) => { document.body.classList.toggle('yk-full', on); $('#b-full').textContent = on ? '✕ Quitter le plein écran' : '⛶ Plein écran'; setTimeout(() => ed.fit && ed.fit(), 60); };
    B('b-full', () => setFull(!document.body.classList.contains('yk-full')));
    if (!app._fullKey) { app._fullKey = true; document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('yk-full')) { const b = document.getElementById('b-full'); if (b) b.click(); else document.body.classList.remove('yk-full'); } }); }
    document.body.classList.remove('yk-full');
    // panneaux redimensionnables (largeurs mémorisées)
    const PW = (() => { try { return JSON.parse(localStorage.getItem('eep.panelw') || '{}'); } catch (e) { return {}; } })();
    const applyW = () => { if (PW.pal) $('#pal').style.width = PW.pal + 'px'; if (PW.side) $('#side').style.width = PW.side + 'px'; };
    applyW();
    const drag = (id, key, sign, min, max) => {
      const h = $('#' + id); if (!h) return;
      h.onpointerdown = (e) => {
        e.preventDefault(); h.setPointerCapture(e.pointerId); const target = $(key === 'pal' ? '#pal' : '#side'), x0 = e.clientX, w0 = target.getBoundingClientRect().width;
        const mv = (ev) => { const w = Math.max(min, Math.min(max, w0 + sign * (ev.clientX - x0))); target.style.width = w + 'px'; PW[key] = Math.round(w); };
        const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); try { localStorage.setItem('eep.panelw', JSON.stringify(PW)); } catch (e) { /* stockage indisponible */ } if (ed.fit) { /* garde la vue */ } };
        h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
      };
      h.ondblclick = () => { delete PW[key]; const t = $(key === 'pal' ? '#pal' : '#side'); t.style.width = ''; try { localStorage.setItem('eep.panelw', JSON.stringify(PW)); } catch (e) { /* ok */ } };
    };
    drag('sp-pal', 'pal', 1, 140, 480); drag('sp-side', 'side', -1, 200, 700);
    B('m-pal', () => $('#pal').classList.toggle('open')); B('m-side', () => $('#side').classList.toggle('open'));
    setStatus('Enregistré'); $('#sheet').focus();
  }
  function showTab(t) { $$('#side .tab').forEach((x) => x.classList.toggle('on', x.dataset.p === t)); $('#pprops').classList.toggle('hide', t !== 'props'); $('#preport').classList.toggle('hide', t !== 'report'); $('#psim').classList.toggle('hide', t !== 'sim'); }
  function renderSimPanel(sim) {
    const el = $('#psim'); if (!el || !sim || !sim.view) return; const v = sim.view;
    const grp = (title, cls) => { const l = v.items.filter((i) => cls.includes(i.cls)); return l.length ? `<h4>${title}</h4>` + l.map((i) => `<div class="sitem ${i.on ? 'on' : ''} ${i.cls}"><span class="dot"></span><div><b>${esc(i.label || i.name)}</b> <small>${esc(i.name)}</small><br>${esc(i.text)}</div></div>`).join('') : ''; };
    el.innerHTML = `<h3>Simulation en cours</h3><p class="small muted">Cliquez sur les appareils du schéma. Un bouton-poussoir reste fermé tant que vous maintenez le clic.</p>` +
      (v.alerts.length ? v.alerts.map((m) => `<div class="rep bad">⚠ ${esc(m)}</div>`).join('') : '') + (v.log.length ? v.log.map((m) => `<div class="rep warn">⚡ ${esc(m)}</div>`).join('') : '') +
      grp('Récepteurs', ['load', 'motor']) + grp('Bobines et contacteurs', ['coil']) + grp('Protections', ['trip', 'dev']) +
      `<div class="btnrow"><button class="btn" id="s-reset">↺ Réinitialiser</button><button class="btn danger" id="s-stop">■ Arrêter</button></div>`;
    $('#s-reset').onclick = () => { sim.reset(); app.editor.render(); renderSimPanel(sim); }; $('#s-stop').onclick = () => app.editor.stopSim();
  }
  function renderPalette() {
    const q = ($('#pq') ? $('#pq').value : '').toLowerCase(); let h = '';
    const arch = (app.project || {}).schema === 'architectural';
    Lib.cats.forEach((c) => {
      if (arch ? c !== 'Plan architectural' : c === 'Plan architectural') return;
      const items = Lib.list.filter((d) => d.cat === c && (d.name + d.id).toLowerCase().includes(q)); if (!items.length) return;
      h += `<h4>${c}</h4>` + items.map((d) => `<button class="pitem" data-s="${d.id}" title="${esc(d.name)}">${preview(d, (app.project || {}).schema || 'developpe', 34)}<span>${esc(d.name)}</span></button>`).join('');
    });
    $('#pitems').innerHTML = h;
    $$('.pitem').forEach((b) => (b.onclick = () => { app.editor && app.editor.arm(b.dataset.s); if (g.innerWidth < 900) $('#pal').classList.remove('open'); }));
    if (app.editor && app.editor.armed) $$('.pitem').forEach((b) => b.classList.toggle('on', b.dataset.s === app.editor.armed));
  }
  function renderProps(selection) {
    const el = $('#pprops'); if (!el) return; const ed = app.editor || { doc: app.project.doc }, p = app.project;
    const cs = selection.comps, ws = selection.wires;
    if (cs.length === 1 && !ws.length) {
      const c = cs[0], d = Lib.get(c.type);
      el.innerHTML = `<h3>${esc(d.name)}</h3><p class="small muted">${esc(d.desc)}</p>
        ${['connexion', 'croisement', 'terre', 'neutre'].includes(c.type) ? '' : c.type === 'phase' ? `<label>Phase<select id="f-val">${opts(['L1', 'L2', 'L3'], c.val)}</select></label>` : `<label>Identification (repère)<input id="f-label" value="${esc(c.label)}" placeholder="${esc(d.prefix || '')}1"></label><label>Valeur / calibre<input id="f-val" value="${esc(c.val || '')}" placeholder="ex. 16 A, 60 W…"></label>`}
        <p class="small">Position : (${c.x / EE.G}, ${c.y / EE.G}) · Rotation : ${c.rot || 0}°</p>
        <div class="btnrow"><button class="btn" id="f-rot">⟳ Pivoter</button><button class="btn danger" id="f-del">Supprimer</button><button class="btn" id="f-fiche">Fiche</button></div>`;
      const lab = $('#f-label'), val = $('#f-val');
      if (lab) lab.onchange = () => ed.updateSelected({ label: lab.value.trim() });
      if (val) val.onchange = () => ed.updateSelected({ val: val.value });
      $('#f-rot').onclick = () => ed.rotate(); $('#f-del').onclick = () => ed.del(); $('#f-fiche').onclick = () => symbolSheet(c.type);
    } else if (ws.length === 1 && !cs.length) {
      const w = ws[0];
      if (p.schema === 'architectural') { el.innerHTML = `<h3>Mur</h3><p class="small muted">${w.pts.length} points. Supprimez-le avec Suppr, déplacez-le en sélectionnant puis en tirant.</p>`; return; }
      el.innerHTML = `<h3>Conducteur</h3><p class="small muted">${w.pts.length} points. En schéma unifilaire, indiquez le nombre total de conducteurs (PE compris) et la désignation du câble (ex. 3G1,5).</p>
        <label>Nombre de conducteurs<input id="f-n" type="number" min="1" max="8" value="${w.n || 1}"></label><label>Désignation<input id="f-d" value="${esc(w.desig || '')}" placeholder="3G1,5 ou 2x1,5"></label>
        <div class="btnrow"><button class="btn danger" id="f-del">Supprimer</button></div>`;
      $('#f-n').onchange = () => ed.updateSelected({ n: $('#f-n').value }); $('#f-d').onchange = () => ed.updateSelected({ desig: $('#f-d').value.trim() });
      $('#f-del').onclick = () => ed.del();
    } else if (cs.length + ws.length > 1) {
      el.innerHTML = `<h3>${cs.length} composant(s), ${ws.length} conducteur(s)</h3><div class="btnrow"><button class="btn" id="f-rot">⟳ Pivoter</button><button class="btn" id="f-dup">Dupliquer</button><button class="btn danger" id="f-del">Supprimer</button></div>`;
      $('#f-rot').onclick = () => ed.rotate(); $('#f-dup').onclick = () => ed.duplicate(); $('#f-del').onclick = () => ed.del();
    } else {
      const doc = ed.doc;
      el.innerHTML = `<h3>${esc(p.name)}</h3><p class="small">${esc(EE.SCHEMAS[p.schema])} · ${esc(p.install)}<br>${doc.comps.length} composant(s) · ${doc.wires.length} conducteur(s)</p>
        <h4>Mode d'emploi</h4><ol class="howto"><li>Choisissez un symbole dans la liste de gauche, puis cliquez sur la feuille pour le déposer.</li><li>Outil <b>Conducteur</b> : cliquez sur une borne, puis sur les points suivants ; terminez sur une autre borne (ou double-clic).</li><li>Pour une dérivation, terminez sur un conducteur existant : une <b>jonction</b> est ajoutée.</li><li>Un simple croisement <b>n'est pas</b> une connexion.</li><li>Cliquez sur <b>Vérifier mon schéma</b> pour obtenir le rapport.</li></ol>
        <p class="small muted">Raccourcis : V sélection · W conducteur · R pivoter · X coude H/V · Suppr · Ctrl+Z/Y · Ctrl+C/V/D · Échap.</p>`;
    }
  }
  function applyModeUI(mode) {
    const arch = mode === 'architectural';
    $('#t-wire').textContent = arch ? '▬ Mur' : '╱ Conducteur'; $('#t-wire').title = arch ? 'Tracer un mur (W)' : 'Conducteur (W)';
    $('#b-verify').textContent = arch ? '📋 Bilan du plan' : '✔ Vérifier mon schéma'; $('#b-sim').classList.toggle('hide', arch);
    if (arch && app.editor && app.editor.sim) app.editor.stopSim();
    renderPalette();
  }
  // bilan d'un plan architectural : décompte des équipements et longueur des murs
  function planBilan() {
    const doc = app.editor.doc, by = {};
    doc.comps.forEach((c) => { const d = Lib.get(c.type); if (!d || !d.plan || c.type === 'p_etiquette') return; (by[d.id] = by[d.id] || { d, n: 0 }).n++; });
    const rows = Object.values(by).sort((a, b) => Lib.list.indexOf(a.d) - Lib.list.indexOf(b.d));
    const rooms = doc.comps.filter((c) => c.type === 'p_etiquette').map((c) => c.val).filter(Boolean);
    let len = 0; doc.wires.forEach((w) => { for (let i = 1; i < w.pts.length; i++) len += Math.abs(w.pts[i][0] - w.pts[i - 1][0]) + Math.abs(w.pts[i][1] - w.pts[i - 1][1]); });
    return { rows, rooms, wallM: Math.round(len / EE.G * 25) / 100, total: rows.reduce((a, r) => a + r.n, 0) };
  }
  app.planBilan = planBilan;
  function runPlanBilan() {
    const el = $('#preport'); showTab('report'); $('#side').classList.add('open'); const b = planBilan();
    el.innerHTML = `<h3>Bilan du plan</h3>${b.total || b.wallM ? `<div class="rep ok">${b.total} équipement(s) – murs : ${String(b.wallM).replace('.', ',')} m – ${b.rooms.length} pièce(s) nommée(s)</div>` : '<div class="rep info">Plan vide : tracez les murs puis placez les équipements.</div>'}
      ${b.rows.length ? `<table class="mini"><thead><tr><th>Équipement</th><th>Quantité</th></tr></thead><tbody>${b.rows.map((r) => `<tr><td>${esc(r.d.name)}</td><td>${r.n}</td></tr>`).join('')}</tbody></table>` : ''}
      ${b.rooms.length ? `<p class="small"><b>Pièces :</b> ${b.rooms.map(esc).join(', ')}</p>` : ''}
      <p class="small muted">Échelle : 1 carreau = 25 cm. Ce bilan compte les symboles placés ; la conformité à la NF C 15-100 (nombre de prises, circuits, protections) reste à vérifier pièce par pièce sur la norme en vigueur. Le menu Quantitatif calcule le matériel et le coffret.</p>`;
    app.lastReport = null;
  }
  // bulle sur la feuille : clic sur un repère d'erreur → explication + bouton de correction automatique
  function closeMarkerPop() { const o = document.getElementById('mkpop'); if (o) o.remove(); }
  function showMarkerPop(id, pt) {
    closeMarkerPop(); const ed = app.editor; if (!ed) return;
    const r = EE.Engine.verify(ed.doc), iss = r.issues.find((x) => x.id === id); if (!iss) return;
    const acts = EE.Fixer.suggest(ed.doc).actions.filter((a) => a.issueId === id);
    const wrap = document.querySelector('.sheetwrap'); if (!wrap) return; const wr = wrap.getBoundingClientRect();
    const o = document.createElement('div'); o.id = 'mkpop'; o.className = iss.sev;
    o.innerHTML = `<button class="mkx" aria-label="Fermer">×</button><b>${iss.sev === 'error' ? '⛔' : '⚠️'} ${esc(iss.title || 'Anomalie')}</b><p>${esc(iss.msg)}</p>${iss.fix ? `<p class="mkfix"><u>🛠 Comment corriger :</u> ${esc(iss.fix)}</p>` : ''}
      <div class="mkb">${acts.length ? acts.map((a, k) => `<button class="btn ${a.safe ? 'primary' : ''}" data-k="${k}">${a.safe ? '🛠 Corriger automatiquement' : '⚠ ' + esc(a.label)}${a.safe ? '<small>' + esc(a.label) + '</small>' : ''}</button>`).join('') : '<p class="small muted">Pas de correction automatique pour ce cas : suivez le conseil ci-dessus.</p>'}</div>`;
    wrap.appendChild(o);
    const w = o.offsetWidth, h = o.offsetHeight; o.style.left = Math.max(6, Math.min(wr.width - w - 6, pt.x - wr.left + 14)) + 'px'; o.style.top = Math.max(6, Math.min(wr.height - h - 6, pt.y - wr.top + 14)) + 'px';
    o.querySelector('.mkx').onclick = closeMarkerPop; o.onpointerdown = (e) => e.stopPropagation();
    $$('#mkpop .mkb button').forEach((b) => (b.onclick = async () => {
      const a = acts[+b.dataset.k]; if (!a) return;
      if (!a.safe && !(await confirmBox('Corriger', a.label + '. ' + (a.why || ''), 'Corriger'))) return;
      ed.mutate((d) => a.apply(d)); closeMarkerPop(); ed.verify();
      if (!$('#preport').classList.contains('hide')) runVerify(); toast('Corrigé : ' + a.label, 'ok');
    }));
  }
  function repair() {
    if ((app.project || {}).schema === 'architectural') return toast('Pas de raccordement à réparer sur un plan architectural', 'info');
    const ed = app.editor; let done = [];
    ed.mutate((d) => { done = EE.Fixer.autoFix(d); });
    runVerify(done);
  }
  function runVerify(done) {
    if ((app.project || {}).schema === 'architectural') return runPlanBilan();
    const ed = app.editor; const r = ed.verify(); const sug = EE.Fixer.suggest(ed.doc), actOf = {}; sug.actions.forEach((a) => { (actOf[a.issueId] = actOf[a.issueId] || []).push(a); }); const safeN = new Set(sug.actions.filter((a) => a.safe).map((a) => a.issueId)).size; const el = $('#preport'); showTab('report'); $('#side').classList.add('open');
    const sevIc = { error: '⛔', warning: '⚠️', info: 'ℹ️' };
    let head;
    if (r.empty) head = '<div class="rep info">Feuille vide : placez des symboles et des conducteurs avant de vérifier.</div>';
    else if (!r.issues.length) head = `<div class="rep ok">✅ Aucune anomalie détectée (${r.stats.comps} composants, ${r.stats.wires} conducteurs, ${r.stats.nets} réseaux).</div>`;
    else head = `<div class="rep ${r.ok ? 'warn' : 'bad'}">${r.stats.errors} erreur(s), ${r.stats.warnings} avertissement(s)</div>`;
    const doneHtml = done && done.length ? `<div class="rep ok">🛠 ${done.length} correction(s) appliquée(s) (Ctrl+Z pour annuler) :<ul class="small">${done.map((x) => '<li>' + esc(x) + '</li>').join('')}</ul></div>` : (done ? '<div class="rep info">🛠 Aucune correction automatique possible : suivez les conseils « Comment corriger » ci-dessous.</div>' : '');
    const fixAll = safeN ? `<button class="btn primary" id="fixall">🛠 Corriger automatiquement (${safeN} correction${safeN > 1 ? 's' : ''} sûre${safeN > 1 ? 's' : ''})</button>` : '';
    el.innerHTML = `<h3>Rapport de vérification</h3>${doneHtml}${head}${fixAll}<ol class="issues">${r.issues.slice().sort((a, b) => (a.sev === 'error' ? 0 : 1) - (b.sev === 'error' ? 0 : 1) || a.id - b.id).map((i) => `<li class="${i.sev}" data-i="${i.id}"><span class="n">${i.id}</span><div><b class="ititle">${sevIc[i.sev]} ${esc(i.title || (i.sev === 'error' ? 'Erreur' : 'Avertissement'))}</b><span class="imsg"><u>Problème :</u> ${esc(i.msg)}</span>${i.fix ? `<span class="ifix"><u>🛠 Comment corriger :</u> ${esc(i.fix)}</span>` : ''}${(actOf[i.id] || []).map((a, k) => `<button class="btn small fixbtn ${a.safe ? 'primary' : ''}" data-fix="${i.id}:${k}" title="${esc(a.why || '')}">${a.safe ? '🛠' : '⚠'} ${esc(a.label)}</button>`).join('')}<small>${i.x || i.y ? 'Repère n°' + i.id + ' sur la feuille – position (' + i.x / EE.G + ', ' + i.y / EE.G + ') – cliquez ici pour l\'afficher' : ''}</small></div></li>`).join('')}</ol>
      <p class="small muted">Les repères numérotés sont affichés sur la feuille ; cliquez sur une ligne pour les localiser. La vérification porte sur la connectivité (V1) ; elle ne remplace pas un contrôle de conformité complet.</p><button class="btn" id="rclear">Masquer les repères</button>`;
    $$('.fixbtn').forEach((b) => (b.onclick = async (e) => { e.stopPropagation(); const [id, k] = b.dataset.fix.split(':').map(Number), a = (actOf[id] || [])[k]; if (!a) return; if (!a.safe && !(await confirmBox('Corriger', a.label + '. ' + (a.why || ''), 'Corriger'))) return; ed.mutate((d) => a.apply(d)); runVerify([a.label]); }));
    if ($('#fixall')) $('#fixall').onclick = repair;
    $$('.issues li').forEach((li) => (li.onclick = () => { ed.focusIssue(+li.dataset.i); $$('.issues li').forEach((x) => x.classList.toggle('on', x === li)); }));
    $('#rclear').onclick = () => ed.clearMarkers();
    app.lastReport = r;
  }

  // ---------- paramètres ----------
  function renderSettings() {
    const s = St.Settings.get(), u = St.Users.current();
    $('#main').innerHTML = `<div class="page narrow"><h1>Paramètres</h1>
      <section class="card flat"><h2>Affichage</h2><label class="chk"><input type="checkbox" id="s-dark" ${s.theme === 'dark' ? 'checked' : ''}> Thème sombre</label>
        <label class="chk"><input type="checkbox" id="s-grid" ${s.grid ? 'checked' : ''}> Afficher la grille dans l'atelier</label>
        <label class="chk"><input type="checkbox" id="s-auto" ${s.autolabel ? 'checked' : ''}> Identifier automatiquement les nouveaux composants (S1, H1, Q1…)</label>
        <label class="chk"><input type="checkbox" id="s-term" ${s.terminalMarks ? 'checked' : ''}> Marquer les bornes (orange = libre, vert = reliée)</label></section>
      <section class="card flat"><h2>Compte : ${esc(u.name)}</h2>${pwField('pw0', 'Ancien mot de passe')}${pwField('pw1', 'Nouveau mot de passe')}<p class="err" id="pwerr"></p>
        <div class="btnrow"><button class="btn" id="pwgo">Changer le mot de passe</button><button class="btn danger" id="delacc">Supprimer mon compte et mes projets</button></div></section>
      <section class="card flat"><h2>À propos</h2><p>Yak-élec-pro V${EE.VERSION} – données enregistrées localement sur cet appareil (${St.raw.persistent ? 'stockage actif' : 'stockage indisponible'}). ${St.Projects.list().length} projet(s).</p></section></div>`;
    bindEyes($('.page'));
    const bind = (id, k, f) => ($('#' + id).onchange = (e) => { St.Settings.set({ [k]: f(e.target) }); if (k === 'theme') document.documentElement.dataset.theme = St.Settings.get().theme; });
    bind('s-dark', 'theme', (t) => (t.checked ? 'dark' : 'light')); bind('s-grid', 'grid', (t) => t.checked); bind('s-auto', 'autolabel', (t) => t.checked); bind('s-term', 'terminalMarks', (t) => t.checked);
    $('#pwgo').onclick = () => { try { St.Users.changePassword($('#pw0').value, $('#pw1').value); toast('Mot de passe modifié', 'ok'); $('#pw0').value = $('#pw1').value = ''; $('#pwerr').textContent = ''; } catch (e) { $('#pwerr').textContent = e.message; } };
    $('#delacc').onclick = async () => { if (await confirmBox('Supprimer le compte', `Supprimer le compte « <b>${esc(u.name)}</b> » et tous ses projets ? Action irréversible.`, 'Tout supprimer')) { St.Users.remove(u.id); app.project = null; app.screen = 'home'; shell(); } };
  }

  g.addEventListener('DOMContentLoaded', () => { app.screen = 'home'; shell(); if (St.Users.current()) renderHome(); });
  app.toast = toast; app.modal = modal; app.ui = { symbol: (id, size) => { const d = id && Lib.get(id); return d ? preview(d, 'developpe', size || 40) : ''; }, modal, toast, confirmBox, pwField, bindEyes, $, $$, flushSave };
})(window);
