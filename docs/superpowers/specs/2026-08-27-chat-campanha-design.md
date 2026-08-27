# Chat da campanha — design

Etapa 5 do roadmap de novas mecânicas do Vorterium (pulando a Etapa 4,
configurações de conta, a pedido do usuário). Depende das Etapas 1–3
(botão de dados, rolagem privada, notificações), já implementadas.

## Escopo desta etapa

Um chat de texto por campanha, compartilhado entre todos os membros, em
tempo real de verdade (Supabase Realtime — a primeira vez que o projeto
usa isso, já que todo o resto do app evita Realtime de propósito por
custo). Nova aba **"Chat"** (ícone 💬) entre "Atividade" e "Configurações".

Fora de escopo, explicitamente: edição de mensagem, menções, anexos,
mesclar rolagens de dados no feed do chat, chat privado/DM entre membros.

## Banco de dados — migration nova (31ª)

### Tabela `campaign_messages`

```sql
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
  using (is_campaign_member(campaign_id, auth.uid()));

create policy "campaign_messages: membro envia propria mensagem"
  on public.campaign_messages for insert
  to authenticated
  with check (user_id = auth.uid() and is_campaign_member(campaign_id, auth.uid()));

create policy "campaign_messages: autor ou mestre apaga"
  on public.campaign_messages for delete
  to authenticated
  using (user_id = auth.uid() or is_campaign_master(campaign_id, auth.uid()));

alter publication supabase_realtime add table public.campaign_messages;
```

Sem policy de UPDATE — logo, ninguém edita mensagem, e não precisa de
trigger de imutabilidade (não existe caminho de UPDATE pra proteger).

### Tabela `campaign_chat_reads` + RPC (selo de não lidas)

Mesmo padrão já usado por `campaign_presence`/`touch_campaign_presence`:
tabela sem policy de INSERT/UPDATE, só SELECT — a escrita acontece
exclusivamente via RPC `SECURITY DEFINER`, que já valida membership.

```sql
create table public.campaign_chat_reads (
  campaign_id   uuid        not null references public.campaigns(id) on delete cascade,
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
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
```

## Serviço — `chatService.ts` (novo)

```ts
export interface ChatMessage {
  id: string
  campaign_id: string
  user_id: string
  content: string
  created_at: string
  profile: { id: string; display_name: string; avatar_url: string | null }
}

export async function getCampaignMessages(campaignId: string, before?: string, limit = 30): Promise<ChatMessage[]>
export async function sendMessage(campaignId: string, content: string): Promise<void>
export async function deleteMessage(messageId: string): Promise<void>
export function subscribeToMessages(campaignId: string, onInsert: (m: ChatMessage) => void, onDelete: (id: string) => void): () => void
export async function getChatUnreadCount(campaignId: string): Promise<number>
export async function markChatRead(campaignId: string): Promise<void>
```

`subscribeToMessages` usa `supabase.channel(...).on('postgres_changes', ...)`
pra INSERT e DELETE. **Detalhe técnico importante**: o payload do
`postgres_changes` só traz as colunas cruas da tabela — sem o join de
perfil. Pra exibir nome/avatar de uma mensagem que chega ao vivo, o painel
busca a lista de membros da campanha uma vez ao montar (já teria essa
info de qualquer forma) e resolve o autor por um mapa local
`user_id → perfil`, evitando uma consulta extra por mensagem.

`getChatUnreadCount` conta `campaign_messages` onde `created_at >
last_read_at` (ou desde sempre, se o usuário nunca abriu o chat daquela
campanha) e `user_id != auth.uid()`.

## Interface

**`CampaignChatPanel.tsx`** (nova aba):
- Lista rolável, mensagem própria vs. de outros com estilo diferente,
  nome + hora, botão de apagar quando autorizado (autor ou mestre)
- Carrega as últimas ~30 ao montar, scroll automático pro fim
- Rolar até o topo carrega mais antigas via `before` (cursor de
  paginação), preservando a posição de leitura (mede `scrollHeight` antes
  e depois de inserir no topo, ajusta `scrollTop` pela diferença)
- Envio sem otimismo local — a mensagem só aparece quando o próprio
  Realtime ecoa de volta pro remetente. Evita lógica de reconciliação;
  o atraso é imperceptível
- Ao montar, chama `markChatRead(campaignId)` — abrir a aba já marca
  como lido
- Assina o canal Realtime ao montar, cancela ao desmontar — a troca de
  aba já desmonta o painel (mesmo padrão das outras abas), então a
  limpeza é automática

**Selo de não lidas na aba "Chat"** (`CampaignAreaPage.tsx`):
- Vive só nessa página — é por campanha, não cruza pra outras campanhas
  como o sino global de notificações
- Polling (~60-75s, mesmo espírito do resto do projeto) chama
  `getChatUnreadCount`, mostra um selo numérico no botão da aba quando
  > 0
- Clicar na aba zera o selo localmente e dispara `markChatRead`

## Fora de escopo nesta etapa (YAGNI)

- Notificação de chat no sino global (fica só na aba, por decisão
  explícita — se quiser estender pro sino global depois, é outra etapa)
- Indicador de "digitando..."
- Confirmação de leitura por mensagem (só um cursor de "lido até aqui")
- Busca no histórico do chat

## Checklist de implementação

- [ ] Migration 31: `campaign_messages` + `campaign_chat_reads` + RPC
      `mark_campaign_chat_read` + publicação Realtime
- [ ] `chatService.ts`: CRUD + `subscribeToMessages` + funções de
      não lidas
- [ ] `CampaignChatPanel.tsx` + CSS: lista, paginação, envio, exclusão
- [ ] Nova aba "chat" em `CampaignAreaPage.tsx` (`TabId`, `TABS`, entre
      atividade e configuracoes) com selo de não lidas
- [ ] README: 31 migrations, seção nova descrevendo o chat
- [ ] `npm run verify` passando
