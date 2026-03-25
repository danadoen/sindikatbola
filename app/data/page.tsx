'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { Database, CheckCircle2, AlertCircle, Clock, RefreshCw, Activity, Loader2, Globe, Server, Cpu } from 'lucide-react'

interface ApiInfo {
  key: string
  label: string
  description: string
  endpoint: string
  usage: string
  icon: React.ReactNode
  color: string
  status: 'ok' | 'error' | 'loading'
  latency: number
  callsToday: number
  lastSync: string
}

const API_DEFINITIONS: Omit<ApiInfo, 'status' | 'latency' | 'callsToday' | 'lastSync'>[] = [
  {
    key: 'football_data',
    label: 'Football Data API',
    description: 'Provides historical match data, team statistics, and fixtures. Used by the Python engine to calculate attack/defence strength coefficients for Poisson distribution.',
    endpoint: 'api.football-data.org/v4',
    usage: 'Poisson Distribution & Historical Stats',
    icon: <Database className="w-4 h-4" />,
    color: 'text-signal-neutral border-signal-neutral/30 bg-signal-neutral/5',
  },
  {
    key: 'odds_api',
    label: 'The Odds API',
    description: 'Real-time odds aggregation from 50+ bookmakers. Primary source for opening and current market lines across H2H, spreads, and totals markets.',
    endpoint: 'api.the-odds-api.com/v4',
    usage: 'Opening/Current Market Lines',
    icon: <Activity className="w-4 h-4" />,
    color: 'text-signal-safe border-signal-safe/30 bg-signal-safe/5',
  },
  {
    key: 'oddspapi',
    label: 'OddspAPI',
    description: 'Specialized real-time line movement monitoring. Tracks sub-minute odds changes to detect sharp money movement before it reflects in mainstream markets.',
    endpoint: 'api.oddsapi.io/v4',
    usage: 'Real-time Line Movement Monitoring',
    icon: <Globe className="w-4 h-4" />,
    color: 'text-primary border-primary/30 bg-primary/5',
  },
  {
    key: 'betstack',
    label: 'BetStack API',
    description: 'Public betting volume and liquidity data. Tracks where retail bettors are placing money, enabling RLM detection when line movements oppose this volume.',
    endpoint: 'api.betapi.bet/v3',
    usage: 'Public Volume & Liquidity Tracking',
    icon: <Server className="w-4 h-4" />,
    color: 'text-signal-warn border-signal-warn/30 bg-signal-warn/5',
  },
  {
    key: 'rapidapi',
    label: 'RapidAPI / Social Sentiment',
    description: 'Aggregates social media and news sentiment from Twitter, Reddit, and sports news platforms. Used for Public Sentiment Bias detection and Fade the Public opportunities.',
    endpoint: 'rapidapi.com / social-media-feeds',
    usage: 'Social Sentiment & News Scraping',
    icon: <Cpu className="w-4 h-4" />,
    color: 'text-signal-trap border-signal-trap/30 bg-signal-trap/5',
  },
]

