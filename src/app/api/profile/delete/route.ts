import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// 회원 탈퇴: 계정(auth)과 개인 데이터는 즉시 삭제하고,
// 상대방과 주고받은 편지/매칭은 남겨두되 발신자를 "탈퇴한 사용자"로 익명화한다.
// (letters·matches가 profiles를 NOT NULL/NO ACTION으로 참조하므로 프로필 행은 삭제하지 않고
//  개인정보만 비워 익명 처리한다. 표시 로직은 profiles.nickname을 조인하므로 자동으로 익명화된다.)
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const uid = user.id
  const admin = createAdminClient()

  // 1) 프로필 익명화 — 개인정보 제거, 닉네임을 "탈퇴한 사용자"로, 매칭 대상에서 제외
  const { error: anonError } = await admin
    .from('profiles')
    .update({
      nickname: '탈퇴한 사용자',
      nickname_set: false,
      email: null,
      age: null,
      birth_date: null,
      real_name: null,
      phone_number: null,
      verification_id: null,
      verification_ci: null,
      is_verified: false,
      login_username: null,
      username: null,
      bio: null,
      location: null,
      match_category: null,
      is_active: false,
      last_seen: null,
    })
    .eq('id', uid)

  if (anonError) {
    return NextResponse.json({ error: `프로필 익명화 실패: ${anonError.message}` }, { status: 500 })
  }

  // 2) 개인 데이터 삭제 (상대방과 무관한 본인 전용 데이터)
  const cleanups: { table: string; column: string }[] = [
    { table: 'notifications', column: 'user_id' },
    { table: 'push_subscriptions', column: 'user_id' },
    { table: 'point_logs', column: 'user_id' },
    { table: 'user_items', column: 'profile_id' },
  ]

  for (const { table, column } of cleanups) {
    const { error } = await admin.from(table).delete().eq(column, uid)
    if (error) {
      return NextResponse.json({ error: `${table} 삭제 실패: ${error.message}` }, { status: 500 })
    }
  }

  // 차단 기록(양방향) 삭제
  for (const table of ['blocks', 'blocked_users'] as const) {
    const cols = table === 'blocks' ? ['blocker_id', 'blocked_id'] : ['user_id', 'blocked_user_id']
    const { error } = await admin.from(table).delete().or(`${cols[0]}.eq.${uid},${cols[1]}.eq.${uid}`)
    if (error) {
      return NextResponse.json({ error: `${table} 삭제 실패: ${error.message}` }, { status: 500 })
    }
  }

  // 본인이 제출한 신고 삭제 (본인에 대한 신고는 익명화된 프로필을 가리킨 채 보존)
  const { error: reportError } = await admin.from('reports').delete().eq('reporter_id', uid)
  if (reportError) {
    return NextResponse.json({ error: `reports 삭제 실패: ${reportError.message}` }, { status: 500 })
  }

  // 3) 계정 삭제 — 로그인 불가 상태로 만들고 auth 세션/식별자 제거
  const { error: authError } = await admin.auth.admin.deleteUser(uid)
  if (authError) {
    return NextResponse.json({ error: `계정 삭제 실패: ${authError.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
