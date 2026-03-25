'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { cn } from '@/lib/utils'
import { Settings, Key, Bell, RefreshCw, Shield, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

const API_KEYS = [
  { key: 'FOOTBALL_DATA_KEY', label: 'Football Data API', description: 'Historical stats & fixtures (Poisson input)', value: '1f9bdaa5ab814f6f813c78c396b37ae9' },
  { key: 'ODDS_API_KEY', label: 'The Odds API', description: 'Opening/current market lines', value: 'a1cfd1f640a66c683e9df03209a8e286' },
  { key: 'ODDSPAPI_KEY', label: 'OddspAPI', description: 'Real-time line movement monitoring', value: 'f851b94d-8851-4ff3-a5f6-679e6a525110' },
  { key: 'BETSTACK_API_KEY', label: 'BetStack API', description: 'Public volume & liquidity tracking', value: '24e459fda1d06b1b365fa84ef82e052a99ef94251a44d3057316d4859ab6c7e4' },
  { key: 'RAPIDAPI_KEY', label: 'RapidAPI', description: 'Social sentiment & news scraping', value: '4666a7fa0cmsh945954136dfc854p137b5djsn5927d5725e3f' },
]

const SYNC_INTERVALS = [
  { label: 'Market Sync', description: 'How often to pull new odds from all providers', value: '2', unit: 'minutes', min: 1, max: 10 },
  { label: 'Data Ingestion', description: 'Python engine re-calculates attack/defence strengths', value: '360', unit: 'minutes', min: 60, max: 720 },
  { label: 'Sentiment Refresh', description: 'RapidAPI sentiment & news scrape interval', value: '15', unit: 'minutes', min: 5, max: 60 },
]

const TRAP_THRESHOLDS = [
  { label: 'Critical Trap Threshold', description: 'Minimum score to flag as ANTITESIS (Trap Confirmed)', value: 75 },
  { label: 'High Alert Threshold', description: 'Minimum score to flag as MONITOR', value: 50 },
  { label: 'Clean Market Threshold', description: 'Maximum score to flag as PRO-STATS', value: 25 },
]

export default function SettingsPage() {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)

  const toggleReveal = (key: string) => {
    setRevealed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const maskKey = (val: string) => val.slice(0, 6) + '•'.repeat(Math.max(0, val.length - 10)) + val.slice(-4)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Settings" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <h1 className="text-sm font-mono font-bold text-foreground">SYSTEM CONFIGURATION</h1>
            </div>
            <button
              onClick={handleSave}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md border text-[11px] font-mono font-bold transition-all',
                saved
                  ? 'border-signal-safe/50 bg-signal-safe/10 text-signal-safe'
                  : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/20'
              )}
            >
              {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
              {saved ? 'SAVED' : 'SAVE CONFIG'}
            </button>
          </div>

          {/* API Keys */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Key className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">API KEY REGISTRY</p>
            </div>
            <div className="divide-y divide-border/60">
              {API_KEYS.map(api => (
                <div key={api.key} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono font-bold text-foreground">{api.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{api.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-2 border border-border/60 font-mono text-[10px] text-foreground/80 min-w-52 max-w-64">
                      {revealed[api.key] ? api.value : maskKey(api.value)}
                    </div>
                    <button
                      onClick={() => toggleReveal(api.key)}
                      className="p-1.5 rounded border border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                    >
                      {revealed[api.key]
                        ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                        : <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                    </button>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-signal-safe/30 bg-signal-safe/10">
                      <span className="w-1.5 h-1.5 rounded-full bg-signal-safe pulse-live" />
                      <span className="text-[9px] font-mono text-signal-safe font-bold">ACTIVE</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync intervals */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">SYNC INTERVALS</p>
            </div>
            <div className="divide-y divide-border/60">
              {SYNC_INTERVALS.map(interval => (
                <div key={interval.label} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono font-bold text-foreground">{interval.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{interval.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold tabular-nums text-primary">{interval.value}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{interval.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trap thresholds */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">TRAP SCORE THRESHOLDS</p>
            </div>
            <div className="divide-y divide-border/60">
              {TRAP_THRESHOLDS.map((t, i) => {
                const color = i === 0 ? 'text-signal-trap' : i === 1 ? 'text-signal-warn' : 'text-signal-safe'
                const barColor = i === 0 ? 'bg-signal-trap' : i === 1 ? 'bg-signal-warn' : 'bg-signal-safe'
                return (
                  <div key={t.label} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono font-bold text-foreground">{t.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-3 w-48">
                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
                        <div className={cn('h-full rounded-full', barColor)} style={{ width: `${t.value}%` }} />
                      </div>
                      <span className={cn('text-lg font-mono font-bold tabular-nums w-8 text-right', color)}>{t.value}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Bell className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">ALERT NOTIFICATIONS</p>
            </div>
            <div className="divide-y divide-border/60">
              {[
                { label: 'Critical Trap Alert', desc: 'Notify when Trap Score exceeds critical threshold', enabled: true },
                { label: 'RLM Detection', desc: 'Alert on Reverse Line Movement events', enabled: true },
                { label: 'Smart Money Signal', desc: 'Notify on detected institutional money movement', enabled: true },
                { label: 'HDP Line Shift', desc: 'Alert when handicap line moves significantly', enabled: false },
                { label: 'Sentiment Spike', desc: 'Notify when public sentiment index exceeds 80', enabled: false },
              ].map(notif => (
                <div key={notif.label} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-mono font-bold text-foreground">{notif.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{notif.desc}</p>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-mono font-bold',
                    notif.enabled
                      ? 'border-signal-safe/30 bg-signal-safe/10 text-signal-safe'
                      : 'border-border bg-surface-2 text-muted-foreground'
                  )}>
                    {notif.enabled && <span className="w-1.5 h-1.5 rounded-full bg-signal-safe pulse-live" />}
                    {notif.enabled ? 'ON' : 'OFF'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Version info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">SYSTEM INFO</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'VERSION', value: 'v1.0.0' },
                { label: 'ENGINE', value: 'Python 3.11 + Node 20' },
                { label: 'DATABASE', value: 'Supabase (PostgreSQL)' },
                { label: 'CACHE', value: 'Redis' },
              ].map(info => (
                <div key={info.label} className="px-3 py-2 rounded-md bg-surface-2 border border-border/60">
                  <p className="text-[9px] font-mono text-muted-foreground tracking-wider">{info.label}</p>
                  <p className="text-[11px] font-mono font-bold text-foreground mt-0.5">{info.value}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
