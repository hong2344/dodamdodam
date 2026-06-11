import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/letters/[id]/read
// 받은 편지를 '열람 처리'한다. 처음 여는 경우에만 read_at을 기록하고,
// 사람이 보낸 편지라면 발신자에게 '상대가 편지를 읽었어요'(letter_opened) 푸시를 보낸다.
// (AI가 보낸 편지는 발신자가 없으므로 푸시를 보내지 않는다.)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: letter, error } = await admin
    .from('letters')
    .select('id, sender_id, receiver_id, sender_type, read_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !letter) {
    return NextResponse.json({ error: '편지를 찾을 수 없어요.' }, { status: 404 })
  }
  // 수신자 본인만 열람 처리할 수 있다.
  if (letter.receiver_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  // 이미 읽은 편지면 아무 것도 하지 않는다(푸시 중복 방지).
  if (letter.read_at) {
    return NextResponse.json({ ok: true, alreadyRead: true })
  }

  const readAt = new Date().toISOString()
  const { error: updateErr } = await admin
    .from('letters')
    .update({ read_at: readAt })
    .eq('id', letter.id)
    .is('read_at', null) // 동시 열람 경합에서도 한 번만 성공하도록
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 사람이 보낸 편지면 발신자에게 열람 알림 푸시.
  let pushed = false
  const pushSecret = process.env.PUSH_API_SECRET
  if (pushSecret && letter.sender_type === 'user' && letter.sender_id) {
    const origin = new URL(request.url).origin
    const res = await fetch(`${origin}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pushSecret}` },
      body: JSON.stringify({
        userId: letter.sender_id,
        type: 'letter_opened',
        body: '내가 보낸 편지를 상대가 읽었어요.',
        url: '/sent',
        data: { letterId: letter.id },
      }),
    }).catch(() => null)
    pushed = !!res?.ok
  }

  return NextResponse.json({ ok: true, readAt, pushed })
}
