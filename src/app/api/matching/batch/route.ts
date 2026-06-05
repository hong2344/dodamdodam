import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kstWeekStart } from '@/lib/week'

export const dynamic = 'force-dynamic'

// 매칭 배치 (Vercel Cron - 한국시간 월요일 00:00 = 일요일 15:00 UTC, GET으로 호출됨).
// PRD: 같은 관심사 + 나이차가 작은 순으로 페어링. 실제 로직은 DB 함수 run_weekly_matching() 에 있다.
async function handle(request: Request) {
  // Vercel Cron은 CRON_SECRET이 설정돼 있으면 Authorization: Bearer <secret> 를 보낸다.
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const weekStart = kstWeekStart()
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('run_weekly_matching', { p_week_start: weekStart })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, week_start: weekStart, matched: data })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
