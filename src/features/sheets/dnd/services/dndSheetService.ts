// ────────────────────────────────────────────────────────
// Serviço — Ficha D&D 5e
// ────────────────────────────────────────────────────────

import { supabase }    from '../../../../shared/lib/supabase'
import { logActivity } from '../../../activity/services/activityService'
import type {
  DndCharacterAttack,
  DndCharacterAttackInput,
  DndCharacterInventoryInput,
  DndCharacterInventoryItem,
  DndCharacterSkill,
  DndCharacterSheet,
  DndCharacterSheetUpdateInput,
  DndCharacterSpell,
  DndCharacterSpellInput,
  DndSheetDetails,
  ProfilePublic,
} from '../../../../shared/types'

// ────────────────────────────────────────────────────────
// Tipos auxiliares
// ────────────────────────────────────────────────────────

export interface DndSheetWithProfile extends DndCharacterSheet {
  profile: ProfilePublic
}

interface RawDndSheetWithProfile extends DndCharacterSheet {
  profiles: ProfilePublic
}

// ────────────────────────────────────────────────────────
// Leitura
// ────────────────────────────────────────────────────────

/**
 * Busca a ficha D&D 5e do usuário autenticado na campanha.
 * Retorna null se a ficha ainda não existir.
 */
export async function getMyDndSheet(
  campaignId: string
): Promise<DndCharacterSheet | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const { data, error } = await supabase
    .from('dnd_character_sheets')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null   // ficha não existe
    throw new Error('Não foi possível carregar a ficha.')
  }

  return data as DndCharacterSheet
}

/**
 * Cria uma ficha D&D 5e vazia para o usuário autenticado na campanha.
 * A RLS impede criar ficha para outro usuário ou em campanha que não seja dnd5e.
 */
async function createMyDndSheet(
  campaignId: string
): Promise<DndCharacterSheet> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado.')

  const { data, error } = await supabase
    .from('dnd_character_sheets')
    .insert({ campaign_id: campaignId, user_id: user.id })
    .select('*')
    .single()

  if (error) {
    console.error('Erro ao criar/carregar ficha D&D', error)
    throw new Error('Não foi possível criar a ficha D&D.')
  }
  return data as DndCharacterSheet
}

/**
 * Retorna a ficha D&D do usuário na campanha, criando-a se não existir.
 */
export async function ensureMyDndSheet(
  campaignId: string
): Promise<DndCharacterSheet> {
  const existing = await getMyDndSheet(campaignId)
  if (existing) return existing
  return createMyDndSheet(campaignId)
}

/**
 * Lista todas as fichas D&D de uma campanha com o perfil do dono.
 * Disponível apenas para o mestre (a RLS de SELECT garante isso).
 */
