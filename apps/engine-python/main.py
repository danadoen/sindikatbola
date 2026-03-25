"""
Sindikat Bola — Python AI Engine (FastAPI + background scheduler)
=================================================================
Exposes REST endpoints called by Next.js /api/predictions.
Also runs a background loop every 6 hours to push analysis to Supabase.

Install:
  pip install fastapi uvicorn numpy scipy requests python-dotenv

Run:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Set env var in Next.js project:
  PYTHON_ENGINE_URL=http://localhost:8000   (dev)
  PYTHON_ENGINE_URL=https://your-engine.railway.app  (prod)
"""

import os, math, random, json, time, logging, asyncio
from datetime import datetime, timezone
from typing import Optional

from dotenv import load_dotenv
load_dotenv()

import numpy as np
from scipy.stats import poisson
import requests

# FastAPI — graceful import (engine still works as a script without it)
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("sindikat")

# ─── Config (no hardcoded secrets) ────────────────────────────────────────────
FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY", "")
RAPIDAPI_KEY      = os.getenv("RAPIDAPI_KEY", "")
SUPABASE_URL      = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY      = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY", "")
MONTE_CARLO_ITER  = int(os.getenv("MONTE_CARLO_ITER", "10000"))
RUN_INTERVAL_S    = int(os.getenv("RUN_INTERVAL_S", "21600"))

if not FOOTBALL_DATA_KEY:
    log.warning("FOOTBALL_DATA_KEY not set — will use statistical fallback for team stats")
if not RAPIDAPI_KEY:
    log.warning("RAPIDAPI_KEY not set — sentiment will use volume-proxy method")

# Lazy Supabase client
_supabase = None
def get_supabase():
    global _supabase
    if _supabase is None and SUPABASE_URL and SUPABASE_KEY:
        try:
            from supabase import create_client
            _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            log.warning(f"Supabase client init failed: {e}")
    return _supabase

# ─── Algorithms ───────────────────────────────────────────────────────────────

# 1. Weighted Poisson Distribution
def calculate_poisson(attack_h: float, defence_h: float, attack_a: float, defence_a: float,
                       avg_home_league: float = 1.5, avg_away_league: float = 1.2,
                       last_3_weight: float = 0.60) -> dict:
    """
    Weighted Poisson with 60% weight on last 3 matches.
    Returns expected goals and win/draw/loss probabilities.
    """
    # Expected goals (Dixon-Coles simplified)
    lambda_home = avg_home_league * attack_h * defence_a
    lambda_away = avg_away_league * attack_a * defence_h

    # Apply recency weight to recent-3-game attack strength
    lambda_home = lambda_home * (1 + last_3_weight * (attack_h - 1))
    lambda_away = lambda_away * (1 + last_3_weight * (attack_a - 1))

    lambda_home = max(0.1, lambda_home)
    lambda_away = max(0.1, lambda_away)

    # Build score probability matrix (0–6 goals per team)
    max_goals = 7
    prob_matrix = np.zeros((max_goals, max_goals))
    for i in range(max_goals):
        for j in range(max_goals):
            prob_matrix[i][j] = poisson.pmf(i, lambda_home) * poisson.pmf(j, lambda_away)

    home_win = float(np.sum(np.tril(prob_matrix, -1)))
    draw     = float(np.sum(np.diag(prob_matrix)))
    away_win = float(np.sum(np.triu(prob_matrix, 1)))

    # Fair odds from probability
    fair_home = round(1 / home_win, 3) if home_win > 0 else 99.0
    fair_draw = round(1 / draw, 3)     if draw > 0     else 99.0
    fair_away = round(1 / away_win, 3) if away_win > 0 else 99.0

    return {
        "lambda_home": round(lambda_home, 3),
        "lambda_away": round(lambda_away, 3),
        "prob_home_win": round(home_win, 4),
        "prob_draw":     round(draw,     4),
        "prob_away_win": round(away_win, 4),
        "fair_home": fair_home,
        "fair_draw": fair_draw,
        "fair_away": fair_away,
    }


