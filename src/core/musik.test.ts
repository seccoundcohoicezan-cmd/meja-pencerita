import { describe, it, expect } from 'vitest';
import { analisisAdegan, analisisHasil, analisisEnding, hitungTeks, kategoriDari, kategoriAktif, PengaturMusik, SUASANA, KATEGORI_MANUAL, type HasilSuasana } from './musik';

const TAMAN = {
  judul: 'Sore di Taman Istana',
  ringkas: 'Para pahlawan beristirahat dan berbincang pelan dengan Putri Mirela di taman.',
  latar: { tempat: 'Taman istana Valmora', waktu: 'sore', cuaca: 'cerah berangin sepoi', suasana: 'damai, hangat, bau melati' },
  narasi: 'Angin sepoi membawa harum melati. Air mancur gemericik pelan di tengah taman.\n\nPutri Mirela tersenyum lembut. "Duduklah. Kalian pantas beristirahat setelah perjalanan panjang." Kaelen menghela napas panjang, merasa lega untuk pertama kalinya sejak meninggalkan desa.',
  opsi: [{ jenis: 'tanpa_dadu', aksi: 'Bercerita tentang kampung halaman' }, { jenis: 'skill_cek', aksi: 'Membaca raut wajah sang putri' }],
};
const PESTA = {
  judul: 'Pesta Kemenangan',
  ringkas: 'Kota merayakan kemenangan para pahlawan dengan festival semalam suntuk.',
  latar: { tempat: 'Alun-alun Valmora', waktu: 'malam', cuaca: 'cerah', suasana: 'meriah, gembira, kembang api' },
  narasi: 'Sorak-sorai warga memenuhi alun-alun. Kembang api pecah di langit, anak-anak menari di sekitar api unggun.\n\nRaja mengangkat piala. "Untuk para pahlawan kita!" Semua bersulang dengan bahagia.',
  opsi: [{ jenis: 'tanpa_dadu', aksi: 'Bergabung menari bersama warga' }],
};
const JALAN = {
  judul: 'Kereta Kuda yang Cerewet',
  ringkas: 'Dalam perjalanan ke pasar, Bram dan Liora saling bercanda soal keledai yang keras kepala.',
  latar: { tempat: 'Jalan desa menuju pasar', waktu: 'pagi', cuaca: 'cerah', suasana: 'santai, lucu, akrab' },
  narasi: 'Keledai Bram berhenti untuk ketiga kalinya. Liora terkekeh. "Mungkin dia lebih pintar darimu."\n\nBram menggerutu sambil nyengir, lalu menawar sebutir apel pada pedagang yang lewat agar si keledai mau jalan lagi. Obrolan ringan berlanjut sepanjang jalan.',
  opsi: [{ jenis: 'skill_cek', aksi: 'Membujuk keledai dengan apel' }, { jenis: 'tanpa_dadu', aksi: 'Mengobrol dengan pedagang' }],
};
const PERANG = {
  judul: 'Gerbang Utara Diserbu',
  ringkas: 'Pasukan Raja Bayangan menyerbu gerbang utara; para pahlawan harus menahan serangan.',
  latar: { tempat: 'Tembok gerbang utara', waktu: 'tengah malam', cuaca: 'hujan deras', suasana: 'kacau, genting, bau darah dan asap' },
  narasi: 'Genderang perang bergemuruh. Ribuan prajurit musuh menyerbu dengan tangga dan tombak, anak panah melesat dari segala arah.\n\nSebuah ledakan meruntuhkan menara jaga. "Tahan gerbang!" teriak komandan, pedang terhunus, sementara monster raksasa mengamuk di barisan depan.',
  opsi: [{ jenis: 'kelompok', aksi: 'Menahan gerbang bersama-sama' }, { jenis: 'bos', aksi: 'Menyerang sang Jenderal Bayangan' }],
};
const USAI = {
  judul: 'Fajar Setelah Badai',
  ringkas: 'Pertempuran berakhir; para pahlawan merawat yang terluka dan menenangkan diri.',
  latar: { tempat: 'Reruntuhan gerbang utara', waktu: 'fajar', cuaca: 'gerimis reda', suasana: 'sunyi, lelah, lega' },
  narasi: 'Setelah pertempuran, hanya terdengar gemericik hujan yang mereda. Fajar menyingsing perlahan di balik bukit.\n\nLiora merawat luka Kaelen dengan lembut. Tidak ada lagi serangan. Mereka duduk diam, menghela napas, dan berdoa untuk yang gugur.',
  opsi: [{ jenis: 'tanpa_dadu', aksi: 'Berdoa bersama' }, { jenis: 'skill_cek', aksi: 'Merawat prajurit yang terluka (Medicine)' }],
};

