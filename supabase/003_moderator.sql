-- =====================================================================
-- MasteryDnD — Pembaruan #3: Moderator, Log Aksi, Kelola Pemain
-- Jalankan SETELAH 001 dan 002. Aman dijalankan berulang kali.
--
-- Pemilik (moderator utama, TERKUNCI): seccoundcohoicezan@gmail.com
--   - selalu moderator, tidak bisa dihapus
--   - satu-satunya yang bisa menambah / mencabut moderator lain
-- Moderator:
--   - melihat log aksi seluruh web
--   - melihat semua campaign & pahlawan, membuat kode undangan pemain,
--     dan memutus pemain (lewat Portal Pemain → Undang Pemain)
-- =====================================================================

-- ---------- IDENTITAS ----------
create or replace function public.email_pemilik() returns text
language sql immutable as $$ select 'seccoundcohoicezan@gmail.com'::text $$;

-- email akun yang sedang login (hanya bila sudah terverifikasi)
create or replace function public.email_saya() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(email) from auth.users where id = auth.uid() and email_confirmed_at is not null
$$;

create or replace function public.is_pemilik() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(public.email_saya() = public.email_pemilik(), false)
$$;

-- ---------- DAFTAR MODERATOR ----------
create table if not exists public.moderators (
  email         text primary key check (email = lower(email) and email like '%_@_%._%'),
  ditambah_oleh text,
  created_at    timestamptz not null default now()
);
alter table public.moderators enable row level security;

create or replace function public.is_moderator() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select public.is_pemilik()
      or exists (select 1 from public.moderators m where m.email = public.email_saya())
$$;

drop policy if exists mod_baca on public.moderators;
create policy mod_baca on public.moderators for select using (public.is_moderator());
-- tidak ada policy insert/update/delete: perubahan HANYA lewat fungsi mod_tambah / mod_hapus

-- ---------- LOG AKSI ----------
create table if not exists public.log_aksi (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  user_id  uuid,
  email    text,
  aksi     text not null,
  detail   text not null default ''
);
create index if not exists log_aksi_at_idx on public.log_aksi(at desc);
create index if not exists log_aksi_aksi_idx on public.log_aksi(aksi, at desc);
alter table public.log_aksi enable row level security;
drop policy if exists log_baca on public.log_aksi;
create policy log_baca on public.log_aksi for select using (public.is_moderator());

