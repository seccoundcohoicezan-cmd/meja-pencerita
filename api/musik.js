/** Vercel Function: GET /api/musik?kategori=calm&genre=fantasy → kandidat musik YouTube. Lihat api/_musik-inti.js. */
import { cariMusik } from './_musik-inti.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.status(405).json({ ok: false, kode: 'metode' }); return; }
  const q = req.query || {};
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const r = await cariMusik({ kategori: String(q.kategori || ''), genre: String(q.genre || ''), apiKey: process.env.YOUTUBE_API_KEY || '', ip });
  Object.entries(r.headers).forEach(([k, v]) => res.setHeader(k, v));
  res.status(r.status).json(r.body);
}
