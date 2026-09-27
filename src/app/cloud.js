/**
 * Cloud GM (Supabase): login, sinkronisasi offline-first, foto, status pahlawan untuk portal,
 * undangan pemain, rekap, dan penghapusan data.
 *
 * Prinsip: perangkat GM tetap sumber kerja utama (bisa dipakai tanpa internet). Setiap perubahan
 * disimpan dulu di perangkat, lalu dikirim ke cloud beberapa detik kemudian bila GM sudah masuk.
 */
import { sb, pesanError, dataUrlToBlob, blobToDataUrl, loginModalHtml, bindLoginModal, logout } from '../shared/supa';
import { bus } from '../shared/bus';
import { CONFIG } from '../shared/config';
import { esc, uuid } from '../core/util';

const A = () => bus.app;
const $ = id => document.getElementById(id);
let user = null;
let status = 'keluar'; // keluar | siap | menyimpan | tersimpan | offline | gagal
let pesan = '';
let timer = null;
let sinkronBerjalan = false;
let antreLagi = false;

/* ---------------- status & tampilan ---------------- */
function setStatus(s, m) { status = s; pesan = m || ''; renderAkun(); if ($('p-pengaturan') && $('p-pengaturan').classList.contains('active')) renderPengaturan(); }
const LABEL = { keluar: 'Belum masuk', siap: 'Terhubung', menyimpan: 'Menyimpan ke cloud…', tersimpan: 'Tersimpan di cloud', offline: 'Offline — tersimpan di perangkat', gagal: 'Sinkronisasi gagal' };

function namaUser() { const m = (user && user.user_metadata) || {}; return m.full_name || m.name || (user && user.email ? user.email.split('@')[0] : 'Game Master'); }
function renderAkun() {
  const el = $('akunBox'); if (!el) return;
  if (!user) { el.innerHTML = `<button class="btn login-btn" id="akLogin" type="button">Masuk</button>`; $('akLogin').onclick = bukaLogin; return; }
  const av = (user.user_metadata || {}).avatar_url || '/img/avatar.webp';
  el.innerHTML = `<button class="akun-btn" id="akBtn" type="button" title="${esc(LABEL[status])}${pesan ? ': ' + esc(pesan) : ''}">
    <img src="${esc(av)}" alt="" referrerpolicy="no-referrer" onerror="this.src='/img/avatar.webp'"><span><b>${esc(namaUser())}</b><small>Game Master · <i class="dot ${status}"></i>${esc(LABEL[status])}</small></span></button>`;
  $('akBtn').onclick = () => A().showTab('pengaturan');
}
function bukaLogin() {
  A().modal(loginModalHtml('Masuk sebagai Game Master', 'Campaign, pahlawan, dan foto akan tersimpan di cloud sehingga bisa dibuka dari perangkat lain. Tanpa masuk pun aplikasi tetap bisa dipakai penuh di perangkat ini.') +
    `<div class="actions"><button class="dbtn" onclick="closeModal()">Nanti saja</button></div>`);
  bindLoginModal($('modalBody'));
}

/* ---------------- konversi campaign ↔ baris database ---------------- */
function bersihHero(h) { const o = JSON.parse(JSON.stringify(h)); delete o._open; return o; }
function campaignRow(c) {
  const sys = JSON.parse(JSON.stringify(c.sys || {}));
  sys._arsip = c.arsip || []; sys._bawaan = c.bawaan || null; sys._storyCid = c.storyCid || null;
  return { id: c.id, owner_id: user.id, nama: c.nama || 'Campaign', genre: c.genre, genre_custom: c.genre === 'custom' ? c.custom : null, sys, bab_aktif: c.bab || 1 };
}
async function cek(q) { const r = await q; if (r.error) throw r.error; return r.data; }

