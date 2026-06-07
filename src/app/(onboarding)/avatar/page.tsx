'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'
import Chip from '@/components/Chip'
import { Avatar as AvatarType } from '@/types'
import { createClient } from '@/lib/supabase/client'

// avatar_type 숫자 매핑 (home/compose의 AVATAR_MAP과 동일 순서)
const ANIMALS: { kind: AvatarType; name: string; type: number }[] = [
  { kind: 'cat',      name: '고양이',   type: 1 },
  { kind: 'rabbit',   name: '토끼',     type: 2 },
  { kind: 'bear',     name: '곰',       type: 3 },
  { kind: 'frog',     name: '개구리',   type: 4 },
  { kind: 'hedgehog', name: '고슴도치', type: 5 },
  { kind: 'dog',      name: '강아지',   type: 6 },
]

export default function AvatarPage() {
  const [selected, setSelected] = useState<AvatarType | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleNext = async () => {
    if (!selected) return
    const picked = ANIMALS.find(a => a.kind === selected)
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
      .update({ avatar_type: picked.type })
      .eq('id', user.id)
    setSaving(false)
    if (updateErr) {
      setError('아바타 저장 중 오류가 발생했어요: ' + updateErr.message)
      return
    }
    window.localStorage.setItem('dodam:avatar', selected)
    router.push('/category')
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-between items-center">
          <Link href="/village" className="font-mono text-[11px]">←</Link>
          <Chip>STEP 02 / 04</Chip>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">나를 대신할 친구</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.15, marginTop: 10, fontWeight: 400 }}>
            아바타를 <em style={{ color: '#00643E', fontStyle: 'italic' }}>골라보세요.</em>
          </h2>
          <p className="mt-2 text-[13px] text-[#5C544A]">둥글둥글한 친구가 당신의 마음을 대신 전해줄 거예요.</p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5">
          {ANIMALS.map(a => (
            <div
              key={a.kind}
              onClick={() => setSelected(a.kind)}
              className="cursor-pointer flex flex-col items-center gap-2 py-3 px-2 rounded-[14px] bg-white/55"
              style={{
                border: selected === a.kind ? '2px solid #00643E' : '1px solid #E0D9C7',
                boxShadow: selected === a.kind ? '0 4px 14px -6px rgba(0,100,62,0.45)' : 'none',
              }}
            >
              <Avatar kind={a.kind} size={58} />
              <span className="text-[12px] font-medium">{a.name}</span>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-[12px] text-red-600">{error}</p>}

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
