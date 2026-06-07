import { NextResponse } from 'next/server'
import { generateAiLetterReply } from '@/lib/ai/reply'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// GET /api/letters?type=received|sent
export async function GET() {
  // TODO: 편지 목록 조회
  return NextResponse.json({ letters: [] })
}

// POST /api/letters
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { content } = (await request.json().catch(() => ({}))) as { content?: string }
  const letterContent = content?.trim()

  if (!letterContent || letterContent.length < 10) {
    return NextResponse.json({ error: '편지는 10자 이상 작성해주세요.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: match } = await admin
    .from('matches')
    .select('id, user_a_id, user_b_id')
    .eq('status', 'active')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const partnerId = match
    ? match.user_a_id === user.id
      ? match.user_b_id
      : match.user_a_id
    : null

  const { data: sentLetter, error: sentError } = await admin
    .from('letters')
    .insert({
      match_id: match?.id ?? null,
      sender_id: user.id,
      receiver_id: partnerId,
      sender_type: 'user',
      receiver_type: partnerId ? 'user' : 'ai',
      receiver_display_name: partnerId ? null : 'AI 마음친구',
      content: letterContent,
    })
    .select('id')
    .single()

  if (sentError || !sentLetter) {
    return NextResponse.json({ error: sentError?.message || '편지 전송에 실패했어요.' }, { status: 500 })
  }

  const aiContent = await generateAiLetterReply(letterContent)
  const aiArrivalAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const { error: aiError } = await admin
    .from('letters')
    .insert({
      match_id: match?.id ?? null,
      sender_id: null,
      receiver_id: user.id,
      sender_type: 'ai',
      receiver_type: 'user',
      sender_display_name: 'AI 마음친구',
      original_letter_id: sentLetter.id,
      content: aiContent,
      sent_at: aiArrivalAt,
    })

  if (aiError) {
    return NextResponse.json({ error: aiError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, letterId: sentLetter.id, aiReplyCreated: true, aiArrivalAt, matched: !!match })
}
