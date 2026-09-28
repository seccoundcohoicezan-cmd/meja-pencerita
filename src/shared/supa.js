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
/** Modal login yang dipakai halaman GM dan portal. */
export function loginModalHtml(judul, ket) {
  return `<h2>${judul}</h2><p class="small">${ket}</p>
  <div class="actions" style="margin-top:4px"><button class="btn google-btn" id="lgGoogle" type="button"><span class="g">G</span> Masuk dengan Google</button></div>
  <div class="or"><span>atau lewat email</span></div>
  <div class="row"><input class="s" type="email" id="lgEmail" placeholder="nama@email.com" autocomplete="email" style="flex:1"><button class="btn alt" id="lgKirim" type="button">Kirim tautan masuk</button></div>
  <div id="lgMsg" class="small"></div>
  <p class="small">Dengan masuk, kamu menyetujui <a href="/syarat" target="_blank" rel="noopener">Syarat Penggunaan</a> dan <a href="/privasi" target="_blank" rel="noopener">Kebijakan Privasi</a>.</p>`;
}
export function bindLoginModal(el) {
  el.querySelector('#lgGoogle').onclick = async () => { const { error } = await loginGoogle(); if (error) el.querySelector('#lgMsg').textContent = pesanError(error); };
  el.querySelector('#lgKirim').onclick = async () => {
    const em = el.querySelector('#lgEmail').value.trim(); const msg = el.querySelector('#lgMsg');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { msg.textContent = 'Tulis alamat email yang benar.'; return; }
    msg.textContent = 'Mengirim…'; const { error } = await loginEmail(em);
    msg.textContent = error ? pesanError(error) : `Tautan masuk dikirim ke ${em}. Buka email itu di perangkat ini, lalu klik tautannya.`;
  };
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
export async function buatUndangan(heroId) {
  const { data, error } = await sb.rpc('buat_undangan', { p_hero: heroId });
  if (error) throw error; return data;
}
/** Pesan WhatsApp siap kirim untuk pemain. */
export function pesanUndangan(namaHero, namaCampaign, kode) {
  const link = `${location.origin}/portal?kode=${kode}`;
  return { link, teks: `Halo *${namaHero}*! 🎲\nKamu diundang ke campaign *${namaCampaign}* di MasteryDnD.\n\n1. Buka link ini: ${link}\n2. Masuk dengan Google atau email\n3. Selesai! Kartu karaktermu langsung muncul.\n\nKode undangan: *${kode}* (berlaku 14 hari, hanya untuk 1 akun)` };
}
