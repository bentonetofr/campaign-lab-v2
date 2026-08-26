# Rolagem privada / dano oculto — design

Etapa 2 do roadmap de novas mecânicas do Vorterium. Depende da Etapa 1 (botão
flutuante de rolagem), já implementada e commitada pelo usuário.

## Escopo desta etapa

Permitir que qualquer membro da campanha marque uma rolagem como privada
antes de rolar. Regras de visibilidade, definidas com o usuário:

- quem rolou sempre vê o próprio resultado;
- o mestre da campanha sempre vê qualquer rolagem, privada ou não;
- os demais jogadores não veem **nada** de uma rolagem privada de outra
  pessoa — nem o valor, nem um indício de que ela aconteceu.

## Banco de dados

- Nova migration (29ª): adiciona `dice_rolls.is_private boolean not null default false`.
- Substitui a policy de SELECT em `dice_rolls` — hoje
  `using (is_campaign_member(campaign_id, auth.uid()))` — por:

```sql
using (
  is_campaign_member(campaign_id, auth.uid())
  and (
    not is_private
    or user_id = auth.uid()
    or is_campaign_master(campaign_id, auth.uid())
  )
)
```

- `is_campaign_master(campaign_id, uuid)` já existe (helper usado em outras
  RPCs/policies) — reuso direto, sem criar função nova.
- Nenhuma mudança na policy de INSERT nem no trigger de validação matemática
  do `roll_breakdown` — `is_private` não afeta o cálculo da rolagem.

## Serviço — `diceService.ts`

- `rollDice(campaignId, formula, isPrivate = false)` ganha o novo parâmetro
  e grava `is_private` no insert.
- Quando `isPrivate` é `true`, a chamada a `logActivity(...)` (hoje
  incondicional) é **pulada** — não gera nenhum registro na aba Atividade,
  nem visível pro autor nem pro mestre.
- `getCampaignRolls()` não precisa de nenhum filtro extra no código — o RLS
  já retorna só as linhas que o usuário logado pode ver, diferente por
  membro automaticamente.

## Trade-off aceito (confirmado com o usuário)

Rolagens privadas não aparecem na aba Atividade pra ninguém, nem pra quem
rolou nem pro mestre — ficam visíveis só através do próprio popover de
rolagem (notificação de resultado + histórico recente), que já é RLS-aware
linha a linha.

Alternativa descartada: dar visibilidade seletiva também em
`campaign_activity`. É uma tabela compartilhada por convites, sessões,
notas e fichas — torná-la role-aware é um risco maior pra um ganho pequeno
nesta etapa.

## Interface — `DiceFab` / `DiceRollerPanel`

- Toggle "🔒 Privada" no popover, perto do botão "Rolar". Enquanto marcado,
  vale tanto pra rolagem rápida (botões d4–d100) quanto pra fórmula
  personalizada.
- O estado do toggle **não persiste** entre aberturas do popover — sempre
  volta a "pública" por padrão ao reabrir. Evita dois riscos opostos:
  esquecer o toggle ligado e vazar uma rolagem sem querer, ou esquecer que
  está desligado achando que algo sensível ficou oculto.
- Rolagens privadas ganham um selo de cadeado (🔒) na notificação (toast) e
  nas linhas do histórico recente. Isso só aparece pra quem já tem
  permissão de ver aquela linha via RLS — o selo é só um indicador visual
  pra quem já pode ver saber que era secreta, não faz parte do controle de
  acesso em si.

## Fora de escopo nesta etapa (YAGNI)

- Visibilidade seletiva na aba Atividade.
- Rolagem privada visível a um subconjunto arbitrário de jogadores — só os
  dois níveis definidos (autor + mestre vs. todo mundo).
- Alterar uma rolagem já feita de pública pra privada ou vice-versa depois
  de criada.

## Checklist de implementação

- [ ] Migration 29: coluna `is_private` + policy de SELECT em `dice_rolls`
- [ ] `rollDice()`: parâmetro `isPrivate`, pula `logActivity` quando privado
- [ ] Tipo `DiceRoll` em `shared/types/index.ts`: campo `is_private: boolean`
- [ ] Toggle "🔒 Privada" no popover (`DiceRollerPanel.tsx`), resetando a
      cada abertura
- [ ] Selo de cadeado na notificação (`DiceFab.tsx`) e no histórico recente
      quando `is_private`
- [ ] README: tabela de migrations (29 linhas), seção de rolagem de dados
      descrevendo o toggle
- [ ] `npm run verify` passando (migrations + build)
