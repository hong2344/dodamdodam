import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kstWeekStart } from '@/lib/week'

export const dynamic = 'force-dynamic'

// 매칭 완료 알림 (Vercel Cron - 한국시간 월요일 01:00 = 일요일 16:00 UTC, GET으로 호출됨).
// 이번 주 매칭된 사용자에게 ① new_match 인앱 알림 생성(DB 함수) + ② 웹 푸시 발송.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const weekStart = kstWeekStart()
  const supabase = createAdminClient()

  // ① 인앱 알림 생성
  const { data: notified, error } = await supabase.rpc('send_match_notifications', { p_week_start: weekStart })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  // ② 이번 주 매칭된 사용자에게 웹 푸시 발송 (matching_completed)
  let pushed = 0
  const pushSecret = process.env.PUSH_API_SECRET
  if (pushSecret) {
    const { data: matches } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('status', 'active')
      .eq('week_start', weekStart)

    const userIds = [
      ...new Set((matches ?? []).flatMap((m) => [m.user_a_id, m.user_b_id]).filter(Boolean)),
    ] as string[]

    if (userIds.length > 0) {
      const origin = new URL(request.url).origin
      const results = await Promise.allSettled(
        userIds.map((userId) =>
          fetch(`${origin}/api/push/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
            body: JSON.stringify({ userId, type: 'matching_completed', url: '/home' }),
          }).then((r) => {
            if (!r.ok) throw new Error(String(r.status))
          })
        )
      )
      pushed = results.filter((r) => r.status === 'fulfilled').length
    }
  }

  return NextResponse.json({ ok: true, week_start: weekStart, notified, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
