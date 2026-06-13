import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 미답장(미열람) 편지 리마인더 (Vercel Cron - 하루 1회).
// 도착한 지 12시간이 지나도록 아직 열어보지 않은 받은 편지의 수신자에게 푸시한다.
//
// 중복 방지: 하루 1회 실행 + 도착 시각이 (now-36h, now-12h] 구간(폭 24h = 크론 주기)에 든 편지만 스캔.
// → 각 편지의 '도착 12시간 경과' 시점은 하루치 윈도 하나에만 들어가므로 한 번만 알림이 간다.
//   (사용자는 '도착 후 12~36시간' 사이에 한 통당 한 번의 미열람 리마인더를 받는다.)
const REMIND_AFTER_HOURS = 12
// 크론 실행 주기(하루 1회). 위 12h 경과 시점이 윈도 하나에만 들도록 dedup 윈도 폭으로 쓴다.
const CRON_PERIOD_HOURS = 24

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const now = Date.now()
  // letters.sent_at은 timestamp without time zone(UTC 저장). ISO에서 'Z' 떼고 비교.
  const toDbTs = (ms: number) => new Date(ms).toISOString().replace('Z', '')
  const olderThanTs = toDbTs(now - REMIND_AFTER_HOURS * 3600 * 1000) // 도착 12h 경과
  const newerThanTs = toDbTs(now - (REMIND_AFTER_HOURS + CRON_PERIOD_HOURS) * 3600 * 1000) // 단, 36h 이내(하루치 윈도)

  const admin = createAdminClient()
  const { data: unread, error } = await admin
    .from('letters')
    .select('id, receiver_id')
    .not('receiver_id', 'is', null)
    .is('read_at', null)
    .lte('sent_at', olderThanTs)
    .gt('sent_at', newerThanTs)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const letters = unread ?? []
  let pushed = 0
  const pushSecret = process.env.PUSH_API_SECRET
  if (pushSecret && letters.length > 0) {
    const origin = new URL(request.url).origin
    const results = await Promise.allSettled(
      letters.map((l) =>
        fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({
            userId: l.receiver_id,
            type: 'letter_unread_reminder',
            url: '/mailbox',
            data: { letterId: l.id },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        }),
      ),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, unread: letters.length, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
