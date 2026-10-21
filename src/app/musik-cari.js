/**
 * Music Search Service (browser): minta kandidat ke /api/musik, simpan di cache perangkat,
 * dan selalu punya daftar cadangan supaya musik tetap jalan walau API belum diatur / kuota habis / offline.
 * Tidak ada API key di sini: kunci YouTube hanya ada di server.
 */
const CACHE_KEY = 'masterydnd-musik-cache-v1';
const RUSAK_KEY = 'masterydnd-musik-rusak-v1';
const CACHE_MS = 3 * 24 * 3600 * 1000;   // hasil API disimpan 3 hari di perangkat
const RUSAK_MS = 7 * 24 * 3600 * 1000;   // video yang gagal diputar dilewati selama 7 hari
const JEDA_GAGAL_MS = 30 * 60 * 1000;     // API belum diatur / kuota habis: jangan tanya lagi selama 30 menit

/**
 * Cadangan tanpa API (dicek bisa disematkan via oEmbed YouTube, 2026-10-21). Mix panjang dipilih agar jarang berganti sendiri.
 * Hak cipta tetap milik pemilik video; diputar lewat pemutar resmi YouTube.
 */
export const CADANGAN = {
  calm: [
    { id: 'aIMhtT52fi8', judul: 'Vale of the Quiet Heart | Fantasy Celtic Ambience', kanal: 'Strings of Eternity' },
    { id: 'UKbZ4r88z3Q', judul: 'The quiet beauty of everyday life | Piano Playlist', kanal: 'James Quinn' },
    { id: 'caAVbyTCptw', judul: 'Calm | Serene Meditative Music for Late Nights', kanal: 'Astral Ambience' },
    { id: 'uIBp-eN4Ph4', judul: 'ELYSIUM | Beautiful Atmospheric Ambient Orchestral Music', kanal: 'Pandora Journey' },
    { id: 'mm0QSsRwzUo', judul: 'Home Beyond the Vale | Fantasy Celtic Ambience', kanal: 'Strings of Eternity' },
  ],
  happy: [
    { id: '8u9ZC8WLIiU', judul: 'Festival Town | D&D/TTRPG Music | 1 Hour', kanal: 'Bardify' },
    { id: 'GnrOh2vfA0s', judul: 'DND Festival Music | Fantasy Holiday Celebration', kanal: 'Fantasy Soundscape' },
    { id: '7k3TtxqGqsk', judul: 'Epic Fantasy Tavern Feast | Medieval Party Music', kanal: 'beyondgirls' },
    { id: 'O8bLz32UIkA', judul: 'KINGDOM | Majestic Fantasy Orchestral Music', kanal: 'Pandora Journey' },
    { id: 'CPkRCr5qVHs', judul: 'Lively Celtic Fiddle - Irish Instrumental Music', kanal: 'God is Chill' },
    { id: 'RIu4vp_PuXU', judul: 'Upbeat Instrumental Music | Energetic Happy Background Music', kanal: 'StockSounds' },
  ],
  slow_fun: [
    { id: 'WBnjO3zEwCM', judul: 'Journey Through Time [medieval lofi]', kanal: 'Lofi Girl' },
    { id: 'WjnfTmtyCx4', judul: 'Take It Slow [Chill Acoustic, lofi mix]', kanal: 'Gentle Lo-Fi Days' },
    { id: 'vyg5jJrZ42s', judul: 'Medieval Fantasy Tavern | D&D Fantasy Music and Ambience', kanal: 'Daydreaming of Persephone' },
    { id: 'bF-ayUbGtu4', judul: 'Medieval Fantasy Music – Medieval Market', kanal: 'Fantasy Music World' },
    { id: 'D_uLM5i0Z4c', judul: 'Endless Sunday [Chillhop / instrumental beats]', kanal: 'Chillhop Music' },
    { id: 'nfn_a26qxZk', judul: 'pov: daily life as a villager (medieval playlist)', kanal: 'lost treasure' },
  ],
  war: [
    { id: 'rfC3wkZ43Jg', judul: 'BORN FOR THIS | Epic Heroic Orchestral Battle Music', kanal: 'Epic Music Mix' },
    { id: 'hKXVqnEIBh0', judul: 'UNBREAKABLE - Powerful Orchestral Music', kanal: 'Pandora Journey' },
    { id: 'AIidZ14BxH4', judul: 'Epic & Heroic Orchestral Music Compilation', kanal: 'Miniotto Music' },
    { id: 'lIM3tS4zwqc', judul: 'RISE OF SPARTAN – Ancient War Drums', kanal: 'Halevia Fantasy Music' },
    { id: 'FFQELUjWVRo', judul: 'Epic Roman Empire Music - Epic and Battle Music', kanal: 'David' },
    { id: 'Zx6b667d7CQ', judul: 'Ork Battle music | Wardrums & chants', kanal: 'Prometheus Studio' },
  ],
  neutral: [
    { id: 'hlighsabtUk', judul: 'Elmshire Overlook | Medieval Music for Relax and Study', kanal: 'Bard of the Greenwood' },
    { id: '4WIMyqBG9gs', judul: 'Fantasy Medieval Music | The Dwarf’s Long Mountain Journey', kanal: 'Springs of Serenity' },
    { id: 'aIMhtT52fi8', judul: 'Vale of the Quiet Heart | Fantasy Celtic Ambience', kanal: 'Strings of Eternity' },
  ],
};

