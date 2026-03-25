import { NextResponse, type NextRequest } from 'next/server'

// Minimal middleware — only refresh Supabase sessions on /protected routes.
// The dynamic import prevents module-load errors when env vars are missing.
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  if (!url || !key) return NextResponse.next()

  try {
    const { updateSession } = await import('@/lib/supabase/middleware')
    return await updateSession(request)
  } catch {
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/protected/:path*'],
}
