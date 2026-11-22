/* Yak-élec-pro – effet d'inclinaison 3D des cartes et symboles (souris/stylet ; désactivé au tactile et si « moins de mouvement ») */
(function (g) {
  'use strict';
  const reduce = g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  let cur = null;
  const reset = (el) => { if (!el) return; el.classList.remove('tilt'); el.style.transform = ''; };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest && e.target.closest('.card.act, .sym');
    if (cur && cur !== el) reset(cur);
    cur = el; if (!el) return;
    const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    el.classList.add('tilt');
    el.style.transform = `perspective(700px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) translateY(-4px) scale(1.02)`;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { reset(cur); cur = null; }, true);
  document.addEventListener('pointerdown', () => { if (cur) reset(cur); });
})(window);