const baca = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
const tulis = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memori penuh: abaikan */ } };

let jedaApiSampai = 0; let statusApi = { kode: 'belum', pesan: '' };
const sedangDicari = new Map();

/** Status terakhir API: 'ok' | 'cache' | 'belum_dikonfigurasi' | 'kuota_habis' | 'jaringan' | ... */
export const infoApi = () => statusApi;

export function tandaiRusak(id) { const r = baca(RUSAK_KEY); r[id] = Date.now(); tulis(RUSAK_KEY, r); }
function rusak() { const r = baca(RUSAK_KEY); const now = Date.now(); let ubah = false;
  Object.keys(r).forEach(id => { if (now - r[id] > RUSAK_MS) { delete r[id]; ubah = true; } }); if (ubah) tulis(RUSAK_KEY, r); return r; }

async function mintaApi(kategori, genre) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`/api/musik?kategori=${encodeURIComponent(kategori)}&genre=${encodeURIComponent(genre || '')}`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    const tipe = res.headers.get('content-type') || '';
    if (!tipe.includes('json')) throw Object.assign(new Error('API musik tidak tersedia di server ini.'), { kode: 'tidak_ada_api' });
    const d = await res.json();
    if (!res.ok || !d.ok) throw Object.assign(new Error(d.pesan || 'API musik gagal.'), { kode: d.kode || 'api_gagal' });
    return d.items || [];
  } finally { clearTimeout(t); }
}

/**
 * Daftar kandidat untuk satu kategori: hasil API (bila ada) lalu cadangan, tanpa duplikat dan tanpa video yang tercatat rusak.
 * Tidak pernah melempar galat: kegagalan API hanya mengubah `infoApi()`.
 */
export async function cariKandidat(kategori, genre = '') {
  const kunci = kategori + '|' + (genre || '');
  if (sedangDicari.has(kunci)) return sedangDicari.get(kunci);
  const job = (async () => {
    const cache = baca(CACHE_KEY); const c = cache[kunci]; let dariApi = [];
    if (c && Date.now() - c.at < CACHE_MS) { dariApi = c.items; statusApi = { kode: 'cache', pesan: '' }; }
    else if (Date.now() < jedaApiSampai || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      if (navigator.onLine === false) statusApi = { kode: 'offline', pesan: 'Perangkat offline.' };
      if (c) dariApi = c.items; // cache kedaluwarsa masih lebih baik daripada kosong
    } else {
      try {
        dariApi = await mintaApi(kategori, genre); statusApi = { kode: 'ok', pesan: '' };
        cache[kunci] = { at: Date.now(), items: dariApi }; tulis(CACHE_KEY, cache);
      } catch (e) {
        const kode = e.name === 'AbortError' ? 'jaringan' : (e.kode || 'jaringan');
        statusApi = { kode, pesan: e.message || '' };
        if (['belum_dikonfigurasi', 'kuota_habis', 'kunci_ditolak', 'tidak_ada_api', 'terlalu_sering'].includes(kode)) jedaApiSampai = Date.now() + JEDA_GAGAL_MS;
        if (c) dariApi = c.items;
      }
    }
    const r = rusak(); const lihat = new Set();
    return [...dariApi.map(x => ({ ...x, sumber: 'youtube' })), ...(CADANGAN[kategori] || CADANGAN.neutral).map(x => ({ ...x, sumber: 'cadangan' }))]
      .filter(x => x && x.id && !r[x.id] && !lihat.has(x.id) && lihat.add(x.id));
  })();
  sedangDicari.set(kunci, job);
  try { return await job; } finally { sedangDicari.delete(kunci); }
}
