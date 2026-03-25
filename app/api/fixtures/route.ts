/**
 * GET /api/fixtures?sport=soccer_epl&date=2025-01-15
 *
 * Fetches real match data from The Odds API via the fixtures engine.
 * Never returns HTTP 500 — always returns a safe JSON envelope.
 * Falls back to Supabase cache if the external API fails.
 */
import { NextResponse } from 'next/server'
import { fetchFixturesForSport } from '@/lib/fixtures-engine'
import { checkEnvVars } from '@/lib/api-helpers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = (searchParams.get('sport') || 'soccer_epl').trim()
  const dateStr = searchParams.get('date') ?? undefined

  console.log('[API/fixtures] REQUEST — sport:', sport, '| date:', dateStr ?? 'all')

  // Log env var presence (no secrets)
  const envStatus = checkEnvVars(['ODDS_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'])
  envStatus.forEach(e => console.log(`[API/fixtures] ENV ${e.key}:`, e.present ? e.preview : 'MISSING'))

  // ── Try real API ──────────────────────────────────────────────────────────
  try {
    const matches = await fetchFixturesForSport(sport, dateStr)

    console.log('[API/fixtures] SUCCESS — matches returned:', matches.length)

    return NextResponse.json({
      success: true,
      fallback: false,
      matches,
      total: matches.length,
      sport,
      date: dateStr ?? 'all',
      source: 'live',
    })
  } catch (primaryErr) {
    const primaryMsg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr)
    console.error('[API/fixtures] Primary fetch failed:', primaryMsg)

    // ── Try Supabase cache fallback ──────────────────────────────────────
    try {
      const { getMarketAnalysisByDate } = await import('@/lib/supabase/db')
      const cached = await getMarketAnalysisByDate(dateStr ?? new Date().toISOString().split('T')[0])

      if (Array.isArray(cached) && cached.length > 0) {
        console.log('[API/fixtures] FALLBACK — Supabase cache hit:', cached.length)
        return NextResponse.json({
          success: true,
          fallback: true,
          reason: primaryMsg,
          matches: cached,
          total: cached.length,
          sport,
          date: dateStr ?? 'all',
          source: 'cache',
        })
      }
    } catch (cacheErr) {
      console.error('[API/fixtures] Cache fallback also failed:', cacheErr)
    }

    // ── Both failed — return empty but safe response ──────────────────────
    return NextResponse.json({
      success: false,
      fallback: true,
      message: primaryMsg,
      matches: [],
      total: 0,
      sport,
      date: dateStr ?? 'all',
      source: 'error',
    })
  }
}
