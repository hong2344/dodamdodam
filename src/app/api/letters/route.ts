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

  const { content, replyTo } = (await request.json().catch(() => ({}))) as {
    content?: string
    replyTo?: string
  }
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

  // 보낸 편지가 아직 운행 중(도착 전)이면 새 편지를 막는다.
  // (내가 보낸 버스가 도착해야 다음 편지를 보낼 수 있음)
  // - 매칭 후: 상대(user)에게 가는 편지 기준
  // - 매칭 전: AI에게 가는 편지 기준 (매칭 전에도 한 통씩 버스로 오감)
  {
    const pendingQuery = admin
      .from('letters')
      .select('id, sent_at')
      .eq('sender_id', user.id)
      .eq('receiver_type', partnerId ? 'user' : 'ai')
      .gt('sent_at', new Date().toISOString())
      .order('sent_at', { ascending: false })
      .limit(1)
    if (partnerId) pendingQuery.eq('match_id', match!.id)
    else pendingQuery.is('match_id', null)
    const { data: pending } = await pendingQuery.maybeSingle()
    if (pending) {
      return NextResponse.json(
        {
          error: '편지가 아직 가는 중이에요. 도착한 뒤에 새 편지를 보낼 수 있어요.',
          code: 'letter_in_transit',
          arrivalAt: pending.sent_at,
        },
        { status: 409 },
      )
    }
  }

  // 답장 연결: replyTo가 '내가 받은 사람 편지'면 그 편지의 답장으로 기록(original_letter_id).
  // 이걸로 홈에서 왕복(스레드) 색을 시작자 기준으로 칠한다. AI 편지/무효값은 무시(새 스레드).
  let originalLetterId: string | null = null
  if (replyTo && partnerId) {
    const { data: replied } = await admin
      .from('letters')
      .select('id')
      .eq('id', replyTo)
      .eq('match_id', match!.id)
      .eq('receiver_id', user.id)
      .eq('sender_type', 'user')
      .maybeSingle()
    if (replied) originalLetterId = replied.id
  }

  // sent_at = 도착(arrival) 시각. 매칭 상대에게 가는 편지는 3시간, AI 관련 편지는 1시간 뒤 도착.
  const HUMAN_DELIVERY_MS = 3 * 60 * 60 * 1000
  const AI_DELIVERY_MS = 60 * 60 * 1000
  const userArrivalAt = new Date(
    Date.now() + (partnerId ? HUMAN_DELIVERY_MS : AI_DELIVERY_MS),
  ).toISOString()

  const { data: sentLetter, error: sentError } = await admin
    .from('letters')
    .insert({
      match_id: match?.id ?? null,
      sender_id: user.id,
      receiver_id: partnerId,
      sender_type: 'user',
      receiver_type: partnerId ? 'user' : 'ai',
      receiver_display_name: partnerId ? null : 'AI 마음친구',
      original_letter_id: originalLetterId,
      content: letterContent,
      sent_at: userArrivalAt,
    })
    .select('id')
    .single()

  if (sentError || !sentLetter) {
    return NextResponse.json({ error: sentError?.message || '편지 전송에 실패했어요.' }, { status: 500 })
  }

  // AI 답장 여부 결정
  // - 매칭 전: 항상 답장 (AI와 자유롭게 주고받음)
  // - 매칭 후: 그 매칭에서 내가 보낸 '첫 번째' 편지에만 1회 답장
  let shouldAiReply = true
  if (partnerId) {
    const { count } = await admin
      .from('letters')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', match!.id)
      .eq('sender_id', user.id)
      .eq('sender_type', 'user')
      .neq('id', sentLetter.id)
    shouldAiReply = (count ?? 0) === 0
  }

  let aiArrivalAt: string | null = null
  if (shouldAiReply) {
    const aiContent = await generateAiLetterReply(letterContent)
    aiArrivalAt = new Date(Date.now() + AI_DELIVERY_MS).toISOString()
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
  }

  return NextResponse.json({ ok: true, letterId: sentLetter.id, aiReplyCreated: shouldAiReply, aiArrivalAt, matched: !!match })
}
