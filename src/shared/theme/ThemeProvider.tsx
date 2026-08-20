import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

// ────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'campaign-lab-theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

// ────────────────────────────────────────────────────────
// Contexto
// ────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

// ────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' ? 'light' : 'dark'
  })

  const [accountReady, setAccountReady] = useState(false)

  // Quando não há preferência local, recupera a preferência sincronizada
  // no perfil. O localStorage continua sendo usado para evitar flash visual.
  useEffect(() => {
    let active = true
    const hasLocalPreference = Boolean(localStorage.getItem(STORAGE_KEY))

    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && !hasLocalPreference) {
        const { data } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', session.user.id)
          .maybeSingle()
        if (active && (data?.theme_preference === 'light' || data?.theme_preference === 'dark')) {
          setTheme(data.theme_preference)
        }
      }
      if (active) setAccountReady(true)
    })()

    return () => { active = false }
  }, [])

  // Aplica o atributo no <html> e persiste
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (!accountReady) return
    localStorage.setItem(STORAGE_KEY, theme)

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase
        .from('profiles')
        .update({ theme_preference: theme })
        .eq('id', user.id)
    })()
  }, [theme, accountReady])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// ────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
