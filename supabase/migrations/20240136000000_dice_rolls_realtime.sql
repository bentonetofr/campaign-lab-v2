-- ============================================================
-- Vorterium — Realtime para dice_rolls (pop-up de rolagem sem delay)
-- Migration: 20240136000000_dice_rolls_realtime.sql
-- Aplicar após: 20240135000000_private_messages.sql
-- ============================================================

-- A migration 6 (20240106000000_harden_character_sheets_and_dice.sql)
-- removeu dice_rolls da publicação Realtime de propósito, pra economizar
-- recursos no MVP — o pop-up de notificação dependia só de polling a
-- cada 20s. Isso criava um atraso perceptível entre alguém rolar um dado
-- e o resto da mesa ver o pop-up (mesmo problema que o chat tinha antes
-- de virar Realtime de verdade na migration 31). Reativa aqui pelo mesmo
-- motivo.

do $$
begin
  alter publication supabase_realtime add table public.dice_rolls;
exception when others then
  null;
end;
$$;
