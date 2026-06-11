'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Btn from '@/components/Btn'
import Chip from '@/components/Chip'
import { createClient } from '@/lib/supabase/client'

interface CategoryRow {
  id: string
  name: string
  emoji: string
  sort_order: number
}

export default function CategoryPage() {
  return (
    <Suspense fallback={null}>
      <CategoryContent />
    </Suspense>
  )
}

function CategoryContent() {
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  // mode=change: 기존 사용자가 일 20-24시 신청창에 고민 카테고리를 바꾸는 흐름.
  const isChangeMode = searchParams?.get('mode') === 'change'

  const handleNext = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    // 관심사 저장 = 매칭 신청. 신청 시간창(일 20-24시 KST)은 서버에서 강제한다.
    const res = await fetch('/api/matching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: selected }),
    })
    const data = await res.json().catch(() => null)
    setSaving(false)
    if (res.status === 401) {
      setError('로그인이 필요해요. 다시 로그인해주세요.')
      return
    }
    if (res.status === 403) {
      // 변경 모드: 신청 시간창이 아니면 서버 안내 문구를 그대로 보여준다(리다이렉트하지 않음).
      if (isChangeMode) {
        setError(data?.message || '매칭 신청은 매주 일요일 저녁 8시~자정에만 가능해요.')
        return
      }
      window.localStorage.setItem('dodam:category', selected)
      router.push('/nickname?next=/home')
      return
    }
    if (!res.ok || data?.ok === false) {
      setError('매칭 신청 중 오류가 발생했어요.' + (data?.error ? ` (${data.error})` : ''))
      return
    }
    window.localStorage.setItem('dodam:category', selected)
    // 변경 모드는 온보딩(닉네임)을 건너뛰고 홈으로 복귀한다.
    router.push(isChangeMode ? '/home?categoryChanged=1' : '/nickname?next=/matching')
  }

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('interest_categories')
      .select('id, name, emoji, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message)
        } else if (data) {
          setCategories(data)
        }
        setLoading(false)
      })
    // 변경 모드면 현재 선택된 카테고리를 미리 하이라이트한다.
    if (isChangeMode) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase
          .from('profiles')
          .select('match_category')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.match_category) setSelected(profile.match_category)
          })
      })
    }
  }, [isChangeMode])

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href={isChangeMode ? '/home' : '/avatar'} className="font-mono text-[11px]">←</Link>
          {isChangeMode ? <Chip>이번 주 매칭</Chip> : <Chip>STEP 03 / 04</Chip>}
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">지금 내 마음의 결</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, marginTop: 10, fontWeight: 400 }}>
            {isChangeMode ? (
              <>이번 주엔 어떤 <em style={{ color: '#00643E', fontStyle: 'italic' }}>고민을</em><br />나눠볼까요?</>
            ) : (
              <>자신의 <em style={{ color: '#00643E', fontStyle: 'italic' }}>관심사를</em><br />선택해주세요.</>
            )}
          </h2>
        </div>

        {loading && (
          <p className="mt-10 text-center text-[13px] text-[#5C544A]">관심사 목록을 불러오는 중…</p>
        )}

        {error && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-[10px] text-[12px] text-red-700">
            연결 오류: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-6 grid grid-cols-2 gap-[10px]">
            {categories.map((c) => {
              const active = selected === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="cursor-pointer flex flex-col items-center gap-[10px] px-[14px] py-[18px] rounded-[16px]"
                  style={{
                    border: active ? '2px solid #00643E' : '1px solid #E0D9C7',
                    background: active ? 'rgba(0,100,62,0.05)' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span
                    className="flex items-center justify-center rounded-full text-[22px]"
                    style={{ width: 52, height: 52, background: active ? 'rgba(0,100,62,0.12)' : '#EFE9DA' }}
                  >{c.emoji}</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, margin: 0, fontWeight: 400, color: active ? '#00643E' : '#1A1816' }}>{c.name}</h3>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && (
          <div
            className="mt-4 flex items-start gap-[7px] px-[12px] py-[10px] rounded-[10px]"
            style={{ background: 'rgba(0,100,62,0.05)', border: '1px solid #E0D9C7' }}
          >
            <span className="text-[13px] leading-none mt-[1px]">🌙</span>
            <p className="text-[11px] leading-[1.45] text-[#5C544A]">
              <b style={{ color: '#00643E' }}>멜랑콜리</b>는 우울·불안·정체성 등 한마디로 묶기 어려운 마음의 그늘을 포함해요.
            </p>
          </div>
        )}

        <p className="mt-3 font-mono text-[10px] opacity-55 tracking-[0.08em] text-center">같은 결의 친구와 만나요</p>

        {error && !loading && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <div className="mt-auto pt-2">
          <Btn
            onClick={handleNext}
            disabled={selected === null || saving}
          >{saving ? '저장 중…' : isChangeMode ? '이대로 신청하기 →' : '선택 완료 →'}</Btn>
        </div>

      </div>
    </div>
  )
}
