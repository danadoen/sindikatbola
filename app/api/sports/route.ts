/**
 * GET /api/sports
 *
 * Returns all available sports/leagues from The Odds API.
 * Falls back to a hardcoded popular-leagues list if the API fails.
 */
import { NextResponse } from 'next/server'
import { getLeagueLogoUrl } from '@/lib/fixtures-engine'
import { safeFetch, assertEnv } from '@/lib/api-helpers'

export interface SportLeague {
  key: string
  group: string
  title: string
  description: string
  active: boolean
  has_outrights: boolean
  logo?: string
  flag?: string
  is_soccer?: boolean
}

const GROUP_FLAGS: Record<string, string> = {
  'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Brazil': '🇧🇷',
  'Chile': '🇨🇱', 'China': '🇨🇳', 'Colombia': '🇨🇴', 'Croatia': '🇭🇷',
  'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'France': '🇫🇷',
  'Germany': '🇩🇪', 'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'India': '🇮🇳',
  'Indonesia': '🇮🇩', 'Ireland': '🇮🇪', 'Italy': '🇮🇹', 'Japan': '🇯🇵',
  'Korea': '🇰🇷', 'Malaysia': '🇲🇾', 'Mexico': '🇲🇽', 'Netherlands': '🇳🇱',
  'Norway': '🇳🇴', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Romania': '🇷🇴',
  'Russia': '🇷🇺', 'Saudi Arabia': '🇸🇦', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'Spain': '🇪🇸',
  'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦',
  'USA': '🇺🇸', 'Uruguay': '🇺🇾', 'Europe': '🇪🇺', 'South America': '🌎',
  'World': '🌍', 'Asia': '🌏', 'Africa': '🌍', 'International': '🌐',
}

// Fallback list when API is unavailable
const FALLBACK_SPORTS: SportLeague[] = [
  { key: 'soccer_epl', group: 'England', title: 'English Premier League', description: 'EPL', active: true, has_outrights: false },
  { key: 'soccer_spain_la_liga', group: 'Spain', title: 'La Liga', description: 'Spain Primera', active: true, has_outrights: false },
  { key: 'soccer_germany_bundesliga', group: 'Germany', title: 'Bundesliga', description: 'Germany 1. Bundesliga', active: true, has_outrights: false },
  { key: 'soccer_italy_serie_a', group: 'Italy', title: 'Serie A', description: 'Italy Serie A', active: true, has_outrights: false },
  { key: 'soccer_france_ligue_one', group: 'France', title: 'Ligue 1', description: 'France Ligue 1', active: true, has_outrights: false },
  { key: 'soccer_uefa_champs_league', group: 'Europe', title: 'UEFA Champions League', description: 'UCL', active: true, has_outrights: false },
  { key: 'soccer_uefa_europa_league', group: 'Europe', title: 'UEFA Europa League', description: 'UEL', active: true, has_outrights: false },
  { key: 'soccer_netherlands_eredivisie', group: 'Netherlands', title: 'Eredivisie', description: 'Netherlands', active: true, has_outrights: false },
  { key: 'soccer_portugal_primeira_liga', group: 'Portugal', title: 'Primeira Liga', description: 'Portugal', active: true, has_outrights: false },
  { key: 'soccer_turkey_super_league', group: 'Turkey', title: 'Super Lig', description: 'Turkey', active: true, has_outrights: false },
  { key: 'soccer_brazil_campeonato', group: 'Brazil', title: 'Campeonato Brasileiro', description: 'Brazil', active: true, has_outrights: false },
  { key: 'soccer_usa_mls', group: 'USA', title: 'MLS', description: 'Major League Soccer', active: true, has_outrights: false },
  { key: 'soccer_saudi_arabia_pro_league', group: 'Saudi Arabia', title: 'Saudi Pro League', description: 'Saudi Arabia', active: true, has_outrights: false },
  { key: 'soccer_indonesia_liga1', group: 'Indonesia', title: 'Liga 1 Indonesia', description: 'Indonesia Liga 1', active: true, has_outrights: false },
  { key: 'soccer_japan_j_league', group: 'Japan', title: 'J1 League', description: 'Japan J1', active: true, has_outrights: false },
  { key: 'soccer_south_korea_kleague1', group: 'Korea', title: 'K League 1', description: 'South Korea K1', active: true, has_outrights: false },
  { key: 'soccer_belgium_first_div', group: 'Belgium', title: 'First Division A', description: 'Belgium', active: true, has_outrights: false },
  { key: 'soccer_scotland_premiership', group: 'Scotland', title: 'Scottish Premiership', description: 'Scotland', active: true, has_outrights: false },
]

function enrichSports(sports: SportLeague[]): SportLeague[] {
  return sports
    .filter(s => s.active)
    .map(s => ({
      ...s,
      flag: GROUP_FLAGS[s.group] ?? '',
      logo: getLeagueLogoUrl(s.key),
      is_soccer: s.key.startsWith('soccer_'),
    }))
    .sort((a, b) => {
      if (a.is_soccer && !b.is_soccer) return -1
      if (!a.is_soccer && b.is_soccer) return 1
      return a.group.localeCompare(b.group)
    })
}

export async function GET() {
  console.log('[API/sports] REQUEST')

  const ODDS_API_KEY = assertEnv('ODDS_API_KEY', 'a1cfd1f640a66c683e9df03209a8e286')

  const url = `https://api.the-odds-api.com/v4/sports?apiKey=${ODDS_API_KEY}&all=true`
  const result = await safeFetch<SportLeague[]>(url, {
    label: 'SportsAPI',
    timeoutMs: 8000,
    next: { revalidate: 3600 },
  } as RequestInit & { timeoutMs: number; label: string })

  if (result.ok && Array.isArray(result.data)) {
    const sports = enrichSports(result.data)
    console.log('[API/sports] SUCCESS — leagues:', sports.length)
    return NextResponse.json({ success: true, sports, total: sports.length, source: 'live' })
  }

  // Fallback
  console.warn('[API/sports] Using fallback sports list. Reason:', result.error)
  const sports = enrichSports(FALLBACK_SPORTS)
  return NextResponse.json({
    success: true,
    fallback: true,
    reason: result.error,
    sports,
    total: sports.length,
    source: 'fallback',
  })
}
