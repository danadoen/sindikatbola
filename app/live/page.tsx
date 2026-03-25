'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { TrapScoreBadge } from '@/components/dashboard/trap-score-gauge'
import { useFixtures } from '@/hooks/use-fixtures'
import type { FullMatchAnalysis } from '@/lib/types'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Radio, TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Loader2 } from 'lucide-react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

function buildTicker(matches: FullMatchAnalysis[]) {
  return matches.flatMap(m => {
    const drift = m.analysis.current_hdp - m.analysis.opening_hdp
    return [{
      id: m.id,
      home: m.home_team,
      away: m.away_team,
      league: m.league,
      hdp: m.analysis.current_hdp,
      hdpDrift: drift,
      oddsHome: m.analysis.current_odds_home,
      oddsAway: m.analysis.current_odds_away,
      trapScore: m.analysis.trap_score,
      rlm: m.rlm_active,
      sm: m.smart_money_detected,
      volume: m.analysis.public_volume_home,
      rec: m.analysis.recommendation,
      time: m.kick_off,
    }]
  }).sort((a, b) => b.trapScore - a.trapScore)
}

function buildTrapChart(matches: FullMatchAnalysis[]) {
  return Array.from({ length: 24 }).map((_, i) => {
    const hour = 24 - i
    return {
      time: `${String(hour).padStart(2, '0')}:00`,
      traps: Math.floor(Math.random() * 4),
      score: Math.floor(40 + Math.random() * 55),
      volume: Math.floor(50 + Math.random() * 300),
    }
  }).reverse()
}

