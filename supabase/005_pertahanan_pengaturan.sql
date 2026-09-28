-- =====================================================================
-- MasteryDnD — Pembaruan #5: Pertahanan terkunci & pengaturan web
-- Jalankan SETELAH 001–004. Aman dijalankan berulang kali.
--
-- 1) PERTAHANAN (AC) = hasil 1 d20 yang dikocok pemain SEKALI di awal.
--    Setelah tersimpan, database MENOLAK setiap perubahan (pakem), dari perangkat mana pun.
-- 2) PENGATURAN WEB: moderator bisa menyalakan/mematikan dadu digital di Portal Pemain.
-- =====================================================================

-- ---------- 1. KUNCI PERTAHANAN ----------
create or replace function public.kunci_pertahanan() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare lama jsonb; baru jsonb; v int;
begin
  lama := case when tg_op = 'UPDATE' then old.data->'pertahanan' else null end;
  baru := new.data->'pertahanan';
  if lama is not null and jsonb_typeof(lama) = 'object' and (lama->>'nilai') ~ '^\d+$' then
    -- sudah terkunci: kembalikan nilai lama, apa pun yang dikirim
    if baru is distinct from lama then
      new.data := jsonb_set(new.data, '{pertahanan}', lama);
    end if;
    if new.data ? 'kartu' and jsonb_typeof(new.data->'kartu') = 'object' then
      new.data := jsonb_set(new.data, '{kartu,ac}', to_jsonb((lama->>'nilai')::int));
    end if;
    return new;
  end if;
  -- belum terkunci: terima hanya angka d20 yang sah (1–20)
  if baru is not null and jsonb_typeof(baru) = 'object' then
    v := case when (baru->>'nilai') ~ '^\d+$' then (baru->>'nilai')::int else 0 end;
    if v between 1 and 20 then
      perform public.tulis_log('kunci_pertahanan', coalesce(new.data->>'nama', '?') || ' = ' || v);
    else
      new.data := new.data - 'pertahanan';
      if new.data ? 'kartu' and jsonb_typeof(new.data->'kartu') = 'object' then new.data := jsonb_set(new.data, '{kartu,ac}', 'null'::jsonb); end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists t_kunci_pertahanan on public.heroes;
create trigger t_kunci_pertahanan before insert or update of data on public.heroes for each row execute function public.kunci_pertahanan();

-- ---------- 2. PENGATURAN WEB ----------
create table if not exists public.pengaturan_web (
  kunci        text primary key,
  nilai        jsonb not null,
  diubah_oleh  text,
  updated_at   timestamptz not null default now()
);
alter table public.pengaturan_web enable row level security;
drop policy if exists pw_baca on public.pengaturan_web;
create policy pw_baca on public.pengaturan_web for select using (true);
-- tidak ada policy tulis: perubahan hanya lewat set_pengaturan()
insert into public.pengaturan_web (kunci, nilai) values ('dadu_digital', 'true'::jsonb) on conflict (kunci) do nothing;

create or replace function public.pengaturan_publik() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(kunci, nilai), '{}'::jsonb) from public.pengaturan_web
$$;
revoke all on function public.pengaturan_publik() from public;
grant execute on function public.pengaturan_publik() to anon, authenticated;

create or replace function public.set_pengaturan(p_kunci text, p_nilai jsonb) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_moderator() then raise exception 'Hanya moderator yang bisa mengubah pengaturan web.'; end if;
  if p_kunci not in ('dadu_digital') then raise exception 'Pengaturan tidak dikenal.'; end if;
  if jsonb_typeof(p_nilai) <> 'boolean' then raise exception 'Nilai harus aktif/nonaktif.'; end if;
  insert into public.pengaturan_web (kunci, nilai, diubah_oleh, updated_at) values (p_kunci, p_nilai, public.email_saya(), now())
  on conflict (kunci) do update set nilai = excluded.nilai, diubah_oleh = excluded.diubah_oleh, updated_at = now();
  perform public.tulis_log('ubah_pengaturan', p_kunci || ' = ' || case when p_nilai = 'true'::jsonb then 'AKTIF' else 'NONAKTIF' end);
end $$;
revoke all on function public.set_pengaturan(text, jsonb) from public, anon;
grant execute on function public.set_pengaturan(text, jsonb) to authenticated;
