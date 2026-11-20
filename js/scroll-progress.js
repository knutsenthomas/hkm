/* Tynn oransje lesestripe nederst i toppmenyen som viser hvor langt man har scrollet (som i kladden). */
(function () {
  'use strict';
  if (document.getElementById('hkm-scrollbar')) return;
  const bar = document.createElement('div');
  bar.id = 'hkm-scrollbar'; bar.setAttribute('aria-hidden', 'true');
  bar.style.cssText = 'position:fixed;left:0;top:0;height:3px;width:100%;background:#cc712b;transform-origin:0 50%;transform:scaleX(0);z-index:10001;pointer-events:none;transition:transform .08s linear';
  const add = () => document.body.appendChild(bar);
  if (document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  let raf = 0;
  function upd() {
    raf = 0;
    const head = document.getElementById('header');
    const hidden = document.documentElement.classList.contains('pv-lock') || !head || getComputedStyle(head).display === 'none';
    const b = head ? head.getBoundingClientRect().bottom : 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 40 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    bar.style.top = Math.max(0, Math.round(b) - 3) + 'px';
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    bar.style.opacity = hidden || p === 0 ? '0' : '1';
  }
  const q = () => { if (!raf) raf = requestAnimationFrame(upd); };
  addEventListener('scroll', q, { passive: true });
  addEventListener('resize', q, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(q).observe(document.documentElement);
  setInterval(q, 1000);
  q();
})();
