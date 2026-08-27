import { createContext, useContext, useState, ReactNode } from 'react'

// ────────────────────────────────────────────────────────
// Contexto leve: qual campanha tem o chat aberto agora, se alguma.
// Usado só pra suprimir o pop-up global de mensagem quando o usuário já
// está vendo aquela conversa ao vivo — não guarda mensagens nem nada além
// disso.
// ────────────────────────────────────────────────────────

interface ActiveChatContextValue {
  activeChatCampaignId: string | null
  setActiveChatCampaignId: (campaignId: string | null) => void
}

const ActiveChatContext = createContext<ActiveChatContextValue | null>(null)

interface ActiveChatProviderProps {
  children: ReactNode
}

export function ActiveChatProvider({ children }: ActiveChatProviderProps) {
  const [activeChatCampaignId, setActiveChatCampaignId] = useState<string | null>(null)

  return (
    <ActiveChatContext.Provider value={{ activeChatCampaignId, setActiveChatCampaignId }}>
      {children}
    </ActiveChatContext.Provider>
  )
}

export function useActiveChat(): ActiveChatContextValue {
  const context = useContext(ActiveChatContext)
  if (!context) {
    throw new Error('useActiveChat deve ser usado dentro de um <ActiveChatProvider>')
  }
  return context
}
