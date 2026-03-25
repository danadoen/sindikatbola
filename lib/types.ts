export interface Match {
  id: string
  home_team: string
  away_team: string
  kick_off: string
  league: string
  league_key: string
  league_country: string
  league_logo?: string
  home_team_logo?: string
  away_team_logo?: string
  status: 'scheduled' | 'live' | 'finished'
  home_score?: number
  away_score?: number
}

export interface MarketAnalysis {
  match_id: string
  opening_hdp: number
  current_hdp: number
  opening_odds_home: number
  opening_odds_draw: number
  opening_odds_away: number
  current_odds_home: number
  current_odds_draw: number
  current_odds_away: number
  public_volume_home: number
  public_volume_away: number
  public_volume_draw: number
  trap_score: number
  recommendation: 'ANTITESIS' | 'PRO_STATS' | 'NEUTRAL' | 'MONITOR'
  confidence: number
  last_updated: string
}

export interface AlgorithmResult {
  id: number
  name: string
  engine: 'Python' | 'Node.js'
  score: number
  signal: 'TRAP' | 'SAFE' | 'WARN' | 'NEUTRAL'
  detail: string
  weight: number
}

export interface OddsMovement {
  timestamp: string
  home: number
  draw: number
  away: number
  hdp: number
  volume: number
}

export interface TeamStats {
  team_id: string
  team_name: string
  attack_strength: number
  defence_strength: number
  avg_goals_scored: number
  avg_goals_conceded: number
  last_5_form: ('W' | 'D' | 'L')[]
  poisson_home: number
  poisson_away: number
}

export interface FullMatchAnalysis extends Match {
  analysis: MarketAnalysis
  algorithms: AlgorithmResult[]
  odds_history: OddsMovement[]
  home_stats: TeamStats
  away_stats: TeamStats
  sentiment_score: number
  sentiment_summary: string
  smart_money_detected: boolean
  rlm_active: boolean
}

export interface ApiStatus {
  football_data: 'ok' | 'error' | 'loading'
  odds_api: 'ok' | 'error' | 'loading'
  betstack: 'ok' | 'error' | 'loading'
  oddspapi: 'ok' | 'error' | 'loading'
  rapidapi: 'ok' | 'error' | 'loading'
  last_sync: string
}

export interface DashboardStats {
  active_matches: number
  detected_traps: number
  high_score_alerts: number
  markets_monitored: number
  avg_trap_score: number
  rlm_events_today: number
}
