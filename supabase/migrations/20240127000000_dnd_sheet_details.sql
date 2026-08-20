-- ============================================================
-- Vorterium — conteúdo estruturado da ficha D&D 5e
-- Migration: 20240127000000_dnd_sheet_details.sql
-- Aplicar após: 20240126000000_profile_preferences_and_media.sql
--
-- Adiciona listas editáveis de perícias, ataques, inventário e magias.
-- Cada registro pertence a uma ficha D&D e herda a autorização da ficha:
-- mestre da campanha ou dono da ficha enquanto membro ativo.
-- ============================================================

-- ── 1. Tabelas ────────────────────────────────────────────

create table if not exists public.dnd_character_skills (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references public.dnd_character_sheets(id) on delete cascade,
  skill_key   text not null check (skill_key in (
    'acrobatics', 'animal_handling', 'arcana', 'athletics', 'deception',
    'history', 'insight', 'intimidation', 'investigation', 'medicine',
    'nature', 'perception', 'performance', 'persuasion', 'religion',
    'sleight_of_hand', 'stealth', 'survival'
  )),
  proficient  boolean not null default false,
  expertise   boolean not null default false,
  unique (sheet_id, skill_key),
  check (not expertise or proficient)
);

create table if not exists public.dnd_character_attacks (
  id           uuid primary key default gen_random_uuid(),
  sheet_id     uuid not null references public.dnd_character_sheets(id) on delete cascade,
  name         text not null check (char_length(trim(name)) between 1 and 120),
  attack_bonus text not null default '',
  damage       text not null default '',
  damage_type  text not null default '',
  notes        text not null default '',
  sort_order   integer not null default 0 check (sort_order >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.dnd_character_inventory (
  id          uuid primary key default gen_random_uuid(),
  sheet_id    uuid not null references public.dnd_character_sheets(id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 160),
  quantity    integer not null default 1 check (quantity between 1 and 9999),
  weight      numeric(8, 2) not null default 0 check (weight between 0 and 99999),
  equipped    boolean not null default false,
  notes       text not null default '',
  sort_order  integer not null default 0 check (sort_order >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.dnd_character_spells (
  id            uuid primary key default gen_random_uuid(),
  sheet_id      uuid not null references public.dnd_character_sheets(id) on delete cascade,
  name          text not null check (char_length(trim(name)) between 1 and 160),
  spell_level   smallint not null default 0 check (spell_level between 0 and 9),
  school        text not null default '',
  casting_time  text not null default '',
  spell_range   text not null default '',
  duration      text not null default '',
  concentration boolean not null default false,
  ritual        boolean not null default false,
  prepared      boolean not null default false,
  description   text not null default '',
  sort_order    integer not null default 0 check (sort_order >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. Índices ────────────────────────────────────────────

create index if not exists dnd_character_skills_sheet_id_idx
  on public.dnd_character_skills(sheet_id);
create index if not exists dnd_character_attacks_sheet_id_idx
  on public.dnd_character_attacks(sheet_id, sort_order);
create index if not exists dnd_character_inventory_sheet_id_idx
  on public.dnd_character_inventory(sheet_id, sort_order);
create index if not exists dnd_character_spells_sheet_id_idx
  on public.dnd_character_spells(sheet_id, spell_level, sort_order);

-- ── 3. Triggers de atualização e proteção estrutural ─────

create or replace function public.set_dnd_detail_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.protect_dnd_detail_sheet_id()
returns trigger language plpgsql as $$
begin
  if new.sheet_id <> old.sheet_id then
    raise exception 'O campo sheet_id não pode ser alterado.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dnd_attacks_updated_at on public.dnd_character_attacks;
create trigger trg_dnd_attacks_updated_at
  before update on public.dnd_character_attacks
  for each row execute function public.set_dnd_detail_updated_at();
drop trigger if exists trg_dnd_attacks_structural on public.dnd_character_attacks;
create trigger trg_dnd_attacks_structural
  before update on public.dnd_character_attacks
  for each row execute function public.protect_dnd_detail_sheet_id();

drop trigger if exists trg_dnd_inventory_updated_at on public.dnd_character_inventory;
create trigger trg_dnd_inventory_updated_at
  before update on public.dnd_character_inventory
  for each row execute function public.set_dnd_detail_updated_at();
drop trigger if exists trg_dnd_inventory_structural on public.dnd_character_inventory;
create trigger trg_dnd_inventory_structural
  before update on public.dnd_character_inventory
  for each row execute function public.protect_dnd_detail_sheet_id();

drop trigger if exists trg_dnd_spells_updated_at on public.dnd_character_spells;
create trigger trg_dnd_spells_updated_at
  before update on public.dnd_character_spells
  for each row execute function public.set_dnd_detail_updated_at();
drop trigger if exists trg_dnd_spells_structural on public.dnd_character_spells;
create trigger trg_dnd_spells_structural
  before update on public.dnd_character_spells
  for each row execute function public.protect_dnd_detail_sheet_id();

-- ── 4. RLS ────────────────────────────────────────────────

alter table public.dnd_character_skills enable row level security;
alter table public.dnd_character_attacks enable row level security;
alter table public.dnd_character_inventory enable row level security;
alter table public.dnd_character_spells enable row level security;

-- Perícias: o cliente envia apenas as perícias alteradas.
drop policy if exists "dnd_skills_select" on public.dnd_character_skills;
create policy "dnd_skills_select" on public.dnd_character_skills for select using (
  exists (
    select 1 from public.dnd_character_sheets s
    where s.id = sheet_id
      and (is_campaign_master(s.campaign_id, auth.uid())
        or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid())))
  )
);
drop policy if exists "dnd_skills_insert" on public.dnd_character_skills;
create policy "dnd_skills_insert" on public.dnd_character_skills for insert with check (
  exists (
    select 1 from public.dnd_character_sheets s
    where s.id = sheet_id
      and (is_campaign_master(s.campaign_id, auth.uid())
        or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid())))
  )
);
drop policy if exists "dnd_skills_update" on public.dnd_character_skills;
create policy "dnd_skills_update" on public.dnd_character_skills for update using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
) with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_skills_delete" on public.dnd_character_skills;
create policy "dnd_skills_delete" on public.dnd_character_skills for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);

