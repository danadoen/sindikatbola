'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { OddsMovementChart } from '@/components/dashboard/odds-movement-chart'
import { TrapScoreBadge } from '@/components/dashboard/trap-score-gauge'
import { useFixtures } from '@/hooks/use-fixtures'
import type { FullMatchAnalysis } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BarChart3, TrendingUp, TrendingDown, ArrowUpDown, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'

const SPORTS = ['EPL', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1']

export default function MarketsPage() {
  const [sport, setSport] = useState('ALL')
  const [activeSport] = useState('soccer_epl')

  const { matches, loading, error, lastUpdated, refresh } = useFixtures({
    sport: activeSport,
    autoRefreshMs: 120_000,
  })

  const [chartMatch, setChartMatch] = useState<FullMatchAnalysis | null>(null)

  const filtered = sport === 'ALL' ? matches : matches.filter(m =>
    m.league.toLowerCase().includes(sport.toLowerCase()) ||
    (sport === 'EPL' && m.league.includes('Premier'))
  )

  const displayed = chartMatch ?? filtered[0] ?? null

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Market Lines" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Top bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-mono font-bold text-foreground">MARKET LINE TRACKER</h1>

            <div className="ml-auto flex items-center gap-2">
              {['ALL', ...SPORTS].map(s => (
                <button
                  key={s}
                  onClick={() => setSport(s)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all',
                    sport === s ? 'bg-primary/20 text-primary border-primary/50' : 'text-muted-foreground border-border hover:text-foreground'
                  )}
                >
                  {s}
                </button>
              ))}

              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
                {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'REFRESH'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs font-mono text-destructive">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-12 gap-4">
            {/* Table */}
            <div className="col-span-12 lg:col-span-7 rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest">OPENING vs CURRENT LINES</p>
                <div className="flex items-center gap-2">
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>

              {loading && filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs font-mono text-muted-foreground">Loading market data…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs font-mono text-muted-foreground">No matches found for the selected filter.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {['MATCH', 'OPEN HDP', 'CURR HDP', 'DRIFT', 'H OPEN/CURR', 'A OPEN/CURR', 'SCORE'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-[9px] font-mono text-muted-foreground tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(m => {
                        const hdpDrift = m.analysis.current_hdp - m.analysis.opening_hdp
                        const homeOddsDrift = m.analysis.current_odds_home - m.analysis.opening_odds_home
                        const awayOddsDrift = m.analysis.current_odds_away - m.analysis.opening_odds_away
                        return (
                          <tr
                            key={m.id}
                            onClick={() => setChartMatch(m)}
                            className={cn(
                              'border-b border-border/40 cursor-pointer transition-all',
                              displayed?.id === m.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-surface-1/40'
                            )}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-mono font-bold text-foreground whitespace-nowrap">{m.home_team}</span>
                                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{m.away_team}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] font-mono font-bold text-muted-foreground tabular-nums">{m.analysis.opening_hdp}</td>
                            <td className="px-3 py-2.5 text-[11px] font-mono font-bold text-foreground tabular-nums">{m.analysis.current_hdp}</td>
                            <td className="px-3 py-2.5">
                              <div className={cn('flex items-center gap-1 text-[10px] font-mono font-bold tabular-nums',
                                hdpDrift !== 0 ? 'text-signal-warn' : 'text-muted-foreground/40')}>
                                {hdpDrift > 0 ? <TrendingUp className="w-3 h-3" /> : hdpDrift < 0 ? <TrendingDown className="w-3 h-3" /> : '—'}
                                {hdpDrift !== 0 && `${hdpDrift > 0 ? '+' : ''}${hdpDrift.toFixed(2)}`}
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{m.analysis.opening_odds_home.toFixed(2)}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-mono font-bold text-signal-neutral tabular-nums">{m.analysis.current_odds_home.toFixed(2)}</span>
                                  {homeOddsDrift !== 0 && (
                                    <span className={cn('text-[8px] font-mono', homeOddsDrift > 0 ? 'text-signal-trap' : 'text-signal-safe')}>
                                      {homeOddsDrift > 0 ? '▲' : '▼'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{m.analysis.opening_odds_away.toFixed(2)}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-mono font-bold text-signal-safe tabular-nums">{m.analysis.current_odds_away.toFixed(2)}</span>
                                  {awayOddsDrift !== 0 && (
                                    <span className={cn('text-[8px] font-mono', awayOddsDrift > 0 ? 'text-signal-trap' : 'text-signal-safe')}>
                                      {awayOddsDrift > 0 ? '▲' : '▼'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <TrapScoreBadge score={m.analysis.trap_score} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Chart panel */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-4">
              {displayed ? (
                <>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-[10px] font-mono text-muted-foreground mb-1">VIEWING</p>
                    <p className="text-sm font-mono font-bold text-foreground">{displayed.home_team} vs {displayed.away_team}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{displayed.league}</p>
                  </div>
                  <OddsMovementChart
                    oddsHistory={displayed.odds_history}
                    homeTeam={displayed.home_team}
                    awayTeam={displayed.away_team}
                  />

                  {/* Public volume */}
                  <div className="rounded-lg border border-border bg-card p-4">
                    <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">PUBLIC MONEY DISTRIBUTION</p>
                    {[
                      { label: displayed.home_team, pct: displayed.analysis.public_volume_home, color: 'bg-signal-neutral' },
                      { label: 'Draw', pct: displayed.analysis.public_volume_draw, color: 'bg-muted-foreground/50' },
                      { label: displayed.away_team, pct: displayed.analysis.public_volume_away, color: 'bg-signal-safe' },
                    ].map(row => (
                      <div key={row.label} className="mb-2">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[10px] font-mono text-foreground">{row.label}</span>
                          <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">{row.pct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-border overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all duration-500', row.color)} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-border bg-card p-8 text-center flex-1 flex items-center justify-center">
                  {loading
                    ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    : <p className="text-xs font-mono text-muted-foreground">Select a match to view chart</p>
                  }
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
