import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/matching - 매칭 풀 등록 (+ 테스트용 즉시 매칭)
// 온보딩에서 관심사를 저장하면(=풀 등록) 마지막에 호출된다.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 운영 모드: 등록은 profiles.match_category 저장으로 이미 끝났고,
  // 실제 매칭은 월요일 주간 배치(/api/matching/batch)가 처리한다.
  if (process.env.MATCH_MODE !== 'instant') {
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
