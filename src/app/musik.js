/**
 * Smart Music UI + penghubung ke alur cerita.
 * Mendengarkan event yang sudah ada di aplikasi (bus 'scene': adegan dibuka, hasil lemparan diterapkan, ending),
 * menganalisis adegan aktif secara lokal (teks cerita tidak dikirim ke layanan mana pun),
 * lalu meminta PengaturMusik memutuskan apakah musik perlu berganti.
 */
import { bus } from '../shared/bus';
import { SUASANA, KATEGORI_MANUAL, PengaturMusik, analisisAdegan, analisisHasil, analisisEnding } from '../core/musik';
import { cariKandidat, tandaiRusak, infoApi } from './musik-cari.js';
import { PemutarYT } from './musik-player.js';
import '../styles/musik.css';

const PREF_KEY = 'masterydnd-musik-pref';
const JEDA_ADEGAN_MS = 1200; // tunggu GM berhenti berpindah adegan sebelum menganalisis
const PESAN_API = {
  belum_dikonfigurasi: 'YouTube API belum diatur, memakai daftar musik cadangan.',
  tidak_ada_api: 'Server musik belum tersedia, memakai daftar musik cadangan.',
  kuota_habis: 'Kuota YouTube API hari ini habis, memakai daftar cadangan.',
  kunci_ditolak: 'YouTube API key ditolak, memakai daftar cadangan.',
  jaringan: 'Pencarian musik gagal (koneksi), memakai daftar cadangan.',
  offline: 'Perangkat offline: musik butuh internet. Cerita tetap bisa dimainkan.',
  terlalu_sering: 'Terlalu banyak pencarian, memakai daftar cadangan sementara.',
  api_gagal: 'YouTube API sedang bermasalah, memakai daftar cadangan.',
};

/** Ikon SVG inline (tanpa emoji, tampil sama di semua perangkat). */
const svg = d => `<svg class="mz-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const IKON = {
  musik: svg('<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="6" cy="18" r="3" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="currentColor"/>'),
  play: svg('<path d="M8 5v14l11-7z" fill="currentColor"/>'),
  pause: svg('<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>'),
  next: svg('<path d="M6 5v14l9-7zM16 5h3v14h-3z" fill="currentColor"/>'),
  prev: svg('<path d="M18 5v14l-9-7zM5 5h3v14H5z" fill="currentColor"/>'),
  petir: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>'),
  eq: svg('<path d="M5 20V11M10 20V5M15 20v-8M20 20V8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  kunci: svg('<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>'),
  buka: svg('<rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 7.5-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  suara: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  bisu: svg('<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  ringkas: svg('<path d="M5 14h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  luas: svg('<rect x="5" y="6" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  tutup: svg('<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  calm: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor"/>'),
  happy: svg('<circle cx="12" cy="12" r="4.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  slow_fun: svg('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" fill="currentColor"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  war: svg('<path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4M7 14l3 3M5 19l3-3M17 14l-3 3M19 19l-3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  neutral: svg('<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/>'),
};
const ikonKat = k => IKON[k] || IKON.neutral;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bacaPref() {
  const d = { auto: true, vol: 60, bisu: false, ringkas: window.matchMedia('(max-width: 600px)').matches, kat: null };
  try { return Object.assign(d, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { return d; }
}

export function initMusik() {
  if (document.getElementById('mzPanel')) return; // jangan pernah membuat panel/pemutar ganda
  const pref = bacaPref();
  const simpan = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(pref)); } catch (e) { /* abaikan */ } };
  const atur = new PengaturMusik();
  atur.mode = pref.auto ? 'auto' : 'manual';
  if (!pref.auto && pref.kat && SUASANA[pref.kat]) atur.aktif = pref.kat;

  const st = {
    dimulai: false,      // pengguna sudah menekan Play setidaknya sekali (syarat autoplay browser)
    dijeda: false,       // pengguna menjeda / menutup panel: pergantian otomatis tidak boleh membunyikan musik lagi
    kandidat: [], kat: null, idx: 0, gagalBeruntun: 0, lagu: null,
    status: 'diam', memuat: false, galat: '', diblokir: false,
    asal: '', kunciAdegan: '', tAdegan: null, tTunda: null, putaran: {},
  };

  /* ---------------- markup ---------------- */
  document.body.insertAdjacentHTML('beforeend', `
<button class="mz-launch noterm" id="mzLaunch" type="button" aria-expanded="false" aria-controls="mzPanel" title="Musik Adaptif">
  <span class="mz-l-ikon" aria-hidden="true">${IKON.musik}</span><span class="mz-l-teks" id="mzLKat">Musik</span><span class="mz-eq" aria-hidden="true"><i></i><i></i><i></i></span>
