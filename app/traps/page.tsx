'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { TrapScoreGauge, TrapScoreBadge } from '@/components/dashboard/trap-score-gauge'
import { AlgorithmMatrix } from '@/components/dashboard/algorithm-matrix'
import { useFixtures } from '@/hooks/use-fixtures'
import type { FullMatchAnalysis } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Flame, AlertTriangle, ChevronDown, ChevronUp, Zap, Shield, TrendingDown, Loader2, RefreshCw } from 'lucide-react'

type SortField = 'score' | 'kick_off' | 'confidence'

function getScoreCategory(score: number) {
  if (score >= 75) return { label: 'JEBAKAN TERKONFIRMASI', color: 'text-signal-trap', bg: 'bg-signal-trap/8 border-signal-trap/30', icon: <AlertTriangle className="w-4 h-4 text-signal-trap" /> }
  if (score >= 50) return { label: 'SINYAL KUAT', color: 'text-signal-warn', bg: 'bg-signal-warn/8 border-signal-warn/30', icon: <Flame className="w-4 h-4 text-signal-warn" /> }
  if (score >= 25) return { label: 'NETRAL', color: 'text-muted-foreground', bg: 'bg-muted/40 border-border', icon: <Shield className="w-4 h-4 text-muted-foreground" /> }
  return { label: 'PASAR MURNI', color: 'text-signal-safe', bg: 'bg-signal-safe/8 border-signal-safe/30', icon: <TrendingDown className="w-4 h-4 text-signal-safe" /> }
}

