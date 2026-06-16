'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Btn from '@/components/Btn'
import Field from '@/components/Field'
import {
  AGE_RESTRICTION_MESSAGE,
  calculateAnnualAge,
  getEligibleSignupAge,
} from '@/lib/ageVerification'
import { createClient } from '@/lib/supabase/client'

export default function SignupAgePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [birthDate, setBirthDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextPath = useMemo(() => {
    const next = searchParams.get('next')
    return next?.startsWith('/') && !next.startsWith('//') ? next : '/onboarding'
  }, [searchParams])

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('age')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.age) {
        router.replace(nextPath)
        return
      }

      setChecking(false)
    }

    checkSession()
  }, [nextPath, router])

  const handleSubmit = async () => {
    setError(null)

    if (!birthDate) {
      setError('생년월일을 입력해주세요.')
      return
    }

    const age = getEligibleSignupAge(birthDate)
    const supabase = createClient()

    if (age === null) {
      await supabase.auth.signOut()
      setBlocked(true)
      setError(AGE_RESTRICTION_MESSAGE)
      window.alert(AGE_RESTRICTION_MESSAGE)
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      router.replace('/login')
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      setLoading(false)
      setError('프로필 확인 중 오류가 발생했어요: ' + profileError.message)
      return
    }

    const { error: saveError } = profile
      ? await supabase
          .from('profiles')
          .update({
            email: user.email ?? null,
            age,
          })
          .eq('id', user.id)
      : await supabase.from('profiles').insert({
          id: user.id,
          email: user.email ?? null,
          nickname_set: false,
          age,
          created_at: new Date().toISOString(),
        })

    setLoading(false)

    if (saveError) {
      setError('생년월일 저장 중 오류가 발생했어요: ' + saveError.message)
      return
    }

    router.replace(nextPath)
  }

  if (checking) {
    return (
      <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
        <p className="text-[13px] text-[#5C544A]">확인 중이에요...</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(560px, calc(100dvh - 6rem))' }}>
        <div className="mt-12">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-50 m-0">age check</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1.05, marginTop: 12, color: '#1A1816', fontWeight: 400 }}>
            생년월일을<br />
            <em style={{ color: '#00643E', fontStyle: 'italic' }}>확인할게요.</em>
          </h1>
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-[#5C544A]">
          고민 한 조각은 만 13세부터 만 18세까지만 가입할 수 있어요.
        </p>

        <div className="mt-6 flex flex-col gap-[10px]">
          <Field
            placeholder="생년월일"
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
          />
          {birthDate && calculateAnnualAge(birthDate) !== null && (
            <p className="text-[12px] text-[#5C544A] mt-1">연 나이 {calculateAnnualAge(birthDate)}세</p>
          )}
          {error && (
            <p className="text-[12px] text-red-600 mt-1">{error}</p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-[10px]">
          {blocked ? (
            <Btn variant="paper" onClick={() => router.replace('/signup')}>회원가입으로 돌아가기</Btn>
          ) : (
            <Btn onClick={handleSubmit} disabled={loading}>{loading ? '확인 중...' : '계속하기'}</Btn>
          )}
        </div>
      </div>
    </div>
  )
}
