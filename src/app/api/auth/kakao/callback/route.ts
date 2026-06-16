import { NextResponse } from 'next/server'
import {
  getKakaoBirthInfoFromMetadataSources,
  getMetadataSources,
  isAllowedSignupAge,
  calculateAnnualAgeFromBirthYear,
} from '@/lib/ageVerification'
import { getSiteOrigin } from '@/lib/auth/url'
import { createClient } from '@/lib/supabase/server'

function readProfileAge(value: unknown) {
  if (value === null || value === undefined || value === '') return null

  const age = Number(value)
  return Number.isInteger(age) ? age : null
}

// GET /api/auth/kakao/callback
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = getSiteOrigin(request)

  if (!code) {
    return NextResponse.redirect(new URL('/login?auth_error=missing_code', origin))
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/login?auth_error=callback_failed', origin))
  }

  const user = data.session?.user
  if (!user) {
    return NextResponse.redirect(new URL('/login?auth_error=callback_failed', origin))
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, nickname, nickname_set, village_id, avatar_type, match_category')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return NextResponse.redirect(new URL('/login?auth_error=profile', origin))
  }

  const profileAge = readProfileAge(profile?.age)
  const { birthYear } = getKakaoBirthInfoFromMetadataSources(getMetadataSources(user))
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
      .update({ email: user.email ?? null, age: ageToCheck })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.redirect(new URL('/login?auth_error=profile', origin))
    }
  } else {
    // 닉네임은 온보딩 step 4에서 사용자가 직접 설정 — 실명이 자동으로 들어오지 않도록 카카오 메타데이터 사용 안 함
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      email: user.email ?? null,
      nickname_set: false,
      age: ageToCheck,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.redirect(new URL('/login?auth_error=profile', origin))
    }
  }

  if (next?.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(new URL(profile?.nickname && profile.nickname_set ? next : '/onboarding', origin))
  }

  const destination =
    !profile?.nickname
      ? '/onboarding'
      : !profile.nickname_set
        ? '/onboarding'
        : profile?.village_id && profile?.avatar_type && profile?.match_category
          ? '/home'
          : '/onboarding'

  return NextResponse.redirect(new URL(destination, origin))
}
