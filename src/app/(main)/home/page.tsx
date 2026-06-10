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

// 한 트랙에 떠 있는 편지. dir=현재 보내는 사람 기준 진행 방향(out=왼→오, in=오→왼).
// 색은 트랙(스레드 시작자)으로 고정되므로 여기서 색은 다루지 않는다.
interface RailSpec {
  dir: 'out' | 'in'
  cell: number
}

interface ProgressBarProps {
  label: string
  time: string
  top: RailSpec | null // 위 트랙 = 내가 시작한 왕복(초록)
  bottom: RailSpec | null // 아래 트랙 = 상대/AI가 시작한 왕복(주황)
  partnerLetterbox?: ReactNode // 오른쪽 편지집 표시 (기본: 사람 상대 편지집)
  legendMine: string // 범례: 초록 색이 뜻하는 것
  legendTheirs: string // 범례: 주황 색이 뜻하는 것
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

const clampCell = (c: number) => Math.max(0, Math.min(6, c))

// 한 트랙 1줄. color=트랙 고정색(위=초록/아래=주황), dir=현재 진행 방향.
// 운행 중인 편지가 없으면(cell=null) 빈 차로(회색, 버스 없음)로 둔다. 두 트랙은 항상 표시.
function Rail({ color, dir, cell }: { color: string; dir: 'out' | 'in'; cell: number | null }) {
  const active = cell !== null
  const safe = clampCell(cell ?? 0)
  const p = dir === 'out' ? safe / 6 : 1 - safe / 6
  const filled = (i: number) => active && (dir === 'out' ? i < safe : i >= 6 - safe)
  return (
    <div className="flex items-center gap-1 relative h-[16px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-sm" style={{ background: filled(i) ? color : 'rgba(20,15,8,0.12)' }} />
      ))}
      {active && (
        <div
          className="absolute top-1/2"
          style={{
            left: `calc(${p} * (100% - ${BUS_W}px) + ${BUS_W / 2}px)`,
            transform: `translate(-50%, -50%)${dir === 'in' ? ' scaleX(-1)' : ''}`,
            transition: 'left 0.5s ease-out',
          }}
        >
          <Bus color={color} />
        </div>
      )}
    </div>
  )
}

function ProgressBar({ label, time, top, bottom, partnerLetterbox, legendMine, legendTheirs }: ProgressBarProps) {
  // 위 트랙=내가 시작한 왕복(초록), 아래 트랙=상대/AI가 시작한 왕복(주황). 항상 둘 다 표시.
  return (
    <div className="px-[18px] pb-[6px]">
      <div className="p-[10px_12px] bg-white/85 border border-[#E0D9C7] rounded-[14px] font-mono text-[10px] tracking-[0.06em]" style={{ color: '#1A1816' }}>
        <div className="flex justify-between mb-2">
          <span className="opacity-60">{label}</span>
          <span className="opacity-60">{time}</span>
        </div>
        <div className="flex flex-col gap-[5px]">
          <Rail color={OUT_COLOR} dir={top?.dir ?? 'out'} cell={top ? top.cell : null} />
          <Rail color={IN_COLOR} dir={bottom?.dir ?? 'in'} cell={bottom ? bottom.cell : null} />
        </div>
        {/* 진행선 양 끝 편지집 위치 (왼쪽=내 편지집, 오른쪽=상대 편지집) */}
        <div className="flex items-start justify-between mt-[7px] text-[8.5px] leading-none opacity-70">
          <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />내 편지집</span>
          {partnerLetterbox ?? (
            <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />상대 편지집</span>
          )}
        </div>
        {/* 범례(맨 아래): 초록/주황 색이 뜻하는 것 */}
        <div className="flex items-center justify-center gap-[12px] mt-[9px] text-[8.5px] leading-none opacity-75">
          <span className="flex items-center gap-[4px]">
            <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: OUT_COLOR }} />{legendMine}
          </span>
          <span className="flex items-center gap-[4px]">
            <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: IN_COLOR }} />{legendTheirs}
          </span>
        </div>
      </div>
    </div>
  )
}

