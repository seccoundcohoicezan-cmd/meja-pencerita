# MasteryDnD — Meja Pencerita

Alat bercerita untuk Game Master: pahlawan, pembuat prompt cerita, kalkulator dadu, meja permainan, layar presentasi TV, dan portal pemain.

- **Aplikasi GM**: `/`
- **Portal Pemain**: `/portal`
- **Layar Presentasi**: `/layar` (dibuka dari aplikasi GM)
- **Legal**: `/privasi`, `/syarat`, `/atribusi`

Aplikasi GM tetap bisa dipakai penuh tanpa akun dan tanpa internet; data tersimpan di browser. Akun (Supabase) menambah sinkronisasi cloud, foto di cloud, dan portal pemain.

---

## Pasang pertama kali (GitHub → Vercel)

### 1. Siapkan database Supabase
Buka Supabase → project `jadytrdmntfhudarysdy` → **SQL Editor** → **New query**.
1. Tempel isi `supabase/001_skema.sql`, klik **Run**.
2. Tempel isi `supabase/002_pembaruan.sql`, klik **Run**.

Keduanya aman dijalankan ulang. Kalau sudah pernah menjalankan file SQL sebelumnya, cukup jalankan `002_pembaruan.sql`.

### 2. Atur alamat login di Supabase
**Authentication → URL Configuration**
- **Site URL**: `https://dndmastery.vercel.app`
- **Redirect URLs** (tambahkan keduanya):
  - `https://dndmastery.vercel.app/**`
  - `http://localhost:5173/**`

### 3. Unggah ke GitHub
1. Buat repository baru di GitHub (misal `dndmastery`), boleh Private.
2. Unggah semua isi folder ini **kecuali** `node_modules/` dan `dist/` (sudah diatur di `.gitignore`).
   - Lewat web: **Add file → Upload files**, seret semua file & folder, lalu **Commit**.
   - Atau lewat terminal:
     ```bash
     git init && git add . && git commit -m "MasteryDnD Fase 1"
     git branch -M main
     git remote add origin https://github.com/USERNAME/dndmastery.git
     git push -u origin main
     ```

### 4. Hubungkan ke Vercel
1. Vercel → **Add New → Project** → pilih repository tadi → **Import**.
2. Framework terdeteksi **Vite** otomatis (Build: `npm run build`, Output: `dist`). Tidak perlu diubah.
3. **Environment Variables** — isi minimal:
   | Nama | Nilai |
   |---|---|
   | `VITE_KONTAK_EMAIL` | email kontakmu (tampil di Kebijakan Privasi) |

   Variabel lain di `.env.example` opsional; tanpa diisi, nilai bawaan di `src/shared/config.js` dipakai.
4. Klik **Deploy**. Bila project `dndmastery` sudah ada di Vercel, cukup hubungkan repository ini di **Settings → Git**.

Setiap `git push` ke `main` otomatis men-deploy ulang.

### 5. Google Login
- Google Cloud Console → **OAuth consent screen**: selama status **Testing**, hanya email yang didaftarkan di **Test users** yang bisa masuk. Tambahkan email GM dan pemain uji.
- Untuk dibuka ke publik: klik **Publish app**. Google meminta URL kebijakan privasi → isi `https://dndmastery.vercel.app/privasi`, dan URL syarat → `https://dndmastery.vercel.app/syarat`.
- **Keamanan**: client secret yang pernah terkirim di chat sebaiknya dirotasi (Credentials → OAuth client → **Add secret**, pasang yang baru di Supabase → Authentication → Providers → Google, lalu hapus yang lama).

### 6. Email login (tanpa Google)
Email bawaan Supabase dibatasi beberapa email per jam. Sebelum dibuka ke banyak orang, pasang SMTP sendiri (misal Resend) di **Authentication → Emails → SMTP Settings**.

---

## Uji manual setelah deploy (5 menit)
1. Buka `/`, klik **Masuk** → Google. Nama & foto muncul di kanan atas, status "Tersimpan di cloud".
2. Buat campaign, tambah pahlawan + foto. Buka situs di HP/perangkat lain dengan akun yang sama → campaign & foto muncul.
3. Di kartu pahlawan, klik **Undang ke portal pemain**, buka link di browser lain (akun pemain) → kartu tampil.
4. Mulai sesi, kurangi Nyawa pahlawan itu → portal pemain berubah dalam beberapa detik tanpa refresh.
5. Selesaikan sesi → **Terbitkan ke portal pemain** → rekap muncul di portal.
6. Buka **Layar Presentasi** dari menu kiri → adegan & hasil tampil di jendela kedua.

Kalau ada langkah gagal, buka Pengaturan & Akun: pesan error sinkronisasi tampil di sana.

---

## Pengembangan lokal
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test logika inti
npm run lint       # cek referensi JS
npm run typecheck  # cek TypeScript
npm run build      # hasil ke dist/
```

## Struktur
```
src/core/     logika inti TypeScript + unit test (dadu, skill, peluang, kartu, improvisasi)
src/app/      aplikasi GM (main.js), cloud.js (Supabase), layar-sender.js
src/portal/   portal pemain
src/layar/    layar presentasi TV
src/shared/   config, klien Supabase, splash, halaman legal
src/styles/   tema (mengikuti mockup), portal, layar
supabase/     skema database & RLS
public/       gambar, ikon, manifest PWA, service worker
```

## Catatan keamanan
- `sb_publishable_...` memang boleh ada di browser; akses dibatasi Row Level Security di database.
- **Jangan pernah** menaruh `service_role` key atau Google client secret di kode ini maupun di Environment Variables `VITE_*` (semua `VITE_*` terlihat publik).

## Lisensi & atribusi
Sebagian aturan diadaptasi dari SRD 5.1 (CC-BY-4.0) oleh Wizards of the Coast; lihat `/atribusi`. MasteryDnD tidak berafiliasi dengan Wizards of the Coast.
