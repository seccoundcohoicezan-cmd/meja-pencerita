import { bus } from '../shared/bus';
import { esc, clamp, num, sum, uid, uuid, slug, normL, pad2, fmtMod } from '../core/util';
import { POOLS, POOL_DESC, TIERS, BOSS_TIERS, dStr, rollArr, tierOf, findTier, tkToTier, shiftTier, rollD100, bands, distOf, conv, shiftDist, pSuccess } from '../core/dice';
import { ABIL_SEDERHANA, MUSUH, seranganMusuh, peluangKena, UJI_CONTOH, nilaiPertahanan } from '../core/skills';
import { ABILS, ABIL_NAMA, ABILITY_ARRAY, SKILLS, findSkill, skAbil, DC_TABLE, dcTierOf, tierIdx, AID_MAG, AID_TYPES, aidLabel, aidCap, aidFailOpts,
  resultTier, kontesTier, RT_LABEL, RT_CLS, hasTierText, tierText, tierEfek, CLASS_SKILLS, classTable, shuffledAbility } from '../core/skills';
import { loadImg, wrapText, heart, rrect, fitFont, drawCard, dlCanvas, FOTO_AWAL } from '../core/card';
import { pD20, pPasif, pKontes, pPool, pKelompok, pDuelRonde, pDuel, pBoss, pct } from '../core/prob';
import { improv, IMPROV_JENIS } from '../core/improv';

/* ======================= STATE ======================= */
const KEY='masterydnd-v3', V2KEY='meja-pencerita-sistem-v2', OLDKEY='meja-pencerita-sistem-v1';
const GENRE_ORDER=['fantasy','custom','archive','apocalyptic','zombies','cyberpunk','mystery'];
const GENRES={
 fantasy:{nama:'Fantasy',desc:'Kerajaan, sihir, makhluk mitos, dan iblis dari masa lalu.',
  nada:'Fantasi abad pertengahan yang epik dan puitis: kastel, desa, gereja, sihir, makhluk mitos. Narasi penuh emosi, dialog bergaya klasik.',
  aturan:'Sihir selalu punya harga. Setiap musuh besar punya alasan dan sejarah. Sisipkan satu misteri kuno yang bisa berlanjut ke bab berikutnya.',
  istilah:{nyawa:'Hati',ramuan:'Ramuan',stack:'Stack Bayangan',tumbang:'Tumbang',pahlawan:'Pahlawan',bos:'Bos'},
  build:[{id:'ras',nama:'Ras / bangsa',ket:'manusia, elf, kurcaci, dan sebagainya'},{id:'asal',nama:'Asal-usul',ket:'satu kalimat masa lalu'},{id:'sumpah',nama:'Sumpah / tujuan pribadi',ket:'apa yang ia kejar'}],
  ending:['Ending Cahaya','Ending Fajar Kelabu','Ending Bayangan']},
 archive:{nama:'Archive',desc:'Arsip kuno, perpustakaan terlarang, dan dokumen rahasia.',
  nada:'Misteri sejarah yang cerdas dan menegangkan: perpustakaan tua, biara, museum, ruang arsip rahasia, kode sandi, dan ordo rahasia penjaga kebenaran. Narasi tenang namun penuh ketegangan.',
  aturan:'Setiap adegan menyimpan minimal satu dokumen, simbol, atau sandi yang bisa dipecahkan pemain. Kebenaran terungkap sepotong demi sepotong. Musuh bekerja dari balik bayangan.',
  istilah:{nyawa:'Tekad',ramuan:'Tonik',stack:'Kecurigaan',tumbang:'Pingsan',pahlawan:'Penjelajah',bos:'Penjaga Rahasia'},
  build:[{id:'era',nama:'Era / asal',ket:'dari zaman atau negeri mana'},{id:'bidang',nama:'Bidang keahlian',ket:'bahasa kuno, kriptografi, restorasi, sejarah'},{id:'org',nama:'Organisasi / pelindung',ket:'universitas, gereja, museum, ordo'},{id:'dicari',nama:'Rahasia yang ia cari',ket:'dokumen atau kebenaran pribadi'}],
  ending:['Kebenaran Terungkap','Setengah Kebenaran','Arsip Terkubur']},
 apocalyptic:{nama:'Apocalyptic',desc:'Dunia setelah kiamat: gurun, reruntuhan, dan harapan kecil.',
  nada:'Pasca-kiamat yang keras dan melankolis: kota runtuh, gurun radiasi, kelangkaan air dan bahan bakar, komunitas kecil yang bertahan. Narasi berdebu dan sunyi, tetapi menyimpan harapan.',
  aturan:'Sumber daya selalu langka, jadi setiap pilihan punya harga. Tunjukkan sisa-sisa dunia lama. Manusia lain bisa lebih berbahaya daripada alam.',
  istilah:{nyawa:'Nyawa',ramuan:'Medkit',stack:'Radiasi',tumbang:'Tak Sadar',pahlawan:'Penyintas',bos:'Ancaman'},
  build:[{id:'keahlian',nama:'Keahlian bertahan hidup',ket:'berburu, mekanik, navigasi, medis'},{id:'perlengkapan',nama:'Perlengkapan / kendaraan',ket:'satu barang andalan'},{id:'luka',nama:'Luka masa lalu',ket:'apa yang hilang saat kiamat'},{id:'lindungi',nama:'Yang ingin ia lindungi',ket:'orang, tempat, atau janji'}],
  ending:['Oasis Baru','Bertahan Hidup','Debu dan Abu']},
 zombies:{nama:'Zombies',desc:'Wabah mayat hidup. Bertahan, atau menjadi salah satu dari mereka.',
  nada:'Horor bertahan hidup yang tegang: kota dilanda wabah, gerombolan zombie, persediaan menipis, keputusan moral yang berat. Narasi cepat dan mencekam, sesekali sunyi yang menakutkan.',
  aturan:'Suara menarik zombie, jadi pilihan yang ribut harus berisiko. Setiap tempat aman hanya sementara. Sesama penyintas bisa menjadi sekutu atau ancaman.',
  istilah:{nyawa:'Nyawa',ramuan:'Perban',stack:'Infeksi',tumbang:'Terkapar',pahlawan:'Penyintas',bos:'Ancaman'},
  build:[{id:'profesi',nama:'Profesi sebelum wabah',ket:''},{id:'bawaan',nama:'Barang bawaan',ket:''},{id:'takut',nama:'Ketakutan terbesar',ket:''},{id:'moral',nama:'Garis moral',ket:'hal yang tidak akan pernah ia lakukan'}],
  ending:['Zona Aman','Selamat dengan Luka','Wabah Menang']},
 cyberpunk:{nama:'Cyberpunk',desc:'Neon, korporasi, implan, dan kota yang tak pernah tidur.',
  nada:'Cyberpunk noir: megakota neon, hujan asam, korporasi raksasa, geng jalanan, hacker, implan sibernetik. Narasi tajam, bergaya, penuh slang jalanan.',
  aturan:'Setiap pekerjaan punya klien dengan agenda tersembunyi. Teknologi selalu punya celah. Korporasi tidak pernah benar-benar kalah.',
  istilah:{nyawa:'Integritas',ramuan:'Stimpak',stack:'Heat',tumbang:'Offline',pahlawan:'Runner',bos:'Target'},
  build:[{id:'julukan',nama:'Julukan jalanan',ket:''},{id:'implan',nama:'Implan sibernetik',ket:'implan utama dan efeknya'},{id:'peran',nama:'Peran kru',ket:'netrunner, solo, techie, face, fixer'},{id:'utang',nama:'Utang / afiliasi',ket:'kepada siapa ia berutang'}],
  ending:['Legenda Jalanan','Bayaran Selesai','Flatline']},
 mystery:{nama:'Mystery',desc:'Kasus, petunjuk, dan dalang yang bersembunyi di antara kita.',
  nada:'Misteri detektif: kota berkabut, rumah tua, pesta mewah, saksi yang berbohong. Narasi penuh detail kecil yang ternyata penting, dengan twist yang adil.',
  aturan:'Sebar petunjuk secara adil: pemain yang teliti harus bisa menebak dalangnya sebelum akhir. Setiap tersangka punya motif. Sertakan minimal satu petunjuk palsu.',
  istilah:{nyawa:'Kewarasan',ramuan:'Teh Penenang',stack:'Jejak Dingin',tumbang:'Terguncang',pahlawan:'Penyelidik',bos:'Dalang'},
  build:[{id:'profesi',nama:'Profesi',ket:''},{id:'metode',nama:'Metode investigasi',ket:'deduksi, interogasi, forensik, intuisi'},{id:'rahasia',nama:'Rahasia pribadi',ket:''},{id:'koneksi',nama:'Koneksi dengan kasus',ket:''}],
  ending:['Kasus Terpecahkan','Kebenaran Sebagian','Pelaku Lolos']}
};
const KJ={fantasy:[30,40,30],archive:[25,45,30],apocalyptic:[45,35,20],zombies:[45,35,20],cyberpunk:[35,40,25],mystery:[30,40,30]};
Object.entries(KJ).forEach(([g,v])=>{GENRES[g].kejadian={buruk:v[0],tenang:v[1],baik:v[2]}});
const EV_TYPES={bencana:'Bencana',buruk:'Buruk',tenang:'Tenang',baik:'Baik',sangat_baik:'Sangat Baik',keajaiban:'Keajaiban'};
const EV_DEFAULT={bencana:{nyawa_acak:-1},buruk:{tingkat:1},tenang:{},baik:{ramuan:1},sangat_baik:{stack:-1},keajaiban:{item:'Barang langka (GM tentukan)'}};
const EV_TEXT={bencana:'Sesuatu yang sangat buruk terjadi. GM menceritakan bentuknya sesuai adegan.',buruk:'Keadaan memburuk. GM menceritakan hambatannya.',tenang:'Tidak terjadi apa-apa. Bacakan suasana sekitar.',baik:'Keberuntungan kecil berpihak pada kelompok.',sangat_baik:'Keberuntungan besar berpihak pada kelompok.',keajaiban:'Keajaiban! Kelompok menemukan sesuatu yang sangat berharga.'};
const TRAITS={
 umum:{baik:['Pemberani','Setia kawan','Cerdik','Sabar','Jujur','Murah hati','Tekun','Humoris','Tenang di bawah tekanan','Penuh rasa ingin tahu','Pelindung','Rendah hati','Optimis','Teliti','Karismatik','Pemaaf','Disiplin','Kreatif','Tangguh','Bijaksana'],
  buruk:['Ceroboh','Keras kepala','Pemarah','Penakut','Sombong','Pelupa','Serakah','Pencemburu','Malas','Mudah curiga','Suka pamer','Tidak sabaran','Pendendam','Cerewet','Pesimis','Mudah panik','Egois','Suka berbohong kecil','Terlalu percaya orang','Gegabah']},
 fantasy:{baik:['Berhati singa','Pegang sumpah ksatria','Diberkati bulan','Lidah perak','Mata elang','Tangan penyembuh','Sahabat para hewan','Hafal legenda kuno','Kaki secepat angin','Tak kenal lelah','Murah hati pada rakyat','Tenang seperti danau','Keberuntungan pengembara','Pelindung yang lemah','Haus ilmu','Sabar seperti batu','Jujur sampai akhir','Penghibur kedai','Teguh iman','Pemimpin alami'],
  buruk:['Haus kejayaan','Takut sihir gelap','Sumbu pendek','Terlalu sombong','Dihantui mimpi buruk','Rakus emas','Mudah percaya orang asing','Menyimpan dendam lama','Ceroboh dengan api','Keras kepala','Takut air dalam','Mudah mabuk','Pembual','Sering lupa janji','Penakut dalam gelap','Iri pada bangsawan','Tak bisa berbohong','Gegabah menyerang','Susah bangun pagi','Dibayangi masa lalu']},
 archive:{baik:['Ingatan fotografis','Fasih bahasa mati','Pemecah sandi','Tangan terampil restorasi','Pengamat detail','Sabar membaca','Jaringan pustakawan','Tenang di ruang gelap','Pencatat yang rapi','Intuisi sejarah','Pandai menyamar','Lidah diplomat','Setia pada kebenaran','Tahan debu dan lembap','Pencari pola','Hafal peta kuno','Hormat pada leluhur','Rasa ingin tahu besar','Tekun sampai pagi','Keberuntungan penemu'],
  buruk:['Terobsesi kebenaran','Rabun senja','Takut ruang sempit','Sombong akademis','Pelupa urusan sehari-hari','Batuk debu','Tergila-gila dokumen langka','Canggung bergaul','Terlalu banyak bicara','Paranoid ordo rahasia','Ceroboh menyentuh artefak','Keras kepala soal teori','Mudah lelah','Suka "meminjam" buku','Takut kegelapan','Mudah cemas','Tidak sabaran','Punya rahasia memalukan','Dimusuhi rival akademis','Mudah tersesat']},
 apocalyptic:{baik:['Pencari air','Mekanik bertangan dingin','Hemat persediaan','Tahan panas gurun','Penembak jitu','Penenang kelompok','Navigator bintang','Tahan radiasi ringan','Jago barter','Pelindung anak-anak','Pemburu senyap','Pemulung jeli','Tidur ringan dan sigap','Kuat mengangkat beban','Penjaga harapan','Setia pada komunitas','Pengobat lapangan','Pengintai tajam','Pembuat api','Tekad baja'],
  buruk:['Serakah ransum','Trauma ledakan','Tidak percaya siapa pun','Batuk debu','Temperamen gurun','Kecanduan rokok lama','Dendam pada perampok','Ceroboh membuat suara','Mudah menyerah','Payah membaca arah','Sakit punggung','Suka mencuri kecil-kecilan','Mimpi buruk kiamat','Keras kepala','Rakus bensin','Pemarah saat lapar','Terlalu percaya orang asing','Takut terowongan gelap','Kaki pincang','Suka bertaruh']},
 zombies:{baik:['Refleks cepat','Pelari jarak jauh','Tenang melihat darah','Ahli barikade','Hafal jalan kota','Pembuat senjata darurat','Pendengaran tajam','Pelindung kelompok','Hemat peluru','Pemanjat lincah','Pemberi semangat','Pandai menyimpan rahasia','Paramedis dadakan','Bergerak senyap','Tahan lapar','Pengemudi andal','Pemikir jernih','Setia sampai akhir','Humor gelap penenang','Tidak mudah panik'],
  buruk:['Mudah panik','Batuk keras','Takut darah','Ceroboh dan berisik','Egois demi selamat','Keras kepala','Tak tega melawan yang dikenal','Mudah lelah','Pemarah','Rakus persediaan','Menyimpan rahasia kelam','Susah tidur','Pelupa','Terlalu percaya orang','Suka mengambil barang','Suka berbohong','Kaki lemah','Pesimis','Suka ambil risiko','Trauma kehilangan keluarga']},
 cyberpunk:{baik:['Tangan hacker','Refleks implan','Jaringan fixer luas','Lidah tajam','Mata kamera','Tenang saat baku tembak','Mekanik chrome','Setia pada kru','Pengemudi neon','Pendengar rumor','Ahli identitas palsu','Kebal propaganda','Tahan stimulan','Pembaca bahasa tubuh','Hemat eddies','Penawar ulung','Punya tempat persembunyian','Naluri jalanan','Tidak bisa disuap','Keberuntungan setan'],
  buruk:['Kecanduan braindance','Berutang pada geng','Implan sering glitch','Sombong soal chrome','Paranoid korporat','Temperamen pendek','Dicari polisi','Mudah tergoda uang','Rakus implan','Insomnia neon','Pembual','Tidak percaya siapa pun','Ceroboh jejak digital','Dendam pada korporasi','Suka taruhan','Pembohong kebiasaan','Takut mati otak','Mantan pengkhianat','Mudah mabuk','Terlalu nekat']},
 mystery:{baik:['Mata detektif','Ingatan kuat','Pendengar sabar','Pembaca kebohongan','Tenang menghadapi mayat','Pandai menyamar','Logika dingin','Jaringan informan','Pencatat yang rapi','Intuisi tajam','Lidah manis','Sabar menunggu','Penghafal wajah','Berani keluar malam','Jujur','Pengamat cuaca dan waktu','Paham racun','Tangan cepat','Rendah hati','Gigih mencari kebenaran'],
  buruk:['Terobsesi kasus','Susah tidur','Kecanduan kopi','Sinis','Mudah curiga','Sombong soal deduksi','Canggung bergaul','Dihantui kasus lama','Takut darah','Sering lupa janji','Terlalu blak-blakan','Pemarah','Ceroboh dengan bukti','Mudah terpancing emosi','Punya rahasia kelam','Malas menulis laporan','Berutang judi','Tidak percaya polisi','Keras kepala','Mudah luluh oleh air mata']}
};
const traitTable=g=>TRAITS[g]||TRAITS.umum;
const ACCENT={fantasy:'#d9a441',archive:'#c9a26a',apocalyptic:'#e0883a',zombies:'#9ccc4f',cyberpunk:'#ff3d8b',mystery:'#9fb8d4',custom:'#d9a441'};
const TERM_LABELS=[['nyawa','Nyawa'],['ramuan','Ramuan'],['stack','Stack Bayangan'],['tumbang','Tumbang'],['pahlawan','Pahlawan'],['bos','Bos']];
const defCustom=()=>({nama:'Custom',desc:'Buat genre sendiri: atur istilah, nada, dan aturan build.',nada:'',aturan:'',
  istilah:{nyawa:'Nyawa',ramuan:'Ramuan',stack:'Stack Bayangan',tumbang:'Tumbang',pahlawan:'Pahlawan',bos:'Bos'},build:[],ending:['Ending Baik','Ending Netral','Ending Buruk'],kejadian:{buruk:30,tenang:40,baik:30}});
const defSys=(g)=>{const gd=g?GD(g):null;const en=gd&&gd.ending&&gd.ending.length?gd.ending:['Ending Cahaya','Ending Fajar Kelabu','Ending Bayangan'];
  return {judul:'',adegan:'',ramuan:2,sbMax:10,sbBos:2,profBonus:2,
  tk:[{n:'Mudah',v:10},{n:'Sedang',v:14},{n:'Sulit',v:18},{n:'Sangat Sulit',v:22}],
  ending:en.map((n,i)=>({nama:n,maks:[3,7,10][i]??10})),ikut:[],plot:'',bos:{nama:'',tingkat:'',tambahan:''}}};
/* ---- Model data v3: banyak campaign, masing-masing punya genre sendiri ---- */
const clone=o=>JSON.parse(JSON.stringify(o));
function genreNama(g,custom){return g==='custom'?((custom||{}).nama||'Custom'):(GENRES[g]?GENRES[g].nama:g)}
function newCampObj(g,nama,extra){const id=uuid();return Object.assign({id,nama:nama||('Campaign '+genreNama(g,R&&R.custom)),genre:g,custom:g==='custom'?clone((R&&R.custom)||defCustom()):null,
  heroes:[],sys:null,story:null,sesi:null,bab:1,arsip:[],bawaan:null,undo:[],dibuat:Date.now(),diubah:Date.now(),cloud:{}},extra||{})}
/** Ubah simpanan versi lama (satu workspace per genre) menjadi daftar campaign. */
function campsFromWs(o){const out=[];if(!o||!o.ws)return out;
  Object.entries(o.ws).forEach(([g,w])=>{if(!w||!((w.heroes||[]).length||w.story||w.sesi))return;
    const c=newCampObj(g,'Campaign '+genreNama(g,o.custom),{heroes:w.heroes||[],sys:w.sys||null,story:w.story||null,sesi:w.sesi||null,draft:w.draft||null});
    if(g==='custom'&&o.custom)c.custom=clone(o.custom);c._dariGenreAktif=g===o.genre;out.push(c)});return out}
function loadState(){let r=null;try{r=JSON.parse(localStorage.getItem(KEY))}catch(e){r=null}
  if(r&&typeof r==='object'&&r.camps)return r;
  r={v:3,aktif:null,camps:{},custom:defCustom(),siteUrl:''};let o=null;
  try{o=JSON.parse(localStorage.getItem(V2KEY))}catch(e){}
  if(!o||!o.ws){try{const v1=JSON.parse(localStorage.getItem(OLDKEY));if(v1&&Array.isArray(v1.heroes))o={genre:'fantasy',ws:{fantasy:v1}}}catch(e){}}
  if(o&&o.ws){R=r;r.siteUrl=o.siteUrl||'';if(o.custom)r.custom=o.custom;campsFromWs(o).forEach(c=>{const a=c._dariGenreAktif;delete c._dariGenreAktif;r.camps[c.id]=c;if(a)r.aktif=c.id})}
  return r}
let R=null;R=loadState();
R.custom=Object.assign(defCustom(),R.custom||{});R.custom.kejadian=Object.assign({buruk:30,tenang:40,baik:30},R.custom.kejadian||{});R.custom.istilah=Object.assign(defCustom().istilah,R.custom.istilah||{});
let W=null;
/** Konfigurasi genre custom milik campaign aktif (tiap campaign custom punya aturannya sendiri). */
function CUST(){if(W&&W.genre==='custom'){if(!W.custom)W.custom=clone(R.custom);const c=W.custom;const d=defCustom();
    W.custom=Object.assign(d,c);W.custom.kejadian=Object.assign({buruk:30,tenang:40,baik:30},c.kejadian||{});W.custom.istilah=Object.assign(d.istilah,c.istilah||{});W.custom.build=c.build||[];return W.custom}
  return R.custom}
function GD(g){return g==='custom'?CUST():GENRES[g]}
function G(){return GD(R.genre)}
function camp(id){const w=R.camps[id];if(!w)return null;const prevW=W;W=w;
  w.sys=Object.assign(defSys(w.genre),w.sys||{});w.heroes=(w.heroes||[]).filter(h=>h&&typeof h==='object').map(h=>{const d=newHero();const o=Object.assign(d,h);o.sk=Object.assign(d.sk||{},h.sk||{});o.sp=Object.assign(newHero().sp||{},h.sp||{});o.gf=h.gf||{};o.uid=h.uid||uid();o.cid=h.cid||uuid();return o});
  w.arsip=w.arsip||[];w.bab=w.bab||1;w.undo=w.undo||[];w.cloud=w.cloud||{};W=prevW;return w}
function activate(id){if(id&&R.camps[id]){W=camp(id);R.aktif=id;R.genre=W.genre}else{W=null;R.aktif=null;R.genre=null}}
activate(R.aktif);
/* ---- Penyimpanan: selalu ke perangkat, lalu (bila login) ke cloud ---- */
let saveGagal=false;
const save=()=>{if(W){W.diubah=Date.now();W.cloud=W.cloud||{};W.cloud.dirty=true}
  try{localStorage.setItem(KEY,JSON.stringify(R));if(saveGagal){saveGagal=false;toast('Penyimpanan di perangkat kembali normal.')}}
  catch(e){if(!saveGagal){saveGagal=true;toast('Data GAGAL tersimpan di perangkat (memori browser penuh). Klik "Simpan semua ke file" sekarang supaya tidak hilang.',true,12000)}}
  bus.emit('save')};
function toast(msg,bad,ms){const t=$('toast');if(!t){if(bad)alert(msg);return}t.textContent=msg;t.className='show'+(bad?' bad':'');clearTimeout(t._h);t._h=setTimeout(()=>t.className='',ms||3800)}

/* ======================= HELPERS ======================= */
const $=id=>document.getElementById(id);
function dv(el){const mn=num(el.dataset.min,1),mx=num(el.dataset.max,100),v=parseInt(el.value,10),ok=v>=mn&&v<=mx;el.classList.toggle('bad',el.value!==''&&!ok);return ok?v:null}
function dieInput(cls,dice,extra=''){const mn=dice.length,mx=sum(dice);return `<span style="display:flex;gap:4px;align-items:center"><input class="die ${cls}" type="number" data-min="${mn}" data-max="${mx}" data-dice="${dice.join(',')}" ${extra}><button class="dbtn" data-acak="1" type="button">Acak</button></span>`}
function setDice(inp,dice){inp.dataset.dice=dice.join(',');inp.dataset.min=dice.length;inp.dataset.max=sum(dice);dv(inp)}
document.addEventListener('click',e=>{const b=e.target.closest('[data-acak]');if(!b)return;const inp=b.parentElement.querySelector('input.die');if(!inp)return;
  const d=inp.dataset.dice==='d100'?null:inp.dataset.dice.split(',').map(Number);inp.value=d?rollArr(d):rollD100();dv(inp);inp.dispatchEvent(new Event('input',{bubbles:true}))});
document.addEventListener('input',e=>{if(e.target.classList&&e.target.classList.contains('die'))dv(e.target)});
function download(name,obj){const b=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function readFile(input,cb){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>cb(r.result);r.readAsText(f);input.value=''}
function modal(html){$('modalBody').innerHTML='<button class="modal-x" type="button" aria-label="Tutup" onclick="closeModal()">✕</button>'+html;$('modal').classList.add('show')}
function closeModal(){$('modal').classList.remove('show')}
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});

/* ======================= TERMINOLOGI GENRE ======================= */
const TERM_RE=/\b(Stack Bayangan|Stack|Nyawa|nyawa|Ramuan|ramuan|Tumbang|tumbang|Pahlawan|pahlawan|Bos|bos)\b/g;
const TERM_T=/\b(Stack Bayangan|Stack|Nyawa|nyawa|Ramuan|ramuan|Tumbang|tumbang|Pahlawan|pahlawan|Bos|bos)\b/;
const TERM_KEY={'Stack Bayangan':'stack','Stack':'stack','Nyawa':'nyawa','nyawa':'nyawa','Ramuan':'ramuan','ramuan':'ramuan','Tumbang':'tumbang','tumbang':'tumbang','Pahlawan':'pahlawan','pahlawan':'pahlawan','Bos':'bos','bos':'bos'};
function termFor(word){if(!R.genre)return word;const v=(G().istilah||{})[TERM_KEY[word]];if(!v||v.includes(word))return word;
  return word[0]===word[0].toLowerCase()?v.toLowerCase():v}
const ORIG=new WeakMap();
function applyTerms(root){if(!R.genre)return;const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;if(!p)return 2;
    if(p.closest('.noterm,script,style,textarea'))return 2;return (ORIG.has(n)||TERM_T.test(n.nodeValue))?1:2}});
  const nodes=[];while(tw.nextNode())nodes.push(tw.currentNode);
  nodes.forEach(n=>{const base=ORIG.has(n)?ORIG.get(n):n.nodeValue;TERM_RE.lastIndex=0;const nv=base.replace(TERM_RE,m=>termFor(m));
    if(nv!==base&&!ORIG.has(n))ORIG.set(n,base);if(n.nodeValue!==nv)n.nodeValue=nv})}
let termBusy=false;
const termObs=new MutationObserver(()=>{if(termBusy)return;termBusy=true;termObs.disconnect();try{applyTerms(document.body)}finally{termObs.observe(document.body,{childList:true,subtree:true,characterData:true});termBusy=false}});
function T(k){return (R.genre&&G().istilah&&G().istilah[k])||({nyawa:'Nyawa',ramuan:'Ramuan',stack:'Stack Bayangan',tumbang:'Tumbang',pahlawan:'Pahlawan',bos:'Bos'})[k]}

/* ======================= GENRE PICKER ======================= */
function renderGenres(){
  $('genreList').innerHTML=GENRE_ORDER.map((g,i)=>{const d=g==='custom'?R.custom:GENRES[g];
    return `<button class="gcard" data-genre="${g}" style="--acc:${ACCENT[g]||'#d9a441'}"><span class="gn">${i+1}</span><span><span class="gt">${esc(d.nama)}</span><div class="gd">${esc(d.desc)}</div></span><span class="arrow">›</span></button>`}).join('');
  $('genreList').querySelectorAll('[data-genre]').forEach(b=>b.onclick=()=>pickGenre(b.dataset.genre));
}
function campStatus(c){if(c.sesi&&!c.sesi.ended&&c.story)return 'Sesi berjalan';if(c.sesi&&c.sesi.ended)return 'Bab selesai';if(c.story)return 'Cerita siap dimainkan';if((c.heroes||[]).length)return 'Menyiapkan pahlawan';return 'Baru'}
function renderBeranda(){const list=Object.values(R.camps).sort((a,b)=>(b.diubah||0)-(a.diubah||0));
  const cloud=bus.app&&bus.app.cloudInfo?bus.app.cloudInfo():null;
  $('campList').innerHTML=`<button class="camp-card camp-new" id="newCampBtn"><span class="plus">＋</span><b>Campaign baru</b><span class="small">Pilih genre, lalu siapkan pahlawan.</span></button>`+
   list.map(c=>{const n=(c.heroes||[]).length;return `<article class="camp-card" style="--acc:${ACCENT[c.genre]||'#d9a441'}">
    <div class="cc-top"><span class="cc-genre">${esc(genreNama(c.genre,c.custom))}</span><span class="cc-status">${esc(campStatus(c))}</span></div>
    <h3>${esc(c.nama)}</h3>
    <p class="small">${n} pahlawan · Bab ${c.bab||1}${c.story?` · ${esc(c.story.judul||'cerita dimuat')}`:''}</p>
    ${cloud&&cloud.login?`<p class="small cc-sync">${c.cloud&&c.cloud.syncedAt?(c.cloud.dirty?'☁ Menunggu sinkronisasi':'☁ Tersimpan di cloud'):'☁ Belum pernah disinkronkan'}</p>`:''}
    <div class="actions"><button class="btn" data-open="${esc(c.id)}">Buka</button><button class="dbtn" data-rename="${esc(c.id)}">Ganti nama</button><button class="dbtn red" data-delcamp="${esc(c.id)}">Hapus</button></div></article>`}).join('');
  $('newCampBtn').onclick=()=>{$('newCampBox').style.display='';$('newCampName').value='';renderGenres();$('newCampName').focus();$('newCampBox').scrollIntoView({behavior:'smooth',block:'start'})};
}
$('campList').addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o){openCamp(o.dataset.open);return}
  const rn=e.target.closest('[data-rename]');if(rn){const c=R.camps[rn.dataset.rename];const v=prompt('Nama campaign baru:',c.nama);if(v&&v.trim()){c.nama=v.trim();c.diubah=Date.now();c.cloud=c.cloud||{};c.cloud.dirty=true;save();renderBeranda();updateChrome()}return}
  const d=e.target.closest('[data-delcamp]');if(d){const c=R.camps[d.dataset.delcamp];if(!confirm(`Hapus campaign "${c.nama}" beserta semua pahlawan, cerita, dan sesinya?${bus.app&&bus.app.cloudInfo&&bus.app.cloudInfo().login?' Data di cloud juga akan dihapus.':''}`))return;
    bus.emit('hapusCampaign',c.id,(c.heroes||[]).map(h=>h.cid));(c.heroes||[]).forEach(h=>IDB.del(`${c.genre}|${h.uid}`));delete R.camps[c.id];if(R.aktif===c.id)activate(null);save();updateChrome();renderBeranda()}});
$('cancelNewCamp').onclick=()=>{$('newCampBox').style.display='none'};
function pickGenre(g){const c=newCampObj(g,$('newCampName').value.trim());R.camps[c.id]=c;$('newCampBox').style.display='none';openCamp(c.id)}
function openCamp(id){activate(id);save();updateChrome();renderHeroes();renderSys();applyTerms(document.body);showTab(W.sesi&&!W.sesi.ended&&W.story?'play':'heroes')}
function updateChrome(){const on=!!R.genre;$('mainNav').style.display=on?'':'none';$('genreBadge').style.display=on?'':'none';$('changeGenre').style.display=on?'':'none';
  if(on){$('genreBadge').textContent='Genre: '+G().nama;$('campTitle').textContent=`${W.nama} · Bab ${W.bab||1}`}else $('campTitle').textContent='Buka atau buat campaign di Beranda untuk mulai.';
  $('exportAll').style.display=on?'':'none';document.title=on?`${W.nama} — MasteryDnD`:'MasteryDnD — Meja Pencerita untuk Game Master'}
$('changeGenre').onclick=()=>showTab('beranda');
document.addEventListener('keydown',e=>{if(!$('p-beranda').classList.contains('active')||$('newCampBox').style.display==='none')return;if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;const n=parseInt(e.key,10);if(n>=1&&n<=GENRE_ORDER.length)pickGenre(GENRE_ORDER[n-1])});

/* navigasi — setiap halaman tercatat di riwayat, jadi tombol ← dan tombol Back HP/browser selalu bisa kembali */
const MEJA=['heroes','prompt','load','play','help'];
const HALAMAN=['beranda','pengaturan','moderator',...MEJA];
let tabAktif=null,riwayatN=0;
function halamanDariHash(){const m=location.hash.match(/^#\/([a-z]+)/);return m&&HALAMAN.includes(m[1])?m[1]:null}
function showTab(p,opt){opt=opt||{};if(p==='genre')p='beranda';if(!HALAMAN.includes(p))p='beranda';if(MEJA.includes(p)&&p!=='help'&&!R.genre)p='beranda';
  if(p==='beranda')renderBeranda();if(p==='heroes')renderHeroes();if(p==='pengaturan'&&bus.app&&bus.app.renderPengaturan)bus.app.renderPengaturan();
  $('mejaWrap').style.display=MEJA.includes(p)?'':'none';
  $('mejaWrap').classList.toggle('is-help',p==='help');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.p===p));document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id==='p-'+p));
  const nav=['beranda','pengaturan','help','moderator'].includes(p)?p:'heroes';document.querySelectorAll('.snav[data-go]').forEach(b=>{b.classList.toggle('active',b.dataset.go===nav);b.toggleAttribute('aria-current',b.dataset.go===nav)});
  tutupMenu();
  const beda=p!==tabAktif;tabAktif=p;
  if(!opt.riwayat){const url='#/'+p;if(opt.ganti||!history.state||!history.state.p)history.replaceState({p,n:riwayatN},'',url);else if(beda){riwayatN++;history.pushState({p,n:riwayatN},'',url)}}
  $('backBtn').hidden=p==='beranda';
  if(beda&&!opt.awal)window.scrollTo(0,0);
  if(p==='prompt')renderSys();if(p==='play')renderPlay();bus.emit('tab',p)}
function kembali(){if(riwayatN>0)history.back();else showTab(MEJA.includes(tabAktif)&&tabAktif!=='heroes'&&R.genre?'heroes':'beranda')}
window.addEventListener('popstate',e=>{if(location.hash.startsWith('#k='))return;$('modal').classList.remove('show');tutupMenu();
  const st=e.state||{};riwayatN=st.n||0;const p=st.p||halamanDariHash()||'beranda';if(p!==tabAktif)showTab(p,{riwayat:true})});