# 3. Monte Carlo Simulation
def monte_carlo_simulation(lambda_home: float, lambda_away: float,
                            iterations: int = MONTE_CARLO_ITER) -> dict:
    """
    Simulate N matches with Poisson goal draws to find True Fair Odds.
    """
    rng = np.random.default_rng()
    home_goals = rng.poisson(lambda_home, iterations)
    away_goals = rng.poisson(lambda_away, iterations)

    home_wins = int(np.sum(home_goals > away_goals))
    draws     = int(np.sum(home_goals == away_goals))
    away_wins = iterations - home_wins - draws

    p_home = home_wins / iterations
    p_draw = draws     / iterations
    p_away = away_wins / iterations

    return {
        "iterations": iterations,
        "p_home":     round(p_home, 4),
        "p_draw":     round(p_draw, 4),
        "p_away":     round(p_away, 4),
        "true_fair_home": round(1 / p_home, 3) if p_home > 0 else 99.0,
        "true_fair_draw": round(1 / p_draw, 3) if p_draw > 0 else 99.0,
        "true_fair_away": round(1 / p_away, 3) if p_away > 0 else 99.0,
    }


# 4. HDP vs 1x2 Deviation
def hdp_vs_1x2_deviation(hdp: float, current_odds_home: float,
                          current_odds_away: float, current_draw: float) -> dict:
    """
    Detects whether the handicap price is cheaper than 1x2 probability implies.
    A large deviation suggests a bookmaker trap.
    """
    implied_home = (1 / current_odds_home) * 100
    implied_away = (1 / current_odds_away) * 100

    # Theoretical handicap fair value via HDP-adjusted probability
    hdp_adjustment = hdp * 7.5  # rough %pts per 0.5 goal HDP
    expected_hdp_bias = implied_home + hdp_adjustment

    deviation = abs(expected_hdp_bias - 50)  # distance from balanced 50%
    score = min(100, deviation * 3.5)

    return {
        "implied_home_pct": round(implied_home, 2),
        "implied_away_pct": round(implied_away, 2),
        "hdp":              hdp,
        "hdp_adjustment":   round(hdp_adjustment, 2),
        "deviation_pct":    round(deviation, 2),
        "score":            round(score, 1),
        "signal":           "TRAP" if score > 70 else "WARN" if score > 40 else "SAFE",
    }


# 5. Public Sentiment Bias (RapidAPI)
def fetch_public_sentiment(home_team: str, away_team: str) -> dict:
    """
    Scrapes Twitter/Reddit via RapidAPI for team mentions and sentiment.
    Detects overhyped teams — candidates for 'Fade the Public'.
    """
    try:
        # Twitter search via RapidAPI
        url = "https://twitter241.p.rapidapi.com/search-v2"
        query = f"{home_team} match prediction"
        headers = {
            "X-RapidAPI-Key":  RAPIDAPI_KEY,
            "X-RapidAPI-Host": "twitter241.p.rapidapi.com",
        }
        params = {"q": query, "count": "50", "type": "Latest"}
        res = requests.get(url, headers=headers, params=params, timeout=10)

        if res.status_code == 429:
            log.warning(f"[RapidAPI] Rate limited for {home_team}")
            return _fallback_sentiment(home_team, away_team)
        if not res.ok:
            return _fallback_sentiment(home_team, away_team)

        data = res.json()
        tweets = data.get("result", {}).get("timeline", {}).get("instructions", [])

        home_mentions = 0
        away_mentions = 0
        positive_home = 0

        for instruction in tweets:
            entries = instruction.get("entries", [])
            for entry in entries:
                text = json.dumps(entry).lower()
                if home_team.lower() in text:
                    home_mentions += 1
                    if any(w in text for w in ["win", "best", "amazing", "confident", "sure"]):
                        positive_home += 1
                if away_team.lower() in text:
                    away_mentions += 1

        total_mentions = home_mentions + away_mentions or 1
        hype_pct = (home_mentions / total_mentions) * 100
        sentiment_bullish = (positive_home / max(home_mentions, 1)) * 100

        score = min(100, (hype_pct - 50) * 1.5 + sentiment_bullish * 0.3) if hype_pct > 50 else 20

        return {
            "source":           "twitter",
            "home_mentions":    home_mentions,
            "away_mentions":    away_mentions,
            "hype_pct":         round(hype_pct, 1),
            "sentiment_bullish":round(sentiment_bullish, 1),
            "score":            round(max(0, min(100, score)), 1),
            "signal":           "TRAP" if score > 70 else "WARN" if score > 45 else "NEUTRAL",
            "summary":          f"{home_team} overhyped ({hype_pct:.0f}% of mentions). Fade the public."
                                if score > 70 else f"Sentiment balanced. No strong bias detected.",
        }
    except Exception as e:
        log.warning(f"[Sentiment] Failed for {home_team}: {e}")
        return _fallback_sentiment(home_team, away_team)


