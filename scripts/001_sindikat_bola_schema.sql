-- ============================================================
-- Sindikat Bola — Database Schema
-- Supabase PostgreSQL + Realtime
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ─────────────────────────────────────────────────────────────
-- 1. MATCHES — master match registry
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id                TEXT PRIMARY KEY,                        -- Odds API event ID
  home_team         TEXT NOT NULL,
  away_team         TEXT NOT NULL,
  kick_off          TIMESTAMPTZ NOT NULL,
  league            TEXT NOT NULL,
  league_key        TEXT NOT NULL,
  league_country    TEXT,
  league_logo       TEXT,
  home_team_logo    TEXT,
  away_team_logo    TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled'        -- scheduled | live | finished
                    CHECK (status IN ('scheduled','live','finished')),
  home_score        INTEGER,
  away_score        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_kick_off    ON public.matches (kick_off);
CREATE INDEX IF NOT EXISTS idx_matches_league_key  ON public.matches (league_key);
CREATE INDEX IF NOT EXISTS idx_matches_status      ON public.matches (status);

-- ─────────────────────────────────────────────────────────────
-- 2. MARKET_ANALYSIS — odds + trap score per match snapshot
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.market_analysis (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id            TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  snapshot_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Opening odds
  opening_hdp         NUMERIC(6,2),
  opening_odds_home   NUMERIC(6,3),
  opening_odds_draw   NUMERIC(6,3),
  opening_odds_away   NUMERIC(6,3),

  -- Current odds
  current_hdp         NUMERIC(6,2),
  current_odds_home   NUMERIC(6,3),
  current_odds_draw   NUMERIC(6,3),
  current_odds_away   NUMERIC(6,3),

  -- Public volume %
  public_volume_home  INTEGER,
  public_volume_draw  INTEGER,
  public_volume_away  INTEGER,

  -- Trap detection
  trap_score          NUMERIC(5,2) NOT NULL DEFAULT 0
                      CHECK (trap_score >= 0 AND trap_score <= 100),
  recommendation      TEXT NOT NULL DEFAULT 'NEUTRAL'
                      CHECK (recommendation IN ('ANTITESIS','PRO_STATS','NEUTRAL','MONITOR')),
  confidence          INTEGER,

  -- Flags
  rlm_active          BOOLEAN NOT NULL DEFAULT FALSE,
  smart_money         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sentiment
  sentiment_score     NUMERIC(5,2),
  sentiment_summary   TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_match_id      ON public.market_analysis (match_id);
CREATE INDEX IF NOT EXISTS idx_ma_snapshot_time ON public.market_analysis (snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_ma_trap_score    ON public.market_analysis (trap_score DESC);

-- Latest snapshot per match (materialised view used by dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.latest_market_analysis AS
  SELECT DISTINCT ON (match_id) *
  FROM public.market_analysis
  ORDER BY match_id, snapshot_time DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lma_match_id ON public.latest_market_analysis (match_id);

-- ─────────────────────────────────────────────────────────────
-- 3. ODDS_HISTORY — minute-by-minute line movement log
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.odds_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  home        NUMERIC(6,3),
  draw        NUMERIC(6,3),
  away        NUMERIC(6,3),
  hdp         NUMERIC(6,2),
  volume      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_oh_match_ts ON public.odds_history (match_id, ts DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. ALGORITHM_RESULTS — per-match per-algorithm output
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.algorithm_results (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id    TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  run_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  algo_id     INTEGER NOT NULL,
  algo_name   TEXT NOT NULL,
  engine      TEXT NOT NULL CHECK (engine IN ('Python','Node.js')),
  score       NUMERIC(5,2),
  signal      TEXT CHECK (signal IN ('TRAP','WARN','NEUTRAL','SAFE')),
  detail      TEXT,
  weight      NUMERIC(4,3)
);

CREATE INDEX IF NOT EXISTS idx_ar_match_id ON public.algorithm_results (match_id);
CREATE INDEX IF NOT EXISTS idx_ar_run_at   ON public.algorithm_results (run_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 5. HISTORICAL_STATS — team attack/defence ratings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.historical_stats (
  team_id              TEXT PRIMARY KEY,
  team_name            TEXT NOT NULL,
  league_key           TEXT,
  attack_strength      NUMERIC(5,3),
  defence_strength     NUMERIC(5,3),
  avg_goals_scored     NUMERIC(5,2),
  avg_goals_conceded   NUMERIC(5,2),
  last_5_form          TEXT[],             -- e.g. ['W','W','D','L','W']
  poisson_home         NUMERIC(5,3),
  poisson_away         NUMERIC(5,3),
  last_5_games_weight  NUMERIC(5,3),       -- weighted recency factor (0.6 on last 3)
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 6. TRAP_ALERTS — high-confidence trap events
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trap_alerts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id       TEXT NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  triggered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trap_score     NUMERIC(5,2) NOT NULL,
  alert_type     TEXT NOT NULL,    -- RLM_CONFIRMED | SMART_MONEY | HDP_DEVIATION | SENTIMENT_SPIKE
  description    TEXT,
  acknowledged   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ta_triggered_at ON public.trap_alerts (triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_ta_match_id     ON public.trap_alerts (match_id);

-- ─────────────────────────────────────────────────────────────
-- 7. SYNC_LOG — API health & sync tracking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_log (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source       TEXT NOT NULL,   -- ODDS_API | BETSTACK | FOOTBALL_DATA | RAPIDAPI | ODDSPAPI
  status       TEXT NOT NULL CHECK (status IN ('ok','error','rate_limited')),
  records      INTEGER NOT NULL DEFAULT 0,
  quota_used   INTEGER,
  quota_left   INTEGER,
  error_msg    TEXT,
  duration_ms  INTEGER
);

CREATE INDEX IF NOT EXISTS idx_sl_synced_at ON public.sync_log (synced_at DESC);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security (RLS) — read-only for anon, write via service_role
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.matches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.algorithm_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trap_alerts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_log           ENABLE ROW LEVEL SECURITY;

-- Public read access (dashboard is public-facing)
CREATE POLICY "anon_read_matches"           ON public.matches           FOR SELECT USING (true);
CREATE POLICY "anon_read_market_analysis"   ON public.market_analysis   FOR SELECT USING (true);
CREATE POLICY "anon_read_odds_history"      ON public.odds_history      FOR SELECT USING (true);
CREATE POLICY "anon_read_algorithm_results" ON public.algorithm_results FOR SELECT USING (true);
CREATE POLICY "anon_read_historical_stats"  ON public.historical_stats  FOR SELECT USING (true);
CREATE POLICY "anon_read_trap_alerts"       ON public.trap_alerts       FOR SELECT USING (true);
CREATE POLICY "anon_read_sync_log"          ON public.sync_log          FOR SELECT USING (true);

-- Service role write access (backend services use SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "service_write_matches"           ON public.matches           FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_market_analysis"   ON public.market_analysis   FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_odds_history"      ON public.odds_history      FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_algorithm_results" ON public.algorithm_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_historical_stats"  ON public.historical_stats  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_trap_alerts"       ON public.trap_alerts       FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_sync_log"          ON public.sync_log          FOR ALL USING (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- Realtime publications (for UI live updates)
-- ─────────────────────────────────────────────────────────────
BEGIN;
  DROP PUBLICATION IF EXISTS sindikat_realtime;
  CREATE PUBLICATION sindikat_realtime
    FOR TABLE public.matches,
              public.market_analysis,
              public.odds_history,
              public.trap_alerts;
COMMIT;

-- ─────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_updated_at ON public.matches;
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Auto-refresh materialized view on new market_analysis insert
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_latest_market_analysis()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.latest_market_analysis;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_lma ON public.market_analysis;
CREATE TRIGGER trg_refresh_lma
  AFTER INSERT ON public.market_analysis
  FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_latest_market_analysis();

-- ─────────────────────────────────────────────────────────────
-- Trap Score calculation function (mirrors frontend formula)
-- TrapScore = (RLM*0.30) + (HDP_Dev*0.25) + (Poisson*0.20) + (Sentiment*0.15) + (Volume*0.10)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calc_trap_score(
  p_rlm_score        NUMERIC,
  p_hdp_deviation    NUMERIC,
  p_poisson_diff     NUMERIC,
  p_sentiment_score  NUMERIC,
  p_volume_bias      NUMERIC
) RETURNS NUMERIC LANGUAGE sql IMMUTABLE AS $$
  SELECT LEAST(100, GREATEST(0,
    (p_rlm_score       * 0.30) +
    (p_hdp_deviation   * 0.25) +
    (p_poisson_diff    * 0.20) +
    (p_sentiment_score * 0.15) +
    (p_volume_bias     * 0.10)
  ));
$$;
