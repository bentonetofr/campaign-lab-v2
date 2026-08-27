# Vorterium

Plataforma web para gerenciamento de campanhas de RPG de mesa.

## Visão geral

Vorterium permite que mestres criem campanhas, adicionem jogadores, gerenciem fichas simples de personagem e registrem rolagens de dados — tudo persistido em banco de dados real via Supabase.

> **Nota sobre tempo real:** o MVP não usa Supabase Realtime para economizar recursos. O histórico de rolagens atualiza para o próprio usuário após cada rolagem. Outros membros veem as novas rolagens ao recarregar a página. Realtime pode ser reativado futuramente.

---

## Stack

| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript | Interface |
| Vite | Bundler e dev server |
| Supabase | Auth, banco de dados, RLS |
| React Router v6 | Roteamento client-side |
| CSS puro (design system próprio) | Estilo — Medieval Dark v2 |

---

## Pré-requisitos

- Node.js 18+
- npm 9+
- Conta no [Supabase](https://supabase.com) com um projeto criado

---

## Instalação

```bash
git clone <url-do-repositório>
cd campaign-lab
npm install
```

---

## Configuração

### 1. Configurar `.env`

```bash
cp .env.example .env
```

Edite `.env` com os dados do seu projeto Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

Valores em: **Supabase Dashboard → Settings → API**

---

### 2. Configurar Supabase Auth

#### Login com e-mail e senha

```
Authentication → Providers → Email
```

- Mantenha **Enable Email provider** ativado
- **Confirm email**: ative para exigir verificação antes do primeiro login

#### Login com Google (OAuth)

```
Authentication → Providers → Google
```

1. Ative o provider Google no Supabase
2. Copie a **Callback URL** exibida (`https://...supabase.co/auth/v1/callback`)
3. No [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → OAuth 2.0 Client ID**:
   - Tipo: **Web application**
   - Adicione a Callback URL em **Authorized redirect URIs**
   - Copie **Client ID** e **Client Secret**
4. Cole no Supabase e salve

#### URL de callback da aplicação

```
Authentication → URL Configuration
```

- **Site URL**: `http://localhost:5173`
- **Redirect URLs**: adicione `http://localhost:5173/auth/callback`

> Em produção, substitua `localhost:5173` pelo domínio real.

---

### 3. Aplicar as migrations SQL

As migrations devem ser aplicadas **em ordem**, uma por vez, no **Supabase Dashboard → SQL Editor → New query**.

O repositório contém **30 migrations SQL**. A lista abaixo é o contrato canônico da
ordem de aplicação; não existe uma migration `20240121000000_my_sheets.sql` neste
repositório e ela não deve ser criada ou aplicada sem uma decisão explícita de
schema.

| # | Arquivo | O que faz |
|---|---|---|
| 1  | `20240101000000_initial_schema.sql` | Tabelas `profiles`, `campaigns`, `campaign_members`; triggers; RLS; RPCs `create_campaign`, `is_campaign_member`, `is_campaign_master` |
| 2 | `20240102000000_campaign_members.sql` | Policy de perfis entre co-membros; RPCs `find_profile_by_email`, `add_campaign_player`, `remove_campaign_player` |
| 3 | `20240103000000_harden_campaign_members_insert.sql` | Remove policy de insert direto em `campaign_members` — toda inserção passa a ser via RPC |
| 4 | `20240104000000_character_sheets.sql` | Tabela `character_sheets`; RLS por dono e mestre |
| 5 | `20240105000000_dice_rolls.sql` | Tabela `dice_rolls`; RLS por membro da campanha |
| 6 | `20240106000000_harden_character_sheets_and_dice.sql` | Trigger que impede alteração de `campaign_id`/`user_id` em fichas; constraint de resultado máximo por tipo de dado; remove `dice_rolls` do Realtime |
| 7 | `20240107000000_allow_profile_self_insert.sql` | Policy de INSERT em `profiles` para o próprio usuário — permite que `ensureProfile()` sincronize perfis ausentes com segurança |
| 8 | `20240108000000_campaign_invites.sql` | Tabela `campaign_invites`; RLS; RPCs `create_campaign_invite`, `accept_campaign_invite`, `deactivate_campaign_invite` |
| 9 | `20240109000000_improve_campaign_invites.sql` | RPC pública `get_campaign_invite_public` — retorna dados do convite sem autenticação (nome da campanha, status, expiração) |
| 10 | `20240110000000_campaign_management.sql` | RPCs `update_campaign_name`, `delete_campaign`, `leave_campaign` — gerenciamento seguro de campanha |
| 11 | `20240111000000_improve_dice_rolls.sql` | Adiciona campos `quantity`, `modifier`, `individual_results`, `total_result`, `roll_mode`, `kept_result`, `formula` em `dice_rolls`; trigger de validação |
| 12 | `20240112000000_custom_dice_rolls.sql` | Adiciona `roll_breakdown jsonb`; ajusta limites de `quantity` (100) e `modifier` (±999); substitui trigger com validação matemática completa do breakdown |
| 13 | `20240113000000_campaign_sessions.sql` | Tabela `campaign_sessions` (título, data, resumo, created_by); RLS — membros visualizam, mestre cria/edita/exclui; trigger `updated_at` |
| 14 | `20240114000000_harden_campaign_sessions.sql` | Trigger `enforce_session_immutable_fields` — impede alteração de `campaign_id`, `created_by` e `created_at` após criação |
| 15 | `20240115000000_campaign_description_status.sql` | Adiciona descrição e status à campanha; recria as RPCs de criação e atualização com validações |
| 16 | `20240116000000_harden_campaign_structural_fields.sql` | Endurece `create_campaign` com validação de `char_length`; trigger imutável para `campaign_id`/`user_id` em várias tabelas |
| 17 | `20240117000000_campaign_activity_presence.sql` | Tabelas `campaign_activity` e `campaign_presence`; RPCs para registrar atividade e heartbeat de presença |
| 18 | `20240118000000_harden_campaign_activity_rpc.sql` | Endurece `create_campaign_activity` para impedir que jogadores forjem eventos administrativos |
| 19 | `20240119000000_session_status.sql` | Adiciona status `planned`, `completed` e `canceled` às sessões |
| 20 | `20240120000000_campaign_notes.sql` | Tabela `campaign_notes`; RLS — membros leem e criam, autor e mestre editam/excluem; tipos de atividade de notas |
| 21 | `20240122000000_remove_custom_campaign_system.sql` | Remove sistema `custom` das campanhas; recria RPC `create_campaign` com sistemas válidos: `generic`, `dnd5e`, `altherium` |
| 22 | `20240123000000_dnd_character_sheets_base.sql` | Tabela `dnd_character_sheets` — ficha D&D 5e base; RLS; triggers de `updated_at` e campos estruturais imutáveis |
| 23 | `20240125000000_dnd_abilities_saves.sql` | Idempotente: garante `player_name`, atributos (integer 1–30) e colunas `strength_save_proficient` etc. em `dnd_character_sheets` |
| 24 | `20240126000000_profile_preferences_and_media.sql` | Preferência de tema, URL de capa da campanha, buckets `avatars`/`campaign-covers` e policies de Storage |
| 25 | `20240127000000_dnd_sheet_details.sql` | Perícias, ataques, inventário e magias da ficha D&D 5e, com índices, triggers e RLS |
| 26 | `20240128000000_dnd_rules_engine.sql` | Catálogo D&D 5e 2014, escolhas oficiais, proficiências adicionais e sobrescritas manuais de campos calculados |
| 27 | `20240129000000_dnd_equipment_catalog.sql` | Catálogo estruturado de armas, armaduras, itens de aventura e ferramentas para a ficha D&D 5e |
| 28 | `20240130000000_dice_keep_lowest.sql` | Adiciona `keep_lowest` (`roll_mode` e validação do `roll_breakdown`) — suporta o operador `~` (manter o menor) na fórmula de rolagem |
| 29 | `20240131000000_dice_private_rolls.sql` | Adiciona `dice_rolls.is_private` e substitui a policy de SELECT — rolagens privadas só ficam visíveis para quem rolou e para o mestre da campanha |
| 30 | `20240132000000_notification_seen_at.sql` | Adiciona `profiles.activity_seen_at` — marca quando o usuário viu notificações pela última vez |

> **Usuários criados antes da migration 1:** o trigger `handle_new_user` cria perfis apenas para novos cadastros. Para sincronizar usuários já existentes, rode o script de backfill comentado na seção 9 da migration 1.

---

### 4. Rodar localmente

```bash
npm run dev
# http://localhost:5173
```

### Build de produção

```bash
npm run build
npm run preview
```

### Verificação local do contrato

Antes de abrir um deploy ou adicionar uma migration, execute:

```bash
npm run verify
```

O comando valida as 30 migrations registradas e depois executa o build de produção.

---

## Sistemas disponíveis

Os sistemas são internos do Vorterium — usuários não criam sistemas personalizados. Novos sistemas são adicionados por atualizações da plataforma.

| Sistema | ID | Ficha | Status |
|---|---|---|---|
| **Genérico** | `generic` | Ficha simples (atributos, PV, notas) | Disponível |
| **D&D 5e** | `dnd5e` | Ficha completa com persistência real no banco | Prévia |
| **Altherium** | `altherium` | Sistema futuro do universo Altherium | Em breve |

- **Genérico:** usa a ficha simples atual. Ideal para testes, one-shots ou sistemas caseiros.
- **D&D 5e:** ficha D&D 5e persistida no banco, com edição direta em linha (sem modo "editar" global). Inclui cabeçalho, atributos, salvaguardas, CA / iniciativa / deslocamento / proficiência, PV, salvaguardas mortais, inspiração e listas persistentes de perícias, ataques, inventário e magias. O banner "Alterações não salvas" controla os campos principais; listas são salvas individualmente para evitar perda de alterações.
- **Altherium:** a ficha própria do sistema Altherium será desenvolvida em atualização futura. Campanhas Altherium já podem ser criadas para validar a estrutura.

O sistema de uma campanha é escolhido no momento da criação e **não pode ser alterado depois**.

---

## O que está implementado no MVP

| Feature | Status |
|---|---|
| Cadastro com e-mail e senha | ✅ |
| Login com e-mail e senha | ✅ |
| Login com Google (OAuth) | ✅ |
| Logout | ✅ |
| Perfis de usuário (profiles) | ✅ |
| Criar campanha com seleção de sistema (Genérico / D&D 5e / Altherium) | ✅ |
| Listar campanhas como mestre e jogador | ✅ |
| Área da campanha por abas com aba "Visão geral" como padrão | ✅ |
| Aba Membros com seções separadas (Mestre / Jogadores) | ✅ |
| Adicionar jogador por e-mail | ✅ |
| Remover jogador (com confirmação inline) | ✅ |
| Convite por link — gerar, copiar e desativar | ✅ |
| Status de ficha por membro na aba Membros (preenchida / não preenchida / não criada) | ✅ |
| Ficha simples de personagem (identificação, PV, atributos, anotações) | ✅ |
| Indicador "Preenchida / Não preenchida" na ficha | ✅ |
| Barra de HP visual na ficha | ✅ |
| Mestre vê todas as fichas com status de preenchimento | ✅ |
| Rolagem rápida de dados (d4–d100) | ✅ |
| Rolagem personalizada por fórmula (`2d6+3`, `2#d20`, `2~d20`…) | ✅ |
| Histórico de rolagens com breakdown detalhado | ✅ |
| Botão flutuante de rolagem, acessível de qualquer aba dentro de uma campanha | ✅ |
| Rolagem privada / dano oculto | ✅ |
| Sino de notificações — selo global de eventos novos em todas as campanhas | ✅ |
| Pop-up ao vivo (5s) para rolagem pública, nova nota, nova sessão e novo membro | ✅ |
| Área da campanha por abas (Visão geral / Membros / Sessões / Ficha / Configurações) | ✅ |
| Sessões da campanha — criar, editar e excluir pelo mestre | ✅ |
| Sessões — visualização com título, data e resumo para jogadores | ✅ |
| Sessões na Visão Geral — contagem e última sessão com ação rápida | ✅ |
| Proteção de rotas (RLS + front-end) | ✅ |
| Design Medieval Dark v2 | ✅ |
| Convite por link — aceitar com dados públicos antes do login | ✅ |
| Mestre edita nome da campanha | ✅ |
| Mestre exclui campanha (com cascata) | ✅ |
| Jogador sai da campanha | ✅ |
| Página de perfil (`/perfil`) — editar nome público | ✅ |
| Preferência de tema, avatar com ajuste e capa de campanha com recorte | ✅ |
| Ficha D&D 5e — perícias, ataques, inventário e magias persistentes | ✅ |

## O que está fora do MVP (futuras features)

- Chat em tempo real
- Ficha Altherium completa
- Explorar campanhas públicas
- Configurações de conta
- Plano premium / monetização

---

## Rolagem de dados

A rolagem é acessível pelo **botão flutuante** (⬡) fixo no canto inferior
direito da tela, em qualquer aba dentro de uma campanha. Fora do contexto de
uma campanha o botão aparece travado (🔒), com uma dica ao passar o cursor —
a rolagem pertence à campanha ativa, já que cada campanha pode usar um
sistema de RPG diferente.

### Rolagem rápida

Botões de um clique: **1d4 · 1d6 · 1d8 · 1d10 · 1d12 · 1d20 · 1d100**

Clique → rola imediatamente → salva no histórico → exibe resultado, com uma
breve animação de "giro" antes de assentar no valor final.

### Rolagem personalizada por fórmula

Campo de texto que aceita uma gramática controlada (sem eval, sem funções):

| Fórmula | Significado |
|---|---|
| `1d20` | 1 dado de 20 lados |
| `d20` | equivalente a `1d20` |
| `2d6+3` | soma 2d6 e adiciona 3 |
| `3d4-1` | soma 3d4 e subtrai 1 |
| `2#d20` | rola 2d20, **mantém o maior resultado** |
| `2~d20` | rola 2d20, **mantém o menor resultado** |
| `1#d3+4` | rola 1d3, mantém o maior resultado, adiciona 4 |
| `3#d6+2` | rola 3d6, mantém o maior resultado, adiciona 2 |
| `2#d20+1d4+3` | keep-highest 2d20 + soma 1d4 + modificador 3 |

O operador `#` significa "rolar N dados e manter o maior resultado"; `~` é o
complemento — "rolar N dados e manter o menor resultado". O resultado
detalhado sempre exibe os dados individuais e qual foi mantido.

**Limites aceitos:** quantidade por termo 1–100 · lados 2–1000 · modificador ±999 · até 10 termos · fórmula até 80 caracteres.

### Histórico

- Últimas 3 rolagens da campanha, direto no popover do botão flutuante
- Exibe fórmula, resultados individuais, kept result (quando `#` ou `~`), modificador e resultado final
- Botão **"Atualizar"** recarrega manualmente (sem Realtime / sem polling)
- Histórico completo além das últimas 3 fica registrado na aba **Atividade** da campanha

### Rolagem privada

O popover tem um toggle **"🔒 Rolagem privada"**, desmarcado por padrão toda
vez que reabre. Enquanto marcado, vale tanto pra rolagem rápida quanto pra
fórmula personalizada.

- Quem rolou sempre vê o próprio resultado.
- O mestre da campanha sempre vê qualquer rolagem, privada ou não.
- Os demais jogadores não veem nada de uma rolagem privada de outra pessoa
  — nem o valor, nem indício de que ela aconteceu. A regra é aplicada por
  RLS no banco, não por filtro na tela.
- Rolagens privadas não geram registro na aba Atividade — nem pra quem
  rolou, nem pro mestre. Ficam visíveis só pelo próprio popover (notificação
  e histórico recente), marcadas com 🔒.

## Notificações

Um sino fica sempre visível no canto inferior direito, junto do botão de
rolagem de dados — dentro ou fora do contexto de campanha. Conta eventos
novos em **todas** as campanhas do usuário, não só a que está aberta.

Eventos que contam: entrada/saída de membro, sessão criada/editada/
cancelada, nova nota, e rolagem de dados (pública conta pra toda a mesa;
oculta conta só pro mestre — mesma regra de visibilidade da rolagem
privada). Convites, atualização de campanha e de ficha não notificam,
continuam só na aba Atividade.

Clicar no sino abre um painel com as últimas 3 notificações (mesmo estilo
do popover de rolagem de dados) e marca tudo como visto. Sem Realtime —
verifica a cada ~75s enquanto o app está aberto.

### Pop-up ao vivo

Além do sino, um pop-up aparece automaticamente por 5 segundos quando
acontece: rolagem pública nova, nova nota, nova sessão criada, ou você
ser adicionado a uma campanha. Rolagem oculta nunca vira pop-up (só conta
no sino, mesmo pro mestre) — fica discreta de propósito.

Checa a cada 60s, também sem Realtime. O relógio desse pop-up é separado
do sino e só existe na memória do navegador — recarregar a página zera e
passa a valer só dali pra frente, pra não disparar uma enxurrada de
pop-ups de coisa antiga a cada F5. Vários eventos no mesmo intervalo
aparecem um de cada vez, nunca empilhados.

---

## Sessões de campanha

A aba **"Sessões"** fica acessível dentro de qualquer campanha.

### Para o mestre

- **Criar sessão**: botão "+ Nova sessão" abre um formulário inline com título (obrigatório), data e resumo.
- **Editar sessão**: botão "Editar" em cada card reabre o formulário preenchido.
- **Excluir sessão**: botão "Excluir" exibe confirmação inline — sem diálogos nativos do browser.

### Para o jogador

- Visualiza todas as sessões registradas: título, data formatada e resumo completo.
- Não vê os botões de criar, editar ou excluir.

### Campos

| Campo | Tipo | Obrigatório | Limite |
|---|---|---|---|
| Título | texto | sim | 120 caracteres |
| Data da sessão | date | não | — |
| Resumo | texto longo | não | 5000 caracteres |

### Segurança

- RLS garante que usuários fora da campanha não acessam sessões.
- INSERT e UPDATE e DELETE são restritos ao mestre da campanha via `is_campaign_master`.
- `created_by` é sempre o `auth.uid()` do usuário autenticado (verificado no banco).

### Visão Geral

A aba **"Visão Geral"** mostra um card de Sessões com a contagem total, o título e a data da sessão mais recente, além do botão "Ver sessões →" para navegar direto à aba.

---

## Observações importantes

**Supabase Realtime desativado no MVP**
O histórico de rolagens atualiza localmente após o próprio usuário rolar. Outros membros veem as novas rolagens ao recarregar a página. Isso evita uso desnecessário de conexões WebSocket no MVP.
Para reativar no futuro: adicione `dice_rolls` à publicação em **Dashboard → Database → Replication** e restaure `subscribeToRolls` em `diceService.ts` e `DiceRollerPanel.tsx`.

**Segurança no banco**
Toda inserção em `campaign_members` acontece via RPC (`add_campaign_player`, `create_campaign`) — insert direto está bloqueado pelo RLS. Fichas têm trigger que impede alteração de `campaign_id` e `user_id`. Rolagens têm constraint que valida o intervalo por tipo de dado.

---

## Estrutura do projeto

```
supabase/
└── migrations/             ← 27 migrations em ordem

src/
├── app/
│   ├── router/             # Rotas + GuestRoute + ProtectedRoute
│   ├── providers/          # AppProviders
│   └── layouts/            # PublicLayout (auth) e PrivateLayout (sidebar)
│
├── features/
│   ├── auth/               # AuthProvider, GuestRoute, ProtectedRoute, páginas de auth
│   ├── campaigns/          # Listagem, criação, área da campanha, configurações + campaignService
│   ├── members/            # CampaignMembersPanel + memberService
│   ├── sheets/
│   │   ├── components/     # SimpleSheetPanel, CampaignSheetPanel (roteador de sistemas)
│   │   ├── dnd/
│   │   │   ├── services/   # dndSheetService (getMyDndSheet, ensureMyDndSheet, updateDndSheet)
│   │   │   ├── DndCharacterSheetPanel.tsx  # Ficha D&D 5e real (dados do banco)
│   │   │   ├── DndCharacterSheetPreview.tsx # Prévia visual com dados mock (referência)
│   │   │   ├── DndCharacterSheet.css
│   │   │   ├── mockCharacter.ts
│   │   │   └── tabs/       # Componentes de aba (mock — referência)
│   │   ├── altherium/      # Placeholder de ficha Altherium
│   │   └── services/       # sheetService (ficha genérica)
│   ├── dice/               # DiceRollerProvider, DiceFab, DiceRollerPanel + diceService
│   ├── notes/              # CampaignNotesPanel + noteService
│   ├── sessions/           # CampaignSessionsPanel + sessionService
│   ├── activity/           # CampaignActivityPanel, GlobalActivityPage, NotificationBell + activityService
│   └── users/              # profileService
│
└── shared/
    ├── constants/systems.ts # Catálogo de sistemas (generic / dnd5e / altherium)
    ├── lib/supabase.ts      # Cliente Supabase
    ├── utils/authErrors.ts  # Tradução de erros de auth
    ├── utils/campaign.ts    # formatRole, getCampaignStatusLabel
    └── types/index.ts       # Tipos: Campaign, CharacterSheet, DndCharacterSheet, DiceRoll…
```

---

## Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/login` | Guest | Login |
| `/cadastro` | Guest | Cadastro |
| `/auth/callback` | Público | Callback OAuth |
| `/campanhas` | Autenticado | Lista de campanhas |
| `/campanhas/nova` | Autenticado | Criar campanha |
| `/campanhas/:campaignId` | Autenticado + membro | Área da campanha |
| `/perfil` | Autenticado | Perfil do usuário — editar nome público |
| `/` | Público | Página inicial |
| `/sobre` | Público | Sobre o Vorterium |
| `/termos` | Público | Termos de uso |
| `/privacidade` | Público | Política de privacidade |
| `/convite/:token` | Público | Aceitar convite de campanha |

---

## Tema claro/escuro

O Vorterium suporta alternância entre **modo escuro** (padrão) e **modo claro** (pergaminho medieval).

- O **tema padrão é escuro** (Medieval Dark v2).
- O botão de alternância aparece em **todas as páginas** — canto superior direito nas telas públicas e na barra lateral/topbar nas telas privadas.
- **Modo escuro:** o botão exibe ☀ (clicar para ir para modo claro).
- **Modo claro:** o botão exibe ☾ (clicar para ir para modo escuro).
- A troca de ícone tem animação de rotação.
- A **preferência fica salva no navegador** via `localStorage` com a chave `campaign-lab-theme`.
- O tema é aplicado antes do React montar (script no `<head>`) para evitar flash de tema errado.
- A tela de login possui **animação de partículas douradas** subindo ao fundo, reforçando a atmosfera medieval/fantasia.


---

## Convites de campanha

O mestre de uma campanha pode gerar um **link de convite** para compartilhar com jogadores.

- Na seção **Membros** da campanha, o mestre vê o botão **"Gerar link de convite"**.
- O link gerado tem o formato `/convite/:token`.
- O jogador abre o link:
  - Se **autenticado**: é adicionado como jogador e redirecionado para a campanha.
  - Se **não autenticado**: o token é salvo e o usuário é levado para `/login`; após autenticar, o convite é processado automaticamente.
- Convites **nunca concedem papel de mestre** — sempre adicionam como jogador.
- O mestre pode **desativar** um convite ativo pelo botão correspondente.
- Convites desativados deixam de funcionar imediatamente.

> **Migration necessária:** `20240108000000_campaign_invites.sql` deve ser aplicada antes de usar esta funcionalidade.


---

## Deploy de teste na Vercel

### Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

- Conta no [GitHub](https://github.com)
- Conta na [Vercel](https://vercel.com)
- Projeto no Supabase criado e configurado
- Todas as migrations aplicadas no Supabase (ver seção acima)
- Supabase Auth configurado (e-mail/senha e Google OAuth)

---

### Passo 1 — Subir para o GitHub

```bash
# Na raiz do projeto
git init
git add .
git commit -m "feat: Vorterium MVP"

# Crie um repositório no GitHub e depois:
git remote add origin https://github.com/seu-usuario/campaign-lab.git
git push -u origin main
```

> **Importante:** confirme que `.env` **não** está no commit. Ele deve estar no `.gitignore`.

---

### Passo 2 — Importar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New → Project**
3. Importe o repositório do GitHub
4. Configure o projeto:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. **Não clique em Deploy ainda** — configure as variáveis de ambiente primeiro

---

### Passo 3 — Variáveis de ambiente na Vercel

Na tela de configuração do projeto (ou em **Settings → Environment Variables** depois):

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | sua anon key do Supabase |

Após adicionar as variáveis, clique em **Deploy**.

A Vercel irá gerar uma URL no formato:
```
https://campaign-lab-xxxx.vercel.app
```

---

### Passo 4 — Atualizar Supabase Auth

Com a URL da Vercel em mãos, acesse o Supabase Dashboard:

```
Authentication → URL Configuration
```

**Site URL:**
```
https://campaign-lab-xxxx.vercel.app
```

**Redirect URLs** (adicione os dois — mantenha localhost para desenvolvimento):
```
http://localhost:5173/auth/callback
https://campaign-lab-xxxx.vercel.app/auth/callback
```

Salve as alterações.

---

### Passo 5 — Revisar Google OAuth

No [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials → seu OAuth 2.0 Client**:

**Authorized JavaScript origins** — adicione:
```
https://campaign-lab-xxxx.vercel.app
```

**Authorized redirect URIs** — a URI de callback do Supabase não muda:
```
https://SEU-PROJETO.supabase.co/auth/v1/callback
```

> Se essa URI já estava configurada antes, não é necessário alterar. O redirect vai para o Supabase, não para a Vercel diretamente.

---

### Passo 6 — Testar online

Após o deploy, valide os fluxos principais:

1. Abra a URL da Vercel
2. Crie uma conta (`/cadastro`)
3. Faça login (`/login`)
4. Teste login com Google
5. Crie uma campanha
6. Adicione um segundo usuário como jogador
7. Edite a ficha de personagem
8. Role dados e verifique o histórico
9. Faça logout e confirme redirecionamento para `/login`

---

### Checklist de deploy

- [ ] `npm run build` passou localmente
- [ ] `.env` não está no repositório (está no `.gitignore`)
- [ ] Projeto subido para o GitHub
- [ ] Projeto importado na Vercel com framework Vite
- [ ] `VITE_SUPABASE_URL` configurada na Vercel
- [ ] `VITE_SUPABASE_ANON_KEY` configurada na Vercel
- [ ] Deploy realizado com sucesso na Vercel
- [ ] Supabase **Site URL** atualizado para a URL da Vercel
- [ ] Supabase **Redirect URLs** atualizadas (localhost + Vercel)
- [ ] Google OAuth revisado (JavaScript origins + redirect URIs)
- [ ] Login com e-mail/senha testado na URL de produção
- [ ] Login com Google testado na URL de produção
- [ ] Logout testado
- [ ] Criação de campanha testada
- [ ] Adição de membros testada
- [ ] Ficha de personagem testada
- [ ] Rolagem de dados testada

---

## Checklist de teste manual

Execute na ordem para validar o MVP completo:

- [ ] **Criar conta** — acessar `/cadastro`, preencher nome, e-mail, senha e confirmar. Verificar e-mail se confirmação estiver ativada.
- [ ] **Entrar com e-mail/senha** — acessar `/login`, entrar com as credenciais criadas. Confirmar redirecionamento para `/campanhas`.
- [ ] **Entrar com Google** — clicar em "Entrar com Google". Confirmar que o callback funciona e redireciona para `/campanhas`.
- [ ] **Sair da conta** — clicar em "Sair" na sidebar. Confirmar redirecionamento para `/login`.
- [ ] **Criar campanha** — clicar em "+ Criar campanha", preencher nome, clicar em "Criar Campanha". Confirmar redirecionamento para a área da campanha.
- [ ] **Ver campanha como mestre** — confirmar que o papel exibido é "Mestre" e que o formulário de adicionar jogador aparece.
- [ ] **Criar segundo usuário** — abrir aba anônima/outro navegador e criar uma segunda conta.
- [ ] **Adicionar segundo usuário como jogador** — como mestre, usar o formulário de adicionar jogador com o e-mail do segundo usuário.
- [ ] **Entrar como jogador** — logar com o segundo usuário. Confirmar que a campanha aparece em "Como jogador".
- [ ] **Ver campanha como jogador** — confirmar que o papel exibido é "Jogador" e que o formulário de adicionar jogador **não** aparece.
- [ ] **Jogador editar própria ficha** — preencher nome do personagem, atributos e salvar. Confirmar mensagem de sucesso.
- [ ] **Mestre visualizar ficha** — como mestre, abrir a campanha e ver a ficha do jogador na lista de fichas.
- [ ] **Rolar dados** — selecionar um dado (ex: d20), clicar em "Rolar d20". Confirmar que o resultado aparece e entra no histórico.
- [ ] **Ver histórico** — confirmar que o histórico mostra jogador, dado, resultado e horário.
- [ ] **Testar bloqueio de rota privada** — deslogar e acessar `/campanhas` diretamente. Confirmar redirecionamento para `/login`.
