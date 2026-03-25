/**
 * GET /api/analysis?sport=soccer_epl&date=2025-01-15
 *
 * Returns trap-score analysis for all matches in a given sport/date.
 * Wraps fetchFixturesForSport — never throws HTTP 500.
 */
import { NextResponse } from 'next/server'
import { fetchFixturesForSport } from '@/lib/fixtures-engine'
import type { MarketAnalysis } from '@/lib/types'
import { checkEnvVars } from '@/lib/api-helpers'

function getRecommendation(score: number): MarketAnalysis['recommendation'] {
  if (score >= 75) return 'ANTITESIS'
  if (score >= 45) return 'MONITOR'
  if (score < 25) return 'PRO_STATS'
  return 'NEUTRAL'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = (searchParams.get('sport') || 'soccer_epl').trim()
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  console.log('[API/analysis] REQUEST — sport:', sport, '| date:', date)

  const envStatus = checkEnvVars(['ODDS_API_KEY'])
  envStatus.forEach(e => console.log(`[API/analysis] ENV ${e.key}:`, e.present ? e.preview : 'MISSING'))

  try {
    const matches = await fetchFixturesForSport(sport, date)

    const analysis = matches.map(m => ({
      match_id: m.id,
      home_team: m.home_team,
      away_team: m.away_team,
      league: m.league,
      league_logo: m.league_logo,
      home_team_logo: m.home_team_logo,
      away_team_logo: m.away_team_logo,
      kick_off: m.kick_off,
      trap_score: m.analysis.trap_score,
      recommendation: getRecommendation(m.analysis.trap_score),
      confidence: m.analysis.confidence,
      rlm_active: m.rlm_active,
      smart_money_detected: m.smart_money_detected,
      current_hdp: m.analysis.current_hdp,
      opening_hdp: m.analysis.opening_hdp,
      current_odds_home: m.analysis.current_odds_home,
      current_odds_away: m.analysis.current_odds_away,
      current_odds_draw: m.analysis.current_odds_draw,
      public_volume_home: m.analysis.public_volume_home,
      sentiment_score: m.sentiment_score,
      sentiment_summary: m.sentiment_summary,
    }))

    console.log('[API/analysis] SUCCESS — records:', analysis.length)
    return NextResponse.json({ success: true, analysis, total: analysis.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[API/analysis] FAILED:', message)
    if (stack) console.error('[API/analysis] STACK:', stack.split('\n').slice(0, 5).join('\n'))

    return NextResponse.json(
      { success: false, message, analysis: [], total: 0 },
      { status: 200 } // return 200 so frontend doesn't panic — check success flag
    )
  }
}
