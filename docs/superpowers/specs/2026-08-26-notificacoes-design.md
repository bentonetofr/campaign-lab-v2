# Notificações — design

Etapa 3 do roadmap de novas mecânicas do Vorterium. Depende das Etapas 1
(botão flutuante) e 2 (rolagem privada), já implementadas e commitadas.

## Escopo desta etapa

Um indicador de notificações não vistas, visível em toda a área logada
(dentro ou fora de campanha), contando eventos novos em **todas** as
campanhas do usuário — não só a que está aberta no momento.

## Eventos que contam (excluindo o que o próprio usuário fez)

- `member_joined`, `member_left`, `member_removed`
- `session_created`, `session_updated`, `session_deleted`
- `note_created`
- Rolagem de dados — pública conta pra todo mundo da campanha; oculta conta
  só pro mestre. Mesma regra de visibilidade da Etapa 2, sem lógica nova:
  a contagem lê `dice_rolls` diretamente (não `campaign_activity`), então o
  RLS já existente decide sozinho quem vê o quê.

Ficam de fora do contador (continuam só na aba Atividade, sem notificar):
`campaign_created`, `campaign_updated`, `invite_created`,
`invite_deactivated`, `sheet_updated`.

## Banco de dados

Migration nova (30ª), bem pequena — só uma coluna, nenhuma policy nova:

```sql
alter table public.profiles
  add column if not exists activity_seen_at timestamptz not null default now();
```

`default now()` é proposital: sem isso, todo usuário existente veria uma
enxurrada de "não vistos" retroativos assim que a coluna fosse criada. Com
o default, todo mundo começa "em dia" e só conta daqui pra frente.

Nenhuma mudança de RLS é necessária:
- `profiles` já permite ao dono ler/atualizar o próprio registro
  (`profiles: atualizar o próprio perfil`, migration 1) — `activity_seen_at`
  é só mais uma coluna coberta por essa policy existente.
- `campaign_activity` e `dice_rolls` já têm as policies de SELECT corretas
  (a segunda, com a regra de privacidade da Etapa 2).

## Serviço — `activityService.ts`

Três funções novas:

```ts
export async function getActivitySeenAt(): Promise<string>
export async function markActivitySeen(): Promise<void>
export async function getUnreadNotificationCount(seenAt: string): Promise<number>
```

`getUnreadNotificationCount` faz duas contagens em paralelo
(`count: 'exact', head: true`, sem trazer linhas):

1. `campaign_activity` — `type in (lista acima)`, `actor_id != auth.uid()`,
   `created_at > seenAt`
2. `dice_rolls` — `user_id != auth.uid()`, `created_at > seenAt`

Soma as duas. Ambas já vêm filtradas por campanha e por visibilidade só
pelo RLS — a função não precisa saber de quais campanhas o usuário
participa nem replicar a regra de rolagem oculta.

**Limitação aceita:** eventos de `campaign_activity` com `actor_id null`
(perfil do autor foi excluído) não entram na contagem — `actor_id != uuid`
não bate com `null` em SQL. Caso raro, não vale a complexidade de tratar
agora.

## Interface

**Reestruturação necessária:** hoje `DiceFab.tsx` é dono da própria
`<div className="dice-fab-wrapper">`. Pra colocar o sino sempre acima do
que quer que esteja aparecendo ali (botão sozinho, toast, ou popover
aberto), a wrapper sobe pro `PrivateLayout.tsx` e passa a envolver os dois
componentes como irmãos:

```tsx
<div className="dice-fab-wrapper">
  <NotificationBell />
  <DiceFab />
</div>
```

`DiceFab` deixa de renderizar a própria wrapper (nos dois retornos —
travado e normal) e passa a devolver só o conteúdo (fragment). Como o
layout em coluna já empilha os itens de baixo pra cima na ordem inversa do
DOM, colocar `NotificationBell` primeiro garante que ele fica por cima de
qualquer coisa do lado do dado — inclusive o popover aberto — sem precisar
de z-index especial ou cálculo de posição.

**`NotificationBell.tsx`** (novo, `src/features/activity/components/`):
- Ícone de sino minimalista em SVG (mesmo estilo do cadeado — contorno,
  `currentColor`), sempre visível, inclusive fora de campanha.
- Selo numérico (fundo `var(--danger)`) no canto quando `count > 0`;
  sem selo quando zero.
- Consulta a contagem a cada ~75s (mesma cadência da heartbeat de
  presença que já existe), sem Realtime.
- Clique: chama `markActivitySeen()`, zera o selo localmente, navega para
  `/atividade`.

**Trade-off aceito, consistente com a Etapa 2:** uma rolagem oculta conta
no selo, mas ao clicar e abrir `/atividade` o mestre não vai vê-la lá —
rolagens ocultas nunca tiveram entrada na Atividade, de propósito. O selo
avisa "algo aconteceu"; o detalhe da rolagem mora só no popover de dados
daquela campanha.

## Fora de escopo nesta etapa (YAGNI)

- Lista suspensa com os itens não vistos — clique só navega para
  `/atividade`, que já existe e já lista tudo.
- Notificação por evento individual (ex: toast "Fulano entrou na
  campanha") — só o contador agregado.
- Marcar itens específicos como vistos individualmente — é tudo ou nada,
  por timestamp.
- Push do navegador / notificação com a aba fechada.

## Checklist de implementação

- [ ] Migration 30: `profiles.activity_seen_at`
- [ ] `activityService.ts`: `getActivitySeenAt`, `markActivitySeen`,
      `getUnreadNotificationCount`
- [ ] `NotificationBell.tsx` + CSS
- [ ] Mover `.dice-fab-wrapper` de `DiceFab.tsx` para `PrivateLayout.tsx`;
      `DiceFab` passa a retornar fragment
- [ ] README: 30 migrations, seção nova descrevendo o sino
- [ ] `npm run verify` passando
