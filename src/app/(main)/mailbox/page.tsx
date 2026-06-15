'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { Avatar as AvatarType } from '@/types'

const AVATAR_MAP: Record<number, AvatarType> = {
  1: 'cat', 2: 'rabbit', 3: 'bear', 4: 'frog', 5: 'hedgehog', 6: 'dog',
}

interface LetterItem {
  id: string
  partnerAvatar: AvatarType
  partnerNickname: string
  preview: string
  date: string
  unread: boolean
  isAi: boolean
}

type PartnerFilter = 'all' | 'human' | 'ai'

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

export default function MailboxPage() {
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const [partnerFilter, setPartnerFilter] = useState<PartnerFilter>('all')
  const [received, setReceived] = useState<LetterItem[]>([])
  const [sent, setSent] = useState<LetterItem[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 받은 편지
      const { data: receivedLetters } = await supabase
        .from('letters')
        .select('id, sender_id, sender_type, sender_display_name, content, sent_at, read_at')
        .eq('receiver_id', user.id)
        .lte('sent_at', new Date().toISOString())
        .order('sent_at', { ascending: false })

      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id)
      const blockedIds = new Set((blocks ?? []).map((block) => block.blocked_id))

      // 보낸 편지
      const { data: sentLetters } = await supabase
        .from('letters')
        .select('id, receiver_id, receiver_type, receiver_display_name, content, sent_at')
        .eq('sender_id', user.id)
        .order('sent_at', { ascending: false })

      // 대화 상대 프로필 일괄 조회
      const partnerIds = new Set<string>()
      receivedLetters?.forEach(l => {
        if (l.sender_id) partnerIds.add(l.sender_id)
      })
      sentLetters?.forEach(l => {
        if (l.receiver_id) partnerIds.add(l.receiver_id)
      })

      const profilesMap: Record<string, { avatar_type: number | null; nickname: string | null }> = {}
      if (partnerIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_type, nickname')
          .in('id', Array.from(partnerIds))
        profiles?.forEach(p => {
          profilesMap[p.id] = { avatar_type: p.avatar_type, nickname: p.nickname }
        })
      }

      const mapItem = (
        partnerId: string | null,
        l: {
          id: string
          content: string
          sent_at: string
          read_at?: string | null
          sender_type?: string | null
          receiver_type?: string | null
          sender_display_name?: string | null
          receiver_display_name?: string | null
        },
        isReceived: boolean
      ): LetterItem => {
        const isAi = isReceived ? l.sender_type === 'ai' : l.receiver_type === 'ai'
        const pid = partnerId ?? ''
        const p = profilesMap[pid] || {}
        return {
          id: l.id,
          partnerAvatar: isAi ? 'ai' : AVATAR_MAP[p.avatar_type ?? 1] ?? 'cat',
          partnerNickname:
            (isReceived ? l.sender_display_name : l.receiver_display_name) ??
            (isAi ? 'AI 마음친구' : p.nickname ?? '친구'),
          preview: l.content,
          date: formatDate(l.sent_at),
          unread: isReceived ? !l.read_at : false,
          isAi,
        }
      }

      setReceived((receivedLetters ?? [])
        .filter(l => !l.sender_id || !blockedIds.has(l.sender_id))
        .map(l => mapItem(l.sender_id, l, true)))
      setSent((sentLetters ?? []).map(l => mapItem(l.receiver_id, l, false)))
      setLoading(false)
    })()
  }, [])

  const baseList = tab === 'received' ? received : sent
  const list = baseList.filter(item =>
    partnerFilter === 'all' ? true : partnerFilter === 'ai' ? item.isAi : !item.isAi,
  )

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-0 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="px-6 flex items-center">
          <Link href="/home" className="font-mono text-[16px]">←</Link>
        </div>

        <div className="mt-3 px-6">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">그동안 받은 마음</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, margin: '8px 0 0', fontWeight: 400, lineHeight: 1.05 }}>
            편지<em style={{ color: '#00643E', fontStyle: 'italic' }}>집.</em>
          </h2>
        </div>

        <div className="mt-4 px-6 flex gap-[18px] border-b border-[#E0D9C7]">
          {(['received', 'sent'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pb-[10px] text-[13px] cursor-pointer bg-transparent border-none"
              style={{
                borderBottom: tab === t ? '2px solid #00643E' : '2px solid transparent',
                color: tab === t ? '#00643E' : '#5C544A',
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t === 'received' ? '받은 편지함' : '내가 쓴 편지함'}
              <span className="font-mono text-[10px] opacity-70 ml-1">
                {String(t === 'received' ? received.length : sent.length).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3 px-6 flex gap-[7px]">
          {([
            ['all', '전체'],
            ['human', '사람친구'],
            ['ai', 'AI'],
          ] as const).map(([key, lbl]) => {
            const active = partnerFilter === key
            return (
              <button
                key={key}
                onClick={() => setPartnerFilter(key)}
                className="px-[11px] py-[5px] rounded-full text-[11.5px] cursor-pointer transition-colors"
                style={{
                  background: active ? '#00643E' : 'transparent',
                  color: active ? '#FFFFFF' : '#5C544A',
                  border: `1px solid ${active ? '#00643E' : '#E0D9C7'}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                {lbl}
              </button>
            )
          })}
        </div>

        <div className="flex-1 px-4 py-[10px] flex flex-col gap-[6px] overflow-y-auto">
          {loading ? (
            <p className="text-center mt-6 text-[13px] text-[#5C544A]">불러오는 중…</p>
          ) : list.length === 0 ? (
            <p className="text-center mt-8 text-[13px] text-[#5C544A]">
              {partnerFilter === 'ai'
                ? 'AI 마음친구와 주고받은 편지가 없어요.'
                : partnerFilter === 'human'
                  ? '사람친구와 주고받은 편지가 없어요.'
                  : tab === 'received'
                    ? '아직 받은 편지가 없어요.'
                    : '아직 보낸 편지가 없어요.'}
            </p>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="px-3 py-3 rounded-[12px] flex items-center gap-3 cursor-pointer"
                style={{ background: item.unread ? 'rgba(0,100,62,0.04)' : 'transparent' }}
                onClick={() => router.push(`/letters/${item.id}`)}
              >
                <Avatar kind={item.partnerAvatar} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] tracking-[0.1em] opacity-60">
                      {tab === 'received' ? `${item.partnerNickname} → 나` : `나 → ${item.partnerNickname}`}
                    </span>
                    <span className="font-mono text-[9.5px] opacity-55 shrink-0">{item.date}</span>
                  </div>
                  <p
                    className="mt-[3px] text-[12.5px] leading-[1.4] overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ fontWeight: item.unread ? 600 : 400, color: item.unread ? '#1A1816' : '#5C544A' }}
                  >
                    {item.preview}
                  </p>
                </div>
                {item.unread && <span className="w-2 h-2 rounded-full bg-[#7FBE3C] shrink-0" />}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
