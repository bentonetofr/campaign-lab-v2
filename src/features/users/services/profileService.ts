import { supabase } from '../../../shared/lib/supabase'
import type { Profile } from '../../../shared/types'

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

function validateAvatar(file: File): void {
  if (!AVATAR_TYPES.includes(file.type as (typeof AVATAR_TYPES)[number])) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('O avatar deve ter no máximo 2 MB.')
  }
}

// ────────────────────────────────────────────────────────
// Profile Service
// ────────────────────────────────────────────────────────

/**
 * Retorna o perfil do usuário autenticado, ou null se não existir.
 *
 * Obtém o user.id explicitamente via auth.getUser() e filtra a query
 * com .eq('id', user.id) + maybeSingle() para não depender exclusivamente
 * do RLS e evitar erros falsos quando o perfil existe mas a sessão
 * não passou o filtro implícito do .single().
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error('Não foi possível carregar o perfil.')
  return data as Profile | null
}

/**
 * Atualiza o nome público do usuário autenticado.
 * Envia apenas display_name — nunca e-mail, id ou outros campos.
 */
export async function updateCurrentProfile(
  data: { display_name: string }
): Promise<Profile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  const displayName = data.display_name.trim()
  if (!displayName) throw new Error('O nome não pode ser vazio.')
  if (displayName.length > 80) throw new Error('O nome deve ter no máximo 80 caracteres.')

  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) throw new Error('Não foi possível atualizar o perfil.')

  // Mantém os componentes que usam a sessão do Auth (sidebar e saudação)
  // sincronizados imediatamente com o perfil persistido.
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  })
  if (authUpdateError) console.warn('Perfil salvo, mas o nome da sessão não foi sincronizado.', authUpdateError)

  return updated as Profile
}

/** Atualiza a senha da conta autenticada. */
export async function updateCurrentPassword(password: string): Promise<void> {
  if (password.length < 8) throw new Error('A nova senha deve ter pelo menos 8 caracteres.')
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new Error('Não foi possível atualizar a senha.')
}

/** Faz upload do avatar no caminho protegido do próprio usuário. */
export async function uploadCurrentAvatar(file: File): Promise<Profile> {
  validateAvatar(file)
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  const path = `${user.id}/avatar`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
      contentType: file.type,
    })

  if (uploadError) {
    console.error('Erro do Storage ao enviar avatar:', uploadError)
    throw new Error(`Não foi possível enviar o avatar: ${uploadError.message}`)
  }

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`
  const updated = await updateProfileFields({ avatar_url: avatarUrl })
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  })
  if (authUpdateError) console.warn('Avatar salvo, mas a sessão não foi sincronizada.', authUpdateError)
  return updated
}

/** Remove o avatar armazenado e limpa a URL pública do perfil. */
export async function removeCurrentAvatar(): Promise<Profile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  const { error: removeError } = await supabase.storage
    .from('avatars')
    .remove([`${user.id}/avatar`])
  if (removeError) {
    console.error('Erro do Storage ao remover avatar:', removeError)
    throw new Error(`Não foi possível remover o avatar: ${removeError.message}`)
  }

  const updated = await updateProfileFields({ avatar_url: null })
  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  })
  if (authUpdateError) console.warn('Avatar removido, mas a sessão não foi sincronizada.', authUpdateError)
  return updated
}

async function updateProfileFields(fields: { avatar_url: string | null; theme_preference?: 'dark' | 'light' }): Promise<Profile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  const { data, error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id)
    .select('*')
    .single()

  if (error) throw new Error('Não foi possível atualizar o perfil.')
  return data as Profile
}

/**
 * Garante que o usuário autenticado possui um registro em public.profiles.
 *
 * Fluxo:
 *  1. Obtém user via auth.getUser()
 *  2. Busca perfil por id = user.id com maybeSingle()
 *  3. Se existir, retorna imediatamente
 *  4. Se não existir, cria o perfil
 *  5. Busca novamente após o insert (evita depender do retorno do INSERT,
 *     que pode ser afetado por policies de SELECT pós-insert)
 *
 * Lida com race condition (23505 = duplicate key) buscando novamente
 * em vez de lançar erro.
 */
export async function ensureProfile(): Promise<Profile> {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('Usuário não autenticado.')

  // 1. Tenta buscar o perfil existente
  const { data: existing, error: selectError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (selectError) {
    console.error('Erro ao buscar perfil:', selectError)
    throw new Error('Não foi possível verificar o perfil.')
  }

  if (existing) return existing as Profile

  // 2. Perfil não existe — cria com os dados do auth
  const meta = user.user_metadata ?? {}
  const displayName =
    (meta['display_name'] as string | undefined)?.trim() ||
    (meta['full_name']    as string | undefined)?.trim() ||
    (meta['name']         as string | undefined)?.trim() ||
    user.email!.split('@')[0]

  const { error: insertError } = await supabase
    .from('profiles')
    .insert({
      id:            user.id,
      email:         user.email!,
      display_name:  displayName,
      avatar_url:    (meta['avatar_url'] as string | undefined) ?? null,
      main_provider: (user.app_metadata?.provider as string | undefined) ?? 'email',
    })

  // 23505 = conflito de chave primária: outro processo criou o perfil
  // entre o SELECT e o INSERT — tenta buscar novamente
  if (insertError && insertError.code !== '23505') {
    console.error('Erro ao criar perfil:', insertError)
    throw new Error('Não foi possível sincronizar o perfil. Tente novamente.')
  }

  // 3. Busca o perfil após insert (tanto para insert bem-sucedido quanto para race condition)
  const { data: created, error: refetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (refetchError || !created) {
    console.error('Erro ao buscar perfil após criação:', refetchError)
    throw new Error('Não foi possível carregar o perfil após sincronização.')
  }

  return created as Profile
}