// 운행 중인 사람 편지 1통. dir/색을 분리: fromMe=현재 발신자(방향), startedByMe=스레드 시작자(색).
interface TransitLetter {
  arrivalAt: number // sent_at(도착 시각) ms
  fromMe: boolean // 내가 보낸 편지면 true → 왼→오(out)
  startedByMe: boolean // 이 왕복(스레드)을 내가 시작했으면 true → 초록(위 트랙)
}

interface HomeData {
  myAvatar: AvatarType
  myNickname: string
  villageTheme: string
  matchId: string | null
  partnerAvatar: AvatarType | null
  partnerNickname: string | null
  // 매칭 후: 운행 중인 사람 편지들(스레드 색 포함). 매칭 전 AI 모드에선 빈 배열.
  transit: TransitLetter[]
  // 매칭 전 AI: 방향별 가장 최근 편지 도착 시각(ms). 내가 보낸 것 / AI가 보낸 것.
  outgoingArrivalAt: number | null
  incomingArrivalAt: number | null
  // 매칭 전 AI 대화 모드 여부 (true면 버스 운행 시간 1시간 + 상대 편지집을 AI로 표시)
  isAiPartner: boolean
  // 읽지 않은 받은 편지 수 (편지집 배지)
  unreadCount: number
  // 현재 선택한 고민(관심사) 카테고리 표시용
  categoryName: string | null
  categoryEmoji: string | null
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
        .select('avatar_type, nickname, village_id, match_category')
        .eq('id', user.id)
        .maybeSingle()

