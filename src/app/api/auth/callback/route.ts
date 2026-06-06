import { NextResponse } from 'next/server'
import { ensureProfileForUser } from '@/lib/auth/ensure-profile'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/onboarding'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=oauth', requestUrl.origin))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=oauth', requestUrl.origin))
  }

  try {
    await ensureProfileForUser(supabase, data.user)
  } catch {
    return NextResponse.redirect(new URL('/login?error=profile', requestUrl.origin))
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