$('backBtn').onclick=kembali;
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>showTab(t.dataset.p));
document.querySelectorAll('.snav[data-go]').forEach(b=>b.onclick=()=>{if(b.dataset.go==='layar'){tutupMenu();bus.emit('bukaLayar');return}showTab(b.dataset.go)});
function bukaMenu(){document.body.classList.add('menu-open');$('menuToggle').setAttribute('aria-expanded','true');setTimeout(()=>$('menuClose').focus(),50)}
function tutupMenu(){if(!document.body.classList.contains('menu-open'))return;document.body.classList.remove('menu-open');$('menuToggle').setAttribute('aria-expanded','false')}
$('menuToggle').onclick=()=>document.body.classList.contains('menu-open')?tutupMenu():bukaMenu();
$('menuClose').onclick=()=>{tutupMenu();$('menuToggle').focus()};$('scrim').onclick=tutupMenu;
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if($('modal').classList.contains('show'))closeModal();else tutupMenu()});

/* ======================= 1. HEROES ======================= */
const SK_TYPES=[['bonus','+X ke satu lemparan pahlawan ini'],['bonus_tim','+X ke Serangan Bos tim'],['auto_kritis','Lemparan berikutnya otomatis Kritis'],['perisai','Batalkan luka tim pada satu hasil'],['pulih_semua','Pulihkan X Nyawa semua pahlawan'],['lempar_ulang','Ulangi satu lemparan'],['catat','Hanya dicatat (efek dibacakan GM)']];
const SP_TYPES=[['tumbal','Tumbal-Selamatkan: rekan pulih 2 Nyawa'],['putar','Putar Waktu: ulangi satu lemparan / batalkan efek buruk'],['lain','Lainnya (dicatat)']];
function newHero(){return ({uid:uid(),cid:uuid(),pw:'',pertahanan:null,sifat:null,build:null,gf:{},dadu:'',id:'',nama:'',kelas:'',senjata:'',bonus:'',nyawa:3,dasar:'',sk:{nama:'',efek:'',tipe:'bonus',nilai:''},sp:{nama:'',biaya:1,efek:'',pola:'putar'},kep:'',ability:null,skills:[]})}
function heroWarn(h){const w=[];if(!h.nama)w.push('nama');(G().build||[]).forEach(b=>{if(b.nama&&!String((h.gf||{})[b.id]||'').trim())w.push(b.nama.toLowerCase())});if(h.bonus===''||isNaN(parseFloat(h.bonus))||!h.sifat)w.push('lempar build (bonus & sifat)');if(!POOLS[h.dadu])w.push('dadu kelas');if(!h.sk.nama)w.push('nama Skill Khusus');if(!h.sp.nama)w.push('nama Skill Pengorbanan');return w}
function renderHeroes(){if(!W)return;renderRules();renderBuildStatus();
  if(!W.heroes.length){$('heroList').innerHTML='<div class="hint">Belum ada pahlawan. Klik <b>+ Tambah pahlawan</b>.</div>';return}
  setTimeout(loadThumbs,0);
  $('heroList').innerHTML=W.heroes.map((h,i)=>{const w=heroWarn(h);return `<details class="hcard" ${h._open?'open':''} data-i="${i}">
  <summary><span>${esc(h.nama||'Pahlawan tanpa nama')} <span class="small">${esc(h.kelas)}${h.bonus!==''?` · bonus +${esc(h.bonus)}`:''}</span></span>
  <span class="small" style="color:${w.length?'var(--wax)':'var(--moss)'}">${w.length?'Belum lengkap: '+w.join(', '):'Lengkap'}</span></summary>
  <div class="grid3" style="margin-top:10px">
    ${fld(i,'nama','Nama')}${fld(i,'id','ID (otomatis dari nama, huruf kecil)')}${fld(i,'kelas','Kelas / peran')}
    ${fld(i,'senjata','Senjata + ciri khas')}${fld(i,'nyawa','Nyawa maksimum','number')}<div></div>
  </div>
  <div class="field" style="margin-top:8px"><label>Dadu kelas (dilempar pemain setiap cek)</label><select data-i="${i}" data-f="dadu"><option value="">— pilih dadu kelas —</option>${Object.keys(POOLS).map(k=>`<option value="${k}" ${h.dadu===k?'selected':''}>${dStr(POOLS[k])} · hasil ${POOLS[k].length}–${sum(POOLS[k])} · ${POOL_DESC[k]}</option>`).join('')}</select></div>
  <div class="buildbox"><div class="bx"><span class="small">Bonus dadu dasar (d4 + 1)</span><b>${h.bonus!==''&&h.build?`+${esc(h.bonus)}`:'—'}</b>${h.build?`<span class="small">d4 = ${h.build.d4}</span>`:''}</div>
    <div class="bx"><span class="small">Sifat baik (d20)</span><b>${h.sifat?esc(h.sifat.baik):'—'}</b>${h.sifat?`<span class="small">d20 = ${h.sifat.db}</span>`:''}</div>
    <div class="bx"><span class="small">Sifat buruk (d20)</span><b>${h.sifat?esc(h.sifat.buruk):'—'}</b>${h.sifat?`<span class="small">d20 = ${h.sifat.dr}</span>`:''}</div>
    <button class="btn alt" data-rollbuild="${i}" type="button">${h.build?'Lempar ulang build':'Lempar build'}</button></div>
  <div class="field" style="margin-top:8px"><label>Kemampuan dasar (dipakai tanpa batas)</label><input data-i="${i}" data-f="dasar" value="${esc(h.dasar)}"></div>
  ${(G().build||[]).filter(b=>b.nama).length?`<div class="sec"><b class="t">Build khusus genre ${esc(G().nama)}</b><div class="grid2" style="margin-top:6px">${(G().build||[]).filter(b=>b.nama).map(b=>`<div class="field"><label>${esc(b.nama)}${b.ket?` <span class="small">(${esc(b.ket)})</span>`:''}</label><input data-i="${i}" data-f="gf.${esc(b.id)}" value="${esc((h.gf||{})[b.id]||'')}"></div>`).join('')}</div></div>`:''}
  ${skillSection(h,i)}
  <div class="sec"><b class="t">Skill Khusus — 3x per cerita</b>
    <div class="grid3" style="margin-top:6px">
      ${fld(i,'sk.nama','Nama skill')}
      <div class="field"><label>Efek mekanis</label><select data-i="${i}" data-f="sk.tipe">${SK_TYPES.map(([v,l])=>`<option value="${v}" ${h.sk.tipe===v?'selected':''}>${l}</option>`).join('')}</select></div>
      ${['bonus','bonus_tim','pulih_semua'].includes(h.sk.tipe)?fld(i,'sk.nilai','Nilai X','number'):'<div></div>'}
    </div>
    <div class="field" style="margin-top:6px"><label>Efek (kalimat untuk cerita)</label><input data-i="${i}" data-f="sk.efek" value="${esc(h.sk.efek)}"></div>
  </div>
  <div class="sec"><b class="t">Skill Pengorbanan — dibayar dengan Nyawa</b>
    <div class="grid3" style="margin-top:6px">
      ${fld(i,'sp.nama','Nama skill')}
      <div class="field"><label>Pola</label><select data-i="${i}" data-f="sp.pola">${SP_TYPES.map(([v,l])=>`<option value="${v}" ${h.sp.pola===v?'selected':''}>${l}</option>`).join('')}</select></div>
      ${fld(i,'sp.biaya','Biaya (Nyawa diri sendiri)','number')}
    </div>
    <div class="field" style="margin-top:6px"><label>Efek (kalimat untuk cerita)</label><input data-i="${i}" data-f="sp.efek" value="${esc(h.sp.efek)}"></div>
  </div>
  <div class="field sec"><label>Catatan kepribadian (bahan narasi AI)</label><textarea rows="2" data-i="${i}" data-f="kep">${esc(h.kep)}</textarea></div>
  <div class="sec"><b class="t">Kartu karakter</b>
    <div class="photo-row" style="margin-top:6px">
      <div><img class="thumb" data-thumb="${esc(h.uid)}" alt="" style="display:none"><div class="thumb empty" data-thumbempty="${esc(h.uid)}">Belum ada foto</div></div>
      <div style="flex:1;min-width:220px">
        <div class="actions" style="margin-top:0"><label class="dbtn" style="cursor:pointer">Pilih foto<input type="file" accept="image/*" data-photo="${i}" hidden></label><button class="dbtn" data-photopos="${i}" type="button">Atur posisi foto</button><button class="dbtn red" data-photodel="${i}" type="button">Hapus foto</button></div>
        <div class="field" style="margin-top:8px"><label>Password kartu (dibuat pemain sendiri)</label><input data-i="${i}" data-f="pw" value="${esc(h.pw||'')}" autocomplete="off"></div>
        <div class="actions"><button class="btn" data-card="${i}" type="button">Unduh kartu (PNG)</button><button class="btn alt" data-invite="${i}" type="button">Buat kode untuk pemain</button><button class="dbtn" data-link="${i}" type="button">Link kartu tanpa akun</button></div>
        <div class="portal-info small" data-portal="${esc(h.cid)}"></div>
      </div>
    </div>
  </div>
  <div class="actions"><button class="dbtn red" data-del="${i}">Hapus pahlawan ini</button></div>
  </details>`}).join('');
  bus.emit('heroesRendered');
}
function skillSection(h,i){const pb=profB();const nProf=(h.skills||[]).filter(x=>x.prof).length;
  const cm=h.kelas?matchClass(h,R.genre):null;
  const warn=[];if(h._skillBelumDikurasi)warn.push(`Kelas "${esc(h.kelas||'(kosong)')}" tidak cocok dengan kelas genre ${esc(G().nama)}. Skill diisi dari urutan pendaftaran — cek ulang manual.`);
  if(h.ability&&nProf!==4)warn.push(`Jumlah skill proficient ${nProf} (aturan: 4 per kelas).`);
  const acv=acOf(h);
  const armSel=`<div class="ab-armor">${acv?`<div class="ac-box kunci" title="Dikocok pemain di awal. Terkunci, tidak bisa diubah."><small>🔒 Pertahanan (AC)</small><b>${acv}</b><span>d20 · dikunci ${h.pertahanan.at?new Date(h.pertahanan.at).toLocaleDateString('id-ID'):''}</span></div>
      <p class="small ac-ket">Pakem: angka ini dipakai setiap kali ada serangan musuh/serangan mendadak dan <b>tidak bisa diubah</b>.</p>`
    :`<div class="field ac-in"><label for="acIn-${i}">Pertahanan (AC): hasil d20 yang dikocok pemain</label><div class="row" style="margin:0"><input id="acIn-${i}" type="number" min="1" max="20" inputmode="numeric" placeholder="1–20" data-acin="${i}" style="width:90px"><button class="btn" type="button" data-kunciac="${i}">🔒 Kunci Pertahanan</button></div>
      <span class="ab-u">Pemain mengocok <b>1 d20 fisik</b> sekali di awal. Setelah dikunci, angka tidak bisa diubah siapa pun.</span></div>`}</div>`;
  const abInputs=h.ability?`<div class="abrow">${ABILS.map(a=>`<div class="field ab-f"><label title="${ABIL_NAMA[a]}"><span class="ab-ik" aria-hidden="true">${ABIL_SEDERHANA[a].ikon}</span> ${ABIL_SEDERHANA[a].n} <span class="small">${a}</span></label><input type="number" min="-5" max="10" data-i="${i}" data-f="ability.${a}" value="${esc(abMod(h,a))}" aria-label="${ABIL_SEDERHANA[a].n} (${a})"><span class="ab-u">${ABIL_SEDERHANA[a].u}</span></div>`).join('')}</div>
    <p class="small" style="margin:4px 0 0">Angka ditambahkan ke d20 saat cek skill atau Uji ability. Total ${fmtMod(ABILS.reduce((t,a)=>t+abMod(h,a),0))} (kumpulan tetap +3, +2, +1, 0, 0, −1).</p>`
    :`<div class="hint">Ability belum dilempar. Klik <b>Acak ability</b> (atau <b>Lempar build</b> untuk sekaligus bonus &amp; sifat).</div>`;
  const col=SKILLS.map(sk=>{const pr=isProf(h,sk.n),m=skillMod(h,sk.n);return `<tr class="${pr?'prof':''}"><td><label class="chk" style="font-size:13.5px"><input type="checkbox" data-prof="${i}" data-sk="${esc(sk.n)}" ${pr?'checked':''}> ${esc(sk.n)}</label></td><td class="small">${sk.a}</td><td class="m">${h.ability?fmtMod(m):'—'}</td></tr>`});
  const chunks=[col.slice(0,6),col.slice(6,12),col.slice(12)];
  return `<div class="sec"><b class="t">Ability, Pertahanan &amp; Skill</b> <span class="small">· cek skill = d20 + ability + ${pb} bila skill andalan (dicentang)</span>
    ${abInputs}${armSel}
    <p class="small" style="margin:8px 0 2px">Kelas terdeteksi: <b>${esc(h._kelasCocok||(cm?cm.m.nama:'—'))}</b>${h.ability?` · Perception pasif <b>${passiveOf(h)}</b>`:''}</p>
    ${warn.map(w=>`<div class="warn" style="margin:4px 0">${w}</div>`).join('')}
    <div class="skcols">${chunks.map(c=>`<table class="sktbl"><tr><th>Skill (✓ = proficient)</th><th>Abil</th><th class="m">Mod</th></tr>${c.join('')}</table>`).join('')}</div>
    <div class="actions"><button class="dbtn" data-rollab="${i}" type="button">${h.ability?'Acak ulang ability':'Acak ability'}</button><button class="dbtn" data-matchsk="${i}" type="button">Cocokkan skill dari kelas</button></div></div>`}
function loadThumbs(){W.heroes.forEach(h=>{IDB.get(photoKey(h)).then(v=>{const im=document.querySelector(`[data-thumb="${h.uid}"]`),em=document.querySelector(`[data-thumbempty="${h.uid}"]`);if(!im)return;if(v){im.src=v;im.style.display='';em.style.display='none'}else{im.style.display='none';em.style.display=''}})})}
function fld(i,f,label,type='text'){const v=f.split('.').reduce((o,k)=>o[k],W.heroes[i]);return `<div class="field"><label>${label}</label><input type="${type}" data-i="${i}" data-f="${f}" value="${esc(v)}"></div>`}
$('heroList').addEventListener('input',e=>{const t=e.target;if(t.dataset.f===undefined)return;const h=W.heroes[+t.dataset.i];h.gf=h.gf||{};const p=t.dataset.f.split('.');
  let o=h;for(let k=0;k<p.length-1;k++)o=o[p[k]];o[p[p.length-1]]=t.value;
  if(t.dataset.f==='nama'&&(!h._idManual)){h.id=slug(t.value);const idIn=document.querySelector(`[data-i="${t.dataset.i}"][data-f="id"]`);if(idIn)idIn.value=h.id}
  if(t.dataset.f==='id'){h._idManual=true;h.id=slug(t.value)}
  save();renderBuildStatus();const smry=t.closest('details').querySelector('summary');const w=heroWarn(h);
  smry.innerHTML=`<span>${esc(h.nama||'Pahlawan tanpa nama')} <span class="small">${esc(h.kelas)}${POOLS[h.dadu]?` · ${dStr(POOLS[h.dadu])}`:''}${h.bonus!==''?` +${esc(h.bonus)}`:''}</span></span><span class="small" style="color:${w.length?'var(--wax)':'var(--moss)'}">${w.length?'Belum lengkap: '+w.join(', '):'Lengkap'}</span>`});
$('heroList').addEventListener('change',e=>{if(e.target.dataset.photo!==undefined){const h=W.heroes[+e.target.dataset.photo];const file=e.target.files[0];if(file)resizePhoto(file).then(d=>IDB.set(photoKey(h),d).then(()=>bus.emit('foto',W,h,d))).then(()=>{loadThumbs();h.fotoPos=null;save();aturFoto(h)}).catch(err=>alert('Foto gagal dimuat: '+err.message));e.target.value='';return}
  if(e.target.dataset.prof!==undefined){const h=W.heroes[+e.target.dataset.prof],n=e.target.dataset.sk;h.skills=(h.skills||[]).filter(x=>x.nama!==n);if(e.target.checked)h.skills.push({nama:n,abil:skAbil(n),prof:true});delete h._skillBelumDikurasi;W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();return}
  if(String(e.target.dataset.f||'').startsWith('ability.')||e.target.dataset.f==='kelas'){const h=W.heroes[+e.target.dataset.i];W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();return}
  if(e.target.dataset.f==='dadu'){const h=W.heroes[+e.target.dataset.i];h.dadu=e.target.value;save();W.heroes.forEach(x=>x._open=false);h._open=true;renderHeroes();return}if(e.target.dataset.f==='sk.tipe'){W.heroes.forEach(x=>x._open=false);W.heroes[+e.target.dataset.i]._open=true;save();renderHeroes()}});
$('heroList').addEventListener('toggle',e=>{const d=e.target;if(d.dataset&&d.dataset.i!==undefined){W.heroes[+d.dataset.i]._open=d.open;save()}},true);
$('heroList').addEventListener('click',e=>{const rb=e.target.closest('[data-rollbuild]');if(rb){const h=W.heroes[+rb.dataset.rollbuild];if(h.build&&!confirm(`Lempar ulang build ${h.nama||''}? Bonus, sifat, 6 ability, dan skill kelas akan diganti.`))return;rollBuild(h);W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();return}
  const ra=e.target.closest('[data-rollab]');if(ra){const h=W.heroes[+ra.dataset.rollab];if(h.ability&&!confirm(`Acak ulang 6 ability ${h.nama||''}? Angka lama diganti.`))return;rollAbility(h);W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();return}
  const ms=e.target.closest('[data-matchsk]');if(ms){const h=W.heroes[+ms.dataset.matchsk];if((h.skills||[]).length&&!confirm(`Ganti skill proficient ${h.nama||''} sesuai kelas "${h.kelas||'-'}"? Centang manual akan hilang.`))return;assignSkillsFromClass(h,R.genre);W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();return}
  const cb=e.target.closest('[data-card]');if(cb){downloadCard(W.heroes[+cb.dataset.card]);return}
  const lb=e.target.closest('[data-link]');if(lb){shareLink(W.heroes[+lb.dataset.link]);return}
  const ib=e.target.closest('[data-invite]');if(ib){const h=W.heroes[+ib.dataset.invite];if(!h.nama)return alert('Isi nama pahlawan dulu.');bus.emit('undang',W,h);return}
  const ka=e.target.closest('[data-kunciac]');if(ka){const h=W.heroes[+ka.dataset.kunciac];if(acOf(h))return;const v=parseInt(document.querySelector(`[data-acin="${ka.dataset.kunciac}"]`).value,10);
    if(!(v>=1&&v<=20)){toast('Tulis hasil d20 pemain: angka 1–20.',true);return}
    if(!confirm(`Pertahanan ${h.nama||'pahlawan ini'} = ${v}.\n\nSetelah dikunci, angka ini TIDAK BISA diubah siapa pun (pakem). Sudah benar?`))return;
    h.pertahanan={nilai:v,at:Date.now()};W.heroes.forEach(x=>x._open=false);h._open=true;save();renderHeroes();toast(`Pertahanan ${h.nama} dikunci: ${v}`);return}
  const pp=e.target.closest('[data-photopos]');if(pp){aturFoto(W.heroes[+pp.dataset.photopos]);return}
  const pd=e.target.closest('[data-photodel]');if(pd){const h=W.heroes[+pd.dataset.photodel];IDB.del(photoKey(h)).then(()=>{bus.emit('fotoHapus',W,h);loadThumbs()});return}
  const b=e.target.closest('[data-del]');if(!b)return;const h=W.heroes[+b.dataset.del];if(confirm(`Hapus ${h.nama||'pahlawan ini'}?`)){W.heroes.splice(+b.dataset.del,1);IDB.del(photoKey(h));bus.emit('heroDihapus',W,h);save();renderHeroes()}});
$('addHero').onclick=()=>{W.heroes.forEach(x=>x._open=false);const h=newHero();h._open=true;W.heroes.push(h);save();renderHeroes()};

const CORE_BUILD=['Nama (dan ID otomatis)','Kelas / peran','Senjata atau alat utama + ciri khasnya','Dadu kelas: pilih satu dari d20, d12 + d8, d8 + d6 + d4, atau d10 + d6 + d4','Bonus dadu dasar: DILEMPAR SISTEM (d4 + 1, hasil +2 sampai +5), selalu ditambahkan ke setiap lemparan','Sifat baik dan sifat buruk: DILEMPAR SISTEM (d20 dari tabel genre)','6 Ability (STR/DEX/CON/INT/WIS/CHA): DIACAK SISTEM dari kumpulan tetap +3, +2, +1, 0, 0, −1','4 skill proficient: OTOMATIS dari kelas (lihat tabel kelas genre ini)','Nyawa maksimum (standar 3)','Kemampuan dasar, dipakai tanpa batas','Skill Khusus: nama, efek cerita, dan efek mekanis. Dipakai 3x per cerita','Skill Pengorbanan: nama, pola, dan biaya Nyawa. Efeknya harus sepadan dengan biayanya','Catatan kepribadian untuk bahan narasi','Password kartu (dibuat pemain sendiri) dan foto (opsional) untuk kartu karakter'];
function renderRules(){const g=G(),isC=R.genre==='custom';
  const terms=TERM_LABELS.map(([k,l])=>`<tr><td>${l}</td><td><b>${esc(g.istilah[k])}</b></td></tr>`).join('');
  if(!isC){$('genreRules').innerHTML=`<div><h2>Aturan Genre: ${esc(g.nama)}</h2><p><i>${esc(g.desc)}</i></p>
    <div class="grid2"><div><h3>Yang harus dibuild setiap pemain</h3><ol class="rules">${CORE_BUILD.map(x=>`<li>${esc(x)}</li>`).join('')}${g.build.map(b=>`<li><b>${esc(b.nama)}</b>${b.ket?` — ${esc(b.ket)}`:''}</li>`).join('')}</ol></div>
    <div><h3>Istilah di genre ini</h3><table class="grid termtbl noterm">${terms}</table>
    <h3>Nada cerita</h3><p class="small">${esc(g.nada)}</p><h3>Aturan khusus genre</h3><p class="small">${esc(g.aturan)}</p>${evInfo(g)}${traitInfo()}${classInfo()}</div></div></div>`;return}
  $('genreRules').innerHTML=`<div><h2>Aturan Genre Custom</h2><p class="small">Atur genre buatanmu. Perubahan tersimpan otomatis dan langsung dipakai di prompt dan di meja permainan.</p>
   <div class="grid2"><div class="field"><label>Nama genre</label><input data-c="nama" value="${esc(g.nama)}"></div><div class="field"><label>Deskripsi singkat</label><input data-c="desc" value="${esc(g.desc)}"></div></div>
   <div class="field" style="margin-top:8px"><label>Nada cerita</label><textarea rows="2" data-c="nada">${esc(g.nada)}</textarea></div>
   <div class="field" style="margin-top:8px"><label>Aturan khusus genre</label><textarea rows="2" data-c="aturan">${esc(g.aturan)}</textarea></div>
   <h3>Istilah</h3><div class="grid3 noterm">${TERM_LABELS.map(([k,l])=>`<div class="field"><label>${l} disebut</label><input data-ci="${k}" value="${esc(g.istilah[k])}"></div>`).join('')}</div>
   <h3>Kejadian acak d100 (persen)</h3><div class="row noterm"><div class="field"><label>Buruk %</label><input type="number" data-ck="buruk" value="${esc(g.kejadian.buruk)}" style="width:90px"></div><div class="field"><label>Tenang %</label><input type="number" data-ck="tenang" value="${esc(g.kejadian.tenang)}" style="width:90px"></div><div class="field"><label>Baik % (otomatis)</label><input disabled value="${100-num(g.kejadian.buruk)-num(g.kejadian.tenang)}" style="width:90px"></div></div>${evInfo(g)}
   <p class="small">Genre Custom memakai tabel sifat umum dan 4 kelas generik.</p>${traitInfo()}${classInfo()}
   <h3>Build khusus genre (wajib diisi setiap pemain)</h3>
   ${g.build.map((b,i)=>`<div class="row" style="margin-bottom:6px"><input class="s" data-cb="${i}" data-k="nama" value="${esc(b.nama)}" placeholder="nama kolom, mis. Kekuatan gaib" style="flex:1"><input class="s" data-cb="${i}" data-k="ket" value="${esc(b.ket||'')}" placeholder="keterangan (opsional)" style="flex:1"><button class="dbtn red" data-cbdel="${i}">Hapus</button></div>`).join('')||'<p class="small">Belum ada kolom tambahan.</p>'}
   <div class="actions"><button class="dbtn" id="cbAdd">+ Kolom build</button></div>
   <h3>Yang harus dibuild setiap pemain</h3><ol class="rules small">${CORE_BUILD.map(x=>`<li>${esc(x)}</li>`).join('')}${g.build.filter(b=>b.nama).map(b=>`<li><b>${esc(b.nama)}</b>${b.ket?` — ${esc(b.ket)}`:''}</li>`).join('')}</ol></div>`;
  $('cbAdd').onclick=()=>{g.build.push({id:'c'+Date.now().toString(36),nama:'',ket:''});save();renderHeroes()};
}
$('genreRules').addEventListener('input',e=>{if(R.genre!=='custom')return;const t=e.target,g=CUST();
  if(t.dataset.c){g[t.dataset.c]=t.value;if(t.dataset.c==='nama')updateChrome()}
  if(t.dataset.ci){g.istilah[t.dataset.ci]=t.value}
  if(t.dataset.cb!==undefined){g.build[+t.dataset.cb][t.dataset.k]=t.value}
  if(t.dataset.ck){g.kejadian[t.dataset.ck]=num(t.value,0);g.kejadian.baik=100-num(g.kejadian.buruk)-num(g.kejadian.tenang)}save()});
$('genreRules').addEventListener('change',e=>{if(R.genre==='custom'&&(e.target.dataset.cb!==undefined||e.target.dataset.ci||e.target.dataset.ck)){setTimeout(()=>{renderHeroes();applyTerms(document.body)},180)}});
$('genreRules').addEventListener('click',e=>{const b=e.target.closest('[data-cbdel]');if(!b)return;CUST().build.splice(+b.dataset.cbdel,1);save();renderHeroes()});
function classInfo(){const t=classTable(R.genre);return `<details class="gm" open><summary>Kelas &amp; skill proficient genre ini</summary><div class="scroll"><table class="grid noterm" style="font-size:13px"><tr><th>#</th><th>Kelas</th><th>4 skill proficient</th></tr>${t.map((c,i)=>`<tr><td>${i+1}</td><td><b>${esc(c.nama)}</b></td><td>${c.skills.map(n=>`${esc(n)} <span class="small">(${skAbil(n)})</span>`).join(', ')}</td></tr>`).join('')}</table></div><p class="small">Pemain menulis nama kelas atau angka 1–4 di formulir. Kalau tidak cocok, sistem tetap memberi 4 skill berdasarkan urutan dan menandainya untuk dicek GM.</p></details>`}
function traitInfo(){const t=traitTable(R.genre);return `<details class="gm"><summary>Tabel sifat d20 genre ini</summary><div class="scroll"><table class="grid noterm" style="font-size:13px"><tr><th>d20</th><th>Sifat baik</th><th>Sifat buruk</th></tr>${t.baik.map((b,i)=>`<tr><td>${i+1}</td><td>${esc(b)}</td><td>${esc(t.buruk[i])}</td></tr>`).join('')}</table></div></details>`}
function evInfo(g){const bs=bands(g.kejadian);const k=g.kejadian||{};return `<h3>Kejadian acak d100</h3><p class="small">${num(k.buruk)}% buruk · ${num(k.tenang)}% tenang · ${100-num(k.buruk)-num(k.tenang)}% baik. Dilempar saat GM mau.</p>
  <table class="grid noterm" style="font-size:13px">${bs.map(b=>`<tr><td>${pad2(b.a)}${b.z!==b.a?'–'+pad2(b.z):''}</td><td>${EV_TYPES[b.j]}</td></tr>`).join('')}</table>`}
function renderBuildStatus(){const n=W.heroes.length,ok=W.heroes.filter(h=>!heroWarn(h).length).length;
  $('buildStatus').innerHTML=n?`<div class="${ok===n?'ok':'hint'}"><b>Status build:</b> ${ok} dari ${n} pahlawan sudah lengkap sesuai aturan genre ${esc(G().nama)}.${ok<n?' Buka kartu yang bertanda "Belum lengkap".':' Siap membuat cerita di tab 2.'}</div>`:''}

/* ======================= BUILD DADU ======================= */
function rollBuild(h){const d4=1+Math.floor(Math.random()*4),db=1+Math.floor(Math.random()*20),dr=1+Math.floor(Math.random()*20);const t=traitTable(R.genre);
  h.bonus=String(d4+1);h.build={d4,at:new Date().toISOString()};h.sifat={baik:t.baik[db-1],buruk:t.buruk[dr-1],db,dr};
  rollAbility(h);assignSkillsFromClass(h,R.genre)}
/* Modul A: 6 ability dari kumpulan tetap [+3,+2,+1,0,0,-1], hanya urutannya yang diacak (Fisher–Yates) */
function rollAbility(h){const a=[...ABILITY_ARRAY];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  h.ability={};ABILS.forEach((k,i)=>h.ability[k]=a[i]);h.abilityRoll={at:new Date().toISOString()}}
/* Modul G: skill proficient otomatis dari kelas */
function matchClass(h,genre){const table=classTable(genre);const raw=String(h.kelas||'').trim();const teks=normL(raw);
  const n=parseInt(raw,10);if(/^\d+$/.test(raw)&&n>=1&&n<=table.length)return{m:table[n-1],cara:'nomor'};
  let m=teks?table.find(c=>teks.includes(normL(c.nama))||normL(c.nama).includes(teks)&&teks.length>3):null;if(m)return{m,cara:'nama'};
  const low=raw.toLowerCase();m=low?table.find(c=>c.kata.some(k=>low.includes(k))):null;if(m)return{m,cara:'kata'};
  const idx=Math.max(0,W.heroes.indexOf(h));return{m:table[idx%table.length],cara:'urutan'}}
function assignSkillsFromClass(h,genre){const {m,cara}=matchClass(h,genre);
  if(cara==='nomor')h.kelas=m.nama;
  h.skills=m.skills.map(n=>({nama:n,abil:skAbil(n),prof:true}));h._kelasCocok=m.nama;
  if(cara==='urutan')h._skillBelumDikurasi=true;else delete h._skillBelumDikurasi}
const profB=()=>num(W&&W.sys?W.sys.profBonus:2,2);
const isProf=(h,n)=>!!(h.skills||[]).find(s=>s.nama===n&&s.prof);
const abMod=(h,a)=>num((h.ability||{})[a],0);
function skillMod(h,n){return abMod(h,skAbil(n))+(isProf(h,n)?profB():0)}
const passiveOf=(h,n='Perception')=>10+skillMod(h,n);
/** Pertahanan (AC): 1 d20 yang dikocok pemain di awal, dimasukkan GM sekali, lalu TERKUNCI (pakem). null bila belum. */
const acOf=h=>h?nilaiPertahanan(h.pertahanan):null;


/* ======================= FORMULIR WA ======================= */
const FORM_HEAD='FORMULIR KARAKTER';
function waForm(){const g=G();const L=[];const pk=Object.keys(POOLS);
  L.push(`*${FORM_HEAD} — ${g.nama.toUpperCase()}*`);L.push('_Isi setelah tanda titik dua (:), lalu kirim balik ke Pencerita. Jangan ubah tulisan sebelum titik dua._');L.push('');
  L.push('Nama: ');L.push('Kelas / Peran (pilih angka 1-4 atau tulis nama kelas): ');classTable(R.genre).forEach((c,i)=>L.push(`   ${i+1} = ${c.nama} (${c.skills.join(', ')})`));L.push('Senjata & ciri khas: ');
  L.push('Dadu kelas (pilih angka 1-4): ');pk.forEach((k,i)=>L.push(`   ${i+1} = ${dStr(POOLS[k])} (${POOL_DESC[k]})`));
  L.push('Pertahanan (kocok 1 d20 SEKALI, tulis hasilnya 1-20): ');
  L.push('Kemampuan dasar: ');
  (g.build||[]).filter(b=>b.nama).forEach(b=>L.push(`${b.nama}${b.ket?` (${b.ket})`:''}: `));
  L.push('');L.push('*Skill Khusus (dipakai 3x per cerita)*');L.push('Skill Khusus - nama: ');L.push('Skill Khusus - efek: ');
  L.push('Skill Khusus - jenis efek (pilih angka 1-7): ');SK_TYPES.forEach(([v,l],i)=>L.push(`   ${i+1} = ${l}`));
  L.push('Skill Khusus - nilai X (hanya untuk jenis 1, 2, 5): ');
  L.push('');L.push(`*Skill Pengorbanan (bayar 1 ${T('nyawa')})*`);L.push('Skill Pengorbanan - nama: ');
  L.push('Skill Pengorbanan - pola (pilih angka 1-3): ');SP_TYPES.forEach(([v,l],i)=>L.push(`   ${i+1} = ${l.replace(/:/g,' -')}`));
  L.push('Skill Pengorbanan - efek: ');
  L.push('');L.push('Kepribadian: ');L.push('Password kartu (opsional, minimal 8 karakter, hanya jika tidak memakai portal pemain): ');
  L.push('');L.push('_Bonus dadu (d4 + 1), sifat (d20), 6 ability, dan skill kelas akan diisi oleh Pencerita. Tidak perlu diisi._');
  return L.join('\n').replace(/Nyawa/g,T('nyawa'))}
function formKeys(){const m=[['nama','nama'],['kelasperan','kelas'],['senjatacirikhas','senjata'],['senjata','senjata'],['dadukelas','dadu'],['pertahanan','pertahanan'],['kemampuandasar','dasar'],
  ['skillkhususnama','sk.nama'],['skillkhususefek','sk.efek'],['skillkhususjenisefek','sk.tipe'],['skillkhususnilaix','sk.nilai'],
  ['skillpengorbanannama','sp.nama'],['skillpengorbananpola','sp.pola'],['skillpengorbananefek','sp.efek'],['kepribadian','kep'],['passwordkartu','pw'],['password','pw']];
  (G().build||[]).filter(b=>b.nama).forEach(b=>m.push([normL(b.nama),'gf.'+b.id]));return m}
