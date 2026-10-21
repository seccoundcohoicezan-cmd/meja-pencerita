/**
 * Music Search Service (sisi server). Dipakai oleh Vercel Function `api/musik.js` dan server dev Vite.
 * - YOUTUBE_API_KEY hanya dibaca di server (Environment Variable Vercel), TIDAK PERNAH dikirim ke browser.
 * - Browser hanya boleh meminta kategori & genre yang dikenal (bukan kata kunci bebas), jadi kuota API tidak bisa disalahgunakan.
 * - Hasil: kandidat yang sudah dicek (bisa disematkan, publik, durasi wajar), diurutkan dari yang paling cocok.
 */

/** Kata kunci per kategori. Kategori baru: tambahkan di sini dan di src/core/musik.ts. */
export const KUERI = {
  calm: { q: 'peaceful cinematic ambient instrumental background music', cocok: ['peaceful', 'calm', 'ambient', 'piano', 'serene', 'relaxing', 'gentle', 'acoustic', 'soft'] },
  happy: { q: 'happy uplifting instrumental background music', cocok: ['happy', 'uplifting', 'cheerful', 'joyful', 'festival', 'celebration', 'orchestral', 'bright', 'positive'] },
  slow_fun: { q: 'relaxed chill lo-fi acoustic background music', cocok: ['lofi', 'lo-fi', 'chill', 'relaxed', 'acoustic', 'groove', 'cozy', 'tavern', 'cafe'] },
  war: { q: 'epic cinematic battle orchestral soundtrack instrumental', cocok: ['epic', 'battle', 'war', 'drums', 'orchestral', 'heroic', 'intense', 'action', 'cinematic'] },
  neutral: { q: 'soft ambient instrumental background music for storytelling', cocok: ['ambient', 'soft', 'instrumental', 'background', 'atmospheric'] },
  // Contoh kategori lanjutan (aktifkan juga di src/core/musik.ts):
  sad: { q: 'sad emotional piano strings instrumental background music', cocok: ['sad', 'emotional', 'melancholy', 'piano', 'strings'] },
  suspense: { q: 'dark suspense tension ambient instrumental background music', cocok: ['suspense', 'tension', 'dark', 'mystery', 'thriller'] },
  romantic: { q: 'romantic piano strings instrumental background music', cocok: ['romantic', 'love', 'piano', 'strings'] },
  horror: { q: 'horror dark ambient drone instrumental background music', cocok: ['horror', 'creepy', 'dark', 'drone', 'scary'] },
  epic: { q: 'majestic epic orchestral instrumental music', cocok: ['epic', 'majestic', 'orchestral', 'heroic'] },
};
/** Bumbu genre supaya musik sesuai dunia cerita. */
export const GENRE = {
  fantasy: 'fantasy medieval', archive: 'mysterious historical', apocalyptic: 'post apocalyptic', zombies: 'zombie survival',
  cyberpunk: 'cyberpunk synthwave', mystery: 'mystery noir', custom: '',
};

const BURUK = /\b(lyrics?|lirik|vocal|karaoke|cover song|reaction|tutorial|how to|#shorts|shorts|8d|slowed|reverb|nightcore|remix|live stream|podcast|asmr|trailer|gameplay|unboxing)\b/i;
const BAIK = /\b(instrumental|no vocals|ambient|soundtrack|ost|background music|bgm|music mix|no ads|royalty free|no copyright)\b/i;

/** ISO-8601 (PT1H2M3S) → detik. */
export function detik(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || '')); if (!m) return 0;
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
}

/** Skor kecocokan satu video. Bukan "hasil pertama pasti terbaik": judul, durasi, popularitas, dan kata kunci ikut dinilai. */
export function skorVideo(v, kat) {
  const judul = (v.snippet && v.snippet.title) || ''; const des = ((v.snippet && v.snippet.description) || '').slice(0, 400);
  const dur = detik(v.contentDetails && v.contentDetails.duration); const tayang = +(v.statistics && v.statistics.viewCount) || 0;
  let s = Math.log10(tayang + 1);
  if (dur >= 1200) s += 3; else if (dur >= 480) s += 2; else if (dur >= 180) s += 1; else s -= 4;
  if (BURUK.test(judul)) return -1; // lirik/vokal/reaction/shorts: bukan musik latar
  if (BAIK.test(judul)) s += 1.5; if (BURUK.test(des) && !BAIK.test(judul)) s -= 1;
  const t = (judul + ' ' + des).toLowerCase(); (KUERI[kat].cocok || []).forEach(w => { if (t.includes(w)) s += 0.6; });
  return Math.round(s * 100) / 100;
}

