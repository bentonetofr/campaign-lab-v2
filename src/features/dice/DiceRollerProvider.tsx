import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useParams } from 'react-router-dom'

// ────────────────────────────────────────────────────────
// Contexto do botão flutuante de rolagem de dados.
//
// Fica disponível em toda a área logada (montado no
// PrivateLayout), mas só abre dentro de uma campanha — a
// rolagem pertence semanticamente a uma campanha específica
// (dice_rolls.campaign_id é obrigatório no banco).
// ────────────────────────────────────────────────────────

interface DiceRollerContextValue {
  /** Campanha ativa, lida da própria rota. Null fora do contexto de campanha. */
  campaignId: string | null
  isOpen: boolean
  open: () => void
  close: () => void
}

const DiceRollerContext = createContext<DiceRollerContextValue | null>(null)

interface DiceRollerProviderProps {
  children: ReactNode
}

export function DiceRollerProvider({ children }: DiceRollerProviderProps) {
  const { campaignId } = useParams<{ campaignId?: string }>()
  const [isOpen, setIsOpen] = useState(false)

  // Sair do contexto de campanha fecha o popover, para não ficar
  // "aberto" sobre o botão travado ao navegar para outra área.
  useEffect(() => {
    if (!campaignId) setIsOpen(false)
  }, [campaignId])

  const value: DiceRollerContextValue = {
    campaignId: campaignId ?? null,
    isOpen,
    open:  () => setIsOpen(true),
    close: () => setIsOpen(false),
  }

  return <DiceRollerContext.Provider value={value}>{children}</DiceRollerContext.Provider>
}

export function useDiceRoller(): DiceRollerContextValue {
  const context = useContext(DiceRollerContext)
  if (!context) {
    throw new Error('useDiceRoller deve ser usado dentro de um <DiceRollerProvider>')
  }
  return context
}
