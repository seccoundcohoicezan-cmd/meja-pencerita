/** Sistem dadu D&D polyhedral: dadu kelas, tingkat kesulitan, dan distribusi peluang. */
import { clamp, num, sum } from './util';

export interface Tier { k: string; n: string; d: number[] }
export type Dist = Record<number, number>;

export const POOLS: Record<string, number[]> = { 'd20': [20], 'd12+d8': [12, 8], 'd8+d6+d4': [8, 6, 4], 'd10+d6+d4': [10, 6, 4] };
export const POOL_DESC: Record<string, string> = { 'd20': 'untung-untungan, sering Kritis', 'd12+d8': 'stabil', 'd8+d6+d4': 'sangat stabil', 'd10+d6+d4': 'stabil, sedikit lebih kuat' };
export const TIERS: Tier[] = [
  { k: 'sangat_mudah', n: 'Sangat Mudah', d: [4, 6] }, { k: 'mudah', n: 'Mudah', d: [8, 6] }, { k: 'sedang', n: 'Sedang', d: [12, 8] },
  { k: 'sulit', n: 'Sulit', d: [20, 6] }, { k: 'sangat_sulit', n: 'Sangat Sulit', d: [20, 12] }, { k: 'mustahil', n: 'Mustahil', d: [20, 12, 8] }];
export const BOSS_TIERS: Tier[] = [{ k: 'bos_lemah', n: 'Bos Lemah', d: [12, 8] }, { k: 'bos_kuat', n: 'Bos Kuat', d: [20, 6] }, { k: 'raja_bos', n: 'Raja Bos', d: [20, 12] }];

export const dStr = (a: number[]): string => a.map(x => 'd' + x).join(' + ');
export const rollArr = (a: number[], rnd: () => number = Math.random): number => a.reduce((t, x) => t + 1 + Math.floor(rnd() * x), 0);
export const tierOf = (k: string, list: Tier[] = TIERS): Tier | undefined => list.find(t => t.k === k);

export function findTier(v: unknown, list: Tier[] = TIERS): string | null {
  if (v === undefined || v === null || v === '') return null;
  const raw = String(v).toLowerCase().trim(), s = raw.replace(/[\s-]+/g, '_');
  let t = list.find(x => x.k === s || x.n.toLowerCase() === raw); if (t) return t.k;
  t = [...list].sort((a, b) => b.k.length - a.k.length).find(x => s.includes(x.k)); return t ? t.k : null;
}
export function tkToTier(v: unknown): string | null {
  const n = num(v, NaN); if (isNaN(n)) return null;
  return n <= 7 ? 'sangat_mudah' : n <= 9 ? 'mudah' : n <= 12 ? 'sedang' : n <= 15 ? 'sulit' : n <= 19 ? 'sangat_sulit' : 'mustahil';
}
export function shiftTier(k: string, by: number, list: Tier[] = TIERS): string {
  const i = list.findIndex(t => t.k === k); if (i < 0) return k; return list[clamp(i + by, 0, list.length - 1)].k;
}
export function rollD100(rnd: () => number = Math.random): number { const v = Math.floor(rnd() * 10) * 10 + Math.floor(rnd() * 10); return v === 0 ? 100 : v; }

/** Pita kejadian acak d100 dari persentase buruk/tenang (sisanya baik). */
export function bands(k?: { buruk?: number; tenang?: number }) {
  k = k || { buruk: 30, tenang: 40 };
  const b = clamp(num(k.buruk, 30), 2, 96), t = clamp(num(k.tenang, 40), 0, 98 - b); const g = 100 - b - t;
  const bc = Math.max(1, Math.round(b / 3)), top = Math.max(2, Math.round(g / 3));
  return [{ j: 'bencana', a: 1, z: bc }, { j: 'buruk', a: bc + 1, z: b }, { j: 'tenang', a: b + 1, z: b + t }, { j: 'baik', a: b + t + 1, z: 100 - top },
    { j: 'sangat_baik', a: 101 - top, z: 99 }, { j: 'keajaiban', a: 100, z: 100 }].filter(x => x.z >= x.a);
}

export function distOf(dice: number[]): Dist {
  let d: Dist = { 0: 1 };
  dice.forEach(n => { const nd: Dist = {}; for (const s in d) for (let k = 1; k <= n; k++) { const t = +s + k; nd[t] = (nd[t] || 0) + d[s] / n; } d = nd; });
  return d;
}
export function conv(a: Dist, b: Dist): Dist { const r: Dist = {}; for (const x in a) for (const y in b) { const t = +x + +y; r[t] = (r[t] || 0) + a[x] * b[y]; } return r; }
export function shiftDist(d: Dist, by: number): Dist { const r: Dist = {}; for (const k in d) r[+k + by] = d[k]; return r; }

/** Peluang dadu kelas + bonus ≥ dadu GM, dengan aturan Kritis (semua maks) & Gagal Total (semua 1). */
export function pSuccess(pool: number[], bonus: number, tierDice: number[]): number {
  const P = distOf(pool), D = distOf(tierDice), mx = sum(pool), mn = pool.length; let ok = 0;
  for (const r in P) for (const c in D) { const rv = +r; if (rv === mx || (rv !== mn && rv + bonus >= +c)) ok += P[r] * D[c]; }
  return ok;
}
