/**
 * api-helpers.ts
 * Server-side utilities for all /app/api/* route handlers.
 * - safeFetch: never throws — returns { ok, data, error, status, raw }
 * - safeJson:  validates env vars, wraps handler in try/catch, always returns NextResponse
 * - ENV_CHECK: lists required env vars and their mask for safe logging
 */

import { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SafeFetchResult<T = unknown> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
  raw: string
  isJson: boolean
}

// ─── safeFetch ─────────────────────────────────────────────────────────────────

/**
 * Wraps global fetch with:
 * 1. Request / response logging
 * 2. Non-JSON detection (returns raw text for debugging)
 * 3. Timeout via AbortSignal
 * 4. Never throws — always resolves
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: RequestInit & { timeoutMs?: number; label?: string } = {}
): Promise<SafeFetchResult<T>> {
  const { timeoutMs = 8000, label = 'API', ...fetchOpts } = options

  console.log(`[${label}] REQUEST:`, url)

  let res: Response
  try {
    res = await fetch(url, {
      ...fetchOpts,
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    const error = `Network error: ${(err as Error).message}`
    console.error(`[${label}] FETCH FAILED:`, error)
    return { ok: false, status: 0, data: null, error, raw: '', isJson: false }
  }

  console.log(`[${label}] RESPONSE STATUS:`, res.status, res.statusText)

  const raw = await res.text()
  console.log(`[${label}] RAW (first 200):`, raw.slice(0, 200))

  if (!raw.trim()) {
    return { ok: res.ok, status: res.status, data: null, error: 'Empty response body', raw, isJson: false }
  }

  const isHtml = raw.trimStart().startsWith('<')
  if (isHtml) {
    const error = `API returned HTML instead of JSON (HTTP ${res.status}) — likely an auth or proxy error`
    console.error(`[${label}]`, error)
    return { ok: false, status: res.status, data: null, error, raw, isJson: false }
  }

  let data: T | null = null
  let isJson = false
  try {
    data = JSON.parse(raw) as T
    isJson = true
  } catch {
    const error = `Invalid JSON from API (HTTP ${res.status})`
    console.error(`[${label}]`, error, '| Raw snippet:', raw.slice(0, 120))
    return { ok: false, status: res.status, data: null, error, raw, isJson: false }
  }

  if (!res.ok) {
    const apiError = (data as Record<string, unknown>)?.message
      ?? (data as Record<string, unknown>)?.error
      ?? `HTTP ${res.status} ${res.statusText}`
    console.error(`[${label}] API ERROR:`, apiError)
    return { ok: false, status: res.status, data, error: String(apiError), raw, isJson }
  }

  return { ok: true, status: res.status, data, error: null, raw, isJson }
}

// ─── safeRoute ────────────────────────────────────────────────────────────────

/**
 * Wraps a route handler so it NEVER crashes.
 * Returns { success: false, message: ... } on any unhandled error.
 */
export function safeRoute(
  handler: (req: Request) => Promise<NextResponse>
) {
  return async (req: Request): Promise<NextResponse> => {
    console.log('[ROUTE] REQUEST:', req.method, new URL(req.url).pathname)
    try {
      return await handler(req)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined
      console.error('[ROUTE] UNHANDLED ERROR:', message)
      if (stack) console.error('[ROUTE] STACK:', stack)
      return NextResponse.json(
        { success: false, message, fallback: false },
        { status: 500 }
      )
    }
  }
}

// ─── env helpers ─────────────────────────────────────────────────────────────

export interface EnvStatus {
  key: string
  present: boolean
  preview: string  // first 6 chars + *** — never full value
}

export function checkEnvVars(keys: string[]): EnvStatus[] {
  return keys.map(key => {
    const val = process.env[key] ?? ''
    return {
      key,
      present: val.length > 0,
      preview: val.length > 6 ? `${val.slice(0, 6)}***` : val.length > 0 ? '***set***' : 'MISSING',
    }
  })
}

export function assertEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback ?? ''
  if (!val) {
    console.warn(`[ENV] ${key} is not set`)
  } else {
    console.log(`[ENV] ${key}:`, `${val.slice(0, 6)}***`)
  }
  return val
}

// ─── Standard response shapes ─────────────────────────────────────────────────

export function okResponse<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: true, ...meta, data })
}

export function errorResponse(message: string, status = 500, fallback = false): NextResponse {
  return NextResponse.json({ success: false, message, fallback }, { status })
}

export function fallbackResponse<T>(data: T, reason: string, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ success: true, fallback: true, reason, ...meta, data })
}
