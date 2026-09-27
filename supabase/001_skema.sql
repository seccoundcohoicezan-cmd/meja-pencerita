-- =====================================================================
-- MasteryDnD — Skema Database Fase 1 (Supabase / PostgreSQL)
-- Tempel seluruh isi file ini di Supabase: SQL Editor → New query → Run.
-- Aman dijalankan sekali pada project baru.
--
-- Peran:
--   GM      = pemilik campaign. Bisa baca & ubah semua data campaign-nya.
--   Pemain  = punya akun, terhubung ke SATU pahlawan lewat kode undangan.
--             Hanya bisa MELIHAT: kartu & foto pahlawannya, status terkini,
--             dan rekap sesi yang sudah dipublikasikan GM. Tidak bisa melihat
--             cerita, twist, catatan GM, atau pahlawan lain.
-- =====================================================================

-- ---------- PROFIL ----------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nama_tampil  text not null default '',
  paket        text not null default 'gratis',   -- disiapkan untuk monetisasi nanti
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nama_tampil)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- CAMPAIGN ----------
create table public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  nama         text not null default 'Campaign baru',
  genre        text not null,                      -- fantasy | archive | ... | custom
  genre_custom jsonb,                              -- isi R.custom bila genre = custom
  sys          jsonb not null default '{}'::jsonb, -- W.sys (profBonus, sbMax, ending, dst)
  bab_aktif    int  not null default 1,
  version      int  not null default 1,            -- untuk deteksi bentrok sinkronisasi
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.campaigns(owner_id);

create table public.campaign_members (
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  peran        text not null check (peran in ('gm','pemain')),
  hero_id      uuid,                               -- diisi untuk pemain
  joined_at    timestamptz not null default now(),
  primary key (campaign_id, user_id)
);
create index on public.campaign_members(user_id);

-- ---------- PAHLAWAN ----------
create table public.heroes (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  slug         text not null,                      -- h.id (dipakai di JSON cerita)
  data         jsonb not null,                     -- seluruh objek pahlawan (ability, skills, sk, sp, dst)
  foto_path    text,                               -- path di bucket 'foto'
  urutan       int  not null default 0,
  version      int  not null default 1,
  updated_at   timestamptz not null default now(),
  unique (campaign_id, slug)
);
create index on public.heroes(campaign_id);

alter table public.campaign_members
  add constraint campaign_members_hero_fk foreign key (hero_id) references public.heroes(id) on delete set null;

-- ---------- CERITA (per bab) ----------
create table public.stories (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  bab          int  not null default 1,
  judul        text not null default '',
  data         jsonb not null,                     -- JSON cerita yang sudah dinormalisasi
  created_at   timestamptz not null default now()
);
create index on public.stories(campaign_id, bab);

-- ---------- SESI ----------
create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  story_id     uuid references public.stories(id) on delete set null,
  bab          int  not null default 1,
  state        jsonb not null,                     -- W.sesi lengkap (khusus GM)
  bawaan       jsonb,                              -- carry-over dari bab sebelumnya (hati, stack, barang, quest)
  status       text not null default 'berjalan' check (status in ('berjalan','selesai')),
  version      int  not null default 1,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  updated_at   timestamptz not null default now()
);
create index on public.sessions(campaign_id, status);

-- Riwayat aksi permanen (log + dasar fitur Undo). Snapshot undo disimpan di perangkat GM;
-- tabel ini menyimpan jejak aksi agar riwayat tetap ada lintas perangkat.
create table public.session_events (
  id           bigint generated always as identity primary key,
  session_id   uuid not null references public.sessions(id) on delete cascade,
  at           timestamptz not null default now(),
  jenis        text not null,                      -- terapkan | undo | kejadian | skill | manual | ...
  teks         text not null,
  dibatalkan   boolean not null default false
);
create index on public.session_events(session_id, at);

