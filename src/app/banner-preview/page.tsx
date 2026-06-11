// TEMP 미리보기 전용 페이지 — 배너 시안 비교용. 결정 후 삭제 예정.
const CARD_BG = 'linear-gradient(180deg, #C7DBEC 0%, #D8E4E0 100%)'

function Chip({ badge = false }: { badge?: boolean }) {
  return (
    <span
      className="relative inline-flex items-center gap-[5px] pl-[8px] pr-[11px] py-[4px] rounded-full text-[11px] font-medium"
      style={{ background: 'rgba(255,255,255,0.78)', color: '#00643E', border: badge ? '2px solid #00643E' : '1px solid rgba(0,100,62,0.25)' }}
    >
      <span className="font-mono text-[9px] tracking-[0.06em] px-[6px] py-[2px] rounded-full" style={{ background: 'rgba(0,100,62,0.1)' }}>고민</span>
      <span>🌙</span>멜랑콜리
      {badge && <span className="absolute -top-[3px] -right-[3px] w-[9px] h-[9px] rounded-full" style={{ background: '#E5484D', border: '1.5px solid #fff' }} />}
    </span>
  )
}

function Frame({ label, badge = false, children }: { label: string; badge?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[360px]">
      <span className="font-mono text-[12px] tracking-[0.08em] text-[#5C544A]">{label}</span>
      <div className="w-full rounded-[20px] overflow-hidden pt-6 pb-8" style={{ background: CARD_BG }}>
        <p className="text-center font-mono text-[10px] tracking-[0.16em] uppercase opacity-70">WELCOME TO</p>
        <h2 className="text-center" style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '4px 0 0', fontWeight: 400 }}>오전 마을</h2>
        <div className="mt-[10px] flex justify-center"><Chip badge={badge} /></div>
        {children}
      </div>
    </div>
  )
}

export default function BannerPreview() {
  return (
    <div className="min-h-dvh bg-[#F5F0E6] flex flex-col items-center gap-9 py-12 px-4">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>배너 시안 비교</h1>

      {/* 현재(V1) — 기준 */}
      <Frame label="현재 · 작은 한 줄">
        <p className="mt-[8px] text-center text-[11px]" style={{ color: '#00643E' }}>
          이번 주 매칭이 열렸어요 · <u>고민 바꾸기 →</u>
        </p>
      </Frame>

      {/* 옵션 1 — 초록 강조 배너 */}
      <Frame label="옵션 1 · 초록 강조 배너">
        <div className="mx-[18px] mt-[16px] rounded-[14px] flex items-center gap-[9px]" style={{ padding: '11px 13px', background: '#00643E', color: '#fff' }}>
          <span className="text-[18px] leading-none">🔔</span>
          <div className="flex-1 leading-tight">
            <p className="text-[12px] font-semibold">이번 주 매칭이 열렸어요</p>
            <p className="text-[10.5px] opacity-90 mt-[1px]">고민 카테고리를 바꿀 수 있어요</p>
          </div>
          <span className="text-[11px] font-semibold whitespace-nowrap rounded-full px-[9px] py-[4px]" style={{ background: 'rgba(255,255,255,0.22)' }}>바꾸기 →</span>
        </div>
      </Frame>

      {/* 옵션 2 — 노란 알약 버튼 */}
      <Frame label="옵션 2 · 노란 알약 버튼">
        <div className="flex justify-center mt-[14px]">
          <span className="inline-flex items-center gap-[6px] rounded-full px-[15px] py-[8px] text-[11.5px] font-semibold whitespace-nowrap" style={{ background: '#FFD84D', color: '#5A4A00', boxShadow: '0 3px 10px rgba(180,150,0,0.25)' }}>
            🔔 이번 주 매칭 열렸어요 · 고민 바꾸기 →
          </span>
        </div>
      </Frame>

      {/* 옵션 3 — 칩에 NEW 점 + 굵은 안내 */}
      <Frame label="옵션 3 · 칩 강조(빨간 점) + 굵은 문구" badge>
        <p className="text-center text-[11.5px] font-semibold mt-[9px]" style={{ color: '#00643E' }}>
          매칭 신청이 열렸어요 — 탭해서 고민 바꾸기 →
        </p>
      </Frame>

      {/* 옵션 4 — 노란 그라데이션 카드 */}
      <Frame label="옵션 4 · 노란 그라데이션 카드">
        <div className="mx-[18px] mt-[16px] rounded-[16px] flex items-center gap-[11px]" style={{ padding: '13px 14px', background: 'linear-gradient(90deg,#FFF3C4,#FFD84D)', border: '1px solid #E4C95A' }}>
          <span className="text-[22px] leading-none">📮</span>
          <div className="flex-1">
            <p className="text-[12.5px] font-bold" style={{ color: '#5A4A00' }}>이번 주 매칭 신청 OPEN</p>
            <p className="text-[10.5px] mt-[1px]" style={{ color: '#7A6A20' }}>자정 전까지 고민 카테고리를 바꿀 수 있어요</p>
          </div>
          <span className="text-[18px] font-bold" style={{ color: '#5A4A00' }}>→</span>
        </div>
      </Frame>
    </div>
  )
}