export async function getCampaignDndSheets(
  campaignId: string
): Promise<DndSheetWithProfile[]> {
  const { data, error } = await supabase
    .from('dnd_character_sheets')
    .select('*, profiles(id, display_name, email, avatar_url)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })

  if (error) throw new Error('Não foi possível carregar as fichas da campanha.')
  if (!data || data.length === 0) return []

  return (data as unknown as RawDndSheetWithProfile[]).map((row) => {
    const { profiles, ...sheet } = row
    return { ...sheet, profile: profiles }
  })
}

// ────────────────────────────────────────────────────────
// Escrita
// ────────────────────────────────────────────────────────

/**
 * Atualiza uma ficha D&D 5e pelo id.
 * Registra atividade sheet_updated de forma fire-and-forget.
 */
export async function updateDndSheet(
  sheetId:     string,
  updates:     DndCharacterSheetUpdateInput,
  campaignId:  string,
  charName?:   string | null
): Promise<DndCharacterSheet> {
  const { data, error } = await supabase
    .from('dnd_character_sheets')
    .update(updates)
    .eq('id', sheetId)
    .select('*')
    .single()

  if (error) throw new Error('Não foi possível salvar a ficha.')

  const sheet    = data as DndCharacterSheet
  const name     = charName?.trim() || sheet.character_name?.trim()
  const message  = name ? `Ficha de "${name}" atualizada.` : 'Ficha D&D atualizada.'
  logActivity(campaignId, 'sheet_updated', message)

  return sheet
}

/** Carrega os blocos repetíveis da ficha D&D. */
export async function getDndSheetDetails(sheetId: string): Promise<DndSheetDetails> {
  const [skills, attacks, inventory, spells] = await Promise.all([
    supabase.from('dnd_character_skills').select('*').eq('sheet_id', sheetId),
    supabase.from('dnd_character_attacks').select('*').eq('sheet_id', sheetId).order('sort_order', { ascending: true }),
    supabase.from('dnd_character_inventory').select('*').eq('sheet_id', sheetId).order('sort_order', { ascending: true }),
    supabase.from('dnd_character_spells').select('*').eq('sheet_id', sheetId).order('spell_level', { ascending: true }).order('sort_order', { ascending: true }),
  ])

  const firstError = [skills, attacks, inventory, spells].find((result) => result.error)?.error
  if (firstError) {
    console.error('Erro ao carregar detalhes da ficha D&D:', firstError)
    throw new Error('Não foi possível carregar os detalhes da ficha D&D.')
  }

  return {
    skills: (skills.data ?? []) as DndCharacterSkill[],
    attacks: (attacks.data ?? []) as DndCharacterAttack[],
    inventory: (inventory.data ?? []) as DndCharacterInventoryItem[],
    spells: (spells.data ?? []) as DndCharacterSpell[],
  }
}

/** Salva todas as proficiências exibidas na grade de perícias. */
export async function upsertDndSkill(
  sheetId: string,
  skillKey: string,
  proficient: boolean,
  expertise: boolean,
): Promise<DndCharacterSkill> {
  const { data, error } = await supabase
    .from('dnd_character_skills')
    .upsert({ sheet_id: sheetId, skill_key: skillKey, proficient, expertise }, { onConflict: 'sheet_id,skill_key' })
    .select('*')
    .single()
  if (error) throw new Error('Não foi possível salvar a perícia.')
  return data as DndCharacterSkill
}

export async function createDndAttack(sheetId: string, input: DndCharacterAttackInput): Promise<DndCharacterAttack> {
  const { data, error } = await supabase.from('dnd_character_attacks').insert({ sheet_id: sheetId, ...input }).select('*').single()
  if (error) throw new Error('Não foi possível adicionar o ataque.')
  return data as DndCharacterAttack
}

export async function updateDndAttack(id: string, input: Partial<DndCharacterAttackInput>): Promise<DndCharacterAttack> {
  const { data, error } = await supabase.from('dnd_character_attacks').update(input).eq('id', id).select('*').single()
  if (error) throw new Error('Não foi possível atualizar o ataque.')
  return data as DndCharacterAttack
}

export async function deleteDndAttack(id: string): Promise<void> {
  const { error } = await supabase.from('dnd_character_attacks').delete().eq('id', id)
  if (error) throw new Error('Não foi possível remover o ataque.')
}

export async function createDndInventoryItem(sheetId: string, input: DndCharacterInventoryInput): Promise<DndCharacterInventoryItem> {
  const { data, error } = await supabase.from('dnd_character_inventory').insert({ sheet_id: sheetId, ...input }).select('*').single()
  if (error) throw new Error('Não foi possível adicionar o item.')
  return data as DndCharacterInventoryItem
}

export async function updateDndInventoryItem(id: string, input: Partial<DndCharacterInventoryInput>): Promise<DndCharacterInventoryItem> {
  const { data, error } = await supabase.from('dnd_character_inventory').update(input).eq('id', id).select('*').single()
  if (error) throw new Error('Não foi possível atualizar o item.')
  return data as DndCharacterInventoryItem
}

export async function deleteDndInventoryItem(id: string): Promise<void> {
  const { error } = await supabase.from('dnd_character_inventory').delete().eq('id', id)
  if (error) throw new Error('Não foi possível remover o item.')
}

export async function createDndSpell(sheetId: string, input: DndCharacterSpellInput): Promise<DndCharacterSpell> {
  const { data, error } = await supabase.from('dnd_character_spells').insert({ sheet_id: sheetId, ...input }).select('*').single()
  if (error) throw new Error('Não foi possível adicionar a magia.')
  return data as DndCharacterSpell
}

export async function updateDndSpell(id: string, input: Partial<DndCharacterSpellInput>): Promise<DndCharacterSpell> {
  const { data, error } = await supabase.from('dnd_character_spells').update(input).eq('id', id).select('*').single()
  if (error) throw new Error('Não foi possível atualizar a magia.')
  return data as DndCharacterSpell
}

export async function deleteDndSpell(id: string): Promise<void> {
  const { error } = await supabase.from('dnd_character_spells').delete().eq('id', id)
  if (error) throw new Error('Não foi possível remover a magia.')
}
