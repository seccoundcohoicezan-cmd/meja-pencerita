import { describe, it, expect } from 'vitest';
import { POOLS, TIERS, BOSS_TIERS, bands, distOf, pSuccess, shiftTier, findTier, tkToTier, rollArr, rollD100 } from './dice';
import { resultTier, kontesTier, aidCap, aidFailOpts, AID_MAG, DC_TABLE, dcTierOf, findSkill, SKILLS, CLASS_SKILLS, shuffledAbility, ABILITY_ARRAY, matchKelas, tierText, tierEfek } from './skills';
import { pD20, pKontes, pPool, pDuel, pDuelRonde, pBoss, pKelompok, d20Dist, poolDist } from './prob';
import { improv, improvTables, IMPROV_JENIS } from './improv';
import { normL, slug, esc, fmtMod } from './util';

const total = (d: Record<number, number>) => Object.values(d).reduce((a, b) => a + b, 0);
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]; };

describe('dadu', () => {
  it('distribusi setiap dadu berjumlah 1', () => {
    Object.values(POOLS).forEach(p => expect(total(distOf(p))).toBeCloseTo(1, 10));
    [...TIERS, ...BOSS_TIERS].forEach(t => expect(total(distOf(t.d))).toBeCloseTo(1, 10));
  });
  it('rollArr selalu dalam rentang', () => {
    for (let i = 0; i < 500; i++) { const v = rollArr([12, 8]); expect(v).toBeGreaterThanOrEqual(2); expect(v).toBeLessThanOrEqual(20); }
    expect(rollArr([20], seq(0.9999))).toBe(20); expect(rollD100(seq(0, 0))).toBe(100);
  });
  it('pita kejadian d100 menutup 1–100 tanpa celah', () => {
    [{ buruk: 30, tenang: 40 }, { buruk: 45, tenang: 35 }, { buruk: 2, tenang: 0 }, { buruk: 96, tenang: 10 }].forEach(k => {
      const b = bands(k); expect(b[0].a).toBe(1); expect(b[b.length - 1].z).toBe(100);
      for (let i = 1; i < b.length; i++) expect(b[i].a).toBe(b[i - 1].z + 1);
    });
  });
  it('tingkat: cari, geser, dan konversi TK angka', () => {
    expect(findTier('Sangat Sulit')).toBe('sangat_sulit'); expect(findTier('sedang')).toBe('sedang'); expect(findTier('Bos Kuat', BOSS_TIERS)).toBe('bos_kuat');
    expect(findTier('')).toBeNull(); expect(shiftTier('sedang', 1)).toBe('sulit'); expect(shiftTier('mustahil', 3)).toBe('mustahil'); expect(shiftTier('bos_kuat', -5, BOSS_TIERS)).toBe('bos_lemah');
    expect(tkToTier(14)).toBe('sulit'); expect(tkToTier('abc')).toBeNull();
  });
  it('peluang sukses turun seiring tingkat naik', () => {
    const ps = TIERS.map(t => pSuccess(POOLS['d12+d8'], 3, t.d));
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeLessThan(ps[i - 1]);
    // d20 selalu punya peluang Kritis 1/20 bahkan di Mustahil
    expect(pSuccess([20], 0, TIERS[5].d)).toBeGreaterThanOrEqual(0.05);
  });
});

describe('tingkat hasil (Modul E)', () => {
  it('batas selisih', () => {
    expect(resultTier(20, 15)).toBe('berhasil_bersih'); expect(resultTier(19, 15)).toBe('berhasil_komplikasi'); expect(resultTier(15, 15)).toBe('berhasil_komplikasi');
    expect(resultTier(14, 15)).toBe('gagal'); expect(resultTier(11, 15)).toBe('gagal'); expect(resultTier(10, 15)).toBe('gagal_total');
  });
  it('kontes: seri dimenangkan lawan', () => {
    expect(kontesTier(0)).toBe('gagal'); expect(kontesTier(1)).toBe('berhasil_komplikasi'); expect(kontesTier(5)).toBe('berhasil_bersih'); expect(kontesTier(-5)).toBe('gagal_total');
  });
  it('narasi & efek fallback ke berhasil/gagal', () => {
    const o = { berhasil: 'B', gagal: 'G', efek_berhasil: { item: 'x' }, efek_komplikasi: { stack: 1 } };
    expect(tierText(o, 'berhasil_komplikasi')).toBe('B'); expect(tierText(o, 'gagal_total')).toBe('G');
    expect(tierEfek(o, 'berhasil_komplikasi')).toEqual({ item: 'x', stack: 1 });
  });
});

