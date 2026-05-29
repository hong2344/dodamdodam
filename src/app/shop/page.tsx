'use client';

import { useEffect, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { buyItem, getMyPoints, getShopItems, ShopItem } from '@lib/api/shop';
import { confirmAction, notify } from '@lib/ui';

const CATEGORIES = ['all', 'avatar', 'paper', 'sticker'];
const CATEGORY_LABELS: Record<string, string> = {
  all: '전체',
  avatar: '아바타',
  paper: '편지지',
  sticker: '스티커',
};

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [points, setPoints] = useState(0);
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [category]);

  async function load() {
    try {
      setLoading(true);
      const [itemData, pointData] = await Promise.all([
        getShopItems(category === 'all' ? undefined : category),
        getMyPoints(),
      ]);
      setItems(itemData);
      setPoints(pointData);
    } catch (error: any) {
      notify('오류', error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBuy(item: ShopItem) {
    if ((points ?? 0) < (item.price ?? 0)) {
      notify('포인트 부족', '포인트가 부족해요.');
      return;
    }

    confirmAction('구매 확인', `${item.name}을 ${item.price}P에 구매할까요?`, async () => {
      try {
        setBuying(item.id);
        await buyItem(item.id);
        setPoints((prev) => prev - (item.price ?? 0));
        notify('구매 완료', '아이템을 보관함에 담았어요.');
      } catch (error: any) {
        notify('오류', error.message);
      } finally {
        setBuying(null);
      }
    });
  }

  return (
    <main className="page main-with-nav">
      <section className="wide stack">
        <div className="topbar">
          <h1 style={{ margin: 0 }}>포인트샵</h1>
          <span className="badge">🌱 {points}P</span>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={category === cat ? 'button' : 'button secondary'}
              style={{ width: 'auto', padding: '8px 14px', borderRadius: 999 }}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading" style={{ minHeight: 280 }}>불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', color: '#888' }}>아이템이 없어요.</div>
        ) : (
          <div className="grid">
            {items.map((item) => (
              <article className="card stack" key={item.id}>
                <div style={{ display: 'grid', placeItems: 'center', height: 84, borderRadius: 8, background: '#f8f8f8', fontSize: 38 }}>
                  {item.category === 'avatar' ? '🧸' : item.category === 'paper' ? '📄' : '✨'}
                </div>
                <strong>{item.name}</strong>
                <span style={{ color: '#4A7C59', fontWeight: 700 }}>🌱 {item.price}P</span>
                <button className="button" onClick={() => handleBuy(item)} disabled={buying === item.id || points < (item.price ?? 0)}>
                  {buying === item.id ? '구매 중...' : '구매'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
      <AppNav />
    </main>
  );
}
