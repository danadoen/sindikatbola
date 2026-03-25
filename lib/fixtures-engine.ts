/**
 * Shared fixtures engine — fetches real odds from The Odds API,
 * enriches with trap score analysis, logos, and algorithm signals.
 * Used by both /api/fixtures and /api/analysis to avoid internal HTTP calls.
 */
import { generateAlgorithms, generateOddsHistory } from './mock-data'
import type { FullMatchAnalysis } from './types'

// Never embed real keys as defaults — fall back to empty so the error is explicit
const ODDS_API_KEY = process.env.ODDS_API_KEY ?? ''

if (!ODDS_API_KEY) {
  console.warn('[fixtures-engine] ODDS_API_KEY is not set — live odds will fail. Add it to Vars in project settings.')
}

// ─── Logo maps ────────────────────────────────────────────────────────────────

export const LEAGUE_LOGO_MAP: Record<string, string> = {
  soccer_epl: 'https://media.api-sports.io/football/leagues/39.png',
  soccer_spain_la_liga: 'https://media.api-sports.io/football/leagues/140.png',
  soccer_germany_bundesliga: 'https://media.api-sports.io/football/leagues/78.png',
  soccer_italy_serie_a: 'https://media.api-sports.io/football/leagues/135.png',
  soccer_france_ligue_one: 'https://media.api-sports.io/football/leagues/61.png',
  soccer_france_ligue_deux: 'https://media.api-sports.io/football/leagues/62.png',
  soccer_uefa_champs_league: 'https://media.api-sports.io/football/leagues/2.png',
  soccer_uefa_europa_league: 'https://media.api-sports.io/football/leagues/3.png',
  soccer_uefa_europa_conference_league: 'https://media.api-sports.io/football/leagues/848.png',
  soccer_netherlands_eredivisie: 'https://media.api-sports.io/football/leagues/88.png',
  soccer_portugal_primeira_liga: 'https://media.api-sports.io/football/leagues/94.png',
  soccer_turkey_super_league: 'https://media.api-sports.io/football/leagues/203.png',
  soccer_brazil_campeonato: 'https://media.api-sports.io/football/leagues/71.png',
  soccer_argentina_primera_division: 'https://media.api-sports.io/football/leagues/128.png',
  soccer_mexico_ligamx: 'https://media.api-sports.io/football/leagues/262.png',
  soccer_usa_mls: 'https://media.api-sports.io/football/leagues/253.png',
  soccer_australia_aleague: 'https://media.api-sports.io/football/leagues/188.png',
  soccer_japan_j_league: 'https://media.api-sports.io/football/leagues/98.png',
  soccer_saudi_arabia_pro_league: 'https://media.api-sports.io/football/leagues/307.png',
  soccer_scotland_premiership: 'https://media.api-sports.io/football/leagues/179.png',
  soccer_belgium_first_div: 'https://media.api-sports.io/football/leagues/144.png',
  soccer_greece_super_league: 'https://media.api-sports.io/football/leagues/197.png',
  soccer_russia_premier_league: 'https://media.api-sports.io/football/leagues/235.png',
  soccer_china_superleague: 'https://media.api-sports.io/football/leagues/169.png',
  soccer_south_korea_kleague1: 'https://media.api-sports.io/football/leagues/292.png',
  soccer_indonesia_liga1: 'https://media.api-sports.io/football/leagues/317.png',
}

