'use client'

import { cn } from '@/lib/utils'

interface TrapScoreGaugeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  recommendation?: string
}

function getScoreColor(score: number) {
  if (score >= 75) return { text: 'text-signal-trap', stroke: '#ef4444', bg: 'bg-signal-trap/10', label: 'ANTITESIS', labelColor: 'text-signal-trap' }
  if (score >= 50) return { text: 'text-signal-warn', stroke: '#f59e0b', bg: 'bg-signal-warn/10', label: 'MONITOR', labelColor: 'text-signal-warn' }
  if (score >= 25) return { text: 'text-foreground', stroke: '#6b7280', bg: 'bg-muted', label: 'NEUTRAL', labelColor: 'text-muted-foreground' }
  return { text: 'text-signal-safe', stroke: '#10b981', bg: 'bg-signal-safe/10', label: 'PRO-STATS', labelColor: 'text-signal-safe' }
}

export function TrapScoreGauge({ score, size = 'md', showLabel = true }: TrapScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score))
  const colors = getScoreColor(clampedScore)

  const sizeConfig = {
    sm: { r: 24, cx: 30, cy: 30, viewBox: '0 0 60 60', fontSize: '10', strokeWidth: 3, containerSize: 'w-14 h-14' },
    md: { r: 36, cx: 44, cy: 44, viewBox: '0 0 88 88', fontSize: '14', strokeWidth: 4, containerSize: 'w-22 h-22' },
    lg: { r: 56, cx: 68, cy: 68, viewBox: '0 0 136 136', fontSize: '20', strokeWidth: 6, containerSize: 'w-36 h-36' },
  }

  const cfg = sizeConfig[size]
  const circumference = 2 * Math.PI * cfg.r
  // Use only 270 degrees (3/4 arc)
  const arcLength = circumference * 0.75
  const offset = arcLength - (clampedScore / 100) * arcLength
  const rotation = 135 // start angle

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('relative', cfg.containerSize)}>
        <svg viewBox={cfg.viewBox} className="w-full h-full -rotate-0">
          {/* Track arc */}
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={cfg.strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cfg.cx} ${cfg.cy})`}
            className="text-border"
          />
          {/* Value arc */}
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={cfg.strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${cfg.cx} ${cfg.cy})`}
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.4s ease' }}
            filter={`drop-shadow(0 0 4px ${colors.stroke}80)`}
          />
          {/* Center text */}
          <text
            x={cfg.cx}
            y={cfg.cy + 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={colors.stroke}
            fontSize={cfg.fontSize}
            fontFamily="monospace"
            fontWeight="700"
          >
            {clampedScore}
          </text>
          {size !== 'sm' && (
            <text
              x={cfg.cx}
              y={cfg.cy + parseInt(cfg.fontSize) + 4}
              textAnchor="middle"
              fill="#6b7280"
              fontSize={parseInt(cfg.fontSize) * 0.55}
              fontFamily="monospace"
            >
              /100
            </text>
          )}
        </svg>
      </div>
      {showLabel && (
        <span className={cn('text-[10px] font-mono font-bold tracking-widest', colors.labelColor)}>
          {colors.label}
        </span>
      )}
    </div>
  )
}

export function TrapScoreBadge({ score }: { score: number }) {
  const colors = getScoreColor(score)
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold tabular-nums',
      colors.bg, colors.text,
      'border',
      score >= 75 ? 'border-signal-trap/30' :
      score >= 50 ? 'border-signal-warn/30' :
      score >= 25 ? 'border-border' : 'border-signal-safe/30'
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', 
        score >= 75 ? 'bg-signal-trap pulse-live' :
        score >= 50 ? 'bg-signal-warn' :
        score >= 25 ? 'bg-muted-foreground' : 'bg-signal-safe'
      )} />
      {score}
    </span>
  )
}
