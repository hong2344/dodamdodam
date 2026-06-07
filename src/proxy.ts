import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = ['/login', '/signup', '/api/auth']
const NICKNAME_PATH = '/nickname'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 정적 자원, _next 내부 경로, API 라우트는 통과.
  // (API 라우트는 각자 인증을 처리하므로 로그인 페이지로 리다이렉트하면 안 됨)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 비로그인 + 보호 페이지 → 로그인으로
  if (!user && !isPublic && pathname !== '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && !pathname.startsWith('/api')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname, nickname_set')
      .eq('id', user.id)
      .maybeSingle()

    if ((!profile?.nickname || !profile.nickname_set) && pathname !== NICKNAME_PATH) {
      const url = req.nextUrl.clone()
      url.pathname = NICKNAME_PATH
      return NextResponse.redirect(url)
    }
  }

  // 로그인 + 로그인/회원가입 페이지 → 홈으로
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const url = req.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
