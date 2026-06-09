'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'
import { createClient } from '@/lib/supabase/client'
import { Avatar as AvatarType } from '@/types'

const AVATAR_MAP: Record<number, AvatarType> = {
  1: 'cat', 2: 'rabbit', 3: 'bear', 4: 'frog', 5: 'hedgehog', 6: 'dog',
}

interface LetterData {
  content: string
  sent_at: string
  read_at: string | null
  senderAvatar: AvatarType
  senderName: string
  receiverAvatar: AvatarType
  receiverName: string
  isIncoming: boolean // true: 내가 받은 편지, false: 내가 보낸 편지
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function ReadLetterPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const letterId = params?.id

  const [data, setData] = useState<LetterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!letterId) return
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('로그인이 필요합니다.')
        setLoading(false)
        return
      }

      const { data: letter, error: letterErr } = await supabase
        .from('letters')
        .select('id, sender_id, receiver_id, sender_type, receiver_type, sender_display_name, receiver_display_name, content, sent_at, read_at')
        .eq('id', letterId)
        .lte('sent_at', new Date().toISOString())
        .maybeSingle()

      if (letterErr || !letter) {
        setError('편지를 불러올 수 없어요.')
        setLoading(false)
        return
      }

      // 발신/수신 프로필 일괄 조회
      const profileIds = [letter.sender_id, letter.receiver_id].filter((id): id is string => typeof id === 'string')
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, avatar_type, nickname')
        .in('id', profileIds)

      const sender = profiles?.find(p => p.id === letter.sender_id)
      const receiver = profiles?.find(p => p.id === letter.receiver_id)
      const isIncoming = letter.receiver_id === user.id
      const isAiSender = letter.sender_type === 'ai'
      const isAiReceiver = letter.receiver_type === 'ai'

      // 받은 편지를 처음 읽는 경우 read_at 업데이트
      if (isIncoming && !letter.read_at) {
        await supabase
          .from('letters')
          .update({ read_at: new Date().toISOString() })
          .eq('id', letter.id)
      }

      setData({
        content: letter.content,
        sent_at: letter.sent_at,
        read_at: letter.read_at,
        senderAvatar: isAiSender ? 'ai' : AVATAR_MAP[sender?.avatar_type ?? 1] ?? 'cat',
        senderName: isAiSender ? (letter.sender_display_name ?? 'AI 마음친구') : sender?.nickname ?? '친구',
        receiverAvatar: isAiReceiver ? 'ai' : AVATAR_MAP[receiver?.avatar_type ?? 1] ?? 'cat',
        receiverName: isIncoming ? '나' : isAiReceiver ? (letter.receiver_display_name ?? 'AI 마음친구') : (receiver?.nickname ?? '친구'),
        isIncoming,
      })
      setLoading(false)
    })()
  }, [letterId])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F5F0E6]">
        <p className="text-[13px] text-[#5C544A]">편지를 불러오는 중…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F5F0E6]">
        <p className="text-[13px] text-red-600">{error || '편지를 찾을 수 없어요.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href="/mailbox" className="font-mono text-[16px]">←</Link>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>편지 읽기</span>
          <span className="w-4" />
        </div>

        <div className="mt-5 flex items-center justify-center gap-[14px]">
          <div className="flex flex-col items-center gap-2">
            <Avatar kind={data.senderAvatar} size={56} />
            <span className="text-[12px] font-medium">
              {data.isIncoming ? data.senderName : '나'}
            </span>
          </div>
          <span className="font-mono text-[24px] text-[#00643E] font-medium mb-5">→</span>
          <div className="flex flex-col items-center gap-2">
            <Avatar kind={data.receiverAvatar} size={56} />
            <span className="text-[12px] font-medium">{data.receiverName}</span>
          </div>
        </div>

        <div
          className="mt-5 flex-1 relative rounded-[14px] overflow-hidden"
          style={{
            background: '#FAF6EC',
            border: '1px solid #E0D9C7',
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(20,15,8,0.07) 23px, rgba(20,15,8,0.07) 24px)',
            padding: '20px 18px 50px',
            minHeight: 280,
          }}
        >
          <p
            className="m-0 text-[#1A1816] whitespace-pre-wrap"
            style={{ fontFamily: 'var(--font-display)', fontSize: 13.5, lineHeight: '24px' }}
          >
            {data.content}
          </p>
          <span className="absolute bottom-3 right-4 font-mono text-[10px] opacity-55">{formatDate(data.sent_at)}</span>
        </div>

        {data.isIncoming && (
          <div className="mt-4">
            <Btn onClick={() => router.push('/compose')}>답장쓰기 →</Btn>
          </div>
        )}

      </div>
    </div>
  )
}
