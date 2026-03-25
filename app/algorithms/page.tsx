'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useFixtures } from '@/hooks/use-fixtures'
import { cn } from '@/lib/utils'
import { Brain, Server, Cpu, BarChart2, Activity, Loader2 } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts'

const ALGO_DEFS = [
  { id: 1, short: 'WPD', name: 'Weighted Poisson Distribution', engine: 'Python', weight: 0.20,
    description: 'Calculates expected goal probability using team attack/defence strength coefficients. Recent 3 matches weighted at 60% to prioritize current form.',
    inputs: ['attack_strength', 'defence_strength', 'avg_goals_scored', 'avg_goals_conceded'],
    outputs: ['expected_goals_home', 'expected_goals_away', 'score_probability_matrix'] },
  { id: 2, short: 'RLM', name: 'Reverse Line Movement', engine: 'Node.js', weight: 0.20,
    description: 'Detects when odds move in the opposite direction of public betting volume. The single strongest indicator that sharp/professional money is opposing the public.',
    inputs: ['public_volume_home', 'public_volume_away', 'opening_odds', 'current_odds'],
    outputs: ['rlm_score', 'sharp_side', 'line_direction'] },
  { id: 3, short: 'MCS', name: 'Monte Carlo Simulation', engine: 'Python', weight: 0.15,
    description: 'Runs 10,000 match simulations using Poisson distributions to derive statistically robust "true fair odds" independent of market pricing.',
    inputs: ['poisson_home_goals', 'poisson_away_goals', 'simulations=10000'],
    outputs: ['true_odds_home', 'true_odds_draw', 'true_odds_away', 'cover_probability'] },
  { id: 4, short: 'HDP', name: 'HDP vs 1x2 Deviation', engine: 'Node.js', weight: 0.15,
    description: 'Compares implied probability from the Asian Handicap market against the 1x2 (moneyline) market. A significant gap signals bookmaker price manipulation.',
    inputs: ['hdp_line', 'hdp_odds', '1x2_home_odds', '1x2_away_odds'],
    outputs: ['deviation_points', 'cheap_trap_detected', 'implied_prob_gap'] },
  { id: 5, short: 'PSB', name: 'Public Sentiment Bias', engine: 'Python', weight: 0.10,
    description: 'Scrapes Twitter, Reddit, and news feeds via RapidAPI to quantify public "hype" around a team. High sentiment combined with high public volume = classic Fade the Public setup.',
    inputs: ['rapidapi_social_score', 'news_mentions', 'trending_index'],
    outputs: ['sentiment_score', 'hype_index', 'fade_opportunity'] },
  { id: 6, short: 'ELD', name: 'Early vs Late Odds Deviation', engine: 'Node.js', weight: 0.10,
    description: 'Monitors significant odds changes in the final 60 minutes before kick-off. Large late movements typically indicate institutional "sharp money" entering the market.',
    inputs: ['opening_line_timestamp', 'current_odds', 'volume_last_60min'],
    outputs: ['smart_money_signal', 'late_movement_score', 'entry_timing'] },
  { id: 7, short: 'HID', name: 'Asian Handicap Insurance Detection', engine: 'Node.js', weight: 0.05,
    description: 'Identifies unusual Draw-No-Bet or +0.25 line movements that indicate the bookmaker is hedging their own liability — a strong sign that unexpected results are being priced in.',
    inputs: ['hdp_line_history', 'quarter_ball_movement', 'draw_no_bet_odds'],
    outputs: ['insurance_detected', 'bookmaker_fear_index', 'hedge_signal'] },
  { id: 8, short: 'LCP', name: 'League Cluster Pattern', engine: 'Python', weight: 0.05,
    description: 'Historical machine learning analysis of which trap patterns work most effectively in specific leagues. EPL vs La Liga vs Bundesliga have statistically different trap success profiles.',
    inputs: ['league_id', 'historical_trap_outcomes', 'season_data'],
    outputs: ['cluster_match_score', 'historical_success_rate', 'league_specific_weight'] },
]

function getEngineColor(engine: string) {
  return engine === 'Python' ? 'text-signal-neutral bg-signal-neutral/10 border-signal-neutral/30' : 'text-signal-safe bg-signal-safe/10 border-signal-safe/30'
}