function parseForms(text){const clean=text.replace(/\r/g,'').replace(/[*_~`]/g,'');
  const parts=clean.split(new RegExp(FORM_HEAD,'i')).slice(1);const blocks=parts.length?parts:[clean];const keys=formKeys();
  return blocks.map(b=>{const out={};let last=null;
    b.split('\n').forEach(line=>{if(!line.trim()){last=null;return}if(/^\s*\d+\s*=/.test(line))return;const ci=line.indexOf(':');
      if(ci>0){const lab=normL(line.slice(0,ci));const val=line.slice(ci+1).trim();
        let k=keys.find(([n])=>lab===n)||keys.find(([n])=>n.length>3&&lab.startsWith(n));
        if(k){out[k[1]]=val;last=k[1];return}}
      const t=line.trim();if(last&&t&&!/^[-—]/.test(t)&&ci<0&&out[last]!==undefined){out[last]=(out[last]?out[last]+' ':'')+t}});
    return out}).filter(o=>o.nama)}
function applyForm(o){const warn=[];const id=slug(o.nama);let h=W.heroes.find(x=>x.id===id);const isNew=!h;if(!h){h=newHero();W.heroes.push(h)}
  const set=(path,v)=>{if(v===undefined)return;const p=path.split('.');let t=h;for(let i=0;i<p.length-1;i++){t[p[i]]=t[p[i]]||{};t=t[p[i]]}t[p[p.length-1]]=v};
  ['nama','kelas','senjata','dasar','sk.nama','sk.efek','sp.nama','sp.efek','kep','pw'].forEach(k=>set(k,o[k]));
  Object.keys(o).filter(k=>k.startsWith('gf.')).forEach(k=>set(k,o[k]));
  h.id=slug(h.nama);h._idManual=false;
  if(o.dadu!==undefined){const pk=Object.keys(POOLS);const n=parseInt(o.dadu,10);let d=null;if(n>=1&&n<=pk.length)d=pk[n-1];else{const t=o.dadu.toLowerCase().replace(/\s+/g,'');d=pk.find(k=>k===t)||null}
    if(d)h.dadu=d;else warn.push(`dadu kelas "${o.dadu}" tidak dikenali`)}
  if(o.pertahanan!==undefined&&o.pertahanan!==''){const v=parseInt(o.pertahanan,10);
    if(acOf(h)){if(v!==acOf(h))warn.push(`Pertahanan sudah terkunci di ${acOf(h)}, angka ${o.pertahanan} diabaikan`)}
    else if(v>=1&&v<=20)h.pertahanan={nilai:v,at:Date.now()};else warn.push(`Pertahanan "${o.pertahanan}" harus hasil d20 (1–20)`)}
  if(o['sk.tipe']!==undefined){const n=parseInt(o['sk.tipe'],10);if(n>=1&&n<=SK_TYPES.length)h.sk.tipe=SK_TYPES[n-1][0];else if(o['sk.tipe'])warn.push('jenis efek Skill Khusus tidak dikenali')}
  if(o['sk.nilai']!==undefined&&o['sk.nilai']!=='')h.sk.nilai=String(parseInt(o['sk.nilai'],10)||'');
  if(o['sp.pola']!==undefined){const n=parseInt(o['sp.pola'],10);if(n>=1&&n<=SP_TYPES.length)h.sp.pola=SP_TYPES[n-1][0];else if(o['sp.pola'])warn.push('pola Skill Pengorbanan tidak dikenali')}
  if(o.kelas!==undefined){assignSkillsFromClass(h,R.genre);if(h._skillBelumDikurasi)warn.push(`kelas "${o.kelas}" tidak cocok dengan kelas genre ini, skill diisi dari urutan (cek ulang)`)}
  if(h.pw&&h.pw.length<8)warn.push('password kurang dari 8 karakter (hanya untuk link kartu tanpa akun)');
  
  return{h,isNew,warn}}
$('copyForm').onclick=async()=>{const t=waForm();let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){}
  if(ok)$('formMsg').textContent='Tersalin! Tempel di WhatsApp.';else modal(`<h2>Formulir WA</h2><p class="small">Salin manual: klik kotak, Ctrl+A lalu Ctrl+C.</p><div class="field"><textarea rows="16" readonly>${esc(t)}</textarea></div><div class="actions"><button class="btn" onclick="closeModal()">Tutup</button></div>`)};
$('waParse').onclick=()=>{const t=$('waIn').value;if(!t.trim())return alert('Tempel balasan formulir dulu.');const forms=parseForms(t);
  if(!forms.length){$('waMsg').innerHTML='<div class="warn">Tidak menemukan formulir yang berisi nama. Pastikan baris "Nama:" terisi.</div>';return}
  const upd=forms.map(o=>slug(o.nama)).filter(id=>W.heroes.find(h=>h.id===id));
  if(upd.length&&!confirm(`Sudah ada: ${upd.join(', ')}. Data mereka akan diperbarui dari formulir. Lanjut?`))return;
  const res=forms.map(applyForm);const roll=$('waRoll').checked;
  res.forEach(r=>{if(roll&&!r.h.build)rollBuild(r.h);else if(roll&&!r.h.ability)rollAbility(r.h)});W.heroes.forEach(x=>x._open=false);save();renderHeroes();
  $('waMsg').innerHTML=`<div class="ok">${res.length} formulir terbaca: ${res.map(r=>`<b>${esc(r.h.nama)}</b> (${r.isNew?'baru':'diperbarui'}${r.h.build?`, bonus +${esc(r.h.bonus)}, ${esc(r.h.sifat.baik)} / ${esc(r.h.sifat.buruk)}`:''})`).join(', ')}</div>`+
   (res.some(r=>r.warn.length||heroWarn(r.h).length)?`<div class="warn">${res.filter(r=>r.warn.length||heroWarn(r.h).length).map(r=>`<b>${esc(r.h.nama)}:</b> ${esc([...r.warn,...heroWarn(r.h).map(x=>x+' belum ada')].join(', '))}`).join('<br>')}</div>`:'');
  $('waIn').value=''};
function siteBase(){let u=(R.siteUrl||'').trim();if(!u&&/^https?:/.test(location.protocol))u=location.origin+location.pathname;if(!u)return '';if(!/^https?:\/\//.test(u))u='https://'+u;return u.replace(/#.*$/,'')}
$('siteUrl').addEventListener('input',e=>{R.siteUrl=e.target.value;save();siteHintR()});
function siteHintR(){const b=siteBase();$('siteHint').innerHTML=b?`Link kartu akan memakai alamat: <b>${esc(b)}</b>`:'Isi alamat situs Vercel-mu setelah deploy. Tanpa alamat ini, link kartu tidak bisa dibuat saat file dibuka dari komputer.'}

/* ======================= FOTO (IndexedDB) ======================= */
const IDB={db:null,open(){return new Promise((res,rej)=>{if(this.db)return res(this.db);const r=indexedDB.open('meja-pencerita',1);r.onupgradeneeded=()=>r.result.createObjectStore('foto');r.onsuccess=()=>{this.db=r.result;res(this.db)};r.onerror=()=>rej(r.error)})},
  async tx(mode,fn){try{const db=await this.open();return await new Promise((res)=>{const st=db.transaction('foto',mode).objectStore('foto');const q=fn(st);q.onsuccess=()=>res(q.result);q.onerror=()=>res(null)})}catch(e){return null}},
  get(k){return this.tx('readonly',s=>s.get(k))},set(k,v){return this.tx('readwrite',s=>s.put(v,k))},del(k){return this.tx('readwrite',s=>s.delete(k))},
  async all(){const ks=await this.tx('readonly',s=>s.getAllKeys())||[];const vs=await this.tx('readonly',s=>s.getAll())||[];const o={};ks.forEach((k,i)=>o[k]=vs[i]);return o}};
const photoKey=h=>`${R.genre}|${h.uid}`;
async function resizePhoto(file){const url=URL.createObjectURL(file);try{const img=await loadImg(url);const mx=1400,sc=Math.min(1,mx/Math.max(img.width,img.height));
  const c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/jpeg',.85)}finally{URL.revokeObjectURL(url)}}

/* ======================= KARTU (1080 × 1920) ======================= */
function cardData(h){const g=G();const ab=h.ability?ABILS.map(a=>abMod(h,a)):null;
  return {v:2,g:R.genre,gn:g.nama,acc:ACCENT[R.genre]||'#d9a441',tn:T('nyawa'),tp:T('pahlawan'),
  nama:h.nama,kelas:h.kelas,senjata:h.senjata,dadu:POOLS[h.dadu]?dStr(POOLS[h.dadu]):'',bonus:h.bonus,nyawa:num(h.nyawa,3),dasar:h.dasar,
  sk:{n:h.sk.nama,e:h.sk.efek},sp:{n:h.sp.nama,b:num(h.sp.biaya,1),e:h.sp.efek},sf:h.sifat?[h.sifat.baik,h.sifat.buruk]:null,
  gf:(g.build||[]).filter(b=>b.nama).map(b=>[b.nama,(h.gf||{})[b.id]||'']).filter(x=>String(x[1]).trim()),kep:h.kep,
  ab,pb:profB(),pp:ab?passiveOf(h):null,kc:h._kelasCocok||'',
  sks:ab?SKILLS.map(sk=>[sk.n,sk.a,skillMod(h,sk.n),isProf(h,sk.n)?1:0]):null,fp:h.fotoPos||null,ac:acOf(h)}}
/* ---------- Atur posisi foto di kartu ---------- */
async function aturFoto(h){const photo=await IDB.get(photoKey(h));if(!photo){toast('Pilih foto dulu.',true);return}
  const fp=Object.assign({},FOTO_AWAL,h.fotoPos||{});const lama=JSON.stringify(h.fotoPos||null);
  modal(`<h2>Atur foto ${esc(h.nama||'')}</h2><p class="small">Geser foto langsung di pratinjau, atau pakai pengatur di bawah. Pilih <b>Tampilkan utuh</b> bila kepala/badan masih terpotong.</p>
    <div class="fp-wrap"><div class="fp-prev" id="fpPrev"><canvas id="fpCv" width="540" height="960" aria-label="Pratinjau kartu"></canvas></div>
    <div class="fp-ctl">
      <div class="seg fp-mode" role="radiogroup" aria-label="Mode foto"><button type="button" class="seg-b" data-fpm="isi">Isi penuh</button><button type="button" class="seg-b" data-fpm="utuh">Tampilkan utuh</button></div>
      <label class="fp-sl">Atas ↕ bawah<input type="range" min="0" max="1" step="0.01" id="fpY"></label>
      <label class="fp-sl">Kiri ↔ kanan<input type="range" min="0" max="1" step="0.01" id="fpX"></label>
      <label class="fp-sl">Perbesar<input type="range" min="1" max="3" step="0.01" id="fpZ"></label>
      <div class="actions"><button class="dbtn" id="fpReset" type="button">Kembalikan awal</button></div>
    </div></div>
    <div class="actions"><button class="dbtn" id="fpBatal" type="button">Batal</button><button class="btn" id="fpSimpan" type="button">Simpan posisi</button></div>`);
  const cv=$('fpCv'),ctx=cv.getContext('2d');let antre=false;const cd0=cardData(h);
  const sync=()=>{$('fpY').value=fp.y;$('fpX').value=fp.x;$('fpZ').value=fp.z;document.querySelectorAll('[data-fpm]').forEach(b=>{b.classList.toggle('on',b.dataset.fpm===fp.m);b.setAttribute('aria-checked',String(b.dataset.fpm===fp.m))})};
  const gambar=()=>{if(antre)return;antre=true;requestAnimationFrame(async()=>{const c=await drawCard(Object.assign({},cd0,{fp}),photo);ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(c,0,0,cv.width,cv.height);antre=false})};
  sync();gambar();
  ['X','Y','Z'].forEach(k=>$('fp'+k).oninput=e=>{fp[k.toLowerCase()]=+e.target.value;gambar()});
  document.querySelectorAll('[data-fpm]').forEach(b=>b.onclick=()=>{fp.m=b.dataset.fpm;sync();gambar()});
  $('fpReset').onclick=()=>{Object.assign(fp,FOTO_AWAL);sync();gambar()};
  // geser dengan jari/mouse di area foto
  let drag=null;cv.style.touchAction='none';
  cv.onpointerdown=e=>{const r=cv.getBoundingClientRect();if((e.clientY-r.top)/r.height>.44)return;drag={x:e.clientX,y:e.clientY,fx:fp.x,fy:fp.y};cv.setPointerCapture(e.pointerId)};
  cv.onpointermove=e=>{if(!drag)return;const r=cv.getBoundingClientRect();fp.x=clamp(drag.fx-(e.clientX-drag.x)/r.width*1.6,0,1);fp.y=clamp(drag.fy-(e.clientY-drag.y)/(r.height*.44)*1.2,0,1);sync();gambar()};
  cv.onpointerup=cv.onpointercancel=()=>{drag=null};
  $('fpBatal').onclick=()=>{h.fotoPos=JSON.parse(lama);closeModal()};
  $('fpSimpan').onclick=()=>{h.fotoPos={m:fp.m,x:+fp.x.toFixed(3),y:+fp.y.toFixed(3),z:+fp.z.toFixed(3)};save();closeModal();toast('Posisi foto disimpan. Kartu di portal pemain ikut berubah.')}}
async function downloadCard(h){if(!h.nama)return alert('Isi nama dulu.');const photo=await IDB.get(photoKey(h));const c=await drawCard(cardData(h),photo);dlCanvas(c,`kartu-${slug(h.nama)||'karakter'}.png`)}

/* ======================= LINK BERPASSWORD ======================= */
const b64u=u8=>{let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')};
const unb64u=str=>{const s=atob(str.replace(/-/g,'+').replace(/_/g,'/'));const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
async function deriveKey(pw,salt){const km=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function zip(u8){if(!window.CompressionStream)return[0,u8];return[1,new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())]}
async function unzip(u8){return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer())}
async function sealCard(obj,pw){const[cf,body]=await zip(new TextEncoder().encode(JSON.stringify(obj)));const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await deriveKey(pw,salt),body));const out=new Uint8Array(29+ct.length);out[0]=cf;out.set(salt,1);out.set(iv,17);out.set(ct,29);return b64u(out)}
async function openCard(str,pw){const d=unb64u(str);const pt=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:d.slice(17,29)},await deriveKey(pw,d.slice(1,17)),d.slice(29)));return JSON.parse(new TextDecoder().decode(d[0]?await unzip(pt):pt))}
async function shareLink(h){if(!h.nama)return alert('Isi nama dulu.');if(!h.pw||h.pw.length<8)return alert('Password kartu minimal 8 karakter. Minta pemain membuat password yang lebih panjang, atau pakai Undang ke portal pemain.');
  const base=siteBase();if(!base)return alert('Isi dulu "Alamat situs untuk link kartu" di panel Formulir WhatsApp (alamat Vercel-mu).');
  if(!window.crypto||!crypto.subtle)return alert('Browser ini tidak mendukung penguncian link. Coba buka lewat alamat https (Vercel).');
  const link=`${base}#k=${await sealCard(cardData(h),h.pw)}`;
  const msg=`Halo *${h.nama}*! 🎲\nIni kartu karaktermu untuk petualangan *${G().nama}*:\n\n${link}\n\nBuka link di atas, lalu masukkan *password yang kamu buat sendiri* di formulir. Di sana kamu juga bisa menambahkan foto dan mengunduh kartumu.`;
  let ok=false;try{await navigator.clipboard.writeText(msg);ok=true}catch(e){}
  modal(`<h2>Link kartu ${esc(h.nama)}</h2><p class="small">${ok?'Pesan sudah tersalin. Tempel di chat WA pemain.':'Salin pesan di bawah secara manual.'} Password tidak ikut dikirim.</p>
   <div class="field"><textarea rows="8" readonly>${esc(msg)}</textarea></div><div class="actions"><a class="dbtn" href="${esc(link)}" target="_blank" rel="noopener">Coba buka link</a><button class="btn" onclick="closeModal()">Tutup</button></div>`)}

/* ======================= VIEWER (halaman pemain) ======================= */
let VCD=null,VPH=null;
async function viewerRender(){const c=await drawCard(VCD,VPH);$('vImg').src=c.toDataURL('image/png');$('vImg')._c=c}
function viewerText(cd){const row=(a,b)=>b?`<tr><td><b>${esc(a)}</b></td><td>${esc(b)}</td></tr>`:'';
  return `<h2>${esc(cd.nama)}</h2><p class="small">${esc(cd.kelas||'')} · ${esc(cd.gn||'')}</p><div class="scroll"><table class="grid">${row('Dadu kelas',cd.dadu)}${row('Bonus',cd.bonus?'+'+cd.bonus:'')}${row(cd.tn||'Nyawa',String(cd.nyawa))}${row('Senjata',cd.senjata)}${row('Kemampuan dasar',cd.dasar)}
   ${row('Skill Khusus (3x per cerita)',[cd.sk.n,cd.sk.e].filter(Boolean).join(' — '))}${row(`Skill Pengorbanan (bayar ${cd.sp.b} ${cd.tn||'Nyawa'})`,[cd.sp.n,cd.sp.e].filter(Boolean).join(' — '))}
   ${cd.sf?row('Sifat baik',cd.sf[0])+row('Sifat buruk',cd.sf[1]):''}${(cd.gf||[]).map(([a,b])=>row(a,b)).join('')}${row('Kepribadian',cd.kep)}</table></div>
   ${cd.ab&&cd.sks?`<h3>Ability</h3><div class="scroll"><table class="grid"><tr>${ABILS.map(a=>`<th style="text-align:center">${a}</th>`).join('')}</tr><tr>${cd.ab.map(v=>`<td style="text-align:center;font-weight:700;font-size:18px">${fmtMod(num(v))}</td>`).join('')}</tr></table></div>
   <h3>Skill <span class="small">(Proficiency +${esc(cd.pb)} · Perception pasif ${esc(cd.pp)})</span></h3><div class="scroll"><table class="grid"><tr><th>Skill</th><th>Ability</th><th style="text-align:right">Mod</th></tr>${cd.sks.map(([n,a,m,p])=>`<tr${p?' style="font-weight:700"':''}><td>${p?'● ':'○ '}${esc(n)}</td><td>${esc(a)}</td><td style="text-align:right">${fmtMod(num(m))}</td></tr>`).join('')}</table></div><p class="small">● = proficient dari kelas${cd.kc?` ${esc(cd.kc)}`:''}. Skill check = d20 + Mod.</p>`:''}`}
function startViewer(){document.body.classList.add('viewer-mode');const data=location.hash.slice(3);
  const go=async()=>{const pw=$('vPw').value;if(!pw)return;$('vMsg').innerHTML='<p class="small">Membuka...</p>';
    try{VCD=await openCard(data,pw);$('vLock').style.display='none';$('vCard').style.display='';document.title=`Kartu ${VCD.nama}`;await viewerRender();$('vText').innerHTML=viewerText(VCD)}
    catch(e){$('vMsg').innerHTML='<div class="warn">Password salah, atau link tidak lengkap. Pastikan link disalin utuh.</div>'}};
  $('vOpen').onclick=go;$('vPw').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  $('vPhoto').onchange=async e=>{const f=e.target.files[0];if(!f)return;VPH=await resizePhoto(f);await viewerRender()};
  $('vDl').onclick=()=>{if($('vImg')._c)dlCanvas($('vImg')._c,`kartu-${slug(VCD.nama)||'karakter'}.png`)};
  if(!window.crypto||!crypto.subtle){$('vMsg').innerHTML='<div class="warn">Browser ini tidak bisa membuka kartu terkunci. Coba Chrome terbaru.</div>'}
}

/* ======================= 2. SYSTEM + PROMPT ======================= */
function renderSys(){if(!W)return;const s=W.sys;s.bos=Object.assign({nama:'',tingkat:'',tambahan:''},s.bos||{});
  $('sJudul').value=s.judul;$('sAdegan').value=s.adegan;$('sRamuan').value=s.ramuan;$('sSbMax').value=s.sbMax;$('sSbBos').value=s.sbBos;
  $('sProf').value=num(s.profBonus,2);$('sPlot').value=s.plot;$('sBosNama').value=s.bos.nama;$('sBosTier').value=s.bos.tingkat||'';$('sBosAdd').value=s.bos.tambahan;
  $('endList').innerHTML=s.ending.map((t,i)=>`<div class="row" style="margin-bottom:6px"><input class="s" data-en="${i}" data-k="nama" value="${esc(t.nama)}" style="flex:1" aria-label="Nama ending"><span class="small">Stack ≤</span><input class="s" type="number" data-en="${i}" data-k="maks" value="${esc(t.maks)}" style="width:80px" aria-label="Batas stack"><button class="dbtn red" data-endel="${i}">Hapus</button></div>`).join('');
  const valid=W.heroes.filter(h=>h.id);
  W.sys.gugur=W.sys.gugur||[];$('sGugurNote').value=W.sys.gugurNote||'';
  $('gugurList').innerHTML=valid.length?valid.map(h=>`<label class="chk"><input type="checkbox" data-gugur="${esc(h.id)}" ${W.sys.gugur.includes(h.id)?'checked':''}> ${esc(h.nama)}</label>`).join(''):'<span class="small">Belum ada pahlawan.</span>';
  $('ikutList').innerHTML=valid.length?valid.map(h=>`<label class="chk"><input type="checkbox" data-ikut="${esc(h.id)}" ${s.ikut.includes(h.id)?'checked':''}> ${esc(h.nama)}</label>`).join(''):'<span class="small">Belum ada pahlawan. Isi dulu di tab 1.</span>';
  $('tierTbl').innerHTML='<tr><th>Tingkat</th><th>Dadu GM</th><th>Hasil</th><th>Rata-rata</th></tr>'+TIERS.map(t=>`<tr><td><b>${t.n}</b></td><td>${dStr(t.d)}</td><td>${t.d.length}–${sum(t.d)}</td><td>${(sum(t.d)+t.d.length)/2}</td></tr>`).join('')+
    BOSS_TIERS.map(t=>`<tr><td><b>${t.n}</b></td><td>${dStr(t.d)} <i>untuk setiap pahlawan</i></td><td colspan="2">rata-rata ${(sum(t.d)+t.d.length)/2} per pahlawan</td></tr>`).join('');
  renderChance();renderDC();
}
function renderDC(){const pb=num(W.sys.profBonus,2);const col=p=>`<td style="color:${p<.25||p>.9?'var(--wax)':'var(--moss)'};font-weight:700">${Math.round(p*100)}%</td>`;
  $('dcTbl').innerHTML=`<tr><th>Tingkat</th><th>DC</th>${[0,1,2,3].map(a=>`<th>ability ${fmtMod(a)} + prof ${pb}</th>`).join('')}<th>tanpa prof, ability +0</th></tr>`+
    TIERS.map(t=>`<tr><td>${t.n}</td><td><b>${DC_TABLE[t.k]}</b></td>${[0,1,2,3].map(a=>col(pD20(a+pb,DC_TABLE[t.k]))).join('')}${col(pD20(0,DC_TABLE[t.k]))}</tr>`).join('')}
function syncSys(){const s=W.sys;s.judul=$('sJudul').value;s.adegan=$('sAdegan').value;s.ramuan=num($('sRamuan').value,0);s.sbMax=num($('sSbMax').value,10);s.sbBos=num($('sSbBos').value,2);s.profBonus=num($('sProf').value,2);
  s.plot=$('sPlot').value;s.bos={nama:$('sBosNama').value,tingkat:$('sBosTier').value,tambahan:$('sBosAdd').value};save();renderChance();renderDC()}
['sJudul','sAdegan','sRamuan','sSbMax','sSbBos','sProf','sPlot','sBosNama','sBosAdd'].forEach(id=>$(id).addEventListener('input',syncSys));
$('sBosTier').addEventListener('change',syncSys);
$('p-prompt').addEventListener('input',e=>{const t=e.target;
  if(t.dataset.en!==undefined){W.sys.ending[+t.dataset.en][t.dataset.k]=t.dataset.k==='maks'?num(t.value):t.value;save()}});
$('sGugurNote').addEventListener('input',e=>{W.sys.gugurNote=e.target.value;save()});
$('p-prompt').addEventListener('change',e=>{const t=e.target;if(t.dataset.gugur!==undefined){const id=t.dataset.gugur;W.sys.gugur=(W.sys.gugur||[]).filter(x=>x!==id);if(t.checked)W.sys.gugur.push(id);save();return}if(t.dataset.ikut!==undefined){const id=t.dataset.ikut;W.sys.ikut=W.sys.ikut.filter(x=>x!==id);if(t.checked)W.sys.ikut.push(id);save();renderChance()}});
$('p-prompt').addEventListener('click',e=>{const t=e.target;
  if(t.dataset.endel!==undefined){W.sys.ending.splice(+t.dataset.endel,1);save();renderSys()}});
$('addEnd').onclick=()=>{W.sys.ending.push({nama:'',maks:''});save();renderSys()};

function renderChance(){const s=W.sys;const hs=W.heroes.filter(h=>s.ikut.includes(h.id)&&h.bonus!==''&&POOLS[h.dadu]);
  const avg=hs.length?hs.reduce((a,h)=>a+num(h.bonus),0)/hs.length:0;
  const col=p=>`<td style="color:${p<.25||p>.9?'var(--wax)':'var(--moss)'};font-weight:700">${Math.round(p*100)}%</td>`;
  const pools=Object.keys(POOLS);
  $('chanceTbl').innerHTML=`<tr><th>Tingkat (bonus +${avg.toFixed(1)})</th>${pools.map(p=>`<th>${dStr(POOLS[p])}</th>`).join('')}</tr>`+
    TIERS.map(t=>`<tr><td>${t.n}</td>${pools.map(p=>col(pSuccess(POOLS[p],Math.round(avg),t.d))).join('')}</tr>`).join('');
  if(!hs.length){$('bossChanceTbl').innerHTML='<tr><td class="small">Pilih pahlawan yang ikut (dengan dadu kelas dan bonus terisi) untuk melihat peluang melawan bos.</td></tr>';return}
  let team={0:1};hs.forEach(h=>{team=conv(team,shiftDist(distOf(POOLS[h.dadu]),num(h.bonus)))});
  $('bossChanceTbl').innerHTML=`<tr><th>Tingkat bos (${hs.length} pahlawan, Stack 0)</th><th>Menang</th><th>Menang atau Menang Tipis</th></tr>`+BOSS_TIERS.map(t=>{let boss={0:1};for(let i=0;i<hs.length;i++)boss=conv(boss,distOf(t.d));
    let w=0,wt=0;for(const a in team)for(const b in boss){const p=team[a]*boss[b];if(+a>=+b)w+=p;if(+a>=+b-6)wt+=p}
    return `<tr><td>${t.n} <span class="small">(${dStr(t.d)} ×${hs.length})</span></td>${col(w)}${col(wt)}</tr>`}).join('');
}

function heroTable(hs){
  const gb=(G().build||[]).filter(b=>b.nama);
  const rows=[[...['ID','Nama','Kelas/Peran','Senjata'],...gb.map(b=>b.nama),'Dadu Kelas','Bonus Dadu Dasar','Sifat Baik','Sifat Buruk','Nyawa Maks','Kemampuan Dasar','Skill Khusus — Nama','Skill Khusus — Efek','Skill Khusus — Batas Pakai','Skill Pengorbanan — Nama','Skill Pengorbanan — Biaya','Skill Pengorbanan — Efek','Ability','Skill Proficient (mod total)','Perception Pasif','Pertahanan (AC)','Catatan Kepribadian']];
  hs.forEach(h=>{const skt=SK_TYPES.find(x=>x[0]===h.sk.tipe);const spt=SP_TYPES.find(x=>x[0]===h.sp.pola);
    rows.push([h.id,h.nama,h.kelas,h.senjata,...gb.map(b=>(h.gf||{})[b.id]||''),POOLS[h.dadu]?dStr(POOLS[h.dadu]):'d20','+'+h.bonus,h.sifat?h.sifat.baik:'',h.sifat?h.sifat.buruk:'',h.nyawa,h.dasar,h.sk.nama,`${h.sk.efek}${skt?` [mekanik: ${skt[1].replace('X',h.sk.nilai||'X')}]`:''}`,'3x per cerita',h.sp.nama,`${h.sp.biaya||1} Nyawa (diri sendiri)`,`${h.sp.efek}${spt?` [pola: ${spt[1]}]`:''}`,h.ability?ABILS.map(a=>`${a} ${fmtMod(abMod(h,a))}`).join(', '):'(belum ada)',h.ability?(h.skills||[]).filter(x=>x.prof).map(x=>`${x.nama} ${fmtMod(skillMod(h,x.nama))}`).join(', '):'',h.ability?passiveOf(h):'',acOf(h)?`${acOf(h)} (d20, terkunci)`:'(belum dikocok)',h.kep])});
  const c=v=>String(v??'').replace(/\|/g,'/').replace(/\n/g,' ');
  return rows.map((r,i)=>'| '+r.map(c).join(' | ')+' |'+(i===0?'\n|'+r.map(()=>'---').join('|')+'|':'')).join('\n');
}
const FORMAT_ADEGAN=`### Adegan N — [Judul Adegan]

**Latar (untuk GM):** Tempat: [lokasi spesifik] · Waktu: [dini hari / pagi / siang / sore / senja / malam / tengah malam] · Cuaca: [...] · Suasana: [nada emosi, suara, bau, cahaya]

**Ringkas (untuk GM):** 1 kalimat apa yang terjadi di adegan ini

**Narasi:** (2-5 paragraf, jangan spoiler opsi ke pemain, selaras dengan latar di atas)

**Quest terdeteksi:** Ya/Tidak
  - Jika Ya: [nama quest] — [tujuan singkat] — [reward jika selesai]

**Jenis Tantangan:** Solo / Kelompok / Serangan Bos / Duel / Pilihan-tanpa-dadu / Skill Check / Kontes / Skill Bantuan

**Parameter Dadu (jika ada tantangan):**
  - Pemain: Dadu Kelas + bonus karakter (+ bonus item/dukungan bila relevan)
  - Tingkat Kesulitan: [Sangat Mudah / Mudah / Sedang / Sulit / Sangat Sulit / Mustahil] — GM melempar dadu tingkat itu
  - Untuk bos: [Bos Lemah / Bos Kuat / Raja Bos] (+ nilai tambahan bila ada)
  - Kritis: semua dadu pemain angka maksimal. Gagal Total: semua dadu pemain angka 1.

**Opsi Pilihan:**
  - A. [aksi] (tingkat) → jika berhasil: [efek] / jika gagal: [efek]
  - B. [aksi] → ...
  - C. [aksi] → ...
  - (opsional) D. Gunakan Skill Khusus [nama] milik [karakter] → efek otomatis, KURANGI 1 dari sisa pakai (3x)
  - (opsional) E. Gunakan Skill Pengorbanan [nama] milik [karakter] → bayar [biaya], efek: [...]

**Kejadian Acak (d100):** tabel kejadian dengan rentang yang ditentukan, isi sesuai adegan & genre

**Reward jika sukses:** item / Ramuan / info / bonus adegan berikut

**Akibat jika gagal:** −Nyawa dan/atau +Stack Bayangan (tabel gap bos: menang=0 luka, menang tipis=−1 Nyawa semua yang ikut, kalah=−1 Nyawa + Stack Bayangan +1)

**Percabangan:** hasil di adegan ini menentukan Adegan N+1 mana yang dibuka (boleh linear)

**Takdir (jika ada):** [nama pahlawan] gugur di adegan ini — bagaimana kematiannya diceritakan

**Catatan GM (opsional):** dialog kunci, atau syarat tersembunyi`;

const JSON_SPEC=`{
  "judul": "Judul cerita",
  "ringkasan": {
    "sinopsis": "2-4 paragraf alur keseluruhan dari awal sampai akhir, TERMASUK twist (khusus GM)",
    "twist": "Rahasia besar cerita yang tidak boleh dibocorkan ke pemain",
    "tokoh": [ { "nama": "Nama NPC", "peran": "sekutu / musuh / netral", "catatan": "sifat, motif, rahasia" } ]
  },
  "adegan": [
    {
      "no": 1,
      "judul": "Judul adegan",
      "ringkas": "1 kalimat apa yang terjadi di adegan ini",
      "latar": { "tempat": "Lokasi spesifik", "waktu": "malam", "cuaca": "hujan rintik", "suasana": "tegang, sunyi, bau dupa" },
      "mati": [],
      "narasi": "Paragraf 1\\n\\nParagraf 2",
      "pasif": { "skill": "Perception", "dc": 14, "info": "Petunjuk yang hanya dibacakan GM bila Perception pasif pahlawan >= dc (opsional)" },
      "hasil_wajib": null,
      "quest": { "ada": true, "nama": "Nama quest", "tujuan": "Tujuan singkat", "reward": "Reward" },
      "catatan_gm": "Dialog kunci / syarat tersembunyi",
      "kejadian": [
        { "dari": 1, "sampai": 10, "jenis": "bencana", "teks": "Narasi kejadian", "efek": { "nyawa_acak": -1 } }
      ],
      "opsi": [
        {
          "kode": "A",
          "aksi": "Deskripsi aksi",
          "jenis": "solo | kelompok | bos | duel | tanpa_dadu | skill_khusus | pengorbanan | skill_cek | kontes | skill_bantuan",
          "pelaku": ["id_pahlawan"],
          "tingkat": "Sedang",
          "bos": { "nama": "Nama bos", "tingkat": "Bos Kuat", "tambahan": 0 },
          "lawan": { "nama": "Nama lawan duel", "tingkat": "Sulit", "bonus": 0 },
          "berhasil": "Narasi jika berhasil",
          "gagal": "Narasi jika gagal",
          "efek_berhasil": { "stack": 0, "ramuan": 0, "nyawa_semua": 0, "item": "", "quest_selesai": "" },
          "efek_gagal": { "stack": 1, "nyawa": "gagal | semua | pelaku | tidak", "mati": [] },
          "lanjut_berhasil": 2,
          "lanjut_gagal": 2
        },
        {
          "kode": "B",
          "aksi": "Membaca gerak-gerik pedagang (contoh skill_cek, opsional)",
          "jenis": "skill_cek",
          "pelaku": ["id_pahlawan"],
          "skill_check": { "skill": "Insight", "dc": 15, "advantage": null, "passive": false },
          "berhasil_bersih": "Narasi berhasil telak",
          "berhasil_komplikasi": "Narasi berhasil tetapi ada harga kecil",
          "gagal": "Narasi gagal",
          "gagal_total": "Narasi gagal berat",
          "efek_berhasil": { "item": "" },
          "efek_komplikasi": { "stack": 0 },
          "efek_gagal": { "stack": 0, "nyawa": "tidak" },
          "efek_gagal_total": { "stack": 1 }
        },
        {
          "kode": "C",
          "aksi": "Menyelinap melewati penjaga (contoh kontes, opsional)",
          "jenis": "kontes",
          "pelaku": ["id_pahlawan"],
          "kontes": { "skill": "Stealth", "lawan": "Penjaga gerbang", "lawan_skill": "Perception", "lawan_mod": 3 },
          "berhasil": "...", "berhasil_komplikasi": "...", "gagal": "...", "gagal_total": "..."
        },
        {
          "kode": "D",
          "aksi": "Menyelidiki celah pertahanan sebelum menyerbu (contoh skill_bantuan, opsional)",
          "jenis": "skill_bantuan",
          "pelaku": ["id_pahlawan"],
          "skill_check": { "skill": "Investigation", "tingkat": "Sedang" },
          "efek_jika_berhasil": { "tipe": "turun_tingkat", "besar": 1 },
          "berhasil": "...",
          "gagal": "..."
        }
      ]
    }
  ],
  "ending": [
    { "nama": "Nama ending", "stack_maks": 3, "epilog": "Satu paragraf epilog" }
  ]
}`;

$('makePrompt').onclick=()=>{syncSys();const s=W.sys;const msg=[];
  const hs=W.heroes.filter(h=>s.ikut.includes(h.id));
  if(!hs.length)msg.push('Pilih minimal satu pahlawan yang ikut.');
  hs.forEach(h=>{const w=heroWarn(h);if(w.length)msg.push(`${h.nama||h.id}: ${w.join(', ')} belum diisi.`)});
  const gg0=(W.bawaan&&W.bawaan.gugur)||{};hs.forEach(h=>{if(gg0[h.id])msg.push(`${h.nama} sudah gugur di bab sebelumnya. Hapus centang "ikut" untuknya.`)});
  if(!s.plot.trim())msg.push('Plot kasar belum diisi.');
  if(!s.ending.filter(e=>e.nama).length)msg.push('Ambang ending kosong.');
  if(msg.length){$('promptMsg').innerHTML=`<div class="warn"><b>Lengkapi dulu:</b><br>${msg.map(esc).join('<br>')}</div>`;$('promptBox').style.display='none';return}
  $('promptMsg').innerHTML='';
  const gg=G();const bs=bands(gg.kejadian);
  const avgHero=hs.reduce((a,h)=>a+(sum(POOLS[h.dadu])+POOLS[h.dadu].length)/2+num(h.bonus),0)/hs.length;
  const bosTier=tierOf(s.bos.tingkat,BOSS_TIERS);
  const sistem=[['Judul Cerita & Bab',s.judul||'(bebas, tentukan sendiri)'],['Sistem Dadu','Dadu D&D polyhedral (d4, d6, d8, d10, d10 persen, d12, d20). Pemain memakai Dadu Kelas, GM memakai Dadu Kesulitan.'],
    ['Jumlah Adegan Target',s.adegan||'(bebas)'],['Ramuan Awal',s.ramuan],
    ['Stack Bayangan — Awal/Maks',`0–${s.sbMax}, bos +${s.sbBos} per stack`],['Ambang Ending',s.ending.filter(e=>e.nama).map(e=>`Stack ≤${e.maks}: ${e.nama}`).join(', ')],
    ['Jumlah Pahlawan Ikut',`${hs.length} orang (${hs.map(h=>h.id).join(', ')})`],['Takdir Gugur',(s.gugur||[]).filter(id=>hs.find(h=>h.id===id)).length?`${(s.gugur||[]).filter(id=>hs.find(h=>h.id===id)).join(', ')} WAJIB gugur (mati) dalam cerita${s.gugurNote?': '+s.gugurNote.replace(/\n/g,' '):''}`:'(tidak ada, kecuali plot kasar menyebutkan)'],['Plot Kasar',s.plot.replace(/\n/g,' ')],
    ['Bos/Tantangan Puncak',s.bos.nama||bosTier?`${s.bos.nama||'(nama bebas)'}${bosTier?`, tingkat ${bosTier.n}`:''}${s.bos.tambahan!==''&&s.bos.tambahan!==undefined?`, nilai tambahan ${s.bos.tambahan}`:''}`:'(bebas, rancang sendiri)']];
  const sysTbl='| Field | Isi |\n|---|---|\n'+sistem.map(([a,b])=>`| ${a} | ${String(b).replace(/\|/g,'/')} |`).join('\n');
  const p=`Kamu adalah perancang skenario untuk sistem tabletop bernama "Meja Pencerita".
Tugasmu: menulis SATU cerita lengkap, dipecah per Adegan bernomor, mengikuti
skema mekanik yang KETAT di bawah ini. Ini akan dibacakan langsung oleh Game
Master ke pemain dan angkanya akan diinput ke kalkulator dadu, jadi keseimbangan
angka jauh lebih penting daripada keindahan prosa. Tulis dalam Bahasa Indonesia.

=== GENRE ===
Genre: ${gg.nama}${gg.desc?' — '+gg.desc:''}
Nada & gaya narasi: ${gg.nada||'(bebas, sesuaikan dengan plot)'}
Aturan khusus genre: ${gg.aturan||'(tidak ada)'}
Istilah WAJIB dipakai di seluruh narasi dan Markdown:
${TERM_LABELS.map(([k,l])=>`- ${l} disebut "${gg.istilah[k]}"`).join('\n')}
Catatan: di blok JSON, nama field tetap memakai nama baku ("stack", "ramuan", "nyawa", "bos"), hanya isinya yang memakai istilah genre.
Kolom build khusus genre serta Sifat Baik dan Sifat Buruk di tabel karakter WAJIB dipakai sebagai bahan cerita (asal-usul, motivasi, konflik pribadi, dialog).

=== DATA KARAKTER (jangan diubah statistiknya) ===
${heroTable(hs)}

=== DATA SISTEM & PLOT KASAR ===
${sysTbl}
${lanjutanPrompt()}
=== SISTEM DADU (D&D POLYHEDRAL) ===
- Pemain melempar DADU KELAS masing-masing (kolom "Dadu Kelas") lalu menambah bonus dasarnya.
  Rata-rata nilai pemain di kelompok ini sekitar ${avgHero.toFixed(1)}.
- Setiap tantangan diberi TINGKAT. GM melempar Dadu Kesulitan tingkat itu. Pemain
  BERHASIL bila nilainya sama atau lebih besar dari hasil GM. Pakem tingkat:
${TIERS.map(t=>`  - ${t.n}: ${dStr(t.d)} (hasil ${t.d.length}-${sum(t.d)}, rata-rata ${(sum(t.d)+t.d.length)/2})`).join('\n')}
- Kritis: semua dadu pemain menunjukkan angka maksimal → otomatis sukses luar biasa, Stack Bayangan −1.
  Gagal Total: semua dadu pemain angka 1 → otomatis gagal terburuk, Stack Bayangan +1.
- Kelompok: GM melempar Dadu Kesulitan SATU kali, setiap pemain dibandingkan dengan angka itu.
  Kelompok berhasil bila separuh atau lebih lulus.
- Duel: 3 ronde. Tiap ronde pahlawan (dadu kelas + bonus) melawan Dadu Kesulitan lawan
  (+ bonus lawan). Nilai sama dimenangkan lawan. Menang 2 ronde = menang duel.
- Serangan Bos: seluruh pahlawan yang ikut melempar dan dijumlahkan. Bos melempar SATU SET
  dadu tingkat bos UNTUK SETIAP pahlawan yang ikut, ditambah nilai tambahan (opsional)
  dan Stack×${s.sbBos}. Tingkat bos:
${BOSS_TIERS.map(t=>`  - ${t.n}: ${dStr(t.d)} per pahlawan (rata-rata ${(sum(t.d)+t.d.length)/2} per pahlawan)`).join('\n')}
  Bos Lemah = tim diunggulkan, Bos Kuat = seimbang, Raja Bos = sangat berat (untuk puncak cerita).
  Hasil: tim ≥ bos menang; kurang 1–6 menang tipis (semua yang ikut −1 Nyawa);
  kurang 7+ gagal (semua −1 Nyawa, Stack +1, serang lagi).
- Kejadian Acak d100 (GM melempar d10 persen + d10 bila ia mau): SETIAP adegan WAJIB punya
  tabel kejadian dengan rentang PERSIS berikut (sebaran genre ${gg.nama}):
${bs.map(b=>`  - ${pad2(b.a)}${b.z!==b.a?'-'+pad2(b.z):''}: ${EV_TYPES[b.j]} (jenis "${b.j}")`).join('\n')}
  Isi teks kejadian sesuai adegan dan genre. Efek yang boleh dipakai di JSON:
  "nyawa_acak" (−1 = satu pahlawan acak kehilangan 1 Nyawa, +1 = pulih), "nyawa_semua",
  "stack", "ramuan", "tingkat" (+1 = tantangan berikutnya naik satu tingkat, −1 = turun),
  "item" (nama barang). Kejadian "tenang" boleh tanpa efek tetapi sebaiknya berisi detail
  kecil yang berguna. Bencana = efek berat, Keajaiban = hadiah besar.

=== SKILL INDIVIDU (lapisan opsional, di luar dadu kelas) ===
- Setiap pahlawan punya 6 ability (kolom "Ability") dan 4 skill proficient dari kelasnya. Proficiency Bonus
  cerita ini +${num(s.profBonus,2)}. Skill check = 1d20 + ability skill itu + (Proficiency bila proficient).
  Skill yang tidak proficient tetap boleh dicoba (hanya ability). 18 skill baku (nama Inggris, WAJIB persis):
  ${SKILLS.map(k=>`${k.n} (${k.a})`).join(', ')}.
- Dipakai untuk momen NON-TEMPUR (menyelidiki, membujuk, menyelinap). Pertarungan tetap memakai dadu kelas.
- DC tetap: ${TIERS.map(t=>`${t.n} ${DC_TABLE[t.k]}`).join(', ')}.
- Jenis "skill_cek": satu pelaku, isi "skill_check" {skill, dc, advantage: null/"adv"/"dis", passive: true/false}.
  passive true = tanpa lempar (10 + mod) — cocok untuk Perception mendeteksi jebakan.
- Jenis "kontes": 1 lemparan lawan 1 lemparan (bukan 3 ronde duel), tanpa Nyawa dipertaruhkan. Isi "kontes"
  {skill, lawan, lawan_skill, lawan_mod}. Nilai sama dimenangkan lawan.
- Tingkat hasil untuk skill_cek, kontes, dan solo (opsional di solo): selisih ≥5 di atas target = berhasil_bersih,
  0–4 = berhasil_komplikasi (berhasil tetapi ada harga kecil), kurang 1–4 = gagal, kurang 5+ = gagal_total.
  Isi narasi per tingkat bila mau; yang kosong otomatis memakai "berhasil" / "gagal".
- Jenis "skill_bantuan": aksi pendukung SEBELUM tantangan utama di adegan yang sama. Isi "skill_check"
  {skill, tingkat} dan "efek_jika_berhasil" {tipe, besar}. "tipe" HANYA boleh salah satu dari:
  ${AID_TYPES.map(([k,l])=>`"${k}" (${l})`).join(', ')}.
- "pasif" di tingkat adegan (opsional): {skill:"Perception", dc, info} — hanya menambah informasi untuk GM.
- "hasil_wajib" di tingkat adegan: isi {"tipe":"kalah_naratif"} untuk adegan yang hasilnya sudah ditentukan plot.
- Advantage/Disadvantage: lempar dua kali, ambil terbaik/terburuk. Boleh dipicu kejadian acak dengan
  efek {"adv":"id_pahlawan"} atau {"dis":"id_pahlawan"}.

=== ATURAN KESEIMBANGAN WAJIB ===
1. Kemampuan Dasar (dadu kelas + bonus tetap) boleh dipakai tanpa batas di setiap
   lemparan — ini "tulang punggung" sistem.
2. Skill Khusus tiap karakter HANYA boleh disarankan/dipakai maksimal 3 kali TOTAL
   selama seluruh cerita (bukan per adegan). Di setiap Adegan yang menyertakan opsi
   Skill Khusus, sebutkan catatan "(sisa pakai: dilacak GM)".
3. Skill Pengorbanan SELALU harus punya biaya eksplisit (default: 1 Nyawa milik
   pemakai sendiri) dan efek sepadan. Dua pola baku: (a) korban 1 Nyawa diri sendiri →
   pulihkan 2 Nyawa rekan / cegah rekan Tumbang, (b) korban 1 Nyawa diri sendiri →
   ulangi 1 lemparan dadu atau batalkan 1 efek buruk sebelumnya ("putar waktu").
4. Pilih tingkat sehingga peluang sukses wajar: Sedang untuk tantangan biasa, Mudah
   untuk pilihan hati-hati, Sulit untuk pilihan berisiko, Sangat Sulit dan Mustahil
   hanya untuk pilihan yang dinyatakan jelas sangat berisiko.
5. Stack Bayangan naik saat tim gagal / Gagal Total, turun saat Kritis. Bos mendapat
   bonus +${s.sbBos} per poin Stack Bayangan. Jangan biarkan melebihi ${s.sbMax}.
6. Setiap Adegan HARUS mengikuti format baku berikut, tanpa kecuali:

${FORMAT_ADEGAN}

7. Sebar Quest secara masuk akal: minimal 1 Quest utama sepanjang cerita dan boleh ada
   Quest sampingan opsional di 1-2 Adegan.
8. Opsi pilihan (A, B, C, ...) di tiap Adegan harus benar-benar berbeda pendekatan
   (agresif / hati-hati / sosial / kreatif), bukan variasi kata dari aksi yang sama.
9. Akhiri dengan Ending sesuai Ambang Ending di data sistem, masing-masing 1 paragraf epilog.
10. Gunakan HANYA ID pahlawan dari tabel karakter di atas untuk kolom "pelaku".
11. LATAR: setiap adegan WAJIB punya latar lengkap (tempat, waktu, cuaca, suasana) untuk GM.
    Waktu harus konsisten dan bergerak masuk akal antar adegan (misalnya sore → senja → malam).
12. TAKDIR GUGUR: jika Data Sistem atau plot kasar mengharuskan seorang pahlawan mati, ia
    LANGSUNG Tumbang dan Gugur permanen (tidak bisa dipulihkan dengan apa pun). Tulis ID-nya
    di "mati" pada adegan tempat ia gugur (terjadi otomatis saat adegan dibuka), atau di
    "efek_berhasil.mati" / "efek_gagal.mati" jika kematiannya bergantung pada pilihan. Ceritakan
    kematiannya dengan emosional di narasi. Setelah gugur, jangan pakai dia lagi sebagai
    "pelaku" dan jangan beri opsi yang membutuhkan dirinya. Tanpa takdir gugur, jangan membunuh
    pahlawan secara otomatis.
13. SKILL BANTUAN — magnitudo "besar" harus sebanding dengan tingkat DC yang dipakai (tidak boleh angka bebas):
${TIERS.map(t=>{const m=AID_MAG[t.k];return `    - ${t.n} (${DC_TABLE[t.k]}): ${t.k==='sangat_mudah'?'TIDAK BOLEH untuk efek mekanik':`kurangi_bos maks −${m.tambahan}, ${m.tingkat?`turun_tingkat maks ${m.tingkat}`:'turun_tingkat tidak boleh'}, bonus_tim maks +${m.bonus_tim}, lewati_bos ${m.besar?'boleh (syarat aturan 17)':'tidak boleh'}`}`}).join('\n')}
14. Satu efek skill_bantuan per adegan, tidak bisa ditumpuk (bila beberapa berhasil, hanya yang terbesar berlaku).
    Jangan membuka setiap adegan dengan rentetan skill check.
15. Gagal skill_bantuan selalu punya harga: Mudah–Sedang = Stack +1; Sulit = Stack +1 ATAU tingkat tantangan
    utama naik 1; Sangat Sulit–Mustahil = Stack +1 dan tingkat naik 1, ATAU pelaku −1 Nyawa (GM memilih).
16. Adegan dengan "hasil_wajib" (kalah naratif): skill_bantuan, skill_cek, dan Skill Khusus hanya boleh
    mengurangi besar kerugian, tidak boleh membatalkan hasil wajibnya.
17. "lewati_bos" (khusus Persuasion) hanya pada DC Sangat Sulit atau Mustahil, hanya untuk Bos Lemah / Bos Kuat
    (tidak untuk Raja Bos), dan tidak berlaku di adegan dengan hasil_wajib.
18. Perception pasif hanya membuka informasi tambahan, tidak pernah memberi bonus angka.
19. Pertahanan (AC) = hasil 1 d20 yang dikocok pemain SEKALI di awal dan terkunci selamanya (pakem).
    Saat musuh menyerang atau ada serangan mendadak ke satu pahlawan, GM melempar
    d20 + bonus serang musuh (Lemah +2, Biasa +4, Kuat +6, Bos +8) melawan AC pahlawan itu. Kena = −1 Nyawa
    (angka 20 = −2 Nyawa), angka 1 selalu luput. Di narasi, tulis jelas "Musuh [nama] (kekuatan: Biasa)
    menyerang [nama pahlawan]" agar GM tahu kapan memakai tombol Diserang. Jangan lebih dari 1 serangan per adegan.
20. Uji ability (saving throw) = d20 + ability melawan DC, dipakai saat pahlawan harus MENAHAN sesuatu:
    CON untuk racun/lelah/dingin, DEX untuk menghindari jebakan/ledakan, WIS untuk rasa takut/hipnotis,
    STR untuk tetap berdiri, INT untuk ilusi, CHA untuk kerasukan/kutukan. Tulis "Uji CON DC 13 (racun)".

=== FORMAT OUTPUT ===
Awali dengan bagian "RINGKASAN CERITA (KHUSUS GM)": sinopsis keseluruhan dari awal sampai
akhir termasuk twist, daftar tokoh penting (NPC), dan alur singkat per adegan beserta latarnya.
Lalu tulis Markdown urut per Adegan sesuai skema di atas. Setelah itu, tambahkan
bagian "RINGKASAN MEKANIK" berupa tabel: nomor adegan | jenis tantangan | tingkat | reward.

PALING AKHIR (WAJIB): tulis ulang seluruh data mekanik cerita sebagai SATU blok kode
\`\`\`json yang valid (tanpa komentar, tanpa koma berlebih), mengikuti struktur persis
seperti contoh berikut. Blok ini dibaca otomatis oleh program, jadi harus lengkap
untuk SEMUA adegan, SEMUA opsi, dan SEMUA baris tabel kejadian:

\`\`\`json
${JSON_SPEC}
\`\`\`

Aturan isi JSON:
- "jenis": solo = satu pelaku melawan "tingkat"; kelompok = semua pahlawan melawan
  "tingkat"; bos = isi "bos" (tingkat: "Bos Lemah" / "Bos Kuat" / "Raja Bos"); duel = isi
  "pelaku" (1 orang) dan "lawan" (tingkat + bonus); tanpa_dadu = pilihan cerita tanpa
  lemparan (pakai "efek_berhasil"); skill_khusus / pengorbanan = isi "pelaku".
- "tingkat" memakai nama persis dari pakem: ${TIERS.map(t=>'"'+t.n+'"').join(', ')}.
- Hapus field yang tidak relevan untuk jenis itu, atau isi null.
- "efek_gagal.nyawa": "gagal" = hanya yang gagal −1 Nyawa (kelompok), "semua" = semua −1,
  "pelaku" = pelaku −1, "tidak" = tanpa luka. Untuk bos cukup {"stack":0,"nyawa":"tidak"}.
- "kejadian": satu baris untuk SETIAP rentang di atas, "jenis" memakai nama baku
  (bencana / buruk / tenang / baik / sangat_baik / keajaiban).
- "lanjut_berhasil" / "lanjut_gagal" = nomor adegan berikutnya; untuk adegan terakhir isi 0.
- "quest_selesai": isi NAMA quest yang selesai, atau "" jika tidak.
- "ringkasan", "ringkas", dan "latar" WAJIB diisi untuk seluruh cerita dan setiap adegan.
- "mati": daftar ID pahlawan yang gugur. Kosongkan [] jika tidak ada.
- "narasi" boleh berisi \\n\\n untuk pemisah paragraf.
- Semua field skill individu (skill_check, kontes, pasif, hasil_wajib, berhasil_bersih, berhasil_komplikasi,
  gagal_total, efek_komplikasi, efek_gagal_total, efek_jika_berhasil) OPSIONAL. Hapus bila tidak dipakai.
- "skill" memakai nama baku persis dari daftar 18 skill. Pelaku skill_cek/kontes/skill_bantuan hanya 1 orang.`;
  $('promptOut').value=p;$('promptBox').style.display='';$('copyMsg').textContent='';$('promptBox').scrollIntoView({behavior:'smooth'});
};
$('copyPrompt').onclick=async()=>{const t=$('promptOut');let ok=false;
  try{await navigator.clipboard.writeText(t.value);ok=true}catch(e){t.removeAttribute('readonly');t.select();try{ok=document.execCommand('copy')}catch(e2){}t.setAttribute('readonly','')}
  $('copyMsg').textContent=ok?'Tersalin! Tempel ke AI.':'Gagal menyalin otomatis. Klik di kotak, tekan Ctrl+A lalu Ctrl+C.'};

/* ======================= 3. LOAD STORY ======================= */
function extractJSON(text){
  const fences=[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map(m=>m[1]);
  const cands=fences.reverse();const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a)cands.push(text.slice(a,b+1));
  let lastErr='';
  for(const c of cands){if(!/"adegan"/.test(c))continue;try{return{data:JSON.parse(c)}}catch(e){lastErr=e.message;
      try{return{data:JSON.parse(c.replace(/,\s*([}\]])/g,'$1'))}}catch(e2){}}}
  return{err:lastErr?'Blok JSON ditemukan tetapi rusak: '+lastErr:'Tidak menemukan blok JSON berisi "adegan". Pastikan jawaban AI disalin sampai paling bawah.'};
}
const JENIS=['solo','kelompok','bos','duel','tanpa_dadu','skill_khusus','pengorbanan','skill_cek','kontes','skill_bantuan'];
function normalizeStory(d){const warn=[];const ids=W.heroes.map(h=>h.id);
  if(!Array.isArray(d.adegan)||!d.adegan.length)throw new Error('Tidak ada adegan di dalam data.');
  d.adegan.forEach((a,i)=>{a.no=num(a.no,i+1);a.judul=a.judul||`Adegan ${a.no}`;a.narasi=a.narasi||'';a.opsi=Array.isArray(a.opsi)?a.opsi:[];
    if(!a.opsi.length)warn.push(`Adegan ${a.no} tidak punya opsi.`);
    a.opsi.forEach((o,j)=>{o.kode=o.kode||String.fromCharCode(65+j);let jn=String(o.jenis||'').toLowerCase().replace(/[\s-]+/g,'_');
      if(jn.includes('bantuan'))jn='skill_bantuan';else if(jn.includes('kontes')||jn.includes('contest'))jn='kontes';else if(/skill_?c(e|he)k|^cek_?skill/.test(jn))jn='skill_cek';else if(jn.includes('bos'))jn='bos';else if(jn.includes('kelompok'))jn='kelompok';else if(jn.includes('duel'))jn='duel';else if(jn.includes('pengorbanan'))jn='pengorbanan';else if(jn.includes('skill'))jn='skill_khusus';else if(jn.includes('tanpa'))jn='tanpa_dadu';else if(jn.includes('solo'))jn='solo';
      if(!JENIS.includes(jn)){warn.push(`Adegan ${a.no} opsi ${o.kode}: jenis "${o.jenis}" tidak dikenal, dianggap tanpa dadu.`);jn='tanpa_dadu'}
      o.jenis=jn;o.pelaku=(Array.isArray(o.pelaku)?o.pelaku:(o.pelaku?[o.pelaku]:[])).map(x=>slug(x));
      o.pelaku.forEach(p=>{if(!ids.includes(p))warn.push(`Adegan ${a.no} opsi ${o.kode}: pelaku "${p}" tidak ada di data pahlawan.`)});
      if(jn==='solo'||jn==='kelompok'){let t=findTier(o.tingkat);if(!t&&o.tk!=null){t=tkToTier(o.tk);if(t)warn.push(`Adegan ${a.no} opsi ${o.kode}: memakai TK angka, diubah ke tingkat ${tierOf(t).n}.`)}
        if(!t){t='sedang';warn.push(`Adegan ${a.no} opsi ${o.kode}: tingkat kosong, dipakai Sedang (bisa diganti saat bermain).`)}o.tingkat=t}
      if(jn==='bos'){o.bos=o.bos||{};let t=findTier(o.bos.tingkat,BOSS_TIERS);if(!t){t='bos_kuat';warn.push(`Adegan ${a.no} opsi ${o.kode}: tingkat bos kosong, dipakai Bos Kuat.`)}o.bos.tingkat=t;o.bos.tambahan=num(o.bos.tambahan,0)}
      if(jn==='duel'){o.lawan=o.lawan||{};let t=findTier(o.lawan.tingkat);if(!t){t='sulit';warn.push(`Adegan ${a.no} opsi ${o.kode}: tingkat lawan duel kosong, dipakai Sulit.`)}o.lawan.tingkat=t;o.lawan.bonus=num(o.lawan.bonus,0)}
      if(jn==='skill_cek'||jn==='skill_bantuan'||jn==='kontes'){if(o.pelaku.length>1){warn.push(`Adegan ${a.no} opsi ${o.kode}: ${lbl(jn)} hanya untuk 1 pelaku, dipakai ${o.pelaku[0]}.`);o.pelaku=o.pelaku.slice(0,1)}}
      if(jn==='skill_cek'||jn==='skill_bantuan'){const sc=o.skill_check=Object.assign({},o.skill_check||{});const sk=findSkill(sc.skill);
        if(!sk)warn.push(`Adegan ${a.no} opsi ${o.kode}: skill "${sc.skill||''}" tidak dikenal, dipakai Perception (bisa diganti saat bermain).`);sc.skill=sk||'Perception';
        let tk=findTier(sc.tingkat);if(!tk&&sc.dc!=null&&sc.dc!=='')tk=dcTierOf(sc.dc);if(!tk){tk='sedang';warn.push(`Adegan ${a.no} opsi ${o.kode}: DC kosong, dipakai Sedang (15).`)}
        sc.tingkat=tk;sc.dc=sc.dc!=null&&sc.dc!==''&&!isNaN(parseFloat(sc.dc))?num(sc.dc):DC_TABLE[tk];
        const ad=String(sc.advantage||'').toLowerCase();sc.advantage=/^adv|keuntungan/.test(ad)?'adv':/^dis|kerugian/.test(ad)?'dis':null;sc.passive=sc.passive===true||sc.passive==='true';}
      if(jn==='kontes'){const k=o.kontes=Object.assign({},o.kontes||{});const sk=findSkill(k.skill);if(!sk)warn.push(`Adegan ${a.no} opsi ${o.kode}: skill kontes "${k.skill||''}" tidak dikenal, dipakai Stealth.`);k.skill=sk||'Stealth';
        k.lawan_skill=findSkill(k.lawan_skill)||k.lawan_skill||'';k.lawan_mod=num(k.lawan_mod,0);k.lawan=k.lawan||k.lawan_nama||(o.lawan&&o.lawan.nama)||'Lawan'}
      if(jn==='skill_bantuan'){const tk=o.skill_check.tingkat;const ef=o.efek_jika_berhasil=Object.assign({tipe:'info',besar:0},o.efek_jika_berhasil||{});
        ef.tipe=String(ef.tipe||'info').toLowerCase().replace(/[\s-]+/g,'_');if(ef.tipe==='tambahan'||ef.tipe==='kurangi_tambahan')ef.tipe='kurangi_bos';if(ef.tipe==='tingkat')ef.tipe='turun_tingkat';if(ef.tipe==='advantage')ef.tipe='adv';
        if(!AID_TYPES.find(x=>x[0]===ef.tipe)){warn.push(`Adegan ${a.no} opsi ${o.kode}: tipe efek bantuan "${ef.tipe}" tidak dikenal, dianggap info.`);ef.tipe='info'}
        ef.besar=Math.abs(num(ef.besar,1));const cap=aidCap(ef.tipe,tk);
        if(ef.tipe==='lewati_bos'&&o.skill_check.skill!=='Persuasion'){warn.push(`Adegan ${a.no} opsi ${o.kode}: lewati_bos hanya untuk Persuasion, diubah menjadi kurangi_bos.`);ef.tipe='kurangi_bos';ef.besar=AID_MAG[tk].tambahan}
        else if(ef.tipe!=='info'&&cap===0){warn.push(`Adegan ${a.no} opsi ${o.kode}: efek "${aidLabel(ef.tipe)}" tidak boleh pada DC ${tierOf(tk).n} (aturan 13), diubah menjadi info.`);ef.tipe='info';ef.besar=0}
        else if(ef.tipe!=='info'&&ef.besar>cap){warn.push(`Adegan ${a.no} opsi ${o.kode}: besar efek ${ef.besar} melebihi batas DC ${tierOf(tk).n} (${cap}), diturunkan.`);ef.besar=cap}
        if(ef.tipe==='lewati_bos'||ef.tipe==='adv')ef.besar=1;
        if(o.efek_jika_gagal&&!o.efek_gagal)o.efek_gagal=o.efek_jika_gagal;
        if(a.hasil_wajib&&ef.tipe==='lewati_bos'){warn.push(`Adegan ${a.no} opsi ${o.kode}: lewati_bos tidak berlaku di adegan dengan hasil_wajib, diubah menjadi kurangi_bos.`);ef.tipe='kurangi_bos';ef.besar=AID_MAG[tk].tambahan}}
      o.efek_berhasil=o.efek_berhasil||{};o.efek_gagal=o.efek_gagal||{};});
  });
  d.adegan.forEach(a=>{const ks=Array.isArray(a.kejadian)?a.kejadian:[];a.kejadian=ks.map(k=>({dari:num(k.dari,0),sampai:num(k.sampai,0),jenis:(findEv(k.jenis)||'tenang'),teks:k.teks||'',efek:k.efek||{}})).filter(k=>k.sampai>=k.dari&&k.dari>0);
    if(!a.kejadian.length)warn.push(`Adegan ${a.no}: tidak ada tabel kejadian acak, dipakai tabel umum genre.`)});
  d.adegan.sort((x,y)=>x.no-y.no);
  const ids2=W.heroes.map(h=>h.id);const normMati=(v,where)=>{const arr=(Array.isArray(v)?v:(v?[v]:[])).map(x=>slug(x)).filter(Boolean);arr.forEach(p=>{if(!ids2.includes(p))warn.push(`${where}: pahlawan gugur "${p}" tidak ada di data pahlawan.`)});return arr};
  d.adegan.forEach(a=>{a.mati=normMati(a.mati,`Adegan ${a.no}`);
    if(a.hasil_wajib&&typeof a.hasil_wajib==='string')a.hasil_wajib={tipe:a.hasil_wajib};if(a.hasil_wajib&&!a.hasil_wajib.tipe)a.hasil_wajib=null;
    if(a.pasif&&typeof a.pasif==='object'){a.pasif.skill=findSkill(a.pasif.skill)||'Perception';a.pasif.dc=num(a.pasif.dc,15)}else a.pasif=null;
    if(typeof a.latar==='string')a.latar={tempat:a.latar};a.latar=a.latar&&typeof a.latar==='object'?a.latar:null;
    if(!a.latar)warn.push(`Adegan ${a.no}: latar (tempat/waktu/suasana) kosong.`);
    a.opsi.forEach(o=>{o.efek_berhasil.mati=normMati(o.efek_berhasil.mati,`Adegan ${a.no} opsi ${o.kode}`);o.efek_gagal.mati=normMati(o.efek_gagal.mati,`Adegan ${a.no} opsi ${o.kode}`)})});
  if(typeof d.ringkasan==='string')d.ringkasan={sinopsis:d.ringkasan};
  d.ringkasan=d.ringkasan&&typeof d.ringkasan==='object'?d.ringkasan:{};d.ringkasan.tokoh=Array.isArray(d.ringkasan.tokoh)?d.ringkasan.tokoh:[];
  if(!d.ringkasan.sinopsis)warn.push('Ringkasan cerita (sinopsis) kosong. Minta AI menambahkan "ringkasan" di JSON.');
  d.ending=Array.isArray(d.ending)?d.ending.filter(e=>e&&e.nama):[];
  if(!d.ending.length)warn.push('Tidak ada ending di data. Ending dari Data Sistem akan dipakai tanpa epilog.');
  return warn;
}
function findEv(j){const s=String(j||'').toLowerCase().replace(/[\s-]+/g,'_');if(EV_TYPES[s])return s;return ['sangat_baik','keajaiban','bencana','buruk','tenang','baik'].find(k=>s.includes(k))||null}
const WAKTU_ICON=w=>{const t=String(w||'').toLowerCase();return /tengah malam|dini/.test(t)?'🌑':/malam/.test(t)?'🌙':/senja|sore/.test(t)?'🌇':/pagi|fajar|subuh/.test(t)?'🌅':/siang/.test(t)?'☀️':'🕰️'};
function latarBox(l){if(!l)return '<div class="small">(latar tidak tersedia)</div>';const c=(k,lab,ic='')=>`<div><span>${lab}</span>${ic}${esc(l[k]||'—')}</div>`;
  return `<div class="latar">${c('tempat','Tempat')}${c('waktu','Waktu',WAKTU_ICON(l.waktu)+' ')}${c('cuaca','Cuaca')}${c('suasana','Suasana')}</div>`}
