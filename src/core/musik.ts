/**
 * Smart Adaptive Music — logika inti (tanpa DOM, tanpa jaringan).
 * - SUASANA: daftar kategori musik. Tambah kategori baru cukup di sini (+ kata kunci pencarian di api/_musik-inti.js).
 * - analisisAdegan / analisisTeks: Scene Mood Analyzer. Membaca konteks adegan (latar, judul, ringkas, narasi,
 *   opsi, tanda "musik" dari AI pembuat cerita) dan memberi skor per kategori, bukan sekadar mencari satu kata.
 * - PengaturMusik: Adaptive Music State. Memutuskan kapan musik boleh berganti (ambang keyakinan, jeda minimum,
 *   mode manual, kunci) supaya musik tidak berganti setiap kali teks diperbarui.
 */

export type Kategori = 'calm' | 'happy' | 'slow_fun' | 'war' | 'neutral' | 'sad' | 'suspense' | 'romantic' | 'horror' | 'epic';

export interface InfoSuasana {
  k: Kategori; nama: string; ket: string;
  /** false = belum dipakai deteksi otomatis/tombol manual; hasil deteksinya dialihkan ke `induk`. */
  aktif: boolean; induk?: Kategori;
}

export const SUASANA: Record<Kategori, InfoSuasana> = {
  calm: { k: 'calm', nama: 'Tenang', ket: 'Soft piano, ambient, cinematic damai', aktif: true },
  happy: { k: 'happy', nama: 'Senang', ket: 'Instrumental ceria, orkestra ringan', aktif: true },
  slow_fun: { k: 'slow_fun', nama: 'Santai', ket: 'Lo-fi, akustik santai, groove ringan', aktif: true },
  war: { k: 'war', nama: 'Perang', ket: 'Orkestra epik, genderang perang', aktif: true },
  neutral: { k: 'neutral', nama: 'Netral', ket: 'Latar lembut saat suasana belum jelas', aktif: true },
  // Kategori lanjutan: sudah punya kata kunci deteksi. Ubah `aktif: true` (dan isi kueri di server) untuk menyalakannya.
  sad: { k: 'sad', nama: 'Sedih', ket: 'Piano sedih, strings melankolis', aktif: false, induk: 'calm' },
  suspense: { k: 'suspense', nama: 'Tegang', ket: 'Ambient gelap, ketegangan', aktif: false, induk: 'neutral' },
  romantic: { k: 'romantic', nama: 'Romantis', ket: 'Piano & strings romantis', aktif: false, induk: 'calm' },
  horror: { k: 'horror', nama: 'Horor', ket: 'Drone horor, dissonan', aktif: false, induk: 'neutral' },
  epic: { k: 'epic', nama: 'Epik', ket: 'Orkestra megah tanpa perang', aktif: false, induk: 'war' },
};
/** Kategori yang bisa dipilih manual (urut tampil). */
export const KATEGORI_MANUAL: Kategori[] = ['calm', 'happy', 'slow_fun', 'war'];

