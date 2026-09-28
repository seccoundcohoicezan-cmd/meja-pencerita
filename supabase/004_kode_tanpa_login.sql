-- =====================================================================
-- MasteryDnD — Pembaruan #4: Lihat kartu dengan KODE, tanpa login
-- Jalankan SETELAH 001, 002, 003. Aman dijalankan berulang kali.
--
-- Aturan kode:
--   - Satu pahlawan = satu kode aktif. Membuat kode baru menghanguskan kode lama.
--   - Kode HANGUS otomatis saat sesi campaign selesai atau bab berganti.
--   - Pemegang kode hanya bisa melihat: kartu, foto, kondisi terkini, dan rekap yang
--     sudah diterbitkan. Tidak bisa melihat cerita, twist, atau pahlawan lain.
-- =====================================================================

alter table public.invites add column if not exists bab        int;
alter table public.invites add column if not exists hangus_at  timestamptz;
alter table public.invites add column if not exists foto_url   text;
alter table public.invites add column if not exists dilihat_n  int not null default 0;
alter table public.invites add column if not exists dilihat_at timestamptz;
alter table public.invites alter column kedaluwarsa set default now() + interval '120 days';
create index if not exists invites_hero_aktif_idx on public.invites(hero_id) where hangus_at is null;
create index if not exists invites_camp_aktif_idx on public.invites(campaign_id) where hangus_at is null;

update public.invites i set bab = c.bab_aktif from public.campaigns c where c.id = i.campaign_id and i.bab is null;

-- moderator boleh membaca foto (untuk membuat tautan foto di kode undangan)
drop policy if exists foto_mod on storage.objects;
create policy foto_mod on storage.objects for select using (bucket_id = 'foto' and public.is_moderator());

-- ---------- BUAT / HANGUSKAN KODE ----------
drop function if exists public.buat_undangan(uuid);
create or replace function public.buat_undangan(p_hero uuid, p_foto_url text default null) returns text
language plpgsql security definer set search_path = public, auth as $$
declare c uuid; bb int; k text; b bytea; alfabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'Harus login dulu.'; end if;
  select h.campaign_id, cp.bab_aktif into c, bb from public.heroes h join public.campaigns cp on cp.id = h.campaign_id where h.id = p_hero;
  if c is null then raise exception 'Pahlawan tidak ditemukan. Buka campaign di Meja Pencerita agar tersimpan ke cloud.'; end if;
  if not (public.is_gm(c) or public.is_moderator()) then raise exception 'Kamu tidak punya akses ke pahlawan ini.'; end if;
  update public.invites set hangus_at = now() where hero_id = p_hero and hangus_at is null;
  loop
    b := uuid_send(gen_random_uuid()); k := '';
    for i in 0..7 loop k := k || substr(alfabet, 1 + (get_byte(b, i) % 32), 1); end loop;
    exit when not exists (select 1 from public.invites where kode = k);
  end loop;
  insert into public.invites (kode, campaign_id, hero_id, dibuat_oleh, bab, foto_url)
  values (k, c, p_hero, auth.uid(), bb, nullif(p_foto_url, ''));
  return k;
end $$;
revoke all on function public.buat_undangan(uuid, text) from public, anon;
grant execute on function public.buat_undangan(uuid, text) to authenticated;