function summaryHTML(d){const r=d.ringkasan||{};const heroName=id=>{const h=W.heroes.find(x=>x.id===id);return h?h.nama:id};
  const deaths=[];d.adegan.forEach(a=>{a.mati.forEach(p=>deaths.push(`${heroName(p)} (Adegan ${a.no}, otomatis)`));a.opsi.forEach(o=>{[...o.efek_berhasil.mati.map(p=>[p,'berhasil']),...o.efek_gagal.mati.map(p=>[p,'gagal'])].forEach(([p,w])=>deaths.push(`${heroName(p)} (Adegan ${a.no} opsi ${o.kode} jika ${w})`))})});
  return `<div class="syn">${r.sinopsis?String(r.sinopsis).split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join(''):'<p class="small">(Sinopsis tidak ada di data cerita.)</p>'}
   ${r.twist?`<p><b>Twist / rahasia:</b> ${esc(r.twist)}</p>`:''}${deaths.length?`<div class="fate">☠ <b>Takdir gugur:</b> ${esc(deaths.join(' · '))}</div>`:''}</div>
   ${r.tokoh.length?`<h3>Tokoh penting</h3><div class="scroll"><table class="grid"><tr><th>Nama</th><th>Peran</th><th>Catatan</th></tr>${r.tokoh.map(t=>`<tr><td><b>${esc(t.nama||'')}</b></td><td>${esc(t.peran||'')}</td><td>${esc(t.catatan||'')}</td></tr>`).join('')}</table></div>`:''}
   <h3>Alur per adegan</h3><div class="scroll"><table class="grid"><tr><th>Adegan</th><th>Tempat · Waktu</th><th>Suasana</th><th>Yang terjadi</th><th>Tantangan</th></tr>
   ${d.adegan.map(a=>`<tr><td><b>${a.no}. ${esc(a.judul)}</b></td><td>${a.latar?`${esc(a.latar.tempat||'')}<br>${WAKTU_ICON(a.latar.waktu)} ${esc(a.latar.waktu||'')}${a.latar.cuaca?' · '+esc(a.latar.cuaca):''}`:'—'}</td><td class="small">${a.latar?esc(a.latar.suasana||''):''}</td><td>${esc(a.ringkas||'')}${a.mati.length?`<br><b style="color:var(--wax)">☠ ${esc(a.mati.map(heroName).join(', '))} gugur</b>`:''}</td><td>${a.opsi.map(o=>`${esc(o.kode)}<span class="tagk t-${o.jenis}">${lbl(o.jenis)}</span>`).join(' ')}</td></tr>`).join('')}</table></div>`}
