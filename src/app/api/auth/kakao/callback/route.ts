import { NextResponse } from 'next/server'
import { getBirthDateFromKakaoMetadata, getEligibleSignupAge } from '@/lib/ageVerification'
import { getSiteOrigin } from '@/lib/auth/url'
import { createClient } from '@/lib/supabase/server'

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

  if (user) {
    const birthDate = getBirthDateFromKakaoMetadata(user.user_metadata ?? {})
    const age = birthDate ? getEligibleSignupAge(birthDate) : null

    if (!birthDate || age === null) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/signup?age_error=1', origin))
    }

    // 닉네임은 온보딩 step 4에서 사용자가 직접 설정 — 실명이 자동으로 들어오지 않도록 카카오 메타데이터 사용 안 함
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        nickname_set: false,
        age,
        birth_date: birthDate,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }

  if (next?.startsWith('/') && !next.startsWith('//')) {
    const { data: profile } = user
      ? await supabase.from('profiles').select('nickname, nickname_set').eq('id', user.id).maybeSingle()
      : { data: null }

    return NextResponse.redirect(new URL(profile?.nickname && profile.nickname_set ? next : '/onboarding', origin))
  }

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('nickname, nickname_set, village_id, avatar_type, match_category')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

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
