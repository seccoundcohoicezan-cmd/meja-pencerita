/** Modul A, B, E, F, G: ability, skill individu, DC, skill bantuan, tingkat hasil, kelas per genre. */
import { num } from './util';
import { TIERS } from './dice';

export type Abil = 'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA';
export interface SkillDef { n: string; a: Abil }
export interface KelasDef { nama: string; kata: string[]; skills: string[] }
export type HasilTier = 'berhasil_bersih' | 'berhasil_komplikasi' | 'gagal' | 'gagal_total';

export const ABILS: Abil[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
export const ABIL_NAMA: Record<Abil, string> = { STR: 'Kekuatan', DEX: 'Kelincahan', CON: 'Ketahanan', INT: 'Kecerdasan', WIS: 'Kebijaksanaan', CHA: 'Karisma' };
/** Kumpulan tetap: total selalu +5, hanya urutannya yang diacak per pahlawan. */
export const ABILITY_ARRAY = [3, 2, 1, 0, 0, -1];
export const SKILLS: SkillDef[] = ([['Acrobatics', 'DEX'], ['Animal Handling', 'WIS'], ['Arcana', 'INT'], ['Athletics', 'STR'], ['Deception', 'CHA'], ['History', 'INT'],
  ['Insight', 'WIS'], ['Intimidation', 'CHA'], ['Investigation', 'INT'], ['Medicine', 'WIS'], ['Nature', 'INT'], ['Perception', 'WIS'], ['Performance', 'CHA'],
  ['Persuasion', 'CHA'], ['Religion', 'INT'], ['Sleight of Hand', 'DEX'], ['Stealth', 'DEX'], ['Survival', 'WIS']] as [string, Abil][]).map(([n, a]) => ({ n, a }));
const SKILL_ID: Record<string, string> = { akrobatik: 'Acrobatics', hewan: 'Animal Handling', sihir: 'Arcana', atletik: 'Athletics', tipu: 'Deception', sejarah: 'History',
  wawasan: 'Insight', intimidasi: 'Intimidation', investigasi: 'Investigation', penyelidikan: 'Investigation', medis: 'Medicine', pengobatan: 'Medicine', alam: 'Nature',
  persepsi: 'Perception', pertunjukan: 'Performance', persuasi: 'Persuasion', bujuk: 'Persuasion', agama: 'Religion', tangan: 'Sleight of Hand', menyelinap: 'Stealth',
  siluman: 'Stealth', bertahan: 'Survival' };

/** Cocokkan nama skill (Inggris atau sebutan Indonesia) ke nama baku. */
export function findSkill(v: unknown): string | null {
  if (!v) return null; const t = String(v).toLowerCase().replace(/[^a-z]/g, '');
  const s = SKILLS.find(x => x.n.toLowerCase().replace(/[^a-z]/g, '') === t); if (s) return s.n;
  const k = Object.keys(SKILL_ID).find(k => t.includes(k)); return k ? SKILL_ID[k] : null;
}
export const skAbil = (n: string): Abil | '' => (SKILLS.find(x => x.n === n) || ({} as Partial<SkillDef>)).a || '';

export const DC_TABLE: Record<string, number> = { sangat_mudah: 5, mudah: 10, sedang: 15, sulit: 20, sangat_sulit: 25, mustahil: 30 };
export function dcTierOf(dcIn: unknown): string {
  const dc = num(dcIn, 15); let best = 'sedang', bd = 1e9;
  Object.entries(DC_TABLE).forEach(([k, v]) => { const d = Math.abs(v - dc); if (d < bd) { bd = d; best = k; } }); return best;
}
export const tierIdx = (k: string): number => TIERS.findIndex(t => t.k === k);

/** Aturan 13: magnitudo efek maksimum skill_bantuan per tingkat DC. */
export const AID_MAG: Record<string, { tambahan: number; tingkat: number; bonus_tim: number; besar: boolean }> = {
  sangat_mudah: { tambahan: 0, tingkat: 0, bonus_tim: 0, besar: false }, mudah: { tambahan: 1, tingkat: 0, bonus_tim: 1, besar: false },
  sedang: { tambahan: 2, tingkat: 1, bonus_tim: 2, besar: false }, sulit: { tambahan: 3, tingkat: 1, bonus_tim: 3, besar: false },
  sangat_sulit: { tambahan: 4, tingkat: 2, bonus_tim: 4, besar: true }, mustahil: { tambahan: 6, tingkat: 2, bonus_tim: 6, besar: true } };
export const AID_TYPES: [string, string][] = [['turun_tingkat', 'Tingkat tantangan berikutnya turun'], ['kurangi_bos', 'Nilai tambahan bos berikutnya turun'],
  ['bonus_tim', 'Bonus tim di Serangan Bos berikutnya'], ['adv', 'Advantage untuk lemparan berikutnya'], ['nyawa_semua', 'Semua pahlawan pulih Nyawa'],
  ['lewati_bos', 'Lewati Serangan Bos (khusus Persuasion)'], ['info', 'Hanya informasi (dibacakan GM)']];
export const aidLabel = (t: string): string => (AID_TYPES.find(x => x[0] === t) || [t, t])[1];
export function aidCap(tipe: string, tk: string): number {
  const m = AID_MAG[tk] || AID_MAG.sedang;
  if (tipe === 'turun_tingkat') return m.tingkat; if (tipe === 'kurangi_bos') return m.tambahan; if (tipe === 'bonus_tim') return m.bonus_tim;
  if (tipe === 'nyawa_semua' || tipe === 'adv') return tk === 'sangat_mudah' ? 0 : 1; if (tipe === 'lewati_bos') return m.besar ? 1 : 0; return 0;
}
/** Aturan 15: harga gagal skill_bantuan sesuai DC yang dicoba. */
export function aidFailOpts(tk: string): { k: string; t: string; ef: Record<string, number> }[] {
  const i = tierIdx(tk); if (i <= 2) return [{ k: 'a', t: 'Stack Bayangan +1', ef: { stack: 1 } }];
  if (tk === 'sulit') return [{ k: 'a', t: 'Stack Bayangan +1', ef: { stack: 1 } }, { k: 'b', t: 'Tingkat tantangan utama naik 1', ef: { tingkat: 1 } }];
  return [{ k: 'a', t: 'Stack Bayangan +1 dan tingkat tantangan utama naik 1', ef: { stack: 1, tingkat: 1 } }, { k: 'b', t: 'Pelaku −1 Nyawa', ef: { nyawa_pelaku: 1 } }];
}

/** Modul E: tingkat hasil dari selisih total terhadap target. */
export function resultTier(total: number, target: number): HasilTier {
  const diff = total - target; if (diff <= -5) return 'gagal_total'; if (diff < 0) return 'gagal'; if (diff < 5) return 'berhasil_komplikasi'; return 'berhasil_bersih';
}
/** Kontes: unggul 1–4 = komplikasi, unggul 5+ = bersih, seri = kalah. */
export function kontesTier(margin: number): HasilTier {
  return margin <= -5 ? 'gagal_total' : margin <= 0 ? 'gagal' : margin < 5 ? 'berhasil_komplikasi' : 'berhasil_bersih';
}
export const RT_LABEL: Record<HasilTier, string> = { berhasil_bersih: 'Berhasil Bersih', berhasil_komplikasi: 'Berhasil dengan Komplikasi', gagal: 'Gagal', gagal_total: 'Gagal Berat' };
export const RT_CLS: Record<HasilTier, string> = { berhasil_bersih: 'win', berhasil_komplikasi: 'thin', gagal: 'lose', gagal_total: 'worst' };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opsi = Record<string, any>;
export const hasTierText = (o: Opsi): boolean => !!(o.berhasil_bersih || o.berhasil_komplikasi || o.gagal_total || o.efek_komplikasi || o.efek_gagal_total);
export function tierText(o: Opsi, rt: HasilTier): string {
  if (rt === 'berhasil_bersih') return o.berhasil_bersih || o.berhasil || 'Berhasil.';
  if (rt === 'berhasil_komplikasi') return o.berhasil_komplikasi || o.berhasil || 'Berhasil, tetapi ada harga kecil (GM tentukan).';
  if (rt === 'gagal_total') return o.gagal_total || o.gagal || 'Gagal.'; return o.gagal || 'Gagal.';
}
export function tierEfek(o: Opsi, rt: HasilTier): Opsi | undefined {
  if (rt === 'berhasil_bersih') return o.efek_berhasil;
  if (rt === 'berhasil_komplikasi') return Object.assign({}, o.efek_berhasil || {}, o.efek_komplikasi || {});
  if (rt === 'gagal_total') return o.efek_gagal_total || o.efek_gagal; return o.efek_gagal;
}

/** Modul G: 4 kelas per genre, masing-masing tepat 4 skill proficient. */
export const CLASS_SKILLS: Record<string, KelasDef[]> = {
 fantasy:[
   {nama:'Pemburu Bayangan',kata:['pemburu','ranger','pemanah'],skills:['Perception','Stealth','Survival','Animal Handling']},
   {nama:'Pendekar Perisai',kata:['perisai','ksatria','tank','pelindung'],skills:['Athletics','Intimidation','Medicine','Insight']},
   {nama:'Penyihir Liar',kata:['penyihir','mage','sihir'],skills:['Arcana','History','Investigation','Deception']},
   {nama:'Pendeta Cahaya',kata:['pendeta','healer','imam'],skills:['Religion','Persuasion','Medicine','Insight']}],
 archive:[
   {nama:'Agen Lapangan',kata:['agen','lapangan','mata-mata'],skills:['Athletics','Stealth','Sleight of Hand','Perception']},
   {nama:'Penjaga Ordo',kata:['penjaga','ordo','pelindung'],skills:['Intimidation','Insight','Survival','Medicine']},
   {nama:'Kriptografer',kata:['kripto','sandi','pustakawan'],skills:['Arcana','History','Investigation','Religion']},
   {nama:'Diplomat Arsip',kata:['diplomat','negosiator'],skills:['Persuasion','Deception','Performance','Insight']}],
 apocalyptic:[
   {nama:'Pemburu Reruntuhan',kata:['pemburu','scavenger','perampok'],skills:['Athletics','Survival','Stealth','Perception']},
   {nama:'Pelindung Karavan',kata:['pelindung','penjaga','tank'],skills:['Intimidation','Medicine','Insight','Animal Handling']},
   {nama:'Mekanik',kata:['mekanik','teknisi'],skills:['Investigation','Sleight of Hand','Nature','History']},
   {nama:'Penyembuh Kamp',kata:['penyembuh','medis','healer'],skills:['Persuasion','Performance','Religion','Deception']}],
 zombies:[
   {nama:'Pemburu Senyap',kata:['pemburu','penembak','sniper'],skills:['Athletics','Stealth','Perception','Survival']},
   {nama:'Penjaga Barikade',kata:['penjaga','barikade','tank'],skills:['Intimidation','Medicine','Insight','Sleight of Hand']},
   {nama:'Ahli Kimia Darurat',kata:['ahli','kimia','ilmuwan'],skills:['Investigation','Nature','Arcana','History']},
   {nama:'Medis Lapangan',kata:['medis','dokter','perawat'],skills:['Medicine','Persuasion','Performance','Deception']}],
 cyberpunk:[
   {nama:'Solo',kata:['solo','tentara bayaran','mercenary'],skills:['Athletics','Intimidation','Perception','Stealth']},
   {nama:'Netrunner',kata:['netrunner','hacker'],skills:['Investigation','Arcana','Sleight of Hand','Insight']},
   {nama:'Techie',kata:['techie','teknisi'],skills:['History','Medicine','Nature','Investigation']},
   {nama:'Face',kata:['face','fixer','negosiator'],skills:['Persuasion','Deception','Performance','Insight']}],
 mystery:[
   {nama:'Detektif Lapangan',kata:['detektif','penyelidik'],skills:['Athletics','Stealth','Investigation','Perception']},
   {nama:'Bodyguard',kata:['bodyguard','pengawal','tank'],skills:['Intimidation','Insight','Medicine','Survival']},
   {nama:'Analis Forensik',kata:['forensik','analis','ilmuwan'],skills:['History','Arcana','Religion','Nature']},
   {nama:'Negosiator',kata:['negosiator','psikolog','diplomat'],skills:['Persuasion','Deception','Performance','Insight']}],
 custom:[
   {nama:'Kelas 1 — Pengintai',kata:[],skills:['Athletics','Stealth','Perception','Survival']},
   {nama:'Kelas 2 — Penahan',kata:[],skills:['Intimidation','Insight','Medicine','Animal Handling']},
   {nama:'Kelas 3 — Ahli',kata:[],skills:['Investigation','Arcana','History','Nature']},
   {nama:'Kelas 4 — Pendukung',kata:[],skills:['Persuasion','Deception','Performance','Religion']}]
};
export const classTable = (g: string): KelasDef[] => CLASS_SKILLS[g] || CLASS_SKILLS.custom;

/** Acak urutan ABILITY_ARRAY (Fisher–Yates) ke 6 ability. */
export function shuffledAbility(rnd: () => number = Math.random): Record<Abil, number> {
  const a = [...ABILITY_ARRAY];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const o = {} as Record<Abil, number>; ABILS.forEach((k, i) => o[k] = a[i]); return o;
}
/** Cocokkan teks kelas ke kelas genre: nomor 1–4, nama, kata kunci, lalu urutan pendaftaran. */
export function matchKelas(kelas: string, genre: string, idx: number, normL: (s: unknown) => string): { m: KelasDef; cara: 'nomor' | 'nama' | 'kata' | 'urutan' } {
  const table = classTable(genre); const raw = String(kelas || '').trim(); const teks = normL(raw);
  const n = parseInt(raw, 10); if (/^\d+$/.test(raw) && n >= 1 && n <= table.length) return { m: table[n - 1], cara: 'nomor' };
  let m = teks ? table.find(c => teks.includes(normL(c.nama)) || (normL(c.nama).includes(teks) && teks.length > 3)) : undefined; if (m) return { m, cara: 'nama' };
  const low = raw.toLowerCase(); m = low ? table.find(c => c.kata.some(k => low.includes(k))) : undefined; if (m) return { m, cara: 'kata' };
  return { m: table[Math.max(0, idx) % table.length], cara: 'urutan' };
}

/* ================= Ability sederhana, Pertahanan (AC), Serangan musuh, Uji Ability ================= */
/** Nama pendek berbahasa Indonesia + kegunaan, supaya pemain langsung paham arti tiap ability. */
export const ABIL_SEDERHANA: Record<Abil, { n: string; ikon: string; u: string }> = {
  STR: { n: 'Kuat', ikon: '💪', u: 'mengangkat, memanjat, mendobrak' },
  DEX: { n: 'Lincah', ikon: '🤸', u: 'menghindar, menyelinap, melompat' },
  CON: { n: 'Tahan', ikon: '🛡️', u: 'menahan racun, lelah, dingin, dan sakit' },
  INT: { n: 'Pintar', ikon: '🧠', u: 'mengingat, menyelidiki, sihir' },
  WIS: { n: 'Peka', ikon: '👁️', u: 'melihat, naluri, merawat luka' },
  CHA: { n: 'Pesona', ikon: '✨', u: 'membujuk, berbohong, menakut-nakuti' },
};
/** Pertahanan (Armor Class): hasil 1 d20 yang dikocok pemain SEKALI di awal, lalu terkunci. */
export function nilaiPertahanan(p: unknown): number | null {
  const v = p && typeof p === 'object' ? Math.round(num((p as { nilai?: unknown }).nilai, 0)) : 0;
  return v >= 1 && v <= 20 ? v : null;
}

/** Kekuatan serangan musuh: d20 + bonus ini melawan Pertahanan pahlawan. */
export const MUSUH: { k: string; nama: string; bonus: number; ket: string }[] = [
  { k: 'lemah', nama: 'Lemah', bonus: 2, ket: 'tikus raksasa, preman, zombie lambat' },
  { k: 'biasa', nama: 'Biasa', bonus: 4, ket: 'prajurit, serigala, penjaga' },
  { k: 'kuat', nama: 'Kuat', bonus: 6, ket: 'ogre, pemimpin geng, monster' },
  { k: 'bos', nama: 'Bos', bonus: 8, ket: 'naga, raja iblis, bos terakhir' },
];
export interface HasilSerang { d20: number; bonus: number; total: number; ac: number; kena: boolean; kritis: boolean; luput: boolean; luka: number }
/** Aturan: total ≥ AC = kena (−1 Nyawa). d20 = 20 selalu kena (−2). d20 = 1 selalu luput. */
export function seranganMusuh(d20: number, bonus: number, ac: number): HasilSerang {
  const total = d20 + bonus; const kritis = d20 === 20; const luput = d20 === 1;
  const kena = kritis || (!luput && total >= ac);
  return { d20, bonus, total, ac, kena, kritis, luput, luka: kena ? (kritis ? 2 : 1) : 0 };
}
/** Peluang musuh mengenai (0–1), untuk ditampilkan ke GM. */
export function peluangKena(bonus: number, ac: number): number {
  let n = 0; for (let r = 1; r <= 20; r++) if (seranganMusuh(r, bonus, ac).kena) n++; return n / 20;
}
/** Uji Ability (saving throw): d20 + ability ≥ DC. Dipakai saat pahlawan harus MENAHAN sesuatu. */
export const UJI_CONTOH: Record<Abil, string> = {
  STR: 'tetap berdiri saat didorong raksasa', DEX: 'melompat menghindari jebakan/ledakan', CON: 'menahan racun, lelah, atau dingin',
  INT: 'melawan ilusi dan tipuan sihir', WIS: 'tidak terpengaruh rasa takut atau hipnotis', CHA: 'melawan kerasukan atau kutukan',
};