/* ------------------------------------------------------------------ */
/* Kata kunci. Akhiran otomatis (prefix): "serang" cocok "serangan".   */
/* Awalan "=" = harus sama persis. Kata bertanda spasi = frasa.         */
/* ------------------------------------------------------------------ */
const LEKSIKON: Partial<Record<Kategori, string[]>> = {
  calm: ['tenang', 'ketenangan', 'menenangkan', 'damai', 'kedamaian', 'sunyi', 'hening', 'sejuk', 'lembut', 'teduh', 'istirahat', 'beristirahat', 'rehat',
    'merenung', 'renungan', 'kenangan', 'mengenang', '=haru', 'terharu', 'harapan', 'berharap', 'doa', 'berdoa', '=lega', 'pulih', 'memulihkan', 'sembuh',
    'menyembuhkan', 'merawat', 'perawatan', 'sepi', 'syahdu', 'nyaman', 'hangat', 'kehangatan', 'pelukan', 'memeluk', 'tidur', 'terlelap', 'mimpi', 'meditasi',
    'gemericik', 'sepoi', 'pemandangan', 'indah', 'keindahan', 'lirih', 'perlahan', 'pelan', 'menghela', 'napas panjang', 'api unggun', 'cahaya bulan',
    'bulan purnama', 'bintang', 'fajar', 'senja', 'taman', 'danau', 'padang rumput', 'embun', 'kabut tipis', 'syukur', 'bersyukur', '=aman', 'selamat dari',
    'peaceful', 'calm', 'serene', 'quiet', 'gentle', '=rest', '=hope', 'reflect'],
  happy: ['bahagia', 'kebahagiaan', 'gembira', 'kegembiraan', 'senang', 'sorak', 'bersorak', 'sorakan', 'merayakan', 'perayaan', 'rayakan', 'pesta', 'festival',
    'kemenangan', '=menang', 'memenangkan', 'berhasil', 'keberhasilan', 'sukses', 'juara', 'ceria', 'riang', 'sukacita', 'hadiah', 'penghargaan', 'bersulang',
    '=menari', 'tarian', 'meriah', 'kemeriahan', 'sambutan', 'disambut', 'menyambut', 'reuni', 'berkumpul kembali', 'bangga', 'kebanggaan', 'dinobatkan', 'penobatan',
    'harta karun', 'kebebasan', 'terbebas', 'tepuk tangan', 'senyum lebar', 'tertawa bahagia', 'air mata bahagia', 'syukuran', 'kembang api',
    'celebrate', 'celebration', 'victory', '=joy', 'triumph', 'cheer'],
  slow_fun: ['bercanda', 'canda', 'candaan', 'lelucon', 'lucu', 'kocak', 'konyol', 'tertawa', 'terkekeh', 'cekikikan', 'nyengir', 'menggoda', 'usil', 'iseng',
    'santai', 'bersantai', 'jalan jalan', 'perjalanan', 'berkelana', 'menyusuri', 'pasar', 'kedai', 'warung', 'penginapan', 'tavern', 'minum', 'makan',
    'memasak', 'mengobrol', 'obrolan', 'ngobrol', 'berbincang', 'perbincangan', 'akrab', 'keakraban', 'belanja', 'menawar', 'pedagang', 'keledai', 'kereta kuda',
    'piknik', 'memancing', 'mengantuk', 'malas', 'keseharian', 'sehari hari', 'gosip', 'ringan', 'main kartu', 'berceloteh', 'celoteh', 'olok',
    'mengomel', 'menggerutu', 'tersenyum geli', 'joke', 'funny', 'laugh', 'chill', 'stroll', 'banter'],
  war: ['perang', 'peperangan', 'berperang', 'pertempuran', 'bertempur', 'tempur', 'serang', 'menyerang', 'serangan', 'diserang', 'serbu', 'menyerbu', 'serbuan',
    'pasukan', 'tentara', 'prajurit', 'legiun', 'gerombolan', 'duel', 'bertarung', 'pertarungan', 'tarung', 'beradu', 'menebas', 'tebasan', 'darah', 'berdarah',
    'ledakan', 'meledak', 'mengejar', 'pengejaran', 'dikejar', 'kejar', 'anak panah', 'panah melesat', 'tombak', 'pengepungan', 'mengepung', 'dikepung', 'musuh',
    'monster', 'mengamuk', 'amukan', 'raungan', 'meraung', 'ancaman', 'bahaya', 'genting', 'darurat', 'terbakar', 'jeritan', 'menjerit', 'genderang',
    'terompet perang', 'membantai', 'pembantaian', 'zombie', 'zombi', 'mayat hidup', 'menembak', 'tembakan', 'peluru', 'granat', 'baku tembak', 'invasi',
    'pemberontakan', 'menggempur', 'gempuran', 'pedang terhunus', 'menghunus', 'cakar', 'taring', 'menerjang', 'terjangan', 'bentrok', 'bentrokan', 'pukulan',
    'menghantam', 'hantaman', 'tumbang', 'gugur', 'kabur', 'melarikan diri', '=bos', 'naga',
    'battle', '=war', 'fight', 'attack', 'siege', 'enemy', '=charge'],
  sad: ['sedih', 'kesedihan', 'duka', 'berduka', 'menangis', 'tangis', 'isak', 'kehilangan', 'pemakaman', 'makam', 'nisan', 'meninggal', 'wafat', 'perpisahan',
    'berpisah', 'pilu', 'hancur hati', 'patah hati', 'penyesalan', 'menyesal', 'kesepian'],
  suspense: ['tegang', 'ketegangan', 'mencekam', 'curiga', 'mencurigakan', 'mengintai', 'bisikan', 'berbisik', 'misteri', 'misterius', 'rahasia', 'petunjuk',
    'mengendap', 'menyelinap', 'jejak', 'bayangan', 'gelap', 'kegelapan', 'waspada'],
  romantic: ['cinta', 'mencintai', 'kekasih', 'rindu', 'merindukan', 'romantis', 'mesra', 'ciuman', 'mencium', 'berdansa', 'tatapan lembut', 'jatuh hati'],
  horror: ['horor', 'mengerikan', 'ngeri', 'hantu', 'arwah', 'kerasukan', 'kutukan', 'terkutuk', 'mayat', 'busuk', 'membusuk', 'teror', 'merinding', 'jasad'],
  epic: ['megah', 'agung', 'legenda', 'legendaris', 'takdir', 'ramalan', 'bersumpah', 'sumpah setia', 'mahkota', 'kerajaan', 'singgasana'],
};
const NEGASI = new Set(['tidak', 'tak', 'tanpa', 'bukan', 'belum', 'jangan', 'tiada', 'enggan', 'no', 'not', 'without']);
/** Kata yang menandai sesuatu sudah berakhir: "pertempuran berakhir" → justru suasana menenang. */
const AKHIR = new Set(['berakhir', 'usai', 'selesai', 'reda', 'mereda', 'berhenti', 'sirna', 'padam', 'lenyap', 'surut', 'menghilang', 'ended', 'over']);
const SETELAH = new Set(['setelah', 'seusai', 'usai', 'sesudah', 'pasca', 'selepas', 'sehabis', 'after']);

