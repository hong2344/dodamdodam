'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Flower from '@/components/Flower'
import Field from '@/components/Field'
import Btn from '@/components/Btn'
import { useState } from 'react'
import { KAKAO_OAUTH_SCOPES } from '@/lib/auth/kakao'
import { getSiteUrl } from '@/lib/auth/url'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async () => {
    setError(null)
    if (!email || !pw) {
      setError('이메일과 비밀번호를 모두 입력해주세요.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (error) {
      setError('로그인에 실패했어요. 이메일/비밀번호를 확인해주세요.')
      return
    }
    router.push('/home')
  }

  const handleKakaoLogin = async () => {
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: getSiteUrl('/api/auth/callback?next=/home'),
        scopes: KAKAO_OAUTH_SCOPES,
      },
    })
    setLoading(false)

    if (error) {
      setError('카카오 로그인에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="mt-7 flex justify-center">
          <Flower size={92} />
        </div>

        <div className="mt-5 text-center">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 1.0, color: '#00643E', fontWeight: 400, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            고민 한 조각
          </h1>
          <p className="mt-3 font-mono text-[11px] tracking-[0.16em] uppercase opacity-65">
            익명 편지 교환 — anonymous letters
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-[10px]">
          <Field placeholder="이메일" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Field placeholder="비밀번호" type="password" value={pw} onChange={e => setPw(e.target.value)} />
          {error && (
            <p className="text-[12px] text-red-600 mt-1">{error}</p>
          )}
          <div className="h-[6px]" />
          <Btn onClick={handleLogin} disabled={loading}>{loading ? '로그인 중…' : '로그인 →'}</Btn>
          <Btn variant="kakao" onClick={handleKakaoLogin} disabled={loading}>카카오계정으로 로그인</Btn>

          <div className="mt-3 flex justify-center gap-[14px] text-[12px] text-[#5C544A]">
            <span className="cursor-pointer">아이디찾기</span>
            <span className="opacity-40">|</span>
            <span className="cursor-pointer">비밀번호찾기</span>
            <span className="opacity-40">|</span>
            <Link href="/signup" className="text-[#00643E] font-semibold">회원가입</Link>
          </div>
        </div>

      </div>
    </div>
  )
}
