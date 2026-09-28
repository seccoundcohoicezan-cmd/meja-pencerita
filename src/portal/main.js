/**
 * Portal Pemain.
 *  - Pemain   : TANPA login. Ketik kode (atau buka link dari GM) → kartu, kondisi terkini, rekap.
 *  - GM       : masuk Google → "Kode Pemain" untuk campaign miliknya.
 *  - Moderator: masuk Google → "Kode Pemain" untuk SEMUA campaign.
 * Hak akses dijaga database (supabase/003_moderator.sql & 004_kode_tanpa_login.sql).
 */
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '../styles/app.css';
import '../styles/tema.css';
import '../styles/portal.css';
import { sb, pesanError, loginModalHtml, bindLoginModal, logout, catatAksi, peranSaya, buatUndangan, pesanUndangan, tautanFoto, GOOGLE_SVG } from '../shared/supa';
import { drawCard, dlCanvas } from '../core/card';
import { esc, slug, fmtMod } from '../core/util';
import { ABILS, ABIL_SEDERHANA, UJI_CONTOH } from '../core/skills';

const $ = id => document.getElementById(id);
const SIMPAN_KODE = 'mdnd-kode-kartu';
const SETELAH_LOGIN = 'mdnd-portal-setelah-login';
// setelah login Google dari portal, langsung buka Kode Pemain
document.addEventListener('click', e => { if (e.target.closest('#lgGoogle')) sessionStorage.setItem(SETELAH_LOGIN, 'undang'); }, true);
const GENRE_NAMA = { fantasy: 'Fantasy', archive: 'Archive', apocalyptic: 'Apocalyptic', zombies: 'Zombies', cyberpunk: 'Cyberpunk', mystery: 'Mystery', custom: 'Custom' };
let user = null; let peran = { moderator: false }; let authSiap = false;
let view = null; let riwayatN = 0; let filter = '';
let kelola = []; let kelolaError = '';
let kartu = null; let polling = null; let daduAktif = true;
async function muatPengaturan() { try { const { data, error } = await sb.rpc('pengaturan_publik'); if (!error && data) daduAktif = data.dadu_digital !== false; } catch (e) { /* default aktif */ } }