function loadStoryText(text){
  const r=extractJSON(text);if(r.err){$('parseMsg').innerHTML=`<div class="warn">${esc(r.err)}</div>`;$('storyPreview').style.display='none';return}
  let warn;try{warn=normalizeStory(r.data)}catch(e){$('parseMsg').innerHTML=`<div class="warn">${esc(e.message)}</div>`;return}
  W.draft=r.data;W._storyBaru=true;save();
  const d=r.data;const tot=d.adegan.reduce((a,x)=>a+x.opsi.length,0);
  $('parseMsg').innerHTML=`<div class="ok">Berhasil dibaca: <b>${d.adegan.length} adegan</b>, ${tot} opsi, ${d.ending.length} ending.</div>`+(warn.length?`<div class="warn"><b>Perlu diperhatikan (${warn.length}):</b><br>${warn.map(esc).join('<br>')}</div>`:'');
  $('storyPreview').style.display='';
  $('storyPreview').innerHTML=`<h2>${esc(d.judul||W.sys.judul||'Cerita tanpa judul')}</h2>
   <p class="small">Ringkasan cerita keseluruhan — <b>khusus GM</b>, jangan dibacakan ke pemain.</p>
   ${summaryHTML(d)}
   <div class="actions"><button class="btn green" id="startSesi">Mulai sesi baru dengan cerita ini</button><button class="dbtn" id="saveStoryFile">Simpan cerita ke file</button></div>
   <p class="small">Mulai sesi baru akan mengatur ulang Nyawa, jatah skill, Stack Bayangan, ramuan, dan catatan.</p>`;
  $('startSesi').onclick=()=>startSesi(d);
  $('saveStoryFile').onclick=()=>download(slug(d.judul||'cerita')+'.json',d);
}
$('parseStory').onclick=()=>{const t=$('storyIn').value;if(!t.trim())return alert('Tempel jawaban AI dulu.');loadStoryText(t)};
$('storyFile').onchange=e=>readFile(e.target,t=>{$('storyIn').value=t;loadStoryText(t)});
function lbl(j){return{solo:'Solo',kelompok:'Kelompok',bos:'Serangan Bos',duel:'Duel',tanpa_dadu:'Tanpa dadu',skill_khusus:'Skill Khusus',pengorbanan:'Pengorbanan',skill_cek:'Skill Check',kontes:'Kontes',skill_bantuan:'Skill Bantuan'}[j]||j}

