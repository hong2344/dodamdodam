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

// 카드 위에 살짝 떠 있는 초록 핀 태그(★). 변경 모드에서 '이번 주'/'다음 주' 기준점 표시에 공용으로 쓴다.
function PinTag({ label }: { label: string }) {
  return (
    <span
      className="absolute -top-[12px] left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-[4px] text-[9px] font-semibold leading-none px-[10px] py-[5px] rounded-full whitespace-nowrap"
      style={{ background: '#00643E', color: '#FFFFFF', boxShadow: '0 3px 8px rgba(0,100,62,0.28)' }}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2 9.2 8.6 2 9.3l5.5 4.8L5.8 21 12 17.3 18.2 21l-1.7-6.9L22 9.3l-7.2-.7Z" />
      </svg>
      {label}
    </span>
  )
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
  // 변경 모드 기준점(선택을 따라 움직이지 않는 고정 라벨용):
  //  - currentMatchCat: 이번 주 진행 중인 매칭의 고민
  //  - defaultCat: 들어올 때 디폴트로 선택돼 있는 값(= profile.match_category = 다음 매칭에 쓰일 고민)
  // defaultCat ≠ currentMatchCat 이면 '이미 다음 주용으로 바꾼 상태'로 본다.
  const [currentMatchCat, setCurrentMatchCat] = useState<string | null>(null)
  const [defaultCat, setDefaultCat] = useState<string | null>(null)
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
    // 변경 모드: 디폴트 선택값(profile.match_category)과 이번 주 매칭 고민(match.category)을 읽는다.
    if (isChangeMode) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        supabase
          .from('profiles')
          .select('match_category')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (profile?.match_category) {
              setSelected(profile.match_category)
              setDefaultCat(profile.match_category)
            }
          })
        // 이번 주 = 진행 중인(active) 매칭의 고민
        supabase
          .from('matches')
          .select('category')
          .eq('status', 'active')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data: match }) => {
            if (match?.category) setCurrentMatchCat(match.category)
          })
      })
    }
  }, [isChangeMode])

  // 변경 모드 상태: 디폴트(다음 매칭에 쓰일 값)가 이번 주 매칭 고민과 다르면 '이미 바꾼 상태'.
  const alreadyChanged = !!currentMatchCat && !!defaultCat && currentMatchCat !== defaultCat
  // 디폴트 선택 타일 위에 붙는 단일 라벨.
  const defaultLabel = alreadyChanged ? '다음 주에 매칭될 카테고리' : '이번 주에 선택했던 카테고리'

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href={isChangeMode ? '/home' : '/avatar'} className="font-mono text-[11px]">←</Link>
          {isChangeMode ? <span /> : <Chip>STEP 03 / 04</Chip>}
        </div>

        <div className="mt-6">
          {!isChangeMode && (
            <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">지금 내 마음의 결</p>
          )}
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isChangeMode ? 25 : 30, lineHeight: 1.2, marginTop: isChangeMode ? 0 : 10, fontWeight: 400 }}>
            {isChangeMode ? (
              <>다음 주 매칭을 위해<br />카테고리를 <em style={{ color: '#00643E', fontStyle: 'italic' }}>선택</em>해주세요.</>
            ) : (
              <>자신의 <em style={{ color: '#00643E', fontStyle: 'italic' }}>관심사를</em><br />선택해주세요.</>
            )}
          </h2>
          {isChangeMode && (
            <p className="mt-3 text-[12px] leading-[1.5] text-[#5C544A]">
              {alreadyChanged
                ? '다음 주에 매칭될 카테고리를 변경하고 싶다면 아래에서 변경해주세요.'
                : '이번 주에 선택했던 카테고리를 동일하게 다음 주에도 할 예정이면 따로 변경하지 않아도 돼요.'}
            </p>
          )}
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
          <div className="mt-7 grid grid-cols-2 gap-x-[10px] gap-y-[16px]">
            {categories.map((c) => {
              const active = selected === c.id
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="relative cursor-pointer flex flex-col items-center gap-[10px] px-[14px] py-[18px] rounded-[16px]"
                  style={{
                    border: active ? '2px solid #00643E' : '1px solid #E0D9C7',
                    background: active ? 'rgba(0,100,62,0.05)' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {/* 변경 모드 기준점 핀 태그(선택을 따라 움직이지 않음):
                      - 디폴트(다음 매칭에 쓰일) 카테고리 위에 defaultLabel
                      - 이미 바꾼 상태면, 이번 주 매칭 카테고리 타일에도 같은 디자인으로 표시 */}
                  {isChangeMode && c.id === defaultCat && <PinTag label={defaultLabel} />}
                  {isChangeMode && alreadyChanged && c.id === currentMatchCat && (
                    <PinTag label="이번 주에 매칭된 카테고리" />
                  )}
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

        {!loading && !error && !isChangeMode && (
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

        {!isChangeMode && (
          <p className="mt-3 font-mono text-[10px] opacity-55 tracking-[0.08em] text-center">같은 결의 친구와 만나요</p>
        )}

        {error && !loading && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <div className="mt-auto pt-6">
          <Btn
            onClick={handleNext}
            disabled={selected === null || saving}
          >{saving ? '저장 중…' : isChangeMode ? '변경 완료' : '선택 완료 →'}</Btn>
        </div>

      </div>
    </div>
  )
}
