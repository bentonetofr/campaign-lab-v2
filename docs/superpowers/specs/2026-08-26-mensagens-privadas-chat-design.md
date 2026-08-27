# Mensagens privadas no chat — design

Extensão do chat da campanha (Etapa 5). Permite que o mestre converse em
privado com cada jogador, individualmente — e que cada jogador converse em
privado só com o mestre. Não existe conversa privada jogador↔jogador.

## Escopo desta etapa

Reaproveitar a tabela `campaign_messages` já existente, adicionando uma
coluna opcional `recipient_id` (mesmo espírito de `dice_rolls.is_private`):
`recipient_id = null` é a mensagem pública da mesa (comportamento atual,
inalterado); `recipient_id` preenchido é uma mensagem privada entre
`user_id` (remetente) e `recipient_id` (destinatário).

Fora de escopo, explicitamente:
- Conversa privada entre dois jogadores (travado no banco, não só na UI).
- Edição de mensagem (chat já é só criar/apagar, vale para as duas).
- Confirmação de leitura visível pro outro lado (só contador de não lidas
  pra você mesmo).
- Granularidade fina de supressão do pop-up: continua suprimindo por
  "está com a aba Chat aberta" (nível de aba inteira), não por "está
  vendo exatamente esta conversa".

## Banco de dados — migration nova (33ª)

### `campaign_messages`: nova coluna + policies atualizadas

```sql
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
```

A policy de DELETE (`autor ou mestre apaga`) não muda — como o mestre é
sempre uma das duas partes de qualquer mensagem privada (pela regra
acima), ela já cobre exclusão de privadas corretamente.

`REPLICA IDENTITY FULL` (migration 32) já se aplica à tabela inteira, então
eventos de DELETE de mensagens privadas já chegam com `recipient_id`
incluso — nada extra a fazer ali.

### Nova tabela `campaign_private_message_reads` + RPCs

Mesmo padrão de `campaign_chat_reads`, mas com uma linha por par de
usuários (uma "leitura" por conversa, não por campanha inteira):

```sql
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
```

`get_private_message_unread_counts` funciona igual para jogador (só
retorna, no máximo, uma linha — a do mestre) e pra mestre (uma linha por
jogador que já mandou mensagem privada). Quem não tem mensagem simplesmente
não aparece no resultado — a UI completa com zero.

## Serviço — `chatService.ts`

```ts
export interface ChatMessage {
  id: string
  campaign_id: string
  user_id: string
  recipient_id: string | null   // novo
  content: string
  created_at: string
  profile: { id: string; display_name: string; avatar_url: string | null }
}

export async function getCampaignMessages(
  campaignId: string, before?: string, limit = 30,
  threadWith?: string,   // novo — undefined = mesa; id do outro usuário = privada
): Promise<ChatMessage[]>

export async function sendMessage(
  campaignId: string, content: string, recipientId?: string,  // novo
): Promise<void>

export function subscribeToMessages(...)   // payload da linha ganha recipient_id
export interface TypingPayload { user_id: string; display_name: string; thread_user_id?: string }  // novo campo

export async function getPrivateUnreadCounts(campaignId: string): Promise<Map<string, number>>  // novo
export async function markPrivateThreadRead(campaignId: string, otherUserId: string): Promise<void>  // novo
```

`getCampaignMessages` filtra `.is('recipient_id', null)` para a mesa, ou
`.or('and(user_id.eq.<me>,recipient_id.eq.<other>),and(user_id.eq.<other>,recipient_id.eq.<me>)')`
para uma conversa privada (precisa do próprio id via `auth.getUser()`,
igual `sendMessage` já faz hoje).

`getChatUnreadCount` (mesa) ganha `.is('recipient_id', null)` — sem isso,
mensagem privada contaria em dobro (no selo da mesa e no selo privado).

`subscribeToMessages` não muda a assinatura do canal — o filtro por
`campaign_id` já traz todas as linhas que a RLS permite (públicas e
privadas envolvendo o usuário), então uma DM chega no mesmo canal que já
existe. Quem decide se a linha pertence à conversa aberta no momento é o
componente, olhando `recipient_id`/`user_id` contra a conversa ativa.

## Interface — `CampaignChatPanel.tsx`

Novo estado `activeThread`: `{ type: 'public' }` (padrão) ou
`{ type: 'private', userId, name }`. A lista de conversas privadas
possíveis vem do `getCampaignMembers` que o painel já carrega hoje: para
jogador, só o mestre; para mestre, um item por jogador.

Estrutura visual: uma coluna estreita à esquerda ("Mesa" + conversas),
lista de mensagens + composer à direita — tudo dentro do `.chat-panel`
que já existe hoje, sem criar aba nova.

Trocar de conversa:
- Recarrega mensagens (`getCampaignMessages` com o `threadWith` certo),
  reseta paginação (`hasMore`, etc.)
- Marca como lida (`markChatRead` pra mesa, `markPrivateThreadRead` pra
  privada) e zera o contador daquela conversa localmente
- Mensagem digitada/enviada passa a carregar o `recipientId`/`thread_user_id`
  certo

O handler de INSERT do Realtime passa a checar se a linha pertence à
conversa ativa antes de anexar à lista; se for privada e não pertencer
à conversa aberta (nem à mesa), só incrementa o contador local daquela
conversa (sem tocar na lista visível). O indicador "digitando..." e o som
continuam funcionando igual, só filtrados pela mesma lógica de conversa.

Confirmação de exclusão (já implementada) e regra de quem pode apagar
(autor ou mestre) não mudam — funcionam igual em qualquer conversa.

## Selo separado — `CampaignAreaPage.tsx`

Um segundo selo na aba "Chat", visualmente diferente do atual (vermelho,
`--danger`): usa `--gilded-bright` (mesma cor associada a "privado" em
outras partes do app) e soma `getPrivateUnreadCounts` de todas as
conversas. Atualiza no mesmo polling de 60s que já existe — não é
zerado ao simplesmente clicar na aba Chat (que abre na visão "Mesa" por
padrão); só baixa conforme o usuário entra em cada conversa privada
específica dentro do painel.

## Notificações — `activityService.ts`

`MessageRow` ganha `recipient_id`. `mapMessageRow` passa a gerar
`"Mensagem privada de Fulano"` (sem preview do conteúdo, por ser
privada) quando `recipient_id` não é nulo, mantendo o formato atual
`"Fulano: preview"` só para mensagens públicas. `getRecentNotifications`
e `subscribeToNewMessagesGlobally`/`getMessageNotification` não precisam
de filtro adicional — a RLS já garante que só quem é remetente ou
destinatário recebe o evento.

## Checklist de implementação

- [ ] Migration 33: coluna `recipient_id` + policies + tabela
      `campaign_private_message_reads` + RPCs `mark_private_thread_read`
      e `get_private_message_unread_counts`
- [ ] `chatService.ts`: `ChatMessage`/`TypingPayload` com novos campos,
      `getCampaignMessages`/`sendMessage`/`getChatUnreadCount` com escopo
      de conversa, `getPrivateUnreadCounts` e `markPrivateThreadRead` novos
- [ ] `CampaignChatPanel.tsx` + CSS: sidebar de conversas, troca de
      conversa, roteamento do Realtime por conversa ativa
- [ ] `CampaignAreaPage.tsx` + CSS: segundo selo (cor diferente) somando
      não lidas privadas
- [ ] `activityService.ts`: rótulo "Mensagem privada de Fulano" no
      pop-up/sino quando `recipient_id` não é nulo
- [ ] README: 33 migrations, seção do chat atualizada com mensagens
      privadas
- [ ] `npm run verify` passando