export default function AlgorithmsPage() {
  const { matches, loading } = useFixtures({ autoRefreshMs: 90000 })
  const [selected, setSelected] = useState(ALGO_DEFS[0])

  // Build radar data from all matches (safe empty fallback)
  const radarData = ALGO_DEFS.map(a => ({
    algo: a.short,
    avg: matches.length === 0 ? 0 : Math.round(
      matches.reduce((sum, m) => {
        const alg = m.algorithms.find(al => al.id === a.id)
        return sum + (alg?.score ?? 0)
      }, 0) / matches.length
    ),
  }))

  // Bar chart data
  const barData = matches.map(m => ({
    name: `${m.home_team.split(' ')[0]} v ${m.away_team.split(' ')[0]}`,
    score: m.analysis.trap_score,
  }))

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title="Algorithm Matrix" />
        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Page header */}
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <h1 className="text-sm font-mono font-bold text-foreground tracking-wide">8-ALGORITHM INTELLIGENCE ENGINE</h1>
              <p className="text-[10px] font-mono text-muted-foreground">Hybrid Python + Node.js statistical computing pipeline</p>
            </div>
          </div>

          {/* Architecture cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Cpu className="w-4 h-4" />, label: 'Python Engine', desc: 'Poisson · Monte Carlo · Sentiment · Clusters', algos: [1,3,5,8], color: 'text-signal-neutral border-signal-neutral/25 bg-signal-neutral/5' },
              { icon: <Server className="w-4 h-4" />, label: 'Node.js Watcher', desc: 'RLM · HDP Dev · ELD · HID Insurance', algos: [2,4,6,7], color: 'text-signal-safe border-signal-safe/25 bg-signal-safe/5' },
              { icon: <Activity className="w-4 h-4" />, label: 'Scoring Output', desc: `Weighted composite → Trap Score 0–100`, algos: [], color: 'text-primary border-primary/25 bg-primary/5' },
            ].map(card => (
              <div key={card.label} className={cn('rounded-lg border p-3', card.color)}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={card.color.split(' ')[0]}>{card.icon}</span>
                  <span className={cn('text-[11px] font-mono font-bold', card.color.split(' ')[0])}>{card.label}</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground">{card.desc}</p>
                {card.algos.length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {card.algos.map(id => {
                      const def = ALGO_DEFS.find(a => a.id === id)
                      return def ? (
                        <span key={id} className={cn('text-[9px] font-mono font-bold px-1 py-0.5 rounded border', card.color)}>
                          {def.short}
                        </span>
                      ) : null
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Algorithm list */}
            <div className="col-span-12 lg:col-span-4 space-y-1.5">
              {ALGO_DEFS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-all',
                    selected.id === a.id
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-border/80'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                        selected.id === a.id ? 'bg-primary/20 text-primary border-primary/40' : 'bg-surface-2 text-muted-foreground border-border'
                      )}>
                        {a.short}
                      </span>
                      <span className={cn('text-[9px] font-mono font-bold px-1 py-0.5 rounded border', getEngineColor(a.engine))}>
                        {a.engine === 'Python' ? 'PY' : 'JS'}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{(a.weight * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-[11px] font-mono text-foreground leading-tight">{a.name}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        selected.id === a.id ? 'bg-primary' : 'bg-muted-foreground/40'
                      )}
                      style={{ width: `${a.weight * 100 * 5}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Algorithm detail + charts */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              {/* Detail card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border', getEngineColor(selected.engine))}>
                        {selected.engine}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">Weight: {(selected.weight * 100).toFixed(0)}%</span>
                    </div>
                    <h2 className="text-sm font-mono font-bold text-foreground">[{selected.short}] {selected.name}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-muted-foreground">AVG SCORE</p>
                    <p className="text-xl font-mono font-bold text-primary tabular-nums">
                      {radarData.find(r => r.algo === selected.short)?.avg ?? 0}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mb-4">{selected.description}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-mono text-muted-foreground tracking-wider mb-1.5">INPUTS</p>
                    <div className="space-y-1">
                      {selected.inputs.map(i => (
                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-neutral/60 shrink-0" />
                          <span className="text-[10px] font-mono text-foreground/80">{i}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-muted-foreground tracking-wider mb-1.5">OUTPUTS</p>
                    <div className="space-y-1">
                      {selected.outputs.map(o => (
                        <div key={o} className="flex items-center gap-1.5 px-2 py-1 rounded bg-surface-2 border border-border/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-signal-safe/60 shrink-0" />
                          <span className="text-[10px] font-mono text-foreground/80">{o}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">ALGORITHM RADAR — AVG SCORES</p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="algo" tick={{ fontSize: 9, fill: '#6e7681', fontFamily: 'monospace' }} />
                        <Radar name="Score" dataKey="avg" stroke="oklch(0.74 0.17 168)" fill="oklch(0.74 0.17 168)" fillOpacity={0.15} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">TRAP SCORES PER MATCH</p>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 2, right: 4, bottom: 20, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fontSize: 7, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} angle={-35} textAnchor="end" />
                        <YAxis tick={{ fontSize: 8, fill: '#6e7681', fontFamily: 'monospace' }} tickLine={false} axisLine={false} domain={[0, 100]} width={24} />
                        <Tooltip
                          contentStyle={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 6, fontSize: 10, fontFamily: 'monospace' }}
                          labelStyle={{ color: '#6e7681' }}
                        />
                        <Bar dataKey="score" radius={[2, 2, 0, 0]}>
                          {barData.map((entry, i) => (
                            <Cell key={i} fill={
                              entry.score >= 75 ? 'oklch(0.55 0.22 24)' :
                              entry.score >= 50 ? 'oklch(0.78 0.18 72)' : 'oklch(0.74 0.17 168)'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