-- ---------- DATA YANG BOLEH DILIHAT PEMAIN ----------
-- Status terkini (ditulis perangkat GM setiap perubahan, dibaca pemain secara real-time).
create table public.hero_status (
  hero_id      uuid primary key references public.heroes(id) on delete cascade,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete set null,
  hati         int  not null default 0,
  hati_maks    int  not null default 3,
  skill_sisa   int  not null default 3,
  tumbang      boolean not null default false,
  gugur        boolean not null default false,
  lencana      text[] not null default '{}',       -- mis. {'Advantage','Perisai'}
  updated_at   timestamptz not null default now()
);
create index on public.hero_status(campaign_id);

-- Rekap cerita yang dipublikasikan GM setelah sesi selesai (tanpa twist/catatan GM).
create table public.session_recaps (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references public.sessions(id) on delete cascade,
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  judul        text not null default '',
  teks         text not null default '',
  terbit       boolean not null default false,
  terbit_at    timestamptz
);
create index on public.session_recaps(campaign_id);

-- ---------- UNDANGAN PEMAIN ----------
create table public.invites (
  kode         text primary key,                   -- 8 karakter, dibuat GM
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  hero_id      uuid not null references public.heroes(id) on delete cascade,
  dibuat_oleh  uuid not null references auth.users(id) on delete cascade,
  kedaluwarsa  timestamptz not null default now() + interval '14 days',
  dipakai_oleh uuid references auth.users(id) on delete set null,
  dipakai_at   timestamptz
);

-- ---------- updated_at & version otomatis ----------
create or replace function public.touch_row() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then new.version := old.version + 1; end if;
  return new;
end $$;
create trigger t_campaigns before update on public.campaigns for each row execute function public.touch_row();
create trigger t_heroes    before update on public.heroes    for each row execute function public.touch_row();
create trigger t_sessions  before update on public.sessions  for each row execute function public.touch_row();

create or replace function public.touch_status() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger t_hero_status before insert or update on public.hero_status for each row execute function public.touch_status();

-- GM otomatis tercatat sebagai anggota ber-peran 'gm' saat membuat campaign.
create or replace function public.add_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.campaign_members (campaign_id, user_id, peran) values (new.id, new.owner_id, 'gm');
  return new;
end $$;
create trigger t_campaign_owner after insert on public.campaigns for each row execute function public.add_owner_member();

-- ---------- FUNGSI BANTU RLS ----------
create or replace function public.is_gm(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from campaigns where id = c and owner_id = auth.uid())
$$;

create or replace function public.my_hero(c uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select hero_id from campaign_members where campaign_id = c and user_id = auth.uid() and peran = 'pemain'
$$;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles         enable row level security;
alter table public.campaigns        enable row level security;
alter table public.campaign_members enable row level security;
alter table public.heroes           enable row level security;
alter table public.stories          enable row level security;
alter table public.sessions         enable row level security;
alter table public.session_events   enable row level security;
alter table public.hero_status      enable row level security;
alter table public.session_recaps   enable row level security;
alter table public.invites          enable row level security;

-- profil: hanya diri sendiri
create policy profil_baca  on public.profiles for select using (id = auth.uid());
create policy profil_ubah  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and paket = (select p.paket from public.profiles p where p.id = auth.uid()));

-- campaign: KHUSUS GM. Kolom sys berisi plot kasar & takdir gugur (spoiler), jadi pemain
-- TIDAK diberi akses tabel. Pemain memakai fungsi portal_campaigns() di bawah (nama & genre saja).
create policy camp_gm      on public.campaigns for all    using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- anggota: GM kelola; pemain lihat keanggotaannya sendiri
create policy mem_gm       on public.campaign_members for all    using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy mem_diri     on public.campaign_members for select using (user_id = auth.uid());

-- pahlawan: GM penuh; pemain hanya baca pahlawannya sendiri
create policy hero_gm      on public.heroes for all    using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy hero_pemain  on public.heroes for select using (id = public.my_hero(campaign_id));

