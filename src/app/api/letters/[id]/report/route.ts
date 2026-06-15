import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    .select('id, sender_id, receiver_id, sender_type')
    .eq('id', id)
    .maybeSingle()

  if (error || !letter) {
    return NextResponse.json({ error: '편지를 찾을 수 없어요.' }, { status: 404 })
  }
  if (letter.receiver_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (letter.sender_type !== 'user' || !letter.sender_id || letter.sender_id === user.id) {
    return NextResponse.json({ error: '신고할 수 없는 편지예요.' }, { status: 400 })
  }

  const body = (await request.json().catch(() => ({}))) as { reason?: string }
  const { error: reportError } = await admin
    .from('reports')
    .insert({
      reporter_id: user.id,
      reported_id: letter.sender_id,
      letter_id: letter.id,
      reason: body.reason?.trim() || '부적절한 편지 내용',
    })

  if (reportError) {
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
