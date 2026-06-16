import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 상대방 편지가 도착한 뒤 24시간 동안 답장하지 않았을 때 보내는 리마인더.
//
// 중복 방지: 편지 id를 포함한 reminderKey를 notifications.payload.data에 저장한다.
// 같은 받은 편지로는 한 번만 알리고, 새 편지가 도착하면 새 key로 다시 알릴 수 있다.
const REMIND_AFTER_HOURS = 24

type MatchRow = {
  id: string
  user_a_id: string | null
  user_b_id: string | null
  created_at: string | null
}

type LetterRow = {
  id: string
  match_id: string | null
  sender_id: string | null
  receiver_id: string | null
  sent_at: string | null
  original_letter_id?: string | null
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

function getReminderKey(letterId: string) {
  return `letter-unreplied-24h:${letterId}`
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
  const replyDeadlineTs = toDbTs(now - REMIND_AFTER_HOURS * 60 * 60 * 1000)

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
    .select('id, match_id, sender_id, receiver_id, sent_at')
    .in('match_id', matchIds)
    .eq('sender_type', 'user')
    .eq('receiver_type', 'user')
    .not('receiver_id', 'is', null)
    .lte('sent_at', replyDeadlineTs)
    .order('sent_at', { ascending: true })

  if (lettersError) {
    return NextResponse.json({ ok: false, error: lettersError.message }, { status: 500 })
  }

  const replyTargets = ((incomingLetters ?? []) as LetterRow[])
    .filter((letter) => letter.id && letter.match_id && letter.receiver_id && letter.sender_id && letter.sent_at)

  const candidates: {
    userId: string
    partnerId: string
    matchId: string
    letterId: string
    reminderKey: string
    incomingAt: string
  }[] = []

  if (replyTargets.length > 0) {
    const { data: outgoingLetters, error: outgoingError } = await admin
      .from('letters')
      .select('id, match_id, sender_id, receiver_id, sent_at, original_letter_id')
      .in('match_id', matchIds)
      .eq('sender_type', 'user')
      .eq('receiver_type', 'user')
      .not('sender_id', 'is', null)
      .not('receiver_id', 'is', null)

    if (outgoingError) {
      return NextResponse.json({ ok: false, error: outgoingError.message }, { status: 500 })
    }

    const outgoing = ((outgoingLetters ?? []) as LetterRow[])
      .filter((letter) => letter.match_id && letter.sender_id && letter.receiver_id && letter.sent_at)

    for (const letter of replyTargets) {
      const incomingMs = parseDbTime(letter.sent_at!)
      if (!Number.isFinite(incomingMs)) continue

      const hasReply = outgoing.some((sent) => {
        if (sent.match_id !== letter.match_id) return false
        if (sent.sender_id !== letter.receiver_id || sent.receiver_id !== letter.sender_id) return false
        if (sent.original_letter_id === letter.id) return true
        if (!sent.sent_at) return false

        const sentMs = parseDbTime(sent.sent_at)
        return Number.isFinite(sentMs) && sentMs > incomingMs
      })

      if (hasReply) continue

      candidates.push({
        userId: letter.receiver_id!,
        partnerId: letter.sender_id!,
        matchId: letter.match_id!,
        letterId: letter.id,
        reminderKey: getReminderKey(letter.id),
        incomingAt: letter.sent_at!,
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
    .eq('type', 'letter_reply_reminder')
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
            type: 'letter_reply_reminder',
            title: '답장을 기다리는 편지가 있어요',
            body: '상대방 편지에 24시간 동안 답장하지 않았어요.',
            url: `/compose?reply=${target.letterId}`,
            data: {
              letterId: target.letterId,
              matchId: target.matchId,
              partnerId: target.partnerId,
              reminderKey: target.reminderKey,
              incomingAt: target.incomingAt,
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
