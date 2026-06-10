import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 편지 도착 알림 (pg_cron이 5분마다 호출).
// letters.sent_at은 '도착 시각'을 의미하며 미래로 저장된다(사람 3h / AI 1h 뒤).
// 이 라우트는 '방금 도착 시각이 지난' 받은 편지를 찾아 수신자에게 웹 푸시를 발송한다.
//
// 중복 방지: 크론 주기(5분)와 동일한 길이의 반열린 구간 (now-5m, now] 만 스캔한다.
// → 각 편지의 도착 시각은 정확히 한 번의 윈도에만 들어가므로 같은 편지에 푸시가 반복되지 않는다.
//   (크론이 한 번 누락되면 그 구간 편지는 알림이 빠질 수 있으나, 중복 스팸보다 안전한 쪽.)
const WINDOW_MINUTES = 5

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  // 윈도는 호출 시점(now) 기준으로 계산 — 크론이 5분마다 부르면 구간이 겹치지 않고 이어진다.
  const url = new URL(request.url)
  const windowMin = Number(url.searchParams.get('minutes')) || WINDOW_MINUTES
  const now = Date.now()
  // letters.sent_at은 timestamp without time zone(UTC 저장). ISO에서 'Z' 떼고 비교.
  const toDbTs = (ms: number) => new Date(ms).toISOString().replace('Z', '')
  const sinceTs = toDbTs(now - windowMin * 60 * 1000)
  const untilTs = toDbTs(now)

  const admin = createAdminClient()
  // 방금 도착한 받은 편지(사람 편지 + AI 답장). receiver_id가 있어야 알릴 대상이 있음.
  const { data: arrived, error } = await admin
    .from('letters')
    .select('id, receiver_id, sender_type')
    .not('receiver_id', 'is', null)
    .gt('sent_at', sinceTs)
    .lte('sent_at', untilTs)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const letters = arrived ?? []
  let pushed = 0
  const pushSecret = process.env.PUSH_API_SECRET
  if (pushSecret && letters.length > 0) {
    const origin = url.origin
    const results = await Promise.allSettled(
      letters.map((l) => {
        const isAi = l.sender_type === 'ai'
        const title = isAi ? 'AI 마음친구의 답장이 도착했어요' : '친구의 편지가 도착했어요'
        const bodyText = isAi
          ? '편지집에서 답장을 확인해보세요.'
          : '편지집에서 새 편지를 확인해보세요.'
        return fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({
            userId: l.receiver_id,
            type: 'letter_arrived',
            title,
            body: bodyText,
            url: '/mailbox',
            data: { letterId: l.id },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        })
      }),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, window: { sinceTs, untilTs }, arrived: letters.length, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