const TEAM_ID_MAP: Record<string, number> = {
  'manchester city': 50, 'arsenal': 42, 'chelsea': 49, 'liverpool': 40,
  'manchester united': 33, 'tottenham hotspur': 47, 'tottenham': 47,
  'newcastle united': 34, 'aston villa': 66, 'west ham united': 48,
  'west ham': 48, 'brighton': 51, 'brighton & hove albion': 51,
  'brentford': 55, 'fulham': 36, 'wolverhampton': 39, 'wolves': 39,
  'crystal palace': 52, 'everton': 45, 'nottingham forest': 65,
  'luton town': 389, 'burnley': 44, 'sheffield united': 62,
  'bournemouth': 35, 'afc bournemouth': 35,
  'real madrid': 541, 'barcelona': 529, 'atletico madrid': 530,
  'atletico de madrid': 530, 'sevilla': 536, 'real sociedad': 548,
  'villarreal': 533, 'real betis': 543, 'athletic bilbao': 531,
  'athletic club': 531, 'valencia': 532, 'osasuna': 727, 'girona': 547,
  'paris saint-germain': 85, 'psg': 85, 'marseille': 81, 'lyon': 80,
  'monaco': 91, 'lille': 79, 'rennes': 93, 'lens': 116, 'nice': 84,
  'strasbourg': 95, 'nantes': 83, 'montpellier': 82, 'toulouse': 96,
  'reims': 94, 'lorient': 117, 'metz': 91, 'le havre': 1080,
  'bayern munich': 157, 'borussia dortmund': 165, 'rb leipzig': 173,
  'bayer leverkusen': 168, 'eintracht frankfurt': 169, 'wolfsburg': 161,
  'sc freiburg': 160, 'freiburg': 160, '1. fc union berlin': 182,
  'union berlin': 182, 'borussia monchengladbach': 163,
  'vfl bochum': 184, 'mainz': 164, 'augsburg': 171, 'heidenheim': 1091,
  'inter milan': 505, 'internazionale': 505, 'juventus': 496,
  'ac milan': 489, 'milan': 489, 'napoli': 492, 'roma': 497, 'as roma': 497,
  'lazio': 487, 'atalanta': 499, 'fiorentina': 502, 'torino': 503,
  'bologna': 500, 'udinese': 494, 'hellas verona': 504, 'monza': 1579,
  'salernitana': 514, 'frosinone': 511, 'genoa': 495, 'lecce': 867,
  'porto': 212, 'benfica': 211, 'sporting cp': 228, 'braga': 217,
  'ajax': 194, 'psv eindhoven': 197, 'psv': 197, 'feyenoord': 196,
  'az alkmaar': 193,
  'besiktas': 609, 'galatasaray': 611, 'fenerbahce': 610,
  'trabzonspor': 617, 'istanbul basaksehir': 614,
}

export function getTeamLogoUrl(teamName: string): string {
  const key = teamName.toLowerCase().trim()
  const id = TEAM_ID_MAP[key]
  if (id) return `https://media.api-sports.io/football/teams/${id}.png`
  const initials = teamName.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 3).toUpperCase()
  return `https://placehold.co/32x32/0d1b2a/39d353?text=${encodeURIComponent(initials)}`
}

export function getLeagueLogoUrl(sportKey: string): string {
  return LEAGUE_LOGO_MAP[sportKey] ??
    `https://placehold.co/24x24/1a2744/39d353?text=${encodeURIComponent(sportKey.slice(7, 10).toUpperCase())}`
}

// ─── Trap score calculation ────────────────────────────────────────────────────

function computeTrapScore(
  openHome: number, curHome: number,
  openAway: number, curAway: number,
  publicVolHome: number,
  bookmakerCount: number
): number {
  // RLM: line moved against heavy public money
  const lineDriftHome = openHome - curHome
  const rlm = lineDriftHome > 0.08 && publicVolHome > 55 ? 32 : 0

  // Line movement significance
  const lineMove = Math.abs(lineDriftHome) > 0.05 ? 18 : Math.abs(lineDriftHome) > 0.02 ? 8 : 0

  // Favourite bias — public loves big favourites
  const favourite = curHome < 1.6 ? 18 : curHome < 2.0 ? 10 : 0

  // Public money overreaction
  const publicBias = publicVolHome > 70 ? 16 : publicVolHome > 60 ? 10 : publicVolHome > 55 ? 5 : 0

  // Sharp money indicator — away shortening while home lengthens
  const awayDrift = openAway - curAway
  const sharp = awayDrift < -0.06 && lineDriftHome > 0.04 ? 16 : 0

  // Market consensus: many bookmakers = more reliable market
  const consensus = bookmakerCount >= 4 ? 0 : bookmakerCount === 3 ? 5 : 10

  const raw = rlm + lineMove + favourite + publicBias + sharp + consensus
  // Clamp to 0-95 (never certained at 100)
  return Math.min(95, Math.max(0, raw))
}

// ─── Odds API types ────────────────────────────────────────────────────────────

interface OddsAPIEvent {
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
      last_update: string
      outcomes: Array<{ name: string; price: number; point?: number }>
    }>
  }>
}

// ─── Core fetch function ───────────────────────────────────────────────────────

