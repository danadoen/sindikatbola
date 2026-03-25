'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TrapScoreBadge } from './trap-score-gauge'
import type { FullMatchAnalysis } from '@/lib/types'
import { Clock, ExternalLink } from 'lucide-react'

interface MatchCardProps {
  match: FullMatchAnalysis
  isSelected?: boolean
  onClick?: () => void
}

function getRecommendationStyle(rec: string) {
  switch (rec) {
    case 'ANTITESIS': return 'bg-signal-trap/20 text-signal-trap border-signal-trap/40'
    case 'PRO_STATS': return 'bg-signal-safe/20 text-signal-safe border-signal-safe/40'
    case 'MONITOR': return 'bg-signal-warn/20 text-signal-warn border-signal-warn/40'
    default: return 'bg-muted text-muted-foreground border-border'
  }
}

function getCardBorderStyle(score: number, isSelected: boolean) {
  if (isSelected) {
    if (score >= 75) return 'border-signal-trap/70 bg-signal-trap/5'
    if (score >= 50) return 'border-signal-warn/70 bg-signal-warn/5'
    return 'border-primary/70 bg-primary/5'
  }
  if (score >= 75) return 'border-signal-trap/25 hover:border-signal-trap/50 hover:bg-signal-trap/[0.03]'
  if (score >= 50) return 'border-signal-warn/20 hover:border-signal-warn/50'
  return 'border-border hover:border-border/80'
}

function TeamLogo({ src, name }: { src?: string; name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-6 h-6 rounded-full border border-border/60 bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-5 h-5 object-contain"
          onError={(e) => {
            const el = e.target as HTMLImageElement
            el.style.display = 'none'
            el.parentElement!.innerHTML = `<span class="text-[8px] font-mono font-bold text-muted-foreground">${initials}</span>`
          }}
        />
      ) : (
        <span className="text-[8px] font-mono font-bold text-muted-foreground">{initials}</span>
      )}
    </div>
  )
}

export function MatchCard({ match, isSelected, onClick }: MatchCardProps) {
  const { analysis, home_team, away_team, league, league_logo, home_team_logo, away_team_logo, kick_off, rlm_active, smart_money_detected } = match
  const { trap_score, recommendation, current_hdp, current_odds_home, current_odds_away } = analysis

  const hdpDrift = parseFloat(Math.abs((analysis.opening_hdp || 0) - (analysis.current_hdp || 0)).toFixed(2))
  const kickOffTime = new Date(kick_off)
  const timeStr = kickOffTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = kickOffTime.toLocaleDateString([], { day: '2-digit', month: 'short' })
  const isToday = kickOffTime.toDateString() === new Date().toDateString()

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg border bg-card transition-all duration-200 p-3 cursor-pointer',
        getCardBorderStyle(trap_score, isSelected ?? false),
        isSelected && 'ring-1 ring-primary/20'
      )}
    >
      {/* League row */}
      <div className="flex items-center gap-1.5 mb-2">
        {league_logo ? (
          <img
            src={league_logo}
            alt={league}
            className="w-3.5 h-3.5 object-contain rounded-sm opacity-80"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : null}
        <span className="text-[9px] font-mono text-muted-foreground truncate tracking-wide flex-1">{league}</span>
        <Clock className="w-2.5 h-2.5 text-muted-foreground/60 shrink-0" />
        <span className={cn(
          'text-[9px] font-mono shrink-0',
          isToday ? 'text-signal-warn font-bold' : 'text-muted-foreground'
        )}>
          {isToday ? 'Today' : dateStr} {timeStr}
        </span>
      </div>

      {/* Teams with logos */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <TeamLogo src={home_team_logo} name={home_team} />
          <span className="text-[11px] font-bold font-mono text-foreground truncate leading-tight">{home_team}</span>
        </div>

        <TrapScoreBadge score={trap_score} />

        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-[11px] font-bold font-mono text-foreground truncate leading-tight text-right">{away_team}</span>
          <TeamLogo src={away_team_logo} name={away_team} />
        </div>
      </div>

      {/* Market line */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-muted-foreground">HDP</span>
          <span className={cn(
            'text-[10px] font-mono font-bold tabular-nums',
            hdpDrift > 0.1 ? 'text-signal-warn' : 'text-muted-foreground'
          )}>
            {current_hdp > 0 ? '+' : ''}{current_hdp}
            {hdpDrift > 0.1 && (
              <span className="text-signal-warn ml-0.5 text-[8px]">
                ({analysis.opening_hdp > current_hdp ? '▼' : '▲'}{hdpDrift.toFixed(2)})
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-muted-foreground">H</span>
          <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">{current_odds_home.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-mono text-muted-foreground">A</span>
          <span className="text-[10px] font-mono font-bold text-foreground tabular-nums">{current_odds_away.toFixed(2)}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {rlm_active && (
            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-signal-warn/15 text-signal-warn border border-signal-warn/30">
              RLM
            </span>
          )}
          {smart_money_detected && (
            <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-signal-neutral/15 text-signal-neutral border border-signal-neutral/30">
              SM
            </span>
          )}
          <span className={cn(
            'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
            getRecommendationStyle(recommendation)
          )}>
            {recommendation === 'ANTITESIS' ? 'ANTI'
              : recommendation === 'PRO_STATS' ? 'PRO'
              : recommendation === 'MONITOR' ? 'MON' : 'NEU'}
          </span>
        </div>
      </div>

      {/* View detail link */}
      <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-end">
        <Link
          href={`/matches/${match.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground hover:text-primary transition-colors"
        >
          View Analysis <ExternalLink className="w-2.5 h-2.5" />
        </Link>
      </div>
    </button>
  )
}
