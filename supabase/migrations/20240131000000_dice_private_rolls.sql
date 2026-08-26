-- ============================================================
-- Vorterium — Rolagem privada / dano oculto
-- Migration: 20240131000000_dice_private_rolls.sql
-- Aplicar após: 20240130000000_dice_keep_lowest.sql
-- ============================================================


-- ── 1. Coluna is_private ──────────────────────────────────

alter table public.dice_rolls
  add column if not exists is_private boolean not null default false;


-- ── 2. Substituir policy de SELECT ────────────────────────
--
-- Antes: qualquer membro da campanha via todas as rolagens.
-- Agora: rolagens privadas só ficam visíveis para quem rolou
-- e para o mestre da campanha — os demais membros não veem
-- nada (nem o valor, nem indício de que a rolagem existe).

drop policy if exists "dice_rolls: membro pode ver rolagens da campanha" on public.dice_rolls;

create policy "dice_rolls: membro ve rolagens publicas ou proprias/mestre"
  on public.dice_rolls for select
  to authenticated
  using (
    public.is_campaign_member(campaign_id, auth.uid())
    and (
      not is_private
      or user_id = auth.uid()
      or public.is_campaign_master(campaign_id, auth.uid())
    )
  );
