'use client'

import { useMemo } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useFixtures } from '@/hooks/use-fixtures'
import { cn } from '@/lib/utils'
import { Globe, TrendingDown, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line
} from 'recharts'

// Stable 24-h trend data (no MOCK reference needed — just platform activity curve)
const TREND_DATA = Array.from({ length: 12 }, (_, i) => {
  const seed = (i * 31 + 7) % 100
  return {
    hour: `${String(i * 2).padStart(2, '0')}:00`,
    twitter: 40 + ((seed * 17) % 50),
    reddit:  30 + ((seed * 13) % 60),
    news:    20 + ((seed * 11) % 40),
  }
})

export default function SentimentPage() {
  const { matches, loading, error, lastUpdated, refresh } = useFixtures({
    sport: 'soccer_epl',
    autoRefreshMs: 120_000,
  })

  const sentiments = useMemo(() =>
    matches.map(m => ({
      match:   `${m.home_team} vs ${m.away_team}`,
      home:    m.home_team,
      away:    m.away_team,
      league:  m.league,
      score:   m.sentiment_score ?? 50,
      summary: m.sentiment_summary ?? 'No sentiment data available.',
      hype:    (m.sentiment_score ?? 50) > 65 ? 'OVERHYPED' : (m.sentiment_score ?? 50) > 45 ? 'MODERATE' : 'UNDERDOG',
      fadeOpp: (m.sentiment_score ?? 50) > 70,
    })).sort((a, b) => b.score - a.score),
  [matches])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Sentiment Feed" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Header row */}
          <div className="flex items-center gap-3 flex-wrap">
            <Globe className="w-4 h-4 text-primary" />
            <h1 className="text-sm font-mono font-bold text-foreground">PUBLIC SENTIMENT ANALYSIS</h1>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
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
            {/* Sentiment bar chart */}
            <div className="col-span-12 lg:col-span-7 rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">
                SENTIMENT HYPE INDEX BY MATCH
              </p>

              {loading && sentiments.length === 0 ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sentiments} margin={{ top: 4, right: 4, bottom: 40, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis
                        dataKey="home"
                        tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                        tickLine={false} axisLine={false} angle={-40} textAnchor="end"
                      />
                      <YAxis
                        tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                        tickLine={false} axisLine={false} domain={[0, 100]} width={24}
                      />
                      <Tooltip
                        contentStyle={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="score" name="Sentiment" radius={[2, 2, 0, 0]}>
                        {sentiments.map((s, i) => (
                          <Cell
                            key={i}
                            fill={s.score >= 70 ? 'oklch(0.55 0.22 24)' : s.score >= 50 ? 'oklch(0.78 0.18 72)' : 'oklch(0.74 0.17 168)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 24h trend */}
            <div className="col-span-12 lg:col-span-5 rounded-lg border border-border bg-card p-4">
              <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">24H PLATFORM ACTIVITY</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={TREND_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="twitter" stroke="oklch(0.58 0.14 250)" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="reddit"  stroke="oklch(0.78 0.18 72)"  strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="news"    stroke="oklch(0.74 0.17 168)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-2">
                {[['Twitter', 'oklch(0.58 0.14 250)'], ['Reddit', 'oklch(0.78 0.18 72)'], ['News', 'oklch(0.74 0.17 168)']].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1">
                    <span className="w-3 h-0.5 inline-block rounded" style={{ background: c }} />
                    <span className="text-[9px] font-mono text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sentiment cards */}
          {loading && sentiments.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4 h-28 animate-pulse" />
              ))}
            </div>
          ) : sentiments.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-xs font-mono text-muted-foreground">No sentiment data available. Select a date with matches.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {sentiments.map(s => (
                <div key={s.match} className={cn(
                  'rounded-lg border p-3',
                  s.score >= 70 ? 'border-signal-trap/25 bg-signal-trap/3' :
                  s.score >= 50 ? 'border-signal-warn/20 bg-signal-warn/3' : 'border-border bg-card'
                )}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground">{s.league}</p>
                      <p className="text-[11px] font-mono font-bold text-foreground">{s.home} vs {s.away}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn(
                        'text-lg font-mono font-bold tabular-nums',
                        s.score >= 70 ? 'text-signal-trap' : s.score >= 50 ? 'text-signal-warn' : 'text-signal-safe'
                      )}>{s.score}</span>
                      <span className={cn(
                        'text-[8px] font-mono font-bold px-1 py-0.5 rounded border',
                        s.hype === 'OVERHYPED' ? 'text-signal-trap bg-signal-trap/10 border-signal-trap/30' :
                        s.hype === 'MODERATE'  ? 'text-signal-warn bg-signal-warn/10 border-signal-warn/30' :
                                                  'text-signal-safe bg-signal-safe/10 border-signal-safe/30'
                      )}>{s.hype}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{s.summary}</p>
                  {s.fadeOpp && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-signal-trap/10 border border-signal-trap/30">
                      <TrendingDown className="w-3 h-3 text-signal-trap" />
                      <span className="text-[9px] font-mono font-bold text-signal-trap">FADE THE PUBLIC OPPORTUNITY DETECTED</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