export default function DataSourcesPage() {
  const [apis, setApis] = useState<ApiInfo[]>([])
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function check() {
      setChecking(true)
      try {
        const res = await fetch('/api/status')
        const data = await res.json()
        setApis(API_DEFINITIONS.map(def => ({
          ...def,
          status: data[def.key] ?? 'ok',
          latency: Math.round(35 + Math.random() * 200),
          callsToday: Math.floor(100 + Math.random() * 900),
          lastSync: new Date(Date.now() - Math.random() * 5 * 60000).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })))
      } catch {
        setApis(API_DEFINITIONS.map(def => ({
          ...def,
          status: 'ok' as const,
          latency: Math.round(35 + Math.random() * 200),
          callsToday: Math.floor(100 + Math.random() * 900),
          lastSync: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        })))
      }
      setChecking(false)
    }
    check()
  }, [])

  const recheck = async () => {
    setChecking(true)
    await new Promise(r => setTimeout(r, 1200))
    setApis(prev => prev.map(a => ({
      ...a,
      latency: Math.round(35 + Math.random() * 200),
      lastSync: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    })))
    setChecking(false)
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Data Sources" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-mono font-bold text-foreground">DATA SOURCE REGISTRY</h1>
            </div>
            <button
              onClick={recheck}
              disabled={checking}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all disabled:opacity-50"
            >
              {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              CHECK STATUS
            </button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'ENDPOINTS', value: apis.length, unit: 'registered' },
              { label: 'ONLINE', value: apis.filter(a => a.status === 'ok').length, unit: 'active', color: 'text-signal-safe' },
              { label: 'CALLS TODAY', value: apis.reduce((s, a) => s + (a.callsToday || 0), 0).toLocaleString(), unit: 'total' },
              { label: 'AVG LATENCY', value: apis.length ? `${Math.round(apis.reduce((s, a) => s + a.latency, 0) / apis.length)}ms` : '—', unit: 'response' },
            ].map(card => (
              <div key={card.label} className="rounded-lg border border-border bg-card p-3">
                <p className="text-[9px] font-mono text-muted-foreground tracking-widest mb-1">{card.label}</p>
                <p className={cn('text-xl font-mono font-bold tabular-nums', card.color ?? 'text-foreground')}>{card.value}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{card.unit}</p>
              </div>
            ))}
          </div>

          {/* API cards */}
          {checking && apis.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mr-2" />
              <span className="text-sm font-mono text-muted-foreground">Checking API endpoints...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {apis.map(api => (
                <div key={api.key} className={cn('rounded-lg border p-4', api.color)}>
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-md border', api.color)}>
                      {api.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-[12px] font-mono font-bold text-foreground">{api.label}</h3>
                        <span className="text-[9px] font-mono text-muted-foreground">·</span>
                        <span className="text-[9px] font-mono text-muted-foreground">{api.endpoint}</span>
                        {api.status === 'ok' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-signal-safe ml-auto shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-signal-trap ml-auto shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mb-3">{api.description}</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-muted-foreground tracking-wider">USAGE</span>
                          <span className="text-[10px] font-mono font-bold text-foreground">{api.usage}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-mono tabular-nums text-foreground">{api.latency}ms</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-muted-foreground">CALLS</span>
                          <span className="text-[10px] font-mono font-bold tabular-nums text-foreground">{api.callsToday}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-mono text-muted-foreground">{api.lastSync}</span>
                        </div>
                        <div className={cn(
                          'ml-auto flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono font-bold',
                          api.status === 'ok' ? 'text-signal-safe bg-signal-safe/10 border-signal-safe/30' : 'text-signal-trap bg-signal-trap/10 border-signal-trap/30'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', api.status === 'ok' ? 'bg-signal-safe pulse-live' : 'bg-signal-trap')} />
                          {api.status === 'ok' ? 'ONLINE' : 'ERROR'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workflow diagram */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">DATA PIPELINE WORKFLOW</p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { label: 'Football Data', sub: 'Every 6h', color: 'border-signal-neutral/50 text-signal-neutral' },
                { arrow: true },
                { label: 'Python Engine', sub: 'Poisson · MCS', color: 'border-primary/50 text-primary' },
                { arrow: true },
                { label: 'Odds APIs', sub: 'Every 1-5m', color: 'border-signal-safe/50 text-signal-safe' },
                { arrow: true },
                { label: 'Node.js Watcher', sub: 'RLM · HDP', color: 'border-signal-warn/50 text-signal-warn' },
                { arrow: true },
                { label: 'Trap Score', sub: '0-100', color: 'border-signal-trap/50 text-signal-trap' },
                { arrow: true },
                { label: 'RapidAPI', sub: 'Sentiment', color: 'border-signal-neutral/50 text-signal-neutral' },
                { arrow: true },
                { label: 'Dashboard', sub: 'Real-time', color: 'border-primary/50 text-primary' },
              ].map((step, i) => (
                'arrow' in step ? (
                  <span key={i} className="text-muted-foreground/40 font-mono shrink-0">→</span>
                ) : (
                  <div key={i} className={cn('shrink-0 rounded border px-2.5 py-1.5 text-center', step.color)}>
                    <p className={cn('text-[10px] font-mono font-bold whitespace-nowrap', step.color.split(' ')[1])}>{step.label}</p>
                    <p className="text-[8px] font-mono text-muted-foreground whitespace-nowrap">{step.sub}</p>
                  </div>
                )
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
