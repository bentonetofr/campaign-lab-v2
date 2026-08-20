-- ============================================================
-- Vorterium — Preferências e mídia de perfil/campanha
-- Migration: 20240126000000_profile_preferences_and_media.sql
-- Aplicar após: 20240125000000_dnd_abilities_saves.sql
-- ============================================================

-- ── 1. Preferências e capa ──────────────────────────────

alter table public.profiles
  add column if not exists theme_preference text not null default 'dark';

alter table public.profiles
  drop constraint if exists profiles_theme_preference_valid;

alter table public.profiles
  add constraint profiles_theme_preference_valid
    check (theme_preference in ('dark', 'light'));

alter table public.profiles
  drop constraint if exists profiles_display_name_length;

alter table public.profiles
  add constraint profiles_display_name_length
    check (char_length(trim(display_name)) between 1 and 80);

alter table public.campaigns
  add column if not exists cover_url text;

alter table public.campaigns
  drop constraint if exists campaigns_cover_url_length;

alter table public.campaigns
  add constraint campaigns_cover_url_length
    check (cover_url is null or char_length(cover_url) <= 2048);

-- O e-mail sincronizado com auth.users não pode ser alterado diretamente
-- pela tabela pública. Alterações futuras de e-mail devem passar pelo Auth.
create or replace function public.prevent_profile_structural_update()
returns trigger as $$
begin
  if new.id <> old.id
    or new.email <> old.email
    or new.created_at <> old.created_at then
    raise exception 'Campos estruturais do perfil não podem ser alterados.';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists enforce_profile_immutable_fields on public.profiles;
create trigger enforce_profile_immutable_fields
  before update on public.profiles
  for each row execute function public.prevent_profile_structural_update();

-- ── 2. Buckets públicos com escrita protegida por RLS ───

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('campaign-covers', 'campaign-covers', true)
on conflict (id) do update set public = excluded.public;

-- Avatares: cada usuário só grava e remove o próprio caminho <uid>/avatar.
drop policy if exists "avatars: usuário pode visualizar o próprio arquivo" on storage.objects;
create policy "avatars: usuário pode visualizar o próprio arquivo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "avatars: usuário pode enviar o próprio arquivo" on storage.objects;
create policy "avatars: usuário pode enviar o próprio arquivo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "avatars: usuário pode atualizar o próprio arquivo" on storage.objects;
create policy "avatars: usuário pode atualizar o próprio arquivo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  )
  with check (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

drop policy if exists "avatars: usuário pode remover o próprio arquivo" on storage.objects;
create policy "avatars: usuário pode remover o próprio arquivo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and name like auth.uid()::text || '/%'
  );

-- Capas: somente o mestre da campanha grava, atualiza ou remove
-- o caminho <campaign_id>/cover.
drop policy if exists "campaign-covers: mestre pode visualizar capa" on storage.objects;
create policy "campaign-covers: mestre pode visualizar capa"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'campaign-covers'
    and exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id::text = split_part(name, '/', 1)
        and cm.user_id = auth.uid()
    )
  );

drop policy if exists "campaign-covers: mestre pode enviar capa" on storage.objects;
create policy "campaign-covers: mestre pode enviar capa"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campaign-covers'
    and exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id::text = split_part(name, '/', 1)
        and cm.user_id = auth.uid()
        and cm.role = 'master'
    )
  );

drop policy if exists "campaign-covers: mestre pode atualizar capa" on storage.objects;
create policy "campaign-covers: mestre pode atualizar capa"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'campaign-covers'
    and exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id::text = split_part(name, '/', 1)
        and cm.user_id = auth.uid()
        and cm.role = 'master'
    )
  )
  with check (
    bucket_id = 'campaign-covers'
    and exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id::text = split_part(name, '/', 1)
        and cm.user_id = auth.uid()
        and cm.role = 'master'
    )
  );

drop policy if exists "campaign-covers: mestre pode remover capa" on storage.objects;
create policy "campaign-covers: mestre pode remover capa"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'campaign-covers'
    and exists (
      select 1
      from public.campaign_members cm
      where cm.campaign_id::text = split_part(name, '/', 1)
        and cm.user_id = auth.uid()
        and cm.role = 'master'
    )
  );
