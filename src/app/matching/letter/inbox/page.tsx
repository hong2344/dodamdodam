'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getInbox, Letter, markAsRead } from '@lib/api/letters';
import { notify } from '@lib/ui';

export default function InboxPage() {
  const router = useRouter();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInbox()
      .then(setLetters)
      .catch((error) => notify('오류', error.message))
      .finally(() => setLoading(false));
  }, []);

  async function read(letter: Letter) {
    if (!letter.is_read) {
      await markAsRead(letter.id);
      setLetters((prev) => prev.map((item) => (item.id === letter.id ? { ...item, is_read: true } : item)));
    }
    notify('편지 내용', letter.content);
  }

  if (loading) return <div className="loading">불러오는 중...</div>;

  return (
    <main className="page">
      <section className="wide stack">
        <button className="link-button" style={{ width: 'fit-content' }} onClick={() => router.back()}>←</button>
        <h1 style={{ margin: 0 }}>받은 편지함</h1>

        {letters.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888' }}>아직 받은 편지가 없어요.</div>
        ) : (
          <div className="stack">
            {letters.map((letter) => (
              <button
                key={letter.id}
                className="card stack"
                onClick={() => read(letter)}
                style={{
                  textAlign: 'left',
                  borderColor: letter.is_read ? '#e7e2dc' : '#4A7C59',
                  background: letter.is_read ? '#fff' : '#F0F7F2',
                }}
              >
                <strong>{letter.is_read ? '📄 읽은 편지' : '📮 새 편지'}</strong>
                <span style={{ color: '#555', lineHeight: 1.5 }}>{letter.content}</span>
                <small style={{ color: '#777' }}>{letter.sent_at ? new Date(letter.sent_at).toLocaleDateString('ko-KR') : ''}</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