/* ======================= 4. PLAY ======================= */
function startSesi(d){
  const ikut=W.sys.ikut.filter(id=>W.heroes.find(h=>h.id===id));
  const used=new Set();d.adegan.forEach(a=>a.opsi.forEach(o=>o.pelaku.forEach(p=>used.add(p))));
  let party=ikut.length?ikut:W.heroes.map(h=>h.id).filter(id=>used.has(id));
  if(!party.length)party=W.heroes.map(h=>h.id);
  if(!party.length)return alert('Belum ada data pahlawan. Isi di tab 1 dulu.');
  if(W.sesi&&!confirm('Mulai sesi baru? Sesi yang sedang berjalan akan diganti.'))return;
  W.story=JSON.parse(JSON.stringify(d));
  W.sesi={party,shift:0,hati:{},skill:{},pending:{},sb:0,ramuan:num(W.sys.ramuan,0),items:[],quests:{},cur:0,log:[],done:{},ended:false,aid:{}};
  party.forEach(id=>{const h=H(id);W.sesi.hati[id]=num(h.nyawa,3);W.sesi.skill[id]=3});
  W.sesi.cid=uuid();W.sesi.giliran={};W.undo=[];if(!W.storyCid||W._storyBaru){W.storyCid=uuid();delete W._storyBaru}
  d.adegan.forEach(a=>{if(a.quest&&a.quest.ada&&a.quest.nama)W.sesi.quests[a.quest.nama]={selesai:false,reward:a.quest.reward||'',tujuan:a.quest.tujuan||''}});
  log(`Sesi baru: ${d.judul||W.sys.judul||'cerita'}${W.bab>1?` (Bab ${W.bab})`:''}`);applyBawaan();save();showTab('play');
}
const H=id=>W.heroes.find(h=>h.id===id)||{id,nama:id,bonus:0,nyawa:3,sk:{},sp:{}};
const party=()=>W.sesi.party;
const maxH=id=>num(H(id).nyawa,3);
const down=id=>W.sesi.hati[id]<=0;
const dead=id=>!!(W.sesi.gugur&&W.sesi.gugur[id]);
function kill(id,why){const s=W.sesi;s.gugur=s.gugur||{};if(s.gugur[id]||!s.party.includes(id))return false;s.hati[id]=0;s.gugur[id]={why,at:scn()?scn().no:null};Object.keys(s.pending[id]||{}).forEach(k=>delete s.pending[id][k]);log(`☠ ${H(id).nama} GUGUR (${why})`);return true}
const bonusOf=id=>num(H(id).bonus,0);
function log(t){if(!W.sesi)return;const d=new Date();W.sesi.log.unshift(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}  ${t}`);W.sesi.log=W.sesi.log.slice(0,200);save()}
function hurt(id,n,why){if(dead(id))return;const o=W.sesi.hati[id];W.sesi.hati[id]=clamp(o-n,0,maxH(id));if(o!==W.sesi.hati[id])log(`${H(id).nama} ${n>0?'−':'+'}${Math.abs(n)} Nyawa (${why})${W.sesi.hati[id]===0?' — Tumbang!':''}`)}
function addSB(n,why){const o=W.sesi.sb;W.sesi.sb=clamp(o+n,0,num(W.sys.sbMax,10));if(o!==W.sesi.sb)log(`Stack Bayangan ${o} → ${W.sesi.sb} (${why})`)}
const poolOf=id=>POOLS[H(id).dadu]||[20];
const heroCrit=(id,t)=>t===sum(poolOf(id));
const heroFum=(id,t)=>t===poolOf(id).length;
function endings(){const e=(W.story.ending&&W.story.ending.length)?W.story.ending.map(x=>({nama:x.nama,maks:num(x.stack_maks,99),epilog:x.epilog||''})):W.sys.ending.map(x=>({nama:x.nama,maks:num(x.maks,99),epilog:''}));return e.sort((a,b)=>a.maks-b.maks)}
function curEnding(){const e=endings();return e.find(x=>W.sesi.sb<=x.maks)||e[e.length-1]}
function useShield(){const id=party().find(p=>W.sesi.pending[p]&&W.sesi.pending[p].perisai);if(id){delete W.sesi.pending[id].perisai;log(`Perisai ${H(id).sk.nama||''} milik ${H(id).nama} membatalkan luka`);return true}return false}

/* ---- Modul C & F: Advantage/Disadvantage + Skill Bantuan ---- */
function advModeOf(id,extra){const pd=(W.sesi.pending[id]||{});let a=!!pd.adv||extra==='adv',d=!!pd.dis||extra==='dis';return a&&d?'normal':a?'adv':d?'dis':'normal'}
function clearAdv(id){const pd=W.sesi.pending[id];if(pd&&(pd.adv||pd.dis)){delete pd.adv;delete pd.dis}}
function setAdvFx(ef,why){['adv','dis'].forEach(k=>{if(!ef||!ef[k])return;let id=ef[k];if(id==='acak'){const al=party().filter(p=>!down(p));id=al[Math.floor(Math.random()*al.length)]}id=slug(id);
  if(!party().includes(id))return;const s=W.sesi;s.pending[id]=s.pending[id]||{};s.pending[id][k]=true;log(`${H(id).nama} mendapat ${k==='adv'?'Advantage':'Disadvantage'} (${why})`)})}
const pickMode=(mode,d1,d2)=>mode==='adv'?Math.max(d1,d2):mode==='dis'?Math.min(d1,d2):d1;
function advSel(mode){return `<div class="field"><label>Advantage</label><select class="s" id="rAdv"><option value="normal" ${mode==='normal'?'selected':''}>Normal (1 lemparan)</option><option value="adv" ${mode==='adv'?'selected':''}>Advantage (2x, ambil tertinggi)</option><option value="dis" ${mode==='dis'?'selected':''}>Disadvantage (2x, ambil terendah)</option></select></div>`}
function aidNow(){const s=W.sesi,a=scn();if(!a||!s.aid)return null;const x=s.aid[a.no];return x&&!x.used&&!x.imm?x:null}
function aidDesc(x){return x.tipe==='turun_tingkat'?`tingkat turun ${x.besar}`:x.tipe==='kurangi_bos'?`nilai tambahan bos −${x.besar}`:x.tipe==='bonus_tim'?`tim +${x.besar} di Serangan Bos`:x.tipe==='lewati_bos'?'boleh melewati Serangan Bos':aidLabel(x.tipe)}
function aidFor(jenis){const x=aidNow();if(!x)return null;if(x.tipe==='turun_tingkat'&&['solo','kelompok','bos','duel','skill_cek'].includes(jenis))return x;if(['kurangi_bos','bonus_tim','lewati_bos'].includes(x.tipe)&&jenis==='bos')return x;return null}
function useAid(jenis){const x=aidFor(jenis);if(x){x.used=true;log(`Efek Skill Bantuan terpakai: ${aidDesc(x)}`)}}
function aidShift(jenis){const x=aidFor(jenis);return x&&x.tipe==='turun_tingkat'?-x.besar:0}
function renderPlay(){
  if(!W||!W.story||!W.sesi){$('playEmpty').style.display='';$('playWrap').style.display='none';return}
  $('playEmpty').style.display='none';$('playWrap').style.display='';
  $('pTitle').textContent=W.story.judul||W.sys.judul||'Cerita';
  renderSide();renderScene();
}
function renderSide(){const s=W.sesi;
  $('party').innerHTML=party().map(id=>{const h=H(id),mx=maxH(id),pd=s.pending[id]||{};
    const acted=((s.giliran||{})[scnNoSafe()]||[]).includes(id);
    return `<div class="hero ${down(id)?'down':''}"><div class="top"><div><button class="giliran ${acted?'on':''}" data-giliran="${esc(id)}" title="${acted?'Sudah beraksi di adegan ini (klik untuk batalkan)':'Belum beraksi di adegan ini (klik untuk tandai)'}" aria-label="Giliran ${esc(h.nama)}">✦</button><b>${esc(h.nama)}</b> <span class="small">${dStr(poolOf(id))} +${bonusOf(id)}${acOf(h)?` · <span title="Pertahanan (AC), terkunci">🛡${acOf(h)}</span>`:' · <span title="Pertahanan belum dikunci">🛡—</span>'}</span>${dead(id)?'<span class="badge gugur">☠ Gugur</span>':down(id)?'<span class="badge">Tumbang</span>':''}${pd.bonus?`<span class="badge skill">Skill +${pd.bonus}</span>`:''}${pd.bonus_tim?`<span class="badge skill">Tim +${pd.bonus_tim}</span>`:''}${pd.kritis?'<span class="badge skill">Auto Kritis</span>':''}${pd.perisai?'<span class="badge shield">Perisai</span>':''}${pd.adv&&!pd.dis?'<span class="badge adv">Advantage</span>':''}${pd.dis&&!pd.adv?'<span class="badge dis">Disadvantage</span>':''}${pd.adv||pd.dis?`<button class="dbtn" data-clradv="${esc(id)}" style="padding:0 5px;font-size:11px;margin-left:3px" title="Hapus Advantage/Disadvantage">×</button>`:''}</div>
      <div>${Array.from({length:mx},(_,i)=>`<button class="heart ${i+1>s.hati[id]?'off':''}" data-h="${esc(id)}" data-i="${i+1}" aria-label="${esc(h.nama)} nyawa ${i+1}">♥</button>`).join('')}</div></div>
      <div class="hbtns"><button class="dbtn" data-sk="${esc(id)}" ${s.skill[id]<=0||down(id)?'disabled':''} title="${esc(h.sk.efek||'')}">⚡ ${esc(h.sk.nama||'Skill Khusus')} <span class="dots">${[0,1,2].map(i=>`<span class="dot ${i>=s.skill[id]?'used':''}"></span>`).join('')}</span></button>
      <button class="dbtn red" data-sp="${esc(id)}" ${s.hati[id]<num(h.sp.biaya,1)||dead(id)?'disabled':''} title="${esc(h.sp.efek||'')}">♥ ${esc(h.sp.nama||'Pengorbanan')}</button>
      <button class="dbtn ${acOf(h)?'':'perlu-ac'}" data-atk="${esc(id)}" ${dead(id)?'disabled':''} title="${acOf(h)?'Serangan musuh / mendadak: d20 + bonus musuh melawan Pertahanan':'Pertahanan belum dikunci: klik untuk mengisinya sekarang'}">⚔ Diserang${acOf(h)?'':' 🔒?'}</button>
      <button class="dbtn" data-uji="${esc(id)}" ${dead(id)||!h.ability?'disabled':''} title="Uji ability: menahan racun, jebakan, rasa takut, dll.">🎲 Uji</button></div></div>`}).join('');
  $('sbNum').textContent=s.sb;$('sbNum').classList.toggle('zero',s.sb===0);
  $('shiftInfo').innerHTML=s.shift?`<div class="${s.shift>0?'warn':'ok'}" style="margin:8px 0 0">Tantangan berikutnya <b>${s.shift>0?'naik':'turun'} ${Math.abs(s.shift)} tingkat</b> (akibat kejadian acak). <button class="dbtn" id="clrShift" style="padding:1px 8px">Batalkan</button></div>`:'';
  if($('clrShift'))$('clrShift').onclick=()=>{s.shift=0;log('Perubahan tingkat dibatalkan');save();renderSide();refreshRoller()};
  const ai=W.story&&!s.ended?aidNow():null;if(ai)$('shiftInfo').insertAdjacentHTML('beforeend',`<div class="ok" style="margin:8px 0 0">Skill Bantuan aktif (${esc(H(ai.dari).nama)}, ${esc(ai.skill)}): <b>${esc(aidDesc(ai))}</b> untuk tantangan berikutnya di adegan ini. <button class="dbtn" id="clrAid" style="padding:1px 8px">Batalkan</button></div>`);
  if($('clrAid'))$('clrAid').onclick=()=>{const a=aidNow();if(a){a.used=true;log('Efek Skill Bantuan dibatalkan GM')}save();renderSide();refreshRoller()};
  const e=curEnding();$('sbInfo').innerHTML=`Bos +${s.sb*num(W.sys.sbBos,2)}<br>Arah: <b>${esc(e?e.nama:'-')}</b>`;
  $('ramNum').textContent=s.ramuan;
  $('potTarget').innerHTML=party().map(id=>`<option value="${esc(id)}">${esc(H(id).nama)} (${s.hati[id]}/${maxH(id)})</option>`).join('');
  const qs=Object.entries(s.quests);
  $('questList').innerHTML=qs.length?qs.map(([n,q])=>`<label class="chk" style="align-items:flex-start"><input type="checkbox" data-q="${esc(n)}" ${q.selesai?'checked':''}><span><b>${esc(n)}</b>${q.tujuan?`<br>${esc(q.tujuan)}`:''}${q.reward?`<br><i>Reward: ${esc(q.reward)}</i>`:''}</span></label>`).join(''):'Belum ada quest.';
  $('itemList').innerHTML=s.items.length?s.items.map((it,i)=>`<div class="row" style="margin:2px 0;justify-content:space-between"><span>${esc(it)}</span><button class="dbtn red" data-rmitem="${i}" style="padding:1px 7px">×</button></div>`).join(''):'Belum ada barang.';
  $('log').innerHTML=s.log.length?s.log.map(l=>`<div>${esc(l)}</div>`).join(''):'<div class="small">Belum ada catatan.</div>';
  renderGiliran();renderUndo();renderGmPanel();bindImprov();bindRekapSide();bus.emit('party',layarParty());
}
$('playWrap').addEventListener('click',e=>{const t=e.target.closest('button');if(!t||!W.sesi)return;const s=W.sesi;
  if(t.dataset.h){const id=t.dataset.h,i=+t.dataset.i;if(dead(id)){if(!confirm(`${H(id).nama} sudah gugur karena plot. Batalkan status gugur?`))return;delete s.gugur[id];log(`Status gugur ${H(id).nama} dibatalkan GM`)}s.hati[id]=s.hati[id]===i?i-1:i;log(`${H(id).nama} diatur ke ${s.hati[id]} Nyawa`);save();renderSide()}
  if(t.dataset.ram){s.ramuan=Math.max(0,s.ramuan+ +t.dataset.ram);save();renderSide()}
  if(t.dataset.rmitem!==undefined){log('Barang dilepas: '+s.items[+t.dataset.rmitem]);s.items.splice(+t.dataset.rmitem,1);save();renderSide()}
  if(t.dataset.clradv){const pd=s.pending[t.dataset.clradv]||{};delete pd.adv;delete pd.dis;log(`Advantage/Disadvantage ${H(t.dataset.clradv).nama} dihapus GM`);save();renderSide();refreshRoller();return}
  if(t.dataset.sk)useSkill(t.dataset.sk);
  if(t.dataset.sp)useSacrifice(t.dataset.sp);
  if(t.dataset.atk)bukaSerangan(t.dataset.atk);
  if(t.dataset.uji)bukaUji(t.dataset.uji);
});
/* ---------- Contekan GM: lemparan apa yang dipakai? ---------- */
$('contekBtn').onclick=()=>modal(`<h2>Contekan GM: pakai lemparan yang mana?</h2>
  <div class="scroll"><table class="grid contek"><tr><th>Situasinya</th><th>Lemparan</th><th>Caranya</th></tr>
  <tr><td>Pahlawan menghadapi tantangan dari cerita (bertarung, kabur, merusak segel)</td><td><b>Aksi</b><br>dadu kelas</td><td>Pilih opsi di adegan, lempar di <b>Penghitung</b>, klik <b>Terapkan</b>.</td></tr>
  <tr><td>Pahlawan mencoba sesuatu yang tidak pasti (membujuk, menyelinap, mencari petunjuk)</td><td><b>Cek skill</b><br>d20 + skill</td><td>Sebut skill &amp; DC (10 mudah · 15 sedang · 20 sulit). Pemain lempar d20 + angka skill.</td></tr>
  <tr><td>Pahlawan harus <b>menahan</b> sesuatu (racun, jebakan, rasa takut)</td><td><b>Uji ability</b><br>d20 + ability</td><td>Tombol <b>🎲 Uji</b> di kartu pahlawan. Contoh: racun → Tahan (CON) DC 13.</td></tr>
  <tr><td>Musuh menyerang atau ada <b>serangan mendadak</b> ke satu pahlawan</td><td><b>Serangan musuh</b><br>d20 + bonus musuh</td><td>Tombol <b>⚔ Diserang</b>. Hasil ≥ Pertahanan (d20 terkunci) = −1 ${esc(T('nyawa'))}.</td></tr>
  </table></div>
  <p class="small">Aturan emas: bila ragu, pilih yang paling sederhana dan lanjutkan cerita. Keputusan GM adalah final.</p>
  <div class="actions"><button class="btn" type="button" onclick="closeModal()">Mengerti</button></div>`);
/* ---------- Musuh menyerang (Pertahanan / AC) ---------- */
const d20=()=>1+Math.floor(Math.random()*20);
/* Kunci Pertahanan langsung dari halaman Main (tanpa pindah tab) */
function kunciACModal(id,lanjut){const h=H(id);
  modal(`<h2>🔒 Pertahanan ${esc(h.nama)} belum dikunci</h2>
    <p>Serangan musuh dibandingkan dengan <b>Pertahanan</b>. Minta pemain mengocok <b>1 d20 fisik</b> sekali, lalu ketik hasilnya.</p>
    <div class="row"><input class="s ac-besar" id="kaIn" type="number" min="1" max="20" inputmode="numeric" placeholder="1–20" aria-label="Hasil d20 Pertahanan"><button class="btn" id="kaOk" type="button">🔒 Kunci</button></div>
    <p class="small">Pakem: setelah dikunci, angka ini <b>tidak bisa diubah</b> siapa pun sampai cerita selesai.</p>`);
  setTimeout(()=>$('kaIn')&&$('kaIn').focus(),50);
  const ok=()=>{const v=parseInt($('kaIn').value,10);if(!(v>=1&&v<=20)){toast('Tulis hasil d20: angka 1–20.',true);return}
    if(!confirm(`Pertahanan ${h.nama} = ${v}. Setelah dikunci tidak bisa diubah. Sudah benar?`))return;
    h.pertahanan={nilai:v,at:Date.now()};log(`Pertahanan ${h.nama} dikunci: ${v}`);save();renderSide();toast(`Pertahanan ${h.nama} dikunci: ${v}`);if(lanjut)lanjut();else closeModal()};
  $('kaOk').onclick=ok;$('kaIn').onkeydown=e=>{if(e.key==='Enter')ok()}}
function bukaSerangan(id){const h=H(id),ac=acOf(h);if(!ac){kunciACModal(id,()=>bukaSerangan(id));return}let mk='biasa';
  const isi=()=>{const m=MUSUH.find(x=>x.k===mk);return `<h2>⚔ Musuh menyerang ${esc(h.nama)}</h2>
    <p class="small">Musuh melempar <b>d20 + bonus</b>. Hasil ≥ Pertahanan <b>${ac}</b> = kena (−1 ${esc(T('nyawa'))}). Angka 20 = −2, angka 1 = selalu luput.</p>
    <div class="seg" role="radiogroup" aria-label="Kekuatan musuh">${MUSUH.map(x=>`<button type="button" class="seg-b ${x.k===mk?'on':''}" data-mk="${x.k}" aria-checked="${x.k===mk}">${x.nama} +${x.bonus}</button>`).join('')}</div>
    <p class="small">${esc(m.ket)} · peluang kena <b>${Math.round(peluangKena(m.bonus,ac)*100)}%</b></p>
    <div class="row"><button class="btn" id="atkRoll" type="button">🎲 Lempar d20 musuh</button><span class="small">atau ketik hasil dadu fisik:</span><input class="s" id="atkD" type="number" min="1" max="20" style="width:80px" aria-label="Hasil d20 musuh"><button class="dbtn" id="atkCek" type="button">Cek</button></div>
    <div id="atkHasil"></div>`};
  modal(isi());
  const bind=()=>{document.querySelectorAll('[data-mk]').forEach(b=>b.onclick=()=>{mk=b.dataset.mk;modal(isi());bind()});
    const tampil=r=>{const res=seranganMusuh(r,MUSUH.find(x=>x.k===mk).bonus,ac);const lindung=(W.sesi.pending[id]||{}).perisai||party().some(p=>(W.sesi.pending[p]||{}).perisai);
      $('atkHasil').innerHTML=`<div class="atk-res ${res.kena?'kena':'luput'}"><div class="atk-n">${res.d20} ${fmtMod(res.bonus)} = <b>${res.total}</b> <span>vs Pertahanan ${ac}</span></div>
        <div class="atk-v">${res.kena?`KENA${res.kritis?' KRITIS':''} · −${res.luka} ${esc(T('nyawa'))}`:res.luput?'LUPUT (angka 1)':'LUPUT · tidak terluka'}</div></div>
        <div class="actions">${res.kena?`<button class="btn red" id="atkApply" type="button">Terapkan −${res.luka} ${esc(T('nyawa'))}</button>${lindung?'<span class="small">Perisai aktif: luka akan dibatalkan.</span>':''}`:`<button class="btn" id="atkApply" type="button">Catat &amp; tutup</button>`}</div>`;
      $('atkApply').onclick=()=>{const m=MUSUH.find(x=>x.k===mk);const ket=`musuh ${m.nama} ${res.d20}${fmtMod(res.bonus)}=${res.total} vs AC ${ac}`;
        if(res.kena){if(!useShield())hurt(id,res.luka,ket)}else log(`${h.nama} menghindar (${ket})`);
        save();closeModal();renderSide()}};
    $('atkRoll').onclick=()=>tampil(d20());
    $('atkCek').onclick=()=>{const v=parseInt($('atkD').value,10);if(v>=1&&v<=20)tampil(v);else toast('Isi angka 1–20.',true)}};
  bind()}
/* ---------- Uji ability (saving throw) ---------- */
function bukaUji(id){const h=H(id);let ab='CON',dc=13;
  const isi=()=>`<h2>🎲 Uji ability ${esc(h.nama)}</h2>
    <p class="small">Dipakai saat pahlawan harus <b>menahan</b> sesuatu. Lempar <b>d20 + ability</b> ≥ DC.</p>
    <div class="uji-ab">${ABILS.map(a=>`<button type="button" class="uji-b ${a===ab?'on':''}" data-ab="${a}"><span>${ABIL_SEDERHANA[a].ikon} ${ABIL_SEDERHANA[a].n}</span><b>${fmtMod(abMod(h,a))}</b><small>${esc(UJI_CONTOH[a])}</small></button>`).join('')}</div>
    <div class="row"><span class="small">DC:</span>${[10,13,15,18,20].map(v=>`<button type="button" class="dbtn ${v===dc?'on-dc':''}" data-dc="${v}">${v}</button>`).join('')}</div>
    <div class="row"><button class="btn" id="ujiRoll" type="button">🎲 Lempar d20</button><span class="small">atau hasil dadu fisik:</span><input class="s" id="ujiD" type="number" min="1" max="20" style="width:80px" aria-label="Hasil d20"><button class="dbtn" id="ujiCek" type="button">Cek</button></div>
    <div id="ujiHasil"></div>`;
  const bind=()=>{document.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>{ab=b.dataset.ab;modal(isi());bind()});
    document.querySelectorAll('[data-dc]').forEach(b=>b.onclick=()=>{dc=+b.dataset.dc;modal(isi());bind()});
    const tampil=r=>{const m=abMod(h,ab),tot=r+m,ok=r===20||(r!==1&&tot>=dc);
      $('ujiHasil').innerHTML=`<div class="atk-res ${ok?'luput':'kena'}"><div class="atk-n">${r} ${fmtMod(m)} = <b>${tot}</b> <span>vs DC ${dc}</span></div><div class="atk-v">${ok?'BERHASIL MENAHAN':'GAGAL MENAHAN'}</div></div>
        <p class="small">Akibatnya diputuskan GM sesuai cerita (mis. gagal menahan racun = −1 ${esc(T('nyawa'))}).</p>
        <div class="actions">${ok?'':`<button class="btn red" id="ujiLuka" type="button">−1 ${esc(T('nyawa'))}</button>`}<button class="btn" id="ujiTutup" type="button">Catat &amp; tutup</button></div>`;
      const ket=`Uji ${ABIL_SEDERHANA[ab].n} (${ab}) ${r}${fmtMod(m)}=${tot} vs DC ${dc}`;
      $('ujiTutup').onclick=()=>{log(`${h.nama} ${ok?'berhasil':'gagal'} ${ket}`);save();closeModal();renderSide()};
      if($('ujiLuka'))$('ujiLuka').onclick=()=>{hurt(id,1,'gagal '+ket);save();closeModal();renderSide()}};
    $('ujiRoll').onclick=()=>tampil(d20());
    $('ujiCek').onclick=()=>{const v=parseInt($('ujiD').value,10);if(v>=1&&v<=20)tampil(v);else toast('Isi angka 1–20.',true)}};
  modal(isi());bind()}
$('playWrap').addEventListener('change',e=>{const t=e.target;if(t.dataset.q){W.sesi.quests[t.dataset.q].selesai=t.checked;log(`Quest "${t.dataset.q}" ${t.checked?'SELESAI':'dibuka lagi'}`);save();renderSide()}});
$('sbPlus').onclick=()=>{addSB(1,'diatur manual');save();renderSide()};$('sbMinus').onclick=()=>{addSB(-1,'diatur manual');save();renderSide()};
$('usePot').onclick=()=>{const id=$('potTarget').value,s=W.sesi;if(s.ramuan<1)return alert('Ramuan habis.');if(s.hati[id]>=maxH(id))return alert(H(id).nama+' masih penuh.');s.ramuan--;hurt(id,-1,'minum ramuan');save();renderSide()};
$('addItem').onclick=()=>{const v=$('itemIn').value.trim();if(!v)return;W.sesi.items.push(v);log('Didapat: '+v);$('itemIn').value='';save();renderSide()};

function useSkill(id){const h=H(id),s=W.sesi;if(s.skill[id]<=0)return;const t=h.sk.tipe||'catat',x=num(h.sk.nilai,0);
  const desc={bonus:`+${x} ke lemparan berikutnya milik ${h.nama}`,bonus_tim:`tim +${x} di Serangan Bos berikutnya`,auto_kritis:'lemparan berikutnya milik '+h.nama+' otomatis Kritis',perisai:'luka tim pada hasil berikutnya dibatalkan',pulih_semua:`semua pahlawan pulih ${x} Nyawa sekarang`,lempar_ulang:'ganti angka dadu yang ingin diulang, lalu hitung lagi sebelum Terapkan',catat:h.sk.efek||'bacakan efeknya'}[t];
  modal(`<h2>⚡ ${esc(h.sk.nama||'Skill Khusus')}</h2><p><b>${esc(h.nama)}</b> memakai skill khusus. Sisa setelah ini: <b>${s.skill[id]-1}</b> dari 3.</p>
   ${h.sk.efek?`<div class="read"><p>${esc(h.sk.efek)}</p></div>`:''}<p class="small">Efek sistem: ${esc(desc)}.</p>
   <div class="actions"><button class="btn" id="mOk">Pakai</button><button class="dbtn" id="mNo">Batal</button></div>`);
  $('mNo').onclick=closeModal;
  $('mOk').onclick=()=>{s.skill[id]--;s.pending[id]=s.pending[id]||{};
    if(t==='bonus')s.pending[id].bonus=(s.pending[id].bonus||0)+x;
    if(t==='bonus_tim')s.pending[id].bonus_tim=(s.pending[id].bonus_tim||0)+x;
    if(t==='auto_kritis')s.pending[id].kritis=true;
    if(t==='perisai')s.pending[id].perisai=true;
    if(t==='pulih_semua')party().forEach(p=>hurt(p,-x,h.sk.nama||'skill'));
    log(`${h.nama} memakai ${h.sk.nama||'Skill Khusus'} (sisa ${s.skill[id]}/3)`);save();closeModal();renderSide();refreshRoller()};
}
function useSacrifice(id){const h=H(id),s=W.sesi,cost=num(h.sp.biaya,1),pola=h.sp.pola||'lain';
  if(s.hati[id]<cost)return alert(`${h.nama} tidak punya cukup Nyawa (${cost}).`);
  const others=party().filter(p=>p!==id);
  modal(`<h2>♥ ${esc(h.sp.nama||'Skill Pengorbanan')}</h2><p><b>${esc(h.nama)}</b> mengorbankan <b>${cost} Nyawa</b>.</p>
   ${h.sp.efek?`<div class="read"><p>${esc(h.sp.efek)}</p></div>`:''}
   ${pola==='tumbal'?`<div class="field"><label for="mTarget">Rekan yang diselamatkan (pulih 2 Nyawa)</label><select id="mTarget">${others.map(p=>`<option value="${esc(p)}">${esc(H(p).nama)} (${s.hati[p]}/${maxH(p)})</option>`).join('')}</select></div>`:''}
   ${pola==='putar'?'<p class="small">Setelah menekan Korbankan: ganti angka dadu yang ingin diulang di kalkulator, lalu hitung lagi. Atau pulihkan efek buruk sebelumnya secara manual.</p>':''}
   ${cost>=s.hati[id]?'<div class="warn">Pahlawan ini akan Tumbang setelah berkorban.</div>':''}
   <div class="actions"><button class="btn" id="mOk">Korbankan</button><button class="dbtn" id="mNo">Batal</button></div>`);
  $('mNo').onclick=closeModal;
  $('mOk').onclick=()=>{hurt(id,cost,h.sp.nama||'pengorbanan');
    if(pola==='tumbal'&&$('mTarget')){const tg=$('mTarget').value;hurt(tg,-2,`diselamatkan ${h.nama}`)}
    log(`${h.nama} memakai ${h.sp.nama||'Skill Pengorbanan'}`);save();closeModal();renderSide()};
}

/* ---------- scene ---------- */
function scn(){return W.story.adegan[W.sesi.cur]}
function renderScene(){
  const s=W.sesi;
  if(s.ended){renderEnding();return}
  const a=scn();
  $('scnSel').innerHTML=W.story.adegan.map((x,i)=>`<option value="${i}" ${i===s.cur?'selected':''}>Adegan ${x.no} — ${esc(x.judul)}${s.done[x.no]?' ✓':''}</option>`).join('');
  $('prevScn').disabled=s.cur===0;$('nextScn').disabled=s.cur>=W.story.adegan.length-1;
  const paras=String(a.narasi).split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
  s.matiDone=s.matiDone||{};let fateMsg='';
  if(a.mati&&a.mati.length){const done=s.matiDone[a.no];
    fateMsg=`<div class="fate">☠ <b>Takdir:</b> ${esc(a.mati.map(p=>H(p).nama).join(', '))} gugur di adegan ini. ${done?'Nyawanya sudah habis dan tidak bisa dipulihkan.':'Takdir berlaku otomatis saat kelompok tiba di adegan ini lewat tombol Lanjut.'} Bacakan kematiannya dari narasi di bawah.${done?'':' <button class="dbtn" id="applyFate" style="margin-left:6px">Terapkan takdir sekarang</button>'}</div>`}
  $('scene').innerHTML=`<details class="gm"><summary>📜 Ringkasan cerita keseluruhan (khusus GM)</summary>${summaryHTML(W.story)}</details>
    <h2 style="margin-top:6px">Adegan ${a.no} — ${esc(a.judul)}</h2>
    <p class="small"><b>Latar untuk GM</b> — hayati sebelum membacakan narasi.${a.ringkas?` <i>${esc(a.ringkas)}</i>`:''}</p>
    ${latarBox(a.latar)}${fateMsg}
    ${a.hasil_wajib?`<div class="fate">⚑ <b>Hasil wajib (${esc(a.hasil_wajib.tipe==='kalah_naratif'?'kalah naratif':a.hasil_wajib.tipe)}):</b> hasil adegan ini sudah ditentukan plot. Skill Bantuan, Skill Check, dan Skill Khusus hanya mengurangi besar kerugian, tidak membatalkannya. Melewati Serangan Bos tidak berlaku.</div>`:''}
    ${passiveBox(a)}
    <div class="read">${paras||'<p>(tidak ada narasi)</p>'}</div>
    ${a.quest&&a.quest.ada?`<div class="quest"><b>Quest: ${esc(a.quest.nama)}</b>${a.quest.tujuan?` — ${esc(a.quest.tujuan)}`:''}${a.quest.reward?`<br><i>Reward: ${esc(a.quest.reward)}</i>`:''}</div>`:''}
    ${a.catatan_gm?`<details class="gm"><summary>Catatan GM (jangan dibacakan)</summary><p>${esc(a.catatan_gm)}</p></details>`:''}
    ${eventPanel(a)}
    <h3>Pilihan pemain</h3>
    ${a.opsi.map((o,j)=>`<div class="opt" id="opt${j}"><h4>${esc(o.kode)}. ${esc(o.aksi||'')}<span class="tagk t-${o.jenis}">${lbl(o.jenis)}</span></h4>
      <div class="small">${optMeta(o)}</div>
      ${o.berhasil?`<div class="res"><b style="color:var(--moss)">Berhasil:</b> ${esc(o.berhasil)}</div>`:''}
      ${o.berhasil_bersih?`<div class="res"><b style="color:var(--moss)">Berhasil bersih:</b> ${esc(o.berhasil_bersih)}</div>`:''}
      ${o.berhasil_komplikasi?`<div class="res"><b style="color:var(--amber)">Berhasil dengan komplikasi:</b> ${esc(o.berhasil_komplikasi)}</div>`:''}
      ${o.gagal?`<div class="res"><b style="color:var(--blood)">Gagal:</b> ${esc(o.gagal)}</div>`:''}
      ${o.gagal_total?`<div class="res"><b style="color:#5b0f0c">Gagal berat:</b> ${esc(o.gagal_total)}</div>`:''}
      <div class="actions"><button class="btn alt" data-play="${j}">Mainkan opsi ini</button></div></div>`).join('')}
    <div id="roller"></div>`;
  $('scene').querySelectorAll('[data-play]').forEach(b=>b.onclick=()=>openRoller(+b.dataset.play));
  if($('applyFate'))$('applyFate').onclick=()=>{applyFate(a);save();renderSide();renderScene()};
  bindEvent(a);renderLayarBar();bus.emit('scene',layarScene(a));
}
function passiveBox(a){const al=party().filter(p=>!dead(p));const sk=(a.pasif&&a.pasif.skill)||'Perception';
  const has=al.some(p=>H(p).ability);if(!has&&!a.pasif)return '';
  const rows=al.map(p=>{const h=H(p);if(!h.ability)return `${esc(h.nama)} —`;const v=passiveOf(h,sk);const ok=a.pasif?v>=a.pasif.dc:null;return `${esc(h.nama)} <b>${v}</b>${ok===true?' ✓':ok===false?' ✗':''}`});
  const pass=a.pasif?al.filter(p=>H(p).ability&&passiveOf(H(p),sk)>=a.pasif.dc):[];
  return `<details class="gm" ${a.pasif?'open':''}><summary>👁 ${esc(sk)} pasif (khusus GM, tanpa efek angka)</summary><p class="small" style="margin:4px 0">${rows.join(' · ')}${a.pasif?` · DC ${esc(a.pasif.dc)}`:''}</p>
    ${a.pasif?(pass.length?`<div class="ok" style="margin:4px 0"><b>${esc(pass.map(p=>H(p).nama).join(', '))}</b> menyadari: ${esc(a.pasif.info||'(petunjuk tambahan)')}</div>`:'<div class="small">Tidak ada yang menyadari petunjuk tersembunyi.</div>'):''}</details>`}
function optMeta(o){const p=o.pelaku.map(x=>H(x).nama).join(', ');const tn=k=>{const t=tierOf(k);return t?`${t.n} (${dStr(t.d)})`:'?'};
  if(o.jenis==='solo')return `${esc(p||'pilih pelaku')} · ${tn(o.tingkat)}`;
  if(o.jenis==='kelompok')return `Semua pahlawan · ${tn(o.tingkat)}`;
  if(o.jenis==='bos'&&o.bos){const t=tierOf(o.bos.tingkat,BOSS_TIERS);return `${esc(o.bos.nama||'Bos')}: ${t?t.n+' ('+dStr(t.d)+' per pahlawan)':'?'}${num(o.bos.tambahan)?' + '+num(o.bos.tambahan):''} (+${num(W.sys.sbBos,2)} per stack)`}
  if(o.jenis==='duel')return `${esc(p||'pilih juara')} melawan ${esc(o.lawan&&o.lawan.nama||'lawan')} · ${tn(o.lawan&&o.lawan.tingkat)}${num(o.lawan&&o.lawan.bonus)?' + '+num(o.lawan.bonus):''}, 3 ronde`;
  if(o.jenis==='skill_khusus')return `Skill Khusus milik ${esc(p||'?')} (memakai 1 dari 3 jatah)`;
  if(o.jenis==='pengorbanan')return `Skill Pengorbanan milik ${esc(p||'?')} (bayar Nyawa)`;
  if(o.jenis==='skill_cek'){const sc=o.skill_check||{};return `${esc(p||'pilih pelaku')} · ${esc(sc.skill)} DC ${esc(sc.dc)}${sc.passive?' · pasif (tanpa lempar)':''}${sc.advantage?` · ${sc.advantage==='adv'?'Advantage':'Disadvantage'}`:''}`}
  if(o.jenis==='kontes'){const k=o.kontes||{};return `${esc(p||'pilih pelaku')} (${esc(k.skill)}) melawan ${esc(k.lawan)}${k.lawan_skill?` (${esc(k.lawan_skill)})`:''} ${fmtMod(num(k.lawan_mod))} · 1 lemparan`}
  if(o.jenis==='skill_bantuan'){const sc=o.skill_check||{},ef=o.efek_jika_berhasil||{};return `${esc(p||'pilih pelaku')} · ${esc(sc.skill)} DC ${esc(sc.dc)} · jika berhasil: ${esc(aidLabel(ef.tipe))}${['turun_tingkat','kurangi_bos','bonus_tim','nyawa_semua'].includes(ef.tipe)?' '+ef.besar:''} (untuk tantangan berikutnya di adegan ini)`}
  return 'Tanpa lemparan dadu';}
/* ---------- kejadian acak ---------- */
function eventRows(a){const bs=bands(G().kejadian);const own=(a.kejadian||[]).slice().sort((x,y)=>x.dari-y.dari);
  if(own.length)return own;return bs.map(b=>({dari:b.a,sampai:b.z,jenis:b.j,teks:EV_TEXT[b.j],efek:EV_DEFAULT[b.j],umum:true}))}
function findEvent(a,v){const rows=eventRows(a);let r=rows.find(x=>v>=x.dari&&v<=x.sampai);
  if(!r){const b=bands(G().kejadian).find(x=>v>=x.a&&v<=x.z)||{j:'tenang'};r={dari:v,sampai:v,jenis:b.j,teks:EV_TEXT[b.j],efek:EV_DEFAULT[b.j],umum:true}}return r}
function evEfekText(ef){ef=ef||{};const t=[];const n=k=>num(ef[k]);
  if(n('nyawa_acak'))t.push(`satu pahlawan acak ${n('nyawa_acak')>0?'+':''}${n('nyawa_acak')} Nyawa`);
  if(n('nyawa_semua'))t.push(`semua ${n('nyawa_semua')>0?'+':''}${n('nyawa_semua')} Nyawa`);
  if(n('stack'))t.push(`Stack ${n('stack')>0?'+':''}${n('stack')}`);
  if(n('ramuan'))t.push(`Ramuan ${n('ramuan')>0?'+':''}${n('ramuan')}`);
  if(n('tingkat'))t.push(`tantangan berikutnya ${n('tingkat')>0?'naik':'turun'} ${Math.abs(n('tingkat'))} tingkat`);
  if(ef.item)t.push(`dapat: ${ef.item}`);if(ef.adv)t.push(`Advantage untuk ${ef.adv==='acak'?'pahlawan acak':H(slug(ef.adv)).nama}`);if(ef.dis)t.push(`Disadvantage untuk ${ef.dis==='acak'?'pahlawan acak':H(slug(ef.dis)).nama}`);return t.join(' · ')||'tanpa efek'}
function eventPanel(a){const rows=eventRows(a);
  return `<div class="event"><div class="row" style="justify-content:space-between;margin:0"><div><b>Kejadian Acak (d100)</b><div class="small">Lempar d10 persen + d10 hanya jika GM mau. 00 + 0 = 100.</div></div>
   <div class="row" style="margin:0"><span style="display:flex;gap:4px"><input class="die" id="evDie" type="number" data-min="1" data-max="100" data-dice="d100" aria-label="Hasil d100"><button class="dbtn" data-acak="1" type="button">Acak</button></span><button class="btn alt" id="evCheck">Cek kejadian</button></div></div>
   <div id="evOut"></div>
   <details class="gm"><summary>Lihat tabel kejadian adegan ini${rows[0]&&rows[0].umum?' (tabel umum genre)':''}</summary>
   <div class="scroll"><table class="grid" style="font-size:13.5px"><tr><th>d100</th><th>Jenis</th><th>Kejadian</th><th>Efek</th></tr>${rows.map(r=>`<tr><td>${pad2(r.dari)}${r.sampai!==r.dari?'–'+pad2(r.sampai):''}</td><td>${EV_TYPES[r.jenis]}</td><td>${esc(r.teks)}</td><td class="small">${esc(evEfekText(r.efek))}</td></tr>`).join('')}</table></div></details></div>`}
function bindEvent(a){$('evCheck').onclick=()=>{const v=dv($('evDie'));if(!v)return alert('Isi hasil d100 (1–100).');const r=findEvent(a,v);
  $('evOut').innerHTML=`<div class="verdict"><div class="vhead ev-${r.jenis}">${v}: ${EV_TYPES[r.jenis]}<small>Kejadian acak Adegan ${a.no}</small></div><div class="vbody"><div class="read"><p>${esc(r.teks)}</p></div><p><b>Efek:</b> ${esc(evEfekText(r.efek))}</p><div class="actions"><button class="btn" id="evApply">Terapkan efek</button></div></div></div>`;
  $('evApply').onclick=e=>{applyEvent(r.efek||{},`kejadian ${v}`);log(`Kejadian acak ${v} (${EV_TYPES[r.jenis]}): ${r.teks.slice(0,60)}`);e.target.disabled=true;save();renderSide();refreshRoller()}}}
function applyEvent(ef,why){const s=W.sesi;const n=k=>num(ef[k]);
  if(n('nyawa_acak')){const pool=party().filter(p=>n('nyawa_acak')<0?!down(p):S_hati(p)<maxH(p));const pick=pool[Math.floor(Math.random()*pool.length)];if(pick)hurt(pick,-n('nyawa_acak'),why)}
  if(n('nyawa_semua'))party().forEach(p=>{if(n('nyawa_semua')>0||!down(p))hurt(p,-n('nyawa_semua'),why)});
  if(n('stack'))addSB(n('stack'),why);
  if(n('ramuan')){s.ramuan=Math.max(0,s.ramuan+n('ramuan'));log(`Ramuan ${n('ramuan')>0?'+':''}${n('ramuan')} (${why})`)}
  if(n('tingkat')){s.shift=clamp((s.shift||0)+n('tingkat'),-3,3);log(`Tantangan berikutnya ${n('tingkat')>0?'naik':'turun'} ${Math.abs(n('tingkat'))} tingkat (${why})`)}
  if(ef.item){s.items.push(ef.item);log('Didapat: '+ef.item)}setAdvFx(ef,why)}
const S_hati=p=>W.sesi.hati[p];
$('scnSel').onchange=()=>{W.sesi.cur=+$('scnSel').value;save();renderScene()};
$('prevScn').onclick=()=>{W.sesi.cur=Math.max(0,W.sesi.cur-1);save();renderScene()};
$('nextScn').onclick=()=>{W.sesi.cur=Math.min(W.story.adegan.length-1,W.sesi.cur+1);save();renderScene()};
$('toEnding').onclick=()=>{if(confirm('Tuju ending sekarang?')){W.sesi.ended=true;log('Menuju ending');save();renderScene()}};
function applyFate(a){const s=W.sesi;s.matiDone=s.matiDone||{};if(!a||!a.mati||!a.mati.length||s.matiDone[a.no])return;s.matiDone[a.no]=true;a.mati.forEach(p=>kill(p,`takdir Adegan ${a.no}`))}
function goNext(n){const s=W.sesi;const a=scn();s.done[a.no]=true;
  if(!n||n<=0){const idx=s.cur+1;if(n===0||idx>=W.story.adegan.length){s.ended=true;log('Cerita selesai');save();renderScene();window.scrollTo({top:0,behavior:'smooth'});return}s.cur=idx}
  else{const idx=W.story.adegan.findIndex(x=>x.no===n);if(idx<0){s.ended=true}else s.cur=idx}
  log(`Lanjut ke ${s.ended?'Ending':'Adegan '+W.story.adegan[s.cur].no}`);if(!s.ended)applyFate(W.story.adegan[s.cur]);save();renderSide();renderScene();window.scrollTo({top:0,behavior:'smooth'})}
function nextLabel(n){if(n===0)return 'Menuju Ending';if(!n){const idx=W.sesi.cur+1;return idx>=W.story.adegan.length?'Menuju Ending':`Lanjut ke Adegan ${W.story.adegan[idx].no}`}return `Lanjut ke Adegan ${n}`}
function renderEnding(){const e=curEnding(),s=W.sesi;
  $('scnSel').innerHTML=`<option>Ending</option>`;$('prevScn').disabled=false;$('nextScn').disabled=true;
  $('prevScn').onclick=()=>{s.ended=false;save();renderScene();$('prevScn').onclick=()=>{s.cur=Math.max(0,s.cur-1);save();renderScene()}};
  const qs=Object.entries(s.quests);
  $('scene').innerHTML=`<h2 style="margin-top:6px">${esc(e?e.nama:'Ending')}</h2>
   <p class="small">Stack Bayangan akhir: <b>${s.sb}</b></p>
   <div class="read">${e&&e.epilog?String(e.epilog).split(/\n\s*\n/).map(p=>`<p>${esc(p)}</p>`).join(''):'<p>(Tidak ada epilog di data cerita. Ceritakan sendiri akhir kisah ini.)</p>'}</div>
   <h3>Ringkasan</h3>
   <div class="scroll"><table class="grid"><tr><th>Pahlawan</th><th>Nyawa</th><th>Skill Khusus tersisa</th></tr>${party().map(id=>`<tr><td>${esc(H(id).nama)}</td><td>${dead(id)?'☠ Gugur':`${s.hati[id]}/${maxH(id)}`}</td><td>${s.skill[id]}/3</td></tr>`).join('')}</table></div>
   <p>Quest selesai: ${qs.filter(([,q])=>q.selesai).length} dari ${qs.length}. Barang: ${s.items.length?s.items.map(esc).join(', '):'-'}.</p>
   <h3>Semua ending</h3><ul>${endings().map(x=>`<li><b>${esc(x.nama)}</b> (Stack ≤ ${x.maks})</li>`).join('')}</ul>
   ${endingExtras()}`;
  bindEndingExtras();bus.emit('scene',{type:'ending',judul:e?e.nama:'Ending',epilog:e&&e.epilog||'',cerita:W.story.judul||''});
}

/* ---------- roller ---------- */
let RC=null;
function heroOpts(def){return party().map(p=>`<option value="${esc(p)}" ${p===def?'selected':''}>${esc(H(p).nama)} (${dStr(poolOf(p))} +${bonusOf(p)})${down(p)?' — Tumbang':''}</option>`).join('')}
function tierSel(id,list,cur){return `<select class="s" id="${id}">${list.map(t=>`<option value="${t.k}" ${t.k===cur?'selected':''}>${t.n} (${dStr(t.d)})</option>`).join('')}</select>`}
function effTier(k,list,jenis){const sh=(W.sesi.shift||0)+(jenis?aidShift(jenis):0);return sh?shiftTier(k,sh,list):k}
function openRoller(j){const a=scn(),o=a.opsi[j];RC={o,j};
  document.querySelectorAll('.opt').forEach((el,k)=>el.classList.toggle('chosen',k===j));
  log(`Adegan ${a.no}: memilih ${o.kode}. ${o.aksi||''}`);save();renderSide();
  const r=$('roller');const alive=party().filter(p=>!down(p));
  const def=o.pelaku.find(p=>party().includes(p))||alive[0]||party()[0];
  const sh=W.sesi.shift||0;const ax=aidFor(o.jenis);let shNote=sh&&o.jenis!=='skill_bantuan'&&o.jenis!=='kontes'?`<div class="${sh>0?'warn':'ok'}" style="margin:6px 0">Kejadian acak / akibat sebelumnya: tingkat ${sh>0?'naik':'turun'} ${Math.abs(sh)} (sudah diterapkan di pilihan tingkat).</div>`:'';
  if(ax)shNote+=`<div class="ok" style="margin:6px 0">Skill Bantuan ${esc(H(ax.dari).nama)} (${esc(ax.skill)}): <b>${esc(aidDesc(ax))}</b>${ax.tipe==='turun_tingkat'?' — sudah diterapkan di pilihan tingkat':ax.tipe==='kurangi_bos'?' — sudah dikurangi dari nilai tambahan':ax.tipe==='bonus_tim'?' — otomatis dihitung':''}.</div>`;
  if(a.hasil_wajib)shNote+=`<div class="warn" style="margin:6px 0">Adegan ber-hasil wajib: hasil ini hanya menentukan besar kerugian.</div>`;
  let h=`<div class="roller"><h3 style="margin-top:0">${esc(o.kode)}. ${esc(o.aksi||'')} <span class="tagk t-${o.jenis}">${lbl(o.jenis)}</span></h3>`;
  if(o.jenis==='solo'){const tk=effTier(o.tingkat,TIERS,'solo'),t=tierOf(tk);const md=advModeOf(def);
    h+=`${shNote}<div class="row"><div class="field"><label>Pelaku</label><select class="s" id="rHero">${heroOpts(def)}</select></div><div class="field"><label>Tingkat kesulitan</label>${tierSel('rTier',TIERS,tk)}</div></div>
     <div class="row">${advSel(md)}<div class="field"><label>Dadu pemain <span class="dlabel" id="rPoolLbl"></span></label>${dieInput('pd',poolOf(def),'id="rDie"')}</div>
     <div class="field" id="rDie2Wrap" style="${md==='normal'?'display:none':''}"><label>Lemparan kedua</label>${dieInput('pd',poolOf(def),'id="rDie2"')}</div>
     <div class="field"><label>Dadu GM <span class="dlabel" id="rTierLbl">${dStr(t.d)}</span></label>${dieInput('cd',t.d,'id="rCh"')}</div>
     <div class="field"><label>Bonus tambahan</label><input class="s" type="number" id="rMod" value="0" style="width:80px"></div></div>
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button></div>`;
  } else if(o.jenis==='kelompok'){const tk=effTier(o.tingkat,TIERS,'kelompok'),t=tierOf(tk);
    h+=`${shNote}<div class="row"><div class="field"><label>Tingkat kesulitan</label>${tierSel('rTier',TIERS,tk)}</div>
      <div class="field"><label>Dadu GM (sekali untuk semua) <span class="dlabel" id="rTierLbl">${dStr(t.d)}</span></label>${dieInput('cd',t.d,'id="rCh"')}</div></div>
     ${heroTableRows(true)}
     <div class="row" style="margin-top:8px"><div class="field"><label>Bonus tambahan tiap pahlawan</label><input class="s" type="number" id="rMod" value="0" style="width:80px"></div></div>
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button><button class="dbtn" id="rAll">Acak semua</button></div>`;
  } else if(o.jenis==='bos'){const b=o.bos||{};const tk=effTier(b.tingkat||'bos_kuat',BOSS_TIERS,'bos');const kb=ax&&ax.tipe==='kurangi_bos'?ax.besar:0;
    h+=`${shNote}<div class="row"><div class="field"><label>Bos</label><b>${esc(b.nama||'Bos')}</b></div><div class="field"><label>Tingkat bos</label>${tierSel('rTier',BOSS_TIERS,tk)}</div>
      <div class="field"><label>Nilai tambahan bos</label><input class="s" type="number" id="rBase" value="${esc(num(b.tambahan,0)-kb)}" style="width:90px"></div></div>
     <div class="field"><label>Dadu bos (GM melempar satu set per pahlawan yang ikut, ketik TOTAL per jenis dadu)</label><div class="row" id="rBossDice" style="margin:0"></div></div>
     ${heroTableRows(false)}
     <div class="row" style="margin-top:8px"><div class="field"><label>Bonus tim tambahan</label><input class="s" type="number" id="rMod" value="0" style="width:80px"></div></div>
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button><button class="dbtn" id="rAll">Acak semua</button>${ax&&ax.tipe==='lewati_bos'?`<button class="btn green" id="rSkip" type="button">Lewati Serangan Bos (Persuasion)</button>`:''}</div>`;
  } else if(o.jenis==='duel'){const L=o.lawan||{};const tk=effTier(L.tingkat||'sulit',TIERS,'duel'),t=tierOf(tk);const md=advModeOf(def);
    h+=`${shNote}<div class="row"><div class="field"><label>Juara</label><select class="s" id="rHero">${heroOpts(def)}</select></div><div class="field"><label>Lawan</label><b>${esc(L.nama||'Lawan')}</b></div>
      <div class="field"><label>Tingkat lawan</label>${tierSel('rTier',TIERS,tk)}</div><div class="field"><label>Bonus lawan</label><input class="s" type="number" id="rLB" value="${esc(num(L.bonus,0))}" style="width:80px"></div>${advSel(md)}</div>
     <p class="small" style="margin:0 0 6px">Advantage/Disadvantage berlaku untuk <b>ronde 1</b> (lemparan berikutnya juara).</p>
     <div class="scroll"><table class="grid" id="rTbl"><tr><th>Ronde</th><th>Dadu juara <span class="dlabel" id="rPoolLbl"></span></th><th>Dadu lawan <span class="dlabel" id="rTierLbl">${dStr(t.d)}</span></th><th>Nilai</th><th>Pemenang</th></tr>
     ${[1,2,3].map(n=>`<tr><td><b>${n}</b></td><td>${dieInput('dp',poolOf(def))}${n===1?`<div class="dp2wrap" style="margin-top:4px;${md==='normal'?'display:none':''}">${dieInput('dp dp2',poolOf(def))}</div>`:''}</td><td>${dieInput('dk',t.d)}</td><td class="dvv">–</td><td class="dw"></td></tr>`).join('')}</table></div>
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button><button class="dbtn" id="rAll">Acak semua</button></div>`;
  } else if(o.jenis==='skill_cek'||o.jenis==='skill_bantuan'){const sc=o.skill_check||{};const isAid=o.jenis==='skill_bantuan';
    const tk0=sc.tingkat||dcTierOf(sc.dc);const shv=isAid?0:(W.sesi.shift||0)+aidShift('skill_cek');const tk=shv?shiftTier(tk0,shv):tk0;const dc0=clamp(num(sc.dc,DC_TABLE[tk0])+5*(shv),1,40);
    const md=advModeOf(def,sc.advantage);
    h+=`${shNote}<div class="row"><div class="field"><label>Pelaku</label><select class="s" id="rHero">${heroOpts(def)}</select></div>
      <div class="field"><label>Skill</label><select class="s" id="rSkill">${SKILLS.map(k=>`<option value="${esc(k.n)}" ${k.n===sc.skill?'selected':''}>${esc(k.n)} (${k.a})</option>`).join('')}</select></div>
      <div class="field"><label>Tingkat (DC)</label><select class="s" id="rTierDC">${TIERS.map(t=>`<option value="${t.k}" ${t.k===tk?'selected':''}>${t.n} (DC ${DC_TABLE[t.k]})</option>`).join('')}</select></div>
      <div class="field"><label>DC</label><input class="s" type="number" id="rDC" value="${dc0}" style="width:70px"></div></div>
     <div class="row">${advSel(md)}${isAid?'':`<label class="chk" style="margin-bottom:8px"><input type="checkbox" id="rPassive" ${sc.passive?'checked':''}> Pasif (tanpa lempar: 10 + mod)</label>`}</div>
     <div class="row" id="rD20Row"><div class="field"><label>d20 pemain</label>${dieInput('pd',[20],'id="rD1"')}</div><div class="field" id="rD2Wrap" style="${md==='normal'?'display:none':''}"><label>d20 kedua</label>${dieInput('pd',[20],'id="rD2"')}</div>
      <div class="field"><label>Bonus situasional</label><input class="s" type="number" id="rMod" value="0" style="width:80px"></div></div>
     <div id="rSkInfo" class="small"></div>
     ${isAid?`<div class="hint" id="rAidInfo"></div>`:''}
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button></div>`;
  } else if(o.jenis==='kontes'){const k=o.kontes||{};const md=advModeOf(def);
    h+=`<div class="row"><div class="field"><label>Pelaku</label><select class="s" id="rHero">${heroOpts(def)}</select></div>
      <div class="field"><label>Skill pelaku</label><select class="s" id="rSkill">${SKILLS.map(x=>`<option value="${esc(x.n)}" ${x.n===k.skill?'selected':''}>${esc(x.n)} (${x.a})</option>`).join('')}</select></div>
      <div class="field"><label>Lawan</label><b>${esc(k.lawan||'Lawan')}</b>${k.lawan_skill?`<span class="small">${esc(k.lawan_skill)}</span>`:''}</div>
      <div class="field"><label>Mod lawan</label><input class="s" type="number" id="rLM" value="${esc(num(k.lawan_mod,0))}" style="width:70px"></div></div>
     <div class="row">${advSel(md)}<div class="field"><label>d20 pelaku</label>${dieInput('pd',[20],'id="rD1"')}</div><div class="field" id="rD2Wrap" style="${md==='normal'?'display:none':''}"><label>d20 kedua</label>${dieInput('pd',[20],'id="rD2"')}</div>
      <div class="field"><label>d20 lawan (GM)</label>${dieInput('cd',[20],'id="rDL"')}</div><div class="field"><label>Bonus situasional</label><input class="s" type="number" id="rMod" value="0" style="width:80px"></div></div>
     <div id="rSkInfo" class="small"></div><p class="small">Nilai sama dimenangkan lawan. Tidak ada Nyawa yang dipertaruhkan kecuali tertulis di akibat.</p>
     <div id="rPend" class="small"></div><div class="actions"><button class="btn" id="rCalc">Hitung</button><button class="dbtn" id="rAll">Acak semua</button></div>`;
  } else {const p=o.pelaku.map(x=>H(x));
    h+=`<p>${o.jenis==='skill_khusus'?`Opsi ini memakai <b>Skill Khusus</b> ${esc(p.map(x=>x.nama+' ('+(x.sk.nama||'')+')').join(', '))}. Jatahnya berkurang 1.`:o.jenis==='pengorbanan'?`Opsi ini memakai <b>Skill Pengorbanan</b> ${esc(p.map(x=>x.nama+' ('+(x.sp.nama||'')+')').join(', '))}. Nyawa pemakai berkurang sesuai biaya.`:'Pilihan ini tidak memakai dadu.'}</p>
     <div class="actions"><button class="btn" id="rCalc">Jalankan pilihan ini</button></div>`;}
  h+=`<div id="rOut"></div></div>`;r.innerHTML=h;
  if($('rHero'))$('rHero').onchange=()=>{const id=$('rHero').value;r.querySelectorAll('#rDie,#rDie2,.dp').forEach(inp=>setDice(inp,poolOf(id)));if($('rAdv'))$('rAdv').value=advModeOf(id,o.skill_check&&o.skill_check.advantage);advToggle();updLabels();refreshRoller();previewRows();skInfo()};
  if($('rAdv'))$('rAdv').onchange=()=>{advToggle();skInfo()};
  if($('rSkill'))$('rSkill').onchange=skInfo;if($('rTierDC'))$('rTierDC').onchange=()=>{$('rDC').value=DC_TABLE[$('rTierDC').value];skInfo()};
  if($('rDC'))$('rDC').oninput=skInfo;if($('rPassive'))$('rPassive').onchange=()=>{$('rD20Row').style.opacity=$('rPassive').checked?.45:1;skInfo()};if($('rLM'))$('rLM').oninput=skInfo;
  if($('rSkip'))$('rSkip').onclick=skipBoss;
  if($('rTier'))$('rTier').onchange=()=>{const list=o.jenis==='bos'?BOSS_TIERS:TIERS;const t=tierOf($('rTier').value,list);if(o.jenis==='bos')renderBossDice();else r.querySelectorAll('#rCh,.dk').forEach(inp=>setDice(inp,t.d));updLabels();previewRows()};
  if($('rAll'))$('rAll').onclick=()=>{r.querySelectorAll('input.die').forEach(inp=>{const tr=inp.closest('tr[data-id]');if(tr&&!tr.querySelector('.in').checked)return;inp.value=inp.dataset.dice==='d100'?rollD100():rollArr(inp.dataset.dice.split(',').map(Number));dv(inp)});previewRows()};
  r.addEventListener('input',previewRows);
  r.addEventListener('change',e=>{if(e.target.classList.contains('in')&&o.jenis==='bos')renderBossDice();previewRows();refreshRoller()});
  if(o.jenis==='bos')renderBossDice();
  $('rCalc').onclick=calc;rollerExtras(o);updLabels();refreshRoller();previewRows();skInfo();if($('rPassive')&&$('rPassive').checked)$('rD20Row').style.opacity=.45;r.scrollIntoView({behavior:'smooth',block:'start'});
}
function advToggle(){if(!$('rAdv'))return;const on=$('rAdv').value!=='normal';['rDie2Wrap','rD2Wrap'].forEach(i=>{if($(i))$(i).style.display=on?'':'none'});document.querySelectorAll('.dp2wrap').forEach(el=>el.style.display=on?'':'none')}
function skInfo(){if(!RC||!$('rSkInfo'))return;const o=RC.o,id=$('rHero').value,h=H(id),n=$('rSkill').value;const ab=skAbil(n),am=abMod(h,ab),pr=isProf(h,n)?profB():0,pd=W.sesi.pending[id]||{};
  const tot=am+pr+(pd.bonus||0);
  $('rSkInfo').innerHTML=h.ability?`Mod ${esc(n)}: <b>${fmtMod(tot)}</b> = ${ab} ${fmtMod(am)}${pr?` + Proficiency ${pr}`:' (tidak proficient)'}${pd.bonus?` + Skill Khusus ${pd.bonus}`:''}${o.jenis==='kontes'?` · lawan d20 ${fmtMod(num($('rLM').value))}`:''}${$('rPassive')&&$('rPassive').checked?` · nilai pasif ${10+tot+($('rAdv').value==='adv'?5:$('rAdv').value==='dis'?-5:0)} vs DC ${num($('rDC').value)}`:''}`:'<span style="color:var(--wax)">Pahlawan ini belum punya ability. Isi di tab 1 (Acak ability), atau hitung dengan mod 0.</span>';
  if($('rAidInfo')){const ef=o.efek_jika_berhasil||{};const tk=dcTierOf(num($('rDC').value,15));const cap=aidCap(ef.tipe,tk);const bes=ef.tipe==='info'?0:Math.min(ef.besar||0,cap);
    const own=o.efek_gagal&&Object.keys(o.efek_gagal).filter(k=>k!=='mati'&&o.efek_gagal[k]&&o.efek_gagal[k]!=='tidak').length;
    $('rAidInfo').innerHTML=`<b>Jika berhasil:</b> ${esc(aidLabel(ef.tipe))}${['turun_tingkat','kurangi_bos','bonus_tim','nyawa_semua'].includes(ef.tipe)?` <b>${bes}</b>`:''}${ef.tipe!=='info'&&cap===0?' <span style="color:var(--wax)">(tidak boleh di DC ini — hanya info)</span>':ef.besar>cap&&ef.tipe!=='info'?` <span class="small">(dibatasi DC ${esc(tierOf(tk).n)})</span>`:''}
      <br><b>Jika gagal:</b> ${own?esc(efekText(o.efek_gagal,false)):esc(aidFailOpts(tk).map(x=>x.t).join(' ATAU '))+' (aturan 15)'}<br><span class="small">Satu efek per adegan, tidak ditumpuk.</span>`}}
function heroTableRows(withRes){return `<div class="scroll"><table class="grid" id="rTbl"><tr><th>Ikut</th><th>Pahlawan</th><th>Dadu kelas</th><th>Bonus</th><th>Hasil dadu</th><th style="text-align:right">Nilai</th>${withRes?'<th>Hasil</th>':''}</tr>
  ${party().map(p=>`<tr data-id="${esc(p)}"><td><input type="checkbox" class="in" ${down(p)?'disabled':'checked'} aria-label="${esc(H(p).nama)} ikut"></td><td><b>${esc(H(p).nama)}</b><div class="small pb"></div></td><td class="dlabel">${dStr(poolOf(p))}</td><td>+${bonusOf(p)}</td>
  <td>${dieInput('d',poolOf(p),`aria-label="Dadu ${esc(H(p).nama)}"`)}</td><td class="tot v">–</td>${withRes?'<td class="rs"></td>':''}</tr>`).join('')}</table></div>`}
function renderBossDice(){const t=tierOf($('rTier').value,BOSS_TIERS);const n=document.querySelectorAll('#rTbl tr[data-id] .in:checked').length||1;
  const old={};document.querySelectorAll('#rBossDice input.die').forEach(i=>old[i.dataset.sides]=i.value);
  $('rBossDice').innerHTML=t.d.map(x=>`<div class="field"><label class="dlabel">Total ${n} buah d${x} (${n}–${n*x})</label><span style="display:flex;gap:4px"><input class="die bd" type="number" data-sides="${x}" data-min="${n}" data-max="${n*x}" data-dice="${Array(n).fill(x).join(',')}" value="${old[x]||''}"><button class="dbtn" data-acak="1" type="button">Acak</button></span></div>`).join('');
  document.querySelectorAll('#rBossDice input.die').forEach(dv)}
function updLabels(){if($('rHero')&&$('rPoolLbl')){const p=poolOf($('rHero').value);$('rPoolLbl').textContent=`${dStr(p)} (${p.length}–${sum(p)})`}
  if($('rTier')&&$('rTierLbl')){const t=tierOf($('rTier').value);if(t)$('rTierLbl').textContent=`${dStr(t.d)} (${t.d.length}–${sum(t.d)})`}}
function refreshRoller(){if(!RC||!$('rPend'))return;const o=RC.o,s=W.sesi;const t=[];
  if(['solo','duel','skill_cek','kontes','skill_bantuan'].includes(o.jenis)){const id=$('rHero').value,pd=s.pending[id]||{};if(pd.bonus)t.push(`Skill aktif ${H(id).nama}: +${pd.bonus}`);if(pd.kritis&&(o.jenis==='solo'||o.jenis==='duel'))t.push(`${H(id).nama}: otomatis Kritis`);if(pd.adv&&!pd.dis)t.push(`${H(id).nama}: Advantage aktif`);if(pd.dis&&!pd.adv)t.push(`${H(id).nama}: Disadvantage aktif`)}
  else party().forEach(p=>{const pd=s.pending[p]||{};if(pd.bonus)t.push(`${H(p).nama} +${pd.bonus}`);if(pd.kritis)t.push(`${H(p).nama} otomatis Kritis`);if(o.jenis==='bos'&&pd.bonus_tim)t.push(`Tim +${pd.bonus_tim} (${H(p).nama})`)});
  if(party().some(p=>(s.pending[p]||{}).perisai))t.push('Perisai aktif: luka tim berikutnya dibatalkan');
  if(o.jenis==='bos')t.push(`Stack ${s.sb} → bos +${s.sb*num(W.sys.sbBos,2)}`);
  $('rPend').innerHTML=t.length?'<b>Otomatis dihitung:</b> '+t.map(esc).join(' · '):'';}
function heroVal(id,d){const pd=W.sesi.pending[id]||{};return d+bonusOf(id)+(pd.bonus||0)}
function isCrit(id,d){return heroCrit(id,d)||!!(W.sesi.pending[id]||{}).kritis}
function isFum(id,d){return heroFum(id,d)&&!isCrit(id,d)}
function previewRows(){if(!RC)return;const o=RC.o;const ch=$('rCh')?dv($('rCh')):null;const mod=$('rMod')?num($('rMod').value):0;
  document.querySelectorAll('#rTbl tr[data-id]').forEach(tr=>{const on=tr.querySelector('.in').checked;tr.classList.toggle('off',!on);const id=tr.dataset.id;const d=dv(tr.querySelector('input.die'));
    const v=on&&d?heroVal(id,d)+(o.jenis==='kelompok'?mod:0):null;tr.querySelector('.v').textContent=v??'–';const pd=W.sesi.pending[id]||{};
    tr.querySelector('.pb').textContent=[pd.bonus?`skill +${pd.bonus}`:'',d&&isCrit(id,d)?'KRITIS':'',d&&isFum(id,d)?'GAGAL TOTAL':''].filter(Boolean).join(' · ');
    const rs=tr.querySelector('.rs');if(rs){if(!v||!ch)rs.textContent='';else{const ok=isCrit(id,d)||(!isFum(id,d)&&v>=ch);rs.innerHTML=ok?'<b style="color:var(--moss)">Lulus</b>':'<b style="color:var(--blood)">Gagal</b>'}}})}

function verdict(cls,title,sub,body,actions){$('rOut').innerHTML=`<div class="verdict"><div class="vhead ${cls}">${title}<small>${sub}</small></div><div class="vbody">${body}<div class="actions">${actions}</div></div></div>`}
function efekText(ef,ok){const t=[];if(!ef)return '';if(ef.mati&&ef.mati.length)t.push(`☠ ${ef.mati.map(p=>H(p).nama).join(', ')} gugur`);
  if(ok){if(num(ef.stack))t.push(`Stack ${num(ef.stack)>0?'+':''}${num(ef.stack)}`);if(num(ef.ramuan))t.push(`Ramuan +${num(ef.ramuan)}`);if(num(ef.nyawa_semua))t.push(`Semua ${num(ef.nyawa_semua)>0?'+':''}${num(ef.nyawa_semua)} Nyawa`);if(ef.item)t.push(`Barang: ${ef.item}`);if(ef.quest_selesai)t.push('Quest selesai'+(typeof ef.quest_selesai==='string'?': '+ef.quest_selesai:''))}
  if(num(ef.tingkat))t.push(`tantangan berikutnya ${num(ef.tingkat)>0?'naik':'turun'} ${Math.abs(num(ef.tingkat))} tingkat`);if(ef.adv)t.push('Advantage');if(ef.dis)t.push('Disadvantage');
  if(!ok){if(num(ef.stack))t.push(`Stack +${num(ef.stack)}`);const n=ef.nyawa;if(n==='gagal')t.push('Yang gagal −1 Nyawa');if(n==='semua')t.push('Semua −1 Nyawa');if(n==='pelaku')t.push('Pelaku −1 Nyawa')}
  return t.join(' · ')}
function applySuccess(ef){if(!ef)return;const s=W.sesi,a=scn();(ef.mati||[]).forEach(p=>kill(p,`takdir Adegan ${a.no}`));
  if(num(ef.stack))addSB(num(ef.stack),'hasil pilihan');if(num(ef.ramuan)){s.ramuan+=num(ef.ramuan);log(`Ramuan +${num(ef.ramuan)}`)}
  if(num(ef.nyawa_semua))party().forEach(p=>hurt(p,-num(ef.nyawa_semua),'hasil pilihan'));
  if(ef.item){s.items.push(ef.item);log('Didapat: '+ef.item)}
  if(num(ef.tingkat)){s.shift=clamp((s.shift||0)+num(ef.tingkat),-3,3);log(`Tantangan berikutnya ${num(ef.tingkat)>0?'naik':'turun'} ${Math.abs(num(ef.tingkat))} tingkat (hasil pilihan)`)}setAdvFx(ef,'hasil pilihan');
  if(ef.quest_selesai){let qn=null;if(typeof ef.quest_selesai==='string'&&s.quests[ef.quest_selesai])qn=ef.quest_selesai;
    else if(a.quest&&a.quest.nama&&s.quests[a.quest.nama]&&!s.quests[a.quest.nama].selesai)qn=a.quest.nama;
    else qn=Object.keys(s.quests).reverse().find(k=>!s.quests[k].selesai)||null;
    if(qn){s.quests[qn].selesai=true;log(`Quest "${qn}" SELESAI`)}}}
function applyFail(ef,ids){if(!ef)return;const s=W.sesi;(ef.mati||[]).forEach(p=>kill(p,`takdir Adegan ${scn().no}`));if(num(ef.stack))addSB(num(ef.stack),'akibat gagal');
  if(num(ef.tingkat)){s.shift=clamp((s.shift||0)+num(ef.tingkat),-3,3);log(`Tantangan berikutnya ${num(ef.tingkat)>0?'naik':'turun'} ${Math.abs(num(ef.tingkat))} tingkat (akibat gagal)`)}setAdvFx(ef,'akibat gagal');const n=ef.nyawa;
  if(n&&n!=='tidak'&&ids.length){if(useShield())return;ids.forEach(p=>hurt(p,1,'akibat gagal'))}}
function clearPending(ids){ids.forEach(p=>{const pd=W.sesi.pending[p];if(pd){delete pd.bonus;delete pd.kritis}})}
function useShift(){if(W.sesi.shift){log(`Perubahan tingkat dari kejadian acak terpakai (${W.sesi.shift>0?'+':''}${W.sesi.shift})`);W.sesi.shift=0}}
function natLog(id,d){if(isCrit(id,d))addSB(-1,`Kritis ${H(id).nama}`);else if(isFum(id,d))addSB(1,`Gagal Total ${H(id).nama}`)}
function nextButtons(ok){const o=RC.o;const n=ok?o.lanjut_berhasil:o.lanjut_gagal;
  return `<button class="btn green" data-next="${n===undefined||n===null?'':n}">${nextLabel(n===undefined||n===null?undefined:num(n))}</button>`}
function bindNext(){document.querySelectorAll('[data-next]').forEach(b=>b.onclick=()=>goNext(b.dataset.next===''?undefined:num(b.dataset.next)))}
function afterApply(btn,ok,extra){btn.disabled=true;save();renderSide();btn.insertAdjacentHTML('afterend',(extra||'')+nextButtons(ok));bindNext()}

function tierBox(rt){return `<div class="tierbox">${['gagal_total','gagal','berhasil_komplikasi','berhasil_bersih'].map(k=>`<span class="${k===rt?'on':''}">${RT_LABEL[k]}</span>`).join('')}</div>`}
function calcAid(o,id,n,dc,total,rollTxt,ok){const s=W.sesi,a=scn(),h=H(id);const tk=dcTierOf(dc);const ef=o.efek_jika_berhasil||{tipe:'info'};
  let tipe=ef.tipe||'info';const cap=aidCap(tipe,tk);let besar=tipe==='info'?0:Math.min(num(ef.besar,1),cap);if(tipe!=='info'&&cap===0){tipe='info';besar=0}
  if(tipe==='lewati_bos'&&a.hasil_wajib){tipe='kurangi_bos';besar=AID_MAG[tk].tambahan}
  const own=o.efek_gagal&&Object.keys(o.efek_gagal).filter(k=>k!=='mati'&&o.efek_gagal[k]&&o.efek_gagal[k]!=='tidak').length;const fo=aidFailOpts(tk);
  const ex=s.aid&&s.aid[a.no];const rank=tierIdx(tk);
  const stackNote=ok&&ex&&tipe!=='info'?(ex.used||ex.imm||ex.rank>=rank?`<div class="warn">Adegan ini sudah punya efek Skill Bantuan (${esc(aidDesc(ex))}${ex.used?', sudah terpakai':''}). Aturan 14: tidak ditumpuk, efek baru tidak berlaku.</div>`:`<div class="hint">Efek baru lebih besar dan menggantikan efek sebelumnya (${esc(aidDesc(ex))}).</div>`):'';
  const failPick=!ok&&!own?`<div class="field"><label>Harga kegagalan (aturan 15, dipilih GM)</label>${fo.map((x,i)=>`<label class="chk"><input type="radio" name="rFail" value="${i}" ${i===0?'checked':''}> ${esc(x.t)}</label>`).join('')}</div>`:'';
  verdict(ok?'win':'lose',`${esc(h.nama)}: Skill Bantuan ${ok?'Berhasil':'Gagal'}`,`${esc(n)} ${total} melawan DC ${dc} · ${esc(rollTxt)}`,
    `<div class="read"><p>${esc(ok?o.berhasil||'Berhasil.':o.gagal||'Gagal.')}</p></div>${ok?`<p><b>Efek:</b> ${esc(aidLabel(tipe))}${['turun_tingkat','kurangi_bos','bonus_tim','nyawa_semua'].includes(tipe)?' '+besar:''}${['turun_tingkat','kurangi_bos','bonus_tim','lewati_bos'].includes(tipe)?' — berlaku di tantangan berikutnya adegan ini':''}.</p>${stackNote}`:(own?`<p><b>Akibat:</b> ${esc(efekText(o.efek_gagal,false))}</p>`:failPick)}`,
    `<button class="btn" id="rApply">Terapkan</button>`);
  $('rApply').onclick=e=>{const pd=s.pending[id]||{};if(pd.bonus)delete pd.bonus;clearAdv(id);s.aid=s.aid||{};
    if(ok){log(`Skill Bantuan ${h.nama} (${n}, DC ${dc}): BERHASIL — ${aidLabel(tipe)}${besar?' '+besar:''}`);
      if(ex&&(ex.used||ex.imm||ex.rank>=rank)){log('Efek Skill Bantuan tidak ditumpuk (sudah ada efek di adegan ini)')}
      else{const imm=['nyawa_semua','adv','info'].includes(tipe);s.aid[a.no]={tipe,besar,rank,dari:id,skill:n,used:imm,imm};
        if(tipe==='nyawa_semua')party().forEach(p=>{if(!dead(p))hurt(p,-besar,`${n} ${h.nama}`)});
        if(tipe==='adv'){const tg=slug(ef.target||o.target||id);setAdvFx({adv:party().includes(tg)?tg:id},`Skill Bantuan ${n}`)}}
      applySuccess(o.efek_berhasil)}
    else{log(`Skill Bantuan ${h.nama} (${n}, DC ${dc}): GAGAL`);if(own)applyFail(o.efek_gagal,o.efek_gagal.nyawa==='semua'?party().filter(p=>!down(p)):[id]);
      else{const pick=fo[+((document.querySelector('input[name="rFail"]:checked')||{}).value||0)];const f=pick.ef;if(f.stack)addSB(f.stack,'Skill Bantuan gagal');
        if(f.tingkat){s.shift=clamp((s.shift||0)+f.tingkat,-3,3);log('Tantangan utama naik 1 tingkat (Skill Bantuan gagal)')}if(f.nyawa_pelaku)hurt(id,f.nyawa_pelaku,'Skill Bantuan gagal')}}
    e.target.disabled=true;save();renderSide();
    e.target.insertAdjacentHTML('afterend',`<span class="small">Pilih opsi tantangan utama di atas untuk melanjutkan.</span>`);}}
function skipBoss(){const o=RC.o,a=scn();const x=aidFor('bos');if(!x||x.tipe!=='lewati_bos')return;const tk=$('rTier').value;
  if(tk==='raja_bos')return alert('Aturan 17: Raja Bos tidak bisa dilewati. Serangan harus dimainkan.');if(a.hasil_wajib)return alert('Adegan ini punya hasil wajib: Serangan Bos tidak bisa dilewati.');
  const bn=(o.bos&&o.bos.nama)||'Bos';const et=efekText(o.efek_berhasil,true);
  verdict('win',`${esc(bn)} dilewati`,`Persuasion ${esc(H(x.dari).nama)} berhasil`,`<div class="read"><p>${esc(o.berhasil||`${bn} tidak jadi menyerang.`)}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,`<button class="btn" id="rApply">Terapkan</button>`);
  $('rApply').onclick=e=>{x.used=true;log(`${bn}: Serangan Bos dilewati (Persuasion ${H(x.dari).nama})`);applySuccess(o.efek_berhasil);useShift();afterApply(e.target,true)}}
