'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { StepHeader } from '@/components/StepHeader';
import { updateRegisterDraft } from '@/lib/registerDraft';
import { notify } from '@lib/ui';

function calcAge(yyyymmdd: string) {
  const today = new Date();
  const y = Number.parseInt(yyyymmdd.slice(0, 4), 10);
  const m = Number.parseInt(yyyymmdd.slice(4, 6), 10) - 1;
  const d = Number.parseInt(yyyymmdd.slice(6, 8), 10);
  let age = today.getFullYear() - y;
  if (today.getMonth() < m || (today.getMonth() === m && today.getDate() < d)) age--;
  return age;
}

export default function AgePage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('');
  const [nickname, setNickname] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = birthDate.replace(/\D/g, '');
    if (cleaned.length !== 8) {
      notify('알림', '생년월일 8자리를 입력해주세요. 예: 19990101');
      return;
    }
    if (!nickname.trim()) {
      notify('알림', '닉네임을 입력해주세요.');
      return;
    }
    const age = calcAge(cleaned);
    if (age < 14) {
      notify('알림', '만 14세 이상만 가입할 수 있어요.');
      return;
    }

    updateRegisterDraft({
      birth_date: `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`,
      age,
      nickname: nickname.trim(),
    });
    router.push('/register/interest');
  }

  return (
    <main className="page">
      <StepHeader step={2} total={3} title="나이 인증" />
      <form className="panel stack" onSubmit={handleSubmit}>
        <p className="subtitle" style={{ textAlign: 'left' }}>생년월일과 닉네임을 입력해주세요.</p>
        <input className="field" placeholder="생년월일 8자리" inputMode="numeric" maxLength={8} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        <input className="field" placeholder="닉네임" maxLength={12} value={nickname} onChange={(e) => setNickname(e.target.value)} />
        <button className="button">다음</button>
      </form>
    </main>
  );
}
