'use client'

import { Activity, AlertTriangle, BarChart3, Eye, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'

const STAT_CONFIGS = [
  {
    key: 'active_matches' as const,
    label: 'Active Matches',
    icon: Activity,
    color: 'text-signal-neutral',
    bg: 'bg-signal-neutral/10',
    border: 'border-signal-neutral/20',
    format: (v: number) => v.toString(),
  },
  {
    key: 'detected_traps' as const,
    label: 'Traps Detected',
    icon: AlertTriangle,
    color: 'text-signal-trap',
    bg: 'bg-signal-trap/10',
    border: 'border-signal-trap/20',
    format: (v: number) => v.toString(),
  },
  {
    key: 'high_score_alerts' as const,
    label: 'High Score Alerts',
    icon: Zap,
    color: 'text-signal-warn',
    bg: 'bg-signal-warn/10',
    border: 'border-signal-warn/20',
    format: (v: number) => v.toString(),
  },
  {
    key: 'markets_monitored' as const,
    label: 'Markets Monitored',
    icon: Eye,
    color: 'text-signal-safe',
    bg: 'bg-signal-safe/10',
    border: 'border-signal-safe/20',
    format: (v: number) => v.toString(),
  },
  {
    key: 'avg_trap_score' as const,
    label: 'Avg Trap Score',
    icon: BarChart3,
    color: 'text-signal-warn',
    bg: 'bg-signal-warn/10',
    border: 'border-signal-warn/20',
    format: (v: number) => v.toFixed(1),
  },
  {
    key: 'rlm_events_today' as const,
    label: 'RLM Events Today',
    icon: TrendingUp,
    color: 'text-signal-trap',
    bg: 'bg-signal-trap/10',
    border: 'border-signal-trap/20',
    format: (v: number) => v.toString(),
  },
]

export function OverviewStats({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAT_CONFIGS.map((cfg) => {
        const Icon = cfg.icon
        const value = stats[cfg.key]
        return (
          <div
            key={cfg.key}
            className={cn(
              'relative flex flex-col gap-2 p-3 rounded-lg border bg-card overflow-hidden',
              cfg.border
            )}
          >
            <div className={cn('flex items-center justify-center w-7 h-7 rounded-md border', cfg.bg, cfg.border)}>
              <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
            </div>
            <div>
              <p className={cn('text-xl font-mono font-bold leading-none tabular-nums', cfg.color)}>
                {cfg.format(value as number)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{cfg.label}</p>
            </div>
            {/* subtle bg glow */}
            <div className={cn('absolute inset-0 opacity-5 rounded-lg', cfg.bg)} />
          </div>
        )
      })}
    </div>
  )
}
