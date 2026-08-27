-- ============================================================
-- Vorterium — Mensagens privadas no chat (mestre ⇄ cada jogador)
-- Migration: 20240135000000_private_messages.sql
-- Aplicar após: 20240134000000_campaign_messages_replica_identity.sql
-- ============================================================

-- ── 1. campaign_messages: coluna recipient_id + policies ──
--
-- recipient_id = null continua sendo a mensagem pública da mesa
-- (comportamento atual, inalterado). recipient_id preenchido é uma
-- mensagem privada entre user_id (remetente) e recipient_id (destinatário).

alter table public.campaign_messages
  add column recipient_id uuid references public.profiles(id) on delete cascade;

create index idx_campaign_messages_thread
  on public.campaign_messages(campaign_id, recipient_id, user_id, created_at desc);

drop policy "campaign_messages: membro ve mensagens da campanha" on public.campaign_messages;

create policy "campaign_messages: membro ve mensagens da campanha"
  on public.campaign_messages for select
  to authenticated
  using (
    (recipient_id is null and public.is_campaign_member(campaign_id, auth.uid()))
    or (recipient_id is not null and auth.uid() in (user_id, recipient_id))
  );

drop policy "campaign_messages: membro envia propria mensagem" on public.campaign_messages;

create policy "campaign_messages: membro envia propria mensagem"
  on public.campaign_messages for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_campaign_member(campaign_id, auth.uid())
    and (
      recipient_id is null
      or public.is_campaign_master(campaign_id, auth.uid())   -- mestre → qualquer jogador
      or public.is_campaign_master(campaign_id, recipient_id) -- jogador → só o mestre
    )
  );

-- A policy de DELETE ("autor ou mestre apaga") não muda: o mestre é
-- sempre uma das duas partes de qualquer mensagem privada (regra acima),
-- então ela já cobre exclusão de privadas corretamente.


-- ── 2. campaign_private_message_reads + RPCs ──
--
-- Mesmo padrão de campaign_chat_reads, mas uma linha por PAR de usuários
-- (uma "leitura" por conversa privada, não por campanha inteira).

create table public.campaign_private_message_reads (
  campaign_id   uuid        not null references public.campaigns(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  other_user_id uuid        not null references public.profiles(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  primary key (campaign_id, user_id, other_user_id)
);

alter table public.campaign_private_message_reads enable row level security;

create policy "private_reads: membro ve a propria leitura"
  on public.campaign_private_message_reads for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.mark_private_thread_read(
  campaign_id_input uuid,
  other_user_id_input uuid
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

  insert into public.campaign_private_message_reads (campaign_id, user_id, other_user_id, last_read_at)
  values (campaign_id_input, v_user_id, other_user_id_input, now())
  on conflict (campaign_id, user_id, other_user_id)
  do update set last_read_at = now();
end;
$$;

create or replace function public.get_private_message_unread_counts(campaign_id_input uuid)
returns table(other_user_id uuid, unread_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id as other_user_id, count(*) as unread_count
  from public.campaign_messages m
  where m.campaign_id = campaign_id_input
    and m.recipient_id = auth.uid()
    and m.created_at > coalesce(
      (select r.last_read_at from public.campaign_private_message_reads r
       where r.campaign_id = campaign_id_input
         and r.user_id = auth.uid()
         and r.other_user_id = m.user_id),
      'epoch'::timestamptz
    )
  group by m.user_id;
$$;
