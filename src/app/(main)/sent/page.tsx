'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'
import Chip from '@/components/Chip'
import { createClient } from '@/lib/supabase/client'
import { Avatar as AvatarType } from '@/types'

const AVATAR_MAP: Record<number, AvatarType> = {
  1: 'cat', 2: 'rabbit', 3: 'bear', 4: 'frog', 5: 'hedgehog', 6: 'dog',
}

export default function SentPage() {
  return (
    <Suspense fallback={null}>
      <SentContent />
    </Suspense>
  )
}

function SentContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const aiReplyComing = searchParams?.get('ai') === '1'
  const [myAvatar, setMyAvatar] = useState<AvatarType>('rabbit')
  const [partnerAvatar, setPartnerAvatar] = useState<AvatarType>('bear')
  const [partnerNickname, setPartnerNickname] = useState('친구')

  useEffect(() => {
    (async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: me } = await supabase.from('profiles').select('avatar_type').eq('id', user.id).maybeSingle()
      if (me?.avatar_type) setMyAvatar(AVATAR_MAP[me.avatar_type] ?? 'rabbit')

      const { data: match } = await supabase
        .from('matches')
        .select('user_a_id, user_b_id')
        .eq('status', 'active')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (match) {
        const pid = match.user_a_id === user.id ? match.user_b_id : match.user_a_id
        const { data: p } = await supabase.from('profiles').select('avatar_type, nickname').eq('id', pid).maybeSingle()
        if (p?.avatar_type) setPartnerAvatar(AVATAR_MAP[p.avatar_type] ?? 'bear')
        if (p?.nickname) setPartnerNickname(p.nickname)
      } else {
        // 활성 매칭이 없으면 AI 마음친구와의 대화 (매칭 전)
        setPartnerAvatar('ai')
        setPartnerNickname('AI 마음친구')
      }
    })()
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(180deg,#CFE0E8 0%,#F0E8C8 100%)' }}>
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex items-center">
          <Chip>DELIVERY STARTED</Chip>
        </div>

        {/* 마을 일러스트 */}
        <div className="flex-1 relative mt-8">
          <svg viewBox="0 0 300 320" className="w-full h-full">
            <circle cx="240" cy="60" r="22" fill="#FFE5A0" opacity="0.85" />
            <path d="M0 240 Q80 180 160 220 T 320 200 L 320 320 L 0 320 Z" fill="#9CB87A" opacity="0.85" />
            <path d="M0 280 Q100 240 200 260 T 320 270 L 320 320 L 0 320 Z" fill="#7AA058" />
            <path d="M-10 270 Q120 240 320 290" stroke="#3D5A2A" strokeWidth="3" strokeDasharray="6 8" fill="none" />
            {/* 출발지 집 */}
            <rect x="40" y="195" width="14" height="14" fill="#E89878" />
            <polygon points="38,195 47,184 56,195" fill="#8C4838" />
            {/* 도착지 집 */}
            <rect x="250" y="200" width="14" height="14" fill="#B8D5E8" />
            <polygon points="248,200 257,189 266,200" fill="#5870A0" />
            {/* 버스 (출발 직후 흔들림 애니메이션) */}
            <g style={{ animation: 'busBounce 1.6s ease-in-out infinite' }}>
              <g transform="translate(130, 245)">
                <rect x="0" y="0" width="36" height="20" rx="4" fill="#00643E" />
                <rect x="4" y="4" width="7" height="6" fill="#F5F0E6" />
                <rect x="14" y="4" width="7" height="6" fill="#F5F0E6" />
                <rect x="24" y="4" width="7" height="6" fill="#F5F0E6" />
                <circle cx="9" cy="22" r="4" fill="#1A1816" />
                <circle cx="28" cy="22" r="4" fill="#1A1816" />
              </g>
            </g>
          </svg>
          <style jsx>{`
            @keyframes busBounce {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-3px); }
            }
          `}</style>
        </div>

        <div className="text-center mt-2">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-60">now traveling</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '8px 0 0', lineHeight: 1.2, fontWeight: 400 }}>
            편지 작성이<br /><em style={{ color: '#00643E', fontStyle: 'italic' }}>완료되었습니다.</em>
          </h2>
          <div className="mt-4 flex items-center justify-center gap-[14px]">
            <div className="flex flex-col items-center gap-2">
              <Avatar kind={myAvatar} size={48} />
              <span className="text-[11px] font-medium">나</span>
            </div>
            <span className="font-mono text-[20px] text-[#00643E] font-medium mb-5">→</span>
            <div className="flex flex-col items-center gap-2">
              <Avatar kind={partnerAvatar} size={48} />
              <span className="text-[11px] font-medium">{partnerNickname}</span>
            </div>
          </div>
        </div>

        {aiReplyComing && (
          <div className="mt-5 mx-1 rounded-[12px] bg-white/75 border border-[#E0D9C7] px-4 py-3 flex items-center gap-[10px]">
            <Avatar kind="ai" size={32} />
            <p className="text-[11.5px] leading-[1.4] text-[#5C544A]">
              <strong className="text-[#00643E]">AI 마음친구</strong>의 답장도
              <strong className="text-[#00643E]"> 약 1시간 뒤</strong> 편지집에 도착해요.
            </p>
          </div>
        )}

        <div className="mt-6">
          <Btn onClick={() => router.push('/home')}>홈화면으로 이동</Btn>
        </div>

      </div>
    </div>
  )
}
