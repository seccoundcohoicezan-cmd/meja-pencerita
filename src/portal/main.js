/**
 * Portal Pemain.
 *  - Pemain  : masuk, pakai kode undangan, lalu melihat kartu, kondisi terkini (langsung), dan rekap.
 *  - GM      : bagian "Undang Pemain" untuk campaign miliknya.
 *  - Moderator: bagian "Undang Pemain" untuk SEMUA campaign (buat kode & putus pemain).
 * Semua hak akses dijaga database (lihat supabase/003_moderator.sql).
 */
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '../styles/app.css';
import '../styles/tema.css';
import '../styles/portal.css';
import { sb, pesanError, loginModalHtml, bindLoginModal, logout, blobToDataUrl, catatAksi, peranSaya, buatUndangan, pesanUndangan } from '../shared/supa';
import { drawCard, dlCanvas } from '../core/card';
import { esc, slug } from '../core/util';

const $ = id => document.getElementById(id);
const KODE = 'mdnd-kode-undangan';
const GENRE_NAMA = { fantasy: 'Fantasy', archive: 'Archive', apocalyptic: 'Apocalyptic', zombies: 'Zombies', cyberpunk: 'Cyberpunk', mystery: 'Mystery', custom: 'Custom' };
let user = null; let kanal = []; let peran = { moderator: false };
let data = { pahlawan: [], kelola: [], pesanKode: '' };
let view = null; let riwayatN = 0; let filter = '';

function toast(m, bad) { const t = $('toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 4500); }
function modal(html) { $('modalBody').innerHTML = '<button class="modal-x" type="button" aria-label="Tutup" onclick="closeModal()">✕</button>' + html; $('modal').classList.add('show'); }
window.closeModal = () => $('modal').classList.remove('show');
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') window.closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') window.closeModal(); });

// simpan kode dari link supaya tetap ada setelah proses login
const q = new URLSearchParams(location.search);
if (q.get('kode')) { localStorage.setItem(KODE, q.get('kode').toUpperCase().trim()); history.replaceState(null, '', '/portal'); }

/* ---------- tombol kembali ---------- */
$('pBack').onclick = e => {
  if (riwayatN > 0) { e.preventDefault(); history.back(); return; }
  const ref = document.referrer;
  if (ref && ref.startsWith(location.origin) && !ref.includes('/portal')) { e.preventDefault(); history.back(); }
  // selain itu: ikuti href="/" (Meja Pencerita)
};
window.addEventListener('popstate', e => {
  window.closeModal(); const st = e.state || {}; riwayatN = st.n || 0;
  const v = st.v || location.hash.slice(1); if (user && v && v !== view && tersedia().includes(v)) tampil(v, true);
});

function renderAkun() {
  const el = $('akunBox');
  if (!user) { el.innerHTML = ''; return; }
  const m = user.user_metadata || {}; const av = m.avatar_url || '/img/avatar.webp';
  const lbl = peran.pemilik ? 'Pemilik' : peran.moderator ? 'Moderator' : data.kelola.some(r => r.milik_saya) ? 'Game Master' : 'Pemain';
  el.innerHTML = `<div class="akun-btn"><img src="${esc(av)}" alt="" referrerpolicy="no-referrer" onerror="this.src='/img/avatar.webp'"><span><b>${esc(m.full_name || m.name || (user.email || '').split('@')[0])}</b><small>${lbl}</small></span></div><button class="dbtn" id="pLogout" type="button">Keluar</button>`;
  $('pLogout').onclick = async () => { catatAksi('keluar', 'Portal'); await logout(); };
}
function halamanMasuk() {
  const kode = localStorage.getItem(KODE);
  $('pMain').innerHTML = `<section class="portal-hero"><img src="/img/splash.webp" alt="" class="ph-art">
    <div class="panel ph-login">${loginModalHtml('Masuk ke Portal Pemain', kode ? `Kode undangan <b>${esc(kode)}</b> sudah tersimpan. Masuk dulu, lalu kartumu langsung muncul.` : 'Masuk dengan akunmu. Pemain: siapkan kode undangan dari GM. GM & moderator: masuk untuk mengundang pemain.')}</div></section>`;
  bindLoginModal($('pMain'));
}
async function pakaiKode(kode) {
  const { data: d, error } = await sb.rpc('terima_undangan', { p_kode: kode });
  if (error) throw error; localStorage.removeItem(KODE); return d;
}
function formKode(pesan) {
  return `<div class="panel"><h2>Punya kode undangan?</h2><p class="small">${pesan || 'Tulis kode dari Game Master di sini.'}</p>
    <div class="row"><input class="s kode-in" id="pKode" placeholder="contoh: K7M2QX9A" maxlength="12" autocapitalize="characters" style="flex:1"><button class="btn" id="pKodeBtn" type="button">Hubungkan</button></div><div id="pKodeMsg" class="small"></div></div>`;
}
function bindKode() {
  const b = $('pKodeBtn'); if (!b) return;
  const jalan = async () => {
    const k = $('pKode').value.trim().toUpperCase(); if (k.length < 6) { $('pKodeMsg').textContent = 'Kode terlalu pendek.'; return; }
    $('pKodeMsg').textContent = 'Menghubungkan…';
    try { await pakaiKode(k); toast('Berhasil terhubung ke pahlawanmu.'); view = 'pahlawan'; muat(); } catch (e) { $('pKodeMsg').textContent = pesanError(e); }
  };
  b.onclick = jalan; $('pKode').onkeydown = e => { if (e.key === 'Enter') jalan(); };
}

