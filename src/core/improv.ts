/** Alat improvisasi GM: NPC, nama, barang, kejadian cepat, dan detail lokasi per genre. */

interface Tabel { depan: string[]; belakang: string[]; peran: string[]; barang: string[]; kejadian: string[]; lokasi: string[] }

const MOTIF = ['ingin melunasi utang lama', 'melindungi keluarganya', 'membalas dendam diam-diam', 'mencari orang yang hilang', 'takut kehilangan kedudukan',
  'ingin diakui kelompoknya', 'menyembunyikan kesalahan masa lalu', 'mengejar harta', 'setia pada tuannya sampai buta', 'ingin kabur dari kota ini',
  'mencari kebenaran tentang kematian saudaranya', 'dipaksa bekerja untuk musuh'];
const SIKAP = ['ramah tapi banyak bertanya', 'curiga pada orang asing', 'gugup dan cepat berkeringat', 'sombong dan meremehkan', 'lelah dan ingin cepat selesai',
  'terlalu bersemangat membantu', 'dingin dan berhitung', 'suka bercanda di saat tegang', 'sedih dan jarang menatap mata', 'licik, selalu minta imbalan'];
const RAHASIA = ['tahu jalan pintas yang tidak ada di peta', 'pernah bekerja untuk musuh utama', 'menyimpan barang curian', 'sebenarnya terluka parah',
  'punya kerabat di pihak lawan', 'melihat kejadian penting tadi malam', 'berutang nyawa pada salah satu pahlawan tanpa disadari', 'tidak bisa membaca',
  'memalsukan identitasnya', 'akan berkhianat bila ditawari lebih banyak'];

