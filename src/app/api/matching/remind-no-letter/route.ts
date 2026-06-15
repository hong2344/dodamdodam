import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 매칭 상대에게서 24시간 동안 도착한 새 편지가 없을 때 보내는 리마인더.
// 사용자별 기준 시각:
// - 상대가 보낸 도착 완료 편지가 있으면 그 편지의 sent_at
// - 아직 받은 편지가 없으면 매칭 생성 시각
//
// 중복 방지: 기준 시각을 포함한 reminderKey를 notifications.payload.data에 저장한다.
// 같은 기준 시각으로는 한 번만 알리고, 이후 상대에게서 새 편지가 도착하면 24시간 뒤 새 key로 다시 알릴 수 있다.
const REMIND_AFTER_HOURS = 24

type MatchRow = {
  id: string
  user_a_id: string | null
  user_b_id: string | null
  created_at: string | null
}

type LetterRow = {
  match_id: string | null
  sender_id: string | null
  receiver_id: string | null
  sent_at: string | null
}

type NotificationRow = {
  payload: {
    data?: {
      reminderKey?: string
    }
  } | null
}

function toDbTs(ms: number) {
  // Supabase timestamp without time zone 컬럼은 UTC ISO에서 Z를 뗀 값으로 비교한다.
  return new Date(ms).toISOString().replace('Z', '')
}

function getLatestIncomingKey(matchId: string, userId: string) {
  return `${matchId}:${userId}`
}

function getReminderKey(matchId: string, userId: string, baseTime: string) {
  return `matching-no-letter-24h:${matchId}:${userId}:${baseTime}`
}

function parseDbTime(value: string) {
  const hasTimezone = /(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value)
  return new Date(hasTimezone ? value : `${value}Z`).getTime()
}

async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = Date.now()
  const nowTs = toDbTs(now)

  const { data: matches, error } = await admin
    .from('matches')
    .select('id, user_a_id, user_b_id, created_at')
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const matchList = (matches ?? []) as MatchRow[]
  if (matchList.length === 0) {
    return NextResponse.json({ ok: true, targets: 0, pushed: 0 })
  }

  const matchIds = matchList.map((m) => m.id)
  const { data: incomingLetters, error: lettersError } = await admin
    .from('letters')
    .select('match_id, sender_id, receiver_id, sent_at')
    .in('match_id', matchIds)
    .eq('sender_type', 'user')
    .eq('receiver_type', 'user')
    .not('receiver_id', 'is', null)
    .lte('sent_at', nowTs)
    .order('sent_at', { ascending: false })

  if (lettersError) {
    return NextResponse.json({ ok: false, error: lettersError.message }, { status: 500 })
  }

  const latestIncoming = new Map<string, LetterRow>()
  for (const letter of (incomingLetters ?? []) as LetterRow[]) {
    if (!letter.match_id || !letter.receiver_id || !letter.sender_id || !letter.sent_at) continue
    const key = getLatestIncomingKey(letter.match_id, letter.receiver_id)
    if (!latestIncoming.has(key)) {
      latestIncoming.set(key, letter)
    }
  }

  const candidates: {
    userId: string
    partnerId: string
    matchId: string
    reminderKey: string
    latestIncomingAt: string | null
  }[] = []

  for (const m of matchList) {
    if (!m.user_a_id || !m.user_b_id) continue

    for (const [userId, partnerId] of [
      [m.user_a_id, m.user_b_id],
      [m.user_b_id, m.user_a_id],
    ] as const) {
      const latest = latestIncoming.get(getLatestIncomingKey(m.id, userId))
      const baseTime = latest?.sent_at ?? m.created_at
      if (!baseTime) continue

      const baseMs = parseDbTime(baseTime)
      if (!Number.isFinite(baseMs)) continue
      if (now - baseMs < REMIND_AFTER_HOURS * 60 * 60 * 1000) continue

      candidates.push({
        userId,
        partnerId,
        matchId: m.id,
        reminderKey: getReminderKey(m.id, userId, baseTime),
        latestIncomingAt: latest?.sent_at ?? null,
      })
    }
  }

  const targetIds = [...new Set(candidates.map((target) => target.userId))]
  if (targetIds.length === 0) {
    return NextResponse.json({ ok: true, targets: 0, pushed: 0 })
  }

  const { data: previousNotifications, error: notificationError } = await admin
    .from('notifications')
    .select('payload')
    .eq('type', 'matching_no_letter')
    .in('user_id', targetIds)

  if (notificationError) {
    return NextResponse.json({ ok: false, error: notificationError.message }, { status: 500 })
  }

  const notifiedKeys = new Set(
    ((previousNotifications ?? []) as NotificationRow[])
      .map((notification) => notification.payload?.data?.reminderKey)
      .filter(Boolean),
  )
  const targets = candidates.filter((target) => !notifiedKeys.has(target.reminderKey))

  let pushed = 0
  const pushSecret = process.env.PUSH_API_SECRET
  if (pushSecret && targets.length > 0) {
    const origin = new URL(request.url).origin
    const results = await Promise.allSettled(
      targets.map((target) =>
        fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({
            userId: target.userId,
            type: 'matching_no_letter',
            title: '새 편지를 기다리고 있어요',
            body: '매칭된 친구에게서 24시간 동안 새 편지가 오지 않았어요.',
            url: '/compose',
            data: {
              matchId: target.matchId,
              partnerId: target.partnerId,
              reminderKey: target.reminderKey,
              latestIncomingAt: target.latestIncomingAt,
            },
          }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        }),
      ),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    skipped: candidates.length - targets.length,
    targets: targets.length,
    pushed,
  })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
