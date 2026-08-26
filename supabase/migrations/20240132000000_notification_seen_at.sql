-- ============================================================
-- Vorterium — Rastreio de notificações vistas
-- Migration: 20240132000000_notification_seen_at.sql
-- Aplicar após: 20240131000000_dice_private_rolls.sql
-- ============================================================

-- default now() é proposital: sem isso, todo usuário existente veria uma
-- enxurrada de "não vistos" retroativos assim que a coluna fosse criada.
-- Com o default, todo mundo começa "em dia" e só conta daqui pra frente.

alter table public.profiles
  add column if not exists activity_seen_at timestamptz not null default now();