-- penulis log internal (dipakai trigger & fungsi lain, TIDAK bisa dipanggil pengguna)
create or replace function public.tulis_log(p_aksi text, p_detail text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  insert into public.log_aksi (user_id, email, aksi, detail)
  values (auth.uid(), (select lower(email) from auth.users where id = auth.uid()), p_aksi, left(coalesce(p_detail, ''), 500));
end $$;
revoke all on function public.tulis_log(text, text) from public, anon, authenticated;

-- dipanggil aplikasi untuk aksi di sisi browser (masuk, keluar, dst). Dibatasi daftar & 30/menit.
create or replace function public.catat_aksi(p_aksi text, p_detail text default '') returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then return; end if;
  if p_aksi not in ('masuk', 'keluar', 'buka_portal', 'simpan_file', 'buka_file') then return; end if;
  if (select count(*) from public.log_aksi where user_id = auth.uid() and at > now() - interval '1 minute') >= 30 then return; end if;
  perform public.tulis_log(p_aksi, p_detail);
end $$;
revoke all on function public.catat_aksi(text, text) from public, anon;
grant execute on function public.catat_aksi(text, text) to authenticated;

-- ---------- TRIGGER LOG OTOMATIS ----------
create or replace function public.log_campaign() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if tg_op = 'INSERT' then perform public.tulis_log('buat_campaign', new.nama || ' (' || new.genre || ')');
  elsif tg_op = 'DELETE' then perform public.tulis_log('hapus_campaign', old.nama);
  end if;
  return null;
end $$;
drop trigger if exists t_log_campaign on public.campaigns;
create trigger t_log_campaign after insert or delete on public.campaigns for each row execute function public.log_campaign();

create or replace function public.log_sesi() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare n text;
begin
  select nama into n from public.campaigns where id = new.campaign_id;
  if tg_op = 'INSERT' then perform public.tulis_log('sesi_mulai', coalesce(n, '?') || ' · Bab ' || new.bab);
  elsif old.status <> 'selesai' and new.status = 'selesai' then perform public.tulis_log('sesi_selesai', coalesce(n, '?') || ' · Bab ' || new.bab);
  end if;
  return null;
end $$;
drop trigger if exists t_log_sesi on public.sessions;
create trigger t_log_sesi after insert or update of status on public.sessions for each row execute function public.log_sesi();

create or replace function public.log_rekap() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if new.terbit and (tg_op = 'INSERT' or not old.terbit or old.teks is distinct from new.teks) then
    perform public.tulis_log('terbit_rekap', new.judul);
  end if;
  return null;
end $$;
drop trigger if exists t_log_rekap on public.session_recaps;
create trigger t_log_rekap after insert or update on public.session_recaps for each row execute function public.log_rekap();

create or replace function public.log_undangan() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare hn text; cn text;
begin
  select h.data->>'nama', c.nama into hn, cn from public.heroes h join public.campaigns c on c.id = h.campaign_id where h.id = new.hero_id;
  if tg_op = 'INSERT' then perform public.tulis_log('buat_undangan', new.kode || ' untuk ' || coalesce(hn, '?') || ' · ' || coalesce(cn, '?'));
  elsif old.dipakai_oleh is null and new.dipakai_oleh is not null then perform public.tulis_log('pakai_undangan', new.kode || ' → ' || coalesce(hn, '?') || ' · ' || coalesce(cn, '?'));
  end if;
  return null;
end $$;
drop trigger if exists t_log_undangan on public.invites;
create trigger t_log_undangan after insert or update of dipakai_oleh on public.invites for each row execute function public.log_undangan();

create or replace function public.log_putus() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare hn text;
begin
  if old.peran <> 'pemain' then return null; end if;
  select data->>'nama' into hn from public.heroes where id = old.hero_id;
  perform public.tulis_log('putus_pemain', coalesce(hn, 'pahlawan') || ' · ' || coalesce((select lower(email) from auth.users where id = old.user_id), '?'));
  return null;
end $$;
drop trigger if exists t_log_putus on public.campaign_members;
create trigger t_log_putus after delete on public.campaign_members for each row execute function public.log_putus();

-- ---------- STATUS PERAN (dipanggil aplikasi) ----------
create or replace function public.peran_saya() returns jsonb
language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object('moderator', public.is_moderator(), 'pemilik', public.is_pemilik(), 'email', public.email_saya(), 'email_pemilik', public.email_pemilik())
$$;
revoke all on function public.peran_saya() from public, anon;
grant execute on function public.peran_saya() to authenticated;

-- ---------- KELOLA MODERATOR (khusus pemilik) ----------
create or replace function public.mod_tambah(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare e text := lower(trim(p_email));
begin
  if not public.is_pemilik() then raise exception 'Hanya pemilik web yang bisa menambah moderator.'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Alamat email tidak valid.'; end if;
  if e = public.email_pemilik() then raise exception 'Email ini sudah pemilik web.'; end if;
  insert into public.moderators (email, ditambah_oleh) values (e, public.email_saya()) on conflict (email) do nothing;
  perform public.tulis_log('tambah_moderator', e);
end $$;
revoke all on function public.mod_tambah(text) from public, anon;
grant execute on function public.mod_tambah(text) to authenticated;

create or replace function public.mod_hapus(p_email text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare e text := lower(trim(p_email));
begin
  if not public.is_pemilik() then raise exception 'Hanya pemilik web yang bisa mencabut moderator.'; end if;
  if e = public.email_pemilik() then raise exception 'Pemilik web terkunci dan tidak bisa dicabut.'; end if;
  delete from public.moderators where email = e;
  perform public.tulis_log('hapus_moderator', e);
end $$;
revoke all on function public.mod_hapus(text) from public, anon;
grant execute on function public.mod_hapus(text) to authenticated;

-- ---------- KELOLA PEMAIN (GM untuk campaign-nya, moderator untuk semua) ----------
create or replace function public.kelola_pahlawan()
returns table (campaign_id uuid, campaign_nama text, genre text, milik_saya boolean, gm_email text,
               hero_id uuid, hero_nama text, pemain_nama text, pemain_email text, terhubung_at timestamptz, kode_aktif text)
language sql stable security definer set search_path = public, auth as $$
  with mod as (select public.is_moderator() as ya)
  select c.id, c.nama, c.genre, c.owner_id = auth.uid(),
         case when (select ya from mod) then (select lower(u.email) from auth.users u where u.id = c.owner_id) end,
         h.id, coalesce(nullif(h.data->>'nama', ''), '(tanpa nama)'),
         p.nama_tampil,
         case when (select ya from mod) then (select lower(u.email) from auth.users u where u.id = m.user_id) end,
         m.joined_at,
         (select string_agg(i.kode, ', ') from public.invites i where i.hero_id = h.id and i.dipakai_oleh is null and i.kedaluwarsa > now())
  from public.campaigns c
  join public.heroes h on h.campaign_id = c.id
  left join public.campaign_members m on m.hero_id = h.id and m.peran = 'pemain'
  left join public.profiles p on p.id = m.user_id
  where c.owner_id = auth.uid() or (select ya from mod)
  order by (c.owner_id = auth.uid()) desc, c.updated_at desc, h.urutan
  limit 1000
$$;
revoke all on function public.kelola_pahlawan() from public, anon;
grant execute on function public.kelola_pahlawan() to authenticated;

create or replace function public.buat_undangan(p_hero uuid) returns text
language plpgsql security definer set search_path = public, auth as $$
declare c uuid; k text; b bytea; alfabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'Harus login dulu.'; end if;
  select campaign_id into c from public.heroes where id = p_hero;
  if c is null then raise exception 'Pahlawan tidak ditemukan. Buka campaign di Meja Pencerita agar tersimpan ke cloud.'; end if;
  if not (public.is_gm(c) or public.is_moderator()) then raise exception 'Kamu tidak punya akses ke pahlawan ini.'; end if;
  loop
    b := uuid_send(gen_random_uuid()); k := '';
    for i in 0..7 loop k := k || substr(alfabet, 1 + (get_byte(b, i) % 32), 1); end loop;
    exit when not exists (select 1 from public.invites where kode = k);
  end loop;
  insert into public.invites (kode, campaign_id, hero_id, dibuat_oleh) values (k, c, p_hero, auth.uid());
  return k;
end $$;
revoke all on function public.buat_undangan(uuid) from public, anon;
grant execute on function public.buat_undangan(uuid) to authenticated;

create or replace function public.putus_pemain(p_hero uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare c uuid;
begin
  select campaign_id into c from public.heroes where id = p_hero;
  if c is null then raise exception 'Pahlawan tidak ditemukan.'; end if;
  if not (public.is_gm(c) or public.is_moderator()) then raise exception 'Kamu tidak punya akses ke pahlawan ini.'; end if;
  delete from public.campaign_members where hero_id = p_hero and peran = 'pemain';
end $$;
revoke all on function public.putus_pemain(uuid) from public, anon;
grant execute on function public.putus_pemain(uuid) to authenticated;

-- ---------- HAPUS AKUN: catat dulu ke log ----------
create or replace function public.hapus_akun_saya() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Harus login dulu.'; end if;
  if public.is_pemilik() then raise exception 'Akun pemilik web tidak bisa dihapus dari aplikasi.'; end if;
  perform public.tulis_log('hapus_akun', '');
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.hapus_akun_saya() from public;
grant execute on function public.hapus_akun_saya() to authenticated;
