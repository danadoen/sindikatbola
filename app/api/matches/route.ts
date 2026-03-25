import { NextResponse } from 'next/server'
import type { Match } from '@/lib/types'

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || '1f9bdaa5ab814f6f813c78c396b37ae9'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('dateFrom') || new Date().toISOString().split('T')[0]
  const dateTo = searchParams.get('dateTo') || dateFrom

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&status=SCHEDULED`,
      {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
        next: { revalidate: 1800 },
      }
    )

    if (!res.ok) throw new Error(`Football Data API error: ${res.status}`)
    const data = await res.json()

    const matches: Match[] = (data.matches || []).map((m: Record<string, unknown>) => {
      const homeTeam = m.homeTeam as Record<string, unknown>
      const awayTeam = m.awayTeam as Record<string, unknown>
      const competition = m.competition as Record<string, unknown>
      const area = competition?.area as Record<string, unknown>
      const emblem = competition?.emblem as string | undefined
      return {
        id: String(m.id),
        home_team: String(homeTeam?.name || 'Home Team'),
        away_team: String(awayTeam?.name || 'Away Team'),
        kick_off: String(m.utcDate || new Date().toISOString()),
        league: String(competition?.name || 'Unknown League'),
        league_key: String(competition?.code || 'unknown').toLowerCase(),
        league_country: String(area?.name || 'Unknown'),
        league_logo: emblem || undefined,
        home_team_logo: homeTeam?.crest as string | undefined,
        away_team_logo: awayTeam?.crest as string | undefined,
        status: 'scheduled' as const,
      }
    })

    return NextResponse.json({ matches, source: 'football-data', count: matches.length })
  } catch (err) {
    console.error('[API] Football Data API failed:', err)
    return NextResponse.json({ matches: [], source: 'error', count: 0, error: String(err) }, { status: 500 })
  }
}
