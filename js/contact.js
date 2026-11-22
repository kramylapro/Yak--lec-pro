/* Yak-élec-pro – page « Contact » : coordonnées du concepteur, écrire par e-mail ou WhatsApp */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, $ = (s, r = document) => r.querySelector(s);
  const owner = () => Object.assign({ name: '', email: '', phone: '' }, (EE.Config.get().brand || {}).owner);
  const digits = (p) => String(p || '').replace(/\D/g, '');
  const tel = (p) => '+' + digits(p);
  const mail = (o, subject, body) => `mailto:${encodeURIComponent(o.email).replace('%40', '@')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
  const wa = (o, text) => `https://wa.me/${digits(o.phone)}?text=${encodeURIComponent(text || '')}`;
  const ver = () => `Yak-élec-pro V${EE.VERSION}`;
  // ligne compacte (écran de connexion)
  function inline() {
    const o = owner(); const a = [];
    if (o.email) a.push(`<a href="${mail(o, 'Yak-élec-pro', '')}">✉ ${esc(o.email)}</a>`);
    if (digits(o.phone)) a.push(`<a href="${wa(o, 'Bonjour, je vous contacte au sujet de Yak-élec-pro.')}" target="_blank" rel="noopener">💬 WhatsApp ${esc(o.phone)}</a>`);
    return a.join(' &nbsp;·&nbsp; ');
  }
  function render() {
    const o = owner(), b = EE.Config.get().brand, u = (EE.Store.Users.current() || {}).name || '';
    $('#main').innerHTML = `<div class="page narrow"><h1>✉ Contact</h1>
      <section class="card flat contactcard"><div class="cid"><img class="logoimg ico" src="${EE.LOGO_ICON}" alt="" width="56" height="56"><div><h2>${esc(o.name || b.company)}</h2>${o.name ? `<p class="muted small">${esc(b.company)}</p>` : ''}</div></div>
        <ul class="clist">
          ${o.email ? `<li><span class="ci">✉</span><div><small>E-mail</small><b>${esc(o.email)}</b></div><a class="btn small" href="${mail(o, 'Yak-élec-pro', '')}">Écrire</a><button class="btn small" data-copy="${esc(o.email)}">Copier</button></li>` : ''}
          ${digits(o.phone) ? `<li><span class="ci">📞</span><div><small>Téléphone</small><b>${esc(o.phone)}</b></div><a class="btn small" href="tel:${tel(o.phone)}">Appeler</a><button class="btn small" data-copy="${esc(o.phone)}">Copier</button></li>
          <li><span class="ci wa">💬</span><div><small>WhatsApp</small><b>${esc(o.phone)}</b></div><a class="btn small wabtn" href="${wa(o, '')}" target="_blank" rel="noopener">Ouvrir</a></li>` : ''}
        </ul></section>
      <section class="card flat"><h2>M'écrire un message</h2>
        <label>Votre nom<input id="cn" value="${esc(u)}"></label>
        <label>Objet<select id="cs"><option>Question sur l'application</option><option>Problème rencontré</option><option>Suggestion d'amélioration</option><option>Devis / installation électrique</option><option>Autre</option></select></label>
        <label>Message<textarea id="cm" rows="5" placeholder="Écrivez votre message ici…"></textarea></label>
        <div class="btnrow"><button class="btn primary" id="cmail">✉ Envoyer par e-mail</button><button class="btn wabtn" id="cwa">💬 Envoyer par WhatsApp</button></div>
        <p class="small muted">Votre application de messagerie (e-mail ou WhatsApp) s'ouvre avec le message déjà rédigé ; il suffit d'appuyer sur « Envoyer ». L'application elle-même fonctionne hors ligne, mais l'envoi nécessite une connexion Internet.</p></section>
      <p class="small muted center">${esc(ver())}</p></div>`;
    const body = () => { const n = $('#cn').value.trim(), m = $('#cm').value.trim(); return `${m}${m ? '\n\n' : ''}— ${n || 'Utilisateur'} (${ver()})`; };
    $('#cmail').onclick = () => { g.location.href = mail(o, `[Yak-élec-pro] ${$('#cs').value}`, body()); };
    $('#cwa').onclick = () => { g.open(wa(o, `*${$('#cs').value}*\n${body()}`), '_blank', 'noopener'); };
    document.querySelectorAll('[data-copy]').forEach((b2) => (b2.onclick = async () => { try { await navigator.clipboard.writeText(b2.dataset.copy); EE.app.ui.toast('Copié', 'ok'); } catch (e) { EE.app.ui.toast(b2.dataset.copy, 'info'); } }));
  }
  EE.Contact = { owner, mail, wa, inline };
  EE.Screens = EE.Screens || {}; EE.Screens.contact = render;
})(window);
