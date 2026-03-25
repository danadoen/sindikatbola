/**
 * POST /api/predictions
 *
 * Calls the Python FastAPI engine for AI-powered trap predictions.
 * Falls back to algorithmic scoring if the engine is unavailable.
 *
 * Body: { match_id: string, home_team: string, away_team: string,
 *         trap_score: number, algorithms: AlgorithmResult[] }
 */
import { NextResponse } from 'next/server'
import { safeFetch, checkEnvVars } from '@/lib/api-helpers'

interface PredictionRequest {
  match_id: string
  home_team: string
  away_team: string
  trap_score: number
  opening_hdp: number
  current_hdp: number
  public_volume_home: number
  rlm_active: boolean
  smart_money_detected: boolean
}

interface PythonPrediction {
  prediction: 'TRAP' | 'CLEAN' | 'MONITOR'
  confidence: number
  trap_score: number
  poisson_home: number
  poisson_away: number
  monte_carlo_home_win: number
  monte_carlo_draw: number
  monte_carlo_away_win: number
  details: string
}

function algorithmicFallback(body: PredictionRequest): PythonPrediction {
  const { trap_score, rlm_active, smart_money_detected, public_volume_home } = body
  const confidence = Math.min(95, trap_score + (rlm_active ? 12 : 0) + (smart_money_detected ? 8 : 0))
  const prediction = trap_score >= 75 ? 'TRAP' : trap_score >= 45 ? 'MONITOR' : 'CLEAN'

  // Simple Poisson approximation
  const homeStrength = 1 + (public_volume_home / 100) * 0.5
  const awayStrength = 1 + ((100 - public_volume_home) / 100) * 0.5

  return {
    prediction,
    confidence,
    trap_score,
    poisson_home: parseFloat(homeStrength.toFixed(2)),
    poisson_away: parseFloat(awayStrength.toFixed(2)),
    monte_carlo_home_win: parseFloat(((1 / 3) + (homeStrength - 1) * 0.15).toFixed(3)),
    monte_carlo_draw: parseFloat((0.28).toFixed(3)),
    monte_carlo_away_win: parseFloat(((1 / 3) + (awayStrength - 1) * 0.15).toFixed(3)),
    details: `Algorithmic fallback (Python engine unavailable). Trap score: ${trap_score}. ${rlm_active ? 'RLM confirmed. ' : ''}${smart_money_detected ? 'Sharp money detected.' : ''}`,
  }
}

export async function POST(request: Request) {
  console.log('[API/predictions] REQUEST')

  const envStatus = checkEnvVars(['PYTHON_ENGINE_URL'])
  envStatus.forEach(e => console.log(`[API/predictions] ENV ${e.key}:`, e.present ? e.preview : 'not set'))

  let body: PredictionRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.match_id) {
    return NextResponse.json({ success: false, message: 'match_id is required' }, { status: 400 })
  }

  const PYTHON_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000'
  console.log('[API/predictions] Calling Python engine at:', PYTHON_URL)

  const result = await safeFetch<PythonPrediction>(`${PYTHON_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    label: 'PythonEngine',
    timeoutMs: 15000,
  })

  if (result.ok && result.data) {
    console.log('[API/predictions] Python engine SUCCESS — prediction:', result.data.prediction)
    return NextResponse.json({ success: true, prediction: result.data, source: 'python_engine' })
  }

  // Fallback to algorithmic prediction
  console.warn('[API/predictions] Python engine failed, using algorithmic fallback. Reason:', result.error)
  const fallback = algorithmicFallback(body)

  return NextResponse.json({
    success: true,
    fallback: true,
    reason: result.error,
    prediction: fallback,
    source: 'algorithmic_fallback',
  })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('match_id')
  if (!matchId) {
    return NextResponse.json({ success: false, message: 'match_id query param required' }, { status: 400 })
  }
  // Delegate to POST
  const body: PredictionRequest = {
    match_id: matchId,
    home_team: searchParams.get('home_team') ?? '',
    away_team: searchParams.get('away_team') ?? '',
    trap_score: Number(searchParams.get('trap_score') ?? 50),
    opening_hdp: Number(searchParams.get('opening_hdp') ?? -0.5),
    current_hdp: Number(searchParams.get('current_hdp') ?? -0.5),
    public_volume_home: Number(searchParams.get('public_volume_home') ?? 55),
    rlm_active: searchParams.get('rlm_active') === 'true',
    smart_money_detected: searchParams.get('smart_money_detected') === 'true',
  }
  const PYTHON_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000'
  const result = await safeFetch<PythonPrediction>(`${PYTHON_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    label: 'PythonEngine',
    timeoutMs: 15000,
  })
  if (result.ok && result.data) {
    return NextResponse.json({ success: true, prediction: result.data, source: 'python_engine' })
  }
  return NextResponse.json({
    success: true,
    fallback: true,
    reason: result.error,
    prediction: algorithmicFallback(body),
    source: 'algorithmic_fallback',
  })
}
