'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { StepHeader } from '@/components/StepHeader';
import { updateRegisterDraft } from '@/lib/registerDraft';
import { notify } from '@lib/ui';

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notify('알림', '올바른 이메일 형식이 아니에요.');
      return;
    }
    if (password.length < 8) {
      notify('알림', '비밀번호는 8자 이상이어야 해요.');
      return;
    }
    if (password !== passwordConfirm) {
      notify('알림', '비밀번호가 일치하지 않아요.');
      return;
    }

    updateRegisterDraft({ email: email.trim(), password });
    router.push('/register/age');
  }

  return (
    <main className="page">
      <StepHeader step={1} total={3} title="아이디와 비밀번호 설정" />
      <form className="panel stack" onSubmit={handleSubmit}>
        <p className="subtitle" style={{ textAlign: 'left' }}>로그인에 사용할 이메일과 비밀번호를 설정해주세요.</p>
        <input className="field" placeholder="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="field" placeholder="비밀번호 (8자 이상)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="field" placeholder="비밀번호 확인" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
        <button className="button">다음</button>
      </form>
    </main>
  );
}
