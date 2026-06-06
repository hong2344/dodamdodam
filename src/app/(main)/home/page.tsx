'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import HouseIcon from '@/components/HouseIcon'
import { createClient } from '@/lib/supabase/client'
import { usePushNotification } from '@/hooks/usePushNotification'
import { HomeState, Avatar as AvatarType } from '@/types'

// avatar_type 숫자 → 동물 매핑
const AVATAR_MAP: Record<number, AvatarType> = {
  1: 'cat',
  2: 'rabbit',
  3: 'bear',
  4: 'frog',
  5: 'hedgehog',
  6: 'dog',
}
const AVATAR_LABEL: Record<AvatarType, string> = {
  cat: '고양이',
  rabbit: '토끼',
  bear: '곰',
  frog: '개구리',
  hedgehog: '고슴도치',
  dog: '강아지',
}

// theme → 카드 스타일
const VILLAGE_PALETTES: Record<string, { name: string; bg: string }> = {
  dawn:    { name: '새벽', bg: 'linear-gradient(170deg,#C8AED8 0%,#E8B8B0 82%,#F0CDB0 100%)' },
  morning: { name: '오전', bg: 'linear-gradient(170deg,#B8D5E8 0%,#E0E8E0 100%)' },
  evening: { name: '저녁', bg: 'linear-gradient(170deg,#E8A878 0%,#D87858 80%,#8C4838 100%)' },
  night:   { name: '밤',   bg: 'linear-gradient(170deg,#2A3858 0%,#1A2240 80%,#0A0E1F 100%)' },
}

// 운영 모드: 30분마다 1칸씩 이동 (총 3시간)
const CELL_MS = 30 * 60 * 1000
const TOTAL_MS = 6 * CELL_MS

