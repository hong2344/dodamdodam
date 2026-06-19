'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
import HouseIcon from '@/components/HouseIcon'
import { createClient } from '@/lib/supabase/client'
import { usePushNotification } from '@/hooks/usePushNotification'
import { isApplicationWindowOpen, applicationWindowEnd } from '@/lib/week'
import { starsDataUri } from '@/lib/stars'
import { HomeState, Avatar as AvatarType } from '@/types'

// 밤 마을 배경 별밭 (gradient 위에 얹는 레이어). 시드 고정으로 매 렌더 동일.
const NIGHT_STARS = starsDataUri({ w: 375, h: 680, count: 360, seed: 7, brightProb: 0.05, removeLargest: 2 })

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

// 운행 시간: 매칭 후 사람 편지 3시간(트랙 2개). 매칭 전 AI 편지는 버스 1대·선 1개로
// 보낼 때 30분 + 답장 올 때 30분을 각각 따로 측정해 순차로 표시한다(구간당 30분).
const HUMAN_TOTAL_MS = 3 * 60 * 60 * 1000
const AI_LEG_MS = 30 * 60 * 1000

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

// 신청창 마감까지 남은 시간을 'N시간 M분' / 'M분'으로 표시 (초 단위는 생략해 차분하게).
function formatCountdown(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`
}

// 홈 상단 고민 카테고리 칩. tag = '이번 주' / '다음 주' / '고민'.
function CategoryChip({ tag, cat, isDark }: { tag: string; cat: { name: string; emoji: string | null }; isDark: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] pl-[8px] pr-[11px] h-[28px] rounded-full text-[11px] font-medium"
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
      >{tag}</span>
      {cat.emoji && <span className="leading-none">{cat.emoji}</span>}
      {cat.name}
    </span>
  )
}

// 한 트랙에 떠 있는 편지. dir=현재 보내는 사람 기준 진행 방향(out=왼→오, in=오→왼).
// 색은 트랙(스레드 시작자)으로 고정되므로 여기서 색은 다루지 않는다.
interface RailSpec {
  dir: 'out' | 'in'
  cell: number
}

interface RailRender {
  color: string
  dir: 'out' | 'in'
  cell: number | null
}

interface ProgressBarProps {
  label: string
  time: string
  rails: RailRender[] // 1개(매칭 전 AI: 버스 1대) 또는 2개(매칭 후 사람)
  partnerLetterbox?: ReactNode // 오른쪽 편지집 표시 (기본: 사람 상대 편지집)
  legendMine?: string // 범례: 초록 색이 뜻하는 것 (둘 다 있을 때만 표시)
  legendTheirs?: string // 범례: 주황 색이 뜻하는 것
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

function ProgressBar({ label, time, rails, partnerLetterbox, legendMine, legendTheirs }: ProgressBarProps) {
  // rails: 매칭 후 사람은 2개(내 왕복=초록 / 상대 왕복=주황), 매칭 전 AI는 1개(버스 1대).
  return (
    <div className="px-[18px] pb-[6px]">
      <div className="p-[10px_12px] bg-white/85 border border-[#E0D9C7] rounded-[14px] font-mono text-[10px] tracking-[0.06em]" style={{ color: '#1A1816' }}>
        <div className="flex justify-between mb-2">
          <span className="opacity-60">{label}</span>
          <span className="opacity-60">{time}</span>
        </div>
        <div className="flex flex-col gap-[5px]">
          {rails.map((r, i) => (
            <Rail key={i} color={r.color} dir={r.dir} cell={r.cell} />
          ))}
        </div>
        {/* 진행선 양 끝 편지집 위치 (왼쪽=내 편지집, 오른쪽=상대 편지집) */}
        <div className="flex items-start justify-between mt-[7px] text-[8.5px] leading-none opacity-70">
          <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />내 편지집</span>
          {partnerLetterbox ?? (
            <span className="flex flex-col items-center gap-[3px]"><HouseIcon size={12} />상대 편지집</span>
          )}
        </div>
        {/* 범례(맨 아래): 초록/주황 색이 뜻하는 것. 두 색이 다 쓰일 때(사람 매칭)만 표시. */}
        {legendMine && legendTheirs && (
          <div className="flex items-center justify-center gap-[12px] mt-[9px] text-[8.5px] leading-none opacity-75">
            <span className="flex items-center gap-[4px]">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: OUT_COLOR }} />{legendMine}
            </span>
            <span className="flex items-center gap-[4px]">
              <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: IN_COLOR }} />{legendTheirs}
            </span>
          </div>
        )}
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
  // 이번 주 고민(= 진행 중인 매칭이 성사된 카테고리). 매칭 전이면 null.
  thisWeekCat: CategoryInfo | null
  // 다음 주 고민(= profiles.match_category. 일 20-24시에 바꾸면 다음 매칭에 반영).
  nextWeekCat: CategoryInfo | null
  // 이번 주 매칭 고민과 다르게 다음 주용으로 이미 바꿨는지 여부 (홈 버튼 문구 토글용).
  categoryChanged: boolean
}

interface CategoryInfo {
  name: string
  emoji: string | null
}

interface AppNotification {
  id: string
  type: string
  payload: {
    title?: string
    message?: string
    body?: string
    url?: string
  } | null
  created_at: string | null
}

interface ToastNotification {
  id: string
  title: string
  message: string
}

const NOTIFICATION_TITLES: Record<string, string> = {
  new_match: '매칭이 완료되었습니다',
  matching_completed: '매칭이 완료되었습니다',
  letter_opened: '상대방이 편지를 열람했습니다',
  letter_sent: '상대방이 편지를 보냈습니다',
  letter_arrived: '편지가 도착했습니다',
  matching_open: '이번 주 매칭 신청이 시작됐어요',
  letter_unread_reminder: '아직 읽지 않은 편지가 있어요',
  letter_reply_reminder: '답장을 기다리는 편지가 있어요',
  matching_no_letter: '마음친구가 기다리고 있어요',
  category_reminder: '새로운 친구를 만날 시간이에요',
}

// 알림 클릭 시 이동할 경로. payload.url을 우선 쓰되, 없으면 타입별 기본 경로로.
const NOTIFICATION_URLS: Record<string, string> = {
  new_match: '/home',
  matching_completed: '/home',
  letter_opened: '/mailbox',
  letter_sent: '/mailbox',
  letter_arrived: '/mailbox',
  matching_open: '/category?mode=change',
  letter_unread_reminder: '/mailbox',
  letter_reply_reminder: '/mailbox',
  matching_no_letter: '/compose',
  category_reminder: '/category?mode=change',
}

function getNotificationUrl(item: AppNotification): string {
  const url = item.payload?.url
  if (url && url !== '/') return url
  return NOTIFICATION_URLS[item.type] ?? '/home'
}

function formatNotificationTime(value: string | null): string {
  if (!value) return ''
  return new Date(value).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HomePage() {
  const router = useRouter()
  const [now, setNow] = useState<number>(() => Date.now())
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [toastQueue, setToastQueue] = useState<ToastNotification[]>([])
  const showedInitialNotifications = useRef(false)
  // ?preview=window 로 접속하면 신청창 배너를 시간과 무관하게 표시(미리보기용, 서버 로직엔 영향 없음)
  const [previewWindow] = useState(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === 'window',
  )

  const push = usePushNotification({
    getAccessToken: async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    },
  })

  // iOS Safari 일반 탭에서는 웹 푸시가 지원되지 않아 '푸시 켜기' 버튼이 숨겨진다.
  // 이때만(아이폰 + 미설치) "홈 화면에 추가" 안내를 노출해 사용자 혼란을 줄인다.
  const [showIosPushHint, setShowIosPushHint] = useState(false)
  const [iosHintOpen, setIosHintOpen] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (push.isSupported) return // 지원되면 실제 버튼이 보이므로 안내 불필요
    const ua = window.navigator.userAgent
    const isIOS =
      /iP(hone|ad|od)/.test(ua) ||
      // iPadOS는 데스크톱 Mac으로 위장하므로 터치 지원으로 추가 판별
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isStandalone =
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      window.matchMedia('(display-mode: standalone)').matches
    setShowIosPushHint(isIOS && !isStandalone)
  }, [push.isSupported])

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleDeleteAccount = async () => {
    if (deleting || loggingOut) return
    const confirmed = window.confirm(
      '정말 탈퇴하시겠어요?\n\n계정과 회원가입 정보가 즉시 삭제되며 되돌릴 수 없어요.\n(주고받은 편지는 상대방을 위해 "탈퇴한 사용자"로 남아요.)'
    )
    if (!confirmed) return

    setDeleting(true)
    try {
      const res = await fetch('/api/profile/delete', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        window.alert(`탈퇴 처리 중 오류가 발생했어요: ${body?.error ?? res.status}`)
        setDeleting(false)
        return
      }
      const supabase = createClient()
      await supabase.auth.signOut()
      router.replace('/login')
    } catch {
      window.alert('탈퇴 처리 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
      setDeleting(false)
    }
  }

  function getNotificationText(item: AppNotification) {
    return {
      title: item.payload?.title ?? NOTIFICATION_TITLES[item.type] ?? '알림',
      message: item.payload?.message ?? item.payload?.body ?? '',
    }
  }

  async function loadNotifications(options?: { showToasts?: boolean }) {
    setNotificationsLoading(true)
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })
      const body = await response.json().catch(() => null) as { notifications?: AppNotification[] } | null
      const nextNotifications = body?.notifications ?? []
      setNotifications(nextNotifications)

      if (options?.showToasts && nextNotifications.length > 0) {
        setToastQueue((prev) => [
          ...prev,
          ...nextNotifications.map((notification) => ({
            id: notification.id,
            ...getNotificationText(notification),
          })),
        ])
      }
    } finally {
      setNotificationsLoading(false)
    }
  }

  async function handleClearNotifications() {
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications([])
  }

  async function handleDeleteNotification(id: string) {
    // UI에서 먼저 제거해 즉시 사라지게 한 뒤 서버에서도 삭제
    setNotifications((prev) => prev.filter((item) => item.id !== id))
    await fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  }

  // 테스트 모드: 매초 업데이트 (운영 모드에선 60_000으로 변경)
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    if (toastQueue.length === 0) return

    const t = window.setTimeout(() => {
      setToastQueue((prev) => prev.slice(1))
    }, 2_000)
    return () => window.clearTimeout(t)
  }, [toastQueue])

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
      if (!showedInitialNotifications.current) {
        showedInitialNotifications.current = true
        void loadNotifications({ showToasts: true })
      } else {
        void loadNotifications()
      }

      // 2) 내 프로필
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_type, nickname, village_id, match_category, nickname_set')
        .eq('id', user.id)
        .maybeSingle()

      // 온보딩(마을 → 아바타 → 카테고리 → 닉네임)을 끝내지 못한 사용자는
      // 홈을 사용할 수 없게 막고, 흐름 순서대로 '아직 못 끝낸 첫 단계'로 돌려보낸다.
      // 마을 미설정 → /village, 아바타 미설정 → /avatar, 카테고리 미설정 → /category,
      // 닉네임 미확정 → /nickname.
      const onboardingStep =
        !profile?.village_id ? '/village'
        : !profile?.avatar_type ? '/avatar'
        : !profile?.match_category ? '/category'
        : !profile?.nickname || !profile?.nickname_set ? '/nickname'
        : null
      if (onboardingStep) {
        router.replace(onboardingStep)
        return
      }

      // 고민(관심사) 카테고리 맵 (6개뿐이라 한 번에 받아 메모리에서 id→{name,emoji} 해석)
      const { data: cats } = await supabase
        .from('interest_categories')
        .select('id, name, emoji')
      const catMap = new Map<string, CategoryInfo>()
      cats?.forEach((c) => catMap.set(c.id, { name: c.name ?? '', emoji: c.emoji ?? null }))
      // 다음 주 고민 = 내 현재 선호(profile.match_category)
      const nextWeekCat = profile?.match_category ? catMap.get(profile.match_category) ?? null : null

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
        .select('id, user_a_id, user_b_id, category')
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
        // 이번 주 고민 = 진행 중인 매칭이 성사된 카테고리 (없으면 null)
        thisWeekCat: match?.category ? catMap.get(match.category) ?? null : null,
        nextWeekCat,
        categoryChanged: !!(match?.category && profile?.match_category && match.category !== profile.match_category),
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

  // 매칭 후(사람)와 매칭 전(AI) 모두 버스로 표시하되 표현이 다르다.
  // - 매칭 전 AI: 버스 1대·선 1개. 내 편지(초록)가 30분간 AI로 → AI 답장(주황)이 30분간 나에게.
  // - 매칭 후 사람: 트랙 2개(내 왕복 초록 / 상대 왕복 주황), 각 3시간.
  if (data.matchId || data.isAiPartner) {
    state = 2 // 상대 있음, 아직 편지 없음
    const nick = data.partnerNickname ?? '친구'

    if (data.isAiPartner) {
      // 한 구간(30분) 기준 진행 칸/경과 계산. 경과 = now - 출발시각 = now - arrival + AI_LEG_MS.
      // 가는 구간/오는 구간 각각 0~30분을 따로 측정한다.
      const cellMs = AI_LEG_MS / 6
      const legOf = (arrival: number) => {
        const elapsed = Math.min(AI_LEG_MS, Math.max(0, now - arrival + AI_LEG_MS))
        return { cell: Math.min(6, Math.floor(elapsed / cellMs)), elapsed }
      }

      let rail: RailRender | null = null
      let anyOut = false
      let label = ''
      let legElapsed = 0
      if (data.outgoingArrivalAt != null && now < data.outgoingArrivalAt) {
        // 구간 1: 내 편지가 AI로 가는 중(초록, 왼→오) — 30분 측정
        const { cell, elapsed } = legOf(data.outgoingArrivalAt)
        rail = { color: OUT_COLOR, dir: 'out', cell }
        anyOut = true; legElapsed = elapsed
        label = `${nick} 님께 편지가 가는 중`
      } else if (data.incomingArrivalAt != null && now < data.incomingArrivalAt) {
        // 구간 2: AI 답장이 나에게 오는 중(오→왼) — 다시 30분 측정. 버스 1대 왕복이라 색은 초록 유지.
        const { cell, elapsed } = legOf(data.incomingArrivalAt)
        rail = { color: OUT_COLOR, dir: 'in', cell }
        legElapsed = elapsed
        label = `${nick} 님의 답장이 오는 중`
      }
      outgoingInTransit = anyOut

      if (rail) {
        state = anyOut ? 3 : 5
        // 버스 1대뿐이라 색 범례(내 편지/AI 답장)는 표시하지 않는다.
        progress = {
          label,
          time: formatElapsed(legElapsed, AI_LEG_MS),
          rails: [rail],
          partnerLetterbox: (
            <span className="flex flex-col items-center gap-[3px]">
              <Avatar kind="ai" size={12} />AI 마음친구
            </span>
          ),
        }
      }
    } else {
      const cellMs = HUMAN_TOTAL_MS / 6
      // 도착 시각으로 진행 칸/경과 계산. 경과 = now - 발송시각 = now - arrival + totalMs.
      const cellOf = (arrival: number) => {
        const elapsed = Math.max(0, now - arrival + HUMAN_TOTAL_MS)
        return { cell: Math.min(6, Math.floor(elapsed / cellMs)), elapsed }
      }

      let top: RailSpec | null = null // 내가 시작한 왕복(초록)
      let bottom: RailSpec | null = null // 상대가 시작한 왕복(주황)
      let topArr = 0
      let bottomArr = 0
      let timeMs = 0
      let anyOut = false // 내가 보낸 편지 운행 중(방향)
      let anyIn = false // 상대가 보낸 편지 운행 중(방향)

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
      outgoingInTransit = anyOut

      if (top || bottom) {
        state = anyOut ? 3 : 5
        const label =
          anyOut && anyIn
            ? `${nick} 님과 편지가 오가는 중`
            : anyOut
              ? `${nick} 님께 편지가 가는 중`
              : `${nick} 님의 편지가 오는 중`
        progress = {
          label,
          time: formatElapsed(timeMs, HUMAN_TOTAL_MS),
          rails: [
            { color: OUT_COLOR, dir: top?.dir ?? 'out', cell: top ? top.cell : null },
            { color: IN_COLOR, dir: bottom?.dir ?? 'in', cell: bottom ? bottom.cell : null },
          ],
          legendMine: '내가 시작한 편지',
          legendTheirs: '상대가 시작한 편지',
        }
      }
    }
  }

  const showBanner = state >= 2
  const showProgress = progress !== null
  // 일 20-24시 KST 매칭 신청창이 열려 있으면 카테고리 변경 안내 배너를 띄운다.
  const matchingWindowOpen = isApplicationWindowOpen(new Date(now)) || previewWindow
  // 신청창이 실제로 열려 있을 때만 마감까지 남은 시간(ms). TEMP/preview로 강제된 경우엔 null → 안내 문구만.
  const windowEnd = applicationWindowEnd(new Date(now))
  const windowRemainMs = windowEnd ? windowEnd.getTime() - now : null
  const dim = state === 1
  const isDark = data.villageTheme === 'night' || data.villageTheme === 'evening'
  const textColor = isDark ? '#FFFFFF' : '#1A1816'
  // 그라데이션 배경 위에서 글씨가 묻히지 않도록 대비 보강
  const textShadow = isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.55)'
  const activeToast = toastQueue[0] ?? null

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F0E6' }}>
      {activeToast && (
        <div className="fixed left-0 right-0 top-4 z-[70] flex justify-center px-4 pointer-events-none">
          <div className="w-full max-w-[340px] rounded-[12px] bg-[#1A1816] px-4 py-3 text-white shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
            <p className="text-[13px] font-semibold leading-[1.35]">{activeToast.title}</p>
            {activeToast.message && (
              <p className="mt-1 text-[12px] leading-[1.45] text-white/78">{activeToast.message}</p>
            )}
          </div>
        </div>
      )}
      <div
        className="w-full max-w-[375px] flex flex-col relative"
        style={{
          minHeight: 680,
          background: data.villageTheme === 'night' ? `${NIGHT_STARS}, ${v.bg}` : v.bg,
          backgroundSize: data.villageTheme === 'night' ? '100% 100%, 100% 100%' : undefined,
          borderRadius: 20,
          color: textColor,
          overflow: 'hidden',
        }}
      >
        {/* 하단 노란 띠 (5px) */}
        <div className="absolute left-0 right-0 bottom-0 z-10" style={{ height: 20, background: '#F5EBC8' }} />
        <div className="pt-3 px-6 flex items-center justify-between" style={{ transform: 'translateY(10px)' }}>
          <div className="flex items-center gap-[16px]">
            <button
              onClick={() => {
                setNotificationsOpen(true)
                void loadNotifications()
              }}
              aria-label="알림 목록 열기"
              className="font-mono text-[11px] tracking-[0.08em] opacity-85 hover:opacity-100 transition-opacity inline-flex items-center gap-[5px]"
              style={{ color: textColor, textShadow, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span className="relative inline-flex">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-[8px] -left-[15px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-[#D87858] text-white font-mono text-[8px] font-bold flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.25)]">
                    {notifications.length > 99 ? '99+' : notifications.length}
                  </span>
                )}
              </span>
              알림
            </button>
            {push.isSupported && (
              <button
                onClick={() => (push.isSubscribed ? push.unsubscribe() : push.requestPermissionAndSubscribe())}
                disabled={push.isLoading}
                aria-label={push.isSubscribed ? '푸시 알림 끄기' : '푸시 알림 켜기'}
                className="font-mono text-[10px] tracking-[0.08em] opacity-75 hover:opacity-100 transition-opacity disabled:opacity-40"
                style={{ color: textColor, textShadow, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                {push.isLoading ? '처리 중…' : push.isSubscribed ? '푸시 끄기' : '푸시 켜기'}
              </button>
            )}
            {showIosPushHint && (
              <button
                onClick={() => setIosHintOpen(true)}
                aria-label="알림 받는 방법 안내"
                className="font-mono text-[10px] tracking-[0.08em] opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: textColor, textShadow, background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                홈 화면 추가 시 알림 ⓘ
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut || deleting}
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
          {(data.thisWeekCat || data.nextWeekCat) && (
            <>
              {/* 일 20-24시 매칭 신청창 안내 + 마감 카운트다운 */}
              {matchingWindowOpen && (
                <p className="mt-[10px] text-[11px] leading-[1.5] px-2" style={{ color: isDark ? '#FFFFFF' : '#00643E', textShadow }}>
                  다음 주에 새로운 매칭이 진행돼요.<br />
                  {windowRemainMs != null
                    ? <>일요일 자정까지 <b>{formatCountdown(windowRemainMs)}</b> 안에 고민을 바꿀 수 있어요.</>
                    : '일요일 저녁 8시~자정에 고민 카테고리를 바꿀 수 있어요.'}
                </p>
              )}
              <div className={`flex justify-center items-center gap-[8px] flex-wrap ${matchingWindowOpen ? 'mt-[8px]' : 'mt-[10px]'}`}>
                {/* 매칭됨: 이번 주(진행 중인 매칭) 고민 칩 */}
                {data.matchId && data.thisWeekCat && (
                  <CategoryChip tag={matchingWindowOpen && data.categoryChanged ? '이번 주' : '고민'} cat={data.thisWeekCat} isDark={isDark} />
                )}
                {/* 미매칭: 다음 매칭에 쓰일 고민 칩 */}
                {!data.matchId && data.nextWeekCat && (
                  <CategoryChip tag="고민" cat={data.nextWeekCat} isDark={isDark} />
                )}
                {/* 다음 주 칩은 이번 주와 실제로 다를 때만(이미 바꾼 상태) 표시해 중복을 없앤다 */}
                {matchingWindowOpen && data.categoryChanged && data.nextWeekCat && (
                  <CategoryChip tag="다음 주" cat={data.nextWeekCat} isDark={isDark} />
                )}
                {matchingWindowOpen && (
                  <span
                    onClick={() => router.push('/category?mode=change')}
                    className="inline-flex items-center gap-[5px] pl-[11px] pr-[10px] h-[28px] rounded-full text-[11px] font-semibold cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,100,62,0.1)',
                      color: isDark ? '#FFFFFF' : '#00643E',
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,100,62,0.25)'}`,
                    }}
                  >
                    {data.categoryChanged ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        수정
                      </>
                    ) : (
                      <>
                        고민 카테고리 바꾸기
                        <span className="font-mono">→</span>
                      </>
                    )}
                  </span>
                )}
              </div>
            </>
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

        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-10"
          style={{ marginTop: matchingWindowOpen ? 22 : 0 }}
        >
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

        {/* 하단 중앙 회원 탈퇴 (노란 띠 위) */}
        <div className="absolute left-0 right-0 z-20 flex justify-center" style={{ bottom: 1 }}>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || loggingOut}
            aria-label="회원 탈퇴"
            className="font-mono text-[10px] tracking-[0.08em] text-[#8A7A4A] hover:text-[#6B5E36] underline underline-offset-2 transition-colors disabled:opacity-40"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            {deleting ? '탈퇴 중…' : '회원 탈퇴'}
          </button>
        </div>

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
        {notificationsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5">
            <div className="w-full max-w-[340px] max-h-[78dvh] rounded-[16px] bg-[#F5F0E6] border border-[#E0D9C7] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] text-[#1A1816]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">notifications</p>
                  <h3 className="mt-1 text-[20px] font-semibold">알림</h3>
                </div>
                <span className="font-mono text-[11px] text-[#00643E]">{notifications.length}개</span>
              </div>

              <div className="mt-4 max-h-[46dvh] overflow-y-auto pr-1 flex flex-col gap-2">
                {notificationsLoading ? (
                  <p className="py-10 text-center text-[13px] text-[#5C544A]">불러오는 중…</p>
                ) : notifications.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-[#5C544A]">아직 알림이 없어요.</p>
                ) : (
                  notifications.map((item) => {
                    const { title, message } = getNotificationText(item)
                    return (
                      <div
                        key={item.id}
                        className="relative flex items-stretch rounded-[12px] bg-white/75 border border-[#E0D9C7] transition active:scale-[0.98] hover:bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            // 클릭한 알림은 삭제 후 해당 화면으로 이동
                            void handleDeleteNotification(item.id)
                            setNotificationsOpen(false)
                            router.push(getNotificationUrl(item))
                          }}
                          className="flex-1 text-left px-3 py-3 pr-8"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold leading-[1.35]">{title}</p>
                            <span className="font-mono text-[9.5px] opacity-55 shrink-0">{formatNotificationTime(item.created_at)}</span>
                          </div>
                          {message && <p className="mt-1 text-[12px] leading-[1.45] text-[#5C544A]">{message}</p>}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteNotification(item.id)}
                          aria-label="알림 삭제"
                          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[#9A8F7E] hover:bg-[#EFE7D6] hover:text-[#5C544A]"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
                          </svg>
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={handleClearNotifications}
                  className="h-[42px] rounded-[12px] bg-[#F2DED7] text-[#A34B35] text-[13px] font-semibold"
                >
                  전체 지우기
                </button>
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="h-[42px] rounded-[12px] bg-[#00643E] text-white text-[13px] font-semibold"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {iosHintOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5"
            onClick={() => setIosHintOpen(false)}
          >
            <div
              className="w-full max-w-[340px] max-h-[78dvh] overflow-y-auto rounded-[16px] bg-[#F5F0E6] border border-[#E0D9C7] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.25)] text-[#1A1816]"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">push notification</p>
                <h3 className="mt-1 text-[20px] font-semibold">알림 받는 방법</h3>
              </div>

              <p className="mt-3 text-[13px] leading-[1.5] text-[#5C544A]">
                아이폰 Safari에서는 화면에 <b>추가</b>한 뒤에만 알림을 받을 수 있어요. 아래 순서대로 한 번만 설정하면 돼요.
              </p>

              <ol className="mt-4 flex flex-col gap-3">
                {[
                  <>Safari 하단 우측의 <b>⋯ 버튼</b>을 눌러 <b>공유 버튼</b>을 눌러요.</>,
                  <>메뉴를 내려서 <b>&lsquo;홈 화면에 추가&rsquo;</b>를 눌러요.</>,
                  <>오른쪽 위 <b>&lsquo;추가&rsquo;</b>를 누르면 홈 화면에 도담 아이콘이 생겨요.</>,
                  <>이제 <b>홈 화면의 도담 아이콘</b>으로 다시 열면 <b>&lsquo;푸시 켜기&rsquo;</b> 버튼이 나타나요. 눌러서 허용하면 끝!</>,
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-[1px] flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#00643E] text-white font-mono text-[11px] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-[1.5]">{step}</span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 rounded-[10px] bg-[#EFE7D6] px-3 py-2 text-[11px] leading-[1.5] text-[#5C544A]">
                ※ 아이폰은 iOS 16.4 이상에서만 알림이 지원돼요. (설정 &gt; 일반 &gt; 정보에서 확인)
              </p>

              <button
                onClick={() => setIosHintOpen(false)}
                className="mt-4 h-[42px] w-full rounded-[12px] bg-[#00643E] text-white text-[13px] font-semibold"
              >
                알겠어요
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
