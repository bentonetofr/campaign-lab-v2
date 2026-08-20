-- ============================================================
-- Vorterium — base do motor de regras D&D 5e 2014
-- Migration: 20240128000000_dnd_rules_engine.sql
-- Aplicar após: 20240127000000_dnd_sheet_details.sql
--
-- O catálogo é somente leitura para os usuários. A ficha guarda as escolhas
-- feitas pelo jogador e sobrescritas separadamente, permitindo cálculo oficial
-- ou ajuste manual sem alterar os dados do Livro do Jogador.
-- ============================================================

-- ── 1. Escolhas de regras da ficha ────────────────────────

alter table public.dnd_character_sheets
  add column if not exists ruleset text not null default 'dnd5e_2014';

alter table public.dnd_character_sheets
  add column if not exists race_key text;

alter table public.dnd_character_sheets
  add column if not exists subrace_key text;

alter table public.dnd_character_sheets
  add column if not exists class_key text;

alter table public.dnd_character_sheets
  add column if not exists subclass_key text;

alter table public.dnd_character_sheets
  add column if not exists background_key text;

alter table public.dnd_character_sheets
  add constraint dnd_character_sheets_ruleset_check
  check (ruleset in ('dnd5e_2014'));

-- ── 2. Catálogo do livro ──────────────────────────────────

create table if not exists public.dnd_rule_catalog_entries (
  id          uuid primary key default gen_random_uuid(),
  ruleset     text not null default 'dnd5e_2014' check (ruleset in ('dnd5e_2014')),
  category    text not null check (category in (
    'race', 'subrace', 'class', 'subclass', 'background', 'feat',
    'weapon', 'armor', 'item', 'tool', 'spell'
  )),
  entry_key   text not null,
  name        text not null,
  description text not null default '',
  level       smallint check (level between 0 and 20),
  school      text,
  ability     text,
  sort_order  integer not null default 0 check (sort_order >= 0),
  metadata    jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  unique (ruleset, category, entry_key)
);

create index if not exists dnd_rule_catalog_category_idx
  on public.dnd_rule_catalog_entries (ruleset, category, is_active, sort_order);

create index if not exists dnd_rule_catalog_name_idx
  on public.dnd_rule_catalog_entries using gin (to_tsvector('simple', name));

alter table public.dnd_rule_catalog_entries enable row level security;

drop policy if exists "dnd_rule_catalog_authenticated_read" on public.dnd_rule_catalog_entries;
create policy "dnd_rule_catalog_authenticated_read"
  on public.dnd_rule_catalog_entries for select
  using (auth.uid() is not null and is_active);

-- ── 3. Proficiências adicionais ──────────────────────────

create table if not exists public.dnd_character_proficiencies (
  id           uuid primary key default gen_random_uuid(),
  sheet_id     uuid not null references public.dnd_character_sheets(id) on delete cascade,
  category     text not null check (category in ('armor', 'weapon', 'tool', 'language')),
  entry_key    text not null,
  label        text not null,
  source       text not null default 'manual',
  created_at   timestamptz not null default now(),
  unique (sheet_id, category, entry_key)
);

create index if not exists dnd_character_proficiencies_sheet_idx
  on public.dnd_character_proficiencies (sheet_id, category);

-- ── 4. Sobrescritas manuais de campos derivados ──────────

create table if not exists public.dnd_character_overrides (
  id           uuid primary key default gen_random_uuid(),
  sheet_id     uuid not null references public.dnd_character_sheets(id) on delete cascade,
  field_key    text not null check (field_key in (
    'proficiency_bonus', 'initiative_bonus', 'armor_class',
    'speed', 'hp_max', 'spell_save_dc', 'spell_attack_bonus'
  )),
  manual_value text not null,
  reason       text not null default '',
  updated_at   timestamptz not null default now(),
  unique (sheet_id, field_key)
);

create index if not exists dnd_character_overrides_sheet_idx
  on public.dnd_character_overrides (sheet_id);

create or replace function public.set_dnd_override_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dnd_override_updated_at on public.dnd_character_overrides;
create trigger trg_dnd_override_updated_at
  before update on public.dnd_character_overrides
  for each row execute function public.set_dnd_override_updated_at();

-- ── 5. RLS compartilhada pelas tabelas da ficha ──────────

alter table public.dnd_character_proficiencies enable row level security;
alter table public.dnd_character_overrides enable row level security;

drop policy if exists "dnd_proficiencies_select" on public.dnd_character_proficiencies;
create policy "dnd_proficiencies_select" on public.dnd_character_proficiencies for select using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_proficiencies_insert" on public.dnd_character_proficiencies;
create policy "dnd_proficiencies_insert" on public.dnd_character_proficiencies for insert with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_proficiencies_delete" on public.dnd_character_proficiencies;
create policy "dnd_proficiencies_delete" on public.dnd_character_proficiencies for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);

drop policy if exists "dnd_overrides_select" on public.dnd_character_overrides;
create policy "dnd_overrides_select" on public.dnd_character_overrides for select using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_overrides_insert" on public.dnd_character_overrides;
create policy "dnd_overrides_insert" on public.dnd_character_overrides for insert with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_overrides_update" on public.dnd_character_overrides;
create policy "dnd_overrides_update" on public.dnd_character_overrides for update using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
) with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_overrides_delete" on public.dnd_character_overrides;
create policy "dnd_overrides_delete" on public.dnd_character_overrides for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
