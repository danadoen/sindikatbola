"use client";

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { OddsMovement } from '@/lib/types'
import { cn } from '@/lib/utils'

interface OddsMovementChartProps {
  oddsHistory: OddsMovement[]
  homeTeam: string
  awayTeam: string
}

type ChartMode = 'odds' | 'hdp' | 'volume'

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) => {
  if (!active || !payload?.length) return null
  const time = new Date(label ?? '').toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="rounded-md border border-border bg-popover p-2 text-[11px] font-mono shadow-xl">
      <p className="text-muted-foreground mb-1.5">{time}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{
            typeof p.value === 'number' ? p.value.toFixed(p.name === 'Volume' ? 0 : 2) : p.value
          }</span>
        </div>
      ))}
    </div>
  )
}

export function OddsMovementChart({ oddsHistory, homeTeam, awayTeam }: OddsMovementChartProps) {
  const [mode, setMode] = useState<ChartMode>('odds')

  const data = oddsHistory.map(d => ({
    ...d,
    time: d.timestamp,
    Volume: Math.round(d.volume / 1000),
  }))

  // Opening reference
  const openingHome = data[0]?.home
  const openingAway = data[0]?.away

  const modes: { key: ChartMode; label: string }[] = [
    { key: 'odds', label: '1X2' },
    { key: 'hdp', label: 'HDP' },
    { key: 'volume', label: 'VOL' },
  ]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground tracking-widest">ODDS MOVEMENT</p>
          <p className="text-[9px] font-mono text-muted-foreground mt-0.5">
            {data.length} data points · 30min interval
          </p>
        </div>
        <div className="flex gap-1">
          {modes.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                'px-2 py-0.5 rounded text-[9px] font-mono font-bold border transition-all',
                mode === m.key
                  ? 'bg-primary/20 text-primary border-primary/50'
                  : 'text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'odds' ? (
            <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tickFormatter={v => new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(1)}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              {openingHome && (
                <ReferenceLine y={openingHome} stroke="rgba(56,139,253,0.3)" strokeDasharray="3 3" />
              )}
              <Line
                type="monotone"
                dataKey="home"
                name={homeTeam.split(' ')[0]}
                stroke="oklch(0.58 0.14 250)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: 'oklch(0.58 0.14 250)' }}
              />
              <Line
                type="monotone"
                dataKey="draw"
                name="Draw"
                stroke="oklch(0.52 0.01 264)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="3 3"
                activeDot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="away"
                name={awayTeam.split(' ')[0]}
                stroke="oklch(0.74 0.17 168)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: 'oklch(0.74 0.17 168)' }}
              />
            </LineChart>
          ) : mode === 'hdp' ? (
            <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tickFormatter={v => new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => v.toFixed(2)}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
              <Line
                type="stepAfter"
                dataKey="hdp"
                name="HDP"
                stroke="oklch(0.78 0.18 72)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: 'oklch(0.78 0.18 72)' }}
              />
            </LineChart>
          ) : (
            <LineChart data={data} margin={{ top: 2, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tickFormatter={v => new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `${v}K`}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="Volume"
                name="Volume"
                stroke="oklch(0.65 0.16 300)"
                strokeWidth={1.5}
                dot={false}
                fill="oklch(0.65 0.16 300 / 0.15)"
                activeDot={{ r: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {mode === 'odds' && (
        <div className="flex items-center gap-3 mt-2">
          {[
            { color: 'oklch(0.58 0.14 250)', label: homeTeam.split(' ')[0] },
            { color: 'oklch(0.52 0.01 264)', label: 'Draw' },
            { color: 'oklch(0.74 0.17 168)', label: awayTeam.split(' ')[0] },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1">
              <span className="w-3 h-0.5 inline-block" style={{ background: l.color }} />
              <span className="text-[9px] font-mono text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
