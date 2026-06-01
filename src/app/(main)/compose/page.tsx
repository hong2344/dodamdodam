'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'
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
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myAvatar, setMyAvatar] = useState<AvatarType>('rabbit')
  const [partnerAvatar, setPartnerAvatar] = useState<AvatarType>('bear')
  const [partnerNickname, setPartnerNickname] = useState('친구')
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [matchId, setMatchId] = useState<string | null>(null)

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
        setPartnerId(pid)
        const { data: p } = await supabase
          .from('profiles')
          .select('avatar_type, nickname')
          .eq('id', pid)
          .maybeSingle()
        if (p) {
          if (p.avatar_type) setPartnerAvatar(AVATAR_MAP[p.avatar_type] ?? 'bear')
          if (p.nickname) setPartnerNickname(p.nickname)
        }
      }
      setLoading(false)
    })()
  }, [])

  const handleSend = async () => {
    if (text.trim().length < 10) {
      setError('편지는 10자 이상 작성해주세요.')
      return
    }
    if (!matchId || !myUserId || !partnerId) {
      setError('매칭 정보를 찾을 수 없어요.')
      return
    }
    setSending(true)
    setError(null)
    const supabase = createClient()
    const { error: insertErr } = await supabase.from('letters').insert({
      match_id: matchId,
      sender_id: myUserId,
      receiver_id: partnerId,
      content: text.trim(),
    })
    setSending(false)
    if (insertErr) {
      setError('편지 전송에 실패했어요: ' + insertErr.message)
      return
    }
    router.push('/sent')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
        <p className="text-[13px] text-[#5C544A]">매칭 정보를 불러오는 중…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 680 }}>

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
            onChange={e => setText(e.target.value.slice(0, 1000))}
            maxLength={1000}
            className="absolute inset-0 w-full h-full bg-transparent border-none outline-none resize-none text-[#1A1816] p-[20px_18px]"
            style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: '28px' }}
          />
          <span className="absolute bottom-[10px] right-[14px] font-mono text-[10px] opacity-50">{text.length} / 1000</span>
        </div>

        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <div className="mt-4">
          <Btn disabled={text.trim().length < 10 || sending} onClick={handleSend}>
            {sending ? '보내는 중…' : '보내기 →'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
