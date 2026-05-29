'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DeliveryStatus, getDeliveryStatus, Letter } from '@lib/api/letters';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

const STEPS = ['발송', '배달 중', '도착'];

export default function LetterStatusPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<(Letter & { delivery?: DeliveryStatus })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from('letters').select('*').eq('sender_id', user.id).order('sent_at', { ascending: false });
      if (error) throw error;

      const withStatus = await Promise.all(
        (data ?? []).map(async (letter) => {
          try {
            return { ...letter, delivery: (await getDeliveryStatus(letter.id)) ?? undefined };
          } catch {
            return { ...letter, delivery: undefined };
          }
        }),
      );
      setLetters(withStatus);
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">불러오는 중...</div>;

  return (
    <main className="page">
      <section className="wide stack">
        <button className="link-button" style={{ width: 'fit-content' }} onClick={() => router.back()}>←</button>
        <h1 style={{ margin: 0 }}>배달 현황</h1>

        {letters.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888' }}>보낸 편지가 없어요.</div>
        ) : (
          <div className="stack">
            {letters.map((letter) => {
              const step = letter.delivery?.current_step ?? 1;
              const remaining = letter.delivery?.remaining_minutes ?? 0;
              return (
                <article className="card stack" key={letter.id}>
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{letter.content}</strong>
                  <div className="row">
                    {STEPS.map((name, index) => (
                      <div key={name} style={{ flex: 1, textAlign: 'center', color: index + 1 <= step ? '#4A7C59' : '#aaa', fontWeight: 700 }}>
                        <div>{index + 1 <= step ? '●' : '○'}</div>
                        <small>{name}</small>
                      </div>
                    ))}
                  </div>
                  {step < 3 && remaining > 0 && <small style={{ textAlign: 'center', color: '#888' }}>약 {remaining}분 뒤 다음 단계</small>}
                  {step === 3 && <strong style={{ textAlign: 'center', color: '#4A7C59' }}>도착 완료</strong>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
