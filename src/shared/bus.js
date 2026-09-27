/** Penghubung sederhana antar modul (aplikasi GM ↔ cloud ↔ layar presentasi). */
const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
  emit(ev, ...a) { (handlers[ev] || []).forEach(fn => { try { fn(...a); } catch (e) { console.error('[bus]', ev, e); } }); },
  app: null, // diisi main.js: akses ke state & fungsi render
};