      // 현재 선택한 고민(관심사) 카테고리: 이모지 + 이름
      let categoryName: string | null = null
      let categoryEmoji: string | null = null
      if (profile?.match_category) {
        const { data: cat } = await supabase
          .from('interest_categories')
          .select('name, emoji')
          .eq('id', profile.match_category)
          .maybeSingle()
        if (cat) {
          categoryName = cat.name ?? null
          categoryEmoji = cat.emoji ?? null
        }
      }

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
      const transit: TransitLetter[] = []
      if (match) {
        // 매칭의 모든 사람 편지를 가져와 답장 체인을 따라 '스레드 시작자'를 판정한다.
        // (색=스레드 시작자, 방향=현재 발신자. 마이그레이션 없이 메모리로 뿌리까지 추적)
        const { data: letters } = await supabase
          .from('letters')
          .select('id, sender_id, sent_at, original_letter_id')
          .eq('match_id', match.id)
          .eq('sender_type', 'user')
          .order('sent_at', { ascending: true })

        const byId = new Map<string, { id: string; sender_id: string | null; sent_at: string; original_letter_id: string | null }>()
        letters?.forEach((l) => byId.set(l.id, l))
        // 뿌리 편지의 발신자(스레드 시작자) id
        const rootSenderId = (l: { sender_id: string | null; original_letter_id: string | null }): string | null => {
          let cur = l
          const seen = new Set<string>()
          while (cur.original_letter_id && byId.has(cur.original_letter_id)) {
            const next = byId.get(cur.original_letter_id)!
            if (seen.has(next.id)) break // 순환 방지
            seen.add(next.id)
            cur = next
          }
          return cur.sender_id
        }
        const nowMs = Date.now()
        letters?.forEach((l) => {
          const arrival = toMs(l.sent_at)
          if (arrival == null || arrival <= nowMs) return // 운행 중(미도착)만
          transit.push({
            arrivalAt: arrival,
            fromMe: l.sender_id === user.id,
            startedByMe: rootSenderId(l) === user.id,
          })
        })
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
        transit,
        outgoingArrivalAt,
        incomingArrivalAt,
        isAiPartner,
        unreadCount: unreadCount ?? 0,
        categoryName,
        categoryEmoji,
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
    // 도착 시각으로 진행 칸/경과 계산. 경과 = now - 발송시각 = now - arrival + totalMs.
    const cellOf = (arrival: number) => {
      const elapsed = Math.max(0, now - arrival + totalMs)
      return { cell: Math.min(6, Math.floor(elapsed / cellMs)), elapsed }
    }

    let top: RailSpec | null = null // 내가 시작한 왕복(초록)
    let bottom: RailSpec | null = null // 상대/AI가 시작한 왕복(주황)
    let topArr = 0
    let bottomArr = 0
    let timeMs = 0
    let anyOut = false // 내가 보낸 편지 운행 중(방향)
    let anyIn = false // 상대/AI가 보낸 편지 운행 중(방향)

    if (data.isAiPartner) {
      // 매칭 전: 방향 기반(내 편지=초록 out / AI 답장=주황 in)
      const inTransit = (a: number | null) => a != null && now < a
      if (inTransit(data.outgoingArrivalAt)) {
        const { cell, elapsed } = cellOf(data.outgoingArrivalAt!)
        top = { dir: 'out', cell }; anyOut = true; timeMs = Math.max(timeMs, elapsed)
      }
      if (inTransit(data.incomingArrivalAt)) {
        const { cell, elapsed } = cellOf(data.incomingArrivalAt!)
        bottom = { dir: 'in', cell }; anyIn = true; timeMs = Math.max(timeMs, elapsed)
      }
    } else {
      // 매칭 후: 색=스레드 시작자, 방향=현재 발신자. 한 트랙에 둘이면 가장 최근 것 표시.
      for (const t of data.transit) {
        const { cell, elapsed } = cellOf(t.arrivalAt)
        const spec: RailSpec = { dir: t.fromMe ? 'out' : 'in', cell }
        if (t.fromMe) anyOut = true; else anyIn = true
        timeMs = Math.max(timeMs, elapsed)
        if (t.startedByMe) {
          if (t.arrivalAt >= topArr) { top = spec; topArr = t.arrivalAt }
        } else {
          if (t.arrivalAt >= bottomArr) { bottom = spec; bottomArr = t.arrivalAt }
        }
      }
    }
    outgoingInTransit = anyOut

    if (top || bottom) {
      state = anyOut ? 3 : 5
      const label =
        anyOut && anyIn
          ? `${nick} 님과 편지가 오가는 중`
          : anyOut
            ? `${nick} 님께 편지가 가는 중`
            : `${nick} 님의 편지가 오는 중`
      // 매칭 전이면 오른쪽 편지집을 AI 아이콘 + 'AI 마음친구'로 표시
      const partnerLetterbox = data.isAiPartner ? (
        <span className="flex flex-col items-center gap-[3px]">
          <Avatar kind="ai" size={12} />AI 마음친구
        </span>
      ) : undefined
      const legendMine = data.isAiPartner ? '내 편지' : '내가 시작한 편지'
      const legendTheirs = data.isAiPartner ? 'AI 답장' : '상대가 시작한 편지'
      progress = { label, time: formatElapsed(timeMs, totalMs), top, bottom, partnerLetterbox, legendMine, legendTheirs }
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
          {data.categoryName && (
            <div className="mt-[10px] flex justify-center">
              <span
                className="inline-flex items-center gap-[5px] pl-[8px] pr-[11px] py-[4px] rounded-full text-[11px] font-medium"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.78)',
                  color: isDark ? '#FFFFFF' : '#00643E',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,100,62,0.25)'}`,
                  backdropFilter: 'blur(2px)',
                }}
              >
                <span
                  className="font-mono text-[9px] tracking-[0.06em] px-[6px] py-[2px] rounded-full"
                  style={{ background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,100,62,0.1)' }}
                >고민</span>
                {data.categoryEmoji && <span className="leading-none">{data.categoryEmoji}</span>}
                {data.categoryName}
              </span>
            </div>
          )}
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
                  <strong className="text-[#00643E]">매칭 진행 중</strong>
                  <div className="text-[10.5px] text-[#5C544A]">매칭 전에는 AI 마음친구와 편지를 주고받을 수 있어요</div>
                  <div className="text-[10px] text-[#8A8276] mt-[2px]">AI 마음친구 답장은 약 1시간 뒤에 편지집에 도착해요</div>
                </>
              ) : (
                <>
                  <strong className="text-[#00643E]">매칭 완료</strong>
                  <div className="text-[10.5px] text-[#5C544A]">편지를 작성하려면 여기를 클릭하세요</div>
                  <div className="text-[10px] text-[#8A8276] mt-[2px]">상대의 편지는 약 3시간 뒤 도착해요</div>
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