/* ---------- utilitas tampilan ---------- */
function toast(m, bad) { const t = $('toast'); t.textContent = m; t.className = 'show' + (bad ? ' bad' : ''); clearTimeout(t._h); t._h = setTimeout(() => t.className = '', 4500); }
function modal(html) { $('modalBody').innerHTML = '<button class="modal-x" type="button" aria-label="Tutup" onclick="closeModal()">✕</button>' + html; $('modal').classList.add('show'); }
window.closeModal = () => $('modal').classList.remove('show');
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') window.closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { window.closeModal(); tutupLayarPenuh(); } });
const normKode = k => String(k || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
const tgl = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

// kode dari link (?kode=...) disimpan, lalu URL dibersihkan
{ const q = new URLSearchParams(location.search); const k = normKode(q.get('kode'));
  if (k) { localStorage.setItem(SIMPAN_KODE, k); history.replaceState(null, '', '/portal#kartu'); } }

/* ---------- navigasi & tombol kembali ---------- */
$('pBack').onclick = e => {
  if (riwayatN > 0) { e.preventDefault(); history.back(); return; }
  const ref = document.referrer;
  if (ref && ref.startsWith(location.origin) && !ref.includes('/portal')) { e.preventDefault(); history.back(); }
};
window.addEventListener('popstate', e => {
  window.closeModal(); tutupLayarPenuh(); const st = e.state || {}; riwayatN = st.n || 0;
  const v = st.v || location.hash.slice(1) || 'awal'; if (v !== view) tampil(v, { riwayat: true });
});
function tampil(v, opt = {}) {
  if (v === 'kartu' && !localStorage.getItem(SIMPAN_KODE)) v = 'awal';
  if (!['awal', 'kartu', 'undang'].includes(v)) v = 'awal';
  const beda = v !== view; view = v; berhentiPolling();
  if (!opt.riwayat) { const url = '#' + v; if (opt.ganti || !history.state) history.replaceState({ v, n: riwayatN }, '', url); else if (beda) { riwayatN++; history.pushState({ v, n: riwayatN }, '', url); } }
  document.body.dataset.view = v;
  if (v === 'kartu') renderKartu(); else if (v === 'undang') renderUndang(); else renderAwal();
  if (beda) window.scrollTo(0, 0);
}

/* ---------- akun (hanya GM / moderator) ---------- */
function renderAkun() {
  const el = $('akunBox');
  if (!user) { el.innerHTML = ''; return; }
  const m = user.user_metadata || {}; const av = m.avatar_url || '/img/avatar.webp';
  const lbl = peran.pemilik ? 'Pemilik' : peran.moderator ? 'Moderator' : 'Game Master';
  el.innerHTML = `<button class="akun-btn" id="pAkun" type="button" title="Kode Pemain"><img src="${esc(av)}" alt="" referrerpolicy="no-referrer" onerror="this.src='/img/avatar.webp'"><span><b>${esc(m.full_name || m.name || (user.email || '').split('@')[0])}</b><small>${lbl}</small></span></button><button class="dbtn akun-keluar" id="pLogout" type="button">Keluar</button>`;
  $('pAkun').onclick = () => tampil('undang');
  $('pLogout').onclick = async () => { catatAksi('keluar', 'Portal'); await logout(); };
}

/* ---------- HALAMAN AWAL: ketik kode ---------- */
function renderAwal(pesan) {
  const gm = user ? `<button class="btn alt" id="aGm" type="button">Buka Kode Pemain</button>`
    : `<div id="aLogin"><button class="btn google-btn" id="lgGoogle" type="button">${GOOGLE_SVG} Masuk dengan Google</button><div id="lgMsg" class="small"></div></div>`;
  $('pMain').innerHTML = `<section class="pa-hero">
    <img src="/img/splash.webp" alt="" class="pa-art">
    <div class="pa-kotak panel">
      <p class="pa-eyebrow">Portal Pemain</p>
      <h1>Lihat kartu karaktermu</h1>
      <p class="pa-sub">Ketik kode dari Game Master. Tidak perlu login.</p>
      ${pesan ? `<div class="warn" role="alert">${pesan}</div>` : ''}
      <form class="pa-form" id="aForm" autocomplete="off">
        <label for="aKode" class="sr-only">Kode undangan</label>
        <input class="kode-in" id="aKode" inputmode="text" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="K7M2QX9A" aria-describedby="aHint">
        <button class="btn" type="submit">Buka kartu</button>
      </form>
      <p class="small" id="aHint">Kode terdiri dari 8 huruf/angka dan berlaku sampai sesi atau bab selesai.</p>
      <p class="small pa-panduan"><a href="/panduan-pemain.pdf" target="_blank" rel="noopener">📘 Panduan pemain (PDF)</a></p>
    </div>
  </section>
  <section class="panel pa-gm"><div><h2>Game Master atau moderator?</h2><p class="small">Masuk untuk membuat kode kartu bagi pemainmu.</p></div>${gm}</section>`;
  $('aForm').onsubmit = e => { e.preventDefault(); const k = normKode($('aKode').value);
    if (k.length < 6) { $('aKode').focus(); toast('Kode terlalu pendek. Periksa lagi.', true); return; }
    localStorage.setItem(SIMPAN_KODE, k); kartu = null; tampil('kartu'); };
  if ($('aGm')) $('aGm').onclick = () => tampil('undang');
  if ($('aLogin')) bindLoginModal($('aLogin'));
}

/* ---------- KARTU (tanpa login) ---------- */
async function renderKartu() {
  const kode = localStorage.getItem(SIMPAN_KODE);
  $('pMain').innerHTML = `<div class="panel pk-muat"><p>Membuka kartu…</p></div>`;
  let d;
  try { const [r] = await Promise.all([sb.rpc('lihat_kartu', { p_kode: kode }), muatPengaturan()]); if (r.error) throw r.error; d = r.data; }
  catch (e) { localStorage.removeItem(SIMPAN_KODE); view = 'awal'; history.replaceState({ v: 'awal', n: riwayatN }, '', '#awal'); renderAwal(esc(pesanError(e))); return; }
  if (view !== 'kartu') return;
  kartu = d; const cd = d.hero.kartu; const nama = d.hero.nama || (cd && cd.nama) || 'Pahlawan'; const tn = (cd && cd.tn) || 'Hati';
  document.title = `${nama} — Portal Pemain MasteryDnD`;
  $('pMain').innerHTML = `<div class="pk-bar">
      <div><p class="pa-eyebrow">${esc(d.campaign.nama)} · ${esc(GENRE_NAMA[d.campaign.genre] || d.campaign.genre)} · Bab ${esc(d.campaign.bab)}</p><h1 class="pk-nama">${esc(nama)}</h1></div>
      <button class="dbtn" id="kGanti" type="button">Ganti kode</button></div>
    <div class="pk-grid">
      <figure class="pk-kartu">
        <button class="pk-img" id="kImg" type="button" aria-label="Lihat kartu layar penuh" disabled><span class="pk-ph">Menyiapkan kartu…</span></button>
        <figcaption class="actions"><button class="btn" id="kFull" type="button" disabled>⤢ Layar penuh</button><button class="btn alt" id="kDl" type="button" disabled>Unduh PNG</button></figcaption>
      </figure>
      <div class="pk-side">
        <section class="panel"><h2 class="pk-h">Kondisi terkini <span class="live" title="Diperbarui otomatis tiap 20 detik">● langsung</span></h2><div id="kSt"></div></section>
        <section class="panel"><h2 class="pk-h">Rekap cerita</h2><div id="kRk"></div></section>
        <section class="panel" id="kDadu"></section>
        <section class="panel" id="kArti"></section>
        <section class="panel pk-tips"><h2 class="pk-h">Cara memakai kartu</h2>
          <ul><li>Lempar <b>dadu kelas</b>, jumlahkan, lalu sebut ke GM. Bonus ditambahkan sistem.</li>
          <li>Diminta cek skill? Lempar <b>1 d20</b>, tambah angka skill di kartu (mis. Persuasion +3).</li>
          <li>Titik ● = skill andalanmu (sudah termasuk Proficiency).</li></ul>
          <p class="small"><a href="/panduan-pemain.pdf" target="_blank" rel="noopener">Baca panduan lengkap (PDF) ›</a></p></section>
      </div>
    </div>`;
  $('kGanti').onclick = () => { localStorage.removeItem(SIMPAN_KODE); kartu = null; tampil('awal'); };
  isiStatus(d.status, d.rekap, tn);
  mulaiPolling(kode, tn);
  if (cd) { renderDadu(cd); renderArti(cd); }
  kartu._cd = cd;
  if (!cd) { $('kImg').innerHTML = '<span class="pk-ph">Kartu belum tersedia. Minta GM membuka campaign agar tersimpan.</span>'; return; }
  const cv = await drawCard(cd, d.foto_url ? await muatFoto(d.foto_url) : null);
  if (view !== 'kartu') return;
  const url = cv.toDataURL('image/png');
  $('kImg').innerHTML = `<img src="${url}" alt="Kartu karakter ${esc(nama)}">`; $('kImg').disabled = false;
  const nm = `kartu-${slug(nama) || 'karakter'}.png`;
  $('kImg').onclick = $('kFull').onclick = () => bukaLayarPenuh(url, nama, () => dlCanvas(cv, nm));
  $('kFull').disabled = false; $('kDl').disabled = false; $('kDl').onclick = () => dlCanvas(cv, nm);
}
async function muatFoto(url) {
  try { const r = await fetch(url); if (!r.ok) return null; const b = await r.blob();
    return await new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => res(null); f.readAsDataURL(b); }); }
  catch (e) { return null; }
}
function statusHtml(st, tn) {
  if (!st || !st.session_id) return `<p class="small">Belum ada sesi berjalan. Kondisimu muncul di sini saat GM mulai bermain.</p>`;
  const hati = Array.from({ length: st.hati_maks }, (_, i) => `<i class="${i < st.hati ? 'on' : ''}">♥</i>`).join('');
  return `<div class="st-grid"><div><small>${esc(tn)}</small><div class="st-hati" aria-label="${st.hati} dari ${st.hati_maks}">${st.gugur ? '☠ Gugur' : hati}</div><b>${st.gugur ? '' : `${st.hati} / ${st.hati_maks}`}${st.tumbang && !st.gugur ? ' · Tumbang' : ''}</b></div>
    <div><small>Skill Khusus tersisa</small><div class="st-dots">${[0, 1, 2].map(i => `<span class="dot ${i < st.skill_sisa ? '' : 'used'}"></span>`).join('')}</div><b>${st.skill_sisa} / 3</b></div></div>
    ${(st.lencana || []).length ? `<p class="st-lencana">${st.lencana.map(l => `<span class="badge">${esc(l)}</span>`).join(' ')}</p>` : ''}
    <p class="small st-waktu">Diperbarui ${tgl(st.updated_at)}</p>`;
}
function rekapHtml(rk) {
  return rk && rk.length ? rk.map((r, i) => `<details class="rekap" ${i === 0 ? 'open' : ''}><summary><b>${esc(r.judul)}</b> <span class="small">${new Date(r.terbit_at).toLocaleDateString('id-ID')}</span></summary><div class="rekap-teks">${esc(r.teks).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>')}</div></details>`).join('')
    : '<p class="small">Belum ada rekap. GM menerbitkannya setelah sesi selesai.</p>';
}
function isiStatus(st, rk, tn) { if ($('kSt')) $('kSt').innerHTML = statusHtml(st, tn); if ($('kRk')) $('kRk').innerHTML = rekapHtml(rk); }
function mulaiPolling(kode, tn) {
  berhentiPolling();
  polling = setInterval(async () => {
    if (document.hidden || view !== 'kartu') return;
    const { data, error } = await sb.rpc('status_kartu', { p_kode: kode }); if (error || !data) return;
    if (!data.berlaku) { berhentiPolling(); localStorage.removeItem(SIMPAN_KODE); if ($('kSt')) $('kSt').innerHTML = '<div class="warn">Kode ini sudah hangus karena sesi/bab selesai. Kartu yang sudah diunduh tetap bisa kamu simpan. Minta kode baru ke GM untuk sesi berikutnya.</div>'; return; }
    isiStatus(data.status, data.rekap, tn);
    const lama = daduAktif; await muatPengaturan(); if (lama !== daduAktif && kartu && kartu._cd) renderDadu(kartu._cd);
  }, 20000);
}
function berhentiPolling() { if (polling) { clearInterval(polling); polling = null; } }

