'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleNext = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      setError('로그인이 필요해요. 다시 로그인해주세요.')
      return
    }
    // 관심사 저장 = 이번 주 매칭 풀에 등록 (배치가 match_category 기준으로 매칭)
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ match_category: selected })
      .eq('id', user.id)
    setSaving(false)
    if (updateErr) {
      setError('관심사 저장 중 오류가 발생했어요: ' + updateErr.message)
      return
    }
    window.localStorage.setItem('dodam:category', selected)
    router.push('/matching')
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
  }, [])

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href="/avatar" className="font-mono text-[11px]">←</Link>
          <Chip>STEP 03 / 03</Chip>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">지금 내 마음의 결</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, marginTop: 10, fontWeight: 400 }}>
            자신의 <em style={{ color: '#00643E', fontStyle: 'italic' }}>관심사를</em><br />선택해주세요.
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
                  className="cursor-pointer p-[14px] rounded-[14px] flex flex-col justify-between"
                  style={{
                    aspectRatio: '1.4',
                    border: active ? '2px solid #00643E' : '1px solid #E0D9C7',
                    background: active ? 'rgba(0,100,62,0.05)' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span className="text-[20px] leading-none">{c.emoji}</span>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0, fontWeight: 400, color: active ? '#00643E' : '#1A1816' }}>{c.name}</h3>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="mt-4 font-mono text-[10px] opacity-55 tracking-[0.08em] text-center">같은 결의 친구와 만나요</p>

        {error && !loading && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <div className="mt-auto pt-2">
          <Btn
            onClick={handleNext}
            disabled={selected === null || saving}
          >{saving ? '저장 중…' : '선택 완료 →'}</Btn>
        </div>

      </div>
    </div>
  )
}
