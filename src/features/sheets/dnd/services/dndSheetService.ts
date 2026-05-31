// ────────────────────────────────────────────────────────
// Serviço — Ficha D&D 5e
// ────────────────────────────────────────────────────────

import { supabase }    from '../../../../shared/lib/supabase'
import { logActivity } from '../../../activity/services/activityService'
import type {
  DndCharacterSheet,
  DndCharacterSheetUpdateInput,
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
