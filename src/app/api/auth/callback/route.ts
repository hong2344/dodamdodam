import { NextResponse } from 'next/server'
import {
  calculateAnnualAgeFromBirthYear,
  getKakaoBirthInfoFromMetadataSources,
  getMetadataSources,
  isAllowedSignupAge,
} from '@/lib/ageVerification'
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

  const profileAge = readProfileAge(profile?.age)
  const { birthYear } = getKakaoBirthInfoFromMetadataSources(getMetadataSources(data.user))
  const kakaoAge = birthYear ? calculateAnnualAgeFromBirthYear(birthYear) : null
  const ageToCheck = kakaoAge ?? profileAge

  if (ageToCheck === null) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/signup?auth_error=age_verification_required', origin))
  }

  if (!isAllowedSignupAge(ageToCheck)) {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/signup?auth_error=age_restricted', origin))
  }

  if (profile) {
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email: data.user.email ?? null, age: ageToCheck })
      .eq('id', data.user.id)

    if (updateError) {
      return NextResponse.redirect(new URL('/login?error=profile', origin))
    }
  } else {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: data.user.email ?? null,
      nickname_set: false,
      age: ageToCheck,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.redirect(new URL('/login?error=profile', origin))
    }
  }

  return NextResponse.redirect(new URL(profile?.nickname && profile.nickname_set ? next : '/onboarding', origin))
}
