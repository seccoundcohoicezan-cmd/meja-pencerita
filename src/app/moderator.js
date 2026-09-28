/**
 * Panel Moderator: log aksi seluruh web + kelola akses moderator.
 * Keamanan ada di database (SQL 003): tampilan ini hanya pembungkus.
 */
import { sb, pesanError } from '../shared/supa';
import { bus } from '../shared/bus';
import { esc } from '../core/util';

const A = () => bus.app;
const $ = id => document.getElementById(id);
const PER_HAL = 50;

export const LABEL_AKSI = {
  masuk: 'Masuk', keluar: 'Keluar', buat_campaign: 'Buat campaign', hapus_campaign: 'Hapus campaign',
  sesi_mulai: 'Mulai sesi', sesi_selesai: 'Sesi selesai', terbit_rekap: 'Terbitkan rekap',
  buat_undangan: 'Buat undangan', pakai_undangan: 'Pemain bergabung', putus_pemain: 'Putus pemain',
  tambah_moderator: 'Tambah moderator', hapus_moderator: 'Cabut moderator', hapus_akun: 'Hapus akun',
  buka_portal: 'Buka portal', simpan_file: 'Simpan ke file', buka_file: 'Buka file',
};
const WARNA = { hapus_campaign: 'merah', hapus_akun: 'merah', putus_pemain: 'merah', hapus_moderator: 'merah', tambah_moderator: 'emas', pakai_undangan: 'hijau', buat_undangan: 'hijau' };

let tab = 'log';
let akhir = null; // waktu baris terakhir (untuk "muat lebih lama")

function peran() { return A().peran || {}; }

function render() {
  const el = $('modPanel'); if (!el) return;
  const p = peran();
  if (!A().user || !A().user()) { el.innerHTML = `<div class="panel"><h2>Moderator</h2><p>Masuk dulu dengan akun moderator.</p></div>`; return; }
  if (!p.moderator) { el.innerHTML = `<div class="panel"><h2>Moderator</h2><p>Akun ini bukan moderator. Minta pemilik web menambahkan emailmu.</p></div>`; return; }
  el.innerHTML = `<div class="seg" role="tablist">
      <button class="seg-b ${tab === 'log' ? 'on' : ''}" data-mtab="log" type="button">Log aksi</button>
      <button class="seg-b ${tab === 'akses' ? 'on' : ''}" data-mtab="akses" type="button">Kelola akses</button>
      <a class="seg-b" href="/portal#undang">Undang pemain ↗</a></div>
    <div id="modIsi"></div>`;
  el.querySelectorAll('[data-mtab]').forEach(b => b.onclick = () => { tab = b.dataset.mtab; render(); });
  if (tab === 'log') renderLog(); else renderAkses();
}

/* ---------------- LOG AKSI ---------------- */
function renderLog() {
  $('modIsi').innerHTML = `<div class="panel">
    <h2>Log aksi</h2><p class="small">Semua aksi penting di web, terbaru di atas.</p>
    <div class="row"><select class="s" id="lgJenis"><option value="">Semua aksi</option>${Object.entries(LABEL_AKSI).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <input class="s" id="lgCari" type="search" placeholder="Cari email…" style="flex:1;min-width:140px"><button class="btn alt" id="lgMuat" type="button">Tampilkan</button></div>
    <div id="lgList" class="loglist"><p class="small">Memuat…</p></div>
    <div class="actions"><button class="dbtn" id="lgLagi" type="button" hidden>Muat lebih lama</button></div></div>`;
  $('lgMuat').onclick = () => muatLog(true);
  $('lgCari').onkeydown = e => { if (e.key === 'Enter') muatLog(true); };
  $('lgJenis').onchange = () => muatLog(true);
  $('lgLagi').onclick = () => muatLog(false);
  muatLog(true);
}
function baris(r) {
  const t = new Date(r.at);
  return `<div class="lg-row ${WARNA[r.aksi] || ''}"><time>${t.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</time>
    <b>${esc(LABEL_AKSI[r.aksi] || r.aksi)}</b><span class="lg-siapa">${esc(r.email || 'tanpa akun')}</span>${r.detail ? `<span class="lg-det">${esc(r.detail)}</span>` : ''}</div>`;
}
async function muatLog(baru) {
  const list = $('lgList'); if (!list) return;
  if (baru) { akhir = null; list.innerHTML = '<p class="small">Memuat…</p>'; }
  let q = sb.from('log_aksi').select('at,email,aksi,detail').order('at', { ascending: false }).limit(PER_HAL);
  const j = $('lgJenis').value; const c = $('lgCari').value.trim().toLowerCase();
  if (j) q = q.eq('aksi', j);
  if (c) q = q.ilike('email', `%${c.replace(/[%_]/g, '')}%`);
  if (akhir) q = q.lt('at', akhir);
  const { data, error } = await q;
  if (error) { list.innerHTML = `<div class="warn">${esc(pesanError(error))}${/log_aksi|does not exist/i.test(error.message) ? ' — jalankan file supabase/003_moderator.sql di Supabase.' : ''}</div>`; return; }
  if (baru) list.innerHTML = '';
  if (!data.length && baru) list.innerHTML = '<p class="small">Belum ada catatan.</p>';
  list.insertAdjacentHTML('beforeend', data.map(baris).join(''));
  if (data.length) akhir = data[data.length - 1].at;
  $('lgLagi').hidden = data.length < PER_HAL;
}

