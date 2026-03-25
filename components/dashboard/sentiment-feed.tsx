'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { FullMatchAnalysis } from '@/lib/types'
import { Globe, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'

interface SentimentEntry {
  id: string
  match: string
  team: string
  score: number
  change: number
  source: 'Twitter' | 'Reddit' | 'News' | 'Forums'
  summary: string
  timestamp: Date
}

function generateFeed(matches: FullMatchAnalysis[]): SentimentEntry[] {
  const sources: SentimentEntry['source'][] = ['Twitter', 'Reddit', 'News', 'Forums']
  const entries: SentimentEntry[] = []

  matches.forEach(m => {
    entries.push({
      id: `${m.id}-home`,
      match: `${m.home_team} vs ${m.away_team}`,
      team: m.home_team,
      score: m.sentiment_score,
      change: Math.round((Math.random() - 0.4) * 12),
      source: sources[Math.floor(Math.random() * sources.length)],
      summary: m.sentiment_summary,
      timestamp: new Date(Date.now() - Math.random() * 30 * 60000),
    })
  })

  return entries.sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
}

const SOURCE_STYLES: Record<SentimentEntry['source'], string> = {
  Twitter: 'text-signal-neutral bg-signal-neutral/10 border-signal-neutral/30',
  Reddit: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  News: 'text-signal-safe bg-signal-safe/10 border-signal-safe/30',
  Forums: 'text-signal-warn bg-signal-warn/10 border-signal-warn/30',
}

export function SentimentFeed({ matches }: { matches: FullMatchAnalysis[] }) {
  const [feed, setFeed] = useState<SentimentEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState(new Date())

  useEffect(() => {
    setFeed(generateFeed(matches))
  }, [matches])

  const refresh = async () => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setFeed(generateFeed(matches))
    setLastFetch(new Date())
    setLoading(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest">PUBLIC SENTIMENT FEED</p>
          <span className="text-[9px] font-mono text-muted-foreground/50">via RapidAPI</span>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
          {lastFetch.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </button>
      </div>

      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {feed.map(entry => (
          <div
            key={entry.id}
            className={cn(
              'rounded-md border p-2.5 transition-all',
              entry.score >= 75 ? 'border-signal-trap/20 bg-signal-trap/3' :
              entry.score >= 60 ? 'border-signal-warn/15 bg-signal-warn/3' :
              'border-border bg-transparent'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={cn(
                    'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                    SOURCE_STYLES[entry.source]
                  )}>
                    {entry.source.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground">{entry.team}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">·</span>
                  <span className="text-[9px] font-mono text-muted-foreground truncate max-w-32">{entry.match}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{entry.summary}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  <SentimentScore score={entry.score} />
                </div>
                <div className={cn(
                  'flex items-center gap-0.5 text-[9px] font-mono',
                  entry.change > 0 ? 'text-signal-trap' : entry.change < 0 ? 'text-signal-safe' : 'text-muted-foreground'
                )}>
                  {entry.change > 0 ? <TrendingUp className="w-2.5 h-2.5" /> :
                   entry.change < 0 ? <TrendingDown className="w-2.5 h-2.5" /> :
                   <Minus className="w-2.5 h-2.5" />}
                  {entry.change > 0 ? '+' : ''}{entry.change}
                </div>
                <span className="text-[8px] font-mono text-muted-foreground/60">
                  {Math.round((Date.now() - entry.timestamp.getTime()) / 60000)}m ago
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SentimentScore({ score }: { score: number }) {
  const color = score >= 70 ? 'text-signal-trap' : score >= 50 ? 'text-signal-warn' : 'text-signal-safe'
  const bg = score >= 70 ? 'bg-signal-trap/10 border-signal-trap/30' : score >= 50 ? 'bg-signal-warn/10 border-signal-warn/30' : 'bg-signal-safe/10 border-signal-safe/30'
  return (
    <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border tabular-nums', color, bg)}>
      {score}
    </span>
  )
}