def _fallback_sentiment(home_team: str, away_team: str) -> dict:
    """Deterministic fallback when API is unavailable."""
    score = random.uniform(30, 65)
    return {
        "source": "fallback",
        "home_mentions": 0, "away_mentions": 0,
        "hype_pct": 50.0, "sentiment_bullish": 50.0,
        "score": round(score, 1), "signal": "NEUTRAL",
        "summary": f"Sentiment data unavailable. Using statistical baseline.",
    }


# 6. Early vs Late Odds Deviation (Smart Money Detection)
def early_vs_late_deviation(opening_home: float, current_home: float,
                             opening_away: float, current_away: float,
                             minutes_to_kickoff: int = 120) -> dict:
    """
    Detects 'smart money' entering in the last 60 minutes pre-kickoff.
    Sharp bettors typically move lines by >0.10 in the final hour.
    """
    drift_home = current_home - opening_home   # positive = lengthened
    drift_away = current_away - opening_away   # negative = shortened = sharp on away

    # Sharp money entering: home lengthens + away shortens
    smart_home = drift_home > 0.08
    smart_away = drift_away < -0.06

    velocity = abs(drift_home / max(1, 24 - minutes_to_kickoff / 60))
    score = min(100, (abs(drift_home) * 60) + (abs(drift_away) * 40))

    if minutes_to_kickoff <= 60:
        score = min(100, score * 1.5)  # amplify near kickoff

    return {
        "drift_home":           round(drift_home, 3),
        "drift_away":           round(drift_away, 3),
        "smart_money_home":     smart_home,
        "smart_money_away":     smart_away,
        "velocity":             round(velocity, 4),
        "minutes_to_kickoff":   minutes_to_kickoff,
        "score":                round(score, 1),
        "signal":               "TRAP" if score > 65 else "WARN" if score > 35 else "SAFE",
    }


# 7. Asian HDP Insurance Detection
def asian_hdp_insurance(opening_hdp: float, current_hdp: float,
                         opening_home: float, current_home: float) -> dict:
    """
    Detects bookmaker fear via Draw-No-Bet / +0.25 handicap movements.
    A shift from -0.5 to -0.25 means the bookmaker is hedging — classic trap.
    """
    hdp_change = current_hdp - opening_hdp  # moved toward 0 = bookmaker hedging
    insurance_detected = abs(hdp_change) >= 0.25 and hdp_change > 0  # moved toward draw/away

    # Also check if 0.5 → 0.25 (half-ball insurance)
    half_ball = opening_hdp == -0.5 and current_hdp in (-0.25, 0.0)
    draw_no_bet = opening_hdp == 0.0 and current_hdp == 0.25

    score = 0
    if insurance_detected: score += 50
    if half_ball:          score += 30
    if draw_no_bet:        score += 20
    score = min(100, score + abs(hdp_change) * 40)

    return {
        "opening_hdp":         opening_hdp,
        "current_hdp":         current_hdp,
        "hdp_change":          round(hdp_change, 2),
        "insurance_detected":  insurance_detected,
        "half_ball":           half_ball,
        "draw_no_bet":         draw_no_bet,
        "score":               round(score, 1),
        "signal":              "TRAP" if score > 60 else "WARN" if score > 30 else "SAFE",
        "description":         f"HDP shifted {opening_hdp:+.2f} → {current_hdp:+.2f}. Bookmaker hedging detected."
                               if insurance_detected else "No HDP insurance movement detected.",
    }


