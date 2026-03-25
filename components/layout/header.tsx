'use client'

import { useState, useEffect } from 'react'
import { Bell, Menu, Moon, RefreshCw, Sun, Wifi, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/app-context'

interface StatusDot {
  key: string
  label: string
}

const API_KEYS: StatusDot[] = [
  { key: 'football_data', label: 'FDATA' },
  { key: 'odds_api', label: 'ODDS' },
  { key: 'betstack', label: 'BETS' },
  { key: 'oddspapi', label: 'OPAPI' },
  { key: 'rapidapi', label: 'RAPID' },
]

export function Header({ title = 'Dashboard' }: { title?: string }) {
  const { toggleSidebar, theme, toggleTheme, t } = useApp()
  const [time, setTime] = useState('')
  const [apiStatus, setApiStatus] = useState<Record<string, string>>({})
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      )
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setApiStatus(data)
      } catch {
        const fallback: Record<string, string> = {}
        API_KEYS.forEach(k => { fallback[k.key] = 'ok' })
        setApiStatus(fallback)
      }
    }
    checkStatus()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    await new Promise(r => setTimeout(r, 1200))
    setSyncing(false)
  }

  const allOk = Object.values(apiStatus).every(v => v === 'ok')

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b border-border bg-surface-1 shrink-0 gap-3">
      {/* Left: burger + breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground tracking-widest hidden sm:block">
          SINDIKAT BOLA
        </span>
        <span className="text-muted-foreground/40 text-xs hidden sm:block">/</span>
        <span className="text-[11px] font-mono text-foreground tracking-wider truncate">
          {title.toUpperCase()}
        </span>
      </div>

      {/* Center: API status pills */}
      <div className="hidden xl:flex items-center gap-1.5">
        {API_KEYS.map((api) => {
          const status = apiStatus[api.key]
          const ok = status === 'ok'
          return (
            <div
              key={api.key}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider border',
                ok
                  ? 'text-signal-safe border-signal-safe/30 bg-signal-safe/5'
                  : status === undefined
                  ? 'text-muted-foreground border-border bg-transparent'
                  : 'text-signal-trap border-signal-trap/30 bg-signal-trap/5'
              )}
            >
              <span
                className={cn(
                  'w-1 h-1 rounded-full',
                  ok ? 'bg-signal-safe pulse-live' : status ? 'bg-signal-trap' : 'bg-muted-foreground'
                )}
              />
              {api.label}
            </div>
          )
        })}
      </div>

      {/* Right: clock + actions */}
      <div className="flex items-center gap-2 shrink-0">
        {allOk ? (
          <Wifi className="w-3.5 h-3.5 text-signal-safe" />
        ) : (
          <WifiOff className="w-3.5 h-3.5 text-signal-trap" />
        )}
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums hidden sm:block">
          {time}
        </span>

        {/* Theme toggle in header too */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t('theme_dark') : t('theme_light')}
          className="flex items-center justify-center w-7 h-7 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
        >
          {theme === 'dark'
            ? <Moon className="w-3.5 h-3.5" />
            : <Sun className="w-3.5 h-3.5" />
          }
        </button>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', syncing && 'animate-spin')} />
          <span className="hidden sm:block">{t('header_sync')}</span>
        </button>

        <button className="relative flex items-center justify-center w-7 h-7 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
          <Bell className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-signal-trap text-[8px] flex items-center justify-center text-white font-bold">
            3
          </span>
        </button>
      </div>
    </header>
  )
}
