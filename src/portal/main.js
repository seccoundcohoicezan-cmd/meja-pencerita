/**
 * Portal Pemain: pemain wajib masuk (Google/email), memakai kode undangan dari GM,
 * lalu HANYA bisa melihat kartu & foto pahlawannya, kondisi terkini (real-time), dan rekap yang diterbitkan GM.
 */
import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '../styles/app.css';
import '../styles/tema.css';
import '../styles/portal.css';
import { sb, pesanError, loginModalHtml, bindLoginModal, logout, blobToDataUrl } from '../shared/supa';
import { drawCard, dlCanvas } from '../core/card';
import { esc, slug } from '../core/util';

const $ = id => document.getElementById(id);
const KODE = 'mdnd-kode-undangan';
let user = null; let kanal = [];
const GENRE_NAMA = { fantasy: 'Fantasy', archive: 'Archive', apocalyptic: 'Apocalyptic', zombies: 'Zombies', cyberpunk: 'Cyberpunk', mystery: 'Mystery', custom: 'Custom' };

function toast(m, bad) { const t = $('toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 4500); }
window.closeModal = () => $('modal').classList.remove('show');

// simpan kode dari link supaya tetap ada setelah proses login
const q = new URLSearchParams(location.search);
if (q.get('kode')) { localStorage.setItem(KODE, q.get('kode').toUpperCase().trim()); history.replaceState(null, '', '/portal'); }

function renderAkun() {
  const el = $('akunBox');
  if (!user) { el.innerHTML = ''; return; }
  const m = user.user_metadata || {}; const av = m.avatar_url || '/img/avatar.webp';
  el.innerHTML = `<div class="akun-btn"><img src="${esc(av)}" alt="" referrerpolicy="no-referrer" onerror="this.src='/img/avatar.webp'"><span><b>${esc(m.full_name || m.name || (user.email || '').split('@')[0])}</b><small>Pemain</small></span></div><button class="dbtn" id="pLogout" type="button">Keluar</button>`;
  $('pLogout').onclick = () => logout();
}
function halamanMasuk() {
  const kode = localStorage.getItem(KODE);
  $('pMain').innerHTML = `<section class="portal-hero"><img src="/img/splash.webp" alt="" class="ph-art">
    <div class="panel ph-login">${loginModalHtml('Masuk ke Portal Pemain', kode ? `Kode undangan <b>${esc(kode)}</b> sudah tersimpan. Masuk dengan akunmu untuk menghubungkannya ke pahlawanmu.` : 'Masuk dengan akunmu, lalu masukkan kode undangan dari Game Master.')}</div></section>`;
  bindLoginModal($('pMain'));
}
async function pakaiKode(kode) {
  const { data, error } = await sb.rpc('terima_undangan', { p_kode: kode });
  if (error) throw error; localStorage.removeItem(KODE); return data;
}
function formKode(pesan) {
  return `<div class="panel"><h2>Punya kode undangan?</h2><p class="small">${pesan || 'Minta Game Master membuat undangan dari kartu pahlawanmu, lalu tulis kodenya di sini.'}</p>
    <div class="row"><input class="s kode-in" id="pKode" placeholder="contoh: K7M2QX9A" maxlength="12" autocapitalize="characters" style="flex:1"><button class="btn" id="pKodeBtn" type="button">Hubungkan</button></div><div id="pKodeMsg" class="small"></div></div>`;
}
function bindKode() {
  const b = $('pKodeBtn'); if (!b) return;
  b.onclick = async () => {
    const k = $('pKode').value.trim().toUpperCase(); if (k.length < 6) { $('pKodeMsg').textContent = 'Kode terlalu pendek.'; return; }
    $('pKodeMsg').textContent = 'Menghubungkan…';
    try { await pakaiKode(k); toast('Berhasil terhubung ke pahlawanmu.'); muat(); } catch (e) { $('pKodeMsg').textContent = pesanError(e); }
  };
}
function statusHtml(st, tn) {
  if (!st || !st.session_id) return `<p class="small">Belum ada sesi berjalan. Kondisi akan muncul di sini saat GM memulai sesi.</p>`;
  const hati = Array.from({ length: st.hati_maks }, (_, i) => `<i class="${i < st.hati ? 'on' : ''}">♥</i>`).join('');
  return `<div class="st-grid"><div><small>${esc(tn)}</small><div class="st-hati">${st.gugur ? '☠ Gugur' : hati}</div><b>${st.gugur ? '' : `${st.hati} / ${st.hati_maks}`}${st.tumbang && !st.gugur ? ' · Tumbang' : ''}</b></div>
    <div><small>Skill Khusus tersisa</small><div class="st-dots">${[0, 1, 2].map(i => `<span class="dot ${i < st.skill_sisa ? '' : 'used'}"></span>`).join('')}</div><b>${st.skill_sisa} / 3</b></div></div>
    ${(st.lencana || []).length ? `<p class="st-lencana">${st.lencana.map(l => `<span class="badge">${esc(l)}</span>`).join(' ')}</p>` : ''}
    <p class="small st-waktu">Diperbarui ${new Date(st.updated_at).toLocaleString('id-ID')}</p>`;
}
async function muat() {
  kanal.forEach(c => sb.removeChannel(c)); kanal = [];
  $('pMain').innerHTML = `<div class="panel"><p>Memuat pahlawanmu…</p></div>`;
  const pending = localStorage.getItem(KODE); let pesanKode = '';
  if (pending) { try { await pakaiKode(pending); toast('Kode undangan berhasil dipakai.'); } catch (e) { pesanKode = `Kode <b>${esc(pending)}</b>: ${esc(pesanError(e))}`; localStorage.removeItem(KODE); } }
  const { data: list, error } = await sb.rpc('portal_campaigns');
  if (error) { $('pMain').innerHTML = `<div class="warn">${esc(pesanError(error))}</div>`; return; }
  if (!list || !list.length) { $('pMain').innerHTML = `<div class="page-head"><img src="/img/ikon-192.png" alt="" class="emblem"><div><h1>Selamat datang</h1><p>Akunmu belum terhubung ke pahlawan mana pun.</p></div></div>${formKode(pesanKode)}`; bindKode(); return; }
  $('pMain').innerHTML = `<div class="page-head"><img src="/img/ikon-192.png" alt="" class="emblem"><div><h1>Pahlawanku</h1><p>Kartu, kondisi terkini, dan rekap cerita dari Game Master.</p></div></div>
    ${pesanKode ? `<div class="warn">${pesanKode}</div>` : ''}<div id="pHeroes"></div>${formKode('Diundang ke campaign lain? Tulis kodenya di sini.')}`;
  bindKode();
  for (const c of list) await kartuHero(c);
}
async function kartuHero(c) {
  const wrap = document.createElement('section'); wrap.className = 'p-hero'; $('pHeroes').appendChild(wrap);
  const { data: h, error } = await sb.from('heroes').select('id,data,foto_path').eq('id', c.hero_id).maybeSingle();
  if (error || !h) { wrap.innerHTML = `<div class="warn">Pahlawan di campaign "${esc(c.nama)}" tidak ditemukan. Minta GM mengundang ulang.</div>`; return; }
  const cd = (h.data && h.data.kartu) || null; const nama = (h.data && h.data.nama) || 'Pahlawan'; const tn = (cd && cd.tn) || 'Nyawa';
  wrap.innerHTML = `<div class="panel p-head"><h2>${esc(nama)}</h2><p class="small">${esc(c.nama)} · ${esc(GENRE_NAMA[c.genre] || c.genre)} · Bab ${esc(c.bab_aktif)}</p></div>
    <div class="p-grid"><div class="p-card"><div class="p-card-img" id="img-${h.id}"><span>Menyiapkan kartu…</span></div><div class="actions"><button class="btn" id="dl-${h.id}" type="button" disabled>Unduh kartu (PNG)</button></div></div>
    <div class="p-side"><div class="panel"><h3>Kondisi terkini <span class="live" title="Diperbarui otomatis">● langsung</span></h3><div id="st-${h.id}"><p class="small">Memuat…</p></div></div>
    <div class="panel"><h3>Rekap cerita</h3><div id="rk-${h.id}"><p class="small">Memuat…</p></div></div></div></div>`;
  // kartu + foto
  let foto = null;
  if (h.foto_path) { const r = await sb.storage.from('foto').download(h.foto_path); if (!r.error && r.data) foto = await blobToDataUrl(r.data); }
  if (cd) {
    const cv = await drawCard(cd, foto); const img = new Image(); img.src = cv.toDataURL('image/png'); img.alt = `Kartu karakter ${nama}`;
    $('img-' + h.id).innerHTML = ''; $('img-' + h.id).appendChild(img);
    const dl = $('dl-' + h.id); dl.disabled = false; dl.onclick = () => dlCanvas(cv, `kartu-${slug(nama) || 'karakter'}.png`);
  } else $('img-' + h.id).innerHTML = `<span class="small">Kartu belum tersedia. Minta GM membuka campaign agar tersinkron.</span>`;
  // status (real-time)
  const muatStatus = async () => { const { data } = await sb.from('hero_status').select('*').eq('hero_id', h.id).maybeSingle(); $('st-' + h.id).innerHTML = statusHtml(data, tn); };
  const muatRekap = async () => {
    const { data } = await sb.from('session_recaps').select('judul,teks,terbit_at').eq('campaign_id', c.campaign_id).eq('terbit', true).order('terbit_at', { ascending: false });
    $('rk-' + h.id).innerHTML = data && data.length ? data.map((r, i) => `<details class="rekap" ${i === 0 ? 'open' : ''}><summary><b>${esc(r.judul)}</b> <span class="small">${new Date(r.terbit_at).toLocaleDateString('id-ID')}</span></summary><div class="rekap-teks">${esc(r.teks).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>')}</div></details>`).join('')
      : '<p class="small">Belum ada rekap. GM akan menerbitkannya setelah sesi selesai.</p>';
  };
  await muatStatus(); await muatRekap();
  kanal.push(sb.channel('st-' + h.id).on('postgres_changes', { event: '*', schema: 'public', table: 'hero_status', filter: `hero_id=eq.${h.id}` }, muatStatus).subscribe());
  kanal.push(sb.channel('rk-' + h.id).on('postgres_changes', { event: '*', schema: 'public', table: 'session_recaps', filter: `campaign_id=eq.${c.campaign_id}` }, muatRekap).subscribe());
}

let terakhir = undefined;
sb.auth.onAuthStateChange((ev, session) => {
  const u = session ? session.user : null; if ((u && u.id) === terakhir) return; terakhir = u && u.id; user = u; renderAkun();
  if (!user) { kanal.forEach(c => sb.removeChannel(c)); kanal = []; halamanMasuk(); } else setTimeout(muat, 0);
});