</button>
<section class="mz-panel noterm" id="mzPanel" aria-labelledby="mzH" hidden><div class="mz-isi">
  <header class="mz-head">
    <h2 id="mzH">${IKON.musik}<span class="mz-h-teks">Musik Adaptif</span><span class="mz-h-eq">${IKON.eq}</span></h2>
    <button class="mz-auto" id="mzAuto" type="button" role="switch" aria-checked="true" title="Auto: musik mengikuti suasana adegan">Auto <b>ON</b></button>
    <button class="mz-ikon" id="mzRingkas" type="button" aria-pressed="false" title="Ringkas panel">${IKON.ringkas}</button>
    <button class="mz-ikon" id="mzTutup" type="button" aria-label="Tutup panel musik (musik dijeda)" title="Tutup (musik dijeda)">${IKON.tutup}</button>
  </header>
  <div class="mz-status"><span class="mz-chip" id="mzChip">Netral</span><small id="mzAsal">Menunggu adegan…</small></div>
  <div class="mz-saran" id="mzSaran" hidden></div>
  <div class="mz-layar" id="mzLayar">
    <div class="mz-kosong" id="mzKosong"><p>Musik latar dari YouTube yang menyesuaikan suasana adegan.</p><button class="btn" id="mzMulai" type="button">Mulai musik</button></div>
    <div class="mz-yt" id="mzYT"></div>
  </div>
  <p class="mz-lagu" id="mzLagu" aria-live="polite">Belum ada musik diputar.</p>
  <div class="mz-kontrol">
    <button class="mz-btn" id="mzPrev" type="button" aria-label="Musik sebelumnya" title="Musik sebelumnya">${IKON.prev}</button>
    <button class="mz-btn mz-play" id="mzPlay" type="button" aria-label="Putar musik">${IKON.play}</button>
    <button class="mz-btn" id="mzNext" type="button" aria-label="Musik berikutnya" title="Musik berikutnya">${IKON.next}</button>
    <button class="mz-btn" id="mzKunci" type="button" aria-pressed="false" aria-label="Kunci musik" title="Kunci musik ini (tidak diganti otomatis)">${IKON.buka}</button>
    <button class="mz-btn" id="mzBisu" type="button" aria-pressed="false" aria-label="Bisukan">${IKON.suara}</button>
    <label class="mz-vol"><span class="sr">Volume</span><input type="range" id="mzVol" min="0" max="100" step="1"></label>
  </div>
  <div class="mz-kat" role="group" aria-label="Pilih suasana musik secara manual">
    ${KATEGORI_MANUAL.map(k => `<button type="button" class="mz-kb" data-mzk="${k}" aria-pressed="false" title="${esc(SUASANA[k].ket)}">${ikonKat(k)}<span>${esc(SUASANA[k].nama)}</span></button>`).join('')}
  </div>
  <p class="mz-pesan" id="mzPesan" role="status" aria-live="polite"></p>
  <p class="mz-catatan">Diputar lewat pemutar resmi YouTube. Teks cerita dianalisis di perangkat ini dan tidak dikirim ke mana pun.</p>
