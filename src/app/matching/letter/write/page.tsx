'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { sendLetter } from '@lib/api/letters';
import { notify } from '@lib/ui';

const PAPER_STYLES = [
  { id: 'default', emoji: '📄', label: '기본', bg: '#FFFFF8' },
  { id: 'warm', emoji: '🌤️', label: '따뜻함', bg: '#FFF8E7' },
  { id: 'cool', emoji: '🌊', label: '차분함', bg: '#EFF6FF' },
  { id: 'vintage', emoji: '🕰️', label: '빈티지', bg: '#F5EFE6' },
];

const STICKERS = ['🌸', '🌱', '🌟', '🍀', '🌧️', '⭐', '✨', '💌'];

export default function WriteLetterPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [content, setContent] = useState('');
  const [paperStyle, setPaperStyle] = useState('default');
  const [sticker, setSticker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const matchId = params.get('matchId');
    const receiverId = params.get('receiverId');
    if (content.trim().length < 10) {
      notify('알림', '편지는 10자 이상 써주세요.');
      return;
    }
    if (!matchId || !receiverId) {
      notify('오류', '매칭 정보가 없어요.');
      return;
    }

    try {
      setLoading(true);
      await sendLetter({ matchId, receiverId, content: content.trim(), paperStyle, sticker: sticker ?? undefined });
      notify('편지를 보냈어요', '배달 현황에서 확인할 수 있어요.');
      router.back();
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedPaper = PAPER_STYLES.find((paper) => paper.id === paperStyle) ?? PAPER_STYLES[0];

  return (
    <main className="page">
      <section className="wide stack">
        <button className="link-button" style={{ width: 'fit-content' }} onClick={() => router.back()}>←</button>
        <h1 style={{ margin: 0 }}>편지 쓰기</h1>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          {PAPER_STYLES.map((paper) => (
            <button
              key={paper.id}
              className={paperStyle === paper.id ? 'button' : 'button secondary'}
              style={{ width: 'auto', padding: '10px 14px' }}
              onClick={() => setPaperStyle(paper.id)}
            >
              {paper.emoji} {paper.label}
            </button>
          ))}
        </div>

        <div className="card stack" style={{ background: selectedPaper.bg }}>
          <textarea
            className="field"
            placeholder="마음을 담아 편지를 써보세요..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={500}
            rows={8}
            style={{ resize: 'vertical', background: 'transparent' }}
          />
          <span style={{ alignSelf: 'flex-end', color: '#777', fontSize: 12 }}>{content.length}/500</span>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          {STICKERS.map((nextSticker) => (
            <button
              key={nextSticker}
              className="card"
              onClick={() => setSticker(sticker === nextSticker ? null : nextSticker)}
              style={{
                width: 48,
                height: 48,
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                borderColor: sticker === nextSticker ? '#4A7C59' : '#e7e2dc',
              }}
            >
              {nextSticker}
            </button>
          ))}
        </div>

        <button className="button" onClick={submit} disabled={loading}>
          {loading ? '보내는 중...' : '편지 보내기 📮'}
        </button>
      </section>
    </main>
  );
}