/** Kirim satu campaign lengkap ke cloud. */
async function push(c) {
  const row = await cek(sb.from('campaigns').upsert(campaignRow(c)).select('version,updated_at').single());
  const heroes = (c.heroes || []).map((h, i) => ({
    id: h.cid, campaign_id: c.id, slug: h.id || h.cid.slice(0, 8), urutan: i, foto_path: h.fotoPath || null,
    data: Object.assign(bersihHero(h), { kartu: A().cardDataOf(c, h) }),
  }));
  if (heroes.length) await cek(sb.from('heroes').upsert(heroes));
  const ids = heroes.map(h => h.id);
  let del = sb.from('heroes').delete().eq('campaign_id', c.id);
  if (ids.length) del = del.not('id', 'in', `(${ids.join(',')})`);
  await cek(del);
  if (c.story) {
    c.storyCid = c.storyCid || uuid();
    await cek(sb.from('stories').upsert({ id: c.storyCid, campaign_id: c.id, bab: c.bab || 1, judul: c.story.judul || c.sys.judul || '', data: c.story }));
  }
  if (c.sesi) {
    c.sesi.cid = c.sesi.cid || uuid();
    await cek(sb.from('sessions').upsert({ id: c.sesi.cid, campaign_id: c.id, story_id: c.story ? c.storyCid : null, bab: c.bab || 1, state: c.sesi, bawaan: c.bawaan || null,
      status: c.sesi.ended ? 'selesai' : 'berjalan', ended_at: c.sesi.ended ? new Date().toISOString() : null }));
  }
  // status yang boleh dilihat pemain
  const st = (c.heroes || []).map(h => {
    const x = A().statusOf(c, h);
    return x ? { hero_id: h.cid, campaign_id: c.id, session_id: c.sesi ? c.sesi.cid : null, hati: x.hati, hati_maks: x.hati_maks, skill_sisa: x.skill_sisa, tumbang: x.tumbang, gugur: x.gugur, lencana: x.lencana }
      : { hero_id: h.cid, campaign_id: c.id, session_id: null, hati: Number(h.nyawa) || 3, hati_maks: Number(h.nyawa) || 3, skill_sisa: 3, tumbang: false, gugur: false, lencana: [] };
  });
  if (st.length) await cek(sb.from('hero_status').upsert(st));
  c.cloud = Object.assign(c.cloud || {}, { syncedVersion: row.version, syncedAt: Date.now(), dirty: false });
}

/** Ambil campaign dari cloud menjadi objek lokal. */
async function pull(id) {
  const c = await cek(sb.from('campaigns').select('*').eq('id', id).single());
  const heroes = await cek(sb.from('heroes').select('*').eq('campaign_id', id).order('urutan'));
  const sys = c.sys || {}; const storyCid = sys._storyCid || null;
  let story = null;
  if (storyCid) { const r = await cek(sb.from('stories').select('id,data').eq('id', storyCid).maybeSingle()); story = r ? r.data : null; }
  const ses = await cek(sb.from('sessions').select('id,state,story_id,bab').eq('campaign_id', id).eq('bab', c.bab_aktif).order('started_at', { ascending: false }).limit(1));
  let sesi = ses && ses[0] ? Object.assign(ses[0].state || {}, { cid: ses[0].id }) : null;
  if (sesi && storyCid && ses[0].story_id && ses[0].story_id !== storyCid) sesi = null;
  const arsip = sys._arsip || [], bawaan = sys._bawaan || null; delete sys._arsip; delete sys._bawaan; delete sys._storyCid;
  const lama = A().R.camps[id] || {};
  const obj = {
    id, nama: c.nama, genre: c.genre, custom: c.genre_custom || null, sys, bab: c.bab_aktif || 1, arsip, bawaan, story, storyCid, sesi,
    heroes: heroes.map(r => { const h = r.data || {}; delete h.kartu; h.cid = r.id; h.fotoPath = r.foto_path || null; return h; }),
    undo: [], draft: null, dibuat: lama.dibuat || Date.parse(c.created_at) || Date.now(), diubah: Date.parse(c.updated_at) || Date.now(),
    cloud: { syncedVersion: c.version, syncedAt: Date.now(), dirty: false },
  };
  A().setCamps(R => { R.camps[id] = obj; });
  // foto yang belum ada di perangkat ini
  for (const h of obj.heroes) {
    if (!h.fotoPath) continue; const key = A().photoKeyOf(obj, h);
    if (await A().IDB.get(key)) continue;
    const { data, error } = await sb.storage.from('foto').download(h.fotoPath);
    if (!error && data) await A().IDB.set(key, await blobToDataUrl(data));
  }
  return obj;
}

