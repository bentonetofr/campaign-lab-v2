-- ============================================================
-- Vorterium — Fichas D&D 5e (base)
-- Migration: 20240123000000_dnd_character_sheets_base.sql
-- Aplicar após: 20240122000000_remove_custom_campaign_system.sql
--
-- Cria a tabela dnd_character_sheets com:
--   · Campos estruturais imutáveis (campaign_id, user_id, created_at)
--   · Campos de personagem, progressão, combate, atributos, conjuração
--   · user_id referencia public.profiles(id) — padrão do projeto
--   · RLS:
--       SELECT — mestre vê todas | jogador vê própria E ainda for membro
--       INSERT — próprio uid + membro ativo + campanha dnd5e
--       UPDATE — mestre | (dono E ainda for membro)
--   · Trigger de updated_at automático
--   · Trigger que bloqueia alteração dos campos estruturais
-- ============================================================


-- ── 1. Tabela ─────────────────────────────────────────────

create table if not exists public.dnd_character_sheets (

  -- Estruturais
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id)  on delete cascade,
  user_id      uuid not null references public.profiles(id)   on delete cascade,

  -- Personagem
  character_name       text,
  player_name          text,
  class_name           text,
  subclass             text,
  background           text,
  race                 text,
  alignment            text,

  -- Progressão
  level                integer not null default 1  check (level between 1 and 20),
  experience           integer not null default 0  check (experience >= 0),
  inspiration          boolean not null default false,

  -- Combate
  armor_class          integer not null default 10 check (armor_class between 0 and 99),
  initiative_bonus     integer not null default 0  check (initiative_bonus between -99 and 99),
  speed                integer not null default 30 check (speed between 0 and 999),
  proficiency_bonus    integer not null default 2  check (proficiency_bonus between 0 and 20),

  -- Pontos de vida
  hp_current           integer not null default 10 check (hp_current >= 0),
  hp_max               integer not null default 10 check (hp_max >= 1),
  hp_temp              integer not null default 0  check (hp_temp >= 0),

  -- Atributos (1–30)
  strength             integer not null default 10 check (strength     between 1 and 30),
  dexterity            integer not null default 10 check (dexterity    between 1 and 30),
  constitution         integer not null default 10 check (constitution between 1 and 30),
  intelligence         integer not null default 10 check (intelligence between 1 and 30),
  wisdom               integer not null default 10 check (wisdom       between 1 and 30),
  charisma             integer not null default 10 check (charisma     between 1 and 30),

  -- Proficiências em salvaguardas
  strength_save_proficient     boolean not null default false,
  dexterity_save_proficient    boolean not null default false,
  constitution_save_proficient boolean not null default false,
  intelligence_save_proficient boolean not null default false,
  wisdom_save_proficient       boolean not null default false,
  charisma_save_proficient     boolean not null default false,

  -- Salvaguardas mortais (0–3 cada)
  death_save_successes smallint not null default 0 check (death_save_successes between 0 and 3),
  death_save_failures  smallint not null default 0 check (death_save_failures  between 0 and 3),

  -- Conjuração
  spellcasting_ability text,
  spell_save_dc        smallint,
  spell_attack_bonus   smallint,

  -- Narrativa / Anotações
  notes                text,
  backstory            text,
  personality_traits   text,
  ideals               text,
  bonds                text,
  flaws                text,

  -- Timestamps
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  -- Um jogador tem no máximo uma ficha por campanha
  unique (campaign_id, user_id)
);


-- ── 2. Índices ────────────────────────────────────────────

create index if not exists dnd_character_sheets_campaign_id_idx
  on public.dnd_character_sheets (campaign_id);

create index if not exists dnd_character_sheets_user_id_idx
  on public.dnd_character_sheets (user_id);


-- ── 3. Trigger: updated_at automático ────────────────────

create or replace function public.set_dnd_sheet_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dnd_sheet_updated_at on public.dnd_character_sheets;
create trigger trg_dnd_sheet_updated_at
  before update on public.dnd_character_sheets
  for each row execute function public.set_dnd_sheet_updated_at();


-- ── 4. Trigger: campos estruturais imutáveis ─────────────

create or replace function public.protect_dnd_sheet_structural_fields()
returns trigger language plpgsql as $$
begin
  if new.campaign_id <> old.campaign_id then
    raise exception 'O campo campaign_id não pode ser alterado.';
  end if;
  if new.user_id <> old.user_id then
    raise exception 'O campo user_id não pode ser alterado.';
  end if;
  if new.created_at <> old.created_at then
    raise exception 'O campo created_at não pode ser alterado.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dnd_sheet_structural on public.dnd_character_sheets;
create trigger trg_dnd_sheet_structural
  before update on public.dnd_character_sheets
  for each row execute function public.protect_dnd_sheet_structural_fields();


-- ── 5. RLS ───────────────────────────────────────────────

alter table public.dnd_character_sheets enable row level security;

-- SELECT: mestre vê todas as fichas; jogador vê a própria SOMENTE se ainda for membro
drop policy if exists "dnd_sheets_select" on public.dnd_character_sheets;
create policy "dnd_sheets_select"
  on public.dnd_character_sheets for select
  using (
    is_campaign_master(campaign_id, auth.uid())
    or (
      user_id = auth.uid()
      and is_campaign_member(campaign_id, auth.uid())
    )
  );

-- INSERT: somente o próprio usuário, que deve ser membro da campanha D&D 5e
drop policy if exists "dnd_sheets_insert" on public.dnd_character_sheets;
create policy "dnd_sheets_insert"
  on public.dnd_character_sheets for insert
  with check (
    user_id = auth.uid()
    and is_campaign_member(campaign_id, auth.uid())
    and exists (
      select 1 from public.campaigns
      where id = campaign_id
        and system = 'dnd5e'
    )
  );

-- UPDATE: mestre edita qualquer ficha; jogador edita a própria SOMENTE se ainda for membro
drop policy if exists "dnd_sheets_update" on public.dnd_character_sheets;
create policy "dnd_sheets_update"
  on public.dnd_character_sheets for update
  using (
    is_campaign_master(campaign_id, auth.uid())
    or (
      user_id = auth.uid()
      and is_campaign_member(campaign_id, auth.uid())
    )
  )
  with check (
    is_campaign_master(campaign_id, auth.uid())
    or (
      user_id = auth.uid()
      and is_campaign_member(campaign_id, auth.uid())
    )
  );