/** Saring video yang tidak bisa diputar di aplikasi. */
export function bisaDiputar(v, wilayah = 'ID') {
  const st = v.status || {}; const cd = v.contentDetails || {}; const sn = v.snippet || {};
  if (st.embeddable === false || st.privacyStatus !== 'public' || (st.uploadStatus && st.uploadStatus !== 'processed')) return false;
  if (sn.liveBroadcastContent && sn.liveBroadcastContent !== 'none') return false;
  const rr = cd.regionRestriction; if (rr && ((rr.blocked || []).includes(wilayah) || (rr.allowed && !rr.allowed.includes(wilayah)))) return false;
  return detik(cd.duration) >= 120;
}

const cache = new Map(); // cache per instance server (6 jam)
const CACHE_MS = 6 * 3600 * 1000;
const jatah = new Map(); // pembatas permintaan sederhana per IP
function bolehMinta(ip, now) {
  const j = jatah.get(ip) || { n: 0, t: now }; if (now - j.t > 60000) { j.n = 0; j.t = now; }
  j.n++; jatah.set(ip, j); if (jatah.size > 5000) jatah.clear(); return j.n <= 30;
}

/**
 * @returns {Promise<{status:number, headers:Record<string,string>, body:object}>}
 */
export async function cariMusik({ kategori, genre, apiKey, ip = '', fetchFn = fetch, now = Date.now() }) {
  const json = (status, body, cc) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cc }, body });
  if (!KUERI[kategori]) return json(400, { ok: false, kode: 'kategori_tidak_dikenal' }, 'no-store');
  const g = Object.prototype.hasOwnProperty.call(GENRE, genre) ? genre : 'custom';
  if (!apiKey) return json(503, { ok: false, kode: 'belum_dikonfigurasi', pesan: 'YOUTUBE_API_KEY belum diatur di server.' }, 'public, s-maxage=300');
  if (!bolehMinta(ip, now)) return json(429, { ok: false, kode: 'terlalu_sering' }, 'no-store');
  const kunci = kategori + '|' + g; const c = cache.get(kunci);
  const CC_OK = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';
  if (c && now - c.at < CACHE_MS) return json(200, c.body, CC_OK);
  const q = [GENRE[g], KUERI[kategori].q].filter(Boolean).join(' ');
  try {
    const p = new URLSearchParams({ part: 'snippet', type: 'video', q, maxResults: '15', videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'strict', regionCode: 'ID', key: apiKey });
    const r1 = await fetchFn('https://www.googleapis.com/youtube/v3/search?' + p, { headers: { Accept: 'application/json' } });
    const d1 = await r1.json().catch(() => ({}));
    if (!r1.ok) return gagalApi(json, d1);
    const ids = (d1.items || []).map(x => x.id && x.id.videoId).filter(Boolean);
    if (!ids.length) return json(200, { ok: true, kategori, genre: g, items: [] }, 'public, s-maxage=3600');
    const p2 = new URLSearchParams({ part: 'snippet,contentDetails,status,statistics', id: ids.join(','), key: apiKey });
    const r2 = await fetchFn('https://www.googleapis.com/youtube/v3/videos?' + p2, { headers: { Accept: 'application/json' } });
    const d2 = await r2.json().catch(() => ({}));
    if (!r2.ok) return gagalApi(json, d2);
    const perKanal = {};
    const items = (d2.items || []).filter(v => bisaDiputar(v)).map(v => ({ v, s: skorVideo(v, kategori) })).filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .filter(({ v }) => { const ch = v.snippet.channelId || v.snippet.channelTitle; perKanal[ch] = (perKanal[ch] || 0) + 1; return perKanal[ch] <= 2; })
      .slice(0, 8)
      .map(({ v, s }) => ({ id: v.id, judul: v.snippet.title, kanal: v.snippet.channelTitle, durasi: detik(v.contentDetails.duration), skor: s }));
    const body = { ok: true, kategori, genre: g, items };
    cache.set(kunci, { at: now, body });
    return json(200, body, CC_OK);
  } catch (e) {
    return json(502, { ok: false, kode: 'jaringan', pesan: 'Server tidak bisa menghubungi YouTube.' }, 'no-store');
  }
}
function gagalApi(json, d) {
  const alasan = (((d || {}).error || {}).errors || [])[0]; const r = alasan && alasan.reason || '';
  if (/quota|rateLimit|dailyLimit/i.test(r)) return json(429, { ok: false, kode: 'kuota_habis', pesan: 'Kuota YouTube API hari ini habis.' }, 'public, s-maxage=900');
  if (/keyInvalid|forbidden|accessNotConfigured|ipRefererBlocked/i.test(r) || ((d || {}).error || {}).code === 400)
    return json(503, { ok: false, kode: 'kunci_ditolak', pesan: 'YOUTUBE_API_KEY ditolak YouTube (cek key & aktifkan YouTube Data API v3).' }, 'public, s-maxage=300');
  return json(502, { ok: false, kode: 'api_gagal', pesan: 'YouTube API mengembalikan galat.' }, 'no-store');
}