-- Registros de listas: mesmas quatro operações e mesma regra de acesso.
drop policy if exists "dnd_attacks_select" on public.dnd_character_attacks;
create policy "dnd_attacks_select" on public.dnd_character_attacks for select using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_attacks_insert" on public.dnd_character_attacks;
create policy "dnd_attacks_insert" on public.dnd_character_attacks for insert with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_attacks_update" on public.dnd_character_attacks;
create policy "dnd_attacks_update" on public.dnd_character_attacks for update using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
) with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_attacks_delete" on public.dnd_character_attacks;
create policy "dnd_attacks_delete" on public.dnd_character_attacks for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);

drop policy if exists "dnd_inventory_select" on public.dnd_character_inventory;
create policy "dnd_inventory_select" on public.dnd_character_inventory for select using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_inventory_insert" on public.dnd_character_inventory;
create policy "dnd_inventory_insert" on public.dnd_character_inventory for insert with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_inventory_update" on public.dnd_character_inventory;
create policy "dnd_inventory_update" on public.dnd_character_inventory for update using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
) with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_inventory_delete" on public.dnd_character_inventory;
create policy "dnd_inventory_delete" on public.dnd_character_inventory for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);

drop policy if exists "dnd_spells_select" on public.dnd_character_spells;
create policy "dnd_spells_select" on public.dnd_character_spells for select using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_spells_insert" on public.dnd_character_spells;
create policy "dnd_spells_insert" on public.dnd_character_spells for insert with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_spells_update" on public.dnd_character_spells;
create policy "dnd_spells_update" on public.dnd_character_spells for update using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
) with check (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
drop policy if exists "dnd_spells_delete" on public.dnd_character_spells;
create policy "dnd_spells_delete" on public.dnd_character_spells for delete using (
  exists (select 1 from public.dnd_character_sheets s where s.id = sheet_id and (is_campaign_master(s.campaign_id, auth.uid()) or (s.user_id = auth.uid() and is_campaign_member(s.campaign_id, auth.uid()))))
);
