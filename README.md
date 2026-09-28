# MasteryDnD — Meja Pencerita

Alat bercerita untuk Game Master: pahlawan, pembuat prompt cerita, kalkulator dadu, meja permainan, layar presentasi TV, dan portal pemain.

- **Aplikasi GM**: `/`
- **Portal Pemain**: `/portal`
- **Layar Presentasi**: `/layar` (dibuka dari aplikasi GM)
- **Legal**: `/privasi`, `/syarat`, `/atribusi`

- **Game Master wajib masuk dengan Google** sebelum memakai Meja Pencerita. Data tetap disimpan juga di perangkat (bisa lanjut saat sinyal putus), dan dipisah per akun.
- **Pemain tidak perlu login**: cukup link/kode 8 huruf dari GM di `/portal`. Kode hangus otomatis saat sesi selesai, bab berganti, atau GM membuat kode baru.
- **Panduan pemain (PDF)**: `/panduan-pemain.pdf`.
- **Pertahanan (AC) — pakem**: pemain mengocok **1 d20 fisik sekali di awal**; GM memasukkannya lalu klik **🔒 Kunci Pertahanan** (atau lewat baris *Pertahanan* di formulir WA). Setelah terkunci, database menolak setiap perubahan. Tombol **⚔ Diserang** (serangan musuh / mendadak) melempar d20 + bonus musuh (Lemah +2 · Biasa +4 · Kuat +6 · Bos +8); hasil ≥ Pertahanan = −1 Nyawa (20 = −2, 1 = luput).
- **Uji ability** (tombol **🎲 Uji**): d20 + ability ≥ DC saat pahlawan harus menahan racun, jebakan, rasa takut, dst. Tahan (CON) sekarang punya fungsi.
- **🎯 Mode Fokus Pencerita** (tab Main, tombol F): layar tiga kolom tanpa distraksi — pahlawan/Stack/ramuan · narasi & opsi · dadu & Arah cerita (dari data cerita, offline). Pintasan ←/→, Esc, layar penuh. Tombol ⚔ Diserang kini bisa langsung mengunci Pertahanan bila belum.
- **Dadu digital** di Portal Pemain, bisa dinyalakan/dimatikan moderator di **Moderator → Pengaturan** (berlaku untuk semua pemain); **❓ Contekan GM** di halaman Main.

---

## Pasang pertama kali (GitHub → Vercel)

### 1. Siapkan database Supabase
Buka Supabase → project `jadytrdmntfhudarysdy` → **SQL Editor** → **New query**.
1. Tempel isi `supabase/001_skema.sql`, klik **Run**.
2. Tempel isi `supabase/002_pembaruan.sql`, klik **Run**.
3. Tempel isi `supabase/003_moderator.sql`, klik **Run** (moderator & log aksi).
4. Tempel isi `supabase/004_kode_tanpa_login.sql`, klik **Run** (kode kartu tanpa login).
5. Tempel isi `supabase/005_pertahanan_pengaturan.sql`, klik **Run** (Pertahanan terkunci & sakelar dadu digital).

Semua aman dijalankan ulang, urut 001 → 005. Kalau 001–004 sudah pernah dijalankan, cukup jalankan `005_pertahanan_pengaturan.sql`.

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

### 6. Login email
Aplikasi hanya memakai Google. Kamu boleh mematikan provider **Email** di Supabase → Authentication → Providers.

---

## Moderator
- **Pemilik web (terkunci):** `seccoundcohoicezan@gmail.com`. Dikunci di database (`email_pemilik()` di `003_moderator.sql`), bukan di browser, jadi tidak bisa diakali dari aplikasi. Email harus sudah terverifikasi (Google otomatis).
- Masuk dengan email itu → menu **♛ Moderator** muncul di kiri.
  - **Log aksi**: siapa masuk/keluar, buat/hapus campaign, mulai/selesai sesi, terbit rekap, buat/pakai undangan, putus pemain, tambah/cabut moderator, hapus akun.
  - **Kelola akses**: pemilik menambah/mencabut moderator lewat email. Moderator lain hanya bisa melihat daftarnya.
- **Portal Pemain → Kode Pemain**: GM melihat pahlawan campaign miliknya; moderator melihat semua campaign. Keduanya bisa membuat, menyalin, dan menghanguskan kode, serta melihat berapa kali kartu dibuka.
- Untuk mengganti email pemilik: ubah teks di fungsi `email_pemilik()` lalu jalankan ulang `003_moderator.sql`.

## Uji manual setelah deploy (5 menit)
1. Buka `/`, klik **Masuk** → Google. Nama & foto muncul di kanan atas, status "Tersimpan di cloud".
2. Buat campaign, tambah pahlawan + foto, klik **Atur posisi foto** (coba mode *Tampilkan utuh*). Buka situs di HP/perangkat lain dengan akun yang sama → campaign & foto muncul.
3. Buka **Portal Pemain → Kode Pemain**, klik **Buat kode**, buka link di jendela penyamaran (tanpa login) → kartu & foto tampil utuh.
4. Mulai sesi, kurangi Hati pahlawan itu → portal pemain berubah dalam ±20 detik tanpa refresh.
4a. Masuk **🎯 Mode Fokus**, pilih opsi → dadu muncul di kanan; tekan → untuk adegan berikutnya, Esc untuk keluar.
4a. Kunci Pertahanan satu pahlawan (mis. 14), lalu coba ubah lagi → tidak bisa. Klik **⚔ Diserang** dan **🎲 Uji** pada pahlawan → hasil tercatat di riwayat dan bisa dibatalkan.
4b. Selesaikan sesi → buka lagi link tadi → muncul pesan kode sudah tidak berlaku.
5. Selesaikan sesi → **Terbitkan ke portal pemain** → rekap muncul di portal.
6. Buka **Layar TV** dari menu kiri → adegan & hasil tampil di jendela kedua.
7. Masuk dengan email pemilik → menu **Moderator** → log aksi berisi langkah-langkah di atas.
8. Di HP: tombol ☰ membuka menu dengan tombol ✕; tombol ← dan tombol Back HP kembali ke halaman sebelumnya.

Kalau ada langkah gagal, buka Akun & Data: pesan error sinkronisasi tampil di sana.

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
src/app/      aplikasi GM (main.js), cloud.js (Supabase), moderator.js, layar-sender.js
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