/* ---------------- sinkronisasi ---------------- */
async function sinkronAwal() {
  if (!user) return; setStatus('menyimpan', 'Mencocokkan data dengan cloud…');
  try {
    const cloud = await cek(sb.from('campaigns').select('id,nama,version,updated_at').eq('owner_id', user.id));
    const R = A().R; const lokal = R.camps; const cloudIds = new Set(cloud.map(c => c.id));
    for (const cc of cloud) {
      const l = lokal[cc.id];
      if (!l) { await pull(cc.id); continue; }
      const ver = (l.cloud || {}).syncedVersion;
      if (ver === cc.version) { if (l.cloud && l.cloud.dirty) await push(l); continue; }
      if (l.cloud && l.cloud.dirty && ver !== undefined) {
        const pakaiCloud = confirm(`Campaign "${l.nama}" diubah di perangkat lain DAN di perangkat ini.\n\nOK = pakai versi CLOUD (perubahan di perangkat ini dibuang)\nBatal = pakai versi PERANGKAT INI (menimpa cloud)`);
        if (pakaiCloud) await pull(cc.id); else await push(l);
      } else if (l.cloud && l.cloud.dirty && ver === undefined) {
        await push(l); // campaign lokal dengan id sama, belum pernah sinkron (mis. dari file simpanan)
      } else await pull(cc.id);
    }
    for (const l of Object.values(lokal)) {
      if (cloudIds.has(l.id)) continue;
      if (l.cloud && l.cloud.syncedAt) {
        const hapus = confirm(`Campaign "${l.nama}" sudah tidak ada di cloud (mungkin dihapus dari perangkat lain).\n\nOK = hapus juga dari perangkat ini\nBatal = unggah lagi ke cloud`);
        if (hapus) { A().setCamps(R => { delete R.camps[l.id]; if (R.aktif === l.id) A().activate(null); }); continue; }
      }
      await push(l);
    }
    // unggah foto lokal yang belum ada di cloud
    for (const c of Object.values(A().R.camps)) for (const h of c.heroes || []) {
      if (h.fotoPath) continue; const d = await A().IDB.get(A().photoKeyOf(c, h)); if (d) await uploadFoto(c, h, d, true);
    }
    A().setCamps(() => {}); simpanLokalTanpaTandai();
    if (A().R.aktif) A().activate(A().R.aktif);
    A().updateChrome(); refreshHalaman();
    setStatus('tersimpan');
  } catch (e) { gagal(e); }
}
function simpanLokalTanpaTandai() {
  // simpan tanpa menandai "dirty" (dipakai setelah tarik/dorong)
  try { localStorage.setItem('masterydnd-v3', JSON.stringify(A().R)); } catch (e) { /* toast ditangani main.js */ }
}
function refreshHalaman() {
  const act = document.querySelector('.page.active'); const id = act ? act.id.replace('p-', '') : '';
  if (id === 'beranda') A().showTab('beranda'); else if (id === 'heroes') A().renderHeroes(); else if (id === 'play') A().renderSide();
}
function gagal(e) {
  console.error('[cloud]', e);
  if (!navigator.onLine || /Failed to fetch|NetworkError/i.test(String(e && e.message))) setStatus('offline'); else setStatus('gagal', pesanError(e));
}
function jadwal() {
  if (!user) return; clearTimeout(timer);
  timer = setTimeout(sinkronKotor, 2500);
}
async function sinkronKotor() {
  if (!user) return; if (sinkronBerjalan) { antreLagi = true; return; }
  const kotor = Object.values(A().R.camps).filter(c => c.cloud && c.cloud.dirty);
  if (!kotor.length) { if (status !== 'offline' && status !== 'gagal') setStatus('tersimpan'); return; }
  sinkronBerjalan = true; setStatus('menyimpan');
  try { for (const c of kotor) await push(c); simpanLokalTanpaTandai(); setStatus('tersimpan'); }
  catch (e) { gagal(e); }
  finally { sinkronBerjalan = false; if (antreLagi) { antreLagi = false; jadwal(); } }
}

