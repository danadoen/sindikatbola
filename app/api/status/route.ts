/**
 * GET /api/status
 *
 * Health-checks all external integrations and reports env var presence.
 * Never returns 500 — always returns 200 with per-service status.
 */
import { NextResponse } from 'next/server'
import { checkEnvVars } from '@/lib/api-helpers'

const ENV_KEYS = [
  'ODDS_API_KEY',
  'FOOTBALL_DATA_KEY',
  'RAPIDAPI_KEY',
  'ODDSPAPI_KEY',
  'BETSTACK_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY',
  'PYTHON_ENGINE_URL',
]

async function probe(url: string, headers: Record<string, string> = {}, label: string): Promise<{
  label: string; status: 'ok' | 'error' | 'unconfigured'; latency: number; detail: string
}> {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    })
    const latency = Date.now() - t0
    const text = await res.text().catch(() => '')
    const isJson = text.trimStart().startsWith('{') || text.trimStart().startsWith('[')
    const detail = res.ok
      ? `HTTP ${res.status} — ${isJson ? 'JSON' : 'non-JSON'} — ${latency}ms`
      : `HTTP ${res.status} — ${text.slice(0, 80)}`
    return { label, status: res.ok ? 'ok' : 'error', latency, detail }
  } catch (err) {
    return {
      label,
      status: 'error',
      latency: Date.now() - t0,
      detail: (err as Error).message,
    }
  }
}

export async function GET() {
  console.log('[API/status] Health check initiated')

  const envVars = checkEnvVars(ENV_KEYS)
  const envMap = Object.fromEntries(envVars.map(e => [e.key, e.present ? e.preview : 'MISSING']))
  console.log('[API/status] ENV vars:', envMap)

  const ODDS_KEY = process.env.ODDS_API_KEY || 'a1cfd1f640a66c683e9df03209a8e286'
  const FOOTBALL_KEY = process.env.FOOTBALL_DATA_KEY || ''
  const PYTHON_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000'
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const checks = await Promise.allSettled([
    probe(`https://api.the-odds-api.com/v4/sports?apiKey=${ODDS_KEY}`, {}, 'odds_api'),
    FOOTBALL_KEY
      ? probe('https://api.football-data.org/v4/competitions', { 'X-Auth-Token': FOOTBALL_KEY }, 'football_data')
      : Promise.resolve({ label: 'football_data', status: 'unconfigured' as const, latency: 0, detail: 'FOOTBALL_DATA_KEY not set' }),
    probe(`${PYTHON_URL}/health`, {}, 'python_engine'),
    SUPABASE_URL
      ? probe(`${SUPABASE_URL}/rest/v1/matches?select=id&limit=1`, {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''}`,
        }, 'supabase')
      : Promise.resolve({ label: 'supabase', status: 'unconfigured' as const, latency: 0, detail: 'SUPABASE_URL not set' }),
  ])

  const services: Record<string, unknown> = {}
  for (const result of checks) {
    if (result.status === 'fulfilled') {
      services[result.value.label] = result.value
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    services,
    env_vars: envVars.map(e => ({ key: e.key, present: e.present, preview: e.preview })),
  })
}