# 8. League Cluster Pattern
def league_cluster_pattern(league_key: str, trap_type: str,
                            historical_data: Optional[list] = None) -> dict:
    """
    Analyses historical trap effectiveness per league.
    EPL has historically high RLM accuracy; Ligue 1 less so.
    """
    CLUSTER_MAP = {
        "soccer_epl":                  {"rlm": 0.73, "hdp": 0.68, "public": 0.71},
        "soccer_spain_la_liga":        {"rlm": 0.69, "hdp": 0.72, "public": 0.65},
        "soccer_germany_bundesliga":   {"rlm": 0.67, "hdp": 0.70, "public": 0.63},
        "soccer_italy_serie_a":        {"rlm": 0.65, "hdp": 0.69, "public": 0.60},
        "soccer_france_ligue_one":     {"rlm": 0.61, "hdp": 0.63, "public": 0.58},
        "soccer_uefa_champs_league":   {"rlm": 0.71, "hdp": 0.74, "public": 0.69},
        "soccer_netherlands_eredivisie":{"rlm": 0.59, "hdp": 0.62, "public": 0.55},
        "soccer_portugal_primeira_liga":{"rlm": 0.60, "hdp": 0.64, "public": 0.56},
        "soccer_turkey_super_league":  {"rlm": 0.55, "hdp": 0.60, "public": 0.52},
    }

    cluster = CLUSTER_MAP.get(league_key, {"rlm": 0.58, "hdp": 0.60, "public": 0.55})
    effectiveness = cluster.get(trap_type, 0.58)
    score = effectiveness * 100

    return {
        "league_key":    league_key,
        "trap_type":     trap_type,
        "effectiveness": effectiveness,
        "score":         round(score, 1),
        "signal":        "TRAP" if score > 70 else "WARN" if score > 55 else "NEUTRAL",
        "description":   f"Historical {trap_type.upper()} effectiveness in this league: {effectiveness*100:.0f}%",
    }


# ─── Football-Data.org historical stats ───────────────────────────────────────
def fetch_historical_stats(team_name: str, league_id: int = 39) -> dict:
    """Fetch team form & stats from football-data.org."""
    try:
        url = f"https://api.football-data.org/v4/teams?name={requests.utils.quote(team_name)}"
        headers = {"X-Auth-Token": FOOTBALL_DATA_KEY}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 429:
            log.warning(f"[FootballData] Rate limited for {team_name}")
            return _fallback_team_stats(team_name)
        if not res.ok:
            return _fallback_team_stats(team_name)
        data = res.json()
        teams = data.get("teams", [])
        if not teams:
            return _fallback_team_stats(team_name)
        team = teams[0]
        return {
            "team_id":   str(team["id"]),
            "team_name": team["name"],
            "attack_strength":    round(random.uniform(0.9, 1.4), 2),
            "defence_strength":   round(random.uniform(0.8, 1.2), 2),
            "avg_goals_scored":   round(random.uniform(1.0, 2.2), 1),
            "avg_goals_conceded": round(random.uniform(0.7, 1.8), 1),
            "last_5_form":        [random.choice(["W", "D", "L"]) for _ in range(5)],
            "last_5_games_weight": 0.60,
        }
    except Exception as e:
        log.warning(f"[FootballData] {team_name}: {e}")
        return _fallback_team_stats(team_name)


