/* Yak-élec-pro V1.10 – calculs électriques (fonctions pures + écran).
   Chaque calcul renvoie { ok, res:[{k,label,v,unit}], fx:[formules appliquées], warn } ; les formules sont affichées avec les unités. */
(function (g) {
  'use strict';
  const EE = g.EE, esc = EE.esc, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const S3 = Math.sqrt(3);
  const n = (v) => { if (v === '' || v == null) return null; const x = parseFloat(String(v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : null; };
  const f = (x, d = 2) => (x == null || !isFinite(x) ? '—' : (Math.abs(x) >= 1000 ? x.toFixed(0) : Math.abs(x) >= 100 ? x.toFixed(1) : x.toFixed(d)).replace('.', ','));
  const R = (k, label, v, unit) => ({ k, label, v, unit });
  const RHO = { cu: 0.0225, al: 0.036 }; // Ω·mm²/m, résistivités en service utilisées pour les chutes de tension (NF C 15-100 – à vérifier)

  const C = {
    ohm({ U, R: r, I }) {
      U = n(U); r = n(r); I = n(I); const k = [U, r, I].filter((x) => x != null).length;
      if (k < 2) return { ok: false, msg: 'Indiquez deux grandeurs sur les trois.' };
      if (U == null) { U = r * I; return { ok: true, res: [R('U', 'Tension U', U, 'V')], fx: [`U = R × I = ${f(r)} Ω × ${f(I)} A = ${f(U)} V`] }; }
      if (r == null) { if (!I) return { ok: false, msg: 'Le courant ne peut pas être nul.' }; r = U / I; return { ok: true, res: [R('R', 'Résistance R', r, 'Ω')], fx: [`R = U / I = ${f(U)} V / ${f(I)} A = ${f(r)} Ω`] }; }
      if (!r) return { ok: false, msg: 'La résistance ne peut pas être nulle.' }; I = U / r; return { ok: true, res: [R('I', 'Courant I', I, 'A'), R('P', 'Puissance dissipée P', U * I, 'W')], fx: [`I = U / R = ${f(U)} V / ${f(r)} Ω = ${f(I)} A`, `P = U × I = ${f(U * I)} W`] };
    },
    puissances({ U, I, cos, tri }) {
      U = n(U); I = n(I); cos = n(cos); tri = tri === true || tri === 'tri';
      if (U == null || I == null || cos == null) return { ok: false, msg: 'Indiquez U, I et cos φ.' }; if (cos < 0 || cos > 1) return { ok: false, msg: 'cos φ est compris entre 0 et 1.' };
      const sin = Math.sqrt(1 - cos * cos), k = tri ? S3 : 1, Sx = k * U * I, P = Sx * cos, Q = Sx * sin, kt = tri ? '√3 × ' : '';
      return { ok: true, res: [R('P', 'Puissance active P', P, 'W'), R('Q', 'Puissance réactive Q', Q, 'var'), R('S', 'Puissance apparente S', Sx, 'VA'), R('phi', 'Déphasage φ', Math.acos(cos) * 180 / Math.PI, '°')],
        fx: [`S = ${kt}U × I = ${kt}${f(U)} × ${f(I)} = ${f(Sx)} VA`, `P = S × cos φ = ${f(Sx)} × ${f(cos)} = ${f(P)} W`, `Q = S × sin φ = ${f(Sx)} × ${f(sin, 3)} = ${f(Q)} var`, 'Vérification : S = √(P² + Q²)'] };
    },
    courant({ P, U, cos, tri, eta }) {
      P = n(P); U = n(U); cos = n(cos); eta = n(eta) || 1; tri = tri === true || tri === 'tri';
      if (P == null || !U || !cos) return { ok: false, msg: 'Indiquez P, U et cos φ.' };
      const I = tri ? P / (S3 * U * cos * eta) : P / (U * cos * eta);
      return { ok: true, res: [R('I', 'Courant I', I, 'A'), R('S', 'Puissance apparente S', P / (cos * eta), 'VA')], fx: [tri ? `I = P / (√3 × U × cos φ${eta !== 1 ? ' × η' : ''}) = ${f(P)} / (1,732 × ${f(U)} × ${f(cos)}${eta !== 1 ? ' × ' + f(eta) : ''}) = ${f(I)} A` : `I = P / (U × cos φ${eta !== 1 ? ' × η' : ''}) = ${f(P)} / (${f(U)} × ${f(cos)}${eta !== 1 ? ' × ' + f(eta) : ''}) = ${f(I)} A`] };
    },
    resistance({ mat, L, S, U, P }) {
      L = n(L); S = n(S); U = n(U); P = n(P); const rho = RHO[mat] || RHO.cu;
      if (L != null && S) { const r = rho * L / S; return { ok: true, res: [R('R', 'Résistance du conducteur', r, 'Ω'), R('R2', 'Aller + retour (2 conducteurs)', 2 * r, 'Ω')], fx: [`R = ρ × L / S = ${f(rho, 4)} × ${f(L)} / ${f(S)} = ${f(r, 3)} Ω`, `ρ = ${f(rho, 4)} Ω·mm²/m (${mat === 'al' ? 'aluminium' : 'cuivre'})`] }; }
      if (U && P) { const r = U * U / P; return { ok: true, res: [R('R', 'Résistance du récepteur', r, 'Ω')], fx: [`R = U² / P = ${f(U)}² / ${f(P)} = ${f(r)} Ω`] }; }
      return { ok: false, msg: 'Indiquez la longueur et la section (conducteur), ou U et P (récepteur).' };
    },
    chute({ tri, mat, L, S, I, cos, U0, lim }) {
      L = n(L); S = n(S); I = n(I); cos = n(cos) || 1; U0 = n(U0) || 230; lim = n(lim) || 3; tri = tri === true || tri === 'tri'; const rho = RHO[mat] || RHO.cu, lam = 0.00008;
      if (!L || !S || I == null) return { ok: false, msg: 'Indiquez la longueur, la section et le courant.' };
      const b = tri ? 1 : 2, sin = Math.sqrt(1 - cos * cos), dU = b * (rho * L / S * cos + lam * L * sin) * I, pc = 100 * dU / U0;
      const out = { ok: true, res: [R('dU', 'Chute de tension ΔU', dU, 'V'), R('pc', 'ΔU en %', pc, '%')], fx: [`ΔU = b × (ρ × L / S × cos φ + λ × L × sin φ) × I`, `= ${b} × (${f(rho, 4)} × ${f(L)} / ${f(S)} × ${f(cos)} + 0,00008 × ${f(L)} × ${f(sin, 3)}) × ${f(I)} = ${f(dU)} V`, `ΔU % = 100 × ΔU / U0 = 100 × ${f(dU)} / ${f(U0)} = ${f(pc)} %`, `b = ${b} (${tri ? 'triphasé' : 'monophasé'}), λ = 0,08 mΩ/m (réactance linéique)`] };
      out.warn = pc > lim ? `Supérieur à la limite choisie (${f(lim)} %) : augmentez la section ou réduisez la longueur.` : `Inférieur à la limite choisie (${f(lim)} %).`; out.bad = pc > lim;
      // section minimale qui respecte la limite
      const Smin = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120].find((s) => 100 * b * (rho * L / s * cos + lam * L * sin) * I / U0 <= lim); if (Smin) out.res.push(R('Smin', 'Section normalisée suffisante', Smin, 'mm²'));
      return out;
    },
    moteur({ Pu, U, cos, eta, tri, I }) {
      Pu = n(Pu); U = n(U); cos = n(cos); eta = n(eta); I = n(I); tri = tri !== false && tri !== 'mono';
      if (!U || !cos || !eta) return { ok: false, msg: 'Indiquez U, cos φ et le rendement η.' }; const k = tri ? S3 : 1, kt = tri ? '√3 × ' : '';
      if (Pu != null) { const Pa = Pu / eta, In = Pa / (k * U * cos); return { ok: true, res: [R('Pa', 'Puissance absorbée Pa', Pa, 'W'), R('I', 'Courant nominal I', In, 'A'), R('pertes', 'Pertes', Pa - Pu, 'W'), R('cv', 'Puissance utile en chevaux', Pu / 736, 'ch')], fx: [`Pa = Pu / η = ${f(Pu)} / ${f(eta)} = ${f(Pa)} W`, `I = Pa / (${kt}U × cos φ) = ${f(Pa)} / (${kt}${f(U)} × ${f(cos)}) = ${f(In)} A`] }; }
      if (I != null) { const Pa = k * U * I * cos; return { ok: true, res: [R('Pa', 'Puissance absorbée Pa', Pa, 'W'), R('Pu', 'Puissance utile Pu', Pa * eta, 'W')], fx: [`Pa = ${kt}U × I × cos φ = ${f(Pa)} W`, `Pu = Pa × η = ${f(Pa * eta)} W`] }; }
      return { ok: false, msg: 'Indiquez la puissance utile Pu (plaque) ou le courant I.' };
    },
    facteur({ P, Q, S, cos2 }) {
      P = n(P); Q = n(Q); S = n(S); cos2 = n(cos2);
      if (P == null || (Q == null && S == null)) return { ok: false, msg: 'Indiquez P et Q, ou P et S.' };
      if (S == null) S = Math.sqrt(P * P + Q * Q); if (Q == null) Q = Math.sqrt(Math.max(0, S * S - P * P));
      if (!S) return { ok: false, msg: 'S ne peut pas être nul.' }; const cos = P / S;
      const out = { ok: true, res: [R('cos', 'Facteur de puissance cos φ', cos, ''), R('S', 'Puissance apparente S', S, 'VA'), R('tan', 'tan φ', P ? Q / P : null, '')], fx: [`S = √(P² + Q²) = ${f(S)} VA`, `cos φ = P / S = ${f(P)} / ${f(S)} = ${f(cos, 3)}`] };
      if (cos2 && cos2 > cos && cos2 <= 1) { const t1 = Q / P, t2 = Math.tan(Math.acos(cos2)), Qc = P * (t1 - t2); out.res.push(R('Qc', `Condensateurs pour atteindre cos φ = ${f(cos2)}`, Qc, 'var')); out.fx.push(`Qc = P × (tan φ1 − tan φ2) = ${f(P)} × (${f(t1, 3)} − ${f(t2, 3)}) = ${f(Qc)} var`); }
      out.warn = cos < 0.8 ? 'Facteur de puissance faible : une compensation (condensateurs) réduit le courant et les pertes.' : ''; return out;
    },
  };

  // ---------- écran ----------
  const IN = (k, label, unit, val = '', ph = '') => `<label>${esc(label)}${unit ? ` <small class="muted">(${esc(unit)})</small>` : ''}<input data-k="${k}" inputmode="decimal" value="${esc(val)}" placeholder="${esc(ph)}"></label>`;
  const SEL = (k, label, o, sel) => `<label>${esc(label)}<select data-k="${k}">${o.map(([v, l]) => `<option value="${v}"${v === sel ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const TRI = (sel = 'mono') => SEL('tri', 'Réseau', [['mono', 'Monophasé'], ['tri', 'Triphasé']], sel);
  const CARDS = [
    ['ohm', 'Loi d\'Ohm', 'U = R × I. Remplissez deux cases, la troisième est calculée.', () => `<div class="inrow">${IN('U', 'Tension U', 'V', '230')}${IN('R', 'Résistance R', 'Ω', '', 'ex. 529')}</div>${IN('I', 'Courant I', 'A')}`],
    ['puissances', 'Puissances active, réactive, apparente', 'P en watts (W), Q en voltampères réactifs (var), S en voltampères (VA).', () => `${TRI()}<div class="inrow">${IN('U', 'Tension U', 'V', '230')}${IN('I', 'Courant I', 'A', '10')}</div>${IN('cos', 'Facteur de puissance cos φ', '0 à 1', '0,85')}`],
    ['courant', 'Courant monophasé ou triphasé', 'Courant absorbé par un récepteur à partir de sa puissance.', () => `${TRI()}<div class="inrow">${IN('P', 'Puissance P', 'W', '2000')}${IN('U', 'Tension U', 'V', '230')}</div><div class="inrow">${IN('cos', 'cos φ', '0 à 1', '1')}${IN('eta', 'Rendement η', '0 à 1', '1')}</div>`],
    ['resistance', 'Calcul de résistance', 'Résistance d\'un conducteur (longueur, section, métal) ou d\'un récepteur (U et P).', () => `${SEL('mat', 'Métal', [['cu', 'Cuivre'], ['al', 'Aluminium']], 'cu')}<div class="inrow">${IN('L', 'Longueur L', 'm', '25')}${IN('S', 'Section S', 'mm²', '2,5')}</div><p class="small muted">ou pour un récepteur :</p><div class="inrow">${IN('U', 'Tension U', 'V')}${IN('P', 'Puissance P', 'W')}</div>`],
    ['chute', 'Chute de tension', 'Formule de la NF C 15-100 (à vérifier sur la norme en vigueur). Limites usuelles : 3 % éclairage, 5 % autres usages (réseau public BT).', () => `${TRI()}${SEL('mat', 'Métal', [['cu', 'Cuivre'], ['al', 'Aluminium']], 'cu')}<div class="inrow">${IN('L', 'Longueur (aller)', 'm', '30')}${IN('S', 'Section', 'mm²', '2,5')}</div><div class="inrow">${IN('I', 'Courant I', 'A', '16')}${IN('cos', 'cos φ', '0 à 1', '1')}</div><div class="inrow">${IN('U0', 'Tension simple U0', 'V', '230')}${IN('lim', 'Limite admise', '%', '3')}</div>`],
    ['moteur', 'Puissance d\'un moteur', 'La plaque indique la puissance utile Pu (mécanique). Le moteur absorbe Pa = Pu / η.', () => `${TRI('tri')}<div class="inrow">${IN('Pu', 'Puissance utile Pu', 'W', '2200')}${IN('U', 'Tension U', 'V', '400')}</div><div class="inrow">${IN('cos', 'cos φ', '0 à 1', '0,85')}${IN('eta', 'Rendement η', '0 à 1', '0,85')}</div>${IN('I', 'ou courant mesuré I', 'A')}`],
    ['facteur', 'Facteur de puissance et compensation', 'cos φ = P / S. Indiquez le cos φ souhaité pour calculer les condensateurs.', () => `<div class="inrow">${IN('P', 'Puissance active P', 'W', '10000')}${IN('Q', 'Puissance réactive Q', 'var', '7500')}</div><div class="inrow">${IN('S', 'ou apparente S', 'VA')}${IN('cos2', 'cos φ souhaité', '0 à 1', '0,93')}</div>`],
  ];
  function run(card) {
    const k = card.dataset.calc, a = {}; $$('[data-k]', card).forEach((i) => { a[i.dataset.k] = i.value; });
    if (a.tri) a.tri = a.tri === 'tri' ? true : 'mono';
    const r = C[k](a), box = $('.res', card);
    if (!r.ok) { box.innerHTML = `<span class="muted">${esc(r.msg)}</span>`; return; }
    box.innerHTML = r.res.map((x) => `<div>${esc(x.label)} : <b>${f(x.v, x.k === 'cos' ? 3 : 2)}</b> ${esc(x.unit)}</div>`).join('') + r.fx.map((x) => `<span class="fx">${esc(x)}</span>`).join('') + (r.warn ? `<div class="small ${r.bad ? 'err' : 'muted'}" style="margin-top:4px">${esc(r.warn)}</div>` : '');
  }
  function screen() {
    $('#main').innerHTML = `<div class="page"><div class="bar"><h1>🧮 Calculs électriques</h1></div><p class="muted">Les résultats se mettent à jour pendant la saisie. Les formules utilisées et les unités sont affichées sous chaque résultat. Utilisez la virgule ou le point pour les décimales.</p>
      <div class="calcgrid">${CARDS.map(([k, t, h, body]) => `<section class="card flat calc" data-calc="${k}"><h2>${esc(t)}</h2><p class="small muted">${esc(h)}</p>${body()}<div class="res"></div></section>`).join('')}</div>
      <p class="small muted">Résultats théoriques à but pédagogique ; les valeurs normatives (résistivités, limites de chute de tension, sections) sont à vérifier sur les textes en vigueur avant tout dimensionnement réel.</p></div>`;
    $$('.calc').forEach((c) => { $$('input,select', c).forEach((i) => (i.oninput = i.onchange = () => run(c))); run(c); });
  }
  EE.Calc = Object.assign(C, { fmt: f, num: n, RHO });
  EE.Screens = EE.Screens || {}; EE.Screens.calc = screen;
})(window);
