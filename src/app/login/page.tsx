'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { signIn } from '@lib/api/auth';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      notify('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace('/village');
    } catch (error) {
      const { data } = await supabase.rpc('record_login_failure', {
        p_username: email.trim(),
      });
      const nextCount = (data as number) ?? failCount + 1;
      setFailCount(nextCount);
      notify(
        nextCount >= 5 ? '로그인 5회 실패' : '로그인 실패',
        nextCount >= 5
          ? '비밀번호 재설정이 필요해요.'
          : `아이디나 비밀번호를 확인해주세요.\n(${nextCount}회 실패 / 5회 초과 시 재설정 필요)`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <form className="panel center" onSubmit={handleSubmit}>
        <h1 className="title">도담도담</h1>
        <p className="subtitle">익명으로 마음을 나눠보세요</p>

        <input
          className="field"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
        />
        <input
          className="field"
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
        />

        {failCount > 0 && (
          <div className="card" style={{ background: '#fff3f3', color: '#e05252', textAlign: 'center' }}>
            {failCount}회 실패. 5회 초과 시 비밀번호 재설정이 필요해요.
          </div>
        )}

        <button className="button" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>

        <Link className="link-button" href="/reset-password">
          비밀번호를 잊으셨나요?
        </Link>
        <Link className="button secondary" href="/register/account" style={{ textAlign: 'center' }}>
          처음이신가요? 회원가입
        </Link>
      </form>
    </main>
  );
}