/* ---------- muat data ---------- */
async function muat() {
  $('pMain').innerHTML = `<div class="panel"><p>Memuat…</p></div>`;
  const pending = localStorage.getItem(KODE); data.pesanKode = '';
  if (pending) { try { await pakaiKode(pending); toast('Kode undangan berhasil dipakai.'); view = 'pahlawan'; } catch (e) { data.pesanKode = `Kode <b>${esc(pending)}</b>: ${esc(pesanError(e))}`; localStorage.removeItem(KODE); } }
  const [p, k, r] = await Promise.all([sb.rpc('portal_campaigns'), sb.rpc('kelola_pahlawan'), peranSaya()]);
  if (p.error) { $('pMain').innerHTML = `<div class="warn">${esc(pesanError(p.error))}</div>`; return; }
  data.pahlawan = p.data || []; data.kelola = k.error ? [] : (k.data || []); peran = r;
  data.kelolaError = k.error && !/kelola_pahlawan|PGRST202|Could not find/i.test(k.error.message) ? pesanError(k.error) : '';
  renderAkun();
  const bisa = tersedia(); const dariHash = location.hash.slice(1);
  let awal = view && bisa.includes(view) ? view : bisa.includes(dariHash) ? dariHash : null;
  if (!awal) awal = !data.pahlawan.length && bisa.includes('undang') ? 'undang' : 'pahlawan';
  view = null; tampil(awal, false, true);
}
function tersedia() { return (data.kelola.length || peran.moderator || data.kelolaError) ? ['pahlawan', 'undang'] : ['pahlawan']; }

function tampil(v, dariRiwayat, ganti) {
  kanal.forEach(c => sb.removeChannel(c)); kanal = [];
  const beda = v !== view; view = v;
  if (!dariRiwayat) { if (ganti || !history.state) history.replaceState({ v, n: riwayatN }, '', '#' + v); else if (beda) { riwayatN++; history.pushState({ v, n: riwayatN }, '', '#' + v); } }
  const bisa = tersedia();
  const seg = bisa.length > 1 ? `<div class="seg" role="tablist">
      <button class="seg-b ${v === 'pahlawan' ? 'on' : ''}" data-v="pahlawan" type="button">Pahlawanku</button>
      <button class="seg-b ${v === 'undang' ? 'on' : ''}" data-v="undang" type="button">Undang Pemain</button></div>` : '';
  $('pMain').innerHTML = seg + '<div id="pIsi"></div>';
  $('pMain').querySelectorAll('[data-v]').forEach(b => b.onclick = () => tampil(b.dataset.v));
  if (v === 'undang') renderUndang(); else renderPahlawan();
  window.scrollTo(0, 0);
}

