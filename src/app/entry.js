/** Titik masuk halaman GM. */
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/400-italic.css';
import '../styles/app.css';
import '../styles/tema.css';
import './main.js';
import { initCloud } from './cloud.js';
import { initLayarSender } from './layar-sender.js';
import { splashSelesai } from '../shared/splash.js';

initCloud();
initLayarSender();
splashSelesai();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
