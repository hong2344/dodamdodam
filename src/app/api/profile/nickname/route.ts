import { NextResponse } from 'next/server'
import { validateNickname } from '@/lib/profile/nickname'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { nickname, error } = validateNickname(requestUrl.searchParams.get('value') ?? '')

  if (error) {
    return NextResponse.json({ available: false, error }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ available: false, error: existingError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ available: false, error: '이미 사용 중인 닉네임이에요.' }, { status: 409 })
  }

  return NextResponse.json({ available: true, nickname })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { nickname: rawNickname } = (await request.json().catch(() => ({}))) as { nickname?: string }
  const { nickname, error } = validateNickname(rawNickname ?? '')

  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing, error: existingError } = await admin
    .from('profiles')
    .select('id')
    .ilike('nickname', nickname)
    .neq('id', user.id)
    .maybeSingle()

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  if (existing) {
    return NextResponse.json({ error: '이미 사용 중인 닉네임이에요.' }, { status: 409 })
  }

  const { error: upsertError } = await admin
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        nickname,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

  if (upsertError) {
    const message = upsertError.code === '23505' ? '이미 사용 중인 닉네임이에요.' : upsertError.message
    return NextResponse.json({ error: message }, { status: upsertError.code === '23505' ? 409 : 500 })
  }

  return NextResponse.json({ ok: true, nickname })
}
