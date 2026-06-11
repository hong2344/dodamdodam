import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kstWeekStart } from '@/lib/week'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 매칭 후 첫 편지 미작성 리마인더 (Vercel Cron - 한국시간 화요일, 매칭 다음 날).
// 이번 주 매칭된 사용자 중 아직 상대에게 편지를 한 통도 보내지 않은 사람에게 푸시한다.
// (매주 화요일 1회만 실행되므로 한 사람당 이번 주에 한 번만 알림이 간다.)
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const weekStart = kstWeekStart()
  const admin = createAdminClient()

  const { data: matches, error } = await admin
    .from('matches')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'active')
    .eq('week_start', weekStart)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const matchList = matches ?? []
  if (matchList.length === 0) {
    return NextResponse.json({ ok: true, week_start: weekStart, targets: 0, pushed: 0 })
  }

  // 이번 주 매칭에서 '사람'이 보낸 편지를 모아 (matchId:senderId) 집합을 만든다.
  const matchIds = matchList.map((m) => m.id)
  const { data: sentLetters } = await admin
    .from('letters')
    .select('match_id, sender_id')
    .in('match_id', matchIds)
    .eq('sender_type', 'user')

  const wroteSet = new Set(
    (sentLetters ?? [])
      .filter((l) => l.match_id && l.sender_id)
      .map((l) => `${l.match_id}:${l.sender_id}`),
  )

  // 각 매칭의 두 참가자 중, 아직 편지를 안 쓴 사람을 리마인더 대상으로 모은다.
  const targets = new Set<string>()
  for (const m of matchList) {
    for (const uid of [m.user_a_id, m.user_b_id]) {
      if (uid && !wroteSet.has(`${m.id}:${uid}`)) targets.add(uid)
    }
  }

  let pushed = 0
  const pushSecret = process.env.PUSH_API_SECRET
  const targetIds = [...targets]
  if (pushSecret && targetIds.length > 0) {
    const origin = new URL(request.url).origin
    const results = await Promise.allSettled(
      targetIds.map((userId) =>
        fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({ userId, type: 'matching_no_letter', url: '/compose' }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        }),
      ),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, week_start: weekStart, targets: targetIds.length, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
