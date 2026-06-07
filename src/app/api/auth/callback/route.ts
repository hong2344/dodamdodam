import { NextResponse } from 'next/server'
import { ensureProfileForUser } from '@/lib/auth/ensure-profile'
import { getSiteOrigin } from '@/lib/auth/url'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const origin = getSiteOrigin(request)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/onboarding'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth', origin))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=oauth', origin))
  }

  try {
    await ensureProfileForUser(supabase, data.user)
  } catch {
    return NextResponse.redirect(new URL('/login?error=profile', origin))
  }

  return NextResponse.redirect(new URL(next, origin))
}
