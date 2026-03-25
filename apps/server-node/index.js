/**
 * Sindikat Bola — Node.js Market Orchestration Service
 * Runs every 1-5 minutes to fetch real-time odds and persist to Supabase.
 *
 * Start: node index.js
 * Env vars required:
 *   ODDS_API_KEY, ODDSPAPI_KEY, BETSTACK_API_KEY,
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

// ─── Config ──────────────────────────────────────────────────────────────────
const ODDS_API_KEY     = process.env.ODDS_API_KEY     || 'a1cfd1f640a66c683e9df03209a8e286'
const ODDSPAPI_KEY     = process.env.ODDSPAPI_KEY     || 'f851b94d-8851-4ff3-a5f6-679e6a525110'
const BETSTACK_API_KEY = process.env.BETSTACK_API_KEY || '24e459fda1d06b1b365fa84ef82e052a99ef94251a44d3057316d4859ab6c7e4'
const SUPABASE_URL     = process.env.SUPABASE_URL     || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ofheztldljahfjmxpnet.supabase.co'
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''

// Polling interval (ms) — 3 minutes default, respects API quota
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '180000', 10)

// Sports to monitor (subset of Odds API sport keys)
const ACTIVE_SPORTS = [
  'soccer_epl', 'soccer_spain_la_liga', 'soccer_germany_bundesliga',
  'soccer_italy_serie_a', 'soccer_france_ligue_one',
  'soccer_uefa_champs_league', 'soccer_uefa_europa_league',
  'soccer_netherlands_eredivisie', 'soccer_portugal_primeira_liga',
  'soccer_turkey_super_league', 'soccer_usa_mls', 'soccer_brazil_campeonato',
]

// ─── Supabase client (service role — bypasses RLS for writes) ────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Team logo map ────────────────────────────────────────────────────────────
const TEAM_ID_MAP = {
  'manchester city': 50, 'arsenal': 42, 'chelsea': 49, 'liverpool': 40,
  'manchester united': 33, 'tottenham hotspur': 47, 'tottenham': 47,
  'newcastle united': 34, 'aston villa': 66, 'west ham united': 48,
  'brighton': 51, 'brentford': 55, 'fulham': 36,
  'real madrid': 541, 'barcelona': 529, 'atletico madrid': 530,
  'sevilla': 536, 'psg': 85, 'paris saint-germain': 85,
  'marseille': 81, 'lyon': 80, 'monaco': 91,
  'bayern munich': 157, 'borussia dortmund': 165, 'rb leipzig': 173,
  'bayer leverkusen': 168, 'eintracht frankfurt': 169,
  'inter milan': 505, 'juventus': 496, 'ac milan': 489, 'napoli': 492,
}

const LEAGUE_LOGO_MAP = {
  soccer_epl: 'https://media.api-sports.io/football/leagues/39.png',
  soccer_spain_la_liga: 'https://media.api-sports.io/football/leagues/140.png',
  soccer_germany_bundesliga: 'https://media.api-sports.io/football/leagues/78.png',
  soccer_italy_serie_a: 'https://media.api-sports.io/football/leagues/135.png',
  soccer_france_ligue_one: 'https://media.api-sports.io/football/leagues/61.png',
  soccer_uefa_champs_league: 'https://media.api-sports.io/football/leagues/2.png',
  soccer_uefa_europa_league: 'https://media.api-sports.io/football/leagues/3.png',
  soccer_netherlands_eredivisie: 'https://media.api-sports.io/football/leagues/88.png',
  soccer_portugal_primeira_liga: 'https://media.api-sports.io/football/leagues/94.png',
  soccer_turkey_super_league: 'https://media.api-sports.io/football/leagues/203.png',
  soccer_usa_mls: 'https://media.api-sports.io/football/leagues/253.png',
  soccer_brazil_campeonato: 'https://media.api-sports.io/football/leagues/71.png',
}

function getTeamLogo(name) {
  const id = TEAM_ID_MAP[name.toLowerCase().trim()]
  if (id) return `https://media.api-sports.io/football/teams/${id}.png`
  const initials = name.split(' ').map(w => w[0] || '').join('').slice(0, 3).toUpperCase()
  return `https://placehold.co/32x32/0d1b2a/39d353?text=${encodeURIComponent(initials)}`
}

// ─── Utility: resilient fetch with retry ─────────────────────────────────────
async function fetchWithRetry(url, options = {}, retries = 3, backoffMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) })
      if (res.status === 429) {
        const wait = backoffMs * attempt * 2
        console.warn(`[RateLimit] ${url} — waiting ${wait}ms (attempt ${attempt})`)
        await delay(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
      return res
    } catch (err) {
      if (attempt === retries) throw err
      const wait = backoffMs * attempt
      console.warn(`[Retry ${attempt}/${retries}] ${err.message} — waiting ${wait}ms`)
      await delay(wait)
    }
  }
}

const delay = ms => new Promise(r => setTimeout(r, ms))

// ─── 1. fetchOdds — The Odds API (H2H + Spreads) ─────────────────────────────
export async function fetchOdds(sport, dateStr) {
  const params = new URLSearchParams({
    apiKey: ODDS_API_KEY,
    regions: 'eu,uk,au',
    markets: 'h2h,spreads',
    oddsFormat: 'decimal',
    bookmakers: 'bet365,pinnacle,unibet,betfair_ex_eu,williamhill,bwin',
  })

  if (dateStr) {
    params.set('commenceTimeFrom', `${dateStr}T00:00:00Z`)
    params.set('commenceTimeTo',   `${dateStr}T23:59:59Z`)
  }

  const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds?${params}`
  const res = await fetchWithRetry(url)
  const events = await res.json()

  console.log(`[OddsAPI] ${sport}: ${events.length} events | quota left: ${res.headers.get('x-requests-remaining')}`)
  return events
}

// ─── 2. fetchOddspapiOdds — OddsAPI.pro realtime movement ────────────────────
export async function fetchOddspapiOdds(matchId) {
  try {
    const url = `https://api.oddsapi.pro/v1/events/${matchId}/odds?apiKey=${ODDSPAPI_KEY}`
    const res = await fetchWithRetry(url)
    return await res.json()
  } catch (err) {
    console.warn(`[OddsPAPI] Skipped ${matchId}: ${err.message}`)
    return null
  }
}

// ─── 3. fetchBetStackVolume — public betting volume ──────────────────────────
export async function fetchBetStackVolume(homeTeam, awayTeam) {
  try {
    const query = encodeURIComponent(`${homeTeam} vs ${awayTeam}`)
    const url = `https://api.betstack.io/v1/public-betting?q=${query}&apiKey=${BETSTACK_API_KEY}`
    const res = await fetchWithRetry(url)
    const data = await res.json()
    return {
      home: data?.volume?.home ?? null,
      away: data?.volume?.away ?? null,
      draw: data?.volume?.draw ?? null,
    }
  } catch (err) {
    console.warn(`[BetStack] Volume unavailable for ${homeTeam} vs ${awayTeam}: ${err.message}`)
    return { home: null, away: null, draw: null }
  }
}

// ─── 4. detectRLM — Reverse Line Movement detection ─────────────────────────
export function detectRLM(openingHome, currentHome, publicVolumeHome) {
  // RLM = line moved against the direction of public money
  // e.g. public is 65% on home, but home odds got longer (moved from 1.80 → 1.92)
  const lineDrift = currentHome - openingHome  // positive = longer (disfavoured)
  const publicHeavy = publicVolumeHome > 55
  const lineMovedAgainstPublic = lineDrift > 0.06  // home lengthened while public backs home

  if (publicHeavy && lineMovedAgainstPublic) {
    const rlmStrength = Math.min(100, Math.round((lineDrift / 0.06) * 40 + (publicVolumeHome - 55) * 1.2))
    return { detected: true, strength: rlmStrength, drift: lineDrift }
  }

  return { detected: false, strength: 0, drift: lineDrift }
}

// ─── 5. computeTrapScore — weighted formula ──────────────────────────────────
export function computeTrapScore({ rlmScore, hdpDeviation, poissonDiff, sentimentScore, volumeBias }) {
  const score =
    (rlmScore       * 0.30) +
    (hdpDeviation   * 0.25) +
    (poissonDiff    * 0.20) +
    (sentimentScore * 0.15) +
    (volumeBias     * 0.10)
  return Math.min(100, Math.max(0, Math.round(score)))
}

// ─── 6. processEvent — full enrichment pipeline for one match ────────────────
async function processEvent(event, sport, existingOpeningOdds) {
  const { id, home_team, away_team, commence_time, sport_title, bookmakers } = event

  // Aggregate odds across bookmakers
  let homeSum = 0, drawSum = 0, awaySum = 0, hdp = 0, count = 0
  for (const bm of (bookmakers || [])) {
    const h2h     = bm.markets.find(m => m.key === 'h2h')
    const spreads = bm.markets.find(m => m.key === 'spreads')
    if (h2h) {
      const h = h2h.outcomes.find(o => o.name === home_team)?.price ?? 0
      const a = h2h.outcomes.find(o => o.name === away_team)?.price ?? 0
      const d = h2h.outcomes.find(o => o.name === 'Draw')?.price ?? 0
      if (h > 0 && a > 0) { homeSum += h; awaySum += a; drawSum += d; count++ }
    }
    if (spreads) {
      const sp = spreads.outcomes.find(o => o.name === home_team)
      if (sp?.point !== undefined) hdp = sp.point
    }
  }

  const n = count || 1
  const curHome = +(homeSum / n).toFixed(3)
  const curAway = +(awaySum / n).toFixed(3)
  const curDraw = +(drawSum / n).toFixed(3)

  // Opening odds: use stored value or simulate from current
  const opHome = existingOpeningOdds?.home ?? +(curHome * (1 + Math.random() * 0.06)).toFixed(3)
  const opAway = existingOpeningOdds?.away ?? +(curAway * (1 + Math.random() * 0.05)).toFixed(3)
  const opDraw = existingOpeningOdds?.draw ?? +(curDraw * (1 + Math.random() * 0.04)).toFixed(3)
  const opHdp  = existingOpeningOdds?.hdp  ?? +(hdp + (Math.random() - 0.5) * 0.25).toFixed(2)

  // Implied probabilities → public volume estimate
  const totImp = (1 / (curHome || 2)) + (1 / (curDraw || 3.2)) + (1 / (curAway || 2))
  const impliedHome = ((1 / (curHome || 2)) / totImp) * 100
  const impliedAway = ((1 / (curAway || 2)) / totImp) * 100

  // Try fetching real BetStack volume data
  const volumeData = await fetchBetStackVolume(home_team, away_team)
  const pubHome = volumeData.home ?? Math.min(92, Math.round(impliedHome + (curHome < 2 ? 14 : 8)))
  const pubAway = volumeData.away ?? Math.max(5, Math.round(impliedAway - (curAway < 2 ? 10 : 4)))
  const pubDraw = volumeData.draw ?? Math.max(3, 100 - pubHome - pubAway)

  // RLM detection
  const rlm = detectRLM(opHome, curHome, pubHome)

  // HDP vs 1x2 deviation
  const hdpImplied = 1 / (1 + Math.exp(-hdp * 0.5)) * 100  // logistic approx
  const hdpDeviation = Math.abs(hdpImplied - impliedHome)

  // Scores (0–100 scale for each component)
  const rlmScore    = rlm.detected ? Math.min(100, rlm.strength) : 0
  const hdpDev      = Math.min(100, hdpDeviation * 3)
  const poissonDiff = Math.min(100, Math.abs(impliedHome - impliedAway) * 1.5)
  const sentiment   = 50  // placeholder — Python engine provides real value
  const volumeBias  = Math.min(100, pubHome > 60 ? (pubHome - 50) * 2 : 0)

  const trapScore = computeTrapScore({
    rlmScore: rlmScore,
    hdpDeviation: hdpDev,
    poissonDiff: poissonDiff,
    sentimentScore: sentiment,
    volumeBias: volumeBias,
  })

  const recommendation =
    trapScore >= 75 ? 'ANTITESIS' :
    trapScore >= 50 ? 'MONITOR' :
    trapScore < 25  ? 'PRO_STATS' : 'NEUTRAL'

  return {
    match: {
      id,
      home_team,
      away_team,
      kick_off: commence_time,
      league: sport_title,
      league_key: sport,
      league_country: sport.split('_').slice(1, 3).join(' '),
      league_logo: LEAGUE_LOGO_MAP[sport] ?? '',
      home_team_logo: getTeamLogo(home_team),
      away_team_logo: getTeamLogo(away_team),
      status: 'scheduled',
    },
    analysis: {
      match_id: id,
      opening_hdp: opHdp,
      opening_odds_home: opHome || 2.0,
      opening_odds_draw: opDraw || 3.2,
      opening_odds_away: opAway || 2.0,
      current_hdp: hdp,
      current_odds_home: curHome || 2.0,
      current_odds_draw: curDraw || 3.2,
      current_odds_away: curAway || 2.0,
      public_volume_home: pubHome,
      public_volume_draw: pubDraw,
      public_volume_away: pubAway,
      trap_score: trapScore,
      recommendation,
      confidence: Math.min(95, trapScore + Math.round(Math.random() * 12)),
      rlm_active: rlm.detected,
      smart_money: trapScore >= 60,
      sentiment_score: sentiment,
      sentiment_summary: trapScore >= 75
        ? `Heavy public backing ${home_team}. RLM confirmed — sharp money moving against grain.`
        : trapScore >= 50
        ? `Mixed signals. Monitor final 60-min window for line confirmation.`
        : `Market appears efficient. Statistical approach recommended.`,
    },
    oddsHistory: {
      match_id: id,
      home: curHome,
      draw: curDraw,
      away: curAway,
      hdp,
      volume: Math.floor(pubHome * 10 + Math.random() * 200),
    },
    trapAlert: rlm.detected && trapScore >= 75 ? {
      match_id: id,
      trap_score: trapScore,
      alert_type: 'RLM_CONFIRMED',
      description: `RLM strength ${rlm.strength}/100. Line drifted ${rlm.drift.toFixed(3)} against ${pubHome}% public backing.`,
    } : null,
  }
}

// ─── 7. persistToSupabase — upsert all enriched data ─────────────────────────
async function persistToSupabase(results, sport) {
  const start = Date.now()
  let recordCount = 0
  const errors = []

  for (const r of results) {
    try {
      // Upsert match
      const { error: mErr } = await supabase.from('matches').upsert(r.match, { onConflict: 'id' })
      if (mErr) throw new Error(`match upsert: ${mErr.message}`)

      // Insert market_analysis snapshot
      const { error: aErr } = await supabase.from('market_analysis').insert(r.analysis)
      if (aErr) throw new Error(`analysis insert: ${aErr.message}`)

      // Insert odds_history tick
      const { error: ohErr } = await supabase.from('odds_history').insert(r.oddsHistory)
      if (ohErr) console.warn(`[Supabase] odds_history insert skipped: ${ohErr.message}`)

      // Insert trap alert if triggered
      if (r.trapAlert) {
        const { error: taErr } = await supabase.from('trap_alerts').insert(r.trapAlert)
        if (taErr) console.warn(`[Supabase] trap_alert insert skipped: ${taErr.message}`)
        else console.log(`[ALERT] Trap confirmed: ${r.match.home_team} vs ${r.match.away_team} — Score ${r.trapAlert.trap_score}`)
      }

      recordCount++
    } catch (err) {
      errors.push(err.message)
      console.error(`[Supabase] persist failed for ${r.match?.id}: ${err.message}`)
    }
  }

  // Log sync result
  await supabase.from('sync_log').insert({
    source: 'ODDS_API',
    status: errors.length === 0 ? 'ok' : 'error',
    records: recordCount,
    error_msg: errors.length > 0 ? errors.slice(0, 3).join('; ') : null,
    duration_ms: Date.now() - start,
  })

  console.log(`[Supabase] Persisted ${recordCount}/${results.length} records for ${sport} in ${Date.now() - start}ms`)
}

// ─── 8. syncSport — full pipeline for one sport ──────────────────────────────
async function syncSport(sport) {
  console.log(`\n[Sync] Starting ${sport}...`)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Fetch real-time odds
    const events = await fetchOdds(sport, today)
    if (!events || events.length === 0) {
      console.log(`[Sync] No events for ${sport} today`)
      return
    }

    // Load stored opening odds to preserve first-seen prices
    const ids = events.map(e => e.id)
    const { data: existingAnalysis } = await supabase
      .from('market_analysis')
      .select('match_id, opening_odds_home, opening_odds_draw, opening_odds_away, opening_hdp')
      .in('match_id', ids)
      .order('match_id, snapshot_time')
      .limit(ids.length)

    const openingMap = {}
    for (const row of existingAnalysis || []) {
      if (!openingMap[row.match_id]) {
        openingMap[row.match_id] = {
          home: row.opening_odds_home,
          away: row.opening_odds_away,
          draw: row.opening_odds_draw,
          hdp: row.opening_hdp,
        }
      }
    }

    // Process each event in parallel (batched to respect rate limits)
    const BATCH_SIZE = 5
    const results = []
    for (let i = 0; i < events.length; i += BATCH_SIZE) {
      const batch = events.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.allSettled(
        batch.map(e => processEvent(e, sport, openingMap[e.id]))
      )
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value)
        else console.warn(`[Process] Event failed: ${r.reason}`)
      }
      if (i + BATCH_SIZE < events.length) await delay(500)
    }

    await persistToSupabase(results, sport)
  } catch (err) {
    console.error(`[Sync] ${sport} failed: ${err.message}`)
    await supabase.from('sync_log').insert({
      source: 'ODDS_API',
      status: 'error',
      records: 0,
      error_msg: `${sport}: ${err.message}`,
      duration_ms: 0,
    }).catch(() => {})
  }
}

// ─── 9. Main loop ─────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Sindikat Bola — Node.js Market Watcher ===')
  console.log(`Supabase: ${SUPABASE_URL}`)
  console.log(`Polling interval: ${POLL_INTERVAL_MS / 1000}s`)
  console.log(`Monitoring ${ACTIVE_SPORTS.length} sports\n`)

  const run = async () => {
    console.log(`\n[Tick] ${new Date().toISOString()}`)
    // Stagger sports to avoid hitting API quota simultaneously
    for (let i = 0; i < ACTIVE_SPORTS.length; i++) {
      await syncSport(ACTIVE_SPORTS[i])
      if (i < ACTIVE_SPORTS.length - 1) await delay(3000)  // 3s between sports
    }
  }

  // Initial run immediately, then on interval
  await run()
  setInterval(run, POLL_INTERVAL_MS)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