-- cerita, sesi, riwayat: KHUSUS GM (berisi twist & catatan GM)
create policy story_gm     on public.stories  for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy sesi_gm      on public.sessions for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy event_gm     on public.session_events for all
  using (exists (select 1 from public.sessions s where s.id = session_id and public.is_gm(s.campaign_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.is_gm(s.campaign_id)));

-- status: GM tulis; pemain baca statusnya sendiri
create policy status_gm     on public.hero_status for all    using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy status_pemain on public.hero_status for select using (hero_id = public.my_hero(campaign_id));

-- rekap: GM tulis; pemain baca yang sudah terbit
create policy rekap_gm      on public.session_recaps for all    using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));
create policy rekap_pemain  on public.session_recaps for select using (terbit and public.my_hero(campaign_id) is not null);

-- undangan: hanya GM (pemain memakai fungsi terima_undangan di bawah)
create policy inv_gm        on public.invites for all using (public.is_gm(campaign_id)) with check (public.is_gm(campaign_id));

-- ---------- TERIMA UNDANGAN (dipanggil pemain setelah login) ----------
create or replace function public.terima_undangan(p_kode text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.invites; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Harus login dulu.'; end if;
  select * into v from invites where kode = upper(trim(p_kode)) for update;
  if not found then raise exception 'Kode undangan tidak ditemukan.'; end if;
  if v.dipakai_oleh is not null and v.dipakai_oleh <> uid then raise exception 'Kode undangan sudah dipakai akun lain.'; end if;
  if v.kedaluwarsa < now() then raise exception 'Kode undangan sudah kedaluwarsa. Minta kode baru ke GM.'; end if;
  if exists (select 1 from campaign_members where hero_id = v.hero_id and user_id <> uid) then
    raise exception 'Pahlawan ini sudah terhubung ke akun lain.'; end if;
  insert into campaign_members (campaign_id, user_id, peran, hero_id)
  values (v.campaign_id, uid, 'pemain', v.hero_id)
  on conflict (campaign_id, user_id) do update set hero_id = excluded.hero_id
    where campaign_members.peran = 'pemain';
  update invites set dipakai_oleh = uid, dipakai_at = now() where kode = v.kode;
  return jsonb_build_object('campaign_id', v.campaign_id, 'hero_id', v.hero_id);
end $$;
revoke all on function public.terima_undangan(text) from public;
grant execute on function public.terima_undangan(text) to authenticated;

-- ---------- DAFTAR CAMPAIGN UNTUK PORTAL PEMAIN (tanpa data spoiler) ----------
create or replace function public.portal_campaigns()
returns table (campaign_id uuid, nama text, genre text, bab_aktif int, hero_id uuid)
language sql stable security definer set search_path = public as $$
  select c.id, c.nama, c.genre, c.bab_aktif, m.hero_id
  from campaign_members m join campaigns c on c.id = m.campaign_id
  where m.user_id = auth.uid() and m.peran = 'pemain' and m.hero_id is not null
$$;
revoke all on function public.portal_campaigns() from public;
grant execute on function public.portal_campaigns() to authenticated;

-- ---------- REAL-TIME (status & rekap untuk portal pemain) ----------
alter publication supabase_realtime add table public.hero_status, public.session_recaps;

-- ---------- PENYIMPANAN FOTO ----------
-- Bucket privat 'foto'. Path file: <campaign_id>/<hero_id>.jpg
insert into storage.buckets (id, name, public) values ('foto', 'foto', false)
  on conflict (id) do nothing;

create policy foto_gm on storage.objects for all
  using (bucket_id = 'foto' and public.is_gm(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'foto' and public.is_gm(((storage.foldername(name))[1])::uuid));

create policy foto_pemain on storage.objects for select
  using (bucket_id = 'foto'
         and split_part(storage.filename(name), '.', 1) = public.my_hero(((storage.foldername(name))[1])::uuid)::text);
