'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
  ai: 'AI 마음친구',
}

// theme → 카드 스타일
const VILLAGE_PALETTES: Record<string, { name: string; bg: string }> = {
  dawn:    { name: '새벽', bg: 'linear-gradient(170deg,#C8AED8 0%,#E8B8B0 82%,#F0CDB0 100%)' },
  morning: { name: '오전', bg: 'linear-gradient(170deg,#B8D5E8 0%,#E0E8E0 100%)' },
  evening: { name: '저녁', bg: 'linear-gradient(170deg,#E8A878 0%,#D87858 80%,#8C4838 100%)' },
  night:   { name: '밤',   bg: 'linear-gradient(170deg,#2A3858 0%,#1A2240 80%,#0A0E1F 100%)' },
}

// 운행 시간: 매칭 후 사람 편지 3시간 / 매칭 전 AI 편지 1시간. 둘 다 6칸으로 표시.
const HUMAN_TOTAL_MS = 3 * 60 * 60 * 1000
const AI_TOTAL_MS = 60 * 60 * 1000

// 버스(편지) 방향별 색: out = 내가 보냄(녹색), in = 상대/AI가 보냄(테라코타)
const OUT_COLOR = '#00643E'
const IN_COLOR = '#D87858'

function formatElapsed(ms: number, totalMs: number): string {
  const fmt = (totalMs: number) => {
    const totalSec = Math.floor(totalMs / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${fmt(ms)} / ${fmt(totalMs)}`
}

interface BusInfo {
  dir: 'out' | 'in' // out = 내가 상대에게(왼→오), in = 상대가 나에게(오→왼)
  cell: number
}

interface ProgressBarProps {
  label: string
  time: string
  buses: BusInfo[]
  partnerLetterbox?: ReactNode // 오른쪽 편지집 표시 (기본: 사람 상대 편지집)
}

const BUS_W = 22 // 버스 아이콘 폭(px)

function Bus({ color = OUT_COLOR }: { color?: string }) {
  return (
    <svg width={BUS_W} height="14" viewBox="0 0 36 24">
      <rect x="0" y="0" width="36" height="20" rx="4" fill={color} />
      <rect x="4" y="4" width="7" height="6" fill="#F5F0E6" />
      <rect x="14" y="4" width="7" height="6" fill="#F5F0E6" />
      <rect x="24" y="4" width="7" height="6" fill="#F5F0E6" />
      <circle cx="9" cy="22" r="4" fill="#1A1816" />
      <circle cx="28" cy="22" r="4" fill="#1A1816" />
    </svg>
  )
}

function ProgressBar({ label, time, buses, partnerLetterbox }: ProgressBarProps) {
  // 칸 i를 채우는 색: out 버스는 왼쪽부터(녹색), in 버스는 오른쪽부터(테라코타).
  const cellColor = (i: number): string | null => {
    const out = buses.find((b) => b.dir === 'out')
    const inc = buses.find((b) => b.dir === 'in')
    if (out && i < Math.max(0, Math.min(6, out.cell))) return OUT_COLOR
    if (inc && i >= 6 - Math.max(0, Math.min(6, inc.cell))) return IN_COLOR
    return null
  }
  return (
    <div className="px-[18px] pb-[6px]">
      <div className="p-[10px_12px] bg-white/85 border border-[#E0D9C7] rounded-[14px] font-mono text-[10px] tracking-[0.06em]" style={{ color: '#1A1816' }}>
        <div className="flex justify-between mb-2">
          <span className="opacity-60">{label}</span>
          <span className="opacity-60">{time}</span>
        </div>
        <div className="flex items-center gap-1 relative">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-sm" style={{ background: cellColor(i) ?? 'rgba(20,15,8,0.12)' }} />
          ))}
          {buses.map((b, idx) => {
            const safeCell = Math.max(0, Math.min(6, b.cell))
            // 진행률 p(0=왼쪽 끝, 1=오른쪽 끝). 버스 폭을 고려해 [BUS_W/2, 100%-BUS_W/2]에 균일 매핑 → 양 끝에서도 박스 안.
            const p = b.dir === 'out' ? safeCell / 6 : 1 - safeCell / 6
            return (
              <div
                key={idx}
                className="absolute top-1/2"
                style={{
                  left: `calc(${p} * (100% - ${BUS_W}px) + ${BUS_W / 2}px)`,
                  transform: `translate(-50%, -50%)${b.dir === 'in' ? ' scaleX(-1)' : ''}`,
                  transition: 'left 0.5s ease-out',
                }}
              >
                <Bus color={b.dir === 'out' ? OUT_COLOR : IN_COLOR} />
              </div>
            )
          })}
        </div>
        {/* 진행선 양 끝 편지집 위치 (왼쪽=내 편지집, 오른쪽=상대 편지집) */}
        <div className="flex items-start justify-between mt-[7px] text-[8.5px] leading-none opacity-70">
          <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />내 편지집</span>
          {partnerLetterbox ?? (
            <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />상대 편지집</span>
          )}
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
  // 방향별 가장 최근 편지의 '도착 시각'(ms). 내가 보낸 것 / 상대가 보낸 것.
  outgoingArrivalAt: number | null
  incomingArrivalAt: number | null
  // 매칭 전 AI 대화 모드 여부 (true면 버스 운행 시간 1시간 + 상대 편지집을 AI로 표시)
  isAiPartner: boolean
  // 읽지 않은 받은 편지 수 (편지집 배지)
  unreadCount: number
}

export default function HomePage() {
  const router = useRouter()
  const [now, setNow] = useState<number>(() => Date.now())
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
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

      // 6) 방향별 가장 최근 사람 편지의 도착 시각 (운행 중 버스 2대 표시용)
      //    sent_at은 '도착 시각'을 의미하며, 미래(운행 중)인 편지도 포함해야 하므로 시간 필터를 걸지 않는다.
      // letters.sent_at은 timestamp without time zone(UTC 저장) → 'Z' 붙여 UTC로 명시
      const toMs = (v: string | null | undefined) => (v ? new Date(v + 'Z').getTime() : null)
      let outgoingArrivalAt: number | null = null
      let incomingArrivalAt: number | null = null
      let isAiPartner = false
      if (match) {
        // 내가 상대에게 보낸 가장 최근 편지
        const { data: outLetter } = await supabase
          .from('letters')
          .select('sent_at')
          .eq('match_id', match.id)
          .eq('sender_type', 'user')
          .eq('sender_id', user.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        outgoingArrivalAt = toMs(outLetter?.sent_at)

        // 상대가 나에게 보낸 가장 최근 편지
        const { data: inLetter } = await supabase
          .from('letters')
          .select('sent_at')
          .eq('match_id', match.id)
          .eq('sender_type', 'user')
          .neq('sender_id', user.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        incomingArrivalAt = toMs(inLetter?.sent_at)
      } else {
        // 매칭 전: AI 마음친구와의 편지를 버스로 표시 (운행 1시간)
        isAiPartner = true
        partnerAvatar = 'ai'
        partnerNickname = 'AI 마음친구'

        // 내가 AI에게 보낸 가장 최근 편지
        const { data: outLetter } = await supabase
          .from('letters')
          .select('sent_at')
          .is('match_id', null)
          .eq('sender_type', 'user')
          .eq('sender_id', user.id)
          .eq('receiver_type', 'ai')
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        outgoingArrivalAt = toMs(outLetter?.sent_at)

        // AI가 나에게 보낸 가장 최근 편지
        const { data: inLetter } = await supabase
          .from('letters')
          .select('sent_at')
          .is('match_id', null)
          .eq('sender_type', 'ai')
          .eq('receiver_id', user.id)
          .order('sent_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        incomingArrivalAt = toMs(inLetter?.sent_at)
      }

      // 읽지 않은 받은 편지 수 (도착한 편지만)
      const { count: unreadCount } = await supabase
        .from('letters')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .is('read_at', null)
        .lte('sent_at', new Date().toISOString())

      setData({
        myAvatar: AVATAR_MAP[profile?.avatar_type ?? 1] ?? 'cat',
        myNickname: profile?.nickname ?? '나',
        villageTheme,
        matchId: match?.id ?? null,
        partnerAvatar,
        partnerNickname,
        outgoingArrivalAt,
        incomingArrivalAt,
        isAiPartner,
        unreadCount: unreadCount ?? 0,
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
  // 내가 보낸 편지가 아직 운행 중이면(도착 전) 새 편지 전송을 막는다.
  let outgoingInTransit = false

  // 매칭 후(사람) 또는 매칭 전(AI) — 둘 다 버스로 표시. 운행 시간만 다름(사람 3h / AI 1h).
  if (data.matchId || data.isAiPartner) {
    state = 2 // 상대 있음, 아직 편지 없음
    const nick = data.partnerNickname ?? '친구'
    const totalMs = data.isAiPartner ? AI_TOTAL_MS : HUMAN_TOTAL_MS
    const cellMs = totalMs / 6

    // sent_at(도착 시각) 기준으로 운행 정보 계산. 발송시각 = 도착 - totalMs.
    // 경과 = now - 발송시각 = now - arrival + totalMs (도착 시 정확히 totalMs)
    const busInfo = (arrival: number | null) => {
      if (!arrival) return null
      const elapsed = Math.max(0, now - arrival + totalMs)
      return {
        cell: Math.min(6, Math.floor(elapsed / cellMs)),
        elapsed,
        inTransit: elapsed < totalMs,
      }
    }
    const out = busInfo(data.outgoingArrivalAt)
    const inc = busInfo(data.incomingArrivalAt)
    outgoingInTransit = !!out?.inTransit

    // 운행 중인 방향만 버스로 표시 (양방향이면 2대)
    const buses: BusInfo[] = []
    if (out?.inTransit) buses.push({ dir: 'out', cell: out.cell })
    if (inc?.inTransit) buses.push({ dir: 'in', cell: inc.cell })

    if (buses.length > 0) {
      if (out?.inTransit && inc?.inTransit) state = 3
      else if (out?.inTransit) state = 3
      else state = 5

      const label =
        out?.inTransit && inc?.inTransit
          ? `${nick} 님과 편지가 오가는 중`
          : out?.inTransit
            ? `${nick} 님께 편지가 가는 중`
            : `${nick} 님의 편지가 오는 중`
      // 타이머는 내 편지 우선, 없으면 들어오는 편지 기준
      const timeMs = out?.inTransit ? out.elapsed : inc!.elapsed
      // 매칭 전이면 오른쪽 편지집을 AI 아이콘 + 'AI 마음친구'로 표시
      const partnerLetterbox = data.isAiPartner ? (
        <span className="flex flex-col items-center gap-[3px]">
          <Avatar kind="ai" size={12} />AI 마음친구
        </span>
      ) : undefined
      progress = { label, time: formatElapsed(timeMs, totalMs), buses, partnerLetterbox }
    }
  }

  const showBanner = state >= 2
  const showProgress = progress !== null
  const dim = state === 1
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

        {showBanner && data.partnerAvatar ? (
          <div
            className={`mx-[18px] bg-white/85 border border-[#E0D9C7] rounded-[14px] flex items-center gap-[10px] ${outgoingInTransit ? '' : 'cursor-pointer'}`}
            style={{ color: '#1A1816', marginTop: 30, padding: '13px 12px' }}
            onClick={() => { if (!outgoingInTransit) router.push('/compose') }}
          >
            <Avatar kind={data.partnerAvatar} size={36} />
            <div className="flex-1 text-[11.5px] leading-[1.35]">
              {outgoingInTransit ? (
                <>
                  <strong className="text-[#00643E]">편지가 가는 중</strong>
                  <div className="text-[10.5px] text-[#5C544A]">도착하면 새 편지를 보낼 수 있어요</div>
                </>
              ) : data.isAiPartner ? (
                <>
                  <strong className="text-[#00643E]">AI 마음친구</strong>
                  <div className="text-[10.5px] text-[#5C544A]">매칭 전, 편지를 쓰면 답장이 도착해요</div>
                </>
              ) : (
                <>
                  <strong className="text-[#00643E]">매칭 완료</strong>
                  <div className="text-[10.5px] text-[#5C544A]">편지를 작성하려면 여기를 클릭하세요</div>
                </>
              )}
            </div>
            {!outgoingInTransit && <span className="font-mono text-[16px] text-[#00643E]">→</span>}
          </div>
        ) : (
          <div
            className="mx-[18px] bg-white/85 border border-[#E0D9C7] rounded-[14px] flex items-center gap-[10px] cursor-pointer"
            style={{ color: '#1A1816', marginTop: 30, padding: '13px 12px' }}
            onClick={() => router.push('/compose')}
          >
            <Avatar kind="rabbit" size={36} />
            <div className="flex-1 text-[11.5px] leading-[1.35]">
              <strong className="text-[#00643E]">편지 쓰기</strong>
              <div className="text-[10.5px] text-[#5C544A]">매칭 전에도 편지를 쓰면 답장이 도착해요</div>
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
          <Avatar kind={data.myAvatar} size={72} />
          <span className="font-mono text-[10px] tracking-[0.1em] opacity-85" style={{ color: textColor, textShadow }}>
            {data.myNickname || AVATAR_LABEL[data.myAvatar]} 님의 마을
          </span>
        </div>

        {showProgress && progress && (
          <div className="absolute left-0 right-0 z-20" style={{ bottom: 90 }}>
            <ProgressBar {...progress} />
          </div>
        )}

        <div className="px-[20px] flex justify-end items-center absolute left-0 right-0" style={{ bottom: 20 }}>
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
            {data.unreadCount > 0 && (
              <span className="absolute -top-1 left-0 min-w-[20px] h-[20px] px-[5px] rounded-full bg-[#D87858] text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                {data.unreadCount > 99 ? '99+' : data.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
