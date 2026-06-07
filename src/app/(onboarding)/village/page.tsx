'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Btn from '@/components/Btn'
import Chip from '@/components/Chip'
import { createClient } from '@/lib/supabase/client'

interface VillageRow {
  id: string
  name: string
  theme: string
  color_hex: string
}

// theme 별 카드 스타일 (배경 그라데이션 + 어두운 톤 여부)
const THEME_STYLES: Record<string, { bg: string; dark?: boolean }> = {
  dawn:    { bg: 'linear-gradient(135deg,#2D1B4E,#7B5EA7)', dark: true },
  morning: { bg: 'linear-gradient(135deg,#C8E6FA,#A8D8A8)' },
  evening: { bg: 'linear-gradient(135deg,#F5A878,#E07050)' },
  night:   { bg: 'linear-gradient(135deg,#0D1B2A,#1B3A5C)', dark: true },
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
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">마을을 선택해요</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, marginTop: 10, fontWeight: 400 }}>
            마음의 <em style={{ color: '#00643E', fontStyle: 'italic' }}>시간대를</em><br />선택해주세요.
          </h2>
          <p className="mt-3 text-[13px] text-[#5C544A]">지금 당신의 마음은 어떤 하늘인가요?</p>
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
          <div className="mt-6 grid grid-cols-2 gap-[10px]">
            {villages.map(v => {
              const style = THEME_STYLES[v.theme] || { bg: '#ccc' }
              const isActive = selected === v.id
              return (
                <div
                  key={v.id}
                  onClick={() => setSelected(v.id)}
                  className="cursor-pointer rounded-[18px] p-[14px] flex flex-col justify-end overflow-hidden relative"
                  style={{
                    aspectRatio: '1',
                    background: style.bg,
                    border: isActive ? '2px solid #00643E' : '1px solid rgba(20,15,8,0.06)',
                    boxShadow: isActive ? '0 6px 18px -8px rgba(0,100,62,0.5)' : 'none',
                  }}
                >
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: 0, fontWeight: 500, color: style.dark ? '#FFFFFF' : '#1A1816', textShadow: style.dark ? '0 1px 4px rgba(0,0,0,0.6)' : '0 1px 3px rgba(255,255,255,0.65)', zIndex: 1, letterSpacing: '-0.01em' }}>{v.name}</h3>
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