/* ---------------- foto ---------------- */
async function uploadFoto(c, h, dataUrl, diam) {
  if (!user) return;
  try {
    if (!c.cloud || !c.cloud.syncedAt) await push(c);
    const path = `${c.id}/${h.cid}.jpg`;
    const { error } = await sb.storage.from('foto').upload(path, dataUrlToBlob(dataUrl), { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (error) throw error;
    h.fotoPath = path; c.cloud.dirty = true; simpanLokalTanpaTandai(); jadwal();
  } catch (e) { if (!diam) A().toast('Foto tersimpan di perangkat, tetapi gagal diunggah: ' + pesanError(e), true); }
}
async function hapusFoto(c, h) {
  if (!user || !h.fotoPath) { h.fotoPath = null; return; }
  const p = h.fotoPath; h.fotoPath = null; c.cloud.dirty = true; A().save();
  const { error } = await sb.storage.from('foto').remove([p]); if (error) A().toast('Foto gagal dihapus dari cloud: ' + pesanError(error), true);
}

/* ---------------- undangan pemain ---------------- */
const ALFABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const kodeBaru = () => { const u = new Uint32Array(8); crypto.getRandomValues(u); return [...u].map(x => ALFABET[x % ALFABET.length]).join(''); };
async function undang(c, h) {
  if (!user) { A().toast('Masuk ke akun dulu untuk mengundang pemain ke portal.', true); bukaLogin(); return; }
  try {
    setStatus('menyimpan'); await push(c); simpanLokalTanpaTandai(); setStatus('tersimpan');
    const kode = kodeBaru();
    await cek(sb.from('invites').insert({ kode, campaign_id: c.id, hero_id: h.cid, dibuat_oleh: user.id }));
    const link = `${location.origin}/portal?kode=${kode}`;
    const msg = `Halo *${h.nama}*! 🎲\nKamu diundang ke campaign *${c.nama}* di MasteryDnD.\n\n1. Buka: ${link}\n2. Masuk dengan Google atau email\n3. Kode undanganmu: *${kode}* (otomatis terisi dari link, berlaku 14 hari)\n\nDi portal kamu bisa melihat kartu karakter, ${A().T('nyawa')} terkini, dan rekap cerita.`;
    let ok = false; try { await navigator.clipboard.writeText(msg); ok = true; } catch (e) { /* manual */ }
    A().modal(`<h2>Undangan untuk ${esc(h.nama)}</h2><p class="small">${ok ? 'Pesan sudah tersalin. Tempel di chat WA pemain.' : 'Salin pesan di bawah.'} Kode hanya bisa dipakai satu akun.</p>
      <p class="kode-besar">${kode}</p><div class="field"><textarea rows="9" readonly>${esc(msg)}</textarea></div>
      <div class="actions"><a class="dbtn" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Buka WhatsApp</a><button class="btn" onclick="closeModal()">Selesai</button></div>`);
    infoPortal();
  } catch (e) { gagal(e); A().toast('Undangan gagal dibuat: ' + pesanError(e), true); }
}
/** Tampilkan status hubungan pahlawan ↔ akun pemain di kartu pahlawan. */
async function infoPortal() {
  const els = [...document.querySelectorAll('[data-portal]')]; if (!els.length) return;
  if (!user) { els.forEach(el => el.textContent = 'Portal pemain: masuk ke akun untuk mengundang pemain.'); return; }
  const W = A().W; if (!W || !W.cloud || !W.cloud.syncedAt) { els.forEach(el => el.textContent = 'Portal pemain: campaign belum tersinkron ke cloud.'); return; }
  try {
    const mem = await cek(sb.from('campaign_members').select('user_id,hero_id,joined_at').eq('campaign_id', W.id).eq('peran', 'pemain'));
    const inv = await cek(sb.from('invites').select('kode,hero_id,kedaluwarsa,dipakai_oleh').eq('campaign_id', W.id).is('dipakai_oleh', null).gt('kedaluwarsa', new Date().toISOString()));
    els.forEach(el => {
      const cid = el.dataset.portal; const m = mem.find(x => x.hero_id === cid); const i = inv.filter(x => x.hero_id === cid);
      el.innerHTML = m ? `✅ Terhubung ke akun pemain sejak ${new Date(m.joined_at).toLocaleDateString('id-ID')}. <button class="dbtn red" data-putus="${esc(m.user_id)}" type="button" style="padding:1px 8px">Putuskan</button>`
        : i.length ? `⏳ Undangan aktif: <b>${i.map(x => esc(x.kode)).join(', ')}</b> (menunggu pemain masuk)` : 'Belum ada pemain yang terhubung.';
    });
    document.querySelectorAll('[data-putus]').forEach(b => b.onclick = async () => {
      if (!confirm('Putuskan pemain ini dari pahlawannya? Ia tidak bisa melihat kartu lagi sampai diundang ulang.')) return;
      try { await cek(sb.from('campaign_members').delete().eq('campaign_id', W.id).eq('user_id', b.dataset.putus)); infoPortal(); } catch (e) { A().toast(pesanError(e), true); }
    });
  } catch (e) { els.forEach(el => el.textContent = 'Portal pemain: ' + pesanError(e)); }
}

/* ---------------- rekap untuk portal ---------------- */
async function terbitkanRekap(c, teks) {
  if (!user) throw new Error('Masuk ke akun dulu.');
  await push(c); simpanLokalTanpaTandai();
  await cek(sb.from('session_recaps').upsert({ session_id: c.sesi.cid, campaign_id: c.id, judul: `${(c.story && c.story.judul) || c.nama} — Bab ${c.bab || 1}`, teks, terbit: true, terbit_at: new Date().toISOString() }, { onConflict: 'session_id' }));
}

/* ---------------- hapus data ---------------- */
async function hapusFolderFoto(campId) {
  const { data } = await sb.storage.from('foto').list(campId, { limit: 1000 });
  if (data && data.length) await sb.storage.from('foto').remove(data.map(f => `${campId}/${f.name}`));
}
async function hapusCampaignCloud(id) {
  if (!user) return;
  try { await hapusFolderFoto(id); await cek(sb.from('campaigns').delete().eq('id', id)); }
  catch (e) { A().toast('Campaign terhapus di perangkat, tetapi gagal dihapus dari cloud: ' + pesanError(e), true); }
}
async function hapusSemuaCloud(akunJuga) {
  const teks = akunJuga ? 'HAPUS AKUN' : 'HAPUS';
  const v = prompt(`${akunJuga ? 'Akun beserta SEMUA data cloud-mu akan dihapus permanen.' : 'SEMUA campaign, pahlawan, foto, dan rekap di cloud akan dihapus permanen. Data di perangkat ini tidak ikut terhapus.'}\n\nKetik ${teks} untuk melanjutkan:`);
  if (v !== teks) return;
  try {
    setStatus('menyimpan', 'Menghapus…');
    const cs = await cek(sb.from('campaigns').select('id').eq('owner_id', user.id));
    for (const c of cs) { await hapusFolderFoto(c.id); }
    await cek(sb.from('campaigns').delete().eq('owner_id', user.id));
    Object.values(A().R.camps).forEach(c => { c.cloud = {}; }); simpanLokalTanpaTandai();
    if (akunJuga) { await cek(sb.rpc('hapus_akun_saya')); await logout(); A().toast('Akun dan data cloud sudah dihapus.'); }
    else A().toast('Semua data cloud sudah dihapus. Data di perangkat ini tetap ada.');
    setStatus(user ? 'tersimpan' : 'keluar'); renderPengaturan();
  } catch (e) { gagal(e); A().toast('Gagal menghapus: ' + pesanError(e), true); }
}

/* ---------------- halaman Pengaturan ---------------- */
function renderPengaturan() {
  const el = $('cloudPanel'); if (!el) return;
  const R = A().R; const n = Object.keys(R.camps).length; const kotor = Object.values(R.camps).filter(c => c.cloud && c.cloud.dirty).length;
  if (!user) {
    el.innerHTML = `<h2>Akun Game Master</h2><p>Masuk supaya campaign tersimpan di cloud, bisa dibuka dari perangkat lain, dan pemain bisa melihat kartunya lewat <b>Portal Pemain</b>.</p>
      <p class="small">Tanpa masuk, semua fitur meja permainan tetap berjalan penuh di perangkat ini (${n} campaign tersimpan lokal).</p>
      <div class="actions"><button class="btn" id="pgLogin" type="button">Masuk / Daftar</button></div>`;
    $('pgLogin').onclick = bukaLogin;
  } else {
    el.innerHTML = `<h2>Akun Game Master</h2>
      <p>Masuk sebagai <b>${esc(namaUser())}</b> (${esc(user.email || '')}).</p>
      <p>Status: <i class="dot ${status}"></i> <b>${esc(LABEL[status])}</b>${pesan ? ` — ${esc(pesan)}` : ''}${kotor ? ` · ${kotor} campaign menunggu dikirim` : ''}</p>
      <div class="actions"><button class="btn alt" id="pgSync" type="button">Sinkronkan sekarang</button><button class="dbtn" id="pgLogout" type="button">Keluar</button></div>
      <h3>Portal pemain</h3><p class="small">Undang pemain dari kartu pahlawan (tab Pahlawan → <b>Undang ke portal pemain</b>). Pemain masuk di <a href="/portal" target="_blank" rel="noopener">${esc(location.origin)}/portal</a> dan hanya bisa melihat kartu, ${esc(A().T('nyawa'))} terkini, serta rekap yang kamu terbitkan.</p>
      <h3>Data &amp; privasi</h3>
      <div class="actions"><button class="dbtn red" id="pgHapusData" type="button">Hapus semua data cloud</button><button class="dbtn red" id="pgHapusAkun" type="button">Hapus akun</button></div>`;
    $('pgSync').onclick = () => sinkronAwal(); $('pgLogout').onclick = async () => { await logout(); };
    $('pgHapusData').onclick = () => hapusSemuaCloud(false); $('pgHapusAkun').onclick = () => hapusSemuaCloud(true);
  }
  const b = $('backupInfo'); if (b) b.textContent = R.backupAt ? `Cadangan file terakhir: ${new Date(R.backupAt).toLocaleString('id-ID')}` : 'Belum pernah menyimpan cadangan ke file.';
  const site = $('siteUrl'); if (site && !site.value) site.placeholder = CONFIG.situs;
}

/* ---------------- sambungkan ke aplikasi ---------------- */
export function initCloud() {
  A().cloudInfo = () => ({ login: !!user, status });
  A().renderPengaturan = renderPengaturan;
  A().terbitkanRekap = terbitkanRekap;
  bus.on('save', jadwal);
  bus.on('foto', (c, h, d) => uploadFoto(c, h, d));
  bus.on('fotoHapus', (c, h) => hapusFoto(c, h));
  bus.on('undang', (c, h) => undang(c, h));
  bus.on('heroesRendered', () => setTimeout(infoPortal, 0));
  bus.on('hapusCampaign', id => hapusCampaignCloud(id));
  bus.on('heroDihapus', (c, h) => { if (user && h.fotoPath) sb.storage.from('foto').remove([h.fotoPath]); });
  window.addEventListener('online', () => { if (user) { setStatus('menyimpan'); sinkronKotor(); } });
  window.addEventListener('offline', () => { if (user) setStatus('offline'); });
  renderAkun();
  let pertama = true;
  sb.auth.onAuthStateChange((ev, session) => {
    const u = session ? session.user : null; const ganti = (u && u.id) !== (user && user.id); user = u;
    if (!user) { setStatus('keluar'); if (!pertama) A().toast('Kamu sudah keluar. Data tetap tersimpan di perangkat ini.'); pertama = false; return; }
    if (ganti) { setStatus('siap'); setTimeout(sinkronAwal, 0); if (document.getElementById('modal').classList.contains('show') && $('lgGoogle')) A().closeModal(); }
    pertama = false;
  });
}
