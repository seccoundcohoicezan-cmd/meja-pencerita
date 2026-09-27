/** Layar pembuka: tampil sekali per sesi browser, tidak memperlambat aplikasi. */
export function splashSelesai() {
  const el = document.getElementById('splash'); if (!el) return;
  const cepat = sessionStorage.getItem('mdnd-splash') || location.hash.startsWith('#k=') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (cepat) { el.remove(); return; }
  sessionStorage.setItem('mdnd-splash', '1');
  el.classList.add('show');
  const bar = el.querySelector('.splash-bar span');
  requestAnimationFrame(() => { bar.style.width = '100%'; });
  const tutup = () => { el.classList.add('hide'); setTimeout(() => el.remove(), 600); };
  setTimeout(tutup, 1500);
  el.addEventListener('click', tutup, { once: true });
}
