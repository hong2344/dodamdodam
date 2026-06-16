import { NextResponse } from 'next/server'
import { getSiteOrigin } from '@/lib/auth/url'
import { createClient } from '@/lib/supabase/server'

function readProfileAge(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const age = Number(value)
  return Number.isInteger(age) ? age : null
}

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

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, nickname, nickname_set')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.redirect(new URL('/login?error=profile', origin))
  }

  const provider = data.user.app_metadata?.provider
  const isKakaoUser = provider === 'kakao'
  const needsAgeVerification = isKakaoUser && readProfileAge(profile?.age) === null

  if (profile) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email: data.user.email ?? null })
      .eq('id', data.user.id)

    if (updateError) {
      return NextResponse.redirect(new URL('/login?error=profile', origin))
    }
  } else {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email ?? null,
      nickname_set: false,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.redirect(new URL('/login?error=profile', origin))
    }
  }

  if (needsAgeVerification) {
    const ageUrl = new URL('/signup/age', origin)
    ageUrl.searchParams.set('next', next)
    return NextResponse.redirect(ageUrl)
  }

  return NextResponse.redirect(new URL(profile?.nickname && profile.nickname_set ? next : '/onboarding', origin))
}
