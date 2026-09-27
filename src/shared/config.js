/**
 * Konfigurasi publik. Nilai di sini AMAN berada di browser:
 * publishable key hanya memberi akses sesuai aturan RLS di database.
 * Bisa ditimpa lewat Environment Variables di Vercel (lihat README).
 * JANGAN pernah menaruh service_role key atau Google client secret di sini.
 */
const env = import.meta.env || {};
export const CONFIG = {
  supabaseUrl: env.VITE_SUPABASE_URL || 'https://jadytrdmntfhudarysdy.supabase.co',
  supabaseKey: env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_laOqYOfpKPP4qsDIZDQmcg_KrHwe-R8',
  situs: env.VITE_SITE_URL || 'https://dndmastery.vercel.app',
  /** Email kontak untuk kebijakan privasi & permintaan hapus data. WAJIB diisi sebelum rilis publik. */
  kontak: env.VITE_KONTAK_EMAIL || '',
  nama: 'MasteryDnD',
};