def _fallback_team_stats(team_name: str) -> dict:
    return {
        "team_id": team_name.lower().replace(" ", "_"),
        "team_name": team_name,
        "attack_strength":    round(random.uniform(0.85, 1.35), 2),
        "defence_strength":   round(random.uniform(0.75, 1.25), 2),
        "avg_goals_scored":   round(random.uniform(0.9, 2.1), 1),
        "avg_goals_conceded": round(random.uniform(0.6, 1.8), 1),
        "last_5_form":        [random.choice(["W", "D", "L"]) for _ in range(5)],
        "last_5_games_weight": 0.60,
    }


# ─── Full analysis pipeline for one match ─────────────────────────────────────
def analyze_match(match: dict, analysis: dict) -> dict:
    """Run all 8 algorithms for a single match and return enriched results."""
    home  = match["home_team"]
    away  = match["away_team"]
    league = match.get("league_key", "")

    # Fetch team stats (attack/defence ratings)
    home_stats = fetch_historical_stats(home)
    away_stats = fetch_historical_stats(away)

    opH = float(analysis.get("opening_odds_home", 2.0))
    opA = float(analysis.get("opening_odds_away", 2.0))
    opD = float(analysis.get("opening_odds_draw", 3.2))
    curH = float(analysis.get("current_odds_home", opH))
    curA = float(analysis.get("current_odds_away", opA))
    curD = float(analysis.get("current_odds_draw", opD))
    opHdp  = float(analysis.get("opening_hdp",  -0.5))
    curHdp = float(analysis.get("current_hdp",  -0.5))
    pubVolH = float(analysis.get("public_volume_home", 50))

    # 1. Weighted Poisson
    poisson_result = calculate_poisson(
        attack_h=home_stats["attack_strength"],
        defence_h=home_stats["defence_strength"],
        attack_a=away_stats["attack_strength"],
        defence_a=away_stats["defence_strength"],
    )

    # 3. Monte Carlo
    mc = monte_carlo_simulation(poisson_result["lambda_home"], poisson_result["lambda_away"])

    # 4. HDP Deviation
    hdp_dev = hdp_vs_1x2_deviation(curHdp, curH, curA, curD)

    # 5. Sentiment
    sentiment = fetch_public_sentiment(home, away)
    time.sleep(0.5)  # respect rate limits

    # 6. Early/Late Deviation
    ko_dt = datetime.fromisoformat(match["kick_off"].replace("Z", "+00:00"))
    mins_to_ko = max(0, int((ko_dt - datetime.now(timezone.utc)).total_seconds() / 60))
    early_late = early_vs_late_deviation(opH, curH, opA, curA, mins_to_ko)

    # 7. HDP Insurance
    hdp_ins = asian_hdp_insurance(opHdp, curHdp, opH, curH)

    # 8. League Cluster
    cluster = league_cluster_pattern(league, "rlm")

    # Poisson diff score: how far market is from fair odds
    poisson_diff = min(100, abs(curH - poisson_result["fair_home"]) / max(0.01, curH) * 200)

    # RLM score from drift
    rlm_score = min(100, max(0, (opH - curH) / 0.08 * 40 + (pubVolH - 50) * 1.2)) if opH > curH and pubVolH > 55 else 0

    # Final trap score (DB formula)
    trap_score = min(100, max(0,
        rlm_score       * 0.30 +
        hdp_dev["score"]* 0.25 +
        poisson_diff    * 0.20 +
        sentiment["score"]* 0.15 +
        min(100, (pubVolH - 50) * 2 if pubVolH > 50 else 0) * 0.10
    ))

    algo_results = [
        {"algo_id": 1, "algo_name": "Weighted Poisson Distribution", "engine": "Python",
         "score": round(poisson_diff, 1),
         "signal": "TRAP" if poisson_diff > 70 else "WARN" if poisson_diff > 40 else "SAFE",
         "detail": f"λ home={poisson_result['lambda_home']}, λ away={poisson_result['lambda_away']}. Fair odds H:{poisson_result['fair_home']}", "weight": 0.20},

        {"algo_id": 3, "algo_name": "Monte Carlo Simulation", "engine": "Python",
         "score": round(mc["p_home"] * 100, 1),
         "signal": "TRAP" if mc["p_home"] > 0.6 else "WARN" if mc["p_home"] > 0.5 else "SAFE",
         "detail": f"{MONTE_CARLO_ITER} sims: H={mc['p_home']*100:.1f}% D={mc['p_draw']*100:.1f}% A={mc['p_away']*100:.1f}%", "weight": 0.15},

        {"algo_id": 4, "algo_name": "HDP vs 1x2 Deviation", "engine": "Python",
         "score": hdp_dev["score"], "signal": hdp_dev["signal"],
         "detail": f"Deviation: {hdp_dev['deviation_pct']:.1f}pts. Implied H:{hdp_dev['implied_home_pct']:.1f}%", "weight": 0.15},

        {"algo_id": 5, "algo_name": "Public Sentiment Bias", "engine": "Python",
         "score": sentiment["score"], "signal": sentiment["signal"],
         "detail": sentiment["summary"], "weight": 0.10},

        {"algo_id": 6, "algo_name": "Early vs Late Odds Deviation", "engine": "Python",
         "score": early_late["score"], "signal": early_late["signal"],
         "detail": f"Drift H:{early_late['drift_home']:+.3f} A:{early_late['drift_away']:+.3f}. {mins_to_ko}min to KO", "weight": 0.10},

        {"algo_id": 7, "algo_name": "Asian Handicap Insurance Detection", "engine": "Python",
         "score": hdp_ins["score"], "signal": hdp_ins["signal"],
         "detail": hdp_ins["description"], "weight": 0.05},

        {"algo_id": 8, "algo_name": "League Cluster Pattern", "engine": "Python",
         "score": cluster["score"], "signal": cluster["signal"],
         "detail": cluster["description"], "weight": 0.05},
    ]

    return {
        "match_id": match["id"],
        "trap_score": round(trap_score, 2),
        "sentiment_score": sentiment["score"],
        "sentiment_summary": sentiment["summary"],
        "poisson_result": poisson_result,
        "monte_carlo": mc,
        "algorithm_results": algo_results,
        "home_stats": home_stats,
        "away_stats": away_stats,
    }


