import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/auth/kakao/callback
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const origin = requestUrl.origin

  if (!code) {
    return NextResponse.redirect(`${origin}/login?auth_error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?auth_error=callback_failed`)
  }

  const user = data.session?.user

  if (user) {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        nickname:
          user.user_metadata?.name ??
          user.user_metadata?.full_name ??
          user.user_metadata?.nickname ??
          null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }

  if (next?.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const { data: profile } = user
    ? await supabase
        .from('profiles')
        .select('village_id, avatar_type, match_category')
        .eq('id', user.id)
        .maybeSingle()
    : { data: null }

  const destination =
    profile?.village_id && profile?.avatar_type && profile?.match_category
      ? '/home'
      : '/onboarding'

  return NextResponse.redirect(`${origin}${destination}`)
}