function calc(){const o=RC.o,s=W.sesi,a=scn();
  /* ---- SOLO ---- */
  if(o.jenis==='solo'){const id=$('rHero').value,t=tierOf($('rTier').value),d1=dv($('rDie')),c=dv($('rCh'));const mode=$('rAdv').value;
    if(!d1)return alert('Isi hasil dadu pemain sesuai dadu kelasnya.');if(!c)return alert('Isi hasil Dadu GM.');
    let d=d1;if(mode!=='normal'){const d2=dv($('rDie2'));if(!d2)return alert('Isi lemparan kedua (Advantage/Disadvantage).');d=pickMode(mode,d1,d2)}
    if(down(id)&&!confirm(H(id).nama+' sedang Tumbang. Tetap lempar?'))return;
    const v=heroVal(id,d)+num($('rMod').value),cr=isCrit(id,d),fu=isFum(id,d),ok=cr||(!fu&&v>=c);
    const tiered=hasTierText(o);const rt=cr?'berhasil_bersih':fu?'gagal_total':resultTier(v,c);
    const ef=tiered?tierEfek(o,rt):(ok?o.efek_berhasil:o.efek_gagal);const et=efekText(ef,ok);
    const title=cr?'Sukses Luar Biasa!':fu?'Gagal Total!':tiered?RT_LABEL[rt]:ok?'Berhasil':'Gagal';
    verdict(tiered&&!cr&&!fu?RT_CLS[rt]:ok?'win':'lose',`${esc(H(id).nama)}: ${title}`,`Nilai ${v} melawan ${c} (${t.n}: ${dStr(t.d)})${mode!=='normal'?` · ${mode==='adv'?'Advantage':'Disadvantage'} (${d1} / ${dv($('rDie2'))} → ${d})`:''}`,
      `${tiered?tierBox(rt):''}<div class="read"><p>${esc(tiered?tierText(o,rt):ok?o.berhasil||'Berhasil.':o.gagal||'Gagal.')}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}${cr?'<p class="small">Kritis: Stack −1.</p>':''}${fu?'<p class="small">Gagal Total: Stack +1.</p>':''}`,
      `<button class="btn" id="rApply">Terapkan</button>`);
    $('rApply').onclick=e=>{log(`${H(id).nama} ${t.n}: ${tiered?RT_LABEL[rt].toUpperCase():ok?'BERHASIL':'GAGAL'} (${v} vs ${c})`);natLog(id,d);
      if(ok)applySuccess(ef);else applyFail(ef,ef&&['gagal','pelaku','semua'].includes(ef.nyawa)?(ef.nyawa==='semua'?party().filter(p=>!down(p)):[id]):[]);
      clearPending([id]);clearAdv(id);useShift();useAid('solo');afterApply(e.target,ok)};
    return}
  /* ---- SKILL CHECK & SKILL BANTUAN ---- */
  if(o.jenis==='skill_cek'||o.jenis==='skill_bantuan'){const isAid=o.jenis==='skill_bantuan';const id=$('rHero').value,h=H(id),n=$('rSkill').value,dc=num($('rDC').value,15),mode=$('rAdv').value;
    const pas=!isAid&&$('rPassive')&&$('rPassive').checked;const pd=s.pending[id]||{};const mod=skillMod(h,n)+(pd.bonus||0)+num($('rMod').value);
    let total,rollTxt;
    if(pas){total=10+mod+(mode==='adv'?5:mode==='dis'?-5:0);rollTxt=`pasif 10 ${fmtMod(mod)}${mode!=='normal'?(mode==='adv'?' +5 (Advantage)':' −5 (Disadvantage)'):''}`}
    else{const d1=dv($('rD1'));if(!d1)return alert('Isi hasil d20 pemain (1–20).');let d=d1;if(mode!=='normal'){const d2=dv($('rD2'));if(!d2)return alert('Isi d20 kedua (Advantage/Disadvantage).');d=pickMode(mode,d1,d2);rollTxt=`d20 ${d1} / ${d2} → ${d}`}else rollTxt=`d20 ${d}`;
      total=d+mod;rollTxt+=` ${fmtMod(mod)}`;if(d===20)rollTxt+=' (angka 20 alami)';if(d===1)rollTxt+=' (angka 1 alami)'}
    if(down(id)&&!confirm(h.nama+' sedang Tumbang. Tetap mencoba?'))return;
    const rt=resultTier(total,dc);const ok=rt.startsWith('berhasil');
    if(isAid){calcAid(o,id,n,dc,total,rollTxt,ok);return}
    const ef=tierEfek(o,rt);const et=efekText(ef,ok);
    verdict(RT_CLS[rt],`${esc(h.nama)}: ${RT_LABEL[rt]}`,`${esc(n)} ${total} melawan DC ${dc} · ${esc(rollTxt)}`,
      `${tierBox(rt)}<div class="read"><p>${esc(tierText(o,rt))}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,`<button class="btn" id="rApply">Terapkan</button>`);
    $('rApply').onclick=e=>{log(`${h.nama} ${n} (DC ${dc}): ${RT_LABEL[rt].toUpperCase()} (${total})`);
      if(ok)applySuccess(ef);else applyFail(ef,ef&&['gagal','pelaku','semua'].includes(ef.nyawa)?(ef.nyawa==='semua'?party().filter(p=>!down(p)):[id]):[]);
      if(pd.bonus)delete pd.bonus;clearAdv(id);useShift();useAid('skill_cek');afterApply(e.target,ok)};
    return}
  /* ---- KONTES ---- */
  if(o.jenis==='kontes'){const k=o.kontes||{};const id=$('rHero').value,h=H(id),n=$('rSkill').value,mode=$('rAdv').value,lm=num($('rLM').value);
    const d1=dv($('rD1')),dl=dv($('rDL'));if(!d1)return alert('Isi d20 pelaku.');if(!dl)return alert('Isi d20 lawan.');
    let d=d1;if(mode!=='normal'){const d2=dv($('rD2'));if(!d2)return alert('Isi d20 kedua (Advantage/Disadvantage).');d=pickMode(mode,d1,d2)}
    const pd=s.pending[id]||{};const mod=skillMod(h,n)+(pd.bonus||0)+num($('rMod').value);const total=d+mod,lt=dl+lm,m=total-lt;
    const rt=m<=-5?'gagal_total':m<=0?'gagal':m<5?'berhasil_komplikasi':'berhasil_bersih';const ok=rt.startsWith('berhasil');
    const ef=tierEfek(o,rt);const et=efekText(ef,ok);const ln=k.lawan||'Lawan';
    verdict(RT_CLS[rt],`${ok?esc(h.nama)+' unggul':esc(ln)+' unggul'}: ${RT_LABEL[rt]}`,`${esc(n)} ${total} melawan ${esc(k.lawan_skill||'lawan')} ${lt} (selisih ${m>0?'+':''}${m}${m===0?', seri dimenangkan lawan':''})`,
      `<div class="score"><div>${esc(h.nama)}<b>${total}</b></div><div>${esc(ln)}<b>${lt}</b></div></div>${tierBox(rt)}<div class="read"><p>${esc(tierText(o,rt))}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,`<button class="btn" id="rApply">Terapkan</button>`);
    $('rApply').onclick=e=>{log(`Kontes ${h.nama} (${n}) vs ${ln}: ${RT_LABEL[rt].toUpperCase()} (${total} vs ${lt})`);
      if(ok)applySuccess(ef);else applyFail(ef,ef&&['gagal','pelaku','semua'].includes(ef.nyawa)?(ef.nyawa==='semua'?party().filter(p=>!down(p)):[id]):[]);
      if(pd.bonus)delete pd.bonus;clearAdv(id);afterApply(e.target,ok)};
    return}
  /* ---- KELOMPOK & BOS ---- */
  if(o.jenis==='kelompok'||o.jenis==='bos'){const rows=[];let miss=[];
    document.querySelectorAll('#rTbl tr[data-id]').forEach(tr=>{if(!tr.querySelector('.in').checked)return;const id=tr.dataset.id,d=dv(tr.querySelector('input.die'));if(!d)return miss.push(H(id).nama);rows.push({id,d,v:heroVal(id,d),cr:isCrit(id,d),fu:isFum(id,d)})});
    if(miss.length)return alert('Dadu belum diisi atau di luar rentang: '+miss.join(', '));if(!rows.length)return alert('Belum ada yang ikut.');
    const mod=num($('rMod').value);
    if(o.jenis==='kelompok'){const t=tierOf($('rTier').value),c=dv($('rCh'));if(!c)return alert('Isi hasil Dadu GM.');
      rows.forEach(r=>r.ok=r.cr||(!r.fu&&r.v+mod>=c));const pass=rows.filter(r=>r.ok).length,need=Math.ceil(rows.length/2),ok=pass>=need,fails=rows.filter(r=>!r.ok);
      const ef=ok?o.efek_berhasil:o.efek_gagal;const et=efekText(ef,ok);
      verdict(ok?'win':'lose',ok?'Kelompok Berhasil':'Kelompok Gagal',`${pass} dari ${rows.length} lulus melawan ${c} (${t.n}), butuh ${need}`,
        `<div class="read"><p>${esc(ok?o.berhasil||'Berhasil.':o.gagal||'Gagal.')}</p></div>${fails.length?`<p>Yang gagal: <b>${esc(fails.map(f=>H(f.id).nama).join(', '))}</b></p>`:''}${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,
        `<button class="btn" id="rApply">Terapkan</button>`);
      $('rApply').onclick=e=>{log(`Kelompok ${t.n}: ${ok?'BERHASIL':'GAGAL'} (${pass}/${rows.length}, GM ${c})`);rows.forEach(r=>natLog(r.id,r.d));
        if(ok)applySuccess(ef);else{const n=ef&&ef.nyawa;applyFail(ef,n==='gagal'?fails.map(f=>f.id):n==='semua'?rows.map(r=>r.id):[])}
        clearPending(rows.map(r=>r.id));useShift();useAid('kelompok');afterApply(e.target,ok)};
      return}
    /* bos */
    const t=tierOf($('rTier').value,BOSS_TIERS);const bdIn=[...document.querySelectorAll('#rBossDice input.die')];const bd=bdIn.map(dv);
    if(bd.some(x=>!x))return alert('Isi total dadu bos per jenis (sesuai rentang yang tertulis).');
    if(bdIn.length&&num(bdIn[0].dataset.min)!==rows.length)renderBossDice();
    const base=num($('rBase').value,0);
    const axb=aidFor('bos');const tb=party().reduce((a2,p)=>a2+((s.pending[p]||{}).bonus_tim||0),0)+(axb&&axb.tipe==='bonus_tim'?axb.besar:0);
    const bossVal=sum(bd)+base+s.sb*num(W.sys.sbBos,2);
    const teamVal=rows.reduce((x,r)=>x+r.v,0)+mod+tb;const gap=bossVal-teamVal;const bn=(o.bos&&o.bos.nama)||'Bos';
    const cls=gap<=0?'win':gap<=6?'thin':'lose';
    const TT={win:['Menang!',`Tim unggul ${-gap} poin.`,'Tidak ada yang terluka.'],thin:['Menang Tipis',`Tim kurang ${gap} poin, tapi tetap menang.`,'Semua pahlawan yang ikut −1 Nyawa.'],lose:['Serangan Gagal',`Tim kurang ${gap} poin.`,'Semua pahlawan yang ikut −1 Nyawa, Stack +1. Serang lagi.']}[cls];
    const ok=cls!=='lose';const et=ok?efekText(o.efek_berhasil,true):'';
    verdict(cls,TT[0],TT[1],`<div class="score"><div>Nilai Tim<b>${teamVal}</b></div><div>Nilai ${esc(bn)}<b>${bossVal}</b></div></div>
      <div class="read"><p>${esc(ok?o.berhasil||`${bn} tumbang.`:o.gagal||`${bn} membalas dengan kejam. Kumpulkan tenaga, serang lagi!`)}</p></div>
      <p><b>Akibat:</b> ${esc(TT[2])}${et?' · '+esc(et):''}</p><p class="small">${t.n}: ${t.d.map((x,k)=>`d${x}×${rows.length}=${bd[k]}`).join(', ')} + tambahan ${base} + stack ${s.sb*num(W.sys.sbBos,2)}. Tim: ${rows.map(r=>H(r.id).nama+' '+r.v).join(', ')}${mod||tb?` + bonus ${mod+tb}`:''}.</p>`,
      `<button class="btn" id="rApply">Terapkan</button>`);
    $('rApply').onclick=e=>{log(`${bn} (${t.n}): ${TT[0]} (Tim ${teamVal} vs ${bossVal})`);rows.forEach(r=>natLog(r.id,r.d));
      if(cls!=='win'){if(!useShield())rows.forEach(r=>hurt(r.id,1,TT[0]))}
      if(cls==='lose')addSB(1,'serangan bos gagal');if(ok)applySuccess(o.efek_berhasil);
      party().forEach(p=>{if(s.pending[p])delete s.pending[p].bonus_tim});clearPending(rows.map(r=>r.id));useShift();useAid('bos');
      if(party().every(p=>down(p)))log('SEMUA PAHLAWAN TUMBANG');
      if(ok)afterApply(e.target,true);else{e.target.disabled=true;save();renderSide();e.target.insertAdjacentHTML('afterend','<button class="btn alt" id="rRetry">Serang lagi (ronde baru)</button>'+(o.lanjut_gagal!==undefined&&o.lanjut_gagal!==null&&num(o.lanjut_gagal)!==a.no?nextButtons(false):''));bindNext();
        $('rRetry').onclick=()=>{document.querySelectorAll('#roller input.die').forEach(i=>i.value='');$('rOut').innerHTML='';renderBossDice();previewRows();refreshRoller()}}};
    return}
  /* ---- DUEL ---- */
  if(o.jenis==='duel'){const id=$('rHero').value,t=tierOf($('rTier').value),lb=num($('rLB').value,0);let w=0,l=0,miss=false;const rounds=[];
    document.querySelectorAll('#rTbl tr').forEach((tr,k)=>{if(k===0)return;const cv=tr.querySelector('.dvv'),cw=tr.querySelector('.dw');
      if(w>=2||l>=2){cv.textContent='tidak perlu';cw.textContent='';return}
      let p=dv(tr.querySelector('.dp')),q=dv(tr.querySelector('.dk'));const mode=$('rAdv').value;
      if(k===1&&mode!=='normal'&&p){const p2=dv(tr.querySelector('.dp2'));if(!p2){miss=true;cv.textContent='–';cw.textContent='';return}p=pickMode(mode,p,p2)}
      if(!p||!q){miss=true;cv.textContent='–';cw.textContent='';return}
      const pv=heroVal(id,p),kv=q+lb,cr=heroCrit(id,p)||(k===1&&!!(s.pending[id]||{}).kritis),fu=heroFum(id,p)&&!cr,win=cr||(!fu&&pv>kv);win?w++:l++;rounds.push({p,cr,fu});
      cv.textContent=`${pv} lawan ${kv}${cr?' (Kritis)':fu?' (Gagal Total)':''}`;
      cw.innerHTML=win?`<b style="color:var(--moss)">${esc(H(id).nama)}</b>`:`<b style="color:var(--blood)">${esc(o.lawan&&o.lawan.nama||'Lawan')}</b>`});
    if(miss)return alert('Isi dadu untuk ronde yang dibutuhkan (sesuai rentang).');
    const ok=w>=2;const ef=ok?o.efek_berhasil:o.efek_gagal;const et=efekText(ef,ok);
    verdict(ok?'win':'lose',ok?`${esc(H(id).nama)} memenangkan duel`:`${esc(o.lawan&&o.lawan.nama||'Lawan')} menang`,`Skor ${w} – ${l} (${t.n})`,
      `<div class="read"><p>${esc(ok?o.berhasil||'Menang.':o.gagal||'Kalah.')}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,`<button class="btn" id="rApply">Terapkan</button>`);
    $('rApply').onclick=e=>{log(`Duel ${H(id).nama} vs ${o.lawan&&o.lawan.nama||'lawan'} (${t.n}): ${ok?'MENANG':'KALAH'} (${w}-${l})`);
      rounds.forEach(r=>{if(r.cr)addSB(-1,`Kritis ${H(id).nama}`);else if(r.fu)addSB(1,`Gagal Total ${H(id).nama}`)});
      if(ok)applySuccess(ef);else applyFail(ef,ef&&ef.nyawa&&ef.nyawa!=='tidak'?(ef.nyawa==='semua'?party().filter(p=>!down(p)):[id]):[]);
      clearPending([id]);clearAdv(id);useShift();useAid('duel');afterApply(e.target,ok)};
    return}
  /* ---- TANPA DADU / SKILL / PENGORBANAN ---- */
  const et=efekText(o.efek_berhasil,true);
  verdict('win','Pilihan dijalankan','',`<div class="read"><p>${esc(o.berhasil||o.aksi||'')}</p></div>${et?`<p><b>Akibat:</b> ${esc(et)}</p>`:''}`,`<button class="btn" id="rApply">Terapkan</button>`);
  $('rApply').onclick=e=>{const ps=o.pelaku.filter(p=>party().includes(p));
    if(o.jenis==='skill_khusus'){for(const p of ps){if(s.skill[p]<=0){alert(`${H(p).nama} sudah tidak punya jatah Skill Khusus.`);return}}ps.forEach(p=>{s.skill[p]--;log(`${H(p).nama} memakai ${H(p).sk.nama||'Skill Khusus'} (sisa ${s.skill[p]}/3)`)})}
    if(o.jenis==='pengorbanan')ps.forEach(p=>{const c=num(H(p).sp.biaya,1);hurt(p,c,H(p).sp.nama||'pengorbanan')});
    log(`Adegan ${a.no} opsi ${o.kode} dijalankan`);applySuccess(o.efek_berhasil);afterApply(e.target,true)};
}

/* ======================= FITUR GM FASE 1 ======================= */
const scnNoSafe=()=>{try{return W&&W.story&&W.sesi&&!W.sesi.ended?scn().no:0}catch(e){return 0}};

/* ---------- Undo & riwayat aksi ---------- */
const UNDO_MAX=20;
const UNDO_SEL='#atkApply,#ujiLuka,#ujiTutup,#rApply,#evApply,#mOk,#usePot,#addItem,#sbPlus,#sbMinus,#applyFate,#toEnding,#clrShift,#clrAid,#rSkip,#improvAdd,[data-h],[data-ram],[data-rmitem],[data-clradv],[data-next],[data-giliran]';
function undoWatch(e){if(!W||!W.sesi)return;const b=e.target&&e.target.closest?e.target.closest(UNDO_SEL):null;const q=e.type==='change'&&e.target.dataset&&e.target.dataset.q!==undefined;
  if((!b||b.disabled)&&!q)return;if(b&&!b.closest('#p-play')&&!b.closest('#modal'))return;const before=JSON.stringify(W.sesi);
  setTimeout(()=>{if(!W||!W.sesi)return;const after=JSON.stringify(W.sesi);if(after===before)return;
    const label=String(W.sesi.log[0]||'aksi').replace(/^\d\d:\d\d\s+/,'').slice(0,90);
    W.undo=W.undo||[];W.undo.push({at:Date.now(),label,sesi:before});if(W.undo.length>UNDO_MAX)W.undo.shift();save();renderUndo()},0)}
document.addEventListener('click',undoWatch,true);document.addEventListener('change',undoWatch,true);
function undoTo(i){const u=W.undo[i];if(!u)return;const label=u.label;const n=W.undo.length-i;W.sesi=JSON.parse(u.sesi);W.undo=W.undo.slice(0,i);
  log(`↶ Dibatalkan ${n>1?n+' aksi, mulai dari':''}: ${label}`);save();renderPlay();toast(`Dibatalkan: ${label}`)}
function renderUndo(){const el=$('undoBox');if(!el||!W)return;const u=W.undo||[];
  el.innerHTML=u.length?`<button class="btn alt undo-main" id="undoLast">↶ Batalkan: ${esc(u[u.length-1].label)}</button>
    <details class="gm"><summary>Riwayat aksi (${u.length} dari maks ${UNDO_MAX})</summary><ol class="undo-list" reversed>${u.map((x,i)=>({x,i})).reverse().map(({x,i})=>`<li><span>${esc(new Date(x.at).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}))} · ${esc(x.label)}</span><button class="dbtn" data-undoto="${i}" type="button">Batalkan sampai sini</button></li>`).join('')}</ol></details>`
    :'<p class="small">Setiap kali kamu menekan Terapkan, mengubah Nyawa, Stack, ramuan, atau barang, langkahnya tercatat di sini dan bisa dibatalkan.</p>';
  if($('undoLast'))$('undoLast').onclick=()=>undoTo(W.undo.length-1);
  el.querySelectorAll('[data-undoto]').forEach(b=>b.onclick=()=>{const i=+b.dataset.undoto;if(confirm(`Batalkan ${W.undo.length-i} aksi terakhir?`))undoTo(i)})}

/* ---------- Pelacak giliran ---------- */
function markGiliran(ids){const s=W.sesi;if(!s)return;const no=scnNoSafe();if(!no)return;s.giliran=s.giliran||{};const set=new Set(s.giliran[no]||[]);ids.forEach(i=>set.add(i));s.giliran[no]=[...set]}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#rApply');if(!b||b.disabled||!RC||!W||!W.sesi)return;
  let ids=[];if($('rHero'))ids=[$('rHero').value];else if($('rTbl')&&document.querySelector('#rTbl tr[data-id]'))ids=[...document.querySelectorAll('#rTbl tr[data-id]')].filter(tr=>tr.querySelector('.in').checked).map(tr=>tr.dataset.id);
  else ids=(RC.o.pelaku||[]).filter(p=>party().includes(p));markGiliran(ids);
  const vh=document.querySelector('#rOut .vhead');if(vh)bus.emit('scene',{type:'hasil',cls:[...vh.classList].find(c=>c!=='vhead')||'',judul:vh.childNodes[0]?vh.childNodes[0].textContent:'',sub:(vh.querySelector('small')||{}).textContent||'',teks:(document.querySelector('#rOut .read')||{}).textContent||''})},true);
$('playWrap').addEventListener('click',e=>{const g=e.target.closest('[data-giliran]');if(!g||!W.sesi)return;const no=scnNoSafe();if(!no)return;const s=W.sesi;s.giliran=s.giliran||{};
  const a=new Set(s.giliran[no]||[]);a.has(g.dataset.giliran)?a.delete(g.dataset.giliran):a.add(g.dataset.giliran);s.giliran[no]=[...a];save();renderSide()});