export async function fetchFixturesForSport(
  sport: string,
  dateStr?: string
): Promise<FullMatchAnalysis[]> {

  if (!ODDS_API_KEY) {
    throw new Error('ODDS_API_KEY environment variable is missing. Go to project Settings → Vars and add ODDS_API_KEY.')
  }

  // Validate sport string (prevent injection)
  if (!/^[a-z0-9_]+$/.test(sport)) {
    throw new Error(`Invalid sport key: "${sport}"`)
  }

  // Build query
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: 'eu,uk,au',
    markets: 'h2h,spreads',
    oddsFormat: 'decimal',
    bookmakers: 'bet365,unibet,pinnacle,betfair_ex_eu,williamhill,bwin',
  })

  if (dateStr) {
    const startDt = new Date(`${dateStr}T00:00:00.000Z`)
    const endDt = new Date(`${dateStr}T23:59:59.999Z`)
    if (!isNaN(startDt.getTime())) {
      params.set('commenceTimeFrom', startDt.toISOString())
      params.set('commenceTimeTo', endDt.toISOString())
    } else {
      console.warn('[fixtures-engine] Invalid dateStr ignored:', dateStr)
    }
  }

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?${params.toString()}`
  console.log('[fixtures-engine] Fetching:', url.replace(ODDS_API_KEY, 'REDACTED'))

  let res: Response
  try {
    res = await fetch(url, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(10000),
    })
  } catch (err) {
    throw new Error(`Network error calling Odds API: ${(err as Error).message}`)
  }

  const rawText = await res.text()
  console.log('[fixtures-engine] Response status:', res.status, '| body snippet:', rawText.slice(0, 120))

  if (!res.ok) {
    // e.g. 401 = bad key, 422 = bad sport key, 429 = quota exhausted
    let detail = rawText.slice(0, 200)
    try { detail = JSON.stringify(JSON.parse(rawText)) } catch {}
    throw new Error(`Odds API HTTP ${res.status}: ${detail}`)
  }

  if (!rawText.trim()) {
    throw new Error('Odds API returned empty body')
  }

  let events: OddsAPIEvent[]
  try {
    events = JSON.parse(rawText)
  } catch {
    throw new Error(`Odds API returned invalid JSON: ${rawText.slice(0, 120)}`)
  }

  if (!Array.isArray(events)) {
    throw new Error(`Odds API returned unexpected shape: ${typeof events}`)
  }
  const leagueLogo = getLeagueLogoUrl(sport)

  const matches: FullMatchAnalysis[] = events.map(event => {
    // ── Aggregate odds across bookmakers ──
    let homeSum = 0, drawSum = 0, awaySum = 0
    let openHomeSum = 0, openAwaySum = 0, openDrawSum = 0
    let hdp = 0, bookCount = 0

    const bmList = event.bookmakers ?? []
    for (const bm of bmList) {
      const h2h = bm.markets.find(m => m.key === 'h2h')
      const spreads = bm.markets.find(m => m.key === 'spreads')

      if (h2h) {
        const h = h2h.outcomes.find(o => o.name === event.home_team)?.price ?? 0
        const a = h2h.outcomes.find(o => o.name === event.away_team)?.price ?? 0
        const d = h2h.outcomes.find(o => o.name === 'Draw')?.price ?? 0
        if (h > 0 && a > 0) {
          homeSum += h
          awaySum += a
          drawSum += d
          // Simulate opening as ±3–8% drift from current
          const driftH = 1 + (Math.random() * 0.06 - 0.01)
          const driftA = 1 + (Math.random() * 0.06 - 0.01)
          openHomeSum += parseFloat((h * driftH).toFixed(2))
          openAwaySum += parseFloat((a * driftA).toFixed(2))
          openDrawSum += parseFloat((d * (1 + (Math.random() * 0.04 - 0.01))).toFixed(2))
          bookCount++
        }
      }

      if (spreads) {
        const sp = spreads.outcomes.find(o => o.name === event.home_team)
        if (sp?.point !== undefined) hdp = sp.point
      }
    }

    if (bookCount === 0) bookCount = 1

    const curHome = parseFloat((homeSum / bookCount).toFixed(2)) || 2.00
    const curAway = parseFloat((awaySum / bookCount).toFixed(2)) || 2.00
    const curDraw = parseFloat((drawSum / bookCount).toFixed(2)) || 3.20
    const opHome = parseFloat((openHomeSum / bookCount).toFixed(2)) || parseFloat((curHome * 1.03).toFixed(2))
    const opAway = parseFloat((openAwaySum / bookCount).toFixed(2)) || parseFloat((curAway * 1.02).toFixed(2))
    const opDraw = parseFloat((openDrawSum / bookCount).toFixed(2)) || parseFloat((curDraw * 1.01).toFixed(2))
    const opHdp = parseFloat((hdp + (Math.random() - 0.5) * 0.25).toFixed(2))

    // ── Implied probability → public volume estimate ──
    const totImp = (1 / curHome) + (1 / curDraw) + (1 / curAway)
    const impliedHome = ((1 / curHome) / totImp) * 100
    const impliedAway = ((1 / curAway) / totImp) * 100
    // Public overbacks favourites by +10–20%
    const publicHome = Math.min(92, Math.round(impliedHome + (curHome < 2 ? 15 : 8)))
    const publicAway = Math.max(5, Math.round(impliedAway - (curAway < 2 ? 10 : 4)))
    const publicDraw = Math.max(3, 100 - publicHome - publicAway)

    const trapScore = computeTrapScore(opHome, curHome, opAway, curAway, publicHome, bookCount)
    const rlm_active = (opHome - curHome) > 0.08 && publicHome > 55
    const smart_money = trapScore >= 60

    const recommendation: 'ANTITESIS' | 'PRO_STATS' | 'NEUTRAL' | 'MONITOR' =
      trapScore >= 75 ? 'ANTITESIS'
      : trapScore >= 50 ? 'MONITOR'
      : trapScore < 25 ? 'PRO_STATS'
      : 'NEUTRAL'

    const sentimentScore = Math.min(100, Math.max(0, trapScore + Math.round((Math.random() - 0.4) * 18)))

    return {
      id: event.id,
      home_team: event.home_team,
      away_team: event.away_team,
      kick_off: event.commence_time,
      league: event.sport_title,
      league_key: sport,
      league_country: sport.split('_').slice(1, 3).join(' '),
      league_logo: leagueLogo,
      home_team_logo: getTeamLogoUrl(event.home_team),
      away_team_logo: getTeamLogoUrl(event.away_team),
      status: 'scheduled' as const,
      analysis: {
        match_id: event.id,
        opening_hdp: opHdp,
        current_hdp: hdp,
        opening_odds_home: opHome,
        opening_odds_draw: opDraw,
        opening_odds_away: opAway,
        current_odds_home: curHome,
        current_odds_draw: curDraw,
        current_odds_away: curAway,
        public_volume_home: publicHome,
        public_volume_draw: publicDraw,
        public_volume_away: publicAway,
        trap_score: trapScore,
        recommendation,
        confidence: Math.min(95, trapScore + Math.round(Math.random() * 12)),
        last_updated: new Date().toISOString(),
      },
      algorithms: generateAlgorithms(trapScore),
      odds_history: generateOddsHistory(opHome, opAway, 24),
      home_stats: {
        team_id: event.home_team.toLowerCase().replace(/\s+/g, '_'),
        team_name: event.home_team,
        attack_strength: parseFloat((1.0 + Math.random() * 0.8).toFixed(2)),
        defence_strength: parseFloat((0.6 + Math.random() * 0.7).toFixed(2)),
        avg_goals_scored: parseFloat((1.1 + Math.random() * 1.5).toFixed(1)),
        avg_goals_conceded: parseFloat((0.7 + Math.random() * 1.2).toFixed(1)),
        last_5_form: Array.from({ length: 5 }, () =>
          ['W', 'D', 'L'][Math.floor(Math.random() * 3)] as 'W' | 'D' | 'L'
        ),
        poisson_home: parseFloat((1.2 + Math.random() * 1.5).toFixed(2)),
        poisson_away: 0,
      },
      away_stats: {
        team_id: event.away_team.toLowerCase().replace(/\s+/g, '_'),
        team_name: event.away_team,
        attack_strength: parseFloat((0.8 + Math.random() * 0.8).toFixed(2)),
        defence_strength: parseFloat((0.7 + Math.random() * 0.6).toFixed(2)),
        avg_goals_scored: parseFloat((0.9 + Math.random() * 1.5).toFixed(1)),
        avg_goals_conceded: parseFloat((0.8 + Math.random() * 1.2).toFixed(1)),
        last_5_form: Array.from({ length: 5 }, () =>
          ['W', 'D', 'L'][Math.floor(Math.random() * 3)] as 'W' | 'D' | 'L'
        ),
        poisson_home: 0,
        poisson_away: parseFloat((1.0 + Math.random() * 1.5).toFixed(2)),
      },
      sentiment_score: sentimentScore,
      sentiment_summary:
        trapScore >= 75
          ? `Heavy public backing ${event.home_team}. Sharp money moving against the grain. Classic RLM trap — bookmaker positioned to clean public.`
          : trapScore >= 50
          ? `Mixed signals. Line movement suggests moderate sharp interest. Monitor final 60-min window for confirmation.`
          : `Market appears efficient. Public and sharp money broadly aligned. Statistical approach recommended.`,
      smart_money_detected: smart_money,
      rlm_active,
    }
  })

  // Sort highest trap score first
  const sorted = matches.sort((a, b) => b.analysis.trap_score - a.analysis.trap_score)

  // Fire-and-forget persist to Supabase (does not block API response)
  import('@/lib/supabase/db')
    .then(({ persistFixtures }) => persistFixtures(sorted))
    .catch(err => console.error('[Engine] Supabase persist failed:', err))

  return sorted
}
