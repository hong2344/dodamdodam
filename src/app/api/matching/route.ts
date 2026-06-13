import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isApplicationWindowOpen, APPLICATION_WINDOW_MESSAGE } from '@/lib/week'

export const dynamic = 'force-dynamic'

// POST /api/matching - 매칭 신청(관심사 저장) + 테스트용 즉시 매칭
// body: { category?: string }
//  - category가 있으면 = 매칭 신청. 운영 모드에선 PRD 신청 시간창(일 20-24시 KST)에만 허용한다.
//  - 온보딩 관심사 페이지가 이 라우트로 신청하고, /matching 페이지는 body 없이 호출(즉시모드 매칭 트리거).
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const isInstant = process.env.MATCH_MODE === 'instant'

  const body = (await request.json().catch(() => ({}))) as { category?: string }
  const category = body?.category

  // 매칭 신청: 관심사 저장.
  //  - 첫 신청(매칭 이력 없는 신규 가입자)은 아무 때나 허용 → 다음 월요일 배치에서 매칭.
  //  - 재신청(이전에 매칭된 적 있는 사용자)은 운영 모드에서 신청 시간창(일 20-24시 KST)에만 허용.
  if (category) {
    if (!isInstant && !isApplicationWindowOpen()) {
      const admin = createAdminClient()
      const { count } = await admin
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      const hasPriorMatch = (count ?? 0) > 0
      if (hasPriorMatch) {
        return NextResponse.json(
          { ok: false, error: 'not_in_window', message: APPLICATION_WINDOW_MESSAGE },
          { status: 403 }
        )
      }
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ match_category: category })
      .eq('id', user.id)
    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 })
    }
  }

  // 운영 모드: 실제 매칭은 월요일 주간 배치(/api/matching/batch)가 처리한다.
  if (!isInstant) {
    return NextResponse.json({ ok: true, mode: 'batch', matched: false })
  }

  // 테스트(즉시) 모드: 같은 엔진을 지금 한 번 돌려 대기 중인 상대와 바로 매칭한다.
  const admin = createAdminClient()
  const { error: matchErr } = await admin.rpc('run_weekly_matching')
  if (matchErr) {
    return NextResponse.json({ ok: false, error: matchErr.message }, { status: 500 })
  }
  await admin.rpc('send_match_notifications')

  // 내가 이번에 매칭됐는지 확인해서 알려준다.
  const { data: m } = await admin
    .from('matches')
    .select('id')
    .eq('status', 'active')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ ok: true, mode: 'instant', matched: !!m })
}
