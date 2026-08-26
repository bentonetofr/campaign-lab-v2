# Botão flutuante de rolagem de dados — design

Etapa 1 do roadmap de novas mecânicas do Vorterium. Documento de design
validado com o usuário antes da implementação.

## Roadmap geral (contexto, não faz parte do escopo desta etapa)

Lista priorizada com base nos itens hoje documentados como "fora do MVP" no
README, mais a reativação da ficha D&D 5e. Ordem sugerida, reordenável:

1. **Botão flutuante de rolagem de dados** — esta etapa
2. Rolagem privada / dano oculto — extensão direta da Etapa 1
3. Notificações (convite, sessão marcada, menção em nota)
4. Configurações de conta (e-mail/senha, exclusão de conta)
5. Chat em tempo real (exige reativar Supabase Realtime, hoje desligado por custo)
6. Explorar campanhas públicas
7. Plano premium / monetização
8. **Ficha completa** (D&D 5e sai de "em breve"; Altherium ganha ficha própria) — última etapa, por decisão explícita do usuário

Cada etapa a partir da 2 passa pelo próprio ciclo de brainstorming → spec →
plano antes de virar código.

## Escopo desta etapa

Substituir a aba "Rolagem" (hoje dentro da área da campanha) por um botão
flutuante de dados, acessível de qualquer aba da campanha, com um popover de
rolagem aprimorado. A aba atual é removida.

## Comportamento por contexto

O botão é global (renderizado uma única vez, não por página), mas seu estado
depende de haver ou não uma campanha ativa na URL:

- **Fora de uma campanha** (`/campanhas`, `/perfil`, `/atividade`,
  `/minhas-fichas`): ícone de cadeado, não clicável, tooltip "Entre em uma
  campanha para rolar dados".
- **Dentro de uma campanha** (`/campanhas/:campaignId`, qualquer aba):
  ícone de dado normal; clique abre o popover de rolagem.

Motivo de ser restrito à campanha (não uma rolagem "livre" fora dela): cada
campanha pode ter um sistema de RPG diferente (`generic` / `dnd5e` /
`altherium`), e a rolagem pertence semanticamente a essa campanha — inclusive
no schema atual, `dice_rolls.campaign_id` é obrigatório.

Posição: canto inferior direito da tela, fixo, em todas as resoluções
(desktop e mobile). É a posição usada nos mockups já revisados com o usuário.

## Arquitetura

- `DiceRollerProvider` (novo `React.Context`), em
  `src/features/dice/DiceRollerProvider.tsx`, no mesmo padrão já usado por
  `AuthProvider` (`src/features/auth/AuthProvider.tsx`). Expõe:
  - `open()` / `close()` / `isOpen`
  - o `campaignId` ativo (lido via `useParams` dentro do próprio provider)
- O provider envolve o conteúdo de `PrivateLayout`
  ([PrivateLayout.tsx](src/app/layouts/PrivateLayout.tsx)), já que só rotas
  privadas precisam do botão.
- `DiceFab` (novo componente, `src/features/dice/components/DiceFab.tsx`):
  botão + popover, renderizado uma vez dentro de `PrivateLayout`. Lê o
  contexto para saber se há campanha ativa e desenhar o estado
  travado/normal.
- Alternativas descartadas: `CustomEvent`/DOM global (foge do padrão do
  projeto, que já usa Context para estado cross-cutting) e portal montado
  por rota (complexidade sem ganho — o bundle já é único, sem code-split).

## O que é removido

- `TabId` perde `'rolagem'` e `TABS` perde a entrada correspondente em
  [CampaignAreaPage.tsx](src/features/campaigns/pages/CampaignAreaPage.tsx:23).
- O bloco `tabpanel-rolagem` e o import de `DiceRollerPanel` saem de
  `CampaignAreaPage.tsx`.
- Em
  [CampaignOverviewPanel.tsx](src/features/campaigns/components/CampaignOverviewPanel.tsx:137),
  o `RecentRollsCard` troca `onNavigate('rolagem')` por
  `useDiceRoller().open()`.
- O conteúdo de `DiceRollerPanel.tsx` é realocado (não simplesmente
  apagado) para dentro do popover do `DiceFab`, com os ajustes de conteúdo
  abaixo.

## Popover — conteúdo

Mantém a base do painel atual, com estas mudanças:

- Rolagem rápida (d4, d6, d8, d10, d12, d20, d100) e fórmula personalizada —
  iguais a hoje, em layout compacto (largura alvo ~300px, quick-roll em
  grid que quebra linha).
- Última rolagem: em vez do "pop" instantâneo atual, os números giram por
  ~500ms antes de assentar no resultado final. Mantém o destaque visual já
  existente para resultado mínimo/máximo.
