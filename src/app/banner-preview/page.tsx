// TEMP 미리보기 전용 페이지 — 칩 아래 안내 문구 시안 비교용. 결정 후 삭제 예정.
const CARD_BG = 'linear-gradient(180deg, #C7DBEC 0%, #D8E4E0 100%)'

function Chip() {
  return (
    <span
      className="relative inline-flex items-center gap-[5px] pl-[8px] pr-[11px] py-[4px] rounded-full text-[11px] font-medium"
      style={{ background: 'rgba(255,255,255,0.78)', color: '#00643E', border: '2px solid #00643E' }}
    >
      <span className="font-mono text-[9px] tracking-[0.06em] px-[6px] py-[2px] rounded-full" style={{ background: 'rgba(0,100,62,0.1)' }}>고민</span>
      <span>🌙</span>멜랑콜리
      <span className="absolute -top-[3px] -right-[3px] w-[9px] h-[9px] rounded-full" style={{ background: '#E5484D', border: '1.5px solid #fff' }} />
    </span>
  )
}

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <span className="font-mono text-[12px] tracking-[0.08em] text-[#5C544A]">{label}</span>
      <div className="w-full rounded-[20px] overflow-hidden pt-6 pb-8" style={{ background: CARD_BG }}>
        <p className="text-center font-mono text-[10px] tracking-[0.16em] uppercase opacity-70">WELCOME TO</p>
        <h2 className="text-center" style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '4px 0 0', fontWeight: 400 }}>오전 마을</h2>
        <div className="mt-[10px] flex justify-center"><Chip /></div>
        {children}
      </div>
    </div>
  )
}

const GREEN = '#00643E'

export default function BannerPreview() {
  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex flex-col items-center gap-9 py-12 px-4">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>안내 문구 시안</h1>

      {/* A 현재 */}
      <Frame label="A · 현재">
        <p className="text-center text-[11.5px] font-semibold mt-[9px]" style={{ color: GREEN }}>
          매칭 신청이 열렸어요 — 탭해서 <u>고민 바꾸기 →</u>
        </p>
      </Frame>

      {/* B 작은 버튼형 */}
      <Frame label="B · 안내 + 초록 버튼">
        <p className="text-center text-[11px] mt-[9px]" style={{ color: GREEN }}>이번 주 매칭 신청이 열렸어요</p>
        <div className="flex justify-center mt-[7px]">
          <span className="inline-flex items-center gap-[5px] rounded-full px-[13px] py-[6px] text-[11px] font-semibold text-white" style={{ background: GREEN }}>
            고민 카테고리 바꾸기 →
          </span>
        </div>
      </Frame>

      {/* C 마감 강조(긴급감) */}
      <Frame label="C · 마감 강조">
        <p className="text-center text-[11.5px] font-semibold mt-[9px]" style={{ color: GREEN }}>
          ⏰ 자정 전까지 고민을 바꿀 수 있어요 <u>바꾸러 가기 →</u>
        </p>
      </Frame>

      {/* D 질문형(부드러움) */}
      <Frame label="D · 질문형">
        <p className="text-center text-[11px] mt-[9px]" style={{ color: GREEN }}>이번 주는 어떤 고민을 나눠볼까요?</p>
        <p className="text-center text-[11.5px] font-bold mt-[3px]" style={{ color: GREEN }}><u>고민 카테고리 고르기 →</u></p>
      </Frame>

      {/* E 노란 밑줄 버튼(테두리 알약) */}
      <Frame label="E · 테두리 알약 버튼">
        <p className="text-center text-[11px] mt-[9px]" style={{ color: GREEN }}>이번 주 매칭 신청이 열렸어요</p>
        <div className="flex justify-center mt-[7px]">
          <span className="inline-flex items-center gap-[5px] rounded-full px-[13px] py-[6px] text-[11px] font-semibold" style={{ color: GREEN, border: `1.5px solid ${GREEN}`, background: 'rgba(255,255,255,0.6)' }}>
            🔁 고민 바꾸기 →
          </span>
        </div>
      </Frame>
    </div>
  )
}
