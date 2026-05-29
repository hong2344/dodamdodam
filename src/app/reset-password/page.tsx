'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { sendPasswordResetEmail, updatePassword } from '@lib/api/auth';
import { notify } from '@lib/ui';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      notify('알림', '이메일을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      await sendPasswordResetEmail(email.trim());
      notify('메일 발송 완료', '비밀번호 재설정 링크를 확인해주세요.');
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      notify('알림', '비밀번호는 8자 이상이어야 해요.');
      return;
    }

    try {
      setLoading(true);
      await updatePassword(newPassword);
      notify('변경 완료', '새 비밀번호로 로그인해주세요.');
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="panel center">
        <h1 className="title">비밀번호 재설정</h1>
        <p className="subtitle">메일 링크를 받거나, 링크로 들어온 뒤 새 비밀번호를 저장하세요.</p>

        <form className="stack" onSubmit={requestReset}>
          <input
            className="field"
            placeholder="가입 이메일"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className="button" disabled={loading}>재설정 메일 받기</button>
        </form>

        <form className="stack" onSubmit={submitNewPassword}>
          <input
            className="field"
            placeholder="새 비밀번호"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button className="button secondary" disabled={loading}>새 비밀번호 저장</button>
        </form>

        <Link className="link-button" href="/login">로그인으로 돌아가기</Link>
      </section>
    </main>
  );
}
