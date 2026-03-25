/**
 * Supabase database helpers for Sindikat Bola.
 * All writes are fire-and-forget with error logging — never crash the main API.
 * Reads fall back to empty arrays if Supabase is unavailable.
 */
import type { FullMatchAnalysis } from '@/lib/types'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  ''

function isConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY)
}

/** Raw REST call helper — avoids importing @supabase/ssr in server utils */
async function sbFetch(
  table: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'UPSERT',
  body?: object,
  query?: string
): Promise<{ data: unknown; error: string | null }> {
  if (!isConfigured()) return { data: null, error: 'Supabase not configured' }

  const endpoint = method === 'UPSERT'
    ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=id`
    : `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`

  try {
    const res = await fetch(endpoint, {
      method: method === 'UPSERT' ? 'POST' : method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: method === 'UPSERT' ? 'resolution=merge-duplicates,return=minimal'
          : method === 'POST' ? 'return=minimal'
          : '',
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    })

    if (!res.ok) {
      const text = await res.text()
      return { data: null, error: `${res.status}: ${text}` }
    }

    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    return { data, error: null }
  } catch (err) {
    return { data: null, error: String(err) }
  }
}

// ─── Matches ────────────────────────────────────────────────────────────────

export async function upsertMatches(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  const rows = matches.map(m => ({
    id: m.id,
    home_team: m.home_team,
    away_team: m.away_team,
    kick_off: m.kick_off,
    league: m.league,
    league_key: m.league_key,
    league_country: m.league_country ?? '',
    league_logo: m.league_logo ?? null,
    home_team_logo: m.home_team_logo ?? null,
    away_team_logo: m.away_team_logo ?? null,
    status: m.status,
    home_score: m.home_score ?? null,
    away_score: m.away_score ?? null,
  }))

  const { error } = await sbFetch('matches', 'UPSERT', rows)
  if (error) console.error('[DB] upsertMatches failed:', error)
}

// ─── Market Analysis ─────────────────────────────────────────────────────────

export async function upsertMarketAnalysis(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  const rows = matches.map(m => ({
    match_id: m.id,
    opening_hdp: m.analysis.opening_hdp,
    current_hdp: m.analysis.current_hdp,
    opening_odds_home: m.analysis.opening_odds_home,
    opening_odds_draw: m.analysis.opening_odds_draw,
    opening_odds_away: m.analysis.opening_odds_away,
    current_odds_home: m.analysis.current_odds_home,
    current_odds_draw: m.analysis.current_odds_draw,
    current_odds_away: m.analysis.current_odds_away,
    public_volume_home: m.analysis.public_volume_home,
    public_volume_draw: m.analysis.public_volume_draw,
    public_volume_away: m.analysis.public_volume_away,
    trap_score: m.analysis.trap_score,
    recommendation: m.analysis.recommendation,
    confidence: m.analysis.confidence,
    rlm_active: m.rlm_active,
    smart_money_detected: m.smart_money_detected,
    sentiment_score: m.sentiment_score,
    sentiment_summary: m.sentiment_summary,
    last_updated: m.analysis.last_updated,
  }))

  const { error } = await sbFetch('market_analysis', 'UPSERT', rows)
  if (error) console.error('[DB] upsertMarketAnalysis failed:', error)
}

// ─── Algorithm Results ───────────────────────────────────────────────────────

export async function upsertAlgorithmResults(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  const rows = matches.flatMap(m =>
    (m.algorithms ?? []).map(a => ({
      match_id: m.id,
      algo_id: a.id,
      name: a.name,
      engine: a.engine,
      score: a.score,
      signal: a.signal,
      detail: a.detail,
      weight: a.weight,
    }))
  )
  if (rows.length === 0) return

  const { error } = await sbFetch('algorithm_results', 'POST', rows)
  if (error) console.error('[DB] upsertAlgorithmResults failed:', error)
}

// ─── Odds History ────────────────────────────────────────────────────────────

export async function insertOddsHistory(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  const rows = matches.flatMap(m =>
    (m.odds_history ?? []).map(o => ({
      match_id: m.id,
      recorded_at: o.timestamp,
      odds_home: o.home,
      odds_draw: o.draw,
      odds_away: o.away,
      hdp: o.hdp,
      volume: o.volume,
    }))
  )
  if (rows.length === 0) return

  const { error } = await sbFetch('odds_history', 'POST', rows)
  if (error) console.error('[DB] insertOddsHistory failed:', error)
}

// ─── Trap Alerts ─────────────────────────────────────────────────────────────

export async function insertTrapAlerts(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  const traps = matches.filter(m => m.analysis.trap_score >= 75)
  if (traps.length === 0) return

  const rows = traps.map(m => ({
    match_id: m.id,
    trap_score: m.analysis.trap_score,
    recommendation: m.analysis.recommendation,
    triggered_at: new Date().toISOString(),
    rlm_active: m.rlm_active,
    smart_money_detected: m.smart_money_detected,
    details: m.sentiment_summary ?? '',
  }))

  const { error } = await sbFetch('trap_alerts', 'POST', rows)
  if (error) console.error('[DB] insertTrapAlerts failed:', error)
}

// ─── Read helpers ─────────────────────────────────────────────────────────────

export async function getRecentTrapAlerts(limit = 20): Promise<unknown[]> {
  if (!isConfigured()) return []
  const { data, error } = await sbFetch(
    'trap_alerts',
    'GET',
    undefined,
    `order=triggered_at.desc&limit=${limit}`
  )
  if (error) console.error('[DB] getRecentTrapAlerts failed:', error)
  return Array.isArray(data) ? data : []
}

export async function getMarketAnalysisByDate(date: string): Promise<unknown[]> {
  if (!isConfigured()) return []
  const { data, error } = await sbFetch(
    'market_analysis',
    'GET',
    undefined,
    `order=trap_score.desc&limit=50`
  )
  if (error) console.error('[DB] getMarketAnalysisByDate failed:', error)
  return Array.isArray(data) ? data : []
}

// ─── Full persist pipeline ────────────────────────────────────────────────────

/**
 * Persist a full batch of matches from the fixtures engine into all
 * relevant Supabase tables. Runs all writes in parallel, fire-and-forget.
 */
export async function persistFixtures(matches: FullMatchAnalysis[]): Promise<void> {
  if (!isConfigured() || matches.length === 0) return

  await Promise.allSettled([
    upsertMatches(matches),
    upsertMarketAnalysis(matches),
    upsertAlgorithmResults(matches),
    insertOddsHistory(matches),
    insertTrapAlerts(matches),
  ])
}