const T: Record<string, Tabel> = {
  fantasy: {
    depan: ['Aldric', 'Mirela', 'Theon', 'Sabine', 'Corwin', 'Elowen', 'Garrick', 'Isolde', 'Bram', 'Liora', 'Fenwick', 'Rowena', 'Osric', 'Nimue'],
    belakang: ['dari Valmora', 'Ashvale', 'si Tangan Besi', 'Thornfield', 'Putra Serigala', 'Blackmere', 'dari Lembah Kabut', 'Silverbrook', 'si Penjaga Menara', 'Dunmore'],
    peran: ['pandai besi desa', 'pendeta muda', 'penjaga gerbang', 'pedagang keliling', 'pemilik kedai', 'penyihir pertapa', 'ksatria tanpa tuan', 'pencuri pasar', 'tabib hutan', 'utusan bangsawan'],
    barang: ['ramuan penyembuh berwarna perak', 'belati berukir rune', 'peta kuno yang robek separuh', 'cincin segel bangsawan', 'lentera yang tak pernah padam',
      'kantong koin emas lama', 'gulungan mantra pelindung', 'jubah elf yang meredam langkah', 'taring naga kecil', 'kunci besi berkarat tanpa pintu', 'botol air suci', 'lambang ordo yang telah bubar'],
    kejadian: ['burung gagak menjatuhkan surat bersegel', 'lonceng gereja berbunyi di luar jam', 'seorang anak menarik jubah pahlawan dan berbisik', 'kabut turun sangat tebal dalam sekejap',
      'patroli kerajaan menghentikan kelompok', 'kuda salah satu pahlawan tiba-tiba panik', 'terdengar nyanyian dari arah hutan', 'seorang pengemis menyebut nama asli pahlawan',
      'obor-obor padam bersamaan', 'pedagang menawarkan barang yang terlalu murah', 'tanah bergetar pelan', 'bulan tertutup awan merah'],
    lokasi: ['dinding batu berlumut dengan ukiran naga', 'bau roti dan asap kayu dari dapur', 'lantai kayu yang berderit di setiap langkah', 'jendela kaca patri pecah sebagian',
      'patung ksatria tanpa kepala', 'sungai kecil berair sangat dingin', 'rak penuh botol berlabel huruf kuno', 'jembatan tali yang bergoyang', 'altar dengan lilin yang masih hangat', 'panji robek berlambang serigala'],
  },
  archive: {
    depan: ['Edmund', 'Clara', 'Julian', 'Margot', 'Vincent', 'Hélène', 'Ambrose', 'Rosalind', 'Tobias', 'Ines', 'Lucien', 'Beatrix'],
    belakang: ['Hartley', 'Vauclair', 'Whitmore', 'Castellan', 'Ravenscroft', 'Ashdown', 'Moreau', 'Kessler', 'Penrose', 'Albrecht'],
    peran: ['pustakawan senior', 'biarawan penjaga arsip', 'kurator museum', 'mahasiswa sejarah', 'kolektor naskah', 'penjual buku antik', 'penerjemah bahasa mati', 'penjaga malam', 'restorator lukisan', 'anggota ordo rahasia'],
    barang: ['surat bersegel lilin hitam', 'kunci perpustakaan lantai bawah', 'buku harian bertinta pudar', 'lensa pembesar kuningan', 'peta kota abad lalu', 'lembar sandi Vigenère',
      'foto lama dengan wajah dicoret', 'cincin bertanda simbol ordo', 'katalog arsip yang hilang halamannya', 'tiket kereta tahun 1920-an', 'pisau pembuka surat perak', 'kartu anggota perpustakaan palsu'],
    kejadian: ['lampu ruang baca padam sejenak', 'seseorang meninggalkan buku di meja pahlawan', 'penjaga mengunci pintu lebih awal', 'terdengar langkah dari lorong yang ditutup',
      'halaman buku ternyata disayat pisau', 'telepon tua berdering sekali', 'seorang pembaca menatap terlalu lama', 'rak buku bergeser memperlihatkan celah',
      'surat tanpa pengirim tiba di loket', 'alarm kebakaran berbunyi palsu', 'tinta pada dokumen berubah warna', 'seseorang memotret pahlawan dari kejauhan'],
    lokasi: ['rak kayu ek setinggi langit-langit', 'bau kertas tua dan debu', 'tangga spiral besi yang sempit', 'meja baca dengan lampu hijau', 'lemari kaca berisi naskah terikat rantai',
      'mural langit berbintang di kubah', 'ruang bawah tanah yang lembap', 'jam dinding yang berhenti di 3.17', 'lorong dengan lukisan para kepala biara', 'lemari arsip berlabel angka Romawi'],
  },
  apocalyptic: {
    depan: ['Rook', 'Dessa', 'Kade', 'Mara', 'Jax', 'Nell', 'Bishop', 'Tova', 'Sarge', 'Wren', 'Cutter', 'Ivy'],
    belakang: ['Rust', 'si Gurun', 'dari Kamp Utara', 'Ashborn', 'si Mata Satu', 'Dustwalker', 'dari Menara Air', 'Scrap', 'si Tukang Tawar', 'Coldwater'],
    peran: ['pemulung besi tua', 'penjaga sumur', 'dokter kamp tanpa izin', 'pedagang bensin', 'pemimpin karavan', 'mekanik kendaraan', 'mantan tentara', 'pemburu kadal gurun', 'pengintai perampok', 'penjaga radio tua'],
    barang: ['jeriken air bersih setengah penuh', 'masker gas dengan filter baru', 'aki mobil masih berfungsi', 'kaleng makanan tanpa label', 'kompas militer', 'amunisi rakitan',
      'peta jalur bebas radiasi', 'alat pengukur radiasi', 'kotak obat tentara', 'kunci gudang bunker', 'radio genggam bertenaga engkol', 'benih tanaman dalam kantong plastik'],
    kejadian: ['badai debu terlihat di cakrawala', 'suara mesin kendaraan mendekat', 'penghitung radiasi berbunyi makin cepat', 'seorang anak kurus meminta air',
      'sinyal radio samar memutar lagu lama', 'bangunan di dekat kelompok runtuh sebagian', 'jejak ban segar di pasir', 'bau bensin terbakar tercium',
      'anjing liar mengikuti dari jauh', 'bendera putih berkibar di atap', 'suar merah menyala di langit', 'air dalam jeriken ternyata bocor'],
    lokasi: ['papan iklan raksasa yang pudar', 'bangkai bus berkarat berisi pasir', 'pompa bensin tanpa atap', 'tembok beton bertuliskan peringatan', 'jalan tol retak ditumbuhi semak',
      'menara air miring', 'pusat perbelanjaan gelap dan berdebu', 'kamp tenda dari terpal biru', 'kawah bekas ledakan', 'rel kereta tertimbun pasir'],
  },
  zombies: {
    depan: ['Marcus', 'Lina', 'Dewi', 'Rian', 'Sophie', 'Budi', 'Hana', 'Danny', 'Maya', 'Tono', 'Karen', 'Yusuf'],
    belakang: ['Santoso', 'Wijaya', 'Hendrawan', 'Miller', 'Kusuma', 'Harahap', 'Park', 'Nugroho', 'Lestari', 'Brooks'],
    peran: ['perawat rumah sakit', 'satpam mal', 'guru SD', 'sopir angkot', 'pemilik toko kelontong', 'polisi lalu lintas', 'mahasiswa kedokteran', 'tukang kunci', 'ibu dengan dua anak', 'mantan napi'],
    barang: ['tas P3K lengkap', 'kunci mobil yang masih ada bensinnya', 'senter dengan baterai cadangan', 'linggis', 'walkie-talkie sepasang', 'dua botol air mineral',
      'peta evakuasi pemerintah', 'obat antibiotik', 'kapak pemadam kebakaran', 'kaleng kornet', 'kartu akses rumah sakit', 'radio darurat'],
    kejadian: ['alarm mobil tiba-tiba berbunyi', 'terdengar tangisan bayi di gedung sebelah', 'lampu jalan menyala sendiri', 'sekelompok zombie lewat tanpa menyadari',
      'helikopter terbang rendah lalu menjauh', 'pintu yang tadi terkunci kini terbuka', 'seseorang di atap memberi isyarat', 'tercium bau busuk sangat kuat',
      'radio menyiarkan titik evakuasi baru', 'salah satu rekan mengeluh demam', 'hujan deras menutup semua suara', 'anjing menggonggong lalu diam mendadak'],
    lokasi: ['lorong rumah sakit berlampu kedip', 'minimarket dengan kaca pecah', 'parkiran basement yang gelap', 'barikade kursi di depan pintu', 'jembatan penuh mobil ditinggalkan',
      'sekolah dengan papan tulis bertuliskan SOS', 'rumah dengan jendela dipaku papan', 'stasiun kereta sepi', 'atap gedung dengan tangki air', 'pos polisi ditinggalkan'],
  },
  cyberpunk: {
    depan: ['Vex', 'Kira', 'Juno', 'Razor', 'Mika', 'Nyx', 'Dex', 'Sable', 'Kenji', 'Lux', 'Rogue', 'Tanaka'],
    belakang: ['Zero', 'Chrome', 'Arasaka-7', 'Voss', 'Blackwire', 'Neon', 'Halcyon', 'Ghost', 'Mercer', 'Static'],
    peran: ['fixer kelas bawah', 'ripperdoc gang belakang', 'bartender klub neon', 'penjaga keamanan korporat', 'netrunner lepas', 'kurir motor', 'reporter bawah tanah', 'penjual implan bekas', 'polisi korup', 'anak geng jalanan'],
    barang: ['chip data terenkripsi', 'stimpak militer', 'kartu identitas korporat curian', 'pistol pintar tanpa nomor seri', 'deck netrunner murah', 'kredit anonim senilai 500 eddies',
      'implan mata bekas', 'drone pengintai seukuran telapak', 'kode akses lift gedung', 'granat EMP', 'jaket anti peluru bergaya', 'kunci motor listrik'],
    kejadian: ['hujan asam turun lebih deras', 'iklan hologram tiba-tiba menyebut nama pahlawan', 'drone polisi menyorot kelompok', 'listrik blok padam total',
      'implan salah satu pahlawan glitch sesaat', 'pesan anonim masuk ke semua perangkat', 'geng motor melintas pelan', 'pintu lift terbuka di lantai yang salah',
      'sirene korporat berbunyi dua blok dari sini', 'pedagang kaki lima menawarkan informasi', 'kamera jalan berputar mengikuti', 'kontak lama menelepon tiba-tiba'],
    lokasi: ['gang sempit bermandikan lampu neon ungu', 'klub dengan musik yang menggetarkan lantai', 'lobi korporat serba kaca', 'pasar implan di bawah jalan layang',
      'apartemen kapsul bertumpuk', 'kedai mi dengan uap mengepul', 'ruang server yang berdengung dingin', 'atap dengan papan iklan raksasa', 'terowongan maglev terbengkalai', 'klinik ripperdoc berlampu merah'],
  },
  mystery: {
    depan: ['Arthur', 'Evelyn', 'Harold', 'Violet', 'Percy', 'Agatha', 'Reginald', 'Cecily', 'Walter', 'Dorothy', 'Basil', 'Imogen'],
    belakang: ['Blackwood', 'Pemberton', 'Ashcombe', 'Fairfax', 'Grimsby', 'Holloway', 'Lockhart', 'Marlowe', 'Sinclair', 'Thorne'],
    peran: ['kepala pelayan', 'dokter keluarga', 'janda kaya', 'pewaris yang terlilit utang', 'tukang kebun', 'sekretaris pribadi', 'inspektur polisi', 'wartawan gosip', 'juru masak', 'tamu tak diundang'],
    barang: ['sapu tangan bernoda lipstik', 'tiket teater bertanggal kemarin', 'botol obat tidur hampir kosong', 'surat wasiat versi lama', 'kancing manset perak yang hilang pasangannya',
      'jam saku berhenti di 23.40', 'foto yang disobek separuh', 'kunci kamar tamu', 'abu rokok merek asing', 'buku catatan dengan halaman tersobek', 'sidik jari di gelas anggur', 'telegram tanpa nama pengirim'],
    kejadian: ['lampu seluruh rumah berkedip', 'seseorang menjerit dari lantai atas', 'hujan mengguyur, jalan keluar terputus', 'seorang tamu meminta bicara empat mata',
      'anjing penjaga menggonggong ke arah taman', 'jam besar berdentang tidak tepat waktu', 'sebuah pintu ditemukan terkunci dari dalam', 'pelayan menjatuhkan nampan saat pahlawan lewat',
      'bau almond pahit samar tercium', 'telepon rumah berdering lalu mati', 'jejak kaki berlumpur di karpet', 'seseorang ketahuan menguping'],
    lokasi: ['ruang perpustakaan dengan perapian menyala', 'koridor berkarpet merah tua', 'rumah kaca penuh anggrek', 'dapur dengan pintu belakang terbuka', 'kamar tidur dengan jendela terkunci',
      'ruang makan dengan kursi terbalik', 'loteng penuh koper lama', 'taman labirin berkabut', 'studio lukis berbau terpentin', 'ruang biliar berlampu redup'],
  },
};
T.custom = T.fantasy;

