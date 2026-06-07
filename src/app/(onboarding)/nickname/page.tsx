'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/Btn'
import Field from '@/components/Field'
import { validateNickname } from '@/lib/profile/nickname'
import { createClient } from '@/lib/supabase/client'

export default function NicknamePage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!active) return

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .maybeSingle()

      if (!active) return

      if (profile?.nickname) {
        setNickname(profile.nickname)
      }
      setChecking(false)
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [router])

  const handleSave = async () => {
    setError(null)
    const validation = validateNickname(nickname)

    if (validation.error) {
      setError(validation.error)
      return
    }

    setSaving(true)
    const response = await fetch('/api/profile/nickname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: validation.nickname }),
    })
    const body = await response.json().catch(() => null)
    setSaving(false)

    if (!response.ok) {
      setError(body?.error ?? '닉네임 저장에 실패했어요.')
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>
        <div className="mt-12">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-55">profile name</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1.14, marginTop: 12, fontWeight: 400 }}>
            앱에서 사용할<br />
            <em style={{ color: '#00643E', fontStyle: 'italic' }}>닉네임을 정해주세요.</em>
          </h2>
          <p className="mt-4 text-[13.5px] leading-relaxed text-[#5C544A]">
            편지와 우편함에서는 실명 대신 닉네임만 보여요. 다른 사용자와 같은 닉네임은 사용할 수 없어요.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-[10px]">
          <Field
            placeholder="닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          <p className="text-[11px] leading-relaxed text-[#5C544A]">
            한글, 영문, 숫자만 가능해요.
          </p>
          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        <div className="mt-auto">
          <Btn onClick={handleSave} disabled={checking || saving}>
            {saving ? '저장 중…' : '닉네임 저장하기 →'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
