'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Btn from '@/components/Btn'
import Chip from '@/components/Chip'
import Avatar from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { starsDataUri } from '@/lib/stars'

interface VillageRow {
  id: string
  name: string
  theme: string
  color_hex: string
}

// 미리보기 카드용 밤 별밭 (gradient 위 레이어). 시드 고정.
const MINI_STARS = starsDataUri({ w: 160, h: 120, count: 80, seed: 13, brightProb: 0, removeLargest: 0 })

// theme 별 메타: 홈 화면과 동일한 그라데이션 + 시간대/상징/언덕색
interface ThemeMeta {
  grad: string
  time: string
  sym: string
  dark: boolean // 글자(흰색) 여부
  hills: [string, string]
  stars?: boolean
}
const THEME_META: Record<string, ThemeMeta> = {
  dawn: {
    grad: 'linear-gradient(170deg,#C8AED8 0%,#E8B8B0 82%,#F0CDB0 100%)',
    time: '5–8시',
    sym: '고요한 시작과 옅은 설렘',
    dark: true,
    hills: ['rgba(0,100,62,0.18)', 'rgba(0,100,62,0.24)'],
  },
  morning: {
    grad: 'linear-gradient(170deg,#B8D5E8 0%,#E0E8E0 100%)',
    time: '8–16시',
    sym: '맑은 활기와 따뜻한 기운',
    dark: false,
    hills: ['rgba(0,100,62,0.18)', 'rgba(0,100,62,0.24)'],
  },
  evening: {
    grad: 'linear-gradient(170deg,#E8A878 0%,#D87858 80%,#8C4838 100%)',
    time: '16–20시',
    sym: '차분함과 그리움',
    dark: false,
    hills: ['rgba(0,0,0,0.16)', 'rgba(0,0,0,0.22)'],
  },
  night: {
    grad: 'linear-gradient(170deg,#2A3858 0%,#1A2240 80%,#0A0E1F 100%)',
    time: '20–5시',
    sym: '깊은 고요와 사색',
    dark: true,
    hills: ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.38)'],
    stars: true,
  },
}

// 각 마을이 보여줄 홈 화면 미니 미리보기
function HomePreview({ name, meta }: { name: string; meta: ThemeMeta }) {
  const textColor = meta.dark ? '#FFFFFF' : '#1A1816'
  const textShadow = meta.dark ? '0 1px 3px rgba(0,0,0,0.45)' : undefined
  const bg = meta.stars ? `${MINI_STARS}, ${meta.grad}` : meta.grad
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 120,
        borderRadius: 10,
        overflow: 'hidden',
        background: bg,
        backgroundSize: meta.stars ? '100% 100%, 100% 100%' : undefined,
      }}
    >
      <p
        className="font-mono"
        style={{
          fontSize: 5.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'center',
          paddingTop: 15,
          opacity: 0.85,
          color: textColor,
          textShadow,
          position: 'relative',
          zIndex: 2,
        }}
      >
        Welcome to
      </p>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          textAlign: 'center',
          lineHeight: 1,
          marginTop: 3,
          color: textColor,
          textShadow,
          position: 'relative',
          zIndex: 2,
        }}
      >
        {name} 마을
      </p>
      <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-44%)', zIndex: 2 }}>
        <Avatar kind="dog" size={30} />
      </div>
      <svg
        viewBox="0 0 300 90"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 44, zIndex: 1 }}
      >
        <ellipse cx="60" cy="95" rx="130" ry="42" fill={meta.hills[0]} />
        <ellipse cx="250" cy="100" rx="160" ry="55" fill={meta.hills[1]} />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: '#F5EBC8', zIndex: 1 }} />
    </div>
  )
}

export default function VillagePage() {
  const [villages, setVillages] = useState<VillageRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleNext = async () => {
    if (!selected) return
    const picked = villages.find(v => v.id === selected)
    if (!picked) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError('로그인이 필요해요. 다시 로그인해주세요.')
      return
    }
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ village_id: picked.id })
      .eq('id', user.id)
    setSaving(false)
    if (updateErr) {
      setError('마을 저장 중 오류가 발생했어요: ' + updateErr.message)
      return
    }
    window.localStorage.setItem('dodam:village', picked.theme)
    window.localStorage.setItem('dodam:village_id', picked.id)
    router.push('/avatar')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('villages')
      .select('id, name, theme, color_hex')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          // theme 순서대로 정렬 (dawn → morning → evening → night)
          const order = ['dawn', 'morning', 'evening', 'night']
          const sorted = [...data].sort((a, b) => order.indexOf(a.theme) - order.indexOf(b.theme))
          setVillages(sorted)
        }
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href="/onboarding" className="font-mono text-[11px]">←</Link>
          <Chip>STEP 01 / 04</Chip>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">어떤 마을에서 시작할까요</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, marginTop: 10, fontWeight: 400 }}>
            당신의 <em style={{ color: '#00643E', fontStyle: 'italic' }}>마을을</em><br />선택하세요.
          </h2>
          <p className="mt-3 text-[13px] text-[#5C544A] leading-[1.55]">
            각 마을은 저마다 다른 마음의 시간을 담고 있어요.<br />지금 마음과 가장 닮은 곳을 골라보세요.
          </p>
        </div>

        {loading && (
          <p className="mt-10 text-center text-[13px] text-[#5C544A]">마을 정보를 불러오는 중…</p>
        )}

        {error && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-[10px] text-[12px] text-red-700">
            연결 오류: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-5 grid grid-cols-2 gap-[14px]">
            {villages.map(v => {
              const meta = THEME_META[v.theme] || THEME_META.morning
              const isActive = selected === v.id
              return (
                <div
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  className="cursor-pointer overflow-hidden"
                  style={{
                    borderRadius: 16,
                    background: '#fff',
                    padding: '8px 8px 12px',
                    border: isActive ? '2px solid #00643E' : '1px solid #E0D9C7',
                  }}
                >
                  <HomePreview name={v.name} meta={meta} />
                  <div style={{ padding: '9px 4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#1A1816' }}>{v.name}</span>
                      <span
                        className="font-mono"
                        style={{ fontSize: 9, color: '#00643E', background: 'rgba(0,100,62,0.08)', borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}
                      >{meta.time}</span>
                    </div>
                    <p style={{ fontSize: 10.5, color: '#5C544A', marginTop: 6, lineHeight: 1.45 }}>{meta.sym}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-auto pt-4">
          <Btn
            disabled={selected === null || saving}
            onClick={handleNext}
          >{saving ? '저장 중…' : '선택 완료'}</Btn>
        </div>

      </div>
    </div>
  )
}
