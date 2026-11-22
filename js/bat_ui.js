/* Yak-élec-pro – onglet « Électricité bâtiment » : les quatre types de schéma réunis */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, $ = (s, r = document) => r.querySelector(s);
  const TYPES = [
    { k: 'developpe', ic: '🔌', name: 'Schéma développé', what: 'Montre le fonctionnement du circuit : chaque appareil est décomposé (contacts, bobines, lampes) et placé selon sa fonction.', use: 'Simple allumage, va-et-vient, télérupteur, minuterie, commande de moteur.', verify: 'Vérification électrique + simulation (lampes, moteurs).' },
    { k: 'unifilaire', ic: '➖', name: 'Schéma unifilaire', what: 'Un seul trait représente une canalisation : on voit la structure de l\'installation, les protections et les sections.', use: 'Tableau de répartition, départs, disjoncteurs, différentiels.', verify: 'Nombre de conducteurs en traits obliques, désignation du câble.' },
    { k: 'multifilaire', ic: '〰️', name: 'Schéma multifilaire', what: 'Tous les conducteurs sont dessinés : phases, neutre et terre. C\'est le schéma de câblage.', use: 'Câblage d\'un coffret, d\'un démarrage moteur, raccordement des appareils.', verify: 'Vérification électrique + simulation.' },
    { k: 'architectural', ic: '🏠', name: 'Schéma architectural (plan)', what: 'Plan du bâtiment : murs, portes, fenêtres et emplacement des points lumineux, interrupteurs, prises et appareils.', use: 'Implantation d\'une maison, d\'un appartement ou d\'un local (1 carreau = 25 cm).', verify: 'Bilan des équipements et longueur des murs.' },
  ];
  function render() {
    const list = EE.Store.Projects.list().slice().sort((a, b) => b.modified - a.modified);
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>🏠 Électricité bâtiment</h1></div>
      <p class="muted">Choisissez le type de schéma à réaliser. Chaque type a son propre mode de dessin ; vous pouvez changer de type à tout moment dans l'atelier.</p>
      <div class="battypes">${TYPES.map((t) => { const mine = list.filter((p) => p.schema === t.k);
        return `<section class="card flat battype" data-k="${t.k}"><div class="bt-head"><span class="ic">${t.ic}</span><div><h2>${esc(t.name)}</h2><small class="muted">${mine.length} projet${mine.length > 1 ? 's' : ''}</small></div></div>
          <p>${esc(t.what)}</p><p class="small"><b>Pour :</b> ${esc(t.use)}</p><p class="small muted">${esc(t.verify)}</p>
          <div class="btnrow"><button class="btn primary" data-new="${t.k}">＋ Nouveau schéma</button></div>
          ${mine.length ? `<div class="list bt-list">${mine.slice(0, 5).map((p) => `<button class="row" data-open="${p.id}"><b>${esc(p.name)}</b><span>${esc(p.install)}</span><em>${EE.fmtDate(p.modified)}</em></button>`).join('')}</div>${mine.length > 5 ? `<p class="small muted">… et ${mine.length - 5} autre(s) dans « Mes projets ».</p>` : ''}` : '<p class="small muted">Aucun projet de ce type pour le moment.</p>'}</section>`; }).join('')}</div>
      <section class="card flat"><h3>Conseil de méthode</h3><p class="small">1. Dessinez d'abord le <b>plan architectural</b> (implantation) • 2. Établissez le <b>schéma unifilaire</b> du tableau (circuits et protections) • 3. Détaillez le <b>schéma développé</b> ou <b>multifilaire</b> des circuits de commande • 4. Calculez le matériel et le coffret dans <a href="#" data-go-q>Quantitatif</a>.</p>
        <p class="small muted">Les symboles sont simplifiés d'après la NF EN 60617 et les usages de la NF C 15-100 ; vérifiez-les sur les normes en vigueur avant un dossier officiel.</p></section></div>`;
    document.querySelectorAll('[data-new]').forEach((b) => (b.onclick = () => EE.app.newProject(b.dataset.new)));
    document.querySelectorAll('.battype [data-open]').forEach((b) => (b.onclick = () => EE.app.go('editor', b.dataset.open)));
    const q = $('[data-go-q]'); if (q) q.onclick = (e) => { e.preventDefault(); EE.app.go('quant'); };
  }
  EE.Screens = EE.Screens || {}; EE.Screens.bat = render;
})(window);
