import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
  ''

export function createClient() {
  // Gracefully return null when env vars are missing so the app
  // renders normally without Supabase features until keys are provided.
  if (!SUPABASE_URL || !SUPABASE_KEY) return null as never
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
