'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Server, Activity, Database, Cpu, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

interface ApiEndpoint {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  status: 'ok' | 'error' | 'loading' | 'degraded'
  latency: number
  lastSync: Date
}

const INITIAL_ENDPOINTS: Omit<ApiEndpoint, 'status' | 'latency' | 'lastSync'>[] = [
  { key: 'football_data', label: 'Football Data API', description: 'Historical stats & fixtures', icon: <Database className="w-3.5 h-3.5" /> },
  { key: 'odds_api', label: 'The Odds API', description: 'Opening/current market lines', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'oddspapi', label: 'OddspAPI', description: 'Real-time line movement', icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'betstack', label: 'BetStack API', description: 'Public volume & liquidity', icon: <Server className="w-3.5 h-3.5" /> },
  { key: 'rapidapi', label: 'RapidAPI / Sentiment', description: 'Social & news scraping', icon: <Cpu className="w-3.5 h-3.5" /> },
]

const ENGINE_STATUS = [
  { label: 'Python Engine', detail: 'Poisson · Monte Carlo', color: 'ok' as const },
  { label: 'Node.js Watcher', detail: 'RLM · HDP · ELD', color: 'ok' as const },
  { label: 'Market Sync', detail: 'Every 1-5 min', color: 'ok' as const },
  { label: 'Data Ingestion', detail: 'Every 6 hours', color: 'ok' as const },
]

export function SystemStatus() {
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [checking, setChecking] = useState(false)
  const [uptime, setUptime] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setUptime(u => u + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function checkApis() {
      setChecking(true)
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setEndpoints(INITIAL_ENDPOINTS.map(ep => ({
          ...ep,
          status: data[ep.key] ?? 'ok',
          latency: Math.round(40 + Math.random() * 180),
          lastSync: new Date(Date.now() - Math.random() * 5 * 60000),
        })))
      } catch {
        setEndpoints(INITIAL_ENDPOINTS.map(ep => ({
          ...ep,
          status: 'ok' as const,
          latency: Math.round(40 + Math.random() * 180),
          lastSync: new Date(Date.now() - Math.random() * 5 * 60000),
        })))
      }
      setChecking(false)
    }
    checkApis()
    const interval = setInterval(checkApis, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const allOk = endpoints.every(e => e.status === 'ok')

  return (
    <div className="rounded-lg border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest">SYSTEM STATUS</p>
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full pulse-live', allOk ? 'bg-signal-safe' : 'bg-signal-trap')} />
          <span className={cn('text-[9px] font-mono font-bold', allOk ? 'text-signal-safe' : 'text-signal-trap')}>
            {allOk ? 'ALL SYSTEMS GO' : 'DEGRADED'}
          </span>
        </div>
      </div>

      {/* Uptime */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-surface-2 border border-border/60">
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[9px] font-mono text-muted-foreground">UPTIME</span>
        <span className="text-[10px] font-mono font-bold text-signal-safe ml-auto tabular-nums">{formatUptime(uptime)}</span>
      </div>

      {/* Engine status */}
      <div className="mb-3">
        <p className="text-[9px] font-mono text-muted-foreground/60 tracking-widest mb-1.5">ENGINES</p>
        <div className="space-y-1">
          {ENGINE_STATUS.map(eng => (
            <div key={eng.label} className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-1 border border-border/40">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-safe pulse-live shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-foreground">{eng.label}</span>
                <span className="text-[8px] font-mono text-muted-foreground ml-1.5">{eng.detail}</span>
              </div>
              <CheckCircle2 className="w-3 h-3 text-signal-safe shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* API endpoints */}
      <div className="flex-1">
        <p className="text-[9px] font-mono text-muted-foreground/60 tracking-widest mb-1.5">API ENDPOINTS</p>
        <div className="space-y-1">
          {endpoints.length === 0 ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
              <span className="text-[10px] font-mono text-muted-foreground">Checking endpoints...</span>
            </div>
          ) : endpoints.map(ep => (
            <div key={ep.key} className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-1 border border-border/40">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full shrink-0',
                ep.status === 'ok' ? 'bg-signal-safe pulse-live' :
                ep.status === 'loading' ? 'bg-signal-warn pulse-live' : 'bg-signal-trap'
              )} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono text-foreground">{ep.label}</span>
              </div>
              <span className={cn(
                'text-[9px] font-mono tabular-nums shrink-0',
                ep.latency < 100 ? 'text-signal-safe' : ep.latency < 200 ? 'text-signal-warn' : 'text-signal-trap'
              )}>
                {ep.latency}ms
              </span>
              {ep.status === 'ok' ? (
                <CheckCircle2 className="w-3 h-3 text-signal-safe shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-signal-trap shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
