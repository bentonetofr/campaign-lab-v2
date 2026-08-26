# Vorterium — contrato de arquitetura

Este documento registra as decisões estruturais do Vorterium. A aplicação evolui
em etapas; cada etapa deve terminar com validação local e uma migration própria
quando alterar o contrato do Supabase.

## Stack vigente

- React 18, TypeScript e Vite.
- React Router v6.
- Supabase Auth, Postgres e Row Level Security.
- CSS próprio, design system Medieval Dark v2.
- Vercel para deploy.

O diretório `app/`, os arquivos de configuração do Next.js e o documento antigo
de arquitetura não fazem parte do fluxo vigente do Vorterium. O entrypoint da
aplicação é `src/main.tsx`.

## Princípios

- Supabase é a fonte de verdade para autenticação, autorização e persistência.
- RLS e validações no banco são obrigatórias; verificações na interface são apenas
  uma camada de experiência.
- Nenhum cliente usa credenciais privilegiadas.
- Campos estruturais como dono, campanha de origem e autor são imutáveis depois
  da criação.
- RPCs `SECURITY DEFINER` devem validar autenticação, membership, papel e limites
  antes de escrever em tabelas protegidas.
- Sistemas de RPG devem ser extensíveis; regras de ficha e rolagem não devem ser
  acopladas à tela principal da campanha.
- Features em tempo real só devem habilitar Realtime quando houver uma necessidade
  comprovada de atualização compartilhada.

## Entidades atuais

O schema atual contém:

- `profiles`, `campaigns` e `campaign_members`;
- `campaign_invites`, `campaign_sessions` e `campaign_notes`;
- `character_sheets`, `dnd_character_sheets` e os detalhes D&D (`dnd_character_skills`,
  `dnd_character_attacks`, `dnd_character_inventory`, `dnd_character_spells`);
- `dice_rolls`, `campaign_activity` e `campaign_presence`;
- buckets públicos `avatars` e `campaign-covers`, com escrita protegida por RLS.

O contrato canônico contém 28 migrations SQL. A verificação local é executada com:

```bash
npm run verify
```

Essa verificação confere a quantidade, os nomes, a ordem e o conteúdo das
migrations, e depois executa o build de produção.

## Regras para novas etapas

1. Definir o fluxo completo na interface antes de criar tabelas novas.
2. Modelar dados repetíveis em tabelas relacionadas, evitando JSONB quando os
   registros precisarem ser filtrados ou editados individualmente.
3. Criar índices para as consultas principais da campanha.
4. Criar policies de `SELECT`, `INSERT`, `UPDATE` e `DELETE` explicitamente.
5. Proteger `campaign_id`, `user_id`, autor e timestamps estruturais com triggers
   quando esses campos existirem.
6. Adicionar o fluxo à atividade da campanha somente depois de validar a operação
   principal.
7. Atualizar README, tipos TypeScript, serviços e checklist de teste junto com a
   migration.

## Estado da Etapa 1

- Build de produção validado.
- Inventário de migrations reconciliado com os arquivos presentes.
- Documentação atualizada para o stack vigente.
- Verificação local do contrato de migrations adicionada.

Auditorias que dependem de consultar o projeto Supabase — especialmente RLS
efetivamente aplicado, grants e publicação Realtime — devem ser executadas no
Dashboard ou CLI autenticado antes da primeira migration de domínio da próxima
etapa.
