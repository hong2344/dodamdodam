'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CATEGORIES } from '@lib/appData';
import { getMyProfile } from '@lib/api/auth';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

export default function CategoryPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile().then((profile) => {
      setSelected(profile?.match_category ?? null);
      setPrevious(profile?.match_category ?? null);
    });
  }, []);

  async function save() {
    if (!selected) {
      notify('알림', '관심사를 선택해주세요.');
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('profiles').update({ match_category: selected }).eq('id', user.id);
    setSaving(false);
    if (error) {
      notify('저장 실패', error.message);
      return;
    }
    notify('저장했어요', '이번 주 관심사가 설정됐어요.');
    router.back();
  }

  const previousCategory = CATEGORIES.find((category) => category.id === previous);

  return (
    <main className="page">
      <section className="wide stack">
        <h1 style={{ margin: 0 }}>관심사 변경</h1>
        <p style={{ color: '#666', lineHeight: 1.6 }}>어떤 이야기를 나누고 싶나요? 같은 고민을 가진 친구와 매칭돼요.</p>

        {previousCategory && previous !== selected && (
          <div className="card" style={{ background: '#F0F7F2', color: '#4A7C59' }}>
            현재 설정: {previousCategory.emoji} {previousCategory.name}
          </div>
        )}

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
              <p style={{ margin: '6px 0 0', color: '#777', fontSize: 13 }}>{category.desc}</p>
            </button>
          ))}
        </div>

        <button className="button" onClick={save} disabled={!selected || saving}>
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </section>
    </main>
  );
}