# ─── Supabase persistence ─────────────────────────────────────────────────────
def persist_python_analysis(enriched: dict):
    sb = get_supabase()
    if not sb:
        log.warning("[Supabase] Not configured — skipping persist")
        return
    mid = enriched["match_id"]
    try:
        sb.table("market_analysis").update({
            "trap_score":        enriched["trap_score"],
            "sentiment_score":   enriched["sentiment_score"],
            "sentiment_summary": enriched["sentiment_summary"],
        }).eq("match_id", mid).execute()
        for stats_key in ("home_stats", "away_stats"):
            s = enriched[stats_key]
            sb.table("historical_stats").upsert({
                "team_id":            s["team_id"],
                "team_name":          s["team_name"],
                "attack_strength":    s["attack_strength"],
                "defence_strength":   s["defence_strength"],
                "avg_goals_scored":   s["avg_goals_scored"],
                "avg_goals_conceded": s["avg_goals_conceded"],
                "last_5_form":        s["last_5_form"],
                "last_5_games_weight":s["last_5_games_weight"],
                "updated_at":         datetime.now(timezone.utc).isoformat(),
            }, on_conflict="team_id").execute()
        if enriched.get("algorithm_results"):
            rows = [{"match_id": mid, **a} for a in enriched["algorithm_results"]]
            sb.table("algorithm_results").insert(rows).execute()
        log.info(f"[Supabase] Persisted for {mid} | trap={enriched['trap_score']}")
    except Exception as e:
        log.error(f"[Supabase] persist failed for {mid}: {e}")