- Recentes: lista reduzida às últimas 3–5 rolagens (hoje mostra até 20).
- **Histórico completo**: não ganha uma tela dedicada nesta etapa. A aba
  **Atividade** já registra toda rolagem hoje (chamada existente a
  `logActivity` em
  [diceService.ts](src/features/dice/services/diceService.ts:282)), então
  ela passa a ser o único lugar para ver o histórico além das últimas 3–5.
  **Trade-off aceito pelo usuário**: a Atividade mostra uma linha de texto
  simples ("Rolagem registrada: 2d6+3, resultado 18"), sem o breakdown
  detalhado (dados individuais, qual foi mantido) que a aba dedicada
  exibia. Não há link direto "ver histórico completo" apontando para a aba
  Atividade nesta etapa — o usuário troca de aba manualmente se quiser.

## Nova mecânica: manter o menor

Complementa o `N#dS` existente (mantém o maior de N dados). Notação:
`N~dS` — mesma posição sintática do `#`, símbolo diferente.

Isto é uma mudança full-stack, não só de UI:

- **`diceService.ts`**: `parseDiceFormula` passa a reconhecer `~` no lugar
  de `#` para produzir um termo `type: 'keep_lowest'`; `rollParsedFormula`
  calcula `kept = Math.min(...results)` em vez de `Math.max`;
  `buildFormulaString` reproduz `~` na notação de saída. O regex de
  caracteres permitidos (hoje `/[^0-9dD#+\-\s]/`) precisa incluir `~`.
- **`shared/types/index.ts`**: `RollMode` passa a
  `'sum' | 'keep_highest' | 'keep_lowest'`; `RollBreakdownItem` ganha a
  variante `type: 'keep_lowest'` (mesmos campos de `keep_highest`).
- **Migration nova (28ª)**, `supabase/migrations/20240130000000_dice_keep_lowest.sql`:
  - `ALTER TABLE dice_rolls DROP CONSTRAINT dice_rolls_roll_mode_valid`, recriar
    incluindo `'keep_lowest'` (constraint original em
    [20240111000000_improve_dice_rolls.sql:39-40](supabase/migrations/20240111000000_improve_dice_rolls.sql:39)).
  - Atualizar a função de validação do trigger de
    [20240112000000_custom_dice_rolls.sql:105](supabase/migrations/20240112000000_custom_dice_rolls.sql:105)
    para aceitar `v_type = 'keep_lowest'` e validar `subtotal = min(results)`
    (hoje só aceita `sum`, `keep_highest`, `modifier`).
  - Replicar a guarda `quantity < 2` (linha 227 do mesmo arquivo) também
    para `keep_lowest` — manter o menor de 1 dado não faz sentido, igual já
    vale para manter o maior.
- **README.md**: tabela de migrations passa a ter 28 linhas; seção de
  fórmulas ganha a linha `2~d20` → "rola 2d20, mantém o menor resultado".
- `npm run verify` só passa depois que `scripts/verify-migrations.mjs`
  reconhecer a 28ª migration.

## Fora de escopo nesta etapa (YAGNI)

- Som de rolagem.
- Vínculo entre a fórmula e o sistema da campanha (regras específicas de
  D&D 5e, Altherium etc.) — rolagem continua genérica por fórmula, igual
  hoje, para todos os sistemas.
- Link direto do popover para o histórico completo na aba Atividade.
- Rolagem fora do contexto de campanha (endereçado na Etapa 2 do roadmap,
  como "rolagem privada", não como rolagem sem campanha).

## Checklist de implementação

- [ ] `DiceRollerProvider` + `useDiceRoller()`
- [ ] `DiceFab` (estados travado/normal, popover)
- [ ] Popover: reaproveitar lógica de `DiceRollerPanel`, aplicar layout
      compacto, animação de rolagem, lista reduzida a 3–5
- [ ] Remover aba `rolagem` de `CampaignAreaPage.tsx` (`TabId`, `TABS`,
      bloco `tabpanel-rolagem`, import de `DiceRollerPanel`)
- [ ] Trocar `onNavigate('rolagem')` por `useDiceRoller().open()` em
      `CampaignOverviewPanel.tsx`
- [ ] `parseDiceFormula` / `rollParsedFormula` / `buildFormulaString`:
      suporte a `~` (keep_lowest)
- [ ] `RollMode` e `RollBreakdownItem` em `shared/types/index.ts`
- [ ] Migration 28: constraint `roll_mode` + trigger de validação do
      breakdown + guarda de quantidade mínima
- [ ] README: tabela de migrations (28 linhas), seção de fórmulas, seção
      "O que está implementado no MVP" (linha da aba Rolagem vira linha do
      botão flutuante)
- [ ] `npm run verify` passando (migrations + build)
