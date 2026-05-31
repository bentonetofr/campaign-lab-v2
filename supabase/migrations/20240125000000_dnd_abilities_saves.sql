-- ============================================================
-- Vorterium — Ficha D&D 5e: atributos, salvaguardas, player_name
-- Migration: 20240125000000_dnd_abilities_saves.sql
-- Aplicar após: 20240123000000_dnd_character_sheets_base.sql
--
-- Migration idempotente.
-- Garante que todos os campos de atributos e salvaguardas
-- existam com naming e constraints corretos.
--
-- Se 20240123 foi aplicada com os campos corretos (player_name,
-- strength_save_proficient etc.), esta migration é no-op.
--
-- Se 20240123 foi aplicada com naming antigo (save_strength etc.),
-- esta migration adiciona os campos corrigidos.
-- ============================================================


-- ── 1. player_name ───────────────────────────────────────

alter table public.dnd_character_sheets
  add column if not exists player_name text;


-- ── 2. Atributos (integer, 1–30) ─────────────────────────
--
-- ADD COLUMN IF NOT EXISTS é seguro — se já existirem, a linha é ignorada.
-- As constraints de check são adicionadas apenas se o campo for criado agora.

do $$
begin
  -- strength
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'strength'
  ) then
    alter table public.dnd_character_sheets
      add column strength integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_strength_range check (strength between 1 and 30);
  end if;

  -- dexterity
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'dexterity'
  ) then
    alter table public.dnd_character_sheets
      add column dexterity integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_dexterity_range check (dexterity between 1 and 30);
  end if;

  -- constitution
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'constitution'
  ) then
    alter table public.dnd_character_sheets
      add column constitution integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_constitution_range check (constitution between 1 and 30);
  end if;

  -- intelligence
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'intelligence'
  ) then
    alter table public.dnd_character_sheets
      add column intelligence integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_intelligence_range check (intelligence between 1 and 30);
  end if;

  -- wisdom
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'wisdom'
  ) then
    alter table public.dnd_character_sheets
      add column wisdom integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_wisdom_range check (wisdom between 1 and 30);
  end if;

  -- charisma
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'dnd_character_sheets'
      and column_name  = 'charisma'
  ) then
    alter table public.dnd_character_sheets
      add column charisma integer not null default 10;
    alter table public.dnd_character_sheets
      add constraint dnd_sheets_charisma_range check (charisma between 1 and 30);
  end if;
end;
$$;


-- ── 3. Proficiências em salvaguardas (_save_proficient) ──

alter table public.dnd_character_sheets
  add column if not exists strength_save_proficient     boolean not null default false;

alter table public.dnd_character_sheets
  add column if not exists dexterity_save_proficient    boolean not null default false;

alter table public.dnd_character_sheets
  add column if not exists constitution_save_proficient boolean not null default false;

alter table public.dnd_character_sheets
  add column if not exists intelligence_save_proficient boolean not null default false;

alter table public.dnd_character_sheets
  add column if not exists wisdom_save_proficient       boolean not null default false;

alter table public.dnd_character_sheets
  add column if not exists charisma_save_proficient     boolean not null default false;
