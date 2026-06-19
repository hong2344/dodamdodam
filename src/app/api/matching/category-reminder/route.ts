import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 매칭 신청창 오픈 / 관심사 설정 리마인더 (pg_cron - 한국시간 일요일 20:00 = 일요일 11:00 UTC).
// PRD: 매칭 신청 접수는 매주 일요일 20:00~24:00 KST. 그 시작 시점에 전체 사용자에게
// "이번 주 마음친구를 만나려면 관심사를 설정하세요" 알림을 보낸다.
//
// 기존 두 크론(category_reminder 직접 INSERT + matching_open 푸시)을 이 라우트 하나로 통합한다.
// push/send는 호출 시 인앱 알림을 무조건 INSERT하고(구독 여부 무관) 구독자에게만 푸시를 보내므로,
// 모든 프로필에 대해 push/send를 부르면 "전원 인앱 + 구독자 푸시"가 한 번에 처리된다 → 중복 발송 없음.

// AI/시스템 프로필(편지 발신용). 알림 대상에서 제외한다.
const SYSTEM_PROFILE_ID = '00000000-0000-0000-0000-000000000001'

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
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('id')
    .neq('id', SYSTEM_PROFILE_ID)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const userIds = [...new Set((profiles ?? []).map((p) => p.id).filter(Boolean))] as string[]
  let pushed = 0
  if (userIds.length > 0) {
    const origin = new URL(request.url).origin
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
          body: JSON.stringify({ userId, type: 'category_reminder', url: '/category?mode=change' }),
        }).then((r) => {
          if (!r.ok) throw new Error(String(r.status))
        }),
      ),
    )
    pushed = results.filter((r) => r.status === 'fulfilled').length
  }

  return NextResponse.json({ ok: true, recipients: userIds.length, pushed })
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}
