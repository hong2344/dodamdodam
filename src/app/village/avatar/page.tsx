'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CHARACTERS, getCharacter } from '@lib/appData';
import { getMyProfile } from '@lib/api/auth';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

export default function AvatarPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [selected, setSelected] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((nextProfile) => {
        setProfile(nextProfile);
        setSelected(getCharacter(nextProfile?.avatar_type).id);
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ avatar_type: selected }).eq('id', user.id);
      if (error) throw error;
      notify('저장했어요');
      router.back();
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">불러오는 중...</div>;

  const selectedCharacter = getCharacter(selected);

  return (
    <main className="page">
      <section className="wide stack">
        <button className="link-button" style={{ width: 'fit-content' }} onClick={() => router.back()}>←</button>
        <h1 style={{ margin: 0 }}>캐릭터 선택</h1>

        <div className="card stack" style={{ alignItems: 'center', background: '#F0F7F2' }}>
          <img src={selectedCharacter.image} alt="" width={120} height={120} style={{ borderRadius: 999 }} />
          <strong>{selectedCharacter.name}</strong>
          <span style={{ color: '#888' }}>{profile?.nickname}</span>
        </div>

        <h2 style={{ fontSize: 16, margin: 0 }}>캐릭터를 선택해주세요</h2>
        <div className="grid">
          {CHARACTERS.map((character) => (
            <button
              key={character.id}
              className="card stack"
              onClick={() => setSelected(character.id)}
              style={{
                alignItems: 'center',
                borderColor: selected === character.id ? '#4A7C59' : '#e7e2dc',
                background: selected === character.id ? '#F0F7F2' : '#fff',
              }}
            >
              <img src={character.image} alt="" width={72} height={72} style={{ borderRadius: 999 }} />
              <strong>{character.name}</strong>
            </button>
          ))}
        </div>

        <button className="button" onClick={save} disabled={saving}>
          {saving ? '저장 중...' : '선택 완료'}
        </button>
      </section>
    </main>
  );
}
