'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'
import { getLetterPolicyMessage, getLetterPolicyViolation } from '@/lib/letterPolicy'
import { createClient } from '@/lib/supabase/client'
import { Avatar as AvatarType } from '@/types'

const AVATAR_MAP: Record<number, AvatarType> = {
  1: 'cat',
  2: 'rabbit',
  3: 'bear',
  4: 'frog',
  5: 'hedgehog',
  6: 'dog',
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposeForm />
    </Suspense>
  )
}

function ComposeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const replyTo = searchParams?.get('reply') || null
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<AvatarType>('rabbit')
  const [partnerAvatar, setPartnerAvatar] = useState<AvatarType>('bear')
  const [partnerNickname, setPartnerNickname] = useState('친구')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)
  // 내가 보낸 편지가 아직 가는 중이면 도착 시각(ms). 그동안 새 편지 전송 차단.
  const [blockedArrivalAt, setBlockedArrivalAt] = useState<number | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  // 차단 남은 시간 카운트다운(도착하면 자동 해제)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(t)
  }, [])

  // 입력은 막지 않고(글자 사라짐·조합 깜빡임 방지) 자유롭게 받는다.
  // 금지어 검사는 아래 policyViolation으로 실시간 안내 + 전송 차단으로 처리한다.
  const handleTextChange = (nextText: string) => {
    setText(nextText.slice(0, 1000))
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setMyUserId(user.id)

      // 내 프로필
      const { data: me } = await supabase
        .from('profiles')
        .select('avatar_type')
        .eq('id', user.id)
        .maybeSingle()
      if (me?.avatar_type) setMyAvatar(AVATAR_MAP[me.avatar_type] ?? 'rabbit')

      // 활성 매칭 + 상대방
      const { data: match } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id')
        .eq('status', 'active')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (match) {
        setMatchId(match.id)
        const pid = match.user_a_id === user.id ? match.user_b_id : match.user_a_id
        const { data: p } = await supabase
          .from('profiles')
          .select('avatar_type, nickname')
          .eq('id', pid)
          .maybeSingle()
        if (p) {
          if (p.avatar_type) setPartnerAvatar(AVATAR_MAP[p.avatar_type] ?? 'bear')
          if (p.nickname) setPartnerNickname(p.nickname)
        }

        // 내가 보낸 편지가 아직 가는 중(도착 전)이면 전송 차단
        const { data: pending } = await supabase
          .from('letters')
          .select('sent_at')
          .eq('match_id', match.id)
          .eq('sender_id', user.id)
          .eq('receiver_type', 'user')
          .gt('sent_at', new Date().toISOString())
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pending?.sent_at) setBlockedArrivalAt(new Date(pending.sent_at + 'Z').getTime())
      } else {
        // 매칭된 사람이 없으면 AI 마음친구와의 대화
        setPartnerAvatar('ai')
        setPartnerNickname('AI 마음친구')

        // 내가 AI에게 보낸 편지가 아직 가는 중(도착 전)이면 전송 차단
        const { data: pending } = await supabase
          .from('letters')
          .select('sent_at')
          .is('match_id', null)
          .eq('sender_id', user.id)
          .eq('receiver_type', 'ai')
          .gt('sent_at', new Date().toISOString())
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pending?.sent_at) setBlockedArrivalAt(new Date(pending.sent_at + 'Z').getTime())
      }
      setLoading(false)
    })()
  }, [])

  const handleSend = async () => {
    if (blockedArrivalAt && Date.now() < blockedArrivalAt) {
      setError('편지가 아직 가는 중이에요. 도착한 뒤에 보낼 수 있어요.')
      return
    }

    const violation = getLetterPolicyViolation(text)
    if (violation) {
      setError(getLetterPolicyMessage(violation))
      return
    }

    if (text.trim().length < 10) {
      setError('편지는 10자 이상 작성해주세요.')
      return
    }
    if (!myUserId) {
      setError('로그인이 필요해요.')
      return
    }
    setSending(true)
    setError(null)
    const response = await fetch('/api/letters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim(), replyTo }),
    })
    setSending(false)

    const body = await response.json().catch(() => null)
    if (!response.ok) {
      // 서버 가드: 이전 편지가 아직 도착 전이면 차단
      if (response.status === 409 && body?.code === 'letter_in_transit') {
        if (body.arrivalAt) setBlockedArrivalAt(new Date(body.arrivalAt + 'Z').getTime())
        setError('편지가 아직 가는 중이에요. 도착한 뒤에 보낼 수 있어요.')
        return
      }
      setError('편지 전송에 실패했어요: ' + (body?.error || response.status))
      return
    }
    // AI 답장이 생성됐으면(매칭 후 첫 편지/매칭 전) sent 화면에서 1시간 뒤 도착 안내
    router.push(body?.aiReplyCreated ? '/sent?ai=1' : '/sent')
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F5F0E6]">
        <p className="text-[13px] text-[#5C544A]">매칭 정보를 불러오는 중…</p>
      </div>
    )
  }

  // 현재 입력값의 금지어 위반(없으면 null). 실시간 안내 + 전송 버튼 차단에 사용.
  const policyViolation = text.trim().length > 0 ? getLetterPolicyViolation(text) : null
  const isBlocked = blockedArrivalAt !== null && now < blockedArrivalAt
  const remainText = (() => {
    if (!blockedArrivalAt) return ''
    const ms = blockedArrivalAt - now
    if (ms <= 0) return ''
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return h > 0 ? `약 ${h}시간 ${m}분 뒤 도착` : `약 ${m}분 뒤 도착`
  })()

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href="/home" className="font-mono text-[16px]">←</Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>편지쓰기</span>
          <span className="w-4" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-[14px]">
          <div className="flex flex-col items-center gap-2">
            <Avatar kind={myAvatar} size={56} />
            <span className="text-[12px] font-medium">나</span>
          </div>
          <span className="font-mono text-[24px] text-[#00643E] font-medium mb-5">→</span>
          <div className="flex flex-col items-center gap-2">
            <Avatar kind={partnerAvatar} size={56} />
            <span className="text-[12px] font-medium">{partnerNickname}</span>
          </div>
        </div>

        {!matchId && !isBlocked && (
          <p className="mt-3 text-center text-[12px] leading-relaxed text-[#5C544A]">
            아직 매칭 친구가 없어도 괜찮아요. 편지를 쓰면 답장이 도착해요.
          </p>
        )}

        {isBlocked && (
          <div className="mt-4 mx-1 rounded-[12px] bg-white/70 border border-[#E0D9C7] px-4 py-3 text-center">
            <p className="text-[12.5px] font-semibold text-[#00643E]">편지가 가는 중이에요</p>
            <p className="mt-1 text-[11px] text-[#5C544A] leading-relaxed">
              {partnerNickname} 님께 보낸 편지가 도착하면<br />새 편지를 보낼 수 있어요. {remainText && `(${remainText})`}
            </p>
          </div>
        )}

        <div
          className="mt-6 flex-1 relative rounded-[14px] overflow-hidden"
          style={{
            background: '#FAF6EC',
            border: '1px solid #E0D9C7',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, rgba(20,15,8,0.08) 27px, rgba(20,15,8,0.08) 28px)',
            minHeight: 280,
          }}
        >
          {text.length === 0 && (
            <p
              className="absolute top-[20px] left-[18px] pointer-events-none m-0 text-[#5C544A]"
              style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: '28px' }}
            >
              따뜻한 마음을 담아<br />편지를 써보세요… (10자 이상)
            </p>
          )}
          <textarea
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            maxLength={1000}
            disabled={isBlocked}
            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none text-[#1A1816] p-[20px_18px] disabled:opacity-50"
            style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: '28px' }}
          />
          <span className="absolute bottom-[10px] right-[14px] font-mono text-[10px] opacity-50">{text.length} / 1000</span>
        </div>

        {policyViolation && !error && (
          <p className="mt-2 text-[12px] text-[#C2410C]">{getLetterPolicyMessage(policyViolation)}</p>
        )}
        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <div className="mt-4">
          <Btn disabled={isBlocked || text.trim().length < 10 || sending || policyViolation !== null} onClick={handleSend}>
            {sending ? '보내는 중…' : isBlocked ? '편지가 가는 중…' : '보내기 →'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
