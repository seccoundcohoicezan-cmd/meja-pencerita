import { defineConfig } from 'vite';
import { resolve } from 'node:path';

const r = p => resolve(import.meta.dirname, p);
export default defineConfig({
  build: {
    target: 'es2020',
    rollupOptions: {
      input: { index: r('index.html'), portal: r('portal.html'), layar: r('layar.html'), privasi: r('privasi.html'), syarat: r('syarat.html'), atribusi: r('atribusi.html') },
    },
  },
  test: { include: ['src/**/*.test.ts'] },
});
