/* Yak-élec-pro – écran « Composants et symboles » : liste du catalogue avec le symbole de chaque composant */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, $ = (s, r = document) => r.querySelector(s);
  function rows() {
    const cfg = EE.Config.get(), seen = {};
    return cfg.catalog.map((c) => { const m = EE.Config.symOf(c.id), d = c.sym ? EE.Library.get(c.sym) : null; return { c, d, note: m.note }; });
  }
  function render() {
    const R = rows(), cats = [...new Set(R.map((r) => r.c.cat))], withSym = R.filter((r) => r.d).length, q = EE.compoQ || '';
    const vis = R.filter((r) => (r.c.name + r.c.cat).toLowerCase().includes(q.toLowerCase()));
    EE.main('compo').innerHTML = `<div class="page"><div class="bar no-print"><h1>Composants et symboles</h1><div class="grow"></div><input id="cmq" placeholder="Rechercher…" value="${esc(q)}"><button class="btn" id="cmcsv">Exporter (CSV)</button><button class="btn" id="cmprint">Imprimer / PDF</button></div>
      <p class="muted">Liste de tous les composants du catalogue avec le symbole de la bibliothèque qui les représente. ${withSym} composant(s) sur ${R.length} ont un symbole ; les autres sont indiqués « aucun symbole » (rien n'est inventé).</p>
      ${cats.map((cat) => { const L = vis.filter((r) => r.c.cat === cat); return L.length ? `<h2>${esc(cat)}</h2><div class="qwrap"><table class="qt cmp"><thead><tr><th style="width:90px">Symbole</th><th>Composant</th><th>Symbole de la bibliothèque</th><th>Remarque et norme européenne</th></tr></thead><tbody>${L.map((r) => `<tr><td>${r.d ? EE.app.ui.symbol(r.d.id, 64) : '<span class="muted">—</span>'}</td><td>${esc(r.c.name)}</td><td>${r.d ? `<b>${esc(r.d.name)}</b><br><small class="muted">${esc(r.d.ref.split(';')[0])}</small>` : '<span class="muted">aucun symbole dans la bibliothèque</span>'}</td><td class="small muted">${esc(r.note)}${r.c.norm ? `<br><b>Norme :</b> ${esc(r.c.norm)}` : ''}</td></tr>`).join('')}</tbody></table></div>` : ''; }).join('')}
      <p class="small muted">Symboles redessinés de façon simplifiée d'après les principes de la norme NF EN 60617 (CEI 60617) ; ils ne reproduisent pas les planches de la norme. Pour un dossier officiel ou un examen, vérifiez la forme exacte dans la norme en vigueur. Le symbole d'un composant peut être corrigé dans le Portail › Catalogue.</p></div>`;
    $('#cmq').oninput = (e) => { EE.compoQ = e.target.value; render(); const i = $('#cmq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
    $('#cmprint').onclick = () => g.print();
    $('#cmcsv').onclick = () => { const q2 = (v) => '"' + String(v).replace(/"/g, '""') + '"'; const L = ['Catégorie;Composant;Symbole de la bibliothèque;Remarque;Norme']; R.forEach((r) => L.push([r.c.cat, r.c.name, r.d ? r.d.name : 'aucun symbole', r.note, r.c.norm || ''].map(q2).join(';'))); EE.Export.download('composants_et_symboles.csv', new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8' })); };
  }
  EE.Screens = EE.Screens || {}; EE.Screens.compo = render;
})(window);
