/** Peluang sukses untuk kalkulator GM (ditampilkan sebelum melempar). */
import { conv, distOf, shiftDist, type Dist } from './dice';
import { clamp, sum } from './util';

export type AdvMode = 'normal' | 'adv' | 'dis';

/** Distribusi satu d20 dengan Advantage/Disadvantage. */
export function d20Dist(mode: AdvMode = 'normal'): Dist {
  const d: Dist = {};
  for (let v = 1; v <= 20; v++) {
    const le = v / 20, lt = (v - 1) / 20;
    d[v] = mode === 'adv' ? le * le - lt * lt : mode === 'dis' ? (1 - lt) ** 2 - (1 - le) ** 2 : 1 / 20;
  }
  return d;
}
/** Skill check: P(d20 + mod ≥ dc). */
export function pD20(mod: number, dc: number, mode: AdvMode = 'normal'): number {
  const p = clamp((21 - (dc - mod)) / 20, 0, 1);
  return mode === 'adv' ? 1 - (1 - p) ** 2 : mode === 'dis' ? p * p : p;
}
/** Pasif: 10 + mod (+5 / −5) ≥ dc → 0 atau 1. */
export const pPasif = (mod: number, dc: number, mode: AdvMode = 'normal'): number => (10 + mod + (mode === 'adv' ? 5 : mode === 'dis' ? -5 : 0) >= dc ? 1 : 0);
/** Kontes: P(d20 + mod > d20 + modLawan), seri dimenangkan lawan. */
export function pKontes(mod: number, lawanMod: number, mode: AdvMode = 'normal'): number {
  const a = d20Dist(mode), b = d20Dist('normal'); let w = 0;
  for (const x in a) for (const y in b) if (+x + mod > +y + lawanMod) w += a[x] * b[y];
  return w;
}
/** Dadu kelas dengan Advantage/Disadvantage (lempar dua kali, ambil terbaik/terburuk). */
export function poolDist(pool: number[], mode: AdvMode = 'normal'): Dist {
  const d = distOf(pool); if (mode === 'normal') return d;
  const keys = Object.keys(d).map(Number).sort((x, y) => x - y); const out: Dist = {}; let cum = 0;
  keys.forEach(k => { const le = cum + d[k], lt = cum; out[k] = mode === 'adv' ? le * le - lt * lt : (1 - lt) ** 2 - (1 - le) ** 2; cum = le; });
  return out;
}
/** Solo/kelompok per pahlawan: dadu kelas + bonus ≥ dadu GM, dengan Kritis & Gagal Total. */
export function pPool(pool: number[], bonus: number, tierDice: number[], mode: AdvMode = 'normal', autoKritis = false): number {
  if (autoKritis) return 1;
  const P = poolDist(pool, mode), D = distOf(tierDice), mx = sum(pool), mn = pool.length; let ok = 0;
  for (const r in P) for (const c in D) { const rv = +r; if (rv === mx || (rv !== mn && rv + bonus >= +c)) ok += P[r] * D[c]; }
  return ok;
}
/** Kelompok: berhasil bila ≥ separuh pahlawan lulus (lemparan GM sama untuk semua). */
export function pKelompok(heroes: { pool: number[]; bonus: number }[], tierDice: number[]): number {
  if (!heroes.length) return 0; const need = Math.ceil(heroes.length / 2), D = distOf(tierDice); let tot = 0;
  for (const c in D) {
    // distribusi jumlah yang lulus untuk nilai GM = c
    let k: number[] = [1];
    heroes.forEach(h => {
      const P = distOf(h.pool), mx = sum(h.pool), mn = h.pool.length; let p = 0;
      for (const r in P) { const rv = +r; if (rv === mx || (rv !== mn && rv + h.bonus >= +c)) p += P[r]; }
      const nk = new Array(k.length + 1).fill(0); k.forEach((v, i) => { nk[i] += v * (1 - p); nk[i + 1] += v * p; }); k = nk;
    });
    tot += D[c] * k.slice(need).reduce((a, b) => a + b, 0);
  }
  return tot;
}
/** Duel 3 ronde (menang 2): p = peluang menang satu ronde (nilai sama dimenangkan lawan). */
export function pDuelRonde(pool: number[], bonus: number, lawanDice: number[], lawanBonus: number, mode: AdvMode = 'normal'): number {
  const P = poolDist(pool, mode), D = distOf(lawanDice), mx = sum(pool), mn = pool.length; let w = 0;
  for (const r in P) for (const c in D) { const rv = +r; if (rv === mx || (rv !== mn && rv + bonus > +c + lawanBonus)) w += P[r] * D[c]; }
  return w;
}
export function pDuel(p1: number, p: number): number {
  // ronde 1 memakai p1 (bisa Advantage), ronde 2–3 memakai p
  return p1 * (p + (1 - p) * p) + (1 - p1) * p * p;
}
/** Serangan Bos: peluang Menang dan Menang-atau-Menang-Tipis (selisih ≤ 6). */
export function pBoss(heroes: { pool: number[]; bonus: number }[], bossDice: number[], tambahan: number): { menang: number; tipis: number } {
  let team: Dist = { 0: 1 }; heroes.forEach(h => { team = conv(team, shiftDist(distOf(h.pool), h.bonus)); });
  let boss: Dist = { 0: 1 }; for (let i = 0; i < heroes.length; i++) boss = conv(boss, distOf(bossDice));
  boss = shiftDist(boss, tambahan); let w = 0, wt = 0;
  for (const a in team) for (const b in boss) { const p = team[a] * boss[b]; if (+a >= +b) w += p; if (+a >= +b - 6) wt += p; }
  return { menang: w, tipis: wt };
}
export const pct = (p: number): string => Math.round(p * 100) + '%';
