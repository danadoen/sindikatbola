'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { OverviewStats } from '@/components/dashboard/overview-stats'
import { MatchCard } from '@/components/dashboard/match-card'
import { TrapScoreGauge } from '@/components/dashboard/trap-score-gauge'
import { AlgorithmMatrix } from '@/components/dashboard/algorithm-matrix'
import { OddsMovementChart } from '@/components/dashboard/odds-movement-chart'
import { SentimentFeed } from '@/components/dashboard/sentiment-feed'
import { SystemStatus } from '@/components/dashboard/system-status'
import type { FullMatchAnalysis } from '@/lib/types'
import type { SportLeague } from '@/app/api/sports/route'
import { cn } from '@/lib/utils'
import { useApp } from '@/lib/app-context'
import {
  AlertTriangle, CalendarDays, ChevronLeft, ChevronRight,
  ChevronRight as ChevronRightIcon, Filter, Globe, Loader2, RefreshCw,
  Search, Zap
} from 'lucide-react'

type FilterType = 'ALL' | 'TRAPS' | 'HIGH' | 'CLEAN'

function formatDateParam(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateDisplay(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === 'id' ? 'id-ID' : locale === 'zh' ? 'zh-CN' : locale === 'ar' ? 'ar-SA' : 'en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function DashboardPage() {
  const { t, locale } = useApp()

  // State
  const [matches, setMatches] = useState<FullMatchAnalysis[]>([])
  const [selected, setSelected] = useState<FullMatchAnalysis | null>(null)
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Date picker
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const dateInputRef = useRef<HTMLInputElement>(null)

  // League / sport selector
  const [sports, setSports] = useState<SportLeague[]>([])
  const [sportsLoading, setSportsLoading] = useState(false)
  const [activeSport, setActiveSport] = useState('soccer_epl')
  const [leagueSearch, setLeagueSearch] = useState('')
  const [showLeaguePicker, setShowLeaguePicker] = useState(false)

  // Derived stats
  const topTrap = matches.filter(m => m.analysis.trap_score >= 75)
  const stats = {
    active_matches: matches.length,
    detected_traps: topTrap.length,
    high_score_alerts: matches.filter(m => m.analysis.trap_score >= 50).length,
    markets_monitored: matches.length * 6,
    avg_trap_score: matches.length
      ? parseFloat((matches.reduce((s, m) => s + m.analysis.trap_score, 0) / matches.length).toFixed(1))
      : 0,
    rlm_events_today: matches.filter(m => m.rlm_active).length,
  }

  // Fetch leagues/sports from API
  useEffect(() => {
    setSportsLoading(true)
    fetch('/api/sports')
      .then(r => r.json())
      .then(d => setSports(d.sports || []))
      .catch(() => setSports([]))
      .finally(() => setSportsLoading(false))
  }, [])

  // Fetch fixtures from API
  const fetchFixtures = useCallback(async (sport: string, date: Date) => {
    setLoading(true)
    setError(null)
    try {
      const dateParam = formatDateParam(date)
      const res = await fetch(`/api/fixtures?sport=${sport}&date=${dateParam}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const list: FullMatchAnalysis[] = data.matches || []
      setMatches(list)
      setSelected(list[0] || null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(String(err))
      setMatches([])
      setSelected(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + refetch on date/sport change
  useEffect(() => {
    fetchFixtures(activeSport, selectedDate)
  }, [activeSport, selectedDate, fetchFixtures])

  // Auto-refresh every 90s
  useEffect(() => {
    const interval = setInterval(() => fetchFixtures(activeSport, selectedDate), 90000)
    return () => clearInterval(interval)
  }, [activeSport, selectedDate, fetchFixtures])

  const filtered = matches.filter(m => {
    if (filter === 'TRAPS') return m.analysis.trap_score >= 75
    if (filter === 'HIGH') return m.analysis.trap_score >= 50 && m.analysis.trap_score < 75
    if (filter === 'CLEAN') return m.analysis.trap_score < 25
    return true
  }).sort((a, b) => b.analysis.trap_score - a.analysis.trap_score)

  const activeSportObj = sports.find(s => s.key === activeSport)
  const filteredSports = sports.filter(s =>
    leagueSearch
      ? s.title.toLowerCase().includes(leagueSearch.toLowerCase()) ||
        s.group.toLowerCase().includes(leagueSearch.toLowerCase())
      : true
  )

  // Group leagues by country/group
  const groupedSports = filteredSports.reduce<Record<string, SportLeague[]>>((acc, s) => {
    const g = s.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(s)
    return acc
  }, {})

  const prevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const nextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }
  const goToday = () => setSelectedDate(new Date())

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={t('nav_dashboard')} />

        <main className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* ─── Top controls row: Date picker + League picker ─── */}
          <div className="flex flex-wrap items-center gap-3">

            {/* Date navigator */}
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1 py-1">
              <button
                onClick={prevDay}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => dateInputRef.current?.showPicker?.()}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono text-foreground hover:bg-accent transition-colors"
              >
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span>{formatDateDisplay(selectedDate, locale)}</span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={formatDateParam(selectedDate)}
                onChange={e => { if (e.target.value) setSelectedDate(new Date(e.target.value + 'T12:00:00')) }}
                className="sr-only"
              />

              <button
                onClick={nextDay}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {formatDateParam(selectedDate) !== formatDateParam(new Date()) && (
                <button
                  onClick={goToday}
                  className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider bg-primary/10 text-primary border border-primary/30 rounded-md hover:bg-primary/20 transition-colors"
                >
                  TODAY
                </button>
              )}
            </div>

            {/* League / Sport picker trigger */}
            <div className="relative">
              <button
                onClick={() => setShowLeaguePicker(p => !p)}
                className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg text-[11px] font-mono hover:border-primary/50 transition-colors"
              >
                {activeSportObj?.logo ? (
                  <img
                    src={activeSportObj.logo}
                    alt={activeSportObj.title}
                    className="w-5 h-5 object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : (
                  <Globe className="w-4 h-4 text-primary" />
                )}
                <span className="text-foreground max-w-[160px] truncate font-semibold">
                  {activeSportObj?.title || activeSport}
                </span>
                <span className="text-muted-foreground text-[9px]">
                  {activeSportObj ? `(${activeSportObj.group})` : ''}
                </span>
                {sportsLoading ? (
                  <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                ) : (
                  <ChevronRightIcon className={cn('w-3 h-3 text-muted-foreground transition-transform', showLeaguePicker && 'rotate-90')} />
                )}
              </button>

              {/* League dropdown */}
              {showLeaguePicker && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setShowLeaguePicker(false)} />
                  <div className="absolute top-full left-0 mt-1 z-30 w-80 max-h-96 bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    {/* Search */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                      <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <input
                        autoFocus
                        value={leagueSearch}
                        onChange={e => setLeagueSearch(e.target.value)}
                        placeholder="Search leagues & countries..."
                        className="flex-1 bg-transparent text-[12px] font-mono text-foreground placeholder:text-muted-foreground outline-none"
                      />
                    </div>
                    {/* Grouped list */}
                    <div className="overflow-y-auto flex-1">
                      {Object.entries(groupedSports).map(([group, items]) => (
                        <div key={group}>
                          <div className="px-3 py-1.5 bg-muted/30 border-b border-border/50">
                            <span className="text-[10px] font-mono text-muted-foreground tracking-widest">{group.toUpperCase()}</span>
                          </div>
                          {items.map(s => (
                            <button
                              key={s.key}
                              onClick={() => { setActiveSport(s.key); setShowLeaguePicker(false); setLeagueSearch('') }}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 text-left text-[12px] font-mono transition-colors hover:bg-accent',
                                s.key === activeSport && 'bg-primary/10 text-primary'
                              )}
                            >
                              <img
                                src={`https://placehold.co/20x20/1a2744/ffffff?text=${encodeURIComponent(s.key.slice(0, 2))}`}
                                alt=""
                                className="w-5 h-5 rounded object-contain shrink-0 opacity-60"
                              />
                              <span className="flex-1 truncate">{s.title}</span>
                              {s.key === activeSport && (
                                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      ))}
                      {Object.keys(groupedSports).length === 0 && (
                        <div className="py-8 text-center text-[11px] font-mono text-muted-foreground">
                          No leagues found
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Match count badge */}
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-signal-safe pulse-live" />
              )}
              <span>{loading ? 'Fetching...' : `${matches.length} matches`}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchFixtures(activeSport, selectedDate)}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
              {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </button>
          </div>

          {/* Stats row */}
          <OverviewStats stats={stats} />

          {/* Trap alert banner */}
          {topTrap.length > 0 && !loading && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-signal-trap/40 bg-signal-trap/5 glow-trap">
              <AlertTriangle className="w-4 h-4 text-signal-trap shrink-0 pulse-live" />
              <span className="text-xs font-mono text-signal-trap font-semibold tracking-wide">
                {topTrap.length} {t('dash_trap_confirmed')} {'>'}75
              </span>
              <span className="text-xs text-muted-foreground ml-auto truncate">
                {topTrap.slice(0, 3).map(m => `${m.home_team} vs ${m.away_team}`).join(' · ')}
              </span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive/40 bg-destructive/5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs font-mono text-destructive">API Error: {error}</span>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-12 gap-4">

            {/* Left: Match list */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-3">
              {/* Filter bar */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <div className="flex gap-1">
                  {([
                    { f: 'ALL' as FilterType, key: 'dash_all' },
                    { f: 'TRAPS' as FilterType, key: 'dash_traps' },
                    { f: 'HIGH' as FilterType, key: 'dash_high' },
                    { f: 'CLEAN' as FilterType, key: 'dash_clean' },
                  ]).map(({ f, key }) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider border transition-all',
                        filter === f
                          ? f === 'TRAPS' ? 'bg-signal-trap/20 text-signal-trap border-signal-trap/50'
                            : f === 'HIGH' ? 'bg-signal-warn/20 text-signal-warn border-signal-warn/50'
                            : f === 'CLEAN' ? 'bg-signal-safe/20 text-signal-safe border-signal-safe/50'
                            : 'bg-primary/20 text-primary border-primary/50'
                          : 'text-muted-foreground border-border hover:border-border/80'
                      )}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match cards */}
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-lg border border-border bg-card animate-pulse" />
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      isSelected={selected?.id === match.id}
                      onClick={() => setSelected(match)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Zap className="w-6 h-6 text-muted-foreground mb-2" />
                    <p className="text-xs font-mono text-muted-foreground">
                      {error ? 'No data from API' : `${t('dash_no_matches')}: ${filter}`}
                    </p>
                    {!error && (
                      <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                        Try another date or league
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Detail panel */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
              {selected ? (
                <>
                  {/* Match header with logos */}
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* League row */}
                        <div className="flex items-center gap-2 mb-3">
                          {selected.league_logo && (
                            <img
                              src={selected.league_logo}
                              alt={selected.league}
                              className="w-5 h-5 object-contain rounded"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          )}
                          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{selected.league}</span>
                          <span className="text-muted-foreground/30 text-[9px]">·</span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(selected.kick_off).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', {
                              weekday: 'short', day: '2-digit', month: 'short',
                            })}{' '}
                            {new Date(selected.kick_off).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {selected.rlm_active && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-signal-warn/15 text-signal-warn border border-signal-warn/30 tracking-wider">
                              RLM
                            </span>
                          )}
                          {selected.smart_money_detected && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-signal-neutral/15 text-signal-neutral border border-signal-neutral/30 tracking-wider">
                              SM
                            </span>
                          )}
                        </div>

                        {/* Teams with logos */}
                        <div className="flex items-center gap-4 mb-3">
                          {/* Home team */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full border border-border bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
                              <img
                                src={selected.home_team_logo || `https://placehold.co/40x40/1a2744/ffffff?text=${encodeURIComponent(selected.home_team.slice(0,2))}`}
                                alt={selected.home_team}
                                className="w-8 h-8 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a2744/ffffff?text=${encodeURIComponent(selected.home_team.slice(0,2))}` }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-bold font-mono text-foreground leading-tight">{selected.home_team}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">Home</p>
                            </div>
                          </div>

                          {/* VS */}
                          <div className="flex flex-col items-center gap-0.5 shrink-0">
                            <span className="text-[10px] font-mono text-muted-foreground">VS</span>
                          </div>

                          {/* Away team */}
                          <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                            <div className="text-right">
                              <p className="text-sm font-bold font-mono text-foreground leading-tight">{selected.away_team}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">Away</p>
                            </div>
                            <div className="w-10 h-10 rounded-full border border-border bg-surface-2 flex items-center justify-center overflow-hidden shrink-0">
                              <img
                                src={selected.away_team_logo || `https://placehold.co/40x40/1a2744/ffffff?text=${encodeURIComponent(selected.away_team.slice(0,2))}`}
                                alt={selected.away_team}
                                className="w-8 h-8 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/40x40/1a2744/ffffff?text=${encodeURIComponent(selected.away_team.slice(0,2))}` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Odds row */}
                        <div className="flex items-center gap-4">
                          <MarketOddsRow
                            label={t('dash_opening')}
                            home={selected.analysis.opening_odds_home}
                            draw={selected.analysis.opening_odds_draw}
                            away={selected.analysis.opening_odds_away}
                            hdp={selected.analysis.opening_hdp}
                            muted
                          />
                          <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <MarketOddsRow
                            label={t('dash_current')}
                            home={selected.analysis.current_odds_home}
                            draw={selected.analysis.current_odds_draw}
                            away={selected.analysis.current_odds_away}
                            hdp={selected.analysis.current_hdp}
                          />
                        </div>
                      </div>

                      {/* Trap score gauge */}
                      <div className="shrink-0">
                        <TrapScoreGauge score={selected.analysis.trap_score} size="lg" showLabel />
                      </div>
                    </div>

                    {/* Public volume */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground tracking-wider">{t('dash_public_volume')}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {selected.analysis.public_volume_home}% / {selected.analysis.public_volume_draw}% / {selected.analysis.public_volume_away}%
                        </span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden gap-px">
                        <div className="bg-signal-neutral/70 transition-all duration-700" style={{ width: `${selected.analysis.public_volume_home}%` }} />
                        <div className="bg-muted-foreground/40 transition-all duration-700" style={{ width: `${selected.analysis.public_volume_draw}%` }} />
                        <div className="bg-signal-safe/70 transition-all duration-700" style={{ width: `${selected.analysis.public_volume_away}%` }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] font-mono text-signal-neutral">{selected.home_team}</span>
                        <span className="text-[9px] font-mono text-muted-foreground">Draw</span>
                        <span className="text-[9px] font-mono text-signal-safe">{selected.away_team}</span>
                      </div>
                    </div>

                    {/* Sentiment */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[10px] font-mono text-muted-foreground tracking-wider mb-1">{t('dash_sentiment_analysis')}</p>
                      <p className="text-xs text-foreground/80 leading-relaxed">{selected.sentiment_summary}</p>
                    </div>
                  </div>

                  {/* Algorithm matrix */}
                  <AlgorithmMatrix algorithms={selected.algorithms} />

                  {/* Charts row */}
                  <div className="grid grid-cols-2 gap-4">
                    <OddsMovementChart oddsHistory={selected.odds_history} homeTeam={selected.home_team} awayTeam={selected.away_team} />
                    <TeamStatsPanel homeStats={selected.home_stats} awayStats={selected.away_stats} />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center rounded-xl border border-border bg-card">
                  {loading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-primary mb-3 animate-spin" />
                      <p className="text-sm font-mono text-muted-foreground">Loading matches...</p>
                    </>
                  ) : (
                    <>
                      <Zap className="w-8 h-8 text-muted-foreground mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">{t('dash_select_match')}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-8">
              <SentimentFeed matches={matches} />
            </div>
            <div className="col-span-12 lg:col-span-4">
              <SystemStatus />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function MarketOddsRow({
  label, home, draw, away, hdp, muted = false
}: {
  label: string; home: number; draw: number; away: number; hdp: number; muted?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', muted && 'opacity-50')}>
      <span className="text-[9px] font-mono text-muted-foreground tracking-wider w-12">{label}</span>
      <div className="flex items-center gap-1.5">
        {[{ val: home, label: 'H' }, { val: draw, label: 'D' }, { val: away, label: 'A' }].map(({ val, label: l }) => (
          <span key={l} className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-muted-foreground">{l}</span>
            <span className="text-[11px] font-mono font-bold text-foreground tabular-nums">{val.toFixed(2)}</span>
          </span>
        ))}
        <span className="flex flex-col items-center ml-1">
          <span className="text-[9px] font-mono text-muted-foreground">HDP</span>
          <span className={cn('text-[11px] font-mono font-bold tabular-nums', hdp < 0 ? 'text-signal-warn' : 'text-signal-safe')}>
            {hdp > 0 ? '+' : ''}{hdp}
          </span>
        </span>
      </div>
    </div>
  )
}

function TeamStatsPanel({ homeStats, awayStats }: {
  homeStats: FullMatchAnalysis['home_stats']
  awayStats: FullMatchAnalysis['away_stats']
}) {
  const { t } = useApp()
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-3">{t('dash_poisson_stats')}</p>
      <div className="space-y-3">
        {[
          { label: 'ATK Strength', home: homeStats.attack_strength, away: awayStats.attack_strength, max: 2 },
          { label: 'DEF Strength', home: homeStats.defence_strength, away: awayStats.defence_strength, max: 1.5, invert: true },
          { label: 'Avg Goals', home: homeStats.avg_goals_scored, away: awayStats.avg_goals_scored, max: 4 },
        ].map(row => (
          <div key={row.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-mono text-foreground font-bold tabular-nums">{row.home.toFixed(2)}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{row.label}</span>
              <span className="text-[10px] font-mono text-foreground font-bold tabular-nums">{row.away.toFixed(2)}</span>
            </div>
            <div className="flex gap-0.5 h-1.5 rounded overflow-hidden">
              <div
                className="bg-signal-neutral/60 rounded-l"
                style={{ width: `${(row.home / row.max) * 50}%`, marginLeft: `${50 - (row.home / row.max) * 50}%` }}
              />
              <div className="w-px bg-border" />
              <div className="bg-signal-safe/60 rounded-r" style={{ width: `${(row.away / row.max) * 50}%` }} />
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-border">
          <p className="text-[9px] font-mono text-muted-foreground mb-2 tracking-wider">{t('dash_last_5_form')}</p>
          <div className="flex justify-between">
            {[homeStats.last_5_form, awayStats.last_5_form].map((form, fi) => (
              <div key={fi} className="flex gap-1">
                {form.map((r, i) => (
                  <span key={i} className={cn(
                    'w-5 h-5 rounded text-[9px] font-mono font-bold flex items-center justify-center',
                    r === 'W' ? 'bg-signal-safe/20 text-signal-safe border border-signal-safe/40'
                      : r === 'L' ? 'bg-signal-trap/20 text-signal-trap border border-signal-trap/40'
                      : 'bg-muted text-muted-foreground border border-border'
                  )}>{r}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
