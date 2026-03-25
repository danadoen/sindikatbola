'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { type Locale, detectLocaleFromIP } from './i18n'
import { t as translate } from './i18n'

interface AppContextValue {
  // Sidebar
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Locale
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [locale, setLocaleState] = useState<Locale>('en')

  // On mount: restore from localStorage + detect locale from IP
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('sb-theme') as 'dark' | 'light' | null
      const savedLocale = localStorage.getItem('sb-locale') as Locale | null
      const savedSidebar = localStorage.getItem('sb-sidebar')

      if (savedTheme) setTheme(savedTheme)
      if (savedSidebar !== null) setSidebarOpen(savedSidebar === 'true')

      if (savedLocale) {
        setLocaleState(savedLocale)
      } else {
        // Detect from IP only if no saved preference
        detectLocaleFromIP()
          .then(detected => {
            setLocaleState(detected)
            try { localStorage.setItem('sb-locale', detected) } catch {}
          })
          .catch(() => {})
      }
    } catch {}
  }, [])

  // Sync theme class on <html>
  useEffect(() => {
    try {
      const html = document.documentElement
      html.classList.remove('dark', 'light')
      html.classList.add(theme)
      localStorage.setItem('sb-theme', theme)
    } catch {}
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('sb-locale', l)
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      try { localStorage.setItem('sb-sidebar', String(!prev)) } catch {}
      return !prev
    })
  }, [])

  const tFn = useCallback(
    (key: string) => translate(locale, key),
    [locale]
  )

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        theme,
        toggleTheme,
        locale,
        setLocale,
        t: tFn,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

const DEFAULT_CTX: AppContextValue = {
  sidebarOpen: true,
  toggleSidebar: () => {},
  setSidebarOpen: () => {},
  theme: 'dark',
  toggleTheme: () => {},
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
}

export function useApp() {
  return useContext(AppContext) ?? DEFAULT_CTX
}