/* ---------- dadu digital untuk pemain ---------- */
const lempar = n => 1 + Math.floor(Math.random() * n);
const sisiDadu = t => (String(t || 'd20').match(/d(\d+)/g) || ['d20']).map(x => +x.slice(1));
let modeDadu = 'aksi';
function renderDadu(cd) {
  const el = $('kDadu'); if (!el) return; const punyaAb = !!(cd.ab && cd.sks);
  if (!daduAktif) { el.innerHTML = `<h2 class="pk-h">🎲 Lempar dadu</h2><p class="small">Dadu digital sedang <b>dimatikan</b> oleh moderator. Pakai dadu fisik dan lempar di depan semua pemain.</p>`; return; }
  const mode = [['aksi', 'Aksi'], ...(punyaAb ? [['skill', 'Cek skill'], ['uji', 'Uji ability']] : [])];
  if (!mode.some(m => m[0] === modeDadu)) modeDadu = 'aksi';
  const sk = punyaAb ? [...cd.sks].sort((a, b) => b[3] - a[3] || b[2] - a[2]) : [];
  el.innerHTML = `<h2 class="pk-h">🎲 Lempar dadu</h2><p class="small">Tidak punya dadu? Lempar di sini, lalu <b>sebut hasilnya ke GM</b>.</p>
    <div class="seg" role="tablist">${mode.map(([k, l]) => `<button class="seg-b ${k === modeDadu ? 'on' : ''}" data-md="${k}" type="button" role="tab" aria-selected="${k === modeDadu}">${l}</button>`).join('')}</div>
    <div class="ld-form">${modeDadu === 'aksi' ? `<p class="small">Dadu kelasmu: <b>${esc(cd.dadu || 'd20')}</b>. Dipakai saat GM bilang “lempar dadu”.</p>`
      : modeDadu === 'skill' ? `<label class="small" for="ldSk">Skill yang disebut GM</label><select class="s" id="ldSk">${sk.map(([n, , m, pr]) => `<option value="${esc(n)}">${pr ? '● ' : ''}${esc(n)} ${fmtMod(m)}</option>`).join('')}</select>`
      : `<label class="small" for="ldAb">Ability yang disebut GM</label><select class="s" id="ldAb">${ABILS.map((a, i) => `<option value="${i}" ${a === 'CON' ? 'selected' : ''}>${ABIL_SEDERHANA[a].n} (${a}) ${fmtMod(cd.ab[i])} — ${esc(UJI_CONTOH[a])}</option>`).join('')}</select>`}
      ${modeDadu !== 'aksi' ? `<div class="seg ld-adv" role="radiogroup" aria-label="Advantage"><button class="seg-b on" data-adv="0" type="button">Normal</button><button class="seg-b" data-adv="1" type="button">Advantage</button><button class="seg-b" data-adv="-1" type="button">Disadvantage</button></div>` : ''}
      <button class="btn ld-btn" id="ldGo" type="button">🎲 Lempar</button></div>
    <div id="ldHasil" class="ld-hasil" aria-live="polite"></div>`;
  el.querySelectorAll('[data-md]').forEach(b => b.onclick = () => { modeDadu = b.dataset.md; renderDadu(cd); });
  let adv = 0; el.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => { adv = +b.dataset.adv; el.querySelectorAll('[data-adv]').forEach(x => x.classList.toggle('on', x === b)); });
  $('ldGo').onclick = () => {
    const out = $('ldHasil'); let html;
    if (modeDadu === 'aksi') {
      const sisi = sisiDadu(cd.dadu); const hasil = sisi.map(lempar); const jml = hasil.reduce((a, b) => a + b, 0);
      const kritis = hasil.every((v, i) => v === sisi[i]); const gagal = hasil.every(v => v === 1);
      html = `<div class="ld-dadu">${hasil.map((v, i) => `<span class="ld-d"><small>d${sisi[i]}</small>${v}</span>`).join('<i>+</i>')}<i>=</i><span class="ld-tot">${jml}</span></div>
        <p class="ld-sebut">Bilang ke GM: <b>“${jml}!”</b>${cd.bonus ? ` <span class="small">(GM menambah bonus +${esc(cd.bonus)})</span>` : ''}</p>
        ${kritis ? '<p class="ld-tag ok">✨ KRITIS: semua dadu angka tertinggi. Pasti berhasil!</p>' : gagal ? '<p class="ld-tag bad">💀 GAGAL TOTAL: semua dadu angka 1.</p>' : ''}`;
    } else {
      const a = lempar(20), b = lempar(20); const d = adv > 0 ? Math.max(a, b) : adv < 0 ? Math.min(a, b) : a;
      let nama, m;
      if (modeDadu === 'skill') { const r = cd.sks.find(x => x[0] === $('ldSk').value); nama = r[0]; m = r[2]; }
      else { const i = +$('ldAb').value; nama = `Uji ${ABIL_SEDERHANA[ABILS[i]].n}`; m = cd.ab[i]; }
      html = `<div class="ld-dadu">${adv ? `<span class="ld-d ${d === a ? '' : 'redup'}"><small>d20</small>${a}</span><span class="ld-d ${d === b && a !== b ? '' : d === b ? 'redup' : 'redup'}"><small>d20</small>${b}</span><i>→</i>` : ''}<span class="ld-d"><small>d20</small>${d}</span><i>${m < 0 ? '−' : '+'}</i><span class="ld-d mod"><small>${esc(nama)}</small>${Math.abs(m)}</span><i>=</i><span class="ld-tot">${d + m}</span></div>
        <p class="ld-sebut">Bilang ke GM: <b>“${esc(nama)} ${d + m}!”</b></p>
        ${d === 20 ? '<p class="ld-tag ok">✨ Angka 20: hasil luar biasa!</p>' : d === 1 ? '<p class="ld-tag bad">💀 Angka 1: pasti gagal.</p>' : ''}`;
    }
    out.classList.remove('muncul'); void out.offsetWidth; out.innerHTML = html; out.classList.add('muncul');
  };
}
function renderArti(cd) {
  const el = $('kArti'); if (!el) return;
  if (!cd.ab) { el.remove(); return; }
  el.innerHTML = `<h2 class="pk-h">Arti angka di kartumu</h2>
    <div class="arti-grid">${ABILS.map((a, i) => `<div class="arti ${cd.ab[i] >= 2 ? 'kuat' : ''}"><span class="arti-ik" aria-hidden="true">${ABIL_SEDERHANA[a].ikon}</span><div><b>${ABIL_SEDERHANA[a].n} <small>${a}</small> <em>${fmtMod(cd.ab[i])}</em></b><span>${esc(ABIL_SEDERHANA[a].u)}</span></div></div>`).join('')}</div>
    ${cd.ac != null ? `<div class="arti ac"><span class="arti-ik" aria-hidden="true">🛡️</span><div><b>Pertahanan (AC) <em>${esc(cd.ac)}</em></b><span>Hasil d20 yang kamu kocok di awal, terkunci selamanya. Saat ada serangan mendadak, musuh harus mencapai ${esc(cd.ac)} atau lebih untuk mengenaimu.</span></div></div>` : ''}
    <p class="small">Plus (+) = jago, minus (−) = kurang jago. Angka ini ditambahkan ke d20.</p>`;
}

