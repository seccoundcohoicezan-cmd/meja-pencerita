import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { cariMusik } from './api/_musik-inti.js';

const r = p => resolve(import.meta.dirname, p);

/** Saat `npm run dev`, /api/musik dilayani langsung oleh Vite (di Vercel oleh api/musik.js). Key dibaca dari .env.local, tanpa awalan VITE_. */
const apiMusikDev = key => ({
  name: 'api-musik-dev',
  configureServer(server) {
    server.middlewares.use('/api/musik', async (req, res) => {
      const u = new URL(req.url || '', 'http://x');
      const h = await cariMusik({ kategori: u.searchParams.get('kategori') || '', genre: u.searchParams.get('genre') || '', apiKey: key, ip: 'dev' });
      res.statusCode = h.status; Object.entries(h.headers).forEach(([k, v]) => res.setHeader(k, v)); res.end(JSON.stringify(h.body));
    });
  },
});

export default defineConfig(({ mode }) => ({
  plugins: [apiMusikDev(loadEnv(mode, import.meta.dirname, '').YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY || '')],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { index: r('index.html'), portal: r('portal.html'), layar: r('layar.html'), privasi: r('privasi.html'), syarat: r('syarat.html'), atribusi: r('atribusi.html') },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
}));