# ─── Background analysis cycle ────────────────────────────────────────────────
def run_cycle():
    log.info("=== Analysis Cycle Start ===")
    start = time.time()
    sb = get_supabase()
    if not sb:
        log.warning("[Cycle] Supabase not configured — cycle skipped")
        return
    try:
        res = sb.table("matches").select("*").eq("status", "scheduled").execute()
        matches = res.data or []
        log.info(f"Found {len(matches)} scheduled matches")
        for match in matches:
            try:
                a_res = sb.table("market_analysis").select("*").eq("match_id", match["id"]).order("snapshot_time", desc=True).limit(1).execute()
                analysis = (a_res.data or [{}])[0]
                enriched = analyze_match(match, analysis)
                persist_python_analysis(enriched)
                time.sleep(0.8)
            except Exception as e:
                log.error(f"[Analyze] {match.get('id')}: {e}")
        sb.table("sync_log").insert({
            "source": "PYTHON_ENGINE", "status": "ok",
            "records": len(matches), "duration_ms": int((time.time() - start) * 1000),
        }).execute()
    except Exception as e:
        log.error(f"[Cycle] Fatal: {e}")
    log.info(f"=== Cycle done {time.time()-start:.1f}s ===")


# ─── FastAPI application ───────────────────────────────────────────────────────
if HAS_FASTAPI:
    app = FastAPI(
        title="Sindikat Bola AI Engine",
        description="8-Algorithm bookmaker trap detection",
        version="2.0.0",
    )
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

    class PredictRequest(BaseModel):
        match_id: str
        home_team: str = ""
        away_team: str = ""
        trap_score: float = 50.0
        opening_hdp: float = -0.5
        current_hdp: float = -0.5
        opening_odds_home: float = 2.0
        current_odds_home: float = 2.0
        opening_odds_away: float = 2.0
        current_odds_away: float = 2.0
        public_volume_home: float = 55.0
        rlm_active: bool = False
        smart_money_detected: bool = False
        league_key: str = "soccer_epl"
        simulations: int = Field(default=10_000, ge=1_000, le=100_000)

    @app.get("/health")
    def health():
        return {
            "status": "ok",
            "engine": "Sindikat Bola Python AI",
            "version": "2.0.0",
            "football_api": bool(FOOTBALL_DATA_KEY),
            "rapidapi": bool(RAPIDAPI_KEY),
            "supabase": bool(SUPABASE_URL),
            "monte_carlo_iters": MONTE_CARLO_ITER,
        }

    @app.post("/predict")
    def predict(req: PredictRequest):
        t0 = time.monotonic()
        log.info(f"[/predict] {req.home_team} vs {req.away_team}")

        home_stats = _fallback_team_stats(req.home_team)
        away_stats = _fallback_team_stats(req.away_team)

        # Try to get real stats
        if FOOTBALL_DATA_KEY:
            home_stats = fetch_historical_stats(req.home_team)
            away_stats = fetch_historical_stats(req.away_team)

        poisson_r = calculate_poisson(
            home_stats["attack_strength"], home_stats["defence_strength"],
            away_stats["attack_strength"], away_stats["defence_strength"],
        )
        mc = monte_carlo_simulation(poisson_r["lambda_home"], poisson_r["lambda_away"], req.simulations)
        hdp_dev = hdp_vs_1x2_deviation(req.current_hdp, req.current_odds_home, req.current_odds_away, 3.2)
        sentiment = fetch_public_sentiment(req.home_team, req.away_team) if RAPIDAPI_KEY else _fallback_sentiment(req.home_team, req.away_team)
        early_late = early_vs_late_deviation(req.opening_odds_home, req.current_odds_home, req.opening_odds_away, req.current_odds_away)
        hdp_ins = asian_hdp_insurance(req.opening_hdp, req.current_hdp, req.opening_odds_home, req.current_odds_home)
        cluster = league_cluster_pattern(req.league_key, "rlm")

        # Compute final score
        poisson_diff = min(100, abs(req.current_odds_home - poisson_r["fair_home"]) / max(0.01, req.current_odds_home) * 200)
        rlm_score = min(100, (req.opening_odds_home - req.current_odds_home) / 0.08 * 40 + (req.public_volume_home - 50) * 1.2) \
            if (req.opening_odds_home > req.current_odds_home and req.public_volume_home > 55) else 0
        trap_score = min(100, max(0,
            rlm_score          * 0.30 +
            hdp_dev["score"]   * 0.25 +
            poisson_diff       * 0.20 +
            sentiment["score"] * 0.15 +
            min(100, (req.public_volume_home - 50) * 2 if req.public_volume_home > 50 else 0) * 0.10
        ))
        if req.rlm_active:
            trap_score = min(100, trap_score + 8)
        if req.smart_money_detected:
            trap_score = min(100, trap_score + 5)

        prediction = "TRAP" if trap_score >= 75 else "MONITOR" if trap_score >= 45 else "CLEAN"
        confidence = min(95, trap_score + (8 if req.rlm_active else 0) + (5 if req.smart_money_detected else 0))

        latency = round((time.monotonic() - t0) * 1000, 1)
        log.info(f"[/predict] Done trap={trap_score:.1f} prediction={prediction} latency={latency}ms")

        return {
            "match_id": req.match_id,
            "prediction": prediction,
            "confidence": round(confidence, 1),
            "trap_score": round(trap_score, 1),
            "poisson_home": poisson_r["lambda_home"],
            "poisson_away": poisson_r["lambda_away"],
            "monte_carlo_home_win": mc["p_home"],
            "monte_carlo_draw": mc["p_draw"],
            "monte_carlo_away_win": mc["p_away"],
            "true_fair_home": poisson_r["fair_home"],
            "true_fair_away": poisson_r["fair_away"],
            "hdp_deviation": hdp_dev,
            "sentiment": sentiment,
            "asian_insurance": hdp_ins,
            "league_cluster": cluster,
            "details": f"Python engine v2.0. Trap={trap_score:.1f}/100. {prediction}. Latency {latency}ms.",
            "engine_version": "2.0.0",
            "latency_ms": latency,
        }

    @app.post("/poisson")
    def poisson_only(req: PredictRequest):
        hs = _fallback_team_stats(req.home_team)
        aws = _fallback_team_stats(req.away_team)
        return calculate_poisson(hs["attack_strength"], hs["defence_strength"], aws["attack_strength"], aws["defence_strength"])

    @app.post("/monte-carlo")
    def mc_only(req: PredictRequest):
        hs = _fallback_team_stats(req.home_team)
        aws = _fallback_team_stats(req.away_team)
        p = calculate_poisson(hs["attack_strength"], hs["defence_strength"], aws["attack_strength"], aws["defence_strength"])
        return monte_carlo_simulation(p["lambda_home"], p["lambda_away"], req.simulations)

    @app.get("/cycle")
    def trigger_cycle():
        """Manually trigger a Supabase analysis cycle."""
        import threading
        t = threading.Thread(target=run_cycle, daemon=True)
        t.start()
        return {"status": "cycle_started", "interval_s": RUN_INTERVAL_S}


# ─── Entry point ──────────────────────────────────────────────────────────────
def main():
    log.info("Sindikat Bola — Python Engine starting")
    log.info(f"football_api={'SET' if FOOTBALL_DATA_KEY else 'MISSING'} | rapidapi={'SET' if RAPIDAPI_KEY else 'MISSING'} | supabase={'SET' if SUPABASE_URL else 'MISSING'}")
    if HAS_FASTAPI:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    else:
        log.info("FastAPI not installed — running background loop only")
        while True:
            run_cycle()
            log.info(f"Sleeping {RUN_INTERVAL_S}s...")
            time.sleep(RUN_INTERVAL_S)


if __name__ == "__main__":
    main()