function renderGiliran(){const el=$('giliranInfo');if(!el||!W.sesi)return;const no=scnNoSafe();if(!no){el.innerHTML='';return}
  const done=(W.sesi.giliran||{})[no]||[];const belum=party().filter(p=>!dead(p)&&!down(p)&&!done.includes(p));
  el.innerHTML=belum.length?`<div class="hint" style="margin:8px 0 0">Belum beraksi di adegan ini: <b>${esc(belum.map(p=>H(p).nama).join(', '))}</b></div>`:`<div class="ok" style="margin:8px 0 0">Semua pahlawan sudah beraksi di adegan ini.</div>`}

/* ---------- Kalkulator: peluang sukses & lempar-hitung sekali klik ---------- */
function rollerExtras(o){const act=$('rCalc')&&$('rCalc').parentElement;if(!act)return;
  if(!['tanpa_dadu','skill_khusus','pengorbanan'].includes(o.jenis)){
    act.insertAdjacentHTML('afterbegin',`<button class="btn green" id="rRollCalc" type="button" title="GM melempar semua dadu (pemain dan GM), lalu langsung menghitung">🎲 Lempar &amp; hitung</button>`);
    act.insertAdjacentHTML('afterend',`<div class="chance" id="rChance" aria-live="polite"></div>`);
    $('rRollCalc').onclick=()=>{document.querySelectorAll('#roller input.die').forEach(inp=>{if(inp.offsetParent===null)return;const tr=inp.closest('tr[data-id]');if(tr&&!tr.querySelector('.in').checked)return;
        inp.value=inp.dataset.dice==='d100'?rollD100():rollArr(inp.dataset.dice.split(',').map(Number));dv(inp)});previewRows();$('rCalc').click()};
    const r=$('roller');['input','change'].forEach(ev=>r.addEventListener(ev,e=>{if(e.target.closest('#rOut'))return;chanceUpdate()}));chanceUpdate()}}
function chanceUpdate(){const el=$('rChance');if(!el||!RC)return;const o=RC.o,s=W.sesi;let t='';
  try{const pend=id=>(s.pending[id]||{});const modIn=$('rMod')?num($('rMod').value):0;const mode=$('rAdv')?$('rAdv').value:'normal';
    if(o.jenis==='solo'){const id=$('rHero').value,t0=tierOf($('rTier').value);t=`Peluang berhasil: <b>${pct(pPool(poolOf(id),bonusOf(id)+(pend(id).bonus||0)+modIn,t0.d,mode,!!pend(id).kritis))}</b>`}
    else if(o.jenis==='kelompok'){const hs=[...document.querySelectorAll('#rTbl tr[data-id]')].filter(tr=>tr.querySelector('.in').checked).map(tr=>({pool:poolOf(tr.dataset.id),bonus:bonusOf(tr.dataset.id)+(pend(tr.dataset.id).bonus||0)+modIn}));
      t=`Peluang kelompok berhasil (≥ separuh lulus): <b>${pct(pKelompok(hs,tierOf($('rTier').value).d))}</b>`}
    else if(o.jenis==='bos'){const ids=[...document.querySelectorAll('#rTbl tr[data-id]')].filter(tr=>tr.querySelector('.in').checked).map(tr=>tr.dataset.id);
      const ax=aidFor('bos');const tb=party().reduce((a,p)=>a+(pend(p).bonus_tim||0),0)+(ax&&ax.tipe==='bonus_tim'?ax.besar:0);
      const hs=ids.map(id=>({pool:poolOf(id),bonus:bonusOf(id)+(pend(id).bonus||0)}));const tamb=num($('rBase').value)+s.sb*num(W.sys.sbBos,2)-modIn-tb;
      const r=pBoss(hs,tierOf($('rTier').value,BOSS_TIERS).d,tamb);t=hs.length?`Peluang Menang: <b>${pct(r.menang)}</b> · Menang atau Menang Tipis: <b>${pct(r.tipis)}</b>`:''}
    else if(o.jenis==='duel'){const id=$('rHero').value,L=tierOf($('rTier').value),lb=num($('rLB').value);const b=bonusOf(id)+(pend(id).bonus||0);
      const p1=pend(id).kritis?1:pDuelRonde(poolOf(id),b,L.d,lb,mode),p=pDuelRonde(poolOf(id),b,L.d,lb);t=`Peluang menang duel: <b>${pct(pDuel(p1,p))}</b> <span class="small">(per ronde ${pct(p)})</span>`}
    else if(o.jenis==='skill_cek'||o.jenis==='skill_bantuan'){const id=$('rHero').value,h=H(id),n=$('rSkill').value,dc=num($('rDC').value,15);const mod=skillMod(h,n)+(pend(id).bonus||0)+modIn;
      if($('rPassive')&&$('rPassive').checked)t=`Nilai pasif ${10+mod+(mode==='adv'?5:mode==='dis'?-5:0)} → <b>${pPasif(mod,dc,mode)?'pasti berhasil':'pasti gagal'}</b>`;
      else t=`Peluang berhasil: <b>${pct(pD20(mod,dc,mode))}</b>${o.jenis==='skill_cek'?` · berhasil bersih (unggul 5+): ${pct(pD20(mod,dc+5,mode))}`:''}`}
    else if(o.jenis==='kontes'){const id=$('rHero').value,h=H(id),n=$('rSkill').value;const mod=skillMod(h,n)+(pend(id).bonus||0)+modIn;t=`Peluang unggul: <b>${pct(pKontes(mod,num($('rLM').value),mode))}</b>`}
  }catch(e){t=''}
  el.innerHTML=t?`📊 ${t}`:''}

/* ---------- Panel GM ringkas ---------- */
function renderGmPanel(){const el=$('gmPanel');if(!el||el.dataset.g===R.genre+W.id+W.sys.profBonus+W.sys.sbBos)return;el.dataset.g=R.genre+W.id+W.sys.profBonus+W.sys.sbBos;const g=G();
  el.innerHTML=`<table class="grid mini-tbl"><tr><th>Tingkat</th><th>Dadu GM</th><th>DC skill</th></tr>${TIERS.map(t=>`<tr><td>${t.n}</td><td>${dStr(t.d)}</td><td>${DC_TABLE[t.k]}</td></tr>`).join('')}</table>
   <table class="grid mini-tbl"><tr><th>Bos</th><th>Dadu per pahlawan</th></tr>${BOSS_TIERS.map(t=>`<tr><td>${t.n}</td><td>${dStr(t.d)}</td></tr>`).join('')}</table>
   <ul class="mini-rules"><li><b>Serangan Bos:</b> tim ≥ bos menang · kurang 1–6 menang tipis (−1 ${esc(T('nyawa'))}) · kurang 7+ gagal (−1 ${esc(T('nyawa'))}, ${esc(T('stack'))} +1). Bos +${num(W.sys.sbBos,2)} per ${esc(T('stack'))}.</li>
   <li><b>Kritis:</b> semua dadu maksimal → sukses, ${esc(T('stack'))} −1. <b>Gagal Total:</b> semua dadu 1 → gagal, ${esc(T('stack'))} +1.</li>
   <li><b>Kelompok:</b> berhasil bila ≥ separuh lulus. <b>Duel:</b> 3 ronde, seri milik lawan.</li>
   <li><b>Skill check:</b> d20 + ability + Proficiency (+${profB()}). Unggul 5+ bersih · 0–4 komplikasi · kurang 1–4 gagal · kurang 5+ gagal berat.</li>
   <li><b>Pasif:</b> 10 + mod (Advantage +5, Disadvantage −5). <b>Kontes:</b> seri dimenangkan lawan.</li></ul>`}

/* ---------- Improvisasi ---------- */
let IMPROV_LAST=null;
function bindImprov(){const box=$('improvBox');if(!box||box.dataset.b)return;box.dataset.b=1;
  box.innerHTML=`<div class="improv-btns">${IMPROV_JENIS.map(([k,l])=>`<button class="dbtn" data-imp="${k}" type="button">${l}</button>`).join('')}</div><div id="improvOut"></div>`;
  box.addEventListener('click',e=>{const b=e.target.closest('[data-imp]');if(b){IMPROV_LAST=improv(R.genre,b.dataset.imp);showImprov();return}
    if(e.target.id==='improvLog'&&IMPROV_LAST){log(`Improvisasi — ${IMPROV_LAST.judul}: ${IMPROV_LAST.teks}`);save();renderSide();toast('Dicatat ke Catatan Sesi.')}
    if(e.target.id==='improvAdd'&&IMPROV_LAST){W.sesi.items.push(IMPROV_LAST.teks);log('Didapat: '+IMPROV_LAST.teks);save();renderSide();toast('Ditambahkan ke barang.')}})}
function showImprov(){const r=IMPROV_LAST;$('improvOut').innerHTML=`<div class="improv-card"><b>${esc(r.judul)}</b><p>${esc(r.teks)}</p><div class="actions" style="margin-top:4px">${W.sesi?`<button class="dbtn" id="improvLog" type="button">Catat ke log</button>`:''}${r.jenis==='barang'&&W.sesi?`<button class="dbtn" id="improvAdd" type="button">Tambah ke barang</button>`:''}<button class="dbtn" data-imp="${r.jenis}" type="button">Acak lagi</button></div></div>`}

/* ---------- Rekap sesi (tanpa spoiler) ---------- */
const PENTING=/BERHASIL|GAGAL|MENANG|KALAH|Menang|Gagal|Sukses|SELESAI|GUGUR|Didapat|Tumbang|dilewati|memakai/;
function recapText(){if(!W||!W.story||!W.sesi)return '';const s=W.sesi,st=W.story;const L=[];const done=st.adegan.filter(a=>s.done[a.no]||(!s.ended&&a.no===scn().no));
  L.push(`*${st.judul||W.sys.judul||'Petualangan'}${W.bab>1||W.arsip.length?` — Bab ${W.bab}`:''}*`);L.push(`Campaign: ${W.nama}`);L.push('');
  if(done.length){L.push('*Perjalanan kali ini*');done.forEach(a=>L.push(`• Adegan ${a.no} — ${a.judul}${a.ringkas?`: ${a.ringkas}`:''}`));L.push('')}
  const ev=[...s.log].reverse().map(l=>l.replace(/^\d\d:\d\d\s+/,'')).filter(l=>PENTING.test(l)&&!/^↶/.test(l));
  if(ev.length){L.push('*Momen penting*');ev.slice(-25).forEach(l=>L.push('• '+l));L.push('')}
  L.push(`*Kondisi ${T('pahlawan').toLowerCase()}*`);party().forEach(id=>L.push(`• ${H(id).nama}: ${dead(id)?'☠ gugur':`${s.hati[id]}/${maxH(id)} ${T('nyawa')}${down(id)?` (${T('tumbang')})`:''}`}`));
  if(s.items.length)L.push('',`*Barang:* ${s.items.join(', ')}`);
  const qs=Object.entries(s.quests);if(qs.length)L.push(`*Quest:* ${qs.map(([n,q])=>`${n} ${q.selesai?'✓':'(belum)'}`).join(', ')}`);
  if(s.ended){const e=curEnding();L.push('',`*${e?e.nama:'Ending'}*`);if(e&&e.epilog)L.push(e.epilog)}
  L.push('','_Dibuat dengan MasteryDnD_');return L.join('\n')}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Tersalin. Tempel di WhatsApp.');return true}catch(e){modal(`<h2>Salin manual</h2><div class="field"><textarea rows="14" readonly>${esc(t)}</textarea></div><div class="actions"><button class="btn" onclick="closeModal()">Tutup</button></div>`);return false}}
function bindRekapSide(){const b=$('rekapWA');if(b&&!b.dataset.b){b.dataset.b=1;b.onclick=()=>{if(!W.sesi)return;copyText(recapText())}}}

/* ---------- Ending: rekap & lanjutan bab ---------- */
function endingExtras(){const cloud=bus.app.cloudInfo&&bus.app.cloudInfo().login;const nb=(W.bab||1)+1;
  return `<div class="panel inner-panel"><h3 style="margin-top:0">Rekap sesi</h3><p class="small">Bebas diedit. Rekap tidak memuat twist, catatan GM, maupun opsi yang tidak dipilih.</p>
    <div class="field"><textarea id="rekapTeks" rows="12">${esc(recapText())}</textarea></div>
    <div class="actions"><button class="btn alt" id="rekapCopy">Salin untuk WhatsApp</button>${cloud?`<button class="btn" id="rekapTerbit">Terbitkan ke portal pemain</button>`:`<span class="small">Masuk ke akun (menu Akun &amp; Data) untuk menerbitkan rekap ke portal pemain.</span>`}<span id="rekapMsg" class="small"></span></div></div>
   <div class="panel inner-panel"><h3 style="margin-top:0">Lanjut ke Bab ${nb}</h3><p class="small">Tutup bab ini, simpan ke arsip campaign, lalu siapkan cerita Bab ${nb}. Pilih apa yang terbawa:</p>
    <div class="carry">
      <label class="chk"><input type="checkbox" id="cHati" checked> ${esc(T('nyawa'))} terakhir tiap ${esc(T('pahlawan').toLowerCase())} (tidak dicentang = pulih penuh)</label>
      <label class="chk"><input type="checkbox" id="cSb" checked> ${esc(T('stack'))} akhir (${W.sesi.sb})</label>
      <label class="chk"><input type="checkbox" id="cItem" checked> Barang (${W.sesi.items.length})</label>
      <label class="chk"><input type="checkbox" id="cRam" checked> Sisa ${esc(T('ramuan'))} (${W.sesi.ramuan})</label>
      <label class="chk"><input type="checkbox" id="cQuest" checked> Quest yang belum selesai (${Object.values(W.sesi.quests).filter(q=>!q.selesai).length})</label>
      <label class="chk"><input type="checkbox" id="cGugur" checked> ${esc(T('pahlawan'))} yang gugur tetap gugur (${Object.keys(W.sesi.gugur||{}).length})</label>
    </div><div class="actions"><button class="btn green" id="tutupBab">Tutup Bab ${W.bab||1} &amp; siapkan Bab ${nb}</button></div></div>`}
function bindEndingExtras(){if(!$('rekapCopy'))return;$('rekapCopy').onclick=()=>copyText($('rekapTeks').value);
  if($('rekapTerbit'))$('rekapTerbit').onclick=async()=>{$('rekapMsg').textContent='Menerbitkan…';try{await bus.app.terbitkanRekap(W,$('rekapTeks').value);$('rekapMsg').textContent='Terbit. Pemain bisa membacanya di portal.'}catch(e){$('rekapMsg').textContent='Gagal: '+e.message}};
  $('tutupBab').onclick=()=>{const s=W.sesi,e=curEnding();if(!confirm(`Tutup Bab ${W.bab} dan mulai menyiapkan Bab ${W.bab+1}? Cerita & sesi bab ini dipindah ke arsip campaign.`))return;
    const unfinished={};Object.entries(s.quests).forEach(([n,q])=>{if(!q.selesai)unfinished[n]=q});
    W.arsip.push({bab:W.bab,judul:W.story.judul||W.sys.judul||'',sinopsis:(W.story.ringkasan||{}).sinopsis||'',ending:e?e.nama:'',epilog:e&&e.epilog||'',rekap:$('rekapTeks').value,selesai:Date.now(),
      akhir:{hati:{...s.hati},sb:s.sb,items:[...s.items],ramuan:s.ramuan,quests:unfinished,gugur:{...(s.gugur||{})}},storyCid:W.storyCid||null,sesiCid:s.cid||null});
    W.bawaan={dariBab:W.bab,hati:$('cHati').checked?{...s.hati}:null,sb:$('cSb').checked?s.sb:0,items:$('cItem').checked?[...s.items]:[],ramuan:$('cRam').checked?s.ramuan:null,
      quests:$('cQuest').checked?unfinished:{},gugur:$('cGugur').checked?{...(s.gugur||{})}:{}};
    W.bab++;W.story=null;W.sesi=null;W.draft=null;W.undo=[];W.storyCid=null;W.sys.plot='';W.sys.gugur=[];W.sys.ikut=W.sys.ikut.filter(id=>!W.bawaan.gugur[id]);
    const j=String(W.sys.judul||'');W.sys.judul=/bab\s*[\divxlc]+/i.test(j)?j.replace(/bab\s*[\divxlc]+/i,'Bab '+W.bab):(j?j+', Bab '+W.bab:'');
    save();updateChrome();showTab('prompt');toast(`Bab ${W.bab-1} diarsipkan. Tulis plot kasar Bab ${W.bab}, lalu buat prompt. Kondisi party ikut masuk ke prompt.`,false,7000)}}
function applyBawaan(){const b=W.bawaan;if(!b||!W.sesi)return;const s=W.sesi;
  party().forEach(id=>{if(b.hati&&b.hati[id]!==undefined)s.hati[id]=clamp(num(b.hati[id]),0,maxH(id))});
  s.sb=clamp(num(b.sb),0,num(W.sys.sbMax,10));s.items=[...(b.items||[])];if(b.ramuan!==null&&b.ramuan!==undefined)s.ramuan=num(b.ramuan);
  Object.entries(b.quests||{}).forEach(([n,q])=>{if(!s.quests[n])s.quests[n]={...q,selesai:false}});
  Object.keys(b.gugur||{}).forEach(id=>{if(party().includes(id)){s.gugur=s.gugur||{};s.gugur[id]={why:`gugur di Bab ${b.dariBab}`,at:null};s.hati[id]=0}});
  log(`Bawaan dari Bab ${b.dariBab} diterapkan (${T('stack')} ${s.sb}, ${s.items.length} barang)`)}
function lanjutanPrompt(){if(!W||!(W.arsip||[]).length)return '';const b=W.bawaan||{};const hs=W.heroes;
  const arsip=W.arsip.slice(-3).map(x=>`- Bab ${x.bab}${x.judul?` "${x.judul}"`:''}: ${String(x.sinopsis||x.rekap||'').replace(/\n+/g,' ').slice(0,900)}${x.ending?` (berakhir: ${x.ending})`:''}`).join('\n');
  const kondisi=hs.map(h=>{const g=(b.gugur||{})[h.id];const hv=b.hati&&b.hati[h.id]!==undefined?`${b.hati[h.id]}/${num(h.nyawa,3)}`:`${num(h.nyawa,3)}/${num(h.nyawa,3)} (pulih penuh)`;
    return `- ${h.id} (${h.nama}): ${g?'GUGUR — jangan dipakai sebagai pelaku, boleh dikenang di narasi':`${T('nyawa')} ${hv}`}`}).join('\n');
  const q=Object.entries(b.quests||{});
  return `
=== LANJUTAN CAMPAIGN "${W.nama}" — BAB ${W.bab} ===
Cerita ini WAJIB melanjutkan bab sebelumnya secara konsisten (tokoh, dunia, konsekuensi pilihan pemain).
Ringkasan bab sebelumnya:
${arsip}
Kondisi party di awal bab ini:
${kondisi}
${T('stack')} awal: ${num(b.sb)} · Barang dibawa: ${(b.items||[]).join(', ')||'(tidak ada)'}${b.ramuan!==null&&b.ramuan!==undefined?` · ${T('ramuan')}: ${b.ramuan}`:''}
Quest yang masih terbuka: ${q.length?q.map(([n,x])=>`${n}${x.tujuan?` (${x.tujuan})`:''}`).join('; '):'(tidak ada)'}
`}

/* ---------- Layar presentasi (dikirim lewat BroadcastChannel di perangkat yang sama) ---------- */
let LAYAR_TIRAI=false;
function layarScene(a){return {type:'scene',no:a.no,judul:a.judul,latar:a.latar||null,narasi:a.narasi||'',cerita:W.story.judul||W.sys.judul||'',genre:G().nama,acc:ACCENT[R.genre]||'#d9a441'}}
function layarParty(){if(!W||!W.sesi)return {type:'party',heroes:[]};const s=W.sesi;
  return {type:'party',tn:T('nyawa'),genre:R.genre,heroes:party().map(id=>{const h=H(id);return {id,uid:h.uid,nama:h.nama,hati:s.hati[id],maks:maxH(id),gugur:dead(id),tumbang:down(id)}}),sb:s.sb,stack:T('stack')}}
function renderLayarBar(){const el=$('layarBar');if(!el)return;
  el.innerHTML=`<span class="small">Layar presentasi:</span><button class="dbtn" id="lyBuka" type="button">▣ Buka layar</button><button class="dbtn" id="lyScene" type="button">Tampilkan adegan ini</button><button class="dbtn ${LAYAR_TIRAI?'red':''}" id="lyTirai" type="button">${LAYAR_TIRAI?'Buka tirai':'Tutup tirai'}</button>`;
  $('lyBuka').onclick=()=>bus.emit('bukaLayar');$('lyScene').onclick=()=>{if(W.sesi&&!W.sesi.ended)bus.emit('scene',layarScene(scn()));bus.emit('party',layarParty())};
  $('lyTirai').onclick=()=>{LAYAR_TIRAI=!LAYAR_TIRAI;bus.emit('scene',{type:'tirai',on:LAYAR_TIRAI});renderLayarBar()}}

/* ---------- Akses untuk modul lain ---------- */
function cardDataOf(c,h){const pw=W,pg=R.genre;W=c;R.genre=c.genre;try{return cardData(h)}finally{W=pw;R.genre=pg}}
bus.app={get R(){return R},get W(){return W},setCamps(fn){fn(R);try{localStorage.setItem(KEY,JSON.stringify(R))}catch(e){toast('Data gagal tersimpan di perangkat (memori penuh).',true)}},save,activate,camp,G,T,esc,toast,modal,closeModal,IDB,cardDataOf,
  renderHeroes:()=>{if(W)renderHeroes()},renderBeranda,updateChrome,showTab,renderSide:()=>{if(W&&W.sesi&&W.story)renderSide()},
  photoKeyOf:(c,h)=>`${c.genre}|${h.uid}`,copyText,cloudInfo:null,renderPengaturan:null,terbitkanRekap:null,layarParty,
  statusOf(c,h){const s=c.sesi;if(!s||!s.party||!s.party.includes(h.id))return null;const pd=s.pending&&s.pending[h.id]||{};
    const lencana=[pd.adv&&!pd.dis?'Advantage':'',pd.dis&&!pd.adv?'Disadvantage':'',pd.perisai?'Perisai':'',pd.bonus?`Skill +${pd.bonus}`:'',pd.kritis?'Auto Kritis':''].filter(Boolean);
    const gugur=!!(s.gugur&&s.gugur[h.id]);return {hati:num(s.hati[h.id]),hati_maks:num(h.nyawa,3),skill_sisa:num(s.skill[h.id],3),tumbang:num(s.hati[h.id])<=0,gugur,lencana,berakhir:!!s.ended}}};
window.closeModal=closeModal;

/* ======================= EXPORT / IMPORT ======================= */
async function exportAllData(){const c=clone(R);Object.values(c.camps||{}).forEach(w=>{delete w.draft;delete w.undo});c.foto=await IDB.all();
  download(`masterydnd-simpanan-${new Date().toISOString().slice(0,10)}.json`,c);R.backupAt=Date.now();save();bus.emit('log','simpan_file')}
function importData(t){try{const d=JSON.parse(t);
  if(d.adegan&&!d.heroes&&!d.ws&&!d.camps){if(!R.genre){alert('Buka campaign dulu, lalu buka file cerita ini di tab 3.');return}$('storyIn').value=t;showTab('load');loadStoryText(t);return}
  const foto=d.foto||{};const putFoto=()=>Object.entries(foto).forEach(([k,v])=>IDB.set(k,v));
  if(d.camps){const n=Object.keys(d.camps).length;const baru=Object.keys(d.camps).filter(id=>!R.camps[id]).length;
    if(!confirm(`File berisi ${n} campaign (${baru} baru, ${n-baru} sudah ada). Campaign yang sudah ada akan ditimpa dengan isi file. Lanjut?`))return;
    putFoto();Object.values(d.camps).forEach(c=>{R.camps[c.id]=c});if(!R.aktif&&d.aktif&&R.camps[d.aktif])activate(d.aktif);else activate(R.aktif);save();updateChrome();showTab('beranda');toast('File berhasil dibuka.');return}
  if(d.ws){const cs=campsFromWs(d);if(!cs.length)throw new Error('File tidak berisi data pahlawan atau cerita.');if(!confirm(`File versi lama berisi ${cs.length} workspace genre. Semuanya akan ditambahkan sebagai campaign baru. Lanjut?`))return;
    putFoto();cs.forEach(c=>{delete c._dariGenreAktif;R.camps[c.id]=c});save();showTab('beranda');toast(`${cs.length} campaign ditambahkan dari file lama.`);return}
  if(Array.isArray(d.heroes)){const c=newCampObj(R.genre||'fantasy','Campaign dari file lama',{heroes:d.heroes,sys:d.sys||null,story:d.story||null,sesi:d.sesi||null});
    if(!confirm(`File versi lama. Tambahkan sebagai campaign baru (${genreNama(c.genre)})?`))return;R.camps[c.id]=c;save();showTab('beranda');toast('Campaign ditambahkan dari file lama.');return}
  throw new Error('Format file tidak dikenali.')}catch(err){alert('Gagal membuka file: '+err.message)}}
['exportAll','exportAll2'].forEach(id=>$(id).onclick=exportAllData);
['importAll','importAll2'].forEach(id=>$(id).onchange=e=>readFile(e.target,importData));

/* ======================= INIT ======================= */
if(location.hash.startsWith('#k=')){startViewer()}else{
$('siteUrl').value=R.siteUrl||'';siteHintR();
updateChrome();
if(R.genre){renderHeroes();renderSys()}
showTab(halamanDariHash()||(R.genre?(W.sesi&&!W.sesi.ended&&W.story?'play':'heroes'):'beranda'),{ganti:true,awal:true});
applyTerms(document.body);termObs.observe(document.body,{childList:true,subtree:true,characterData:true});
}

/* Akses untuk uji otomatis — hanya ada di build mode "test", dibuang dari build produksi. */
if(import.meta.env.MODE==='test'){Object.assign(window,{$,pickGenre,openCamp,showTab,openRoller,renderScene,renderPlay,renderSide,syncSys,scn,party,H,recapText,undoTo,activate,IDB,lanjutanPrompt,save,G,renderSys});
  Object.defineProperty(window,'W',{get:()=>W});Object.defineProperty(window,'R',{get:()=>R})}


/* ======================= MODE FOKUS PENCERITA ======================= */
const FOKUS_KEY='mdnd-fokus';
function fokusAktif(){return document.body.classList.contains('fokus')}
function masukFokus(){if(!W||!W.sesi||!W.story){toast('Mulai sesi dulu untuk memakai Mode Fokus.',true);return}
  document.body.classList.add('fokus');localStorage.setItem(FOKUS_KEY,'1');fokusSusun();window.scrollTo(0,0)}
function keluarFokus(){if(!fokusAktif())return;document.body.classList.remove('fokus');localStorage.removeItem(FOKUS_KEY);
  const r=$('fkRoller').querySelector('#roller');if(r&&$('scene'))$('scene').appendChild(r);
  if(!$('fkRoller').querySelector('.fk-kosong'))$('fkRoller').innerHTML='<p class="small fk-kosong">Pilih salah satu <b>opsi pemain</b> di tengah. Penghitung dadu muncul di sini.</p>';
  if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}
/** Pindahkan penghitung dadu ke kolom kanan & perbarui bilah fokus + Arah Cerita. */
function fokusSusun(){if(!fokusAktif()||!W||!W.sesi||!W.story)return;
  const r=$('scene')&&$('scene').querySelector('#roller');
  if(r){const box=$('fkRoller');box.innerHTML='';if(!r.children.length)box.insertAdjacentHTML('afterbegin','<p class="small fk-kosong">Pilih salah satu <b>opsi pemain</b> di tengah. Penghitung dadu muncul di sini.</p>');box.appendChild(r)}
  const s=W.sesi,n=W.story.adegan.length,a=s.ended?null:scn();
  $('fkJudul').textContent=s.ended?'Ending':`Adegan ${a.no} dari ${n} — ${a.judul}`;
  $('fkMeter').style.width=`${Math.round(((s.ended?n:s.cur+1)/n)*100)}%`;
  $('fkPrev').disabled=$('prevScn').disabled;$('fkNext').disabled=$('nextScn').disabled||s.ended;
  $('fkUndo').disabled=!(W.undo&&W.undo.length);
  renderArah()}
/** Saran arah cerita dari data yang sudah ada: Stack Bayangan, ending, kondisi tim, adegan. */
function renderArah(){const el=$('fkArah');if(!el||!W||!W.sesi||!W.story)return;const s=W.sesi;$('fkUndo').disabled=!(W.undo&&W.undo.length);
  const es=[...endings()].sort((x,y)=>x.maks-y.maks);const cur=es.find(e=>s.sb<=e.maks)||es[es.length-1];const ci=es.indexOf(cur);
  const lebihBuruk=es[ci+1],lebihBaik=ci>0?es[ci-1]:null;const sb=s.sb;
  const saran=[];const tim=party().filter(p=>!dead(p));
  if(lebihBuruk){const jarak=cur.maks-sb+1;saran.push(jarak<=1?{t:'bahaya',x:`<b>1 kegagalan lagi</b> menggeser cerita ke ending <b>${esc(lebihBuruk.nama)}</b>. Beri pemain pilihan aman, Skill Bantuan, atau momen bernapas.`}
    :{t:'info',x:`${jarak} kenaikan Stack lagi menuju ending <b>${esc(lebihBuruk.nama)}</b>.`})}
  if(lebihBaik)saran.push({t:'baik',x:`Turunkan Stack <b>${sb-lebihBaik.maks}</b> (lewat hasil Kritis) untuk kembali ke ending <b>${esc(lebihBaik.nama)}</b>.`});
  if(sb===0&&!s.ended)saran.push({t:'info',x:'Tim sedang unggul. Naikkan ketegangan: kejadian acak, NPC mencurigakan, atau serangan mendadak (⚔ Diserang).'});
  const kritis=tim.filter(p=>!down(p)&&s.hati[p]<=1);if(kritis.length)saran.push({t:'bahaya',x:`${kritis.map(p=>`<b>${esc(H(p).nama)}</b>`).join(', ')} tinggal 1 ${esc(T('nyawa'))}. ${s.ramuan?`Tawarkan ramuan (sisa ${s.ramuan}) atau`:'Pertimbangkan'} adegan tenang.`});
  const tbg=tim.filter(p=>down(p));if(tbg.length)saran.push({t:'bahaya',x:`${tbg.map(p=>`<b>${esc(H(p).nama)}</b>`).join(', ')} tumbang: tidak ikut melempar sampai dipulihkan.`});
  const sk=tim.reduce((t,p)=>t+num(s.skill[p]),0);if(sk>=tim.length*2&&!s.ended)saran.push({t:'info',x:`Tim masih punya <b>${sk}</b> Skill Khusus. Ingatkan pemain di momen penting.`});
  const tanpaAC=tim.filter(p=>!acOf(H(p)));if(tanpaAC.length)saran.push({t:'info',x:`Pertahanan belum dikunci: ${tanpaAC.map(p=>esc(H(p).nama)).join(', ')}. Klik ⚔ Diserang untuk mengisinya.`});
  let adegan='';
  if(!s.ended){const a=scn(),nx=W.story.adegan[s.cur+1];
    if(a.hasil_wajib)saran.unshift({t:'bahaya',x:'Adegan ini punya <b>hasil wajib</b>: arahkan narasi ke hasil yang sudah ditentukan plot. Pemain hanya bisa mengurangi kerugian.'});
    const qs=Object.entries(s.quests||{}).filter(([,q])=>!q.selesai);if(qs.length)saran.push({t:'info',x:`Quest terbuka: ${qs.map(([k])=>`<b>${esc(k)}</b>`).join(', ')}.`});
    adegan=`<div class="fk-opsi"><small>Opsi di adegan ini</small>${a.opsi.map(o=>`<span class="tagk t-${o.jenis}">${esc(o.kode)} · ${lbl(o.jenis)}</span>`).join(' ')}</div>
      ${nx?`<div class="fk-next"><small>Berikutnya</small><b>Adegan ${nx.no} — ${esc(nx.judul)}</b>${nx.ringkas?`<span>${esc(nx.ringkas)}</span>`:''}</div>`:`<div class="fk-next akhir"><small>Adegan terakhir</small><b>Setelah ini: klik Ke Ending</b></div>`}`}
  el.innerHTML=`<h2 class="fk-h">🧭 Arah cerita</h2>
    <div class="fk-ending"><div><small>Menuju ending</small><b>${esc(cur?cur.nama:'—')}</b></div><div class="fk-sb"><small>Stack</small><b>${sb}</b></div></div>
    <div class="fk-jalur" aria-label="Urutan ending">${es.map(e=>`<span class="${e===cur?'on':''}" title="Stack ≤ ${e.maks>=99?'∞':e.maks}">${esc(e.nama)}</span>`).join('<i>›</i>')}</div>
    ${adegan}
    <ul class="fk-saran">${saran.slice(0,6).map(x=>`<li class="${x.t}">${x.x}</li>`).join('')||'<li class="info">Semua aman. Lanjutkan cerita.</li>'}</ul>`}
$('fokusBtn').onclick=masukFokus;$('fkKeluar').onclick=keluarFokus;
$('fkPrev').onclick=()=>$('prevScn').click();$('fkNext').onclick=()=>$('nextScn').click();
$('fkUndo').onclick=()=>{if(W&&W.undo&&W.undo.length)undoTo(W.undo.length-1)};
$('fkFull').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>toast('Browser menolak layar penuh. Tekan F11.',true))};
document.addEventListener('fullscreenchange',()=>{$('fkFull').textContent=document.fullscreenElement?'⛶ Keluar layar penuh':'⛶ Layar penuh'});
new MutationObserver(()=>{if(fokusAktif())fokusSusun()}).observe($('scene'),{childList:true});
new MutationObserver(()=>{if(fokusAktif())renderArah()}).observe($('party'),{childList:true});
bus.on('tab',p=>{if(p!=='play')keluarFokus();else if(localStorage.getItem(FOKUS_KEY)&&W&&W.sesi&&W.story&&!fokusAktif())masukFokus()});
document.addEventListener('keydown',e=>{const t=e.target;const ketik=t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  if(ketik||e.ctrlKey||e.metaKey||e.altKey||$('modal').classList.contains('show'))return;
  const diPlay=$('p-play').classList.contains('active')&&W&&W.sesi;if(!diPlay)return;
  if(e.key==='f'||e.key==='F'){e.preventDefault();fokusAktif()?keluarFokus():masukFokus();return}
  if(!fokusAktif())return;
  if(e.key==='Escape'&&!document.fullscreenElement){keluarFokus();return}
  if(e.key==='ArrowRight'&&!$('fkNext').disabled){e.preventDefault();$('fkNext').click()}
  if(e.key==='ArrowLeft'&&!$('fkPrev').disabled){e.preventDefault();$('fkPrev').click()}},true);