</div></section>`);

  const pemutar = new PemutarYT($('mzYT'), {
    onStatus: s => { st.status = s; if (s === 'main') { st.diblokir = false; st.gagalBeruntun = 0; st.memuat = false; st.galat = ''; if (st.sementara) pesan(''); } render(); },
    onGalat: g => {
      if (g.id && g.kode !== 5) tandaiRusak(g.id);
      st.gagalBeruntun++;
      if (st.gagalBeruntun >= Math.max(3, st.kandidat.length)) { st.memuat = false; st.galat = `Musik ${SUASANA[st.kat || 'neutral'].nama} tidak bisa diputar saat ini. Coba tombol Berikutnya atau pilih suasana lain.`; render(); return; }
      pesan(`${g.pesan}. Mencoba musik berikutnya…`, true); berikutnya(false);
    },
    onSelesai: () => { if (atur.kunci) pemutar.ulang(); else berikutnya(true); },
    onDiblokir: () => { st.diblokir = true; st.memuat = false; render(); },
  });
  pemutar.vol = pref.vol; pemutar.bisu = pref.bisu;

  /* ---------------- aksi ---------------- */
  function pesan(t, sementara) { st.galat = ''; st.sementara = !!sementara; $('mzPesan').textContent = t || ''; $('mzPesan').classList.remove('galat'); }
  const genre = () => { try { return (bus.app && bus.app.R && bus.app.R.genre) || ''; } catch (e) { return ''; } };

  async function gantiKategori(kat) {
    st.kat = kat; st.memuat = true; st.galat = ''; st.gagalBeruntun = 0; render();
    const list = await cariKandidat(kat, genre());
    if (st.kat !== kat) return; // kategori sudah berubah lagi selama pencarian
    st.kandidat = list;
    const api = infoApi(); pesan(PESAN_API[api.kode] || '');
    if (!list.length) { st.memuat = false; st.galat = 'Tidak ada musik untuk suasana ini.'; render(); return; }
    // Bergiliran: kembali ke kategori yang sama memutar kandidat berikutnya, bukan selalu yang pertama.
    st.idx = (st.putaran[kat] || 0) % list.length; st.putaran[kat] = st.idx + 1;
    await putarIdx();
  }
  async function putarIdx() {
    const lagu = st.kandidat[st.idx]; if (!lagu) return;
    st.lagu = lagu; st.memuat = true; st.status = 'muat'; render();
    // Pengguna sedang menjeda: lagu baru hanya disiapkan, tidak langsung berbunyi.
    try { if (st.dijeda) { await pemutar.siapkan(lagu.id); st.memuat = false; render(); } else await pemutar.putar(lagu.id, { halus: true }); }
    catch (e) { st.memuat = false; st.galat = e.message || 'Pemutar YouTube gagal dimuat.'; render(); }
  }
  function berikutnya(halusSaja, arah = 1) {
    if (!st.kandidat.length) { if (st.kat) gantiKategori(st.kat); return; }
    st.idx = (st.idx + arah + st.kandidat.length) % st.kandidat.length; st.putaran[st.kat] = st.idx + 1;
    if (!halusSaja) st.memuat = true; putarIdx();
  }
  function jalankan(k) {
    clearTimeout(st.tTunda);
    if (!k) return render();
    if (k.aksi === 'ganti' && k.kategori) { if (st.dimulai) gantiKategori(k.kategori); }
    else if (k.aksi === 'tunda') st.tTunda = setTimeout(() => jalankan(atur.cekTertunda(Date.now())), (k.sisa || 0) + 100);
    render();
  }
  async function mulai() {
    st.dimulai = true; bukaPanel(true);
    if (!atur.aktif) { const a = adeganAktif(); jalankan(atur.usul(a ? analisisAdegan(a) : analisisAdegan(null), Date.now())); if (atur.aktif) return; }
    gantiKategori(atur.aktif || 'neutral');
  }

  /* ---------------- integrasi cerita ---------------- */
  function adeganAktif() {
    try { const W = bus.app && bus.app.W; if (!W || !W.story || !W.sesi || W.sesi.ended) return null; return W.story.adegan[W.sesi.cur] || null; } catch (e) { return null; }
  }
  const pct = v => Math.round((v || 0) * 100) + '%';
  function terimaAnalisis(h, asal) {
    const k = atur.usul(h, Date.now()); const nama = SUASANA[h.kategori].nama;
    const dasar = h.sumber === 'ai' ? `${asal} · tanda suasana dari cerita` : `${asal} · yakin ${pct(h.yakin)}`;
    st.asal = h.sumber === 'netral' ? `${asal} · suasana belum jelas, musik dipertahankan`
      : k.aksi === 'tunda' ? `${asal} terasa ${nama} · musik berganti sebentar lagi`
      : k.aksi === 'tahan' && h.kategori !== atur.aktif && atur.mode === 'auto' && !atur.kunci ? `${asal} cenderung ${nama} (${pct(h.yakin)}) · belum cukup kuat, musik dipertahankan`
      : dasar;
    jalankan(k);
  }
  bus.on('scene', m => {
    if (!m || !m.type) return;
    if (m.type === 'scene') {
      const W = bus.app && bus.app.W; const kunci = `${(W && W.story && W.story.judul) || ''}|${m.no}`;
      if (kunci === st.kunciAdegan) return; // renderScene sering dipanggil ulang untuk adegan yang sama
      st.kunciAdegan = kunci; clearTimeout(st.tAdegan);
      st.tAdegan = setTimeout(() => {
        const a = (W && W.story && W.story.adegan || []).find(x => x.no === m.no) || adeganAktif();
        terimaAnalisis(analisisAdegan(a), `Adegan ${m.no}`);
      }, JEDA_ADEGAN_MS);
    } else if (m.type === 'hasil') {
      const h = analisisHasil(m, atur.aktif); if (h.kategori !== 'neutral') terimaAnalisis(h, 'Hasil lemparan');
    } else if (m.type === 'ending') {
      st.kunciAdegan = 'ending|' + (m.judul || ''); clearTimeout(st.tAdegan);
      st.tAdegan = setTimeout(() => terimaAnalisis(analisisEnding(m), 'Ending'), JEDA_ADEGAN_MS);
    }
  });
  // Keluar akun / gerbang login tertutup: jeda musik (pemutar tidak boleh berbunyi tersembunyi).
  new MutationObserver(() => { if (document.body.classList.contains('terkunci') && pemutar.sedangMain()) pemutar.jeda(); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('online', () => { if (st.galat && st.kat && st.dimulai) gantiKategori(st.kat); else render(); });
  window.addEventListener('offline', () => pesan(PESAN_API.offline));

  /* ---------------- UI ---------------- */
  function bukaPanel(buka) {
    $('mzPanel').hidden = !buka; $('mzLaunch').setAttribute('aria-expanded', String(buka)); document.body.classList.toggle('mz-buka', buka);
    if (!buka && pemutar.sedangMain()) { pemutar.jeda(); st.dijeda = true; } // pemutar disembunyikan → musik dijeda
    render();
  }
  function render() {
    const kat = atur.aktif || st.kat || 'neutral'; const info = SUASANA[kat];
    const main = st.status === 'main';
    $('mzChip').innerHTML = `${ikonKat(kat)}${esc(info.nama)}`; $('mzChip').dataset.k = kat;
    $('mzAsal').textContent = st.asal || (atur.mode === 'manual' ? 'Dipilih manual' : 'Menunggu adegan…');
    const auto = atur.mode === 'auto';
    $('mzAuto').setAttribute('aria-checked', String(auto)); $('mzAuto').innerHTML = `${IKON.petir}Auto <b>${auto ? 'ON' : 'OFF'}</b>`;
    document.querySelectorAll('[data-mzk]').forEach(b => b.setAttribute('aria-pressed', String(!auto && b.dataset.mzk === atur.aktif)));
    $('mzKunci').setAttribute('aria-pressed', String(atur.kunci)); $('mzKunci').innerHTML = atur.kunci ? IKON.kunci : IKON.buka;
    $('mzKunci').title = atur.kunci ? 'Musik dikunci: tidak diganti otomatis (klik untuk membuka)' : 'Kunci musik ini (tidak diganti otomatis)';
    $('mzPlay').innerHTML = main ? IKON.pause : IKON.play; $('mzPlay').setAttribute('aria-label', main ? 'Jeda musik' : 'Putar musik');
    $('mzBisu').innerHTML = pemutar.bisu ? IKON.bisu : IKON.suara; $('mzBisu').setAttribute('aria-pressed', String(pemutar.bisu)); $('mzBisu').setAttribute('aria-label', pemutar.bisu ? 'Bunyikan' : 'Bisukan');
    $('mzVol').value = String(pemutar.vol); $('mzVol').setAttribute('aria-valuetext', pemutar.bisu ? 'bisu' : pemutar.vol + '%');
    $('mzNext').disabled = !st.dimulai; $('mzPrev').disabled = !st.dimulai;
    $('mzKosong').hidden = st.dimulai && !!st.lagu; $('mzYT').hidden = !(st.dimulai && st.lagu);
    $('mzMulai').textContent = st.diblokir ? 'Mulai musik (browser menahan autoplay)' : 'Mulai musik';
    if (st.diblokir) { $('mzKosong').hidden = false; }
    const l = st.lagu;
    $('mzLagu').innerHTML = st.memuat && !main ? `<span class="mz-spin" aria-hidden="true"></span>Memuat musik ${esc(info.nama)}…`
      : l ? `<b>${esc(pemutar.judulSaatIni() || l.judul)}</b><small>${esc(l.kanal || '')}${l.sumber === 'cadangan' ? ' · daftar cadangan' : ''} · <a href="https://www.youtube.com/watch?v=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">Buka di YouTube</a></small>`
      : 'Belum ada musik diputar.';
    if (st.galat) { $('mzPesan').textContent = st.galat; $('mzPesan').classList.add('galat'); }
    else if (st.diblokir) { $('mzPesan').textContent = 'Browser menahan pemutaran otomatis. Tekan ▶ untuk memulai musik.'; $('mzPesan').classList.remove('galat'); }
    // Saran saat manual/terkunci: deteksi tetap jalan, pengguna yang memutuskan.
    const s = atur.saran; const sr = $('mzSaran');
    if (s && s.kategori !== 'neutral' && s.kategori !== atur.aktif && (atur.mode === 'manual' || atur.kunci)) {
      sr.hidden = false;
      sr.innerHTML = `Adegan saat ini terasa <b>${esc(SUASANA[s.kategori].nama)}</b>.${atur.kunci ? ' Musik dikunci.' : ''} <button type="button" class="mz-link" id="mzIkuti">Pakai</button>`;
      $('mzIkuti').onclick = () => { atur.setKunci(false); jalankan(atur.pilihManual(s.kategori, Date.now())); if (!st.dimulai) mulai(); };
    } else sr.hidden = true;
    const ln = $('mzLaunch'); ln.classList.toggle('main', main); $('mzLKat').textContent = st.dimulai ? info.nama : 'Musik';
    ln.setAttribute('aria-label', `Musik Adaptif: ${info.nama}${main ? ', sedang diputar' : ''}`);
    $('mzPanel').classList.toggle('ringkas', !!pref.ringkas); $('mzRingkas').setAttribute('aria-pressed', String(!!pref.ringkas));
    $('mzRingkas').title = pref.ringkas ? 'Tampilkan semua kontrol' : 'Ringkas panel'; $('mzRingkas').setAttribute('aria-label', $('mzRingkas').title);
    $('mzRingkas').innerHTML = pref.ringkas ? IKON.luas : IKON.ringkas;
  }

  // Body diberi ruang setinggi panel supaya tombol aplikasi tidak pernah tertutup panel.
  new ResizeObserver(() => document.body.style.setProperty('--mz-h', ($('mzPanel').hidden ? 0 : $('mzPanel').offsetHeight) + 'px')).observe($('mzPanel'));
  $('mzLaunch').onclick = () => { const buka = $('mzPanel').hidden; bukaPanel(buka); if (buka) $('mzAuto').focus(); };
  $('mzTutup').onclick = () => { bukaPanel(false); $('mzLaunch').focus(); };
  $('mzRingkas').onclick = () => { pref.ringkas = !pref.ringkas; simpan(); render(); };
  $('mzMulai').onclick = () => { st.dijeda = false; if (st.diblokir && st.lagu) { st.diblokir = false; pemutar.main(); render(); } else mulai(); };
  $('mzPlay').onclick = () => {
    if (!st.dimulai || !st.lagu) { mulai(); return; }
    if (pemutar.sedangMain()) { pemutar.jeda(); st.dijeda = true; } else { st.diblokir = false; st.dijeda = false; pemutar.main(); }
  };
  $('mzNext').onclick = () => { st.gagalBeruntun = 0; st.dijeda = false; berikutnya(false); };
  $('mzPrev').onclick = () => { st.gagalBeruntun = 0; st.dijeda = false; berikutnya(false, -1); };
  $('mzKunci').onclick = () => { atur.setKunci(!atur.kunci); pesan(atur.kunci ? 'Musik dikunci: tidak akan diganti otomatis, diulang bila selesai.' : 'Kunci dibuka.'); render(); };
  $('mzBisu').onclick = () => { pref.bisu = !pemutar.bisu; pemutar.setBisu(pref.bisu); simpan(); render(); };
  $('mzVol').oninput = e => { pref.vol = +e.target.value; pemutar.setVolume(pref.vol); if (pemutar.bisu && pref.vol > 0) { pemutar.setBisu(false); pref.bisu = false; } simpan(); render(); };
  $('mzAuto').onclick = () => {
    const on = atur.mode !== 'auto'; pref.auto = on; simpan();
    pesan(on ? 'Auto ON: musik mengikuti suasana adegan.' : 'Auto OFF: pilih suasana sendiri.');
    jalankan(atur.setAuto(on, Date.now()));
  };
  document.querySelectorAll('[data-mzk]').forEach(b => b.onclick = () => {
    const k = b.dataset.mzk; pref.auto = false; pref.kat = k; simpan(); pesan('');
    st.dijeda = false; jalankan(atur.pilihManual(k, Date.now())); if (!st.dimulai) mulai();
  });
  $('mzPanel').addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); bukaPanel(false); $('mzLaunch').focus(); } });
  render();
  // Modul ini dimuat setelah halaman: analisis adegan yang sudah terbuka sekarang.
  { const a = adeganAktif(); if (a) { st.kunciAdegan = `${bus.app.W.story.judul || ''}|${a.no}`; terimaAnalisis(analisisAdegan(a), `Adegan ${a.no}`); } }
  if (bus.app) bus.app.musik = { atur, st, pemutar }; // untuk pengujian & debug
}