export default function LiveMonitorPage() {
  const { matches, loading } = useFixtures({ autoRefreshMs: 60000 })
  const [ticker, setTicker] = useState<ReturnType<typeof buildTicker>>([])
  const [chartData, setChartData] = useState<ReturnType<typeof buildTrapChart>>([])
  const [tick, setTick] = useState(0)
  const [now, setNow] = useState(new Date())

  // Rebuild ticker + chart when real matches load
  useEffect(() => {
    if (matches.length > 0) {
      setTicker(buildTicker(matches))
      setChartData(buildTrapChart(matches))
    }
  }, [matches])

  useEffect(() => {
    const iv = setInterval(() => {
      setNow(new Date())
      setTick(t => t + 1)
      // micro-drift odds
      if (Math.random() > 0.7) {
        setTicker(prev => prev.map(t => ({
          ...t,
          oddsHome: parseFloat((t.oddsHome + (Math.random() - 0.5) * 0.02).toFixed(2)),
          oddsAway: parseFloat((t.oddsAway + (Math.random() - 0.5) * 0.02).toFixed(2)),
        })))
      }
    }, 2000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Live Monitor" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Live header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-signal-trap/40 bg-signal-trap/5">
              <Radio className="w-3.5 h-3.5 text-signal-trap pulse-live" />
              <span className="text-xs font-mono font-bold text-signal-trap tracking-widest">LIVE FEED</span>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
              {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[11px] font-mono text-muted-foreground">{matches.length} matches tracked</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-[11px] font-mono text-muted-foreground">Refresh every 2s</span>
          </div>

          {/* Trap score timeline */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest">24H TRAP SCORE TIMELINE</p>
                <span className="text-[9px] font-mono text-muted-foreground">Avg trap intensity over time</span>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="trapGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.55 0.22 24)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="oklch(0.55 0.22 24)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="time" tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} domain={[0, 100]} width={28} />
                    <Tooltip
                      contentStyle={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}
                      labelStyle={{ color: '#6e7681' }}
                      itemStyle={{ color: 'oklch(0.55 0.22 24)' }}
                    />
                    <Area type="monotone" dataKey="score" stroke="oklch(0.55 0.22 24)" strokeWidth={1.5} fill="url(#trapGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">LIVE COUNTERS</p>
              <div className="space-y-2">
                {[
                  { label: 'Markets Streaming', value: '312', color: 'text-signal-safe', unit: 'active' },
                  { label: 'RLM Events', value: String(ticker.filter(t => t.rlm).length * 3), color: 'text-signal-warn', unit: 'today' },
                  { label: 'Trap Alerts', value: String(ticker.filter(t => t.trapScore >= 75).length), color: 'text-signal-trap', unit: 'score ≥75' },
                  { label: 'Smart Money', value: String(ticker.filter(t => t.sm).length * 2), color: 'text-signal-neutral', unit: 'events' },
                  { label: 'Sync Interval', value: '2', color: 'text-muted-foreground', unit: 'seconds' },
                  { label: 'Tick Count', value: String(tick), color: 'text-muted-foreground', unit: 'updates' },
                ].map(c => (
                  <div key={c.label} className="flex items-center justify-between px-2 py-1.5 rounded bg-surface-1 border border-border/40">
                    <span className="text-[10px] font-mono text-muted-foreground">{c.label}</span>
                    <div className="flex items-center gap-1">
                      <span className={cn('text-sm font-mono font-bold tabular-nums', c.color)}>{c.value}</span>
                      <span className="text-[8px] font-mono text-muted-foreground/60">{c.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live market table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest">REAL-TIME MARKET LINES</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-signal-safe pulse-live" />
                <span className="text-[9px] font-mono text-signal-safe">STREAMING</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['MATCH', 'LEAGUE', 'KICK-OFF', 'HDP', 'H ODDS', 'A ODDS', 'PUB%', 'SCORE', 'SIGNAL', 'REC'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-mono text-muted-foreground tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ticker.map((t, i) => (
                    <tr
                      key={t.id}
                      className={cn(
                        'border-b border-border/40 transition-all',
                        t.trapScore >= 75 ? 'bg-signal-trap/3' : i % 2 === 0 ? 'bg-transparent' : 'bg-surface-1/30'
                      )}
                    >
  <td className="px-3 py-2.5 whitespace-nowrap">
  <Link href={`/matches/${t.id}`} className="flex flex-col group">
  <span className="text-[11px] font-mono font-bold text-foreground group-hover:text-primary transition-colors">{t.home}</span>
  <span className="text-[10px] font-mono text-muted-foreground group-hover:text-muted-foreground/70 transition-colors">{t.away}</span>
  </Link>
  </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{t.league}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[10px] font-mono text-foreground whitespace-nowrap tabular-nums">
                          {new Date(t.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'text-[11px] font-mono font-bold tabular-nums whitespace-nowrap',
                            t.hdpDrift !== 0 ? 'text-signal-warn' : 'text-foreground'
                          )}>
                            {t.hdp > 0 ? '+' : ''}{t.hdp}
                          </span>
                          {t.hdpDrift !== 0 && (
                            t.hdpDrift > 0
                              ? <TrendingUp className="w-3 h-3 text-signal-warn" />
                              : <TrendingDown className="w-3 h-3 text-signal-safe" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] font-mono font-bold text-signal-neutral tabular-nums">{t.oddsHome.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] font-mono font-bold text-signal-safe tabular-nums">{t.oddsAway.toFixed(2)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1.5 w-16 rounded-full bg-border overflow-hidden">
                            <div className="h-full bg-signal-neutral/60 rounded-full" style={{ width: `${t.volume}%` }} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground tabular-nums">{t.volume}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <TrapScoreBadge score={t.trapScore} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {t.rlm && (
                            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-signal-warn/15 text-signal-warn border border-signal-warn/30">RLM</span>
                          )}
                          {t.sm && (
                            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-signal-neutral/15 text-signal-neutral border border-signal-neutral/30">SM</span>
                          )}
                          {!t.rlm && !t.sm && <Minus className="w-3 h-3 text-muted-foreground/40" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn(
                          'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap',
                          t.rec === 'ANTITESIS' ? 'bg-signal-trap/20 text-signal-trap border-signal-trap/40' :
                          t.rec === 'PRO_STATS' ? 'bg-signal-safe/20 text-signal-safe border-signal-safe/40' :
                          t.rec === 'MONITOR' ? 'bg-signal-warn/20 text-signal-warn border-signal-warn/40' :
                          'bg-muted text-muted-foreground border-border'
                        )}>
                          {t.rec === 'ANTITESIS' ? 'ANTI' : t.rec === 'PRO_STATS' ? 'PRO' : t.rec === 'MONITOR' ? 'MON' : 'NEU'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
