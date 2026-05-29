'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { getMyProfile } from '@lib/api/auth';
import { getCharacter } from '@lib/appData';
import { supabase } from '@lib/supabase';
import { notify } from '@lib/ui';

const BUILDINGS = [
  { id: 'post', name: '우체국', emoji: '📮', x: 25, y: 45, href: '/matching' },
  { id: 'plaza', name: '광장', emoji: '🏛️', x: 50, y: 60, href: '/shop' },
  { id: 'home', name: '내 집', emoji: '🏠', x: 75, y: 45, href: '/village/avatar' },
];

export default function VillagePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    loadProfile();
    loadOtherUsers();

    const channel = supabase
      .channel('village')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, loadOtherUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadProfile() {
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      if (nextProfile?.house_x && nextProfile?.house_y) {
        setPosition({ x: nextProfile.house_x * 100, y: nextProfile.house_y * 100 });
      }
    } catch (error: any) {
      notify('오류', error.message);
    }
  }

  async function loadOtherUsers() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_color, avatar_type, house_x, house_y')
      .neq('id', user.id)
      .not('house_x', 'is', null);
    setOtherUsers(data ?? []);
  }

  async function moveAvatar(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
    if (profile) {
      await supabase.from('profiles').update({ house_x: x / 100, house_y: y / 100 }).eq('id', profile.id);
    }
  }

  const myCharacter = useMemo(() => getCharacter(profile?.avatar_type), [profile?.avatar_type]);

  return (
    <main className="main-with-nav" style={{ minHeight: '100vh', background: '#DDEFD7', overflow: 'hidden' }}>
      <div className="village-map" onClick={moveAvatar}>
        <Image src="/assets/village.png" alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} priority />

        {BUILDINGS.map((building) => (
          <button
            key={building.id}
            className="map-chip"
            style={{ left: `${building.x}%`, top: `${building.y}%` }}
            onClick={(event) => {
              event.stopPropagation();
              router.push(building.href);
            }}
          >
            <span>{building.emoji}</span>
            <strong>{building.name}</strong>
          </button>
        ))}

        {otherUsers.map((user) => {
          const character = getCharacter(user.avatar_type);
          return (
            <div key={user.id} className="avatar" style={{ left: `${(user.house_x ?? 0.3) * 100}%`, top: `${(user.house_y ?? 0.3) * 100}%` }}>
              <img src={character.image} alt="" />
              <span>{user.nickname}</span>
            </div>
          );
        })}

        <div className="avatar mine" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
          <img src={myCharacter.image} alt="" />
          <span>{profile?.nickname ?? '도담이'}</span>
        </div>
      </div>

      <section className="hud">
        <div className="card">
          <strong>{profile?.nickname ?? '도담이'}</strong>
          <p style={{ margin: '4px 0 0', color: '#4A7C59', fontWeight: 700 }}>🌱 {profile?.points ?? 0}P</p>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <button className="card" onClick={() => router.push('/matching/letter/inbox')}>📬 받은 편지</button>
          <button className="card" onClick={() => router.push('/village/avatar')}>🎨 꾸미기</button>
        </div>
      </section>
      <AppNav />

      <style jsx>{`
        .village-map {
          position: relative;
          width: min(100vw, 960px);
          height: max(100vh, 640px);
          margin: 0 auto;
        }
        .map-chip,
        .avatar {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .map-chip {
          border: 0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.92);
          padding: 7px 10px;
          display: grid;
          gap: 2px;
          justify-items: center;
          min-width: 64px;
        }
        .map-chip span {
          font-size: 26px;
        }
        .map-chip strong {
          font-size: 11px;
        }
        .avatar {
          display: grid;
          justify-items: center;
          transition: left 0.35s ease, top 0.35s ease;
        }
        .avatar img {
          width: 52px;
          height: 52px;
          border-radius: 999px;
          border: 2px solid #fff;
        }
        .avatar span {
          margin-top: 2px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.9);
          padding: 2px 6px;
          color: #333;
          font-size: 11px;
          font-weight: 700;
        }
        .mine span {
          color: #4a7c59;
        }
        .hud {
          position: fixed;
          top: 48px;
          left: 16px;
          right: 16px;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }
        .hud button,
        .hud .card {
          pointer-events: auto;
        }
      `}</style>
    </main>
  );
}
