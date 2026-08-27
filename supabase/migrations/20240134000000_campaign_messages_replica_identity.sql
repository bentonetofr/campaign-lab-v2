-- ============================================================
-- Vorterium — Corrige DELETE em tempo real no chat
-- Migration: 20240134000000_campaign_messages_replica_identity.sql
-- Aplicar após: 20240133000000_campaign_chat.sql
-- ============================================================

-- Por padrão (REPLICA IDENTITY DEFAULT), o Postgres só inclui a chave
-- primária no registro "old" de um evento de DELETE replicado. O canal
-- Realtime do chat filtra por `campaign_id=eq.<id>` — mas campaign_id não
-- vem nesse payload reduzido, então o filtro nunca bate e o evento de
-- exclusão nunca chega aos outros membros (só reaparecia ao recarregar a
-- página, que busca do banco direto).
--
-- REPLICA IDENTITY FULL faz o Postgres incluir todas as colunas no "old"
-- de UPDATE/DELETE, permitindo o filtro por campaign_id funcionar.

alter table public.campaign_messages replica identity full;
