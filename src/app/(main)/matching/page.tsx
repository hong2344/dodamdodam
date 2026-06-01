'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Btn from '@/components/Btn'

export default function MatchingPage() {
  const router = useRouter()
  // 'applying' 신청 처리 중 | 'waiting' 대기(주간 배치/상대 대기) | 'matched' 즉시 매칭됨
  const [status, setStatus] = useState<'applying' | 'waiting' | 'matched'>('applying')

  useEffect(() => {
    // 매칭 풀 등록 (테스트 모드면 즉시 매칭까지 시도)
    fetch('/api/matching', { method: 'POST' })
      .then(r => r.json())
      .then(d => setStatus(d?.matched ? 'matched' : 'waiting'))
      .catch(() => setStatus('waiting'))
  }, [])

  const matched = status === 'matched'

  return (
    <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 680 }}>

        <div className="mt-16">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 1.05, marginTop: 12, fontWeight: 400 }}>
            {matched
              ? (<>매칭<br /><em style={{ color: '#00643E', fontStyle: 'italic' }}>완료!</em></>)
              : (<>매칭<br /><em style={{ color: '#00643E', fontStyle: 'italic' }}>중입니다.</em></>)}
          </h2>
        </div>

        <div className="mt-9 flex gap-2">
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-[#00643E]" style={{ opacity: 1 - i * 0.18 }} />
          ))}
        </div>

        {matched ? (
          <div className="mt-9 p-5 bg-white/60 border border-[#E0D9C7] rounded-[14px] text-[13px] leading-relaxed text-[#5C544A]">
            <p className="font-semibold text-[#1A1816] mb-2">새로운 편지 친구가 생겼어요! ✉️</p>
            <p>홈 화면에서 매칭된 친구를 확인하고 첫 편지를 보내보세요.</p>
          </div>
        ) : (
          <div className="mt-9 p-5 bg-white/60 border border-[#E0D9C7] rounded-[14px] text-[13px] leading-relaxed text-[#5C544A]">
            <p className="font-semibold text-[#1A1816] mb-2">매칭은 이렇게 진행돼요</p>
            <p>· 매주 일요일 저녁 8시 ~ 자정 사이에 신청을 받아요.</p>
            <p>· 월요일 새벽 1시에 비슷한 관심사를 가진 친구와 연결돼요.</p>
            <p>· 또래 친구와 우선 매칭되도록 신경 쓰고 있어요.</p>
          </div>
        )}

        <div className="mt-auto">
          <Btn variant={matched ? 'primary' : 'paper'} onClick={() => router.push('/home')}>
            {matched ? '홈에서 친구 확인하기 →' : '홈화면으로 돌아가기'}
          </Btn>
        </div>

      </div>
    </div>
  )
}