interface Pola { kata: string; frasa: boolean; persis: boolean }
const POLA: Partial<Record<Kategori, Pola[]>> = {};
(Object.keys(LEKSIKON) as Kategori[]).forEach(k => {
  POLA[k] = (LEKSIKON[k] || []).map(w => {
    const persis = w.startsWith('='); const kata = persis ? w.slice(1) : w;
    return { kata, frasa: kata.includes(' '), persis };
  });
});

export function normTeks(t: unknown): string {
  return String(t ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export type Skor = Partial<Record<Kategori, number>>;
export interface Temuan { skor: Skor; total: number; kata: string[] }

/** Hitung kecocokan per kategori di satu teks, dengan penanganan negasi dan "sudah berakhir". */
export function hitungTeks(teks: unknown): Temuan {
  const n = normTeks(teks); const skor: Skor = {}; const kata: string[] = [];
  if (!n) return { skor, total: 0, kata };
  const tok = n.split(' '); const gabung = ' ' + n + ' ';
  const tambah = (k: Kategori, v: number, w: string) => { skor[k] = (skor[k] || 0) + v; if (kata.length < 12 && !kata.includes(w)) kata.push(w); };
  (Object.keys(POLA) as Kategori[]).forEach(k => {
    for (const p of POLA[k] || []) {
      if (p.frasa) {
        let i = gabung.indexOf(' ' + p.kata + ' '); let c = 0;
        while (i >= 0 && c < 6) { tambah(k, 1.2, p.kata); c++; i = gabung.indexOf(' ' + p.kata + ' ', i + 1); }
        continue;
      }
      for (let i = 0; i < tok.length; i++) {
        const t = tok[i]; if (!(p.persis ? t === p.kata : t.startsWith(p.kata))) continue;
        // Kata pendek hanya cocok bila hampir persis, supaya "aman" tidak cocok "amanat".
        if (!p.persis && p.kata.length < 5 && t.length > p.kata.length + 3) continue;
        const neg = NEGASI.has(tok[i - 1]) || NEGASI.has(tok[i - 2]);
        if (neg) continue;
        if (k === 'war') {
          const selesai = tok.slice(i + 1, i + 4).some(x => AKHIR.has(x)) || SETELAH.has(tok[i - 1]) || SETELAH.has(tok[i - 2]);
          if (selesai) { tambah('calm', 1, p.kata + ' (usai)'); continue; }
        }
        tambah(k, 1, p.kata);
      }
    }
  });
  const total = Object.values(skor).reduce((a, b) => a + (b || 0), 0);
  return { skor, total, kata };
}

export interface HasilSuasana {
  kategori: Kategori; yakin: number; sumber: 'ai' | 'analisis' | 'netral' | 'manual';
  skor: Skor; kata: string[]; asli?: Kategori;
}

const ALIAS: Record<string, Kategori> = {
  calm: 'calm', tenang: 'calm', damai: 'calm', peaceful: 'calm', reflektif: 'calm', haru: 'calm',
  happy: 'happy', senang: 'happy', bahagia: 'happy', gembira: 'happy', ceria: 'happy', kemenangan: 'happy', victory: 'happy',
  slow_fun: 'slow_fun', slowfun: 'slow_fun', santai: 'slow_fun', santai_lucu: 'slow_fun', lucu: 'slow_fun', fun: 'slow_fun', lofi: 'slow_fun',
  war: 'war', battle: 'war', perang: 'war', pertempuran: 'war', peperangan: 'war', aksi: 'war', action: 'war', duel: 'war',
  neutral: 'neutral', netral: 'neutral',
  sad: 'sad', sedih: 'sad', duka: 'sad', suspense: 'suspense', tegang: 'suspense', misteri: 'suspense', romantic: 'romantic', romantis: 'romantic',
  horror: 'horror', horor: 'horror', seram: 'horror', epic: 'epic', epik: 'epic', megah: 'epic',
};
/** Ubah tulisan bebas ("Slow Fun", "perang", "battle") menjadi kategori baku. */
export function kategoriDari(v: unknown): Kategori | null {
  const s = normTeks(v).replace(/ /g, '_'); if (!s) return null;
  if (ALIAS[s]) return ALIAS[s];
  const k = Object.keys(ALIAS).find(a => s.includes(a)); return k ? ALIAS[k] : null;
}
/** Kategori yang belum aktif dialihkan ke induknya (mis. sad → calm). */
export function kategoriAktif(k: Kategori): Kategori {
  let x = k; for (let i = 0; i < 3 && !SUASANA[x].aktif; i++) x = SUASANA[x].induk || 'neutral'; return x;
}

/** Bidang teks + bobotnya. Latar.suasana dan ringkas paling jujur menggambarkan "momen" adegan. */
export interface Bidang { teks: unknown; bobot: number }
const NETRAL_DASAR = 0.9; // skor semu "belum jelas"; menahan bukti yang tipis

export function gabungSkor(bidang: Bidang[], ekstra: Skor = {}): HasilSuasana {
  const skor: Skor = {}; let bukti = 0; const kata: string[] = [];
  for (const b of bidang) {
    const f = hitungTeks(b.teks); if (!f.total) continue;
    const pembagi = Math.max(f.total, 2); // satu kata saja tidak boleh langsung dianggap pasti
    (Object.keys(f.skor) as Kategori[]).forEach(k => { skor[k] = (skor[k] || 0) + b.bobot * (f.skor[k] || 0) / pembagi; });
    bukti += b.bobot * Math.min(1, f.total / 2); f.kata.forEach(w => { if (kata.length < 10 && !kata.includes(w)) kata.push(w); });
  }
  (Object.keys(ekstra) as Kategori[]).forEach(k => { skor[k] = (skor[k] || 0) + (ekstra[k] || 0); bukti += Math.abs(ekstra[k] || 0); });
  // Alihkan kategori nonaktif ke induknya sebelum memilih pemenang.
  const efektif: Skor = {};
  (Object.keys(skor) as Kategori[]).forEach(k => { const a = kategoriAktif(k); efektif[a] = (efektif[a] || 0) + (skor[k] || 0); });
  const urut = (Object.keys(efektif) as Kategori[]).filter(k => k !== 'neutral').sort((a, b) => (efektif[b] || 0) - (efektif[a] || 0));
  const jumlah = urut.reduce((a, k) => a + (efektif[k] || 0), 0) + NETRAL_DASAR + (efektif.neutral || 0);
  const top = urut[0];
  if (!top || bukti < 0.8) return { kategori: 'neutral', yakin: 0, sumber: 'netral', skor: efektif, kata };
  const yakin = (efektif[top] || 0) / jumlah;
  const kedua = urut[1] ? (efektif[urut[1]] || 0) / jumlah : 0;
  if (yakin < 0.3 || yakin - kedua < 0.08) return { kategori: 'neutral', yakin: round(1 - yakin), sumber: 'netral', skor: efektif, kata };
  return { kategori: top, yakin: round(yakin), sumber: 'analisis', skor: efektif, kata };
}
const round = (v: number) => Math.round(v * 100) / 100;

/** Bentuk adegan seperti di JSON cerita Meja Pencerita (hanya bidang yang dibaca). */
export interface AdeganMusik {
  judul?: string; ringkas?: string; narasi?: string;
  latar?: { tempat?: string; waktu?: string; cuaca?: string; suasana?: string } | null;
  opsi?: { jenis?: string; aksi?: string }[];
  hasil_wajib?: { tipe?: string } | null;
  /** Opsional dari AI pembuat cerita: { "suasana": "war" } atau "war". */
  musik?: { suasana?: string } | string | null;
}

/** Scene Mood Analyzer untuk satu adegan aktif. */
export function analisisAdegan(a: AdeganMusik | null | undefined): HasilSuasana {
  if (!a) return { kategori: 'neutral', yakin: 0, sumber: 'netral', skor: {}, kata: [] };
  const tanda = kategoriDari(typeof a.musik === 'string' ? a.musik : a.musik && a.musik.suasana);
  if (tanda) {
    const k = kategoriAktif(tanda);
    return { kategori: k, yakin: k === 'neutral' ? 0.5 : 0.9, sumber: 'ai', skor: { [k]: 1 }, kata: [], asli: tanda };
  }
  const paras = String(a.narasi || '').split(/\n\s*\n/).filter(p => p.trim());
  const akhir = paras.length > 1 ? paras[paras.length - 1] : '';
  const ekstra: Skor = {};
  const jenis = (a.opsi || []).map(o => String(o.jenis || ''));
  if (jenis.includes('bos')) ekstra.war = (ekstra.war || 0) + 1.6;
  if (jenis.includes('duel')) ekstra.war = (ekstra.war || 0) + 1.1;
  if (a.hasil_wajib && /kalah/.test(String(a.hasil_wajib.tipe || ''))) ekstra.war = (ekstra.war || 0) + 0.4;
  return gabungSkor([
    { teks: a.latar && a.latar.suasana, bobot: 2.2 },
    { teks: a.judul, bobot: 1.4 },
    { teks: a.ringkas, bobot: 1.8 },
    { teks: a.narasi, bobot: 1.6 },
    { teks: akhir, bobot: 0.8 }, // paragraf terakhir = momen menjelang pilihan pemain
    { teks: (a.opsi || []).map(o => o.aksi || '').join('. '), bobot: 0.7 },
  ], ekstra);
}

/** Hasil lemparan yang diterapkan GM (mis. bos dikalahkan) bisa menggeser suasana. */
export function analisisHasil(h: { cls?: string; teks?: string; judul?: string; jenis?: string }, aktif: Kategori | null): HasilSuasana {
  const menang = /^(win|thin)$/.test(String(h.cls || '')); const besar = h.jenis === 'bos' || h.jenis === 'duel';
  const ekstra: Skor = {};
  if (besar && menang && aktif === 'war') ekstra.happy = 1.4; // kemenangan atas bos/duel = musik kemenangan
  if (besar && !menang) ekstra.war = 0.8;
  const r = gabungSkor([{ teks: h.teks, bobot: 1.6 }, { teks: h.judul, bobot: 0.6 }], ekstra);
  // Hasil biasa (bukan bos/duel) hanya boleh mengubah suasana bila buktinya kuat.
  if (!besar) r.yakin = round(r.yakin * 0.75);
  return r;
}

/** Ending: epilog menentukan; tanpa epilog dianggap tenang (penutup). */
export function analisisEnding(e: { judul?: string; epilog?: string }): HasilSuasana {
  const r = gabungSkor([{ teks: e.epilog, bobot: 2 }, { teks: e.judul, bobot: 1 }], { calm: 0.5 });
  if (r.kategori === 'neutral') return { ...r, kategori: 'calm', yakin: 0.6, sumber: 'analisis' };
  return r;
}

/* ------------------------------------------------------------------ */
/* Adaptive Music State                                                */
/* ------------------------------------------------------------------ */
export interface OpsiPengatur {
  /** Keyakinan minimum agar musik boleh berganti. */
  ambang: number;
  /** Jeda minimum antar pergantian otomatis (ms). */
  jedaMin: number;
  /** Untuk perubahan yang sangat jelas (mis. tiba-tiba perang): jeda lebih pendek. */
  jedaDarurat: number; ambangDarurat: number;
}
export const OPSI_BAWAAN: OpsiPengatur = { ambang: 0.5, jedaMin: 40000, jedaDarurat: 12000, ambangDarurat: 0.8 };

export type Aksi = 'ganti' | 'tahan' | 'tunda';
export interface Keputusan { aksi: Aksi; kategori: Kategori | null; alasan: string; sisa?: number }

export class PengaturMusik {
  mode: 'auto' | 'manual' = 'auto';
  kunci = false;
  aktif: Kategori | null = null;
  terakhirGanti = -Infinity;
  saran: HasilSuasana | null = null;
  tertunda: HasilSuasana | null = null;
  opsi: OpsiPengatur;
  constructor(opsi: Partial<OpsiPengatur> = {}) { this.opsi = { ...OPSI_BAWAAN, ...opsi }; }

  private ganti(k: Kategori, now: number, alasan: string): Keputusan {
    this.aktif = k; this.terakhirGanti = now; this.tertunda = null; return { aksi: 'ganti', kategori: k, alasan };
  }
  private tahan(alasan: string): Keputusan { return { aksi: 'tahan', kategori: this.aktif, alasan }; }

  /** Terima hasil analisis baru. Mengembalikan keputusan; pemanggil yang menjalankan pergantian lagu. */
  usul(h: HasilSuasana, now: number): Keputusan {
    this.saran = h;
    if (this.mode === 'manual') return this.tahan('mode manual');
    if (this.kunci) return this.tahan('musik dikunci');
    if (h.kategori === 'neutral' || h.yakin <= 0) {
      if (!this.aktif) return this.ganti('neutral', now, 'awal: suasana belum jelas');
      this.tertunda = null; return this.tahan('suasana belum jelas, musik dipertahankan');
    }
    if (h.kategori === this.aktif) { this.tertunda = null; return this.tahan('suasana sama'); }
    if (h.yakin < this.opsi.ambang) return this.tahan(`kurang yakin (${Math.round(h.yakin * 100)}%)`);
    if (!this.aktif || this.aktif === 'neutral' && now - this.terakhirGanti >= this.opsi.jedaDarurat) return this.ganti(h.kategori, now, 'suasana baru');
    const jarak = now - this.terakhirGanti;
    if (jarak >= this.opsi.jedaMin) return this.ganti(h.kategori, now, 'suasana berubah');
    if (h.yakin >= this.opsi.ambangDarurat && jarak >= this.opsi.jedaDarurat) return this.ganti(h.kategori, now, 'perubahan suasana sangat jelas');
    this.tertunda = h;
    const batas = h.yakin >= this.opsi.ambangDarurat ? this.opsi.jedaDarurat : this.opsi.jedaMin;
    return { aksi: 'tunda', kategori: this.aktif, alasan: 'menunggu jeda minimum', sisa: Math.max(0, batas - jarak) };
  }
  /** Dipanggil saat jeda selesai: jalankan usulan yang tertunda bila masih berlaku. */
  cekTertunda(now: number): Keputusan | null {
    const t = this.tertunda; if (!t || t !== this.saran) return null;
    return this.usul(t, now);
  }
  /** Pengguna memilih kategori sendiri → mode manual. */
  pilihManual(k: Kategori, now: number): Keputusan { this.mode = 'manual'; return this.ganti(k, now, 'dipilih pengguna'); }
  /** Auto ON: langsung terapkan saran terakhir (tanpa menunggu jeda). Auto OFF: manual, musik tetap. */
  setAuto(on: boolean, now: number): Keputusan {
    this.mode = on ? 'auto' : 'manual'; this.tertunda = null;
    if (!on || !this.saran || this.kunci) return this.tahan(on ? 'auto aktif' : 'mode manual');
    const s = this.saran; if (s.kategori === 'neutral' || s.kategori === this.aktif || s.yakin < this.opsi.ambang) return this.tahan('auto aktif');
    return this.ganti(s.kategori, now, 'auto aktif: ikuti adegan');
  }
  setKunci(b: boolean) { this.kunci = b; if (b) this.tertunda = null; }
}