/* ---------- PAHLAWANKU (pemain) ---------- */
function renderPahlawan() {
  const el = $('pIsi'); const list = data.pahlawan;
  if (!list.length) {
    const gm = tersedia().includes('undang');
    el.innerHTML = `<div class="page-head"><img src="/img/emblem.webp" alt="" class="emblem" width="58" height="58"><div><h1>Selamat datang</h1><p>Akunmu belum terhubung ke pahlawan mana pun.</p></div></div>
      ${data.pesanKode ? `<div class="warn">${data.pesanKode}</div>` : ''}${formKode()}
      <div class="panel"><h2>${gm ? 'Kamu GM atau moderator?' : 'Kamu Game Master?'}</h2><p class="small">${gm ? 'Buka <b>Undang Pemain</b> di atas untuk membuat kode undangan.' : 'Buat campaign dan pahlawan di <a href="/">Meja Pencerita</a> dengan akun yang sama. Setelah tersimpan, pahlawanmu muncul di sini untuk diundang.'}</p></div>`;
    bindKode(); return;
  }
  el.innerHTML = `<div class="page-head"><img src="/img/emblem.webp" alt="" class="emblem" width="58" height="58"><div><h1>Pahlawanku</h1><p>Kartu, kondisi terkini, dan rekap cerita.</p></div></div>
    ${data.pesanKode ? `<div class="warn">${data.pesanKode}</div>` : ''}<div id="pHeroes"></div>${formKode('Diundang ke campaign lain? Tulis kodenya di sini.')}`;
  bindKode();
  (async () => { for (const c of list) { if (view !== 'pahlawan') return; await kartuHero(c); } })();
}
function statusHtml(st, tn) {
  if (!st || !st.session_id) return `<p class="small">Belum ada sesi berjalan. Kondisi muncul di sini saat GM mulai bermain.</p>`;
  const hati = Array.from({ length: st.hati_maks }, (_, i) => `<i class="${i < st.hati ? 'on' : ''}">♥</i>`).join('');
  return `<div class="st-grid"><div><small>${esc(tn)}</small><div class="st-hati">${st.gugur ? '☠ Gugur' : hati}</div><b>${st.gugur ? '' : `${st.hati} / ${st.hati_maks}`}${st.tumbang && !st.gugur ? ' · Tumbang' : ''}</b></div>
    <div><small>Skill Khusus tersisa</small><div class="st-dots">${[0, 1, 2].map(i => `<span class="dot ${i < st.skill_sisa ? '' : 'used'}"></span>`).join('')}</div><b>${st.skill_sisa} / 3</b></div></div>
    ${(st.lencana || []).length ? `<p class="st-lencana">${st.lencana.map(l => `<span class="badge">${esc(l)}</span>`).join(' ')}</p>` : ''}
    <p class="small st-waktu">Diperbarui ${new Date(st.updated_at).toLocaleString('id-ID')}</p>`;
}
async function kartuHero(c) {
  const box = $('pHeroes'); if (!box) return;
  const wrap = document.createElement('section'); wrap.className = 'p-hero'; box.appendChild(wrap);
  const { data: h, error } = await sb.from('heroes').select('id,data,foto_path').eq('id', c.hero_id).maybeSingle();
  if (error || !h) { wrap.innerHTML = `<div class="warn">Pahlawan di campaign "${esc(c.nama)}" tidak ditemukan. Minta GM mengundang ulang.</div>`; return; }
  const cd = (h.data && h.data.kartu) || null; const nama = (h.data && h.data.nama) || 'Pahlawan'; const tn = (cd && cd.tn) || 'Nyawa';
  wrap.innerHTML = `<div class="panel p-head"><h2>${esc(nama)}</h2><p class="small">${esc(c.nama)} · ${esc(GENRE_NAMA[c.genre] || c.genre)} · Bab ${esc(c.bab_aktif)}</p></div>
    <div class="p-grid"><div class="p-card"><div class="p-card-img" id="img-${h.id}"><span>Menyiapkan kartu…</span></div><div class="actions"><button class="btn" id="dl-${h.id}" type="button" disabled>Unduh kartu (PNG)</button></div></div>
    <div class="p-side"><div class="panel"><h3>Kondisi terkini <span class="live" title="Diperbarui otomatis">● langsung</span></h3><div id="st-${h.id}"><p class="small">Memuat…</p></div></div>
    <div class="panel"><h3>Rekap cerita</h3><div id="rk-${h.id}"><p class="small">Memuat…</p></div></div></div></div>`;
  const set = (id, html) => { const x = $(id); if (x) x.innerHTML = html; };
  const muatStatus = async () => { const { data: d } = await sb.from('hero_status').select('*').eq('hero_id', h.id).maybeSingle(); set('st-' + h.id, statusHtml(d, tn)); };
  const muatRekap = async () => {
    const { data: d } = await sb.from('session_recaps').select('judul,teks,terbit_at').eq('campaign_id', c.campaign_id).eq('terbit', true).order('terbit_at', { ascending: false });
    set('rk-' + h.id, d && d.length ? d.map((r, i) => `<details class="rekap" ${i === 0 ? 'open' : ''}><summary><b>${esc(r.judul)}</b> <span class="small">${new Date(r.terbit_at).toLocaleDateString('id-ID')}</span></summary><div class="rekap-teks">${esc(r.teks).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>')}</div></details>`).join('')
      : '<p class="small">Belum ada rekap. GM akan menerbitkannya setelah sesi selesai.</p>');
  };
  await Promise.all([muatStatus(), muatRekap()]);
  if (view !== 'pahlawan') return;
  kanal.push(sb.channel('st-' + h.id).on('postgres_changes', { event: '*', schema: 'public', table: 'hero_status', filter: `hero_id=eq.${h.id}` }, muatStatus).subscribe());
  kanal.push(sb.channel('rk-' + h.id).on('postgres_changes', { event: '*', schema: 'public', table: 'session_recaps', filter: `campaign_id=eq.${c.campaign_id}` }, muatRekap).subscribe());
  // kartu + foto (paling berat, dikerjakan terakhir)
  let foto = null;
  if (h.foto_path) { const r = await sb.storage.from('foto').download(h.foto_path); if (!r.error && r.data) foto = await blobToDataUrl(r.data); }
  const img = $('img-' + h.id); if (!img) return;
  if (cd) {
    const cv = await drawCard(cd, foto); const im = new Image(); im.src = cv.toDataURL('image/png'); im.alt = `Kartu karakter ${nama}`;
    img.innerHTML = ''; img.appendChild(im);
    const dl = $('dl-' + h.id); if (dl) { dl.disabled = false; dl.onclick = () => dlCanvas(cv, `kartu-${slug(nama) || 'karakter'}.png`); }
  } else img.innerHTML = `<span class="small">Kartu belum tersedia. Minta GM membuka campaign agar tersimpan.</span>`;
}