/* ---------------- KELOLA AKSES ---------------- */
async function renderAkses() {
  const p = peran();
  $('modIsi').innerHTML = `<div class="panel"><h2>Kelola akses moderator</h2>
    <p class="small">Moderator bisa melihat log aksi dan mengundang/memutus pemain di semua campaign.${p.pemilik ? '' : ' Hanya pemilik web yang bisa menambah atau mencabut moderator.'}</p>
    ${p.pemilik ? `<div class="row"><input class="s" type="email" id="mdEmail" placeholder="email@contoh.com" autocomplete="off" style="flex:1;min-width:180px"><button class="btn" id="mdTambah" type="button">Jadikan moderator</button></div><div id="mdMsg" class="small"></div>` : ''}
    <div id="mdList" class="loglist"><p class="small">Memuat…</p></div></div>`;
  if (p.pemilik) {
    const tambah = async () => {
      const e = $('mdEmail').value.trim().toLowerCase(); const msg = $('mdMsg');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { msg.textContent = 'Tulis alamat email yang benar.'; return; }
      msg.textContent = 'Menyimpan…';
      const { error } = await sb.rpc('mod_tambah', { p_email: e });
      if (error) { msg.textContent = pesanError(error); return; }
      msg.textContent = `✅ ${e} sekarang moderator. Ia perlu keluar lalu masuk lagi.`; $('mdEmail').value = ''; muatModerator();
    };
    $('mdTambah').onclick = tambah; $('mdEmail').onkeydown = ev => { if (ev.key === 'Enter') tambah(); };
  }
  muatModerator();
}
async function muatModerator() {
  const p = peran(); const el = $('mdList'); if (!el) return;
  const { data, error } = await sb.from('moderators').select('email,ditambah_oleh,created_at').order('created_at');
  if (error) { el.innerHTML = `<div class="warn">${esc(pesanError(error))}</div>`; return; }
  el.innerHTML = `<div class="lg-row emas"><b>🔒 ${esc(p.email_pemilik || 'pemilik')}</b><span class="lg-siapa">Pemilik web · terkunci</span></div>` +
    data.map(m => `<div class="lg-row"><b>${esc(m.email)}</b><span class="lg-siapa">sejak ${new Date(m.created_at).toLocaleDateString('id-ID')}</span>
      ${p.pemilik ? `<button class="dbtn red" data-cabut="${esc(m.email)}" type="button">Cabut</button>` : ''}</div>`).join('') +
    (data.length ? '' : '<p class="small">Belum ada moderator lain.</p>');
  el.querySelectorAll('[data-cabut]').forEach(b => b.onclick = async () => {
    if (!confirm(`Cabut akses moderator dari ${b.dataset.cabut}?`)) return;
    const { error: er } = await sb.rpc('mod_hapus', { p_email: b.dataset.cabut });
    if (er) A().toast(pesanError(er), true); else { A().toast('Akses moderator dicabut.'); muatModerator(); }
  });
}

export function initModerator() {
  bus.on('tab', p => { if (p === 'moderator') render(); });
  bus.on('peran', () => { if ($('p-moderator') && $('p-moderator').classList.contains('active')) render(); });
  if ($('p-moderator') && $('p-moderator').classList.contains('active')) render();
}