function formatElapsed(ms: number): string {
  const fmt = (totalMs: number) => {
    const totalSec = Math.floor(totalMs / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${fmt(ms)} / ${fmt(TOTAL_MS)}`
}

interface ProgressBarProps {
  label: string
  time: string
  cell: number
  reverse?: boolean
}

function ProgressBar({ label, time, cell, reverse }: ProgressBarProps) {
  const safeCell = Math.max(0, Math.min(6, cell))
  return (
    <div className="px-[18px] pb-[6px]">
      <div className="p-[10px_12px] bg-white/85 border border-[#E0D9C7] rounded-[14px] font-mono text-[10px] tracking-[0.06em]" style={{ color: '#1A1816' }}>
        <div className="flex justify-between mb-2">
          <span className="opacity-60">{label}</span>
          <span className="opacity-60">{time}</span>
        </div>
        <div className="flex items-center gap-1 relative">
          {Array.from({ length: 6 }).map((_, i) => {
            const filled = reverse ? i >= 6 - safeCell : i < safeCell
            return <div key={i} className="flex-1 h-1 rounded-sm" style={{ background: filled ? '#00643E' : 'rgba(20,15,8,0.12)' }} />
          })}
          <div
            className="absolute top-1/2"
            style={{
              left: reverse ? `${(1 - safeCell / 6) * 100}%` : `${(safeCell / 6) * 100}%`,
              transform: `translate(${reverse ? '0' : '-100%'}, -50%)${reverse ? ' scaleX(-1)' : ''}`,
              transition: 'left 0.5s ease-out',
            }}
          >
            <svg width="22" height="14" viewBox="0 0 36 24">
              <rect x="0" y="0" width="36" height="20" rx="4" fill="#00643E" />
              <rect x="4" y="4" width="7" height="6" fill="#F5F0E6" />
              <rect x="14" y="4" width="7" height="6" fill="#F5F0E6" />
              <rect x="24" y="4" width="7" height="6" fill="#F5F0E6" />
              <circle cx="9" cy="22" r="4" fill="#1A1816" />
              <circle cx="28" cy="22" r="4" fill="#1A1816" />
            </svg>
          </div>
        </div>
        {/* 진행선 양 끝 편지집 위치 (왼쪽=내 편지집, 오른쪽=상대 편지집) */}
        <div className="flex items-start justify-between mt-[7px] text-[8.5px] leading-none opacity-70">
          <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />내 편지집</span>
          <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />상대 편지집</span>
        </div>
      </div>
    </div>
  )
}

interface HomeData {
  myAvatar: AvatarType
  myNickname: string
  villageTheme: string
  matchId: string | null
  partnerAvatar: AvatarType | null
  partnerNickname: string | null
  // 가장 최근 letter
  latestSenderId: string | null
  latestSentAt: number | null
  latestReadAt: number | null
}

export default function HomePage() {
  const router = useRouter()
  const [now, setNow] = useState<number>(() => Date.now())
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const push = usePushNotification({
    getAccessToken: async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
  })

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  // 테스트 모드: 매초 업데이트 (운영 모드에선 60_000으로 변경)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(t)
  }, [])

  // DB에서 데이터 로드
  useEffect(() => {
    (async () => {
      const supabase = createClient()

      // 1) 현재 사용자
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setMyUserId(user.id)

      // 2) 내 프로필
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_type, nickname, village_id')
        .eq('id', user.id)
        .maybeSingle()

      // 3) 내 마을 정보
      let villageTheme = 'morning'
      if (profile?.village_id) {
        const { data: village } = await supabase
          .from('villages')
          .select('theme')
          .eq('id', profile.village_id)
          .maybeSingle()
        if (village?.theme) villageTheme = village.theme
      }

      // 4) 활성 매칭
      const { data: match } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id')
        .eq('status', 'active')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 5) 매칭된 상대방 프로필
      let partnerAvatar: AvatarType | null = null
      let partnerNickname: string | null = null
      let partnerId: string | null = null
      if (match) {
        partnerId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id
        const { data: partner } = await supabase
          .from('profiles')
          .select('avatar_type, nickname')
          .eq('id', partnerId)
          .maybeSingle()
        if (partner) {
          partnerAvatar = AVATAR_MAP[partner.avatar_type ?? 1] ?? 'cat'
          partnerNickname = partner.nickname ?? '친구'
        }
      }

      // 6) 가장 최근 편지
      let latestSenderId: string | null = null
      let latestSentAt: number | null = null
      let latestReadAt: number | null = null
      if (match) {
        const { data: letter } = await supabase
          .from('letters')
          .select('sender_id, sent_at, read_at')
          .eq('match_id', match.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (letter) {
          latestSenderId = letter.sender_id
          // letters.sent_at은 timestamp without time zone(UTC 저장) → 'Z' 붙여 UTC로 명시
          latestSentAt = letter.sent_at ? new Date(letter.sent_at + 'Z').getTime() : null
          latestReadAt = letter.read_at ? new Date(letter.read_at + 'Z').getTime() : null
        }
      }

      setData({
        myAvatar: AVATAR_MAP[profile?.avatar_type ?? 1] ?? 'cat',
        myNickname: profile?.nickname ?? '나',
        villageTheme,
        matchId: match?.id ?? null,
        partnerAvatar,
        partnerNickname,
        latestSenderId,
        latestSentAt,
        latestReadAt,
      })
      setLoading(false)
    })()
  }, [])

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
        <p className="text-[13px] text-[#5C544A]">홈을 불러오는 중…</p>
      </div>
    )
  }

  const v = VILLAGE_PALETTES[data.villageTheme] || VILLAGE_PALETTES.morning

  // 상태 계산
  let state: HomeState = 1
  let progress: ProgressBarProps | null = null

  if (data.matchId) {
    state = 2 // 매칭됨, 아직 편지 없음
    if (data.latestSentAt) {
      const elapsed = now - data.latestSentAt
      const cell = Math.min(6, Math.floor(elapsed / CELL_MS))
      const isMine = data.latestSenderId === myUserId

      // 🚧 MVP 테스트 모드: 운행 중일 때만 진행 바 표시.
      // 도착 후엔 다시 "매칭 완료(state 2)"로 돌려서 새 편지를 바로 보낼 수 있게 함.
      // 운영 모드(편지 1통 제한)에선 else 분기를 살려두는 게 맞음.
      if (elapsed < TOTAL_MS) {
        if (isMine) {
          state = 3
          progress = { label: '버스 운행 중', time: formatElapsed(elapsed), cell, reverse: false }
        } else {
          state = 5
          progress = { label: `${data.partnerNickname ?? '친구'} 님의 답장 운행 중`, time: formatElapsed(elapsed), cell, reverse: true }
        }
      } else {
        // 도착 후에도 진행바 유지 (state 2로 새 편지 작성도 가능)
        if (isMine) {
          progress = { label: '버스 도착', time: formatElapsed(TOTAL_MS), cell: 6, reverse: false }
        } else {
          progress = { label: `${data.partnerNickname ?? '친구'} 님의 답장 도착`, time: formatElapsed(TOTAL_MS), cell: 6, reverse: true }
        }
      }
    }
  }

  const showBanner = state >= 2
  const showProgress = progress !== null
  const dim = state === 1
  const badgeN = false // MVP 테스트 모드: state 6 비활성화. 운영 모드 복구 시 `state === 6`로 변경.
  const isDark = data.villageTheme === 'night' || data.villageTheme === 'evening'
  const textColor = isDark ? '#FFFFFF' : '#1A1816'
  // 그라데이션 배경 위에서 글씨가 묻히지 않도록 대비 보강
  const textShadow = isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.55)'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E6' }}>
      <div
        className="w-full max-w-[375px] flex flex-col relative"
        style={{ minHeight: 680, background: v.bg, borderRadius: 20, color: textColor, overflow: 'hidden' }}
      >
        {/* 하단 노란 띠 (5px) */}
        <div className="absolute left-0 right-0 bottom-0 z-10" style={{ height: 20, background: '#F5EBC8' }} />
        <div className="pt-3 px-6 flex items-center justify-between" style={{ transform: 'translateY(10px)' }}>
          {push.isSupported ? (
            <button
              onClick={() => (push.isSubscribed ? push.unsubscribe() : push.requestPermissionAndSubscribe())}
              disabled={push.isLoading}
              aria-label={push.isSubscribed ? '알림 끄기' : '알림 켜기'}
              className="font-mono text-[11px] tracking-[0.08em] opacity-85 hover:opacity-100 transition-opacity disabled:opacity-40 inline-flex items-center gap-[5px]"
              style={{ color: textColor, textShadow, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                {!push.isSubscribed && <line x1="3" y1="3" x2="21" y2="21" />}
              </svg>
              {push.isLoading
                ? '처리 중…'
                : push.isSubscribed
                  ? '알림 끄기'
                  : '알림 켜기'}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="로그아웃"
            className="font-mono text-[11px] tracking-[0.08em] opacity-85 hover:opacity-100 transition-opacity disabled:opacity-40"
            style={{ color: textColor, textShadow, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {loggingOut ? '로그아웃 중…' : '로그아웃'}
          </button>
        </div>
        {push.error && (
          <p className="px-6 font-mono text-[10px] text-red-500 -mt-1" style={{ transform: 'translateY(10px)' }}>{push.error}</p>
        )}
        <div className="px-6 text-center" style={{ marginTop: 18 }}>
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-70" style={{ textShadow }}>WELCOME TO</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '4px 0 0', fontWeight: 400, color: textColor, textShadow }}>{v.name} 마을</h2>
        </div>

        {showBanner && data.partnerAvatar && (
          <div
            className="mx-[18px] bg-white/85 border border-[#E0D9C7] rounded-[14px] flex items-center gap-[10px] cursor-pointer"
            style={{ color: '#1A1816', marginTop: 30, padding: '13px 12px' }}
            onClick={() => router.push('/compose')}
          >
            <Avatar kind={data.partnerAvatar} size={36} />
            <div className="flex-1 text-[11.5px] leading-[1.35]">
              <strong className="text-[#00643E]">매칭 완료</strong>
              <div className="text-[10.5px] text-[#5C544A]">편지를 작성하려면 여기를 클릭하세요</div>
            </div>
            <span className="font-mono text-[16px] text-[#00643E]">→</span>
          </div>
        )}

        <div className="flex-1 relative mt-5">
          <svg viewBox="0 0 300 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <ellipse cx="50" cy="190" rx="120" ry="30" fill="rgba(0,100,62,0.18)" />
            <ellipse cx="240" cy="200" rx="150" ry="40" fill="rgba(0,100,62,0.22)" />
          </svg>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10">
          <Avatar kind={data.myAvatar} size={72} dim={dim} />
          <span className="font-mono text-[10px] tracking-[0.1em] opacity-85" style={{ color: textColor, textShadow }}>
            {data.myNickname || AVATAR_LABEL[data.myAvatar]} 님의 마을
          </span>
        </div>

        {showProgress && progress && (
          <div className="absolute left-0 right-0 z-20" style={{ bottom: 90 }}>
            <ProgressBar {...progress} />
          </div>
        )}

        <div className="px-[20px] flex justify-end absolute" style={{ bottom: 20, right: 0 }}>
          <div
            className="relative px-4 py-[10px] rounded-[14px] text-[12px] font-semibold cursor-pointer flex items-center gap-1.5"
            style={{
              background: 'transparent',
              color: dim ? (isDark ? 'rgba(255,255,255,0.78)' : '#5C544A') : textColor,
              textShadow,
              border: 'none',
            }}
            onClick={() => router.push('/mailbox')}
          >
            <HouseIcon size={50} />
            편지집
            {badgeN && (
              <span className="absolute -top-2 -left-2 w-[22px] h-[22px] rounded-full bg-[#7FBE3C] text-white font-mono text-[11px] font-bold flex items-center justify-center">N</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