/* ---------- UNDANG PEMAIN (GM & moderator) ---------- */
function renderUndang() {
  const el = $('pIsi'); const rows = data.kelola;
  const judul = peran.moderator ? 'Semua campaign di web. Sebagai moderator, kamu bisa mengundang dan memutus pemain di mana saja.' : 'Buat kode undangan, lalu kirim ke pemain lewat WhatsApp.';
  let html = `<div class="page-head"><img src="/img/emblem.webp" alt="" class="emblem" width="58" height="58"><div><h1>Undang Pemain</h1><p>${judul}</p></div></div>`;
  if (data.kelolaError) html += `<div class="warn">${esc(data.kelolaError)}</div>`;
  if (!rows.length) {
    html += `<div class="panel"><h2>Belum ada pahlawan</h2><p>Buat campaign dan pahlawan di <a href="/">Meja Pencerita</a> dengan akun ini. Setelah tersimpan online, pahlawannya muncul di sini.</p>
      <p class="small">Jika baru saja membuat pahlawan, tunggu beberapa detik lalu klik Muat ulang.</p><div class="actions"><button class="btn alt" id="uMuat" type="button">Muat ulang</button></div></div>`;
    el.innerHTML = html; $('uMuat').onclick = () => muat(); return;
  }
  html += `<div class="panel u-cara"><ol class="langkah"><li>Klik <b>Buat undangan</b> pada pahlawan.</li><li>Kirim pesan yang muncul ke pemain (WhatsApp).</li><li>Pemain membuka link dan masuk. Status berubah jadi <b>Terhubung</b>.</li></ol></div>`;
  if (rows.length > 8) html += `<div class="row"><input class="s" id="uCari" type="search" placeholder="Cari campaign, pahlawan, atau email…" value="${esc(filter)}" style="flex:1"></div>`;
  html += `<div id="uList"></div>`;
  el.innerHTML = html;
  if ($('uCari')) $('uCari').oninput = e => { filter = e.target.value; daftarUndang(); };
  daftarUndang();
}
function daftarUndang() {
  const f = filter.trim().toLowerCase();
  const rows = data.kelola.filter(r => !f || [r.campaign_nama, r.hero_nama, r.gm_email, r.pemain_email, r.pemain_nama].some(x => x && String(x).toLowerCase().includes(f)));
  const grup = new Map(); rows.forEach(r => { if (!grup.has(r.campaign_id)) grup.set(r.campaign_id, []); grup.get(r.campaign_id).push(r); });
  const el = $('uList'); if (!el) return;
  if (!rows.length) { el.innerHTML = '<p class="small" style="color:#cdb893">Tidak ada yang cocok.</p>'; return; }
  el.innerHTML = [...grup.values()].map(hs => {
    const c = hs[0];
    return `<div class="panel u-camp"><h2>${esc(c.campaign_nama)}</h2><p class="small">${esc(GENRE_NAMA[c.genre] || c.genre)}${!c.milik_saya && c.gm_email ? ` · GM: ${esc(c.gm_email)}` : ''}${c.milik_saya ? ' · milikmu' : ''}</p>
      ${hs.map(r => {
        const st = r.terhubung_at ? `<span class="u-st ok-st">✅ Terhubung${r.pemain_nama || r.pemain_email ? `: ${esc(r.pemain_nama || r.pemain_email)}` : ''}</span>${r.pemain_email && r.pemain_nama ? `<span class="small">${esc(r.pemain_email)}</span>` : ''}`
          : r.kode_aktif ? `<span class="u-st wait-st">⏳ Menunggu pemain · kode <b>${esc(r.kode_aktif)}</b></span>` : '<span class="u-st">Belum diundang</span>';
        return `<div class="u-row"><div class="u-info"><b>${esc(r.hero_nama)}</b>${st}</div><div class="u-act">
          <button class="btn" data-undang="${esc(r.hero_id)}" type="button">${r.terhubung_at || r.kode_aktif ? 'Kode baru' : 'Buat undangan'}</button>
          ${r.terhubung_at ? `<button class="dbtn red" data-putus="${esc(r.hero_id)}" type="button">Putuskan</button>` : ''}</div></div>`;
      }).join('')}</div>`;
  }).join('');
  el.querySelectorAll('[data-undang]').forEach(b => b.onclick = () => undang(data.kelola.find(r => r.hero_id === b.dataset.undang), b));
  el.querySelectorAll('[data-putus]').forEach(b => b.onclick = () => putus(data.kelola.find(r => r.hero_id === b.dataset.putus)));
}
async function undang(r, btn) {
  btn.disabled = true; btn.textContent = 'Membuat…';
  try {
    const kode = await buatUndangan(r.hero_id);
    const { teks } = pesanUndangan(r.hero_nama, r.campaign_nama, kode);
    let ok = false; try { await navigator.clipboard.writeText(teks); ok = true; } catch (e) { /* manual */ }
    modal(`<h2>Undangan untuk ${esc(r.hero_nama)}</h2><p class="small">${ok ? '✅ Pesan sudah disalin. Tinggal tempel di chat WhatsApp pemain.' : 'Salin pesan di bawah, lalu kirim ke pemain.'}</p>
      <p class="kode-besar">${esc(kode)}</p><div class="field"><textarea rows="8" readonly>${esc(teks)}</textarea></div>
      <div class="actions"><a class="dbtn" href="https://wa.me/?text=${encodeURIComponent(teks)}" target="_blank" rel="noopener">Kirim lewat WhatsApp</a><button class="btn" type="button" onclick="closeModal()">Selesai</button></div>`);
    r.kode_aktif = r.kode_aktif ? r.kode_aktif + ', ' + kode : kode; daftarUndang();
  } catch (e) { toast('Undangan gagal dibuat: ' + pesanError(e), true); btn.disabled = false; btn.textContent = 'Buat undangan'; }
}
async function putus(r) {
  if (!confirm(`Putuskan pemain dari ${r.hero_nama}? Ia tidak bisa melihat kartunya lagi sampai diundang ulang.`)) return;
  const { error } = await sb.rpc('putus_pemain', { p_hero: r.hero_id });
  if (error) { toast(pesanError(error), true); return; }
  toast('Pemain diputus.'); r.terhubung_at = null; r.pemain_nama = null; r.pemain_email = null; daftarUndang();
}

/* ---------- auth ---------- */
let terakhir;
sb.auth.onAuthStateChange((ev, session) => {
  const u = session ? session.user : null; if ((u && u.id) === terakhir) return; terakhir = u && u.id; user = u;
  if (!user) { sessionStorage.removeItem('mdnd-log-portal'); kanal.forEach(c => sb.removeChannel(c)); kanal = []; peran = { moderator: false }; data = { pahlawan: [], kelola: [], pesanKode: '' }; renderAkun(); halamanMasuk(); return; }
  if (!sessionStorage.getItem('mdnd-log-portal')) { sessionStorage.setItem('mdnd-log-portal', '1'); catatAksi('buka_portal'); }
  renderAkun(); setTimeout(muat, 0);
});
