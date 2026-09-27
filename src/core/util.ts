/** Utilitas umum yang dipakai semua halaman. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
/** Ubah nilai apa pun ke angka; kembalikan `d` bila bukan angka. */
export const num = (v: unknown, d = 0): number => { const n = parseFloat(v as string); return isNaN(n) ? d : n; };
export const sum = (a: number[]): number => a.reduce((x, y) => x + y, 0);
export const uid = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const uuid = (): string =>
  (globalThis.crypto && 'randomUUID' in crypto) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16); });
export const isUuid = (s: unknown): boolean =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
export function slug(s: unknown): string {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 20);
}
/** Normalisasi label formulir: huruf kecil, tanpa isi kurung, tanpa simbol. */
export const normL = (s: unknown): string => String(s).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]/g, '');
export const pad2 = (n: number): string => n === 100 ? '100' : String(n).padStart(2, '0');
export const fmtMod = (v: number): string => (v >= 0 ? '+' : '−') + Math.abs(v);
