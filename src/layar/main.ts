/** Layar Presentasi: hanya latar, narasi yang dibacakan, kondisi party, dan hasil yang sudah diterapkan. */
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '../styles/layar.css';
import { esc } from '../core/util';

type Msg = Record<string, any>;
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const WAKTU = (w: string) => { const t = String(w || '').toLowerCase(); return /tengah malam|dini/.test(t) ? '🌑' : /malam/.test(t) ? '🌙' : /senja|sore/.test(t) ? '🌇' : /pagi|fajar|subuh/.test(t) ? '🌅' : /siang/.test(t) ? '☀️' : '🕰️'; };
let hasilTimer = 0;

function scene(m: Msg) {
  $('lyKosong').hidden = true; const el = $('lyScene'); el.hidden = false;
  document.documentElement.style.setProperty('--acc', m.acc || '#d9a441');
  if (m.type === 'ending') {
    el.innerHTML = `<p class="ly-cerita">${esc(m.cerita)}</p><h1>${esc(m.judul)}</h1><div class="ly-narasi">${String(m.epilog || '').split(/\n\s*\n/).map(p => `<p>${esc(p)}</p>`).join('')}</div>`;
  } else {
    const l = m.latar || {};
    el.innerHTML = `<p class="ly-cerita">${esc(m.cerita)} · Adegan ${esc(m.no)}</p><h1>${esc(m.judul)}</h1>
      <p class="ly-latar">${[l.tempat, l.waktu ? `${WAKTU(l.waktu)} ${l.waktu}` : '', l.cuaca].filter(Boolean).map(esc).join(' · ')}</p>
      ${l.suasana ? `<p class="ly-suasana">${esc(l.suasana)}</p>` : ''}
      <div class="ly-narasi">${String(m.narasi || '').split(/\n\s*\n/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>`;
  }
  el.scrollTop = 0; $('lyHasil').hidden = true;
}
async function fotoDari(key: string): Promise<string | null> {
  return new Promise(res => {
    try {
      const r = indexedDB.open('meja-pencerita', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('foto');
      r.onsuccess = () => { try { const q = r.result.transaction('foto', 'readonly').objectStore('foto').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } };
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
async function party(m: Msg) {
  const hs = (m.heroes || []) as Msg[];
  $('lyParty').innerHTML = hs.map(h => `<div class="ly-hero ${h.gugur ? 'gugur' : h.tumbang ? 'tumbang' : ''}" data-key="${esc(m.genre + '|' + h.uid)}">
    <div class="ly-foto"><span>${esc(String(h.nama || '?').charAt(0))}</span></div><div><b>${esc(h.nama)}</b>
    <div class="ly-hati">${h.gugur ? '☠ Gugur' : Array.from({ length: h.maks }, (_, i) => `<i class="${i < h.hati ? 'on' : ''}">♥</i>`).join('')}</div></div></div>`).join('')
    + (hs.length ? `<div class="ly-stack"><small>${esc(m.stack || 'Stack')}</small><b>${esc(m.sb)}</b></div>` : '');
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('.ly-hero'))) {
    const d = await fotoDari(el.dataset.key || ''); if (d) (el.querySelector('.ly-foto') as HTMLElement).innerHTML = `<img src="${d}" alt="">`;
  }
}
function hasil(m: Msg) {
  const el = $('lyHasil'); el.className = 'ly-hasil ' + (m.cls || ''); el.hidden = false;
  el.innerHTML = `<h2>${esc(m.judul)}</h2>${m.teks ? `<p>${esc(m.teks)}</p>` : ''}`;
  clearTimeout(hasilTimer); hasilTimer = window.setTimeout(() => { el.hidden = true; }, 14000);
}
function tirai(on: boolean) { $('lyTirai').hidden = !on; }
function terima(m: Msg) {
  if (!m || !m.type) return;
  if (m.type === 'scene' || m.type === 'ending') scene(m);
  else if (m.type === 'party') party(m);
  else if (m.type === 'hasil') hasil(m);
  else if (m.type === 'tirai') tirai(!!m.on);
  else if (m.type === 'semua') muat(m.state);
}
function muat(st: Msg | null) {
  if (!st) return; if (st.scene) scene(st.scene); if (st.party) party(st.party); if (st.hasil && Date.now() - st.hasil.at < 14000) hasil(st.hasil); tirai(!!st.tirai);
}
try { muat(JSON.parse(localStorage.getItem('masterydnd-layar-state') || 'null')); } catch (e) { /* kosong */ }
if ('BroadcastChannel' in window) { const ch = new BroadcastChannel('masterydnd-layar'); ch.onmessage = e => terima(e.data); ch.postMessage({ type: 'minta' }); }
else (window as Window).addEventListener('storage', (e: StorageEvent) => { if (e.key === 'masterydnd-layar-state' && e.newValue) { try { muat(JSON.parse(e.newValue)); } catch (x) { /* abaikan */ } } });
$('lyFull').onclick = () => document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
document.addEventListener('dblclick', () => { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); });
