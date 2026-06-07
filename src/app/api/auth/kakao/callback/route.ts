import { NextResponse } from 'next/server'
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

  if (next?.startsWith('/') && !next.startsWith('//')) {
    const { data: profile } = user
      ? await supabase.from('profiles').select('nickname').eq('id', user.id).maybeSingle()
      : { data: null }

    return NextResponse.redirect(new URL(profile?.nickname ? next : '/nickname', origin))
  }

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('nickname, village_id, avatar_type, match_category')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const destination =
    !profile?.nickname
      ? '/nickname'
      : profile?.village_id && profile?.avatar_type && profile?.match_category
      ? '/home'
      : '/onboarding'

  return NextResponse.redirect(new URL(destination, origin))
}
