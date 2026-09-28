/** Titik masuk halaman GM. Bagian cloud (Supabase) dimuat terpisah supaya halaman tampil lebih cepat. */
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '../styles/app.css';
import '../styles/tema.css';
import './main.js';
import { initLayarSender } from './layar-sender.js';
import { splashSelesai } from '../shared/splash.js';

initLayarSender();
splashSelesai();

Promise.all([import('./cloud.js'), import('./moderator.js')])
  .then(([c, m]) => { c.initCloud(); m.initModerator(); })
  .catch(e => console.error('[cloud] gagal dimuat', e));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
