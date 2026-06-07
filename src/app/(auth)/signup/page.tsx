'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Btn from '@/components/Btn'
import Field from '@/components/Field'
import { getSiteUrl } from '@/lib/auth/url'
import { validateNickname } from '@/lib/profile/nickname'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [nickname, setNickname] = useState('')
  const [age, setAge] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignup = async () => {
    setError(null)
    const nicknameValidation = validateNickname(nickname)

    if (!email || !pw || !nickname || !age) {
      setError('이메일, 비밀번호, 닉네임, 나이를 모두 입력해주세요.')
      return
    }
    if (nicknameValidation.error) {
      setError(nicknameValidation.error)
      return
    }
    if (pw.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }
    // 카카오 인증 도입 전까지는 이메일 가입에서 나이를 직접 받는다 (매칭 기준에 필요)
    const ageNum = Number(age)
    if (!Number.isInteger(ageNum) || ageNum < 14 || ageNum > 19) {
      setError('나이는 14~19세만 입력할 수 있어요.')
      return
    }
    setLoading(true)

    const nicknameCheck = await fetch(`/api/profile/nickname?value=${encodeURIComponent(nicknameValidation.nickname)}`)
    if (!nicknameCheck.ok) {
      const body = await nicknameCheck.json().catch(() => null)
      setLoading(false)
      setError(body?.error ?? '닉네임을 확인하지 못했어요.')
      return
    }

    const supabase = createClient()

    // 1) Supabase Auth로 가입
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password: pw })
    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }
    const userId = data.user?.id
    if (!userId) {
      setLoading(false)
      setError('가입은 됐지만 사용자 정보를 가져오지 못했어요. 다시 시도해주세요.')
      return
    }

    // 2) profiles 테이블에 row 추가
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      nickname: nicknameValidation.nickname,
      age: ageNum,
      created_at: new Date().toISOString(),
    })
    setLoading(false)
    if (profileError) {
      const message = profileError.code === '23505' ? '이미 사용 중인 닉네임이에요.' : profileError.message
      setError('프로필 생성 중 오류가 발생했어요: ' + message)
      return
    }

    router.push('/onboarding')
  }

  const handleKakaoSignup = async () => {
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: getSiteUrl('/api/auth/callback?next=/onboarding'),
      },
    })
    setLoading(false)

    if (error) {
      setError('카카오 회원가입에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex items-center">
          <Link href="/login" className="font-mono text-[11px]">←</Link>
        </div>

        <div className="mt-12">
          <p className="font-mono text-[10px] tracking-[0.16em] uppercase opacity-50 m-0">welcome to</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, lineHeight: 1.05, marginTop: 12, color: '#1A1816', fontWeight: 400 }}>
            고민 한 조각<br />
            <em style={{ color: '#00643E', fontStyle: 'italic' }}>회원가입.</em>
          </h2>
        </div>

        <p className="mt-5 text-[14px] leading-relaxed text-[#5C544A]">
          이메일로 간편하게 가입해보세요.
        </p>

        <div className="mt-6 flex flex-col gap-[10px]">
          <Field placeholder="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Field placeholder="비밀번호 (6자 이상)" type="password" value={pw} onChange={e => setPw(e.target.value)} />
          <Field placeholder="닉네임" value={nickname} onChange={e => setNickname(e.target.value)} />
          <Field placeholder="나이 (만 14~19세)" type="number" value={age} onChange={e => setAge(e.target.value)} />
          {error && (
            <p className="text-[12px] text-red-600 mt-1">{error}</p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-[10px]">
          <Btn onClick={handleSignup} disabled={loading}>{loading ? '가입 중…' : '가입하기 →'}</Btn>
          <Btn variant="kakao" onClick={handleKakaoSignup} disabled={loading}>카카오계정으로 시작하기</Btn>
        </div>

      </div>
    </div>
  )
}
