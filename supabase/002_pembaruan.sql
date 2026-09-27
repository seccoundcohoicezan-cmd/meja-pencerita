-- =====================================================================
-- MasteryDnD — Pembaruan skema #2 (jalankan SETELAH 001_skema.sql)
-- Aman dijalankan berulang kali.
-- =====================================================================

-- 1) Nama pahlawan boleh kembar saat masih diedit (ID unik tetap dijaga oleh kolom id).
alter table public.heroes drop constraint if exists heroes_campaign_id_slug_key;

-- 2) Pemain boleh keluar sendiri dari campaign.
drop policy if exists mem_keluar on public.campaign_members;
create policy mem_keluar on public.campaign_members for delete using (user_id = auth.uid() and peran = 'pemain');

-- 3) Hapus akun sendiri (hak pengguna menurut UU PDP). Data campaign ikut terhapus (cascade).
create or replace function public.hapus_akun_saya() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Harus login dulu.'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.hapus_akun_saya() from public;
grant execute on function public.hapus_akun_saya() to authenticated;

-- 4) Indeks untuk pencarian sesi terbaru per bab.
create index if not exists sessions_campaign_bab_idx on public.sessions(campaign_id, bab, started_at desc);
