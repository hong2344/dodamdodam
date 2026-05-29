'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StepHeader } from '@/components/StepHeader';
import { clearRegisterDraft, getRegisterDraft, updateRegisterDraft } from '@/lib/registerDraft';
import { CATEGORIES } from '@lib/appData';
import { signUp } from '@lib/api/auth';
import { notify } from '@lib/ui';

export default function InterestPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function complete() {
    if (!selected) {
      notify('알림', '관심사를 선택해주세요.');
      return;
    }

    const draft = getRegisterDraft();
    updateRegisterDraft({ match_category: selected });

    try {
      setLoading(true);
      await signUp({
        email: draft.email ?? '',
        password: draft.password ?? '',
        birth_date: draft.birth_date ?? '',
        age: draft.age ?? 14,
        nickname: draft.nickname ?? '',
        match_category: selected,
      });
      clearRegisterDraft();
      notify('가입 완료', '이메일 인증 후 로그인해주세요.');
      router.replace('/login');
    } catch (error: any) {
      notify('가입 실패', error.message ?? '다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <StepHeader step={3} total={3} title="관심사 선택" />
      <section className="wide stack">
        <p className="subtitle" style={{ textAlign: 'left' }}>어떤 이야기를 나누고 싶나요?</p>
        <div className="grid">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              className="card"
              onClick={() => setSelected(category.id)}
              style={{
                textAlign: 'left',
                borderColor: selected === category.id ? '#4A7C59' : '#e7e2dc',
                background: selected === category.id ? '#F0F7F2' : '#fff',
              }}
            >
              <div style={{ fontSize: 30 }}>{category.emoji}</div>
              <strong>{category.name}</strong>
              <p style={{ margin: '6px 0 0', color: '#777', fontSize: 13, lineHeight: 1.5 }}>{category.desc}</p>
            </button>
          ))}
        </div>
        <button className="button" onClick={complete} disabled={!selected || loading}>
          {loading ? '가입 중...' : '가입 완료'}
        </button>
      </section>
    </main>
  );
}
