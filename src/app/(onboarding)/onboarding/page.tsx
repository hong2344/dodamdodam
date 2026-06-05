'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Flower from '@/components/Flower'
import Avatar from '@/components/Avatar'
import Btn from '@/components/Btn'

const STAGES = [
  { num: '01', title: '익명으로\n마음을 전해요', desc: '도담도담에서는 누구인지 모르는 친구에게 따뜻한 편지를 보낼 수 있어요.', btn: '다음' },
  { num: '02', title: '귀여운\n아바타를 선택해요', desc: '나만의 동물 아바타를 골라 익명으로 소통해보세요.', btn: '다음' },
  { num: '03', title: '편지가\n마을을 여행해요', desc: '보낸 편지는 작은 버스를 타고 상대방의 마을로 이동합니다.', btn: '시작하기 →' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const router = useRouter()
  const s = STAGES[step]

  const handleNext = () => {
    if (step < 2) setStep(step + 1)
    else router.push('/village')
  }

  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[375px] flex flex-col" style={{ minHeight: 'min(680px, calc(100dvh - 6rem))' }}>

        <div className="flex justify-end items-center">
          <button onClick={() => router.push('/village')} className="font-mono text-[11px] opacity-50 cursor-pointer">SKIP</button>
        </div>

        <div className="mt-8 flex justify-center">
          {step === 0 && <Flower size={130} />}
          {step === 1 && (
            <div className="flex gap-2">
              <Avatar kind="cat" size={68} />
              <Avatar kind="rabbit" size={68} />
              <Avatar kind="bear" size={68} />
            </div>
          )}
          {step === 2 && (
            <div className="relative w-[200px] h-[130px]">
              <svg width="200" height="130" viewBox="0 0 200 130">
                <path d="M10 100 Q60 30 100 70 T 190 30" stroke="#00643E" strokeWidth="1.5" fill="none" strokeDasharray="3 4" />
                <circle cx="10" cy="100" r="4" fill="#00643E" />
                <circle cx="190" cy="30" r="4" fill="#00643E" />
              </svg>
            </div>
          )}
        </div>

        <div className="mt-10">
          <p className="font-mono text-[70px] leading-none text-[#00643E] font-light" style={{ letterSpacing: '-0.04em' }}>{s.num}</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, lineHeight: 1.15, marginTop: 14, fontWeight: 400, whiteSpace: 'pre-line' }}>{s.title}</h2>
          <p className="mt-5 text-[14.5px] leading-[1.65] text-[#5C544A] max-w-[280px]">{s.desc}</p>
        </div>

        <div className="mt-auto">
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2].map(i => (
              <span key={i} style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 999, background: i === step ? '#00643E' : 'rgba(20,15,8,0.2)', transition: 'width 0.2s' }} />
            ))}
          </div>
          <Btn onClick={handleNext}>{s.btn}</Btn>
        </div>

      </div>
    </div>
  )
}
