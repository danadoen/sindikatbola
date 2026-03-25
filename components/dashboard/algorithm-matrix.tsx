'use client'

import { cn } from '@/lib/utils'
import type { AlgorithmResult } from '@/lib/types'

interface AlgorithmMatrixProps {
  algorithms: AlgorithmResult[]
}

const ENGINE_COLORS = {
  'Python': 'text-signal-neutral bg-signal-neutral/10 border-signal-neutral/30',
  'Node.js': 'text-signal-safe bg-signal-safe/10 border-signal-safe/30',
}

const SIGNAL_STYLES = {
  TRAP: { bar: 'bg-signal-trap', text: 'text-signal-trap', bg: 'bg-signal-trap/10 border-signal-trap/30' },
  WARN: { bar: 'bg-signal-warn', text: 'text-signal-warn', bg: 'bg-signal-warn/10 border-signal-warn/30' },
  NEUTRAL: { bar: 'bg-muted-foreground', text: 'text-muted-foreground', bg: 'bg-muted border-border' },
  SAFE: { bar: 'bg-signal-safe', text: 'text-signal-safe', bg: 'bg-signal-safe/10 border-signal-safe/30' },
}

const SHORT_NAMES: Record<number, string> = {
  1: 'WPD', 2: 'RLM', 3: 'MCS', 4: 'HDP', 5: 'PSB', 6: 'ELD', 7: 'HID', 8: 'LCP'
}

export function AlgorithmMatrix({ algorithms }: AlgorithmMatrixProps) {
  const avgScore = Math.round(algorithms.reduce((s, a) => s + a.score, 0) / algorithms.length)
  const trapCount = algorithms.filter(a => a.signal === 'TRAP').length
  const warnCount = algorithms.filter(a => a.signal === 'WARN').length

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest">8-ALGORITHM MATRIX</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="text-signal-trap font-mono font-bold">{trapCount}</span> TRAP ·{' '}
            <span className="text-signal-warn font-mono font-bold">{warnCount}</span> WARN ·{' '}
            <span className="text-muted-foreground font-mono">{algorithms.length - trapCount - warnCount}</span> OTHER
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono text-muted-foreground">AVG SCORE</p>
          <p className={cn(
            'text-xl font-mono font-bold tabular-nums',
            avgScore >= 75 ? 'text-signal-trap' : avgScore >= 50 ? 'text-signal-warn' : 'text-signal-safe'
          )}>{avgScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {algorithms.map(algo => {
          const signal = SIGNAL_STYLES[algo.signal]
          const shortName = SHORT_NAMES[algo.id] ?? `A${algo.id}`
          return (
            <div
              key={algo.id}
              className={cn(
                'rounded-md border p-2.5 transition-all',
                algo.signal === 'TRAP' ? 'border-signal-trap/25 bg-signal-trap/3' :
                algo.signal === 'WARN' ? 'border-signal-warn/20 bg-signal-warn/3' :
                'border-border bg-surface-1/50'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={cn(
                    'shrink-0 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                    signal.bg, signal.text
                  )}>
                    {shortName}
                  </span>
                  <span className="text-[10px] font-mono text-foreground/80 truncate">{algo.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn(
                    'text-[9px] font-mono font-bold px-1 py-0.5 rounded border',
                    ENGINE_COLORS[algo.engine]
                  )}>
                    {algo.engine === 'Python' ? 'PY' : 'JS'}
                  </span>
                  <span className={cn('text-sm font-mono font-bold tabular-nums', signal.text)}>
                    {algo.score}
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div className="h-1 rounded-full bg-border mb-2 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', signal.bar)}
                  style={{ width: `${algo.score}%` }}
                />
              </div>

              {/* Detail */}
              <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{algo.detail}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
