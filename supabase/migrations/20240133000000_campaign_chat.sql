-- ============================================================
-- Vorterium — Chat da campanha (tempo real)
-- Migration: 20240133000000_campaign_chat.sql
-- Aplicar após: 20240132000000_notification_seen_at.sql
-- ============================================================


-- ── 1. Tabela campaign_messages ───────────────────────────
--
-- Mensagens são imutáveis (sem UPDATE) — só existem INSERT e DELETE.
-- Primeira tabela do projeto com Realtime habilitado de verdade.

create table public.campaign_messages (
  id          uuid        primary key default gen_random_uuid(),
  campaign_id uuid        not null references public.campaigns(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  content     text        not null check (char_length(content) between 1 and 2000),
  created_at  timestamptz not null default now()
);

create index idx_campaign_messages_campaign_created
  on public.campaign_messages(campaign_id, created_at desc);

alter table public.campaign_messages enable row level security;

create policy "campaign_messages: membro ve mensagens da campanha"
  on public.campaign_messages for select
  to authenticated
  using (public.is_campaign_member(campaign_id, auth.uid()));

create policy "campaign_messages: membro envia propria mensagem"
  on public.campaign_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_campaign_member(campaign_id, auth.uid())
  );

create policy "campaign_messages: autor ou mestre apaga"
  on public.campaign_messages for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_campaign_master(campaign_id, auth.uid())
  );

-- Habilita Realtime para esta tabela (mesmo padrão já preparado, e nunca
-- usado, para dice_rolls na migration 5 — aqui é de fato ativado).
do $$
begin
  alter publication supabase_realtime add table public.campaign_messages;
exception when others then
  null;
end;
$$;


-- ── 2. Tabela campaign_chat_reads + RPC ───────────────────
--
-- Mesmo padrão de campaign_presence / touch_campaign_presence: a tabela
-- não tem policy de INSERT/UPDATE — só SELECT. Toda escrita passa pela
-- RPC abaixo, que já valida autenticação e membership.

create table public.campaign_chat_reads (
  campaign_id  uuid        not null references public.campaigns(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

alter table public.campaign_chat_reads enable row level security;

create policy "chat_reads: membro ve a propria leitura"
  on public.campaign_chat_reads for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.mark_campaign_chat_read(
  campaign_id_input uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.is_campaign_member(campaign_id_input, v_user_id) then
    raise exception 'Usuário não é membro desta campanha.';
  end if;

  insert into public.campaign_chat_reads (campaign_id, user_id, last_read_at)
  values (campaign_id_input, v_user_id, now())
  on conflict (campaign_id, user_id)
  do update set last_read_at = now();
end;
$$;