export default function TrapAlertsPage() {
  const [sort, setSort] = useState<SortField>('score')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { matches, loading, error, lastUpdated, refresh } = useFixtures({
    sport: 'soccer_epl',
    autoRefreshMs: 90_000,
  })

  const sorted = [...matches].sort((a, b) => {
    if (sort === 'score') return b.analysis.trap_score - a.analysis.trap_score
    if (sort === 'confidence') return b.analysis.confidence - a.analysis.confidence
    return new Date(a.kick_off).getTime() - new Date(b.kick_off).getTime()
  })

  const criticalCount = matches.filter(m => m.analysis.trap_score >= 75).length
  const highCount = matches.filter(m => m.analysis.trap_score >= 50 && m.analysis.trap_score < 75).length
  const avgConfidence = matches.length
    ? Math.round(matches.reduce((s, m) => s + m.analysis.confidence, 0) / matches.length)
    : 0

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Trap Alerts" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'CRITICAL TRAPS', value: criticalCount, desc: 'Score ≥ 75', color: 'text-signal-trap', border: 'border-signal-trap/25 bg-signal-trap/5', pulse: true },
              { label: 'HIGH SIGNALS', value: highCount, desc: 'Score 50–74', color: 'text-signal-warn', border: 'border-signal-warn/25 bg-signal-warn/5', pulse: false },
        { label: 'TOTAL ANALYZED', value: matches.length, desc: 'All matches', color: 'text-foreground', border: 'border-border', pulse: false },
        { label: 'AVG CONFIDENCE', value: `${avgConfidence}%`, desc: 'Model accuracy', color: 'text-primary', border: 'border-primary/25 bg-primary/5', pulse: false },
            ].map(card => (
              <div key={card.label} className={cn('rounded-lg border p-3', card.border)}>
                <p className="text-[9px] font-mono text-muted-foreground tracking-widest mb-1">{card.label}</p>
                <div className="flex items-end gap-2">
                  <span className={cn('text-2xl font-mono font-bold tabular-nums', card.color)}>{card.value}</span>
                  {card.pulse && <span className="w-2 h-2 rounded-full bg-signal-trap pulse-live mb-1.5" />}
                </div>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Score formula card */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">TRAP SCORE FORMULA</p>
            <div className="flex flex-wrap gap-3 items-center">
              {[
                { label: 'RLM', weight: '30%', color: 'text-signal-trap' },
                { label: 'HDP Dev', weight: '20%', color: 'text-signal-warn' },
                { label: 'Public Bias', weight: '20%', color: 'text-signal-warn' },
                { label: 'Sentiment', weight: '15%', color: 'text-signal-neutral' },
                { label: 'Smart Money', weight: '10%', color: 'text-primary' },
                { label: 'Late Movement', weight: '5%', color: 'text-muted-foreground' },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className={cn('text-[11px] font-mono font-bold', item.color)}>{item.label}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">×{item.weight}</span>
                  {i < 5 && <span className="text-muted-foreground/40 font-mono">+</span>}
                </div>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-signal-safe rounded" />
                  <span className="text-[9px] font-mono text-signal-safe">{'<'}25 PRO-STATS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-signal-warn rounded" />
                  <span className="text-[9px] font-mono text-signal-warn">50–74 MONITOR</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-signal-trap rounded" />
                  <span className="text-[9px] font-mono text-signal-trap">{'>'}75 ANTITESIS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sort bar */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">SORT BY:</span>
            {(['score', 'kick_off', 'confidence'] as SortField[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all',
                  sort === s
                    ? 'bg-primary/20 text-primary border-primary/50'
                    : 'text-muted-foreground border-border hover:border-border/80'
                )}
              >
                {s === 'score' ? 'TRAP SCORE' : s === 'kick_off' ? 'KICK-OFF' : 'CONFIDENCE'}
              </button>
            ))}
          </div>

          {/* Toolbar: sort + refresh */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-muted-foreground">SORT BY:</span>
            {(['score', 'kick_off', 'confidence'] as SortField[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={cn(
                  'px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all',
                  sort === s
                    ? 'bg-primary/20 text-primary border-primary/50'
                    : 'text-muted-foreground border-border hover:border-border/80'
                )}
              >
                {s === 'score' ? 'TRAP SCORE' : s === 'kick_off' ? 'KICK-OFF' : 'CONFIDENCE'}
              </button>
            ))}
            <button
              onClick={refresh}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'REFRESH'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs font-mono text-destructive">{error}</span>
            </div>
          )}

          {/* Alert cards */}
          <div className="space-y-3">
          {loading && sorted.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
            ))
          ) : sorted.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <Zap className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">No matches found. Try refreshing or changing the date.</p>
            </div>
          ) : null}
          {sorted.map(match => {
              const cat = getScoreCategory(match.analysis.trap_score)
              const isExp = expanded === match.id
              return (
                <div key={match.id} className={cn('rounded-lg border overflow-hidden', cat.bg)}>
                  {/* Card header */}
                  <button
                    onClick={() => setExpanded(isExp ? null : match.id)}
                    className="w-full flex items-start gap-4 p-4 text-left hover:bg-white/2 transition-colors"
                  >
                    <TrapScoreGauge score={match.analysis.trap_score} size="md" showLabel />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {cat.icon}
                        <span className={cn('text-[10px] font-mono font-bold tracking-widest', cat.color)}>{cat.label}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{match.league}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(match.kick_off).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' — '}
                          {new Date(match.kick_off).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h3 className="text-base font-bold font-mono text-foreground mb-2">
                        {match.home_team}
                        <span className="text-muted-foreground font-normal text-sm mx-2">vs</span>
                        {match.away_team}
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {[
                          { label: 'HDP DRIFT', value: `${match.analysis.opening_hdp} → ${match.analysis.current_hdp}`, highlight: match.analysis.opening_hdp !== match.analysis.current_hdp },
                          { label: 'PUBLIC', value: `${match.analysis.public_volume_home}% HOME` },
                          { label: 'CONFIDENCE', value: `${match.analysis.confidence}%` },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-muted-foreground tracking-wider">{item.label}</span>
                            <span className={cn(
                              'text-[10px] font-mono font-bold',
                              item.highlight ? 'text-signal-warn' : 'text-foreground'
                            )}>{item.value}</span>
                          </div>
                        ))}
                        {match.rlm_active && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-signal-warn/15 text-signal-warn border border-signal-warn/30">
                            RLM ACTIVE
                          </span>
                        )}
                        {match.smart_money_detected && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-signal-neutral/15 text-signal-neutral border border-signal-neutral/30">
                            SMART MONEY
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={cn(
                        'px-2.5 py-1 rounded border text-[10px] font-mono font-bold tracking-wider',
                        match.analysis.recommendation === 'ANTITESIS'
                          ? 'bg-signal-trap/20 text-signal-trap border-signal-trap/40'
                          : match.analysis.recommendation === 'PRO_STATS'
                          ? 'bg-signal-safe/20 text-signal-safe border-signal-safe/40'
                          : match.analysis.recommendation === 'MONITOR'
                          ? 'bg-signal-warn/20 text-signal-warn border-signal-warn/40'
                          : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {match.analysis.recommendation.replace('_', '-')}
                      </span>
                      {isExp ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExp && (
                    <div className="border-t border-border/60 p-4 space-y-4 bg-surface-1/40">
                      <p className="text-xs text-foreground/80 leading-relaxed">{match.sentiment_summary}</p>
                      <AlgorithmMatrix algorithms={match.algorithms} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </main>
      </div>
    </div>
  )
}