describe('musik: deteksi suasana adegan', () => {
  it('1. adegan tenang di taman → Calm', () => { const r = analisisAdegan(TAMAN); expect(r.kategori).toBe('calm'); expect(r.yakin).toBeGreaterThanOrEqual(0.5); });
  it('2. adegan perayaan → Happy', () => { const r = analisisAdegan(PESTA); expect(r.kategori).toBe('happy'); expect(r.yakin).toBeGreaterThanOrEqual(0.5); });
  it('3. adegan santai & lucu dalam perjalanan → Slow Fun', () => { const r = analisisAdegan(JALAN); expect(r.kategori).toBe('slow_fun'); expect(r.yakin).toBeGreaterThanOrEqual(0.5); });
  it('4. pertempuran → War', () => { const r = analisisAdegan(PERANG); expect(r.kategori).toBe('war'); expect(r.yakin).toBeGreaterThanOrEqual(0.6); });
  it('5. pertempuran berakhir & menenangkan diri → Calm (bukan War)', () => { const r = analisisAdegan(USAI); expect(r.kategori).toBe('calm'); });
  it('konteks keseluruhan menang atas satu kata: kata "musuh" di adegan damai tidak memicu War', () => {
    const r = analisisAdegan({ ...TAMAN, narasi: TAMAN.narasi + '\n\nPutri bercerita bahwa musuh lama kerajaan kini sudah berdamai.' });
    expect(r.kategori).toBe('calm');
  });
  it('negasi: "tanpa perlawanan", "tidak ada serangan" tidak dihitung sebagai perang', () => {
    expect(hitungTeks('Mereka masuk tanpa perlawanan dan tidak ada serangan.').skor.war || 0).toBe(0);
  });
  it('kata yang mirip tidak salah cocok (menangis ≠ menang, harus ≠ haru, warga ≠ war)', () => {
    const f = hitungTeks('Warga harus menangis');
    expect(f.skor.happy || 0).toBe(0); expect(f.skor.war || 0).toBe(0); expect(f.skor.calm || 0).toBe(0);
  });
  it('teks kosong / tidak jelas → Netral', () => {
    expect(analisisAdegan({ judul: 'Adegan 3', narasi: 'Mereka tiba di depan sebuah pintu.' }).kategori).toBe('neutral');
    expect(analisisAdegan(null).kategori).toBe('neutral');
  });
  it('tanda "musik" dari AI pembuat cerita dipakai lebih dulu', () => {
    const r = analisisAdegan({ ...TAMAN, musik: { suasana: 'battle' } }); expect(r.kategori).toBe('war'); expect(r.sumber).toBe('ai');
    expect(analisisAdegan({ ...PERANG, musik: 'Slow Fun' }).kategori).toBe('slow_fun');
  });
  it('kategori lanjutan yang belum aktif dialihkan ke induknya', () => {
    expect(kategoriAktif('sad')).toBe('calm'); expect(kategoriAktif('epic')).toBe('war');
    expect(analisisAdegan({ ...TAMAN, musik: 'sedih' }).kategori).toBe('calm');
    expect(kategoriDari('Peperangan')).toBe('war'); expect(kategoriDari('???')).toBeNull();
  });
  it('kemenangan atas bos saat musik perang → Happy; hasil kecil tidak mengguncang', () => {
    const menang = analisisHasil({ cls: 'win', jenis: 'bos', teks: 'Sang Jenderal tumbang. Pasukan musuh mundur dan warga bersorak merayakan kemenangan.' }, 'war');
    expect(menang.kategori).toBe('happy');
    const kecil = analisisHasil({ cls: 'win', jenis: 'solo', teks: 'Kaelen berhasil.' }, 'war');
    expect(kecil.yakin).toBeLessThan(0.5);
  });
  it('ending tanpa epilog → Calm', () => { expect(analisisEnding({ judul: 'Ending Cahaya' }).kategori).toBe('calm'); });
  it('registri: kategori manual ada & aktif', () => { KATEGORI_MANUAL.forEach(k => expect(SUASANA[k].aktif).toBe(true)); });
});

