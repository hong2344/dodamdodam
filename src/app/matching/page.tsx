'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { getMatchPartner, getMyMatch, Match } from '@lib/api/matches';
import { CATEGORY_MAP, getCharacter } from '@lib/appData';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

function isInSelectionWindow() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.getUTCDay() === 0 && kst.getUTCHours() >= 20;
}

export default function MatchingPage() {
  const [match, setMatch] = useState<Match | null>(null);
  const [partner, setPartner] = useState<any>(null);
  const [myCategory, setMyCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWindow, setInWindow] = useState(false);

  useEffect(() => {
    setInWindow(isInSelectionWindow());
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const nextMatch = await getMyMatch();
      setMatch(nextMatch);
      if (nextMatch) setPartner(await getMatchPartner(nextMatch));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('match_category').eq('id', user.id).single();
        setMyCategory(data?.match_category ?? null);
      }
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">불러오는 중...</div>;

  const category = myCategory ? CATEGORY_MAP[myCategory] : null;
  const character = getCharacter(partner?.avatar_type);

  return (
    <main className="page main-with-nav">
      <section className="wide stack">
        <div className="topbar">
          <h1 style={{ margin: 0 }}>도담 매칭</h1>
        </div>

        {inWindow && (
          <Link className="card row" style={{ background: '#4A7C59', color: '#fff' }} href="/village/category">
            <span style={{ fontSize: 28 }}>🕗</span>
            <div>
              <strong>새로운 친구를 만날 시간이에요</strong>
              <p style={{ margin: '4px 0 0', opacity: 0.9 }}>관심사를 설정해주세요.</p>
            </div>
          </Link>
        )}

        {category ? (
          <Link className="card row" href="/village/category">
            <span className="badge">이번 주 관심사</span>
            <strong>{category.emoji} {category.name}</strong>
            <span style={{ marginLeft: 'auto', color: '#4A7C59', fontWeight: 700 }}>변경</span>
          </Link>
        ) : (
          <Link className="card" href="/village/category" style={{ color: '#777' }}>
            관심사를 설정하면 더 잘 맞는 친구와 매칭돼요.
          </Link>
        )}

        {!match ? (
          <div className="stack" style={{ minHeight: 360, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 76 }}>📮</div>
            <h2 style={{ margin: 0 }}>매칭 대기 중이에요</h2>
            <p style={{ color: '#666', lineHeight: 1.6 }}>매주 일요일 밤에 새로운 도담 친구가 배정돼요.</p>
          </div>
        ) : (
          <div className="stack">
            <div style={{ textAlign: 'center', fontSize: 56 }}>🤝</div>
            <h2 style={{ textAlign: 'center', margin: 0 }}>친구를 찾았어요!</h2>
            <div className="card row">
              <img src={character.image} alt="" width={58} height={58} style={{ borderRadius: 999, background: partner?.avatar_color ?? '#A8C5A0' }} />
              <div>
                <strong style={{ fontSize: 18 }}>{partner?.nickname ?? '친구'}</strong>
                <p style={{ margin: '4px 0 0', color: '#888' }}>{[partner?.location, partner?.age ? `${partner.age}세` : null].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            <div className="grid">
              <Link className="card" href={`/matching/letter/write?matchId=${match.id}&receiverId=${partner?.id ?? ''}`}>💌 편지 쓰기</Link>
              <Link className="card" href="/matching/letter/inbox">📬 받은 편지</Link>
              <Link className="card" href="/matching/letter/status">🚚 배달 현황</Link>
            </div>
            <p style={{ color: '#aaa', textAlign: 'center' }}>{match.week_start} ~ {match.week_end}</p>
          </div>
        )}
      </section>
      <AppNav />
    </main>
  );
}
