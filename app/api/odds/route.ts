import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY || 'a1cfd1f640a66c683e9df03209a8e286'
const ODDSPAPI_KEY = process.env.ODDSPAPI_KEY || 'f851b94d-8851-4ff3-a5f6-679e6a525110'

interface OddsAPIGame {
  id: string
  sport_key: string
  sport_title: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: Array<{
    key: string
    title: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sport = searchParams.get('sport') || 'soccer_epl'
  const source = searchParams.get('source') || 'odds_api'

  if (source === 'oddspapi') {
    return await fetchFromOddspapi(sport)
  }
  return await fetchFromOddsAPI(sport)
}

async function fetchFromOddsAPI(sport: string) {
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${ODDS_API_KEY}&regions=eu,uk&markets=h2h,spreads&oddsFormat=decimal`,
      { next: { revalidate: 300 } }
    )

    if (!res.ok) throw new Error(`Odds API error: ${res.status}`)
    const games: OddsAPIGame[] = await res.json()

    const processed = games.slice(0, 10).map(game => {
      const primaryBook = game.bookmakers?.[0]
      const h2h = primaryBook?.markets?.find(m => m.key === 'h2h')
      const spreads = primaryBook?.markets?.find(m => m.key === 'spreads')

      const homeOdds = h2h?.outcomes?.find(o => o.name === game.home_team)?.price || 2.0
      const awayOdds = h2h?.outcomes?.find(o => o.name === game.away_team)?.price || 2.0
      const drawOdds = h2h?.outcomes?.find(o => o.name === 'Draw')?.price || 3.2
      const hdp = spreads?.outcomes?.find(o => o.name === game.home_team)?.price || 0

      return {
        id: game.id,
        home_team: game.home_team,
        away_team: game.away_team,
        commence_time: game.commence_time,
        league: game.sport_title,
        odds: { home: homeOdds, draw: drawOdds, away: awayOdds, hdp },
        bookmaker_count: game.bookmakers?.length || 0,
      }
    })

    return NextResponse.json({ odds: processed, source: 'the-odds-api', count: processed.length })
  } catch (err) {
    console.error('[v0] The Odds API failed:', err)
    return NextResponse.json({
      odds: [],
      source: 'mock',
      error: 'Odds API unavailable. Using cached data.',
    })
  }
}

async function fetchFromOddspapi(sport: string) {
  try {
    const res = await fetch(
      `https://api.oddsapi.io/v4/odds?apikey=${ODDSPAPI_KEY}&sport=${sport}&market=h2h`,
      { next: { revalidate: 60 } }
    )
    if (!res.ok) throw new Error(`OddspAPI error: ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ odds: data, source: 'oddspapi' })
  } catch (err) {
    console.error('[v0] OddspAPI failed:', err)
    return NextResponse.json({ odds: [], source: 'mock', error: 'OddspAPI unavailable.' })
  }
}
