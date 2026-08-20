-- ============================================================
-- Vorterium — Remover sistema "custom" de campanhas
-- Migration: 20240122000000_remove_custom_campaign_system.sql
-- Aplicar após: 20240120000000_campaign_notes.sql
-- Aplicar em: Supabase Dashboard → SQL Editor
--
-- Sistemas permitidos após esta migration:
--   generic | dnd5e | altherium
--
-- O valor "custom" é removido definitivamente.
-- Campanhas existentes com system = 'custom' são migradas para 'generic'.
-- ============================================================


-- ── 1. Migrar campanhas existentes com system = 'custom' ──
--
-- Converte para 'generic' antes de recriar a constraint,
-- evitando violação ao recriar o CHECK.

update public.campaigns
set    system     = 'generic',
       updated_at = now()
where  system = 'custom';


-- ── 2. Remover constraint antiga ─────────────────────────
--
-- Criada inline no CREATE TABLE de 20240101, PostgreSQL nomeia
-- automaticamente como campaigns_system_check.
-- Usamos IF EXISTS para que a migration seja idempotente.

alter table public.campaigns
  drop constraint if exists campaigns_system_check;


-- ── 3. Recriar constraint sem 'custom' ───────────────────

alter table public.campaigns
  add constraint campaigns_system_valid
    check (system in ('generic', 'dnd5e', 'altherium'));


-- ── 4. Recriar create_campaign sem 'custom' ──────────────
--
-- Mantém exatamente a mesma assinatura e lógica de
-- 20240116000000_harden_campaign_structural_fields.sql,
-- alterando apenas a lista de sistemas aceitos.

create or replace function public.create_campaign(
  campaign_name        text,
  campaign_system      text default 'generic',
  campaign_description text default null
)
returns public.campaigns as $$
declare
  v_campaign public.campaigns;
  v_user_id  uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if trim(campaign_name) = '' then
    raise exception 'O nome da campanha não pode ser vazio.';
  end if;

  if char_length(trim(campaign_name)) > 120 then
    raise exception 'O nome da campanha deve ter no máximo 120 caracteres.';
  end if;

  if campaign_system not in ('generic', 'dnd5e', 'altherium') then
    raise exception 'Sistema inválido: %', campaign_system;
  end if;

  if campaign_description is not null
     and char_length(campaign_description) > 1000 then
    raise exception 'A descrição deve ter no máximo 1000 caracteres.';
  end if;

  insert into public.campaigns (name, system, master_id, description, status)
  values (
    trim(campaign_name),
    campaign_system,
    v_user_id,
    nullif(trim(coalesce(campaign_description, '')), ''),
    'active'
  )
  returning * into v_campaign;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (v_campaign.id, v_user_id, 'master');

  return v_campaign;
end;
$$ language plpgsql security definer set search_path = public;
