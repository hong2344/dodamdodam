import { NextResponse } from 'next/server'
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

  await supabase.from('profiles').upsert(
    {
      id: data.user.id,
      email: data.user.email ?? null,
      nickname_set: false,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: true }
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nickname, nickname_set')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.redirect(new URL('/login?error=profile', origin))
  }

  return NextResponse.redirect(new URL(profile?.nickname && profile.nickname_set ? next : '/onboarding', origin))
}