/* ---------- layar penuh (kartu utuh, bisa diperbesar) ---------- */
function bukaLayarPenuh(src, nama, unduh) {
  const el = $('lightbox');
  el.innerHTML = `<div class="lb-bar"><b>${esc(nama)}</b><span><button class="dbtn" id="lbZoom" type="button">Perbesar</button><button class="dbtn" id="lbDl" type="button">Unduh</button><button class="lb-x" id="lbX" type="button" aria-label="Tutup">✕</button></span></div>
    <div class="lb-isi" id="lbIsi"><img src="${src}" alt="Kartu karakter ${esc(nama)}"></div>`;
  el.hidden = false; document.body.classList.add('lb-open');
  $('lbX').onclick = tutupLayarPenuh; $('lbDl').onclick = unduh;
  $('lbZoom').onclick = () => { const z = $('lbIsi').classList.toggle('zoom'); $('lbZoom').textContent = z ? 'Pas layar' : 'Perbesar'; };
  $('lbIsi').onclick = e => { if (e.target.id === 'lbIsi') tutupLayarPenuh(); };
  $('lbX').focus();
}
function tutupLayarPenuh() { const el = $('lightbox'); if (!el || el.hidden) return; el.hidden = true; el.innerHTML = ''; document.body.classList.remove('lb-open'); }

