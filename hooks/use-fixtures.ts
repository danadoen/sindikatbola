'use client'

/**
 * useFixtures — shared hook for all pages.
 * Fetches real match data from /api/fixtures and manages:
 *   - loading / error / empty states
 *   - auto-refresh (configurable interval)
 *   - graceful fallback with typed empty data
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { FullMatchAnalysis } from '@/lib/types'

export interface UseFixturesOptions {
  sport?: string
  date?: string
  autoRefreshMs?: number  // 0 = disabled
}

export interface UseFixturesReturn {
  matches: FullMatchAnalysis[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refresh: () => void
}

export function useFixtures({
  sport = 'soccer_epl',
  date,
  autoRefreshMs = 0,
}: UseFixturesOptions = {}): UseFixturesReturn {
  const [matches, setMatches] = useState<FullMatchAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async () => {
    // Cancel any in-flight request
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ sport })
      if (date) params.set('date', date)

      const res = await fetch(`/api/fixtures?${params.toString()}`, {
        signal: ctrl.signal,
      })

      // Always try to parse text first so we can log what went wrong
      const text = await res.text()
      let data: { matches?: FullMatchAnalysis[]; error?: string; fallback?: boolean }

      try {
        data = JSON.parse(text)
      } catch {
        console.error('[useFixtures] Non-JSON response:', text.slice(0, 300))
        throw new Error(`Server returned non-JSON (HTTP ${res.status})`)
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }

      setMatches(data.matches ?? [])
      setLastUpdated(new Date())
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[useFixtures] Fetch failed:', msg)
      setError(msg)
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [sport, date])

  // Fetch on mount + whenever sport/date changes
  useEffect(() => {
    fetch_()
    return () => abortRef.current?.abort()
  }, [fetch_])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshMs) return
    const iv = setInterval(fetch_, autoRefreshMs)
    return () => clearInterval(iv)
  }, [fetch_, autoRefreshMs])

  return { matches, loading, error, lastUpdated, refresh: fetch_ }
}