describe('skill bantuan (aturan 13–17)', () => {
  it('Sangat Mudah tidak boleh untuk efek mekanik', () => {
    ['turun_tingkat', 'kurangi_bos', 'bonus_tim', 'adv', 'nyawa_semua', 'lewati_bos'].forEach(t => expect(aidCap(t, 'sangat_mudah')).toBe(0));
  });
  it('lewati_bos hanya di Sangat Sulit & Mustahil', () => {
    expect(aidCap('lewati_bos', 'sulit')).toBe(0); expect(aidCap('lewati_bos', 'sangat_sulit')).toBe(1); expect(aidCap('lewati_bos', 'mustahil')).toBe(1);
  });
  it('magnitudo naik seiring DC dan efek terbesar setara ≤ 3 Stack', () => {
    const order = ['mudah', 'sedang', 'sulit', 'sangat_sulit', 'mustahil'];
    for (let i = 1; i < order.length; i++) expect(AID_MAG[order[i]].tambahan).toBeGreaterThanOrEqual(AID_MAG[order[i - 1]].tambahan);
    expect(AID_MAG.mustahil.tambahan).toBeLessThanOrEqual(6);
  });
  it('gagal selalu punya harga', () => {
    Object.keys(DC_TABLE).forEach(k => { const f = aidFailOpts(k); expect(f.length).toBeGreaterThan(0); f.forEach(x => expect(Object.keys(x.ef).length).toBeGreaterThan(0)); });
  });
  it('DC angka dipetakan ke tingkat terdekat', () => { expect(dcTierOf(15)).toBe('sedang'); expect(dcTierOf(22)).toBe('sulit'); expect(dcTierOf(28)).toBe('mustahil'); });
});

describe('ability & kelas (Modul A & G)', () => {
  it('ability selalu memakai kumpulan tetap (total +5)', () => {
    for (let i = 0; i < 50; i++) { const a = shuffledAbility(); expect(Object.values(a).sort()).toEqual([...ABILITY_ARRAY].sort()); }
  });
  it('setiap kelas punya tepat 4 skill yang valid dan tidak dobel', () => {
    Object.entries(CLASS_SKILLS).forEach(([, list]) => {
      expect(list.length).toBe(4);
      list.forEach(c => { expect(c.skills.length).toBe(4); expect(new Set(c.skills).size).toBe(4); c.skills.forEach(s => expect(SKILLS.find(x => x.n === s)).toBeTruthy()); });
    });
  });
  it('pencocokan kelas: nomor, nama, kata kunci, dan cadangan urutan', () => {
    expect(matchKelas('2', 'fantasy', 0, normL)).toMatchObject({ cara: 'nomor', m: { nama: 'Pendekar Perisai' } });
    expect(matchKelas('Pemburu', 'fantasy', 0, normL).m.nama).toBe('Pemburu Bayangan');
    expect(matchKelas('hacker jalanan', 'cyberpunk', 0, normL).m.nama).toBe('Netrunner');
    expect(matchKelas('tukang roti', 'fantasy', 6, normL)).toMatchObject({ cara: 'urutan', m: { nama: 'Penyihir Liar' } });
  });
  it('nama skill Indonesia dikenali', () => { expect(findSkill('persuasi')).toBe('Persuasion'); expect(findSkill('Sleight of hand')).toBe('Sleight of Hand'); expect(findSkill('xyz')).toBeNull(); });
});

describe('peluang di kalkulator', () => {
  it('distribusi Advantage/Disadvantage valid', () => {
    (['normal', 'adv', 'dis'] as const).forEach(m => { expect(total(d20Dist(m))).toBeCloseTo(1, 10); expect(total(poolDist([12, 8], m))).toBeCloseTo(1, 10); });
    expect(pD20(0, 11, 'adv')).toBeGreaterThan(pD20(0, 11)); expect(pD20(0, 11, 'dis')).toBeLessThan(pD20(0, 11));
    expect(pD20(0, 11)).toBeCloseTo(0.5, 10);
  });
  it('kontes simetris: mod sama → peluang < 50% karena seri milik lawan', () => {
    expect(pKontes(0, 0)).toBeCloseTo(190 / 400, 10);
  });
  it('pPool tanpa Advantage sama dengan pSuccess', () => {
    TIERS.forEach(t => expect(pPool([10, 6, 4], 2, t.d)).toBeCloseTo(pSuccess([10, 6, 4], 2, t.d), 10));
  });
  it('duel: menang 2 dari 3', () => { expect(pDuel(0.5, 0.5)).toBeCloseTo(0.5, 10); expect(pDuel(1, 1)).toBe(1); expect(pDuelRonde([20], 0, [20, 6], 0)).toBeLessThan(0.5); });
  it('bos & kelompok dalam 0–1 dan menang ≤ menang-tipis', () => {
    const hs = [{ pool: [12, 8], bonus: 3 }, { pool: [20], bonus: 4 }, { pool: [8, 6, 4], bonus: 2 }];
    BOSS_TIERS.forEach(t => { const r = pBoss(hs, t.d, 0); expect(r.menang).toBeLessThanOrEqual(r.tipis); expect(r.tipis).toBeLessThanOrEqual(1); });
    const k = pKelompok(hs, TIERS[2].d); expect(k).toBeGreaterThan(0); expect(k).toBeLessThan(1);
  });
});

describe('improvisasi & utilitas', () => {
  it('setiap genre & jenis menghasilkan teks', () => {
    Object.keys(improvTables).forEach(g => IMPROV_JENIS.forEach(([j]) => { const r = improv(g, j); expect(r.teks.length).toBeGreaterThan(3); }));
  });
  it('utilitas', () => { expect(slug('Senna Ardalén!')).toBe('sennaardalen'); expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;'); expect(fmtMod(-2)).toBe('−2'); expect(normL('Kelas / Peran (pilih)')).toBe('kelasperan'); });
});
