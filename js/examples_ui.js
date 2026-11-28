/* Yak-élec-pro V1.10 – écran « Exemples de circuits » : fiches pédagogiques (schéma, composants, fonctionnement, étapes, exercices) */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => EE.app.ui;

  function docSvg(doc, schema, maxH) {
    const b = EE.Render.bounds(doc), pad = 24, w = b.x2 - b.x1 + 2 * pad, h = b.y2 - b.y1 + 2 * pad;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x1 - pad} ${b.y1 - pad} ${w} ${h}" style="color:#111;${maxH ? 'max-height:' + maxH + 'px;' : ''}width:100%">${EE.Render.docMarkup(doc, schema, { hit: false })}</svg>`;
  }
  EE.docSvg = docSvg;

  function openInEditor(ex, asName) {
    const p = EE.Store.Projects.create({ name: asName || 'Exemple – ' + ex.title, install: ex.theme === 'Industriel' ? 'Industriel' : 'Enseignement / atelier', schema: ex.schema });
    p.doc = ex.build(); p.example = ex.id; EE.Store.Projects.update(p); ui().toast('Projet créé à partir de l\'exemple', 'ok'); EE.app.go('editor', p.id);
  }

  function list(filter = 'Tous') {
    const L = EE.Examples.list.filter((e) => filter === 'Tous' || e.theme === filter || e.level === filter);
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>📚 Exemples de circuits</h1></div>
      <p class="muted">${EE.Examples.list.length} circuits prêts à l'emploi : chacun contient le schéma, la liste des composants, le fonctionnement, les étapes de réalisation et des exercices. Ouvrez-en un dans l'atelier pour le modifier et le simuler.</p>
      <div class="chips">${['Tous', 'Bâtiment', 'Industriel', 'Débutant', 'Intermédiaire', 'Avancé'].map((f) => `<button class="chip${f === filter ? ' on' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
      <div class="exgrid">${L.map((e) => `<section class="card flat excard"><div class="prev">${docSvg(e.build(), e.schema, 146)}</div><h3>${esc(e.title)}</h3><div class="chips" style="margin:0"><span class="lvl">${esc(e.level)}</span><span class="lvl">${esc(e.theme)}</span><span class="lvl">${esc(EE.SCHEMAS[e.schema])}</span></div>
        <div class="btnrow"><button class="btn primary" data-ex="${e.id}">Voir la fiche</button><button class="btn" data-open="${e.id}">Ouvrir dans l'atelier</button></div></section>`).join('')}</div></div>`;
    $$('[data-f]').forEach((b) => (b.onclick = () => list(b.dataset.f)));
    $$('[data-ex]').forEach((b) => (b.onclick = () => detail(b.dataset.ex)));
    $$('[data-open]').forEach((b) => (b.onclick = () => openInEditor(EE.Examples.get(b.dataset.open))));
  }

  function detail(id) {
    const e = EE.Examples.get(id), doc = e.build(), comps = EE.Examples.components(doc);
    $('#main').innerHTML = `<div class="page exdetail"><div class="bar no-print"><button class="btn" id="exback">← Tous les exemples</button><div class="grow"></div><button class="btn" id="extest">▶ Tester le fonctionnement</button><button class="btn" id="exprint">🖨 Imprimer la fiche</button><button class="btn" id="exexo">📝 En faire un exercice</button><button class="btn primary" id="exopen">Ouvrir dans l'atelier</button></div>
      <h1>${esc(e.title)}</h1><div class="chips"><span class="lvl">${esc(e.level)}</span><span class="lvl">${esc(e.theme)}</span><span class="lvl">${esc(EE.SCHEMAS[e.schema])}</span></div>
      <section class="card flat"><div class="bar"><h2>1. Schéma</h2><div class="grow"></div><div class="btnrow no-print exzoom" style="margin:0"><button class="btn small" id="exzo" title="Réduire">−</button><button class="btn small" id="exzfit" title="Voir tout le schéma">Tout voir</button><button class="btn small" id="exzi" title="Agrandir">+</button><button class="btn small" id="exfull" title="Afficher le schéma en plein écran">⛶ Plein écran</button></div></div><div class="prev fitall" id="exprev">${docSvg(doc, e.schema)}</div><p class="small muted no-print">Le schéma est affiché en entier. Utilisez + / − pour zoomer (puis faites défiler), ou « Plein écran » pour l'agrandir sur tout l'écran (Échap pour revenir).</p><div id="exres"></div></section>
      <section class="card flat"><h2>2. Liste des composants</h2><div class="qwrap"><table class="qt"><thead><tr><th>Repère</th><th>Composant</th><th class="r">Qté</th><th>Caractéristique</th></tr></thead><tbody>${comps.map((c) => `<tr><td><b>${esc(c.labels.join(', '))}</b></td><td>${esc(c.name)}</td><td class="r">${c.n}</td><td>${esc(c.val)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="card flat"><h2>3. Fonctionnement</h2><ul>${e.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
      <section class="card flat"><h2>4. Étapes de réalisation</h2><ol>${e.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>
      <section class="card flat"><h2>5. Exercices pratiques</h2><ol>${e.exercises.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></section>
      <p class="small muted">Schéma pédagogique : symboles simplifiés d'après la NF EN 60617, valeurs indicatives (calibres, sections) à vérifier dans la NF C 15-100 et les documentations des fabricants. La simulation ne remplace pas la vérification d'une installation réelle.</p></div>`;
    // zoom du schéma : « Tout voir » = schéma entier dans le cadre ; + / − = agrandir / réduire
    let z = 1; const box = $('#exprev'), svg = $('#exprev svg');
    const setZ = (k) => { z = Math.max(1, Math.min(6, k)); box.classList.toggle('fitall', z === 1); svg.style.height = z === 1 ? '' : Math.round(box.clientHeight * z - 20) + 'px'; svg.style.width = z === 1 ? '' : 'auto'; svg.style.maxWidth = z === 1 ? '' : 'none'; };
    $('#exzi').onclick = () => setZ(z * 1.5); $('#exzo').onclick = () => setZ(z / 1.5); $('#exzfit').onclick = () => setZ(1);
    // plein écran : couche posée sur toute la page (schéma entier, zoom + / −, Échap ou ✕ pour fermer)
    $('#exfull').onclick = () => {
      const ov = document.createElement('div'); ov.className = 'exoverlay'; ov.innerHTML = `<div class="exobar"><b>${esc(e.title)}</b><span class="grow"></span><button class="btn small" data-z="-">−</button><button class="btn small" data-z="0">Tout voir</button><button class="btn small" data-z="+">+</button><button class="btn small danger" data-z="x">✕ Fermer</button></div><div class="exobody fitall">${docSvg(doc, e.schema)}</div>`;
      document.body.appendChild(ov); let k = 1; const bd = ov.querySelector('.exobody'), sv = bd.querySelector('svg');
      const zz = (n) => { k = Math.max(1, Math.min(8, n)); bd.classList.toggle('fitall', k === 1); sv.style.height = k === 1 ? '' : Math.round(bd.clientHeight * k - 20) + 'px'; sv.style.width = k === 1 ? '' : 'auto'; sv.style.maxWidth = k === 1 ? '' : 'none'; };
      const close = () => { ov.remove(); document.removeEventListener('keydown', esc1); }; const esc1 = (ev) => { if (ev.key === 'Escape') close(); };
      ov.querySelectorAll('[data-z]').forEach((b) => (b.onclick = () => ({ '-': () => zz(k / 1.5), '0': () => zz(1), '+': () => zz(k * 1.5), x: close })[b.dataset.z]()));
      document.addEventListener('keydown', esc1);
    };
    $('#exback').onclick = () => list(); $('#exopen').onclick = () => openInEditor(e); $('#exprint').onclick = () => g.print();
    $('#exexo').onclick = () => { EE.Pedago ? EE.Pedago.newExerciseFromExample(e.id) : null; };
    $('#extest').onclick = () => { const r = EE.Examples.scenario(e); $('#exres').innerHTML = `<div class="rep ${r.ok ? 'ok' : 'bad'}"><b>${r.ok ? '✔ Le circuit fonctionne comme prévu' : '✘ Écart constaté'}</b><br><small>${r.log.map(esc).join(' · ')}</small></div>`; };
  }

  EE.Screens = EE.Screens || {}; EE.Screens.examples = (arg) => (arg ? detail(arg) : list());
  EE.ExamplesUI = { openInEditor, docSvg };
})(window);
