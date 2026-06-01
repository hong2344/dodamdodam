import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// 매칭 완료 알림 (Vercel Cron - 월요일 01:00, GET으로 호출됨).
// 이번 주 매칭된 사용자에게 new_match 알림 생성. 로직은 DB 함수 send_match_notifications() 에 있다.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('send_match_notifications')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, notified: data })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