/* ---------- KODE PEMAIN (GM & moderator) ---------- */
async function renderUndang() {
  if (!authSiap) { $('pMain').innerHTML = `<div class="panel"><p>Memeriksa akun…</p></div>`; return; }
  if (!user) {
    $('pMain').innerHTML = `<section class="panel pu-login">${loginModalHtml('Masuk sebagai Game Master', 'Masuk dengan Google untuk membuat kode kartu bagi pemain. Pemain sendiri tidak perlu login.')}</section>`;
    bindLoginModal($('pMain')); return;
  }
  $('pMain').innerHTML = `<div class="panel"><p>Memuat pahlawan…</p></div>`;
  const k = await sb.rpc('kelola_pahlawan');
  kelola = k.error ? [] : (k.data || []);
  kelolaError = k.error ? pesanError(k.error) + (/kelola_pahlawan|PGRST202|Could not find/i.test(k.error.message) ? ' — jalankan supabase/004_kode_tanpa_login.sql di Supabase.' : '') : '';
  if (view !== 'undang') return;
  const judul = peran.moderator ? 'Semua campaign di web. Sebagai moderator kamu bisa membuat dan menghanguskan kode di mana saja.' : 'Buat kode untuk tiap pahlawan, lalu kirim ke pemain lewat WhatsApp.';
  let html = `<div class="page-head"><img src="/img/emblem.webp" alt="" class="emblem" width="58" height="58"><div><h1>Kode Pemain</h1><p>${judul}</p></div></div>`;
  if (kelolaError) html += `<div class="warn">${esc(kelolaError)}</div>`;
  if (!kelola.length && !kelolaError) {
    html += `<div class="panel"><h2>Belum ada pahlawan</h2><p>Buat campaign dan pahlawan di <a href="/">Meja Pencerita</a> dengan akun ini. Setelah tersimpan online, pahlawannya muncul di sini.</p>
      <div class="actions"><button class="btn alt" id="uMuat" type="button">Muat ulang</button></div></div>`;
    $('pMain').innerHTML = html; $('uMuat').onclick = () => renderUndang(); return;
  }
  html += `<div class="panel pu-cara"><ol class="langkah"><li>Klik <b>Buat kode</b> pada pahlawan.</li><li>Kirim pesan yang tersalin ke pemain lewat WhatsApp.</li><li>Pemain membuka link tanpa login. Kode <b>hangus otomatis</b> saat sesi atau bab selesai.</li></ol></div>`;
  if (kelola.length > 6) html += `<div class="row"><input class="s pu-cari" id="uCari" type="search" placeholder="Cari campaign, pahlawan, atau email GM…" value="${esc(filter)}" style="flex:1"></div>`;
  html += `<div id="uList"></div>`;
  $('pMain').innerHTML = html;
  if ($('uCari')) $('uCari').oninput = e => { filter = e.target.value; daftarUndang(); };
  daftarUndang();
}
function daftarUndang() {
  const f = filter.trim().toLowerCase();
  const rows = kelola.filter(r => !f || [r.campaign_nama, r.hero_nama, r.gm_email].some(x => x && String(x).toLowerCase().includes(f)));
  const grup = new Map(); rows.forEach(r => { if (!grup.has(r.campaign_id)) grup.set(r.campaign_id, []); grup.get(r.campaign_id).push(r); });
  const el = $('uList'); if (!el) return;
  if (!rows.length) { el.innerHTML = '<p class="small" style="color:#cdb893">Tidak ada yang cocok.</p>'; return; }
  el.innerHTML = [...grup.values()].map(hs => {
    const c = hs[0];
    return `<section class="panel u-camp"><div class="u-camp-h"><h2>${esc(c.campaign_nama)}</h2><span class="small">${esc(GENRE_NAMA[c.genre] || c.genre)} · Bab ${esc(c.bab_aktif)}${!c.milik_saya && c.gm_email ? ` · GM ${esc(c.gm_email)}` : ''}</span></div>
      ${hs.map(r => {
        const st = r.kode_aktif
          ? `<span class="u-st ok-st">🔑 <b class="u-kode">${esc(r.kode_aktif)}</b> · ${r.dilihat_n ? `dibuka ${r.dilihat_n}×, terakhir ${tgl(r.dilihat_at)}` : 'belum dibuka'}</span>`
          : '<span class="u-st">Belum ada kode aktif</span>';
        return `<div class="u-row"><div class="u-info"><b>${esc(r.hero_nama)}</b>${st}</div><div class="u-act">
          ${r.kode_aktif ? `<button class="btn alt" data-salin="${esc(r.hero_id)}" type="button">Salin pesan</button>` : ''}
          <button class="btn" data-buat="${esc(r.hero_id)}" type="button">${r.kode_aktif ? 'Kode baru' : 'Buat kode'}</button>
          ${r.kode_aktif ? `<button class="dbtn red" data-hangus="${esc(r.hero_id)}" type="button">Hanguskan</button>` : ''}</div></div>`;
      }).join('')}</section>`;
  }).join('');
  const cari = id => kelola.find(r => r.hero_id === id);
  el.querySelectorAll('[data-buat]').forEach(b => b.onclick = () => buatKode(cari(b.dataset.buat), b));
  el.querySelectorAll('[data-salin]').forEach(b => b.onclick = () => tampilPesan(cari(b.dataset.salin), r => r.kode_aktif));
  el.querySelectorAll('[data-hangus]').forEach(b => b.onclick = () => hanguskan(cari(b.dataset.hangus)));
}
async function tampilPesan(r) {
  const { teks, link } = pesanUndangan(r.hero_nama, r.campaign_nama, r.kode_aktif);
  let ok = false; try { await navigator.clipboard.writeText(teks); ok = true; } catch (e) { /* manual */ }
  modal(`<h2>Kode untuk ${esc(r.hero_nama)}</h2><p class="small">${ok ? '✅ Pesan sudah disalin. Tinggal tempel di WhatsApp pemain.' : 'Salin pesan di bawah, lalu kirim ke pemain.'}</p>
    <p class="kode-besar">${esc(r.kode_aktif)}</p><div class="field"><textarea rows="7" readonly>${esc(teks)}</textarea></div>
    <div class="actions"><a class="dbtn" href="https://wa.me/?text=${encodeURIComponent(teks)}" target="_blank" rel="noopener">Kirim lewat WhatsApp</a><a class="dbtn" href="${esc(link)}" target="_blank" rel="noopener">Coba buka kartu</a><button class="btn" type="button" onclick="closeModal()">Selesai</button></div>`);
}
async function buatKode(r, btn) {
  if (r.kode_aktif && !confirm(`Buat kode baru untuk ${r.hero_nama}? Kode lama (${r.kode_aktif}) langsung tidak berlaku.`)) return;
  const label = btn.textContent; btn.disabled = true; btn.textContent = 'Membuat…';
  try {
    const kode = await buatUndangan(r.hero_id, await tautanFoto(r.foto_path));
    r.kode_aktif = kode; r.dilihat_n = 0; r.dilihat_at = null; daftarUndang(); tampilPesan(r);
  } catch (e) { toast('Kode gagal dibuat: ' + pesanError(e), true); btn.disabled = false; btn.textContent = label; }
}
async function hanguskan(r) {
  if (!confirm(`Hanguskan kode ${r.kode_aktif} milik ${r.hero_nama}? Pemain tidak bisa membuka kartunya lagi dengan kode ini.`)) return;
  const { error } = await sb.rpc('hanguskan_kode', { p_hero: r.hero_id });
  if (error) { toast(pesanError(error), true); return; }
  toast('Kode dihanguskan.'); r.kode_aktif = null; daftarUndang();
}

/* ---------- mulai ---------- */
const awal = location.hash.slice(1) || (localStorage.getItem(SIMPAN_KODE) ? 'kartu' : 'awal');
tampil(awal, { ganti: true });

let terakhir;
sb.auth.onAuthStateChange(async (ev, session) => {
  const u = session ? session.user : null; const pertama = !authSiap; authSiap = true;
  if (!pertama && (u && u.id) === terakhir) return; terakhir = u && u.id; user = u;
  if (user) {
    if (!sessionStorage.getItem('mdnd-log-portal')) { sessionStorage.setItem('mdnd-log-portal', '1'); catatAksi('buka_portal'); }
    peran = await peranSaya();
  } else { sessionStorage.removeItem('mdnd-log-portal'); peran = { moderator: false }; }
  renderAkun();
  let v = view;
  if (user && sessionStorage.getItem(SETELAH_LOGIN)) { sessionStorage.removeItem(SETELAH_LOGIN); v = 'undang'; }
  if (v !== 'kartu') tampil(v, { riwayat: v === view });
});
