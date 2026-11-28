/* Yak-élec-pro V1.10 – mode pédagogique : cours, reconnaissance des symboles, circuits guidés,
   correction automatique des connexions, évaluation (note sur 20), exercices créés par l'enseignant, remise des copies.
   Données (sur l'appareil) : eep.pedago.exercises, eep.pedago.courses, eep.pedago.subs (copies reçues), eep.pedago.scores.<utilisateur>.
   Partage entre appareils : fichiers .json (exercices de l'enseignant, copies des élèves) envoyés par WhatsApp, e-mail ou clé USB. */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, Lib = EE.Library, St = EE.Store;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => EE.app.ui, S = () => St.raw;
  const user = () => St.Users.current() || { id: 'anon', name: 'invité' };

  // ---------- cours intégrés (rédigés pour l'application ; normes citées à vérifier sur les textes en vigueur) ----------
  const COURSES = [
    { id: 'c_symb', title: 'Lire un schéma : symboles et repères', ex: 'simple_allumage', body: 'Un schéma électrique représente les appareils par des symboles normalisés (NF EN 60617 / CEI 60617) et les liaisons par des traits.\nChaque appareil porte un repère : une lettre qui indique sa fonction et un numéro. Q = appareil de protection et de coupure (disjoncteur, sectionneur), F = protection (fusible, relais thermique), S = commande manuelle (interrupteur, bouton-poussoir), K = contacteur ou relais (KM, KA, KT), H = signalisation (lampe, voyant), M = moteur, X = borne ou prise.\nUne bobine et ses contacts portent le même repère : c\'est ce qui les relie sur un schéma développé.\nUn simple croisement de deux traits n\'est pas une connexion : la connexion est marquée par un point.' },
    { id: 'c_types', title: 'Les types de schémas', ex: 'distribution', body: 'Schéma développé : chaque appareil est décomposé (bobine, contacts) et placé selon le fonctionnement, entre deux lignes d\'alimentation. Il sert à comprendre et à dépanner.\nSchéma unifilaire : un seul trait représente une canalisation ; des traits obliques indiquent le nombre de conducteurs. Il montre la structure d\'un tableau.\nSchéma multifilaire : tous les conducteurs sont dessinés (phases, neutre, terre). C\'est le schéma de câblage.\nSchéma architectural : le plan du local avec l\'emplacement des appareils.\nDans un équipement industriel on distingue le circuit de puissance (moteur) et le circuit de commande (bobines, boutons).' },
    { id: 'c_eclair', title: 'Les circuits d\'éclairage du bâtiment', ex: 'va_et_vient', body: 'Simple allumage : un interrupteur commande un ou plusieurs points lumineux depuis un seul endroit.\nDouble allumage : un interrupteur double commande deux circuits de lampes séparés.\nVa-et-vient : deux commutateurs commandent la même lampe depuis deux endroits ; ils sont reliés par deux navettes.\nTélérupteur : des boutons-poussoirs en parallèle commandent un relais à mémoire ; idéal à partir de trois points de commande.\nMinuterie : la lampe s\'éteint seule après une durée réglée (escaliers, couloirs).\nRègle de sécurité : l\'organe de commande coupe toujours la phase, jamais le neutre.' },
    { id: 'c_prot', title: 'Protéger les biens et les personnes', ex: 'prise', body: 'Le fusible et le disjoncteur protègent les conducteurs contre les surintensités (surcharges et courts-circuits). Leur calibre dépend de la section du câble.\nLe dispositif différentiel (30 mA pour les circuits terminaux) protège les personnes : il coupe quand une partie du courant s\'échappe vers la terre.\nToutes les masses métalliques et les prises doivent être reliées à la prise de terre par le conducteur de protection vert/jaune.\nLe parafoudre protège l\'installation contre les surtensions d\'origine atmosphérique.\nLes valeurs (calibres, sections, nombre de points par circuit) sont fixées par la NF C 15-100 : vérifiez-les sur l\'édition en vigueur.' },
    { id: 'c_moteur', title: 'Commande d\'un moteur par contacteur', ex: 'demarrage_direct', body: 'Le contacteur est un interrupteur commandé à distance par sa bobine. Ses pôles de puissance alimentent le moteur ; ses contacts auxiliaires servent à la commande.\nAuto-maintien : un contact NO du contacteur en parallèle sur le bouton marche garde la bobine alimentée après le relâchement.\nLe bouton d\'arrêt est un contact NF placé en série : il coupe la bobine.\nLe relais thermique protège le moteur contre les surcharges : son contact NF 95-96 coupe la bobine en cas de défaut.\nInversion de sens : deux contacteurs permutent deux phases ; un verrouillage par contacts NF croisés empêche le court-circuit.\nÉtoile-triangle : on démarre en étoile (courant réduit) puis on passe en triangle après une temporisation.' },
    { id: 'c_auto', title: 'Initiation à l\'automatisme', ex: null, body: 'Un automate programmable (API) lit des entrées (boutons, capteurs, fins de course) et commande des sorties (contacteurs, voyants) selon un programme.\nDans Yak-élec-pro, le programme s\'écrit avec des équations logiques : Q1 = I1 ET NON I2 ; Q2 = I3 OU I4.\nET : la sortie est active si toutes les conditions sont vraies. OU : si au moins une est vraie. NON : inverse la condition.\nAuto-maintien en logique : Q1 = (I1 OU Q1) ET NON I2 (I1 marche, I2 arrêt).\nLe compteur compte des impulsions et bascule ses contacts à la valeur réglée ; le relais temporisé retarde un ordre (travail ou repos).' },
  ];

  // ---------- stockage ----------
  const K = { ex: 'eep.pedago.exercises', co: 'eep.pedago.courses', subs: 'eep.pedago.subs' };
  const myEx = () => S().get(K.ex, []), setEx = (l) => S().set(K.ex, l);
  const myCo = () => S().get(K.co, []), setCo = (l) => S().set(K.co, l);
  const subs = () => S().get(K.subs, []), setSubs = (l) => S().set(K.subs, l);
  const scores = () => S().get('eep.pedago.scores.' + user().id, []), addScore = (r) => { const l = scores(); l.unshift(Object.assign({ t: Date.now() }, r)); S().set('eep.pedago.scores.' + user().id, l.slice(0, 200)); };
  const role = () => (St.Settings.get().pedRole || (EE.Config.isAdmin(St.Users.current()) ? 'prof' : 'eleve'));

  // exercices intégrés : réaliser chaque exemple (schéma de départ = composants placés, sans conducteurs)
  const builtinEx = () => EE.Examples.list.map((e) => ({ id: 'x_' + e.id, title: 'Réaliser : ' + e.title, level: e.level, schema: e.schema, example: e.id, start: 'parts', builtin: true,
    consigne: `Réalisez le schéma « ${e.title} ». Les composants sont déjà placés et repérés : tracez tous les conducteurs, vérifiez votre schéma puis lancez la correction (menu Outils → Corriger mon exercice).` }));
  const allEx = () => builtinEx().concat(myEx());
  const refDoc = (ex) => (ex.example ? EE.Examples.build(ex.example) : EE.clone(ex.ref));
  const steps = (ex) => (ex.example ? (EE.Examples.get(ex.example) || {}).sim || [] : ex.sim || []);

  // ---------- correction automatique ----------
  const SRC_T = ['phase', 'neutre', 'terre'];
  function netSigs(doc) { // une signature par réseau : bornes repérées (repère|type|borne) + potentiels
    const A = EE.Engine.analyze(doc), out = [];
    Object.values(A.nets).forEach((nt) => {
      const mem = []; nt.terms.forEach((T) => { const d = Lib.get(T.comp.type); if (!d || d.junction || d.annot || SRC_T.includes(T.comp.type)) return; mem.push((T.comp.label || '?') + '|' + T.comp.type + '|' + T.tid); });
      nt.pots.forEach((p) => mem.push('POT:' + (/^c[^.]+\./.test(p) ? p.replace(/^c[^.]+/, 'src') : p)));
      if (mem.length >= 2) out.push(mem.sort().join(' + '));
    });
    return out.sort();
  }
  const human = (sig) => sig.split(' + ').map((m) => (m.startsWith('POT:') ? m.slice(4) : (() => { const [l, t, b] = m.split('|'); return `${l} (${(Lib.get(t) || {}).name || t}) borne ${b}`; })())).join(' ↔ ');
  function compCount(doc) { const m = {}; doc.comps.forEach((c) => { const d = Lib.get(c.type); if (!d || d.junction || d.annot || d.cross || c.type === 'conducteur') return; m[c.type] = (m[c.type] || 0) + 1; }); return m; }
  function correct(ref, doc, sc) {
    const rc = compCount(ref), dc = compCount(doc); let need = 0, have = 0; const missing = [], extra = [];
    Object.keys(rc).forEach((t) => { need += rc[t]; have += Math.min(rc[t], dc[t] || 0); if ((dc[t] || 0) < rc[t]) missing.push(`${rc[t] - (dc[t] || 0)} × ${Lib.get(t).name}`); });
    Object.keys(dc).forEach((t) => { if ((dc[t] || 0) > (rc[t] || 0)) extra.push(`${dc[t] - (rc[t] || 0)} × ${Lib.get(t).name}`); });
    const rs = netSigs(ref), ds = netSigs(doc), pool = ds.slice(); let okN = 0; const wrong = [];
    rs.forEach((s) => { const i = pool.indexOf(s); if (i >= 0) { okN++; pool.splice(i, 1); } else wrong.push(s); });
    const v = EE.Engine.verify(doc), errs = v.issues.filter((i) => i.sev === 'error').length, warns = v.issues.filter((i) => i.sev === 'warning').length;
    let fn = null; if (sc && sc.length) { const r = EE.Examples.scenario({ sim: sc }, EE.clone(doc)); fn = r; }
    const pComp = need ? have / need : 1, pCon = rs.length ? okN / rs.length : 1, pVer = Math.max(0, 1 - errs * 0.34 - warns * 0.1);
    const W = fn ? [4, 8, 3, 5] : [5, 10, 5, 0];
    const note = Math.round((W[0] * pComp + W[1] * pCon + W[2] * pVer + (fn ? W[3] * (fn.ok ? 1 : 0) : 0)) * 2) / 2;
    return { note, max: 20, parts: [['Composants', W[0], pComp], ['Connexions', W[1], pCon], ['Vérification électrique', W[2], pVer]].concat(fn ? [['Fonctionnement (simulation)', W[3], fn.ok ? 1 : 0]] : []),
      missing, extra, wrong: wrong.map(human), extraNets: pool.map(human), okN, totalN: rs.length, errs, warns, fn };
  }
  function reportHtml(r) {
    return `<div class="score">${String(r.note).replace('.', ',')} / 20</div><table class="qt small"><tbody>${r.parts.map(([l, w, p]) => `<tr><td>${esc(l)}</td><td class="r">${(Math.round(w * p * 2) / 2).toString().replace('.', ',')} / ${w}</td></tr>`).join('')}</tbody></table>
      <p class="small">Connexions correctes : <b>${r.okN} / ${r.totalN}</b> · erreurs de vérification : ${r.errs} · avertissements : ${r.warns}</p>
      ${r.missing.length ? `<div class="rep bad">Composants manquants : ${esc(r.missing.join(', '))}</div>` : ''}${r.extra.length ? `<div class="rep warn">Composants en trop : ${esc(r.extra.join(', '))}</div>` : ''}
      ${r.wrong.length ? `<h4>Liaisons attendues non réalisées (ou incomplètes)</h4><ul class="small">${r.wrong.slice(0, 15).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<div class="rep ok">Toutes les liaisons attendues sont réalisées.</div>'}
      ${r.extraNets.length ? `<h4>Liaisons de votre schéma qui ne correspondent pas au corrigé</h4><ul class="small">${r.extraNets.slice(0, 10).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.fn ? `<div class="rep ${r.fn.ok ? 'ok' : 'bad'}">Fonctionnement : ${r.fn.ok ? 'conforme au scénario attendu' : 'non conforme'}<br><small>${r.fn.log.map(esc).join(' · ')}</small></div>` : ''}
      <p class="small muted">La correction compare les liaisons entre bornes repérées (même repère que dans la consigne). Un montage différent mais correct (ordre des appareils en série, par exemple) peut être compté faux en « connexions » : l'enseignant garde le dernier mot.</p>`;
  }

  // ---------- démarrer un exercice ----------
  function startExercise(ex) {
    const ref = refDoc(ex); let doc;
    if (ex.start === 'empty') doc = { comps: [], wires: [] };
    else if (ex.start === 'full') doc = EE.clone(ref);
    else doc = { comps: ref.comps.filter((c) => !Lib.get(c.type).junction).map(EE.clone), wires: [] }; // composants placés, à câbler
    const p = St.Projects.create({ name: 'Exercice – ' + ex.title.replace(/^Réaliser : /, ''), install: 'Enseignement / atelier', schema: ex.schema || 'developpe' });
    p.doc = doc; p.exercise = { id: ex.id, title: ex.title, consigne: ex.consigne, started: Date.now() }; St.Projects.update(p);
    ui().toast('Exercice ouvert dans l\'atelier', 'ok'); EE.app.go('editor', p.id);
    setTimeout(() => ui().modal({ title: '📝 Consigne', body: `<p>${esc(ex.consigne)}</p><p class="small muted">Quand vous avez terminé : menu <b>Outils → Corriger mon exercice</b>.</p>`, buttons: [{ label: 'C\'est parti', cls: 'primary', value: null }] }), 300);
  }
  function exById(id) { return allEx().find((e) => e.id === id); }
  async function correctCurrent() {
    const p = EE.app.project; if (!p || !p.exercise) { ui().toast('Ce projet n\'est pas un exercice', 'bad'); return; }
    ui().flushSave(); const ex = exById(p.exercise.id); if (!ex) { ui().toast('Exercice introuvable sur cet appareil (demandez le fichier à votre enseignant)', 'bad'); return; }
    const doc = EE.app.editor ? EE.app.editor.doc : p.doc; const r = correct(refDoc(ex), doc, steps(ex));
    addScore({ ex: ex.id, title: ex.title, note: r.note }); p.exercise.last = { note: r.note, t: Date.now() }; St.Projects.update(p);
    const act = await ui().modal({ title: 'Correction : ' + ex.title, wide: true, body: reportHtml(r), buttons: [{ label: 'Continuer à travailler', value: null }, { label: '📤 Remettre mon travail', cls: 'primary', value: 'send' }] });
    if (act === 'send') submit(p, ex, r);
  }
  function submit(p, ex, r) {
    const u = user(); const doc = EE.app.editor && EE.app.project && EE.app.project.id === p.id ? EE.app.editor.doc : p.doc;
    const pkg = { format: 'yak-elec-pro-remise', version: 1, student: u.name, date: Date.now(), exercise: { id: ex.id, title: ex.title }, note: r ? r.note : null, project: Object.assign(EE.clone(p), { doc: EE.clone(doc) }) };
    const l = subs(); l.unshift({ id: EE.uid('r'), student: pkg.student, date: pkg.date, exercise: pkg.exercise, note: pkg.note, project: pkg.project }); setSubs(l.slice(0, 300));
    EE.Export.download(EE.Export.safe('remise_' + u.name + '_' + ex.title) + '.json', new Blob([JSON.stringify(pkg)], { type: 'application/json' }));
    ui().toast('Copie enregistrée sur cet appareil et fichier de remise téléchargé : envoyez-le à votre enseignant (WhatsApp, e-mail).', 'ok');
  }

  // ---------- quiz de reconnaissance des symboles ----------
  function quizScreen(el) {
    const pool = Lib.list.filter((d) => !d.tool && !['Liaisons', 'Annotations'].includes(d.cat) && !d.junction);
    const sh = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
    const Q = sh(pool).slice(0, 10).map((d) => { const same = pool.filter((x) => x.cat === d.cat && x.id !== d.id), other = pool.filter((x) => x.id !== d.id && x.cat !== d.cat); const wrong = sh(same).slice(0, 2).concat(sh(other)).filter((x, i, a) => a.findIndex((y) => y.name === x.name) === i && x.name !== d.name).slice(0, 3); return { d, opts: sh([d].concat(wrong)) }; });
    let i = 0, good = 0;
    const show = () => {
      if (i >= Q.length) { addScore({ ex: 'quiz', title: 'Reconnaissance des symboles', note: Math.round(good * 20 / Q.length * 2) / 2 }); el.innerHTML = `<section class="card flat quiz"><h2>Résultat</h2><div class="score">${good} / ${Q.length}</div><p>${good >= 8 ? 'Très bien !' : good >= 5 ? 'Bien, continuez à vous entraîner.' : 'Revoyez la bibliothèque de symboles et recommencez.'}</p><div class="btnrow"><button class="btn primary" id="qz-again">Recommencer</button><button class="btn" id="qz-lib">Ouvrir la bibliothèque</button></div></section>`; $('#qz-again').onclick = () => quizScreen(el); $('#qz-lib').onclick = () => EE.app.go('library'); return; }
      const q = Q[i];
      el.innerHTML = `<section class="card flat quiz"><p class="small muted">Question ${i + 1} / ${Q.length} · score ${good}</p><h2>Quel est ce symbole ?</h2><div class="qsym">${ui().symbol(q.d.id, 130)}</div>${q.opts.map((o, k) => `<button class="btn qopt" data-k="${k}">${esc(o.name)}</button>`).join('')}<div id="qz-fb"></div></section>`;
      $$('.qopt', el).forEach((b) => (b.onclick = () => {
        const o = q.opts[+b.dataset.k], ok = o.id === q.d.id; if (ok) good++;
        $$('.qopt', el).forEach((x) => { x.disabled = true; const oo = q.opts[+x.dataset.k]; if (oo.id === q.d.id) x.classList.add('good'); else if (x === b) x.classList.add('badc'); });
        $('#qz-fb', el).innerHTML = `<p class="small">${ok ? '✔ Exact.' : '✘ C\'était : <b>' + esc(q.d.name) + '</b>.'} ${esc(q.d.desc || '')}</p><button class="btn primary" id="qz-next">${i + 1 < Q.length ? 'Question suivante' : 'Voir le résultat'}</button>`;
        $('#qz-next').onclick = () => { i++; show(); };
      }));
    };
    show();
  }

  // ---------- écrans ----------
  let tab = 'cours';
  function screen(arg) {
    if (arg) tab = arg; const prof = role() === 'prof';
    const T = [['cours', '📖 Cours'], ['quiz', '🔣 Reconnaître les symboles'], ['exos', '📝 Exercices'], ['res', '🏅 Mes résultats']].concat(prof ? [['creer', '✏️ Créer un exercice'], ['copies', '📥 Copies reçues']] : []);
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>🎓 Mode pédagogique</h1><div class="grow"></div><label class="small">Je suis : <select id="pd-role"><option value="eleve"${!prof ? ' selected' : ''}>élève</option><option value="prof"${prof ? ' selected' : ''}>enseignant</option></select></label></div>
      <div class="chips">${T.map(([k, l]) => `<button class="chip${k === tab ? ' on' : ''}" data-t="${k}">${l}</button>`).join('')}</div><div id="pd"></div></div>`;
    $('#pd-role').onchange = (e) => { St.Settings.set({ pedRole: e.target.value }); if (e.target.value !== 'prof' && ['creer', 'copies'].includes(tab)) tab = 'cours'; screen(); };
    $$('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; screen(); }));
    const el = $('#pd');
    ({ cours: courses, quiz: quizScreen, exos: exercises, res: results, creer: create, copies: copies }[tab] || courses)(el);
  }
  function courses(el) {
    const L = COURSES.concat(myCo().map((c) => Object.assign({ mine: true }, c)));
    el.innerHTML = `<p class="muted">Fiches de cours courtes, à lire avant les exercices. ${role() === 'prof' ? 'Vous pouvez ajouter vos propres cours.' : ''}</p>
      ${role() === 'prof' ? `<div class="btnrow"><button class="btn primary" id="co-add">＋ Ajouter un cours</button><button class="btn" id="co-exp">Exporter mes cours</button><button class="btn" id="co-imp">Importer des cours…</button><input type="file" id="co-f" accept=".json" hidden></div>` : ''}
      ${L.map((c) => `<section class="card flat"><h2>${esc(c.title)}${c.mine ? ' <span class="lvl">mon cours</span>' : ''}</h2>${String(c.body || '').split('\n').filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('')}<div class="btnrow">${c.ex ? `<button class="btn" data-ex="${c.ex}">Voir l'exemple associé</button>` : ''}${c.mine ? `<button class="btn danger small" data-del="${c.id}">Supprimer</button>` : ''}</div></section>`).join('')}`;
    $$('[data-ex]', el).forEach((b) => (b.onclick = () => EE.app.go('examples', b.dataset.ex)));
    $$('[data-del]', el).forEach((b) => (b.onclick = () => { setCo(myCo().filter((c) => c.id !== b.dataset.del)); screen(); }));
    if ($('#co-add')) {
      $('#co-add').onclick = async () => { const r = await ui().modal({ title: 'Nouveau cours', wide: true, body: `<label>Titre<input id="co-t" maxlength="80"></label><label>Contenu (un paragraphe par ligne)<textarea id="co-b" rows="10"></textarea></label><label>Exemple associé<select id="co-e"><option value="">(aucun)</option>${EE.Examples.list.map((e) => `<option value="${e.id}">${esc(e.title)}</option>`).join('')}</select></label>`, buttons: [{ label: 'Annuler', value: null }, { label: 'Enregistrer', cls: 'primary', value: (ov) => ({ title: $('#co-t', ov).value.trim(), body: $('#co-b', ov).value, ex: $('#co-e', ov).value || null }) }] }); if (!r || !r.title) return; setCo(myCo().concat([Object.assign({ id: EE.uid('co'), author: user().name }, r)])); screen(); };
      $('#co-exp').onclick = () => EE.Export.download('cours_yak-elec-pro.json', new Blob([JSON.stringify({ format: 'yak-elec-pro-cours', courses: myCo() })], { type: 'application/json' }));
      $('#co-imp').onclick = () => $('#co-f').click(); $('#co-f').onchange = async (e) => { try { const o = JSON.parse(await e.target.files[0].text()); if (o.format !== 'yak-elec-pro-cours') throw new Error('Ce fichier n\'est pas un fichier de cours.'); const ids = new Set(myCo().map((c) => c.id)); setCo(myCo().concat(o.courses.filter((c) => !ids.has(c.id)))); ui().toast(o.courses.length + ' cours importé(s)', 'ok'); screen(); } catch (err) { ui().toast(err.message, 'bad'); } };
    }
  }
  function exercises(el) {
    const L = allEx(), mine = St.Projects.list().filter((p) => p.exercise);
    el.innerHTML = `<p class="muted">Circuits guidés : l'exercice s'ouvre dans l'atelier avec les composants déjà placés (ou une feuille vide). Tracez les conducteurs, puis corrigez avec <b>Outils → Corriger mon exercice</b>. La note sur 20 tient compte des composants, des connexions, de la vérification et du fonctionnement.</p>
      <div class="btnrow"><button class="btn" id="ex-imp">Importer un exercice de mon enseignant…</button><input type="file" id="ex-f" accept=".json" hidden></div>
      ${mine.length ? `<h2>Mes exercices en cours</h2><div class="list">${mine.map((p) => `<button class="row" data-open="${p.id}"><b>${esc(p.name)}</b><span>${p.exercise.last ? 'dernière note : ' + String(p.exercise.last.note).replace('.', ',') + ' / 20' : 'non corrigé'}</span><em>${EE.fmtDate(p.modified)}</em></button>`).join('')}</div>` : ''}
      <h2>Exercices disponibles</h2><div class="exgrid">${L.map((e) => `<section class="card flat excard"><h3>${esc(e.title)}</h3><div class="chips" style="margin:0">${e.level ? `<span class="lvl">${esc(e.level)}</span>` : ''}<span class="lvl">${e.builtin ? 'intégré' : 'enseignant' + (e.author ? ' : ' + esc(e.author) : '')}</span></div><p class="small">${esc(e.consigne)}</p><div class="btnrow"><button class="btn primary" data-go="${e.id}">Commencer</button>${!e.builtin && role() === 'prof' ? `<button class="btn small danger" data-del="${e.id}">Supprimer</button>` : ''}</div></section>`).join('')}</div>`;
    $$('[data-go]', el).forEach((b) => (b.onclick = () => startExercise(exById(b.dataset.go))));
    $$('[data-open]', el).forEach((b) => (b.onclick = () => EE.app.go('editor', b.dataset.open)));
    $$('[data-del]', el).forEach((b) => (b.onclick = () => { setEx(myEx().filter((x) => x.id !== b.dataset.del)); screen(); }));
    $('#ex-imp').onclick = () => $('#ex-f').click();
    $('#ex-f').onchange = async (e) => { try { const o = JSON.parse(await e.target.files[0].text()); if (o.format !== 'yak-elec-pro-exercice' || !o.exercise) throw new Error('Ce fichier n\'est pas un exercice Yak-élec-pro.'); setEx(myEx().filter((x) => x.id !== o.exercise.id).concat([o.exercise])); ui().toast('Exercice importé : ' + o.exercise.title, 'ok'); screen(); } catch (err) { ui().toast(err.message, 'bad'); } };
  }
  function results(el) {
    const L = scores();
    el.innerHTML = L.length ? `<div class="qwrap"><table class="qt"><thead><tr><th>Date</th><th>Activité</th><th class="r">Note</th></tr></thead><tbody>${L.map((r) => `<tr><td>${EE.fmtDate(r.t)}</td><td>${esc(r.title)}</td><td class="r"><b>${String(r.note).replace('.', ',')}</b> / 20</td></tr>`).join('')}</tbody></table></div><p class="small muted">Moyenne : <b>${(L.reduce((a, r) => a + r.note, 0) / L.length).toFixed(1).replace('.', ',')} / 20</b> sur ${L.length} activité(s).</p>` : '<p class="muted">Aucun résultat pour le moment : faites le quiz des symboles ou un exercice.</p>';
  }
  function create(el) {
    const projs = St.Projects.list().filter((p) => !p.exercise);
    el.innerHTML = `<section class="card flat"><h2>Créer un exercice</h2><p class="small muted">Le schéma choisi sert de <b>corrigé</b>. L'élève reçoit les composants déjà placés (ou une feuille vide) et doit réaliser les liaisons. Gardez les mêmes repères que dans la consigne (S1, H1, KM1…) : la correction s'appuie sur eux.</p>
      <label>Corrigé<select id="ce-src"><optgroup label="Exemples intégrés">${EE.Examples.list.map((e) => `<option value="x:${e.id}">${esc(e.title)}</option>`).join('')}</optgroup><optgroup label="Mes projets">${projs.map((p) => `<option value="p:${p.id}">${esc(p.name)}</option>`).join('')}</optgroup></select></label>
      <label>Titre<input id="ce-t" maxlength="80" placeholder="Ex. : Va-et-vient de la chambre"></label><label>Consigne pour l'élève<textarea id="ce-c" rows="4" placeholder="Décrivez le travail demandé…"></textarea></label>
      <div class="two"><label>Départ de l'élève<select id="ce-s"><option value="parts">Composants placés, sans conducteurs</option><option value="empty">Feuille vide (tout à dessiner)</option></select></label><label>Niveau<select id="ce-l"><option>Débutant</option><option>Intermédiaire</option><option>Avancé</option></select></label></div>
      <div class="btnrow"><button class="btn primary" id="ce-go">Enregistrer l'exercice</button></div><p class="small muted">L'exercice est disponible sur cet appareil. Pour les élèves qui ont leur propre appareil : bouton « Exporter » dans la liste, puis envoyez le fichier.</p></section>
      <section class="card flat"><h2>Mes exercices</h2>${myEx().length ? `<div class="list">${myEx().map((e) => `<div class="row"><b>${esc(e.title)}</b><span>${esc(e.level || '')}</span><span class="acts"><button class="btn small" data-x="${e.id}">Exporter</button></span></div>`).join('')}</div>` : '<p class="muted">Aucun exercice créé.</p>'}</section>`;
    $$('[data-x]', el).forEach((b) => (b.onclick = () => { const e = myEx().find((x) => x.id === b.dataset.x); EE.Export.download(EE.Export.safe('exercice_' + e.title) + '.json', new Blob([JSON.stringify({ format: 'yak-elec-pro-exercice', version: 1, exercise: e })], { type: 'application/json' })); }));
    $('#ce-go').onclick = () => {
      const src = $('#ce-src').value, t = $('#ce-t').value.trim(), c = $('#ce-c').value.trim(); if (!t || !c) { ui().toast('Titre et consigne obligatoires', 'bad'); return; }
      const e = { id: EE.uid('xe'), title: t, consigne: c, start: $('#ce-s').value, level: $('#ce-l').value, author: user().name, created: Date.now() };
      if (src.startsWith('x:')) { const x = EE.Examples.get(src.slice(2)); e.example = x.id; e.schema = x.schema; }
      else { const p = St.Projects.get(src.slice(2)); if (!p) { ui().toast('Choisissez un projet', 'bad'); return; } const sh = EE.Export.sheetsOf(p)[p.sheet || 0]; e.ref = EE.clone(sh.doc); e.schema = p.schema; }
      setEx(myEx().concat([e])); ui().toast('Exercice enregistré', 'ok'); screen();
    };
  }
  function copies(el) {
    const L = subs();
    el.innerHTML = `<p class="muted">Copies remises sur cet appareil, ou reçues sous forme de fichier (.json) envoyé par l'élève.</p><div class="btnrow"><button class="btn" id="cp-imp">Importer des copies…</button><input type="file" id="cp-f" accept=".json" multiple hidden></div>
      ${L.length ? `<div class="qwrap"><table class="qt"><thead><tr><th>Élève</th><th>Exercice</th><th>Date</th><th class="r">Note auto.</th><th>Actions</th></tr></thead><tbody>${L.map((s) => `<tr><td><b>${esc(s.student)}</b></td><td>${esc(s.exercise.title)}</td><td>${EE.fmtDate(s.date)}</td><td class="r">${s.note != null ? String(s.note).replace('.', ',') + ' / 20' : '—'}</td><td class="acts"><button class="btn small" data-rc="${s.id}">Recorriger</button><button class="btn small" data-op="${s.id}">Ouvrir</button><button class="btn small danger" data-dl="${s.id}">Supprimer</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aucune copie pour le moment.</p>'}`;
    $('#cp-imp').onclick = () => $('#cp-f').click();
    $('#cp-f').onchange = async (e) => { let n = 0; for (const f of e.target.files) { try { const o = JSON.parse(await f.text()); if (o.format !== 'yak-elec-pro-remise') continue; const l = subs(); l.unshift({ id: EE.uid('r'), student: o.student, date: o.date, exercise: o.exercise, note: o.note, project: o.project }); setSubs(l); n++; } catch (err) { /* fichier ignoré */ } } ui().toast(n + ' copie(s) importée(s)', n ? 'ok' : 'bad'); screen(); };
    const get = (id) => subs().find((s) => s.id === id);
    $$('[data-rc]', el).forEach((b) => (b.onclick = () => { const s = get(b.dataset.rc), ex = exById(s.exercise.id); if (!ex) { ui().toast('Exercice introuvable sur cet appareil', 'bad'); return; } const r = correct(refDoc(ex), s.project.doc, steps(ex)); const l = subs(); l.find((x) => x.id === s.id).note = r.note; setSubs(l); ui().modal({ title: s.student + ' – ' + s.exercise.title, wide: true, body: reportHtml(r), buttons: [{ label: 'Fermer', cls: 'primary', value: null }] }).then(() => screen()); }));
    $$('[data-op]', el).forEach((b) => (b.onclick = () => { const s = get(b.dataset.op); const p = St.Projects.importJSON(JSON.stringify({ format: 'yak-elec-pro', project: Object.assign(EE.clone(s.project), { name: 'Copie ' + s.student + ' – ' + s.exercise.title }) })); EE.app.go('editor', p.id); }));
    $$('[data-dl]', el).forEach((b) => (b.onclick = async () => { if (await ui().confirmBox('Supprimer la copie', 'Supprimer cette copie ?', 'Supprimer')) { setSubs(subs().filter((s) => s.id !== b.dataset.dl)); screen(); } }));
  }
  function newExerciseFromExample(id) { St.Settings.set({ pedRole: 'prof' }); tab = 'creer'; EE.app.go('learn'); setTimeout(() => { const s = $('#ce-src'); if (s) { s.value = 'x:' + id; const e = EE.Examples.get(id); $('#ce-t').value = e.title; $('#ce-c').value = `Réalisez le schéma « ${e.title} » en respectant les repères indiqués.`; } }, 30); }

  EE.Pedago = { COURSES, correct, netSigs, reportHtml, correctCurrent, startExercise, allEx, newExerciseFromExample, submit };
  EE.Screens = EE.Screens || {}; EE.Screens.learn = screen;
})(window);
