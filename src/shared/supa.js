/** Klien Supabase bersama (GM & portal pemain). */
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

export const sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
});

/** Login Google; kembali ke halaman yang sama setelah selesai. */
export function loginGoogle() {
  return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
}
/** Login lewat tautan email (tanpa password). */
export function loginEmail(email) {
  return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
}
export const logout = () => sb.auth.signOut();

/** Pesan error yang bisa dipahami pengguna. */
export function pesanError(e) {
  const m = String((e && (e.message || e.error_description)) || e || '');
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Tidak ada koneksi internet. Data tetap aman di perangkat ini.';
  if (/JWT|expired|not authenticated|401/i.test(m)) return 'Sesi login berakhir. Silakan masuk lagi.';
  if (/row-level security|permission|403|42501/i.test(m)) return 'Akses ditolak oleh aturan keamanan database.';
  if (/rate limit|429|too many/i.test(m)) return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
  return m || 'Terjadi kesalahan.';
}
export function dataUrlToBlob(d) {
  const [h, b] = d.split(','); const mime = (h.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: mime });
}
export function blobToDataUrl(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
/** Kotak login (hanya Google). */
export function loginModalHtml(judul, ket) {
  return `<h2>${judul}</h2><p class="small">${ket}</p>
  <div class="actions" style="margin-top:4px"><button class="btn google-btn" id="lgGoogle" type="button">${GOOGLE_SVG} Masuk dengan Google</button></div>
  <div id="lgMsg" class="small" role="status"></div>
  <p class="small">Dengan masuk, kamu menyetujui <a href="/syarat" target="_blank" rel="noopener">Syarat Penggunaan</a> dan <a href="/privasi" target="_blank" rel="noopener">Kebijakan Privasi</a>.</p>`;
}
export const GOOGLE_SVG = '<svg class="g" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
export function bindLoginModal(el) {
  const b = el.querySelector('#lgGoogle'); if (!b) return;
  b.onclick = async () => { b.disabled = true; const { error } = await loginGoogle(); if (error) { b.disabled = false; el.querySelector('#lgMsg').textContent = pesanError(error); } };
}
/** Catat aksi ke log moderator (diam bila gagal / belum menjalankan SQL 003). */
export function catatAksi(aksi, detail = '') {
  try { sb.rpc('catat_aksi', { p_aksi: aksi, p_detail: String(detail).slice(0, 300) }).then(() => {}, () => {}); } catch (e) { /* abaikan */ }
}
/** Peran web: { moderator, pemilik, email }. Aman bila SQL 003 belum dijalankan. */
export async function peranSaya() {
  const { data, error } = await sb.rpc('peran_saya');
  if (error || !data) return { moderator: false, pemilik: false, email: '' };
  return data;
}
/** Buat kode undangan lewat database (GM pemilik campaign atau moderator). */
export async function buatUndangan(heroId, fotoUrl = null) {
  const { data, error } = await sb.rpc('buat_undangan', { p_hero: heroId, p_foto_url: fotoUrl });
  if (error) throw error; return data;
}
/** Tautan foto bertanda tangan (120 hari) supaya pemain tanpa login bisa melihat foto kartunya. */
export async function tautanFoto(path) {
  if (!path) return null;
  const { data, error } = await sb.storage.from('foto').createSignedUrl(path, 60 * 60 * 24 * 120);
  return error ? null : data.signedUrl;
}
/** Pesan WhatsApp siap kirim untuk pemain. */
export function pesanUndangan(namaHero, namaCampaign, kode) {
  const link = `${location.origin}/portal?kode=${kode}`;
  return { link, teks: `Halo *${namaHero}*! 🎲\nIni kartu karaktermu di campaign *${namaCampaign}*.\n\nBuka link ini (tanpa login): ${link}\n\nAtau buka ${location.origin}/portal lalu ketik kode: *${kode}*\n\nKode berlaku sampai sesi/bab ini selesai. Jangan bagikan ke orang lain.` };
}