create or replace function public.hanguskan_kode(p_hero uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare c uuid; n int;
begin
  select campaign_id into c from public.heroes where id = p_hero;
  if c is null then raise exception 'Pahlawan tidak ditemukan.'; end if;
  if not (public.is_gm(c) or public.is_moderator()) then raise exception 'Kamu tidak punya akses ke pahlawan ini.'; end if;
  update public.invites set hangus_at = now() where hero_id = p_hero and hangus_at is null;
  get diagnostics n = row_count;
  if n > 0 then perform public.tulis_log('kode_hangus', 'dihanguskan manual · ' || coalesce((select data->>'nama' from public.heroes where id = p_hero), '?')); end if;
end $$;
revoke all on function public.hanguskan_kode(uuid) from public, anon;
grant execute on function public.hanguskan_kode(uuid) to authenticated;

-- GM memperbarui tautan foto setelah mengganti foto pahlawan
create or replace function public.perbarui_foto_undangan(p_hero uuid, p_url text) returns void
language plpgsql security definer set search_path = public, auth as $$
declare c uuid;
begin
  select campaign_id into c from public.heroes where id = p_hero;
  if c is null or not (public.is_gm(c) or public.is_moderator()) then return; end if;
  update public.invites set foto_url = nullif(p_url, '') where hero_id = p_hero and hangus_at is null;
end $$;
revoke all on function public.perbarui_foto_undangan(uuid, text) from public, anon;
grant execute on function public.perbarui_foto_undangan(uuid, text) to authenticated;

-- ---------- HANGUS OTOMATIS ----------
create or replace function public.hangus_sesi() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  if old.status <> 'selesai' and new.status = 'selesai' then
    update public.invites set hangus_at = now() where campaign_id = new.campaign_id and hangus_at is null;
    get diagnostics n = row_count;
    if n > 0 then perform public.tulis_log('kode_hangus', n || ' kode · sesi selesai · ' || coalesce((select nama from public.campaigns where id = new.campaign_id), '?')); end if;
  end if;
  return null;
end $$;
drop trigger if exists t_hangus_sesi on public.sessions;
create trigger t_hangus_sesi after update of status on public.sessions for each row execute function public.hangus_sesi();

create or replace function public.hangus_bab() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare n int;
begin
  if new.bab_aktif is distinct from old.bab_aktif then
    update public.invites set hangus_at = now() where campaign_id = new.id and hangus_at is null and coalesce(bab, 0) <> new.bab_aktif;
    get diagnostics n = row_count;
    if n > 0 then perform public.tulis_log('kode_hangus', n || ' kode · pindah ke Bab ' || new.bab_aktif || ' · ' || new.nama); end if;
  end if;
  return null;
end $$;
drop trigger if exists t_hangus_bab on public.campaigns;
create trigger t_hangus_bab after update of bab_aktif on public.campaigns for each row execute function public.hangus_bab();

-- ---------- LIHAT KARTU DENGAN KODE (TANPA LOGIN) ----------
create or replace function public.lihat_kartu(p_kode text) returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare v public.invites; h public.heroes; c public.campaigns; st jsonb; rk jsonb;
begin
  select * into v from public.invites where kode = upper(trim(p_kode));
  if not found then raise exception 'Kode tidak ditemukan. Periksa lagi hurufnya.'; end if;
  if v.hangus_at is not null then raise exception 'Kode ini sudah tidak berlaku (sesi/bab sudah selesai, atau GM membuat kode baru). Minta kode terbaru ke GM.'; end if;
  if v.kedaluwarsa < now() then raise exception 'Kode ini sudah kedaluwarsa. Minta kode baru ke GM.'; end if;
  select * into h from public.heroes where id = v.hero_id;
  select * into c from public.campaigns where id = v.campaign_id;
  if h.id is null or c.id is null then raise exception 'Pahlawan untuk kode ini sudah dihapus GM.'; end if;
  if v.bab is not null and c.bab_aktif <> v.bab then
    update public.invites set hangus_at = now() where kode = v.kode;
    raise exception 'Kode ini sudah hangus karena bab sudah berganti. Minta kode baru ke GM.';
  end if;
  if v.dilihat_n = 0 then perform public.tulis_log('lihat_kartu', v.kode || ' · ' || coalesce(h.data->>'nama', '?') || ' · ' || c.nama); end if;
  update public.invites set dilihat_n = dilihat_n + 1, dilihat_at = now() where kode = v.kode;
  select to_jsonb(s) - 'campaign_id' into st from public.hero_status s where s.hero_id = h.id;
  select coalesce(jsonb_agg(jsonb_build_object('judul', r.judul, 'teks', r.teks, 'terbit_at', r.terbit_at) order by r.terbit_at desc), '[]'::jsonb)
    into rk from (select * from public.session_recaps where campaign_id = c.id and terbit order by terbit_at desc limit 20) r;
  return jsonb_build_object(
    'kode', v.kode,
    'hero', jsonb_build_object('id', h.id, 'nama', h.data->>'nama', 'kartu', h.data->'kartu'),
    'foto_url', v.foto_url,
    'campaign', jsonb_build_object('nama', c.nama, 'genre', c.genre, 'bab', c.bab_aktif),
    'status', st, 'rekap', rk);
end $$;
revoke all on function public.lihat_kartu(text) from public;
grant execute on function public.lihat_kartu(text) to anon, authenticated;

-- kondisi terkini untuk pembaruan berkala (tidak menambah hitungan "dibuka")
create or replace function public.status_kartu(p_kode text) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare v public.invites; c public.campaigns; st jsonb; rk jsonb;
begin
  select * into v from public.invites where kode = upper(trim(p_kode));
  if not found or v.hangus_at is not null or v.kedaluwarsa < now() then return jsonb_build_object('berlaku', false); end if;
  select * into c from public.campaigns where id = v.campaign_id;
  if c.id is null or (v.bab is not null and c.bab_aktif <> v.bab) then return jsonb_build_object('berlaku', false); end if;
  select to_jsonb(s) - 'campaign_id' into st from public.hero_status s where s.hero_id = v.hero_id;
  select coalesce(jsonb_agg(jsonb_build_object('judul', r.judul, 'teks', r.teks, 'terbit_at', r.terbit_at) order by r.terbit_at desc), '[]'::jsonb)
    into rk from (select * from public.session_recaps where campaign_id = c.id and terbit order by terbit_at desc limit 20) r;
  return jsonb_build_object('berlaku', true, 'status', st, 'rekap', rk);
end $$;
revoke all on function public.status_kartu(text) from public;
grant execute on function public.status_kartu(text) to anon, authenticated;

-- ---------- DAFTAR KELOLA (diperbarui: info kode & dilihat) ----------
drop function if exists public.kelola_pahlawan();
create or replace function public.kelola_pahlawan()
returns table (campaign_id uuid, campaign_nama text, genre text, milik_saya boolean, gm_email text, bab_aktif int,
               hero_id uuid, hero_nama text, foto_path text, kode_aktif text, dilihat_n int, dilihat_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  with mod as (select public.is_moderator() as ya)
  select c.id, c.nama, c.genre, c.owner_id = auth.uid(),
         case when (select ya from mod) then (select lower(u.email) from auth.users u where u.id = c.owner_id) end,
         c.bab_aktif, h.id, coalesce(nullif(h.data->>'nama', ''), '(tanpa nama)'), h.foto_path,
         i.kode, i.dilihat_n, i.dilihat_at
  from public.campaigns c
  join public.heroes h on h.campaign_id = c.id
  left join lateral (select kode, dilihat_n, dilihat_at from public.invites x
                     where x.hero_id = h.id and x.hangus_at is null and x.kedaluwarsa > now()
                     order by x.kedaluwarsa desc limit 1) i on true
  where c.owner_id = auth.uid() or (select ya from mod)
  order by (c.owner_id = auth.uid()) desc, c.updated_at desc, h.urutan
  limit 1000
$$;
revoke all on function public.kelola_pahlawan() from public, anon;
grant execute on function public.kelola_pahlawan() to authenticated;
