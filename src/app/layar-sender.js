/** Mengirim tampilan ke jendela Layar Presentasi (TV/proyektor) di perangkat yang sama. */
import { bus } from '../shared/bus';

const KANAL = 'masterydnd-layar';
const SIMPAN = 'masterydnd-layar-state';
let ch = null; let win = null;
const state = { scene: null, party: null, hasil: null, tirai: false };

function kirim(msg) {
  if (msg.type === 'scene' || msg.type === 'ending') { state.scene = msg; state.hasil = null; }
  if (msg.type === 'party') state.party = msg;
  if (msg.type === 'hasil') state.hasil = Object.assign({ at: Date.now() }, msg);
  if (msg.type === 'tirai') state.tirai = !!msg.on;
  try { localStorage.setItem(SIMPAN, JSON.stringify(state)); } catch (e) { /* abaikan */ }
  if (ch) ch.postMessage(msg);
}
export function initLayarSender() {
  if ('BroadcastChannel' in window) {
    ch = new BroadcastChannel(KANAL);
    ch.onmessage = e => { if (e.data && e.data.type === 'minta') ch.postMessage({ type: 'semua', state }); };
  }
  bus.on('scene', m => kirim(m));
  bus.on('party', m => kirim(m));
  bus.on('bukaLayar', () => {
    if (win && !win.closed) { win.focus(); return; }
    win = window.open('/layar', 'masterydnd-layar', 'popup,width=1280,height=720');
    if (!win) bus.app.toast('Browser memblokir jendela baru. Izinkan pop-up untuk situs ini, atau buka /layar di tab lain.', true, 7000);
    else bus.app.toast('Seret jendela Layar ke TV/proyektor, lalu tekan F11 untuk layar penuh.', false, 6000);
  });
}
