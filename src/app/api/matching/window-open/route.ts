import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 매칭 신청창 오픈 알림 (Vercel Cron - 한국시간 일요일 20:00 = 일요일 11:00 UTC, GET으로 호출됨).
// PRD: 매칭 신청 접수는 매주 일요일 20:00~24:00 KST. 그 시작 시점에 푸시를 구독한
// 전체 사용자에게 "카테고리를 고르세요" 알림(matching_open)을 보낸다.
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const pushSecret = process.env.PUSH_API_SECRET
  if (!pushSecret) {
    return NextResponse.json({ ok: false, error: 'PUSH_API_SECRET 미설정' }, { status: 500 })
  }

  const admin = createAdminClient()
  // 푸시를 구독한(=알림을 켠) 모든 사용자에게 발송한다. 한 사용자가 기기 여러 대를
  // 구독했어도 user_id 단위로 한 번만 보낸다(send 라우트가 user_id의 모든 기기로 발송).
  const { data: subs, error } = await admin.from('push_subscriptions').select('user_id')
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const userIds = [...new Set((subs ?? []).map((s) => s.user_id).filter(Boolean))] as string[]
  let pushed = 0
  if (userIds.length > 0) {
    const origin = new URL(request.url).origin
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({ userId, type: 'matching_open', url: '/category?mode=change' }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        }),
      ),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, subscribers: userIds.length, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
