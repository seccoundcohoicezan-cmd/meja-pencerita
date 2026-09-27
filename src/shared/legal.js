import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '../styles/app.css';
import '../styles/tema.css';
import '../styles/portal.css';
import { CONFIG } from './config';
const k = CONFIG.kontak;
document.querySelectorAll('[data-kontak]').forEach(el => {
  el.innerHTML = k ? `<a href="mailto:${k}">${k}</a>` : '(email kontak belum diisi — atur VITE_KONTAK_EMAIL)';
});