export type ImprovJenis = 'npc' | 'nama' | 'barang' | 'kejadian' | 'lokasi';
export const IMPROV_JENIS: [ImprovJenis, string][] = [['npc', 'NPC'], ['nama', 'Nama'], ['barang', 'Barang'], ['kejadian', 'Kejadian'], ['lokasi', 'Detail lokasi']];

const pick = <T,>(a: T[], rnd: () => number): T => a[Math.floor(rnd() * a.length)];

export interface ImprovHasil { jenis: ImprovJenis; judul: string; teks: string }
export function improv(genre: string, jenis: ImprovJenis, rnd: () => number = Math.random): ImprovHasil {
  const t = T[genre] || T.fantasy; const nama = `${pick(t.depan, rnd)} ${pick(t.belakang, rnd)}`;
  if (jenis === 'nama') return { jenis, judul: 'Nama', teks: nama };
  if (jenis === 'npc') return { jenis, judul: nama, teks: `${cap(pick(t.peran, rnd))}, ${pick(SIKAP, rnd)}. Motif: ${pick(MOTIF, rnd)}. Rahasia: ${pick(RAHASIA, rnd)}.` };
  if (jenis === 'barang') return { jenis, judul: 'Barang', teks: cap(pick(t.barang, rnd)) };
  if (jenis === 'kejadian') return { jenis, judul: 'Kejadian cepat', teks: cap(pick(t.kejadian, rnd)) + '.' };
  return { jenis, judul: 'Detail lokasi', teks: cap(pick(t.lokasi, rnd)) + '.' };
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
export const improvTables = T;