const h = (kategori: HasilSuasana['kategori'], yakin = 0.7): HasilSuasana => ({ kategori, yakin, sumber: 'analisis', skor: {}, kata: [] });

describe('musik: pengatur pergantian (Adaptive Music State)', () => {
  it('awal langsung memutar sesuai adegan', () => {
    const p = new PengaturMusik(); expect(p.usul(h('calm'), 0)).toMatchObject({ aksi: 'ganti', kategori: 'calm' });
  });
  it('5. perang → tenang berganti setelah jeda minimum', () => {
    const p = new PengaturMusik({ jedaMin: 40000 }); p.usul(h('war', 0.8), 0);
    expect(p.usul(h('calm', 0.7), 10000).aksi).toBe('tunda');
    expect(p.cekTertunda(40000)).toMatchObject({ aksi: 'ganti', kategori: 'calm' });
  });
  it('11. tidak berganti berulang: 10 adegan bolak-balik dalam 30 detik = paling banyak 1 pergantian', () => {
    const p = new PengaturMusik(); let ganti = 0; p.usul(h('calm'), 0);
    for (let i = 1; i <= 10; i++) if (p.usul(h(i % 2 ? 'happy' : 'slow_fun'), i * 3000).aksi === 'ganti') ganti++;
    expect(ganti).toBeLessThanOrEqual(1);
  });
  it('perubahan sangat jelas (mis. serangan mendadak) memakai jeda darurat yang lebih pendek', () => {
    const p = new PengaturMusik(); p.usul(h('calm'), 0);
    expect(p.usul(h('war', 0.9), 5000).aksi).toBe('tunda');
    expect(p.usul(h('war', 0.9), 13000)).toMatchObject({ aksi: 'ganti', kategori: 'war' });
  });
  it('keyakinan di bawah ambang tidak mengganti musik; netral mempertahankan musik', () => {
    const p = new PengaturMusik(); p.usul(h('war', 0.9), 0);
    expect(p.usul(h('calm', 0.4), 100000).aksi).toBe('tahan');
    expect(p.usul(h('neutral', 0), 200000)).toMatchObject({ aksi: 'tahan', kategori: 'war' });
  });
  it('6. Auto Mode bisa dimatikan & dinyalakan; menyalakan kembali mengikuti saran terakhir', () => {
    const p = new PengaturMusik(); p.usul(h('calm'), 0);
    p.setAuto(false, 1000); expect(p.mode).toBe('manual');
    expect(p.usul(h('war', 0.9), 100000).aksi).toBe('tahan');
    expect(p.setAuto(true, 101000)).toMatchObject({ aksi: 'ganti', kategori: 'war' });
  });
  it('7. Manual Mode tidak ditimpa deteksi otomatis', () => {
    const p = new PengaturMusik(); p.usul(h('war'), 0);
    expect(p.pilihManual('slow_fun', 1000)).toMatchObject({ aksi: 'ganti', kategori: 'slow_fun' });
    for (let t = 50000; t < 500000; t += 50000) expect(p.usul(h('war', 0.95), t).aksi).toBe('tahan');
    expect(p.aktif).toBe('slow_fun'); expect(p.saran && p.saran.kategori).toBe('war');
  });
  it('kunci musik: deteksi tetap dicatat sebagai saran, musik tidak berganti', () => {
    const p = new PengaturMusik(); p.usul(h('calm'), 0); p.setKunci(true);
    expect(p.usul(h('war', 0.95), 100000).aksi).toBe('tahan'); expect(p.aktif).toBe('calm');
    p.setKunci(false); expect(p.usul(h('war', 0.95), 200000).aksi).toBe('ganti');
  });
  it('usulan tertunda dibatalkan bila adegan berikutnya kembali ke suasana semula', () => {
    const p = new PengaturMusik(); p.usul(h('calm'), 0);
    p.usul(h('happy'), 5000); p.usul(h('calm'), 8000);
    expect(p.cekTertunda(45000)).toBeNull(); expect(p.aktif).toBe('calm');
  });
});
